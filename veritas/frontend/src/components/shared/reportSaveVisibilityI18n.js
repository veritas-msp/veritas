import { createLocaleGetter } from "../../i18n/translate";
const COPY = {
  fr: {
    label: "Visible sur le portail client",
    hint: "Archivé dans le coffre entreprise. Activé : accessible par le client.",
    on: "Visible",
    off: "Interne"
  },
  en: {
    label: "Visible on client portal",
    hint: "Archived in the company vault. On: accessible to the client.",
    on: "Visible",
    off: "Internal"
  },
  de: {
    label: "Im Kundenportal sichtbar",
    hint: "Im Unternehmens-Tresor archiviert. Ein: für den Kunden sichtbar.",
    on: "Sichtbar",
    off: "Intern"
  },
  it: {
    label: "Visibile sul portale cliente",
    hint: "Archiviato nel vault aziendale. Attivo: accessibile al cliente.",
    on: "Visibile",
    off: "Interno"
  },
  es: {
    label: "Visible en el portal cliente",
    hint: "Archivado en la bóveda de la empresa. Activado: accesible para el cliente.",
    on: "Visible",
    off: "Interno"
  }
};
export const getReportSaveVisibilityCopy = createLocaleGetter(COPY);
