import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "../ui/button";

export default function TablePagination({
  page,
  totalPages,
  total,
  pageSize,
  onPageChange,
}) {
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  const pages = [];
  const maxVisible = 5;
  let start = Math.max(1, page - Math.floor(maxVisible / 2));
  let end = Math.min(totalPages, start + maxVisible - 1);
  if (end - start < maxVisible - 1) start = Math.max(1, end - maxVisible + 1);
  for (let i = start; i <= end; i++) pages.push(i);

  if (totalPages <= 1) return null;

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginTop: 16,
      }}
    >
      <span style={{ fontSize: 12, color: "var(--muted-fg)" }}>
        Mostrando {from}–{to} de {total} resultados
      </span>
      <div style={{ display: "flex", gap: 4 }}>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1}
          style={{ height: 30, fontSize: 12 }}
        >
          <ChevronLeft size={14} />
        </Button>

        {start > 1 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onPageChange(1)}
            style={{ height: 30, fontSize: 12, minWidth: 30 }}
          >
            1
          </Button>
        )}
        {start > 2 && (
          <span
            style={{
              display: "flex",
              alignItems: "center",
              padding: "0 4px",
              color: "var(--muted-fg)",
              fontSize: 12,
            }}
          >
            …
          </span>
        )}

        {pages.map((p) => (
          <Button
            key={p}
            variant={p === page ? "default" : "ghost"}
            size="sm"
            onClick={() => onPageChange(p)}
            style={{
              height: 30,
              minWidth: 30,
              fontSize: 12,
              ...(p === page
                ? { background: "var(--primary)", color: "var(--primary-fg)" }
                : {}),
            }}
          >
            {p}
          </Button>
        ))}

        {end < totalPages - 1 && (
          <span
            style={{
              display: "flex",
              alignItems: "center",
              padding: "0 4px",
              color: "var(--muted-fg)",
              fontSize: 12,
            }}
          >
            …
          </span>
        )}
        {end < totalPages && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onPageChange(totalPages)}
            style={{ height: 30, fontSize: 12, minWidth: 30 }}
          >
            {totalPages}
          </Button>
        )}

        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page + 1)}
          disabled={page === totalPages}
          style={{ height: 30, fontSize: 12 }}
        >
          <ChevronRight size={14} />
        </Button>
      </div>
    </div>
  );
}
