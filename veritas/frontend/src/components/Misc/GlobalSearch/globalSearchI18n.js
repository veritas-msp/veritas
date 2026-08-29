import { createLocaleGetter } from "../../../i18n/translate";

const GLOBAL_SEARCH_COPY = {
  fr: {
    button: "Recherche",
    buttonAria: "Recherche globale",
    placeholder: "Rechercher entreprises, tickets, périphériques…",
    emptyHint: "Tapez au moins 2 caractères pour lancer la recherche.",
    noResults: "Aucun résultat",
    loading: "Recherche…",
    shortcutHint: "Échap pour fermer",
    clear: "Effacer",
    groups: {
      page: "Pages",
      admin: "Administration",
      client: "Entreprises",
      contact: "Contacts",
      ticket: "Tickets support",
      ticket_sales: "Prestations",
      equipment: "Périphériques",
      tenant: "Tenants Microsoft",
      antivirus: "Antivirus",
      antispam: "Antispam",
      article: "Base de connaissances",
      agent: "Agents"
    }
  },
  en: {
    button: "Search",
    buttonAria: "Global search",
    placeholder: "Search companies, tickets, devices…",
    emptyHint: "Type at least 2 characters to search.",
    noResults: "No results",
    loading: "Searching…",
    shortcutHint: "Esc to close",
    clear: "Clear",
    groups: {
      page: "Pages",
      admin: "Administration",
      client: "Companies",
      contact: "Contacts",
      ticket: "Support tickets",
      ticket_sales: "Services",
      equipment: "Devices",
      tenant: "Microsoft tenants",
      antivirus: "Antivirus",
      antispam: "Antispam",
      article: "Knowledge base",
      agent: "Agents"
    }
  },
  de: {
    button: "Suche",
    buttonAria: "Globale Suche",
    placeholder: "Firmen, Tickets, Geräte suchen…",
    emptyHint: "Mindestens 2 Zeichen eingeben.",
    noResults: "Keine Ergebnisse",
    loading: "Suche…",
    shortcutHint: "Esc zum Schließen",
    clear: "Löschen",
    groups: {
      page: "Seiten",
      admin: "Administration",
      client: "Unternehmen",
      contact: "Kontakte",
      ticket: "Support-Tickets",
      ticket_sales: "Leistungen",
      equipment: "Geräte",
      tenant: "Microsoft-Mandanten",
      antivirus: "Antivirus",
      antispam: "Antispam",
      article: "Wissensdatenbank",
      agent: "Agenten"
    }
  },
  it: {
    button: "Ricerca",
    buttonAria: "Ricerca globale",
    placeholder: "Cerca aziende, ticket, dispositivi…",
    emptyHint: "Digitare almeno 2 caratteri.",
    noResults: "Nessun risultato",
    loading: "Ricerca…",
    shortcutHint: "Esc per chiudere",
    clear: "Cancella",
    groups: {
      page: "Pagine",
      admin: "Amministrazione",
      client: "Aziende",
      contact: "Contatti",
      ticket: "Ticket di supporto",
      ticket_sales: "Prestazioni",
      equipment: "Dispositivi",
      tenant: "Tenant Microsoft",
      antivirus: "Antivirus",
      antispam: "Antispam",
      article: "Knowledge base",
      agent: "Agenti"
    }
  },
  es: {
    button: "Buscar",
    buttonAria: "Búsqueda global",
    placeholder: "Buscar empresas, tickets, dispositivos…",
    emptyHint: "Escriba al menos 2 caracteres.",
    noResults: "Sin resultados",
    loading: "Buscando…",
    shortcutHint: "Esc para cerrar",
    clear: "Borrar",
    groups: {
      page: "Páginas",
      admin: "Administración",
      client: "Empresas",
      contact: "Contactos",
      ticket: "Tickets de soporte",
      ticket_sales: "Prestaciones",
      equipment: "Dispositivos",
      tenant: "Tenants Microsoft",
      antivirus: "Antivirus",
      antispam: "Antispam",
      article: "Base de conocimiento",
      agent: "Agentes"
    }
  }
};

export const getGlobalSearchCopy = createLocaleGetter(GLOBAL_SEARCH_COPY);

export const RESULT_TYPE_ICONS = {
  page: "mdi:view-dashboard-outline",
  admin: "mingcute:settings-6-fill",
  client: "mingcute:building-1-fill",
  contact: "mingcute:contacts-3-fill",
  ticket: "mdi:message-processing-outline",
  ticket_sales: "mdi:briefcase-edit-outline",
  equipment: "mdi:devices",
  tenant: "mdi:cloud-outline",
  antivirus: "mdi:shield-bug-outline",
  antispam: "mdi:email-lock-outline",
  article: "mdi:book-open-page-variant-outline",
  agent: "mdi:account-tie-outline"
};

export const RESULT_TYPE_ORDER = [
  "page",
  "admin",
  "client",
  "contact",
  "ticket",
  "ticket_sales",
  "equipment",
  "tenant",
  "antivirus",
  "antispam",
  "article",
  "agent"
];
