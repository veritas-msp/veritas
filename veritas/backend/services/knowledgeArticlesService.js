import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { pool } from "../database/db.js";
import { ensureKnowledgeArticlesSchema } from "./ensureKnowledgeArticlesSchema.js";
import { ensureKnowledgeCategory } from "./knowledgeCategoriesService.js";
import { folderInheritanceSql, getInheritedFolderAudience, isUuid } from "./knowledgeFoldersService.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const KNOWLEDGE_ASSETS_DIR = path.join(__dirname, "..", "uploads", "knowledge-articles");

const EMPTY_DOC = { type: "doc", content: [{ type: "paragraph" }] };

export function htmlToPlain(html) {
  return String(html || "")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function asJson(value, fallback) {
  if (value && typeof value === "object" && !Array.isArray(value)) return value;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (parsed && typeof parsed === "object") return parsed;
    } catch {
      /* ignore */
    }
  }
  return fallback;
}

function uniqueIds(values, toNumber) {
  const seen = new Set();
  const out = [];
  for (const raw of Array.isArray(values) ? values : []) {
    const id = toNumber ? Number(raw) : String(raw || "").trim();
    if (toNumber && !Number.isInteger(id)) continue;
    if (!toNumber && !id) continue;
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

export async function ensureKnowledgeUploadsDir() {
  if (!fs.existsSync(KNOWLEDGE_ASSETS_DIR)) {
    fs.mkdirSync(KNOWLEDGE_ASSETS_DIR, { recursive: true });
  }
}

export function agentAssetUrl(articleId, assetId) {
  return `/api/knowledge-articles/${articleId}/assets/${assetId}`;
}

export function portalAssetUrl(articleId, assetId) {
  return `/api/client-portal/knowledge-base/${articleId}/assets/${assetId}`;
}

export function rewriteAssetUrls(html, articleId, toPortal) {
  const from = toPortal
    ? `/api/knowledge-articles/${articleId}/assets/`
    : `/api/client-portal/knowledge-base/${articleId}/assets/`;
  const to = toPortal
    ? `/api/client-portal/knowledge-base/${articleId}/assets/`
    : `/api/knowledge-articles/${articleId}/assets/`;
  return String(html || "").split(from).join(to);
}

function mapArticleRow(row, extras = {}) {
  if (!row) return null;
  return {
    id: row.id,
    title: row.title || "",
    category: row.category || null,
    status: row.status,
    visibleToAgents: row.visible_to_agents !== false,
    visibleToAllClients: row.visible_to_all_clients === true,
    visibleToAllContacts: row.visible_to_all_contacts === true,
    contentJson: asJson(row.content_json, EMPTY_DOC),
    contentHtml: row.content_html || "",
    contentPlain: row.content_plain || "",
    authorUserId: row.author_user_id || null,
    authorName: row.author_name || null,
    publishedAt: row.published_at || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    folderId: row.folder_id || null,
    folderName: row.folder_name || extras.folderName || null,
    clientIds: extras.clientIds || [],
    contactIds: extras.contactIds || [],
    clientTagIds: extras.clientTagIds || [],
    contactTagIds: extras.contactTagIds || [],
    clients: extras.clients || [],
    contacts: extras.contacts || [],
    clientTags: extras.clientTags || [],
    contactTags: extras.contactTags || [],
    clientCount: extras.clientCount ?? extras.clientIds?.length ?? (Number(row.client_count) || 0),
    contactCount: extras.contactCount ?? extras.contactIds?.length ?? (Number(row.contact_count) || 0),
    clientTagCount: extras.clientTagCount ?? extras.clientTagIds?.length ?? (Number(row.client_tag_count) || 0),
    contactTagCount: extras.contactTagCount ?? extras.contactTagIds?.length ?? (Number(row.contact_tag_count) || 0)
  };
}

export async function listKnowledgeTagCatalog() {
  await ensureKnowledgeArticlesSchema();
  try {
    const { rows } = await pool.query(
      `SELECT id, label, color
         FROM v_b_client_tags
        ORDER BY label ASC`
    );
    return rows.map(row => ({ id: row.id, label: row.label || "", color: row.color || null }));
  } catch (err) {
    if (err.code === "42P01") return [];
    throw err;
  }
}

function mapTagRows(rows) {
  return rows.map(row => ({ id: row.id, label: row.label || "", color: row.color || null }));
}

export async function listArticleAudience(articleId) {
  const [clients, contacts, clientTags, contactTags] = await Promise.all([
    pool.query(
      `SELECT c.id, c.name
         FROM v_b_knowledge_article_clients k
         JOIN v_b_clients c ON c.id = k.client_id
        WHERE k.article_id = $1
        ORDER BY c.name NULLS LAST`,
      [articleId]
    ),
    pool.query(
      `SELECT ct.id,
              TRIM(CONCAT(COALESCE(ct.prenom, ''), ' ', COALESCE(ct.nom, ''))) AS name,
              ct.email
         FROM v_b_knowledge_article_contacts k
         JOIN v_b_contacts ct ON ct.id = k.contact_id
        WHERE k.article_id = $1
        ORDER BY ct.nom NULLS LAST, ct.prenom NULLS LAST`,
      [articleId]
    ),
    pool.query(
      `SELECT t.id, t.label, t.color
         FROM v_b_knowledge_article_client_tags k
         JOIN v_b_client_tags t ON t.id = k.tag_id
        WHERE k.article_id = $1
        ORDER BY t.label`,
      [articleId]
    ).catch(err => (err.code === "42P01" ? { rows: [] } : Promise.reject(err))),
    pool.query(
      `SELECT t.id, t.label, t.color
         FROM v_b_knowledge_article_contact_tags k
         JOIN v_b_client_tags t ON t.id = k.tag_id
        WHERE k.article_id = $1
        ORDER BY t.label`,
      [articleId]
    ).catch(err => (err.code === "42P01" ? { rows: [] } : Promise.reject(err)))
  ]);
  return {
    clients: clients.rows.map(row => ({ id: row.id, name: row.name || `#${row.id}` })),
    contacts: contacts.rows.map(row => ({
      id: row.id,
      name: String(row.name || "").trim() || `#${row.id}`,
      email: row.email || null
    })),
    clientTags: mapTagRows(clientTags.rows),
    contactTags: mapTagRows(contactTags.rows),
    clientIds: clients.rows.map(row => row.id),
    contactIds: contacts.rows.map(row => row.id),
    clientTagIds: clientTags.rows.map(row => row.id),
    contactTagIds: contactTags.rows.map(row => row.id)
  };
}

export async function replaceArticleAudience(articleId, clientIds, contactIds, clientTagIds, contactTagIds) {
  const clients = uniqueIds(clientIds, true);
  const contacts = uniqueIds(contactIds, true);
  const clientTags = uniqueIds(clientTagIds, false).filter(isUuid);
  const contactTags = uniqueIds(contactTagIds, false).filter(isUuid);
  await pool.query(`DELETE FROM v_b_knowledge_article_clients WHERE article_id = $1`, [articleId]);
  await pool.query(`DELETE FROM v_b_knowledge_article_contacts WHERE article_id = $1`, [articleId]);
  await pool.query(`DELETE FROM v_b_knowledge_article_client_tags WHERE article_id = $1`, [articleId]);
  await pool.query(`DELETE FROM v_b_knowledge_article_contact_tags WHERE article_id = $1`, [articleId]);
  for (const clientId of clients) {
    await pool.query(
      `INSERT INTO v_b_knowledge_article_clients (article_id, client_id)
       VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
      [articleId, clientId]
    );
  }
  for (const contactId of contacts) {
    await pool.query(
      `INSERT INTO v_b_knowledge_article_contacts (article_id, contact_id)
       VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
      [articleId, contactId]
    );
  }
  for (const tagId of clientTags) {
    await pool.query(
      `INSERT INTO v_b_knowledge_article_client_tags (article_id, tag_id)
       VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
      [articleId, tagId]
    );
  }
  for (const tagId of contactTags) {
    await pool.query(
      `INSERT INTO v_b_knowledge_article_contact_tags (article_id, tag_id)
       VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
      [articleId, tagId]
    );
  }
  return { clientIds: clients, contactIds: contacts, clientTagIds: clientTags, contactTagIds: contactTags };
}

export async function listKnowledgeArticles({ search, status, includeDrafts = false, folderId, category } = {}) {
  await ensureKnowledgeArticlesSchema();
  const conditions = [];
  const values = [];
  if (!includeDrafts) {
    conditions.push(`a.status = 'published'`);
    conditions.push(`a.visible_to_agents = TRUE`);
  } else if (status === "draft" || status === "published") {
    values.push(status);
    conditions.push(`a.status = $${values.length}`);
  }
  const q = String(search || "").trim();
  if (q) {
    values.push(`%${q.toLowerCase()}%`);
    conditions.push(`(lower(a.title) LIKE $${values.length} OR lower(COALESCE(a.content_plain, '')) LIKE $${values.length} OR lower(COALESCE(a.category, '')) LIKE $${values.length})`);
  } else if (folderId === "root") {
    conditions.push(`a.folder_id IS NULL`);
  } else if (isUuid(folderId)) {
    values.push(folderId);
    conditions.push(`a.folder_id IN (
      WITH RECURSIVE descendants AS (
        SELECT id FROM v_b_knowledge_folders WHERE id = $${values.length}
        UNION ALL
        SELECT f.id
          FROM v_b_knowledge_folders f
          JOIN descendants d ON f.parent_id = d.id
      )
      SELECT id FROM descendants
    )`);
  }
  const categoryFilter = String(category || "").trim();
  if (categoryFilter) {
    values.push(categoryFilter.toLowerCase());
    conditions.push(`lower(COALESCE(a.category, '')) = $${values.length}`);
  }
  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const listSql = tagCounts => `
    SELECT a.*,
            TRIM(COALESCE(u.username, u.email, '')) AS author_name,
            f.name AS folder_name,
            (SELECT COUNT(*)::int FROM v_b_knowledge_article_clients k WHERE k.article_id = a.id) AS client_count,
            (SELECT COUNT(*)::int FROM v_b_knowledge_article_contacts k WHERE k.article_id = a.id) AS contact_count,
            ${tagCounts}
       FROM v_b_knowledge_articles a
       LEFT JOIN v_b_users u ON u.id = a.author_user_id
       LEFT JOIN v_b_knowledge_folders f ON f.id = a.folder_id
       ${where}
       ORDER BY a.updated_at DESC`;
  let rows;
  try {
    ({ rows } = await pool.query(
      listSql(`(SELECT COUNT(*)::int FROM v_b_knowledge_article_client_tags k WHERE k.article_id = a.id) AS client_tag_count,
            (SELECT COUNT(*)::int FROM v_b_knowledge_article_contact_tags k WHERE k.article_id = a.id) AS contact_tag_count`),
      values
    ));
  } catch (err) {
    if (err.code !== "42P01") throw err;
    ({ rows } = await pool.query(listSql(`0 AS client_tag_count, 0 AS contact_tag_count`), values));
  }
  return rows.map(row => mapArticleRow(row));
}

export async function getKnowledgeArticle(articleId) {
  await ensureKnowledgeArticlesSchema();
  const { rows } = await pool.query(
    `SELECT a.*,
            TRIM(COALESCE(u.username, u.email, '')) AS author_name,
            f.name AS folder_name
       FROM v_b_knowledge_articles a
       LEFT JOIN v_b_users u ON u.id = a.author_user_id
       LEFT JOIN v_b_knowledge_folders f ON f.id = a.folder_id
      WHERE a.id = $1`,
    [articleId]
  );
  const row = rows[0];
  if (!row) return null;
  const audience = await listArticleAudience(articleId);
  const inheritedSharing = row.folder_id ? await getInheritedFolderAudience(row.folder_id) : null;
  return {
    ...mapArticleRow(row, audience),
    inheritedSharing
  };
}

export async function createKnowledgeArticle({ title, category, authorUserId, folderId } = {}) {
  await ensureKnowledgeArticlesSchema();
  const folder = isUuid(folderId) ? folderId : null;
  if (folder) {
    const { rows: folderRows } = await pool.query(`SELECT 1 FROM v_b_knowledge_folders WHERE id = $1`, [folder]);
    if (!folderRows.length) {
      const err = new Error("Folder not found.");
      err.status = 404;
      throw err;
    }
  }
  const { rows } = await pool.query(
    `INSERT INTO v_b_knowledge_articles (title, category, author_user_id, folder_id, content_json, content_html, content_plain)
     VALUES ($1, $2, $3, $4, $5::jsonb, '', '')
     RETURNING *`,
    [String(title || "").trim() || "Sans titre", String(category || "").trim() || null, authorUserId || null, folder, JSON.stringify(EMPTY_DOC)]
  );
  if (rows[0]?.category) await ensureKnowledgeCategory(rows[0].category);
  return mapArticleRow(rows[0], { clientIds: [], contactIds: [], clients: [], contacts: [] });
}

export async function updateKnowledgeArticle(articleId, patch = {}) {
  await ensureKnowledgeArticlesSchema();
  const existing = await getKnowledgeArticle(articleId);
  if (!existing) return null;
  const title = patch.title != null ? String(patch.title).trim() : existing.title;
  const category = patch.category !== undefined ? (String(patch.category || "").trim() || null) : existing.category;
  if (category) await ensureKnowledgeCategory(category);
  const visibleToAgents = patch.visibleToAgents != null ? Boolean(patch.visibleToAgents) : existing.visibleToAgents;
  const visibleToAllClients = patch.visibleToAllClients != null ? Boolean(patch.visibleToAllClients) : existing.visibleToAllClients;
  const visibleToAllContacts = patch.visibleToAllContacts != null ? Boolean(patch.visibleToAllContacts) : existing.visibleToAllContacts;
  const contentJson = patch.contentJson != null ? asJson(patch.contentJson, existing.contentJson) : existing.contentJson;
  const contentHtml = patch.contentHtml != null ? String(patch.contentHtml) : existing.contentHtml;
  const contentPlain = htmlToPlain(contentHtml);
  const status = patch.status === "draft" || patch.status === "published" ? patch.status : existing.status;
  let publishedAt = existing.publishedAt;
  if (status === "published" && !publishedAt) publishedAt = new Date().toISOString();
  if (status === "draft") publishedAt = existing.publishedAt;
  const folderId = patch.folderId !== undefined
    ? (isUuid(patch.folderId) ? patch.folderId : null)
    : existing.folderId;
  await pool.query(
    `UPDATE v_b_knowledge_articles
        SET title = $2,
            category = $3,
            visible_to_agents = $4,
            visible_to_all_clients = $5,
            visible_to_all_contacts = $6,
            content_json = $7::jsonb,
            content_html = $8,
            content_plain = $9,
            status = $10,
            published_at = $11,
            folder_id = $12,
            updated_at = NOW()
      WHERE id = $1
      RETURNING *`,
    [articleId, title || "Sans titre", category, visibleToAgents, visibleToAllClients, visibleToAllContacts, JSON.stringify(contentJson), contentHtml, contentPlain, status, publishedAt, folderId]
  );
  if (patch.clientIds != null || patch.contactIds != null || patch.clientTagIds != null || patch.contactTagIds != null) {
    await replaceArticleAudience(
      articleId,
      patch.clientIds != null ? patch.clientIds : existing.clientIds,
      patch.contactIds != null ? patch.contactIds : existing.contactIds,
      patch.clientTagIds != null ? patch.clientTagIds : existing.clientTagIds,
      patch.contactTagIds != null ? patch.contactTagIds : existing.contactTagIds
    );
  }
  return getKnowledgeArticle(articleId);
}

export async function publishKnowledgeArticle(articleId, { visibleToAgents, visibleToAllClients, visibleToAllContacts, clientIds, contactIds, clientTagIds, contactTagIds } = {}) {
  return updateKnowledgeArticle(articleId, {
    status: "published",
    visibleToAgents: visibleToAgents != null ? visibleToAgents : true,
    visibleToAllClients,
    visibleToAllContacts,
    clientIds,
    contactIds,
    clientTagIds,
    contactTagIds
  });
}

export async function unpublishKnowledgeArticle(articleId) {
  return updateKnowledgeArticle(articleId, { status: "draft" });
}

export async function deleteKnowledgeArticle(articleId) {
  await ensureKnowledgeArticlesSchema();
  const assets = await pool.query(
    `SELECT stored_name FROM v_b_knowledge_article_assets WHERE article_id = $1`,
    [articleId]
  );
  const result = await pool.query(`DELETE FROM v_b_knowledge_articles WHERE id = $1 RETURNING id`, [articleId]);
  if (!result.rowCount) return false;
  for (const row of assets.rows) {
    const filePath = path.join(KNOWLEDGE_ASSETS_DIR, row.stored_name);
    try {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    } catch {
      /* ignore */
    }
  }
  return true;
}

export async function deleteKnowledgeArticles(ids) {
  const unique = uniqueIds(ids, false).filter(id => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id));
  let deleted = 0;
  for (const id of unique) {
    if (await deleteKnowledgeArticle(id)) deleted += 1;
  }
  return { deleted, requested: unique.length };
}

export async function addKnowledgeAsset({ articleId, fileName, storedName, mimeType, sizeBytes, uploadedBy }) {
  await ensureKnowledgeArticlesSchema();
  const { rows } = await pool.query(
    `INSERT INTO v_b_knowledge_article_assets (article_id, file_name, stored_name, mime_type, size_bytes, uploaded_by)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [articleId, fileName, storedName, mimeType, sizeBytes, uploadedBy || null]
  );
  const row = rows[0];
  return {
    id: row.id,
    articleId: row.article_id,
    fileName: row.file_name,
    mimeType: row.mime_type,
    sizeBytes: row.size_bytes,
    url: agentAssetUrl(articleId, row.id)
  };
}

export async function getKnowledgeAsset(articleId, assetId) {
  await ensureKnowledgeArticlesSchema();
  const { rows } = await pool.query(
    `SELECT * FROM v_b_knowledge_article_assets WHERE id = $1 AND article_id = $2`,
    [assetId, articleId]
  );
  return rows[0] || null;
}

export async function moveKnowledgeArticles(ids, folderId) {
  await ensureKnowledgeArticlesSchema();
  const unique = uniqueIds(ids, false).filter(id => isUuid(id));
  const folder = folderId && isUuid(folderId) ? folderId : null;
  if (folder) {
    const { rows } = await pool.query(`SELECT 1 FROM v_b_knowledge_folders WHERE id = $1`, [folder]);
    if (!rows.length) {
      const err = new Error("Folder not found.");
      err.status = 404;
      throw err;
    }
  }
  if (!unique.length) return { moved: 0 };
  const { rowCount } = await pool.query(
    `UPDATE v_b_knowledge_articles SET folder_id = $2, updated_at = NOW() WHERE id = ANY($1::uuid[])`,
    [unique, folder]
  );
  return { moved: rowCount || 0 };
}

export function portalVisibilitySql(clientAlias = "a") {
  return `(
    ${clientAlias}.visible_to_all_clients = TRUE
    OR ${clientAlias}.visible_to_all_contacts = TRUE
    OR EXISTS (
      SELECT 1 FROM v_b_knowledge_article_clients kc
       WHERE kc.article_id = ${clientAlias}.id AND kc.client_id = $1
    )
    OR (
      $2::int IS NOT NULL AND EXISTS (
        SELECT 1 FROM v_b_knowledge_article_contacts kt
         WHERE kt.article_id = ${clientAlias}.id AND kt.contact_id = $2
      )
    )
    OR EXISTS (
      SELECT 1
        FROM v_b_knowledge_article_client_tags act
        JOIN v_b_client_tag_links ctl ON ctl.tag_id = act.tag_id
       WHERE act.article_id = ${clientAlias}.id AND ctl.client_id = $1
    )
    OR (
      $2::int IS NOT NULL AND EXISTS (
        SELECT 1
          FROM v_b_knowledge_article_contact_tags att
          JOIN v_b_contact_tag_links ctl ON ctl.tag_id = att.tag_id
         WHERE att.article_id = ${clientAlias}.id AND ctl.contact_id = $2
      )
    )
    OR ${folderInheritanceSql(clientAlias)}
  )`;
}

export async function listPortalKnowledgeArticles(clientId, contactId, { search } = {}) {
  await ensureKnowledgeArticlesSchema();
  const values = [Number(clientId), contactId != null ? Number(contactId) : null];
  const conditions = [`a.status = 'published'`, portalVisibilitySql("a")];
  const q = String(search || "").trim();
  if (q) {
    values.push(`%${q.toLowerCase()}%`);
    conditions.push(`(lower(a.title) LIKE $${values.length} OR lower(COALESCE(a.content_plain, '')) LIKE $${values.length} OR lower(COALESCE(a.category, '')) LIKE $${values.length})`);
  }
  const { rows } = await pool.query(
    `SELECT a.id, a.title, a.category, a.content_plain, a.published_at, a.updated_at
       FROM v_b_knowledge_articles a
      WHERE ${conditions.join(" AND ")}
      ORDER BY a.updated_at DESC`,
    values
  );
  return rows.map(row => ({
    id: row.id,
    title: row.title || "",
    category: row.category || null,
    excerpt: String(row.content_plain || "").slice(0, 220),
    publishedAt: row.published_at,
    updatedAt: row.updated_at
  }));
}

export async function getPortalKnowledgeArticle(clientId, contactId, articleId) {
  await ensureKnowledgeArticlesSchema();
  const { rows } = await pool.query(
    `SELECT a.*
       FROM v_b_knowledge_articles a
      WHERE a.id = $3
        AND a.status = 'published'
        AND ${portalVisibilitySql("a")}`,
    [Number(clientId), contactId != null ? Number(contactId) : null, articleId]
  );
  const row = rows[0];
  if (!row) return null;
  return {
    id: row.id,
    title: row.title || "",
    category: row.category || null,
    contentHtml: rewriteAssetUrls(row.content_html || "", row.id, true),
    publishedAt: row.published_at,
    updatedAt: row.updated_at
  };
}

export async function portalCanAccessAsset(clientId, contactId, articleId) {
  const article = await getPortalKnowledgeArticle(clientId, contactId, articleId);
  return Boolean(article);
}
