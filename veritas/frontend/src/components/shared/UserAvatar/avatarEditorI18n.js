import { createLocaleGetter } from "../../../i18n/translate";
const AVATAR_EDITOR_COPY = {
  fr: {
    currentLabel: "Photo affichée dans le chat support",
    currentHint: "Choisissez un avatar prédéfini ou importez votre photo (max. 2 Mo).",
    upload: "Importer une image",
    reset: "Réinitialiser",
    toast: {
      presetUpdated: "Avatar mis à jour",
      presetError: "Impossible d'enregistrer l'avatar",
      invalidFormat: "Formats acceptés : JPG, PNG, WebP",
      tooLarge: "Image trop volumineuse (max. 2 Mo)",
      photoSaved: "Photo de profil enregistrée",
      uploadError: "Impossible d'envoyer l'image",
      cleared: "Avatar réinitialisé",
      clearError: "Impossible de réinitialiser l'avatar"
    }
  },
  en: {
    currentLabel: "Photo shown in support chat",
    currentHint: "Choose a preset avatar or upload your photo (max. 2 MB).",
    upload: "Upload an image",
    reset: "Reset",
    toast: {
      presetUpdated: "Avatar updated",
      presetError: "Unable to save avatar",
      invalidFormat: "Accepted formats: JPG, PNG, WebP",
      tooLarge: "Image too large (max. 2 MB)",
      photoSaved: "Profile photo saved",
      uploadError: "Unable to upload image",
      cleared: "Avatar reset",
      clearError: "Unable to reset avatar"
    }
  },
  de: {
    currentLabel: "Foto im Support-Chat angezeigt",
    currentHint: "Wählen Sie einen vordefinierten Avatar oder laden Sie Ihr Foto hoch (max. 2 MB).",
    upload: "Bild hochladen",
    reset: "Zurücksetzen",
    toast: {
      presetUpdated: "Avatar aktualisiert",
      presetError: "Avatar konnte nicht gespeichert werden",
      invalidFormat: "Akzeptierte Formate: JPG, PNG, WebP",
      tooLarge: "Bild zu groß (max. 2 MB)",
      photoSaved: "Profilfoto gespeichert",
      uploadError: "Bild konnte nicht hochgeladen werden",
      cleared: "Avatar zurückgesetzt",
      clearError: "Avatar konnte nicht zurückgesetzt werden"
    }
  },
  it: {
    currentLabel: "Foto mostrata nella chat di supporto",
    currentHint: "Scegli un avatar predefinito o carica la tua foto (max. 2 MB).",
    upload: "Carica un'immagine",
    reset: "Reimposta",
    toast: {
      presetUpdated: "Avatar aggiornato",
      presetError: "Impossibile salvare l'avatar",
      invalidFormat: "Formati accettati: JPG, PNG, WebP",
      tooLarge: "Immagine troppo grande (max. 2 MB)",
      photoSaved: "Foto del profilo salvata",
      uploadError: "Impossibile caricare l'immagine",
      cleared: "Avatar reimpostato",
      clearError: "Impossibile reimpostare l'avatar"
    }
  },
  es: {
    currentLabel: "Foto mostrada en el chat de soporte",
    currentHint: "Elija un avatar predefinido o suba su foto (máx. 2 MB).",
    upload: "Subir una imagen",
    reset: "Restablecer",
    toast: {
      presetUpdated: "Avatar actualizado",
      presetError: "No se pudo guardar el avatar",
      invalidFormat: "Formatos aceptados: JPG, PNG, WebP",
      tooLarge: "Imagen demasiado grande (máx. 2 MB)",
      photoSaved: "Foto de perfil guardada",
      uploadError: "No se pudo subir la imagen",
      cleared: "Avatar restablecido",
      clearError: "No se pudo restablecer el avatar"
    }
  }
};
export const getAvatarEditorCopy = createLocaleGetter(AVATAR_EDITOR_COPY);
