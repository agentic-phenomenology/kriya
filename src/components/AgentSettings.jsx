import { useState, useEffect } from "react";

const PRESET_COLORS = [
  "#6366f1", "#8b5cf6", "#d946ef", "#ec4899", "#f43f5e",
  "#ef4444", "#f97316", "#eab308", "#22c55e", "#14b8a6",
  "#06b6d4", "#3b82f6", "#64748b"
];

const PRESET_ICONS = [
  "🔬", "✍️", "💻", "🛡️", "📊", "🚀", "🎨", "🧪", "📅", "🔭",
  "🤖", "🧠", "💡", "📝", "🔧", "⚡", "🎯", "📚", "🌐", "🔮"
];

export default function AgentSettings({ 
  agent, 
  models, 
  modelsLoading, 
  onSave, 
  onDelete, 
  onClose,
  isCreating = false 
}) {
  const [formData, setFormData] = useState({
    name: agent?.name || "",
    model: agent?.model || "",
    temperature: agent?.temperature ?? 0.7,
    maxTokens: agent?.maxTokens || 4096,
    systemPrompt: agent?.systemPrompt || "",
    color: agent?.color || "#6366f1",
    icon: agent?.icon || "🤖"
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [modelSearch, setModelSearch] = useState("");
  const [showModelDropdown, setShowModelDropdown] = useState(false);

  // Filter models by search
  const filteredModels = models.filter(m => 
    m.id.toLowerCase().includes(modelSearch.toLowerCase()) ||
    m.name?.toLowerCase().includes(modelSearch.toLowerCase())
  );

  // Popular models at top
  const popularModels = [
    "anthropic/claude-sonnet-4",
    "anthropic/claude-opus-4",
    "openai/gpt-4o",
    "google/gemini-2.0-flash-exp:free",
    "qwen/qwen-2.5-72b-instruct",
    "deepseek/deepseek-chat"
  ];

  const sortedModels = [...filteredModels].sort((a, b) => {
    const aPopular = popularModels.indexOf(a.id);
    const bPopular = popularModels.indexOf(b.id);
    if (aPopular !== -1 && bPopular === -1) return -1;
    if (aPopular === -1 && bPopular !== -1) return 1;
    if (aPopular !== -1 && bPopular !== -1) return aPopular - bPopular;
    return a.id.localeCompare(b.id);
  });

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await onSave(formData);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Delete agent "${agent.name}"? This cannot be undone.`)) return;
    setSaving(true);
    try {
      await onDelete(agent.id);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const selectedModelInfo = models.find(m => m.id === formData.model);

  return (
    <div style={{
      position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: "rgba(0,0,0,0.7)", display: "flex",
      alignItems: "center", justifyContent: "center", zIndex: 1000,
      backdropFilter: "blur(4px)"
    }} onClick={onClose}>
      <div style={{
        backgroundColor: "#0f1117", borderRadius: 12, width: "90%", maxWidth: 520,
        maxHeight: "90vh", overflow: "hidden", display: "flex", flexDirection: "column",
        border: "1px solid #1e2130", boxShadow: "0 20px 50px rgba(0,0,0,0.5)"
      }} onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div style={{
          padding: "16px 20px", borderBottom: "1px solid #1e2130",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          background: `linear-gradient(135deg, ${formData.color}15, transparent)`
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 24 }}>{formData.icon}</span>
            <div>
              <div style={{ fontSize: 16, fontWeight: 600, color: "#f1f5f9" }}>
                {isCreating ? "Create Agent" : `${agent.name} Settings`}
              </div>
              <div style={{ fontSize: 11, color: "#64748b" }}>
                {isCreating ? "Configure your new agent" : (agent.isCustom ? "Custom agent" : "Override defaults")}
              </div>
            </div>
          </div>
          <button onClick={onClose} style={{
            background: "none", border: "none", color: "#64748b",
            cursor: "pointer", fontSize: 20, padding: 4
          }}>×</button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
          {/* Name (only for custom/creating) */}
          {(isCreating || agent?.isCustom) && (
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#94a3b8", marginBottom: 6, textTransform: "uppercase" }}>
                Name
              </label>
              <input
                value={formData.name}
                onChange={e => setFormData(f => ({ ...f, name: e.target.value }))}
                placeholder="Agent name"
                style={{
                  width: "100%", backgroundColor: "#141722", border: "1px solid #2a2d3e",
                  borderRadius: 6, padding: "10px 12px", color: "#e2e8f0", fontSize: 13
                }}
              />
            </div>
          )}

          {/* Icon & Color */}
          <div style={{ display: "flex", gap: 16, marginBottom: 16 }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#94a3b8", marginBottom: 6, textTransform: "uppercase" }}>
                Icon
              </label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                {PRESET_ICONS.map(icon => (
                  <button key={icon} onClick={() => setFormData(f => ({ ...f, icon }))} style={{
                    width: 32, height: 32, borderRadius: 6, border: "none",
                    backgroundColor: formData.icon === icon ? `${formData.color}30` : "#141722",
                    cursor: "pointer", fontSize: 16,
                    outline: formData.icon === icon ? `2px solid ${formData.color}` : "none"
                  }}>{icon}</button>
                ))}
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#94a3b8", marginBottom: 6, textTransform: "uppercase" }}>
                Color
              </label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                {PRESET_COLORS.map(color => (
                  <button key={color} onClick={() => setFormData(f => ({ ...f, color }))} style={{
                    width: 24, height: 24, borderRadius: 4, border: "none",
                    backgroundColor: color, cursor: "pointer",
                    outline: formData.color === color ? "2px solid white" : "none",
                    outlineOffset: 2
                  }} />
                ))}
              </div>
            </div>
          </div>

          {/* Model */}
          <div style={{ marginBottom: 16, position: "relative" }}>
            <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#94a3b8", marginBottom: 6, textTransform: "uppercase" }}>
              Model
            </label>
            <div style={{ position: "relative" }}>
              <input
                value={modelSearch || formData.model}
                onChange={e => {
                  setModelSearch(e.target.value);
                  setShowModelDropdown(true);
                }}
                onFocus={() => setShowModelDropdown(true)}
                placeholder="Search models..."
                style={{
                  width: "100%", backgroundColor: "#141722", border: "1px solid #2a2d3e",
                  borderRadius: 6, padding: "10px 12px", color: "#e2e8f0", fontSize: 13
                }}
              />
              {showModelDropdown && (
                <div style={{
                  position: "absolute", top: "100%", left: 0, right: 0,
                  backgroundColor: "#141722", border: "1px solid #2a2d3e",
                  borderRadius: 6, marginTop: 4, maxHeight: 200, overflowY: "auto",
                  zIndex: 10
                }}>
                  {modelsLoading ? (
                    <div style={{ padding: 12, color: "#64748b", fontSize: 12 }}>Loading models...</div>
                  ) : sortedModels.length === 0 ? (
                    <div style={{ padding: 12, color: "#64748b", fontSize: 12 }}>No models found</div>
                  ) : (
                    sortedModels.slice(0, 50).map(m => (
                      <button key={m.id} onClick={() => {
                        setFormData(f => ({ ...f, model: m.id }));
                        setModelSearch("");
                        setShowModelDropdown(false);
                      }} style={{
                        display: "block", width: "100%", textAlign: "left",
                        padding: "8px 12px", border: "none", backgroundColor: "transparent",
                        color: formData.model === m.id ? "#818cf8" : "#cbd5e1",
                        cursor: "pointer", fontSize: 12,
                        borderBottom: "1px solid #1e2130"
                      }}>
                        <div style={{ fontWeight: 500 }}>{m.id}</div>
                        {m.pricing && (
                          <div style={{ fontSize: 10, color: "#64748b", marginTop: 2 }}>
                            ${(parseFloat(m.pricing.prompt) * 1000000).toFixed(2)}/M in · ${(parseFloat(m.pricing.completion) * 1000000).toFixed(2)}/M out
                          </div>
                        )}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
            {selectedModelInfo && (
              <div style={{ fontSize: 10, color: "#64748b", marginTop: 4 }}>
                Context: {selectedModelInfo.context_length?.toLocaleString() || "?"} tokens
                {selectedModelInfo.pricing && ` · $${(parseFloat(selectedModelInfo.pricing.prompt) * 1000000).toFixed(2)}/M in`}
              </div>
            )}
          </div>

          {/* Temperature */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#94a3b8", marginBottom: 6, textTransform: "uppercase" }}>
              Temperature: {formData.temperature}
            </label>
            <input
              type="range"
              min="0"
              max="2"
              step="0.1"
              value={formData.temperature}
              onChange={e => setFormData(f => ({ ...f, temperature: parseFloat(e.target.value) }))}
              style={{ width: "100%", accentColor: formData.color }}
            />
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#64748b" }}>
              <span>Precise</span>
              <span>Creative</span>
            </div>
          </div>

          {/* Max Tokens */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#94a3b8", marginBottom: 6, textTransform: "uppercase" }}>
              Max Tokens
            </label>
            <input
              type="number"
              value={formData.maxTokens}
              onChange={e => setFormData(f => ({ ...f, maxTokens: parseInt(e.target.value) || 4096 }))}
              min="1"
              max="128000"
              style={{
                width: "100%", backgroundColor: "#141722", border: "1px solid #2a2d3e",
                borderRadius: 6, padding: "10px 12px", color: "#e2e8f0", fontSize: 13
              }}
            />
          </div>

          {/* System Prompt (only for custom agents or when creating) */}
          {(isCreating || agent?.isCustom) && (
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#94a3b8", marginBottom: 6, textTransform: "uppercase" }}>
                System Prompt
              </label>
              <textarea
                value={formData.systemPrompt}
                onChange={e => setFormData(f => ({ ...f, systemPrompt: e.target.value }))}
                placeholder="You are a helpful assistant..."
                rows={6}
                style={{
                  width: "100%", backgroundColor: "#141722", border: "1px solid #2a2d3e",
                  borderRadius: 6, padding: "10px 12px", color: "#e2e8f0", fontSize: 13,
                  resize: "vertical", fontFamily: "inherit"
                }}
              />
            </div>
          )}

          {error && (
            <div style={{
              padding: "10px 12px", borderRadius: 6, fontSize: 12,
              backgroundColor: "#451a1a", color: "#fca5a5", marginBottom: 16
            }}>
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: "16px 20px", borderTop: "1px solid #1e2130",
          display: "flex", justifyContent: "space-between", alignItems: "center"
        }}>
          <div>
            {agent?.isCustom && !isCreating && (
              <button onClick={handleDelete} disabled={saving} style={{
                padding: "8px 16px", borderRadius: 6, border: "1px solid #7f1d1d",
                backgroundColor: "transparent", color: "#ef4444", fontSize: 12,
                fontWeight: 600, cursor: "pointer"
              }}>Delete Agent</button>
            )}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={onClose} style={{
              padding: "8px 16px", borderRadius: 6, border: "1px solid #2a2d3e",
              backgroundColor: "transparent", color: "#94a3b8", fontSize: 12,
              fontWeight: 600, cursor: "pointer"
            }}>Cancel</button>
            <button onClick={handleSave} disabled={saving || (isCreating && (!formData.name || !formData.model || !formData.systemPrompt))} style={{
              padding: "8px 20px", borderRadius: 6, border: "none",
              backgroundColor: formData.color, color: "white", fontSize: 12,
              fontWeight: 600, cursor: "pointer", opacity: saving ? 0.6 : 1
            }}>{saving ? "Saving..." : (isCreating ? "Create" : "Save")}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
