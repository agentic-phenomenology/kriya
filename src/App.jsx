import { useState, useRef, useEffect } from "react";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3001";

const STATUS_CONFIG = {
  active: { label: "Active", color: "#10b981", pulse: true },
  computing: { label: "Computing", color: "#6366f1", pulse: true },
  idle: { label: "Idle", color: "#94a3b8", pulse: false },
  blocked: { label: "Blocked", color: "#ef4444", pulse: true },
  waiting: { label: "Waiting", color: "#f59e0b", pulse: false },
};

const StatusDot = ({ status }) => {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.idle;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 10, color: cfg.color, fontWeight: 600 }}>
      <span style={{
        width: 7, height: 7, borderRadius: "50%", backgroundColor: cfg.color,
        animation: cfg.pulse ? "pulse 2s ease-in-out infinite" : "none",
        boxShadow: cfg.pulse ? `0 0 6px ${cfg.color}40` : "none",
      }} />
      {cfg.label}
    </span>
  );
};

// ============ LOGIN SCREEN ============

const LoginScreen = ({ onLogin, error }) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    await onLogin(username, password);
    setLoading(false);
  };

  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "center",
      height: "100vh", width: "100vw", backgroundColor: "#080a10",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    }}>
      <div style={{
        backgroundColor: "#0f1117", borderRadius: 12, padding: 32,
        border: "1px solid #1e2130", width: 320, boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
      }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>🤖</div>
          <h1 style={{ color: "#f1f5f9", fontSize: 20, fontWeight: 700, margin: 0 }}>Agent Hub</h1>
          <p style={{ color: "#64748b", fontSize: 12, marginTop: 4 }}>Multi-agent workspace</p>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", color: "#94a3b8", fontSize: 11, fontWeight: 600, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.5px" }}>Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              style={{
                width: "100%", padding: "10px 12px", borderRadius: 8,
                border: "1px solid #2a2d3e", backgroundColor: "#141722",
                color: "#e2e8f0", fontSize: 14, outline: "none", boxSizing: "border-box",
              }}
              placeholder="Enter username"
              autoFocus
            />
          </div>
          
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: "block", color: "#94a3b8", fontSize: 11, fontWeight: 600, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.5px" }}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                width: "100%", padding: "10px 12px", borderRadius: 8,
                border: "1px solid #2a2d3e", backgroundColor: "#141722",
                color: "#e2e8f0", fontSize: 14, outline: "none", boxSizing: "border-box",
              }}
              placeholder="Enter password"
            />
          </div>

          {error && (
            <div style={{ color: "#ef4444", fontSize: 12, marginBottom: 16, textAlign: "center" }}>
              {error}
            </div>
          )}
          
          <button type="submit" disabled={loading} style={{
            width: "100%", padding: "12px", borderRadius: 8, border: "none",
            backgroundColor: "#6366f1", color: "white", fontSize: 14, fontWeight: 600,
            cursor: loading ? "wait" : "pointer", opacity: loading ? 0.7 : 1,
          }}>
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
};

// ============ CHAT PANE ============

