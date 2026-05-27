import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { generarReporte, getReportes } from "../../services/reportes.service";

const KEY = "reportes";

export function useReportes() {
  return useQuery({
    queryKey: [KEY],
    queryFn: getReportes,
    staleTime: 30_000,
  });
}

export function useGenerarReporte() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: generarReporte,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] });
      qc.invalidateQueries({ queryKey: ["movimientos"] });
      toast.success("Reporte generado correctamente");
    },
    onError: (error) => {
      toast.error(error.message ?? "No se pudo generar el reporte");
    },
  });
}
