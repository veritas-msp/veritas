export const LOGIN_BRANDING_SECTION = "login";
export const LOGIN_SIDES = ["agent", "client"];

const SIDE_FIELDS = [
  "enabled",
  "headline_line1",
  "headline_line2",
  "sub",
  "features",
  "brand_name",
  "logo_path",
  "logo_transparent",
  "logo_bg_color",
  "bg_image_path",
  "bg_color_start",
  "bg_color_end",
  "accent_color",
  "right_bg_color",
  "right_bg_image_path",
  "footer_text",
  // Layout / position
  "content_align",
  "content_valign",
  "logo_align",
  "html_position",
  // Typography
  "font_family",
  "headline_size",
  "headline_weight",
  "headline_tracking",
  "sub_size",
  "sub_weight",
  "sub_line_height",
  "features_size",
  "brand_name_size",
  // HTML blocks
  "html_block",
  "form_html"
];

const BOOL_FIELDS = new Set(["enabled", "logo_transparent"]);

const ENUMS = {
  content_align: new Set(["left", "center"]),
  content_valign: new Set(["top", "center", "bottom"]),
  logo_align: new Set(["left", "center"]),
  html_position: new Set(["after_sub", "after_features", "bottom", "before_headline"]),
  font_family: new Set(["default", "geometric", "humanist", "slab", "mono"]),
  headline_size: new Set(["sm", "md", "lg", "xl"]),
  headline_weight: new Set(["400", "500", "600", "700", "800"]),
  headline_tracking: new Set(["tight", "normal", "wide"]),
  sub_size: new Set(["sm", "md", "lg"]),
  sub_weight: new Set(["400", "500", "600"]),
  sub_line_height: new Set(["tight", "normal", "relaxed"]),
  features_size: new Set(["sm", "md", "lg"]),
  brand_name_size: new Set(["sm", "md", "lg"])
};

const ENUM_DEFAULTS = {
  content_align: "left",
  content_valign: "top",
  logo_align: "left",
  html_position: "after_features",
  font_family: "default",
  headline_size: "md",
  headline_weight: "700",
  headline_tracking: "normal",
  sub_size: "md",
  sub_weight: "400",
  sub_line_height: "normal",
  features_size: "md",
  brand_name_size: "md"
};

const HTML_MAX_LEN = 12000;

export const LOGIN_BRANDING_LABELS = {};
for (const side of LOGIN_SIDES) {
  for (const field of SIDE_FIELDS) {
    const key = `app_login_${side}_${field}`;
    LOGIN_BRANDING_LABELS[key] = `Login ${side} — ${field}`;
  }
}

export const DEFAULT_LOGIN_BRANDING = {};
for (const side of LOGIN_SIDES) {
  for (const field of SIDE_FIELDS) {
    if (BOOL_FIELDS.has(field)) {
      DEFAULT_LOGIN_BRANDING[`app_login_${side}_${field}`] = "false";
    } else if (ENUM_DEFAULTS[field] != null) {
      DEFAULT_LOGIN_BRANDING[`app_login_${side}_${field}`] = ENUM_DEFAULTS[field];
    } else {
      DEFAULT_LOGIN_BRANDING[`app_login_${side}_${field}`] = "";
    }
  }
}

