import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { pool } from "../database/db.js";
import { canRunAutoSchemaMigrations } from "../utils/setupState.js";
import { invalidateContactClientLinksCache } from "./contactClientLinks.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const MIGRATION_FILE = "schema/patches/20260811_contact_client_links.sql";
let ensured = false;

async function tableExists(client) {
  const { rows } = await client.query(
    `SELECT 1 FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name = 'v_b_contact_client_links'
     LIMIT 1`
  );
  return rows.length > 0;
}

export async function ensureContactClientLinksSchema() {
  if (ensured) return true;
  if (!(await canRunAutoSchemaMigrations())) return false;
  const client = await pool.connect();
  try {
    if (await tableExists(client)) {
      ensured = true;
      invalidateContactClientLinksCache();
      return true;
    }
    const filePath = path.join(root, MIGRATION_FILE);
    if (!fs.existsSync(filePath)) {
      console.warn("[contact-client-links] Migration not found:", MIGRATION_FILE);
      return false;
    }
    await client.query(fs.readFileSync(filePath, "utf8"));
    ensured = true;
    invalidateContactClientLinksCache();
    console.log("[contact-client-links] Applied", MIGRATION_FILE);
    return true;
  } catch (err) {
    console.error("[contact-client-links] Automatic migration failed:", err.message);
    return false;
  } finally {
    client.release();
  }
}

export async function hasContactClientLinksTableEnsured() {
  await ensureContactClientLinksSchema();
  try {
    const { rows } = await pool.query(`SELECT to_regclass('public.v_b_contact_client_links') AS reg`);
    return Boolean(rows[0]?.reg);
  } catch {
    return false;
  }
}
