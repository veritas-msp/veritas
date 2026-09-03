import express from "express";
import { body, param, validationResult } from "express-validator";
import verifyJWT from "../../middleware/auth.js";
import { requirePermission } from "../../middleware/permissions.js";
import { createPlanningEventType, deletePlanningEventType, listPlanningEventTypes, resetPlanningEventTypes, updatePlanningEventType } from "../../utils/planningEventTypes.js";

const router = express.Router();
router.use(verifyJWT);

function handleError(res, err, context) {
  console.error(context, err);
  res.status(err.status || 500).json({
    error: err.message || "Server error."
  });
}

router.get("/", async (req, res) => {
  try {
    const includeDisabled = req.query.includeDisabled === "1" || req.query.includeDisabled === "true";
    const types = await listPlanningEventTypes({
      includeDisabled
    });
    res.json({
      types
    });
  } catch (err) {
    handleError(res, err, "GET /planning-event-types");
  }
});

router.get("/admin", verifyJWT, requirePermission("admin_panel.planning"), async (_req, res) => {
  try {
    const types = await listPlanningEventTypes({
      includeDisabled: true,
      includeUsage: true
    });
    res.json({
      types
    });
  } catch (err) {
    handleError(res, err, "GET /planning-event-types/admin");
  }
});

router.post("/", verifyJWT, requirePermission("admin_panel.planning"), [body("label").isString().trim().notEmpty(), body("typeKey").optional().isString().trim(), body("icon").optional().isString().trim(), body("kpiTone").optional().isString().trim(), body("enabled").optional().isBoolean(), body("formSelectable").optional().isBoolean(), body("sortOrder").optional().isInt()], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: "Invalid request",
      details: errors.array()
    });
  }
  try {
    const type = await createPlanningEventType(req.body);
    res.status(201).json({
      type
    });
  } catch (err) {
    handleError(res, err, "POST /planning-event-types");
  }
});

router.post("/reset", verifyJWT, requirePermission("admin_panel.planning"), async (_req, res) => {
  try {
    const types = await resetPlanningEventTypes();
    res.json({
      types
    });
  } catch (err) {
    handleError(res, err, "POST /planning-event-types/reset");
  }
});

router.patch("/:id", verifyJWT, requirePermission("admin_panel.planning"), [param("id").isInt({
  min: 1
}), body("label").optional().isString().trim().notEmpty(), body("icon").optional().isString().trim(), body("kpiTone").optional().isString().trim(), body("enabled").optional().isBoolean(), body("formSelectable").optional().isBoolean(), body("sortOrder").optional().isInt()], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: "Invalid request",
      details: errors.array()
    });
  }
  try {
    const type = await updatePlanningEventType(req.params.id, req.body);
    res.json({
      type
    });
  } catch (err) {
    handleError(res, err, "PATCH /planning-event-types/:id");
  }
});

router.delete("/:id", verifyJWT, requirePermission("admin_panel.planning"), [param("id").isInt({
  min: 1
})], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: "Invalid request",
      details: errors.array()
    });
  }
  try {
    await deletePlanningEventType(req.params.id);
    res.json({
      success: true
    });
  } catch (err) {
    handleError(res, err, "DELETE /planning-event-types/:id");
  }
});

export default router;
