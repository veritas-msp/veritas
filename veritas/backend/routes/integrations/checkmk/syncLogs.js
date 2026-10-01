import express from "express";
import verifyJWT from "../../../middleware/auth.js";
import {
  listCheckmkSyncRuns,
  getCheckmkSyncRun,
  getLatestRunningCheckmkSyncRun
} from "../../../utils/checkmkSyncRuns.js";
import {
  beginCheckmkFleetSync,
  runCheckmkFleetSync,
  cancelCheckmkFleetSync,
  isCheckmkFleetSyncRunning
} from "../../../services/checkmkFleetSync.js";

const router = express.Router();

function resolveStarterLabel(req) {
  const fromBody = String(req.body?.startedBy || "").trim();
  if (fromBody) return fromBody.slice(0, 80);
  const email = String(req.user?.email || "").trim();
  return email ? email.slice(0, 80) : null;
}

router.get("/sync-logs", verifyJWT, async (req, res) => {
  try {
    const limit = Number(req.query.limit) || 40;
    const runs = await listCheckmkSyncRuns({ limit });
    res.json({
      success: true,
      runs,
      running: isCheckmkFleetSyncRunning()
    });
  } catch (err) {
    console.error("[checkmk sync-logs] GET:", err.message);
    res.status(500).json({
      error: err.message || "Server error"
    });
  }
});

router.get("/sync-logs/active", verifyJWT, async (req, res) => {
  try {
    const run = await getLatestRunningCheckmkSyncRun();
    res.json({
      success: true,
      run,
      running: Boolean(run) || isCheckmkFleetSyncRunning()
    });
  } catch (err) {
    console.error("[checkmk sync-logs] GET active:", err.message);
    res.status(500).json({
      error: err.message || "Server error"
    });
  }
});

router.get("/sync-logs/:id", verifyJWT, async (req, res) => {
  try {
    const run = await getCheckmkSyncRun(req.params.id);
    if (!run) {
      return res.status(404).json({
        error: "Sync run not found"
      });
    }
    res.json({
      success: true,
      run
    });
  } catch (err) {
    console.error("[checkmk sync-logs] GET id:", err.message);
    res.status(500).json({
      error: err.message || "Server error"
    });
  }
});

router.post("/sync-logs/run", verifyJWT, async (req, res) => {
  try {
    const force = req.body?.force === true;
    const wait = req.body?.wait === true;
    const startedBy = resolveStarterLabel(req);
    const startedByUserId = req.user?.id || null;
    if (wait) {
      const result = await runCheckmkFleetSync({
        trigger: "manual",
        force,
        startedBy,
        startedByUserId
      });
      return res.json({
        success: true,
        ...result
      });
    }
    const result = await beginCheckmkFleetSync({
      trigger: "manual",
      force,
      startedBy,
      startedByUserId
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

router.post("/sync-logs/:id/cancel", verifyJWT, async (req, res) => {
  try {
    const cancelledBy = resolveStarterLabel(req) || String(req.body?.cancelledBy || "").trim().slice(0, 80) || null;
    const result = await cancelCheckmkFleetSync(req.params.id, { cancelledBy });
    if (result?.reason === "not_found") {
      return res.status(404).json({
        error: "Sync run not found"
      });
    }
    if (result?.reason === "missing_id") {
      return res.status(400).json({
        error: "Missing sync run id"
      });
    }
    res.json({
      success: true,
      ...result
    });
  } catch (err) {
    console.error("[checkmk sync-logs] POST cancel:", err.message);
    res.status(500).json({
      error: err.message || "Server error"
    });
  }
});

export default router;
