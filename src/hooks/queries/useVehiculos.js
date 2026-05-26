import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  getAccesosVehiculares,
  registrarEntradaVehicular,
  registrarSalidaVehicular,
} from "../../services/vehiculos.service";

const KEY = "vehiculos";

export function useAccesosVehiculares(filters) {
  return useQuery({
    queryKey: [KEY, filters],
    queryFn: () => getAccesosVehiculares(filters),
    staleTime: 60_000,
  });
}

export function useRegistrarEntrada() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ payload, file }) => registrarEntradaVehicular(payload, file),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] });
      toast.success("Entrada vehicular registrada correctamente");
    },
    onError: (e) => toast.error(e.message || "Error al registrar la entrada"),
  });
}

export function useRegistrarSalida() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, hora_salida }) =>
      registrarSalidaVehicular(id, hora_salida),
    // Optimistically update the cached vehicle list
    onMutate: async ({ id, hora_salida }) => {
      // Cancel any outgoing refetches so they don't overwrite optimistic update
      await qc.cancelQueries({ queryKey: [KEY] });
      // Snapshot previous value
      const previous = qc.getQueryData([KEY]);
      // Update cache
      qc.setQueryData([KEY], (old) => {
        if (!old) return old;
        return {
          ...old,
          data: old.data.map((v) =>
            v.id === id ? { ...v, hora_salida } : v
          ),
        };
      });
      return { previous };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previous) {
        qc.setQueryData([KEY], context.previous);
      }
      toast.error(err.message || "Error al registrar la salida");
    },
    onSuccess: () => {
      // Invalidate to sync with server
      qc.invalidateQueries({ queryKey: [KEY] });
      toast.success("Salida vehicular registrada");
    },
    onSettled: () => {
      // Ensure loading state cleared
    },
  });
}
