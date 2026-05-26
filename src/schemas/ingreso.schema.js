import { z } from "zod";
import { UNIDADES_MEDIDA } from "../constants/enums";

const unidadValues = UNIDADES_MEDIDA.map((item) => item.value);

const positiveNumberString = (message) =>
  z
    .string()
    .min(1, message)
    .refine((value) => Number(value) > 0, {
      message,
    });

const nonNegativeNumberString = (message) =>
  z
    .string()
    .min(1, message)
    .refine((value) => Number(value) >= 0, {
      message,
    });

export const ingresoItemSchema = z.object({
  id_producto: z.string().min(1, "Selecciona un producto"),
  unidad_medida: z
    .string()
    .min(1, "Selecciona una unidad")
    .refine((value) => unidadValues.includes(value), "Selecciona una unidad"),
  lote: z.string().min(1, "Ingresa un lote").max(80, "El lote es muy largo"),
  cantidad: positiveNumberString("La cantidad debe ser mayor que cero"),
  peso_kg: nonNegativeNumberString("El peso no puede ser negativo"),
  fecha_vencimiento: z.string().optional().or(z.literal("")),
});

export const ingresoSchema = z
  .object({
    proveedor_id: z.string().min(1, "Selecciona un proveedor"),
    fecha: z.string().min(1, "Selecciona una fecha"),
    id_acceso_vehicular: z.string().optional().or(z.literal("")),
    observaciones: z.string().max(500, "Las observaciones son muy largas").optional().or(z.literal("")),
    items: z.array(ingresoItemSchema).min(1, "Agrega al menos un producto"),
  })
  .superRefine((value, ctx) => {
    const seen = new Set();
    value.items.forEach((item, index) => {
      const key = `${item.id_producto}-${item.lote.trim().toUpperCase()}`;
      if (seen.has(key)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "No puedes repetir el mismo producto y lote en un ingreso.",
          path: ["items", index, "lote"],
        });
      }
      seen.add(key);
    });
  });

export const ingresoFormDefaultValues = {
  proveedor_id: "",
  fecha: new Date().toISOString().slice(0, 10),
  id_acceso_vehicular: "",
  observaciones: "",
  items: [
    {
      id_producto: "",
      unidad_medida: "",
      lote: "",
      cantidad: "",
      peso_kg: "",
      fecha_vencimiento: "",
    },
  ],
};
