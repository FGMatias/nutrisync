import { z } from "zod";

export const planDistribucionSchema = z.object({
  fecha: z.string().min(1, "La fecha es requerida"),
  id_producto: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : Number(v)),
    z.number({ required_error: "Selecciona un producto" }).int().positive("Selecciona un producto"),
  ),
  cantidad_por_alumno: z.preprocess(
    (v) => (v === "" ? undefined : Number(v)),
    z.number({ invalid_type_error: "Ingresa una cantidad" }).int().min(1, "Mínimo 1 unidad"),
  ),
  activo: z.boolean().default(true),
});
