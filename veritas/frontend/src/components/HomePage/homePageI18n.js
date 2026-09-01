import { interpolate, pickLocaleMessages } from "../../i18n/translate";
const HOME_COPY = {
  fr: {
    heroTitle: "Tableau de bord MSP",
    heroGreeting: "Bonjour, {name}",
    heroSubtitle: "Tout ce qu'il vous faut, au même endroit.",
    loading: "Chargement du tableau de bord…",
    errorLoad: "Impossible de charger le tableau de bord.",
    refresh: "Actualiser le tableau de bord",
    retry: "Réessayer",
    kpiAriaLabel: "Indicateurs parc",
    secondaryKpiAriaLabel: "Indicateurs portefeuille",
    kpiNavigate: "Voir {label}",
    kpiSplit: {
      devices: "Périphériques",
      backup: "Sauvegardes",
      aria: "{devices} périphériques, {backup} sauvegardes"
    },
    kpis: {
      clientsUnderContract: "Entreprises",
      equipMonitoredTotal: "Périphériques",
      equipUnderSurveillanceCount: "Monitorés",
      equipSurveillancePercent: "Couverture",
      rmmAgents: "Agents RMM",
      contractsExpiringWindow: "Contrats expirant",
      contractsExpired: "Contrats expirés",
      licensesExpired: "Licences expirées",
      openTickets: "Tickets ouverts",
      urgentTickets: "Urgents",
      todoCount: "À traiter"
    },
    today: {
      title: "Aujourd'hui",
      ariaLabel: "Priorités du jour",
      urgent: "tickets urgents",
      todo: "à traiter",
      nextEvent: "Prochain RDV",
      noEvent: "Aucun RDV à venir"
    },
    mobileTabs: {
      aria: "Sections de l'accueil",
      support: "Support",
      services: "Services",
      events: "Événements",
      todo: "À traiter"
    },
    panels: {
      tickets: {
        supportTitle: "Mes tickets support",
        salesTitle: "Mes tickets services",
        kpiNew: "Nouveaux",
        kpiPending: "En attente",
        kpiInProgress: "En cours",
        kpiToValidate: "À valider",
        kpiTotal: "Total attribués",
        supportKpiAriaLabel: "Indicateurs de mes tickets support",
        salesKpiAriaLabel: "Indicateurs de mes tickets services",
        supportAction: "Voir le support",
        salesAction: "Voir les services",
        supportAdd: "Nouveau ticket",
        salesAdd: "Nouvelle demande"
      },
      events: {
        title: "Mes événements",
        weekHint: "7 prochains jours",
        action: "Voir le planning",
        add: "Nouvel événement",
        pagerAria: "Pagination des événements"
      },
      surveillance: {
        title: "Surveillance",
        globalFleet: "Parc global",
        empty: "Aucun équipement surveillé"
      },
      todo: {
        title: "À traiter",
        action: "Centre de supervision",
        pagerAria: "Pagination des éléments à traiter"
      }
    },
    ticketsTable: {
      number: "N°",
      priority: "Priorité",
      description: "Descriptif",
      company: "Entreprise",
      modified: "Modifié"
    },
    eventsTable: {
      type: "Type",
      title: "Titre",
      company: "Entreprise",
      when: "Date"
    },
    todoTable: {
      source: "Source",
      label: "Type",
      title: "Élément",
      detail: "Détail"
    },
    tableSort: {
      sortBy: "Trier par {column}"
    },
    priorities: {
      majorIncident: "Incident majeur",
      urgent: "Urgente",
      high: "Haute",
      low: "Basse",
      normal: "Normale"
    },
    empty: {
      tickets: "Aucun ticket ne vous est assigné",
      events: "Aucun événement assigné sur les 7 prochains jours",
      todo: "Rien à traiter pour le moment"
    },
    noTitle: "Sans titre",
    noClient: "Sans client",
    surveillance: {
      monitoredTooltip: "{label} : {ratio} surveillés ({percent}%)",
      freePlan: "Gratuit ·",
      discoverVeritas: "Découvrir Veritas",
      devicesMax: "{count} / {limit} périphériques max",
      devicesMaxOnly: "{limit} périphériques max"
    },
    eventTypes: {
      intervention: "Intervention",
      presentation: "Présentation",
      maintenance_preventive: "Préventive",
      maintenance: "Maintenance",
      mise_a_jour: "Mise à jour",
      conge: "Congé",
      integration_monitoring: "Monitoring",
      campagne: "Campagne",
      other: "Autre",
      fallback: "Événement"
    },
    todo: {
      sources: {
        supervision: "Supervision",
        cyber: "Cybersécurité",
        services: "Cloud IT et services"
      },
      modules: {
        antivirus: "Antivirus",
        antispam: "Antispam",
        backup: "Sauvegarde",
        save: "Sauvegarde",
        sauvegarde: "Sauvegarde",
        o365: "Microsoft 365",
        licences: "Licences",
        domain: "Nom de domaine",
        ssl: "Certificat SSL",
        firewall: "Firewall",
        toip: "TOIP / VoIP"
      },
      contract: {
        expired: "Contrat expiré",
        expiring: "Contrat à renouveler",
        suspended: "Contrat suspendu",
        default: "Contrat",
        meta: "Contrat entreprise"
      },
      licenseDefault: "Licence",
      bulk: {
        contractExpired: "{count} contrats expirés",
        contractExpiring: "{count} contrats à renouveler",
        contractSuspended: "{count} contrats suspendus",
        contractDefault: "{count} contrats",
        licenseExpired: "{count} {label} expirés",
        licenseExpiring: "{count} {label} à renouveler",
        more: "+{count}",
        expand: "Afficher le détail",
        collapse: "Masquer le détail"
      }
    },
    guide: {
      fabLabel: "Guide de la page d'accueil",
      tourTitle: "Page d'accueil",
      steps: {
        hero: {
          title: "Tableau de bord",
          content: "Votre page d'accueil regroupe en un coup d'œil l'activité MSP : organisation, message de bienvenue et date du jour."
        },
        today: {
          title: "Aujourd'hui",
          content: "Bandeau des priorités du jour : tickets urgents, éléments à traiter et prochain rendez-vous. Cliquez pour ouvrir le module concerné."
        },
        kpis: {
          title: "Parc d'équipements",
          content: "Trois indicateurs du parc : nombre total de périphériques, périphériques monitorés et taux de couverture.",
          contentCommunity: "Trois indicateurs du parc : nombre total de périphériques, périphériques monitorés et taux de couverture."
        },
        tickets: {
          title: "Mes tickets",
          content: "Deux blocs distincts : tickets support et tickets services qui vous sont assignés, avec les compteurs Nouveau / En attente / En cours / À valider / Total."
        },
        surveillance: {
          title: "Surveillance",
          content: "Visualisez la couverture de monitoring par famille d'équipements (serveurs, postes, réseau…) et le ratio global du parc surveillé."
        },
        events: {
          title: "Mes événements",
          content: "Consultez vos prochaines interventions et rendez-vous planifiés, avec le type d'événement et les dates. Le lien ouvre le planning complet."
        },
        todo: {
          title: "À traiter",
          content: "Éléments à traiter remontés depuis la supervision, la cybersécurité et les services : contrats, licences et alertes. Cliquez pour accéder au module concerné."
        },
        news: {
          title: "Actualités tech",
          content: "Une sélection d'articles et de veille technologique pour rester informé, sans quitter Veritas."
        }
      }
    }
  },
  en: {
    heroTitle: "MSP dashboard",
    heroGreeting: "Hello, {name}",
    heroSubtitle: "Everything you need, in one place.",
    loading: "Loading dashboard…",
    errorLoad: "Unable to load the dashboard.",
    refresh: "Refresh dashboard",
    retry: "Try again",
    kpiAriaLabel: "Fleet metrics",
    secondaryKpiAriaLabel: "Portfolio metrics",
    kpiNavigate: "View {label}",
    kpiSplit: {
      devices: "Devices",
      backup: "Backup",
      aria: "{devices} devices, {backup} backup"
    },
    kpis: {
      clientsUnderContract: "Companies",
      equipMonitoredTotal: "Devices",
      equipUnderSurveillanceCount: "Monitored",
      equipSurveillancePercent: "Coverage",
      rmmAgents: "RMM agents",
      contractsExpiringWindow: "Contracts expiring",
      contractsExpired: "Expired contracts",
      licensesExpired: "Expired licenses",
      openTickets: "Open tickets",
      urgentTickets: "Urgent",
      todoCount: "To do"
    },
    today: {
      title: "Today",
      ariaLabel: "Today's priorities",
      urgent: "urgent tickets",
      todo: "to do",
      nextEvent: "Next appointment",
      noEvent: "No upcoming appointment"
    },
    mobileTabs: {
      aria: "Home sections",
      support: "Support",
      services: "Services",
      events: "Events",
      todo: "To do"
    },
    panels: {
      tickets: {
        supportTitle: "My support tickets",
        salesTitle: "My services tickets",
        kpiNew: "New",
        kpiPending: "Pending",
        kpiInProgress: "In progress",
        kpiToValidate: "To validate",
        kpiTotal: "Total assigned",
        supportKpiAriaLabel: "My support ticket indicators",
        salesKpiAriaLabel: "My services ticket indicators",
        supportAction: "View support",
        salesAction: "View services",
        supportAdd: "New ticket",
        salesAdd: "New request"
      },
      events: {
        title: "My events",
        weekHint: "Next 7 days",
        action: "View schedule",
        add: "New event",
        pagerAria: "Events pagination"
      },
      surveillance: {
        title: "Monitoring",
        globalFleet: "Global fleet",
        empty: "No monitored equipment"
      },
      todo: {
        title: "To do",
        action: "Monitoring center",
        pagerAria: "To-do list pagination"
      }
    },
    ticketsTable: {
      number: "No.",
      priority: "Priority",
      description: "Description",
      company: "Company",
      modified: "Updated"
    },
    eventsTable: {
      type: "Type",
      title: "Title",
      company: "Company",
      when: "When"
    },
    todoTable: {
      source: "Source",
      label: "Type",
      title: "Item",
      detail: "Detail"
    },
    tableSort: {
      sortBy: "Sort by {column}"
    },
    priorities: {
      majorIncident: "Major incident",
      urgent: "Urgent",
      high: "High",
      low: "Low",
      normal: "Normal"
    },
    empty: {
      tickets: "No tickets assigned to you",
      events: "No events assigned to you in the next 7 days",
      todo: "Nothing to do right now"
    },
    noTitle: "Untitled",
    noClient: "No client",
    surveillance: {
      monitoredTooltip: "{label}: {ratio} monitored ({percent}%)",
      freePlan: "Free ·",
      discoverVeritas: "Discover Veritas",
      devicesMax: "{count} / {limit} devices max",
      devicesMaxOnly: "{limit} devices max"
    },
    eventTypes: {
      intervention: "On-site work",
      presentation: "Presentation",
      maintenance_preventive: "Preventive",
      maintenance: "Maintenance",
      mise_a_jour: "Update",
      conge: "Leave",
      integration_monitoring: "Monitoring",
      campagne: "Campaign",
      other: "Other",
      fallback: "Event"
    },
    todo: {
      sources: {
        supervision: "Monitoring",
        cyber: "Cybersecurity",
        services: "Cloud IT & Services"
      },
      modules: {
        antivirus: "Antivirus",
        antispam: "Antispam",
        backup: "Backup",
        save: "Backup",
        sauvegarde: "Backup",
        o365: "Microsoft 365",
        licences: "Licenses",
        domain: "Domain name",
        ssl: "SSL certificate",
        firewall: "Firewall",
        toip: "TOIP / VoIP"
      },
      contract: {
        expired: "Expired contract",
        expiring: "Contract to renew",
        suspended: "Suspended contract",
        default: "Contract",
        meta: "Company contract"
      },
      licenseDefault: "License",
      bulk: {
        contractExpired: "{count} expired contracts",
        contractExpiring: "{count} contracts to renew",
        contractSuspended: "{count} suspended contracts",
        contractDefault: "{count} contracts",
        licenseExpired: "{count} expired {label}",
        licenseExpiring: "{count} {label} to renew",
        more: "+{count}",
        expand: "Show details",
        collapse: "Hide details"
      }
    },
    guide: {
      fabLabel: "Home page guide",
      tourTitle: "Home",
      steps: {
        hero: {
          title: "Dashboard",
          content: "Your home page gives you a quick view of MSP activity: organization, welcome message and current date."
        },
        today: {
          title: "Today",
          content: "Priority strip for the day: urgent tickets, items to handle and next appointment. Click to open the relevant module."
        },
        kpis: {
          title: "Device fleet",
          content: "Three fleet metrics: total devices, monitored devices and coverage percentage.",
          contentCommunity: "Three fleet metrics: total devices, monitored devices and coverage percentage."
        },
        tickets: {
          title: "My tickets",
          content: "Two separate blocks: support tickets and services tickets assigned to you, with New / Pending / In progress / To validate / Total counts."
        },
        surveillance: {
          title: "Monitoring",
          content: "See monitoring coverage by equipment family (servers, workstations, network…) and the overall monitored fleet ratio."
        },
        events: {
          title: "My events",
          content: "Review your upcoming interventions and appointments with event type and dates. Use the link to open the full schedule."
        },
        todo: {
          title: "To do",
          content: "Items to handle from monitoring, cybersecurity and services: contracts, licenses and alerts. Click to open the relevant module."
        },
        news: {
          title: "Tech news",
          content: "A selection of articles and tech watch to stay informed without leaving Veritas."
        }
      }
    }
  },
  de: {
    heroTitle: "MSP-Dashboard",
    heroGreeting: "Guten Tag, {name}",
    heroSubtitle: "Alles, was Sie brauchen · an einem Ort.",
    loading: "Dashboard wird geladen…",
    errorLoad: "Dashboard konnte nicht geladen werden.",
    refresh: "Dashboard aktualisieren",
    retry: "Erneut versuchen",
    kpiAriaLabel: "Gerätekennzahlen",
    secondaryKpiAriaLabel: "Portfolio-Kennzahlen",
    kpiNavigate: "{label} anzeigen",
    kpiSplit: {
      devices: "Devices",
      backup: "Backup",
      aria: "{devices} Devices, {backup} Backup"
    },
    kpis: {
      clientsUnderContract: "Unternehmen",
      equipMonitoredTotal: "Geräte",
      equipUnderSurveillanceCount: "Überwacht",
      equipSurveillancePercent: "Abdeckung",
      rmmAgents: "RMM-Agenten",
      contractsExpiringWindow: "Auslaufende Verträge",
      contractsExpired: "Abgelaufene Verträge",
      licensesExpired: "Abgelaufene Lizenzen",
      openTickets: "Offene Tickets",
      urgentTickets: "Dringend",
      todoCount: "Zu erledigen"
    },
    today: {
      title: "Heute",
      ariaLabel: "Prioritäten heute",
      urgent: "dringende Tickets",
      todo: "zu erledigen",
      nextEvent: "Nächster Termin",
      noEvent: "Kein bevorstehender Termin"
    },
    mobileTabs: {
      aria: "Startbereiche",
      support: "Support",
      services: "Services",
      events: "Termine",
      todo: "Aufgaben"
    },
    panels: {
      tickets: {
        supportTitle: "Meine Support-Tickets",
        salesTitle: "Meine Service-Tickets",
        kpiNew: "Neu",
        kpiPending: "Ausstehend",
        kpiInProgress: "In Bearbeitung",
        kpiToValidate: "Zu validieren",
        kpiTotal: "Zugewiesen gesamt",
        supportKpiAriaLabel: "Kennzahlen meiner Support-Tickets",
        salesKpiAriaLabel: "Kennzahlen meiner Service-Tickets",
        supportAction: "Support anzeigen",
        salesAction: "Services anzeigen",
        supportAdd: "Neues Ticket",
        salesAdd: "Neue Anfrage"
      },
      events: {
        title: "Meine Termine",
        weekHint: "Nächste 7 Tage",
        action: "Planung anzeigen",
        add: "Neuer Termin",
        pagerAria: "Termin-Seiten"
      },
      surveillance: {
        title: "Überwachung",
        globalFleet: "Gesamtbestand",
        empty: "Keine überwachten Geräte"
      },
      todo: {
        title: "Zu erledigen",
        action: "Supervisionszentrum",
        pagerAria: "Aufgaben-Seiten"
      }
    },
    ticketsTable: {
      number: "Nr.",
      priority: "Priorität",
      description: "Beschreibung",
      company: "Unternehmen",
      modified: "Geändert"
    },
    eventsTable: {
      type: "Typ",
      title: "Titel",
      company: "Unternehmen",
      when: "Wann"
    },
    todoTable: {
      source: "Quelle",
      label: "Typ",
      title: "Element",
      detail: "Detail"
    },
    tableSort: {
      sortBy: "Sortieren nach {column}"
    },
    priorities: {
      majorIncident: "Schwerer Vorfall",
      urgent: "Dringend",
      high: "Hoch",
      low: "Niedrig",
      normal: "Normal"
    },
    empty: {
      tickets: "Ihnen sind keine Tickets zugewiesen",
      events: "Keine Termine in den nächsten 7 Tagen",
      todo: "Aktuell nichts zu erledigen"
    },
    noTitle: "Ohne Titel",
    noClient: "Kein Kunde",
    surveillance: {
      monitoredTooltip: "{label}: {ratio} überwacht ({percent}%)",
      freePlan: "Kostenlos ·",
      discoverVeritas: "Veritas entdecken",
      devicesMax: "{count} / {limit} Geräte max.",
      devicesMaxOnly: "{limit} Geräte max."
    },
    eventTypes: {
      intervention: "Einsatz",
      presentation: "Präsentation",
      maintenance_preventive: "Präventiv",
      maintenance: "Wartung",
      mise_a_jour: "Update",
      conge: "Urlaub",
      integration_monitoring: "Monitoring",
      campagne: "Kampagne",
      other: "Sonstiges",
      fallback: "Termin"
    },
    todo: {
      sources: {
        supervision: "Überwachung",
        cyber: "Cybersicherheit",
        services: "Cloud IT & Services"
      },
      modules: {
        antivirus: "Antivirus",
        antispam: "Antispam",
        backup: "Backup",
        save: "Backup",
        sauvegarde: "Backup",
        o365: "Microsoft 365",
        licences: "Lizenzen",
        domain: "Domainname",
        ssl: "SSL-Zertifikat",
        firewall: "Firewall",
        toip: "TOIP / VoIP"
      },
      contract: {
        expired: "Vertrag abgelaufen",
        expiring: "Vertrag zu verlängern",
        suspended: "Vertrag ausgesetzt",
        default: "Vertrag",
        meta: "Unternehmensvertrag"
      },
      licenseDefault: "Lizenz",
      bulk: {
        contractExpired: "{count} abgelaufene Verträge",
        contractExpiring: "{count} Verträge zu verlängern",
        contractSuspended: "{count} ausgesetzte Verträge",
        contractDefault: "{count} Verträge",
        licenseExpired: "{count} abgelaufene {label}",
        licenseExpiring: "{count} {label} zu verlängern",
        more: "+{count}",
        expand: "Details anzeigen",
        collapse: "Details ausblenden"
      }
    },
    guide: {
      fabLabel: "Leitfaden Startseite",
      tourTitle: "Startseite",
      steps: {
        hero: {
          title: "Dashboard",
          content: "Ihre Startseite bündelt die MSP-Aktivität des Tages: Organisation, Begrüßung und aktuelles Datum."
        },
        today: {
          title: "Heute",
          content: "Prioritätsleiste des Tages: dringende Tickets, offene Punkte und nächster Termin. Klick öffnet das passende Modul."
        },
        kpis: {
          title: "Gerätebestand",
          content: "Drei Kennzahlen: Geräte gesamt, überwachte Geräte und Abdeckungsgrad.",
          contentCommunity: "Drei Kennzahlen: Geräte gesamt, überwachte Geräte und Abdeckungsgrad."
        },
        tickets: {
          title: "Meine Tickets",
          content: "Zwei getrennte Blöcke: Support- und Service-Tickets, die Ihnen zugewiesen sind, mit Zählern Neu / Ausstehend / In Bearbeitung / Gesamt."
        },
        surveillance: {
          title: "Überwachung",
          content: "Monitoring-Abdeckung nach Gerätefamilie (Server, Arbeitsplätze, Netzwerk…) und Gesamtverhältnis des überwachten Bestands."
        },
        events: {
          title: "Meine Termine",
          content: "Kommende Einsätze und Termine mit Typ und Datum. Link öffnet die vollständige Planung."
        },
        todo: {
          title: "Zu erledigen",
          content: "Offene Punkte aus Überwachung, Cybersicherheit und Services: Verträge, Lizenzen und Warnungen. Klick öffnet das passende Modul."
        },
        news: {
          title: "Tech-News",
          content: "Auswahl an Artikeln und Tech-Watch, ohne Veritas zu verlassen."
        }
      }
    }
  },
  it: {
    heroTitle: "Dashboard MSP",
    heroGreeting: "Buongiorno, {name}",
    heroSubtitle: "Tutto ciò che serve, in un solo posto.",
    loading: "Caricamento dashboard…",
    errorLoad: "Impossibile caricare la dashboard.",
    refresh: "Aggiorna dashboard",
    retry: "Riprova",
    kpiAriaLabel: "Indicatori prioritari",
    secondaryKpiAriaLabel: "Indicatori portafoglio",
    kpiNavigate: "Vedi {label}",
    kpiSplit: {
      devices: "Devices",
      backup: "Backup",
      aria: "{devices} devices, {backup} backup"
    },
    kpis: {
      clientsUnderContract: "Aziende",
      equipMonitoredTotal: "Dispositivi",
      equipUnderSurveillanceCount: "Monitorati",
      equipSurveillancePercent: "Copertura",
      rmmAgents: "Agenti RMM",
      contractsExpiringWindow: "Contratti in scadenza",
      contractsExpired: "Contratti scaduti",
      licensesExpired: "Licenze scadute",
      openTickets: "Ticket aperti",
      urgentTickets: "Urgenti",
      todoCount: "Da trattare"
    },
    today: {
      title: "Oggi",
      ariaLabel: "Priorità di oggi",
      urgent: "ticket urgenti",
      todo: "da trattare",
      nextEvent: "Prossimo appuntamento",
      noEvent: "Nessun appuntamento in arrivo"
    },
    mobileTabs: {
      aria: "Sezioni home",
      support: "Supporto",
      services: "Servizi",
      events: "Eventi",
      todo: "Da fare"
    },
    panels: {
      tickets: {
        supportTitle: "I miei ticket support",
        salesTitle: "I miei ticket servizi",
        kpiNew: "Nuovi",
        kpiPending: "In attesa",
        kpiInProgress: "In corso",
        kpiToValidate: "Da validare",
        kpiTotal: "Totale assegnati",
        supportKpiAriaLabel: "Indicatori dei miei ticket support",
        salesKpiAriaLabel: "Indicatori dei miei ticket servizi",
        supportAction: "Vedi support",
        salesAction: "Vedi servizi",
        supportAdd: "Nuovo ticket",
        salesAdd: "Nuova richiesta"
      },
      events: {
        title: "I miei eventi",
        weekHint: "Prossimi 7 giorni",
        action: "Vedi planning",
        add: "Nuovo evento",
        pagerAria: "Paginazione eventi"
      },
      surveillance: {
        title: "Monitoraggio",
        globalFleet: "Parco globale",
        empty: "Nessun dispositivo monitorato"
      },
      todo: {
        title: "Da trattare",
        action: "Centro supervisione",
        pagerAria: "Paginazione da trattare"
      }
    },
    ticketsTable: {
      number: "N°",
      priority: "Priorità",
      description: "Descrizione",
      company: "Azienda",
      modified: "Modificato"
    },
    eventsTable: {
      type: "Tipo",
      title: "Titolo",
      company: "Azienda",
      when: "Quando"
    },
    todoTable: {
      source: "Fonte",
      label: "Tipo",
      title: "Elemento",
      detail: "Dettaglio"
    },
    tableSort: {
      sortBy: "Ordina per {column}"
    },
    priorities: {
      majorIncident: "Incidente grave",
      urgent: "Urgente",
      high: "Alta",
      low: "Bassa",
      normal: "Normale"
    },
    empty: {
      tickets: "Nessun ticket assegnato",
      events: "Nessun evento assegnato nei prossimi 7 giorni",
      todo: "Niente da trattare al momento"
    },
    noTitle: "Senza titolo",
    noClient: "Nessun cliente",
    surveillance: {
      monitoredTooltip: "{label}: {ratio} monitorati ({percent}%)",
      freePlan: "Gratuito ·",
      discoverVeritas: "Scopri Veritas",
      devicesMax: "{count} / {limit} dispositivi max",
      devicesMaxOnly: "{limit} dispositivi max"
    },
    eventTypes: {
      intervention: "Intervento",
      presentation: "Presentazione",
      maintenance_preventive: "Preventiva",
      maintenance: "Manutenzione",
      mise_a_jour: "Aggiornamento",
      conge: "Congedo",
      integration_monitoring: "Monitoraggio",
      campagne: "Campagna",
      other: "Altro",
      fallback: "Evento"
    },
    todo: {
      sources: {
        supervision: "Supervisione",
        cyber: "Cybersicurezza",
        services: "Cloud IT e servizi"
      },
      modules: {
        antivirus: "Antivirus",
        antispam: "Antispam",
        backup: "Backup",
        save: "Backup",
        sauvegarde: "Backup",
        o365: "Microsoft 365",
        licences: "Licenze",
        domain: "Nome di dominio",
        ssl: "Certificato SSL",
        firewall: "Firewall",
        toip: "TOIP / VoIP"
      },
      contract: {
        expired: "Contratto scaduto",
        expiring: "Contratto da rinnovare",
        suspended: "Contratto sospeso",
        default: "Contratto",
        meta: "Contratto azienda"
      },
      licenseDefault: "Licenza",
      bulk: {
        contractExpired: "{count} contratti scaduti",
        contractExpiring: "{count} contratti da rinnovare",
        contractSuspended: "{count} contratti sospesi",
        contractDefault: "{count} contratti",
        licenseExpired: "{count} {label} scaduti",
        licenseExpiring: "{count} {label} da rinnovare",
        more: "+{count}",
        expand: "Mostra dettaglio",
        collapse: "Nascondi dettaglio"
      }
    },
    guide: {
      fabLabel: "Guida pagina iniziale",
      tourTitle: "Home",
      steps: {
        hero: {
          title: "Dashboard",
          content: "La home riassume l'attività MSP del giorno: organizzazione, messaggio di benvenuto e data."
        },
        today: {
          title: "Oggi",
          content: "Barra delle priorità del giorno: ticket urgenti, elementi da trattare e prossimo appuntamento. Clicca per aprire il modulo."
        },
        kpis: {
          title: "Parco dispositivi",
          content: "Tre indicatori: dispositivi totali, dispositivi monitorati e percentuale di copertura.",
          contentCommunity: "Tre indicatori: dispositivi totali, dispositivi monitorati e percentuale di copertura."
        },
        tickets: {
          title: "I miei ticket",
          content: "Due blocchi distinti: ticket support e ticket servizi assegnati a te, con i conteggi Nuovi / In attesa / In corso / Totale."
        },
        surveillance: {
          title: "Monitoraggio",
          content: "Copertura di monitoring per famiglia di dispositivi (server, postazioni, rete…) e rapporto globale del parco monitorato."
        },
        events: {
          title: "I miei eventi",
          content: "Prossimi interventi e appuntamenti con tipo e date. Il link apre il planning completo."
        },
        todo: {
          title: "Da trattare",
          content: "Elementi da trattare da supervisione, cybersicurezza e servizi: contratti, licenze e alert. Clicca per aprire il modulo."
        },
        news: {
          title: "Notizie tech",
          content: "Selezione di articoli e tech watch senza uscire da Veritas."
        }
      }
    }
  },
  es: {
    heroTitle: "Panel MSP",
    heroGreeting: "Hola, {name}",
    heroSubtitle: "Todo lo que necesitas, en un solo lugar.",
    loading: "Cargando panel…",
    errorLoad: "No se pudo cargar el panel.",
    refresh: "Actualizar panel",
    retry: "Reintentar",
    kpiAriaLabel: "Indicadores prioritarios",
    secondaryKpiAriaLabel: "Indicadores de cartera",
    kpiNavigate: "Ver {label}",
    kpiSplit: {
      devices: "Devices",
      backup: "Backup",
      aria: "{devices} devices, {backup} backup"
    },
    kpis: {
      clientsUnderContract: "Empresas",
      equipMonitoredTotal: "Dispositivos",
      equipUnderSurveillanceCount: "Monitorizados",
      equipSurveillancePercent: "Cobertura",
      rmmAgents: "Agentes RMM",
      contractsExpiringWindow: "Contratos por vencer",
      contractsExpired: "Contratos vencidos",
      licensesExpired: "Licencias vencidas",
      openTickets: "Tickets abiertos",
      urgentTickets: "Urgentes",
      todoCount: "Por tratar"
    },
    today: {
      title: "Hoy",
      ariaLabel: "Prioridades de hoy",
      urgent: "tickets urgentes",
      todo: "por tratar",
      nextEvent: "Próxima cita",
      noEvent: "Ninguna cita próxima"
    },
    mobileTabs: {
      aria: "Secciones de inicio",
      support: "Soporte",
      services: "Servicios",
      events: "Eventos",
      todo: "Por tratar"
    },
    panels: {
      tickets: {
        supportTitle: "Mis tickets de soporte",
        salesTitle: "Mis tickets de servicios",
        kpiNew: "Nuevos",
        kpiPending: "En espera",
        kpiInProgress: "En curso",
        kpiToValidate: "Por validar",
        kpiTotal: "Total asignados",
        supportKpiAriaLabel: "Indicadores de mis tickets de soporte",
        salesKpiAriaLabel: "Indicadores de mis tickets de servicios",
        supportAction: "Ver soporte",
        salesAction: "Ver servicios",
        supportAdd: "Nuevo ticket",
        salesAdd: "Nueva solicitud"
      },
      events: {
        title: "Mis eventos",
        weekHint: "Próximos 7 días",
        action: "Ver planning",
        add: "Nuevo evento",
        pagerAria: "Paginación de eventos"
      },
      surveillance: {
        title: "Supervisión",
        globalFleet: "Parque global",
        empty: "Ningún equipo supervisado"
      },
      todo: {
        title: "Por tratar",
        action: "Centro de supervisión",
        pagerAria: "Paginación por tratar"
      }
    },
    ticketsTable: {
      number: "N.º",
      priority: "Prioridad",
      description: "Descripción",
      company: "Empresa",
      modified: "Modificado"
    },
    eventsTable: {
      type: "Tipo",
      title: "Título",
      company: "Empresa",
      when: "Fecha"
    },
    todoTable: {
      source: "Fuente",
      label: "Tipo",
      title: "Elemento",
      detail: "Detalle"
    },
    tableSort: {
      sortBy: "Ordenar por {column}"
    },
    priorities: {
      majorIncident: "Incidente grave",
      urgent: "Urgente",
      high: "Alta",
      low: "Baja",
      normal: "Normal"
    },
    empty: {
      tickets: "No tienes tickets asignados",
      events: "No tienes eventos asignados en los próximos 7 días",
      todo: "Nada por tratar por ahora"
    },
    noTitle: "Sin título",
    noClient: "Sin cliente",
    surveillance: {
      monitoredTooltip: "{label}: {ratio} supervisados ({percent}%)",
      freePlan: "Gratis ·",
      discoverVeritas: "Descubrir Veritas",
      devicesMax: "{count} / {limit} dispositivos máx.",
      devicesMaxOnly: "{limit} dispositivos máx."
    },
    eventTypes: {
      intervention: "Intervención",
      presentation: "Presentación",
      maintenance_preventive: "Preventivo",
      maintenance: "Mantenimiento",
      mise_a_jour: "Actualización",
      conge: "Permiso",
      integration_monitoring: "Monitorización",
      campagne: "Campaña",
      other: "Otro",
      fallback: "Evento"
    },
    todo: {
      sources: {
        supervision: "Supervisión",
        cyber: "Ciberseguridad",
        services: "Cloud IT y servicios"
      },
      modules: {
        antivirus: "Antivirus",
        antispam: "Antispam",
        backup: "Backup",
        save: "Backup",
        sauvegarde: "Backup",
        o365: "Microsoft 365",
        licences: "Licencias",
        domain: "Nombre de dominio",
        ssl: "Certificado SSL",
        firewall: "Firewall",
        toip: "TOIP / VoIP"
      },
      contract: {
        expired: "Contrato vencido",
        expiring: "Contrato por renovar",
        suspended: "Contrato suspendido",
        default: "Contrato",
        meta: "Contrato empresa"
      },
      licenseDefault: "Licencia",
      bulk: {
        contractExpired: "{count} contratos vencidos",
        contractExpiring: "{count} contratos por renovar",
        contractSuspended: "{count} contratos suspendidos",
        contractDefault: "{count} contratos",
        licenseExpired: "{count} {label} vencidos",
        licenseExpiring: "{count} {label} por renovar",
        more: "+{count}",
        expand: "Mostrar detalle",
        collapse: "Ocultar detalle"
      }
    },
    guide: {
      fabLabel: "Guía de inicio",
      tourTitle: "Inicio",
      steps: {
        hero: {
          title: "Panel",
          content: "La página de inicio reúne la actividad MSP del día: organización, bienvenida y fecha actual."
        },
        today: {
          title: "Hoy",
          content: "Franja de prioridades del día: tickets urgentes, elementos por tratar y próxima cita. Pulse para abrir el módulo."
        },
        kpis: {
          title: "Parque de dispositivos",
          content: "Tres indicadores: dispositivos totales, monitorizados y porcentaje de cobertura.",
          contentCommunity: "Tres indicadores: dispositivos totales, monitorizados y porcentaje de cobertura."
        },
        tickets: {
          title: "Mis tickets",
          content: "Dos bloques distintos: tickets de soporte y tickets de servicios asignados a ti, con contadores Nuevos / En espera / En curso / Total."
        },
        surveillance: {
          title: "Supervisión",
          content: "Cobertura de monitorización por familia de equipos (servidores, puestos, red…) y ratio global del parque supervisado."
        },
        events: {
          title: "Mis eventos",
          content: "Próximas intervenciones y citas con tipo y fechas. El enlace abre el planning completo."
        },
        todo: {
          title: "Por tratar",
          content: "Elementos de supervisión, ciberseguridad y servicios: contratos, licencias y alertas. Pulse para abrir el módulo."
        },
        news: {
          title: "Noticias tech",
          content: "Selección de artículos y veille tecnológica sin salir de Veritas."
        }
      }
    }
  }
};
export function getHomePageCopy(locale) {
  const t = pickLocaleMessages(HOME_COPY, locale);
  return {
    ...t,
    heroGreeting: name => interpolate(t.heroGreeting, {
      name
    }),
    getKpiLabel: key => t.kpis[key] || key,
    getKpiNavigateLabel: key => interpolate(t.kpiNavigate, {
      label: t.kpis[key] || key
    }),
    getFleetSplitAriaLabel: (devices, backup) => interpolate(t.kpiSplit.aria, {
      devices,
      backup
    }),
    getPriorityVisual: (priority, isMajorIncident = false) => {
      const key = String(priority || "normal").toLowerCase();
      if (isMajorIncident) {
        return {
          icon: "mdi:alert-octagon",
          label: t.priorities.majorIncident,
          tone: "major"
        };
      }
      if (key === "urgent" || key === "critical") {
        return {
          icon: "mdi:alert-octagon",
          label: t.priorities.urgent,
          tone: "major"
        };
      }
      if (key === "high") {
        return {
          icon: "mdi:arrow-up",
          label: t.priorities.high,
          tone: "high"
        };
      }
      if (key === "low") {
        return {
          icon: "mdi:arrow-down",
          label: t.priorities.low,
          tone: "low"
        };
      }
      return {
        icon: "mdi:minus",
        label: t.priorities.normal,
        tone: "normal"
      };
    },
    getEventTypeLabel: (type, typeLabel) => t.eventTypes[type] || t.eventTypes.other || typeLabel || type || t.eventTypes.fallback,
    getSurveillanceTooltip: (label, ratio, percent) => interpolate(t.surveillance.monitoredTooltip, {
      label,
      ratio,
      percent
    }),
    getDevicesMaxLabel: (count, limit, formatNumber) => count > 0 ? interpolate(t.surveillance.devicesMax, {
      count: formatNumber(count),
      limit: formatNumber(limit)
    }) : interpolate(t.surveillance.devicesMaxOnly, {
      limit: formatNumber(limit)
    }),
    buildGuideSteps: (isCommunity = false) => {
      const steps = t.guide.steps;
      const result = [{
        target: '[data-guide="home-hero"]',
        title: steps.hero.title,
        content: steps.hero.content
      }, {
        target: '[data-guide="home-tickets"]',
        title: steps.tickets.title,
        content: steps.tickets.content
      }];
      if (!isCommunity) {
        result.push({
          target: '[data-guide="home-events"]',
          title: steps.events.title,
          content: steps.events.content
        }, {
          target: '[data-guide="home-todo"]',
          title: steps.todo.title,
          content: steps.todo.content
        });
      }
      result.push({
        target: '[data-guide="home-news"]',
        title: steps.news.title,
        content: steps.news.content
      });
      return result;
    }
  };
}
export function getHomePageStrings(locale) {
  return getHomePageCopy(locale);
}
