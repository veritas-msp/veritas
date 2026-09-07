import express from "express";
import { pool } from "../../database/db.js";
import verifyJWT from "../../middleware/auth.js";
import { requirePermission } from "../../middleware/permissions.js";
import { ensurePrestatairesSchema } from "../../services/ensurePrestatairesSchema.js";

const router = express.Router();
router.use(verifyJWT);

function parseId(raw) {
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) return null;
  return id;
}

function normalizeStatut(value) {
  const raw = String(value || "actif").trim().toLowerCase();
  if (raw === "inactif" || raw === "inactive") return "inactif";
  return "actif";
}

function trimOrNull(value) {
  const text = String(value ?? "").trim();
  return text || null;
}

function normalizeContacts(raw) {
  const list = Array.isArray(raw) ? raw : [];
  const out = [];
  for (const item of list) {
    if (!item || typeof item !== "object") continue;
    const nom = trimOrNull(item.nom);
    const prenom = trimOrNull(item.prenom);
    const email = trimOrNull(item.email);
    const telephone = trimOrNull(item.telephone);
    if (!nom && !prenom && !email && !telephone) continue;
    out.push({ nom, prenom, email, telephone });
  }
  return out;
}

function legacyFromContacts(contacts) {
  const first = Array.isArray(contacts) && contacts.length > 0 ? contacts[0] : null;
  return {
    contact_nom: first?.nom || null,
    contact_prenom: first?.prenom || null,
    email: first?.email || null,
    telephone: first?.telephone || null
  };
}

function sanitizePayload(body = {}, { contacts } = {}) {
  const legacy = contacts ? legacyFromContacts(contacts) : {
    contact_nom: trimOrNull(body.contact_nom),
    contact_prenom: trimOrNull(body.contact_prenom),
    email: trimOrNull(body.email),
    telephone: trimOrNull(body.telephone)
  };
  return {
    nom: String(body.nom || "").trim(),
    type: trimOrNull(body.type),
    contact_nom: legacy.contact_nom,
    contact_prenom: legacy.contact_prenom,
    email: legacy.email,
    telephone: legacy.telephone,
    site_web: trimOrNull(body.site_web),
    adresse: trimOrNull(body.adresse),
    notes: trimOrNull(body.notes),
    statut: normalizeStatut(body.statut)
  };
}

function normalizeClientIds(raw) {
  const list = Array.isArray(raw) ? raw : [];
  const out = [];
  const seen = new Set();
  for (const item of list) {
    const id = parseId(item?.client_id ?? item?.id ?? item);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push({
      client_id: id,
      role: trimOrNull(item?.role)
    });
  }
  return out;
}

async function attachClients(rows) {
  const list = Array.isArray(rows) ? rows : [];
  if (list.length === 0) return list;
  const ids = list.map(row => row.id).filter(Boolean);
  if (ids.length === 0) return list;
  const { rows: links } = await pool.query(
    `SELECT l.prestataire_id, l.client_id, l.role, c.name AS client_name
     FROM v_b_prestataire_client_links l
     LEFT JOIN v_b_clients c ON c.id = l.client_id
     WHERE l.prestataire_id = ANY($1::int[])
     ORDER BY c.name NULLS LAST, l.client_id`,
    [ids]
  );
  const byPrestataire = new Map();
  for (const link of links) {
    const key = String(link.prestataire_id);
    if (!byPrestataire.has(key)) byPrestataire.set(key, []);
    byPrestataire.get(key).push({
      id: link.client_id,
      client_id: link.client_id,
      name: link.client_name || "",
      role: link.role || null
    });
  }
  return list.map(row => ({
    ...row,
    clients: byPrestataire.get(String(row.id)) || []
  }));
}

