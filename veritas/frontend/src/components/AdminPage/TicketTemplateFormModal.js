import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";
import { FaTimes } from "react-icons/fa";
import layout from "../EnterprisesPage/EnterpriseFormModal.module.css";
import ProFeatureBadge from "../Misc/ProFeature/ProFeatureBadge";
import ProFeaturePromoModal from "../Misc/ProFeature/ProFeaturePromoModal";
import styles from "./TicketTemplateFormModal.module.css";
import { useAdminSupportSettingsCopy } from "../../hooks/useAdminCopy";
import { getTemplateFormSections } from "./adminSupportSettingsI18n";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { interpolate } from "../../i18n/translate";
export default function TicketTemplateFormModal({
  open,
  mode = "create",
  draft,
  setDraft,
  saving = false,
  onClose,
  onSave,
  onOpenVariables,
  templateVariablesEnabled = true,
  templateEditorRef,
  templateImageInputRef,
  selectedImageWidthPx,
  setSelectedImageWidthPx,
  onExecCommand,
  onInsertImage,
  onImageUpload,
  onEditorClick,
  onResizeImage,
  onApplyImageWidth
}) {
  const locale = useAppLocale();
  const ss = useAdminSupportSettingsCopy();
  const m = ss.modals.template;
  const templateFormSections = useMemo(() => getTemplateFormSections(locale), [locale]);
  const isCreate = mode === "create";
  const [activeSection, setActiveSection] = useState("general");
  const [showVariablesProPromo, setShowVariablesProPromo] = useState(false);
  useEffect(() => {
    if (!open) return;
    setActiveSection("general");
  }, [open]);
  useEffect(() => {
    if (!open || activeSection !== "content" || !templateEditorRef?.current) return;
    templateEditorRef.current.innerHTML = String(draft?.content || "");
  }, [open, activeSection, templateEditorRef]);
  if (!open || !draft) return null;
  const modalTitle = isCreate ? m.createTitle : interpolate(m.editTitle, {
    name: draft.name || m.editFallback
  });
  const modalSubtitle = isCreate ? m.createSubtitle : m.editSubtitle;
  const renderSectionContent = () => {
    switch (activeSection) {
      case "general":
        return <>
            <div className={layout.sectionHead}>
              <h3 className={layout.sectionTitle}>{m.generalTitle}</h3>
              <p className={layout.sectionDesc}>{m.generalDesc}</p>
            </div>
            <div className={layout.fieldGrid2}>
              <div className={`${layout.field} ${layout.fieldFull}`}>
                <label className={`${layout.label} ${layout.labelRequired}`} htmlFor="template-name">
                  {m.nameLabel}
                </label>
                <input id="template-name" type="text" className={layout.input} value={draft.name || ""} onChange={e => setDraft(prev => ({
                ...prev,
                name: e.target.value
              }))} placeholder={m.namePlaceholder} autoFocus />
              </div>
            </div>
          </>;
      case "content":
        return <>
            <div className={layout.sectionHead}>
              <h3 className={layout.sectionTitle}>{m.contentTitle}</h3>
              <p className={layout.sectionDesc}>{m.contentDesc}</p>
            </div>

            <div className={styles.editorShell}>
              <div className={styles.toolbar}>
                <div className={styles.toolGroup} role="group" aria-label={m.toolbarFormatAria}>
                  <button type="button" className={`${styles.toolBtn} ${styles.toolBtnIcon}`} onClick={() => onExecCommand?.("bold")} title={m.bold}>
                    <Icon icon="mdi:format-bold" aria-hidden />
                  </button>
                  <button type="button" className={`${styles.toolBtn} ${styles.toolBtnIcon}`} onClick={() => onExecCommand?.("italic")} title={m.italic}>
                    <Icon icon="mdi:format-italic" aria-hidden />
                  </button>
                  <button type="button" className={`${styles.toolBtn} ${styles.toolBtnIcon}`} onClick={() => onExecCommand?.("underline")} title={m.underline}>
                    <Icon icon="mdi:format-underline" aria-hidden />
                  </button>
                </div>

                <span className={styles.toolSep} aria-hidden />

                <div className={styles.toolGroup} role="group" aria-label={m.toolbarListsAria}>
                  <button type="button" className={`${styles.toolBtn} ${styles.toolBtnIcon}`} onClick={() => onExecCommand?.("insertUnorderedList")} title={m.bulletList}>
                    <Icon icon="mdi:format-list-bulleted" aria-hidden />
                  </button>
                  <button type="button" className={`${styles.toolBtn} ${styles.toolBtnIcon}`} onClick={() => onExecCommand?.("insertOrderedList")} title={m.numberedList}>
                    <Icon icon="mdi:format-list-numbered" aria-hidden />
                  </button>
                  <button type="button" className={`${styles.toolBtn} ${styles.toolBtnIcon}`} onClick={onInsertImage} title={m.insertImage}>
                    <Icon icon="mdi:image-outline" aria-hidden />
                  </button>
                </div>

                <span className={styles.toolSep} aria-hidden />

                <div className={styles.toolGroup} role="group" aria-label={m.toolbarSizeAria}>
                  {[25, 50, 75, 100].map(pct => <button key={pct} type="button" className={`${styles.toolBtn} ${styles.sizeBtn}`} onClick={() => onResizeImage?.(pct)} title={interpolate(m.widthPct, {
                  pct
                })}>
                      {pct}%
                    </button>)}
                </div>

                <span className={styles.toolSep} aria-hidden />

                <div className={styles.widthGroup} role="group" aria-label={m.toolbarWidthAria}>
                  <span className={styles.widthLabel}>{m.widthLabel}</span>
                  <div className={styles.numberStepper}>
                    <input className={styles.numberInput} type="number" min="1" step="10" value={selectedImageWidthPx} onChange={e => setSelectedImageWidthPx?.(e.target.value)} placeholder="px" aria-label={m.widthPxAria} />
                    <div className={styles.numberStepperBtns}>
                      <button type="button" className={styles.stepperBtn} onClick={() => {
                      const current = Number(selectedImageWidthPx);
                      const base = Number.isFinite(current) && current > 0 ? current : 320;
                      setSelectedImageWidthPx?.(String(base + 10));
                    }} title={m.increaseWidth} aria-label={m.increaseWidthAria}>
                        <Icon icon="mdi:chevron-up" aria-hidden />
                      </button>
                      <button type="button" className={styles.stepperBtn} onClick={() => {
                      const current = Number(selectedImageWidthPx);
                      const base = Number.isFinite(current) && current > 0 ? current : 320;
                      setSelectedImageWidthPx?.(String(Math.max(1, base - 10)));
                    }} title={m.decreaseWidth} aria-label={m.decreaseWidthAria}>
                        <Icon icon="mdi:chevron-down" aria-hidden />
                      </button>
                    </div>
                  </div>
                  <button type="button" className={styles.applyBtn} onClick={onApplyImageWidth}>
                    {m.apply}
                  </button>
                </div>

                <input ref={templateImageInputRef} type="file" accept="image/*" onChange={onImageUpload} className={styles.hiddenInput} />
              </div>

              <div ref={templateEditorRef} className={styles.editor} contentEditable suppressContentEditableWarning onInput={e => {
              const htmlContent = String(e.currentTarget?.innerHTML || "").replace(/\soutline:\s*[^;"']+;?/gi, "");
              setDraft(prev => ({
                ...prev,
                content: htmlContent
              }));
            }} onClick={onEditorClick} />
            </div>

            <button type="button" className={`${styles.variablesBtn} ${!templateVariablesEnabled ? styles.variablesBtnLocked : ""}`} onClick={templateVariablesEnabled ? onOpenVariables : () => setShowVariablesProPromo(true)} title={templateVariablesEnabled ? m.variablesBtnTitle : m.variablesBtnLockedTitle}>
              <Icon icon="mdi:code-tags" aria-hidden />
              {m.variablesBtn}
              {!templateVariablesEnabled ? <ProFeatureBadge variant="inline" className={styles.proBadgeInline} /> : null}
            </button>
          </>;
      default:
        return null;
    }
  };
  const modalNode = <div className={layout.overlay} onClick={onClose} role="presentation">
      <div className={layout.shell} style={{
      maxWidth: "min(920px, 100%)"
    }} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="ticket-template-form-title">
        <div className={layout.accentBar} aria-hidden />
        <header className={layout.header}>
          <div className={layout.headerMain}>
            <div className={layout.headerIconWrap} aria-hidden>
              <Icon icon={isCreate ? "mdi:text-box-plus-outline" : "mdi:text-box-edit-outline"} />
            </div>
            <div className={layout.headerText}>
              <p className={layout.eyebrow}>{m.eyebrow}</p>
              <h2 className={layout.title} id="ticket-template-form-title">
                {modalTitle}
              </h2>
              <p className={layout.subtitle}>{modalSubtitle}</p>
            </div>
          </div>
          <button type="button" className={layout.closeBtn} onClick={onClose} disabled={saving} aria-label={m.closeAria}>
            <FaTimes />
          </button>
        </header>

        <div className={layout.body}>
          <nav className={layout.nav} aria-label={m.sectionsAria}>
            {templateFormSections.map(section => <button key={section.id} type="button" className={`${layout.navItem} ${activeSection === section.id ? layout.navItemActive : ""}`} onClick={() => setActiveSection(section.id)} aria-current={activeSection === section.id ? "step" : undefined}>
                <Icon icon={section.icon} className={layout.navItemIcon} aria-hidden />
                <span className={layout.navItemText}>
                  <span className={layout.navItemLabel}>{section.label}</span>
                  <span className={layout.navItemHint}>{section.description}</span>
                </span>
                {section.id === "general" && Boolean(draft.name?.trim()) && <span className={layout.navBadge}>✓</span>}
                {section.id === "content" && Boolean(draft.content?.trim()) && <span className={layout.navBadge}>✓</span>}
              </button>)}
          </nav>

          <div className={layout.content}>{renderSectionContent()}</div>
        </div>

        <footer className={layout.footer}>
          <span className={layout.footerHint}>
            {draft.name?.trim() ? draft.name : m.footerUntitled}
            {m.footerSectionJoiner}
            {activeSection === "general" ? m.footerSectionGeneral : m.footerSectionContent}
          </span>
          <div className={layout.footerActions}>
            <button type="button" className={layout.ghostBtn} onClick={onClose} disabled={saving}>
              {m.cancel}
            </button>
            <button type="button" className={layout.primaryBtn} onClick={onSave} disabled={saving}>
              {saving ? <>
                  <Icon icon="mdi:loading" className={layout.spinning} aria-hidden />
                  {m.saving}
                </> : isCreate ? <>
                  <Icon icon="mdi:check" aria-hidden />
                  {m.createBtn}
                </> : <>
                  <Icon icon="mdi:content-save-outline" aria-hidden />
                  {m.saveBtn}
                </>}
            </button>
          </div>
        </footer>
      </div>
    </div>;
  return <>
      {createPortal(modalNode, document.getElementById("modal-root") || document.body)}
      <ProFeaturePromoModal open={showVariablesProPromo} featureKey="ticketTemplateVariables" onClose={() => setShowVariablesProPromo(false)} />
    </>;
}
