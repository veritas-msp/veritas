const STORAGE_PREFIX = "campaign_adoption_daily_v1:";

function dayKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function shiftDayKey(daysAgo) {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() - daysAgo);
  return dayKey(date);
}

function readStore(campaignId) {
  if (!campaignId || typeof localStorage === "undefined") return {};
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${campaignId}`);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function writeStore(campaignId, data) {
  if (!campaignId || typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${campaignId}`, JSON.stringify(data));
  } catch {
    /* ignore quota */
  }
}

function findRateNear(store, daysAgo, window = 2) {
  for (let offset = 0; offset <= window; offset += 1) {
    const key = shiftDayKey(daysAgo + offset);
    if (store[key] != null && Number.isFinite(Number(store[key]))) {
      return Number(store[key]);
    }
    if (offset === 0) continue;
    const keyBefore = shiftDayKey(Math.max(0, daysAgo - offset));
    if (daysAgo - offset >= 0 && store[keyBefore] != null && Number.isFinite(Number(store[keyBefore]))) {
      return Number(store[keyBefore]);
    }
  }
  return null;
}

function buildDelta(todayRate, baseline) {
  if (baseline == null || !Number.isFinite(baseline) || todayRate == null || !Number.isFinite(todayRate)) {
    return null;
  }
  return Math.round((todayRate - baseline) * 100) / 100;
}

/** Enregistre le taux du jour et renvoie les tendances vs j-1 / j-7 / j-30. */
export function recordCampaignDailyAdoption(campaignId, rate) {
  const empty = {
    today: null,
    previousDay: null,
    delta: null,
    day7: null,
    delta7: null,
    day30: null,
    delta30: null
  };
  if (campaignId == null || rate == null || Number.isNaN(Number(rate))) {
    return empty;
  }
  const today = dayKey();
  const store = readStore(campaignId);
  const numericRate = Math.round(Number(rate) * 100) / 100;
  store[today] = numericRate;

  const keys = Object.keys(store).sort();
  if (keys.length > 90) {
    keys.slice(0, keys.length - 90).forEach(k => {
      delete store[k];
    });
  }
  writeStore(campaignId, store);

  const previousDay = findRateNear(store, 1, 0);
  const day7 = findRateNear(store, 7, 2);
  const day30 = findRateNear(store, 30, 3);

  return {
    today: numericRate,
    previousDay,
    delta: buildDelta(numericRate, previousDay),
    day7,
    delta7: buildDelta(numericRate, day7),
    day30,
    delta30: buildDelta(numericRate, day30)
  };
}
