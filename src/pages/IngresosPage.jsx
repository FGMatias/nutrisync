import { zodResolver } from "@hookform/resolvers/zod";
import { FileText, MoreHorizontal, Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { UNIDADES_MEDIDA } from "../constants/enums";
import DataTable from "../components/shared/DataTable";
import FilterBar from "../components/shared/FilterBar";
import PageHeader from "../components/shared/PageHeader";
import SearchBar from "../components/shared/SearchBar";
import StatusBadge from "../components/shared/StatusBadge";
import TablePagination from "../components/shared/TablePagination";
import ConfirmDialog from "../components/shared/ConfirmDialog";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
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
  SheetDescription,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import { useProveedores } from "../hooks/queries/useProveedores";
import {
  useAccesosVehicularesDisponibles,
  useAnularIngreso,
  useCreateIngreso,
  useGenerarActaIngreso,
  useIngresos,
} from "../hooks/queries/useIngresos";
import { useProductosPorProveedor } from "../hooks/queries/useProductos";
import {
  ingresoFormDefaultValues,
  ingresoSchema,
} from "../schemas/ingreso.schema";
import { useAuth } from "../hooks/queries/useAuth";
import { getActaFirmadaUrl } from "../services/actas.service";
import { buildActaPdf, triggerDownload } from "../utils/actasPdf";

const PAGE_SIZE = 10;

function getUnidadLabel(value) {
  return UNIDADES_MEDIDA.find((unidad) => unidad.value === value)?.label ?? value ?? "";
}

function formatToneladasFromKg(value) {
  const cantidad = Number(value ?? 0);
  if (!Number.isFinite(cantidad)) return "0 t";
  return `${(cantidad / 1000).toFixed(2)} t`;
}

function StepIndicator({ step }) {
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center", paddingBottom: 16 }}>
      {[1, 2].map((s) => (
        <div key={s} style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div
            style={{
              width: 26,
              height: 26,
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 12,
              fontWeight: 600,
              background: s <= step ? "var(--primary)" : "var(--muted)",
              color: s <= step ? "var(--primary-fg)" : "var(--muted-fg)",
            }}
          >
            {s}
          </div>
          <span
            style={{
              fontSize: 12,
              fontWeight: s === step ? 600 : 400,
              color: s === step ? "var(--fg)" : "var(--muted-fg)",
            }}
          >
            {s === 1 ? "Informacion general" : "Productos recibidos"}
          </span>
          {s < 2 && <span style={{ color: "var(--border)", margin: "0 2px" }}>›</span>}
        </div>
      ))}
    </div>
  );
}

