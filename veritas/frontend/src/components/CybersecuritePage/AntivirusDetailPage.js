import { useEffect, useMemo } from "react";
import { Icon } from "@iconify/react";
import { AntivirusOverviewPanel } from "../EnterprisesPage/AntivirusOverviewModal";
import { getAntivirusProvider } from "../EnterprisesPage/antivirusFormConfig";
import { buildAntivirusDetailNavigationPayload, formatAntivirusSolutionSummary, getAntivirusSolutionModeLabel, isManualAntivirusSolution, normalizeAntivirusItem } from "../EnterprisesPage/antivirusSolutionUtils";
import { useAppFormatters } from "../../hooks/useAppGeneralSettings";
import { ANTIVIRUS_STATUS_META, computeAntivirusExpirationStatus } from "./antivirusMspUtils";
import styles from "./AntivirusDetailPage.module.css";
function ManualAntivirusSummary({
  item,
  client,
  onBack,
  backLabel
}) {
  const {
    formatDate
  } = useAppFormatters();
  const summary = formatAntivirusSolutionSummary(item);
  const provider = getAntivirusProvider(summary.providerId || "manual");
  const status = computeAntivirusExpirationStatus(item?.expiration);
  const statusMeta = ANTIVIRUS_STATUS_META[status] || ANTIVIRUS_STATUS_META.unknown;
  const statusClass = status === "actif" ? styles.statusActive : status === "expire_bientot" ? styles.statusInactive : status === "inactif" ? styles.statusExpired : styles.statusInactive;
  const totalLicenses = item?.licencesTotales ?? item?.totalLicenses;
  const usedLicenses = item?.licencesUtilisees ?? item?.usedLicenses;
  return <div className={styles.detailPage}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <button type="button" className={styles.backButton} onClick={onBack} aria-label={backLabel}>
            <Icon icon="mdi:arrow-left" />
          </button>
          <div className={styles.headerTitle}>
            {provider?.image ? <img src={provider.image} alt="" className={styles.headerLogo} /> : <Icon icon={provider?.icon || "mdi:shield-plus-outline"} className={styles.headerLogo} aria-hidden />}
            <div className={styles.headerTitleBlock}>
              <h1>{summary.providerName || provider?.label || "Autre solution"}</h1>
              <div className={styles.headerMeta}>
                {client?.name ? <span className={styles.headerMetaItem}>{client.name}</span> : null}
                <span className={styles.headerMetaItem}>{getAntivirusSolutionModeLabel(item)}</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className={styles.content}>
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Information</h2>
          <div className={styles.statsCards}>
            <div className={styles.statCard}>
              <span className={styles.statCardIcon}>
                <Icon icon="mdi:shield-check-outline" />
              </span>
              <div className={styles.statCardContent}>
                <span className={styles.statCardValue}>
                  <span className={`${styles.statusBadge} ${statusClass}`}>{statusMeta.label}</span>
                </span>
                <span className={styles.statCardLabel}>Status</span>
              </div>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statCardIcon}>
                <Icon icon="mdi:key-outline" />
              </span>
              <div className={styles.statCardContent}>
                <span className={styles.statCardValue}>{usedLicenses != null && usedLicenses !== "" ? usedLicenses : "-"}</span>
                <span className={styles.statCardLabel}>Licenses used</span>
              </div>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statCardIcon}>
                <Icon icon="mdi:counter" />
              </span>
              <div className={styles.statCardContent}>
                <span className={styles.statCardValue}>{totalLicenses != null && totalLicenses !== "" ? totalLicenses : "-"}</span>
                <span className={styles.statCardLabel}>Total licenses</span>
              </div>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statCardIcon}>
                <Icon icon="mdi:calendar-clock-outline" />
              </span>
              <div className={styles.statCardContent}>
                <span className={styles.statCardValue}>{formatDate(item?.expiration) || "-"}</span>
                <span className={styles.statCardLabel}>Expiration</span>
              </div>
            </div>
          </div>
        </section>

        <section className={styles.section}>
          <p className={styles.cellMuted} style={{
          margin: 0
        }}>
            Solution saved manually on the company record. No API sync available for this provider.
          </p>
        </section>
      </div>
    </div>;
}
export default function AntivirusDetailPage({
  onNavigate,
  antivirusData
}) {
  const item = useMemo(() => buildAntivirusDetailNavigationPayload(null, antivirusData) || normalizeAntivirusItem(antivirusData), [antivirusData]);
  const client = useMemo(() => ({
    id: item?.clientId ?? antivirusData?.clientId,
    name: item?.clientName ?? antivirusData?.clientName
  }), [item?.clientId, item?.clientName, antivirusData?.clientId, antivirusData?.clientName]);
  const hasOverview = Boolean(item?.companyId);
  const isManual = isManualAntivirusSolution(item);
  useEffect(() => {
    if (!window.updateTabTitle || !antivirusData) return;
    window.updateTabTitle("AntivirusDetail", {
      clientId: client.id,
      clientName: client.name,
      productName: item?.productName,
      companyId: item?.companyId
    });
  }, [antivirusData, client.id, client.name, item?.productName, item?.companyId]);
  const handleBack = () => {
    if (!onNavigate) return;
    if (client.id) {
      onNavigate("ContratDetail", {
        clientId: client.id,
        name: client.name
      });
      return;
    }
    onNavigate("Cybersecurite");
  };
  const backLabel = client.id ? "Company record" : "Cybersecurity";
  if (!hasOverview && isManual) {
    return <ManualAntivirusSummary item={item} client={client} onBack={handleBack} backLabel={backLabel} />;
  }
  if (!hasOverview) {
    return <div className={styles.detailPage}>
        <div className={styles.emptyState}>
          <Icon icon="simple-icons:bitdefender" className={styles.emptyIcon} aria-hidden />
          <p>No GravityZone solution configured for this entry.</p>
          <button type="button" className={styles.backButton} onClick={handleBack}>
            Back
          </button>
        </div>
      </div>;
  }
  return <AntivirusOverviewPanel active asPage client={client} antivirusItem={item} onBack={handleBack} backLabel={backLabel} />;
}
