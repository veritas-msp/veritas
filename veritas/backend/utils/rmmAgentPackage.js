import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BACKEND_DIR = path.resolve(__dirname, "..");
const VERITAS_ROOT = path.resolve(BACKEND_DIR, "..");
const AGENT_ROOT = path.resolve(VERITAS_ROOT, "RMM/Agents/windows");
const AGENT_DIST = path.join(AGENT_ROOT, "dist");
const AGENT_PUBLISH = path.join(AGENT_ROOT, "build/publish");

export const WINDOWS_INSTALLER_VERSION = "1.0.13";
const WINDOWS_MSI_FILE = "VeritasAgent-Windows-Setup.msi";

function parseVersionParts(version) {
  return String(version || "")
    .replace(/^v/i, "")
    .split(/[^\d]+/)
    .filter(Boolean)
    .map(part => Number.parseInt(part, 10) || 0);
}

/** True when `current` is strictly older than `latest` (semver-ish). */
export function isAgentVersionOlderThan(current, latest = WINDOWS_INSTALLER_VERSION) {
  const left = parseVersionParts(current);
  const right = parseVersionParts(latest);
  if (!left.length || !right.length) return Boolean(current && latest && String(current) !== String(latest));
  const len = Math.max(left.length, right.length);
  for (let i = 0; i < len; i += 1) {
    const a = left[i] || 0;
    const b = right[i] || 0;
    if (a < b) return true;
    if (a > b) return false;
  }
  return false;
}

export function getWindowsInstallerFilenames() {
  return {
    msi: WINDOWS_MSI_FILE
  };
}

function candidateMsiPaths() {
  return [
    path.join(AGENT_DIST, WINDOWS_MSI_FILE),
    path.join(AGENT_PUBLISH, WINDOWS_MSI_FILE),
    path.join(AGENT_ROOT, WINDOWS_MSI_FILE)
  ];
}

export function getWindowsMsiPath() {
  for (const filePath of candidateMsiPaths()) {
    if (fs.existsSync(filePath)) return filePath;
  }
  throw new Error(`Agent MSI not found under ${AGENT_ROOT}/dist`);
}

export function agentMsiAvailable() {
  try {
    getWindowsMsiPath();
    return true;
  } catch {
    return false;
  }
}

/** @deprecated ZIP/CMD installers removed — MSI only */
export function agentPackageAvailable() {
  return agentMsiAvailable();
}

export function ensureWindowsMsiBuilt() {
  if (agentMsiAvailable()) {
    return getWindowsMsiPath();
  }
  if (process.platform !== "win32") {
    throw new Error("MSI installer unavailable on this server (build on Windows with .NET SDK + WiX, or ship a prebuilt MSI in RMM/Agents/windows/dist)");
  }
  const buildScript = path.join(AGENT_ROOT, "build.ps1");
  if (!fs.existsSync(buildScript)) {
    throw new Error(`Agent build script missing: ${buildScript}`);
  }
  const result = spawnSync("powershell.exe", [
    "-NoProfile",
    "-ExecutionPolicy",
    "Bypass",
    "-File",
    buildScript,
    "-Version",
    WINDOWS_INSTALLER_VERSION
  ], {
    cwd: AGENT_ROOT,
    stdio: "pipe",
    encoding: "utf8",
    env: {
      ...process.env,
      VERITAS_INSTALLER_VERSION: WINDOWS_INSTALLER_VERSION
    }
  });
  if (result.status !== 0 || !agentMsiAvailable()) {
    const detail = (result.stderr || result.stdout || "").trim().split("\n").filter(Boolean).pop();
    throw new Error(detail || "MSI build failed — install .NET SDK + WiX Toolset and retry");
  }
  return getWindowsMsiPath();
}

function streamMsiFile(res, { forAgentUpdate = false } = {}) {
  const filePath = ensureWindowsMsiBuilt();
  const names = getWindowsInstallerFilenames();
  const size = fs.statSync(filePath).size;
  res.setHeader("Content-Type", "application/octet-stream");
  res.setHeader("Content-Length", String(size));
  res.setHeader("X-Veritas-Installer-Version", WINDOWS_INSTALLER_VERSION);
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
  res.setHeader("Pragma", "no-cache");
  if (forAgentUpdate) {
    res.setHeader("X-Veritas-Agent-Update", "1");
  }
  res.setHeader("Content-Disposition", `attachment; filename="${names.msi}"`);
  const stream = fs.createReadStream(filePath);
  stream.on("error", err => {
    if (!res.headersSent) {
      res.status(500).json({
        error: err.message || "Unable to read MSI"
      });
      return;
    }
    res.destroy(err);
  });
  stream.pipe(res);
}

export function streamWindowsSetupMsi(res) {
  streamMsiFile(res, { forAgentUpdate: false });
}

export function streamWindowsAgentUpdateMsi(res) {
  streamMsiFile(res, { forAgentUpdate: true });
}

/** @deprecated */
export function streamWindowsSetupScript() {
  throw new Error("CMD installer removed — download the MSI instead");
}

/** @deprecated */
export function streamWindowsSetupZip() {
  throw new Error("ZIP installer removed — download the MSI instead");
}

export function getAgentSourceRoot() {
  return AGENT_ROOT;
}
