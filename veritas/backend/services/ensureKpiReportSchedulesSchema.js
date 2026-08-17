import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { pool } from "../database/db.js";
import { canRunAutoSchemaMigrations } from "../utils/setupState.js";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const MIGRATION_FILE = "schema/patches/20260817_kpi_report_schedules.sql";
let ensured = false;
async function tableExists(client, tableName) {
  const result = await client.query(`SELECT 1 FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name = $1 LIMIT 1`, [tableName]);
  return result.rows.length > 0;
}
export async function ensureKpiReportSchedulesSchema() {
  if (ensured) return;
  if (!(await canRunAutoSchemaMigrations())) return;
  const client = await pool.connect();
  try {
    if (await tableExists(client, "v_b_kpi_report_schedules")) {
      ensured = true;
      return;
    }
    const filePath = path.join(root, MIGRATION_FILE);
    if (!fs.existsSync(filePath)) {
      console.warn("[kpi-report-schedules] Migration file not found:", MIGRATION_FILE);
      return;
    }
    await client.query(fs.readFileSync(filePath, "utf8"));
    ensured = true;
  } catch (err) {
    console.error("[kpi-report-schedules] Migration failed:", err?.message || err);
  } finally {
    client.release();
  }
}
