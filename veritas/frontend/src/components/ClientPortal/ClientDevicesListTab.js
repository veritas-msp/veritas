import { useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { getClientPortalCopy } from "./clientPortalI18n";
import portalStyles from "./ClientDashboard.module.css";
import tableStyles from "../TicketPage/TicketPage.module.css";
import styles from "./ClientDevicesListTab.module.css";
function mapWorkstationRow(item) {
  const name = item.name || item.nom || item.hostname || "-";
  const os = item.systeme || item.os?.name || item.rawData?.systeme || "-";
  const brand = item.manufacturer || item.fabricant || item.marque || "-";
  const active = item.is_active !== false && item.active !== false;
  const monitored = Boolean(item.monitored || item.agentManaged || item.checkmk_host_name || item.agent_id || item.agentId);
  const agentOnline = item.agentOnline;
  return {
    id: String(item.id || item.dbId || name),
    name,
    os,
    brand,
    active,
    monitored,
    agentOnline
  };
}
function mapInfraRow(item) {
  const name = item.name || "-";
  const active = item.active !== false;
  const monitored = Boolean(item.monitored);
  return {
    id: String(item.id || name),
    name,
    active,
    monitored
  };
}
function StatusBadge({
  active,
  activeLabel,
  inactiveLabel
}) {
  return <span className={`${styles.statusBadge} ${active ? styles.statusActive : styles.statusInactive}`}>
      {active ? activeLabel : inactiveLabel}
    </span>;
}
function MonitoringBadge({
  monitored,
  agentOnline,
  copy
}) {
  if (!monitored) {
    return <span className={styles.supervisionMuted}>{copy.notSupervised}</span>;
  }
  if (agentOnline === true) {
    return <span className={styles.supervisionOk}>{copy.agentOnline}</span>;
  }
  if (agentOnline === false) {
    return <span className={styles.supervisionWarn}>{copy.agentOffline}</span>;
  }
  return <span className={styles.supervisionOk}>{copy.supervised}</span>;
}
function WorkstationsTable({
  rows,
  copy
}) {
  if (!rows.length) {
    return <p className={styles.emptyCategory}>{copy.noItemsInCategory}</p>;
  }
  return <div className={tableStyles.tablePanel}>
      <div className={tableStyles.tableScroll}>
        <table className={tableStyles.table}>
          <thead>
            <tr>
              <th>{copy.tableName}</th>
              <th>{copy.tableOs}</th>
              <th>{copy.tableBrand}</th>
              <th>{copy.tableStatus}</th>
              <th>{copy.tableMonitoring}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(row => <tr key={row.id}>
                <td>{row.name}</td>
                <td>{row.os}</td>
                <td>{row.brand}</td>
                <td>
                  <StatusBadge active={row.active} activeLabel={copy.statusActive} inactiveLabel={copy.statusInactive} />
                </td>
                <td>
                  <MonitoringBadge monitored={row.monitored} agentOnline={row.agentOnline} copy={copy} />
                </td>
              </tr>)}
          </tbody>
        </table>
      </div>
    </div>;
}
function InfraTable({
  rows,
  copy
}) {
  if (!rows.length) {
    return <p className={styles.emptyCategory}>{copy.noItemsInCategory}</p>;
  }
  return <div className={tableStyles.tablePanel}>
      <div className={tableStyles.tableScroll}>
        <table className={tableStyles.table}>
          <thead>
            <tr>
              <th>{copy.tableName}</th>
              <th>{copy.tableStatus}</th>
              <th>{copy.tableMonitoring}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(row => <tr key={row.id}>
                <td>{row.name}</td>
                <td>
                  <StatusBadge active={row.active} activeLabel={copy.statusActive} inactiveLabel={copy.statusInactive} />
                </td>
                <td>
                  {row.monitored ? <span className={styles.supervisionOk}>{copy.supervised}</span> : <span className={styles.supervisionMuted}>{copy.notSupervised}</span>}
                </td>
              </tr>)}
          </tbody>
        </table>
      </div>
    </div>;
}
export default function ClientDevicesListTab({
  mappedComputers,
  rawComputers,
  infrastructure = []
}) {
  const locale = useAppLocale();
  const copy = useMemo(() => getClientPortalCopy(locale), [locale]);
  const t = copy.devices;
  const categories = useMemo(() => {
    const list = [];
    const workstationSource = mappedComputers.length ? mappedComputers : rawComputers;
    if (workstationSource.length > 0) {
      list.push({
        key: "workstations",
        label: t.typeWorkstations,
        icon: "mdi:laptop",
        kind: "workstations",
        items: workstationSource,
        count: workstationSource.length
      });
    }
    infrastructure.forEach(group => {
      if (!group?.items?.length) return;
      list.push({
        key: group.type,
        label: group.label,
        icon: group.icon || "mdi:server",
        kind: "infra",
        items: group.items,
        count: group.items.length
      });
    });
    return list;
  }, [mappedComputers, rawComputers, infrastructure, t.typeWorkstations]);
  const [typeFilter, setTypeFilter] = useState("all");
  const visibleCategories = useMemo(() => {
    if (typeFilter === "all") return categories;
    return categories.filter(cat => cat.key === typeFilter);
  }, [categories, typeFilter]);
  if (!categories.length) {
    return <div className={portalStyles.emptyState}>
        <Icon icon="mdi:devices" className={portalStyles.emptyStateIcon} aria-hidden />
        <p className={portalStyles.emptyStateTitle}>{t.emptyTitle}</p>
        <p className={portalStyles.empty}>{t.emptyDesc}</p>
      </div>;
  }
  return <div className={styles.root}>
      <div className={styles.filterBar}>
        <span className={styles.filterLabel}>{t.filterByType}</span>
        <div className={styles.filterChips} role="tablist" aria-label={t.filterByType}>
          <button type="button" role="tab" aria-selected={typeFilter === "all"} className={`${styles.chip} ${typeFilter === "all" ? styles.chipActive : ""}`.trim()} onClick={() => setTypeFilter("all")}>
            {t.filterAll}
            <span className={styles.chipCount}>
              {categories.reduce((sum, cat) => sum + cat.count, 0)}
            </span>
          </button>
          {categories.map(cat => <button key={cat.key} type="button" role="tab" aria-selected={typeFilter === cat.key} className={`${styles.chip} ${typeFilter === cat.key ? styles.chipActive : ""}`.trim()} onClick={() => setTypeFilter(cat.key)}>
              <Icon icon={cat.icon} aria-hidden />
              {cat.label}
              <span className={styles.chipCount}>{cat.count}</span>
            </button>)}
        </div>
      </div>

      {visibleCategories.map(cat => {
      const rows = cat.kind === "workstations" ? cat.items.map(mapWorkstationRow) : cat.items.map(mapInfraRow);
      return <section key={cat.key} className={portalStyles.panel}>
            <div className={portalStyles.panelHeader}>
              <span className={portalStyles.panelTitle}>
                <Icon icon={cat.icon} aria-hidden />
                {cat.label}
              </span>
              <span className={portalStyles.panelCount}>{cat.count}</span>
            </div>
            {cat.kind === "workstations" ? mappedComputers.length === 0 && rawComputers.length > 0 ? <>
                  <p className={styles.hint}>{t.noWorkstationsData}</p>
                  <InfraTable rows={rawComputers.map(item => ({
            id: String(item.id || item.name || item.nom),
            name: item.name || item.nom || "-",
            active: item.is_active !== false && item.active !== false,
            monitored: Boolean(item.agent_id || item.agentId || item.checkmk_host_name)
          }))} copy={t} />
                </> : <WorkstationsTable rows={rows} copy={t} /> : <InfraTable rows={rows} copy={t} />}
          </section>;
    })}
    </div>;
}
