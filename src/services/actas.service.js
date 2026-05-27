import { supabase } from "../lib/supabase";
import { getCurrentPerfilId } from "./auth.service";

const ACTAS_BUCKET = "actas-recepcion";

function buildCodigoIngreso(id) {
  return `ING-${String(id ?? 0).padStart(6, "0")}`;
}

function buildCodigoActa(id) {
  return `ACTA-${String(id ?? 0).padStart(6, "0")}`;
}

function mapDetalleActa(detalle = []) {
  return detalle.map((item) => ({
    id: item.id,
    producto: item.producto?.nombre ?? "Producto",
    codigo_producto: item.producto?.codigo_producto ?? "",
    lote: item.lote ?? "",
    cantidad: Number(item.cantidad ?? 0),
    unidad_medida: item.unidad_medida || item.producto?.unidad_medida || "",
    peso_kg: Number(item.peso_kg ?? 0),
    fecha_vencimiento: item.fecha_vencimiento ?? null,
  }));
}

function mapActaRow(row) {
  const detalle = mapDetalleActa(row.ingreso?.detalle_ingresos ?? []);
  const pesoTotal = detalle.reduce((acc, item) => acc + Number(item.peso_kg ?? 0), 0);

  return {
    id: Number(row.id),
    codigo_acta: buildCodigoActa(row.id),
    id_ingreso: Number(row.id_ingreso),
    codigo_ingreso: buildCodigoIngreso(row.id_ingreso),
    ruta_pdf: row.ruta_pdf ?? "",
    generado_en: row.generado_en,
    generado_por: row.generador?.nombre_completo ?? "",
    proveedor: row.ingreso?.proveedor?.nombre ?? "",
    fecha_ingreso: row.ingreso?.creado_en ?? row.ingreso?.fecha ?? row.generado_en,
    estado_ingreso: row.ingreso?.estado ?? "registrado",
    observaciones: row.ingreso?.observaciones ?? "",
    detalle,
    peso_total_kg: Number(pesoTotal.toFixed(2)),
  };
}

function normalizeStoragePath(filePath) {
  if (!filePath) return "";
  if (filePath.startsWith("http")) {
    const marker = `/storage/v1/object/sign/${ACTAS_BUCKET}/`;
    const markerIndex = filePath.indexOf(marker);
    if (markerIndex >= 0) {
      const tail = filePath.slice(markerIndex + marker.length);
      return tail.split("?")[0] ?? "";
    }

    const publicMarker = `/storage/v1/object/public/${ACTAS_BUCKET}/`;
    const publicIndex = filePath.indexOf(publicMarker);
    if (publicIndex >= 0) {
      return filePath.slice(publicIndex + publicMarker.length).split("?")[0] ?? "";
    }
  }
  return filePath;
}

export async function getActasRecepcion() {
  const { data, error } = await supabase
    .from("actas_recepcion")
    .select(
      `
        id,
        id_ingreso,
        ruta_pdf,
        generado_en,
        generador:perfiles!actas_recepcion_generado_por_fkey (
          id,
          nombre_completo
        ),
        ingreso:ingresos!actas_recepcion_id_ingreso_fkey (
          id,
          fecha,
          estado,
          observaciones,
          creado_en,
          proveedor:proveedores!ingresos_id_proveedor_fkey (
            id,
            nombre
          ),
          detalle_ingresos (
            id,
            lote,
            cantidad,
            unidad_medida,
            peso_kg,
            fecha_vencimiento,
            producto:productos!detalle_ingresos_id_producto_fkey (
              id,
              nombre,
              codigo_producto,
              unidad_medida
            )
          )
        )
      `,
    )
    .order("generado_en", { ascending: false });

  if (error) throw error;
  return (data ?? []).map(mapActaRow);
}

export async function guardarActaRecepcion({
  ingresoId,
  pdfBlob,
  codigoIngreso,
}) {
  if (!ingresoId) {
    throw new Error("No se pudo identificar el ingreso para generar el acta.");
  }
  if (!(pdfBlob instanceof Blob)) {
    throw new Error("No se pudo generar el archivo PDF del acta.");
  }

  const perfilId = await getCurrentPerfilId();

  const timestamp = Date.now();
  const safeCode = String(codigoIngreso ?? `ING-${ingresoId}`).replace(/[^A-Za-z0-9_-]/g, "_");
  const filePath = `ingresos/${ingresoId}/acta-${safeCode}-${timestamp}.pdf`;

  const { data: previousActa, error: previousError } = await supabase
    .from("actas_recepcion")
    .select("id, ruta_pdf")
    .eq("id_ingreso", Number(ingresoId))
    .maybeSingle();

  if (previousError) {
    throw previousError;
  }

  const { error: uploadError } = await supabase.storage
    .from(ACTAS_BUCKET)
    .upload(filePath, pdfBlob, {
      contentType: "application/pdf",
      upsert: true,
    });

  if (uploadError) {
    throw new Error("No se pudo subir el PDF del acta al almacenamiento.");
  }

  const payload = {
    id_ingreso: Number(ingresoId),
    ruta_pdf: filePath,
    generado_por: Number(perfilId),
    generado_en: new Date().toISOString(),
  };

  const { data: acta, error: upsertError } = await supabase
    .from("actas_recepcion")
    .upsert(payload, { onConflict: "id_ingreso" })
    .select("id, id_ingreso, ruta_pdf, generado_en")
    .single();

  if (upsertError) {
    throw upsertError;
  }

  const previousPath = normalizeStoragePath(previousActa?.ruta_pdf ?? "");
  if (previousPath && previousPath !== filePath) {
    await supabase.storage.from(ACTAS_BUCKET).remove([previousPath]);
  }

  return acta;
}

export async function getActaFirmadaUrl(rutaPdf, expiresIn = 3600) {
  const normalizedPath = normalizeStoragePath(rutaPdf);
  if (!normalizedPath) {
    throw new Error("No hay una ruta de acta valida para descargar.");
  }

  const { data, error } = await supabase.storage
    .from(ACTAS_BUCKET)
    .createSignedUrl(normalizedPath, expiresIn);

  if (error) {
    throw error;
  }

  return data.signedUrl;
}
