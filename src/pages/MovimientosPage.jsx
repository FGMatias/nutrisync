import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  FileText,
  LogIn,
  PackagePlus,
  PackageSearch,
  QrCode,
  UserCheck,
} from "lucide-react";
import { useMemo, useState } from "react";
import DataTable from "../components/shared/DataTable";
import FilterBar from "../components/shared/FilterBar";
import PageHeader from "../components/shared/PageHeader";
import SearchBar from "../components/shared/SearchBar";
import TablePagination from "../components/shared/TablePagination";
import { Button } from "../components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { useMovimientos } from "../hooks/queries/useMovimientos";

const TIPO_CONFIG = {
  LOGIN: { label: "Acceso", color: "var(--info)", bg: "var(--info-bg)", Icon: LogIn },
  INGRESO_CREADO: {
    label: "Ingreso",
    color: "var(--success)",
    bg: "var(--success-bg)",
    Icon: PackagePlus,
  },
  DISTRIBUCION_QR: {
    label: "Distribucion QR",
    color: "var(--primary)",
    bg: "hsla(174,72%,24%,0.10)",
    Icon: QrCode,
  },
  STOCK_AJUSTADO: {
    label: "Ajuste Stock",
    color: "var(--warning)",
    bg: "var(--warning-bg)",
    Icon: PackageSearch,
  },
  PRODUCTO: {
    label: "Producto",
    color: "var(--primary)",
    bg: "hsla(174,72%,24%,0.10)",
    Icon: PackagePlus,
  },
  REPORTE_GENERADO: {
    label: "Reporte",
    color: "var(--muted-fg)",
    bg: "var(--muted)",
    Icon: FileText,
  },
  PROVEEDOR_ACTUALIZADO: {
    label: "Proveedor",
    color: "var(--info)",
    bg: "var(--info-bg)",
    Icon: UserCheck,
  },
  ALUMNO_REGISTRADO: {
    label: "Alumno",
    color: "var(--success)",
    bg: "var(--success-bg)",
    Icon: UserCheck,
  },
};

const PAGE_SIZE = 10;

