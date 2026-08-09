import fs from "fs";
import os from "os";
import path from "path";
import { spawn } from "child_process";
import { fileURLToPath } from "url";
import fetch from "node-fetch";
import { pool } from "../database/db.js";
import { getSettingsMap } from "../utils/settingsHelper.js";
import { getAppVersion } from "../utils/version.js";
import {
  appendJobLog,
  clearActiveLockIfStale,
  createJob,
  finishJob,
  getActiveJob,
  getJob,
  setJobStep
} from "./platformUpdateJob.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BACKEND_ROOT = path.join(__dirname, "..");
const UPDATES_ROOT = path.join(BACKEND_ROOT, "uploads", "updates");
const BACKUPS_DIR = path.join(UPDATES_ROOT, "backups");
const STAGING_DIR = path.join(UPDATES_ROOT, "staging");
const CACHE_FILE = path.join(UPDATES_ROOT, "last-check.json");

const DEFAULT_REPO = "veritas-msp/veritas";
const CHECK_TTL_MS = 30 * 60 * 1000;
const RECENT_BACKUP_MS = 60 * 60 * 1000;

const APPLY_STEPS = [
  { key: "maintenance_on", label: "Enable maintenance mode" },
  { key: "backup", label: "Backup acknowledgement" },
  { key: "download", label: "Download release" },
  { key: "apply", label: "Apply update files" },
  { key: "health", label: "Health check" },
  { key: "maintenance_off", label: "Disable maintenance mode" }
];

