import { useMemo, useState } from "react";
import { Download, Eye, FileText } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import DataTable from "../components/shared/DataTable";
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
import { useIngresos } from "../hooks/queries/useIngresos";
import {
  useActasRecepcion,
  useGenerarActaRecepcion,
} from "../hooks/queries/useActas";
import { getActaFirmadaUrl } from "../services/actas.service";
import { useAuthStore } from "../stores/authStore";
import { buildActaPdf, triggerDownload } from "../utils/actasPdf";

const PAGE_SIZE = 10;

function formatCantidad(value) {
  const number = Number(value ?? 0);
  if (!Number.isFinite(number)) return "0";
  return new Intl.NumberFormat("es-PE", { maximumFractionDigits: 2 }).format(number);
}

function formatCantidadConUnidad(item) {
  const unidad = item?.unidad_medida ? ` ${item.unidad_medida}` : "";
  return `${formatCantidad(item?.cantidad)}${unidad}`;
}

export default function ActasPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [selectedActa, setSelectedActa] = useState(null);
  const [downloadingActaId, setDownloadingActaId] = useState(null);
  const [genDialog, setGenDialog] = useState({
    open: false,
    selectedIngresoId: "",
    status: "idle",
    downloadUrl: "",
    fileName: "",
    error: "",
  });

  const { data: actas = [], isLoading } = useActasRecepcion();
  const { data: ingresos = [] } = useIngresos();
  const { mutateAsync: generarActa } = useGenerarActaRecepcion();
  const perfilNombre = useAuthStore((state) => state.perfil?.nombre_completo);

  const actasPorIngreso = useMemo(() => {
    const map = new Map();
    actas.forEach((acta) => {
      map.set(Number(acta.id_ingreso), acta);
    });
    return map;
  }, [actas]);

  const ingresosPendientes = useMemo(
    () =>
      ingresos.filter(
        (ingreso) => ingreso.estado !== "anulado" && !actasPorIngreso.has(Number(ingreso.id)),
      ),
    [ingresos, actasPorIngreso],
  );

  const filteredActas = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return actas;

    return actas.filter((acta) => {
      return [
        acta.codigo_acta,
        acta.codigo_ingreso,
        acta.proveedor,
        acta.generado_por,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term));
    });
  }, [actas, search]);

  const totalPages = Math.max(1, Math.ceil(filteredActas.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginatedActas = filteredActas.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  );

  const handleDescargarActa = async (acta) => {
    if (!acta?.ruta_pdf) return;
    try {
      setDownloadingActaId(acta.id);
      const signedUrl = await getActaFirmadaUrl(acta.ruta_pdf);
      triggerDownload(signedUrl, `acta-${acta.codigo_ingreso}.pdf`);
    } finally {
      setDownloadingActaId(null);
    }
  };

  const openGenerarDialog = () => {
    setGenDialog({
      open: true,
      selectedIngresoId: ingresosPendientes[0]?.id ? String(ingresosPendientes[0].id) : "",
      status: "idle",
      downloadUrl: "",
      fileName: "",
      error: "",
    });
  };

  const handleGenerarActaDesdeDialog = async () => {
    const ingreso = ingresos.find((item) => String(item.id) === String(genDialog.selectedIngresoId));
    if (!ingreso) {
      setGenDialog((prev) => ({ ...prev, status: "error", error: "Selecciona un ingreso valido." }));
      return;
    }

    const fileName = `acta-${ingreso.codigo_ingreso ?? ingreso.id}.pdf`;

    try {
      setGenDialog((prev) => ({
        ...prev,
        status: "generando",
        error: "",
        downloadUrl: "",
        fileName,
      }));

      const pdfBlob = buildActaPdf(ingreso, perfilNombre);
      const acta = await generarActa({
        ingresoId: ingreso.id,
        codigoIngreso: ingreso.codigo_ingreso,
        pdfBlob,
      });
      const signedUrl = await getActaFirmadaUrl(acta.ruta_pdf);

      setGenDialog((prev) => ({
        ...prev,
        status: "generada",
        downloadUrl: signedUrl,
        fileName,
        error: "",
      }));
    } catch (error) {
      setGenDialog((prev) => ({
        ...prev,
        status: "error",
        error: error.message ?? "No se pudo generar el acta.",
      }));
    }
  };

  const handleDescargarDesdeDialog = () => {
    if (!genDialog.downloadUrl) return;
    triggerDownload(genDialog.downloadUrl, genDialog.fileName || "acta-recepcion.pdf");
  };

  const columns = [
    {
      key: "codigo_acta",
      header: "# Acta",
      width: 140,
      render: (v) => (
        <span style={{ fontFamily: "monospace", fontSize: 12, fontWeight: 600 }}>{v}</span>
      ),
    },
    {
      key: "codigo_ingreso",
      header: "Ingreso",
      width: 130,
      render: (v) => (
        <span style={{ fontFamily: "monospace", fontSize: 12, color: "var(--muted-fg)" }}>
          {v}
        </span>
      ),
    },
    {
      key: "proveedor",
      header: "Proveedor",
      render: (v) => <span style={{ fontWeight: 500 }}>{v || "-"}</span>,
    },
    {
      key: "generado_en",
      header: "Fecha",
      width: 140,
      render: (v) => format(new Date(v), "dd/MM/yyyy", { locale: es }),
    },
    {
      key: "generado_por",
      header: "Generado por",
      render: (v) => <span style={{ fontSize: 12 }}>{v || "-"}</span>,
    },
    {
      key: "estado",
      header: "Estado",
      width: 110,
      render: () => (
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
          Disponible
        </span>
      ),
    },
    {
      key: "acciones",
      header: "Acciones",
      align: "center",
      width: 220,
      render: (_, row) => (
        <div style={{ display: "flex", gap: 4, justifyContent: "center" }}>
          <Button
            variant="ghost"
            size="sm"
            style={{ height: 28 }}
            onClick={() => {
              setSelectedActa(row);
              setPreviewOpen(true);
            }}
          >
            <Eye size={13} style={{ marginRight: 4 }} /> Vista previa
          </Button>
          <Button
            variant="ghost"
            size="sm"
            style={{ height: 28 }}
            onClick={() => handleDescargarActa(row)}
            disabled={downloadingActaId === row.id}
          >
            <Download size={13} style={{ marginRight: 4 }} />
            {downloadingActaId === row.id ? "Descargando..." : "Descargar"}
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Actas de Recepcion"
        subtitle="Documentacion oficial de recepciones"
        actions={
          <Button variant="outline" onClick={openGenerarDialog}>
            <FileText size={14} style={{ marginRight: 6 }} /> Generar Acta
          </Button>
        }
      />

      <div style={{ marginBottom: 16 }}>
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Buscar por acta, ingreso o proveedor..."
        />
      </div>

      <DataTable
        columns={columns}
        data={paginatedActas}
        loading={isLoading}
        emptyMessage="Aun no hay actas registradas"
      />
      <TablePagination
        page={safePage}
        totalPages={totalPages}
        total={filteredActas.length}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
      />

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent style={{ maxWidth: 680 }}>
          <DialogHeader>
            <DialogTitle>Vista Previa de Acta</DialogTitle>
          </DialogHeader>
          {selectedActa && (
            <div style={{ border: "1px solid var(--border)", borderRadius: 8, padding: 24, fontSize: 12 }}>
              <div
                style={{
                  textAlign: "center",
                  borderBottom: "2px solid var(--border)",
                  paddingBottom: 12,
                  marginBottom: 16,
                }}
              >
                <p style={{ fontWeight: 700, fontSize: 14, margin: 0 }}>
                  ACTA DE RECEPCION N° {selectedActa.codigo_acta}
                </p>
                <p style={{ color: "var(--muted-fg)", margin: "4px 0 0" }}>
                  IE 8060 Los Chasquis - Programa de Alimentacion Escolar PAE
                </p>
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 8,
                  marginBottom: 16,
                }}
              >
                <div>
                  <span style={{ color: "var(--muted-fg)" }}>Fecha:</span>{" "}
                  {format(new Date(selectedActa.generado_en), "dd/MM/yyyy", { locale: es })}
                </div>
                <div>
                  <span style={{ color: "var(--muted-fg)" }}>Proveedor:</span> {selectedActa.proveedor}
                </div>
                <div>
                  <span style={{ color: "var(--muted-fg)" }}>N° Ingreso:</span> {selectedActa.codigo_ingreso}
                </div>
                <div>
                  <span style={{ color: "var(--muted-fg)" }}>Peso total:</span>{" "}
                  {formatCantidad(selectedActa.peso_total_kg)} kg
                </div>
              </div>
              <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 16 }}>
                <thead>
                  <tr style={{ background: "var(--muted)" }}>
                    {["Producto", "Lote", "Cantidad", "Peso (kg)"].map((header) => (
                      <th
                        key={header}
                        style={{
                          padding: "6px 10px",
                          textAlign: "left",
                          fontSize: 11,
                          fontWeight: 600,
                        }}
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {selectedActa.detalle.map((d) => (
                    <tr key={d.id} style={{ borderBottom: "1px solid var(--border)" }}>
                      <td style={{ padding: "6px 10px" }}>{d.producto}</td>
                      <td style={{ padding: "6px 10px", fontFamily: "monospace" }}>{d.lote}</td>
                      <td style={{ padding: "6px 10px" }}>{formatCantidadConUnidad(d)}</td>
                      <td style={{ padding: "6px 10px" }}>{formatCantidad(d.peso_kg)} kg</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div
                style={{
                  borderTop: "1px solid var(--border)",
                  paddingTop: 12,
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 24,
                }}
              >
                <div style={{ textAlign: "center" }}>
                  <div style={{ height: 40, borderBottom: "1px solid var(--fg)", marginBottom: 4 }} />
                  <p style={{ color: "var(--muted-fg)", margin: 0 }}>Firma del CAE</p>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ height: 40, borderBottom: "1px solid var(--fg)", marginBottom: 4 }} />
                  <p style={{ color: "var(--muted-fg)", margin: 0 }}>Firma del Proveedor</p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewOpen(false)}>
              Cerrar
            </Button>
            <Button
              style={{ background: "var(--primary)", color: "var(--primary-fg)" }}
              onClick={() => selectedActa && handleDescargarActa(selectedActa)}
              disabled={!selectedActa}
            >
              <Download size={14} style={{ marginRight: 6 }} /> Descargar PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={genDialog.open}
        onOpenChange={(open) => {
          if (!open) {
            setGenDialog({
              open: false,
              selectedIngresoId: "",
              status: "idle",
              downloadUrl: "",
              fileName: "",
              error: "",
            });
          }
        }}
      >
        <DialogContent style={{ maxWidth: 500 }}>
          <DialogHeader>
            <DialogTitle>Generar Acta de Recepcion</DialogTitle>
          </DialogHeader>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, marginBottom: 6, display: "block" }}>
                Ingreso sin acta
              </label>
              <select
                value={genDialog.selectedIngresoId}
                onChange={(event) =>
                  setGenDialog((prev) => ({ ...prev, selectedIngresoId: event.target.value }))
                }
                disabled={genDialog.status === "generando" || ingresosPendientes.length === 0}
                style={{
                  width: "100%",
                  height: 36,
                  borderRadius: 6,
                  border: "1px solid var(--border)",
                  background: "transparent",
                  color: "var(--fg)",
                  padding: "0 10px",
                  fontSize: 13,
                }}
              >
                {ingresosPendientes.length === 0 && (
                  <option value="">No hay ingresos pendientes</option>
                )}
                {ingresosPendientes.map((ingreso) => (
                  <option key={ingreso.id} value={String(ingreso.id)}>
                    {ingreso.codigo_ingreso} - {ingreso.proveedor_nombre}
                  </option>
                ))}
              </select>
            </div>

            {genDialog.status === "generando" && (
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

            {genDialog.status === "generada" && (
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

            {genDialog.status === "error" && (
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
                {genDialog.error || "No se pudo generar el acta."}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() =>
                setGenDialog({
                  open: false,
                  selectedIngresoId: "",
                  status: "idle",
                  downloadUrl: "",
                  fileName: "",
                  error: "",
                })
              }
            >
              Cerrar
            </Button>
            <Button
              variant="outline"
              onClick={handleDescargarDesdeDialog}
              disabled={genDialog.status !== "generada" || !genDialog.downloadUrl}
            >
              Descargar
            </Button>
            <Button
              style={{ background: "var(--primary)", color: "var(--primary-fg)" }}
              onClick={handleGenerarActaDesdeDialog}
              disabled={
                genDialog.status === "generando" ||
                !genDialog.selectedIngresoId ||
                ingresosPendientes.length === 0
              }
            >
              {genDialog.status === "generando" ? "Generando..." : "Generar Acta"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
