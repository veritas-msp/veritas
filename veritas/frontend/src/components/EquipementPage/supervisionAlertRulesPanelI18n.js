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
const CRITERION_KEYS = ["monitor_critical", "monitor_warning", "agent_offline", "updates_pending", "disk_critical", "disk_warn", "unmapped", "no_data", "warranty_expired", "warranty_soon", "maintenance_expired", "maintenance_soon", "battery_expired", "battery_soon", "missing_ip"];
const ALERT_RULES_COPY = {
  fr: {
    title: "Règles d'alerte",
    subtitle: "Choisissez les situations qui remontent dans le centre de supervision et peuvent générer des tickets automatiques (si les alertes sont activées sur le périphérique).",
    readOnly: "Lecture seule · réservé aux administrateurs.",
    resetAll: "Réinitialiser tout",
    save: "Enregistrer",
    saving: "Enregistrement…",
    resetFamily: "Réinitialiser {label}",
    activeCount: "{enabled}/{total} actives",
    toggleOn: "Alerte active",
    toggleOff: "Ignorée",
    toasts: {
      saved: "Règles d'alerte enregistrées",
      saveFailed: "Impossible d'enregistrer les règles"
    },
    criteria: {
      monitor_critical: {
        label: "Alerte critique (supervision)",
        description: "État critique remonté par CheckMK ou la supervision."
      },
      monitor_warning: {
        label: "Warning supervision",
        description: "Avertissement remonté par CheckMK ou la supervision."
      },
      agent_offline: {
        label: "Agent RMM hors ligne (+48 h)",
        description: "Poste géré par l'agent RMM sans inventaire depuis plus de 48 heures."
      },
      updates_pending: {
        label: "Mises à jour obsolètes",
        description: "Mises à jour Windows en attente sur un poste RMM."
      },
      disk_critical: {
        label: "Disque critique (≥ 90 %)",
        description: "Espace disque critique sur un poste RMM."
      },
      disk_warn: {
        label: "Disque à surveiller (≥ 80 %)",
        description: "Espace disque élevé sur un poste RMM."
      },
      unmapped: {
        label: "Non mappé CheckMK",
        description: "Périphérique éligible à CheckMK sans mapping configuré."
      },
      no_data: {
        label: "Sans données supervision",
        description: "Périphérique mappé CheckMK mais sans données récentes."
      },
      warranty_expired: {
        label: "Garantie expirée",
        description: "Date de fin de garantie dépassée."
      },
      warranty_soon: {
        label: "Garantie expire bientôt",
        description: "Fin de garantie dans les prochains mois."
      },
      maintenance_expired: {
        label: "Licence maintenance expirée",
        description: "Contrat de maintenance firewall expiré."
      },
      maintenance_soon: {
        label: "Licence maintenance bientôt",
        description: "Contrat de maintenance firewall à renouveler."
      },
      battery_expired: {
        label: "Batterie à remplacer",
        description: "Onduleur / batterie hors service."
      },
      battery_soon: {
        label: "Batterie à surveiller",
        description: "Date batterie onduleur proche."
      },
      missing_ip: {
        label: "IP non renseignée",
        description: "Adresse IP manquante sur un équipement réseau."
      }
    }
  },
  en: {
    title: "Alert rules",
    subtitle: "Choose which situations appear in the supervision center and may generate automatic tickets (when alerts are enabled on the device).",
    readOnly: "Read-only · administrators only.",
    resetAll: "Reset all",
    save: "Save",
    saving: "Saving…",
    resetFamily: "Reset {label}",
    activeCount: "{enabled}/{total} active",
    toggleOn: "Alert enabled",
    toggleOff: "Ignored",
    toasts: {
      saved: "Alert rules saved",
      saveFailed: "Unable to save rules"
    },
    criteria: {
      monitor_critical: {
        label: "Critical alert (supervision)",
        description: "Critical state reported by CheckMK or supervision."
      },
      monitor_warning: {
        label: "Monitoring warning",
        description: "Warning reported by CheckMK or supervision."
      },
      agent_offline: {
        label: "RMM agent offline (+48 h)",
        description: "Workstation managed by the RMM agent with no inventory for more than 48 hours."
      },
      updates_pending: {
        label: "Outdated updates",
        description: "Pending Windows updates on an RMM-managed workstation."
      },
      disk_critical: {
        label: "Critical disk (≥ 90%)",
        description: "Critical disk space on an RMM-managed workstation."
      },
      disk_warn: {
        label: "Disk to monitor (≥ 80%)",
        description: "High disk usage on an RMM-managed workstation."
      },
      unmapped: {
        label: "Not mapped to CheckMK",
        description: "CheckMK-eligible device without configured mapping."
      },
      no_data: {
        label: "No supervision data",
        description: "Device mapped to CheckMK but with no recent data."
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
        label: "CheckMK nicht zugeordnet",
        description: "CheckMK-fähiges Gerät ohne konfiguriertes Mapping."
      },
      no_data: {
        label: "Keine Überwachungsdaten",
        description: "CheckMK-zugeordnetes Gerät ohne aktuelle Daten."
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
        label: "Non mappato CheckMK",
        description: "Dispositivo idoneo a CheckMK senza mapping configurato."
      },
      no_data: {
        label: "Senza dati di supervisione",
        description: "Dispositivo mappato CheckMK ma senza dati recenti."
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
        label: "Sin mapear en CheckMK",
        description: "Dispositivo elegible para CheckMK sin mapping configurado."
      },
      no_data: {
        label: "Sin datos de supervisión",
        description: "Dispositivo mapeado en CheckMK pero sin datos recientes."
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
    getFamilyLabel: (familyKey, fallback) => {
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
    formatActiveCount: (enabled, total) => interpolate(t.activeCount, {
      enabled: String(enabled),
      total: String(total)
    }),
    formatResetFamily: label => interpolate(t.resetFamily, {
      label
    })
  };
}
