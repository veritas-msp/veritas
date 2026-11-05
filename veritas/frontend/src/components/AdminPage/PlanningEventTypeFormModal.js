import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";
import { Switch } from "./AdminUi";
import { useCommonCopy } from "../../hooks/useCommonCopy";
import { useAdminCommonCopy } from "../../hooks/useAdminCopy";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { interpolate } from "../../i18n/translate";
import IconPicker from "./IconPicker";
import { PLANNING_EVENT_TYPE_ICON_CHOICES, PLANNING_KPI_TONE_OPTIONS } from "./planningEventTypeConstants";
import { getPlanningEventTypeFormCopy } from "./adminPlanningI18n";
import { UiKitButton, uiKitLayoutsStyles as kit, useFinderNavIndicator } from "../UiKit";
import layout from "../EnterprisesPage/EnterpriseFormModal.module.css";
import formStyles from "./IngestionRuleFormModal.module.css";
import styles from "./ContractModuleOptionFormModal.module.css";

export default function PlanningEventTypeFormModal({
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
  const modalCopy = useMemo(() => getPlanningEventTypeFormCopy(locale), [locale]);
  const isCreate = mode === "create";
  const [activeSection, setActiveSection] = useState("identity");
  const { trackRef: navTrackRef, indicator: navIndicator } = useFinderNavIndicator([activeSection, open]);

  useEffect(() => {
    if (!open) return;
    setActiveSection("identity");
  }, [open]);

  const formSections = useMemo(() => [{
    id: "identity",
    label: modalCopy.identityNav,
    description: modalCopy.identityNavDesc,
    icon: "mdi:tag-outline"
  }, {
    id: "presentation",
    label: modalCopy.presentationNav,
    description: modalCopy.presentationNavDesc,
    icon: "mdi:palette-outline"
  }], [modalCopy]);

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
            <div className={layout.fieldStack}>
              {isCreate ? <div className={layout.field}>
                  <label className={layout.label} htmlFor="planning-type-key">
                    {modalCopy.typeKeyLabel}
                  </label>
                  <input id="planning-type-key" type="text" className={layout.input} value={draft.typeKey || ""} onChange={e => patchDraft({
                typeKey: e.target.value
              })} placeholder={modalCopy.typeKeyPlaceholder} autoFocus />
                  <p className={formStyles.fieldHint}>{modalCopy.typeKeyHintCreate}</p>
                </div> : <div className={layout.field}>
                  <label className={layout.label} htmlFor="planning-type-key">
                    {modalCopy.typeKeyLabel}
                  </label>
                  <input id="planning-type-key" type="text" className={layout.input} value={draft.typeKey || ""} disabled />
                  <p className={formStyles.fieldHint}>{modalCopy.typeKeyHintEdit}</p>
                </div>}
              <div className={layout.field}>
                <label className={`${layout.label} ${layout.labelRequired}`} htmlFor="planning-type-label">
                  {modalCopy.displayLabel}
                </label>
                <input id="planning-type-label" type="text" className={layout.input} value={draft.label || ""} onChange={e => patchDraft({
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
              <div className={layout.field}>
                <span className={layout.label}>{adminCopy.icon}</span>
                <div className={styles.iconPickerWrap}>
                  <IconPicker value={draft.icon || "mdi:calendar-blank"} onChange={icon => patchDraft({
                  icon
                })} choices={PLANNING_EVENT_TYPE_ICON_CHOICES} />
                </div>
              </div>
              <div className={layout.fieldGrid2}>
                <div className={layout.field}>
                  <span className={layout.label} id="planning-type-tone-label">
                    {modalCopy.kpiToneLabel}
                  </span>
                  <div className={styles.toneSwatches} role="listbox" aria-labelledby="planning-type-tone-label">
                    {PLANNING_KPI_TONE_OPTIONS.map(opt => {
                  const selected = (draft.kpiTone || "blue") === opt.value;
                  const toneLabel = modalCopy.kpiTones?.[opt.value] || opt.label;
                  return <button key={opt.value} type="button" role="option" aria-selected={selected} title={toneLabel} aria-label={toneLabel} className={`${styles.toneSwatch} ${selected ? styles.toneSwatchSelected : ""}`} style={{
                    background: opt.color
                  }} onClick={() => patchDraft({
                    kpiTone: opt.value
                  })} />;
                })}
                  </div>
                </div>
                <div className={layout.field}>
                  <label className={layout.label} htmlFor="planning-type-sort">
                    {adminCopy.order}
                  </label>
                  <input id="planning-type-sort" type="number" className={layout.input} value={draft.sortOrder ?? ""} onChange={e => patchDraft({
                  sortOrder: e.target.value
                })} placeholder={adminCopy.auto} />
                </div>
              </div>
              <div className={`${formStyles.statusRow} ${styles.statusCard}`}>
                <div>
                  <div className={formStyles.statusLabel}>{modalCopy.activeLabel}</div>
                  <p className={formStyles.statusHint}>{modalCopy.activeHint}</p>
                </div>
                <Switch checked={Boolean(draft.enabled)} onChange={on => patchDraft({
                enabled: on
              })} label={draft.enabled ? adminCopy.visible : adminCopy.hidden} />
              </div>
              <div className={`${formStyles.statusRow} ${styles.statusCard}`}>
                <div>
                  <div className={formStyles.statusLabel}>{modalCopy.formSelectableLabel}</div>
                  <p className={formStyles.statusHint}>{modalCopy.formSelectableHint}</p>
                </div>
                <Switch checked={Boolean(draft.formSelectable)} onChange={on => patchDraft({
                formSelectable: on
              })} label={draft.formSelectable ? adminCopy.visible : adminCopy.hidden} />
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
    }} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="planning-event-type-modal-title">
        <div className={layout.accentBar} aria-hidden />
        <header className={layout.header}>
          <div className={layout.headerMain}>
            <div className={`${layout.headerIconWrap} ${styles.headerIconCircle}`} aria-hidden>
              <Icon icon="mdi:calendar-clock" />
            </div>
            <div className={layout.headerText}>
              <p className={layout.eyebrow}>{modalCopy.eyebrow}</p>
              <h2 className={layout.title} id="planning-event-type-modal-title">
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
            aria-label={commonCopy.close}
            icon="mdi:close"
          />
        </header>

        <div className={layout.body}>
          <aside className={`${kit.finderSidebar} ${layout.modalNav}`} aria-label={modalCopy.sectionsAria}>
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
              {formSections.map(section => {
                const active = activeSection === section.id;
                return (
                  <button
                    key={section.id}
                    type="button"
                    className={`${kit.finderItem} ${kit.finderItemRich} ${active ? kit.finderItemActive : ""}`}
                    onClick={() => setActiveSection(section.id)}
                    aria-current={active ? "page" : undefined}
                  >
                    <span className={`${styles.navIconCircle}${active ? ` ${styles.navIconCircleActive}` : ""}`} aria-hidden>
                      <Icon icon={section.icon} />
                    </span>
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
          <span className={layout.footerHint}>{modalCopy.requiredHint}</span>
          <div className={layout.footerActions}>
            <UiKitButton type="button" variant="secondary" onClick={onClose} disabled={saving}>
              {commonCopy.cancel}
            </UiKitButton>
            <UiKitButton
              type="button"
              variant="primary"
              onClick={onSave}
              disabled={saving || !canSave}
              icon={saving ? undefined : (isCreate ? "mdi:plus" : "mdi:content-save-outline")}
            >
              {saving ? (
                <>
                  <Icon icon="mdi:loading" className={layout.spinning} aria-hidden />
                  {commonCopy.saving}
                </>
              ) : isCreate ? (
                modalCopy.createAction
              ) : (
                modalCopy.saveAction
              )}
            </UiKitButton>
          </div>
        </footer>
      </div>
    </div>, document.getElementById("modal-root") || document.body);
}
