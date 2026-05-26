import { z } from "zod";

export const alumnoSchema = z.object({
  nombre: z.string().min(2, "Mínimo 2 caracteres").max(100, "Máximo 100 caracteres"),
  apellido: z.string().min(2, "Mínimo 2 caracteres").max(100, "Máximo 100 caracteres"),
  dni: z.string().length(8, "El DNI debe tener exactamente 8 dígitos").regex(/^\d{8}$/, "Solo se permiten dígitos"),
  grado: z.string().min(1, "Seleccione un grado"),
  seccion: z.string().min(1, "Seleccione una sección"),
  activo: z.boolean().default(true),
});
