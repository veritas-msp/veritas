import { getSettingsMap } from "./settingsHelper.js";
import { GENERAL_SETTING_KEYS } from "./generalSettings.js";

export const REPORT_BRANDING_SECTION = "reports";

const SANS_FALLBACK = '"Segoe UI", Roboto, Helvetica, Arial, sans-serif';
const SERIF_FALLBACK = 'Georgia, "Times New Roman", Times, serif';

function sansPreset(id, label, family, google) {
  return {
    id,
    label,
    stack: `"${family}", ${SANS_FALLBACK}`,
    google
  };
}

function serifPreset(id, label, family, google) {
  return {
    id,
    label,
    stack: `"${family}", ${SERIF_FALLBACK}`,
    google
  };
}

export const REPORT_FONT_SANS_PRESETS = {
  source_sans: sansPreset("source_sans", "Source Sans 3", "Source Sans 3", "Source+Sans+3:wght@400;500;600;700"),
  inter: sansPreset("inter", "Inter", "Inter", "Inter:wght@400;500;600;700"),
  ibm_plex: sansPreset("ibm_plex", "IBM Plex Sans", "IBM Plex Sans", "IBM+Plex+Sans:wght@400;500;600;700"),
  nunito: sansPreset("nunito", "Nunito Sans", "Nunito Sans", "Nunito+Sans:wght@400;500;600;700"),
  roboto: sansPreset("roboto", "Roboto", "Roboto", "Roboto:wght@400;500;600;700"),
  open_sans: sansPreset("open_sans", "Open Sans", "Open Sans", "Open+Sans:wght@400;500;600;700"),
  lato: sansPreset("lato", "Lato", "Lato", "Lato:wght@400;700"),
  montserrat: sansPreset("montserrat", "Montserrat", "Montserrat", "Montserrat:wght@400;500;600;700"),
  poppins: sansPreset("poppins", "Poppins", "Poppins", "Poppins:wght@400;500;600;700"),
  raleway: sansPreset("raleway", "Raleway", "Raleway", "Raleway:wght@400;500;600;700"),
  work_sans: sansPreset("work_sans", "Work Sans", "Work Sans", "Work+Sans:wght@400;500;600;700"),
  dm_sans: sansPreset("dm_sans", "DM Sans", "DM Sans", "DM+Sans:wght@400;500;600;700"),
  manrope: sansPreset("manrope", "Manrope", "Manrope", "Manrope:wght@400;500;600;700"),
  outfit: sansPreset("outfit", "Outfit", "Outfit", "Outfit:wght@400;500;600;700"),
  figtree: sansPreset("figtree", "Figtree", "Figtree", "Figtree:wght@400;500;600;700"),
  plus_jakarta: sansPreset("plus_jakarta", "Plus Jakarta Sans", "Plus Jakarta Sans", "Plus+Jakarta+Sans:wght@400;500;600;700"),
  space_grotesk: sansPreset("space_grotesk", "Space Grotesk", "Space Grotesk", "Space+Grotesk:wght@400;500;600;700"),
  rubik: sansPreset("rubik", "Rubik", "Rubik", "Rubik:wght@400;500;600;700"),
  ubuntu: sansPreset("ubuntu", "Ubuntu", "Ubuntu", "Ubuntu:wght@400;500;700"),
  fira_sans: sansPreset("fira_sans", "Fira Sans", "Fira Sans", "Fira+Sans:wght@400;500;600;700"),
  noto_sans: sansPreset("noto_sans", "Noto Sans", "Noto Sans", "Noto+Sans:wght@400;500;600;700"),
  karla: sansPreset("karla", "Karla", "Karla", "Karla:wght@400;500;600;700"),
  mulish: sansPreset("mulish", "Mulish", "Mulish", "Mulish:wght@400;500;600;700"),
  cabin: sansPreset("cabin", "Cabin", "Cabin", "Cabin:wght@400;500;600;700"),
  barlow: sansPreset("barlow", "Barlow", "Barlow", "Barlow:wght@400;500;600;700"),
  lexend: sansPreset("lexend", "Lexend", "Lexend", "Lexend:wght@400;500;600;700"),
  sora: sansPreset("sora", "Sora", "Sora", "Sora:wght@400;500;600;700"),
  public_sans: sansPreset("public_sans", "Public Sans", "Public Sans", "Public+Sans:wght@400;500;600;700"),
  atkinson: sansPreset("atkinson", "Atkinson Hyperlegible", "Atkinson Hyperlegible", "Atkinson+Hyperlegible:wght@400;700"),
  geist: sansPreset("geist", "Geist", "Geist", "Geist:wght@400;500;600;700"),
  albert_sans: sansPreset("albert_sans", "Albert Sans", "Albert Sans", "Albert+Sans:wght@400;500;600;700"),
  red_hat: sansPreset("red_hat", "Red Hat Text", "Red Hat Text", "Red+Hat+Text:wght@400;500;600;700"),
  system: {
    id: "system",
    label: "Système",
    stack: `system-ui, -apple-system, ${SANS_FALLBACK}`,
    google: null
  }
};

