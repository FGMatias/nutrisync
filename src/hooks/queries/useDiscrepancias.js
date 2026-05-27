import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  anularDiscrepancia,
  crearDiscrepancia,
  getDiscrepancias,
  resolverDiscrepancia,
} from "../../services/discrepancias.service";

const KEY = "discrepancias";

export function useDiscrepancias() {
  return useQuery({
    queryKey: [KEY],
    queryFn: getDiscrepancias,
    staleTime: 30_000,
  });
}

export function useCrearDiscrepancia() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: crearDiscrepancia,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] });
      qc.invalidateQueries({ queryKey: ["ingresos"] });
      qc.invalidateQueries({ queryKey: ["inventario"] });
      qc.invalidateQueries({ queryKey: ["movimientos"] });
      toast.success("Discrepancia registrada correctamente");
    },
    onError: (error) => {
      toast.error(error.message ?? "No se pudo registrar la discrepancia");
    },
  });
}

export function useResolverDiscrepancia() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: resolverDiscrepancia,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] });
      qc.invalidateQueries({ queryKey: ["ingresos"] });
      qc.invalidateQueries({ queryKey: ["inventario"] });
      qc.invalidateQueries({ queryKey: ["movimientos"] });
      toast.success("Discrepancia resuelta correctamente");
    },
    onError: (error) => {
      toast.error(error.message ?? "No se pudo resolver la discrepancia");
    },
  });
}

export function useAnularDiscrepancia() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: anularDiscrepancia,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] });
      qc.invalidateQueries({ queryKey: ["ingresos"] });
      qc.invalidateQueries({ queryKey: ["inventario"] });
      qc.invalidateQueries({ queryKey: ["movimientos"] });
      toast.success("Discrepancia anulada correctamente");
    },
    onError: (error) => {
      toast.error(error.message ?? "No se pudo anular la discrepancia");
    },
  });
}
