import { useMemo, useState } from "react";
import { Download, Eye, Plus } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import DataTable from "../components/shared/DataTable";
import FilterBar from "../components/shared/FilterBar";
import PageHeader from "../components/shared/PageHeader";
import SearchBar from "../components/shared/SearchBar";
import TablePagination from "../components/shared/TablePagination";
import { Badge } from "../components/ui/badge";
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
import { useIngresos } from "../hooks/queries/useIngresos";
import {
  useAnularDiscrepancia,
  useCrearDiscrepancia,
  useDiscrepancias,
  useResolverDiscrepancia,
} from "../hooks/queries/useDiscrepancias";
import { getDiscrepanciaEvidenciaUrl } from "../services/discrepancias.service";

const PAGE_SIZE = 10;

function formatCantidad(value) {
  const number = Number(value ?? 0);
  if (!Number.isFinite(number)) return "0";
  return new Intl.NumberFormat("es-PE", { maximumFractionDigits: 2 }).format(number);
}

function formatCantidadUnidad(value, unidad) {
  return `${formatCantidad(value)} ${unidad || ""}`.trim();
}

function StatusDiscrepancia({ status }) {
  if (status === "resuelta") {
    return (
      <span
        style={{
          fontSize: 11,
          fontWeight: 600,
          background: "var(--success-bg)",
          color: "var(--success)",
          padding: "2px 8px",
          borderRadius: 4,
        }}
      >
        Resuelta
      </span>
    );
  }

  if (status === "anulada") {
    return (
      <span
        style={{
          fontSize: 11,
          fontWeight: 600,
          background: "var(--muted)",
          color: "var(--muted-fg)",
          padding: "2px 8px",
          borderRadius: 4,
        }}
      >
        Anulada
      </span>
    );
  }

  return (
    <span
      style={{
        fontSize: 11,
        fontWeight: 600,
        background: "var(--warning-bg)",
        color: "var(--warning)",
        padding: "2px 8px",
        borderRadius: 4,
      }}
    >
      Registrada
    </span>
  );
}

