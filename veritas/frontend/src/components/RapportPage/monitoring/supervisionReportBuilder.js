import { REPORT_TYPE_IDS } from "../reportTypeConstants";

export const SUPERVISION_BUILDER_TYPES = new Set([
  "monitoring",
  REPORT_TYPE_IDS.SUPERVISION_ETAT
]);

export function isSupervisionReportBuilderType(builderType) {
  return SUPERVISION_BUILDER_TYPES.has(builderType);
}

export function toIsoDateInput(value = new Date()) {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Default report window: last 30 days inclusive (end = today). */
export function getDefaultSupervisionPeriod(now = new Date()) {
  const end = new Date(now);
  end.setHours(0, 0, 0, 0);
  const start = new Date(end);
  start.setDate(start.getDate() - 29);
  return {
    startDate: toIsoDateInput(start),
    endDate: toIsoDateInput(end)
  };
}

export function formatPercent(value) {
  if (value == null || Number.isNaN(Number(value))) return "—";
  const n = Number(value);
  return `${n.toFixed(n % 1 === 0 ? 0 : 1)} %`;
}

export function isDateWithinPeriod(isoOrDate, startIso, endIso) {
  if (!isoOrDate || !startIso || !endIso) return false;
  const t = new Date(isoOrDate).getTime();
  if (Number.isNaN(t)) return false;
  const start = new Date(startIso);
  start.setHours(0, 0, 0, 0);
  const end = new Date(endIso);
  end.setHours(23, 59, 59, 999);
  return t >= start.getTime() && t <= end.getTime();
}
