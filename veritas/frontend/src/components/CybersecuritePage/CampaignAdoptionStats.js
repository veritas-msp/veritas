import { useState, useEffect, useMemo } from "react";
import React from "react";
import { Icon } from "@iconify/react";
import { FaDownload } from "react-icons/fa";
import { toast } from 'react-toastify';
import { getCampaignStats, downloadCampaignReport } from "../../api/campaigns";
import SmartTooltip from "../SmartTooltip";
import styles from "./CampaignAdoptionStats.module.css";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { getCampaignDetailCopy } from "./campaignDetailI18n";
export default function CampaignAdoptionStats({
  campaign,
  clientId,
  stats: propsStats,
  onCampaignUpdate,
  onStatsUpdate,
  hideTitle = false,
  copy
}) {
  const locale = useAppLocale();
  const localCopy = useMemo(() => getCampaignDetailCopy(locale), [locale]);
  const detailCopy = copy || localCopy;
  const adoption = detailCopy.adoption;
  const [stats, setStats] = useState(propsStats || null);
  const [loading, setLoading] = useState(!propsStats);
  useEffect(() => {
    if (propsStats) {
      setStats(propsStats);
      setLoading(false);
    } else if (campaign && clientId) {
      loadStats();
    }
  }, [propsStats, campaign, clientId]);
  const loadStats = async () => {
    try {
      setLoading(true);
      const statsData = await getCampaignStats(clientId, campaign.id);
      setStats(statsData);
      if (onStatsUpdate) {
        onStatsUpdate(statsData);
      }
    } catch (error) {
      console.error('Error while loading des statistiques:', error);
      toast.error(adoption.toastLoadError);
    } finally {
      setLoading(false);
    }
  };
  if (loading) {
    return <div className={styles.adoptionBlock}>
        {!hideTitle && <h3 className={styles.groupTitle}>{adoption.title}</h3>}
        <div className={styles.loadingState}>
          <Icon icon="mdi:loading" className={styles.loadingIcon} />
          <p>{adoption.loading}</p>
        </div>
      </div>;
  }
  if (!stats) {
    return null;
  }
  const hasStartSnapshot = stats.start !== null && stats.start !== undefined;
  const hasEndSnapshot = stats.end !== null && stats.end !== undefined;
  const renderSnapshot = (label, data) => {
    if (!data) {
      return <div className={styles.snapshotBlock}>
          <div className={styles.snapshotBlockTitle}>{label}</div>
          <div className={styles.snapshotEmpty}>-</div>
        </div>;
    }
    const adminMfa = data.adminMfaPercentage ?? data.mfaPercentage ?? 0;
    const nonAdminMfa = data.nonAdminMfaPercentage ?? data.userMfaPercentage ?? data.mfaPercentage ?? 0;
    const nonAdminCount = data.nonAdminCount ?? (data.userCount != null && data.adminCount != null ? data.userCount - data.adminCount : 0);
    return <div className={styles.snapshotBlock}>
        <div className={styles.snapshotBlockTitle}>{label}</div>
        <div className={styles.snapshotBlockDate}>
          {new Date(data.createdAt).toLocaleDateString(locale, {
          day: '2-digit',
          month: 'short',
          year: 'numeric'
        })}
        </div>
        <dl className={styles.snapshotKpis}>
          <div className={styles.snapshotKpi}>
            <dt>{adoption.admins}</dt>
            <dd>{data.adminCount}</dd>
          </div>
          <div className={styles.snapshotKpi}>
            <dt>{adoption.nonAdmin}</dt>
            <dd>{nonAdminCount}</dd>
          </div>
          <div className={styles.snapshotKpi}>
            <dt>{adoption.mfaAdmins}</dt>
            <dd>{Number(adminMfa).toFixed(1)}%</dd>
          </div>
          <div className={styles.snapshotKpi}>
            <dt>{adoption.mfaNonAdmin}</dt>
            <dd>{Number(nonAdminMfa).toFixed(1)}%</dd>
          </div>
        </dl>
      </div>;
  };
  const handleDownloadReport = async () => {
    if (!clientId || !campaign?.id) return;
    try {
      const safeName = String(campaign.name || campaign.id).replace(/[<>:"/\\|?*]+/g, " ").trim().replace(/\s+/g, "_");
      await downloadCampaignReport(clientId, campaign.id, `Campaign_report_${safeName}.pdf`);
      toast.success(adoption.downloadPdf);
    } catch (error) {
      console.error("Error téléchargement rapport:", error);
      toast.error(error.message || adoption.toastLoadError);
    }
  };
  return <div className={styles.adoptionBlock}>
      {!hideTitle && <h3 className={styles.groupTitle}>{adoption.title}</h3>}

      {!hasStartSnapshot ? <div className={styles.adoptionEmpty}>
          <Icon icon="mdi:chart-timeline-variant" className={styles.adoptionEmptyIcon} />
          <p className={styles.adoptionEmptyTitle}>{adoption.emptyTitle}</p>
          <p className={styles.adoptionEmptyText}>
            {adoption.emptyText}
          </p>
        </div> : <>
          <div className={styles.snapshotsRow}>
            {renderSnapshot(adoption.start, stats.start)}
            {renderSnapshot(adoption.end, stats.end)}
          </div>

          {hasStartSnapshot && hasEndSnapshot && <div className={styles.comparisonRow}>
              <div className={styles.comparisonKpis}>
                {stats.comparison && <>
                    <div className={styles.comparisonKpi}>
                      <span className={styles.comparisonKpiLabel}>{adoption.mfaAdmins}</span>
                      <span className={styles.comparisonKpiVal}>
                        {(stats.comparison.adminMfaPercentage?.start ?? 0).toFixed(1)}% → {(stats.comparison.adminMfaPercentage?.end ?? 0).toFixed(1)}%
                        {stats.comparison.adminMfaPercentage?.change != null && <span className={styles.comparisonDelta}> {stats.comparison.adminMfaPercentage.change >= 0 ? '+' : ''}{stats.comparison.adminMfaPercentage.change.toFixed(1)}%</span>}
                      </span>
                    </div>
                    <div className={styles.comparisonKpi}>
                      <span className={styles.comparisonKpiLabel}>{adoption.mfaNonAdmin}</span>
                      <span className={styles.comparisonKpiVal}>
                        {(stats.comparison.nonAdminMfaPercentage?.start ?? stats.comparison.userMfaPercentage?.start ?? 0).toFixed(1)}% → {(stats.comparison.nonAdminMfaPercentage?.end ?? stats.comparison.userMfaPercentage?.end ?? 0).toFixed(1)}%
                        {(stats.comparison.nonAdminMfaPercentage?.change ?? stats.comparison.userMfaPercentage?.change) != null && <span className={styles.comparisonDelta}> {(stats.comparison.nonAdminMfaPercentage?.change ?? stats.comparison.userMfaPercentage?.change) >= 0 ? '+' : ''}{(stats.comparison.nonAdminMfaPercentage?.change ?? stats.comparison.userMfaPercentage?.change).toFixed(1)}%</span>}
                      </span>
                    </div>
                  </>}
              </div>
              <SmartTooltip as="span" content={adoption.downloadPdf}>
                <button type="button" className={`${styles.headerActionButton} ${styles.headerActionButtonInactive}`} onClick={handleDownloadReport} aria-label={adoption.downloadPdf}>
                  <FaDownload className={styles.headerActionIcon} />
                </button>
              </SmartTooltip>
            </div>}
        </>}
    </div>;
}
