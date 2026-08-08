import { pool } from "../database/db.js";
import { ensureTicketValidationRequestsSchema } from "./ensureTicketValidationRequestsSchema.js";
import { logTicketActivity } from "./ticketActivityService.js";
import { notifyInAppTicketValidationRequested, notifyInAppTicketValidationResponded } from "./userNotificationService.js";
import { isSalesTicket } from "./supportCredits.js";

function mapValidationRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    ticketId: row.ticket_id,
    requestedByUserId: row.requested_by_user_id || null,
    requestedByName: row.requested_by_name || null,
    validatorUserId: row.validator_user_id,
    validatorName: row.validator_name || null,
    message: row.message || "",
    status: row.status || "pending",
    responseMessage: row.response_message || "",
    respondedAt: row.responded_at || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    isPending: String(row.status || "") === "pending"
  };
}

async function resolveUserDisplayName(userId) {
  if (!userId) return null;
  const result = await pool.query(
    `SELECT COALESCE(NULLIF(TRIM(username), ''), email, 'Agent') AS display_name
     FROM v_b_users
     WHERE id = $1
     LIMIT 1`,
    [userId]
  );
  return result.rows[0]?.display_name || null;
}

export async function listTicketValidationRequests(ticketId, { status = null } = {}) {
  const ready = await ensureTicketValidationRequestsSchema();
  if (!ready) return [];
  const params = [ticketId];
  let sql = `SELECT v.*,
      COALESCE(NULLIF(TRIM(req.username), ''), req.email) AS requested_by_name,
      COALESCE(NULLIF(TRIM(val.username), ''), val.email) AS validator_name
     FROM v_b_ticket_validation_requests v
     LEFT JOIN v_b_users req ON req.id = v.requested_by_user_id
     LEFT JOIN v_b_users val ON val.id = v.validator_user_id
     WHERE v.ticket_id = $1`;
  if (status) {
    params.push(status);
    sql += ` AND v.status = $${params.length}`;
  }
  sql += " ORDER BY v.created_at DESC";
  const result = await pool.query(sql, params);
  return result.rows.map(mapValidationRow);
}

export async function createTicketValidationRequest({
  ticketId,
  ticket = null,
  requestedByUserId,
  validatorUserId,
  message = ""
} = {}) {
  const ready = await ensureTicketValidationRequestsSchema();
  if (!ready) {
    const err = new Error("Validation requests unavailable (migration required)");
    err.status = 503;
    throw err;
  }
  const pending = await listTicketValidationRequests(ticketId, { status: "pending" });
  if (pending.length > 0) {
    const err = new Error("A validation request is already pending on this ticket");
    err.status = 409;
    throw err;
  }
  const validatorId = String(validatorUserId || "").trim();
  if (!validatorId) {
    const err = new Error("Validator is required");
    err.status = 400;
    throw err;
  }
  if (String(requestedByUserId || "") === validatorId) {
    const err = new Error("You cannot request validation from yourself");
    err.status = 400;
    throw err;
  }
  const userCheck = await pool.query(`SELECT id FROM v_b_users WHERE id = $1 LIMIT 1`, [validatorId]);
  if (!userCheck.rows.length) {
    const err = new Error("Validator not found");
    err.status = 404;
    throw err;
  }

  const note = String(message || "").trim().slice(0, 2000);
  const insert = await pool.query(
    `INSERT INTO v_b_ticket_validation_requests
       (ticket_id, requested_by_user_id, validator_user_id, message, status, created_at, updated_at)
     VALUES ($1, $2, $3, $4, 'pending', NOW(), NOW())
     RETURNING *`,
    [ticketId, requestedByUserId || null, validatorId, note || null]
  );
  const row = insert.rows[0];
  const validatorName = await resolveUserDisplayName(validatorId);
  const requesterName = await resolveUserDisplayName(requestedByUserId);

  await logTicketActivity({
    ticketId,
    action: "validation_requested",
    field: "validation",
    oldValue: null,
    newValue: "pending",
    actorUserId: requestedByUserId || null,
    meta: {
      validationRequestId: row.id,
      validatorUserId: validatorId,
      validatorName,
      message: note || null
    }
  });

  const ticketFamily = isSalesTicket(ticket?.type, ticket?.category) ? "sales" : "support";
  await notifyInAppTicketValidationRequested({
    ticketId,
    validationRequestId: row.id,
    validatorUserId: validatorId,
    requestedByUserId,
    message: note,
    ticketFamily
  });

  return mapValidationRow({
    ...row,
    requested_by_name: requesterName,
    validator_name: validatorName
  });
}

