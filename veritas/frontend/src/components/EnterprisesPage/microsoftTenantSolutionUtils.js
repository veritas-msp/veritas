import { deleteClientOffice365Credentials, unwrapOffice365CredentialsList } from "../../api/clientOffice365";
export function isMicrosoftTenantConfigured(client, credentials = null) {
  if (credentials?.tenantId && credentials?.clientIdAzure) return true;
  const list = listConfiguredMicrosoftTenants(client);
  if (list.length > 0) return true;
  return Boolean(client?.has_azure_credentials || client?.hasAzureCredentials || client?.azureHasCredentials);
}
export function normalizeMicrosoftTenantCredentials(credentials) {
  if (!credentials) return null;
  const id = credentials.id ?? credentials.credentialId ?? credentials.azureCredentialId ?? null;
  const tenantId = credentials.tenantId || credentials.tenant_id || null;
  const clientIdAzure = credentials.clientIdAzure || credentials.clientId || credentials.client_id_azure || null;
  if (!id && !tenantId && !clientIdAzure) return null;
  return {
    id,
    tenantId,
    clientIdAzure,
    secretKeyId: credentials.secretKeyId || credentials.secret_key_id || null,
    hasSecret: Boolean(credentials.hasSecret ?? credentials.has_secret ?? true),
    applicationDisplayName: credentials.applicationDisplayName || credentials.application_display_name || null,
    tenantName: credentials.tenantName || credentials.displayName || credentials.tenant_name || null
  };
}
export function listConfiguredMicrosoftTenants(client, credentialsList = []) {
  const rawList = Array.isArray(credentialsList) && credentialsList.length > 0
    ? credentialsList
    : Array.isArray(client?.azureCredentialsList)
      ? client.azureCredentialsList
      : Array.isArray(client?.azure_credentials_list)
        ? client.azure_credentials_list
        : unwrapOffice365CredentialsList(client);
  return rawList.map(normalizeMicrosoftTenantCredentials).filter(item => item?.id || item?.tenantId);
}
export function formatMicrosoftTenantSummary(credentials, client = null) {
  const normalized = normalizeMicrosoftTenantCredentials(credentials);
  const tenantId = normalized?.tenantId || client?.Office365?.tenantId || null;
  const displayName = normalized?.tenantName || normalized?.applicationDisplayName || client?.Office365?.tenantName || client?.name || "Tenant Microsoft";
  const shortTenantId = tenantId ? `${tenantId.slice(0, 8)}…${tenantId.slice(-4)}` : "-";
  return {
    label: displayName,
    tenantId,
    shortTenantId,
    mode: "Dedicated tenant",
    providerName: "Microsoft Entra ID"
  };
}
export function buildMicrosoftTenantDetailNavigationPayload(client, credentials = null) {
  if (!client?.id) return null;
  const normalized = normalizeMicrosoftTenantCredentials(credentials);
  const summary = formatMicrosoftTenantSummary(normalized, client);
  return {
    clientId: client.id,
    clientName: client.name,
    azureCredentialId: normalized?.id || null,
    tenantId: summary.tenantId,
    email: client?.Office365?.email || client?.microsoft?.email || null,
    displayName: summary.label,
    status: client?.Office365?.status || client?.microsoft?.status || "active",
    lastSync: client?.Office365?.lastSync || client?.microsoft?.lastSync || null
  };
}
export async function removeMicrosoftTenant(clientId, credential = null) {
  if (!clientId) return;
  const credentialId = credential?.id || credential?.credentialId || null;
  await deleteClientOffice365Credentials(clientId, credentialId);
}
