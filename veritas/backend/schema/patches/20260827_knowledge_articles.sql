-- Base de connaissances interne (articles, audience, fichiers)

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS v_b_knowledge_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL DEFAULT '',
  category VARCHAR(64) NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'draft',
  visible_to_agents BOOLEAN NOT NULL DEFAULT TRUE,
  content_json JSONB NOT NULL DEFAULT '{"type":"doc","content":[{"type":"paragraph"}]}'::jsonb,
  content_html TEXT NOT NULL DEFAULT '',
  content_plain TEXT NULL,
  author_user_id UUID NULL REFERENCES v_b_users(id) ON DELETE SET NULL,
  published_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT v_b_knowledge_articles_status_chk CHECK (status IN ('draft', 'published'))
);

CREATE INDEX IF NOT EXISTS idx_v_b_knowledge_articles_status
  ON v_b_knowledge_articles (status, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_v_b_knowledge_articles_title
  ON v_b_knowledge_articles (lower(title));

CREATE TABLE IF NOT EXISTS v_b_knowledge_article_clients (
  article_id UUID NOT NULL REFERENCES v_b_knowledge_articles(id) ON DELETE CASCADE,
  client_id INTEGER NOT NULL REFERENCES v_b_clients(id) ON DELETE CASCADE,
  PRIMARY KEY (article_id, client_id)
);

CREATE INDEX IF NOT EXISTS idx_v_b_knowledge_article_clients_client
  ON v_b_knowledge_article_clients (client_id);

CREATE TABLE IF NOT EXISTS v_b_knowledge_article_contacts (
  article_id UUID NOT NULL REFERENCES v_b_knowledge_articles(id) ON DELETE CASCADE,
  contact_id INTEGER NOT NULL REFERENCES v_b_contacts(id) ON DELETE CASCADE,
  PRIMARY KEY (article_id, contact_id)
);

CREATE INDEX IF NOT EXISTS idx_v_b_knowledge_article_contacts_contact
  ON v_b_knowledge_article_contacts (contact_id);

CREATE TABLE IF NOT EXISTS v_b_knowledge_article_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID NOT NULL REFERENCES v_b_knowledge_articles(id) ON DELETE CASCADE,
  file_name VARCHAR(255) NOT NULL,
  stored_name VARCHAR(255) NOT NULL,
  mime_type VARCHAR(120) NOT NULL,
  size_bytes INTEGER NOT NULL DEFAULT 0,
  uploaded_by UUID NULL REFERENCES v_b_users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_v_b_knowledge_article_assets_article
  ON v_b_knowledge_article_assets (article_id, created_at DESC);

ALTER TABLE v_b_users_profiles
  ADD COLUMN IF NOT EXISTS knowledge_base_enabled BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE v_b_users_profiles
SET knowledge_base_enabled = TRUE
WHERE LOWER(REPLACE(REPLACE(name, '-', ' '), '_', ' ')) IN (
  'super admin', 'superadmin', 'super administrateur',
  'administrateur', 'administrator', 'admin'
);