export const REPORT_FONT_SERIF_PRESETS = {
  source_serif: serifPreset("source_serif", "Source Serif 4", "Source Serif 4", "Source+Serif+4:opsz,wght@8..60,600;8..60,700"),
  libre_baskerville: serifPreset("libre_baskerville", "Libre Baskerville", "Libre Baskerville", "Libre+Baskerville:wght@400;700"),
  merriweather: serifPreset("merriweather", "Merriweather", "Merriweather", "Merriweather:wght@400;700"),
  playfair: serifPreset("playfair", "Playfair Display", "Playfair Display", "Playfair+Display:wght@400;600;700"),
  lora: serifPreset("lora", "Lora", "Lora", "Lora:wght@400;600;700"),
  pt_serif: serifPreset("pt_serif", "PT Serif", "PT Serif", "PT+Serif:wght@400;700"),
  cormorant: serifPreset("cormorant", "Cormorant Garamond", "Cormorant Garamond", "Cormorant+Garamond:wght@400;600;700"),
  eb_garamond: serifPreset("eb_garamond", "EB Garamond", "EB Garamond", "EB+Garamond:wght@400;600;700"),
  crimson_text: serifPreset("crimson_text", "Crimson Text", "Crimson Text", "Crimson+Text:wght@400;600;700"),
  literata: serifPreset("literata", "Literata", "Literata", "Literata:opsz,wght@7..72,400;7..72,600;7..72,700"),
  spectral: serifPreset("spectral", "Spectral", "Spectral", "Spectral:wght@400;600;700"),
  bitter: serifPreset("bitter", "Bitter", "Bitter", "Bitter:wght@400;600;700"),
  domine: serifPreset("domine", "Domine", "Domine", "Domine:wght@400;600;700"),
  newsreader: serifPreset("newsreader", "Newsreader", "Newsreader", "Newsreader:opsz,wght@6..72,400;6..72,600;6..72,700"),
  fraunces: serifPreset("fraunces", "Fraunces", "Fraunces", "Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700"),
  instrument_serif: serifPreset("instrument_serif", "Instrument Serif", "Instrument Serif", "Instrument+Serif:wght@400"),
  noto_serif: serifPreset("noto_serif", "Noto Serif", "Noto Serif", "Noto+Serif:wght@400;600;700"),
  roboto_serif: serifPreset("roboto_serif", "Roboto Serif", "Roboto Serif", "Roboto+Serif:opsz,wght@8..144,400;8..144,600;8..144,700"),
  alegreya: serifPreset("alegreya", "Alegreya", "Alegreya", "Alegreya:wght@400;600;700"),
  cardo: serifPreset("cardo", "Cardo", "Cardo", "Cardo:wght@400;700"),
  vollkorn: serifPreset("vollkorn", "Vollkorn", "Vollkorn", "Vollkorn:wght@400;600;700"),
  ibm_plex_serif: serifPreset("ibm_plex_serif", "IBM Plex Serif", "IBM Plex Serif", "IBM+Plex+Serif:wght@400;600;700"),
  libre_caslon: serifPreset("libre_caslon", "Libre Caslon Text", "Libre Caslon Text", "Libre+Caslon+Text:wght@400;700"),
  crimson_pro: serifPreset("crimson_pro", "Crimson Pro", "Crimson Pro", "Crimson+Pro:wght@400;600;700"),
  georgia: {
    id: "georgia",
    label: "Georgia",
    stack: SERIF_FALLBACK,
    google: null
  },
  times: {
    id: "times",
    label: "Times New Roman",
    stack: '"Times New Roman", Times, serif',
    google: null
  }
};

/** Liste unique : corps et titres partagent les mêmes choix. */
export const REPORT_FONT_ALL_PRESETS = {
  ...REPORT_FONT_SANS_PRESETS,
  ...REPORT_FONT_SERIF_PRESETS
};

export function listReportFontPresets() {
  return Object.values(REPORT_FONT_ALL_PRESETS).map(({ id, label }) => ({ id, label }));
}

export const REPORT_BRANDING_UPLOAD_PREFIX = "/uploads/report-branding/";

export const REPORT_BRANDING_KEYS = {
  companyName: "report_company_name",
  brandLabel: "report_brand_label",
  logoPath: "report_logo_path",
  footerLogoPath: "report_footer_logo_path",
  supportEmail: "report_support_email",
  supportPhone: "report_support_phone",
  website: "report_website",
  address: "report_address",
  footerNote: "report_footer_note",
  socialLinkedin: "report_social_linkedin",
  socialLinkedinAlt: "report_social_linkedin_alt",
  socialFacebook: "report_social_facebook",
  socialX: "report_social_x",
  socialYoutube: "report_social_youtube",
  socialDisplay: "report_social_display",
  showGeneratedAt: "report_show_generated_at",
  showHeaderLogo: "report_show_header_logo",
  showHeaderBrand: "report_show_header_brand",
  showHeaderCompany: "report_show_header_company",
  showHeaderClient: "report_show_header_client",
  showHeaderPeriod: "report_show_header_period",
  showHeaderPill: "report_show_header_pill",
  showHeaderGeneratedAt: "report_show_header_generated_at",
  showFooterLogo: "report_show_footer_logo",
  showFooterCompany: "report_show_footer_company",
  showFooterBrand: "report_show_footer_brand",
  showFooterEmail: "report_show_footer_email",
  showFooterPhone: "report_show_footer_phone",
  showFooterWebsite: "report_show_footer_website",
  showFooterAddress: "report_show_footer_address",
  showFooterSocials: "report_show_footer_socials",
  showFooterNote: "report_show_footer_note",
  fontSans: "report_font_sans",
  fontSerif: "report_font_serif",
  headerBg: "report_header_bg",
  headerBgEnd: "report_header_bg_end",
  headerText: "report_header_text",
  headerBrandColor: "report_header_brand_color",
  headerAccentBar: "report_header_accent_bar",
  headerAccentBarEnd: "report_header_accent_bar_end",
  footerBg: "report_footer_bg",
  footerText: "report_footer_text",
  footerMuted: "report_footer_muted",
  footerLink: "report_footer_link",
  accent: "report_accent",
  navy: "report_navy",
  brandSize: "report_brand_size",
  companySize: "report_company_size",
  clientSize: "report_client_size",
  footerBrandSize: "report_footer_brand_size",
  footerNoteSize: "report_footer_note_size"
};