export async function updateTicketValidationRequest({
  ticketId,
  validationRequestId,
  actorUserId,
  validatorUserId,
  message = "",
  ticket = null
} = {}) {
  const ready = await ensureTicketValidationRequestsSchema();
  if (!ready) {
    const err = new Error("Validation requests unavailable (migration required)");
    err.status = 503;
    throw err;
  }
  const existing = await pool.query(
    `SELECT * FROM v_b_ticket_validation_requests WHERE id = $1 AND ticket_id = $2 LIMIT 1`,
    [validationRequestId, ticketId]
  );
  if (!existing.rows.length) {
    const err = new Error("Validation request not found");
    err.status = 404;
    throw err;
  }
  const current = existing.rows[0];
  if (current.status !== "pending") {
    const err = new Error("Only a pending validation request can be edited");
    err.status = 409;
    throw err;
  }

  const validatorId = String(validatorUserId || "").trim();
  if (!validatorId) {
    const err = new Error("Validator is required");
    err.status = 400;
    throw err;
  }
  if (String(actorUserId || "") === validatorId) {
    const err = new Error("You cannot request validation from yourself");
    err.status = 400;
    throw err;
  }
  const userCheck = await pool.query(`SELECT id FROM v_b_users WHERE id = $1 LIMIT 1`, [validatorId]);
  if (!userCheck.rows.length) {
    const err = new Error("Validator not found");
    err.status = 404;
    throw err;
  }

  const note = String(message || "").trim().slice(0, 2000);
  const previousValidatorId = String(current.validator_user_id || "");
  const validatorChanged = previousValidatorId !== validatorId;
  const messageChanged = String(current.message || "") !== note;

  if (!validatorChanged && !messageChanged) {
    const requesterName = await resolveUserDisplayName(current.requested_by_user_id);
    const validatorName = await resolveUserDisplayName(previousValidatorId);
    return mapValidationRow({
      ...current,
      requested_by_name: requesterName,
      validator_name: validatorName
    });
  }

  const updated = await pool.query(
    `UPDATE v_b_ticket_validation_requests
     SET validator_user_id = $1,
         message = $2,
         updated_at = NOW()
     WHERE id = $3
     RETURNING *`,
    [validatorId, note || null, validationRequestId]
  );
  const row = updated.rows[0];
  const validatorName = await resolveUserDisplayName(validatorId);
  const requesterName = await resolveUserDisplayName(row.requested_by_user_id || actorUserId);

  await logTicketActivity({
    ticketId,
    action: "validation_updated",
    field: "validation",
    oldValue: previousValidatorId,
    newValue: validatorId,
    actorUserId: actorUserId || null,
    meta: {
      validationRequestId: row.id,
      previousValidatorUserId: previousValidatorId,
      validatorUserId: validatorId,
      validatorName,
      message: note || null
    }
  });

  const ticketFamily = isSalesTicket(ticket?.type, ticket?.category) ? "sales" : "support";
  if (validatorChanged) {
    await notifyInAppTicketValidationRequested({
      ticketId,
      validationRequestId: row.id,
      validatorUserId: validatorId,
      requestedByUserId: actorUserId || row.requested_by_user_id,
      message: note,
      ticketFamily
    });
  }

  return mapValidationRow({
    ...row,
    requested_by_name: requesterName,
    validator_name: validatorName
  });
}

export async function respondTicketValidationRequest({
  ticketId,
  validationRequestId,
  actorUserId,
  decision,
  responseMessage = "",
  ticket = null
} = {}) {
  const ready = await ensureTicketValidationRequestsSchema();
  if (!ready) {
    const err = new Error("Validation requests unavailable (migration required)");
    err.status = 503;
    throw err;
  }
  const status = decision === "approved" ? "approved" : decision === "rejected" ? "rejected" : null;
  if (!status) {
    const err = new Error("Decision must be approved or rejected");
    err.status = 400;
    throw err;
  }
  const existing = await pool.query(
    `SELECT * FROM v_b_ticket_validation_requests WHERE id = $1 AND ticket_id = $2 LIMIT 1`,
    [validationRequestId, ticketId]
  );
  if (!existing.rows.length) {
    const err = new Error("Validation request not found");
    err.status = 404;
    throw err;
  }
  const current = existing.rows[0];
  if (current.status !== "pending") {
    const err = new Error("This validation request was already answered");
    err.status = 409;
    throw err;
  }
  if (String(current.validator_user_id) !== String(actorUserId || "")) {
    const err = new Error("Only the designated validator can answer this request");
    err.status = 403;
    throw err;
  }

  const note = String(responseMessage || "").trim().slice(0, 2000);
  const updated = await pool.query(
    `UPDATE v_b_ticket_validation_requests
     SET status = $1,
         response_message = $2,
         responded_at = NOW(),
         updated_at = NOW()
     WHERE id = $3
     RETURNING *`,
    [status, note || null, validationRequestId]
  );
  const row = updated.rows[0];
  const validatorName = await resolveUserDisplayName(actorUserId);
  const requesterName = await resolveUserDisplayName(row.requested_by_user_id);

  await logTicketActivity({
    ticketId,
    action: status === "approved" ? "validation_approved" : "validation_rejected",
    field: "validation",
    oldValue: "pending",
    newValue: status,
    actorUserId: actorUserId || null,
    meta: {
      validationRequestId: row.id,
      validatorUserId: row.validator_user_id,
      validatorName,
      responseMessage: note || null
    }
  });

  const ticketFamily = isSalesTicket(ticket?.type, ticket?.category) ? "sales" : "support";
  if (row.requested_by_user_id) {
    await notifyInAppTicketValidationResponded({
      ticketId,
      validationRequestId: row.id,
      requestedByUserId: row.requested_by_user_id,
      validatorUserId: actorUserId,
      decision: status,
      responseMessage: note,
      ticketFamily
    });
  }

  return mapValidationRow({
    ...row,
    requested_by_name: requesterName,
    validator_name: validatorName
  });
}
