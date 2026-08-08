import { deleteClientOffice365Credentials } from "../../api/clientOffice365";
export function isMicrosoftTenantConfigured(client, credentials = null) {
  if (credentials?.tenantId && credentials?.clientIdAzure) return true;
  return Boolean(client?.has_azure_credentials || client?.hasAzureCredentials || client?.azureHasCredentials);
}
export function normalizeMicrosoftTenantCredentials(credentials) {
  if (!credentials) return null;
  return {
    tenantId: credentials.tenantId || null,
    clientIdAzure: credentials.clientIdAzure || credentials.clientId || null,
    secretKeyId: credentials.secretKeyId || null,
    hasSecret: Boolean(credentials.hasSecret),
    applicationDisplayName: credentials.applicationDisplayName || null,
    tenantName: credentials.tenantName || credentials.displayName || null
  };
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
    tenantId: summary.tenantId,
    email: client?.Office365?.email || client?.microsoft?.email || null,
    displayName: summary.label,
    status: client?.Office365?.status || client?.microsoft?.status || "active",
    lastSync: client?.Office365?.lastSync || client?.microsoft?.lastSync || null
  };
}
export async function removeMicrosoftTenant(clientId) {
  if (!clientId) return;
  await deleteClientOffice365Credentials(clientId);
}