const ChatPane = ({ agent, messages, isMaximized, onToggleMaximize, onClose, onSend, isStreaming }) => {
  const [input, setInput] = useState("");
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const handleSend = () => {
    if (!input.trim() || isStreaming) return;
    onSend(agent.id, input.trim());
    setInput("");
  };

  const currentStatus = isStreaming ? "computing" : agent.status;

  return (
    <div style={{
      display: "flex", flexDirection: "column", backgroundColor: "#0f1117",
      borderRadius: 10, border: "1px solid #1e2130", overflow: "hidden",
      height: "100%", minHeight: 0,
      boxShadow: "0 2px 12px rgba(0,0,0,0.3)",
    }}>
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "10px 14px", borderBottom: "1px solid #1e2130",
        background: `linear-gradient(135deg, ${agent.color}15, transparent)`,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 18 }}>{agent.icon}</span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#e2e8f0" }}>{agent.name}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 2 }}>
              <StatusDot status={currentStatus} />
              <span style={{ fontSize: 10, color: "#64748b" }}>{agent.model?.split('/').pop()}</span>
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          <button onClick={() => onToggleMaximize(agent.id)} style={{
            background: "none", border: "none", color: "#64748b", cursor: "pointer",
            padding: "4px 6px", borderRadius: 4, fontSize: 14,
          }} title={isMaximized ? "Restore" : "Maximize"}>
            {isMaximized ? "⊟" : "⊞"}
          </button>
          <button onClick={() => onClose(agent.id)} style={{
            background: "none", border: "none", color: "#64748b", cursor: "pointer",
            padding: "4px 6px", borderRadius: 4, fontSize: 14,
          }} title="Close pane">✕</button>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} style={{
        flex: 1, overflowY: "auto", padding: 12, display: "flex",
        flexDirection: "column", gap: 10, minHeight: 0,
      }}>
        {messages.length === 0 ? (
          <div style={{ textAlign: "center", color: "#475569", padding: 20 }}>
            <div style={{ fontSize: 24, marginBottom: 8 }}>{agent.icon}</div>
            <div style={{ fontSize: 12 }}>Start a conversation with {agent.name}</div>
          </div>
        ) : (
          messages.map((msg, i) => (
            <div key={i} style={{
              display: "flex", flexDirection: "column",
              alignItems: msg.role === "user" ? "flex-end" : "flex-start",
            }}>
              <div style={{
                maxWidth: "88%", padding: "8px 12px", borderRadius: 10,
                fontSize: 12, lineHeight: 1.5, whiteSpace: "pre-wrap",
                backgroundColor: msg.role === "user" ? "#1e3a5f" : "#1a1d2e",
                color: msg.role === "user" ? "#93c5fd" : "#cbd5e1",
                borderBottomRightRadius: msg.role === "user" ? 2 : 10,
                borderBottomLeftRadius: msg.role === "user" ? 10 : 2,
              }}>
                {msg.content || msg.text}
              </div>
            </div>
          ))
        )}
        {isStreaming && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#64748b", fontSize: 11 }}>
            <span style={{ animation: "pulse 1s ease-in-out infinite" }}>●</span>
            {agent.name} is thinking...
          </div>
        )}
      </div>

      {/* Input */}
      <div style={{
        display: "flex", alignItems: "center", gap: 8, padding: "8px 12px",
        borderTop: "1px solid #1e2130", backgroundColor: "#0a0c14",
      }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleSend()}
          placeholder={`Message ${agent.name}...`}
          disabled={isStreaming}
          style={{
            flex: 1, backgroundColor: "#141722", border: "1px solid #2a2d3e",
            borderRadius: 6, padding: "8px 10px", color: "#e2e8f0", fontSize: 12,
            outline: "none", opacity: isStreaming ? 0.6 : 1,
          }}
        />
        <button onClick={handleSend} disabled={isStreaming} style={{
          backgroundColor: agent.color, color: "white", border: "none",
          borderRadius: 6, padding: "8px 12px", fontSize: 12, fontWeight: 600,
          cursor: isStreaming ? "wait" : "pointer", whiteSpace: "nowrap",
          opacity: isStreaming ? 0.6 : 1,
        }}>Send</button>
      </div>
    </div>
  );
};

// ============ MAIN APP ============

