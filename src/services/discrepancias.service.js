import { supabase } from "../lib/supabase";

const EVIDENCIAS_BUCKET = "discrepancias-evidencias";

function buildCodigoIngreso(id) {
  return `ING-${String(id ?? 0).padStart(6, "0")}`;
}

function normalizeStoragePath(filePath) {
  if (!filePath) return "";
  if (filePath.startsWith("http")) {
    const marker = `/storage/v1/object/sign/${EVIDENCIAS_BUCKET}/`;
    const markerIndex = filePath.indexOf(marker);
    if (markerIndex >= 0) {
      const tail = filePath.slice(markerIndex + marker.length);
      return tail.split("?")[0] ?? "";
    }

    const publicMarker = `/storage/v1/object/public/${EVIDENCIAS_BUCKET}/`;
    const publicIndex = filePath.indexOf(publicMarker);
    if (publicIndex >= 0) {
      return filePath.slice(publicIndex + publicMarker.length).split("?")[0] ?? "";
    }
  }
  return filePath;
}

function safeFileName(name) {
  return String(name ?? "evidencia")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

function mapDiscrepanciaRow(row) {
  const detalle = row.detalle ?? {};
  const ingreso = detalle.ingreso ?? {};

  return {
    id: Number(row.id),
    id_detalle_ingreso: Number(row.id_detalle_ingreso),
    ingreso_id: Number(ingreso.id ?? detalle.id_ingreso ?? 0),
    codigo_ingreso: buildCodigoIngreso(ingreso.id ?? detalle.id_ingreso),
    producto: detalle.producto?.nombre ?? "Producto",
    codigo_producto: detalle.producto?.codigo_producto ?? "",
    lote: detalle.lote ?? "",
    unidad: detalle.unidad_medida || detalle.producto?.unidad_medida || "",
    esperado: Number(row.cantidad_esperada ?? 0),
    recibido: Number(row.cantidad_recibida ?? 0),
    diferencia: Number(row.diferencia ?? 0),
    observaciones: row.observaciones ?? "",
    estado: row.estado ?? "registrada",
    fecha: row.creado_en,
    actualizado_en: row.actualizado_en ?? row.creado_en,
    proveedor: ingreso.proveedor?.nombre ?? "",
    estado_ingreso: ingreso.estado ?? "registrado",
    generado_por: row.creador?.nombre_completo ?? "",
    motivo_resolucion: row.motivo_resolucion ?? "",
    resuelta_en: row.resuelta_en,
    resuelta_por: row.resuelto_por?.nombre_completo ?? "",
    motivo_anulacion: row.motivo_anulacion ?? "",
    anulada_en: row.anulada_en,
    anulada_por: row.anulado_por?.nombre_completo ?? "",
    evidencias: Array.isArray(row.evidencias) ? row.evidencias : [],
  };
}

export async function getDiscrepancias() {
  const { data, error } = await supabase
    .from("discrepancias")
    .select(
      `
        id,
        id_detalle_ingreso,
        cantidad_esperada,
        cantidad_recibida,
        diferencia,
        observaciones,
        estado,
        evidencias,
        creado_en,
        actualizado_en,
        motivo_resolucion,
        resuelta_en,
        motivo_anulacion,
        anulada_en,
        creador:perfiles!discrepancias_creado_por_fkey (
          id,
          nombre_completo
        ),
        resuelto_por:perfiles!discrepancias_resuelta_por_fkey (
          id,
          nombre_completo
        ),
        anulado_por:perfiles!discrepancias_anulada_por_fkey (
          id,
          nombre_completo
        ),
        detalle:detalle_ingresos!discrepancias_id_detalle_ingreso_fkey (
          id,
          id_ingreso,
          lote,
          cantidad,
          unidad_medida,
          peso_kg,
          producto:productos!detalle_ingresos_id_producto_fkey (
            id,
            nombre,
            codigo_producto,
            unidad_medida
          ),
          ingreso:ingresos!detalle_ingresos_id_ingreso_fkey (
            id,
            fecha,
            estado,
            observaciones,
            creado_en,
            proveedor:proveedores!ingresos_id_proveedor_fkey (
              id,
              nombre
            )
          )
        )
      `,
    )
    .order("creado_en", { ascending: false });

  if (error) throw error;
  return (data ?? []).map(mapDiscrepanciaRow);
}

async function uploadEvidencias({ files = [], ingresoId, detalleId }) {
  if (!Array.isArray(files) || files.length === 0) {
    return [];
  }

  const uploaded = [];

  for (const file of files) {
    if (!file) continue;

    const ext = (file.name?.split(".").pop() || "bin").toLowerCase();
    const rawName = file.name || "evidencia";
    const baseWithoutExt = rawName.includes(".")
      ? rawName.slice(0, rawName.lastIndexOf("."))
      : rawName;
    const baseName = safeFileName(baseWithoutExt || "evidencia");
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}-${baseName}.${ext}`;
    const filePath = `ingresos/${ingresoId}/detalle-${detalleId}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from(EVIDENCIAS_BUCKET)
      .upload(filePath, file, {
        upsert: false,
        contentType: file.type || undefined,
      });

    if (uploadError) {
      throw new Error("No se pudo subir una evidencia de discrepancia.");
    }

    uploaded.push({
      path: filePath,
      name: file.name || `evidencia.${ext}`,
      contentType: file.type || null,
      size: Number(file.size ?? 0),
      uploadedAt: new Date().toISOString(),
    });
  }

  return uploaded;
}

