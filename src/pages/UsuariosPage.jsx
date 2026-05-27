import { Plus } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import UsuarioDeleteDialog from "../components/features/usuarios/UsuarioDeleteDialog";
import UsuarioDrawer from "../components/features/usuarios/UsuarioDrawer";
import UsuarioPasswordDialog from "../components/features/usuarios/UsuarioPasswordDialog";
import UsuariosTable from "../components/features/usuarios/UsuariosTable";
import FilterBar from "../components/shared/FilterBar";
import PageHeader from "../components/shared/PageHeader";
import SearchBar from "../components/shared/SearchBar";
import TablePagination from "../components/shared/TablePagination";
import { Button } from "../components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { ROLE_LABELS } from "../constants/roles";
import {
  useDeleteUsuario,
  useSendPasswordReset,
  useToggleActivoUsuario,
  useUsuarios,
} from "../hooks/queries/useUsuarios";

const PAGE_SIZE = 10;

export default function UsuariosPage() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filtroRol, setFiltroRol] = useState("todos");
  const [filtroEstado, setFiltroEstado] = useState("todos");
  const [page, setPage] = useState(1);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedUsuario, setSelectedUsuario] = useState(null);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [usuarioAEliminar, setUsuarioAEliminar] = useState(null);

  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [usuarioPassword, setUsuarioPassword] = useState(null);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const activoFilter =
    filtroEstado === "activo" ? true : filtroEstado === "inactivo" ? false : undefined;
  const rolFilter = filtroRol !== "todos" ? filtroRol : undefined;

  const { data: usuarios, isLoading } = useUsuarios({
    page,
    pageSize: PAGE_SIZE,
    search: debouncedSearch,
    rol: rolFilter,
    activo: activoFilter,
  });

  const { mutate: deleteUsuario, isPending: isDeleting } = useDeleteUsuario();
  const { mutate: toggleActivo } = useToggleActivoUsuario();
  const { mutate: sendReset, isPending: isSendingReset } = useSendPasswordReset();

  const handleEdit = useCallback((u) => {
    setSelectedUsuario(u);
    setDrawerOpen(true);
  }, []);

  const handleDelete = useCallback((u) => {
    setUsuarioAEliminar(u);
    setDeleteDialogOpen(true);
  }, []);

  const handleResetPassword = useCallback((u) => {
    setUsuarioPassword(u);
    setPasswordDialogOpen(true);
  }, []);

  const handleConfirmDelete = () => {
    deleteUsuario(usuarioAEliminar.id, {
      onSuccess: () => {
        setDeleteDialogOpen(false);
        setUsuarioAEliminar(null);
      },
    });
  };

  const handleConfirmReset = () => {
    sendReset(usuarioPassword.email, {
      onSuccess: () => {
        setPasswordDialogOpen(false);
        setUsuarioPassword(null);
      },
    });
  };

  const activeFilters =
    (filtroRol !== "todos" ? 1 : 0) + (filtroEstado !== "todos" ? 1 : 0);

  return (
    <div>
      <PageHeader
        title="Gestión de Usuarios"
        subtitle="Cuentas y roles del sistema"
        actions={
          <Button
            onClick={() => {
              setSelectedUsuario(null);
              setDrawerOpen(true);
            }}
            style={{ background: "var(--primary)", color: "var(--primary-fg)" }}
          >
            <Plus size={15} className="mr-1" /> Nuevo Usuario
          </Button>
        }
      />

      <div
        style={{
          display: "flex",
          gap: 12,
          marginBottom: 16,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Buscar por nombre o correo..."
        />
        <FilterBar
          activeCount={activeFilters}
          onClear={() => {
            setFiltroRol("todos");
            setFiltroEstado("todos");
            setPage(1);
          }}
        >
          <Select
            value={filtroRol}
            onValueChange={(v) => {
              setFiltroRol(v);
              setPage(1);
            }}
          >
            <SelectTrigger style={{ width: 200, height: 36 }}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos los roles</SelectItem>
              {Object.entries(ROLE_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={filtroEstado}
            onValueChange={(v) => {
              setFiltroEstado(v);
              setPage(1);
            }}
          >
            <SelectTrigger style={{ width: 160, height: 36 }}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos los estados</SelectItem>
              <SelectItem value="activo">Activos</SelectItem>
              <SelectItem value="inactivo">Inactivos</SelectItem>
            </SelectContent>
          </Select>
        </FilterBar>
      </div>

      <UsuariosTable
        data={usuarios?.data ?? []}
        loading={isLoading}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onToggleActivo={(u) => toggleActivo({ id: u.id, activo: !u.activo })}
        onResetPassword={handleResetPassword}
      />

      <TablePagination
        page={page}
        totalPages={Math.ceil((usuarios?.count ?? 0) / PAGE_SIZE)}
        total={usuarios?.count ?? 0}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
      />

      <UsuarioDrawer
        open={drawerOpen}
        onOpenChange={(v) => {
          setDrawerOpen(v);
          if (!v) setSelectedUsuario(null);
        }}
        usuario={selectedUsuario}
      />

      <UsuarioDeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        usuario={usuarioAEliminar}
        onConfirm={handleConfirmDelete}
        loading={isDeleting}
      />

      <UsuarioPasswordDialog
        open={passwordDialogOpen}
        onOpenChange={setPasswordDialogOpen}
        usuario={usuarioPassword}
        onConfirm={handleConfirmReset}
        loading={isSendingReset}
      />
    </div>
  );
}
