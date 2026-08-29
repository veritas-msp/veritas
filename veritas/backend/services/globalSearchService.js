import { pool } from "../database/db.js";
import { userHasAnyPermission } from "./permissionService.js";
import { isCommunity } from "../utils/edition.js";
import { SALES_TICKET_MATCH_SQL, SUPPORT_TICKET_SQL } from "../utils/ticketEditionGuard.js";
import { PURGE_HARDWARE_FAMILIES } from "../utils/equipmentPurgeList.js";
import { listKnowledgeArticles } from "./knowledgeArticlesService.js";

const PER_TYPE_LIMIT = 8;
const MIN_QUERY_LENGTH = 2;

function likePattern(raw) {
  return `%${String(raw || "")
    .trim()
    .toLowerCase()
    .replace(/[%_\\]/g, "")}%`;
}

function firstNonEmpty(...values) {
  for (const value of values) {
    if (value == null) continue;
    const text = String(value).trim();
    if (text) return text;
  }
  return "";
}

function item(type, id, title, subtitle, navigate) {
  return {
    id: `${type}:${id}`,
    type,
    title: title || "—",
    subtitle: subtitle || "",
    navigate
  };
}

async function safeQuery(sql, params) {
  try {
    const result = await pool.query(sql, params);
    return result.rows || [];
  } catch (err) {
    if (err?.code === "42P01" || err?.code === "42703") return [];
    throw err;
  }
}

async function searchClients(like, limit) {
  const rows = await safeQuery(
    `SELECT c.id, c.name, c.client_number
       FROM v_b_clients c
      WHERE LOWER(COALESCE(c.name, '')) LIKE $1
         OR LOWER(COALESCE(c.client_number::text, '')) LIKE $1
      ORDER BY c.name ASC NULLS LAST
      LIMIT $2`,
    [like, limit]
  );
  return rows.map(row =>
    item("client", row.id, row.name, firstNonEmpty(row.client_number), {
      docType: "ContratDetail",
      payload: {
        clientId: row.id,
        name: row.name,
        client_number: row.client_number
      }
    })
  );
}

async function searchContacts(like, limit) {
  const rows = await safeQuery(
    `SELECT cts.id, cts.nom, cts.prenom, cts.email, cts.telephone, cts.poste, cts.client_id,
            cli.name AS client_name
       FROM v_b_contacts cts
       LEFT JOIN v_b_clients cli ON cli.id = cts.client_id
      WHERE LOWER(COALESCE(cts.nom, '')) LIKE $1
         OR LOWER(COALESCE(cts.prenom, '')) LIKE $1
         OR LOWER(TRIM(CONCAT_WS(' ', cts.prenom, cts.nom))) LIKE $1
         OR LOWER(COALESCE(cts.email, '')) LIKE $1
         OR LOWER(COALESCE(cts.telephone, '')) LIKE $1
         OR LOWER(COALESCE(cli.name, '')) LIKE $1
      ORDER BY cts.nom NULLS LAST, cts.prenom NULLS LAST
      LIMIT $2`,
    [like, limit]
  );
  return rows.map(row => {
    const name = firstNonEmpty(trimJoin(row.prenom, row.nom), row.email, `#${row.id}`);
    const subtitle = [row.poste, row.client_name, row.email].filter(Boolean).join(" · ");
    return item("contact", row.id, name, subtitle, {
      docType: "ContactDetail",
      payload: {
        id: row.id,
        contactId: row.id,
        nom: row.nom,
        prenom: row.prenom,
        email: row.email,
        telephone: row.telephone,
        poste: row.poste,
        client_id: row.client_id,
        client_name: row.client_name
      }
    });
  });
}

function trimJoin(...parts) {
  return parts.map(part => String(part || "").trim()).filter(Boolean).join(" ");
}

