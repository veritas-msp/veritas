import { TICKET_SATISFACTION_CRITERION_KEYS } from "../i18n/ticketSatisfactionCriteriaI18n";
export const TICKET_SATISFACTION_CRITERIA = TICKET_SATISFACTION_CRITERION_KEYS.map(key => ({
  key
}));
export function createEmptySatisfactionRatings() {
  return Object.fromEntries(TICKET_SATISFACTION_CRITERION_KEYS.map(key => [key, 0]));
}
export function resolveDisplayRatings(satisfaction) {
  if (!satisfaction) return null;
  if (satisfaction.ratings && typeof satisfaction.ratings === "object") {
    return satisfaction.ratings;
  }
  const legacy = Number(satisfaction.rating);
  if (!legacy) return null;
  return Object.fromEntries(TICKET_SATISFACTION_CRITERION_KEYS.map(key => [key, legacy]));
}
export function isSatisfactionComplete(ratings) {
  if (!ratings) return false;
  return TICKET_SATISFACTION_CRITERION_KEYS.every(key => {
    const value = Number(ratings[key]);
    return Number.isInteger(value) && value >= 1 && value <= 5;
  });
}
export function computeSatisfactionAverage(ratings) {
  if (!ratings) return 0;
  const values = TICKET_SATISFACTION_CRITERION_KEYS.map(key => Number(ratings[key])).filter(v => v >= 1 && v <= 5);
  if (values.length === 0) return 0;
  return Math.round(values.reduce((sum, v) => sum + v, 0) / values.length * 10) / 10;
}
