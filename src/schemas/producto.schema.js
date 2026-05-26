import { z } from "zod";
import { TIPOS_PRODUCTO_PROVEEDOR, UNIDADES_MEDIDA } from "../constants/enums";

const categoriaValues = [...TIPOS_PRODUCTO_PROVEEDOR];
const unidadValues = UNIDADES_MEDIDA.map((item) => item.value);

const numberString = (message, { min = 0, integer = true } = {}) =>
  z
    .string()
    .min(1, message)
    .refine((value) => {
      const num = Number(value);
      return Number.isFinite(num) && (!integer || Number.isInteger(num)) && num >= min;
    }, message);

export const productoSchema = z
  .object({
    nombre: z.string().min(2, "El nombre debe tener al menos 2 caracteres").max(100),
    codigo_producto: z.string().optional().or(z.literal("")),
    id_proveedor: z.string().optional().or(z.literal("")),
    categoria: z.enum(categoriaValues),
    unidad_medida: z.enum(unidadValues),
    stock_minimo: numberString("El stock minimo debe ser mayor o igual a 0", {
      min: 0,
    }),
    stock_maximo: numberString("El stock maximo debe ser mayor al minimo", {
      min: 1,
    }),
    activo: z.boolean().default(true),
    motivo: z.string().max(200, "El motivo es muy largo").optional().or(z.literal("")),
  })
  .superRefine((value, ctx) => {
    if (Number(value.stock_maximo) <= Number(value.stock_minimo)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "El stock maximo debe ser mayor que el minimo.",
        path: ["stock_maximo"],
      });
    }
  });

export const productoFormDefaultValues = {
  nombre: "",
  codigo_producto: "",
  id_proveedor: "",
  categoria: "General",
  unidad_medida: "kg",
  stock_minimo: "0",
  stock_maximo: "100",
  activo: true,
  motivo: "",
};
