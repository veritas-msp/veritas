import { createLocaleGetter } from "../../i18n/translate";

const COPY = {
  fr: {
    title: "Règles d’alerte supervision",
    subtitle: "Critères qui déclenchent les alertes natives Veritas (CheckMK, RMM, etc.)",
    loading: "Chargement des règles…"
  },
  en: {
    title: "Supervision alert rules",
    subtitle: "Criteria that trigger native Veritas alerts (CheckMK, RMM, etc.)",
    loading: "Loading rules…"
  },
  de: {
    title: "Supervisions-Alarmregeln",
    subtitle: "Kriterien für native Veritas-Alarme (CheckMK, RMM usw.)",
    loading: "Regeln werden geladen…"
  },
  it: {
    title: "Regole avvisi supervisione",
    subtitle: "Criteri che attivano gli avvisi nativi Veritas (CheckMK, RMM, ecc.)",
    loading: "Caricamento regole…"
  },
  es: {
    title: "Reglas de alerta de supervisión",
    subtitle: "Criterios que disparan las alertas nativas de Veritas (CheckMK, RMM, etc.)",
    loading: "Cargando reglas…"
  }
};

export const getAdminSupervisionAlertRulesCopy = createLocaleGetter(COPY);
