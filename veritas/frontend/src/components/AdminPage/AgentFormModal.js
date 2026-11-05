import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";
import { useCommonCopy } from "../../hooks/useCommonCopy";
import { useAdminCommonCopy, useAdminModalCopy } from "../../hooks/useAdminCopy";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { getAgentFormSections } from "./adminFormModalsI18n";
import { getAdminUsersCopy, getMfaStatus } from "./adminUsersI18n";
import { getAdminPermissionsCopy, getLocalizedProfileName } from "./adminPermissionsI18n";
import MultiSuggestPicker from "./MultiSuggestPicker";
import { UiKitButton, uiKitLayoutsStyles as kit, useFinderNavIndicator } from "../UiKit";
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
  const { trackRef: navTrackRef, indicator: navIndicator } = useFinderNavIndicator([activeSection, open]);
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
      access: Boolean(
        (Array.isArray(draft?.profiles) && draft.profiles.some(p => String(p || "").trim())) ||
          String(draft?.profile || "").trim()
      ),
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
          </>;
      case "security":
        return <>
            <div className={layout.sectionHead}>
              <h3 className={layout.sectionTitle}>{modalCopy.securityTitle}</h3>
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
      case "access": {
        const selectedProfiles = Array.isArray(draft.profiles)
          ? draft.profiles.map(p => String(p || "").trim()).filter(Boolean)
          : draft.profile
            ? [String(draft.profile)]
            : [];
        const profileOptions = profiles.map(p => ({
          id: p.name,
          label: getLocalizedProfileName(p.name, permissionsCopy)
        }));
        const setProfiles = nextIds => {
          const next = [...new Set((nextIds || []).map(String).filter(Boolean))];
          const active = next.includes(String(draft.profile || "")) ? draft.profile : next[0] || "";
          patchDraft({
            profiles: next,
            profile: active
          });
        };
        return <>
            <div className={layout.sectionHead}>
              <h3 className={layout.sectionTitle}>{modalCopy.accessTitle}</h3>
            </div>
            <div className={layout.fieldGrid2}>
              <div className={`${layout.field} ${layout.fieldFull}`}>
                <MultiSuggestPicker
                  label={modalCopy.profilesLabel || modalCopy.profileLabel}
                  placeholder={modalCopy.profilesPlaceholder || "…"}
                  options={profileOptions}
                  selectedIds={selectedProfiles}
                  onChange={setProfiles}
                  emptyHint={modalCopy.profilesEmpty || ""}
                  emptyResultsHint={modalCopy.profilesNoResults || ""}
                  inputId="agent-profiles"
                />
              </div>
              <div className={`${layout.field} ${layout.fieldFull}`}>
                <label className={layout.label} htmlFor="agent-active-profile">
                  {modalCopy.activeProfileLabel || modalCopy.profileLabel}
                </label>
                <select
                  id="agent-active-profile"
                  className={layout.input}
                  value={selectedProfiles.includes(draft.profile) ? draft.profile || "" : selectedProfiles[0] || ""}
                  onChange={e => patchDraft({
                    profile: e.target.value
                  })}
                  disabled={!selectedProfiles.length}
                >
                  {selectedProfiles.map(name => {
                    const opt = profiles.find(p => p.name === name);
                    return <option key={name} value={name}>
                        {getLocalizedProfileName(opt?.name || name, permissionsCopy)}
                      </option>;
                  })}
                </select>
                {modalCopy.activeProfileHint ? (
                  <p style={{ margin: "0.4rem 0 0", fontSize: "0.8rem", color: "var(--msp-muted, #5c6b82)" }}>
                    {modalCopy.activeProfileHint}
                  </p>
                ) : null}
              </div>
            </div>
          </>;
      }      case "mfa":
        return <>
            <div className={layout.sectionHead}>
              <h3 className={layout.sectionTitle}>{modalCopy.mfaTitle}</h3>
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
  const footerProfile =
    Array.isArray(draft.profiles) && draft.profiles.length > 1
      ? `${draft.profile || draft.profiles[0]} (+${draft.profiles.length - 1})`
      : draft.profile || draft.profiles?.[0] || modalCopy.footerNoProfile;
  const footerParts = [draft.email?.trim() || modalCopy.footerNoEmail, footerProfile];
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
          <div className={layout.headerTrailing}>
            {isEdit ? (
              <label className={layout.headerStatusToggle}>
                <span className={layout.headerStatusLabel}>
                  {draft.is_active !== false
                    ? (adminCopy.activeShort || modalCopy.accountActiveLabel || "Actif")
                    : (adminCopy.inactiveShort || "Inactif")}
                </span>
                <span className={layout.switchWrap}>
                  <input
                    type="checkbox"
                    className={layout.switchInput}
                    checked={draft.is_active !== false}
                    onChange={e => patchDraft({ is_active: e.target.checked })}
                    role="switch"
                    aria-checked={draft.is_active !== false}
                    disabled={saving}
                  />
                  <span className={layout.switchTrack} aria-hidden="true">
                    <span className={layout.switchThumb} />
                  </span>
                </span>
              </label>
            ) : null}
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
          </div>
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
              {sections.map(section => {
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
          <span className={layout.footerHint}>{footerParts.join(" · ")}</span>
          <div className={layout.footerActions}>
            {isEdit && onDelete ? (
              <UiKitButton
                type="button"
                variant="danger"
                onClick={onDelete}
                disabled={deleteDisabled || saving}
                title={deleteDisabled && deleteDescription ? deleteDescription : modalCopy.deleteTitle}
                icon="mdi:trash-can-outline"
              >
                {adminCopy.delete}
              </UiKitButton>
            ) : null}
            <UiKitButton type="button" variant="secondary" onClick={onClose} disabled={saving}>
              {commonCopy.cancel}
            </UiKitButton>
            <UiKitButton
              type="button"
              variant="primary"
              onClick={onSave}
              disabled={saving}
              icon={saving ? undefined : "mdi:check"}
            >
              {saving ? (
                <>
                  <Icon icon="mdi:loading" className={layout.spinning} aria-hidden />
                  {isEdit ? modalCopy.saving : modalCopy.creating}
                </>
              ) : isEdit ? (
                commonCopy.save
              ) : (
                modalCopy.createBtn
              )}
            </UiKitButton>
          </div>
        </footer>
      </div>
    </div>, document.getElementById("modal-root") || document.body);
}
