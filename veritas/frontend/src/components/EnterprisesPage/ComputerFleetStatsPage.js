import { useCallback, useEffect, useState } from "react";
import { Icon } from "@iconify/react";
import { FaArrowLeft } from "react-icons/fa";
import { toast } from "react-toastify";
import { loadClientEquipmentForFleetStats } from "../../utils/computerFleetStats";
import ComputerFleetStatsView from "./ComputerFleetStatsView";
import pageStyles from "./ComputerFleetStatsPage.module.css";
const EQUIPMENT_TYPE_LABELS = {
  Ordinateurs: "computers"
};
export default function ComputerFleetStatsPage({
  onNavigate,
  statsData
}) {
  const clientId = statsData?.clientId;
  const clientName = statsData?.clientName || "";
  const clientNumber = statsData?.client_number || statsData?.clientNumber || null;
  const equipmentType = statsData?.equipmentType || "Ordinateurs";
  const siteFilter = statsData?.siteFilter || null;
  const [computers, setComputers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const loadComputers = useCallback(async () => {
    if (!clientId) {
      setComputers([]);
      setLoading(false);
      setError("Company not found.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const items = await loadClientEquipmentForFleetStats(clientId, equipmentType, siteFilter);
      setComputers(items);
      if (items.length === 0) {
        setError("No equipment to analyze for this filter.");
      }
    } catch (err) {
      console.error("Fleet statistics loading error:", err);
      setError("Unable to load fleet statistics.");
      setComputers([]);
    } finally {
      setLoading(false);
    }
  }, [clientId, equipmentType, siteFilter]);
  useEffect(() => {
    loadComputers();
  }, [loadComputers]);
  useEffect(() => {
    if (!window.updateTabTitle || !statsData?.clientId) return;
    const typeLabel = EQUIPMENT_TYPE_LABELS[equipmentType] || equipmentType;
    window.updateTabTitle("ComputerFleetStats", statsData, clientName ? `${clientName} · Stats ${typeLabel}` : `Stats ${typeLabel}`);
  }, [statsData, clientName, equipmentType]);
  const handleBack = () => {
    if (!clientId || !onNavigate) return;
    onNavigate("ContratDetail", {
      clientId,
      name: clientName,
      client_number: clientNumber
    });
  };
  const handleRefresh = async () => {
    await loadComputers();
    toast.success("Statistics refreshed.");
  };
  const equipmentLabel = EQUIPMENT_TYPE_LABELS[equipmentType] || equipmentType;
  return <div className={pageStyles.page}>
      <header className={pageStyles.header}>
        <div className={pageStyles.headerLeft}>
          <button type="button" className={pageStyles.backButton} onClick={handleBack}>
            <FaArrowLeft aria-hidden />
            <span>Company record</span>
          </button>
          <div className={pageStyles.headerCopy}>
            <h1 className={pageStyles.title}>
              <Icon icon="mdi:chart-box-outline" className={pageStyles.titleIcon} aria-hidden />
              Fleet statistics · {equipmentLabel}
            </h1>
            <p className={pageStyles.subtitle}>
              {clientName || "Company"}
              {siteFilter ? ` · Site: ${siteFilter}` : ""}
              {!loading && !error ? ` · ${computers.length} workstation${computers.length > 1 ? "s" : ""}` : ""}
            </p>
          </div>
        </div>
        <div className={pageStyles.headerActions}>
          <button type="button" className={pageStyles.actionBtn} onClick={handleRefresh} disabled={loading}>
            <Icon icon="mdi:refresh" aria-hidden />
            Refresh
          </button>
        </div>
      </header>

      <main className={pageStyles.content}>
        {loading ? <div className={pageStyles.loadingState}>
            <Icon icon="mdi:loading" className={pageStyles.spin} aria-hidden />
            <span>Loading statistics…</span>
          </div> : error ? <div className={pageStyles.emptyState}>
            <Icon icon="mdi:chart-box-outline" className={pageStyles.emptyIcon} aria-hidden />
            <p>{error}</p>
            <button type="button" className={pageStyles.actionBtn} onClick={handleBack}>
              Back to record
            </button>
          </div> : <ComputerFleetStatsView computers={computers} />}
      </main>
    </div>;
}
