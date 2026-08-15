import { useMemo } from "react";
import { Icon } from "@iconify/react";
import { toast } from "react-toastify";
import { interpolate } from "../../i18n/translate";
import EmbeddedEquipmentActionsMenu from "../EquipementPage/EmbeddedEquipmentActionsMenu";
import { getEquipmentPageCopy, getEquipmentRemoteAccessLabel } from "../EquipementPage/equipmentPageI18n";
import { supportsRemoteAccess, hasRemoteAccessConfigured, getRemoteAccessUrl, openRemoteAccess, EQUIPMENT_REMOTE_ACTION_ICON } from "../EquipementPage/equipmentRemoteAccessUtils";
import { getServerRemoteAccessActionIcon, getServerRemoteAccessSolutionDef, hasServerRemoteAccessConfigured, openServerRemoteAccess, readServerRemoteAccess } from "../EquipementPage/constants/serverRemoteAccessUtils";
import { isSynologyStorage, hasQuickConnectConfigured, getQuickConnectValue, openQuickConnectUrl } from "../EquipementPage/synologyEquipmentUtils";
import eq from "../EquipementPage/EquipmentPage.module.css";

function canShowServerRemoteButton(equipment) {
  const type = String(equipment?.type || "").toLowerCase();
  return type === "serveurs" || type === "serveur" || type === "servers" || type === "server";
}

function canShowQuickConnectButton(equipment) {
  return (equipment?.type === "NAS" || equipment?.type === "Storage" || equipment?.type === "Stockage") && isSynologyStorage(equipment);
}

function buildSharePayload(equipment, actions) {
  const name = String(equipment?.name || "").trim() || "Equipment";
  const type = String(equipment?.type || "").trim();
  const client = String(equipment?.clientName || "").trim();
  const ip = String(equipment?.ip || "").trim();
  const serial = String(equipment?.serial || "").trim();
  const location = String(equipment?.location || "").trim();
  const lines = [`Equipment: ${name}`, type ? `Type: ${type}` : null, client ? `Client: ${client}` : null, location ? `Site: ${location}` : null, ip ? `IP: ${ip}` : null, serial ? `S/N: ${serial}` : null].filter(Boolean);
  return {
    title: interpolate(actions.sharePayloadTitle, {
      name
    }),
    text: lines.join("\n")
  };
}

async function copyToClipboard(text, label) {
  const raw = String(text || "").trim();
  if (!raw) return;
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(raw);
    } else {
      const textarea = document.createElement("textarea");
      textarea.value = raw;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }
    toast.success(`${label} copied`, {
      position: "bottom-right"
    });
  } catch {
    toast.error(`Unable to copy ${label.toLowerCase()}`, {
      position: "bottom-right"
    });
  }
}

