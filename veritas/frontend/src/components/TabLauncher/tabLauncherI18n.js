import { createLocaleGetter } from "../../i18n/translate";
const TAB_LAUNCHER_COPY = {
  fr: {
    title: "Ouvrir un onglet",
    subtitle: "Choisissez une destination. Les fiches détaillées s'ouvrent dans un nouvel onglet depuis la liste correspondante.",
    sections: {
      crm: "CRM",
      exploitation: "Exploitation",
      managed: "Services managés",
      pilotage: "Pilotage",
      account: "Compte"
    },
    items: {
      enterprises: "Entreprises",
      enterprisesDesc: "Liste des clients · ouvrir une fiche en onglet",
      contacts: "Contacts",
      contactsDesc: "Répertoire · ouvrir une fiche contact en onglet",
      support: "Support",
      supportDesc: "Tickets · ouvrir un ticket en onglet",
      sales: "Prestations & installations",
      salesDesc: "Demandes commerciales et chantiers",
      planning: "Planning",
      planningDesc: "Agenda et interventions",
      supervision: "Centre de supervision",
      supervisionDesc: "Alertes actives et historique",
      inventory: "Inventaire périphériques",
      inventoryDesc: "Tous les périphériques clients · ouvrir en onglet",
      cyber: "Cybersécurité",
      cyberDesc: "Campagnes, antivirus et antispam",
      cloud: "Cloud IT et services",
      cloudDesc: "Tenants Microsoft et domaines",
      monitoring: "Monitoring",
      monitoringDesc: "Clients et rapports de supervision",
      reports: "Rapports",
      reportsDesc: "Éditeur de rapports monitoring",
      sla: "SLA & KPI",
      slaDesc: "Indicateurs de niveau de service",
      billing: "Facturation",
      billingDesc: "Suivi de la facturation MSP",
      documents: "Documents",
      documentsDesc: "Hub documentaire · ouvrir en onglet",
      knowledgeBase: "Base de connaissances",
      knowledgeBaseDesc: "Articles internes et portail client",
      myDocs: "Mes documents",
      myDocsDesc: "Espace documentaire personnel",
      admin: "Administration",
      adminDesc: "Paramètres et configuration",
      home: "Accueil",
      homeDesc: "Tableau de bord"
    },
    tabBadge: "Onglet",
    proBadge: "Pro"
  },
  en: {
    title: "Open a tab",
    subtitle: "Pick a destination. Detail views open in a new tab from the corresponding list.",
    sections: {
      crm: "CRM",
      exploitation: "Operations",
      managed: "Managed services",
      pilotage: "Management",
      account: "Account"
    },
    items: {
      enterprises: "Companies",
      enterprisesDesc: "Client list · open a company tab",
      contacts: "Contacts",
      contactsDesc: "Directory · open a contact tab",
      support: "Support",
      supportDesc: "Tickets · open a ticket tab",
      sales: "Services & installations",
      salesDesc: "Sales requests and projects",
      planning: "Scheduling",
      planningDesc: "Calendar and field work",
      supervision: "Monitoring center",
      supervisionDesc: "Active alerts and history",
      inventory: "Device inventory",
      inventoryDesc: "All client devices · open in a tab",
      cyber: "Cybersecurity",
      cyberDesc: "Campaigns, antivirus and antispam",
      cloud: "Cloud IT & Services",
      cloudDesc: "Microsoft tenants and domains",
      monitoring: "Monitoring",
      monitoringDesc: "Clients and monitoring reports",
      reports: "Reports",
      reportsDesc: "Monitoring report editor",
      sla: "SLA & KPI",
      slaDesc: "Service level indicators",
      billing: "Billing",
      billingDesc: "MSP billing overview",
      documents: "Documents",
      documentsDesc: "Document hub · open in a tab",
      knowledgeBase: "Knowledge base",
      knowledgeBaseDesc: "Internal articles and client portal",
      myDocs: "My documents",
      myDocsDesc: "Personal document space",
      admin: "Administration",
      adminDesc: "Settings and configuration",
      home: "Home",
      homeDesc: "Dashboard"
    },
    tabBadge: "Tab",
    proBadge: "Pro"
  },
  de: {
    title: "Tab öffnen",
    subtitle: "Wählen Sie ein Ziel. Detailansichten öffnen sich als neuer Tab aus der entsprechenden Liste.",
    sections: {
      crm: "CRM",
      exploitation: "Betrieb",
      managed: "Managed Services",
      pilotage: "Steuerung",
      account: "Konto"
    },
    items: {
      enterprises: "Unternehmen",
      enterprisesDesc: "Kundenliste · Unternehmens-Tab öffnen",
      contacts: "Kontakte",
      contactsDesc: "Verzeichnis · Kontakt-Tab öffnen",
      support: "Support",
      supportDesc: "Tickets · Ticket-Tab öffnen",
      sales: "Leistungen & Installationen",
      salesDesc: "Vertriebsanfragen und Projekte",
      planning: "Planung",
      planningDesc: "Kalender und Einsätze",
      supervision: "Supervisionszentrum",
      supervisionDesc: "Aktive Alarme und Verlauf",
      inventory: "Geräteinventar",
      inventoryDesc: "Alle Kundengeräte · als Tab öffnen",
      cyber: "Cybersicherheit",
      cyberDesc: "Kampagnen, Antivirus und Antispam",
      cloud: "Cloud IT & Services",
      cloudDesc: "Microsoft-Mandanten und Domains",
      monitoring: "Monitoring",
      monitoringDesc: "Kunden und Monitoring-Berichte",
      reports: "Berichte",
      reportsDesc: "Monitoring-Berichtseditor",
      sla: "SLA & KPI",
      slaDesc: "Service-Level-Kennzahlen",
      billing: "Abrechnung",
      billingDesc: "MSP-Abrechnungsübersicht",
      documents: "Dokumente",
      documentsDesc: "Dokumenten-Hub · als Tab öffnen",
      knowledgeBase: "Wissensdatenbank",
      knowledgeBaseDesc: "Interne Artikel und Kundenportal",
      myDocs: "Meine Dokumente",
      myDocsDesc: "Persönlicher Dokumentenbereich",
      admin: "Administration",
      adminDesc: "Einstellungen und Konfiguration",
      home: "Startseite",
      homeDesc: "Dashboard"
    },
    tabBadge: "Tab",
    proBadge: "Pro"
  },
  it: {
    title: "Apri una scheda",
    subtitle: "Scegli una destinazione. Le schede dettaglio si aprono dalla lista corrispondente.",
    sections: {
      crm: "CRM",
      exploitation: "Operazioni",
      managed: "Servizi gestiti",
      pilotage: "Pilotaggio",
      account: "Account"
    },
    items: {
      enterprises: "Aziende",
      enterprisesDesc: "Elenco clienti · apri scheda azienda",
      contacts: "Contatti",
      contactsDesc: "Rubrica · apri scheda contatto",
      support: "Supporto",
      supportDesc: "Ticket · apri scheda ticket",
      sales: "Prestazioni e installazioni",
      salesDesc: "Richieste commerciali e cantieri",
      planning: "Pianificazione",
      planningDesc: "Agenda e interventi",
      supervision: "Centro di supervisione",
      supervisionDesc: "Allarmi attivi e cronologia",
      inventory: "Inventario periferiche",
      inventoryDesc: "Tutte le periferiche clienti · apri in scheda",
      cyber: "Cybersicurezza",
      cyberDesc: "Campagne, antivirus e antispam",
      cloud: "Cloud IT e servizi",
      cloudDesc: "Tenant Microsoft e domini",
      monitoring: "Monitoring",
      monitoringDesc: "Clienti e report di supervisione",
      reports: "Report",
      reportsDesc: "Editor report monitoring",
      sla: "SLA & KPI",
      slaDesc: "Indicatori di livello di servizio",
      billing: "Fatturazione",
      billingDesc: "Panoramica fatturazione MSP",
      documents: "Documenti",
      documentsDesc: "Hub documentale · apri in scheda",
      knowledgeBase: "Knowledge base",
      knowledgeBaseDesc: "Articoli interni e portale cliente",
      myDocs: "I miei documenti",
      myDocsDesc: "Spazio documenti personale",
      admin: "Amministrazione",
      adminDesc: "Impostazioni e configurazione",
      home: "Home",
      homeDesc: "Dashboard"
    },
    tabBadge: "Scheda",
    proBadge: "Pro"
  },
  es: {
    title: "Abrir una pestaña",
    subtitle: "Elija un destino. Las fichas detalladas se abren desde la lista correspondiente.",
    sections: {
      crm: "CRM",
      exploitation: "Operaciones",
      managed: "Servicios gestionados",
      pilotage: "Gestión",
      account: "Cuenta"
    },
    items: {
      enterprises: "Empresas",
      enterprisesDesc: "Lista de clientes · abrir ficha en pestaña",
      contacts: "Contactos",
      contactsDesc: "Directorio · abrir ficha de contacto",
      support: "Soporte",
      supportDesc: "Tickets · abrir ticket en pestaña",
      sales: "Prestaciones e instalaciones",
      salesDesc: "Solicitudes comerciales y obras",
      planning: "Planificación",
      planningDesc: "Agenda e intervenciones",
      supervision: "Centro de supervisión",
      supervisionDesc: "Alertas activas e historial",
      inventory: "Inventario de periféricos",
      inventoryDesc: "Todos los periféricos de clientes · abrir en pestaña",
      cyber: "Ciberseguridad",
      cyberDesc: "Campañas, antivirus y antispam",
      cloud: "Cloud IT y servicios",
      cloudDesc: "Tenants Microsoft y dominios",
      monitoring: "Monitorización",
      monitoringDesc: "Clientes e informes de supervisión",
      reports: "Informes",
      reportsDesc: "Editor de informes de monitorización",
      sla: "SLA y KPI",
      slaDesc: "Indicadores de nivel de servicio",
      billing: "Facturación",
      billingDesc: "Resumen de facturación MSP",
      documents: "Documentos",
      documentsDesc: "Hub documental · abrir en pestaña",
      knowledgeBase: "Base de conocimiento",
      knowledgeBaseDesc: "Artículos internos y portal cliente",
      myDocs: "Mis documentos",
      myDocsDesc: "Espacio documental personal",
      admin: "Administración",
      adminDesc: "Ajustes y configuración",
      home: "Inicio",
      homeDesc: "Panel de control"
    },
    tabBadge: "Pestaña",
    proBadge: "Pro"
  }
};
export const getTabLauncherCopy = createLocaleGetter(TAB_LAUNCHER_COPY);
export const TAB_LAUNCHER_SECTIONS = [{
  sectionKey: "crm",
  items: [{
    docType: "Contrat",
    icon: "mdi:office-building",
    labelKey: "enterprises",
    descKey: "enterprisesDesc",
    accessKey: "Contrat",
    opensTab: true
  }, {
    docType: "Contact",
    icon: "mdi:account-group-outline",
    labelKey: "contacts",
    descKey: "contactsDesc",
    accessKey: "Contact",
    opensTab: true
  }]
}, {
  sectionKey: "exploitation",
  items: [{
    docType: "Ticket",
    icon: "mdi:message-processing-outline",
    labelKey: "support",
    descKey: "supportDesc",
    accessKey: "Ticket",
    opensTab: true
  }, {
    docType: "TicketSales",
    icon: "mdi:briefcase-edit-outline",
    labelKey: "sales",
    descKey: "salesDesc",
    accessKey: "TicketSales",
    proOnly: true
  }, {
    docType: "Planning",
    icon: "mdi:calendar-clock-outline",
    labelKey: "planning",
    descKey: "planningDesc",
    accessKey: "Planning",
    proOnly: true
  }]
}, {
  sectionKey: "managed",
  items: [{
    docType: "Hardware",
    icon: "mdi:monitor-dashboard",
    labelKey: "supervision",
    descKey: "supervisionDesc",
    accessKey: "Hardware",
    opensTab: true
  }, {
    docType: "EquipmentInventory",
    icon: "mdi:devices",
    labelKey: "inventory",
    descKey: "inventoryDesc",
    accessKey: "EquipmentInventory",
    opensTab: true
  }, {
    docType: "Cybersecurite",
    icon: "mdi:shield-check-outline",
    labelKey: "cyber",
    descKey: "cyberDesc",
    accessKey: "Cybersecurite"
  }, {
    docType: "Service",
    icon: "mdi:cloud-outline",
    labelKey: "cloud",
    descKey: "cloudDesc",
    accessKey: "Service"
  }, {
    docType: "Rapport",
    icon: "mdi:file-chart-outline",
    labelKey: "reports",
    descKey: "reportsDesc",
    accessKey: "Mon",
    proOnly: true
  }]
}, {
  sectionKey: "pilotage",
  items: [{
    docType: "DocumentsHub",
    icon: "mdi:folder-multiple-outline",
    labelKey: "documents",
    descKey: "documentsDesc",
    accessKey: "DocumentsHub",
    opensTab: true,
    proOnly: true
  }, {
    docType: "KnowledgeBase",
    icon: "mdi:book-open-page-variant-outline",
    labelKey: "knowledgeBase",
    descKey: "knowledgeBaseDesc",
    accessKey: "KnowledgeBase"
  }]
}, {
  sectionKey: "account",
  items: [{
    docType: "Home",
    icon: "mdi:home-outline",
    labelKey: "home",
    descKey: "homeDesc"
  }, {
    docType: "Admin",
    icon: "mdi:cog-outline",
    labelKey: "admin",
    descKey: "adminDesc",
    adminOnly: true
  }]
}];