export const REPORT_BRANDING_LABELS = {
  [REPORT_BRANDING_KEYS.companyName]: "Report company name",
  [REPORT_BRANDING_KEYS.brandLabel]: "Report brand label",
  [REPORT_BRANDING_KEYS.logoPath]: "Report header logo path",
  [REPORT_BRANDING_KEYS.footerLogoPath]: "Report footer logo path",
  [REPORT_BRANDING_KEYS.supportEmail]: "Report support email",
  [REPORT_BRANDING_KEYS.supportPhone]: "Report support phone",
  [REPORT_BRANDING_KEYS.website]: "Report website",
  [REPORT_BRANDING_KEYS.address]: "Report address",
  [REPORT_BRANDING_KEYS.footerNote]: "Report footer note",
  [REPORT_BRANDING_KEYS.socialLinkedin]: "Report LinkedIn URL",
  [REPORT_BRANDING_KEYS.socialLinkedinAlt]: "Report LinkedIn (alt) URL",
  [REPORT_BRANDING_KEYS.socialFacebook]: "Report Facebook URL",
  [REPORT_BRANDING_KEYS.socialX]: "Report X URL",
  [REPORT_BRANDING_KEYS.socialYoutube]: "Report YouTube URL",
  [REPORT_BRANDING_KEYS.socialDisplay]: "Report social links display mode",
  [REPORT_BRANDING_KEYS.showGeneratedAt]: "Show generation date in report footer",
  [REPORT_BRANDING_KEYS.showHeaderLogo]: "Show header logo on reports",
  [REPORT_BRANDING_KEYS.showHeaderBrand]: "Show header brand label on reports",
  [REPORT_BRANDING_KEYS.showHeaderCompany]: "Show header company name on reports",
  [REPORT_BRANDING_KEYS.showHeaderClient]: "Show header client title on reports",
  [REPORT_BRANDING_KEYS.showHeaderPeriod]: "Show header period on reports",
  [REPORT_BRANDING_KEYS.showHeaderPill]: "Show header report pill on reports",
  [REPORT_BRANDING_KEYS.showHeaderGeneratedAt]: "Show generation date in report header",
  [REPORT_BRANDING_KEYS.showFooterLogo]: "Show footer logo on reports",
  [REPORT_BRANDING_KEYS.showFooterCompany]: "Show footer company name on reports",
  [REPORT_BRANDING_KEYS.showFooterBrand]: "Show footer brand label on reports",
  [REPORT_BRANDING_KEYS.showFooterEmail]: "Show footer email on reports",
  [REPORT_BRANDING_KEYS.showFooterPhone]: "Show footer phone on reports",
  [REPORT_BRANDING_KEYS.showFooterWebsite]: "Show footer website on reports",
  [REPORT_BRANDING_KEYS.showFooterAddress]: "Show footer address on reports",
  [REPORT_BRANDING_KEYS.showFooterSocials]: "Show footer social links on reports",
  [REPORT_BRANDING_KEYS.showFooterNote]: "Show footer note on reports",
  [REPORT_BRANDING_KEYS.fontSans]: "Report sans font",
  [REPORT_BRANDING_KEYS.fontSerif]: "Report serif font",
  [REPORT_BRANDING_KEYS.headerBg]: "Report header background start",
  [REPORT_BRANDING_KEYS.headerBgEnd]: "Report header background end",
  [REPORT_BRANDING_KEYS.headerText]: "Report header text color",
  [REPORT_BRANDING_KEYS.headerBrandColor]: "Report header brand color",
  [REPORT_BRANDING_KEYS.headerAccentBar]: "Report header accent bar start",
  [REPORT_BRANDING_KEYS.headerAccentBarEnd]: "Report header accent bar end",
  [REPORT_BRANDING_KEYS.footerBg]: "Report footer background",
  [REPORT_BRANDING_KEYS.footerText]: "Report footer text color",
  [REPORT_BRANDING_KEYS.footerMuted]: "Report footer muted color",
  [REPORT_BRANDING_KEYS.footerLink]: "Report footer link color",
  [REPORT_BRANDING_KEYS.accent]: "Report accent color",
  [REPORT_BRANDING_KEYS.navy]: "Report navy / titles color",
  [REPORT_BRANDING_KEYS.brandSize]: "Report brand font size (rem)",
  [REPORT_BRANDING_KEYS.companySize]: "Report company font size (rem)",
  [REPORT_BRANDING_KEYS.clientSize]: "Report client title size (rem)",
  [REPORT_BRANDING_KEYS.footerBrandSize]: "Report footer brand size (rem)",
  [REPORT_BRANDING_KEYS.footerNoteSize]: "Report footer note size (rem)"
};

