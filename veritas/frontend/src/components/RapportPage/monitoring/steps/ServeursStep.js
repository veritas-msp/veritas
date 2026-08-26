import React from "react";
import { Icon } from "@iconify/react";
import InfrastructureEquipmentTable from "../InfrastructureEquipmentTable";
import equipmentStyles from "../../../EquipementPage/EquipmentPage.module.css";
import { getExpirationStatus, getExpirationStatusColor } from "../../../EquipementPage/constants/firewallLicenceUtils";
import { getCheckMKCachedData } from "../checkmkReportCacheUtils";
import { formatPercent } from "../supervisionReportBuilder";

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

function resolveServerAvailability(srv, equipmentCheckMKData) {
  const key = srv?.id != null ? String(srv.id) : null;
  const cached = getCheckMKCachedData(equipmentCheckMKData, srv, key);
  const availability = cached?.availability || null;
  const hostUp = availability != null && typeof availability.up === "number" ? availability.up : null;
  const eventsCount = Array.isArray(cached?.events) ? cached.events.length : 0;
  const servicesCount = Array.isArray(cached?.services) ? cached.services.length : 0;
  const criticalServices = Array.isArray(cached?.services)
    ? cached.services.filter(s => Number(s?.state) >= 2).length
    : 0;
  return { hostUp, eventsCount, servicesCount, criticalServices, synced: Boolean(cached) };
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
    {
      id: "dispoHote",
      label: "Dispo. hôte",
      render: srv => {
        const { hostUp, synced } = resolveServerAvailability(srv, equipmentCheckMKData);
        if (!synced) return <span style={{ color: "#9ca3af" }}>Non sync.</span>;
        if (hostUp == null) return "—";
        const color = hostUp < 95 ? "#dc2626" : hostUp < 99 ? "#ea580c" : "#16a34a";
        return (
          <span style={{ color, fontWeight: 600 }} title="Disponibilité hôte sur la période">
            {formatPercent(hostUp)}
          </span>
        );
      }
    },
    {
      id: "services",
      label: "Services",
      render: srv => {
        const { servicesCount, criticalServices, synced } = resolveServerAvailability(srv, equipmentCheckMKData);
        if (!synced) return "—";
        if (servicesCount === 0) return "0";
        const color = criticalServices > 0 ? "#dc2626" : "#16a34a";
        return (
          <span style={{ color, fontWeight: 500 }} title="Services dérivés des événements période">
            {servicesCount - criticalServices}/{servicesCount} OK
          </span>
        );
      }
    },
    {
      id: "events",
      label: "Événements",
      render: srv => {
        const { eventsCount, synced } = resolveServerAvailability(srv, equipmentCheckMKData);
        if (!synced) return "—";
        const color = eventsCount >= 5 ? "#dc2626" : eventsCount > 0 ? "#ea580c" : "#16a34a";
        return <span style={{ color, fontWeight: 500 }}>{eventsCount}</span>;
      }
    },
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
