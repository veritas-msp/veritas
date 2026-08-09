import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import crypto from "crypto";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const JOBS_DIR = path.join(__dirname, "..", "uploads", "updates", "jobs");

const memoryJobs = new Map();
let activeJobId = null;

function ensureJobsDir() {
  fs.mkdirSync(JOBS_DIR, { recursive: true });
}

function jobPath(id) {
  return path.join(JOBS_DIR, `${id}.json`);
}

function persist(job) {
  ensureJobsDir();
  fs.writeFileSync(jobPath(job.id), JSON.stringify(job, null, 2), "utf8");
  memoryJobs.set(job.id, job);
}

function loadFromDisk(id) {
  try {
    const raw = fs.readFileSync(jobPath(id), "utf8");
    const job = JSON.parse(raw);
    memoryJobs.set(id, job);
    return job;
  } catch {
    return null;
  }
}

export function getActiveJobId() {
  return activeJobId;
}

export function getJob(id) {
  if (!id) return null;
  return memoryJobs.get(id) || loadFromDisk(id);
}

export function getActiveJob() {
  if (!activeJobId) return null;
  return getJob(activeJobId);
}

export function createJob({ targetVersion, mode, steps = [] }) {
  if (activeJobId) {
    const existing = getJob(activeJobId);
    if (existing && ["pending", "running"].includes(existing.status)) {
      const err = new Error("An update job is already in progress");
      err.code = "UPDATE_JOB_LOCKED";
      throw err;
    }
  }
  const id = crypto.randomBytes(8).toString("hex");
  const job = {
    id,
    status: "pending",
    targetVersion: String(targetVersion || ""),
    mode: mode || "source",
    steps: steps.map((s) => ({
      key: s.key,
      label: s.label,
      status: "pending",
      message: null,
      at: null
    })),
    logs: [],
    error: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    finishedAt: null
  };
  activeJobId = id;
  persist(job);
  return job;
}

export function appendJobLog(id, message) {
  const job = getJob(id);
  if (!job) return null;
  const line = {
    at: new Date().toISOString(),
    message: String(message || "")
  };
  job.logs.push(line);
  if (job.logs.length > 500) job.logs.splice(0, job.logs.length - 500);
  job.updatedAt = line.at;
  persist(job);
  return job;
}

export function setJobStep(id, stepKey, status, message = null) {
  const job = getJob(id);
  if (!job) return null;
  const step = job.steps.find((s) => s.key === stepKey);
  if (step) {
    step.status = status;
    step.message = message;
    step.at = new Date().toISOString();
  }
  job.updatedAt = new Date().toISOString();
  if (status === "running" && job.status === "pending") {
    job.status = "running";
  }
  persist(job);
  return job;
}

export function finishJob(id, { ok, error = null } = {}) {
  const job = getJob(id);
  if (!job) return null;
  job.status = ok ? "success" : "failed";
  job.error = error ? String(error) : null;
  job.finishedAt = new Date().toISOString();
  job.updatedAt = job.finishedAt;
  if (activeJobId === id) activeJobId = null;
  persist(job);
  return job;
}

export function clearActiveLockIfStale(maxAgeMs = 2 * 60 * 60 * 1000) {
  if (!activeJobId) return;
  const job = getJob(activeJobId);
  if (!job) {
    activeJobId = null;
    return;
  }
  if (["success", "failed"].includes(job.status)) {
    activeJobId = null;
    return;
  }
  const updated = Date.parse(job.updatedAt || job.createdAt || 0);
  if (Number.isFinite(updated) && Date.now() - updated > maxAgeMs) {
    finishJob(activeJobId, { ok: false, error: "Update job timed out" });
  }
}
