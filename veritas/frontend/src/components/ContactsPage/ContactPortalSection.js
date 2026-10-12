import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@iconify/react";
import { toast } from "react-toastify";
import { createContactPortal, resendContactPortalInvite, setContactPortalActive, setContactPortalRole, setContactPortalEmail, resetContactPortalPassword, deleteContactPortal, impersonateContactPortal, stopPortalImpersonation, getPortalStatusFromContact, fetchClientPortalUsage } from "../../api/contactPortal";
import { useAppFormatters, useAppLocale } from "../../hooks/useAppGeneralSettings";
import { useVeritasEdition } from "../../hooks/useVeritasEdition";
import { getCommunityClientPortalLimit } from "../../config/edition";
import { normalizeContactCommunications } from "../../utils/contactCommunications";
import { getContactDetailCopy, interpolate } from "./contactDetailI18n";
import ProFeatureBadge from "../Misc/ProFeature/ProFeatureBadge";
import ContactPortalPasswordModal from "./ContactPortalPasswordModal";
import ContactPortalRevokeModal from "./ContactPortalRevokeModal";
import PortalImpersonationOverlay from "./PortalImpersonationOverlay";
import s from "./ContactPortalSection.module.css";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function listContactEmails(contact) {
  const seen = new Set();
  const out = [];
  const push = value => {
    const email = String(value || "").trim();
    if (!email || !EMAIL_RE.test(email)) return;
    const key = email.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    out.push(email);
  };
  normalizeContactCommunications(contact || {})
    .filter(entry => entry.type === "email")
    .forEach(entry => push(entry.value));
  push(contact?.email);
  push(contact?.portal_email);
  return out;
}

function normalizePortalRole(value) {
  return String(value || "").toLowerCase() === "supervisor" ? "supervisor" : "user";
}

