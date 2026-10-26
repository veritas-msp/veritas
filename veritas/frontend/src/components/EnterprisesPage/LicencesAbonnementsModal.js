import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "react-toastify";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { useCommonCopy } from "../../hooks/useCommonCopy";
import { addClientLicence, updateClientLicence, deleteClientLicence } from "../../api/clients";
import layout from "./EnterpriseFormModal.module.css";
import styles from "./LicencesAbonnementsModal.module.css";
import { getLicencesModalCopy } from "./licencesAbonnementsModalI18n";
import ConfirmModal from "../Misc/ConfirmModal/ConfirmModal";
import { UiKitButton, uiKitLayoutsStyles as kit } from "../UiKit";
import EquipmentHoverIcon, { SECTION_ANIMATED } from "../EquipementPage/EquipmentHoverIcon";

const EMPTY_FORM = {
  nom: "",
  expiration: "",
  fournisseur: "",
  notes: ""
};

function formFromItem(item) {
  if (!item) return EMPTY_FORM;
  return {
    nom: item.nom || item.name || "",
    expiration: item.expiration ? String(item.expiration).slice(0, 10) : "",
    fournisseur: item.fournisseur || "",
    notes: item.notes || ""
  };
}

export default function LicensesAbonnementsModal({
  isOpen,
  onClose,
  clientId,
  onRefresh,
  initialItem = null
}) {
  const locale = useAppLocale();
  const copy = useMemo(() => getLicencesModalCopy(locale), [locale]);
  const common = useCommonCopy();

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState(null);

  const isEditing = Boolean(editingId);

  useEffect(() => {
    if (!isOpen) {
      setEditingId(null);
      setForm(EMPTY_FORM);
      setError(null);
      setSaving(false);
      setDeleting(false);
      setDeleteOpen(false);
      return;
    }
    if (initialItem?.id) {
      setEditingId(initialItem.id);
      setForm(formFromItem(initialItem));
    } else {
      setEditingId(null);
      setForm(EMPTY_FORM);
    }
    setError(null);
  }, [isOpen, initialItem]);

  if (!isOpen) return null;

  const patchForm = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

  const handleDelete = async () => {
    if (!clientId || !editingId) return;
    setDeleting(true);
    try {
      await deleteClientLicence(clientId, editingId);
      toast.success(copy.toasts.deleted);
      setDeleteOpen(false);
      await onRefresh?.();
      onClose?.();
    } catch (err) {
      toast.error(err?.message || copy.toasts.deleteError);
    } finally {
      setDeleting(false);
    }
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
      await onRefresh?.();
      onClose?.();
    } catch (err) {
      const message = err.message || copy.toasts.saveError;
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const HeaderAnimated = SECTION_ANIMATED.inventory;
  const sectionTitle = isEditing ? copy.edit.title : copy.add.title;

  return createPortal(
    <div className={layout.overlay} onClick={saving ? undefined : onClose} role="presentation">
      <div
        className={layout.shell}
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="licences-modal-title"
      >
        <div className={layout.accentBar} aria-hidden />

        <header className={layout.header}>
          <div className={layout.headerMain}>
            <div className={layout.headerIconWrap} aria-hidden>
              <EquipmentHoverIcon Animated={HeaderAnimated} iconify="mdi:license" size={22} />
            </div>
            <div className={layout.headerText}>
              <p className={layout.eyebrow}>{copy.eyebrow}</p>
              <h2 id="licences-modal-title" className={layout.title}>
                {copy.title}
              </h2>
              <p className={layout.subtitle}>{copy.subtitle}</p>
            </div>
          </div>
          <UiKitButton
            type="button"
            square
            variant="secondary"
            className={layout.closeBtn}
            onClick={onClose}
            disabled={saving}
            aria-label={common.close}
            icon="mdi:close"
          />
        </header>

        <div className={layout.bodySingle}>
          <div className={layout.content}>
            <div className={kit.contentFadeUp} key={`form-${editingId || "new"}`}>
              {error ? (
                <div className={styles.errorBanner} role="alert">
                  {error}
                </div>
              ) : null}
              <div className={styles.sectionFill}>
                <div className={`${layout.sectionHead} ${layout.sectionPinned}`}>
                  <h3 className={layout.sectionTitle}>{sectionTitle}</h3>
                </div>

                <div className={styles.addForm}>
                  <div className={layout.field}>
                    <label className={`${layout.label} ${layout.labelRequired}`} htmlFor="licence-nom">
                      {copy.form.name}
                    </label>
                    <input
                      id="licence-nom"
                      type="text"
                      className={layout.input}
                      value={form.nom}
                      onChange={e => patchForm("nom", e.target.value)}
                      placeholder={copy.form.namePlaceholder}
                      autoFocus
                    />
                  </div>
                  <div className={layout.field}>
                    <label className={layout.label} htmlFor="licence-expiration">
                      {copy.form.expiration}
                    </label>
                    <input
                      id="licence-expiration"
                      type="date"
                      className={layout.input}
                      value={form.expiration}
                      onChange={e => patchForm("expiration", e.target.value)}
                    />
                  </div>
                  <div className={layout.field}>
                    <label className={layout.label} htmlFor="licence-fournisseur">
                      {copy.form.supplier}
                    </label>
                    <input
                      id="licence-fournisseur"
                      type="text"
                      className={layout.input}
                      value={form.fournisseur}
                      onChange={e => patchForm("fournisseur", e.target.value)}
                      placeholder={copy.form.supplierPlaceholder}
                    />
                  </div>
                  <div className={layout.field}>
                    <label className={layout.label} htmlFor="licence-notes">
                      {copy.form.notes}
                    </label>
                    <input
                      id="licence-notes"
                      type="text"
                      className={layout.input}
                      value={form.notes}
                      onChange={e => patchForm("notes", e.target.value)}
                      placeholder={copy.form.notesPlaceholder}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <footer className={layout.footer}>
          <span className={layout.footerHint}>{copy.footer.nameRequired}</span>
          <div className={layout.footerActions}>
            {isEditing ? (
              <UiKitButton
                type="button"
                variant="ghost"
                className={layout.footerDeleteBtn}
                onClick={() => setDeleteOpen(true)}
                disabled={saving || deleting}
                icon="mdi:delete-outline"
              >
                {copy.actions.delete}
              </UiKitButton>
            ) : null}
            <UiKitButton type="button" variant="secondary" onClick={onClose} disabled={saving || deleting}>
              {copy.form.cancel}
            </UiKitButton>
            <UiKitButton
              type="button"
              variant="primary"
              onClick={handleSubmit}
              disabled={saving || deleting || !form.nom.trim()}
              icon={saving ? "mdi:loading" : isEditing ? "mdi:content-save-outline" : "mdi:plus"}
            >
              {saving ? common.saving : isEditing ? copy.primary.update : copy.primary.add}
            </UiKitButton>
          </div>
        </footer>
      </div>
      <ConfirmModal
        open={deleteOpen}
        variant="danger"
        title={copy.actions.delete}
        message={`${copy.actions.delete} « ${form.nom || copy.deleteFallback} » ?`}
        confirmLabel={copy.actions.delete}
        loading={deleting}
        onClose={() => {
          if (!deleting) setDeleteOpen(false);
        }}
        onConfirm={handleDelete}
      />
    </div>,
    document.getElementById("modal-root") || document.body
  );
}
