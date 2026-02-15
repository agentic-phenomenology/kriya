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
}) {
  const [draggedId, setDraggedId] = useState(null);
  const [dragOverId, setDragOverId] = useState(null);
  const groups = ["All", ...new Set(agents.map(a => a.group))];
  const filteredAgents = filterGroup === "All" ? agents : agents.filter(a => a.group === filterGroup);

  return (
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
            <div style={{ fontSize: 15, fontWeight: 700, color: "#f1f5f9", letterSpacing: "-0.3px" }}>kriya</div>
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
          {/* Main view toggle */}
          <div style={{
            display: "flex", padding: "8px 12px", gap: 4,
            borderBottom: "1px solid #1e2130",
          }}>
            <button
              onClick={() => onViewChange?.('agents')}
              style={{
                flex: 1, padding: "8px 12px", borderRadius: 6, border: "none",
                backgroundColor: activeView === 'agents' ? '#3b82f6' : '#141722',
                color: activeView === 'agents' ? '#fff' : '#94a3b8',
                fontSize: 12, fontWeight: 600, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                transition: "all 0.15s",
              }}
            >
              🤖 Agents
            </button>
            <button
              onClick={() => onViewChange?.('tasks')}
              style={{
                flex: 1, padding: "8px 12px", borderRadius: 6, border: "none",
                backgroundColor: activeView === 'tasks' ? '#3b82f6' : '#141722',
                color: activeView === 'tasks' ? '#fff' : '#94a3b8',
                fontSize: 12, fontWeight: 600, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                transition: "all 0.15s",
              }}
            >
              📋 Tasks
            </button>
          </div>

          {/* Group filter tabs (only in agents view) */}
          {activeView === 'agents' && (
            <>
              <div style={{
                display: "flex", gap: 4, padding: "10px 12px", flexWrap: "wrap",
                borderBottom: "1px solid #1e2130",
              }}>
                {groups.map(g => (
                  <button key={g} onClick={() => setFilterGroup(g)} style={{
                    padding: "3px 10px", borderRadius: 12, fontSize: 10,
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
                    display: "flex", alignItems: "center", gap: 10, width: "100%",
                    padding: "10px 10px", borderRadius: 8, border: "none",
                    backgroundColor: isDragOver ? "#1e3a5f" : (isOpen ? `${agent.color}15` : "transparent"),
                    cursor: "grab", marginBottom: 2, textAlign: "left",
                    borderLeft: isOpen ? `2px solid ${agent.color}` : "2px solid transparent",
                    transition: "all 0.15s",
                    opacity: isDragging ? 0.5 : 1,
                    transform: isDragOver ? "scale(1.02)" : "none",
                  }}
                >
                  <span 
                    onClick={() => togglePane(agent.id)} 
                    style={{ fontSize: 18, width: 28, textAlign: "center", cursor: "pointer" }}
                  >
                    {agent.icon}
                  </span>
                  <div onClick={() => togglePane(agent.id)} style={{ flex: 1, minWidth: 0, cursor: "pointer" }}>
                    <div style={{ 
                      fontSize: 12, fontWeight: 600, 
                      color: isOpen ? "#f1f5f9" : "#94a3b8", 
                      whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                      display: "flex", alignItems: "center", gap: 4
                    }}>
                      {agent.name}
                      {agent.isCustom && <span style={{ fontSize: 8, color: "#64748b" }}>★</span>}
                    </div>
                    <StatusDot status={isAgentStreaming ? "computing" : agent.status} />
                  </div>
                  <button 
                    onClick={(e) => { e.stopPropagation(); onAgentSettings?.(agent); }}
                    style={{ 
                      background: "none", border: "none", color: "#475569", 
                      cursor: "pointer", padding: 2, fontSize: 12, opacity: 0.6
                    }}
                    title="Settings"
                  >⚙</button>
                  {isOpen && <span style={{ fontSize: 8, color: agent.color }}>●</span>}
                </div>
              );
            })}
            
            {/* Create Agent button */}
            <button 
              onClick={onCreateAgent} 
              style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                width: "100%", padding: "10px", borderRadius: 8, marginTop: 8,
                border: "1px dashed #2a2d3e", backgroundColor: "transparent",
                color: "#64748b", cursor: "pointer", fontSize: 12, fontWeight: 500,
                transition: "all 0.15s",
              }}
              onMouseOver={e => e.currentTarget.style.borderColor = "#6366f1"}
              onMouseOut={e => e.currentTarget.style.borderColor = "#2a2d3e"}
            >
              <span style={{ fontSize: 14 }}>+</span> Create Agent
            </button>
          </div>
            </>
          )}

          {/* Tasks view info (shown when tasks view is active) */}
          {activeView === 'tasks' && (
            <div style={{ flex: 1, padding: "16px", color: "#64748b", fontSize: 12 }}>
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: "#94a3b8", marginBottom: 4 }}>
                  Task Views
                </div>
                <p style={{ margin: 0, lineHeight: 1.5 }}>
                  Manage agent handoffs as tasks. Switch between Board (Kanban) and List views.
                </p>
              </div>
              <div style={{ fontSize: 10, color: "#475569" }}>
                <div style={{ marginBottom: 4 }}>• Drag tasks between columns</div>
                <div style={{ marginBottom: 4 }}>• Click to edit details</div>
                <div>• Create tasks for agent handoffs</div>
              </div>
            </div>
          )}

          {/* Layout controls (agents view only) */}
          {activeView === 'agents' && (
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
              <button onClick={onShowAll} style={{
                flex: 1, padding: "6px 8px", borderRadius: 6, border: "1px solid #2a2d3e",
                backgroundColor: "#141722", color: "#94a3b8", fontSize: 10, fontWeight: 600,
                cursor: "pointer",
              }}>Show All</button>
              <button onClick={onCloseAll} style={{
                flex: 1, padding: "6px 8px", borderRadius: 6, border: "1px solid #2a2d3e",
                backgroundColor: "#141722", color: "#94a3b8", fontSize: 10, fontWeight: 600,
                cursor: "pointer",
              }}>Close All</button>
            </div>
            {/* Logout button */}
            <button onClick={onLogout} style={{
              width: "100%", marginTop: 10, padding: "8px", borderRadius: 6,
              border: "1px solid #2a2d3e", backgroundColor: "transparent",
              color: "#ef4444", fontSize: 10, fontWeight: 600, cursor: "pointer",
            }}>Sign Out</button>
          </div>
          )}
          
          {/* Sign out for tasks view */}
          {activeView === 'tasks' && (
            <div style={{ padding: "12px", borderTop: "1px solid #1e2130" }}>
              <button onClick={onLogout} style={{
                width: "100%", padding: "8px", borderRadius: 6,
                border: "1px solid #2a2d3e", backgroundColor: "transparent",
                color: "#ef4444", fontSize: 10, fontWeight: 600, cursor: "pointer",
              }}>Sign Out</button>
            </div>
          )}
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
  );
}