export default function AgentWorkspace() {
  const [authenticated, setAuthenticated] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [authError, setAuthError] = useState("");
  const [agents, setAgents] = useState([]);
  const [openPanes, setOpenPanes] = useState([]);
  const [maximized, setMaximized] = useState(null);
  const [messages, setMessages] = useState({});
  const [streaming, setStreaming] = useState({});
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [layout, setLayout] = useState("grid");
  const [filterGroup, setFilterGroup] = useState("All");

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
      const data = await res.json();
      setAgents(data);
      // Open first 4 agents by default
      if (data.length > 0 && openPanes.length === 0) {
        setOpenPanes(data.slice(0, 4).map(a => a.id));
      }
    } catch (error) {
      console.error('Failed to load agents:', error);
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
    } catch (error) {
      setAuthError('Connection failed');
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
  };

  const groups = ["All", ...new Set(agents.map(a => a.group))];

  const filteredAgents = filterGroup === "All"
    ? agents
    : agents.filter(a => a.group === filterGroup);

  const togglePane = (id) => {
    if (openPanes.includes(id)) {
      setOpenPanes(openPanes.filter(p => p !== id));
      if (maximized === id) setMaximized(null);
    } else {
      setOpenPanes([...openPanes, id]);
    }
  };

  const closePane = (id) => {
    setOpenPanes(openPanes.filter(p => p !== id));
    if (maximized === id) setMaximized(null);
  };

  const toggleMaximize = (id) => {
    setMaximized(maximized === id ? null : id);
  };

  const sendMessage = async (agentId, text) => {
    // Add user message
    const userMsg = { role: "user", content: text };
    setMessages(prev => ({
      ...prev,
      [agentId]: [...(prev[agentId] || []), userMsg]
    }));

    // Start streaming
    setStreaming(prev => ({ ...prev, [agentId]: true }));

    // Add placeholder for assistant response
    setMessages(prev => ({
      ...prev,
      [agentId]: [...(prev[agentId] || []), { role: "assistant", content: "" }]
    }));

    try {
      const allMessages = [...(messages[agentId] || []), userMsg].map(m => ({
        role: m.role,
        content: m.content || m.text
      }));

      const response = await fetch(`${API_BASE}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ agentId, messages: allMessages })
      });

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantContent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter(line => line.startsWith('data: '));

        for (const line of lines) {
          const data = line.slice(6);
          try {
            const parsed = JSON.parse(data);
            if (parsed.content) {
              assistantContent += parsed.content;
              // Update the last message (assistant)
              setMessages(prev => {
                const agentMessages = [...(prev[agentId] || [])];
                agentMessages[agentMessages.length - 1] = {
                  role: "assistant",
                  content: assistantContent
                };
                return { ...prev, [agentId]: agentMessages };
              });
            }
            if (parsed.done) {
              setStreaming(prev => ({ ...prev, [agentId]: false }));
            }
            if (parsed.error) {
              console.error('Stream error:', parsed.error);
              setStreaming(prev => ({ ...prev, [agentId]: false }));
            }
          } catch (e) {
            // Skip unparseable
          }
        }
      }
    } catch (error) {
      console.error('Chat error:', error);
      setStreaming(prev => ({ ...prev, [agentId]: false }));
    }
  };

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

      {/* Sidebar */}
      <div style={{
        width: sidebarCollapsed ? 52 : 240, minWidth: sidebarCollapsed ? 52 : 240,
        backgroundColor: "#0a0c14", borderRight: "1px solid #1e2130",
        display: "flex", flexDirection: "column", transition: "width 0.2s, min-width 0.2s",
        overflow: "hidden",
      }}>
        {/* Sidebar header */}
        <div style={{
          padding: sidebarCollapsed ? "14px 8px" : "14px 16px",
          borderBottom: "1px solid #1e2130",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          {!sidebarCollapsed && (
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#f1f5f9", letterSpacing: "-0.3px" }}>Agent Hub</div>
              <div style={{ fontSize: 10, color: "#64748b", marginTop: 2 }}>{agents.length} agents</div>
            </div>
          )}
          <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)} style={{
            background: "none", border: "none", color: "#64748b", cursor: "pointer",
            fontSize: 16, padding: "2px 4px", borderRadius: 4,
          }}>
            {sidebarCollapsed ? "▸" : "◂"}
          </button>
        </div>

        {!sidebarCollapsed && (
          <>
            {/* Group filter tabs */}
            <div style={{
              display: "flex", gap: 4, padding: "10px 12px", flexWrap: "wrap",
              borderBottom: "1px solid #1e2130",
            }}>
              {groups.map(g => (
                <button key={g} onClick={() => setFilterGroup(g)} style={{
                  padding: "3px 10px", borderRadius: 12, border: "none", fontSize: 10,
                  fontWeight: 600, cursor: "pointer", transition: "all 0.15s",
                  backgroundColor: filterGroup === g ? "#6366f120" : "#141722",
                  color: filterGroup === g ? "#818cf8" : "#64748b",
                  border: filterGroup === g ? "1px solid #6366f140" : "1px solid transparent",
                }}>{g}</button>
              ))}
            </div>

            {/* Agent list */}
            <div style={{ flex: 1, overflowY: "auto", padding: "8px" }}>
              {filteredAgents.map(agent => {
                const isOpen = openPanes.includes(agent.id);
                const isAgentStreaming = streaming[agent.id];
                return (
                  <button key={agent.id} onClick={() => togglePane(agent.id)} style={{
                    display: "flex", alignItems: "center", gap: 10, width: "100%",
                    padding: "10px 10px", borderRadius: 8, border: "none",
                    backgroundColor: isOpen ? `${agent.color}15` : "transparent",
                    cursor: "pointer", marginBottom: 2, textAlign: "left",
                    borderLeft: isOpen ? `2px solid ${agent.color}` : "2px solid transparent",
                    transition: "all 0.15s",
                  }}>
                    <span style={{ fontSize: 18, width: 28, textAlign: "center" }}>{agent.icon}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: isOpen ? "#f1f5f9" : "#94a3b8", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{agent.name}</div>
                      <StatusDot status={isAgentStreaming ? "computing" : agent.status} />
                    </div>
                    {isOpen && <span style={{ fontSize: 8, color: agent.color }}>●</span>}
                  </button>
                );
              })}
            </div>

            {/* Layout controls */}
            <div style={{ padding: "12px", borderTop: "1px solid #1e2130" }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: "#64748b", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.5px" }}>Layout</div>
              <div style={{ display: "flex", gap: 4 }}>
                {[
                  { id: "grid", label: "⊞", title: "Grid" },
                  { id: "columns", label: "❘❘❘", title: "Columns" },
                  { id: "rows", label: "☰", title: "Rows" },
                ].map(l => (
                  <button key={l.id} onClick={() => setLayout(l.id)} title={l.title} style={{
                    flex: 1, padding: "6px", borderRadius: 6, border: "none", fontSize: 14,
                    cursor: "pointer", transition: "all 0.15s",
                    backgroundColor: layout === l.id ? "#6366f120" : "#141722",
                    color: layout === l.id ? "#818cf8" : "#64748b",
                  }}>{l.label}</button>
                ))}
              </div>
              <div style={{ marginTop: 10, display: "flex", gap: 4 }}>
                <button onClick={() => setOpenPanes(agents.map(a => a.id))} style={{
                  flex: 1, padding: "6px 8px", borderRadius: 6, border: "1px solid #2a2d3e",
                  backgroundColor: "#141722", color: "#94a3b8", fontSize: 10, fontWeight: 600,
                  cursor: "pointer",
                }}>Show All</button>
                <button onClick={() => { setOpenPanes([]); setMaximized(null); }} style={{
                  flex: 1, padding: "6px 8px", borderRadius: 6, border: "1px solid #2a2d3e",
                  backgroundColor: "#141722", color: "#94a3b8", fontSize: 10, fontWeight: 600,
                  cursor: "pointer",
                }}>Close All</button>
              </div>
              {/* Logout button */}
              <button onClick={handleLogout} style={{
                width: "100%", marginTop: 10, padding: "8px", borderRadius: 6,
                border: "1px solid #2a2d3e", backgroundColor: "transparent",
                color: "#ef4444", fontSize: 10, fontWeight: 600, cursor: "pointer",
              }}>Sign Out</button>
            </div>
          </>
        )}

        {/* Collapsed sidebar — just icons */}
        {sidebarCollapsed && (
          <div style={{ flex: 1, overflowY: "auto", padding: "8px 4px", display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
            {agents.map(agent => {
              const isOpen = openPanes.includes(agent.id);
              const isAgentStreaming = streaming[agent.id];
              return (
                <button key={agent.id} onClick={() => togglePane(agent.id)} title={agent.name} style={{
                  width: 38, height: 38, borderRadius: 8, border: "none",
                  backgroundColor: isOpen ? `${agent.color}20` : "transparent",
                  cursor: "pointer", fontSize: 18, display: "flex", alignItems: "center",
                  justifyContent: "center", position: "relative",
                }}>
                  {agent.icon}
                  <span style={{
                    position: "absolute", top: 4, right: 4, width: 6, height: 6,
                    borderRadius: "50%", backgroundColor: STATUS_CONFIG[isAgentStreaming ? "computing" : (agent.status || "idle")].color,
                  }} />
                </button>
              );
            })}
          </div>
        )}
      </div>

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
              {maximized ? "🔍 Focused view" : `📐 ${layout.charAt(0).toUpperCase() + layout.slice(1)} layout`}
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
                />
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
