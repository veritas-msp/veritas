export const THEME_VARIABLES = {
  light: {
    "--bg-primary": "#ffffff",
    "--bg-secondary": "#f9fafb",
    "--bg-tertiary": "#f3f4f6",
    "--bg-sidebar": "#ffffff",
    "--text-primary": "#000000",
    "--text-secondary": "#000000",
    "--text-muted": "#6b7280",
    "--text-inverted": "#ffffff",
    "--border-primary": "#e5e7eb",
    "--border-secondary": "#d1d5db",
    "--accent-primary": "#4f46e5",
    "--accent-secondary": "#6366f1",
    "--shadow-color": "rgba(0, 0, 0, 0.1)",
    "--msp-page-bg": "#d0d9e6",
    "--msp-surface": "#ffffff",
    "--msp-surface-2": "#f7f9fc",
    "--msp-surface-3": "#f4f7fb",
    "--msp-border": "#c5d0df",
    "--msp-border-light": "#b8c5d6",
    "--msp-text": "#0f1c2e",
    "--msp-muted": "#5c6b82",
    "--msp-muted-light": "#8b9bb5",
    "--msp-accent": "#2b5fab",
    "--msp-accent-soft": "rgba(43, 95, 171, 0.1)"
  },
  dark: {
    "--bg-primary": "#0f0f23",
    "--bg-secondary": "#1a1a2e",
    "--bg-tertiary": "#1e1e3f",
    "--bg-sidebar": "#1a1a2e",
    "--text-primary": "#f9fafb",
    "--text-secondary": "#d1d5db",
    "--text-muted": "#9ca3af",
    "--text-inverted": "#111827",
    "--border-primary": "#2a2a4a",
    "--border-secondary": "#3a3a5a",
    "--accent-primary": "#6366f1",
    "--accent-secondary": "#818cf8",
    "--shadow-color": "rgba(0, 0, 0, 0.3)",
    "--msp-page-bg": "#060a10",
    "--msp-surface": "#1a2540",
    "--msp-surface-2": "#152035",
    "--msp-surface-3": "#1e2d4a",
    "--msp-border": "#2f4260",
    "--msp-border-light": "#243047",
    "--msp-text": "#e8edf5",
    "--msp-muted": "#8fa8c4",
    "--msp-muted-light": "#6a88a8",
    "--msp-accent": "#4a8fd4",
    "--msp-accent-soft": "rgba(74, 143, 212, 0.15)"
  }
};
export function applyThemeToRoot(theme) {
  const root = document.documentElement;
  const palette = THEME_VARIABLES[theme] || THEME_VARIABLES.light;
  root.classList.remove("light", "dark");
  root.classList.add(theme === "dark" ? "dark" : "light");
  Object.entries(palette).forEach(([property, value]) => {
    root.style.setProperty(property, value);
  });
  const metaThemeColor = document.querySelector('meta[name="theme-color"]');
  if (metaThemeColor) {
    metaThemeColor.setAttribute("content", theme === "dark" ? "#0f0f23" : "#ffffff");
  }
}