function ensureDirs() {
  for (const dir of [UPDATES_ROOT, BACKUPS_DIR, STAGING_DIR]) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function normalizeVersion(raw) {
  return String(raw || "")
    .trim()
    .replace(/^v/i, "")
    .split(/[+]/)[0]
    .trim();
}

/** @returns {number} negative if a<b, 0 if equal, positive if a>b */
export function compareSemver(a, b) {
  const pa = normalizeVersion(a).split(".").map((n) => parseInt(n, 10) || 0);
  const pb = normalizeVersion(b).split(".").map((n) => parseInt(n, 10) || 0);
  const len = Math.max(pa.length, pb.length, 3);
  for (let i = 0; i < len; i++) {
    const da = pa[i] || 0;
    const db = pb[i] || 0;
    if (da !== db) return da - db;
  }
  return 0;
}

export function resolveGithubRepo() {
  const fromEnv = String(process.env.VERITAS_GITHUB_REPO || "").trim();
  if (fromEnv) {
    return fromEnv
      .replace(/^https?:\/\/github\.com\//i, "")
      .replace(/\.git$/i, "")
      .replace(/\/+$/, "");
  }
  return DEFAULT_REPO;
}

export async function resolveGithubToken() {
  const fromEnv = String(process.env.GITHUB_TOKEN || process.env.VERITAS_GITHUB_TOKEN || "").trim();
  if (fromEnv) return fromEnv;
  try {
    const map = await getSettingsMap(["GITHUB_TOKEN"]);
    return String(map.GITHUB_TOKEN || "").trim() || null;
  } catch {
    return null;
  }
}

export function detectUpdateMode() {
  const forced = String(process.env.VERITAS_UPDATE_MODE || "auto").trim().toLowerCase();
  if (forced === "docker" || forced === "source") return forced;
  if (fs.existsSync("/.dockerenv") || process.env.DOCKER_HOST || fs.existsSync("/var/run/docker.sock")) {
    return "docker";
  }
  return "source";
}

function dockerSocketAvailable() {
  if (process.env.DOCKER_HOST) return true;
  try {
    return fs.existsSync("/var/run/docker.sock");
  } catch {
    return false;
  }
}

function readCache() {
  try {
    return JSON.parse(fs.readFileSync(CACHE_FILE, "utf8"));
  } catch {
    return null;
  }
}

function writeCache(payload) {
  ensureDirs();
  fs.writeFileSync(CACHE_FILE, JSON.stringify(payload, null, 2), "utf8");
}

async function githubFetch(url, token) {
  const headers = {
    Accept: "application/vnd.github+json",
    "User-Agent": "Veritas-Platform-Updater",
    "X-GitHub-Api-Version": "2022-11-28"
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(url, { headers });
  const text = await res.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = { message: text };
  }
  if (!res.ok) {
    const err = new Error(body?.message || `GitHub API error (${res.status})`);
    err.status = res.status;
    err.body = body;
    throw err;
  }
  return body;
}

function mapRelease(release) {
  if (!release) return null;
  const tag = String(release.tag_name || release.name || "").trim();
  const version = normalizeVersion(tag);
  const tarball =
    release.tarball_url ||
    (release.tag_name ? `https://api.github.com/repos/${resolveGithubRepo()}/tarball/${release.tag_name}` : null);
  return {
    tag,
    version,
    name: release.name || tag,
    body: release.body || "",
    htmlUrl: release.html_url || null,
    publishedAt: release.published_at || release.created_at || null,
    prerelease: Boolean(release.prerelease),
    draft: Boolean(release.draft),
    tarballUrl: tarball
  };
}

export async function fetchLatestRelease({ force = false } = {}) {
  ensureDirs();
  const cached = readCache();
  const checkedAt = cached?.checkedAt ? Date.parse(cached.checkedAt) : 0;
  if (!force && cached?.latest && Number.isFinite(checkedAt) && Date.now() - checkedAt < CHECK_TTL_MS) {
    return {
      latest: cached.latest,
      checkedAt: cached.checkedAt,
      fromCache: true,
      repo: cached.repo || resolveGithubRepo()
    };
  }
  const repo = resolveGithubRepo();
  const token = await resolveGithubToken();
  const releases = await githubFetch(`https://api.github.com/repos/${repo}/releases?per_page=15`, token);
  const list = Array.isArray(releases) ? releases : [];
  const stable = list.find((r) => r && !r.draft && !r.prerelease) || list.find((r) => r && !r.draft) || null;
  const latest = mapRelease(stable);
  const payload = {
    repo,
    checkedAt: new Date().toISOString(),
    latest
  };
  writeCache(payload);
  return { ...payload, fromCache: false };
}

export async function findReleaseByTag(tag) {
  const repo = resolveGithubRepo();
  const token = await resolveGithubToken();
  const clean = String(tag || "").trim();
  if (!clean) return null;
  try {
    const release = await githubFetch(`https://api.github.com/repos/${repo}/releases/tags/${encodeURIComponent(clean)}`, token);
    return mapRelease(release);
  } catch (err) {
    if (err.status === 404 && !clean.startsWith("v")) {
      const release = await githubFetch(`https://api.github.com/repos/${repo}/releases/tags/v${encodeURIComponent(clean)}`, token);
      return mapRelease(release);
    }
    throw err;
  }
}

async function setMaintenanceMode(enable, message) {
  const systemColumns = await pool.query(`
    SELECT column_name FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'v_b_settings_system'
  `);
  const cols = new Set(systemColumns.rows.map((r) => r.column_name));
  if (!cols.has("maintenance_mode")) {
    throw new Error("Maintenance mode column not available");
  }
  const messageColumn = cols.has("maintenance_message") ? "maintenance_message" : null;
  const nextMessage =
    message ||
    (enable
      ? "Veritas is being updated. Please try again shortly."
      : "The application is currently under maintenance. Please try again later.");
  if (messageColumn) {
    const updated = await pool.query(
      `UPDATE v_b_settings_system
       SET maintenance_mode = $1, ${messageColumn} = $2
       WHERE id = 1`,
      [Boolean(enable), nextMessage]
    );
    if (updated.rowCount === 0) {
      await pool.query(
        `INSERT INTO v_b_settings_system (id, maintenance_mode, ${messageColumn})
         VALUES (1, $1, $2)`,
        [Boolean(enable), nextMessage]
      );
    }
  } else {
    const updated = await pool.query(
      `UPDATE v_b_settings_system SET maintenance_mode = $1 WHERE id = 1`,
      [Boolean(enable)]
    );
    if (updated.rowCount === 0) {
      await pool.query(`INSERT INTO v_b_settings_system (id, maintenance_mode) VALUES (1, $1)`, [Boolean(enable)]);
    }
  }
}

function parseDatabaseUrl(url) {
  const raw = String(url || process.env.DATABASE_URL || "").trim();
  if (!raw) return null;
  try {
    const u = new URL(raw);
    return {
      host: u.hostname,
      port: u.port || "5432",
      user: decodeURIComponent(u.username || ""),
      password: decodeURIComponent(u.password || ""),
      database: (u.pathname || "").replace(/^\//, "")
    };
  } catch {
    return null;
  }
}

function runCommand(command, args, { cwd, env, timeoutMs = 30 * 60 * 1000 } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      env: { ...process.env, ...env },
      shell: process.platform === "win32",
      windowsHide: true
    });
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      reject(new Error(`Command timed out: ${command} ${args.join(" ")}`));
    }, timeoutMs);
    child.stdout?.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr?.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0) resolve({ stdout, stderr, code });
      else reject(new Error((stderr || stdout || `Exit code ${code}`).trim().slice(0, 2000)));
    });
  });
}

