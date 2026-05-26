import { supabase } from "../lib/supabase";

export async function getAlumnos() {
  let query = supabase
    .from("alumnos")
    .select("*")
    .order("creado_en", { ascending: false });

  const { data, error } = await query;
  if (error) throw error;
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
  return data;
}
