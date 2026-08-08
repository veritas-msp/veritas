export const LIST_TAB_DOC_TYPES = ["Contrat", "Contact", "Ticket", "Hardware", "DocumentsHub"];
export function isListTabDocType(docType) {
  return LIST_TAB_DOC_TYPES.includes(docType);
}
export function createListTabData(docType) {
  const prefix = String(docType || "page").toLowerCase();
  return {
    _listTab: true,
    tabInstanceId: `${prefix}-list-${Date.now()}`
  };
}
