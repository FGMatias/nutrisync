import EmptyState from "./EmptyState";
import LoadingTable from "./LoadingTable";

export default function DataTable({
  columns,
  data,
  loading,
  emptyMessage = "Sin resultados",
  emptyIcon,
}) {
  if (loading) return <LoadingTable columns={columns.length} />;

  if (!data || data.length === 0) {
    return (
      <EmptyState
        title={emptyMessage}
        description="Intenta ajustar los filtros de búsqueda."
      />
    );
  }

  return (
    <div style={{ width: "100%", overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ background: "var(--muted)", height: 40 }}>
            {columns.map((col) => (
              <th
                key={col.key}
                style={{
                  padding: "0 12px",
                  textAlign: col.align ?? "left",
                  fontSize: 11,
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  color: "var(--muted-fg)",
                  width: col.width,
                  whiteSpace: "nowrap",
                }}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr
              key={row.id ?? i}
              style={{
                height: 52,
                borderBottom: "1px solid var(--border)",
                transition: "background 0.1s",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "var(--secondary)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "transparent")
              }
            >
              {columns.map((col) => (
                <td
                  key={col.key}
                  style={{
                    padding: "0 12px",
                    textAlign: col.align ?? "left",
                    fontSize: 13,
                  }}
                >
                  {col.render ? col.render(row[col.key], row) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
