export const CONTRACT_MODULE_OPTION_FORM_SECTIONS = [{
  id: "identity",
  label: "Identity",
  description: "Key and label",
  icon: "mdi:identifier"
}, {
  id: "presentation",
  label: "Presentation",
  description: "Icon and visibility",
  icon: "mdi:palette-outline"
}];
export function buildDefaultContractModuleOptionDraft() {
  return {
    moduleKey: "",
    label: "",
    icon: "mdi:puzzle-outline",
    enabled: true,
    sortOrder: ""
  };
}
export function buildContractModuleOptionDraftFromModule(mod) {
  return {
    moduleKey: mod.moduleKey || "",
    label: mod.label || "",
    icon: mod.icon || "mdi:puzzle-outline",
    enabled: mod.enabled !== false,
    sortOrder: String(mod.sortOrder ?? "")
  };
}
