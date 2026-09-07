import crypto from "crypto";
import express from "express";
import { body, param, validationResult } from "express-validator";
import { pool } from "../database/db.js";
import { publicKnowledgeRateLimit } from "../middleware/rateLimit.js";
import { normalizeVisibilityRules } from "../services/salesFormConditions.js";
import { applyFormTicketTargets, normalizeTicketTargetsConfig, parseTicketTargetsFromRow, resolveMatchingRules } from "../services/salesFormTicketTargets.js";

const router = express.Router();
router.use(publicKnowledgeRateLimit);

const SLUG = param("slug").isString().isLength({ min: 2, max: 120 }).matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/i);

function validationErrorOrNull(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({
      error: errors.array()[0]?.msg || "Invalid data",
      details: errors.array()
    });
    return true;
  }
  return false;
}

function mapPublicField(row) {
  if (!row || row.enabled === false) return null;
  if (String(row.field_type || "") === "file") return null;
  let options = row.options;
  if (typeof options === "string") {
    try {
      options = JSON.parse(options);
    } catch {
      options = [];
    }
  }
  let visibilityRules = row.visibility_rules;
  if (typeof visibilityRules === "string") {
    try {
      visibilityRules = JSON.parse(visibilityRules);
    } catch {
      visibilityRules = {};
    }
  }
  return {
    id: row.id,
    fieldKey: row.field_key,
    label: row.label,
    fieldType: row.field_type,
    required: row.required === true,
    placeholder: row.placeholder || "",
    options: Array.isArray(options) ? options : [],
    visibilityRules: normalizeVisibilityRules(visibilityRules),
    displayOrder: Number(row.display_order || 0)
  };
}

async function loadPublicFormBySlug(slug) {
  const formResult = await pool.query(
    `SELECT *
       FROM v_b_support_form_definitions
      WHERE public_enabled = TRUE
        AND enabled = TRUE
        AND lower(public_slug) = lower($1)
      LIMIT 1`,
    [String(slug || "").trim()]
  );
  if (!formResult.rows[0]) return null;
  const form = formResult.rows[0];
  const fieldsResult = await pool.query(
    `SELECT *
       FROM v_b_support_form_fields
      WHERE form_id = $1
        AND enabled = TRUE
      ORDER BY display_order ASC, id ASC`,
    [form.id]
  );
  return {
    id: form.id,
    kind: form.kind,
    key: form.form_key,
    label: form.label,
    icon: form.icon,
    categorySlug: form.category_slug,
    description: form.description || "",
    publicSlug: form.public_slug,
    ticketTargets: parseTicketTargetsFromRow(form),
    fields: (fieldsResult.rows || []).map(mapPublicField).filter(Boolean),
    allowAttachments: false
  };
}

function hashAnswer(answer) {
  return crypto.createHash("sha256").update(String(answer || "").trim().toLowerCase()).digest("hex");
}

async function createTicketFromPublicForm({ form, values, displayValues, fieldLabels, meta }) {
  const title = String(meta.title || "").trim() || form.label;
  const description = String(meta.description || "").trim() || `Soumission publique · ${form.label}`;
  const formFieldValues = values && typeof values === "object" ? values : {};
  const targetsConfig = normalizeTicketTargetsConfig(form.ticketTargets);
  const matchedRules = resolveMatchingRules(targetsConfig, formFieldValues);
  const rulesToApply = matchedRules.length > 0 ? matchedRules : [{
    id: "default",
    label: "Default",
    targets: {
      priority: "medium",
      type: form.kind,
      categorySlug: form.categorySlug
    }
  }];

  const createdTickets = [];
  for (const rule of rulesToApply) {
    const ticketType = String(rule.targets?.type || form.kind || "demande").trim() || "demande";
    const ticketCategory = String(rule.targets?.categorySlug || form.categorySlug || "").trim();
    const ticketPriority = String(rule.targets?.priority || "medium").trim() || "medium";
    const supportFormData = {
      formId: form.id,
      formKey: form.key,
      formLabel: form.label,
      kind: form.kind,
      categorySlug: form.categorySlug,
      publicSubmission: true,
      submitterName: meta.name || "",
      submitterEmail: meta.email || "",
      submitterPhone: meta.phone || "",
      values: formFieldValues,
      displayValues: displayValues && typeof displayValues === "object" ? displayValues : {},
      fieldLabels: fieldLabels && typeof fieldLabels === "object" ? fieldLabels : {},
      targetRuleId: rule.id || null,
      targetRuleLabel: rule.label || null
    };

    const columns = ["title", "description", "status", "priority", "type", "category", "channel", "created_at", "updated_at"];
    const valuesSql = ["$1", "$2", "'open'", "$3", "$4", "$5", "'web'", "NOW()", "NOW()"];
    const params = [title, description, ticketPriority, ticketType, ticketCategory];
    let p = 6;

    const hasSupportFormData = await pool.query(
      `SELECT 1
         FROM information_schema.columns
        WHERE table_name = 'v_b_tickets' AND column_name = 'support_form_data'
        LIMIT 1`
    );
    if (hasSupportFormData.rows.length) {
      columns.push("support_form_data");
      valuesSql.push(`$${p++}::jsonb`);
      params.push(JSON.stringify(supportFormData));
    }

    const insert = await pool.query(
      `INSERT INTO v_b_tickets (${columns.join(", ")})
       VALUES (${valuesSql.join(", ")})
       RETURNING id, ticket_number, title, type, category, priority, status, created_at`,
      params
    );
    const ticket = insert.rows[0];
    try {
      await applyFormTicketTargets(ticket.id, rule.targets || {});
    } catch (err) {
      console.warn("Public support form targets apply failed:", err.message);
    }
    createdTickets.push(ticket);
  }
  return createdTickets;
}

