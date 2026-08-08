import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";
import { FaTimes } from "react-icons/fa";
import { useCommonCopy } from "../../hooks/useCommonCopy";
import { useAdminCommonCopy, useAdminModalCopy } from "../../hooks/useAdminCopy";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { getAgentFormSections } from "./adminFormModalsI18n";
import { getAdminUsersCopy, getMfaStatus } from "./adminUsersI18n";
import { getAdminPermissionsCopy, getLocalizedProfileName } from "./adminPermissionsI18n";
import layout from "../EnterprisesPage/EnterpriseFormModal.module.css";
import mfaStyles from "./AdminUsers.module.css";
function MfaStatusBadge({
  user,
  locale
}) {
  const status = getMfaStatus(user, locale);
  const mfaLabels = getAdminUsersCopy(locale).mfa;
  return <span className={`${mfaStyles.status} ${mfaStyles[status.className]}`} title={`${mfaLabels.titlePrefix} ${status.label}`}>
      <Icon icon={status.icon} className={mfaStyles.mfaIcon} />
      {status.label}
    </span>;
}
export default function AgentFormModal({
  open,
  mode = "create",
  draft,
  setDraft,
  saving = false,
  profiles = [],
  stacked = false,
  onClose,
  onSave,
  onDelete,
  deleteDisabled = false,
  deleteDescription = "",
  onReleaseMfa,
  canReleaseMfa = false
}) {
  const locale = useAppLocale();
  const commonCopy = useCommonCopy();
  const adminCopy = useAdminCommonCopy();
  const modalCopy = useAdminModalCopy("agentForm");
  const permissionsCopy = useMemo(() => getAdminPermissionsCopy(locale), [locale]);
  const isEdit = mode === "edit";
  const sections = useMemo(() => getAgentFormSections(locale, isEdit), [locale, isEdit]);
  const [activeSection, setActiveSection] = useState("identity");
  useEffect(() => {
    if (!open) return;
    setActiveSection("identity");
  }, [open]);
  const sectionMeta = useMemo(() => {
    const password = String(draft?.password || "");
    const password2 = String(draft?.password2 || "");
    const securityValid = isEdit ? !password && !password2 || password.length >= 6 && password === password2 : password.length >= 6 && password === password2;
    return {
      identity: Boolean(String(draft?.email || "").trim().includes("@")),
      security: securityValid,
      access: Boolean(String(draft?.profile || "").trim()),
      mfa: isEdit
    };
  }, [draft, isEdit]);
  if (!open || !draft) return null;
  const patchDraft = patch => setDraft(prev => ({
    ...prev,
    ...patch
  }));
  const renderSectionContent = () => {
    switch (activeSection) {
      case "identity":
        return <>
            <div className={layout.sectionHead}>
              <h3 className={layout.sectionTitle}>{modalCopy.identityTitle}</h3>
              <p className={layout.sectionDesc}>
                {isEdit ? modalCopy.identityDescEdit : modalCopy.identityDescCreate}
              </p>
            </div>
            <div className={layout.fieldGrid2}>
              <div className={`${layout.field} ${layout.fieldFull}`}>
                <label className={`${layout.label} ${layout.labelRequired}`} htmlFor="agent-email">
                  {modalCopy.emailLabel}
                </label>
                <input id="agent-email" type="email" className={layout.input} value={draft.email || ""} onChange={e => patchDraft({
                email: e.target.value
              })} placeholder={modalCopy.emailPlaceholder} autoFocus />
              </div>
              <div className={`${layout.field} ${layout.fieldFull}`}>
                <label className={layout.label} htmlFor="agent-username">
                  {modalCopy.usernameLabel}
                </label>
                <input id="agent-username" type="text" className={layout.input} value={draft.username || ""} onChange={e => patchDraft({
                username: e.target.value
              })} placeholder={modalCopy.usernamePlaceholder} />
              </div>
            </div>
            {isEdit && <label className={layout.slaToggle} style={{
            marginTop: "1rem"
          }}>
                <span className={layout.slaToggleLabel}>{modalCopy.accountActiveLabel}</span>
                <span className={layout.switchWrap}>
                  <input type="checkbox" className={layout.switchInput} checked={draft.is_active !== false} onChange={e => patchDraft({
                is_active: e.target.checked
              })} role="switch" aria-checked={draft.is_active !== false} />
                  <span className={layout.switchTrack} aria-hidden="true">
                    <span className={layout.switchThumb} />
                  </span>
                </span>
              </label>}
          </>;
      case "security":
        return <>
            <div className={layout.sectionHead}>
              <h3 className={layout.sectionTitle}>{modalCopy.securityTitle}</h3>
              <p className={layout.sectionDesc}>
                {isEdit ? modalCopy.securityDescEdit : modalCopy.securityDescCreate}
              </p>
            </div>
            <div className={layout.fieldGrid2}>
              <div className={layout.field}>
                <label className={`${layout.label} ${isEdit ? "" : layout.labelRequired}`} htmlFor="agent-password">
                  {modalCopy.passwordLabel}
                </label>
                <input id="agent-password" type="password" className={layout.input} value={draft.password || ""} onChange={e => patchDraft({
                password: e.target.value
              })} placeholder={isEdit ? modalCopy.passwordPlaceholderEdit : modalCopy.passwordPlaceholderCreate} />
              </div>
              <div className={layout.field}>
                <label className={`${layout.label} ${isEdit ? "" : layout.labelRequired}`} htmlFor="agent-password2">
                  {modalCopy.passwordConfirmLabel}
                </label>
                <input id="agent-password2" type="password" className={layout.input} value={draft.password2 || ""} onChange={e => patchDraft({
                password2: e.target.value
              })} placeholder={modalCopy.passwordConfirmPlaceholder} />
              </div>
            </div>
          </>;
      case "access":
        return <>
            <div className={layout.sectionHead}>
              <h3 className={layout.sectionTitle}>{modalCopy.accessTitle}</h3>
              <p className={layout.sectionDesc}>{modalCopy.accessDesc}</p>
            </div>
            <div className={layout.fieldGrid2}>
              <div className={`${layout.field} ${layout.fieldFull}`}>
                <label className={layout.label} htmlFor="agent-profile">
                  {modalCopy.profileLabel}
                </label>
                <select id="agent-profile" className={layout.input} value={draft.profile || ""} onChange={e => patchDraft({
                profile: e.target.value
              })}>
                  {profiles.map(p => <option key={p.name} value={p.name}>
                      {getLocalizedProfileName(p.name, permissionsCopy)}
                    </option>)}
                </select>
              </div>
            </div>
          </>;
      case "mfa":
        return <>
            <div className={layout.sectionHead}>
              <h3 className={layout.sectionTitle}>{modalCopy.mfaTitle}</h3>
              <p className={layout.sectionDesc}>{modalCopy.mfaDesc}</p>
            </div>
            <div className={mfaStyles.mfaPanel}>
              <MfaStatusBadge user={draft} locale={locale} />
              <p className={mfaStyles.mfaHint}>
                {draft.mfa_enabled ? modalCopy.mfaHintEnabled : draft.mfa_pending_setup ? modalCopy.mfaHintPending : modalCopy.mfaHintOff}
              </p>
              {canReleaseMfa && <button type="button" className={mfaStyles.mfaReleaseBtn} onClick={onReleaseMfa}>
                  <Icon icon="mdi:shield-off-outline" />
                  {modalCopy.releaseMfaBtn}
                </button>}
            </div>
          </>;
      default:
        return null;
    }
  };
  const footerParts = [draft.email?.trim() || modalCopy.footerNoEmail, draft.profile || modalCopy.footerNoProfile];
  if (isEdit && draft.is_active === false) {
    footerParts.push(modalCopy.footerInactive);
  }
  return createPortal(<div className={`${layout.overlay} ${stacked ? layout.overlayStacked : ""}`} onClick={onClose} role="presentation">
      <div className={layout.shell} style={{
      maxWidth: "min(760px, 100%)"
    }} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="agent-form-title">
        <div className={layout.accentBar} aria-hidden />
        <header className={layout.header}>
          <div className={layout.headerMain}>
            <div className={layout.headerIconWrap} aria-hidden>
              <Icon icon={isEdit ? "mdi:account-edit-outline" : "mdi:account-plus-outline"} />
            </div>
            <div className={layout.headerText}>
              <p className={layout.eyebrow}>{modalCopy.eyebrow}</p>
              <h2 className={layout.title} id="agent-form-title">
                {isEdit ? modalCopy.editTitle : modalCopy.createTitle}
              </h2>
              <p className={layout.subtitle}>
                {isEdit ? modalCopy.editSubtitle : modalCopy.createSubtitle}
              </p>
            </div>
          </div>
          <button type="button" className={layout.closeBtn} onClick={onClose} disabled={saving} aria-label={commonCopy.close}>
            <FaTimes />
          </button>
        </header>

        <div className={layout.body}>
          <nav className={layout.nav} aria-label={modalCopy.sectionsAria}>
            {sections.map(section => <button key={section.id} type="button" className={`${layout.navItem} ${activeSection === section.id ? layout.navItemActive : ""}`} onClick={() => setActiveSection(section.id)} aria-current={activeSection === section.id ? "step" : undefined}>
                <Icon icon={section.icon} className={layout.navItemIcon} aria-hidden />
                <span className={layout.navItemText}>
                  <span className={layout.navItemLabel}>{section.label}</span>
                  <span className={layout.navItemHint}>{section.description}</span>
                </span>
                {sectionMeta[section.id] && <span className={layout.navBadge}>✓</span>}
              </button>)}
          </nav>

          <div className={layout.content}>
            {renderSectionContent()}
          </div>
        </div>

        <footer className={layout.footer}>
          <span className={layout.footerHint}>{footerParts.join(" · ")}</span>
          <div className={layout.footerActions}>
            {isEdit && onDelete && <button type="button" className={layout.dangerBtn} onClick={onDelete} disabled={deleteDisabled || saving} title={deleteDisabled && deleteDescription ? deleteDescription : modalCopy.deleteTitle}>
                <Icon icon="mdi:trash-can-outline" aria-hidden />
                {adminCopy.delete}
              </button>}
            <button type="button" className={layout.ghostBtn} onClick={onClose} disabled={saving}>
              {commonCopy.cancel}
            </button>
            <button type="button" className={layout.primaryBtn} onClick={onSave} disabled={saving}>
              {saving ? <>
                  <Icon icon="mdi:loading" className={layout.spinning} aria-hidden />
                  {isEdit ? modalCopy.saving : modalCopy.creating}
                </> : <>
                  <Icon icon="mdi:check" aria-hidden />
                  {isEdit ? commonCopy.save : modalCopy.createBtn}
                </>}
            </button>
          </div>
        </footer>
      </div>
    </div>, document.getElementById("modal-root") || document.body);
}
