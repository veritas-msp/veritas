import React from "react";
import { Icon } from "@iconify/react";
import InfrastructureEquipmentTable from "../InfrastructureEquipmentTable";
import equipmentStyles from "../../../EquipementPage/EquipmentPage.module.css";
export default function SwitchStep({
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
  const switches = Array.isArray(client?.equipements?.Switch) ? client.equipements.Switch : [];
  const columns = [{
    id: "name",
    label: "Name",
    render: sw => <div className={equipmentStyles.nameCell}>
          <Icon icon="mdi:lan" className={equipmentStyles.typeIconSmall} width={16} height={16} />
          <span className={equipmentStyles.internetCellBold}>
            {sw.nom || sw.name || "Switch sans nom"}
          </span>
        </div>
  }, {
    id: "location",
    label: "Site",
    render: sw => sw.site || sw.location || "-"
  }, {
    id: "ip",
    label: "IP address",
    render: sw => sw.ip || sw.fqdn || "-"
  }, {
    id: "vlan",
    label: "VLAN",
    render: sw => sw.vlan || "-"
  }, {
    id: "manufacturer",
    label: "Marque",
    render: sw => sw.fabricant || sw.marque || "-"
  }, {
    id: "model",
    label: "Model",
    render: sw => <span className={equipmentStyles.internetCellBold}>{sw.modele || "-"}</span>
  }, {
    id: "serial",
    label: "SN",
    render: sw => sw.numeroSerie || sw.sn || "-"
  }, {
    id: "firmware",
    label: "Firmware",
    render: sw => sw.firmware || "-"
  }, {
    id: "mac",
    label: "Adresse Mac",
    render: sw => sw.adresseMac || sw.mac || "-"
  }];
  return <InfrastructureEquipmentTable title="Switches" moduleKey="Switch" equipments={switches} columns={columns} onOpenComments={onOpenComments} onCreateTicket={onTicketCreatedForEquipment} onOpenCheckMKDetail={onOpenCheckMKDetail} clientId={client?.id ?? client?.uuid} onSyncCheckMK={onSyncCheckMK} syncingEquipmentKey={syncingEquipmentKey} onEditEquipment={onEditEquipment} commentCounts={commentCounts} ticketCounts={ticketCounts} highlightedEquipmentKey={highlightedEquipmentKey} reportPeriod={reportPeriod} monitoringSyncStatus={monitoringSyncStatus} />;
}
