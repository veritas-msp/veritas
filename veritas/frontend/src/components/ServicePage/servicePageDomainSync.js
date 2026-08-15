import { getGlobalOvhStatus, syncOvhDomains } from "../../api/clientOvh";

const DOMAIN_INTEGRATION_SYNCS = [{
  id: "ovh",
  label: "OVH",
  async isConfigured() {
    try {
      const status = await getGlobalOvhStatus();
      return Boolean(status?.configured);
    } catch {
      return false;
    }
  },
  sync: syncOvhDomains
}];

export async function listConfiguredDomainIntegrations() {
  const configured = [];
  for (const integration of DOMAIN_INTEGRATION_SYNCS) {
    if (await integration.isConfigured()) {
      configured.push(integration);
    }
  }
  return configured;
}
