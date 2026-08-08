import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";
import { FaTimes } from "react-icons/fa";
import { Switch } from "./AdminUi";
import layout from "../EnterprisesPage/EnterpriseFormModal.module.css";
import styles from "./IngestionRuleFormModal.module.css";
import { useAdminSupportSettingsCopy } from "../../hooks/useAdminCopy";
import { getItilCategoryFormSections } from "./adminSupportSettingsI18n";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { interpolate } from "../../i18n/translate";
export default function ItilCategoryFormModal({
  open,
  mode = "create",
  draft,
  setDraft,
  saving = false,
  sectionOptions = [],
  messages = null,
  navSections = null,
  onClose,
  onSave
}) {
  const locale = useAppLocale();
  const ss = useAdminSupportSettingsCopy();
  const m = messages || ss.modals.itilCategory;
  const itilCategoryFormSections = useMemo(
    () => (Array.isArray(navSections) && navSections.length ? navSections : getItilCategoryFormSections(locale)),
    [locale, navSections]
  );
  const isCreate = mode === "create";
  const [activeSection, setActiveSection] = useState("general");
  useEffect(() => {
    if (!open) return;
    setActiveSection("general");
  }, [open]);
  const sectionMeta = useMemo(() => ({
    general: Boolean(String(draft?.name || "").trim() && String(draft?.section || "").trim()),
    details: true
  }), [draft]);
  if (!open || !draft) return null;
  const patchDraft = patch => setDraft(prev => ({
    ...prev,
    ...patch
  }));
  const modalTitle = isCreate ? m.createTitle : interpolate(m.editTitle, {
    name: draft.name || m.editFallback
  });
  const modalSubtitle = isCreate ? m.createSubtitle : m.editSubtitle;
  const renderSectionContent = () => {
    switch (activeSection) {
      case "general":
        return <>
            <div className={layout.sectionHead}>
              <h3 className={layout.sectionTitle}>{m.classificationTitle}</h3>
              <p className={layout.sectionDesc}>{m.classificationDesc}</p>
            </div>
            <div className={layout.fieldGrid2}>
              <div className={`${layout.field} ${layout.fieldFull}`}>
                <label className={layout.label} htmlFor="itil-category-section">
                  {m.sectionLabel}
                </label>
                <select id="itil-category-section" className={layout.input} value={draft.section || ""} onChange={e => patchDraft({
                section: e.target.value
              })}>
                  {sectionOptions.map(name => <option key={name} value={name}>
                      {name}
                    </option>)}
                </select>
              </div>
              <div className={`${layout.field} ${layout.fieldFull}`}>
                <label className={`${layout.label} ${layout.labelRequired}`} htmlFor="itil-category-name">
                  {m.nameLabel}
                </label>
                <input id="itil-category-name" type="text" className={layout.input} value={draft.name || ""} onChange={e => patchDraft({
                name: e.target.value
              })} placeholder={m.namePlaceholder} autoFocus />
              </div>
            </div>
          </>;
      case "details":
        return <>
            <div className={layout.sectionHead}>
              <h3 className={layout.sectionTitle}>{m.detailsTitle}</h3>
              <p className={layout.sectionDesc}>{m.detailsDesc}</p>
            </div>

            <div className={styles.statusRow}>
              <div>
                <div className={styles.statusLabel}>{m.activeLabel}</div>
                <p className={styles.statusHint}>{m.activeHint}</p>
              </div>
              <Switch checked={Boolean(draft.enabled)} onChange={on => patchDraft({
              enabled: on
            })} label={draft.enabled ? m.activeOn : m.activeOff} />
            </div>

            <div className={`${layout.field} ${layout.fieldFull}`}>
              <label className={layout.label} htmlFor="itil-category-description">
                {m.descriptionLabel}
              </label>
              <textarea id="itil-category-description" className={layout.input} rows={5} value={draft.description || ""} onChange={e => patchDraft({
              description: e.target.value
            })} placeholder={m.descriptionPlaceholder} style={{
              resize: "vertical",
              minHeight: "120px"
            }} />
            </div>
          </>;
      default:
        return null;
    }
  };
  return createPortal(<div className={layout.overlay} onClick={onClose} role="presentation">
      <div className={layout.shell} style={{
      maxWidth: "min(720px, 100%)"
    }} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="itil-category-form-title">
        <div className={layout.accentBar} aria-hidden />
        <header className={layout.header}>
          <div className={layout.headerMain}>
            <div className={layout.headerIconWrap} aria-hidden>
              <Icon icon={isCreate ? "mdi:shape-outline" : "mdi:shape"} />
            </div>
            <div className={layout.headerText}>
              <p className={layout.eyebrow}>{m.eyebrow}</p>
              <h2 className={layout.title} id="itil-category-form-title">
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
            {itilCategoryFormSections.map(section => <button key={section.id} type="button" className={`${layout.navItem} ${activeSection === section.id ? layout.navItemActive : ""}`} onClick={() => setActiveSection(section.id)} aria-current={activeSection === section.id ? "step" : undefined}>
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
            {draft.section || m.footerNoSection} · {draft.enabled ? m.activeOn : m.activeOff}
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
    </div>, document.getElementById("modal-root") || document.body);
}
