import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Icon as IconifyIcon } from "@iconify/react";
import styles from "./MicrosoftTenantStep.module.css";
import { getClientOffice365Credentials, getClientSecretExpiration, saveClientOffice365Credentials, testClientOffice365Connection, testOffice365ConnectionWithCredentials } from "../../api/clientOffice365";
import { showError, showSuccess } from "../../utils/toast";
const GRAPH_API_PERMISSIONS = ["AuditLog.Read.All", "Application.Read.All", "AppRoleAssignment.ReadWrite.All", "Channel.ReadBasic.All", "ChannelMember.Read.All", "Directory.Read.All", "Files.Read.All", "IdentityRiskEvent.Read.All", "MailboxSettings.Read", "Organization.Read.All", "Policy.Read.All", "Reports.Read.All", "SecurityEvents.Read.All", "ServiceHealth.Read.All", "ServiceMessage.Read.All", "Sites.Read.All", "Team.ReadBasic.All", "TeamMember.Read.All", "ThreatAssessment.Read.All", "User.Read.All", "User.ReadBasic.All", "UserAuthenticationMethod.Read.All"];
export default function MicrosoftTenantStep({
  client,
  onBack,
  onSaved
}) {
  const [credentials, setCredentials] = useState({
    tenantId: "",
    clientIdAzure: "",
    clientSecret: "",
    secretKeyId: ""
  });
  const [existingCredentials, setExistingCredentials] = useState(null);
  const [secretExpiration, setSecretExpiration] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState(null);
  const [applicationDisplayName, setApplicationDisplayName] = useState(null);
  const [loadingCredentials, setLoadingCredentials] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showPermissions, setShowPermissions] = useState(false);
  const hasInputCredentials = Boolean(credentials.tenantId && credentials.clientIdAzure && credentials.clientSecret);
  useEffect(() => {
    if (!client?.id) return;
    loadCredentials();
  }, [client?.id]);
  const resetCredentialsState = () => {
    setExistingCredentials(null);
    setCredentials({
      tenantId: "",
      clientIdAzure: "",
      clientSecret: "",
      secretKeyId: ""
    });
    setSecretExpiration(null);
    setConnectionStatus(null);
    setApplicationDisplayName(null);
  };
  const loadCredentials = async () => {
    if (!client?.id) return;
    setLoadingCredentials(true);
    try {
      const result = await getClientOffice365Credentials(client.id);
      if (result.success && result.credentials) {
        setExistingCredentials(result.credentials);
        setCredentials({
          tenantId: result.credentials.tenantId || "",
          clientIdAzure: result.credentials.clientIdAzure || "",
          clientSecret: "",
          secretKeyId: result.credentials.secretKeyId || ""
        });
        try {
          const expirationResult = await getClientSecretExpiration(client.id);
          if (expirationResult.success && expirationResult.expirationDate) {
            setSecretExpiration(expirationResult.expirationDate);
          } else {
            setSecretExpiration(null);
          }
        } catch {
          setSecretExpiration(null);
        }
        try {
          const testResult = await testClientOffice365Connection(client.id);
          setConnectionStatus("success");
          setApplicationDisplayName(testResult.applicationDisplayName || null);
        } catch {
          setConnectionStatus("error");
          setApplicationDisplayName(null);
        }
      } else {
        resetCredentialsState();
      }
    } catch (error) {
      console.error(error);
      resetCredentialsState();
    } finally {
      setLoadingCredentials(false);
    }
  };
  const handleTestConnection = async () => {
    if (!client?.id) {
      showError("Client introuvable.");
      return;
    }
    setTestingConnection(true);
    try {
      let result;
      if (existingCredentials) {
        result = await testClientOffice365Connection(client.id);
      } else {
        const hasTenantId = credentials.tenantId && credentials.tenantId.trim() !== "";
        const hasClientIdAzure = credentials.clientIdAzure && credentials.clientIdAzure.trim() !== "";
        const hasClientSecret = credentials.clientSecret && credentials.clientSecret.trim() !== "";
        if (!hasTenantId || !hasClientIdAzure || !hasClientSecret) {
          setTestingConnection(false);
          showError("Enter Tenant ID, Client ID and Client Secret to test.");
          return;
        }
        const testCredentials = {
          tenantId: credentials.tenantId,
          clientIdAzure: credentials.clientIdAzure,
          clientSecret: credentials.clientSecret,
          secretKeyId: credentials.secretKeyId || null
        };
        result = await testOffice365ConnectionWithCredentials(testCredentials);
      }
      setConnectionStatus("success");
      setApplicationDisplayName(result.applicationDisplayName || null);
      showSuccess("Azure connection successful.");
    } catch (error) {
      setConnectionStatus("error");
      setApplicationDisplayName(null);
      showError(error.message || "Connection test failed.");
    } finally {
      setTestingConnection(false);
    }
  };
  const handleSave = async () => {
    if (!client?.id) {
      showError("Client introuvable.");
      return;
    }
    const hasTenantId = credentials.tenantId && credentials.tenantId.trim() !== "";
    const hasClientIdAzure = credentials.clientIdAzure && credentials.clientIdAzure.trim() !== "";
    if (!hasTenantId || !hasClientIdAzure) {
      showError("Enter at least Tenant ID and Client ID.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        tenantId: credentials.tenantId,
        clientIdAzure: credentials.clientIdAzure,
        clientSecret: credentials.clientSecret || undefined,
        secretKeyId: credentials.secretKeyId || null
      };
      await saveClientOffice365Credentials(client.id, payload);
      showSuccess("Microsoft tenant saved successfully.");
      if (typeof onSaved === "function") onSaved();
    } catch (error) {
      console.error(error);
      showError(error.message || "Error saving the tenant.");
    } finally {
      setSaving(false);
    }
  };
  return <motion.div className={styles.stepContainer} initial={{
    opacity: 0,
    y: 20
  }} animate={{
    opacity: 1,
    y: 0
  }} transition={{
    duration: 0.4,
    ease: "circOut"
  }}>
      <div className={styles.header}>
        <div className={styles.headerTitle}>
          <div className={styles.headerMain}>
            <IconifyIcon icon="mdi:microsoft-azure" className={styles.headerIcon} />
          </div>
        </div>
      </div>

      {loadingCredentials ? <div className={styles.loadingBlock}>
          <IconifyIcon icon="mdi:loading" className={styles.loadingIcon} />
          <span>Loading tenant information...</span>
        </div> : <div className={styles.body}>
          <div className={styles.infoBox}>
            <IconifyIcon icon="mdi:information-outline" className={styles.infoIcon} />
            <div>
              <button type="button" className={styles.permissionsButton} onClick={() => setShowPermissions(v => !v)}>
                View required Graph API permissions
              </button>
              {showPermissions && <div className={styles.permissionsPopover}>
                  <strong>Required Graph API permissions:</strong>
                  <ul>
                    {GRAPH_API_PERMISSIONS.map(perm => <li key={perm}>{perm}</li>)}
                  </ul>
                </div>}
            </div>
          </div>

          <div className={styles.formGrid}>
            <div className={styles.formField}>
              <label>Tenant ID</label>
              <input type="text" value={credentials.tenantId} onChange={e => setCredentials({
            ...credentials,
            tenantId: e.target.value
          })} placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" />
            </div>
            <div className={styles.formField}>
              <label>Client ID (Application ID)</label>
              <input type="text" value={credentials.clientIdAzure} onChange={e => setCredentials({
            ...credentials,
            clientIdAzure: e.target.value
          })} placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" />
            </div>
            <div className={styles.formField}>
              <label>Secret ID (optional)</label>
              <input type="text" value={credentials.secretKeyId} onChange={e => setCredentials({
            ...credentials,
            secretKeyId: e.target.value
          })} placeholder="Stored secret identifier (Key ID)" />
            </div>
            <div className={styles.formField}>
              <label>Client Secret</label>
              <input type="password" value={credentials.clientSecret} onChange={e => setCredentials({
            ...credentials,
            clientSecret: e.target.value
          })} placeholder={existingCredentials ? "•••••••••••• (unchanged if empty)" : ""} />
            </div>
          </div>

          {(connectionStatus || secretExpiration) && <div className={styles.statusRow}>
              {connectionStatus && <div className={styles.statusBadgeWrapper}>
                  {connectionStatus === "success" ? <span className={`${styles.statusBadge} ${styles.statusSuccess}`}>
                      Connected {applicationDisplayName ? `(${applicationDisplayName})` : ""}
                    </span> : <span className={`${styles.statusBadge} ${styles.statusError}`}>
                      Connection error
                    </span>}
                </div>}
              {secretExpiration && <span className={styles.secretExpiration}>
                  Secret expires on {new Date(secretExpiration).toLocaleDateString("en-GB")}
                </span>}
            </div>}

          <div className={styles.actionsRow}>
            <button type="button" className={styles.ghostButton} onClick={onBack} disabled={saving || testingConnection} title="Back">
              <IconifyIcon icon="mdi:chevron-left" />
            </button>
            <div className={styles.actionsRight}>
              <button type="button" className={styles.secondaryButton} onClick={handleTestConnection} disabled={testingConnection} title="Test connection">
                <IconifyIcon icon={testingConnection ? "mdi:loading" : "mdi:lan-check"} className={testingConnection ? styles.loadingIcon : ""} />
              </button>
              <button type="button" className={styles.primaryButton} onClick={handleSave} disabled={saving} title="Save">
                <IconifyIcon icon={saving ? "mdi:loading" : "mdi:check"} className={saving ? styles.loadingIcon : ""} />
              </button>
            </div>
          </div>
        </div>}
    </motion.div>;
}
