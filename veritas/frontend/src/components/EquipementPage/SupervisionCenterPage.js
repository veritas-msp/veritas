import BackupMspPanel from "./BackupMspPanel";
import MonitoringAlertRulesPanel from "./SupervisionAlertRulesPanel";
import { useSupervisionAlertRules } from "../../hooks/useSupervisionAlertRules";
import { isMonitoringCriterionEnabled } from "./supervisionAlertRulesConfig";
import { mergeRmmAgentRows, isRmmSyncPending, getRmmAgentOsDisplay } from "./rmmMonitoringUtils";
import { formatRelativeFrench } from "./checkmkMonitoringUtils";
import { getOsIconName } from "./osIconUtils";
import EmbeddedEquipmentActionsMenu from "./EmbeddedEquipmentActionsMenu";
import MspEmptyState from "../Misc/MspEmptyState/MspEmptyState";
import ProFeaturePromoModal from "../Misc/ProFeature/ProFeaturePromoModal";
import PageGuideTour from "../PageGuide/PageGuideTour";
import { getSupervisionCenterGuideSteps } from "../PageGuide/supervisionCenterGuideSteps";
import { useRegisterPageGuide } from "../../hooks/useRegisterPageGuide";
import { useAuthContext } from "../../contexts/AuthContext";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { getLocaleTag } from "../../i18n/locales";
import { interpolate } from "../../i18n/translate";
import { getSupervisionCenterCopy } from "./supervisionCenterPageI18n";
import { getBackupMspPanelCopy } from "./backupMspPanelI18n";
import { buildUnifiedSupervisionQueue, filterSupervisionQueue, countQueueBySeverity, countQueueByDomain, mergeQueueWithAlertState, countQueueByWorkflow } from "./supervisionQueueUtils";
import SupervisionOpsQueue from "./SupervisionOpsQueue";
import SupervisionAlertHistory from "./SupervisionAlertHistory";
import PlanningEventModalBridge from "../PlanningPage/PlanningEventModalBridge";
import {
  ackSupervisionAlert,
  dismissSupervisionAlert,
  fetchSupervisionAlertStates,
  fetchSupervisionAlertsHistory,
  linkSupervisionAlert,
  resolveSupervisionAlert,
  subscribeSupervisionAlertStream
} from "../../api/supervisionAlerts";
import { toast } from "react-toastify";
import { fetchHomeDashboard } from "../../api/stats";
import { fetchRmmAgents } from "../../api/rmm";
import { getEquipmentListKey } from "../../utils/equipmentIdentity";
import { Icon } from "@iconify/react";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import cyberStyles from "../CybersecuritePage/CybersecuritePage.module.css";
import layout from "../EnterprisesPage/EnterprisesPage.module.css";
import dashStyles from "../CybersecuritePage/AntivirusMspDashboard.module.css";
import SupportOrbitalBackground from "../Misc/ReportBugForm/SupportOrbitalBackground";
import styles from "./SupervisionCenterPage.module.css";
const TABS = [{
  id: "operations",
  label: "Operations",
  icon: "mdi:lightning-bolt"
}, {
  id: "fleet",
  label: "Fleet",
  icon: "mdi:devices"
}, {
  id: "history",
  label: "History",
  icon: "mdi:history"
}, {
  id: "settings",
  label: "Rules",
  icon: "mdi:bell-cog-outline"
}];
const CONTRACT_STATUS_META = {
  expired: {
    label: "Expired",
    className: styles.contractStatus_expired
  },
  expiring: {
    label: "Expiring soon",
    className: styles.contractStatus_expiring
  },
  suspended: {
    label: "Suspended",
    className: styles.contractStatus_suspended
  }
};
const LICENSE_MODULE_SECTIONS = [{
  module: "antivirus",
  label: "Antivirus",
  icon: "mdi:shield-search"
}, {
  module: "antispam",
  label: "Antispam",
  icon: "mdi:email-secure-outline"
}, {
  module: "domain",
  label: "Domain names",
  icon: "mdi:web"
}, {
  module: "ssl",
  label: "SSL certificates",
  icon: "mdi:certificate-outline"
}, {
  module: "licences",
  label: "Licenses & subscriptions",
  icon: "mdi:license"
}, {
  module: "o365",
  label: "Microsoft 365",
  icon: "mdi:microsoft"
}, {
  module: "backup",
  label: "Backups",
  icon: "mdi:backup-restore"
}, {
  module: "firewall",
  label: "Firewall",
  icon: "mdi:shield-outline"
}, {
  module: "toip",
  label: "VoIP",
  icon: "mdi:phone-voip"
}];
const CONTRACT_STATUS_CLASS = {
  expired: styles.contractStatus_expired,
  expiring: styles.contractStatus_expiring,
  suspended: styles.contractStatus_suspended
};
function buildContractAlertRows(alerts = [], licenseAlerts = [], copy) {
  const rows = [];
  const moduleSections = copy?.licenseModuleSections || LICENSE_MODULE_SECTIONS;
  for (const alert of Array.isArray(alerts) ? alerts : []) {
    rows.push({
      id: `contract-${alert.id}`,
      clientId: alert.id,
      clientName: alert.name,
      name: alert.name,
      subtitle: copy?.contractType?.msp || "Contrat MSP",
      type: copy?.contractType?.enterprise || "Company contract",
      typeKey: "contract",
      status: alert.status,
      expiration: alert.expiration,
      module: null
    });
  }
  for (const alert of Array.isArray(licenseAlerts) ? licenseAlerts : []) {
    const typeLabel = alert.moduleLabel || moduleSections.find(section => section.module === alert.module)?.label || alert.module || copy?.contractType?.license || "License";
    const detail = alert.label || typeLabel;
    rows.push({
      id: alert.id,
      clientId: alert.clientId,
      clientName: alert.clientName,
      name: alert.clientName || alert.label || typeLabel,
      subtitle: detail,
      type: typeLabel,
      typeKey: alert.module || "license",
      status: alert.status,
      expiration: alert.expiration,
      module: alert.module
    });
  }
  return rows;
}
function getContractAlertSortValue(row, key) {
  switch (key) {
    case "name":
      return (row.name || "").toLowerCase();
    case "type":
      return (row.type || "").toLowerCase();
    case "status":
      {
        const rank = {
          expired: 0,
          suspended: 1,
          expiring: 2
        };
        return rank[row.status] ?? 3;
      }
    case "expiration":
      {
        const time = row.expiration ? new Date(row.expiration).getTime() : Number.POSITIVE_INFINITY;
        return Number.isFinite(time) ? time : Number.POSITIVE_INFINITY;
      }
    default:
      return "";
  }
}
const CONTRACT_ALERTS_TABLE_COLUMNS = [{
  key: "name",
  label: "Name",
  sortable: true
}, {
  key: "type",
  label: "Type",
  sortable: true
}, {
  key: "status",
  label: "Status",
  sortable: true
}, {
  key: "expiration",
  label: "Expiration",
  sortable: true
}];
function ContractAlertStatusDot({
  status
}) {
  const dotClass = status === "expired" ? styles.contractStatusDot_expired : status === "suspended" ? styles.contractStatusDot_suspended : styles.contractStatusDot_expiring;
  return <span className={`${styles.rmmStatus} ${dotClass}`} aria-hidden />;
}
function ContractAlertsList({
  alerts,
  licenseAlerts = [],
  onNavigateClient,
  copy,
  formatDate,
  localeTag
}) {
  const [sort, setSort] = useState({
    key: "expiration",
    direction: "asc"
  });
  const rows = useMemo(() => buildContractAlertRows(alerts, licenseAlerts, copy), [alerts, licenseAlerts, copy]);
  const sortedRows = useMemo(() => {
    const direction = sort.direction === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => {
      const va = getContractAlertSortValue(a, sort.key);
      const vb = getContractAlertSortValue(b, sort.key);
      if (typeof va === "number" && typeof vb === "number") {
        return (va - vb) * direction;
      }
      return String(va).localeCompare(String(vb), localeTag || "en-US", {
        numeric: true
      }) * direction;
    });
  }, [rows, sort, localeTag]);
  const handleSort = key => {
    setSort(prev => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc"
    }));
  };
  if (rows.length === 0) {
    return <EmptyGood icon="mdi:file-check-outline" title={copy.contracts.okTitle} text={copy.contracts.okText} />;
  }
  const expiredCount = rows.filter(row => row.status === "expired").length;
  const expiringCount = rows.filter(row => row.status === "expiring").length;
  const tableColumns = copy.tableColumns || CONTRACT_ALERTS_TABLE_COLUMNS;
  return <div className={styles.contractAlertsFleet}>
      <div className={styles.rmmSummary}>
        <span className={styles.rmmSummaryItem}>
          <strong>{rows.length}</strong> {copy.formatAlertCount(rows.length)}
        </span>
        {expiredCount > 0 ? <span className={`${styles.rmmSummaryItem} ${styles.rmmSummaryBad}`}>
            <strong>{expiredCount}</strong> {copy.formatExpiredCount(expiredCount)}
          </span> : null}
        {expiringCount > 0 ? <span className={`${styles.rmmSummaryItem} ${styles.rmmSummaryWarn}`}>
            <strong>{expiringCount}</strong> {copy.formatExpiringCount(expiringCount)}
          </span> : null}
      </div>
      <div className={styles.rmmTableWrap}>
        <table className={styles.rmmTable}>
          <thead>
            <tr>
              {tableColumns.map(col => {
              const isSorted = sort.key === col.key;
              const sortMark = isSorted ? sort.direction === "asc" ? " ↑" : " ↓" : " ↕";
              return <th key={col.key} className={styles.rmmSortableTh} onClick={() => handleSort(col.key)} title={copy.formatSortBy(col.label)} aria-label={col.label}>
                    <span className={styles.rmmThContent}>
                      {col.label}
                      <span className={styles.rmmSortIndicator} aria-hidden>
                        {sortMark}
                      </span>
                    </span>
                  </th>;
            })}
              <th className={styles.rmmColActions} aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {sortedRows.map(row => {
            const statusMeta = copy.contractStatusMeta[row.status] || copy.contractStatusMeta.expiring;
            const statusClass = CONTRACT_STATUS_CLASS[statusMeta.classKey || row.status] || CONTRACT_STATUS_CLASS.expiring;
            return <tr key={row.id} className={styles.rmmTableRow}>
                  <td className={styles.rmmColHost}>
                    <div className={styles.rmmHostCell}>
                      <ContractAlertStatusDot status={row.status} />
                      <div className={styles.rmmHostBody}>
                        <span className={styles.rmmHost}>{row.name || "-"}</span>
                        {row.subtitle ? <span className={styles.rmmHostSub} title={row.subtitle}>
                            {row.subtitle}
                          </span> : null}
                      </div>
                    </div>
                  </td>
                  <td className={styles.contractColType}>{row.type || "-"}</td>
                  <td>
                    <span className={`${styles.contractStatus} ${statusClass}`}>
                      {statusMeta.label}
                    </span>
                  </td>
                  <td className={styles.contractColExpiration}>
                    {formatDate(row.expiration)}
                  </td>
                  <td className={styles.rmmColActions}>
                    <div className={styles.rmmRowActions}>
                      <button type="button" className={styles.rmmOpenEquipmentBtn} onClick={() => onNavigateClient?.({
                    id: row.clientId,
                    name: row.clientName,
                    module: row.module
                  })} title={copy.contracts.viewEnterprise} aria-label={copy.contracts.viewEnterprise}>
                        <Icon icon="mdi:open-in-new" aria-hidden />
                      </button>
                    </div>
                  </td>
                </tr>;
          })}
          </tbody>
        </table>
      </div>
    </div>;
}
function formatNumber(value) {
  if (value == null || Number.isNaN(Number(value))) return "0";
  return String(Math.round(Number(value)));
}
function EmptyGood({
  icon,
  title,
  text
}) {
  return <MspEmptyState icon={icon} title={title} text={text} />;
}
const PRIORITY_TREATMENT_HINTS = {
  monitor_critical: "Act on the CheckMK alert and restore the service.",
  monitor_warning: "Review the CheckMK warning before degradation.",
  agent_offline: "Check power, network and RMM agent service (offline for over 48 h).",
  unmapped: "Map the device to a CheckMK host from the hardware record.",
  no_data: "Check the CheckMK mapping and metric collection.",
  warranty_expired: "Renew or update the manufacturer warranty.",
  warranty_soon: "Plan the warranty renewal.",
  maintenance_expired: "Renew the firewall maintenance license.",
  maintenance_soon: "Plan the maintenance license renewal.",
  battery_expired: "Replace the UPS / PDU battery.",
  battery_soon: "Order or plan the battery replacement.",
  updates_pending: "Schedule Windows update installation.",
  disk_critical: "Free or expand disk space urgently.",
  disk_warn: "Monitor disk space and plan a cleanup.",
  missing_ip: "Fill in the IP address in the hardware record."
};
function RmmToneBadge({
  label,
  tone = "neutral",
  onClick,
  title
}) {
  if (!label || label === "-") {
    return <span className={styles.rmmCellMuted}>-</span>;
  }
  if (onClick) {
    return <button type="button" className={`${styles.rmmBadge} ${styles[`rmmBadge_${tone}`]} ${styles.rmmBadgeBtn}`} onClick={onClick} title={title}>
        {label}
      </button>;
  }
  return <span className={`${styles.rmmBadge} ${styles[`rmmBadge_${tone}`]}`}>{label}</span>;
}
function getRmmHostSubtitle(agent, copy, {
  syncPending = false
} = {}) {
  const parts = [agent.domain, agent.logged_user].filter(Boolean);
  if (syncPending) parts.push(copy.rmm.syncRequested);
  return parts.length > 0 ? parts.join(" Â· ") : null;
}
function getRmmAgentSortValue(agent, key) {
  switch (key) {
    case "hostname":
      return (agent.hostname || agent.machine_id || "").toLowerCase();
    case "client_name":
      return (agent.client_name || "").toLowerCase();
    case "os":
      return (getRmmAgentOsDisplay(agent).label || "").toLowerCase();
    case "os_build":
      return (getRmmAgentOsDisplay(agent).build || "").toLowerCase();
    case "ip":
      return (agent.ip || "").toLowerCase();
    case "updates_pending":
      return agent.updates_pending ?? -1;
    case "agent_version":
      return (agent.agent_version || "").toLowerCase();
    case "last_seen_at":
      {
        if (!agent.last_seen_at) return 0;
        const time = new Date(agent.last_seen_at).getTime();
        return Number.isFinite(time) ? time : 0;
      }
    default:
      return "";
  }
}
async function copyText(value, label, copy) {
  const raw = String(value || "").trim();
  if (!raw) return;
  try {
    await navigator.clipboard.writeText(raw);
    toast.success(copy.formatClipboardCopied(label));
  } catch {
    toast.error(copy.rmm.clipboard.copyFailed);
  }
}
function filterRmmAgentsBySearch(agents, searchQuery) {
  const query = String(searchQuery || "").trim().toLowerCase();
  const rows = Array.isArray(agents) ? agents : [];
  if (!query) return rows;
  return rows.filter(agent => {
    const osDisplay = getRmmAgentOsDisplay(agent);
    const haystack = [agent.hostname, agent.machine_id, agent.client_name, agent.ip, agent.domain, agent.logged_user, agent.agent_version, osDisplay.label, osDisplay.build].filter(Boolean).join(" ").toLowerCase();
    return haystack.includes(query);
  });
}
function RmmAgentsList({
  agents,
  showOfflineOnly = false,
  searchQuery = "",
  onOpenEquipment,
  onViewMetricHistory,
  onRequestSync,
  onCancelSync,
  onRevokeAgent,
  onNavigateClient,
  isAdmin = false,
  copy,
  formatLastSeen,
  localeTag = "en-US"
}) {
  const [sort, setSort] = useState({
    key: "last_seen_at",
    direction: "desc"
  });
  const [openMenuKey, setOpenMenuKey] = useState(null);
  const [syncingIds, setSyncingIds] = useState(() => new Set());
  const handleSort = key => {
    setSort(prev => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc"
    }));
  };
  const buildMenuItems = agent => {
    const hostname = agent.hostname || agent.machine_id || copy.rmm.workstation;
    const items = [];
    if (agent.client_id && onNavigateClient) {
      items.push({
        id: "client",
        icon: "mdi:office-building-outline",
        label: copy.rmm.menu.viewEnterprise,
        onClick: () => onNavigateClient({
          id: agent.client_id,
          name: agent.client_name
        })
      });
    }
    if (isRmmSyncPending(agent)) {
      items.push({
        id: "cancel-sync",
        icon: "mdi:sync-off",
        label: copy.rmm.menu.cancelSync,
        disabled: syncingIds.has(agent.id),
        onClick: async () => {
          if (!agent.id || !onCancelSync) return;
          setSyncingIds(prev => new Set(prev).add(agent.id));
          try {
            await onCancelSync(agent);
          } finally {
            setSyncingIds(prev => {
              const next = new Set(prev);
              next.delete(agent.id);
              return next;
            });
          }
        }
      });
    } else {
      items.push({
        id: "sync",
        icon: "mdi:sync",
        label: copy.rmm.menu.fullSync,
        disabled: syncingIds.has(agent.id),
        onClick: async () => {
          if (!agent.id || !onRequestSync) return;
          setSyncingIds(prev => new Set(prev).add(agent.id));
          try {
            await onRequestSync(agent);
          } finally {
            setSyncingIds(prev => {
              const next = new Set(prev);
              next.delete(agent.id);
              return next;
            });
          }
        }
      });
    }
    if (onViewMetricHistory && agent.id && agent.equipment) {
      items.push({
        id: "metrics-history",
        icon: "mdi:chart-timeline-variant",
        label: copy.rmm.menu.metricsHistory,
        onClick: () => onViewMetricHistory(agent)
      });
    }
    items.push({
      type: "divider"
    });
    items.push({
      id: "copy-host",
      icon: "mdi:content-copy",
      label: copy.rmm.menu.copyHost,
      onClick: () => copyText(hostname, copy.rmm.clipboard.hostName, copy)
    }, {
      id: "copy-ip",
      icon: "mdi:ip-network",
      label: copy.rmm.menu.copyIp,
      disabled: !agent.ip,
      onClick: () => copyText(agent.ip, copy.rmm.clipboard.ipAddress, copy)
    });
    if (isAdmin && onRevokeAgent) {
      items.push({
        type: "divider"
      });
      items.push({
        id: "revoke",
        icon: "mdi:link-off",
        label: copy.rmm.menu.revoke,
        danger: true,
        onClick: () => onRevokeAgent(agent)
      });
    }
    return items;
  };
  const list = useMemo(() => {
    const rows = Array.isArray(agents) ? agents : [];
    const filtered = showOfflineOnly ? rows.filter(a => !a.online) : rows;
    const direction = sort.direction === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      const va = getRmmAgentSortValue(a, sort.key);
      const vb = getRmmAgentSortValue(b, sort.key);
      if (typeof va === "number" && typeof vb === "number") {
        return (va - vb) * direction;
      }
      return String(va).localeCompare(String(vb), localeTag, {
        numeric: true
      }) * direction;
    });
  }, [agents, showOfflineOnly, sort, localeTag]);
  const stats = useMemo(() => {
    const rows = Array.isArray(agents) ? agents : [];
    const offline = rows.filter(a => !a.online).length;
    const pendingUpdates = rows.filter(a => (a.updates_pending ?? 0) > 0).length;
    const diskAlerts = rows.filter(a => (a.disk_pct ?? 0) >= 85).length;
    return {
      total: rows.length,
      offline,
      pendingUpdates,
      diskAlerts
    };
  }, [agents]);
  if (!list.length) {
    const hasSearch = Boolean(String(searchQuery || "").trim());
    return <EmptyGood icon={hasSearch ? "mdi:magnify-close" : showOfflineOnly ? "mdi:laptop" : "mdi:laptop-off"} title={hasSearch ? copy.rmm.empty.noMatchTitle : showOfflineOnly ? copy.rmm.empty.allOnlineTitle : copy.rmm.empty.noAgentsTitle} text={hasSearch ? copy.rmm.empty.noMatchText : showOfflineOnly ? copy.rmm.empty.allOnlineText : copy.rmm.empty.noAgentsText} />;
  }
  if (showOfflineOnly) {
    const offlineCards = [...list].sort((a, b) => {
      const ta = a.last_seen_at ? new Date(a.last_seen_at).getTime() : 0;
      const tb = b.last_seen_at ? new Date(b.last_seen_at).getTime() : 0;
      return (Number.isFinite(tb) ? tb : 0) - (Number.isFinite(ta) ? ta : 0);
    });
    return <div className={styles.rmmOfflineList}>
        {offlineCards.map(agent => {
        const hostname = agent.hostname || agent.machine_id || copy.rmm.workstation;
        const syncPending = isRmmSyncPending(agent);
        const canOpenEquipment = Boolean(agent.equipment && onOpenEquipment);
        const relativeLastSeen = agent.last_seen_at ? formatRelativeFrench(agent.last_seen_at) : null;
        return <article key={agent.id} className={styles.rmmOfflineCard}>
              <div className={styles.rmmOfflineMain}>
                <span className={styles.rmmOfflineStatus} title={copy.rmm.offline} aria-hidden />
                <div className={styles.rmmOfflineBody}>
                  <h3 className={styles.rmmOfflineHost}>{hostname}</h3>
                  <div className={styles.rmmOfflineActivity}>
                    <span className={styles.rmmOfflineActivityLabel}>{copy.rmm.lastActivity}</span>
                    <strong className={styles.rmmOfflineActivityValue}>
                      {formatLastSeen(agent.last_seen_at)}
                    </strong>
                    {relativeLastSeen ? <span className={styles.rmmOfflineActivityRelative}>{relativeLastSeen}</span> : null}
                  </div>
                  {(agent.client_name || agent.domain || syncPending) && <p className={styles.rmmOfflineMeta}>
                      {[agent.client_name, agent.domain].filter(Boolean).join(" Â· ")}
                      {syncPending ? `${agent.client_name || agent.domain ? " Â· " : ""}${copy.rmm.syncRequested}` : ""}
                    </p>}
                </div>
              </div>
              {canOpenEquipment ? <button type="button" className={styles.rmmOfflineOpenBtn} onClick={() => onOpenEquipment(agent.equipment)}>
                  <Icon icon="mdi:monitor-eye" aria-hidden />
                  {copy.rmm.viewWorkstation}
                </button> : <span className={styles.rmmOfflineMissingLink}>{copy.rmm.notLinked}</span>}
            </article>;
      })}
      </div>;
  }
  return <div className={styles.rmmFleet}>
      {!showOfflineOnly ? <div className={styles.rmmSummary}>
          <span className={styles.rmmSummaryItem}>
            <strong>{stats.total}</strong> {copy.formatRmmWorkstationCount(stats.total)}
          </span>
          {stats.offline > 0 ? <span className={`${styles.rmmSummaryItem} ${styles.rmmSummaryWarn}`}>
              <strong>{stats.offline}</strong> {copy.rmm.summary.offline}
            </span> : null}
          {stats.pendingUpdates > 0 ? <span className={`${styles.rmmSummaryItem} ${styles.rmmSummaryWarn}`}>
              <strong>{stats.pendingUpdates}</strong> {copy.rmm.summary.pendingUpdates}
            </span> : null}
          {stats.diskAlerts > 0 ? <span className={`${styles.rmmSummaryItem} ${styles.rmmSummaryBad}`}>
              <strong>{stats.diskAlerts}</strong> {copy.formatRmmDiskAlerts(stats.diskAlerts)}
            </span> : null}
        </div> : null}
      <div className={styles.rmmTableWrap}>
        <table className={styles.rmmTable}>
          <thead>
            <tr>
              {copy.rmmTableColumns.map(col => {
              const isSorted = sort.key === col.key;
              const sortMark = isSorted ? sort.direction === "asc" ? " ↑" : " ↓" : " ↕";
              const thClass = col.sortable ? styles.rmmSortableTh : undefined;
              if (!col.sortable) {
                return <th key={col.key} className={thClass}>
                      {col.label}
                    </th>;
              }
              return <th key={col.key} className={thClass} onClick={() => handleSort(col.key)} title={copy.formatRmmSortBy(col.label)} aria-label={col.ariaLabel || col.label}>
                    <span className={styles.rmmThContent}>
                      {col.label}
                      <span className={styles.rmmSortIndicator} aria-hidden>
                        {sortMark}
                      </span>
                    </span>
                  </th>;
            })}
              <th className={styles.rmmColActions} aria-label={copy.rmm.table.actions} />
            </tr>
          </thead>
          <tbody>
            {list.map(agent => {
            const syncPending = isRmmSyncPending(agent);
            const canOpenEquipment = Boolean(agent.equipment && onOpenEquipment);
            const osDisplay = getRmmAgentOsDisplay(agent);
            const osIcon = osDisplay.iconSource ? getOsIconName(osDisplay.iconSource, {
              withFallback: true
            }) : null;
            const hostSubtitle = getRmmHostSubtitle(agent, copy, {
              syncPending
            });
            return <tr key={agent.id} className={styles.rmmTableRow}>
                  <td className={styles.rmmColHost}>
                    <div className={styles.rmmHostCell}>
                      <span className={`${styles.rmmStatus} ${agent.online ? styles.rmmStatus_online : styles.rmmStatus_offline}`} title={agent.online ? copy.rmm.online : copy.rmm.offline} />
                      <div className={styles.rmmHostBody}>
                        <span className={styles.rmmHost}>{agent.hostname || agent.machine_id || copy.rmm.workstation}</span>
                        {hostSubtitle ? <span className={styles.rmmHostSub} title={hostSubtitle}>
                            {hostSubtitle}
                          </span> : null}
                      </div>
                    </div>
                  </td>
                  <td className={styles.rmmCellMuted}>{agent.client_name || "-"}</td>
                  <td className={styles.rmmColOs} title={osDisplay.label || undefined}>
                    {osDisplay.label ? <span className={styles.rmmOsCell}>
                        {osIcon ? <Icon icon={osIcon} width={18} height={18} className={styles.rmmOsIcon} aria-hidden /> : null}
                        <span className={styles.rmmOsLabel}>{osDisplay.label}</span>
                      </span> : "-"}
                  </td>
                  <td className={styles.rmmCellMono} title={osDisplay.build || undefined}>
                    {osDisplay.build || "-"}
                  </td>
                  <td className={styles.rmmCellMono}>{agent.ip || "-"}</td>
                  <td>
                    <RmmToneBadge label={agent.updates_label} tone={agent.updates_tone} />
                  </td>
                  <td className={styles.rmmCellMono}>{agent.agent_version || "-"}</td>
                  <td className={styles.rmmLastSeen}>{formatLastSeen(agent.last_seen_at)}</td>
                  <td className={styles.rmmColActions}>
                    <div className={styles.rmmRowActions}>
                      {canOpenEquipment ? <button type="button" className={styles.rmmOpenEquipmentBtn} onClick={() => onOpenEquipment(agent.equipment)} title={copy.rmm.viewWorkstation} aria-label={copy.rmm.viewWorkstation}>
                          <Icon icon="mdi:open-in-new" aria-hidden />
                        </button> : null}
                      <EmbeddedEquipmentActionsMenu menuKey={agent.id} openMenuKey={openMenuKey} onOpenChange={setOpenMenuKey} items={buildMenuItems(agent)} />
                    </div>
                  </td>
                </tr>;
          })}
          </tbody>
        </table>
      </div>
    </div>;
}

