import { useMemo } from "react";
import { Icon } from "@iconify/react";
import { interpolate } from "../../i18n/translate";
import { getEquipmentPageCopy, getEquipmentRemoteAccessLabel } from "../EquipementPage/equipmentPageI18n";
import {
  EQUIPMENT_REMOTE_ACTION_ICON,
  getRemoteAccessUrl,
  hasRemoteAccessConfigured,
  openRemoteAccess,
  supportsRemoteAccess
} from "../EquipementPage/equipmentRemoteAccessUtils";
import {
  getServerRemoteAccessSolutionDef,
  hasServerRemoteAccessConfigured,
  openServerRemoteAccess,
  readServerRemoteAccess
} from "../EquipementPage/constants/serverRemoteAccessUtils";
import {
  getQuickConnectValue,
  hasQuickConnectConfigured,
  isSynologyStorage,
  openQuickConnectUrl
} from "../EquipementPage/synologyEquipmentUtils";
import styles from "./TicketDetailPage.module.css";

function canShowServerRemote(equipment) {
  const type = String(equipment?.type || "").toLowerCase();
  return ["serveurs", "serveur", "servers", "server"].includes(type);
}

function canShowQuickConnect(equipment) {
  const type = String(equipment?.type || "").toLowerCase();
  const isStorage = type === "nas" || type === "storage" || type === "stockage";
  if (!isStorage) return false;
  // isSynologyStorage() historically ignores "Storage" — treat Synology brand + storage as eligible.
  if (isSynologyStorage(equipment)) return true;
  const manufacturer = String(
    equipment?.manufacturer || equipment?.rawData?.fabricant || equipment?.rawData?.marque || ""
  )
    .toLowerCase()
    .trim();
  return manufacturer.includes("synology") && hasQuickConnectConfigured(equipment);
}

/**
 * Boutons de connexion rapide pour un matériel lié à un ticket.
 * N'affiche que les actions déjà paramétrées sur le périphérique.
 */
export default function TicketLinkedEquipmentQuickActions({ equipment, locale }) {
  const actions = useMemo(() => getEquipmentPageCopy(locale).actions, [locale]);

  if (!equipment) return null;

  const showQuickConnect = canShowQuickConnect(equipment) && hasQuickConnectConfigured(equipment);
  const showRemote = supportsRemoteAccess(equipment) && hasRemoteAccessConfigured(equipment);
  const showServerRemote = canShowServerRemote(equipment) && hasServerRemoteAccessConfigured(equipment);

  if (!showQuickConnect && !showRemote && !showServerRemote) return null;

  const serverRemote = showServerRemote ? readServerRemoteAccess(equipment) : null;
  const serverRemoteDef = serverRemote ? getServerRemoteAccessSolutionDef(serverRemote.solution) : null;

  return (
    <span className={styles.chipQuickActions} onClick={e => e.stopPropagation()}>
      {showQuickConnect ? (
        <button
          type="button"
          className={styles.chipQuickBtn}
          title={interpolate(actions.quickConnectOpen, { value: getQuickConnectValue(equipment) })}
          aria-label={actions.quickConnect}
          onClick={e => {
            e.preventDefault();
            e.stopPropagation();
            openQuickConnectUrl(equipment);
          }}
        >
          <Icon icon={EQUIPMENT_REMOTE_ACTION_ICON} width={14} height={14} aria-hidden />
        </button>
      ) : null}
      {showRemote ? (
        <button
          type="button"
          className={styles.chipQuickBtn}
          title={interpolate(actions.remoteAccessWithUrl, {
            label: getEquipmentRemoteAccessLabel(locale, true),
            url: getRemoteAccessUrl(equipment)
          })}
          aria-label={getEquipmentRemoteAccessLabel(locale, true)}
          onClick={e => {
            e.preventDefault();
            e.stopPropagation();
            openRemoteAccess(equipment);
          }}
        >
          <Icon icon={EQUIPMENT_REMOTE_ACTION_ICON} width={14} height={14} aria-hidden />
        </button>
      ) : null}
      {showServerRemote ? (
        <button
          type="button"
          className={styles.chipQuickBtn}
          title={interpolate(actions.serverRemoteTooltip, {
            label: serverRemoteDef?.label || actions.serverRemote,
            id: serverRemote.id
          })}
          aria-label={actions.serverRemote}
          onClick={e => {
            e.preventDefault();
            e.stopPropagation();
            openServerRemoteAccess(equipment);
          }}
        >
          <Icon icon={serverRemoteDef?.icon || EQUIPMENT_REMOTE_ACTION_ICON} width={14} height={14} aria-hidden />
        </button>
      ) : null}
    </span>
  );
}
