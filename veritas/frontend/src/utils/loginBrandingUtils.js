import API_BASE_URL from "../config";
const BACKEND_BASE_URL = String(API_BASE_URL || "").replace(/\/api\/?$/, "");
export const LOGIN_SIDES = ["agent", "client"];
export const DEFAULT_SIDE_COLORS = {
  agent: {
    bgColorStart: "#0f1c2e",
    bgColorEnd: "#1a3060",
    accentColor: "#2b5fab",
    rightBgColor: "#f4f6fa"
  },
  client: {
    bgColorStart: "#0f2014",
    bgColorEnd: "#1a4030",
    accentColor: "#15ab5a",
    rightBgColor: "#f4f6fa"
  }
};
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
    headlineLine1: settings[`${prefix}headline_line1`] || "",
    headlineLine2: settings[`${prefix}headline_line2`] || "",
    sub: settings[`${prefix}sub`] || "",
    features: features.join("\n"),
    brandName: settings[`${prefix}brand_name`] || "",
    logoPath: settings[`${prefix}logo_path`] || "",
    bgImagePath: settings[`${prefix}bg_image_path`] || "",
    bgColorStart: settings[`${prefix}bg_color_start`] || "",
    bgColorEnd: settings[`${prefix}bg_color_end`] || "",
    accentColor: settings[`${prefix}accent_color`] || "",
    rightBgColor: settings[`${prefix}right_bg_color`] || "",
    footerText: settings[`${prefix}footer_text`] || ""
  };
}
export function sideFormToFlat(side, form = {}) {
  const prefix = `app_login_${side}_`;
  const features = String(form.features || "").split("\n").map(line => line.trim()).filter(Boolean).slice(0, 6);
  return {
    [`${prefix}enabled`]: form.enabled ? "true" : "false",
    [`${prefix}headline_line1`]: String(form.headlineLine1 || "").trim(),
    [`${prefix}headline_line2`]: String(form.headlineLine2 || "").trim(),
    [`${prefix}sub`]: String(form.sub || "").trim(),
    [`${prefix}features`]: JSON.stringify(features),
    [`${prefix}brand_name`]: String(form.brandName || "").trim(),
    [`${prefix}logo_path`]: String(form.logoPath || "").trim(),
    [`${prefix}bg_image_path`]: String(form.bgImagePath || "").trim(),
    [`${prefix}bg_color_start`]: String(form.bgColorStart || "").trim(),
    [`${prefix}bg_color_end`]: String(form.bgColorEnd || "").trim(),
    [`${prefix}accent_color`]: String(form.accentColor || "").trim(),
    [`${prefix}right_bg_color`]: String(form.rightBgColor || "").trim(),
    [`${prefix}footer_text`]: String(form.footerText || "").trim()
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
      bgImageUrl: null,
      footerText: null,
      colors: DEFAULT_SIDE_COLORS[side],
      custom: false
    };
  }
  const defaults = DEFAULT_SIDE_COLORS[side];
  return {
    headlineLine1: brandingSide.headlineLine1 || authPanel.headlineLine1,
    headlineLine2: brandingSide.headlineLine2 || authPanel.headlineLine2,
    sub: brandingSide.sub || authPanel.sub,
    features: brandingSide.features?.length ? brandingSide.features : authPanel.features,
    brandName: brandingSide.brandName || null,
    logoUrl: resolveLoginAssetUrl(brandingSide.logoPath),
    bgImageUrl: resolveLoginAssetUrl(brandingSide.bgImagePath),
    footerText: brandingSide.footerText || null,
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
  const style = {
    "--login-bg-start": colors.bgColorStart,
    "--login-bg-end": colors.bgColorEnd,
    "--login-accent": colors.accentColor,
    "--login-right-bg": colors.rightBgColor
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
