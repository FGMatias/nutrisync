export const ROLES = {
  ADMINISTRADOR: "administrador",
  DIRECTOR: "director",
  CAE: "cae",
  ALMACEN: "almacen",
  DOCENTE: "docente",
  OPERARIO_LOGISTICO: "operario_logistico",
  PADRE_FAMILIA: "padre_familia",
};

export const ROLE_LABELS = {
  administrador: "Administrador",
  director: "Director",
  cae: "CAE",
  almacen: "Personal de Almacén",
  docente: "Docente",
  operario_logistico: "Operario Logístico",
  padre_familia: "Padre de Familia",
};

export const ROLE_DEFAULT_VIEW = {
  administrador: "/dashboard",
  director: "/dashboard",
  cae: "/dashboard",
  almacen: "/dashboard",
  docente: "/qr-scanner",
  operario_logistico: "/vehiculos",
  padre_familia: "/portal-padre",
};