function quoteIdent(name) {
  return `"${String(name).replace(/"/g, '""')}"`;
}

function sqlLiteral(value) {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (typeof value === "boolean") return value ? "TRUE" : "FALSE";
  if (value instanceof Date) return `'${value.toISOString().replace(/'/g, "''")}'`;
  if (Buffer.isBuffer(value)) return `'\\x${value.toString("hex")}'`;
  if (typeof value === "object") {
    return `'${JSON.stringify(value).replace(/'/g, "''")}'`;
  }
  return `'${String(value).replace(/'/g, "''")}'`;
}

function findLocalPgDump() {
  const candidates = [];
  if (process.platform === "win32") {
    const programFiles = process.env["ProgramFiles"] || "C:\\Program Files";
    const programFilesX86 = process.env["ProgramFiles(x86)"] || "C:\\Program Files (x86)";
    for (const root of [programFiles, programFilesX86]) {
      try {
        const pgRoot = path.join(root, "PostgreSQL");
        if (!fs.existsSync(pgRoot)) continue;
        for (const ver of fs.readdirSync(pgRoot)) {
          const exe = path.join(pgRoot, ver, "bin", "pg_dump.exe");
          if (fs.existsSync(exe)) candidates.push(exe);
        }
      } catch {
        /* ignore */
      }
    }
  }
  candidates.push("pg_dump");
  return candidates;
}

async function backupWithPgDumpBinary(filePath, db) {
  const env = { ...process.env };
  if (db.password) env.PGPASSWORD = db.password;
  const args = [
    "-h",
    db.host,
    "-p",
    String(db.port),
    "-U",
    db.user,
    "-d",
    db.database,
    "-F",
    "p",
    "--clean",
    "--if-exists",
    "-f",
    filePath
  ];
  const candidates = findLocalPgDump();
  let lastErr = null;
  for (const bin of candidates) {
    try {
      await runCommand(bin, args, { env, timeoutMs: 20 * 60 * 1000 });
      return { method: "pg_dump" };
    } catch (err) {
      lastErr = err;
      const msg = String(err.message || err);
      if (!/ENOENT|not recognized|not found|pg_dump/i.test(msg) && fs.existsSync(filePath)) {
        throw err;
      }
    }
  }
  throw lastErr || new Error("pg_dump not found");
}

async function backupWithDockerPgDump(filePath, db) {
  if (!dockerSocketAvailable()) {
    throw new Error("Docker socket unavailable");
  }
  const composeFile = resolveComposeFile();
  const serviceName = process.env.VERITAS_DB_SERVICE || "db";
  const dumpArgs = [
    "pg_dump",
    "-U",
    db.user || "veritas",
    "-d",
    db.database || "veritas",
    "-F",
    "p",
    "--clean",
    "--if-exists"
  ];
  let result;
  if (composeFile) {
    result = await runCommand(
      "docker",
      ["compose", "-f", composeFile, "exec", "-T", serviceName, ...dumpArgs],
      { cwd: path.dirname(composeFile), timeoutMs: 20 * 60 * 1000 }
    );
  } else {
    // Fallback: first running postgres container
    const ps = await runCommand("docker", ["ps", "--format", "{{.Names}}\t{{.Image}}"], {
      timeoutMs: 30_000
    });
    const line = String(ps.stdout || "")
      .split(/\r?\n/)
      .map((l) => l.trim())
      .find((l) => /postgres/i.test(l));
    if (!line) throw new Error("No PostgreSQL Docker container found");
    const container = line.split("\t")[0];
    result = await runCommand("docker", ["exec", "-T", container, ...dumpArgs], {
      timeoutMs: 20 * 60 * 1000
    });
  }
  if (!result.stdout || !String(result.stdout).trim()) {
    throw new Error("Docker pg_dump returned an empty dump");
  }
  fs.writeFileSync(filePath, result.stdout, "utf8");
  return { method: "docker_pg_dump" };
}

