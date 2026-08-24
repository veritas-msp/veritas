import { getRemoteAccessMenuIcon, getRemoteAccessUrl, hasRemoteAccessConfigured, openRemoteAccess, supportsRemoteAccess } from "./equipmentRemoteAccessUtils";
import { getServerRemoteAccessIcon, getServerRemoteAccessSolutionDef, hasServerRemoteAccessConfigured, openServerRemoteAccess, readServerRemoteAccess } from "./constants/serverRemoteAccessUtils";
import { formatEquipmentRemoteAccessTooltip, formatEquipmentServerRemoteTooltip, getEquipmentRemoteAccessLabel, getEquipmentServerRemoteLabel } from "./equipmentPageI18n";

const REMOTE_FIELD_KEYS = ["remoteAccessSolution"];
const URL_FIELD_KEYS = ["adminUrl", "stormshieldWanUrl"];

function firstConfiguredFieldKey(keys, source = {}) {
  if (!Array.isArray(keys) || keys.length === 0) return null;
  const configured = keys.find(key => {
    const value = source?.[key];
    return value != null && String(value).trim() !== "";
  });
  return configured || keys[0];
}

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
      fieldKeys: new Set(REMOTE_FIELD_KEYS),
      primaryFieldKey: firstConfiguredFieldKey(REMOTE_FIELD_KEYS, merged),
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
      fieldKeys: new Set(URL_FIELD_KEYS),
      primaryFieldKey: firstConfiguredFieldKey(URL_FIELD_KEYS, merged),
      launch: () => openRemoteAccess(merged)
    };
  }
  return null;
}

export function shouldShowRemoteAccessFieldAction(fieldKey, remoteAccessAction) {
  if (!remoteAccessAction?.primaryFieldKey) return false;
  return remoteAccessAction.primaryFieldKey === fieldKey;
}
