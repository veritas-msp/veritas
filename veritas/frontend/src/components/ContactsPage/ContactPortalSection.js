import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@iconify/react";
import { toast } from "react-toastify";
import { createContactPortal, setContactPortalActive, resetContactPortalPassword, deleteContactPortal, impersonateContactPortal, stopPortalImpersonation, getPortalStatusFromContact, fetchClientPortalUsage } from "../../api/contactPortal";
import { useAppFormatters, useAppLocale } from "../../hooks/useAppGeneralSettings";
import { useVeritasEdition } from "../../hooks/useVeritasEdition";
import { getCommunityClientPortalLimit } from "../../config/edition";
import { getContactDetailCopy, interpolate } from "./contactDetailI18n";
import ProFeatureBadge from "../Misc/ProFeature/ProFeatureBadge";
import ContactPortalPasswordModal from "./ContactPortalPasswordModal";
import ContactPortalRevokeModal from "./ContactPortalRevokeModal";
import PortalImpersonationOverlay from "./PortalImpersonationOverlay";
import s from "./ContactPortalSection.module.css";
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
  const [portalUsage, setPortalUsage] = useState({
    active: 0,
    max: maxPortalUsers
  });
  const [impersonationOverlay, setImpersonationOverlay] = useState(null);
  const impersonationAbortRef = useRef(null);
  const impersonationStartedRef = useRef(false);
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
  const canCreate = Boolean(contact.email?.trim() && contact.client_id);
  const contactInactive = String(contact.statut || "").toLowerCase().includes("inact");
  const loginEmail = (contact.portal_email || contact.email || "").trim();
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
  const openCreateModal = () => {
    if (portalAtLimit) {
      warnPortalLimit();
      return;
    }
    setPasswordModal("create");
  };
  const handleCreate = async password => {
    setBusy(true);
    try {
      await createContactPortal(contact.id, password);
      toast.success(toastCopy.created);
      setPasswordModal(null);
      refresh();
    } catch (e) {
      toast.error(e.message);
      throw e;
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
      <div className={s.portalHero}>
        <div className={s.portalHeroIcon} aria-hidden>
          <Icon icon="mdi:monitor-dashboard" />
        </div>
        <div className={s.portalHeroBody}>
          <p className={s.portalHeroTitle}>{portalCopy.heroTitle}</p>
          <p className={s.portalHeroDesc}>{portalCopy.heroDesc}</p>
        </div>
        {statusBadge()}
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

      {!canCreate && !hasPortal && <div className={s.alert} role="status">
          <Icon icon="mdi:information-outline" className={s.alertIcon} aria-hidden />
          <span>{portalCopy.alertNeedEmail}</span>
        </div>}

      {contactInactive && <div className={`${s.alert} ${s.alertWarning}`} role="status">
          <Icon icon="mdi:alert-outline" className={s.alertIcon} aria-hidden />
          <span>{portalCopy.alertInactive}</span>
        </div>}

      {hasPortal ? <>
          <div className={s.statsGrid}>
            <div className={s.statCard}>
              <span className={s.statLabel}>{portalCopy.loginEmailLabel}</span>
              <span className={s.statValue}>{loginEmail || "-"}</span>
            </div>
            <div className={s.statCard}>
              <span className={s.statLabel}>{portalCopy.lastLoginLabel}</span>
              <span className={s.statValue}>{lastLogin || portalCopy.never}</span>
            </div>
          </div>

          <div className={s.toggleCard}>
            <div className={s.toggleText}>
              <span className={s.toggleTitle}>{portalCopy.toggleTitle}</span>
              <span className={s.toggleHint}>
                {contact.portal_active ? portalCopy.toggleActive : portalCopy.toggleInactive}
              </span>
            </div>
            {canManage ? <label className={s.switch}>
              <input type="checkbox" checked={Boolean(contact.portal_active)} disabled={busy || contactInactive || !contact.portal_active && portalAtLimit} onChange={e => handleToggle(e.target.checked)} aria-label={portalCopy.toggleAria} />
              <span className={s.switchTrack} />
            </label> : null}
          </div>

          {canManage ? <div className={s.actions}>
            <button type="button" className={s.actionBtn} onClick={() => setPasswordModal("reset")} disabled={busy}>
              <Icon icon="mdi:key-outline" aria-hidden />
              {portalCopy.resetPassword}
            </button>
            {contact.portal_active && !contactInactive ? <button type="button" className={`${s.actionBtn} ${s.actionBtnImpersonate}`} onClick={handleImpersonate} disabled={busy} title={portalCopy.impersonateTitle}>
                <Icon icon="mdi:incognito" aria-hidden />
                {portalCopy.impersonate}
              </button> : null}
            <button type="button" className={`${s.actionBtn} ${s.actionBtnDanger}`} onClick={() => setShowRevoke(true)} disabled={busy}>
              <Icon icon="mdi:link-off" aria-hidden />
              {portalCopy.revoke}
            </button>
          </div> : null}
        </> : canManage && canCreate && <div className={s.emptyState}>
            <Icon icon="mdi:account-key-outline" className={s.emptyIcon} aria-hidden />
            <p className={s.emptyTitle}>{portalCopy.emptyTitle}</p>
            <p className={s.emptyDesc}>
              {interpolate(portalCopy.emptyDesc, {
          email: loginEmail
        })}
            </p>
            <button type="button" className={s.primaryBtn} onClick={openCreateModal} disabled={busy || contactInactive || portalAtLimit} title={portalAtLimit ? interpolate(portalCopy.limitTooltip, {
        max: String(maxPortalUsers)
      }) : undefined}>
              <Icon icon="mdi:plus" aria-hidden />
              {portalCopy.createAccess}
            </button>
          </div>}

      <ContactPortalPasswordModal open={passwordModal === "create"} mode="create" contact={contact} saving={busy} onClose={() => setPasswordModal(null)} onSubmit={handleCreate} />

      <ContactPortalPasswordModal open={passwordModal === "reset"} mode="reset" contact={contact} saving={busy} onClose={() => setPasswordModal(null)} onSubmit={handleReset} />

      <ContactPortalRevokeModal open={showRevoke} contact={contact} saving={busy} onClose={() => setShowRevoke(false)} onConfirm={handleRevoke} />

      <PortalImpersonationOverlay open={Boolean(impersonationOverlay)} contactLabel={impersonationOverlay?.label} onCancel={handleCancelImpersonation} />
    </section>;
}
