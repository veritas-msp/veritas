import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { pool } from "../database/db.js";
import { canRunAutoSchemaMigrations } from "../utils/setupState.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const MIGRATION_FILE = "schema/patches/20260729_sales_ticket_categories.sql";

let ensured = false;
let schemaCache = null;

async function tableExists(client, tableName) {
  const result = await client.query(`SELECT to_regclass($1) IS NOT NULL AS has_table`, [`public.${tableName}`]);
  return Boolean(result.rows?.[0]?.has_table);
}

export async function resolveSalesTicketCategoriesSchema(force = false) {
  if (!force && schemaCache) return schemaCache;
  const [hasCategories, hasSections] = await Promise.all([
    tableExists(pool, "v_b_sales_ticket_categories"),
    tableExists(pool, "v_b_sales_ticket_category_sections")
  ]);
  schemaCache = {
    hasCategories,
    hasSections,
    ready: hasCategories && hasSections
  };
  return schemaCache;
}

export async function ensureSalesTicketCategoriesSchema() {
  if (ensured) return resolveSalesTicketCategoriesSchema();
  const schema = await resolveSalesTicketCategoriesSchema(true);
  if (schema.ready) {
    ensured = true;
    return schema;
  }
  if (!(await canRunAutoSchemaMigrations())) {
    return schema;
  }
  const client = await pool.connect();
  try {
    const migrationPath = path.join(root, MIGRATION_FILE);
    if (!fs.existsSync(migrationPath)) {
      console.warn(`[sales-ticket-categories] Migration not found: ${MIGRATION_FILE}`);
      return schema;
    }
    await client.query(fs.readFileSync(migrationPath, "utf8"));
    schemaCache = null;
    const next = await resolveSalesTicketCategoriesSchema(true);
    ensured = next.ready;
    if (next.ready) console.log("[sales-ticket-categories] Schema ensured");
    return next;
  } catch (err) {
    console.error("[sales-ticket-categories] Migration failed:", err.message);
    schemaCache = null;
    return await resolveSalesTicketCategoriesSchema(true);
  } finally {
    client.release();
  }
}
