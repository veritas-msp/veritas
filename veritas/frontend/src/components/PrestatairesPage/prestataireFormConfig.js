let contactKeySeq = 0;

export function createEmptyPrestataireContact(seed = {}) {
  contactKeySeq += 1;
  return {
    _key: `pc-${contactKeySeq}-${Date.now()}`,
    id: seed.id ?? null,
    nom: seed.nom || "",
    prenom: seed.prenom || "",
    email: seed.email || "",
    telephone: seed.telephone || ""
  };
}

export function normalizePrestataireContacts(raw, fallback = null) {
  if (Array.isArray(raw) && raw.length > 0) {
    return raw.map(row => createEmptyPrestataireContact(row));
  }
  if (fallback && (fallback.contact_nom || fallback.contact_prenom || fallback.email || fallback.telephone)) {
    return [createEmptyPrestataireContact({
      nom: fallback.contact_nom,
      prenom: fallback.contact_prenom,
      email: fallback.email,
      telephone: fallback.telephone
    })];
  }
  return [];
}

export const PRESTATAIRE_FORM_SECTIONS = [{
  id: "identity",
  label: "Identité",
  icon: "mdi:handshake-outline",
  description: "Nom et type du prestataire"
}, {
  id: "contacts",
  label: "Contacts",
  icon: "mdi:account-multiple-outline",
  description: "Personnes à contacter chez le prestataire"
}, {
  id: "coordinates",
  label: "Coordonnées",
  icon: "mdi:map-marker-outline",
  description: "Site web et adresse"
}, {
  id: "enterprise",
  label: "Entreprises",
  icon: "mdi:domain",
  description: "Entreprises rattachées"
}, {
  id: "status",
  label: "Statut",
  icon: "mdi:toggle-switch-outline",
  description: "Actif ou inactif"
}];

export const DEFAULT_PRESTATAIRE_FORM = {
  nom: "",
  type: "",
  site_web: "",
  adresse: "",
  statut: "actif",
  contacts: []
};

export function buildPrestataireFormFromInitial(initial) {
  if (!initial) {
    return {
      ...DEFAULT_PRESTATAIRE_FORM,
      contacts: []
    };
  }
  return {
    id: initial.id,
    nom: initial.nom || "",
    type: initial.type || "",
    site_web: initial.site_web || "",
    adresse: initial.adresse || "",
    statut: initial.statut === "inactif" || initial.statut === "inactive" ? "inactif" : "actif",
    contacts: normalizePrestataireContacts(initial.contacts, initial)
  };
}

export function clonePrestataireFormSnapshot(form) {
  return {
    nom: form.nom || "",
    type: form.type || "",
    site_web: form.site_web || "",
    adresse: form.adresse || "",
    statut: form.statut || "actif",
    contacts: (Array.isArray(form.contacts) ? form.contacts : []).map(contact => ({
      nom: contact.nom || "",
      prenom: contact.prenom || "",
      email: contact.email || "",
      telephone: contact.telephone || ""
    }))
  };
}

function serializeContacts(list) {
  return (Array.isArray(list) ? list : [])
    .map(c => `${c.nom || ""}\0${c.prenom || ""}\0${c.email || ""}\0${c.telephone || ""}`)
    .join("|");
}

export function prestataireFormsEqual(a, b) {
  if (!a || !b) return false;
  return (a.nom || "") === (b.nom || "")
    && (a.type || "") === (b.type || "")
    && (a.site_web || "") === (b.site_web || "")
    && (a.adresse || "") === (b.adresse || "")
    && (a.statut || "actif") === (b.statut || "actif")
    && serializeContacts(a.contacts) === serializeContacts(b.contacts);
}
