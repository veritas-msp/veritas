import { VERITAS_BILLING_ORIGIN } from "./licenseTrust.js";

function cleanEnv(raw) {
  if (typeof raw !== "string") return "";
  return raw.trim().replace(/^["']|["']$/g, "");
}

/**
 * Official license server. Not read from the environment: a deployment must not
 * be able to redirect validation to a server it controls.
 */
export function getVeritasBillingApiUrl() {
  return VERITAS_BILLING_ORIGIN;
}

/** Shared secret for POST /api/license/validate. Must match BILLING_LICENSE_API_SECRET. */
export function getVeritasBillingLicenseSecret() {
  return cleanEnv(process.env.VERITAS_BILLING_LICENSE_SECRET);
}
