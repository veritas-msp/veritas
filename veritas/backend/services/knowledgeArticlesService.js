import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { pool } from "../database/db.js";
import { ensureKnowledgeArticlesSchema } from "./ensureKnowledgeArticlesSchema.js";

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
    contentJson: asJson(row.content_json, EMPTY_DOC),
    contentHtml: row.content_html || "",
    contentPlain: row.content_plain || "",
    authorUserId: row.author_user_id || null,
    authorName: row.author_name || null,
    publishedAt: row.published_at || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    clientIds: extras.clientIds || [],
    contactIds: extras.contactIds || [],
    clients: extras.clients || [],
    contacts: extras.contacts || [],
    clientCount: extras.clientCount ?? extras.clientIds?.length ?? (Number(row.client_count) || 0),
    contactCount: extras.contactCount ?? extras.contactIds?.length ?? (Number(row.contact_count) || 0)
  };
}

export async function listArticleAudience(articleId) {
  const [clients, contacts] = await Promise.all([
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
    )
  ]);
  return {
    clients: clients.rows.map(row => ({ id: row.id, name: row.name || `#${row.id}` })),
    contacts: contacts.rows.map(row => ({
      id: row.id,
      name: String(row.name || "").trim() || `#${row.id}`,
      email: row.email || null
    })),
    clientIds: clients.rows.map(row => row.id),
    contactIds: contacts.rows.map(row => row.id)
  };
}

export async function replaceArticleAudience(articleId, clientIds, contactIds) {
  const clients = uniqueIds(clientIds, true);
  const contacts = uniqueIds(contactIds, true);
  await pool.query(`DELETE FROM v_b_knowledge_article_clients WHERE article_id = $1`, [articleId]);
  await pool.query(`DELETE FROM v_b_knowledge_article_contacts WHERE article_id = $1`, [articleId]);
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
  return { clientIds: clients, contactIds: contacts };
}

export async function listKnowledgeArticles({ search, status, includeDrafts = false } = {}) {
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
  }
  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const { rows } = await pool.query(
    `SELECT a.*,
            TRIM(COALESCE(u.username, u.email, '')) AS author_name,
            (SELECT COUNT(*)::int FROM v_b_knowledge_article_clients k WHERE k.article_id = a.id) AS client_count,
            (SELECT COUNT(*)::int FROM v_b_knowledge_article_contacts k WHERE k.article_id = a.id) AS contact_count
       FROM v_b_knowledge_articles a
       LEFT JOIN v_b_users u ON u.id = a.author_user_id
       ${where}
       ORDER BY a.updated_at DESC`,
    values
  );
  return rows.map(row => mapArticleRow(row));
}

export async function getKnowledgeArticle(articleId) {
  await ensureKnowledgeArticlesSchema();
  const { rows } = await pool.query(
    `SELECT a.*, TRIM(COALESCE(u.username, u.email, '')) AS author_name
       FROM v_b_knowledge_articles a
       LEFT JOIN v_b_users u ON u.id = a.author_user_id
      WHERE a.id = $1`,
    [articleId]
  );
  const row = rows[0];
  if (!row) return null;
  const audience = await listArticleAudience(articleId);
  return mapArticleRow(row, audience);
}

export async function createKnowledgeArticle({ title, category, authorUserId } = {}) {
  await ensureKnowledgeArticlesSchema();
  const { rows } = await pool.query(
    `INSERT INTO v_b_knowledge_articles (title, category, author_user_id, content_json, content_html, content_plain)
     VALUES ($1, $2, $3, $4::jsonb, '', '')
     RETURNING *`,
    [String(title || "").trim() || "Sans titre", String(category || "").trim() || null, authorUserId || null, JSON.stringify(EMPTY_DOC)]
  );
  return mapArticleRow(rows[0], { clientIds: [], contactIds: [], clients: [], contacts: [] });
}

export async function updateKnowledgeArticle(articleId, patch = {}) {
  await ensureKnowledgeArticlesSchema();
  const existing = await getKnowledgeArticle(articleId);
  if (!existing) return null;
  const title = patch.title != null ? String(patch.title).trim() : existing.title;
  const category = patch.category !== undefined ? (String(patch.category || "").trim() || null) : existing.category;
  const visibleToAgents = patch.visibleToAgents != null ? Boolean(patch.visibleToAgents) : existing.visibleToAgents;
  const contentJson = patch.contentJson != null ? asJson(patch.contentJson, existing.contentJson) : existing.contentJson;
  const contentHtml = patch.contentHtml != null ? String(patch.contentHtml) : existing.contentHtml;
  const contentPlain = htmlToPlain(contentHtml);
  const status = patch.status === "draft" || patch.status === "published" ? patch.status : existing.status;
  let publishedAt = existing.publishedAt;
  if (status === "published" && !publishedAt) publishedAt = new Date().toISOString();
  if (status === "draft") publishedAt = existing.publishedAt;
  const { rows } = await pool.query(
    `UPDATE v_b_knowledge_articles
        SET title = $2,
            category = $3,
            visible_to_agents = $4,
            content_json = $5::jsonb,
            content_html = $6,
            content_plain = $7,
            status = $8,
            published_at = $9,
            updated_at = NOW()
      WHERE id = $1
      RETURNING *`,
    [articleId, title || "Sans titre", category, visibleToAgents, JSON.stringify(contentJson), contentHtml, contentPlain, status, publishedAt]
  );
  if (patch.clientIds || patch.contactIds) {
    await replaceArticleAudience(
      articleId,
      patch.clientIds != null ? patch.clientIds : existing.clientIds,
      patch.contactIds != null ? patch.contactIds : existing.contactIds
    );
  }
  const audience = await listArticleAudience(articleId);
  return mapArticleRow({ ...rows[0], author_name: existing.authorName }, audience);
}

export async function publishKnowledgeArticle(articleId, { visibleToAgents, clientIds, contactIds } = {}) {
  return updateKnowledgeArticle(articleId, {
    status: "published",
    visibleToAgents: visibleToAgents != null ? visibleToAgents : true,
    clientIds,
    contactIds
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

export function portalVisibilitySql(clientAlias = "a") {
  return `(
    EXISTS (
      SELECT 1 FROM v_b_knowledge_article_clients kc
       WHERE kc.article_id = ${clientAlias}.id AND kc.client_id = $1
    )
    OR (
      $2::int IS NOT NULL AND EXISTS (
        SELECT 1 FROM v_b_knowledge_article_contacts kt
         WHERE kt.article_id = ${clientAlias}.id AND kt.contact_id = $2
      )
    )
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
