import { z } from "zod";

export const ajusteStockSchema = z.object({
  id_producto: z.string().min(1, "Selecciona un producto"),
  tipo_ajuste: z.enum(["manual", "correccion", "sincronizacion"]),
  cantidad_delta: z
    .string()
    .min(1, "Ingresa una cantidad")
    .refine((value) => Number(value) !== 0, {
      message: "La cantidad no puede ser cero",
    }),
  motivo: z.string().min(2, "Ingresa un motivo").max(200, "El motivo es muy largo"),
});

export const ajusteStockDefaultValues = {
  id_producto: "",
  tipo_ajuste: "manual",
  cantidad_delta: "",
  motivo: "",
};
