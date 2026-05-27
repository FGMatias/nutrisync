export function buildAlumnoQrPayload(alumno) {
  if (!alumno) return "";

  return alumno.codigo_qr ?? "";
}

export function parseAlumnoQrPayload(rawValue) {
  if (typeof rawValue !== "string" || rawValue.trim().length === 0) {
    return null;
  }

  const normalized = rawValue.trim();
  const prefixedMatch = normalized.match(/^NSA\|([a-f0-9-]{36})$/i);
  if (prefixedMatch) {
    return {
      t: "alumno",
      v: 2,
      qr: prefixedMatch[1],
    };
  }

  const rawUuidMatch = normalized.match(/^([a-f0-9-]{36})$/i);
  if (rawUuidMatch) {
    return {
      t: "alumno",
      v: 2,
      qr: rawUuidMatch[1],
    };
  }

  try {
    const parsed = JSON.parse(normalized);
    if (
      parsed?.t !== "alumno" ||
      parsed?.v !== 1 ||
      typeof parsed?.qr !== "string" ||
      parsed.qr.length === 0
    ) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}
