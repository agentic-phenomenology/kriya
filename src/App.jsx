import { useState, useRef, useEffect, useCallback } from "react";
import LoginScreen from "./components/LoginScreen";
import ChatPane from "./components/ChatPane";
import Sidebar from "./components/Sidebar";
import AgentSettings from "./components/AgentSettings";
import TasksView from "./components/TasksView";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3001";

// Theme: 'google2026Dark' or 'google2026Light' or 'originalDark'
const THEME = 'google2026Dark';

const themes = {
  google2026Dark: {
    bg: '#0f1115',
    bgSecondary: '#161a1f',
    bgTertiary: '#1c2127',
    surface: '#1c2127',
    surfaceHover: '#252b33',
    border: '#2a3038',
    borderFocus: '#8ab4f8',
    text: '#e8eaed',
    textSecondary: '#9aa0a6',
    textMuted: '#5f6368',
    primary: '#8ab4f8',
    primaryHover: '#aecbfa',
    primaryBg: '#8ab4f815',
    accent: '#8ab4f8',
    success: '#81c995',
    warning: '#fdd663',
    error: '#f28b82',
    font: "'Google Sans', 'Roboto', -apple-system, sans-serif",
    radius: 12,
    radiusLg: 16,
    radiusXl: 28,
    shadow: '0 1px 3px rgba(0,0,0,0.3)',
    shadowLg: '0 4px 12px rgba(0,0,0,0.4)',
  },
  google2026Light: {
    bg: '#f8fafc',
    bgSecondary: '#ffffff',
    bgTertiary: '#f1f5f9',
    surface: '#ffffff',
    surfaceHover: '#f1f5f9',
    border: '#e2e8f0',
    borderFocus: '#1a73e8',
    text: '#1f2937',
    textSecondary: '#4b5563',
    textMuted: '#9ca3af',
    primary: '#1a73e8',
    primaryHover: '#1557b0',
    primaryBg: '#e8f0fe',
    accent: '#1a73e8',
    success: '#34a853',
    warning: '#f9ab00',
    error: '#d93025',
    font: "'Google Sans', 'Roboto', -apple-system, sans-serif",
    radius: 12,
    radiusLg: 16,
    radiusXl: 28,
    shadow: '0 1px 3px rgba(0,0,0,0.1)',
    shadowLg: '0 4px 12px rgba(0,0,0,0.1)',
  },
  originalDark: {
    bg: '#080a10',
    bgSecondary: '#0a0c14',
    bgTertiary: '#0f1219',
    surface: '#1a1d2e',
    surfaceHover: '#12151f',
    border: '#1e2130',
    borderFocus: '#6366f1',
    text: '#e2e8f0',
    textSecondary: '#94a3b8',
    textMuted: '#64748b',
    primary: '#6366f1',
    primaryHover: '#4f46e5',
    primaryBg: '#6366f120',
    accent: '#6366f1',
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    font: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    radius: 8,
    radiusLg: 12,
    radiusXl: 16,
    shadow: 'none',
    shadowLg: '0 4px 12px rgba(0,0,0,0.3)',
  }
};

const t = themes[THEME];

// Unique message ID generator
let msgIdCounter = 0;
function nextMsgId() {
  return `msg-${Date.now()}-${++msgIdCounter}`;
}

// Detect mobile
const isMobile = () => window.innerWidth <= 768;

