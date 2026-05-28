import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { SESSION_QUERY_KEY } from "../hooks/queries/useAuth";
import { supabase } from "../lib/supabase";

export default function AuthProvider({ children }) {
  const qc = useQueryClient();

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "INITIAL_SESSION") return;

      if (event === "SIGNED_OUT" || !session) {
        qc.setQueryData(SESSION_QUERY_KEY, null);
        return;
      }

      if (event === "TOKEN_REFRESHED") {
        qc.setQueryData(SESSION_QUERY_KEY, (old) =>
          old ? { ...old, user: session.user } : old,
        );
        return;
      }

      qc.invalidateQueries({ queryKey: SESSION_QUERY_KEY });
    });

    return () => subscription.unsubscribe();
  }, [qc]);

  return children;
}
