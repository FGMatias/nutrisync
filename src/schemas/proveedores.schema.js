import { z } from "zod";

export const proveedorSchema = z.object({
  nombre: z.string().min(2, "Mínimo 2 caracteres").max(100),
  ruc: z
    .string()
    .length(11, "El RUC debe tener exactamente 11 dígitos")
    .regex(/^\d{11}$/, "Solo se permiten dígitos"),
  contacto: z.string().max(100).optional().or(z.literal("")),
  telefono: z.string().max(20).optional().or(z.literal("")),
  direccion: z.string().max(150).optional().or(z.literal("")),
  tipo_producto: z.string().min(1, "Campo obligatorio"),
  activo: z.boolean().default(true),
});