async function attachContacts(rows) {
  const list = Array.isArray(rows) ? rows : [];
  if (list.length === 0) return list;
  const ids = list.map(row => row.id).filter(Boolean);
  if (ids.length === 0) return list;
  let contactRows = [];
  try {
    const result = await pool.query(
      `SELECT id, prestataire_id, nom, prenom, email, telephone, sort_order, created_at, updated_at
       FROM v_b_prestataire_contacts
       WHERE prestataire_id = ANY($1::int[])
       ORDER BY sort_order ASC, id ASC`,
      [ids]
    );
    contactRows = result.rows;
  } catch (err) {
    // Table may not exist yet on older DBs mid-migration
    if (err?.code !== "42P01") throw err;
  }
  const byPrestataire = new Map();
  for (const contact of contactRows) {
    const key = String(contact.prestataire_id);
    if (!byPrestataire.has(key)) byPrestataire.set(key, []);
    byPrestataire.get(key).push({
      id: contact.id,
      nom: contact.nom || "",
      prenom: contact.prenom || "",
      email: contact.email || "",
      telephone: contact.telephone || "",
      sort_order: contact.sort_order ?? 0
    });
  }
  return list.map(row => {
    const contacts = byPrestataire.get(String(row.id));
    if (contacts && contacts.length > 0) {
      return { ...row, contacts };
    }
    // Fallback to legacy scalar contact if no rows yet
    const hasLegacy = row.contact_nom || row.contact_prenom || row.email || row.telephone;
    return {
      ...row,
      contacts: hasLegacy
        ? [{
            id: null,
            nom: row.contact_nom || "",
            prenom: row.contact_prenom || "",
            email: row.email || "",
            telephone: row.telephone || "",
            sort_order: 0
          }]
        : []
    };
  });
}

async function enrichRows(rows) {
  return attachContacts(await attachClients(rows));
}

async function replaceLinks(prestataireId, memberships) {
  await pool.query(`DELETE FROM v_b_prestataire_client_links WHERE prestataire_id = $1`, [prestataireId]);
  for (const membership of memberships) {
    await pool.query(
      `INSERT INTO v_b_prestataire_client_links (prestataire_id, client_id, role)
       VALUES ($1, $2, $3)
       ON CONFLICT (prestataire_id, client_id) DO UPDATE SET role = EXCLUDED.role`,
      [prestataireId, membership.client_id, membership.role]
    );
  }
}

async function replaceContacts(prestataireId, contacts) {
  await pool.query(`DELETE FROM v_b_prestataire_contacts WHERE prestataire_id = $1`, [prestataireId]);
  for (let index = 0; index < contacts.length; index += 1) {
    const contact = contacts[index];
    await pool.query(
      `INSERT INTO v_b_prestataire_contacts
        (prestataire_id, nom, prenom, email, telephone, sort_order, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())`,
      [prestataireId, contact.nom, contact.prenom, contact.email, contact.telephone, index]
    );
  }
}

async function logAction(prestataireId, userId, action, details = null) {
  try {
    await pool.query(
      `INSERT INTO v_b_prestataires_logs (prestataire_id, user_id, action, details)
       VALUES ($1, $2, $3, $4)`,
      [prestataireId, userId || null, action, details ? JSON.stringify(details) : null]
    );
  } catch {
    // ignore log failures
  }
}

async function loadById(prestataireId) {
  const { rows } = await pool.query(
    `SELECT id, nom, type, contact_nom, contact_prenom, email, telephone, site_web, adresse, notes, statut, created_at, updated_at
     FROM v_b_prestataires
     WHERE id = $1`,
    [prestataireId]
  );
  if (!rows[0]) return null;
  const [enriched] = await enrichRows(rows);
  return enriched;
}

router.use(async (_req, _res, next) => {
  try {
    await ensurePrestatairesSchema();
  } catch {
    // continue; queries will fail clearly if schema missing
  }
  next();
});

