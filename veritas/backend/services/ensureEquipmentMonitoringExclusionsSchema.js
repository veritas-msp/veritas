import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { pool } from "../database/db.js";
import { canRunAutoSchemaMigrations } from "../utils/setupState.js";
import { adaptMigrationSql } from "../utils/migrationSql.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const MIGRATION_FILE = "schema/patches/20261007_equipment_monitoring_exclusions.sql";
const HISTORY_MIGRATION_FILE = "schema/patches/20261012_equipment_monitoring_exclusions_history.sql";
let ensured = false;

async function tableExists(client, tableName) {
  const result = await client.query(
    `SELECT 1 FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name = $1 LIMIT 1`,
    [tableName]
  );
  return result.rows.length > 0;
}

async function columnExists(client, tableName, columnName) {
  const result = await client.query(
    `SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = $1 AND column_name = $2
     LIMIT 1`,
    [tableName, columnName]
  );
  return result.rows.length > 0;
}

async function runMigration(client, relativePath) {
  const filePath = path.join(root, relativePath);
  if (!fs.existsSync(filePath)) {
    console.warn("[monitoring-exclusions] Migration file not found:", relativePath);
    return false;
  }
  const userResult = await client.query("SELECT current_user");
  const dbUser = userResult.rows[0]?.current_user || "postgres";
  await client.query(adaptMigrationSql(fs.readFileSync(filePath, "utf8"), dbUser));
  return true;
}

export async function ensureEquipmentMonitoringExclusionsSchema() {
  if (ensured) return;
  if (!(await canRunAutoSchemaMigrations())) return;
  const client = await pool.connect();
  try {
    if (!(await tableExists(client, "v_b_equipment_monitoring_exclusions"))) {
      await runMigration(client, MIGRATION_FILE);
    }
    if (
      (await tableExists(client, "v_b_equipment_monitoring_exclusions")) &&
      !(await columnExists(client, "v_b_equipment_monitoring_exclusions", "ended_at"))
    ) {
      await runMigration(client, HISTORY_MIGRATION_FILE);
    }
    ensured = true;
  } catch (err) {
    console.error("[monitoring-exclusions] Migration failed:", err.message);
  } finally {
    client.release();
  }
}
