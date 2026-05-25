import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  MoreHorizontal,
  Pencil,
  ToggleLeft,
  ToggleRight,
  Trash2,
} from "lucide-react";
import DataTable from "../../shared/DataTable";
import StatusBadge from "../../shared/StatusBadge";
import { Button } from "../../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../../ui/dropdown-menu";

export default function ProveedoresTable({
  data,
  loading,
  onEdit,
  onDelete,
  onToggleActivo,
}) {
  const columns = [
    {
      key: "nombre",
      header: "Proveedor",
      render: (val, row) => (
        <div>
          <p style={{ fontWeight: 500, margin: 0 }}>{val}</p>
          <p style={{ fontSize: 11, color: "var(--muted-fg)", margin: 0 }}>
            RUC: {row.ruc}
          </p>
        </div>
      ),
    },
    {
      key: "contacto",
      header: "Contacto",
      render: (val, row) => (
        <div>
          <p style={{ margin: 0 }}>{val || "—"}</p>
          {row.telefono && (
            <p style={{ fontSize: 11, color: "var(--muted-fg)", margin: 0 }}>
              {row.telefono}
            </p>
          )}
        </div>
      ),
    },
    { key: "tipo_producto", header: "Tipo Producto" },
    {
      key: "activo",
      header: "Estado",
      render: (val) => <StatusBadge status={val} />,
    },
    {
      key: "creado_en",
      header: "Registro",
      render: (val) =>
        val ? format(new Date(val), "dd/MM/yyyy", { locale: es }) : "—",
    },
    {
      key: "acciones",
      header: "Acciones",
      align: "center",
      width: 80,
      render: (_, row) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              style={{ height: 30, width: 30 }}
            >
              <MoreHorizontal size={15} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() => onEdit(row)}
              style={{ cursor: "pointer" }}
            >
              <Pencil size={13} className="mr-2" /> Editar
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onToggleActivo(row)}
              style={{ cursor: "pointer" }}
            >
              {row.activo ? (
                <>
                  <ToggleLeft size={13} className="mr-2" /> Desactivar
                </>
              ) : (
                <>
                  <ToggleRight size={13} className="mr-2" /> Activar
                </>
              )}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => onDelete(row)}
              style={{ color: "var(--danger)", cursor: "pointer" }}
            >
              <Trash2 size={13} className="mr-2" /> Eliminar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={data}
      loading={loading}
      emptyMessage="No se encontraron proveedores"
    />
  );
}
