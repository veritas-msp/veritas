import { spawn, execFileSync } from "child_process";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

const uiUrl = process.env.VERITAS_DEV_URL || "http://localhost:3000";
const apiUrl = process.env.VERITAS_API_URL || "http://localhost:3001";

const c = {
  reset: "\x1b[0m",
  dim: "\x1b[2m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  cyan: "\x1b[36m"
};

function banner(mode, ui, api) {
  console.log(`
${c.cyan}  Veritas${c.reset} � ${mode}
  ${ui}
  ${c.dim}${api}${c.reset}
`);
}

const HIDE = [
  /^\s*$/,
  /^>\s/,
  /^npm /i,
  /DeprecationWarning/,
  /Passing args to a child process with shell/,
  /trace-deprecation/,
  /Starting the development server/,
  /You can now view /,
  /Local:\s+http/,
  /On Your Network:/,
  /Note that the development build/,
  /To create a production build/,
  /webpack compiled/i,
  /Compiling\.\.\./,
  /Compiled successfully/i,
  /Compiled with warnings/i,
  /Files successfully emitted/,
  /API pr�te/,
  /^\s*Line \d+:/,
  /^src[\\/]/,
  /react-hooks\//,
  /no-unused-vars/,
  /jsx-a11y\//,
  /Search for the keywords/,
  /Watchpack Error/i
];

function isRealError(line) {
  return (
    /\bFailed to compile\b/i.test(line) ||
    /\bEADDRINUSE\b/.test(line) ||
    /already running on port/i.test(line) ||
    /\bCannot find module\b/i.test(line) ||
    /\bModule not found\b/i.test(line) ||
    /\bSyntaxError\b/i.test(line) ||
    /syntax error/i.test(line) ||
    /Unexpected \}/i.test(line) ||
    /\bReferenceError\b/.test(line) ||
    /\bTypeError\b/.test(line) ||
    /\bENOENT\b/.test(line) ||
    /^\s*Error:\s/.test(line)
  );
}

function stripAnsi(s) {
  return String(s).replace(/\x1b\[[0-9;]*m/g, "");
}

function resolveNpmCli() {
  const base = path.dirname(process.execPath);
  const candidates = [
    path.join(base, "node_modules", "npm", "bin", "npm-cli.js"),
    path.join(base, "..", "lib", "node_modules", "npm", "bin", "npm-cli.js"),
    path.join(base, "..", "node_modules", "npm", "bin", "npm-cli.js")
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

const npmCli = resolveNpmCli();

function spawnNpm(args, env = {}) {
  const childEnv = {
    ...process.env,
    FORCE_COLOR: "0",
    VERITAS_QUIET_BOOT: "1",
    BROWSER: "none",
    DISABLE_ESLINT_PLUGIN: "true",
    CI: "",
    NODE_OPTIONS: [process.env.NODE_OPTIONS, "--no-deprecation"].filter(Boolean).join(" "),
    ...env
  };
  if (npmCli) {
    return spawn(process.execPath, [npmCli, ...args], {
      cwd: root,
      env: childEnv,
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true
    });
  }
  const quoted = args.map(a => (/\s/.test(a) ? `"${a}"` : a)).join(" ");
  return spawn(`npm ${quoted}`, {
    cwd: root,
    env: childEnv,
    stdio: ["ignore", "pipe", "pipe"],
    shell: true,
    windowsHide: true
  });
}

function attachQuiet(child, { onCompiled } = {}) {
  for (const stream of [child.stdout, child.stderr]) {
    let buf = "";
    stream.setEncoding("utf8");
    stream.on("data", chunk => {
      buf += chunk;
      const parts = buf.split(/\r?\n/);
      buf = parts.pop() ?? "";
      for (const raw of parts) {
        const line = stripAnsi(raw);
        if (/Compiled successfully|Compiled with warnings/i.test(line)) {
          onCompiled?.();
          continue;
        }
        if (HIDE.some(re => re.test(line))) continue;
        if (isRealError(line)) console.log(`${c.red}${line}${c.reset}`);
      }
    });
  }
}

function killProcessTree(pid) {
  if (!pid) return;
  if (process.platform === "win32") {
    // child.kill() does not stop npm grandchildren on Windows
    try {
      execFileSync("taskkill", ["/pid", String(pid), "/T", "/F"], {
        stdio: "ignore",
        windowsHide: true
      });
    } catch {
      /* already exited */
    }
    return;
  }
  try {
    process.kill(pid, "SIGTERM");
  } catch {
    /* ignore */
  }
}

function shutdownOn(children) {
  let stopping = false;
  const stop = (code = 0) => {
    if (stopping) return;
    stopping = true;
    for (const child of children) {
      killProcessTree(child.pid);
    }
    setTimeout(() => process.exit(code), 250);
  };
  for (const child of children) {
    child.on("exit", (code, signal) => {
      if (stopping) return;
      const exitCode = code ?? (signal ? 1 : 0);
      if (exitCode !== 0) {
        console.log(`${c.dim}Stopped (code ${exitCode}).${c.reset}`);
      }
      stop(exitCode);
    });
  }
  process.on("SIGINT", () => stop(0));
  process.on("SIGTERM", () => stop(0));
  if (process.platform === "win32" && process.stdin.isTTY) {
    process.stdin.resume();
  }
  return stop;
}

banner("development", uiUrl, apiUrl);
process.stdout.write(`${c.dim}Starting�${c.reset}`);

let readyUi = false;
let readyApi = false;
let announced = false;

function maybeReady() {
  if (announced || !readyUi || !readyApi) return;
  announced = true;
  process.stdout.write(`\r${c.green}Ready${c.reset} � ${uiUrl}          \n`);
  console.log(`${c.green}API${c.reset}   � ${apiUrl}`);
}

async function waitApi(timeoutMs = 60000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`${apiUrl.replace(/\/$/, "")}/health/live`);
      if (res.ok) return true;
    } catch {
      /* retry */
    }
    await new Promise(r => setTimeout(r, 400));
  }
  return false;
}

const api = spawnNpm(["run", "dev", "--silent", "--prefix", "backend"]);
const ui = spawnNpm(["run", "start", "--silent", "--prefix", "frontend"]);

attachQuiet(api);
attachQuiet(ui, {
  onCompiled: () => {
    readyUi = true;
    maybeReady();
  }
});

shutdownOn([api, ui]);

waitApi().then(ok => {
  if (!ok) {
    console.log(`\n${c.red}API unreachable (${apiUrl}).${c.reset}`);
    return;
  }
  readyApi = true;
  maybeReady();
});
