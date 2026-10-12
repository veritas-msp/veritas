import express from "express";
import verifyJWT from "../../middleware/auth.js";
import { requireAnyPermission } from "../../middleware/permissions.js";
import {
  captureParkSnapshots,
  getParkAvailabilityTrend,
  listParkSnapshots,
  upsertParkSnapshot
} from "../../utils/supervisionParkSnapshots.js";

const router = express.Router();

router.get(
  "/",
  verifyJWT,
  requireAnyPermission("supervision.view", "supervision.manage", "infrastructure.view"),
  async (req, res) => {
    try {
      const clientId = req.query.clientId ?? req.query.client_id ?? null;
      const weeks = req.query.weeks || 12;
      const snapshots = await listParkSnapshots({ clientId, weeks });
      res.json({ snapshots });
    } catch (err) {
      console.error("[park-snapshots] GET /:", err.message);
      res.status(500).json({ error: err.message || "Server error" });
    }
  }
);

router.get(
  "/trend",
  verifyJWT,
  requireAnyPermission("supervision.view", "supervision.manage", "infrastructure.view"),
  async (req, res) => {
    try {
      const clientId = req.query.clientId ?? req.query.client_id ?? null;
      const trend = await getParkAvailabilityTrend({ clientId });
      res.json(trend);
    } catch (err) {
      console.error("[park-snapshots] GET /trend:", err.message);
      res.status(500).json({ error: err.message || "Server error" });
    }
  }
);

router.post(
  "/capture",
  verifyJWT,
  requireAnyPermission("supervision.manage", "supervision.view"),
  async (req, res) => {
    try {
      const clientId = req.body?.clientId ?? req.body?.client_id ?? null;
      const includeClients = Boolean(req.body?.includeClients);
      if (clientId != null && clientId !== "") {
        const snapshot = await upsertParkSnapshot({
          clientId,
          source: "manual"
        });
        return res.json({ snapshot });
      }
      const result = await captureParkSnapshots({
        includeClients,
        source: "manual"
      });
      res.json(result);
    } catch (err) {
      console.error("[park-snapshots] POST /capture:", err.message);
      res.status(500).json({ error: err.message || "Server error" });
    }
  }
);

export default router;