export default function InventoryEquipmentActions({
  equipment,
  locale,
  menuKey,
  openMenuKey,
  onOpenChange,
  onOpen
}) {
  const actions = useMemo(() => getEquipmentPageCopy(locale).actions, [locale]);
  const menuItems = useMemo(() => {
    const items = [{
      id: "open",
      icon: "mdi:open-in-new",
      label: actions.openSheet,
      onClick: () => onOpen?.(equipment)
    }];
    if (canShowQuickConnectButton(equipment)) {
      const configured = hasQuickConnectConfigured(equipment);
      const value = getQuickConnectValue(equipment);
      items.push({
        id: "quickconnect",
        icon: EQUIPMENT_REMOTE_ACTION_ICON,
        label: configured ? interpolate(actions.quickConnectWithValue, {
          value
        }) : actions.quickConnectNotConfigured,
        disabled: !configured,
        active: configured,
        onClick: () => openQuickConnectUrl(equipment)
      });
    }
    if (supportsRemoteAccess(equipment) && hasRemoteAccessConfigured(equipment)) {
      const accessUrl = getRemoteAccessUrl(equipment);
      const accessLabel = getEquipmentRemoteAccessLabel(locale, true);
      items.push({
        id: "remote-access",
        icon: EQUIPMENT_REMOTE_ACTION_ICON,
        label: interpolate(actions.remoteAccessWithUrl, {
          label: accessLabel,
          url: accessUrl
        }),
        active: true,
        onClick: () => openRemoteAccess(equipment)
      });
    }
    if (canShowServerRemoteButton(equipment)) {
      const configured = hasServerRemoteAccessConfigured(equipment);
      const {
        id
      } = readServerRemoteAccess(equipment);
      items.push({
        id: "server-remote",
        icon: EQUIPMENT_REMOTE_ACTION_ICON,
        label: configured ? interpolate(actions.serverRemoteWithId, {
          label: actions.serverRemote,
          id
        }) : interpolate(actions.serverRemoteMenuNotConfigured, {
          label: actions.serverRemote
        }),
        disabled: !configured,
        active: configured,
        onClick: () => openServerRemoteAccess(equipment)
      });
    }
    items.push({
      type: "divider"
    }, {
      id: "copy",
      icon: "mdi:content-copy",
      label: actions.copySheet,
      onClick: () => {
        const payload = buildSharePayload(equipment, actions);
        copyToClipboard(payload.text, actions.copySheetToast);
      }
    }, {
      id: "share",
      icon: "mdi:share-variant",
      label: actions.shareSheet,
      onClick: async () => {
        const payload = buildSharePayload(equipment, actions);
        try {
          if (navigator?.share) {
            await navigator.share({
              title: payload.title,
              text: payload.text
            });
          } else {
            copyToClipboard(payload.text, actions.copySheetToast);
          }
        } catch {}
      }
    });
    return items;
  }, [actions, equipment, locale, onOpen]);

  const showQuickConnect = canShowQuickConnectButton(equipment);
  const quickConnectReady = showQuickConnect && hasQuickConnectConfigured(equipment);
  const showRemote = supportsRemoteAccess(equipment) && hasRemoteAccessConfigured(equipment);
  const showServerRemote = canShowServerRemoteButton(equipment);
  const serverRemoteReady = showServerRemote && hasServerRemoteAccessConfigured(equipment);
  const serverRemote = readServerRemoteAccess(equipment);
  const serverRemoteDef = getServerRemoteAccessSolutionDef(serverRemote.solution);
  const serverRemoteTitle = serverRemoteReady ? interpolate(actions.serverRemoteTooltip, {
    label: serverRemoteDef?.label || actions.serverRemote,
    id: serverRemote.id
  }) : actions.serverRemoteNotConfigured;

  return <div className={eq.embeddedRowActions} onClick={e => e.stopPropagation()}>
      {showQuickConnect ? <button type="button" className={`${eq.embeddedQuickActionButton} ${quickConnectReady ? eq.embeddedQuickActionButtonRemoteActive : ""}`} title={quickConnectReady ? interpolate(actions.quickConnectOpen, {
      value: getQuickConnectValue(equipment)
    }) : actions.quickConnectMissing} aria-label={actions.quickConnect} disabled={!quickConnectReady} onClick={e => {
      e.stopPropagation();
      openQuickConnectUrl(equipment);
    }}>
          <Icon icon={EQUIPMENT_REMOTE_ACTION_ICON} width={16} height={16} />
        </button> : null}
      {showRemote ? <button type="button" className={`${eq.embeddedQuickActionButton} ${eq.embeddedQuickActionButtonRemoteActive}`} title={interpolate(actions.remoteAccessWithUrl, {
      label: getEquipmentRemoteAccessLabel(locale, true),
      url: getRemoteAccessUrl(equipment)
    })} aria-label={getEquipmentRemoteAccessLabel(locale, true)} onClick={e => {
      e.stopPropagation();
      openRemoteAccess(equipment);
    }}>
          <Icon icon={EQUIPMENT_REMOTE_ACTION_ICON} width={16} height={16} />
        </button> : null}
      {showServerRemote ? <button type="button" className={`${eq.embeddedQuickActionButton} ${serverRemoteReady ? eq.embeddedQuickActionButtonRemoteActive : ""}`} title={serverRemoteTitle} aria-label={actions.serverRemote} disabled={!serverRemoteReady} onClick={e => {
      e.stopPropagation();
      openServerRemoteAccess(equipment);
    }}>
          <Icon icon={getServerRemoteAccessActionIcon()} width={16} height={16} />
        </button> : null}
      <EmbeddedEquipmentActionsMenu menuKey={menuKey} openMenuKey={openMenuKey} onOpenChange={onOpenChange} items={menuItems} />
    </div>;
}