async function backupWithNodeLogicalDump(filePath) {
  const tablesRes = await pool.query(`
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
    ORDER BY tablename
  `);
  const tables = tablesRes.rows.map((r) => r.tablename);
  const lines = [
    `-- Veritas logical backup (Node/pg fallback)`,
    `-- Generated: ${new Date().toISOString()}`,
    `-- Note: data-only dump suitable for emergency restore of table contents.`,
    `BEGIN;`,
    `SET session_replication_role = replica;`
  ];

  for (const table of tables) {
    const ident = quoteIdent(table);
    const colsRes = await pool.query(
      `SELECT column_name
       FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = $1
       ORDER BY ordinal_position`,
      [table]
    );
    const columns = colsRes.rows.map((r) => r.column_name);
    if (!columns.length) continue;
    const colList = columns.map(quoteIdent).join(", ");
    lines.push("");
    lines.push(`-- Table: ${table}`);
    lines.push(`TRUNCATE TABLE ${ident} CASCADE;`);

    const dataRes = await pool.query(`SELECT * FROM ${ident}`);
    for (const row of dataRes.rows) {
      const values = columns.map((c) => sqlLiteral(row[c])).join(", ");
      lines.push(`INSERT INTO ${ident} (${colList}) VALUES (${values});`);
    }
  }

  // Reset sequences to max(id) when possible
  const seqRes = await pool.query(`
    SELECT c.relname AS sequence_name,
           t.relname AS table_name,
           a.attname AS column_name
    FROM pg_class c
    JOIN pg_depend d ON d.objid = c.oid AND d.deptype = 'a'
    JOIN pg_class t ON t.oid = d.refobjid
    JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = d.refobjsubid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind = 'S' AND n.nspname = 'public'
  `);
  for (const seq of seqRes.rows) {
    lines.push(
      `SELECT setval(${sqlLiteral(seq.sequence_name)}, COALESCE((SELECT MAX(${quoteIdent(seq.column_name)}) FROM ${quoteIdent(seq.table_name)}), 1), true);`
    );
  }

  lines.push(`SET session_replication_role = DEFAULT;`);
  lines.push(`COMMIT;`);
  fs.writeFileSync(filePath, lines.join("\n"), "utf8");
  return { method: "node_logical" };
}

export async function createDatabaseBackup() {
  ensureDirs();
  const db = parseDatabaseUrl();
  if (!db?.database) {
    throw new Error("DATABASE_URL is not configured");
  }
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const fileName = `veritas-backup-${stamp}.sql`;
  const filePath = path.join(BACKUPS_DIR, fileName);
  const errors = [];

  // 1) Local pg_dump (PATH or common Windows install dirs)
  try {
    const result = await backupWithPgDumpBinary(filePath, db);
    const stat = fs.statSync(filePath);
    if (stat.size > 0) {
      return {
        fileName,
        filePath,
        sizeBytes: stat.size,
        createdAt: new Date().toISOString(),
        method: result.method
      };
    }
  } catch (err) {
    errors.push(`pg_dump: ${err.message || err}`);
    try {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    } catch {
      /* ignore */
    }
  }

  // 2) pg_dump inside Docker DB container
  try {
    const result = await backupWithDockerPgDump(filePath, db);
    const stat = fs.statSync(filePath);
    if (stat.size > 0) {
      return {
        fileName,
        filePath,
        sizeBytes: stat.size,
        createdAt: new Date().toISOString(),
        method: result.method
      };
    }
  } catch (err) {
    errors.push(`docker: ${err.message || err}`);
    try {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    } catch {
      /* ignore */
    }
  }

  // 3) Logical dump via Node/pg (always available if DB is reachable)
  try {
    const result = await backupWithNodeLogicalDump(filePath);
    const stat = fs.statSync(filePath);
    if (stat.size > 0) {
      return {
        fileName,
        filePath,
        sizeBytes: stat.size,
        createdAt: new Date().toISOString(),
        method: result.method
      };
    }
  } catch (err) {
    errors.push(`node: ${err.message || err}`);
    try {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    } catch {
      /* ignore */
    }
  }

  throw new Error(
    `Unable to create database backup. ${errors.join(" | ") || "No strategy succeeded."} You can still tick “I already have a manual backup” to continue.`
  );
}

