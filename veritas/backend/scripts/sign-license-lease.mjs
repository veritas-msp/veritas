/**
 * Sign a Pro license lease with the billing private key.
 * Run this on the billing host only. The private key must not be copied into a Veritas instance.
 *
 *   node scripts/sign-license-lease.mjs --key VRT-PRO-XXXX-XXXX-XXXX-XXXX --agents 40 --days 14 --company "ACME" --email client@example.com
 *
 * Private key: BILLING_LEASE_PRIVATE_KEY_FILE or <repo>/.license/billing-ed25519-private.pem
 */
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  LICENSE_LEASE_ALG,
  LICENSE_LEASE_ISSUER,
  LICENSE_LEASE_VERSION,
} from "../constants/licenseTrust.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const defaultKeyPath = path.resolve(__dirname, "../../../.license/billing-ed25519-private.pem");

function arg(name, fallback = "") {
  const index = process.argv.indexOf(`--${name}`);
  if (index === -1 || !process.argv[index + 1]) return fallback;
  return process.argv[index + 1];
}

const licenseKey = String(arg("key")).trim().toUpperCase();
const agents = Number(arg("agents", "1"));
const days = Number(arg("days", "14"));
const company = arg("company") || null;
const email = arg("email") || null;
const interval = arg("interval", "manual");
const status = arg("status", "active");
const subscriptionExpiresAt = arg("expires") || null;
const keyPath = process.env.BILLING_LEASE_PRIVATE_KEY_FILE || defaultKeyPath;

if (!/^VRT-PRO-(?:[A-F0-9]{4}-){3}[A-F0-9]{4}$/.test(licenseKey)) {
  console.error("Missing or invalid --key (expected VRT-PRO-XXXX-XXXX-XXXX-XXXX).");
  process.exit(1);
}
if (!fs.existsSync(keyPath)) {
  console.error(`Private key not found: ${keyPath}`);
  process.exit(1);
}

const now = Math.floor(Date.now() / 1000);
const payload = {
  v: LICENSE_LEASE_VERSION,
  alg: LICENSE_LEASE_ALG,
  iss: LICENSE_LEASE_ISSUER,
  licenseKey,
  agentCount: Number.isFinite(agents) ? agents : 1,
  billingInterval: interval,
  customerEmail: email,
  companyName: company,
  status,
  subscriptionExpiresAt: subscriptionExpiresAt || null,
  iat: now,
  exp: now + Math.max(1, days) * 24 * 60 * 60,
};
const payloadB64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
const privateKey = crypto.createPrivateKey(fs.readFileSync(keyPath));
const sig = crypto.sign(null, Buffer.from(payloadB64), privateKey).toString("base64url");
const document = {
  lease: `${payloadB64}.${sig}`,
  licenseKey,
  expiresAt: new Date(payload.exp * 1000).toISOString(),
  companyName: company,
  customerEmail: email,
  agentCount: payload.agentCount,
  status,
};
process.stdout.write(`${JSON.stringify(document, null, 2)}\n`);
