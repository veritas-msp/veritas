import express from "express";
import verifyJWT from "../../middleware/auth.js";
import { requireAnyPermission } from "../../middleware/permissions.js";
import {
  addSupervisionAlertStreamClient,
  getSupervisionAlertEvents,
  listActiveSupervisionAlerts,
  listRecentEquipmentAlerts,
  listSupervisionAlertHistory,
  listSupervisionAlertsByQueueItemIds,
  removeSupervisionAlertStreamClient,
  upsertAndActOnSupervisionAlert
} from "../../utils/supervisionAlerts.js";

const router = express.Router();

function payloadFromBody(body = {}) {
  return {
    queueItemId: body.queueItemId || body.queue_item_id,
    domain: body.domain,
    severity: body.severity,
    clientId: body.clientId ?? body.client_id ?? null,
    equipmentId: body.equipmentId ?? body.equipment_id ?? null,
    refKey: body.refKey ?? body.ref_key ?? null,
    title: body.title,
    subtitle: body.subtitle,
    label: body.label,
    meta: body.meta || {},
    note: body.note || null,
    linkedTicketId: body.linkedTicketId ?? body.linked_ticket_id ?? null,
    linkedTicketKind: body.linkedTicketKind ?? body.linked_ticket_kind ?? null,
    linkedEventId: body.linkedEventId ?? body.linked_event_id ?? null,
    closedReason: body.closedReason ?? body.closed_reason ?? null
  };
}

router.get("/active", verifyJWT, requireAnyPermission("supervision.view", "supervision.manage"), async (_req, res) => {
  try {
    const alerts = await listActiveSupervisionAlerts();
    res.json({ alerts });
  } catch (err) {
    console.error("[supervision-alerts] GET /active:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/states", verifyJWT, requireAnyPermission("supervision.view", "supervision.manage"), async (req, res) => {
  try {
    const raw = req.query.ids || req.query.queueItemIds || "";
    const ids = String(raw)
      .split(",")
      .map(s => s.trim())
      .filter(Boolean);
    const alerts = await listSupervisionAlertsByQueueItemIds(ids);
    res.json({ alerts });
  } catch (err) {
    console.error("[supervision-alerts] GET /states:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/history", verifyJWT, requireAnyPermission("supervision.view", "supervision.manage"), async (req, res) => {
  try {
    const alerts = await listSupervisionAlertHistory({
      limit: req.query.limit,
      offset: req.query.offset,
      domain: req.query.domain || null,
      status: req.query.status || null,
      query: req.query.q || req.query.query || null,
      equipmentId: req.query.equipmentId || req.query.equipment_id || null,
      clientId: req.query.clientId || req.query.client_id || null
    });
    res.json({ alerts });
  } catch (err) {
    console.error("[supervision-alerts] GET /history:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

router.get(
  "/equipment/:equipmentId",
  verifyJWT,
  requireAnyPermission("supervision.view", "supervision.manage", "infrastructure.view"),
  async (req, res) => {
    try {
      const alerts = await listRecentEquipmentAlerts({
        equipmentId: req.params.equipmentId,
        clientId: req.query.clientId || req.query.client_id || null,
        limit: req.query.limit || 10
      });
      res.json({ alerts });
    } catch (err) {
      console.error("[supervision-alerts] GET /equipment/:id:", err.message);
      res.status(500).json({ error: "Server error" });
    }
  }
);

router.get("/stream", verifyJWT, requireAnyPermission("supervision.view", "supervision.manage"), async (req, res) => {
  try {
    res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders?.();
    res.write(`data: ${JSON.stringify({ type: "connected" })}\n\n`);
    addSupervisionAlertStreamClient(res);
    const heartbeat = setInterval(() => {
      try {
        res.write(`data: ${JSON.stringify({
          type: "heartbeat",
          at: new Date().toISOString()
        })}\n\n`);
      } catch {
        clearInterval(heartbeat);
        removeSupervisionAlertStreamClient(res);
      }
    }, 25000);
    req.on("close", () => {
      clearInterval(heartbeat);
      removeSupervisionAlertStreamClient(res);
    });
  } catch (err) {
    console.error("[supervision-alerts] GET /stream:", err.message);
    if (!res.headersSent) {
      res.status(500).json({ error: "Realtime stream unavailable." });
    }
  }
});

router.get("/:alertId/events", verifyJWT, requireAnyPermission("supervision.view", "supervision.manage"), async (req, res) => {
  try {
    const events = await getSupervisionAlertEvents(req.params.alertId);
    res.json({ events });
  } catch (err) {
    console.error("[supervision-alerts] GET /:id/events:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

async function handleAction(req, res, action) {
  try {
    const fromBody = payloadFromBody(req.body);
    const queueItemId = req.params.queueItemId || fromBody.queueItemId;
    if (!queueItemId) {
      return res.status(400).json({ error: "queueItemId required" });
    }
    if (!fromBody.domain && action !== "reopen" && action !== "unack" && action !== "note") {
      // domain required on first upsert; reopen/unack need existing row
    }
    const result = await upsertAndActOnSupervisionAlert({
      ...fromBody,
      queueItemId,
      action,
      actorUserId: req.user?.id || null
    });
    res.json(result);
  } catch (err) {
    console.error(`[supervision-alerts] POST ${action}:`, err.message);
    const status = /required|Unknown action|Cannot /.test(err.message) ? 400 : 500;
    res.status(status).json({ error: err.message || "Server error" });
  }
}

router.post("/:queueItemId/ack", verifyJWT, requireAnyPermission("supervision.manage", "supervision.view"), (req, res) =>
  handleAction(req, res, "ack")
);
router.post("/:queueItemId/unack", verifyJWT, requireAnyPermission("supervision.manage", "supervision.view"), (req, res) =>
  handleAction(req, res, "unack")
);
router.post("/:queueItemId/link", verifyJWT, requireAnyPermission("supervision.manage", "supervision.view"), (req, res) =>
  handleAction(req, res, "link")
);
router.post("/:queueItemId/resolve", verifyJWT, requireAnyPermission("supervision.manage", "supervision.view"), (req, res) =>
  handleAction(req, res, "resolve")
);
router.post("/:queueItemId/dismiss", verifyJWT, requireAnyPermission("supervision.manage", "supervision.view"), (req, res) =>
  handleAction(req, res, "dismiss")
);
router.post("/:queueItemId/reopen", verifyJWT, requireAnyPermission("supervision.manage", "supervision.view"), (req, res) =>
  handleAction(req, res, "reopen")
);

export default router;
