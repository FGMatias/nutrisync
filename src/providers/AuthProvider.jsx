import { useEffect } from "react";
import { supabase } from "../lib/supabase";
import { getPerfilByAuthId } from "../services/auth.service";
import { useAuthStore } from "../stores/authStore";

export default function AuthProvider({ children }) {
  const { setSession, clearSession, setLoading } = useAuthStore();

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        try {
          const perfil = await getPerfilByAuthId(session.user.id);
          if (!perfil?.activo) {
            await supabase.auth.signOut();
            clearSession();
            return;
          }
          setSession(session.user, perfil);
        } catch {
          clearSession();
        }
      } else {
        clearSession();
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_OUT" || !session) {
        clearSession();
        return;
      }
      if (session?.user) {
        try {
          const perfil = await getPerfilByAuthId(session.user.id);
          if (!perfil?.activo) {
            await supabase.auth.signOut();
            clearSession();
            return;
          }
          setSession(session.user, perfil);
        } catch {
          clearSession();
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [setSession, clearSession]);

  return children;
}
