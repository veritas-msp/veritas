import express from "express";
import fs from "fs";
import path from "path";
import multer from "multer";
import { fileURLToPath } from "url";
import { body, param, query, validationResult } from "express-validator";
import verifyJWT from "../../middleware/auth.js";
import { sendMail } from "../../utils/sendMail.js";
import { renderSystemTemplate } from "../../services/systemNotificationCatalog.js";
import { createTestUserNotification, getUnreadNotificationCount, getUserInAppPreferencesPayload, listUserNotifications, markAllNotificationsRead, markNotificationRead, archiveNotification, archiveAllNotifications, saveUserInAppPreferences } from "../../services/userNotificationService.js";

const router = express.Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const EMAIL_ASSETS_UPLOAD_ROOT = path.join(__dirname, "..", "..", "uploads", "email-assets");
fs.mkdirSync(EMAIL_ASSETS_UPLOAD_ROOT, {
  recursive: true
});

const ALLOWED_EMAIL_IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/jpg", "image/webp", "image/gif"]);
const ALLOWED_EMAIL_IMAGE_EXTS = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif"]);
const MAX_EMAIL_ASSET_BYTES = 5 * 1024 * 1024;

const EMAIL_PREVIEW_SAMPLE_CONTEXT = {
  resetLink: "https://veritas.example/reset?token=demo",
  activateLink: "https://veritas.example/portal/activate?token=demo",
  portalLink: "https://veritas.example/portal/documents",
  changedFields: "statut, priorité",
  user: {
    username: "j.dupont",
    email: "j.dupont@example.com"
  },
  contact: {
    prenom: "Marie",
    nom: "Martin",
    email: "marie.martin@client.example"
  },
  requester: {
    prenom: "Marie",
    nom: "Martin",
    email: "marie.martin@client.example"
  },
  agent: {
    username: "a.tech"
  },
  ticket: {
    ticket_number: "1042",
    title: "Impossible de se connecter au VPN",
    status: "Ouvert",
    priority: "Haute"
  },
  entreprise: {
    nom: "Acme SAS"
  },
  comment: {
    author: "a.tech",
    preview: "Nous avons redémarré le tunnel VPN, pouvez-vous retester ?"
  },
  satisfaction: {
    author: "Marie Martin",
    rating: "5",
    message: "Intervention rapide, merci !"
  },
  validation: {
    message: "Merci de valider la résolution proposée.",
    validator: "j.dupont",
    decision: "approuvé"
  },
  event: {
    title: "Intervention sur site",
    type: "Intervention",
    start: "15/04/2026 09:00",
    end: "15/04/2026 12:00",
    description: "Remplacement du switch cœur."
  },
  document: {
    file_name: "Contrat_maintenance.pdf",
    category: "Contrats",
    description: "Contrat 2026"
  },
  secret: {
    title: "Accès firewall",
    description: "Identifiants admin firewall site principal",
    expires_at: "30/04/2026",
    max_views: "3"
  }
};

function validationErrorOrNull(req, res) {
  const errors = validationResult(req);
  if (errors.isEmpty()) return null;
  return res.status(400).json({
    error: "Validation error",
    errors: errors.array()
  });
}

function isAllowedEmailImage(file) {
  const mime = String(file?.mimetype || "").toLowerCase();
  if (ALLOWED_EMAIL_IMAGE_TYPES.has(mime)) return true;
  if (!mime || mime === "application/octet-stream") {
    return ALLOWED_EMAIL_IMAGE_EXTS.has(path.extname(file?.originalname || "").toLowerCase());
  }
  return false;
}

function resolveEmailImageExt(file) {
  const ext = path.extname(file?.originalname || "").toLowerCase();
  if (ext === ".jpeg") return ".jpg";
  if (ALLOWED_EMAIL_IMAGE_EXTS.has(ext)) return ext;
  if (file?.mimetype === "image/png") return ".png";
  if (file?.mimetype === "image/webp") return ".webp";
  if (file?.mimetype === "image/gif") return ".gif";
  return ".jpg";
}