export default function MovimientosPage() {
  const [search, setSearch] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("todos");
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  const [page, setPage] = useState(1);
  const [metadataDialog, setMetadataDialog] = useState(null);

  const { data: movimientos = [], isLoading } = useMovimientos();

  const filtered = useMemo(() => {
    const searchText = search.trim().toLowerCase();

    return movimientos.filter((movimiento) => {
      const matchesSearch =
        !searchText ||
        [movimiento.usuario, movimiento.descripcion, movimiento.tipo_accion]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(searchText));

      const matchesTipo =
        filtroTipo === "todos" || movimiento.tipo_accion === filtroTipo;

      const fechaMovimiento = new Date(movimiento.fecha);
      const matchesFechaDesde =
        !fechaDesde || fechaMovimiento >= new Date(`${fechaDesde}T00:00:00`);
      const matchesFechaHasta =
        !fechaHasta || fechaMovimiento <= new Date(`${fechaHasta}T23:59:59`);

      return matchesSearch && matchesTipo && matchesFechaDesde && matchesFechaHasta;
    });
  }, [movimientos, search, filtroTipo, fechaDesde, fechaHasta]);

  const safePage = Math.min(page, Math.max(1, Math.ceil(filtered.length / PAGE_SIZE)));
  const shown = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const activeFilters =
    (filtroTipo !== "todos" ? 1 : 0) + (fechaDesde ? 1 : 0) + (fechaHasta ? 1 : 0);

  const columns = [
    {
      key: "fecha",
      header: "Fecha / Hora",
      width: 150,
      render: (v) => (
        <div>
          <p style={{ margin: 0, fontWeight: 500, fontSize: 12 }}>
            {format(new Date(v), "dd/MM/yyyy", { locale: es })}
          </p>
          <p style={{ margin: 0, fontSize: 11, color: "var(--muted-fg)" }}>
            {format(new Date(v), "HH:mm:ss")}
          </p>
        </div>
      ),
    },
    {
      key: "tipo_accion",
      header: "Tipo de Accion",
      width: 160,
      render: (v) => {
        const cfg = TIPO_CONFIG[v] ?? {
          label: v,
          color: "var(--muted-fg)",
          bg: "var(--muted)",
          Icon: FileText,
        };
        return (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              fontSize: 11,
              fontWeight: 600,
              color: cfg.color,
              background: cfg.bg,
              padding: "3px 8px",
              borderRadius: 4,
            }}
          >
            <cfg.Icon size={12} />
            {cfg.label}
          </span>
        );
      },
    },
    {
      key: "usuario",
      header: "Usuario",
      render: (v) => <span style={{ fontSize: 12 }}>{v}</span>,
    },
    {
      key: "descripcion",
      header: "Descripcion",
      render: (v) => <span style={{ fontSize: 12, color: "var(--muted-fg)" }}>{v}</span>,
    },
    {
      key: "metadata",
      header: "Metadata",
      align: "center",
      width: 100,
      render: (_, row) => (
        <Button
          variant="ghost"
          size="sm"
          style={{ fontSize: 11, height: 28 }}
          onClick={() => setMetadataDialog(row)}
        >
          Ver detalles
        </Button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader title="Historial de Movimientos" subtitle="Registro de auditoria del sistema" />

      <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
        <SearchBar value={search} onChange={setSearch} placeholder="Buscar por usuario o descripcion..." />
        <FilterBar activeCount={activeFilters} onClear={() => {
          setFiltroTipo("todos");
          setFechaDesde("");
          setFechaHasta("");
        }}>
          <Input
            type="date"
            value={fechaDesde}
            onChange={(e) => setFechaDesde(e.target.value)}
            style={{ width: 160, height: 36, fontSize: 13 }}
          />
          <Input
            type="date"
            value={fechaHasta}
            onChange={(e) => setFechaHasta(e.target.value)}
            style={{ width: 160, height: 36, fontSize: 13 }}
          />
          <Select value={filtroTipo} onValueChange={setFiltroTipo}>
            <SelectTrigger style={{ width: 180, height: 36 }}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos los tipos</SelectItem>
              <SelectItem value="LOGIN">Acceso</SelectItem>
              <SelectItem value="INGRESO_CREADO">Ingreso</SelectItem>
              <SelectItem value="DISTRIBUCION_QR">Distribucion QR</SelectItem>
              <SelectItem value="STOCK_AJUSTADO">Ajuste Stock</SelectItem>
              <SelectItem value="PRODUCTO">Producto</SelectItem>
              <SelectItem value="REPORTE_GENERADO">Reporte</SelectItem>
              <SelectItem value="PROVEEDOR_ACTUALIZADO">Proveedor</SelectItem>
            </SelectContent>
          </Select>
        </FilterBar>
      </div>

      <DataTable columns={columns} data={shown} loading={isLoading} emptyMessage="No se encontraron movimientos" />
      <TablePagination
        page={safePage}
        totalPages={Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))}
        total={filtered.length}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
      />

      <Dialog open={!!metadataDialog} onOpenChange={() => setMetadataDialog(null)}>
        <DialogContent style={{ maxWidth: 480 }}>
          <DialogHeader>
            <DialogTitle>Detalles del movimiento</DialogTitle>
          </DialogHeader>
          {metadataDialog && (
            <div>
              <div style={{ marginBottom: 12 }}>
                <p style={{ fontSize: 12, fontWeight: 600, marginBottom: 2 }}>
                  {metadataDialog.descripcion}
                </p>
                <p style={{ fontSize: 11, color: "var(--muted-fg)" }}>
                  {format(new Date(metadataDialog.fecha), "dd/MM/yyyy 'a las' HH:mm:ss", {
                    locale: es,
                  })}{" "}
                  · {metadataDialog.usuario}
                </p>
              </div>
              <pre
                style={{
                  background: "var(--muted)",
                  borderRadius: 6,
                  padding: 12,
                  fontSize: 11,
                  overflow: "auto",
                  maxHeight: 200,
                }}
              >
                {JSON.stringify(metadataDialog.metadata, null, 2)}
              </pre>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setMetadataDialog(null)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
