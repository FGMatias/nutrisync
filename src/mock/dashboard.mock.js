export const DASHBOARD_MOCK = {
  totalAlumnos: 312,
  alumnosConDistribucionHoy: 287,
  porcentajeCobertura: 92,
  productosConStockBajo: 3,
  ingresosEsteMes: 8,
  distribucionesHoy: 287,
  distribucionesEstaSemanaPorDia: [
    { dia: "Lun", cantidad: 298 },
    { dia: "Mar", cantidad: 305 },
    { dia: "Mié", cantidad: 287 },
    { dia: "Jue", cantidad: 0 },
    { dia: "Vie", cantidad: 0 },
  ],
  alertasStock: [
    { producto: "Aceite Vegetal", stock: 8, minimo: 20, unidad: "l" },
    { producto: "Lentejas", stock: 15, minimo: 30, unidad: "kg" },
    { producto: "Azúcar Rubia", stock: 5, minimo: 25, unidad: "kg" },
  ],
};
