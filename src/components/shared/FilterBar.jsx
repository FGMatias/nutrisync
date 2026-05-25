import { X } from "lucide-react";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";

export default function FilterBar({ children, activeCount = 0, onClear }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        flexWrap: "wrap",
      }}
    >
      {children}
      {activeCount > 0 && (
        <>
          <Badge
            style={{
              background: "var(--info-bg)",
              color: "var(--info)",
              border: "none",
              fontSize: 11,
            }}
          >
            {activeCount} activo{activeCount > 1 ? "s" : ""}
          </Badge>
          {onClear && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClear}
              style={{ height: 30, fontSize: 12, color: "var(--muted-fg)" }}
            >
              <X size={12} className="mr-1" /> Limpiar
            </Button>
          )}
        </>
      )}
    </div>
  );
}
