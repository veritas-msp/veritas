import { pool } from "../database/db.js";
import { ensureSslSchema } from "../services/ensureSslSchema.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CLIENT_FILES_UPLOAD_DIR = path.join(__dirname, "..", "uploads", "client-files");
const EQUIPMENT_FILES_UPLOAD_DIR = path.join(__dirname, "..", "uploads", "equipment-files");
export const CLIENT_DELETION_BLOCKER_DEFS = [{
  key: "equipment_infra",
  label: "Infrastructure equipment",
  tables: ["v_b_clients_m_internet", "v_b_clients_m_firewall", "v_b_clients_m_servers", "v_b_clients_m_stockage", "v_b_clients_m_switch", "v_b_clients_m_wifi", "v_b_clients_m_alimentation", "v_b_clients_m_routeur", "v_b_clients_m_toip", "v_b_clients_m_ordinateurs", "v_b_clients_m_custom_equipment"]
}, {
  key: "equipment_cyber",
  label: "Cybersecurity & backup",
  tables: ["v_b_clients_m_antivirus", "v_b_clients_m_antispam", "v_b_clients_m_save"]
}, {
  key: "campaigns",
  label: "Cybersecurity campaigns",
  query: `
      SELECT client_id::text AS client_id, COUNT(*)::int AS cnt
      FROM v_b_clients_c_campaign
      WHERE client_id IS NOT NULL
      GROUP BY client_id
    `
}, {
  key: "equipment_services",
  label: "Services cloud & IT",
  tables: ["v_b_clients_m_o365", "v_b_clients_m_ndd", "v_b_clients_m_ssl", "v_b_clients_m_licences"]
}, {
  key: "azure_tenant",
  label: "Tenant Microsoft / Azure",
  query: `
      SELECT client_id::text AS client_id, COUNT(*)::int AS cnt
      FROM v_b_clients_azure
      WHERE client_id IS NOT NULL
      GROUP BY client_id
    `
}, {
  key: "contacts",
  label: "Contacts",
  query: `
      SELECT client_id::text AS client_id, COUNT(*)::int AS cnt
      FROM v_b_contacts
      WHERE client_id IS NOT NULL
      GROUP BY client_id
    `
}, {
  key: "tickets",
  label: "Tickets support",
  query: `
      SELECT client_id::text AS client_id, COUNT(*)::int AS cnt
      FROM v_b_tickets
      WHERE client_id IS NOT NULL
      GROUP BY client_id
    `
}, {
  key: "events_upcoming",
  label: "Upcoming events",
  query: `
      SELECT client_id::text AS client_id, COUNT(*)::int AS cnt
      FROM v_b_events
      WHERE client_id IS NOT NULL
        AND "end" >= NOW()
      GROUP BY client_id
    `
}, {
  key: "rmm_agents",
  label: "Agents RMM",
  query: `
      SELECT client_id::text AS client_id, COUNT(*)::int AS cnt
      FROM v_b_rmm_agents
      WHERE client_id IS NOT NULL
        AND COALESCE(status, 'active') <> 'revoked'
      GROUP BY client_id
    `
}, {
  key: "client_files",
  label: "Company files",
  query: `
      SELECT client_id::text AS client_id, COUNT(*)::int AS cnt
      FROM v_b_client_files
      WHERE client_id IS NOT NULL
        AND COALESCE(is_deleted, false) = false
      GROUP BY client_id
    `
}];
const EQUIPMENT_ROW_WHERE = `
  client_id IS NOT NULL
  AND COALESCE(is_active, true) = true
  AND (
    (data IS NOT NULL AND data::text NOT IN ('null', '{}', '[]', '""'))
    OR NULLIF(TRIM(COALESCE(name, '')), '') IS NOT NULL
    OR NULLIF(TRIM(COALESCE(item_key, '')), '') IS NOT NULL
  )
`;
const EMPTY_SUMMARY = () => ({
  deletable: true,
  blockers: [],
  totalBlockers: 0
});
async function countByClientFromTables(tables) {
  const counts = {};
  for (const tableName of tables) {
    try {
      const result = await pool.query(`
        SELECT client_id::text AS client_id, COUNT(*)::int AS cnt
        FROM ${tableName}
        WHERE ${EQUIPMENT_ROW_WHERE}
        GROUP BY client_id
      `);
      for (const row of result.rows) {
        const clientId = String(row.client_id);
        counts[clientId] = (counts[clientId] || 0) + (Number(row.cnt) || 0);
      }
    } catch (err) {
      if (err.code === "42P01" || err.code === "42703") {
        console.warn(`[client-deletion] table skipped ${tableName}:`, err.message);
        continue;
      }
      throw err;
    }
  }
  return counts;
}
async function countByClientFromQuery(query, label) {
  try {
    const result = await pool.query(query);
    const counts = {};
    for (const row of result.rows) {
      counts[String(row.client_id)] = Number(row.cnt) || 0;
    }
    return counts;
  } catch (err) {
    if (err.code === "42P01" || err.code === "42703") {
      console.warn(`[client-deletion] query skipped (${label}):`, err.message);
      return {};
    }
    throw err;
  }
}
function mergeBlockerMaps(blockerMapsByKey) {
  const byClientId = {};
  for (const [key, {
    label,
    counts
  }] of Object.entries(blockerMapsByKey)) {
    for (const [clientId, count] of Object.entries(counts)) {
      if (!count || count <= 0) continue;
      if (!byClientId[clientId]) {
        byClientId[clientId] = [];
      }
      byClientId[clientId].push({
        key,
        label,
        count
      });
    }
  }
  const summaryByClientId = {};
  for (const [clientId, blockers] of Object.entries(byClientId)) {
    summaryByClientId[clientId] = {
      deletable: false,
      blockers,
      totalBlockers: blockers.reduce((sum, item) => sum + item.count, 0)
    };
  }
  return summaryByClientId;
}
export async function fetchDeletionSummaryByClientId() {
  await ensureSslSchema();
  const blockerMapsByKey = {};
  await Promise.all(CLIENT_DELETION_BLOCKER_DEFS.map(async def => {
    let counts = {};
    if (def.tables) {
      counts = await countByClientFromTables(def.tables);
    } else if (def.query) {
      counts = await countByClientFromQuery(def.query, def.label);
    }
    blockerMapsByKey[def.key] = {
      label: def.label,
      counts
    };
  }));
  return mergeBlockerMaps(blockerMapsByKey);
}
export async function getClientDeletionStatus(clientId) {
  const all = await fetchDeletionSummaryByClientId();
  return all[String(clientId)] || EMPTY_SUMMARY();
}
export function attachDeletionSummary(clients, summaryByClientId = {}) {
  return clients.map(client => {
    const summary = summaryByClientId[String(client.id)] || EMPTY_SUMMARY();
    return {
      ...client,
      deletion: summary,
      deletable: summary.deletable,
      deletion_blockers: summary.blockers
    };
  });
}

