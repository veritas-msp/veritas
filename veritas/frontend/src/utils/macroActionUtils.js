export function buildDefaultMacroAction() {
  return {
    id: `macro-action-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    type: "set_field",
    field: "status",
    fieldMode: "",
    value: "new",
    comment: "",
    commentTemplateId: "",
    isInternal: false,
    emailTo: "",
    emailCc: "",
    emailSubject: "",
    emailBody: "",
    teamsWebhookId: "",
    teamsTitle: "",
    teamsMessage: "",
    teamsThemeColor: "#13BA8E",
    reminderTitle: "",
    reminderOffsetMinutes: "60",
    reminderNote: "",
    tagsMode: "add",
    tagsText: "",
    phoneNumber: "",
    ticketId: "",
    equipmentId: ""
  };
}
export function normalizeMacroActionForEditor(action) {
  const merged = {
    ...buildDefaultMacroAction(),
    ...(action || {})
  };
  if (merged.type === "add_tags") {
    return {
      ...merged,
      type: "manage_tags",
      tagsMode: merged.tagsMode || "add"
    };
  }
  return merged;
}
