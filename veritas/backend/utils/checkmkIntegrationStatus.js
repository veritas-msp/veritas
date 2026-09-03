import { getSettingsMap } from "./settingsHelper.js";

export const CHECKMK_ENABLED_KEY = "INTEGRATION_CHECKMK_ENABLED";
export const CHECKMK_CREDENTIAL_KEYS = ["CHECKMK_API_URL", "CHECKMK_USERNAME", "CHECKMK_PASSWORD", "CHECKMK_SITE"];

/**
 * Explicit flag wins; otherwise the integration counts as enabled as soon as
 * credentials are configured.
 */
export async function isCheckmkIntegrationEnabled() {
  try {
    const map = await getSettingsMap([CHECKMK_ENABLED_KEY, ...CHECKMK_CREDENTIAL_KEYS]);
    const raw = `${map[CHECKMK_ENABLED_KEY] ?? ""}`.toLowerCase();
    if (raw === "true") return true;
    if (raw === "false") return false;
    return CHECKMK_CREDENTIAL_KEYS.some(key => `${map[key] ?? ""}`.trim().length > 0);
  } catch {
    return false;
  }
}
