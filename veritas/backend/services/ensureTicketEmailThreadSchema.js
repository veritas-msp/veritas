import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { pool } from "../database/db.js";
import { canRunAutoSchemaMigrations } from "../utils/setupState.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const CREATE_FILE = "schema/patches/20260723_ticket_email_thread.sql";
const UNIQUE_FILE = "schema/patches/20260809_ticket_email_messages_unique.sql";
const NULLABLE_TICKET_FILE = "schema/patches/20260809_ticket_email_messages_nullable_ticket.sql";

let ensured = false;

async function tableExists(client, tableName) {
  const result = await client.query(
    `SELECT 1 FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name = $1 LIMIT 1`,
    [tableName]
  );
  return result.rows.length > 0;
}

async function hasMessageIdUnique(client) {
  const result = await client.query(
    `SELECT 1
     FROM pg_constraint
     WHERE conrelid = 'public.v_b_ticket_email_messages'::regclass
       AND contype = 'u'
       AND pg_get_constraintdef(oid) ILIKE '%(message_id)%'
     LIMIT 1`
  );
  if (result.rows.length > 0) return true;
  const idx = await client.query(
    `SELECT 1
     FROM pg_indexes
     WHERE schemaname = 'public'
       AND tablename = 'v_b_ticket_email_messages'
       AND indexdef ILIKE '%UNIQUE%'
       AND indexdef ILIKE '%message_id%'
     LIMIT 1`
  );
  return idx.rows.length > 0;
}

async function ticketIdAllowsNull(client) {
  const result = await client.query(
    `SELECT is_nullable
     FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name = 'v_b_ticket_email_messages'
       AND column_name = 'ticket_id'
     LIMIT 1`
  );
  return String(result.rows[0]?.is_nullable || "").toUpperCase() === "YES";
}

async function runSqlFile(client, relativePath) {
  const filePath = path.join(root, relativePath);
  if (!fs.existsSync(filePath)) {
    console.warn("[ticket-email-thread] Migration file not found:", relativePath);
    return false;
  }
  await client.query(fs.readFileSync(filePath, "utf8"));
  return true;
}

export async function ensureTicketEmailThreadSchema() {
  if (ensured) return;
  if (!(await canRunAutoSchemaMigrations())) return;
  const client = await pool.connect();
  try {
    if (!(await tableExists(client, "v_b_ticket_email_messages"))) {
      await runSqlFile(client, CREATE_FILE);
    }
    if (await tableExists(client, "v_b_ticket_email_messages") && !(await hasMessageIdUnique(client))) {
      await runSqlFile(client, UNIQUE_FILE);
    }
    if (await tableExists(client, "v_b_ticket_email_messages") && !(await ticketIdAllowsNull(client))) {
      await runSqlFile(client, NULLABLE_TICKET_FILE);
    }
    ensured =
      (await tableExists(client, "v_b_ticket_email_messages")) &&
      (await hasMessageIdUnique(client)) &&
      (await ticketIdAllowsNull(client));
    if (!ensured) {
      console.warn("[ticket-email-thread] Schema still incomplete after ensure.");
    }
  } catch (err) {
    console.error("[ticket-email-thread] Migration failed:", err?.message || err);
  } finally {
    client.release();
  }
}
