const ERROR_MAP = {
  "Invalid login credentials": "Correo o contraseña incorrectos.",
  "Email not confirmed":
    "Debes confirmar tu correo electrónico antes de ingresar.",
  "Too many requests":
    "Demasiados intentos. Espera unos minutos antes de volver a intentarlo.",
  "User not found": "No existe una cuenta con ese correo.",
  "Network request failed": "Sin conexión. Revisa tu red e intenta de nuevo.",
};

export function parseAuthError(error) {
  if (!error) return "Ocurrió un error inesperado.";
  const msg = error.message || "";
  for (const [key, value] of Object.entries(ERROR_MAP)) {
    if (msg.includes(key)) return value;
  }
  return msg || "Ocurrió un error inesperado.";
}
