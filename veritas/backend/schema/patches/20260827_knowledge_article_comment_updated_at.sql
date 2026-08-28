ALTER TABLE v_b_knowledge_article_comments
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NULL;
