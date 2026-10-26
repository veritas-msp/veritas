import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";
import { useCommonCopy } from "../../hooks/useCommonCopy";
import { UiKitButton } from "../UiKit";
import layout from "./EnterpriseFormModal.module.css";
import styles from "./DomainsConfigModal.module.css";

export default function DomainAddManualModal({
  open,
  copy,
  form,
  onChange,
  onClose,
  onSave,
  onDelete,
  saving,
  isEditing
}) {
  const common = useCommonCopy();
  if (!open) return null;

  const title = isEditing ? copy.manual.titleEdit || copy.manual.title : copy.manual.title;
  const description = isEditing
    ? copy.manual.descriptionEdit || copy.manual.description
    : copy.manual.description;

  return createPortal(
    <div className={`${layout.overlay} ${layout.overlayStacked}`} onClick={saving ? undefined : onClose} role="presentation">
      <div
        className={`${layout.shell} ${styles.configShell}`}
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="domain-manual-title"
      >
        <div className={layout.accentBar} aria-hidden />
        <header className={layout.header}>
          <div className={layout.headerMain}>
            <div className={`${layout.headerIconWrap} ${styles.headerIconDns}`} aria-hidden>
              <Icon icon={isEditing ? "mdi:pencil-outline" : "mdi:form-textbox"} />
            </div>
            <div className={layout.headerText}>
              <p className={layout.eyebrow}>{copy.eyebrow}</p>
              <h2 id="domain-manual-title" className={layout.title}>
                {title}
              </h2>
              <p className={layout.subtitle}>{description}</p>
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

        <div className={layout.content}>
          <div className={layout.fieldGrid2}>
            <div className={`${layout.field} ${layout.fieldFull}`}>
              <label className={`${layout.label} ${layout.labelRequired}`} htmlFor="manual-domain-name">
                {copy.manual.domainName}
              </label>
              <input
                id="manual-domain-name"
                type="text"
                className={layout.input}
                value={form.nom}
                onChange={e => onChange({ ...form, nom: e.target.value })}
                placeholder={copy.manual.domainNamePlaceholder}
                autoFocus
                autoComplete="off"
              />
            </div>
            <div className={layout.field}>
              <label className={layout.label} htmlFor="manual-domain-registrar">
                {copy.manual.registrar}
              </label>
              <input
                id="manual-domain-registrar"
                type="text"
                className={layout.input}
                value={form.registrar}
                onChange={e => onChange({ ...form, registrar: e.target.value })}
                placeholder={copy.manual.registrarPlaceholder}
              />
            </div>
            <div className={layout.field}>
              <label className={layout.label} htmlFor="manual-domain-expiration">
                {copy.manual.expiration}
              </label>
              <input
                id="manual-domain-expiration"
                type="date"
                className={layout.input}
                value={form.expiration}
                onChange={e => onChange({ ...form, expiration: e.target.value })}
              />
            </div>
          </div>
        </div>

        <footer className={layout.footer}>
          <span className={layout.footerHint}>{copy.footer.hostRequired || copy.toasts.domainNameRequired}</span>
          <div className={layout.footerActions}>
            {isEditing && onDelete ? (
              <UiKitButton
                type="button"
                variant="ghost"
                className={layout.footerDeleteBtn}
                onClick={onDelete}
                disabled={saving}
                icon="mdi:delete-outline"
              >
                {copy.overview?.removeTitle || copy.actions?.remove || common.remove || "Supprimer"}
              </UiKitButton>
            ) : null}
            <UiKitButton type="button" variant="secondary" onClick={onClose} disabled={saving}>
              {common.cancel}
            </UiKitButton>
            <UiKitButton
              type="button"
              variant="primary"
              onClick={onSave}
              disabled={saving || !form.nom.trim()}
              icon={saving ? "mdi:loading" : isEditing ? "mdi:content-save-outline" : "mdi:plus"}
            >
              {saving
                ? common.saving
                : isEditing
                  ? copy.actions.updateManual || copy.actions.saveManual
                  : copy.actions.saveManual}
            </UiKitButton>
          </div>
        </footer>
      </div>
    </div>,
    document.getElementById("modal-root") || document.body
  );
}
