import { supabase } from "../lib/supabase";
import { getCurrentPerfilId } from "./auth.service";

function buildCodigoIngreso(id) {
  return `ING-${String(id ?? 0).padStart(6, "0")}`;
}

function mapIngresoDetalle(detalle = []) {
  return detalle.map((item) => ({
    id: item.id,
    producto: item.producto?.nombre ?? item.productos?.nombre ?? "Producto",
    codigo_producto:
      item.producto?.codigo_producto ?? item.productos?.codigo_producto ?? "",
    unidad_medida:
      item.unidad_medida ||
      (item.producto?.unidad_medida ?? item.productos?.unidad_medida ?? ""),
    lote: item.lote,
    cantidad: Number(item.cantidad ?? 0),
    peso_kg: Number(item.peso_kg ?? 0),
    fecha_vencimiento: item.fecha_vencimiento,
    qr_lote: item.qr_lote,
    discrepancias: Array.isArray(item.discrepancias)
      ? item.discrepancias.length
      : 0,
  }));
}

function mapIngresoRow(row) {
  const detalle = mapIngresoDetalle(row.detalle_ingresos ?? []);
  const pesoTotal = detalle.reduce((acc, item) => acc + Number(item.peso_kg ?? 0), 0);
  const discrepancias = detalle.reduce(
    (acc, item) => acc + Number(item.discrepancias ?? 0),
    0,
  );

  return {
    id: row.id,
    codigo_ingreso: row.codigo_ingreso ?? buildCodigoIngreso(row.id),
    proveedor_id: row.id_proveedor,
    proveedor_nombre: row.proveedor?.nombre ?? "",
    fecha: row.creado_en ?? row.fecha,
    fecha_documento: row.fecha,
    estado: row.estado,
    observaciones: row.observaciones ?? "",
    detalle,
    peso_total_kg: Number(pesoTotal.toFixed(2)),
    discrepancias,
    acceso_vehicular_id: row.id_acceso_vehicular ?? null,
    acceso_vehicular: row.acceso_vehicular ?? null,
    usuario_nombre: row.usuario?.nombre_completo ?? "",
  };
}

export async function getIngresos() {
  const { data, error } = await supabase
    .from("ingresos")
    .select(
      `
        id,
        id_proveedor,
        id_usuario,
        id_acceso_vehicular,
        fecha,
        estado,
        observaciones,
        creado_en,
        proveedor:proveedores!ingresos_id_proveedor_fkey (
          id,
          nombre,
          ruc,
          tipo_producto
        ),
        usuario:perfiles!ingresos_id_usuario_fkey (
          id,
          nombre_completo,
          rol
        ),
        detalle_ingresos (
          id,
          id_producto,
          unidad_medida,
          lote,
          cantidad,
          peso_kg,
          fecha_vencimiento,
          qr_lote,
          creado_en,
          producto:productos!detalle_ingresos_id_producto_fkey (
            id,
            codigo_producto,
            nombre,
            unidad_medida,
            id_proveedor
          ),
          discrepancias (
            id
          )
        )
      `,
    )
    .order("creado_en", { ascending: false });

  if (error) throw error;
  return (data ?? []).map(mapIngresoRow);
}

export async function createIngreso(payload) {
  const {
    proveedor_id,
    fecha,
    observaciones = "",
    id_acceso_vehicular = null,
    items = [],
  } = payload;

  if (!Array.isArray(items) || items.length === 0) {
    throw new Error("Debes agregar al menos un producto.");
  }

  const perfilesId = await getCurrentPerfilId();
  const itemIds = items.map((item) => Number(item.id_producto));

  const { data: productos, error: productosError } = await supabase
    .from("productos")
    .select("id, id_proveedor, activo, nombre, codigo_producto")
    .in("id", itemIds);

  if (productosError) throw productosError;

  const productosMap = new Map(
    (productos ?? []).map((producto) => [Number(producto.id), producto]),
  );

  for (const item of items) {
    const producto = productosMap.get(Number(item.id_producto));
    if (!producto) {
      throw new Error(`El producto ${item.id_producto} no existe.`);
    }
    if (!producto.activo) {
      throw new Error(`El producto ${producto.nombre} esta inactivo.`);
    }
    if (Number(producto.id_proveedor) !== Number(proveedor_id)) {
      throw new Error(
        `El producto ${producto.nombre} no pertenece al proveedor seleccionado.`,
      );
    }
  }

  const { data: ingreso, error: ingresoError } = await supabase
    .from("ingresos")
    .insert({
      id_proveedor: Number(proveedor_id),
      id_usuario: perfilesId,
      id_acceso_vehicular: id_acceso_vehicular ? Number(id_acceso_vehicular) : null,
      fecha: fecha || new Date().toISOString().slice(0, 10),
      estado: "registrado",
      observaciones: observaciones?.trim() || null,
    })
    .select("*")
    .single();

  if (ingresoError) throw ingresoError;

  const detallePayload = items.map((item) => ({
    id_ingreso: ingreso.id,
    id_producto: Number(item.id_producto),
    lote: String(item.lote).trim().toUpperCase(),
    unidad_medida: String(item.unidad_medida).trim(),
    cantidad: Number(item.cantidad),
    peso_kg: Number(item.peso_kg ?? 0),
    fecha_vencimiento:
      item.fecha_vencimiento && String(item.fecha_vencimiento).trim()
        ? String(item.fecha_vencimiento).trim()
        : null,
  }));

  const { data: detalles, error: detalleError } = await supabase
    .from("detalle_ingresos")
    .insert(detallePayload)
    .select(
      `
        id,
        id_ingreso,
        id_producto,
        unidad_medida,
        lote,
        cantidad,
        peso_kg,
        fecha_vencimiento,
        qr_lote,
        creado_en
      `,
    );

  if (detalleError) {
    await supabase.from("ingresos").delete().eq("id", ingreso.id);
    throw detalleError;
  }

  return {
    ...ingreso,
    codigo_ingreso: buildCodigoIngreso(ingreso.id),
    detalle_ingresos: detalles ?? [],
  };
}

export async function getAccesosVehicularesDisponibles() {
  const { data, error } = await supabase
    .from("acceso_vehicular")
    .select(
      `
        id,
        placa,
        conductor,
        hora_entrada,
        hora_salida,
        proveedor:proveedores!acceso_vehicular_id_proveedor_fkey (
          nombre
        )
      `,
    )
    .order("hora_entrada", { ascending: false })
    .limit(20);

  if (error) throw error;

  return (data ?? []).map((row) => ({
    id: row.id,
    label: `${row.placa} · ${row.proveedor?.nombre ?? "Proveedor"} · ${new Date(
      row.hora_entrada,
    ).toLocaleString("es-PE", {
      dateStyle: "short",
      timeStyle: "short",
    })}`,
    value: String(row.id),
    abierto: !row.hora_salida,
  }));
}

export async function anularIngreso(id) {
  const { data, error } = await supabase
    .from("ingresos")
    .update({ estado: "anulado" })
    .eq("id", Number(id))
    .select("*")
    .single();

  if (error) throw error;
  return data;
}
