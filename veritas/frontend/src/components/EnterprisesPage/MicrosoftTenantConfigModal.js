import React, { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";
import {
  deleteClientOffice365Credentials,
  getClientOffice365Credentials,
  getClientSecretExpiration,
  saveClientOffice365Credentials,
  testClientOffice365Connection,
  testOffice365ConnectionWithCredentials,
  unwrapOffice365CredentialsList
} from "../../api/clientOffice365";
import { UiKitButton, uiKitLayoutsStyles as kit } from "../UiKit";
import { showError, showSuccess } from "../../utils/toast";
import ConfirmModal from "../Misc/ConfirmModal/ConfirmModal";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { useCommonCopy } from "../../hooks/useCommonCopy";
import { getEnterpriseConfigModalsCopy } from "./enterpriseConfigModalsI18n";
import { interpolate } from "../../i18n/translate";
import { GRAPH_API_PERMISSIONS } from "./microsoftTenantFormConfig";
import { formatMicrosoftTenantSummary, normalizeMicrosoftTenantCredentials } from "./microsoftTenantSolutionUtils";
import formStyles from "./EnterpriseFormModal.module.css";
import avStyles from "./AntivirusConfigModal.module.css";
import msStyles from "./MicrosoftTenantConfigModal.module.css";

const STORED_SECRET_MASK = "••••••••••••••••";
const EMPTY_FORM = {
  tenantId: "",
  clientIdAzure: "",
  clientSecret: "",
  secretKeyId: ""
};

export default function MicrosoftTenantConfigModal({
  client,
  onClose,
  onSaved,
  onViewTenant,
  initialEditingTenant = null
}) {
  const locale = useAppLocale();
  const configCopy = useMemo(() => getEnterpriseConfigModalsCopy(locale), [locale]);
  const common = useCommonCopy();
  const [loading, setLoading] = useState(() =>
    Boolean(initialEditingTenant?.id || initialEditingTenant?.tenantId)
  );
  const [saving, setSaving] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [credentials, setCredentials] = useState(null);
  const [existingCredentials, setExistingCredentials] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [secretExpiration, setSecretExpiration] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState(null);
  const [applicationDisplayName, setApplicationDisplayName] = useState(null);
  const [editingCredentialId, setEditingCredentialId] = useState(initialEditingTenant?.id || null);

  const configured = useMemo(
    () => Boolean(existingCredentials?.tenantId && existingCredentials?.clientIdAzure),
    [existingCredentials]
  );
  const summary = useMemo(() => formatMicrosoftTenantSummary(credentials, client), [credentials, client]);
  const isEditing = Boolean(existingCredentials?.id || editingCredentialId);

  const applyCredential = useCallback(async (normalized, clientId) => {
    setCredentials(normalized);
    setExistingCredentials(normalized);
    setEditingCredentialId(normalized?.id || null);
    setForm({
      tenantId: normalized?.tenantId || "",
      clientIdAzure: normalized?.clientIdAzure || "",
      clientSecret: "",
      secretKeyId: normalized?.secretKeyId || ""
    });
    if (!normalized?.id || !clientId) {
      setSecretExpiration(null);
      setConnectionStatus(null);
      setApplicationDisplayName(null);
      return;
    }
    try {
      const expirationResult = await getClientSecretExpiration(clientId, normalized.id);
      setSecretExpiration(expirationResult?.expirationDate || null);
    } catch {
      setSecretExpiration(null);
    }
    try {
      const testResult = await testClientOffice365Connection(clientId, normalized.id);
      setConnectionStatus("success");
      setApplicationDisplayName(testResult.applicationDisplayName || null);
    } catch {
      setConnectionStatus("error");
      setApplicationDisplayName(null);
    }
  }, []);

  const resetForm = useCallback(() => {
    setCredentials(null);
    setExistingCredentials(null);
    setEditingCredentialId(null);
    setForm(EMPTY_FORM);
    setSecretExpiration(null);
    setConnectionStatus(null);
    setApplicationDisplayName(null);
  }, []);

  const loadCredentials = useCallback(async () => {
    if (!client?.id) return;
    const targetId = initialEditingTenant?.id || editingCredentialId;
    if (!targetId && !initialEditingTenant?.tenantId) {
      resetForm();
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const result = await getClientOffice365Credentials(client.id);
      const list = unwrapOffice365CredentialsList(result);
      const match =
        list.find(item => targetId && String(item.id) === String(targetId)) ||
        list.find(
          item =>
            initialEditingTenant?.tenantId && item.tenantId === initialEditingTenant.tenantId
        ) ||
        null;
      if (match) {
        await applyCredential(normalizeMicrosoftTenantCredentials(match), client.id);
      } else {
        resetForm();
      }
    } catch (error) {
      console.error(error);
      showError("Impossible de charger le tenant Microsoft.");
    } finally {
      setLoading(false);
    }
  }, [
    applyCredential,
    client?.id,
    editingCredentialId,
    initialEditingTenant?.id,
    initialEditingTenant?.tenantId,
    resetForm
  ]);

  useEffect(() => {
    loadCredentials();
  }, [client?.id, initialEditingTenant?.id, initialEditingTenant?.tenantId]);

  const patchForm = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

  const handleTestConnection = async () => {
    if (!client?.id) return;
    setTestingConnection(true);
    try {
      let result;
      if (existingCredentials?.id && !form.clientSecret?.trim()) {
        result = await testClientOffice365Connection(client.id, existingCredentials.id);
      } else {
        const hasTenantId = form.tenantId?.trim();
        const hasClientIdAzure = form.clientIdAzure?.trim();
        const hasClientSecret = form.clientSecret?.trim();
        if (!hasTenantId || !hasClientIdAzure || !hasClientSecret) {
          showError("Saisissez le Tenant ID, le Client ID et le Client Secret pour tester.");
          return;
        }
        result = await testOffice365ConnectionWithCredentials({
          tenantId: form.tenantId.trim(),
          clientIdAzure: form.clientIdAzure.trim(),
          clientSecret: form.clientSecret.trim(),
          secretKeyId: form.secretKeyId?.trim() || null
        });
      }
      setConnectionStatus("success");
      setApplicationDisplayName(result.applicationDisplayName || null);
      showSuccess("Connexion Entra ID réussie.");
    } catch (error) {
      setConnectionStatus("error");
      setApplicationDisplayName(null);
      showError(error.message || "Échec du test de connexion.");
    } finally {
      setTestingConnection(false);
    }
  };

  const handleSave = async () => {
    if (!client?.id) return;
    const hasTenantId = form.tenantId?.trim();
    const hasClientIdAzure = form.clientIdAzure?.trim();
    if (!hasTenantId || !hasClientIdAzure) {
      showError("Saisissez au moins le Tenant ID et le Client ID.");
      return;
    }
    if (!existingCredentials && !form.clientSecret?.trim()) {
      showError("Le Client Secret est obligatoire pour la première configuration.");
      return;
    }
    setSaving(true);
    try {
      const saved = await saveClientOffice365Credentials(client.id, {
        id: existingCredentials?.id || editingCredentialId || undefined,
        tenantId: form.tenantId.trim(),
        clientIdAzure: form.clientIdAzure.trim(),
        clientSecret: form.clientSecret?.trim() || undefined,
        secretKeyId: form.secretKeyId?.trim() || null
      });
      const savedCredential =
        normalizeMicrosoftTenantCredentials(saved?.credentials) ||
        normalizeMicrosoftTenantCredentials({
          id: saved?.credentials?.id,
          tenantId: form.tenantId.trim(),
          clientIdAzure: form.clientIdAzure.trim(),
          secretKeyId: form.secretKeyId?.trim() || null,
          hasSecret: true
        });
      if (savedCredential) {
        await applyCredential(savedCredential, client.id);
      }
      showSuccess("Tenant Microsoft enregistré.");
      if (typeof onSaved === "function") await onSaved();
      onClose?.();
    } catch (error) {
      showError(error.message || "Impossible d'enregistrer le tenant.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!client?.id) return;
    setDeleting(true);
    try {
      await deleteClientOffice365Credentials(
        client.id,
        existingCredentials?.id || editingCredentialId || null
      );
      showSuccess("Tenant Microsoft supprimé.");
      setDeleteConfirmOpen(false);
      resetForm();
      if (typeof onSaved === "function") await onSaved();
      onClose?.();
    } catch (error) {
      showError(error.message || "Impossible de supprimer le tenant.");
    } finally {
      setDeleting(false);
    }
  };

  if (!client?.id) return null;

  return (
    <>
      {createPortal(
        <div
          className={formStyles.overlay}
          onClick={saving || testingConnection || deleting ? undefined : onClose}
          role="presentation"
        >
          <div
            className={formStyles.shell}
            onClick={e => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="microsoft-tenant-config-modal-title"
          >
            <div className={formStyles.accentBar} aria-hidden />
            <header className={formStyles.header}>
              <div className={formStyles.headerMain}>
                <div
                  className={`${formStyles.headerIconWrap} ${msStyles.headerIconMicrosoft}`}
                  aria-hidden
                >
                  <Icon icon="hugeicons:office-365" />
                </div>
                <div className={formStyles.headerText}>
                  <p className={formStyles.eyebrow}>Services</p>
                  <h2 className={formStyles.title} id="microsoft-tenant-config-modal-title">
                    {isEditing ? "Modifier le tenant Microsoft" : "Ajouter un tenant Microsoft"}
                  </h2>
                </div>
              </div>
              <UiKitButton
                type="button"
                square
                variant="secondary"
                className={formStyles.closeBtn}
                onClick={onClose}
                disabled={saving || deleting}
                aria-label={common.close || "Fermer"}
                icon="mdi:close"
              />
            </header>

            <div className={formStyles.bodySingle}>
              <div className={formStyles.content}>
                {loading ? (
                  <div className={avStyles.loadingBlock} role="status" aria-live="polite">
                    <span className={avStyles.loadingBlockIcon} aria-hidden>
                      <Icon icon="mdi:loading" className={formStyles.spinning} />
                    </span>
                    <p className={avStyles.loadingBlockText}>Chargement du tenant Microsoft…</p>
                  </div>
                ) : (
                  <div className={kit.contentFadeUp} key={editingCredentialId || "new"}>
                    <div className={formStyles.sectionFill}>
                      <div className={`${formStyles.sectionHead} ${formStyles.sectionPinned}`}>
                        <h3 className={formStyles.sectionTitle}>Identifiants Entra ID</h3>
                      </div>
                      <div className={formStyles.sectionScroll}>
                        <form
                          className={avStyles.dedicatedTenantForm}
                          autoComplete="off"
                          onSubmit={e => e.preventDefault()}
                        >
                          <div className={formStyles.fieldGrid2}>
                            <div className={`${formStyles.field} ${formStyles.fieldFull}`}>
                              <label
                                className={`${formStyles.label} ${formStyles.labelRequired}`}
                                htmlFor="ms-tenant-id"
                              >
                                Tenant ID
                              </label>
                              <input
                                id="ms-tenant-id"
                                type="text"
                                className={formStyles.input}
                                value={form.tenantId}
                                onChange={e => patchForm("tenantId", e.target.value)}
                                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                                autoComplete="off"
                                autoFocus
                              />
                            </div>
                            <div className={`${formStyles.field} ${formStyles.fieldFull}`}>
                              <label
                                className={`${formStyles.label} ${formStyles.labelRequired}`}
                                htmlFor="ms-client-id"
                              >
                                Client ID (Application ID)
                              </label>
                              <input
                                id="ms-client-id"
                                type="text"
                                className={formStyles.input}
                                value={form.clientIdAzure}
                                onChange={e => patchForm("clientIdAzure", e.target.value)}
                                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                                autoComplete="off"
                              />
                            </div>
                            <div className={formStyles.field}>
                              <label className={formStyles.label} htmlFor="ms-secret-key-id">
                                Secret ID (optionnel)
                              </label>
                              <input
                                id="ms-secret-key-id"
                                type="text"
                                className={formStyles.input}
                                value={form.secretKeyId}
                                onChange={e => patchForm("secretKeyId", e.target.value)}
                                placeholder="Identifiant du secret (Key ID)"
                                autoComplete="off"
                              />
                            </div>
                            <div className={formStyles.field}>
                              <label
                                className={`${formStyles.label} ${
                                  existingCredentials ? "" : formStyles.labelRequired
                                }`}
                                htmlFor="ms-client-secret"
                              >
                                Client Secret
                              </label>
                              <input
                                id="ms-client-secret"
                                type="password"
                                className={formStyles.input}
                                value={form.clientSecret}
                                onChange={e => patchForm("clientSecret", e.target.value)}
                                placeholder={
                                  existingCredentials
                                    ? `${STORED_SECRET_MASK} (inchangé si vide)`
                                    : "Valeur du client secret"
                                }
                                autoComplete="new-password"
                              />
                            </div>
                          </div>

                          {(connectionStatus || secretExpiration || applicationDisplayName) && (
                            <div className={avStyles.inlineActions}>
                              {connectionStatus ? (
                                <span
                                  className={`${avStyles.connectionOk} ${
                                    connectionStatus === "error" ? avStyles.connectionError : ""
                                  }`}
                                >
                                  {connectionStatus === "success"
                                    ? `Connecté${
                                        applicationDisplayName
                                          ? ` (${applicationDisplayName})`
                                          : ""
                                      }`
                                    : "Erreur de connexion"}
                                </span>
                              ) : null}
                              {secretExpiration ? (
                                <span className={formStyles.footerHint}>
                                  Secret expire le{" "}
                                  {new Date(secretExpiration).toLocaleDateString("fr-FR")}
                                </span>
                              ) : null}
                            </div>
                          )}

                          <div className={msStyles.permissionsBlock}>
                            <h4 className={msStyles.permissionsTitle}>
                              <Icon icon="mdi:shield-key-outline" aria-hidden />
                              Permissions Microsoft Graph (Application)
                            </h4>
                            <p className={msStyles.permissionsHint}>
                              Ajoutez ces permissions <strong>Application</strong> sur l’app Entra
                              ID, puis validez le consentement administrateur.
                            </p>
                            <ul className={msStyles.permissionsList}>
                              {GRAPH_API_PERMISSIONS.map(permission => (
                                <li key={permission}>
                                  <code>{permission}</code>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </form>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <footer className={formStyles.footer}>
              <span className={formStyles.footerHint}>
                {configured
                  ? "Tenant dédié configuré"
                  : "Saisissez les identifiants de l’application Entra ID"}
              </span>
              <div className={formStyles.footerActions}>
                {isEditing ? (
                  <UiKitButton
                    type="button"
                    variant="ghost"
                    className={formStyles.footerDeleteBtn}
                    onClick={() => setDeleteConfirmOpen(true)}
                    disabled={saving || deleting || testingConnection || loading}
                    icon="mdi:delete-outline"
                  >
                    Supprimer
                  </UiKitButton>
                ) : null}
                {isEditing && onViewTenant && credentials ? (
                  <UiKitButton
                    type="button"
                    variant="secondary"
                    onClick={() => onViewTenant(credentials)}
                    disabled={saving || deleting || loading}
                    icon="mdi:chart-box-outline"
                  >
                    Statistiques
                  </UiKitButton>
                ) : null}
                <UiKitButton
                  type="button"
                  variant="secondary"
                  onClick={handleTestConnection}
                  disabled={testingConnection || saving || deleting || loading}
                  icon={testingConnection ? "mdi:loading" : "mdi:lan-check"}
                >
                  Tester la connexion
                </UiKitButton>
                <UiKitButton
                  type="button"
                  variant="primary"
                  onClick={handleSave}
                  disabled={saving || testingConnection || deleting || loading}
                  icon={saving ? "mdi:loading" : "mdi:content-save-outline"}
                >
                  {saving ? "Enregistrement…" : "Enregistrer"}
                </UiKitButton>
              </div>
            </footer>
          </div>
        </div>,
        document.getElementById("modal-root") || document.body
      )}
      <ConfirmModal
        open={deleteConfirmOpen}
        title={configCopy.confirm.deleteMicrosoftTenant.title}
        message={interpolate(configCopy.confirm.deleteMicrosoftTenant.message, {
          label: summary.label
        })}
        confirmLabel={common.delete}
        variant="danger"
        icon="mdi:delete-outline"
        loading={deleting}
        onConfirm={handleDelete}
        onClose={() => setDeleteConfirmOpen(false)}
      />
    </>
  );
}
