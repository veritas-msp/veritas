export const CONTACT_COMMUNICATION_TYPES = [{
  id: "email",
  label: "E-mail",
  icon: "mdi:email-outline",
  inputType: "email",
  placeholder: "jean.dupont@entreprise.fr"
}, {
  id: "telephone",
  label: "Phone",
  icon: "mdi:phone-outline",
  inputType: "tel",
  placeholder: "06 12 34 56 78"
}];
const TYPE_IDS = new Set(CONTACT_COMMUNICATION_TYPES.map(t => t.id));
const TYPE_SORT_ORDER = Object.fromEntries(CONTACT_COMMUNICATION_TYPES.map((type, index) => [type.id, index]));
function createCommunicationId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `comm-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
function communicationIdsMatch(a, b) {
  return String(a ?? "") === String(b ?? "");
}
function ensureCommunicationEntryIds(entries) {
  return (Array.isArray(entries) ? entries : []).map(entry => ({
    ...entry,
    id: entry?.id || createCommunicationId()
  }));
}
export function createCommunicationEntry(type, overrides = {}) {
  const normalizedType = TYPE_IDS.has(type) ? type : "email";
  const {
    id,
    ...rest
  } = overrides;
  return {
    id: id || createCommunicationId(),
    type: normalizedType,
    value: "",
    isPrimary: false,
    ...rest
  };
}
function normalizeEntry(raw, index = 0) {
  if (!raw || typeof raw !== "object") return null;
  const type = TYPE_IDS.has(raw.type) ? raw.type : null;
  const value = String(raw.value ?? "").trim();
  if (!type || !value) return null;
  return {
    id: raw.id || createCommunicationId(),
    type,
    value,
    isPrimary: Boolean(raw.isPrimary),
    sortOrder: Number.isFinite(Number(raw.sortOrder)) ? Number(raw.sortOrder) : index
  };
}
export function sortCommunicationsByType(entries) {
  const list = Array.isArray(entries) ? [...entries] : [];
  return list.sort((a, b) => {
    const typeDiff = (TYPE_SORT_ORDER[a.type] ?? 99) - (TYPE_SORT_ORDER[b.type] ?? 99);
    if (typeDiff !== 0) return typeDiff;
    if (Boolean(a.isPrimary) !== Boolean(b.isPrimary)) {
      return a.isPrimary ? -1 : 1;
    }
    return (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
  }).map((entry, index) => ({
    ...entry,
    sortOrder: index
  }));
}
export function enforcePrimaryCommunications(entries) {
  const list = ensureCommunicationEntryIds(entries);
  const primaryByType = new Map();
  list.forEach(entry => {
    if (entry.isPrimary && !primaryByType.has(entry.type)) {
      primaryByType.set(entry.type, entry.id);
    }
  });
  CONTACT_COMMUNICATION_TYPES.forEach(({
    id: typeId
  }) => {
    if (primaryByType.has(typeId)) return;
    const firstOfType = list.find(entry => entry.type === typeId);
    if (firstOfType) primaryByType.set(typeId, firstOfType.id);
  });
  return sortCommunicationsByType(list.map(entry => ({
    ...entry,
    isPrimary: communicationIdsMatch(primaryByType.get(entry.type), entry.id)
  })));
}
export function setPrimaryCommunication(entries, entryId) {
  const list = ensureCommunicationEntryIds(Array.isArray(entries) ? [...entries] : []);
  const target = list.find(entry => communicationIdsMatch(entry.id, entryId));
  if (!target) return enforcePrimaryCommunications(list);
  return enforcePrimaryCommunications(list.map(entry => ({
    ...entry,
    isPrimary: entry.type === target.type ? communicationIdsMatch(entry.id, entryId) : Boolean(entry.isPrimary)
  })));
}
export function normalizeContactCommunications(source) {
  if (!source) return [];
  let rawList = source.communications;
  if (typeof rawList === "string") {
    try {
      rawList = JSON.parse(rawList);
    } catch {
      rawList = [];
    }
  }
  let normalized = [];
  if (Array.isArray(rawList) && rawList.length > 0) {
    normalized = rawList.map(normalizeEntry).filter(Boolean);
  } else {
    const legacy = [];
    const email = String(source.email ?? "").trim();
    const telephone = String(source.telephone ?? "").trim();
    if (email) {
      legacy.push(createCommunicationEntry("email", {
        value: email,
        isPrimary: true,
        sortOrder: 0
      }));
    }
    if (telephone) {
      legacy.push(createCommunicationEntry("telephone", {
        value: telephone,
        isPrimary: true,
        sortOrder: legacy.length
      }));
    }
    normalized = legacy;
  }
  return enforcePrimaryCommunications(normalized);
}
export function getCommunicationTypeDef(typeId) {
  return CONTACT_COMMUNICATION_TYPES.find(t => t.id === typeId) || CONTACT_COMMUNICATION_TYPES[0];
}
export function getPrimaryCommunicationValue(entries, type) {
  const list = normalizeContactCommunications({
    communications: entries
  });
  const primary = list.find(entry => entry.type === type && entry.isPrimary);
  if (primary) return primary.value;
  const fallback = list.find(entry => entry.type === type);
  return fallback?.value || "";
}
function communicationSourceFromInput(input) {
  if (Array.isArray(input)) {
    return {
      communications: input
    };
  }
  if (input && typeof input === "object") {
    return input;
  }
  return {
    communications: []
  };
}
export function syncLegacyContactFields(input) {
  const list = normalizeContactCommunications(communicationSourceFromInput(input));
  return {
    email: getPrimaryCommunicationValue(list, "email") || null,
    telephone: getPrimaryCommunicationValue(list, "telephone") || null,
    communications: list
  };
}
export function buildContactApiPayload(fields) {
  const {
    nom,
    prenom,
    sexe,
    email,
    telephone,
    poste,
    statut,
    client_id,
    communications
  } = fields;
  const synced = Array.isArray(communications) && communications.length > 0 ? syncLegacyContactFields(enforcePrimaryCommunications(communications)) : syncLegacyContactFields({
    email,
    telephone
  });
  return {
    nom,
    prenom: prenom || null,
    sexe: sexe || null,
    email: synced.email,
    telephone: synced.telephone,
    communications: synced.communications,
    poste: poste || null,
    statut: statut || "actif",
    client_id: client_id ?? null
  };
}
export function primaryContactFromDraft(draft) {
  const synced = Array.isArray(draft?.communications) && draft.communications.length > 0 ? syncLegacyContactFields(enforcePrimaryCommunications(draft.communications)) : syncLegacyContactFields({
    email: draft?.email,
    telephone: draft?.telephone
  });
  return {
    id: draft?.id || null,
    nom: String(draft?.nom || "").trim(),
    prenom: String(draft?.prenom || "").trim(),
    sexe: String(draft?.sexe || "").trim(),
    email: synced.email || "",
    telephone: synced.telephone || "",
    poste: String(draft?.poste || "").trim(),
    communications: synced.communications
  };
}
export function primaryContactToFormInitial(primary) {
  if (!primary?.nom?.trim()) return null;
  return {
    id: primary.id,
    nom: primary.nom,
    prenom: primary.prenom,
    sexe: primary.sexe,
    poste: primary.poste,
    email: primary.email,
    telephone: primary.telephone,
    communications: primary.communications,
    statut: "actif"
  };
}
export function serializeCommunicationsForCompare(entries) {
  return JSON.stringify(normalizeContactCommunications({
    communications: entries
  }).map(entry => ({
    id: entry.id,
    type: entry.type,
    value: entry.value,
    isPrimary: entry.isPrimary,
    sortOrder: entry.sortOrder
  })));
}
export function validateContactCommunications(entries) {
  const list = Array.isArray(entries) ? entries : [];
  for (const entry of list) {
    const value = String(entry?.value ?? "").trim();
    if (!value) {
      if (entry?.type === "telephone") {
        return "Enter the phone number you added or remove it.";
      }
      if (entry?.type === "email") {
        return "Enter the email address you added or remove it.";
      }
      return "Enter the communication method you added or remove it.";
    }
    if (entry.type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      return "L'adresse e-mail n'est pas valide";
    }
  }
  return null;
}
export function hasIncompleteCommunications(entries) {
  const list = Array.isArray(entries) ? entries : [];
  return list.some(entry => !String(entry?.value ?? "").trim());
}
