import { uploadClientFile } from "../api/clientFiles";

const VAULT_EXT_RE = /\.(pdf|docx?|xlsx?|txt|csv|zip)$/i;

/** Files accepted by POST /api/client-files (mirrors vault upload accept list). */
export function isVaultCompatibleFile(file) {
  if (!file) return false;
  const type = String(file.type || "").toLowerCase();
  if (type.startsWith("image/")) return true;
  return VAULT_EXT_RE.test(String(file.name || ""));
}

/**
 * Upload ticket attachment File objects into the company vault.
 * Accepts either:
 * - entries: [{ file, category, description, visibleToClient }]
 * - legacy files + shared category/description/visibleToClient
 * Returns { ok, failed, skipped } counts.
 */
export async function archiveTicketFilesToVault({
  entries = null,
  files = [],
  clientId,
  clientName,
  category,
  description,
  visibleToClient = false
} = {}) {
  if (!clientId) {
    const count = Array.isArray(entries) ? entries.length : Array.isArray(files) ? files.length : 0;
    return { ok: 0, failed: 0, skipped: count };
  }

  const items = Array.isArray(entries) && entries.length > 0
    ? entries
        .filter(entry => entry?.file)
        .map(entry => ({
          file: entry.file,
          category: entry.category || category,
          description: entry.description ?? description ?? "",
          visibleToClient: Boolean(entry.visibleToClient ?? visibleToClient)
        }))
    : (Array.isArray(files) ? files.filter(Boolean) : []).map(file => ({
        file,
        category,
        description: description || "",
        visibleToClient: Boolean(visibleToClient)
      }));

  const compatible = items.filter(item => isVaultCompatibleFile(item.file));
  const skipped = items.length - compatible.length;
  let ok = 0;
  let failed = 0;
  for (const item of compatible) {
    try {
      await uploadClientFile({
        clientId,
        clientName,
        category: item.category,
        description: item.description,
        file: item.file,
        visibleToClient: Boolean(item.visibleToClient)
      });
      ok += 1;
    } catch {
      failed += 1;
    }
  }
  return { ok, failed, skipped };
}
