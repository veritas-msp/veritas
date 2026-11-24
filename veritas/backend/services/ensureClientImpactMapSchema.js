import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { pool } from "../database/db.js";
import { canRunAutoSchemaMigrations } from "../utils/setupState.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const MIGRATION_FILE = "schema/patches/20261124_client_impact_map.sql";

let ensured = false;

async function tableExists(client) {
  const { rows } = await client.query(
    `SELECT 1 FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name = 'v_b_client_impact_nodes'
     LIMIT 1`
  );
  return rows.length > 0;
}

export async function ensureClientImpactMapSchema() {
  if (ensured) return true;
  if (!(await canRunAutoSchemaMigrations())) return false;
  const client = await pool.connect();
  try {
    if (!(await tableExists(client))) {
      const filePath = path.join(root, MIGRATION_FILE);
      if (!fs.existsSync(filePath)) {
        console.warn("[impact-map] Migration not found:", MIGRATION_FILE);
        return false;
      }
      await client.query(fs.readFileSync(filePath, "utf8"));
    }
    ensured = true;
    return true;
  } catch (err) {
    console.error("[impact-map] Automatic migration failed:", err.message);
    return false;
  } finally {
    client.release();
  }
}

export async function hasClientImpactMapTable() {
  await ensureClientImpactMapSchema();
  try {
    const { rows } = await pool.query(
      `SELECT 1 FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name = 'v_b_client_impact_nodes'
       LIMIT 1`
    );
    return rows.length > 0;
  } catch {
    return false;
  }
}
