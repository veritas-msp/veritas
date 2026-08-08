export const VERITAS_BILLING_API_URL =
  process.env.VERITAS_BILLING_API_URL || "https://billing.veritas-msp.com";

/** Client secret for Pro license API calls. Set via env in production builds. */
export const VERITAS_BILLING_LICENSE_SECRET =
  process.env.VERITAS_BILLING_LICENSE_SECRET || "";
