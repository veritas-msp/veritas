import fs from "fs";
import path from "path";
import { ImapFlow } from "imapflow";
import { pool } from "../database/db.js";
import { isPro } from "../utils/edition.js";
import { loadExclusionRulesRaw, loadMailCollectorsRaw, loadMailCollectSettingsRaw, saveMailCollectorsRaw } from "./ticketAutomationConfigStore.js";
import { normalizeMailCollectSettings } from "./mailCollectSettings.js";
import { enrichMailContextWithThreadHeaders, isInboundEmailAlreadyProcessed, recordTicketEmailMessage, resolveTicketFromEmailContext } from "./ticketEmailThread.js";
import { ensureTicketEmailThreadSchema } from "./ensureTicketEmailThreadSchema.js";
import { ensureMailCollectSettingsSchema } from "./ensureMailCollectSettingsSchema.js";
import { buildMailContextFromEnvelope, findMatchingExclusionRule, getAllMatchingExclusionRules, normalizeExclusionRule, normalizeIngestionAction } from "./mailIngestionRules.js";
import { extractEmailContentFromRfc822, registerCidMapping, rewriteCidReferences } from "./mailCollectorMime.js";
import { notifyTicketCommented, notifyTicketCreatedAck, notifyTicketCreatedAgents } from "./systemNotificationService.js";
import { notifyInAppTicketCommented, notifyInAppTicketCreated } from "./userNotificationService.js";
export { findMatchingExclusionRule, getAllMatchingExclusionRules, normalizeExclusionRule } from "./mailIngestionRules.js";
const TICKET_UPLOAD_DIR = path.resolve(process.cwd(), "uploads", "tickets");
fs.mkdirSync(TICKET_UPLOAD_DIR, { recursive: true });
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
  const rejectUnauthorized = validateCertMode !== "no-validate-cert";
  // /ssl → implicit TLS (993). /tls → STARTTLS (143). Plain → 143.
  const useImplicitTls = security === "ssl";
  const useStartTls = security === "tls" || security === "starttls";
  const config = {
    host: String(collector?.server || "").trim(),
    port: hasCustomPort ? parsedPort : useImplicitTls ? 993 : 143,
    secure: useImplicitTls,
    auth: {
      user: String(collector?.username || "").trim(),
      pass: String(collector?.password || "")
    },
    tls: {
      rejectUnauthorized
    },
    logger: false
  };
  if (useStartTls) {
    config.requireTLS = true;
  }
  return config;
}
export async function withImapClient(collector, callback) {
  const config = buildImapClientConfig(collector);
  if (!config.host) throw new Error("IMAP server is required");
  if (!config.auth.user) throw new Error("IMAP login is required");
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
export function extractEmailBodiesFromRfc822(sourceValue) {
  return extractEmailContentFromRfc822(sourceValue);
}
export function extractBodyFromRfc822(sourceValue) {
  return extractEmailBodiesFromRfc822(sourceValue).text;
}
export const INCOMING_EMAIL_HTML_MARKER = "<!--veritas-email-html-->";
export function buildIncomingEmailTicketContent({
  subject,
  body,
  htmlBody = "",
  fromName,
  fromAddress
}) {
  const senderLabel = [String(fromName || "").trim(), String(fromAddress || "").trim()].filter(Boolean).join(" ");
  const safeSubject = String(subject || "").trim() || "(no subject)";
  const plain = String(body || "").trim() || "(empty message)";
  const header = `[Incoming email] ${senderLabel || "Unknown sender"}\nSubject: ${safeSubject}\n\n${plain}`;
  const html = String(htmlBody || "").trim();
  if (!html) return header;
  return `${header}\n\n${INCOMING_EMAIL_HTML_MARKER}\n${html}`;
}
function resolveMaxMailAttachmentBytes(collector) {
  const mb = Number(collector?.maxImportSizeMb);
  const resolved = Number.isFinite(mb) && mb > 0 ? mb : 15;
  return Math.min(Math.max(resolved, 1), 30) * 1024 * 1024;
}
function sanitizeMailAttachmentFilename(name, mimeType) {
  const base = String(name || "email-file").replace(/[^\w.\-]+/g, "_").slice(0, 120) || "email-file";
  const ext = path.extname(base).toLowerCase();
  const mime = String(mimeType || "").split(";")[0].trim().toLowerCase();
  const inferred = {
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
    "image/png": ".png",
    "image/gif": ".gif",
    "image/webp": ".webp",
    "image/bmp": ".bmp",
    "application/pdf": ".pdf"
  }[mime] || "";
  if (ext) return base;
  return inferred ? `${base}${inferred}` : base;
}
async function persistInboundMailAttachments({
  ticketId,
  commentId = null,
  htmlBody = "",
  attachments = [],
  maxBytes
}) {
  const list = Array.isArray(attachments) ? attachments : [];
  if (!ticketId || list.length === 0) {
    return String(htmlBody || "");
  }
  const cidMap = new Map();
  const limit = Number.isFinite(maxBytes) && maxBytes > 0 ? maxBytes : 15 * 1024 * 1024;
  for (let index = 0; index < list.length; index += 1) {
    const item = list[index];
    const buffer = item?.buffer;
    if (!Buffer.isBuffer(buffer) || buffer.length === 0) continue;
    if (buffer.length > limit) {
      console.warn(`[mail-collector] skipped oversized attachment (${buffer.length} bytes)`);
      continue;
    }
    const safeName = sanitizeMailAttachmentFilename(item.filename, item.mimeType);
    const diskName = `${Date.now()}-${index}-mail-${safeName}`;
    const absolutePath = path.join(TICKET_UPLOAD_DIR, diskName);
    try {
      fs.writeFileSync(absolutePath, buffer);
      const relativePath = `/uploads/tickets/${diskName}`;
      await pool.query(`INSERT INTO v_b_ticket_attachments
          (ticket_id, comment_id, uploaded_by, file_name, file_path, mime_type, file_size, created_at)
         VALUES ($1, $2, NULL, $3, $4, $5, $6, NOW())`, [
        ticketId,
        commentId || null,
        item.filename || safeName,
        relativePath,
        item.mimeType || null,
        buffer.length
      ]);
      if (item.contentId) registerCidMapping(cidMap, item.contentId, relativePath);
    } catch (err) {
      console.warn("[mail-collector] failed to save email attachment:", err?.message || err);
    }
  }
  return rewriteCidReferences(htmlBody, cidMap);
}
async function resolveRequesterUserIdByEmail(email) {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  if (!normalizedEmail) return null;
  const result = await pool.query(`SELECT id
     FROM v_b_users
     WHERE LOWER(TRIM(email)) = $1
     LIMIT 1`, [normalizedEmail]);
  return result.rows?.[0]?.id || null;
}

/**
 * Match a CRM contact by sender email (legacy email column + communications JSON).
 * Never falls back to "first contact alphabetically".
 */
async function resolveRequesterContactByEmail(email) {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  if (!normalizedEmail) return null;
  const result = await pool.query(
    `SELECT c.id,
            c.client_id,
            c.nom,
            c.prenom,
            c.email,
            (
              SELECT COUNT(*)::int FROM v_b_contact_client_links l WHERE l.contact_id = c.id
            ) AS membership_count
       FROM v_b_contacts c
      WHERE LOWER(TRIM(COALESCE(c.email, ''))) = $1
         OR (
           c.communications IS NOT NULL
           AND jsonb_typeof(c.communications) = 'array'
           AND EXISTS (
             SELECT 1
               FROM jsonb_array_elements(c.communications) AS entry
              WHERE LOWER(TRIM(COALESCE(entry->>'type', ''))) = 'email'
                AND LOWER(TRIM(COALESCE(entry->>'value', ''))) = $1
           )
         )
      ORDER BY c.updated_at DESC NULLS LAST, c.created_at DESC NULLS LAST, c.id DESC
      LIMIT 1`,
    [normalizedEmail]
  );
  const row = result.rows?.[0] || null;
  if (!row) return null;
  if (Number(row.membership_count) > 1) {
    return {
      ...row,
      client_id: null
    };
  }
  if (!row.client_id && Number(row.membership_count) === 1) {
    const link = await pool.query(
      `SELECT client_id FROM v_b_contact_client_links WHERE contact_id = $1 LIMIT 1`,
      [row.id]
    );
    row.client_id = link.rows[0]?.client_id || null;
  }
  return row;
}

function resolveInboundRequesterAddress(mailContext = {}, collector = null) {
  const replyTo = String(mailContext?.replyToAddress || "").trim();
  if (collector?.useReplyToAsRequester && replyTo) return replyTo;
  return String(mailContext?.fromAddress || "").trim();
}

async function createTicketFromCollectorEmail({
  subject,
  body,
  htmlBody = "",
  fromName,
  fromAddress,
  requesterAddress = null,
  ticketKind = "support",
  attachments = [],
  maxAttachmentBytes
}) {
  const safeSubject = String(subject || "").trim();
  const normalizedTitle = stripReplyPrefix(safeSubject) || safeSubject || "New ticket from email";
  const ticketDescription = buildIncomingEmailTicketContent({
    subject: safeSubject,
    body,
    htmlBody,
    fromName,
    fromAddress
  });
  const requesterEmail = String(requesterAddress || fromAddress || "").trim();
  const matchedContact = await resolveRequesterContactByEmail(requesterEmail);
  const requesterContactId = matchedContact?.id || null;
  const clientId = matchedContact?.client_id || null;
  // Keep user match as secondary signal (agents / portal), never as a substitute for the wrong contact.
  const requesterUserId = await resolveRequesterUserIdByEmail(requesterEmail);
  const isServices = ticketKind === "services";
  const type = isServices ? "prestation" : "incident";
  const category = isServices ? "prestation-intervention-distante" : null;
  const columns = ["title", "description", "status", "priority", "type"];
  const values = [normalizedTitle.slice(0, 255), ticketDescription, "open", "normal", type];
  if (category) {
    columns.push("category");
    values.push(category);
  }
  columns.push("channel");
  values.push("email");
  if (requesterContactId) {
    columns.push("requester_contact_id");
    values.push(requesterContactId);
  }
  if (requesterUserId) {
    columns.push("requester_user_id");
    values.push(requesterUserId);
  }
  if (clientId) {
    columns.push("client_id");
    values.push(clientId);
  }
  columns.push("created_at", "updated_at");
  const placeholders = values.map((_, idx) => `$${idx + 1}`).concat(["NOW()", "NOW()"]).join(", ");
  const result = await pool.query(
    `INSERT INTO v_b_tickets (${columns.join(", ")})
     VALUES (${placeholders})
     RETURNING id, ticket_number`,
    values
  );
  const created = result.rows?.[0] || null;
  if (created?.id && attachments.length > 0) {
    const rewrittenHtml = await persistInboundMailAttachments({
      ticketId: created.id,
      commentId: null,
      htmlBody,
      attachments,
      maxBytes: maxAttachmentBytes
    });
    if (rewrittenHtml !== String(htmlBody || "")) {
      const nextDescription = buildIncomingEmailTicketContent({
        subject: safeSubject,
        body,
        htmlBody: rewrittenHtml,
        fromName,
        fromAddress
      });
      await pool.query(`UPDATE v_b_tickets SET description = $1 WHERE id = $2`, [nextDescription, created.id]);
    }
  }
  return created;
}
async function attachEmailToTicket({
  ticketId,
  subject,
  body,
  htmlBody = "",
  fromName,
  fromAddress,
  ticketNumber,
  attachments = [],
  maxAttachmentBytes
}) {
  const content = buildIncomingEmailTicketContent({
    subject,
    body,
    htmlBody,
    fromName,
    fromAddress
  });
  const inserted = await pool.query(`INSERT INTO v_b_ticket_comments (ticket_id, author_user_id, content, is_internal, created_at)
     VALUES ($1, $2, $3, $4, NOW())
     RETURNING id`, [ticketId, null, content, false]);
  const commentId = inserted.rows?.[0]?.id || null;
  const preview = String(body || "").replace(/\s+/g, " ").trim().slice(0, 140);
  await notifyInAppTicketCommented({
    ticketId,
    commentId,
    authorUserId: null,
    isInternal: false,
    contentPreview: preview
  }).catch(() => {});
  await notifyTicketCommented({
    ticketId,
    authorUserId: null,
    isInternal: false,
    extraContext: {
      comment: {
        author: fromName || fromAddress || "Email",
        preview
      }
    }
  }).catch(() => {});
  if (commentId && attachments.length > 0) {
    const rewrittenHtml = await persistInboundMailAttachments({
      ticketId,
      commentId,
      htmlBody,
      attachments,
      maxBytes: maxAttachmentBytes
    });
    if (rewrittenHtml !== String(htmlBody || "")) {
      const nextContent = buildIncomingEmailTicketContent({
        subject,
        body,
        htmlBody: rewrittenHtml,
        fromName,
        fromAddress
      });
      await pool.query(`UPDATE v_b_ticket_comments SET content = $1 WHERE id = $2`, [nextContent, commentId]);
    }
  }
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
    htmlBody,
    fromName,
    fromAddress,
    attachments = []
  } = mailContext;
  await attachEmailToTicket({
    ticketId: ticketRow.id,
    subject,
    body,
    htmlBody,
    fromName,
    fromAddress,
    ticketNumber: ticketRow.ticket_number,
    attachments,
    maxAttachmentBytes: resolveMaxMailAttachmentBytes(collector)
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
    htmlBody,
    fromName,
    fromAddress,
    attachments = []
  } = mailContext;
  const created = await createTicketFromCollectorEmail({
    subject,
    body,
    htmlBody,
    fromName,
    fromAddress,
    requesterAddress: resolveInboundRequesterAddress(mailContext, collector),
    ticketKind,
    attachments,
    maxAttachmentBytes: resolveMaxMailAttachmentBytes(collector)
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
  await notifyTicketCreatedAck(created.id).catch(() => {});
  await notifyTicketCreatedAgents(created.id).catch(() => {});
  await notifyInAppTicketCreated({
    ticketId: created.id,
    createdByUserId: null
  }).catch(() => {});
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
      const bodies = extractEmailBodiesFromRfc822(message?.source);
      mailContext.body = bodies.text;
      mailContext.htmlBody = bodies.html;
      mailContext.attachments = Array.isArray(bodies.attachments) ? bodies.attachments : [];
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
