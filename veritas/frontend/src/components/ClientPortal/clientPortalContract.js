import { FALLBACK_CONTRACT_MODULES } from "../../constants/contractModules";
import { PORTAL_CLOUD_CATALOG, PORTAL_INFRA_CATALOG, computeWorkstationOverview } from "./clientPortalOverview";
function isModuleEnabled(flags, moduleKeys) {
  if (!flags || typeof flags !== "object") return false;
  return moduleKeys.some(key => flags[key] === true);
}
export function buildContractOptionsGroups(data, copy, contractModules = FALLBACK_CONTRACT_MODULES) {
  const flags = {
    ...(data?.modules || {}),
    ...(data?.options || {})
  };
  const t = copy.contract;
  const catalog = copy.overviewCatalog;
  const serviceItems = (contractModules || FALLBACK_CONTRACT_MODULES).filter(module => module.enabled !== false).map(module => ({
    key: module.moduleKey,
    label: module.label || module.moduleKey,
    icon: module.icon || "mdi:checkbox-marked-circle-outline",
    subscribed: Boolean(flags[module.moduleKey])
  }));
  const workstationStats = computeWorkstationOverview(data?.computers, data?.mappedComputers);
  const workstationItem = {
    key: "workstations",
    label: catalog.workstations,
    icon: "mdi:laptop",
    subscribed: isModuleEnabled(flags, ["Ordinateurs", "Hardware"]) || workstationStats.total > 0
  };
  const infraItems = [workstationItem].concat(PORTAL_INFRA_CATALOG.map(entry => {
    const infraGroup = data?.infrastructure?.find(group => group.type === entry.type);
    const count = infraGroup?.items?.length || 0;
    return {
      key: entry.type,
      label: catalog[entry.labelKey],
      icon: entry.icon,
      subscribed: isModuleEnabled(flags, entry.moduleKeys) || count > 0
    };
  }));
  const cloudItems = PORTAL_CLOUD_CATALOG.filter(entry => entry.type !== "o365").map(entry => {
    const cloudGroup = data?.cloudServices?.find(group => group.type === entry.type);
    const count = cloudGroup?.items?.length || 0;
    return {
      key: entry.type,
      label: catalog[entry.labelKey],
      icon: entry.icon,
      subscribed: isModuleEnabled(flags, entry.moduleKeys) || count > 0
    };
  });
  return [{
    key: "services",
    title: t.servicesGroupTitle,
    items: serviceItems
  }, {
    key: "infra",
    title: t.infraGroupTitle,
    items: infraItems
  }, {
    key: "cloud",
    title: t.cloudGroupTitle,
    items: cloudItems
  }];
}
