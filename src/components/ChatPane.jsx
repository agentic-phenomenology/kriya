import { useState, useRef, useEffect } from "react";
import StatusDot from "./StatusDot";

// Google 2026 theme (inline for now)
const t = {
  bg: '#f8fafc', bgSecondary: '#ffffff', bgTertiary: '#f1f5f9',
  surface: '#ffffff', surfaceHover: '#f1f5f9', border: '#e2e8f0',
  text: '#1f2937', textSecondary: '#4b5563', textMuted: '#9ca3af',
  primary: '#1a73e8', primaryHover: '#1557b0', primaryBg: '#e8f0fe',
  radius: 12, radiusLg: 16, radiusXl: 24,
  shadow: '0 1px 3px rgba(0,0,0,0.08)',
  shadowLg: '0 4px 12px rgba(0,0,0,0.1)',
};

export default function ChatPane({ agent, messages, isMaximized, onToggleMaximize, onClose, onSend, onSettings, isStreaming, error }) {
  const [input, setInput] = useState("");
  const [inputFocused, setInputFocused] = useState(false);
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
      display: "flex", flexDirection: "column", backgroundColor: t.surface,
      borderRadius: t.radiusLg, border: `1px solid ${t.border}`, overflow: "hidden",
      height: "100%", minHeight: 0,
      boxShadow: t.shadowLg,
    }}>
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "14px 18px", borderBottom: `1px solid ${t.border}`,
        background: t.surface,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ 
            width: 44, height: 44, borderRadius: t.radius,
            backgroundColor: agent.color + '15',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 22,
          }}>
            {agent.icon}
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 500, color: t.text }}>{agent.name}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 3 }}>
              <StatusDot status={currentStatus} theme={t} />
              <span style={{ 
                fontSize: 11, color: t.textMuted,
                backgroundColor: t.bgTertiary, padding: '2px 8px', borderRadius: 10,
              }}>{agent.model?.split('/').pop()}</span>
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          <button onClick={() => onSettings(agent)} style={{
            background: "none", border: "none", color: t.textMuted, cursor: "pointer",
            padding: "8px", borderRadius: 8, fontSize: 16, transition: 'all 0.15s',
          }} 
          onMouseEnter={e => e.currentTarget.style.backgroundColor = t.bgTertiary}
          onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
          title="Agent settings">⚙️</button>
          <button onClick={() => onToggleMaximize(agent.id)} style={{
            background: "none", border: "none", color: t.textMuted, cursor: "pointer",
            padding: "8px", borderRadius: 8, fontSize: 16, transition: 'all 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.backgroundColor = t.bgTertiary}
          onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
          title={isMaximized ? "Restore" : "Maximize"}>
            {isMaximized ? "⊟" : "⊞"}
          </button>
          <button onClick={() => onClose(agent.id)} style={{
            background: "none", border: "none", color: t.textMuted, cursor: "pointer",
            padding: "8px", borderRadius: 8, fontSize: 16, transition: 'all 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#fee2e2'; e.currentTarget.style.color = '#dc2626'; }}
          onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = t.textMuted; }}
          title="Close pane">✕</button>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} style={{
        flex: 1, overflowY: "auto", padding: 18, display: "flex",
        flexDirection: "column", gap: 14, minHeight: 0,
        backgroundColor: t.bgTertiary,
      }}>
        {messages.length === 0 ? (
          <div style={{ textAlign: "center", color: t.textMuted, padding: 40 }}>
            <div style={{ 
              fontSize: 48, marginBottom: 16,
              width: 80, height: 80, borderRadius: '50%',
              backgroundColor: t.surface, display: 'inline-flex',
              alignItems: 'center', justifyContent: 'center',
              boxShadow: t.shadow,
            }}>{agent.icon}</div>
            <div style={{ fontSize: 14, fontWeight: 500, color: t.textSecondary }}>
              Start a conversation with {agent.name}
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} style={{
              display: "flex", flexDirection: "column",
              alignItems: msg.role === "user" ? "flex-end" : "flex-start",
            }}>
              <div style={{
                maxWidth: "85%", padding: "12px 16px", 
                borderRadius: msg.role === "user" ? `${t.radiusLg}px ${t.radiusLg}px 4px ${t.radiusLg}px` : `${t.radiusLg}px ${t.radiusLg}px ${t.radiusLg}px 4px`,
                fontSize: 14, lineHeight: 1.6, whiteSpace: "pre-wrap",
                backgroundColor: msg.role === "user" ? t.primary : t.surface,
                color: msg.role === "user" ? "#ffffff" : t.text,
                boxShadow: t.shadow,
              }}>
                {msg.content || msg.text}
              </div>
            </div>
          ))
        )}
        {isStreaming && (
          <div style={{ 
            display: "flex", alignItems: "center", gap: 8, 
            color: t.textMuted, fontSize: 13, padding: '8px 0',
          }}>
            <span style={{ 
              animation: "pulse 1s ease-in-out infinite",
              width: 8, height: 8, borderRadius: '50%', backgroundColor: t.primary,
            }}></span>
            {agent.name} is thinking...
          </div>
        )}
        {error && (
          <div style={{
            padding: "12px 16px", borderRadius: t.radius, fontSize: 13,
            backgroundColor: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca",
          }}>
            ⚠️ Error: {error}
          </div>
        )}
      </div>

      {/* Input */}
      <div style={{
        display: "flex", alignItems: "center", gap: 12, padding: "14px 18px",
        borderTop: `1px solid ${t.border}`, backgroundColor: t.surface,
      }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleSend()}
          onFocus={() => setInputFocused(true)}
          onBlur={() => setInputFocused(false)}
          placeholder={`Message ${agent.name}...`}
          disabled={isStreaming}
          style={{
            flex: 1, backgroundColor: t.bgTertiary, 
            border: inputFocused ? `2px solid ${t.primary}` : `2px solid ${t.border}`,
            borderRadius: t.radiusXl, padding: "12px 18px", color: t.text, fontSize: 14,
            outline: "none", opacity: isStreaming ? 0.6 : 1,
            transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
            boxShadow: inputFocused ? `0 0 0 3px ${t.primary}20` : 'none',
          }}
        />
        <button onClick={handleSend} disabled={isStreaming} style={{
          backgroundColor: t.primary, color: "white", border: "none",
          borderRadius: t.radiusXl, padding: "12px 24px", fontSize: 14, fontWeight: 500,
          cursor: isStreaming ? "wait" : "pointer", whiteSpace: "nowrap",
          opacity: isStreaming ? 0.6 : 1,
          transition: 'all 0.2s ease',
          boxShadow: '0 2px 8px rgba(26,115,232,0.3)',
        }}
        onMouseEnter={e => { if(!isStreaming) e.currentTarget.style.backgroundColor = t.primaryHover; }}
        onMouseLeave={e => e.currentTarget.style.backgroundColor = t.primary}
        >Send</button>
      </div>
    </div>
  );
}
