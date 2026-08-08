import React from "react";
import { Icon } from "@iconify/react";
import InfrastructureEquipmentTable from "../InfrastructureEquipmentTable";
import equipmentStyles from "../../../EquipementPage/EquipmentPage.module.css";
import { formatDateFr as formatMaintenanceDateFr, getExpirationStatus, getExpirationStatusColor, getMaintenanceLicenseExpiration } from "../../../EquipementPage/constants/firewallLicenceUtils";
function formatDateFr(value) {
  if (!value) return "-";
  try {
    const iso = String(value).trim();
    if (!iso) return "-";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) {
      return iso;
    }
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch (e) {
    return String(value);
  }
}
function ExpirationDateCell({
  value,
  formatFn = formatDateFr
}) {
  const label = formatFn(value);
  if (!label || label === "-") return "-";
  const status = getExpirationStatus(value);
  const color = getExpirationStatusColor(status);
  if (!color) return label;
  return <span style={{
    color,
    fontWeight: 500
  }}>{label}</span>;
}
function normalizeFirewall(fw) {
  if (!fw) return fw;
  if (fw.data && typeof fw.data === "object") {
    const {
      id: _dataId,
      ...rest
    } = fw.data;
    return {
      id: fw.id,
      ...rest,
      nom: fw.data.nom ?? fw.name ?? fw.item_key ?? "",
      name: fw.data.nom ?? fw.name ?? fw.item_key ?? "",
      location: fw.data.site ?? fw.data.location ?? "",
      site: fw.data.site ?? fw.data.location ?? "",
      manufacturer: fw.data.fabricant ?? fw.data.marque ?? "",
      model: fw.data.modele ?? "",
      serial: fw.data.numeroSerie ?? fw.data.sn ?? "",
      is_active: fw.is_active,
      checkmk_host_name: fw.checkmk_host_name ?? null,
      checkmk_site: fw.checkmk_site ?? null,
      checkmk_service_name: fw.checkmk_service_name ?? null
    };
  }
  return {
    ...fw,
    name: fw.nom ?? fw.name ?? "",
    location: fw.site ?? fw.location ?? "",
    manufacturer: fw.fabricant ?? fw.marque ?? "",
    model: fw.modele ?? "",
    serial: fw.numeroSerie ?? fw.sn ?? ""
  };
}
export default function FirewallStep({
  client,
  onOpenComments,
  onTicketCreatedForEquipment,
  onOpenCheckMKDetail,
  onSyncCheckMK,
  onEditEquipment,
  commentCounts,
  ticketCounts,
  highlightedEquipmentKey,
  reportPeriod,
  monitoringSyncStatus,
  syncingEquipmentKey
}) {
  const raw = Array.isArray(client?.equipements?.Firewalls) ? client.equipements.Firewalls : [];
  const firewalls = raw.map(normalizeFirewall);
  const columns = [{
    id: "name",
    label: "Name",
    render: fw => <div className={equipmentStyles.nameCell}>
          <Icon icon="mdi:shield-outline" className={equipmentStyles.typeIconSmall} width={16} height={16} />
          <span className={equipmentStyles.internetCellBold}>
            {fw.name || fw.nom || "-"}
          </span>
        </div>
  }, {
    id: "location",
    label: "Site",
    render: fw => fw.location || fw.site || "-"
  }, {
    id: "ip",
    label: "IP address",
    render: fw => fw.ip || "-"
  }, {
    id: "vlan",
    label: "Vlan",
    render: fw => fw.vlan || "-"
  }, {
    id: "manufacturer",
    label: "Marque",
    render: fw => fw.manufacturer || fw.fabricant || fw.marque || "-"
  }, {
    id: "model",
    label: "Model",
    render: fw => <span className={equipmentStyles.internetCellBold}>
          {fw.model || fw.modele || "-"}
        </span>
  }, {
    id: "serial",
    label: "SN",
    render: fw => fw.serial || fw.numeroSerie || fw.sn || "-"
  }, {
    id: "firmware",
    label: "Firmware",
    render: fw => fw.firmware || "-"
  }, {
    id: "expirationGarantie",
    label: "Date de garantie",
    render: fw => <ExpirationDateCell value={fw.expirationGarantie || fw.garantie} />
  }, {
    id: "maintenanceLicense",
    label: "Maintenance license date",
    render: fw => <ExpirationDateCell value={getMaintenanceLicenseExpiration(fw.licences)} formatFn={v => formatMaintenanceDateFr(v) || "-"} />
  }];
  return <InfrastructureEquipmentTable title="Firewalls" moduleKey="Firewall" equipments={firewalls} columns={columns} onOpenComments={onOpenComments} onCreateTicket={onTicketCreatedForEquipment} onOpenCheckMKDetail={onOpenCheckMKDetail} clientId={client?.id ?? client?.uuid} onSyncCheckMK={onSyncCheckMK} syncingEquipmentKey={syncingEquipmentKey} commentCounts={commentCounts} ticketCounts={ticketCounts} highlightedEquipmentKey={highlightedEquipmentKey} reportPeriod={reportPeriod} monitoringSyncStatus={monitoringSyncStatus} onEditEquipment={onEditEquipment} />;
}
