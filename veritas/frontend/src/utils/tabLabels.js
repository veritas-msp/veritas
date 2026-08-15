import { getClientNumber, getClientNameWithoutCode } from "./clientDisplay";
import { getTabLabelsCopy } from "../i18n/tabLabelsI18n";
function formatClientShortLabel(data) {
  const number = (data?.client_number ?? data?.clientNumber ?? getClientNumber(data)) || null;
  const name = getClientNameWithoutCode(data?.name || data?.clientName || data);
  if (number && name) return `${number} · ${name}`;
  if (name) return name;
  return null;
}
function formatPersonTabName(data) {
  const prenom = (data?.prenom || "").trim();
  const nom = (data?.nom || "").trim();
  const cap = value => value ? value.charAt(0).toUpperCase() + value.slice(1).toLowerCase() : "";
  if (prenom && nom) return `${cap(prenom)} ${nom.toUpperCase()}`;
  if (nom) return nom.toUpperCase();
  if (prenom) return cap(prenom);
  return null;
}
function truncateLabel(value, max = 28) {
  const text = String(value || "").trim();
  if (!text) return "";
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1)}…`;
}
function resolveCopy(locale) {
  return getTabLabelsCopy(locale);
}
function equipmentTypeLabel(type, copy) {
  return copy.equipmentTypes[type] || type;
}
export function getTabTooltip(type, title, locale = "fr") {
  const copy = resolveCopy(locale);
  const hint = copy.hints[type];
  if (hint && title) return `${hint} · ${title}`;
  return title || hint || "";
}
export function generateTabTitle(type, data = {}, locale = "fr") {
  const copy = resolveCopy(locale);
  const d = copy.defaults;
  if (type === "ContratDetail") {
    const label = formatClientShortLabel(data);
    if (label) return label;
    const clientId = data?.clientId || data?.id;
    return clientId ? `${d.clientPrefix}${clientId}` : d.enterprise;
  }
  if (type === "ContactDetail") {
    const person = formatPersonTabName(data);
    if (person) return person;
    const contactId = data?.contactId || data?.id;
    return contactId ? `${d.contactPrefix}${contactId}` : d.contact;
  }
  if (type === "Equipment" && data?.equipmentType) {
    const clientLabel = formatClientShortLabel({
      name: data.clientName,
      client_number: data.client_number,
      clientNumber: data.clientNumber
    });
    const typeLabel = equipmentTypeLabel(data.equipmentType, copy);
    if (clientLabel) return `${clientLabel} · ${typeLabel}`;
    return typeLabel;
  }
  if (type === "EquipmentDetail") {
    const equipmentName = (data?.name || "").trim();
    const clientLabel = formatClientShortLabel({
      name: data?.clientName
    });
    if (equipmentName && clientLabel) {
      return `${equipmentName} · ${getClientNameWithoutCode(data.clientName)}`;
    }
    if (equipmentName) return equipmentName;
    return d.equipment;
  }
  if (type === "JobDetail") {
    const jobName = (data?.nom || data?.name || data?.jobName || "").trim();
    const clientLabel = formatClientShortLabel({
      name: data?.clientName
    });
    if (jobName && clientLabel) {
      return `${jobName} · ${getClientNameWithoutCode(data.clientName)}`;
    }
    if (jobName) return jobName;
    return d.backupJob;
  }
  if (type === "CampaignDetail") {
    const clientLabel = formatClientShortLabel({
      name: data?.clientName
    });
    const campaignName = truncateLabel(data?.name, 22);
    if (clientLabel && campaignName) return `${clientLabel} · ${campaignName}`;
    if (campaignName) return campaignName;
    if (clientLabel) return `${clientLabel} · ${d.campaign}`;
    return d.campaign;
  }
  if (type === "AntivirusDetail") {
    const clientLabel = getClientNameWithoutCode(data?.clientName);
    const product = truncateLabel(data?.productName || data?.solution || data?.logiciel, 24);
    if (clientLabel && product) return `${clientLabel} · ${product}`;
    if (clientLabel) return `${clientLabel} · ${d.antivirus}`;
    if (product) return product;
    return d.antivirus;
  }
  if (type === "AntispamDetail") {
    const clientLabel = getClientNameWithoutCode(data?.clientName);
    const product = truncateLabel(data?.productName || data?.logiciel || data?.solution, 24);
    if (clientLabel && product) return `${clientLabel} · ${product}`;
    if (clientLabel) return `${clientLabel} · ${d.antispam}`;
    if (product) return product;
    return d.antispam;
  }
  if (type === "ComputerFleetStats") {
    const clientLabel = formatClientShortLabel(data);
    const typeLabel = data?.equipmentType === "Ordinateurs" ? copy.equipmentTypes.Ordinateurs : equipmentTypeLabel(data?.equipmentType, copy) || d.fleet;
    if (clientLabel) return `${clientLabel} · ${d.statsPrefix} ${typeLabel}`;
    return `${d.statsPrefix} ${typeLabel}`;
  }
  if (type === "TenantDetail") {
    const clientLabel = formatClientShortLabel({
      name: data?.clientName || data?.name
    });
    if (clientLabel) return `${clientLabel} · ${d.microsoftSuffix}`;
    return d.tenantMicrosoft;
  }
  if (type === "MonitoringDetail") {
    const clientLabel = formatClientShortLabel({
      name: data?.client?.name || data?.client?.nom
    });
    const reportPeriod = (data?.client?.reportPeriod || data?.reportPeriod || "").trim();
    if (clientLabel && reportPeriod) {
      return `${clientLabel} · ${truncateLabel(reportPeriod, 16)}`;
    }
    if (clientLabel) return `${clientLabel} · ${d.report}`;
    return d.supervisionReport;
  }
  if (type === "TicketDetail" || type === "TicketSalesDetail") {
    const ticketNumber = data?.ticketNumber || data?.ticket_number;
    const subject = truncateLabel(data?.subject || data?.title, 22);
    if (ticketNumber && subject) return `#${ticketNumber} · ${subject}`;
    if (ticketNumber) return `${d.ticketPrefix}${ticketNumber}`;
    const ticketId = data?.ticketId || data?.id;
    if (ticketId) return `${d.ticketPrefix}${String(ticketId).slice(0, 8)}`;
    return d.ticket;
  }
  if (type === "Contrat") return d.enterprisesList;
  if (type === "Contact") return d.contactsList;
  if (type === "Hardware") return d.supervisionCenter;
  if (type === "Mon") return d.monitoringList;
  if (type === "Ticket") return d.support;
  if (type === "Dashboard") return d.dashboardKpi;
  if (type === "DocumentsHub") return d.documentsList;
  if (type === "EquipmentInventory") return d.inventoryList;
  return type;
}
