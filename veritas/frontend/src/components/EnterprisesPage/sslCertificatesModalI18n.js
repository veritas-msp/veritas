import { interpolate, pickLocaleMessages } from "../../i18n/translate";
const SSL_MODAL_COPY = {
  fr: {
    bcp47: "fr-FR",
    eyebrow: "Services · Sécurité",
    title: "Certificats SSL",
    subtitle: "Surveillance TLS et expiration des certificats",
    navAria: "Sections SSL",
    sections: {
      overview: {
        label: "Vue d'ensemble",
        description: "Synthèse et actions"
      },
      add: {
        label: "Nouvel hôte",
        description: "Ajouter à la surveillance"
      },
      inventory: {
        label: "Certificats",
        description: "État TLS par hôte"
      }
    },
    overview: {
      title: "Vue d'ensemble",
      description: "Suivi TLS des hôtes surveillés : validité, émetteur et dates d'expiration.",
      unknownNoticeOne: "{count} certificat n'a pas encore été vérifié. Lancez une vérification pour récupérer les dates d'expiration.",
      unknownNoticeMany: "{count} certificats n'ont pas encore été vérifiés. Lancez une vérification pour récupérer les dates d'expiration.",
      heartbeatInfo: "Les certificats sont revérifiés automatiquement à l'ouverture de la cartographie si l'intervalle configuré est dépassé (heartbeat TLS).",
      addHostBtn: "Ajouter un hôte",
      viewCertsBtn: "Voir les certificats"
    },
    add: {
      titleNew: "Nouvel hôte",
      titleEdit: "Modifier l'hôte",
      descriptionNew: "Ajoutez un nom d'hôte ou un sous-domaine à surveiller (port HTTPS par défaut : 443).",
      descriptionEdit: "Ajustez le nom d'hôte, le port ou la fréquence de vérification TLS.",
      hostname: "Nom d'hôte",
      hostnamePlaceholder: "exemple.fr ou api.exemple.fr",
      port: "Port TLS",
      interval: "Intervalle de vérif. (heures)",
      portIncrease: "Augmenter le port",
      portDecrease: "Diminuer le port",
      intervalIncrease: "Augmenter l'intervalle",
      intervalDecrease: "Diminuer l'intervalle",
      cancelEdit: "Annuler la modification"
    },
    inventory: {
      title: "Certificats surveillés",
      description: "État TLS, émetteur et date d'expiration pour chaque hôte.",
      filteredSuffix: " (filtré)",
      countOne: "{count} certificat",
      countMany: "{count} certificats"
    },
    kpi: {
      all: "Total",
      active: "Valides",
      warning: "À surveiller",
      problem: "Problèmes"
    },
    filters: {
      all: "Tous",
      active: "Valides",
      warning: "À surveiller",
      expired: "Expirés",
      error: "Erreurs",
      unknown: "Non vérifiés"
    },
    status: {
      error: "Erreur",
      unknown: "Non vérifié",
      unknownInvalid: "Inconnu",
      expired: "Expiré",
      warning: "Expire bientôt",
      active: "Valide"
    },
    meta: {
      issuer: "Émetteur",
      validity: "Validité",
      daysRemaining: "Jours restants",
      lastCheck: "Dernière vérif.",
      nextCheck: "Prochaine vérif.",
      interval: "Intervalle",
      technicalDetails: "Détails techniques",
      subjectCN: "Sujet (CN)",
      san: "SAN",
      tlsProtocol: "Protocole TLS",
      fingerprint: "Empreinte",
      serialNumber: "N° série",
      trustChain: "Chaîne de confiance",
      trustValid: "Valide",
      trustInvalid: "Non valide"
    },
    interval: {
      daysOne: "{days} jour",
      daysMany: "{days} jours",
      hours: "{value} h"
    },
    empty: {
      noneTitle: "Aucun certificat surveillé",
      noFilterTitle: "Aucun certificat pour ce filtre",
      noneHint: "Ajoutez un hôte dans l'onglet « Nouvel hôte ».",
      noFilterHint: "Modifiez le filtre pour afficher d'autres certificats.",
      addBtn: "Ajouter un hôte"
    },
    footer: {
      hostRequired: "Le nom d'hôte est obligatoire",
      hostCountOne: "{count} hôte surveillé",
      hostCountMany: "{count} hôtes surveillés"
    },
    primary: {
      saving: "Enregistrement…",
      update: "Mettre à jour",
      addHost: "Ajouter l'hôte",
      checking: "Vérification…",
      checkAll: "Vérifier tout"
    },
    actions: {
      check: "Vérifier",
      checking: "Vérification…",
      checkAria: "Vérifier le certificat",
      checkingAria: "Vérification en cours",
      edit: "Modifier",
      editAria: "Modifier l'hôte",
      delete: "Supprimer",
      deleteAria: "Supprimer de la surveillance"
    },
    toasts: {
      hostnameRequired: "Le nom d'hôte est obligatoire",
      checkAllSuccess: "{count} certificat(s) vérifié(s)",
      checkAllError: "Erreur lors de la vérification SSL",
      hostUpdated: "Hôte mis à jour",
      hostAdded: "Hôte ajouté à la surveillance SSL",
      saveError: "Impossible d'enregistrer l'hôte",
      hostRemoved: "Hôte retiré de la surveillance",
      deleteError: "Impossible de supprimer l'hôte",
      checkCertSuccess: "Certificat vérifié · {host}",
      checkCertError: "Erreur lors de la vérification"
    }
  },
  en: {
    bcp47: "en-GB",
    eyebrow: "Services · Security",
    title: "SSL certificates",
    subtitle: "TLS monitoring and certificate expiration",
    navAria: "SSL sections",
    sections: {
      overview: {
        label: "Overview",
        description: "Summary and actions"
      },
      add: {
        label: "New host",
        description: "Add to monitoring"
      },
      inventory: {
        label: "Certificates",
        description: "TLS status per host"
      }
    },
    overview: {
      title: "Overview",
      description: "TLS monitoring of watched hosts: validity, issuer and expiration dates.",
      unknownNoticeOne: "{count} certificate has not been checked yet. Run a check to retrieve expiration dates.",
      unknownNoticeMany: "{count} certificates have not been checked yet. Run a check to retrieve expiration dates.",
      heartbeatInfo: "Certificates are automatically re-checked when opening the map if the configured interval has elapsed (TLS heartbeat).",
      addHostBtn: "Add a host",
      viewCertsBtn: "View certificates"
    },
    add: {
      titleNew: "New host",
      titleEdit: "Edit host",
      descriptionNew: "Add a hostname or subdomain to monitor (default HTTPS port: 443).",
      descriptionEdit: "Adjust the hostname, port or TLS check frequency.",
      hostname: "Hostname",
      hostnamePlaceholder: "example.com or api.example.com",
      port: "TLS port",
      interval: "Check interval (hours)",
      portIncrease: "Increase port",
      portDecrease: "Decrease port",
      intervalIncrease: "Increase interval",
      intervalDecrease: "Decrease interval",
      cancelEdit: "Cancel edit"
    },
    inventory: {
      title: "Monitored certificates",
      description: "TLS status, issuer and expiration date for each host.",
      filteredSuffix: " (filtered)",
      countOne: "{count} certificate",
      countMany: "{count} certificates"
    },
    kpi: {
      all: "Total",
      active: "Valid",
      warning: "To monitor",
      problem: "Issues"
    },
    filters: {
      all: "All",
      active: "Valid",
      warning: "To monitor",
      expired: "Expired",
      error: "Errors",
      unknown: "Unchecked"
    },
    status: {
      error: "Error",
      unknown: "Unchecked",
      unknownInvalid: "Unknown",
      expired: "Expired",
      warning: "Expiring soon",
      active: "Valid"
    },
    meta: {
      issuer: "Issuer",
      validity: "Validity",
      daysRemaining: "Days remaining",
      lastCheck: "Last check",
      nextCheck: "Next check",
      interval: "Interval",
      technicalDetails: "Technical details",
      subjectCN: "Subject (CN)",
      san: "SAN",
      tlsProtocol: "TLS protocol",
      fingerprint: "Fingerprint",
      serialNumber: "Serial no.",
      trustChain: "Trust chain",
      trustValid: "Valid",
      trustInvalid: "Invalid"
    },
    interval: {
      daysOne: "{days} day",
      daysMany: "{days} days",
      hours: "{value} h"
    },
    empty: {
      noneTitle: "No monitored certificates",
      noFilterTitle: "No certificates for this filter",
      noneHint: "Add a host in the « New host » tab.",
      noFilterHint: "Change the filter to display other certificates.",
      addBtn: "Add a host"
    },
    footer: {
      hostRequired: "Hostname is required",
      hostCountOne: "{count} monitored host",
      hostCountMany: "{count} monitored hosts"
    },
    primary: {
      saving: "Saving…",
      update: "Update",
      addHost: "Add host",
      checking: "Checking…",
      checkAll: "Check all"
    },
    actions: {
      check: "Check",
      checking: "Checking…",
      checkAria: "Check certificate",
      checkingAria: "Check in progress",
      edit: "Edit",
      editAria: "Edit host",
      delete: "Delete",
      deleteAria: "Remove from monitoring"
    },
    toasts: {
      hostnameRequired: "Hostname is required",
      checkAllSuccess: "{count} certificate(s) checked",
      checkAllError: "Error during SSL check",
      hostUpdated: "Host updated",
      hostAdded: "Host added to SSL monitoring",
      saveError: "Unable to save host",
      hostRemoved: "Host removed from monitoring",
      deleteError: "Unable to delete host",
      checkCertSuccess: "Certificate checked · {host}",
      checkCertError: "Error during check"
    }
  },
  de: {
    bcp47: "de-DE",
    eyebrow: "Services · Sicherheit",
    title: "SSL-Zertifikate",
    subtitle: "TLS-Überwachung und Zertifikatsablauf",
    navAria: "SSL-Bereiche",
    sections: {
      overview: {
        label: "Übersicht",
        description: "Zusammenfassung und Aktionen"
      },
      add: {
        label: "Neuer Host",
        description: "Zur Überwachung hinzufügen"
      },
      inventory: {
        label: "Zertifikate",
        description: "TLS-Status pro Host"
      }
    },
    overview: {
      title: "Übersicht",
      description: "TLS-Überwachung überwachter Hosts: Gültigkeit, Aussteller und Ablaufdaten.",
      unknownNoticeOne: "{count} Zertifikat wurde noch nicht geprüft. Starten Sie eine Prüfung, um Ablaufdaten abzurufen.",
      unknownNoticeMany: "{count} Zertifikate wurden noch nicht geprüft. Starten Sie eine Prüfung, um Ablaufdaten abzurufen.",
      heartbeatInfo: "Zertifikate werden beim Öffnen der Kartografie automatisch erneut geprüft, wenn das konfigurierte Intervall überschritten ist (TLS-Heartbeat).",
      addHostBtn: "Host hinzufügen",
      viewCertsBtn: "Zertifikate anzeigen"
    },
    add: {
      titleNew: "Neuer Host",
      titleEdit: "Host bearbeiten",
      descriptionNew: "Fügen Sie einen Hostnamen oder Subdomain zur Überwachung hinzu (Standard-HTTPS-Port: 443).",
      descriptionEdit: "Passen Sie Hostname, Port oder TLS-Prüfintervall an.",
      hostname: "Hostname",
      hostnamePlaceholder: "beispiel.de oder api.beispiel.de",
      port: "TLS-Port",
      interval: "Prüfintervall (Stunden)",
      portIncrease: "Port erhöhen",
      portDecrease: "Port verringern",
      intervalIncrease: "Intervall erhöhen",
      intervalDecrease: "Intervall verringern",
      cancelEdit: "Bearbeitung abbrechen"
    },
    inventory: {
      title: "Überwachte Zertifikate",
      description: "TLS-Status, Aussteller und Ablaufdatum für jeden Host.",
      filteredSuffix: " (gefiltert)",
      countOne: "{count} Zertifikat",
      countMany: "{count} Zertifikate"
    },
    kpi: {
      all: "Gesamt",
      active: "Gültig",
      warning: "Zu überwachen",
      problem: "Probleme"
    },
    filters: {
      all: "Alle",
      active: "Gültig",
      warning: "Zu überwachen",
      expired: "Abgelaufen",
      error: "Fehler",
      unknown: "Ungeprüft"
    },
    status: {
      error: "Fehler",
      unknown: "Ungeprüft",
      unknownInvalid: "Unbekannt",
      expired: "Abgelaufen",
      warning: "Läuft bald ab",
      active: "Gültig"
    },
    meta: {
      issuer: "Aussteller",
      validity: "Gültigkeit",
      daysRemaining: "Verbleibende Tage",
      lastCheck: "Letzte Prüfung",
      nextCheck: "Nächste Prüfung",
      interval: "Intervall",
      technicalDetails: "Technische Details",
      subjectCN: "Betreff (CN)",
      san: "SAN",
      tlsProtocol: "TLS-Protokoll",
      fingerprint: "Fingerabdruck",
      serialNumber: "Seriennr.",
      trustChain: "Vertrauenskette",
      trustValid: "Gültig",
      trustInvalid: "Ungültig"
    },
    interval: {
      daysOne: "{days} Tag",
      daysMany: "{days} Tage",
      hours: "{value} h"
    },
    empty: {
      noneTitle: "Keine überwachten Zertifikate",
      noFilterTitle: "Keine Zertifikate für diesen Filter",
      noneHint: "Fügen Sie einen Host im Tab « Neuer Host » hinzu.",
      noFilterHint: "Ändern Sie den Filter, um andere Zertifikate anzuzeigen.",
      addBtn: "Host hinzufügen"
    },
    footer: {
      hostRequired: "Hostname ist Pflicht",
      hostCountOne: "{count} überwachter Host",
      hostCountMany: "{count} überwachte Hosts"
    },
    primary: {
      saving: "Speichern…",
      update: "Aktualisieren",
      addHost: "Host hinzufügen",
      checking: "Prüfung…",
      checkAll: "Alle prüfen"
    },
    actions: {
      check: "Prüfen",
      checking: "Prüfung…",
      checkAria: "Zertifikat prüfen",
      checkingAria: "Prüfung läuft",
      edit: "Bearbeiten",
      editAria: "Host bearbeiten",
      delete: "Löschen",
      deleteAria: "Aus Überwachung entfernen"
    },
    toasts: {
      hostnameRequired: "Hostname ist Pflicht",
      checkAllSuccess: "{count} Zertifikat(e) geprüft",
      checkAllError: "Fehler bei der SSL-Prüfung",
      hostUpdated: "Host aktualisiert",
      hostAdded: "Host zur SSL-Überwachung hinzugefügt",
      saveError: "Host konnte nicht gespeichert werden",
      hostRemoved: "Host aus Überwachung entfernt",
      deleteError: "Host konnte nicht gelöscht werden",
      checkCertSuccess: "Zertifikat geprüft · {host}",
      checkCertError: "Fehler bei der Prüfung"
    }
  },
  it: {
    bcp47: "it-IT",
    eyebrow: "Servizi · Sicurezza",
    title: "Certificati SSL",
    subtitle: "Monitoraggio TLS e scadenza certificati",
    navAria: "Sezioni SSL",
    sections: {
      overview: {
        label: "Panoramica",
        description: "Sintesi e azioni"
      },
      add: {
        label: "Nuovo host",
        description: "Aggiungi al monitoraggio"
      },
      inventory: {
        label: "Certificati",
        description: "Stato TLS per host"
      }
    },
    overview: {
      title: "Panoramica",
      description: "Monitoraggio TLS degli host sorvegliati: validità, emittente e date di scadenza.",
      unknownNoticeOne: "{count} certificato non è ancora stato verificato. Avvia una verifica per recuperare le date di scadenza.",
      unknownNoticeMany: "{count} certificati non sono ancora stati verificati. Avvia una verifica per recuperare le date di scadenza.",
      heartbeatInfo: "I certificati vengono riverificati automaticamente all'apertura della mappa se l'intervallo configurato è superato (heartbeat TLS).",
      addHostBtn: "Aggiungi host",
      viewCertsBtn: "Vedi certificati"
    },
    add: {
      titleNew: "Nuovo host",
      titleEdit: "Modifica host",
      descriptionNew: "Aggiungi un nome host o sottodominio da monitorare (porta HTTPS predefinita: 443).",
      descriptionEdit: "Modifica nome host, porta o frequenza di verifica TLS.",
      hostname: "Nome host",
      hostnamePlaceholder: "esempio.it o api.esempio.it",
      port: "Porta TLS",
      interval: "Intervallo verif. (ore)",
      portIncrease: "Aumenta la porta",
      portDecrease: "Diminuisci la porta",
      intervalIncrease: "Aumenta l'intervallo",
      intervalDecrease: "Diminuisci l'intervallo",
      cancelEdit: "Annulla modifica"
    },
    inventory: {
      title: "Certificati monitorati",
      description: "Stato TLS, emittente e data di scadenza per ogni host.",
      filteredSuffix: " (filtrato)",
      countOne: "{count} certificato",
      countMany: "{count} certificati"
    },
    kpi: {
      all: "Totale",
      active: "Validi",
      warning: "Da monitorare",
      problem: "Problemi"
    },
    filters: {
      all: "Tutti",
      active: "Validi",
      warning: "Da monitorare",
      expired: "Scaduti",
      error: "Errori",
      unknown: "Non verificati"
    },
    status: {
      error: "Errore",
      unknown: "Non verificato",
      unknownInvalid: "Sconosciuto",
      expired: "Scaduto",
      warning: "In scadenza",
      active: "Valido"
    },
    meta: {
      issuer: "Emittente",
      validity: "Validità",
      daysRemaining: "Giorni rimanenti",
      lastCheck: "Ultima verif.",
      nextCheck: "Prossima verif.",
      interval: "Intervallo",
      technicalDetails: "Dettagli tecnici",
      subjectCN: "Soggetto (CN)",
      san: "SAN",
      tlsProtocol: "Protocollo TLS",
      fingerprint: "Impronta",
      serialNumber: "N. serie",
      trustChain: "Catena di fiducia",
      trustValid: "Valido",
      trustInvalid: "Non valido"
    },
    interval: {
      daysOne: "{days} giorno",
      daysMany: "{days} giorni",
      hours: "{value} h"
    },
    empty: {
      noneTitle: "Nessun certificato monitorato",
      noFilterTitle: "Nessun certificato per questo filtro",
      noneHint: "Aggiungi un host nella scheda « Nuovo host ».",
      noFilterHint: "Modifica il filtro per visualizzare altri certificati.",
      addBtn: "Aggiungi host"
    },
    footer: {
      hostRequired: "Il nome host è obbligatorio",
      hostCountOne: "{count} host monitorato",
      hostCountMany: "{count} host monitorati"
    },
    primary: {
      saving: "Salvataggio…",
      update: "Aggiorna",
      addHost: "Aggiungi host",
      checking: "Verifica…",
      checkAll: "Verifica tutto"
    },
    actions: {
      check: "Verifica",
      checking: "Verifica…",
      checkAria: "Verifica certificato",
      checkingAria: "Verifica in corso",
      edit: "Modifica",
      editAria: "Modifica host",
      delete: "Elimina",
      deleteAria: "Rimuovi dal monitoraggio"
    },
    toasts: {
      hostnameRequired: "Il nome host è obbligatorio",
      checkAllSuccess: "{count} certificato/i verificato/i",
      checkAllError: "Errore durante la verifica SSL",
      hostUpdated: "Host aggiornato",
      hostAdded: "Host aggiunto al monitoraggio SSL",
      saveError: "Impossibile salvare l'host",
      hostRemoved: "Host rimosso dal monitoraggio",
      deleteError: "Impossibile eliminare l'host",
      checkCertSuccess: "Certificato verificato · {host}",
      checkCertError: "Errore durante la verifica"
    }
  },
  es: {
    bcp47: "es-ES",
    eyebrow: "Servicios · Seguridad",
    title: "Certificados SSL",
    subtitle: "Supervisión TLS y vencimiento de certificados",
    navAria: "Secciones SSL",
    sections: {
      overview: {
        label: "Resumen",
        description: "Síntesis y acciones"
      },
      add: {
        label: "Nuevo host",
        description: "Añadir a la supervisión"
      },
      inventory: {
        label: "Certificados",
        description: "Estado TLS por host"
      }
    },
    overview: {
      title: "Resumen",
      description: "Supervisión TLS de hosts monitorizados: validez, emisor y fechas de vencimiento.",
      unknownNoticeOne: "{count} certificado aún no ha sido verificado. Ejecute una verificación para obtener las fechas de vencimiento.",
      unknownNoticeMany: "{count} certificados aún no han sido verificados. Ejecute una verificación para obtener las fechas de vencimiento.",
      heartbeatInfo: "Los certificados se vuelven a verificar automáticamente al abrir la cartografía si se ha superado el intervalo configurado (heartbeat TLS).",
      addHostBtn: "Añadir host",
      viewCertsBtn: "Ver certificados"
    },
    add: {
      titleNew: "Nuevo host",
      titleEdit: "Editar host",
      descriptionNew: "Añada un nombre de host o subdominio a monitorizar (puerto HTTPS predeterminado: 443).",
      descriptionEdit: "Ajuste el nombre de host, el puerto o la frecuencia de verificación TLS.",
      hostname: "Nombre de host",
      hostnamePlaceholder: "ejemplo.es o api.ejemplo.es",
      port: "Puerto TLS",
      interval: "Intervalo de verif. (horas)",
      portIncrease: "Aumentar puerto",
      portDecrease: "Disminuir puerto",
      intervalIncrease: "Aumentar intervalo",
      intervalDecrease: "Disminuir intervalo",
      cancelEdit: "Cancelar edición"
    },
    inventory: {
      title: "Certificados monitorizados",
      description: "Estado TLS, emisor y fecha de vencimiento de cada host.",
      filteredSuffix: " (filtrado)",
      countOne: "{count} certificado",
      countMany: "{count} certificados"
    },
    kpi: {
      all: "Total",
      active: "Válidos",
      warning: "A vigilar",
      problem: "Problemas"
    },
    filters: {
      all: "Todos",
      active: "Válidos",
      warning: "A vigilar",
      expired: "Vencidos",
      error: "Errores",
      unknown: "No verificados"
    },
    status: {
      error: "Error",
      unknown: "No verificado",
      unknownInvalid: "Desconocido",
      expired: "Vencido",
      warning: "Vence pronto",
      active: "Válido"
    },
    meta: {
      issuer: "Emisor",
      validity: "Validez",
      daysRemaining: "Días restantes",
      lastCheck: "Última verif.",
      nextCheck: "Próxima verif.",
      interval: "Intervalo",
      technicalDetails: "Detalles técnicos",
      subjectCN: "Sujeto (CN)",
      san: "SAN",
      tlsProtocol: "Protocolo TLS",
      fingerprint: "Huella",
      serialNumber: "N.º serie",
      trustChain: "Cadena de confianza",
      trustValid: "Válido",
      trustInvalid: "No válido"
    },
    interval: {
      daysOne: "{days} día",
      daysMany: "{days} días",
      hours: "{value} h"
    },
    empty: {
      noneTitle: "Ningún certificado monitorizado",
      noFilterTitle: "Ningún certificado para este filtro",
      noneHint: "Añada un host en la pestaña « Nuevo host ».",
      noFilterHint: "Modifique el filtro para mostrar otros certificados.",
      addBtn: "Añadir host"
    },
    footer: {
      hostRequired: "El nombre de host es obligatorio",
      hostCountOne: "{count} host monitorizado",
      hostCountMany: "{count} hosts monitorizados"
    },
    primary: {
      saving: "Guardando…",
      update: "Actualizar",
      addHost: "Añadir host",
      checking: "Verificando…",
      checkAll: "Verificar todo"
    },
    actions: {
      check: "Verificar",
      checking: "Verificando…",
      checkAria: "Verificar certificado",
      checkingAria: "Verificación en curso",
      edit: "Editar",
      editAria: "Editar host",
      delete: "Eliminar",
      deleteAria: "Quitar de la supervisión"
    },
    toasts: {
      hostnameRequired: "El nombre de host es obligatorio",
      checkAllSuccess: "{count} certificado(s) verificado(s)",
      checkAllError: "Error durante la verificación SSL",
      hostUpdated: "Host actualizado",
      hostAdded: "Host añadido a la supervisión SSL",
      saveError: "No se pudo guardar el host",
      hostRemoved: "Host retirado de la supervisión",
      deleteError: "No se pudo eliminar el host",
      checkCertSuccess: "Certificado verificado · {host}",
      checkCertError: "Error durante la verificación"
    }
  }
};
const KPI_CONFIG = [{
  key: "all",
  filter: "all",
  tone: "blue",
  icon: "mdi:certificate-outline",
  labelKey: "all"
}, {
  key: "active",
  filter: "active",
  tone: "green",
  icon: "mdi:check-circle-outline",
  labelKey: "active"
}, {
  key: "warning",
  filter: "warning",
  tone: "amber",
  icon: "mdi:clock-alert-outline",
  labelKey: "warning"
}, {
  key: "problem",
  filter: "problem",
  tone: "red",
  icon: "mdi:alert-circle-outline",
  labelKey: "problem"
}];
const FILTER_CONFIG = [{
  value: "all",
  labelKey: "all"
}, {
  value: "active",
  labelKey: "active"
}, {
  value: "warning",
  labelKey: "warning"
}, {
  value: "expired",
  labelKey: "expired"
}, {
  value: "error",
  labelKey: "error"
}, {
  value: "unknown",
  labelKey: "unknown"
}];
const NAV_SECTION_IDS = ["overview", "add", "inventory"];
const NAV_ICONS = {
  overview: "mdi:view-dashboard-outline",
  add: "mdi:web-plus",
  inventory: "mdi:certificate-outline"
};
export function getSslModalCopy(locale) {
  const t = pickLocaleMessages(SSL_MODAL_COPY, locale);
  return {
    ...t,
    kpiItems: KPI_CONFIG.map(item => ({
      ...item,
      label: t.kpi[item.labelKey]
    })),
    filterOptions: FILTER_CONFIG.map(item => ({
      value: item.value,
      label: t.filters[item.labelKey]
    })),
    navSections: NAV_SECTION_IDS.map(id => ({
      id,
      icon: NAV_ICONS[id],
      label: t.sections[id].label,
      description: t.sections[id].description
    })),
    formatInventoryCount: count => {
      const template = count > 1 ? t.inventory.countMany : t.inventory.countOne;
      return interpolate(template, {
        count: String(count)
      });
    },
    formatHostCount: count => {
      const template = count > 1 ? t.footer.hostCountMany : t.footer.hostCountOne;
      return interpolate(template, {
        count: String(count)
      });
    },
    formatUnknownNotice: count => {
      const template = count > 1 ? t.overview.unknownNoticeMany : t.overview.unknownNoticeOne;
      return interpolate(template, {
        count: String(count)
      });
    },
    formatIntervalHours: hours => {
      const value = Number(hours) || 24;
      if (value >= 24 && value % 24 === 0) {
        const days = value / 24;
        const template = days > 1 ? t.interval.daysMany : t.interval.daysOne;
        return interpolate(template, {
          days: String(days)
        });
      }
      return interpolate(t.interval.hours, {
        value: String(value)
      });
    },
    statusLabels: t.status
  };
}
