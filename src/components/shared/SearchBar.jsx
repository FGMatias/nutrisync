import { Search, X } from "lucide-react";
import { Input } from "../ui/input";

export default function SearchBar({
  value,
  onChange,
  placeholder = "Buscar...",
  className = "",
}) {
  return (
    <div
      style={{ position: "relative", flex: 1, maxWidth: 320 }}
      className={className}
    >
      <Search
        size={14}
        style={{
          position: "absolute",
          left: 10,
          top: "50%",
          transform: "translateY(-50%)",
          color: "var(--muted-fg)",
          pointerEvents: "none",
        }}
      />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{ paddingLeft: 32, paddingRight: value ? 32 : 12 }}
      />
      {value && (
        <button
          onClick={() => onChange("")}
          style={{
            position: "absolute",
            right: 8,
            top: "50%",
            transform: "translateY(-50%)",
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "var(--muted-fg)",
            display: "flex",
            padding: 2,
          }}
        >
          <X size={13} />
        </button>
      )}
    </div>
  );
}