router.get("/list", requirePermission("prestataires.view"), async (req, res) => {
  const clientId = parseId(req.query?.client_id);
  try {
    let result;
    if (clientId) {
      result = await pool.query(
        `SELECT p.id, p.nom, p.type, p.contact_nom, p.contact_prenom, p.email, p.telephone, p.site_web, p.adresse, p.notes, p.statut, p.created_at, p.updated_at
         FROM v_b_prestataires p
         INNER JOIN v_b_prestataire_client_links l ON l.prestataire_id = p.id
         WHERE l.client_id = $1
         ORDER BY p.nom NULLS LAST, p.id`,
        [clientId]
      );
    } else {
      result = await pool.query(
        `SELECT id, nom, type, contact_nom, contact_prenom, email, telephone, site_web, adresse, notes, statut, created_at, updated_at
         FROM v_b_prestataires
         ORDER BY nom NULLS LAST, id`
      );
    }
    res.set("Cache-Control", "no-store");
    return res.json(await enrichRows(result.rows));
  } catch (err) {
    return res.status(500).json({
      error: "Error retrieving providers",
      details: err.message
    });
  }
});

router.get("/", requirePermission("prestataires.view"), async (req, res) => {
  const clientId = parseId(req.query?.client_id);
  try {
    let result;
    if (clientId) {
      result = await pool.query(
        `SELECT p.id, p.nom, p.type, p.contact_nom, p.contact_prenom, p.email, p.telephone, p.site_web, p.adresse, p.notes, p.statut, p.created_at, p.updated_at
         FROM v_b_prestataires p
         INNER JOIN v_b_prestataire_client_links l ON l.prestataire_id = p.id
         WHERE l.client_id = $1
         ORDER BY p.nom NULLS LAST, p.id`,
        [clientId]
      );
    } else {
      result = await pool.query(
        `SELECT id, nom, type, contact_nom, contact_prenom, email, telephone, site_web, adresse, notes, statut, created_at, updated_at
         FROM v_b_prestataires
         ORDER BY nom NULLS LAST, id`
      );
    }
    return res.json(await enrichRows(result.rows));
  } catch (err) {
    return res.status(500).json({
      error: "Error retrieving providers",
      details: err.message
    });
  }
});

router.get("/:id", requirePermission("prestataires.view"), async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: "Invalid provider id" });
  try {
    const row = await loadById(id);
    if (!row) return res.status(404).json({ error: "Provider not found" });
    return res.json(row);
  } catch (err) {
    return res.status(500).json({
      error: "Error retrieving provider",
      details: err.message
    });
  }
});

router.post("/", requirePermission("prestataires.create"), async (req, res) => {
  const hasContacts = Object.prototype.hasOwnProperty.call(req.body || {}, "contacts");
  const contacts = hasContacts
    ? normalizeContacts(req.body?.contacts)
    : normalizeContacts([{
        nom: req.body?.contact_nom,
        prenom: req.body?.contact_prenom,
        email: req.body?.email,
        telephone: req.body?.telephone
      }]);
  const payload = sanitizePayload(req.body || {}, { contacts });
  if (!payload.nom) {
    return res.status(400).json({ error: "Provider name is required" });
  }
  const memberships = normalizeClientIds(req.body?.memberships || req.body?.client_ids || []);
  try {
    const { rows } = await pool.query(
      `INSERT INTO v_b_prestataires
        (nom, type, contact_nom, contact_prenom, email, telephone, site_web, adresse, notes, statut, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
       RETURNING id, nom, type, contact_nom, contact_prenom, email, telephone, site_web, adresse, notes, statut, created_at, updated_at`,
      [
        payload.nom,
        payload.type,
        payload.contact_nom,
        payload.contact_prenom,
        payload.email,
        payload.telephone,
        payload.site_web,
        payload.adresse,
        payload.notes,
        payload.statut
      ]
    );
    const created = rows[0];
    if (memberships.length) await replaceLinks(created.id, memberships);
    await replaceContacts(created.id, contacts);
    await logAction(created.id, req.user?.id, "create", { nom: created.nom });
    return res.status(201).json(await loadById(created.id));
  } catch (err) {
    return res.status(500).json({
      error: "Error creating provider",
      details: err.message
    });
  }
});

