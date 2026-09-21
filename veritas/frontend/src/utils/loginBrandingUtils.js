import API_BASE_URL from "../config";
const BACKEND_BASE_URL = String(API_BASE_URL || "").replace(/\/api\/?$/, "");
export const LOGIN_SIDES = ["agent", "client"];
export const LOGIN_BRANDING_MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

export const LOGIN_FONT_FAMILIES = {
  default: 'ui-sans-serif, system-ui, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  geometric: '"Avenir Next", "Segoe UI", "Trebuchet MS", sans-serif',
  humanist: 'Georgia, "Iowan Old Style", "Palatino Linotype", Palatino, serif',
  slab: '"Rockwell", "Roboto Slab", "Courier New", Georgia, serif',
  mono: 'ui-monospace, "SF Mono", "Cascadia Code", "Segoe UI Mono", Consolas, monospace'
};

export const LOGIN_TYPO_OPTIONS = {
  contentAlign: ["left", "center"],
  contentValign: ["top", "center", "bottom"],
  logoAlign: ["left", "center"],
  htmlPosition: ["after_sub", "after_features", "bottom", "before_headline"],
  fontFamily: ["default", "geometric", "humanist", "slab", "mono"],
  headlineSize: ["sm", "md", "lg", "xl"],
  headlineWeight: ["400", "500", "600", "700", "800"],
  headlineTracking: ["tight", "normal", "wide"],
  subSize: ["sm", "md", "lg"],
  subWeight: ["400", "500", "600"],
  subLineHeight: ["tight", "normal", "relaxed"],
  featuresSize: ["sm", "md", "lg"],
  brandNameSize: ["sm", "md", "lg"]
};

export const LOGIN_TYPO_DEFAULTS = {
  contentAlign: "left",
  contentValign: "top",
  logoAlign: "left",
  htmlPosition: "after_features",
  fontFamily: "default",
  headlineSize: "md",
  headlineWeight: "700",
  headlineTracking: "normal",
  subSize: "md",
  subWeight: "400",
  subLineHeight: "normal",
  featuresSize: "md",
  brandNameSize: "md"
};

const HEADLINE_SIZE_MAP = { sm: "1.55rem", md: "1.9rem", lg: "2.25rem", xl: "2.65rem" };
const SUB_SIZE_MAP = { sm: "0.88rem", md: "0.98rem", lg: "1.08rem" };
const FEATURES_SIZE_MAP = { sm: "0.82rem", md: "0.9rem", lg: "1rem" };
const BRAND_SIZE_MAP = { sm: "0.95rem", md: "1.05rem", lg: "1.2rem" };
const TRACKING_MAP = { tight: "-0.02em", normal: "0", wide: "0.04em" };
const LINE_HEIGHT_MAP = { tight: "1.35", normal: "1.55", relaxed: "1.75" };

export const DEFAULT_SIDE_COLORS = {
  agent: {
    bgColorStart: "#0f1c2e",
    bgColorEnd: "#1a3060",
    accentColor: "#2b5fab",
    rightBgColor: "#f4f6fa",
    logoBgColor: "#ffffff"
  },
  client: {
    bgColorStart: "#0f2014",
    bgColorEnd: "#1a4030",
    accentColor: "#15ab5a",
    rightBgColor: "#f4f6fa",
    logoBgColor: "#ffffff"
  }
};

