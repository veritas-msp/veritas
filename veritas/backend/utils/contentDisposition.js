import path from "path";

const MIME_TO_EXT = {
  "application/pdf": ".pdf",
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/gif": ".gif",
  "image/webp": ".webp",
  "application/msword": ".doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
  "application/vnd.ms-excel": ".xls",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ".xlsx",
  "text/plain": ".txt",
  "text/csv": ".csv",
  "text/html": ".html",
  "application/xhtml+xml": ".html",
  "application/json": ".json",
  "application/zip": ".zip",
  "application/x-zip-compressed": ".zip",
  "application/x-zip": ".zip",
  "multipart/x-zip": ".zip"
};

function asciiFallbackName(name) {
  const ascii = String(name || "")
    .normalize("NFKD")
    .replace(/[^\x20-\x7E]/g, "_")
    .replace(/["\\]/g, "_")
    .trim();
  return ascii || "document";
}

/** Ajoute une extension si absente, à partir du mime ou d’un nom source. */
export function ensureFileNameExtension(fileName, { mimeType = "", sourceName = "" } = {}) {
  const raw = String(fileName || "").trim() || "document";
  const currentExt = path.extname(raw).toLowerCase();
  if (currentExt) return raw;

  const fromSource = path.extname(String(sourceName || "")).toLowerCase();
  if (fromSource) return `${raw}${fromSource}`;

  const fromMime = MIME_TO_EXT[String(mimeType || "").toLowerCase()] || "";
  if (fromMime) return `${raw}${fromMime}`;

  return raw;
}

/** Header Content-Disposition RFC 5987 (filename + filename*). */
export function buildContentDisposition(disposition, fileName) {
  const mode = disposition === "inline" ? "inline" : "attachment";
  const safe = String(fileName || "document").replace(/[\r\n"]/g, "_");
  const fallback = asciiFallbackName(safe);
  const encoded = encodeURIComponent(safe).replace(/['()]/g, escape);
  return `${mode}; filename="${fallback}"; filename*=UTF-8''${encoded}`;
}
