/**
 * Repair filenames stored after Multer Latin-1 decoding of UTF-8 uploads
 * (e.g. "RÃ©siliation.pdf" → "Résiliation.pdf").
 */
export function repairFilenameEncoding(name) {
  const raw = String(name ?? "");
  if (!raw || !/Ã.|Â.|â€|\uFFFD/.test(raw)) return raw;
  try {
    const bytes = Uint8Array.from(raw, char => char.charCodeAt(0) & 0xff);
    const fixed = new TextDecoder("utf-8", {
      fatal: false
    }).decode(bytes);
    if (!fixed || fixed.includes("\uFFFD")) return raw;
    const score = text => (String(text).match(/Ã.|Â.|â€|\uFFFD/g) || []).length;
    if (score(fixed) < score(raw)) return fixed;
  } catch {
    /* keep raw */
  }
  return raw;
}
