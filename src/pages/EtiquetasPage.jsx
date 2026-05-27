import { useMemo, useRef, useState } from "react";
import { Download, Printer, QrCode } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { jsPDF } from "jspdf";
import { QRCodeCanvas } from "qrcode.react";
import { toast } from "sonner";
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
import { buildLoteQrPayload } from "../lib/lotes-qr";

const PAGE_SIZE = 10;
const LABEL_WIDTH = 320;
const LABEL_HEIGHT = 420;

function formatCantidad(value) {
  const number = Number(value ?? 0);
  if (!Number.isFinite(number)) return "0";
  return new Intl.NumberFormat("es-PE", { maximumFractionDigits: 2 }).format(number);
}

function sanitizeFilename(text) {
  return String(text ?? "etiqueta")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);
}

function mapEtiquetas(ingresos) {
  return (ingresos ?? [])
    .flatMap((ingreso) =>
      (ingreso.detalle ?? []).map((item) => ({
        id: `ETQ-${item.id}`,
        detalle_id: item.id,
        qr_lote: item.qr_lote,
        qr_value: buildLoteQrPayload({ qr_lote: item.qr_lote }),
        lote: item.lote,
        producto: item.producto,
        codigo_producto: item.codigo_producto,
        ingreso_id: ingreso.id,
        codigo_ingreso: ingreso.codigo_ingreso,
        proveedor: ingreso.proveedor_nombre,
        cantidad: Number(item.cantidad ?? 0),
        unidad_medida: item.unidad_medida || "",
        peso_kg: Number(item.peso_kg ?? 0),
        fecha_ingreso: ingreso.fecha,
        fecha_vencimiento: item.fecha_vencimiento || null,
      })),
    )
    .sort((a, b) => new Date(b.fecha_ingreso).getTime() - new Date(a.fecha_ingreso).getTime());
}

