ALTER TABLE v_b_knowledge_articles
  ADD COLUMN IF NOT EXISTS public_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS public_token VARCHAR(64) NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_v_b_knowledge_articles_public_token
  ON v_b_knowledge_articles (public_token)
  WHERE public_token IS NOT NULL;