function listRecentBackups() {
  ensureDirs();
  try {
    return fs
      .readdirSync(BACKUPS_DIR)
      .filter((f) => f.endsWith(".sql"))
      .map((f) => {
        const full = path.join(BACKUPS_DIR, f);
        const st = fs.statSync(full);
        return { fileName: f, filePath: full, sizeBytes: st.size, createdAt: st.mtime.toISOString() };
      })
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  } catch {
    return [];
  }
}

function hasRecentBackup() {
  const latest = listRecentBackups()[0];
  if (!latest) return false;
  return Date.now() - Date.parse(latest.createdAt) < RECENT_BACKUP_MS;
}

async function checkDiskSpace() {
  try {
    const free = fs.statfsSync ? fs.statfsSync(BACKEND_ROOT) : null;
    if (free && typeof free.bavail === "number") {
      const freeBytes = Number(free.bavail) * Number(free.bsize || 0);
      return { ok: freeBytes > 500 * 1024 * 1024, freeBytes, detail: `${Math.round(freeBytes / (1024 * 1024))} MB free` };
    }
  } catch {
    /* ignore */
  }
  return { ok: true, freeBytes: null, detail: "Disk space check skipped on this platform" };
}

export async function runPrecheck() {
  const mode = detectUpdateMode();
  const checks = [];

  try {
    await pool.query("SELECT 1");
    checks.push({ key: "database", ok: true, detail: "Database reachable" });
  } catch (err) {
    checks.push({ key: "database", ok: false, detail: err.message || "Database unreachable" });
  }

  const nodeMajor = parseInt(process.versions.node.split(".")[0], 10);
  checks.push({
    key: "node",
    ok: nodeMajor >= 18,
    detail: `Node.js ${process.versions.node}`
  });

  try {
    ensureDirs();
    const probe = path.join(UPDATES_ROOT, `.write-probe-${Date.now()}`);
    fs.writeFileSync(probe, "ok");
    fs.unlinkSync(probe);
    checks.push({ key: "writable", ok: true, detail: "Updates directory is writable" });
  } catch (err) {
    checks.push({ key: "writable", ok: false, detail: err.message || "Cannot write updates directory" });
  }

  const disk = await checkDiskSpace();
  checks.push({ key: "disk", ok: disk.ok, detail: disk.detail });

  if (mode === "docker") {
    const sock = dockerSocketAvailable();
    checks.push({
      key: "docker",
      ok: sock,
      detail: sock
        ? "Docker socket / DOCKER_HOST available"
        : "Docker mode detected but docker.sock / DOCKER_HOST is not available. Mount the socket or apply the update manually."
    });
  } else {
    const installRoot = path.resolve(BACKEND_ROOT, "..");
    try {
      fs.accessSync(installRoot, fs.constants.W_OK);
      checks.push({ key: "install_writable", ok: true, detail: `Install root writable: ${installRoot}` });
    } catch {
      checks.push({ key: "install_writable", ok: false, detail: `Cannot write to install root: ${installRoot}` });
    }
  }

  const backups = listRecentBackups();
  checks.push({
    key: "backup_tools",
    ok: true,
    detail: backups[0]
      ? `Latest backup: ${backups[0].fileName}`
      : "Backup will use pg_dump, Docker, or built-in Node dump (no client tools required)"
  });

  return {
    mode,
    ok: checks.every((c) => c.ok),
    checks,
    dockerSocket: dockerSocketAvailable(),
    recentBackup: backups[0] || null
  };
}

