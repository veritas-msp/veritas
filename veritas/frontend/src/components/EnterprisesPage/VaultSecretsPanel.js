import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";
import { FaTimes } from "react-icons/fa";
import { toast } from "react-toastify";
import { createVaultSecret, fetchVaultSecrets, revokeVaultSecret } from "../../api/vaultSecrets";
import { useAppFormatters, useAppLocale } from "../../hooks/useAppGeneralSettings";
import { useVeritasEdition } from "../../hooks/useVeritasEdition";
import { generateVaultPassword } from "../../utils/generateVaultPassword";
import { getVaultSecretAvailabilityLabel, getVaultSecretsCopy, interpolate } from "./vaultSecretsI18n";
import pageLayout from "./EnterprisesPage.module.css";
import formStyles from "./EnterpriseFormModal.module.css";
import styles from "./EnterpriseVaultPanel.module.css";
import VaultSecretRevokeModal from "./VaultSecretRevokeModal";
function availabilityClass(availability) {
  if (availability === "active") return styles.secretBadgeActive;
  if (availability === "expired" || availability === "exhausted") return styles.secretBadgeWarn;
  return styles.secretBadgeMuted;
}
export default function VaultSecretsPanel({
  contactId,
  clientId,
  contactName = "",
  createModalOpen = false,
  onCreateModalChange
}) {
  const locale = useAppLocale();
  const {
    isCommunity,
    loaded: editionLoaded
  } = useVeritasEdition();
  const {
    formatDateTime
  } = useAppFormatters();
  const copy = useMemo(() => getVaultSecretsCopy(locale), [locale]);
  const panelCopy = copy.panel;
  const toastCopy = copy.toast;
  const [secrets, setSecrets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [revokingId, setRevokingId] = useState(null);
  const [revokeTarget, setRevokeTarget] = useState(null);
  const showCreateModal = Boolean(createModalOpen);
  const setShowCreateModal = onCreateModalChange || (() => {});
  const load = useCallback(async () => {
    if (!editionLoaded) {
      setLoading(true);
      return;
    }
    if (isCommunity || !contactId) {
      setSecrets([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const rows = await fetchVaultSecrets(contactId);
      setSecrets(Array.isArray(rows) ? rows : []);
    } catch (err) {
      setSecrets([]);
      if (err?.code !== "PRO_FEATURE_REQUIRED") {
        toast.error(toastCopy.loadError);
      }
    } finally {
      setLoading(false);
    }
  }, [contactId, editionLoaded, isCommunity, toastCopy.loadError]);
  useEffect(() => {
    load();
  }, [load]);
  const handleConfirmRevoke = async () => {
    const secret = revokeTarget;
    if (!secret?.id || revokingId) return;
    setRevokingId(secret.id);
    try {
      await revokeVaultSecret(secret.id);
      setSecrets(prev => prev.map(row => row.id === secret.id ? {
        ...row,
        availability: "revoked",
        status: "revoked",
        views_remaining: 0
      } : row));
      setRevokeTarget(null);
      toast.success(toastCopy.revoked);
    } catch (err) {
      toast.error(err.message || toastCopy.revokeError);
    } finally {
      setRevokingId(null);
    }
  };
  const activeCount = secrets.filter(row => row.availability === "active").length;
  return <div className={styles.secretsPanel}>
      <div className={styles.toolbar}>
        <div className={styles.toolbarIntro}>
          <p className={styles.introText}>
            {interpolate(panelCopy.intro, {
            contact: contactName || panelCopy.contactFallback
          })}
            {activeCount > 0 ? ` ${interpolate(activeCount > 1 ? panelCopy.activeCountPlural : panelCopy.activeCount, {
            count: String(activeCount)
          })}` : ""}
          </p>
        </div>
      </div>

      {loading ? <div className={styles.loadingState}>
          <Icon icon="mdi:loading" className={styles.spinning} aria-hidden />
          {panelCopy.loading}
        </div> : secrets.length === 0 ? <div className={styles.empty}>
          <Icon icon="mdi:key-variant" className={styles.emptyIcon} aria-hidden />
          <p>{panelCopy.empty}</p>
        </div> : <div className={styles.secretsList}>
          {secrets.map(secret => <article key={secret.id} className={styles.secretCard}>
              <div className={styles.secretCardMain}>
                <div className={styles.secretCardHead}>
                  <Icon icon="mdi:key-variant" className={styles.secretCardIcon} aria-hidden />
                  <div className={styles.secretCardTitleWrap}>
                    <h3 className={styles.secretCardTitle}>{secret.title}</h3>
                    {secret.description ? <p className={styles.secretCardDesc}>{secret.description}</p> : null}
                  </div>
                  <span className={`${styles.secretBadge} ${availabilityClass(secret.availability)}`.trim()}>
                    {getVaultSecretAvailabilityLabel(secret.availability, locale)}
                  </span>
                </div>
                <div className={styles.secretMetaRow}>
                  <span>
                    {interpolate(panelCopy.expiresAt, {
                date: formatDateTime(secret.expires_at)
              })}
                  </span>
                  <span>
                    {interpolate(panelCopy.views, {
                used: String(secret.view_count),
                max: String(secret.max_views)
              })}
                    {secret.availability === "active" && secret.views_remaining != null ? interpolate(secret.views_remaining > 1 ? panelCopy.viewsRemainingPlural : panelCopy.viewsRemaining, {
                count: String(secret.views_remaining)
              }) : ""}
                  </span>
                  <span>
                    {interpolate(panelCopy.createdAt, {
                date: formatDateTime(secret.created_at)
              })}
                  </span>
                  {secret.deletion_requested_at ? <span className={styles.secretDeletionRequested}>
                      {panelCopy.deletionRequested}
                    </span> : null}
                </div>
              </div>
              {secret.availability === "active" ? <button type="button" className={`${pageLayout.iconBtn} ${styles.secretRevokeBtn}`} onClick={() => setRevokeTarget(secret)} disabled={Boolean(revokingId)} title={panelCopy.revokeTitle}>
                  <Icon icon={revokingId === secret.id ? "mdi:loading" : "mdi:key-remove"} className={revokingId === secret.id ? styles.spinning : undefined} aria-hidden />
                </button> : null}
            </article>)}
        </div>}

      {showCreateModal ? <VaultShareSecretModal contactId={contactId} clientId={clientId} locale={locale} onClose={() => setShowCreateModal(false)} onCreated={created => {
      setSecrets(prev => [created, ...prev]);
      setShowCreateModal(false);
      toast.success(toastCopy.created);
    }} /> : null}

      <VaultSecretRevokeModal open={Boolean(revokeTarget)} secret={revokeTarget} contactName={contactName} saving={Boolean(revokeTarget && revokingId === revokeTarget.id)} onClose={() => {
      if (revokingId) return;
      setRevokeTarget(null);
    }} onConfirm={handleConfirmRevoke} />
    </div>;
}
function clampStepperValue(value, min, max, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.round(parsed)));
}
function NumberStepper({
  id,
  value,
  onChange,
  min,
  max,
  disabled = false,
  stepperCopy
}) {
  const numericValue = clampStepperValue(value, min, max, min);
  const applyDelta = delta => {
    onChange(clampStepperValue(numericValue + delta, min, max, min));
  };
  return <div className={styles.numberStepper}>
      <input id={id} type="number" className={styles.numberStepperInput} value={numericValue} min={min} max={max} disabled={disabled} onChange={e => onChange(clampStepperValue(e.target.value, min, max, min))} />
      <div className={styles.numberStepperActions}>
        <button type="button" className={styles.numberStepperBtn} onClick={() => applyDelta(1)} disabled={disabled || numericValue >= max} aria-label={stepperCopy.increase}>
          <Icon icon="mdi:plus" aria-hidden />
        </button>
        <button type="button" className={styles.numberStepperBtn} onClick={() => applyDelta(-1)} disabled={disabled || numericValue <= min} aria-label={stepperCopy.decrease}>
          <Icon icon="mdi:minus" aria-hidden />
        </button>
      </div>
    </div>;
}
function VaultShareSecretModal({
  contactId,
  clientId,
  locale,
  onClose,
  onCreated
}) {
  const copy = useMemo(() => getVaultSecretsCopy(locale), [locale]);
  const modalCopy = copy.shareModal;
  const toastCopy = copy.toast;
  const stepperCopy = copy.stepper;
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [login, setLogin] = useState("");
  const [secret, setSecret] = useState("");
  const [showSecret, setShowSecret] = useState(false);
  const [expiresInDays, setExpiresInDays] = useState(7);
  const [maxViews, setMaxViews] = useState(5);
  const [saving, setSaving] = useState(false);
  const handleGenerate = () => {
    setSecret(generateVaultPassword(16));
    setShowSecret(true);
  };
  const handleSubmit = async e => {
    e.preventDefault();
    if (!contactId) return toast.error(toastCopy.contactNotFound);
    if (!clientId) return toast.error(toastCopy.clientNotFound);
    if (!title.trim()) return toast.error(toastCopy.titleRequired);
    if (!secret.trim()) return toast.error(toastCopy.secretRequired);
    try {
      setSaving(true);
      const created = await createVaultSecret({
        contactId,
        clientId,
        title: title.trim(),
        description: description.trim(),
        login: login.trim(),
        secret: secret.trim(),
        expiresInDays,
        maxViews
      });
      onCreated(created);
    } catch (err) {
      toast.error(err.message || toastCopy.shareError);
    } finally {
      setSaving(false);
    }
  };
  return createPortal(<div className={formStyles.overlay} onClick={onClose} role="presentation">
      <div className={`${formStyles.shell} ${formStyles.shellMedium}`} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="vault-share-secret-title">
        <div className={formStyles.accentBar} aria-hidden />
        <header className={formStyles.header}>
          <div className={formStyles.headerMain}>
            <div className={formStyles.headerIconWrap} aria-hidden>
              <Icon icon="mdi:key-plus" />
            </div>
            <div className={formStyles.headerText}>
              <p className={formStyles.eyebrow}>{modalCopy.eyebrow}</p>
              <h2 className={formStyles.title} id="vault-share-secret-title">
                {modalCopy.title}
              </h2>
              <p className={formStyles.subtitle}>
                {modalCopy.subtitle}
              </p>
            </div>
          </div>
          <button type="button" className={formStyles.closeBtn} onClick={onClose} disabled={saving} aria-label={modalCopy.close}>
            <FaTimes />
          </button>
        </header>

        <form className={styles.modalForm} onSubmit={handleSubmit}>
          <div className={styles.modalFormBody}>
            <p className={styles.uploadHint}>
              {modalCopy.hint}
            </p>

            <div className={formStyles.field}>
              <label className={`${formStyles.label} ${formStyles.labelRequired}`} htmlFor="vault-secret-title">
                {modalCopy.titleLabel}
              </label>
              <input id="vault-secret-title" className={formStyles.input} value={title} onChange={e => setTitle(e.target.value)} placeholder={modalCopy.titlePlaceholder} maxLength={200} disabled={saving} />
            </div>

            <div className={formStyles.field}>
              <label className={formStyles.label} htmlFor="vault-secret-description">
                {modalCopy.contextLabel}
              </label>
              <input id="vault-secret-description" className={formStyles.input} value={description} onChange={e => setDescription(e.target.value)} placeholder={modalCopy.contextPlaceholder} maxLength={2000} disabled={saving} />
            </div>

            <div className={formStyles.field}>
              <label className={formStyles.label} htmlFor="vault-secret-login">
                {modalCopy.loginLabel}
              </label>
              <input id="vault-secret-login" className={formStyles.input} value={login} onChange={e => setLogin(e.target.value)} placeholder={modalCopy.loginPlaceholder} maxLength={320} disabled={saving} autoComplete="off" />
            </div>

            <div className={formStyles.field}>
              <label className={`${formStyles.label} ${formStyles.labelRequired}`} htmlFor="vault-secret-value">
                {modalCopy.secretLabel}
              </label>
              <div className={styles.secretInputRow}>
                <input id="vault-secret-value" className={formStyles.input} type={showSecret ? "text" : "password"} value={secret} onChange={e => setSecret(e.target.value)} placeholder={modalCopy.secretPlaceholder} maxLength={4000} disabled={saving} autoComplete="new-password" />
                <button type="button" className={formStyles.ghostBtn} onClick={() => setShowSecret(prev => !prev)} disabled={saving} title={showSecret ? modalCopy.hide : modalCopy.show}>
                  <Icon icon={showSecret ? "mdi:eye-off-outline" : "mdi:eye-outline"} aria-hidden />
                </button>
                <button type="button" className={formStyles.ghostBtn} onClick={handleGenerate} disabled={saving}>
                  <Icon icon="mdi:dice-multiple-outline" aria-hidden />
                  {modalCopy.generate}
                </button>
              </div>
            </div>

            <div className={formStyles.fieldGrid2}>
              <div className={formStyles.field}>
                <label className={formStyles.label} htmlFor="vault-secret-expires">
                  {modalCopy.expiresLabel}
                </label>
                <NumberStepper id="vault-secret-expires" value={expiresInDays} onChange={setExpiresInDays} min={1} max={90} disabled={saving} stepperCopy={stepperCopy} />
              </div>
              <div className={formStyles.field}>
                <label className={formStyles.label} htmlFor="vault-secret-views">
                  {modalCopy.maxViewsLabel}
                </label>
                <NumberStepper id="vault-secret-views" value={maxViews} onChange={setMaxViews} min={1} max={100} disabled={saving} stepperCopy={stepperCopy} />
              </div>
            </div>
          </div>

          <footer className={formStyles.footer}>
            <span className={formStyles.footerHint}>{modalCopy.footerHint}</span>
            <div className={formStyles.footerActions}>
              <button type="button" className={formStyles.ghostBtn} onClick={onClose} disabled={saving}>
                {modalCopy.cancel}
              </button>
              <button type="submit" className={formStyles.primaryBtn} disabled={saving || !secret.trim() || !title.trim()}>
                {saving ? <>
                    <Icon icon="mdi:loading" className={formStyles.spinning} aria-hidden />
                    {modalCopy.sharing}
                  </> : <>
                    <Icon icon="mdi:share-variant-outline" aria-hidden />
                    {modalCopy.share}
                  </>}
              </button>
            </div>
          </footer>
        </form>
      </div>
    </div>, document.getElementById("modal-root") || document.body);
}
