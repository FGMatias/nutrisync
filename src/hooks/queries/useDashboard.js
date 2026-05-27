import { useQuery } from "@tanstack/react-query";
import { getDashboardMetrics } from "../../services/dashboard.service";

const KEY = "dashboard";

export function useDashboard() {
  return useQuery({
    queryKey: [KEY],
    queryFn: getDashboardMetrics,
    staleTime: 30_000,
  });
}
