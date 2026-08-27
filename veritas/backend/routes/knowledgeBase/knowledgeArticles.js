import express from "express";
import fs from "fs";
import path from "path";
import multer from "multer";
import { body, param, query, validationResult } from "express-validator";
import verifyJWT from "../../middleware/auth.js";
import { requirePermission, requireAnyPermission } from "../../middleware/permissions.js";
import { userHasAnyPermission } from "../../services/permissionService.js";
import {
  addKnowledgeAsset,
  createKnowledgeArticle,
  deleteKnowledgeArticle,
  ensureKnowledgeUploadsDir,
  getKnowledgeArticle,
  getKnowledgeAsset,
  KNOWLEDGE_ASSETS_DIR,
  listKnowledgeArticles,
  publishKnowledgeArticle,
  unpublishKnowledgeArticle,
  updateKnowledgeArticle
} from "../../services/knowledgeArticlesService.js";

const router = express.Router();
router.use(verifyJWT);

const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml"]);
ensureKnowledgeUploadsDir();

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    ensureKnowledgeUploadsDir();
    cb(null, KNOWLEDGE_ASSETS_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || "").replace(/[^.a-zA-Z0-9]/g, "") || ".bin";
    cb(null, `${Date.now()}_${Math.random().toString(36).slice(2, 8)}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME.has(file.mimetype)) cb(null, true);
    else cb(new Error(`File type not allowed: ${file.mimetype}`));
  }
});

function validationErrorOrNull(req, res) {
  const errors = validationResult(req);
  if (errors.isEmpty()) return null;
  res.status(400).json({ error: "Invalid request.", details: errors.array() });
  return true;
}

function canSeeDrafts(canManage, article) {
  if (!article) return false;
  if (article.status === "published" && article.visibleToAgents) return true;
  return canManage;
}

router.get(
  "/",
  requirePermission("knowledge_base.view"),
  [query("search").optional().isString(), query("status").optional().isIn(["draft", "published", "all"])],
  async (req, res) => {
    if (validationErrorOrNull(req, res)) return;
    try {
      const canManage = await userHasAnyPermission(req.user, ["knowledge_base.create", "knowledge_base.edit"]);
      const status = req.query.status === "all" || !req.query.status ? null : req.query.status;
      const articles = await listKnowledgeArticles({
        search: req.query.search,
        status: canManage ? status : "published",
        includeDrafts: canManage
      });
      res.json({ articles });
    } catch (err) {
      console.error("[GET /knowledge-articles]", err);
      res.status(500).json({ error: "Error loading articles." });
    }
  }
);

router.post("/", requirePermission("knowledge_base.create"), async (req, res) => {
  try {
    const article = await createKnowledgeArticle({
      title: req.body?.title,
      category: req.body?.category,
      authorUserId: req.user?.id
    });
    res.status(201).json({ article });
  } catch (err) {
    console.error("[POST /knowledge-articles]", err);
    res.status(500).json({ error: "Error creating article." });
  }
});

router.get("/:id", requirePermission("knowledge_base.view"), [param("id").isUUID()], async (req, res) => {
  if (validationErrorOrNull(req, res)) return;
  try {
    const canManage = await userHasAnyPermission(req.user, ["knowledge_base.create", "knowledge_base.edit"]);
    const article = await getKnowledgeArticle(req.params.id);
    if (!article || !canSeeDrafts(canManage, article)) {
      return res.status(404).json({ error: "Article not found." });
    }
    res.json({ article });
  } catch (err) {
    console.error("[GET /knowledge-articles/:id]", err);
    res.status(500).json({ error: "Error loading article." });
  }
});

router.patch(
  "/:id",
  requireAnyPermission("knowledge_base.edit", "knowledge_base.create"),
  [param("id").isUUID()],
  async (req, res) => {
    if (validationErrorOrNull(req, res)) return;
    try {
      const article = await updateKnowledgeArticle(req.params.id, {
        title: req.body?.title,
        category: req.body?.category,
        visibleToAgents: req.body?.visibleToAgents,
        contentJson: req.body?.contentJson,
        contentHtml: req.body?.contentHtml,
        status: req.body?.status,
        clientIds: req.body?.clientIds,
        contactIds: req.body?.contactIds
      });
      if (!article) return res.status(404).json({ error: "Article not found." });
      res.json({ article });
    } catch (err) {
      console.error("[PATCH /knowledge-articles/:id]", err);
      res.status(500).json({ error: "Error saving article." });
    }
  }
);

router.post(
  "/:id/publish",
  requireAnyPermission("knowledge_base.edit", "knowledge_base.create"),
  [param("id").isUUID(), body("visibleToAgents").optional().isBoolean()],
  async (req, res) => {
    if (validationErrorOrNull(req, res)) return;
    try {
      const article = await publishKnowledgeArticle(req.params.id, {
        visibleToAgents: req.body?.visibleToAgents,
        clientIds: req.body?.clientIds,
        contactIds: req.body?.contactIds
      });
      if (!article) return res.status(404).json({ error: "Article not found." });
      res.json({ article });
    } catch (err) {
      console.error("[POST /knowledge-articles/:id/publish]", err);
      res.status(500).json({ error: "Error publishing article." });
    }
  }
);

router.post(
  "/:id/unpublish",
  requireAnyPermission("knowledge_base.edit", "knowledge_base.create"),
  [param("id").isUUID()],
  async (req, res) => {
    if (validationErrorOrNull(req, res)) return;
    try {
      const article = await unpublishKnowledgeArticle(req.params.id);
      if (!article) return res.status(404).json({ error: "Article not found." });
      res.json({ article });
    } catch (err) {
      console.error("[POST /knowledge-articles/:id/unpublish]", err);
      res.status(500).json({ error: "Error reverting article to draft." });
    }
  }
);

router.delete("/:id", requirePermission("knowledge_base.delete"), [param("id").isUUID()], async (req, res) => {
  if (validationErrorOrNull(req, res)) return;
  try {
    const ok = await deleteKnowledgeArticle(req.params.id);
    if (!ok) return res.status(404).json({ error: "Article not found." });
    res.json({ success: true });
  } catch (err) {
    console.error("[DELETE /knowledge-articles/:id]", err);
    res.status(500).json({ error: "Error deleting article." });
  }
});

router.post(
  "/:id/assets",
  requireAnyPermission("knowledge_base.edit", "knowledge_base.create"),
  [param("id").isUUID()],
  (req, res, next) => {
    upload.single("file")(req, res, err => {
      if (err) return res.status(400).json({ error: err.message || "Invalid file." });
      next();
    });
  },
  async (req, res) => {
    if (validationErrorOrNull(req, res)) return;
    try {
      const article = await getKnowledgeArticle(req.params.id);
      if (!article) {
        if (req.file?.path && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        return res.status(404).json({ error: "Article not found." });
      }
      if (!req.file) return res.status(400).json({ error: "File required." });
      const asset = await addKnowledgeAsset({
        articleId: req.params.id,
        fileName: req.file.originalname,
        storedName: req.file.filename,
        mimeType: req.file.mimetype,
        sizeBytes: req.file.size,
        uploadedBy: req.user?.id
      });
      res.status(201).json({ asset });
    } catch (err) {
      console.error("[POST /knowledge-articles/:id/assets]", err);
      res.status(500).json({ error: "Error uploading image." });
    }
  }
);

router.get(
  "/:id/assets/:assetId",
  requirePermission("knowledge_base.view"),
  [param("id").isUUID(), param("assetId").isUUID()],
  async (req, res) => {
    if (validationErrorOrNull(req, res)) return;
    try {
      const canManage = await userHasAnyPermission(req.user, ["knowledge_base.create", "knowledge_base.edit"]);
      const article = await getKnowledgeArticle(req.params.id);
      if (!article || !canSeeDrafts(canManage, article)) {
        return res.status(404).json({ error: "Article not found." });
      }
      const asset = await getKnowledgeAsset(req.params.id, req.params.assetId);
      if (!asset) return res.status(404).json({ error: "File not found." });
      const filePath = path.join(KNOWLEDGE_ASSETS_DIR, asset.stored_name);
      if (!fs.existsSync(filePath)) return res.status(404).json({ error: "File not found." });
      res.setHeader("Content-Type", asset.mime_type || "application/octet-stream");
      res.setHeader("Cache-Control", "private, max-age=86400");
      fs.createReadStream(filePath).pipe(res);
    } catch (err) {
      console.error("[GET /knowledge-articles/:id/assets/:assetId]", err);
      res.status(500).json({ error: "Error loading file." });
    }
  }
);

export default router;
