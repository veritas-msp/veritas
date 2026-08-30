import { pickLocaleMessages } from "../../i18n/translate";
import { mapGuideSteps } from "./mapGuideSteps";

const STEP_CONFIG = [{
  key: "hero",
  target: '[data-guide="docs-hero"]'
}, {
  key: "kpis",
  target: '[data-guide="docs-kpis"]'
}, {
  key: "toolbar",
  target: '[data-guide="docs-toolbar"]'
}, {
  key: "table",
  target: '[data-guide="docs-table"]'
}];

const COPY = {
  fr: {
    tourTitle: "Documents",
    steps: {
      hero: {
        title: "Hub documentaire",
        content: "Tous les fichiers clients sont centralisés ici : factures matériel, photos de baie, plans, contrats et procédures."
      },
      kpis: {
        title: "Volume",
        content: "Nombre de documents, entreprises concernées et poids total du dépôt."
      },
      toolbar: {
        title: "Recherche et filtres",
        content: "Cherchez un nom de fichier ou une entreprise, puis filtrez par client et par type de document."
      },
      table: {
        title: "Liste des fichiers",
        content: "Prévisualisez, téléchargez, éditez ou supprimez. La colonne visibilité indique si le fichier est partagé sur le portail client."
      }
    }
  },
  en: {
    tourTitle: "Documents",
    steps: {
      hero: {
        title: "Document hub",
        content: "All client files live here: hardware invoices, rack photos, plans, contracts and procedures."
      },
      kpis: {
        title: "Volume",
        content: "Document count, companies involved and total storage size."
      },
      toolbar: {
        title: "Search and filters",
        content: "Search a file name or company, then filter by client and document type."
      },
      table: {
        title: "File list",
        content: "Preview, download, edit or delete. The visibility column shows whether the file is shared on the client portal."
      }
    }
  },
  de: {
    tourTitle: "Dokumente",
    steps: {
      hero: {
        title: "Dokumenten-Hub",
        content: "Alle Kundendateien an einem Ort: Hardware-Rechnungen, Rack-Fotos, Pläne, Verträge und Verfahren."
      },
      kpis: {
        title: "Volumen",
        content: "Anzahl der Dokumente, betroffene Unternehmen und Gesamtgröße."
      },
      toolbar: {
        title: "Suche und Filter",
        content: "Suchen Sie Dateiname oder Unternehmen, dann filtern Sie nach Kunde und Dokumenttyp."
      },
      table: {
        title: "Dateiliste",
        content: "Vorschau, Download, Bearbeiten oder Löschen. Die Sichtbarkeitsspalte zeigt, ob die Datei im Kundenportal geteilt ist."
      }
    }
  },
  it: {
    tourTitle: "Documenti",
    steps: {
      hero: {
        title: "Hub documentale",
        content: "Tutti i file clienti sono qui: fatture hardware, foto rack, planimetrie, contratti e procedure."
      },
      kpis: {
        title: "Volume",
        content: "Numero di documenti, aziende coinvolte e dimensione totale."
      },
      toolbar: {
        title: "Ricerca e filtri",
        content: "Cercate un nome file o un’azienda, poi filtrate per cliente e tipo di documento."
      },
      table: {
        title: "Elenco file",
        content: "Anteprima, download, modifica o eliminazione. La colonna visibilità indica se il file è condiviso sul portale cliente."
      }
    }
  },
  es: {
    tourTitle: "Documentos",
    steps: {
      hero: {
        title: "Centro documental",
        content: "Todos los archivos de clientes están aquí: facturas de hardware, fotos de rack, planos, contratos y procedimientos."
      },
      kpis: {
        title: "Volumen",
        content: "Número de documentos, empresas implicadas y tamaño total."
      },
      toolbar: {
        title: "Búsqueda y filtros",
        content: "Busque un nombre de archivo o empresa, luego filtre por cliente y tipo de documento."
      },
      table: {
        title: "Lista de archivos",
        content: "Previsualice, descargue, edite o elimine. La columna de visibilidad indica si el archivo se comparte en el portal cliente."
      }
    }
  }
};

export function getDocumentsHubGuide(locale = "fr", handlers = {}) {
  const copy = pickLocaleMessages(COPY, locale);
  return {
    tourTitle: copy.tourTitle,
    steps: mapGuideSteps(STEP_CONFIG, copy.steps, handlers)
  };
}