function quoteIdent(name) {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(String(name || ""))) {
    throw new Error(`Unsafe SQL identifier: ${name}`);
  }
  return `"${name}"`;
}

async function runPurgeSql(client, sql, params, label) {
  try {
    const result = await client.query(sql, params);
    return Number(result.rowCount) || 0;
  } catch (err) {
    if (err.code === "42P01" || err.code === "42703") {
      console.warn(`[client-force-delete] skipped ${label}:`, err.message);
      return 0;
    }
    throw err;
  }
}

async function listTablesWithClientIdColumn(db) {
  const {
    rows
  } = await db.query(`
    SELECT c.table_name
    FROM information_schema.columns c
    JOIN information_schema.tables t
      ON t.table_schema = c.table_schema
     AND t.table_name = c.table_name
    WHERE c.table_schema = 'public'
      AND c.column_name = 'client_id'
      AND t.table_type = 'BASE TABLE'
      AND c.table_name <> 'v_b_clients'
    ORDER BY c.table_name
  `);
  return rows.map(row => row.table_name);
}

async function listForeignKeysToClients(db) {
  const {
    rows
  } = await db.query(`
    SELECT
      tc.table_name,
      kcu.column_name,
      rc.delete_rule
    FROM information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
     AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
     AND ccu.table_schema = tc.table_schema
    JOIN information_schema.referential_constraints AS rc
      ON rc.constraint_name = tc.constraint_name
     AND rc.constraint_schema = tc.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_schema = 'public'
      AND ccu.table_schema = 'public'
      AND ccu.table_name = 'v_b_clients'
      AND ccu.column_name = 'id'
    ORDER BY tc.table_name, kcu.column_name
  `);
  return rows;
}

