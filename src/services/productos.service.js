import { supabase } from "../lib/supabase";

function normalizeSearch(search) {
  return search.trim().replaceAll("%", "\\%").replaceAll(",", "");
}

function normalizeText(value) {
  return String(value ?? "").trim().replace(/\s+/g, " ");
}

function buildCodigoProducto(nombre) {
  const base =
    normalizeText(nombre)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 18) || "PROD";

  const stamp = Date.now().toString(36).toUpperCase();
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${base}-${stamp}-${suffix}`.slice(0, 50);
}

function mapInventarioRow(row) {
  return {
    ...row,
    unidad: row.unidad_medida,
    codigo: row.codigo_producto,
    proveedor_nombre: row.proveedor ?? "",
    stock_actual: Number(row.stock_actual ?? 0),
  };
}

export async function getInventario() {
  const { data, error } = await supabase
    .from("vw_inventario_actual")
    .select("*")
    .order("nombre", { ascending: true });

  if (error) throw error;
  return (data ?? []).map(mapInventarioRow);
}

export async function getProductosPorProveedor(idProveedor) {
  if (!idProveedor) return [];

  const { data, error } = await supabase
    .from("productos")
    .select(
      "id, codigo_producto, nombre, categoria, unidad_medida, stock_minimo, stock_maximo, id_proveedor, activo",
    )
    .eq("id_proveedor", idProveedor)
    .eq("activo", true)
    .order("nombre", { ascending: true });

  if (error) throw error;
  return (data ?? []).map((row) => ({
    ...row,
    codigo: row.codigo_producto,
    unidad: row.unidad_medida,
  }));
}

export async function getProductoById(id) {
  const { data, error } = await supabase
    .from("productos")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw error;
  return data;
}

export async function createProducto(payload) {
  const {
    codigo_producto,
    nombre,
    categoria = "General",
    unidad_medida = "kg",
    stock_minimo = 0,
    stock_maximo = 100,
    id_proveedor = null,
    activo = true,
  } = payload;

  const { data, error } = await supabase
    .from("productos")
    .insert({
      codigo_producto: normalizeText(codigo_producto) || buildCodigoProducto(nombre),
      nombre: normalizeText(nombre),
      categoria: normalizeText(categoria) || "General",
      unidad_medida: normalizeText(unidad_medida) || "kg",
      stock_minimo: Number(stock_minimo),
      stock_maximo: Number(stock_maximo),
      id_proveedor: id_proveedor ? Number(id_proveedor) : null,
      activo: Boolean(activo),
    })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function updateProducto(id, payload) {
  const {
    codigo_producto,
    nombre,
    categoria = "General",
    unidad_medida = "kg",
    stock_minimo = 0,
    stock_maximo = 100,
    id_proveedor = null,
    activo = true,
  } = payload;

  const updatePayload = {
    nombre: normalizeText(nombre),
    categoria: normalizeText(categoria) || "General",
    unidad_medida: normalizeText(unidad_medida) || "kg",
    stock_minimo: Number(stock_minimo),
    stock_maximo: Number(stock_maximo),
    id_proveedor: id_proveedor ? Number(id_proveedor) : null,
    activo: Boolean(activo),
  };

  if (normalizeText(codigo_producto)) {
    updatePayload.codigo_producto = normalizeText(codigo_producto).toUpperCase();
  }

  const { data, error } = await supabase
    .from("productos")
    .update(updatePayload)
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function deleteProducto(id) {
  const { error } = await supabase.from("productos").delete().eq("id", id);

  if (error) {
    if (error.code === "23503") {
      throw new Error(
        "No se puede eliminar porque el producto tiene movimientos o registros asociados.",
      );
    }
    throw error;
  }
}

export async function toggleActivoProducto(id, activo) {
  const { data, error } = await supabase
    .from("productos")
    .update({ activo: Boolean(activo) })
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function createAjusteStock(payload) {
  const {
    id_producto,
    tipo_ajuste = "manual",
    cantidad_delta,
    motivo = "Ajuste de stock",
  } = payload;

  const delta = Number(cantidad_delta);
  if (!Number.isFinite(delta) || delta === 0) {
    throw new Error("La cantidad a ajustar debe ser distinta de cero.");
  }

  const etiquetaTipo =
    tipo_ajuste === "correccion"
      ? "Correccion"
      : tipo_ajuste === "sincronizacion"
        ? "Sincronizacion"
        : "Manual";

  const { data, error } = await supabase.rpc("ajustar_stock_producto", {
    p_id_producto: Number(id_producto),
    p_delta: delta,
    p_motivo: `${etiquetaTipo}: ${motivo.trim() || "Ajuste de stock"}`,
  });

  if (error) throw error;
  return data;
}

export async function getInventarioFiltrado({
  search = "",
  categoria = "todas",
  estado = "todos",
} = {}) {
  const inventario = await getInventario();
  const searchText = normalizeSearch(search).toLowerCase();

  return inventario.filter((row) => {
    const matchesSearch =
      !searchText ||
      [row.nombre, row.codigo_producto, row.codigo, row.proveedor]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(searchText));

    const matchesCategoria =
      categoria === "todas" || String(row.categoria) === categoria;

    const actual = Number(row.stock_actual ?? 0);
    const minimo = Number(row.stock_minimo ?? 0);
    const maximo = Number(row.stock_maximo ?? 0);
    const ratio = minimo > 0 ? actual / minimo : actual > 0 ? 1 : 0;
    const nivel =
      !row.activo
        ? "inactivo"
        : actual <= 0
          ? "sin_stock"
          : actual <= minimo
            ? "stock_bajo"
            : actual >= maximo
              ? "stock_alto"
              : "estable";

    const matchesEstado =
      estado === "todos" ||
      (estado === "normal" &&
        (nivel === "estable" || nivel === "stock_alto" || ratio >= 1)) ||
      (estado === "bajo" && nivel === "stock_bajo") ||
      (estado === "critico" &&
        (nivel === "sin_stock" || (ratio > 0 && ratio < 0.5)));

    return matchesSearch && matchesCategoria && matchesEstado;
  });
}
