export const COLLECTOR_PROVIDER_PRESETS = [{
  key: "imap-pop3",
  label: "IMAP / POP3",
  icon: "mingcute:mail-fill",
  hint: "Manual configuration",
  connectionTitle: "Manual IMAP connection",
  connectionDescription: "Enter the credentials for the mailbox to scan.",
  defaults: {
    protocol: "imap",
    security: "ssl",
    validateCertMode: "no-validate-cert",
    server: "",
    port: "",
    inboxFolder: "INBOX"
  }
}, {
  key: "gmail",
  label: "Gmail",
  icon: "mdi:gmail",
  hint: "Google account",
  comingSoon: true,
  defaults: {
    protocol: "imap",
    security: "ssl",
    validateCertMode: "validate-cert",
    server: "imap.gmail.com",
    port: "993",
    inboxFolder: "INBOX"
  }
}, {
  key: "outlook-com",
  label: "Outlook.com",
  icon: "mdi:microsoft-outlook",
  hint: "Microsoft mailbox",
  comingSoon: true,
  defaults: {
    protocol: "imap",
    security: "ssl",
    validateCertMode: "validate-cert",
    server: "outlook.office365.com",
    port: "993",
    inboxFolder: "INBOX"
  }
}, {
  key: "o365",
  label: "Microsoft 365",
  icon: "mdi:microsoft-office",
  hint: "Office 365 tenant",
  comingSoon: true,
  defaults: {
    protocol: "imap",
    security: "ssl",
    validateCertMode: "validate-cert",
    server: "outlook.office365.com",
    port: "993",
    inboxFolder: "INBOX"
  }
}, {
  key: "ovh",
  label: "OVH",
  icon: "simple-icons:ovh",
  hint: "OVH mail / MX Plan",
  comingSoon: true,
  defaults: {
    protocol: "imap",
    security: "ssl",
    validateCertMode: "validate-cert",
    server: "ssl0.ovh.net",
    port: "993",
    inboxFolder: "INBOX"
  }
}, {
  key: "exchange",
  label: "Exchange",
  icon: "simple-icons:microsoftexchange",
  hint: "Exchange server",
  comingSoon: true,
  defaults: {
    protocol: "exchange",
    security: "ssl",
    validateCertMode: "validate-cert",
    server: "outlook.office365.com",
    port: "993",
    inboxFolder: "INBOX"
  }
}, {
  key: "yahoo",
  label: "Yahoo Mail",
  icon: "mdi:yahoo",
  hint: "Yahoo account",
  comingSoon: true,
  defaults: {
    protocol: "imap",
    security: "ssl",
    validateCertMode: "validate-cert",
    server: "imap.mail.yahoo.com",
    port: "993",
    inboxFolder: "INBOX"
  }
}, {
  key: "icloud",
  label: "iCloud Mail",
  icon: "mdi:apple-icloud",
  hint: "Apple account",
  comingSoon: true,
  defaults: {
    protocol: "imap",
    security: "ssl",
    validateCertMode: "validate-cert",
    server: "imap.mail.me.com",
    port: "993",
    inboxFolder: "INBOX"
  }
}, {
  key: "zoho",
  label: "Zoho Mail",
  icon: "simple-icons:zoho",
  hint: "Zoho account",
  comingSoon: true,
  defaults: {
    protocol: "imap",
    security: "ssl",
    validateCertMode: "validate-cert",
    server: "imap.zoho.com",
    port: "993",
    inboxFolder: "INBOX"
  }
}, {
  key: "proton-mail",
  label: "Proton Mail",
  icon: "mdi:shield-lock-outline",
  hint: "Via Proton Bridge",
  comingSoon: true,
  defaults: {
    protocol: "imap",
    security: "ssl",
    validateCertMode: "no-validate-cert",
    server: "127.0.0.1",
    port: "1143",
    inboxFolder: "INBOX"
  }
}];
export const COLLECTOR_FORM_SECTIONS = [{
  id: "provider",
  label: "Mailbox type",
  description: "Choose your email provider",
  icon: "mdi:email-multiple-outline"
}, {
  id: "connection",
  label: "Connection",
  description: "Credentials and server",
  icon: "mdi:server-network"
}, {
  id: "ingestion",
  label: "Ingestion",
  description: "Folders and frequency",
  icon: "mdi:inbox-arrow-down-outline"
}];
export function findCollectorProviderPreset(collector = {}) {
  const server = String(collector?.server || "").toLowerCase().trim();
  const protocol = String(collector?.protocol || "imap").toLowerCase().trim();
  if (!server) return COLLECTOR_PROVIDER_PRESETS[0];
  const match = COLLECTOR_PROVIDER_PRESETS.find(item => !item.comingSoon && String(item.defaults?.server || "").toLowerCase() === server && String(item.defaults?.protocol || "imap").toLowerCase() === protocol);
  if (match) return match;
  const fuzzy = COLLECTOR_PROVIDER_PRESETS.find(item => item.comingSoon && String(item.defaults?.server || "").toLowerCase() === server);
  return fuzzy || COLLECTOR_PROVIDER_PRESETS[0];
}
export function normalizeCollectorStats(stats) {
  return {
    collected: Math.max(0, Number(stats?.collected) || 0),
    validated: Math.max(0, Number(stats?.validated) || 0),
    ignored: Math.max(0, Number(stats?.ignored) || 0)
  };
}
const COLLECTOR_VERIFICATION_STATS_REGEX = /(\d+) mail\(s\) inspecté\(s\), (\d+) rattaché\(s\), (\d+) ignoré\(s\)/;
export function parseCollectorStatsFromLogs(logs = []) {
  let collected = 0;
  let validated = 0;
  let ignored = 0;
  for (const log of logs) {
    const message = String(log?.message || "");
    if (!message.includes("Vérification effectuée")) continue;
    const match = message.match(COLLECTOR_VERIFICATION_STATS_REGEX);
    if (!match) continue;
    collected += Number(match[1]) || 0;
    validated += Number(match[2]) || 0;
    ignored += Number(match[3]) || 0;
  }
  return {
    collected,
    validated,
    ignored
  };
}
export function resolveCollectorEmailStats(collector = {}) {
  const persisted = normalizeCollectorStats(collector.stats);
  if (persisted.collected > 0) return persisted;
  const fromLogs = parseCollectorStatsFromLogs(collector.logs);
  if (fromLogs.collected > 0) return fromLogs;
  return persisted;
}
export function formatCollectorStatPercent(value, total) {
  if (!total || total <= 0) return "-";
  return `${Math.round(value / total * 100)} %`;
}
