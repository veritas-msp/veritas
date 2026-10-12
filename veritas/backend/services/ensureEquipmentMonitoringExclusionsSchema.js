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

/** Colonnes d’historique — appliquées hors patch complet pour éviter un échec d’index. */
async function ensureHistoryColumns(client) {
  await client.query(`
    ALTER TABLE v_b_equipment_monitoring_exclusions
      ADD COLUMN IF NOT EXISTS ended_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS ended_by UUID
  `);
}

async function ensureHistoryIndexes(client) {
  await client.query(`DROP INDEX IF EXISTS uq_monitoring_exclusions_service`);
  await client.query(`DROP INDEX IF EXISTS uq_monitoring_exclusions_device`);
  await client.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS uq_monitoring_exclusions_service_active
      ON v_b_equipment_monitoring_exclusions (client_id, equipment_id, equipment_family, service_key)
      WHERE scope = 'service' AND service_key IS NOT NULL AND ended_at IS NULL
  `);
  await client.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS uq_monitoring_exclusions_device_active
      ON v_b_equipment_monitoring_exclusions (client_id, equipment_id, equipment_family)
      WHERE scope = 'device' AND ended_at IS NULL
  `);
  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_monitoring_exclusions_equipment_history
      ON v_b_equipment_monitoring_exclusions (equipment_id, created_at DESC)
  `);
  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_monitoring_exclusions_active_ended
      ON v_b_equipment_monitoring_exclusions (client_id, equipment_id, ended_at, excluded_until)
  `);
}

export async function ensureEquipmentMonitoringExclusionsSchema() {
  if (ensured) return;
  if (!(await canRunAutoSchemaMigrations())) return;
  const client = await pool.connect();
  try {
    if (!(await tableExists(client, "v_b_equipment_monitoring_exclusions"))) {
      await runMigration(client, MIGRATION_FILE);
    }
    if (!(await tableExists(client, "v_b_equipment_monitoring_exclusions"))) {
      return;
    }

    // Toujours garantir les colonnes d’abord (indépendamment des index).
    if (!(await columnExists(client, "v_b_equipment_monitoring_exclusions", "ended_at"))) {
      await ensureHistoryColumns(client);
      try {
        await ensureHistoryIndexes(client);
      } catch (indexErr) {
        console.warn(
          "[monitoring-exclusions] History indexes skipped:",
          indexErr.message
        );
        // Fallback : patch SQL complet si les index unitaires échouent.
        await runMigration(client, HISTORY_MIGRATION_FILE).catch(err => {
          console.warn("[monitoring-exclusions] History patch skipped:", err.message);
        });
      }
    }

    ensured = await columnExists(client, "v_b_equipment_monitoring_exclusions", "ended_at");
  } catch (err) {
    console.error("[monitoring-exclusions] Migration failed:", err.message);
  } finally {
    client.release();
  }
}
