const COPY = {
  fr: {
    title: "Thème",
    description: "Le thème classique conserve l’apparence actuelle. Steam habille toute l’interface — pages, fenêtres et contrôles — en clair ou en sombre.",
    label: "Apparence",
    classicLight: "Classique clair",
    classicLightDesc: "Palette actuelle, fond clair.",
    classicDark: "Classique sombre",
    classicDarkDesc: "Palette actuelle, fond sombre.",
    steamLight: "Steam clair",
    steamLightDesc: "Acier bleu et cyan, sur fond clair.",
    steamDark: "Steam sombre",
    steamDarkDesc: "Fond marine, panneaux acier et accents cyan.",
    saving: "Enregistrement…",
    saved: "Thème enregistré",
    error: "Impossible d’enregistrer le thème"
  },
  en: {
    title: "Theme",
    description: "Classic keeps the current look. Steam restyles the whole interface — pages, dialogs and controls — in light or dark.",
    label: "Appearance",
    classicLight: "Classic light",
    classicLightDesc: "Current palette, light background.",
    classicDark: "Classic dark",
    classicDarkDesc: "Current palette, dark background.",
    steamLight: "Steam light",
    steamLightDesc: "Steel blue and cyan on a light background.",
    steamDark: "Steam dark",
    steamDarkDesc: "Navy canvas, steel panels and cyan accents.",
    saving: "Saving…",
    saved: "Theme saved",
    error: "Unable to save the theme"
  },
  de: {
    title: "Design",
    description: "Klassisch behält das aktuelle Aussehen. Steam gestaltet die gesamte Oberfläche — Seiten, Fenster und Steuerelemente — hell oder dunkel.",
    label: "Darstellung",
    classicLight: "Klassisch hell",
    classicLightDesc: "Aktuelle Palette, heller Hintergrund.",
    classicDark: "Klassisch dunkel",
    classicDarkDesc: "Aktuelle Palette, dunkler Hintergrund.",
    steamLight: "Steam hell",
    steamLightDesc: "Stahlblau und Cyan auf hellem Hintergrund.",
    steamDark: "Steam dunkel",
    steamDarkDesc: "Marineblauer Grund, Stahlflächen und Cyan-Akzente.",
    saving: "Speichern…",
    saved: "Design gespeichert",
    error: "Design konnte nicht gespeichert werden"
  },
  it: {
    title: "Tema",
    description: "Classico mantiene l’aspetto attuale. Steam ridisegna tutta l’interfaccia — pagine, finestre e controlli — in chiaro o in scuro.",
    label: "Aspetto",
    classicLight: "Classico chiaro",
    classicLightDesc: "Palette attuale, sfondo chiaro.",
    classicDark: "Classico scuro",
    classicDarkDesc: "Palette attuale, sfondo scuro.",
    steamLight: "Steam chiaro",
    steamLightDesc: "Acciaio blu e ciano su sfondo chiaro.",
    steamDark: "Steam scuro",
    steamDarkDesc: "Sfondo blu notte, pannelli acciaio e accenti ciano.",
    saving: "Salvataggio…",
    saved: "Tema salvato",
    error: "Impossibile salvare il tema"
  },
  es: {
    title: "Tema",
    description: "Clásico conserva el aspecto actual. Steam viste toda la interfaz — páginas, ventanas y controles — en claro u oscuro.",
    label: "Apariencia",
    classicLight: "Clásico claro",
    classicLightDesc: "Paleta actual, fondo claro.",
    classicDark: "Clásico oscuro",
    classicDarkDesc: "Paleta actual, fondo oscuro.",
    steamLight: "Steam claro",
    steamLightDesc: "Acero azul y cian sobre fondo claro.",
    steamDark: "Steam oscuro",
    steamDarkDesc: "Fondo marino, paneles de acero y acentos cian.",
    saving: "Guardando…",
    saved: "Tema guardado",
    error: "No se pudo guardar el tema"
  }
};

export function getThemeAppearanceCopy(locale) {
  const code = String(locale || "fr").slice(0, 2).toLowerCase();
  return COPY[code] || COPY.fr;
}