export default function DiscrepanciasPage() {
  const [search, setSearch] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("todos");
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  const [page, setPage] = useState(1);

  const [createOpen, setCreateOpen] = useState(false);
  const [createIngresoId, setCreateIngresoId] = useState("");
  const [createDetalleId, setCreateDetalleId] = useState("");
  const [createRecibido, setCreateRecibido] = useState("");
  const [createObs, setCreateObs] = useState("");
  const [createFiles, setCreateFiles] = useState([]);

  const [detailDialog, setDetailDialog] = useState(null);

  const [resolveDialog, setResolveDialog] = useState(null);
  const [resolveCantidad, setResolveCantidad] = useState("");
  const [resolveMotivo, setResolveMotivo] = useState("");
  const [resolveFiles, setResolveFiles] = useState([]);

  const [anularDialog, setAnularDialog] = useState(null);
  const [anularMotivo, setAnularMotivo] = useState("");
  const [anularFiles, setAnularFiles] = useState([]);

  const [loadingEvidenciaPath, setLoadingEvidenciaPath] = useState("");

  const { data: discrepancias = [], isLoading } = useDiscrepancias();
  const { data: ingresos = [] } = useIngresos();
  const { mutateAsync: crearDiscrepancia, isPending: creandoDiscrepancia } = useCrearDiscrepancia();
  const { mutateAsync: resolverDiscrepancia, isPending: resolviendoDiscrepancia } =
    useResolverDiscrepancia();
  const { mutateAsync: anularDiscrepancia, isPending: anulandoDiscrepancia } = useAnularDiscrepancia();

  const ingresosElegibles = useMemo(
    () => ingresos.filter((ingreso) => ingreso.estado !== "anulado"),
    [ingresos],
  );

  const ingresoSeleccionado = useMemo(
    () => ingresosElegibles.find((ingreso) => String(ingreso.id) === String(createIngresoId)),
    [ingresosElegibles, createIngresoId],
  );

  const detalleSeleccionado = useMemo(
    () =>
      ingresoSeleccionado?.detalle?.find(
        (item) => String(item.id) === String(createDetalleId),
      ) ?? null,
    [ingresoSeleccionado, createDetalleId],
  );

  const sinResolver = discrepancias.filter((d) => d.estado === "registrada").length;

  const filteredDiscrepancias = useMemo(() => {
    const searchText = search.trim().toLowerCase();

    return discrepancias.filter((row) => {
      const matchesSearch =
        !searchText ||
        [row.codigo_ingreso, row.producto, row.lote, row.proveedor, row.observaciones]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(searchText));

      const matchesEstado = filtroEstado === "todos" || row.estado === filtroEstado;

      const fecha = new Date(row.fecha);
      const matchesDesde = !fechaDesde || fecha >= new Date(`${fechaDesde}T00:00:00`);
      const matchesHasta = !fechaHasta || fecha <= new Date(`${fechaHasta}T23:59:59`);

      return matchesSearch && matchesEstado && matchesDesde && matchesHasta;
    });
  }, [discrepancias, search, filtroEstado, fechaDesde, fechaHasta]);

  const safePage = Math.min(page, Math.max(1, Math.ceil(filteredDiscrepancias.length / PAGE_SIZE)));
  const paginated = filteredDiscrepancias.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  );

  const columns = [
    {
      key: "codigo_ingreso",
      header: "# Ingreso",
      width: 120,
      render: (value) => <span style={{ fontFamily: "monospace", fontSize: 12 }}>{value}</span>,
    },
    {
      key: "producto",
      header: "Producto",
      render: (value) => <span style={{ fontWeight: 500 }}>{value}</span>,
    },
    {
      key: "lote",
      header: "Lote",
      render: (value) => <span style={{ fontFamily: "monospace", fontSize: 11 }}>{value}</span>,
    },
    {
      key: "esperado",
      header: "Esperado",
      render: (value, row) => formatCantidadUnidad(value, row.unidad),
    },
    {
      key: "recibido",
      header: "Recibido",
      render: (value, row) => formatCantidadUnidad(value, row.unidad),
    },
    {
      key: "diferencia",
      header: "Diferencia",
      render: (value, row) =>
        value < 0 ? (
          <span style={{ fontWeight: 600, color: "var(--danger)" }}>
            -{formatCantidad(Math.abs(value))} {row.unidad}
          </span>
        ) : value > 0 ? (
          <span style={{ fontWeight: 600, color: "var(--success)" }}>
            +{formatCantidad(value)} {row.unidad}
          </span>
        ) : (
          <span style={{ color: "var(--muted-fg)" }}>0</span>
        ),
    },
    {
      key: "estado",
      header: "Estado",
      render: (value) => <StatusDiscrepancia status={value} />,
    },
    {
      key: "fecha",
      header: "Fecha",
      render: (value) => format(new Date(value), "dd/MM/yyyy", { locale: es }),
    },
    {
      key: "acciones",
      header: "Acciones",
      align: "center",
      width: 240,
      render: (_, row) => (
        <div style={{ display: "flex", justifyContent: "center", gap: 4 }}>
          <Button variant="ghost" size="sm" onClick={() => setDetailDialog(row)}>
            <Eye size={13} style={{ marginRight: 4 }} /> Ver
          </Button>
          {row.estado === "registrada" && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setResolveDialog(row);
                setResolveCantidad(String(row.esperado));
                setResolveMotivo("");
                setResolveFiles([]);
              }}
            >
              Resolver
            </Button>
          )}
          {row.estado !== "anulada" && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setAnularDialog(row);
                setAnularMotivo("");
                setAnularFiles([]);
              }}
              style={{ color: "var(--danger)" }}
            >
              Anular
            </Button>
          )}
        </div>
      ),
    },
  ];

  const openCreateDialog = () => {
    const firstIngreso = ingresosElegibles[0];
    const firstDetalle = firstIngreso?.detalle?.[0];

    setCreateIngresoId(firstIngreso ? String(firstIngreso.id) : "");
    setCreateDetalleId(firstDetalle ? String(firstDetalle.id) : "");
    setCreateRecibido(firstDetalle ? String(firstDetalle.cantidad) : "");
    setCreateObs("");
    setCreateFiles([]);
    setCreateOpen(true);
  };

  const handleIngresoChange = (value) => {
    setCreateIngresoId(value);
    const ingreso = ingresosElegibles.find((item) => String(item.id) === String(value));
    const detalle = ingreso?.detalle?.[0];
    setCreateDetalleId(detalle ? String(detalle.id) : "");
    setCreateRecibido(detalle ? String(detalle.cantidad) : "");
  };

  const handleDetalleChange = (value) => {
    setCreateDetalleId(value);
    const detalle = ingresoSeleccionado?.detalle?.find((item) => String(item.id) === String(value));
    setCreateRecibido(detalle ? String(detalle.cantidad) : "");
  };

  const onSubmitCreate = async () => {
    if (!createIngresoId || !createDetalleId) return;

    await crearDiscrepancia({
      ingreso_id: Number(createIngresoId),
      id_detalle_ingreso: Number(createDetalleId),
      cantidad_recibida: Number(createRecibido),
      observaciones: createObs,
      evidencias: createFiles,
    });

    setCreateOpen(false);
  };

  const onSubmitResolver = async () => {
    if (!resolveDialog) return;

    await resolverDiscrepancia({
      id_discrepancia: resolveDialog.id,
      id_detalle_ingreso: resolveDialog.id_detalle_ingreso,
      ingreso_id: resolveDialog.ingreso_id,
      cantidad_final: Number(resolveCantidad),
      motivo: resolveMotivo,
      evidencias: resolveFiles,
    });

    setResolveDialog(null);
  };

  const onSubmitAnular = async () => {
    if (!anularDialog) return;

    await anularDiscrepancia({
      id_discrepancia: anularDialog.id,
      id_detalle_ingreso: anularDialog.id_detalle_ingreso,
      ingreso_id: anularDialog.ingreso_id,
      motivo: anularMotivo,
      evidencias: anularFiles,
    });

    setAnularDialog(null);
  };

  const downloadEvidencia = async (evidencia) => {
    const path = evidencia?.path;
    if (!path) return;

    try {
      setLoadingEvidenciaPath(path);
      const url = await getDiscrepanciaEvidenciaUrl(path);
      const link = document.createElement("a");
      link.href = url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.download = evidencia.name || "evidencia";
      document.body.appendChild(link);
      link.click();
      link.remove();
    } finally {
      setLoadingEvidenciaPath("");
    }
  };

  return (
    <div>
      <PageHeader
        title="Discrepancias"
        subtitle="Diferencias en recepciones de productos"
        actions={
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Badge
              style={{
                background: "var(--warning-bg)",
                color: "var(--warning)",
                border: "none",
                padding: "6px 12px",
                fontSize: 12,
              }}
            >
              {sinResolver} sin resolver
            </Badge>
            <Button onClick={openCreateDialog} style={{ background: "var(--primary)", color: "var(--primary-fg)" }}>
              <Plus size={14} style={{ marginRight: 4 }} /> Generar discrepancia
            </Button>
          </div>
        }
      />

      <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
        <SearchBar value={search} onChange={setSearch} placeholder="Buscar por ingreso o producto..." />
        <FilterBar
          activeCount={(filtroEstado !== "todos" ? 1 : 0) + (fechaDesde ? 1 : 0) + (fechaHasta ? 1 : 0)}
          onClear={() => {
            setFiltroEstado("todos");
            setFechaDesde("");
            setFechaHasta("");
          }}
        >
          <Input
            type="date"
            value={fechaDesde}
            onChange={(event) => setFechaDesde(event.target.value)}
            style={{ width: 160, height: 36, fontSize: 13 }}
          />
          <Input
            type="date"
            value={fechaHasta}
            onChange={(event) => setFechaHasta(event.target.value)}
            style={{ width: 160, height: 36, fontSize: 13 }}
          />
          <Select value={filtroEstado} onValueChange={setFiltroEstado}>
            <SelectTrigger style={{ width: 160, height: 36 }}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos los estados</SelectItem>
              <SelectItem value="registrada">Registrada</SelectItem>
              <SelectItem value="resuelta">Resuelta</SelectItem>
              <SelectItem value="anulada">Anulada</SelectItem>
            </SelectContent>
          </Select>
        </FilterBar>
      </div>

      <DataTable columns={columns} data={paginated} loading={isLoading} emptyMessage="No hay discrepancias registradas" />
      <TablePagination
        page={safePage}
        totalPages={Math.max(1, Math.ceil(filteredDiscrepancias.length / PAGE_SIZE))}
        total={filteredDiscrepancias.length}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
      />

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent style={{ maxWidth: 560 }}>
          <DialogHeader>
            <DialogTitle>Generar discrepancia</DialogTitle>
          </DialogHeader>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600 }}>Ingreso *</label>
              <Select value={createIngresoId} onValueChange={handleIngresoChange}>
                <SelectTrigger style={{ marginTop: 4 }}>
                  <SelectValue placeholder="Seleccionar ingreso..." />
                </SelectTrigger>
                <SelectContent>
                  {ingresosElegibles.map((ingreso) => (
                    <SelectItem key={ingreso.id} value={String(ingreso.id)}>
                      {ingreso.codigo_ingreso} - {ingreso.proveedor_nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 600 }}>Producto / Lote *</label>
              <Select value={createDetalleId} onValueChange={handleDetalleChange}>
                <SelectTrigger style={{ marginTop: 4 }}>
                  <SelectValue placeholder="Seleccionar detalle..." />
                </SelectTrigger>
                <SelectContent>
                  {(ingresoSeleccionado?.detalle ?? []).map((detalle) => (
                    <SelectItem key={detalle.id} value={String(detalle.id)}>
                      {detalle.producto} - lote {detalle.lote}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600 }}>Cantidad esperada</label>
                <Input
                  disabled
                  value={detalleSeleccionado ? formatCantidad(detalleSeleccionado.cantidad) : ""}
                  style={{ marginTop: 4 }}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600 }}>Cantidad recibida *</label>
                <Input
                  type="number"
                  min="0"
                  step="1"
                  value={createRecibido}
                  onChange={(event) => setCreateRecibido(event.target.value)}
                  style={{ marginTop: 4 }}
                />
              </div>
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 600 }}>Motivo / observaciones</label>
              <textarea
                value={createObs}
                onChange={(event) => setCreateObs(event.target.value)}
                placeholder="Explica la discrepancia detectada..."
                style={{
                  marginTop: 4,
                  width: "100%",
                  minHeight: 90,
                  padding: "8px 12px",
                  border: "1px solid var(--border)",
                  borderRadius: 6,
                  fontSize: 13,
                  resize: "vertical",
                  background: "transparent",
                  color: "var(--fg)",
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 600 }}>Fotos o PDF de sustento</label>
              <Input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.webp"
                multiple
                onChange={(event) => setCreateFiles(Array.from(event.target.files ?? []))}
                style={{ marginTop: 4 }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={creandoDiscrepancia}>
              Cancelar
            </Button>
            <Button
              onClick={onSubmitCreate}
              disabled={
                creandoDiscrepancia ||
                !createIngresoId ||
                !createDetalleId ||
                createRecibido === "" ||
                Number(createRecibido) < 0
              }
              style={{ background: "var(--primary)", color: "var(--primary-fg)" }}
            >
              {creandoDiscrepancia ? "Generando..." : "Generar discrepancia"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!detailDialog} onOpenChange={() => setDetailDialog(null)}>
        <DialogContent style={{ maxWidth: 560 }}>
          <DialogHeader>
            <DialogTitle>Detalle de discrepancia</DialogTitle>
          </DialogHeader>
          {detailDialog && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10, fontSize: 13 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <div>
                  <span style={{ color: "var(--muted-fg)" }}>Ingreso:</span>{" "}
                  <strong>{detailDialog.codigo_ingreso}</strong>
                </div>
                <div>
                  <span style={{ color: "var(--muted-fg)" }}>Estado:</span>{" "}
                  <StatusDiscrepancia status={detailDialog.estado} />
                </div>
                <div>
                  <span style={{ color: "var(--muted-fg)" }}>Producto:</span> {detailDialog.producto}
                </div>
                <div>
                  <span style={{ color: "var(--muted-fg)" }}>Lote:</span>{" "}
                  <span style={{ fontFamily: "monospace" }}>{detailDialog.lote}</span>
                </div>
                <div>
                  <span style={{ color: "var(--muted-fg)" }}>Esperado:</span>{" "}
                  {formatCantidadUnidad(detailDialog.esperado, detailDialog.unidad)}
                </div>
                <div>
                  <span style={{ color: "var(--muted-fg)" }}>Recibido:</span>{" "}
                  {formatCantidadUnidad(detailDialog.recibido, detailDialog.unidad)}
                </div>
              </div>

              <div>
                <p style={{ margin: "0 0 4px", color: "var(--muted-fg)" }}>Observaciones iniciales</p>
                <p style={{ margin: 0 }}>{detailDialog.observaciones || "Sin observaciones"}</p>
              </div>

              {detailDialog.motivo_resolucion && (
                <div>
                  <p style={{ margin: "0 0 4px", color: "var(--muted-fg)" }}>Motivo de resolución</p>
                  <p style={{ margin: 0 }}>{detailDialog.motivo_resolucion}</p>
                </div>
              )}

              {detailDialog.motivo_anulacion && (
                <div>
                  <p style={{ margin: "0 0 4px", color: "var(--muted-fg)" }}>Motivo de anulación</p>
                  <p style={{ margin: 0 }}>{detailDialog.motivo_anulacion}</p>
                </div>
              )}

              <div>
                <p style={{ margin: "0 0 6px", color: "var(--muted-fg)" }}>Evidencias</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {(detailDialog.evidencias ?? []).length === 0 && (
                    <p style={{ margin: 0, color: "var(--muted-fg)" }}>Sin evidencias adjuntas.</p>
                  )}
                  {(detailDialog.evidencias ?? []).map((evidencia, idx) => (
                    <div
                      key={`${evidencia.path || evidencia.name}-${idx}`}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        border: "1px solid var(--border)",
                        borderRadius: 6,
                        padding: "8px 10px",
                      }}
                    >
                      <span style={{ fontSize: 12 }}>{evidencia.name || evidencia.path || "Archivo"}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => downloadEvidencia(evidencia)}
                        disabled={loadingEvidenciaPath === evidencia.path}
                      >
                        <Download size={13} style={{ marginRight: 4 }} />
                        {loadingEvidenciaPath === evidencia.path ? "Abriendo..." : "Descargar"}
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailDialog(null)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!resolveDialog} onOpenChange={() => setResolveDialog(null)}>
        <DialogContent style={{ maxWidth: 520 }}>
          <DialogHeader>
            <DialogTitle>Resolver discrepancia</DialogTitle>
          </DialogHeader>
          {resolveDialog && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <p style={{ margin: 0, fontSize: 13 }}>
                Ingreso <strong>{resolveDialog.codigo_ingreso}</strong> - {resolveDialog.producto}
              </p>
              <div
                style={{
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  padding: 10,
                  background: "var(--muted)",
                }}
              >
                <p style={{ margin: "0 0 8px", fontSize: 12, fontWeight: 700 }}>
                  Detalle del ingreso para validar
                </p>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 8,
                    fontSize: 12,
                  }}
                >
                  <div>
                    <span style={{ color: "var(--muted-fg)" }}>Proveedor:</span>{" "}
                    <strong>{resolveDialog.proveedor || "-"}</strong>
                  </div>
                  <div>
                    <span style={{ color: "var(--muted-fg)" }}>Lote:</span>{" "}
                    <span style={{ fontFamily: "monospace" }}>{resolveDialog.lote}</span>
                  </div>
                  <div>
                    <span style={{ color: "var(--muted-fg)" }}>Esperado:</span>{" "}
                    <strong>
                      {formatCantidadUnidad(resolveDialog.esperado, resolveDialog.unidad)}
                    </strong>
                  </div>
                  <div>
                    <span style={{ color: "var(--muted-fg)" }}>Recibido (discrepancia):</span>{" "}
                    <strong>
                      {formatCantidadUnidad(resolveDialog.recibido, resolveDialog.unidad)}
                    </strong>
                  </div>
                  <div>
                    <span style={{ color: "var(--muted-fg)" }}>Diferencia:</span>{" "}
                    <strong
                      style={{
                        color:
                          Number(resolveDialog.diferencia) < 0
                            ? "var(--danger)"
                            : Number(resolveDialog.diferencia) > 0
                              ? "var(--success)"
                              : "var(--fg)",
                      }}
                    >
                      {formatCantidadUnidad(resolveDialog.diferencia, resolveDialog.unidad)}
                    </strong>
                  </div>
                </div>
                {resolveDialog.observaciones && (
                  <div style={{ marginTop: 8, fontSize: 12 }}>
                    <span style={{ color: "var(--muted-fg)" }}>Observación inicial:</span>{" "}
                    {resolveDialog.observaciones}
                  </div>
                )}
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600 }}>Cantidad final en stock *</label>
                <Input
                  type="number"
                  min="0"
                  step="1"
                  value={resolveCantidad}
                  onChange={(event) => setResolveCantidad(event.target.value)}
                  style={{ marginTop: 4 }}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600 }}>Motivo de resolución</label>
                <textarea
                  value={resolveMotivo}
                  onChange={(event) => setResolveMotivo(event.target.value)}
                  placeholder="Ejemplo: proveedor repuso mercadería faltante..."
                  style={{
                    marginTop: 4,
                    width: "100%",
                    minHeight: 90,
                    padding: "8px 12px",
                    border: "1px solid var(--border)",
                    borderRadius: 6,
                    fontSize: 13,
                    resize: "vertical",
                    background: "transparent",
                    color: "var(--fg)",
                  }}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600 }}>Adjuntar evidencias de resolución</label>
                <Input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.webp"
                  multiple
                  onChange={(event) => setResolveFiles(Array.from(event.target.files ?? []))}
                  style={{ marginTop: 4 }}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setResolveDialog(null)} disabled={resolviendoDiscrepancia}>
              Cancelar
            </Button>
            <Button
              onClick={onSubmitResolver}
              disabled={resolviendoDiscrepancia || resolveCantidad === "" || Number(resolveCantidad) < 0}
              style={{ background: "var(--primary)", color: "var(--primary-fg)" }}
            >
              {resolviendoDiscrepancia ? "Resolviendo..." : "Resolver"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!anularDialog} onOpenChange={() => setAnularDialog(null)}>
        <DialogContent style={{ maxWidth: 520 }}>
          <DialogHeader>
            <DialogTitle>Anular discrepancia</DialogTitle>
          </DialogHeader>
          {anularDialog && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <p style={{ margin: 0, fontSize: 13 }}>
                Se revertirá la discrepancia de <strong>{anularDialog.codigo_ingreso}</strong>.
              </p>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600 }}>Motivo de anulación *</label>
                <textarea
                  value={anularMotivo}
                  onChange={(event) => setAnularMotivo(event.target.value)}
                  placeholder="Explica por qué la discrepancia fue incorrecta..."
                  style={{
                    marginTop: 4,
                    width: "100%",
                    minHeight: 90,
                    padding: "8px 12px",
                    border: "1px solid var(--border)",
                    borderRadius: 6,
                    fontSize: 13,
                    resize: "vertical",
                    background: "transparent",
                    color: "var(--fg)",
                  }}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600 }}>Adjuntar sustento (opcional)</label>
                <Input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.webp"
                  multiple
                  onChange={(event) => setAnularFiles(Array.from(event.target.files ?? []))}
                  style={{ marginTop: 4 }}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setAnularDialog(null)} disabled={anulandoDiscrepancia}>
              Cancelar
            </Button>
            <Button
              onClick={onSubmitAnular}
              disabled={anulandoDiscrepancia || !anularMotivo.trim()}
              style={{ background: "var(--danger)", color: "white" }}
            >
              {anulandoDiscrepancia ? "Anulando..." : "Anular discrepancia"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
