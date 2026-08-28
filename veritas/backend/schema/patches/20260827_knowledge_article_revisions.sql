-- Créateur / dernier modificateur + historique simple de révisions KB

ALTER TABLE v_b_knowledge_articles
  ADD COLUMN IF NOT EXISTS updated_by_user_id UUID NULL REFERENCES v_b_users(id) ON DELETE SET NULL;

UPDATE v_b_knowledge_articles
   SET updated_by_user_id = author_user_id
 WHERE updated_by_user_id IS NULL
   AND author_user_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS v_b_knowledge_article_revisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID NOT NULL REFERENCES v_b_knowledge_articles(id) ON DELETE CASCADE,
  revision INTEGER NOT NULL,
  title VARCHAR(255) NOT NULL DEFAULT '',
  category VARCHAR(64) NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'draft',
  content_json JSONB NOT NULL DEFAULT '{"type":"doc","content":[{"type":"paragraph"}]}'::jsonb,
  content_html TEXT NOT NULL DEFAULT '',
  content_plain TEXT NULL,
  folder_id UUID NULL,
  editor_user_id UUID NULL REFERENCES v_b_users(id) ON DELETE SET NULL,
  change_kind VARCHAR(24) NOT NULL DEFAULT 'saved',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT v_b_knowledge_article_revisions_kind_chk
    CHECK (change_kind IN ('created', 'saved', 'published', 'unpublished', 'restored')),
  CONSTRAINT v_b_knowledge_article_revisions_unique UNIQUE (article_id, revision)
);

CREATE INDEX IF NOT EXISTS idx_v_b_knowledge_article_revisions_article
  ON v_b_knowledge_article_revisions (article_id, revision DESC);

INSERT INTO v_b_knowledge_article_revisions (
  article_id, revision, title, category, status, content_json, content_html, content_plain,
  folder_id, editor_user_id, change_kind, created_at
)
SELECT a.id,
       1,
       a.title,
       a.category,
       a.status,
       a.content_json,
       a.content_html,
       a.content_plain,
       a.folder_id,
       COALESCE(a.updated_by_user_id, a.author_user_id),
       CASE WHEN a.status = 'published' THEN 'published' ELSE 'created' END,
       COALESCE(a.created_at, NOW())
  FROM v_b_knowledge_articles a
 WHERE NOT EXISTS (
   SELECT 1 FROM v_b_knowledge_article_revisions r WHERE r.article_id = a.id
 );

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE v_b_knowledge_article_revisions TO veritas_user;
