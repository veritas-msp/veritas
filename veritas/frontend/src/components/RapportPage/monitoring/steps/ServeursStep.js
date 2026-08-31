import React from "react";
import { Icon } from "@iconify/react";
import InfrastructureEquipmentTable from "../InfrastructureEquipmentTable";
import equipmentStyles from "../../../EquipementPage/EquipmentPage.module.css";
import { getExpirationStatus, getExpirationStatusColor } from "../../../EquipementPage/constants/firewallLicenceUtils";
import { buildHaColumn } from "../reportHaColumn";

function formatDateFr(value) {
  if (!value) return "-";
  try {
    const iso = String(value).trim();
    if (!iso) return "-";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch (e) {
    return String(value);
  }
}

function ExpirationDateCell({ value }) {
  const label = formatDateFr(value);
  if (!label || label === "-") return "-";
  const status = getExpirationStatus(value);
  const color = getExpirationStatusColor(status);
  if (!color) return label;
  return (
    <span style={{ color, fontWeight: 500 }}>
      {label}
    </span>
  );
}

function isVirtualServer(srv) {
  const type = (srv?.type || srv?.typeServer || "").toLowerCase();
  return type === "virtuel" || type === "virtual";
}

function isPhysicalServer(srv) {
  return !isVirtualServer(srv);
}

function formatRoles(roles) {
  if (!Array.isArray(roles)) {
    if (typeof roles === "string" && roles.trim()) return roles;
    return "-";
  }
  if (roles.length === 0) return "-";
  return roles.join(", ");
}

function getOsIconName(osLabel) {
  if (!osLabel || osLabel === "-") return null;
  const lower = String(osLabel).toLowerCase();
  if (lower.includes("windows") || lower.includes("hyper-v") || lower.includes("microsoft")) {
    return "mdi:windows";
  }
  if (
    lower.includes("linux") ||
    lower.includes("ubuntu") ||
    lower.includes("debian") ||
    lower.includes("centos") ||
    lower.includes("rhel") ||
    lower.includes("red hat") ||
    lower.includes("suse") ||
    lower.includes("fedora") ||
    lower.includes("stream")
  ) {
    return "mdi:linux";
  }
  return null;
}

export default function ServersStep({
  client,
  onOpenComments,
  onTicketCreatedForEquipment,
  onOpenCheckMKDetail,
  onSyncCheckMK,
  onEditEquipment,
  commentCounts,
  ticketCounts,
  alertCounts,
  highlightedEquipmentKey,
  reportPeriod,
  monitoringSyncStatus,
  equipmentCheckMKData = {},
  syncingEquipmentKey
}) {
  const serveurs = Array.isArray(client?.equipements?.Serveurs)
    ? client.equipements.Serveurs
    : Array.isArray(client?.equipements?.Servers)
      ? client.equipements.Servers
      : [];

  const columns = [
    {
      id: "name",
      label: "Nom",
      render: srv => {
        const isVirtual = isVirtualServer(srv);
        const name = srv.nom || srv.name || "Serveur sans nom";
        return (
          <div className={equipmentStyles.nameCell}>
            <Icon
              icon={isVirtual ? "mdi:cube-outline" : "mdi:server"}
              className={equipmentStyles.typeIconSmall}
              width={16}
              height={16}
            />
            <span className={equipmentStyles.internetCellBold}>{name}</span>
          </div>
        );
      }
    },
    {
      id: "location",
      label: "Site",
      render: srv => srv.site || srv.location || "-"
    },
    {
      id: "ip",
      label: "IP",
      render: srv => srv.ip || srv.fqdn || "-"
    },
    {
      id: "systeme",
      label: "OS",
      render: srv => {
        const osLabel = srv.systeme || srv.os || "-";
        const icon = getOsIconName(osLabel);
        if (!icon || osLabel === "-") return osLabel;
        return (
          <div className={equipmentStyles.nameCell}>
            <Icon icon={icon} width={18} height={18} />
            <span>{osLabel}</span>
          </div>
        );
      }
    },
    buildHaColumn(serveurs, "Servers"),
    {
      id: "processeur",
      label: "Proc.",
      render: srv => srv.processeur || srv.vcpu || srv.vCpu || "-"
    },
    {
      id: "memoire",
      label: "RAM",
      render: srv => srv.memoire || srv.ram || "-"
    },
    {
      id: "expirationGarantie",
      label: "Garantie",
      render: srv => {
        if (!isPhysicalServer(srv)) return "-";
        return <ExpirationDateCell value={srv.expirationGarantie || srv.garantie} />;
      }
    },
    {
      id: "role",
      label: "Rôles",
      render: srv => formatRoles(srv.role)
    }
  ];

  return (
    <InfrastructureEquipmentTable
      title="Serveurs"
      moduleKey="Servers"
      equipments={serveurs}
      columns={columns}
      onOpenComments={onOpenComments}
      onCreateTicket={onTicketCreatedForEquipment}
      onOpenCheckMKDetail={onOpenCheckMKDetail}
      clientId={client?.id ?? client?.uuid}
      onSyncCheckMK={onSyncCheckMK}
      syncingEquipmentKey={syncingEquipmentKey}
      commentCounts={commentCounts}
      ticketCounts={ticketCounts}
      alertCounts={alertCounts}
      highlightedEquipmentKey={highlightedEquipmentKey}
      reportPeriod={reportPeriod}
      monitoringSyncStatus={monitoringSyncStatus}
      equipmentCheckMKData={equipmentCheckMKData}
      onEditEquipment={onEditEquipment}
    />
  );
}
