import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";
import { FaTimes } from "react-icons/fa";
import { Switch } from "./AdminUi";
import { useCommonCopy } from "../../hooks/useCommonCopy";
import { useAdminCommonCopy, useAdminModalCopy } from "../../hooks/useAdminCopy";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { getWebhookFormSections } from "./adminFormModalsI18n";
import { interpolate } from "../../i18n/translate";
import { WEBHOOK_TYPE_PRESETS, describeWebhookChannel } from "./webhookConstants";
import layout from "../EnterprisesPage/EnterpriseFormModal.module.css";
import formStyles from "./IngestionRuleFormModal.module.css";
import styles from "./WebhookFormModal.module.css";
export default function WebhookFormModal({
  open,
  mode = "create",
  draft,
  setDraft,
  saving = false,
  testing = false,
  testMessage = "",
  testStatus = null,
  onClose,
  onSave,
  onTest
}) {
  const locale = useAppLocale();
  const commonCopy = useCommonCopy();
  const adminCopy = useAdminCommonCopy();
  const modalCopy = useAdminModalCopy("webhookForm");
  const formSections = useMemo(() => getWebhookFormSections(locale), [locale]);
  const isCreate = mode === "create";
  const [activeSection, setActiveSection] = useState("type");
  useEffect(() => {
    if (!open) return;
    setActiveSection(isCreate ? "type" : "config");
  }, [open, isCreate]);
  const sectionMeta = useMemo(() => ({
    type: Boolean(draft?.channel),
    config: Boolean(String(draft?.name || "").trim() && String(draft?.url || "").trim())
  }), [draft]);
  if (!open || !draft) return null;
  const patchDraft = patch => setDraft(prev => ({
    ...prev,
    ...patch
  }));
  const modalTitle = isCreate ? modalCopy.createTitle : interpolate(modalCopy.editTitle, {
    name: draft.name || modalCopy.editFallback
  });
  const modalSubtitle = isCreate ? modalCopy.createSubtitle : modalCopy.editSubtitle;
  const renderSectionContent = () => {
    switch (activeSection) {
      case "type":
        return <>
            <div className={layout.sectionHead}>
              <h3 className={layout.sectionTitle}>{modalCopy.typeTitle}</h3>
              <p className={layout.sectionDesc}>{modalCopy.typeDesc}</p>
            </div>
            <div className={styles.typeGrid}>
              {WEBHOOK_TYPE_PRESETS.map(preset => {
              const selected = (draft.channel || "teams") === preset.key;
              const disabled = Boolean(preset.comingSoon);
              return <button key={preset.key} type="button" className={`${styles.typeCard} ${selected ? styles.typeCardSelected : ""} ${disabled ? styles.typeCardDisabled : ""}`} disabled={disabled} onClick={() => patchDraft({
                channel: preset.key
              })}>
                    <Icon icon={preset.icon} className={styles.typeCardIcon} aria-hidden />
                    <span className={styles.typeCardLabel}>{preset.label}</span>
                    <span className={styles.typeCardHint}>
                      {disabled ? adminCopy.comingSoon : preset.subtitle}
                    </span>
                  </button>;
            })}
            </div>
          </>;
      case "config":
        return <>
            <div className={layout.sectionHead}>
              <h3 className={layout.sectionTitle}>{modalCopy.configTitle}</h3>
              <p className={layout.sectionDesc}>{modalCopy.configDesc}</p>
            </div>

            <div className={formStyles.statusRow}>
              <div>
                <div className={formStyles.statusLabel}>{modalCopy.webhookActiveLabel}</div>
                <p className={formStyles.statusHint}>{modalCopy.webhookActiveHint}</p>
              </div>
              <Switch checked={Boolean(draft.enabled)} onChange={on => patchDraft({
              enabled: on
            })} label={draft.enabled ? adminCopy.active : adminCopy.inactive} />
            </div>

            <div className={layout.fieldGrid2}>
              <div className={`${layout.field} ${layout.fieldFull}`}>
                <label className={`${layout.label} ${layout.labelRequired}`} htmlFor="webhook-name">
                  {modalCopy.nameLabel}
                </label>
                <input id="webhook-name" type="text" className={layout.input} value={draft.name || ""} onChange={e => patchDraft({
                name: e.target.value
              })} placeholder={modalCopy.namePlaceholder} autoFocus />
              </div>
              <div className={`${layout.field} ${layout.fieldFull}`}>
                <label className={`${layout.label} ${layout.labelRequired}`} htmlFor="webhook-url">
                  {modalCopy.urlLabel}
                </label>
                <input id="webhook-url" type="url" className={layout.input} value={draft.url || ""} onChange={e => patchDraft({
                url: e.target.value
              })} placeholder={modalCopy.urlPlaceholder} />
              </div>
              {Boolean(String(draft.channelName || "").trim()) && <div className={`${layout.field} ${layout.fieldFull}`}>
                  <label className={layout.label} htmlFor="webhook-channel-name">
                    {modalCopy.channelDetectedLabel}
                  </label>
                  <input id="webhook-channel-name" type="text" className={layout.input} value={draft.channelName || ""} readOnly />
                </div>}
            </div>

            <div className={styles.testRow}>
              <button type="button" className={styles.testBtn} onClick={onTest} disabled={testing || saving || !String(draft.url || "").trim()}>
                {testing ? <>
                    <Icon icon="mdi:loading" className={layout.spinning} aria-hidden />
                    {adminCopy.testing}
                  </> : <>
                    <Icon icon="mdi:connection" aria-hidden />
                    {adminCopy.testConnection}
                  </>}
              </button>
              {testMessage ? <span className={testStatus === "success" ? styles.testMessageSuccess : styles.testMessageError}>
                  {testMessage}
                </span> : null}
            </div>
          </>;
      default:
        return null;
    }
  };
  return createPortal(<div className={layout.overlay} onClick={onClose} role="presentation">
      <div className={layout.shell} style={{
      maxWidth: "min(760px, 100%)"
    }} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="webhook-form-title">
        <div className={layout.accentBar} aria-hidden />
        <header className={layout.header}>
          <div className={layout.headerMain}>
            <div className={layout.headerIconWrap} aria-hidden>
              <Icon icon={isCreate ? "mdi:link-plus" : "mdi:link-variant"} />
            </div>
            <div className={layout.headerText}>
              <p className={layout.eyebrow}>{modalCopy.eyebrow}</p>
              <h2 className={layout.title} id="webhook-form-title">
                {modalTitle}
              </h2>
              <p className={layout.subtitle}>{modalSubtitle}</p>
            </div>
          </div>
          <button type="button" className={layout.closeBtn} onClick={onClose} disabled={saving || testing} aria-label={commonCopy.close}>
            <FaTimes />
          </button>
        </header>

        <div className={layout.body}>
          <nav className={layout.nav} aria-label={modalCopy.sectionsAria}>
            {formSections.map(section => <button key={section.id} type="button" className={`${layout.navItem} ${activeSection === section.id ? layout.navItemActive : ""}`} onClick={() => setActiveSection(section.id)} aria-current={activeSection === section.id ? "step" : undefined}>
                <Icon icon={section.icon} className={layout.navItemIcon} aria-hidden />
                <span className={layout.navItemText}>
                  <span className={layout.navItemLabel}>{section.label}</span>
                  <span className={layout.navItemHint}>{section.description}</span>
                </span>
                {sectionMeta[section.id] && <span className={layout.navBadge}>✓</span>}
              </button>)}
          </nav>

          <div className={layout.content}>{renderSectionContent()}</div>
        </div>

        <footer className={layout.footer}>
          <span className={layout.footerHint}>
            {describeWebhookChannel(draft.channel)} · {draft.enabled ? adminCopy.active : adminCopy.inactive}
          </span>
          <div className={layout.footerActions}>
            <button type="button" className={layout.ghostBtn} onClick={onClose} disabled={saving || testing}>
              {commonCopy.cancel}
            </button>
            <button type="button" className={layout.primaryBtn} onClick={onSave} disabled={saving || testing}>
              {saving ? <>
                  <Icon icon="mdi:loading" className={layout.spinning} aria-hidden />
                  {commonCopy.saving}
                </> : isCreate ? <>
                  <Icon icon="mdi:check" aria-hidden />
                  {modalCopy.createBtn}
                </> : <>
                  <Icon icon="mdi:content-save-outline" aria-hidden />
                  {commonCopy.save}
                </>}
            </button>
          </div>
        </footer>
      </div>
    </div>, document.getElementById("modal-root") || document.body);
}
