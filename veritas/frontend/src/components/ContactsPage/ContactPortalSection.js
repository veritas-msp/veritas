import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@iconify/react";
import { toast } from "react-toastify";
import {
  createContactPortal,
  resendContactPortalInvite,
  setContactPortalActive,
  setContactPortalEmail,
  resetContactPortalPassword,
  deleteContactPortal,
  impersonateContactPortal,
  stopPortalImpersonation,
  getPortalStatusFromContact,
  fetchClientPortalUsage,
  fetchContactPortalLogins
} from "../../api/contactPortal";
import { useAppFormatters, useAppLocale } from "../../hooks/useAppGeneralSettings";
import { useVeritasEdition } from "../../hooks/useVeritasEdition";
import { getCommunityClientPortalLimit } from "../../config/edition";
import { normalizeContactCommunications } from "../../utils/contactCommunications";
import { getContactDetailCopy, interpolate } from "./contactDetailI18n";
import ProFeatureBadge from "../Misc/ProFeature/ProFeatureBadge";
import ContactPortalPasswordModal from "./ContactPortalPasswordModal";
import ContactPortalRevokeModal from "./ContactPortalRevokeModal";
import PortalImpersonationOverlay from "./PortalImpersonationOverlay";
import { UiKitEmptyState } from "../UiKit";
import EquipmentHoverIcon, { QUICK_ACTION_ANIMATED } from "../EquipementPage/EquipmentHoverIcon";
import detailStyles from "../EnterprisesPage/EnterpriseDetailPage.module.css";
import s from "./ContactPortalSection.module.css";

function PortalQuickActionTile({
  actionId,
  iconify,
  label,
  title,
  onClick,
  disabled = false,
  primary = false,
  danger = false,
  index = 0
}) {
  const animRef = useRef(null);
  const Animated = QUICK_ACTION_ANIMATED[actionId] || null;
  const tooltip = title || label;

  return (
    <button
      type="button"
      className={[
        s.quickActionTile,
        primary ? s.quickActionTilePrimary : "",
        danger ? s.quickActionTileDanger : ""
      ]
        .filter(Boolean)
        .join(" ")}
      style={{ animationDelay: `${Math.min(index, 8) * 28}ms` }}
      onClick={onClick}
      disabled={disabled}
      aria-label={tooltip}
      title={tooltip}
      onMouseEnter={() => !disabled && animRef.current?.startAnimation?.()}
      onMouseLeave={() => animRef.current?.stopAnimation?.()}
    >
      <span className={s.quickActionIconWrap} aria-hidden>
        <EquipmentHoverIcon
          Animated={Animated}
          iconify={iconify}
          size={22}
          className={s.quickActionIcon}
          animRef={animRef}
        />
      </span>
      <span className={s.quickActionLabel}>{label}</span>
    </button>
  );
}

function portalLoginStatusClass(status) {
  if (status === "success") return s.loginStatusSuccess;
  if (status === "blocked" || status === "pending_activation") return s.loginStatusWarn;
  return s.loginStatusDanger;
}

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
    <div className={s.metaItem}>
      <span className={s.metaLabel}>{copy.loginEmailLabel}</span>
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
        <span className={s.metaValue}>{value || options[0]}</span>
      )}
      {showSelect ? <span className={s.metaHint}>{copy.loginEmailHint}</span> : null}
    </div>
  );
}

