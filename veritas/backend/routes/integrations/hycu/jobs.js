import express from "express";
import { query } from "express-validator";
import verifyJWT from "../../../middleware/auth.js";
import { authenticateHycu, getHycuSettingsFromStore, listHycuJobs } from "./utils.js";
import { isHycuIntegrationEnabled } from "../../../utils/hycuIntegrationStatus.js";

const router = express.Router();

router.get(
  "/jobs",
  verifyJWT,
  [query("search").optional().isString(), query("limit").optional().isInt({ min: 1, max: 500 })],
  async (req, res) => {
    try {
      const enabled = await isHycuIntegrationEnabled();
      if (!enabled) {
        return res.status(503).json({ error: "HYCU integration is disabled" });
      }
      const credentials = await getHycuSettingsFromStore();
      const auth = await authenticateHycu(credentials);
      const search = String(req.query?.search || "").trim();
      const limitRaw = Number.parseInt(String(req.query?.limit || "200"), 10);
      const jobs = await listHycuJobs(auth, {
        search,
        limit: Number.isFinite(limitRaw) ? limitRaw : 200
      });
      res.json(jobs);
    } catch (error) {
      console.error("GET /hycu/jobs:", error);
      const message = error.message || "Error loading HYCU jobs";
      const isAuth = /invalid|401|403|credentials|auth|token/i.test(message);
      res.status(isAuth ? 401 : 502).json({ error: message });
    }
  }
);

export default router;
