-- Visibilité portail client pour les dossiers du coffre-fort documentaire
ALTER TABLE v_b_client_file_folders
  ADD COLUMN IF NOT EXISTS visible_to_client BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN v_b_client_file_folders.visible_to_client IS
  'Si true, le dossier (et son contenu visible) peut apparaître sur le portail client.';

CREATE INDEX IF NOT EXISTS idx_v_b_client_file_folders_portal_visible
  ON v_b_client_file_folders (client_id, visible_to_client)
  WHERE is_deleted = FALSE AND visible_to_client = TRUE;
