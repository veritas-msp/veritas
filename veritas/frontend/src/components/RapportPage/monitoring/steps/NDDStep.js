import React from "react";
import { Icon } from "@iconify/react";
import InfrastructureEquipmentTable from "../InfrastructureEquipmentTable";
function formatExpiration(raw) {
  if (!raw) return "-";
  try {
    const d = new Date(raw);
    return Number.isNaN(d.getTime()) ? String(raw) : d.toLocaleDateString("en-US");
  } catch {
    return String(raw);
  }
}
function getDomainName(domaine) {
  return domaine?.nom || domaine?.name || domaine?.fqdn || "";
}
export default function NDDStep({
  client,
  onOpenComments,
  onTicketCreatedForEquipment,
  commentCounts,
  ticketCounts,
  alertCounts,
  highlightedEquipmentKey
}) {
  const clientId = client?.id ?? client?.uuid;
  const domaines = Array.isArray(client?.equipements?.NDD) ? client.equipements.NDD : [];
  const columns = [{
    id: "name",
    label: "Domain name",
    render: domaine => {
      const name = getDomainName(domaine) || "-";
      return <span style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.35rem"
      }}>
            <Icon icon="mdi:web" width={18} height={18} />
            {name}
          </span>;
    }
  }, {
    id: "role",
    label: "Role",
    render: domaine => domaine.role || domaine.type || "-"
  }, {
    id: "expiration",
    label: "Expiration",
    render: domaine => formatExpiration(domaine.expiration || domaine.expirationDate)
  }, {
    id: "registrar",
    label: "Registrar / fournisseur",
    render: domaine => domaine.registrar || domaine.registrarName || domaine.provider || "-"
  }];
  return <InfrastructureEquipmentTable title="Domain names" moduleKey="NDD" equipments={domaines} columns={columns} onOpenComments={onOpenComments} onCreateTicket={onTicketCreatedForEquipment} clientId={clientId} commentCounts={commentCounts} ticketCounts={ticketCounts} alertCounts={alertCounts} highlightedEquipmentKey={highlightedEquipmentKey} showSearch={false} externalLink={{
    url: "https://www.ovh.com/manager/#/web/domain",
    title: "Open l'espace domaines OVH"
  }} />;
}
