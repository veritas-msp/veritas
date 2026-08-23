import express from "express";
import { pool } from "../../database/db.js";
import verifyJWT from "../../middleware/auth.js";
import { requirePermission } from "../../middleware/permissions.js";
import { loadEquipmentActivity } from "../../services/equipmentActivityService.js";
const router = express.Router();
const TAG_COLORS = ["#2b5fab", "#16a34a", "#d97706", "#7c3aed", "#dc2626", "#0891b2"];
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function parseEquipmentId(raw) {
  const value = String(raw || "").trim();
  return UUID_RE.test(value) ? value : null;
}
async function resolveClientId(rawId) {
  const result = await pool.query("SELECT id FROM v_b_clients WHERE id::text = $1 LIMIT 1", [String(rawId)]);
  return result.rows[0]?.id ?? null;
}
function pickTagColor(label) {
  let hash = 0;
  for (let i = 0; i < label.length; i += 1) {
    hash = (hash + label.charCodeAt(i) * (i + 1)) % TAG_COLORS.length;
  }
  return TAG_COLORS[hash];
}
function isMissingTableError(err) {
  return err?.code === "42P01";
}
const NOTE_VISIBILITY = new Set(["public", "private"]);
function normalizeNoteVisibility(value) {
  const normalized = String(value || "private").trim().toLowerCase();
  return NOTE_VISIBILITY.has(normalized) ? normalized : "private";
}
function canEditEquipmentNote(req, note) {
  if (req.user?.role === "admin") return true;
  if (!note?.user_id || !req.user?.id) return false;
  return note.user_id === req.user.id;
}
function mapEquipmentNoteRow(row) {
  return {
    id: row.id,
    equipment_id: row.equipment_id,
    client_id: row.client_id,
    user_id: row.user_id,
    content: row.content,
    visibility: row.visibility,
    created_at: row.created_at,
    updated_at: row.updated_at,
    username: row.username || null,
    email: row.email || null
  };
}
router.use(verifyJWT);
function parseClientIds(raw) {
  const parts = String(raw || "").split(",").map(value => value.trim()).filter(Boolean);
  const ids = [];
  for (const part of parts) {
    if (/^\d+$/.test(part)) ids.push(part);
  }
  return [...new Set(ids)];
}
router.get("/tags/batch", requirePermission("infrastructure.view"), async (req, res) => {
  try {
    const clientIds = parseClientIds(req.query.clientIds);
    if (!clientIds.length) return res.json([]);
    const result = await pool.query(`SELECT l.equipment_id::text AS equipment_id,
              l.client_id::text AS client_id,
              t.id,
              t.label,
              t.color
       FROM v_b_equipment_tag_links l
       JOIN v_b_client_tags t ON t.id = l.tag_id
       WHERE l.client_id::text = ANY($1::text[])
       ORDER BY l.equipment_id, t.label ASC`, [clientIds]);
    res.json(result.rows);
  } catch (err) {
    if (isMissingTableError(err)) return res.json([]);
    console.error("[GET /equipment/tags/batch]", err);
    res.status(500).json({
      error: "Error loading device tags"
    });
  }
});
router.get("/:equipmentId/activity", requirePermission("infrastructure.view"), async (req, res) => {
  try {
    const equipmentId = parseEquipmentId(req.params.equipmentId);
    if (!equipmentId) return res.status(400).json({
      error: "Invalid device ID"
    });
    const clientId = await resolveClientId(req.query.clientId);
    if (!clientId) return res.status(400).json({
      error: "clientId required"
    });
    const payload = await loadEquipmentActivity({
      equipmentId,
      clientId,
      startDate: req.query.startDate,
      endDate: req.query.endDate
    });
    res.json(payload);
  } catch (err) {
    if (err?.statusCode === 400) {
      return res.status(400).json({
        error: err.message
      });
    }
    console.error("[GET /equipment/:equipmentId/activity]", err);
    res.status(500).json({
      error: "Error loading device activity"
    });
  }
});
router.get("/:equipmentId/tags", requirePermission("infrastructure.view"), async (req, res) => {
  try {
    const equipmentId = parseEquipmentId(req.params.equipmentId);
    if (!equipmentId) return res.status(400).json({
      error: "Invalid device ID"
    });
    const clientId = await resolveClientId(req.query.clientId);
    if (!clientId) return res.status(400).json({
      error: "clientId required"
    });
    const result = await pool.query(`SELECT t.id, t.label, t.color, l.created_at AS linked_at
       FROM v_b_equipment_tag_links l
       JOIN v_b_client_tags t ON t.id = l.tag_id
       WHERE l.equipment_id = $1 AND l.client_id = $2
       ORDER BY t.label ASC`, [equipmentId, clientId]);
    res.json(result.rows);
  } catch (err) {
    if (isMissingTableError(err)) return res.json([]);
    console.error("[GET /equipment/:equipmentId/tags]", err);
    res.status(500).json({
      error: "Error loading device tags"
    });
  }
});
router.post("/:equipmentId/tags", requirePermission("infrastructure.edit"), async (req, res) => {
  try {
    const equipmentId = parseEquipmentId(req.params.equipmentId);
    if (!equipmentId) return res.status(400).json({
      error: "Invalid device ID"
    });
    const clientId = await resolveClientId(req.body?.clientId);
    if (!clientId) return res.status(400).json({
      error: "clientId required"
    });
    const label = String(req.body?.label || "").trim();
    if (!label) return res.status(400).json({
      error: "Tag label is required"
    });
    if (label.length > 64) {
      return res.status(400).json({
        error: "Label cannot exceed 64 characters"
      });
    }
    const color = req.body?.color || pickTagColor(label);
    const tagResult = await pool.query(`INSERT INTO v_b_client_tags (label, color, created_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (label)
       DO UPDATE SET color = COALESCE(EXCLUDED.color, v_b_client_tags.color)
       RETURNING *`, [label, color]);
    await pool.query(`INSERT INTO v_b_equipment_tag_links (equipment_id, client_id, tag_id, created_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (equipment_id, tag_id) DO NOTHING`, [equipmentId, clientId, tagResult.rows[0].id]);
    res.status(201).json(tagResult.rows[0]);
  } catch (err) {
    if (isMissingTableError(err)) {
      return res.status(503).json({
        error: "Device tags are not installed yet (migration required)"
      });
    }
    console.error("[POST /equipment/:equipmentId/tags]", err);
    res.status(500).json({
      error: "Error adding tag"
    });
  }
});
router.delete("/:equipmentId/tags/:tagId", requirePermission("infrastructure.edit"), async (req, res) => {
  try {
    const equipmentId = parseEquipmentId(req.params.equipmentId);
    if (!equipmentId) return res.status(400).json({
      error: "Invalid device ID"
    });
    const clientId = await resolveClientId(req.query.clientId);
    if (!clientId) return res.status(400).json({
      error: "clientId required"
    });
    await pool.query("DELETE FROM v_b_equipment_tag_links WHERE equipment_id = $1 AND client_id = $2 AND tag_id = $3", [equipmentId, clientId, req.params.tagId]);
    res.json({
      success: true
    });
  } catch (err) {
    if (isMissingTableError(err)) {
      return res.status(503).json({
        error: "Device tags are not installed yet (migration required)"
      });
    }
    console.error("[DELETE /equipment/:equipmentId/tags/:tagId]", err);
    res.status(500).json({
      error: "Error deleting tag"
    });
  }
});
router.get("/:equipmentId/notes", requirePermission("infrastructure.view"), async (req, res) => {
  try {
    const equipmentId = parseEquipmentId(req.params.equipmentId);
    if (!equipmentId) return res.status(400).json({
      error: "Invalid device ID"
    });
    const clientId = await resolveClientId(req.query.clientId);
    if (!clientId) return res.status(400).json({
      error: "clientId required"
    });
    const result = await pool.query(`SELECT n.id, n.equipment_id, n.client_id, n.user_id, n.content, n.visibility,
                n.created_at, n.updated_at, u.username, u.email
         FROM v_b_equipment_notes n
         LEFT JOIN v_b_users u ON u.id = n.user_id
         WHERE n.equipment_id = $1 AND n.client_id = $2
         ORDER BY n.created_at DESC`, [equipmentId, clientId]);
    res.json(result.rows.map(mapEquipmentNoteRow));
  } catch (err) {
    if (isMissingTableError(err)) return res.json([]);
    console.error("[GET /equipment/:equipmentId/notes]", err);
    res.status(500).json({
      error: "Error loading device notes"
    });
  }
});
router.post("/:equipmentId/notes", requirePermission("infrastructure.edit"), async (req, res) => {
  try {
    const equipmentId = parseEquipmentId(req.params.equipmentId);
    if (!equipmentId) return res.status(400).json({
      error: "Invalid device ID"
    });
    const clientId = await resolveClientId(req.body?.clientId);
    if (!clientId) return res.status(400).json({
      error: "clientId required"
    });
    const content = String(req.body?.content || "").trim();
    if (!content) return res.status(400).json({
      error: "Note content is required"
    });
    const visibility = normalizeNoteVisibility(req.body?.visibility);
    const result = await pool.query(`INSERT INTO v_b_equipment_notes
         (equipment_id, client_id, user_id, content, visibility, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
         RETURNING *`, [equipmentId, clientId, req.user?.id || null, content, visibility]);
    const note = result.rows[0];
    const userResult = await pool.query("SELECT username, email FROM v_b_users WHERE id = $1", [req.user?.id]);
    const author = userResult.rows[0] || {};
    res.status(201).json(mapEquipmentNoteRow({
      ...note,
      username: author.username || null,
      email: author.email || null
    }));
  } catch (err) {
    if (isMissingTableError(err)) {
      return res.status(503).json({
        error: "Device notes are not installed yet (migration required)"
      });
    }
    console.error("[POST /equipment/:equipmentId/notes]", err);
    res.status(500).json({
      error: "Error adding note"
    });
  }
});
router.put("/:equipmentId/notes/:noteId", requirePermission("infrastructure.edit"), async (req, res) => {
  try {
    const equipmentId = parseEquipmentId(req.params.equipmentId);
    if (!equipmentId) return res.status(400).json({
      error: "Invalid device ID"
    });
    const clientId = await resolveClientId(req.body?.clientId ?? req.query.clientId);
    if (!clientId) return res.status(400).json({
      error: "clientId required"
    });
    const existing = await pool.query("SELECT * FROM v_b_equipment_notes WHERE id = $1 AND equipment_id = $2 AND client_id = $3", [req.params.noteId, equipmentId, clientId]);
    if (existing.rows.length === 0) {
      return res.status(404).json({
        error: "Note not found"
      });
    }
    if (!canEditEquipmentNote(req, existing.rows[0])) {
      return res.status(403).json({
        error: "You cannot edit this note"
      });
    }
    const content = String(req.body?.content || "").trim();
    if (!content) return res.status(400).json({
      error: "Note content is required"
    });
    const visibility = normalizeNoteVisibility(req.body?.visibility ?? existing.rows[0].visibility);
    const result = await pool.query(`UPDATE v_b_equipment_notes
         SET content = $1, visibility = $2, updated_at = NOW()
         WHERE id = $3
         RETURNING *`, [content, visibility, req.params.noteId]);
    const note = result.rows[0];
    const userResult = await pool.query("SELECT username, email FROM v_b_users WHERE id = $1", [note.user_id]);
    const author = userResult.rows[0] || {};
    res.json(mapEquipmentNoteRow({
      ...note,
      username: author.username || null,
      email: author.email || null
    }));
  } catch (err) {
    if (isMissingTableError(err)) {
      return res.status(503).json({
        error: "Device notes are not installed yet (migration required)"
      });
    }
    console.error("[PUT /equipment/:equipmentId/notes/:noteId]", err);
    res.status(500).json({
      error: "Error updating note"
    });
  }
});
router.delete("/:equipmentId/notes/:noteId", requirePermission("infrastructure.edit"), async (req, res) => {
  try {
    const equipmentId = parseEquipmentId(req.params.equipmentId);
    if (!equipmentId) return res.status(400).json({
      error: "Invalid device ID"
    });
    const clientId = await resolveClientId(req.query.clientId ?? req.body?.clientId);
    if (!clientId) return res.status(400).json({
      error: "clientId required"
    });
    const existing = await pool.query("SELECT * FROM v_b_equipment_notes WHERE id = $1 AND equipment_id = $2 AND client_id = $3", [req.params.noteId, equipmentId, clientId]);
    if (existing.rows.length === 0) {
      return res.status(404).json({
        error: "Note not found"
      });
    }
    if (!canEditEquipmentNote(req, existing.rows[0])) {
      return res.status(403).json({
        error: "You cannot delete this note"
      });
    }
    await pool.query("DELETE FROM v_b_equipment_notes WHERE id = $1", [req.params.noteId]);
    res.json({
      success: true
    });
  } catch (err) {
    if (isMissingTableError(err)) {
      return res.status(503).json({
        error: "Device notes are not installed yet (migration required)"
      });
    }
    console.error("[DELETE /equipment/:equipmentId/notes/:noteId]", err);
    res.status(500).json({
      error: "Error deleting note"
    });
  }
});
export default router;
