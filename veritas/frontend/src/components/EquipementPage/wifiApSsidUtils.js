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
export function normalizeWifiSsidEntry(entry, index = 0) {
  if (typeof entry === "string") {
    const nom = entry.trim();
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
  const nom = entry.nom || entry.name || entry.ssid || "";
  return {
    id: entry.id || `ssid-${index}-${String(nom).slice(0, 12) || index}`,
    nom: String(nom || "").trim(),
    vlan: entry.vlan != null ? String(entry.vlan) : "",
    bande: entry.bande || "dual",
    type: entry.type === "public" ? "public" : "prive",
    portailCaptif: entry.type === "public" ? !!entry.portailCaptif : false
  };
}
export function normalizeWifiSsidCatalog(ssids) {
  if (!Array.isArray(ssids)) return [];
  return ssids.map((entry, index) => normalizeWifiSsidEntry(entry, index));
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
  if (!Array.isArray(rawAssigned)) return [];
  const catalogById = new Map(normalizeWifiSsidCatalog(clientCatalog).map(entry => [entry.id, entry]));
  const catalogByNom = new Map(normalizeWifiSsidCatalog(clientCatalog).filter(entry => entry.nom).map(entry => [entry.nom.toLowerCase(), entry.id]));
  const resolved = [];
  rawAssigned.forEach(item => {
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
      if (item.nom) {
        const byNom = catalogByNom.get(String(item.nom).toLowerCase());
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
export function isInternalSsidToken(value) {
  const raw = String(value || "").trim();
  return /^ssid-\d+/i.test(raw) || /^legacy-/i.test(raw);
}
export function buildBorneWifiSsidFormState(equipment, client) {
  const clientCatalog = client?.ssids || client?.ssid || [];
  let clientSsids = normalizeWifiSsidCatalog(clientCatalog);
  const raw = equipment?.rawData?.data || equipment?.rawData || equipment || {};
  const rawAssigned = raw.ssids ?? equipment?.ssids ?? [];
  normalizeWifiSsidCatalog(rawAssigned).forEach(entry => {
    if (!entry.nom || isInternalSsidToken(entry.nom)) return;
    const exists = clientSsids.some(ssid => ssid.id === entry.id || ssid.nom.toLowerCase() === entry.nom.toLowerCase());
    if (!exists) {
      clientSsids = [...clientSsids, entry];
    }
  });
  const assignedSsidIds = resolveAssignedSsidIds(rawAssigned, clientSsids);
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
    const embeddedNom = ssidId.nom || ssidId.name || ssidId.ssid;
    if (embeddedNom && !isInternalSsidToken(embeddedNom)) {
      return String(embeddedNom).trim();
    }
    return resolveSsidDisplayName(catalog, ssidId.id);
  }
  const entry = getWifiSsidById(catalog, ssidId);
  if (entry?.nom && !isInternalSsidToken(entry.nom)) return entry.nom;
  const normalized = normalizeWifiSsidCatalog(catalog);
  const raw = String(ssidId || "").trim();
  if (!raw) return null;
  const byObject = normalized.find(item => item.id === raw && item.nom && !isInternalSsidToken(item.nom));
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
      const embeddedNom = item.nom || item.name || item.ssid;
      if (embeddedNom && !isInternalSsidToken(embeddedNom)) {
        return {
          id: item.id,
          nom: String(embeddedNom).trim()
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
  let names = collectSsidDisplayNames(catalog, rawAssigned);
  if (!names.length && assignedIds.length) {
    names = collectSsidDisplayNames(catalog, assignedIds);
  }
  if (!names.length && Array.isArray(rawAssigned) && rawAssigned.length) {
    names = collectSsidDisplayNames(catalog, resolveAssignedSsidIds(rawAssigned, catalog));
  }
  return names.length ? names.join(", ") : null;
}
