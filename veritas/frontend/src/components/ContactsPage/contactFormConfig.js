import { normalizeContactSexe } from "../../utils/contactSexe";
import { normalizeContactCommunications, serializeCommunicationsForCompare } from "../../utils/contactCommunications";
export const CONTACT_FORM_SECTIONS = [{
  id: "identity",
  label: "Identity",
  icon: "mdi:account-outline",
  description: "Title, first and last name"
}, {
  id: "coordinates",
  label: "Contact details",
  icon: "mdi:card-account-mail-outline",
  description: "Emails, phones and communication channels"
}, {
  id: "enterprise",
  label: "Company",
  icon: "mdi:domain",
  description: "Linked company and job title"
}, {
  id: "status",
  label: "Status",
  icon: "mdi:toggle-switch-outline",
  description: "Availability and visibility"
}];
export const DEFAULT_CONTACT_FORM = {
  nom: "",
  prenom: "",
  sexe: "",
  communications: [],
  poste: "",
  statut: "actif",
  client_id: null
};
export function buildContactFormFromInitial(initial, defaultClientId = null) {
  if (!initial) {
    return {
      ...DEFAULT_CONTACT_FORM,
      client_id: defaultClientId ?? null
    };
  }
  return {
    id: initial.id,
    nom: initial.nom || "",
    prenom: initial.prenom || "",
    sexe: normalizeContactSexe(initial.sexe) || "",
    communications: normalizeContactCommunications(initial),
    poste: initial.poste || "",
    statut: initial.statut || "actif",
    client_id: initial.client_id ?? defaultClientId ?? null
  };
}
export function cloneContactFormSnapshot(form) {
  return {
    nom: form.nom || "",
    prenom: form.prenom || "",
    sexe: form.sexe || "",
    communications: normalizeContactCommunications({
      communications: form.communications
    }),
    poste: form.poste || "",
    statut: form.statut || "actif",
    client_id: form.client_id ?? null
  };
}
export function contactFormsEqual(a, b) {
  if (!a || !b) return false;
  return (a.nom || "") === (b.nom || "") && (a.prenom || "") === (b.prenom || "") && (a.sexe || "") === (b.sexe || "") && serializeCommunicationsForCompare(a.communications) === serializeCommunicationsForCompare(b.communications) && (a.poste || "") === (b.poste || "") && (a.statut || "actif") === (b.statut || "actif") && String(a.client_id ?? "") === String(b.client_id ?? "");
}
