export const MAINTENANCE_LICENCE_LABEL = "Maintenance license";
export const EXPIRATION_SOON_DAYS = 30;
export const EXPIRATION_STATUS_COLORS = {
  expired: "#dc2626",
  soon: "#ea580c",
  ok: "#6b7280"
};
export function getExpirationStatus(value) {
  const iso = toDateInputValue(value);
  if (!iso) return "unknown";
  const expirationDate = new Date(iso);
  if (Number.isNaN(expirationDate.getTime())) return "unknown";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  expirationDate.setHours(0, 0, 0, 0);
  const daysUntil = Math.ceil((expirationDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (daysUntil < 0) return "expired";
  if (daysUntil <= EXPIRATION_SOON_DAYS) return "soon";
  return "ok";
}
export function getExpirationStatusColor(status) {
  return EXPIRATION_STATUS_COLORS[status] || undefined;
}
function excelSerialToIso(serial) {
  if (!Number.isFinite(serial) || serial < 1 || serial > 100000) return "";
  // Excel / LibreOffice serial day count (epoch 1899-12-30, with legacy leap quirk).
  const utc = Date.UTC(1899, 11, 30) + Math.round(serial) * 86400000;
  const parsed = new Date(utc);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toISOString().slice(0, 10);
}

export const toDateInputValue = value => {
  if (value == null || value === "") return "";
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return excelSerialToIso(value);
  }
  const str = String(value).trim();
  if (!str) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
  const isoDateTime = str.match(/^(\d{4}-\d{2}-\d{2})[T\s]/);
  if (isoDateTime) return isoDateTime[1];
  // FR / EU: DD/MM/YYYY[+ time] — preferred over ambiguous US MM/DD parsing.
  const frMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+\d{1,2}:\d{2}(?::\d{2})?)?$/);
  if (frMatch) {
    const [, day, month, year] = frMatch;
    const d = Number(day);
    const m = Number(month);
    if (m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      return `${year}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    }
  }
  if (/^\d{4,5}([.,]\d+)?$/.test(str)) {
    const serial = Number(str.replace(",", "."));
    const fromSerial = excelSerialToIso(serial);
    if (fromSerial) return fromSerial;
  }
  const parsed = new Date(str);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }
  return "";
};
const isMaintenanceLicense = licence => {
  const nom = String(licence?.nom || "").toLowerCase();
  const type = String(licence?.type || "").toLowerCase();
  return nom.includes("maintenance") || type.includes("maintenance");
};
export const getMaintenanceLicenseExpiration = licences => {
  if (!Array.isArray(licences)) return "";
  const maintenanceLicense = licences.find(isMaintenanceLicense);
  return toDateInputValue(maintenanceLicense?.expiration || "");
};
export const formatDateFr = value => {
  const iso = toDateInputValue(value);
  if (!iso) return "";
  const [year, month, day] = iso.split("-");
  return `${day}/${month}/${year}`;
};
export const setMaintenanceLicenseExpiration = (licences, expiration) => {
  const list = Array.isArray(licences) ? [...licences] : [];
  const index = list.findIndex(isMaintenanceLicense);
  const trimmed = expiration == null ? "" : String(expiration).trim();
  if (!trimmed) {
    if (index >= 0) list.splice(index, 1);
    return list;
  }
  const entry = {
    nom: MAINTENANCE_LICENCE_LABEL,
    expiration: trimmed,
    type: "maintenance"
  };
  if (index >= 0) {
    list[index] = {
      ...list[index],
      ...entry
    };
  } else {
    list.push(entry);
  }
  return list;
};
