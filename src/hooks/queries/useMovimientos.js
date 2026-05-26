import { useQuery } from "@tanstack/react-query";
import { getMovimientos } from "../../services/movimientos.service";

const KEY = "movimientos";

export function useMovimientos() {
  return useQuery({
    queryKey: [KEY],
    queryFn: getMovimientos,
    staleTime: 30_000,
  });
}
