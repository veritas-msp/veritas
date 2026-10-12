/** Helpers for supervision triage (ignore / maintenance). */

export function toDatetimeLocalValue(date = new Date()) {
  const d = new Date(date.getTime());
  if (Number.isNaN(d.getTime())) return "";
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

export function fromDatetimeLocalValue(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export function endOfTodayIso() {
  const d = new Date();
  d.setHours(23, 59, 0, 0);
  return d.toISOString();
}

export function minutesFromNowIso(minutes) {
  return new Date(Date.now() + Number(minutes) * 60 * 1000).toISOString();
}

export function daysFromNowIso(days) {
  const d = new Date();
  d.setDate(d.getDate() + Number(days || 0));
  return d.toISOString();
}

export function resolveExclusionUntil(optionId, customUntilLocal) {
  switch (optionId) {
    case "none":
      return { excludedUntil: null, skipExclusion: true };
    case "30m":
      return { excludedUntil: minutesFromNowIso(30), skipExclusion: false };
    case "1h":
      return { excludedUntil: minutesFromNowIso(60), skipExclusion: false };
    case "4h":
      return { excludedUntil: minutesFromNowIso(240), skipExclusion: false };
    case "8h":
      return { excludedUntil: minutesFromNowIso(480), skipExclusion: false };
    case "24h":
    case "1d":
      return { excludedUntil: daysFromNowIso(1), skipExclusion: false };
    case "3d":
      return { excludedUntil: daysFromNowIso(3), skipExclusion: false };
    case "7d":
      return { excludedUntil: daysFromNowIso(7), skipExclusion: false };
    case "1m":
      return { excludedUntil: daysFromNowIso(30), skipExclusion: false };
    case "3m":
      return { excludedUntil: daysFromNowIso(90), skipExclusion: false };
    case "tonight":
      return { excludedUntil: endOfTodayIso(), skipExclusion: false };
    case "forever":
      return { excludedUntil: null, skipExclusion: false };
    case "custom": {
      const iso = fromDatetimeLocalValue(customUntilLocal);
      if (!iso || new Date(iso).getTime() <= Date.now()) {
        return { excludedUntil: null, skipExclusion: false, invalid: true };
      }
      return { excludedUntil: iso, skipExclusion: false };
    }
    default:
      return { excludedUntil: minutesFromNowIso(60), skipExclusion: false };
  }
}

export function extractAlertServiceMeta(item = {}) {
  const meta = item.meta || item.alertState?.meta || {};
  return {
    serviceKey: meta.serviceKey || meta.serviceName || item.serviceKey || null,
    serviceName: meta.serviceName || meta.serviceKey || item.subtitle || null,
    family: item.family || meta.family || item.equipment?.family || null,
    equipmentId: item.equipmentId || item.equipment?.id || null,
    clientId: item.clientId || null,
    equipmentName: item.equipment?.name || meta.equipmentName || item.subtitle || null
  };
}

export const IGNORE_REASON_IDS = [
  "false_positive",
  "known",
  "threshold",
  "handled_elsewhere",
  "no_action",
  "other"
];

export function countTriageBuckets(items = [], exclusions = []) {
  const list = Array.isArray(items) ? items : [];
  let todo = 0;
  let inProgress = 0;
  for (const item of list) {
    if (item?.muted) continue;
    const wf = item?.workflowStatus || "open";
    if (wf === "open") todo += 1;
    else if (wf === "acked" || wf === "linked") inProgress += 1;
  }
  return {
    todo,
    inProgress,
    waiting: Array.isArray(exclusions) ? exclusions.length : 0
  };
}
