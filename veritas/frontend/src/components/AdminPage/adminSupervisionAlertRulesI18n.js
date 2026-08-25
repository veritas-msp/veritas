import { createLocaleGetter } from "../../i18n/translate";

const COPY = {
  fr: {
    title: "Règles d’alerte par périphérique",
    subtitle: "Critères d’alertes natives Veritas, organisés par type d’équipement",
    loading: "Chargement des règles…"
  },
  en: {
    title: "Alert rules by device type",
    subtitle: "Native Veritas alert criteria, organized by device type",
    loading: "Loading rules…"
  },
  de: {
    title: "Alarmregeln nach Gerätetyp",
    subtitle: "Native Veritas-Alarmkriterien, nach Gerätetyp organisiert",
    loading: "Regeln werden geladen…"
  },
  it: {
    title: "Regole avvisi per tipo di periferica",
    subtitle: "Criteri avvisi nativi Veritas, organizzati per tipo di dispositivo",
    loading: "Caricamento regole…"
  },
  es: {
    title: "Reglas de alerta por tipo de periférico",
    subtitle: "Criterios de alertas nativas Veritas, organizados por tipo de equipo",
    loading: "Cargando reglas…"
  }
};

export const getAdminSupervisionAlertRulesCopy = createLocaleGetter(COPY);
