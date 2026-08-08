export const CHECKMK_ENABLED_KEY = "INTEGRATION_CHECKMK_ENABLED";
export const CHECKMK_CREDENTIAL_KEYS = ["CHECKMK_API_URL", "CHECKMK_USERNAME", "CHECKMK_PASSWORD", "CHECKMK_SITE"];
const isTrue = value => `${value ?? ""}`.toLowerCase() === "true";
const isFalse = value => `${value ?? ""}`.toLowerCase() === "false";
export function isCheckMKIntegrationEnabled(settingsMap = {}) {
  const raw = settingsMap[CHECKMK_ENABLED_KEY];
  if (isTrue(raw)) return true;
  if (isFalse(raw)) return false;
  return CHECKMK_CREDENTIAL_KEYS.some(key => `${settingsMap[key] ?? ""}`.trim().length > 0);
}
export function settingsRowsToMap(rows = []) {
  return rows.reduce((acc, row) => {
    if (row?.key != null) acc[row.key] = row.value;
    return acc;
  }, {});
}