async function searchTickets(like, limit, family) {
  const familySql = family === "sales" ? SALES_TICKET_MATCH_SQL : SUPPORT_TICKET_SQL;
  const type = family === "sales" ? "ticket_sales" : "ticket";
  const docType = family === "sales" ? "TicketSalesDetail" : "TicketDetail";
  const selectSql = `SELECT t.id, t.ticket_number, t.title, t.status, t.type, t.category, t.client_id,
            c.name AS client_name
       FROM v_b_tickets t
       LEFT JOIN v_b_clients c ON c.id = t.client_id`;
  const searchSql = `(
          LOWER(COALESCE(t.title, '')) LIKE $1
          OR LOWER(COALESCE(t.ticket_number::text, '')) LIKE $1
          OR LOWER(COALESCE(c.name, '')) LIKE $1
        )`;
  let rows = [];
  try {
    const result = await pool.query(
      `${selectSql}
        WHERE COALESCE(t.is_deleted, false) = false
          AND ${familySql}
          AND ${searchSql}
        ORDER BY t.updated_at DESC NULLS LAST
        LIMIT $2`,
      [like, limit]
    );
    rows = result.rows || [];
  } catch (err) {
    if (err?.code !== "42703" && err?.code !== "42P01") throw err;
    rows = await safeQuery(
      `${selectSql}
        WHERE ${familySql}
          AND ${searchSql}
        ORDER BY t.updated_at DESC NULLS LAST
        LIMIT $2`,
      [like, limit]
    );
  }
  return rows.map(row => {
    const number = row.ticket_number != null ? `#${row.ticket_number}` : "";
    const title = firstNonEmpty(row.title, number, String(row.id));
    const subtitle = [number, row.client_name, row.status].filter(Boolean).join(" · ");
    const payload = {
      ticketId: row.id,
      id: row.id,
      ticketNumber: row.ticket_number,
      title: row.title
    };
    if (family === "sales") {
      payload.ticketFamily = "sales";
      payload.fromPage = "TicketSales";
    }
    return item(type, row.id, title, subtitle, { docType, payload });
  });
}

function equipmentWhereSql(alias) {
  return `(
    LOWER(COALESCE(${alias}.display_name, '')) LIKE $1
    OR LOWER(COALESCE(${alias}.ip, '')) LIKE $1
    OR LOWER(COALESCE(${alias}.serial, '')) LIKE $1
    OR LOWER(COALESCE(${alias}.mac, '')) LIKE $1
    OR LOWER(COALESCE(${alias}.model, '')) LIKE $1
    OR LOWER(COALESCE(${alias}.client_name, '')) LIKE $1
  )`;
}

function equipmentSelect(table) {
  return `
    SELECT
      e.id,
      e.client_id,
      c.name AS client_name,
      COALESCE(
        NULLIF(TRIM(e.data->>'nom'), ''),
        NULLIF(TRIM(e.data->>'name'), ''),
        NULLIF(TRIM(e.name), ''),
        NULLIF(TRIM(e.item_key), ''),
        '—'
      ) AS display_name,
      COALESCE(NULLIF(TRIM(e.data->>'ip'), ''), '') AS ip,
      COALESCE(
        NULLIF(TRIM(e.data->>'numeroSerie'), ''),
        NULLIF(TRIM(e.data->>'serial'), ''),
        NULLIF(TRIM(e.data->>'sn'), ''),
        ''
      ) AS serial,
      COALESCE(
        NULLIF(TRIM(e.data->>'adresseMac'), ''),
        NULLIF(TRIM(e.data->>'mac'), ''),
        ''
      ) AS mac,
      COALESCE(
        NULLIF(TRIM(e.data->>'modele'), ''),
        NULLIF(TRIM(e.data->>'model'), ''),
        ''
      ) AS model
    FROM ${table} e
    INNER JOIN v_b_clients c ON c.id = e.client_id
    WHERE e.client_id IS NOT NULL
  `;
}

function mapEquipmentRow(row, meta) {
  const name = firstNonEmpty(row.display_name, "—");
  const subtitle = [meta.type || meta.familyLabel, row.client_name, row.ip, row.serial]
    .filter(Boolean)
    .join(" · ");
  const dbId = String(row.id);
  return item("equipment", `${row.client_id}:${dbId}`, name, subtitle, {
    docType: "EquipmentDetail",
    payload: {
      id: dbId,
      dbId,
      clientId: row.client_id,
      clientName: row.client_name,
      type: meta.type,
      family: meta.family,
      familyKey: meta.familyKey || null,
      familyLabel: meta.familyLabel || meta.type,
      familyIcon: meta.familyIcon || null,
      isCustom: Boolean(meta.isCustom),
      name,
      ip: row.ip || "",
      serial: row.serial || "",
      mac: row.mac || "",
      model: row.model || ""
    }
  });
}

