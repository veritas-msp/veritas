import { useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import { toast } from "react-toastify";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { loadClientEquipmentForFleetStats } from "../../utils/computerFleetStats";
import { canonicalizeFleetFamily, isComputerFleetFamily } from "../../utils/equipmentFamilyStats";
import { getEquipmentFamilyStatsCopy } from "../../utils/equipmentFamilyStatsI18n";
import SmartTooltip from "../SmartTooltip";
import ComputerFleetStatsView from "./ComputerFleetStatsView";
import EquipmentFamilyStatsView from "./EquipmentFamilyStatsView";
import pageStyles from "./ComputerFleetStatsPage.module.css";

export default function ComputerFleetStatsPage({
  onNavigate,
  statsData
}) {
  const locale = useAppLocale();
  const copy = useMemo(() => getEquipmentFamilyStatsCopy(locale), [locale]);
  const clientId = statsData?.clientId;
  const clientName = statsData?.clientName || "";
  const clientNumber = statsData?.client_number || statsData?.clientNumber || null;
  const equipmentType = statsData?.equipmentType || "Ordinateurs";
  const siteFilter = statsData?.siteFilter || null;
  const familyKey = canonicalizeFleetFamily(equipmentType);
  const familyLabel = statsData?.familyLabel
    || (String(equipmentType || "").startsWith("Custom:")
      ? String(equipmentType).slice("Custom:".length)
      : (copy.familyTitle[familyKey] || equipmentType));
  const [items, setItems] = useState([]);
  const [clientSsids, setClientSsids] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadItems = useCallback(async () => {
    if (!clientId) {
      setItems([]);
      setClientSsids([]);
      setLoading(false);
      setError("Company not found.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const payload = await loadClientEquipmentForFleetStats(clientId, equipmentType, siteFilter);
      const nextItems = Array.isArray(payload?.items) ? payload.items : Array.isArray(payload) ? payload : [];
      setItems(nextItems);
      setClientSsids(Array.isArray(payload?.clientSsids) ? payload.clientSsids : []);
      if (nextItems.length === 0) {
        setError(copy.emptyFleet);
      }
    } catch (err) {
      console.error("Fleet statistics loading error:", err);
      setError(copy.emptyFleet);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [clientId, equipmentType, siteFilter, copy.emptyFleet]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  useEffect(() => {
    if (!window.updateTabTitle || !statsData?.clientId) return;
    window.updateTabTitle("ComputerFleetStats", statsData, clientName ? `${clientName} · ${familyLabel}` : familyLabel);
  }, [statsData, clientName, familyLabel]);

  const handleBack = () => {
    if (!clientId || !onNavigate) return;
    onNavigate("ContratDetail", {
      clientId,
      name: clientName,
      client_number: clientNumber
    });
  };

  const handleRefresh = async () => {
    await loadItems();
    toast.success("Statistics refreshed.");
  };

  return <div className={pageStyles.page}>
      <header className={pageStyles.header}>
        <div className={pageStyles.headerLeft}>
          <div className={pageStyles.headerCopy}>
            <h1 className={pageStyles.title}>
              <Icon icon="mdi:chart-box-outline" className={pageStyles.titleIcon} aria-hidden />
              {familyLabel}
            </h1>
            <p className={pageStyles.subtitle}>
              {clientName || "Company"}
              {siteFilter ? ` · ${siteFilter}` : ""}
              {!loading && !error ? ` · ${items.length}` : ""}
            </p>
          </div>
        </div>
        <div className={pageStyles.headerActions}>
          <SmartTooltip as="span" content="Refresh">
            <button type="button" className={pageStyles.iconBtn} onClick={handleRefresh} disabled={loading} aria-label="Refresh">
              <Icon icon={loading ? "mdi:loading" : "mdi:refresh"} className={loading ? pageStyles.spin : undefined} aria-hidden />
            </button>
          </SmartTooltip>
        </div>
      </header>

      <main className={pageStyles.content}>
        {loading ? <div className={pageStyles.loadingState}>
            <Icon icon="mdi:loading" className={pageStyles.spin} aria-hidden />
            <span>Loading statistics…</span>
          </div> : error ? <div className={pageStyles.emptyState}>
            <Icon icon="mdi:chart-box-outline" className={pageStyles.emptyIcon} aria-hidden />
            <p>{error}</p>
            <button type="button" className={pageStyles.textBtn} onClick={handleBack}>
              Back to record
            </button>
          </div> : isComputerFleetFamily(equipmentType)
            ? <ComputerFleetStatsView computers={items} />
            : <EquipmentFamilyStatsView items={items} familyType={equipmentType} clientSsids={clientSsids} />}
      </main>
    </div>;
}
