import { createLocaleGetter } from "../../i18n/translate";
const SLA_COPY = {
  fr: {
    loadError: "Impossible de charger les paramètres SLA",
    saveSuccess: "Paramètres SLA enregistrés",
    saveError: "Erreur lors de l'enregistrement",
    loading: "Chargement des paramètres SLA…",
    saveBtn: "Enregistrer les paramètres SLA",
    modeTitle: "Mode de calcul",
    modeDescription: "Définit comment interpréter les délais configurés sur chaque entreprise (1ère réponse, résolution).",
    timeModeLabel: "Unité de calcul SLA",
    timezoneLabel: "Fuseau horaire support",
    timezoneHint: "Référence pour les horaires d'ouverture et le calcul des échéances.",
    scheduleTitle: "Horaires d'ouverture du support",
    scheduleDescription: "Plages utilisées pour les heures et jours ouvrés. Hors de ces créneaux, le compteur SLA est en pause.",
    weekdaysTemplate: "Lun–Ven 9h–18h",
    dayColumn: "Jour",
    openColumn: "Ouvert",
    startColumn: "Début",
    endColumn: "Fin",
    applicationTitle: "Application",
    applicationDescription: "Ces réglages s'appliquent à tous les tickets créés après enregistrement. Les échéances déjà calculées ne sont pas recalculées.",
    bullet1: "Les délais par entreprise restent définis dans la fiche client (section Support).",
    bullet2: "La 1ère réponse publique clôt l'engagement de prise en charge.",
    bullet3: "En mode jours ouvrés, une valeur de 1 correspond à la fin du 1er jour ouvré.",
    noOpenDays: "Aucun jour ouvré configuré",
    timeModes: {
      calendar: "Heures calendaires (24h/24)",
      business_hours: "Heures ouvrées",
      business_days: "Jours ouvrés"
    },
    timeModeHints: {
      calendar: "Les délais entreprise (en heures) s'additionnent en continu, y compris la nuit et le week-end.",
      business_hours: "Les délais comptent uniquement pendant les plages d'ouverture ci-dessous. Hors horaires, le compteur est en pause.",
      business_days: "Chaque unité de délai correspond à une journée ouvrée complète (jusqu'à l'heure de fermeture du jour)."
    },
    weekdays: {
      0: "Dimanche",
      1: "Lundi",
      2: "Mardi",
      3: "Mercredi",
      4: "Jeudi",
      5: "Vendredi",
      6: "Samedi"
    }
  },
  en: {
    loadError: "Unable to load SLA settings",
    saveSuccess: "SLA settings saved",
    saveError: "Error while saving",
    loading: "Loading SLA settings…",
    saveBtn: "Save SLA settings",
    modeTitle: "Calculation mode",
    modeDescription: "Defines how to interpret deadlines configured per enterprise (first response, resolution).",
    timeModeLabel: "SLA calculation unit",
    timezoneLabel: "Support timezone",
    timezoneHint: "Reference for opening hours and due date calculation.",
    scheduleTitle: "Support opening hours",
    scheduleDescription: "Ranges used for business hours and days. Outside these slots, the SLA counter is paused.",
    weekdaysTemplate: "Mon–Fri 9 AM–6 PM",
    dayColumn: "Day",
    openColumn: "Open",
    startColumn: "Start",
    endColumn: "End",
    applicationTitle: "Application",
    applicationDescription: "These settings apply to all tickets created after saving. Already calculated due dates are not recalculated.",
    bullet1: "Per-enterprise deadlines remain defined on the client record (Support section).",
    bullet2: "The first public response closes the acknowledgment commitment.",
    bullet3: "In business days mode, a value of 1 means end of the 1st business day.",
    noOpenDays: "No business days configured",
    timeModes: {
      calendar: "Calendar hours (24/7)",
      business_hours: "Business hours",
      business_days: "Business days"
    },
    timeModeHints: {
      calendar: "Enterprise deadlines (in hours) accumulate continuously, including nights and weekends.",
      business_hours: "Deadlines count only during the opening hours below. Outside hours, the counter is paused.",
      business_days: "Each delay unit equals one full business day (until closing time)."
    },
    weekdays: {
      0: "Sunday",
      1: "Monday",
      2: "Tuesday",
      3: "Wednesday",
      4: "Thursday",
      5: "Friday",
      6: "Saturday"
    }
  },
  de: {
    loadError: "SLA-Einstellungen konnten nicht geladen werden",
    saveSuccess: "SLA-Einstellungen gespeichert",
    saveError: "Fehler beim Speichern",
    loading: "SLA-Einstellungen laden…",
    saveBtn: "SLA-Einstellungen speichern",
    modeTitle: "Berechnungsmodus",
    modeDescription: "Legt fest, wie Fristen pro Unternehmen interpretiert werden (Erstantwort, Lösung).",
    timeModeLabel: "SLA-Berechnungseinheit",
    timezoneLabel: "Support-Zeitzone",
    timezoneHint: "Referenz für Öffnungszeiten und Fälligkeitsberechnung.",
    scheduleTitle: "Support-Öffnungszeiten",
    scheduleDescription: "Zeiträume für Geschäftsstunden und -tage. Außerhalb pausiert der SLA-Zähler.",
    weekdaysTemplate: "Mo–Fr 9–18 Uhr",
    dayColumn: "Tag",
    openColumn: "Geöffnet",
    startColumn: "Beginn",
    endColumn: "Ende",
    applicationTitle: "Anwendung",
    applicationDescription: "Gilt für alle Tickets nach dem Speichern. Bereits berechnete Fristen werden nicht neu berechnet.",
    bullet1: "Fristen pro Unternehmen bleiben in der Kundendatei (Support) definiert.",
    bullet2: "Die erste öffentliche Antwort schließt die Annahmeverpflichtung ab.",
    bullet3: "Im Modus Arbeitstage entspricht 1 dem Ende des 1. Arbeitstags.",
    noOpenDays: "Keine Arbeitstage konfiguriert",
    timeModes: {
      calendar: "Kalenderstunden (24/7)",
      business_hours: "Geschäftsstunden",
      business_days: "Arbeitstage"
    },
    timeModeHints: {
      calendar: "Fristen (in Stunden) laufen kontinuierlich, auch nachts und am Wochenende.",
      business_hours: "Fristen zählen nur während der Öffnungszeiten unten. Außerhalb pausiert der Zähler.",
      business_days: "Jede Einheit entspricht einem vollen Arbeitstag (bis Schließzeit)."
    },
    weekdays: {
      0: "Sonntag",
      1: "Montag",
      2: "Dienstag",
      3: "Mittwoch",
      4: "Donnerstag",
      5: "Freitag",
      6: "Samstag"
    }
  },
  it: {
    loadError: "Impossibile caricare le impostazioni SLA",
    saveSuccess: "Impostazioni SLA salvate",
    saveError: "Errore durante il salvataggio",
    loading: "Caricamento impostazioni SLA…",
    saveBtn: "Salva impostazioni SLA",
    modeTitle: "Modalità di calcolo",
    modeDescription: "Definisce come interpretare le scadenze per ogni azienda (prima risposta, risoluzione).",
    timeModeLabel: "Unità di calcolo SLA",
    timezoneLabel: "Fuso orario supporto",
    timezoneHint: "Riferimento per orari di apertura e calcolo scadenze.",
    scheduleTitle: "Orari di apertura del supporto",
    scheduleDescription: "Fasce per ore e giorni lavorativi. Fuori da questi intervalli, il contatore SLA è in pausa.",
    weekdaysTemplate: "Lun–Ven 9–18",
    dayColumn: "Giorno",
    openColumn: "Aperto",
    startColumn: "Inizio",
    endColumn: "Fine",
    applicationTitle: "Applicazione",
    applicationDescription: "Si applica a tutti i ticket creati dopo il salvataggio. Le scadenze già calcolate non vengono ricalcolate.",
    bullet1: "Le scadenze per azienda restano nella scheda cliente (sezione Supporto).",
    bullet2: "La prima risposta pubblica chiude l'impegno di presa in carico.",
    bullet3: "In modalità giorni lavorativi, 1 corrisponde alla fine del 1° giorno lavorativo.",
    noOpenDays: "Nessun giorno lavorativo configurato",
    timeModes: {
      calendar: "Ore di calendario (24/7)",
      business_hours: "Ore lavorative",
      business_days: "Giorni lavorativi"
    },
    timeModeHints: {
      calendar: "Le scadenze (in ore) si accumulano continuamente, anche di notte e nel weekend.",
      business_hours: "Le scadenze contano solo durante gli orari di apertura sotto. Fuori orario, pausa.",
      business_days: "Ogni unità corrisponde a un giorno lavorativo completo (fino alla chiusura)."
    },
    weekdays: {
      0: "Domenica",
      1: "Lunedì",
      2: "Martedì",
      3: "Mercoledì",
      4: "Giovedì",
      5: "Venerdì",
      6: "Sabato"
    }
  },
  es: {
    loadError: "No se pudieron cargar los ajustes SLA",
    saveSuccess: "Ajustes SLA guardados",
    saveError: "Error al guardar",
    loading: "Cargando ajustes SLA…",
    saveBtn: "Guardar ajustes SLA",
    modeTitle: "Modo de cálculo",
    modeDescription: "Define cómo interpretar los plazos configurados por empresa (primera respuesta, resolución).",
    timeModeLabel: "Unidad de cálculo SLA",
    timezoneLabel: "Zona horaria de soporte",
    timezoneHint: "Referencia para horarios de apertura y cálculo de vencimientos.",
    scheduleTitle: "Horario de apertura del soporte",
    scheduleDescription: "Franjas para horas y días laborables. Fuera de ellas, el contador SLA está en pausa.",
    weekdaysTemplate: "Lun–Vie 9h–18h",
    dayColumn: "Día",
    openColumn: "Abierto",
    startColumn: "Inicio",
    endColumn: "Fin",
    applicationTitle: "Aplicación",
    applicationDescription: "Se aplica a todos los tickets creados tras guardar. Los vencimientos ya calculados no se recalculan.",
    bullet1: "Los plazos por empresa siguen en la ficha cliente (sección Soporte).",
    bullet2: "La primera respuesta pública cierra el compromiso de acuse.",
    bullet3: "En modo días laborables, 1 corresponde al final del 1.er día laborable.",
    noOpenDays: "Ningún día laborable configurado",
    timeModes: {
      calendar: "Horas calendario (24/7)",
      business_hours: "Horas laborables",
      business_days: "Días laborables"
    },
    timeModeHints: {
      calendar: "Los plazos (en horas) se acumulan continuamente, incluidas noches y fines de semana.",
      business_hours: "Los plazos cuentan solo durante los horarios de apertura abajo. Fuera de horario, pausa.",
      business_days: "Cada unidad equivale a un día laborable completo (hasta la hora de cierre)."
    },
    weekdays: {
      0: "Domingo",
      1: "Lunes",
      2: "Martes",
      3: "Miércoles",
      4: "Jueves",
      5: "Viernes",
      6: "Sábado"
    }
  }
};
export const getSlaCopy = createLocaleGetter(SLA_COPY);
export function formatWeekScheduleSummaryLocalized(settings, locale) {
  const copy = getSlaCopy(locale);
  const openDays = (settings?.weekSchedule || []).filter(row => row.enabled);
  if (!openDays.length) return copy.noOpenDays;
  const first = openDays[0];
  const sameHours = openDays.every(row => row.open === first.open && row.close === first.close);
  const days = openDays.map(row => copy.weekdays[row.day]).join(", ");
  if (sameHours) return `${days} · ${first.open}–${first.close}`;
  return days;
}
export function getSlaTimeModeLabel(locale, mode) {
  return getSlaCopy(locale).timeModes?.[mode] || mode;
}
export function getSlaTimeModeHint(locale, mode) {
  return getSlaCopy(locale).timeModeHints?.[mode] || "";
}
export function getWeekdayLabel(locale, day) {
  return getSlaCopy(locale).weekdays?.[day] || String(day);
}
