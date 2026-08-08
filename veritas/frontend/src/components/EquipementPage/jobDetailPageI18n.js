import { pickLocaleMessages } from "../../i18n/translate";
const JOB_DETAIL_COPY = {
  fr: {
    back: "Retour supervision",
    openClient: "Fiche entreprise",
    sections: {
      overview: "Vue d'ensemble",
      schedule: "Planification",
      mapping: "Intégration CheckMK"
    },
    fields: {
      status: "Statut",
      solution: "Solution",
      jobType: "Type",
      server: "Serveur",
      destination: "Destination",
      lastBackup: "Dernière sauvegarde",
      lastDuration: "Durée",
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
      hycuHint: "Les jobs HYCU ne sont pas synchronisables avec CheckMK.",
      mapAction: "Mapper à CheckMK",
      editAction: "Modifier le mapping",
      none: "Aucun mapping configuré"
    },
    empty: {
      title: "Job introuvable",
      text: "Ce job de sauvegarde n'est plus disponible ou les données sont incomplètes."
    },
    loading: "Chargement du job…"
  },
  en: {
    back: "Back to supervision",
    openClient: "Company record",
    sections: {
      overview: "Overview",
      schedule: "Schedule",
      mapping: "CheckMK integration"
    },
    fields: {
      status: "Status",
      solution: "Solution",
      jobType: "Type",
      server: "Server",
      destination: "Destination",
      lastBackup: "Last backup",
      lastDuration: "Duration",
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
      hycuHint: "HYCU jobs cannot be synced with CheckMK.",
      mapAction: "Map to CheckMK",
      editAction: "Edit mapping",
      none: "No mapping configured"
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
