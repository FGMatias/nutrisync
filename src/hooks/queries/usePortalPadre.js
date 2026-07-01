import { useQuery } from "@tanstack/react-query";
import {
  getAlumnoVinculado,
  getDistribucionesAlumno,
} from "../../services/portalPadre.service";

const KEY = "portal-padre";

export function useAlumnoVinculado(id_alumno) {
  return useQuery({
    queryKey: [KEY, "alumno", id_alumno],
    queryFn: () => getAlumnoVinculado(id_alumno),
    enabled: !!id_alumno,
    staleTime: 5 * 60_000,
  });
}

export function useDistribucionesAlumno(id_alumno) {
  return useQuery({
    queryKey: [KEY, "distribuciones", id_alumno],
    queryFn: () => getDistribucionesAlumno(id_alumno),
    enabled: !!id_alumno,
    staleTime: 60_000,
    refetchInterval: 60_000,
  });
}
