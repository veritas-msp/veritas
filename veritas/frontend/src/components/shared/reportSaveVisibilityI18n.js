import { createLocaleGetter } from "../../i18n/translate";
const COPY = {
  fr: {
    label: "Visible sur le portail client",
    hint: "",
    on: "Visible",
    off: "Interne"
  },
  en: {
    label: "Visible on client portal",
    hint: "",
    on: "Visible",
    off: "Internal"
  },
  de: {
    label: "Im Kundenportal sichtbar",
    hint: "",
    on: "Sichtbar",
    off: "Intern"
  },
  it: {
    label: "Visibile sul portale cliente",
    hint: "",
    on: "Visibile",
    off: "Interno"
  },
  es: {
    label: "Visible en el portal cliente",
    hint: "",
    on: "Visible",
    off: "Interno"
  }
};
export const getReportSaveVisibilityCopy = createLocaleGetter(COPY);
