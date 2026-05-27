import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { parseAuthError } from "../../lib/auth-errors";
import { supabase } from "../../lib/supabase";
import {
  getPerfilByAuthId,
  signIn,
  signOut,
} from "../../services/auth.service";

export const SESSION_QUERY_KEY = ["auth", "session"];

async function fetchSession() {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error || !session) return null;

  const perfil = await getPerfilByAuthId(session.user.id);
  if (!perfil?.activo) {
    await supabase.auth.signOut();
    return null;
  }

  return { user: session.user, perfil };
}

// Single source of truth for auth state. Never stale on its own —
// only invalidated when Supabase fires an auth event (via AuthProvider).
export function useSession() {
  return useQuery({
    queryKey: SESSION_QUERY_KEY,
    queryFn: fetchSession,
    staleTime: Infinity,
    gcTime: Infinity,
    retry: 1,
  });
}

export function useAuth() {
  const { data, isPending } = useSession();
  return {
    isLoading: isPending,
    isAuthenticated: !!data?.perfil,
    user: data?.user ?? null,
    perfil: data?.perfil ?? null,
  };
}

export function useSignIn() {
  return useMutation({
    mutationFn: signIn,
    onError: (error) => {
      console.error("Login error:", parseAuthError(error));
    },
  });
}

export function useSignOut() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: signOut,
    onSuccess: () => {
      qc.setQueryData(SESSION_QUERY_KEY, null);
    },
  });
}
