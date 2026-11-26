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
  "steam-light": {
    page: "#5c6a4e",
    side: "#4e5c42",
    card: "#667456",
    line: "#3a4432",
    accent: "#e6cc62"
  },
  "steam-dark": {
    page: "#1c2018",
    side: "#141814",
    card: "#262b22",
    line: "#4a5440",
    accent: "#d4c15a"
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
    id: "steam-light",
    skin: "steam",
    mode: "light",
    label: copy.steamLight,
    description: copy.steamLightDesc
  }, {
    id: "steam-dark",
    skin: "steam",
    mode: "dark",
    label: copy.steamDark,
    description: copy.steamDarkDesc
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

  return <div>
      <div className={s.grid} role="radiogroup" aria-label={copy.label}>
        {options.map(option => {
          const active = skin === option.skin && theme === option.mode;
          const preview = PREVIEWS[option.id];
          return <button key={option.id} type="button" role="radio" aria-checked={active} className={`${s.card} ${active ? s.cardActive : ""}`} disabled={saving} onClick={() => select(option)}>
              <span className={s.swatch} style={{ background: preview.page }} aria-hidden>
                <span className={s.side} style={{ background: preview.side, border: `1px solid ${preview.line}` }} />
                <span className={s.main} style={{ background: preview.card, borderColor: preview.line }}>
                  <span className={s.line} style={{ background: preview.line }} />
                  <span className={s.dot} style={{ background: preview.accent }} />
                </span>
              </span>
              <span className={s.text}>
                <span className={s.title}>{option.label}</span>
                <span className={s.desc}>{option.description}</span>
              </span>
            </button>;
        })}
      </div>
      {saving ? <span className={s.status}>{copy.saving}</span> : null}
    </div>;
}
