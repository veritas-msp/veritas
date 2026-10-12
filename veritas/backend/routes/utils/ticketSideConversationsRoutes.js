import express from "express";
import { body, param, validationResult } from "express-validator";
import verifyJWT from "../../middleware/auth.js";
import { requireAnyPermission } from "../../middleware/permissions.js";
import {
  createSideConversation,
  getSideConversation,
  listSideConversations,
  replySideConversation,
  updateSideConversationStatus,
  RECIPIENT_TYPES
} from "../../services/ticketSideConversations.js";
import { ensureTicketSideConversationsSchema } from "../../services/ensureTicketSideConversationsSchema.js";

const router = express.Router({ mergeParams: true });

function handleValidation(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ error: "Validation failed", errors: errors.array() });
    return false;
  }
  return true;
}

router.use(verifyJWT);
router.use(async (_req, _res, next) => {
  try {
    await ensureTicketSideConversationsSchema();
  } catch {
    // continue
  }
  next();
});

const viewPerm = requireAnyPermission("tickets.view", "sales.view", "tickets_detail.public_reply", "sales_detail.public_reply");
const writePerm = requireAnyPermission(
  "tickets.edit",
  "sales.edit",
  "tickets_detail.public_reply",
  "sales_detail.public_reply",
  "tickets_detail.edit_messages",
  "sales_detail.edit_messages"
);

router.get(
  "/",
  viewPerm,
  [param("id").isUUID()],
  async (req, res) => {
    if (!handleValidation(req, res)) return;
    try {
      const conversations = await listSideConversations(req.params.id);
      return res.json({ conversations });
    } catch (err) {
      return res.status(500).json({ error: err.message || "Unable to list side conversations" });
    }
  }
);

router.get(
  "/:sideConversationId",
  viewPerm,
  [param("id").isUUID(), param("sideConversationId").isUUID()],
  async (req, res) => {
    if (!handleValidation(req, res)) return;
    try {
      const conversation = await getSideConversation(req.params.id, req.params.sideConversationId);
      if (!conversation) return res.status(404).json({ error: "Side conversation not found" });
      return res.json({ conversation });
    } catch (err) {
      return res.status(500).json({ error: err.message || "Unable to load side conversation" });
    }
  }
);

router.post(
  "/",
  writePerm,
  [
    param("id").isUUID(),
    body("subject").optional({ nullable: true }).isString(),
    body("body").isString().notEmpty(),
    body("recipientType").optional().isString(),
    body("recipientRefId").optional({ nullable: true }),
    body("to").optional({ nullable: true }),
    body("cc").optional({ nullable: true })
  ],
  async (req, res) => {
    if (!handleValidation(req, res)) return;
    try {
      const recipientType = String(req.body.recipientType || "email").toLowerCase();
      if (!RECIPIENT_TYPES.has(recipientType)) {
        return res.status(400).json({ error: "Invalid recipientType" });
      }
      const result = await createSideConversation({
        ticketId: req.params.id,
        subject: req.body.subject,
        body: req.body.body,
        recipientType,
        recipientRefId: req.body.recipientRefId ?? null,
        to: req.body.to,
        cc: req.body.cc,
        authorUserId: req.user?.id || null
      });
      return res.status(201).json(result);
    } catch (err) {
      return res.status(400).json({ error: err.message || "Unable to create side conversation" });
    }
  }
);

router.post(
  "/:sideConversationId/messages",
  writePerm,
  [
    param("id").isUUID(),
    param("sideConversationId").isUUID(),
    body("body").isString().notEmpty()
  ],
  async (req, res) => {
    if (!handleValidation(req, res)) return;
    try {
      const result = await replySideConversation({
        ticketId: req.params.id,
        sideConversationId: req.params.sideConversationId,
        body: req.body.body,
        authorUserId: req.user?.id || null
      });
      return res.status(201).json(result);
    } catch (err) {
      return res.status(400).json({ error: err.message || "Unable to send reply" });
    }
  }
);

router.patch(
  "/:sideConversationId",
  writePerm,
  [
    param("id").isUUID(),
    param("sideConversationId").isUUID(),
    body("status").isIn(["open", "done"])
  ],
  async (req, res) => {
    if (!handleValidation(req, res)) return;
    try {
      const conversation = await updateSideConversationStatus({
        ticketId: req.params.id,
        sideConversationId: req.params.sideConversationId,
        status: req.body.status
      });
      return res.json({ conversation });
    } catch (err) {
      return res.status(400).json({ error: err.message || "Unable to update side conversation" });
    }
  }
);

export default router;
