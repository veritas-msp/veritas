import { repairFilenameEncoding } from "./repairFilenameEncoding";

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
  "application/json": ".json",
  "application/zip": ".zip",
  "application/x-zip-compressed": ".zip"
};

export function ensureVaultDownloadFileName(fileName, mimeType = "") {
  const raw = repairFilenameEncoding(String(fileName || "").trim()) || "document";
  if (/\.[a-z0-9]{1,8}$/i.test(raw)) return raw;
  const ext = MIME_TO_EXT[String(mimeType || "").toLowerCase()] || "";
  return ext ? `${raw}${ext}` : raw;
}

/** Télécharge via fetch+blob pour forcer le nom (et contourner le SW navigate). */
export async function downloadVaultFileFromUrl(url, fileName, { mimeType = "" } = {}) {
  const safeName = ensureVaultDownloadFileName(fileName, mimeType);
  const response = await fetch(url, { credentials: "include" });
  if (!response.ok) {
    throw new Error(`Download failed (${response.status})`);
  }
  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = safeName;
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1500);
  return safeName;
}

/** Charge une URL vault en blob: pour preview iframe/img (évite index.html via SW). */
export async function fetchVaultMediaObjectUrl(url) {
  const response = await fetch(url, { credentials: "include" });
  if (!response.ok) {
    throw new Error(`Preview failed (${response.status})`);
  }
  const blob = await response.blob();
  return URL.createObjectURL(blob);
}
