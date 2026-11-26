import { useEffect } from "react";
import { applyThemeToRoot } from "../styles/themeVariables";
import { readStoredSkin, readStoredTheme } from "../utils/themePreferences";
export function useForceLightTheme() {
  useEffect(() => {
    applyThemeToRoot("light", "classic");
    return () => {
      applyThemeToRoot(readStoredTheme() || "light", readStoredSkin());
    };
  }, []);
}
