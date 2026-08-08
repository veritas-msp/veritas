import { createLocaleGetter, interpolate } from "../../i18n/translate";
const ADMIN_INTEGRATIONS_COPY = {
  fr: {
    stats: {
      activeIntegrations: "Intégrations actives",
      configurableConnectors: "Connecteurs configurables",
      comingSoon: "Bientôt disponibles"
    },
    catalog: {
      title: "Catalogue des connecteurs",
      description: "Configurez les connecteurs disponibles. Les intégrations « bientôt » sont visibles mais désactivées."
    },
    searchPlaceholder: "Rechercher une intégration…",
    searchAria: "Rechercher une intégration",
    filters: {
      all: "Toutes",
      active: "Actives",
      available: "Configurables",
      soon: "Bientôt"
    },
    loading: "Chargement des intégrations…",
    emptySearch: "Aucune intégration ne correspond à votre recherche.",
    sectionCountSingular: "{count} connecteur",
    sectionCountPlural: "{count} connecteurs",
    badges: {
      active: "Active",
      inactive: "Inactive",
      soon: "Bientôt"
    },
    card: {
      openConfig: "Configurer",
      soonHint: "Indisponible pour le moment"
    },
    toast: {
      loadError: "Impossible de charger les intégrations.",
      saveError: "Erreur lors de la sauvegarde.",
      saveSuccess: "{name} enregistré.",
      comingSoon: "{name} sera disponible prochainement."
    },
    modal: {
      integrationActive: "Intégration active",
      integrationInactive: "Intégration inactive",
      testConnection: "Tester la connexion",
      testing: "Test en cours…",
      cancel: "Annuler",
      save: "Enregistrer",
      saving: "Enregistrement…",
      webhookMetaUrl: "URL webhook Meta (callback) :"
    },
    testModal: {
      title: "Résultat du test",
      close: "Fermer",
      successTitle: "Connexion réussie",
      failTitle: "Connexion échouée",
      successDefault: "Connexion réussie.",
      failDefault: "Échec du test.",
      errorRunning: "Erreur pendant le test.",
      notAvailable: "Test non disponible"
    }
  },
  en: {
    stats: {
      activeIntegrations: "Active integrations",
      configurableConnectors: "Configurable connectors",
      comingSoon: "Coming soon"
    },
    catalog: {
      title: "Connector catalog",
      description: "Configure available connectors. Coming-soon integrations stay visible but disabled."
    },
    searchPlaceholder: "Search for an integration…",
    searchAria: "Search for an integration",
    filters: {
      all: "All",
      active: "Active",
      available: "Configurable",
      soon: "Soon"
    },
    loading: "Loading integrations…",
    emptySearch: "No integration matches your search.",
    sectionCountSingular: "{count} connector",
    sectionCountPlural: "{count} connectors",
    badges: {
      active: "Active",
      inactive: "Inactive",
      soon: "Soon"
    },
    card: {
      openConfig: "Configure",
      soonHint: "Unavailable for now"
    },
    toast: {
      loadError: "Unable to load integrations.",
      saveError: "Error while saving.",
      saveSuccess: "{name} saved.",
      comingSoon: "{name} will be available soon."
    },
    modal: {
      integrationActive: "Integration active",
      integrationInactive: "Integration inactive",
      testConnection: "Test connection",
      testing: "Testing…",
      cancel: "Cancel",
      save: "Save",
      saving: "Saving…",
      webhookMetaUrl: "Meta webhook URL (callback):"
    },
    testModal: {
      title: "Test result",
      close: "Close",
      successTitle: "Connection successful",
      failTitle: "Connection failed",
      successDefault: "Connection successful.",
      failDefault: "Test failed.",
      errorRunning: "Error while running test.",
      notAvailable: "Test not available"
    }
  },
  de: {
    stats: {
      activeIntegrations: "Aktive Integrationen",
      configurableConnectors: "Konfigurierbare Connectoren",
      comingSoon: "Demnächst verfügbar"
    },
    catalog: {
      title: "Connector-Katalog",
      description: "Konfigurieren Sie verfügbare Connectoren. Demnächst-Integrationen bleiben sichtbar, sind aber deaktiviert."
    },
    searchPlaceholder: "Integration suchen…",
    searchAria: "Integration suchen",
    filters: {
      all: "Alle",
      active: "Aktiv",
      available: "Konfigurierbar",
      soon: "Demnächst"
    },
    loading: "Integrationen werden geladen…",
    emptySearch: "Keine Integration entspricht Ihrer Suche.",
    sectionCountSingular: "{count} Connector",
    sectionCountPlural: "{count} Connectoren",
    badges: {
      active: "Aktiv",
      inactive: "Inaktiv",
      soon: "Demnächst"
    },
    card: {
      openConfig: "Konfigurieren",
      soonHint: "Derzeit nicht verfügbar"
    },
    toast: {
      loadError: "Integrationen konnten nicht geladen werden.",
      saveError: "Fehler beim Speichern.",
      saveSuccess: "{name} gespeichert.",
      comingSoon: "{name} wird demnächst verfügbar sein."
    },
    modal: {
      integrationActive: "Integration aktiv",
      integrationInactive: "Integration inaktiv",
      testConnection: "Verbindung testen",
      testing: "Test läuft…",
      cancel: "Abbrechen",
      save: "Speichern",
      saving: "Speichern…",
      webhookMetaUrl: "Meta-Webhook-URL (Callback):"
    },
    testModal: {
      title: "Testergebnis",
      close: "Schließen",
      successTitle: "Verbindung erfolgreich",
      failTitle: "Verbindung fehlgeschlagen",
      successDefault: "Verbindung erfolgreich.",
      failDefault: "Test fehlgeschlagen.",
      errorRunning: "Fehler während des Tests.",
      notAvailable: "Test nicht verfügbar"
    }
  },
  it: {
    stats: {
      activeIntegrations: "Integrazioni attive",
      configurableConnectors: "Connettori configurabili",
      comingSoon: "Prossimamente"
    },
    catalog: {
      title: "Catalogo connettori",
      description: "Configurate i connettori disponibili. Le integrazioni « presto » restano visibili ma disabilitate."
    },
    searchPlaceholder: "Cerca un'integrazione…",
    searchAria: "Cerca un'integrazione",
    filters: {
      all: "Tutte",
      active: "Attive",
      available: "Configurabili",
      soon: "Presto"
    },
    loading: "Caricamento integrazioni…",
    emptySearch: "Nessuna integrazione corrisponde alla ricerca.",
    sectionCountSingular: "{count} connettore",
    sectionCountPlural: "{count} connettori",
    badges: {
      active: "Attiva",
      inactive: "Inattiva",
      soon: "Presto"
    },
    card: {
      openConfig: "Configura",
      soonHint: "Non disponibile per ora"
    },
    toast: {
      loadError: "Impossibile caricare le integrazioni.",
      saveError: "Errore durante il salvataggio.",
      saveSuccess: "{name} salvato.",
      comingSoon: "{name} sarà disponibile a breve."
    },
    modal: {
      integrationActive: "Integrazione attiva",
      integrationInactive: "Integrazione inattiva",
      testConnection: "Testa connessione",
      testing: "Test in corso…",
      cancel: "Annulla",
      save: "Salva",
      saving: "Salvataggio…",
      webhookMetaUrl: "URL webhook Meta (callback):"
    },
    testModal: {
      title: "Risultato del test",
      close: "Chiudi",
      successTitle: "Connessione riuscita",
      failTitle: "Connessione fallita",
      successDefault: "Connessione riuscita.",
      failDefault: "Test fallito.",
      errorRunning: "Errore durante il test.",
      notAvailable: "Test non disponibile"
    }
  },
  es: {
    stats: {
      activeIntegrations: "Integraciones activas",
      configurableConnectors: "Conectores configurables",
      comingSoon: "Próximamente"
    },
    catalog: {
      title: "Catálogo de conectores",
      description: "Configure los conectores disponibles. Las integraciones « pronto » siguen visibles pero deshabilitadas."
    },
    searchPlaceholder: "Buscar una integración…",
    searchAria: "Buscar una integración",
    filters: {
      all: "Todas",
      active: "Activas",
      available: "Configurables",
      soon: "Pronto"
    },
    loading: "Cargando integraciones…",
    emptySearch: "Ninguna integración coincide con su búsqueda.",
    sectionCountSingular: "{count} conector",
    sectionCountPlural: "{count} conectores",
    badges: {
      active: "Activa",
      inactive: "Inactiva",
      soon: "Pronto"
    },
    card: {
      openConfig: "Configurar",
      soonHint: "No disponible por ahora"
    },
    toast: {
      loadError: "No se pudieron cargar las integraciones.",
      saveError: "Error al guardar.",
      saveSuccess: "{name} guardado.",
      comingSoon: "{name} estará disponible próximamente."
    },
    modal: {
      integrationActive: "Integración activa",
      integrationInactive: "Integración inactiva",
      testConnection: "Probar conexión",
      testing: "Prueba en curso…",
      cancel: "Cancelar",
      save: "Guardar",
      saving: "Guardando…",
      webhookMetaUrl: "URL webhook Meta (callback):"
    },
    testModal: {
      title: "Resultado de la prueba",
      close: "Cerrar",
      successTitle: "Conexión exitosa",
      failTitle: "Conexión fallida",
      successDefault: "Conexión exitosa.",
      failDefault: "Prueba fallida.",
      errorRunning: "Error durante la prueba.",
      notAvailable: "Prueba no disponible"
    }
  }
};
export const getAdminIntegrationsCopy = createLocaleGetter(ADMIN_INTEGRATIONS_COPY);
export function formatIntegrationSectionCount(locale, count) {
  const copy = getAdminIntegrationsCopy(locale);
  const n = Number(count) || 0;
  const template = n === 1 ? copy.sectionCountSingular : copy.sectionCountPlural;
  return interpolate(template, {
    count: n
  });
}
