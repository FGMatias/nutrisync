import { supabase } from "../lib/supabase";

const TYPE_MAP = {
  insert_ingresos: "INGRESO_CREADO",
  update_ingresos: "INGRESO_CREADO",
  delete_ingresos: "INGRESO_CREADO",
  insert_detalle_ingresos: "INGRESO_CREADO",
  update_detalle_ingresos: "INGRESO_CREADO",
  delete_detalle_ingresos: "INGRESO_CREADO",
  insert_ajustes_stock: "STOCK_AJUSTADO",
  update_ajustes_stock: "STOCK_AJUSTADO",
  delete_ajustes_stock: "STOCK_AJUSTADO",
  insert_proveedores: "PROVEEDOR_ACTUALIZADO",
  update_proveedores: "PROVEEDOR_ACTUALIZADO",
  delete_proveedores: "PROVEEDOR_ACTUALIZADO",
  insert_productos: "PRODUCTO",
  update_productos: "PRODUCTO",
  delete_productos: "PRODUCTO",
  insert_distribuciones: "DISTRIBUCION_QR",
  update_distribuciones: "DISTRIBUCION_QR",
  delete_distribuciones: "DISTRIBUCION_QR",
  insert_alumnos: "ALUMNO_REGISTRADO",
  update_alumnos: "ALUMNO_REGISTRADO",
  delete_alumnos: "ALUMNO_REGISTRADO",
  insert_reportes: "REPORTE_GENERADO",
  update_reportes: "REPORTE_GENERADO",
  delete_reportes: "REPORTE_GENERADO",
  insert_acceso_vehicular: "PROVEEDOR_ACTUALIZADO",
  update_acceso_vehicular: "PROVEEDOR_ACTUALIZADO",
  delete_acceso_vehicular: "PROVEEDOR_ACTUALIZADO",
};

function mapMovimiento(row) {
  const tipoNormalizado = TYPE_MAP[String(row.tipo_accion).toLowerCase()] ?? String(row.tipo_accion).toUpperCase();
  return {
    id: row.id,
    tipo_accion: tipoNormalizado,
    tipo_accion_raw: row.tipo_accion,
    descripcion: row.descripcion,
    usuario: row.usuario?.nombre_completo ?? "Sistema",
    rol: row.usuario?.rol ?? "",
    fecha: row.creado_en,
    tabla_origen: row.tabla_origen,
    id_registro: row.id_registro,
    metadata: row.metadata ?? {},
  };
}

export async function getMovimientos() {
  const { data, error } = await supabase
    .from("registro_movimientos")
    .select(
      `
        id,
        tipo_accion,
        descripcion,
        id_usuario,
        tabla_origen,
        id_registro,
        metadata,
        creado_en,
        usuario:perfiles!registro_movimientos_id_usuario_fkey (
          id,
          nombre_completo,
          rol
        )
      `,
    )
    .order("creado_en", { ascending: false });

  if (error) throw error;
  return (data ?? []).map(mapMovimiento);
}
