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
      support: "Support",
      sales: "Prestations et installations",
      planning: "Planning",
      dashboard: "Tableau de bord KPI",
      supervision: "Centre de supervision",
      cyber: "Cybersécurité",
      cloud: "Cloud IT et services",
      reports: "Rapports",
      monitoring: "Monitoring",
      documents: "Documents"
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
    account: {
      menu: "Compte",
      menuAria: "Menu compte",
      myAccount: "Mon compte",
      admin: "Administration",
      support: "Support",
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
      support: "Support",
      sales: "Services & installations",
      planning: "Scheduling",
      dashboard: "KPI Dashboard",
      supervision: "Monitoring center",
      cyber: "Cybersecurity",
      cloud: "Cloud IT & Services",
      reports: "Reports",
      monitoring: "Monitoring",
      documents: "Documents"
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
    account: {
      menu: "Account",
      menuAria: "Account menu",
      myAccount: "My account",
      admin: "Administration",
      support: "Support",
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
      support: "Support",
      sales: "Leistungen & Installationen",
      planning: "Planung",
      dashboard: "KPI-Dashboard",
      supervision: "Supervisionszentrum",
      cyber: "Cybersicherheit",
      cloud: "Cloud IT & Services",
      reports: "Berichte",
      monitoring: "Monitoring",
      documents: "Dokumente"
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
    account: {
      menu: "Konto",
      menuAria: "Kontomenü",
      myAccount: "Mein Konto",
      admin: "Administration",
      support: "Support",
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
      support: "Supporto",
      sales: "Prestazioni e installazioni",
      planning: "Pianificazione",
      dashboard: "Dashboard KPI",
      supervision: "Centro di supervisione",
      cyber: "Cybersicurezza",
      cloud: "Cloud IT e servizi",
      reports: "Report",
      monitoring: "Monitoraggio",
      documents: "Documenti"
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
    account: {
      menu: "Account",
      menuAria: "Menu account",
      myAccount: "Il mio account",
      admin: "Amministrazione",
      support: "Supporto",
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
      support: "Soporte",
      sales: "Prestaciones e instalaciones",
      planning: "Planificación",
      dashboard: "Panel KPI",
      supervision: "Centro de supervisión",
      cyber: "Ciberseguridad",
      cloud: "Cloud IT y servicios",
      reports: "Informes",
      monitoring: "Monitorización",
      documents: "Documentos"
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
    account: {
      menu: "Cuenta",
      menuAria: "Menú de cuenta",
      myAccount: "Mi cuenta",
      admin: "Administración",
      support: "Soporte",
      logout: "Cerrar sesión"
    }
  }
};
export const getSidebarCopy = createLocaleGetter(SIDEBAR_COPY);
export function localizeDocumentLabel(key, fallbackLabel, locale) {
  const nav = getSidebarCopy(locale).nav;
  if (key === "Mon") return nav.monitoring;
  if (key === "DocumentsHub") return nav.documents;
  return fallbackLabel;
}
