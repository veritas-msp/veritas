import express from "express";
import verifyJWT from "../../middleware/auth.js";
import { requireRole } from "../../middleware/roles.js";
import { writeEnvFile, writeFrontendEnvFile } from "../../utils/envFile.js";
import { getEditionPayload } from "../../utils/edition.js";
import {
  applyOfflineActivation,
  getLicenseAdminSummary,
  invalidateLicenseCache,
  isValidLicenseKeyFormat,
  normalizeLicenseKey,
  refreshProLicenseState,
} from "../../utils/proLicense.js";

const router = express.Router();

router.get("/", verifyJWT, requireRole("admin"), (_req, res) => {
  res.json(getLicenseAdminSummary());
});

router.post("/refresh", verifyJWT, requireRole("admin"), async (_req, res) => {
  await refreshProLicenseState();
  res.json(getLicenseAdminSummary());
});

router.post("/offline-activate", verifyJWT, requireRole("admin"), async (req, res) => {
  try {
    const document = req.body?.document ?? req.body?.lease ?? req.body;
    const offline = applyOfflineActivation(document);
    const key = normalizeLicenseKey(offline.payload.licenseKey);
    process.env.VERITAS_LICENSE_KEY = key;
    writeEnvFile({
      VERITAS_LICENSE_KEY: key,
      VERITAS_EDITION: "pro",
    });
    writeFrontendEnvFile({
      REACT_APP_VERITAS_EDITION: "pro",
    });
    invalidateLicenseCache();
    await refreshProLicenseState();
    return res.json({
      ...getEditionPayload(),
      message:
        "Offline Pro activation applied. Reload the application to apply all frontend modules.",
      leaseExpiresAt: offline.expiresAt,
    });
  } catch (err) {
    const code = err?.code || "OFFLINE_ACTIVATE_FAILED";
    const status =
      code === "LEASE_SECRET_MISSING"
        ? 503
        : code === "INVALID_ACTIVATION_FILE" || code === "LEASE_INVALID"
          ? 400
          : 500;
    return res.status(status).json({
      error: code,
      message:
        code === "LEASE_SECRET_MISSING"
          ? "Configure VERITAS_LICENSE_LEASE_SECRET (same value as billing)."
          : code === "INVALID_ACTIVATION_FILE"
            ? "Invalid offline activation file."
            : code === "LEASE_INVALID"
              ? "Offline lease is invalid, expired, or signature mismatch."
              : err.message || "Offline activation failed.",
      diagnostics: err?.diagnostics || undefined,
    });
  }
});

router.post("/", verifyJWT, requireRole("admin"), async (req, res) => {
  const key = normalizeLicenseKey(req.body?.licenseKey || "");
  if (!key || !isValidLicenseKeyFormat(key)) {
    return res.status(400).json({
      error: "INVALID_LICENSE_FORMAT",
      message: "Invalid key format (expected: VRT-PRO-XXXX-XXXX-XXXX-XXXX).",
    });
  }
  const previousKey = process.env.VERITAS_LICENSE_KEY;
  process.env.VERITAS_LICENSE_KEY = key;
  const state = await refreshProLicenseState();
  if (!state.valid) {
    if (previousKey) {
      process.env.VERITAS_LICENSE_KEY = previousKey;
    } else {
      delete process.env.VERITAS_LICENSE_KEY;
    }
    await refreshProLicenseState();
    return res.status(400).json({
      error: "LICENSE_INVALID",
      code: state.status,
      message: state.lastError || "Invalid license or inactive subscription.",
    });
  }
  writeEnvFile({
    VERITAS_LICENSE_KEY: key,
    VERITAS_EDITION: "pro",
  });
  writeFrontendEnvFile({
    REACT_APP_VERITAS_EDITION: "pro",
  });
  invalidateLicenseCache();
  await refreshProLicenseState();
  res.json({
    ...getEditionPayload(),
    message: "Pro license activated. Reload the application to apply all frontend modules.",
  });
});

export default router;
