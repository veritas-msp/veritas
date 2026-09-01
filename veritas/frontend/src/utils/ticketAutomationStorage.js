import API_BASE_URL from "../config";
import { normalizeInAppSettings } from "./inAppNotificationSettings";
import { normalizeExclusionFilterRoot } from "./mailIngestionRules";
import { normalizeMailCollectSettings } from "./mailCollectSettingsConstants";
const UPDATE_EVENT = "veritas:ticket-automation-updated";
const DEFAULT_COMMENT_TEMPLATES = [{
  id: "tpl-acknowledge",
  name: "Acknowledgement",
  content: "Hello,\n\nWe confirm that your request has been received. We will get back to you shortly with an update.\n\nBest regards,"
}, {
  id: "tpl-need-info",
  name: "Information request",
  content: "Hello,\n\nTo proceed with your ticket, please provide the following additional information:\n- \n- \n\nThank you,\nBest regards,"
}, {
  id: "tpl-resolved",
  name: "Resolution",
  content: "Hello,\n\nThe ticket is now resolved. Please contact us again if you notice any unusual behavior.\n\nBest regards,"
}];
const DEFAULT_MACROS = [{
  id: "macro-take-ownership",
  name: "Take ownership",
  actions: [{
    id: "a1",
    type: "set_field",
    field: "status",
    value: "in_progress"
  }, {
    id: "a2",
    type: "set_field",
    field: "assigned_to_me",
    value: "true"
  }]
}, {
  id: "macro-resolve-notify",
  name: "Resolve + notification",
  actions: [{
    id: "a1",
    type: "set_field",
    field: "status",
    value: "resolved"
  }, {
    id: "a2",
    type: "set_field",
    field: "assigned_to_me",
    value: "true"
  }, {
    id: "a3",
    type: "open_email",
    emailSubject: "Ticket #{{ticketNumber}} - Resolution",
    emailBody: "Hello,\n\nThe ticket \"{{title}}\" is now resolved.\n\nBest regards,"
  }]
}];
const getDefaults = () => ({
  commentTemplates: DEFAULT_COMMENT_TEMPLATES,
  macros: DEFAULT_MACROS,
  emailInboxes: [],
  exclusionRules: [],
  autoReplyRules: [],
  autoReplyTemplate: "Hello {{demandeur.prenom}},\n\nYour request has been received and a ticket has been created.\nWe will get back to you as soon as possible.\n\nBest regards,",
  notificationSettings: {
    onTicketCreated: false,
    onTicketResolved: false,
    onTicketCommented: false,
    eventToggles: {
      ticketCreated: false,
      ticketResolved: false,
      ticketCommented: false,
      ticketAutoReply: false
    },
    webhooks: [],
    notificationEvents: [],
    templates: [],
    systemNotifications: {},
    logs: [],
    inAppSettings: normalizeInAppSettings()
  },
  mailCollectors: [],
  mailCollectSettings: normalizeMailCollectSettings()
});
let cachedConfig = getDefaults();
const normalizeTemplate = (row, idx) => ({
  id: row?.id || `tpl-custom-${Date.now()}-${idx}`,
  name: String(row?.name || "").trim() || `Template ${idx + 1}`,
  content: String(row?.content || "")
});
const normalizeMacro = (row, idx) => ({
  id: row?.id || `macro-custom-${Date.now()}-${idx}`,
  name: String(row?.name || "").trim() || `Macro ${idx + 1}`,
  actions: Array.isArray(row?.actions) ? row.actions.map((action, actionIdx) => {
    const normalized = {
      id: action?.id || `macro-action-${Date.now()}-${idx}-${actionIdx}`,
      type: String(action?.type || "set_field").trim() || "set_field",
      field: String(action?.field || "").trim(),
      fieldMode: String(action?.fieldMode || "").trim(),
      value: String(action?.value || ""),
      comment: String(action?.comment || ""),
      commentTemplateId: String(action?.commentTemplateId || ""),
      isInternal: Boolean(action?.isInternal),
      emailTo: String(action?.emailTo || ""),
      emailCc: String(action?.emailCc || ""),
      emailSubject: String(action?.emailSubject || ""),
      emailBody: String(action?.emailBody || ""),
      teamsWebhookId: String(action?.teamsWebhookId || action?.webhookId || ""),
      teamsTitle: String(action?.teamsTitle || ""),
      teamsMessage: String(action?.teamsMessage || ""),
      teamsThemeColor: String(action?.teamsThemeColor || "#13BA8E"),
      reminderTitle: String(action?.reminderTitle || ""),
      reminderOffsetMinutes: String(action?.reminderOffsetMinutes ?? "60"),
      reminderNote: String(action?.reminderNote || ""),
      tagsMode: String(action?.tagsMode || "add").trim() || "add",
      phoneNumber: String(action?.phoneNumber || ""),
      ticketId: String(action?.ticketId || ""),
      equipmentId: String(action?.equipmentId || ""),
      tagsText: String(action?.tagsText || "")
    };
    if (normalized.type === "add_tags") {
      normalized.type = "manage_tags";
      normalized.tagsMode = normalized.tagsMode || "add";
    }
    return normalized;
  }).filter(action => action.type) : [...(row?.status ? [{
    id: "legacy-status",
    type: "set_field",
    field: "status",
    value: String(row.status)
  }] : []), ...(row?.assignToSelf ? [{
    id: "legacy-assignee",
    type: "set_field",
    field: "assigned_to_me",
    value: "true"
  }] : []), ...(row?.emailSubject || row?.emailBody ? [{
    id: "legacy-email",
    type: "open_email",
    emailSubject: String(row?.emailSubject || ""),
    emailBody: String(row?.emailBody || "")
  }] : [])]
});
const normalizeEmailInbox = (row, idx) => ({
  id: row?.id || `inbox-${Date.now()}-${idx}`,
  address: String(row?.address || "").trim(),
  enabled: Boolean(row?.enabled),
  provider: String(row?.provider || "").trim()
});
const normalizeExclusionRule = (row, idx) => {
  const legacyCriteria = Array.isArray(row?.criteria) ? row.criteria : row?.type || row?.value ? [{
    id: `criterion-legacy-${Date.now()}-${idx}`,
    field: String(row?.type || "title_contains").trim() === "requester_email" ? "fromAddress" : "subject",
    operator: "contains",
    value: String(row?.value || "").trim()
  }] : [];
  const filterRoot = normalizeExclusionFilterRoot({
    ...row,
    criteria: legacyCriteria
  });
  return {
    id: row?.id || `exclude-${Date.now()}-${idx}`,
    name: String(row?.name || "").trim() || `Regle ${idx + 1}`,
    collectorId: String(row?.collectorId || "").trim(),
    filterRoot,
    criteria: legacyCriteria.map((criterion, criterionIdx) => ({
      id: String(criterion?.id || `criterion-${Date.now()}-${idx}-${criterionIdx}`),
      field: String(criterion?.field || "subject").trim() || "subject",
      operator: String(criterion?.operator || "contains").trim() || "contains",
      value: String(criterion?.value ?? "").trim()
    })),
    action: String(row?.action || "create_ticket_support").trim() || "create_ticket_support",
    actionTemplate: String(row?.actionTemplate || "").trim(),
    archiveOnMatch: row?.archiveOnMatch !== false,
    enabled: row?.enabled !== false
  };
};
const normalizeAutoReplyRule = (row, idx) => ({
  id: row?.id || `autoreply-${Date.now()}-${idx}`,
  matchOn: String(row?.matchOn || "requester_email").trim() || "requester_email",
  operator: String(row?.operator || "contains").trim() || "contains",
  value: String(row?.value || "").trim(),
  enabled: row?.enabled !== false
});
const normalizeNotificationSettings = row => ({
  onTicketCreated: Boolean(row?.onTicketCreated),
  onTicketResolved: Boolean(row?.onTicketResolved),
  onTicketCommented: Boolean(row?.onTicketCommented),
  eventToggles: {
    ticketCreated: Boolean(row?.eventToggles?.ticketCreated ?? row?.onTicketCreated),
    ticketResolved: Boolean(row?.eventToggles?.ticketResolved ?? row?.onTicketResolved),
    ticketCommented: Boolean(row?.eventToggles?.ticketCommented ?? row?.onTicketCommented),
    ticketAutoReply: Boolean(row?.eventToggles?.ticketAutoReply)
  },
  webhooks: Array.isArray(row?.webhooks) ? row.webhooks.map((webhook, idx) => ({
    id: String(webhook?.id || `notif-webhook-${Date.now()}-${idx}`),
    name: String(webhook?.name || "").trim() || `Webhook ${idx + 1}`,
    channel: String(webhook?.channel || "teams").trim() || "teams",
    channelName: String(webhook?.channelName || "").trim(),
    url: String(webhook?.url || "").trim(),
    enabled: webhook?.enabled !== false
  })) : [],
  systemNotifications: row?.systemNotifications && typeof row.systemNotifications === "object" && !Array.isArray(row.systemNotifications) ? row.systemNotifications : {},
  templates: Array.isArray(row?.templates) ? row.templates.map((tpl, idx) => ({
    id: String(tpl?.id || `notif-tpl-${Date.now()}-${idx}`),
    name: String(tpl?.name || "").trim() || `Template ${idx + 1}`,
    subject: String(tpl?.subject || "").trim(),
    content: String(tpl?.content || tpl?.body || ""),
    source: String(tpl?.source || "").trim().toLowerCase(),
    element: String(tpl?.element || "").trim().toLowerCase()
  })) : [],
  notificationEvents: (Array.isArray(row?.notificationEvents) ? row.notificationEvents : []).map((eventItem, idx) => {
    const sourceRaw = String(eventItem?.source || "").trim().toLowerCase();
    const legacyKey = String(eventItem?.key || "").trim().toLowerCase();
    const source = sourceRaw || (legacyKey.includes("ticket") ? "tickets" : legacyKey.includes("equipment") ? "infrastructure" : "tickets");
    const element = String(eventItem?.element || "").trim().toLowerCase() || (legacyKey.includes("created") ? "created" : legacyKey.includes("resolved") ? "resolved" : legacyKey.includes("comment") ? "commented" : "updated");
    const channelsFromArray = Array.isArray(eventItem?.channels) ? eventItem.channels.map(item => String(item || "").trim().toLowerCase()).filter(Boolean) : [];
    const legacyChannel = String(eventItem?.channel || "").trim().toLowerCase();
    const channels = Array.from(new Set(channelsFromArray.length ? channelsFromArray : legacyChannel ? [legacyChannel] : ["webhook"]));
    return {
      id: String(eventItem?.id || `notif-event-${Date.now()}-${idx}`),
      source,
      element,
      scopeType: String(eventItem?.scopeType || "all").trim().toLowerCase() === "enterprise" ? "enterprise" : "all",
      enterpriseId: String(eventItem?.enterpriseId || "").trim(),
      daysBefore: Number.isFinite(Number(eventItem?.daysBefore)) ? Number(eventItem.daysBefore) : 30,
      channels,
      channel: channels[0] || "webhook",
      webhookId: String(eventItem?.webhookId || "").trim(),
      emailTo: String(eventItem?.emailTo || "").trim(),
      emailCc: String(eventItem?.emailCc || "").trim(),
      emailSubject: String(eventItem?.emailSubject || "").trim(),
      useTemplate: eventItem?.useTemplate === true,
      templateId: String(eventItem?.templateId || "").trim(),
      customMessage: String(eventItem?.customMessage || ""),
      teamsThemeColor: String(eventItem?.teamsThemeColor || "#13BA8E"),
      enabled: eventItem?.enabled !== false
    };
  }),
  logs: Array.isArray(row?.logs) ? row.logs.map((log, idx) => ({
    id: String(log?.id || `notif-log-${Date.now()}-${idx}`),
    createdAt: String(log?.createdAt || new Date().toISOString()),
    source: String(log?.source || "").trim(),
    element: String(log?.element || "").trim(),
    channel: String(log?.channel || "").trim(),
    status: String(log?.status || "").trim() || "info",
    message: String(log?.message || "").trim(),
    enterpriseId: String(log?.enterpriseId || "").trim()
  })) : [],
  channelsByEvent: {
    ticketCreated: Array.isArray(row?.channelsByEvent?.ticketCreated) ? row.channelsByEvent.ticketCreated.map(item => String(item || "").trim()).filter(Boolean) : ["mail"],
    ticketResolved: Array.isArray(row?.channelsByEvent?.ticketResolved) ? row.channelsByEvent.ticketResolved.map(item => String(item || "").trim()).filter(Boolean) : ["mail"],
    ticketCommented: Array.isArray(row?.channelsByEvent?.ticketCommented) ? row.channelsByEvent.ticketCommented.map(item => String(item || "").trim()).filter(Boolean) : ["mail"]
  },
  inAppSettings: normalizeInAppSettings(row?.inAppSettings)
});
const normalizeMailCollector = (row, idx) => ({
  id: row?.id || `collector-${Date.now()}-${idx}`,
  name: String(row?.name || "").trim(),
  enabled: row?.enabled !== false,
  server: String(row?.server || "").trim(),
  protocol: String(row?.protocol || "imap").trim() || "imap",
  security: String(row?.security || "ssl").trim() || "ssl",
  validateCertMode: String(row?.validateCertMode || "no-validate-cert").trim() || "no-validate-cert",
  inboxFolder: String(row?.inboxFolder || "INBOX").trim() || "INBOX",
  port: String(row?.port || "").trim(),
  username: String(row?.username || "").trim(),
  password: String(row?.password || "").trim(),
  acceptedFolder: String(row?.acceptedFolder || "").trim(),
  refusedFolder: String(row?.refusedFolder || "").trim(),
  maxImportSizeMb: Number.isFinite(Number(row?.maxImportSizeMb)) ? Number(row.maxImportSizeMb) : 30,
  useMailDate: row?.useMailDate !== false,
  useReplyToAsRequester: Boolean(row?.useReplyToAsRequester),
  addCcAsFollowers: Boolean(row?.addCcAsFollowers),
  unreadOnly: row?.unreadOnly !== false,
  comments: String(row?.comments || "").trim(),
  checkIntervalMinutes: Number.isFinite(Number(row?.checkIntervalMinutes)) ? Number(row.checkIntervalMinutes) : 5,
  ingestEnabled: row?.ingestEnabled !== false,
  lastCheckedAt: String(row?.lastCheckedAt || "").trim(),
  stats: {
    collected: Math.max(0, Number(row?.stats?.collected) || 0),
    validated: Math.max(0, Number(row?.stats?.validated) || 0),
    ignored: Math.max(0, Number(row?.stats?.ignored) || 0)
  },
  logs: Array.isArray(row?.logs) ? row.logs.map((log, logIdx) => ({
    id: String(log?.id || `collector-log-${Date.now()}-${idx}-${logIdx}`),
    level: String(log?.level || "info"),
    message: String(log?.message || ""),
    createdAt: String(log?.createdAt || new Date().toISOString())
  })) : []
});
export function getTicketAutomationConfig() {
  return cachedConfig;
}
export async function fetchTicketAutomationConfig() {
  try {
    const response = await fetch(`${API_BASE_URL}/tickets/automation-config`, {
      method: "GET",
      credentials: "include",
      headers: {
        "Content-Type": "application/json"
      }
    });
    if (!response.ok) throw new Error("Error loading ticket configuration");
    const payload = await response.json();
    cachedConfig = {
      commentTemplates: Array.isArray(payload?.commentTemplates) ? payload.commentTemplates.map(normalizeTemplate) : getDefaults().commentTemplates,
      macros: Array.isArray(payload?.macros) ? payload.macros.map(normalizeMacro) : getDefaults().macros,
      emailInboxes: Array.isArray(payload?.emailInboxes) ? payload.emailInboxes.map(normalizeEmailInbox) : [],
      exclusionRules: Array.isArray(payload?.exclusionRules) ? payload.exclusionRules.map(normalizeExclusionRule) : [],
      autoReplyRules: Array.isArray(payload?.autoReplyRules) ? payload.autoReplyRules.map(normalizeAutoReplyRule) : [],
      autoReplyTemplate: String(payload?.autoReplyTemplate || getDefaults().autoReplyTemplate),
      notificationSettings: normalizeNotificationSettings(payload?.notificationSettings || payload?.autoReplyRules?.notificationSettings),
      mailCollectors: Array.isArray(payload?.mailCollectors) ? payload.mailCollectors.map(normalizeMailCollector) : [],
      mailCollectSettings: normalizeMailCollectSettings(payload?.mailCollectSettings)
    };
    window.dispatchEvent(new CustomEvent(UPDATE_EVENT));
    return cachedConfig;
  } catch (_error) {
    return cachedConfig;
  }
}
export async function saveTicketAutomationConfig(nextConfig) {
  const sanitized = {
    commentTemplates: Array.isArray(nextConfig?.commentTemplates) ? nextConfig.commentTemplates.map(normalizeTemplate) : [],
    macros: Array.isArray(nextConfig?.macros) ? nextConfig.macros.map(normalizeMacro) : [],
    emailInboxes: Array.isArray(nextConfig?.emailInboxes) ? nextConfig.emailInboxes.map(normalizeEmailInbox) : [],
    exclusionRules: Array.isArray(nextConfig?.exclusionRules) ? nextConfig.exclusionRules.map(normalizeExclusionRule) : [],
    autoReplyRules: Array.isArray(nextConfig?.autoReplyRules) ? nextConfig.autoReplyRules.map(normalizeAutoReplyRule) : [],
    autoReplyTemplate: String(nextConfig?.autoReplyTemplate || ""),
    notificationSettings: normalizeNotificationSettings(nextConfig?.notificationSettings),
    mailCollectors: Array.isArray(nextConfig?.mailCollectors) ? nextConfig.mailCollectors.map(normalizeMailCollector) : [],
    mailCollectSettings: normalizeMailCollectSettings(nextConfig?.mailCollectSettings)
  };
  const response = await fetch(`${API_BASE_URL}/tickets/automation-config`, {
    method: "PUT",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(sanitized)
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload?.error || "Error saving ticket configuration");
  }
  const payload = await response.json().catch(() => sanitized);
  cachedConfig = {
    commentTemplates: Array.isArray(payload?.commentTemplates) ? payload.commentTemplates.map(normalizeTemplate) : sanitized.commentTemplates,
    macros: Array.isArray(payload?.macros) ? payload.macros.map(normalizeMacro) : sanitized.macros,
    emailInboxes: Array.isArray(payload?.emailInboxes) ? payload.emailInboxes.map(normalizeEmailInbox) : sanitized.emailInboxes,
    exclusionRules: Array.isArray(payload?.exclusionRules) ? payload.exclusionRules.map(normalizeExclusionRule) : sanitized.exclusionRules,
    autoReplyRules: Array.isArray(payload?.autoReplyRules) ? payload.autoReplyRules.map(normalizeAutoReplyRule) : sanitized.autoReplyRules,
    autoReplyTemplate: String(payload?.autoReplyTemplate || sanitized.autoReplyTemplate),
    notificationSettings: normalizeNotificationSettings(payload?.notificationSettings || sanitized.notificationSettings),
    mailCollectors: Array.isArray(payload?.mailCollectors) ? payload.mailCollectors.map(normalizeMailCollector) : sanitized.mailCollectors,
    mailCollectSettings: normalizeMailCollectSettings(payload?.mailCollectSettings || sanitized.mailCollectSettings)
  };
  window.dispatchEvent(new CustomEvent(UPDATE_EVENT));
  return cachedConfig;
}
export function subscribeTicketAutomationConfig(onChange) {
  if (typeof onChange !== "function") return () => {};
  const handler = () => onChange(getTicketAutomationConfig());
  window.addEventListener(UPDATE_EVENT, handler);
  return () => window.removeEventListener(UPDATE_EVENT, handler);
}
export async function resetTicketAutomationConfig() {
  const defaults = getDefaults();
  await saveTicketAutomationConfig(defaults);
  return defaults;
}
