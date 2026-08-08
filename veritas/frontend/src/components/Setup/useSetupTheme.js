import { useCallback, useState } from "react";
import { useTheme } from "../../hooks/useTheme";
const STORAGE_KEY = "veritas-setup-theme";
function readStoredSetupTheme() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "dark" || saved === "light") return saved;
  } catch {}
  return null;
}
export function useSetupTheme() {
  const {
    theme: appTheme,
    setTheme
  } = useTheme();
  const [theme, setThemeState] = useState(() => {
    const saved = readStoredSetupTheme();
    if (saved) return saved;
    return appTheme === "dark" ? "dark" : "light";
  });
  const setSetupTheme = useCallback(nextTheme => {
    const normalized = nextTheme === "dark" ? "dark" : "light";
    setThemeState(normalized);
    try {
      localStorage.setItem(STORAGE_KEY, normalized);
    } catch {}
    if (appTheme === "dark" !== (normalized === "dark")) {
      setTheme(normalized);
    }
  }, [appTheme, setTheme]);
  return {
    theme,
    setTheme: setSetupTheme
  };
}
