import { createLocaleGetter, interpolate } from "../../i18n/translate";

const COPY = {
  fr: {
    loading: "Chargement de l’instance…",
    back: "Retour",
    eyebrow: "Cybersécurité · Sauvegarde",
    openClient: "Ouvrir l’entreprise",
    openJob: "Ouvrir le job",
    empty: {
      title: "Instance introuvable",
      text: "Cette instance de sauvegarde n’est plus disponible ou a été supprimée."
    },
    sections: {
      overview: "Instance",
      jobs: "Jobs de l’instance",
      history: "Historique des sauvegardes"
    },
    fields: {
      solution: "Solution",
      server: "Serveur",
      version: "Version",
      expiration: "Expiration",
      jobsCount: "Jobs",
      status: "Statut",
      lastBackup: "Dernière sauvegarde",
      lastDuration: "Durée",
      jobType: "Type",
      schedule: "Planification",
      destination: "Destination"
    },
    jobs: {
      empty: "Aucun job sur cette instance.",
      selectHint: "Sélectionnez un job pour filtrer l’historique.",
      allJobs: "Tous les jobs",
      active: "Actif",
      inactive: "Inactif"
    },
    history: {
      empty: "Aucun historique de sauvegarde disponible pour ce filtre.",
      hint: "Basé sur la dernière exécution connue de chaque job (sync HYCU / CheckMK).",
      job: "Job",
      when: "Date",
      duration: "Durée",
      status: "Statut"
    }
  },
  en: {
    loading: "Loading instance…",
    back: "Back",
    eyebrow: "Cybersecurity · Backup",
    openClient: "Open company",
    openJob: "Open job",
    empty: {
      title: "Instance not found",
      text: "This backup instance is no longer available or was deleted."
    },
    sections: {
      overview: "Instance",
      jobs: "Instance jobs",
      history: "Backup history"
    },
    fields: {
      solution: "Solution",
      server: "Server",
      version: "Version",
      expiration: "Expiration",
      jobsCount: "Jobs",
      status: "Status",
      lastBackup: "Last backup",
      lastDuration: "Duration",
      jobType: "Type",
      schedule: "Schedule",
      destination: "Destination"
    },
    jobs: {
      empty: "No jobs on this instance.",
      selectHint: "Select a job to filter history.",
      allJobs: "All jobs",
      active: "Active",
      inactive: "Inactive"
    },
    history: {
      empty: "No backup history available for this filter.",
      hint: "Based on each job’s last known run (HYCU / CheckMK sync).",
      job: "Job",
      when: "Date",
      duration: "Duration",
      status: "Status"
    }
  }
};

const getCopy = createLocaleGetter(COPY);

export function getInstanceDetailCopy(locale) {
  return getCopy(locale);
}

export { interpolate };
