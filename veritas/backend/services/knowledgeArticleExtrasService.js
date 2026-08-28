import { pool } from "../database/db.js";
import { ensureKnowledgeArticlesSchema } from "./ensureKnowledgeArticlesSchema.js";
import { isUuid } from "./knowledgeFoldersService.js";

function uniqueUuids(values) {
  const seen = new Set();
  const out = [];
  for (const raw of Array.isArray(values) ? values : []) {
    const id = String(raw || "").trim();
    if (!isUuid(id) || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

export async function replaceArticleLinks(articleId, relatedIds) {
  if (!isUuid(articleId)) return [];
  await ensureKnowledgeArticlesSchema();
  const ids = uniqueUuids(relatedIds).filter(id => id !== articleId).slice(0, 20);
  await pool.query(`DELETE FROM v_b_knowledge_article_links WHERE article_id = $1`, [articleId]);
  for (const relatedId of ids) {
    await pool.query(
      `INSERT INTO v_b_knowledge_article_links (article_id, related_article_id)
       VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
      [articleId, relatedId]
    );
  }
  return ids;
}

export async function listArticleLinkIds(articleId) {
  if (!isUuid(articleId)) return [];
  try {
    const { rows } = await pool.query(
      `SELECT related_article_id FROM v_b_knowledge_article_links WHERE article_id = $1`,
      [articleId]
    );
    return rows.map(row => row.related_article_id);
  } catch (err) {
    if (err.code === "42P01") return [];
    throw err;
  }
}

export async function listRelatedPortalArticles(articleId, clientId, contactId, visibilitySql, params) {
  await ensureKnowledgeArticlesSchema();
  const linked = await pool.query(
    `SELECT a.id, a.title, a.category
       FROM v_b_knowledge_article_links l
       JOIN v_b_knowledge_articles a ON a.id = l.related_article_id
      WHERE l.article_id = $3 AND a.status = 'published' AND ${visibilitySql}
      ORDER BY a.title ASC
      LIMIT 8`,
    params
  );
  if (linked.rows.length) {
    return linked.rows.map(row => ({ id: row.id, title: row.title || "", category: row.category || null }));
  }
  const { rows } = await pool.query(
    `SELECT a.id, a.title, a.category
       FROM v_b_knowledge_articles a
       JOIN v_b_knowledge_articles src ON src.id = $3
      WHERE a.id <> $3
        AND a.status = 'published'
        AND ${visibilitySql}
        AND (
          (NULLIF(src.category, '') IS NOT NULL AND a.category = src.category)
          OR (src.folder_id IS NOT NULL AND a.folder_id = src.folder_id)
        )
      ORDER BY a.updated_at DESC
      LIMIT 5`,
    params
  );
  return rows.map(row => ({ id: row.id, title: row.title || "", category: row.category || null }));
}

export async function incrementArticleViews(articleId) {
  if (!isUuid(articleId)) return;
  try {
    await pool.query(
      `UPDATE v_b_knowledge_articles SET view_count = COALESCE(view_count, 0) + 1 WHERE id = $1`,
      [articleId]
    );
  } catch (err) {
    if (err.code !== "42703") throw err;
  }
}

export async function recordSearchMiss(query) {
  const q = String(query || "").trim().toLowerCase().slice(0, 200);
  if (q.length < 2) return;
  try {
    await pool.query(
      `INSERT INTO v_b_knowledge_search_misses (query, hit_count, last_at)
       VALUES ($1, 1, NOW())
       ON CONFLICT (query) DO UPDATE SET hit_count = v_b_knowledge_search_misses.hit_count + 1, last_at = NOW()`,
      [q]
    );
  } catch (err) {
    if (err.code !== "42P01") throw err;
  }
}

export async function listSearchMisses() {
  try {
    const { rows } = await pool.query(
      `SELECT query, hit_count, last_at FROM v_b_knowledge_search_misses ORDER BY hit_count DESC, last_at DESC LIMIT 20`
    );
    return rows.map(row => ({ query: row.query, count: Number(row.hit_count) || 0, lastAt: row.last_at }));
  } catch (err) {
    if (err.code === "42P01") return [];
    throw err;
  }
}

export async function getHelpfulStats(articleId, contactId = null) {
  try {
    const [stats, mine] = await Promise.all([
      pool.query(
        `SELECT COUNT(*) FILTER (WHERE helpful) ::int AS yes_count,
                COUNT(*) FILTER (WHERE NOT helpful)::int AS no_count
           FROM v_b_knowledge_article_helpful
          WHERE article_id = $1`,
        [articleId]
      ),
      contactId != null
        ? pool.query(
          `SELECT helpful FROM v_b_knowledge_article_helpful WHERE article_id = $1 AND contact_id = $2`,
          [articleId, Number(contactId)]
        )
        : Promise.resolve({ rows: [] })
    ]);
    return {
      helpfulYes: Number(stats.rows[0]?.yes_count) || 0,
      helpfulNo: Number(stats.rows[0]?.no_count) || 0,
      myHelpful: mine.rows[0] ? mine.rows[0].helpful === true : null
    };
  } catch (err) {
    if (err.code === "42P01") return { helpfulYes: 0, helpfulNo: 0, myHelpful: null };
    throw err;
  }
}

export async function upsertHelpful(articleId, { contactId, helpful }) {
  await pool.query(
    `INSERT INTO v_b_knowledge_article_helpful (article_id, contact_id, helpful, updated_at)
     VALUES ($1, $2, $3, NOW())
     ON CONFLICT (article_id, contact_id) DO UPDATE SET helpful = EXCLUDED.helpful, updated_at = NOW()`,
    [articleId, Number(contactId), Boolean(helpful)]
  );
}

export async function isFavorite(articleId, contactId) {
  if (contactId == null) return false;
  try {
    const { rows } = await pool.query(
      `SELECT 1 FROM v_b_knowledge_article_favorites WHERE article_id = $1 AND contact_id = $2`,
      [articleId, Number(contactId)]
    );
    return Boolean(rows[0]);
  } catch (err) {
    if (err.code === "42P01") return false;
    throw err;
  }
}

export async function toggleFavorite(articleId, contactId) {
  const exists = await isFavorite(articleId, contactId);
  if (exists) {
    await pool.query(
      `DELETE FROM v_b_knowledge_article_favorites WHERE article_id = $1 AND contact_id = $2`,
      [articleId, Number(contactId)]
    );
    return false;
  }
  await pool.query(
    `INSERT INTO v_b_knowledge_article_favorites (article_id, contact_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
    [articleId, Number(contactId)]
  );
  return true;
}

export async function listFavoriteIds(contactId) {
  if (contactId == null) return [];
  try {
    const { rows } = await pool.query(
      `SELECT article_id FROM v_b_knowledge_article_favorites WHERE contact_id = $1`,
      [Number(contactId)]
    );
    return rows.map(row => row.article_id);
  } catch (err) {
    if (err.code === "42P01") return [];
    throw err;
  }
}
