import { format } from "date-fns";
import { es } from "date-fns/locale";
import { jsPDF } from "jspdf";

export function formatCantidad(value) {
  const number = Number(value ?? 0);
  if (!Number.isFinite(number)) return "0";
  return new Intl.NumberFormat("es-PE", { maximumFractionDigits: 2 }).format(number);
}

export function buildCantidadResumen(detalle = []) {
  const resumen = new Map();
  detalle.forEach((item) => {
    const unidad = String(item.unidad_medida ?? "").trim().toLowerCase() || "un";
    const actual = resumen.get(unidad) ?? 0;
    resumen.set(unidad, actual + Number(item.cantidad ?? 0));
  });
  return Array.from(resumen.entries())
    .map(([unidad, total]) => `${formatCantidad(total)} ${unidad}`)
    .join(" | ");
}

export function buildActaPdf(ingreso, perfilNombre) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const lineHeight = 6;
  const marginX = 14;
  const contentWidth = pageWidth - marginX * 2;
  let y = 16;

  const drawHeader = () => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("ACTA DE RECEPCION DE PRODUCTOS", pageWidth / 2, y, { align: "center" });
    y += 7;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text("IE 8060 Los Chasquis - Programa de Alimentacion Escolar", pageWidth / 2, y, {
      align: "center",
    });
    y += 9;
    doc.setDrawColor(180);
    doc.line(marginX, y, pageWidth - marginX, y);
    y += 8;
  };

  drawHeader();

  const fechaDoc = ingreso.fecha
    ? format(new Date(ingreso.fecha), "dd/MM/yyyy HH:mm", { locale: es })
    : "-";
  const estadoLabel =
    ingreso.estado === "con_discrepancia"
      ? "Con discrepancia"
      : ingreso.estado === "conforme"
        ? "Conforme"
        : ingreso.estado === "anulado"
          ? "Anulado"
          : "Registrado";
  const cantidadResumen = buildCantidadResumen(ingreso.detalle);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Acta vinculada al ingreso: ${ingreso.codigo_ingreso ?? ingreso.id}`, marginX, y);
  y += lineHeight;
  doc.text(`Proveedor: ${ingreso.proveedor_nombre ?? "-"}`, marginX, y);
  y += lineHeight;
  doc.text(`Fecha de recepcion: ${fechaDoc}`, marginX, y);
  y += lineHeight;
  doc.text(`Estado del ingreso: ${estadoLabel}`, marginX, y);
  y += lineHeight;
  doc.text(`Generado por: ${perfilNombre ?? ingreso.usuario_nombre ?? "Usuario del sistema"}`, marginX, y);
  y += lineHeight;
  doc.text(`Cantidad total recibida: ${cantidadResumen || "0"}`, marginX, y);
  y += lineHeight;
  doc.text(`Peso total recibido: ${formatCantidad(ingreso.peso_total_kg)} kg`, marginX, y);
  y += 8;

  doc.setFillColor(245, 245, 245);
  doc.rect(marginX, y, contentWidth, 8, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("Producto", marginX + 2, y + 5.3);
  doc.text("Lote", marginX + 88, y + 5.3);
  doc.text("Cantidad", marginX + 120, y + 5.3);
  doc.text("Peso (kg)", marginX + 162, y + 5.3);
  y += 10;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);

  const ensureRowSpace = () => {
    if (y <= 268) return;
    doc.addPage();
    y = 16;
    drawHeader();
    doc.setFillColor(245, 245, 245);
    doc.rect(marginX, y, contentWidth, 8, "F");
    doc.setFont("helvetica", "bold");
    doc.text("Producto", marginX + 2, y + 5.3);
    doc.text("Lote", marginX + 88, y + 5.3);
    doc.text("Cantidad", marginX + 120, y + 5.3);
    doc.text("Peso (kg)", marginX + 162, y + 5.3);
    y += 10;
    doc.setFont("helvetica", "normal");
  };

  (ingreso.detalle ?? []).forEach((item) => {
    ensureRowSpace();
    const producto = String(item.producto ?? "-");
    const lote = String(item.lote ?? "-");
    doc.text(producto.slice(0, 40), marginX + 2, y);
    doc.text(lote.slice(0, 16), marginX + 88, y);
    const cantidadConUnidad = `${formatCantidad(item.cantidad)} ${item.unidad_medida ?? ""}`.trim();
    doc.text(cantidadConUnidad.slice(0, 20), marginX + 120, y);
    doc.text(formatCantidad(item.peso_kg), marginX + 162, y);
    y += lineHeight;
    doc.setDrawColor(230);
    doc.line(marginX, y - 2.4, pageWidth - marginX, y - 2.4);
  });

  y += 8;
  const observaciones = (ingreso.observaciones ?? "").trim();
  if (observaciones) {
    ensureRowSpace();
    doc.setFont("helvetica", "bold");
    doc.text("Observaciones:", marginX, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    const observacionesLines = doc.splitTextToSize(observaciones, contentWidth);
    doc.text(observacionesLines, marginX, y);
    y += observacionesLines.length * 4.4 + 6;
  }

  if (y > 220) {
    doc.addPage();
    y = 20;
  }

  doc.setDrawColor(80);
  doc.line(marginX, y + 16, marginX + 70, y + 16);
  doc.line(pageWidth - marginX - 70, y + 16, pageWidth - marginX, y + 16);
  doc.setFontSize(9);
  doc.text("Firma responsable CAE", marginX + 35, y + 21, { align: "center" });
  doc.text("Firma proveedor", pageWidth - marginX - 35, y + 21, { align: "center" });

  return doc.output("blob");
}

export function triggerDownload(url, filename) {
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
