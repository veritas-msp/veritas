import dotenv from "dotenv";
import { pool } from "../database/db.js";
import { ensureContactClientLinksSchema } from "../services/ensureContactClientLinksSchema.js";
import { fetchPrimaryContactNamesByClientId, invalidateContactClientLinksCache } from "../services/contactClientLinks.js";

dotenv.config();

try {
  const ok = await ensureContactClientLinksSchema();
  invalidateContactClientLinksCache();
  const reg = await pool.query(`SELECT to_regclass('public.v_b_contact_client_links') AS reg`);
  console.log("table:", reg.rows[0]?.reg || null, "ensured:", ok);
  const links = await pool.query(`SELECT COUNT(*)::int AS n FROM v_b_contact_client_links`).catch(err => ({ rows: [{ n: `ERR ${err.message}` }] }));
  console.log("links count:", links.rows[0]?.n);
  const primaries = await fetchPrimaryContactNamesByClientId();
  console.log("primary contacts restored:", Object.keys(primaries).length);
} catch (err) {
  console.error("Failed:", err);
  process.exitCode = 1;
} finally {
  await pool.end().catch(() => {});
}
