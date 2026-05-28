import { supabase } from "../lib/supabase";
import { getCurrentPerfil } from "./auth.service";

function localDateISO() {
  const now = new Date();
  return [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("-");
}

const PRODUCTO_SELECT =
  "id, nombre, unidad_medida";

function planSelect() {
  return `
    id,
    fecha,
    id_producto,
    cantidad_por_alumno,
    activo,
    creado_en,
    producto:productos!planes_distribucion_id_producto_fkey(${PRODUCTO_SELECT})
  `;
}

export async function getPlanesDistribucion({ fecha, activo } = {}) {
  let query = supabase
    .from("planes_distribucion")
    .select(planSelect())
    .order("fecha", { ascending: false })
    .order("creado_en", { ascending: false });

  if (fecha) query = query.eq("fecha", fecha);
  if (activo !== undefined) query = query.eq("activo", activo);

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function getPlanesActivosHoy() {
  const today = localDateISO();
  const { data, error } = await supabase
    .from("planes_distribucion")
    .select("id_producto, cantidad_por_alumno")
    .eq("fecha", today)
    .eq("activo", true);
  if (error) throw error;
  return data ?? [];
}

export async function getAlumnosActivosCount() {
  const { count, error } = await supabase
    .from("alumnos")
    .select("id", { count: "exact", head: true })
    .eq("activo", true);
  if (error) throw error;
  return count ?? 0;
}

export async function createPlanDistribucion(payload) {
  const perfil = await getCurrentPerfil();
  const { data, error } = await supabase
    .from("planes_distribucion")
    .insert({
      fecha: payload.fecha,
      id_producto: Number(payload.id_producto),
      cantidad_por_alumno: Number(payload.cantidad_por_alumno),
      activo: payload.activo ?? true,
      creado_por: perfil.id,
    })
    .select(planSelect())
    .single();

  if (error) {
    if (error.code === "23505")
      throw new Error("Ya existe un plan para ese producto en esa fecha.");
    throw error;
  }
  return data;
}

export async function updatePlanDistribucion(id, payload) {
  const { data, error } = await supabase
    .from("planes_distribucion")
    .update({
      fecha: payload.fecha,
      id_producto: Number(payload.id_producto),
      cantidad_por_alumno: Number(payload.cantidad_por_alumno),
      activo: payload.activo ?? true,
    })
    .eq("id", id)
    .select(planSelect())
    .single();

  if (error) {
    if (error.code === "23505")
      throw new Error("Ya existe un plan para ese producto en esa fecha.");
    throw error;
  }
  return data;
}

export async function deletePlanDistribucion(id) {
  const { error } = await supabase.from("planes_distribucion").delete().eq("id", id);
  if (error) throw error;
}
