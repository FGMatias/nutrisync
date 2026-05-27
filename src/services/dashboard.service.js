import { supabase } from "../lib/supabase";

function getDateKey(dateLike) {
  const date = new Date(dateLike);
  if (Number.isNaN(date.getTime())) return "";
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getCurrentMonthRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return { start: getDateKey(start), end: getDateKey(end) };
}

function getCurrentWeekMondayToFriday() {
  const now = new Date();
  const day = now.getDay();
  const offsetToMonday = (day + 6) % 7;
  const monday = new Date(now);
  monday.setDate(now.getDate() - offsetToMonday);
  monday.setHours(0, 0, 0, 0);

  const labels = ["Lun", "Mar", "Mie", "Jue", "Vie"];
  const days = labels.map((label, idx) => {
    const dt = new Date(monday);
    dt.setDate(monday.getDate() + idx);
    return { label, key: getDateKey(dt) };
  });

  return {
    from: days[0]?.key,
    to: days[days.length - 1]?.key,
    days,
  };
}

const TIPO_MAP = {
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
  return {
    id: row.id,
    tipo_accion: TIPO_MAP[String(row.tipo_accion).toLowerCase()] ?? String(row.tipo_accion).toUpperCase(),
    descripcion: row.descripcion,
    usuario: row.usuario?.nombre_completo ?? "Sistema",
    fecha: row.creado_en,
  };
}

export async function getDashboardMetrics() {
  const todayKey = getDateKey(new Date());
  const monthRange = getCurrentMonthRange();
  const week = getCurrentWeekMondayToFriday();

  const [
    alumnosCountRes,
    distribucionesHoyRes,
    distribucionesSemanaRes,
    ingresosMesRes,
    inventarioRes,
    movimientosRes,
  ] = await Promise.all([
    supabase
      .from("alumnos")
      .select("id", { count: "exact", head: true })
      .eq("activo", true),

    supabase
      .from("distribuciones")
      .select("id, id_alumno")
      .eq("fecha", todayKey),

    supabase
      .from("distribuciones")
      .select("id, fecha")
      .gte("fecha", week.from)
      .lte("fecha", week.to),

    supabase
      .from("ingresos")
      .select("id", { count: "exact", head: true })
      .gte("fecha", monthRange.start)
      .lte("fecha", monthRange.end)
      .neq("estado", "anulado"),

    supabase
      .from("vw_inventario_actual")
      .select("id, nombre, unidad_medida, stock_actual, stock_minimo, activo")
      .eq("activo", true)
      .order("nombre", { ascending: true }),

    supabase
      .from("registro_movimientos")
      .select(
        `
          id,
          tipo_accion,
          descripcion,
          creado_en,
          usuario:perfiles!registro_movimientos_id_usuario_fkey (
            id,
            nombre_completo
          )
        `,
      )
      .order("creado_en", { ascending: false })
      .limit(5),
  ]);

  if (alumnosCountRes.error) throw alumnosCountRes.error;
  if (distribucionesHoyRes.error) throw distribucionesHoyRes.error;
  if (distribucionesSemanaRes.error) throw distribucionesSemanaRes.error;
  if (ingresosMesRes.error) throw ingresosMesRes.error;
  if (inventarioRes.error) throw inventarioRes.error;
  if (movimientosRes.error) throw movimientosRes.error;

  const totalAlumnos = Number(alumnosCountRes.count ?? 0);
  const distribucionesHoy = distribucionesHoyRes.data ?? [];
  const alumnosConDistribucionHoy = new Set(
    distribucionesHoy.map((item) => Number(item.id_alumno)).filter(Boolean),
  ).size;

  const porcentajeCobertura =
    totalAlumnos > 0
      ? Math.round((alumnosConDistribucionHoy / totalAlumnos) * 100)
      : 0;

  const weekCounter = new Map();
  (distribucionesSemanaRes.data ?? []).forEach((row) => {
    const key = getDateKey(row.fecha);
    weekCounter.set(key, (weekCounter.get(key) ?? 0) + 1);
  });

  const distribucionesEstaSemanaPorDia = week.days.map((d) => ({
    dia: d.label,
    cantidad: weekCounter.get(d.key) ?? 0,
  }));

  const inventario = inventarioRes.data ?? [];
  const stockBajo = inventario.filter(
    (item) => Number(item.stock_actual ?? 0) < Number(item.stock_minimo ?? 0),
  );

  const alertasStock = stockBajo
    .map((item) => ({
      producto: item.nombre,
      stock: Number(item.stock_actual ?? 0),
      minimo: Number(item.stock_minimo ?? 0),
      unidad: item.unidad_medida || "",
      ratio:
        Number(item.stock_minimo ?? 0) > 0
          ? Number(item.stock_actual ?? 0) / Number(item.stock_minimo ?? 1)
          : 0,
    }))
    .sort((a, b) => a.ratio - b.ratio)
    .slice(0, 3)
    .map(({ ratio, ...rest }) => rest);

  return {
    totalAlumnos,
    alumnosConDistribucionHoy,
    porcentajeCobertura,
    productosConStockBajo: stockBajo.length,
    ingresosEsteMes: Number(ingresosMesRes.count ?? 0),
    distribucionesHoy: distribucionesHoy.length,
    distribucionesEstaSemanaPorDia,
    alertasStock,
    ultimosMovimientos: (movimientosRes.data ?? []).map(mapMovimiento),
  };
}
