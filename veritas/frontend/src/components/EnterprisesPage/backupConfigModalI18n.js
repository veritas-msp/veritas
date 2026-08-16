import { interpolate, pickLocaleMessages } from "../../i18n/translate";
const JOB_TYPE_VALUES = ["Complète", "Incrémentale", "Différentielle", "Syntèse"];
const REGULARITY_VALUES = ["Quotidienne", "Hebdomadaire", "Mensuelle", "Annuelle"];
const RETENTION_VALUES = ["7 jours", "14 jours", "30 jours", "60 jours", "90 jours", "6 mois"];
const SOFTWARE_TYPES = ["Veeam", "HYCU Backup", "HyperBackup", "Active Backup for Microsoft 365"];
const SOFTWARE_ICONS = {
  Veeam: "veeam.png",
  "HYCU Backup": "hycu.png",
  HyperBackup: "hyperbackup.png",
  "Active Backup for Microsoft 365": "active-backup.png"
};
const NAV_ICONS = {
  overview: "mdi:view-dashboard-outline",
  instances: "mdi:server-outline",
  "add-instance": "mdi:plus-circle-outline",
  "edit-instance": "mdi:pencil-outline",
  jobs: "mdi:briefcase-outline",
  "add-job": "mdi:plus-box-outline",
  "edit-job": "mdi:pencil-box-outline"
};
const ACTIVE_BACKUP_MODULE_KEYS = ["oneDrive", "sharePoint", "exchange", "teams", "calendar", "contacts"];
function supportsJobs(logiciel) {
  return logiciel === "Veeam" || logiciel === "HYCU Backup";
}
function mapOptionLabels(values, labels) {
  return values.map((value, index) => ({
    value,
    label: String(labels?.[index] ?? value)
  }));
}
function resolveOptionLabel(options, rawValue, fallback = "—") {
  if (rawValue == null || rawValue === "") return fallback;
  if (typeof rawValue === "object" && rawValue !== null) {
    if (typeof rawValue.label === "string") return rawValue.label;
    if (typeof rawValue.value === "string") {
      const match = Array.isArray(options) ? options.find(o => o.value === rawValue.value) : null;
      return match?.label || rawValue.value;
    }
    return fallback;
  }
  const value = String(rawValue);
  const match = Array.isArray(options) ? options.find(o => o.value === value) : null;
  return match?.label || value || fallback;
}
const BACKUP_MODAL_COPY = {
  fr: {
    bcp47: "fr-FR",
    eyebrow: "Services · Sauvegarde",
    title: "Sauvegarde",
    subtitle: "Instances de logiciels de sauvegarde et jobs associés",
    navAria: "Sections sauvegarde",
    loading: "Chargement de la configuration sauvegarde…",
    sections: {
      overview: {
        label: "Vue d'ensemble",
        description: "Synthèse et actions"
      },
      instances: {
        label: "Instances",
        description: "Logiciels de sauvegarde"
      },
      "add-instance": {
        label: "Nouvelle instance",
        description: "Ajouter un logiciel"
      },
      "edit-instance": {
        label: "Éditer l'instance",
        description: "Modifier la configuration"
      },
      jobs: {
        label: "Jobs",
        description: "Jobs de l'instance"
      },
      "add-job": {
        label: "Nouveau job",
        description: "Ajouter un job"
      },
      "edit-job": {
        label: "Éditer le job",
        description: "Modifier le job"
      }
    },
    overview: {
      title: "Vue d'ensemble",
      description: "Configurez les instances de sauvegarde (Veeam, HYCU, HyperBackup…) et leurs jobs pour cette entreprise.",
      addBtn: "Ajouter une instance",
      viewInstances: "Voir les instances"
    },
    instances: {
      title: "Instances",
      description: "Logiciels de sauvegarde enregistrés pour cette entreprise.",
      countOne: "{count} instance",
      countMany: "{count} instances",
      addBtn: "Ajouter une instance",
      openJobs: "Gérer les jobs"
    },
    addInstance: {
      title: "Nouvelle instance",
      description: "Choisissez un logiciel de sauvegarde, puis renseignez sa configuration.",
      pickType: "Choisir un logiciel"
    },
    editInstance: {
      title: "Modifier l'instance",
      description: "Mettez à jour la configuration de cette instance."
    },
    jobs: {
      title: "Jobs de sauvegarde",
      description: "Jobs rattachés à l'instance sélectionnée.",
      countOne: "{count} job",
      countMany: "{count} jobs",
      addBtn: "Ajouter un job",
      noJobsSupport: "Ce type d'instance ne gère pas de jobs séparés.",
      selectInstance: "Sélectionnez une instance pour gérer ses jobs.",
      defaultJob: "Job par défaut"
    },
    addJob: {
      title: "Nouveau job",
      description: "Définissez le nom, le type et la planification du job."
    },
    editJob: {
      title: "Modifier le job",
      description: "Mettez à jour les paramètres de ce job de sauvegarde."
    },
    kpi: {
      instances: "Instances",
      jobs: "Jobs"
    },
    software: {
      Veeam: {
        label: "Veeam Backup & Replication",
        description: "Sauvegarde et réplication pour environnements virtualisés"
      },
      "HYCU Backup": {
        label: "HYCU Backup",
        description: "Sauvegarde cloud-native pour Nutanix et VMware"
      },
      HyperBackup: {
        label: "Synology HyperBackup",
        description: "Réplication NAS vers NAS ou disque externe"
      },
      "Active Backup for Microsoft 365": {
        label: "Active Backup for Microsoft 365",
        description: "Sauvegarde Synology pour Microsoft 365"
      }
    },
    form: {
      logiciel: "Logiciel",
      expiration: "Expiration de licence",
      server: "Serveur de sauvegarde",
      serverNone: "Aucun serveur",
      hyperbackupSource: "Source",
      hyperbackupDestination: "Destination",
      activeBackupModules: "Modules activés",
      activeBackupStorage: "Destination de stockage",
      storageNone: "Sélectionner une destination",
      jobName: "Nom du job",
      jobNamePlaceholder: "Ex. Backup quotidien VMs",
      jobTarget: "Cible",
      jobTargetNone: "Aucune cible",
      jobTargetEmpty: "Aucun serveur disponible dans l'équipement client. Ajoutez des serveurs pour les sélectionner comme cibles.",
      jobTargetSearch: "Rechercher un serveur…",
      jobTargetEmptyResults: "Aucun serveur trouvé",
      selectedTargetsNone: "Aucune cible sélectionnée",
      selectedTargetsOne: "{count} cible sélectionnée",
      selectedTargetsMany: "{count} cibles sélectionnées",
      jobDestination: "Destination",
      jobDestinationNone: "Aucune destination",
      jobType: "Type de sauvegarde",
      jobTypeNone: "Sélectionner un type",
      jobRegularity: "Régularité",
      jobRegularityNone: "Sélectionner une régularité",
      jobSchedule: "Horaire",
      jobRetention: "Rétention",
      jobRetentionNone: "Sélectionner une rétention",
      jobReplication: "Réplication vers",
      jobActiveToggle: "Job actif",
      jobActive: "Actif",
      jobInactive: "Inactif",
      jobActiveHint: "Un job inactif reste visible mais n'est plus suivi dans les alertes de sauvegarde.",
      cancel: "Annuler",
      modules: {
        oneDrive: "OneDrive",
        sharePoint: "SharePoint",
        exchange: "Exchange",
        teams: "Teams",
        calendar: "Calendar",
        contacts: "Contacts"
      }
    },
    jobTypeLabels: ["Complète", "Incrémentale", "Différentielle", "Syntèse"],
    regularityLabels: ["Quotidienne", "Hebdomadaire", "Mensuelle", "Annuelle"],
    retentionLabels: ["7 jours", "14 jours", "30 jours", "60 jours", "90 jours", "6 mois"],
    equipment: {
      externalDisk: "Disque dur externe",
      nas: "NAS",
      san: "SAN",
      lunOn: "LUN sur {name}",
      diskNumber: "N°{number}"
    },
    meta: {
      logiciel: "Logiciel",
      jobs: "Jobs",
      server: "Serveur",
      type: "Type",
      schedule: "Planification",
      retention: "Rétention"
    },
    empty: {
      noInstances: "Aucune instance de sauvegarde",
      noJobs: "Aucun job pour cette instance",
      addInstance: "Ajouter une instance",
      addJob: "Ajouter un job"
    },
    footer: {
      pickSoftware: "Choisissez un logiciel pour continuer",
      nameRequired: "Le nom du job est obligatoire"
    },
    primary: {
      update: "Mettre à jour",
      add: "Ajouter",
      createInstance: "Créer l'instance",
      saveInstance: "Enregistrer"
    },
    actions: {
      edit: "Modifier",
      delete: "Supprimer",
      openJobs: "Jobs"
    },
    deleteFallback: {
      instance: "cette instance",
      job: "ce job"
    },
    toasts: {
      instanceAdded: "Instance ajoutée",
      instanceUpdated: "Instance mise à jour",
      instanceDeleted: "Instance supprimée",
      jobAdded: "Job ajouté",
      jobUpdated: "Job mis à jour",
      jobDeleted: "Job supprimé",
      jobNameRequired: "Le nom du job est obligatoire",
      cannotDeleteDefaultJob: "Le job par défaut HYCU ne peut pas être supprimé",
      saveError: "Erreur lors de l'enregistrement",
      deleteError: "Erreur lors de la suppression",
      loadError: "Erreur lors du chargement"
    }
  },
  en: {
    bcp47: "en-GB",
    eyebrow: "Services · Backup",
    title: "Backup",
    subtitle: "Backup software instances and associated jobs",
    navAria: "Backup sections",
    loading: "Loading backup configuration…",
    sections: {
      overview: {
        label: "Overview",
        description: "Summary and actions"
      },
      instances: {
        label: "Instances",
        description: "Backup software"
      },
      "add-instance": {
        label: "New instance",
        description: "Add software"
      },
      "edit-instance": {
        label: "Edit instance",
        description: "Update configuration"
      },
      jobs: {
        label: "Jobs",
        description: "Instance jobs"
      },
      "add-job": {
        label: "New job",
        description: "Add a job"
      },
      "edit-job": {
        label: "Edit job",
        description: "Update job"
      }
    },
    overview: {
      title: "Overview",
      description: "Configure backup instances (Veeam, HYCU, HyperBackup…) and their jobs for this company.",
      addBtn: "Add an instance",
      viewInstances: "View instances"
    },
    instances: {
      title: "Instances",
      description: "Backup software registered for this company.",
      countOne: "{count} instance",
      countMany: "{count} instances",
      addBtn: "Add an instance",
      openJobs: "Manage jobs"
    },
    addInstance: {
      title: "New instance",
      description: "Choose backup software, then fill in its configuration.",
      pickType: "Choose software"
    },
    editInstance: {
      title: "Edit instance",
      description: "Update this instance configuration."
    },
    jobs: {
      title: "Backup jobs",
      description: "Jobs linked to the selected instance.",
      countOne: "{count} job",
      countMany: "{count} jobs",
      addBtn: "Add a job",
      noJobsSupport: "This instance type does not manage separate jobs.",
      selectInstance: "Select an instance to manage its jobs.",
      defaultJob: "Default job"
    },
    addJob: {
      title: "New job",
      description: "Define the job name, type and schedule."
    },
    editJob: {
      title: "Edit job",
      description: "Update this backup job settings."
    },
    kpi: {
      instances: "Instances",
      jobs: "Jobs"
    },
    software: {
      Veeam: {
        label: "Veeam Backup & Replication",
        description: "Backup and replication for virtualized environments"
      },
      "HYCU Backup": {
        label: "HYCU Backup",
        description: "Cloud-native backup for Nutanix and VMware"
      },
      HyperBackup: {
        label: "Synology HyperBackup",
        description: "NAS-to-NAS or external disk replication"
      },
      "Active Backup for Microsoft 365": {
        label: "Active Backup for Microsoft 365",
        description: "Synology backup for Microsoft 365"
      }
    },
    form: {
      logiciel: "Software",
      expiration: "License expiration",
      server: "Backup server",
      serverNone: "No server",
      hyperbackupSource: "Source",
      hyperbackupDestination: "Destination",
      activeBackupModules: "Enabled modules",
      activeBackupStorage: "Storage destination",
      storageNone: "Select a destination",
      jobName: "Job name",
      jobNamePlaceholder: "E.g. Daily VM backup",
      jobTarget: "Target",
      jobTargetNone: "No target",
      jobTargetEmpty: "No servers available in client equipment. Add servers to select them as targets.",
      jobTargetSearch: "Search for a server…",
      jobTargetEmptyResults: "No servers found",
      selectedTargetsNone: "No targets selected",
      selectedTargetsOne: "{count} target selected",
      selectedTargetsMany: "{count} targets selected",
      jobDestination: "Destination",
      jobDestinationNone: "No destination",
      jobType: "Backup type",
      jobTypeNone: "Select a type",
      jobRegularity: "Frequency",
      jobRegularityNone: "Select a frequency",
      jobSchedule: "Schedule",
      jobRetention: "Retention",
      jobRetentionNone: "Select a retention",
      jobReplication: "Replicate to",
      jobActiveToggle: "Active job",
      jobActive: "Active",
      jobInactive: "Inactive",
      jobActiveHint: "An inactive job stays visible but is no longer tracked in backup alerts.",
      cancel: "Cancel",
      modules: {
        oneDrive: "OneDrive",
        sharePoint: "SharePoint",
        exchange: "Exchange",
        teams: "Teams",
        calendar: "Calendar",
        contacts: "Contacts"
      }
    },
    jobTypeLabels: ["Full", "Incremental", "Differential", "Synthetic"],
    regularityLabels: ["Daily", "Weekly", "Monthly", "Yearly"],
    retentionLabels: ["7 days", "14 days", "30 days", "60 days", "90 days", "6 months"],
    equipment: {
      externalDisk: "External hard drive",
      nas: "NAS",
      san: "SAN",
      lunOn: "LUN on {name}",
      diskNumber: "No. {number}"
    },
    meta: {
      logiciel: "Software",
      jobs: "Jobs",
      server: "Server",
      type: "Type",
      schedule: "Schedule",
      retention: "Retention"
    },
    empty: {
      noInstances: "No backup instance",
      noJobs: "No job for this instance",
      addInstance: "Add an instance",
      addJob: "Add a job"
    },
    footer: {
      pickSoftware: "Choose software to continue",
      nameRequired: "Job name is required"
    },
    primary: {
      update: "Update",
      add: "Add",
      createInstance: "Create instance",
      saveInstance: "Save"
    },
    actions: {
      edit: "Edit",
      delete: "Delete",
      openJobs: "Jobs"
    },
    deleteFallback: {
      instance: "this instance",
      job: "this job"
    },
    toasts: {
      instanceAdded: "Instance added",
      instanceUpdated: "Instance updated",
      instanceDeleted: "Instance deleted",
      jobAdded: "Job added",
      jobUpdated: "Job updated",
      jobDeleted: "Job deleted",
      jobNameRequired: "Job name is required",
      cannotDeleteDefaultJob: "The default HYCU job cannot be deleted",
      saveError: "Error while saving",
      deleteError: "Error while deleting",
      loadError: "Error while loading"
    }
  },
  de: {
    bcp47: "de-DE",
    eyebrow: "Dienste · Backup",
    title: "Backup",
    subtitle: "Backup-Software-Instanzen und zugehörige Jobs",
    navAria: "Backup-Abschnitte",
    loading: "Backup-Konfiguration wird geladen…",
    sections: {
      overview: {
        label: "Übersicht",
        description: "Zusammenfassung und Aktionen"
      },
      instances: {
        label: "Instanzen",
        description: "Backup-Software"
      },
      "add-instance": {
        label: "Neue Instanz",
        description: "Software hinzufügen"
      },
      "edit-instance": {
        label: "Instanz bearbeiten",
        description: "Konfiguration aktualisieren"
      },
      jobs: {
        label: "Jobs",
        description: "Jobs der Instanz"
      },
      "add-job": {
        label: "Neuer Job",
        description: "Job hinzufügen"
      },
      "edit-job": {
        label: "Job bearbeiten",
        description: "Job aktualisieren"
      }
    },
    overview: {
      title: "Übersicht",
      description: "Konfigurieren Sie Backup-Instanzen (Veeam, HYCU, HyperBackup…) und deren Jobs für dieses Unternehmen.",
      addBtn: "Instanz hinzufügen",
      viewInstances: "Instanzen anzeigen"
    },
    instances: {
      title: "Instanzen",
      description: "Für dieses Unternehmen erfasste Backup-Software.",
      countOne: "{count} Instanz",
      countMany: "{count} Instanzen",
      addBtn: "Instanz hinzufügen",
      openJobs: "Jobs verwalten"
    },
    addInstance: {
      title: "Neue Instanz",
      description: "Wählen Sie eine Backup-Software und füllen Sie die Konfiguration aus.",
      pickType: "Software wählen"
    },
    editInstance: {
      title: "Instanz bearbeiten",
      description: "Aktualisieren Sie die Konfiguration dieser Instanz."
    },
    jobs: {
      title: "Backup-Jobs",
      description: "Jobs der ausgewählten Instanz.",
      countOne: "{count} Job",
      countMany: "{count} Jobs",
      addBtn: "Job hinzufügen",
      noJobsSupport: "Dieser Instanztyp verwaltet keine separaten Jobs.",
      selectInstance: "Wählen Sie eine Instanz, um deren Jobs zu verwalten.",
      defaultJob: "Standard-Job"
    },
    addJob: {
      title: "Neuer Job",
      description: "Definieren Sie Name, Typ und Zeitplan des Jobs."
    },
    editJob: {
      title: "Job bearbeiten",
      description: "Aktualisieren Sie die Einstellungen dieses Backup-Jobs."
    },
    kpi: {
      instances: "Instanzen",
      jobs: "Jobs"
    },
    software: {
      Veeam: {
        label: "Veeam Backup & Replication",
        description: "Backup und Replikation für virtualisierte Umgebungen"
      },
      "HYCU Backup": {
        label: "HYCU Backup",
        description: "Cloud-natives Backup für Nutanix und VMware"
      },
      HyperBackup: {
        label: "Synology HyperBackup",
        description: "NAS-zu-NAS- oder externe Festplatten-Replikation"
      },
      "Active Backup for Microsoft 365": {
        label: "Active Backup for Microsoft 365",
        description: "Synology-Backup für Microsoft 365"
      }
    },
    form: {
      logiciel: "Software",
      expiration: "Lizenzablauf",
      server: "Backup-Server",
      serverNone: "Kein Server",
      hyperbackupSource: "Quelle",
      hyperbackupDestination: "Ziel",
      activeBackupModules: "Aktivierte Module",
      activeBackupStorage: "Speicherziel",
      storageNone: "Ziel auswählen",
      jobName: "Jobname",
      jobNamePlaceholder: "z. B. Tägliches VM-Backup",
      jobTarget: "Ziel",
      jobTargetNone: "Kein Ziel",
      jobTargetEmpty: "Keine Server in der Client-Ausstattung verfügbar. Fügen Sie Server hinzu, um sie als Ziele auszuwählen.",
      jobTargetSearch: "Server suchen…",
      jobTargetEmptyResults: "Keine Server gefunden",
      selectedTargetsNone: "Keine Ziele ausgewählt",
      selectedTargetsOne: "{count} Ziel ausgewählt",
      selectedTargetsMany: "{count} Ziele ausgewählt",
      jobDestination: "Zielspeicher",
      jobDestinationNone: "Kein Zielspeicher",
      jobType: "Backup-Typ",
      jobTypeNone: "Typ auswählen",
      jobRegularity: "Häufigkeit",
      jobRegularityNone: "Häufigkeit auswählen",
      jobSchedule: "Uhrzeit",
      jobRetention: "Aufbewahrung",
      jobRetentionNone: "Aufbewahrung auswählen",
      jobReplication: "Replizieren nach",
      jobActiveToggle: "Job aktiv",
      jobActive: "Aktiv",
      jobInactive: "Inaktiv",
      jobActiveHint: "Ein inaktiver Job bleibt sichtbar, wird aber nicht mehr in Backup-Alarmen überwacht.",
      cancel: "Abbrechen",
      modules: {
        oneDrive: "OneDrive",
        sharePoint: "SharePoint",
        exchange: "Exchange",
        teams: "Teams",
        calendar: "Calendar",
        contacts: "Contacts"
      }
    },
    jobTypeLabels: ["Vollständig", "Inkrementell", "Differenziell", "Synthetisch"],
    regularityLabels: ["Täglich", "Wöchentlich", "Monatlich", "Jährlich"],
    retentionLabels: ["7 Tage", "14 Tage", "30 Tage", "60 Tage", "90 Tage", "6 Monate"],
    equipment: {
      externalDisk: "Externe Festplatte",
      nas: "NAS",
      san: "SAN",
      lunOn: "LUN auf {name}",
      diskNumber: "Nr. {number}"
    },
    meta: {
      logiciel: "Software",
      jobs: "Jobs",
      server: "Server",
      type: "Typ",
      schedule: "Zeitplan",
      retention: "Aufbewahrung"
    },
    empty: {
      noInstances: "Keine Backup-Instanz",
      noJobs: "Kein Job für diese Instanz",
      addInstance: "Instanz hinzufügen",
      addJob: "Job hinzufügen"
    },
    footer: {
      pickSoftware: "Wählen Sie eine Software, um fortzufahren",
      nameRequired: "Jobname ist erforderlich"
    },
    primary: {
      update: "Aktualisieren",
      add: "Hinzufügen",
      createInstance: "Instanz erstellen",
      saveInstance: "Speichern"
    },
    actions: {
      edit: "Bearbeiten",
      delete: "Löschen",
      openJobs: "Jobs"
    },
    deleteFallback: {
      instance: "diese Instanz",
      job: "diesen Job"
    },
    toasts: {
      instanceAdded: "Instanz hinzugefügt",
      instanceUpdated: "Instanz aktualisiert",
      instanceDeleted: "Instanz gelöscht",
      jobAdded: "Job hinzugefügt",
      jobUpdated: "Job aktualisiert",
      jobDeleted: "Job gelöscht",
      jobNameRequired: "Jobname ist erforderlich",
      cannotDeleteDefaultJob: "Der HYCU-Standard-Job kann nicht gelöscht werden",
      saveError: "Fehler beim Speichern",
      deleteError: "Fehler beim Löschen",
      loadError: "Fehler beim Laden"
    }
  },
  it: {
    bcp47: "it-IT",
    eyebrow: "Servizi · Backup",
    title: "Backup",
    subtitle: "Istanze software di backup e job associati",
    navAria: "Sezioni backup",
    loading: "Caricamento configurazione backup…",
    sections: {
      overview: {
        label: "Panoramica",
        description: "Sintesi e azioni"
      },
      instances: {
        label: "Istanze",
        description: "Software di backup"
      },
      "add-instance": {
        label: "Nuova istanza",
        description: "Aggiungi software"
      },
      "edit-instance": {
        label: "Modifica istanza",
        description: "Aggiorna configurazione"
      },
      jobs: {
        label: "Job",
        description: "Job dell'istanza"
      },
      "add-job": {
        label: "Nuovo job",
        description: "Aggiungi un job"
      },
      "edit-job": {
        label: "Modifica job",
        description: "Aggiorna il job"
      }
    },
    overview: {
      title: "Panoramica",
      description: "Configura le istanze di backup (Veeam, HYCU, HyperBackup…) e i relativi job per questa azienda.",
      addBtn: "Aggiungi un'istanza",
      viewInstances: "Vedi le istanze"
    },
    instances: {
      title: "Istanze",
      description: "Software di backup registrati per questa azienda.",
      countOne: "{count} istanza",
      countMany: "{count} istanze",
      addBtn: "Aggiungi un'istanza",
      openJobs: "Gestisci i job"
    },
    addInstance: {
      title: "Nuova istanza",
      description: "Scegli un software di backup, poi compilane la configurazione.",
      pickType: "Scegli un software"
    },
    editInstance: {
      title: "Modifica istanza",
      description: "Aggiorna la configurazione di questa istanza."
    },
    jobs: {
      title: "Job di backup",
      description: "Job collegati all'istanza selezionata.",
      countOne: "{count} job",
      countMany: "{count} job",
      addBtn: "Aggiungi un job",
      noJobsSupport: "Questo tipo di istanza non gestisce job separati.",
      selectInstance: "Seleziona un'istanza per gestirne i job.",
      defaultJob: "Job predefinito"
    },
    addJob: {
      title: "Nuovo job",
      description: "Definisci nome, tipo e pianificazione del job."
    },
    editJob: {
      title: "Modifica job",
      description: "Aggiorna le impostazioni di questo job di backup."
    },
    kpi: {
      instances: "Istanze",
      jobs: "Job"
    },
    software: {
      Veeam: {
        label: "Veeam Backup & Replication",
        description: "Backup e replica per ambienti virtualizzati"
      },
      "HYCU Backup": {
        label: "HYCU Backup",
        description: "Backup cloud-native per Nutanix e VMware"
      },
      HyperBackup: {
        label: "Synology HyperBackup",
        description: "Replica NAS-to-NAS o su disco esterno"
      },
      "Active Backup for Microsoft 365": {
        label: "Active Backup for Microsoft 365",
        description: "Backup Synology per Microsoft 365"
      }
    },
    form: {
      logiciel: "Software",
      expiration: "Scadenza licenza",
      server: "Server di backup",
      serverNone: "Nessun server",
      hyperbackupSource: "Origine",
      hyperbackupDestination: "Destinazione",
      activeBackupModules: "Moduli attivati",
      activeBackupStorage: "Destinazione di archiviazione",
      storageNone: "Seleziona una destinazione",
      jobName: "Nome del job",
      jobNamePlaceholder: "Es. Backup giornaliero VM",
      jobTarget: "Destinazione",
      jobTargetNone: "Nessuna destinazione",
      jobTargetEmpty: "Nessun server disponibile nell'attrezzatura del cliente. Aggiungi server per selezionarli come destinazioni.",
      jobTargetSearch: "Cerca un server…",
      jobTargetEmptyResults: "Nessun server trovato",
      selectedTargetsNone: "Nessuna destinazione selezionata",
      selectedTargetsOne: "{count} destinazione selezionata",
      selectedTargetsMany: "{count} destinazioni selezionate",
      jobDestination: "Archiviazione",
      jobDestinationNone: "Nessuna archiviazione",
      jobType: "Tipo di backup",
      jobTypeNone: "Seleziona un tipo",
      jobRegularity: "Frequenza",
      jobRegularityNone: "Seleziona una frequenza",
      jobSchedule: "Orario",
      jobRetention: "Retention",
      jobRetentionNone: "Seleziona una retention",
      jobReplication: "Replica verso",
      jobActiveToggle: "Job attivo",
      jobActive: "Attivo",
      jobInactive: "Inattivo",
      jobActiveHint: "Un job inattivo resta visibile ma non viene più seguito negli avvisi di backup.",
      cancel: "Annulla",
      modules: {
        oneDrive: "OneDrive",
        sharePoint: "SharePoint",
        exchange: "Exchange",
        teams: "Teams",
        calendar: "Calendar",
        contacts: "Contacts"
      }
    },
    jobTypeLabels: ["Completo", "Incrementale", "Differenziale", "Sintetico"],
    regularityLabels: ["Giornaliera", "Settimanale", "Mensile", "Annuale"],
    retentionLabels: ["7 giorni", "14 giorni", "30 giorni", "60 giorni", "90 giorni", "6 mesi"],
    equipment: {
      externalDisk: "Disco rigido esterno",
      nas: "NAS",
      san: "SAN",
      lunOn: "LUN su {name}",
      diskNumber: "N. {number}"
    },
    meta: {
      logiciel: "Software",
      jobs: "Job",
      server: "Server",
      type: "Tipo",
      schedule: "Pianificazione",
      retention: "Retention"
    },
    empty: {
      noInstances: "Nessuna istanza di backup",
      noJobs: "Nessun job per questa istanza",
      addInstance: "Aggiungi un'istanza",
      addJob: "Aggiungi un job"
    },
    footer: {
      pickSoftware: "Scegli un software per continuare",
      nameRequired: "Il nome del job è obbligatorio"
    },
    primary: {
      update: "Aggiorna",
      add: "Aggiungi",
      createInstance: "Crea istanza",
      saveInstance: "Salva"
    },
    actions: {
      edit: "Modifica",
      delete: "Elimina",
      openJobs: "Job"
    },
    deleteFallback: {
      instance: "questa istanza",
      job: "questo job"
    },
    toasts: {
      instanceAdded: "Istanza aggiunta",
      instanceUpdated: "Istanza aggiornata",
      instanceDeleted: "Istanza eliminata",
      jobAdded: "Job aggiunto",
      jobUpdated: "Job aggiornato",
      jobDeleted: "Job eliminato",
      jobNameRequired: "Il nome del job è obbligatorio",
      cannotDeleteDefaultJob: "Il job predefinito HYCU non può essere eliminato",
      saveError: "Errore durante il salvataggio",
      deleteError: "Errore durante l'eliminazione",
      loadError: "Errore durante il caricamento"
    }
  },
  es: {
    bcp47: "es-ES",
    eyebrow: "Servicios · Copia de seguridad",
    title: "Copia de seguridad",
    subtitle: "Instancias de software de copia y trabajos asociados",
    navAria: "Secciones de copia de seguridad",
    loading: "Cargando la configuración de copia de seguridad…",
    sections: {
      overview: {
        label: "Resumen",
        description: "Síntesis y acciones"
      },
      instances: {
        label: "Instancias",
        description: "Software de copia"
      },
      "add-instance": {
        label: "Nueva instancia",
        description: "Añadir software"
      },
      "edit-instance": {
        label: "Editar instancia",
        description: "Actualizar configuración"
      },
      jobs: {
        label: "Trabajos",
        description: "Trabajos de la instancia"
      },
      "add-job": {
        label: "Nuevo trabajo",
        description: "Añadir un trabajo"
      },
      "edit-job": {
        label: "Editar trabajo",
        description: "Actualizar el trabajo"
      }
    },
    overview: {
      title: "Resumen",
      description: "Configure las instancias de copia (Veeam, HYCU, HyperBackup…) y sus trabajos para esta empresa.",
      addBtn: "Añadir una instancia",
      viewInstances: "Ver las instancias"
    },
    instances: {
      title: "Instancias",
      description: "Software de copia registrado para esta empresa.",
      countOne: "{count} instancia",
      countMany: "{count} instancias",
      addBtn: "Añadir una instancia",
      openJobs: "Gestionar trabajos"
    },
    addInstance: {
      title: "Nueva instancia",
      description: "Elija un software de copia y complete su configuración.",
      pickType: "Elegir un software"
    },
    editInstance: {
      title: "Editar instancia",
      description: "Actualice la configuración de esta instancia."
    },
    jobs: {
      title: "Trabajos de copia",
      description: "Trabajos vinculados a la instancia seleccionada.",
      countOne: "{count} trabajo",
      countMany: "{count} trabajos",
      addBtn: "Añadir un trabajo",
      noJobsSupport: "Este tipo de instancia no gestiona trabajos separados.",
      selectInstance: "Seleccione una instancia para gestionar sus trabajos.",
      defaultJob: "Trabajo predeterminado"
    },
    addJob: {
      title: "Nuevo trabajo",
      description: "Defina el nombre, el tipo y la planificación del trabajo."
    },
    editJob: {
      title: "Editar trabajo",
      description: "Actualice los parámetros de este trabajo de copia."
    },
    kpi: {
      instances: "Instancias",
      jobs: "Trabajos"
    },
    software: {
      Veeam: {
        label: "Veeam Backup & Replication",
        description: "Copia y replicación para entornos virtualizados"
      },
      "HYCU Backup": {
        label: "HYCU Backup",
        description: "Copia cloud-native para Nutanix y VMware"
      },
      HyperBackup: {
        label: "Synology HyperBackup",
        description: "Replicación NAS a NAS o disco externo"
      },
      "Active Backup for Microsoft 365": {
        label: "Active Backup for Microsoft 365",
        description: "Copia Synology para Microsoft 365"
      }
    },
    form: {
      logiciel: "Software",
      expiration: "Caducidad de licencia",
      server: "Servidor de copia",
      serverNone: "Ningún servidor",
      hyperbackupSource: "Origen",
      hyperbackupDestination: "Destino",
      activeBackupModules: "Módulos activados",
      activeBackupStorage: "Destino de almacenamiento",
      storageNone: "Seleccionar un destino",
      jobName: "Nombre del trabajo",
      jobNamePlaceholder: "Ej. Copia diaria de VMs",
      jobTarget: "Objetivo",
      jobTargetNone: "Ningún objetivo",
      jobTargetEmpty: "No hay servidores disponibles en el equipamiento del cliente. Añade servidores para seleccionarlos como objetivos.",
      jobTargetSearch: "Buscar un servidor…",
      jobTargetEmptyResults: "Ningún servidor encontrado",
      selectedTargetsNone: "Ningún objetivo seleccionado",
      selectedTargetsOne: "{count} objetivo seleccionado",
      selectedTargetsMany: "{count} objetivos seleccionados",
      jobDestination: "Destino",
      jobDestinationNone: "Ningún destino",
      jobType: "Tipo de copia",
      jobTypeNone: "Seleccionar un tipo",
      jobRegularity: "Frecuencia",
      jobRegularityNone: "Seleccionar una frecuencia",
      jobSchedule: "Horario",
      jobRetention: "Retención",
      jobRetentionNone: "Seleccionar una retención",
      jobReplication: "Replicar hacia",
      jobActiveToggle: "Trabajo activo",
      jobActive: "Activo",
      jobInactive: "Inactivo",
      jobActiveHint: "Un trabajo inactivo sigue visible pero ya no se supervisa en las alertas de copia.",
      cancel: "Cancelar",
      modules: {
        oneDrive: "OneDrive",
        sharePoint: "SharePoint",
        exchange: "Exchange",
        teams: "Teams",
        calendar: "Calendar",
        contacts: "Contacts"
      }
    },
    jobTypeLabels: ["Completa", "Incremental", "Diferencial", "Sintética"],
    regularityLabels: ["Diaria", "Semanal", "Mensual", "Anual"],
    retentionLabels: ["7 días", "14 días", "30 días", "60 días", "90 días", "6 meses"],
    equipment: {
      externalDisk: "Disco duro externo",
      nas: "NAS",
      san: "SAN",
      lunOn: "LUN en {name}",
      diskNumber: "N.º {number}"
    },
    meta: {
      logiciel: "Software",
      jobs: "Trabajos",
      server: "Servidor",
      type: "Tipo",
      schedule: "Planificación",
      retention: "Retención"
    },
    empty: {
      noInstances: "Ninguna instancia de copia",
      noJobs: "Ningún trabajo para esta instancia",
      addInstance: "Añadir una instancia",
      addJob: "Añadir un trabajo"
    },
    footer: {
      pickSoftware: "Elija un software para continuar",
      nameRequired: "El nombre del trabajo es obligatorio"
    },
    primary: {
      update: "Actualizar",
      add: "Añadir",
      createInstance: "Crear instancia",
      saveInstance: "Guardar"
    },
    actions: {
      edit: "Editar",
      delete: "Eliminar",
      openJobs: "Trabajos"
    },
    deleteFallback: {
      instance: "esta instancia",
      job: "este trabajo"
    },
    toasts: {
      instanceAdded: "Instancia añadida",
      instanceUpdated: "Instancia actualizada",
      instanceDeleted: "Instancia eliminada",
      jobAdded: "Trabajo añadido",
      jobUpdated: "Trabajo actualizado",
      jobDeleted: "Trabajo eliminado",
      jobNameRequired: "El nombre del trabajo es obligatorio",
      cannotDeleteDefaultJob: "El trabajo predeterminado HYCU no se puede eliminar",
      saveError: "Error al guardar",
      deleteError: "Error al eliminar",
      loadError: "Error al cargar"
    }
  }
};
export function getBackupModalCopy(locale) {
  const t = pickLocaleMessages(BACKUP_MODAL_COPY, locale);
  return {
    ...t,
    softwareTypes: SOFTWARE_TYPES,
    softwareIcons: SOFTWARE_ICONS,
    activeBackupModuleKeys: ACTIVE_BACKUP_MODULE_KEYS,
    supportsJobs,
    jobTypeOptions: mapOptionLabels(JOB_TYPE_VALUES, t.jobTypeLabels),
    regularityOptions: mapOptionLabels(REGULARITY_VALUES, t.regularityLabels),
    retentionOptions: mapOptionLabels(RETENTION_VALUES, t.retentionLabels),
    navSections: ({
      editingInstance,
      editingJob,
      selectedInstance,
      showJobs
    }) => {
      const ids = ["overview", "instances"];
      if (editingInstance) ids.push("edit-instance");
      if (showJobs && selectedInstance) {
        ids.push("jobs");
        if (editingJob) ids.push("edit-job");
      }
      return ids.map(id => ({
        id,
        icon: NAV_ICONS[id],
        label: t.sections[id].label,
        description: t.sections[id].description
      }));
    },
    formatInstanceCount: count => {
      const template = count > 1 ? t.instances.countMany : t.instances.countOne;
      return interpolate(template, {
        count: String(count)
      });
    },
    formatJobCount: count => {
      const template = count > 1 ? t.jobs.countMany : t.jobs.countOne;
      return interpolate(template, {
        count: String(count)
      });
    },
    formatSelectedTargets: count => {
      if (!count) return t.form.selectedTargetsNone;
      const template = count > 1 ? t.form.selectedTargetsMany : t.form.selectedTargetsOne;
      return interpolate(template, {
        count: String(count)
      });
    },
    formatLunOn: name => interpolate(t.equipment.lunOn, {
      name
    }),
    formatDiskNumber: number => interpolate(t.equipment.diskNumber, {
      number: String(number)
    }),
    resolveOptionLabel
  };
}
export { SOFTWARE_TYPES, SOFTWARE_ICONS, ACTIVE_BACKUP_MODULE_KEYS, supportsJobs };