function drawEtiquetaPage(doc, etiqueta, qrImage) {
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(18, 18, LABEL_WIDTH - 36, LABEL_HEIGHT - 36, 16, 16, "F");
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(18, 18, LABEL_WIDTH - 36, LABEL_HEIGHT - 36, 16, 16, "S");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("Etiqueta QR de Lote", LABEL_WIDTH / 2, 48, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(71, 85, 105);
  doc.text("IE 8060 Los Chasquis - Sistema PAE", LABEL_WIDTH / 2, 66, { align: "center" });

  doc.addImage(qrImage, "PNG", 92, 80, 136, 136);

  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(etiqueta.producto || "Producto", LABEL_WIDTH / 2, 238, {
    align: "center",
    maxWidth: 260,
  });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  const lines = [
    `Lote: ${etiqueta.lote}`,
    `Ingreso: ${etiqueta.codigo_ingreso || etiqueta.ingreso_id}`,
    `Proveedor: ${etiqueta.proveedor || "-"}`,
    `Cantidad: ${formatCantidad(etiqueta.cantidad)} ${etiqueta.unidad_medida || ""}`.trim(),
    `Peso: ${formatCantidad(etiqueta.peso_kg)} kg`,
    `Ingreso en fecha: ${format(new Date(etiqueta.fecha_ingreso), "dd/MM/yyyy", { locale: es })}`,
    `Vencimiento: ${
      etiqueta.fecha_vencimiento
        ? format(new Date(etiqueta.fecha_vencimiento), "MM/yyyy", { locale: es })
        : "Sin dato"
    }`,
  ];

  let y = 262;
  lines.forEach((line) => {
    doc.text(line, 30, y, { maxWidth: LABEL_WIDTH - 60 });
    y += 18;
  });

  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(`QR: ${etiqueta.qr_lote || "sin-codigo"}`, LABEL_WIDTH / 2, LABEL_HEIGHT - 24, {
    align: "center",
    maxWidth: 250,
  });
}

function getCanvasFromWrapper(wrapper) {
  return wrapper?.querySelector("canvas") || null;
}

export default function EtiquetasPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [selectedEtiqueta, setSelectedEtiqueta] = useState(null);

  const { data: ingresos = [], isLoading } = useIngresos();

  const previewQrWrapperRef = useRef(null);
  const hiddenQrRefs = useRef({});

  const etiquetas = useMemo(() => mapEtiquetas(ingresos), [ingresos]);

  const filteredEtiquetas = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return etiquetas;

    return etiquetas.filter((item) =>
      [
        item.lote,
        item.producto,
        item.codigo_ingreso,
        item.proveedor,
        item.codigo_producto,
        item.qr_lote,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term)),
    );
  }, [etiquetas, search]);

  const totalPages = Math.max(1, Math.ceil(filteredEtiquetas.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const shown = filteredEtiquetas.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const downloadOneEtiquetaPdf = (etiqueta, canvas, mode = "download") => {
    if (!canvas) {
      toast.error("No se pudo generar el QR para esta etiqueta.");
      return;
    }

    try {
      const doc = new jsPDF({ unit: "pt", format: [LABEL_WIDTH, LABEL_HEIGHT] });
      const qrImage = canvas.toDataURL("image/png");
      drawEtiquetaPage(doc, etiqueta, qrImage);

      const fileBase = sanitizeFilename(`${etiqueta.lote}-${etiqueta.producto}`);
      const fileName = `etiqueta-${fileBase || etiqueta.id}.pdf`;

      if (mode === "print") {
        doc.autoPrint();
        window.open(doc.output("bloburl"), "_blank", "noopener,noreferrer");
      } else {
        doc.save(fileName);
      }
    } catch {
      toast.error("No se pudo generar el PDF de la etiqueta.");
    }
  };

  const handleDownloadFromRow = (etiqueta) => {
    const canvas = getCanvasFromWrapper(hiddenQrRefs.current[etiqueta.id]);
    downloadOneEtiquetaPdf(etiqueta, canvas, "download");
  };

  const handlePrintFromRow = (etiqueta) => {
    const canvas = getCanvasFromWrapper(hiddenQrRefs.current[etiqueta.id]);
    downloadOneEtiquetaPdf(etiqueta, canvas, "print");
  };

  const handleDownloadFromPreview = () => {
    if (!selectedEtiqueta) return;
    const canvas = getCanvasFromWrapper(previewQrWrapperRef.current);
    downloadOneEtiquetaPdf(selectedEtiqueta, canvas, "download");
  };

  const handlePrintFromPreview = () => {
    if (!selectedEtiqueta) return;
    const canvas = getCanvasFromWrapper(previewQrWrapperRef.current);
    downloadOneEtiquetaPdf(selectedEtiqueta, canvas, "print");
  };

  const handleDownloadAll = (mode = "download") => {
    if (filteredEtiquetas.length === 0) {
      toast.error("No hay etiquetas para exportar.");
      return;
    }

    try {
      const doc = new jsPDF({ unit: "pt", format: [LABEL_WIDTH, LABEL_HEIGHT] });
      let added = 0;

      filteredEtiquetas.forEach((etiqueta) => {
        const canvas = getCanvasFromWrapper(hiddenQrRefs.current[etiqueta.id]);
        if (!canvas) return;

        if (added > 0) {
          doc.addPage([LABEL_WIDTH, LABEL_HEIGHT]);
        }

        const qrImage = canvas.toDataURL("image/png");
        drawEtiquetaPage(doc, etiqueta, qrImage);
        added += 1;
      });

      if (added === 0) {
        toast.error("No se pudieron generar los codigos QR para exportar.");
        return;
      }

      if (mode === "print") {
        doc.autoPrint();
        window.open(doc.output("bloburl"), "_blank", "noopener,noreferrer");
      } else {
        const fileName = `etiquetas-lotes-${format(new Date(), "yyyyMMdd-HHmm")}.pdf`;
        doc.save(fileName);
      }

      toast.success(`Se generaron ${added} etiqueta(s).`);
    } catch {
      toast.error("No se pudo generar el PDF de etiquetas.");
    }
  };

  const columns = [
    {
      key: "lote",
      header: "Lote",
      render: (value) => (
        <span style={{ fontFamily: "monospace", fontWeight: 600, fontSize: 12 }}>{value}</span>
      ),
    },
    {
      key: "producto",
      header: "Producto",
      render: (value) => <span style={{ fontWeight: 500 }}>{value}</span>,
    },
    {
      key: "codigo_ingreso",
      header: "Ingreso",
      render: (value) => (
        <span style={{ fontFamily: "monospace", fontSize: 12, color: "var(--muted-fg)" }}>
          {value}
        </span>
      ),
    },
    {
      key: "proveedor",
      header: "Proveedor",
      render: (value) => <span style={{ fontSize: 12 }}>{value || "-"}</span>,
    },
    {
      key: "cantidad",
      header: "Cantidad",
      render: (value, row) => `${formatCantidad(value)} ${row.unidad_medida || ""}`.trim(),
    },
    {
      key: "fecha_vencimiento",
      header: "Vencimiento",
      render: (value) =>
        value ? (
          <span style={{ fontWeight: 500 }}>{format(new Date(value), "MM/yyyy", { locale: es })}</span>
        ) : (
          <span style={{ color: "var(--muted-fg)" }}>Sin dato</span>
        ),
    },
    {
      key: "acciones",
      header: "Acciones",
      align: "center",
      width: 240,
      render: (_, row) => (
        <div style={{ display: "flex", gap: 4, justifyContent: "center" }}>
          <Button
            variant="ghost"
            size="sm"
            style={{ height: 28, fontSize: 11 }}
            onClick={() => {
              setSelectedEtiqueta(row);
              setPreviewOpen(true);
            }}
          >
            <QrCode size={12} style={{ marginRight: 3 }} /> Ver QR
          </Button>
          <Button
            variant="ghost"
            size="sm"
            style={{ height: 28, fontSize: 11 }}
            onClick={() => handlePrintFromRow(row)}
          >
            <Printer size={12} style={{ marginRight: 3 }} /> Imprimir
          </Button>
          <Button
            variant="ghost"
            size="sm"
            style={{ height: 28, fontSize: 11 }}
            onClick={() => handleDownloadFromRow(row)}
          >
            <Download size={12} style={{ marginRight: 3 }} /> PDF
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Etiquetas QR de Lotes"
        subtitle="Etiquetas trazables por producto y lote"
        actions={
          <div style={{ display: "flex", gap: 8 }}>
            <Button variant="outline" onClick={() => handleDownloadAll("print")}>
              <Printer size={14} style={{ marginRight: 6 }} /> Imprimir todas
            </Button>
            <Button
              style={{ background: "var(--primary)", color: "var(--primary-fg)" }}
              onClick={() => handleDownloadAll("download")}
            >
              <Download size={14} style={{ marginRight: 6 }} /> PDF de todas
            </Button>
          </div>
        }
      />

      <div style={{ marginBottom: 16 }}>
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Buscar por lote, producto, ingreso o proveedor..."
        />
      </div>

      <DataTable columns={columns} data={shown} loading={isLoading} emptyMessage="No hay etiquetas para mostrar" />
      <TablePagination
        page={safePage}
        totalPages={totalPages}
        total={filteredEtiquetas.length}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
      />

      <div style={{ position: "absolute", left: -99999, top: -99999, opacity: 0, pointerEvents: "none" }}>
        {filteredEtiquetas.map((etiqueta) => (
          <div
            key={`hidden-qr-${etiqueta.id}`}
            ref={(node) => {
              if (node) hiddenQrRefs.current[etiqueta.id] = node;
            }}
          >
            <QRCodeCanvas value={etiqueta.qr_value || etiqueta.qr_lote || etiqueta.lote} size={256} level="M" />
          </div>
        ))}
      </div>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent style={{ maxWidth: 420 }}>
          <DialogHeader>
            <DialogTitle>Vista previa de etiqueta</DialogTitle>
          </DialogHeader>
          {selectedEtiqueta && (
            <div
              style={{
                border: "2px solid var(--border)",
                borderRadius: 12,
                padding: 20,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 12,
                background: "var(--card)",
              }}
            >
              <div style={{ textAlign: "center", width: "100%" }}>
                <p style={{ fontWeight: 700, fontSize: 13, margin: 0 }}>IE 8060 Los Chasquis</p>
                <p style={{ fontSize: 11, color: "var(--muted-fg)", margin: "2px 0 0" }}>
                  Sistema PAE - Etiqueta de lote
                </p>
              </div>

              <p style={{ fontWeight: 700, fontSize: 15, margin: 0, textAlign: "center" }}>
                {selectedEtiqueta.producto}
              </p>
              <p style={{ fontSize: 12, color: "var(--muted-fg)", margin: 0 }}>
                LOTE: <strong style={{ fontFamily: "monospace" }}>{selectedEtiqueta.lote}</strong>
              </p>

              <div
                ref={previewQrWrapperRef}
                style={{
                  width: 160,
                  height: 160,
                  borderRadius: 8,
                  border: "1px solid var(--border)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "white",
                }}
              >
                <QRCodeCanvas
                  value={selectedEtiqueta.qr_value || selectedEtiqueta.qr_lote || selectedEtiqueta.lote}
                  size={140}
                  level="M"
                />
              </div>

              <div style={{ textAlign: "center", fontSize: 12 }}>
                <p style={{ margin: "2px 0" }}>
                  <span style={{ color: "var(--muted-fg)" }}>Proveedor:</span> {selectedEtiqueta.proveedor || "-"}
                </p>
                <p style={{ margin: "2px 0" }}>
                  <span style={{ color: "var(--muted-fg)" }}>Cantidad:</span>{" "}
                  {formatCantidad(selectedEtiqueta.cantidad)} {selectedEtiqueta.unidad_medida}
                </p>
                <p style={{ margin: "2px 0" }}>
                  <span style={{ color: "var(--muted-fg)" }}>Ingreso:</span>{" "}
                  {selectedEtiqueta.codigo_ingreso}
                </p>
                <p style={{ margin: "2px 0" }}>
                  <span style={{ color: "var(--muted-fg)" }}>Fecha ingreso:</span>{" "}
                  {format(new Date(selectedEtiqueta.fecha_ingreso), "dd/MM/yyyy", { locale: es })}
                </p>
                <p style={{ margin: "2px 0" }}>
                  <span style={{ color: "var(--muted-fg)" }}>Vencimiento:</span>{" "}
                  <strong>
                    {selectedEtiqueta.fecha_vencimiento
                      ? format(new Date(selectedEtiqueta.fecha_vencimiento), "MM/yyyy", { locale: es })
                      : "Sin dato"}
                  </strong>
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewOpen(false)}>
              Cerrar
            </Button>
            <Button variant="outline" onClick={handlePrintFromPreview}>
              <Printer size={14} style={{ marginRight: 6 }} /> Imprimir
            </Button>
            <Button style={{ background: "var(--primary)", color: "var(--primary-fg)" }} onClick={handleDownloadFromPreview}>
              <Download size={14} style={{ marginRight: 6 }} /> Descargar PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
