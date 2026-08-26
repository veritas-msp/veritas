import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { pool } from "../database/db.js";
import { canRunAutoSchemaMigrations } from "../utils/setupState.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const MIGRATION_FILE = "schema/patches/20260826_users_portal_role.sql";
let ensured = false;

async function columnExists(client) {
  const { rows } = await client.query(
    `SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'v_b_users' AND column_name = 'portal_role'
     LIMIT 1`
  );
  return rows.length > 0;
}

export async function ensurePortalTicketRoleSchema() {
  if (ensured) return true;
  if (!(await canRunAutoSchemaMigrations())) {
    try {
      const { rows } = await pool.query(
        `SELECT 1 FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = 'v_b_users' AND column_name = 'portal_role'
         LIMIT 1`
      );
      ensured = rows.length > 0;
      return ensured;
    } catch {
      return false;
    }
  }
  const client = await pool.connect();
  try {
    if (await columnExists(client)) {
      ensured = true;
      return true;
    }
    const filePath = path.join(root, MIGRATION_FILE);
    if (!fs.existsSync(filePath)) {
      console.warn("[portal-role] Migration not found:", MIGRATION_FILE);
      return false;
    }
    await client.query(fs.readFileSync(filePath, "utf8"));
    ensured = true;
    console.log("[portal-role] Applied", MIGRATION_FILE);
    return true;
  } catch (err) {
    console.error("[portal-role] Automatic migration failed:", err.message);
    return false;
  } finally {
    client.release();
  }
}
