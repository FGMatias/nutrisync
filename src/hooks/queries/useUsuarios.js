import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  createUsuario,
  deleteUsuario,
  getUsuarioById,
  getUsuarios,
  sendPasswordReset,
  toggleActivoUsuario,
  updateUsuario,
} from "../../services/usuarios.service";

const KEY = "usuarios";

export function useUsuarios(filters) {
  return useQuery({
    queryKey: [KEY, filters],
    queryFn: () => getUsuarios(filters),
    staleTime: 60_000,
  });
}

export function useUsuario(id) {
  return useQuery({
    queryKey: [KEY, id],
    queryFn: () => getUsuarioById(id),
    enabled: !!id,
  });
}

export function useCreateUsuario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createUsuario,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] });
      toast.success("Usuario creado correctamente");
    },
    onError: (e) => toast.error(e.message),
  });
}

export function useUpdateUsuario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => updateUsuario(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] });
      toast.success("Usuario actualizado correctamente");
    },
    onError: (e) => toast.error(e.message),
  });
}

export function useDeleteUsuario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteUsuario,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] });
      toast.success("Usuario eliminado");
    },
    onError: (e) => toast.error(e.message),
  });
}

export function useToggleActivoUsuario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, activo }) => toggleActivoUsuario(id, activo),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: [KEY] });
      toast.success(data.activo ? "Usuario activado" : "Usuario desactivado");
    },
    onError: (e) => toast.error(e.message),
  });
}

export function useSendPasswordReset() {
  return useMutation({
    mutationFn: sendPasswordReset,
    onSuccess: () =>
      toast.success("Correo de restablecimiento enviado correctamente"),
    onError: (e) => toast.error(e.message),
  });
}