function publicEmailAssetUrl(req, relativePath) {
  const configured = String(process.env.PUBLIC_API_BASE_URL || "").replace(/\/+$/, "");
  if (configured) return `${configured}${relativePath}`;
  const host = req.get("x-forwarded-host") || req.get("host");
  const proto = req.get("x-forwarded-proto") || req.protocol || "http";
  if (host) return `${proto}://${host}${relativePath}`;
  const frontend = String(process.env.FRONTEND_BASE_URL || "").replace(/\/+$/, "");
  return frontend ? `${frontend}${relativePath}` : relativePath;
}

const emailAssetUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, EMAIL_ASSETS_UPLOAD_ROOT),
    filename: (_req, file, cb) => {
      const stamp = Date.now().toString(36);
      const rand = Math.random().toString(16).slice(2, 8);
      cb(null, `notif-${stamp}-${rand}${resolveEmailImageExt(file)}`);
    }
  }),
  limits: {
    fileSize: MAX_EMAIL_ASSET_BYTES,
    files: 1
  },
  fileFilter: (_req, file, cb) => {
    if (!isAllowedEmailImage(file)) {
      return cb(new Error("Unsupported image type (png, jpg, webp, gif)"));
    }
    cb(null, true);
  }
});

router.use(verifyJWT);
router.get("/preferences", async (req, res) => {
  try {
    const payload = await getUserInAppPreferencesPayload(req.user.id);
    res.json(payload);
  } catch (err) {
    console.error("GET /notifications/preferences:", err);
    res.status(500).json({
      error: "Error retrieving preferences"
    });
  }
});
router.put("/preferences", [body("userPreferences").isObject()], async (req, res) => {
  const validationResponse = validationErrorOrNull(req, res);
  if (validationResponse) return;
  try {
    const saved = await saveUserInAppPreferences(req.user.id, req.body.userPreferences);
    const payload = await getUserInAppPreferencesPayload(req.user.id);
    res.json({
      success: true,
      userPreferences: saved,
      ...payload
    });
  } catch (err) {
    console.error("PUT /notifications/preferences:", err);
    res.status(500).json({
      error: "Error saving preferences"
    });
  }
});
router.get("/", [query("limit").optional().isInt({
  min: 1,
  max: 100
}), query("offset").optional().isInt({
  min: 0
}), query("unreadOnly").optional().isBoolean(), query("archivedOnly").optional().isBoolean(), query("ticketId").optional().isUUID()], async (req, res) => {
  const validationResponse = validationErrorOrNull(req, res);
  if (validationResponse) return;
  try {
    const unreadOnly = req.query.unreadOnly === "true" || req.query.unreadOnly === true || req.query.unreadOnly === "1";
    const archivedOnly = req.query.archivedOnly === "true" || req.query.archivedOnly === true || req.query.archivedOnly === "1";
    const payload = await listUserNotifications(req.user.id, {
      limit: Number(req.query.limit) || 30,
      offset: Number(req.query.offset) || 0,
      unreadOnly,
      archivedOnly,
      ticketId: req.query.ticketId ? String(req.query.ticketId) : null
    });
    res.json(payload);
  } catch (err) {
    console.error("GET /notifications:", err);
    res.status(500).json({
      error: "Error retrieving notifications"
    });
  }
});
router.get("/unread-count", async (req, res) => {
  try {
    const count = await getUnreadNotificationCount(req.user.id);
    res.json({
      count
    });
  } catch (err) {
    console.error("GET /notifications/unread-count:", err);
    res.status(500).json({
      error: "Error during comptage notifications"
    });
  }
});
router.patch("/:id/read", [param("id").isUUID()], async (req, res) => {
  const validationResponse = validationErrorOrNull(req, res);
  if (validationResponse) return;
  try {
    const updated = await markNotificationRead(req.user.id, req.params.id);
    if (!updated) {
      return res.status(404).json({
        error: "Notification not found"
      });
    }
    res.json(updated);
  } catch (err) {
    console.error("PATCH /notifications/:id/read:", err);
    res.status(500).json({
      error: "Error updating notification"
    });
  }
});
router.patch("/:id/archive", [param("id").isUUID()], async (req, res) => {
  const validationResponse = validationErrorOrNull(req, res);
  if (validationResponse) return;
  try {
    const updated = await archiveNotification(req.user.id, req.params.id);
    if (!updated) {
      return res.status(404).json({
        error: "Notification not found"
      });
    }
    res.json(updated);
  } catch (err) {
    console.error("PATCH /notifications/:id/archive:", err);
    res.status(500).json({
      error: "Error archiving notification"
    });
  }
});
router.post("/test", [body("type").optional().isString(), body("locale").optional().isString()], async (req, res) => {
  const validationResponse = validationErrorOrNull(req, res);
  if (validationResponse) return;
  try {
    const type = String(req.body?.type || "ticket_commented").trim();
    const locale = String(req.body?.locale || "fr").trim();
    const notification = await createTestUserNotification(req.user.id, type, locale);
    res.status(201).json({
      success: true,
      message: "Tis notification created.",
      notification
    });
  } catch (err) {
    console.error("POST /notifications/test:", err);
    res.status(500).json({
      error: "Unabto send tis notification."
    });
  }
});
router.post("/read-all", [body("ticketId").optional().isUUID()], async (req, res) => {
  const validationResponse = validationErrorOrNull(req, res);
  if (validationResponse) return;
  try {
    const count = await markAllNotificationsRead(req.user.id, {
      ticketId: req.body?.ticketId ? String(req.body.ticketId) : null
    });
    res.json({
      success: true,
      count
    });
  } catch (err) {
    console.error("POST /notifications/read-all:", err);
    res.status(500).json({
      error: "Error during marquage notifications"
    });
  }
});
router.post("/archive-all", [body("ticketId").optional().isUUID()], async (req, res) => {
  const validationResponse = validationErrorOrNull(req, res);
  if (validationResponse) return;
  try {
    const count = await archiveAllNotifications(req.user.id, {
      ticketId: req.body?.ticketId ? String(req.body.ticketId) : null
    });
    res.json({
      success: true,
      count
    });
  } catch (err) {
    console.error("POST /notifications/archive-all:", err);
    res.status(500).json({
      error: "Error archiving notifications"
    });
  }
});