const HEX_COLOR = /^#([0-9a-fA-F]{6})$/;
export function isValidHexColor(value) {
  return HEX_COLOR.test(String(value || "").trim());
}
function normalizeHexColor(value, fallback = "") {
  const trimmed = String(value || "").trim();
  return isValidHexColor(trimmed) ? trimmed.toLowerCase() : fallback;
}
/** Empty string = use defaults/hints. Whitespace-only = intentional blank (stored as a single space). */
function normalizeText(value, maxLen) {
  const raw = String(value ?? "");
  if (raw.length > 0 && raw.trim() === "") return " ";
  return raw.trim().slice(0, maxLen);
}
function normalizeBool(value) {
  return value === true || String(value).toLowerCase() === "true";
}
function normalizeEnum(value, field) {
  const allowed = ENUMS[field];
  const fallback = ENUM_DEFAULTS[field] || "";
  if (!allowed) return fallback;
  const raw = String(value ?? "").trim().toLowerCase();
  return allowed.has(raw) ? raw : fallback;
}
function normalizeFeatures(raw) {
  let items = [];
  if (Array.isArray(raw)) {
    items = raw;
  } else if (typeof raw === "string" && raw.trim()) {
    try {
      const parsed = JSON.parse(raw);
      items = Array.isArray(parsed) ? parsed : raw.split("\n");
    } catch {
      items = raw.split("\n");
    }
  }
  return items.map(item => String(item || "").trim()).filter(Boolean).slice(0, 6);
}
function normalizeAssetPath(value) {
  const trimmed = String(value || "").trim().replace(/\\/g, "/");
  if (!trimmed) return "";
  if (!trimmed.startsWith("/uploads/login-branding/")) return "";
  return trimmed;
}
/** Strip obvious script/handlers before storage; DOMPurify runs again on render. */
export function sanitizeLoginHtmlForStorage(raw, maxLen = HTML_MAX_LEN) {
  let html = String(raw ?? "");
  if (!html.trim()) return "";
  html = html
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, "")
    .replace(/<iframe[\s\S]*?>[\s\S]*?<\/iframe>/gi, "")
    .replace(/<object[\s\S]*?>[\s\S]*?<\/object>/gi, "")
    .replace(/<embed\b[^>]*>/gi, "")
    .replace(/\son\w+\s*=\s*(['"]).*?\1/gi, "")
    .replace(/\son\w+\s*=\s*[^\s>]+/gi, "")
    .replace(/javascript\s*:/gi, "")
    .replace(/data\s*:\s*text\/html/gi, "");
  return html.slice(0, maxLen);
}
function normalizeSideSettings(input = {}, side) {
  const prefix = `app_login_${side}_`;
  return {
    enabled: normalizeBool(input[`${prefix}enabled`]),
    headlineLine1: normalizeText(input[`${prefix}headline_line1`], 120),
    headlineLine2: normalizeText(input[`${prefix}headline_line2`], 120),
    sub: normalizeText(input[`${prefix}sub`], 400),
    features: normalizeFeatures(input[`${prefix}features`]),
    brandName: normalizeText(input[`${prefix}brand_name`], 80),
    logoPath: normalizeAssetPath(input[`${prefix}logo_path`]),
    logoTransparent: normalizeBool(input[`${prefix}logo_transparent`]),
    logoBgColor: normalizeHexColor(input[`${prefix}logo_bg_color`]),
    bgImagePath: normalizeAssetPath(input[`${prefix}bg_image_path`]),
    bgColorStart: normalizeHexColor(input[`${prefix}bg_color_start`]),
    bgColorEnd: normalizeHexColor(input[`${prefix}bg_color_end`]),
    accentColor: normalizeHexColor(input[`${prefix}accent_color`]),
    rightBgColor: normalizeHexColor(input[`${prefix}right_bg_color`]),
    rightBgImagePath: normalizeAssetPath(input[`${prefix}right_bg_image_path`]),
    footerText: normalizeText(input[`${prefix}footer_text`], 200),
    contentAlign: normalizeEnum(input[`${prefix}content_align`], "content_align"),
    contentValign: normalizeEnum(input[`${prefix}content_valign`], "content_valign"),
    logoAlign: normalizeEnum(input[`${prefix}logo_align`], "logo_align"),
    htmlPosition: normalizeEnum(input[`${prefix}html_position`], "html_position"),
    fontFamily: normalizeEnum(input[`${prefix}font_family`], "font_family"),
    headlineSize: normalizeEnum(input[`${prefix}headline_size`], "headline_size"),
    headlineWeight: normalizeEnum(input[`${prefix}headline_weight`], "headline_weight"),
    headlineTracking: normalizeEnum(input[`${prefix}headline_tracking`], "headline_tracking"),
    subSize: normalizeEnum(input[`${prefix}sub_size`], "sub_size"),
    subWeight: normalizeEnum(input[`${prefix}sub_weight`], "sub_weight"),
    subLineHeight: normalizeEnum(input[`${prefix}sub_line_height`], "sub_line_height"),
    featuresSize: normalizeEnum(input[`${prefix}features_size`], "features_size"),
    brandNameSize: normalizeEnum(input[`${prefix}brand_name_size`], "brand_name_size"),
    htmlBlock: sanitizeLoginHtmlForStorage(input[`${prefix}html_block`]),
    formHtml: sanitizeLoginHtmlForStorage(input[`${prefix}form_html`])
  };
}
export function normalizeLoginBrandingFlat(input = {}) {
  const out = {
    ...DEFAULT_LOGIN_BRANDING
  };
  for (const side of LOGIN_SIDES) {
    const normalized = normalizeSideSettings(input, side);
    const prefix = `app_login_${side}_`;
    out[`${prefix}enabled`] = normalized.enabled ? "true" : "false";
    out[`${prefix}headline_line1`] = normalized.headlineLine1;
    out[`${prefix}headline_line2`] = normalized.headlineLine2;
    out[`${prefix}sub`] = normalized.sub;
    out[`${prefix}features`] = JSON.stringify(normalized.features);
    out[`${prefix}brand_name`] = normalized.brandName;
    out[`${prefix}logo_path`] = normalized.logoPath;
    out[`${prefix}logo_transparent`] = normalized.logoTransparent ? "true" : "false";
    out[`${prefix}logo_bg_color`] = normalized.logoBgColor;
    out[`${prefix}bg_image_path`] = normalized.bgImagePath;
    out[`${prefix}bg_color_start`] = normalized.bgColorStart;
    out[`${prefix}bg_color_end`] = normalized.bgColorEnd;
    out[`${prefix}accent_color`] = normalized.accentColor;
    out[`${prefix}right_bg_color`] = normalized.rightBgColor;
    out[`${prefix}right_bg_image_path`] = normalized.rightBgImagePath;
    out[`${prefix}footer_text`] = normalized.footerText;
    out[`${prefix}content_align`] = normalized.contentAlign;
    out[`${prefix}content_valign`] = normalized.contentValign;
    out[`${prefix}logo_align`] = normalized.logoAlign;
    out[`${prefix}html_position`] = normalized.htmlPosition;
    out[`${prefix}font_family`] = normalized.fontFamily;
    out[`${prefix}headline_size`] = normalized.headlineSize;
    out[`${prefix}headline_weight`] = normalized.headlineWeight;
    out[`${prefix}headline_tracking`] = normalized.headlineTracking;
    out[`${prefix}sub_size`] = normalized.subSize;
    out[`${prefix}sub_weight`] = normalized.subWeight;
    out[`${prefix}sub_line_height`] = normalized.subLineHeight;
    out[`${prefix}features_size`] = normalized.featuresSize;
    out[`${prefix}brand_name_size`] = normalized.brandNameSize;
    out[`${prefix}html_block`] = normalized.htmlBlock;
    out[`${prefix}form_html`] = normalized.formHtml;
  }
  return out;
}
export function buildLoginBrandingPayload(flat = {}) {
  const agent = normalizeSideSettings(flat, "agent");
  const client = normalizeSideSettings(flat, "client");
  return {
    agent,
    client
  };
}
export function buildPublicLoginBranding(flat = {}, {
  pro = false
} = {}) {
  if (!pro) {
    return {
      pro: false,
      agent: null,
      client: null
    };
  }
  const payload = buildLoginBrandingPayload(flat);
  return {
    pro: true,
    agent: payload.agent.enabled ? payload.agent : null,
    client: payload.client.enabled ? payload.client : null
  };
}
