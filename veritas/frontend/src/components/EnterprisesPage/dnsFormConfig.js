import { getDnsIntegrations, getIntegrationById, isIntegrationConfigured } from "../AdminPage/integrationsCatalog";
export const DNS_MANUAL_PROVIDER = {
  id: "manual",
  integrationId: null,
  label: "Other registrar",
  icon: "mdi:web-plus",
  description: "Manual entry without API synchronization (domain name, expiration).",
  status: "available",
  isManual: true,
  supportsGlobal: false
};
export function catalogIntegrationToDnsProvider(integration) {
  return {
    id: integration.id,
    integrationId: integration.id,
    label: integration.name,
    icon: integration.icon || "mdi:web",
    iconColor: integration.iconColor,
    image: integration.image,
    description: integration.description,
    status: integration.status === "comingSoon" ? "comingSoon" : "available",
    proOnly: Boolean(integration.proOnly),
    supportsGlobal: integration.status === "available",
    catalogIntegration: integration
  };
}
export function getDnsProviderOptions() {
  return [...getDnsIntegrations().map(catalogIntegrationToDnsProvider), DNS_MANUAL_PROVIDER];
}
export function getDnsProvider(providerId) {
  return getDnsProviderOptions().find(provider => provider.id === providerId) || null;
}
export function resolveProviderGlobalConfigured(providerId, settingsMap = {}, apiGlobalStatus = {}) {
  if (!providerId) return false;
  if (providerId === "ovh") {
    return Boolean(apiGlobalStatus.ovh);
  }
  const integration = getIntegrationById(providerId);
  return isIntegrationConfigured(integration, settingsMap);
}
export function inferProviderIdFromDomain(domain) {
  if (!domain) return null;
  if (domain.providerId === "manual" || domain.isManual) return "manual";
  if (domain.providerId) return domain.providerId;
  const registrar = (domain.registrar || "").toLowerCase();
  if (registrar.includes("ovh")) return "ovh";
  if (registrar.includes("autre")) return "manual";
  const match = getDnsIntegrations().find(integration => registrar.includes(integration.id) || registrar.includes(integration.name.toLowerCase()));
  return match?.id || null;
}
export function buildDnsNavSections({
  selectedProviderId,
  globalConfigured = false,
  showProviderGuide = false
}) {
  const sections = [{
    id: "overview",
    label: "Solution saved",
    description: "Pour ce client",
    icon: "mdi:view-list-outline"
  }, {
    id: "provider",
    label: "Configurable solution",
    description: "Fournisseurs",
    icon: "mdi:web"
  }];
  const provider = getDnsProvider(selectedProviderId);
  if (selectedProviderId === "ovh" && provider?.supportsGlobal && globalConfigured) {
    sections.push({
      id: "import",
      label: "Import from OVH",
      description: "Select the domains to attach",
      icon: "mdi:cloud-download-outline"
    });
  }
  if (showProviderGuide && selectedProviderId === "ovh") {
    sections.push({
      id: "guide",
      label: "Guide",
      description: "Get API keys",
      icon: "mdi:book-open-outline"
    });
  }
  if (selectedProviderId === "manual") {
    sections.push({
      id: "manual",
      label: "Saisie manuelle",
      description: "Domain name and expiration",
      icon: "mdi:form-textbox"
    });
  }
  return sections;
}
