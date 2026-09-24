/** Partner portal root — JSON API under `/api`. */
export const MAILINBLACK_PARTNER_API_URL = "https://partner.mailinblack.com";

/** Dedicated tenants live under app.mailinblack.com/mibc-{region}-{nn}. */
export const MAILINBLACK_APP_BASE = "https://app.mailinblack.com";

/** Common instance regions (SMTP docs also reference mibc-en-XX). */
export const MAILINBLACK_INSTANCE_REGIONS = [
  { value: "fr", label: "FR (mibc-fr)" },
  { value: "en", label: "EN (mibc-en)" },
  { value: "custom", label: "Autre" }
];

const INSTANCE_PATH_RE =
  /^https?:\/\/(?:www\.)?app\.mailinblack\.com\/(mibc-([a-z0-9]+)-(\d+))(?:\/|$)/i;
const INSTANCE_HOST_RE =
  /^https?:\/\/(mibc-([a-z0-9]+)-(\d+))\.mailinblack\.com(?:\/|$)/i;
const INSTANCE_SLUG_RE = /^mibc-([a-z0-9]+)-(\d+)$/i;

function padInstanceNumber(value) {
  const digits = String(value ?? "").replace(/\D/g, "");
  if (!digits) return "";
  return digits.padStart(2, "0");
}

/**
 * Build dedicated instance root URL.
 * @param {string} region e.g. "fr" | "en"
 * @param {string|number} number e.g. "08"
 */
export function buildMailinblackInstanceUrl(region, number) {
  const regionCode = String(region || "").trim().toLowerCase();
  const nn = padInstanceNumber(number);
  if (!regionCode || regionCode === "custom" || !nn) return "";
  return `${MAILINBLACK_APP_BASE}/mibc-${regionCode}-${nn}`;
}

/**
 * Build from a free-form slug like `mibc-fr-08` or `mibc-en-03`.
 */
export function buildMailinblackUrlFromSlug(slug) {
  const raw = String(slug || "").trim().replace(/^\/+|\/+$/g, "");
  const match = raw.match(INSTANCE_SLUG_RE);
  if (!match) return raw ? `${MAILINBLACK_APP_BASE}/${raw.replace(/^\/+/, "")}` : "";
  return `${MAILINBLACK_APP_BASE}/${match[0].toLowerCase()}`;
}

/**
 * Normalize API root: strip admin/protect paths, convert subdomain hosts to path form.
 * Empty input stays empty (no hard-coded mibc-fr default).
 */
export function normalizeMailinblackApiUrl(url) {
  if (!url?.trim()) return "";
  let raw = url.trim().replace(/\/+$/, "");

  const hostMatch = raw.match(INSTANCE_HOST_RE);
  if (hostMatch) {
    return `${MAILINBLACK_APP_BASE}/${hostMatch[1].toLowerCase()}`;
  }

  const pathMatch = raw.match(INSTANCE_PATH_RE);
  if (pathMatch) {
    return `${MAILINBLACK_APP_BASE}/${pathMatch[1].toLowerCase()}`;
  }

  const instanceMatch = raw.match(/^(https?:\/\/[^/]+\/mibc-[a-z0-9-]+)/i);
  if (instanceMatch) return instanceMatch[1];

  return raw
    .replace(/\/(admin|protect|auth)(\/.*)?$/i, "")
    .replace(/\/+$/, "");
}

/**
 * Parse a stored URL into UI fields for the instance picker.
 * @returns {{ kind: 'partner'|'instance'|'custom', region: string, number: string, slug: string }}
 */
export function parseMailinblackApiUrl(url) {
  const normalized = normalizeMailinblackApiUrl(url);
  if (!normalized) {
    return { kind: "instance", region: "fr", number: "", slug: "" };
  }
  if (/partner\.mailinblack\.com/i.test(normalized)) {
    return { kind: "partner", region: "fr", number: "", slug: "" };
  }

  const pathMatch = normalized.match(/\/(mibc-([a-z0-9]+)-(\d+))$/i);
  if (pathMatch) {
    const region = pathMatch[2].toLowerCase();
    const number = padInstanceNumber(pathMatch[3]);
    const known = MAILINBLACK_INSTANCE_REGIONS.some(r => r.value === region);
    return {
      kind: "instance",
      region: known ? region : "custom",
      number,
      slug: pathMatch[1].toLowerCase()
    };
  }

  return {
    kind: "custom",
    region: "custom",
    number: "",
    slug: normalized
  };
}
