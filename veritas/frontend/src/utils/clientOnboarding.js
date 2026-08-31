const ONBOARDING_WINDOW_DAYS = 30;
const ONBOARDING_WINDOW_MS = ONBOARDING_WINDOW_DAYS * 86400000;

function parseDateValue(value) {
  if (!value) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  const str = String(value).trim();
  if (!str) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    const [year, month, day] = str.split("-").map(Number);
    return new Date(year, month - 1, day);
  }
  const date = new Date(str);
  return Number.isNaN(date.getTime()) ? null : date;
}

function isWithinOnboardingWindow(date, nowMs) {
  if (!date) return false;
  const ageMs = nowMs - date.getTime();
  return ageMs >= -86400000 && ageMs < ONBOARDING_WINDOW_MS;
}

export function getClientOnboardingInfo(client, contratDebut) {
  const nowMs = Date.now();
  const createdAt = parseDateValue(client?.created_at || client?.createdAt);
  const debut = parseDateValue(contratDebut || client?.contrat?.debut);
  const qualifying = [createdAt, debut].filter((date) => isWithinOnboardingWindow(date, nowMs));
  if (qualifying.length === 0) return null;
  const start = new Date(Math.min(...qualifying.map((date) => date.getTime())));
  const ageDays = Math.max(0, Math.floor((nowMs - start.getTime()) / 86400000));
  return {
    ageDays,
    remainingDays: Math.max(1, ONBOARDING_WINDOW_DAYS - ageDays)
  };
}

export { ONBOARDING_WINDOW_DAYS };