function PortalEmailPicker({
  value,
  options,
  primaryEmail,
  onChange,
  disabled,
  copy,
  readOnly = false
}) {
  if (!options.length) return null;
  const showSelect = options.length > 1 && !readOnly;
  return (
    <div className={s.emailPicker}>
      <div className={s.emailPickerText}>
        <span className={s.emailPickerTitle}>{copy.loginEmailLabel}</span>
        {showSelect ? (
          <span className={s.emailPickerHint}>{copy.loginEmailHint}</span>
        ) : null}
      </div>
      {showSelect ? (
        <select
          className={s.emailSelect}
          value={value || options[0]}
          disabled={disabled}
          aria-label={copy.loginEmailAria || copy.loginEmailLabel}
          onChange={e => onChange(e.target.value)}
        >
          {options.map(email => {
            const isPrimary = primaryEmail && email.toLowerCase() === primaryEmail.toLowerCase();
            return (
              <option key={email} value={email}>
                {isPrimary ? `${email} (${copy.loginEmailPrimary || "Principale"})` : email}
              </option>
            );
          })}
        </select>
      ) : (
        <span className={s.emailPickerValue}>{value || options[0]}</span>
      )}
    </div>
  );
}
function PortalRolePicker({
  value,
  onChange,
  disabled,
  copy,
  compact = false,
  stacked = false
}) {
  const role = normalizePortalRole(value);
  return <div className={`${s.roleRow} ${stacked ? s.roleRowStacked : ""} ${compact ? s.roleRowCompact : ""}`.trim()}>
      <div className={s.roleText}>
        <span className={s.roleTitle}>{copy.roleTitle}</span>
        <span className={s.roleHint}>
          {role === "supervisor" ? copy.roleSupervisorHint : copy.roleUserHint}
        </span>
      </div>
      <div className={s.roleSeg} role="radiogroup" aria-label={copy.roleAria}>
        <button type="button" role="radio" aria-checked={role === "user"} className={`${s.roleBtn} ${role === "user" ? s.roleBtnActive : ""}`.trim()} disabled={disabled} onClick={() => onChange("user")} title={copy.roleUserHint}>
          {copy.roleUser}
        </button>
        <button type="button" role="radio" aria-checked={role === "supervisor"} className={`${s.roleBtn} ${role === "supervisor" ? s.roleBtnActive : ""}`.trim()} disabled={disabled} onClick={() => onChange("supervisor")} title={copy.roleSupervisorHint}>
          {copy.roleSupervisor}
        </button>
      </div>
    </div>;
}
export default function ContactPortalSection({
  contact,
  onUpdated,
  canManage = true
}) {
  const locale = useAppLocale();
  const {
    formatDateTime
  } = useAppFormatters();
  const portalCopy = useMemo(() => getContactDetailCopy(locale).portal, [locale]);
  const toastCopy = portalCopy.toast;
  const {
    isCommunity,
    limits
  } = useVeritasEdition();
  const maxPortalUsers = isCommunity ? getCommunityClientPortalLimit(limits) : null;
  const [busy, setBusy] = useState(false);
  const [passwordModal, setPasswordModal] = useState(null);
  const [showRevoke, setShowRevoke] = useState(false);
  const [createPortalRole, setCreatePortalRole] = useState("user");
  const [selectedPortalEmail, setSelectedPortalEmail] = useState("");
  const [portalUsage, setPortalUsage] = useState({
    active: 0,
    max: maxPortalUsers
  });
  const [impersonationOverlay, setImpersonationOverlay] = useState(null);
  const impersonationAbortRef = useRef(null);
  const impersonationStartedRef = useRef(false);
  const contactEmails = useMemo(() => listContactEmails(contact), [contact]);
  const primaryEmail = useMemo(() => {
    const fromComms = normalizeContactCommunications(contact || {}).find(
      entry => entry.type === "email" && entry.isPrimary
    );
    return String(fromComms?.value || contact?.email || "").trim();
  }, [contact]);
  const loadPortalUsage = useCallback(async () => {
    if (!isCommunity) return;
    try {
      const data = await fetchClientPortalUsage();
      if (data?.limited) {
        setPortalUsage({
          active: Number(data.active) || 0,
          max: Number(data.max) || maxPortalUsers
        });
      }
    } catch {
      setPortalUsage({
        active: 0,
        max: maxPortalUsers
      });
    }
  }, [isCommunity, maxPortalUsers]);
  useEffect(() => {
    loadPortalUsage();
  }, [loadPortalUsage]);
  useEffect(() => {
    setCreatePortalRole(normalizePortalRole(contact?.portal_role));
  }, [contact?.id, contact?.portal_role]);
  useEffect(() => {
    const preferred =
      String(contact?.portal_email || "").trim() ||
      primaryEmail ||
      contactEmails[0] ||
      "";
    setSelectedPortalEmail(prev => {
      if (prev && contactEmails.some(email => email.toLowerCase() === prev.toLowerCase())) {
        return contactEmails.find(email => email.toLowerCase() === prev.toLowerCase()) || preferred;
      }
      return preferred;
    });
  }, [contact?.id, contact?.portal_email, primaryEmail, contactEmails]);
  if (!contact?.id) return null;
  const activePortalCount = portalUsage.active;
  const portalAtLimit = maxPortalUsers != null && activePortalCount >= maxPortalUsers;
  const warnPortalLimit = () => {
    toast.warn(interpolate(portalCopy.limitWarn, {
      max: String(maxPortalUsers)
    }));
  };
  const status = getPortalStatusFromContact(contact);
  const hasPortal = status !== "none";
  const canCreate = Boolean(contactEmails.length && contact.client_id);
  const contactInactive = String(contact.statut || "").toLowerCase().includes("inact");
  const loginEmail = (contact.portal_email || selectedPortalEmail || primaryEmail || "").trim();
  const lastLogin = contact.portal_last_login ? formatDateTime(contact.portal_last_login) : null;
  const refresh = () => {
    onUpdated?.();
    loadPortalUsage();
  };
  const handleToggle = async next => {
    if (next && portalAtLimit && !contact.portal_active) {
      warnPortalLimit();
      return;
    }
    setBusy(true);
    try {
      await setContactPortalActive(contact.id, next);
      toast.success(next ? toastCopy.enabled : toastCopy.disabled);
      refresh();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };
  const handleCreateAccess = async () => {
    setBusy(true);
    try {
      await createContactPortal(contact.id, createPortalRole, selectedPortalEmail || null);
      toast.success(toastCopy.created);
      refresh();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };
  const handlePortalEmailChange = async nextEmail => {
    const email = String(nextEmail || "").trim();
    if (!email) return;
    setSelectedPortalEmail(email);
    if (!hasPortal) return;
    if (email.toLowerCase() === String(contact.portal_email || "").toLowerCase()) return;
    setBusy(true);
    try {
      await setContactPortalEmail(contact.id, email);
      toast.success(toastCopy.emailUpdated || "E-mail de connexion mis à jour");
      refresh();
    } catch (e) {
      setSelectedPortalEmail(contact.portal_email || primaryEmail || contactEmails[0] || "");
      toast.error(e.message || toastCopy.emailError);
    } finally {
      setBusy(false);
    }
  };
  const handleSendInvite = async () => {
    setBusy(true);
    try {
      await resendContactPortalInvite(contact.id);
      toast.success(toastCopy.inviteSent || toastCopy.created);
      refresh();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };
  const handleRoleChange = async next => {
    const role = normalizePortalRole(next);
    if (role === normalizePortalRole(contact.portal_role)) return;
    setBusy(true);
    try {
      await setContactPortalRole(contact.id, role);
      toast.success(toastCopy.roleUpdated);
      refresh();
    } catch (e) {
      toast.error(e.message || toastCopy.roleError);
    } finally {
      setBusy(false);
    }
  };
  const handleReset = async password => {
    setBusy(true);
    try {
      await resetContactPortalPassword(contact.id, password);
      toast.success(toastCopy.passwordUpdated);
      setPasswordModal(null);
    } catch (e) {
      toast.error(e.message);
      throw e;
    } finally {
      setBusy(false);
    }
  };
  const handleRevoke = async () => {
    setBusy(true);
    try {
      await deleteContactPortal(contact.id);
      toast.success(toastCopy.deleted);
      setShowRevoke(false);
      refresh();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };
  const resetImpersonationState = () => {
    impersonationAbortRef.current = null;
    impersonationStartedRef.current = false;
    setImpersonationOverlay(null);
    setBusy(false);
  };
  const handleCancelImpersonation = async () => {
    impersonationAbortRef.current?.abort();
    if (impersonationStartedRef.current) {
      try {
        await stopPortalImpersonation();
      } catch {}
    }
    resetImpersonationState();
  };
  const handleImpersonate = async () => {
    if (!contact.portal_active || contactInactive || impersonationOverlay) return;
    const label = [contact.prenom, contact.nom].filter(Boolean).join(" ").trim() || loginEmail || portalCopy.contactFallback;
    const controller = new AbortController();
    impersonationAbortRef.current = controller;
    impersonationStartedRef.current = false;
    setImpersonationOverlay({
      label
    });
    setBusy(true);
    try {
      await impersonateContactPortal(contact.id, {
        signal: controller.signal
      });
      if (controller.signal.aborted) {
        try {
          await stopPortalImpersonation();
        } catch {}
        return;
      }
      impersonationStartedRef.current = true;
      try {
        sessionStorage.setItem("veritas_impersonation_return", JSON.stringify({
          contactId: contact.id
        }));
      } catch {}
      window.location.href = "/client";
    } catch (e) {
      if (e?.name === "AbortError") return;
      toast.error(e.message || toastCopy.impersonationError);
      resetImpersonationState();
    }
  };
  const statusBadge = () => {
    if (status === "pending") {
      return <span className={`${s.badge} ${s.badgePending || s.badgeInactive}`}>
          <Icon icon="mdi:email-fast-outline" aria-hidden />
          {portalCopy.statusPending || "Invitation en attente"}
        </span>;
    }
    if (status === "active") {
      return <span className={`${s.badge} ${s.badgeActive}`}>
          <Icon icon="mdi:check-circle" aria-hidden />
          {portalCopy.statusActive}
        </span>;
    }
    if (status === "inactive") {
      return <span className={`${s.badge} ${s.badgeInactive}`}>
          <Icon icon="mdi:pause-circle" aria-hidden />
          {portalCopy.statusInactive}
        </span>;
    }
    return <span className={`${s.badge} ${s.badgeNone}`}>
        <Icon icon="mdi:account-off-outline" aria-hidden />
        {portalCopy.statusNone}
      </span>;
  };
  return <section className={s.portalSection}>
      {hasPortal ? <>
          <div className={s.portalHero}>
            <div className={s.portalHeroIcon} aria-hidden>
              <Icon icon="mdi:monitor-dashboard" />
            </div>
            <div className={s.portalHeroBody}>
              <p className={s.portalHeroTitle}>{portalCopy.heroTitle}</p>
              {loginEmail ? <p className={s.portalHeroMeta}>{loginEmail}</p> : null}
            </div>
            <div className={s.heroRight}>
              {statusBadge()}
              {canManage ? <label className={s.switch} title={contact.portal_active ? portalCopy.toggleActive : portalCopy.toggleInactive}>
                  <input type="checkbox" checked={Boolean(contact.portal_active)} disabled={busy || contactInactive || !contact.portal_active && portalAtLimit} onChange={e => handleToggle(e.target.checked)} aria-label={portalCopy.toggleAria} />
                  <span className={s.switchTrack} />
                </label> : null}
            </div>
          </div>

          {maxPortalUsers != null && <p className={s.usageHint}>
              {interpolate(portalCopy.usageHint, {
            active: String(activePortalCount),
            max: String(maxPortalUsers)
          })}
              {portalAtLimit ? <>
                  {" "}
                  {portalCopy.limitReached} <ProFeatureBadge variant="inline" className={s.proBadgeInline} />
                </> : null}
            </p>}

          {contactInactive && <div className={`${s.alert} ${s.alertWarning}`} role="status">
              <Icon icon="mdi:alert-outline" className={s.alertIcon} aria-hidden />
              <span>{portalCopy.alertInactive}</span>
            </div>}

          <div className={s.portalGrid}>
            <div className={s.portalCard}>
              <div className={s.metaList}>
                <PortalEmailPicker
                  value={selectedPortalEmail || loginEmail}
                  options={contactEmails}
                  primaryEmail={primaryEmail}
                  onChange={handlePortalEmailChange}
                  disabled={busy || !canManage}
                  copy={portalCopy}
                  readOnly={!canManage}
                />
                <div className={s.metaItem}>
                  <span className={s.metaLabel}>{portalCopy.lastLoginLabel}</span>
                  <span className={s.metaValue}>{lastLogin || portalCopy.never}</span>
                </div>
              </div>
              <PortalRolePicker value={contact.portal_role} onChange={handleRoleChange} disabled={busy || !canManage} copy={portalCopy} compact />
            </div>

            {(canManage || contact.portal_active && !contactInactive) ? <div className={s.portalCard}>
                <div className={s.actions}>
                  {canManage && (status === "pending" || contact.portal_pending) ? <button type="button" className={`${s.actionBtn} ${s.actionBtnInvite || ""}`.trim()} onClick={handleSendInvite} disabled={busy} title={portalCopy.resendInvite || portalCopy.sendInvite}>
                      <Icon icon="mdi:email-fast-outline" aria-hidden />
                      {portalCopy.sendInvite}
                    </button> : null}
                  {canManage ? <button type="button" className={s.actionBtn} onClick={() => setPasswordModal("reset")} disabled={busy}>
                      <Icon icon="mdi:key-outline" aria-hidden />
                      {portalCopy.resetPassword}
                    </button> : null}
                  {contact.portal_active && !contactInactive ? <button type="button" className={`${s.actionBtn} ${s.actionBtnImpersonate}`} onClick={handleImpersonate} disabled={busy} title={portalCopy.impersonateTitle}>
                      <Icon icon="mdi:incognito" aria-hidden />
                      {portalCopy.impersonate}
                    </button> : null}
                  {canManage ? <button type="button" className={`${s.actionBtn} ${s.actionBtnDanger}`} onClick={() => setShowRevoke(true)} disabled={busy}>
                      <Icon icon="mdi:link-off" aria-hidden />
                      {portalCopy.revoke}
                    </button> : null}
                </div>
              </div> : <div className={s.portalCard}>
                <p className={s.inviteDesc}>{portalCopy.noActionsHint || portalCopy.roleUserHint}</p>
              </div>}
          </div>
        </> : <div className={s.setupCard}>
          <div className={s.setupHeader}>
            <div className={s.portalHeroIcon} aria-hidden>
              <Icon icon="mdi:monitor-dashboard" />
            </div>
            <div className={s.portalHeroBody}>
              <div className={s.setupTitleRow}>
                <p className={s.portalHeroTitle}>{portalCopy.heroTitle}</p>
                {statusBadge()}
              </div>
              <p className={s.setupDesc}>
                {canCreate
                  ? interpolate(portalCopy.emptyDesc, { email: loginEmail })
                  : portalCopy.alertNeedEmail}
              </p>
            </div>
          </div>

          {maxPortalUsers != null && <p className={s.usageHint}>
              {interpolate(portalCopy.usageHint, {
            active: String(activePortalCount),
            max: String(maxPortalUsers)
          })}
              {portalAtLimit ? <>
                  {" "}
                  {portalCopy.limitReached} <ProFeatureBadge variant="inline" className={s.proBadgeInline} />
                </> : null}
            </p>}

          {contactInactive && <div className={`${s.alert} ${s.alertWarning}`} role="status">
              <Icon icon="mdi:alert-outline" className={s.alertIcon} aria-hidden />
              <span>{portalCopy.alertInactive}</span>
            </div>}

          {canManage && canCreate ? <div className={s.setupFooter}>
              <PortalEmailPicker
                value={selectedPortalEmail}
                options={contactEmails}
                primaryEmail={primaryEmail}
                onChange={setSelectedPortalEmail}
                disabled={busy}
                copy={portalCopy}
              />
              <PortalRolePicker
                value={createPortalRole}
                onChange={setCreatePortalRole}
                disabled={busy}
                copy={portalCopy}
                stacked
              />
              <button type="button" className={s.primaryBtn} onClick={() => {
            if (portalAtLimit) {
              warnPortalLimit();
              return;
            }
            handleCreateAccess();
          }} disabled={busy || contactInactive || portalAtLimit} title={portalAtLimit ? interpolate(portalCopy.limitTooltip, {
            max: String(maxPortalUsers)
          }) : undefined}>
                <Icon icon="mdi:account-check-outline" aria-hidden />
                {portalCopy.createAccess}
              </button>
            </div> : null}
        </div>}

      <ContactPortalPasswordModal open={passwordModal === "reset"} mode="reset" contact={contact} saving={busy} onClose={() => setPasswordModal(null)} onSubmit={handleReset} />

      <ContactPortalRevokeModal open={showRevoke} contact={contact} saving={busy} onClose={() => setShowRevoke(false)} onConfirm={handleRevoke} />

      <PortalImpersonationOverlay open={Boolean(impersonationOverlay)} contactLabel={impersonationOverlay?.label} onCancel={handleCancelImpersonation} />
    </section>;
}
