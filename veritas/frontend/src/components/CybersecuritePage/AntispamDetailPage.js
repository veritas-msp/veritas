import { useEffect, useMemo } from "react";
import { Icon } from "@iconify/react";
import { AntispamOverviewPanel } from "../EnterprisesPage/AntispamOverviewModal";
import { getAntispamProvider } from "../EnterprisesPage/antispamFormConfig";
import { buildAntispamDetailNavigationPayload, formatAntispamSolutionSummary, getAntispamSolutionModeLabel, isManualAntispamSolution, normalizeAntispamItem } from "../EnterprisesPage/antispamSolutionUtils";
import { useAppFormatters } from "../../hooks/useAppGeneralSettings";
import { ANTISPAM_STATUS_META, computeAntispamExpirationStatus } from "./antispamMspUtils";
import styles from "./AntispamDetailPage.module.css";
function ManualAntispamSummary({
  item,
  client,
  onBack,
  backLabel
}) {
  const {
    formatDate
  } = useAppFormatters();
  const summary = formatAntispamSolutionSummary(item);
  const provider = getAntispamProvider(summary.providerId || "manual");
  const status = computeAntispamExpirationStatus(item?.expiration);
  const statusMeta = ANTISPAM_STATUS_META[status] || ANTISPAM_STATUS_META.unknown;
  const statusClass = status === "actif" ? styles.statusActive : styles.statusInactive;
  return <div className={styles.detailPage}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <button type="button" className={styles.backButton} onClick={onBack} aria-label={backLabel}>
            <Icon icon="mdi:arrow-left" />
          </button>
          <div className={styles.headerTitle}>
            {provider?.image ? <img src={provider.image.startsWith("/") ? provider.image : `/assets/icons/${provider.image}`} alt="" className={styles.headerLogo} /> : <Icon icon={provider?.icon || "mdi:email-plus-outline"} className={styles.headerLogo} aria-hidden />}
            <div className={styles.headerTitleBlock}>
              <h1>{summary.providerName || provider?.label || "Autre solution"}</h1>
              <div className={styles.headerMeta}>
                {client?.name ? <span className={styles.headerMetaItem}>{client.name}</span> : null}
                <span className={styles.headerMetaItem}>{getAntispamSolutionModeLabel(item)}</span>
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
                <Icon icon="mdi:account-group-outline" />
              </span>
              <div className={styles.statCardContent}>
                <span className={styles.statCardValue}>
                  {item?.utilisateursProteges != null && item.utilisateursProteges !== "" ? item.utilisateursProteges : "-"}
                </span>
                <span className={styles.statCardLabel}>Protected users</span>
              </div>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statCardIcon}>
                <Icon icon="mdi:web" />
              </span>
              <div className={styles.statCardContent}>
                <span className={styles.statCardValue}>
                  {item?.domainesSurveilles != null && item.domainesSurveilles !== "" ? item.domainesSurveilles : "-"}
                </span>
                <span className={styles.statCardLabel}>Watched domains</span>
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
export default function AntispamDetailPage({
  onNavigate,
  antispamData
}) {
  const item = useMemo(() => buildAntispamDetailNavigationPayload(null, antispamData) || normalizeAntispamItem(antispamData), [antispamData]);
  const client = useMemo(() => ({
    id: item?.clientId ?? antispamData?.clientId,
    name: item?.clientName ?? antispamData?.clientName
  }), [item?.clientId, item?.clientName, antispamData?.clientId, antispamData?.clientName]);
  const hasOverview = Boolean(item?.customerId);
  const isManual = isManualAntispamSolution(item);
  useEffect(() => {
    if (!window.updateTabTitle || !antispamData) return;
    window.updateTabTitle("AntispamDetail", {
      clientId: client.id,
      clientName: client.name,
      productName: item?.productName,
      customerId: item?.customerId
    });
  }, [antispamData, client.id, client.name, item?.productName, item?.customerId]);
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
    return <ManualAntispamSummary item={item} client={client} onBack={handleBack} backLabel={backLabel} />;
  }
  if (!hasOverview) {
    return <div className={styles.detailPage}>
        <div className={styles.emptyState}>
          <Icon icon="mdi:email-secure-outline" className={styles.emptyIcon} aria-hidden />
          <p>No Mailinblack solution configured for this entry.</p>
          <button type="button" className={styles.backButton} onClick={handleBack}>
            Back
          </button>
        </div>
      </div>;
  }
  return <AntispamOverviewPanel active asPage client={client} antispamItem={item} onBack={handleBack} backLabel={backLabel} />;
}
