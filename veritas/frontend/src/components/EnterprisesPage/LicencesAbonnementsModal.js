import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { FaTimes } from "react-icons/fa";
import { Icon } from "@iconify/react";
import { toast } from "react-toastify";
import ConfirmModal from "../Misc/ConfirmModal/ConfirmModal";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { useCommonCopy } from "../../hooks/useCommonCopy";
import { getEnterpriseConfigModalsCopy } from "./enterpriseConfigModalsI18n";
import { interpolate } from "../../i18n/translate";
import { addClientLicence, deleteClientLicence, updateClientLicence } from "../../api/clients";
import layout from "./EnterpriseFormModal.module.css";
import styles from "./LicencesAbonnementsModal.module.css";
import { getLicencesModalCopy } from "./licencesAbonnementsModalI18n";
import { computeLicenseStats, filterLicenses, formatLicenseDate, getLicenseStatus, sortLicenses } from "./licenceUtils";
const EMPTY_FORM = {
  nom: "",
  expiration: "",
  fournisseur: "",
  notes: ""
};
function getStatusClassName(statusKey) {
  if (statusKey === "active") return styles.statusActive;
  if (statusKey === "warning") return styles.statusWarning;
  if (statusKey === "expired") return styles.statusExpired;
  return styles.statusNeutral;
}
function LicenseCard({
  item,
  onEdit,
  onDelete,
  deleting,
  copy
}) {
  const status = getLicenseStatus(item, copy.statusLabels);
  return <article className={`${styles.card} ${styles[`card_${status.key}`]}`}>
      <div className={styles.cardMain}>
        <div className={styles.cardHead}>
          <div className={styles.cardTitleWrap}>
            <Icon icon="mdi:license" className={styles.cardIcon} aria-hidden />
            <strong className={styles.cardTitle}>{item.nom || item.name || "-"}</strong>
          </div>
          <span className={`${styles.statusBadge} ${getStatusClassName(status.key)}`}>
            <Icon icon={status.icon} className={styles.statusBadgeIcon} aria-hidden />
            {status.text}
          </span>
        </div>
        <div className={styles.cardMeta}>
          <div>
            <span className={styles.metaLabel}>{copy.meta.expiration}</span>
            <span className={styles.metaValue}>
              {formatLicenseDate(item.expiration, copy.bcp47)}
            </span>
          </div>
          <div>
            <span className={styles.metaLabel}>{copy.meta.supplier}</span>
            <span className={styles.metaValue}>{item.fournisseur || "-"}</span>
          </div>
          <div>
            <span className={styles.metaLabel}>{copy.meta.daysRemaining}</span>
            <span className={styles.metaValue}>
              {item.daysRemaining != null ? item.daysRemaining : "-"}
            </span>
          </div>
        </div>
        {item.notes ? <p className={styles.cardNotes}>{item.notes}</p> : null}
      </div>
      <div className={styles.cardActions}>
        <button type="button" className={styles.iconBtn} onClick={() => onEdit(item)} aria-label={copy.actions.edit}>
          <Icon icon="mdi:pencil-outline" />
        </button>
        <button type="button" className={`${styles.iconBtn} ${styles.iconBtnDanger}`} onClick={() => onDelete(item)} disabled={deleting} aria-label={copy.actions.delete}>
          <Icon icon="mdi:trash-can-outline" />
        </button>
      </div>
    </article>;
}
export default function LicensesAbonnementsModal({
  isOpen,
  onClose,
  licences = [],
  clientId,
  onRefresh
}) {
  const locale = useAppLocale();
  const copy = useMemo(() => getLicencesModalCopy(locale), [locale]);
  const configCopy = useMemo(() => getEnterpriseConfigModalsCopy(locale), [locale]);
  const common = useCommonCopy();
  const [activeSection, setActiveSection] = useState("overview");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [statusFilter, setStatusFilter] = useState("all");
  const [error, setError] = useState(null);
  const stats = useMemo(() => computeLicenseStats(licences), [licences]);
  const sortedLicenses = useMemo(() => sortLicenses(licences), [licences]);
  const filteredLicenses = useMemo(() => filterLicenses(sortedLicenses, statusFilter), [sortedLicenses, statusFilter]);
  const navSections = useMemo(() => copy.navSections(Boolean(editingId)), [copy, editingId]);
  useEffect(() => {
    if (!isOpen) setDeleteTarget(null);
  }, [isOpen]);
  if (!isOpen) return null;
  const resetForm = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
  };
  const handleEdit = item => {
    setEditingId(item.id);
    setForm({
      nom: item.nom || item.name || "",
      expiration: item.expiration ? String(item.expiration).slice(0, 10) : "",
      fournisseur: item.fournisseur || "",
      notes: item.notes || ""
    });
    setActiveSection("edit");
  };
  const openAddSection = () => {
    resetForm();
    setActiveSection("add");
  };
  const cancelEdit = () => {
    resetForm();
    setActiveSection("inventory");
  };
  const handleSubmit = async () => {
    if (!clientId) return;
    const nom = form.nom.trim();
    if (!nom) {
      setError(copy.toasts.nameRequired);
      toast.warning(copy.toasts.nameRequired);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload = {
        nom,
        expiration: form.expiration || null,
        fournisseur: form.fournisseur.trim() || null,
        notes: form.notes.trim() || null
      };
      if (editingId) {
        await updateClientLicence(clientId, editingId, payload);
        toast.success(copy.toasts.updated);
      } else {
        await addClientLicence(clientId, payload);
        toast.success(copy.toasts.added);
      }
      resetForm();
      await onRefresh?.();
      setActiveSection("inventory");
    } catch (err) {
      const message = err.message || copy.toasts.saveError;
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };
  const requestDelete = item => {
    if (!clientId || !item?.id) return;
    setDeleteTarget(item);
  };
  const cancelDelete = () => {
    if (deletingId) return;
    setDeleteTarget(null);
  };
  const confirmDelete = async () => {
    if (!clientId || !deleteTarget?.id) return;
    setDeletingId(deleteTarget.id);
    setError(null);
    try {
      await deleteClientLicence(clientId, deleteTarget.id);
      toast.success(copy.toasts.deleted);
      if (editingId === deleteTarget.id) resetForm();
      setDeleteTarget(null);
      await onRefresh?.();
    } catch (err) {
      const message = err.message || copy.toasts.deleteError;
      setError(message);
      toast.error(message);
    } finally {
      setDeletingId(null);
    }
  };
  const getKpiValue = key => {
    if (key === "all") return stats.total;
    if (key === "active") return stats.active;
    if (key === "warning") return stats.warning;
    if (key === "expired") return stats.expired;
    return 0;
  };
  const handleKpiClick = filter => {
    setStatusFilter(filter);
    setActiveSection("inventory");
  };
  const isFormSection = activeSection === "add" || activeSection === "edit";
  const primaryDisabled = isFormSection ? saving || !form.nom.trim() : false;
  const primaryLabel = isFormSection ? saving ? common.saving : activeSection === "edit" ? copy.primary.update : copy.primary.add : null;
  const renderOverview = () => <>
      <div className={layout.sectionHead}>
        <h3 className={layout.sectionTitle}>{copy.overview.title}</h3>
        <p className={layout.sectionDesc}>{copy.overview.description}</p>
      </div>

      <div className={styles.kpiRow}>
        {copy.kpiItems.map(item => <button key={item.key} type="button" className={`${styles.kpiCard} ${activeSection === "inventory" && statusFilter === item.filter ? styles.kpiCardActiveFilter : ""}`} onClick={() => handleKpiClick(item.filter)}>
            <div className={`${styles.kpiIconWrap} ${styles[`kpiIcon_${item.tone}`]}`}>
              <Icon icon={item.icon} aria-hidden />
            </div>
            <div className={styles.kpiBody}>
              <span className={styles.kpiValue}>{getKpiValue(item.key)}</span>
              <span className={styles.kpiLabel}>{item.label}</span>
            </div>
          </button>)}
      </div>

      <div className={styles.overviewActions}>
        <button type="button" className={layout.ghostBtn} onClick={openAddSection}>
          <Icon icon="mdi:plus-circle-outline" aria-hidden />
          {copy.overview.addBtn}
        </button>
        <button type="button" className={layout.ghostBtn} onClick={() => setActiveSection("inventory")} disabled={licences.length === 0}>
          <Icon icon="mdi:format-list-bulleted" aria-hidden />
          {copy.overview.viewInventory}
        </button>
      </div>
    </>;
  const renderLicenseForm = ({
    title,
    description,
    showCancel
  }) => <>
      <div className={layout.sectionHead}>
        <h3 className={layout.sectionTitle}>{title}</h3>
        <p className={layout.sectionDesc}>{description}</p>
      </div>

      <div className={layout.fieldGrid2}>
        <div className={`${layout.field} ${layout.fieldFull}`}>
          <label className={`${layout.label} ${layout.labelRequired}`} htmlFor="licence-nom">
            {copy.form.name}
          </label>
          <input id="licence-nom" type="text" className={layout.input} value={form.nom} onChange={e => setForm(prev => ({
          ...prev,
          nom: e.target.value
        }))} placeholder={copy.form.namePlaceholder} />
        </div>
        <div className={layout.field}>
          <label className={layout.label} htmlFor="licence-expiration">
            {copy.form.expiration}
          </label>
          <input id="licence-expiration" type="date" className={layout.input} value={form.expiration} onChange={e => setForm(prev => ({
          ...prev,
          expiration: e.target.value
        }))} />
        </div>
        <div className={layout.field}>
          <label className={layout.label} htmlFor="licence-fournisseur">
            {copy.form.supplier}
          </label>
          <input id="licence-fournisseur" type="text" className={layout.input} value={form.fournisseur} onChange={e => setForm(prev => ({
          ...prev,
          fournisseur: e.target.value
        }))} placeholder={copy.form.supplierPlaceholder} />
        </div>
        <div className={`${layout.field} ${layout.fieldFull}`}>
          <label className={layout.label} htmlFor="licence-notes">
            {copy.form.notes}
          </label>
          <input id="licence-notes" type="text" className={layout.input} value={form.notes} onChange={e => setForm(prev => ({
          ...prev,
          notes: e.target.value
        }))} placeholder={copy.form.notesPlaceholder} />
        </div>
      </div>

      {showCancel ? <div className={styles.formCancelRow}>
          <button type="button" className={layout.ghostBtn} onClick={cancelEdit}>
            {copy.form.cancel}
          </button>
        </div> : null}
    </>;
  const renderAdd = () => renderLicenseForm({
    title: copy.add.title,
    description: copy.add.description,
    showCancel: false
  });
  const renderEdit = () => renderLicenseForm({
    title: copy.edit.title,
    description: copy.edit.description,
    showCancel: true
  });
  const renderInventory = () => <>
      <div className={layout.sectionHead}>
        <h3 className={layout.sectionTitle}>{copy.inventory.title}</h3>
        <p className={layout.sectionDesc}>{copy.inventory.description}</p>
      </div>

      <div className={styles.listToolbar}>
        <p className={styles.listCount}>
          {copy.formatInventoryCount(filteredLicenses.length)}
          {statusFilter !== "all" ? copy.inventory.filteredSuffix : ""}
        </p>
        <div className={styles.filterChips}>
          {copy.filterOptions.map(option => <button key={option.value} type="button" className={`${styles.filterChip} ${statusFilter === option.value ? styles.filterChipActive : ""}`} onClick={() => setStatusFilter(option.value)}>
              {option.label}
            </button>)}
        </div>
      </div>

      {filteredLicenses.length > 0 ? <div className={styles.list}>
          {filteredLicenses.map(item => <LicenseCard key={item.id} item={item} onEdit={handleEdit} onDelete={requestDelete} deleting={deletingId === item.id} copy={copy} />)}
        </div> : <div className={styles.empty}>
          <Icon icon="mdi:license" className={styles.emptyIcon} aria-hidden />
          <p className={styles.emptyTitle}>
            {licences.length === 0 ? copy.empty.none : copy.empty.noFilterMatch}
          </p>
          {licences.length === 0 ? <button type="button" className={`${layout.primaryBtn} ${styles.emptyAction}`} onClick={openAddSection}>
              <Icon icon="mdi:plus-circle-outline" aria-hidden />
              {copy.empty.addBtn}
            </button> : null}
        </div>}
    </>;
  const deleteLabel = deleteTarget?.nom || deleteTarget?.name || copy.deleteFallback;
  return <>
      {createPortal(<div className={layout.overlay} onClick={onClose} role="presentation">
          <div className={layout.shell} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="licences-modal-title">
            <div className={layout.accentBar} aria-hidden />

            <header className={layout.header}>
              <div className={layout.headerMain}>
                <div className={layout.headerIconWrap} aria-hidden>
                  <Icon icon="mdi:license" />
                </div>
                <div className={layout.headerText}>
                  <p className={layout.eyebrow}>{copy.eyebrow}</p>
                  <h2 id="licences-modal-title" className={layout.title}>
                    {copy.title}
                  </h2>
                  <p className={layout.subtitle}>{copy.subtitle}</p>
                </div>
              </div>
              <button type="button" className={layout.closeBtn} onClick={onClose} disabled={saving} aria-label={common.close}>
                <FaTimes />
              </button>
            </header>

            <div className={layout.body}>
              <nav className={layout.nav} aria-label={copy.navAria}>
                {navSections.map(section => {
              const badge = section.id === "inventory" ? stats.total : null;
              return <button key={section.id} type="button" className={`${layout.navItem} ${activeSection === section.id ? layout.navItemActive : ""}`} onClick={() => {
                if (section.id === "add") openAddSection();else setActiveSection(section.id);
              }} aria-current={activeSection === section.id ? "step" : undefined}>
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
                {activeSection === "edit" && renderEdit()}
                {activeSection === "inventory" && renderInventory()}
              </div>
            </div>

            {isFormSection ? <footer className={layout.footer}>
                <span className={layout.footerHint}>{copy.footer.nameRequired}</span>
                <div className={layout.footerActions}>
                  <button type="button" className={layout.primaryBtn} onClick={handleSubmit} disabled={primaryDisabled}>
                    <Icon icon={saving ? "mdi:loading" : activeSection === "edit" ? "mdi:content-save-outline" : "mdi:plus"} className={saving ? layout.spinning : undefined} aria-hidden />
                    {primaryLabel}
                  </button>
                </div>
              </footer> : null}
          </div>
        </div>, document.getElementById("modal-root") || document.body)}
      <ConfirmModal open={Boolean(deleteTarget)} title={configCopy.confirm.deleteEntry.title} message={interpolate(configCopy.confirm.deleteEntry.message, {
      label: deleteLabel
    })} confirmLabel={common.delete} variant="danger" icon="mdi:delete-alert-outline" loading={Boolean(deletingId)} onClose={cancelDelete} onConfirm={confirmDelete} />
    </>;
}
