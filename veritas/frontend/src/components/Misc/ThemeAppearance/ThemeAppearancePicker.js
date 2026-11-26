import { useMemo, useState } from "react";
import { toast } from "react-toastify";
import { useAppLocale } from "../../../hooks/useAppLocale";
import { useTheme } from "../../../hooks/useTheme";
import { getThemeAppearanceCopy } from "./themeAppearanceI18n";
import s from "./ThemeAppearancePicker.module.css";

const PREVIEWS = {
  "classic-light": {
    page: "#e8f1fa",
    side: "#ffffff",
    card: "#ffffff",
    line: "#9aabc0",
    accent: "#2b5fab"
  },
  "classic-dark": {
    page: "#02050a",
    side: "#0c1220",
    card: "#1f2d4a",
    line: "#3d5478",
    accent: "#5a9de0"
  },
  "olive-light": {
    page: "#5c6a4e",
    side: "#4e5c42",
    card: "#667456",
    line: "#3a4432",
    accent: "#e6cc62"
  },
  "olive-dark": {
    page: "#1c2018",
    side: "#141814",
    card: "#262b22",
    line: "#4a5440",
    accent: "#d4c15a"
  },
  "miami-light": {
    page: "#fff0f6",
    side: "#ffe3f2",
    card: "#fff7fb",
    line: "#f0b4ce",
    accent: "#ff2f92"
  },
  "miami-dark": {
    page: "#120814",
    side: "#0c0610",
    card: "#241028",
    line: "#6b2d78",
    accent: "#5ce1e6"
  },
  "xp-light": {
    page: "#ece9d8",
    side: "#245edc",
    card: "#ffffff",
    line: "#aca899",
    accent: "#0054e3"
  },
  "xp-dark": {
    page: "#1a1a1a",
    side: "#0a246a",
    card: "#2a2a2a",
    line: "#5a5a5a",
    accent: "#3c81f3"
  }
};

export default function ThemeAppearancePicker() {
  const locale = useAppLocale();
  const copy = useMemo(() => getThemeAppearanceCopy(locale), [locale]);
  const { theme, skin, setAppearance } = useTheme();
  const [saving, setSaving] = useState(false);
  const options = useMemo(() => [{
    id: "classic-light",
    skin: "classic",
    mode: "light",
    label: copy.classicLight,
    description: copy.classicLightDesc
  }, {
    id: "classic-dark",
    skin: "classic",
    mode: "dark",
    label: copy.classicDark,
    description: copy.classicDarkDesc
  }, {
    id: "olive-light",
    skin: "olive",
    mode: "light",
    label: copy.oliveLight,
    description: copy.oliveLightDesc
  }, {
    id: "olive-dark",
    skin: "olive",
    mode: "dark",
    label: copy.oliveDark,
    description: copy.oliveDarkDesc
  }, {
    id: "miami-light",
    skin: "miami",
    mode: "light",
    label: copy.miamiLight,
    description: copy.miamiLightDesc
  }, {
    id: "miami-dark",
    skin: "miami",
    mode: "dark",
    label: copy.miamiDark,
    description: copy.miamiDarkDesc
  }, {
    id: "xp-light",
    skin: "xp",
    mode: "light",
    label: copy.xpLight,
    description: copy.xpLightDesc
  }, {
    id: "xp-dark",
    skin: "xp",
    mode: "dark",
    label: copy.xpDark,
    description: copy.xpDarkDesc
  }], [copy]);

  const select = async option => {
    if (saving) return;
    if (skin === option.skin && theme === option.mode) return;
    setSaving(true);
    try {
      await setAppearance(option.skin, option.mode);
      toast.success(copy.saved);
    } catch {
      toast.error(copy.error);
    } finally {
      setSaving(false);
    }
  };

  return <div className={s.list} role="radiogroup" aria-label={copy.label} data-theme-picker="column">
      {options.map(option => {
        const active = skin === option.skin && theme === option.mode;
        const preview = PREVIEWS[option.id];
        return <button key={option.id} type="button" role="radio" aria-checked={active} className={`${s.row} ${active ? s.rowActive : ""}`} disabled={saving} onClick={() => select(option)}>
            <span className={s.swatch} style={{ background: preview.page }} aria-hidden>
              <span className={s.side} style={{ background: preview.side }} />
              <span className={s.main} style={{ background: preview.card }}>
                <span className={s.line} style={{ background: preview.accent }} />
              </span>
            </span>
            <span className={s.text}>
              <span className={s.title}>{option.label}</span>
              <span className={s.desc}>{option.description}</span>
            </span>
            <span className={s.mark} aria-hidden />
          </button>;
      })}
      {saving ? <span className={s.status}>{copy.saving}</span> : null}
    </div>;
}
