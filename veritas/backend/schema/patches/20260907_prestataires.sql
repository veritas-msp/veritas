-- Prestataires (providers/vendors) + N–N links to clients
BEGIN;

CREATE TABLE IF NOT EXISTS v_b_prestataires (
  id SERIAL PRIMARY KEY,
  nom TEXT NOT NULL,
  type TEXT NULL,
  contact_nom TEXT NULL,
  contact_prenom TEXT NULL,
  email TEXT NULL,
  telephone TEXT NULL,
  site_web TEXT NULL,
  adresse TEXT NULL,
  notes TEXT NULL,
  statut TEXT NOT NULL DEFAULT 'actif',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_v_b_prestataires_nom
  ON v_b_prestataires (LOWER(nom));

CREATE INDEX IF NOT EXISTS idx_v_b_prestataires_statut
  ON v_b_prestataires (statut);

CREATE TABLE IF NOT EXISTS v_b_prestataire_client_links (
  prestataire_id INTEGER NOT NULL REFERENCES v_b_prestataires(id) ON DELETE CASCADE,
  client_id INTEGER NOT NULL REFERENCES v_b_clients(id) ON DELETE CASCADE,
  role TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (prestataire_id, client_id)
);

CREATE INDEX IF NOT EXISTS idx_v_b_prestataire_client_links_client_id
  ON v_b_prestataire_client_links (client_id);

CREATE INDEX IF NOT EXISTS idx_v_b_prestataire_client_links_prestataire_id
  ON v_b_prestataire_client_links (prestataire_id);

CREATE TABLE IF NOT EXISTS v_b_prestataires_logs (
  id SERIAL PRIMARY KEY,
  prestataire_id INTEGER NOT NULL REFERENCES v_b_prestataires(id) ON DELETE CASCADE,
  user_id INTEGER NULL,
  action TEXT NOT NULL,
  details JSONB NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_v_b_prestataires_logs_prestataire_id
  ON v_b_prestataires_logs (prestataire_id);

ALTER TABLE v_b_users_profiles
  ADD COLUMN IF NOT EXISTS prestataire_enabled BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE v_b_users_profiles
SET prestataire_enabled = TRUE
WHERE LOWER(REPLACE(REPLACE(name, '-', ' '), '_', ' ')) IN (
  'super admin', 'superadmin', 'super administrateur',
  'administrateur', 'administrator', 'admin'
)
AND prestataire_enabled IS DISTINCT FROM TRUE;

COMMIT;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'veritas_user') THEN
    EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE v_b_prestataires TO veritas_user';
    EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE v_b_prestataire_client_links TO veritas_user';
    EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE v_b_prestataires_logs TO veritas_user';
    EXECUTE 'GRANT USAGE, SELECT ON SEQUENCE v_b_prestataires_id_seq TO veritas_user';
    EXECUTE 'GRANT USAGE, SELECT ON SEQUENCE v_b_prestataires_logs_id_seq TO veritas_user';
  END IF;
END $$;
