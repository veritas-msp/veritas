import { createLocaleGetter } from "../../i18n/translate";
const ENTERPRISE_CONFIG_MODALS = {
  fr: {
    confirm: {
      deleteConfiguration: {
        title: "Supprimer la configuration",
        message: "La configuration « {label} » sera définitivement supprimée pour ce client."
      },
      removeMonitoring: {
        title: "Retirer de la surveillance",
        message: "Le domaine « {label} » ne sera plus surveillé pour ce client."
      },
      removeMonitoringReversible: {
        message: "Le domaine « {label} » ne sera plus surveillé pour ce client. Cette action est réversible en le réimportant."
      },
      removeSslMonitoring: {
        title: "Retirer de la surveillance ?",
        message: "Voulez-vous vraiment retirer « {host} » de la surveillance SSL ? Cette action est irréversible."
      },
      deleteEntry: {
        title: "Supprimer cette entrée ?",
        message: "Voulez-vous vraiment supprimer « {label} » ? Cette action est irréversible."
      },
      deleteMicrosoftTenant: {
        title: "Supprimer le tenant Microsoft",
        message: "Le tenant « {label} » sera définitivement supprimé pour ce client. Les statistiques associées ne seront plus accessibles."
      },
      deleteSolutionFallback: {
        message: "Supprimer « {label} » ?"
      },
      deleteCustomEquipment: {
        message: "Supprimer « {name} » ?",
        fallbackName: "cet équipement"
      },
      deleteMicrosoftTenantFromList: {
        message: "Supprimer le tenant Microsoft de {client} ? Les identifiants Azure seront supprimés et le client n'apparaîtra plus dans la liste des tenants.",
        fallbackClient: "ce client"
      }
    },
    enterpriseDelete: {
      title: "Supprimer l'entreprise",
      subtitle: "Cette action est définitive et ne peut pas être annulée.",
      consequencesTitle: "Conséquences",
      bullet1: "La fiche client et ses informations seront supprimées.",
      bullet2: "Les données associées pourront être perdues selon la politique de rétention.",
      bullet3: "Cette opération ne pourra pas être restaurée depuis Veritas.",
      defaultClientName: "cette entreprise",
      closeAria: "Fermer"
    }
  },
  en: {
    confirm: {
      deleteConfiguration: {
        title: "Delete configuration",
        message: "Configuration « {label} » will be permanently removed for this client."
      },
      removeMonitoring: {
        title: "Remove from monitoring",
        message: "Domain « {label} » will no longer be monitored for this client."
      },
      removeMonitoringReversible: {
        message: "Domain « {label} » will no longer be monitored for this client. You can add it again later."
      },
      removeSslMonitoring: {
        title: "Remove from monitoring?",
        message: "Do you really want to remove « {host} » from SSL monitoring? This action is irreversible."
      },
      deleteEntry: {
        title: "Delete this entry?",
        message: "Do you really want to delete « {label} »? This action is irreversible."
      },
      deleteMicrosoftTenant: {
        title: "Delete Microsoft tenant",
        message: "Tenant « {label} » will be permanently removed for this client. Associated statistics will no longer be available."
      },
      deleteSolutionFallback: {
        message: "Delete « {label} »?"
      },
      deleteCustomEquipment: {
        message: "Delete « {name} »?",
        fallbackName: "this equipment"
      },
      deleteMicrosoftTenantFromList: {
        message: "Delete the Microsoft tenant for {client}? Azure credentials will be removed and the client will no longer appear in the tenant list.",
        fallbackClient: "this client"
      }
    },
    enterpriseDelete: {
      title: "Delete company",
      subtitle: "This action is permanent and cannot be undone.",
      consequencesTitle: "Consequences",
      bullet1: "The client record and its information will be deleted.",
      bullet2: "Associated data may be lost depending on the retention policy.",
      bullet3: "This operation cannot be restored from Veritas.",
      defaultClientName: "this company",
      closeAria: "Close"
    }
  },
  de: {
    confirm: {
      deleteConfiguration: {
        title: "Konfiguration löschen",
        message: "Die Konfiguration « {label} » wird für diesen Kunden endgültig entfernt."
      },
      removeMonitoring: {
        title: "Aus Überwachung entfernen",
        message: "Die Domain « {label} » wird für diesen Kunden nicht mehr überwacht."
      },
      removeMonitoringReversible: {
        message: "Die Domain « {label} » wird nicht mehr überwacht. Sie kann später erneut importiert werden."
      },
      removeSslMonitoring: {
        title: "Aus Überwachung entfernen?",
        message: "« {host} » wirklich aus der SSL-Überwachung entfernen? Diese Aktion ist endgültig."
      },
      deleteEntry: {
        title: "Diesen Eintrag löschen?",
        message: "« {label} » wirklich löschen? Diese Aktion ist endgültig."
      },
      deleteMicrosoftTenant: {
        title: "Microsoft-Tenant löschen",
        message: "Der Tenant « {label} » wird für diesen Kunden endgültig entfernt. Zugehörige Statistiken sind danach nicht mehr verfügbar."
      },
      deleteSolutionFallback: {
        message: "« {label} » löschen?"
      },
      deleteCustomEquipment: {
        message: "« {name} » löschen?",
        fallbackName: "dieses Gerät"
      },
      deleteMicrosoftTenantFromList: {
        message: "Microsoft-Tenant von {client} löschen? Azure-Anmeldedaten werden entfernt und der Kunde erscheint nicht mehr in der Tenant-Liste.",
        fallbackClient: "dieser Kunde"
      }
    },
    enterpriseDelete: {
      title: "Unternehmen löschen",
      subtitle: "Diese Aktion ist endgültig und kann nicht rückgängig gemacht werden.",
      consequencesTitle: "Folgen",
      bullet1: "Die Kundenakte und ihre Informationen werden gelöscht.",
      bullet2: "Zugehörige Daten können je nach Aufbewahrungsrichtlinie verloren gehen.",
      bullet3: "Dieser Vorgang kann in Veritas nicht wiederhergestellt werden.",
      defaultClientName: "dieses Unternehmen",
      closeAria: "Schließen"
    }
  },
  it: {
    confirm: {
      deleteConfiguration: {
        title: "Elimina configurazione",
        message: "La configurazione « {label} » sarà rimossa definitivamente per questo cliente."
      },
      removeMonitoring: {
        title: "Rimuovi dal monitoraggio",
        message: "Il dominio « {label} » non sarà più monitorato per questo cliente."
      },
      removeMonitoringReversible: {
        message: "Il dominio « {label} » non sarà più monitorato. Potrà essere reimportato in seguito."
      },
      removeSslMonitoring: {
        title: "Rimuovere dal monitoraggio?",
        message: "Rimuovere « {host} » dal monitoraggio SSL? Azione irreversibile."
      },
      deleteEntry: {
        title: "Eliminare questa voce?",
        message: "Eliminare « {label} »? Azione irreversibile."
      },
      deleteMicrosoftTenant: {
        title: "Elimina tenant Microsoft",
        message: "Il tenant « {label} » sarà rimosso definitivamente. Le statistiche associate non saranno più disponibili."
      },
      deleteSolutionFallback: {
        message: "Eliminare « {label} »?"
      },
      deleteCustomEquipment: {
        message: "Eliminare « {name} »?",
        fallbackName: "questa attrezzatura"
      },
      deleteMicrosoftTenantFromList: {
        message: "Eliminare il tenant Microsoft di {client}? Le credenziali Azure saranno rimosse e il cliente non comparirà più nell'elenco tenant.",
        fallbackClient: "questo cliente"
      }
    },
    enterpriseDelete: {
      title: "Elimina azienda",
      subtitle: "Azione definitiva e irreversibile.",
      consequencesTitle: "Conseguenze",
      bullet1: "La scheda cliente e le sue informazioni saranno eliminate.",
      bullet2: "I dati associati potrebbero andare persi in base alla policy di conservazione.",
      bullet3: "Questa operazione non potrà essere ripristinata da Veritas.",
      defaultClientName: "questa azienda",
      closeAria: "Chiudi"
    }
  },
  es: {
    confirm: {
      deleteConfiguration: {
        title: "Eliminar configuración",
        message: "La configuración « {label} » se eliminará permanentemente para este cliente."
      },
      removeMonitoring: {
        title: "Quitar de la supervisión",
        message: "El dominio « {label} » dejará de supervisarse para este cliente."
      },
      removeMonitoringReversible: {
        message: "El dominio « {label} » dejará de supervisarse. Podrá volver a importarse más tarde."
      },
      removeSslMonitoring: {
        title: "¿Quitar de la supervisión?",
        message: "¿Quitar « {host} » de la supervisión SSL? Acción irreversible."
      },
      deleteEntry: {
        title: "¿Eliminar esta entrada?",
        message: "¿Eliminar « {label} »? Acción irreversible."
      },
      deleteMicrosoftTenant: {
        title: "Eliminar tenant Microsoft",
        message: "El tenant « {label} » se eliminará permanentemente. Las estadísticas asociadas dejarán de estar disponibles."
      },
      deleteSolutionFallback: {
        message: "¿Eliminar « {label} »?"
      },
      deleteCustomEquipment: {
        message: "¿Eliminar « {name} »?",
        fallbackName: "este equipo"
      },
      deleteMicrosoftTenantFromList: {
        message: "¿Eliminar el tenant Microsoft de {client}? Se eliminarán las credenciales de Azure y el cliente ya no aparecerá en la lista de tenants.",
        fallbackClient: "este cliente"
      }
    },
    enterpriseDelete: {
      title: "Eliminar empresa",
      subtitle: "Acción definitiva e irreversible.",
      consequencesTitle: "Consecuencias",
      bullet1: "La ficha de cliente y su información serán eliminadas.",
      bullet2: "Los datos asociados pueden perderse según la política de retención.",
      bullet3: "Esta operación no podrá restaurarse desde Veritas.",
      defaultClientName: "esta empresa",
      closeAria: "Cerrar"
    }
  }
};
export const getEnterpriseConfigModalsCopy = createLocaleGetter(ENTERPRISE_CONFIG_MODALS);
