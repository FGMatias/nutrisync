import { zodResolver } from "@hookform/resolvers/zod";
import {
  Download,
  FileText,
  MoreHorizontal,
  Pencil,
  Plus,
  ToggleLeft,
  ToggleRight,
  Trash2,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { TIPOS_PRODUCTO_PROVEEDOR, UNIDADES_MEDIDA } from "../constants/enums";
import DataTable from "../components/shared/DataTable";
import FilterBar from "../components/shared/FilterBar";
import ConfirmDialog from "../components/shared/ConfirmDialog";
import StatusBadge from "../components/shared/StatusBadge";
import PageHeader from "../components/shared/PageHeader";
import SearchBar from "../components/shared/SearchBar";
import TablePagination from "../components/shared/TablePagination";
import { Button } from "../components/ui/button";
import { Checkbox } from "../components/ui/checkbox";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "../components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import { Progress } from "../components/ui/progress";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import { useProveedores } from "../hooks/queries/useProveedores";
import { useMovimientos } from "../hooks/queries/useMovimientos";
import {
  useCreateProducto,
  useDeleteProducto,
  useInventario,
  useToggleActivoProducto,
  useUpdateProducto,
} from "../hooks/queries/useProductos";
import {
  productoFormDefaultValues,
  productoSchema,
} from "../schemas/producto.schema";

const PAGE_SIZE = 10;

function getStockStatus(actual, minimo, maximo) {
  const ratio = minimo > 0 ? actual / minimo : actual > 0 ? 1 : 0;
  const pct = minimo > 0 ? Math.min(100, Math.round(ratio * 100)) : actual > 0 ? 100 : 0;

  if (actual <= 0) {
    return {
      label: "Crítico",
      color: "var(--danger)",
      bg: "var(--danger-bg)",
      pct,
    };
  }

  if (actual < minimo) {
    if (ratio < 0.5) {
      return {
        label: "Crítico",
        color: "var(--danger)",
        bg: "var(--danger-bg)",
        pct,
      };
    }

    return {
      label: "Bajo mínimo",
      color: "var(--warning)",
      bg: "var(--warning-bg)",
      pct,
    };
  }

  if (actual >= maximo) {
    return {
      label: "Normal",
      color: "var(--success)",
      bg: "var(--success-bg)",
      pct,
    };
  }

  return {
    label: "Normal",
    color: "var(--success)",
    bg: "var(--success-bg)",
    pct,
  };
}

function normalizeText(value) {
  return String(value ?? "").trim().replace(/\s+/g, " ");
}

function productoFormValues(producto) {
  if (!producto) return productoFormDefaultValues;

  return {
    nombre: producto.nombre ?? "",
    codigo_producto: producto.codigo_producto ?? "",
    id_proveedor: producto.id_proveedor ? String(producto.id_proveedor) : "",
    categoria: producto.categoria ?? "General",
    unidad_medida: producto.unidad ?? producto.unidad_medida ?? "kg",
    stock_minimo: String(producto.stock_minimo ?? 0),
    stock_maximo: String(producto.stock_maximo ?? 100),
    activo: Boolean(producto.activo),
    motivo: "",
  };
}

function collectProductIds(value, ids = new Set()) {
  if (value == null) return ids;

  if (Array.isArray(value)) {
    value.forEach((item) => collectProductIds(item, ids));
    return ids;
  }

  if (typeof value === "object") {
    if (value.id_producto != null) ids.add(Number(value.id_producto));
    if (value.producto?.id != null) ids.add(Number(value.producto.id));
    if (value.new) collectProductIds(value.new, ids);
    if (value.old) collectProductIds(value.old, ids);

    Object.values(value).forEach((child) => {
      if (typeof child === "object") {
        collectProductIds(child, ids);
      }
    });
  }

  return ids;
}

function movementReferencesProduct(movimiento, productId) {
  if (!movimiento || productId == null) return false;

  if (
    movimiento.tabla_origen === "productos" &&
    Number(movimiento.id_registro) === Number(productId)
  ) {
    return true;
  }

  return collectProductIds(movimiento.metadata).has(Number(productId));
}

function prettyTipoMovimiento(tipo) {
  const map = {
    PRODUCTO: "Producto",
    INGRESO_CREADO: "Ingreso",
    DISTRIBUCION_QR: "Distribución QR",
    STOCK_AJUSTADO: "Ajuste de stock",
    REPORTE_GENERADO: "Reporte",
    PROVEEDOR_ACTUALIZADO: "Proveedor",
    ALUMNO_REGISTRADO: "Alumno",
  };

  return map[tipo] ?? tipo;
}

function buildHistoryText(producto, movimientos) {
  const lines = [
    "REPORTE SIMPLE DE HISTORIAL",
    `Producto: ${producto?.nombre ?? "Sin producto"}`,
    `Código producto: ${producto?.codigo_producto ?? "-"}`,
    `Proveedor: ${producto?.proveedor_nombre ?? "Sin proveedor"}`,
    `Categoria: ${producto?.categoria ?? "-"}`,
    `Unidad: ${producto?.unidad ?? producto?.unidad_medida ?? "-"}`,
    `Generado: ${format(new Date(), "dd/MM/yyyy HH:mm:ss", { locale: es })}`,
    "",
    "DETALLE",
  ];

  if (movimientos.length === 0) {
    lines.push("No se encontraron cambios para este producto.");
    return lines.join("\n");
  }

  movimientos.forEach((movimiento, index) => {
    lines.push(
      `${index + 1}. ${format(new Date(movimiento.fecha), "dd/MM/yyyy HH:mm:ss", {
        locale: es,
      })} | ${prettyTipoMovimiento(movimiento.tipo_accion)} | ${movimiento.usuario}`,
    );
    lines.push(`   ${movimiento.descripcion}`);
    if (movimiento.tabla_origen) {
      lines.push(`   Tabla: ${movimiento.tabla_origen}`);
    }
    if (movimiento.metadata && Object.keys(movimiento.metadata).length > 0) {
      lines.push(`   Metadata: ${JSON.stringify(movimiento.metadata)}`);
    }
  });

  return lines.join("\n");
}

function downloadTextFile(filename, content) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export default function StockPage() {
  const [search, setSearch] = useState("");
  const [filtroCategoria, setFiltroCategoria] = useState("todas");
  const [filtroEstado, setFiltroEstado] = useState("todos");
  const [page, setPage] = useState(1);
  const [productoOpen, setProductoOpen] = useState(false);
  const [productoMode, setProductoMode] = useState("create");
  const [productoSeleccionado, setProductoSeleccionado] = useState(null);
  const [historialOpen, setHistorialOpen] = useState(false);
  const [historialProducto, setHistorialProducto] = useState(null);
  const [productoAEliminar, setProductoAEliminar] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const { data: inventario = [], isLoading } = useInventario();
  const { data: proveedoresData } = useProveedores({
    page: 1,
    pageSize: 1000,
    activo: true,
  });
  const { data: movimientos = [], isLoading: loadingMovimientos, error: errorMovimientos } =
    useMovimientos();
  const { mutate: createProducto, isPending: isCreating } = useCreateProducto();
  const { mutate: updateProducto, isPending: isUpdating } = useUpdateProducto();
  const { mutate: deleteProducto, isPending: isDeleting } = useDeleteProducto();
  const { mutate: toggleActivoProducto } = useToggleActivoProducto();

  const {
    control,
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(productoSchema),
    defaultValues: productoFormDefaultValues,
    mode: "onTouched",
  });

  const categoriaValue = useWatch({ control, name: "categoria" });
  const unidadValue = useWatch({ control, name: "unidad_medida" });
  const activoValue = useWatch({ control, name: "activo" });
  const proveedorValue = useWatch({ control, name: "id_proveedor" });

  const proveedores = proveedoresData?.data ?? [];

  useEffect(() => {
    if (!productoOpen) return;
    reset(productoFormValues(productoMode === "edit" ? productoSeleccionado : null));
  }, [productoOpen, productoMode, productoSeleccionado, reset]);

  const filteredInventario = useMemo(() => {
    const searchText = search.trim().toLowerCase();

    return inventario.filter((row) => {
      const actual = Number(row.stock_actual ?? 0);
      const minimo = Number(row.stock_minimo ?? 0);
      const status =
        actual <= 0
          ? "critico"
          : actual < minimo
            ? actual / minimo < 0.5
              ? "critico"
              : "bajo"
            : "normal";

      const matchesSearch =
        !searchText ||
        [
          row.nombre,
          row.codigo_producto,
          row.codigo,
          row.proveedor_nombre,
          row.categoria,
          row.unidad,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(searchText));

      const matchesCategoria =
        filtroCategoria === "todas" || row.categoria === filtroCategoria;

      const matchesEstado =
        filtroEstado === "todos" ||
        (filtroEstado === "normal" && status === "normal") ||
        (filtroEstado === "bajo" && status === "bajo") ||
        (filtroEstado === "critico" && status === "critico");

      return matchesSearch && matchesCategoria && matchesEstado;
    });
  }, [inventario, search, filtroCategoria, filtroEstado]);

  const safePage = Math.min(
    page,
    Math.max(1, Math.ceil(filteredInventario.length / PAGE_SIZE)),
  );
  const shown = filteredInventario.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const activeFilters =
    (filtroCategoria !== "todas" ? 1 : 0) + (filtroEstado !== "todos" ? 1 : 0);

  const bajoMinimo = inventario.filter(
    (p) => p.activo && Number(p.stock_actual ?? 0) < Number(p.stock_minimo ?? 0),
  ).length;

  const historialMovimientos = useMemo(() => {
    if (!historialProducto) return [];
    return movimientos.filter((movimiento) =>
      movementReferencesProduct(movimiento, historialProducto.id),
    );
  }, [movimientos, historialProducto]);

  const historialTexto = useMemo(() => {
    return buildHistoryText(historialProducto, historialMovimientos);
  }, [historialProducto, historialMovimientos]);

  const columns = [
    {
      key: "codigo_producto",
      header: "Código producto",
      width: 100,
      render: (v) => (
        <span style={{ fontSize: 11, fontFamily: "monospace", color: "var(--muted-fg)" }}>
          {v}
        </span>
      ),
    },
    {
      key: "nombre",
      header: "Producto",
      render: (v, row) => (
        <div>
          <p style={{ fontWeight: 500, margin: 0 }}>{v}</p>
          <p style={{ fontSize: 11, color: "var(--muted-fg)", margin: 0 }}>
            {row.id_proveedor ? `ID prov. ${row.id_proveedor}` : "Sin proveedor"}
          </p>
        </div>
      ),
    },
    {
      key: "proveedor_nombre",
      header: "Proveedor",
      render: (v) => <span style={{ fontSize: 12 }}>{v || "Sin proveedor"}</span>,
    },
    { key: "categoria", header: "Categoría" },
    {
      key: "unidad",
      header: "Unidad",
      render: (v) => <span style={{ fontWeight: 500 }}>{v || "-"}</span>,
    },
    {
      key: "stock_actual",
      header: "Stock Actual",
      render: (v, row) => <span style={{ fontWeight: 600 }}>{v} {row.unidad}</span>,
    },
    {
      key: "stock_minimo",
      header: "Stock Mínimo",
      render: (v, row) => <span style={{ color: "var(--muted-fg)" }}>{v} {row.unidad}</span>,
    },
    {
      key: "stock_maximo",
      header: "Stock Máximo",
      render: (v, row) => <span style={{ color: "var(--muted-fg)" }}>{v} {row.unidad}</span>,
    },
    {
      key: "activo",
      header: "Estado",
      render: (v) => <StatusBadge status={v} />,
    },
    {
      key: "id",
      header: "Nivel",
      render: (_, row) => {
        const st = getStockStatus(
          Number(row.stock_actual ?? 0),
          Number(row.stock_minimo ?? 0),
          Number(row.stock_maximo ?? 0),
        );
        return (
          <div style={{ minWidth: 130 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: st.color,
                  background: st.bg,
                  padding: "2px 6px",
                  borderRadius: 4,
                }}
              >
                {st.label}
              </span>
            </div>
            <Progress
              value={st.pct}
              className="h-1"
              indicatorClassName={
                st.pct < 50 ? "bg-red-500" : st.pct < 100 ? "bg-yellow-500" : "bg-green-600"
              }
            />
          </div>
        );
      },
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
            <DropdownMenuItem
              onClick={() => {
                setProductoMode("edit");
                setProductoSeleccionado(row);
                setProductoOpen(true);
              }}
              style={{ cursor: "pointer" }}
            >
              <Pencil size={13} className="mr-2" /> Editar
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                setHistorialProducto(row);
                setHistorialOpen(true);
              }}
              style={{ cursor: "pointer" }}
            >
              <FileText size={13} className="mr-2" /> Historial
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => toggleActivoProducto({ id: row.id, activo: !row.activo })}
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
                onClick={() => {
                  setProductoAEliminar(row);
                  setDeleteDialogOpen(true);
                }}
                style={{ color: "var(--danger)", cursor: "pointer" }}
                disabled={isDeleting}
              >
                <Trash2 size={13} className="mr-2" /> Eliminar
              </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  const openCreateProducto = () => {
    setProductoMode("create");
    setProductoSeleccionado(null);
    setProductoOpen(true);
  };

  const onSubmitProducto = (values) => {
    const payload = {
      ...values,
      nombre: normalizeText(values.nombre),
      codigo_producto: normalizeText(values.codigo_producto),
      id_proveedor:
        values.id_proveedor && values.id_proveedor !== "none"
          ? Number(values.id_proveedor)
          : null,
      stock_minimo: Number(values.stock_minimo),
      stock_maximo: Number(values.stock_maximo),
      activo: Boolean(values.activo),
    };

    if (productoMode === "edit" && productoSeleccionado) {
      updateProducto(
        { id: productoSeleccionado.id, data: payload },
        {
          onSuccess: () => {
            setProductoOpen(false);
            setProductoSeleccionado(null);
            reset(productoFormDefaultValues);
          },
        },
      );
      return;
    }

    createProducto(payload, {
      onSuccess: () => {
        setProductoOpen(false);
        setProductoSeleccionado(null);
        reset(productoFormDefaultValues);
      },
    });
  };

  const exportHistory = () => {
    if (!historialProducto) return;

    const filename = `historial-${normalizeText(historialProducto.nombre)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")}.txt`;

    downloadTextFile(filename || "historial-producto.txt", historialTexto);
  };

  return (
    <div>
      <PageHeader
        title="Inventario"
        subtitle="Stock actual de productos"
        actions={
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <span style={{ fontSize: 12, color: "var(--muted-fg)" }}>
              {inventario.length} productos ·{" "}
              <span style={{ color: "var(--danger)" }}>{bajoMinimo} bajo minimo</span> ·
              Actualizado hace 2 min
            </span>
            <Button
              onClick={openCreateProducto}
              style={{ background: "var(--primary)", color: "var(--primary-fg)" }}
            >
              <Plus size={15} style={{ marginRight: 4 }} /> Definir producto
            </Button>
          </div>
        }
      />

      <div style={{ display: "flex", gap: 12, marginBottom: 16, alignItems: "center", flexWrap: "wrap" }}>
        <SearchBar value={search} onChange={setSearch} placeholder="Buscar producto..." />
        <FilterBar
          activeCount={activeFilters}
          onClear={() => {
            setFiltroCategoria("todas");
            setFiltroEstado("todos");
          }}
        >
          <Select value={filtroCategoria} onValueChange={setFiltroCategoria}>
            <SelectTrigger style={{ width: 160, height: 36 }}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas las categorías</SelectItem>
              {TIPOS_PRODUCTO_PROVEEDOR.map((categoria) => (
                <SelectItem key={categoria} value={categoria}>
                  {categoria}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filtroEstado} onValueChange={setFiltroEstado}>
            <SelectTrigger style={{ width: 150, height: 36 }}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos los estados</SelectItem>
              <SelectItem value="normal">Normal</SelectItem>
              <SelectItem value="bajo">Bajo mínimo</SelectItem>
              <SelectItem value="critico">Crítico</SelectItem>
            </SelectContent>
          </Select>
        </FilterBar>
      </div>

      <DataTable
        columns={columns}
        data={shown}
        loading={isLoading}
        emptyMessage="No se encontraron productos"
      />
      <TablePagination
        page={safePage}
        totalPages={Math.max(1, Math.ceil(filteredInventario.length / PAGE_SIZE))}
        total={filteredInventario.length}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
      />

      <Sheet
        open={productoOpen}
        onOpenChange={(open) => {
          setProductoOpen(open);
          if (!open) {
            setProductoMode("create");
            setProductoSeleccionado(null);
            reset(productoFormDefaultValues);
          }
        }}
      >
        <SheetContent style={{ width: 560, maxWidth: "95vw", overflowY: "auto" }}>
          <SheetHeader>
            <SheetTitle>{productoMode === "edit" ? "Editar producto" : "Definir producto"}</SheetTitle>
          </SheetHeader>
          <form
            id="producto-form"
            onSubmit={handleSubmit(onSubmitProducto)}
            style={{ padding: "24px 0 80px", display: "flex", flexDirection: "column", gap: 16 }}
          >
            <div style={{ background: "var(--muted)", padding: "12px 16px", borderRadius: 8 }}>
              <p style={{ margin: 0, fontSize: 12, color: "var(--muted-fg)" }}>
                La ficha base del producto no requiere stock actual. El stock se calcula desde
                ingresos, distribuciones y ajustes.
              </p>
            </div>

            <div>
              <Label>Nombre del producto *</Label>
              <Input {...register("nombre")} placeholder="Arroz pilado" style={{ marginTop: 4 }} />
              {errors.nombre && (
                <p style={{ fontSize: 11, color: "var(--danger)", marginTop: 2 }}>
                  {errors.nombre.message}
                </p>
              )}
            </div>

            <div>
              <Label>Proveedor</Label>
              <Select
                value={proveedorValue || "none"}
                onValueChange={(value) =>
                  setValue("id_proveedor", value === "none" ? "" : value, {
                    shouldValidate: true,
                  })
                }
              >
                <SelectTrigger style={{ marginTop: 4 }}>
                  <SelectValue placeholder="Seleccionar proveedor..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin proveedor</SelectItem>
                  {proveedores.map((proveedor) => (
                    <SelectItem key={proveedor.id} value={String(proveedor.id)}>
                      {proveedor.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.id_proveedor && (
                <p style={{ fontSize: 11, color: "var(--danger)", marginTop: 2 }}>
                  {errors.id_proveedor.message}
                </p>
              )}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <Label>Categoría *</Label>
                <Select
                  value={categoriaValue}
                  onValueChange={(value) => setValue("categoria", value, { shouldValidate: true })}
                >
                  <SelectTrigger style={{ marginTop: 4 }}>
                    <SelectValue placeholder="Seleccionar..." />
                  </SelectTrigger>
                  <SelectContent>
                    {TIPOS_PRODUCTO_PROVEEDOR.map((categoria) => (
                      <SelectItem key={categoria} value={categoria}>
                        {categoria}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.categoria && (
                  <p style={{ fontSize: 11, color: "var(--danger)", marginTop: 2 }}>
                    {errors.categoria.message}
                  </p>
                )}
              </div>
              <div>
                <Label>Unidad de medida *</Label>
                <Select
                  value={unidadValue}
                  onValueChange={(value) =>
                    setValue("unidad_medida", value, { shouldValidate: true })
                  }
                >
                  <SelectTrigger style={{ marginTop: 4 }}>
                    <SelectValue placeholder="Seleccionar..." />
                  </SelectTrigger>
                  <SelectContent>
                    {UNIDADES_MEDIDA.map((unidad) => (
                      <SelectItem key={unidad.value} value={unidad.value}>
                        {unidad.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.unidad_medida && (
                  <p style={{ fontSize: 11, color: "var(--danger)", marginTop: 2 }}>
                    {errors.unidad_medida.message}
                  </p>
                )}
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <Label>Stock mínimo *</Label>
                <Input
                  {...register("stock_minimo")}
                  type="number"
                  step="1"
                  min="0"
                  placeholder="0"
                  style={{ marginTop: 4 }}
                />
                {errors.stock_minimo && (
                  <p style={{ fontSize: 11, color: "var(--danger)", marginTop: 2 }}>
                    {errors.stock_minimo.message}
                  </p>
                )}
              </div>
              <div>
                <Label>Stock máximo *</Label>
                <Input
                  {...register("stock_maximo")}
                  type="number"
                  step="1"
                  min="1"
                  placeholder="100"
                  style={{ marginTop: 4 }}
                />
                {errors.stock_maximo && (
                  <p style={{ fontSize: 11, color: "var(--danger)", marginTop: 2 }}>
                    {errors.stock_maximo.message}
                  </p>
                )}
              </div>
            </div>

            <div>
              <Label>Código del producto</Label>
              <Input
                {...register("codigo_producto")}
                placeholder="Opcional. Se genera automaticamente si se deja vacío."
                style={{ marginTop: 4 }}
              />
            </div>

            <div>
              <Label>Motivo de ajuste</Label>
              <textarea
                {...register("motivo")}
                placeholder="Opcional. Referencia interna del cambio."
                style={{
                  marginTop: 4,
                  width: "100%",
                  minHeight: 84,
                  padding: "8px 12px",
                  border: "1px solid var(--border)",
                  borderRadius: 6,
                  fontSize: 13,
                  resize: "vertical",
                  background: "transparent",
                  color: "var(--fg)",
                }}
              />
              {errors.motivo && (
                <p style={{ fontSize: 11, color: "var(--danger)", marginTop: 2 }}>
                  {errors.motivo.message}
                </p>
              )}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Checkbox
                id="activo"
                checked={Boolean(activoValue)}
                onCheckedChange={(value) => setValue("activo", Boolean(value))}
              />
              <Label htmlFor="activo" style={{ cursor: "pointer" }}>
                Producto activo
              </Label>
            </div>
          </form>

          <SheetFooter
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              padding: "12px 24px",
              background: "var(--card)",
              borderTop: "1px solid var(--border)",
              display: "flex",
              gap: 8,
              justifyContent: "flex-end",
            }}
          >
            <Button
              variant="outline"
              onClick={() => {
                setProductoOpen(false);
                setProductoMode("create");
                setProductoSeleccionado(null);
              }}
              type="button"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              form="producto-form"
              disabled={isCreating || isUpdating}
              style={{ background: "var(--primary)", color: "var(--primary-fg)" }}
            >
              {productoMode === "edit" ? "Guardar cambios" : "Definir producto"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Dialog open={historialOpen} onOpenChange={setHistorialOpen}>
        <DialogContent style={{ maxWidth: 760 }}>
          <DialogHeader>
            <DialogTitle>Historial del producto</DialogTitle>
          </DialogHeader>
          {historialProducto && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <p style={{ fontSize: 11, color: "var(--muted-fg)", margin: 0 }}>Producto</p>
                  <p style={{ margin: 0, fontWeight: 600 }}>{historialProducto.nombre}</p>
                </div>
                <div>
                  <p style={{ fontSize: 11, color: "var(--muted-fg)", margin: 0 }}>Código</p>
                  <p style={{ margin: 0, fontWeight: 600 }}>{historialProducto.codigo}</p>
                </div>
                <div>
                  <p style={{ fontSize: 11, color: "var(--muted-fg)", margin: 0 }}>Proveedor</p>
                  <p style={{ margin: 0, fontWeight: 600 }}>{historialProducto.proveedor_nombre || "Sin proveedor"}</p>
                </div>
                <div>
                  <p style={{ fontSize: 11, color: "var(--muted-fg)", margin: 0 }}>Stock actual</p>
                  <p style={{ margin: 0, fontWeight: 600 }}>
                    {historialProducto.stock_actual} {historialProducto.unidad}
                  </p>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 360, overflowY: "auto" }}>
                {loadingMovimientos && (
                  <p style={{ margin: 0, fontSize: 12, color: "var(--muted-fg)" }}>
                    Cargando historial...
                  </p>
                )}
                {!loadingMovimientos && errorMovimientos && (
                  <p style={{ margin: 0, fontSize: 12, color: "var(--danger)" }}>
                    No se pudo cargar el historial con tu rol actual.
                  </p>
                )}
                {!loadingMovimientos &&
                  !errorMovimientos &&
                  historialMovimientos.map((movimiento) => (
                    <div
                      key={movimiento.id}
                      style={{
                        border: "1px solid var(--border)",
                        borderRadius: 8,
                        padding: 10,
                        display: "flex",
                        flexDirection: "column",
                        gap: 4,
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                        <span style={{ fontWeight: 600 }}>{prettyTipoMovimiento(movimiento.tipo_accion)}</span>
                        <span style={{ fontSize: 11, color: "var(--muted-fg)" }}>
                          {format(new Date(movimiento.fecha), "dd/MM/yyyy HH:mm:ss", { locale: es })}
                        </span>
                      </div>
                      <span style={{ fontSize: 12 }}>{movimiento.descripcion}</span>
                      <span style={{ fontSize: 11, color: "var(--muted-fg)" }}>
                        Usuario: {movimiento.usuario}
                      </span>
                    </div>
                  ))}
                {!loadingMovimientos && !errorMovimientos && historialMovimientos.length === 0 && (
                  <p style={{ margin: 0, fontSize: 12, color: "var(--muted-fg)" }}>
                    No hay cambios registrados para este producto.
                  </p>
                )}
              </div>
            </div>
          )}
          <DialogFooter style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
            <Button variant="outline" onClick={() => setHistorialOpen(false)}>
              Cerrar
            </Button>
            <Button onClick={exportHistory} disabled={!historialProducto} style={{ background: "var(--primary)", color: "var(--primary-fg)" }}>
              <Download size={14} style={{ marginRight: 4 }} />
              Exportar TXT
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={(open) => {
          setDeleteDialogOpen(open);
          if (!open) setProductoAEliminar(null);
        }}
        title="¿Eliminar producto?"
        description={
          productoAEliminar
            ? `Estás a punto de eliminar "${productoAEliminar.nombre}". Esta acción no se puede deshacer. Si el producto tiene movimientos o registros asociados, no podrá eliminarse.`
            : ""
        }
        onConfirm={() => {
          if (!productoAEliminar) return;

          deleteProducto(productoAEliminar.id, {
            onSuccess: () => {
              if (productoSeleccionado?.id === productoAEliminar.id) {
                setProductoOpen(false);
                setProductoSeleccionado(null);
              }
              if (historialProducto?.id === productoAEliminar.id) {
                setHistorialOpen(false);
                setHistorialProducto(null);
              }
              setDeleteDialogOpen(false);
              setProductoAEliminar(null);
            },
          });
        }}
        loading={isDeleting}
        variant="danger"
        confirmLabel="Sí, eliminar"
      />
    </div>
  );
}
