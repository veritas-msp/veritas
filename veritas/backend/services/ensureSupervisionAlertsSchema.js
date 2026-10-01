import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { pool } from "../database/db.js";
import { canRunAutoSchemaMigrations } from "../utils/setupState.js";
import { adaptMigrationSql } from "../utils/migrationSql.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const MIGRATION_FILE = "schema/patches/20260801_supervision_alerts.sql";
const TRASH_MIGRATION_FILE = "schema/patches/20261001_supervision_alerts_trash.sql";
let ensured = false;

async function tableExists(client, tableName) {
  const result = await client.query(
    `SELECT 1 FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name = $1 LIMIT 1`,
    [tableName]
  );
  return result.rows.length > 0;
}

async function runPatch(client, relativePath) {
  const filePath = path.join(root, relativePath);
  if (!fs.existsSync(filePath)) {
    console.warn("[supervision-alerts] Migration file not found:", relativePath);
    return;
  }
  const userResult = await client.query("SELECT current_user");
  const dbUser = userResult.rows[0]?.current_user || "postgres";
  await client.query(adaptMigrationSql(fs.readFileSync(filePath, "utf8"), dbUser));
}

export async function ensureSupervisionAlertsSchema() {
  if (ensured) return;
  if (!(await canRunAutoSchemaMigrations())) return;
  const client = await pool.connect();
  try {
    const exists = await tableExists(client, "v_b_supervision_alerts");
    if (!exists) {
      await runPatch(client, MIGRATION_FILE);
    }
    if (await tableExists(client, "v_b_supervision_alerts")) {
      await runPatch(client, TRASH_MIGRATION_FILE);
    }
    ensured = true;
  } catch (err) {
    console.error("[supervision-alerts] Migration failed:", err.message);
  } finally {
    client.release();
  }
}
