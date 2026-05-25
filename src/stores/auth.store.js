import { create } from "zustand";

export const useAuthStore = create((set) => ({
  user: null,
  perfil: null,
  isLoading: true,

  setSession: (user, perfil) => set({ user, perfil, isLoading: false }),
  clearSession: () => set({ user: null, perfil: null, isLoading: false }),
  setLoading: (isLoading) => set({ isLoading }),
}));