export const DEFAULT_REPORT_BRANDING = {
  [REPORT_BRANDING_KEYS.companyName]: "",
  [REPORT_BRANDING_KEYS.brandLabel]: "",
  [REPORT_BRANDING_KEYS.logoPath]: "",
  [REPORT_BRANDING_KEYS.footerLogoPath]: "",
  [REPORT_BRANDING_KEYS.supportEmail]: "",
  [REPORT_BRANDING_KEYS.supportPhone]: "",
  [REPORT_BRANDING_KEYS.website]: "",
  [REPORT_BRANDING_KEYS.address]: "",
  [REPORT_BRANDING_KEYS.footerNote]: "",
  [REPORT_BRANDING_KEYS.socialLinkedin]: "",
  [REPORT_BRANDING_KEYS.socialLinkedinAlt]: "",
  [REPORT_BRANDING_KEYS.socialFacebook]: "",
  [REPORT_BRANDING_KEYS.socialX]: "",
  [REPORT_BRANDING_KEYS.socialYoutube]: "",
  [REPORT_BRANDING_KEYS.socialDisplay]: "icons",
  [REPORT_BRANDING_KEYS.showGeneratedAt]: "true",
  [REPORT_BRANDING_KEYS.showHeaderLogo]: "true",
  [REPORT_BRANDING_KEYS.showHeaderBrand]: "true",
  [REPORT_BRANDING_KEYS.showHeaderCompany]: "true",
  [REPORT_BRANDING_KEYS.showHeaderClient]: "true",
  [REPORT_BRANDING_KEYS.showHeaderPeriod]: "true",
  [REPORT_BRANDING_KEYS.showHeaderPill]: "true",
  [REPORT_BRANDING_KEYS.showHeaderGeneratedAt]: "true",
  [REPORT_BRANDING_KEYS.showFooterLogo]: "true",
  [REPORT_BRANDING_KEYS.showFooterCompany]: "true",
  [REPORT_BRANDING_KEYS.showFooterBrand]: "true",
  [REPORT_BRANDING_KEYS.showFooterEmail]: "true",
  [REPORT_BRANDING_KEYS.showFooterPhone]: "true",
  [REPORT_BRANDING_KEYS.showFooterWebsite]: "true",
  [REPORT_BRANDING_KEYS.showFooterAddress]: "true",
  [REPORT_BRANDING_KEYS.showFooterSocials]: "true",
  [REPORT_BRANDING_KEYS.showFooterNote]: "true",
  [REPORT_BRANDING_KEYS.fontSans]: "source_sans",
  [REPORT_BRANDING_KEYS.fontSerif]: "source_serif",
  [REPORT_BRANDING_KEYS.headerBg]: "#0b3d4a",
  [REPORT_BRANDING_KEYS.headerBgEnd]: "#0f766e",
  [REPORT_BRANDING_KEYS.headerText]: "#f8fafc",
  [REPORT_BRANDING_KEYS.headerBrandColor]: "#99f6e4",
  [REPORT_BRANDING_KEYS.headerAccentBar]: "#99f6e4",
  [REPORT_BRANDING_KEYS.headerAccentBarEnd]: "#fbbf24",
  [REPORT_BRANDING_KEYS.footerBg]: "#ffffff",
  [REPORT_BRANDING_KEYS.footerText]: "#1e3a5f",
  [REPORT_BRANDING_KEYS.footerMuted]: "#64748b",
  [REPORT_BRANDING_KEYS.footerLink]: "#115e59",
  [REPORT_BRANDING_KEYS.accent]: "#0f766e",
  [REPORT_BRANDING_KEYS.navy]: "#1e3a5f",
  [REPORT_BRANDING_KEYS.brandSize]: "0.72",
  [REPORT_BRANDING_KEYS.companySize]: "1.05",
  [REPORT_BRANDING_KEYS.clientSize]: "2.1",
  [REPORT_BRANDING_KEYS.footerBrandSize]: "0.95",
  [REPORT_BRANDING_KEYS.footerNoteSize]: "0.78"
};

function cleanText(value, max = 200) {
  return String(value ?? "").trim().slice(0, max);
}

function cleanUrl(value, max = 400) {
  const url = cleanText(value, max);
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;
  return "";
}

function cleanBool(value, fallback = true) {
  if (value === true || value === false) return value ? "true" : "false";
  const raw = String(value ?? "").trim().toLowerCase();
  if (raw === "true" || raw === "1" || raw === "yes") return "true";
  if (raw === "false" || raw === "0" || raw === "no") return "false";
  return fallback ? "true" : "false";
}

