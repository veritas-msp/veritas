const DEFAULT_WEBSITE = "https://veritas-msp.com";
export function getVeritasCommercialBaseUrl() {
  const raw = String(process.env.REACT_APP_VERITAS_WEBSITE_URL || DEFAULT_WEBSITE).trim();
  return raw.replace(/\/+$/, "") || DEFAULT_WEBSITE;
}
export function getVeritasCommercialLinks() {
  const base = getVeritasCommercialBaseUrl();
  return {
    account: `${base}/account.html`,
    accountRecover: `${base}/account.html#license-recover`,
    pricing: `${base}/#pricing`,
    legal: `${base}/legal.html`,
    privacy: `${base}/privacy.html`,
    supportEmail: "contact@veritas-msp.com"
  };
}
