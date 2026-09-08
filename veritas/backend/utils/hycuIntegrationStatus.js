import { getSettingsMap } from "./settingsHelper.js";

export const HYCU_ENABLED_KEY = "INTEGRATION_HYCU_ENABLED";
export const HYCU_CREDENTIAL_KEYS = [
  "HYCU_API_URL",
  "HYCU_API_KEY",
  "HYCU_USERNAME",
  "HYCU_PASSWORD",
  "HYCU_VERIFY_TLS"
];

/**
 * Explicit flag wins; otherwise enabled when URL + (API key or user/pass) are set.
 */
export async function isHycuIntegrationEnabled() {
  try {
    const map = await getSettingsMap([HYCU_ENABLED_KEY, ...HYCU_CREDENTIAL_KEYS]);
    const raw = `${map[HYCU_ENABLED_KEY] ?? ""}`.toLowerCase();
    if (raw === "true") return true;
    if (raw === "false") return false;
    const url = `${map.HYCU_API_URL ?? ""}`.trim();
    if (!url) return false;
    const hasKey = `${map.HYCU_API_KEY ?? ""}`.trim().length > 0;
    const hasUserPass =
      `${map.HYCU_USERNAME ?? ""}`.trim().length > 0 &&
      `${map.HYCU_PASSWORD ?? ""}`.trim().length > 0;
    return hasKey || hasUserPass;
  } catch {
    return false;
  }
}
