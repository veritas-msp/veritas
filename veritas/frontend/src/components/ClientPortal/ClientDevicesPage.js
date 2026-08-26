import { useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import { toast } from "react-toastify";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import styles from "./ClientDashboard.module.css";
import layout from "../EnterprisesPage/EnterprisesPage.module.css";
import pageStyles from "./ClientPortalPages.module.css";
import ClientPortalFleetStats from "./ClientPortalFleetStats";
import ClientDevicesListTab from "./ClientDevicesListTab";
import EquipmentCsvExportModal from "../EquipementPage/EquipmentCsvExportModal";
import { getClientPortalCopy } from "./clientPortalI18n";
import { mapPortalComputers, usePortalDashboard } from "./usePortalDashboard";
import {
  PORTAL_FAMILY_TONES,
  buildPortalCsvContent,
  downloadPortalCsv,
  getPortalCsvDefaultKeys,
  getPortalExportType,
  getPortalTableColumns,
  slugifyPortalCsvName
} from "./portalEquipmentTables";

function mapWorkstationItem(item) {
  return {
    ...item,
    id: String(item.id || item.dbId || item.name || item.nom),
    name: item.name || item.nom || item.hostname || "-",
    active: item.is_active !== false && item.active !== false,
    monitored: Boolean(item.monitored || item.agentManaged || item.checkmk_host_name || item.agent_id || item.agentId)
  };
}

function mapInfraItem(item) {
  return {
    ...item,
    id: String(item.id || item.name),
    name: item.name || item.nom || "-",
    active: item.active !== false,
    monitored: Boolean(item.monitored)
  };
}

export default function ClientDevicesPage() {
  const { dashboard: rawData, scopedDashboard, loading, error } = usePortalDashboard();
  const data = scopedDashboard || rawData;
  const locale = useAppLocale();
  const copy = useMemo(() => getClientPortalCopy(locale), [locale]);
  const t = copy.devices;
  const [activeTab, setActiveTab] = useState("tables");
  const [activeFamilyKey, setActiveFamilyKey] = useState(null);
  const [csvExport, setCsvExport] = useState(null);
  const mappedComputers = useMemo(() => mapPortalComputers(data), [data]);

  const categories = useMemo(() => {
    if (!data) return [];
    const list = [];
    const workstationSource = mappedComputers.length ? mappedComputers : data.computers || [];
    if (workstationSource.length > 0) {
      list.push({
        key: "workstations",
        label: t.typeWorkstations,
        icon: "mdi:laptop",
        items: workstationSource.map(mapWorkstationItem),
        count: workstationSource.length
      });
    }
    (data.infrastructure || []).forEach(group => {
      if (!group?.items?.length) return;
      list.push({
        key: group.type,
        label: group.label,
        icon: group.icon || "mdi:server",
        items: group.items.map(mapInfraItem),
        count: group.items.length
      });
    });
    return list;
  }, [data, mappedComputers, t.typeWorkstations]);

  const resolvedFamilyKey = activeFamilyKey && categories.some(cat => cat.key === activeFamilyKey)
    ? activeFamilyKey
    : categories[0]?.key || null;

  const pageTabs = useMemo(() => [{
    key: "tables",
    label: t.tabTables,
    icon: "mdi:table",
    tone: "blue"
  }, {
    key: "fleet",
    label: t.tabFleet,
    icon: "mdi:chart-box-outline",
    tone: "violet"
  }], [t.tabTables, t.tabFleet]);

  const handleFamilyClick = key => {
    setActiveFamilyKey(key);
  };

  const handleExport = category => {
    if (!category?.items?.length) {
      toast.error(t.exportEmpty);
      return;
    }
    const visibleKeys = getPortalTableColumns(category.key);
    setCsvExport({
      familyKey: category.key,
      typeLabel: category.label,
      items: category.items,
      defaultKeys: getPortalCsvDefaultKeys(category.key, visibleKeys)
    });
  };

  const handleCsvExport = keys => {
    if (!csvExport) return;
    const csv = buildPortalCsvContent(csvExport.items, keys, locale, csvExport.familyKey, t);
    const date = new Date().toISOString().split("T")[0];
    downloadPortalCsv(csv, `${slugifyPortalCsvName(csvExport.typeLabel)}_${date}.csv`);
    setCsvExport(null);
  };

  if (loading && !data) {
    return (
      <div className={`${styles.mainScrollFill} ${layout.page}`}>
        <div className={styles.loadingInline}>
          <span className={styles.spinner} />
          <span>{copy.common.loading}</span>
        </div>
      </div>
    );
  }
  if (error && !data) {
    return (
      <div className={`${styles.mainScrollFill} ${layout.page}`}>
        <div className={styles.emptyState}>
          <Icon icon="mdi:alert-circle-outline" className={styles.emptyStateIcon} aria-hidden />
          <p className={styles.emptyStateTitle}>{copy.layout.loadError}</p>
        </div>
      </div>
    );
  }
  if (!data) return null;

  const { stats } = data;
  const isEmpty = categories.length === 0;

  return (
    <div className={`${styles.mainScrollFill} ${layout.page}`}>
      <div className={`${styles.mainContent} ${styles.portalShell}`}>
        <header className={styles.topBar}>
          <div>
            <p className={styles.pageEyebrow}>
              <Icon icon="mdi:devices" aria-hidden />
              {t.eyebrow}
            </p>
            <h1 className={styles.pageTitle}>{t.pageTitle}</h1>
          </div>
          <span className={styles.panelCount}>
            {copy.formatEquipmentCount(stats?.totalEquipment ?? 0)}
          </span>
        </header>

        {isEmpty ? (
          <section className={styles.panel}>
            <div className={styles.emptyState}>
              <Icon icon="mdi:devices" className={styles.emptyStateIcon} aria-hidden />
              <p className={styles.emptyStateTitle}>{t.emptyTitle}</p>
              <p className={styles.empty}>{t.emptyDesc}</p>
            </div>
          </section>
        ) : (
          <>
            <div className={pageStyles.kpiRowFamily}>
              {categories.map((cat, index) => {
                const active = resolvedFamilyKey === cat.key;
                const tone = PORTAL_FAMILY_TONES[index % PORTAL_FAMILY_TONES.length];
                return (
                  <button
                    key={cat.key}
                    type="button"
                    className={`${layout.kpiCard} ${active ? layout.kpiCardActive : ""}`.trim()}
                    onClick={() => handleFamilyClick(cat.key)}
                    aria-pressed={active}
                  >
                    <div className={`${layout.kpiIconWrap} ${layout[`kpiIcon_${tone}`] || layout.kpiIcon_blue}`}>
                      <Icon icon={cat.icon} aria-hidden />
                    </div>
                    <div className={layout.kpiBody}>
                      <span className={layout.kpiValue}>{cat.count}</span>
                      <span className={layout.kpiLabel}>{cat.label}</span>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className={pageStyles.kpiRow2}>
              {pageTabs.map(tab => {
                const active = activeTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    className={`${layout.kpiCard} ${active ? layout.kpiCardActive : ""}`.trim()}
                    onClick={() => setActiveTab(tab.key)}
                    aria-pressed={active}
                  >
                    <div className={`${layout.kpiIconWrap} ${layout[`kpiIcon_${tab.tone}`] || layout.kpiIcon_blue}`}>
                      <Icon icon={tab.icon} aria-hidden />
                    </div>
                    <div className={layout.kpiBody}>
                      <span className={layout.kpiLabel}>{tab.label}</span>
                    </div>
                  </button>
                );
              })}
            </div>

            {activeTab === "fleet" ? (
              (() => {
                const activeCategory = categories.find(cat => cat.key === resolvedFamilyKey);
                const fleetItems = resolvedFamilyKey === "workstations"
                  ? mappedComputers
                  : activeCategory?.items || [];
                return fleetItems.length > 0 ? (
                  <ClientPortalFleetStats
                    items={fleetItems}
                    computers={resolvedFamilyKey === "workstations" ? mappedComputers : fleetItems}
                    familyKey={activeCategory?.key || resolvedFamilyKey || "workstations"}
                    clientSsids={data?.client?.ssids || []}
                  />
                ) : (
                  <section className={styles.panel}>
                    <div className={styles.emptyState}>
                      <Icon icon="mdi:chart-box-outline" className={styles.emptyStateIcon} aria-hidden />
                      <p className={styles.empty}>{t.noFleetData || t.noWorkstationsData}</p>
                    </div>
                  </section>
                );
              })()
            ) : (
              <ClientDevicesListTab
                categories={categories}
                activeFamilyKey={resolvedFamilyKey}
                onExport={handleExport}
              />
            )}
          </>
        )}
      </div>

      <EquipmentCsvExportModal
        open={Boolean(csvExport)}
        locale={locale}
        equipmentType={csvExport ? getPortalExportType(csvExport.familyKey) : "Servers"}
        typeLabel={csvExport?.typeLabel || ""}
        defaultKeys={csvExport?.defaultKeys || []}
        onClose={() => setCsvExport(null)}
        onExport={handleCsvExport}
      />
    </div>
  );
}
