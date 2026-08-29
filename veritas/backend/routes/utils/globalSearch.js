import express from "express";
import { query, validationResult } from "express-validator";
import verifyJWT from "../../middleware/auth.js";
import { runGlobalSearch } from "../../services/globalSearchService.js";

const router = express.Router();
router.use(verifyJWT);

function validationErrorOrNull(req, res) {
  const errors = validationResult(req);
  if (errors.isEmpty()) return null;
  return res.status(400).json({
    error: "Validation error",
    errors: errors.array()
  });
}

router.get(
  "/",
  [
    query("q").optional().isString(),
    query("limit").optional().isInt({ min: 1, max: 50 })
  ],
  async (req, res) => {
    const validationResponse = validationErrorOrNull(req, res);
    if (validationResponse) return;
    if (String(req.user?.role || "").toLowerCase() === "client") {
      return res.status(403).json({ error: "Access restricted to MSP agents." });
    }
    try {
      const payload = await runGlobalSearch(req.user, req.query.q || "");
      return res.json(payload);
    } catch (err) {
      console.error("[GET /search]", err);
      return res.status(500).json({ error: "Error searching" });
    }
  }
);

export default router;
