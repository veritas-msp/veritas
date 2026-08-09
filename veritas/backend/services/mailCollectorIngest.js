import { ImapFlow } from "imapflow";
import { pool } from "../database/db.js";
import { isPro } from "../utils/edition.js";
import { loadExclusionRulesRaw, loadMailCollectorsRaw, loadMailCollectSettingsRaw, saveMailCollectorsRaw } from "./ticketAutomationConfigStore.js";
import { normalizeMailCollectSettings } from "./mailCollectSettings.js";
import { enrichMailContextWithThreadHeaders, isInboundEmailAlreadyProcessed, recordTicketEmailMessage, resolveTicketFromEmailContext } from "./ticketEmailThread.js";
import { ensureTicketEmailThreadSchema } from "./ensureTicketEmailThreadSchema.js";
import { ensureMailCollectSettingsSchema } from "./ensureMailCollectSettingsSchema.js";
import { buildMailContextFromEnvelope, findMatchingExclusionRule, getAllMatchingExclusionRules, normalizeExclusionRule, normalizeIngestionAction } from "./mailIngestionRules.js";
export { findMatchingExclusionRule, getAllMatchingExclusionRules, normalizeExclusionRule } from "./mailIngestionRules.js";
function normalizeCollectorStats(stats) {
  return {
    collected: Math.max(0, Number(stats?.collected) || 0),
    validated: Math.max(0, Number(stats?.validated) || 0),
    ignored: Math.max(0, Number(stats?.ignored) || 0)
  };
}
export function normalizeMailCollector(row, idx = 0) {
  return {
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
    logs: Array.isArray(row?.logs) ? row.logs.map((log, logIdx) => ({
      id: String(log?.id || `collector-log-${Date.now()}-${idx}-${logIdx}`),
      level: String(log?.level || "info"),
      message: String(log?.message || ""),
      createdAt: String(log?.createdAt || new Date().toISOString())
    })) : [],
    lastCheckedAt: String(row?.lastCheckedAt || "").trim(),
    stats: normalizeCollectorStats(row?.stats)
  };
}
export function buildImapClientConfig(collector = {}) {
  const security = String(collector?.security || "ssl").toLowerCase();
  const validateCertMode = String(collector?.validateCertMode || "no-validate-cert").toLowerCase();
  const parsedPort = Number(collector?.port);
  const hasCustomPort = Number.isFinite(parsedPort) && parsedPort > 0;
  const secure = security === "ssl";
  return {
    host: String(collector?.server || "").trim(),
    port: hasCustomPort ? parsedPort : secure ? 993 : 143,
    secure,
    auth: {
      user: String(collector?.username || "").trim(),
      pass: String(collector?.password || "")
    },
    tls: {
      rejectUnauthorized: validateCertMode !== "no-validate-cert"
    },
    logger: false
  };
}
export async function withImapClient(collector, callback) {
  const config = buildImapClientConfig(collector);
  if (!config.host) throw new Error("IMAP server is required");
  if (!config.auth.user) throw new Error("Email address is required");
  if (!config.auth.pass) throw new Error("Password is required");
  const client = new ImapFlow(config);
  try {
    await client.connect();
    return await callback(client);
  } finally {
    if (client && !client.closed) {
      await client.logout().catch(() => {});
    }
  }
}
function formatEnvelopeAddress(entry) {
  if (!entry) return "";
  const name = String(entry.name || "").trim();
  const address = entry.mailbox && entry.host ? `${entry.mailbox}@${entry.host}` : "";
  if (name && address) return `${name} <${address}>`;
  return name || address || "";
}
export async function peekCollectorMailboxMessages(collectorInput = {}, {
  folder = "",
  limit = 30,
  unreadOnly = false
} = {}) {
  const collector = normalizeMailCollector(collectorInput, 0);
  const targetFolder = String(folder || collector.inboxFolder || "INBOX").trim() || "INBOX";
  const max = Math.min(100, Math.max(1, Number(limit) || 30));
  return withImapClient(collector, async client => {
    const lock = await client.getMailboxLock(targetFolder);
    try {
      const total = Number(client?.mailbox?.exists) || 0;
      const unseen = Number(client?.mailbox?.unseen);
      if (total <= 0) {
        return {
          folder: targetFolder,
          total: 0,
          unseen: Number.isFinite(unseen) ? unseen : 0,
          user: collector.username,
          host: collector.server,
          messages: []
        };
      }
      const messages = [];
      if (unreadOnly) {
        for await (const message of client.fetch({
          seen: false
        }, {
          uid: true,
          envelope: true,
          flags: true
        })) {
          messages.push(message);
          if (messages.length >= max) break;
        }
      } else {
        const startSeq = Math.max(1, total - max + 1);
        for await (const message of client.fetch(`${startSeq}:*`, {
          uid: true,
          envelope: true,
          flags: true
        })) {
          messages.push(message);
        }
      }
      const mapped = messages.map(message => {
        const rawFlags = message?.flags;
        const flags = Array.isArray(rawFlags)
          ? rawFlags
          : rawFlags && typeof rawFlags[Symbol.iterator] === "function"
            ? [...rawFlags]
            : [];
        const seen = flags.some(flag => String(flag).toLowerCase() === "\\seen");
        const from = Array.isArray(message?.envelope?.from) ? message.envelope.from[0] : null;
        const toList = Array.isArray(message?.envelope?.to) ? message.envelope.to : [];
        return {
          uid: message.uid,
          subject: String(message?.envelope?.subject || "(sans objet)").trim() || "(sans objet)",
          from: formatEnvelopeAddress(from),
          to: toList.map(formatEnvelopeAddress).filter(Boolean).slice(0, 3).join(", "),
          date: message?.envelope?.date ? new Date(message.envelope.date).toISOString() : "",
          seen
        };
      }).sort((a, b) => {
        const da = a.date ? new Date(a.date).getTime() : 0;
        const db = b.date ? new Date(b.date).getTime() : 0;
        return db - da;
      }).slice(0, max);
      return {
        folder: targetFolder,
        total,
        unseen: Number.isFinite(unseen) ? unseen : mapped.filter(item => !item.seen).length,
        user: collector.username,
        host: collector.server,
        messages: mapped
      };
    } finally {
      lock.release();
    }
  });
}
function stripReplyPrefix(subject = "") {
  return String(subject || "").replace(/^((re|fw|fwd)\s*:\s*)+/i, "").trim();
}
export function extractTicketNumberFromSubject(subject = "") {
  const normalized = stripReplyPrefix(subject);
  const hashMatch = normalized.match(/#\s*(\d{1,12})/);
  if (hashMatch) return Number(hashMatch[1]);
  const ticketMatch = normalized.match(/ticket\s*(?:n[°o]\s*)?(\d{1,12})/i);
  if (ticketMatch) return Number(ticketMatch[1]);
  return null;
}
export function extractBodyFromRfc822(sourceValue) {
  const raw = Buffer.isBuffer(sourceValue) ? sourceValue.toString("utf8") : String(sourceValue || "");
  const normalizedRaw = raw.replace(/\r/g, "");
  const decodeQuotedPrintable = value => String(value || "").replace(/=\n/g, "").replace(/=([0-9A-Fa-f]{2})/g, (_m, hex) => String.fromCharCode(parseInt(hex, 16)));
  const decodePartBody = (partHeaders, partBody) => {
    const headers = String(partHeaders || "").toLowerCase();
    const bodyValue = String(partBody || "");
    if (/content-transfer-encoding:\s*base64/i.test(headers)) {
      const cleaned = bodyValue.replace(/[^A-Za-z0-9+/=]/g, "");
      try {
        return Buffer.from(cleaned, "base64").toString("utf8");
      } catch (_error) {
        return bodyValue;
      }
    }
    if (/content-transfer-encoding:\s*quoted-printable/i.test(headers)) {
      return decodeQuotedPrintable(bodyValue);
    }
    return bodyValue;
  };
  const htmlToText = html => String(html || "").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<\/(p|div|li|br|tr|h1|h2|h3|h4|h5|h6)>/gi, "\n").replace(/<[^>]+>/g, " ").replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&").replace(/&lt;/gi, "<").replace(/&gt;/gi, ">").replace(/\n{3,}/g, "\n\n").replace(/[ \t]{2,}/g, " ").trim();
  const mimeParts = normalizedRaw.split(/\n--[^\n]+/g);
  const readMimePart = typeRegex => {
    for (const part of mimeParts) {
      if (!typeRegex.test(part)) continue;
      const idx = part.indexOf("\n\n");
      if (idx < 0) continue;
      const headers = part.slice(0, idx);
      const body = part.slice(idx + 2);
      return decodePartBody(headers, body);
    }
    return "";
  };
  const plainPart = readMimePart(/content-type:\s*text\/plain/i);
  if (plainPart) return plainPart.trim().slice(0, 10000);
  const htmlPart = readMimePart(/content-type:\s*text\/html/i);
  if (htmlPart) return htmlToText(htmlPart).slice(0, 10000);
  const sections = normalizedRaw.split(/\n\n/);
  const fallbackBody = sections.length > 1 ? sections.slice(1).join("\n\n") : normalizedRaw;
  return fallbackBody.trim().slice(0, 10000);
}
async function resolveRequesterUserIdByEmail(email) {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  if (!normalizedEmail) return null;
  const result = await pool.query(`SELECT id
     FROM v_b_users
     WHERE LOWER(email) = $1
     LIMIT 1`, [normalizedEmail]);
  return result.rows?.[0]?.id || null;
}
async function createTicketFromCollectorEmail({
  subject,
  body,
  fromName,
  fromAddress,
  ticketKind = "support"
}) {
  const safeSubject = String(subject || "").trim();
  const normalizedTitle = stripReplyPrefix(safeSubject) || safeSubject || "New ticket from email";
  const senderLabel = [String(fromName || "").trim(), String(fromAddress || "").trim()].filter(Boolean).join(" ");
  const ticketDescription = `[Incoming email] ${senderLabel || "Unknown sender"}\nSubject: ${safeSubject || "(no subject)"}\n\n${String(body || "").trim() || "(empty message)"}`;
  const requesterUserId = await resolveRequesterUserIdByEmail(fromAddress);
  const isServices = ticketKind === "services";
  const type = isServices ? "prestation" : "incident";
  const category = isServices ? "prestation-intervention-distante" : null;
  const result = category ? await pool.query(`INSERT INTO v_b_tickets
          (title, description, status, priority, type, category, channel, requester_user_id, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
         RETURNING id, ticket_number`, [normalizedTitle.slice(0, 255), ticketDescription, "open", "normal", type, category, "email", requesterUserId]) : await pool.query(`INSERT INTO v_b_tickets
          (title, description, status, priority, type, channel, requester_user_id, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
         RETURNING id, ticket_number`, [normalizedTitle.slice(0, 255), ticketDescription, "open", "normal", type, "email", requesterUserId]);
  return result.rows?.[0] || null;
}
async function attachEmailToTicket({
  ticketId,
  subject,
  body,
  fromName,
  fromAddress,
  ticketNumber
}) {
  const content = `[Incoming email] ${fromName || fromAddress || "Unknown sender"}\nSubject: ${subject}\n\n${body || "(empty message)"}`;
  await pool.query(`INSERT INTO v_b_ticket_comments (ticket_id, author_user_id, content, is_internal, created_at)
     VALUES ($1, $2, $3, $4, NOW())`, [ticketId, null, content, false]);
  await pool.query(`UPDATE v_b_tickets SET updated_at = NOW() WHERE id = $1`, [ticketId]);
  return ticketNumber;
}
async function markMailSeen(client, messageUid) {
  if (!messageUid) return;
  await client.messageFlagsAdd(messageUid, ["\\Seen"]).catch(() => {});
}
async function moveMailToFolder(collector, client, messageUid, folder, {
  label = "folder",
  markSeen = true
} = {}) {
  const target = String(folder || "").trim();
  if (!messageUid) return false;
  if (!target) {
    if (markSeen) await markMailSeen(client, messageUid);
    return false;
  }
  try {
    await client.messageMove(messageUid, target);
    return true;
  } catch (err) {
    console.warn(`[mail-collector] Failed to move uid=${messageUid} to ${label} "${target}":`, err?.message || err);
    if (markSeen) await markMailSeen(client, messageUid);
    return false;
  }
}
async function finalizeAcceptedMail(collector, client, messageUid, mailCollectSettings, matchingRule = null) {
  const markSeen = mailCollectSettings?.markSeenAfterProcess !== false;
  const allowMove = mailCollectSettings?.moveOnSuccess !== false && matchingRule?.archiveOnMatch !== false;
  if (allowMove) {
    const moved = await moveMailToFolder(collector, client, messageUid, collector?.acceptedFolder, {
      label: "accepted",
      markSeen
    });
    if (moved) return;
  }
  if (markSeen) await markMailSeen(client, messageUid);
}
async function finalizeRejectedMail(collector, client, messageUid, mailCollectSettings) {
  const markSeen = mailCollectSettings?.markSeenAfterProcess !== false;
  if (mailCollectSettings?.moveOnReject !== false) {
    const moved = await moveMailToFolder(collector, client, messageUid, collector?.refusedFolder, {
      label: "refused",
      markSeen
    });
    if (moved) return;
  }
  if (markSeen) await markMailSeen(client, messageUid);
}
async function rememberProcessedInboundMail({
  collector,
  client,
  message,
  mailContext,
  mailCollectSettings
}) {
  await ensureTicketEmailThreadSchema().catch(() => {});
  await recordTicketEmailMessage({
    ticketId: null,
    collectorId: collector?.id,
    mailContext,
    direction: "inbound",
    allowMissingTicket: true
  }).catch(() => {});
  if (mailCollectSettings?.markSeenAfterProcess !== false) {
    await markMailSeen(client, message?.uid);
  }
}
async function attachInboundMailToTicket({
  ticketRow,
  collector,
  matchingRule,
  client,
  message,
  mailContext,
  stats,
  actionLabel,
  subjectPreview,
  logDetail = "",
  mailCollectSettings
}) {
  const subject = mailContext.subject;
  const {
    body,
    fromName,
    fromAddress
  } = mailContext;
  await attachEmailToTicket({
    ticketId: ticketRow.id,
    subject,
    body,
    fromName,
    fromAddress,
    ticketNumber: ticketRow.ticket_number
  });
  await recordTicketEmailMessage({
    ticketId: ticketRow.id,
    collectorId: collector.id,
    mailContext,
    direction: "inbound"
  });
  stats.attached += 1;
  await finalizeAcceptedMail(collector, client, message.uid, mailCollectSettings, matchingRule);
  const detail = logDetail ? ` ${logDetail}` : "";
  await appendCollectorLogInConfig(collector.id, "success", `Email attached to ticket #${ticketRow.ticket_number} via rule "${actionLabel}"${detail} ("${subjectPreview}").`).catch(() => {});
}
async function createInboundTicketAndRecord({
  collector,
  matchingRule,
  client,
  message,
  mailContext,
  stats,
  actionLabel,
  subjectPreview,
  ticketKind,
  successLogLabel,
  mailCollectSettings
}) {
  const {
    subject,
    body,
    fromName,
    fromAddress
  } = mailContext;
  const created = await createTicketFromCollectorEmail({
    subject,
    body,
    fromName,
    fromAddress,
    ticketKind
  });
  if (!created?.id) {
    stats.ignored += 1;
    await finalizeRejectedMail(collector, client, message.uid, mailCollectSettings);
    await rememberProcessedInboundMail({
      collector,
      client,
      message,
      mailContext,
      mailCollectSettings
    });
    await appendCollectorLogInConfig(collector.id, "warning", `Failed to create ${successLogLabel} for "${subjectPreview}".`).catch(() => {});
    return null;
  }
  await recordTicketEmailMessage({
    ticketId: created.id,
    collectorId: collector.id,
    mailContext,
    direction: "inbound"
  });
  stats.attached += 1;
  await finalizeAcceptedMail(collector, client, message.uid, mailCollectSettings, matchingRule);
  await appendCollectorLogInConfig(collector.id, "success", `${successLogLabel} #${created.ticket_number || "?"} via rule "${actionLabel}" ("${subjectPreview}").`).catch(() => {});
  return created;
}
async function handleOrphanReply({
  collector,
  matchingRule,
  client,
  message,
  mailContext,
  stats,
  actionLabel,
  subjectPreview,
  ticketKind,
  successLogLabel,
  mailCollectSettings
}) {
  const behavior = String(mailCollectSettings?.orphanReplyBehavior || "refuse").trim().toLowerCase();
  if (behavior === "create_ticket") {
    await createInboundTicketAndRecord({
      collector,
      matchingRule,
      client,
      message,
      mailContext,
      stats,
      actionLabel,
      subjectPreview,
      ticketKind,
      successLogLabel,
      mailCollectSettings
    });
    return;
  }
  stats.ignored += 1;
  if (behavior === "ignore") {
    await rememberProcessedInboundMail({
      collector,
      client,
      message,
      mailContext,
      mailCollectSettings
    });
    await appendCollectorLogInConfig(collector.id, "info", `Reply left in inbox: no ticket linked to the thread ("${subjectPreview}").`).catch(() => {});
    return;
  }
  await finalizeRejectedMail(collector, client, message.uid, mailCollectSettings);
  await rememberProcessedInboundMail({
    collector,
    client,
    message,
    mailContext,
    mailCollectSettings
  });
  await appendCollectorLogInConfig(collector.id, "warning", `Reply refused: no ticket linked to the thread ("${subjectPreview}").`).catch(() => {});
}
async function handleThreadedTicketMail({
  collector,
  matchingRule,
  client,
  message,
  mailContext,
  stats,
  actionLabel,
  subjectPreview,
  ticketKind,
  successLogLabel,
  mailCollectSettings
}) {
  const threadLookupEnabled = mailCollectSettings?.threadRepliesEnabled !== false;
  const existingTicket = await resolveTicketFromEmailContext(mailContext, {
    extractTicketNumberFromSubject,
    threadLookupEnabled
  });
  if (existingTicket?.id) {
    const threadDetail = mailContext.isReply === "yes" ? "(discussion thread)" : "(ticket reference)";
    await attachInboundMailToTicket({
      ticketRow: existingTicket,
      collector,
      matchingRule,
      client,
      message,
      mailContext,
      stats,
      actionLabel,
      subjectPreview,
      logDetail: threadDetail,
      mailCollectSettings
    });
    return;
  }
  if (mailContext.isReply === "yes" && threadLookupEnabled) {
    await handleOrphanReply({
      collector,
      matchingRule,
      client,
      message,
      mailContext,
      stats,
      actionLabel,
      subjectPreview,
      ticketKind,
      successLogLabel,
      mailCollectSettings
    });
    return;
  }
  await createInboundTicketAndRecord({
    collector,
    matchingRule,
    client,
    message,
    mailContext,
    stats,
    actionLabel,
    subjectPreview,
    ticketKind,
    successLogLabel,
    mailCollectSettings
  });
}
async function processMatchedMail({
  collector,
  matchingRule,
  client,
  message,
  mailContext,
  stats,
  mailCollectSettings
}) {
  const subjectPreview = mailContext?.subject || "(no subject)";
  const actionLabel = String(matchingRule.name || matchingRule.id || "Rule");
  const action = normalizeIngestionAction(matchingRule.action);
  const threadLookupEnabled = mailCollectSettings?.threadRepliesEnabled !== false;
  if (action === "ignore_mail") {
    stats.ignored += 1;
    await finalizeAcceptedMail(collector, client, message.uid, mailCollectSettings, matchingRule);
    await rememberProcessedInboundMail({
      collector,
      client,
      message,
      mailContext,
      mailCollectSettings
    });
    await appendCollectorLogInConfig(collector.id, "info", `Email ignored by rule "${actionLabel}" (subject "${subjectPreview}").`).catch(() => {});
    return;
  }
  if (action === "create_ticket_services" && !isPro()) {
    stats.ignored += 1;
    await finalizeRejectedMail(collector, client, message.uid, mailCollectSettings);
    await rememberProcessedInboundMail({
      collector,
      client,
      message,
      mailContext,
      mailCollectSettings
    });
    await appendCollectorLogInConfig(collector.id, "warning", `Services action is reserved for Veritas Pro — email ignored ("${subjectPreview}").`).catch(() => {});
    return;
  }
  if (action === "attach_comment") {
    const ticketRow = await resolveTicketFromEmailContext(mailContext, {
      extractTicketNumberFromSubject,
      threadLookupEnabled
    });
    if (!ticketRow?.id) {
      stats.ignored += 1;
      await finalizeRejectedMail(collector, client, message.uid, mailCollectSettings);
      await rememberProcessedInboundMail({
        collector,
        client,
        message,
        mailContext,
        mailCollectSettings
      });
      await appendCollectorLogInConfig(collector.id, "warning", `Unable to attach: ticket not found for this thread ("${subjectPreview}").`).catch(() => {});
      return;
    }
    await attachInboundMailToTicket({
      ticketRow,
      collector,
      matchingRule,
      client,
      message,
      mailContext,
      stats,
      actionLabel,
      subjectPreview,
      mailCollectSettings
    });
    return;
  }
  if (action === "create_ticket_services") {
    await handleThreadedTicketMail({
      collector,
      matchingRule,
      client,
      message,
      mailContext,
      stats,
      actionLabel,
      subjectPreview,
      ticketKind: "services",
      successLogLabel: "Services ticket",
      mailCollectSettings
    });
    return;
  }
  if (action === "create_ticket_support") {
    await handleThreadedTicketMail({
      collector,
      matchingRule,
      client,
      message,
      mailContext,
      stats,
      actionLabel,
      subjectPreview,
      ticketKind: "support",
      successLogLabel: "New support ticket",
      mailCollectSettings
    });
    return;
  }
}
export function filterExclusionRulesForCollector(rules = [], collectorId = "") {
  const normalizedCollectorId = String(collectorId || "").trim();
  return (Array.isArray(rules) ? rules : []).filter(rule => {
    const ruleCollectorId = String(rule?.collectorId || "").trim();
    if (!ruleCollectorId) return true;
    return ruleCollectorId === normalizedCollectorId;
  });
}
export async function appendCollectorLogInConfig(collectorId, level, message) {
  if (!collectorId) return;
  const [existingCollectors, rawSettings] = await Promise.all([loadMailCollectorsRaw(), loadMailCollectSettingsRaw()]);
  const mailCollectSettings = normalizeMailCollectSettings(rawSettings);
  const maxLogs = mailCollectSettings.maxLogEntriesPerCollector;
  const nextCollectors = existingCollectors.map((collector, idx) => {
    const normalized = normalizeMailCollector(collector, idx);
    if (String(normalized.id) !== String(collectorId)) return normalized;
    const nextLog = {
      id: `collector-log-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
      level: String(level || "info"),
      message: String(message || ""),
      createdAt: new Date().toISOString()
    };
    return {
      ...normalized,
      logs: [nextLog, ...(Array.isArray(normalized.logs) ? normalized.logs : [])].slice(0, maxLogs),
      lastCheckedAt: new Date().toISOString()
    };
  });
  await saveMailCollectorsRaw(nextCollectors);
}
export async function touchCollectorLastCheckedAt(collectorId) {
  if (!collectorId) return;
  const existingCollectors = await loadMailCollectorsRaw();
  const nextCollectors = existingCollectors.map((collector, idx) => {
    const normalized = normalizeMailCollector(collector, idx);
    if (String(normalized.id) !== String(collectorId)) return normalized;
    return {
      ...normalized,
      lastCheckedAt: new Date().toISOString()
    };
  });
  await saveMailCollectorsRaw(nextCollectors);
}
export async function incrementCollectorStats(collectorId, {
  inspected = 0,
  attached = 0,
  ignored = 0
} = {}) {
  if (!collectorId || inspected === 0 && attached === 0 && ignored === 0) return;
  const existingCollectors = await loadMailCollectorsRaw();
  const nextCollectors = existingCollectors.map((collector, idx) => {
    const normalized = normalizeMailCollector(collector, idx);
    if (String(normalized.id) !== String(collectorId)) return normalized;
    const prev = normalizeCollectorStats(normalized.stats);
    return {
      ...normalized,
      stats: {
        collected: prev.collected + inspected,
        validated: prev.validated + attached,
        ignored: prev.ignored + ignored
      }
    };
  });
  await saveMailCollectorsRaw(nextCollectors);
}
async function processMessagesInMailbox(client, collector, exclusionRules, mailCollectSettings) {
  const inboxFolder = String(collector?.inboxFolder || "INBOX").trim() || "INBOX";
  const loginUser = String(collector?.username || "").trim();
  const stats = {
    inspected: 0,
    attached: 0,
    ignored: 0,
    fetched: 0,
    sampleRecipients: []
  };
  const fetchQuery = collector.unreadOnly ? {
    seen: false
  } : {
    all: true
  };
  const lock = await client.getMailboxLock(inboxFolder);
  try {
    const mailboxTotal = Number(client?.mailbox?.exists);
    stats.mailboxTotal = Number.isFinite(mailboxTotal) ? mailboxTotal : null;
    const fetched = [];
    for await (const message of client.fetch(fetchQuery, {
      uid: true,
      envelope: true,
      source: true
    })) {
      fetched.push(message);
    }
    stats.fetched = fetched.length;
    for (const message of fetched) {
      let mailContext = buildMailContextFromEnvelope(message);
      mailContext.body = extractBodyFromRfc822(message?.source);
      mailContext = enrichMailContextWithThreadHeaders(mailContext, message?.source, message?.envelope);
      if (stats.sampleRecipients.length < 5) {
        const recipients = [mailContext.toAddresses, mailContext.ccAddresses].filter(Boolean).join(" | ");
        if (recipients) stats.sampleRecipients.push(recipients);
      }
      if (mailCollectSettings.deduplicateByMessageId !== false && mailContext.messageId && (await isInboundEmailAlreadyProcessed(mailContext.messageId))) {
        continue;
      }
      const matchingRule = findMatchingExclusionRule(exclusionRules, mailContext);
      if (!matchingRule) {
        const unmatched = String(mailCollectSettings?.unmatchedBehavior || "leave").trim().toLowerCase();
        if (unmatched === "mark_seen") {
          await markMailSeen(client, message.uid);
          await rememberProcessedInboundMail({
            collector,
            client,
            message,
            mailContext,
            mailCollectSettings
          });
        } else if (unmatched === "refuse") {
          stats.ignored += 1;
          await finalizeRejectedMail(collector, client, message.uid, mailCollectSettings);
          await rememberProcessedInboundMail({
            collector,
            client,
            message,
            mailContext,
            mailCollectSettings
          });
        }
        continue;
      }
      stats.inspected += 1;
      await processMatchedMail({
        collector,
        matchingRule,
        client,
        message,
        mailContext,
        stats,
        mailCollectSettings
      });
    }
  } finally {
    lock.release();
  }
  stats.loginUser = loginUser;
  stats.inboxFolder = inboxFolder;
  return stats;
}
export async function processMailCollector(collectorInput, {
  force = false
} = {}) {
  await Promise.all([ensureTicketEmailThreadSchema().catch(() => {}), ensureMailCollectSettingsSchema().catch(() => {})]);
  const collector = normalizeMailCollector(collectorInput, 0);
  if (!collector.id || !collector.enabled || !collector.ingestEnabled) {
    return {
      skipped: true,
      reason: "disabled",
      inspected: 0,
      attached: 0,
      ignored: 0
    };
  }
  if (String(collector.protocol || "imap").toLowerCase() !== "imap") {
    return {
      skipped: true,
      reason: "unsupported_protocol",
      inspected: 0,
      attached: 0,
      ignored: 0
    };
  }
  if (!collector.server || !collector.username || !collector.password) {
    return {
      skipped: true,
      reason: "incomplete_config",
      inspected: 0,
      attached: 0,
      ignored: 0
    };
  }
  if (!force) {
    const now = Date.now();
    const lastCheckedAtMs = collector.lastCheckedAt ? new Date(collector.lastCheckedAt).getTime() : 0;
    const intervalMs = Math.max(1, Number(collector.checkIntervalMinutes || 5)) * 60 * 1000;
    if (lastCheckedAtMs && now - lastCheckedAtMs < intervalMs) {
      return {
        skipped: true,
        reason: "interval",
        inspected: 0,
        attached: 0,
        ignored: 0
      };
    }
  }
  const rawRules = await loadExclusionRulesRaw();
  const exclusionRules = filterExclusionRulesForCollector((Array.isArray(rawRules) ? rawRules : []).map(normalizeExclusionRule), collector.id);
  const mailCollectSettings = normalizeMailCollectSettings(await loadMailCollectSettingsRaw());
  const stats = await withImapClient(collector, async client => processMessagesInMailbox(client, collector, exclusionRules, mailCollectSettings));
  await incrementCollectorStats(collector.id, stats).catch(() => {});
  // Always log completed IMAP checks (including empty ones) so auto-poll is visible in the UI.
  const prefix = force ? "Manual check" : "Automatic check";
  const loginUser = String(collector.username || stats.loginUser || "").trim() || "?";
  const folder = String(collector.inboxFolder || stats.inboxFolder || "INBOX").trim() || "INBOX";
  const host = String(collector.server || "").trim() || "?";
  const unreadOnly = collector.unreadOnly !== false;
  const mailboxTotal = Number.isFinite(Number(stats.mailboxTotal)) ? Number(stats.mailboxTotal) : null;
  const sample = Array.isArray(stats.sampleRecipients) && stats.sampleRecipients.length
    ? ` Sample To/Cc: ${stats.sampleRecipients.slice(0, 3).join(" ; ")}`
    : "";
  const scope = unreadOnly ? "unread only" : "all messages";
  const mailboxInfo = mailboxTotal == null ? "" : ` mailbox=${mailboxTotal}`;
  await appendCollectorLogInConfig(
    collector.id,
    "info",
    `${prefix} as ${loginUser} @ ${host} / ${folder} (${scope}${mailboxInfo}): ${Number(stats.fetched) || 0} fetched, ${stats.inspected} matched, ${stats.attached} attached, ${stats.ignored} ignored.${sample}`
  ).catch(() => {});
  return {
    ...stats,
    skipped: false,
    loginUser,
    host,
    inboxFolder: folder
  };
}
