import { getEquipmentFamilyLabel } from "../../i18n/equipmentFamilyLabels";
import { interpolate, pickLocaleMessages } from "../../i18n/translate";
const SUPERVISION_FAMILY_EQUIPMENT_KEYS = {
  ordinateurs: "Ordinateurs",
  servers: "Serveurs",
  stockage: "Stockage",
  firewall: "Firewalls",
  switch: "Switch",
  wifi: "BorneWifi",
  routeur: "Routeur",
  internet: "Internet",
  toip: "TOIP",
  alimentation: "Alimentation"
};
const CRITERION_KEYS = [
  "monitor_critical",
  "monitor_warning",
  "agent_offline",
  "updates_pending",
  "disk_critical",
  "disk_warn",
  "unmapped",
  "no_data",
  "warranty_expired",
  "warranty_soon",
  "maintenance_expired",
  "maintenance_soon",
  "battery_expired",
  "battery_soon",
  "contract_expired",
  "contract_expiring",
  "contract_suspended",
  "license_expired",
  "license_expiring"
];
const FAMILY_LABEL_OVERRIDES = {
  fr: { contrats: "Contrats" },
  en: { contrats: "Contracts" },
  de: { contrats: "Verträge" },
  it: { contrats: "Contratti" },
  es: { contrats: "Contratos" }
};
const ALERT_RULES_COPY = {
  fr: {
    title: "Règles d'alerte par périphérique",
    subtitle: "Règles communes à tous les utilisateurs. Choisissez, pour chaque type de périphérique, les situations qui remontent dans le centre de supervision et peuvent créer un ticket (si les alertes sont actives sur l'équipement).",
    centreTitle: "Règles du centre de supervision",
    centreSubtitle: "Monitoring (critique, warning, absence de données) et contrats / licences. Appliqués pour ouvrir ou fermer les alertes du centre.",
    readOnly: "Lecture seule · réservé aux administrateurs.",
    resetAll: "Tout réinitialiser",
    save: "Enregistrer",
    saving: "Enregistrement…",
    resetFamily: "Réinitialiser {label}",
    activeCount: "{enabled}/{total} actives",
    familyHint: "{enabled} règle(s) active(s) sur {total}",
    familyNavAria: "Types de périphériques",
    unsavedChanges: "Modifications non enregistrées",
    toggleOn: "Active",
    toggleOff: "Ignorée",
    supportFormLabel: "Formulaire support",
    supportFormNone: "Aucun (création libre)",
    subjectFieldLabel: "Champ objet / sujet",
    descriptionFieldLabel: "Champ description",
    fieldAuto: "Automatique (détection)",
    ticketMappingHint: "À la création depuis le centre de supervision, ce formulaire est forcé et l'objet / la description d'alerte sont injectés dans les champs choisis.",
    toasts: {
      saved: "Règles d'alerte enregistrées",
      saveFailed: "Impossible d'enregistrer les règles"
    },
    criteria: {
      monitor_critical: {
        label: "Critique",
        description: "État critique remonté par CheckMK ou la supervision."
      },
      monitor_warning: {
        label: "Warning",
        description: "Avertissement remonté par CheckMK (ex. Memory, Filesystem…)."
      },
      agent_offline: {
        label: "Agent RMM hors ligne",
        description: "Poste géré par l'agent RMM sans inventaire depuis le seuil défini.",
        parameters: { minutes: "Seuil hors ligne" }
      },
      updates_pending: {
        label: "Mises à jour en attente",
        description: "Mises à jour Windows en attente sur un poste RMM.",
        parameters: { minPending: "Nombre minimum" }
      },
      disk_critical: {
        label: "Disque critique",
        description: "Espace disque critique sur un poste RMM.",
        parameters: { percent: "Seuil critique" }
      },
      disk_warn: {
        label: "Disque à surveiller",
        description: "Espace disque élevé sur un poste RMM.",
        parameters: { percent: "Seuil d'avertissement" }
      },
      unmapped: {
        label: "Non mappé à une supervision",
        description: "Périphérique éligible sans liaison à une intégration de supervision."
      },
      no_data: {
        label: "Sans données supervision",
        description: "Périphérique lié à une intégration de supervision mais sans données récentes."
      },
      warranty_expired: {
        label: "Garantie expirée",
        description: "Date de fin de garantie dépassée."
      },
      warranty_soon: {
        label: "Garantie expire bientôt",
        description: "Fin de garantie dans le nombre de jours configuré.",
        parameters: { days: "Jours avant expiration" }
      },
      maintenance_expired: {
        label: "Licence de maintenance expirée",
        description: "Contrat de maintenance firewall expiré."
      },
      maintenance_soon: {
        label: "Licence de maintenance bientôt expirée",
        description: "Contrat de maintenance firewall à renouveler.",
        parameters: { days: "Jours avant expiration" }
      },
      battery_expired: {
        label: "Batterie à remplacer",
        description: "Onduleur / batterie hors service."
      },
      battery_soon: {
        label: "Batterie à surveiller",
        description: "Date batterie onduleur proche.",
        parameters: { days: "Jours avant expiration" }
      },
      missing_ip: {
        label: "IP non renseignée",
        description: "Adresse IP manquante sur un équipement réseau."
      },
      contract_expired: {
        label: "Contrat MSP expiré",
        description: "La date de fin du contrat MSP de l'entreprise est dépassée."
      },
      contract_expiring: {
        label: "Contrat MSP bientôt expiré",
        description: "Le contrat MSP arrive à échéance dans le nombre de jours configuré.",
        parameters: { days: "Jours avant expiration" }
      },
      contract_suspended: {
        label: "Contrat MSP suspendu",
        description: "Le contrat MSP de l'entreprise est marqué comme suspendu."
      },
      license_expired: {
        label: "Licence / module expiré",
        description: "Une licence ou un module client (antivirus, domaine, SSL…) est expiré."
      },
      license_expiring: {
        label: "Licence / module bientôt expiré",
        description: "Une licence ou un module client arrive à échéance dans le nombre de jours configuré.",
        parameters: { days: "Jours avant expiration" }
      }
    }
  },
  en: {
    title: "Alert rules by device type",
    subtitle: "Shared rules for every user. For each device type, choose which situations appear in the supervision center and may create a ticket (when alerts are enabled on the device).",
    centreTitle: "Supervision center rules",
    centreSubtitle: "Monitoring (critical, warning, no data) and contracts / licenses. Applied to open or close center alerts.",
    readOnly: "Read-only · administrators only.",
    resetAll: "Reset all",
    save: "Save",
    saving: "Saving…",
    resetFamily: "Reset {label}",
    activeCount: "{enabled}/{total} active",
    familyHint: "{enabled} active rule(s) out of {total}",
    familyNavAria: "Device types",
    unsavedChanges: "Unsaved changes",
    toggleOn: "On",
    toggleOff: "Off",
    supportFormLabel: "Support form",
    supportFormNone: "None (free create)",
    subjectFieldLabel: "Subject field",
    descriptionFieldLabel: "Description field",
    fieldAuto: "Automatic (detect)",
    ticketMappingHint: "When creating a ticket from the supervision center, this form is forced and the alert subject/description are injected into the selected fields.",
    toasts: {
      saved: "Alert rules saved",
      saveFailed: "Unable to save rules"
    },
    criteria: {
      monitor_critical: {
        label: "Critical",
        description: "Critical state reported by CheckMK or supervision."
      },
      monitor_warning: {
        label: "Warning",
        description: "Warning reported by CheckMK (e.g. Memory, Filesystem)."
      },
      agent_offline: {
        label: "RMM agent offline",
        description: "Workstation managed by the RMM agent with no inventory since the configured threshold.",
        parameters: { minutes: "Offline threshold" }
      },
      updates_pending: {
        label: "Pending updates",
        description: "Pending Windows updates on an RMM-managed workstation.",
        parameters: { minPending: "Minimum count" }
      },
      disk_critical: {
        label: "Critical disk",
        description: "Critical disk space on an RMM-managed workstation.",
        parameters: { percent: "Critical threshold" }
      },
      disk_warn: {
        label: "Disk warning",
        description: "High disk usage on an RMM-managed workstation.",
        parameters: { percent: "Warning threshold" }
      },
      unmapped: {
        label: "Not mapped to supervision",
        description: "Eligible device with no link to a supervision integration."
      },
      no_data: {
        label: "No supervision data",
        description: "Device linked to a supervision integration but with no recent data."
      },
      warranty_expired: {
        label: "Warranty expired",
        description: "Manufacturer warranty end date has passed."
      },
      warranty_soon: {
        label: "Warranty expiring soon",
        description: "Warranty ends within the coming months."
      },
      maintenance_expired: {
        label: "Maintenance license expired",
        description: "Firewall maintenance contract has expired."
      },
      maintenance_soon: {
        label: "Maintenance license soon",
        description: "Firewall maintenance contract due for renewal."
      },
      battery_expired: {
        label: "Battery to replace",
        description: "UPS / battery out of service."
      },
      battery_soon: {
        label: "Battery to monitor",
        description: "UPS battery date approaching."
      },
      missing_ip: {
        label: "IP not set",
        description: "Missing IP address on a network device."
      },
      contract_expired: {
        label: "MSP contract expired",
        description: "The company MSP contract end date has passed."
      },
      contract_expiring: {
        label: "MSP contract expiring soon",
        description: "The MSP contract ends within the configured number of days.",
        parameters: { days: "Days before expiration" }
      },
      contract_suspended: {
        label: "MSP contract suspended",
        description: "The company MSP contract is marked as suspended."
      },
      license_expired: {
        label: "License / module expired",
        description: "A client license or module (antivirus, domain, SSL, etc.) has expired."
      },
      license_expiring: {
        label: "License / module expiring soon",
        description: "A client license or module ends within the configured number of days.",
        parameters: { days: "Days before expiration" }
      }
    }
  },
  de: {
    title: "Alarmregeln",
    subtitle: "Wählen Sie, welche Situationen im Überwachungszentrum erscheinen und automatische Tickets erzeugen können (wenn Alarme am Gerät aktiviert sind).",
    readOnly: "Nur Lesen · nur für Administratoren.",
    resetAll: "Alles zurücksetzen",
    save: "Speichern",
    saving: "Speichern…",
    resetFamily: "{label} zurücksetzen",
    activeCount: "{enabled}/{total} aktiv",
    toggleOn: "Alarm aktiv",
    toggleOff: "Ignoriert",
    supportFormLabel: "Support-Formular",
    supportFormNone: "Keines (freie Erstellung)",
    subjectFieldLabel: "Betreff-Feld",
    descriptionFieldLabel: "Beschreibungs-Feld",
    fieldAuto: "Automatisch",
    ticketMappingHint: "Bei Ticket-Erstellung aus dem Supervision-Center wird dieses Formular erzwungen.",
    toasts: {
      saved: "Alarmregeln gespeichert",
      saveFailed: "Regeln konnten nicht gespeichert werden"
    },
    criteria: {
      monitor_critical: {
        label: "Kritischer Alarm (Überwachung)",
        description: "Kritischer Zustand von CheckMK oder der Überwachung gemeldet."
      },
      monitor_warning: {
        label: "Überwachungswarnung",
        description: "Warnung von CheckMK oder der Überwachung gemeldet."
      },
      agent_offline: {
        label: "RMM-Agent offline (+48 h)",
        description: "Vom RMM-Agent verwalteter Arbeitsplatz ohne Inventar seit über 48 Stunden."
      },
      updates_pending: {
        label: "Veraltete Updates",
        description: "Ausstehende Windows-Updates auf einem RMM-Arbeitsplatz."
      },
      disk_critical: {
        label: "Kritischer Speicher (≥ 90 %)",
        description: "Kritischer Speicherplatz auf einem RMM-Arbeitsplatz."
      },
      disk_warn: {
        label: "Speicher überwachen (≥ 80 %)",
        description: "Hohe Speichernutzung auf einem RMM-Arbeitsplatz."
      },
      unmapped: {
        label: "Nicht einer Supervision zugeordnet",
        description: "Geeignetes Gerät ohne Verknüpfung zu einer Supervisions-Integration."
      },
      no_data: {
        label: "Keine Überwachungsdaten",
        description: "Gerät mit Supervisions-Integration, aber ohne aktuelle Daten."
      },
      warranty_expired: {
        label: "Garantie abgelaufen",
        description: "Enddatum der Herstellergarantie überschritten."
      },
      warranty_soon: {
        label: "Garantie läuft bald ab",
        description: "Garantie endet in den nächsten Monaten."
      },
      maintenance_expired: {
        label: "Wartungslizenz abgelaufen",
        description: "Firewall-Wartungsvertrag abgelaufen."
      },
      maintenance_soon: {
        label: "Wartungslizenz bald fällig",
        description: "Firewall-Wartungsvertrag muss erneuert werden."
      },
      battery_expired: {
        label: "Batterie ersetzen",
        description: "USV / Batterie außer Betrieb."
      },
      battery_soon: {
        label: "Batterie überwachen",
        description: "USV-Batteriedatum naht."
      },
      missing_ip: {
        label: "IP nicht angegeben",
        description: "Fehlende IP-Adresse auf einem Netzwerkgerät."
      }
    }
  },
  it: {
    title: "Regole di alert",
    subtitle: "Scegli quali situazioni compaiono nel centro di supervisione e possono generare ticket automatici (se gli alert sono attivi sul dispositivo).",
    readOnly: "Sola lettura · riservato agli amministratori.",
    resetAll: "Reimposta tutto",
    save: "Salva",
    saving: "Salvataggio…",
    resetFamily: "Reimposta {label}",
    activeCount: "{enabled}/{total} attive",
    toggleOn: "Alert attivo",
    toggleOff: "Ignorato",
    supportFormLabel: "Modulo support",
    supportFormNone: "Nessuno (creazione libera)",
    subjectFieldLabel: "Campo oggetto",
    descriptionFieldLabel: "Campo descrizione",
    fieldAuto: "Automatico",
    ticketMappingHint: "Alla creazione dal centro di supervisione, questo modulo è forzato.",
    toasts: {
      saved: "Regole di alert salvate",
      saveFailed: "Impossibile salvare le regole"
    },
    criteria: {
      monitor_critical: {
        label: "Alert critico (supervisione)",
        description: "Stato critico segnalato da CheckMK o dalla supervisione."
      },
      monitor_warning: {
        label: "Warning supervisione",
        description: "Avviso segnalato da CheckMK o dalla supervisione."
      },
      agent_offline: {
        label: "Agente RMM offline (+48 h)",
        description: "Postazione gestita dall'agente RMM senza inventario da oltre 48 ore."
      },
      updates_pending: {
        label: "Aggiornamenti obsoleti",
        description: "Aggiornamenti Windows in attesa su una postazione RMM."
      },
      disk_critical: {
        label: "Disco critico (≥ 90 %)",
        description: "Spazio disco critico su una postazione RMM."
      },
      disk_warn: {
        label: "Disco da monitorare (≥ 80 %)",
        description: "Spazio disco elevato su una postazione RMM."
      },
      unmapped: {
        label: "Non mappato a una supervisione",
        description: "Dispositivo idoneo senza collegamento a un'integrazione di supervisione."
      },
      no_data: {
        label: "Senza dati di supervisione",
        description: "Dispositivo collegato a un'integrazione di supervisione ma senza dati recenti."
      },
      warranty_expired: {
        label: "Garanzia scaduta",
        description: "Data di fine garanzia superata."
      },
      warranty_soon: {
        label: "Garanzia in scadenza",
        description: "Fine garanzia nei prossimi mesi."
      },
      maintenance_expired: {
        label: "Licenza manutenzione scaduta",
        description: "Contratto di manutenzione firewall scaduto."
      },
      maintenance_soon: {
        label: "Licenza manutenzione imminente",
        description: "Contratto di manutenzione firewall da rinnovare."
      },
      battery_expired: {
        label: "Batteria da sostituire",
        description: "UPS / batteria fuori servizio."
      },
      battery_soon: {
        label: "Batteria da monitorare",
        description: "Data batteria UPS imminente."
      },
      missing_ip: {
        label: "IP non indicato",
        description: "Indirizzo IP mancante su un dispositivo di rete."
      }
    }
  },
  es: {
    title: "Reglas de alerta",
    subtitle: "Elija qué situaciones aparecen en el centro de supervisión y pueden generar tickets automáticos (si las alertas están activadas en el dispositivo).",
    readOnly: "Solo lectura · reservado a administradores.",
    resetAll: "Restablecer todo",
    save: "Guardar",
    saving: "Guardando…",
    resetFamily: "Restablecer {label}",
    activeCount: "{enabled}/{total} activas",
    toggleOn: "Alerta activa",
    toggleOff: "Ignorada",
    supportFormLabel: "Formulario de soporte",
    supportFormNone: "Ninguno (creación libre)",
    subjectFieldLabel: "Campo asunto",
    descriptionFieldLabel: "Campo descripción",
    fieldAuto: "Automático",
    ticketMappingHint: "Al crear desde el centro de supervisión, este formulario se fuerza.",
    toasts: {
      saved: "Reglas de alerta guardadas",
      saveFailed: "No se pudieron guardar las reglas"
    },
    criteria: {
      monitor_critical: {
        label: "Alerta crítica (supervisión)",
        description: "Estado crítico reportado por CheckMK o la supervisión."
      },
      monitor_warning: {
        label: "Warning de supervisión",
        description: "Advertencia reportada por CheckMK o la supervisión."
      },
      agent_offline: {
        label: "Agente RMM sin conexión (+48 h)",
        description: "Equipo gestionado por el agente RMM sin inventario desde hace más de 48 horas."
      },
      updates_pending: {
        label: "Actualizaciones obsoletas",
        description: "Actualizaciones de Windows pendientes en un equipo RMM."
      },
      disk_critical: {
        label: "Disco crítico (≥ 90 %)",
        description: "Espacio en disco crítico en un equipo RMM."
      },
      disk_warn: {
        label: "Disco a vigilar (≥ 80 %)",
        description: "Espacio en disco elevado en un equipo RMM."
      },
      unmapped: {
        label: "Sin mapear a una supervisión",
        description: "Dispositivo elegible sin vínculo a una integración de supervisión."
      },
      no_data: {
        label: "Sin datos de supervisión",
        description: "Dispositivo vinculado a una integración de supervisión pero sin datos recientes."
      },
      warranty_expired: {
        label: "Garantía caducada",
        description: "Fecha de fin de garantía superada."
      },
      warranty_soon: {
        label: "Garantía por caducar",
        description: "Fin de garantía en los próximos meses."
      },
      maintenance_expired: {
        label: "Licencia de mantenimiento caducada",
        description: "Contrato de mantenimiento de firewall caducado."
      },
      maintenance_soon: {
        label: "Licencia de mantenimiento próxima",
        description: "Contrato de mantenimiento de firewall por renovar."
      },
      battery_expired: {
        label: "Batería a reemplazar",
        description: "SAI / batería fuera de servicio."
      },
      battery_soon: {
        label: "Batería a vigilar",
        description: "Fecha de batería del SAI próxima."
      },
      missing_ip: {
        label: "IP no indicada",
        description: "Dirección IP faltante en un equipo de red."
      }
    }
  }
};
export function getSupervisionAlertRulesCopy(locale) {
  const t = pickLocaleMessages(ALERT_RULES_COPY, locale);
  return {
    ...t,
    familyNavAria: t.familyNavAria || "Device types",
    unsavedChanges: t.unsavedChanges || "Unsaved changes",
    getFamilyLabel: (familyKey, fallback) => {
      const override =
        FAMILY_LABEL_OVERRIDES[String(locale || "").slice(0, 2)]?.[familyKey] ||
        FAMILY_LABEL_OVERRIDES.fr?.[familyKey];
      if (override) return override;
      const equipmentKey = SUPERVISION_FAMILY_EQUIPMENT_KEYS[familyKey];
      return equipmentKey ? getEquipmentFamilyLabel(equipmentKey, locale, fallback) : fallback || familyKey;
    },
    getCriterionLabel: (key, fallback) => {
      if (CRITERION_KEYS.includes(key) && t.criteria[key]?.label) {
        return t.criteria[key].label;
      }
      return fallback || key;
    },
    getCriterionDescription: (key, fallback) => {
      if (CRITERION_KEYS.includes(key) && t.criteria[key]?.description) {
        return t.criteria[key].description;
      }
      return fallback || "";
    },
    getParameterLabel: (criterionKey, paramKey, fallback) => {
      const fromCopy = t.criteria?.[criterionKey]?.parameters?.[paramKey];
      return fromCopy || fallback || paramKey;
    },
    formatActiveCount: (enabled, total) => interpolate(t.activeCount, {
      enabled: String(enabled),
      total: String(total)
    }),
    formatFamilyHint: (enabled, total) => interpolate(t.familyHint || t.activeCount, {
      enabled: String(enabled),
      total: String(total)
    }),
    formatResetFamily: label => interpolate(t.resetFamily, {
      label
    })
  };
}
