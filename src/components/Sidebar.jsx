import StatusDot from "./StatusDot";
import { STATUS_CONFIG } from "./statusConfig";

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
}) {
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