router.get("/:slug", [SLUG], async (req, res) => {
  if (validationErrorOrNull(req, res)) return;
  try {
    const form = await loadPublicFormBySlug(req.params.slug);
    if (!form) return res.status(404).json({ error: "Form not found" });
    res.setHeader("Cache-Control", "public, max-age=30");
    return res.json({ form });
  } catch (err) {
    console.error("[GET /public/support-forms/:slug]", err);
    return res.status(500).json({ error: "Error loading form" });
  }
});

router.get("/:slug/captcha", [SLUG], async (req, res) => {
  if (validationErrorOrNull(req, res)) return;
  try {
    const form = await loadPublicFormBySlug(req.params.slug);
    if (!form) return res.status(404).json({ error: "Form not found" });

    await pool.query(`DELETE FROM v_b_support_form_captcha_challenges WHERE expires_at < NOW()`);

    const a = Math.floor(Math.random() * 8) + 2;
    const b = Math.floor(Math.random() * 8) + 1;
    const answer = String(a + b);
    const challengeId = crypto.randomBytes(16).toString("hex");
    await pool.query(
      `INSERT INTO v_b_support_form_captcha_challenges (id, form_id, answer_hash, expires_at)
       VALUES ($1, $2, $3, NOW() + INTERVAL '10 minutes')`,
      [challengeId, form.id, hashAnswer(answer)]
    );
    return res.json({
      challengeId,
      question: `${a} + ${b} = ?`,
      expiresInSec: 600
    });
  } catch (err) {
    console.error("[GET /public/support-forms/:slug/captcha]", err);
    return res.status(500).json({ error: "Error creating captcha" });
  }
});

router.post(
  "/:slug/submit",
  [
    SLUG,
    body("captchaChallengeId").isString().notEmpty(),
    body("captchaAnswer").isString().notEmpty(),
    body("title").optional().isString(),
    body("description").optional().isString(),
    body("name").optional().isString(),
    body("email").optional().isEmail(),
    body("phone").optional().isString(),
    body("values").optional().isObject(),
    body("displayValues").optional().isObject(),
    body("fieldLabels").optional().isObject()
  ],
  async (req, res) => {
    if (validationErrorOrNull(req, res)) return;
    try {
      const form = await loadPublicFormBySlug(req.params.slug);
      if (!form) return res.status(404).json({ error: "Form not found" });

      const challengeId = String(req.body.captchaChallengeId || "").trim();
      const captchaAnswer = String(req.body.captchaAnswer || "").trim();
      const challenge = await pool.query(
        `SELECT *
           FROM v_b_support_form_captcha_challenges
          WHERE id = $1
            AND form_id = $2
            AND expires_at >= NOW()
          LIMIT 1`,
        [challengeId, form.id]
      );
      if (!challenge.rows[0] || challenge.rows[0].answer_hash !== hashAnswer(captchaAnswer)) {
        return res.status(400).json({ error: "Captcha invalid or expired" });
      }
      await pool.query(`DELETE FROM v_b_support_form_captcha_challenges WHERE id = $1`, [challengeId]);

      const values = req.body.values && typeof req.body.values === "object" ? req.body.values : {};
      // Strip any file-like payloads for safety
      Object.keys(values).forEach(key => {
        const field = form.fields.find(f => f.fieldKey === key);
        if (!field || field.fieldType === "file") delete values[key];
      });

      const tickets = await createTicketFromPublicForm({
        form,
        values,
        displayValues: req.body.displayValues,
        fieldLabels: req.body.fieldLabels,
        meta: {
          title: req.body.title,
          description: req.body.description,
          name: req.body.name,
          email: req.body.email,
          phone: req.body.phone
        }
      });

      return res.status(201).json({
        success: true,
        ticketCount: tickets.length,
        tickets: tickets.map(t => ({
          id: t.id,
          ticketNumber: t.ticket_number,
          title: t.title
        }))
      });
    } catch (err) {
      console.error("[POST /public/support-forms/:slug/submit]", err);
      return res.status(500).json({ error: "Error submitting form" });
    }
  }
);

export default router;
