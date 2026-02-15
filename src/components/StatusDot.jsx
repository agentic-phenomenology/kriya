import { STATUS_CONFIG } from "./statusConfig";

export default function StatusDot({ status }) {
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
}
