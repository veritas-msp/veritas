import { createLocaleGetter, interpolate } from "../../i18n/translate";
import { getLocalizedNotifEventOptions } from "../Misc/UserProfile/userProfileI18n";
import { IN_APP_EVENT_GROUPS, IN_APP_EVENT_OPTIONS } from "../../utils/inAppNotificationSettings";
const ADMIN_IN_APP_NOTIFICATIONS_COPY = {
  fr: {
    mainCard: {
      title: "Notifications in-app",
      description: "Cloche sidebar et badges sur les commentaires des tickets assignés."
    },
    enable: {
      label: "Activer les notifications in-app",
      hint: "Désactive toutes les alertes agents dans Veritas."
    },
    status: {
      enabled: "Activé",
      disabled: "Désactivé"
    },
    eventsCard: {
      title: "Événements déclencheurs",
      activeCount: "{active}/{total} alertes actives.",
      disabledHint: "Activez les notifications pour configurer les événements."
    },
    groups: {
      activity: {
        title: "Activité",
        description: "Échanges et messages sur les tickets."
      },
      assignment: {
        title: "Assignation",
        description: "Prise en charge et réassignation."
      },
      lifecycle: {
        title: "Cycle de vie",
        description: "Création, évolution et clôture des tickets."
      }
    },
    fields: {
      ticket_commented: {
        notifyAssignees: {
          label: "Assignés",
          hint: "Agents assignés au ticket"
        },
        notifyWatchers: {
          label: "Followers",
          hint: "Agents qui suivent le ticket"
        },
        excludeInternalComments: {
          label: "Ignorer les notes internes",
          hint: "Ne pas alerter pour les réponses privées"
        }
      },
      ticket_created: {
        notifyAssignees: {
          label: "Notifier les assignés",
          hint: "Dès la création du ticket"
        }
      },
      ticket_updated: {
        notifyAssignees: {
          label: "Notifier les assignés",
          hint: "Sur toute modification"
        }
      },
      ticket_resolved: {
        notifyAssignees: {
          label: "Assignés",
          hint: "Agents assignés au ticket"
        },
        notifyWatchers: {
          label: "Followers",
          hint: "Agents qui suivent le ticket"
        }
      },
      ticket_satisfaction: {
        notifyAssignees: {
          label: "Assignés",
          hint: "Agent assigné au ticket"
        },
        notifyWatchers: {
          label: "Followers",
          hint: "Agents qui suivent le ticket"
        }
      }
    },
    footer: {
      hint: "Réglages globaux · test envoyé à votre compte uniquement."
    },
    test: {
      label: "Test",
      ariaLabel: "Type de notification test",
      sending: "Envoi…",
      button: "Tester"
    },
    save: {
      saving: "Enregistrement…",
      button: "Enregistrer"
    },
    toast: {
      saveSuccess: "Paramètres de notifications in-app enregistrés",
      saveError: "Erreur lors de la sauvegarde",
      testSuccess: "Notification test envoyée · ouvrez la cloche dans la sidebar.",
      testError: "Impossible d'envoyer la notification test"
    }
  },
  en: {
    mainCard: {
      title: "In-app notifications",
      description: "Sidebar bell and badges on comments for assigned tickets."
    },
    enable: {
      label: "Enable in-app notifications",
      hint: "Disables all agent alerts in Veritas."
    },
    status: {
      enabled: "Enabled",
      disabled: "Disabled"
    },
    eventsCard: {
      title: "Trigger events",
      activeCount: "{active}/{total} active alerts.",
      disabledHint: "Enable notifications to configure events."
    },
    groups: {
      activity: {
        title: "Activity",
        description: "Exchanges and messages on tickets."
      },
      assignment: {
        title: "Assignment",
        description: "Ownership and reassignment."
      },
      lifecycle: {
        title: "Lifecycle",
        description: "Ticket creation, updates, and closure."
      }
    },
    fields: {
      ticket_commented: {
        notifyAssignees: {
          label: "Assignees",
          hint: "Agents assigned to the ticket"
        },
        notifyWatchers: {
          label: "Followers",
          hint: "Agents following the ticket"
        },
        excludeInternalComments: {
          label: "Ignore internal notes",
          hint: "Do not alert for private replies"
        }
      },
      ticket_created: {
        notifyAssignees: {
          label: "Notify assignees",
          hint: "As soon as the ticket is created"
        }
      },
      ticket_updated: {
        notifyAssignees: {
          label: "Notify assignees",
          hint: "On any update"
        }
      },
      ticket_resolved: {
        notifyAssignees: {
          label: "Assignees",
          hint: "Agents assigned to the ticket"
        },
        notifyWatchers: {
          label: "Followers",
          hint: "Agents following the ticket"
        }
      },
      ticket_satisfaction: {
        notifyAssignees: {
          label: "Assignees",
          hint: "Agent assigned to the ticket"
        },
        notifyWatchers: {
          label: "Followers",
          hint: "Agents following the ticket"
        }
      }
    },
    footer: {
      hint: "Global settings · test sent to your account only."
    },
    test: {
      label: "Test",
      ariaLabel: "Test notification type",
      sending: "Sending…",
      button: "Send test"
    },
    save: {
      saving: "Saving…",
      button: "Save"
    },
    toast: {
      saveSuccess: "In-app notification settings saved",
      saveError: "Error while saving",
      testSuccess: "Test notification sent · open the bell in the sidebar.",
      testError: "Unable to send test notification"
    }
  },
  de: {
    mainCard: {
      title: "In-App-Benachrichtigungen",
      description: "Sidebar-Glocke und Badges bei Kommentaren zu zugewiesenen Tickets."
    },
    enable: {
      label: "In-App-Benachrichtigungen aktivieren",
      hint: "Deaktiviert alle Agenten-Alerts in Veritas."
    },
    status: {
      enabled: "Aktiviert",
      disabled: "Deaktiviert"
    },
    eventsCard: {
      title: "Auslösende Ereignisse",
      activeCount: "{active}/{total} aktive Alerts.",
      disabledHint: "Aktivieren Sie Benachrichtigungen, um Ereignisse zu konfigurieren."
    },
    groups: {
      activity: {
        title: "Aktivität",
        description: "Austausch und Nachrichten zu Tickets."
      },
      assignment: {
        title: "Zuweisung",
        description: "Übernahme und Neuzuweisung."
      },
      lifecycle: {
        title: "Lebenszyklus",
        description: "Erstellung, Änderung und Abschluss von Tickets."
      }
    },
    fields: {
      ticket_commented: {
        notifyAssignees: {
          label: "Zuständige",
          hint: "Dem Ticket zugewiesene Agenten"
        },
        notifyWatchers: {
          label: "Follower",
          hint: "Agenten, die dem Ticket folgen"
        },
        excludeInternalComments: {
          label: "Interne Notizen ignorieren",
          hint: "Keine Alerts für private Antworten"
        }
      },
      ticket_created: {
        notifyAssignees: {
          label: "Zuständige benachrichtigen",
          hint: "Sobald das Ticket erstellt wird"
        }
      },
      ticket_updated: {
        notifyAssignees: {
          label: "Zuständige benachrichtigen",
          hint: "Bei jeder Änderung"
        }
      },
      ticket_resolved: {
        notifyAssignees: {
          label: "Zuständige",
          hint: "Dem Ticket zugewiesene Agenten"
        },
        notifyWatchers: {
          label: "Follower",
          hint: "Agenten, die dem Ticket folgen"
        }
      },
      ticket_satisfaction: {
        notifyAssignees: {
          label: "Zuständige",
          hint: "Dem Ticket zugewiesener Agent"
        },
        notifyWatchers: {
          label: "Follower",
          hint: "Agenten, die dem Ticket folgen"
        }
      }
    },
    footer: {
      hint: "Globale Einstellungen · Test nur an Ihr Konto gesendet."
    },
    test: {
      label: "Test",
      ariaLabel: "Test-Benachrichtigungstyp",
      sending: "Senden…",
      button: "Testen"
    },
    save: {
      saving: "Speichern…",
      button: "Speichern"
    },
    toast: {
      saveSuccess: "In-App-Benachrichtigungseinstellungen gespeichert",
      saveError: "Fehler beim Speichern",
      testSuccess: "Test-Benachrichtigung gesendet · öffnen Sie die Glocke in der Sidebar.",
      testError: "Test-Benachrichtigung konnte nicht gesendet werden"
    }
  },
  it: {
    mainCard: {
      title: "Notifiche in-app",
      description: "Campanella nella sidebar e badge sui commenti dei ticket assegnati."
    },
    enable: {
      label: "Attiva le notifiche in-app",
      hint: "Disattiva tutti gli alert agente in Veritas."
    },
    status: {
      enabled: "Attivo",
      disabled: "Disattivo"
    },
    eventsCard: {
      title: "Eventi di attivazione",
      activeCount: "{active}/{total} alert attivi.",
      disabledHint: "Attiva le notifiche per configurare gli eventi."
    },
    groups: {
      activity: {
        title: "Attività",
        description: "Scambi e messaggi sui ticket."
      },
      assignment: {
        title: "Assegnazione",
        description: "Presa in carico e riassegnazione."
      },
      lifecycle: {
        title: "Ciclo di vita",
        description: "Creazione, evoluzione e chiusura dei ticket."
      }
    },
    fields: {
      ticket_commented: {
        notifyAssignees: {
          label: "Assegnatari",
          hint: "Agenti assegnati al ticket"
        },
        notifyWatchers: {
          label: "Follower",
          hint: "Agenti che seguono il ticket"
        },
        excludeInternalComments: {
          label: "Ignora note interne",
          hint: "Non avvisare per le risposte private"
        }
      },
      ticket_created: {
        notifyAssignees: {
          label: "Avvisa gli assegnatari",
          hint: "Alla creazione del ticket"
        }
      },
      ticket_updated: {
        notifyAssignees: {
          label: "Avvisa gli assegnatari",
          hint: "Su ogni modifica"
        }
      },
      ticket_resolved: {
        notifyAssignees: {
          label: "Assegnatari",
          hint: "Agenti assegnati al ticket"
        },
        notifyWatchers: {
          label: "Follower",
          hint: "Agenti che seguono il ticket"
        }
      },
      ticket_satisfaction: {
        notifyAssignees: {
          label: "Assegnatari",
          hint: "Agente assegnato al ticket"
        },
        notifyWatchers: {
          label: "Follower",
          hint: "Agenti che seguono il ticket"
        }
      }
    },
    footer: {
      hint: "Impostazioni globali · test inviato solo al tuo account."
    },
    test: {
      label: "Test",
      ariaLabel: "Tipo di notifica di test",
      sending: "Invio…",
      button: "Testa"
    },
    save: {
      saving: "Salvataggio…",
      button: "Salva"
    },
    toast: {
      saveSuccess: "Impostazioni notifiche in-app salvate",
      saveError: "Errore durante il salvataggio",
      testSuccess: "Notifica di test inviata · apri la campanella nella sidebar.",
      testError: "Impossibile inviare la notifica di test"
    }
  },
  es: {
    mainCard: {
      title: "Notificaciones in-app",
      description: "Campana en la barra lateral y badges en comentarios de tickets asignados."
    },
    enable: {
      label: "Activar notificaciones in-app",
      hint: "Desactiva todas las alertas de agentes en Veritas."
    },
    status: {
      enabled: "Activado",
      disabled: "Desactivado"
    },
    eventsCard: {
      title: "Eventos desencadenantes",
      activeCount: "{active}/{total} alertas activas.",
      disabledHint: "Active las notificaciones para configurar los eventos."
    },
    groups: {
      activity: {
        title: "Actividad",
        description: "Intercambios y mensajes en los tickets."
      },
      assignment: {
        title: "Asignación",
        description: "Toma a cargo y reasignación."
      },
      lifecycle: {
        title: "Ciclo de vida",
        description: "Creación, evolución y cierre de tickets."
      }
    },
    fields: {
      ticket_commented: {
        notifyAssignees: {
          label: "Asignados",
          hint: "Agentes asignados al ticket"
        },
        notifyWatchers: {
          label: "Seguidores",
          hint: "Agentes que siguen el ticket"
        },
        excludeInternalComments: {
          label: "Ignorar notas internas",
          hint: "No alertar por respuestas privadas"
        }
      },
      ticket_created: {
        notifyAssignees: {
          label: "Notificar asignados",
          hint: "Al crear el ticket"
        }
      },
      ticket_updated: {
        notifyAssignees: {
          label: "Notificar asignados",
          hint: "En cualquier actualización"
        }
      },
      ticket_resolved: {
        notifyAssignees: {
          label: "Asignados",
          hint: "Agentes asignados al ticket"
        },
        notifyWatchers: {
          label: "Seguidores",
          hint: "Agentes que siguen el ticket"
        }
      },
      ticket_satisfaction: {
        notifyAssignees: {
          label: "Asignados",
          hint: "Agente asignado al ticket"
        },
        notifyWatchers: {
          label: "Seguidores",
          hint: "Agentes que siguen el ticket"
        }
      }
    },
    footer: {
      hint: "Ajustes globales · prueba enviada solo a su cuenta."
    },
    test: {
      label: "Prueba",
      ariaLabel: "Tipo de notificación de prueba",
      sending: "Enviando…",
      button: "Probar"
    },
    save: {
      saving: "Guardando…",
      button: "Guardar"
    },
    toast: {
      saveSuccess: "Ajustes de notificaciones in-app guardados",
      saveError: "Error al guardar",
      testSuccess: "Notificación de prueba enviada · abra la campana en la barra lateral.",
      testError: "No se pudo enviar la notificación de prueba"
    }
  }
};
export const getAdminInAppNotificationsCopy = createLocaleGetter(ADMIN_IN_APP_NOTIFICATIONS_COPY);
export function getLocalizedAdminInAppEventOptions(locale) {
  const copy = getAdminInAppNotificationsCopy(locale);
  const baseOptions = getLocalizedNotifEventOptions(locale);
  return baseOptions.map(option => {
    const sourceFields = IN_APP_EVENT_OPTIONS.find(item => item.key === option.key)?.fields || [];
    const fieldCopy = copy.fields[option.key] || {};
    return {
      ...option,
      fields: sourceFields.map(field => ({
        ...field,
        label: fieldCopy[field.key]?.label ?? field.label,
        hint: fieldCopy[field.key]?.hint ?? field.hint
      }))
    };
  });
}
export function getLocalizedInAppEventGroups(locale) {
  const copy = getAdminInAppNotificationsCopy(locale);
  return IN_APP_EVENT_GROUPS.map(group => ({
    ...group,
    title: copy.groups[group.id]?.title ?? group.title,
    description: copy.groups[group.id]?.description ?? group.description
  }));
}
export function getLocalizedInAppTestTypeOptions(locale) {
  return getLocalizedAdminInAppEventOptions(locale).map(option => ({
    value: option.key,
    label: option.label
  }));
}
export function formatInAppActiveEventsDescription(locale, activeCount, total) {
  const copy = getAdminInAppNotificationsCopy(locale);
  return interpolate(copy.eventsCard.activeCount, {
    active: String(activeCount),
    total: String(total)
  });
}
