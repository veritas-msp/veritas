import { getPrimaryCommunicationValue, normalizeContactCommunications } from "../../utils/contactCommunications";
export function splitClientAddress(address) {
  if (!address) {
    return {
      addressStreet: "",
      addressPostalCode: "",
      addressCity: ""
    };
  }
  const trimmed = String(address).trim();
  const match = trimmed.match(/^(.+?),\s*(\d{4,5})\s+(.+)$/);
  if (match) {
    return {
      addressStreet: match[1].trim(),
      addressPostalCode: match[2].trim(),
      addressCity: match[3].trim()
    };
  }
  return {
    addressStreet: trimmed,
    addressPostalCode: "",
    addressCity: ""
  };
}
export function buildClientAddress(formData) {
  const street = formData?.addressStreet?.trim();
  const postal = formData?.addressPostalCode?.trim();
  const city = formData?.addressCity?.trim();
  if (street || postal || city) {
    const cityPart = [postal, city].filter(Boolean).join(" ");
    return [street, cityPart].filter(Boolean).join(", ");
  }
  return formData?.address?.trim() || "";
}
export function emptyPrimaryContact() {
  return {
    id: null,
    nom: "",
    prenom: "",
    sexe: "",
    email: "",
    telephone: "",
    poste: "",
    communications: []
  };
}
export function mapContactToPrimary(contact) {
  if (!contact) return emptyPrimaryContact();
  const communications = normalizeContactCommunications(contact);
  return {
    id: contact.id ?? null,
    nom: contact.nom || "",
    prenom: contact.prenom || "",
    sexe: contact.sexe || "",
    email: getPrimaryCommunicationValue(communications, "email") || contact.email || "",
    telephone: getPrimaryCommunicationValue(communications, "telephone") || contact.telephone || "",
    poste: contact.poste || "",
    communications
  };
}
export function pickPrimaryContact(contacts) {
  if (!Array.isArray(contacts) || contacts.length === 0) return null;
  const principal = contacts.find(contact => String(contact.poste || "").toLowerCase().includes("principal"));
  if (principal) return principal;
  const active = contacts.find(contact => {
    const status = String(contact.statut || "").toLowerCase();
    return status.includes("actif") && !status.includes("inactif");
  });
  return active || contacts[0];
}
export function normalizePrimaryContact(contact) {
  const communications = normalizeContactCommunications(contact);
  return {
    id: contact?.id || null,
    nom: String(contact?.nom || "").trim(),
    prenom: String(contact?.prenom || "").trim(),
    sexe: String(contact?.sexe || "").trim(),
    email: getPrimaryCommunicationValue(communications, "email") || String(contact?.email || "").trim(),
    telephone: getPrimaryCommunicationValue(communications, "telephone") || String(contact?.telephone || "").trim(),
    poste: String(contact?.poste || "").trim(),
    communications
  };
}
export function getContactSearchText(contact) {
  const communications = normalizeContactCommunications(contact);
  const email = getPrimaryCommunicationValue(communications, "email") || contact?.email || "";
  const telephone = getPrimaryCommunicationValue(communications, "telephone") || contact?.telephone || "";
  return [contact?.prenom, contact?.nom, email, telephone, contact?.client_name, contact?.poste].filter(Boolean).join(" ").toLowerCase();
}
export function formatPrimaryContactLabel(contact) {
  const communications = normalizeContactCommunications(contact);
  const name = [contact?.prenom, contact?.nom].filter(Boolean).join(" ").trim();
  const email = getPrimaryCommunicationValue(communications, "email") || contact?.email || "";
  const telephone = getPrimaryCommunicationValue(communications, "telephone") || contact?.telephone || "";
  return [name || contact?.nom, email, telephone].filter(Boolean).join(" · ");
}
