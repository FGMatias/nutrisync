import { supabase } from "../lib/supabase";

export async function getAccesosVehiculares({
  page = 1,
  pageSize = 10,
  search = "",
  proveedorId = "todos",
  soloEnPlanta = false,
  fechaInicio,
  fechaFin,
} = {}) {
  let query = supabase
    .from("acceso_vehicular")
    .select(
      `
      *,
      proveedores ( id, nombre )
    `,
      { count: "exact" },
    )
    .order("hora_entrada", { ascending: false });

  if (search) {
    query = query.or(`placa.ilike.%${search}%,conductor.ilike.%${search}%`);
  }

  if (proveedorId && proveedorId !== "todos") {
    query = query.eq("id_proveedor", proveedorId);
  }

  if (soloEnPlanta) {
    // Show vehicles that have no salida or a future salida (still en planta)
    query = query.or('hora_salida.is.null,hora_salida.gt.now()');
  }

  if (fechaInicio) {
    // Filter by start date (inclusive)
    query = query.gte('hora_entrada', fechaInicio);
  }

  if (fechaFin) {
    // Filter by end date (inclusive)
    query = query.lte('hora_entrada', fechaFin);
  }


  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  query = query.range(from, to);

  const { data, error, count } = await query;
  if (error) throw error;
  return { data, count };
}

export async function registrarEntradaVehicular(payload, file) {
  let ruta_manifiesto = null;

  if (file) {
    const fileExt = file.name.split(".").pop();
    const fileName = `${Date.now()}-${Math.random()
      .toString(36)
      .substring(2, 15)}.${fileExt}`;
    const filePath = `${fileName}`;

    // Upload to 'manifiestos' bucket
    const { error: uploadError } = await supabase.storage
      .from("manifiestos")
      .upload(filePath, file);

    if (uploadError) {
      console.error("Error uploading file:", uploadError);
      throw new Error("No se pudo subir el manifiesto");
    }
    
    ruta_manifiesto = filePath;
  }

  const { data, error } = await supabase
    .from("acceso_vehicular")
    .insert([{ ...payload, ruta_manifiesto }])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function registrarSalidaVehicular(id, hora_salida) {
  const { data, error } = await supabase
    .from("acceso_vehicular")
    .update({ hora_salida })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getManifiestoUrl(filePath) {
  let path = filePath;
  if (filePath.startsWith("http")) {
    const parts = filePath.split("/manifiestos/");
    if (parts.length > 1) {
      path = parts[1];
    } else {
      return filePath;
    }
  }
  const { data, error } = await supabase.storage
    .from("manifiestos")
    .createSignedUrl(path, 3600);
  if (error) throw error;
  return data.signedUrl;
}
