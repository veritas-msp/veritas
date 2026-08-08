import { useEffect } from "react";
import { applyThemeToRoot } from "../styles/themeVariables";
export function useForceLightTheme() {
  useEffect(() => {
    applyThemeToRoot("light");
    return () => {
      const savedTheme = localStorage.getItem("theme") || "light";
      applyThemeToRoot(savedTheme);
    };
  }, []);
}
