import { createLocaleGetter } from "../../i18n/translate";
import { getFormModalsRoot } from "./adminFormModalsI18n";
const ADMIN_MODALS = {
  fr: {
    collectorDelete: {
      title: "Supprimer le collecteur",
      bullets: ["La connexion IMAP/POP3 et sa configuration seront supprimées.", "Les emails ne seront plus récupérés automatiquement depuis cette boîte.", "L'historique des logs associé sera perdu."]
    },
    portalDelete: {
      title: "Supprimer l'accès portail",
      subtitle: "Le compte de connexion sera définitivement retiré.",
      deleteAccess: "Supprimer l'accès",
      bullets: ["L'identifiant de connexion au portail client sera supprimé.", "Le contact et la fiche entreprise dans Veritas seront conservés.", "La personne ne pourra plus se connecter tant qu'un nouvel accès n'aura pas été créé."]
    },
    ingestionRuleDelete: {
      title: "Supprimer la règle",
      bullets: ["La règle et ses critères seront retirés du tri des emails entrants.", "L'ordre d'évaluation des autres règles sera conservé.", "Cette opération ne pourra pas être restaurée depuis Veritas."]
    },
    rmmToken: {
      revokeTitle: "Mettre ce token à la corbeille ?",
      revokeMessage: "Le token sera révoqué : les nouvelles installations seront refusées. Vous pourrez le restaurer depuis la corbeille.",
      revokeConfirm: "Mettre à la corbeille",
      restoreTitle: "Restaurer ce token ?",
      restoreMessage: "Le token redeviendra actif et pourra à nouveau servir à l'enrôlement des agents.",
      restoreConfirm: "Restaurer",
      purgeTitle: "Supprimer définitivement ce token ?",
      purgeMessage: "Cette action est irréversible. Le token sera effacé de la base de données.",
      purgeConfirm: "Supprimer définitivement"
    },
    adminDeleteConfirms: {
      untitled: "sans nom",
      catalogEntryFallback: "cette entrée",
      notebookFallback: "Carnet",
      enterpriseNumber: "Entreprise #{id}",
      irreversible: "Cette action est irréversible.",
      scheduledAlertTitle: "Supprimer la règle CRON",
      scheduledAlertMessage: "Supprimer la règle « {name} » ? Cette action est irréversible.",
      templateTitle: "Supprimer le template",
      templateMessage: "Confirmer la suppression du template « {name} » ? Cette action est irréversible.",
      macroTitle: "Supprimer la macro",
      macroMessage: "Confirmer la suppression de la macro « {name} » ? Cette action est irréversible.",
      itilSectionTitle: "Supprimer la section ITIL",
      itilSectionMessage: "Confirmer la suppression de la section « {name} » ? Cette action est irréversible.",
      itilCategoryTitle: "Supprimer la catégorie ITIL",
      itilCategoryMessage: "Confirmer la suppression de la catégorie « {name} » ? Cette action est irréversible.",
      solutionCatalogTitle: "Supprimer l'entrée catalogue",
      solutionCatalogMessage: "Confirmer la suppression de « {name} » ?",
      ticketViewTitle: "Supprimer la vue",
      ticketViewMessage: "Supprimer la vue « {name} » ?",
      supportCreditTitle: "Supprimer le carnet",
      supportCreditMessage: "Supprimer le carnet « {label} » de {enterprise} ? Les crédits restants ({amount}) seront retirés du solde.",
      bulkEnterprisesTitle: "Supprimer {count} entreprises",
      bulkEnterprisesIntro: "Cette action est irréversible. Les entreprises suivantes seront supprimées :",
      salesFormDelete: "Supprimer ce formulaire et tous ses champs ?",
      salesFormFieldDelete: "Supprimer ce champ ?",
      bulkEnterprisesOthersSingular: "… et {count} autre",
      bulkEnterprisesOthersPlural: "… et {count} autres"
    },
    teamForm: {
      createTitle: "Nouvelle équipe",
      editTitle: "Modifier {name}",
      editFallback: "l'équipe",
      createSubtitle: "Regroupez vos agents en équipes N1, N2, monitoring…",
      editSubtitle: "Mettez à jour le nom, la description ou le statut de l'équipe.",
      sectionsAria: "Sections de l'équipe",
      generalTitle: "Informations",
      generalDesc: "Donnez un nom explicite à l'équipe pour la retrouver dans les vues tickets et l'administration.",
      nameLabel: "Nom de l'équipe",
      namePlaceholder: "Ex. Support N1",
      descriptionLabel: "Description",
      descriptionPlaceholder: "Ex. Équipe de premier niveau",
      statusTitle: "Statut",
      statusDesc: "Une équipe inactive reste visible mais n'apparaît plus dans les sélections actives.",
      teamActiveLabel: "Équipe active",
      teamActiveHint: "Désactivez temporairement une équipe sans supprimer ses membres.",
      createBtn: "Créer l'équipe",
      sections: {
        general: {
          label: "Général",
          description: "Nom et description"
        },
        status: {
          label: "Statut",
          description: "Disponibilité"
        }
      }
    }
  },
  en: {
    collectorDelete: {
      title: "Delete collector",
      bullets: ["The IMAP/POP3 connection and its configuration will be removed.", "Emails will no longer be fetched automatically from this mailbox.", "Associated log history will be lost."]
    },
    portalDelete: {
      title: "Remove portal access",
      subtitle: "The login account will be permanently removed.",
      deleteAccess: "Remove access",
      bullets: ["The client portal login will be deleted.", "The contact and enterprise record in Veritas will be kept.", "The person will not be able to sign in until a new access is created."]
    },
    ingestionRuleDelete: {
      title: "Delete rule",
      bullets: ["The rule and its criteria will be removed from incoming email sorting.", "The evaluation order of other rules will be preserved.", "This operation cannot be restored from Veritas."]
    },
    rmmToken: {
      revokeTitle: "Move this token to trash?",
      revokeMessage: "The token will be revoked: new installations will be rejected. You can restore it from the trash.",
      revokeConfirm: "Move to trash",
      restoreTitle: "Restore this token?",
      restoreMessage: "The token will become active again and can be used for agent enrollment.",
      restoreConfirm: "Restore",
      purgeTitle: "Permanently delete this token?",
      purgeMessage: "This action is irreversible. The token will be erased from the database.",
      purgeConfirm: "Delete permanently"
    },
    adminDeleteConfirms: {
      untitled: "untitled",
      catalogEntryFallback: "this entry",
      notebookFallback: "Notebook",
      enterpriseNumber: "Company #{id}",
      irreversible: "This action is irreversible.",
      scheduledAlertTitle: "Delete CRON rule",
      scheduledAlertMessage: "Delete rule « {name} »? This action is irreversible.",
      templateTitle: "Delete template",
      templateMessage: "Confirm deletion of template « {name} »? This action is irreversible.",
      macroTitle: "Delete macro",
      macroMessage: "Confirm deletion of macro « {name} »? This action is irreversible.",
      itilSectionTitle: "Delete ITIL section",
      itilSectionMessage: "Confirm deletion of section « {name} »? This action is irreversible.",
      itilCategoryTitle: "Delete ITIL category",
      itilCategoryMessage: "Confirm deletion of category « {name} »? This action is irreversible.",
      solutionCatalogTitle: "Delete catalog entry",
      solutionCatalogMessage: "Confirm deletion of « {name} »?",
      ticketViewTitle: "Delete view",
      ticketViewMessage: "Delete view « {name} »?",
      supportCreditTitle: "Delete credit pack",
      supportCreditMessage: "Delete pack « {label} » for {enterprise}? Remaining credits ({amount}) will be removed from the balance.",
      bulkEnterprisesTitle: "Delete {count} companies",
      bulkEnterprisesIntro: "This action is irreversible. The following companies will be deleted:",
      salesFormDelete: "Delete this form and all its fields?",
      salesFormFieldDelete: "Delete this field?",
      bulkEnterprisesOthersSingular: "… and {count} other",
      bulkEnterprisesOthersPlural: "… and {count} others"
    },
    teamForm: {
      createTitle: "New team",
      editTitle: "Edit {name}",
      editFallback: "the team",
      createSubtitle: "Group agents into L1, L2, monitoring teams…",
      editSubtitle: "Update the team name, description or status.",
      sectionsAria: "Team sections",
      generalTitle: "Information",
      generalDesc: "Give the team a clear name to find it in ticket views and administration.",
      nameLabel: "Team name",
      namePlaceholder: "e.g. L1 Support",
      descriptionLabel: "Description",
      descriptionPlaceholder: "e.g. First-level team",
      statusTitle: "Status",
      statusDesc: "An inactive team remains visible but no longer appears in active selections.",
      teamActiveLabel: "Active team",
      teamActiveHint: "Temporarily disable a team without removing its members.",
      createBtn: "Create team",
      sections: {
        general: {
          label: "General",
          description: "Name and description"
        },
        status: {
          label: "Status",
          description: "Availability"
        }
      }
    }
  },
  de: {
    collectorDelete: {
      title: "Collector löschen",
      bullets: ["Die IMAP/POP3-Verbindung und ihre Konfiguration werden entfernt.", "E-Mails werden nicht mehr automatisch aus diesem Postfach abgerufen.", "Der zugehörige Protokollverlauf geht verloren."]
    },
    portalDelete: {
      title: "Portalzugang entfernen",
      subtitle: "Das Anmeldekonto wird endgültig entfernt.",
      deleteAccess: "Zugang entfernen",
      bullets: ["Die Anmeldung für das Kundenportal wird gelöscht.", "Kontakt und Unternehmensdatensatz in Veritas bleiben erhalten.", "Die Person kann sich erst wieder anmelden, wenn ein neuer Zugang erstellt wurde."]
    },
    ingestionRuleDelete: {
      title: "Regel löschen",
      bullets: ["Die Regel und ihre Kriterien werden aus der Sortierung eingehender E-Mails entfernt.", "Die Auswertungsreihenfolge anderer Regeln bleibt erhalten.", "Dieser Vorgang kann in Veritas nicht wiederhergestellt werden."]
    },
    rmmToken: {
      revokeTitle: "Diesen Token in den Papierkorb legen?",
      revokeMessage: "Der Token wird widerrufen: neue Installationen werden abgelehnt. Sie können ihn aus dem Papierkorb wiederherstellen.",
      revokeConfirm: "In den Papierkorb",
      restoreTitle: "Diesen Token wiederherstellen?",
      restoreMessage: "Der Token wird wieder aktiv und kann für die Agentenregistrierung genutzt werden.",
      restoreConfirm: "Wiederherstellen",
      purgeTitle: "Diesen Token endgültig löschen?",
      purgeMessage: "Diese Aktion ist endgültig. Der Token wird aus der Datenbank gelöscht.",
      purgeConfirm: "Endgültig löschen"
    },
    adminDeleteConfirms: {
      untitled: "ohne Name",
      catalogEntryFallback: "dieser Eintrag",
      notebookFallback: "Heft",
      enterpriseNumber: "Unternehmen #{id}",
      irreversible: "Diese Aktion ist endgültig.",
      scheduledAlertTitle: "CRON-Regel löschen",
      scheduledAlertMessage: "Regel « {name} » löschen? Diese Aktion ist endgültig.",
      templateTitle: "Vorlage löschen",
      templateMessage: "Löschen der Vorlage « {name} » bestätigen? Diese Aktion ist endgültig.",
      macroTitle: "Makro löschen",
      macroMessage: "Löschen des Makros « {name} » bestätigen? Diese Aktion ist endgültig.",
      itilSectionTitle: "ITIL-Abschnitt löschen",
      itilSectionMessage: "Löschen des Abschnitts « {name} » bestätigen? Diese Aktion ist endgültig.",
      itilCategoryTitle: "ITIL-Kategorie löschen",
      itilCategoryMessage: "Löschen der Kategorie « {name} » bestätigen? Diese Aktion ist endgültig.",
      solutionCatalogTitle: "Katalogeintrag löschen",
      solutionCatalogMessage: "Löschen von « {name} » bestätigen?",
      ticketViewTitle: "Ansicht löschen",
      ticketViewMessage: "Ansicht « {name} » löschen?",
      supportCreditTitle: "Guthabenheft löschen",
      supportCreditMessage: "Heft « {label} » für {enterprise} löschen? Verbleibende Guthaben ({amount}) werden entfernt.",
      bulkEnterprisesTitle: "{count} Unternehmen löschen",
      bulkEnterprisesIntro: "Diese Aktion ist endgültig. Folgende Unternehmen werden gelöscht:",
      salesFormDelete: "Dieses Formular und alle Felder löschen?",
      salesFormFieldDelete: "Dieses Feld löschen?",
      bulkEnterprisesOthersSingular: "… und {count} weitere",
      bulkEnterprisesOthersPlural: "… und {count} weitere"
    },
    teamForm: {
      createTitle: "Neues Team",
      editTitle: "{name} bearbeiten",
      editFallback: "das Team",
      createSubtitle: "Gruppieren Sie Agenten in L1-, L2- oder Monitoring-Teams…",
      editSubtitle: "Aktualisieren Sie Name, Beschreibung oder Status des Teams.",
      sectionsAria: "Teamabschnitte",
      generalTitle: "Informationen",
      generalDesc: "Geben Sie dem Team einen klaren Namen, um es in Ticketansichten und der Administration zu finden.",
      nameLabel: "Teamname",
      namePlaceholder: "z. B. L1-Support",
      descriptionLabel: "Beschreibung",
      descriptionPlaceholder: "z. B. First-Level-Team",
      statusTitle: "Status",
      statusDesc: "Ein inaktives Team bleibt sichtbar, erscheint aber nicht mehr in aktiven Auswahlen.",
      teamActiveLabel: "Aktives Team",
      teamActiveHint: "Deaktivieren Sie ein Team vorübergehend, ohne Mitglieder zu entfernen.",
      createBtn: "Team erstellen",
      sections: {
        general: {
          label: "Allgemein",
          description: "Name und Beschreibung"
        },
        status: {
          label: "Status",
          description: "Verfügbarkeit"
        }
      }
    }
  },
  it: {
    collectorDelete: {
      title: "Elimina collector",
      bullets: ["La connessione IMAP/POP3 e la sua configurazione verranno rimosse.", "Le email non verranno più recuperate automaticamente da questa casella.", "La cronologia dei log associati andrà persa."]
    },
    portalDelete: {
      title: "Rimuovi accesso portale",
      subtitle: "L'account di accesso verrà rimosso definitivamente.",
      deleteAccess: "Rimuovi accesso",
      bullets: ["L'identificativo di accesso al portale cliente verrà eliminato.", "Il contatto e la scheda azienda in Veritas saranno conservati.", "La persona non potrà più accedere finché non verrà creato un nuovo accesso."]
    },
    ingestionRuleDelete: {
      title: "Elimina regola",
      bullets: ["La regola e i suoi criteri verranno rimossi dal triage delle email in entrata.", "L'ordine di valutazione delle altre regole sarà conservato.", "Questa operazione non potrà essere ripristinata da Veritas."]
    },
    rmmToken: {
      revokeTitle: "Spostare questo token nel cestino?",
      revokeMessage: "Il token sarà revocato: le nuove installazioni saranno rifiutate. Potrai ripristinarlo dal cestino.",
      revokeConfirm: "Sposta nel cestino",
      restoreTitle: "Ripristinare questo token?",
      restoreMessage: "Il token tornerà attivo e potrà essere usato per l'enrollment degli agenti.",
      restoreConfirm: "Ripristina",
      purgeTitle: "Eliminare definitivamente questo token?",
      purgeMessage: "Azione irreversibile. Il token sarà rimosso dal database.",
      purgeConfirm: "Elimina definitivamente"
    },
    adminDeleteConfirms: {
      untitled: "senza nome",
      catalogEntryFallback: "questa voce",
      notebookFallback: "Carnet",
      enterpriseNumber: "Azienda #{id}",
      irreversible: "Azione irreversibile.",
      scheduledAlertTitle: "Elimina regola CRON",
      scheduledAlertMessage: "Eliminare la regola « {name} »? Azione irreversibile.",
      templateTitle: "Elimina template",
      templateMessage: "Confermare l'eliminazione del template « {name} »? Azione irreversibile.",
      macroTitle: "Elimina macro",
      macroMessage: "Confermare l'eliminazione della macro « {name} »? Azione irreversibile.",
      itilSectionTitle: "Elimina sezione ITIL",
      itilSectionMessage: "Confermare l'eliminazione della sezione « {name} »? Azione irreversibile.",
      itilCategoryTitle: "Elimina categoria ITIL",
      itilCategoryMessage: "Confermare l'eliminazione della categoria « {name} »? Azione irreversibile.",
      solutionCatalogTitle: "Elimina voce catalogo",
      solutionCatalogMessage: "Confermare l'eliminazione di « {name} »?",
      ticketViewTitle: "Elimina vista",
      ticketViewMessage: "Eliminare la vista « {name} »?",
      supportCreditTitle: "Elimina carnet",
      supportCreditMessage: "Eliminare il carnet « {label} » di {enterprise}? I crediti rimanenti ({amount}) saranno rimossi.",
      bulkEnterprisesTitle: "Elimina {count} aziende",
      bulkEnterprisesIntro: "Azione irreversibile. Le seguenti aziende saranno eliminate:",
      salesFormDelete: "Eliminare questo modulo e tutti i campi?",
      salesFormFieldDelete: "Eliminare questo campo?",
      bulkEnterprisesOthersSingular: "… e {count} altra",
      bulkEnterprisesOthersPlural: "… e {count} altre"
    },
    teamForm: {
      createTitle: "Nuovo team",
      editTitle: "Modifica {name}",
      editFallback: "il team",
      createSubtitle: "Raggruppa gli agenti in team L1, L2, monitoring…",
      editSubtitle: "Aggiorna nome, descrizione o stato del team.",
      sectionsAria: "Sezioni del team",
      generalTitle: "Informazioni",
      generalDesc: "Assegna al team un nome chiaro per trovarlo nelle viste ticket e nell'amministrazione.",
      nameLabel: "Nome del team",
      namePlaceholder: "Es. Supporto L1",
      descriptionLabel: "Descrizione",
      descriptionPlaceholder: "Es. Team di primo livello",
      statusTitle: "Stato",
      statusDesc: "Un team inattivo resta visibile ma non compare più nelle selezioni attive.",
      teamActiveLabel: "Team attivo",
      teamActiveHint: "Disattiva temporaneamente un team senza rimuovere i membri.",
      createBtn: "Crea team",
      sections: {
        general: {
          label: "Generale",
          description: "Nome e descrizione"
        },
        status: {
          label: "Stato",
          description: "Disponibilità"
        }
      }
    }
  },
  es: {
    collectorDelete: {
      title: "Eliminar colector",
      bullets: ["Se eliminará la conexión IMAP/POP3 y su configuración.", "Los correos ya no se recuperarán automáticamente de este buzón.", "Se perderá el historial de logs asociado."]
    },
    portalDelete: {
      title: "Eliminar acceso al portal",
      subtitle: "La cuenta de acceso se eliminará definitivamente.",
      deleteAccess: "Eliminar acceso",
      bullets: ["Se eliminará el identificador de acceso al portal cliente.", "El contacto y la ficha de empresa en Veritas se conservarán.", "La persona no podrá conectarse hasta que se cree un nuevo acceso."]
    },
    ingestionRuleDelete: {
      title: "Eliminar regla",
      bullets: ["La regla y sus criterios se retirarán del triaje de correos entrantes.", "Se conservará el orden de evaluación de las demás reglas.", "Esta operación no podrá restaurarse desde Veritas."]
    },
    rmmToken: {
      revokeTitle: "¿Mover este token a la papelera?",
      revokeMessage: "El token será revocado: se rechazarán nuevas instalaciones. Podrá restaurarlo desde la papelera.",
      revokeConfirm: "Mover a la papelera",
      restoreTitle: "¿Restaurar este token?",
      restoreMessage: "El token volverá a estar activo y podrá usarse para el enrolamiento de agentes.",
      restoreConfirm: "Restaurar",
      purgeTitle: "¿Eliminar definitivamente este token?",
      purgeMessage: "Acción irreversible. El token se borrará de la base de datos.",
      purgeConfirm: "Eliminar definitivamente"
    },
    adminDeleteConfirms: {
      untitled: "sin nombre",
      catalogEntryFallback: "esta entrada",
      notebookFallback: "Cuaderno",
      enterpriseNumber: "Empresa #{id}",
      irreversible: "Acción irreversible.",
      scheduledAlertTitle: "Eliminar regla CRON",
      scheduledAlertMessage: "¿Eliminar la regla « {name} »? Acción irreversible.",
      templateTitle: "Eliminar plantilla",
      templateMessage: "¿Confirmar eliminación de la plantilla « {name} »? Acción irreversible.",
      macroTitle: "Eliminar macro",
      macroMessage: "¿Confirmar eliminación de la macro « {name} »? Acción irreversible.",
      itilSectionTitle: "Eliminar sección ITIL",
      itilSectionMessage: "¿Confirmar eliminación de la sección « {name} »? Acción irreversible.",
      itilCategoryTitle: "Eliminar categoría ITIL",
      itilCategoryMessage: "¿Confirmar eliminación de la categoría « {name} »? Acción irreversible.",
      solutionCatalogTitle: "Eliminar entrada del catálogo",
      solutionCatalogMessage: "¿Confirmar eliminación de « {name} »?",
      ticketViewTitle: "Eliminar vista",
      ticketViewMessage: "¿Eliminar la vista « {name} »?",
      supportCreditTitle: "Eliminar cuaderno",
      supportCreditMessage: "¿Eliminar el cuaderno « {label} » de {enterprise}? Los créditos restantes ({amount}) se retirarán.",
      bulkEnterprisesTitle: "Eliminar {count} empresas",
      bulkEnterprisesIntro: "Acción irreversible. Se eliminarán las siguientes empresas:",
      salesFormDelete: "¿Eliminar este formulario y todos sus campos?",
      salesFormFieldDelete: "¿Eliminar este campo?",
      bulkEnterprisesOthersSingular: "… y {count} más",
      bulkEnterprisesOthersPlural: "… y {count} más"
    },
    teamForm: {
      createTitle: "Nuevo equipo",
      editTitle: "Modificar {name}",
      editFallback: "el equipo",
      createSubtitle: "Agrupe agentes en equipos L1, L2, monitorización…",
      editSubtitle: "Actualice el nombre, la descripción o el estado del equipo.",
      sectionsAria: "Secciones del equipo",
      generalTitle: "Información",
      generalDesc: "Asigne un nombre claro al equipo para encontrarlo en vistas de tickets y administración.",
      nameLabel: "Nombre del equipo",
      namePlaceholder: "Ej. Soporte L1",
      descriptionLabel: "Descripción",
      descriptionPlaceholder: "Ej. Equipo de primer nivel",
      statusTitle: "Estado",
      statusDesc: "Un equipo inactivo sigue visible pero ya no aparece en selecciones activas.",
      teamActiveLabel: "Equipo activo",
      teamActiveHint: "Desactive temporalmente un equipo sin eliminar sus miembros.",
      createBtn: "Crear equipo",
      sections: {
        general: {
          label: "General",
          description: "Nombre y descripción"
        },
        status: {
          label: "Estado",
          description: "Disponibilidad"
        }
      }
    }
  }
};
const getAdminModalsRoot = createLocaleGetter(ADMIN_MODALS);
export function getAdminModalCopy(locale, modalKey) {
  const root = {
    ...getAdminModalsRoot(locale),
    ...getFormModalsRoot(locale)
  };
  return root[modalKey] || {};
}
export function getAdminDeleteConfirmsCopy(locale) {
  return getAdminModalCopy(locale, "adminDeleteConfirms");
}
export function getTeamFormSections(locale) {
  const copy = getAdminModalCopy(locale, "teamForm");
  const icons = {
    general: "mdi:information-outline",
    status: "mdi:toggle-switch-outline"
  };
  return Object.entries(copy.sections || {}).map(([id, section]) => ({
    id,
    label: section.label,
    description: section.description,
    icon: icons[id] || "mdi:information-outline"
  }));
}
