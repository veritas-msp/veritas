export const NOTIFICATION_SOURCE_OPTIONS = [{
  key: "tickets",
  label: "Tickets",
  elements: [{
    key: "created",
    label: "Created"
  }, {
    key: "updated",
    label: "Updated"
  }, {
    key: "resolved",
    label: "Resolved"
  }, {
    key: "commented",
    label: "Comment added"
  }]
}, {
  key: "entreprise",
  label: "Company",
  elements: [{
    key: "updated",
    label: "Company record updated"
  }, {
    key: "contract_info_updated",
    label: "Contract information updated"
  }, {
    key: "contract_expiration_soon",
    label: "Contract expiration approaching"
  }, {
    key: "contract_expired",
    label: "Contract expired"
  }]
}, {
  key: "contact",
  label: "Contact",
  elements: [{
    key: "created",
    label: "Created"
  }, {
    key: "updated",
    label: "Updated"
  }]
}, {
  key: "infrastructure",
  label: "Infrastructure",
  elements: [{
    key: "internet_updated",
    label: "Internet connection updated"
  }, {
    key: "server_updated",
    label: "Server updated"
  }, {
    key: "firewall_updated",
    label: "Firewall updated"
  }, {
    key: "storage_updated",
    label: "Storage updated"
  }, {
    key: "switch_updated",
    label: "Switch updated"
  }, {
    key: "wifi_ap_updated",
    label: "Wi-Fi access point updated"
  }]
}, {
  key: "cyber",
  label: "Cyber",
  elements: [{
    key: "campaign_updated",
    label: "Campaign updated"
  }, {
    key: "campaign_start_date_soon",
    label: "Campaign start date approaching"
  }, {
    key: "campaign_end_date_soon",
    label: "Campaign end date approaching"
  }, {
    key: "campaign_end_date_reached",
    label: "Campaign end date reached"
  }, {
    key: "antivirus_updated",
    label: "Antivirus updated"
  }, {
    key: "antivirus_expiration_soon",
    label: "Antivirus expiration approaching"
  }, {
    key: "antivirus_expired",
    label: "Antivirus expired"
  }, {
    key: "antispam_updated",
    label: "Antispam updated"
  }, {
    key: "antispam_expiration_soon",
    label: "Antispam expiration approaching"
  }, {
    key: "antispam_expired",
    label: "Antispam expired"
  }, {
    key: "backup_updated",
    label: "Backup updated"
  }]
}, {
  key: "services",
  label: "Services",
  elements: [{
    key: "tenant_updated",
    label: "Tenant updated"
  }, {
    key: "domain_updated",
    label: "Domain name updated"
  }]
}, {
  key: "rapport",
  label: "Report",
  elements: [{
    key: "generated",
    label: "Report generated"
  }, {
    key: "updated",
    label: "Report updated"
  }]
}];
export const NOTIFICATION_CHANNEL_OPTIONS = [{
  key: "mail",
  label: "Email"
}, {
  key: "webhook",
  label: "Webhook"
}, {
  key: "browser",
  label: "Browser (in-app)",
  comingSoon: true
}, {
  key: "sms",
  label: "SMS",
  comingSoon: true
}];
export const RUNTIME_NOTIFICATION_CHANNELS = new Set(["mail", "webhook"]);
export const WEBHOOK_CHANNEL_ICON_BY_KEY = {
  teams: "mdi:microsoft-teams",
  slack: "mdi:slack",
  webhook: "mingcute:link-2-fill"
};
export const TEAMS_THEME_COLOR_PRESETS = ["#13BA8E", "#2563EB", "#9333EA", "#DC2626", "#D97706", "#0F172A"];
export const NOTIFICATION_EVENT_FORM_SECTIONS = [{
  id: "trigger",
  label: "Trigger",
  description: "Source and event",
  icon: "mdi:flash-outline"
}, {
  id: "target",
  label: "Target",
  description: "Company scope",
  icon: "mdi:target"
}, {
  id: "channel",
  label: "Channel",
  description: "Email and/or webhook",
  icon: "mdi:send-outline"
}, {
  id: "content",
  label: "Content",
  description: "Template or message",
  icon: "mdi:text-box-outline"
}];
export const getSourceOption = sourceKey => NOTIFICATION_SOURCE_OPTIONS.find(item => item.key === sourceKey) || NOTIFICATION_SOURCE_OPTIONS[0];
export const getElementOption = (sourceKey, elementKey) => {
  const source = getSourceOption(sourceKey);
  return source.elements.find(item => item.key === elementKey) || source.elements[0];
};
export const isSoonElementKey = elementKey => String(elementKey || "").toLowerCase().includes("_soon");
export const parseEmailTags = value => String(value || "").split(",").map(item => String(item || "").trim()).filter(Boolean);
/** Resolve channels[] with legacy `channel` string fallback. */
export function normalizeNotificationEventChannels(eventOrChannels = {}) {
  const source = eventOrChannels && typeof eventOrChannels === "object" && !Array.isArray(eventOrChannels) ? eventOrChannels : {
    channels: eventOrChannels
  };
  const fromArray = Array.isArray(source.channels) ? source.channels.map(item => String(item || "").trim().toLowerCase()).filter(Boolean) : [];
  if (fromArray.length) return Array.from(new Set(fromArray));
  const legacy = String(source.channel || "").trim().toLowerCase();
  if (legacy) return [legacy];
  return ["webhook"];
}
export function describeNotificationEventChannels(eventOrChannels = {}) {
  const channels = normalizeNotificationEventChannels(eventOrChannels);
  if (!channels.length) return "-";
  return channels.map(key => NOTIFICATION_CHANNEL_OPTIONS.find(item => item.key === key)?.label || key).join(", ");
}
export function buildDefaultNotificationEvent() {
  return {
    id: `notif-event-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    source: "tickets",
    element: "created",
    scopeType: "all",
    enterpriseId: "",
    daysBefore: 30,
    channels: ["webhook"],
    channel: "webhook",
    webhookId: "",
    emailTo: "",
    emailCc: "",
    useTemplate: false,
    templateId: "",
    customMessage: "",
    teamsThemeColor: "#13BA8E",
    enabled: true
  };
}
export function describeNotificationEvent(draft = {}) {
  const source = getSourceOption(draft.source);
  const element = getElementOption(source.key, draft.element);
  return `${source.label} · ${element.label}`;
}
