import express from "express";
import fs from "fs";
import path from "path";
import multer from "multer";
import { fileURLToPath } from "url";
import { pool, isDatabaseConfigured } from "../../database/db.js";
import verifyJWT from "../../middleware/auth.js";
import { requirePermission } from "../../middleware/permissions.js";
import { requirePro } from "../../middleware/edition.js";
import { decryptSetting } from "../../utils/settingsHelper.js";
import {
  DEFAULT_REPORT_BRANDING,
  REPORT_BRANDING_KEYS,
  REPORT_BRANDING_LABELS,
  REPORT_BRANDING_SECTION,
  REPORT_BRANDING_UPLOAD_PREFIX,
  listReportFontPresets,
  loadReportBranding,
  normalizeReportBranding,
  normalizeReportLogoPath,
  toPublicReportBranding
} from "../../utils/reportBranding.js";
import { GENERAL_SETTING_KEYS } from "../../utils/generalSettings.js";

const router = express.Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const REPORT_BRANDING_UPLOAD_ROOT = path.join(__dirname, "..", "..", "uploads", "report-branding");
fs.mkdirSync(REPORT_BRANDING_UPLOAD_ROOT, { recursive: true });

const ALLOWED_IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/jpg", "image/webp"]);
const ALLOWED_IMAGE_EXTS = new Set([".png", ".jpg", ".jpeg", ".webp"]);
const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

const ASSET_KINDS = {
  logo: {
    filePrefix: "logo",
    key: REPORT_BRANDING_KEYS.logoPath
  },
  "footer-logo": {
    filePrefix: "footer-logo",
    key: REPORT_BRANDING_KEYS.footerLogoPath
  }
};

function resolveAssetKind(kind) {
  return ASSET_KINDS[String(kind || "")] || null;
}

function resolveImageExt(file) {
  const ext = path.extname(file.originalname || "").toLowerCase();
  if (ALLOWED_IMAGE_EXTS.has(ext)) return ext === ".jpeg" ? ".jpg" : ext;
  if (file.mimetype === "image/png") return ".png";
  if (file.mimetype === "image/webp") return ".webp";
  if (file.mimetype === "image/jpeg" || file.mimetype === "image/jpg") return ".jpg";
  return ".png";
}

function isAllowedImage(file) {
  const mime = String(file.mimetype || "").toLowerCase();
  if (ALLOWED_IMAGE_TYPES.has(mime)) return true;
  if (!mime || mime === "application/octet-stream") {
    return ALLOWED_IMAGE_EXTS.has(path.extname(file.originalname || "").toLowerCase());
  }
  return false;
}

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, REPORT_BRANDING_UPLOAD_ROOT),
    filename: (req, file, cb) => {
      const asset = resolveAssetKind(req.params.kind);
      const prefix = asset?.filePrefix || "logo";
      cb(null, `${prefix}-${Date.now()}${resolveImageExt(file)}`);
    }
  }),
  limits: { fileSize: MAX_UPLOAD_BYTES },
  fileFilter: (_req, file, cb) => {
    if (!isAllowedImage(file)) {
      return cb(new Error("Unsupported image format. Use PNG, JPG or WebP."));
    }
    return cb(null, true);
  }
});

async function readRawReportBranding() {
  if (!isDatabaseConfigured()) {
    return { ...DEFAULT_REPORT_BRANDING };
  }
  try {
    const result = await pool.query(
      `SELECT key, value, value_encrypted, value_iv, value_auth_tag
       FROM v_b_settings
       WHERE section = $1 OR key = ANY($2::text[])`,
      [
        REPORT_BRANDING_SECTION,
        [
          ...Object.values(REPORT_BRANDING_KEYS),
          GENERAL_SETTING_KEYS.organizationName,
          GENERAL_SETTING_KEYS.supportEmail,
          GENERAL_SETTING_KEYS.supportPhone,
          GENERAL_SETTING_KEYS.organizationWebsite,
          GENERAL_SETTING_KEYS.organizationAddress
        ]
      ]
    );
    const fromDb = {};
    for (const row of result.rows) {
      fromDb[row.key] = decryptSetting(row) ?? "";
    }
    return fromDb;
  } catch (err) {
    if (err?.code === "DATABASE_NOT_CONFIGURED" || err?.code === "42P01") {
      return { ...DEFAULT_REPORT_BRANDING };
    }
    throw err;
  }
}

async function upsertReportSetting(client, key, value) {
  await client.query(
    `INSERT INTO v_b_settings (key, value, label, section)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (key) DO UPDATE SET
       value = EXCLUDED.value,
       label = EXCLUDED.label,
       section = EXCLUDED.section`,
    [key, String(value ?? ""), REPORT_BRANDING_LABELS[key] || key, REPORT_BRANDING_SECTION]
  );
}

