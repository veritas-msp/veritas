import { applyThemeToRoot, normalizeSkin } from "../styles/themeVariables";
export const THEME_STORAGE_KEY = "theme";
export const THEME_SKIN_KEY = "theme_skin";
export const THEME_USER_CHOICE_KEY = "theme_user_choice";
export const APP_UI_THEME_KEY = "app_ui_theme";
export function resolveEffectiveTheme(themeSetting = "light") {
  if (themeSetting === "system") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  return themeSetting === "dark" ? "dark" : "light";
}
export function readStoredSkin() {
  try {
    const raw = localStorage.getItem(THEME_SKIN_KEY);
    const skin = normalizeSkin(raw);
    if (raw === "steam" || raw === "military") localStorage.setItem(THEME_SKIN_KEY, "olive");
    return skin;
  } catch {
    return "classic";
  }
}
export function normalizeAppearance(value) {
  if (value == null || value === "") return null;
  if (typeof value === "string") {
    if (value === "dark" || value === "light") return { skin: readStoredSkin(), mode: value };
    const [skinPart, modePart] = value.split(/[-:]/);
    const skin = normalizeSkin(skinPart);
    const mode = modePart === "dark" || modePart === "light" ? modePart : null;
    if (skinPart && !["classic", "olive", "miami", "xp", "steam", "military"].includes(skinPart)) return null;
    if (!skin || !mode) return null;
    return { skin, mode };
  }
  if (typeof value === "object") {
    const skin = normalizeSkin(value.skin);
    const mode = value.mode === "dark" || value.mode === "light" ? value.mode : null;
    if (value.skin && !["classic", "olive", "miami", "xp", "steam", "military"].includes(value.skin)) return null;
    if (!skin || !mode) return null;
    return { skin, mode };
  }
  return null;
}
export function hasUserThemeChoice() {
  try {
    return localStorage.getItem(THEME_USER_CHOICE_KEY) === "1";
  } catch {
    return false;
  }
}
export function markUserThemeChoice() {
  try {
    localStorage.setItem(THEME_USER_CHOICE_KEY, "1");
  } catch {}
}
export function applyThemePreference(theme, skin) {
  const effective = theme === "dark" ? "dark" : "light";
  const resolvedSkin = skin == null || skin === "" ? readStoredSkin() : normalizeSkin(skin);
  try {
    localStorage.setItem(THEME_STORAGE_KEY, effective);
    localStorage.setItem(THEME_SKIN_KEY, resolvedSkin);
  } catch {}
  applyThemeToRoot(effective, resolvedSkin);
  window.dispatchEvent(new CustomEvent("appThemeApplied", {
    detail: {
      theme: effective,
      skin: resolvedSkin
    }
  }));
  return effective;
}
export function applyAdminDefaultThemeIfAllowed(adminThemeSetting = "light") {
  if (hasUserThemeChoice()) return null;
  return applyThemePreference(resolveEffectiveTheme(adminThemeSetting));
}
export function readStoredTheme() {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === "dark" || stored === "light") return stored;
  } catch {}
  return null;
}
