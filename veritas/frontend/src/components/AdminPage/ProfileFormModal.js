import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";
import { useCommonCopy } from "../../hooks/useCommonCopy";
import { useAdminCommonCopy, useAdminModalCopy } from "../../hooks/useAdminCopy";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { getAdminPermissionsCopy, getLocalizedProfileName } from "./adminPermissionsI18n";
import { getProfileFormSections } from "./adminFormModalsI18n";
import { UiKitButton, uiKitLayoutsStyles as kit, useFinderNavIndicator } from "../UiKit";
import layout from "../EnterprisesPage/EnterpriseFormModal.module.css";
import formStyles from "./IngestionRuleFormModal.module.css";
export default function ProfileFormModal({
  open,
  draft,
  setDraft,
  saving = false,
  profiles = [],
  onClose,
  onSave
}) {
  const locale = useAppLocale();
  const commonCopy = useCommonCopy();
  const adminCopy = useAdminCommonCopy();
  const modalCopy = useAdminModalCopy("profileForm");
  const permissionsCopy = useMemo(() => getAdminPermissionsCopy(locale), [locale]);
  const formSections = useMemo(() => getProfileFormSections(locale), [locale]);
  const [activeSection, setActiveSection] = useState("general");
  const { trackRef: navTrackRef, indicator: navIndicator } = useFinderNavIndicator([activeSection, open]);
  useEffect(() => {
    if (!open) return;
    setActiveSection("general");
  }, [open]);
  const sectionMeta = useMemo(() => ({
    general: Boolean(String(draft?.name || "").trim()),
    inheritance: true
  }), [draft]);
  if (!open || !draft) return null;
  const patchDraft = patch => setDraft(prev => ({
    ...prev,
    ...patch
  }));
  const parentDisplayName = draft.parentProfile ? getLocalizedProfileName(draft.parentProfile, permissionsCopy) || draft.parentProfile : adminCopy.standalone;
  const renderSectionContent = () => {
    switch (activeSection) {
      case "general":
        return <>
            <div className={layout.sectionHead}>
              <h3 className={layout.sectionTitle}>{modalCopy.generalTitle}</h3>
            </div>
            <div className={layout.fieldGrid2}>
              <div className={layout.field}>
                <label className={`${layout.label} ${layout.labelRequired}`} htmlFor="profile-name">
                  {modalCopy.nameLabel}
                </label>
                <input id="profile-name" type="text" className={layout.input} value={draft.name || ""} onChange={e => patchDraft({
                name: e.target.value
              })} placeholder={modalCopy.namePlaceholder} autoFocus />
              </div>
              <div className={layout.field}>
                <label className={layout.label} htmlFor="profile-label">
                  {modalCopy.labelField}
                </label>
                <input id="profile-label" type="text" className={layout.input} value={draft.label || ""} onChange={e => patchDraft({
                label: e.target.value
              })} placeholder={modalCopy.labelPlaceholder} />
              </div>
            </div>
          </>;
      case "inheritance":
        return <>
            <div className={layout.sectionHead}>
              <h3 className={layout.sectionTitle}>{modalCopy.inheritanceTitle}</h3>
            </div>
            <div className={layout.fieldGrid2}>
              <div className={`${layout.field} ${layout.fieldFull}`}>
                <label className={layout.label} htmlFor="profile-parent">
                  {modalCopy.parentLabel}
                </label>
                <select id="profile-parent" className={layout.input} value={draft.parentProfile || ""} onChange={e => patchDraft({
                parentProfile: e.target.value
              })}>
                  <option value="">{modalCopy.noParent}</option>
                  {profiles.map(p => <option key={p.name} value={p.name}>
                      {getLocalizedProfileName(p.name, permissionsCopy) || p.name}
                    </option>)}
                </select>
              </div>
            </div>
            <div className={formStyles.statusRow} style={{
            marginTop: "0.75rem"
          }}>
              <div>
                <div className={formStyles.statusLabel}>{modalCopy.defaultRightsLabel}</div>
                <p className={formStyles.statusHint}>{modalCopy.defaultRightsHint}</p>
              </div>
              <Icon icon="mdi:shield-account-outline" style={{
              fontSize: "1.4rem",
              color: "var(--msp-muted)"
            }} aria-hidden />
            </div>
          </>;
      default:
        return null;
    }
  };
  return createPortal(<div className={layout.overlay} onClick={onClose} role="presentation">
      <div className={layout.shell} style={{
      maxWidth: "min(720px, 100%)"
    }} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="profile-form-title">
        <div className={layout.accentBar} aria-hidden />
        <header className={layout.header}>
          <div className={layout.headerMain}>
            <div className={layout.headerIconWrap} aria-hidden>
              <Icon icon="mdi:account-cog-outline" />
            </div>
            <div className={layout.headerText}>
              <p className={layout.eyebrow}>{modalCopy.eyebrow}</p>
              <h2 className={layout.title} id="profile-form-title">
                {modalCopy.title}
              </h2>
              <p className={layout.subtitle}>{modalCopy.subtitle}</p>
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
            {draft.name?.trim() || adminCopy.noIdentifier} · {parentDisplayName}
          </span>
          <div className={layout.footerActions}>
            <UiKitButton type="button" variant="secondary" onClick={onClose} disabled={saving}>
              {commonCopy.cancel}
            </UiKitButton>
            <UiKitButton
              type="button"
              variant="primary"
              onClick={onSave}
              disabled={saving || !String(draft.name || "").trim()}
              icon={saving ? undefined : "mdi:check"}
            >
              {saving ? (
                <>
                  <Icon icon="mdi:loading" className={layout.spinning} aria-hidden />
                  {adminCopy.creating}
                </>
              ) : (
                modalCopy.createBtn
              )}
            </UiKitButton>
          </div>
        </footer>
      </div>
    </div>, document.getElementById("modal-root") || document.body);
}
