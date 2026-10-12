import { createLocaleGetter } from "../../../i18n/translate";
const SIDEBAR_COPY = {
  fr: {
    home: "Accueil",
    sections: {
      crm: "CRM",
      exploitation: "Exploitation",
      managed: "Services managés",
      pilotage: "Pilotage",
      modules: "Modules",
      appearance: "Apparence",
      notifications: "Notifications"
    },
    nav: {
      enterprises: "Entreprises",
      contact: "Contact",
      prestataire: "Prestataires",
      support: "Support",
      sales: "Prestations",
      planning: "Planning",
      dashboard: "Tableau de bord KPI",
      supervision: "Centre de supervision",
      campaigns: "Campagnes",
      inventory: "Matériel",
      cyber: "Cybersécurité",
      cloud: "Cloud IT et services",
      reports: "Rapports",
      monitoring: "Monitoring",
      documents: "Documents",
      knowledgeBase: "Base de connaissances"
    },
    modules: {
      addModule: "Ajouter un module",
      addModuleAria: "Ajouter un module · Veritas Pro"
    },
    theme: {
      lightMode: "Passer en mode clair",
      darkMode: "Passer en mode sombre",
      ariaGroup: "Thème d'affichage",
      light: "Clair",
      dark: "Sombre"
    },
    search: {
      tooltip: "Recherche",
      aria: "Recherche globale"
    },
    more: {
      tooltip: "Plus",
      aria: "Recherche et aide",
      menu: "Plus"
    },
    chrome: {
      openMenu: "Ouvrir le menu",
      closeMenu: "Fermer le menu",
      expandSidebar: "Afficher les noms",
      collapseSidebar: "Réduire le menu"
    },
    account: {
      menu: "Compte",
      menuAria: "Menu compte",
      myAccount: "Mon compte",
      patchNotes: "Patch notes",
      admin: "Administration",
      support: "Support",
      profilesSection: "Profils",
      switchProfile: "Basculer vers {profile}",
      profileSwitchError: "Impossible de changer de profil.",
      logout: "Se déconnecter"
    }
  },
  en: {
    home: "Home",
    sections: {
      crm: "CRM",
      exploitation: "Operations",
      managed: "Managed services",
      pilotage: "Management",
      modules: "Modules",
      appearance: "Appearance",
      notifications: "Notifications"
    },
    nav: {
      enterprises: "Companies",
      contact: "Contacts",
      prestataire: "Providers",
      support: "Support",
      sales: "Services",
      planning: "Scheduling",
      dashboard: "KPI Dashboard",
      supervision: "Monitoring center",
      campaigns: "Campaigns",
      inventory: "Hardware",
      cyber: "Cybersecurity",
      cloud: "Cloud IT & Services",
      reports: "Reports",
      monitoring: "Monitoring",
      documents: "Documents",
      knowledgeBase: "Knowledge base"
    },
    modules: {
      addModule: "Add a module",
      addModuleAria: "Add a module · Veritas Pro"
    },
    theme: {
      lightMode: "Switch to light mode",
      darkMode: "Switch to dark mode",
      ariaGroup: "Display theme",
      light: "Light",
      dark: "Dark"
    },
    search: {
      tooltip: "Search",
      aria: "Global search"
    },
    more: {
      tooltip: "More",
      aria: "Search and help",
      menu: "More"
    },
    chrome: {
      openMenu: "Open menu",
      closeMenu: "Close menu",
      expandSidebar: "Show labels",
      collapseSidebar: "Collapse menu"
    },
    account: {
      menu: "Account",
      menuAria: "Account menu",
      myAccount: "My account",
      patchNotes: "Patch notes",
      admin: "Administration",
      support: "Support",
      profilesSection: "Profiles",
      switchProfile: "Switch to {profile}",
      profileSwitchError: "Unable to switch profile.",
      logout: "Sign out"
    }
  },
  de: {
    home: "Startseite",
    sections: {
      crm: "CRM",
      exploitation: "Betrieb",
      managed: "Managed Services",
      pilotage: "Steuerung",
      modules: "Module",
      appearance: "Darstellung",
      notifications: "Benachrichtigungen"
    },
    nav: {
      enterprises: "Unternehmen",
      contact: "Kontakte",
      prestataire: "Dienstleister",
      support: "Support",
      sales: "Leistungen",
      planning: "Planung",
      dashboard: "KPI-Dashboard",
      supervision: "Supervisionszentrum",
      campaigns: "Kampagnen",
      inventory: "Hardware",
      cyber: "Cybersicherheit",
      cloud: "Cloud IT & Services",
      reports: "Berichte",
      monitoring: "Monitoring",
      documents: "Dokumente",
      knowledgeBase: "Wissensdatenbank"
    },
    modules: {
      addModule: "Modul hinzufügen",
      addModuleAria: "Modul hinzufügen · Veritas Pro"
    },
    theme: {
      lightMode: "Zum hellen Modus wechseln",
      darkMode: "Zum dunklen Modus wechseln",
      ariaGroup: "Anzeigethema",
      light: "Hell",
      dark: "Dunkel"
    },
    search: {
      tooltip: "Suche",
      aria: "Globale Suche"
    },
    more: {
      tooltip: "Mehr",
      aria: "Suche und Hilfe",
      menu: "Mehr"
    },
    chrome: {
      openMenu: "Menü öffnen",
      closeMenu: "Menü schließen",
      expandSidebar: "Bezeichnungen anzeigen",
      collapseSidebar: "Menü einklappen"
    },
    account: {
      menu: "Konto",
      menuAria: "Kontomenü",
      myAccount: "Mein Konto",
      patchNotes: "Patch notes",
      admin: "Administration",
      support: "Support",
      profilesSection: "Profile",
      switchProfile: "Zu {profile} wechseln",
      profileSwitchError: "Profilwechsel nicht möglich.",
      logout: "Abmelden"
    }
  },
  it: {
    home: "Home",
    sections: {
      crm: "CRM",
      exploitation: "Operazioni",
      managed: "Servizi gestiti",
      pilotage: "Pilotaggio",
      modules: "Moduli",
      appearance: "Aspetto",
      notifications: "Notifiche"
    },
    nav: {
      enterprises: "Aziende",
      contact: "Contatti",
      prestataire: "Fornitori",
      support: "Supporto",
      sales: "Prestazioni",
      planning: "Pianificazione",
      dashboard: "Dashboard KPI",
      supervision: "Centro di supervisione",
      campaigns: "Campagne",
      inventory: "Materiale",
      cyber: "Cybersicurezza",
      cloud: "Cloud IT e servizi",
      reports: "Report",
      monitoring: "Monitoraggio",
      documents: "Documenti",
      knowledgeBase: "Knowledge base"
    },
    modules: {
      addModule: "Aggiungi un modulo",
      addModuleAria: "Aggiungi un modulo · Veritas Pro"
    },
    theme: {
      lightMode: "Passa alla modalità chiara",
      darkMode: "Passa alla modalità scura",
      ariaGroup: "Tema di visualizzazione",
      light: "Chiaro",
      dark: "Scuro"
    },
    search: {
      tooltip: "Ricerca",
      aria: "Ricerca globale"
    },
    more: {
      tooltip: "Altro",
      aria: "Ricerca e aiuto",
      menu: "Altro"
    },
    chrome: {
      openMenu: "Apri il menu",
      closeMenu: "Chiudi il menu",
      expandSidebar: "Mostra i nomi",
      collapseSidebar: "Riduci il menu"
    },
    account: {
      menu: "Account",
      menuAria: "Menu account",
      myAccount: "Il mio account",
      patchNotes: "Patch notes",
      admin: "Amministrazione",
      support: "Supporto",
      profilesSection: "Profili",
      switchProfile: "Passa a {profile}",
      profileSwitchError: "Impossibile cambiare profilo.",
      logout: "Disconnetti"
    }
  },
  es: {
    home: "Inicio",
    sections: {
      crm: "CRM",
      exploitation: "Operaciones",
      managed: "Servicios gestionados",
      pilotage: "Pilotaje",
      modules: "Módulos",
      appearance: "Apariencia",
      notifications: "Notificaciones"
    },
    nav: {
      enterprises: "Empresas",
      contact: "Contactos",
      prestataire: "Proveedores",
      support: "Soporte",
      sales: "Prestaciones",
      planning: "Planificación",
      dashboard: "Panel KPI",
      supervision: "Centro de supervisión",
      campaigns: "Campañas",
      inventory: "Material",
      cyber: "Ciberseguridad",
      cloud: "Cloud IT y servicios",
      reports: "Informes",
      monitoring: "Monitorización",
      documents: "Documentos",
      knowledgeBase: "Base de conocimiento"
    },
    modules: {
      addModule: "Añadir un módulo",
      addModuleAria: "Añadir un módulo · Veritas Pro"
    },
    theme: {
      lightMode: "Cambiar a modo claro",
      darkMode: "Cambiar a modo oscuro",
      ariaGroup: "Tema de visualización",
      light: "Claro",
      dark: "Oscuro"
    },
    search: {
      tooltip: "Buscar",
      aria: "Búsqueda global"
    },
    more: {
      tooltip: "Más",
      aria: "Búsqueda y ayuda",
      menu: "Más"
    },
    chrome: {
      openMenu: "Abrir el menú",
      closeMenu: "Cerrar el menú",
      expandSidebar: "Mostrar nombres",
      collapseSidebar: "Reducir el menú"
    },
    account: {
      menu: "Cuenta",
      menuAria: "Menú de cuenta",
      myAccount: "Mi cuenta",
      patchNotes: "Patch notes",
      admin: "Administración",
      support: "Soporte",
      profilesSection: "Perfiles",
      switchProfile: "Cambiar a {profile}",
      profileSwitchError: "No se puede cambiar de perfil.",
      logout: "Cerrar sesión"
    }
  }
};
export const getSidebarCopy = createLocaleGetter(SIDEBAR_COPY);
export function localizeDocumentLabel(key, fallbackLabel, locale) {
  const nav = getSidebarCopy(locale).nav;
  if (key === "Mon") return nav.monitoring;
  if (key === "DocumentsHub") return nav.documents;
  if (key === "Campaigns") return nav.campaigns;
  if (key === "EquipmentInventory") return nav.inventory;
  if (key === "KnowledgeBase") return nav.knowledgeBase;
  return fallbackLabel;
}
