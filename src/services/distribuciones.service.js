import { parseAlumnoQrPayload } from "../lib/alumnos-qr";
import { offlineDb } from "../lib/offline-db";
import { supabase } from "../lib/supabase";
import { getCurrentPerfil } from "./auth.service";
import { getPlanesActivosHoy } from "./planesDistribucion.service";

function getNowParts() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return {
    fecha: `${year}-${month}-${day}`,
    hora: now.toTimeString().slice(0, 8),
    creado_en: now.toISOString(),
  };
}

function getLocalDateKey(dateLike) {
  const date = new Date(dateLike);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getTimestamp(dateLike, fallbackFecha = "", fallbackHora = "") {
  const primary = new Date(dateLike);
  if (!Number.isNaN(primary.getTime())) {
    return primary.getTime();
  }

  if (!fallbackFecha) {
    return 0;
  }

  const fallback = new Date(`${fallbackFecha}T${fallbackHora || "00:00:00"}`);
  if (Number.isNaN(fallback.getTime())) {
    return 0;
  }

  return fallback.getTime();
}

function buildAlumnoNombre(alumno = {}) {
  return [alumno.nombre, alumno.apellido].filter(Boolean).join(" ").trim();
}

function mapDistribucionRow(row) {
  const alumno = row.alumno ?? row.alumnos ?? {};
  const docente = row.docente ?? row.perfiles ?? {};
  const alumnoNombre = row.alumno_nombre_completo ?? buildAlumnoNombre(alumno);
  const createdAt = row.creado_en ?? row.created_at ?? null;
  const fecha = createdAt ? getLocalDateKey(createdAt) : row.fecha ?? "";
  const hora = String(row.hora ?? "").slice(0, 8);
  const timestamp = getTimestamp(createdAt, fecha, hora);

  return {
    id: row.id,
    alumno_id: Number(row.id_alumno ?? row.alumno_id),
    alumno_nombre: alumnoNombre,
    nombre: alumno.nombre ?? row.nombre ?? "",
    apellido: alumno.apellido ?? row.apellido ?? "",
    dni: alumno.dni ?? row.dni ?? "",
    grado: alumno.grado ?? row.grado ?? "",
    seccion: alumno.seccion ?? row.seccion ?? "",
    fecha,
    fecha_key: fecha,
    hora,
    docente: docente.nombre_completo ?? row.docente_nombre ?? "Usuario",
    docente_id: Number(row.id_docente ?? row.docente_id),
    origen: row.origen ?? "online",
    sincronizado:
      typeof row.sincronizado === "boolean" ? row.sincronizado : true,
    observaciones: row.observaciones ?? "",
    creado_en: createdAt ?? `${row.fecha}T${hora || "00:00:00"}`,
    timestamp,
    pendiente_local: Boolean(row.pendiente_local),
  };
}

function mapPendingDistribucion(row) {
  return mapDistribucionRow({
    id: `local-${row.id}`,
    alumno_id: row.alumno_id,
    alumno_nombre_completo: row.alumno_nombre,
    nombre: row.nombre,
    apellido: row.apellido,
    dni: row.dni,
    grado: row.grado,
    seccion: row.seccion,
    fecha: row.fecha,
    hora: row.hora,
    docente_nombre: row.docente_nombre,
    docente_id: row.docente_id,
    origen: "offline",
    sincronizado: false,
    observaciones: row.observaciones ?? "",
    creado_en: row.created_at,
    pendiente_local: true,
  });
}

function sortDistribuciones(items) {
  return [...items].sort((a, b) => {
    const left = Number(a.timestamp ?? 0);
    const right = Number(b.timestamp ?? 0);
    return right - left;
  });
}

function isConnectivityError(error) {
  const message = String(error?.message ?? "").toLowerCase();
  return (
    !navigator.onLine ||
    message.includes("failed to fetch") ||
    message.includes("network") ||
    message.includes("fetch")
  );
}

function isDuplicateDistribucionError(error) {
  return (
    error?.code === "23505" ||
    String(error?.message ?? "").toLowerCase().includes("duplicate") ||
    String(error?.message ?? "").toLowerCase().includes("ya fue registrada")
  );
}

async function getAlumnoByCodigoQr(codigoQr) {
  const getCachedAlumno = () =>
    offlineDb.alumnosCache
      .where("codigo_qr")
      .equals(codigoQr)
      .and((item) => Boolean(item.activo))
      .first();

  if (!navigator.onLine) {
    return (await getCachedAlumno()) ?? null;
  }

  try {
    const { data, error } = await supabase
      .from("alumnos")
      .select("id, nombre, apellido, dni, grado, seccion, codigo_qr, activo")
      .eq("codigo_qr", codigoQr)
      .eq("activo", true)
      .maybeSingle();

    if (error) throw error;
    return data;
  } catch (error) {
    if (isConnectivityError(error)) {
      return (await getCachedAlumno()) ?? null;
    }

    throw error;
  }
}

async function callRegistrarDistribucionQr(codigoQr, items, origen = "online") {
  const p_items = items.map((i) => ({
    id_producto: Number(i.id_producto),
    cantidad: Number(i.cantidad_por_alumno ?? i.cantidad ?? 1),
  }));

  const { data, error } = await supabase.rpc("registrar_distribucion_qr", {
    p_codigo_qr: codigoQr,
    p_items: p_items,
    p_origen: origen,
    p_sincronizado: true,
  });

  if (error) throw error;
  return data;
}

async function addPendingDistribucion(record) {
  const id = await offlineDb.distribucionesPendientes.add(record);
  return mapPendingDistribucion({ id, ...record });
}

export async function syncPendingDistribuciones() {
  if (!navigator.onLine) {
    return { synced: 0 };
  }

  const pending = await offlineDb.distribucionesPendientes
    .orderBy("created_at")
    .toArray();

  let synced = 0;

  for (const item of pending) {
    try {
      const items = Array.isArray(item.items) && item.items.length > 0
        ? item.items
        : await getPlanesActivosHoy();

      if (items.length === 0) {
        await offlineDb.distribucionesPendientes.delete(item.id);
        synced += 1;
        continue;
      }

      await callRegistrarDistribucionQr(item.codigo_qr, items, "offline");
      await offlineDb.distribucionesPendientes.delete(item.id);
      synced += 1;
    } catch (error) {
      if (isDuplicateDistribucionError(error)) {
        await offlineDb.distribucionesPendientes.delete(item.id);
        synced += 1;
        continue;
      }

      if (isConnectivityError(error)) {
        break;
      }

      throw error;
    }
  }

  return { synced };
}

export async function getDistribuciones() {
  if (navigator.onLine) {
    await syncPendingDistribuciones();
  }

  const pending = await offlineDb.distribucionesPendientes.toArray();

  if (!navigator.onLine) {
    return sortDistribuciones(pending.map(mapPendingDistribucion));
  }

  const { data, error } = await supabase
    .from("distribuciones")
    .select(
      `
        id,
        id_alumno,
        id_docente,
        fecha,
        hora,
        origen,
        sincronizado,
        observaciones,
        creado_en,
        alumno:alumnos!distribuciones_id_alumno_fkey (
          id,
          nombre,
          apellido,
          dni,
          grado,
          seccion
        ),
        docente:perfiles!distribuciones_id_docente_fkey (
          id,
          nombre_completo
        )
      `,
    )
    .order("fecha", { ascending: false })
    .order("hora", { ascending: false });

  if (error) throw error;

  const remote = (data ?? []).map(mapDistribucionRow);
  const local = pending.map(mapPendingDistribucion);
  return sortDistribuciones([...remote, ...local]);
}

export async function registerDistribucionFromQr(rawValue) {
  const parsed = parseAlumnoQrPayload(rawValue);
  if (!parsed) {
    throw new Error(
      "QR denegado. Solo se aceptan codigos generados en la seccion de Alumnos.",
    );
  }

  const alumno = await getAlumnoByCodigoQr(parsed.qr);
  if (!alumno) {
    throw new Error(
      "QR denegado. El alumno no existe o ya no se encuentra activo.",
    );
  }

  if (parsed.id && Number(parsed.id) !== Number(alumno.id)) {
    throw new Error("QR denegado. Los datos del alumno no coinciden.");
  }

  const perfil = await getCurrentPerfil();
  const docenteId = perfil.id;
  const now = getNowParts();

  const baseRecord = {
    alumno_id: Number(alumno.id),
    nombre: alumno.nombre,
    apellido: alumno.apellido,
    alumno_nombre: buildAlumnoNombre(alumno),
    dni: alumno.dni,
    grado: alumno.grado,
    seccion: alumno.seccion,
    docente_id: Number(docenteId),
    docente_nombre: perfil?.nombre_completo ?? "Usuario",
    fecha: now.fecha,
    hora: now.hora,
    codigo_qr: alumno.codigo_qr,
    observaciones: null,
    created_at: now.creado_en,
  };

  let planItems = [];
  if (navigator.onLine) {
    planItems = await getPlanesActivosHoy();
  }

  if (!navigator.onLine || planItems.length === 0) {
    if (!navigator.onLine) {
      const offlineDistribucion = await addPendingDistribucion({ ...baseRecord, items: [] });
      return {
        status: "offline",
        alumno,
        distribucion: offlineDistribucion,
        message: "Escaneo registrado. Se sincronizara cuando vuelva el internet.",
      };
    }
    throw new Error(
      "No hay plan de distribucion activo para hoy. Crea un plan antes de escanear.",
    );
  }

  try {
    await callRegistrarDistribucionQr(alumno.codigo_qr, planItems, "online");

    return {
      status: "online",
      alumno,
      distribucion: baseRecord,
      message: "Escaneo registrado correctamente.",
    };
  } catch (error) {
    if (isDuplicateDistribucionError(error)) {
      throw new Error(
        "QR denegado. Este alumno ya tiene una distribucion registrada hoy.",
      );
    }

    if (isConnectivityError(error)) {
      const offlineDistribucion = await addPendingDistribucion({
        ...baseRecord,
        items: planItems,
      });
      return {
        status: "offline",
        alumno,
        distribucion: offlineDistribucion,
        message:
          "Escaneo registrado sin internet. Se enviara a distribuciones cuando vuelva la conexion.",
      };
    }

    throw error;
  }
}
