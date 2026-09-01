export const WIFI_SSID_BAND_OPTIONS = [{
  value: "dual",
  label: "Dual (2,4 + 5 GHz)"
}, {
  value: "2.4",
  label: "2,4 GHz"
}, {
  value: "5",
  label: "5 GHz"
}, {
  value: "6",
  label: "6 GHz"
}];
export const WIFI_SSID_TYPE_OPTIONS = [{
  value: "prive",
  label: "Private (company)"
}, {
  value: "public",
  label: "Public / guest"
}];
export function createWifiSsidEntry(overrides = {}) {
  return {
    id: `ssid-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    nom: "",
    vlan: "",
    bande: "dual",
    type: "prive",
    portailCaptif: false,
    ...overrides
  };
}
export function isInternalSsidToken(value) {
  const raw = String(value || "").trim();
  return /^ssid-\d+/i.test(raw) || /^legacy-/i.test(raw);
}
function readSsidNom(entry) {
  if (typeof entry === "string") return entry.trim();
  if (!entry || typeof entry !== "object") return "";
  return String(entry.nom || entry.name || entry.ssid || "").trim();
}
function isDisplayableSsidNom(nom) {
  const trimmed = String(nom || "").trim();
  return Boolean(trimmed) && !isInternalSsidToken(trimmed);
}
export function coerceWifiSsidList(value) {
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return [];
    try {
      const parsed = JSON.parse(trimmed);
      return Array.isArray(parsed) ? parsed : trimmed ? [trimmed] : [];
    } catch {
      return [trimmed];
    }
  }
  return [];
}
function scoreSsidList(list) {
  const items = coerceWifiSsidList(list);
  if (!items.length) return 0;
  let named = 0;
  items.forEach(item => {
    if (isDisplayableSsidNom(readSsidNom(item))) named += 1;
  });
  return items.length * 1000 + named;
}
function pickBestSsidList(candidates) {
  let best = [];
  let bestScore = 0;
  candidates.forEach(candidate => {
    const list = coerceWifiSsidList(candidate);
    const score = scoreSsidList(list);
    if (score > bestScore) {
      best = list;
      bestScore = score;
    }
  });
  return best;
}
export function resolveClientWifiSsidCatalog(client) {
  return pickBestSsidList([client?.ssids, client?.ssid]);
}
export function collectEquipmentAssignedSsids(source) {
  if (!source || typeof source !== "object") return [];
  return pickBestSsidList([
    source.ssids,
    source.assignedSsids,
    source.assignedSsidIds,
    source.data?.ssids,
    source.data?.assignedSsids,
    source.data?.assignedSsidIds,
    source.rawData?.ssids,
    source.rawData?.assignedSsids,
    source.rawData?.assignedSsidIds,
    source.rawData?.data?.ssids,
    source.rawData?.data?.assignedSsids,
    source.rawData?.data?.assignedSsidIds
  ]);
}
export function normalizeWifiSsidEntry(entry, index = 0) {
  if (typeof entry === "string") {
    const nom = entry.trim();
    if (isInternalSsidToken(nom)) {
      return createWifiSsidEntry({
        id: nom,
        nom: ""
      });
    }
    return createWifiSsidEntry({
      id: `legacy-${index}-${nom || index}`,
      nom
    });
  }
  if (!entry || typeof entry !== "object") {
    return createWifiSsidEntry({
      id: `ssid-empty-${index}`
    });
  }
  const nom = readSsidNom(entry);
  const id = entry.id || (isInternalSsidToken(nom) ? nom : `ssid-${index}-${String(nom).slice(0, 12) || index}`);
  return {
    id,
    nom: isInternalSsidToken(nom) ? "" : nom,
    vlan: entry.vlan != null ? String(entry.vlan) : "",
    bande: entry.bande || "dual",
    type: entry.type === "public" ? "public" : "prive",
    portailCaptif: entry.type === "public" ? !!entry.portailCaptif : false
  };
}
export function normalizeWifiSsidCatalog(ssids) {
  return coerceWifiSsidList(ssids).map((entry, index) => normalizeWifiSsidEntry(entry, index));
}
export function normalizeWifiSsidList(ssids) {
  return normalizeWifiSsidCatalog(ssids).filter(entry => entry.nom || entry.vlan);
}
export function serializeWifiSsidCatalogForPersistence(ssids) {
  return normalizeWifiSsidCatalog(ssids).filter(entry => entry.nom.trim()).map(({
    id,
    nom,
    vlan,
    bande,
    type,
    portailCaptif
  }) => ({
    id,
    nom: nom.trim(),
    vlan: vlan.trim(),
    bande,
    type,
    ...(type === "public" ? {
      portailCaptif: !!portailCaptif
    } : {})
  }));
}
export function wifiSsidCatalogsEqual(a, b) {
  return JSON.stringify(serializeWifiSsidCatalogForPersistence(a || [])) === JSON.stringify(serializeWifiSsidCatalogForPersistence(b || []));
}
export function resolveAssignedSsidIds(rawAssigned, clientCatalog = []) {
  const assigned = coerceWifiSsidList(rawAssigned);
  if (!assigned.length) return [];
  const catalogById = new Map(normalizeWifiSsidCatalog(clientCatalog).map(entry => [entry.id, entry]));
  const catalogByNom = new Map(normalizeWifiSsidCatalog(clientCatalog).filter(entry => entry.nom).map(entry => [entry.nom.toLowerCase(), entry.id]));
  const resolved = [];
  assigned.forEach(item => {
    if (typeof item === "string") {
      const trimmed = item.trim();
      if (!trimmed) return;
      if (catalogById.has(trimmed)) {
        resolved.push(trimmed);
        return;
      }
      const byNom = catalogByNom.get(trimmed.toLowerCase());
      if (byNom) {
        resolved.push(byNom);
        return;
      }
      resolved.push(trimmed);
      return;
    }
    if (item && typeof item === "object") {
      if (item.id && catalogById.has(item.id)) {
        resolved.push(item.id);
        return;
      }
      const nom = readSsidNom(item);
      if (nom) {
        const byNom = catalogByNom.get(nom.toLowerCase());
        if (byNom) {
          resolved.push(byNom);
          return;
        }
      }
      if (item.id) resolved.push(item.id);
    }
  });
  return [...new Set(resolved)];
}
export function buildBorneWifiSsidFormState(equipment, client, {
  peerBorneWifi = []
} = {}) {
  let clientSsids = normalizeWifiSsidCatalog(resolveClientWifiSsidCatalog(client));
  const mergeCatalogEntry = (entry, {
    allowUnnamed = false
  } = {}) => {
    if (!entry?.id) return;
    const nom = String(entry.nom || "").trim();
    if (nom && isInternalSsidToken(nom)) return;
    if (!nom && !allowUnnamed) return;
    const exists = clientSsids.some(ssid => ssid.id === entry.id || nom && ssid.nom.toLowerCase() === nom.toLowerCase());
    if (exists) {
      clientSsids = clientSsids.map(ssid => {
        if (ssid.id !== entry.id && !(nom && ssid.nom.toLowerCase() === nom.toLowerCase())) return ssid;
        if (isDisplayableSsidNom(ssid.nom)) return ssid;
        return {
          ...ssid,
          ...entry,
          nom: nom || ssid.nom
        };
      });
      return;
    }
    clientSsids = [...clientSsids, entry];
  };
  const harvestFromBorne = borne => {
    if (!borne || typeof borne !== "object") return;
    normalizeWifiSsidCatalog(collectEquipmentAssignedSsids(borne)).forEach(entry => mergeCatalogEntry(entry));
  };
  const peerSources = [...(Array.isArray(client?.equipements?.BorneWifi) ? client.equipements.BorneWifi : []), ...(Array.isArray(peerBorneWifi) ? peerBorneWifi : [])];
  peerSources.forEach(harvestFromBorne);
  harvestFromBorne(equipment);
  const rawAssigned = collectEquipmentAssignedSsids(equipment);
  normalizeWifiSsidCatalog(rawAssigned).forEach(entry => mergeCatalogEntry(entry));
  const assignedSsidIds = resolveAssignedSsidIds(rawAssigned, clientSsids);
  assignedSsidIds.forEach(id => {
    if (!id || clientSsids.some(entry => entry.id === id)) return;
    const rawItem = rawAssigned.find(item => {
      if (typeof item === "string") return item.trim() === id;
      return item && typeof item === "object" && String(item.id || "") === String(id);
    });
    mergeCatalogEntry(normalizeWifiSsidEntry(rawItem && typeof rawItem === "object" ? {
      ...rawItem,
      id
    } : {
      id,
      nom: isDisplayableSsidNom(rawItem) ? String(rawItem).trim() : ""
    }), {
      allowUnnamed: true
    });
  });
  return {
    clientSsids,
    assignedSsidIds
  };
}
export function getWifiSsidById(catalog, ssidId) {
  return normalizeWifiSsidCatalog(catalog).find(entry => entry.id === ssidId) || null;
}
function resolveSsidDisplayName(catalog, ssidId) {
  if (ssidId && typeof ssidId === "object") {
    const embeddedNom = readSsidNom(ssidId);
    if (isDisplayableSsidNom(embeddedNom)) {
      return embeddedNom;
    }
    return resolveSsidDisplayName(catalog, ssidId.id);
  }
  const entry = getWifiSsidById(catalog, ssidId);
  if (isDisplayableSsidNom(entry?.nom)) return entry.nom;
  const normalized = normalizeWifiSsidCatalog(catalog);
  const raw = String(ssidId || "").trim();
  if (!raw) return null;
  const byObject = normalized.find(item => item.id === raw && isDisplayableSsidNom(item.nom));
  if (byObject?.nom) return byObject.nom;
  if (isInternalSsidToken(raw)) return null;
  return raw;
}
function collectSsidDisplayNames(catalog, items) {
  if (!Array.isArray(items) || !items.length) return [];
  const names = [];
  items.forEach(item => {
    const resolved = resolveSsidDisplayName(catalog, item);
    if (resolved) names.push(resolved);
  });
  return [...new Set(names)];
}
export function serializeAssignedSsidsForPersistence(assignedIds, catalog = []) {
  const normalizedCatalog = normalizeWifiSsidCatalog(catalog);
  const ids = Array.isArray(assignedIds) ? assignedIds : [];
  return ids.map(item => {
    if (item && typeof item === "object" && item.id) {
      const embeddedNom = readSsidNom(item);
      if (isDisplayableSsidNom(embeddedNom)) {
        return {
          id: item.id,
          nom: embeddedNom
        };
      }
      const entry = getWifiSsidById(normalizedCatalog, item.id);
      if (entry?.nom) return {
        id: entry.id,
        nom: entry.nom
      };
      return item.id;
    }
    const entry = getWifiSsidById(normalizedCatalog, item);
    if (entry?.nom) return {
      id: entry.id,
      nom: entry.nom
    };
    return item;
  }).filter(value => value != null && value !== "");
}
export function formatAssignedSsidsDisplay(formData) {
  const catalog = formData?.clientSsids || [];
  const assignedIds = Array.isArray(formData?.assignedSsidIds) ? formData.assignedSsidIds : [];
  const rawAssigned = formData?.ssids;
  let names = collectSsidDisplayNames(catalog, coerceWifiSsidList(rawAssigned));
  if (!names.length && assignedIds.length) {
    names = collectSsidDisplayNames(catalog, assignedIds);
  }
  if (!names.length && coerceWifiSsidList(rawAssigned).length) {
    names = collectSsidDisplayNames(catalog, resolveAssignedSsidIds(rawAssigned, catalog));
  }
  return names.length ? names.join(", ") : null;
}