export default function IngresosPage() {
  const [search, setSearch] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("todos");
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  const [page, setPage] = useState(1);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerStep, setDrawerStep] = useState(1);
  const [detalleIngreso, setDetalleIngreso] = useState(null);
  const [ingresoAAnular, setIngresoAAnular] = useState(null);
  const [actaDialog, setActaDialog] = useState({
    open: false,
    status: "idle",
    ingreso: null,
    downloadUrl: "",
    fileName: "",
    error: "",
  });

  const { data: ingresos = [], isLoading } = useIngresos();
  const { data: proveedoresData } = useProveedores({
    page: 1,
    pageSize: 1000,
    activo: true,
  });

  const {
    control,
    register,
    handleSubmit,
    reset,
    setValue,
    trigger,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(ingresoSchema),
    defaultValues: ingresoFormDefaultValues,
    mode: "onTouched",
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "items",
  });

  const proveedorId = useWatch({ control, name: "proveedor_id" });
  const accesoVehicularId = useWatch({ control, name: "id_acceso_vehicular" });
  const itemsValues = useWatch({ control, name: "items" }) ?? [];
  const { data: productosProveedor = [], isLoading: loadingProductos } =
    useProductosPorProveedor(proveedorId);
  const { data: accesosVehiculares = [] } = useAccesosVehicularesDisponibles(proveedorId);
  const { mutate: createIngreso, isPending: isSaving } = useCreateIngreso();
  const { mutate: anularIngreso, isPending: isAnulando } = useAnularIngreso();
  const { mutateAsync: generarActaIngreso } = useGenerarActaIngreso();
  const { perfil } = useAuth();
  const perfilNombre = perfil?.nombre_completo;

  const proveedores = proveedoresData?.data ?? [];
  const activeFilters =
    (filtroEstado !== "todos" ? 1 : 0) +
    (fechaDesde ? 1 : 0) +
    (fechaHasta ? 1 : 0);

  useEffect(() => {
    if (!drawerOpen) return;
    reset(ingresoFormDefaultValues);
  }, [drawerOpen, reset]);

  const accesosVehicularesFiltrados = useMemo(() => accesosVehiculares, [accesosVehiculares]);

  useEffect(() => {
    if (!accesoVehicularId || accesoVehicularId === "none") return;
    const stillValid = accesosVehicularesFiltrados.some(
      (item) => String(item.value) === String(accesoVehicularId),
    );
    if (!stillValid) {
      setValue("id_acceso_vehicular", "", { shouldValidate: true });
    }
  }, [accesoVehicularId, accesosVehicularesFiltrados, setValue]);

  const filteredIngresos = useMemo(() => {
    const searchText = search.trim().toLowerCase();

    return ingresos.filter((ingreso) => {
      const matchesSearch =
        !searchText ||
        [
          ingreso.codigo_ingreso,
          ingreso.proveedor_nombre,
          ingreso.observaciones,
          ingreso.id,
          ingreso.detalle?.map((d) => d.producto).join(" "),
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(searchText));

      const matchesEstado =
        filtroEstado === "todos" || ingreso.estado === filtroEstado;

      const fechaIngreso = new Date(ingreso.fecha);
      const matchesFechaDesde =
        !fechaDesde || fechaIngreso >= new Date(`${fechaDesde}T00:00:00`);
      const matchesFechaHasta =
        !fechaHasta || fechaIngreso <= new Date(`${fechaHasta}T23:59:59`);

      return matchesSearch && matchesEstado && matchesFechaDesde && matchesFechaHasta;
    });
  }, [ingresos, search, filtroEstado, fechaDesde, fechaHasta]);

  const safePage = Math.min(page, Math.max(1, Math.ceil(filteredIngresos.length / PAGE_SIZE)));
  const paginatedIngresos = filteredIngresos.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  );

  const columns = [
    {
      key: "codigo_ingreso",
      header: "Código ingreso",
      width: 130,
      render: (v) => <span style={{ fontFamily: "monospace", fontSize: 12 }}>{v}</span>,
    },
    {
      key: "proveedor_nombre",
      header: "Proveedor",
      render: (v) => <span style={{ fontWeight: 500 }}>{v}</span>,
    },
    {
      key: "fecha",
      header: "Fecha",
      render: (v) => format(new Date(v), "dd/MM/yyyy HH:mm", { locale: es }),
    },
    {
      key: "detalle",
      header: "Productos",
      render: (v) => (
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <span style={{ fontSize: 12, color: "var(--fg)" }}>
            {v.slice(0, 2).map((d) => d.producto).join(", ")}
            {v.length > 2 ? ` +${v.length - 2} mas` : ""}
          </span>
          <span style={{ fontSize: 11, color: "var(--muted-fg)" }}>
            Lotes: {v.slice(0, 3).map((d) => d.lote).join(", ")}
            {v.length > 3 ? "..." : ""}
          </span>
        </div>
      ),
    },
    {
      key: "peso_total_kg",
      header: "Peso Total",
      render: (v) => <span style={{ fontWeight: 600 }}>{v} kg</span>,
    },
    {
      key: "estado",
      header: "Estado",
      render: (v) => <StatusBadge status={v} />,
    },
    {
      key: "discrepancias",
      header: "Discrepancias",
      align: "center",
      render: (v) =>
        v > 0 ? (
          <Badge
            style={{
              background: "var(--danger-bg)",
              color: "var(--danger)",
              border: "none",
              fontSize: 11,
            }}
          >
            {v}
          </Badge>
        ) : (
          <span style={{ color: "var(--muted-fg)" }}>—</span>
        ),
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
              onClick={() => setDetalleIngreso(row)}
              style={{ cursor: "pointer" }}
            >
              <FileText size={13} className="mr-2" /> Ver detalle
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                handleGenerarActa(row);
              }}
              style={{ cursor: "pointer" }}
              disabled={isGeneratingActa}
            >
              <FileText size={13} className="mr-2" />
              {generatingIngresoId === row.id ? "Generando acta..." : "Acta"}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => setIngresoAAnular(row)}
              style={{ color: "var(--danger)", cursor: "pointer" }}
              disabled={row.estado === "anulado"}
            >
              <Trash2 size={13} className="mr-2" />{" "}
              {row.estado === "anulado" ? "Anulado" : "Anular"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  const onSubmit = (values) => {
    createIngreso(
      {
        proveedor_id: Number(values.proveedor_id),
        fecha: values.fecha,
        id_acceso_vehicular: values.id_acceso_vehicular
          ? Number(values.id_acceso_vehicular)
          : null,
        observaciones: values.observaciones,
        items: values.items.map((item) => ({
          ...item,
          id_producto: Number(item.id_producto),
          unidad_medida: item.unidad_medida,
          cantidad: Number(item.cantidad),
          peso_kg: Number(item.peso_kg),
          fecha_vencimiento: item.fecha_vencimiento || null,
        })),
      },
      {
        onSuccess: () => {
          setDrawerOpen(false);
          setDrawerStep(1);
          reset(ingresoFormDefaultValues);
        },
      },
    );
  };

  const triggerStepOne = async () => {
    const isValid = await trigger([
      "proveedor_id",
      "fecha",
      "id_acceso_vehicular",
      "observaciones",
    ]);
    if (isValid) setDrawerStep(2);
  };

  const getItemError = (index, field) => errors.items?.[index]?.[field]?.message;

  const isGeneratingActa = actaDialog.open && actaDialog.status === "generando";
  const generatingIngresoId = isGeneratingActa ? actaDialog.ingreso?.id : null;

  async function handleGenerarActa(ingreso) {
    if (!ingreso || isGeneratingActa) return;
    const fileName = `acta-${ingreso.codigo_ingreso ?? ingreso.id}.pdf`;
    try {
      setActaDialog({
        open: true,
        status: "generando",
        ingreso,
        downloadUrl: "",
        fileName,
        error: "",
      });
      const pdfBlob = buildActaPdf(ingreso, perfilNombre);
      const acta = await generarActaIngreso({
        ingresoId: ingreso.id,
        codigoIngreso: ingreso.codigo_ingreso,
        pdfBlob,
      });
      const signedUrl = await getActaFirmadaUrl(acta.ruta_pdf);
      setActaDialog({
        open: true,
        status: "generada",
        ingreso,
        downloadUrl: signedUrl,
        fileName,
        error: "",
      });
    } catch (error) {
      setActaDialog({
        open: true,
        status: "error",
        ingreso,
        downloadUrl: "",
        fileName,
        error: error.message ?? "No se pudo generar el acta",
      });
    }
  }

  function handleDescargarActa() {
    if (!actaDialog.downloadUrl) return;
    triggerDownload(actaDialog.downloadUrl, actaDialog.fileName || "acta-recepcion.pdf");
  }

  return (
    <div>
      <PageHeader
        title="Ingreso de Productos"
        subtitle="Registro de recepciones del PAE"
        actions={
          <Button
            onClick={() => {
              setDrawerStep(1);
              setDrawerOpen(true);
            }}
            style={{ background: "var(--primary)", color: "var(--primary-fg)" }}
          >
            <Plus size={15} style={{ marginRight: 4 }} /> Registrar Ingreso
          </Button>
        }
      />

      <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
        <SearchBar value={search} onChange={setSearch} placeholder="Buscar por proveedor o lote..." />
        <FilterBar
          activeCount={activeFilters}
          onClear={() => {
            setFiltroEstado("todos");
            setFechaDesde("");
            setFechaHasta("");
          }}
        >
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
          <Select value={filtroEstado} onValueChange={setFiltroEstado}>
            <SelectTrigger style={{ width: 160, height: 36 }}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos los estados</SelectItem>
              <SelectItem value="registrado">Registrado</SelectItem>
              <SelectItem value="conforme">Conforme</SelectItem>
              <SelectItem value="con_discrepancia">Con Discrepancia</SelectItem>
              <SelectItem value="anulado">Anulado</SelectItem>
            </SelectContent>
          </Select>
        </FilterBar>
      </div>

      <DataTable
        columns={columns}
        data={paginatedIngresos}
        loading={isLoading}
        emptyMessage="No se encontraron ingresos"
      />
      <TablePagination
        page={safePage}
        totalPages={Math.max(1, Math.ceil(filteredIngresos.length / PAGE_SIZE))}
        total={filteredIngresos.length}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
      />

      <Sheet
        open={drawerOpen}
        onOpenChange={(open) => {
          setDrawerOpen(open);
          if (!open) {
            setDrawerStep(1);
            reset(ingresoFormDefaultValues);
          }
        }}
      >
        <SheetContent style={{ width: 520, maxWidth: "95vw", overflowY: "auto" }}>
          <SheetHeader>
            <SheetTitle>Registrar Ingreso</SheetTitle>
            <SheetDescription>Complete los datos de la recepcion</SheetDescription>
          </SheetHeader>
          <form
            id="ingreso-form"
            onSubmit={handleSubmit(onSubmit)}
            style={{ padding: "24px 0 80px" }}
          >
            <StepIndicator step={drawerStep} />
            {drawerStep === 1 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div>
                  <Label>Proveedor *</Label>
                  <Select
                    value={proveedorId}
                    onValueChange={(value) => {
                      setValue("proveedor_id", value, { shouldValidate: true });
                    }}
                  >
                    <SelectTrigger style={{ marginTop: 4 }}>
                      <SelectValue placeholder="Seleccionar proveedor..." />
                    </SelectTrigger>
                    <SelectContent>
                      {proveedores.map((p) => (
                        <SelectItem key={p.id} value={String(p.id)}>
                          {p.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.proveedor_id && (
                    <p style={{ fontSize: 11, color: "var(--danger)", marginTop: 2 }}>
                      {errors.proveedor_id.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label>Fecha de recepcion *</Label>
                  <Input type="date" {...register("fecha")} style={{ marginTop: 4 }} />
                  {errors.fecha && (
                    <p style={{ fontSize: 11, color: "var(--danger)", marginTop: 2 }}>
                      {errors.fecha.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label>Acceso vehicular (opcional)</Label>
                  <Select
                    value={accesoVehicularId}
                    onValueChange={(value) =>
                      setValue("id_acceso_vehicular", value === "none" ? "" : value, {
                        shouldValidate: true,
                      })
                    }
                    disabled={!proveedorId}
                  >
                    <SelectTrigger style={{ marginTop: 4 }}>
                      <SelectValue
                        placeholder={
                          proveedorId
                            ? "Vincular ingreso vehicular..."
                            : "Selecciona primero un proveedor..."
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sin vincular</SelectItem>
                      {accesosVehicularesFiltrados.map((item) => (
                        <SelectItem key={item.id} value={item.value}>
                          {item.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Observaciones</Label>
                  <textarea
                    {...register("observaciones")}
                    placeholder="Notas adicionales..."
                    style={{
                      marginTop: 4,
                      width: "100%",
                      minHeight: 80,
                      padding: "8px 12px",
                      border: "1px solid var(--border)",
                      borderRadius: 6,
                      fontSize: 13,
                      resize: "vertical",
                      background: "transparent",
                      color: "var(--fg)",
                    }}
                  />
                  {errors.observaciones && (
                    <p style={{ fontSize: 11, color: "var(--danger)", marginTop: 2 }}>
                      {errors.observaciones.message}
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {fields.map((field, index) => {
                  const selectedProducto = productosProveedor.find(
                    (item) => String(item.id) === String(itemsValues?.[index]?.id_producto),
                  );
                  const unidadPeso =
                    itemsValues?.[index]?.unidad_medida ||
                    selectedProducto?.unidad_medida ||
                    "kg";
                  const unidadPesoLabel = getUnidadLabel(unidadPeso);

                  return (
                    <div
                      key={field.id}
                      style={{ border: "1px solid var(--border)", borderRadius: 8, padding: 12 }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          marginBottom: 8,
                        }}
                      >
                        <span style={{ fontSize: 12, fontWeight: 600 }}>
                          Producto {index + 1}
                        </span>
                        {fields.length > 1 && (
                          <button
                            type="button"
                            style={{
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                              color: "var(--danger)",
                              fontSize: 12,
                            }}
                            onClick={() => remove(index)}
                          >
                            ✕
                          </button>
                        )}
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                        <div>
                          <Label style={{ fontSize: 11 }}>Producto</Label>
                          <Select
                            value={itemsValues?.[index]?.id_producto ?? ""}
                            onValueChange={(value) =>
                              {
                                const producto = productosProveedor.find(
                                  (item) => String(item.id) === String(value),
                                );
                                setValue(`items.${index}.id_producto`, value, {
                                  shouldValidate: true,
                                });
                                setValue(
                                  `items.${index}.unidad_medida`,
                                  producto?.unidad_medida ?? "kg",
                                  {
                                    shouldValidate: true,
                                  },
                                );
                              }
                            }
                            disabled={!proveedorId || loadingProductos}
                          >
                            <SelectTrigger style={{ marginTop: 2, height: 32 }}>
                              <SelectValue placeholder="Seleccionar..." />
                            </SelectTrigger>
                            <SelectContent>
                              {productosProveedor.map((item) => (
                                <SelectItem key={item.id} value={String(item.id)}>
                                  {item.nombre}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {selectedProducto && (
                            <p style={{ fontSize: 11, color: "var(--muted-fg)", marginTop: 2 }}>
                              Unidad del producto: {getUnidadLabel(selectedProducto?.unidad_medida)}
                            </p>
                          )}
                          {getItemError(index, "id_producto") && (
                            <p style={{ fontSize: 11, color: "var(--danger)", marginTop: 2 }}>
                              {getItemError(index, "id_producto")}
                            </p>
                          )}
                        </div>
                        <div>
                          <Label style={{ fontSize: 11 }}>Numero de lote</Label>
                          <Input
                            {...register(`items.${index}.lote`)}
                            placeholder="LOTE-001"
                            style={{ marginTop: 2, height: 32 }}
                          />
                          {getItemError(index, "lote") && (
                            <p style={{ fontSize: 11, color: "var(--danger)", marginTop: 2 }}>
                              {getItemError(index, "lote")}
                            </p>
                          )}
                        </div>
                        <div>
                          <Label style={{ fontSize: 11 }}>Cantidad</Label>
                          <Input
                            {...register(`items.${index}.cantidad`)}
                            type="number"
                            placeholder="0"
                            style={{ marginTop: 2, height: 32 }}
                          />
                          {getItemError(index, "cantidad") && (
                            <p style={{ fontSize: 11, color: "var(--danger)", marginTop: 2 }}>
                              {getItemError(index, "cantidad")}
                            </p>
                          )}
                        </div>
                        <div>
                          <Label style={{ fontSize: 11 }}>Unidad de medida</Label>
                          <Select
                            value={itemsValues?.[index]?.unidad_medida ?? ""}
                            onValueChange={(value) =>
                              setValue(`items.${index}.unidad_medida`, value, {
                                shouldValidate: true,
                              })
                            }
                            disabled={!itemsValues?.[index]?.id_producto}
                          >
                            <SelectTrigger style={{ marginTop: 2, height: 32 }}>
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
                          {getItemError(index, "unidad_medida") && (
                            <p style={{ fontSize: 11, color: "var(--danger)", marginTop: 2 }}>
                              {getItemError(index, "unidad_medida")}
                            </p>
                          )}
                        </div>
                        <div>
                          <Label style={{ fontSize: 11 }}>Peso (kg)</Label>
                          <Input
                            {...register(`items.${index}.peso_kg`)}
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            style={{ marginTop: 2, height: 32 }}
                          />
                          {getItemError(index, "peso_kg") && (
                            <p style={{ fontSize: 11, color: "var(--danger)", marginTop: 2 }}>
                              {getItemError(index, "peso_kg")}
                            </p>
                          )}
                        </div>
                        <div>
                          <Label style={{ fontSize: 11 }}>Fecha de vencimiento</Label>
                          <Input
                            {...register(`items.${index}.fecha_vencimiento`)}
                            type="date"
                            style={{ marginTop: 2, height: 32 }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    append({
                      id_producto: "",
                      unidad_medida: "",
                      lote: "",
                      cantidad: "",
                      peso_kg: "",
                      fecha_vencimiento: "",
                    })
                  }
                >
                  + Agregar producto
                </Button>
              </div>
            )}
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
              justifyContent: "space-between",
            }}
          >
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                if (drawerStep === 1) setDrawerOpen(false);
                else setDrawerStep(1);
              }}
            >
              {drawerStep === 1 ? "Cancelar" : "← Anterior"}
            </Button>
            <Button
              type={drawerStep === 1 ? "button" : "submit"}
              form={drawerStep === 2 ? "ingreso-form" : undefined}
              onClick={drawerStep === 1 ? triggerStepOne : undefined}
              disabled={isSaving}
              style={{ background: "var(--primary)", color: "var(--primary-fg)" }}
            >
              {drawerStep === 1 ? "Siguiente →" : "Registrar ingreso"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Dialog open={!!detalleIngreso} onOpenChange={() => setDetalleIngreso(null)}>
        <DialogContent style={{ maxWidth: 640 }}>
          <DialogHeader>
            <DialogTitle>Detalle del ingreso</DialogTitle>
          </DialogHeader>
          {detalleIngreso && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <p style={{ fontSize: 11, color: "var(--muted-fg)", margin: 0 }}>
                    Código ingreso
                  </p>
                  <p style={{ margin: 0, fontWeight: 600, fontFamily: "monospace" }}>
                    {detalleIngreso.codigo_ingreso}
                  </p>
                </div>
                <div>
                  <p style={{ fontSize: 11, color: "var(--muted-fg)", margin: 0 }}>Proveedor</p>
                  <p style={{ margin: 0, fontWeight: 600 }}>{detalleIngreso.proveedor_nombre}</p>
                </div>
                <div>
                  <p style={{ fontSize: 11, color: "var(--muted-fg)", margin: 0 }}>Fecha</p>
                  <p style={{ margin: 0, fontWeight: 600 }}>
                    {format(new Date(detalleIngreso.fecha), "dd/MM/yyyy HH:mm", { locale: es })}
                  </p>
                </div>
                <div>
                  <p style={{ fontSize: 11, color: "var(--muted-fg)", margin: 0 }}>Estado</p>
                  <StatusBadge status={detalleIngreso.estado} />
                </div>
                <div>
                  <p style={{ fontSize: 11, color: "var(--muted-fg)", margin: 0 }}>Peso total</p>
                  <p style={{ margin: 0, fontWeight: 600 }}>
                    {detalleIngreso.peso_total_kg} kg ({formatToneladasFromKg(detalleIngreso.peso_total_kg)})
                  </p>
                </div>
              </div>

              <div>
                <p style={{ fontSize: 11, color: "var(--muted-fg)", marginBottom: 8 }}>Productos</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {detalleIngreso.detalle.map((item) => (
                    <div
                      key={item.id}
                      style={{
                        border: "1px solid var(--border)",
                        borderRadius: 8,
                        padding: 10,
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 12,
                      }}
                    >
                      <div>
                        <p style={{ margin: 0, fontWeight: 600 }}>{item.producto}</p>
                        <p style={{ margin: 0, fontSize: 11, color: "var(--muted-fg)" }}>
                          Lote {item.lote}
                        </p>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <p style={{ margin: 0, fontWeight: 600 }}>{item.cantidad}</p>
                        <p style={{ margin: 0, fontSize: 11, color: "var(--muted-fg)" }}>
                          {item.peso_kg} kg ({formatToneladasFromKg(item.peso_kg)})
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {detalleIngreso.observaciones && (
                <div>
                  <p style={{ fontSize: 11, color: "var(--muted-fg)", marginBottom: 4 }}>
                    Observaciones
                  </p>
                  <p style={{ margin: 0 }}>{detalleIngreso.observaciones}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetalleIngreso(null)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={actaDialog.open}
        onOpenChange={(open) => {
          if (!open) {
            setActaDialog({
              open: false,
              status: "idle",
              ingreso: null,
              downloadUrl: "",
              fileName: "",
              error: "",
            });
          }
        }}
      >
        <DialogContent style={{ maxWidth: 460 }}>
          <DialogHeader>
            <DialogTitle>Generacion de acta</DialogTitle>
          </DialogHeader>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, fontSize: 13 }}>
            <p style={{ margin: 0 }}>
              Ingreso:{" "}
              <strong style={{ fontFamily: "monospace" }}>
                {actaDialog.ingreso?.codigo_ingreso ?? "-"}
              </strong>
            </p>

            {actaDialog.status === "generando" && (
              <div
                style={{
                  padding: 12,
                  borderRadius: 8,
                  border: "1px solid var(--warning)",
                  background: "var(--warning-bg)",
                  color: "var(--warning)",
                  fontWeight: 600,
                }}
              >
                Generando acta...
              </div>
            )}

            {actaDialog.status === "generada" && (
              <div
                style={{
                  padding: 12,
                  borderRadius: 8,
                  border: "1px solid var(--success)",
                  background: "var(--success-bg)",
                  color: "var(--success)",
                  fontWeight: 600,
                }}
              >
                Acta generada correctamente.
              </div>
            )}

            {actaDialog.status === "error" && (
              <div
                style={{
                  padding: 12,
                  borderRadius: 8,
                  border: "1px solid var(--danger)",
                  background: "var(--danger-bg)",
                  color: "var(--danger)",
                  fontWeight: 600,
                }}
              >
                {actaDialog.error || "No se pudo generar el acta."}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() =>
                setActaDialog({
                  open: false,
                  status: "idle",
                  ingreso: null,
                  downloadUrl: "",
                  fileName: "",
                  error: "",
                })
              }
            >
              Cerrar
            </Button>
            <Button
              onClick={handleDescargarActa}
              disabled={actaDialog.status !== "generada" || !actaDialog.downloadUrl}
              style={{ background: "var(--primary)", color: "var(--primary-fg)" }}
            >
              Descargar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!ingresoAAnular}
        onOpenChange={(open) => {
          if (!open) setIngresoAAnular(null);
        }}
        title="¿Anular ingreso?"
        description={
          ingresoAAnular
            ? `Estás a punto de anular el ingreso ${ingresoAAnular.codigo_ingreso}. El registro se mantendrá, pero el stock asociado se recalculará y se descontará de inventario.`
            : ""
        }
        onConfirm={() => {
          if (!ingresoAAnular) return;
          anularIngreso(ingresoAAnular.id, {
            onSuccess: () => setIngresoAAnular(null),
          });
        }}
        loading={isAnulando}
        variant="danger"
        confirmLabel="Anular"
      />
    </div>
  );
}
