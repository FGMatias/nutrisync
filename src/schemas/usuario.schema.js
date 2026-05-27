import { z } from "zod";
import { ROLES } from "../constants/roles";

const rolesValues = Object.values(ROLES);

const base = z.object({
  nombre_completo: z.string().min(2, "Mínimo 2 caracteres").max(100),
  email: z.string().email("Correo inválido"),
  dni: z
    .string()
    .length(8, "El DNI debe tener 8 dígitos")
    .regex(/^\d{8}$/, "Solo dígitos")
    .optional()
    .or(z.literal("")),
  telefono: z.string().max(15).optional().or(z.literal("")),
  rol: z.enum(rolesValues, { required_error: "Selecciona un rol" }),
  activo: z.boolean().default(true),
  id_alumno: z.string().uuid().nullable().optional(),
});

export const usuarioSchema = base;

export const usuarioCreateSchema = base;
