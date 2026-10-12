import { pool } from "../database/db.js";
import { sendMail } from "../utils/sendMail.js";
import {
  collectReferenceMessageIds,
  normalizeMessageId,
  recordTicketEmailMessage
} from "./ticketEmailThread.js";
import { ensureTicketSideConversationsSchema } from "./ensureTicketSideConversationsSchema.js";
import { notifyInAppSideConversation } from "./userNotificationService.js";

const RECIPIENT_TYPES = new Set(["agent", "contact", "prestataire", "email"]);

function normalizeEmail(value = "") {
  const raw = String(value || "").trim().toLowerCase();
  if (!raw) return "";
  const angle = raw.match(/<([^>]+)>/);
  const candidate = String(angle ? angle[1] : raw).trim().toLowerCase();
  return candidate.includes("@") ? candidate : "";
}

function parseAddressList(value) {
  if (Array.isArray(value)) {
    return [...new Set(value.map(normalizeEmail).filter(Boolean))];
  }
  const raw = String(value || "");
  if (!raw.trim()) return [];
  return [...new Set(raw.split(/[,;\s]+/).map(normalizeEmail).filter(Boolean))];
}

function escapeHtml(value = "") {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function bodyToHtml(body = "") {
  return escapeHtml(body).replace(/\r?\n/g, "<br />");
}

function makeThreadToken() {
  return Math.random().toString(36).slice(2, 10).toLowerCase();
}

function buildSideConversationSubject({ subject, ticketNumber, threadToken, isReply = false }) {
  const base = String(subject || "Side conversation").trim() || "Side conversation";
  const withoutRe = base.replace(/^(re|fw|fwd)\s*:\s*/i, "").trim() || "Side conversation";
  const ticketTag = ticketNumber ? `[#${ticketNumber}]` : "";
  const scTag = `[SC:${threadToken}]`;
  const core = [withoutRe, ticketTag, scTag].filter(Boolean).join(" ");
  return isReply ? `Re: ${core}` : core;
}

function extractSideConversationToken(subject = "") {
  const match = String(subject || "").match(/\[SC:([a-z0-9]{4,16})\]/i);
  return match ? String(match[1]).toLowerCase() : "";
}

function mapConversationRow(row, messages = []) {
  if (!row) return null;
  return {
    id: row.id,
    ticketId: row.ticket_id,
    subject: row.subject || "",
    status: row.status || "open",
    recipientType: row.recipient_type || "email",
    recipientRefId: row.recipient_ref_id || null,
    recipientLabel: row.recipient_label || null,
    to: Array.isArray(row.to_addresses) ? row.to_addresses : [],
    cc: Array.isArray(row.cc_addresses) ? row.cc_addresses : [],
    threadToken: row.thread_token,
    createdBy: row.created_by || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    messages: messages.map(mapMessageRow)
  };
}

function mapMessageRow(row) {
  return {
    id: row.id,
    sideConversationId: row.side_conversation_id,
    ticketId: row.ticket_id,
    direction: row.direction,
    authorUserId: row.author_user_id || null,
    author: row.author_label || (row.direction === "inbound" ? "Externe" : "Vous"),
    body: row.body || "",
    content: row.body || "",
    emailMessageId: row.email_message_id || null,
    sendStatus: row.send_status || null,
    sendError: row.send_error || null,
    createdAt: row.created_at
  };
}

async function resolveAuthorLabel(userId) {
  if (!userId) return "Agent";
  const result = await pool.query(
    `SELECT COALESCE(NULLIF(BTRIM(username), ''), NULLIF(BTRIM(email), ''), 'Agent') AS label
     FROM v_b_users WHERE id = $1 LIMIT 1`,
    [userId]
  );
  return result.rows[0]?.label || "Agent";
}

async function resolveRecipientEmails({ recipientType, recipientRefId, to, cc, clientId }) {
  let toAddresses = parseAddressList(to);
  let ccAddresses = parseAddressList(cc);
  let recipientLabel = null;

  if (recipientType === "agent" && recipientRefId) {
    const user = await pool.query(
      `SELECT id, email, username
       FROM v_b_users WHERE id = $1 LIMIT 1`,
      [recipientRefId]
    );
    const row = user.rows[0];
    if (!row) throw new Error("Agent introuvable");
    // Agents are notified in-app — email optional
    const email = normalizeEmail(row.email);
    toAddresses = email ? [email] : [];
    recipientLabel = String(row.username || "").trim() || email || String(recipientRefId);
  }

  if (recipientType === "contact" && recipientRefId) {
    const contact = await pool.query(
      `SELECT id, prenom, nom, email, communications
       FROM v_b_contacts WHERE id = $1 LIMIT 1`,
      [Number(recipientRefId)]
    );
    const row = contact.rows[0];
    if (!row) throw new Error("Contact introuvable");
    const emails = new Set();
    const push = value => {
      const email = normalizeEmail(value);
      if (email) emails.add(email);
    };
    push(row.email);
    const communications = Array.isArray(row.communications) ? row.communications : [];
    for (const entry of communications) {
      if (String(entry?.type || "").toLowerCase() === "email") push(entry?.value);
    }
    toAddresses = [...emails];
    if (toAddresses.length === 0) throw new Error("Ce contact n'a pas d'adresse e-mail");
    recipientLabel = [row.prenom, row.nom].filter(Boolean).join(" ").trim() || toAddresses[0];
  }

  if (recipientType === "prestataire" && recipientRefId) {
    const presta = await pool.query(
      `SELECT id, nom, email, contact_nom, contact_prenom
       FROM v_b_prestataires WHERE id = $1 LIMIT 1`,
      [Number(recipientRefId)]
    );
    const row = presta.rows[0];
    if (!row) throw new Error("Prestataire introuvable");
    void clientId;
    const contactEmails = await pool.query(
      `SELECT email FROM v_b_prestataire_contacts
       WHERE prestataire_id = $1
         AND NULLIF(BTRIM(email), '') IS NOT NULL
       ORDER BY sort_order ASC NULLS LAST, id ASC`,
      [Number(recipientRefId)]
    ).catch(() => ({ rows: [] }));
    const emails = [];
    const push = value => {
      const email = normalizeEmail(value);
      if (email && !emails.includes(email)) emails.push(email);
    };
    push(row.email);
    for (const contact of contactEmails.rows || []) push(contact.email);
    // Allow explicit To override from UI (selected contact)
    if (toAddresses.length === 0) toAddresses = emails.slice(0, 1);
    if (ccAddresses.length === 0 && emails.length > 1) {
      ccAddresses = emails.filter(e => !toAddresses.includes(e));
    }
    if (toAddresses.length === 0) throw new Error("Ce prestataire n'a pas d'adresse e-mail");
    recipientLabel = row.nom || toAddresses[0];
  }

  if (recipientType === "email") {
    toAddresses = parseAddressList(to);
    ccAddresses = parseAddressList(cc);
    if (toAddresses.length === 0) throw new Error("Adresse e-mail destinataire requise");
    recipientLabel = toAddresses[0];
  }

  toAddresses = [...new Set(toAddresses.map(normalizeEmail).filter(Boolean))];
  ccAddresses = [...new Set(ccAddresses.map(normalizeEmail).filter(Boolean))].filter(e => !toAddresses.includes(e));
  // Agent side conversations use in-app notifications — empty To is allowed
  if (toAddresses.length === 0 && recipientType !== "agent") {
    throw new Error("Aucun destinataire e-mail valide");
  }
  return { toAddresses, ccAddresses, recipientLabel };
}

async function loadTicketMeta(ticketId) {
  const result = await pool.query(
    `SELECT id, ticket_number, title, client_id
     FROM v_b_tickets
     WHERE id = $1 AND COALESCE(is_deleted, FALSE) = FALSE
     LIMIT 1`,
    [ticketId]
  );
  return result.rows[0] || null;
}

async function getLastOutboundMessageId(sideConversationId) {
  const result = await pool.query(
    `SELECT email_message_id
     FROM v_b_ticket_side_conversation_messages
     WHERE side_conversation_id = $1
       AND direction = 'outbound'
       AND NULLIF(BTRIM(email_message_id), '') IS NOT NULL
     ORDER BY created_at DESC
     LIMIT 1`,
    [sideConversationId]
  );
  return normalizeMessageId(result.rows[0]?.email_message_id || "");
}

async function collectReferencesChain(sideConversationId) {
  const result = await pool.query(
    `SELECT email_message_id
     FROM v_b_ticket_side_conversation_messages
     WHERE side_conversation_id = $1
       AND NULLIF(BTRIM(email_message_id), '') IS NOT NULL
     ORDER BY created_at ASC`,
    [sideConversationId]
  );
  return result.rows.map(row => normalizeMessageId(row.email_message_id)).filter(Boolean);
}

function collectAgentNotifyTargets(conversation, authorUserId) {
  const targets = new Set();
  if (conversation?.recipient_type === "agent" && conversation?.recipient_ref_id) {
    targets.add(String(conversation.recipient_ref_id));
  }
  if (conversation?.created_by) {
    targets.add(String(conversation.created_by));
  }
  const authorId = authorUserId ? String(authorUserId) : "";
  if (authorId) targets.delete(authorId);
  return [...targets];
}

async function sendSideConversationViaInApp({
  conversation,
  ticket,
  body,
  authorUserId
}) {
  const authorLabel = await resolveAuthorLabel(authorUserId);
  const targets = collectAgentNotifyTargets(conversation, authorUserId);
  let sendStatus = "notified";
  let sendError = null;
  try {
    const result = await notifyInAppSideConversation({
      ticketId: ticket.id,
      sideConversationId: conversation.id,
      recipientUserIds: targets,
      authorUserId,
      subject: conversation.subject,
      contentPreview: body
    });
    if (!result?.notified) {
      sendStatus = "skipped";
      sendError = targets.length === 0
        ? null
        : "Notifications in-app désactivées ou destinataire non notifiable";
    }
  } catch (err) {
    sendStatus = "failed";
    sendError = String(err?.message || err || "Notification impossible");
  }

  const inserted = await pool.query(
    `INSERT INTO v_b_ticket_side_conversation_messages
      (side_conversation_id, ticket_id, direction, author_user_id, author_label, body, email_message_id, send_status, send_error, created_at)
     VALUES ($1, $2, 'outbound', $3, $4, $5, NULL, $6, $7, NOW())
     RETURNING *`,
    [conversation.id, ticket.id, authorUserId || null, authorLabel, body, sendStatus, sendError]
  );

  await pool.query(
    `UPDATE v_b_ticket_side_conversations SET updated_at = NOW() WHERE id = $1`,
    [conversation.id]
  );

  return {
    message: mapMessageRow(inserted.rows[0]),
    sendStatus,
    sendError
  };
}

async function sendSideConversationMail({
  conversation,
  ticket,
  body,
  authorUserId,
  isReply = false
}) {
  // Agents Veritas → notifications in-app (pas de SMTP)
  if (String(conversation?.recipient_type || "").toLowerCase() === "agent") {
    return sendSideConversationViaInApp({
      conversation,
      ticket,
      body,
      authorUserId
    });
  }

  const authorLabel = await resolveAuthorLabel(authorUserId);
  const previousMessageId = await getLastOutboundMessageId(conversation.id);
  const references = await collectReferencesChain(conversation.id);
  const subject = buildSideConversationSubject({
    subject: conversation.subject,
    ticketNumber: ticket.ticket_number,
    threadToken: conversation.thread_token,
    isReply
  });
  const htmlContent = `
    <p style="margin:0 0 12px;color:#5c6b82;font-size:13px;">
      Side conversation · Ticket #${escapeHtml(String(ticket.ticket_number || ""))}
      ${conversation.recipient_label ? ` · ${escapeHtml(conversation.recipient_label)}` : ""}
    </p>
    <div style="font-size:14px;line-height:1.5;color:#0a1422;">${bodyToHtml(body)}</div>
    <p style="margin:16px 0 0;color:#8a97ab;font-size:12px;">
      Répondez à cet e-mail pour alimenter la side conversation (ne modifiez pas le sujet).
    </p>
  `;

  let sendResult = null;
  let sendStatus = "sent";
  let sendError = null;
  let messageId = "";

  try {
    sendResult = await sendMail({
      to: conversation.to_addresses.join(", "),
      cc: conversation.cc_addresses?.length ? conversation.cc_addresses.join(", ") : undefined,
      subject,
      title: subject,
      htmlContent,
      inReplyTo: previousMessageId || undefined,
      references: references.length ? references : undefined,
      replyTo: undefined
    });
    messageId = normalizeMessageId(sendResult?.messageId || "");
    if (sendResult?.skipped) sendStatus = "skipped";
  } catch (err) {
    sendStatus = "failed";
    sendError = String(err?.message || err || "Envoi impossible");
  }

  if (!messageId) {
    messageId = normalizeMessageId(`<side-conv-${conversation.id}-${Date.now()}@veritas.local>`);
  }

  const inserted = await pool.query(
    `INSERT INTO v_b_ticket_side_conversation_messages
      (side_conversation_id, ticket_id, direction, author_user_id, author_label, body, email_message_id, send_status, send_error, created_at)
     VALUES ($1, $2, 'outbound', $3, $4, $5, $6, $7, $8, NOW())
     RETURNING *`,
    [conversation.id, ticket.id, authorUserId || null, authorLabel, body, messageId, sendStatus, sendError]
  );

  await recordTicketEmailMessage({
    ticketId: ticket.id,
    collectorId: "side-conversation-outbound",
    mailContext: {
      messageId,
      inReplyTo: previousMessageId || "",
      references: references.join(" "),
      subject,
      fromAddress: sendResult?.from || ""
    },
    direction: "outbound",
    sideConversationId: conversation.id
  }).catch(() => {});

  await pool.query(
    `UPDATE v_b_ticket_side_conversations SET updated_at = NOW() WHERE id = $1`,
    [conversation.id]
  );

  return {
    message: mapMessageRow(inserted.rows[0]),
    sendStatus,
    sendError
  };
}

export async function listSideConversations(ticketId) {
  await ensureTicketSideConversationsSchema();
  const convResult = await pool.query(
    `SELECT *
     FROM v_b_ticket_side_conversations
     WHERE ticket_id = $1
     ORDER BY updated_at DESC`,
    [ticketId]
  );
  if (convResult.rows.length === 0) return [];
  const ids = convResult.rows.map(row => row.id);
  const msgResult = await pool.query(
    `SELECT *
     FROM v_b_ticket_side_conversation_messages
     WHERE side_conversation_id = ANY($1::uuid[])
     ORDER BY created_at ASC`,
    [ids]
  );
  const byConv = new Map();
  for (const msg of msgResult.rows) {
    const list = byConv.get(msg.side_conversation_id) || [];
    list.push(msg);
    byConv.set(msg.side_conversation_id, list);
  }
  return convResult.rows.map(row => mapConversationRow(row, byConv.get(row.id) || []));
}

export async function getSideConversation(ticketId, sideConversationId) {
  await ensureTicketSideConversationsSchema();
  const convResult = await pool.query(
    `SELECT * FROM v_b_ticket_side_conversations
     WHERE id = $1 AND ticket_id = $2 LIMIT 1`,
    [sideConversationId, ticketId]
  );
  const row = convResult.rows[0];
  if (!row) return null;
  const msgResult = await pool.query(
    `SELECT * FROM v_b_ticket_side_conversation_messages
     WHERE side_conversation_id = $1
     ORDER BY created_at ASC`,
    [sideConversationId]
  );
  return mapConversationRow(row, msgResult.rows);
}

export async function createSideConversation({
  ticketId,
  subject,
  body,
  recipientType = "email",
  recipientRefId = null,
  to = "",
  cc = "",
  authorUserId = null
}) {
  await ensureTicketSideConversationsSchema();
  const type = String(recipientType || "email").toLowerCase();
  if (!RECIPIENT_TYPES.has(type)) throw new Error("Type de destinataire invalide");
  const messageBody = String(body || "").trim();
  if (!messageBody) throw new Error("Message requis");

  const ticket = await loadTicketMeta(ticketId);
  if (!ticket) throw new Error("Ticket introuvable");

  const { toAddresses, ccAddresses, recipientLabel } = await resolveRecipientEmails({
    recipientType: type,
    recipientRefId,
    to,
    cc,
    clientId: ticket.client_id
  });

  const threadToken = makeThreadToken();
  const safeSubject = String(subject || "").trim() || `Side conversation · #${ticket.ticket_number || ""}`;

  const convInsert = await pool.query(
    `INSERT INTO v_b_ticket_side_conversations
      (ticket_id, subject, status, recipient_type, recipient_ref_id, recipient_label,
       to_addresses, cc_addresses, thread_token, created_by, created_at, updated_at)
     VALUES ($1, $2, 'open', $3, $4, $5, $6::text[], $7::text[], $8, $9, NOW(), NOW())
     RETURNING *`,
    [
      ticketId,
      safeSubject,
      type,
      recipientRefId != null ? String(recipientRefId) : null,
      recipientLabel,
      toAddresses,
      ccAddresses,
      threadToken,
      authorUserId || null
    ]
  );
  const conversation = convInsert.rows[0];
  const { message, sendStatus, sendError } = await sendSideConversationMail({
    conversation,
    ticket,
    body: messageBody,
    authorUserId,
    isReply: false
  });

  const full = await getSideConversation(ticketId, conversation.id);
  return {
    conversation: full,
    firstMessage: message,
    sendStatus,
    sendError
  };
}

export async function replySideConversation({
  ticketId,
  sideConversationId,
  body,
  authorUserId = null
}) {
  await ensureTicketSideConversationsSchema();
  const messageBody = String(body || "").trim();
  if (!messageBody) throw new Error("Message requis");

  const ticket = await loadTicketMeta(ticketId);
  if (!ticket) throw new Error("Ticket introuvable");

  const convResult = await pool.query(
    `SELECT * FROM v_b_ticket_side_conversations
     WHERE id = $1 AND ticket_id = $2 LIMIT 1`,
    [sideConversationId, ticketId]
  );
  const conversation = convResult.rows[0];
  if (!conversation) throw new Error("Side conversation introuvable");
  if (conversation.status === "done") throw new Error("Side conversation fermée — rouvrez-la pour répondre");

  const { message, sendStatus, sendError } = await sendSideConversationMail({
    conversation,
    ticket,
    body: messageBody,
    authorUserId,
    isReply: true
  });

  return {
    message,
    sendStatus,
    sendError,
    conversation: await getSideConversation(ticketId, sideConversationId)
  };
}

export async function updateSideConversationStatus({
  ticketId,
  sideConversationId,
  status
}) {
  await ensureTicketSideConversationsSchema();
  const next = String(status || "").toLowerCase();
  if (next !== "open" && next !== "done") throw new Error("Statut invalide");
  const result = await pool.query(
    `UPDATE v_b_ticket_side_conversations
     SET status = $1, updated_at = NOW()
     WHERE id = $2 AND ticket_id = $3
     RETURNING *`,
    [next, sideConversationId, ticketId]
  );
  if (!result.rows[0]) throw new Error("Side conversation introuvable");
  return getSideConversation(ticketId, sideConversationId);
}

export async function resolveSideConversationFromEmailContext(mailContext = {}) {
  await ensureTicketSideConversationsSchema();
  const referenceIds = collectReferenceMessageIds(mailContext);
  if (referenceIds.length > 0) {
    const byThread = await pool.query(
      `SELECT sc.*
       FROM v_b_ticket_email_messages m
       JOIN v_b_ticket_side_conversations sc ON sc.id = m.side_conversation_id
       WHERE m.message_id = ANY($1::text[])
         AND m.side_conversation_id IS NOT NULL
       ORDER BY m.created_at DESC
       LIMIT 1`,
      [referenceIds]
    );
    if (byThread.rows[0]) return byThread.rows[0];
  }

  const token = extractSideConversationToken(mailContext?.subject || "");
  if (token) {
    const byToken = await pool.query(
      `SELECT * FROM v_b_ticket_side_conversations
       WHERE LOWER(thread_token) = $1
       LIMIT 1`,
      [token]
    );
    if (byToken.rows[0]) return byToken.rows[0];
  }
  return null;
}

export async function attachInboundMailToSideConversation({
  conversation,
  mailContext = {},
  collectorId = ""
} = {}) {
  await ensureTicketSideConversationsSchema();
  if (!conversation?.id || !conversation?.ticket_id) return null;

  const body = String(mailContext.body || "").trim() || String(mailContext.subject || "").trim() || "(message vide)";
  const fromLabel =
    String(mailContext.fromName || "").trim() ||
    normalizeEmail(mailContext.fromAddress) ||
    "Externe";
  const messageId = normalizeMessageId(mailContext.messageId);

  const inserted = await pool.query(
    `INSERT INTO v_b_ticket_side_conversation_messages
      (side_conversation_id, ticket_id, direction, author_user_id, author_label, body, email_message_id, send_status, created_at)
     VALUES ($1, $2, 'inbound', NULL, $3, $4, $5, 'received', NOW())
     RETURNING *`,
    [conversation.id, conversation.ticket_id, fromLabel, body, messageId || null]
  );

  await recordTicketEmailMessage({
    ticketId: conversation.ticket_id,
    collectorId,
    mailContext,
    direction: "inbound",
    sideConversationId: conversation.id
  }).catch(() => {});

  await pool.query(
    `UPDATE v_b_ticket_side_conversations
     SET status = CASE WHEN status = 'done' THEN 'open' ELSE status END,
         updated_at = NOW()
     WHERE id = $1`,
    [conversation.id]
  );

  // Discreet system timeline note (internal)
  const subjectPreview = String(conversation.subject || "").slice(0, 80);
  await pool.query(
    `INSERT INTO v_b_ticket_comments (ticket_id, author_user_id, content, is_internal, created_at)
     VALUES ($1, NULL, $2, TRUE, NOW())`,
    [
      conversation.ticket_id,
      `[Side conversation] [id:${conversation.id}] [event:inbound] [subject:${subjectPreview.replace(/[\\\]]/g, "")}] [from:${fromLabel.replace(/[\\\]]/g, "")}] [created_at:${new Date().toISOString()}]`
    ]
  ).catch(() => {});

  return mapMessageRow(inserted.rows[0]);
}

export { extractSideConversationToken, parseAddressList, normalizeEmail, RECIPIENT_TYPES };
