import { createContext, useState, useEffect, useMemo, useCallback } from "react";
import { applyThemeToRoot, normalizeSkin } from "../styles/themeVariables";
import { getUserSetting, saveUserSetting } from "../api/userSettings";
import {
  APP_UI_THEME_KEY,
  applyAdminDefaultThemeIfAllowed,
  markUserThemeChoice,
  normalizeAppearance,
  readStoredSkin,
  readStoredTheme,
  resolveEffectiveTheme,
  THEME_SKIN_KEY,
  THEME_STORAGE_KEY
} from "../utils/themePreferences";

export const ThemeContext = createContext();

export function ThemeProvider({
  children
}) {
  const [theme, setThemeState] = useState(() => readStoredTheme() || "light");
  const [skin, setSkinState] = useState(() => readStoredSkin());
  const [adminThemeSetting, setAdminThemeSetting] = useState("light");

  useEffect(() => {
    const authPaths = ["/login", "/reset-password"];
    const isAuthRoute = authPaths.includes(window.location.pathname);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
      localStorage.setItem(THEME_SKIN_KEY, skin);
    } catch {}
    applyThemeToRoot(isAuthRoute ? "light" : theme, isAuthRoute ? "classic" : skin);
  }, [theme, skin]);

  useEffect(() => {
    let cancelled = false;
    getUserSetting(APP_UI_THEME_KEY).then(payload => {
      if (cancelled) return;
      const parsed = normalizeAppearance(payload?.value ?? payload?.setting_value ?? null);
      if (!parsed) return;
      markUserThemeChoice();
      setSkinState(parsed.skin);
      setThemeState(parsed.mode);
    }).catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const onSettingsUpdated = event => {
      applyAdminDefaultThemeIfAllowed(event.detail?.app_default_theme || "light");
    };
    const onAdminThemeSetting = event => {
      setAdminThemeSetting(event.detail || "light");
    };
    const onThemeApplied = event => {
      const nextTheme = event.detail?.theme;
      const nextSkin = event.detail?.skin;
      if (nextTheme === "dark" || nextTheme === "light") {
        setThemeState(nextTheme);
      }
      if (["classic", "olive", "miami", "xp", "steam", "military"].includes(nextSkin)) {
        setSkinState(normalizeSkin(nextSkin));
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

  const persistAppearance = useCallback((mode, nextSkin) => {
    saveUserSetting(APP_UI_THEME_KEY, {
      skin: nextSkin,
      mode
    }).catch(() => {});
  }, []);

  const setThemeWithUserChoice = useCallback(nextTheme => {
    const mode = nextTheme === "dark" ? "dark" : "light";
    markUserThemeChoice();
    setThemeState(mode);
    persistAppearance(mode, skin);
  }, [persistAppearance, skin]);

  const toggleTheme = useCallback(() => {
    setThemeWithUserChoice(theme === "light" ? "dark" : "light");
  }, [theme, setThemeWithUserChoice]);

  const setAppearance = useCallback(async (nextSkin, nextMode) => {
    const mode = nextMode === "dark" ? "dark" : "light";
    const resolvedSkin = normalizeSkin(nextSkin);
    const previousSkin = skin;
    const previousMode = theme;
    markUserThemeChoice();
    setSkinState(resolvedSkin);
    setThemeState(mode);
    try {
      await saveUserSetting(APP_UI_THEME_KEY, {
        skin: resolvedSkin,
        mode
      });
    } catch (error) {
      setSkinState(previousSkin);
      setThemeState(previousMode);
      throw error;
    }
  }, [skin, theme]);

  const value = useMemo(() => ({
    theme,
    skin,
    toggleTheme,
    setTheme: setThemeWithUserChoice,
    setAppearance
  }), [theme, skin, toggleTheme, setThemeWithUserChoice, setAppearance]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function resolveThemeFromAdminSetting(adminThemeSetting) {
  return resolveEffectiveTheme(adminThemeSetting);
}
