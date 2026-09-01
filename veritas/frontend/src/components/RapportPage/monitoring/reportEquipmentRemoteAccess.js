import { interpolate } from "../../../i18n/translate";
import { getEquipmentPageCopy, getEquipmentRemoteAccessLabel } from "../../EquipementPage/equipmentPageI18n";
import {
  supportsRemoteAccess,
  hasRemoteAccessConfigured,
  getRemoteAccessUrl,
  openRemoteAccess,
  getRemoteAccessMenuIcon,
  EQUIPMENT_REMOTE_ACTION_ICON
} from "../../EquipementPage/equipmentRemoteAccessUtils";
import {
  getServerRemoteAccessSolutionDef,
  getServerRemoteAccessIcon,
  hasServerRemoteAccessConfigured,
  openServerRemoteAccess,
  readServerRemoteAccess
} from "../../EquipementPage/constants/serverRemoteAccessUtils";
import {
  isSynologyStorage,
  hasQuickConnectConfigured,
  getQuickConnectValue,
  openQuickConnectUrl
} from "../../EquipementPage/synologyEquipmentUtils";

const MODULE_KEY_TYPE = {
  Storage: "NAS",
  Servers: "Servers",
  Firewall: "Firewalls",
  Internet: "Routeur",
  Switch: "Switch",
  TOIP: "TOIP"
};

export function resolveReportEquipment(equipment, moduleKey) {
  if (!equipment) return equipment;
  const hintType = MODULE_KEY_TYPE[moduleKey];
  if (!hintType || equipment.type) return equipment;
  return {
    ...equipment,
    type: hintType
  };
}

function canShowQuickConnect(equipment, moduleKey) {
  const resolved = resolveReportEquipment(equipment, moduleKey);
  const isStorage = moduleKey === "Storage" || resolved?.type === "NAS" || resolved?.type === "Storage" || resolved?.type === "Stockage";
  if (!isStorage) return false;
  const forSynology = resolved.type ? resolved : {
    ...resolved,
    type: "NAS"
  };
  return isSynologyStorage(forSynology);
}

function canShowServerRemote(equipment, moduleKey) {
  const resolved = resolveReportEquipment(equipment, moduleKey);
  const type = String(resolved?.type || "").toLowerCase();
  if (moduleKey === "Servers") return true;
  return type === "serveurs" || type === "serveur" || type === "servers" || type === "server";
}

export function getReportRemoteAccessAction(equipment, moduleKey) {
  const resolved = resolveReportEquipment(equipment, moduleKey);
  if (canShowQuickConnect(resolved, moduleKey) && hasQuickConnectConfigured(resolved)) {
    return {
      kind: "quickconnect",
      icon: EQUIPMENT_REMOTE_ACTION_ICON,
      value: getQuickConnectValue(resolved),
      onClick: () => openQuickConnectUrl(resolved)
    };
  }
  if (canShowServerRemote(resolved, moduleKey) && hasServerRemoteAccessConfigured(resolved)) {
    const {
      solution,
      id
    } = readServerRemoteAccess(resolved);
    const def = getServerRemoteAccessSolutionDef(solution);
    return {
      kind: "server-remote",
      icon: getServerRemoteAccessIcon(resolved),
      label: def?.label || "Prise en main",
      id,
      onClick: () => openServerRemoteAccess(resolved)
    };
  }
  if (supportsRemoteAccess(resolved) && hasRemoteAccessConfigured(resolved)) {
    return {
      kind: "remote-url",
      icon: getRemoteAccessMenuIcon(resolved),
      url: getRemoteAccessUrl(resolved),
      onClick: () => openRemoteAccess(resolved)
    };
  }
  return null;
}

export function hasReportRemoteAccessConfigured(equipment, moduleKey) {
  return Boolean(getReportRemoteAccessAction(equipment, moduleKey));
}

export function getReportRemoteAccessTitle(action, locale) {
  if (!action) return "";
  const actions = getEquipmentPageCopy(locale).actions;
  if (action.kind === "quickconnect") {
    return interpolate(actions.quickConnectOpen, {
      value: action.value
    });
  }
  if (action.kind === "server-remote") {
    return interpolate(actions.serverRemoteTooltip, {
      label: action.label,
      id: action.id
    });
  }
  const accessLabel = getEquipmentRemoteAccessLabel(locale, true);
  return interpolate(actions.remoteAccessWithUrl, {
    label: accessLabel,
    url: action.url
  });
}

export function getReportRemoteAccessAriaLabel(action, locale) {
  if (!action) return "";
  const actions = getEquipmentPageCopy(locale).actions;
  if (action.kind === "quickconnect") {
    return actions.quickConnect || "QuickConnect";
  }
  if (action.kind === "server-remote") {
    return actions.serverRemote;
  }
  return getEquipmentRemoteAccessLabel(locale, true);
}
