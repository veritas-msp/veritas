import { getEndpointSecurityIntegrations, getIntegrationById, isIntegrationConfigured } from "../AdminPage/integrationsCatalog";
export const ANTIVIRUS_MANUAL_PROVIDER = {
  id: "manual",
  integrationId: null,
  label: "Autre solution",
  solutionName: null,
  icon: "mdi:shield-plus-outline",
  description: "Saisie manuelle sans synchronisation API (licences, expiration).",
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
    image: integration.image || (integration.id === "bitdefender" ? "bitdefender.png" : null),
    description: integration.description,
    status: integration.status === "comingSoon" ? "comingSoon" : "available",
    proOnly: Boolean(integration.proOnly),
    supportsGlobal: integration.status === "available",
    supportsDedicated: integration.status === "available",
    catalogIntegration: integration
  };
}
export function getAntivirusProviderOptions() {
  return getEndpointSecurityIntegrations().map(catalogIntegrationToAntivirusProvider);
}
export const ANTIVIRUS_PROVIDERS = getAntivirusProviderOptions();
export function getAntivirusProvider(providerId) {
  if (providerId === "manual") return ANTIVIRUS_MANUAL_PROVIDER;
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
    label: "Solution enregistrée",
    description: "Pour ce client",
    icon: "mdi:view-list-outline"
  }, {
    id: "solution",
    label: "Solution paramétrable",
    description: "Fournisseurs",
    icon: "mdi:shield-check-outline"
  }];
  const provider = getAntivirusProvider(selectedProviderId);
  if (selectedProviderId && selectedProviderId !== "manual" && provider?.supportsDedicated) {
    if (visibleTenantMode === "reseller") {
      sections.push({
        id: "reseller",
        label: "Tenant global",
        description: globalConfigured
          ? "Intégration configurée en administration"
          : "Non configuré en administration",
        icon: "mdi:store-cog-outline",
        disabled: !globalConfigured
      });
    } else if (visibleTenantMode === "dedicated") {
      sections.push({
        id: "dedicated",
        label: "Tenant dédié",
        description: "Identifiants API propres au client",
        icon: "mdi:shield-key-outline"
      });
      if (selectedProviderId === "bitdefender") {
        sections.push({
          id: "guide",
          label: "Guide",
          description: "Obtenir une clé API",
          icon: "mdi:book-open-outline"
        });
      }
    }
  } else if (selectedProviderId === "manual") {
    sections.push({
      id: "manual",
      label: "Saisie manuelle",
      description: "Licences et expiration",
      icon: "mdi:form-textbox"
    });
  }
  return sections;
}
export const ANTIVIRUS_FORM_SECTIONS = buildAntivirusNavSections({
  selectedProviderId: "bitdefender",
  globalConfigured: true
});
