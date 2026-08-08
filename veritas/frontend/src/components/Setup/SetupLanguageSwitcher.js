import { useEffect, useRef, useState } from "react";
import { SETUP_LOCALES } from "./setupTranslations";
import styles from "./SetupWizard.module.css";
export default function SetupLanguageSwitcher({
  locale,
  onChange
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const current = SETUP_LOCALES.find(l => l.code === locale) ?? SETUP_LOCALES[0];
  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = e => {
      if (rootRef.current && !rootRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    const onKeyDown = e => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);
  const selectLocale = code => {
    onChange(code);
    setOpen(false);
  };
  return <div className={styles.langSwitcher} ref={rootRef}>
      <button type="button" className={`${styles.langBtn} ${styles.langBtnCurrent} ${open ? styles.langBtnOpen : ""}`} onClick={() => setOpen(v => !v)} title={current.label} aria-label={current.label} aria-haspopup="listbox" aria-expanded={open}>
        <span className={styles.langFlag} aria-hidden="true">
          {current.flag}
        </span>
      </button>

      {open && <ul className={styles.langMenu} role="listbox" aria-label="Language">
          {SETUP_LOCALES.map(({
        code,
        flag,
        label
      }) => <li key={code} role="option" aria-selected={locale === code}>
              <button type="button" className={`${styles.langMenuItem} ${locale === code ? styles.langMenuItemActive : ""}`} onClick={() => selectLocale(code)} title={label}>
                <span className={styles.langFlag} aria-hidden="true">
                  {flag}
                </span>
                <span className={styles.langMenuLabel}>{label}</span>
              </button>
            </li>)}
        </ul>}
    </div>;
}
