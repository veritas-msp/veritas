#!/usr/bin/env node
/**
 * Builds the native Veritas Windows agent MSI from RMM/Agents/windows.
 */
import { spawnSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import { WINDOWS_INSTALLER_VERSION } from "../utils/rmmAgentPackage.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const agentRoot = path.resolve(__dirname, "../../RMM/Agents/windows");
const buildScript = path.join(agentRoot, "build.ps1");

if (process.platform !== "win32") {
  console.error("Windows agent MSI must be built on Windows (.NET SDK + WiX).");
  process.exit(1);
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
  cwd: agentRoot,
  stdio: "inherit",
  env: {
    ...process.env,
    VERITAS_INSTALLER_VERSION: WINDOWS_INSTALLER_VERSION
  }
});

process.exit(result.status ?? 1);
