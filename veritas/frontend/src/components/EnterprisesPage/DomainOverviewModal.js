import React, { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";
import { FaTimes } from "react-icons/fa";
import formStyles from "./EnterpriseFormModal.module.css";
import dnsStyles from "./DomainsConfigModal.module.css";
import styles from "./DomainOverviewModal.module.css";
import { formatDomainSummary, formatRenewalModeLabel, normalizeDomainItem, refreshSingleMonitoredDomainFromOvh } from "./domainSolutionUtils";
import { showError, showSuccess } from "../../utils/toast";
import ConfirmModal from "../Misc/ConfirmModal/ConfirmModal";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { useCommonCopy } from "../../hooks/useCommonCopy";
import { getEnterpriseConfigModalsCopy } from "./enterpriseConfigModalsI18n";
import { interpolate } from "../../i18n/translate";
function formatDateShort(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString("en-GB");
}
function daysUntilExpiration(value) {
  if (!value) return null;
  const exp = new Date(value);
  if (Number.isNaN(exp.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  exp.setHours(0, 0, 0, 0);
  return Math.ceil((exp - today) / (1000 * 60 * 60 * 24));
}
function ExpirationBanner({
  expiration
}) {
  if (!expiration) return null;
  const daysLeft = daysUntilExpiration(expiration);
  let bannerClass = styles.expirationBanner;
  let icon = "mdi:calendar-clock";
  let message = `Expires on ${formatDateShort(expiration)}.`;
  if (daysLeft != null && daysLeft < 0) {
    bannerClass = `${styles.expirationBanner} ${styles.expirationBannerDanger}`;
    icon = "mdi:alert-circle-outline";
    message = `Domain expired on ${formatDateShort(expiration)}.`;
  } else if (daysLeft != null && daysLeft <= 30) {
    bannerClass = `${styles.expirationBanner} ${styles.expirationBannerWarn}`;
    icon = "mdi:alert-outline";
    message = `Expires on ${formatDateShort(expiration)} · ${daysLeft} day${daysLeft > 1 ? "s" : ""} remaining.`;
  }
  return <div className={bannerClass}>
      <Icon icon={icon} aria-hidden />
      <span>{message}</span>
    </div>;
}
export default function DomainOverviewModal({
  open,
  client,
  domainItem,
  onClose,
  onSynced,
  onEdit,
  onDelete
}) {
  const locale = useAppLocale();
  const configCopy = useMemo(() => getEnterpriseConfigModalsCopy(locale), [locale]);
  const common = useCommonCopy();
  const [domain, setDomain] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  useEffect(() => {
    setDomain(normalizeDomainItem(domainItem));
  }, [domainItem]);
  const summary = useMemo(() => formatDomainSummary(domain), [domain]);
  const normalized = useMemo(() => normalizeDomainItem(domain), [domain]);
  const handleRefreshFromOvh = useCallback(async () => {
    if (!client?.id || !normalized?.nom || normalized.providerId !== "ovh") return;
    setSyncing(true);
    try {
      const updated = await refreshSingleMonitoredDomainFromOvh(client.id, normalized);
      setDomain(updated);
      showSuccess("Domain synchronized from OVH.");
      await onSynced?.();
    } catch (error) {
      showError(error.message || "OVH synchronization failed.");
    } finally {
      setSyncing(false);
    }
  }, [client?.id, normalized, onSynced]);
  useEffect(() => {
    if (!open) {
      setDeleteConfirmOpen(false);
      setDeleting(false);
    }
  }, [open]);
  const handleConfirmDelete = async () => {
    if (!onDelete || !domain) return;
    setDeleting(true);
    try {
      await onDelete(domain);
      setDeleteConfirmOpen(false);
    } finally {
      setDeleting(false);
    }
  };
  if (!open || !client?.id || !domain) return null;
  const nameServers = Array.isArray(normalized.nameServers) ? normalized.nameServers : [];
  return <>
      {createPortal(<div className={formStyles.overlay} onClick={syncing || deleting ? undefined : onClose} role="presentation">
      <div className={`${formStyles.shell} ${styles.shell}`} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="domain-overview-title">
        <div className={formStyles.accentBar} aria-hidden />
        <header className={formStyles.header}>
          <div className={formStyles.headerMain}>
            <div className={`${formStyles.headerIconWrap} ${dnsStyles.headerIconDns}`} aria-hidden>
              <Icon icon="stash:domain" />
            </div>
            <div className={formStyles.headerText}>
              <p className={formStyles.eyebrow}>Licenses &amp; subscriptions</p>
              <h2 className={formStyles.title} id="domain-overview-title">
                {summary.label}
              </h2>
              <p className={formStyles.subtitle}>{client.name}</p>
            </div>
          </div>
          <button type="button" className={formStyles.closeBtn} onClick={onClose} disabled={syncing} aria-label="Close">
            <FaTimes />
          </button>
        </header>

        <div className={styles.body}>
          <ExpirationBanner expiration={normalized.expiration} />

          <div className={styles.metricsGrid}>
            <div className={styles.metricCard}>
              <div className={styles.metricLabel}>Registrar</div>
              <div className={styles.metricValue}>{summary.providerName || "-"}</div>
            </div>
            <div className={styles.metricCard}>
              <div className={styles.metricLabel}>Expiry</div>
              <div className={styles.metricValue}>{formatDateShort(normalized.expiration)}</div>
            </div>
            <div className={styles.metricCard}>
              <div className={styles.metricLabel}>Renewal</div>
              <div className={styles.metricValue}>
                {normalized.autoRenew == null ? "-" : normalized.autoRenew ? "Automatic" : "Manual"}
              </div>
            </div>
            <div className={styles.metricCard}>
              <div className={styles.metricLabel}>Zone DNS</div>
              <div className={styles.metricValue}>
                {normalized.hasDnsZone ? "Hosted by OVH" : "Not detected"}
              </div>
            </div>
            {normalized.renewalMode ? <div className={styles.metricCard}>
                <div className={styles.metricLabel}>Mode</div>
                <div className={styles.metricValue}>
                  {formatRenewalModeLabel(normalized.renewalMode)}
                  {normalized.deleteAtExpiration ? " · Delete on expiry" : ""}
                </div>
              </div> : null}
            {normalized.serviceStatus ? <div className={styles.metricCard}>
                <div className={styles.metricLabel}>Service status</div>
                <div className={styles.metricValue}>{normalized.serviceStatus}</div>
              </div> : null}
          </div>

          {nameServers.length > 0 ? <section>
              <h3 className={styles.sectionTitle}>DNS servers</h3>
              <ul className={styles.nameServers}>
                {nameServers.map(ns => <li key={ns}>{ns}</li>)}
              </ul>
            </section> : null}
        </div>

        <footer className={`${formStyles.footer} ${styles.footer}`}>
          <span className={formStyles.footerHint}>{summary.meta}</span>
          <div className={`${formStyles.footerActions} ${styles.footerActions}`}>
            {normalized.providerId === "ovh" ? <button type="button" className={formStyles.ghostBtn} onClick={handleRefreshFromOvh} disabled={syncing}>
                <Icon icon={syncing ? "mdi:loading" : "mdi:cloud-sync-outline"} className={syncing ? formStyles.spinning : ""} aria-hidden />
                Sync with OVH
              </button> : null}
            {onEdit ? <button type="button" className={formStyles.ghostBtn} onClick={() => onEdit(domain)} disabled={syncing}>
                <Icon icon="mdi:pencil-outline" aria-hidden />
                Edit
              </button> : null}
            {onDelete ? <button type="button" className={formStyles.dangerBtn} onClick={() => setDeleteConfirmOpen(true)} disabled={syncing || deleting}>
                <Icon icon="mdi:delete-outline" aria-hidden />
                Remove
              </button> : null}
          </div>
        </footer>
      </div>
    </div>, document.getElementById("modal-root") || document.body)}
      <ConfirmModal open={deleteConfirmOpen} title={configCopy.confirm.removeMonitoring.title} message={interpolate(configCopy.confirm.removeMonitoring.message, {
      label: summary.label
    })} confirmLabel={common.remove} variant="danger" icon="mdi:delete-outline" loading={deleting} onClose={() => setDeleteConfirmOpen(false)} onConfirm={handleConfirmDelete} />
    </>;
}