/** Any authenticated agent can read branding (needed for HTML export). */
router.get("/", verifyJWT, async (_req, res) => {
  try {
    const branding = await loadReportBranding();
    res.json({ success: true, branding });
  } catch (err) {
    console.error("GET /report-branding", err);
    res.status(500).json({ success: false, error: "Unable to load report branding." });
  }
});

/** Admin form: raw settings + resolved preview */
router.get("/admin", verifyJWT, requirePermission("admin_panel.reports"), requirePro, async (_req, res) => {
  try {
    const fromDb = await readRawReportBranding();
    const raw = normalizeReportBranding({ ...DEFAULT_REPORT_BRANDING, ...fromDb });
    const branding = toPublicReportBranding(raw, fromDb);
    res.json({
      success: true,
      settings: raw,
      branding,
      fontPresets: (() => {
        const all = listReportFontPresets();
        return { all, sans: all, serif: all };
      })(),
      defaults: DEFAULT_REPORT_BRANDING
    });
  } catch (err) {
    console.error("GET /report-branding/admin", err);
    res.status(500).json({ success: false, error: "Unable to load report branding." });
  }
});

router.patch("/", verifyJWT, requirePermission("admin_panel.reports"), requirePro, async (req, res) => {
  const fromDb = await readRawReportBranding();
  const normalized = normalizeReportBranding({
    ...DEFAULT_REPORT_BRANDING,
    ...fromDb,
    ...(req.body || {})
  });
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (const [key, value] of Object.entries(normalized)) {
      await upsertReportSetting(client, key, value);
    }
    await client.query("COMMIT");
    const branding = toPublicReportBranding(normalized, fromDb);
    res.json({ success: true, settings: normalized, branding });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("PATCH /report-branding", err);
    res.status(500).json({ success: false, error: "Unable to save report branding." });
  } finally {
    client.release();
  }
});

router.post("/assets/:kind", verifyJWT, requirePermission("admin_panel.reports"), requirePro, (req, res) => {
  upload.single("file")(req, res, async err => {
    if (err) {
      let message = err.message || "Error during upload.";
      if (err.code === "LIMIT_FILE_SIZE") {
        message = "File too large (max 8 MB).";
      }
      return res.status(400).json({ success: false, error: message });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, error: "File required." });
    }
    const asset = resolveAssetKind(req.params.kind);
    if (!asset) {
      return res.status(400).json({ success: false, error: "Invalid logo kind." });
    }
    const relativePath = normalizeReportLogoPath(`${REPORT_BRANDING_UPLOAD_PREFIX}${req.file.filename}`);
    if (!relativePath) {
      return res.status(400).json({ success: false, error: "Invalid logo path." });
    }
    const fromDb = await readRawReportBranding();
    const previousPath = normalizeReportLogoPath(fromDb[asset.key]);
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await upsertReportSetting(client, asset.key, relativePath);
      await client.query("COMMIT");
      if (previousPath && previousPath !== relativePath && previousPath.startsWith(REPORT_BRANDING_UPLOAD_PREFIX)) {
        fs.unlink(path.join(REPORT_BRANDING_UPLOAD_ROOT, path.basename(previousPath)), () => {});
      }
      const nextRaw = normalizeReportBranding({ ...DEFAULT_REPORT_BRANDING, ...fromDb, [asset.key]: relativePath });
      res.json({
        success: true,
        path: relativePath,
        key: asset.key,
        settings: nextRaw,
        branding: toPublicReportBranding(nextRaw, fromDb)
      });
    } catch (uploadErr) {
      await client.query("ROLLBACK");
      console.error("POST /report-branding/assets", uploadErr);
      res.status(500).json({ success: false, error: "Error saving file" });
    } finally {
      client.release();
    }
  });
});

router.delete("/assets/:kind", verifyJWT, requirePermission("admin_panel.reports"), requirePro, async (req, res) => {
  const asset = resolveAssetKind(req.params.kind);
  if (!asset) {
    return res.status(400).json({ success: false, error: "Invalid logo kind." });
  }
  const fromDb = await readRawReportBranding();
  const currentPath = normalizeReportLogoPath(fromDb[asset.key]);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await upsertReportSetting(client, asset.key, "");
    await client.query("COMMIT");
    if (currentPath && currentPath.startsWith(REPORT_BRANDING_UPLOAD_PREFIX)) {
      fs.unlink(path.join(REPORT_BRANDING_UPLOAD_ROOT, path.basename(currentPath)), () => {});
    }
    const nextRaw = normalizeReportBranding({ ...DEFAULT_REPORT_BRANDING, ...fromDb, [asset.key]: "" });
    res.json({
      success: true,
      settings: nextRaw,
      branding: toPublicReportBranding(nextRaw, fromDb)
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("DELETE /report-branding/assets", err);
    res.status(500).json({ success: false, error: "Unable to delete file." });
  } finally {
    client.release();
  }
});

export default router;
