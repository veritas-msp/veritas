import { pool } from "../database/db.js";
import { ensureKnowledgeArticlesSchema } from "./ensureKnowledgeArticlesSchema.js";

const COMMENT_MAX = 2000;

function contactName(row) {
  const name = `${row.prenom || ""} ${row.nom || ""}`.trim();
  return name || row.email || (row.contact_id != null ? `#${row.contact_id}` : "");
}

function mapComment(row, { contactId } = {}) {
  const createdAt = row.created_at || null;
  const updatedAt = row.updated_at || null;
  const edited = Boolean(updatedAt) && (!createdAt || new Date(updatedAt).getTime() - new Date(createdAt).getTime() > 1000);
  return {
    id: row.id,
    articleId: row.article_id,
    body: row.body || "",
    createdAt,
    updatedAt,
    edited,
    contactId: row.contact_id || null,
    clientId: row.client_id || null,
    authorName: contactName(row),
    authorEmail: row.email || null,
    companyName: row.company_name || null,
    isMine: contactId != null && Number(row.contact_id) === Number(contactId)
  };
}

function emptySummary() {
  return { ratingAverage: 0, ratingCount: 0, commentCount: 0, myRating: null, comments: [] };
}

export async function getArticleFeedbackSummary(articleId, { contactId } = {}) {
  await ensureKnowledgeArticlesSchema();
  try {
    const [stats, mine, comments, commentCount] = await Promise.all([
      pool.query(
        `SELECT COALESCE(ROUND(AVG(rating)::numeric, 1), 0)::float AS rating_average,
                COUNT(*)::int AS rating_count
           FROM v_b_knowledge_article_ratings
          WHERE article_id = $1`,
        [articleId]
      ),
      contactId != null
        ? pool.query(
          `SELECT rating FROM v_b_knowledge_article_ratings WHERE article_id = $1 AND contact_id = $2`,
          [articleId, Number(contactId)]
        )
        : Promise.resolve({ rows: [] }),
      pool.query(
        `SELECT c.id, c.article_id, c.body, c.created_at, c.updated_at, c.contact_id, c.client_id,
                ct.prenom, ct.nom, ct.email, cl.name AS company_name
           FROM v_b_knowledge_article_comments c
           LEFT JOIN v_b_contacts ct ON ct.id = c.contact_id
           LEFT JOIN v_b_clients cl ON cl.id = c.client_id
          WHERE c.article_id = $1
          ORDER BY c.created_at DESC
          LIMIT 100`,
        [articleId]
      ),
      pool.query(
        `SELECT COUNT(*)::int AS comment_count FROM v_b_knowledge_article_comments WHERE article_id = $1`,
        [articleId]
      )
    ]);
    const commentRows = comments.rows;
    return {
      ratingAverage: Number(stats.rows[0]?.rating_average) || 0,
      ratingCount: Number(stats.rows[0]?.rating_count) || 0,
      commentCount: Number(commentCount.rows[0]?.comment_count) || 0,
      myRating: mine.rows[0] ? Number(mine.rows[0].rating) : null,
      comments: commentRows.map(row => mapComment(row, { contactId }))
    };
  } catch (err) {
    if (err.code === "42P01") return emptySummary();
    throw err;
  }
}

async function assertArticleFeedback(articleId) {
  const { rows } = await pool.query(
    `SELECT id, status,
            COALESCE(feedback_ratings_enabled, FALSE) AS ratings_enabled,
            COALESCE(feedback_comments_enabled, FALSE) AS comments_enabled
       FROM v_b_knowledge_articles
      WHERE id = $1`,
    [articleId]
  );
  return rows[0] || null;
}

