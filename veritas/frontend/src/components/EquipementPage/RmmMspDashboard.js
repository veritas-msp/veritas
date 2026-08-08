import React, { useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import { toast } from "react-toastify";
import styles from "../CybersecuritePage/AntivirusMspDashboard.module.css";
import MspEmptyState from "../Misc/MspEmptyState/MspEmptyState";
import EmbeddedEquipmentActionsMenu from "./EmbeddedEquipmentActionsMenu";
import { isRmmSyncPending, getRmmAgentOsDisplay } from "./rmmMonitoringUtils";
import { getOsIconName } from "./osIconUtils";
import { buildRmmFleetStats, filterRmmFleetByStatus, filterRmmFleetRows, getRmmFleetSortValue, sortRmmFleetRows } from "./rmmMspUtils";
function getHealthTone(score) {
  if (score == null) return "neutral";
  if (score >= 80) return "good";
  if (score >= 50) return "warn";
  return "bad";
}
function HealthGauge({
  score,
  label
}) {
  const value = score ?? 0;
  const tone = getHealthTone(score);
  return <div className={`${styles.healthGauge} ${styles[`healthGauge_${tone}`]}`}>
      <svg className={styles.healthRing} viewBox="0 0 120 120" aria-hidden>
        <circle className={styles.healthRingTrack} cx="60" cy="60" r="52" />
        <circle className={styles.healthRingFill} cx="60" cy="60" r="52" style={{
        strokeDasharray: `${value / 100 * 327} 327`
      }} />
      </svg>
      <div className={styles.healthCore}>
        <span className={styles.healthValue}>{score ?? "-"}</span>
        <span className={styles.healthLabel}>{label}</span>
      </div>
    </div>;
}
function KpiCard({
  icon,
  label,
  value,
  tone = "neutral",
  active,
  onClick
}) {
  return <button type="button" className={`${styles.kpiCard} ${active ? styles.kpiCardActive : ""}`} onClick={onClick}>
      <span className={`${styles.kpiIcon} ${styles[`kpiIcon_${tone}`]}`}>
        <Icon icon={icon} />
      </span>
      <span className={styles.kpiBody}>
        <span className={styles.kpiValue}>{value}</span>
        <span className={styles.kpiLabel}>{label}</span>
      </span>
    </button>;
}
function SortableHeader({
  column,
  label,
  sortBy,
  sortDirection,
  onSort
}) {
  const isActive = sortBy === column;
  return <th className={styles.sortableTh} onClick={() => onSort(column)} aria-sort={isActive ? sortDirection === "asc" ? "ascending" : "descending" : "none"}>
      {label}
      {isActive ? sortDirection === "asc" ? " ▲" : " ▼" : ""}
    </th>;
}
async function copyText(value, label, pageCopy) {
  const raw = String(value || "").trim();
  if (!raw) return;
  try {
    await navigator.clipboard.writeText(raw);
    toast.success(pageCopy.formatClipboardCopied(label));
  } catch {
    toast.error(pageCopy.rmm.clipboard.copyFailed);
  }
}
function getHostSubtitle(agent, pageCopy) {
  const parts = [agent.domain, agent.logged_user].filter(Boolean);
  if (isRmmSyncPending(agent)) parts.push(pageCopy.rmm.syncRequested);
  return parts.length > 0 ? parts.join(" · ") : null;
}
function RmmFleetTable({
  agents,
  pageCopy,
  dashboardCopy,
  formatLastSeen,
  localeTag,
  isAdmin,
  onOpenEquipment,
  onViewMetricHistory,
  onRequestSync,
  onCancelSync,
  onRevokeAgent,
  onNavigateClient
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
  const sortedAgents = useMemo(() => sortRmmFleetRows(agents, sort.key, sort.direction), [agents, sort.key, sort.direction]);
  const buildMenuItems = agent => {
    const hostname = agent.hostname || agent.machine_id || pageCopy.rmm.workstation;
    const items = [];
    if (agent.client_id && onNavigateClient) {
      items.push({
        id: "client",
        icon: "mdi:office-building-outline",
        label: pageCopy.rmm.menu.viewEnterprise,
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
        label: pageCopy.rmm.menu.cancelSync,
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
        label: pageCopy.rmm.menu.fullSync,
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
        label: pageCopy.rmm.menu.metricsHistory,
        onClick: () => onViewMetricHistory(agent)
      });
    }
    items.push({
      type: "divider"
    });
    items.push({
      id: "copy-host",
      icon: "mdi:content-copy",
      label: pageCopy.rmm.menu.copyHost,
      onClick: () => copyText(hostname, pageCopy.rmm.clipboard.hostName, pageCopy)
    }, {
      id: "copy-ip",
      icon: "mdi:ip-network",
      label: pageCopy.rmm.menu.copyIp,
      disabled: !agent.ip,
      onClick: () => copyText(agent.ip, pageCopy.rmm.clipboard.ipAddress, pageCopy)
    });
    if (isAdmin && onRevokeAgent) {
      items.push({
        type: "divider"
      });
      items.push({
        id: "revoke",
        icon: "mdi:link-off",
        label: pageCopy.rmm.menu.revoke,
        danger: true,
        onClick: () => onRevokeAgent(agent)
      });
    }
    return items;
  };
  return <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th aria-label={dashboardCopy.table.stateAria} />
            <SortableHeader column="hostname" label={dashboardCopy.table.hostname} sortBy={sort.key} sortDirection={sort.direction} onSort={handleSort} />
            <SortableHeader column="client_name" label={dashboardCopy.table.client} sortBy={sort.key} sortDirection={sort.direction} onSort={handleSort} />
            <SortableHeader column="os" label={dashboardCopy.table.os} sortBy={sort.key} sortDirection={sort.direction} onSort={handleSort} />
            <SortableHeader column="ip" label={dashboardCopy.table.ip} sortBy={sort.key} sortDirection={sort.direction} onSort={handleSort} />
            <SortableHeader column="last_seen_at" label={dashboardCopy.table.lastSeen} sortBy={sort.key} sortDirection={sort.direction} onSort={handleSort} />
            <th aria-label={dashboardCopy.table.actions} />
          </tr>
        </thead>
        <tbody>
          {sortedAgents.map(agent => {
          const hostname = agent.hostname || agent.machine_id || pageCopy.rmm.workstation;
          const osDisplay = getRmmAgentOsDisplay(agent);
          const osIcon = getOsIconName(agent);
          const hostSubtitle = getHostSubtitle(agent, pageCopy);
          const canOpenEquipment = Boolean(agent.equipment && onOpenEquipment);
          const dotColor = agent.online ? "#2b5fab" : "#dc2626";
          return <tr key={agent.id} className={styles.tableRow}>
                <td>
                  <span className={styles.statusDot} style={{
                background: dotColor
              }} title={agent.online ? dashboardCopy.online : dashboardCopy.offline} aria-hidden />
                </td>
                <td>
                  <span className={styles.cellName} title={hostname}>
                    {hostname}
                  </span>
                  {hostSubtitle ? <span className={styles.cellSub} title={hostSubtitle}>
                      {hostSubtitle}
                    </span> : null}
                </td>
                <td className={styles.cellMuted}>{agent.client_name || "-"}</td>
                <td>
                  {osDisplay.label ? <span className={styles.solutionCell}>
                      {osIcon ? <Icon icon={osIcon} className={styles.solutionLogoIcon} aria-hidden /> : null}
                      <span className={styles.cellName}>{osDisplay.label}</span>
                    </span> : "-"}
                </td>
                <td className={styles.cellMuted}>{agent.ip || "-"}</td>
                <td className={styles.cellMuted}>{formatLastSeen(agent.last_seen_at)}</td>
                <td>
                  <div style={{
                display: "flex",
                gap: 4,
                justifyContent: "flex-end"
              }}>
                    {canOpenEquipment ? <button type="button" className={styles.iconBtn} onClick={() => onOpenEquipment(agent.equipment)} title={dashboardCopy.viewWorkstation} aria-label={dashboardCopy.viewWorkstation}>
                        <Icon icon="mdi:open-in-new" width={16} />
                      </button> : null}
                    <EmbeddedEquipmentActionsMenu menuKey={agent.id} openMenuKey={openMenuKey} onOpenChange={setOpenMenuKey} items={buildMenuItems(agent)} />
                  </div>
                </td>
              </tr>;
        })}
        </tbody>
      </table>
    </div>;
}
export default function RmmMspDashboard({
  agents = [],
  loading = false,
  copy,
  pageCopy,
  formatLastSeen,
  localeTag = "en-US",
  isAdmin = false,
  onOpenEquipment,
  onViewMetricHistory,
  onRequestSync,
  onCancelSync,
  onRevokeAgent,
  onNavigateClient
}) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const stats = useMemo(() => buildRmmFleetStats(agents), [agents]);
  const filteredAgents = useMemo(() => {
    const byStatus = filterRmmFleetByStatus(agents, statusFilter);
    return filterRmmFleetRows(byStatus, search);
  }, [agents, statusFilter, search]);
  const priorityRows = useMemo(() => agents.filter(a => !a.online).sort((a, b) => getRmmFleetSortValue(b, "last_seen_at") - getRmmFleetSortValue(a, "last_seen_at")).slice(0, 8), [agents]);
  return <div className={styles.dashboard}>
      <section className={styles.hero}>
        <div className={styles.heroLeft}>
          <HealthGauge score={stats.healthScore} label={copy.healthLabel} />
          <div className={styles.heroCopy}>
            <span className={styles.eyebrow}>{copy.eyebrow}</span>
            <h2 className={styles.heroTitle}>{copy.heroTitle}</h2>
            <p className={styles.heroDesc}>{copy.formatHeroDesc(stats.offline)}</p>
          </div>
        </div>
        <div className={styles.kpiRow}>
          <KpiCard icon="mdi:laptop" label={copy.kpi.agents} value={stats.total} tone="neutral" active={statusFilter === "all" && !search} onClick={() => {
          setStatusFilter("all");
          setSearch("");
        }} />
          <KpiCard icon="mdi:office-building-outline" label={copy.kpi.clients} value={stats.clients} tone="neutral" />
          <KpiCard icon="mdi:check-circle-outline" label={copy.kpi.online} value={stats.online} tone="good" active={statusFilter === "online"} onClick={() => setStatusFilter(statusFilter === "online" ? "all" : "online")} />
          <KpiCard icon="mdi:laptop-off" label={copy.kpi.offline} value={stats.offline} tone={stats.offline > 0 ? "bad" : "good"} active={statusFilter === "offline"} onClick={() => setStatusFilter(statusFilter === "offline" ? "all" : "offline")} />
        </div>
      </section>

      {priorityRows.length > 0 ? <section className={styles.priorityPanel}>
          <header className={styles.priorityHeader}>
            <h3 className={styles.priorityTitle}>{copy.priorityTitle}</h3>
            <span className={styles.toolbarMeta}>
              <strong>{copy.formatAgentCount(priorityRows.length)}</strong>
            </span>
          </header>
          <div className={styles.priorityList}>
            {priorityRows.map(agent => {
          const hostname = agent.hostname || agent.machine_id || pageCopy.rmm.workstation;
          return <button key={agent.id} type="button" className={styles.priorityItem} onClick={() => {
            if (agent.equipment && onOpenEquipment) onOpenEquipment(agent.equipment);
          }}>
                  <span className={styles.priorityDot} style={{
              background: "#dc2626"
            }} />
                  <span className={styles.priorityBody}>
                    <span className={styles.priorityName}>{hostname}</span>
                    <span className={styles.priorityMeta}>
                      {agent.client_name || "-"}
                      {agent.last_seen_at ? ` · ${formatLastSeen(agent.last_seen_at)}` : ""}
                    </span>
                  </span>
                  <span className={styles.priorityVerb}>{copy.priorityVerbFix}</span>
                </button>;
        })}
          </div>
        </section> : null}

      <div className={styles.toolbar}>
        <label className={styles.searchBox}>
          <Icon icon="mdi:magnify" width={18} aria-hidden />
          <input type="search" placeholder={copy.searchPlaceholder} value={search} onChange={e => setSearch(e.target.value)} />
        </label>

        <div className={styles.filterGroup} role="tablist" aria-label={copy.statusFilterAria}>
          {copy.statusFilters.map(filter => <button key={filter.id} type="button" className={`${styles.filterChip} ${statusFilter === filter.id ? styles.filterChipActive : ""}`} onClick={() => setStatusFilter(filter.id)}>
              {filter.label}
            </button>)}
        </div>

        <span className={styles.toolbarMeta}>
          <strong>{copy.formatAgentCount(filteredAgents.length)}</strong>
        </span>
      </div>

      {loading ? <div className={styles.loadingState}>
          <Icon icon="mdi:loading" className={styles.spin} width={28} />
          <span>{copy.loading}</span>
        </div> : filteredAgents.length === 0 ? <MspEmptyState icon={agents.length === 0 ? "mdi:laptop-off" : "mdi:magnify"} title={agents.length === 0 ? copy.emptyTitleNone : copy.emptyTitleNoMatch} text={agents.length === 0 ? copy.emptyTextNone : copy.emptyTextNoMatch} /> : <section className={styles.panel}>
          <RmmFleetTable agents={filteredAgents} pageCopy={pageCopy} dashboardCopy={copy} formatLastSeen={formatLastSeen} localeTag={localeTag} isAdmin={isAdmin} onOpenEquipment={onOpenEquipment} onViewMetricHistory={onViewMetricHistory} onRequestSync={onRequestSync} onCancelSync={onCancelSync} onRevokeAgent={onRevokeAgent} onNavigateClient={onNavigateClient} />
        </section>}
    </div>;
}
