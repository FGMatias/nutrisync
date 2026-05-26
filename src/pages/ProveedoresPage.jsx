import { Plus } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import ProveedorDeleteDialog from "../components/features/proveedores/ProveedorDeleteDialog";
import ProveedorDrawer from "../components/features/proveedores/ProveedorDrawer";
import ProveedoresTable from "../components/features/proveedores/ProveedoresTable";
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
import {
  useDeleteProveedor,
  useProveedores,
  useToggleActivoProveedor,
} from "../hooks/queries/useProveedores";
import { useAuth } from "../hooks/queries/useAuth";

const PAGE_SIZE = 10;

export function ProveedoresPage() {
  const { perfil } = useAuth();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filtroActivo, setFiltroActivo] = useState("todos");
  const [page, setPage] = useState(1);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedProveedor, setSelectedProveedor] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [proveedorAEliminar, setProveedorAEliminar] = useState(null);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const activoFilter =
    filtroActivo === "activo"
      ? true
      : filtroActivo === "inactivo"
        ? false
        : undefined;

  const { data: proveedores, isLoading } = useProveedores({
    page,
    pageSize: PAGE_SIZE,
    search: debouncedSearch,
    activo: activoFilter,
  });

  const { mutate: deleteProveedor, isPending: isDeleting } =
    useDeleteProveedor();
  const { mutate: toggleActivo } = useToggleActivoProveedor();
  const canManage = perfil?.rol === "administrador" || perfil?.rol === "almacen";

  const handleEdit = useCallback((p) => {
    setSelectedProveedor(p);
    setDrawerOpen(true);
  }, []);
  const handleDelete = useCallback((p) => {
    setProveedorAEliminar(p);
    setDeleteDialogOpen(true);
  }, []);

  const handleConfirmDelete = () => {
    deleteProveedor(proveedorAEliminar.id, {
      onSuccess: () => {
        setDeleteDialogOpen(false);
        setProveedorAEliminar(null);
      },
    });
  };

  const activeFilters = filtroActivo !== "todos" ? 1 : 0;

  return (
    <div>
      <PageHeader
        title="Proveedores"
        subtitle="Gestión de proveedores y consorcios del PAE"
        actions={
          <Button
            disabled={!canManage}
            onClick={() => {
              setSelectedProveedor(null);
              setDrawerOpen(true);
            }}
            style={{ background: "var(--primary)", color: "var(--primary-fg)" }}
          >
            <Plus size={15} className="mr-1" /> Nuevo Proveedor
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
          placeholder="Buscar por nombre o RUC..."
        />
        <FilterBar
          activeCount={activeFilters}
          onClear={() => {
            setFiltroActivo("todos");
            setPage(1);
          }}
        >
          <Select
            value={filtroActivo}
            onValueChange={(v) => {
              setFiltroActivo(v);
              setPage(1);
            }}
          >
            <SelectTrigger style={{ width: 180, height: 36 }}>
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

      <ProveedoresTable
        data={proveedores?.data ?? []}
        loading={isLoading}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onToggleActivo={(p) => canManage && toggleActivo({ id: p.id, activo: !p.activo })}
      />

      <TablePagination
        page={page}
        totalPages={Math.ceil((proveedores?.count ?? 0) / PAGE_SIZE)}
        total={proveedores?.count ?? 0}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
      />

      <ProveedorDrawer
        open={drawerOpen}
        onOpenChange={(v) => {
          setDrawerOpen(v);
          if (!v) setSelectedProveedor(null);
        }}
        proveedor={selectedProveedor}
        canManage={canManage}
      />

      <ProveedorDeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        proveedor={proveedorAEliminar}
        onConfirm={handleConfirmDelete}
        loading={isDeleting}
      />
    </div>
  );
}