export async function upsertArticleRating(articleId, { contactId, clientId, rating }) {
  await ensureKnowledgeArticlesSchema();
  if (contactId == null) {
    const err = new Error("A contact is required to rate this article.");
    err.status = 400;
    throw err;
  }
  const value = Number(rating);
  if (!Number.isInteger(value) || value < 1 || value > 5) {
    const err = new Error("Rating must be between 1 and 5.");
    err.status = 400;
    throw err;
  }
  const article = await assertArticleFeedback(articleId);
  if (!article || article.status !== "published") {
    const err = new Error("Article not found.");
    err.status = 404;
    throw err;
  }
  if (!article.ratings_enabled) {
    const err = new Error("Ratings are disabled on this article.");
    err.status = 403;
    throw err;
  }
  await pool.query(
    `INSERT INTO v_b_knowledge_article_ratings (article_id, contact_id, client_id, rating, updated_at)
     VALUES ($1, $2, $3, $4, NOW())
     ON CONFLICT (article_id, contact_id)
     DO UPDATE SET rating = EXCLUDED.rating, client_id = EXCLUDED.client_id, updated_at = NOW()`,
    [articleId, Number(contactId), clientId != null ? Number(clientId) : null, value]
  );
  return getArticleFeedbackSummary(articleId, { contactId });
}

export async function addArticleComment(articleId, { contactId, clientId, body }) {
  await ensureKnowledgeArticlesSchema();
  if (contactId == null) {
    const err = new Error("A contact is required to comment.");
    err.status = 400;
    throw err;
  }
  const text = String(body || "").trim();
  if (!text) {
    const err = new Error("Comment cannot be empty.");
    err.status = 400;
    throw err;
  }
  if (text.length > COMMENT_MAX) {
    const err = new Error(`Comment is too long (max ${COMMENT_MAX} characters).`);
    err.status = 400;
    throw err;
  }
  const article = await assertArticleFeedback(articleId);
  if (!article || article.status !== "published") {
    const err = new Error("Article not found.");
    err.status = 404;
    throw err;
  }
  if (!article.comments_enabled) {
    const err = new Error("Comments are disabled on this article.");
    err.status = 403;
    throw err;
  }
  await pool.query(
    `INSERT INTO v_b_knowledge_article_comments (article_id, contact_id, client_id, body)
     VALUES ($1, $2, $3, $4)`,
    [articleId, Number(contactId), clientId != null ? Number(clientId) : null, text.slice(0, COMMENT_MAX)]
  );
  return getArticleFeedbackSummary(articleId, { contactId });
}

export async function updateArticleComment(articleId, commentId, { contactId = null, body, asAgent = false } = {}) {
  await ensureKnowledgeArticlesSchema();
  const text = String(body || "").trim();
  if (!text) {
    const err = new Error("Comment cannot be empty.");
    err.status = 400;
    throw err;
  }
  if (text.length > COMMENT_MAX) {
    const err = new Error(`Comment is too long (max ${COMMENT_MAX} characters).`);
    err.status = 400;
    throw err;
  }
  const { rows } = await pool.query(
    `SELECT id, contact_id FROM v_b_knowledge_article_comments WHERE id = $1 AND article_id = $2`,
    [commentId, articleId]
  );
  const row = rows[0];
  if (!row) return false;
  if (!asAgent && Number(row.contact_id) !== Number(contactId)) {
    const err = new Error("You can only edit your own comment.");
    err.status = 403;
    throw err;
  }
  await pool.query(
    `UPDATE v_b_knowledge_article_comments
        SET body = $3, updated_at = NOW()
      WHERE id = $1 AND article_id = $2`,
    [commentId, articleId, text.slice(0, COMMENT_MAX)]
  );
  return true;
}

export async function deleteArticleComment(articleId, commentId, { contactId = null, asAgent = false } = {}) {
  await ensureKnowledgeArticlesSchema();
  const { rows } = await pool.query(
    `SELECT id, contact_id FROM v_b_knowledge_article_comments WHERE id = $1 AND article_id = $2`,
    [commentId, articleId]
  );
  const row = rows[0];
  if (!row) return false;
  if (!asAgent && Number(row.contact_id) !== Number(contactId)) {
    const err = new Error("You can only delete your own comment.");
    err.status = 403;
    throw err;
  }
  await pool.query(`DELETE FROM v_b_knowledge_article_comments WHERE id = $1 AND article_id = $2`, [commentId, articleId]);
  return true;
}
