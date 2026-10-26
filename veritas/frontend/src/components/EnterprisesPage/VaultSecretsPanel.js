import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";
import { toast } from "react-toastify";
import { archiveVaultSecret, createVaultSecret, deleteArchivedVaultSecret, fetchVaultSecrets, revokeVaultSecret } from "../../api/vaultSecrets";
import { useAppFormatters, useAppLocale } from "../../hooks/useAppGeneralSettings";
import { useVeritasEdition } from "../../hooks/useVeritasEdition";
import { useCommonCopy } from "../../hooks/useCommonCopy";
import { generateVaultPassword } from "../../utils/generateVaultPassword";
import { getVaultSecretAvailabilityLabel, getVaultSecretsCopy, interpolate } from "./vaultSecretsI18n";
import formStyles from "./EnterpriseFormModal.module.css";
import detailStyles from "./EnterpriseDetailPage.module.css";
import styles from "./EnterpriseVaultPanel.module.css";
import VaultSecretRevokeModal from "./VaultSecretRevokeModal";
import NumberStepperInput from "../Misc/NumberStepperInput/NumberStepperInput";
import { UiKitButton, UiKitEmptyState, uiKitLayoutsStyles as kit } from "../UiKit";
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
  onCreateModalChange,
  searchQuery = "",
  listFilter = "ongoing"
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
  const [archivingId, setArchivingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [revokeTarget, setRevokeTarget] = useState(null);
  const showCreateModal = Boolean(createModalOpen);
  const setShowCreateModal = onCreateModalChange || (() => {});
  const normalizedSearch = String(searchQuery || "").trim().toLowerCase();
  const normalizedListFilter = listFilter === "archived" ? "archived" : "ongoing";
  const filteredSecrets = useMemo(() => {
    const byArchive = secrets.filter(secret => {
      const archived = Boolean(secret.is_archived || secret.archived_at);
      return normalizedListFilter === "archived" ? archived : !archived;
    });
    if (!normalizedSearch) return byArchive;
    return byArchive.filter(secret => {
      const haystack = [
        secret.title,
        secret.description,
        getVaultSecretAvailabilityLabel(secret.availability, locale),
        secret.availability
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(normalizedSearch);
    });
  }, [secrets, normalizedSearch, normalizedListFilter, locale]);
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
  const handleArchive = async secret => {
    if (!secret?.id || archivingId || revokingId || deletingId) return;
    setArchivingId(secret.id);
    try {
      const updated = await archiveVaultSecret(secret.id);
      setSecrets(prev => prev.map(row => row.id === secret.id ? {
        ...row,
        ...updated,
        is_archived: true,
        archived_at: updated.archived_at || new Date().toISOString(),
        availability: updated.availability || "revoked",
        status: updated.status || "revoked",
        views_remaining: updated.views_remaining ?? 0
      } : row));
      toast.success(toastCopy.archived || "Accès archivé.");
    } catch (err) {
      toast.error(err.message || toastCopy.archiveError || "Impossible d'archiver cet accès.");
    } finally {
      setArchivingId(null);
    }
  };
  const handleDeleteArchived = async secret => {
    if (!secret?.id || deletingId || archivingId || revokingId) return;
    const confirmLabel = panelCopy.deleteArchivedConfirm || "Supprimer définitivement cet accès archivé ?";
    if (!window.confirm(confirmLabel)) return;
    setDeletingId(secret.id);
    try {
      await deleteArchivedVaultSecret(secret.id);
      setSecrets(prev => prev.filter(row => row.id !== secret.id));
      toast.success(toastCopy.deletedArchived || "Accès archivé supprimé.");
    } catch (err) {
      toast.error(err.message || toastCopy.deleteArchivedError || "Impossible de supprimer cet accès archivé.");
    } finally {
      setDeletingId(null);
    }
  };
  const tableCopy = panelCopy.table || {};
  const emptyTitle = secrets.length === 0
    ? panelCopy.empty
    : filteredSecrets.length === 0 && normalizedListFilter === "archived"
      ? (panelCopy.emptyArchived || "Aucun accès archivé.")
      : filteredSecrets.length === 0 && !normalizedSearch
        ? (panelCopy.emptyOngoing || "Aucun accès en cours.")
        : (panelCopy.emptyFiltered || "Aucun accès ne correspond à votre recherche.");

  return <div className={`${styles.secretsPanel} ${styles.secretsPanelTable}`.trim()}>
      {loading ? <div className={styles.loadingState}>
          <Icon icon="mdi:loading" className={styles.spinning} aria-hidden />
          {panelCopy.loading}
        </div> : filteredSecrets.length === 0 ? (
        <div className={detailStyles.activityEmptyState}>
          <UiKitEmptyState
            icon="mdi:key-variant"
            title={emptyTitle}
            bare
          />
        </div>
      ) : (
        <div className={`${detailStyles.dataTableWrapper} ${styles.secretsTableShell}`.trim()}>
          <table className={detailStyles.dataTable}>
            <thead>
              <tr>
                <th>{tableCopy.title || "Titre"}</th>
                <th>{tableCopy.status || "Statut"}</th>
                <th>{tableCopy.expires || "Expiration"}</th>
                <th>{tableCopy.views || "Vues"}</th>
                <th>{tableCopy.created || "Créé"}</th>
                <th>{tableCopy.actions || "Actions"}</th>
              </tr>
            </thead>
            <tbody>
              {filteredSecrets.map(secret => (
                <tr key={secret.id}>
                  <td className={styles.secretTableTitleCell}>
                    <span className={styles.secretTableTitle}>{secret.title || "—"}</span>
                    {secret.description ? (
                      <span className={styles.secretTableDesc}>{secret.description}</span>
                    ) : null}
                    {secret.deletion_requested_at ? (
                      <span className={styles.secretDeletionRequested}>{panelCopy.deletionRequested}</span>
                    ) : null}
                  </td>
                  <td>
                    <span className={`${styles.secretBadge} ${availabilityClass(secret.availability)}`.trim()}>
                      {getVaultSecretAvailabilityLabel(secret.availability, locale)}
                    </span>
                  </td>
                  <td>{secret.expires_at ? formatDateTime(secret.expires_at) : "—"}</td>
                  <td>
                    {`${secret.view_count ?? 0}/${secret.max_views ?? "—"}`}
                    {secret.availability === "active" && secret.views_remaining != null
                      ? interpolate(
                          secret.views_remaining > 1
                            ? panelCopy.viewsRemainingPlural
                            : panelCopy.viewsRemaining,
                          { count: String(secret.views_remaining) }
                        )
                      : null}
                  </td>
                  <td>{secret.created_at ? formatDateTime(secret.created_at) : "—"}</td>
                  <td>
                    {(() => {
                      const archived = Boolean(secret.is_archived || secret.archived_at);
                      const actionsBusy = Boolean(revokingId) || Boolean(archivingId) || Boolean(deletingId);
                      return (
                        <div className={styles.secretTableActions} role="group" aria-label={tableCopy.actions || "Actions"}>
                          {secret.availability === "active" && !archived ? (
                            <button
                              type="button"
                              className={styles.secretActionBtn}
                              onClick={() => setRevokeTarget(secret)}
                              disabled={actionsBusy}
                              title={panelCopy.revokeTitle}
                              aria-label={panelCopy.revokeTitle}
                            >
                              <Icon
                                icon={revokingId === secret.id ? "mdi:loading" : "mdi:key-remove"}
                                width={16}
                                height={16}
                                className={revokingId === secret.id ? styles.spinning : undefined}
                                aria-hidden
                              />
                            </button>
                          ) : null}
                          {!archived ? (
                            <button
                              type="button"
                              className={styles.secretActionBtn}
                              onClick={() => handleArchive(secret)}
                              disabled={actionsBusy}
                              title={panelCopy.archiveTitle || "Archiver"}
                              aria-label={panelCopy.archiveTitle || "Archiver"}
                            >
                              <Icon
                                icon={archivingId === secret.id ? "mdi:loading" : "mdi:archive-outline"}
                                width={16}
                                height={16}
                                className={archivingId === secret.id ? styles.spinning : undefined}
                                aria-hidden
                              />
                            </button>
                          ) : (
                            <button
                              type="button"
                              className={styles.secretActionBtn}
                              onClick={() => handleDeleteArchived(secret)}
                              disabled={actionsBusy}
                              title={panelCopy.deleteArchivedTitle || "Supprimer l'archive"}
                              aria-label={panelCopy.deleteArchivedTitle || "Supprimer l'archive"}
                            >
                              <Icon
                                icon={deletingId === secret.id ? "mdi:loading" : "mdi:trash-can-outline"}
                                width={16}
                                height={16}
                                className={deletingId === secret.id ? styles.spinning : undefined}
                                aria-hidden
                              />
                            </button>
                          )}
                        </div>
                      );
                    })()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

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
  const common = useCommonCopy();
  const [title, setTitle] = useState("");
  const [login, setLogin] = useState("");
  const [secret, setSecret] = useState("");
  const [showSecret, setShowSecret] = useState(false);
  const [expiresInDays, setExpiresInDays] = useState("7");
  const [maxViews, setMaxViews] = useState("5");
  const [saving, setSaving] = useState(false);
  const handleGenerate = () => {
    setSecret(generateVaultPassword(16));
    setShowSecret(true);
  };
  const handleSave = async () => {
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
        description: "",
        login: login.trim(),
        secret: secret.trim(),
        expiresInDays: Math.max(1, Number(expiresInDays) || 7),
        maxViews: Math.max(1, Number(maxViews) || 5)
      });
      onCreated(created);
    } catch (err) {
      toast.error(err.message || toastCopy.shareError);
    } finally {
      setSaving(false);
    }
  };
  return createPortal(
    <div className={formStyles.overlay} onClick={saving ? undefined : onClose} role="presentation">
      <div
        className={formStyles.shell}
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="vault-share-secret-title"
      >
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
            </div>
          </div>
          <UiKitButton
            type="button"
            square
            variant="secondary"
            className={formStyles.closeBtn}
            onClick={onClose}
            disabled={saving}
            aria-label={modalCopy.close || common.close}
            icon="mdi:close"
          />
        </header>

        <div className={formStyles.bodySingle}>
          <div className={formStyles.content}>
            <div className={kit.contentFadeUp}>
              <div className={styles.shareSectionFill}>
                <div className={`${formStyles.sectionHead} ${formStyles.sectionPinned}`}>
                  <h3 className={formStyles.sectionTitle}>{modalCopy.title}</h3>
                </div>
                <div className={styles.shareForm}>
                  <div className={formStyles.field}>
                    <label className={`${formStyles.label} ${formStyles.labelRequired}`} htmlFor="vault-secret-title">
                      {modalCopy.titleLabel}
                    </label>
                    <input
                      id="vault-secret-title"
                      className={formStyles.input}
                      value={title}
                      onChange={e => setTitle(e.target.value)}
                      placeholder={modalCopy.titlePlaceholder}
                      maxLength={200}
                      disabled={saving}
                      autoFocus
                    />
                  </div>
                  <div className={formStyles.field}>
                    <label className={formStyles.label} htmlFor="vault-secret-login">
                      {modalCopy.loginLabel}
                    </label>
                    <input
                      id="vault-secret-login"
                      className={formStyles.input}
                      value={login}
                      onChange={e => setLogin(e.target.value)}
                      placeholder={modalCopy.loginPlaceholder}
                      maxLength={320}
                      disabled={saving}
                      autoComplete="off"
                    />
                  </div>
                  <div className={formStyles.field}>
                    <label className={`${formStyles.label} ${formStyles.labelRequired}`} htmlFor="vault-secret-value">
                      {modalCopy.secretLabel}
                    </label>
                    <div className={styles.secretInputRow}>
                      <input
                        id="vault-secret-value"
                        className={formStyles.input}
                        type={showSecret ? "text" : "password"}
                        value={secret}
                        onChange={e => setSecret(e.target.value)}
                        placeholder={modalCopy.secretPlaceholder}
                        maxLength={4000}
                        disabled={saving}
                        autoComplete="new-password"
                      />
                      <UiKitButton
                        type="button"
                        square
                        variant="secondary"
                        onClick={() => setShowSecret(prev => !prev)}
                        disabled={saving}
                        title={showSecret ? modalCopy.hide : modalCopy.show}
                        aria-label={showSecret ? modalCopy.hide : modalCopy.show}
                        icon={showSecret ? "mdi:eye-off-outline" : "mdi:eye-outline"}
                      />
                      <UiKitButton
                        type="button"
                        variant="secondary"
                        onClick={handleGenerate}
                        disabled={saving}
                        icon="mdi:dice-multiple-outline"
                      >
                        {modalCopy.generate}
                      </UiKitButton>
                    </div>
                  </div>
                  <div className={formStyles.field}>
                    <label className={formStyles.label} htmlFor="vault-secret-expires">
                      {modalCopy.expiresLabel}
                    </label>
                    <NumberStepperInput
                      id="vault-secret-expires"
                      min={1}
                      max={90}
                      inputClassName={formStyles.input}
                      value={expiresInDays}
                      onChange={setExpiresInDays}
                      increaseAriaLabel={stepperCopy.increase}
                      decreaseAriaLabel={stepperCopy.decrease}
                    />
                  </div>
                  <div className={formStyles.field}>
                    <label className={formStyles.label} htmlFor="vault-secret-views">
                      {modalCopy.maxViewsLabel}
                    </label>
                    <NumberStepperInput
                      id="vault-secret-views"
                      min={1}
                      max={100}
                      inputClassName={formStyles.input}
                      value={maxViews}
                      onChange={setMaxViews}
                      increaseAriaLabel={stepperCopy.increase}
                      decreaseAriaLabel={stepperCopy.decrease}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <footer className={formStyles.footer}>
          <span className={formStyles.footerHint} />
          <div className={formStyles.footerActions}>
            <UiKitButton type="button" variant="secondary" onClick={onClose} disabled={saving}>
              {modalCopy.cancel || common.cancel}
            </UiKitButton>
            <UiKitButton
              type="button"
              variant="primary"
              onClick={handleSave}
              disabled={saving || !secret.trim() || !title.trim()}
              icon={saving ? "mdi:loading" : "mdi:share-variant-outline"}
            >
              {saving ? modalCopy.sharing : modalCopy.share}
            </UiKitButton>
          </div>
        </footer>
      </div>
    </div>,
    document.getElementById("modal-root") || document.body
  );
}