export default function ContactPortalSection({
  contact,
  onUpdated,
  canManage = true,
  active = true
}) {
  const locale = useAppLocale();
  const { formatDateTime } = useAppFormatters();
  const portalCopy = useMemo(() => getContactDetailCopy(locale).portal, [locale]);
  const toastCopy = portalCopy.toast;
  const { isCommunity, limits } = useVeritasEdition();
  const maxPortalUsers = isCommunity ? getCommunityClientPortalLimit(limits) : null;
  const [busy, setBusy] = useState(false);
  const [passwordModal, setPasswordModal] = useState(null);
  const [showRevoke, setShowRevoke] = useState(false);
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
    if (!active) return;
    loadPortalUsage();
  }, [active, loadPortalUsage]);
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

  const [loginEvents, setLoginEvents] = useState([]);
  const [loginEventsLoading, setLoginEventsLoading] = useState(false);
  const loginHistoryCopy = portalCopy.loginHistory || {};
  const loadLoginEvents = useCallback(async signal => {
    if (!contact?.id || !contact?.portal_user_id) {
      setLoginEvents([]);
      setLoginEventsLoading(false);
      return;
    }
    setLoginEventsLoading(true);
    try {
      const data = await fetchContactPortalLogins(contact.id, { limit: 50, signal });
      if (signal?.aborted) return;
      setLoginEvents(Array.isArray(data?.events) ? data.events : []);
    } catch (err) {
      if (signal?.aborted || err?.name === "AbortError") return;
      setLoginEvents([]);
    } finally {
      if (!signal?.aborted) setLoginEventsLoading(false);
    }
  }, [contact?.id, contact?.portal_user_id]);
  useEffect(() => {
    if (!active) return undefined;
    const controller = new AbortController();
    loadLoginEvents(controller.signal);
    return () => controller.abort();
  }, [active, loadLoginEvents]);

  if (!contact?.id) return null;
  const activePortalCount = portalUsage.active;
  const portalAtLimit = maxPortalUsers != null && activePortalCount >= maxPortalUsers;
  const warnPortalLimit = () => {
    toast.warn(
      interpolate(portalCopy.limitWarn, {
        max: String(maxPortalUsers)
      })
    );
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
    loadLoginEvents();
  };

  const statusLabelForLogin = statusKey =>
    loginHistoryCopy.status?.[statusKey] || statusKey || "—";
  const reasonLabelForLogin = reasonKey => {
    if (!reasonKey) return null;
    return loginHistoryCopy.reasons?.[reasonKey] || null;
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
      await createContactPortal(contact.id, "user", selectedPortalEmail || null);
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
    const label =
      [contact.prenom, contact.nom].filter(Boolean).join(" ").trim() ||
      loginEmail ||
      portalCopy.contactFallback;
    const controller = new AbortController();
    impersonationAbortRef.current = controller;
    impersonationStartedRef.current = false;
    setImpersonationOverlay({ label });
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
        sessionStorage.setItem(
          "veritas_impersonation_return",
          JSON.stringify({
            contactId: contact.id
          })
        );
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
      return (
        <span className={`${s.badge} ${s.badgePending || s.badgeInactive}`}>
          <Icon icon="mdi:email-fast-outline" aria-hidden />
          {portalCopy.statusPending || "Invitation en attente"}
        </span>
      );
    }
    if (status === "active") {
      return (
        <span className={`${s.badge} ${s.badgeActive}`}>
          <Icon icon="mdi:check-circle" aria-hidden />
          {portalCopy.statusActive}
        </span>
      );
    }
    if (status === "inactive") {
      return (
        <span className={`${s.badge} ${s.badgeInactive}`}>
          <Icon icon="mdi:pause-circle" aria-hidden />
          {portalCopy.statusInactive}
        </span>
      );
    }
    return (
      <span className={`${s.badge} ${s.badgeNone}`}>
        <Icon icon="mdi:account-off-outline" aria-hidden />
        {portalCopy.statusNone}
      </span>
    );
  };
  const activationSwitch =
    canManage && hasPortal ? (
      <label
        className={s.switch}
        title={contact.portal_active ? portalCopy.toggleActive : portalCopy.toggleInactive}
      >
        <input
          type="checkbox"
          checked={Boolean(contact.portal_active)}
          disabled={busy || contactInactive || (!contact.portal_active && portalAtLimit)}
          onChange={e => handleToggle(e.target.checked)}
          aria-label={portalCopy.toggleAria}
        />
        <span className={s.switchTrack} />
      </label>
    ) : null;

  const usageBlock =
    maxPortalUsers != null ? (
      <p className={s.usageHint}>
        {interpolate(portalCopy.usageHint, {
          active: String(activePortalCount),
          max: String(maxPortalUsers)
        })}
        {portalAtLimit ? (
          <>
            {" "}
            {portalCopy.limitReached} <ProFeatureBadge variant="inline" className={s.proBadgeInline} />
          </>
        ) : null}
      </p>
    ) : null;

  const inactiveAlert = contactInactive ? (
    <div className={`${s.alert} ${s.alertWarning}`} role="status">
      <Icon icon="mdi:alert-outline" className={s.alertIcon} aria-hidden />
      <span>{portalCopy.alertInactive}</span>
    </div>
  ) : null;

  const quickActionItems = [];
  if (canManage && (status === "pending" || contact.portal_pending)) {
    quickActionItems.push({
      actionId: "portalInvite",
      iconify: "mdi:email-fast-outline",
      label: portalCopy.sendInvite,
      title: portalCopy.resendInvite || portalCopy.sendInvite,
      onClick: handleSendInvite,
      primary: true
    });
  }
  if (canManage) {
    quickActionItems.push({
      actionId: "portalReset",
      iconify: "mdi:key-outline",
      label: portalCopy.resetPassword,
      onClick: () => setPasswordModal("reset")
    });
  }
  if (contact.portal_active && !contactInactive) {
    quickActionItems.push({
      actionId: "portalImpersonate",
      iconify: "mdi:incognito",
      label: portalCopy.impersonate,
      title: portalCopy.impersonateTitle || portalCopy.impersonate,
      onClick: handleImpersonate
    });
  }
  if (canManage) {
    quickActionItems.push({
      actionId: "portalRevoke",
      iconify: "mdi:link-off",
      label: portalCopy.revoke,
      onClick: () => setShowRevoke(true),
      danger: true
    });
  }

  const quickActions =
    canManage || (contact.portal_active && !contactInactive) ? (
      quickActionItems.length ? (
        <div
          className={s.quickActionsGrid}
          role="group"
          aria-label={portalCopy.quickActionsAria || "Actions rapides"}
        >
          {quickActionItems.map((item, index) => (
            <PortalQuickActionTile
              key={item.actionId}
              {...item}
              index={index}
              disabled={busy}
            />
          ))}
        </div>
      ) : (
        <p className={s.inviteDesc}>{portalCopy.noActionsHint || portalCopy.roleUserHint}</p>
      )
    ) : (
      <p className={s.inviteDesc}>{portalCopy.noActionsHint || portalCopy.roleUserHint}</p>
    );

  const loginHistoryBlock = (
    <div className={s.loginHistory}>
      <div className={s.loginHistoryHeader}>
        <div className={s.loginHistoryTitles}>
          <h3 className={s.loginHistoryTitle}>
            {loginHistoryCopy.title || "Activité de connexion"}
          </h3>
          <p className={s.loginHistoryHint}>
            {loginHistoryCopy.hint || "Suivi des tentatives de connexion au portail client"}
          </p>
        </div>
      </div>
      <div className={s.loginHistoryBody}>
        {loginEventsLoading ? (
          <div className={s.loginHistoryLoading}>
            <Icon icon="mdi:loading" className={s.spinning} aria-hidden />
            {loginHistoryCopy.loading || "Chargement…"}
          </div>
        ) : loginEvents.length === 0 ? (
          <div className={detailStyles.activityEmptyState}>
            <UiKitEmptyState
              icon="mdi:shield-key-outline"
              title={loginHistoryCopy.empty || "Aucune tentative de connexion pour le moment."}
              bare
            />
          </div>
        ) : (
          <div className={detailStyles.dataTableWrapper}>
            <table className={detailStyles.dataTable}>
              <thead>
                <tr>
                  <th>{loginHistoryCopy.columns?.date || "Date"}</th>
                  <th>{loginHistoryCopy.columns?.status || "Statut"}</th>
                  <th>{loginHistoryCopy.columns?.locality || "Localité"}</th>
                  <th>{loginHistoryCopy.columns?.ip || "Adresse IP"}</th>
                  <th>{loginHistoryCopy.columns?.device || "Appareil"}</th>
                </tr>
              </thead>
              <tbody>
                {loginEvents.map(event => {
                  const reason = reasonLabelForLogin(event.failure_reason);
                  return (
                    <tr key={event.id}>
                      <td>{event.created_at ? formatDateTime(event.created_at) : "—"}</td>
                      <td>
                        <span className={`${s.loginStatusBadge} ${portalLoginStatusClass(event.status)}`.trim()}>
                          {statusLabelForLogin(event.status)}
                        </span>
                        {reason ? <span className={s.loginStatusReason}>{reason}</span> : null}
                      </td>
                      <td>{event.locality || loginHistoryCopy.unknownLocality || "Inconnue"}</td>
                      <td className={s.loginMono}>{event.ip || "—"}</td>
                      <td>{event.device_label || "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <section className={s.portalSection}>
      {hasPortal ? (
        <div className={s.portalLayout}>
          <aside className={s.portalAside}>
            {usageBlock}
            {inactiveAlert}

            <div className={s.metaList}>
              <div className={s.metaItem}>
                <span className={s.metaLabel}>{portalCopy.statusLabel || "Statut"}</span>
                <div className={s.statusControls}>
                  {statusBadge()}
                  {activationSwitch}
                </div>
              </div>
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

            <div className={s.quickActionsBlock}>
              <span className={s.metaLabel}>{portalCopy.quickActionsLabel || "Actions rapides"}</span>
              {quickActions}
            </div>
          </aside>

          <div className={s.portalMain}>{loginHistoryBlock}</div>
        </div>
      ) : (
        <div className={s.portalTop}>
          <div className={s.portalStack}>
            <div className={s.metaItem}>
              <span className={s.metaLabel}>{portalCopy.statusLabel || "Statut"}</span>
              <div className={s.statusControls}>{statusBadge()}</div>
            </div>
            <p className={s.setupDesc}>
              {canCreate
                ? interpolate(portalCopy.emptyDesc, { email: loginEmail })
                : portalCopy.alertNeedEmail}
            </p>

            {usageBlock}
            {inactiveAlert}

            {canManage && canCreate ? (
              <div className={s.setupFooter}>
                <PortalEmailPicker
                  value={selectedPortalEmail}
                  options={contactEmails}
                  primaryEmail={primaryEmail}
                  onChange={setSelectedPortalEmail}
                  disabled={busy}
                  copy={portalCopy}
                />
                <button
                  type="button"
                  className={s.primaryBtn}
                  onClick={() => {
                    if (portalAtLimit) {
                      warnPortalLimit();
                      return;
                    }
                    handleCreateAccess();
                  }}
                  disabled={busy || contactInactive || portalAtLimit}
                  title={
                    portalAtLimit
                      ? interpolate(portalCopy.limitTooltip, {
                          max: String(maxPortalUsers)
                        })
                      : undefined
                  }
                >
                  <Icon icon="mdi:account-check-outline" aria-hidden />
                  {portalCopy.createAccess}
                </button>
              </div>
            ) : null}
          </div>
        </div>
      )}

      <ContactPortalPasswordModal
        open={passwordModal === "reset"}
        mode="reset"
        contact={contact}
        saving={busy}
        onClose={() => setPasswordModal(null)}
        onSubmit={handleReset}
      />

      <ContactPortalRevokeModal
        open={showRevoke}
        contact={contact}
        saving={busy}
        onClose={() => setShowRevoke(false)}
        onConfirm={handleRevoke}
      />

      <PortalImpersonationOverlay
        open={Boolean(impersonationOverlay)}
        contactLabel={impersonationOverlay?.label}
        onCancel={handleCancelImpersonation}
      />
    </section>
  );
}
