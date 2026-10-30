import { pickLocaleMessages } from "../../i18n/translate";
const JOB_DETAIL_COPY = {
  fr: {
    back: "Retour",
    openClient: "Fiche entreprise",
    editJob: "Éditer le job",
    solutionTitle: "Sauvegarde",
    navAria: "Sections du job",
    sections: {
      overview: "Vue d'ensemble",
      schedule: "Planification",
      mapping: "Intégration CheckMK"
    },
    fields: {
      status: "Statut",
      activity: "Activité",
      active: "Actif",
      inactive: "Inactif",
      solution: "Solution",
      jobType: "Type",
      server: "Serveur",
      destination: "Destination",
      lastBackup: "Dernière sauvegarde",
      lastDuration: "Durée",
      volume: "Volume",
      regularity: "Régularité",
      schedule: "Horaire",
      retention: "Rétention",
      storage: "Stockage",
      replication: "Réplication",
      host: "Hôte CheckMK",
      site: "Site",
      service: "Service"
    },
    mapping: {
      mapped: "Job mappé",
      unmapped: "Job non mappé",
      unmappedHint: "Sans mapping CheckMK, aucune alerte de sauvegarde n'est remontée pour ce job.",
      hycuHint: "Mappez ce job vers HYCU pour synchroniser le statut de sauvegarde.",
      mapAction: "Mapper à CheckMK",
      editAction: "Modifier le mapping",
      none: "Aucun mapping configuré"
    },
    visual: {
      title: "Flux de sauvegarde",
      hint: "Lien dynamique entre le job, les serveurs sources et les espaces de stockage.",
      servers: "Serveurs",
      job: "Job",
      storage: "Stockage",
      sourceServer: "Source",
      backup: "Backup",
      toStorage: "Vers stockage",
      replication: "Réplication",
      noServer: "Aucun serveur",
      noStorage: "Aucun stockage",
      empty: "Aucun serveur ni espace de stockage lié à ce job.",
      statsTitle: "Dernière sauvegarde",
      noHardware: "Aucune fiche matériel trouvée pour cet élément."
    },
    hw: {
      type: "Type",
      ip: "IP",
      os: "Système",
      role: "Rôle",
      model: "Modèle",
      manufacturer: "Fabricant",
      capacity: "Capacité",
      vlan: "VLAN",
      serial: "N° de série",
      location: "Site",
      cpu: "Processeur",
      ram: "Mémoire",
      cpuShort: "vCPU",
      ramShort: "RAM",
      storageShort: "Stockage",
      resources: "Ressources"
    },
    empty: {
      title: "Job introuvable",
      text: "Ce job de sauvegarde n'est plus disponible ou les données sont incomplètes."
    },
    loading: "Chargement du job…"
  },
  en: {
    back: "Back",
    openClient: "Company record",
    editJob: "Edit job",
    solutionTitle: "Backup",
    navAria: "Job sections",
    sections: {
      overview: "Overview",
      schedule: "Schedule",
      mapping: "CheckMK integration"
    },
    fields: {
      status: "Status",
      activity: "Activity",
      active: "Active",
      inactive: "Inactive",
      solution: "Solution",
      jobType: "Type",
      server: "Server",
      destination: "Destination",
      lastBackup: "Last backup",
      lastDuration: "Duration",
      volume: "Volume",
      regularity: "Frequency",
      schedule: "Schedule",
      retention: "Retention",
      storage: "Storage",
      replication: "Replication",
      host: "CheckMK host",
      site: "Site",
      service: "Service"
    },
    mapping: {
      mapped: "Mapped job",
      unmapped: "Unmapped job",
      unmappedHint: "Without a CheckMK mapping, no backup alerts are raised for this job.",
      hycuHint: "Map this job to HYCU to sync backup status.",
      mapAction: "Map to CheckMK",
      editAction: "Edit mapping",
      none: "No mapping configured"
    },
    visual: {
      title: "Backup flow",
      hint: "Live link between the job, source servers and storage targets.",
      servers: "Servers",
      job: "Job",
      storage: "Storage",
      sourceServer: "Source",
      backup: "Backup",
      toStorage: "To storage",
      replication: "Replication",
      noServer: "No server",
      noStorage: "No storage",
      empty: "No server or storage linked to this job.",
      statsTitle: "Last backup",
      noHardware: "No hardware record found for this item."
    },
    hw: {
      type: "Type",
      ip: "IP",
      os: "OS",
      role: "Role",
      model: "Model",
      manufacturer: "Manufacturer",
      capacity: "Capacity",
      vlan: "VLAN",
      serial: "Serial",
      location: "Site",
      cpu: "CPU",
      ram: "Memory",
      cpuShort: "vCPU",
      ramShort: "RAM",
      storageShort: "Storage",
      resources: "Resources"
    },
    empty: {
      title: "Job not found",
      text: "This backup job is no longer available or the data is incomplete."
    },
    loading: "Loading job…"
  }
};
export function getJobDetailCopy(locale) {
  return pickLocaleMessages(JOB_DETAIL_COPY, locale);
}
