import { useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import { toast } from "react-toastify";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { loadClientEquipmentForFleetStats } from "../../utils/computerFleetStats";
import { canonicalizeFleetFamily, getFleetFamilyIcon, isComputerFleetFamily } from "../../utils/equipmentFamilyStats";
import { getEquipmentFamilyStatsCopy } from "../../utils/equipmentFamilyStatsI18n";
import MspPageHero from "../Misc/MspPageHero/MspPageHero";
import SmartTooltip from "../SmartTooltip";
import ComputerFleetStatsView from "./ComputerFleetStatsView";
import EquipmentFamilyStatsView from "./EquipmentFamilyStatsView";
import cyberStyles from "../CybersecuritePage/CybersecuritePage.module.css";
import layout from "./EnterprisesPage.module.css";
import solutionStyles from "./SolutionDetailPageLayout.module.css";
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
      setError(copy.companyNotFound);
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
  }, [clientId, equipmentType, siteFilter, copy.emptyFleet, copy.companyNotFound]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  useEffect(() => {
    if (!window.updateTabTitle || !statsData?.clientId) return;
    window.updateTabTitle("ComputerFleetStats", statsData);
  }, [statsData]);

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
    toast.success(copy.refreshed);
  };

  const subtitle = [
    clientName || copy.companyFallback,
    siteFilter,
    !loading && !error ? String(items.length) : null
  ].filter(Boolean).join(" · ");

  return (
    <div className={`${cyberStyles.mspPage} ${layout.page} msp-page-grid`}>
      <div className={cyberStyles.mspLayout}>
        <div className={cyberStyles.mspMain}>
          <MspPageHero
            eyebrow={copy.pageEyebrow}
            title={familyLabel}
            subtitle={subtitle}
            icon={getFleetFamilyIcon(equipmentType, statsData?.familyIcon)}
            actions={
              <>
                {clientId && onNavigate ? (
                  <button type="button" className={solutionStyles.backBtn} onClick={handleBack}>
                    <Icon icon="mdi:arrow-left" aria-hidden />
                    <span>{copy.back}</span>
                  </button>
                ) : null}
                <SmartTooltip content={copy.refresh}>
                  <button
                    type="button"
                    className={layout.iconBtn}
                    onClick={handleRefresh}
                    disabled={loading}
                    aria-label={copy.refresh}
                  >
                    <Icon icon={loading ? "mdi:loading" : "mdi:refresh"} className={loading ? pageStyles.spin : undefined} aria-hidden />
                  </button>
                </SmartTooltip>
              </>
            }
          />

          <main className={cyberStyles.mspContent}>
            <div className={pageStyles.body}>
              {loading ? (
                <div className={pageStyles.loadingState}>
                  <Icon icon="mdi:loading" className={pageStyles.spin} aria-hidden />
                  <span>{copy.loading}</span>
                </div>
              ) : error ? (
                <div className={pageStyles.emptyState}>
                  <Icon icon="mdi:chart-box-outline" className={pageStyles.emptyIcon} aria-hidden />
                  <p>{error}</p>
                  {clientId && onNavigate ? (
                    <button type="button" className={pageStyles.textBtn} onClick={handleBack}>
                      {copy.back}
                    </button>
                  ) : null}
                </div>
              ) : isComputerFleetFamily(equipmentType) ? (
                <ComputerFleetStatsView computers={items} />
              ) : (
                <EquipmentFamilyStatsView items={items} familyType={equipmentType} clientSsids={clientSsids} />
              )}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
