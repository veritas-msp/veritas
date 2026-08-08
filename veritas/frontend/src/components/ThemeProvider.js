import { createContext, useState, useEffect, useMemo, useCallback } from "react";
import { applyThemeToRoot } from "../styles/themeVariables";
import { applyAdminDefaultThemeIfAllowed, markUserThemeChoice, readStoredTheme, resolveEffectiveTheme, THEME_STORAGE_KEY } from "../utils/themePreferences";
export const ThemeContext = createContext();
export function ThemeProvider({
  children
}) {
  const [theme, setThemeState] = useState(() => readStoredTheme() || "light");
  const [adminThemeSetting, setAdminThemeSetting] = useState("light");
  const applyTheme = useCallback(nextTheme => {
    const effective = nextTheme === "dark" ? "dark" : "light";
    setThemeState(effective);
    applyThemeToRoot(effective);
  }, []);
  useEffect(() => {
    const authPaths = ["/login", "/reset-password"];
    const isAuthRoute = authPaths.includes(window.location.pathname);
    const effectiveTheme = isAuthRoute ? "light" : theme;
    applyThemeToRoot(effectiveTheme);
    if (!isAuthRoute) {
      try {
        localStorage.setItem(THEME_STORAGE_KEY, theme);
      } catch {}
    }
  }, [theme]);
  useEffect(() => {
    const onSettingsUpdated = event => {
      applyAdminDefaultThemeIfAllowed(event.detail?.app_default_theme || "light");
    };
    const onAdminThemeSetting = event => {
      setAdminThemeSetting(event.detail || "light");
    };
    const onThemeApplied = event => {
      const nextTheme = event.detail?.theme;
      if (nextTheme === "dark" || nextTheme === "light") {
        setThemeState(nextTheme);
      }
    };
    window.addEventListener("appGeneralSettingsUpdated", onSettingsUpdated);
    window.addEventListener("appAdminThemeSetting", onAdminThemeSetting);
    window.addEventListener("appThemeApplied", onThemeApplied);
    return () => {
      window.removeEventListener("appGeneralSettingsUpdated", onSettingsUpdated);
      window.removeEventListener("appAdminThemeSetting", onAdminThemeSetting);
      window.removeEventListener("appThemeApplied", onThemeApplied);
    };
  }, []);
  useEffect(() => {
    if (adminThemeSetting !== "system") return undefined;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      applyAdminDefaultThemeIfAllowed("system");
    };
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [adminThemeSetting]);
  const setThemeWithUserChoice = useCallback(nextTheme => {
    markUserThemeChoice();
    applyTheme(nextTheme);
  }, [applyTheme]);
  const toggleTheme = useCallback(() => {
    setThemeWithUserChoice(theme === "light" ? "dark" : "light");
  }, [theme, setThemeWithUserChoice]);
  const value = useMemo(() => ({
    theme,
    toggleTheme,
    setTheme: setThemeWithUserChoice
  }), [theme, toggleTheme, setThemeWithUserChoice]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
export function resolveThemeFromAdminSetting(adminThemeSetting) {
  return resolveEffectiveTheme(adminThemeSetting);
}
