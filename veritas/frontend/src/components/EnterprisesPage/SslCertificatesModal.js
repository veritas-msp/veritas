import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "react-toastify";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { useCommonCopy } from "../../hooks/useCommonCopy";
import { getSslModalCopy } from "./sslCertificatesModalI18n";
import { addClientSslCertificate, updateClientSslCertificate, deleteClientSslCertificate } from "../../api/clients";
import layout from "./EnterpriseFormModal.module.css";
import styles from "./SslCertificatesModal.module.css";
import NumberStepperInput from "../Misc/NumberStepperInput/NumberStepperInput";
import ConfirmModal from "../Misc/ConfirmModal/ConfirmModal";
import { getSslHostLabel, parseSslTarget } from "./sslCertificateUtils";
import { UiKitButton, uiKitLayoutsStyles as kit } from "../UiKit";
import EquipmentHoverIcon, { SECTION_ANIMATED } from "../EquipementPage/EquipmentHoverIcon";

const EMPTY_FORM = {
  host: "",
  port: "443",
  checkIntervalHours: "24"
};

function formFromCert(cert) {
  if (!cert) return EMPTY_FORM;
  return {
    host: cert.hostname || "",
    port: String(cert.port || 443),
    checkIntervalHours: String(cert.checkIntervalHours || 24)
  };
}

export default function SslCertificatesModal({
  isOpen,
  onClose,
  clientId,
  onRefresh,
  initialItem = null
}) {
  const locale = useAppLocale();
  const copy = useMemo(() => getSslModalCopy(locale), [locale]);
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
      setForm(formFromCert(initialItem));
    } else {
      setEditingId(null);
      setForm(EMPTY_FORM);
    }
    setError(null);
  }, [isOpen, initialItem]);

  if (!isOpen) return null;

  const handleDelete = async () => {
    if (!clientId || !editingId) return;
    setDeleting(true);
    try {
      await deleteClientSslCertificate(clientId, editingId);
      toast.success(copy.toasts.hostRemoved);
      setDeleteOpen(false);
      onClose?.();
      void Promise.resolve(onRefresh?.()).catch(() => {});
    } catch (err) {
      toast.error(err?.message || copy.toasts.deleteError);
    } finally {
      setDeleting(false);
    }
  };

  const handleSave = async () => {
    if (!clientId || !form.host.trim()) {
      setError(copy.toasts.hostnameRequired);
      toast.warning(copy.toasts.hostnameRequired);
      return;
    }
    const parsed = parseSslTarget(form.host.trim(), Number(form.port) || 443);
    if (!parsed.hostname) {
      setError(copy.toasts.hostnameRequired);
      toast.warning(copy.toasts.hostnameRequired);
      return;
    }
    const interval = Number(form.checkIntervalHours) || 24;
    setSaving(true);
    setError(null);
    try {
      if (editingId) {
        await updateClientSslCertificate(clientId, editingId, {
          hostname: parsed.hostname,
          port: parsed.port,
          checkIntervalHours: interval
        });
        toast.success(copy.toasts.hostUpdated);
      } else {
        await addClientSslCertificate(clientId, {
          hostname: parsed.hostname,
          port: parsed.port,
          checkIntervalHours: interval
        });
        toast.success(copy.toasts.hostAdded);
      }
      onClose?.();
      void Promise.resolve(onRefresh?.()).catch(() => {});
    } catch (err) {
      const message = err.message || copy.toasts.saveError;
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const HeaderAnimated = SECTION_ANIMATED.ssl || SECTION_ANIMATED.inventory;
  const sectionTitle = isEditing ? copy.add.titleEdit : copy.add.titleNew;

  return createPortal(
    <div className={layout.overlay} onClick={saving ? undefined : onClose} role="presentation">
      <div
        className={layout.shell}
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="ssl-modal-title"
      >
        <div className={layout.accentBar} aria-hidden />

        <header className={layout.header}>
          <div className={layout.headerMain}>
            <div className={layout.headerIconWrap} aria-hidden>
              <EquipmentHoverIcon Animated={HeaderAnimated} iconify="mdi:certificate-outline" size={22} />
            </div>
            <div className={layout.headerText}>
              <p className={layout.eyebrow}>{copy.eyebrow}</p>
              <h2 id="ssl-modal-title" className={layout.title}>
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
                    <label className={`${layout.label} ${layout.labelRequired}`} htmlFor="ssl-host-input">
                      {copy.add.hostname}
                    </label>
                    <input
                      id="ssl-host-input"
                      type="text"
                      className={layout.input}
                      value={form.host}
                      onChange={e => {
                        const value = e.target.value;
                        setForm(prev => {
                          const next = { ...prev, host: value };
                          const hostPart = String(value || "")
                            .replace(/^https?:\/\//i, "")
                            .split("/")[0];
                          if (/:\d{1,5}$/.test(hostPart) || /\[[^\]]+\]:\d{1,5}$/.test(hostPart)) {
                            const parsed = parseSslTarget(value, Number(prev.port) || 443);
                            if (parsed.port) next.port = String(parsed.port);
                          }
                          return next;
                        });
                      }}
                      placeholder={copy.add.hostnamePlaceholder}
                      autoComplete="off"
                      autoFocus
                    />
                  </div>
                  <div className={layout.field}>
                    <label className={layout.label} htmlFor="ssl-port-input">
                      {copy.add.port}
                    </label>
                    <NumberStepperInput
                      id="ssl-port-input"
                      min={1}
                      max={65535}
                      inputClassName={layout.input}
                      value={form.port}
                      onChange={value => setForm(prev => ({ ...prev, port: value }))}
                      increaseAriaLabel={copy.add.portIncrease}
                      decreaseAriaLabel={copy.add.portDecrease}
                    />
                  </div>
                  <div className={layout.field}>
                    <label className={layout.label} htmlFor="ssl-interval-input">
                      {copy.add.interval}
                    </label>
                    <NumberStepperInput
                      id="ssl-interval-input"
                      min={1}
                      max={8760}
                      inputClassName={layout.input}
                      value={form.checkIntervalHours}
                      onChange={value => setForm(prev => ({ ...prev, checkIntervalHours: value }))}
                      increaseAriaLabel={copy.add.intervalIncrease}
                      decreaseAriaLabel={copy.add.intervalDecrease}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <footer className={layout.footer}>
          <span className={layout.footerHint}>
            {isEditing && initialItem
              ? getSslHostLabel(initialItem)
              : copy.footer.hostRequired}
          </span>
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
              {copy.add.cancelEdit || common.cancel}
            </UiKitButton>
            <UiKitButton
              type="button"
              variant="primary"
              onClick={handleSave}
              disabled={saving || deleting || !form.host.trim()}
              icon={saving ? "mdi:loading" : isEditing ? "mdi:content-save-outline" : "mdi:plus"}
            >
              {saving
                ? common.saving
                : isEditing
                  ? copy.primary.update
                  : copy.primary.addHost}
            </UiKitButton>
          </div>
        </footer>
      </div>
      <ConfirmModal
        open={deleteOpen}
        variant="danger"
        title={copy.actions.delete}
        message={
          initialItem
            ? `${copy.actions.deleteAria}: ${getSslHostLabel(initialItem)}`
            : copy.actions.deleteAria
        }
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
