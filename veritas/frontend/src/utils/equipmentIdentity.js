export function normalizeClientId(value) {
  if (value == null || value === "") return null;
  return String(value);
}
export function isDbEquipmentId(value) {
  if (value == null || value === "") return false;
  const str = String(value);
  if (/^\d+$/.test(str)) return true;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}
export function getEquipmentDbId(equipment) {
  if (!equipment) return null;
  const candidates = [equipment.dbId, equipment.rawData?.id, equipment.id];
  for (const candidate of candidates) {
    if (isDbEquipmentId(candidate)) return String(candidate);
  }
  return null;
}
export function getEquipmentClientId(equipment) {
  if (!equipment) return null;
  return normalizeClientId(equipment.clientId ?? equipment.rawData?.client_id);
}
export function normalizeEquipmentType(type) {
  if (type === "Stockage") return "NAS";
  return type;
}
export function getEquipmentListKey(equipment) {
  if (!equipment) return "unknown";
  const clientId = getEquipmentClientId(equipment);
  const dbId = getEquipmentDbId(equipment);
  if (clientId && dbId) return `${clientId}:${dbId}`;
  if (equipment.id) return String(equipment.id);
  const type = equipment.type || equipment.rawData?.type || "unknown";
  const name = equipment.name || equipment.rawData?.nom || "item";
  const tail = equipment.serial || equipment.rawData?.numeroSerie || equipment.mac || equipment.adresseMac || equipment.rawData?.adresseMac || equipment.ip || "";
  return `${clientId || "0"}-${type}-${name}-${tail}`;
}
export function isSameEquipmentItem(a, b) {
  if (!a || !b) return false;
  const clientA = getEquipmentClientId(a);
  const clientB = getEquipmentClientId(b);
  if (!clientA || !clientB || clientA !== clientB) return false;
  const dbA = getEquipmentDbId(a);
  const dbB = getEquipmentDbId(b);
  if (dbA && dbB) return dbA === dbB;
  if (dbA && b.id && String(b.id) === dbA) return true;
  if (dbB && a.id && String(a.id) === dbB) return true;
  if (a.id && b.id && String(a.id) === String(b.id)) return true;
  const typeA = normalizeEquipmentType(a.type || a.rawData?.type);
  const typeB = normalizeEquipmentType(b.type || b.rawData?.type);
  if (typeA && typeB && typeA !== typeB) return false;
  const serialA = a.serial || a.rawData?.numeroSerie || a.rawData?.serial;
  const serialB = b.serial || b.rawData?.numeroSerie || b.rawData?.serial;
  if (serialA && serialB && serialA === serialB) return true;
  const macA = a.mac || a.adresseMac || a.rawData?.adresseMac || a.rawData?.mac;
  const macB = b.mac || b.adresseMac || b.rawData?.adresseMac || b.rawData?.mac;
  if (macA && macB && macA === macB) return true;
  const ipA = a.ip || a.rawData?.ip;
  const ipB = b.ip || b.rawData?.ip;
  if (ipA && ipB && ipA === ipB && typeA === "Internet") return true;
  return false;
}
export function findEquipmentInList(list, reference) {
  const arr = Array.isArray(list) ? list : [];
  const dbId = getEquipmentDbId(reference);
  if (dbId) {
    const direct = arr.find(item => String(getEquipmentDbId(item) || "") === dbId);
    if (direct) return direct;
  }
  return arr.find(item => isSameEquipmentItem(item, reference)) || null;
}
function getApiRowName(row) {
  return row?.name || row?.data?.nom || row?.data?.name || row?.item_key || "";
}
function refineNameMatches(nameMatches, equipment) {
  if (nameMatches.length <= 1) return nameMatches[0] || null;
  const serial = equipment?.serial || equipment?.rawData?.numeroSerie || equipment?.rawData?.serial;
  const mac = equipment?.mac || equipment?.adresseMac || equipment?.rawData?.adresseMac || equipment?.rawData?.mac;
  const ip = equipment?.ip || equipment?.rawData?.ip;
  const refined = nameMatches.filter(row => {
    const data = row.data || {};
    if (serial && (data.numeroSerie || data.serial) === serial) return true;
    if (mac && (data.adresseMac || data.mac) === mac) return true;
    if (ip && data.ip === ip) return true;
    return false;
  });
  if (refined.length === 1) return refined[0];
  return null;
}
export function findEquipmentInApiList(list, equipment, {
  type,
  equipmentName
} = {}) {
  const arr = Array.isArray(list) ? list : [];
  const dbId = getEquipmentDbId(equipment);
  if (dbId) {
    const hit = arr.find(row => String(row.id) === dbId);
    if (hit) return hit;
  }
  const targetName = equipmentName || equipment?.name || equipment?.rawData?.nom || equipment?.rawData?.name || "";
  if (!targetName) return null;
  if (type === "Internet") {
    const nameMatches = arr.filter(row => {
      const eqName = getApiRowName(row);
      if (eqName === targetName) return true;
      const originalName = equipment?.rawData?.nom || equipment?.name || "";
      if (originalName && eqName === originalName) return true;
      const eqFournisseur = row.data?.fournisseur || "";
      const eqType = row.data?.type || "";
      const equipmentFournisseur = equipment?.rawData?.fournisseur || equipment?.fournisseur || "";
      const equipmentInternetType = equipment?.rawData?.type || equipment?.internetType || "";
      if (equipmentFournisseur && equipmentInternetType && eqFournisseur && eqType) {
        return eqFournisseur.toUpperCase() === equipmentFournisseur.toUpperCase() && eqType.toUpperCase() === equipmentInternetType.toUpperCase();
      }
      return false;
    });
    const refined = refineNameMatches(nameMatches, equipment);
    if (refined) return refined;
    if (nameMatches.length === 1) return nameMatches[0];
    return null;
  }
  const nameMatches = arr.filter(row => {
    const eqName = getApiRowName(row);
    return eqName === targetName || eqName === (equipment?.name || equipment?.rawData?.nom);
  });
  const refined = refineNameMatches(nameMatches, equipment);
  if (refined) return refined;
  if (nameMatches.length === 1) return nameMatches[0];
  return null;
}
