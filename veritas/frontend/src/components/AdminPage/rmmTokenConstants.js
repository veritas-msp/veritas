export const RMM_TOKEN_FORM_SECTIONS = [{
  id: "enterprise",
  label: "Company",
  description: "Veritas assignment",
  icon: "mdi:office-building-outline"
}, {
  id: "details",
  label: "Details",
  description: "Label and usage",
  icon: "mdi:tag-outline"
}];
export function buildDefaultTokenDraft() {
  return {
    clientId: "",
    label: ""
  };
}
