import { supabase } from "../lib/supabase";
import { offlineDb } from "../lib/offline-db";

async function syncCachedAlumnos(alumnos) {
  if (!Array.isArray(alumnos)) return;

  await offlineDb.alumnosCache.bulkPut(
    alumnos.map((alumno) => ({
      id: Number(alumno.id),
      nombre: alumno.nombre,
      apellido: alumno.apellido,
      dni: alumno.dni,
      grado: alumno.grado,
      seccion: alumno.seccion,
      codigo_qr: alumno.codigo_qr,
      activo: Boolean(alumno.activo),
      creado_en: alumno.creado_en ?? null,
      actualizado_en: alumno.actualizado_en ?? null,
    })),
  );
}

export async function getAlumnos() {
  let query = supabase
    .from("alumnos")
    .select("*")
    .order("creado_en", { ascending: false });

  const { data, error } = await query;
  if (error) throw error;
  await syncCachedAlumnos(data ?? []);
  return data;
}

export async function getAlumnoById(id) {
  const { data, error } = await supabase
    .from("alumnos")
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw error;
  return data;
}

export async function createAlumno(payload) {
  const { data, error } = await supabase
    .from("alumnos")
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  await syncCachedAlumnos(data ? [data] : []);
  return data;
}

export async function updateAlumno(id, payload) {
  const { data, error } = await supabase
    .from("alumnos")
    .update({ ...payload, actualizado_en: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  await syncCachedAlumnos(data ? [data] : []);
  return data;
}

export async function toggleActivoAlumno(id, activo) {
  const { data, error } = await supabase
    .from("alumnos")
    .update({ activo, actualizado_en: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  await syncCachedAlumnos(data ? [data] : []);
  return data;
}