async function searchEquipment(like, limit) {
  const perTable = Math.max(2, Math.ceil(limit / 2));
  const standard = await Promise.all(
    PURGE_HARDWARE_FAMILIES.map(async family => {
      const rows = await safeQuery(
        `SELECT * FROM (${equipmentSelect(family.table)}) eq
          WHERE ${equipmentWhereSql("eq")}
          LIMIT $2`,
        [like, perTable]
      );
      return rows.map(row => mapEquipmentRow(row, family));
    })
  );
  const customRows = await safeQuery(
    `SELECT
        ce.id,
        ce.client_id,
        c.name AS client_name,
        ce.family_key,
        COALESCE(NULLIF(TRIM(fd.label), ''), ce.family_key) AS family_label,
        COALESCE(NULLIF(TRIM(fd.icon), ''), 'mdi:devices') AS family_icon,
        COALESCE(
          NULLIF(TRIM(ce.data->>'nom'), ''),
          NULLIF(TRIM(ce.data->>'name'), ''),
          NULLIF(TRIM(ce.name), ''),
          NULLIF(TRIM(ce.item_key), ''),
          '—'
        ) AS display_name,
        COALESCE(NULLIF(TRIM(ce.data->>'ip'), ''), '') AS ip,
        COALESCE(
          NULLIF(TRIM(ce.data->>'numeroSerie'), ''),
          NULLIF(TRIM(ce.data->>'serial'), ''),
          NULLIF(TRIM(ce.data->>'sn'), ''),
          ''
        ) AS serial,
        COALESCE(
          NULLIF(TRIM(ce.data->>'adresseMac'), ''),
          NULLIF(TRIM(ce.data->>'mac'), ''),
          ''
        ) AS mac,
        COALESCE(
          NULLIF(TRIM(ce.data->>'modele'), ''),
          NULLIF(TRIM(ce.data->>'model'), ''),
          ''
        ) AS model
      FROM v_b_clients_m_custom_equipment ce
      INNER JOIN v_b_clients c ON c.id = ce.client_id
      LEFT JOIN v_b_equipment_family_definitions fd ON fd.family_key = ce.family_key
      WHERE ce.client_id IS NOT NULL
        AND (
          LOWER(COALESCE(ce.name, '')) LIKE $1
          OR LOWER(COALESCE(ce.item_key, '')) LIKE $1
          OR LOWER(COALESCE(c.name, '')) LIKE $1
          OR LOWER(COALESCE(ce.data->>'nom', '')) LIKE $1
          OR LOWER(COALESCE(ce.data->>'name', '')) LIKE $1
          OR LOWER(COALESCE(ce.data->>'ip', '')) LIKE $1
          OR LOWER(COALESCE(ce.data->>'numeroSerie', '')) LIKE $1
          OR LOWER(COALESCE(ce.data->>'serial', '')) LIKE $1
        )
      LIMIT $2`,
    [like, limit]
  );
  const custom = customRows.map(row => {
    const familyKey = String(row.family_key || "custom");
    return mapEquipmentRow(row, {
      type: `Custom:${familyKey}`,
      family: `custom:${familyKey}`,
      familyKey,
      familyLabel: row.family_label || familyKey,
      familyIcon: row.family_icon || "mdi:devices",
      isCustom: true
    });
  });
  return [...standard.flat(), ...custom].slice(0, limit);
}

async function searchTenants(like, limit) {
  const rows = await safeQuery(
    `SELECT a.client_id, c.name AS client_name, a.tenant_id
       FROM v_b_clients_azure a
       INNER JOIN v_b_clients c ON c.id = a.client_id
      WHERE a.tenant_id IS NOT NULL
        AND btrim(a.tenant_id::text) <> ''
        AND (
          LOWER(COALESCE(c.name, '')) LIKE $1
          OR LOWER(COALESCE(a.tenant_id::text, '')) LIKE $1
        )
      ORDER BY c.name ASC
      LIMIT $2`,
    [like, limit]
  );
  return rows.map(row =>
    item(
      "tenant",
      row.client_id,
      firstNonEmpty(row.client_name, row.tenant_id),
      firstNonEmpty(row.tenant_id),
      {
        docType: "TenantDetail",
        payload: {
          clientId: row.client_id,
          clientName: row.client_name,
          tenantId: row.tenant_id,
          displayName: row.client_name,
          status: "active"
        }
      }
    )
  );
}

function productNameFromRow(row) {
  const data = row.data && typeof row.data === "object" ? row.data : {};
  return firstNonEmpty(
    data.productName,
    data.produit,
    data.logiciel,
    data.name,
    row.name,
    row.item_key
  );
}

async function searchCyberModule(table, type, docType, like, limit) {
  const rows = await safeQuery(
    `SELECT e.id, e.client_id, c.name AS client_name, e.name, e.item_key, e.data
       FROM ${table} e
       INNER JOIN v_b_clients c ON c.id = e.client_id
      WHERE (
          LOWER(COALESCE(c.name, '')) LIKE $1
          OR LOWER(COALESCE(e.name, '')) LIKE $1
          OR LOWER(COALESCE(e.item_key, '')) LIKE $1
          OR LOWER(COALESCE(e.data->>'productName', '')) LIKE $1
          OR LOWER(COALESCE(e.data->>'produit', '')) LIKE $1
          OR LOWER(COALESCE(e.data->>'logiciel', '')) LIKE $1
        )
      ORDER BY c.name ASC
      LIMIT $2`,
    [like, limit]
  );
  return rows.map(row => {
    const productName = productNameFromRow(row);
    const title = firstNonEmpty(productName, row.client_name);
    return item(type, `${row.client_id}:${row.id}`, title, row.client_name, {
      docType,
      payload: {
        clientId: row.client_id,
        clientName: row.client_name,
        productName,
        solution: productName,
        logiciel: productName,
        id: row.id,
        name: row.name,
        item_key: row.item_key,
        data: row.data
      }
    });
  });
}

