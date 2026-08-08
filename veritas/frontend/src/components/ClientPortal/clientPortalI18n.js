import { TICKET_SATISFACTION_CRITERION_KEYS } from "../../i18n/ticketSatisfactionCriteriaI18n";
import { interpolate, normalizeLocale, pickLocaleMessages } from "../../i18n/translate";
import { VAULT_CATEGORIES } from "../../api/clientPortalVault";
import copyDe from "./clientPortalI18n.de.js";
import copyEn from "./clientPortalI18n.en.js";
import copyEs from "./clientPortalI18n.es.js";
import copyFr from "./clientPortalI18n.fr.js";
import copyIt from "./clientPortalI18n.it.js";
export const PORTAL_OPEN_STATUSES = new Set(["new", "open", "pending", "in_progress"]);
export const ATTACHMENT_FORMATS_LABEL = "PDF, JPG, PNG, DOC, DOCX, CSV, XLS, XLSX, MP4, 3GP, MP3, OGG, AAC, AMR, M4A";
const FLEET_LABEL_KEY_MAP = {
  "Non renseigné": "notSpecified",
  Portable: "laptop",
  Fixe: "desktop",
  "Non identifié": "unidentified",
  "Portable (modèle inconnu)": "unknownModelLaptop",
  "Fixe (modèle inconnu)": "unknownModelDesktop",
  "Windows 11": "windows11",
  "Windows 10": "windows10",
  "Windows Server": "windowsServer",
  "Windows (autre)": "windowsOther",
  Inconnu: "unknown",
  Autres: "other",
  Autre: "cpuOther",
  "Apple Silicon": "cpuAppleSilicon",
  AMD: "cpuAmd",
  Intel: "cpuIntel",
  Qualcomm: "cpuQualcomm",
  "Moins de 8 Go": "ramUnder8",
  "8 – 16 Go": "ram8to16",
  "16 – 32 Go": "ram16to32",
  "32 Go et +": "ram32plus",
  "< 256 Go": "diskUnder256",
  "256 – 512 Go": "disk256to512",
  "512 Go – 1 To": "disk512to1tb",
  "1 To et +": "disk1tbPlus",
  "Poste fixe": "powerDesktop",
  "Poste type": "powerGeneric"
};
const LOCALE_BCP47 = {
  fr: "fr-FR",
  en: "en-GB",
  de: "de-DE",
  it: "it-IT",
  es: "es-ES"
};
const STATUS_FILTER_META = {
  action_required: {
    icon: "mdi:clipboard-check-outline",
    kpiTone: "orange"
  },
  open: {
    icon: "mdi:inbox-arrow-down",
    kpiTone: "blue"
  },
  all: {
    icon: "mdi:ticket-outline",
    kpiTone: "blue"
  },
  resolved: {
    icon: "mdi:check-circle-outline",
    kpiTone: "blue"
  },
  closed: {
    icon: "mdi:archive-outline",
    kpiTone: "orange"
  }
};
const PRIORITY_ICONS = {
  low: "mdi:arrow-down",
  normal: "mdi:minus",
  high: "mdi:arrow-up",
  urgent: "mdi:alert"
};
const CHANNEL_ICONS = {
  web: "mdi:web",
  phone: "mdi:phone",
  email: "mdi:email-outline",
  chat: "mdi:message-outline",
  api: "mdi:api",
  whatsapp: "mdi:whatsapp"
};
const TICKET_TYPE_ICONS = {
  incident: "mdi:alert-circle-outline",
  demande: "mdi:hand-extended-outline"
};
const ISSUE_NATURE_ICONS = {
  hardware: "mdi:desktop-classic",
  software: "mdi:application-outline",
  unsure: "mdi:help-circle-outline"
};
const CLIENT_PORTAL_COPY = {
  fr: copyFr,
  en: copyEn,
  de: copyDe,
  it: copyIt,
  es: copyEs
};
export function getClientPortalCopy(locale) {
  const code = normalizeLocale(locale);
  const t = pickLocaleMessages(CLIENT_PORTAL_COPY, code);
  const bcp47 = LOCALE_BCP47[code] || LOCALE_BCP47.fr;
  const formatPortalDateTime = value => {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    return date.toLocaleString(bcp47, {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };
  const formatPortalDate = value => {
    if (!value) return "-";
    try {
      return new Date(value).toLocaleDateString(bcp47);
    } catch {
      return String(value);
    }
  };
  const formatSize = bytes => {
    const size = Number(bytes || 0);
    if (size < 1024) return interpolate(t.common.sizeBytes, {
      value: String(size)
    });
    if (size < 1024 * 1024) {
      return interpolate(t.common.sizeKb, {
        value: (size / 1024).toFixed(1)
      });
    }
    return interpolate(t.common.sizeMb, {
      value: (size / (1024 * 1024)).toFixed(1)
    });
  };
  const attachmentFormatsLabel = t.common.attachmentFormats || ATTACHMENT_FORMATS_LABEL;
  const localizeFleetChartLabel = label => {
    const key = FLEET_LABEL_KEY_MAP[String(label || "").trim()];
    if (key && t.fleet?.chartLabels?.[key]) return t.fleet.chartLabels[key];
    return label;
  };
  const localizeFleetDistribution = items => (Array.isArray(items) ? items : []).map(item => ({
    ...item,
    name: localizeFleetChartLabel(item?.name ?? item?.label)
  }));
  const getVaultCategoryLabel = category => {
    const value = String(category || "").trim();
    if (!value) return value;
    return t.vault?.categoryLabels?.[value] ?? value;
  };
  return {
    ...t,
    bcp47,
    PORTAL_OPEN_STATUSES,
    ATTACHMENT_FORMATS_LABEL: attachmentFormatsLabel,
    formatPortalDateTime,
    formatPortalDate,
    formatSize,
    formatTicketCount: count => interpolate(Number(count) === 1 ? t.common.ticketOne : t.common.ticketMany, {
      count: String(count)
    }),
    formatWorkstationCount: count => interpolate(Number(count) === 1 ? t.common.workstationOne : t.common.workstationMany, {
      count: String(count)
    }),
    formatEquipmentCount: count => interpolate(Number(count) === 1 ? t.common.equipmentOne : t.common.equipmentMany, {
      count: String(count)
    }),
    formatServiceCount: count => interpolate(Number(count) === 1 ? t.common.serviceOne : t.common.serviceMany, {
      count: String(count)
    }),
    formatMessageCount: count => interpolate(Number(count) === 1 ? t.common.messageOne : t.common.messageMany, {
      count: String(count)
    }),
    formatFileCount: count => interpolate(Number(count) === 1 ? t.common.fileOne : t.common.fileMany, {
      count: String(count)
    }),
    formatDocumentCount: count => interpolate(Number(count) === 1 ? t.common.documentOne : t.common.documentMany, {
      count: String(count)
    }),
    formatSharedAccessCount: count => interpolate(Number(count) === 1 ? t.common.sharedAccessOne : t.common.sharedAccessMany, {
      count: String(count)
    }),
    formatViewRemaining: (remaining, max) => interpolate(Number(remaining) === 1 ? t.vault.viewsRemainingOne : t.vault.viewsRemainingMany, {
      remaining: String(remaining),
      max: String(max)
    }),
    formatActionRequiredTitle: count => interpolate(Number(count) === 1 ? t.dashboard.actionRequiredTitleOne : t.dashboard.actionRequiredTitleMany, {
      count: String(count)
    }),
    formatOpenTicketsDetail: count => interpolate(t.dashboard.openTicketsDetail, {
      count: String(count)
    }),
    formatCloudServicesDetail: count => interpolate(Number(count) === 1 ? t.dashboard.cloudServicesDetailOne : t.dashboard.cloudServicesDetailMany, {
      count: String(count)
    }),
    getTicketStatus: status => t.ticket.status[status] ?? status,
    getTicketPriority: priority => t.ticket.priority[priority] ?? priority,
    getTicketTypeLabel: type => t.ticket.types[type]?.label ?? t.ticket.typeLabels[type] ?? type,
    getTicketTypeHint: type => t.ticket.types[type]?.hint ?? "",
    getIssueNatureLabel: key => t.ticket.create.issueNatureLabels[key] ?? key,
    getChannelLabel: channel => {
      const key = String(channel || "").toLowerCase();
      return t.ticket.channels[key] ?? channel ?? "-";
    },
    getChannelMeta: channel => {
      const key = String(channel || "").toLowerCase();
      return {
        label: t.ticket.channels[key] ?? channel ?? "-",
        icon: CHANNEL_ICONS[key] || "mdi:help-circle-outline"
      };
    },
    getPriorityVisual: priority => ({
      icon: PRIORITY_ICONS[priority] || PRIORITY_ICONS.normal,
      label: t.ticket.priority[priority] || t.ticket.priority.normal
    }),
    getActionRequiredBadge: ticket => {
      if (ticket?.resolutionValidation?.isPending) {
        return {
          label: t.ticket.badges.validationRequired
        };
      }
      if (String(ticket?.status || "").trim().toLowerCase() === "pending") {
        return {
          label: t.ticket.badges.actionRequired
        };
      }
      return null;
    },
    isTicketPendingValidation: ticket => Boolean(ticket?.resolutionValidation?.isPending),
    isTicketPendingClientResponse: ticket => String(ticket?.status || "").trim().toLowerCase() === "pending",
    isTicketActionRequired: ticket => {
      const status = String(ticket?.status || "").trim().toLowerCase();
      return Boolean(ticket?.resolutionValidation?.isPending) || status === "pending";
    },
    getStatusFilters: () => ["action_required", "open", "all", "resolved", "closed"].map(key => ({
      key,
      label: t.ticket.statusFilters[key],
      icon: STATUS_FILTER_META[key].icon,
      kpiTone: STATUS_FILTER_META[key].kpiTone
    })),
    getTicketTypes: () => ["incident", "demande"].map(key => ({
      key,
      label: t.ticket.types[key].label,
      hint: t.ticket.types[key].hint,
      icon: TICKET_TYPE_ICONS[key]
    })),
    getPriorityOptions: () => ["low", "normal", "high", "urgent"].map(key => ({
      key,
      label: t.ticket.priority[key],
      icon: PRIORITY_ICONS[key]
    })),
    getIssueNatureOptions: () => ["hardware", "software", "unsure"].map(key => ({
      key,
      label: t.ticket.create.issueNatureOptions[key],
      icon: ISSUE_NATURE_ICONS[key]
    })),
    getFleetHealthLabel: (attentionCount, total) => {
      if (attentionCount === 0) return t.fleet.health.controlled;
      if (attentionCount <= Math.max(1, Math.floor(total * 0.2))) return t.fleet.health.vigilance;
      return t.fleet.health.watch;
    },
    getSatisfactionCriteria: () => TICKET_SATISFACTION_CRITERION_KEYS.map(key => ({
      key,
      label: t.ticket.satisfactionCriteria[key]?.label ?? key,
      hint: t.ticket.satisfactionCriteria[key]?.hint ?? ""
    })),
    formatContactSlotLabel: slot => {
      const noteSuffix = slot?.note ? ` · ${slot.note}` : "";
      if (slot?.mode === "from" || !slot?.endTime && slot?.startTime) {
        return interpolate(t.ticket.create.contactSlotFrom, {
          date: slot?.date || "-",
          time: slot?.startTime || "-",
          note: noteSuffix
        });
      }
      return interpolate(t.ticket.create.contactSlotRange, {
        date: slot?.date || "-",
        start: slot?.startTime || "-",
        end: slot?.endTime || "-",
        note: noteSuffix
      });
    },
    formatStarAria: star => interpolate(Number(star) === 1 ? t.ticket.detail.starOne : t.ticket.detail.starMany, {
      count: String(star)
    }),
    formatStarDisplayAria: rating => interpolate(t.ticket.detail.starDisplay, {
      rating: String(rating)
    }),
    formatOpenTicketAria: id => interpolate(t.ticket.list.openTicketAria, {
      id: String(id)
    }),
    formatRemoveAttachmentAria: name => interpolate(t.ticket.create.removeAttachmentAria, {
      name: String(name)
    }),
    formatAutoCloseAt: date => interpolate(t.dashboard.autoCloseAt, {
      date
    }),
    getMfaStatus: user => {
      const m = t.profile.mfa;
      if (user?.mfa_enabled) {
        return {
          key: "enabled",
          label: m.enabled,
          desc: m.enabledDesc,
          icon: "mdi:shield-check"
        };
      }
      if (user?.mfa_pending_setup) {
        return {
          key: "pending",
          label: m.pending,
          desc: m.pendingDesc,
          icon: "mdi:shield-sync"
        };
      }
      return {
        key: "off",
        label: m.off,
        desc: m.offDesc,
        icon: "mdi:shield-off-outline"
      };
    },
    localizeFleetChartLabel,
    localizeFleetDistribution,
    getVaultCategoryLabel,
    getVaultCategoryOptions: () => VAULT_CATEGORIES.map(value => ({
      value,
      label: getVaultCategoryLabel(value)
    })),
    none: t.common.none,
    noneFeminine: t.common.noneFeminine
  };
}
