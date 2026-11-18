import { useState, useEffect, useMemo } from "react";
import React from "react";
import { Icon } from "@iconify/react";
import { FaDownload } from "react-icons/fa";
import { toast } from "react-toastify";
import { getCampaignStats, downloadCampaignReport } from "../../api/campaigns";
import SmartTooltip from "../SmartTooltip";
import styles from "./CampaignAdoptionStats.module.css";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { getCampaignDetailCopy } from "./campaignDetailI18n";

function fmtPct(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  return `${n.toFixed(1)}%`;
}

function fmtDelta(value, suffix = "") {
  const n = Number(value);
  if (!Number.isFinite(n)) return "";
  const sign = n > 0 ? "+" : "";
  const body = Number.isInteger(n) ? String(n) : n.toFixed(1);
  return `${sign}${body}${suffix}`;
}

function fmtDate(value, locale) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString(locale, {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  } catch {
    return "—";
  }
}

export default function CampaignAdoptionStats({
  campaign,
  clientId,
  stats: propsStats,
  onCampaignUpdate,
  onStatsUpdate,
  hideTitle = false,
  compact = false,
  copy
}) {
  const locale = useAppLocale();
  const localCopy = useMemo(() => getCampaignDetailCopy(locale), [locale]);
  const detailCopy = copy || localCopy;
  const adoption = detailCopy.adoption || {};
  const [stats, setStats] = useState(propsStats || null);
  const [loading, setLoading] = useState(!propsStats);
  const [downloading, setDownloading] = useState(false);

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
      if (onStatsUpdate) onStatsUpdate(statsData);
    } catch (error) {
      console.error("Error while loading des statistiques:", error);
      toast.error(adoption.toastLoadError);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={`${styles.adoptionBlock} ${compact ? styles.adoptionBlockCompact : ""}`.trim()}>
        {!hideTitle && <h3 className={styles.groupTitle}>{adoption.title}</h3>}
        <div className={`${styles.loadingState} ${compact ? styles.loadingStateCompact : ""}`.trim()}>
          <Icon icon="mdi:loading" className={styles.loadingIcon} />
          <p>{adoption.loading}</p>
        </div>
      </div>
    );
  }

  if (!stats) return null;

  const hasStartSnapshot = Boolean(stats.start);
  const hasEndSnapshot = Boolean(stats.end);
  const canDownload = Boolean(hasStartSnapshot && hasEndSnapshot);

  const renderSnapshot = (label, data, pendingLabel) => {
    if (!data) {
      return (
        <article className={styles.snapshotCard}>
          <header className={styles.snapshotCardHead}>
            <h4 className={styles.snapshotBlockTitle}>{label}</h4>
          </header>
          <p className={styles.snapshotEmpty}>{pendingLabel || "—"}</p>
        </article>
      );
    }
    const kpis = [
      { label: adoption.users || "Utilisateurs", value: data.userCount ?? "—" },
      { label: adoption.mfaEnabled || "MFA activé", value: data.mfaEnabledCount ?? "—" },
      { label: adoption.admins, value: data.adminCount ?? "—" },
      { label: adoption.nonAdmin, value: data.nonAdminCount ?? "—" },
      { label: adoption.mfaGlobal || "Taux MFA", value: fmtPct(data.mfaPercentage) },
      { label: adoption.mfaAdmins, value: fmtPct(data.adminMfaPercentage) },
      { label: adoption.mfaNonAdmin, value: fmtPct(data.nonAdminMfaPercentage) },
      {
        label: adoption.phishingResistant || "Phishing-resistant",
        value: (
          <>
            {data.phishingResistantCount ?? 0}
            <span className={styles.snapshotKpiMuted}> ({fmtPct(data.phishingResistantPercentage)})</span>
          </>
        )
      },
      { label: adoption.withoutMfa || "Sans MFA", value: data.mfaDisabledCount ?? "—" },
      { label: adoption.recentMfa || "Inscriptions 30 j", value: data.recentlyRegisteredMfa ?? 0 }
    ];
    return (
      <article className={styles.snapshotCard}>
        <header className={styles.snapshotCardHead}>
          <h4 className={styles.snapshotBlockTitle}>{label}</h4>
          <time className={styles.snapshotBlockDate}>{fmtDate(data.createdAt || data.capturedAt, locale)}</time>
        </header>
        <dl className={styles.snapshotKpis}>
          {kpis.map(item => (
            <div key={item.label} className={styles.snapshotKpi}>
              <dt>{item.label}</dt>
              <dd>{item.value}</dd>
            </div>
          ))}
        </dl>
        {data.methods ? (
          <div className={styles.methodsRow} title={adoption.methodsHint || ""}>
            <span>Auth {data.methods.authenticator || 0}</span>
            <span>Tél. {data.methods.phone || 0}</span>
            <span>FIDO2 {data.methods.fido2 || 0}</span>
            <span>OTP {data.methods.softwareOath || 0}</span>
          </div>
        ) : null}
      </article>
    );
  };

  const handleDownloadReport = async () => {
    if (!clientId || !campaign?.id || !canDownload) return;
    try {
      setDownloading(true);
      const safeName = String(campaign.name || campaign.id)
        .replace(/[<>:"/\\|?*]+/g, " ")
        .trim()
        .replace(/\s+/g, "_");
      await downloadCampaignReport(clientId, campaign.id, `Rapport_MFA_${safeName}.pdf`);
      toast.success(adoption.downloadPdfDone || adoption.downloadPdf);
    } catch (error) {
      console.error("Error téléchargement rapport:", error);
      toast.error(error.message || adoption.toastLoadError);
    } finally {
      setDownloading(false);
    }
  };

  const comparisonItems = [];
  if (stats.comparison) {
    const c = stats.comparison;
    comparisonItems.push(
      {
        label: adoption.mfaGlobal || "Taux MFA",
        value: `${fmtPct(c.mfaPercentage?.start)} → ${fmtPct(c.mfaPercentage?.end)}`,
        delta: fmtDelta(c.mfaPercentage?.change, "%")
      },
      {
        label: adoption.mfaEnabled || "MFA activé",
        value: `${c.mfaEnabledCount?.start ?? 0} → ${c.mfaEnabledCount?.end ?? 0}`,
        delta: fmtDelta(c.mfaEnabledCount?.change)
      },
      {
        label: adoption.mfaAdmins,
        value: `${fmtPct(c.adminMfaPercentage?.start)} → ${fmtPct(c.adminMfaPercentage?.end)}`,
        delta: fmtDelta(c.adminMfaPercentage?.change, "%")
      },
      {
        label: adoption.mfaNonAdmin,
        value: `${fmtPct(c.nonAdminMfaPercentage?.start)} → ${fmtPct(c.nonAdminMfaPercentage?.end)}`,
        delta: fmtDelta(c.nonAdminMfaPercentage?.change, "%")
      },
      {
        label: adoption.phishingResistant || "Phishing-resistant",
        value: `${c.phishingResistantCount?.start ?? 0} → ${c.phishingResistantCount?.end ?? 0}`,
        delta: fmtDelta(c.phishingResistantCount?.change)
      },
      {
        label: adoption.withoutMfa || "Sans MFA",
        value: `${c.mfaDisabledCount?.start ?? 0} → ${c.mfaDisabledCount?.end ?? 0}`,
        delta: fmtDelta(c.mfaDisabledCount?.change)
      }
    );
  }

  return (
    <div className={`${styles.adoptionBlock} ${compact ? styles.adoptionBlockCompact : ""}`.trim()}>
      {!hideTitle && <h3 className={styles.groupTitle}>{adoption.title}</h3>}

      {!hasStartSnapshot ? (
        <div className={`${styles.adoptionEmpty} ${compact ? styles.adoptionEmptyCompact : ""}`.trim()}>
          <Icon icon="mdi:camera-timer" className={styles.adoptionEmptyIcon} />
          <p className={styles.adoptionEmptyTitle}>{adoption.emptyTitle}</p>
          <p className={styles.adoptionEmptyText}>{adoption.emptyText}</p>
        </div>
      ) : (
        <div className={styles.adoptionLayout}>
          <section className={styles.snapshotsSection} aria-label={adoption.snapshotsSection || adoption.title}>
            <div className={`${styles.snapshotsRow} ${compact ? styles.snapshotsRowCompact : ""}`.trim()}>
              {renderSnapshot(adoption.start, stats.start)}
              {renderSnapshot(adoption.end, stats.end, adoption.endPending || adoption.end)}
            </div>
          </section>

          <section className={`${styles.comparisonSection} ${compact ? styles.comparisonRowCompact : ""}`.trim()}>
            <div className={styles.comparisonHead}>
              <h4 className={styles.comparisonTitle}>{adoption.comparisonTitle || "Évolution"}</h4>
              {canDownload ? (
                <SmartTooltip as="span" content={adoption.downloadPdf}>
                  <button
                    type="button"
                    className={`${styles.headerActionButton} ${styles.headerActionButtonInactive} ${styles.downloadBtn}`.trim()}
                    onClick={handleDownloadReport}
                    disabled={downloading}
                    aria-label={adoption.downloadPdf}
                  >
                    {downloading ? <Icon icon="mdi:loading" className={styles.loadingIcon} /> : <FaDownload className={styles.headerActionIcon} />}
                    <span className={styles.downloadBtnLabel}>{adoption.downloadReport || adoption.downloadPdf}</span>
                  </button>
                </SmartTooltip>
              ) : (
                <p className={styles.reportHint}>{adoption.reportHint || "Arrêtez la campagne pour générer le rapport début/fin."}</p>
              )}
            </div>
            {comparisonItems.length > 0 ? (
              <div className={styles.comparisonGrid}>
                {comparisonItems.map(item => (
                  <div key={item.label} className={styles.comparisonKpi}>
                    <span className={styles.comparisonKpiLabel}>{item.label}</span>
                    <span className={styles.comparisonKpiVal}>
                      {item.value}
                      {item.delta ? <span className={styles.comparisonDelta}>{item.delta}</span> : null}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className={styles.comparisonPending}>{adoption.comparisonPending || adoption.endPending}</p>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
