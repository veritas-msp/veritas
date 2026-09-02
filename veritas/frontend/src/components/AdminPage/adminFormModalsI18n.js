import { createLocaleGetter, interpolate } from "../../i18n/translate";
const FORM_MODALS = {
  fr: {
    techNewsFeedForm: {
      eyebrow: "Veille technologique",
      createTitle: "Nouveau flux RSS",
      editTitle: "Modifier {name}",
      editFallback: "le flux",
      createSubtitle: "Ajoutez une source RSS/Atom pour alimenter la veille tech.",
      editSubtitle: "Mettez à jour la source, l'URL ou la priorité d'affichage.",
      sectionsAria: "Sections du flux RSS",
      sourceTitle: "Source",
      sourceDesc: "Indiquez le nom affiché sous chaque article et l'URL du flux RSS ou Atom.",
      sourceNameLabel: "Nom de la source",
      sourceNamePlaceholder: "Ex. ZDNet France",
      sourceNameHint: "Affiché sous chaque article dans la colonne actualités.",
      urlLabel: "URL du flux RSS/Atom",
      urlPlaceholder: "https://exemple.com/feed/",
      urlHint: "Doit commencer par http:// ou https://",
      displayTitle: "Affichage",
      displayDesc: "Choisissez la langue du flux, sa catégorie et son ordre de priorité.",
      localeLabel: "Langue",
      localeHint: "Indique la langue du contenu. Les flux par défaut sont en anglais.",
      sortOrderLabel: "Ordre d'affichage",
      sortOrderHint: "Plus petit = prioritaire.",
      feedActiveLabel: "Flux actif",
      feedActiveHint: "Seuls les flux actifs sont agrégés dans la colonne actualités.",
      noSource: "Sans source",
      addBtn: "Ajouter le flux",
      sections: {
        source: {
          label: "Source",
          description: "Nom et URL"
        },
        display: {
          label: "Affichage",
          description: "Langue, catégorie et ordre"
        }
      }
    },
    contractModuleOptionForm: {
      eyebrow: "Options contrat",
      createTitle: "Nouvelle option de contrat",
      editTitle: "Modifier {name}",
      editFallback: "l'option",
      createSubtitle: "Définissez une option affichée dans les fiches contrat client.",
      editSubtitle: "Mettez à jour le libellé, l'icône ou la visibilité de cette option.",
      sectionsAria: "Sections de l'option de contrat",
      identityTitle: "Identité",
      identityDesc: "Le libellé est visible dans l'application. La clé technique reste stable pour les données existantes.",
      moduleKeyLabel: "Clé technique",
      moduleKeyPlaceholder: "Ex. Support",
      moduleKeyHintCreate: "Optionnel. Laissez vide pour génération automatique (ex. Support, Curatif).",
      moduleKeyHintEdit: "Non modifiable après création.",
      displayLabel: "Libellé affiché",
      displayLabelPlaceholder: "Ex. Support 24/7",
      presentationTitle: "Présentation",
      presentationDesc: "Personnalisez l'icône et l'ordre d'affichage sur les fiches entreprise.",
      optionActiveLabel: "Option active",
      optionActiveHint: "Une option masquée conserve ses données mais n'apparaît plus dans l'application.",
      iconChangeLabel: "Changer l'icône",
      iconSearchPlaceholder: "Rechercher une icône…",
      iconSearchAria: "Rechercher une icône",
      iconClearSearch: "Effacer la recherche",
      iconPickerAria: "Choisir une icône",
      addBtn: "Ajouter l'option",
      sections: {
        identity: {
          label: "Identité",
          description: "Clé et libellé"
        },
        presentation: {
          label: "Présentation",
          description: "Icône et ordre"
        }
      }
    },
    equipmentFamilyForm: {
      createTitle: "Nouvelle famille de matériel",
      editTitle: "Modifier {name}",
      editFallback: "la famille",
      subtitle: "Configurez le type de matériel, ses champs et son affichage sur la cartographie.",
      systemSubtitle: "Ajoutez des champs personnalisés à cette famille intégrée. Les champs d'origine restent inchangés.",
      systemFieldsDesc: "Ajoutez des champs personnalisés. Les champs intégrés restent visibles ci-dessous, en lecture seule.",
      builtinFieldsTitle: "Champs intégrés",
      builtinFieldsDesc: "Ces champs sont fournis par Veritas. Ils ne sont pas modifiables ici.",
      builtinFieldBadge: "Intégré",
      extraFieldsTitle: "Champs personnalisés",
      identityTitle: "Identité de la famille",
      identityDesc: "Ex. Vidéoprojecteur, Imprimante réseau, Écran interactif…",
      labelPlaceholder: "Vidéoprojecteur",
      familyKeyLabel: "Clé technique",
      familyKeyPlaceholder: "videoprojecteur",
      sortOrderLabel: "Ordre d'affichage",
      enabledLabel: "Activée",
      fieldsTitle: "Champs du formulaire",
      fieldsDesc: "Définissez les informations à renseigner pour chaque matériel de cette famille.",
      noFields: "Aucun champ défini.",
      fieldOrderHint: "Glissez les champs pour définir l'ordre d'affichage dans le formulaire.",
      fieldOptionsLabel: "Choix de la liste (un par ligne)",
      fieldOptionsPlaceholder: "Option 1\nOption 2\nOption 3",
      dragHandleAria: "Déplacer le champ",
      fieldLabelPlaceholder: "Libellé du champ",
      fieldTypeCol: "Type",
      mapTitle: "Cartographie",
      mapDesc: "Choisissez l’icône de cette famille sur la fiche entreprise.",
      mapManagedElsewhere: "La position et la forme des tuiles se gèrent dans Administration → Configuration fiche → Cartographie.",
      mapPreviewHint: "Glissez un hexagone sur un autre pour les échanger, ou sur une case vide pour le déplacer.",
      mapMoveHint: "Cliquez un hexagone pour le sélectionner, puis utilisez les flèches.",
      mapBrickHint: "Cette famille s'affiche en brique latérale, pas sur le nid d'abeille.",
      selectedHexLabel: "Sélectionné",
      iconChangeLabel: "Changer l'icône",
      iconSearchPlaceholder: "Rechercher une icône…",
      iconSearchAria: "Rechercher une icône",
      iconClearSearch: "Effacer la recherche",
      iconPickerAria: "Choisir une icône",
      tileShapeLabel: "Forme",
      tileShapes: {
        hexagon: "Hexagone",
        rounded: "Carré arrondi",
        circle: "Cercle",
        pentagon: "Pentagone",
        octagon: "Octogone"
      },
      displayModeLabel: "Mode d'affichage",
      positionQLabel: "Position Q (optionnel)",
      positionRLabel: "Position R (optionnel)",
      fieldTypes: {
        text: "Texte",
        textarea: "Texte long",
        date: "Date",
        number: "Nombre",
        boolean: "Oui / Non",
        select: "Liste déroulante"
      },
      displayModes: {
        hexagon: "Hexagone (cartographie)",
        brick: "Brique latérale"
      },
      sections: {
        identity: {
          label: "Identité",
          description: "Nom et affichage"
        },
        fields: {
          label: "Champs",
          description: "Formulaire de saisie"
        },
        map: {
          label: "Cartographie",
          description: "Hexagone et position"
        }
      }
    },
    profileForm: {
      eyebrow: "Profils d'accès",
      title: "Nouveau profil",
      subtitle: "Créez un profil dérivé avec droits et héritage configurable.",
      sectionsAria: "Sections du profil",
      generalTitle: "Informations",
      generalDesc: "L'identifiant technique est permanent ; le libellé sert à l'affichage dans l'administration.",
      nameLabel: "Identifiant",
      namePlaceholder: "agent",
      labelField: "Description",
      labelPlaceholder: "Ex. Accès standard technicien",
      inheritanceTitle: "Héritage des droits",
      inheritanceDesc: "Un profil enfant hérite des droits du profil parent (ex. Agent, Admin).",
      parentLabel: "Profil parent",
      noParent: "Aucun · profil autonome",
      defaultRightsLabel: "Droits par défaut",
      defaultRightsHint: "Les nouveaux profils activent contrats et contacts par défaut. Ajustez les droits dans la matrice d'accès.",
      createBtn: "Créer le profil",
      sections: {
        general: {
          label: "Général",
          description: "Identifiant et libellé"
        },
        inheritance: {
          label: "Héritage",
          description: "Profil parent"
        }
      }
    },
    webhookForm: {
      eyebrow: "Webhooks notifications",
      createTitle: "Nouveau webhook",
      editTitle: "Modifier {name}",
      editFallback: "le webhook",
      createSubtitle: "Connectez Veritas à Teams, Slack ou un endpoint HTTP custom.",
      editSubtitle: "Mettez à jour le canal, l'URL et la disponibilité du webhook.",
      sectionsAria: "Sections du webhook",
      typeTitle: "Type de canal",
      typeDesc: "Choisissez la plateforme qui recevra les notifications sortantes.",
      configTitle: "Configuration",
      configDesc: "Nommez le webhook, renseignez l'URL et testez la connexion avant d'enregistrer.",
      webhookActiveLabel: "Webhook actif",
      webhookActiveHint: "Les webhooks inactifs ne reçoivent plus de notifications.",
      nameLabel: "Nom du webhook",
      namePlaceholder: "Ex. Teams Support N1",
      urlLabel: "URL du webhook",
      urlPlaceholder: "https://...",
      channelDetectedLabel: "Canal détecté",
      createBtn: "Créer le webhook",
      sections: {
        type: {
          label: "Type",
          description: "Canal de destination"
        },
        config: {
          label: "Configuration",
          description: "Nom, URL et test"
        }
      }
    },
    agentForm: {
      eyebrow: "Gestion des agents",
      createTitle: "Nouvel agent",
      editTitle: "Modifier l'agent",
      createSubtitle: "Créez un compte agent avec profil et mot de passe de connexion.",
      editSubtitle: "Mettez à jour les coordonnées, le profil, la sécurité et la MFA.",
      sectionsAria: "Sections de l'agent",
      identityTitle: "Identité",
      identityDescCreate: "Renseignez l'adresse email de connexion et un nom d'utilisateur optionnel.",
      identityDescEdit: "Mettez à jour l'adresse email et le nom d'utilisateur de l'agent.",
      emailLabel: "Adresse email",
      emailPlaceholder: "exemple@domaine.com",
      usernameLabel: "Nom d'utilisateur",
      usernamePlaceholder: "Optionnel",
      accountActiveLabel: "Compte actif",
      securityTitle: "Sécurité",
      securityDescCreate: "Définissez un mot de passe initial (minimum 6 caractères).",
      securityDescEdit: "Laissez vide pour conserver le mot de passe actuel, ou saisissez-en un nouveau (minimum 6 caractères).",
      passwordLabel: "Mot de passe",
      passwordPlaceholderCreate: "Minimum 6 caractères",
      passwordPlaceholderEdit: "Laisser vide pour ne pas changer",
      passwordConfirmLabel: "Confirmation",
      passwordConfirmPlaceholder: "Répéter le mot de passe",
      accessTitle: "Profil d'accès",
      accessDesc: "Le profil détermine les droits et modules visibles par l'agent dans Veritas.",
      profileLabel: "Profil assigné",
      mfaTitle: "Authentification MFA",
      mfaDesc: "État de l'authentification à deux facteurs pour cet agent.",
      mfaHintEnabled: "Cet agent doit saisir un code TOTP à chaque connexion.",
      mfaHintPending: "Configuration MFA démarrée mais pas encore validée.",
      mfaHintOff: "La MFA n'est pas activée sur ce compte.",
      releaseMfaBtn: "Réinitialiser la MFA",
      footerNoEmail: "Sans email",
      footerNoProfile: "Sans profil",
      footerInactive: "Inactif",
      deleteTitle: "Supprimer cet agent",
      createBtn: "Créer l'agent",
      creating: "Création…",
      saving: "Enregistrement…",
      sections: {
        identity: {
          label: "Identité",
          description: "Email et nom"
        },
        security: {
          label: "Sécurité",
          description: "Mot de passe"
        },
        access: {
          label: "Accès",
          description: "Profil assigné"
        },
        mfa: {
          label: "MFA",
          description: "Authentification"
        }
      }
    }
  },
  en: {
    techNewsFeedForm: {
      eyebrow: "Tech news",
      createTitle: "New RSS feed",
      editTitle: "Edit {name}",
      editFallback: "the feed",
      createSubtitle: "Add an RSS/Atom source for the tech news column.",
      editSubtitle: "Update the source, URL or display priority.",
      sectionsAria: "RSS feed sections",
      sourceTitle: "Source",
      sourceDesc: "Enter the name shown under each article and the RSS or Atom feed URL.",
      sourceNameLabel: "Source name",
      sourceNamePlaceholder: "e.g. ZDNet",
      sourceNameHint: "Shown under each article in the news column.",
      urlLabel: "RSS/Atom feed URL",
      urlPlaceholder: "https://example.com/feed/",
      urlHint: "Must start with http:// or https://",
      displayTitle: "Display",
      displayDesc: "Set the feed language, category and display priority.",
      localeLabel: "Language",
      localeHint: "Language of the feed content. Default feeds are English.",
      sortOrderLabel: "Display order",
      sortOrderHint: "Lower = higher priority.",
      feedActiveLabel: "Active feed",
      feedActiveHint: "Only active feeds are aggregated in the news column.",
      noSource: "No source",
      addBtn: "Add feed",
      sections: {
        source: {
          label: "Source",
          description: "Name and URL"
        },
        display: {
          label: "Display",
          description: "Language, category and order"
        }
      }
    },
    contractModuleOptionForm: {
      eyebrow: "Contract options",
      createTitle: "New contract option",
      editTitle: "Edit {name}",
      editFallback: "the option",
      createSubtitle: "Define an option shown on client contract records.",
      editSubtitle: "Update the label, icon or visibility of this option.",
      sectionsAria: "Contract option sections",
      identityTitle: "Identity",
      identityDesc: "The label is visible in the app. The technical key stays stable for existing data.",
      moduleKeyLabel: "Technical key",
      moduleKeyPlaceholder: "e.g. Support",
      moduleKeyHintCreate: "Optional. Leave empty for auto-generation (e.g. Support, Curative).",
      moduleKeyHintEdit: "Cannot be changed after creation.",
      displayLabel: "Display label",
      displayLabelPlaceholder: "e.g. 24/7 Support",
      presentationTitle: "Presentation",
      presentationDesc: "Customize the icon and display order on enterprise records.",
      optionActiveLabel: "Active option",
      optionActiveHint: "A hidden option keeps its data but no longer appears in the app.",
      iconChangeLabel: "Change icon",
      iconSearchPlaceholder: "Search for an icon…",
      iconSearchAria: "Search for an icon",
      iconClearSearch: "Clear search",
      iconPickerAria: "Choose an icon",
      addBtn: "Add option",
      sections: {
        identity: {
          label: "Identity",
          description: "Key and label"
        },
        presentation: {
          label: "Presentation",
          description: "Icon and order"
        }
      }
    },
    equipmentFamilyForm: {
      createTitle: "New equipment family",
      editTitle: "Edit {name}",
      editFallback: "the family",
      subtitle: "Configure equipment type, fields and map display.",
      systemSubtitle: "Add custom fields to this built-in family. Original fields stay unchanged.",
      systemFieldsDesc: "Add custom fields. Built-in fields stay visible below and cannot be edited here.",
      builtinFieldsTitle: "Built-in fields",
      builtinFieldsDesc: "These fields are provided by Veritas. They cannot be edited here.",
      builtinFieldBadge: "Built-in",
      extraFieldsTitle: "Custom fields",
      identityTitle: "Family identity",
      identityDesc: "e.g. Projector, Network printer, Interactive display…",
      labelPlaceholder: "Projector",
      familyKeyLabel: "Technical key",
      familyKeyPlaceholder: "projector",
      sortOrderLabel: "Display order",
      enabledLabel: "Enabled",
      fieldsTitle: "Form fields",
      fieldsDesc: "Define information to capture for each device in this family.",
      noFields: "No fields defined.",
      fieldOrderHint: "Drag fields to set the order shown in the equipment form.",
      fieldOptionsLabel: "Dropdown choices (one per line)",
      fieldOptionsPlaceholder: "Option 1\nOption 2\nOption 3",
      dragHandleAria: "Move field",
      fieldLabelPlaceholder: "Field label",
      fieldTypeCol: "Type",
      mapTitle: "Map",
      mapDesc: "Choose the icon for this family on the company record.",
      mapManagedElsewhere: "Tile positions and shape are managed in Administration → Record configuration → Mapping.",
      mapPreviewHint: "Drag a hexagon onto another to swap, or onto an empty cell to move it.",
      mapMoveHint: "Click a hexagon to select it, then use the arrows.",
      mapBrickHint: "This family appears as a side brick, not on the honeycomb.",
      selectedHexLabel: "Selected",
      iconChangeLabel: "Change icon",
      iconSearchPlaceholder: "Search for an icon…",
      iconSearchAria: "Search for an icon",
      iconClearSearch: "Clear search",
      iconPickerAria: "Choose an icon",
      tileShapeLabel: "Shape",
      tileShapes: {
        hexagon: "Hexagon",
        rounded: "Rounded square",
        circle: "Circle",
        pentagon: "Pentagon",
        octagon: "Octagon"
      },
      displayModeLabel: "Display mode",
      positionQLabel: "Position Q (optional)",
      positionRLabel: "Position R (optional)",
      fieldTypes: {
        text: "Text",
        textarea: "Long text",
        date: "Date",
        number: "Number",
        boolean: "Yes / No",
        select: "Dropdown list"
      },
      displayModes: {
        hexagon: "Hexagon (map)",
        brick: "Side brick"
      },
      sections: {
        identity: {
          label: "Identity",
          description: "Name and display"
        },
        fields: {
          label: "Fields",
          description: "Input form"
        },
        map: {
          label: "Map",
          description: "Hexagon and position"
        }
      }
    },
    profileForm: {
      eyebrow: "Access profiles",
      title: "New profile",
      subtitle: "Create a derived profile with configurable rights and inheritance.",
      sectionsAria: "Profile sections",
      generalTitle: "Information",
      generalDesc: "The technical identifier is permanent; the label is shown in administration.",
      nameLabel: "Identifier",
      namePlaceholder: "agent",
      labelField: "Description",
      labelPlaceholder: "e.g. Standard technician access",
      inheritanceTitle: "Rights inheritance",
      inheritanceDesc: "A child profile inherits rights from the parent profile (e.g. Agent, Admin).",
      parentLabel: "Parent profile",
      noParent: "None · standalone profile",
      defaultRightsLabel: "Default rights",
      defaultRightsHint: "New profiles enable contracts and contacts by default. Adjust rights in the access matrix.",
      createBtn: "Create profile",
      sections: {
        general: {
          label: "General",
          description: "Identifier and label"
        },
        inheritance: {
          label: "Inheritance",
          description: "Parent profile"
        }
      }
    },
    webhookForm: {
      eyebrow: "Notification webhooks",
      createTitle: "New webhook",
      editTitle: "Edit {name}",
      editFallback: "the webhook",
      createSubtitle: "Connect Veritas to Teams, Slack or a custom HTTP endpoint.",
      editSubtitle: "Update the channel, URL and webhook availability.",
      sectionsAria: "Webhook sections",
      typeTitle: "Channel type",
      typeDesc: "Choose the platform that will receive outbound notifications.",
      configTitle: "Configuration",
      configDesc: "Name the webhook, enter the URL and test the connection before saving.",
      webhookActiveLabel: "Active webhook",
      webhookActiveHint: "Inactive webhooks no longer receive notifications.",
      nameLabel: "Webhook name",
      namePlaceholder: "e.g. Teams L1 Support",
      urlLabel: "Webhook URL",
      urlPlaceholder: "https://...",
      channelDetectedLabel: "Detected channel",
      createBtn: "Create webhook",
      sections: {
        type: {
          label: "Type",
          description: "Destination channel"
        },
        config: {
          label: "Configuration",
          description: "Name, URL and test"
        }
      }
    },
    agentForm: {
      eyebrow: "Agent management",
      createTitle: "New agent",
      editTitle: "Edit agent",
      createSubtitle: "Create an agent account with profile and login password.",
      editSubtitle: "Update contact details, profile, security and MFA.",
      sectionsAria: "Agent sections",
      identityTitle: "Identity",
      identityDescCreate: "Enter the login email and an optional username.",
      identityDescEdit: "Update the agent's email address and username.",
      emailLabel: "Email address",
      emailPlaceholder: "example@domain.com",
      usernameLabel: "Username",
      usernamePlaceholder: "Optional",
      accountActiveLabel: "Active account",
      securityTitle: "Security",
      securityDescCreate: "Set an initial password (minimum 6 characters).",
      securityDescEdit: "Leave blank to keep the current password, or enter a new one (minimum 6 characters).",
      passwordLabel: "Password",
      passwordPlaceholderCreate: "Minimum 6 characters",
      passwordPlaceholderEdit: "Leave blank to keep unchanged",
      passwordConfirmLabel: "Confirmation",
      passwordConfirmPlaceholder: "Repeat password",
      accessTitle: "Access profile",
      accessDesc: "The profile determines the rights and modules visible to the agent in Veritas.",
      profileLabel: "Assigned profile",
      mfaTitle: "MFA authentication",
      mfaDesc: "Two-factor authentication status for this agent.",
      mfaHintEnabled: "This agent must enter a TOTP code at each login.",
      mfaHintPending: "MFA setup started but not yet validated.",
      mfaHintOff: "MFA is not enabled on this account.",
      releaseMfaBtn: "Reset MFA",
      footerNoEmail: "No email",
      footerNoProfile: "No profile",
      footerInactive: "Inactive",
      deleteTitle: "Delete this agent",
      createBtn: "Create agent",
      creating: "Creating…",
      saving: "Saving…",
      sections: {
        identity: {
          label: "Identity",
          description: "Email and name"
        },
        security: {
          label: "Security",
          description: "Password"
        },
        access: {
          label: "Access",
          description: "Assigned profile"
        },
        mfa: {
          label: "MFA",
          description: "Authentication"
        }
      }
    }
  },
  de: {
    techNewsFeedForm: {
      eyebrow: "Tech-News",
      createTitle: "Neuer RSS-Feed",
      editTitle: "{name} bearbeiten",
      editFallback: "der Feed",
      createSubtitle: "RSS/Atom-Quelle für die Tech-News-Spalte hinzufügen.",
      editSubtitle: "Quelle, URL oder Priorität aktualisieren.",
      sectionsAria: "RSS-Feed-Abschnitte",
      sourceTitle: "Quelle",
      sourceDesc: "Name unter jedem Artikel und RSS/Atom-URL.",
      sourceNameLabel: "Quellenname",
      sourceNamePlaceholder: "z. B. ZDNet",
      sourceNameHint: "Unter jedem Artikel in der News-Spalte.",
      urlLabel: "RSS/Atom-Feed-URL",
      urlPlaceholder: "https://beispiel.de/feed/",
      urlHint: "Muss mit http:// oder https:// beginnen.",
      displayTitle: "Darstellung",
      displayDesc: "Sprache, Kategorie und Priorität des Feeds festlegen.",
      localeLabel: "Sprache",
      localeHint: "Sprache des Feed-Inhalts. Standard-Feeds sind Englisch.",
      sortOrderLabel: "Anzeigereihenfolge",
      sortOrderHint: "Kleiner = höhere Priorität.",
      feedActiveLabel: "Aktiver Feed",
      feedActiveHint: "Nur aktive Feeds werden aggregiert.",
      noSource: "Keine Quelle",
      addBtn: "Feed hinzufügen",
      sections: {
        source: {
          label: "Quelle",
          description: "Name und URL"
        },
        display: {
          label: "Darstellung",
          description: "Sprache, Kategorie und Reihenfolge"
        }
      }
    },
    contractModuleOptionForm: {
      eyebrow: "Vertragsoptionen",
      createTitle: "Neue Vertragsoption",
      editTitle: "{name} bearbeiten",
      editFallback: "die Option",
      createSubtitle: "Option für Kundenvertragsdatensätze definieren.",
      editSubtitle: "Bezeichnung, Symbol oder Sichtbarkeit aktualisieren.",
      sectionsAria: "Vertragsoption-Abschnitte",
      identityTitle: "Identität",
      identityDesc: "Bezeichnung sichtbar in der App. Technischer Schlüssel bleibt stabil.",
      moduleKeyLabel: "Technischer Schlüssel",
      moduleKeyPlaceholder: "z. B. Support",
      moduleKeyHintCreate: "Optional. Leer lassen für Auto-Generierung.",
      moduleKeyHintEdit: "Nach Erstellung nicht änderbar.",
      displayLabel: "Anzeigebezeichnung",
      displayLabelPlaceholder: "z. B. 24/7 Support",
      presentationTitle: "Darstellung",
      presentationDesc: "Symbol und Reihenfolge auf Unternehmensdatensätzen.",
      optionActiveLabel: "Aktive Option",
      optionActiveHint: "Ausgeblendete Option behält Daten, erscheint nicht mehr in der App.",
      iconChangeLabel: "Symbol ändern",
      iconSearchPlaceholder: "Symbol suchen…",
      iconSearchAria: "Symbol suchen",
      iconClearSearch: "Suche löschen",
      iconPickerAria: "Symbol wählen",
      addBtn: "Option hinzufügen",
      sections: {
        identity: {
          label: "Identität",
          description: "Schlüssel und Bezeichnung"
        },
        presentation: {
          label: "Darstellung",
          description: "Symbol und Reihenfolge"
        }
      }
    },
    equipmentFamilyForm: {
      createTitle: "Neue Gerätefamilie",
      editTitle: "{name} bearbeiten",
      editFallback: "die Familie",
      subtitle: "Gerätetyp, Felder und Kartenanzeige konfigurieren.",
      systemSubtitle: "Fügen Sie dieser integrierten Familie eigene Felder hinzu. Die Originalfelder bleiben unverändert.",
      systemFieldsDesc: "Fügen Sie eigene Felder hinzu. Die integrierten Felder bleiben unten sichtbar und sind schreibgeschützt.",
      builtinFieldsTitle: "Integrierte Felder",
      builtinFieldsDesc: "Diese Felder stammen von Veritas und können hier nicht bearbeitet werden.",
      builtinFieldBadge: "Integriert",
      extraFieldsTitle: "Eigene Felder",
      identityTitle: "Familienidentität",
      identityDesc: "z. B. Beamer, Netzwerkdrucker…",
      labelPlaceholder: "Beamer",
      familyKeyPlaceholder: "beamer",
      sortOrderLabel: "Anzeigereihenfolge",
      enabledLabel: "Aktiviert",
      fieldsTitle: "Formularfelder",
      fieldsDesc: "Informationen für jedes Gerät dieser Familie.",
      noFields: "Keine Felder definiert.",
      fieldOrderHint: "Felder per Drag-and-drop sortieren.",
      fieldOptionsLabel: "Auswahlwerte (einer pro Zeile)",
      fieldOptionsPlaceholder: "Option 1\nOption 2\nOption 3",
      dragHandleAria: "Feld verschieben",
      fieldLabelPlaceholder: "Feldbezeichnung",
      fieldTypeCol: "Typ",
      mapTitle: "Karte",
      mapDesc: "Wählen Sie das Symbol dieser Familie auf der Unternehmensakte.",
      mapManagedElsewhere: "Position und Form der Kacheln werden unter Administration → Akten-Konfiguration → Karte verwaltet.",
      mapPreviewHint: "Ziehen Sie ein Sechseck auf ein anderes zum Tauschen oder auf eine leere Zelle.",
      mapMoveHint: "Klicken Sie ein Sechseck an, dann die Pfeile nutzen.",
      mapBrickHint: "Diese Familie erscheint als seitlicher Stein, nicht auf der Wabe.",
      selectedHexLabel: "Ausgewählt",
      iconChangeLabel: "Symbol ändern",
      iconSearchPlaceholder: "Symbol suchen…",
      iconSearchAria: "Symbol suchen",
      iconClearSearch: "Suche löschen",
      iconPickerAria: "Symbol wählen",
      tileShapeLabel: "Form",
      tileShapes: {
        hexagon: "Sechseck",
        rounded: "Abgerundetes Quadrat",
        circle: "Kreis",
        pentagon: "Pentagon",
        octagon: "Achteck"
      },
      displayModeLabel: "Anzeigemodus",
      positionQLabel: "Position Q (optional)",
      positionRLabel: "Position R (optional)",
      fieldTypes: {
        text: "Text",
        textarea: "Langtext",
        date: "Datum",
        number: "Zahl",
        boolean: "Ja / Nein",
        select: "Dropdown-Liste"
      },
      displayModes: {
        hexagon: "Sechseck (Karte)",
        brick: "Seitenkachel"
      },
      sections: {
        identity: {
          label: "Identität",
          description: "Name und Anzeige"
        },
        fields: {
          label: "Felder",
          description: "Eingabeformular"
        },
        map: {
          label: "Karte",
          description: "Sechseck und Position"
        }
      }
    },
    profileForm: {
      eyebrow: "Zugriffsprofile",
      title: "Neues Profil",
      subtitle: "Abgeleitetes Profil mit konfigurierbaren Rechten.",
      sectionsAria: "Profilabschnitte",
      generalTitle: "Informationen",
      generalDesc: "Technische Kennung ist permanent; Bezeichnung in der Admin.",
      nameLabel: "Kennung",
      namePlaceholder: "agent",
      labelField: "Beschreibung",
      labelPlaceholder: "z. B. Standard-Technikerzugriff",
      inheritanceTitle: "Rechtevererbung",
      inheritanceDesc: "Kindprofil erbt Rechte vom Elternprofil.",
      parentLabel: "Elternprofil",
      noParent: "Keines · eigenständiges Profil",
      defaultRightsLabel: "Standardrechte",
      defaultRightsHint: "Neue Profile aktivieren Verträge und Kontakte standardmäßig.",
      createBtn: "Profil erstellen",
      sections: {
        general: {
          label: "Allgemein",
          description: "Kennung und Bezeichnung"
        },
        inheritance: {
          label: "Vererbung",
          description: "Elternprofil"
        }
      }
    },
    webhookForm: {
      eyebrow: "Benachrichtigungs-Webhooks",
      createTitle: "Neuer Webhook",
      editTitle: "{name} bearbeiten",
      editFallback: "der Webhook",
      createSubtitle: "Veritas mit Teams, Slack oder HTTP-Endpunkt verbinden.",
      editSubtitle: "Kanal, URL und Verfügbarkeit aktualisieren.",
      sectionsAria: "Webhook-Abschnitte",
      typeTitle: "Kanaltyp",
      typeDesc: "Plattform für ausgehende Benachrichtigungen wählen.",
      configTitle: "Konfiguration",
      configDesc: "Webhook benennen, URL eingeben und Verbindung testen.",
      webhookActiveLabel: "Aktiver Webhook",
      webhookActiveHint: "Inaktive Webhooks erhalten keine Benachrichtigungen mehr.",
      nameLabel: "Webhook-Name",
      namePlaceholder: "z. B. Teams L1",
      urlLabel: "Webhook-URL",
      urlPlaceholder: "https://...",
      channelDetectedLabel: "Erkannter Kanal",
      createBtn: "Webhook erstellen",
      sections: {
        type: {
          label: "Typ",
          description: "Zielkanal"
        },
        config: {
          label: "Konfiguration",
          description: "Name, URL und Test"
        }
      }
    },
    agentForm: {
      eyebrow: "Agentenverwaltung",
      createTitle: "Neuer Agent",
      editTitle: "Agent bearbeiten",
      createSubtitle: "Agentenkonto mit Profil und Anmeldepasswort erstellen.",
      editSubtitle: "Kontaktdaten, Profil, Sicherheit und MFA aktualisieren.",
      sectionsAria: "Agentenabschnitte",
      identityTitle: "Identität",
      identityDescCreate: "Anmelde-E-Mail und optionaler Benutzername.",
      identityDescEdit: "E-Mail-Adresse und Benutzername des Agenten aktualisieren.",
      emailLabel: "E-Mail-Adresse",
      emailPlaceholder: "beispiel@domain.de",
      usernameLabel: "Benutzername",
      usernamePlaceholder: "Optional",
      accountActiveLabel: "Aktives Konto",
      securityTitle: "Sicherheit",
      securityDescCreate: "Initiales Passwort festlegen (mindestens 6 Zeichen).",
      securityDescEdit: "Leer lassen um aktuelles Passwort zu behalten, oder neues eingeben (min. 6 Zeichen).",
      passwordLabel: "Passwort",
      passwordPlaceholderCreate: "Mindestens 6 Zeichen",
      passwordPlaceholderEdit: "Leer lassen um nicht zu ändern",
      passwordConfirmLabel: "Bestätigung",
      passwordConfirmPlaceholder: "Passwort wiederholen",
      accessTitle: "Zugriffsprofil",
      accessDesc: "Profil bestimmt Rechte und sichtbare Module in Veritas.",
      profileLabel: "Zugewiesenes Profil",
      mfaTitle: "MFA-Authentifizierung",
      mfaDesc: "Zwei-Faktor-Status für diesen Agenten.",
      mfaHintEnabled: "Agent muss bei jeder Anmeldung einen TOTP-Code eingeben.",
      mfaHintPending: "MFA-Einrichtung gestartet, aber noch nicht validiert.",
      mfaHintOff: "MFA ist für dieses Konto nicht aktiviert.",
      releaseMfaBtn: "MFA zurücksetzen",
      footerNoEmail: "Keine E-Mail",
      footerNoProfile: "Kein Profil",
      footerInactive: "Inaktiv",
      deleteTitle: "Diesen Agent löschen",
      createBtn: "Agent erstellen",
      creating: "Erstellung…",
      saving: "Speichern…",
      sections: {
        identity: {
          label: "Identität",
          description: "E-Mail und Name"
        },
        security: {
          label: "Sicherheit",
          description: "Passwort"
        },
        access: {
          label: "Zugriff",
          description: "Zugewiesenes Profil"
        },
        mfa: {
          label: "MFA",
          description: "Authentifizierung"
        }
      }
    }
  },
  it: {
    techNewsFeedForm: {
      eyebrow: "Notizie tech",
      createTitle: "Nuovo feed RSS",
      editTitle: "Modifica {name}",
      editFallback: "il feed",
      createSubtitle: "Aggiungi una fonte RSS/Atom per la colonna notizie.",
      editSubtitle: "Aggiorna fonte, URL o priorità.",
      sectionsAria: "Sezioni feed RSS",
      sourceTitle: "Fonte",
      sourceDesc: "Nome sotto ogni articolo e URL del feed RSS o Atom.",
      sourceNameLabel: "Nome fonte",
      sourceNamePlaceholder: "Es. ZDNet",
      sourceNameHint: "Mostrato sotto ogni articolo.",
      urlLabel: "URL feed RSS/Atom",
      urlPlaceholder: "https://esempio.it/feed/",
      urlHint: "Deve iniziare con http:// o https://",
      displayTitle: "Visualizzazione",
      displayDesc: "Imposta lingua, categoria e priorità del feed.",
      localeLabel: "Lingua",
      localeHint: "Lingua del contenuto. I feed predefiniti sono in inglese.",
      sortOrderLabel: "Ordine di visualizzazione",
      sortOrderHint: "Più basso = priorità maggiore.",
      feedActiveLabel: "Feed attivo",
      feedActiveHint: "Solo i feed attivi sono aggregati.",
      noSource: "Senza fonte",
      addBtn: "Aggiungi feed",
      sections: {
        source: {
          label: "Fonte",
          description: "Nome e URL"
        },
        display: {
          label: "Visualizzazione",
          description: "Lingua, categoria e ordine"
        }
      }
    },
    contractModuleOptionForm: {
      eyebrow: "Opzioni contratto",
      createTitle: "Nuova opzione contratto",
      editTitle: "Modifica {name}",
      editFallback: "l'opzione",
      createSubtitle: "Definisci un'opzione sulle schede contratto cliente.",
      editSubtitle: "Aggiorna etichetta, icona o visibilità.",
      sectionsAria: "Sezioni opzione contratto",
      identityTitle: "Identità",
      identityDesc: "L'etichetta è visibile nell'app. La chiave tecnica resta stabile.",
      moduleKeyLabel: "Chiave tecnica",
      moduleKeyPlaceholder: "Es. Support",
      moduleKeyHintCreate: "Opzionale. Lascia vuoto per generazione automatica.",
      moduleKeyHintEdit: "Non modificabile dopo la creazione.",
      displayLabel: "Etichetta visualizzata",
      displayLabelPlaceholder: "Es. Supporto 24/7",
      presentationTitle: "Presentazione",
      presentationDesc: "Personalizza icona e ordine sulle schede azienda.",
      optionActiveLabel: "Opzione attiva",
      optionActiveHint: "Un'opzione nascosta conserva i dati ma non compare più nell'app.",
      iconChangeLabel: "Cambia icona",
      iconSearchPlaceholder: "Cerca un'icona…",
      iconSearchAria: "Cerca un'icona",
      iconClearSearch: "Cancella ricerca",
      iconPickerAria: "Scegli un'icona",
      addBtn: "Aggiungi opzione",
      sections: {
        identity: {
          label: "Identità",
          description: "Chiave ed etichetta"
        },
        presentation: {
          label: "Presentazione",
          description: "Icona e ordine"
        }
      }
    },
    equipmentFamilyForm: {
      createTitle: "Nuova famiglia dispositivi",
      editTitle: "Modifica {name}",
      editFallback: "la famiglia",
      subtitle: "Configura tipo, campi e visualizzazione sulla mappa.",
      systemSubtitle: "Aggiungi campi personalizzati a questa famiglia integrata. I campi originali restano invariati.",
      systemFieldsDesc: "Aggiungi campi personalizzati. I campi integrati restano visibili sotto e non sono modificabili.",
      builtinFieldsTitle: "Campi integrati",
      builtinFieldsDesc: "Questi campi sono forniti da Veritas e non sono modificabili qui.",
      builtinFieldBadge: "Integrato",
      extraFieldsTitle: "Campi personalizzati",
      identityTitle: "Identità famiglia",
      identityDesc: "Es. Proiettore, Stampante di rete…",
      labelPlaceholder: "Proiettore",
      familyKeyPlaceholder: "proiettore",
      sortOrderLabel: "Ordine di visualizzazione",
      enabledLabel: "Attiva",
      fieldsTitle: "Campi del modulo",
      fieldsDesc: "Informazioni per ogni dispositivo di questa famiglia.",
      noFields: "Nessun campo definito.",
      fieldOrderHint: "Trascina i campi per definirne l'ordine nel modulo.",
      fieldOptionsLabel: "Scelte del menu (una per riga)",
      fieldOptionsPlaceholder: "Opzione 1\nOpzione 2\nOpzione 3",
      dragHandleAria: "Sposta campo",
      fieldLabelPlaceholder: "Etichetta campo",
      fieldTypeCol: "Tipo",
      mapTitle: "Mappa",
      mapDesc: "Scegli l’icona di questa famiglia sulla scheda azienda.",
      mapManagedElsewhere: "Posizione e forma delle tessere si gestiscono in Amministrazione → Configurazione scheda → Mappa.",
      mapPreviewHint: "Trascina un esagono su un altro per scambiarli, o su una cella vuota.",
      mapMoveHint: "Clicca un esagono per selezionarlo, poi usa le frecce.",
      mapBrickHint: "Questa famiglia appare come mattone laterale, non sul nido d'ape.",
      selectedHexLabel: "Selezionato",
      iconChangeLabel: "Cambia icona",
      iconSearchPlaceholder: "Cerca un'icona…",
      iconSearchAria: "Cerca un'icona",
      iconClearSearch: "Cancella ricerca",
      iconPickerAria: "Scegli un'icona",
      tileShapeLabel: "Forma",
      tileShapes: {
        hexagon: "Esagono",
        rounded: "Quadrato arrotondato",
        circle: "Cerchio",
        pentagon: "Pentagono",
        octagon: "Ottagono"
      },
      displayModeLabel: "Modalità visualizzazione",
      positionQLabel: "Posizione Q (opzionale)",
      positionRLabel: "Posizione R (opzionale)",
      fieldTypes: {
        text: "Testo",
        textarea: "Testo lungo",
        date: "Data",
        number: "Numero",
        boolean: "Sì / No",
        select: "Elenco a discesa"
      },
      displayModes: {
        hexagon: "Esagono (mappa)",
        brick: "Mattone laterale"
      },
      sections: {
        identity: {
          label: "Identità",
          description: "Nome e visualizzazione"
        },
        fields: {
          label: "Campi",
          description: "Modulo di inserimento"
        },
        map: {
          label: "Mappa",
          description: "Esagono e posizione"
        }
      }
    },
    profileForm: {
      eyebrow: "Profili di accesso",
      title: "Nuovo profilo",
      subtitle: "Crea un profilo derivato con diritti e ereditarietà configurabili.",
      sectionsAria: "Sezioni profilo",
      generalTitle: "Informazioni",
      generalDesc: "L'identificativo tecnico è permanente; l'etichetta è mostrata in admin.",
      nameLabel: "Identificativo",
      namePlaceholder: "agent",
      labelField: "Descrizione",
      labelPlaceholder: "Es. Accesso standard tecnico",
      inheritanceTitle: "Ereditarietà diritti",
      inheritanceDesc: "Un profilo figlio eredita i diritti dal profilo padre.",
      parentLabel: "Profilo padre",
      noParent: "Nessuno · profilo autonomo",
      defaultRightsLabel: "Diritti predefiniti",
      defaultRightsHint: "I nuovi profili attivano contratti e contatti per impostazione predefinita.",
      createBtn: "Crea profilo",
      sections: {
        general: {
          label: "Generale",
          description: "Identificativo ed etichetta"
        },
        inheritance: {
          label: "Ereditarietà",
          description: "Profilo padre"
        }
      }
    },
    webhookForm: {
      eyebrow: "Webhook notifiche",
      createTitle: "Nuovo webhook",
      editTitle: "Modifica {name}",
      editFallback: "il webhook",
      createSubtitle: "Collega Veritas a Teams, Slack o endpoint HTTP.",
      editSubtitle: "Aggiorna canale, URL e disponibilità.",
      sectionsAria: "Sezioni webhook",
      typeTitle: "Tipo canale",
      typeDesc: "Piattaforma che riceverà le notifiche in uscita.",
      configTitle: "Configurazione",
      configDesc: "Nomina il webhook, inserisci l'URL e testa la connessione.",
      webhookActiveLabel: "Webhook attivo",
      webhookActiveHint: "I webhook inattivi non ricevono più notifiche.",
      nameLabel: "Nome webhook",
      namePlaceholder: "Es. Teams L1",
      urlLabel: "URL webhook",
      urlPlaceholder: "https://...",
      channelDetectedLabel: "Canale rilevato",
      createBtn: "Crea webhook",
      sections: {
        type: {
          label: "Tipo",
          description: "Canale di destinazione"
        },
        config: {
          label: "Configurazione",
          description: "Nome, URL e test"
        }
      }
    },
    agentForm: {
      eyebrow: "Gestione agenti",
      createTitle: "Nuovo agente",
      editTitle: "Modifica agente",
      createSubtitle: "Crea un account agente con profilo e password di accesso.",
      editSubtitle: "Aggiorna contatti, profilo, sicurezza e MFA.",
      sectionsAria: "Sezioni agente",
      identityTitle: "Identità",
      identityDescCreate: "Inserisci l'email di accesso e un nome utente opzionale.",
      identityDescEdit: "Aggiorna email e nome utente dell'agente.",
      emailLabel: "Indirizzo email",
      emailPlaceholder: "esempio@dominio.it",
      usernameLabel: "Nome utente",
      usernamePlaceholder: "Opzionale",
      accountActiveLabel: "Account attivo",
      securityTitle: "Sicurezza",
      securityDescCreate: "Imposta una password iniziale (minimo 6 caratteri).",
      securityDescEdit: "Lascia vuoto per mantenere la password attuale, o inseriscine una nuova (min. 6 caratteri).",
      passwordLabel: "Password",
      passwordPlaceholderCreate: "Minimo 6 caratteri",
      passwordPlaceholderEdit: "Lascia vuoto per non cambiare",
      passwordConfirmLabel: "Conferma",
      passwordConfirmPlaceholder: "Ripeti la password",
      accessTitle: "Profilo di accesso",
      accessDesc: "Il profilo determina diritti e moduli visibili in Veritas.",
      profileLabel: "Profilo assegnato",
      mfaTitle: "Autenticazione MFA",
      mfaDesc: "Stato autenticazione a due fattori per questo agente.",
      mfaHintEnabled: "L'agente deve inserire un codice TOTP a ogni accesso.",
      mfaHintPending: "Configurazione MFA avviata ma non ancora validata.",
      mfaHintOff: "MFA non attiva su questo account.",
      releaseMfaBtn: "Reimposta MFA",
      footerNoEmail: "Senza email",
      footerNoProfile: "Senza profilo",
      footerInactive: "Inattivo",
      deleteTitle: "Elimina questo agente",
      createBtn: "Crea agente",
      creating: "Creazione…",
      saving: "Salvataggio…",
      sections: {
        identity: {
          label: "Identità",
          description: "Email e nome"
        },
        security: {
          label: "Sicurezza",
          description: "Password"
        },
        access: {
          label: "Accesso",
          description: "Profilo assegnato"
        },
        mfa: {
          label: "MFA",
          description: "Autenticazione"
        }
      }
    }
  },
  es: {
    techNewsFeedForm: {
      eyebrow: "Noticias tech",
      createTitle: "Nuevo feed RSS",
      editTitle: "Modificar {name}",
      editFallback: "el feed",
      createSubtitle: "Añada una fuente RSS/Atom para la columna de noticias.",
      editSubtitle: "Actualice fuente, URL o prioridad.",
      sectionsAria: "Secciones del feed RSS",
      sourceTitle: "Fuente",
      sourceDesc: "Nombre bajo cada artículo y URL del feed RSS o Atom.",
      sourceNameLabel: "Nombre de la fuente",
      sourceNamePlaceholder: "Ej. ZDNet",
      sourceNameHint: "Mostrado bajo cada artículo.",
      urlLabel: "URL del feed RSS/Atom",
      urlPlaceholder: "https://ejemplo.com/feed/",
      urlHint: "Debe empezar por http:// o https://",
      displayTitle: "Visualización",
      displayDesc: "Defina el idioma, la categoría y la prioridad del feed.",
      localeLabel: "Idioma",
      localeHint: "Idioma del contenido. Los feeds por defecto están en inglés.",
      sortOrderLabel: "Orden de visualización",
      sortOrderHint: "Menor = mayor prioridad.",
      feedActiveLabel: "Feed activo",
      feedActiveHint: "Solo se agregan los feeds activos.",
      noSource: "Sin fuente",
      addBtn: "Añadir feed",
      sections: {
        source: {
          label: "Fuente",
          description: "Nombre y URL"
        },
        display: {
          label: "Visualización",
          description: "Idioma, categoría y orden"
        }
      }
    },
    contractModuleOptionForm: {
      eyebrow: "Opciones de contrato",
      createTitle: "Nueva opción de contrato",
      editTitle: "Modificar {name}",
      editFallback: "la opción",
      createSubtitle: "Defina una opción en las fichas de contrato cliente.",
      editSubtitle: "Actualice etiqueta, icono o visibilidad.",
      sectionsAria: "Secciones de la opción",
      identityTitle: "Identidad",
      identityDesc: "La etiqueta es visible en la app. La clave técnica permanece estable.",
      moduleKeyLabel: "Clave técnica",
      moduleKeyPlaceholder: "Ej. Support",
      moduleKeyHintCreate: "Opcional. Deje vacío para generación automática.",
      moduleKeyHintEdit: "No modificable tras la creación.",
      displayLabel: "Etiqueta mostrada",
      displayLabelPlaceholder: "Ej. Soporte 24/7",
      presentationTitle: "Presentación",
      presentationDesc: "Personalice icono y orden en fichas de empresa.",
      optionActiveLabel: "Opción activa",
      optionActiveHint: "Una opción oculta conserva datos pero ya no aparece en la app.",
      iconChangeLabel: "Cambiar icono",
      iconSearchPlaceholder: "Buscar un icono…",
      iconSearchAria: "Buscar un icono",
      iconClearSearch: "Borrar búsqueda",
      iconPickerAria: "Elegir un icono",
      addBtn: "Añadir opción",
      sections: {
        identity: {
          label: "Identidad",
          description: "Clave y etiqueta"
        },
        presentation: {
          label: "Presentación",
          description: "Icono y orden"
        }
      }
    },
    equipmentFamilyForm: {
      createTitle: "Nueva familia de equipos",
      editTitle: "Modificar {name}",
      editFallback: "la familia",
      subtitle: "Configure tipo, campos y visualización en el mapa.",
      systemSubtitle: "Añada campos personalizados a esta familia integrada. Los campos originales no cambian.",
      systemFieldsDesc: "Añada campos personalizados. Los campos integrados siguen visibles abajo y no se pueden editar.",
      builtinFieldsTitle: "Campos integrados",
      builtinFieldsDesc: "Estos campos los proporciona Veritas y no se pueden editar aquí.",
      builtinFieldBadge: "Integrado",
      extraFieldsTitle: "Campos personalizados",
      identityTitle: "Identidad de la familia",
      identityDesc: "Ej. Proyector, Impresora de red…",
      labelPlaceholder: "Proyector",
      familyKeyPlaceholder: "proyector",
      sortOrderLabel: "Orden de visualización",
      enabledLabel: "Activada",
      fieldsTitle: "Campos del formulario",
      fieldsDesc: "Información para cada equipo de esta familia.",
      noFields: "Ningún campo definido.",
      fieldOrderHint: "Arrastre los campos para definir el orden del formulario.",
      fieldOptionsLabel: "Opciones de la lista (una por línea)",
      fieldOptionsPlaceholder: "Opción 1\nOpción 2\nOpción 3",
      dragHandleAria: "Mover campo",
      fieldLabelPlaceholder: "Etiqueta del campo",
      fieldTypeCol: "Tipo",
      mapTitle: "Mapa",
      mapDesc: "Elija el icono de esta familia en la ficha de empresa.",
      mapManagedElsewhere: "La posición y la forma de las fichas se gestionan en Administración → Configuración de ficha → Cartografía.",
      mapPreviewHint: "Arrastre un hexágono sobre otro para intercambiarlo, o a una celda vacía.",
      mapMoveHint: "Haga clic en un hexágono para seleccionarlo y use las flechas.",
      mapBrickHint: "Esta familia aparece como ladrillo lateral, no en el panal.",
      selectedHexLabel: "Seleccionado",
      iconChangeLabel: "Cambiar icono",
      iconSearchPlaceholder: "Buscar un icono…",
      iconSearchAria: "Buscar un icono",
      iconClearSearch: "Borrar búsqueda",
      iconPickerAria: "Elegir un icono",
      tileShapeLabel: "Forma",
      tileShapes: {
        hexagon: "Hexágono",
        rounded: "Cuadrado redondeado",
        circle: "Círculo",
        pentagon: "Pentágono",
        octagon: "Octágono"
      },
      displayModeLabel: "Modo de visualización",
      positionQLabel: "Posición Q (opcional)",
      positionRLabel: "Posición R (opcional)",
      fieldTypes: {
        text: "Texto",
        textarea: "Texto largo",
        date: "Fecha",
        number: "Número",
        boolean: "Sí / No",
        select: "Lista desplegable"
      },
      displayModes: {
        hexagon: "Hexágono (mapa)",
        brick: "Ladrillo lateral"
      },
      sections: {
        identity: {
          label: "Identidad",
          description: "Nombre y visualización"
        },
        fields: {
          label: "Campos",
          description: "Formulario"
        },
        map: {
          label: "Mapa",
          description: "Hexágono y posición"
        }
      }
    },
    profileForm: {
      eyebrow: "Perfiles de acceso",
      title: "Nuevo perfil",
      subtitle: "Cree un perfil derivado con derechos y herencia configurables.",
      sectionsAria: "Secciones del perfil",
      generalTitle: "Información",
      generalDesc: "El identificador técnico es permanente; la etiqueta se muestra en admin.",
      nameLabel: "Identificador",
      namePlaceholder: "agent",
      labelField: "Descripción",
      labelPlaceholder: "Ej. Acceso estándar técnico",
      inheritanceTitle: "Herencia de derechos",
      inheritanceDesc: "Un perfil hijo hereda derechos del perfil padre.",
      parentLabel: "Perfil padre",
      noParent: "Ninguno · perfil autónomo",
      defaultRightsLabel: "Derechos predeterminados",
      defaultRightsHint: "Los nuevos perfiles activan contratos y contactos por defecto.",
      createBtn: "Crear perfil",
      sections: {
        general: {
          label: "General",
          description: "Identificador y etiqueta"
        },
        inheritance: {
          label: "Herencia",
          description: "Perfil padre"
        }
      }
    },
    webhookForm: {
      eyebrow: "Webhooks de notificaciones",
      createTitle: "Nuevo webhook",
      editTitle: "Modificar {name}",
      editFallback: "el webhook",
      createSubtitle: "Conecte Veritas a Teams, Slack o un endpoint HTTP.",
      editSubtitle: "Actualice canal, URL y disponibilidad.",
      sectionsAria: "Secciones del webhook",
      typeTitle: "Tipo de canal",
      typeDesc: "Plataforma que recibirá las notificaciones salientes.",
      configTitle: "Configuración",
      configDesc: "Nombre, URL y prueba de conexión antes de guardar.",
      webhookActiveLabel: "Webhook activo",
      webhookActiveHint: "Los webhooks inactivos ya no reciben notificaciones.",
      nameLabel: "Nombre del webhook",
      namePlaceholder: "Ej. Teams L1",
      urlLabel: "URL del webhook",
      urlPlaceholder: "https://...",
      channelDetectedLabel: "Canal detectado",
      createBtn: "Crear webhook",
      sections: {
        type: {
          label: "Tipo",
          description: "Canal destino"
        },
        config: {
          label: "Configuración",
          description: "Nombre, URL y prueba"
        }
      }
    },
    agentForm: {
      eyebrow: "Gestión de agentes",
      createTitle: "Nuevo agente",
      editTitle: "Modificar agente",
      createSubtitle: "Cree una cuenta de agente con perfil y contraseña de acceso.",
      editSubtitle: "Actualice datos, perfil, seguridad y MFA.",
      sectionsAria: "Secciones del agente",
      identityTitle: "Identidad",
      identityDescCreate: "Introduzca el email de acceso y un nombre de usuario opcional.",
      identityDescEdit: "Actualice el email y nombre de usuario del agente.",
      emailLabel: "Dirección de email",
      emailPlaceholder: "ejemplo@dominio.es",
      usernameLabel: "Nombre de usuario",
      usernamePlaceholder: "Opcional",
      accountActiveLabel: "Cuenta activa",
      securityTitle: "Seguridad",
      securityDescCreate: "Defina una contraseña inicial (mínimo 6 caracteres).",
      securityDescEdit: "Deje vacío para conservar la contraseña actual, o introduzca una nueva (mín. 6 caracteres).",
      passwordLabel: "Contraseña",
      passwordPlaceholderCreate: "Mínimo 6 caracteres",
      passwordPlaceholderEdit: "Dejar vacío para no cambiar",
      passwordConfirmLabel: "Confirmación",
      passwordConfirmPlaceholder: "Repita la contraseña",
      accessTitle: "Perfil de acceso",
      accessDesc: "El perfil determina derechos y módulos visibles en Veritas.",
      profileLabel: "Perfil asignado",
      mfaTitle: "Autenticación MFA",
      mfaDesc: "Estado de autenticación en dos pasos para este agente.",
      mfaHintEnabled: "El agente debe introducir un código TOTP en cada conexión.",
      mfaHintPending: "Configuración MFA iniciada pero aún no validada.",
      mfaHintOff: "MFA no activa en esta cuenta.",
      releaseMfaBtn: "Restablecer MFA",
      footerNoEmail: "Sin email",
      footerNoProfile: "Sin perfil",
      footerInactive: "Inactivo",
      deleteTitle: "Eliminar este agente",
      createBtn: "Crear agente",
      creating: "Creación…",
      saving: "Guardando…",
      sections: {
        identity: {
          label: "Identidad",
          description: "Email y nombre"
        },
        security: {
          label: "Seguridad",
          description: "Contraseña"
        },
        access: {
          label: "Acceso",
          description: "Perfil asignado"
        },
        mfa: {
          label: "MFA",
          description: "Autenticación"
        }
      }
    }
  }
};
const getFormModalsRoot = createLocaleGetter(FORM_MODALS);
export function getAdminFormModalCopy(locale, modalKey) {
  const root = getFormModalsRoot(locale);
  return root[modalKey] || {};
}
function buildFormSections(copy, sectionIds, icons) {
  return sectionIds.map(id => ({
    id,
    label: copy.sections?.[id]?.label || id,
    description: copy.sections?.[id]?.description || "",
    icon: icons[id] || "mdi:information-outline"
  }));
}
export function getTechNewsFeedFormSections(locale) {
  const copy = getAdminFormModalCopy(locale, "techNewsFeedForm");
  return buildFormSections(copy, ["source", "display"], {
    source: "mdi:rss",
    display: "mdi:tune-variant"
  });
}
export function getContractModuleOptionFormSections(locale) {
  const copy = getAdminFormModalCopy(locale, "contractModuleOptionForm");
  return buildFormSections(copy, ["identity", "presentation"], {
    identity: "mdi:identifier",
    presentation: "mdi:palette-outline"
  });
}
export function getEquipmentFamilyFormSections(locale) {
  const copy = getAdminFormModalCopy(locale, "equipmentFamilyForm");
  return buildFormSections(copy, ["identity", "fields", "map"], {
    identity: "mdi:identifier",
    fields: "mdi:form-select",
    map: "mdi:hexagon-outline"
  });
}
export function getProfileFormSections(locale) {
  const copy = getAdminFormModalCopy(locale, "profileForm");
  return buildFormSections(copy, ["general", "inheritance"], {
    general: "mdi:information-outline",
    inheritance: "mdi:source-branch"
  });
}
export function getWebhookFormSections(locale) {
  const copy = getAdminFormModalCopy(locale, "webhookForm");
  return buildFormSections(copy, ["type", "config"], {
    type: "mdi:lan-connect",
    config: "mdi:cog-outline"
  });
}
export function getAgentFormSections(locale, isEdit = false) {
  const copy = getAdminFormModalCopy(locale, "agentForm");
  const sectionIds = isEdit ? ["identity", "security", "access", "mfa"] : ["identity", "security", "access"];
  const icons = {
    identity: "mdi:card-account-details-outline",
    security: "mdi:lock-outline",
    access: "mdi:shield-account-outline",
    mfa: "mdi:shield-key-outline"
  };
  return buildFormSections(copy, sectionIds, icons);
}
export function getEquipmentFieldTypes(locale) {
  const types = getAdminFormModalCopy(locale, "equipmentFamilyForm").fieldTypes || {};
  return ["text", "textarea", "date", "number", "boolean", "select"].map(value => ({
    value,
    label: types[value] || value
  }));
}
export function getEquipmentDisplayModes(locale) {
  const modes = getAdminFormModalCopy(locale, "equipmentFamilyForm").displayModes || {};
  return ["hexagon", "brick"].map(value => ({
    value,
    label: modes[value] || value
  }));
}
export { interpolate, getFormModalsRoot };
