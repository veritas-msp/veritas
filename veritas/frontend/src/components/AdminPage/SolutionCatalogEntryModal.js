import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";
import { FaTimes } from "react-icons/fa";
import { Switch } from "./AdminUi";
import layout from "../EnterprisesPage/EnterpriseFormModal.module.css";
import styles from "./SolutionCatalogEntryModal.module.css";
import shared from "./IngestionRuleFormModal.module.css";
import { useAdminSupportSettingsCopy } from "../../hooks/useAdminCopy";
import { interpolate } from "../../i18n/translate";
export default function SolutionCatalogEntryModal({
  open,
  mode = "create",
  draft,
  setDraft,
  saving = false,
  onClose,
  onSave
}) {
  const ss = useAdminSupportSettingsCopy();
  const m = ss.modals.solution;
  if (!open || !draft) return null;
  const isCreate = mode === "create";
  const categoryLabel = draft.category === "action" ? m.categoryAction : m.categoryIntervention;
  const patchDraft = patch => setDraft(prev => ({
    ...prev,
    ...patch
  }));
  const handleSubmit = event => {
    event.preventDefault();
    onSave?.();
  };
  const modalTitle = isCreate ? draft.category === "action" ? m.createActionTitle : m.createInterventionTitle : interpolate(m.editTitle, {
    name: draft.label || categoryLabel.toLowerCase()
  });
  return createPortal(<div className={layout.overlay} onClick={onClose} role="presentation">
      <div className={layout.shell} style={{
      maxWidth: "min(480px, 100%)"
    }} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="solution-catalog-modal-title">
        <div className={layout.accentBar} aria-hidden />
        <header className={layout.header}>
          <div className={layout.headerMain}>
            <div className={layout.headerIconWrap} aria-hidden>
              <Icon icon="mdi:clipboard-check-outline" />
            </div>
            <div className={layout.headerText}>
              <p className={layout.eyebrow}>{m.eyebrow}</p>
              <h2 className={layout.title} id="solution-catalog-modal-title">
                {modalTitle}
              </h2>
              <p className={layout.subtitle}>{m.subtitle}</p>
            </div>
          </div>
          <button type="button" className={layout.closeBtn} onClick={onClose} disabled={saving} aria-label={m.closeAria}>
            <FaTimes />
          </button>
        </header>

        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={layout.content}>
            <div className={layout.fieldStack}>
              <div className={layout.field}>
                <label className={`${layout.label} ${layout.labelRequired}`} htmlFor="solution-catalog-label">
                  {m.labelField}
                </label>
                <input id="solution-catalog-label" type="text" className={layout.input} value={draft.label || ""} onChange={e => patchDraft({
                label: e.target.value
              })} placeholder={m.labelPlaceholder} maxLength={120} autoFocus disabled={saving} />
              </div>

              <div className={layout.field}>
                <label className={layout.label} htmlFor="solution-catalog-order">
                  {m.orderLabel}
                </label>
                <input id="solution-catalog-order" type="number" min="0" className={layout.input} value={Number(draft.displayOrder) || 0} onChange={e => patchDraft({
                displayOrder: Number(e.target.value) || 0
              })} disabled={saving} />
              </div>

              <div className={`${shared.statusRow} ${styles.statusRow}`}>
                <div>
                  <div className={shared.statusLabel}>{m.activeLabel}</div>
                  <p className={shared.statusHint}>{m.activeHint}</p>
                </div>
                <Switch checked={draft.isActive !== false} onChange={on => patchDraft({
                isActive: on
              })} label={draft.isActive !== false ? m.activeOn : m.activeOff} disabled={saving} />
              </div>
            </div>
          </div>

          <footer className={layout.footer}>
            <span className={layout.footerHint}>{categoryLabel}</span>
            <div className={layout.footerActions}>
              <button type="button" className={layout.ghostBtn} onClick={onClose} disabled={saving}>
                {m.cancel}
              </button>
              <button type="submit" className={layout.primaryBtn} disabled={saving || !String(draft.label || "").trim()}>
                {saving ? m.saving : isCreate ? m.createBtn : m.saveBtn}
              </button>
            </div>
          </footer>
        </form>
      </div>
    </div>, document.body);
}
