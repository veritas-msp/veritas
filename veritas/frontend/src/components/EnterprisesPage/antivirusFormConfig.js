import { getEndpointSecurityIntegrations, getIntegrationById, isIntegrationConfigured } from "../AdminPage/integrationsCatalog";
export const ANTIVIRUS_MANUAL_PROVIDER = {
  id: "manual",
  integrationId: null,
  label: "Other solution",
  solutionName: null,
  icon: "mdi:shield-plus-outline",
  description: "Manual entry without API synchronization (licenses, expiration).",
  status: "available",
  isManual: true,
  supportsGlobal: false,
  supportsDedicated: false
};
export function catalogIntegrationToAntivirusProvider(integration) {
  return {
    id: integration.id,
    integrationId: integration.id,
    label: integration.name,
    solutionName: integration.name,
    icon: integration.icon || "mdi:shield-bug-outline",
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
export function getAntivirusProviderOptions() {
  return [...getEndpointSecurityIntegrations().map(catalogIntegrationToAntivirusProvider), ANTIVIRUS_MANUAL_PROVIDER];
}
export const ANTIVIRUS_PROVIDERS = getAntivirusProviderOptions();
export function getAntivirusProvider(providerId) {
  return getAntivirusProviderOptions().find(provider => provider.id === providerId) || null;
}
export function resolveProviderGlobalConfigured(providerId, settingsMap = {}, apiGlobalStatus = {}) {
  if (!providerId || providerId === "manual") return false;
  if (providerId === "bitdefender") {
    return Boolean(apiGlobalStatus.bitdefender);
  }
  const integration = getIntegrationById(providerId);
  return isIntegrationConfigured(integration, settingsMap);
}
export function inferProviderIdFromSolution(solution) {
  if (!solution) return null;
  if (solution.providerId) return solution.providerId;
  if (solution.mappingMode === "manual" || solution.isManual) return "manual";
  if (solution.companyId || (solution.solution || "").toLowerCase().includes("bitdefender")) {
    return "bitdefender";
  }
  const name = (solution.solution || solution.nom || solution.name || "").toLowerCase();
  const match = getEndpointSecurityIntegrations().find(integration => name.includes(integration.id) || name.includes(integration.name.toLowerCase()));
  if (match) return match.id;
  return "manual";
}
export function buildAntivirusNavSections({
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
    icon: "mdi:shield-check-outline"
  }];
  const provider = getAntivirusProvider(selectedProviderId);
  if (selectedProviderId && selectedProviderId !== "manual" && provider?.supportsDedicated) {
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
      if (selectedProviderId === "bitdefender") {
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
      description: "Licenses et expiration",
      icon: "mdi:form-textbox"
    });
  }
  return sections;
}
export const ANTIVIRUS_FORM_SECTIONS = buildAntivirusNavSections({
  selectedProviderId: "bitdefender",
  globalConfigured: true
});
