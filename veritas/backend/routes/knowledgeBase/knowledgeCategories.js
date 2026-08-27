import express from "express";
import { body, param, validationResult } from "express-validator";
import verifyJWT from "../../middleware/auth.js";
import { requireAnyPermission, requirePermission } from "../../middleware/permissions.js";
import {
  createKnowledgeCategory,
  deleteKnowledgeCategory,
  listKnowledgeCategories,
  updateKnowledgeCategory
} from "../../services/knowledgeCategoriesService.js";

const router = express.Router();
router.use(verifyJWT);

function validationErrorOrNull(req, res) {
  const errors = validationResult(req);
  if (errors.isEmpty()) return null;
  res.status(400).json({ error: "Invalid request.", details: errors.array() });
  return true;
}

router.get("/", requirePermission("knowledge_base.view"), async (_req, res) => {
  try {
    const categories = await listKnowledgeCategories();
    res.json({ categories });
  } catch (err) {
    console.error("[GET /knowledge-categories]", err);
    res.status(500).json({ error: "Error loading categories." });
  }
});

router.post(
  "/",
  requireAnyPermission("knowledge_base.edit", "knowledge_base.create"),
  [body("name").isString().trim().isLength({ min: 1, max: 64 })],
  async (req, res) => {
    if (validationErrorOrNull(req, res)) return;
    try {
      const category = await createKnowledgeCategory(req.body?.name);
      res.status(201).json({ category });
    } catch (err) {
      console.error("[POST /knowledge-categories]", err);
      res.status(err.status || 500).json({ error: err.message || "Error creating category." });
    }
  }
);

router.patch(
  "/:id",
  requireAnyPermission("knowledge_base.edit", "knowledge_base.create"),
  [param("id").isUUID(), body("name").isString().trim().isLength({ min: 1, max: 64 })],
  async (req, res) => {
    if (validationErrorOrNull(req, res)) return;
    try {
      const category = await updateKnowledgeCategory(req.params.id, req.body?.name);
      if (!category) return res.status(404).json({ error: "Category not found." });
      res.json({ category });
    } catch (err) {
      console.error("[PATCH /knowledge-categories/:id]", err);
      res.status(err.status || 500).json({ error: err.message || "Error saving category." });
    }
  }
);

router.delete(
  "/:id",
  requireAnyPermission("knowledge_base.edit", "knowledge_base.create", "knowledge_base.delete"),
  [param("id").isUUID()],
  async (req, res) => {
    if (validationErrorOrNull(req, res)) return;
    try {
      const ok = await deleteKnowledgeCategory(req.params.id);
      if (!ok) return res.status(404).json({ error: "Category not found." });
      res.json({ success: true });
    } catch (err) {
      console.error("[DELETE /knowledge-categories/:id]", err);
      res.status(500).json({ error: "Error deleting category." });
    }
  }
);

export default router;