/** Empty = use hints/defaults. Whitespace-only = intentional blank (kept as a single space). */
export function serializeTextField(value) {
  const raw = String(value ?? "");
  if (raw.length > 0 && raw.trim() === "") return " ";
  return raw.trim();
}
/** Resolve stored branding text: "" → fallback, whitespace-only → blank, other → trimmed value. */
export function resolveBrandingText(value, fallback) {
  if (value == null || value === "") return fallback;
  return String(value).trim();
}
/** Optional text: unset ("") → null (use UI default), whitespace → "" (intentional blank). */
export function resolveOptionalBrandingText(value) {
  if (value == null || value === "") return null;
  return String(value).trim();
}
function pickEnum(value, allowed, fallback) {
  const raw = String(value ?? "").trim().toLowerCase();
  return allowed.includes(raw) ? raw : fallback;
}
export function resolveLoginAssetUrl(relativePath) {
  const raw = String(relativePath || "").trim();
  if (!raw) return null;
  if (/^https?:\/\//i.test(raw)) return raw;
  const normalized = raw.replace(/\\/g, "/");
  const uploadsIndex = normalized.toLowerCase().indexOf("/uploads/");
  const relative = uploadsIndex >= 0 ? normalized.slice(uploadsIndex) : normalized;
  if (!relative.startsWith("/")) return null;
  const encodedPath = relative.split("/").map((part, index) => index === 0 ? part : encodeURIComponent(part)).join("/");
  return `${BACKEND_BASE_URL}${encodedPath}`;
}
export function flatToSideForm(settings = {}, side) {
  const prefix = `app_login_${side}_`;
  let features = [];
  try {
    const parsed = JSON.parse(settings[`${prefix}features`] || "[]");
    features = Array.isArray(parsed) ? parsed : [];
  } catch {
    features = [];
  }
  return {
    enabled: settings[`${prefix}enabled`] === "true",
    headlineLine1: settings[`${prefix}headline_line1`] ?? "",
    headlineLine2: settings[`${prefix}headline_line2`] ?? "",
    sub: settings[`${prefix}sub`] ?? "",
    features: features.join("\n"),
    brandName: settings[`${prefix}brand_name`] ?? "",
    logoPath: settings[`${prefix}logo_path`] || "",
    logoTransparent: settings[`${prefix}logo_transparent`] === "true",
    logoBgColor: settings[`${prefix}logo_bg_color`] || "",
    bgImagePath: settings[`${prefix}bg_image_path`] || "",
    bgColorStart: settings[`${prefix}bg_color_start`] || "",
    bgColorEnd: settings[`${prefix}bg_color_end`] || "",
    accentColor: settings[`${prefix}accent_color`] || "",
    rightBgColor: settings[`${prefix}right_bg_color`] || "",
    rightBgImagePath: settings[`${prefix}right_bg_image_path`] || "",
    footerText: settings[`${prefix}footer_text`] ?? "",
    contentAlign: pickEnum(settings[`${prefix}content_align`], LOGIN_TYPO_OPTIONS.contentAlign, LOGIN_TYPO_DEFAULTS.contentAlign),
    contentValign: pickEnum(settings[`${prefix}content_valign`], LOGIN_TYPO_OPTIONS.contentValign, LOGIN_TYPO_DEFAULTS.contentValign),
    logoAlign: pickEnum(settings[`${prefix}logo_align`], LOGIN_TYPO_OPTIONS.logoAlign, LOGIN_TYPO_DEFAULTS.logoAlign),
    htmlPosition: pickEnum(settings[`${prefix}html_position`], LOGIN_TYPO_OPTIONS.htmlPosition, LOGIN_TYPO_DEFAULTS.htmlPosition),
    fontFamily: pickEnum(settings[`${prefix}font_family`], LOGIN_TYPO_OPTIONS.fontFamily, LOGIN_TYPO_DEFAULTS.fontFamily),
    headlineSize: pickEnum(settings[`${prefix}headline_size`], LOGIN_TYPO_OPTIONS.headlineSize, LOGIN_TYPO_DEFAULTS.headlineSize),
    headlineWeight: pickEnum(settings[`${prefix}headline_weight`], LOGIN_TYPO_OPTIONS.headlineWeight, LOGIN_TYPO_DEFAULTS.headlineWeight),
    headlineTracking: pickEnum(settings[`${prefix}headline_tracking`], LOGIN_TYPO_OPTIONS.headlineTracking, LOGIN_TYPO_DEFAULTS.headlineTracking),
    subSize: pickEnum(settings[`${prefix}sub_size`], LOGIN_TYPO_OPTIONS.subSize, LOGIN_TYPO_DEFAULTS.subSize),
    subWeight: pickEnum(settings[`${prefix}sub_weight`], LOGIN_TYPO_OPTIONS.subWeight, LOGIN_TYPO_DEFAULTS.subWeight),
    subLineHeight: pickEnum(settings[`${prefix}sub_line_height`], LOGIN_TYPO_OPTIONS.subLineHeight, LOGIN_TYPO_DEFAULTS.subLineHeight),
    featuresSize: pickEnum(settings[`${prefix}features_size`], LOGIN_TYPO_OPTIONS.featuresSize, LOGIN_TYPO_DEFAULTS.featuresSize),
    brandNameSize: pickEnum(settings[`${prefix}brand_name_size`], LOGIN_TYPO_OPTIONS.brandNameSize, LOGIN_TYPO_DEFAULTS.brandNameSize),
    htmlBlock: settings[`${prefix}html_block`] ?? "",
    formHtml: settings[`${prefix}form_html`] ?? ""
  };
}
export function sideFormToFlat(side, form = {}) {
  const prefix = `app_login_${side}_`;
  const features = String(form.features || "").split("\n").map(line => line.trim()).filter(Boolean).slice(0, 6);
  return {
    [`${prefix}enabled`]: form.enabled ? "true" : "false",
    [`${prefix}headline_line1`]: serializeTextField(form.headlineLine1),
    [`${prefix}headline_line2`]: serializeTextField(form.headlineLine2),
    [`${prefix}sub`]: serializeTextField(form.sub),
    [`${prefix}features`]: JSON.stringify(features),
    [`${prefix}brand_name`]: serializeTextField(form.brandName),
    [`${prefix}logo_path`]: String(form.logoPath || "").trim(),
    [`${prefix}logo_transparent`]: form.logoTransparent ? "true" : "false",
    [`${prefix}logo_bg_color`]: String(form.logoBgColor || "").trim(),
    [`${prefix}bg_image_path`]: String(form.bgImagePath || "").trim(),
    [`${prefix}bg_color_start`]: String(form.bgColorStart || "").trim(),
    [`${prefix}bg_color_end`]: String(form.bgColorEnd || "").trim(),
    [`${prefix}accent_color`]: String(form.accentColor || "").trim(),
    [`${prefix}right_bg_color`]: String(form.rightBgColor || "").trim(),
    [`${prefix}right_bg_image_path`]: String(form.rightBgImagePath || "").trim(),
    [`${prefix}footer_text`]: serializeTextField(form.footerText),
    [`${prefix}content_align`]: pickEnum(form.contentAlign, LOGIN_TYPO_OPTIONS.contentAlign, LOGIN_TYPO_DEFAULTS.contentAlign),
    [`${prefix}content_valign`]: pickEnum(form.contentValign, LOGIN_TYPO_OPTIONS.contentValign, LOGIN_TYPO_DEFAULTS.contentValign),
    [`${prefix}logo_align`]: pickEnum(form.logoAlign, LOGIN_TYPO_OPTIONS.logoAlign, LOGIN_TYPO_DEFAULTS.logoAlign),
    [`${prefix}html_position`]: pickEnum(form.htmlPosition, LOGIN_TYPO_OPTIONS.htmlPosition, LOGIN_TYPO_DEFAULTS.htmlPosition),
    [`${prefix}font_family`]: pickEnum(form.fontFamily, LOGIN_TYPO_OPTIONS.fontFamily, LOGIN_TYPO_DEFAULTS.fontFamily),
    [`${prefix}headline_size`]: pickEnum(form.headlineSize, LOGIN_TYPO_OPTIONS.headlineSize, LOGIN_TYPO_DEFAULTS.headlineSize),
    [`${prefix}headline_weight`]: pickEnum(form.headlineWeight, LOGIN_TYPO_OPTIONS.headlineWeight, LOGIN_TYPO_DEFAULTS.headlineWeight),
    [`${prefix}headline_tracking`]: pickEnum(form.headlineTracking, LOGIN_TYPO_OPTIONS.headlineTracking, LOGIN_TYPO_DEFAULTS.headlineTracking),
    [`${prefix}sub_size`]: pickEnum(form.subSize, LOGIN_TYPO_OPTIONS.subSize, LOGIN_TYPO_DEFAULTS.subSize),
    [`${prefix}sub_weight`]: pickEnum(form.subWeight, LOGIN_TYPO_OPTIONS.subWeight, LOGIN_TYPO_DEFAULTS.subWeight),
    [`${prefix}sub_line_height`]: pickEnum(form.subLineHeight, LOGIN_TYPO_OPTIONS.subLineHeight, LOGIN_TYPO_DEFAULTS.subLineHeight),
    [`${prefix}features_size`]: pickEnum(form.featuresSize, LOGIN_TYPO_OPTIONS.featuresSize, LOGIN_TYPO_DEFAULTS.featuresSize),
    [`${prefix}brand_name_size`]: pickEnum(form.brandNameSize, LOGIN_TYPO_OPTIONS.brandNameSize, LOGIN_TYPO_DEFAULTS.brandNameSize),
    [`${prefix}html_block`]: String(form.htmlBlock || "").slice(0, 12000),
    [`${prefix}form_html`]: String(form.formHtml || "").slice(0, 12000)
  };
}
export function mergeBrandingWithAuthCopy(brandingSide, authPanel, side) {
  if (!brandingSide) {
    return {
      headlineLine1: authPanel.headlineLine1,
      headlineLine2: authPanel.headlineLine2,
      sub: authPanel.sub,
      features: authPanel.features,
      brandName: null,
      logoUrl: null,
      logoTransparent: false,
      logoBgColor: null,
      bgImageUrl: null,
      rightBgImageUrl: null,
      footerText: null,
      htmlBlock: "",
      formHtml: "",
      layout: { ...LOGIN_TYPO_DEFAULTS },
      colors: DEFAULT_SIDE_COLORS[side],
      custom: false
    };
  }
  const defaults = DEFAULT_SIDE_COLORS[side];
  return {
    headlineLine1: resolveBrandingText(brandingSide.headlineLine1, authPanel.headlineLine1),
    headlineLine2: resolveBrandingText(brandingSide.headlineLine2, authPanel.headlineLine2),
    sub: resolveBrandingText(brandingSide.sub, authPanel.sub),
    features: brandingSide.features?.length ? brandingSide.features : authPanel.features,
    brandName: resolveOptionalBrandingText(brandingSide.brandName),
    logoUrl: resolveLoginAssetUrl(brandingSide.logoPath),
    logoTransparent: Boolean(brandingSide.logoTransparent),
    logoBgColor: brandingSide.logoBgColor || defaults.logoBgColor,
    bgImageUrl: resolveLoginAssetUrl(brandingSide.bgImagePath),
    rightBgImageUrl: resolveLoginAssetUrl(brandingSide.rightBgImagePath),
    footerText: resolveOptionalBrandingText(brandingSide.footerText),
    htmlBlock: String(brandingSide.htmlBlock || "").trim(),
    formHtml: String(brandingSide.formHtml || "").trim(),
    layout: {
      contentAlign: pickEnum(brandingSide.contentAlign, LOGIN_TYPO_OPTIONS.contentAlign, LOGIN_TYPO_DEFAULTS.contentAlign),
      contentValign: pickEnum(brandingSide.contentValign, LOGIN_TYPO_OPTIONS.contentValign, LOGIN_TYPO_DEFAULTS.contentValign),
      logoAlign: pickEnum(brandingSide.logoAlign, LOGIN_TYPO_OPTIONS.logoAlign, LOGIN_TYPO_DEFAULTS.logoAlign),
      htmlPosition: pickEnum(brandingSide.htmlPosition, LOGIN_TYPO_OPTIONS.htmlPosition, LOGIN_TYPO_DEFAULTS.htmlPosition),
      fontFamily: pickEnum(brandingSide.fontFamily, LOGIN_TYPO_OPTIONS.fontFamily, LOGIN_TYPO_DEFAULTS.fontFamily),
      headlineSize: pickEnum(brandingSide.headlineSize, LOGIN_TYPO_OPTIONS.headlineSize, LOGIN_TYPO_DEFAULTS.headlineSize),
      headlineWeight: pickEnum(brandingSide.headlineWeight, LOGIN_TYPO_OPTIONS.headlineWeight, LOGIN_TYPO_DEFAULTS.headlineWeight),
      headlineTracking: pickEnum(brandingSide.headlineTracking, LOGIN_TYPO_OPTIONS.headlineTracking, LOGIN_TYPO_DEFAULTS.headlineTracking),
      subSize: pickEnum(brandingSide.subSize, LOGIN_TYPO_OPTIONS.subSize, LOGIN_TYPO_DEFAULTS.subSize),
      subWeight: pickEnum(brandingSide.subWeight, LOGIN_TYPO_OPTIONS.subWeight, LOGIN_TYPO_DEFAULTS.subWeight),
      subLineHeight: pickEnum(brandingSide.subLineHeight, LOGIN_TYPO_OPTIONS.subLineHeight, LOGIN_TYPO_DEFAULTS.subLineHeight),
      featuresSize: pickEnum(brandingSide.featuresSize, LOGIN_TYPO_OPTIONS.featuresSize, LOGIN_TYPO_DEFAULTS.featuresSize),
      brandNameSize: pickEnum(brandingSide.brandNameSize, LOGIN_TYPO_OPTIONS.brandNameSize, LOGIN_TYPO_DEFAULTS.brandNameSize)
    },
    colors: {
      bgColorStart: brandingSide.bgColorStart || defaults.bgColorStart,
      bgColorEnd: brandingSide.bgColorEnd || defaults.bgColorEnd,
      accentColor: brandingSide.accentColor || defaults.accentColor,
      rightBgColor: brandingSide.rightBgColor || defaults.rightBgColor
    },
    custom: true
  };
}
export function buildLoginBrandingStyleVars(panel, accountType) {
  const colors = panel.colors || DEFAULT_SIDE_COLORS[accountType];
  const layout = panel.layout || LOGIN_TYPO_DEFAULTS;
  const fontStack = LOGIN_FONT_FAMILIES[layout.fontFamily] || LOGIN_FONT_FAMILIES.default;
  const style = {
    "--login-bg-start": colors.bgColorStart,
    "--login-bg-end": colors.bgColorEnd,
    "--login-accent": colors.accentColor,
    "--login-right-bg": colors.rightBgColor,
    "--login-font-family": fontStack,
    "--login-headline-size": HEADLINE_SIZE_MAP[layout.headlineSize] || HEADLINE_SIZE_MAP.md,
    "--login-headline-weight": layout.headlineWeight || "700",
    "--login-headline-tracking": TRACKING_MAP[layout.headlineTracking] || TRACKING_MAP.normal,
    "--login-sub-size": SUB_SIZE_MAP[layout.subSize] || SUB_SIZE_MAP.md,
    "--login-sub-weight": layout.subWeight || "400",
    "--login-sub-line-height": LINE_HEIGHT_MAP[layout.subLineHeight] || LINE_HEIGHT_MAP.normal,
    "--login-features-size": FEATURES_SIZE_MAP[layout.featuresSize] || FEATURES_SIZE_MAP.md,
    "--login-brand-size": BRAND_SIZE_MAP[layout.brandNameSize] || BRAND_SIZE_MAP.md,
    "--login-content-align": layout.contentAlign === "center" ? "center" : "flex-start",
    "--login-text-align": layout.contentAlign === "center" ? "center" : "left"
  };
  const gradient = `linear-gradient(160deg, ${colors.bgColorStart} 0%, ${colors.bgColorEnd} 60%, ${colors.bgColorEnd} 100%)`;
  if (panel.bgImageUrl) {
    style.backgroundImage = `linear-gradient(160deg, ${colors.bgColorStart}cc 0%, ${colors.bgColorEnd}cc 100%), url("${panel.bgImageUrl}")`;
    style.backgroundSize = "cover";
    style.backgroundPosition = "center";
  } else {
    style.background = gradient;
  }
  return style;
}
export function buildLoginRightPanelStyle(panel, accountType) {
  if (!panel?.custom) return undefined;
  const colors = panel.colors || DEFAULT_SIDE_COLORS[accountType];
  const style = {
    backgroundColor: colors.rightBgColor
  };
  if (panel.rightBgImageUrl) {
    style.backgroundImage = `url("${panel.rightBgImageUrl}")`;
    style.backgroundSize = "cover";
    style.backgroundPosition = "center";
    style.backgroundRepeat = "no-repeat";
  }
  return style;
}

export function buildLoginAsideClassNames(styles, panel) {
  const layout = panel?.layout || LOGIN_TYPO_DEFAULTS;
  const parts = [];
  if (layout.contentAlign === "center") parts.push(styles.leftAlignCenter);
  if (layout.contentValign === "center") parts.push(styles.leftValignCenter);
  if (layout.contentValign === "bottom") parts.push(styles.leftValignBottom);
  if (layout.logoAlign === "center") parts.push(styles.leftLogoCenter);
  return parts.filter(Boolean).join(" ");
}
