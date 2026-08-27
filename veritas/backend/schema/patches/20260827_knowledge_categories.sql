-- Catalogue de catégories pour la base de connaissances (anti-doublons)

CREATE TABLE IF NOT EXISTS v_b_knowledge_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(64) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_v_b_knowledge_categories_name_lower
  ON v_b_knowledge_categories (lower(name));

INSERT INTO v_b_knowledge_categories (name)
SELECT DISTINCT ON (lower(trim(category))) trim(category)
  FROM v_b_knowledge_articles
 WHERE nullif(trim(category), '') IS NOT NULL
 ORDER BY lower(trim(category)), category
ON CONFLICT DO NOTHING;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE v_b_knowledge_categories TO veritas_user;
