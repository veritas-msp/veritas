-- Feedback portail (note + commentaires) sur les articles KB

ALTER TABLE v_b_knowledge_articles
  ADD COLUMN IF NOT EXISTS feedback_ratings_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS feedback_comments_enabled BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS v_b_knowledge_article_ratings (
  article_id UUID NOT NULL REFERENCES v_b_knowledge_articles(id) ON DELETE CASCADE,
  contact_id INTEGER NOT NULL REFERENCES v_b_contacts(id) ON DELETE CASCADE,
  client_id INTEGER NULL REFERENCES v_b_clients(id) ON DELETE SET NULL,
  rating SMALLINT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (article_id, contact_id),
  CONSTRAINT v_b_knowledge_article_ratings_chk CHECK (rating BETWEEN 1 AND 5)
);

CREATE INDEX IF NOT EXISTS idx_v_b_knowledge_article_ratings_article
  ON v_b_knowledge_article_ratings (article_id);

CREATE TABLE IF NOT EXISTS v_b_knowledge_article_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID NOT NULL REFERENCES v_b_knowledge_articles(id) ON DELETE CASCADE,
  contact_id INTEGER NOT NULL REFERENCES v_b_contacts(id) ON DELETE CASCADE,
  client_id INTEGER NULL REFERENCES v_b_clients(id) ON DELETE SET NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NULL
);

CREATE INDEX IF NOT EXISTS idx_v_b_knowledge_article_comments_article
  ON v_b_knowledge_article_comments (article_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE v_b_knowledge_article_ratings TO veritas_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE v_b_knowledge_article_comments TO veritas_user;