export default function AgentWorkspace() {
  const [authenticated, setAuthenticated] = useState(true);
  const [authChecked, setAuthChecked] = useState(true);
  const [authError, setAuthError] = useState("");
  const [agents, setAgents] = useState([]);
  const [openPanes, setOpenPanes] = useState([]);
  const [maximized, setMaximized] = useState(null);
  const [messages, setMessages] = useState({});
  const [streaming, setStreaming] = useState({});
  const [errors, setErrors] = useState({});
  const [sidebarCollapsed, setSidebarCollapsed] = useState(isMobile());
  const [layout, setLayout] = useState("grid");
  const [isMobileView, setIsMobileView] = useState(isMobile());
  const [mobileActivePane, setMobileActivePane] = useState(null); // For mobile single-pane view
  const [filterGroup, setFilterGroup] = useState("All");
  const [activeView, setActiveView] = useState("agents"); // 'agents' or 'tasks'
  const [panePositions, setPanePositions] = useState({}); // { agentId: { x, y, w, h } } for freeform layout
  const [draggingPane, setDraggingPane] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  
  // Settings modal state
  const [settingsModal, setSettingsModal] = useState(null); // { agent, isCreating }
  const [models, setModels] = useState([]);
  const [modelsLoading, setModelsLoading] = useState(false);

  // Ref to always have current messages (fixes stale closure in async sendMessage)
  const messagesRef = useRef(messages);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // Detect mobile on resize
  useEffect(() => {
    const handleResize = () => {
      const mobile = isMobile();
      setIsMobileView(mobile);
      if (mobile && !sidebarCollapsed) {
        setSidebarCollapsed(true);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [sidebarCollapsed]);

  // Skip auth check - always authenticated for local dev
  useEffect(() => {
    loadAgents();
  }, []);

  const loadAgents = async () => {
    console.log('Loading agents from:', API_BASE);
    try {
      const res = await fetch(`${API_BASE}/api/agents`, { credentials: 'include' });
      console.log('Response status:', res.status);
      if (!res.ok) throw new Error('Failed to load agents');
      const data = await res.json();
      console.log('Loaded agents:', data.length);
      setAgents(data);
      setOpenPanes(prev => prev.length === 0 ? data.slice(0, 4).map(a => a.id) : prev);
    } catch (err) {
      console.error('Failed to load agents:', err);
      alert('Failed to load agents: ' + err.message);
    }
  };
  
  const loadModels = async () => {
    if (models.length > 0) return; // Already loaded
    setModelsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/models`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to load models');
      const data = await res.json();
      setModels(data);
    } catch (err) {
      console.error('Failed to load models:', err);
    } finally {
      setModelsLoading(false);
    }
  };
  
  // Open settings modal for an agent
  const openAgentSettings = useCallback((agent) => {
    loadModels();
    setSettingsModal({ agent, isCreating: false });
  }, []);
  
  // Open create agent modal
  const openCreateAgent = useCallback(() => {
    loadModels();
    setSettingsModal({ agent: null, isCreating: true });
  }, []);
  
  // Save agent settings
  const saveAgentSettings = useCallback(async (formData) => {
    const { agent, isCreating } = settingsModal;
    
    if (isCreating) {
      // Create new custom agent
      const res = await fetch(`${API_BASE}/api/agents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(formData)
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to create agent');
      }
      await loadAgents();
    } else if (agent.isCustom) {
      // Update custom agent directly
      const res = await fetch(`${API_BASE}/api/agents/${agent.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(formData)
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to update agent');
      }
      await loadAgents();
    } else {
      // Save user settings for default agent
      const res = await fetch(`${API_BASE}/api/agents/${agent.id}/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(formData)
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to save settings');
      }
      await loadAgents();
    }
  }, [settingsModal]);
  
  // Delete custom agent
  const deleteAgent = useCallback(async (agentId) => {
    const res = await fetch(`${API_BASE}/api/agents/${agentId}`, {
      method: 'DELETE',
      credentials: 'include'
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to delete agent');
    }
    setOpenPanes(prev => prev.filter(id => id !== agentId));
    setMessages(prev => {
      const updated = { ...prev };
      delete updated[agentId];
      return updated;
    });
    await loadAgents();
  }, []);
  
  // Reorder agents via drag-and-drop
  const handleReorderAgents = useCallback(async (draggedId, targetId) => {
    // Find indices
    const draggedIdx = agents.findIndex(a => a.id === draggedId);
    const targetIdx = agents.findIndex(a => a.id === targetId);
    if (draggedIdx === -1 || targetIdx === -1) return;
    
    // Reorder locally first for instant feedback
    const reordered = [...agents];
    const [dragged] = reordered.splice(draggedIdx, 1);
    reordered.splice(targetIdx, 0, dragged);
    setAgents(reordered);
    
    // Save order to server
    const order = reordered.map((a, idx) => ({ agentId: a.id, order: idx }));
    try {
      await fetch(`${API_BASE}/api/agents/order`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ order })
      });
    } catch (err) {
      console.error('Failed to save agent order:', err);
    }
  }, [agents]);

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
    if (isMobileView) {
      // On mobile, toggle opens agent full-screen
      setMobileActivePane(prev => prev === id ? null : id);
      if (!openPanes.includes(id)) {
        setOpenPanes(prev => [...prev, id]);
      }
      setSidebarCollapsed(true); // Auto-hide sidebar on mobile
    } else {
      setOpenPanes(prev => {
        if (prev.includes(id)) {
          setMaximized(m => m === id ? null : m);
          return prev.filter(p => p !== id);
        }
        return [...prev, id];
      });
    }
  }, [isMobileView, openPanes]);

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

  // Freeform drag handlers
  const handlePaneMouseDown = useCallback((e, agentId) => {
    if (layout !== 'freeform') return;
    if (e.target.closest('input, textarea, button')) return; // Don't drag when clicking inputs
    
    const paneEl = e.currentTarget;
    const rect = paneEl.getBoundingClientRect();
    setDraggingPane(agentId);
    setDragOffset({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    e.preventDefault();
  }, [layout]);

  const handleMouseMove = useCallback((e) => {
    if (!draggingPane || layout !== 'freeform') return;
    
    const container = document.getElementById('pane-container');
    if (!container) return;
    const containerRect = container.getBoundingClientRect();
    
    const x = e.clientX - containerRect.left - dragOffset.x;
    const y = e.clientY - containerRect.top - dragOffset.y;
    
    setPanePositions(prev => ({
      ...prev,
      [draggingPane]: { 
        ...prev[draggingPane],
        x: Math.max(0, x), 
        y: Math.max(0, y),
        w: prev[draggingPane]?.w || 400,
        h: prev[draggingPane]?.h || 300
      }
    }));
  }, [draggingPane, dragOffset, layout]);

  const handleMouseUp = useCallback(() => {
    setDraggingPane(null);
  }, []);

  // Add mouse event listeners for freeform dragging
  useEffect(() => {
    if (layout === 'freeform') {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [layout, handleMouseMove, handleMouseUp]);

  // Initialize pane positions when switching to freeform
  useEffect(() => {
    if (layout === 'freeform') {
      setPanePositions(prev => {
        const updated = { ...prev };
        openPanes.forEach((id, idx) => {
          if (!updated[id]) {
            updated[id] = {
              x: 50 + (idx % 3) * 420,
              y: 50 + Math.floor(idx / 3) * 320,
              w: 400,
              h: 300
            };
          }
        });
        return updated;
      });
    }
  }, [layout, openPanes]);

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
        height: "100vh", width: "100vw", backgroundColor: t.bg, color: t.textMuted,
      }}>
        Loading...
      </div>
    );
  }

  // Login disabled for local development

  return (
    <div style={{
      display: "flex", height: "100vh", width: "100vw", backgroundColor: t.bg,
      fontFamily: t.font, color: t.text,
      overflow: "hidden",
    }}>
      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
        @import url('https://fonts.googleapis.com/css2?family=Google+Sans:wght@400;500;600&display=swap');
        *::-webkit-scrollbar { width: 8px; }
        *::-webkit-scrollbar-track { background: ${t.bgTertiary}; }
        *::-webkit-scrollbar-thumb { background: ${t.border}; border-radius: 4px; }
        *::-webkit-scrollbar-thumb:hover { background: ${t.textMuted}; }
        button { transition: all 0.15s ease; }
        button:hover { transform: translateY(-1px); }
        input::placeholder { color: ${t.textMuted}; }
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
        onCreateAgent={openCreateAgent}
        onReorderAgents={handleReorderAgents}
        onAgentSettings={openAgentSettings}
        activeView={activeView}
        onViewChange={setActiveView}
        theme={t}
        isMobile={isMobileView}
      />

      {/* Main content area */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        {/* Agents view */}
        {activeView === 'agents' && (
          <>
            {/* Top bar */}
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: isMobileView ? "10px 12px" : "12px 20px", 
              borderBottom: `1px solid ${t.border}`, backgroundColor: t.surface,
              boxShadow: t.shadow,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: isMobileView ? 8 : 16 }}>
                {/* Mobile: hamburger menu or back button */}
                {isMobileView && (
                  <button
                    onClick={() => {
                      if (mobileActivePane) {
                        setMobileActivePane(null);
                      } else {
                        setSidebarCollapsed(!sidebarCollapsed);
                      }
                    }}
                    style={{
                      background: 'none', border: 'none', color: t.text,
                      fontSize: 20, cursor: 'pointer', padding: 4,
                    }}
                  >
                    {mobileActivePane ? '←' : '☰'}
                  </button>
                )}
                <span style={{ fontSize: isMobileView ? 13 : 14, fontWeight: 500, color: t.text }}>
                  {isMobileView && mobileActivePane 
                    ? agents.find(a => a.id === mobileActivePane)?.name || 'Chat'
                    : `${openPanes.length} pane${openPanes.length !== 1 ? "s" : ""} open`}
                </span>
                {!isMobileView && (
                  <span style={{ 
                    fontSize: 12, color: t.textMuted, 
                    padding: '4px 12px', backgroundColor: t.bgTertiary, borderRadius: 20 
                  }}>
                    {maximized ? "Focused" : layout.charAt(0).toUpperCase() + layout.slice(1)}
                  </span>
                )}
              </div>
              <div style={{ fontSize: 12, color: t.textMuted }}>
                {!isMobileView && "Powered by OpenRouter"}
              </div>
            </div>

            {/* Chat area - grid, freeform, or mobile single-pane */}
            <div 
              id="pane-container"
              style={{
                flex: 1, 
                display: isMobileView 
                  ? 'flex' 
                  : (layout === 'freeform' ? 'block' : (openPanes.length ? "grid" : "flex")),
                ...(isMobileView ? {} : (layout === 'freeform' ? {} : getGridStyle())),
                gap: isMobileView ? 0 : (layout === 'freeform' ? 0 : 8), 
                padding: isMobileView ? 0 : 8, 
                overflow: layout === 'freeform' ? 'auto' : "hidden",
                position: 'relative',
                minHeight: layout === 'freeform' ? '100%' : undefined,
                alignItems: (!openPanes.length && layout !== 'freeform') ? "center" : undefined,
                justifyContent: (!openPanes.length && layout !== 'freeform') ? "center" : undefined,
              }}
            >
              {/* Mobile: show single active pane or agent list */}
              {isMobileView ? (
                mobileActivePane ? (
                  // Show active chat pane full screen
                  (() => {
                    const agent = agents.find(a => a.id === mobileActivePane);
                    if (!agent) return null;
                    return (
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                        <ChatPane
                          agent={agent}
                          messages={messages[mobileActivePane] || []}
                          isMaximized={true}
                          onToggleMaximize={() => setMobileActivePane(null)}
                          onClose={() => { setMobileActivePane(null); closePane(mobileActivePane); }}
                          onSend={sendMessage}
                          onSettings={openAgentSettings}
                          isStreaming={streaming[mobileActivePane]}
                          error={errors[mobileActivePane]}
                        />
                      </div>
                    );
                  })()
                ) : (
                  // Show agent selection list on mobile when no pane active
                  <div style={{ flex: 1, padding: 16, overflowY: 'auto' }}>
                    <div style={{ fontSize: 18, fontWeight: 500, color: t.text, marginBottom: 16 }}>
                      Select an Agent
                    </div>
                    {agents.map(agent => (
                      <div
                        key={agent.id}
                        onClick={() => togglePane(agent.id)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 12,
                          padding: 16, marginBottom: 8, borderRadius: t.radius,
                          backgroundColor: t.surface, border: `1px solid ${t.border}`,
                          cursor: 'pointer',
                        }}
                      >
                        <span style={{ fontSize: 28 }}>{agent.icon}</span>
                        <div>
                          <div style={{ fontWeight: 500, color: t.text }}>{agent.name}</div>
                          <div style={{ fontSize: 12, color: t.textMuted }}>{agent.group}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              ) : openPanes.length === 0 ? (
                <div style={{ textAlign: "center", color: t.textMuted, padding: 40 }}>
                  <div style={{ 
                    fontSize: 64, marginBottom: 20, 
                    width: 100, height: 100, borderRadius: '50%',
                    backgroundColor: t.primaryBg, display: 'inline-flex',
                    alignItems: 'center', justifyContent: 'center'
                  }}>🤖</div>
                  <div style={{ fontSize: 20, fontWeight: 500, color: t.text, marginBottom: 8 }}>No agents selected</div>
                  <div style={{ fontSize: 14, color: t.textSecondary }}>Click an agent in the sidebar to start a conversation</div>
                </div>
              ) : layout === 'freeform' ? (
                // Freeform draggable panes
                visiblePanes.map((id, idx) => {
                  const agent = agents.find(a => a.id === id);
                  if (!agent) return null;
                  const defaultPos = { 
                    x: 20 + (idx % 3) * 420, 
                    y: 20 + Math.floor(idx / 3) * 320, 
                    w: 400, 
                    h: 300 
                  };
                  const pos = panePositions[id] || defaultPos;
                  return (
                    <div
                      key={id}
                      onMouseDown={(e) => handlePaneMouseDown(e, id)}
                      style={{
                        position: 'absolute',
                        left: pos.x,
                        top: pos.y,
                        width: pos.w,
                        height: pos.h,
                        cursor: draggingPane === id ? 'grabbing' : 'grab',
                        zIndex: draggingPane === id ? 100 : 1,
                        boxShadow: draggingPane === id ? '0 8px 32px rgba(0,0,0,0.5)' : '0 2px 8px rgba(0,0,0,0.3)',
                        borderRadius: 8,
                        overflow: 'hidden',
                        border: '1px solid #2a2d3e',
                      }}
                    >
                      <ChatPane
                        agent={agent}
                        messages={messages[id] || []}
                        isMaximized={maximized === id}
                        onToggleMaximize={toggleMaximize}
                        onClose={closePane}
                        onSend={sendMessage}
                        onSettings={openAgentSettings}
                        isStreaming={streaming[id]}
                        error={errors[id]}
                      />
                    </div>
                  );
                })
              ) : (
                // Grid layout panes
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
                      onSettings={openAgentSettings}
                      isStreaming={streaming[id]}
                      error={errors[id]}
                    />
                  );
                })
              )}
            </div>
          </>
        )}

        {/* Tasks view */}
        {activeView === 'tasks' && (
          <TasksView agents={agents} />
        )}
      </div>
      
      {/* Settings Modal */}
      {settingsModal && (
        <AgentSettings
          agent={settingsModal.agent}
          models={models}
          modelsLoading={modelsLoading}
          onSave={saveAgentSettings}
          onDelete={deleteAgent}
          onClose={() => setSettingsModal(null)}
          isCreating={settingsModal.isCreating}
        />
      )}
    </div>
  );
}
