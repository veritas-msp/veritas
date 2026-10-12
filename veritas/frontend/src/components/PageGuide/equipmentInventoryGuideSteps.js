import { pickLocaleMessages } from "../../i18n/translate";
import { mapGuideSteps } from "./mapGuideSteps";

const STEP_CONFIG = [{
  key: "hero",
  target: '[data-guide="inventory-hero"]'
}, {
  key: "filters",
  target: '[data-guide="inventory-filters"]'
}, {
  key: "search",
  target: '[data-guide="inventory-search"]'
}, {
  key: "table",
  target: '[data-guide="inventory-table"]'
}];

const COPY = {
  fr: {
    tourTitle: "Matériel",
    steps: {
      hero: {
        title: "Tout le parc, en un coup d’œil",
        content: "Cette page liste tous les périphériques de vos clients. Exportez la vue filtrée ou actualisez l’inventaire depuis les actions de la barre d’outils."
      },
      filters: {
        title: "Filtres latéraux",
        content: "Choisissez le statut, puis basculez entre Entreprises, Familles et Tags. Les sélections se combinent ; Réinitialiser efface tout."
      },
      search: {
        title: "Recherche rapide",
        content: "Tapez un nom, une IP, un n° de série, une entreprise ou un type pour réduire la liste instantanément."
      },
      table: {
        title: "Liste des périphériques",
        content: "Chaque ligne ouvre la fiche du matériel. Cochez plusieurs lignes pour une modification groupée, et surveillez les colonnes d’alertes et de supervision."
      }
    }
  },
  en: {
    tourTitle: "Hardware",
    steps: {
      hero: {
        title: "The whole fleet at a glance",
        content: "This page lists every device across your clients. Export the filtered view or refresh the inventory from the toolbar actions."
      },
      filters: {
        title: "Side filters",
        content: "Pick a status, then switch between Companies, Families and Tags. Selections combine; Reset clears everything."
      },
      search: {
        title: "Quick search",
        content: "Type a name, IP, serial, company or type to shrink the list instantly."
      },
      table: {
        title: "Device list",
        content: "Each row opens the device record. Select several rows for a bulk edit, and watch the alert and monitoring columns."
      }
    }
  },
  de: {
    tourTitle: "Hardware",
    steps: {
      hero: {
        title: "Der gesamte Park auf einen Blick",
        content: "Diese Seite listet alle Geräte Ihrer Kunden. Exportieren Sie die gefilterte Ansicht oder aktualisieren Sie das Inventar über die Kopfaktionen."
      },
      filters: {
        title: "Seitenfilter",
        content: "Status wählen, dann zwischen Unternehmen, Familien und Tags wechseln. Filter kombinieren sich; Zurücksetzen löscht alles."
      },
      search: {
        title: "Schnellsuche",
        content: "Geben Sie Name, IP, Seriennummer, Unternehmen oder Typ ein, um die Liste sofort einzugrenzen."
      },
      table: {
        title: "Geräteliste",
        content: "Jede Zeile öffnet den Geräte-Datensatz. Mehrere Zeilen für eine Sammeländerung markieren und Alarm- sowie Überwachungsspalten im Blick behalten."
      }
    }
  },
  it: {
    tourTitle: "Materiale",
    steps: {
      hero: {
        title: "Tutto il parco a colpo d’occhio",
        content: "Questa pagina elenca tutti i dispositivi dei clienti. Esportate la vista filtrata o aggiornate l’inventario dalle azioni in intestazione."
      },
      filters: {
        title: "Filtri laterali",
        content: "Scegliete lo stato, poi passate tra Aziende, Famiglie e Tag. Le selezioni si combinano; Reimposta cancella tutto."
      },
      search: {
        title: "Ricerca rapida",
        content: "Digitate nome, IP, seriale, azienda o tipo per ridurre subito l’elenco."
      },
      table: {
        title: "Elenco dispositivi",
        content: "Ogni riga apre la scheda del dispositivo. Selezionate più righe per una modifica di massa e controllate le colonne alert e supervisione."
      }
    }
  },
  es: {
    tourTitle: "Material",
    steps: {
      hero: {
        title: "Todo el parque de un vistazo",
        content: "Esta página lista todos los periféricos de sus clientes. Exporte la vista filtrada o actualice el inventario desde las acciones del encabezado."
      },
      filters: {
        title: "Filtros laterales",
        content: "Elija el estado y cambie entre Empresas, Familias y Etiquetas. Las selecciones se combinan; Restablecer borra todo."
      },
      search: {
        title: "Búsqueda rápida",
        content: "Escriba un nombre, IP, serie, empresa o tipo para reducir la lista al instante."
      },
      table: {
        title: "Lista de periféricos",
        content: "Cada fila abre la ficha del equipo. Seleccione varias filas para una edición masiva y vigile las columnas de alertas y supervisión."
      }
    }
  }
};

export function getEquipmentInventoryGuide(locale = "fr", handlers = {}) {
  const copy = pickLocaleMessages(COPY, locale);
  return {
    tourTitle: copy.tourTitle,
    steps: mapGuideSteps(STEP_CONFIG, copy.steps, handlers)
  };
}
