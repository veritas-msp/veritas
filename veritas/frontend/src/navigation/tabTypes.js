export const LIST_TAB_DOC_TYPES = ["Contrat", "Contact", "Ticket", "Hardware", "EquipmentInventory", "DocumentsHub"];
export function isListTabDocType(docType) {
  return LIST_TAB_DOC_TYPES.includes(docType);
}

/** Stable tab id for Microsoft tenant detail (must match URL route keyed by clientId). */
export function generateTenantDetailTabId(data) {
  if (data?.clientId && data?.azureCredentialId) {
    return `tenant-${data.clientId}-${data.azureCredentialId}`;
  }
  if (data?.clientId) {
    return `tenant-${data.clientId}`;
  }
  const tenantId = data?.tenantId != null ? String(data.tenantId).trim() : "";
  if (tenantId && tenantId !== "-") {
    return `tenant-${tenantId}`;
  }
  return "tenant-unknown";
}

export function findTenantDetailTab(tabs, data) {
  if (!Array.isArray(tabs) || !data?.clientId) return null;
  const preferredId = generateTenantDetailTabId(data);
  const exact = tabs.find(tab => tab.id === preferredId);
  if (exact) return exact;
  return tabs.find(tab => tab.type === "TenantDetail" && String(tab.data?.clientId) === String(data.clientId)) || null;
}
export function createListTabData(docType) {
  const prefix = String(docType || "page").toLowerCase();
  return {
    _listTab: true,
    tabInstanceId: `${prefix}-list-${Date.now()}`
  };
}
