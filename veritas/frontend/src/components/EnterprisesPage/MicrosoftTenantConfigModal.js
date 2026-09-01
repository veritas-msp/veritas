import React, { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";
import { FaTimes } from "react-icons/fa";
import { deleteClientOffice365Credentials, getClientOffice365Credentials, getClientSecretExpiration, saveClientOffice365Credentials, testClientOffice365Connection, testOffice365ConnectionWithCredentials, unwrapOffice365CredentialsList } from "../../api/clientOffice365";
import { showError, showSuccess } from "../../utils/toast";
import ConfirmModal from "../Misc/ConfirmModal/ConfirmModal";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { useCommonCopy } from "../../hooks/useCommonCopy";
import { getEnterpriseConfigModalsCopy } from "./enterpriseConfigModalsI18n";
import { interpolate } from "../../i18n/translate";
import { buildMicrosoftTenantNavSections } from "./microsoftTenantFormConfig";
import { formatMicrosoftTenantSummary, normalizeMicrosoftTenantCredentials } from "./microsoftTenantSolutionUtils";
import formStyles from "./EnterpriseFormModal.module.css";
import avStyles from "./AntivirusConfigModal.module.css";
import msStyles from "./MicrosoftTenantConfigModal.module.css";
import integrationStyles from "../AdminPage/BitdefenderIntegrationModal.module.css";
import EntraApiGuide from "./integrationGuides/EntraApiGuide";
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
  initialSection = "overview",
  initialEditingTenant = null
}) {
  const locale = useAppLocale();
  const configCopy = useMemo(() => getEnterpriseConfigModalsCopy(locale), [locale]);
  const common = useCommonCopy();
  const [activeSection, setActiveSection] = useState(initialSection);
  const [loading, setLoading] = useState(() => Boolean(initialEditingTenant?.id || initialEditingTenant?.tenantId));
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
  const configured = useMemo(() => Boolean(existingCredentials?.tenantId && existingCredentials?.clientIdAzure), [existingCredentials]);
  const navSections = useMemo(() => buildMicrosoftTenantNavSections({
    configured
  }), [configured]);
  const summary = useMemo(() => formatMicrosoftTenantSummary(credentials, client), [credentials, client]);
  const sectionBadges = useMemo(() => ({
    overview: configured,
    configuration: configured
  }), [configured]);
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
      const match = list.find(item => targetId && String(item.id) === String(targetId))
        || list.find(item => initialEditingTenant?.tenantId && item.tenantId === initialEditingTenant.tenantId)
        || null;
      if (match) {
        await applyCredential(normalizeMicrosoftTenantCredentials(match), client.id);
      } else {
        resetForm();
      }
    } catch (error) {
      console.error(error);
      showError("Unable to load the Microsoft tenant.");
    } finally {
      setLoading(false);
    }
  }, [applyCredential, client?.id, editingCredentialId, initialEditingTenant?.id, initialEditingTenant?.tenantId, resetForm]);
  useEffect(() => {
    loadCredentials();
  }, [client?.id, initialEditingTenant?.id, initialEditingTenant?.tenantId]);
  useEffect(() => {
    setActiveSection(initialSection);
  }, [initialSection, client?.id, initialEditingTenant?.id]);
  const handleTestConnection = async () => {
    if (!client?.id) return;
    setTestingConnection(true);
    try {
      let result;
      if (existingCredentials?.id) {
        result = await testClientOffice365Connection(client.id, existingCredentials.id);
      } else {
        const hasTenantId = form.tenantId?.trim();
        const hasClientIdAzure = form.clientIdAzure?.trim();
        const hasClientSecret = form.clientSecret?.trim();
        if (!hasTenantId || !hasClientIdAzure || !hasClientSecret) {
          showError("Enter the Tenant ID, Client ID, and Client Secret to test.");
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
      showSuccess("Entra ID connection successful.");
    } catch (error) {
      setConnectionStatus("error");
      setApplicationDisplayName(null);
      showError(error.message || "Connection test failed.");
    } finally {
      setTestingConnection(false);
    }
  };
  const handleSave = async () => {
    if (!client?.id) return;
    const hasTenantId = form.tenantId?.trim();
    const hasClientIdAzure = form.clientIdAzure?.trim();
    if (!hasTenantId || !hasClientIdAzure) {
      showError("Enter at least the Tenant ID and Client ID.");
      return;
    }
    if (!existingCredentials && !form.clientSecret?.trim()) {
      showError("The Client Secret is required for the initial setup.");
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
      const savedCredential = normalizeMicrosoftTenantCredentials(saved?.credentials) || normalizeMicrosoftTenantCredentials({
        id: saved?.credentials?.id,
        tenantId: form.tenantId.trim(),
        clientIdAzure: form.clientIdAzure.trim(),
        secretKeyId: form.secretKeyId?.trim() || null,
        hasSecret: true
      });
      if (savedCredential) {
        await applyCredential(savedCredential, client.id);
      }
      showSuccess("Microsoft tenant saved.");
      if (typeof onSaved === "function") await onSaved();
      setActiveSection("overview");
    } catch (error) {
      showError(error.message || "Unable to save the tenant.");
    } finally {
      setSaving(false);
    }
  };
  const handleDelete = async () => {
    if (!client?.id) return;
    setDeleting(true);
    try {
      await deleteClientOffice365Credentials(client.id, existingCredentials?.id || editingCredentialId || null);
      showSuccess("Microsoft tenant deleted.");
      setDeleteConfirmOpen(false);
      resetForm();
      if (typeof onSaved === "function") await onSaved();
    } catch (error) {
      showError(error.message || "Unable to delete the tenant.");
    } finally {
      setDeleting(false);
    }
  };
  const renderOverview = () => <>
      <div className={formStyles.sectionHead}>
        <h3 className={formStyles.sectionTitle}>Tenant Microsoft 365</h3>
        <p className={formStyles.sectionDesc}>
          A client can have several dedicated Entra ID tenants. Statistics (users,
          licenses, Exchange, Teams, security…) open in a new Veritas tab.
        </p>
      </div>

      {!configured ? <div className={avStyles.emptyState}>
          No tenant configured for this client.
          <button type="button" className={formStyles.ghostBtn} onClick={() => setActiveSection("configuration")} style={{
        marginTop: "0.75rem"
      }}>
            Configure a dedicated tenant
          </button>
        </div> : <div className={avStyles.solutionList}>
          <div className={avStyles.solutionCard}>
            <div className={`${avStyles.solutionCardIcon} ${msStyles.headerIconMicrosoft}`}>
              <Icon icon="hugeicons:office-365" aria-hidden />
            </div>
            <div className={avStyles.solutionCardMain}>
              <div className={avStyles.solutionName} title={summary.label}>
                {summary.label}
              </div>
              <div className={avStyles.solutionMeta}>
                {summary.providerName}
                {" · "}
                {summary.mode}
                {summary.tenantId ? ` · ${summary.shortTenantId}` : ""}
              </div>
              {connectionStatus === "success" && applicationDisplayName ? <div className={avStyles.solutionMeta}>
                  Application: {applicationDisplayName}
                </div> : null}
              {secretExpiration ? <div className={avStyles.solutionMeta}>
                  Secret expires on{" "}
                  {new Date(secretExpiration).toLocaleDateString("en-GB")}
                </div> : null}
            </div>
            <div className={avStyles.solutionCardButtons}>
              {onViewTenant ? <button type="button" className={avStyles.solutionIconBtn} onClick={() => onViewTenant(credentials)} disabled={deleting} aria-label="View statistics" title="View statistics">
                  <Icon icon="mdi:chart-box-outline" aria-hidden />
                </button> : null}
              <button type="button" className={avStyles.solutionIconBtn} onClick={() => setActiveSection("configuration")} disabled={deleting} aria-label="Edit tenant" title="Edit">
                <Icon icon="mdi:pencil-outline" aria-hidden />
              </button>
              <button type="button" className={`${avStyles.solutionIconBtn} ${avStyles.solutionIconBtnDanger}`} onClick={() => setDeleteConfirmOpen(true)} disabled={deleting} aria-label="Delete tenant" title="Delete">
                <Icon icon={deleting ? "mdi:loading" : "mdi:delete-outline"} className={deleting ? formStyles.spinning : ""} aria-hidden />
              </button>
            </div>
          </div>
        </div>}
    </>;
  const renderConfiguration = () => <>
      <div className={formStyles.sectionHead}>
        <h3 className={formStyles.sectionTitle}>Dedicated tenant · Entra ID</h3>
        <p className={formStyles.sectionDesc}>
          Enter the credentials for the application registered on the client&apos;s tenant.
          No global integration is used: each company has its own
          credentials.
        </p>
      </div>

      <div className={avStyles.notice}>
        <Icon icon="mdi:information-outline" className={avStyles.noticeIcon} aria-hidden />
        <div>
          <strong>Initial setup</strong>
          Create the application in Entra ID using the guide, then test the connection before
          saving.
        </div>
      </div>

      <form className={avStyles.dedicatedTenantForm} autoComplete="off" onSubmit={e => e.preventDefault()}>
        <div className={formStyles.field}>
          <label className={formStyles.label} htmlFor="ms-tenant-id">
            Tenant ID
          </label>
          <input id="ms-tenant-id" type="text" className={formStyles.input} value={form.tenantId} onChange={e => setForm({
          ...form,
          tenantId: e.target.value
        })} placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" autoComplete="off" />
        </div>
        <div className={formStyles.field}>
          <label className={formStyles.label} htmlFor="ms-client-id">
            Client ID (Application ID)
          </label>
          <input id="ms-client-id" type="text" className={formStyles.input} value={form.clientIdAzure} onChange={e => setForm({
          ...form,
          clientIdAzure: e.target.value
        })} placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" autoComplete="off" />
        </div>
        <div className={formStyles.field}>
          <label className={formStyles.label} htmlFor="ms-secret-key-id">
            Secret ID (optional)
          </label>
          <input id="ms-secret-key-id" type="text" className={formStyles.input} value={form.secretKeyId} onChange={e => setForm({
          ...form,
          secretKeyId: e.target.value
        })} placeholder="Secret identifier (Key ID)" autoComplete="off" />
        </div>
        <div className={formStyles.field}>
          <label className={formStyles.label} htmlFor="ms-client-secret">
            Client Secret
          </label>
          <input id="ms-client-secret" type="password" className={formStyles.input} value={form.clientSecret} onChange={e => setForm({
          ...form,
          clientSecret: e.target.value
        })} placeholder={existingCredentials ? `${STORED_SECRET_MASK} (unchanged if empty)` : "Client secret value"} autoComplete="new-password" />
          <button type="button" className={integrationStyles.guideLinkBtn} onClick={() => setActiveSection("guide")}>
            <Icon icon="mdi:help-circle-outline" aria-hidden />
            How do I create the application in Entra ID?
          </button>
        </div>
      </form>

      {(connectionStatus || secretExpiration) && <div className={avStyles.inlineActions}>
          {connectionStatus ? <span className={`${avStyles.connectionOk} ${connectionStatus === "error" ? avStyles.connectionError : ""}`}>
              {connectionStatus === "success" ? `Connected${applicationDisplayName ? ` (${applicationDisplayName})` : ""}` : "Connection error"}
            </span> : null}
          {secretExpiration ? <span className={formStyles.footerHint}>
              Secret expires on {new Date(secretExpiration).toLocaleDateString("en-GB")}
            </span> : null}
        </div>}
    </>;
  const renderSectionContent = () => {
    if (loading) {
      return <div className={avStyles.loadingBlock}>
          <Icon icon="mdi:loading" className={formStyles.spinning} aria-hidden />
          Loading Microsoft tenant…
        </div>;
    }
    switch (activeSection) {
      case "configuration":
        return renderConfiguration();
      case "guide":
        return <EntraApiGuide />;
      default:
        return renderOverview();
    }
  };
  const showConfigurationActions = activeSection === "configuration";
  if (!client?.id) return null;
  return <>
      {createPortal(<div className={formStyles.overlay} onClick={saving || testingConnection || deleting ? undefined : onClose} role="presentation">
          <div className={formStyles.shell} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="microsoft-tenant-config-modal-title">
            <div className={formStyles.accentBar} aria-hidden />
            <header className={formStyles.header}>
              <div className={formStyles.headerMain}>
                <div className={`${formStyles.headerIconWrap} ${msStyles.headerIconMicrosoft}`} aria-hidden>
                  <Icon icon="hugeicons:office-365" />
                </div>
                <div className={formStyles.headerText}>
                  <p className={formStyles.eyebrow}>Services</p>
                  <h2 className={formStyles.title} id="microsoft-tenant-config-modal-title">
                    Tenant Microsoft
                  </h2>
                  <p className={formStyles.subtitle}>{client.name}</p>
                </div>
              </div>
              <button type="button" className={formStyles.closeBtn} onClick={onClose} disabled={saving || deleting} aria-label="Close">
                <FaTimes />
              </button>
            </header>

            <div className={formStyles.body}>
              <nav className={formStyles.nav} aria-label="Microsoft tenant sections">
                {navSections.map(section => <button key={section.id} type="button" className={`${formStyles.navItem} ${activeSection === section.id ? formStyles.navItemActive : ""}`} onClick={() => setActiveSection(section.id)} aria-current={activeSection === section.id ? "step" : undefined}>
                    <Icon icon={section.icon} className={formStyles.navItemIcon} aria-hidden />
                    <span className={formStyles.navItemText}>
                      <span className={formStyles.navItemLabel}>{section.label}</span>
                      <span className={formStyles.navItemHint}>{section.description}</span>
                    </span>
                    {sectionBadges[section.id] ? <span className={formStyles.navBadge} aria-hidden>
                        ✓
                      </span> : null}
                  </button>)}
              </nav>

              <div className={formStyles.content}>{renderSectionContent()}</div>
            </div>

            <footer className={formStyles.footer}>
              <span className={formStyles.footerHint}>
                {configured ? "Dedicated tenant configured" : "No tenant configured"}
              </span>
              <div className={formStyles.footerActions}>
                {showConfigurationActions ? <>
                    <button type="button" className={formStyles.ghostBtn} onClick={handleTestConnection} disabled={testingConnection || saving}>
                      <Icon icon={testingConnection ? "mdi:loading" : "mdi:lan-check"} className={testingConnection ? formStyles.spinning : ""} aria-hidden />
                      Test connection
                    </button>
                    <button type="button" className={formStyles.primaryBtn} onClick={handleSave} disabled={saving || testingConnection}>
                      <Icon icon={saving ? "mdi:loading" : "mdi:content-save-outline"} className={saving ? formStyles.spinning : ""} aria-hidden />
                      {saving ? "Saving…" : "Save"}
                    </button>
                  </> : null}
              </div>
            </footer>
          </div>
        </div>, document.getElementById("modal-root") || document.body)}
      <ConfirmModal open={deleteConfirmOpen} title={configCopy.confirm.deleteMicrosoftTenant.title} message={interpolate(configCopy.confirm.deleteMicrosoftTenant.message, {
      label: summary.label
    })} confirmLabel={common.delete} variant="danger" icon="mdi:delete-outline" loading={deleting} onConfirm={handleDelete} onClose={() => setDeleteConfirmOpen(false)} />
    </>;
}
