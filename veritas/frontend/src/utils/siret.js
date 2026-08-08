export const LEGAL_IDENTIFIER_LABEL = "Legal identifier";
export const LEGAL_IDENTIFIER_PLACEHOLDER = "Registration number";
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
