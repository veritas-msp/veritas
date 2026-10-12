import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { pool } from "../database/db.js";
import { canRunAutoSchemaMigrations } from "../utils/setupState.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const MIGRATION_FILE = "schema/patches/20261009_ticket_side_conversations.sql";

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
     WHERE table_schema = 'public' AND table_name = $1 AND column_name = $2 LIMIT 1`,
    [tableName, columnName]
  );
  return result.rows.length > 0;
}

export async function ensureTicketSideConversationsSchema() {
  if (ensured) return;
  if (!(await canRunAutoSchemaMigrations())) return;
  const client = await pool.connect();
  try {
    const hasConv = await tableExists(client, "v_b_ticket_side_conversations");
    const hasMsg = await tableExists(client, "v_b_ticket_side_conversation_messages");
    const hasLink =
      (await tableExists(client, "v_b_ticket_email_messages")) &&
      (await columnExists(client, "v_b_ticket_email_messages", "side_conversation_id"));
    if (!hasConv || !hasMsg || !hasLink) {
      const filePath = path.join(root, MIGRATION_FILE);
      if (!fs.existsSync(filePath)) {
        console.warn("[ticket-side-conversations] Migration file not found:", MIGRATION_FILE);
        return;
      }
      await client.query(fs.readFileSync(filePath, "utf8"));
    }
    ensured =
      (await tableExists(client, "v_b_ticket_side_conversations")) &&
      (await tableExists(client, "v_b_ticket_side_conversation_messages")) &&
      (await columnExists(client, "v_b_ticket_email_messages", "side_conversation_id"));
    if (!ensured) {
      console.warn("[ticket-side-conversations] Schema still incomplete after ensure.");
    }
  } catch (err) {
    console.error("[ticket-side-conversations] Migration failed:", err?.message || err);
  } finally {
    client.release();
  }
}
