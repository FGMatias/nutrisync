import { supabase } from "../lib/supabase";
import { useAuthStore } from "../stores/authStore";

export async function signIn({ email, password }) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getCurrentSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}

export async function getPerfilByAuthId(authId) {
  const { data, error } = await supabase
    .from("perfiles")
    .select("*")
    .eq("id_usuario_auth", authId)
    .single();
  if (error) throw error;
  return data;
}

export async function getCurrentPerfilId() {
  const storedPerfil = useAuthStore.getState().perfil;
  if (storedPerfil?.id) return storedPerfil.id;

  const session = await getCurrentSession();
  if (!session?.user?.id) {
    throw new Error("No hay una sesion activa.");
  }

  const perfil = await getPerfilByAuthId(session.user.id);
  if (!perfil?.id) {
    throw new Error("No se encontro el perfil activo del usuario.");
  }

  return perfil.id;
}
