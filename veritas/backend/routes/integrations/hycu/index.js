import express from "express";
import integrationStatusRouter from "./integrationStatus.js";
import testRouter from "./test.js";
import jobsRouter from "./jobs.js";
import saveJobsSyncRouter from "./saveJobsSync.js";

const router = express.Router();
router.use("/", integrationStatusRouter);
router.use("/", testRouter);
router.use("/", jobsRouter);
router.use("/", saveJobsSyncRouter);
export default router;
