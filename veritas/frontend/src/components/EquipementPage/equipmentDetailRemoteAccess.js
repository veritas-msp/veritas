import { getRemoteAccessMenuIcon, getRemoteAccessUrl, hasRemoteAccessConfigured, openRemoteAccess, supportsRemoteAccess } from "./equipmentRemoteAccessUtils";
import { getServerRemoteAccessIcon, getServerRemoteAccessSolutionDef, hasServerRemoteAccessConfigured, openServerRemoteAccess, readServerRemoteAccess } from "./constants/serverRemoteAccessUtils";
import { formatEquipmentRemoteAccessTooltip, formatEquipmentServerRemoteTooltip, getEquipmentRemoteAccessLabel, getEquipmentServerRemoteLabel } from "./equipmentPageI18n";
const REMOTE_FIELD_KEYS = new Set(["remoteAccessSolution"]);
const URL_FIELD_KEYS = new Set(["adminUrl", "stormshieldWanUrl"]);
export function resolveEquipmentRemoteAccessAction(equipment, formData = {}, locale = "fr") {
  const merged = {
    ...equipment,
    ...formData
  };
  if (hasServerRemoteAccessConfigured(merged)) {
    const {
      solution,
      id
    } = readServerRemoteAccess(merged);
    const def = getServerRemoteAccessSolutionDef(solution);
    return {
      kind: "server",
      label: getEquipmentServerRemoteLabel(locale),
      tooltip: formatEquipmentServerRemoteTooltip(locale, {
        solutionLabel: def?.label,
        id
      }),
      icon: getServerRemoteAccessIcon(merged),
      fieldKeys: REMOTE_FIELD_KEYS,
      launch: () => openServerRemoteAccess(merged)
    };
  }
  if (supportsRemoteAccess(merged) && hasRemoteAccessConfigured(merged)) {
    const url = getRemoteAccessUrl(merged);
    return {
      kind: "url",
      label: getEquipmentRemoteAccessLabel(locale, true),
      tooltip: formatEquipmentRemoteAccessTooltip(locale, {
        configured: true,
        url,
        equipmentType: merged?.type
      }),
      icon: getRemoteAccessMenuIcon(merged),
      fieldKeys: URL_FIELD_KEYS,
      launch: () => openRemoteAccess(merged)
    };
  }
  return null;
}
export function shouldShowRemoteAccessFieldAction(fieldKey, remoteAccessAction) {
  if (!remoteAccessAction?.fieldKeys) return false;
  return remoteAccessAction.fieldKeys.has(fieldKey);
}
