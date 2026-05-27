import { useEffect } from "react";
import { supabase } from "../lib/supabase";
import { getPerfilByAuthId } from "../services/auth.service";
import { useAuthStore } from "../stores/authStore";

export default function AuthProvider({ children }) {
  const { setSession, clearSession } = useAuthStore();

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_OUT" || !session) {
        clearSession();
        return;
      }

      // Token rotated — session still valid, keep the existing perfil in store.
      // Re-fetching the profile here is what causes the RLS collision storm on
      // window focus: the new token isn't committed to the client yet when the
      // DB call fires, so it fails → clearSession() wipes the store mid-session.
      if (event === "TOKEN_REFRESHED") {
        const { perfil } = useAuthStore.getState();
        if (perfil) {
          setSession(session.user, perfil);
        }
        return;
      }

      // INITIAL_SESSION / SIGNED_IN: fetch the profile once.
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
    });

    return () => subscription.unsubscribe();
  }, [setSession, clearSession]);

  return children;
}
