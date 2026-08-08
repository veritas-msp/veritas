import { getLocalizedEquipmentTypeLabel } from "../../i18n/equipmentFamilyLabels";
import { interpolate, pickLocaleMessages } from "../../i18n/translate";
const STATUS_FILTER_IDS = ["all", "issues", "todo", "unmapped"];
const EQUIPMENT_MSP_PANEL_COPY = {
  fr: {
    fleetTable: {
      statusAria: "État",
      name: "Nom",
      company: "Entreprise",
      locations: "Lieux",
      agent: "Agent",
      supervision: "Supervision",
      lastSync: "Dernière synchro",
      actionsAria: "Actions"
    },
    filters: {
      aria: "Filtrer les périphériques",
      all: "Tous",
      issues: "Alertes",
      todo: "À traiter",
      unmapped: "Non mappés"
    },
    toolbar: {
      typeTabsAria: "Types de périphériques",
      typeAll: "Tous",
      typeAllTitle: "Tous les types ({count})",
      deviceCount: "{count} périph.",
      todoCount: "{count} à traiter",
      okCount: "{count} OK"
    },
    row: {
      noName: "Sans nom",
      lastCollection: "Dernière collecte {source}"
    },
    storage: "Stockage",
    empty: {
      noDevicesTitle: "Aucun équipement trouvé",
      noDevicesText: "Les périphériques apparaîtront dès qu'ils seront inventoriés.",
      selectFamilyTitle: "Choisissez une famille",
      selectFamilyText: "Sélectionnez un type de périphérique ci-dessus pour afficher le tableau.",
      noFilterMatchTitle: "Aucun résultat",
      noFilterMatchText: "Aucun périphérique ne correspond à ce filtre.",
      showAll: "Afficher tous les périphériques",
      noEquipment: "Aucun équipement."
    },
    mkBar: {
      label: "Monitoring",
      alerts: "Alertes",
      critical: "Critiques",
      warning: "Warnings",
      clear: "Effacer",
      sync: "Synchroniser",
      alertCountOne: "{count} alerte",
      alertCountMany: "{count} alertes"
    }
  },
  en: {
    fleetTable: {
      statusAria: "Status",
      name: "Name",
      company: "Company",
      locations: "Sites",
      agent: "Agent",
      supervision: "Monitoring",
      lastSync: "Last sync",
      actionsAria: "Actions"
    },
    filters: {
      aria: "Filter devices",
      all: "All",
      issues: "Alerts",
      todo: "To do",
      unmapped: "Unmapped"
    },
    toolbar: {
      typeTabsAria: "Device types",
      typeAll: "All",
      typeAllTitle: "All types ({count})",
      deviceCount: "{count} devices",
      todoCount: "{count} to do",
      okCount: "{count} OK"
    },
    row: {
      noName: "Unnamed",
      lastCollection: "Last collection {source}"
    },
    storage: "Storage",
    empty: {
      noDevicesTitle: "No equipment found",
      noDevicesText: "Devices will appear once hardware is recorded.",
      selectFamilyTitle: "Choose a family",
      selectFamilyText: "Select a device type above to display the table.",
      noFilterMatchTitle: "No results",
      noFilterMatchText: "No devices match this filter.",
      showAll: "Show all devices",
      noEquipment: "No equipment."
    },
    mkBar: {
      label: "Monitoring",
      alerts: "Alerts",
      critical: "Critical",
      warning: "Warnings",
      clear: "Clear",
      sync: "Sync",
      alertCountOne: "{count} alert",
      alertCountMany: "{count} alerts"
    }
  },
  de: {
    fleetTable: {
      statusAria: "Status",
      name: "Name",
      company: "Unternehmen",
      locations: "Standorte",
      agent: "Agent",
      supervision: "Überwachung",
      lastSync: "Letzte Synchronisation",
      actionsAria: "Aktionen"
    },
    filters: {
      aria: "Geräte filtern",
      all: "Alle",
      issues: "Alarme",
      todo: "Zu erledigen",
      unmapped: "Nicht zugeordnet"
    },
    toolbar: {
      typeTabsAria: "Gerätetypen",
      typeAll: "Alle",
      typeAllTitle: "Alle Typen ({count})",
      deviceCount: "{count} Ger.",
      todoCount: "{count} zu erledigen",
      okCount: "{count} OK"
    },
    row: {
      noName: "Ohne Name",
      lastCollection: "Letzte Erfassung {source}"
    },
    storage: "Speicher",
    empty: {
      noDevicesTitle: "Keine Geräte gefunden",
      noDevicesText: "Geräte erscheinen, sobald Hardware erfasst ist.",
      selectFamilyTitle: "Familie wählen",
      selectFamilyText: "Wählen Sie oben einen Gerätetyp, um die Tabelle anzuzeigen.",
      noFilterMatchTitle: "Keine Ergebnisse",
      noFilterMatchText: "Kein Gerät entspricht diesem Filter.",
      showAll: "Alle Geräte anzeigen",
      noEquipment: "Keine Geräte."
    },
    mkBar: {
      label: "Monitoring",
      alerts: "Alarme",
      critical: "Kritisch",
      warning: "Warnings",
      clear: "Löschen",
      sync: "Synchronisieren",
      alertCountOne: "{count} Alarm",
      alertCountMany: "{count} Alarme"
    }
  },
  it: {
    fleetTable: {
      statusAria: "Stato",
      name: "Nome",
      company: "Azienda",
      locations: "Sedi",
      agent: "Agent",
      supervision: "Supervisione",
      lastSync: "Ultima sincronizzazione",
      actionsAria: "Azioni"
    },
    filters: {
      aria: "Filtra dispositivi",
      all: "Tutti",
      issues: "Avvisi",
      todo: "Da trattare",
      unmapped: "Non mappati"
    },
    toolbar: {
      typeTabsAria: "Tipi di dispositivo",
      typeAll: "Tutti",
      typeAllTitle: "Tutti i tipi ({count})",
      deviceCount: "{count} disp.",
      todoCount: "{count} da trattare",
      okCount: "{count} OK"
    },
    row: {
      noName: "Senza nome",
      lastCollection: "Ultima raccolta {source}"
    },
    storage: "Storage",
    empty: {
      noDevicesTitle: "Nessun dispositivo trovato",
      noDevicesText: "I dispositivi appariranno non appena l'hardware sarà registrato.",
      selectFamilyTitle: "Scegli una famiglia",
      selectFamilyText: "Seleziona un tipo di dispositivo sopra per visualizzare la tabella.",
      noFilterMatchTitle: "Nessun risultato",
      noFilterMatchText: "Nessun dispositivo corrisponde a questo filtro.",
      showAll: "Mostra tutti i dispositivi",
      noEquipment: "Nessun dispositivo."
    },
    mkBar: {
      label: "Monitoraggio",
      alerts: "Avvisi",
      critical: "Critici",
      warning: "Warning",
      clear: "Cancella",
      sync: "Sincronizza",
      alertCountOne: "{count} avviso",
      alertCountMany: "{count} avvisi"
    }
  },
  es: {
    fleetTable: {
      statusAria: "Estado",
      name: "Nombre",
      company: "Empresa",
      locations: "Ubicaciones",
      agent: "Agente",
      supervision: "Supervisión",
      lastSync: "Última sincronización",
      actionsAria: "Acciones"
    },
    filters: {
      aria: "Filtrar dispositivos",
      all: "Todos",
      issues: "Alertas",
      todo: "Por tratar",
      unmapped: "Sin mapear"
    },
    toolbar: {
      typeTabsAria: "Tipos de dispositivo",
      typeAll: "Todos",
      typeAllTitle: "Todos los tipos ({count})",
      deviceCount: "{count} disp.",
      todoCount: "{count} por tratar",
      okCount: "{count} OK"
    },
    row: {
      noName: "Sin nombre",
      lastCollection: "Última recopilación {source}"
    },
    storage: "Almacenamiento",
    empty: {
      noDevicesTitle: "Ningún equipo encontrado",
      noDevicesText: "Los dispositivos aparecerán cuando se registre el hardware.",
      selectFamilyTitle: "Elija una familia",
      selectFamilyText: "Seleccione un tipo de dispositivo arriba para mostrar la tabla.",
      noFilterMatchTitle: "Sin resultados",
      noFilterMatchText: "Ningún dispositivo coincide con este filtro.",
      showAll: "Mostrar todos los dispositivos",
      noEquipment: "Sin equipos."
    },
    mkBar: {
      label: "Monitorización",
      alerts: "Alertas",
      critical: "Críticos",
      warning: "Warnings",
      clear: "Borrar",
      sync: "Sincronizar",
      alertCountOne: "{count} alerta",
      alertCountMany: "{count} alertas"
    }
  }
};
export function getEquipmentMspPanelCopy(locale) {
  const t = pickLocaleMessages(EQUIPMENT_MSP_PANEL_COPY, locale);
  const getTypeLabel = type => getLocalizedEquipmentTypeLabel(type, locale, type);
  return {
    ...t,
    statusFilters: STATUS_FILTER_IDS.map(id => ({
      id,
      label: t.filters[id]
    })),
    getTypeLabel,
    formatTypeTitle: (type, count) => `${getTypeLabel(type)} (${count})`,
    formatTypeAllTitle: count => interpolate(t.toolbar.typeAllTitle, {
      count: String(count)
    }),
    formatLastCollectionTitle: source => interpolate(t.row.lastCollection, {
      source: source || "-"
    }),
    formatDeviceCount: count => interpolate(t.toolbar.deviceCount, {
      count: String(count)
    }),
    formatTodoCount: count => interpolate(t.toolbar.todoCount, {
      count: String(count)
    }),
    formatOkCount: count => interpolate(t.toolbar.okCount, {
      count: String(count)
    }),
    formatMkAlertSub: count => {
      const n = Number(count) || 0;
      const template = n === 1 ? t.mkBar.alertCountOne : t.mkBar.alertCountMany;
      return interpolate(template, {
        count: String(n)
      });
    }
  };
}
