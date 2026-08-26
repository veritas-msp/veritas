import { useMemo } from "react";
import { Icon } from "@iconify/react";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { getClientPortalCopy } from "./clientPortalI18n";
import {
  formatPortalFieldDisplay,
  getPortalColumnLabel,
  getPortalEquipmentField,
  getPortalTableColumns
} from "./portalEquipmentTables";
import portalStyles from "./ClientDashboard.module.css";
import tableStyles from "../TicketPage/TicketPage.module.css";
import styles from "./ClientDevicesListTab.module.css";

function StatusBadge({ active, copy }) {
  return (
    <span className={`${styles.statusBadge} ${active ? styles.statusActive : styles.statusInactive}`}>
      {active ? copy.statusActive : copy.statusInactive}
    </span>
  );
}

function MonitoringCell({ item, copy, columnKey }) {
  if (columnKey === "agentStatus") {
    const status = getPortalEquipmentField(item, "agentStatus");
    if (status === "online") return <span className={styles.supervisionOk}>{copy.agentOnline}</span>;
    if (status === "offline") return <span className={styles.supervisionWarn}>{copy.agentOffline}</span>;
    if (status === "supervised") return <span className={styles.supervisionOk}>{copy.supervised}</span>;
    return <span className={styles.supervisionMuted}>{copy.notSupervised}</span>;
  }
  const monitored = Boolean(getPortalEquipmentField(item, "monitoring"));
  return monitored
    ? <span className={styles.supervisionOk}>{copy.supervised}</span>
    : <span className={styles.supervisionMuted}>{copy.notSupervised}</span>;
}

function EquipmentTable({ familyKey, items, copy, locale }) {
  const columns = getPortalTableColumns(familyKey);
  if (!items.length) {
    return <p className={styles.emptyCategory}>{copy.noItemsInCategory}</p>;
  }
  return (
    <div className={tableStyles.tablePanel}>
      <div className={tableStyles.tableScroll}>
        <table className={`${tableStyles.table} ${styles.deviceTable}`}>
          <thead>
            <tr>
              {columns.map(colKey => (
                <th key={colKey}>{getPortalColumnLabel(locale, familyKey, colKey, copy)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map(item => (
              <tr key={item.id}>
                {columns.map(colKey => {
                  if (colKey === "activeStatus") {
                    return (
                      <td key={colKey}>
                        <StatusBadge active={getPortalEquipmentField(item, "activeStatus")} copy={copy} />
                      </td>
                    );
                  }
                  if (colKey === "monitoring" || colKey === "agentStatus") {
                    return (
                      <td key={colKey}>
                        <MonitoringCell item={item} copy={copy} columnKey={colKey} />
                      </td>
                    );
                  }
                  return <td key={colKey}>{formatPortalFieldDisplay(item, colKey, copy)}</td>;
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function ClientDevicesListTab({
  categories,
  activeFamilyKey,
  onExport
}) {
  const locale = useAppLocale();
  const copy = useMemo(() => getClientPortalCopy(locale), [locale]);
  const t = copy.devices;
  const activeCategory = useMemo(
    () => categories.find(cat => cat.key === activeFamilyKey) || categories[0] || null,
    [categories, activeFamilyKey]
  );

  if (!categories.length) {
    return (
      <div className={portalStyles.emptyState}>
        <Icon icon="mdi:devices" className={portalStyles.emptyStateIcon} aria-hidden />
        <p className={portalStyles.emptyStateTitle}>{t.emptyTitle}</p>
        <p className={portalStyles.empty}>{t.emptyDesc}</p>
      </div>
    );
  }

  if (!activeCategory) return null;

  return (
    <div className={styles.root}>
      <section className={portalStyles.panel}>
        <div className={portalStyles.panelHeader}>
          <span className={portalStyles.panelTitle}>
            <Icon icon={activeCategory.icon} aria-hidden />
            {activeCategory.label}
          </span>
          <div className={styles.panelActions}>
            <span className={portalStyles.panelCount}>{activeCategory.count}</span>
            <button
              type="button"
              className={styles.exportBtn}
              onClick={() => onExport?.(activeCategory)}
              disabled={!activeCategory.items?.length}
            >
              <Icon icon="mdi:file-delimited-outline" aria-hidden />
              {t.exportCsv}
            </button>
          </div>
        </div>
        <EquipmentTable
          familyKey={activeCategory.key}
          items={activeCategory.items}
          copy={t}
          locale={locale}
        />
      </section>
    </div>
  );
}
