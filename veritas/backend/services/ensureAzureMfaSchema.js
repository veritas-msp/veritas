import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { pool } from "../database/db.js";
import { canRunAutoSchemaMigrations } from "../utils/setupState.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const UNIQUE_FILE = "schema/patches/20260901_azure_mfa_client_user_unique.sql";

let ensured = false;

async function tableExists(client, tableName) {
  const result = await client.query(
    `SELECT 1 FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name = $1 LIMIT 1`,
    [tableName]
  );
  return result.rows.length > 0;
}

async function hasClientUserUnique(client) {
  const result = await client.query(
    `SELECT 1
     FROM pg_constraint
     WHERE conrelid = 'public.v_b_clients_c_azure_mfa'::regclass
       AND contype = 'u'
       AND pg_get_constraintdef(oid) ILIKE '%(client_id, user_id)%'
     LIMIT 1`
  );
  if (result.rows.length > 0) return true;
  const idx = await client.query(
    `SELECT 1
     FROM pg_indexes
     WHERE schemaname = 'public'
       AND tablename = 'v_b_clients_c_azure_mfa'
       AND indexdef ILIKE '%UNIQUE%'
       AND indexdef ILIKE '%client_id%'
       AND indexdef ILIKE '%user_id%'
     LIMIT 1`
  );
  return idx.rows.length > 0;
}

async function runSqlFile(client, relativePath) {
  const filePath = path.join(root, relativePath);
  if (!fs.existsSync(filePath)) {
    console.warn("[azure-mfa] Migration file not found:", relativePath);
    return false;
  }
  await client.query(fs.readFileSync(filePath, "utf8"));
  return true;
}

export async function ensureAzureMfaSchema() {
  if (ensured) return true;
  if (!(await canRunAutoSchemaMigrations())) return false;
  const client = await pool.connect();
  try {
    if (!(await tableExists(client, "v_b_clients_c_azure_mfa"))) {
      return false;
    }
    if (!(await hasClientUserUnique(client))) {
      await runSqlFile(client, UNIQUE_FILE);
    }
    ensured = await hasClientUserUnique(client);
    if (!ensured) {
      console.warn("[azure-mfa] Schema still incomplete after ensure.");
    }
    return ensured;
  } catch (err) {
    console.error("[azure-mfa] Migration failed:", err?.message || err);
    return false;
  } finally {
    client.release();
  }
}