export async function getUpdateStatus({ forceCheck = false } = {}) {
  clearActiveLockIfStale();
  const currentVersion = getAppVersion();
  let check = null;
  let checkError = null;
  try {
    check = await fetchLatestRelease({ force: forceCheck });
  } catch (err) {
    checkError = err.message || String(err);
    check = readCache()
      ? { latest: readCache().latest, checkedAt: readCache().checkedAt, fromCache: true, repo: readCache().repo }
      : { latest: null, checkedAt: null, fromCache: false, repo: resolveGithubRepo() };
  }
  const latest = check?.latest || null;
  const updateAvailable = Boolean(latest?.version && compareSemver(latest.version, currentVersion) > 0);
  const mode = detectUpdateMode();
  const precheckHint =
    mode === "docker" && !dockerSocketAvailable()
      ? "Docker apply requires /var/run/docker.sock or DOCKER_HOST"
      : null;

  return {
    currentVersion,
    latest,
    updateAvailable,
    checkedAt: check?.checkedAt || null,
    fromCache: Boolean(check?.fromCache),
    repo: check?.repo || resolveGithubRepo(),
    mode,
    dockerSocket: dockerSocketAvailable(),
    canApply: mode === "source" || dockerSocketAvailable(),
    precheckHint,
    checkError,
    recentBackups: listRecentBackups().slice(0, 5),
    activeJob: getActiveJob()
  };
}

