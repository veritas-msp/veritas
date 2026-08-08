const NON_FIXED_IP_LABELS = new Set(["ip non fixe", "non fixe"]);
export function isInternetIpNonFixe(source) {
  if (!source || typeof source !== "object") return false;
  const raw = source.ipNonFixe ?? source.data?.ipNonFixe ?? source.rawData?.ipNonFixe;
  if (raw === true || raw === 1) return true;
  if (raw === false || raw === 0) return false;
  if (typeof raw === "string") {
    const lower = raw.trim().toLowerCase();
    if (["true", "1", "oui", "yes"].includes(lower)) return true;
    if (["false", "0", "non", "no", ""].includes(lower)) return false;
  }
  const ip = String(source.ip ?? source.data?.ip ?? source.rawData?.ip ?? "").trim().toLowerCase();
  return NON_FIXED_IP_LABELS.has(ip);
}
export function normalizeInternetFormData(formData) {
  if (!formData || typeof formData !== "object") return formData;
  if (!formData.ipNonFixe) {
    return {
      ...formData,
      ipNonFixe: false
    };
  }
  return {
    ...formData,
    ipNonFixe: true,
    ip: "IP non fixe"
  };
}
export function formatInternetIpDisplay(item) {
  if (!item || typeof item !== "object") return "-";
  if (isInternetIpNonFixe(item)) return "IP non fixe";
  const ip = String(item.ip ?? item.data?.ip ?? "").trim();
  if (ip && !NON_FIXED_IP_LABELS.has(ip.toLowerCase())) return ip;
  if (item.fqdn) return item.fqdn;
  return "-";
}
export function patchInternetEquipmentItem(item, formData) {
  if (!item || !formData) return item;
  const normalized = normalizeInternetFormData(formData);
  const ipNonFixe = normalized.ipNonFixe === true;
  const ip = ipNonFixe ? "IP non fixe" : normalized.ip !== undefined ? normalized.ip : item.ip;
  return {
    ...item,
    nom: normalized.name ?? item.nom,
    name: normalized.name ?? item.name,
    site: normalized.location ?? item.site,
    location: normalized.location ?? item.location,
    ip,
    ipNonFixe,
    type: normalized.internetType ?? item.type,
    internetType: normalized.internetType ?? item.internetType,
    fournisseur: normalized.fournisseur ?? item.fournisseur,
    debit: normalized.debit ?? item.debit,
    debitDownload: normalized.debitDownload ?? item.debitDownload,
    debitUpload: normalized.debitUpload ?? item.debitUpload,
    categorie: normalized.categorie ?? item.categorie,
    numeroLigne: normalized.numeroLigne ?? item.numeroLigne,
    referenceContrat: normalized.referenceContrat ?? item.referenceContrat,
    supportTelephone: normalized.supportTelephone ?? item.supportTelephone,
    dateMiseEnService: normalized.dateMiseEnService ?? item.dateMiseEnService,
    boxModele: normalized.boxModele ?? item.boxModele,
    gateway: normalized.gateway ?? item.gateway,
    commentaire: normalized.commentaire ?? item.commentaire
  };
}
export function isSameInternetEquipmentItem(item, reference) {
  if (!item || !reference) return false;
  if (reference.id != null && item.id != null && String(item.id) === String(reference.id)) {
    return true;
  }
  const refName = (reference.nom || reference.name || "").trim();
  const itemName = (item.nom || item.name || "").trim();
  if (refName && itemName && refName === itemName) return true;
  const refSite = (reference.site || reference.location || "").trim().toLowerCase();
  const itemSite = (item.site || item.location || "").trim().toLowerCase();
  const refFournisseur = (reference.fournisseur || reference.operateur || "").trim().toLowerCase();
  const itemFournisseur = (item.fournisseur || item.operateur || "").trim().toLowerCase();
  const refType = (reference.type || reference.internetType || "").trim().toLowerCase();
  const itemType = (item.type || item.internetType || "").trim().toLowerCase();
  if (refSite && itemSite && refSite === itemSite && refFournisseur && itemFournisseur && refFournisseur === itemFournisseur && refType && itemType && refType === itemType) {
    return true;
  }
  return false;
}
export function patchInternetEquipmentList(list, formData, reference, equipmentIndex = -1) {
  if (!Array.isArray(list) || !formData) return list;
  if (equipmentIndex >= 0 && equipmentIndex < list.length) {
    return list.map((item, index) => index === equipmentIndex ? patchInternetEquipmentItem(item, formData) : item);
  }
  if (!reference) return list;
  return list.map(item => isSameInternetEquipmentItem(item, reference) ? patchInternetEquipmentItem(item, formData) : item);
}
export function applyInternetPatchToEquipements(equipements, formData, reference, equipmentIndex = -1) {
  if (!equipements?.Internet) return equipements;
  return {
    ...equipements,
    Internet: patchInternetEquipmentList(equipements.Internet, formData, reference, equipmentIndex)
  };
}
export const readInternetIpNonFixe = isInternetIpNonFixe;