router.post("/email-assets", (req, res) => {
  emailAssetUpload.single("file")(req, res, async err => {
    if (err) {
      return res.status(400).json({
        error: err.message || "File upload error"
      });
    }
    try {
      if (!req.file) {
        return res.status(400).json({
          error: "No file uploaded"
        });
      }
      const relativePath = `/uploads/email-assets/${req.file.filename}`;
      res.status(201).json({
        success: true,
        path: relativePath,
        url: publicEmailAssetUrl(req, relativePath),
        fileName: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size
      });
    } catch (uploadErr) {
      console.error("POST /notifications/email-assets:", uploadErr);
      res.status(500).json({
        error: "Error uploading email asset"
      });
    }
  });
});

router.post("/email-preview-test", [body("to").optional({
  checkFalsy: true
}).isEmail(), body("subject").optional().isString(), body("title").optional().isString(), body("htmlContent").isString(), body("sampleContext").optional().isBoolean()], async (req, res) => {
  const validationResponse = validationErrorOrNull(req, res);
  if (validationResponse) return;
  try {
    const to = String(req.body?.to || req.user?.email || "").trim();
    if (!to) {
      return res.status(400).json({
        error: "No destination email. Provide « to » or ensure your account has an email."
      });
    }
    const useSample = req.body?.sampleContext !== false;
    const context = useSample ? EMAIL_PREVIEW_SAMPLE_CONTEXT : {};
    const subjectRaw = String(req.body?.subject || "").trim() || "Aperçu notification Veritas";
    const titleRaw = String(req.body?.title || "").trim() || subjectRaw;
    const htmlRaw = String(req.body?.htmlContent || "");
    const subject = `[Aperçu] ${renderSystemTemplate(subjectRaw, context)}`;
    const title = renderSystemTemplate(titleRaw, context);
    const htmlContent = renderSystemTemplate(htmlRaw, context);
    const info = await sendMail({
      to,
      subject,
      title,
      htmlContent
    });
    res.json({
      success: true,
      to,
      messageId: info?.messageId || null,
      skipped: Boolean(info?.skipped)
    });
  } catch (err) {
    console.error("POST /notifications/email-preview-test:", err);
    res.status(500).json({
      error: err.message || "Unable to send preview email"
    });
  }
});

export default router;