export default function MonitoringCenterPage({
  loading = false,
  error = null,
  statsItems = [],
  resolveMonitorStatus,
  statusCounts: statusCountsProp,
  onEquipmentOpen,
  devicesContent = null,
  equipmentRmmAgents = [],
  availableClients = [],
  selectedClients = new Set(),
  onToggleClient,
  onClearFilters,
  activeFiltersCount = 0,
  searchQuery = "",
  onSearchChange,
  headerActions = null,
  onNavigate,
  onRmmRevokeAgent,
  onRmmDataRefresh,
  deviceStatusFilter = "all",
  onDeviceStatusFilterChange,
  checkmkIntegrationEnabled = false,
  isMkMapped = () => false,
  onFleetRemediate
}) {
  const [activeTab, setActiveTab] = useState("operations");
  const [dashboard, setDashboard] = useState(null);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [rmmAgents, setRmmAgents] = useState([]);
  const [rmmLoading, setRmmLoading] = useState(true);
  const [rmmFromApi, setRmmFromApi] = useState(false);
  const [proPromoKey, setProPromoKey] = useState(null);
  const [backupStats, setBackupStats] = useState({
    total: 0,
    issues: 0,
    critical: 0,
    warning: 0,
    ok: 0,
    unmapped: 0
  });
  const [backupIssueJobs, setBackupIssueJobs] = useState([]);
  const [opsSeverityFilter, setOpsSeverityFilter] = useState("all");
  const [opsDomainFilter, setOpsDomainFilter] = useState("all");
  const [opsSearchQuery, setOpsSearchQuery] = useState("");
  const [opsWorkflowFilter, setOpsWorkflowFilter] = useState("all");
  const [alertStates, setAlertStates] = useState([]);
  const [alertActionBusyId, setAlertActionBusyId] = useState(null);
  const [historyAlerts, setHistoryAlerts] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historySearch, setHistorySearch] = useState("");
  const [historyDomain, setHistoryDomain] = useState("all");
  const [historyStatus, setHistoryStatus] = useState("all");
  const [eventModalOpen, setEventModalOpen] = useState(false);
  const [eventPrefill, setEventPrefill] = useState({
    clientId: null,
    clientName: "",
    equipmentId: null
  });
  const [pendingLinkItem, setPendingLinkItem] = useState(null);
  const [pageGuideOpen, setPageGuideOpen] = useState(false);
  const openPageGuide = useCallback(() => setPageGuideOpen(true), []);
  useRegisterPageGuide(openPageGuide);
  const {
    user
  } = useAuthContext();
  const isAdmin = String(user?.role || "").toLowerCase() === "admin";
  const locale = useAppLocale();
  const localeTag = getLocaleTag(locale);
  const pageCopy = useMemo(() => getSupervisionCenterCopy(locale), [locale]);
  const backupCopy = useMemo(() => getBackupMspPanelCopy(locale), [locale]);
  const guideSteps = useMemo(() => getSupervisionCenterGuideSteps({
    showOperations: () => setActiveTab("operations"),
    showFleet: () => setActiveTab("fleet"),
    showHistory: () => setActiveTab("history")
  }, locale), [locale]);
  const {
    rules: alertRules,
    catalog: alertRulesCatalog,
    applyRules
  } = useSupervisionAlertRules();
  const effectiveRmmAgents = useMemo(() => {
    const apiRows = Array.isArray(rmmAgents) ? rmmAgents : [];
    const fromEquipment = Array.isArray(equipmentRmmAgents) ? equipmentRmmAgents : [];
    return mergeRmmAgentRows(rmmFromApi ? apiRows : [], fromEquipment);
  }, [rmmFromApi, rmmAgents, equipmentRmmAgents]);
  const statusCounts = useMemo(() => {
    if (statusCountsProp) return statusCountsProp;
    return {
      total: statsItems.length,
      issues: 0,
      unmapped: 0,
      critical: 0,
      warning: 0,
      offline: 0
    };
  }, [statusCountsProp, statsItems.length]);
  const offlineAgents = useMemo(() => {
    const rows = Array.isArray(effectiveRmmAgents) ? effectiveRmmAgents.filter(a => !a.online) : [];
    if (!alertRules) return rows;
    const showOffline = isMonitoringCriterionEnabled("ordinateurs", "agent_offline", alertRules);
    return showOffline ? rows : [];
  }, [effectiveRmmAgents, alertRules]);
  const contractAlerts = dashboard?.contractAlerts || [];
  const licenseAlerts = dashboard?.licenseAlerts || [];
  const unifiedQueue = useMemo(() => buildUnifiedSupervisionQueue({
    statsItems,
    resolveMonitorStatus,
    alertRules,
    checkmkEnabled: checkmkIntegrationEnabled,
    isMkMapped,
    backupJobs: backupIssueJobs,
    contractAlerts,
    licenseAlerts,
    offlineAgents,
    labels: {
      noName: pageCopy.priority?.noName || "-",
      offline: pageCopy.ops?.offline || "Offline",
      contractStatus: pageCopy.contractStatus,
      contractType: pageCopy.contractType?.msp,
      backup: {
        critical: "Critical",
        warning: "Warning"
      }
    }
  }), [statsItems, resolveMonitorStatus, alertRules, checkmkIntegrationEnabled, isMkMapped, backupIssueJobs, contractAlerts, licenseAlerts, offlineAgents, pageCopy]);
  const unifiedQueueIdsKey = useMemo(() => unifiedQueue.map(item => item.id).join("|"), [unifiedQueue]);
  const enrichedQueue = useMemo(() => mergeQueueWithAlertState(unifiedQueue, alertStates), [unifiedQueue, alertStates]);
  const filteredQueue = useMemo(() => filterSupervisionQueue(enrichedQueue, {
    severity: opsSeverityFilter,
    domain: opsDomainFilter,
    query: opsSearchQuery,
    workflowStatus: opsWorkflowFilter
  }), [enrichedQueue, opsSeverityFilter, opsDomainFilter, opsSearchQuery, opsWorkflowFilter]);
  const severityCounts = useMemo(() => countQueueBySeverity(enrichedQueue), [enrichedQueue]);
  const domainCounts = useMemo(() => countQueueByDomain(enrichedQueue), [enrichedQueue]);
  const workflowCounts = useMemo(() => countQueueByWorkflow(enrichedQueue), [enrichedQueue]);
  const totalIssues = enrichedQueue.length;
  const handleBackupStatsChange = useCallback(stats => {
    setBackupStats(stats || {
      total: 0,
      issues: 0,
      critical: 0,
      warning: 0,
      ok: 0,
      unmapped: 0
    });
  }, []);
  const handleBackupIssueJobsChange = useCallback(jobs => {
    setBackupIssueJobs(Array.isArray(jobs) ? jobs : []);
  }, []);
  const loadDashboard = useCallback(async signal => {
    setDashboardLoading(true);
    try {
      const data = await fetchHomeDashboard({
        signal
      });
      setDashboard(data);
    } catch (err) {
      if (err?.name !== "AbortError") {
        console.error("Error chargement supervision dashboard:", err);
      }
    } finally {
      setDashboardLoading(false);
    }
  }, []);
  const loadRmm = useCallback(async signal => {
    setRmmLoading(true);
    try {
      const data = await fetchRmmAgents();
      if (signal?.aborted) return;
      const rows = Array.isArray(data?.agents) ? data.agents : Array.isArray(data) ? data : [];
      setRmmAgents(rows);
      setRmmFromApi(true);
    } catch (err) {
      if (err?.name !== "AbortError") {
        setRmmAgents([]);
        setRmmFromApi(false);
      }
    } finally {
      if (!signal?.aborted) setRmmLoading(false);
    }
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    loadDashboard(controller.signal);
    loadRmm(controller.signal);
    const interval = setInterval(() => {
      if (document.visibilityState !== "visible") return;
      loadDashboard(controller.signal);
      loadRmm(controller.signal);
    }, 60000);
    return () => {
      controller.abort();
      clearInterval(interval);
    };
  }, [loadDashboard, loadRmm]);
  const refreshAlertStates = useCallback(async () => {
    try {
      const ids = unifiedQueueIdsKey ? unifiedQueueIdsKey.split("|").filter(Boolean) : [];
      if (!ids.length) {
        setAlertStates([]);
        return;
      }
      const alerts = await fetchSupervisionAlertStates(ids);
      setAlertStates(Array.isArray(alerts) ? alerts : []);
    } catch (err) {
      console.error("Error loading supervision alerts:", err);
    }
  }, [unifiedQueueIdsKey]);
  const refreshHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const alerts = await fetchSupervisionAlertsHistory({
        domain: historyDomain === "all" ? undefined : historyDomain,
        status: historyStatus === "all" ? undefined : historyStatus,
        q: historySearch || undefined,
        limit: 150
      });
      setHistoryAlerts(Array.isArray(alerts) ? alerts : []);
    } catch (err) {
      console.error("Error loading supervision alert history:", err);
      setHistoryAlerts([]);
    } finally {
      setHistoryLoading(false);
    }
  }, [historyDomain, historyStatus, historySearch]);
  useEffect(() => {
    refreshAlertStates();
    const interval = setInterval(() => {
      if (document.visibilityState !== "visible") return;
      refreshAlertStates();
    }, 60000);
    return () => clearInterval(interval);
  }, [refreshAlertStates]);
  useEffect(() => {
    if (activeTab !== "history") return undefined;
    refreshHistory();
    return undefined;
  }, [activeTab, refreshHistory]);
  const applyAlertResult = useCallback(result => {
    const alert = result?.alert;
    if (!alert?.queueItemId) {
      refreshAlertStates();
      return;
    }
    setAlertStates(prev => {
      const next = Array.isArray(prev) ? [...prev] : [];
      const idx = next.findIndex(a => a.queueItemId === alert.queueItemId);
      // Keep closed alerts in state so the queue can hide them (source issues may still exist).
      if (idx >= 0) next[idx] = alert;else next.unshift(alert);
      return next;
    });
  }, [refreshAlertStates]);
  useEffect(() => {
    const unsubscribe = subscribeSupervisionAlertStream({
      onEvent: payload => {
        if (payload?.type !== "alert" || !payload.alert) return;
        applyAlertResult(payload);
        if (payload.alert.status === "closed" || payload.action === "reopen" || payload.action === "resolved" || payload.action === "dismissed") {
          refreshHistory();
        }
      },
      onError: err => {
        console.warn("[supervision-alerts] stream:", err?.message || err);
      }
    });
    return unsubscribe;
  }, [applyAlertResult, refreshHistory]);
  const runAlertAction = useCallback(async (item, actionFn, successKey) => {
    if (!item?.id) return;
    setAlertActionBusyId(item.id);
    try {
      const result = await actionFn(item);
      applyAlertResult(result);
      const msg = pageCopy.ops?.toasts?.[successKey];
      if (msg) toast.success(msg);
      if (successKey === "resolved" || successKey === "dismissed") {
        refreshHistory();
      }
    } catch (err) {
      toast.error(err?.message || pageCopy.ops?.toasts?.actionFailed || "Error");
    } finally {
      setAlertActionBusyId(null);
    }
  }, [applyAlertResult, pageCopy.ops, refreshHistory]);
  const handleAckAlert = useCallback(item => runAlertAction(item, i => ackSupervisionAlert(i), "acked"), [runAlertAction]);
  const handleResolveAlert = useCallback(item => runAlertAction(item, i => resolveSupervisionAlert(i), "resolved"), [runAlertAction]);
  const handleDismissAlert = useCallback(item => runAlertAction(item, i => dismissSupervisionAlert(i), "dismissed"), [runAlertAction]);
  const linkRemediation = useCallback(async (item, link) => {
    if (!item?.id) return;
    try {
      const result = await linkSupervisionAlert(item, link);
      applyAlertResult(result);
      toast.success(pageCopy.ops?.toasts?.linked || "Linked");
    } catch (err) {
      toast.error(err?.message || pageCopy.ops?.toasts?.actionFailed || "Error");
    }
  }, [applyAlertResult, pageCopy.ops]);
  const openPlanningForContext = useCallback(({
    clientId,
    clientName,
    equipmentId
  }) => {
    setEventPrefill({
      clientId: clientId || null,
      clientName: clientName || "",
      equipmentId: equipmentId || null
    });
    setEventModalOpen(true);
  }, []);
  const handleTicketSupport = useCallback(item => {
    const equipment = item?.equipment || item?.agent?.equipment || null;
    linkRemediation(item, {
      linkedTicketKind: "support"
    });
    onNavigate?.("TicketCreate", {
      clientId: item?.clientId || equipment?.clientId || null,
      equipmentId: equipment?.id || null,
      title: item?.ticketSubject || ""
    });
  }, [onNavigate, linkRemediation]);
  const handleTicketPresta = useCallback(item => {
    linkRemediation(item, {
      linkedTicketKind: "prestation"
    });
    onNavigate?.("TicketSalesCreate", {
      kind: "prestation",
      clientId: item?.clientId || item?.equipment?.clientId || null
    });
  }, [onNavigate, linkRemediation]);
  const handlePlanEvent = useCallback(item => {
    const equipment = item?.equipment || item?.agent?.equipment || null;
    setPendingLinkItem(item);
    openPlanningForContext({
      clientId: item?.clientId || equipment?.clientId || null,
      clientName: item?.clientName || equipment?.clientName || "",
      equipmentId: equipment?.id || getEquipmentListKey(equipment) || null
    });
  }, [openPlanningForContext]);
  const handleOpenQueueItem = useCallback(item => {
    if (!item) return;
    if (item.domain === "devices" && item.equipment) {
      onEquipmentOpen?.(item.equipment);
      return;
    }
    if (item.domain === "backups" && item.job) {
      onNavigate?.("JobDetail", item.job);
      return;
    }
    if (item.domain === "contracts") {
      const clientId = item.clientId || item.contract?.clientId || item.contract?.id;
      if (clientId) {
        onNavigate?.("ContratDetail", {
          clientId,
          name: item.clientName || item.title
        });
      }
      return;
    }
    if (item.domain === "rmm") {
      if (item.equipment) {
        onEquipmentOpen?.(item.equipment);
        return;
      }
      if (item.agent?.equipment) {
        onEquipmentOpen?.(item.agent.equipment);
      }
    }
  }, [onEquipmentOpen, onNavigate]);
  const ticketSupportRef = React.useRef(handleTicketSupport);
  const ticketPrestaRef = React.useRef(handleTicketPresta);
  const planEventRef = React.useRef(handlePlanEvent);
  const openPlanningRef = React.useRef(openPlanningForContext);
  ticketSupportRef.current = handleTicketSupport;
  ticketPrestaRef.current = handleTicketPresta;
  planEventRef.current = handlePlanEvent;
  openPlanningRef.current = openPlanningForContext;
  useEffect(() => {
    onFleetRemediate?.({
      onTicketSupport: (equipment, subject) => ticketSupportRef.current?.({
        clientId: equipment?.clientId,
        equipment,
        ticketSubject: subject || equipment?.name || ""
      }),
      onTicketPresta: equipment => ticketPrestaRef.current?.({
        clientId: equipment?.clientId,
        equipment
      }),
      onPlanEvent: equipment => openPlanningRef.current?.({
        clientId: equipment?.clientId,
        clientName: equipment?.clientName || "",
        equipmentId: equipment?.id || getEquipmentListKey(equipment)
      })
    });
  }, [onFleetRemediate]);
  const visibleTabs = useMemo(() => {
    const fromCopy = pageCopy.tabs || [];
    if (fromCopy.length) {
      return fromCopy.filter(tab => tab.id !== "settings" || isAdmin);
    }
    return TABS.filter(tab => tab.id !== "settings" || isAdmin);
  }, [pageCopy.tabs, isAdmin]);
  const tabBadges = {
    operations: totalIssues,
    fleet: statusCounts.total || statsItems.length,
    history: historyAlerts.length,
    settings: 0
  };
  const showBootLoader = !dashboard && !statsItems.length && loading && dashboardLoading;
  if (showBootLoader) {
    return <div className={`${cyberStyles.mspPage} ${cyberStyles.mspPageOrbital}`}>
        <SupportOrbitalBackground variant="page" />
        <div className={styles.loadingScreen} role="status" aria-live="polite" aria-busy="true">
          <div className={styles.loadingRadar} aria-hidden>
            <span className={styles.loadingRing} />
            <span className={`${styles.loadingRing} ${styles.loadingRingMid}`} />
            <span className={`${styles.loadingRing} ${styles.loadingRingOuter}`} />
            <span className={styles.loadingSweep} />
            <span className={styles.loadingCore}>
              <Icon icon="mdi:radar" />
            </span>
          </div>
          <p className={styles.loadingLabel}>{pageCopy.loading}</p>
        </div>
      </div>;
  }
  return <div className={`${cyberStyles.mspPage} ${cyberStyles.mspPageOrbital}`}>
      <SupportOrbitalBackground variant="page" />
      <div className={cyberStyles.mspLayout}>
        <div className={cyberStyles.mspMain}>
          <header className={cyberStyles.mspHero} data-guide="supervision-hero">
            <div className={cyberStyles.mspHeroMain}>
              <div className={`${cyberStyles.mspBrandMark} ${styles.brandMarkSupervision}`} aria-hidden>
                <Icon icon="mdi:radar" className={cyberStyles.mspBrandMarkIcon} />
              </div>
              <div className={cyberStyles.mspHeroCopy}>
                <span className={cyberStyles.mspEyebrow}>{pageCopy.eyebrow}</span>
                <h1 className={cyberStyles.mspTitle}>{pageCopy.pageTitle}</h1>
                <p className={cyberStyles.mspSubtitle}>{pageCopy.subtitle}</p>
              </div>
            </div>
            <nav className={cyberStyles.mspTabBar} role="tablist" aria-label={pageCopy.tabSectionsAria} data-guide="supervision-tabs">
              {visibleTabs.map(tab => {
              const badge = tabBadges[tab.id] || 0;
              const isActive = activeTab === tab.id;
              const showBadge = tab.id === "operations" || tab.id === "fleet" || tab.id === "history";
              return <button key={tab.id} type="button" role="tab" aria-selected={isActive} className={`${cyberStyles.mspTab} ${isActive ? cyberStyles.mspTabActive : ""}`} onClick={() => setActiveTab(tab.id)}>
                    <Icon icon={tab.icon} className={cyberStyles.mspTabIcon} />
                    <span className={cyberStyles.mspTabLabelRow}>
                      <span>{tab.label}</span>
                      {showBadge ? <span className={`${styles.tabCount} ${badge === 0 ? styles.tabCountMuted : ""}`}>
                          {badge}
                        </span> : null}
                    </span>
                  </button>;
            })}
            </nav>
          </header>

          <main className={cyberStyles.mspContent}>
            <div className={`${layout.shell} ${layout.shellWide} ${layout.shellFull}`}>
              {activeTab === "operations" && !error ? <div className={`${dashStyles.dashboard} ${styles.dashboard}`} data-guide="supervision-ops">
                  <div className={`${cyberStyles.tabContent} ${styles.content}`}>
                    <SupervisionOpsQueue items={filteredQueue} kpi={severityCounts} domainCounts={domainCounts} workflowCounts={workflowCounts} severityFilter={opsSeverityFilter} domainFilter={opsDomainFilter} workflowFilter={opsWorkflowFilter} searchQuery={opsSearchQuery} onSeverityFilter={setOpsSeverityFilter} onDomainFilter={setOpsDomainFilter} onWorkflowFilter={setOpsWorkflowFilter} onSearchChange={setOpsSearchQuery} onOpenItem={handleOpenQueueItem} onTicketSupport={handleTicketSupport} onTicketPresta={handleTicketPresta} onPlanEvent={handlePlanEvent} onAck={handleAckAlert} onResolve={handleResolveAlert} onDismiss={handleDismissAlert} busyId={alertActionBusyId} localeTag={localeTag} copy={pageCopy.ops} />
                  </div>
                </div> : null}

              {!error ? <div hidden aria-hidden style={{
              display: "none"
            }}>
                  <BackupMspPanel embedded onNavigate={onNavigate} onStatsChange={handleBackupStatsChange} onIssueJobsChange={handleBackupIssueJobsChange} copy={backupCopy} localeTag={localeTag} />
                </div> : null}

              {activeTab === "fleet" && !error ? <div className={`${dashStyles.dashboard} ${styles.dashboard}`} data-guide="supervision-fleet">
                  {(onSearchChange || availableClients.length > 1 || headerActions) ? <div className={`${dashStyles.toolbar} ${styles.toolbar}`}>
                      {onSearchChange ? <label className={dashStyles.searchBox}>
                          <Icon icon="mdi:magnify" aria-hidden />
                          <input type="search" placeholder={pageCopy.search.devices} value={searchQuery} onChange={e => onSearchChange(e.target.value)} />
                        </label> : null}
                      {availableClients.length > 1 ? <div className={styles.clientFilters}>
                          <span className={styles.toolbarLabel}>{pageCopy.search.clients}</span>
                          {availableClients.slice(0, 8).map(clientName => <button key={clientName} type="button" className={`${styles.filterChip} ${selectedClients.has(clientName) ? styles.filterChipActive : ""}`} onClick={() => onToggleClient?.(clientName)}>
                              {clientName}
                            </button>)}
                          {availableClients.length > 8 ? <span className={styles.filterChip} style={{
                    cursor: "default",
                    opacity: 0.7
                  }}>
                              +{availableClients.length - 8}
                            </span> : null}
                          {activeFiltersCount > 0 ? <button type="button" className={styles.filterClear} onClick={onClearFilters}>
                              {interpolate(pageCopy.search.clearFilters, {
                        count: String(activeFiltersCount)
                      })}
                            </button> : null}
                        </div> : null}
                      {headerActions ? <div className={styles.toolbarActions}>{headerActions}</div> : null}
                    </div> : null}
                  <div className={`${cyberStyles.tabContent} ${styles.content}`}>
                    {devicesContent}
                  </div>
                </div> : null}

              {activeTab === "history" && !error ? <div className={`${dashStyles.dashboard} ${styles.dashboard}`} data-guide="supervision-history">
                  <div className={`${cyberStyles.tabContent} ${styles.content}`}>
                    <SupervisionAlertHistory alerts={historyAlerts} loading={historyLoading} searchQuery={historySearch} domainFilter={historyDomain} statusFilter={historyStatus} onSearchChange={setHistorySearch} onDomainFilter={setHistoryDomain} onStatusFilter={setHistoryStatus} onReopened={() => {
                refreshAlertStates();
                refreshHistory();
              }} localeTag={localeTag} copy={pageCopy.history} />
                  </div>
                </div> : null}

              {activeTab === "settings" && isAdmin && !error ? <div className={`${cyberStyles.tabContent} ${styles.content}`}>
                  <MonitoringAlertRulesPanel catalog={alertRulesCatalog} rules={alertRules} isAdmin={isAdmin} onSaved={applyRules} />
                </div> : null}

              {error ? <div className={styles.panel}>
                  <MspEmptyState icon="mdi:alert-circle-outline" title={pageCopy.error.title} text={error} />
                </div> : null}
            </div>
          </main>
        </div>
      </div>
      <PlanningEventModalBridge open={eventModalOpen} editingEvent={null} initialClientId={eventPrefill.clientId} initialClientName={eventPrefill.clientName} initialEquipmentId={eventPrefill.equipmentId} onClose={() => {
        setEventModalOpen(false);
        setPendingLinkItem(null);
      }} onSaved={saved => {
        if (pendingLinkItem) {
          linkRemediation(pendingLinkItem, {
            linkedEventId: saved?.id || saved?.event?.id || null,
            linkedTicketKind: "planning"
          });
        }
        setPendingLinkItem(null);
        setEventModalOpen(false);
      }} />
      <ProFeaturePromoModal open={Boolean(proPromoKey)} featureKey={proPromoKey} onClose={() => setProPromoKey(null)} />
      <PageGuideTour open={pageGuideOpen} steps={guideSteps} title={pageCopy.guide?.tourTitle} locale={locale} onClose={() => setPageGuideOpen(false)} />
    </div>;
}