async function collectClientFilePaths(db, clientId) {
  const paths = [];
  for (const tableName of ["v_b_client_files", "v_b_equipment_files"]) {
    try {
      const {
        rows
      } = await db.query(`SELECT file_path FROM ${quoteIdent(tableName)} WHERE client_id::text = $1 AND file_path IS NOT NULL`, [String(clientId)]);
      for (const row of rows) {
        if (row.file_path) paths.push({
          table: tableName,
          filePath: row.file_path
        });
      }
    } catch (err) {
      if (err.code === "42P01" || err.code === "42703") continue;
      throw err;
    }
  }
  return paths;
}

async function deleteFromClientIdTables(db, clientId, tableNames, {
  excludeTables = []
} = {}) {
  const excluded = new Set(excludeTables);
  const remaining = new Set(tableNames.filter(name => !excluded.has(name)));
  const purged = {};
  let guard = 0;
  while (remaining.size > 0 && guard < 25) {
    guard += 1;
    let progress = false;
    const deferredErrors = [];
    for (const tableName of [...remaining]) {
      try {
        const count = await runPurgeSql(db, `DELETE FROM ${quoteIdent(tableName)} WHERE client_id::text = $1`, [String(clientId)], tableName);
        purged[tableName] = (purged[tableName] || 0) + count;
        remaining.delete(tableName);
        progress = true;
      } catch (err) {
        if (err.code === "23503") {
          deferredErrors.push({
            tableName,
            err
          });
          continue;
        }
        throw err;
      }
    }
    if (!progress) {
      const first = deferredErrors[0];
      if (first) throw first.err;
      break;
    }
  }
  if (remaining.size > 0) {
    throw new Error(`Unable to purge linked tables: ${[...remaining].join(", ")}`);
  }
  return purged;
}

async function assertNoClientResidues(db, clientId) {
  const tables = await listTablesWithClientIdColumn(db);
  const leftovers = [];
  for (const tableName of tables) {
    try {
      const {
        rows
      } = await db.query(`SELECT COUNT(*)::int AS cnt FROM ${quoteIdent(tableName)} WHERE client_id::text = $1`, [String(clientId)]);
      const count = Number(rows[0]?.cnt) || 0;
      if (count > 0) {
        leftovers.push({
          table: tableName,
          count
        });
      }
    } catch (err) {
      if (err.code === "42P01" || err.code === "42703") continue;
      throw err;
    }
  }
  if (leftovers.length) {
    const details = leftovers.map(item => `${item.table}(${item.count})`).join(", ");
    throw new Error(`Force delete left residues: ${details}`);
  }
  return true;
}

/**
 * Delete every DB row linked to a company (dynamic client_id discovery + FK cleanup),
 * then delete the company. Fails if any residue remains.
 */
