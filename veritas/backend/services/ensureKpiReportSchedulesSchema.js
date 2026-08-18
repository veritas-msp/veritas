import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { pool } from "../database/db.js";
import { canRunAutoSchemaMigrations } from "../utils/setupState.js";
import { adaptMigrationSql } from "../utils/migrationSql.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const MIGRATION_FILE = "schema/patches/20260817_kpi_report_schedules.sql";
const TABLE_NAME = "v_b_kpi_report_schedules";
const CREATE_TABLE_SQL = `CREATE TABLE IF NOT EXISTS v_b_kpi_report_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID,
  name VARCHAR(160) NOT NULL,
  recipients TEXT NOT NULL,
  categories TEXT[] NOT NULL DEFAULT ARRAY['support', 'devices', 'enterprise']::text[],
  period_preset VARCHAR(20) NOT NULL DEFAULT '30d',
  frequency VARCHAR(20) NOT NULL DEFAULT 'weekly',
  weekday INTEGER,
  monthday INTEGER,
  send_hour INTEGER NOT NULL DEFAULT 8,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  last_sent_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
)`;
const CREATE_INDEX_SQL = `CREATE INDEX IF NOT EXISTS idx_kpi_report_schedules_next_run
  ON v_b_kpi_report_schedules (enabled, next_run_at)`;

let ensured = false;

async function tableExists(client, tableName) {
  const result = await client.query(`SELECT 1 FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name = $1 LIMIT 1`, [tableName]);
  return result.rows.length > 0;
}

function quoteIdent(value) {
  return `"${String(value).replace(/"/g, "\"\"")}"`;
}

export async function ensureKpiReportSchedulesSchema() {
  if (ensured) return;
  if (!(await canRunAutoSchemaMigrations())) return;
  const client = await pool.connect();
  try {
    if (await tableExists(client, TABLE_NAME)) {
      ensured = true;
      return;
    }
    const filePath = path.join(root, MIGRATION_FILE);
    const userResult = await client.query("SELECT current_user");
    const dbUser = userResult.rows[0]?.current_user || "postgres";
    if (fs.existsSync(filePath)) {
      const statements = adaptMigrationSql(fs.readFileSync(filePath, "utf8"), dbUser)
        .split(/;\s*(?:\r?\n|$)/)
        .map(statement => statement.trim())
        .filter(Boolean);
      for (const statement of statements) {
        await client.query(statement);
      }
    } else {
      console.warn("[kpi-report-schedules] Migration file not found, creating table inline:", MIGRATION_FILE);
      await client.query(CREATE_TABLE_SQL);
      await client.query(CREATE_INDEX_SQL);
    }
    try {
      await client.query(`GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE ${TABLE_NAME} TO ${quoteIdent(dbUser)}`);
    } catch (grantErr) {
      console.warn("[kpi-report-schedules] GRANT skipped:", grantErr?.message || grantErr);
    }
    if (!(await tableExists(client, TABLE_NAME))) {
      throw new Error("Table v_b_kpi_report_schedules missing after migration");
    }
    ensured = true;
  } catch (err) {
    console.error("[kpi-report-schedules] Migration failed:", err?.message || err);
  } finally {
    client.release();
  }
}
