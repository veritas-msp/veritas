const STORAGE_PREFIX = "campaign_adoption_daily_v1:";

function dayKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
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

/** Enregistre le taux du jour et renvoie la tendance vs j-1. */
export function recordCampaignDailyAdoption(campaignId, rate) {
  if (campaignId == null || rate == null || Number.isNaN(Number(rate))) {
    return { today: null, previousDay: null, delta: null };
  }
  const today = dayKey();
  const yesterdayDate = new Date();
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterday = dayKey(yesterdayDate);
  const store = readStore(campaignId);
  const numericRate = Math.round(Number(rate) * 100) / 100;
  store[today] = numericRate;

  const keys = Object.keys(store).sort();
  if (keys.length > 60) {
    keys.slice(0, keys.length - 60).forEach(k => {
      delete store[k];
    });
  }
  writeStore(campaignId, store);

  const previousDay = store[yesterday] != null ? Number(store[yesterday]) : null;
  const delta =
    previousDay != null && Number.isFinite(previousDay)
      ? Math.round((numericRate - previousDay) * 100) / 100
      : null;

  return {
    today: numericRate,
    previousDay,
    delta
  };
}
