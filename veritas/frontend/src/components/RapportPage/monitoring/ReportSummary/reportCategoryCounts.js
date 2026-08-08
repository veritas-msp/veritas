export const REPORT_INFRA_MODULES = ["Internet", "Firewall", "Routeur", "Servers", "Storage", "Switch", "BorneWifi", "Alimentation", "TOIP"];
export const REPORT_CYBER_MODULES = ["Backup", "Antivirus", "Antispam"];
export const REPORT_SERVICES_MODULES = ["Office365", "NDD"];
const ALL_REPORT_MODULES = [...REPORT_INFRA_MODULES, ...REPORT_CYBER_MODULES, ...REPORT_SERVICES_MODULES];
export function getModuleKeyForEquipment(equipmentKey, comments = []) {
  if (Array.isArray(comments)) {
    for (const comment of comments) {
      if (comment?.moduleKey) return comment.moduleKey;
    }
  }
  const key = String(equipmentKey || "");
  if (key.startsWith("Backup:")) return "Backup";
  for (const moduleKey of ALL_REPORT_MODULES) {
    if (key.startsWith(`${moduleKey}:`)) return moduleKey;
  }
  return null;
}
export function sumEquipmentCountsForModules(countsMap = {}, moduleKeys = [], equipmentComments = {}) {
  let total = 0;
  Object.entries(countsMap).forEach(([equipmentKey, count]) => {
    const moduleKey = getModuleKeyForEquipment(equipmentKey, equipmentComments[equipmentKey]);
    if (moduleKey && moduleKeys.includes(moduleKey)) {
      total += Number(count || 0);
    }
  });
  return total;
}