async function searchArticles(query, limit) {
  try {
    const articles = await listKnowledgeArticles({
      search: query,
      includeDrafts: true
    });
    return (Array.isArray(articles) ? articles : []).slice(0, limit).map(article =>
      item(
        "article",
        article.id,
        article.title,
        firstNonEmpty(article.category, article.folder_name, article.status),
        {
          docType: "KnowledgeBaseArticle",
          payload: {
            articleId: article.id,
            mode: "read",
            title: article.title
          }
        }
      )
    );
  } catch {
    return [];
  }
}

async function searchAgents(like, limit) {
  const rows = await safeQuery(
    `SELECT u.id, u.username, u.email, u.role, u.profile, u.is_active
       FROM v_b_users u
      WHERE COALESCE(u.role, '') <> 'client'
        AND (
          LOWER(COALESCE(u.username, '')) LIKE $1
          OR LOWER(COALESCE(u.email, '')) LIKE $1
          OR LOWER(COALESCE(u.profile, '')) LIKE $1
        )
      ORDER BY u.username ASC NULLS LAST
      LIMIT $2`,
    [like, limit]
  );
  return rows.map(row => {
    const title = firstNonEmpty(row.username, row.email);
    const subtitle = [row.email, row.role, row.profile, row.is_active === false ? "inactif" : ""]
      .filter(Boolean)
      .join(" · ");
    return item("agent", row.id, title, subtitle, {
      docType: "Admin",
      payload: { tab: "users" },
      options: { adminTab: "users" }
    });
  });
}

export async function runGlobalSearch(user, rawQuery) {
  const query = String(rawQuery || "").trim();
  if (query.length < MIN_QUERY_LENGTH) {
    return { query, results: [] };
  }
  const like = likePattern(query);
  const community = isCommunity();
  const isAdmin = String(user?.role || "").toLowerCase() === "admin";
  const [
    canClients,
    canContacts,
    canTickets,
    canSales,
    canEquipment,
    canCyber,
    canServices,
    canKb,
    canAdmin
  ] = await Promise.all([
    userHasAnyPermission(user, ["contracts.view", "clients.view"]),
    userHasAnyPermission(user, ["contacts.view"]),
    userHasAnyPermission(user, ["tickets.view"]),
    community ? Promise.resolve(false) : userHasAnyPermission(user, ["sales.view"]),
    userHasAnyPermission(user, ["equipment_inventory.view", "infrastructure.view"]),
    userHasAnyPermission(user, ["cybersecurite.view"]),
    userHasAnyPermission(user, ["services.view"]),
    userHasAnyPermission(user, ["knowledge_base.view"]),
    Promise.resolve(isAdmin || (await userHasAnyPermission(user, ["config.view"])))
  ]);

  const tasks = [];
  if (canClients) tasks.push(searchClients(like, PER_TYPE_LIMIT));
  else tasks.push(Promise.resolve([]));
  if (canContacts) tasks.push(searchContacts(like, PER_TYPE_LIMIT));
  else tasks.push(Promise.resolve([]));
  if (canTickets) tasks.push(searchTickets(like, PER_TYPE_LIMIT, "support"));
  else tasks.push(Promise.resolve([]));
  if (canSales) tasks.push(searchTickets(like, PER_TYPE_LIMIT, "sales"));
  else tasks.push(Promise.resolve([]));
  if (canEquipment) tasks.push(searchEquipment(like, PER_TYPE_LIMIT));
  else tasks.push(Promise.resolve([]));
  if (canServices) tasks.push(searchTenants(like, PER_TYPE_LIMIT));
  else tasks.push(Promise.resolve([]));
  if (canCyber) tasks.push(searchCyberModule("v_b_clients_m_antivirus", "antivirus", "AntivirusDetail", like, PER_TYPE_LIMIT));
  else tasks.push(Promise.resolve([]));
  if (canCyber) tasks.push(searchCyberModule("v_b_clients_m_antispam", "antispam", "AntispamDetail", like, PER_TYPE_LIMIT));
  else tasks.push(Promise.resolve([]));
  if (canKb) tasks.push(searchArticles(query, PER_TYPE_LIMIT));
  else tasks.push(Promise.resolve([]));
  if (canAdmin && isAdmin) tasks.push(searchAgents(like, PER_TYPE_LIMIT));
  else tasks.push(Promise.resolve([]));

  const settled = await Promise.allSettled(tasks);
  const results = settled.flatMap(entry => (entry.status === "fulfilled" ? entry.value : []));
  return { query, results };
}

export { MIN_QUERY_LENGTH };
