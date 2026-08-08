import { getEmailSecurityIntegrations, getIntegrationById, isIntegrationConfigured } from "../AdminPage/integrationsCatalog";
export const ANTISPAM_MANUAL_PROVIDER = {
  id: "manual",
  integrationId: null,
  label: "Other solution",
  solutionName: null,
  icon: "mdi:email-plus-outline",
  description: "Manual entry without API synchronization (users, domains, expiration).",
  status: "available",
  isManual: true,
  supportsGlobal: false,
  supportsDedicated: false
};
export function catalogIntegrationToAntispamProvider(integration) {
  return {
    id: integration.id,
    integrationId: integration.id,
    label: integration.name,
    solutionName: integration.name,
    icon: integration.icon || "mdi:email-secure-outline",
    iconColor: integration.iconColor,
    image: integration.image,
    description: integration.description,
    status: integration.status === "comingSoon" ? "comingSoon" : "available",
    proOnly: Boolean(integration.proOnly),
    supportsGlobal: integration.status === "available",
    supportsDedicated: integration.status === "available",
    catalogIntegration: integration
  };
}
export function getAntispamProviderOptions() {
  return [...getEmailSecurityIntegrations().map(catalogIntegrationToAntispamProvider), ANTISPAM_MANUAL_PROVIDER];
}
export function getAntispamProvider(providerId) {
  return getAntispamProviderOptions().find(provider => provider.id === providerId) || null;
}
export function resolveProviderGlobalConfigured(providerId, settingsMap = {}, apiGlobalStatus = {}) {
  if (!providerId) return false;
  if (providerId === "mailinblack") {
    return Boolean(apiGlobalStatus.mailinblack);
  }
  const integration = getIntegrationById(providerId);
  return isIntegrationConfigured(integration, settingsMap);
}
export function inferProviderIdFromSolution(solution) {
  if (!solution) return null;
  if (solution.providerId && solution.providerId !== "manual") return solution.providerId;
  if (solution.mailinblackTenantId) return "mailinblack";
  if (solution.customerId || (solution.solution || solution.logiciel || "").toLowerCase().includes("mailinblack")) {
    return "mailinblack";
  }
  const name = (solution.solution || solution.logiciel || solution.nom || solution.name || "").toLowerCase();
  const match = getEmailSecurityIntegrations().find(integration => name.includes(integration.id) || name.includes(integration.name.toLowerCase()));
  return match?.id || null;
}
export function buildAntispamNavSections({
  selectedProviderId,
  globalConfigured = false,
  visibleTenantMode = null
}) {
  const sections = [{
    id: "overview",
    label: "Solution saved",
    description: "Pour ce client",
    icon: "mdi:view-list-outline"
  }, {
    id: "solution",
    label: "Configurable solution",
    description: "Fournisseurs",
    icon: "mdi:email-secure-outline"
  }];
  const provider = getAntispamProvider(selectedProviderId);
  if (selectedProviderId && provider?.supportsDedicated) {
    if (visibleTenantMode === "reseller") {
      sections.push({
        id: "reseller",
        label: "Tenant global",
        description: globalConfigured ? "Integration configured in administration" : "Not configured in administration",
        icon: "mdi:store-cog-outline",
        disabled: !globalConfigured
      });
    } else if (visibleTenantMode === "dedicated") {
      sections.push({
        id: "dedicated",
        label: "Dedicated tenant",
        description: "Credentials API propres au client",
        icon: "mdi:shield-key-outline"
      });
      if (selectedProviderId === "mailinblack") {
        sections.push({
          id: "guide",
          label: "Guide",
          description: "Get an API key",
          icon: "mdi:book-open-outline"
        });
      }
    }
  } else if (selectedProviderId === "manual") {
    sections.push({
      id: "manual",
      label: "Saisie manuelle",
      description: "Users, domaines et expiration",
      icon: "mdi:form-textbox"
    });
  }
  return sections;
}
