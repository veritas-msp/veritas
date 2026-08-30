import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";
import { FaTimes } from "react-icons/fa";
import { Switch } from "./AdminUi";
import { useCommonCopy } from "../../hooks/useCommonCopy";
import { useAdminCommonCopy, useAdminModalCopy } from "../../hooks/useAdminCopy";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { getContractModuleOptionFormSections } from "./adminFormModalsI18n";
import { interpolate } from "../../i18n/translate";
import IconPicker from "./IconPicker";
import layout from "../EnterprisesPage/EnterpriseFormModal.module.css";
import formStyles from "./IngestionRuleFormModal.module.css";
import styles from "./ContractModuleOptionFormModal.module.css";
export default function ContractModuleOptionFormModal({
  open,
  mode = "create",
  draft,
  setDraft,
  saving = false,
  onClose,
  onSave
}) {
  const locale = useAppLocale();
  const commonCopy = useCommonCopy();
  const adminCopy = useAdminCommonCopy();
  const modalCopy = useAdminModalCopy("contractModuleOptionForm");
  const formSections = useMemo(() => getContractModuleOptionFormSections(locale), [locale]);
  const isCreate = mode === "create";
  const [activeSection, setActiveSection] = useState("identity");
  useEffect(() => {
    if (!open) return;
    setActiveSection("identity");
  }, [open]);
  const sectionMeta = useMemo(() => ({
    identity: Boolean(String(draft?.label || "").trim()),
    presentation: true
  }), [draft]);
  if (!open || !draft) return null;
  const patchDraft = patch => setDraft(prev => ({
    ...prev,
    ...patch
  }));
  const modalTitle = isCreate ? modalCopy.createTitle : interpolate(modalCopy.editTitle, {
    name: draft.label || modalCopy.editFallback
  });
  const modalSubtitle = isCreate ? modalCopy.createSubtitle : modalCopy.editSubtitle;
  const renderSectionContent = () => {
    switch (activeSection) {
      case "identity":
        return <>
            <div className={layout.sectionHead}>
              <h3 className={layout.sectionTitle}>{modalCopy.identityTitle}</h3>
              <p className={layout.sectionDesc}>{modalCopy.identityDesc}</p>
            </div>
            <div className={layout.fieldGrid2}>
              {isCreate ? <div className={`${layout.field} ${layout.fieldFull}`}>
                  <label className={layout.label} htmlFor="option-module-key">
                    {modalCopy.moduleKeyLabel}
                  </label>
                  <input id="option-module-key" type="text" className={layout.input} value={draft.moduleKey || ""} onChange={e => patchDraft({
                moduleKey: e.target.value
              })} placeholder={modalCopy.moduleKeyPlaceholder} autoFocus />
                  <p className={layout.sectionDesc}>{modalCopy.moduleKeyHintCreate}</p>
                </div> : <div className={`${layout.field} ${layout.fieldFull}`}>
                  <label className={layout.label} htmlFor="option-module-key">
                    {modalCopy.moduleKeyLabel}
                  </label>
                  <input id="option-module-key" type="text" className={layout.input} value={draft.moduleKey || ""} disabled />
                  <p className={layout.sectionDesc}>{modalCopy.moduleKeyHintEdit}</p>
                </div>}
              <div className={`${layout.field} ${layout.fieldFull}`}>
                <label className={`${layout.label} ${layout.labelRequired}`} htmlFor="option-label">
                  {modalCopy.displayLabel}
                </label>
                <input id="option-label" type="text" className={layout.input} value={draft.label || ""} onChange={e => patchDraft({
                label: e.target.value
              })} placeholder={modalCopy.displayLabelPlaceholder} autoFocus={!isCreate} />
              </div>
            </div>
          </>;
      case "presentation":
        return <>
            <div className={layout.sectionHead}>
              <h3 className={layout.sectionTitle}>{modalCopy.presentationTitle}</h3>
              <p className={layout.sectionDesc}>{modalCopy.presentationDesc}</p>
            </div>
            <div className={layout.fieldStack}>
              <div className={styles.presentationRow}>
                <div className={layout.field}>
                  <span className={layout.label}>{adminCopy.icon}</span>
                  <div className={styles.iconPickerWrap}>
                    <IconPicker value={draft.icon || "mdi:puzzle-outline"} onChange={icon => patchDraft({
                    icon
                  })} searchable popover searchPlaceholder={modalCopy.iconSearchPlaceholder} searchAria={modalCopy.iconSearchAria} clearSearchLabel={modalCopy.iconClearSearch} changeLabel={modalCopy.iconChangeLabel} pickerAria={modalCopy.iconPickerAria} />
                  </div>
                </div>
                <div className={`${layout.field} ${styles.orderField}`}>
                  <label className={layout.label} htmlFor="option-sort-order">
                    {adminCopy.order}
                  </label>
                  <input id="option-sort-order" type="number" className={layout.input} value={draft.sortOrder ?? ""} onChange={e => patchDraft({
                  sortOrder: e.target.value
                })} placeholder={adminCopy.auto} />
                </div>
              </div>
              <div className={`${formStyles.statusRow} ${styles.statusCard}`}>
                <div>
                  <div className={formStyles.statusLabel}>{modalCopy.optionActiveLabel}</div>
                  <p className={formStyles.statusHint}>{modalCopy.optionActiveHint}</p>
                </div>
                <Switch checked={Boolean(draft.enabled)} onChange={on => patchDraft({
                enabled: on
              })} label={draft.enabled ? adminCopy.visible : adminCopy.hidden} />
              </div>
            </div>
          </>;
      default:
        return null;
    }
  };
  const canSave = Boolean(String(draft.label || "").trim());
  return createPortal(<div className={layout.overlay} onClick={onClose} role="presentation">
      <div className={layout.shell} style={{
      maxWidth: "min(720px, 100%)"
    }} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="contract-module-option-form-title">
        <div className={layout.accentBar} aria-hidden />
        <header className={layout.header}>
          <div className={layout.headerMain}>
            <div className={layout.headerIconWrap} aria-hidden>
              <Icon icon={isCreate ? "mdi:file-document-edit-outline" : "mdi:file-document-edit"} />
            </div>
            <div className={layout.headerText}>
              <p className={layout.eyebrow}>{modalCopy.eyebrow}</p>
              <h2 className={layout.title} id="contract-module-option-form-title">
                {modalTitle}
              </h2>
              <p className={layout.subtitle}>{modalSubtitle}</p>
            </div>
          </div>
          <button type="button" className={layout.closeBtn} onClick={onClose} disabled={saving} aria-label={commonCopy.close}>
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
            {draft.label?.trim() || adminCopy.noLabel} · {draft.enabled ? adminCopy.visible : adminCopy.hidden}
          </span>
          <div className={layout.footerActions}>
            <button type="button" className={layout.ghostBtn} onClick={onClose} disabled={saving}>
              {commonCopy.cancel}
            </button>
            <button type="button" className={layout.primaryBtn} onClick={onSave} disabled={saving || !canSave}>
              {saving ? <>
                  <Icon icon="mdi:loading" className={layout.spinning} aria-hidden />
                  {commonCopy.saving}
                </> : isCreate ? <>
                  <Icon icon="mdi:plus" aria-hidden />
                  {modalCopy.addBtn}
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
