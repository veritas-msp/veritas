ALTER TABLE v_b_knowledge_articles
  ADD COLUMN IF NOT EXISTS view_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS feedback_comments_company BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS v_b_knowledge_article_links (
  article_id UUID NOT NULL REFERENCES v_b_knowledge_articles(id) ON DELETE CASCADE,
  related_article_id UUID NOT NULL REFERENCES v_b_knowledge_articles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (article_id, related_article_id),
  CONSTRAINT v_b_knowledge_article_links_self_chk CHECK (article_id <> related_article_id)
);

CREATE INDEX IF NOT EXISTS idx_v_b_knowledge_article_links_related
  ON v_b_knowledge_article_links (related_article_id);

CREATE TABLE IF NOT EXISTS v_b_knowledge_article_favorites (
  article_id UUID NOT NULL REFERENCES v_b_knowledge_articles(id) ON DELETE CASCADE,
  contact_id INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (article_id, contact_id)
);

CREATE INDEX IF NOT EXISTS idx_v_b_knowledge_article_favorites_contact
  ON v_b_knowledge_article_favorites (contact_id);

CREATE TABLE IF NOT EXISTS v_b_knowledge_article_helpful (
  article_id UUID NOT NULL REFERENCES v_b_knowledge_articles(id) ON DELETE CASCADE,
  contact_id INTEGER NOT NULL,
  helpful BOOLEAN NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (article_id, contact_id)
);

CREATE TABLE IF NOT EXISTS v_b_knowledge_search_misses (
  query VARCHAR(200) PRIMARY KEY,
  hit_count INTEGER NOT NULL DEFAULT 1,
  last_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE v_b_knowledge_article_links TO veritas_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE v_b_knowledge_article_favorites TO veritas_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE v_b_knowledge_article_helpful TO veritas_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE v_b_knowledge_search_misses TO veritas_user;
