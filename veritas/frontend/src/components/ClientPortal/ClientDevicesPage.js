import { useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import { toast } from "react-toastify";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import styles from "./ClientDashboard.module.css";
import pageStyles from "./ClientPortalPages.module.css";
import ClientPortalFleetStats from "./ClientPortalFleetStats";
import ClientDevicesListTab from "./ClientDevicesListTab";
import EquipmentCsvExportModal from "../EquipementPage/EquipmentCsvExportModal";
import MspPageHero from "../Misc/MspPageHero/MspPageHero";
import PortalTabBar from "./PortalTabBar";
import { getClientPortalCopy } from "./clientPortalI18n";
import { mapPortalComputers, usePortalDashboard } from "./usePortalDashboard";
import {
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
    type: item.type || "Ordinateurs",
    active: item.is_active !== false && item.active !== false,
    is_active: item.is_active !== false && item.active !== false,
    monitored: Boolean(item.monitored || item.agentManaged || item.checkmk_host_name || item.agent_id || item.agentId)
  };
}

function mapInfraItem(item) {
  return {
    ...item,
    id: String(item.id || item.name),
    name: item.name || item.nom || "-",
    typeServer: item.typeServer || item.serverType || "",
    manufacturer: item.manufacturer || item.fabricant || item.marque || "",
    active: item.active !== false,
    is_active: item.active !== false,
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

  const familyTabs = useMemo(
    () => categories.map(cat => ({
      key: cat.key,
      label: cat.label,
      icon: cat.icon,
      count: cat.count
    })),
    [categories]
  );

  const viewTabs = useMemo(() => [{
    key: "tables",
    label: t.tabTables,
    icon: "mdi:table"
  }, {
    key: "fleet",
    label: t.tabFleet,
    icon: "mdi:chart-box-outline"
  }], [t.tabTables, t.tabFleet]);

  const handleExport = (category, visibleKeys) => {
    if (!category?.items?.length) {
      toast.error(t.exportEmpty);
      return;
    }
    const keys = Array.isArray(visibleKeys) && visibleKeys.length
      ? visibleKeys
      : getPortalTableColumns(category.key);
    setCsvExport({
      familyKey: category.key,
      typeLabel: category.label,
      items: category.items,
      defaultKeys: getPortalCsvDefaultKeys(category.key, keys)
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
      <div className={`${styles.mainScrollFill} ${styles.portalPage}`}>
        <div className={styles.loadingInline}>
          <span className={styles.spinner} />
          <span>{copy.common.loading}</span>
        </div>
      </div>
    );
  }
  if (error && !data) {
    return (
      <div className={`${styles.mainScrollFill} ${styles.portalPage}`}>
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
    <div className={`${styles.mainScrollFill} ${styles.portalPage}`}>
      <div className={`${styles.mainContent} ${styles.portalShell}`}>
        <MspPageHero
          className={pageStyles.portalPageHero}
          eyebrow={t.eyebrow}
          title={t.pageTitle}
          subtitle={copy.formatEquipmentCount(stats?.totalEquipment ?? 0)}
          icon="mdi:devices"
        />

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
            <div className={pageStyles.tabStack}>
              <PortalTabBar
                items={familyTabs}
                activeKey={resolvedFamilyKey}
                onChange={setActiveFamilyKey}
                ariaLabel={t.filterByType}
              />
              <PortalTabBar
                items={viewTabs}
                activeKey={activeTab}
                onChange={setActiveTab}
                ariaLabel={t.tabTables}
              />
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
        defaultKeys={csvExport?.defaultKeys}
        onClose={() => setCsvExport(null)}
        onExport={handleCsvExport}
      />
    </div>
  );
}
