import { pickLocaleMessages } from "./translate";
export const SYSTEM_CONTRACT_MODULE_KEYS = new Set(["Support", "Curatif", "Preventif", "Monitoring", "Hebergement", "MagicInfo", "Videosurveillance"]);
const MODULE_LABELS = {
  fr: {
    Support: "Support",
    Curatif: "Curatif",
    Preventif: "Préventif",
    Monitoring: "Monitoring",
    Hebergement: "Hébergement",
    MagicInfo: "MagicInfo",
    Videosurveillance: "Vidéosurveillance"
  },
  en: {
    Support: "Support",
    Curatif: "Break-fix",
    Preventif: "Preventive",
    Monitoring: "Monitoring",
    Hebergement: "Hosting",
    MagicInfo: "MagicInfo",
    Videosurveillance: "Video surveillance"
  },
  de: {
    Support: "Support",
    Curatif: "Break-fix",
    Preventif: "Präventiv",
    Monitoring: "Monitoring",
    Hebergement: "Hosting",
    MagicInfo: "MagicInfo",
    Videosurveillance: "Videoüberwachung"
  },
  it: {
    Support: "Support",
    Curatif: "Correttivo",
    Preventif: "Preventivo",
    Monitoring: "Monitoring",
    Hebergement: "Hosting",
    MagicInfo: "MagicInfo",
    Videosurveillance: "Videosorveglianza"
  },
  es: {
    Support: "Soporte",
    Curatif: "Correctivo",
    Preventif: "Preventivo",
    Monitoring: "Monitorización",
    Hebergement: "Alojamiento",
    MagicInfo: "MagicInfo",
    Videosurveillance: "Videovigilancia"
  }
};
export function getContractModuleLabel(moduleKey, locale, fallback) {
  const key = String(moduleKey || "").trim();
  if (!key || !SYSTEM_CONTRACT_MODULE_KEYS.has(key)) {
    return fallback ?? key;
  }
  const labels = pickLocaleMessages(MODULE_LABELS, locale);
  return labels[key] || MODULE_LABELS.fr[key] || fallback || key;
}
export function localizeContractModule(module, locale) {
  if (!module) return module;
  const moduleKey = module.moduleKey || module.key;
  return {
    ...module,
    label: getContractModuleLabel(moduleKey, locale, module.label)
  };
}
export function localizeContractModules(modules, locale) {
  return (Array.isArray(modules) ? modules : []).map(module => localizeContractModule(module, locale));
}
export function getLocalizedModuleLabel(modules, moduleKey, locale) {
  const fallback = (modules || []).find(m => m.moduleKey === moduleKey)?.label || moduleKey;
  return getContractModuleLabel(moduleKey, locale, fallback);
}
