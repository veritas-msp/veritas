/**
 * Changelog affiché dans Compte → Patch notes.
 * À chaque commit+push : bump package.json (root/frontend/backend) + ajouter une entrée ici.
 * Les notes sont rédigées en français (UI de page traduite via i18n).
 */
export const PATCH_NOTES = [
  {
    version: "1.0.2",
    date: "2026-09-03",
    highlights: [
      "Administration > Agents : les profils Administrateur et Super Admin peuvent désormais modifier un agent et lui attribuer un profil Administrateur ou Super Admin.",
      "L'attribution d'un accès administrateur reste réservée aux profils administrateurs, pour éviter toute élévation de privilèges."
    ]
  },
  {
    version: "1.0.1",
    date: "2026-09-03",
    highlights: [
      "Fiche périphérique RMM condensée : cartes système, processeur, mémoire et stockage plus compactes.",
      "Création d'un ticket support depuis le centre de supervision : contact principal, périphérique, description détaillée et catégorie « monitoring » préremplis.",
      "Onglet Supervision désormais visible par tous les profils, sans droits d'administration.",
      "Pages Mon compte et Patch notes alignées sur le header standard de l'application."
    ]
  },
  {
    version: "1.0.0",
    date: "2026-09-02",
    highlights: [
      "Version initiale de référence pour le suivi des patch notes Veritas."
    ]
  }
];
