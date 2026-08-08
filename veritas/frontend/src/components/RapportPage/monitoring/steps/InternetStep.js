import React from "react";
import { Icon } from "@iconify/react";
import InfrastructureEquipmentTable from "../InfrastructureEquipmentTable";
import equipmentStyles from "../../../EquipementPage/EquipmentPage.module.css";
import { formatInternetIpDisplay } from "../internetIpUtils";
import { formatInternetDebitDisplay } from "../../../EquipementPage/internetConnectionUtils";
function getInternetConnectionIcon(item) {
  const type = (item?.type || "").toLowerCase();
  const nom = (item?.nom || item?.name || "").toLowerCase();
  const fournisseur = (item?.fournisseur || item?.operateur || "").toLowerCase();
  const combined = `${type} ${nom} ${fournisseur}`;
  const commonStyle = {
    color: "var(--text-muted, #9ca3af)",
    verticalAlign: "middle",
    display: "inline-block",
    width: 16,
    height: 16
  };
  if (type.includes("fibre") || type.includes("fiber") || combined.includes("fibre")) {
    return <Icon icon="streamline-ultimate:fiber-access-1" width={16} height={16} style={commonStyle} />;
  }
  if (type.includes("5g") || combined.includes("5g")) {
    return <Icon icon="material-symbols:5g-mobiledata-badge" width={16} height={16} style={commonStyle} />;
  }
  if (type.includes("4g") || combined.includes("4g") || type.includes("lte")) {
    return <Icon icon="material-symbols:4g-mobiledata-badge" width={16} height={16} style={commonStyle} />;
  }
  if (type.includes("adsl") || combined.includes("adsl") || type.includes("dsl")) {
    return <Icon icon="mdi:ethernet-cable" width={16} height={16} style={commonStyle} />;
  }
  if (type.includes("satellite") || combined.includes("satellite")) {
    return <Icon icon="tabler:satellite" width={16} height={16} style={commonStyle} />;
  }
  if (type.includes("liaison")) {
    return <Icon icon="mdi:lan" width={16} height={16} style={commonStyle} />;
  }
  return <Icon icon="mdi:router-wireless" width={16} height={16} style={commonStyle} />;
}
export default function InternetStep({
  client,
  onOpenComments,
  onTicketCreatedForEquipment,
  onEditEquipment,
  commentCounts,
  ticketCounts,
  highlightedEquipmentKey,
  reportPeriod
}) {
  const connexions = Array.isArray(client?.equipements?.Internet) ? client.equipements.Internet : [];
  const columns = [{
    id: "name",
    label: "Name",
    render: item => <div className={equipmentStyles.nameCell}>
          {getInternetConnectionIcon(item)}
          <span className={equipmentStyles.internetCellBold}>
            {item.nom || item.name || "-"}
          </span>
        </div>
  }, {
    id: "location",
    label: "Site",
    render: item => item.site || item.location || "-"
  }, {
    id: "ip",
    label: "IP address",
    render: item => formatInternetIpDisplay(item)
  }, {
    id: "internetType",
    label: "Type de connexion",
    render: item => item.type || "-"
  }, {
    id: "fournisseur",
    label: "Fournisseur",
    render: item => <span className={equipmentStyles.internetCellBold}>
          {item.fournisseur || item.operateur || "-"}
        </span>
  }, {
    id: "debit",
    label: "Bandwidth",
    render: item => formatInternetDebitDisplay(item) || item.debit || item.bandwidth || "-"
  }, {
    id: "categorie",
    label: "Category",
    render: item => item.categorie || "-"
  }];
  return <InfrastructureEquipmentTable title="Internet connections" moduleKey="Internet" equipments={connexions} columns={columns} onOpenComments={onOpenComments} onCreateTicket={onTicketCreatedForEquipment} clientId={client?.id ?? client?.uuid} commentCounts={commentCounts} ticketCounts={ticketCounts} highlightedEquipmentKey={highlightedEquipmentKey} reportPeriod={reportPeriod} onEditEquipment={onEditEquipment} />;
}
