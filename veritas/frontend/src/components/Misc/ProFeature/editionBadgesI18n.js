import { createLocaleGetter } from "../../../i18n/translate";
const EDITION_BADGES_COPY = {
  fr: {
    community: "Community",
    pro: "Pro"
  },
  en: {
    community: "Community",
    pro: "Pro"
  },
  de: {
    community: "Community",
    pro: "Pro"
  },
  it: {
    community: "Community",
    pro: "Pro"
  },
  es: {
    community: "Community",
    pro: "Pro"
  }
};
export const getEditionBadgesCopy = createLocaleGetter(EDITION_BADGES_COPY);
