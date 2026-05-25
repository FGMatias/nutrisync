import { Package } from "lucide-react";

const ICON_MAP_LAZY = {};

export default function EmptyState({
  icon: IconName,
  title,
  description,
  action,
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "48px 24px",
        gap: 12,
      }}
    >
      <div style={{ color: "var(--muted-fg)", opacity: 0.5 }}>
        <Package size={48} />
      </div>
      <p style={{ fontSize: 15, fontWeight: 500, margin: 0 }}>{title}</p>
      {description && (
        <p
          style={{
            fontSize: 13,
            color: "var(--muted-fg)",
            margin: 0,
            textAlign: "center",
            maxWidth: 320,
          }}
        >
          {description}
        </p>
      )}
      {action}
    </div>
  );
}
