export const MICROSOFT_TENANT_PRODUCT_NAME = "Microsoft 365 / Entra ID";
export const GRAPH_API_PERMISSIONS = ["AuditLog.Read.All", "Application.Read.All", "AppRoleAssignment.ReadWrite.All", "Channel.ReadBasic.All", "ChannelMember.Read.All", "Directory.Read.All", "Files.Read.All", "IdentityRiskEvent.Read.All", "MailboxSettings.Read", "Organization.Read.All", "Policy.Read.All", "Reports.Read.All", "SecurityEvents.Read.All", "ServiceHealth.Read.All", "ServiceMessage.Read.All", "Sites.Read.All", "Team.ReadBasic.All", "TeamMember.Read.All", "ThreatAssessment.Read.All", "User.Read.All", "User.ReadBasic.All", "UserAuthenticationMethod.Read.All"];
export function buildMicrosoftTenantNavSections({
  configured = false
} = {}) {
  return [{
    id: "overview",
    label: "Registered tenant",
    description: configured ? "Configured for this client" : "No tenant",
    icon: "mdi:view-list-outline"
  }, {
    id: "configuration",
    label: "Dedicated tenant",
    description: "Credentials Entra ID",
    icon: "mdi:shield-key-outline"
  }, {
    id: "guide",
    label: "Guide",
    description: "Create the app in Entra",
    icon: "mdi:book-open-outline"
  }];
}
