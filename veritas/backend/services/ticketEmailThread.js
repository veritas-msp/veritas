import { pool } from "../database/db.js";
import { ensureTicketEmailThreadSchema } from "./ensureTicketEmailThreadSchema.js";

/** Prefer linked user email, else first inbound collector From address. */
export const TICKET_REQUESTER_EMAIL_SQL = `COALESCE(
  req_u.email,
  (
    SELECT m.from_address
    FROM v_b_ticket_email_messages m
    WHERE m.ticket_id = t.id
      AND LOWER(COALESCE(m.direction, 'inbound')) = 'inbound'
      AND NULLIF(BTRIM(m.from_address), '') IS NOT NULL
    ORDER BY m.created_at ASC NULLS LAST
    LIMIT 1
  )
)`;

export function normalizeMessageId(value = "") {
  const trimmed = String(value || "").trim();
  if (!trimmed) return "";
  const inner = trimmed.replace(/^<|>$/g, "").trim().toLowerCase();
  return inner ? `<${inner}>` : "";
}
export function extractMessageIdsFromHeaderValue(value = "") {
  const matches = String(value || "").match(/<[^>]+>/g) || [];
  const normalized = matches.map(item => normalizeMessageId(item)).filter(Boolean);
  return [...new Set(normalized)];
}
export function parseEmailHeadersFromRfc822(sourceValue) {
  const raw = Buffer.isBuffer(sourceValue) ? sourceValue.toString("utf8") : String(sourceValue || "");
  const headerEnd = raw.search(/\r?\n\r?\n/);
  const headerBlock = headerEnd >= 0 ? raw.slice(0, headerEnd) : raw;
  const unfolded = headerBlock.replace(/\r?\n[ \t]+/g, " ");
  const headers = {};
  for (const line of unfolded.split(/\r?\n/)) {
    const idx = line.indexOf(":");
    if (idx < 0) continue;
    const key = line.slice(0, idx).trim().toLowerCase();
    const value = line.slice(idx + 1).trim();
    if (!key) continue;
    headers[key] = headers[key] ? `${headers[key]} ${value}` : value;
  }
  return {
    messageId: headers["message-id"] || "",
    inReplyTo: headers["in-reply-to"] || "",
    references: headers.references || ""
  };
}
export function collectReferenceMessageIds(mailContext = {}) {
  const ids = [];
  const pushIds = value => {
    for (const id of extractMessageIdsFromHeaderValue(value)) {
      if (!ids.includes(id)) ids.push(id);
    }
  };
  pushIds(mailContext.inReplyTo);
  pushIds(mailContext.references);
  if (Array.isArray(mailContext.referenceMessageIds)) {
    for (const id of mailContext.referenceMessageIds) {
      const normalized = normalizeMessageId(id);
      if (normalized && !ids.includes(normalized)) ids.push(normalized);
    }
  }
  return ids;
}
export function enrichMailContextWithThreadHeaders(mailContext = {}, sourceValue, envelope = {}) {
  const parsed = parseEmailHeadersFromRfc822(sourceValue);
  const messageId = normalizeMessageId(parsed.messageId) || normalizeMessageId(envelope?.messageId) || normalizeMessageId(mailContext?.messageId);
  const inReplyTo = String(parsed.inReplyTo || mailContext?.inReplyTo || "").trim();
  const references = String(parsed.references || mailContext?.references || "").trim();
  const referenceMessageIds = collectReferenceMessageIds({
    inReplyTo,
    references
  });
  const isReplyHeader = referenceMessageIds.length > 0 || Boolean(inReplyTo);
  const isReplySubject = mailContext?.isReply === "yes" || /^(re|fw|fwd)\s*:/i.test(mailContext?.subject || "");
  return {
    ...mailContext,
    messageId,
    inReplyTo,
    references,
    referenceMessageIds,
    isReply: isReplyHeader || isReplySubject ? "yes" : "no"
  };
}
export async function isInboundEmailAlreadyProcessed(messageId) {
  const normalized = normalizeMessageId(messageId);
  if (!normalized) return false;
  const result = await pool.query(`SELECT 1
     FROM v_b_ticket_email_messages
     WHERE message_id = $1
     LIMIT 1`, [normalized]);
  return result.rows.length > 0;
}
export async function recordTicketEmailMessage({
  ticketId,
  collectorId = "",
  mailContext = {},
  direction = "inbound",
  allowMissingTicket = false
} = {}) {
  const messageId = normalizeMessageId(mailContext?.messageId);
  const hasTicket = Boolean(ticketId);
  if (!messageId) return false;
  if (!hasTicket && !allowMissingTicket) return false;
  const params = [hasTicket ? ticketId : null, String(collectorId || "").trim() || null, messageId, String(mailContext?.inReplyTo || "").trim() || null, String(mailContext?.references || "").trim() || null, String(mailContext?.subject || "").trim().slice(0, 500) || null, String(mailContext?.fromAddress || "").trim().toLowerCase() || null, String(direction || "inbound").trim() || "inbound"];
  const insertSql = `INSERT INTO v_b_ticket_email_messages
      (ticket_id, collector_id, message_id, in_reply_to, references_header, subject, from_address, direction, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
     ON CONFLICT (message_id) DO NOTHING`;
  try {
    await pool.query(insertSql, params);
  } catch (err) {
    const msg = String(err?.message || "");
    if (err?.code === "42P10" || /no unique or exclusion constraint matching the ON CONFLICT/i.test(msg)) {
      await ensureTicketEmailThreadSchema();
      try {
        await pool.query(insertSql, params);
      } catch (retryErr) {
        // Last resort without ON CONFLICT after ensuring uniqueness failed.
        if (await isInboundEmailAlreadyProcessed(messageId)) return true;
        await pool.query(`INSERT INTO v_b_ticket_email_messages
            (ticket_id, collector_id, message_id, in_reply_to, references_header, subject, from_address, direction, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`, params);
      }
      return true;
    }
    throw err;
  }
  return true;
}
export async function resolveTicketFromEmailContext(mailContext = {}, {
  extractTicketNumberFromSubject,
  threadLookupEnabled = true
} = {}) {
  const ticketNumber = typeof extractTicketNumberFromSubject === "function" ? extractTicketNumberFromSubject(mailContext?.subject || "") : null;
  if (ticketNumber) {
    const byNumber = await pool.query(`SELECT id, ticket_number
       FROM v_b_tickets
       WHERE ticket_number = $1
         AND COALESCE(is_deleted, FALSE) = FALSE
       ORDER BY created_at DESC
       LIMIT 1`, [ticketNumber]);
    if (byNumber.rows?.[0]?.id) return byNumber.rows[0];
  }
  const referenceIds = collectReferenceMessageIds(mailContext);
  if (threadLookupEnabled === false || referenceIds.length === 0) return null;
  const byThread = await pool.query(`SELECT t.id, t.ticket_number
     FROM v_b_ticket_email_messages m
     JOIN v_b_tickets t ON t.id = m.ticket_id
     WHERE m.message_id = ANY($1::text[])
       AND COALESCE(t.is_deleted, FALSE) = FALSE
     ORDER BY m.created_at DESC
     LIMIT 1`, [referenceIds]);
  return byThread.rows?.[0] || null;
}

