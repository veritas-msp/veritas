import { createLocaleGetter, interpolate } from "../../i18n/translate";
import { getLocaleTag } from "../../i18n/locales";
const COPY = {
  fr: {
    title: "Notifications",
    filterAria: "Filtrer les notifications",
    tabs: {
      active: "Actives",
      archived: "Archivées"
    },
    unreadPill: "{count} non lue",
    unreadPillPlural: "{count} non lues",
    markAllRead: "Tout marquer lu",
    archiveAll: "Tout archiver",
    archiving: "Archivage…",
    loading: "Chargement…",
    emptyActiveTitle: "Vous êtes à jour",
    emptyActiveText: "Aucune alerte en attente. On vous préviendra dès qu'il se passe quelque chose sur vos tickets.",
    emptyArchivedTitle: "Aucune archive",
    emptyArchivedText: "Les notifications que vous archivez apparaîtront ici.",
    loadMoreHistory: "Afficher plus d'historique",
    loadMoreArchived: "Afficher plus d'archives",
    archiveItemAria: "Archiver la notification",
    archiveItemTitle: "Archiver",
    triggerAria: "Notifications",
    triggerUnreadAria: "{count} notification non lue",
    triggerUnreadAriaPlural: "{count} notifications non lues",
    sections: {
      unread: "Nouvelles",
      today: "Aujourd'hui",
      history: "Historique",
      archived: "Archives"
    },
    relative: {
      justNow: "À l'instant",
      minutes: "Il y a {count} min",
      hours: "Il y a {count} h"
    }
  },
  en: {
    title: "Notifications",
    filterAria: "Filter notifications",
    tabs: {
      active: "Active",
      archived: "Archived"
    },
    unreadPill: "{count} unread",
    unreadPillPlural: "{count} unread",
    markAllRead: "Mark all as read",
    archiveAll: "Archive all",
    archiving: "Archiving…",
    loading: "Loading…",
    emptyActiveTitle: "You're all caught up",
    emptyActiveText: "No pending alerts. We'll notify you when something happens on your tickets.",
    emptyArchivedTitle: "No archives",
    emptyArchivedText: "Notifications you archive will appear here.",
    loadMoreHistory: "Show more history",
    loadMoreArchived: "Show more archives",
    archiveItemAria: "Archive notification",
    archiveItemTitle: "Archive",
    triggerAria: "Notifications",
    triggerUnreadAria: "{count} unread notification",
    triggerUnreadAriaPlural: "{count} unread notifications",
    sections: {
      unread: "New",
      today: "Today",
      history: "History",
      archived: "Archives"
    },
    relative: {
      justNow: "Just now",
      minutes: "{count} min ago",
      hours: "{count} h ago"
    }
  },
  de: {
    title: "Benachrichtigungen",
    filterAria: "Benachrichtigungen filtern",
    tabs: {
      active: "Aktiv",
      archived: "Archiviert"
    },
    unreadPill: "{count} ungelesen",
    unreadPillPlural: "{count} ungelesen",
    markAllRead: "Alle als gelesen markieren",
    archiveAll: "Alle archivieren",
    archiving: "Archivierung…",
    loading: "Laden…",
    emptyActiveTitle: "Alles erledigt",
    emptyActiveText: "Keine ausstehenden Hinweise. Wir informieren Sie, sobald etwas bei Ihren Tickets passiert.",
    emptyArchivedTitle: "Keine Archive",
    emptyArchivedText: "Archivierte Benachrichtigungen erscheinen hier.",
    loadMoreHistory: "Mehr Verlauf anzeigen",
    loadMoreArchived: "Mehr Archive anzeigen",
    archiveItemAria: "Benachrichtigung archivieren",
    archiveItemTitle: "Archivieren",
    triggerAria: "Benachrichtigungen",
    triggerUnreadAria: "{count} ungelesene Benachrichtigung",
    triggerUnreadAriaPlural: "{count} ungelesene Benachrichtigungen",
    sections: {
      unread: "Neu",
      today: "Heute",
      history: "Verlauf",
      archived: "Archive"
    },
    relative: {
      justNow: "Gerade eben",
      minutes: "Vor {count} Min.",
      hours: "Vor {count} Std."
    }
  },
  it: {
    title: "Notifiche",
    filterAria: "Filtra le notifiche",
    tabs: {
      active: "Attive",
      archived: "Archiviate"
    },
    unreadPill: "{count} non letta",
    unreadPillPlural: "{count} non lette",
    markAllRead: "Segna tutto come letto",
    archiveAll: "Archivia tutto",
    archiving: "Archiviazione…",
    loading: "Caricamento…",
    emptyActiveTitle: "Sei aggiornato",
    emptyActiveText: "Nessun avviso in sospeso. Ti avviseremo quando succede qualcosa sui tuoi ticket.",
    emptyArchivedTitle: "Nessun archivio",
    emptyArchivedText: "Le notifiche archiviate appariranno qui.",
    loadMoreHistory: "Mostra più cronologia",
    loadMoreArchived: "Mostra più archivi",
    archiveItemAria: "Archivia la notifica",
    archiveItemTitle: "Archivia",
    triggerAria: "Notifiche",
    triggerUnreadAria: "{count} notifica non letta",
    triggerUnreadAriaPlural: "{count} notifiche non lette",
    sections: {
      unread: "Nuove",
      today: "Oggi",
      history: "Cronologia",
      archived: "Archivi"
    },
    relative: {
      justNow: "Adesso",
      minutes: "{count} min fa",
      hours: "{count} h fa"
    }
  },
  es: {
    title: "Notificaciones",
    filterAria: "Filtrar notificaciones",
    tabs: {
      active: "Activas",
      archived: "Archivadas"
    },
    unreadPill: "{count} sin leer",
    unreadPillPlural: "{count} sin leer",
    markAllRead: "Marcar todo como leído",
    archiveAll: "Archivar todo",
    archiving: "Archivando…",
    loading: "Cargando…",
    emptyActiveTitle: "Está al día",
    emptyActiveText: "No hay alertas pendientes. Le avisaremos cuando ocurra algo en sus tickets.",
    emptyArchivedTitle: "Sin archivos",
    emptyArchivedText: "Las notificaciones archivadas aparecerán aquí.",
    loadMoreHistory: "Mostrar más historial",
    loadMoreArchived: "Mostrar más archivos",
    archiveItemAria: "Archivar la notificación",
    archiveItemTitle: "Archivar",
    triggerAria: "Notificaciones",
    triggerUnreadAria: "{count} notificación sin leer",
    triggerUnreadAriaPlural: "{count} notificaciones sin leer",
    sections: {
      unread: "Nuevas",
      today: "Hoy",
      history: "Historial",
      archived: "Archivos"
    },
    relative: {
      justNow: "Ahora mismo",
      minutes: "Hace {count} min",
      hours: "Hace {count} h"
    }
  }
};
export const getNotificationBellCopy = createLocaleGetter(COPY);
export function formatNotificationRelativeTime(value, copy, locale, {
  emphasizeDate = false
} = {}) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const localeTag = getLocaleTag(locale);
  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  if (emphasizeDate || date < startOfToday) {
    return date.toLocaleString(localeTag, {
      day: "2-digit",
      month: "short",
      ...(date.getFullYear() !== now.getFullYear() ? {
        year: "numeric"
      } : {}),
      hour: "2-digit",
      minute: "2-digit"
    });
  }
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return copy.relative.justNow;
  if (diffMin < 60) return interpolate(copy.relative.minutes, {
    count: diffMin
  });
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return interpolate(copy.relative.hours, {
    count: diffHours
  });
  return date.toLocaleString(localeTag, {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  });
}