export async function forceDeleteClientWithLinkedItems(clientId) {
  const id = Number(clientId);
  if (!Number.isFinite(id)) {
    throw new Error("Invalid client id");
  }
  const idText = String(id);
  const db = await pool.connect();
  const purged = {};
  let diskFiles = [];
  try {
    await db.query("BEGIN");

    diskFiles = await collectClientFilePaths(db, id);

    // 1) Dependency graphs that are not keyed only by client_id / must go first
    purged.campaign_snapshots = await runPurgeSql(db, `DELETE FROM v_b_clients_c_campaign_snapshot
       WHERE campaign_id IN (SELECT id FROM v_b_clients_c_campaign WHERE client_id::text = $1)`, [idText], "campaign_snapshots");
    purged.campaign_steps = await runPurgeSql(db, `DELETE FROM v_b_clients_c_campaign_steps
       WHERE campaign_id IN (SELECT id FROM v_b_clients_c_campaign WHERE client_id::text = $1)`, [idText], "campaign_steps");

    // Portal accounts before contacts (FK contact_id / client_id)
    purged.portal_users = await runPurgeSql(db, `DELETE FROM v_b_users WHERE client_id::text = $1`, [idText], "portal_users");
    purged.contact_tag_links = await runPurgeSql(db, `DELETE FROM v_b_contact_tag_links
       WHERE contact_id IN (SELECT id FROM v_b_contacts WHERE client_id::text = $1)`, [idText], "contact_tag_links");

    // Monitoring / planning linked to the company (tickets themselves are preserved)
    purged.monitoring_events = await runPurgeSql(db, `DELETE FROM v_b_monitoring_events WHERE client_id::text = $1`, [idText], "monitoring_events");
    purged.monitoring_incident_groups = await runPurgeSql(db, `DELETE FROM v_b_monitoring_incident_groups WHERE client_id::text = $1`, [idText], "monitoring_incident_groups");
    purged.events = await runPurgeSql(db, `DELETE FROM v_b_events WHERE client_id::text = $1`, [idText], "events");

    // Keep tickets: blank requester (demandeur), then detach company
    purged.tickets_requester_blanked = await runPurgeSql(db, `UPDATE v_b_tickets
       SET requester_contact_id = NULL
       WHERE requester_contact_id IN (
         SELECT id FROM v_b_contacts WHERE client_id::text = $1
       )
       OR client_id::text = $1`, [idText], "tickets_requester_blanked");
    purged.tickets_detached = await runPurgeSql(db, `UPDATE v_b_tickets
       SET client_id = NULL
       WHERE client_id::text = $1`, [idText], "tickets_detached");

    // Contacts can now be removed safely (tickets no longer reference them as requester)
    purged.contacts = await runPurgeSql(db, `DELETE FROM v_b_contacts WHERE client_id::text = $1`, [idText], "contacts");

    // RMM metrics cascade with agents, but clear agents early when possible
    purged.rmm_agents = await runPurgeSql(db, `DELETE FROM v_b_rmm_agents WHERE client_id::text = $1`, [idText], "rmm_agents");

    // 2) Sweep every table that has a client_id column (except tickets — preserved)
    const clientIdTables = await listTablesWithClientIdColumn(db);
    const swept = await deleteFromClientIdTables(db, id, clientIdTables, {
      excludeTables: ["v_b_tickets"]
    });
    Object.assign(purged, swept);

    // 3) Any FK pointing at v_b_clients(id) that is not CASCADE / not already empty
    const fks = await listForeignKeysToClients(db);
    for (const fk of fks) {
      if (fk.table_name === "v_b_clients" || fk.table_name === "v_b_tickets") continue;
      const deleteRule = String(fk.delete_rule || "").toUpperCase();
      if (deleteRule === "CASCADE") continue;
      const key = `${fk.table_name}.${fk.column_name}`;
      if (deleteRule === "SET NULL") {
        purged[key] = await runPurgeSql(db, `UPDATE ${quoteIdent(fk.table_name)}
           SET ${quoteIdent(fk.column_name)} = NULL
           WHERE ${quoteIdent(fk.column_name)}::text = $1`, [idText], key);
      } else {
        purged[key] = await runPurgeSql(db, `DELETE FROM ${quoteIdent(fk.table_name)}
           WHERE ${quoteIdent(fk.column_name)}::text = $1`, [idText], key);
      }
    }

    // 4) Hard guarantee: no client_id residue before removing the company
    await assertNoClientResidues(db, id);

    const deleted = await db.query(`DELETE FROM v_b_clients WHERE id = $1 RETURNING id, name`, [id]);
    if (!deleted.rows.length) {
      await db.query("ROLLBACK");
      return {
        deleted: false,
        purged
      };
    }

    await db.query("COMMIT");

    // Disk cleanup after successful commit (best effort)
    try {
      const roots = {
        v_b_client_files: CLIENT_FILES_UPLOAD_DIR,
        v_b_equipment_files: EQUIPMENT_FILES_UPLOAD_DIR
      };
      for (const item of diskFiles) {
        const root = roots[item.table];
        if (!root || !item.filePath) continue;
        const fullPath = path.join(root, path.basename(String(item.filePath)));
        if (fs.existsSync(fullPath)) {
          fs.unlinkSync(fullPath);
        }
      }
    } catch (err) {
      console.warn("[client-force-delete] disk cleanup:", err.message);
    }

    return {
      deleted: true,
      client: deleted.rows[0],
      purged
    };
  } catch (err) {
    try {
      await db.query("ROLLBACK");
    } catch {}
    throw err;
  } finally {
    db.release();
  }
}

