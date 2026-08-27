-- Dossiers de la base de connaissances + héritage de partage

CREATE TABLE IF NOT EXISTS v_b_knowledge_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID NULL REFERENCES v_b_knowledge_folders(id) ON DELETE SET NULL,
  name VARCHAR(120) NOT NULL,
  inherit_sharing BOOLEAN NOT NULL DEFAULT TRUE,
  visible_to_agents BOOLEAN NOT NULL DEFAULT TRUE,
  visible_to_all_clients BOOLEAN NOT NULL DEFAULT FALSE,
  visible_to_all_contacts BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_v_b_knowledge_folders_parent
  ON v_b_knowledge_folders (parent_id, sort_order, name);

CREATE TABLE IF NOT EXISTS v_b_knowledge_folder_clients (
  folder_id UUID NOT NULL REFERENCES v_b_knowledge_folders(id) ON DELETE CASCADE,
  client_id INTEGER NOT NULL REFERENCES v_b_clients(id) ON DELETE CASCADE,
  PRIMARY KEY (folder_id, client_id)
);

CREATE INDEX IF NOT EXISTS idx_v_b_knowledge_folder_clients_client
  ON v_b_knowledge_folder_clients (client_id);

CREATE TABLE IF NOT EXISTS v_b_knowledge_folder_contacts (
  folder_id UUID NOT NULL REFERENCES v_b_knowledge_folders(id) ON DELETE CASCADE,
  contact_id INTEGER NOT NULL REFERENCES v_b_contacts(id) ON DELETE CASCADE,
  PRIMARY KEY (folder_id, contact_id)
);

CREATE INDEX IF NOT EXISTS idx_v_b_knowledge_folder_contacts_contact
  ON v_b_knowledge_folder_contacts (contact_id);

ALTER TABLE v_b_knowledge_articles
  ADD COLUMN IF NOT EXISTS folder_id UUID NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'v_b_knowledge_articles_folder_fk'
  ) THEN
    ALTER TABLE v_b_knowledge_articles
      ADD CONSTRAINT v_b_knowledge_articles_folder_fk
      FOREIGN KEY (folder_id) REFERENCES v_b_knowledge_folders(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_v_b_knowledge_articles_folder
  ON v_b_knowledge_articles (folder_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE v_b_knowledge_folders TO veritas_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE v_b_knowledge_folder_clients TO veritas_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE v_b_knowledge_folder_contacts TO veritas_user;
