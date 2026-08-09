import express from "express";
import verifyJWT from "../../middleware/auth.js";
import { isSuperAdminPresetProfile } from "../../config/permissionPresets.js";
import {
  createDatabaseBackup,
  getHostnameInfo,
  getUpdateJob,
  getUpdateStatus,
  runPrecheck,
  startUpdateApply
} from "../../services/platformUpdateService.js";

const router = express.Router();

function requireSuperAdmin(req, res, next) {
  if (!isSuperAdminPresetProfile(req.user?.profile)) {
    return res.status(403).json({
      error: "Only Super Admin can manage platform updates.",
      code: "SUPER_ADMIN_REQUIRED"
    });
  }
  return next();
}

router.use(verifyJWT, requireSuperAdmin);

router.get("/status", async (req, res) => {
  try {
    const force = String(req.query.force || "") === "1" || String(req.query.force || "").toLowerCase() === "true";
    const status = await getUpdateStatus({ forceCheck: force });
    res.json({
      ...status,
      host: getHostnameInfo()
    });
  } catch (err) {
    console.error("[updates/status]", err);
    res.status(500).json({
      error: "Unable to load update status",
      details: process.env.NODE_ENV !== "production" ? err.message : undefined
    });
  }
});

router.post("/check", async (req, res) => {
  try {
    const status = await getUpdateStatus({ forceCheck: true });
    res.json({
      ...status,
      host: getHostnameInfo()
    });
  } catch (err) {
    console.error("[updates/check]", err);
    res.status(502).json({
      error: err.message || "GitHub check failed",
      code: "GITHUB_CHECK_FAILED"
    });
  }
});

router.post("/precheck", async (req, res) => {
  try {
    const precheck = await runPrecheck();
    res.json(precheck);
  } catch (err) {
    console.error("[updates/precheck]", err);
    res.status(500).json({
      error: "Precheck failed",
      details: err.message
    });
  }
});

router.post("/backup", async (req, res) => {
  try {
    const backup = await createDatabaseBackup();
    res.json({
      success: true,
      backup: {
        fileName: backup.fileName,
        sizeBytes: backup.sizeBytes,
        createdAt: backup.createdAt,
        method: backup.method || null
      }
    });
  } catch (err) {
    console.error("[updates/backup]", err);
    res.status(500).json({
      error: err.message || "Backup failed",
      code: "BACKUP_FAILED"
    });
  }
});

router.post("/apply", async (req, res) => {
  try {
    const targetTag = req.body?.targetTag || req.body?.tag || req.body?.version || null;
    const skipBackup = Boolean(req.body?.skipBackup);
    const acknowledgeManualBackup = Boolean(req.body?.acknowledgeManualBackup);
    const job = await startUpdateApply({
      targetTag,
      skipBackup,
      acknowledgeManualBackup
    });
    res.status(202).json({
      success: true,
      job
    });
  } catch (err) {
    console.error("[updates/apply]", err);
    const status =
      err.code === "UPDATE_JOB_LOCKED"
        ? 409
        : err.code === "PRECHECK_FAILED" || err.code === "BACKUP_REQUIRED" || err.code === "NOT_NEWER"
          ? 400
          : err.code === "APPLY_UNAVAILABLE"
            ? 503
            : 500;
    res.status(status).json({
      error: err.message || "Unable to start update",
      code: err.code || "APPLY_FAILED",
      precheck: err.precheck
    });
  }
});

router.get("/job/:id", async (req, res) => {
  try {
    const job = getUpdateJob(req.params.id);
    if (!job) {
      return res.status(404).json({
        error: "Update job not found",
        code: "JOB_NOT_FOUND"
      });
    }
    res.json({ job });
  } catch (err) {
    console.error("[updates/job]", err);
    res.status(500).json({
      error: "Unable to load job"
    });
  }
});

export default router;