router.put("/:id", requirePermission("prestataires_detail.edit"), async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: "Invalid provider id" });
  const current = await loadById(id);
  if (!current) return res.status(404).json({ error: "Provider not found" });
  const hasContacts = Object.prototype.hasOwnProperty.call(req.body || {}, "contacts");
  const contacts = hasContacts
    ? normalizeContacts(req.body?.contacts)
    : normalizeContacts(current.contacts);
  const payload = sanitizePayload({
    ...current,
    ...(req.body || {})
  }, { contacts });
  if (!payload.nom) {
    return res.status(400).json({ error: "Provider name is required" });
  }
  const hasMemberships = Object.prototype.hasOwnProperty.call(req.body || {}, "memberships")
    || Object.prototype.hasOwnProperty.call(req.body || {}, "client_ids");
  const memberships = hasMemberships
    ? normalizeClientIds(req.body?.memberships || req.body?.client_ids || [])
    : null;
  try {
    await pool.query(
      `UPDATE v_b_prestataires
       SET nom = $1, type = $2, contact_nom = $3, contact_prenom = $4, email = $5, telephone = $6,
           site_web = $7, adresse = $8, notes = $9, statut = $10, updated_at = NOW()
       WHERE id = $11`,
      [
        payload.nom,
        payload.type,
        payload.contact_nom,
        payload.contact_prenom,
        payload.email,
        payload.telephone,
        payload.site_web,
        payload.adresse,
        payload.notes,
        payload.statut,
        id
      ]
    );
    if (memberships) await replaceLinks(id, memberships);
    if (hasContacts) await replaceContacts(id, contacts);
    await logAction(id, req.user?.id, "update", { nom: payload.nom });
    return res.json(await loadById(id));
  } catch (err) {
    return res.status(500).json({
      error: "Error updating provider",
      details: err.message
    });
  }
});

router.delete("/:id", requirePermission("prestataires_detail.delete"), async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: "Invalid provider id" });
  try {
    const { rowCount } = await pool.query(`DELETE FROM v_b_prestataires WHERE id = $1`, [id]);
    if (!rowCount) return res.status(404).json({ error: "Provider not found" });
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({
      error: "Error deleting provider",
      details: err.message
    });
  }
});

router.post("/:id/memberships", requirePermission("prestataires_detail.edit"), async (req, res) => {
  const id = parseId(req.params.id);
  const clientId = parseId(req.body?.client_id);
  if (!id || !clientId) return res.status(400).json({ error: "Provider id and client_id are required" });
  try {
    const current = await loadById(id);
    if (!current) return res.status(404).json({ error: "Provider not found" });
    await pool.query(
      `INSERT INTO v_b_prestataire_client_links (prestataire_id, client_id, role)
       VALUES ($1, $2, $3)
       ON CONFLICT (prestataire_id, client_id) DO UPDATE SET role = COALESCE(EXCLUDED.role, v_b_prestataire_client_links.role)`,
      [id, clientId, trimOrNull(req.body?.role)]
    );
    await logAction(id, req.user?.id, "link_client", { client_id: clientId });
    return res.json(await loadById(id));
  } catch (err) {
    return res.status(500).json({
      error: "Error linking company",
      details: err.message
    });
  }
});

router.delete("/:id/memberships/:clientId", requirePermission("prestataires_detail.edit"), async (req, res) => {
  const id = parseId(req.params.id);
  const clientId = parseId(req.params.clientId);
  if (!id || !clientId) return res.status(400).json({ error: "Invalid ids" });
  try {
    await pool.query(
      `DELETE FROM v_b_prestataire_client_links WHERE prestataire_id = $1 AND client_id = $2`,
      [id, clientId]
    );
    await logAction(id, req.user?.id, "unlink_client", { client_id: clientId });
    return res.json(await loadById(id));
  } catch (err) {
    return res.status(500).json({
      error: "Error unlinking company",
      details: err.message
    });
  }
});

export default router;