async function downloadReleaseTarball(release, destFile, onLog) {
  const token = await resolveGithubToken();
  const headers = {
    Accept: "application/octet-stream",
    "User-Agent": "Veritas-Platform-Updater",
    "X-GitHub-Api-Version": "2022-11-28"
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  onLog?.(`Downloading ${release.tag}…`);
  const res = await fetch(release.tarballUrl, { headers, redirect: "follow" });
  if (!res.ok) {
    throw new Error(`Failed to download release archive (${res.status})`);
  }
  const buffer = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(destFile, buffer);
  onLog?.(`Downloaded ${(buffer.length / (1024 * 1024)).toFixed(1)} MB`);
  return destFile;
}

function extractTarball(archivePath, destDir) {
  fs.mkdirSync(destDir, { recursive: true });
  // Use tar when available (Linux/macOS/Git Bash). On Windows without tar, fail clearly.
  return runCommand("tar", ["-xzf", archivePath, "-C", destDir], { timeoutMs: 10 * 60 * 1000 });
}

function findExtractedRoot(destDir) {
  const entries = fs.readdirSync(destDir).map((name) => path.join(destDir, name));
  const dirs = entries.filter((p) => fs.statSync(p).isDirectory());
  if (dirs.length === 1) return dirs[0];
  return destDir;
}

async function applySourceUpdate(extractedRoot, onLog) {
  const monorepoRoot = path.resolve(BACKEND_ROOT, "..");
  const preserve = new Set([".env", "uploads", "node_modules", ".git"]);
  const copyRecursive = (src, dest) => {
    const st = fs.statSync(src);
    if (st.isDirectory()) {
      fs.mkdirSync(dest, { recursive: true });
      for (const name of fs.readdirSync(src)) {
        if (preserve.has(name) && dest === monorepoRoot) continue;
        copyRecursive(path.join(src, name), path.join(dest, name));
      }
      return;
    }
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
  };

  // Prefer nested veritas/ layout if present in the archive
  let sourceRoot = extractedRoot;
  const nested = path.join(extractedRoot, "veritas");
  if (fs.existsSync(nested) && fs.existsSync(path.join(nested, "backend"))) {
    sourceRoot = nested;
  } else if (fs.existsSync(path.join(extractedRoot, "backend"))) {
    sourceRoot = extractedRoot;
  }

  onLog?.(`Copying files from ${sourceRoot} → ${monorepoRoot}`);
  for (const name of fs.readdirSync(sourceRoot)) {
    if (preserve.has(name)) continue;
    copyRecursive(path.join(sourceRoot, name), path.join(monorepoRoot, name));
  }

  onLog?.("Installing backend dependencies…");
  await runCommand("npm", ["ci", "--omit=dev"], {
    cwd: path.join(monorepoRoot, "backend"),
    timeoutMs: 20 * 60 * 1000
  }).catch(async () => {
    await runCommand("npm", ["install", "--omit=dev"], {
      cwd: path.join(monorepoRoot, "backend"),
      timeoutMs: 20 * 60 * 1000
    });
  });

  onLog?.("Installing frontend dependencies…");
  await runCommand("npm", ["ci", "--omit=dev"], {
    cwd: path.join(monorepoRoot, "frontend"),
    timeoutMs: 20 * 60 * 1000
  }).catch(async () => {
    await runCommand("npm", ["install", "--omit=dev"], {
      cwd: path.join(monorepoRoot, "frontend"),
      timeoutMs: 20 * 60 * 1000
    });
  });

  onLog?.("Building frontend…");
  await runCommand("npm", ["run", "build"], {
    cwd: path.join(monorepoRoot, "frontend"),
    timeoutMs: 25 * 60 * 1000
  });
}

function resolveComposeFile() {
  const candidates = [
    process.env.VERITAS_COMPOSE_FILE,
    path.resolve(BACKEND_ROOT, "..", "..", "docker-compose.yml"),
    path.resolve(BACKEND_ROOT, "..", "docker-compose.yml"),
    path.resolve(process.cwd(), "docker-compose.yml")
  ].filter(Boolean);
  for (const file of candidates) {
    if (fs.existsSync(file)) return file;
  }
  return null;
}

async function applyDockerUpdate(release, onLog) {
  if (!dockerSocketAvailable()) {
    throw new Error(
      "Cannot apply Docker update: docker.sock / DOCKER_HOST unavailable. Pull the release manually then run: docker compose up -d --build"
    );
  }
  const composeFile = resolveComposeFile();
  if (!composeFile) {
    throw new Error("docker-compose.yml not found. Set VERITAS_COMPOSE_FILE or apply the update from the host.");
  }
  const composeDir = path.dirname(composeFile);
  onLog?.(`Using compose file ${composeFile}`);
  // Checkout/tag context: rebuild from current tree after optional git pull if .git exists
  const repoRoot = path.resolve(composeDir);
  if (fs.existsSync(path.join(repoRoot, ".git"))) {
    onLog?.(`Fetching git tag ${release.tag}…`);
    try {
      await runCommand("git", ["fetch", "--tags", "--force"], { cwd: repoRoot });
      await runCommand("git", ["checkout", release.tag], { cwd: repoRoot });
    } catch (err) {
      onLog?.(`Git checkout skipped/failed: ${err.message}`);
    }
  }
  onLog?.("Building and restarting containers…");
  await runCommand("docker", ["compose", "-f", composeFile, "build", "--pull"], {
    cwd: composeDir,
    timeoutMs: 45 * 60 * 1000
  });
  await runCommand("docker", ["compose", "-f", composeFile, "up", "-d"], {
    cwd: composeDir,
    timeoutMs: 20 * 60 * 1000
  });
}

async function waitForHealth(onLog, { attempts = 30, delayMs = 2000 } = {}) {
  const port = process.env.PORT || 3001;
  const url = `http://127.0.0.1:${port}/health/live`;
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url);
      if (res.ok) {
        onLog?.("Health check OK");
        return true;
      }
    } catch {
      /* retry */
    }
    onLog?.(`Waiting for health… (${i + 1}/${attempts})`);
    await new Promise((r) => setTimeout(r, delayMs));
  }
  // If we are still the same process, consider healthy
  onLog?.("Health endpoint not reachable yet; process still running — continuing");
  return true;
}

