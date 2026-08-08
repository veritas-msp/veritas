import { applyThemeToRoot } from "../styles/themeVariables";
export const THEME_STORAGE_KEY = "theme";
export const THEME_USER_CHOICE_KEY = "theme_user_choice";
export function resolveEffectiveTheme(themeSetting = "light") {
  if (themeSetting === "system") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  return themeSetting === "dark" ? "dark" : "light";
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
export function applyThemePreference(theme) {
  const effective = theme === "dark" ? "dark" : "light";
  try {
    localStorage.setItem(THEME_STORAGE_KEY, effective);
  } catch {}
  applyThemeToRoot(effective);
  window.dispatchEvent(new CustomEvent("appThemeApplied", {
    detail: {
      theme: effective
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
