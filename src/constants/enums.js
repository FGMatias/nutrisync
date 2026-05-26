export const ESTADO_INGRESO = {
  REGISTRADO: "registrado",
  CONFORME: "conforme",
  CON_DISCREPANCIA: "con_discrepancia",
  ANULADO: "anulado",
};

export const ORIGEN_DISTRIBUCION = {
  ONLINE: "online",
  OFFLINE: "offline",
  SINCRONIZADO: "sincronizado",
};

export const ESTADO_CHECKLIST = {
  PENDIENTE: "pendiente",
  CONFORME: "conforme",
  CON_OBSERVACIONES: "con_observaciones",
};

export const TIPO_REPORTE = {
  INVENTARIO: "inventario",
  DISTRIBUCIONES: "distribuciones",
  MOVIMIENTOS: "movimientos",
  RECEPCION: "recepcion",
  ALUMNOS: "alumnos",
  STOCK: "stock",
};

export const FORMATO_REPORTE = { PDF: "pdf", XLSX: "xlsx" };

export const TIPO_AJUSTE_STOCK = {
  MANUAL: "manual",
  CORRECCION: "correccion",
  SINCRONIZACION: "sincronizacion",
};

export const UNIDADES_MEDIDA = [
  { value: "kg", label: "Kilogramos (kg)" },
  { value: "g", label: "Gramos (g)" },
  { value: "tonelada", label: "Tonelada (t)" },
  { value: "l", label: "Litros (l)" },
  { value: "ml", label: "Mililitros (ml)" },
  { value: "unidad", label: "Unidad" },
  { value: "bolsa", label: "Bolsa" },
  { value: "lata", label: "Lata" },
  { value: "porcion", label: "Porción" },
];

export const TIPOS_PRODUCTO_PROVEEDOR = [
  "Lácteos",
  "Cereales",
  "Menestras",
  "Proteínas",
  "Aceites",
  "Conservas",
  "General",
];
