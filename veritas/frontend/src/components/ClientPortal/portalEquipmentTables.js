import { getEquipmentColumnLabel } from "../EquipementPage/equipmentPageI18n";
import { getDefaultCsvExportKeys, getCsvExportFieldLabel } from "../EquipementPage/equipmentCsvExportFields";

export const PORTAL_FAMILY_TONES = ["blue", "teal", "violet", "green", "cyan", "amber", "orange", "gray"];

export const PORTAL_TYPE_TO_EXPORT = {
  workstations: "Ordinateurs",
  internet: "Internet",
  firewall: "Firewalls",
  servers: "Servers",
  stockage: "Storage",
  switch: "Switch",
  wifi: "BorneWifi",
  alimentation: "Alimentation",
  routeur: "Routeur",
  toip: "TOIP"
};

const TABLE_COLUMNS_BY_EXPORT_TYPE = {
  Ordinateurs: ["name", "location", "manufacturer", "model", "serial", "systeme", "activeStatus", "agentStatus"],
  Internet: ["name", "location", "fournisseur", "ip", "debit", "activeStatus"],
  Firewalls: ["name", "location", "model", "serial", "ip", "activeStatus", "monitoring"],
  Servers: ["name", "location", "model", "serial", "ip", "systeme", "activeStatus", "monitoring"],
  Storage: ["name", "location", "model", "serial", "ip", "capacite", "activeStatus", "monitoring"],
  Switch: ["name", "location", "model", "serial", "mac", "activeStatus", "monitoring"],
  BorneWifi: ["name", "location", "model", "serial", "mac", "activeStatus", "monitoring"],
  TOIP: ["name", "location", "model", "ip", "activeStatus"],
  Alimentation: ["name", "location", "model", "serial", "ip", "activeStatus", "monitoring"],
  Routeur: ["name", "location", "model", "serial", "ip", "activeStatus", "monitoring"]
};

function pick(item, ...keys) {
  for (const key of keys) {
    const value = item?.[key];
    if (value == null || value === "") continue;
    if (typeof value === "object") {
      const nested = value.name || value.label;
      if (nested) return nested;
      continue;
    }
    return value;
  }
  return "";
}

function isActiveItem(item) {
  return item?.is_active !== false && item?.active !== false;
}

function formatCsvCell(value) {
  const text = value == null ? "" : String(value);
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

export function getPortalExportType(familyKey) {
  return PORTAL_TYPE_TO_EXPORT[familyKey] || "Servers";
}

export function getPortalTableColumns(familyKey) {
  const exportType = getPortalExportType(familyKey);
  return TABLE_COLUMNS_BY_EXPORT_TYPE[exportType] || ["name", "activeStatus", "monitoring"];
}

export function getPortalColumnLabel(locale, familyKey, colKey, copy) {
  if (colKey === "activeStatus") return copy.tableStatus;
  if (colKey === "monitoring") return copy.tableSupervision;
  if (colKey === "agentStatus") return copy.tableSupervision;
  return getEquipmentColumnLabel(locale, getPortalExportType(familyKey), colKey) || colKey;
}

export function getPortalEquipmentField(item, key) {
  switch (key) {
    case "name":
      return pick(item, "name", "nom", "hostname") || "-";
    case "location":
      return pick(item, "location", "site", "emplacement");
    case "manufacturer":
      return pick(item, "manufacturer", "fabricant", "marque");
    case "model":
      return pick(item, "model", "modele");
    case "serial":
      return pick(item, "serial", "numeroSerie", "serialNumber");
    case "systeme":
      return pick(item, "systeme", "os", "osName") || (item.os && (item.os.name || item.os.label)) || "";
    case "ip":
      return pick(item, "ip", "ipAddress");
    case "mac":
      return pick(item, "mac", "adresseMac", "macAddress");
    case "fournisseur":
      return pick(item, "fournisseur");
    case "debit":
      return pick(item, "debit", "debitDownload");
    case "capacite":
      return pick(item, "capacite", "capacity");
    case "activeStatus":
      return isActiveItem(item);
    case "monitoring":
      return Boolean(item.monitored || item.checkmkMapping?.checkmk_host_name || item.checkmk_host_name);
    case "agentStatus": {
      if (item.agentOnline === true) return "online";
      if (item.agentOnline === false) return "offline";
      if (item.monitored || item.agentManaged || item.agent_id || item.agentId || item.checkmk_host_name) return "supervised";
      return "none";
    }
    default:
      return pick(item, key);
  }
}

export function formatPortalFieldDisplay(item, key, copy) {
  const value = getPortalEquipmentField(item, key);
  if (key === "activeStatus") return value ? copy.statusActive : copy.statusInactive;
  if (key === "monitoring") return value ? copy.supervised : copy.notSupervised;
  if (key === "agentStatus") {
    if (value === "online") return copy.agentOnline;
    if (value === "offline") return copy.agentOffline;
    if (value === "supervised") return copy.supervised;
    return copy.notSupervised;
  }
  return value || "—";
}

export function getPortalCsvDefaultKeys(familyKey, visibleKeys = []) {
  return getDefaultCsvExportKeys(getPortalExportType(familyKey), visibleKeys);
}

export function getPortalCsvFieldLabel(locale, familyKey, key) {
  return getCsvExportFieldLabel(locale, getPortalExportType(familyKey), key);
}

export function buildPortalCsvContent(items, keys, locale, familyKey, copy) {
  const headers = keys.map(key => getPortalCsvFieldLabel(locale, familyKey, key));
  const rows = items.map(item => keys.map(key => {
    if (key === "activeStatus") return isActiveItem(item) ? copy.statusActive : copy.statusInactive;
    if (key === "monitoring") {
      return getPortalEquipmentField(item, "monitoring") ? copy.supervised : copy.notSupervised;
    }
    if (key === "agentStatus") {
      return formatPortalFieldDisplay(item, "agentStatus", copy);
    }
    return getPortalEquipmentField(item, key);
  }));
  return [headers.map(formatCsvCell).join(","), ...rows.map(row => row.map(formatCsvCell).join(","))].join("\n");
}

export function downloadPortalCsv(csvContent, filename) {
  const blob = new Blob([`\ufeff${csvContent}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function slugifyPortalCsvName(value) {
  return String(value || "export").trim().replace(/[^\w.-]+/g, "_") || "export";
}
