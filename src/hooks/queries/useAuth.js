import { useMutation } from "@tanstack/react-query";
import { parseAuthError } from "../../lib/auth-errors";
import { signIn, signOut } from "../../services/auth.service";
import { useAuthStore } from "../../stores/authStore";

export function useAuth() {
  const { user, perfil, isLoading } = useAuthStore();
  return {
    user,
    perfil,
    isLoading,
    isAuthenticated: !!user && !!perfil,
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
  return useMutation({
    mutationFn: signOut,
  });
}
