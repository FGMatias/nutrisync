import { supabase } from "../lib/supabase";

export async function getUsuarios({
  page = 1,
  pageSize = 10,
  search = "",
  rol,
  activo,
} = {}) {
  let query = supabase
    .from("perfiles")
    .select("*", { count: "exact" })
    .order("creado_en", { ascending: false });

  if (search) {
    query = query.or(
      `nombre_completo.ilike.%${search}%,email.ilike.%${search}%`,
    );
  }
  if (rol) query = query.eq("rol", rol);
  if (activo !== undefined) query = query.eq("activo", activo);

  const from = (page - 1) * pageSize;
  query = query.range(from, from + pageSize - 1);

  const { data, error, count } = await query;
  if (error) throw error;
  return { data, count };
}

export async function getUsuarioById(id) {
  const { data, error } = await supabase
    .from("perfiles")
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw error;
  return data;
}

export async function createUsuario({
  email,
  password,
  nombre_completo,
  dni,
  telefono,
  rol,
  activo,
  id_alumno,
}) {
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { nombre_completo, rol } },
  });
  if (authError) throw authError;

  const { data, error } = await supabase
    .from("perfiles")
    .insert({
      id_usuario_auth: authData.user.id,
      email,
      nombre_completo,
      dni: dni || null,
      telefono: telefono || null,
      rol,
      activo,
      id_alumno: id_alumno || null,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateUsuario(
  id,
  { nombre_completo, dni, telefono, rol, activo, id_alumno },
) {
  const { data, error } = await supabase
    .from("perfiles")
    .update({
      nombre_completo,
      dni: dni || null,
      telefono: telefono || null,
      rol,
      activo,
      id_alumno: id_alumno || null,
      actualizado_en: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function toggleActivoUsuario(id, activo) {
  const { data, error } = await supabase
    .from("perfiles")
    .update({ activo, actualizado_en: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteUsuario(id) {
  const { error } = await supabase.from("perfiles").delete().eq("id", id);
  if (error) {
    if (error.code === "23503") {
      throw new Error(
        "No se puede eliminar: el usuario tiene registros vinculados.",
      );
    }
    throw error;
  }
}

export async function sendPasswordReset(email) {
  const { error } = await supabase.auth.resetPasswordForEmail(email);
  if (error) throw error;
}
