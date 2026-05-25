import { Skeleton } from "../ui/skeleton";

export default function LoadingTable({ rows = 8, columns = 5 }) {
  return (
    <div style={{ width: "100%" }}>
      {Array.from({ length: rows }).map((_, r) => (
        <div
          key={r}
          style={{
            display: "flex",
            gap: 12,
            padding: "12px 0",
            borderBottom: "1px solid var(--border)",
          }}
        >
          {Array.from({ length: columns }).map((_, c) => (
            <Skeleton
              key={c}
              style={{ height: 16, flex: 1, borderRadius: 4 }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
