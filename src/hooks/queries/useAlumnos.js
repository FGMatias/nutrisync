import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  createAlumno,
  getAlumnoById,
  getAlumnos,
  toggleActivoAlumno,
  updateAlumno,
} from "../../services/alumnos.service";

const KEY = "alumnos";

export function useAlumnos() {
  return useQuery({
    queryKey: [KEY],
    queryFn: () => getAlumnos(),
    staleTime: 60_000,
  });
}

export function useAlumno(id) {
  return useQuery({
    queryKey: [KEY, id],
    queryFn: () => getAlumnoById(id),
    enabled: !!id,
  });
}

export function useCreateAlumno() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createAlumno,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] });
      qc.invalidateQueries({ queryKey: ["alumnos", "activos_count"] });
      toast.success("Alumno registrado correctamente");
    },
    onError: (e) => toast.error(e.message),
  });
}

export function useUpdateAlumno() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => updateAlumno(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] });
      qc.invalidateQueries({ queryKey: ["alumnos", "activos_count"] });
      toast.success("Alumno actualizado correctamente");
    },
    onError: (e) => toast.error(e.message),
  });
}

export function useToggleActivoAlumno() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, activo }) => toggleActivoAlumno(id, activo),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: [KEY] });
      qc.invalidateQueries({ queryKey: ["alumnos", "activos_count"] });
      toast.success(
        data.activo ? "Alumno activado" : "Alumno desactivado",
      );
    },
    onError: (e) => toast.error(e.message),
  });
}
