import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  anularIngreso,
  createIngreso,
  getAccesosVehicularesDisponibles,
  getIngresos,
} from "../../services/ingresos.service";

const KEY = "ingresos";

export function useIngresos() {
  return useQuery({
    queryKey: [KEY],
    queryFn: getIngresos,
    staleTime: 30_000,
  });
}

export function useCreateIngreso() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createIngreso,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] });
      qc.invalidateQueries({ queryKey: ["inventario"] });
      qc.invalidateQueries({ queryKey: ["productos"] });
      qc.invalidateQueries({ queryKey: ["movimientos"] });
      toast.success("Ingreso registrado correctamente");
    },
    onError: (error) => {
      toast.error(error.message ?? "No se pudo registrar el ingreso");
    },
  });
}

export function useAnularIngreso() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: anularIngreso,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] });
      qc.invalidateQueries({ queryKey: ["inventario"] });
      qc.invalidateQueries({ queryKey: ["movimientos"] });
      toast.success("Ingreso anulado correctamente");
    },
    onError: (error) => {
      toast.error(error.message ?? "No se pudo anular el ingreso");
    },
  });
}

export function useAccesosVehicularesDisponibles() {
  return useQuery({
    queryKey: ["accesos-vehiculares"],
    queryFn: getAccesosVehicularesDisponibles,
    staleTime: 30_000,
  });
}
