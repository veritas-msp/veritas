import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { FaTimes } from "react-icons/fa";
import { Icon } from "@iconify/react";
import { toast } from "react-toastify";
import ConfirmModal from "../Misc/ConfirmModal/ConfirmModal";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { useCommonCopy } from "../../hooks/useCommonCopy";
import { getEnterpriseConfigModalsCopy } from "./enterpriseConfigModalsI18n";
import { getSslModalCopy } from "./sslCertificatesModalI18n";
import { interpolate } from "../../i18n/translate";
import { addClientSslCertificate, checkClientSslCertificates, checkClientSslCertificate, deleteClientSslCertificate, updateClientSslCertificate } from "../../api/clients";
import layout from "./EnterpriseFormModal.module.css";
import styles from "./SslCertificatesModal.module.css";
import NumberStepperInput from "../Misc/NumberStepperInput/NumberStepperInput";
import { computeSslStats, filterSslCertificates, formatSslDate, formatSslDateTime, formatSslSanList, getSslCertStatus, getSslExpiryBarWidth, getSslHostLabel, sortSslCertificates } from "./sslCertificateUtils";
function getExpiryBarClass(daysRemaining) {
  if (daysRemaining == null) return styles.expiryBarUnknown;
  if (daysRemaining < 0) return styles.expiryBarExpired;
  if (daysRemaining <= 30) return styles.expiryBarWarning;
  return styles.expiryBarActive;
}
function getStatusClassName(statusKey) {
  if (statusKey === "active") return styles.statusActive;
  if (statusKey === "warning") return styles.statusWarning;
  if (statusKey === "expired" || statusKey === "error") return styles.statusExpired;
  return styles.statusUnknown;
}
function matchesProblemFilter(cert) {
  const key = getSslCertStatus(cert).key;
  return key === "error" || key === "expired";
}
function SslCertCard({
  cert,
  copy,
  onEdit,
  onDelete,
  onCheck,
  checking,
  deleting
}) {
  const {
    meta,
    actions,
    statusLabels,
    bcp47
  } = copy;
  const status = getSslCertStatus(cert, statusLabels);
  const barWidth = getSslExpiryBarWidth(cert.daysRemaining);
  return <article className={`${styles.certCard} ${styles[`certCard_${status.key}`]}`}>
      <div className={styles.certCardMain}>
        <div className={styles.certCardHead}>
          <div className={styles.certHostWrap}>
            <Icon icon="mdi:web" className={styles.certHostIcon} aria-hidden />
            <span className={styles.certHost}>{getSslHostLabel(cert)}</span>
          </div>
          <span className={`${styles.statusBadge} ${getStatusClassName(status.key)}`}>
            <Icon icon={status.icon} className={styles.statusBadgeIcon} aria-hidden />
            {status.text}
          </span>
        </div>

        <div className={styles.certMeta}>
          <div className={styles.certMetaItem}>
            <span className={styles.certMetaLabel}>{meta.issuer}</span>
            <span className={styles.certMetaValue}>{cert.issuerCN || cert.issuer || "-"}</span>
          </div>
          <div className={styles.certMetaItem}>
            <span className={styles.certMetaLabel}>{meta.validity}</span>
            <span className={styles.certMetaValue}>
              {formatSslDate(cert.validFrom, bcp47)} → {formatSslDate(cert.expiration, bcp47)}
            </span>
          </div>
          <div className={styles.certMetaItem}>
            <span className={styles.certMetaLabel}>{meta.daysRemaining}</span>
            <span className={styles.certMetaValue}>
              {cert.daysRemaining != null && !cert.error ? cert.daysRemaining : "-"}
            </span>
          </div>
          <div className={styles.certMetaItem}>
            <span className={styles.certMetaLabel}>{meta.lastCheck}</span>
            <span className={styles.certMetaValue}>{formatSslDateTime(cert.lastChecked, bcp47)}</span>
          </div>
          <div className={styles.certMetaItem}>
            <span className={styles.certMetaLabel}>{meta.nextCheck}</span>
            <span className={styles.certMetaValue}>{formatSslDateTime(cert.nextCheckAt, bcp47)}</span>
          </div>
          <div className={styles.certMetaItem}>
            <span className={styles.certMetaLabel}>{meta.interval}</span>
            <span className={styles.certMetaValue}>
              {copy.formatIntervalHours(cert.checkIntervalHours || 24)}
            </span>
          </div>
        </div>

        {cert.daysRemaining != null && !cert.error ? <div className={styles.expiryBarTrack} aria-hidden>
            <div className={`${styles.expiryBarFill} ${getExpiryBarClass(cert.daysRemaining)}`} style={{
          width: `${barWidth}%`
        }} />
          </div> : null}

        {cert.authorizationError ? <p className={styles.certWarning}>{cert.authorizationError}</p> : null}
        {cert.error ? <p className={styles.certError}>{cert.error}</p> : null}

        <details className={styles.certDetails}>
          <summary className={styles.certDetailsSummary}>{meta.technicalDetails}</summary>
          <div className={styles.certMetaAdvanced}>
            <div className={styles.certMetaItem}>
              <span className={styles.certMetaLabel}>{meta.subjectCN}</span>
              <span className={styles.certMetaValue}>{cert.subjectCN || cert.subject || "-"}</span>
            </div>
            <div className={styles.certMetaItem}>
              <span className={styles.certMetaLabel}>{meta.san}</span>
              <span className={styles.certMetaValue}>{formatSslSanList(cert.subjectAltNames)}</span>
            </div>
            <div className={styles.certMetaItem}>
              <span className={styles.certMetaLabel}>{meta.tlsProtocol}</span>
              <span className={styles.certMetaValue}>{cert.protocol || "-"}</span>
            </div>
            <div className={styles.certMetaItem}>
              <span className={styles.certMetaLabel}>{meta.fingerprint}</span>
              <span className={styles.certMetaValue} title={cert.fingerprint || undefined}>
                {cert.fingerprint ? `${cert.fingerprint.slice(0, 16)}…` : "-"}
              </span>
            </div>
            <div className={styles.certMetaItem}>
              <span className={styles.certMetaLabel}>{meta.serialNumber}</span>
              <span className={styles.certMetaValue}>{cert.serialNumber || "-"}</span>
            </div>
            <div className={styles.certMetaItem}>
              <span className={styles.certMetaLabel}>{meta.trustChain}</span>
              <span className={styles.certMetaValue}>
                {cert.authorized === true ? meta.trustValid : cert.authorized === false ? meta.trustInvalid : "-"}
              </span>
            </div>
          </div>
        </details>
      </div>

      <div className={styles.certCardActions}>
        <button type="button" className={styles.iconBtn} onClick={() => onCheck?.(cert)} disabled={checking || deleting} title={checking ? actions.checking : actions.check} aria-label={checking ? actions.checkingAria : actions.checkAria}>
          <Icon icon={checking ? "mdi:loading" : "mdi:shield-sync-outline"} aria-hidden />
        </button>
        <button type="button" className={styles.iconBtn} onClick={() => onEdit?.(cert)} disabled={checking || deleting} title={actions.edit} aria-label={actions.editAria}>
          <Icon icon="mdi:pencil-outline" aria-hidden />
        </button>
        <button type="button" className={`${styles.iconBtn} ${styles.iconBtnDanger}`} onClick={() => onDelete?.(cert)} disabled={checking || deleting} title={actions.delete} aria-label={actions.deleteAria}>
          <Icon icon="mdi:trash-can-outline" aria-hidden />
        </button>
      </div>
    </article>;
}
export default function SslCertificatesModal({
  isOpen,
  onClose,
  certificates = [],
  clientId,
  onRefresh
}) {
  const locale = useAppLocale();
  const configCopy = useMemo(() => getEnterpriseConfigModalsCopy(locale), [locale]);
  const copy = useMemo(() => getSslModalCopy(locale), [locale]);
  const common = useCommonCopy();
  const [activeSection, setActiveSection] = useState("overview");
  const [checking, setChecking] = useState(false);
  const [checkingCertId, setCheckingCertId] = useState(null);
  const [deletingCertId, setDeletingCertId] = useState(null);
  const [adding, setAdding] = useState(false);
  const [editingCert, setEditingCert] = useState(null);
  const [newHost, setNewHost] = useState("");
  const [newPort, setNewPort] = useState("443");
  const [checkIntervalHours, setCheckIntervalHours] = useState("24");
  const [statusFilter, setStatusFilter] = useState("all");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [error, setError] = useState(null);
  const stats = useMemo(() => computeSslStats(certificates), [certificates]);
  const sortedCerts = useMemo(() => sortSslCertificates(certificates), [certificates]);
  const filteredCerts = useMemo(() => {
    if (statusFilter === "problem") {
      return sortedCerts.filter(matchesProblemFilter);
    }
    return filterSslCertificates(sortedCerts, statusFilter);
  }, [sortedCerts, statusFilter]);
  useEffect(() => {
    if (!isOpen) setDeleteTarget(null);
  }, [isOpen]);
  if (!isOpen) return null;
  const getKpiValue = key => {
    if (key === "all") return stats.total;
    if (key === "active") return stats.active;
    if (key === "warning") return stats.warning;
    if (key === "problem") return stats.problem;
    return 0;
  };
  const handleKpiClick = filter => {
    setStatusFilter(filter === "problem" ? "problem" : filter);
    setActiveSection("inventory");
  };
  const handleCheckAll = async () => {
    if (!clientId) return;
    setChecking(true);
    setError(null);
    try {
      const result = await checkClientSslCertificates(clientId);
      toast.success(interpolate(copy.toasts.checkAllSuccess, {
        count: String(result.checked || 0)
      }));
      await onRefresh?.();
    } catch (err) {
      const message = err.message || copy.toasts.checkAllError;
      setError(message);
      toast.error(message);
    } finally {
      setChecking(false);
    }
  };
  const handleAdd = async () => {
    if (!clientId || !newHost.trim()) {
      setError(copy.toasts.hostnameRequired);
      return;
    }
    const interval = Number(checkIntervalHours) || 24;
    setAdding(true);
    setError(null);
    try {
      if (editingCert?.id) {
        await updateClientSslCertificate(clientId, editingCert.id, {
          hostname: newHost.trim(),
          port: Number(newPort) || 443,
          checkIntervalHours: interval
        });
        toast.success(copy.toasts.hostUpdated);
      } else {
        await addClientSslCertificate(clientId, {
          hostname: newHost.trim(),
          port: Number(newPort) || 443,
          checkIntervalHours: interval
        });
        toast.success(copy.toasts.hostAdded);
      }
      setNewHost("");
      setNewPort("443");
      setCheckIntervalHours("24");
      setEditingCert(null);
      await onRefresh?.();
      setActiveSection("inventory");
    } catch (err) {
      const message = err.message || copy.toasts.saveError;
      setError(message);
      toast.error(message);
    } finally {
      setAdding(false);
    }
  };
  const handleEditCert = cert => {
    setEditingCert(cert);
    setNewHost(cert.hostname || "");
    setNewPort(String(cert.port || 443));
    setCheckIntervalHours(String(cert.checkIntervalHours || 24));
    setActiveSection("add");
  };
  const requestDeleteCert = cert => {
    if (!clientId || !cert?.id) return;
    setDeleteTarget(cert);
  };
  const cancelDeleteCert = () => {
    if (deletingCertId) return;
    setDeleteTarget(null);
  };
  const confirmDeleteCert = async () => {
    if (!clientId || !deleteTarget?.id) return;
    setDeletingCertId(deleteTarget.id);
    setError(null);
    try {
      await deleteClientSslCertificate(clientId, deleteTarget.id);
      toast.success(copy.toasts.hostRemoved);
      if (editingCert?.id === deleteTarget.id) {
        setEditingCert(null);
        setNewHost("");
        setNewPort("443");
      }
      setDeleteTarget(null);
      await onRefresh?.();
    } catch (err) {
      const message = err.message || copy.toasts.deleteError;
      setError(message);
      toast.error(message);
    } finally {
      setDeletingCertId(null);
    }
  };
  const handleCheckCert = async cert => {
    if (!clientId || !cert?.id) return;
    setCheckingCertId(cert.id);
    setError(null);
    try {
      await checkClientSslCertificate(clientId, cert.id);
      toast.success(interpolate(copy.toasts.checkCertSuccess, {
        host: getSslHostLabel(cert)
      }));
      await onRefresh?.();
    } catch (err) {
      const message = err.message || copy.toasts.checkCertError;
      setError(message);
      toast.error(message);
    } finally {
      setCheckingCertId(null);
    }
  };
  const handlePrimaryAction = () => {
    if (activeSection === "add") {
      handleAdd();
      return;
    }
    handleCheckAll();
  };
  const primaryDisabled = activeSection === "add" ? adding || !newHost.trim() : checking || !clientId || certificates.length === 0;
  const primaryLabel = activeSection === "add" ? adding ? common.saving : editingCert ? copy.primary.update : copy.primary.addHost : checking ? copy.primary.checking : copy.primary.checkAll;
  const primaryIcon = activeSection === "add" ? adding ? "mdi:loading" : "mdi:plus" : checking ? "mdi:loading" : "mdi:shield-sync-outline";
  const renderOverview = () => <>
      <div className={layout.sectionHead}>
        <h3 className={layout.sectionTitle}>{copy.overview.title}</h3>
        <p className={layout.sectionDesc}>{copy.overview.description}</p>
      </div>

      <div className={styles.kpiRow}>
        {copy.kpiItems.map(item => <button key={item.key} type="button" className={`${styles.kpiCard} ${activeSection === "inventory" && (statusFilter === item.filter || item.filter === "problem" && statusFilter === "problem") ? styles.kpiCardActiveFilter : ""}`} onClick={() => handleKpiClick(item.filter)}>
            <div className={`${styles.kpiIconWrap} ${styles[`kpiIcon_${item.tone}`]}`}>
              <Icon icon={item.icon} aria-hidden />
            </div>
            <div className={styles.kpiBody}>
              <span className={styles.kpiValue}>{getKpiValue(item.key)}</span>
              <span className={styles.kpiLabel}>{item.label}</span>
            </div>
          </button>)}
      </div>

      {stats.unknown > 0 ? <div className={styles.infoBox}>
          <Icon icon="mdi:information-outline" className={styles.infoBoxIcon} aria-hidden />
          <p>{copy.formatUnknownNotice(stats.unknown)}</p>
        </div> : null}

      <div className={styles.infoBox}>
        <Icon icon="mdi:timer-outline" className={styles.infoBoxIcon} aria-hidden />
        <p>{copy.overview.heartbeatInfo}</p>
      </div>

      <div className={styles.overviewActions}>
        <button type="button" className={layout.ghostBtn} onClick={() => setActiveSection("add")}>
          <Icon icon="mdi:web-plus" aria-hidden />
          {copy.overview.addHostBtn}
        </button>
        <button type="button" className={layout.ghostBtn} onClick={() => setActiveSection("inventory")} disabled={certificates.length === 0}>
          <Icon icon="mdi:format-list-bulleted" aria-hidden />
          {copy.overview.viewCertsBtn}
        </button>
      </div>
    </>;
  const renderAdd = () => <>
      <div className={layout.sectionHead}>
        <h3 className={layout.sectionTitle}>
          {editingCert ? copy.add.titleEdit : copy.add.titleNew}
        </h3>
        <p className={layout.sectionDesc}>
          {editingCert ? copy.add.descriptionEdit : copy.add.descriptionNew}
        </p>
      </div>

      <div className={styles.addForm}>
        <div className={layout.fieldGrid2}>
          <div className={`${layout.field} ${layout.fieldFull}`}>
            <label className={`${layout.label} ${layout.labelRequired}`} htmlFor="ssl-host-input">
              {copy.add.hostname}
            </label>
            <input id="ssl-host-input" type="text" className={layout.input} value={newHost} onChange={e => setNewHost(e.target.value)} placeholder={copy.add.hostnamePlaceholder} autoComplete="off" />
          </div>
          <div className={layout.field}>
            <label className={layout.label} htmlFor="ssl-port-input">
              {copy.add.port}
            </label>
            <NumberStepperInput id="ssl-port-input" min={1} max={65535} inputClassName={layout.input} value={newPort} onChange={setNewPort} increaseAriaLabel={copy.add.portIncrease} decreaseAriaLabel={copy.add.portDecrease} />
          </div>
          <div className={layout.field}>
            <label className={layout.label} htmlFor="ssl-interval-input">
              {copy.add.interval}
            </label>
            <NumberStepperInput id="ssl-interval-input" min={1} max={8760} inputClassName={layout.input} value={checkIntervalHours} onChange={setCheckIntervalHours} increaseAriaLabel={copy.add.intervalIncrease} decreaseAriaLabel={copy.add.intervalDecrease} />
          </div>
        </div>

        {editingCert ? <div className={styles.formActions}>
            <button type="button" className={layout.ghostBtn} onClick={() => {
          setEditingCert(null);
          setNewHost("");
          setNewPort("443");
          setCheckIntervalHours("24");
        }}>
              {copy.add.cancelEdit}
            </button>
          </div> : null}
      </div>
    </>;
  const renderInventory = () => <>
      <div className={layout.sectionHead}>
        <h3 className={layout.sectionTitle}>{copy.inventory.title}</h3>
        <p className={layout.sectionDesc}>{copy.inventory.description}</p>
      </div>

      <div className={styles.listToolbar}>
        <p className={styles.listCount}>
          {copy.formatInventoryCount(filteredCerts.length)}
          {statusFilter !== "all" ? copy.inventory.filteredSuffix : ""}
        </p>
        <div className={styles.filterChips}>
          {copy.filterOptions.map(option => <button key={option.value} type="button" className={`${styles.filterChip} ${statusFilter === option.value ? styles.filterChipActive : ""}`} onClick={() => setStatusFilter(option.value)}>
              {option.label}
            </button>)}
        </div>
      </div>

      {filteredCerts.length > 0 ? <div className={styles.certList}>
          {filteredCerts.map(cert => <SslCertCard key={cert.id || cert.hostname} cert={cert} copy={copy} onEdit={handleEditCert} onDelete={requestDeleteCert} onCheck={handleCheckCert} checking={checkingCertId === cert.id} deleting={deletingCertId === cert.id} />)}
        </div> : <div className={styles.emptyState}>
          <Icon icon="mdi:certificate-outline" className={styles.emptyIcon} aria-hidden />
          <p className={styles.emptyTitle}>
            {certificates.length === 0 ? copy.empty.noneTitle : copy.empty.noFilterTitle}
          </p>
          <p className={styles.emptyHint}>
            {certificates.length === 0 ? copy.empty.noneHint : copy.empty.noFilterHint}
          </p>
          {certificates.length === 0 ? <button type="button" className={`${layout.primaryBtn} ${styles.emptyAction}`} onClick={() => setActiveSection("add")}>
              <Icon icon="mdi:web-plus" aria-hidden />
              {copy.empty.addBtn}
            </button> : null}
        </div>}
    </>;
  const deleteHostLabel = deleteTarget ? getSslHostLabel(deleteTarget) : "";
  return <>
      {createPortal(<div className={layout.overlay} onClick={onClose} role="presentation">
      <div className={layout.shell} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="ssl-modal-title">
        <div className={layout.accentBar} aria-hidden />

        <header className={layout.header}>
          <div className={layout.headerMain}>
            <div className={layout.headerIconWrap} aria-hidden>
              <Icon icon="mdi:certificate-outline" />
            </div>
            <div className={layout.headerText}>
              <p className={layout.eyebrow}>{copy.eyebrow}</p>
              <h2 id="ssl-modal-title" className={layout.title}>
                {copy.title}
              </h2>
              <p className={layout.subtitle}>{copy.subtitle}</p>
            </div>
          </div>
          <button type="button" className={layout.closeBtn} onClick={onClose} disabled={checking || adding || deletingCertId != null} aria-label={common.close}>
            <FaTimes />
          </button>
        </header>

        <div className={layout.body}>
          <nav className={layout.nav} aria-label={copy.navAria}>
            {copy.navSections.map(section => {
              const badge = section.id === "inventory" ? stats.total : section.id === "add" && newHost.trim() ? "…" : null;
              return <button key={section.id} type="button" className={`${layout.navItem} ${activeSection === section.id ? layout.navItemActive : ""}`} onClick={() => setActiveSection(section.id)} aria-current={activeSection === section.id ? "step" : undefined}>
                  <Icon icon={section.icon} className={layout.navItemIcon} aria-hidden />
                  <span className={layout.navItemText}>
                    <span className={layout.navItemLabel}>{section.label}</span>
                    <span className={layout.navItemHint}>{section.description}</span>
                  </span>
                  {badge != null && badge !== 0 ? <span className={layout.navBadge}>{badge}</span> : null}
                </button>;
            })}
          </nav>

          <div className={layout.content}>
            {error ? <div className={styles.errorBanner} role="alert">
                {error}
              </div> : null}
            {activeSection === "overview" && renderOverview()}
            {activeSection === "add" && renderAdd()}
            {activeSection === "inventory" && renderInventory()}
          </div>
        </div>

        <footer className={layout.footer}>
          <span className={layout.footerHint}>
            {activeSection === "add" ? copy.footer.hostRequired : copy.formatHostCount(stats.total)}
          </span>
          <div className={layout.footerActions}>
            <button type="button" className={layout.primaryBtn} onClick={handlePrimaryAction} disabled={primaryDisabled}>
              <Icon icon={primaryIcon} className={checking || adding ? layout.spinning : undefined} aria-hidden />
              {primaryLabel}
            </button>
          </div>
        </footer>
      </div>
    </div>, document.getElementById("modal-root") || document.body)}
      <ConfirmModal open={Boolean(deleteTarget)} title={configCopy.confirm.removeSslMonitoring.title} message={interpolate(configCopy.confirm.removeSslMonitoring.message, {
      host: deleteHostLabel
    })} confirmLabel={common.remove} variant="danger" icon="mdi:delete-alert-outline" loading={Boolean(deletingCertId)} onClose={cancelDeleteCert} onConfirm={confirmDeleteCert} />
    </>;
}
