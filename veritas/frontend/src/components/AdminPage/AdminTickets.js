import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";
import { toast } from "react-toastify";
import styles from "./AdminTickets.module.css";
import ui from "./AdminUi.module.css";
import s from "./AdminUsers.module.css";
import { Page, SubTabs, Card, Btn, ConfirmModal, EntityStatus, Badge, Pagination } from "./AdminUi";
import { useTablePagination } from "./useTablePagination";
import CollectorFormModal from "./CollectorFormModal";
import CollectorDeleteModal from "./CollectorDeleteModal";
import CollectorLogsModal from "./CollectorLogsModal";
import CollectorFoldersModal from "./CollectorFoldersModal";
import { COLLECTOR_PROVIDER_PRESETS, findCollectorProviderPreset, formatCollectorStatPercent, resolveCollectorEmailStats } from "./collectorConstants";
import { sanitizeHtml } from "../../utils/sanitizeHtml";
import IngestionRuleFormModal from "./IngestionRuleFormModal";
import IngestionRuleTestModal from "./IngestionRuleTestModal";
import IngestionRuleDeleteModal from "./IngestionRuleDeleteModal";
import ScheduledAlertRuleFormModal from "./ScheduledAlertRuleFormModal";
import TicketTemplateFormModal from "./TicketTemplateFormModal";
import MacroFormModal from "./MacroFormModal";
import MacroActionTypePicker from "./MacroActionTypePicker";
import MacroCommentActionEditor from "./MacroCommentActionEditor";
import MultiSuggestPicker from "./MultiSuggestPicker";
import macroModalStyles from "./MacroFormModal.module.css";
import ItilCategoryFormModal from "./ItilCategoryFormModal";
import ItilCategorySectionFormModal from "./ItilCategorySectionFormModal";
import SolutionCatalogEntryModal from "./SolutionCatalogEntryModal";
import NotificationEventFormModal from "./NotificationEventFormModal";
import WebhookFormModal from "./WebhookFormModal";
import { buildDefaultWebhookDraft } from "./webhookConstants";
import { NOTIFICATION_CHANNEL_OPTIONS, WEBHOOK_CHANNEL_ICON_BY_KEY, TEAMS_THEME_COLOR_PRESETS, buildDefaultNotificationEvent, getSourceOption, getElementOption, isSoonElementKey, parseEmailTags } from "./notificationEventConstants";
import { buildDefaultScheduledAlertRule, describeScheduledAlertRule } from "./scheduledAlertConstants";
import AdminTicketViews from "./AdminTicketViews";
import { fetchTeams } from "../../api/teams";
import { buildDefaultExclusionRule, normalizeIngestionAction } from "./ingestionRuleConstants";
import { normalizeExclusionFilterRoot, validateMailFilterRoot } from "../../utils/mailIngestionRules";
import { isCommunityEdition } from "../../config/edition";
import { fetchUsers } from "../../api/users";
import { fetchSettings } from "../../api/settings";
import { fetchClientsList } from "../../api/clients";
import { createTicketCategorySection, createTicketCategory, deleteTicketCategorySection, deleteTicketCategory, fetchTicketCategorySections, fetchTicketCategories, updateTicketCategorySection, updateTicketCategory, fetchSolutionCatalog, createSolutionCatalogEntry, updateSolutionCatalogEntry, deleteSolutionCatalogEntry } from "../../api/tickets";
import API_BASE_URL from "../../config";
import { fetchTicketAutomationConfig, getTicketAutomationConfig, saveTicketAutomationConfig } from "../../utils/ticketAutomationStorage";
import { normalizeMailCollectSettings } from "../../utils/mailCollectSettingsConstants";
import ProFeatureBadge from "../Misc/ProFeature/ProFeatureBadge";
import CommunityFeatureBadge from "../Misc/ProFeature/CommunityFeatureBadge";
import { useVeritasEdition } from "../../hooks/useVeritasEdition";
import { getCommunityTicketMacrosLimit, getCommunityTicketTemplatesLimit } from "../../config/edition";
import { buildDefaultMacroAction, normalizeMacroActionForEditor } from "../../utils/macroActionUtils";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { getAdminDeleteConfirmsCopy } from "./adminModalsI18n";
import { formatSupportSettingsCount, formatSupportSettingsRange, getMacroActionTypes, getMacroBoundedFieldValues, getMacroFieldModeOptions, getMacroFieldOptions, getSupportSettingsViewMeta, getTicketAdminViews } from "./adminSupportSettingsI18n";
import { useAdminSupportSettingsCopy } from "../../hooks/useAdminCopy";
import { useCommonCopy } from "../../hooks/useCommonCopy";
import { interpolate } from "../../i18n/translate";
import { describeLocalizedExclusionRuleFilters, describeLocalizedRuleCollector, getAdminMailCollectCopy, getRuleActionLabel } from "./adminMailCollectI18n";
const TICKET_ADMIN_VIEWS_EXCLUDED = new Set(["notifications", "webhooks", "support-credits", "collectors", "email-ingestion", "scheduled-alerts", "sales-forms"]);
const TICKET_VIEW_META = {
  collectors: {
    title: "Mailboxes to collect",
    description: "IMAP/POP3 connections, fetch frequency and incoming email ingestion logs."
  },
  "email-ingestion": {
    title: "Incoming email routing",
    description: "Rules evaluated in order to create a ticket, ignore a message or reply automatically."
  },
  "scheduled-alerts": {
    title: "Scheduled alerts",
    description: "CRON schedules for contracts, licenses and SLA · notifications via mail or Teams."
  },
  "sales-forms": {
    title: "Professional services & installation forms",
    description: "Request types and fields shown when creating a professional service or installation request."
  },
  "support-credits": {
    title: "Ticket packs",
    description: "Credit companies with prepaid packs, validity dates and usage tracking."
  },
  notifications: {
    title: "Events and history",
    description: "Automatic notification rules, delivery channels and send log."
  },
  webhooks: {
    title: "Webhook endpoints",
    description: "Teams or HTTP connectors used by notifications and announcements."
  }
};
const MESSAGE_VARIABLE_GROUPS = [{
  label: "Dates",
  variables: [{
    key: "{{now.fr}}",
    description: "Current date/time (FR format)"
  }, {
    key: "{{now.date}}",
    description: "Current date (FR format)"
  }, {
    key: "{{now.time}}",
    description: "Current time (FR format)"
  }]
}, {
  label: "Agent",
  variables: [{
    key: "{{agent.id}}",
    description: "ID of the logged-in user triggering the action"
  }, {
    key: "{{agent.username}}",
    description: "Name / username of the current user"
  }, {
    key: "{{agent.email}}",
    description: "Email of the current user"
  }, {
    key: "{{agent.role}}",
    description: "Role of the current user"
  }]
}, {
  label: "Notification context",
  variables: [{
    key: "{{source}}",
    description: "Event source (tickets, company, cyber...)"
  }, {
    key: "{{element}}",
    description: "Trigger element (updated, created, resolved...)"
  }, {
    key: "{{enterpriseId}}",
    description: "Notification company ID"
  }, {
    key: "{{enterpriseName}}",
    description: "Company name (resolved automatically)"
  }, {
    key: "{{daysUntil}}",
    description: "Days remaining (events *_soon)"
  }, {
    key: "{{contractEndDate}}",
    description: "Contract end date (if available)"
  }]
}, {
  label: "Company",
  variables: [{
    key: "{{entreprise.id}}",
    description: "Company ID"
  }, {
    key: "{{entreprise.nom}}",
    description: "Company name"
  }, {
    key: "{{entreprise.siret}}",
    description: "Legal identifier"
  }, {
    key: "{{entreprise.adresse}}",
    description: "Address"
  }, {
    key: "{{entreprise.lieux.0}}",
    description: "First site/location"
  }, {
    key: "{{entreprise.lieuxCount}}",
    description: "Number of sites/locations"
  }, {
    key: "{{entreprise.secteur}}",
    description: "Industry sector"
  }, {
    key: "{{entreprise.contratStatut}}",
    description: "Contract status (Active/Suspended)"
  }, {
    key: "{{entreprise.contratTypeEntreprise}}",
    description: "Company type (if provided)"
  }, {
    key: "{{entreprise.contratDateDebut}}",
    description: "Contract start date"
  }, {
    key: "{{entreprise.contratDateFin}}",
    description: "Contract end date"
  }, {
    key: "{{entreprise.contrat.suspendu}}",
    description: "Contract suspended (bool)"
  }, {
    key: "{{entreprise.options}}",
    description: "Active contract options (text format)"
  }, {
    key: "{{entreprise.modules}}",
    description: "Active monitoring modules (text format)"
  }, {
    key: "{{entreprise.optionsContrat.Curatif}}",
    description: "Curative contract option"
  }, {
    key: "{{entreprise.optionsContrat.Support}}",
    description: "Support contract option"
  }, {
    key: "{{entreprise.optionsContrat.Preventif}}",
    description: "Preventive contract option"
  }, {
    key: "{{entreprise.optionsContrat.Hebergement}}",
    description: "Hosting contract option"
  }, {
    key: "{{entreprise.modulesMonitoring.Internet}}",
    description: "Internet monitoring module"
  }, {
    key: "{{entreprise.modulesMonitoring.Firewall}}",
    description: "Firewall monitoring module"
  }, {
    key: "{{entreprise.modulesMonitoring.Serveurs}}",
    description: "Servers monitoring module"
  }, {
    key: "{{entreprise.modulesMonitoring.Stockage}}",
    description: "Storage monitoring module"
  }, {
    key: "{{entreprise.modulesMonitoring.Switch}}",
    description: "Switch monitoring module"
  }, {
    key: "{{entreprise.modulesMonitoring.BorneWifi}}",
    description: "WiFi AP monitoring module"
  }, {
    key: "{{entreprise.modulesMonitoring.Antivirus}}",
    description: "Antivirus monitoring module"
  }, {
    key: "{{entreprise.modulesMonitoring.Antispam}}",
    description: "Antispam monitoring module"
  }, {
    key: "{{entreprise.modulesMonitoring.NDD}}",
    description: "Domain names monitoring module"
  }, {
    key: "{{entreprise.modulesMonitoring.Office365}}",
    description: "Office 365 monitoring module"
  }, {
    key: "{{entreprise.modulesMonitoring.Sauvegarde}}",
    description: "Backup monitoring module"
  }, {
    key: "{{entreprise.infra.internetCount}}",
    description: "Internet connection count"
  }, {
    key: "{{entreprise.infra.firewallCount}}",
    description: "Firewall count"
  }, {
    key: "{{entreprise.infra.serverCount}}",
    description: "Server count"
  }, {
    key: "{{entreprise.infra.storageCount}}",
    description: "Storage count"
  }, {
    key: "{{entreprise.infra.switchCount}}",
    description: "Switch count"
  }, {
    key: "{{entreprise.infra.wifiCount}}",
    description: "Wi-Fi AP count"
  }, {
    key: "{{entreprise.cyber.antivirusCount}}",
    description: "Antivirus count"
  }, {
    key: "{{entreprise.cyber.antispamCount}}",
    description: "Antispam count"
  }, {
    key: "{{entreprise.cyber.backupCount}}",
    description: "Backup count"
  }, {
    key: "{{entreprise.services.domainCount}}",
    description: "Domain name count"
  }, {
    key: "{{entreprise.services.domainNames.0}}",
    description: "First domain name"
  }, {
    key: "{{entreprise.services.tenantCount}}",
    description: "Microsoft tenant count"
  }, {
    key: "{{entreprise.services.tenantNames.0}}",
    description: "First Microsoft tenant"
  }, {
    key: "{{entreprise.commercial.username}}",
    description: "Sales rep (name)"
  }, {
    key: "{{entreprise.commercial.email}}",
    description: "Sales rep (email)"
  }]
}, {
  label: "Ticket",
  variables: [{
    key: "{{ticket.id}}",
    description: "ID ticket"
  }, {
    key: "{{ticket.ticket_number}}",
    description: "Ticket number"
  }, {
    key: "{{ticket.title}}",
    description: "Ticket title"
  }, {
    key: "{{ticket.status}}",
    description: "Ticket status"
  }, {
    key: "{{oldStatus}}",
    description: "Previous ticket status (status change)"
  }, {
    key: "{{newStatus}}",
    description: "New ticket status (status change)"
  }]
}, {
  label: "Contact",
  variables: [{
    key: "{{contact.id}}",
    description: "Contact ID"
  }, {
    key: "{{contact.nom}}",
    description: "Contact last name"
  }, {
    key: "{{contact.prenom}}",
    description: "Contact first name"
  }, {
    key: "{{contact.email}}",
    description: "Contact email"
  }, {
    key: "{{contact.telephone}}",
    description: "Contact phone"
  }, {
    key: "{{contact.poste}}",
    description: "Contact job title"
  }]
}, {
  label: "Cyber campaign",
  variables: [{
    key: "{{campaign.id}}",
    description: "Campaign ID"
  }, {
    key: "{{campaign.name}}",
    description: "Campaign name"
  }, {
    key: "{{campaign.status}}",
    description: "Campaign status"
  }, {
    key: "{{campaign.start_date}}",
    description: "Campaign start date"
  }, {
    key: "{{campaign.end_date}}",
    description: "Campaign end date"
  }]
}, {
  label: "Report",
  variables: [{
    key: "{{report.id}}",
    description: "Report ID"
  }, {
    key: "{{report.name}}",
    description: "Report name"
  }, {
    key: "{{report.report_period}}",
    description: "Report period"
  }, {
    key: "{{report.client_name}}",
    description: "Report client name"
  }]
}, {
  label: "Equipment",
  variables: [{
    key: "{{material.name}}",
    description: "Equipment name"
  }, {
    key: "{{material.id}}",
    description: "Equipment ID"
  }, {
    key: "{{material.type}}",
    description: "Equipment type"
  }]
}, {
  label: "Technical fields",
  variables: [{
    key: "{{changedFields.0}}",
    description: "1st changed field"
  }, {
    key: "{{changedFields.1}}",
    description: "2nd changed field"
  }, {
    key: "{{changes.0.field}}",
    description: "Name of the 1st detailed field"
  }, {
    key: "{{changes.0.oldValue}}",
    description: "Old value of the 1st change"
  }, {
    key: "{{changes.0.newValue}}",
    description: "New value of the 1st change"
  }]
}, {
  label: "Variables legacy template",
  variables: [{
    key: "{{agent.username}}",
    description: "Logged-in agent username"
  }, {
    key: "{{agent.email}}",
    description: "Logged-in agent email address"
  }, {
    key: "{{demandeur.prenom}}",
    description: "Requester first name (legacy)"
  }, {
    key: "{{demandeur.nom_complet}}",
    description: "Requester full name (legacy)"
  }, {
    key: "{{ticket.numero}}",
    description: "Ticket number (legacy)"
  }, {
    key: "{{ticket.titre}}",
    description: "Ticket title (legacy)"
  }, {
    key: "{{ticket.statut}}",
    description: "Ticket status FR (legacy)"
  }]
}];
const MESSAGE_VARIABLE_GROUPS_SORTED = [...MESSAGE_VARIABLE_GROUPS].sort((a, b) => String(a?.label || "").localeCompare(String(b?.label || ""), "fr", {
  sensitivity: "base"
}));
const GENERIC_VARIABLE_SECTION_LABELS = ["Notification context", "Dates", "Agent"];
const resolveNotificationVariableSectionLabels = (sourceKey, elementKey) => {
  const source = String(sourceKey || "").trim().toLowerCase();
  const element = String(elementKey || "").trim().toLowerCase();
  const labels = new Set(GENERIC_VARIABLE_SECTION_LABELS);
  if (source === "entreprise") labels.add("Company");
  if (source === "contact") {
    labels.add("Contact");
    labels.add("Company");
  }
  if (source === "tickets") {
    labels.add("Ticket");
    labels.add("Company");
  }
  if (source === "cyber") {
    labels.add("Cyber campaign");
    labels.add("Company");
  }
  if (source === "rapport") {
    labels.add("Report");
    labels.add("Company");
  }
  if (source === "infrastructure") {
    labels.add("Equipment");
    labels.add("Company");
  }
  if (source === "services") labels.add("Company");
  if (element.includes("updated")) {
    labels.add("Technical fields");
  }
  return labels;
};
const pickMacroOptionLabel = (options, value) => (options || []).find(opt => String(opt.value) === String(value))?.label || String(value || "").trim() || "-";
const truncateMacroText = (text, max = 48) => {
  const raw = String(text || "").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
  if (!raw) return "";
  return raw.length <= max ? raw : `${raw.slice(0, max - 1)}…`;
};
const buildDefaultCollector = () => ({
  id: `collector-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
  name: "",
  enabled: true,
  server: "",
  protocol: "imap",
  security: "ssl",
  validateCertMode: "no-validate-cert",
  inboxFolder: "INBOX",
  port: "",
  username: "",
  password: "",
  acceptedFolder: "",
  refusedFolder: "",
  unreadOnly: true,
  checkIntervalMinutes: 5,
  ingestEnabled: true,
  logs: [],
  stats: {
    collected: 0,
    validated: 0,
    ignored: 0
  }
});
const ensureUniqueCollectorIds = (collectors = []) => {
  const seen = new Set();
  return (Array.isArray(collectors) ? collectors : []).map((collector, idx) => {
    const rawId = String(collector?.id || "").trim();
    const baseId = rawId || `collector-${Date.now()}-${idx}-${Math.random().toString(16).slice(2, 8)}`;
    if (!seen.has(baseId)) {
      seen.add(baseId);
      return {
        ...collector,
        id: baseId
      };
    }
    const nextId = `${baseId}-${idx}-${Math.random().toString(16).slice(2, 6)}`;
    seen.add(nextId);
    return {
      ...collector,
      id: nextId
    };
  });
};
const parseCsvIds = raw => String(raw || "").split(",").map(item => item.trim()).filter(Boolean);
const stringifyAgentIds = ids => ids.map(id => String(id).trim()).filter(Boolean).join(",");
const buildDefaultNotificationSettings = () => ({
  onTicketCreated: false,
  onTicketResolved: false,
  onTicketCommented: false,
  eventToggles: {
    ticketAutoReply: false,
    ticketCreated: false,
    ticketResolved: false,
    ticketCommented: false
  },
  webhooks: [],
  notificationEvents: []
});
export default function AdminTickets({
  isCommunity = false,
  restrictedView = null
}) {
  const locale = useAppLocale();
  const mc = useMemo(() => getAdminMailCollectCopy(locale), [locale]);
  const ss = useAdminSupportSettingsCopy();
  const entityStatusLabels = useMemo(() => ({
    activeLabel: ss.common.statusActive,
    inactiveLabel: ss.common.statusInactive
  }), [ss.common.statusActive, ss.common.statusInactive]);
  const formatTableRange = useCallback((start, end, total) => formatSupportSettingsRange(locale, start, end, total), [locale]);
  const deleteCopy = useMemo(() => getAdminDeleteConfirmsCopy(locale), [locale]);
  const common = useCommonCopy();
  const supportViewMeta = useMemo(() => getSupportSettingsViewMeta(locale), [locale]);
  const macroActionTypes = useMemo(() => getMacroActionTypes(locale), [locale]);
  const macroFieldOptions = useMemo(() => getMacroFieldOptions(locale), [locale]);
  const macroFieldModeOptions = useMemo(() => getMacroFieldModeOptions(locale), [locale]);
  const macroBoundedFieldValues = useMemo(() => getMacroBoundedFieldValues(locale), [locale]);
  const {
    limits
  } = useVeritasEdition();
  const maxTemplates = isCommunity ? getCommunityTicketTemplatesLimit(limits) : null;
  const maxMacros = isCommunity ? getCommunityTicketMacrosLimit(limits) : null;
  const ticketAdminViews = useMemo(() => restrictedView ? [] : getTicketAdminViews(locale).filter(view => !TICKET_ADMIN_VIEWS_EXCLUDED.has(view.key)), [restrictedView, locale]);
  const allowedTicketViews = useMemo(() => restrictedView ? [restrictedView] : ticketAdminViews.map(view => view.key), [restrictedView, ticketAdminViews]);
  const [activeView, setActiveView] = useState(restrictedView || "templates");
  useEffect(() => {
    if (restrictedView) {
      setActiveView(restrictedView);
      return;
    }
    try {
      const storedView = sessionStorage.getItem("veritas_admin_ticket_view");
      if (!storedView) return;
      sessionStorage.removeItem("veritas_admin_ticket_view");
      if (allowedTicketViews.includes(storedView)) {
        setActiveView(storedView);
      }
    } catch {}
  }, [allowedTicketViews, restrictedView]);
  useEffect(() => {
    if (restrictedView) {
      if (activeView !== restrictedView) setActiveView(restrictedView);
      return;
    }
    if (!allowedTicketViews.includes(activeView)) {
      setActiveView(allowedTicketViews[0] || "templates");
    }
  }, [activeView, allowedTicketViews, restrictedView]);
  const [ticketCategories, setTicketCategories] = useState([]);
  const [ticketCategorySections, setTicketCategorySections] = useState([]);
  const [sectionSearch, setSectionSearch] = useState("");
  const [categorySearch, setCategorySearch] = useState("");
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showCategorySectionModal, setShowCategorySectionModal] = useState(false);
  const [categorySectionModalMode, setCategorySectionModalMode] = useState("create");
  const [editingCategorySectionId, setEditingCategorySectionId] = useState(null);
  const [categorySectionDraft, setCategorySectionDraft] = useState({
    name: "",
    description: "",
    enabled: true
  });
  const [categoryModalMode, setCategoryModalMode] = useState("create");
  const [editingCategoryId, setEditingCategoryId] = useState(null);
  const [categoryDraft, setCategoryDraft] = useState({
    section: "",
    name: "",
    description: "",
    enabled: true
  });
  const [categoryDeleteTarget, setCategoryDeleteTarget] = useState(null);
  const [categorySectionDeleteTarget, setCategorySectionDeleteTarget] = useState(null);
  const [deletingCategory, setDeletingCategory] = useState(false);
  const [deletingCategorySection, setDeletingCategorySection] = useState(false);
  const [solutionCatalogEntries, setSolutionCatalogEntries] = useState([]);
  const [solutionInterventionSearch, setSolutionInterventionSearch] = useState("");
  const [solutionActionSearch, setSolutionActionSearch] = useState("");
  const [showSolutionCatalogModal, setShowSolutionCatalogModal] = useState(false);
  const [solutionCatalogModalMode, setSolutionCatalogModalMode] = useState("create");
  const [editingSolutionCatalogId, setEditingSolutionCatalogId] = useState(null);
  const [solutionCatalogDraft, setSolutionCatalogDraft] = useState({
    category: "intervention",
    label: "",
    displayOrder: 0,
    isActive: true
  });
  const [savingSolutionCatalogEntry, setSavingSolutionCatalogEntry] = useState(false);
  const [solutionCatalogDeleteTarget, setSolutionCatalogDeleteTarget] = useState(null);
  const [deletingSolutionCatalogEntry, setDeletingSolutionCatalogEntry] = useState(false);
  const [commentTemplates, setCommentTemplates] = useState(() => getTicketAutomationConfig().commentTemplates || []);
  const [macros, setMacros] = useState(() => getTicketAutomationConfig().macros || []);
  const templatesAtLimit = maxTemplates != null && commentTemplates.length >= maxTemplates;
  const macrosAtLimit = maxMacros != null && macros.length >= maxMacros;
  const filteredCategorySections = useMemo(() => {
    const q = sectionSearch.trim().toLowerCase();
    if (!q) return ticketCategorySections;
    return ticketCategorySections.filter(section => `${section.name || ""} ${section.description || ""}`.toLowerCase().includes(q));
  }, [ticketCategorySections, sectionSearch]);
  const filteredTicketCategories = useMemo(() => {
    const q = categorySearch.trim().toLowerCase();
    if (!q) return ticketCategories;
    return ticketCategories.filter(category => `${category.section || ""} ${category.name || ""} ${category.description || ""}`.toLowerCase().includes(q));
  }, [ticketCategories, categorySearch]);
  const templatesPagination = useTablePagination(commentTemplates, {
    rangeFormatter: formatTableRange
  });
  const macrosPagination = useTablePagination(macros, {
    rangeFormatter: formatTableRange
  });
  const categorySectionsPagination = useTablePagination(filteredCategorySections, {
    resetDeps: [sectionSearch],
    rangeFormatter: formatTableRange
  });
  const categoriesPagination = useTablePagination(filteredTicketCategories, {
    resetDeps: [categorySearch],
    rangeFormatter: formatTableRange
  });
  const filteredSolutionInterventions = useMemo(() => {
    const q = solutionInterventionSearch.trim().toLowerCase();
    const rows = solutionCatalogEntries.filter(entry => entry.category === "intervention");
    if (!q) return rows;
    return rows.filter(entry => String(entry.label || "").toLowerCase().includes(q));
  }, [solutionCatalogEntries, solutionInterventionSearch]);
  const filteredSolutionActions = useMemo(() => {
    const q = solutionActionSearch.trim().toLowerCase();
    const rows = solutionCatalogEntries.filter(entry => entry.category === "action");
    if (!q) return rows;
    return rows.filter(entry => String(entry.label || "").toLowerCase().includes(q));
  }, [solutionCatalogEntries, solutionActionSearch]);
  const solutionInterventionsPagination = useTablePagination(filteredSolutionInterventions, {
    resetDeps: [solutionInterventionSearch],
    rangeFormatter: formatTableRange
  });
  const solutionActionsPagination = useTablePagination(filteredSolutionActions, {
    resetDeps: [solutionActionSearch],
    rangeFormatter: formatTableRange
  });
  const [emailInboxes, setEmailInboxes] = useState(() => getTicketAutomationConfig().emailInboxes || []);
  const [mailCollectors, setMailCollectors] = useState(() => getTicketAutomationConfig().mailCollectors || []);
  const [exclusionRules, setExclusionRules] = useState(() => getTicketAutomationConfig().exclusionRules || []);
  const [autoReplyRules, setAutoReplyRules] = useState(() => getTicketAutomationConfig().autoReplyRules || []);
  const [autoReplyTemplate, setAutoReplyTemplate] = useState(() => getTicketAutomationConfig().autoReplyTemplate || "");
  const [notificationSettings, setNotificationSettings] = useState(() => getTicketAutomationConfig().notificationSettings || buildDefaultNotificationSettings());
  const [availableClients, setAvailableClients] = useState([]);
  const [scheduledAlertRules, setScheduledAlertRules] = useState(() => getTicketAutomationConfig().scheduledAlertRules || []);
  const [availableAgents, setAvailableAgents] = useState([]);
  const [ticketViewProfiles, setTicketViewProfiles] = useState([]);
  const [ticketViewUsers, setTicketViewUsers] = useState([]);
  const [ticketViewTeams, setTicketViewTeams] = useState([]);
  const [isTeamsIntegrationActive, setIsTeamsIntegrationActive] = useState(false);
  const [showScheduledAlertModal, setShowScheduledAlertModal] = useState(false);
  const [scheduledAlertModalMode, setScheduledAlertModalMode] = useState("create");
  const [editingScheduledAlertId, setEditingScheduledAlertId] = useState(null);
  const [scheduledAlertDraft, setScheduledAlertDraft] = useState(buildDefaultScheduledAlertRule());
  const [savingScheduledAlert, setSavingScheduledAlert] = useState(false);
  const [scheduledAlertDeleteTarget, setScheduledAlertDeleteTarget] = useState(null);
  const [templateDeleteTarget, setTemplateDeleteTarget] = useState(null);
  const [macroDeleteTarget, setMacroDeleteTarget] = useState(null);
  const [deletingTemplate, setDeletingTemplate] = useState(false);
  const [deletingMacro, setDeletingMacro] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showMessageVariablesModal, setShowMessageVariablesModal] = useState(false);
  const [messageVariablesModalTarget, setMessageVariablesModalTarget] = useState("template");
  const [activeVariableSection, setActiveVariableSection] = useState("");
  const variableSectionRefs = useRef({});
  const [templateModalMode, setTemplateModalMode] = useState("create");
  const [editingTemplateId, setEditingTemplateId] = useState(null);
  const [templateDraft, setTemplateDraft] = useState({
    name: "",
    content: ""
  });
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [savingMacro, setSavingMacro] = useState(false);
  const [savingCategory, setSavingCategory] = useState(false);
  const [savingCategorySection, setSavingCategorySection] = useState(false);
  const [showTemplatePreviewModal, setShowTemplatePreviewModal] = useState(false);
  const [templatePreviewTarget, setTemplatePreviewTarget] = useState(null);
  const templateEditorRef = useRef(null);
  const templateImageInputRef = useRef(null);
  const selectedTemplateImageRef = useRef(null);
  const [selectedImageWidthPx, setSelectedImageWidthPx] = useState("");
  const [showMacroModal, setShowMacroModal] = useState(false);
  const [macroModalMode, setMacroModalMode] = useState("create");
  const [editingMacroId, setEditingMacroId] = useState(null);
  const [macroDraft, setMacroDraft] = useState({
    name: "",
    actions: [buildDefaultMacroAction()]
  });
  const [showCollectorModal, setShowCollectorModal] = useState(false);
  const [collectorModalMode, setCollectorModalMode] = useState("create");
  const [editingCollectorId, setEditingCollectorId] = useState(null);
  const [collectorDraft, setCollectorDraft] = useState(buildDefaultCollector());
  const [collectorProviderKey, setCollectorProviderKey] = useState("");
  const [savingCollector, setSavingCollector] = useState(false);
  const [collectorDeleteTarget, setCollectorDeleteTarget] = useState(null);
  const [deletingCollector, setDeletingCollector] = useState(false);
  const [testingCollectorConnection, setTestingCollectorConnection] = useState(false);
  const [foldersModalOpen, setFoldersModalOpen] = useState(false);
  const [foldersModalTargetField, setFoldersModalTargetField] = useState("inboxFolder");
  const [collectorAvailableFolders, setCollectorAvailableFolders] = useState([]);
  const [loadingCollectorFolders, setLoadingCollectorFolders] = useState(false);
  const [logsModalOpen, setLogsModalOpen] = useState(false);
  const [logsCollectorName, setLogsCollectorName] = useState("");
  const [logsModalRows, setLogsModalRows] = useState([]);
  const [forcingCollectorId, setForcingCollectorId] = useState("");
  const [showExclusionRuleModal, setShowExclusionRuleModal] = useState(false);
  const [exclusionRuleModalMode, setExclusionRuleModalMode] = useState("create");
  const [editingExclusionRuleId, setEditingExclusionRuleId] = useState(null);
  const [exclusionRuleDraft, setExclusionRuleDraft] = useState(buildDefaultExclusionRule());
  const [savingExclusionRule, setSavingExclusionRule] = useState(false);
  const [exclusionRuleDeleteTarget, setExclusionRuleDeleteTarget] = useState(null);
  const [deletingExclusionRule, setDeletingExclusionRule] = useState(false);
  const [showRulesTestModal, setShowRulesTestModal] = useState(false);
  const [testingRules, setTestingRules] = useState(false);
  const [rulesTestResult, setRulesTestResult] = useState(null);
  const [rulesTestDraft, setRulesTestDraft] = useState({
    subject: "",
    body: "",
    fromAddress: "",
    fromName: "",
    collectorId: ""
  });
  const [showNotificationEventModal, setShowNotificationEventModal] = useState(false);
  const [notificationEventModalMode, setNotificationEventModalMode] = useState("create");
  const [editingNotificationEventId, setEditingNotificationEventId] = useState(null);
  const [notificationEventDraft, setNotificationEventDraft] = useState(buildDefaultNotificationEvent());
  const [savingNotificationEvent, setSavingNotificationEvent] = useState(false);
  const [showCustomNotificationModal, setShowCustomNotificationModal] = useState(false);
  const [customNotificationDraft, setCustomNotificationDraft] = useState({
    webhookId: "",
    title: "",
    message: "",
    teamsThemeColor: "#13BA8E"
  });
  const [sendingCustomNotification, setSendingCustomNotification] = useState(false);
  const [showCustomNotificationPreview, setShowCustomNotificationPreview] = useState(false);
  const customNotificationEditorRef = useRef(null);
  const visibleMessageVariableGroups = messageVariablesModalTarget === "notification" ? MESSAGE_VARIABLE_GROUPS_SORTED.filter(group => resolveNotificationVariableSectionLabels(notificationEventDraft.source || "tickets", notificationEventDraft.element || "updated").has(group.label)) : MESSAGE_VARIABLE_GROUPS_SORTED;
  const notificationEventEditorRef = useRef(null);
  const [showWebhookModal, setShowWebhookModal] = useState(false);
  const [webhookModalMode, setWebhookModalMode] = useState("create");
  const [editingWebhookId, setEditingWebhookId] = useState(null);
  const [webhookDraft, setWebhookDraft] = useState(buildDefaultWebhookDraft());
  const [savingWebhook, setSavingWebhook] = useState(false);
  const [testingWebhookConnection, setTestingWebhookConnection] = useState(false);
  const [webhookTestMessage, setWebhookTestMessage] = useState("");
  const [webhookTestStatus, setWebhookTestStatus] = useState(null);
  const [testingWebhookId, setTestingWebhookId] = useState("");
  const [retryingNotificationLogId, setRetryingNotificationLogId] = useState("");
  const [notificationLogsPage, setNotificationLogsPage] = useState(1);
  const notificationLogsPerPage = 10;
  const loadTicketCategoriesAdmin = async () => {
    try {
      const rows = await fetchTicketCategories();
      setTicketCategories(Array.isArray(rows) ? rows : []);
    } catch (error) {
      toast.error(error?.message || ss.categories.toast.categoriesLoadError);
      setTicketCategories([]);
    }
  };
  const loadTicketCategorySectionsAdmin = async () => {
    try {
      const rows = await fetchTicketCategorySections();
      setTicketCategorySections(Array.isArray(rows) ? rows : []);
    } catch (error) {
      toast.error(error?.message || ss.categories.toast.sectionsLoadError);
      setTicketCategorySections([]);
    }
  };
  const loadSolutionCatalogAdmin = async () => {
    try {
      const rows = await fetchSolutionCatalog({
        includeInactive: true
      });
      setSolutionCatalogEntries(Array.isArray(rows) ? rows : []);
    } catch (error) {
      toast.error(error?.message || ss.solutions.toast.loadError);
      setSolutionCatalogEntries([]);
    }
  };
  useEffect(() => {
    let isMounted = true;
    fetchTicketAutomationConfig().then(config => {
      if (!isMounted) return;
      setCommentTemplates(Array.isArray(config?.commentTemplates) ? config.commentTemplates : []);
      setMacros(Array.isArray(config?.macros) ? config.macros : []);
      setEmailInboxes(Array.isArray(config?.emailInboxes) ? config.emailInboxes : []);
      setMailCollectors(ensureUniqueCollectorIds(Array.isArray(config?.mailCollectors) ? config.mailCollectors : []));
      setExclusionRules(Array.isArray(config?.exclusionRules) ? config.exclusionRules : []);
      setAutoReplyRules(Array.isArray(config?.autoReplyRules) ? config.autoReplyRules : []);
      setAutoReplyTemplate(String(config?.autoReplyTemplate || ""));
      setNotificationSettings(config?.notificationSettings || buildDefaultNotificationSettings());
      setScheduledAlertRules(Array.isArray(config?.scheduledAlertRules) ? config.scheduledAlertRules : []);
    }).catch(error => {
      toast.error(error?.message || ss.templates.toast.loadError);
    });
    return () => {
      isMounted = false;
    };
  }, []);
  useEffect(() => {
    loadTicketCategoriesAdmin();
    loadTicketCategorySectionsAdmin();
    loadSolutionCatalogAdmin();
  }, []);
  useEffect(() => {
    let isMounted = true;
    fetchClientsList().then(rows => {
      if (!isMounted) return;
      setAvailableClients(Array.isArray(rows) ? rows : []);
    }).catch(() => {
      if (!isMounted) return;
      setAvailableClients([]);
    });
    return () => {
      isMounted = false;
    };
  }, []);
  useEffect(() => {
    let isMounted = true;
    fetchSettings().then(rows => {
      if (!isMounted) return;
      const settingsObject = Array.isArray(rows) ? rows.reduce((acc, row) => {
        const key = row?.key;
        if (!key) return acc;
        acc[key] = row?.value ?? "";
        return acc;
      }, {}) : {};
      const enabledCandidates = [settingsObject.TEAMS_ENABLED, settingsObject.MICROSOFT_TEAMS_ENABLED, settingsObject.TEAMS_INTEGRATION_ENABLED];
      const hasEnabledFlag = enabledCandidates.some(raw => ["1", "true", "yes", "on"].includes(String(raw || "").toLowerCase()));
      const hasTeamsEndpoint = Boolean(String(settingsObject.TEAMS_WEBHOOK_URL || settingsObject.MICROSOFT_TEAMS_WEBHOOK_URL || "").trim());
      setIsTeamsIntegrationActive(Boolean(hasEnabledFlag || hasTeamsEndpoint));
    }).catch(() => {
      setIsTeamsIntegrationActive(false);
    });
    return () => {
      isMounted = false;
    };
  }, []);
  useEffect(() => {
    let isMounted = true;
    fetch(`${API_BASE_URL}/profiles`, {
      credentials: "include"
    }).then(res => res.ok ? res.json() : []).then(data => {
      if (!isMounted) return;
      const raw = Array.isArray(data) ? data : data.profiles || [];
      setTicketViewProfiles(raw);
    }).catch(() => {
      if (isMounted) setTicketViewProfiles([]);
    });
    fetchTeams().then(rows => {
      if (!isMounted) return;
      setTicketViewTeams(Array.isArray(rows) ? rows : []);
    }).catch(() => {
      if (isMounted) setTicketViewTeams([]);
    });
    return () => {
      isMounted = false;
    };
  }, []);
  useEffect(() => {
    let isMounted = true;
    fetchUsers().then(users => {
      if (!isMounted) return;
      const normalizedUsers = Array.isArray(users) ? users.filter(user => user?.is_active !== false).map(user => ({
        id: String(user?.id || "").trim(),
        label: String(user?.username || "").trim() || String(user?.email || "").trim() || String(user?.id || "").trim()
      })).filter(user => user.id) : [];
      setAvailableAgents(normalizedUsers);
      setTicketViewUsers(Array.isArray(users) ? users : []);
    }).catch(() => {
      if (isMounted) {
        setAvailableAgents([]);
        setTicketViewUsers([]);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);
  const persist = async (nextTemplates, nextMacros, nextInboxes, nextExclusions, nextAutoReplyRules, nextAutoReplyTemplate, successMessage, nextScheduledAlertRules, nextMailCollectors, nextNotificationSettings) => {
    const saved = await saveTicketAutomationConfig({
      commentTemplates: nextTemplates,
      macros: nextMacros,
      emailInboxes: Array.isArray(nextInboxes) ? nextInboxes : emailInboxes,
      exclusionRules: Array.isArray(nextExclusions) ? nextExclusions : exclusionRules,
      autoReplyRules: Array.isArray(nextAutoReplyRules) ? nextAutoReplyRules : autoReplyRules,
      autoReplyTemplate: String(typeof nextAutoReplyTemplate === "string" ? nextAutoReplyTemplate : autoReplyTemplate),
      notificationSettings: typeof nextNotificationSettings === "object" && nextNotificationSettings ? nextNotificationSettings : notificationSettings,
      scheduledAlertRules: Array.isArray(nextScheduledAlertRules) ? nextScheduledAlertRules : scheduledAlertRules,
      mailCollectors: Array.isArray(nextMailCollectors) ? nextMailCollectors : mailCollectors,
      mailCollectSettings: normalizeMailCollectSettings(getTicketAutomationConfig()?.mailCollectSettings)
    });
    if (saved?.notificationSettings) {
      setNotificationSettings(saved.notificationSettings);
    }
    if (successMessage) {
      toast.success(successMessage);
    }
    return saved;
  };
  const openCreateCategoryModal = () => {
    setCategoryModalMode("create");
    setEditingCategoryId(null);
    setCategoryDraft({
      section: String(ticketCategorySections?.[0]?.name || ss.categories.uncategorized),
      name: "",
      description: "",
      enabled: true
    });
    setShowCategoryModal(true);
  };
  const openEditCategoryModal = category => {
    setCategoryModalMode("edit");
    setEditingCategoryId(String(category?.id || ""));
    setCategoryDraft({
      section: String(category?.section || ""),
      name: String(category?.name || ""),
      description: String(category?.description || ""),
      enabled: category?.enabled !== false
    });
    setShowCategoryModal(true);
  };
  const closeCategoryModal = () => {
    setShowCategoryModal(false);
    setEditingCategoryId(null);
    setCategoryDraft({
      section: "",
      name: "",
      description: "",
      enabled: true
    });
  };
  const saveCategoryFromModal = async () => {
    const name = String(categoryDraft?.name || "").trim();
    if (!name) {
      toast.error(ss.categories.toast.categoryNameRequired);
      return;
    }
    setSavingCategory(true);
    try {
      if (categoryModalMode === "create") {
        await createTicketCategory({
          section: String(categoryDraft?.section || "").trim() || ss.categories.uncategorized,
          name,
          description: String(categoryDraft?.description || "").trim(),
          enabled: categoryDraft?.enabled !== false
        });
        toast.success(ss.categories.toast.categoryAdded);
      } else {
        await updateTicketCategory(editingCategoryId, {
          section: String(categoryDraft?.section || "").trim() || ss.categories.uncategorized,
          name,
          description: String(categoryDraft?.description || "").trim(),
          enabled: categoryDraft?.enabled !== false
        });
        toast.success(ss.categories.toast.categoryUpdated);
      }
      await loadTicketCategoriesAdmin();
      closeCategoryModal();
    } catch (error) {
      toast.error(error?.message || ss.categories.toast.categorySaveError);
    } finally {
      setSavingCategory(false);
    }
  };
  const removeCategory = async categoryId => {
    await deleteTicketCategory(categoryId);
    toast.success(ss.categories.toast.categoryDeleted);
    await loadTicketCategoriesAdmin();
  };
  const confirmRemoveCategory = async () => {
    if (!categoryDeleteTarget?.id) return;
    setDeletingCategory(true);
    try {
      await removeCategory(categoryDeleteTarget.id);
      setCategoryDeleteTarget(null);
    } catch (error) {
      toast.error(error?.message || ss.categories.toast.categoryDeleteError);
    } finally {
      setDeletingCategory(false);
    }
  };
  const openCreateSolutionCatalogModal = category => {
    const rows = solutionCatalogEntries.filter(entry => entry.category === category);
    const maxOrder = rows.reduce((max, entry) => Math.max(max, Number(entry.displayOrder) || 0), 0);
    setSolutionCatalogModalMode("create");
    setEditingSolutionCatalogId(null);
    setSolutionCatalogDraft({
      category,
      label: "",
      displayOrder: maxOrder + 10,
      isActive: true
    });
    setShowSolutionCatalogModal(true);
  };
  const openEditSolutionCatalogModal = entry => {
    setSolutionCatalogModalMode("edit");
    setEditingSolutionCatalogId(String(entry?.id || ""));
    setSolutionCatalogDraft({
      category: entry?.category || "intervention",
      label: String(entry?.label || ""),
      displayOrder: Number(entry?.displayOrder) || 0,
      isActive: entry?.isActive !== false
    });
    setShowSolutionCatalogModal(true);
  };
  const closeSolutionCatalogModal = () => {
    setShowSolutionCatalogModal(false);
    setEditingSolutionCatalogId(null);
    setSolutionCatalogDraft({
      category: "intervention",
      label: "",
      displayOrder: 0,
      isActive: true
    });
  };
  const saveSolutionCatalogFromModal = async () => {
    const label = String(solutionCatalogDraft?.label || "").trim();
    if (!label) {
      toast.error(ss.solutions.toast.labelRequired);
      return;
    }
    setSavingSolutionCatalogEntry(true);
    try {
      if (solutionCatalogModalMode === "create") {
        await createSolutionCatalogEntry({
          category: solutionCatalogDraft.category,
          label,
          displayOrder: Number(solutionCatalogDraft.displayOrder) || 0,
          isActive: solutionCatalogDraft.isActive !== false
        });
        toast.success(ss.solutions.toast.added);
      } else {
        await updateSolutionCatalogEntry(editingSolutionCatalogId, {
          label,
          displayOrder: Number(solutionCatalogDraft.displayOrder) || 0,
          isActive: solutionCatalogDraft.isActive !== false
        });
        toast.success(ss.solutions.toast.updated);
      }
      await loadSolutionCatalogAdmin();
      closeSolutionCatalogModal();
    } catch (error) {
      toast.error(error?.message || ss.solutions.toast.saveError);
    } finally {
      setSavingSolutionCatalogEntry(false);
    }
  };
  const confirmRemoveSolutionCatalogEntry = async () => {
    if (!solutionCatalogDeleteTarget?.id) return;
    setDeletingSolutionCatalogEntry(true);
    try {
      await deleteSolutionCatalogEntry(solutionCatalogDeleteTarget.id);
      toast.success(ss.solutions.toast.deleted);
      setSolutionCatalogDeleteTarget(null);
      await loadSolutionCatalogAdmin();
    } catch (error) {
      toast.error(error?.message || ss.solutions.toast.deleteError);
    } finally {
      setDeletingSolutionCatalogEntry(false);
    }
  };
  const openCreateCategorySectionModal = () => {
    setCategorySectionModalMode("create");
    setEditingCategorySectionId(null);
    setCategorySectionDraft({
      name: "",
      description: "",
      enabled: true
    });
    setShowCategorySectionModal(true);
  };
  const openEditCategorySectionModal = section => {
    setCategorySectionModalMode("edit");
    setEditingCategorySectionId(String(section?.id || ""));
    setCategorySectionDraft({
      name: String(section?.name || ""),
      description: String(section?.description || ""),
      enabled: section?.enabled !== false
    });
    setShowCategorySectionModal(true);
  };
  const closeCategorySectionModal = () => {
    setShowCategorySectionModal(false);
    setEditingCategorySectionId(null);
    setCategorySectionDraft({
      name: "",
      description: "",
      enabled: true
    });
  };
  const saveCategorySectionFromModal = async () => {
    const name = String(categorySectionDraft?.name || "").trim();
    if (!name) {
      toast.error(ss.categories.toast.sectionNameRequired);
      return;
    }
    setSavingCategorySection(true);
    try {
      if (categorySectionModalMode === "create") {
        await createTicketCategorySection({
          name,
          description: String(categorySectionDraft?.description || "").trim(),
          enabled: categorySectionDraft?.enabled !== false
        });
        toast.success(ss.categories.toast.sectionAdded);
      } else {
        await updateTicketCategorySection(editingCategorySectionId, {
          name,
          description: String(categorySectionDraft?.description || "").trim(),
          enabled: categorySectionDraft?.enabled !== false
        });
        toast.success(ss.categories.toast.sectionUpdated);
      }
      await loadTicketCategorySectionsAdmin();
      await loadTicketCategoriesAdmin();
      closeCategorySectionModal();
    } catch (error) {
      toast.error(error?.message || ss.categories.toast.sectionSaveError);
    } finally {
      setSavingCategorySection(false);
    }
  };
  const removeCategorySection = async sectionId => {
    await deleteTicketCategorySection(sectionId);
    toast.success(ss.categories.toast.sectionDeleted);
    await loadTicketCategorySectionsAdmin();
    await loadTicketCategoriesAdmin();
  };
  const confirmRemoveCategorySection = async () => {
    if (!categorySectionDeleteTarget?.id) return;
    const linkedCount = countCategoriesForSection(categorySectionDeleteTarget);
    if (linkedCount > 0) {
      toast.warn(linkedCount === 1 ? interpolate(ss.categories.sectionDeleteWarnOne, {
        name: categorySectionDeleteTarget?.name || ss.categories.thisSection
      }) : interpolate(ss.categories.sectionDeleteWarnMany, {
        name: categorySectionDeleteTarget?.name || ss.categories.thisSection,
        count: linkedCount
      }));
      setCategorySectionDeleteTarget(null);
      return;
    }
    setDeletingCategorySection(true);
    try {
      await removeCategorySection(categorySectionDeleteTarget.id);
      setCategorySectionDeleteTarget(null);
    } catch (error) {
      toast.error(error?.message || ss.categories.toast.sectionDeleteError);
    } finally {
      setDeletingCategorySection(false);
    }
  };
  const addTemplate = draft => {
    if (!draft.name.trim()) {
      toast.error(ss.templates.toast.nameRequired);
      return;
    }
    if (maxTemplates != null && commentTemplates.length >= maxTemplates) {
      toast.warn(interpolate(ss.templates.toast.limitWarn, {
        max: maxTemplates
      }));
      return;
    }
    const created = {
      id: `tpl-${Date.now()}`,
      name: draft.name.trim(),
      content: String(draft.content || "")
    };
    const nextTemplates = [...commentTemplates, created];
    setCommentTemplates(nextTemplates);
    persist(nextTemplates, macros, emailInboxes, exclusionRules, autoReplyRules, autoReplyTemplate, ss.templates.toast.added).then(() => {
      setShowTemplateModal(false);
      setTemplateDraft({
        name: "",
        content: ""
      });
    }).catch(error => {
      toast.error(error?.message || ss.templates.toast.addError);
    });
  };
  const addMacro = async draft => {
    if (!draft.name.trim()) {
      toast.error(ss.macros.toast.nameRequired);
      return false;
    }
    if (!Array.isArray(draft.actions) || draft.actions.length === 0) {
      toast.error(ss.macros.toast.actionsRequired);
      return false;
    }
    if (maxMacros != null && macros.length >= maxMacros) {
      toast.warn(interpolate(ss.macros.toast.limitWarn, {
        max: maxMacros
      }));
      return false;
    }
    const created = {
      id: `macro-${Date.now()}`,
      name: draft.name.trim(),
      actions: draft.actions.map(action => ({
        ...buildDefaultMacroAction(),
        ...action
      }))
    };
    const nextMacros = [...macros, created];
    setMacros(nextMacros);
    try {
      await persist(commentTemplates, nextMacros, emailInboxes, exclusionRules, autoReplyRules, autoReplyTemplate, ss.macros.toast.added);
      closeMacroModal();
      return true;
    } catch (error) {
      toast.error(error?.message || ss.macros.toast.addError);
      return false;
    }
  };
  const updateTemplate = (id, patch) => {
    const nextTemplates = commentTemplates.map(tpl => tpl.id === id ? {
      ...tpl,
      ...patch
    } : tpl);
    setCommentTemplates(nextTemplates);
    persist(nextTemplates, macros, emailInboxes, exclusionRules, autoReplyRules, autoReplyTemplate).catch(error => {
      toast.error(error?.message || ss.templates.toast.updateError);
    });
  };
  const openCreateTemplateModal = () => {
    if (maxTemplates != null && commentTemplates.length >= maxTemplates) {
      toast.warn(interpolate(ss.templates.toast.limitWarn, {
        max: maxTemplates
      }));
      return;
    }
    setTemplateModalMode("create");
    setEditingTemplateId(null);
    setTemplateDraft({
      name: "",
      content: ""
    });
    setShowTemplateModal(true);
  };
  const openEditTemplateModal = template => {
    setTemplateModalMode("edit");
    setEditingTemplateId(template.id);
    setTemplateDraft({
      name: String(template.name || ""),
      content: String(template.content || "")
    });
    setShowTemplateModal(true);
  };
  const closeTemplateModal = () => {
    setShowTemplateModal(false);
    setEditingTemplateId(null);
    selectedTemplateImageRef.current = null;
    setSelectedImageWidthPx("");
    setTemplateDraft({
      name: "",
      content: ""
    });
  };
  const openTemplatePreviewModal = template => {
    setTemplatePreviewTarget(template || null);
    setShowTemplatePreviewModal(true);
  };
  const closeTemplatePreviewModal = () => {
    setShowTemplatePreviewModal(false);
    setTemplatePreviewTarget(null);
  };
  const saveTemplateFromModal = async () => {
    const cleanedTemplateContent = String(templateDraft.content || "").replace(/\soutline:\s*[^;"']+;?/gi, "");
    const payload = {
      name: String(templateDraft.name || "").trim(),
      content: cleanedTemplateContent
    };
    if (!payload.name) {
      toast.error(ss.templates.toast.nameRequired);
      return;
    }
    setSavingTemplate(true);
    try {
      if (templateModalMode === "create") {
        const created = {
          id: `tpl-${Date.now()}`,
          name: payload.name,
          content: payload.content
        };
        const nextTemplates = [...commentTemplates, created];
        setCommentTemplates(nextTemplates);
        await persist(nextTemplates, macros, emailInboxes, exclusionRules, autoReplyRules, autoReplyTemplate, ss.templates.toast.added);
        closeTemplateModal();
        return;
      }
      if (!editingTemplateId) return;
      const nextTemplates = commentTemplates.map(tpl => tpl.id === editingTemplateId ? {
        ...tpl,
        ...payload
      } : tpl);
      setCommentTemplates(nextTemplates);
      await persist(nextTemplates, macros, emailInboxes, exclusionRules, autoReplyRules, autoReplyTemplate, ss.templates.toast.updated);
      closeTemplateModal();
    } catch (error) {
      toast.error(error?.message || ss.templates.toast.saveError);
    } finally {
      setSavingTemplate(false);
    }
  };
  const execTemplateCommand = command => {
    if (!templateEditorRef.current) return;
    templateEditorRef.current.focus();
    document.execCommand(command, false);
    setTemplateDraft(prev => ({
      ...prev,
      content: String(templateEditorRef.current?.innerHTML || "").replace(/\soutline:\s*[^;"']+;?/gi, "")
    }));
  };
  const insertTemplateVariable = token => {
    if (!templateEditorRef.current) return;
    templateEditorRef.current.focus();
    document.execCommand("insertText", false, token);
    setTemplateDraft(prev => ({
      ...prev,
      content: String(templateEditorRef.current?.innerHTML || "").replace(/\soutline:\s*[^;"']+;?/gi, "")
    }));
  };
  const openMessageVariablesModal = (target = "template") => {
    const normalizedTarget = target === "notification" ? "notification" : "template";
    if (isCommunity && normalizedTarget === "template") return;
    setMessageVariablesModalTarget(normalizedTarget);
    const firstVisibleLabel = normalizedTarget === "notification" ? MESSAGE_VARIABLE_GROUPS_SORTED.find(group => resolveNotificationVariableSectionLabels(notificationEventDraft.source || "tickets", notificationEventDraft.element || "updated").has(group.label))?.label : MESSAGE_VARIABLE_GROUPS_SORTED[0]?.label;
    setActiveVariableSection(firstVisibleLabel || "");
    setShowMessageVariablesModal(true);
  };
  const closeMessageVariablesModal = () => {
    setShowMessageVariablesModal(false);
  };
  const insertMessageVariableFromModal = token => {
    if (messageVariablesModalTarget === "notification") {
      if (!notificationEventEditorRef.current) return;
      notificationEventEditorRef.current.focus();
      document.execCommand("insertText", false, token);
      setNotificationEventDraft(prev => ({
        ...prev,
        customMessage: String(notificationEventEditorRef.current?.innerHTML || "").replace(/\soutline:\s*[^;"']+;?/gi, "")
      }));
    } else {
      insertTemplateVariable(token);
    }
  };
  const jumpToVariableSection = sectionLabel => {
    setActiveVariableSection(sectionLabel);
    const sectionNode = variableSectionRefs.current?.[sectionLabel];
    if (sectionNode && typeof sectionNode.scrollIntoView === "function") {
      sectionNode.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    }
  };
  const handleTemplateEditorClick = event => {
    if (selectedTemplateImageRef.current) {
      selectedTemplateImageRef.current.style.outline = "";
    }
    const target = event.target;
    if (target && target.tagName === "IMG") {
      selectedTemplateImageRef.current = target;
      target.style.outline = "2px solid #13BA8E";
      const computedWidth = Math.round(target.getBoundingClientRect().width || 0);
      setSelectedImageWidthPx(computedWidth > 0 ? String(computedWidth) : "");
      return;
    }
    selectedTemplateImageRef.current = null;
    setSelectedImageWidthPx("");
  };
  const resizeSelectedTemplateImage = size => {
    const imageNode = selectedTemplateImageRef.current;
    if (!imageNode) {
      toast.info("Click an image in the content first.");
      return;
    }
    imageNode.style.width = `${size}%`;
    imageNode.style.height = "auto";
    imageNode.style.maxWidth = "100%";
    setTemplateDraft(prev => ({
      ...prev,
      content: String(templateEditorRef.current?.innerHTML || prev.content).replace(/\soutline:\s*[^;"']+;?/gi, "")
    }));
  };
  const resizeSelectedTemplateImageCustom = () => {
    const imageNode = selectedTemplateImageRef.current;
    if (!imageNode) {
      toast.info("Click an image in the content first.");
      return;
    }
    const rawWidth = window.prompt("Image width (px)", "320");
    if (!rawWidth) return;
    const width = Number(rawWidth);
    if (!Number.isFinite(width) || width <= 0) {
      toast.error("Invalid width value.");
      return;
    }
    imageNode.style.width = `${Math.round(width)}px`;
    imageNode.style.height = "auto";
    imageNode.style.maxWidth = "100%";
    setTemplateDraft(prev => ({
      ...prev,
      content: String(templateEditorRef.current?.innerHTML || prev.content).replace(/\soutline:\s*[^;"']+;?/gi, "")
    }));
  };
  const applySelectedTemplateImageWidth = () => {
    const imageNode = selectedTemplateImageRef.current;
    if (!imageNode) {
      toast.info("Click an image in the content first.");
      return;
    }
    const width = Number(selectedImageWidthPx);
    if (!Number.isFinite(width) || width <= 0) {
      toast.error("Invalid width.");
      return;
    }
    imageNode.style.width = `${Math.round(width)}px`;
    imageNode.style.height = "auto";
    imageNode.style.maxWidth = "100%";
    setTemplateDraft(prev => ({
      ...prev,
      content: String(templateEditorRef.current?.innerHTML || prev.content).replace(/\soutline:\s*[^;"']+;?/gi, "")
    }));
  };
  const insertTemplateImage = () => {
    templateImageInputRef.current?.click();
  };
  const handleTemplateImageUpload = event => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!String(file.type || "").startsWith("image/")) {
      toast.error("Select an image file.");
      event.target.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (!templateEditorRef.current) return;
      templateEditorRef.current.focus();
      document.execCommand("insertImage", false, String(reader.result || ""));
      setTemplateDraft(prev => ({
        ...prev,
        content: String(templateEditorRef.current?.innerHTML || "").replace(/\soutline:\s*[^;"']+;?/gi, "")
      }));
      event.target.value = "";
    };
    reader.onerror = () => {
      toast.error("Unable to load the image.");
      event.target.value = "";
    };
    reader.readAsDataURL(file);
  };
  const updateMacro = async (id, patch, successMessage = null) => {
    const nextMacros = macros.map(macro => macro.id === id ? {
      ...macro,
      ...patch
    } : macro);
    setMacros(nextMacros);
    try {
      await persist(commentTemplates, nextMacros, emailInboxes, exclusionRules, autoReplyRules, autoReplyTemplate, successMessage);
      return true;
    } catch (error) {
      toast.error(error?.message || ss.macros.toast.updateError);
      return false;
    }
  };
  const openCreateMacroModal = () => {
    if (maxMacros != null && macros.length >= maxMacros) {
      toast.warn(interpolate(ss.macros.toast.limitWarn, {
        max: maxMacros
      }));
      return;
    }
    setMacroModalMode("create");
    setEditingMacroId(null);
    setMacroDraft({
      name: "",
      actions: [buildDefaultMacroAction()]
    });
    setShowMacroModal(true);
  };
  const openEditMacroModal = macro => {
    setMacroModalMode("edit");
    setEditingMacroId(macro.id);
    setMacroDraft({
      name: String(macro?.name || ""),
      actions: Array.isArray(macro?.actions) && macro.actions.length > 0 ? macro.actions.map(action => normalizeMacroActionForEditor(action)) : [buildDefaultMacroAction()]
    });
    setShowMacroModal(true);
  };
  const closeMacroModal = () => {
    setShowMacroModal(false);
    setEditingMacroId(null);
    setMacroDraft({
      name: "",
      actions: [buildDefaultMacroAction()]
    });
  };
  const saveMacroFromModal = async () => {
    const payload = {
      name: String(macroDraft.name || "").trim(),
      actions: Array.isArray(macroDraft.actions) ? macroDraft.actions.map(action => normalizeMacroActionForEditor(action)) : []
    };
    if (!payload.name) {
      toast.error(ss.macros.toast.nameRequired);
      return;
    }
    if (!payload.actions.length) {
      toast.error(ss.macros.toast.actionsRequired);
      return;
    }
    setSavingMacro(true);
    try {
      if (macroModalMode === "create") {
        await addMacro(payload);
        return;
      }
      if (!editingMacroId) return;
      const saved = await updateMacro(editingMacroId, payload, ss.macros.toast.updated);
      if (saved) {
        closeMacroModal();
      }
    } finally {
      setSavingMacro(false);
    }
  };
  const updateDraftMacroAction = (actionId, patch) => {
    setMacroDraft(prev => {
      const nextActions = (prev.actions || []).map(action => action.id === actionId ? {
        ...action,
        ...patch
      } : action);
      return {
        ...prev,
        actions: nextActions
      };
    });
  };
  const addDraftMacroAction = () => {
    setMacroDraft(prev => ({
      ...prev,
      actions: [...(prev.actions || []), buildDefaultMacroAction()]
    }));
  };
  const removeDraftMacroAction = actionId => {
    setMacroDraft(prev => {
      const filtered = (prev.actions || []).filter(action => action.id !== actionId);
      return {
        ...prev,
        actions: filtered.length ? filtered : [buildDefaultMacroAction()]
      };
    });
  };
  const updateMacroAction = (macroActions, actionId, patch) => (macroActions || []).map(action => action.id === actionId ? {
    ...action,
    ...patch
  } : action);
  const removeTemplate = async id => {
    const nextTemplates = commentTemplates.filter(tpl => tpl.id !== id);
    setCommentTemplates(nextTemplates);
    await persist(nextTemplates, macros, emailInboxes, exclusionRules, autoReplyRules, autoReplyTemplate, ss.templates.toast.deleted);
  };
  const confirmRemoveTemplate = async () => {
    if (!templateDeleteTarget?.id) return;
    setDeletingTemplate(true);
    try {
      await removeTemplate(templateDeleteTarget.id);
      setTemplateDeleteTarget(null);
    } catch (error) {
      toast.error(error?.message || ss.templates.toast.deleteError);
    } finally {
      setDeletingTemplate(false);
    }
  };
  const removeMacro = async id => {
    const nextMacros = macros.filter(macro => macro.id !== id);
    setMacros(nextMacros);
    await persist(commentTemplates, nextMacros, emailInboxes, exclusionRules, autoReplyRules, autoReplyTemplate, ss.macros.toast.deleted);
  };
  const confirmRemoveMacro = async () => {
    if (!macroDeleteTarget?.id) return;
    setDeletingMacro(true);
    try {
      await removeMacro(macroDeleteTarget.id);
      setMacroDeleteTarget(null);
    } catch (error) {
      toast.error(error?.message || ss.macros.toast.deleteError);
    } finally {
      setDeletingMacro(false);
    }
  };
  const addEmailInbox = () => {
    const nextInboxes = [...emailInboxes, {
      id: `inbox-${Date.now()}`,
      address: "",
      provider: "",
      enabled: true
    }];
    setEmailInboxes(nextInboxes);
  };
  const updateEmailInbox = (id, patch) => {
    const nextInboxes = emailInboxes.map(item => item.id === id ? {
      ...item,
      ...patch
    } : item);
    setEmailInboxes(nextInboxes);
  };
  const removeEmailInbox = id => {
    const nextInboxes = emailInboxes.filter(item => item.id !== id);
    setEmailInboxes(nextInboxes);
  };
  const openCreateExclusionRuleModal = () => {
    setExclusionRuleModalMode("create");
    setEditingExclusionRuleId(null);
    setExclusionRuleDraft(buildDefaultExclusionRule());
    setShowExclusionRuleModal(true);
  };
  const openEditExclusionRuleModal = rule => {
    setExclusionRuleModalMode("edit");
    setEditingExclusionRuleId(rule.id);
    setExclusionRuleDraft({
      ...buildDefaultExclusionRule(),
      ...rule,
      filterRoot: normalizeExclusionFilterRoot(rule)
    });
    setShowExclusionRuleModal(true);
  };
  const closeExclusionRuleModal = ({
    force = false
  } = {}) => {
    if (!force && savingExclusionRule) return;
    setShowExclusionRuleModal(false);
    setEditingExclusionRuleId(null);
    setExclusionRuleDraft(buildDefaultExclusionRule());
  };
  const updateExclusionRule = (id, patch) => {
    const nextRules = exclusionRules.map(item => item.id === id ? {
      ...item,
      ...patch
    } : item);
    setExclusionRules(nextRules);
    persist(commentTemplates, macros, emailInboxes, nextRules, autoReplyRules, autoReplyTemplate, exclusionRuleModalMode === "create" ? mc.toast.ruleAdded : mc.toast.ruleUpdated).catch(error => {
      toast.error(error?.message || mc.toast.ruleSaveError);
    });
  };
  const saveExclusionRuleFromModal = async () => {
    const filterRoot = normalizeExclusionFilterRoot(exclusionRuleDraft);
    const filterValidationError = validateMailFilterRoot(filterRoot);
    if (filterValidationError) {
      toast.error(filterValidationError);
      return;
    }
    const action = normalizeIngestionAction(exclusionRuleDraft?.action);
    if (action === "create_ticket_services" && isCommunityEdition()) {
      toast.error(mc.toast.proActionError);
      return;
    }
    const payload = {
      ...buildDefaultExclusionRule(),
      ...exclusionRuleDraft,
      name: String(exclusionRuleDraft.name || "").trim() || mc.common.newRuleName,
      collectorId: String(exclusionRuleDraft.collectorId || "").trim(),
      filterRoot,
      action,
      criteria: []
    };
    const nextRules = exclusionRuleModalMode === "create" ? [...exclusionRules, payload] : exclusionRules.map(item => item.id === editingExclusionRuleId ? payload : item);
    setExclusionRules(nextRules);
    setSavingExclusionRule(true);
    try {
      await persist(commentTemplates, macros, emailInboxes, nextRules, autoReplyRules, autoReplyTemplate, exclusionRuleModalMode === "create" ? mc.toast.ruleAdded : mc.toast.ruleUpdated);
      setSavingExclusionRule(false);
      closeExclusionRuleModal({
        force: true
      });
    } catch (error) {
      toast.error(error?.message || mc.toast.ruleSaveError);
    } finally {
      setSavingExclusionRule(false);
    }
  };
  const requestRemoveExclusionRule = rule => {
    setExclusionRuleDeleteTarget(rule);
  };
  const closeExclusionRuleDeleteModal = () => {
    if (deletingExclusionRule) return;
    setExclusionRuleDeleteTarget(null);
  };
  const confirmRemoveExclusionRule = async () => {
    if (!exclusionRuleDeleteTarget?.id) return;
    setDeletingExclusionRule(true);
    try {
      await removeExclusionRule(exclusionRuleDeleteTarget.id);
      setExclusionRuleDeleteTarget(null);
    } catch (error) {
      toast.error(error?.message || mc.toast.ruleDeleteError);
    } finally {
      setDeletingExclusionRule(false);
    }
  };
  const removeExclusionRule = async id => {
    const nextRules = exclusionRules.filter(item => item.id !== id);
    setExclusionRules(nextRules);
    await persist(commentTemplates, macros, emailInboxes, nextRules, autoReplyRules, autoReplyTemplate, mc.toast.ruleDeleted);
  };
  const moveExclusionRule = (ruleId, direction) => {
    const currentIndex = exclusionRules.findIndex(rule => rule.id === ruleId);
    if (currentIndex < 0) return;
    const targetIndex = currentIndex + direction;
    if (targetIndex < 0 || targetIndex >= exclusionRules.length) return;
    const nextRules = [...exclusionRules];
    const [item] = nextRules.splice(currentIndex, 1);
    nextRules.splice(targetIndex, 0, item);
    setExclusionRules(nextRules);
    persist(commentTemplates, macros, emailInboxes, nextRules, autoReplyRules, autoReplyTemplate).catch(error => {
      toast.error(error?.message || mc.toast.ruleSaveError);
    });
  };
  const runExclusionRulesTest = async () => {
    setTestingRules(true);
    setRulesTestResult(null);
    try {
      const response = await fetch(`${API_BASE_URL}/tickets/collectors/test-rules`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          sample: rulesTestDraft,
          rules: exclusionRules,
          collectorId: rulesTestDraft.collectorId || ""
        })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload?.success === false) {
        throw new Error(payload?.error || mc.toast.rulesTestFailed);
      }
      setRulesTestResult(payload);
    } catch (error) {
      toast.error(error?.message || mc.toast.ruleTestError);
    } finally {
      setTestingRules(false);
    }
  };
  const addNotificationEvent = () => {
    setNotificationEventModalMode("create");
    setEditingNotificationEventId(null);
    setNotificationEventDraft(buildDefaultNotificationEvent());
    setShowNotificationEventModal(true);
  };
  const openEditNotificationEvent = eventItem => {
    const source = getSourceOption(eventItem.source || "tickets");
    const element = getElementOption(source.key, eventItem.element || "");
    setNotificationEventModalMode("edit");
    setEditingNotificationEventId(eventItem.id);
    setNotificationEventDraft({
      id: eventItem.id,
      source: source.key,
      element: element.key,
      scopeType: eventItem.scopeType || "all",
      enterpriseId: eventItem.enterpriseId || "",
      daysBefore: Number.isFinite(Number(eventItem.daysBefore)) ? Number(eventItem.daysBefore) : 30,
      channel: eventItem.channel || "webhook",
      webhookId: eventItem.webhookId || "",
      emailTo: String(eventItem.emailTo || ""),
      emailCc: String(eventItem.emailCc || ""),
      useTemplate: eventItem.useTemplate === true,
      templateId: eventItem.templateId || "",
      customMessage: String(eventItem.customMessage || ""),
      teamsThemeColor: String(eventItem.teamsThemeColor || "#13BA8E"),
      enabled: eventItem.enabled !== false
    });
    setShowNotificationEventModal(true);
  };
  const closeNotificationEventModal = () => {
    if (savingNotificationEvent) return;
    setShowNotificationEventModal(false);
    setEditingNotificationEventId(null);
    setNotificationEventDraft(buildDefaultNotificationEvent());
  };
  const saveNotificationEventFromModal = async () => {
    const source = getSourceOption(notificationEventDraft.source || "tickets");
    const element = getElementOption(source.key, notificationEventDraft.element || "");
    const channel = String(notificationEventDraft.channel || "webhook").trim() || "webhook";
    const requiresWebhook = ["webhook"].includes(channel);
    const requiresEmailRecipients = channel === "mail";
    const isSoonEvent = isSoonElementKey(element.key);
    const parsedDaysBefore = Number(notificationEventDraft.daysBefore ?? 30);
    const customMessageFromEditor = notificationEventEditorRef.current ? String(notificationEventEditorRef.current.innerHTML || "") : String(notificationEventDraft.customMessage || "");
    const payload = {
      id: notificationEventDraft.id || `notif-event-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
      source: source.key,
      element: element.key,
      scopeType: notificationEventDraft.scopeType === "enterprise" ? "enterprise" : "all",
      enterpriseId: notificationEventDraft.scopeType === "enterprise" ? String(notificationEventDraft.enterpriseId || "").trim() : "",
      daysBefore: isSoonEvent ? Number.isFinite(parsedDaysBefore) && parsedDaysBefore > 0 ? parsedDaysBefore : 30 : null,
      channel,
      webhookId: requiresWebhook ? String(notificationEventDraft.webhookId || "").trim() : "",
      emailTo: requiresEmailRecipients ? String(notificationEventDraft.emailTo || "").trim() : "",
      emailCc: requiresEmailRecipients ? String(notificationEventDraft.emailCc || "").trim() : "",
      useTemplate: notificationEventDraft.useTemplate === true,
      templateId: notificationEventDraft.useTemplate === true ? String(notificationEventDraft.templateId || "").trim() : "",
      customMessage: notificationEventDraft.useTemplate === true ? "" : String(customMessageFromEditor || "").replace(/\soutline:\s*[^;"']+;?/gi, ""),
      teamsThemeColor: String(notificationEventDraft.teamsThemeColor || "#13BA8E").trim() || "#13BA8E",
      enabled: notificationEventDraft.enabled !== false
    };
    const emailToList = parseEmailTags(payload.emailTo);
    if (requiresWebhook && !payload.webhookId) {
      toast.error("Select a webhook for this channel.");
      return;
    }
    if (requiresEmailRecipients && emailToList.length === 0) {
      toast.error("Enter at least one email recipient.");
      return;
    }
    if (payload.scopeType === "enterprise" && !payload.enterpriseId) {
      toast.error("Select a company.");
      return;
    }
    if (isSoonEvent && (!Number.isFinite(parsedDaysBefore) || parsedDaysBefore <= 0)) {
      toast.error("Enter the notification lead time in days (value > 0).");
      return;
    }
    if (payload.useTemplate && !payload.templateId) {
      toast.error("Select a template.");
      return;
    }
    setSavingNotificationEvent(true);
    try {
      const currentEvents = Array.isArray(notificationSettings?.notificationEvents) ? notificationSettings.notificationEvents : [];
      const nextEvents = notificationEventModalMode === "create" ? [...currentEvents, payload] : currentEvents.map(eventItem => eventItem.id === editingNotificationEventId ? payload : eventItem);
      const nextSettings = {
        ...notificationSettings,
        notificationEvents: nextEvents
      };
      setNotificationSettings(nextSettings);
      await persist(commentTemplates, macros, emailInboxes, exclusionRules, autoReplyRules, autoReplyTemplate, notificationEventModalMode === "create" ? "Notification added" : "Notification updated", scheduledAlertRules, mailCollectors, nextSettings);
      closeNotificationEventModal();
    } catch (error) {
      toast.error(error?.message || "Error saving notifications");
    } finally {
      setSavingNotificationEvent(false);
    }
  };
  useEffect(() => {
    const totalLogs = (notificationSettings?.logs || []).length;
    const totalPages = Math.max(1, Math.ceil(totalLogs / notificationLogsPerPage));
    setNotificationLogsPage(prev => Math.min(Math.max(prev, 1), totalPages));
  }, [notificationSettings?.logs]);
  useEffect(() => {
    if (!showCustomNotificationModal || !customNotificationEditorRef.current) return;
    customNotificationEditorRef.current.innerHTML = String(customNotificationDraft.message || "");
  }, [showCustomNotificationModal]);
  const totalNotificationLogs = (notificationSettings?.logs || []).length;
  const notificationLogsTotalPages = Math.max(1, Math.ceil(totalNotificationLogs / notificationLogsPerPage));
  const notificationLogsStartIndex = (notificationLogsPage - 1) * notificationLogsPerPage;
  const paginatedNotificationLogs = (notificationSettings?.logs || []).slice(notificationLogsStartIndex, notificationLogsStartIndex + notificationLogsPerPage);
  const removeNotificationEvent = async eventId => {
    const targetId = String(eventId || "");
    if (!targetId) return;
    const currentEvents = Array.isArray(notificationSettings?.notificationEvents) ? notificationSettings.notificationEvents : [];
    const nextEvents = currentEvents.filter(item => String(item?.id) !== targetId);
    if (nextEvents.length === currentEvents.length) {
      toast.error("Unable to find this notification event");
      return;
    }
    const nextSettings = {
      ...notificationSettings,
      notificationEvents: nextEvents
    };
    const previousSettings = notificationSettings;
    setNotificationSettings(nextSettings);
    try {
      await persist(commentTemplates, macros, emailInboxes, exclusionRules, autoReplyRules, autoReplyTemplate, "Notification deleted", scheduledAlertRules, mailCollectors, nextSettings);
    } catch (error) {
      setNotificationSettings(previousSettings);
      toast.error(error?.message || "Error saving notifications");
    }
  };
  const addNotificationWebhook = () => {
    setWebhookModalMode("create");
    setEditingWebhookId(null);
    setWebhookDraft(buildDefaultWebhookDraft());
    setWebhookTestMessage("");
    setWebhookTestStatus(null);
    setShowWebhookModal(true);
  };
  const openEditNotificationWebhook = webhook => {
    setWebhookModalMode("edit");
    setEditingWebhookId(webhook.id);
    setWebhookDraft({
      id: webhook.id,
      name: webhook.name || "",
      channel: webhook.channel || "teams",
      channelName: webhook.channelName || "",
      url: webhook.url || "",
      enabled: webhook.enabled !== false
    });
    setWebhookTestMessage("");
    setWebhookTestStatus(null);
    setShowWebhookModal(true);
  };
  const closeWebhookModal = () => {
    if (testingWebhookConnection || savingWebhook) return;
    setShowWebhookModal(false);
    setEditingWebhookId(null);
    setWebhookTestMessage("");
    setWebhookTestStatus(null);
    setWebhookDraft(buildDefaultWebhookDraft());
  };
  const updateNotificationWebhook = (webhookId, patch) => {
    setNotificationSettings(prev => ({
      ...prev,
      webhooks: (Array.isArray(prev?.webhooks) ? prev.webhooks : []).map(webhook => webhook.id === webhookId ? {
        ...webhook,
        ...patch
      } : webhook)
    }));
  };
  const removeNotificationWebhook = async webhookId => {
    const targetId = String(webhookId || "");
    if (!targetId) return;
    const currentWebhooks = Array.isArray(notificationSettings?.webhooks) ? notificationSettings.webhooks : [];
    const nextWebhooks = currentWebhooks.filter(webhook => String(webhook?.id) !== targetId);
    if (nextWebhooks.length === currentWebhooks.length) {
      toast.error("Unable to find this webhook");
      return;
    }
    const nextSettings = {
      ...notificationSettings,
      webhooks: nextWebhooks
    };
    const previousSettings = notificationSettings;
    setNotificationSettings(nextSettings);
    try {
      await persist(commentTemplates, macros, emailInboxes, exclusionRules, autoReplyRules, autoReplyTemplate, "Webhook deleted", scheduledAlertRules, mailCollectors, nextSettings);
    } catch (error) {
      setNotificationSettings(previousSettings);
      toast.error(error?.message || "Error saving notifications");
    }
  };
  const testWebhookDraft = async () => {
    setTestingWebhookConnection(true);
    setWebhookTestMessage("");
    setWebhookTestStatus(null);
    try {
      const urlValue = String(webhookDraft.url || "").trim();
      if (!urlValue) throw new Error("Webhook URL is required.");
      const response = await fetch(`${API_BASE_URL}/tickets/notifications/webhooks/test`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          channel: webhookDraft.channel || "webhook",
          url: urlValue
        })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload?.success === false) {
        throw new Error(payload?.error || "Webhook test failed.");
      }
      if (payload?.detectedChannelName && !String(webhookDraft.channelName || "").trim()) {
        setWebhookDraft(prev => ({
          ...prev,
          channelName: String(payload.detectedChannelName || "").trim()
        }));
      }
      setWebhookTestMessage(payload?.message || "Webhook is valid. You can save.");
      setWebhookTestStatus("success");
    } catch (error) {
      const rawMessage = String(error?.message || "").trim().toLowerCase();
      if (rawMessage === "fetch failed" || rawMessage.includes("failed to fetch") || rawMessage.includes("networkerror") || rawMessage.includes("network error")) {
        setWebhookTestMessage("Unable to reach the webhook. Check the URL, network access and try again.");
      } else {
        setWebhookTestMessage(error?.message || "Webhook test failed. Check the configuration and try again.");
      }
      setWebhookTestStatus("error");
    } finally {
      setTestingWebhookConnection(false);
    }
  };
  const testNotificationWebhook = async webhook => {
    if (!webhook?.url) {
      toast.error("Missing webhook URL.");
      return;
    }
    setTestingWebhookId(String(webhook.id || ""));
    try {
      const response = await fetch(`${API_BASE_URL}/tickets/notifications/webhooks/test`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          channel: webhook.channel || "webhook",
          url: String(webhook.url || "").trim()
        })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload?.success === false) {
        throw new Error(payload?.error || "Webhook test failed.");
      }
      toast.success(payload?.message || "Webhook tested successfully.");
    } catch (error) {
      const rawMessage = String(error?.message || "").trim().toLowerCase();
      if (rawMessage === "fetch failed" || rawMessage.includes("failed to fetch") || rawMessage.includes("networkerror") || rawMessage.includes("network error")) {
        toast.error("Unable to reach the webhook. Check the URL and network access.");
      } else {
        toast.error(error?.message || "Webhook test failed.");
      }
    } finally {
      setTestingWebhookId("");
    }
  };
  const retryNotificationLog = async logItem => {
    const logId = String(logItem?.id || "").trim();
    if (!logId) {
      toast.error("Invalid log: missing identifier.");
      return;
    }
    setRetryingNotificationLogId(logId);
    try {
      const response = await fetch(`${API_BASE_URL}/tickets/notifications/logs/${encodeURIComponent(logId)}/retry`, {
        method: "POST",
        credentials: "include"
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload?.success === false) {
        throw new Error(payload?.error || "Unable to resend notification.");
      }
      toast.success(payload?.message || "Notification resent successfully.");
      const refreshedConfig = await fetchTicketAutomationConfig();
      setNotificationSettings(refreshedConfig?.notificationSettings || buildDefaultNotificationSettings());
    } catch (error) {
      toast.error(error?.message || "Unable to resend notification.");
    } finally {
      setRetryingNotificationLogId("");
    }
  };
  const sendCustomWebhookNotification = async () => {
    const webhookId = String(customNotificationDraft?.webhookId || "").trim();
    const title = String(customNotificationDraft?.title || "").trim();
    const message = String(customNotificationEditorRef.current?.innerHTML || customNotificationDraft?.message || "").replace(/\soutline:\s*[^;"']+;?/gi, "").trim();
    if (!webhookId) {
      toast.error("Select a webhook.");
      return;
    }
    if (!message) {
      toast.error("Message is required.");
      return;
    }
    setSendingCustomNotification(true);
    try {
      const response = await fetch(`${API_BASE_URL}/tickets/notifications/webhooks/custom-send`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          webhookId,
          title,
          message,
          teamsThemeColor: String(customNotificationDraft?.teamsThemeColor || "#13BA8E")
        })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload?.success === false) {
        throw new Error(payload?.error || "Unable to send the announcement.");
      }
      const refreshedConfig = await fetchTicketAutomationConfig();
      setNotificationSettings(refreshedConfig?.notificationSettings || buildDefaultNotificationSettings());
      toast.success(payload?.message || "Announcement sent.");
      setShowCustomNotificationModal(false);
      setCustomNotificationDraft(prev => ({
        ...prev,
        title: "",
        message: "",
        teamsThemeColor: "#13BA8E"
      }));
    } catch (error) {
      toast.error(error?.message || "Unable to send the announcement.");
    } finally {
      setSendingCustomNotification(false);
    }
  };
  const execCustomNotificationMessageCommand = (command, value = null) => {
    if (!customNotificationEditorRef.current) return;
    customNotificationEditorRef.current.focus();
    document.execCommand(command, false, value);
    setCustomNotificationDraft(prev => ({
      ...prev,
      message: String(customNotificationEditorRef.current?.innerHTML || "").replace(/\soutline:\s*[^;"']+;?/gi, "")
    }));
  };
  const insertCustomNotificationImageUrl = () => {
    if (!customNotificationEditorRef.current) return;
    const rawUrl = window.prompt("Public image URL (https://...)", "https://");
    if (!rawUrl) return;
    const url = String(rawUrl || "").trim();
    if (!/^https?:\/\//i.test(url)) {
      toast.error("Invalid image URL. Use a public http(s) URL.");
      return;
    }
    execCustomNotificationMessageCommand("insertImage", url);
  };
  const saveWebhookFromModal = async () => {
    const payload = {
      id: webhookDraft.id || `notif-webhook-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
      name: String(webhookDraft.name || "").trim(),
      channel: String(webhookDraft.channel || "teams").trim() || "teams",
      channelName: String(webhookDraft.channelName || "").trim(),
      url: String(webhookDraft.url || "").trim(),
      enabled: webhookDraft.enabled !== false
    };
    if (!payload.name) {
      toast.error("Webhook name is required.");
      return;
    }
    if (!payload.url) {
      toast.error("Webhook URL is required.");
      return;
    }
    const nextWebhooks = webhookModalMode === "create" ? [...(notificationSettings?.webhooks || []), payload] : (notificationSettings?.webhooks || []).map(item => item.id === editingWebhookId ? payload : item);
    const nextSettings = {
      ...notificationSettings,
      webhooks: nextWebhooks
    };
    setSavingWebhook(true);
    try {
      setNotificationSettings(nextSettings);
      await persist(commentTemplates, macros, emailInboxes, exclusionRules, autoReplyRules, autoReplyTemplate, webhookModalMode === "create" ? "Webhook added" : "Webhook updated", scheduledAlertRules, mailCollectors, nextSettings);
      closeWebhookModal();
    } catch (error) {
      toast.error(error?.message || "Error saving notifications");
    } finally {
      setSavingWebhook(false);
    }
  };
  const saveEmailIngestionSettings = async () => {
    try {
      await persist(commentTemplates, macros, emailInboxes, exclusionRules, autoReplyRules, autoReplyTemplate, "Business Rules saved");
    } catch (error) {
      toast.error(error?.message || "Error saving collection settings");
    }
  };
  const addAutoReplyRule = () => {
    setAutoReplyRules(prev => [...prev, {
      id: `autoreply-${Date.now()}`,
      matchOn: "requester_email",
      operator: "contains",
      value: "",
      enabled: true
    }]);
  };
  const updateAutoReplyRule = (id, patch) => {
    setAutoReplyRules(prev => prev.map(rule => rule.id === id ? {
      ...rule,
      ...patch
    } : rule));
  };
  const removeAutoReplyRule = id => {
    setAutoReplyRules(prev => prev.filter(rule => rule.id !== id));
  };
  const openCreateCollectorModal = () => {
    setCollectorModalMode("create");
    setEditingCollectorId(null);
    setCollectorDraft(buildDefaultCollector());
    setCollectorProviderKey("");
    setShowCollectorModal(true);
  };
  const openEditCollectorModal = collector => {
    setCollectorModalMode("edit");
    setEditingCollectorId(collector.id);
    setCollectorDraft({
      ...buildDefaultCollector(),
      ...collector
    });
    setCollectorProviderKey(findCollectorProviderPreset(collector).key);
    setShowCollectorModal(true);
  };
  const closeCollectorModal = ({
    force = false
  } = {}) => {
    if (!force && (savingCollector || testingCollectorConnection)) return;
    setShowCollectorModal(false);
    setEditingCollectorId(null);
    setCollectorDraft(buildDefaultCollector());
    setFoldersModalOpen(false);
    setCollectorAvailableFolders([]);
    setLoadingCollectorFolders(false);
    setTestingCollectorConnection(false);
    setCollectorProviderKey("");
  };
  const applyCollectorProviderPreset = providerKey => {
    const selected = COLLECTOR_PROVIDER_PRESETS.find(item => item.key === providerKey);
    if (!selected || selected.comingSoon) return;
    setCollectorProviderKey(providerKey);
  };
  const appendCollectorDraftLog = (level, message) => {
    const entry = {
      id: `collector-log-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
      level: String(level || "info"),
      message: String(message || ""),
      createdAt: new Date().toISOString()
    };
    setCollectorDraft(prev => {
      const current = Array.isArray(prev?.logs) ? prev.logs : [];
      return {
        ...prev,
        logs: [entry, ...current].slice(0, 200)
      };
    });
  };
  const openCollectorLogsModal = collector => {
    setLogsCollectorName(String(collector?.name || mc.common.collectorFallback));
    setLogsModalRows(Array.isArray(collector?.logs) ? collector.logs : []);
    setLogsModalOpen(true);
  };
  const testCollectorConnection = async () => {
    setTestingCollectorConnection(true);
    try {
      const response = await fetch(`${API_BASE_URL}/tickets/collectors/test-connection`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          collector: collectorDraft
        })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload?.success === false) {
        throw new Error(payload?.error || mc.toast.imapConnectionFailed);
      }
      toast.success(payload?.message || mc.toast.imapTestSuccess);
      appendCollectorDraftLog("success", mc.collectorForm.logConnectionSuccess);
    } catch (error) {
      toast.error(error?.message || mc.toast.imapTestError);
      appendCollectorDraftLog("error", interpolate(mc.collectorForm.logConnectionFailed, {
        error: error?.message || mc.collectorForm.unknownError
      }));
    } finally {
      setTestingCollectorConnection(false);
    }
  };
  const forceCollectorFetch = async collector => {
    const collectorId = String(collector?.id || "");
    if (!collectorId) return;
    setForcingCollectorId(collectorId);
    try {
      const response = await fetch(`${API_BASE_URL}/tickets/collectors/force-fetch`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          collector
        })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload?.success === false) {
        throw new Error(payload?.error || mc.toast.forceFetchFailed);
      }
      const stats = payload?.stats || {};
      toast.success(interpolate(mc.toast.forceFetchSuccess, {
        attached: Number(stats.attached || 0),
        ignored: Number(stats.ignored || 0)
      }));
      const freshConfig = await fetchTicketAutomationConfig();
      setMailCollectors(ensureUniqueCollectorIds(Array.isArray(freshConfig?.mailCollectors) ? freshConfig.mailCollectors : []));
    } catch (error) {
      toast.error(error?.message || mc.toast.forceFetchError);
    } finally {
      setForcingCollectorId("");
    }
  };
  const openFoldersModal = async targetField => {
    setFoldersModalTargetField(targetField);
    setFoldersModalOpen(true);
    setLoadingCollectorFolders(true);
    setCollectorAvailableFolders([]);
    try {
      const response = await fetch(`${API_BASE_URL}/tickets/collectors/folders`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          collector: collectorDraft
        })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload?.success === false) {
        throw new Error(payload?.error || mc.toast.foldersFailed);
      }
      setCollectorAvailableFolders(Array.isArray(payload?.folders) ? payload.folders : []);
      appendCollectorDraftLog("info", mc.collectorForm.logFoldersSuccess);
    } catch (error) {
      toast.error(error?.message || mc.toast.foldersError);
      appendCollectorDraftLog("error", interpolate(mc.collectorForm.logFoldersFailed, {
        error: error?.message || mc.collectorForm.unknownError
      }));
    } finally {
      setLoadingCollectorFolders(false);
    }
  };
  const applyFolderSelection = folderName => {
    const key = String(foldersModalTargetField || "inboxFolder");
    setCollectorDraft(prev => ({
      ...prev,
      [key]: String(folderName || "")
    }));
    setFoldersModalOpen(false);
  };
  const saveCollectorFromModal = async () => {
    const username = String(collectorDraft.username || "").trim();
    const server = String(collectorDraft.server || "").trim();
    const name = String(collectorDraft.name || username).trim();
    if (!username) {
      toast.error(mc.toast.emailRequired);
      return;
    }
    if (!server) {
      toast.error(mc.toast.serverRequired);
      return;
    }
    if (!String(collectorDraft.password || "").trim() && collectorModalMode === "create") {
      toast.error(mc.toast.passwordRequired);
      return;
    }
    const payload = {
      ...buildDefaultCollector(),
      ...collectorDraft,
      name,
      server,
      username,
      protocol: "imap",
      security: "ssl",
      inboxFolder: String(collectorDraft.inboxFolder || "INBOX").trim() || "INBOX",
      acceptedFolder: String(collectorDraft.acceptedFolder || "").trim(),
      refusedFolder: String(collectorDraft.refusedFolder || "").trim()
    };
    const nextCollectors = ensureUniqueCollectorIds(collectorModalMode === "create" ? [...mailCollectors, payload] : mailCollectors.map(item => item.id === editingCollectorId ? payload : item));
    setMailCollectors(nextCollectors);
    setSavingCollector(true);
    try {
      await persist(commentTemplates, macros, emailInboxes, exclusionRules, autoReplyRules, autoReplyTemplate, collectorModalMode === "create" ? mc.toast.collectorAdded : mc.toast.collectorUpdated, scheduledAlertRules, nextCollectors);
      setSavingCollector(false);
      closeCollectorModal({
        force: true
      });
    } catch (error) {
      toast.error(error?.message || mc.toast.collectorSaveError);
    } finally {
      setSavingCollector(false);
    }
  };
  const requestRemoveCollector = collector => {
    setCollectorDeleteTarget(collector);
  };
  const closeCollectorDeleteModal = () => {
    if (deletingCollector) return;
    setCollectorDeleteTarget(null);
  };
  const confirmRemoveCollector = async () => {
    if (!collectorDeleteTarget?.id) return;
    setDeletingCollector(true);
    try {
      await removeCollector(collectorDeleteTarget.id);
      setCollectorDeleteTarget(null);
    } finally {
      setDeletingCollector(false);
    }
  };
  const removeCollector = async collectorId => {
    const nextCollectors = mailCollectors.filter(item => item.id !== collectorId);
    setMailCollectors(nextCollectors);
    try {
      await persist(commentTemplates, macros, emailInboxes, exclusionRules, autoReplyRules, autoReplyTemplate, mc.toast.collectorDeleted, scheduledAlertRules, nextCollectors);
    } catch (error) {
      toast.error(error?.message || mc.toast.collectorDeleteError);
    }
  };
  const openCreateScheduledAlertModal = () => {
    setScheduledAlertModalMode("create");
    setEditingScheduledAlertId(null);
    setScheduledAlertDraft(buildDefaultScheduledAlertRule());
    setShowScheduledAlertModal(true);
  };
  const openEditScheduledAlertModal = rule => {
    setScheduledAlertModalMode("edit");
    setEditingScheduledAlertId(rule.id);
    setScheduledAlertDraft({
      ...buildDefaultScheduledAlertRule(),
      ...rule,
      channels: Array.isArray(rule.channels) ? [...rule.channels] : ["mail"]
    });
    setShowScheduledAlertModal(true);
  };
  const closeScheduledAlertModal = ({
    force = false
  } = {}) => {
    if (!force && savingScheduledAlert) return;
    setShowScheduledAlertModal(false);
    setEditingScheduledAlertId(null);
    setScheduledAlertDraft(buildDefaultScheduledAlertRule());
  };
  const saveScheduledAlertFromModal = async () => {
    const payload = {
      ...buildDefaultScheduledAlertRule(),
      ...scheduledAlertDraft,
      name: String(scheduledAlertDraft.name || "").trim(),
      cron: String(scheduledAlertDraft.cron || "").trim() || "0 8 * * *",
      recipients: String(scheduledAlertDraft.recipients || "").trim(),
      channels: Array.isArray(scheduledAlertDraft.channels) ? scheduledAlertDraft.channels : [],
      thresholdDays: Number(scheduledAlertDraft.thresholdDays ?? 30)
    };
    if (!payload.name) {
      toast.error("Rule name is required.");
      return;
    }
    if (payload.channels.length === 0) {
      toast.error("Select at least one notification channel.");
      return;
    }
    if (payload.channels.includes("mail") && !payload.recipients) {
      toast.error("Enter at least one email recipient.");
      return;
    }
    const nextRules = scheduledAlertModalMode === "create" ? [...scheduledAlertRules, payload] : scheduledAlertRules.map(item => item.id === editingScheduledAlertId ? payload : item);
    setScheduledAlertRules(nextRules);
    setSavingScheduledAlert(true);
    try {
      await persist(commentTemplates, macros, emailInboxes, exclusionRules, autoReplyRules, autoReplyTemplate, scheduledAlertModalMode === "create" ? "CRON rule added" : "CRON rule updated", nextRules);
      closeScheduledAlertModal({
        force: true
      });
    } catch (error) {
      toast.error(error?.message || "Error saving CRON rule");
    } finally {
      setSavingScheduledAlert(false);
    }
  };
  const requestRemoveScheduledAlertRule = rule => {
    setScheduledAlertDeleteTarget(rule);
  };
  const confirmRemoveScheduledAlertRule = async () => {
    if (!scheduledAlertDeleteTarget?.id) return;
    const nextRules = scheduledAlertRules.filter(item => item.id !== scheduledAlertDeleteTarget.id);
    setScheduledAlertRules(nextRules);
    setSavingScheduledAlert(true);
    try {
      await persist(commentTemplates, macros, emailInboxes, exclusionRules, autoReplyRules, autoReplyTemplate, "CRON rule deleted", nextRules);
      setScheduledAlertDeleteTarget(null);
    } catch (error) {
      toast.error(error?.message || "Error deleting");
    } finally {
      setSavingScheduledAlert(false);
    }
  };
  const resolveAgentLabel = agentId => availableAgents.find(agent => String(agent.id) === String(agentId))?.label || String(agentId);
  const resolveWebhookLabel = webhookId => (notificationSettings?.webhooks || []).find(item => String(item.id) === String(webhookId))?.name || String(webhookId || "").trim() || "-";
  const macroCategoryOptions = useMemo(() => (ticketCategories || []).filter(item => item?.enabled !== false).map(item => ({
    value: String(item.name || "").trim(),
    label: item.section ? `${item.section} · ${item.name}` : String(item.name || "")
  })).filter(item => item.value), [ticketCategories]);
  const categoryCountBySectionName = useMemo(() => {
    const counts = new Map();
    (ticketCategories || []).forEach(category => {
      const sectionName = String(category?.section || "").trim();
      if (!sectionName) return;
      counts.set(sectionName, (counts.get(sectionName) || 0) + 1);
    });
    return counts;
  }, [ticketCategories]);
  const countCategoriesForSection = section => categoryCountBySectionName.get(String(section?.name || "").trim()) || 0;
  const requestRemoveCategorySection = section => {
    const linkedCount = countCategoriesForSection(section);
    if (linkedCount > 0) {
      toast.warn(linkedCount === 1 ? interpolate(ss.categories.sectionDeleteWarnOne, {
        name: section?.name || ss.categories.thisSection
      }) : interpolate(ss.categories.sectionDeleteWarnMany, {
        name: section?.name || ss.categories.thisSection,
        count: linkedCount
      }));
      return;
    }
    setCategorySectionDeleteTarget(section);
  };
  const macroWebhookOptions = useMemo(() => (notificationSettings?.webhooks || []).filter(item => item?.enabled !== false && String(item.url || "").trim()).map(item => ({
    value: String(item.id),
    label: `${item.name || "Webhook"} (${String(item.channel || "webhook").toUpperCase()})`
  })), [notificationSettings?.webhooks]);
  const isMacroActionProLocked = actionType => isCommunity && macroActionTypes.some(item => item.value === actionType && item.proOnly);
  const describeMacroAction = action => {
    const typeLabel = pickMacroOptionLabel(macroActionTypes, action.type);
    switch (action.type) {
      case "set_field":
        {
          const fieldLabel = pickMacroOptionLabel(macroFieldOptions, action.field);
          const modeLabel = pickMacroOptionLabel(macroFieldModeOptions[action.field] || [], action.fieldMode);
          if (action.field === "assigned_to_me") {
            return `${typeLabel} · ${fieldLabel}`;
          }
          if (action.field === "assigned_user_id" || action.field === "followers") {
            const names = parseCsvIds(action.value).map(id => resolveAgentLabel(id));
            const modePrefix = modeLabel ? `${modeLabel} · ` : "";
            return names.length ? `${typeLabel} · ${fieldLabel} · ${modePrefix}${names.join(", ")}` : `${typeLabel} · ${fieldLabel}${modeLabel ? ` · ${modeLabel}` : ""}`;
          }
          if (action.field === "category") {
            const categoryLabel = macroCategoryOptions.find(opt => opt.value === action.value)?.label || action.value;
            return categoryLabel ? `${typeLabel} · ${fieldLabel} → ${categoryLabel}` : `${typeLabel} · ${fieldLabel}`;
          }
          if (Array.isArray(macroBoundedFieldValues[action.field])) {
            const valueLabel = pickMacroOptionLabel(macroBoundedFieldValues[action.field], action.value);
            return `${typeLabel} · ${fieldLabel} → ${valueLabel}`;
          }
          const valueText = truncateMacroText(action.value);
          return valueText ? `${typeLabel} · ${fieldLabel} → ${valueText}` : `${typeLabel} · ${fieldLabel}`;
        }
      case "add_comment":
        {
          const visibility = action.isInternal ? ss.macros.describe.visibilityInternal : ss.macros.describe.visibilityPublic;
          const preview = truncateMacroText(action.comment);
          return preview ? `${typeLabel} (${visibility}) · ${preview}` : `${typeLabel} (${visibility})`;
        }
      case "open_email":
        {
          const subject = truncateMacroText(action.emailSubject, 36);
          const to = truncateMacroText(action.emailTo, 24);
          if (subject && to) return `${typeLabel} · ${to} · ${subject}`;
          if (subject) return `${typeLabel} · ${subject}`;
          if (to) return `${typeLabel} · ${to}`;
          return typeLabel;
        }
      case "teams_message":
        {
          const webhookLabel = resolveWebhookLabel(action.teamsWebhookId);
          const preview = truncateMacroText(action.teamsMessage);
          return preview ? `${typeLabel} · ${webhookLabel} · ${preview}` : `${typeLabel} · ${webhookLabel}`;
        }
      case "planning_alert":
        {
          const title = truncateMacroText(action.reminderTitle, 28);
          const offset = Number(action.reminderOffsetMinutes || 60);
          return title ? `${typeLabel} · ${title} (+${offset} min)` : typeLabel;
        }
      case "manage_tags":
      case "add_tags":
        {
          const modeLabel = action.tagsMode === "remove" ? ss.macros.describe.tagsRemove : ss.macros.describe.tagsAdd;
          return action.tagsText ? `${typeLabel} · ${modeLabel} · ${truncateMacroText(action.tagsText, 36)}` : `${typeLabel} · ${modeLabel}`;
        }
      case "call":
        return action.phoneNumber ? `${typeLabel} · ${action.phoneNumber}` : typeLabel;
      case "add_attachment":
        return `${typeLabel} · ${ss.macros.describe.manualAttachment}`;
      case "link_ticket":
        return action.ticketId ? `${typeLabel} · #${action.ticketId}` : typeLabel;
      case "link_equipment":
        return action.equipmentId ? `${typeLabel} · ${action.equipmentId}` : typeLabel;
      default:
        return typeLabel;
    }
  };
  const describeMacroActionBrief = action => {
    const full = describeMacroAction(action);
    const typeLabel = pickMacroOptionLabel(macroActionTypes, action.type);
    const prefix = `${typeLabel} · `;
    if (full.startsWith(prefix)) {
      return full.slice(prefix.length);
    }
    return full;
  };
  const renderMacroActionFields = ({
    action,
    onChange
  }) => {
    const proLocked = isMacroActionProLocked(action.type);
    const defaultFieldMode = field => field === "assigned_user_id" ? "replace" : field === "followers" ? "add" : "";
    return <>
      <div className={macroModalStyles.actionTypeRow}>
        <MacroActionTypePicker value={action.type} options={macroActionTypes} isCommunity={isCommunity} isTeamsIntegrationActive={isTeamsIntegrationActive} macroWebhookOptionsCount={macroWebhookOptions.length} triggerClassName={`${styles.input} ${styles.select}`} onChange={nextType => onChange({
          type: nextType
        })} />
      </div>

      {proLocked ? <p className={macroModalStyles.hintText}>{ss.macros.proLockedHint}</p> : null}

      {action.type === "set_field" && <div className={macroModalStyles.fieldGrid2}>
          <select className={`${styles.input} ${styles.select}`} value={action.field || ""} onChange={e => {
          const nextField = e.target.value;
          const boundedValues = macroBoundedFieldValues[nextField];
          onChange({
            field: nextField,
            fieldMode: defaultFieldMode(nextField),
            value: Array.isArray(boundedValues) ? boundedValues[0]?.value || "" : nextField === "category" ? macroCategoryOptions[0]?.value || "" : ""
          });
        }}>
            {macroFieldOptions.map(opt => <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>)}
          </select>
          {Array.isArray(macroFieldModeOptions[action.field]) ? <select className={`${styles.input} ${styles.select}`} value={action.fieldMode || defaultFieldMode(action.field)} onChange={e => onChange({
          fieldMode: e.target.value
        })}>
              {macroFieldModeOptions[action.field].map(opt => <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>)}
            </select> : null}
          {action.field === "assigned_user_id" ? <div className={`${macroModalStyles.agentPickerWrap} ${macroModalStyles.fieldGridFull}`}>
              <MultiSuggestPicker inputId={`macro-assignee-${action.id}`} placeholder={ss.macros.placeholders.assignee} options={availableAgents} selectedIds={parseCsvIds(action.value)} emptyHint={ss.macros.placeholders.noAssignee} onChange={ids => onChange({
            value: stringifyAgentIds(ids)
          })} />
            </div> : action.field === "followers" ? <div className={`${macroModalStyles.agentPickerWrap} ${macroModalStyles.fieldGridFull}`}>
              <MultiSuggestPicker inputId={`macro-follower-${action.id}`} placeholder={ss.macros.placeholders.follower} options={availableAgents} selectedIds={parseCsvIds(action.value)} emptyHint={ss.macros.placeholders.noFollower} onChange={ids => onChange({
            value: stringifyAgentIds(ids)
          })} />
            </div> : action.field === "category" ? <div className={`${macroModalStyles.agentPickerWrap} ${macroModalStyles.fieldGridFull}`}>
              <MultiSuggestPicker singleSelect inputId={`macro-category-${action.id}`} placeholder={ss.macros.placeholders.category} options={macroCategoryOptions.map(opt => ({
            id: opt.value,
            label: opt.label
          }))} selectedIds={action.value ? [action.value] : []} emptyHint={ss.macros.placeholders.noCategory} onChange={ids => onChange({
            value: ids[0] || ""
          })} />
            </div> : Array.isArray(macroBoundedFieldValues[action.field]) ? <select className={`${styles.input} ${styles.select}`} value={action.value || macroBoundedFieldValues[action.field][0]?.value || ""} onChange={e => onChange({
          value: e.target.value
        })}>
              {macroBoundedFieldValues[action.field].map(opt => <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>)}
            </select> : <input className={styles.input} value={action.value || ""} onChange={e => onChange({
          value: e.target.value
        })} placeholder={ss.macros.placeholders.newValue} />}
        </div>}

      {action.type === "add_comment" && !proLocked && <MacroCommentActionEditor actionId={action.id} comment={action.comment || ""} commentTemplateId={action.commentTemplateId || ""} isInternal={Boolean(action.isInternal)} templates={commentTemplates} selectClassName={`${styles.input} ${styles.select}`} onChange={onChange} />}

      {action.type === "open_email" && !proLocked && <div className={macroModalStyles.actionFieldStack}>
          <input className={styles.input} value={action.emailTo || ""} onChange={e => onChange({
          emailTo: e.target.value
        })} placeholder={ss.macros.placeholders.emailTo} />
          <input className={styles.input} value={action.emailCc || ""} onChange={e => onChange({
          emailCc: e.target.value
        })} placeholder={ss.macros.placeholders.emailCc} />
          <input className={styles.input} value={action.emailSubject || ""} onChange={e => onChange({
          emailSubject: e.target.value
        })} placeholder={ss.macros.placeholders.emailSubject} />
          <textarea className={styles.input} rows={4} value={action.emailBody || ""} onChange={e => onChange({
          emailBody: e.target.value
        })} placeholder={ss.macros.placeholders.emailBody} />
        </div>}

      {(action.type === "manage_tags" || action.type === "add_tags") && !proLocked && <div className={macroModalStyles.actionFieldStack}>
          <select className={`${styles.input} ${styles.select}`} value={action.tagsMode || "add"} onChange={e => onChange({
          tagsMode: e.target.value
        })}>
            <option value="add">{ss.macros.placeholders.tagsAddOption}</option>
            <option value="remove">{ss.macros.placeholders.tagsRemoveOption}</option>
          </select>
          <input className={styles.input} value={action.tagsText || ""} onChange={e => onChange({
          tagsText: e.target.value
        })} placeholder={ss.macros.placeholders.tagsList} />
        </div>}

      {action.type === "planning_alert" && !proLocked && <div className={macroModalStyles.actionFieldStack}>
          <input className={styles.input} value={action.reminderTitle || ""} onChange={e => onChange({
          reminderTitle: e.target.value
        })} placeholder={ss.macros.placeholders.reminderTitle} />
          <label className={macroModalStyles.inlineField}>
            <span>{ss.macros.placeholders.reminderOffsetLabel}</span>
            <input className={styles.input} type="number" min={5} step={5} value={action.reminderOffsetMinutes ?? "60"} onChange={e => onChange({
            reminderOffsetMinutes: e.target.value
          })} />
          </label>
          <textarea className={styles.input} rows={3} value={action.reminderNote || ""} onChange={e => onChange({
          reminderNote: e.target.value
        })} placeholder={ss.macros.placeholders.reminderNote} />
        </div>}

      {action.type === "teams_message" && !proLocked && <div className={macroModalStyles.actionFieldStack}>
          <select className={`${styles.input} ${styles.select}`} value={action.teamsWebhookId || ""} onChange={e => onChange({
          teamsWebhookId: e.target.value
        })}>
            <option value="">{ss.macros.placeholders.selectWebhook}</option>
            {macroWebhookOptions.map(opt => <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>)}
          </select>
          {macroWebhookOptions.length === 0 ? <p className={macroModalStyles.hintText}>{ss.macros.placeholders.noWebhookHint}</p> : null}
          <input className={styles.input} value={action.teamsTitle || ""} onChange={e => onChange({
          teamsTitle: e.target.value
        })} placeholder={ss.macros.placeholders.teamsTitle} />
          <textarea className={styles.input} rows={4} value={action.teamsMessage || ""} onChange={e => onChange({
          teamsMessage: e.target.value
        })} placeholder={ss.macros.placeholders.teamsMessage} />
        </div>}

      {action.type === "call" && !proLocked && <input className={styles.input} style={{
        marginTop: "0.6rem"
      }} value={action.phoneNumber || ""} onChange={e => onChange({
        phoneNumber: e.target.value
      })} placeholder={ss.macros.placeholders.phoneNumber} />}

      {action.type === "link_ticket" && !proLocked && <input className={styles.input} style={{
        marginTop: "0.6rem"
      }} value={action.ticketId || ""} onChange={e => onChange({
        ticketId: e.target.value
      })} placeholder={ss.macros.placeholders.ticketId} />}

      {action.type === "link_equipment" && !proLocked && <input className={styles.input} style={{
        marginTop: "0.6rem"
      }} value={action.equipmentId || ""} onChange={e => onChange({
        equipmentId: e.target.value
      })} placeholder={ss.macros.placeholders.equipmentId} />}

      {action.type === "add_attachment" && !proLocked && <div className={macroModalStyles.hintText}>{ss.macros.placeholders.manualAttachmentHint}</div>}
    </>;
  };
  return <Page>
      {!restrictedView ? <SubTabs items={ticketAdminViews} active={activeView} onChange={setActiveView} fullWidth /> : null}

      <div className={styles.content}>
        {activeView === "templates" && <Card title={supportViewMeta.templates.title} description={supportViewMeta.templates.description} fill action={<Btn icon="mdi:plus" onClick={openCreateTemplateModal} disabled={templatesAtLimit} title={templatesAtLimit ? interpolate(ss.templates.limitTitle, {
        max: maxTemplates
      }) : undefined}>
                {ss.templates.addBtn}
              </Btn>}>
            {maxTemplates != null && <p className={styles.limitHint}>
                <CommunityFeatureBadge variant="inline" className={styles.proBadgeInline} />
                {templatesAtLimit ? <>
                    {interpolate(ss.templates.limitReached, {
              current: commentTemplates.length,
              max: maxTemplates
            })}{" "}
                    <ProFeatureBadge variant="inline" className={styles.proBadgeInline} />
                  </> : <>
                    {interpolate(ss.templates.quota, {
              current: commentTemplates.length,
              max: maxTemplates
            })}
                  </>}
              </p>}
            <div className={s.tableSection}>
              <div className={s.tableWrap}>
                <table className={s.table}>
                  <thead>
                    <tr>
                      <th>{ss.common.columns.name}</th>
                      <th style={{
                    width: 112
                  }} aria-label={ss.common.actions.actionsAria} />
                    </tr>
                  </thead>
                  <tbody>
                    {commentTemplates.length === 0 ? <tr>
                        <td colSpan={2} className={s.empty}>{ss.templates.empty}</td>
                      </tr> : templatesPagination.paginatedItems.map(tpl => <tr key={tpl.id}>
                          <td>{tpl.name}</td>
                          <td>
                            <div className={s.actions}>
                              <button type="button" className={s.actionBtn} title={ss.common.actions.preview} onClick={() => openTemplatePreviewModal(tpl)}>
                                <Icon icon="mdi:eye-outline" aria-hidden />
                              </button>
                              <button type="button" className={s.actionBtn} title={ss.common.actions.edit} onClick={() => openEditTemplateModal(tpl)}>
                                <Icon icon="mdi:pencil-outline" aria-hidden />
                              </button>
                              <button type="button" className={`${s.actionBtn} ${s.actionBtnDanger}`} title={ss.common.actions.delete} onClick={() => setTemplateDeleteTarget(tpl)}>
                                <Icon icon="mdi:delete-outline" aria-hidden />
                              </button>
                            </div>
                          </td>
                        </tr>)}
                  </tbody>
                </table>
              </div>
              {commentTemplates.length > 0 && <Pagination page={templatesPagination.page} totalPages={templatesPagination.totalPages} onPageChange={templatesPagination.setPage} pageSize={templatesPagination.pageSize} onPageSizeChange={templatesPagination.setPageSize} rangeLabel={templatesPagination.rangeLabel} />}
            </div>
          </Card>}

        {activeView === "categories" && <Card title={supportViewMeta.categories.title} description={supportViewMeta.categories.description} fill action={<Btn icon="mdi:plus" onClick={openCreateCategorySectionModal}>
                {ss.categories.newSectionBtn}
              </Btn>}>
            <div className={s.tableSplitLayout}>
            <div className={ui.toolRow}>
              <div className={ui.toolLeft}>
                <input type="search" className={ui.fieldSearch} placeholder={ss.categories.searchSection} value={sectionSearch} onChange={e => setSectionSearch(e.target.value)} />
                <span className={ui.count}>
                  {formatSupportSettingsCount(locale, "section", filteredCategorySections.length)}
                </span>
              </div>
            </div>

            <div className={s.tableSectionPinned}>
              <div className={s.tableWrap}>
                <table className={s.table}>
                  <thead>
                    <tr>
                      <th>{ss.common.columns.name}</th>
                      <th>{ss.common.columns.description}</th>
                      <th>{ss.common.columns.status}</th>
                      <th style={{
                      width: 88
                    }} aria-label={ss.common.actions.actionsAria} />
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCategorySections.length === 0 ? <tr>
                        <td colSpan={4} className={s.empty}>
                          {ticketCategorySections.length === 0 ? ss.categories.emptySections : ss.categories.emptySectionsSearch}
                        </td>
                      </tr> : categorySectionsPagination.paginatedItems.map(section => {
                    const linkedCategoryCount = countCategoriesForSection(section);
                    const sectionDeleteBlocked = linkedCategoryCount > 0;
                    return <tr key={String(section.id)}>
                            <td>{section.name || ss.common.emptyDash}</td>
                            <td>{section.description || ss.common.emptyDash}</td>
                            <td>
                              <EntityStatus active={section.enabled !== false} {...entityStatusLabels} />
                            </td>
                            <td>
                              <div className={s.actions}>
                                <button type="button" className={s.actionBtn} title={ss.common.actions.edit} onClick={() => openEditCategorySectionModal(section)}>
                                  <Icon icon="mdi:pencil-outline" aria-hidden />
                                </button>
                                <button type="button" className={`${s.actionBtn} ${s.actionBtnDanger}`} title={sectionDeleteBlocked ? linkedCategoryCount === 1 ? ss.categories.sectionDeleteBlockedOne : interpolate(ss.categories.sectionDeleteBlockedMany, {
                            count: linkedCategoryCount
                          }) : ss.common.actions.delete} disabled={sectionDeleteBlocked} onClick={() => requestRemoveCategorySection(section)}>
                                  <Icon icon="mdi:delete-outline" aria-hidden />
                                </button>
                              </div>
                            </td>
                          </tr>;
                  })}
                  </tbody>
                </table>
              </div>
              {filteredCategorySections.length > 0 && <Pagination page={categorySectionsPagination.page} totalPages={categorySectionsPagination.totalPages} onPageChange={categorySectionsPagination.setPage} pageSize={categorySectionsPagination.pageSize} onPageSizeChange={categorySectionsPagination.setPageSize} rangeLabel={categorySectionsPagination.rangeLabel} />}
            </div>

            <div className={styles.subSectionHead}>
              <h4 className={styles.subSectionTitle}>{ss.categories.categoriesTitle}</h4>
              <Btn icon="mdi:plus" size="sm" onClick={openCreateCategoryModal}>
                {ss.common.actions.add}
              </Btn>
            </div>

            <div className={ui.toolRow}>
              <div className={ui.toolLeft}>
                <input type="search" className={ui.fieldSearch} placeholder={ss.categories.searchCategory} value={categorySearch} onChange={e => setCategorySearch(e.target.value)} />
                <span className={ui.count}>
                  {formatSupportSettingsCount(locale, "category", filteredTicketCategories.length)}
                </span>
              </div>
            </div>

            <div className={s.tableSection}>
              <div className={s.tableWrap}>
                <table className={s.table}>
                  <thead>
                    <tr>
                      <th>{ss.common.columns.section}</th>
                      <th>{ss.common.columns.name}</th>
                      <th>{ss.common.columns.description}</th>
                      <th>{ss.common.columns.status}</th>
                      <th style={{
                      width: 88
                    }} aria-label={ss.common.actions.actionsAria} />
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTicketCategories.length === 0 ? <tr>
                        <td colSpan={5} className={s.empty}>
                          {ticketCategories.length === 0 ? ss.categories.emptyCategories : ss.categories.emptyCategoriesSearch}
                        </td>
                      </tr> : categoriesPagination.paginatedItems.map(category => <tr key={String(category.id)}>
                          <td>{category.section || ss.categories.uncategorized}</td>
                          <td>{category.name || ss.common.emptyDash}</td>
                          <td>{category.description || ss.common.emptyDash}</td>
                          <td>
                            <EntityStatus active={category.enabled !== false} {...entityStatusLabels} />
                          </td>
                          <td>
                            <div className={s.actions}>
                              <button type="button" className={s.actionBtn} title={ss.common.actions.edit} onClick={() => openEditCategoryModal(category)}>
                                <Icon icon="mdi:pencil-outline" aria-hidden />
                              </button>
                              <button type="button" className={`${s.actionBtn} ${s.actionBtnDanger}`} title={ss.common.actions.delete} onClick={() => setCategoryDeleteTarget(category)}>
                                <Icon icon="mdi:delete-outline" aria-hidden />
                              </button>
                            </div>
                          </td>
                        </tr>)}
                  </tbody>
                </table>
              </div>
              {filteredTicketCategories.length > 0 && <Pagination page={categoriesPagination.page} totalPages={categoriesPagination.totalPages} onPageChange={categoriesPagination.setPage} pageSize={categoriesPagination.pageSize} onPageSizeChange={categoriesPagination.setPageSize} rangeLabel={categoriesPagination.rangeLabel} />}
            </div>
            </div>
          </Card>}

        {activeView === "solution-catalog" && <Card title={supportViewMeta["solution-catalog"].title} description={supportViewMeta["solution-catalog"].description} fill>
            <div className={s.tableSplitLayout}>
              <div className={styles.subSectionHead}>
                <h4 className={styles.subSectionTitle}>{ss.solutions.interventionTitle}</h4>
                <Btn icon="mdi:plus" size="sm" onClick={() => openCreateSolutionCatalogModal("intervention")}>
                  {ss.common.actions.add}
                </Btn>
              </div>

              <div className={ui.toolRow}>
                <div className={ui.toolLeft}>
                  <input type="search" className={ui.fieldSearch} placeholder={ss.solutions.searchIntervention} value={solutionInterventionSearch} onChange={e => setSolutionInterventionSearch(e.target.value)} />
                  <span className={ui.count}>
                    {formatSupportSettingsCount(locale, "entry", filteredSolutionInterventions.length)}
                  </span>
                </div>
              </div>

              <div className={s.tableSectionPinned}>
                <div className={s.tableWrap}>
                  <table className={s.table}>
                    <thead>
                      <tr>
                        <th>{ss.common.columns.label}</th>
                        <th>{ss.common.columns.order}</th>
                        <th>{ss.common.columns.status}</th>
                        <th style={{
                      width: 88
                    }} aria-label={ss.common.actions.actionsAria} />
                      </tr>
                    </thead>
                    <tbody>
                      {filteredSolutionInterventions.length === 0 ? <tr>
                          <td colSpan={4} className={s.empty}>
                            {ss.solutions.emptyInterventions}
                          </td>
                        </tr> : solutionInterventionsPagination.paginatedItems.map(entry => <tr key={String(entry.id)}>
                            <td>{entry.label || ss.common.emptyDash}</td>
                            <td>{Number(entry.displayOrder) || 0}</td>
                            <td>
                              <EntityStatus active={entry.isActive !== false} {...entityStatusLabels} />
                            </td>
                            <td>
                              <div className={s.actions}>
                                <button type="button" className={s.actionBtn} title={ss.common.actions.edit} onClick={() => openEditSolutionCatalogModal(entry)}>
                                  <Icon icon="mdi:pencil-outline" aria-hidden />
                                </button>
                                <button type="button" className={`${s.actionBtn} ${s.actionBtnDanger}`} title={ss.common.actions.delete} onClick={() => setSolutionCatalogDeleteTarget(entry)}>
                                  <Icon icon="mdi:delete-outline" aria-hidden />
                                </button>
                              </div>
                            </td>
                          </tr>)}
                    </tbody>
                  </table>
                </div>
                {filteredSolutionInterventions.length > 0 && <Pagination page={solutionInterventionsPagination.page} totalPages={solutionInterventionsPagination.totalPages} onPageChange={solutionInterventionsPagination.setPage} pageSize={solutionInterventionsPagination.pageSize} onPageSizeChange={solutionInterventionsPagination.setPageSize} rangeLabel={solutionInterventionsPagination.rangeLabel} />}
              </div>

              <div className={styles.subSectionHead}>
                <h4 className={styles.subSectionTitle}>{ss.solutions.actionTitle}</h4>
                <Btn icon="mdi:plus" size="sm" onClick={() => openCreateSolutionCatalogModal("action")}>
                  {ss.common.actions.add}
                </Btn>
              </div>

              <div className={ui.toolRow}>
                <div className={ui.toolLeft}>
                  <input type="search" className={ui.fieldSearch} placeholder={ss.solutions.searchAction} value={solutionActionSearch} onChange={e => setSolutionActionSearch(e.target.value)} />
                  <span className={ui.count}>
                    {formatSupportSettingsCount(locale, "entry", filteredSolutionActions.length)}
                  </span>
                </div>
              </div>

              <div className={s.tableSection}>
                <div className={s.tableWrap}>
                  <table className={s.table}>
                    <thead>
                      <tr>
                        <th>{ss.common.columns.label}</th>
                        <th>{ss.common.columns.order}</th>
                        <th>{ss.common.columns.status}</th>
                        <th style={{
                      width: 88
                    }} aria-label={ss.common.actions.actionsAria} />
                      </tr>
                    </thead>
                    <tbody>
                      {filteredSolutionActions.length === 0 ? <tr>
                          <td colSpan={4} className={s.empty}>
                            {ss.solutions.emptyActions}
                          </td>
                        </tr> : solutionActionsPagination.paginatedItems.map(entry => <tr key={String(entry.id)}>
                            <td>{entry.label || ss.common.emptyDash}</td>
                            <td>{Number(entry.displayOrder) || 0}</td>
                            <td>
                              <EntityStatus active={entry.isActive !== false} {...entityStatusLabels} />
                            </td>
                            <td>
                              <div className={s.actions}>
                                <button type="button" className={s.actionBtn} title={ss.common.actions.edit} onClick={() => openEditSolutionCatalogModal(entry)}>
                                  <Icon icon="mdi:pencil-outline" aria-hidden />
                                </button>
                                <button type="button" className={`${s.actionBtn} ${s.actionBtnDanger}`} title={ss.common.actions.delete} onClick={() => setSolutionCatalogDeleteTarget(entry)}>
                                  <Icon icon="mdi:delete-outline" aria-hidden />
                                </button>
                              </div>
                            </td>
                          </tr>)}
                    </tbody>
                  </table>
                </div>
                {filteredSolutionActions.length > 0 && <Pagination page={solutionActionsPagination.page} totalPages={solutionActionsPagination.totalPages} onPageChange={solutionActionsPagination.setPage} pageSize={solutionActionsPagination.pageSize} onPageSizeChange={solutionActionsPagination.setPageSize} rangeLabel={solutionActionsPagination.rangeLabel} />}
              </div>
            </div>
          </Card>}

        {activeView === "ticket-views" && <AdminTicketViews profiles={ticketViewProfiles} users={ticketViewUsers} teams={ticketViewTeams} />}

        {activeView === "macros" && <Card title={supportViewMeta.macros.title} description={supportViewMeta.macros.description} fill action={<Btn icon="mdi:plus" onClick={openCreateMacroModal} disabled={macrosAtLimit} title={macrosAtLimit ? interpolate(ss.macros.limitTitle, {
        max: maxMacros
      }) : undefined}>
                {ss.macros.addBtn}
              </Btn>}>
            {maxMacros != null && <p className={styles.limitHint}>
                <CommunityFeatureBadge variant="inline" className={styles.proBadgeInline} />
                {macrosAtLimit ? <>
                    {interpolate(ss.macros.limitReached, {
              current: macros.length,
              max: maxMacros
            })}{" "}
                    <ProFeatureBadge variant="inline" className={styles.proBadgeInline} />
                  </> : <>
                    {interpolate(ss.macros.quota, {
              current: macros.length,
              max: maxMacros
            })}
                  </>}
              </p>}
            <div className={s.tableSection}>
              <div className={s.tableWrap}>
                <table className={s.table}>
                  <thead>
                    <tr>
                      <th>{ss.common.columns.name}</th>
                      <th>{ss.common.columns.steps}</th>
                      <th style={{
                    width: 88
                  }} aria-label={ss.common.actions.actionsAria} />
                    </tr>
                  </thead>
                  <tbody>
                    {macros.length === 0 ? <tr>
                        <td colSpan={3} className={s.empty}>{ss.macros.empty}</td>
                      </tr> : macrosPagination.paginatedItems.map(macro => <tr key={macro.id}>
                          <td>{macro.name}</td>
                          <td>{Array.isArray(macro.actions) ? macro.actions.length : 0}</td>
                          <td>
                            <div className={s.actions}>
                              <button type="button" className={s.actionBtn} title={ss.common.actions.edit} onClick={() => openEditMacroModal(macro)}>
                                <Icon icon="mdi:pencil-outline" aria-hidden />
                              </button>
                              <button type="button" className={`${s.actionBtn} ${s.actionBtnDanger}`} title={ss.common.actions.delete} onClick={() => setMacroDeleteTarget(macro)}>
                                <Icon icon="mdi:delete-outline" aria-hidden />
                              </button>
                            </div>
                          </td>
                        </tr>)}
                  </tbody>
                </table>
              </div>
              {macros.length > 0 && <Pagination page={macrosPagination.page} totalPages={macrosPagination.totalPages} onPageChange={macrosPagination.setPage} pageSize={macrosPagination.pageSize} onPageSizeChange={macrosPagination.setPageSize} rangeLabel={macrosPagination.rangeLabel} />}
            </div>
          </Card>}

        {activeView === "collectors" && <Card title={mc.collectors.title} description={mc.collectors.description} fill action={<Btn icon="mdi:plus" onClick={openCreateCollectorModal}>
                {mc.collectors.addBtn}
              </Btn>}>
            <div className={styles.userTableWrapper}>
              <table className={`${styles.userTable} ${styles.clientTable}`}>
                <thead>
                  <tr>
                    <th>{mc.collectors.columns.name}</th>
                    <th>{mc.collectors.columns.server}</th>
                    <th>{mc.collectors.columns.protocol}</th>
                    <th>{mc.collectors.columns.folder}</th>
                    <th>{mc.collectors.columns.interval}</th>
                    <th style={{
                  textAlign: "center"
                }}>{mc.collectors.columns.active}</th>
                    <th>{mc.collectors.columns.collected}</th>
                    <th>{mc.collectors.columns.validated}</th>
                    <th>{mc.collectors.columns.ignored}</th>
                    <th>{mc.collectors.columns.logs}</th>
                    <th>{mc.collectors.columns.actions}</th>
                  </tr>
                </thead>
                <tbody>
                  {mailCollectors.length === 0 && <tr>
                      <td colSpan={11} style={{
                  textAlign: "center",
                  padding: "1.25rem",
                  color: "var(--msp-muted)"
                }}>
                        {mc.collectors.empty}
                      </td>
                    </tr>}
                  {mailCollectors.map(collector => {
                const emailStats = resolveCollectorEmailStats(collector);
                const validatedPct = formatCollectorStatPercent(emailStats.validated, emailStats.collected);
                const ignoredPct = formatCollectorStatPercent(emailStats.ignored, emailStats.collected);
                return <tr key={collector.id} className={styles.userRow} onClick={() => openEditCollectorModal(collector)} style={{
                  cursor: "pointer"
                }}>
                      <td>
                        <span className={styles.collectorName}>{collector.name || "-"}</span>
                      </td>
                      <td>
                        <span className={styles.collectorServer}>{collector.server || "-"}</span>
                      </td>
                      <td>
                        <span className={s.badge}>
                          {String(collector.protocol || "imap").toUpperCase()} / {String(collector.security || "tls").toUpperCase()}
                        </span>
                      </td>
                      <td>
                        <span className={s.badge}>{collector.inboxFolder || "INBOX"}</span>
                      </td>
                      <td className={s.dateCell}>
                        {Number(collector.checkIntervalMinutes ?? 5)} {mc.common.minSuffix}
                      </td>
                      <td style={{
                    textAlign: "center"
                  }}>
                        <EntityStatus active={collector.enabled !== false} {...entityStatusLabels} />
                      </td>
                      <td>
                        <Badge variant={emailStats.collected > 0 ? "default" : "muted"}>
                          {emailStats.collected}
                        </Badge>
                      </td>
                      <td>
                        <span className={styles.collectorStatCell}>
                          <span className={styles.collectorStatValue}>{emailStats.validated}</span>
                          {emailStats.collected > 0 && <span className={`${styles.collectorStatPct} ${styles.collectorStatPct_success}`}>
                              ({validatedPct})
                            </span>}
                        </span>
                      </td>
                      <td>
                        <span className={styles.collectorStatCell}>
                          <span className={styles.collectorStatValue}>{emailStats.ignored}</span>
                          {emailStats.collected > 0 && <span className={`${styles.collectorStatPct} ${styles.collectorStatPct_warn}`}>
                              ({ignoredPct})
                            </span>}
                        </span>
                      </td>
                      <td>
                        <Badge variant={Array.isArray(collector.logs) && collector.logs.length > 0 ? "default" : "muted"}>
                          {Array.isArray(collector.logs) ? collector.logs.length : 0}
                        </Badge>
                      </td>
                      <td>
                        <div className={styles.actionsCell}>
                          <button type="button" className={styles.actionButton} title={mc.collectors.actions.forceFetch} disabled={forcingCollectorId === collector.id} onClick={e => {
                        e.stopPropagation();
                        forceCollectorFetch(collector);
                      }}>
                            <Icon icon={forcingCollectorId === collector.id ? "mingcute:loading-3-fill" : "mingcute:refresh-2-fill"} />
                          </button>
                          <button type="button" className={styles.actionButton} title={mc.collectors.actions.viewLogs} onClick={e => {
                        e.stopPropagation();
                        openCollectorLogsModal(collector);
                      }}>
                            <Icon icon="mingcute:time-line" />
                          </button>
                          <button type="button" className={styles.actionButton} title={mc.collectors.actions.edit} onClick={e => {
                        e.stopPropagation();
                        openEditCollectorModal(collector);
                      }}>
                            <Icon icon="mdi:pencil-outline" />
                          </button>
                          <button type="button" className={`${styles.actionButton} ${styles.danger}`} title={mc.collectors.actions.delete} onClick={e => {
                        e.stopPropagation();
                        requestRemoveCollector(collector);
                      }}>
                            <Icon icon="mdi:delete-outline" />
                          </button>
                        </div>
                      </td>
                    </tr>;
              })}
                </tbody>
              </table>
            </div>
          </Card>}

        {activeView === "email-ingestion" && <Card title={mc.rules.title} description={mc.rules.description} fill action={<div style={{
        display: "flex",
        gap: "0.5rem",
        alignItems: "center"
      }}>
                <Btn variant="secondary" onClick={() => {
          setShowRulesTestModal(true);
          setRulesTestResult(null);
        }}>
                  {mc.rules.testBtn}
                </Btn>
                <Btn icon="mdi:plus" onClick={openCreateExclusionRuleModal}>
                  {mc.rules.addBtn}
                </Btn>
              </div>}>
            <div className={styles.settingRow}>
              <div style={{
            display: "grid",
            gap: "0.6rem"
          }}>
                <div className={styles.userTableWrapper}>
                  <table className={`${styles.userTable} ${styles.clientTable}`}>
                    <thead>
                      <tr>
                        <th style={{
                      textAlign: "center"
                    }}>{mc.rules.columns.order}</th>
                        <th>{mc.rules.columns.name}</th>
                        <th>{mc.rules.columns.collector}</th>
                        <th>{mc.rules.columns.criteria}</th>
                        <th>{mc.rules.columns.action}</th>
                        <th style={{
                      textAlign: "center"
                    }}>{mc.rules.columns.active}</th>
                        <th style={{
                      textAlign: "center"
                    }}>{mc.rules.columns.delete}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {exclusionRules.map(rule => <tr key={rule.id} className={styles.userRow} onClick={() => openEditExclusionRuleModal(rule)} style={{
                    cursor: "pointer"
                  }} title={mc.rules.clickToEdit}>
                          <td style={{
                      textAlign: "center",
                      whiteSpace: "nowrap"
                    }}>
                            <div className={styles.actionsCell} style={{
                        justifyContent: "center"
                      }}>
                              <button type="button" className={styles.actionButton} onClick={event => {
                          event.stopPropagation();
                          moveExclusionRule(rule.id, -1);
                        }} title={mc.rules.moveUp}>
                                <Icon icon="mdi:chevron-up" />
                              </button>
                              <button type="button" className={styles.actionButton} onClick={event => {
                          event.stopPropagation();
                          moveExclusionRule(rule.id, 1);
                        }} title={mc.rules.moveDown}>
                                <Icon icon="mdi:chevron-down" />
                              </button>
                            </div>
                          </td>
                          <td>{rule.name || mc.common.ruleFallback}</td>
                          <td>{describeLocalizedRuleCollector(rule, mailCollectors, mc)}</td>
                          <td>{describeLocalizedExclusionRuleFilters(rule, mc)}</td>
                          <td>{getRuleActionLabel(rule.action, mc)}</td>
                          <td style={{
                      textAlign: "center"
                    }}>
                            <EntityStatus active={rule.enabled !== false} {...entityStatusLabels} />
                          </td>
                          <td style={{
                      textAlign: "center"
                    }}>
                            <div className={styles.actionsCell} style={{
                        justifyContent: "center"
                      }}>
                              <button type="button" className={`${styles.actionButton} ${styles.danger}`} title={mc.rules.delete} onClick={event => {
                          event.stopPropagation();
                          requestRemoveExclusionRule(rule);
                        }}>
                                <Icon icon="mdi:delete-outline" />
                              </button>
                            </div>
                          </td>
                        </tr>)}
                      {exclusionRules.length === 0 && <tr>
                          <td colSpan={7} style={{
                      textAlign: "center",
                      padding: "1.25rem",
                      color: "var(--msp-muted)"
                    }}>
                            {mc.rules.empty}
                          </td>
                        </tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

          </Card>}

        {activeView === "notifications" && <Card title={TICKET_VIEW_META.notifications.title} description={TICKET_VIEW_META.notifications.description} fill action={<div style={{
        display: "inline-flex",
        gap: "0.45rem"
      }}>
                <Btn icon="streamline:annoncement-megaphone-solid" variant="secondary" title="Send an announcement" onClick={() => setShowCustomNotificationModal(true)} disabled={(notificationSettings?.webhooks || []).length === 0}>
                  Announcement
                </Btn>
                <Btn icon="mdi:plus" onClick={addNotificationEvent}>
                  Add
                </Btn>
              </div>}>
            <div className={styles.settingRow}>
              <div className={styles.userTableWrapper}>
                <table className={`${styles.userTable} ${styles.clientTable}`}>
                  <thead>
                    <tr>
                      <th>SOURCE</th>
                      <th>ITEM</th>
                      <th>LEAD (D)</th>
                      <th>TARGET</th>
                      <th>CHANNEL</th>
                      <th>WEBHOOK</th>
                      <th>TEMPLATE</th>
                      <th>ACTIVE</th>
                      <th>ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(notificationSettings?.notificationEvents || []).map(eventItem => <tr key={eventItem.id} className={styles.userRow} onClick={() => openEditNotificationEvent(eventItem)} style={{
                  cursor: "pointer"
                }} title="Click to edit event">
                        <td>{getSourceOption(eventItem.source || "tickets").label}</td>
                        <td>{getElementOption(eventItem.source || "tickets", eventItem.element || "").label}</td>
                        <td>{isSoonElementKey(eventItem.element) ? Number(eventItem.daysBefore ?? 30) : "-"}</td>
                        <td>
                          {eventItem.scopeType === "enterprise" ? availableClients.find(client => String(client?.id) === String(eventItem.enterpriseId))?.name || "Specific company" : "All companies"}
                        </td>
                        <td>
                          {NOTIFICATION_CHANNEL_OPTIONS.find(item => item.key === eventItem.channel)?.label || eventItem.channel || "-"}
                        </td>
                        <td>
                          {(notificationSettings?.webhooks || []).find(w => w.id === eventItem.webhookId)?.name || "-"}
                        </td>
                        <td>
                          {eventItem.useTemplate ? commentTemplates.find(tpl => tpl.id === eventItem.templateId)?.name || "-" : eventItem.customMessage ? "Custom message" : "No"}
                        </td>
                        <td>{eventItem.enabled ? "Yes" : "No"}</td>
                        <td>
                          <div className={styles.actionsCell}>
                            <button type="button" className={styles.actionButton} title="Edit event" onClick={e => {
                        e.stopPropagation();
                        openEditNotificationEvent(eventItem);
                      }}>
                              <Icon icon="mdi:pencil-outline" />
                            </button>
                            <button type="button" className={`${styles.actionButton} ${styles.danger}`} title="Delete event" onClick={e => {
                        e.preventDefault();
                        e.stopPropagation();
                        void removeNotificationEvent(eventItem.id);
                      }}>
                              <Icon icon="mdi:delete-outline" />
                            </button>
                          </div>
                        </td>
                      </tr>)}
                    {(notificationSettings?.notificationEvents || []).length === 0 && <tr>
                        <td colSpan={9} style={{
                    textAlign: "center",
                    padding: "1.25rem",
                    color: "var(--msp-muted)"
                  }}>
                          No events configured.
                        </td>
                      </tr>}
                  </tbody>
                </table>
              </div>
            </div>

            <div className={styles.settingRow} style={{
          marginTop: "1rem"
        }}>
              <h4 className={styles.subSectionTitle}>Notification logs</h4>
              <div className={styles.userTableWrapper}>
                <table className={`${styles.userTable} ${styles.clientTable}`}>
                  <thead>
                    <tr>
                      <th>DATE</th>
                      <th>SOURCE</th>
                      <th>ITEM</th>
                      <th>ENTREPRISE</th>
                      <th>CHANNEL</th>
                      <th>STATUT</th>
                      <th>MESSAGE</th>
                      <th>ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedNotificationLogs.map(logItem => <tr key={logItem.id} className={styles.userRow}>
                        <td>
                          {logItem.createdAt ? new Date(logItem.createdAt).toLocaleString("fr-FR") : "-"}
                        </td>
                        <td>{getSourceOption(logItem.source || "tickets").label || "-"}</td>
                        <td>{getElementOption(logItem.source || "tickets", logItem.element || "updated").label || "-"}</td>
                        <td>
                          {logItem.enterpriseId ? availableClients.find(client => String(client?.id) === String(logItem.enterpriseId))?.name || logItem.enterpriseId : "Toutes les entreprises"}
                        </td>
                        <td>{logItem.channel || "-"}</td>
                        <td>{logItem.status || "-"}</td>
                        <td>{logItem.message || "-"}</td>
                        <td>
                          <div className={styles.actionsCell}>
                            <button type="button" className={styles.actionButton} title="Resend notification" onClick={() => retryNotificationLog(logItem)} disabled={retryingNotificationLogId === String(logItem.id || "")}>
                              <Icon icon={retryingNotificationLogId === String(logItem.id || "") ? "mingcute:loading-fill" : "mingcute:send-plane-fill"} />
                            </button>
                          </div>
                        </td>
                      </tr>)}
                    {totalNotificationLogs === 0 && <tr>
                        <td colSpan={8} style={{
                    textAlign: "center",
                    padding: "1.25rem",
                    color: "var(--msp-muted)"
                  }}>
                          No notification logs yet.
                        </td>
                      </tr>}
                  </tbody>
                </table>
              </div>
              {totalNotificationLogs > 0 && <div style={{
            marginTop: "0.65rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "0.6rem"
          }}>
                  <div className={styles.paginationMeta}>
                    Page {notificationLogsPage} / {notificationLogsTotalPages} - {totalNotificationLogs} log(s)
                  </div>
                  <div style={{
              display: "inline-flex",
              gap: "0.4rem",
              alignItems: "center"
            }}>
                    <button type="button" className={styles.secondaryButton} onClick={() => setNotificationLogsPage(prev => Math.max(1, prev - 1))} disabled={notificationLogsPage <= 1} style={{
                padding: "0.3rem 0.55rem",
                minHeight: "auto"
              }}>
                      Previous
                    </button>
                    <button type="button" className={styles.secondaryButton} onClick={() => setNotificationLogsPage(prev => Math.min(notificationLogsTotalPages, prev + 1))} disabled={notificationLogsPage >= notificationLogsTotalPages} style={{
                padding: "0.3rem 0.55rem",
                minHeight: "auto"
              }}>
                      Next
                    </button>
                  </div>
                </div>}
            </div>

          </Card>}

        {activeView === "webhooks" && <Card title={TICKET_VIEW_META.webhooks.title} description={TICKET_VIEW_META.webhooks.description} fill action={<Btn icon="mdi:plus" onClick={addNotificationWebhook}>
                Add webhook
              </Btn>}>
            <div className={styles.settingRow}>
              <div className={styles.userTableWrapper}>
                <table className={`${styles.userTable} ${styles.clientTable}`}>
                  <thead>
                    <tr>
                      <th>NAME</th>
                      <th>CHANNEL</th>
                      <th>ACTIVE</th>
                      <th>URL</th>
                      <th>ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(notificationSettings?.webhooks || []).map(webhook => <tr key={webhook.id} className={styles.userRow} onClick={() => openEditNotificationWebhook(webhook)} style={{
                  cursor: "pointer"
                }} title="Click to edit webhook">
                        <td>{webhook.name || "-"}</td>
                        <td style={{
                    textAlign: "center"
                  }}>
                          <Icon icon={WEBHOOK_CHANNEL_ICON_BY_KEY[String(webhook.channel || "").toLowerCase()] || "mingcute:link-2-fill"} title={String(webhook.channel || "webhook").toUpperCase()} style={{
                      fontSize: "1.15rem"
                    }} />
                        </td>
                        <td>{webhook.enabled ? "Yes" : "No"}</td>
                        <td title={webhook.url || "-"}>
                          <span style={{
                      display: "inline-block",
                      maxWidth: "320px",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      verticalAlign: "bottom"
                    }}>
                            {webhook.url || "-"}
                          </span>
                        </td>
                        <td>
                          <div className={styles.actionsCell}>
                            <button type="button" className={styles.actionButton} title="Test webhook" disabled={testingWebhookId === String(webhook.id)} onClick={event => {
                        event.stopPropagation();
                        testNotificationWebhook(webhook);
                      }}>
                              <Icon icon={testingWebhookId === String(webhook.id) ? "mingcute:loading-fill" : "mingcute:send-plane-fill"} />
                            </button>
                            <button type="button" className={styles.actionButton} title="Edit webhook" onClick={event => {
                        event.stopPropagation();
                        openEditNotificationWebhook(webhook);
                      }}>
                              <Icon icon="mdi:pencil-outline" />
                            </button>
                            <button type="button" className={`${styles.actionButton} ${styles.danger}`} title="Delete webhook" onClick={event => {
                        event.preventDefault();
                        event.stopPropagation();
                        void removeNotificationWebhook(webhook.id);
                      }}>
                              <Icon icon="mdi:delete-outline" />
                            </button>
                          </div>
                        </td>
                      </tr>)}
                    {(notificationSettings?.webhooks || []).length === 0 && <tr>
                        <td colSpan={5} style={{
                    textAlign: "center",
                    padding: "1.25rem",
                    color: "var(--msp-muted)"
                  }}>
                          No webhooks configured.
                        </td>
                      </tr>}
                  </tbody>
                </table>
              </div>
            </div>
          </Card>}

        {activeView === "scheduled-alerts" && <Card title={TICKET_VIEW_META["scheduled-alerts"].title} description={TICKET_VIEW_META["scheduled-alerts"].description} fill action={<Btn icon="mdi:plus" onClick={openCreateScheduledAlertModal}>
                Add CRON rule
              </Btn>}>
            <div className={styles.userTableWrapper}>
              <table className={`${styles.userTable} ${styles.clientTable}`}>
                <thead>
                  <tr>
                    <th>NAME</th>
                    <th>CRON</th>
                    <th>TRIGGER</th>
                    <th style={{
                  textAlign: "center"
                }}>ACTIVE</th>
                    <th style={{
                  textAlign: "right"
                }}>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {scheduledAlertRules.length === 0 && <tr>
                      <td colSpan={5} style={{
                  textAlign: "center",
                  padding: "1.25rem",
                  color: "var(--msp-muted)"
                }}>
                        No CRON rules configured
                      </td>
                    </tr>}
                  {scheduledAlertRules.map(rule => <tr key={rule.id} className={styles.userRow} onClick={() => openEditScheduledAlertModal(rule)} style={{
                cursor: "pointer"
              }} title="Click to edit rule">
                      <td>{rule.name || "Unnamed rule"}</td>
                      <td>{rule.cron || "-"}</td>
                      <td>{describeScheduledAlertRule(rule)}</td>
                      <td style={{
                  textAlign: "center"
                }}>{rule.enabled ? "Yes" : "No"}</td>
                      <td style={{
                  textAlign: "right"
                }}>
                        <div className={styles.actionsCell} style={{
                    justifyContent: "flex-end",
                    width: "100%"
                  }}>
                          <button type="button" className={styles.actionButton} title="Edit rule" onClick={e => {
                      e.stopPropagation();
                      openEditScheduledAlertModal(rule);
                    }}>
                            <Icon icon="mdi:pencil-outline" />
                          </button>
                          <button type="button" className={`${styles.actionButton} ${styles.danger}`} title="Delete rule" onClick={e => {
                      e.stopPropagation();
                      requestRemoveScheduledAlertRule(rule);
                    }}>
                            <Icon icon="mdi:delete-outline" />
                          </button>
                        </div>
                      </td>
                    </tr>)}
                </tbody>
              </table>
            </div>
          </Card>}

      </div>

      <IngestionRuleFormModal open={showExclusionRuleModal} copy={mc} mode={exclusionRuleModalMode} draft={exclusionRuleDraft} setDraft={setExclusionRuleDraft} mailCollectors={mailCollectors} saving={savingExclusionRule} onClose={closeExclusionRuleModal} onSave={saveExclusionRuleFromModal} />

      <IngestionRuleTestModal open={showRulesTestModal} copy={mc} sample={rulesTestDraft} onSampleChange={setRulesTestDraft} mailCollectors={mailCollectors} result={rulesTestResult} testing={testingRules} onClose={() => !testingRules && setShowRulesTestModal(false)} onRunTest={runExclusionRulesTest} />

      <IngestionRuleDeleteModal open={Boolean(exclusionRuleDeleteTarget)} ruleName={exclusionRuleDeleteTarget?.name || mc.common.ruleFallback} saving={deletingExclusionRule} onClose={closeExclusionRuleDeleteModal} onConfirm={confirmRemoveExclusionRule} />

      <ScheduledAlertRuleFormModal open={showScheduledAlertModal} mode={scheduledAlertModalMode} draft={scheduledAlertDraft} setDraft={setScheduledAlertDraft} saving={savingScheduledAlert} isTeamsIntegrationActive={isTeamsIntegrationActive} onClose={closeScheduledAlertModal} onSave={saveScheduledAlertFromModal} />

      <ConfirmModal open={Boolean(scheduledAlertDeleteTarget)} title={deleteCopy.scheduledAlertTitle} icon="mdi:clock-remove-outline" message={interpolate(deleteCopy.scheduledAlertMessage, {
      name: scheduledAlertDeleteTarget?.name || deleteCopy.untitled
    })} confirmLabel={common.delete} confirmVariant="dangerSolid" confirmLoading={savingScheduledAlert} onClose={() => !savingScheduledAlert && setScheduledAlertDeleteTarget(null)} onConfirm={confirmRemoveScheduledAlertRule} />

      <ConfirmModal open={Boolean(templateDeleteTarget)} title={deleteCopy.templateTitle} icon="mdi:delete-alert-outline" message={interpolate(deleteCopy.templateMessage, {
      name: templateDeleteTarget?.name || deleteCopy.untitled
    })} confirmLabel={common.delete} confirmVariant="dangerSolid" confirmLoading={deletingTemplate} onClose={() => !deletingTemplate && setTemplateDeleteTarget(null)} onConfirm={confirmRemoveTemplate} />

      <ConfirmModal open={Boolean(macroDeleteTarget)} title={deleteCopy.macroTitle} icon="mdi:delete-alert-outline" message={interpolate(deleteCopy.macroMessage, {
      name: macroDeleteTarget?.name || deleteCopy.untitled
    })} confirmLabel={common.delete} confirmVariant="dangerSolid" confirmLoading={deletingMacro} onClose={() => !deletingMacro && setMacroDeleteTarget(null)} onConfirm={confirmRemoveMacro} />

      <ConfirmModal open={Boolean(categorySectionDeleteTarget)} title={deleteCopy.itilSectionTitle} icon="mdi:delete-alert-outline" message={interpolate(deleteCopy.itilSectionMessage, {
      name: categorySectionDeleteTarget?.name || deleteCopy.untitled
    })} confirmLabel={common.delete} confirmVariant="dangerSolid" confirmLoading={deletingCategorySection} onClose={() => !deletingCategorySection && setCategorySectionDeleteTarget(null)} onConfirm={confirmRemoveCategorySection} />

      <ConfirmModal open={Boolean(categoryDeleteTarget)} title={deleteCopy.itilCategoryTitle} icon="mdi:delete-alert-outline" message={interpolate(deleteCopy.itilCategoryMessage, {
      name: categoryDeleteTarget?.name || deleteCopy.untitled
    })} confirmLabel={common.delete} confirmVariant="dangerSolid" confirmLoading={deletingCategory} onClose={() => !deletingCategory && setCategoryDeleteTarget(null)} onConfirm={confirmRemoveCategory} />

      <ConfirmModal open={Boolean(solutionCatalogDeleteTarget)} title={deleteCopy.solutionCatalogTitle} icon="mdi:delete-alert-outline" message={interpolate(deleteCopy.solutionCatalogMessage, {
      name: solutionCatalogDeleteTarget?.label || deleteCopy.catalogEntryFallback
    })} confirmLabel={common.delete} confirmVariant="dangerSolid" confirmLoading={deletingSolutionCatalogEntry} onClose={() => !deletingSolutionCatalogEntry && setSolutionCatalogDeleteTarget(null)} onConfirm={confirmRemoveSolutionCatalogEntry} />

      <NotificationEventFormModal open={showNotificationEventModal} mode={notificationEventModalMode} draft={notificationEventDraft} setDraft={setNotificationEventDraft} saving={savingNotificationEvent} availableClients={availableClients} webhooks={notificationSettings?.webhooks || []} commentTemplates={commentTemplates} editorRef={notificationEventEditorRef} onClose={closeNotificationEventModal} onSave={saveNotificationEventFromModal} onOpenVariables={() => openMessageVariablesModal("notification")} />

      {showCustomNotificationModal && <div className={styles.modalOverlay} onClick={() => setShowCustomNotificationModal(false)}>
          <div className={styles.modalContent} onClick={event => event.stopPropagation()} style={{
        maxWidth: "700px"
      }}>
            <div className={styles.modalHeader}>
              <div style={{
            display: "flex",
            alignItems: "center",
            gap: "0.75rem"
          }}>
                <Icon icon="streamline:annoncement-megaphone-solid" className={styles.modalIcon} />
                <h3>Send a custom announcement</h3>
              </div>
              <button className={styles.closeButton} onClick={() => setShowCustomNotificationModal(false)} title="Close">
                <Icon icon="mingcute:close-line" />
              </button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.settingRow}>
                <label className={styles.label}>Target webhook</label>
                <select className={`${styles.input} ${styles.select}`} value={customNotificationDraft.webhookId} onChange={e => setCustomNotificationDraft(prev => ({
              ...prev,
              webhookId: String(e.target.value || "")
            }))}>
                  <option value="">Select a target webhook</option>
                  {(notificationSettings?.webhooks || []).filter(webhook => webhook?.enabled !== false).map(webhook => <option key={webhook.id} value={webhook.id}>
                        {webhook.name || webhook.id}
                      </option>)}
                </select>
              </div>
              <div className={styles.settingRow}>
                <label className={styles.label}>Title (optional)</label>
                <input className={styles.input} placeholder="Announcement title" value={customNotificationDraft.title} onChange={e => setCustomNotificationDraft(prev => ({
              ...prev,
              title: e.target.value
            }))} />
              </div>
              <div className={styles.settingRow}>
                <label className={styles.label}>Message</label>
                <div style={{
              display: "flex",
              gap: "0.4rem",
              marginBottom: "0.6rem",
              flexWrap: "wrap"
            }}>
                  <button type="button" className={styles.secondaryButton} style={{
                padding: "0.28rem 0.45rem",
                minWidth: "34px"
              }} onClick={() => execCustomNotificationMessageCommand("bold")}>
                    <strong style={{
                  fontSize: "0.82rem"
                }}>B</strong>
                  </button>
                  <button type="button" className={styles.secondaryButton} style={{
                padding: "0.28rem 0.45rem",
                minWidth: "34px"
              }} onClick={() => execCustomNotificationMessageCommand("italic")}>
                    <em style={{
                  fontSize: "0.82rem"
                }}>I</em>
                  </button>
                  <button type="button" className={styles.secondaryButton} style={{
                padding: "0.28rem 0.45rem",
                minWidth: "34px"
              }} onClick={() => execCustomNotificationMessageCommand("underline")}>
                    <u style={{
                  fontSize: "0.82rem"
                }}>U</u>
                  </button>
                  <button type="button" className={styles.secondaryButton} style={{
                padding: "0.28rem 0.5rem",
                fontSize: "0.8rem"
              }} onClick={() => execCustomNotificationMessageCommand("insertUnorderedList")}>
                    • Liste
                  </button>
                  <button type="button" className={styles.secondaryButton} style={{
                padding: "0.28rem 0.5rem",
                fontSize: "0.8rem"
              }} onClick={() => {
                const url = window.prompt("Link URL", "https://");
                if (!url) return;
                execCustomNotificationMessageCommand("createLink", url);
              }}>
                    Link
                  </button>
                  <button type="button" className={styles.secondaryButton} style={{
                padding: "0.28rem 0.5rem",
                fontSize: "0.8rem",
                display: "inline-flex",
                gap: "0.3rem",
                alignItems: "center"
              }} onClick={insertCustomNotificationImageUrl}>
                    <Icon icon="mingcute:pic-fill" style={{
                  fontSize: "0.85rem"
                }} />
                    Image URL
                  </button>
                  <input type="color" onChange={e => execCustomNotificationMessageCommand("foreColor", e.target.value)} title="Text color" style={{
                width: "36px",
                height: "32px",
                border: "none",
                background: "transparent",
                padding: 0
              }} />
                  <button type="button" className={styles.secondaryButton} style={{
                padding: "0.28rem 0.5rem",
                fontSize: "0.8rem"
              }} onClick={() => setShowCustomNotificationPreview(prev => !prev)} disabled={String((notificationSettings?.webhooks || []).find(webhook => String(webhook?.id || "") === String(customNotificationDraft.webhookId || ""))?.channel || "").toLowerCase() !== "teams"}>
                    <Icon icon={showCustomNotificationPreview ? "mingcute:up-fill" : "mingcute:down-fill"} />
                    Teams preview
                  </button>
                </div>
                {String((notificationSettings?.webhooks || []).find(webhook => String(webhook?.id || "") === String(customNotificationDraft.webhookId || ""))?.channel || "").toLowerCase() === "teams" && <div style={{
              marginBottom: "0.55rem"
            }}>
                    <div className={styles.label} style={{
                marginBottom: "0.35rem"
              }}>
                      Teams accent color
                    </div>
                    <div style={{
                display: "flex",
                gap: "0.45rem",
                alignItems: "center",
                flexWrap: "wrap"
              }}>
                      {TEAMS_THEME_COLOR_PRESETS.map(color => {
                  const selected = String(customNotificationDraft.teamsThemeColor || "").toLowerCase() === String(color).toLowerCase();
                  return <button key={color} type="button" title={color} onClick={() => setCustomNotificationDraft(prev => ({
                    ...prev,
                    teamsThemeColor: color
                  }))} className={`${styles.colorSwatch} ${selected ? styles.colorSwatchSelected : ""}`} style={{
                    background: color
                  }} />;
                })}
                      <div style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.35rem"
                }}>
                        <span className={styles.colorCustomLabel}>Custom</span>
                        <input type="color" value={String(customNotificationDraft.teamsThemeColor || "#13BA8E")} onChange={e => setCustomNotificationDraft(prev => ({
                    ...prev,
                    teamsThemeColor: e.target.value
                  }))} style={{
                    width: "34px",
                    height: "28px",
                    border: "none",
                    background: "transparent",
                    padding: 0
                  }} title="Custom color" />
                      </div>
                    </div>
                  </div>}
                <div ref={customNotificationEditorRef} className={styles.input} contentEditable suppressContentEditableWarning onInput={e => setCustomNotificationDraft(prev => ({
              ...prev,
              message: String(e.currentTarget?.innerHTML || "").replace(/\soutline:\s*[^;"']+;?/gi, "")
            }))} style={{
              minHeight: "160px",
              lineHeight: 1.45,
              overflowY: "auto"
            }} />
                {showCustomNotificationPreview && String((notificationSettings?.webhooks || []).find(webhook => String(webhook?.id || "") === String(customNotificationDraft.webhookId || ""))?.channel || "").toLowerCase() === "teams" && <div className={styles.previewWrap}>
                    <div className={styles.previewLabel}>Teams preview</div>
                    <div className={styles.previewCard} style={{
                borderTop: `4px solid ${String(customNotificationDraft.teamsThemeColor || "#13BA8E")}`
              }}>
                      <div className={styles.previewTitle}>
                        {String(customNotificationDraft.title || "").trim() || "Announcement Veritas"}
                      </div>
                      <div className={styles.previewBody} dangerouslySetInnerHTML={{
                  __html: sanitizeHtml(String(customNotificationEditorRef.current?.innerHTML || customNotificationDraft.message || "").trim() || "<em>No message entered</em>")
                }} />
                    </div>
                  </div>}
              </div>
            </div>
            <div className={styles.modalActions}>
              <button type="button" className={styles.secondaryButton} onClick={() => setShowCustomNotificationModal(false)}>
                Cancel
              </button>
              <button type="button" className={styles.primaryButton} onClick={sendCustomWebhookNotification} disabled={sendingCustomNotification || (notificationSettings?.webhooks || []).length === 0}>
                {sendingCustomNotification ? "Sending..." : "Send announcement"}
              </button>
            </div>
          </div>
        </div>}

      <ItilCategoryFormModal open={showCategoryModal} mode={categoryModalMode} draft={categoryDraft} setDraft={setCategoryDraft} saving={savingCategory} sectionOptions={[...new Set(["Unclassified", ...ticketCategorySections.map(section => String(section?.name || "").trim())])].filter(Boolean)} onClose={() => !savingCategory && closeCategoryModal()} onSave={saveCategoryFromModal} />

      <ItilCategorySectionFormModal open={showCategorySectionModal} mode={categorySectionModalMode} draft={categorySectionDraft} setDraft={setCategorySectionDraft} saving={savingCategorySection} onClose={() => !savingCategorySection && closeCategorySectionModal()} onSave={saveCategorySectionFromModal} />

      <SolutionCatalogEntryModal open={showSolutionCatalogModal} mode={solutionCatalogModalMode} draft={solutionCatalogDraft} setDraft={setSolutionCatalogDraft} saving={savingSolutionCatalogEntry} onClose={() => !savingSolutionCatalogEntry && closeSolutionCatalogModal()} onSave={saveSolutionCatalogFromModal} />

      <WebhookFormModal open={showWebhookModal} mode={webhookModalMode} draft={webhookDraft} setDraft={setWebhookDraft} saving={savingWebhook} testing={testingWebhookConnection} testMessage={webhookTestMessage} testStatus={webhookTestStatus} onClose={closeWebhookModal} onSave={saveWebhookFromModal} onTest={testWebhookDraft} />

      <CollectorFormModal open={showCollectorModal} copy={mc} mode={collectorModalMode} draft={collectorDraft} setDraft={setCollectorDraft} providerKey={collectorProviderKey} onProviderChange={applyCollectorProviderPreset} saving={savingCollector} testing={testingCollectorConnection} onClose={closeCollectorModal} onSave={saveCollectorFromModal} onTestConnection={testCollectorConnection} onBrowseFolders={openFoldersModal} initialSection={collectorModalMode === "create" ? "provider" : "connection"} />

      <CollectorFoldersModal open={foldersModalOpen} copy={mc} loading={loadingCollectorFolders} folders={collectorAvailableFolders} onClose={() => setFoldersModalOpen(false)} onSelect={applyFolderSelection} />

      <CollectorLogsModal open={logsModalOpen} copy={mc} locale={locale} collectorName={logsCollectorName} logs={logsModalRows} onClose={() => setLogsModalOpen(false)} />

      <CollectorDeleteModal open={Boolean(collectorDeleteTarget)} collectorName={collectorDeleteTarget?.name || mc.common.collectorFallback} saving={deletingCollector} onClose={closeCollectorDeleteModal} onConfirm={confirmRemoveCollector} />

      {showTemplatePreviewModal && <div className={styles.modalOverlay} onClick={closeTemplatePreviewModal}>
          <div className={styles.modalContent} onClick={event => event.stopPropagation()} style={{
        maxWidth: "820px"
      }}>
            <div className={styles.modalHeader}>
              <div style={{
            display: "flex",
            alignItems: "center",
            gap: "0.75rem"
          }}>
                <Icon icon="mingcute:eye-2-fill" className={styles.modalIcon} />
                <h3>{interpolate(ss.templates.previewTitle, {
                name: templatePreviewTarget?.name || ""
              })}</h3>
              </div>
              <button className={styles.closeButton} onClick={closeTemplatePreviewModal} title={ss.templates.previewClose}>
                <Icon icon="mingcute:close-line" />
              </button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.htmlPreviewBox} dangerouslySetInnerHTML={{
            __html: sanitizeHtml(String(templatePreviewTarget?.content || ""))
          }} />
            </div>
            <div className={styles.modalActions}>
              <button type="button" className={styles.secondaryButton} onClick={closeTemplatePreviewModal}>
                {ss.templates.previewOk}
              </button>
            </div>
          </div>
        </div>}

      <TicketTemplateFormModal open={showTemplateModal} mode={templateModalMode} draft={templateDraft} setDraft={setTemplateDraft} saving={savingTemplate} onClose={closeTemplateModal} onSave={saveTemplateFromModal} onOpenVariables={() => openMessageVariablesModal("template")} templateVariablesEnabled={!isCommunity} templateEditorRef={templateEditorRef} templateImageInputRef={templateImageInputRef} selectedImageWidthPx={selectedImageWidthPx} setSelectedImageWidthPx={setSelectedImageWidthPx} onExecCommand={execTemplateCommand} onInsertImage={insertTemplateImage} onImageUpload={handleTemplateImageUpload} onEditorClick={handleTemplateEditorClick} onResizeImage={resizeSelectedTemplateImage} onResizeImageCustom={resizeSelectedTemplateImageCustom} onApplyImageWidth={applySelectedTemplateImageWidth} />

      {showMessageVariablesModal && createPortal(<div className={`${styles.modalOverlay} ${styles.modalOverlayStacked}`} onClick={closeMessageVariablesModal}>
          <div className={styles.modalContent} onClick={event => event.stopPropagation()} style={{
        maxWidth: "920px"
      }}>
            <div className={styles.modalHeader}>
              <div style={{
            display: "flex",
            alignItems: "center",
            gap: "0.75rem"
          }}>
                <Icon icon="mingcute:code-fill" className={styles.modalIcon} />
                <h3>Available variables</h3>
              </div>
              <button className={styles.closeButton} onClick={closeMessageVariablesModal} title="Close">
                <Icon icon="mingcute:close-line" />
              </button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.varsIntro}>
                Click a variable to insert it into{" "}
                {messageVariablesModalTarget === "notification" ? "the custom message." : "the template."}
              </div>
              <div className={styles.varsLayout}>
                <div className={styles.varsNav}>
                  {visibleMessageVariableGroups.map(group => <button key={`menu-${group.label}`} type="button" className={`${styles.secondaryButton} ${styles.varsNavBtn} ${activeVariableSection === group.label ? styles.varsNavBtnActive : ""}`} onClick={() => jumpToVariableSection(group.label)}>
                      {group.label}
                    </button>)}
                </div>
                <div className={styles.varsGroups}>
                  {visibleMessageVariableGroups.map(group => <div key={group.label} className={styles.varsGroup} ref={node => {
                variableSectionRefs.current[group.label] = node;
              }}>
                      <div className={styles.varsGroupTitle}>{group.label}</div>
                      <div className={styles.varsGroupList}>
                        {group.variables.map(variable => <button key={variable.key} type="button" className={`${styles.secondaryButton} ${styles.varRowBtn}`} title={variable.description} onClick={() => insertMessageVariableFromModal(variable.key)}>
                            <span className={styles.varKey}>{variable.key}</span>
                            <span className={styles.varDesc}>{variable.description}</span>
                          </button>)}
                      </div>
                    </div>)}
                </div>
              </div>
            </div>
            <div className={styles.modalActions}>
              <button type="button" className={styles.secondaryButton} onClick={closeMessageVariablesModal}>
                Close
              </button>
            </div>
          </div>
        </div>, document.body)}

      <MacroFormModal open={showMacroModal} mode={macroModalMode} draft={macroDraft} setDraft={setMacroDraft} saving={savingMacro} actions={macroDraft.actions || []} actionsCount={(macroDraft.actions || []).length} onClose={() => !savingMacro && closeMacroModal()} onSave={saveMacroFromModal} onAddAction={addDraftMacroAction} onDeleteAction={removeDraftMacroAction} describeAction={describeMacroAction} describeActionBrief={describeMacroActionBrief} renderActionEditor={({
      action,
      onChange
    }) => renderMacroActionFields({
      action,
      onChange
    })} />
    </Page>;
}
