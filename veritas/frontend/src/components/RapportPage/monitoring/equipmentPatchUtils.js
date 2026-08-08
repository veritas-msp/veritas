import { applyInternetPatchToEquipements, isSameInternetEquipmentItem, normalizeInternetFormData, patchInternetEquipmentItem } from "./internetIpUtils";
const MODULE_LIST_KEYS = {
  Internet: ["Internet"],
  Firewall: ["Firewalls"],
  Firewalls: ["Firewalls"],
  Servers: ["Servers"],
  Storage: ["NAS", "SAN"],
  Switch: ["Switch"],
  BorneWifi: ["BorneWifi"]
};
export function getEquipmentListKeysForModule(moduleKey) {
  return MODULE_LIST_KEYS[moduleKey] || [moduleKey];
}
export function isSameEquipmentItem(item, reference, moduleKey) {
  if (!item || !reference) return false;
  if (moduleKey === "Internet") return isSameInternetEquipmentItem(item, reference);
  if (reference.id != null && item.id != null && String(item.id) === String(reference.id)) {
    return true;
  }
  const refName = (reference.nom || reference.name || "").trim();
  const itemName = (item.nom || item.name || "").trim();
  if (refName && itemName && refName === itemName) return true;
  const refSerial = (reference.numeroSerie || reference.serial || reference.sn || "").trim();
  const itemSerial = (item.numeroSerie || item.serial || item.sn || "").trim();
  if (refSerial && itemSerial && refSerial === itemSerial) return true;
  return false;
}
export function findEquipmentLocation(client, moduleKey, item) {
  const buckets = getEquipmentListKeysForModule(moduleKey);
  for (const listKey of buckets) {
    const list = client?.equipements?.[listKey];
    if (!Array.isArray(list)) continue;
    const equipmentIndex = list.findIndex(eq => isSameEquipmentItem(eq, item, moduleKey));
    if (equipmentIndex >= 0) {
      return {
        equipmentListKey: listKey,
        equipmentIndex
      };
    }
  }
  return {
    equipmentListKey: buckets[0] || null,
    equipmentIndex: -1
  };
}
function buildDataPatch(formData, moduleKey) {
  if (moduleKey === "Internet") {
    const normalized = normalizeInternetFormData(formData);
    return {
      nom: normalized.name,
      site: normalized.location,
      ip: normalized.ip,
      fournisseur: normalized.fournisseur,
      type: normalized.internetType,
      debit: normalized.debit,
      categorie: normalized.categorie,
      ipNonFixe: normalized.ipNonFixe
    };
  }
  const patch = {
    nom: formData.name,
    site: formData.location,
    ip: formData.ip,
    modele: formData.model,
    marque: formData.manufacturer,
    fabricant: formData.manufacturer,
    numeroSerie: formData.serial,
    version: formData.firmware,
    firmware: formData.firmware,
    vlan: formData.vlan,
    processeur: formData.processeur,
    memoire: formData.memoire,
    stockage: formData.stockage,
    systeme: formData.systeme,
    anydeskId: formData.remoteAccessSolution === "anydesk" || !formData.remoteAccessSolution ? formData.remoteAccessId ?? formData.anydeskId : undefined,
    remoteAccessSolution: formData.remoteAccessSolution,
    remoteAccessId: formData.remoteAccessId,
    adresseMac: formData.adresseMac,
    quickConnect: formData.quickConnect,
    raid: formData.raid,
    capacite: formData.capacite,
    nbDisquesActuels: formData.nbDisquesActuels,
    nbDisquesMax: formData.nbDisquesMax,
    type: formData.type,
    role: formData.role,
    expirationGarantie: formData.expirationGarantie,
    licences: formData.licences,
    modeHA: formData.modeHA,
    roleHA: formData.roleHA,
    firewallHAName: formData.firewallHAName
  };
  Object.keys(patch).forEach(key => {
    if (patch[key] === undefined) delete patch[key];
  });
  return patch;
}
export function patchEquipmentItem(item, formData, moduleKey) {
  if (!item || !formData) return item;
  if (moduleKey === "Internet") return patchInternetEquipmentItem(item, formData);
  const dataPatch = buildDataPatch(formData, moduleKey);
  const displayPatch = {
    nom: formData.name ?? item.nom,
    name: formData.name ?? item.name,
    site: formData.location ?? item.site,
    location: formData.location ?? item.location,
    ip: formData.ip ?? item.ip,
    fabricant: formData.manufacturer ?? item.fabricant ?? item.marque,
    marque: formData.manufacturer ?? item.marque ?? item.fabricant,
    manufacturer: formData.manufacturer ?? item.manufacturer,
    modele: formData.model ?? item.modele,
    model: formData.model ?? item.model,
    numeroSerie: formData.serial ?? item.numeroSerie ?? item.serial,
    serial: formData.serial ?? item.serial ?? item.numeroSerie,
    sn: formData.serial ?? item.sn,
    firmware: formData.firmware ?? item.firmware,
    vlan: formData.vlan ?? item.vlan,
    processeur: formData.processeur ?? item.processeur,
    memoire: formData.memoire ?? item.memoire,
    stockage: formData.stockage ?? item.stockage,
    systeme: formData.systeme ?? item.systeme,
    os: formData.systeme ?? item.os,
    anydeskId: formData.remoteAccessSolution === "anydesk" || !formData.remoteAccessSolution ? formData.remoteAccessId ?? formData.anydeskId ?? item.anydeskId : "",
    remoteAccessSolution: formData.remoteAccessSolution ?? item.remoteAccessSolution,
    remoteAccessId: formData.remoteAccessId ?? item.remoteAccessId,
    adresseMac: formData.adresseMac ?? item.adresseMac ?? item.mac,
    mac: formData.adresseMac ?? item.mac,
    quickConnect: formData.quickConnect ?? item.quickConnect,
    raid: formData.raid ?? item.raid,
    capacite: formData.capacite ?? item.capacite,
    nbDisquesActuels: formData.nbDisquesActuels ?? item.nbDisquesActuels,
    nbDisquesMax: formData.nbDisquesMax ?? item.nbDisquesMax,
    type: formData.type ?? item.type,
    role: formData.role ?? item.role,
    expirationGarantie: formData.expirationGarantie ?? item.expirationGarantie,
    garantie: formData.expirationGarantie ?? item.garantie,
    licences: formData.licences ?? item.licences,
    modeHA: formData.modeHA ?? item.modeHA,
    roleHA: formData.roleHA ?? item.roleHA,
    firewallHAName: formData.firewallHAName ?? item.firewallHAName
  };
  const patched = {
    ...item,
    ...displayPatch
  };
  if (item.data && typeof item.data === "object") {
    patched.data = {
      ...item.data,
      ...dataPatch
    };
  }
  return patched;
}
function patchEquipmentList(list, formData, moduleKey, reference, equipmentIndex = -1) {
  if (!Array.isArray(list) || !formData) return list;
  if (equipmentIndex >= 0 && equipmentIndex < list.length) {
    return list.map((item, index) => index === equipmentIndex ? patchEquipmentItem(item, formData, moduleKey) : item);
  }
  if (!reference) return list;
  return list.map(item => isSameEquipmentItem(item, reference, moduleKey) ? patchEquipmentItem(item, formData, moduleKey) : item);
}
export function applyEquipmentPatchToEquipements(equipements, moduleKey, formData, reference, equipmentListKey = null, equipmentIndex = -1) {
  if (!equipements || !formData) return equipements;
  if (moduleKey === "Internet") {
    return applyInternetPatchToEquipements(equipements, normalizeInternetFormData(formData), reference, equipmentIndex);
  }
  const listKey = equipmentListKey || getEquipmentListKeysForModule(moduleKey)[0];
  if (!listKey || !Array.isArray(equipements[listKey])) return equipements;
  return {
    ...equipements,
    [listKey]: patchEquipmentList(equipements[listKey], formData, moduleKey, reference, equipmentIndex)
  };
}