function cleanHex(value, fallback) {
  const raw = String(value ?? "").trim();
  if (/^#[0-9a-fA-F]{6}$/.test(raw)) return raw.toLowerCase();
  if (/^#[0-9a-fA-F]{3}$/.test(raw)) {
    const [, a, b, c] = raw;
    return `#${a}${a}${b}${b}${c}${c}`.toLowerCase();
  }
  return fallback;
}

function cleanFontPreset(value, presets, fallbackId) {
  const id = cleanText(value, 40).toLowerCase().replace(/\s+/g, "_");
  if (presets[id]) return id;
  return fallbackId;
}

const SOCIAL_DISPLAY_MODES = new Set(["icons", "links", "both"]);

function cleanSocialDisplay(value) {
  const mode = cleanText(value, 20).toLowerCase();
  if (SOCIAL_DISPLAY_MODES.has(mode)) return mode;
  return DEFAULT_REPORT_BRANDING[REPORT_BRANDING_KEYS.socialDisplay];
}

export function normalizeReportLogoPath(value) {
  const raw = String(value ?? "").trim().replace(/\\/g, "/");
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return "";
  const uploadsIndex = raw.toLowerCase().indexOf("/uploads/report-branding/");
  const relative = uploadsIndex >= 0 ? raw.slice(uploadsIndex) : raw.startsWith("/") ? raw : `/${raw}`;
  if (!relative.startsWith(REPORT_BRANDING_UPLOAD_PREFIX)) return "";
  if (relative.includes("..")) return "";
  return relative;
}

function cleanRem(value, fallback, { min = 0.5, max = 4 } = {}) {
  const raw = String(value ?? "").trim().replace(/,/g, ".");
  const num = Number.parseFloat(raw);
  if (!Number.isFinite(num)) return fallback;
  const clamped = Math.min(max, Math.max(min, num));
  return String(Math.round(clamped * 100) / 100);
}

function darkenHex(hex, ratio = 0.18) {
  const h = cleanHex(hex, "#0f766e").slice(1);
  const r = Math.round(parseInt(h.slice(0, 2), 16) * (1 - ratio));
  const g = Math.round(parseInt(h.slice(2, 4), 16) * (1 - ratio));
  const b = Math.round(parseInt(h.slice(4, 6), 16) * (1 - ratio));
  const to = n => n.toString(16).padStart(2, "0");
  return `#${to(r)}${to(g)}${to(b)}`;
}

function softHex(hex) {
  const h = cleanHex(hex, "#0f766e").slice(1);
  const r = Math.round(parseInt(h.slice(0, 2), 16) * 0.12 + 255 * 0.88);
  const g = Math.round(parseInt(h.slice(2, 4), 16) * 0.12 + 255 * 0.88);
  const b = Math.round(parseInt(h.slice(4, 6), 16) * 0.12 + 255 * 0.88);
  const to = n => Math.min(255, n).toString(16).padStart(2, "0");
  return `#${to(r)}${to(g)}${to(b)}`;
}

export function normalizeReportBranding(input = {}) {
  return {
    [REPORT_BRANDING_KEYS.companyName]: cleanText(input[REPORT_BRANDING_KEYS.companyName], 120),
    [REPORT_BRANDING_KEYS.brandLabel]: cleanText(input[REPORT_BRANDING_KEYS.brandLabel], 80),
    [REPORT_BRANDING_KEYS.logoPath]: normalizeReportLogoPath(input[REPORT_BRANDING_KEYS.logoPath]),
    [REPORT_BRANDING_KEYS.footerLogoPath]: normalizeReportLogoPath(
      input[REPORT_BRANDING_KEYS.footerLogoPath]
    ),
    [REPORT_BRANDING_KEYS.supportEmail]: cleanText(input[REPORT_BRANDING_KEYS.supportEmail], 200),
    [REPORT_BRANDING_KEYS.supportPhone]: cleanText(input[REPORT_BRANDING_KEYS.supportPhone], 40),
    [REPORT_BRANDING_KEYS.website]: cleanUrl(input[REPORT_BRANDING_KEYS.website], 200),
    [REPORT_BRANDING_KEYS.address]: cleanText(input[REPORT_BRANDING_KEYS.address], 300),
    [REPORT_BRANDING_KEYS.footerNote]: cleanText(input[REPORT_BRANDING_KEYS.footerNote], 200),
    [REPORT_BRANDING_KEYS.socialLinkedin]: cleanUrl(input[REPORT_BRANDING_KEYS.socialLinkedin]),
    [REPORT_BRANDING_KEYS.socialLinkedinAlt]: cleanUrl(input[REPORT_BRANDING_KEYS.socialLinkedinAlt]),
    [REPORT_BRANDING_KEYS.socialFacebook]: cleanUrl(input[REPORT_BRANDING_KEYS.socialFacebook]),
    [REPORT_BRANDING_KEYS.socialX]: cleanUrl(input[REPORT_BRANDING_KEYS.socialX]),
    [REPORT_BRANDING_KEYS.socialYoutube]: cleanUrl(input[REPORT_BRANDING_KEYS.socialYoutube]),
    [REPORT_BRANDING_KEYS.socialDisplay]: cleanSocialDisplay(input[REPORT_BRANDING_KEYS.socialDisplay]),
    [REPORT_BRANDING_KEYS.showGeneratedAt]: cleanBool(input[REPORT_BRANDING_KEYS.showGeneratedAt], true),
    [REPORT_BRANDING_KEYS.showHeaderLogo]: cleanBool(input[REPORT_BRANDING_KEYS.showHeaderLogo], true),
    [REPORT_BRANDING_KEYS.showHeaderBrand]: cleanBool(input[REPORT_BRANDING_KEYS.showHeaderBrand], true),
    [REPORT_BRANDING_KEYS.showHeaderCompany]: cleanBool(input[REPORT_BRANDING_KEYS.showHeaderCompany], true),
    [REPORT_BRANDING_KEYS.showHeaderClient]: cleanBool(input[REPORT_BRANDING_KEYS.showHeaderClient], true),
    [REPORT_BRANDING_KEYS.showHeaderPeriod]: cleanBool(input[REPORT_BRANDING_KEYS.showHeaderPeriod], true),
    [REPORT_BRANDING_KEYS.showHeaderPill]: cleanBool(input[REPORT_BRANDING_KEYS.showHeaderPill], true),
    [REPORT_BRANDING_KEYS.showHeaderGeneratedAt]: cleanBool(
      input[REPORT_BRANDING_KEYS.showHeaderGeneratedAt] !== undefined &&
        String(input[REPORT_BRANDING_KEYS.showHeaderGeneratedAt]).trim() !== ""
        ? input[REPORT_BRANDING_KEYS.showHeaderGeneratedAt]
        : input[REPORT_BRANDING_KEYS.showGeneratedAt],
      true
    ),
    [REPORT_BRANDING_KEYS.showFooterLogo]: cleanBool(input[REPORT_BRANDING_KEYS.showFooterLogo], true),
    [REPORT_BRANDING_KEYS.showFooterCompany]: cleanBool(input[REPORT_BRANDING_KEYS.showFooterCompany], true),
    [REPORT_BRANDING_KEYS.showFooterBrand]: cleanBool(input[REPORT_BRANDING_KEYS.showFooterBrand], true),
    [REPORT_BRANDING_KEYS.showFooterEmail]: cleanBool(input[REPORT_BRANDING_KEYS.showFooterEmail], true),
    [REPORT_BRANDING_KEYS.showFooterPhone]: cleanBool(input[REPORT_BRANDING_KEYS.showFooterPhone], true),
    [REPORT_BRANDING_KEYS.showFooterWebsite]: cleanBool(input[REPORT_BRANDING_KEYS.showFooterWebsite], true),
    [REPORT_BRANDING_KEYS.showFooterAddress]: cleanBool(input[REPORT_BRANDING_KEYS.showFooterAddress], true),
    [REPORT_BRANDING_KEYS.showFooterSocials]: cleanBool(input[REPORT_BRANDING_KEYS.showFooterSocials], true),
    [REPORT_BRANDING_KEYS.showFooterNote]: cleanBool(input[REPORT_BRANDING_KEYS.showFooterNote], true),
    [REPORT_BRANDING_KEYS.fontSans]: cleanFontPreset(
      input[REPORT_BRANDING_KEYS.fontSans],
      REPORT_FONT_ALL_PRESETS,
      DEFAULT_REPORT_BRANDING[REPORT_BRANDING_KEYS.fontSans]
    ),
    [REPORT_BRANDING_KEYS.fontSerif]: cleanFontPreset(
      input[REPORT_BRANDING_KEYS.fontSerif],
      REPORT_FONT_ALL_PRESETS,
      DEFAULT_REPORT_BRANDING[REPORT_BRANDING_KEYS.fontSerif]
    ),
    [REPORT_BRANDING_KEYS.headerBg]: cleanHex(
      input[REPORT_BRANDING_KEYS.headerBg],
      DEFAULT_REPORT_BRANDING[REPORT_BRANDING_KEYS.headerBg]
    ),
    [REPORT_BRANDING_KEYS.headerBgEnd]: cleanHex(
      input[REPORT_BRANDING_KEYS.headerBgEnd],
      DEFAULT_REPORT_BRANDING[REPORT_BRANDING_KEYS.headerBgEnd]
    ),
    [REPORT_BRANDING_KEYS.headerText]: cleanHex(
      input[REPORT_BRANDING_KEYS.headerText],
      DEFAULT_REPORT_BRANDING[REPORT_BRANDING_KEYS.headerText]
    ),
    [REPORT_BRANDING_KEYS.headerBrandColor]: cleanHex(
      input[REPORT_BRANDING_KEYS.headerBrandColor],
      DEFAULT_REPORT_BRANDING[REPORT_BRANDING_KEYS.headerBrandColor]
    ),
    [REPORT_BRANDING_KEYS.headerAccentBar]: cleanHex(
      input[REPORT_BRANDING_KEYS.headerAccentBar],
      DEFAULT_REPORT_BRANDING[REPORT_BRANDING_KEYS.headerAccentBar]
    ),
    [REPORT_BRANDING_KEYS.headerAccentBarEnd]: cleanHex(
      input[REPORT_BRANDING_KEYS.headerAccentBarEnd],
      DEFAULT_REPORT_BRANDING[REPORT_BRANDING_KEYS.headerAccentBarEnd]
    ),
    [REPORT_BRANDING_KEYS.footerBg]: cleanHex(
      input[REPORT_BRANDING_KEYS.footerBg],
      DEFAULT_REPORT_BRANDING[REPORT_BRANDING_KEYS.footerBg]
    ),
    [REPORT_BRANDING_KEYS.footerText]: cleanHex(
      input[REPORT_BRANDING_KEYS.footerText],
      DEFAULT_REPORT_BRANDING[REPORT_BRANDING_KEYS.footerText]
    ),
    [REPORT_BRANDING_KEYS.footerMuted]: cleanHex(
      input[REPORT_BRANDING_KEYS.footerMuted],
      DEFAULT_REPORT_BRANDING[REPORT_BRANDING_KEYS.footerMuted]
    ),
    [REPORT_BRANDING_KEYS.footerLink]: cleanHex(
      input[REPORT_BRANDING_KEYS.footerLink],
      DEFAULT_REPORT_BRANDING[REPORT_BRANDING_KEYS.footerLink]
    ),
    [REPORT_BRANDING_KEYS.accent]: cleanHex(
      input[REPORT_BRANDING_KEYS.accent],
      DEFAULT_REPORT_BRANDING[REPORT_BRANDING_KEYS.accent]
    ),
    [REPORT_BRANDING_KEYS.navy]: cleanHex(
      input[REPORT_BRANDING_KEYS.navy],
      DEFAULT_REPORT_BRANDING[REPORT_BRANDING_KEYS.navy]
    ),
    [REPORT_BRANDING_KEYS.brandSize]: cleanRem(
      input[REPORT_BRANDING_KEYS.brandSize],
      DEFAULT_REPORT_BRANDING[REPORT_BRANDING_KEYS.brandSize],
      { min: 0.5, max: 1.4 }
    ),
    [REPORT_BRANDING_KEYS.companySize]: cleanRem(
      input[REPORT_BRANDING_KEYS.companySize],
      DEFAULT_REPORT_BRANDING[REPORT_BRANDING_KEYS.companySize],
      { min: 0.75, max: 2 }
    ),
    [REPORT_BRANDING_KEYS.clientSize]: cleanRem(
      input[REPORT_BRANDING_KEYS.clientSize],
      DEFAULT_REPORT_BRANDING[REPORT_BRANDING_KEYS.clientSize],
      { min: 1.2, max: 3.5 }
    ),
    [REPORT_BRANDING_KEYS.footerBrandSize]: cleanRem(
      input[REPORT_BRANDING_KEYS.footerBrandSize],
      DEFAULT_REPORT_BRANDING[REPORT_BRANDING_KEYS.footerBrandSize],
      { min: 0.6, max: 1.8 }
    ),
    [REPORT_BRANDING_KEYS.footerNoteSize]: cleanRem(
      input[REPORT_BRANDING_KEYS.footerNoteSize],
      DEFAULT_REPORT_BRANDING[REPORT_BRANDING_KEYS.footerNoteSize],
      { min: 0.55, max: 1.2 }
    )
  };
}

export function resolveReportStyle(normalized = {}) {
  const fontSans =
    REPORT_FONT_ALL_PRESETS[normalized[REPORT_BRANDING_KEYS.fontSans]] ||
    REPORT_FONT_ALL_PRESETS.source_sans;
  const fontSerif =
    REPORT_FONT_ALL_PRESETS[normalized[REPORT_BRANDING_KEYS.fontSerif]] ||
    REPORT_FONT_ALL_PRESETS.source_serif;
  const accent = normalized[REPORT_BRANDING_KEYS.accent] || DEFAULT_REPORT_BRANDING[REPORT_BRANDING_KEYS.accent];
  const navy = normalized[REPORT_BRANDING_KEYS.navy] || DEFAULT_REPORT_BRANDING[REPORT_BRANDING_KEYS.navy];
  const googleFamilies = [fontSans.google, fontSerif.google].filter(Boolean);
  return {
    fontSansId: fontSans.id,
    fontSerifId: fontSerif.id,
    fontSans: fontSans.stack,
    fontSerif: fontSerif.stack,
    googleFontsHref: googleFamilies.length
      ? `https://fonts.googleapis.com/css2?${googleFamilies.map(f => `family=${f}`).join("&")}&display=swap`
      : "",
    headerBg: normalized[REPORT_BRANDING_KEYS.headerBg],
    headerBgEnd: normalized[REPORT_BRANDING_KEYS.headerBgEnd],
    headerText: normalized[REPORT_BRANDING_KEYS.headerText],
    headerBrandColor: normalized[REPORT_BRANDING_KEYS.headerBrandColor],
    headerAccentBar: normalized[REPORT_BRANDING_KEYS.headerAccentBar],
    headerAccentBarEnd: normalized[REPORT_BRANDING_KEYS.headerAccentBarEnd],
    footerBg: normalized[REPORT_BRANDING_KEYS.footerBg],
    footerText: normalized[REPORT_BRANDING_KEYS.footerText],
    footerMuted: normalized[REPORT_BRANDING_KEYS.footerMuted],
    footerLink: normalized[REPORT_BRANDING_KEYS.footerLink],
    accent,
    accentDark: darkenHex(accent, 0.18),
    accentSoft: softHex(accent),
    navy,
    brandSize: `${normalized[REPORT_BRANDING_KEYS.brandSize]}rem`,
    companySize: `${normalized[REPORT_BRANDING_KEYS.companySize]}rem`,
    clientSize: `${normalized[REPORT_BRANDING_KEYS.clientSize]}rem`,
    footerBrandSize: `${normalized[REPORT_BRANDING_KEYS.footerBrandSize]}rem`,
    footerNoteSize: `${normalized[REPORT_BRANDING_KEYS.footerNoteSize]}rem`
  };
}

export function toPublicReportBranding(raw = {}, general = {}) {
  const normalized = normalizeReportBranding(raw);
  const companyName =
    normalized[REPORT_BRANDING_KEYS.companyName] ||
    String(general[GENERAL_SETTING_KEYS.organizationName] || "").trim() ||
    "Veritas";
  const supportEmail =
    normalized[REPORT_BRANDING_KEYS.supportEmail] ||
    String(general[GENERAL_SETTING_KEYS.supportEmail] || "").trim();
  const supportPhone =
    normalized[REPORT_BRANDING_KEYS.supportPhone] ||
    String(general[GENERAL_SETTING_KEYS.supportPhone] || "").trim();
  const website =
    normalized[REPORT_BRANDING_KEYS.website] ||
    String(general[GENERAL_SETTING_KEYS.organizationWebsite] || "").trim();
  const address =
    normalized[REPORT_BRANDING_KEYS.address] ||
    String(general[GENERAL_SETTING_KEYS.organizationAddress] || "").trim();

  const socials = [
    { id: "linkedin", icon: "simple-icons:linkedin", url: normalized[REPORT_BRANDING_KEYS.socialLinkedin], title: "LinkedIn" },
    { id: "facebook", icon: "simple-icons:facebook", url: normalized[REPORT_BRANDING_KEYS.socialFacebook], title: "Facebook" },
    { id: "x", icon: "simple-icons:x", url: normalized[REPORT_BRANDING_KEYS.socialX], title: "X" },
    { id: "youtube", icon: "simple-icons:youtube", url: normalized[REPORT_BRANDING_KEYS.socialYoutube], title: "YouTube" }
  ].filter(item => item.url);

  return {
    companyName,
    brandLabel: normalized[REPORT_BRANDING_KEYS.brandLabel],
    logoPath: normalized[REPORT_BRANDING_KEYS.logoPath] || "",
    footerLogoPath: normalized[REPORT_BRANDING_KEYS.footerLogoPath] || "",
    supportEmail,
    supportPhone,
    website,
    address,
    footerNote: normalized[REPORT_BRANDING_KEYS.footerNote],
    showGeneratedAt: normalized[REPORT_BRANDING_KEYS.showGeneratedAt] === "true",
    showHeaderLogo: normalized[REPORT_BRANDING_KEYS.showHeaderLogo] !== "false",
    showHeaderBrand: normalized[REPORT_BRANDING_KEYS.showHeaderBrand] !== "false",
    showHeaderCompany: normalized[REPORT_BRANDING_KEYS.showHeaderCompany] !== "false",
    showHeaderClient: normalized[REPORT_BRANDING_KEYS.showHeaderClient] !== "false",
    showHeaderPeriod: normalized[REPORT_BRANDING_KEYS.showHeaderPeriod] !== "false",
    showHeaderPill: normalized[REPORT_BRANDING_KEYS.showHeaderPill] !== "false",
    showHeaderGeneratedAt: normalized[REPORT_BRANDING_KEYS.showHeaderGeneratedAt] !== "false",
    showFooterLogo: normalized[REPORT_BRANDING_KEYS.showFooterLogo] !== "false",
    showFooterCompany: normalized[REPORT_BRANDING_KEYS.showFooterCompany] !== "false",
    showFooterBrand: normalized[REPORT_BRANDING_KEYS.showFooterBrand] !== "false",
    showFooterEmail: normalized[REPORT_BRANDING_KEYS.showFooterEmail] !== "false",
    showFooterPhone: normalized[REPORT_BRANDING_KEYS.showFooterPhone] !== "false",
    showFooterWebsite: normalized[REPORT_BRANDING_KEYS.showFooterWebsite] !== "false",
    showFooterAddress: normalized[REPORT_BRANDING_KEYS.showFooterAddress] !== "false",
    showFooterSocials: normalized[REPORT_BRANDING_KEYS.showFooterSocials] !== "false",
    showFooterNote: normalized[REPORT_BRANDING_KEYS.showFooterNote] !== "false",
    socialDisplay: cleanSocialDisplay(normalized[REPORT_BRANDING_KEYS.socialDisplay]),
    socials,
    style: resolveReportStyle(normalized),
    raw: normalized
  };
}

export async function loadReportBranding() {
  const keys = [
    ...Object.values(REPORT_BRANDING_KEYS),
    GENERAL_SETTING_KEYS.organizationName,
    GENERAL_SETTING_KEYS.supportEmail,
    GENERAL_SETTING_KEYS.supportPhone,
    GENERAL_SETTING_KEYS.organizationWebsite,
    GENERAL_SETTING_KEYS.organizationAddress
  ];
  const map = await getSettingsMap(keys);
  const raw = {};
  for (const key of Object.values(REPORT_BRANDING_KEYS)) {
    raw[key] = map[key] ?? DEFAULT_REPORT_BRANDING[key] ?? "";
  }
  return toPublicReportBranding(raw, map);
}