function normalizeEmailAddress(value) {
  const raw = String(value || "").trim().toLowerCase();
  if (!raw) return "";
  const angle = raw.match(/<([^>]+)>/);
  const candidate = String(angle ? angle[1] : raw).trim().toLowerCase();
  return candidate.includes("@") ? candidate : "";
}

/** Collect unique emails from a contact (legacy column + communications). */
export function collectContactEmails(contact) {
  const emails = new Set();
  const push = value => {
    const email = normalizeEmailAddress(value);
    if (email) emails.add(email);
  };
  push(contact?.email);
  const communications = Array.isArray(contact?.communications) ? contact.communications : [];
  for (const entry of communications) {
    if (String(entry?.type || "").trim().toLowerCase() !== "email") continue;
    push(entry?.value);
  }
  return [...emails];
}

async function hasTicketRequesterContactColumn() {
  const result = await pool.query(`SELECT 1
     FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name = 'v_b_tickets'
       AND column_name = 'requester_contact_id'
     LIMIT 1`);
  return result.rows.length > 0;
}

/**
 * Link orphan mail tickets (no requester_contact_id) whose first inbound From
 * matches one of the contact emails. Idempotent.
 */
export async function attachOrphanTicketsToContactByEmails(contactId, emails) {
  const id = Number(contactId);
  if (!Number.isInteger(id) || id <= 0) {
    return {
      updated: 0,
      ticketIds: []
    };
  }
  const normalizedEmails = [...new Set((Array.isArray(emails) ? emails : []).map(normalizeEmailAddress).filter(Boolean))];
  if (normalizedEmails.length === 0) {
    return {
      updated: 0,
      ticketIds: []
    };
  }
  if (!(await hasTicketRequesterContactColumn())) {
    return {
      updated: 0,
      ticketIds: []
    };
  }
  try {
    await ensureTicketEmailThreadSchema();
  } catch {}
  const result = await pool.query(`UPDATE v_b_tickets t
      SET requester_contact_id = $1,
          updated_at = NOW()
    WHERE t.requester_contact_id IS NULL
      AND COALESCE(t.is_deleted, FALSE) = FALSE
      AND LOWER(BTRIM(COALESCE((
            SELECT m.from_address
              FROM v_b_ticket_email_messages m
             WHERE m.ticket_id = t.id
               AND LOWER(COALESCE(m.direction, 'inbound')) = 'inbound'
               AND NULLIF(BTRIM(m.from_address), '') IS NOT NULL
             ORDER BY m.created_at ASC NULLS LAST
             LIMIT 1
          ), ''))) = ANY($2::text[])
    RETURNING t.id`, [id, normalizedEmails]);
  return {
    updated: result.rowCount || 0,
    ticketIds: result.rows.map(row => row.id)
  };
}

export async function attachOrphanTicketsToContact(contact) {
  if (!contact?.id) {
    return {
      updated: 0,
      ticketIds: []
    };
  }
  return attachOrphanTicketsToContactByEmails(contact.id, collectContactEmails(contact));
}
