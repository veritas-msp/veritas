import React from "react";
import { Icon } from "@iconify/react";
import InfrastructureEquipmentTable from "../InfrastructureEquipmentTable";
import equipmentStyles from "../../../EquipementPage/EquipmentPage.module.css";
export default function BorneWifiStep({
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
  equipmentCheckMKData,
  syncingEquipmentKey
}) {
  const bornes = Array.isArray(client?.equipements?.BorneWifi) ? client.equipements.BorneWifi : [];
  const columns = [{
    id: "name",
    label: "Nom",
    render: ap => <div className={equipmentStyles.nameCell}>
          <Icon icon="mdi:wifi" className={equipmentStyles.typeIconSmall} width={16} height={16} />
          <span className={equipmentStyles.internetCellBold}>
            {ap.nom || ap.name || "Borne sans nom"}
          </span>
        </div>
  }, {
    id: "location",
    label: "Site",
    render: ap => ap.site || ap.location || "-"
  }, {
    id: "ip",
    label: "IP",
    render: ap => ap.ip || ap.fqdn || "-"
  }, {
    id: "vlan",
    label: "VLAN",
    render: ap => ap.vlan || "-"
  }, {
    id: "manufacturer",
    label: "Marque",
    render: ap => ap.fabricant || ap.marque || "-"
  }, {
    id: "model",
    label: "Modèle",
    render: ap => <span className={equipmentStyles.internetCellBold}>{ap.modele || "-"}</span>
  }, {
    id: "serial",
    label: "SN",
    render: ap => ap.numeroSerie || ap.sn || "-"
  }, {
    id: "firmware",
    label: "Firmware",
    render: ap => ap.firmware || "-"
  }, {
    id: "mac",
    label: "MAC",
    render: ap => ap.adresseMac || ap.mac || "-"
  }];
  return <InfrastructureEquipmentTable title="Wi-Fi APs" moduleKey="BorneWifi" equipments={bornes} columns={columns} onOpenComments={onOpenComments} onCreateTicket={onTicketCreatedForEquipment} onOpenCheckMKDetail={onOpenCheckMKDetail} clientId={client?.id ?? client?.uuid} onSyncCheckMK={onSyncCheckMK} syncingEquipmentKey={syncingEquipmentKey} onEditEquipment={onEditEquipment} commentCounts={commentCounts} ticketCounts={ticketCounts} alertCounts={alertCounts} highlightedEquipmentKey={highlightedEquipmentKey} reportPeriod={reportPeriod} monitoringSyncStatus={monitoringSyncStatus} equipmentCheckMKData={equipmentCheckMKData} />;
}
