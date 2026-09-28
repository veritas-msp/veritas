import express from "express";
import verifyJWT from "../../../middleware/auth.js";
import { listCheckmkSyncRuns } from "../../../utils/checkmkSyncRuns.js";
import { runCheckmkFleetSync } from "../../../services/checkmkFleetSync.js";

const router = express.Router();

router.get("/sync-logs", verifyJWT, async (req, res) => {
  try {
    const limit = Number(req.query.limit) || 40;
    const runs = await listCheckmkSyncRuns({ limit });
    res.json({
      success: true,
      runs
    });
  } catch (err) {
    console.error("[checkmk sync-logs] GET:", err.message);
    res.status(500).json({
      error: err.message || "Server error"
    });
  }
});

router.post("/sync-logs/run", verifyJWT, async (req, res) => {
  try {
    const force = req.body?.force === true;
    const result = await runCheckmkFleetSync({
      trigger: "manual",
      force
    });
    res.json({
      success: true,
      ...result
    });
  } catch (err) {
    console.error("[checkmk sync-logs] POST run:", err.message);
    res.status(500).json({
      error: err.message || "Server error"
    });
  }
});

export default router;
