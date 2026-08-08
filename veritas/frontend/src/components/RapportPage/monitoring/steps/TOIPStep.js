import React from "react";
import InfrastructureEquipmentTable from "../InfrastructureEquipmentTable";
export default function TOIPStep({
  client,
  onOpenComments,
  onTicketCreatedForEquipment,
  onOpenCheckMKDetail,
  onSyncCheckMK,
  commentCounts,
  ticketCounts,
  highlightedEquipmentKey,
  reportPeriod,
  monitoringSyncStatus,
  syncingEquipmentKey
}) {
  const rawTOIP = client?.equipements?.TOIP;
  let solutions = [];
  if (Array.isArray(rawTOIP)) {
    solutions = rawTOIP;
  } else if (rawTOIP && Array.isArray(rawTOIP.solutions)) {
    solutions = rawTOIP.solutions;
  }
  const columns = [{
    id: "name",
    label: "Solution",
    render: sol => sol.logiciel || sol.nom || "Solution TOIP"
  }, {
    id: "site",
    label: "Site",
    render: sol => sol.site || "-"
  }];
  return <InfrastructureEquipmentTable title="TOIP / VOIP" moduleKey="TOIP" equipments={solutions} columns={columns} onOpenComments={onOpenComments} onCreateTicket={onTicketCreatedForEquipment} onOpenCheckMKDetail={onOpenCheckMKDetail} clientId={client?.id ?? client?.uuid} onSyncCheckMK={onSyncCheckMK} syncingEquipmentKey={syncingEquipmentKey} commentCounts={commentCounts} ticketCounts={ticketCounts} highlightedEquipmentKey={highlightedEquipmentKey} reportPeriod={reportPeriod} monitoringSyncStatus={monitoringSyncStatus} />;
}
