import express from 'express';
import { pool } from '../../database/db.js';
import verifyJWT from '../../middleware/auth.js';
import { requirePermission } from '../../middleware/permissions.js';
import { body, validationResult } from 'express-validator';
import { normalizePlanningEventDateInput, comparePlanningEventDates } from './planningEventDateTime.js';
import { ensureEventsSchema } from '../../services/ensureEventsSchema.js';
import { isValidPlanningEventType } from '../../utils/planningEventTypes.js';
import { notifyPlanningEventAssigned } from '../../services/systemNotificationService.js';
const router = express.Router();
router.use(verifyJWT);
async function assertValidEventType(type, {
  optional = false,
  enabledOnly = true
} = {}) {
  if (type === undefined || type === null || type === '') {
    if (optional) return true;
    return false;
  }
  return isValidPlanningEventType(type, {
    enabledOnly
  });
}
function formatEventRowForApi(row) {
  if (!row) return row;
  const start = normalizePlanningEventDateInput(row.start);
  const end = normalizePlanningEventDateInput(row.end);
  return {
    ...row,
    start: start ? start.replace(" ", "T") : row.start,
    end: end ? end.replace(" ", "T") : row.end
  };
}
async function loadPlanningVisibilityByUserIds(userIds) {
  const map = new Map();
  if (!userIds?.length) return map;
  const {
    rows
  } = await pool.query(`SELECT user_id::text AS user_id, setting_value
     FROM v_b_users_settings
     WHERE setting_key = 'planning_visibility'
       AND user_id = ANY($1::uuid[])`, [userIds]);
  for (const row of rows) {
    const raw = row.setting_value == null ? "" : String(row.setting_value).trim().toLowerCase();
    map.set(String(row.user_id), raw === "private" ? "private" : "public");
  }
  return map;
}
function anonymizeEventForViewer(event, viewerId, visibilityByOwner) {
  const ownerId = event.user_id || event.assigned_user_id;
  if (!ownerId || String(ownerId) === String(viewerId)) return event;
  const vis = visibilityByOwner.get(String(ownerId)) || "public";
  if (vis !== "private") return event;
  return {
    ...event,
    title: "Busy",
    description: null,
    client_id: null,
    equipment_id: null,
    ticket_id: null,
    ticket_number: null,
    ticket_type: null,
    ticket_client_id: null,
    ticket_requester_contact_id: null,
    ticket_requester_name: null,
    privacy_redacted: true
  };
}
async function redactEventsForViewer(events, viewerId) {
  const ids = [...new Set(events.map(e => e.user_id || e.assigned_user_id).filter(Boolean).map(String))];
  const map = await loadPlanningVisibilityByUserIds(ids);
  return events.map(e => anonymizeEventForViewer(formatEventRowForApi(e), viewerId, map));
}
async function redactEventForViewer(event, viewerId) {
  if (!event) return event;
  const [redacted] = await redactEventsForViewer([event], viewerId);
  return redacted;
}
function buildEventsListSql(schema, {
  whereSql,
  orderSql,
  limitSql
}) {
  const ticketFields = schema.hasTicketId ? `e.ticket_id,
        t.ticket_number,
        t.type AS ticket_type,
        t.client_id AS ticket_client_id,
        t.requester_contact_id AS ticket_requester_contact_id,
        COALESCE(
          NULLIF(TRIM(CONCAT_WS(' ', rc.prenom, rc.nom)), ''),
          rc.email,
          req_u.username,
          req_u.email
        ) AS ticket_requester_name` : `NULL::uuid AS ticket_id,
        NULL::text AS ticket_number,
        NULL::text AS ticket_type,
        NULL::integer AS ticket_client_id,
        NULL::uuid AS ticket_requester_contact_id,
        NULL::text AS ticket_requester_name`;
  const ticketJoins = schema.hasTicketId ? `LEFT JOIN v_b_tickets t ON t.id = e.ticket_id
      LEFT JOIN v_b_contacts rc ON rc.id = t.requester_contact_id
      LEFT JOIN v_b_users req_u ON req_u.id = t.requester_user_id` : "";
  return `SELECT 
        e.id,
        e.title,
        e.type,
        to_char(e.start, 'YYYY-MM-DD"T"HH24:MI:SS') AS start,
        to_char(e."end", 'YYYY-MM-DD"T"HH24:MI:SS') AS "end",
        to_char(e."end", 'YYYY-MM-DD"T"HH24:MI:SS') AS event_end,
        e.description,
        e.client_id,
        e.equipment_id,
        e.user_id,
        e.assigned_user_id,
        ${ticketFields},
        e.created_at,
        e.updated_at
      FROM v_b_events e
      ${ticketJoins}
      ${whereSql}
      ${orderSql}${limitSql}`;
}
router.get('/', verifyJWT, requirePermission('planning.view'), async (req, res) => {
  try {
    const schema = await ensureEventsSchema();
    const {
      clientId,
      upcoming,
      recent,
      limit
    } = req.query;
    const where = [];
    const values = [];
    let i = 1;
    const isUpcoming = upcoming === "true" || upcoming === "1";
    const isRecent = recent === "true" || recent === "1";
    if (clientId !== undefined && clientId !== "") {
      where.push(`e.client_id = $${i++}`);
      values.push(Number(clientId));
    }
    if (req.query.ticketId !== undefined && req.query.ticketId !== "") {
      if (!schema.hasTicketId) {
        return res.json([]);
      }
      where.push(`e.ticket_id = $${i++}`);
      values.push(String(req.query.ticketId));
    }
    if (req.query.equipmentId !== undefined && req.query.equipmentId !== "") {
      where.push(`e.equipment_id::text = $${i++}`);
      values.push(String(req.query.equipmentId).trim());
    }
    if (req.query.startDate !== undefined && req.query.startDate !== "") {
      where.push(`e."end" >= $${i++}::timestamptz`);
      values.push(String(req.query.startDate).trim());
    }
    if (req.query.endDate !== undefined && req.query.endDate !== "") {
      where.push(`e.start <= $${i++}::timestamptz`);
      values.push(String(req.query.endDate).trim());
    }
    if (isUpcoming) {
      where.push(`e."end" >= NOW()`);
    }
    if (isRecent) {
      where.push(`e."end" < NOW()`);
      where.push(`e."end" >= NOW() - INTERVAL '30 days'`);
    }
    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
    const limitValue = Math.min(Math.max(Number(limit) || 0, 0), 200);
    const limitSql = limitValue > 0 ? ` LIMIT ${limitValue}` : "";
    const orderSql = isRecent ? `ORDER BY e."end" DESC` : `ORDER BY e.start ASC`;
    const result = await pool.query(buildEventsListSql(schema, {
      whereSql,
      orderSql,
      limitSql
    }), values);
    res.json(await redactEventsForViewer(result.rows, req.user.id));
  } catch (err) {
    console.error('Error fetching events:', err);
    res.status(500).json({
      error: 'Error retrieving events'
    });
  }
});
router.post('/', verifyJWT, requirePermission('planning.create'), [body('title').notEmpty().withMessage('Title is required'), body('type').isString().trim().notEmpty().withMessage('Invalid event type'), body('start').isISO8601().withMessage('Start date must be in ISO8601 format'), body('end').isISO8601().withMessage('End date must be in ISO8601 format'), body('clientId').optional({
  nullable: true,
  checkFalsy: true
}).isInt().withMessage('clientId must be an integer'), body('equipmentId').optional({
  nullable: true,
  checkFalsy: true
}).custom(value => {
  if (value === null || value === undefined || value === '') return true;
  return Number.isInteger(Number(value)) || typeof value === 'string';
}).withMessage('equipmentId must be an integer or a string'), body('assignedUserId').optional({
  nullable: true,
  checkFalsy: true
}).isUUID().withMessage('assignedUserId must be a valid UUID'), body('ticketId').optional({
  nullable: true,
  checkFalsy: true
}).isUUID().withMessage('ticketId must be a valid UUID')], async (req, res) => {
  try {
    const schema = await ensureEventsSchema();
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation error',
        errors: errors.array()
      });
    }
    const {
      title,
      type,
      start,
      end,
      description,
      clientId,
      equipmentId,
      assignedUserId,
      ticketId
    } = req.body;
    if (!(await assertValidEventType(type))) {
      return res.status(400).json({
        error: 'Validation error',
        errors: [{
          msg: 'Invalid event type',
          path: 'type'
        }]
      });
    }
    const userId = req.user.id;
    const startStored = normalizePlanningEventDateInput(start);
    const endStored = normalizePlanningEventDateInput(end);
    if (!startStored || !endStored) {
      return res.status(400).json({
        error: 'Invalid start or end dates'
      });
    }
    if (comparePlanningEventDates(end, start) <= 0) {
      return res.status(400).json({
        error: 'End date must be after start date'
      });
    }
    if (ticketId && !schema.hasTicketId) {
      return res.status(503).json({
        error: 'Ticket-linked reminders are not available on this database yet.'
      });
    }
    if (ticketId && schema.hasTicketId) {
      const existingReminder = await pool.query('SELECT id FROM v_b_events WHERE ticket_id = $1 LIMIT 1', [ticketId]);
      if (existingReminder.rows.length > 0) {
        return res.status(409).json({
          error: 'A reminder already exists for this ticket'
        });
      }
    }
    const insertColumns = ['title', 'type', 'start', '"end"', 'description', 'client_id', 'equipment_id', 'user_id', 'assigned_user_id'];
    const insertValues = [title, type, startStored, endStored, description || null, clientId || null, equipmentId || null, userId, assignedUserId || null];
    if (schema.hasTicketId) {
      insertColumns.push('ticket_id');
      insertValues.push(ticketId || null);
    }
    const placeholders = insertValues.map((_, index) => `$${index + 1}`);
    insertColumns.push('created_at', 'updated_at');
    placeholders.push('NOW()', 'NOW()');
    const result = await pool.query(`INSERT INTO v_b_events (${insertColumns.join(', ')})
         VALUES (${placeholders.join(', ')})
         RETURNING *`, insertValues);
    const createdEvent = result.rows[0];
    if (createdEvent?.assigned_user_id) {
      let enterpriseName = "";
      if (createdEvent.client_id) {
        try {
          const clientResult = await pool.query(`SELECT name FROM v_b_clients WHERE id = $1 LIMIT 1`, [createdEvent.client_id]);
          enterpriseName = String(clientResult.rows?.[0]?.name || "");
        } catch (_err) {
          enterpriseName = "";
        }
      }
      await notifyPlanningEventAssigned({
        eventRow: createdEvent,
        assignedUserId: createdEvent.assigned_user_id,
        actorUser: req.user,
        enterpriseName
      }).catch(() => {});
    }
    res.status(201).json(formatEventRowForApi(createdEvent));
  } catch (err) {
    console.error('Error creating event:', err);
    if (err?.code === '23505') {
      return res.status(409).json({
        error: 'A reminder already exists for this ticket'
      });
    }
    res.status(500).json({
      error: 'Error creating event'
    });
  }
});
router.put('/:id', verifyJWT, requirePermission('planning.edit'), [body('title').optional().notEmpty().withMessage('Title cannot be empty'), body('type').optional().isString().trim().notEmpty().withMessage('Invalid event type'), body('start').optional().isISO8601().withMessage('Start date must be in ISO8601 format'), body('end').optional().isISO8601().withMessage('End date must be in ISO8601 format'), body('clientId').optional({
  nullable: true,
  checkFalsy: true
}).isInt().withMessage('clientId must be an integer'), body('equipmentId').optional({
  nullable: true,
  checkFalsy: true
}).custom(value => {
  if (value === null || value === undefined || value === '') return true;
  return Number.isInteger(Number(value)) || typeof value === 'string';
}).withMessage('equipmentId must be an integer or a string'), body('assignedUserId').optional({
  nullable: true,
  checkFalsy: true
}).isUUID().withMessage('assignedUserId must be a valid UUID'), body('ticketId').optional({
  nullable: true,
  checkFalsy: true
}).isUUID().withMessage('ticketId must be a valid UUID')], async (req, res) => {
  try {
    const schema = await ensureEventsSchema();
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        errors: errors.array()
      });
    }
    const {
      id
    } = req.params;
    const {
      title,
      type,
      start,
      end,
      description,
      clientId,
      equipmentId,
      assignedUserId,
      ticketId
    } = req.body;
    if (type !== undefined && !(await assertValidEventType(type, {
      optional: true,
      enabledOnly: false
    }))) {
      return res.status(400).json({
        errors: [{
          msg: 'Invalid event type',
          path: 'type'
        }]
      });
    }
    const existingEvent = await pool.query('SELECT * FROM v_b_events WHERE id = $1', [id]);
    if (existingEvent.rows.length === 0) {
      return res.status(404).json({
        error: 'Event not found'
      });
    }
    const nextStart = start !== undefined ? normalizePlanningEventDateInput(start) : normalizePlanningEventDateInput(existingEvent.rows[0].start);
    const nextEnd = end !== undefined ? normalizePlanningEventDateInput(end) : normalizePlanningEventDateInput(existingEvent.rows[0].end);
    if (start !== undefined && !nextStart) {
      return res.status(400).json({
        error: 'Invalid start date'
      });
    }
    if (end !== undefined && !nextEnd) {
      return res.status(400).json({
        error: 'Invalid Date de fin'
      });
    }
    if (nextStart && nextEnd && comparePlanningEventDates(nextEnd, nextStart) <= 0) {
      return res.status(400).json({
        error: 'End date must be after start date'
      });
    }
    const updates = [];
    const values = [];
    let paramIndex = 1;
    if (title !== undefined) {
      updates.push(`title = $${paramIndex++}`);
      values.push(title);
    }
    if (type !== undefined) {
      updates.push(`type = $${paramIndex++}`);
      values.push(type);
    }
    if (start !== undefined) {
      updates.push(`start = $${paramIndex++}`);
      values.push(nextStart);
    }
    if (end !== undefined) {
      updates.push(`"end" = $${paramIndex++}`);
      values.push(nextEnd);
    }
    if (description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      values.push(description || null);
    }
    if (clientId !== undefined) {
      updates.push(`client_id = $${paramIndex++}`);
      values.push(clientId || null);
    }
    if (equipmentId !== undefined) {
      updates.push(`equipment_id = $${paramIndex++}`);
      values.push(equipmentId || null);
    }
    if (assignedUserId !== undefined) {
      updates.push(`assigned_user_id = $${paramIndex++}`);
      values.push(assignedUserId || null);
    }
    if (ticketId !== undefined) {
      if (!schema.hasTicketId) {
        return res.status(503).json({
          error: 'Ticket-linked reminders are not available on this database yet.'
        });
      }
      if (ticketId) {
        const duplicateReminder = await pool.query('SELECT id FROM v_b_events WHERE ticket_id = $1 AND id <> $2 LIMIT 1', [ticketId, id]);
        if (duplicateReminder.rows.length > 0) {
          return res.status(409).json({
            error: 'A reminder already exists for this ticket'
          });
        }
      }
      updates.push(`ticket_id = $${paramIndex++}`);
      values.push(ticketId || null);
    }
    if (updates.length === 0) {
      return res.status(400).json({
        error: 'No fields to update'
      });
    }
    updates.push(`updated_at = NOW()`);
    values.push(id);
    const result = await pool.query(`UPDATE v_b_events 
        SET ${updates.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *`, values);
    const updatedEvent = result.rows[0];
    const previousAssignee = String(existingEvent.rows[0]?.assigned_user_id || "");
    const nextAssignee = String(updatedEvent?.assigned_user_id || "");
    if (nextAssignee && nextAssignee !== previousAssignee) {
      let enterpriseName = "";
      if (updatedEvent.client_id) {
        try {
          const clientResult = await pool.query(`SELECT name FROM v_b_clients WHERE id = $1 LIMIT 1`, [updatedEvent.client_id]);
          enterpriseName = String(clientResult.rows?.[0]?.name || "");
        } catch (_err) {
          enterpriseName = "";
        }
      }
      await notifyPlanningEventAssigned({
        eventRow: updatedEvent,
        assignedUserId: nextAssignee,
        actorUser: req.user,
        enterpriseName
      }).catch(() => {});
    }
    res.json(await redactEventForViewer(updatedEvent, req.user.id));
  } catch (err) {
    console.error('Error updating event:', err);
    res.status(500).json({
      error: 'Error updating event'
    });
  }
});
router.delete('/:id', verifyJWT, requirePermission('planning.edit'), async (req, res) => {
  try {
    const {
      id
    } = req.params;
    const existingEvent = await pool.query('SELECT * FROM v_b_events WHERE id = $1', [id]);
    if (existingEvent.rows.length === 0) {
      return res.status(404).json({
        error: 'Event not found'
      });
    }
    await pool.query('DELETE FROM v_b_events WHERE id = $1', [id]);
    res.json({
      success: true,
      message: 'Event deleted successfully'
    });
  } catch (err) {
    console.error('Error deleting event:', err);
    res.status(500).json({
      error: 'Error deleting event'
    });
  }
});
export default router;
