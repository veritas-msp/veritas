import { useCallback, useEffect, useState } from "react";
import { DEFAULT_SETUP_LOCALE, setupTranslations } from "./setupTranslations";
const STORAGE_KEY = "veritas-setup-locale";
export function useSetupLocale() {
  const [locale, setLocaleState] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && setupTranslations[saved]) return saved;
    return DEFAULT_SETUP_LOCALE;
  });
  const t = setupTranslations[locale] ?? setupTranslations[DEFAULT_SETUP_LOCALE];
  const setLocale = useCallback(code => {
    if (!setupTranslations[code]) return;
    setLocaleState(code);
    localStorage.setItem(STORAGE_KEY, code);
  }, []);
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);
  return {
    locale,
    setLocale,
    t
  };
}
