/**
 * Multer historically decodes multipart filenames as Latin-1.
 * Browsers send UTF-8, which produces mojibake like "RÃ©siliation" instead of "Résiliation".
 */

const MOJIBAKE_MARK = /Ã.|Â.|â€|\uFFFD/;

function countMojibakeMarks(text) {
  return (String(text || "").match(/Ã.|Â.|â€|\uFFFD/g) || []).length;
}

/** Always apply for fresh multer `file.originalname` values. */
export function decodeMulterFilename(name, fallback = "file") {
  const raw = String(name ?? "").trim();
  if (!raw) return fallback;
  try {
    const fixed = Buffer.from(raw, "latin1").toString("utf8");
    if (fixed && !fixed.includes("\uFFFD")) return fixed;
  } catch {
    /* keep raw */
  }
  return raw;
}

/** Repair filenames already stored with UTF-8-as-Latin-1 mojibake. */
export function repairStoredFilename(name) {
  const raw = String(name ?? "");
  if (!raw || !MOJIBAKE_MARK.test(raw)) return raw;
  try {
    const fixed = Buffer.from(raw, "latin1").toString("utf8");
    if (!fixed || fixed.includes("\uFFFD")) return raw;
    if (countMojibakeMarks(fixed) < countMojibakeMarks(raw)) return fixed;
  } catch {
    /* keep raw */
  }
  return raw;
}

export function mapFileRowFilename(row) {
  if (!row || typeof row !== "object") return row;
  const next = repairStoredFilename(row.file_name);
  if (next === row.file_name) return row;
  return {
    ...row,
    file_name: next
  };
}
