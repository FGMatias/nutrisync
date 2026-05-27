import Dexie from "dexie";

export const offlineDb = new Dexie("nutrisync-offline");

offlineDb.version(1).stores({
  distribucionesPendientes:
    "++id, alumno_id, docente_id, fecha, hora, codigo_qr, created_at",
  alumnosCache: "id, codigo_qr, activo",
});
