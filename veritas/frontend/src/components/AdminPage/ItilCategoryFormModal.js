import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";
import { Switch } from "./AdminUi";
import layout from "../EnterprisesPage/EnterpriseFormModal.module.css";
import styles from "./IngestionRuleFormModal.module.css";
import { useAdminSupportSettingsCopy } from "../../hooks/useAdminCopy";
import { useCommonCopy } from "../../hooks/useCommonCopy";
import { getItilCategoryFormSections } from "./adminSupportSettingsI18n";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { interpolate } from "../../i18n/translate";
import { UiKitButton, uiKitLayoutsStyles as kit, useFinderNavIndicator } from "../UiKit";

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
  const commonCopy = useCommonCopy();
  const ss = useAdminSupportSettingsCopy();
  const m = messages || ss.modals.itilCategory;
  const itilCategoryFormSections = useMemo(
    () => (Array.isArray(navSections) && navSections.length ? navSections : getItilCategoryFormSections(locale)),
    [locale, navSections]
  );
  const isCreate = mode === "create";
  const [activeSection, setActiveSection] = useState("general");
  const { trackRef: navTrackRef, indicator: navIndicator } = useFinderNavIndicator([activeSection, open]);

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
  const canSave = Boolean(String(draft?.name || "").trim());

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
                <select
                  id="itil-category-section"
                  className={layout.input}
                  value={draft.section || ""}
                  onChange={e => patchDraft({ section: e.target.value })}
                >
                  {sectionOptions.map(name => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>
              <div className={`${layout.field} ${layout.fieldFull}`}>
                <label className={`${layout.label} ${layout.labelRequired}`} htmlFor="itil-category-name">
                  {m.nameLabel}
                </label>
                <input
                  id="itil-category-name"
                  type="text"
                  className={layout.input}
                  value={draft.name || ""}
                  onChange={e => patchDraft({ name: e.target.value })}
                  placeholder={m.namePlaceholder}
                  autoFocus
                />
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
              <Switch
                checked={Boolean(draft.enabled)}
                onChange={on => patchDraft({ enabled: on })}
                label={draft.enabled ? m.activeOn : m.activeOff}
              />
            </div>

            <div className={`${layout.field} ${layout.fieldFull}`}>
              <label className={layout.label} htmlFor="itil-category-description">
                {m.descriptionLabel}
              </label>
              <textarea
                id="itil-category-description"
                className={layout.input}
                rows={5}
                value={draft.description || ""}
                onChange={e => patchDraft({ description: e.target.value })}
                placeholder={m.descriptionPlaceholder}
                style={{
                  resize: "vertical",
                  minHeight: "120px"
                }}
              />
            </div>
          </>;
      default:
        return null;
    }
  };

  return createPortal(
    <div className={layout.overlay} onClick={onClose} role="presentation">
      <div
        className={layout.shell}
        style={{ maxWidth: "min(720px, 100%)" }}
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="itil-category-form-title"
      >
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
          <UiKitButton
            type="button"
            square
            variant="secondary"
            className={layout.closeBtn}
            onClick={onClose}
            disabled={saving}
            aria-label={m.closeAria || commonCopy.close}
            icon="mdi:close"
          />
        </header>

        <div className={layout.body}>
          <aside className={`${kit.finderSidebar} ${layout.modalNav}`} aria-label={m.sectionsAria}>
            <nav
              ref={navTrackRef}
              className={`${kit.finderPrimary} ${kit.finderPrimaryAnimated} ${layout.modalNavTrack}`}
            >
              {navIndicator.ready ? (
                <div
                  className={kit.finderNavIndicator}
                  style={{
                    transform: `translate3d(0, ${navIndicator.top}px, 0)`,
                    height: navIndicator.height
                  }}
                  aria-hidden
                />
              ) : null}
              {itilCategoryFormSections.map(section => {
                const active = activeSection === section.id;
                return (
                  <button
                    key={section.id}
                    type="button"
                    className={`${kit.finderItem} ${kit.finderItemRich} ${active ? kit.finderItemActive : ""}`}
                    onClick={() => setActiveSection(section.id)}
                    aria-current={active ? "page" : undefined}
                  >
                    <Icon icon={section.icon} className={kit.finderItemIcon} aria-hidden />
                    <span className={kit.finderItemStack}>
                      <span className={kit.finderItemLabel}>{section.label}</span>
                      {section.description ? <span className={kit.finderItemDesc}>{section.description}</span> : null}
                    </span>
                    {sectionMeta[section.id] ? <span className={layout.navBadge}>✓</span> : null}
                  </button>
                );
              })}
            </nav>
          </aside>

          <div className={layout.content} key={activeSection}>
            <div className={kit.contentFadeUp}>{renderSectionContent()}</div>
          </div>
        </div>

        <footer className={layout.footer}>
          <span className={layout.footerHint}>
            {draft.section || m.footerNoSection} · {draft.enabled ? m.activeOn : m.activeOff}
          </span>
          <div className={layout.footerActions}>
            <UiKitButton type="button" variant="secondary" onClick={onClose} disabled={saving}>
              {m.cancel || commonCopy.cancel}
            </UiKitButton>
            <UiKitButton
              type="button"
              variant="primary"
              onClick={onSave}
              disabled={saving || !canSave}
              icon={saving ? undefined : isCreate ? "mdi:check" : "mdi:content-save-outline"}
            >
              {saving ? (
                <>
                  <Icon icon="mdi:loading" className={layout.spinning} aria-hidden />
                  {m.saving || commonCopy.saving}
                </>
              ) : isCreate ? (
                m.createBtn
              ) : (
                m.saveBtn || commonCopy.save
              )}
            </UiKitButton>
          </div>
        </footer>
      </div>
    </div>,
    document.getElementById("modal-root") || document.body
  );
}
