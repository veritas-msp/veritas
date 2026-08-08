export function formatClientAddress(client) {
  if (!client || typeof client !== "object") return "";
  if (client.address && String(client.address).trim()) return String(client.address).trim();
  const parts = [client.addressStreet || client.adresse_rue, [client.addressPostalCode || client.code_postal, client.addressCity || client.ville].filter(Boolean).join(" ")].filter(Boolean);
  return parts.join(", ");
}
export function buildDefaultInterventionData({
  client,
  organizationName = "",
  organizationAddress = ""
} = {}) {
  const clientName = client?.name || client?.nom || "";
  const today = new Date().toISOString().split("T")[0];
  const firstSite = Array.isArray(client?.sites) ? client.sites[0] : null;
  const siteContact = firstSite?.contact || firstSite?.contact_name || client?.contact_name || client?.contact || "";
  return {
    companyName: organizationName || "",
    companyAddress: organizationAddress || "",
    companyTaxId: "",
    client: clientName,
    adresse: formatClientAddress(client) || formatClientAddress(firstSite) || "",
    contactSite: siteContact,
    dateIntervention: today,
    dureeIntervention: "",
    numeroIntervention: "",
    descriptionDemande: "",
    compteRendu: "",
    todos: [],
    mouvements: [],
    requireSignature: false,
    signatureMotif: "",
    signatureNom: "",
    signatureReserve: "",
    signatureLieu: "",
    signatureDate: today,
    signatureAccord: false,
    signaturePrestataire: "",
    signatureClient: "",
    documentSigne: false
  };
}
export function mergeInterventionData(defaults, initial) {
  if (!initial || typeof initial !== "object") return defaults;
  return {
    ...defaults,
    ...initial,
    mouvements: Array.isArray(initial.mouvements) ? initial.mouvements : defaults.mouvements,
    todos: Array.isArray(initial.todos) ? initial.todos : defaults.todos
  };
}
export function createTodoItem(text = "") {
  return {
    id: `todo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    text,
    done: false,
    plannedFor: ""
  };
}
export function hasInterventionSignatureDrawn(data) {
  return Boolean(String(data?.signaturePrestataire || "").trim() || String(data?.signatureClient || "").trim());
}
export function validateInterventionStep(stepIndex, data) {
  if (!data || typeof data !== "object") return false;
  switch (stepIndex) {
    case 0:
      return String(data.companyName || "").trim() && String(data.companyAddress || "").trim() && String(data.client || "").trim() && String(data.adresse || "").trim();
    case 1:
      return String(data.dateIntervention || "").trim() && String(data.dureeIntervention || "").trim() && String(data.descriptionDemande || "").trim();
    case 2:
      {
        const hasReport = Boolean(String(data.compteRendu || "").trim());
        const hasTodos = (data.todos || []).some(item => Boolean(String(item?.text || "").trim()));
        return hasReport || hasTodos;
      }
    case 3:
      {
        if (!data.requireSignature) return true;
        const drawn = hasInterventionSignatureDrawn(data);
        if (!drawn) return false;
        return data.signatureAccord === true && String(data.signatureNom || "").trim() && String(data.signatureLieu || "").trim() && String(data.signatureDate || "").trim() && String(data.signatureClient || "").trim();
      }
    default:
      return true;
  }
}
export function getInterventionStepValidationAlert(stepIndex, data, alerts) {
  if (validateInterventionStep(stepIndex, data)) return null;
  if (stepIndex === 0) return alerts.stepContext;
  if (stepIndex === 1) return alerts.stepInterventions;
  if (stepIndex === 2) return alerts.stepReport;
  if (stepIndex === 3) {
    if (!data.requireSignature) return null;
    const drawn = hasInterventionSignatureDrawn(data);
    if (!drawn) return alerts.signatureDrawing;
    if (!String(data.signatureNom || "").trim()) return alerts.signatureNom;
    if (!String(data.signatureLieu || "").trim()) return alerts.signatureLieu;
    if (!String(data.signatureDate || "").trim()) return alerts.signatureDate;
    if (!String(data.signatureClient || "").trim()) return alerts.signatureClientRequired;
    if (data.signatureAccord !== true) return alerts.signatureAccord;
    return alerts.signatureFields;
  }
  return alerts.stepReport;
}
export function buildInterventionReportPeriod(data) {
  const date = data?.dateIntervention;
  if (!date) return null;
  return `Intervention du ${date}`;
}
export function buildInterventionSaveRandomSuffix() {
  return Math.floor(1000 + Math.random() * 9000);
}
export function buildDefaultSaveName(clientLabel, copy, {
  withRandom = true
} = {}) {
  const template = copy?.validation?.saveNamePlaceholder || "Report · {client}";
  const base = template.replace("{client}", clientLabel || "client");
  if (!withRandom) return base;
  return `${base} ${buildInterventionSaveRandomSuffix()}`;
}
export function serializeInterventionClient(client) {
  if (!client || typeof client !== "object") return null;
  return {
    id: client.id ?? client.uuid ?? null,
    uuid: client.uuid ?? client.id ?? null,
    name: client.name ?? client.nom ?? null,
    nom: client.nom ?? client.name ?? null,
    sites: Array.isArray(client.sites) ? client.sites.map(site => ({
      id: site?.id ?? site?.uuid ?? null,
      name: site?.name ?? site?.nom ?? null,
      address: site?.address ?? null,
      contact: site?.contact ?? site?.contact_name ?? null,
      contact_name: site?.contact_name ?? site?.contact ?? null
    })) : []
  };
}
function serializeInterventionFormPayload(payload) {
  if (!payload || typeof payload !== "object") return {};
  return {
    companyName: payload.companyName ?? "",
    companyAddress: payload.companyAddress ?? "",
    companyTaxId: payload.companyTaxId ?? "",
    client: payload.client ?? "",
    adresse: payload.adresse ?? "",
    contactSite: payload.contactSite ?? "",
    dateIntervention: payload.dateIntervention ?? "",
    dureeIntervention: payload.dureeIntervention ?? "",
    numeroIntervention: payload.numeroIntervention ?? "",
    descriptionDemande: payload.descriptionDemande ?? "",
    compteRendu: payload.compteRendu ?? "",
    todos: Array.isArray(payload.todos) ? payload.todos.map(item => ({
      id: item?.id ?? "",
      text: item?.text ?? "",
      done: Boolean(item?.done),
      plannedFor: item?.plannedFor ?? ""
    })) : [],
    mouvements: Array.isArray(payload.mouvements) ? payload.mouvements.map(item => ({
      designation: item?.designation ?? "",
      quantite: item?.quantite ?? "",
      mouvement: item?.mouvement ?? "",
      commentaire: item?.commentaire ?? ""
    })) : [],
    requireSignature: Boolean(payload.requireSignature),
    signatureMotif: payload.signatureMotif ?? "",
    signatureNom: payload.signatureNom ?? "",
    signatureReserve: payload.signatureReserve ?? "",
    signatureLieu: payload.signatureLieu ?? "",
    signatureDate: payload.signatureDate ?? "",
    signatureAccord: Boolean(payload.signatureAccord),
    signaturePrestataire: payload.signaturePrestataire ?? "",
    signatureClient: payload.signatureClient ?? "",
    documentSigne: Boolean(payload.documentSigne)
  };
}
export function serializeInterventionSavePayload(client, payload, reportType = "intervention") {
  return {
    config: {
      reportType,
      client: serializeInterventionClient(client)
    },
    data: {
      intervention: serializeInterventionFormPayload(payload)
    }
  };
}
export function isDuplicateMonitoringSaveResult(result) {
  if (!result || result.success !== false) return false;
  const message = String(result.message || result.error || "").toLowerCase();
  return message.includes("déjà enregistré") || message.includes("already exists") || message.includes("existiert bereits") || message.includes("esiste già") || message.includes("ya existe");
}
