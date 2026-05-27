import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { SESSION_QUERY_KEY } from "../hooks/queries/useAuth";

export default function AuthProvider({ children }) {
  const qc = useQueryClient();

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      // INITIAL_SESSION: useSession's queryFn already calls getSession() on mount.
      // Reacting here would cause a redundant double-fetch on startup.
      if (event === "INITIAL_SESSION") return;

      if (event === "SIGNED_OUT" || !session) {
        qc.setQueryData(SESSION_QUERY_KEY, null);
        return;
      }

      if (event === "TOKEN_REFRESHED") {
        // The JWT rotated but the perfil hasn't changed. Update only the
        // user object in the cached session to avoid a needless DB round-trip.
        // This is what previously triggered the RLS collision: an async perfil
        // fetch that could fail mid-rotation and wipe the session from state.
        qc.setQueryData(SESSION_QUERY_KEY, (old) =>
          old ? { ...old, user: session.user } : old,
        );
        return;
      }

      // SIGNED_IN, USER_UPDATED: re-fetch session + perfil from scratch.
      qc.invalidateQueries({ queryKey: SESSION_QUERY_KEY });
    });

    return () => subscription.unsubscribe();
  }, [qc]);

  return children;
}
