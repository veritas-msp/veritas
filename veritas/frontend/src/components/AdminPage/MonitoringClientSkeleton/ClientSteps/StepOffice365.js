import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Icon as IconifyIcon } from "@iconify/react";
import styles from "./Form.module.css";
import { getClientOffice365Credentials, getClientSecretExpiration, testClientOffice365Connection, testOffice365ConnectionWithCredentials } from "../../../../api/clientOffice365";
import { showError, showSuccess } from "../../../../utils/toast";
const GRAPH_API_PERMISSIONS = ["AuditLog.Read.All", "Application.Read.All", "AppRoleAssignment.ReadWrite.All", "Channel.ReadBasic.All", "ChannelMember.Read.All", "Directory.Read.All", "Files.Read.All", "IdentityRiskEvent.Read.All", "MailboxSettings.Read", "Organization.Read.All", "Policy.Read.All", "Reports.Read.All", "SecurityEvents.Read.All", "ServiceHealth.Read.All", "ServiceMessage.Read.All", "Sites.Read.All", "Team.ReadBasic.All", "TeamMember.Read.All", "ThreatAssessment.Read.All", "User.Read.All", "User.ReadBasic.All", "UserAuthenticationMethod.Read.All"];
const StepOffice365 = ({
  form,
  setForm,
  initialClient
}) => {
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
  const hasInputCredentials = Boolean(credentials.tenantId && credentials.clientIdAzure && credentials.clientSecret);
  const permissionsTooltip = GRAPH_API_PERMISSIONS.join("\n");
  useEffect(() => {
    if (typeof setForm === "function") {
      const effectiveStatus = existingCredentials ? "success" : connectionStatus || null;
      const office365Data = {
        tenantId: credentials.tenantId,
        clientIdAzure: credentials.clientIdAzure,
        clientSecret: credentials.clientSecret,
        secretKeyId: credentials.secretKeyId,
        connectionStatus: effectiveStatus,
        applicationDisplayName: applicationDisplayName
      };
      setForm(prev => ({
        ...prev,
        office365_connection_status: effectiveStatus,
        office365_data: office365Data
      }));
    }
  }, [connectionStatus, existingCredentials, credentials, applicationDisplayName, setForm]);
  useEffect(() => {
    if (!form.modules_monitoring?.Office365 || !initialClient?.id) {
      resetCredentialsState();
      return;
    }
    loadCredentials();
  }, [form.modules_monitoring?.Office365, initialClient?.id]);
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
    if (typeof setForm === "function") {
      setForm(prev => ({
        ...prev,
        office365_connection_status: null
      }));
    }
  };
  const loadCredentials = async () => {
    if (!initialClient?.id) return;
    setLoadingCredentials(true);
    try {
      const result = await getClientOffice365Credentials(initialClient.id);
      if (result.success && result.credentials) {
        setExistingCredentials(result.credentials);
        setCredentials({
          tenantId: result.credentials.tenantId || "",
          clientIdAzure: result.credentials.clientIdAzure || "",
          clientSecret: "",
          secretKeyId: result.credentials.secretKeyId || ""
        });
        try {
          const expirationResult = await getClientSecretExpiration(initialClient.id);
          if (expirationResult.success && expirationResult.expirationDate) {
            setSecretExpiration(expirationResult.expirationDate);
          } else {
            setSecretExpiration(null);
          }
        } catch {
          setSecretExpiration(null);
        }
        try {
          const testResult = await testClientOffice365Connection(initialClient.id);
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
    if (!initialClient?.id) {
      showError("Client not found.");
      return;
    }
    setTestingConnection(true);
    try {
      let result;
      if (existingCredentials) {
        console.log('Test avec credentials existants en base');
        result = await testClientOffice365Connection(initialClient.id);
      } else {
        console.log('Test avec credentials du formulaire');
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
      <div style={{
      marginBottom: '1.5rem'
    }}>
        <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '0.75rem'
      }}>
          <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
            <span style={{
            fontWeight: 700,
            color: '#111827'
          }}>Microsoft Entra API connection</span>
            {connectionStatus === "success" && <span style={{
            padding: '0.15rem 0.5rem',
            background: '#ecfdf3',
            color: '#027a48',
            borderRadius: 999,
            fontSize: '0.75rem'
          }}>
                Connected {applicationDisplayName ? `(${applicationDisplayName})` : ""}
              </span>}
            {connectionStatus === "error" && <span style={{
            padding: '0.15rem 0.5rem',
            background: '#fef2f2',
            color: '#b91c1c',
            borderRadius: 999,
            fontSize: '0.75rem'
          }}>
                Connection error
              </span>}
          </div>
          {secretExpiration && <span style={{
          fontSize: '0.85rem',
          color: '#6b7280'
        }}>
              Secret expires on {new Date(secretExpiration).toLocaleDateString('en-US')}
            </span>}
        </div>

        {!form.modules_monitoring?.Office365 ? <div style={{
        padding: '1rem',
        border: '1px dashed #d1d5db',
        borderRadius: 10,
        background: '#f9fafb',
        color: '#6b7280'
      }}>
            Enable the Microsoft Entra module in the configuration wizard first.
          </div> : <div style={{
        border: '1px solid #e5e7eb',
        borderRadius: 10,
        padding: '1rem',
        background: '#ffffff',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem'
      }}>
            <div style={{
          background: '#f9fafb',
          border: '1px dashed #d1d5db',
          borderRadius: 10,
          padding: '0.9rem',
          color: '#1a1a1a',
          fontSize: '0.88rem',
          lineHeight: 1.5
        }}>
              <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.45rem',
            marginBottom: '0.35rem',
            color: '#111827'
          }}>
                <span style={{
              fontWeight: 700
            }}>Graph API permissions to grant</span>
                <span title={permissionsTooltip} style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 24,
              height: 24,
              borderRadius: '999px',
              background: '#e5f7f0',
              color: '#0f8f6b',
              cursor: 'help',
              border: '1px solid #c7eadf'
            }}>
                  <IconifyIcon icon="mdi:help-circle-outline" width={16} height={16} />
                </span>
              </div>
            </div>
            <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '0.75rem'
        }}>
              <div>
                <label style={{
              display: 'block',
              marginBottom: 6,
              fontWeight: 600,
              color: '#1a1a1a',
              fontSize: '0.85rem'
            }}>
                  Tenant ID *
                </label>
                <input type="text" value={credentials.tenantId} onChange={e => setCredentials(prev => ({
              ...prev,
              tenantId: e.target.value
            }))} placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" disabled={loadingCredentials} style={inputStyle} />
              </div>
              <div>
                <label style={{
              display: 'block',
              marginBottom: 6,
              fontWeight: 600,
              color: '#1a1a1a',
              fontSize: '0.85rem'
            }}>
                  Application ID *
                </label>
                <input type="text" value={credentials.clientIdAzure} onChange={e => setCredentials(prev => ({
              ...prev,
              clientIdAzure: e.target.value
            }))} placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" disabled={loadingCredentials} style={inputStyle} />
              </div>
              <div>
                <label style={{
              display: 'block',
              marginBottom: 6,
              fontWeight: 600,
              color: '#1a1a1a',
              fontSize: '0.85rem'
            }}>
                  Secret ID
                </label>
                <input type="text" value={existingCredentials && !credentials.secretKeyId ? "****************" : credentials.secretKeyId || ""} onChange={e => {
              if (e.target.value === "****************") return;
              setCredentials(prev => ({
                ...prev,
                secretKeyId: e.target.value
              }));
            }} onFocus={e => {
              if (e.target.value === "****************") {
                e.target.value = "";
                setCredentials(prev => ({
                  ...prev,
                  secretKeyId: ""
                }));
              }
            }} placeholder="Optional" disabled={loadingCredentials} style={inputStyle} />
              </div>
              <div>
                <label style={{
              display: 'block',
              marginBottom: 6,
              fontWeight: 600,
              color: '#1a1a1a',
              fontSize: '0.85rem'
            }}>
                  Secret value (client secret) *
                </label>
                <input type="password" value={existingCredentials && !credentials.clientSecret ? "****************" : credentials.clientSecret} onChange={e => {
              if (e.target.value === "****************") return;
              setCredentials(prev => ({
                ...prev,
                clientSecret: e.target.value
              }));
            }} onFocus={e => {
              if (e.target.value === "****************") {
                e.target.value = "";
                setCredentials(prev => ({
                  ...prev,
                  clientSecret: ""
                }));
              }
            }} placeholder={existingCredentials ? "Leave blank to keep existing" : "Client secret"} disabled={loadingCredentials} style={inputStyle} />
              </div>
            </div>

            <div style={{
          display: 'flex',
          gap: '0.5rem',
          justifyContent: 'flex-end'
        }}>
              <button type="button" onClick={handleTestConnection} disabled={testingConnection} style={secondaryButtonStyle} title="Test connection">
                {testingConnection ? <IconifyIcon icon="mdi:loading" rotate={1} style={{
              fontSize: '1.1rem'
            }} /> : <IconifyIcon icon="mdi:play-circle-outline" style={{
              fontSize: '1.2rem'
            }} />}
              </button>
            </div>
          </div>}
      </div>
    </motion.div>;
};
const maskName = name => {
  if (!name) return '-';
  const parts = name.split(' ');
  if (parts.length === 1) {
    const namePart = parts[0];
    if (namePart.length <= 3) return namePart;
    return namePart.substring(0, namePart.length - 2) + '**';
  }
  const firstName = parts[0];
  const lastName = parts[parts.length - 1];
  const maskedFirstName = firstName.length <= 3 ? firstName : firstName.substring(0, firstName.length - 2) + '**';
  const maskedLastName = lastName.length <= 3 ? lastName : lastName.substring(0, lastName.length - 2) + '**';
  return maskedFirstName + ' ' + maskedLastName;
};
const maskEmail = email => {
  if (!email) return '-';
  const [localPart, domain] = email.split('@');
  if (!domain) {
    if (email.length <= 4) return email;
    return email.substring(0, email.length - 2) + '**';
  }
  const maskedLocal = localPart.length <= 4 ? localPart : localPart.substring(0, localPart.length - 2) + '**';
  return `${maskedLocal}@${domain}`;
};
export default StepOffice365;
const inputStyle = {
  width: '100%',
  padding: '0.6rem 0.75rem',
  border: '1px solid #e5e7eb',
  borderRadius: 8,
  background: '#ffffff',
  color: '#1a1a1a',
  fontSize: '0.875rem',
  transition: 'all 0.2s ease'
};
const primaryButtonStyle = {
  padding: '0.55rem 0.95rem',
  borderRadius: 8,
  border: 'none',
  background: '#13BA8E',
  color: '#ffffff',
  fontWeight: 600,
  cursor: 'pointer'
};
const secondaryButtonStyle = {
  padding: '0.55rem 0.95rem',
  borderRadius: 8,
  border: '1px solid #d1d5db',
  background: '#ffffff',
  color: '#111827',
  fontWeight: 600,
  cursor: 'pointer'
};
const dangerButtonStyle = {
  padding: '0.55rem 0.95rem',
  borderRadius: 8,
  border: '1px solid #ef4444',
  background: '#ffffff',
  color: '#b91c1c',
  fontWeight: 600,
  cursor: 'pointer'
};
