import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../src/components");
const STYLES = path.resolve(__dirname, "../src/styles");
const OUT = path.resolve(__dirname, "_fr-remaining-hardcoded.txt");

const ACCENT = /[\u00C0-\u00FF\u0152\u0153\u0178]/;
const SKIP = /(I18n|Translations|i18n)/i;

function extractStringLiterals(src) {
  const out = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (c === "'" || c === '"' || c === "`") {
      const quote = c;
      let j = i + 1;
      let buf = "";
      let closed = false;
      while (j < src.length) {
        const d = src[j];
        if (d === "\\") {
          buf += src[j + 1] ?? "";
          j += 2;
          continue;
        }
        if (quote === "`" && d === "$" && src[j + 1] === "{") {
          out.push(buf);
          i = j;
          closed = true;
          break;
        }
        if (d === quote) {
          out.push(buf);
          i = j + 1;
          closed = true;
          break;
        }
        buf += d;
        j++;
      }
      if (!closed) i++;
      continue;
    }
    i++;
  }
  return out;
}

function walk(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === "AdminPage" || e.name === "node_modules") continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, acc);
    else if (/\.(js|jsx)$/.test(e.name) && !SKIP.test(e.name) && !/\.fr\.js$/i.test(e.name)) {
      acc.push(p);
    }
  }
  return acc;
}

const files = [...walk(ROOT), ...walk(STYLES)];
const hits = [];
for (const f of files) {
  const src = fs.readFileSync(f, "utf8");
  const accents = extractStringLiterals(src).filter((lit) => ACCENT.test(lit));
  if (accents.length) {
    hits.push({
      path: path.relative(path.resolve(__dirname, ".."), f).replace(/\\/g, "/"),
      count: accents.length,
      samples: accents.slice(0, 3),
    });
  }
}
hits.sort((a, b) => a.path.localeCompare(b.path));

const lines = [
  "Remaining hardcoded French accent strings (excl. *I18n* / *Translations* / *.fr.js / AdminPage): " + hits.length,
  "Scanned files: " + files.length,
  "",
  ...hits.map((h) => h.path + " (" + h.count + ") e.g. " + JSON.stringify(h.samples[0] || "").slice(0, 80)),
  "",
];
fs.writeFileSync(OUT, lines.join("\n"), "utf8");
console.log("remaining=" + hits.length + " scanned=" + files.length);
console.log("Wrote " + OUT);