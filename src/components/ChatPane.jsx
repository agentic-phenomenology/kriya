import { useState, useRef, useEffect } from "react";
import StatusDot from "./StatusDot";

export default function ChatPane({ agent, messages, isMaximized, onToggleMaximize, onClose, onSend, onSettings, isStreaming, error }) {
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
          <button onClick={() => onSettings(agent)} style={{
            background: "none", border: "none", color: "#64748b", cursor: "pointer",
            padding: "4px 6px", borderRadius: 4, fontSize: 14,
          }} title="Agent settings">⚙</button>
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
          messages.map((msg) => (
            <div key={msg.id} style={{
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
        {error && (
          <div style={{
            padding: "8px 12px", borderRadius: 8, fontSize: 11,
            backgroundColor: "#451a1a", color: "#fca5a5", border: "1px solid #7f1d1d",
          }}>
            Error: {error}
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
}
