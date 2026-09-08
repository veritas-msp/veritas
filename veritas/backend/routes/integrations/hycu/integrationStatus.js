import express from "express";
import verifyJWT from "../../../middleware/auth.js";
import { isHycuIntegrationEnabled } from "../../../utils/hycuIntegrationStatus.js";

const router = express.Router();

router.get("/integration-status", verifyJWT, async (_req, res) => {
  const enabled = await isHycuIntegrationEnabled();
  res.json({ enabled });
});

export default router;
