import { jsPDF } from "jspdf";
import * as XLSX from "xlsx";
import { supabase } from "../lib/supabase";
import { getCurrentPerfilId } from "./auth.service";

const REPORTES_BUCKET = "reportes";

const TIPO_LABELS = {
  inventario: "Inventario",
  distribuciones: "Distribuciones",
  movimientos: "Movimientos",
  recepcion: "Recepcion de productos",
  alumnos: "Padron de alumnos",
  stock: "Stock actual",
};

function getDateKey(dateLike) {
  const date = new Date(dateLike);
  if (Number.isNaN(date.getTime())) return "";
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatDate(dateLike) {
  const date = new Date(dateLike);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("es-PE", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function normalizeStoragePath(filePath) {
  if (!filePath) return "";
  if (filePath.startsWith("http")) {
    const marker = `/storage/v1/object/sign/${REPORTES_BUCKET}/`;
    const markerIndex = filePath.indexOf(marker);
    if (markerIndex >= 0) {
      const tail = filePath.slice(markerIndex + marker.length);
      return tail.split("?")[0] ?? "";
    }

    const publicMarker = `/storage/v1/object/public/${REPORTES_BUCKET}/`;
    const publicIndex = filePath.indexOf(publicMarker);
    if (publicIndex >= 0) {
      return filePath.slice(publicIndex + publicMarker.length).split("?")[0] ?? "";
    }
  }
  return filePath;
}

function buildPeriodoLabel(desde, hasta) {
  if (!desde && !hasta) return "Sin rango";
  if (desde && hasta) return `${desde} al ${hasta}`;
  return desde || hasta;
}

function parseFormatoMime(formato) {
  return formato === "pdf"
    ? "application/pdf"
    : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
}

function sanitizeFileName(text) {
  return String(text ?? "reporte")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function mapReporteRow(row) {
  return {
    id: Number(row.id),
    tipo: row.tipo,
    tipo_label: TIPO_LABELS[row.tipo] ?? row.tipo,
    formato: row.formato,
    rango_inicio: row.rango_inicio,
    rango_fin: row.rango_fin,
    periodo: buildPeriodoLabel(row.rango_inicio, row.rango_fin),
    ruta_archivo: row.ruta_archivo,
    filtros: row.filtros ?? {},
    generado_por: row.generador?.nombre_completo ?? "",
    fecha: row.generado_en,
  };
}

async function fetchReporteRows({ tipo, rango_inicio, rango_fin, filtro_grado }) {
  if (tipo === "inventario" || tipo === "stock") {
    const { data, error } = await supabase
      .from("vw_inventario_actual")
      .select("codigo_producto, nombre, categoria, unidad_medida, stock_actual, stock_minimo, stock_maximo, proveedor")
      .order("nombre", { ascending: true });

    if (error) throw error;

    return (data ?? []).map((row) => ({
      Codigo: row.codigo_producto,
      Producto: row.nombre,
      Categoria: row.categoria,
      Unidad: row.unidad_medida,
      "Stock actual": Number(row.stock_actual ?? 0),
      "Stock minimo": Number(row.stock_minimo ?? 0),
      "Stock maximo": Number(row.stock_maximo ?? 0),
      Proveedor: row.proveedor ?? "",
    }));
  }

  if (tipo === "alumnos") {
    let query = supabase
      .from("alumnos")
      .select("nombre, apellido, dni, grado, seccion, activo, creado_en")
      .order("grado", { ascending: true })
      .order("apellido", { ascending: true });

    if (rango_inicio) query = query.gte("creado_en", `${rango_inicio}T00:00:00`);
    if (rango_fin) query = query.lte("creado_en", `${rango_fin}T23:59:59`);

    const { data, error } = await query;
    if (error) throw error;

    return (data ?? []).map((row) => ({
      Alumno: `${row.nombre ?? ""} ${row.apellido ?? ""}`.trim(),
      DNI: row.dni,
      Grado: row.grado,
      Seccion: row.seccion,
      Estado: row.activo ? "Activo" : "Inactivo",
      Registro: formatDate(row.creado_en),
    }));
  }

  if (tipo === "distribuciones") {
    let query = supabase
      .from("distribuciones")
      .select(
        `
          fecha,
          hora,
          origen,
          sincronizado,
          observaciones,
          alumno:alumnos!distribuciones_id_alumno_fkey (
            nombre,
            apellido,
            dni,
            grado,
            seccion
          ),
          docente:perfiles!distribuciones_id_docente_fkey (
            nombre_completo
          )
        `,
      )
      .order("fecha", { ascending: false })
      .order("hora", { ascending: false });

    if (rango_inicio) query = query.gte("fecha", rango_inicio);
    if (rango_fin) query = query.lte("fecha", rango_fin);

    const { data, error } = await query;
    if (error) throw error;

    const rows = (data ?? []).map((row) => ({
      Alumno: `${row.alumno?.nombre ?? ""} ${row.alumno?.apellido ?? ""}`.trim(),
      DNI: row.alumno?.dni ?? "",
      Grado: row.alumno?.grado ?? "",
      Seccion: row.alumno?.seccion ?? "",
      Fecha: row.fecha,
      Hora: row.hora,
      Docente: row.docente?.nombre_completo ?? "",
      Origen: row.origen,
      Observaciones: row.observaciones ?? "",
    }));

    return filtro_grado && filtro_grado !== "todos"
      ? rows.filter((row) => row.Grado === filtro_grado)
      : rows;
  }

  if (tipo === "movimientos") {
    let query = supabase
      .from("registro_movimientos")
      .select(
        `
          tipo_accion,
          descripcion,
          tabla_origen,
          id_registro,
          creado_en,
          usuario:perfiles!registro_movimientos_id_usuario_fkey (
            nombre_completo
          )
        `,
      )
      .order("creado_en", { ascending: false });

    if (rango_inicio) query = query.gte("creado_en", `${rango_inicio}T00:00:00`);
    if (rango_fin) query = query.lte("creado_en", `${rango_fin}T23:59:59`);

    const { data, error } = await query;
    if (error) throw error;

    return (data ?? []).map((row) => ({
      Fecha: formatDate(row.creado_en),
      Tipo: row.tipo_accion,
      Usuario: row.usuario?.nombre_completo ?? "Sistema",
      Tabla: row.tabla_origen ?? "",
      Registro: row.id_registro ?? "",
      Descripcion: row.descripcion ?? "",
    }));
  }

  if (tipo === "recepcion") {
    let query = supabase
      .from("ingresos")
      .select(
        `
          id,
          fecha,
          estado,
          observaciones,
          proveedor:proveedores!ingresos_id_proveedor_fkey (
            nombre
          ),
          detalle_ingresos (
            lote,
            cantidad,
            peso_kg,
            unidad_medida,
            producto:productos!detalle_ingresos_id_producto_fkey (
              nombre
            )
          )
        `,
      )
      .order("fecha", { ascending: false });

    if (rango_inicio) query = query.gte("fecha", rango_inicio);
    if (rango_fin) query = query.lte("fecha", rango_fin);

    const { data, error } = await query;
    if (error) throw error;

    return (data ?? []).flatMap((ingreso) =>
      (ingreso.detalle_ingresos ?? []).map((detalle) => ({
        Ingreso: `ING-${String(ingreso.id).padStart(6, "0")}`,
        Fecha: ingreso.fecha,
        Proveedor: ingreso.proveedor?.nombre ?? "",
        Estado: ingreso.estado,
        Producto: detalle.producto?.nombre ?? "",
        Lote: detalle.lote,
        Cantidad: Number(detalle.cantidad ?? 0),
        Unidad: detalle.unidad_medida ?? "",
        "Peso (kg)": Number(detalle.peso_kg ?? 0),
        Observaciones: ingreso.observaciones ?? "",
      })),
    );
  }

  throw new Error("Tipo de reporte no soportado.");
}

function buildPdfBlob({ tipo, rango_inicio, rango_fin, rows }) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 12;
  let y = 14;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(`Reporte: ${TIPO_LABELS[tipo] ?? tipo}`, margin, y);
  y += 6;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`Periodo: ${buildPeriodoLabel(rango_inicio, rango_fin)}`, margin, y);
  y += 5;
  doc.text(`Generado: ${formatDate(new Date())}`, margin, y);
  y += 8;

  if (rows.length === 0) {
    doc.setFontSize(10);
    doc.text("Sin datos para el rango seleccionado.", margin, y);
    return doc.output("blob");
  }

  rows.forEach((row, index) => {
    const line = `${index + 1}. ${Object.entries(row)
      .map(([k, v]) => `${k}: ${v ?? ""}`)
      .join(" | ")}`;

    const lines = doc.splitTextToSize(line, pageWidth - margin * 2);
    if (y + lines.length * 4.4 > 285) {
      doc.addPage();
      y = 14;
    }

    doc.setFontSize(8.5);
    doc.text(lines, margin, y);
    y += lines.length * 4.4 + 2;
  });

  return doc.output("blob");
}

function buildXlsxBlob(rows) {
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Reporte");
  const buffer = XLSX.write(workbook, { type: "array", bookType: "xlsx" });
  return new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

export async function getReportes() {
  const { data, error } = await supabase
    .from("reportes")
    .select(
      `
        id,
        tipo,
        rango_inicio,
        rango_fin,
        formato,
        ruta_archivo,
        filtros,
        generado_en,
        generador:perfiles!reportes_generado_por_fkey (
          id,
          nombre_completo
        )
      `,
    )
    .order("generado_en", { ascending: false });

  if (error) throw error;
  return (data ?? []).map(mapReporteRow);
}

export async function generarReporte(payload) {
  const {
    tipo,
    formato,
    rango_inicio,
    rango_fin,
    filtro_grado = "",
  } = payload;

  if (!tipo) throw new Error("Debes seleccionar un tipo de reporte.");
  if (!formato) throw new Error("Debes seleccionar un formato de reporte.");

  const perfilId = await getCurrentPerfilId();
  const rows = await fetchReporteRows({ tipo, rango_inicio, rango_fin, filtro_grado });

  const blob = formato === "pdf"
    ? buildPdfBlob({ tipo, rango_inicio, rango_fin, rows })
    : buildXlsxBlob(rows);

  const nowKey = getDateKey(new Date());
  const timestamp = Date.now();
  const nameBase = sanitizeFileName(`${tipo}-${rango_inicio || "desde"}-${rango_fin || "hasta"}`);
  const ext = formato === "pdf" ? "pdf" : "xlsx";
  const path = `${tipo}/${nowKey}/${timestamp}-${nameBase}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(REPORTES_BUCKET)
    .upload(path, blob, {
      upsert: true,
      contentType: parseFormatoMime(formato),
    });

  if (uploadError) {
    throw new Error("No se pudo subir el archivo del reporte.");
  }

  const filtros = {
    ...(filtro_grado ? { grado: filtro_grado } : {}),
    total_registros: rows.length,
  };

  const { data, error } = await supabase
    .from("reportes")
    .insert({
      tipo,
      rango_inicio: rango_inicio || getDateKey(new Date()),
      rango_fin: rango_fin || getDateKey(new Date()),
      formato,
      ruta_archivo: path,
      filtros,
      generado_por: Number(perfilId),
      generado_en: new Date().toISOString(),
    })
    .select(
      `
        id,
        tipo,
        rango_inicio,
        rango_fin,
        formato,
        ruta_archivo,
        filtros,
        generado_en,
        generador:perfiles!reportes_generado_por_fkey (
          id,
          nombre_completo
        )
      `,
    )
    .single();

  if (error) throw error;

  return mapReporteRow(data);
}

export async function getReporteSignedUrl(rutaArchivo, expiresIn = 3600) {
  const normalizedPath = normalizeStoragePath(rutaArchivo);
  if (!normalizedPath) {
    throw new Error("No hay ruta valida para descargar el reporte.");
  }

  const { data, error } = await supabase.storage
    .from(REPORTES_BUCKET)
    .createSignedUrl(normalizedPath, expiresIn);

  if (error) throw error;
  return data.signedUrl;
}
