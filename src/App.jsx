import { useState, useRef, useEffect, useCallback } from "react";
import LoginScreen from "./components/LoginScreen";
import ChatPane from "./components/ChatPane";
import Sidebar from "./components/Sidebar";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3001";

// Unique message ID generator
let msgIdCounter = 0;
function nextMsgId() {
  return `msg-${Date.now()}-${++msgIdCounter}`;
}

export default function AgentWorkspace() {
  const [authenticated, setAuthenticated] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [authError, setAuthError] = useState("");
  const [agents, setAgents] = useState([]);
  const [openPanes, setOpenPanes] = useState([]);
  const [maximized, setMaximized] = useState(null);
  const [messages, setMessages] = useState({});
  const [streaming, setStreaming] = useState({});
  const [errors, setErrors] = useState({});
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [layout, setLayout] = useState("grid");
  const [filterGroup, setFilterGroup] = useState("All");

  // Ref to always have current messages (fixes stale closure in async sendMessage)
  const messagesRef = useRef(messages);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // Check auth status on load
  useEffect(() => {
    fetch(`${API_BASE}/api/auth/status`, { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        setAuthenticated(data.authenticated);
        setAuthChecked(true);
        if (data.authenticated) {
          loadAgents();
        }
      })
      .catch(() => setAuthChecked(true));
  }, []);

  const loadAgents = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/agents`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to load agents');
      const data = await res.json();
      setAgents(data);
      setOpenPanes(prev => prev.length === 0 ? data.slice(0, 4).map(a => a.id) : prev);
    } catch (err) {
      console.error('Failed to load agents:', err);
    }
  };

  const handleLogin = async (username, password) => {
    setAuthError("");
    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (data.success) {
        setAuthenticated(true);
        loadAgents();
      } else {
        setAuthError(data.error || 'Login failed');
      }
    } catch (_err) {
      setAuthError('Connection failed — is the server running?');
    }
  };

  const handleLogout = async () => {
    await fetch(`${API_BASE}/api/auth/logout`, {
      method: 'POST',
      credentials: 'include'
    });
    setAuthenticated(false);
    setAgents([]);
    setMessages({});
    setOpenPanes([]);
    setErrors({});
  };

  const togglePane = useCallback((id) => {
    setOpenPanes(prev => {
      if (prev.includes(id)) {
        setMaximized(m => m === id ? null : m);
        return prev.filter(p => p !== id);
      }
      return [...prev, id];
    });
  }, []);

  const closePane = useCallback((id) => {
    setOpenPanes(prev => prev.filter(p => p !== id));
    setMaximized(m => m === id ? null : m);
  }, []);

  const toggleMaximize = useCallback((id) => {
    setMaximized(prev => prev === id ? null : id);
  }, []);

  const sendMessage = useCallback(async (agentId, text) => {
    // Clear any previous error for this agent
    setErrors(prev => ({ ...prev, [agentId]: null }));

    // Add user message with a stable ID
    const userMsg = { id: nextMsgId(), role: "user", content: text };
    setMessages(prev => ({
      ...prev,
      [agentId]: [...(prev[agentId] || []), userMsg]
    }));

    // Start streaming
    setStreaming(prev => ({ ...prev, [agentId]: true }));

    // Add placeholder for assistant response
    const assistantMsgId = nextMsgId();
    setMessages(prev => ({
      ...prev,
      [agentId]: [...(prev[agentId] || []), { id: assistantMsgId, role: "assistant", content: "" }]
    }));

    try {
      // Use ref to get current messages (avoids stale closure)
      const currentMessages = messagesRef.current[agentId] || [];
      const allMessages = [...currentMessages.filter(m => m.content), userMsg].map(m => ({
        role: m.role,
        content: m.content || m.text
      }));

      const response = await fetch(`${API_BASE}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ agentId, messages: allMessages })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
        throw new Error(errorData.error || `Request failed with status ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantContent = "";
      let lineBuffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        lineBuffer += decoder.decode(value, { stream: true });
        const lines = lineBuffer.split('\n');
        lineBuffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data: ')) continue;

          const data = trimmed.slice(6);
          try {
            const parsed = JSON.parse(data);
            if (parsed.content) {
              assistantContent += parsed.content;
              setMessages(prev => {
                const agentMessages = [...(prev[agentId] || [])];
                const idx = agentMessages.findIndex(m => m.id === assistantMsgId);
                if (idx !== -1) {
                  agentMessages[idx] = { ...agentMessages[idx], content: assistantContent };
                }
                return { ...prev, [agentId]: agentMessages };
              });
            }
            if (parsed.done) {
              setStreaming(prev => ({ ...prev, [agentId]: false }));
            }
            if (parsed.error) {
              setErrors(prev => ({ ...prev, [agentId]: parsed.error }));
              setStreaming(prev => ({ ...prev, [agentId]: false }));
            }
          } catch (_) {
            // Skip unparseable
          }
        }
      }

      // Ensure streaming is stopped even if [DONE] was missed
      setStreaming(prev => ({ ...prev, [agentId]: false }));
    } catch (error) {
      console.error('Chat error:', error);
      setErrors(prev => ({ ...prev, [agentId]: error.message }));
      setStreaming(prev => ({ ...prev, [agentId]: false }));
      // Remove the empty placeholder on error
      setMessages(prev => {
        const agentMessages = (prev[agentId] || []).filter(m => m.id !== assistantMsgId || m.content);
        return { ...prev, [agentId]: agentMessages };
      });
    }
  }, []);

  const visiblePanes = maximized ? [maximized] : openPanes;

  const getGridStyle = () => {
    const count = visiblePanes.length;
    if (maximized || count === 1) return { gridTemplateColumns: "1fr", gridTemplateRows: "1fr" };
    if (layout === "columns") return { gridTemplateColumns: `repeat(${Math.min(count, 4)}, 1fr)`, gridTemplateRows: "1fr" };
    if (layout === "rows") return { gridTemplateColumns: "1fr", gridTemplateRows: `repeat(${count}, 1fr)` };
    if (count === 2) return { gridTemplateColumns: "1fr 1fr", gridTemplateRows: "1fr" };
    if (count <= 4) return { gridTemplateColumns: "1fr 1fr", gridTemplateRows: count <= 2 ? "1fr" : "1fr 1fr" };
    if (count <= 6) return { gridTemplateColumns: "1fr 1fr 1fr", gridTemplateRows: count <= 3 ? "1fr" : "1fr 1fr" };
    return { gridTemplateColumns: "1fr 1fr 1fr 1fr", gridTemplateRows: `repeat(${Math.ceil(count / 4)}, 1fr)` };
  };

  // Show loading while checking auth
  if (!authChecked) {
    return (
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        height: "100vh", width: "100vw", backgroundColor: "#080a10", color: "#64748b",
      }}>
        Loading...
      </div>
    );
  }

  // Show login if not authenticated
  if (!authenticated) {
    return <LoginScreen onLogin={handleLogin} error={authError} />;
  }

  return (
    <div style={{
      display: "flex", height: "100vh", width: "100vw", backgroundColor: "#080a10",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", color: "#e2e8f0",
      overflow: "hidden",
    }}>
      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
        *::-webkit-scrollbar { width: 5px; }
        *::-webkit-scrollbar-track { background: transparent; }
        *::-webkit-scrollbar-thumb { background: #2a2d3e; border-radius: 3px; }
        button:hover { opacity: 0.85; }
        input::placeholder { color: #475569; }
      `}</style>

      <Sidebar
        agents={agents}
        openPanes={openPanes}
        streaming={streaming}
        sidebarCollapsed={sidebarCollapsed}
        setSidebarCollapsed={setSidebarCollapsed}
        filterGroup={filterGroup}
        setFilterGroup={setFilterGroup}
        layout={layout}
        setLayout={setLayout}
        togglePane={togglePane}
        onLogout={handleLogout}
        onShowAll={() => setOpenPanes(agents.map(a => a.id))}
        onCloseAll={() => { setOpenPanes([]); setMaximized(null); }}
      />

      {/* Main content area */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        {/* Top bar */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "8px 16px", borderBottom: "1px solid #1e2130", backgroundColor: "#0a0c14",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "#94a3b8" }}>
              {openPanes.length} pane{openPanes.length !== 1 ? "s" : ""} open
            </span>
            <span style={{ fontSize: 11, color: "#475569" }}>
              {maximized ? "Focused view" : `${layout.charAt(0).toUpperCase() + layout.slice(1)} layout`}
            </span>
          </div>
          <div style={{ fontSize: 11, color: "#475569" }}>
            Powered by OpenRouter
          </div>
        </div>

        {/* Chat grid */}
        <div style={{
          flex: 1, display: openPanes.length ? "grid" : "flex",
          ...getGridStyle(),
          gap: 8, padding: 8, overflow: "hidden",
          alignItems: openPanes.length ? undefined : "center",
          justifyContent: openPanes.length ? undefined : "center",
        }}>
          {openPanes.length === 0 ? (
            <div style={{ textAlign: "center", color: "#475569" }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>🤖</div>
              <div style={{ fontSize: 16, fontWeight: 600, color: "#64748b" }}>No agents selected</div>
              <div style={{ fontSize: 12, marginTop: 6 }}>Click an agent in the sidebar to open a chat pane</div>
            </div>
          ) : (
            visiblePanes.map(id => {
              const agent = agents.find(a => a.id === id);
              if (!agent) return null;
              return (
                <ChatPane
                  key={id}
                  agent={agent}
                  messages={messages[id] || []}
                  isMaximized={maximized === id}
                  onToggleMaximize={toggleMaximize}
                  onClose={closePane}
                  onSend={sendMessage}
                  isStreaming={streaming[id]}
                  error={errors[id]}
                />
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
