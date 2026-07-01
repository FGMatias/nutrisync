import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  getDistribuciones,
  registerDistribucionFromQr,
  syncPendingDistribuciones,
} from "../../services/distribuciones.service";

const KEY = "distribuciones";

export function useDistribuciones() {
  return useQuery({
    queryKey: [KEY],
    queryFn: getDistribuciones,
    staleTime: 30_000,
  });
}

export function useRegisterDistribucionQr() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ rawValue, perfil }) =>
      registerDistribucionFromQr(rawValue, perfil),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [KEY] });
    },
  });
}

export function useSyncPendingDistribuciones() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: syncPendingDistribuciones,
    onSuccess: (result) => {
      if (result?.synced > 0) {
        toast.success(
          `${result.synced} distribucion${result.synced > 1 ? "es" : ""} sincronizada${result.synced > 1 ? "s" : ""}.`,
        );
      }

      queryClient.invalidateQueries({ queryKey: [KEY] });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}
