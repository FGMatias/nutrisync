import { supabase } from "../lib/supabase";

export async function getProveedores({
  page = 1,
  pageSize = 10,
  search = "",
  activo,
} = {}) {
  let query = supabase
    .from("proveedores")
    .select("*", { count: "exact" })
    .order("creado_en", { ascending: false });

  if (search) {
    query = query.or(`nombre.ilike.%${search}%,ruc.ilike.%${search}%`);
  }

  if (activo !== undefined) {
    query = query.eq("activo", activo);
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  query = query.range(from, to);

  const { data, error, count } = await query;
  if (error) throw error;
  return { data, count };
}

export async function getProveedorById(id) {
  const { data, error } = await supabase
    .from("proveedores")
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw error;
  return data;
}

export async function createProveedor(payload) {
  const { data, error } = await supabase
    .from("proveedores")
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateProveedor(id, payload) {
  const { data, error } = await supabase
    .from("proveedores")
    .update({ ...payload, actualizado_en: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteProveedor(id) {
  const { error } = await supabase.from("proveedores").delete().eq("id", id);
  if (error) {
    if (error.code === "23503") {
      throw new Error(
        "No se puede eliminar: el proveedor tiene ingresos registrados.",
      );
    }
    throw error;
  }
}

export async function toggleActivoProveedor(id, activo) {
  const { data, error } = await supabase
    .from("proveedores")
    .update({ activo, actualizado_en: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}
