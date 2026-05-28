import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  createPlanDistribucion,
  deletePlanDistribucion,
  getAlumnosActivosCount,
  getPlanesActivosHoy,
  getPlanesDistribucion,
  updatePlanDistribucion,
} from "../../services/planesDistribucion.service";

const KEY = "planes_distribucion";

export function usePlanesDistribucion(filters = {}) {
  return useQuery({
    queryKey: [KEY, filters],
    queryFn: () => getPlanesDistribucion(filters),
    staleTime: 30_000,
  });
}

export function usePlanesActivosHoy() {
  return useQuery({
    queryKey: [KEY, "hoy"],
    queryFn: getPlanesActivosHoy,
    staleTime: 60_000,
  });
}

export function useAlumnosActivosCount() {
  return useQuery({
    queryKey: ["alumnos", "activos_count"],
    queryFn: getAlumnosActivosCount,
    staleTime: 60_000,
  });
}

export function useCreatePlanDistribucion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createPlanDistribucion,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] });
      toast.success("Plan creado correctamente");
    },
    onError: (error) => toast.error(error.message ?? "No se pudo crear el plan"),
  });
}

export function useUpdatePlanDistribucion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => updatePlanDistribucion(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] });
      toast.success("Plan actualizado correctamente");
    },
    onError: (error) => toast.error(error.message ?? "No se pudo actualizar el plan"),
  });
}

export function useDeletePlanDistribucion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deletePlanDistribucion,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] });
      toast.success("Plan eliminado correctamente");
    },
    onError: (error) => toast.error(error.message ?? "No se pudo eliminar el plan"),
  });
}
