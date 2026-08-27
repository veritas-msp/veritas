import { pool } from "../database/db.js";
import { ensureKnowledgeArticlesSchema } from "./ensureKnowledgeArticlesSchema.js";

function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

function normalizeName(value) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, 64);
}

function mapCategory(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    articleCount: Number(row.article_count) || 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

async function seedFromArticles() {
  await pool.query(`
    INSERT INTO v_b_knowledge_categories (name)
    SELECT DISTINCT ON (lower(trim(category))) trim(category)
      FROM v_b_knowledge_articles
     WHERE nullif(trim(category), '') IS NOT NULL
     ORDER BY lower(trim(category)), category
    ON CONFLICT DO NOTHING
  `);
}

async function findByName(name) {
  const { rows } = await pool.query(
    `SELECT c.*, COUNT(a.id)::int AS article_count
       FROM v_b_knowledge_categories c
       LEFT JOIN v_b_knowledge_articles a ON lower(COALESCE(a.category, '')) = lower(c.name)
      WHERE lower(c.name) = lower($1)
      GROUP BY c.id`,
    [name]
  );
  return mapCategory(rows[0]);
}

export async function listKnowledgeCategories() {
  await ensureKnowledgeArticlesSchema();
  await seedFromArticles();
  const { rows } = await pool.query(
    `SELECT c.*, COUNT(a.id)::int AS article_count
       FROM v_b_knowledge_categories c
       LEFT JOIN v_b_knowledge_articles a ON lower(COALESCE(a.category, '')) = lower(c.name)
      GROUP BY c.id
      ORDER BY lower(c.name)`
  );
  return rows.map(mapCategory);
}

export async function ensureKnowledgeCategory(name) {
  const normalized = normalizeName(name);
  if (!normalized) return null;
  await ensureKnowledgeArticlesSchema();
  const existing = await findByName(normalized);
  if (existing) return existing;
  try {
    const { rows } = await pool.query(
      `INSERT INTO v_b_knowledge_categories (name) VALUES ($1) RETURNING *, 0 AS article_count`,
      [normalized]
    );
    return mapCategory(rows[0]);
  } catch (err) {
    if (err.code === "23505") return findByName(normalized);
    throw err;
  }
}

export async function createKnowledgeCategory(name) {
  const category = await ensureKnowledgeCategory(name);
  if (!category) throw httpError(400, "Name required.");
  return category;
}

export async function updateKnowledgeCategory(id, name) {
  await ensureKnowledgeArticlesSchema();
  const normalized = normalizeName(name);
  if (!normalized) throw httpError(400, "Name required.");
  const { rows: currentRows } = await pool.query(`SELECT * FROM v_b_knowledge_categories WHERE id = $1`, [id]);
  const current = currentRows[0];
  if (!current) return null;
  if (current.name === normalized) return findByName(normalized);
  const clash = await findByName(normalized);
  if (clash && clash.id !== id) throw httpError(409, "Category already exists.");
  await pool.query(
    `UPDATE v_b_knowledge_articles
        SET category = $2
      WHERE lower(COALESCE(category, '')) = lower($1)`,
    [current.name, normalized]
  );
  const { rows } = await pool.query(
    `UPDATE v_b_knowledge_categories
        SET name = $2, updated_at = NOW()
      WHERE id = $1
      RETURNING *`,
    [id, normalized]
  );
  return findByName(rows[0]?.name || normalized);
}

export async function deleteKnowledgeCategory(id) {
  await ensureKnowledgeArticlesSchema();
  const { rows } = await pool.query(`SELECT name FROM v_b_knowledge_categories WHERE id = $1`, [id]);
  if (!rows[0]) return false;
  await pool.query(
    `UPDATE v_b_knowledge_articles
        SET category = NULL
      WHERE lower(COALESCE(category, '')) = lower($1)`,
    [rows[0].name]
  );
  await pool.query(`DELETE FROM v_b_knowledge_categories WHERE id = $1`, [id]);
  return true;
}
