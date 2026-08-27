-- Visibilité KB par tags entreprise / contact (catalogue v_b_client_tags)

CREATE TABLE IF NOT EXISTS v_b_knowledge_article_client_tags (
  article_id UUID NOT NULL REFERENCES v_b_knowledge_articles(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES v_b_client_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (article_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_v_b_knowledge_article_client_tags_tag
  ON v_b_knowledge_article_client_tags (tag_id);

CREATE TABLE IF NOT EXISTS v_b_knowledge_article_contact_tags (
  article_id UUID NOT NULL REFERENCES v_b_knowledge_articles(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES v_b_client_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (article_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_v_b_knowledge_article_contact_tags_tag
  ON v_b_knowledge_article_contact_tags (tag_id);

CREATE TABLE IF NOT EXISTS v_b_knowledge_folder_client_tags (
  folder_id UUID NOT NULL REFERENCES v_b_knowledge_folders(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES v_b_client_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (folder_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_v_b_knowledge_folder_client_tags_tag
  ON v_b_knowledge_folder_client_tags (tag_id);

CREATE TABLE IF NOT EXISTS v_b_knowledge_folder_contact_tags (
  folder_id UUID NOT NULL REFERENCES v_b_knowledge_folders(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES v_b_client_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (folder_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_v_b_knowledge_folder_contact_tags_tag
  ON v_b_knowledge_folder_contact_tags (tag_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE v_b_knowledge_article_client_tags TO veritas_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE v_b_knowledge_article_contact_tags TO veritas_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE v_b_knowledge_folder_client_tags TO veritas_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE v_b_knowledge_folder_contact_tags TO veritas_user;
