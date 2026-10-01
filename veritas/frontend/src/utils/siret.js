import { createLocaleGetter } from "../i18n/translate";

const LEGAL_IDENTIFIER_COPY = {
  fr: {
    label: "Identifiant légal",
    placeholder: "Numéro d'immatriculation"
  },
  en: {
    label: "Legal identifier",
    placeholder: "Registration number"
  },
  de: {
    label: "Rechtliche Kennung",
    placeholder: "Handelsregisternummer"
  },
  it: {
    label: "Identificativo legale",
    placeholder: "Numero di registrazione"
  },
  es: {
    label: "Identificador legal",
    placeholder: "Número de registro"
  }
};

export const getLegalIdentifierCopy = createLocaleGetter(LEGAL_IDENTIFIER_COPY);

/** @deprecated Prefer getLegalIdentifierCopy(locale).label */
export const LEGAL_IDENTIFIER_LABEL = LEGAL_IDENTIFIER_COPY.en.label;
/** @deprecated Prefer getLegalIdentifierCopy(locale).placeholder */
export const LEGAL_IDENTIFIER_PLACEHOLDER = LEGAL_IDENTIFIER_COPY.en.placeholder;

export function normalizeLegalIdentifier(value) {
  const trimmed = String(value ?? "").trim();
  return trimmed;
}
export function digitsOnlySiret(value) {
  return normalizeLegalIdentifier(value);
}
export function formatSiretDisplay(value) {
  return normalizeLegalIdentifier(value);
}
export const SIRET_PLACEHOLDER = LEGAL_IDENTIFIER_PLACEHOLDER;
export const SIRET_MAX_DIGITS = null;
export const SIRET_DISPLAY_MAX_LENGTH = undefined;
