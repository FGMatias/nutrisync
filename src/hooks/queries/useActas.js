import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  getActasRecepcion,
  guardarActaRecepcion,
} from "../../services/actas.service";

const KEY = "actas-recepcion";

export function useActasRecepcion() {
  return useQuery({
    queryKey: [KEY],
    queryFn: getActasRecepcion,
    staleTime: 30_000,
  });
}

export function useGenerarActaRecepcion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: guardarActaRecepcion,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] });
      qc.invalidateQueries({ queryKey: ["ingresos"] });
      qc.invalidateQueries({ queryKey: ["movimientos"] });
      toast.success("Acta generada y guardada correctamente");
    },
    onError: (error) => {
      toast.error(error.message ?? "No se pudo generar el acta");
    },
  });
}
