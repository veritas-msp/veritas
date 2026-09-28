ALTER TABLE v_b_knowledge_articles
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS deleted_by_user_id UUID NULL;

CREATE INDEX IF NOT EXISTS idx_v_b_knowledge_articles_deleted_at
  ON v_b_knowledge_articles (deleted_at)
  WHERE deleted_at IS NOT NULL;
