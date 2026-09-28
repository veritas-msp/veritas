import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { pool } from "../database/db.js";
import { canRunAutoSchemaMigrations } from "../utils/setupState.js";
import { adaptMigrationSql } from "../utils/migrationSql.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const MIGRATION_FILE = "schema/patches/20260928_checkmk_sync_runs.sql";
const TABLE = "v_b_checkmk_sync_runs";
let ensured = false;
let ensurePromise = null;

async function tableExists(client, tableName) {
  const result = await client.query(
    `SELECT 1 FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name = $1 LIMIT 1`,
    [tableName]
  );
  return result.rows.length > 0;
}

export async function ensureCheckmkSyncRunsSchema() {
  if (ensured) return true;
  if (ensurePromise) return ensurePromise;
  ensurePromise = (async () => {
    if (!(await canRunAutoSchemaMigrations())) {
      try {
        const client = await pool.connect();
        try {
          ensured = await tableExists(client, TABLE);
          return ensured;
        } finally {
          client.release();
        }
      } catch {
        return false;
      }
    }
    const client = await pool.connect();
    try {
      if (!(await tableExists(client, TABLE))) {
        const filePath = path.join(root, MIGRATION_FILE);
        if (!fs.existsSync(filePath)) {
          console.warn("[checkmk-sync-runs] Migration file not found:", MIGRATION_FILE);
          return false;
        }
        const userResult = await client.query("SELECT current_user");
        const dbUser = userResult.rows[0]?.current_user || "postgres";
        await client.query(adaptMigrationSql(fs.readFileSync(filePath, "utf8"), dbUser));
      }
      ensured = await tableExists(client, TABLE);
      return ensured;
    } catch (err) {
      console.error("[checkmk-sync-runs] Migration failed:", err.message);
      return false;
    } finally {
      client.release();
    }
  })();
  try {
    return await ensurePromise;
  } finally {
    if (!ensured) ensurePromise = null;
  }
}
