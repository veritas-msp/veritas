import express from "express";
import verifyJWT from "../../../middleware/auth.js";
import {
  authenticateHycu,
  getHycuCredentialsFromRequest,
  getHycuSettingsFromStore,
  listHycuJobs
} from "./utils.js";

const router = express.Router();

router.post("/test", verifyJWT, async (req, res) => {
  try {
    const fromBody = getHycuCredentialsFromRequest(req);
    const hasBodyCreds =
      Boolean(fromBody.apiUrl) &&
      (Boolean(fromBody.apiKey) || (Boolean(fromBody.username) && Boolean(fromBody.password)));
    const credentials = hasBodyCreds ? fromBody : await getHycuSettingsFromStore();
    const auth = await authenticateHycu(credentials);
    const jobs = await listHycuJobs(auth, { limit: 50 });
    res.json({
      success: true,
      message: "HYCU connection OK",
      jobsCount: jobs.length,
      mode: auth.mode,
      testedAt: new Date().toISOString()
    });
  } catch (error) {
    const message = error.message || "HYCU connection error";
    const isConfig = /required|incomplete|not configured/i.test(message);
    const isAuth = /invalid|401|403|credentials|auth|token/i.test(message);
    res.status(isConfig ? 400 : isAuth ? 401 : 500).json({
      success: false,
      error: message,
      details: message
    });
  }
});

export default router;
