import { createLocaleGetter } from "./translate";
const REGIONAL_OPTIONS_COPY = {
  fr: {
    dateFormats: {
      "dd/mm/yyyy": "JJ/MM/AAAA (31/12/2026)",
      "mm/dd/yyyy": "MM/JJ/AAAA (12/31/2026)",
      "yyyy-mm-dd": "AAAA-MM-JJ (2026-12-31)"
    },
    themes: {
      light: "Clair",
      dark: "Sombre",
      system: "Système (préférence OS)",
      systemSubtitle: "Préférence OS"
    }
  },
  en: {
    dateFormats: {
      "dd/mm/yyyy": "DD/MM/YYYY (31/12/2026)",
      "mm/dd/yyyy": "MM/DD/YYYY (12/31/2026)",
      "yyyy-mm-dd": "YYYY-MM-DD (2026-12-31)"
    },
    themes: {
      light: "Light",
      dark: "Dark",
      system: "System (OS preference)",
      systemSubtitle: "OS preference"
    }
  },
  de: {
    dateFormats: {
      "dd/mm/yyyy": "TT/MM/JJJJ (31.12.2026)",
      "mm/dd/yyyy": "MM/TT/JJJJ (12/31/2026)",
      "yyyy-mm-dd": "JJJJ-MM-TT (2026-12-31)"
    },
    themes: {
      light: "Hell",
      dark: "Dunkel",
      system: "System (OS-Einstellung)",
      systemSubtitle: "OS-Einstellung"
    }
  },
  it: {
    dateFormats: {
      "dd/mm/yyyy": "GG/MM/AAAA (31/12/2026)",
      "mm/dd/yyyy": "MM/GG/AAAA (12/31/2026)",
      "yyyy-mm-dd": "AAAA-MM-GG (2026-12-31)"
    },
    themes: {
      light: "Chiaro",
      dark: "Scuro",
      system: "Sistema (preferenza OS)",
      systemSubtitle: "Preferenza OS"
    }
  },
  es: {
    dateFormats: {
      "dd/mm/yyyy": "DD/MM/AAAA (31/12/2026)",
      "mm/dd/yyyy": "MM/DD/AAAA (12/31/2026)",
      "yyyy-mm-dd": "AAAA-MM-DD (2026-12-31)"
    },
    themes: {
      light: "Claro",
      dark: "Oscuro",
      system: "Sistema (preferencia del SO)",
      systemSubtitle: "Preferencia del SO"
    }
  }
};
export const getRegionalOptionsCopy = createLocaleGetter(REGIONAL_OPTIONS_COPY);
export function getLocalizedDateFormatOptions(locale) {
  const copy = getRegionalOptionsCopy(locale);
  return [{
    value: "dd/mm/yyyy",
    label: copy.dateFormats["dd/mm/yyyy"]
  }, {
    value: "mm/dd/yyyy",
    label: copy.dateFormats["mm/dd/yyyy"]
  }, {
    value: "yyyy-mm-dd",
    label: copy.dateFormats["yyyy-mm-dd"]
  }].map(({
    value,
    label
  }) => {
    const example = label.match(/\(([^)]+)\)/)?.[1] || label;
    return {
      value,
      label: example,
      title: label
    };
  });
}
export function getLocalizedThemeChoices(locale) {
  const copy = getRegionalOptionsCopy(locale);
  return [{
    value: "light",
    label: copy.themes.light,
    icon: "mdi:white-balance-sunny"
  }, {
    value: "dark",
    label: copy.themes.dark,
    icon: "mdi:moon-waning-crescent"
  }, {
    value: "system",
    label: copy.themes.system,
    icon: "mdi:laptop",
    subtitle: copy.themes.systemSubtitle
  }];
}
