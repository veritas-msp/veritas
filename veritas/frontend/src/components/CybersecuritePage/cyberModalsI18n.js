import { createLocaleGetter } from "../../i18n/translate";
const CYBER_MODALS = {
  fr: {
    deleteBackupInstance: "Supprimer cette instance ? Les jobs associés seront également supprimés.",
    deleteBackupJob: "Supprimer le job « {name} » ?",
    deleteCampaignStep: "Êtes-vous sûr de vouloir supprimer cette étape ?",
    resetCampaign: "Remettre la campagne à zéro supprimera les snapshots de début et de fin. Vous pourrez ensuite la lancer à nouveau. Continuer ?"
  },
  en: {
    deleteBackupInstance: "Delete this instance? Associated jobs will also be removed.",
    deleteBackupJob: "Delete job « {name} »?",
    deleteCampaignStep: "Are you sure you want to delete this step?",
    resetCampaign: "Resetting the campaign will remove start and end snapshots. You can launch it again afterwards. Continue?"
  },
  de: {
    deleteBackupInstance: "Diese Instanz löschen? Zugehörige Jobs werden ebenfalls entfernt.",
    deleteBackupJob: "Job « {name} » löschen?",
    deleteCampaignStep: "Diesen Schritt wirklich löschen?",
    resetCampaign: "Das Zurücksetzen der Kampagne entfernt Start- und End-Snapshots. Sie können sie danach erneut starten. Fortfahren?"
  },
  it: {
    deleteBackupInstance: "Eliminare questa istanza? Anche i job associati saranno rimossi.",
    deleteBackupJob: "Eliminare il job « {name} »?",
    deleteCampaignStep: "Eliminare questo passaggio?",
    resetCampaign: "Azzerare la campagna rimuoverà gli snapshot iniziale e finale. Potrai rilanciarla in seguito. Continuare?"
  },
  es: {
    deleteBackupInstance: "¿Eliminar esta instancia? También se eliminarán los jobs asociados.",
    deleteBackupJob: "¿Eliminar el job « {name} »?",
    deleteCampaignStep: "¿Eliminar este paso?",
    resetCampaign: "Restablecer la campaña eliminará las instantáneas de inicio y fin. Podrá relanzarla después. ¿Continuar?"
  }
};
export const getCyberModalsCopy = createLocaleGetter(CYBER_MODALS);
