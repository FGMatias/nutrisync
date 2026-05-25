import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  createProveedor,
  deleteProveedor,
  getProveedorById,
  getProveedores,
  toggleActivoProveedor,
  updateProveedor,
} from "../../services/proveedores.service";

const KEY = "proveedores";

export function useProveedores(filters) {
  return useQuery({
    queryKey: [KEY, filters],
    queryFn: () => getProveedores(filters),
    staleTime: 60_000,
  });
}

export function useProveedor(id) {
  return useQuery({
    queryKey: [KEY, id],
    queryFn: () => getProveedorById(id),
    enabled: !!id,
  });
}

export function useCreateProveedor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createProveedor,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] });
      toast.success("Proveedor creado correctamente");
    },
    onError: (e) => toast.error(e.message),
  });
}

export function useUpdateProveedor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => updateProveedor(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] });
      toast.success("Proveedor actualizado correctamente");
    },
    onError: (e) => toast.error(e.message),
  });
}

export function useDeleteProveedor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteProveedor,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] });
      toast.success("Proveedor eliminado");
    },
    onError: (e) => toast.error(e.message),
  });
}

export function useToggleActivoProveedor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, activo }) => toggleActivoProveedor(id, activo),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: [KEY] });
      toast.success(
        data.activo ? "Proveedor activado" : "Proveedor desactivado",
      );
    },
    onError: (e) => toast.error(e.message),
  });
}
