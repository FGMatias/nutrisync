import { format } from "date-fns";
import { es } from "date-fns/locale";
import { KeyRound, MoreHorizontal, Pencil, ToggleLeft, ToggleRight, Trash2 } from "lucide-react";
import { ROLE_LABELS } from "../../../constants/roles";
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

const ROL_BADGE_STYLE = {
  administrador: { background: "hsla(174,72%,24%,0.12)", color: "hsl(174,72%,24%)" },
  director:      { background: "var(--info-bg)",    color: "var(--info)" },
  cae:           { background: "var(--warning-bg)", color: "var(--warning)" },
  almacen:       { background: "var(--success-bg)", color: "var(--success)" },
  docente:       { background: "var(--muted)",      color: "var(--muted-fg)" },
  operario_logistico: { background: "var(--muted)", color: "var(--fg)" },
  padre_familia: { background: "var(--muted)",      color: "var(--muted-fg)" },
};

export default function UsuariosTable({
  data,
  loading,
  onEdit,
  onDelete,
  onToggleActivo,
  onResetPassword,
}) {
  const columns = [
    {
      key: "nombre_completo",
      header: "Usuario",
      render: (val, row) => (
        <div>
          <p style={{ fontWeight: 500, margin: 0 }}>{val}</p>
          <p style={{ fontSize: 11, color: "var(--muted-fg)", margin: 0 }}>{row.email}</p>
        </div>
      ),
    },
    {
      key: "rol",
      header: "Rol",
      render: (val) => {
        const st = ROL_BADGE_STYLE[val] ?? {};
        return (
          <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 4, ...st }}>
            {ROLE_LABELS[val] ?? val}
          </span>
        );
      },
    },
    {
      key: "dni",
      header: "DNI",
      render: (val) => (
        <span style={{ fontFamily: "monospace", fontSize: 12 }}>{val || "—"}</span>
      ),
    },
    {
      key: "telefono",
      header: "Teléfono",
      render: (val) => <span style={{ fontSize: 12 }}>{val || "—"}</span>,
    },
    {
      key: "activo",
      header: "Estado",
      render: (val) => <StatusBadge status={val} />,
    },
    {
      key: "creado_en",
      header: "Creado",
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
            <Button variant="ghost" size="icon" style={{ height: 30, width: 30 }}>
              <MoreHorizontal size={15} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(row)} style={{ cursor: "pointer" }}>
              <Pencil size={13} className="mr-2" /> Editar
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onToggleActivo(row)} style={{ cursor: "pointer" }}>
              {row.activo ? (
                <><ToggleLeft size={13} className="mr-2" /> Desactivar</>
              ) : (
                <><ToggleRight size={13} className="mr-2" /> Activar</>
              )}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onResetPassword(row)}
              style={{ cursor: "pointer" }}
            >
              <KeyRound size={13} className="mr-2" /> Restablecer contraseña
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
      emptyMessage="No se encontraron usuarios"
    />
  );
}
