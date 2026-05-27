export function buildLoteQrPayload(etiqueta) {
  if (!etiqueta) return "";

  const qrBase = etiqueta.qr_lote ?? etiqueta.qr ?? "";
  if (!qrBase) return "";

  return `NSL|${qrBase}`;
}

export function parseLoteQrPayload(rawValue) {
  if (typeof rawValue !== "string" || rawValue.trim().length === 0) {
    return null;
  }

  const normalized = rawValue.trim();
  const prefixedMatch = normalized.match(/^NSL\|([a-f0-9-]{36})$/i);
  if (prefixedMatch) {
    return {
      t: "lote",
      v: 1,
      qr: prefixedMatch[1],
    };
  }

  const rawUuidMatch = normalized.match(/^([a-f0-9-]{36})$/i);
  if (rawUuidMatch) {
    return {
      t: "lote",
      v: 1,
      qr: rawUuidMatch[1],
    };
  }

  return null;
}