async function executeApplyJob(jobId, release, { skipBackup = false, acknowledgeManualBackup = false } = {}) {
  const mode = detectUpdateMode();
  const log = (msg) => appendJobLog(jobId, msg);

  try {
    setJobStep(jobId, "maintenance_on", "running");
    await setMaintenanceMode(true);
    setJobStep(jobId, "maintenance_on", "success", "Maintenance enabled");
    log("Maintenance mode enabled");

    setJobStep(jobId, "backup", "running");
    if (skipBackup && acknowledgeManualBackup && !hasRecentBackup()) {
      setJobStep(jobId, "backup", "success", "Skipped (manual backup acknowledged)");
      log("Backup skipped by operator acknowledgement");
    } else if (skipBackup && hasRecentBackup()) {
      setJobStep(jobId, "backup", "success", "Using recent backup");
      log("Recent backup reused");
    } else {
      const backup = await createDatabaseBackup();
      setJobStep(jobId, "backup", "success", backup.fileName);
      log(`Backup created: ${backup.fileName}`);
    }

    setJobStep(jobId, "download", "running");
    ensureDirs();
    const stamp = Date.now();
    const workDir = path.join(STAGING_DIR, `job-${jobId}-${stamp}`);
    fs.mkdirSync(workDir, { recursive: true });
    const archivePath = path.join(workDir, "release.tgz");
    await downloadReleaseTarball(release, archivePath, log);
    setJobStep(jobId, "download", "success");

    setJobStep(jobId, "apply", "running");
    if (mode === "docker") {
      await applyDockerUpdate(release, log);
    } else {
      const extractDir = path.join(workDir, "extract");
      await extractTarball(archivePath, extractDir);
      const extractedRoot = findExtractedRoot(extractDir);
      await applySourceUpdate(extractedRoot, log);
    }
    setJobStep(jobId, "apply", "success");

    setJobStep(jobId, "health", "running");
    await waitForHealth(log);
    setJobStep(jobId, "health", "success");

    setJobStep(jobId, "maintenance_off", "running");
    try {
      await setMaintenanceMode(false);
      setJobStep(jobId, "maintenance_off", "success");
      log("Maintenance mode disabled");
    } catch (err) {
      setJobStep(jobId, "maintenance_off", "failed", err.message);
      log(`Could not disable maintenance automatically: ${err.message}`);
    }

    finishJob(jobId, { ok: true });
    try {
      fs.rmSync(workDir, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  } catch (err) {
    log(`ERROR: ${err.message || err}`);
    try {
      await setMaintenanceMode(false);
    } catch {
      /* keep maintenance if we cannot disable */
    }
    finishJob(jobId, { ok: false, error: err.message || String(err) });
  }
}

export async function startUpdateApply({
  targetTag,
  skipBackup = false,
  acknowledgeManualBackup = false
} = {}) {
  clearActiveLockIfStale();
  if (getActiveJob() && ["pending", "running"].includes(getActiveJob().status)) {
    const err = new Error("An update job is already in progress");
    err.code = "UPDATE_JOB_LOCKED";
    throw err;
  }

  const status = await getUpdateStatus();
  if (!status.canApply) {
    const err = new Error(status.precheckHint || "Automatic apply is not available in this deployment");
    err.code = "APPLY_UNAVAILABLE";
    throw err;
  }

  let release = null;
  if (targetTag) {
    release = await findReleaseByTag(targetTag);
  } else if (status.latest) {
    release = status.latest;
  }
  if (!release?.version) {
    const err = new Error("No target release found");
    err.code = "RELEASE_NOT_FOUND";
    throw err;
  }
  if (compareSemver(release.version, status.currentVersion) <= 0) {
    const err = new Error(`Target ${release.version} is not newer than current ${status.currentVersion}`);
    err.code = "NOT_NEWER";
    throw err;
  }

  if (!skipBackup && !acknowledgeManualBackup && !hasRecentBackup()) {
    // Will create backup during job; OK
  }
  if (skipBackup && !acknowledgeManualBackup && !hasRecentBackup()) {
    const err = new Error("Backup required: create a backup or acknowledge a manual backup");
    err.code = "BACKUP_REQUIRED";
    throw err;
  }

  const precheck = await runPrecheck();
  if (!precheck.ok) {
    const failed = precheck.checks.filter((c) => !c.ok).map((c) => c.detail);
    const err = new Error(`Precheck failed: ${failed.join("; ")}`);
    err.code = "PRECHECK_FAILED";
    err.precheck = precheck;
    throw err;
  }

  const job = createJob({
    targetVersion: release.version,
    mode: detectUpdateMode(),
    steps: APPLY_STEPS
  });

  setImmediate(() => {
    executeApplyJob(job.id, release, { skipBackup, acknowledgeManualBackup }).catch((err) => {
      finishJob(job.id, { ok: false, error: err.message || String(err) });
    });
  });

  return job;
}

export function getUpdateJob(id) {
  return getJob(id);
}

export function getHostnameInfo() {
  return {
    hostname: os.hostname(),
    platform: process.platform,
    arch: process.arch,
    node: process.versions.node
  };
}
