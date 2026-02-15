import StatusDot from "./StatusDot";
import { STATUS_CONFIG } from "./statusConfig";
import { useState } from "react";

export default function Sidebar({
  agents,
  openPanes,
  streaming,
  sidebarCollapsed,
  setSidebarCollapsed,
  filterGroup,
  setFilterGroup,
  layout,
  setLayout,
  togglePane,
  onLogout,
  onShowAll,
  onCloseAll,
  onCreateAgent,
  onReorderAgents,
  onAgentSettings,
  activeView,
  onViewChange,
  theme: t,
}) {
  const [draggedId, setDraggedId] = useState(null);
  const [dragOverId, setDragOverId] = useState(null);
  const groups = ["All", ...new Set(agents.map(a => a.group))];
  const filteredAgents = filterGroup === "All" ? agents : agents.filter(a => a.group === filterGroup);

  // Fallback theme if not provided
  if (!t) {
    t = {
      bg: '#f8fafc', bgSecondary: '#ffffff', bgTertiary: '#f1f5f9',
      surface: '#ffffff', surfaceHover: '#f1f5f9', border: '#e2e8f0',
      text: '#1f2937', textSecondary: '#4b5563', textMuted: '#9ca3af',
      primary: '#1a73e8', primaryHover: '#1557b0', primaryBg: '#e8f0fe',
      radius: 12, radiusLg: 16, shadow: '0 1px 3px rgba(0,0,0,0.1)',
    };
  }

  return (
    <div style={{
      width: sidebarCollapsed ? 72 : 280, 
      minWidth: sidebarCollapsed ? 72 : 280,
      backgroundColor: t.surface, 
      borderRight: `1px solid ${t.border}`,
      display: "flex", flexDirection: "column", 
      transition: "width 0.25s ease, min-width 0.25s ease",
      overflow: "hidden",
      boxShadow: t.shadow,
    }}>
      {/* Sidebar header */}
      <div style={{
        padding: sidebarCollapsed ? "16px 12px" : "20px 20px",
        borderBottom: `1px solid ${t.border}`,
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        {!sidebarCollapsed && (
          <div>
            <div style={{ 
              fontSize: 20, fontWeight: 600, color: t.text, 
              letterSpacing: "-0.5px", display: 'flex', alignItems: 'center', gap: 8
            }}>
              <span style={{ 
                width: 32, height: 32, borderRadius: 8, 
                background: `linear-gradient(135deg, ${t.primary}, #7c4dff)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontSize: 16
              }}>K</span>
              Kriya
            </div>
            <div style={{ fontSize: 12, color: t.textMuted, marginTop: 4, marginLeft: 40 }}>
              {agents.length} agents
            </div>
          </div>
        )}
        <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)} style={{
          background: t.bgTertiary, border: "none", color: t.textSecondary, cursor: "pointer",
          fontSize: 14, padding: "8px", borderRadius: 8, display: 'flex', alignItems: 'center',
        }}>
          {sidebarCollapsed ? "→" : "←"}
        </button>
      </div>

      {!sidebarCollapsed && (
        <>
          {/* Main view toggle */}
          <div style={{
            display: "flex", padding: "12px 16px", gap: 8,
            borderBottom: `1px solid ${t.border}`,
          }}>
            <button
              onClick={() => onViewChange?.('agents')}
              style={{
                flex: 1, padding: "10px 16px", borderRadius: t.radiusLg, border: "none",
                backgroundColor: activeView === 'agents' ? t.primary : t.bgTertiary,
                color: activeView === 'agents' ? '#fff' : t.textSecondary,
                fontSize: 13, fontWeight: 500, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                transition: "all 0.2s ease",
                boxShadow: activeView === 'agents' ? '0 2px 8px rgba(26,115,232,0.3)' : 'none',
              }}
            >
              🤖 Agents
            </button>
            <button
              onClick={() => onViewChange?.('tasks')}
              style={{
                flex: 1, padding: "10px 16px", borderRadius: t.radiusLg, border: "none",
                backgroundColor: activeView === 'tasks' ? t.primary : t.bgTertiary,
                color: activeView === 'tasks' ? '#fff' : t.textSecondary,
                fontSize: 13, fontWeight: 500, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                transition: "all 0.2s ease",
                boxShadow: activeView === 'tasks' ? '0 2px 8px rgba(26,115,232,0.3)' : 'none',
              }}
            >
              📋 Tasks
            </button>
          </div>

          {/* Group filter tabs (only in agents view) */}
          {activeView === 'agents' && (
            <>
              <div style={{
                display: "flex", gap: 6, padding: "12px 16px", flexWrap: "wrap",
                borderBottom: `1px solid ${t.border}`,
              }}>
                {groups.map(g => (
                  <button key={g} onClick={() => setFilterGroup(g)} style={{
                    padding: "6px 14px", borderRadius: 20, fontSize: 12,
                    fontWeight: 500, cursor: "pointer", transition: "all 0.2s",
                    backgroundColor: filterGroup === g ? t.primaryBg : t.bgTertiary,
                    color: filterGroup === g ? t.primary : t.textSecondary,
                    border: filterGroup === g ? `1px solid ${t.primary}30` : "1px solid transparent",
                  }}>{g}</button>
                ))}
              </div>

              {/* Agent list */}
              <div style={{ flex: 1, overflowY: "auto", padding: "12px" }}>
                {filteredAgents.map(agent => {
                  const isOpen = openPanes.includes(agent.id);
                  const isAgentStreaming = streaming[agent.id];
                  const isDragging = draggedId === agent.id;
                  const isDragOver = dragOverId === agent.id;
                  return (
                    <div
                      key={agent.id}
                      draggable
                      onDragStart={(e) => {
                        setDraggedId(agent.id);
                        e.dataTransfer.effectAllowed = "move";
                      }}
                      onDragEnd={() => {
                        setDraggedId(null);
                        setDragOverId(null);
                      }}
                      onDragOver={(e) => {
                        e.preventDefault();
                        if (draggedId && draggedId !== agent.id) {
                          setDragOverId(agent.id);
                        }
                      }}
                      onDragLeave={() => setDragOverId(null)}
                      onDrop={(e) => {
                        e.preventDefault();
                        if (draggedId && draggedId !== agent.id && onReorderAgents) {
                          onReorderAgents(draggedId, agent.id);
                        }
                        setDraggedId(null);
                        setDragOverId(null);
                      }}
                      style={{
                        display: "flex", alignItems: "center", gap: 12, width: "100%",
                        padding: "12px 14px", borderRadius: t.radius, border: "none",
                        backgroundColor: isDragOver ? t.primaryBg : (isOpen ? t.primaryBg : "transparent"),
                        cursor: "grab", marginBottom: 4, textAlign: "left",
                        borderLeft: isOpen ? `3px solid ${t.primary}` : "3px solid transparent",
                        transition: "all 0.2s ease",
                        opacity: isDragging ? 0.5 : 1,
                        transform: isDragOver ? "scale(1.02)" : "none",
                        boxShadow: isOpen ? t.shadow : 'none',
                      }}
                    >
                      <span 
                        onClick={() => togglePane(agent.id)} 
                        style={{ 
                          fontSize: 22, width: 40, height: 40, textAlign: "center", cursor: "pointer",
                          backgroundColor: agent.color + '20', borderRadius: 10,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}
                      >
                        {agent.icon}
                      </span>
                      <div onClick={() => togglePane(agent.id)} style={{ flex: 1, minWidth: 0, cursor: "pointer" }}>
                        <div style={{ 
                          fontSize: 14, fontWeight: 500, 
                          color: isOpen ? t.text : t.textSecondary, 
                          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                          display: "flex", alignItems: "center", gap: 6
                        }}>
                          {agent.name}
                          {agent.isCustom && <span style={{ 
                            fontSize: 10, color: t.primary, 
                            backgroundColor: t.primaryBg, padding: '2px 6px', borderRadius: 4
                          }}>Custom</span>}
                        </div>
                        <StatusDot status={isAgentStreaming ? "computing" : agent.status} theme={t} />
                      </div>
                      <button 
                        onClick={(e) => { e.stopPropagation(); onAgentSettings?.(agent); }}
                        style={{ 
                          background: "none", border: "none", color: t.textMuted, 
                          cursor: "pointer", padding: 6, fontSize: 14, opacity: 0.6,
                          borderRadius: 6, transition: 'all 0.15s',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.backgroundColor = t.bgTertiary; e.currentTarget.style.opacity = 1; }}
                        onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.opacity = 0.6; }}
                        title="Settings"
                      >⚙️</button>
                    </div>
                  );
                })}
                
                {/* Create Agent button */}
                <button 
                  onClick={onCreateAgent} 
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                    width: "100%", padding: "14px", borderRadius: t.radius, marginTop: 12,
                    border: `2px dashed ${t.border}`, backgroundColor: "transparent",
                    color: t.textSecondary, cursor: "pointer", fontSize: 13, fontWeight: 500,
                    transition: "all 0.2s ease",
                  }}
                  onMouseOver={e => { e.currentTarget.style.borderColor = t.primary; e.currentTarget.style.color = t.primary; e.currentTarget.style.backgroundColor = t.primaryBg; }}
                  onMouseOut={e => { e.currentTarget.style.borderColor = t.border; e.currentTarget.style.color = t.textSecondary; e.currentTarget.style.backgroundColor = 'transparent'; }}
                >
                  <span style={{ fontSize: 18 }}>+</span> Create Agent
                </button>
              </div>
            </>
          )}

          {/* Tasks view info (shown when tasks view is active) */}
          {activeView === 'tasks' && (
            <div style={{ flex: 1, padding: "20px", color: t.textSecondary, fontSize: 13 }}>
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 14, fontWeight: 500, color: t.text, marginBottom: 6 }}>
                  Task Views
                </div>
                <p style={{ margin: 0, lineHeight: 1.6, color: t.textMuted }}>
                  Manage agent handoffs as tasks. Switch between Board (Kanban) and List views.
                </p>
              </div>
              <div style={{ fontSize: 12, color: t.textMuted }}>
                <div style={{ marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span>📌</span> Drag tasks between columns
                </div>
                <div style={{ marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span>✏️</span> Click to edit details
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span>➕</span> Create tasks for handoffs
                </div>
              </div>
            </div>
          )}

          {/* Layout controls (agents view only) */}
          {activeView === 'agents' && (
            <div style={{ padding: "16px", borderTop: `1px solid ${t.border}` }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: t.textMuted, marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.5px" }}>Layout</div>
              <div style={{ display: "flex", gap: 6 }}>
                {[
                  { id: "grid", label: "⊞", title: "Grid" },
                  { id: "columns", label: "❘❘❘", title: "Columns" },
                  { id: "rows", label: "☰", title: "Rows" },
                  { id: "freeform", label: "✥", title: "Freeform (drag)" },
                ].map(l => (
                  <button key={l.id} onClick={() => setLayout(l.id)} title={l.title} style={{
                    flex: 1, padding: "10px", borderRadius: t.radius, border: "none", fontSize: 16,
                    cursor: "pointer", transition: "all 0.2s ease",
                    backgroundColor: layout === l.id ? t.primaryBg : t.bgTertiary,
                    color: layout === l.id ? t.primary : t.textSecondary,
                    boxShadow: layout === l.id ? `0 0 0 2px ${t.primary}30` : 'none',
                  }}>{l.label}</button>
                ))}
              </div>
              <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
                <button onClick={onShowAll} style={{
                  flex: 1, padding: "10px 12px", borderRadius: t.radius, border: `1px solid ${t.border}`,
                  backgroundColor: t.surface, color: t.textSecondary, fontSize: 12, fontWeight: 500,
                  cursor: "pointer", transition: 'all 0.15s',
                }}>Show All</button>
                <button onClick={onCloseAll} style={{
                  flex: 1, padding: "10px 12px", borderRadius: t.radius, border: `1px solid ${t.border}`,
                  backgroundColor: t.surface, color: t.textSecondary, fontSize: 12, fontWeight: 500,
                  cursor: "pointer", transition: 'all 0.15s',
                }}>Close All</button>
              </div>
              {/* Logout button */}
              <button onClick={onLogout} style={{
                width: "100%", marginTop: 12, padding: "10px", borderRadius: t.radius,
                border: `1px solid #d93025`, backgroundColor: "transparent",
                color: "#d93025", fontSize: 12, fontWeight: 500, cursor: "pointer",
                transition: 'all 0.15s',
              }}>Sign Out</button>
            </div>
          )}
          
          {/* Sign out for tasks view */}
          {activeView === 'tasks' && (
            <div style={{ padding: "16px", borderTop: `1px solid ${t.border}` }}>
              <button onClick={onLogout} style={{
                width: "100%", padding: "10px", borderRadius: t.radius,
                border: `1px solid #d93025`, backgroundColor: "transparent",
                color: "#d93025", fontSize: 12, fontWeight: 500, cursor: "pointer",
              }}>Sign Out</button>
            </div>
          )}
        </>
      )}

      {/* Collapsed sidebar — just icons */}
      {sidebarCollapsed && (
        <div style={{ flex: 1, overflowY: "auto", padding: "12px 8px", display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
          {agents.map(agent => {
            const isOpen = openPanes.includes(agent.id);
            const isAgentStreaming = streaming[agent.id];
            return (
              <button key={agent.id} onClick={() => togglePane(agent.id)} title={agent.name} style={{
                width: 48, height: 48, borderRadius: t.radius, border: "none",
                backgroundColor: isOpen ? t.primaryBg : "transparent",
                cursor: "pointer", fontSize: 20, display: "flex", alignItems: "center",
                justifyContent: "center", position: "relative", transition: 'all 0.15s',
              }}>
                {agent.icon}
                <span style={{
                  position: "absolute", top: 6, right: 6, width: 8, height: 8,
                  borderRadius: "50%", 
                  backgroundColor: STATUS_CONFIG[isAgentStreaming ? "computing" : (agent.status || "idle")].color,
                  border: `2px solid ${t.surface}`,
                }} />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
