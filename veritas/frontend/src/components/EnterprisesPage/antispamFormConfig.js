import { getEmailSecurityIntegrations, getIntegrationById, isIntegrationConfigured } from "../AdminPage/integrationsCatalog";
export const ANTISPAM_MANUAL_PROVIDER = {
  id: "manual",
  integrationId: null,
  label: "Autre solution",
  solutionName: null,
  icon: "mdi:email-plus-outline",
  description: "Saisie manuelle sans synchronisation API (utilisateurs, domaines, expiration).",
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
    image: integration.image || (integration.id === "mailinblack" ? "mailinblack.png" : null),
    description: integration.description,
    status: integration.status === "comingSoon" ? "comingSoon" : "available",
    proOnly: Boolean(integration.proOnly),
    supportsGlobal: integration.status === "available",
    supportsDedicated: integration.status === "available",
    catalogIntegration: integration
  };
}
export function getAntispamProviderOptions() {
  return getEmailSecurityIntegrations().map(catalogIntegrationToAntispamProvider);
}
export function getAntispamProvider(providerId) {
  if (providerId === "manual") return ANTISPAM_MANUAL_PROVIDER;
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
  const rawName = `${solution.solution || solution.logiciel || solution.nom || solution.name || ""}`.toLowerCase();
  if (solution.customerId || rawName.includes("mailinblack") || rawName.includes("mail in black")) {
    return "mailinblack";
  }
  const name = rawName;
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
    label: "Solution enregistrée",
    description: "Pour ce client",
    icon: "mdi:view-list-outline"
  }, {
    id: "solution",
    label: "Solution paramétrable",
    description: "Fournisseurs",
    icon: "mdi:email-secure-outline"
  }];
  const provider = getAntispamProvider(selectedProviderId);
  if (selectedProviderId && provider?.supportsDedicated) {
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
      if (selectedProviderId === "mailinblack") {
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
      description: "Utilisateurs, domaines et expiration",
      icon: "mdi:form-textbox"
    });
  }
  return sections;
}
