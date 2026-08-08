export const FALLBACK_CONTRACT_MODULES = [{
  id: 1,
  moduleKey: "Support",
  label: "Support",
  icon: "mdi:headset",
  enabled: true,
  sortOrder: 10
}, {
  id: 2,
  moduleKey: "Curatif",
  label: "Curatif",
  icon: "tabler:truck-filled",
  enabled: true,
  sortOrder: 20
}, {
  id: 3,
  moduleKey: "Preventif",
  label: "Preventive",
  icon: "fluent-mdl2:documentation",
  enabled: true,
  sortOrder: 30
}, {
  id: 4,
  moduleKey: "Monitoring",
  label: "Monitoring",
  icon: "eos-icons:monitoring",
  enabled: true,
  sortOrder: 40
}, {
  id: 5,
  moduleKey: "Hebergement",
  label: "Hosting",
  icon: "carbon:data-center",
  enabled: true,
  sortOrder: 50
}];
export function buildEmptyModulesMap(modules) {
  const list = Array.isArray(modules) ? modules : FALLBACK_CONTRACT_MODULES;
  return Object.fromEntries(list.map(m => [m.moduleKey, false]));
}
export function getModuleLabel(modules, key) {
  const found = (modules || []).find(m => m.moduleKey === key);
  return found?.label || key;
}
export function normalizeClientOptions(rawOptions, moduleDefinitions) {
  const base = buildEmptyModulesMap(moduleDefinitions);
  if (!rawOptions || typeof rawOptions !== "object") return {
    ...base
  };
  return {
    ...base,
    ...rawOptions
  };
}
export function getActiveModuleKeys(options, moduleDefinitions) {
  const defs = moduleDefinitions || FALLBACK_CONTRACT_MODULES;
  const enabledKeys = new Set(defs.filter(m => m.enabled !== false).map(m => m.moduleKey));
  return Object.keys(options || {}).filter(key => options[key] && enabledKeys.has(key));
}
export function getAllActiveModuleKeys(options, moduleDefinitions) {
  const defs = moduleDefinitions || FALLBACK_CONTRACT_MODULES;
  const known = new Set(defs.map(m => m.moduleKey));
  const fromDefs = getActiveModuleKeys(options, defs);
  const legacy = Object.keys(options || {}).filter(key => options[key] && !known.has(key));
  return [...fromDefs, ...legacy];
}
