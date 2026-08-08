import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";
import { FaTimes } from "react-icons/fa";
import { Switch } from "./AdminUi";
import { useCommonCopy } from "../../hooks/useCommonCopy";
import { useAdminCommonCopy, useAdminModalCopy } from "../../hooks/useAdminCopy";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { getTechNewsFeedFormSections } from "./adminFormModalsI18n";
import { interpolate } from "../../i18n/translate";
import { DEFAULT_TECH_NEWS_FEED_CATEGORIES, DEFAULT_TECH_NEWS_FEED_LOCALE } from "./techNewsFeedConstants";
import { APP_LOCALES } from "../../i18n/locales";
import layout from "../EnterprisesPage/EnterpriseFormModal.module.css";
import formStyles from "./IngestionRuleFormModal.module.css";
export default function TechNewsFeedFormModal({
  open,
  mode = "create",
  draft,
  setDraft,
  saving = false,
  categoryOptions = DEFAULT_TECH_NEWS_FEED_CATEGORIES,
  categoryLabel = key => key,
  localeOptions = APP_LOCALES.map(loc => loc.code),
  onClose,
  onSave
}) {
  const locale = useAppLocale();
  const commonCopy = useCommonCopy();
  const adminCopy = useAdminCommonCopy();
  const modalCopy = useAdminModalCopy("techNewsFeedForm");
  const formSections = useMemo(() => getTechNewsFeedFormSections(locale), [locale]);
  const isCreate = mode === "create";
  const [activeSection, setActiveSection] = useState("source");
  useEffect(() => {
    if (!open) return;
    setActiveSection("source");
  }, [open]);
  const sectionMeta = useMemo(() => ({
    source: Boolean(String(draft?.source || "").trim() && String(draft?.url || "").trim()),
    display: true
  }), [draft]);
  if (!open || !draft) return null;
  const patchDraft = patch => setDraft(prev => ({
    ...prev,
    ...patch
  }));
  const modalTitle = isCreate ? modalCopy.createTitle : interpolate(modalCopy.editTitle, {
    name: draft.source || modalCopy.editFallback
  });
  const modalSubtitle = isCreate ? modalCopy.createSubtitle : modalCopy.editSubtitle;
  const categories = categoryOptions?.length ? categoryOptions : DEFAULT_TECH_NEWS_FEED_CATEGORIES;
  const locales = (localeOptions?.length ? localeOptions : APP_LOCALES.map(loc => loc.code)).map(code => APP_LOCALES.find(loc => loc.code === code) || {
    code,
    flag: "",
    label: code
  });
  const renderSectionContent = () => {
    switch (activeSection) {
      case "source":
        return <>
            <div className={layout.sectionHead}>
              <h3 className={layout.sectionTitle}>{modalCopy.sourceTitle}</h3>
              <p className={layout.sectionDesc}>{modalCopy.sourceDesc}</p>
            </div>
            <div className={layout.fieldGrid2}>
              <div className={`${layout.field} ${layout.fieldFull}`}>
                <label className={`${layout.label} ${layout.labelRequired}`} htmlFor="feed-source">
                  {modalCopy.sourceNameLabel}
                </label>
                <input id="feed-source" type="text" className={layout.input} value={draft.source || ""} onChange={e => patchDraft({
                source: e.target.value
              })} placeholder={modalCopy.sourceNamePlaceholder} autoFocus />
                <p className={layout.sectionDesc}>{modalCopy.sourceNameHint}</p>
              </div>
              <div className={`${layout.field} ${layout.fieldFull}`}>
                <label className={`${layout.label} ${layout.labelRequired}`} htmlFor="feed-url">
                  {modalCopy.urlLabel}
                </label>
                <input id="feed-url" type="url" className={layout.input} value={draft.url || ""} onChange={e => patchDraft({
                url: e.target.value
              })} placeholder={modalCopy.urlPlaceholder} />
                <p className={layout.sectionDesc}>{modalCopy.urlHint}</p>
              </div>
            </div>
          </>;
      case "display":
        return <>
            <div className={layout.sectionHead}>
              <h3 className={layout.sectionTitle}>{modalCopy.displayTitle}</h3>
              <p className={layout.sectionDesc}>{modalCopy.displayDesc}</p>
            </div>
            <div className={layout.fieldGrid2}>
              <div className={layout.field}>
                <label className={`${layout.label} ${layout.labelRequired}`} htmlFor="feed-locale">
                  {modalCopy.localeLabel}
                </label>
                <select id="feed-locale" className={layout.input} value={draft.locale || DEFAULT_TECH_NEWS_FEED_LOCALE} onChange={e => patchDraft({
                locale: e.target.value
              })}>
                  {locales.map(loc => <option key={loc.code} value={loc.code}>
                      {loc.flag ? `${loc.flag} ${loc.label}` : loc.label}
                    </option>)}
                </select>
                <p className={layout.sectionDesc}>{modalCopy.localeHint}</p>
              </div>
              <div className={layout.field}>
                <label className={layout.label} htmlFor="feed-category">
                  {adminCopy.category}
                </label>
                <select id="feed-category" className={layout.input} value={draft.category || "news"} onChange={e => patchDraft({
                category: e.target.value
              })}>
                  {categories.map(cat => <option key={cat} value={cat}>
                      {categoryLabel(cat)}
                    </option>)}
                </select>
              </div>
              <div className={layout.field}>
                <label className={layout.label} htmlFor="feed-sort-order">
                  {modalCopy.sortOrderLabel}
                </label>
                <input id="feed-sort-order" type="number" className={layout.input} value={draft.sortOrder ?? ""} onChange={e => patchDraft({
                sortOrder: e.target.value
              })} placeholder={adminCopy.auto} />
                <p className={layout.sectionDesc}>{modalCopy.sortOrderHint}</p>
              </div>
            </div>
            <div className={formStyles.statusRow}>
              <div>
                <div className={formStyles.statusLabel}>{modalCopy.feedActiveLabel}</div>
                <p className={formStyles.statusHint}>{modalCopy.feedActiveHint}</p>
              </div>
              <Switch checked={Boolean(draft.enabled)} onChange={on => patchDraft({
              enabled: on
            })} label={draft.enabled ? adminCopy.active : adminCopy.disabledShort} />
            </div>
          </>;
      default:
        return null;
    }
  };
  const canSave = Boolean(String(draft.source || "").trim() && String(draft.url || "").trim());
  return createPortal(<div className={layout.overlay} onClick={onClose} role="presentation">
      <div className={layout.shell} style={{
      maxWidth: "min(720px, 100%)"
    }} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="tech-news-feed-form-title">
        <div className={layout.accentBar} aria-hidden />
        <header className={layout.header}>
          <div className={layout.headerMain}>
            <div className={layout.headerIconWrap} aria-hidden>
              <Icon icon={isCreate ? "mdi:rss" : "mdi:rss-box"} />
            </div>
            <div className={layout.headerText}>
              <p className={layout.eyebrow}>{modalCopy.eyebrow}</p>
              <h2 className={layout.title} id="tech-news-feed-form-title">
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
            {draft.source?.trim() || modalCopy.noSource} · {(locales.find(loc => loc.code === (draft.locale || DEFAULT_TECH_NEWS_FEED_LOCALE)) || {}).label || draft.locale || DEFAULT_TECH_NEWS_FEED_LOCALE} · {categoryLabel(draft.category || "news")} ·{" "}
            {draft.enabled ? adminCopy.active : adminCopy.inactive}
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