export async function crearDiscrepancia(payload) {
  const {
    id_detalle_ingreso,
    ingreso_id,
    cantidad_recibida,
    observaciones = "",
    evidencias = [],
  } = payload;

  const evidenciasSubidas = await uploadEvidencias({
    files: evidencias,
    ingresoId: Number(ingreso_id),
    detalleId: Number(id_detalle_ingreso),
  });

  const { data, error } = await supabase.rpc("registrar_discrepancia_ingreso", {
    p_id_detalle_ingreso: Number(id_detalle_ingreso),
    p_cantidad_recibida: Number(cantidad_recibida),
    p_observaciones: observaciones?.trim() || null,
    p_evidencias: evidenciasSubidas,
  });

  if (error) throw error;
  return data;
}

export async function resolverDiscrepancia(payload) {
  const {
    id_discrepancia,
    id_detalle_ingreso,
    ingreso_id,
    cantidad_final,
    motivo = "",
    evidencias = [],
  } = payload;

  const evidenciasSubidas = await uploadEvidencias({
    files: evidencias,
    ingresoId: Number(ingreso_id),
    detalleId: Number(id_detalle_ingreso),
  });

  const { error } = await supabase.rpc("resolver_discrepancia_ingreso", {
    p_id_discrepancia: Number(id_discrepancia),
    p_cantidad_final:
      cantidad_final === null || cantidad_final === undefined || cantidad_final === ""
        ? null
        : Number(cantidad_final),
    p_motivo: motivo?.trim() || null,
    p_evidencias: evidenciasSubidas.length > 0 ? evidenciasSubidas : null,
  });

  if (error) throw error;
}

export async function anularDiscrepancia(payload) {
  const {
    id_discrepancia,
    id_detalle_ingreso,
    ingreso_id,
    motivo = "",
    evidencias = [],
  } = payload;

  const evidenciasSubidas = await uploadEvidencias({
    files: evidencias,
    ingresoId: Number(ingreso_id),
    detalleId: Number(id_detalle_ingreso),
  });

  const { error } = await supabase.rpc("anular_discrepancia_ingreso", {
    p_id_discrepancia: Number(id_discrepancia),
    p_motivo: motivo?.trim() || null,
    p_evidencias: evidenciasSubidas.length > 0 ? evidenciasSubidas : null,
  });

  if (error) throw error;
}

export async function getDiscrepanciaEvidenciaUrl(filePath, expiresIn = 3600) {
  const normalizedPath = normalizeStoragePath(filePath);
  if (!normalizedPath) {
    throw new Error("No hay ruta valida para la evidencia.");
  }

  const { data, error } = await supabase.storage
    .from(EVIDENCIAS_BUCKET)
    .createSignedUrl(normalizedPath, expiresIn);

  if (error) throw error;
  return data.signedUrl;
}
