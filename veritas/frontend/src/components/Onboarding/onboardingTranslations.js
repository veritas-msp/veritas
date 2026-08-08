import { ONBOARDING_STEP_DEFINITIONS } from "./onboardingContent";
const WEEKDAYS_FR = {
  0: "Dimanche",
  1: "Lundi",
  2: "Mardi",
  3: "Mercredi",
  4: "Jeudi",
  5: "Vendredi",
  6: "Samedi"
};
const WEEKDAYS_EN = {
  0: "Sunday",
  1: "Monday",
  2: "Tuesday",
  3: "Wednesday",
  4: "Thursday",
  5: "Friday",
  6: "Saturday"
};
const WEEKDAYS_DE = {
  0: "Sonntag",
  1: "Montag",
  2: "Dienstag",
  3: "Mittwoch",
  4: "Donnerstag",
  5: "Freitag",
  6: "Samstag"
};
const WEEKDAYS_IT = {
  0: "Domenica",
  1: "Lunedì",
  2: "Martedì",
  3: "Mercoledì",
  4: "Giovedì",
  5: "Venerdì",
  6: "Sabato"
};
const WEEKDAYS_ES = {
  0: "Domingo",
  1: "Lunes",
  2: "Martes",
  3: "Miércoles",
  4: "Jueves",
  5: "Viernes",
  6: "Sábado"
};
function buildForms(weekdays, overrides = {}) {
  return {
    shared: {
      loading: overrides.loading,
      loadError: overrides.loadError,
      loadPartialError: overrides.loadPartialError,
      saveError: overrides.saveError
    },
    identity: {
      organizationName: overrides.identityOrgName,
      organizationNamePlaceholder: overrides.identityOrgPlaceholder,
      employeeRange: overrides.employeeRange,
      employeeRangePlaceholder: overrides.employeeRangePlaceholder,
      employeeRangeRequired: overrides.employeeRangeRequired,
      address: overrides.address,
      addressPlaceholder: overrides.addressPlaceholder,
      website: overrides.website,
      websitePlaceholder: overrides.websitePlaceholder,
      nameRequired: overrides.nameRequired,
      saveSuccess: overrides.identitySaveSuccess
    },
    support: {
      supportEmail: overrides.supportEmail,
      supportEmailPlaceholder: overrides.supportEmailPlaceholder,
      supportPhone: overrides.supportPhone,
      supportPhonePlaceholder: overrides.supportPhonePlaceholder,
      timezone: overrides.timezone,
      saveSuccess: overrides.supportSaveSuccess
    },
    hours: {
      title: overrides.hoursTitle,
      hint: overrides.hoursHint,
      applyWeekdaysTemplate: overrides.applyWeekdaysTemplate,
      scheduleDay: overrides.scheduleDay,
      scheduleOpen: overrides.scheduleOpen,
      scheduleFrom: overrides.scheduleFrom,
      scheduleTo: overrides.scheduleTo,
      scheduleOpenYes: overrides.scheduleOpenYes,
      scheduleClosed: overrides.scheduleClosed,
      scheduleSummaryNone: overrides.scheduleSummaryNone,
      weekdays,
      saveSuccess: overrides.hoursSaveSuccess
    },
    agents: {
      hint: overrides.agentsHint,
      countLabel: overrides.agentsCountLabel,
      limitReachedBefore: overrides.agentsLimitReachedBefore,
      limitReachedAfter: overrides.agentsLimitReachedAfter,
      rosterAria: overrides.agentsRosterAria,
      progressAria: overrides.agentsProgressAria,
      slotEmpty: overrides.agentsSlotEmpty,
      inviteTitle: overrides.agentsInviteTitle,
      inviteLead: overrides.agentsInviteLead,
      nameLabel: overrides.agentsNameLabel,
      namePlaceholder: overrides.agentsNamePlaceholder,
      emailLabel: overrides.agentsEmailLabel,
      emailPlaceholder: overrides.agentsEmailPlaceholder,
      passwordLabel: overrides.agentsPasswordLabel,
      passwordPlaceholder: overrides.agentsPasswordPlaceholder,
      generatePassword: overrides.agentsGeneratePassword,
      showPassword: overrides.agentsShowPassword,
      hidePassword: overrides.agentsHidePassword,
      inviteButton: overrides.agentsInviteButton,
      inviting: overrides.agentsInviting,
      inviteSuccess: overrides.agentsInviteSuccess,
      invalidEmail: overrides.agentsInvalidEmail,
      passwordTooShort: overrides.agentsPasswordTooShort,
      createError: overrides.agentsCreateError
    },
    license: {
      keyLabel: overrides.licenseKeyLabel,
      keyPlaceholder: overrides.licenseKeyPlaceholder,
      keyHint: overrides.licenseKeyHint,
      alreadyActive: overrides.licenseAlreadyActive,
      pricingLink: overrides.licensePricingLink,
      recoverLink: overrides.licenseRecoverLink,
      activating: overrides.licenseActivating,
      activateError: overrides.licenseActivateError
    }
  };
}
const fr = {
  layout: {
    title: "Premiers pas",
    subtitle: "Un guide pas à pas pour installer et paramétrer votre environnement.",
    discord: "Rejoindre Veritas sur Discord",
    discordHint: "Échangez avec d'autres administrateurs MSP de la communauté.",
    communityTitle: "Communauté & ressources",
    linkDiscord: "Discord",
    linkWebsite: "Site web",
    linkGithub: "GitHub",
    websiteAria: "Site Veritas — veritas-msp.com",
    githubAria: "Code source Veritas sur GitHub",
    communityHint: "Aide, doc, actualités et open source — au même endroit."
  },
  ui: {
    stepKicker: (step, total) => `Étape ${step} sur ${total}`,
    previous: "Précédent",
    continue: "Continuer",
    saving: "Enregistrement…",
    complete: "Lancer Veritas",
    skip: "Passer le guide pour l'instant",
    skipLicenseStep: "Passer cette étape",
    activateAndContinue: "Activer et continuer",
    activateAndFinish: "Activer et terminer",
    resumeFab: "Reprendre le guide",
    resumeFabAria: "Reprendre le guide de démarrage",
    themeUseLight: "Passer en mode clair",
    themeUseDark: "Passer en mode sombre"
  },
  forms: buildForms(WEEKDAYS_FR, {
    loading: "Chargement…",
    loadError: "Impossible de charger les paramètres",
    loadPartialError: "Certains paramètres n'ont pas pu être chargés, valeurs par défaut utilisées",
    saveError: "Erreur lors de l'enregistrement",
    identityOrgName: "Nom commercial ou raison sociale",
    identityOrgPlaceholder: "Dupont Informatique",
    employeeRange: "Effectif de votre équipe",
    employeeRangePlaceholder: "Sélectionner une fourchette",
    employeeRangeRequired: "Indiquez l'effectif de votre équipe",
    address: "Adresse du siège",
    addressPlaceholder: "12 rue de la République, 33000 Bordeaux",
    website: "Site web public",
    websitePlaceholder: "https://www.votre-msp.fr",
    nameRequired: "Le nom commercial ou la raison sociale est obligatoire",
    identitySaveSuccess: "Identité enregistrée",
    supportEmail: "E-mail support",
    supportEmailPlaceholder: "support@votre-msp.fr",
    supportPhone: "Téléphone support",
    supportPhonePlaceholder: "+33 5 56 00 00 00",
    timezone: "Fuseau horaire",
    supportSaveSuccess: "Contact support enregistré",
    hoursTitle: "Plages d'ouverture",
    hoursHint: "Définissez quand votre équipe est joignable : base de vos engagements de service et du calcul des SLA.",
    applyWeekdaysTemplate: "Lun–Ven 9h–18h",
    scheduleDay: "Jour",
    scheduleOpen: "Ouvert",
    scheduleFrom: "Début",
    scheduleTo: "Fin",
    scheduleOpenYes: "Oui",
    scheduleClosed: "Fermé",
    scheduleSummaryNone: "Aucun jour d'ouverture configuré",
    hoursSaveSuccess: "Horaires enregistrés",
    agentsHint: max => max != null ? `Déployez vos techniciens et commerciaux sur la plateforme : ils serviront vos clients et identifieront des opportunités de prestations. En édition Community, vous pouvez créer jusqu'à ${max} agents MSP.` : "Déployez vos techniciens et commerciaux sur la plateforme : ils serviront vos clients et identifieront des opportunités de prestations.",
    agentsCountLabel: (count, max) => {
      if (max != null) {
        return count <= 1 ? `${count} / ${max} agent MSP sur la plateforme` : `${count} / ${max} agents MSP sur la plateforme`;
      }
      return count <= 1 ? "1 agent MSP sur la plateforme" : `${count} agents MSP sur la plateforme`;
    },
    agentsLimitReachedBefore: max => `Limite Community : ${max} agents MSP maximum. Passez à `,
    agentsLimitReachedAfter: " pour en ajouter davantage.",
    agentsRosterAria: "Agents sur Veritas",
    agentsProgressAria: max => `Progression des agents MSP, maximum ${max}`,
    agentsSlotEmpty: "Place libre",
    agentsInviteTitle: "Invitez un agent",
    agentsInviteLead: "Ajoutez un agent en quelques secondes, sans quitter le guide.",
    agentsNameLabel: "Prénom ou pseudo",
    agentsNamePlaceholder: "Marie",
    agentsEmailLabel: "E-mail pro",
    agentsEmailPlaceholder: "marie@votre-msp.fr",
    agentsPasswordLabel: "Mot de passe provisoire",
    agentsPasswordPlaceholder: "6 caractères minimum",
    agentsGeneratePassword: "Générer",
    agentsShowPassword: "Afficher le mot de passe",
    agentsHidePassword: "Masquer le mot de passe",
    agentsInviteButton: "Ajouter un agent",
    agentsInviting: "Ajout en cours…",
    agentsInviteSuccess: name => `${name} est ajouté !`,
    agentsInvalidEmail: "Adresse e-mail invalide",
    agentsPasswordTooShort: "Mot de passe trop court (6 caractères minimum)",
    agentsCreateError: "Échec de la création de l'agent",
    licenseKeyLabel: "Clé de licence Veritas Pro",
    licenseKeyPlaceholder: "VRT-PRO-XXXX-XXXX-XXXX-XXXX",
    licenseKeyHint: "Reçue après souscription. Vous pourrez l'ajouter plus tard dans Administration → Licence.",
    licenseAlreadyActive: "Veritas Pro est actif, tous les leviers commerciaux et opérationnels sont débloqués.",
    licensePricingLink: "Découvrir Veritas Pro",
    licenseRecoverLink: "Récupérer ma clé",
    licenseActivating: "Activation…",
    licenseActivateError: "Activation de la licence impossible"
  }),
  steps: [{
    label: "Bienvenue",
    title: "Merci d'avoir choisi Veritas",
    lead: "Toute votre stack MSP, réunie dans un seul outil, gratuitement.",
    pillars: [{
      icon: "mdi:clipboard-text-clock-outline",
      title: "PSA",
      text: "Tickets, contrats, temps et facturation réunis. Pilotez projets, ressources et finances au même endroit."
    }, {
      icon: "mdi:lifebuoy",
      title: "ITSM",
      text: "Pilotez incidents, demandes et SLA. Structurez votre service helpdesk et vos engagements de service."
    }, {
      icon: "mdi:monitor-eye",
      title: "RMM",
      text: "Surveillez et gérez un parc informatique ou une infrastructure à distance. Anticipez les incidents avant qu'ils ne deviennent des pannes."
    }, {
      icon: "mdi:puzzle-plus-outline",
      title: "INTEGRATION",
      text: "Connectez vos solutions antivirale, antispam, de sauvegarde, Microsoft Entra, Google Workspace et bien plus."
    }],
    paragraphs: ["Prenons un moment pour configurer votre solution sur mesure, quelques étapes pour adapter Veritas à votre activité MSP."]
  }, {
    label: "Identité",
    title: "Votre société MSP",
    lead: "Renseignez l'identité de votre structure : elle apparaîtra sur vos livrables et communications auprès de vos clients."
  }, {
    label: "Support",
    title: "Coordonnées support",
    lead: "Ces coordonnées seront celles que vos clients utiliseront pour vous joindre."
  }, {
    label: "Horaires",
    title: "Vos horaires support",
    lead: "Paramétrez la disponibilité de votre équipe : vos engagements de service et le calcul des SLA s'appuient sur ces plages."
  }, {
    label: "Agents",
    title: "Vos agents",
    lead: "Invitez vos agents sur Veritas : techniciens et commerciaux y collaborent au quotidien pour piloter et développer votre activité MSP.",
    bullets: ["Un compte par technicien ou commercial", "Support, delivery et vente sur la même plateforme", "Ajoutez des agents au fil de votre croissance"],
    actionLabel: "Créer un agent"
  }, {
    label: "Licence",
    title: "Passez à Veritas Pro",
    leadBefore: "Passez à la vitesse supérieure : activez ",
    leadAfter: " et débloquez le plein potentiel de la plateforme pour accélérer votre croissance MSP."
  }, {
    label: "C'est parti",
    title: "Votre plateforme est prête",
    lead: "Tout est prêt : lancez Veritas et pilotez votre activité MSP au quotidien.",
    bullets: ["Entreprises, parc et contrats au même endroit", "Support, prestations et services réunis", "Supervision active et leviers pour développer votre activité"]
  }]
};
const en = {
  layout: {
    title: "Getting started",
    subtitle: "A step-by-step guide to set up your MSP workspace.",
    discord: "Join Veritas on Discord",
    discordHint: "Connect with other MSP administrators in the community.",
    communityTitle: "Community & resources",
    linkDiscord: "Discord",
    linkWebsite: "Website",
    linkGithub: "GitHub",
    websiteAria: "Veritas website — veritas-msp.com",
    githubAria: "Veritas source code on GitHub",
    communityHint: "Help, docs, updates and open source — all in one place."
  },
  ui: {
    stepKicker: (step, total) => `Step ${step} of ${total}`,
    previous: "Previous",
    continue: "Continue",
    saving: "Saving…",
    complete: "Launch Veritas",
    skip: "Skip the guide for now",
    skipLicenseStep: "Skip this step",
    activateAndContinue: "Activate and continue",
    activateAndFinish: "Activate and finish",
    resumeFab: "Resume guide",
    resumeFabAria: "Resume getting started guide",
    themeUseLight: "Switch to light mode",
    themeUseDark: "Switch to dark mode"
  },
  forms: buildForms(WEEKDAYS_EN, {
    loading: "Loading…",
    loadError: "Unable to load settings",
    loadPartialError: "Some settings could not be loaded, using defaults",
    saveError: "Error while saving",
    identityOrgName: "Trade or legal name",
    identityOrgPlaceholder: "Acme IT Services",
    employeeRange: "Team size",
    employeeRangePlaceholder: "Select a range",
    employeeRangeRequired: "Please select your team size",
    address: "Headquarters address",
    addressPlaceholder: "120 Congress Street, Boston, MA 02110",
    website: "Public website",
    websitePlaceholder: "https://www.your-msp.com",
    nameRequired: "Trade or legal name is required",
    identitySaveSuccess: "Identity saved",
    supportEmail: "Support email",
    supportEmailPlaceholder: "support@your-msp.com",
    supportPhone: "Support phone",
    supportPhonePlaceholder: "+1 555 000 0000",
    timezone: "Time zone",
    supportSaveSuccess: "Support contact saved",
    hoursTitle: "Opening hours",
    hoursHint: "Set when your team is reachable, the basis for service commitments and SLA calculation.",
    applyWeekdaysTemplate: "Mon–Fri 9am–6pm",
    scheduleDay: "Day",
    scheduleOpen: "Open",
    scheduleFrom: "From",
    scheduleTo: "To",
    scheduleOpenYes: "Yes",
    scheduleClosed: "Closed",
    scheduleSummaryNone: "No opening days configured",
    hoursSaveSuccess: "Hours saved",
    agentsHint: max => max != null ? `Deploy your technicians and sales staff on the platform: they will serve clients and spot service opportunities. On Community edition, you can create up to ${max} MSP agents.` : "Deploy your technicians and sales staff on the platform: they will serve clients and spot service opportunities.",
    agentsCountLabel: (count, max) => {
      if (max != null) {
        return count === 1 ? `${count} / ${max} MSP agent on the platform` : `${count} / ${max} MSP agents on the platform`;
      }
      return count === 1 ? "1 MSP agent on the platform" : `${count} MSP agents on the platform`;
    },
    agentsLimitReachedBefore: max => `Community limit: ${max} MSP agents maximum. Upgrade to `,
    agentsLimitReachedAfter: " to add more.",
    agentsRosterAria: "Agents on Veritas",
    agentsProgressAria: max => `MSP agent progress, maximum ${max}`,
    agentsSlotEmpty: "Open slot",
    agentsInviteTitle: "Invite an agent",
    agentsInviteLead: "Add an agent in seconds without leaving the guide.",
    agentsNameLabel: "First name or nickname",
    agentsNamePlaceholder: "Alex",
    agentsEmailLabel: "Work email",
    agentsEmailPlaceholder: "alex@your-msp.com",
    agentsPasswordLabel: "Temporary password",
    agentsPasswordPlaceholder: "6 characters minimum",
    agentsGeneratePassword: "Generate",
    agentsShowPassword: "Show password",
    agentsHidePassword: "Hide password",
    agentsInviteButton: "Add agent",
    agentsInviting: "Adding…",
    agentsInviteSuccess: name => `${name} added!`,
    agentsInvalidEmail: "Invalid email address",
    agentsPasswordTooShort: "Password too short (6 characters minimum)",
    agentsCreateError: "Could not create the agent",
    licenseKeyLabel: "Veritas Pro license key",
    licenseKeyPlaceholder: "VRT-PRO-XXXX-XXXX-XXXX-XXXX",
    licenseKeyHint: "Received after subscription. You can also add it later in Administration → License.",
    licenseAlreadyActive: "Veritas Pro is active, all commercial and operational levers are unlocked.",
    licensePricingLink: "Discover Veritas Pro",
    licenseRecoverLink: "Recover my key",
    licenseActivating: "Activating…",
    licenseActivateError: "Unable to activate license"
  }),
  steps: [{
    label: "Welcome",
    title: "Thank you for choosing Veritas",
    lead: "Your full MSP stack, unified in one tool, for free.",
    pillars: [{
      icon: "mdi:clipboard-text-clock-outline",
      title: "PSA",
      text: "Tickets, contracts, time tracking, and billing together. Run projects, resources, and finances in one place."
    }, {
      icon: "mdi:lifebuoy",
      title: "ITSM",
      text: "Manage incidents, requests, and SLAs. Run your service desk and honor your service commitments."
    }, {
      icon: "mdi:monitor-eye",
      title: "RMM",
      text: "Monitor and manage IT estates or infrastructure remotely. Fix issues before they become outages."
    }, {
      icon: "mdi:puzzle-plus-outline",
      title: "INTEGRATION",
      text: "Connect your antivirus, antispam, backup, Microsoft Entra, and Google Workspace solutions, and more."
    }],
    paragraphs: ["Let's take a moment to tailor your setup, a few steps to shape Veritas around your MSP business."]
  }, {
    label: "Identity",
    title: "Your MSP company",
    lead: "Enter your company identity, it will appear on deliverables and client communications."
  }, {
    label: "Support",
    title: "Support contact",
    lead: "These details are what your clients will use to reach you, a professional, consistent point of contact."
  }, {
    label: "Hours",
    title: "Your support hours",
    lead: "Set your team's availability, your service commitments and SLA calculation rely on these windows."
  }, {
    label: "Agents",
    title: "Your agents",
    lead: "Invite your agents to Veritas: technicians and sales staff collaborate daily to run and grow your MSP.",
    bullets: ["One account per technician or sales rep", "Support, delivery, and sales on one platform", "Add agents as you grow"],
    actionLabel: "Create an agent"
  }, {
    label: "License",
    title: "Upgrade to Veritas Pro",
    leadBefore: "Level up: activate ",
    leadAfter: " and unlock the platform's full potential to accelerate your MSP growth."
  }, {
    label: "Go",
    title: "Your platform is ready",
    lead: "You're all set: launch Veritas and run your MSP day to day.",
    bullets: ["Clients, assets, and contracts in one place", "Support, services, and deliverables together", "Proactive monitoring and levers to grow your business"]
  }]
};
const de = {
  layout: {
    title: "Erste Schritte",
    subtitle: "Eine Schritt-für-Schritt-Anleitung zur Einrichtung Ihrer Umgebung.",
    discord: "Veritas auf Discord beitreten",
    discordHint: "Austausch mit anderen MSP-Administratoren in der Community.",
    communityTitle: "Community & Ressourcen",
    linkDiscord: "Discord",
    linkWebsite: "Website",
    linkGithub: "GitHub",
    websiteAria: "Veritas-Website — veritas-msp.com",
    githubAria: "Veritas-Quellcode auf GitHub",
    communityHint: "Hilfe, Docs, Updates und Open Source — alles an einem Ort."
  },
  ui: {
    stepKicker: (step, total) => `Schritt ${step} von ${total}`,
    previous: "Zurück",
    continue: "Weiter",
    saving: "Speichern…",
    complete: "Veritas starten",
    skip: "Anleitung vorerst überspringen",
    skipLicenseStep: "Diesen Schritt überspringen",
    activateAndContinue: "Aktivieren und weiter",
    activateAndFinish: "Aktivieren und abschließen",
    resumeFab: "Anleitung fortsetzen",
    resumeFabAria: "Einstiegsanleitung fortsetzen",
    themeUseLight: "Zum hellen Modus wechseln",
    themeUseDark: "Zum dunklen Modus wechseln"
  },
  forms: buildForms(WEEKDAYS_DE, {
    loading: "Laden…",
    loadError: "Einstellungen konnten nicht geladen werden",
    loadPartialError: "Einige Einstellungen konnten nicht geladen werden, Standardwerte verwendet",
    saveError: "Fehler beim Speichern",
    identityOrgName: "Handels- oder Firmenname",
    identityOrgPlaceholder: "Muster IT GmbH",
    employeeRange: "Teamgröße",
    employeeRangePlaceholder: "Bereich auswählen",
    employeeRangeRequired: "Bitte wählen Sie die Teamgröße",
    address: "Adresse des Hauptsitzes",
    addressPlaceholder: "Musterstraße 12, 10115 Berlin",
    website: "Öffentliche Webseite",
    websitePlaceholder: "https://www.ihr-msp.de",
    nameRequired: "Handels- oder Firmenname ist erforderlich",
    identitySaveSuccess: "Identität gespeichert",
    supportEmail: "Support-E-Mail",
    supportEmailPlaceholder: "support@ihr-msp.de",
    supportPhone: "Support-Telefon",
    supportPhonePlaceholder: "+49 30 0000000",
    timezone: "Zeitzone",
    supportSaveSuccess: "Support-Kontakt gespeichert",
    hoursTitle: "Öffnungszeiten",
    hoursHint: "Legen Sie fest, wann Ihr Team erreichbar ist, Grundlage für Servicezusagen und SLA-Berechnung.",
    applyWeekdaysTemplate: "Mo–Fr 9–18 Uhr",
    scheduleDay: "Tag",
    scheduleOpen: "Offen",
    scheduleFrom: "Von",
    scheduleTo: "Bis",
    scheduleOpenYes: "Ja",
    scheduleClosed: "Geschlossen",
    scheduleSummaryNone: "Keine Öffnungstage konfiguriert",
    hoursSaveSuccess: "Öffnungszeiten gespeichert",
    agentsHint: max => max != null ? `Setzen Sie Techniker und Vertrieb auf der Plattform ein: sie bedienen Kunden und erkennen Verkaufschancen. In der Community-Edition können Sie bis zu ${max} MSP-Agenten anlegen.` : "Setzen Sie Techniker und Vertrieb auf der Plattform ein: sie bedienen Kunden und erkennen Verkaufschancen.",
    agentsCountLabel: (count, max) => {
      if (max != null) {
        return count === 1 ? `${count} / ${max} MSP-Agent auf der Plattform` : `${count} / ${max} MSP-Agenten auf der Plattform`;
      }
      return count === 1 ? "1 MSP-Agent auf der Plattform" : `${count} MSP-Agenten auf der Plattform`;
    },
    agentsLimitReachedBefore: max => `Community-Limit: maximal ${max} MSP-Agenten. Wechseln Sie zu `,
    agentsLimitReachedAfter: ", um weitere hinzuzufügen.",
    agentsRosterAria: "Agenten auf Veritas",
    agentsProgressAria: max => `Fortschritt MSP-Agenten, maximal ${max}`,
    agentsSlotEmpty: "Freier Platz",
    agentsInviteTitle: "Agent einladen",
    agentsInviteLead: "Fügen Sie in wenigen Sekunden einen Agenten hinzu, ohne den Guide zu verlassen.",
    agentsNameLabel: "Vorname oder Spitzname",
    agentsNamePlaceholder: "Anna",
    agentsEmailLabel: "Geschäftliche E-Mail",
    agentsEmailPlaceholder: "anna@ihr-msp.de",
    agentsPasswordLabel: "Temporäres Passwort",
    agentsPasswordPlaceholder: "Mindestens 6 Zeichen",
    agentsGeneratePassword: "Generieren",
    agentsShowPassword: "Passwort anzeigen",
    agentsHidePassword: "Passwort verbergen",
    agentsInviteButton: "Agent hinzufügen",
    agentsInviting: "Wird hinzugefügt…",
    agentsInviteSuccess: name => `${name} wurde hinzugefügt!`,
    agentsInvalidEmail: "Ungültige E-Mail-Adresse",
    agentsPasswordTooShort: "Passwort zu kurz (mindestens 6 Zeichen)",
    agentsCreateError: "Agent konnte nicht erstellt werden",
    licenseKeyLabel: "Veritas Pro Lizenzschlüssel",
    licenseKeyPlaceholder: "VRT-PRO-XXXX-XXXX-XXXX-XXXX",
    licenseKeyHint: "Nach dem Abonnement erhalten. Später auch unter Administration → Lizenz möglich.",
    licenseAlreadyActive: "Veritas Pro ist aktiv, alle kommerziellen und operativen Hebel sind freigeschaltet.",
    licensePricingLink: "Veritas Pro entdecken",
    licenseRecoverLink: "Schlüssel wiederherstellen",
    licenseActivating: "Aktivierung…",
    licenseActivateError: "Lizenzaktivierung nicht möglich"
  }),
  steps: [{
    label: "Willkommen",
    title: "Danke für Ihre Wahl von Veritas",
    lead: "Ihre gesamte MSP-Stack, vereint in einem Tool, kostenlos.",
    pillars: [{
      icon: "mdi:clipboard-text-clock-outline",
      title: "PSA",
      text: "Tickets, Verträge, Zeiterfassung und Abrechnung an einem Ort. Projekte, Ressourcen und Finanzen steuern."
    }, {
      icon: "mdi:lifebuoy",
      title: "ITSM",
      text: "Incidents, Anfragen und SLAs steuern. Service Desk und Serviceverpflichtungen strukturieren."
    }, {
      icon: "mdi:monitor-eye",
      title: "RMM",
      text: "Überwachen und verwalten Sie IT-Parks oder Infrastrukturen aus der Ferne. Beheben Sie Probleme, bevor sie zu Ausfällen werden."
    }, {
      icon: "mdi:puzzle-plus-outline",
      title: "INTEGRATION",
      text: "Antivirus, Antispam, Backup-Lösungen, Microsoft Entra, Google Workspace und mehr anbinden."
    }],
    paragraphs: ["Nehmen wir uns einen Moment, um Ihre maßgeschneiderte Lösung einzurichten, wenige Schritte, um Veritas an Ihr MSP anzupassen."]
  }, {
    label: "Identität",
    title: "Ihr MSP-Unternehmen",
    lead: "Hinterlegen Sie die Identität Ihrer Firma, sie erscheint auf Lieferungen und in der Kommunikation mit Ihren Kunden."
  }, {
    label: "Support",
    title: "Support-Kontakt",
    lead: "Diese Angaben nutzen Ihre Kunden, um Sie zu erreichen, ein professioneller, einheitlicher Ansprechpartner."
  }, {
    label: "Zeiten",
    title: "Ihre Support-Zeiten",
    lead: "Definieren Sie die Erreichbarkeit Ihres Teams, darauf basieren Ihre Servicezusagen und die SLA-Berechnung."
  }, {
    label: "Agenten",
    title: "Ihre Agenten",
    lead: "Laden Sie Ihre Agenten zu Veritas ein: Techniker und Vertrieb arbeiten dort täglich zusammen, um Ihr MSP zu steuern und auszubauen.",
    bullets: ["Ein Konto pro Techniker oder Vertriebler", "Support, Delivery und Vertrieb auf einer Plattform", "Weitere Agenten mit Ihrem Wachstum hinzufügen"],
    actionLabel: "Agent anlegen"
  }, {
    label: "Lizenz",
    title: "Wechseln Sie zu Veritas Pro",
    leadBefore: "Schalten Sie eine Stufe höher: Aktivieren Sie ",
    leadAfter: " und entfalten Sie das volle Potenzial der Plattform für Ihr MSP-Wachstum."
  }, {
    label: "Los",
    title: "Ihre Plattform ist bereit",
    lead: "Alles ist bereit: Starten Sie Veritas und steuern Sie Ihr MSP im Alltag.",
    bullets: ["Unternehmen, Inventar und Verträge an einem Ort", "Support, Leistungen und Services vereint", "Aktives Monitoring und Hebel für Ihr Wachstum"]
  }]
};
const it = {
  layout: {
    title: "Primi passi",
    subtitle: "Una guida passo passo per configurare il vostro ambiente.",
    discord: "Unisciti a Veritas su Discord",
    discordHint: "Confrontati con altri amministratori MSP della community.",
    communityTitle: "Community e risorse",
    linkDiscord: "Discord",
    linkWebsite: "Sito web",
    linkGithub: "GitHub",
    websiteAria: "Sito Veritas — veritas-msp.com",
    githubAria: "Codice sorgente Veritas su GitHub",
    communityHint: "Aiuto, documentazione, aggiornamenti e open source — tutto in un posto."
  },
  ui: {
    stepKicker: (step, total) => `Passo ${step} di ${total}`,
    previous: "Indietro",
    continue: "Continua",
    saving: "Salvataggio…",
    complete: "Avvia Veritas",
    skip: "Salta la guida per ora",
    skipLicenseStep: "Salta questo passaggio",
    activateAndContinue: "Attiva e continua",
    activateAndFinish: "Attiva e termina",
    resumeFab: "Riprendi la guida",
    resumeFabAria: "Riprendi la guida introduttiva",
    themeUseLight: "Passa alla modalità chiara",
    themeUseDark: "Passa alla modalità scura"
  },
  forms: buildForms(WEEKDAYS_IT, {
    loading: "Caricamento…",
    loadError: "Impossibile caricare le impostazioni",
    loadPartialError: "Alcune impostazioni non sono state caricate, valori predefiniti usati",
    saveError: "Errore durante il salvataggio",
    identityOrgName: "Nome commerciale o ragione sociale",
    identityOrgPlaceholder: "Rossi Informatica",
    employeeRange: "Dimensione del team",
    employeeRangePlaceholder: "Seleziona un intervallo",
    employeeRangeRequired: "Seleziona la dimensione del team",
    address: "Indirizzo della sede",
    addressPlaceholder: "Via Garibaldi 12, 20121 Milano",
    website: "Sito web pubblico",
    websitePlaceholder: "https://www.tuo-msp.it",
    nameRequired: "Il nome commerciale o la ragione sociale è obbligatorio",
    identitySaveSuccess: "Identità salvata",
    supportEmail: "E-mail supporto",
    supportEmailPlaceholder: "supporto@tuo-msp.it",
    supportPhone: "Telefono supporto",
    supportPhonePlaceholder: "+39 02 0000000",
    timezone: "Fuso orario",
    supportSaveSuccess: "Contatto supporto salvato",
    hoursTitle: "Orari di apertura",
    hoursHint: "Definisci quando il team è raggiungibile, base degli impegni di servizio e del calcolo SLA.",
    applyWeekdaysTemplate: "Lun–Ven 9–18",
    scheduleDay: "Giorno",
    scheduleOpen: "Aperto",
    scheduleFrom: "Inizio",
    scheduleTo: "Fine",
    scheduleOpenYes: "Sì",
    scheduleClosed: "Chiuso",
    scheduleSummaryNone: "Nessun giorno di apertura configurato",
    hoursSaveSuccess: "Orari salvati",
    agentsHint: max => max != null ? `Distribuisci tecnici e commerciali sulla piattaforma: serviranno i clienti e individueranno opportunità di prestazioni. In edizione Community, puoi creare fino a ${max} agenti MSP.` : "Distribuisci tecnici e commerciali sulla piattaforma: serviranno i clienti e individueranno opportunità di prestazioni.",
    agentsCountLabel: (count, max) => {
      if (max != null) {
        return count === 1 ? `${count} / ${max} agente MSP sulla piattaforma` : `${count} / ${max} agenti MSP sulla piattaforma`;
      }
      return count === 1 ? "1 agente MSP sulla piattaforma" : `${count} agenti MSP sulla piattaforma`;
    },
    agentsLimitReachedBefore: max => `Limite Community: massimo ${max} agenti MSP. Passa a `,
    agentsLimitReachedAfter: " per aggiungerne altri.",
    agentsRosterAria: "Agenti su Veritas",
    agentsProgressAria: max => `Progresso agenti MSP, massimo ${max}`,
    agentsSlotEmpty: "Posto libero",
    agentsInviteTitle: "Invita un agente",
    agentsInviteLead: "Aggiungi un agente in pochi secondi, senza uscire dalla guida.",
    agentsNameLabel: "Nome o soprannome",
    agentsNamePlaceholder: "Luca",
    agentsEmailLabel: "E-mail professionale",
    agentsEmailPlaceholder: "luca@tuo-msp.it",
    agentsPasswordLabel: "Password provvisoria",
    agentsPasswordPlaceholder: "Minimo 6 caratteri",
    agentsGeneratePassword: "Genera",
    agentsShowPassword: "Mostra password",
    agentsHidePassword: "Nascondi password",
    agentsInviteButton: "Aggiungi agente",
    agentsInviting: "Aggiunta in corso…",
    agentsInviteSuccess: name => `${name} è stato aggiunto!`,
    agentsInvalidEmail: "Indirizzo e-mail non valido",
    agentsPasswordTooShort: "Password troppo corta (minimo 6 caratteri)",
    agentsCreateError: "Impossibile creare l'agente",
    licenseKeyLabel: "Chiave di licenza Veritas Pro",
    licenseKeyPlaceholder: "VRT-PRO-XXXX-XXXX-XXXX-XXXX",
    licenseKeyHint: "Ricevuta dopo l'abbonamento. Potrai aggiungerla anche in Amministrazione → Licenza.",
    licenseAlreadyActive: "Veritas Pro è attivo, tutte le leve commerciali e operative sono sbloccate.",
    licensePricingLink: "Scopri Veritas Pro",
    licenseRecoverLink: "Recupera la mia chiave",
    licenseActivating: "Attivazione…",
    licenseActivateError: "Impossibile attivare la licenza"
  }),
  steps: [{
    label: "Benvenuto",
    title: "Grazie per aver scelto Veritas",
    lead: "L'intero stack MSP, riunito in un unico strumento, gratuitamente.",
    pillars: [{
      icon: "mdi:clipboard-text-clock-outline",
      title: "PSA",
      text: "Ticket, contratti, tempi e fatturazione insieme. Gestisci progetti, risorse e finanze in un solo posto."
    }, {
      icon: "mdi:lifebuoy",
      title: "ITSM",
      text: "Gestisci incidenti, richieste e SLA. Organizza il service desk e gli impegni di servizio."
    }, {
      icon: "mdi:monitor-eye",
      title: "RMM",
      text: "Monitora e gestisci un parco informatico o un'infrastruttura da remoto. Intervieni prima che i problemi diventino guasti."
    }, {
      icon: "mdi:puzzle-plus-outline",
      title: "INTEGRATION",
      text: "Collega antivirus, antispam, soluzioni di backup, Microsoft Entra, Google Workspace e altro."
    }],
    paragraphs: ["Prendiamoci un momento per configurare la vostra soluzione su misura, pochi passi per adattare Veritas alla vostra attività MSP."]
  }, {
    label: "Identità",
    title: "La tua società MSP",
    lead: "Inserisci l'identità della tua struttura: comparirà su deliverable e comunicazioni verso i clienti."
  }, {
    label: "Supporto",
    title: "Contatto supporto",
    lead: "Questi recapiti saranno quelli che i tuoi clienti useranno per contattarti, un punto di contatto professionale e coerente."
  }, {
    label: "Orari",
    title: "I tuoi orari di supporto",
    lead: "Imposta la disponibilità del team: gli impegni di servizio e il calcolo degli SLA si basano su queste fasce."
  }, {
    label: "Agenti",
    title: "I tuoi agenti",
    lead: "Invita i tuoi agenti su Veritas: tecnici e commerciali collaborano ogni giorno per guidare e far crescere il tuo MSP.",
    bullets: ["Un account per tecnico o commerciale", "Supporto, delivery e vendita sulla stessa piattaforma", "Aggiungi agenti man mano che cresci"],
    actionLabel: "Crea un agente"
  }, {
    label: "Licenza",
    title: "Passa a Veritas Pro",
    leadBefore: "Passa alla velocità superiore: attiva ",
    leadAfter: " e sblocca il pieno potenziale della piattaforma per accelerare la crescita del tuo MSP."
  }, {
    label: "Via",
    title: "La tua piattaforma è pronta",
    lead: "Tutto è pronto: avvia Veritas e gestisci il tuo MSP ogni giorno.",
    bullets: ["Aziende, parco e contratti nello stesso posto", "Supporto, prestazioni e servizi insieme", "Supervisione attiva e leve per far crescere la tua attività"]
  }]
};
const es = {
  layout: {
    title: "Primeros pasos",
    subtitle: "Una guía paso a paso para configurar su entorno.",
    discord: "Únete a Veritas en Discord",
    discordHint: "Intercambie con otros administradores MSP de la comunidad.",
    communityTitle: "Comunidad y recursos",
    linkDiscord: "Discord",
    linkWebsite: "Sitio web",
    linkGithub: "GitHub",
    websiteAria: "Sitio web Veritas — veritas-msp.com",
    githubAria: "Código fuente de Veritas en GitHub",
    communityHint: "Ayuda, documentación, novedades y código abierto — en un solo lugar."
  },
  ui: {
    stepKicker: (step, total) => `Paso ${step} de ${total}`,
    previous: "Anterior",
    continue: "Continuar",
    saving: "Guardando…",
    complete: "Iniciar Veritas",
    skip: "Omitir la guía por ahora",
    skipLicenseStep: "Omitir este paso",
    activateAndContinue: "Activar y continuar",
    activateAndFinish: "Activar y terminar",
    resumeFab: "Reanudar la guía",
    resumeFabAria: "Reanudar la guía de inicio",
    themeUseLight: "Cambiar a modo claro",
    themeUseDark: "Cambiar a modo oscuro"
  },
  forms: buildForms(WEEKDAYS_ES, {
    loading: "Cargando…",
    loadError: "No se pudieron cargar los ajustes",
    loadPartialError: "Algunos ajustes no se cargaron, se usan valores por defecto",
    saveError: "Error al guardar",
    identityOrgName: "Nombre comercial o razón social",
    identityOrgPlaceholder: "García Informática",
    employeeRange: "Plantilla del equipo",
    employeeRangePlaceholder: "Seleccionar un rango",
    employeeRangeRequired: "Indique el tamaño de su equipo",
    address: "Dirección de la sede",
    addressPlaceholder: "Calle Mayor 12, 28013 Madrid",
    website: "Sitio web público",
    websitePlaceholder: "https://www.su-msp.es",
    nameRequired: "El nombre comercial o la razón social es obligatorio",
    identitySaveSuccess: "Identidad guardada",
    supportEmail: "Correo de soporte",
    supportEmailPlaceholder: "soporte@su-msp.es",
    supportPhone: "Teléfono de soporte",
    supportPhonePlaceholder: "+34 900 000 000",
    timezone: "Zona horaria",
    supportSaveSuccess: "Contacto de soporte guardado",
    hoursTitle: "Horario de apertura",
    hoursHint: "Defina cuándo su equipo está disponible, base de sus compromisos de servicio y del cálculo de SLA.",
    applyWeekdaysTemplate: "Lun–Vie 9h–18h",
    scheduleDay: "Día",
    scheduleOpen: "Abierto",
    scheduleFrom: "Inicio",
    scheduleTo: "Fin",
    scheduleOpenYes: "Sí",
    scheduleClosed: "Cerrado",
    scheduleSummaryNone: "Ningún día de apertura configurado",
    hoursSaveSuccess: "Horarios guardados",
    agentsHint: max => max != null ? `Despliegue técnicos y comerciales en la plataforma: atenderán a clientes y detectarán oportunidades de prestaciones. En edición Community, puede crear hasta ${max} agentes MSP.` : "Despliegue técnicos y comerciales en la plataforma: atenderán a clientes y detectarán oportunidades de prestaciones.",
    agentsCountLabel: (count, max) => {
      if (max != null) {
        return count === 1 ? `${count} / ${max} agente MSP en la plataforma` : `${count} / ${max} agentes MSP en la plataforma`;
      }
      return count === 1 ? "1 agente MSP en la plataforma" : `${count} agentes MSP en la plataforma`;
    },
    agentsLimitReachedBefore: max => `Límite Community: ${max} agentes MSP como máximo. Pase a `,
    agentsLimitReachedAfter: " para añadir más.",
    agentsRosterAria: "Agentes en Veritas",
    agentsProgressAria: max => `Progreso de agentes MSP, máximo ${max}`,
    agentsSlotEmpty: "Plaza libre",
    agentsInviteTitle: "Invite a un agente",
    agentsInviteLead: "Añada un agente en segundos sin salir de la guía.",
    agentsNameLabel: "Nombre o apodo",
    agentsNamePlaceholder: "Ana",
    agentsEmailLabel: "Correo profesional",
    agentsEmailPlaceholder: "ana@su-msp.es",
    agentsPasswordLabel: "Contraseña provisional",
    agentsPasswordPlaceholder: "Mínimo 6 caracteres",
    agentsGeneratePassword: "Generar",
    agentsShowPassword: "Mostrar contraseña",
    agentsHidePassword: "Ocultar contraseña",
    agentsInviteButton: "Añadir agente",
    agentsInviting: "Añadiendo…",
    agentsInviteSuccess: name => `¡${name} añadido!`,
    agentsInvalidEmail: "Correo electrónico no válido",
    agentsPasswordTooShort: "Contraseña demasiado corta (mínimo 6 caracteres)",
    agentsCreateError: "No se pudo crear el agente",
    licenseKeyLabel: "Clave de licencia Veritas Pro",
    licenseKeyPlaceholder: "VRT-PRO-XXXX-XXXX-XXXX-XXXX",
    licenseKeyHint: "Recibida tras la suscripción. También puede añadirla en Administración → Licencia.",
    licenseAlreadyActive: "Veritas Pro está activo, todas las palancas comerciales y operativas están desbloqueadas.",
    licensePricingLink: "Descubrir Veritas Pro",
    licenseRecoverLink: "Recuperar mi clave",
    licenseActivating: "Activando…",
    licenseActivateError: "No se pudo activar la licencia"
  }),
  steps: [{
    label: "Bienvenida",
    title: "Gracias por elegir Veritas",
    lead: "Todo su stack MSP, reunido en una sola herramienta, gratis.",
    pillars: [{
      icon: "mdi:clipboard-text-clock-outline",
      title: "PSA",
      text: "Tickets, contratos, tiempos y facturación juntos. Gestione proyectos, recursos y finanzas en un solo lugar."
    }, {
      icon: "mdi:lifebuoy",
      title: "ITSM",
      text: "Gestione incidentes, solicitudes y SLA. Estructure su service desk y sus compromisos de servicio."
    }, {
      icon: "mdi:monitor-eye",
      title: "RMM",
      text: "Supervise y gestione un parque informático o una infraestructura a distancia. Anticipe incidentes antes de que se conviertan en caídas."
    }, {
      icon: "mdi:puzzle-plus-outline",
      title: "INTEGRATION",
      text: "Conecte antivirus, antispam, soluciones de backup, Microsoft Entra, Google Workspace y más."
    }],
    paragraphs: ["Tomemos un momento para configurar su solución a medida, unos pasos para adaptar Veritas a su actividad MSP."]
  }, {
    label: "Identidad",
    title: "Su empresa MSP",
    lead: "Indique la identidad de su estructura: aparecerá en entregables y comunicaciones con sus clientes."
  }, {
    label: "Soporte",
    title: "Contacto de soporte",
    lead: "Estos datos serán los que sus clientes utilizarán para contactarle, un punto de contacto profesional y coherente."
  }, {
    label: "Horarios",
    title: "Sus horarios de soporte",
    lead: "Configure la disponibilidad de su equipo: sus compromisos de servicio y el cálculo de SLA se apoyan en estas franjas."
  }, {
    label: "Agentes",
    title: "Sus agentes",
    lead: "Invite a sus agentes a Veritas: técnicos y comerciales colaboran a diario para pilotar y hacer crecer su MSP.",
    bullets: ["Una cuenta por técnico o comercial", "Soporte, entrega y venta en la misma plataforma", "Añada agentes a medida que crece"],
    actionLabel: "Crear un agente"
  }, {
    label: "Licencia",
    title: "Pase a Veritas Pro",
    leadBefore: "Suba de nivel: active ",
    leadAfter: " y desbloquee todo el potencial de la plataforma para acelerar el crecimiento de su MSP."
  }, {
    label: "Listo",
    title: "Su plataforma está lista",
    lead: "Todo está listo: inicie Veritas y gestione su MSP a diario.",
    bullets: ["Empresas, parque y contratos en un solo lugar", "Soporte, prestaciones y servicios reunidos", "Supervisión activa y palancas para desarrollar su actividad"]
  }]
};
const ONBOARDING_TRANSLATIONS = {
  fr,
  en,
  de,
  it,
  es
};
export function getOnboardingContent(locale) {
  const code = String(locale || "fr").slice(0, 2).toLowerCase();
  const t = ONBOARDING_TRANSLATIONS[code] || ONBOARDING_TRANSLATIONS.fr;
  const steps = ONBOARDING_STEP_DEFINITIONS.map((definition, index) => {
    const copy = t.steps[index] || t.steps[0];
    return {
      ...definition,
      ...copy,
      actionLabel: copy.actionLabel
    };
  });
  return {
    layout: t.layout,
    ui: t.ui,
    forms: t.forms,
    steps
  };
}
export function getOnboardingUiStrings(locale) {
  const code = String(locale || "fr").slice(0, 2).toLowerCase();
  return (ONBOARDING_TRANSLATIONS[code] || ONBOARDING_TRANSLATIONS.fr).ui;
}
