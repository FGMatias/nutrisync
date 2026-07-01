import { supabase } from "../lib/supabase";

function localDateString(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() - offsetDays);
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ].join("-");
}

export async function getAlumnoVinculado(id_alumno) {
  const { data, error } = await supabase
    .from("alumnos")
    .select("id, nombre, apellido, grado, seccion")
    .eq("id", id_alumno)
    .eq("activo", true)
    .single();
  if (error) throw error;
  return data;
}

export async function getDistribucionesAlumno(id_alumno) {
  const desde = localDateString(9);
  const { data, error } = await supabase
    .from("distribuciones")
    .select(
      `id, fecha, hora,
       docente:perfiles!distribuciones_id_docente_fkey(nombre_completo)`,
    )
    .eq("id_alumno", id_alumno)
    .gte("fecha", desde)
    .order("fecha", { ascending: false });
  if (error) throw error;
  return data ?? [];
}
