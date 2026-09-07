-- Multi-contacts for prestataires
BEGIN;

CREATE TABLE IF NOT EXISTS v_b_prestataire_contacts (
  id SERIAL PRIMARY KEY,
  prestataire_id INTEGER NOT NULL REFERENCES v_b_prestataires(id) ON DELETE CASCADE,
  nom TEXT NULL,
  prenom TEXT NULL,
  email TEXT NULL,
  telephone TEXT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_v_b_prestataire_contacts_prestataire_id
  ON v_b_prestataire_contacts (prestataire_id, sort_order, id);

-- Migrate legacy single contact into the new table when empty
INSERT INTO v_b_prestataire_contacts (prestataire_id, nom, prenom, email, telephone, sort_order)
SELECT p.id, p.contact_nom, p.contact_prenom, p.email, p.telephone, 0
FROM v_b_prestataires p
WHERE (
  COALESCE(NULLIF(TRIM(p.contact_nom), ''), NULL) IS NOT NULL
  OR COALESCE(NULLIF(TRIM(p.contact_prenom), ''), NULL) IS NOT NULL
  OR COALESCE(NULLIF(TRIM(p.email), ''), NULL) IS NOT NULL
  OR COALESCE(NULLIF(TRIM(p.telephone), ''), NULL) IS NOT NULL
)
AND NOT EXISTS (
  SELECT 1 FROM v_b_prestataire_contacts c WHERE c.prestataire_id = p.id
);

COMMIT;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'veritas_user') THEN
    EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE v_b_prestataire_contacts TO veritas_user';
    EXECUTE 'GRANT USAGE, SELECT ON SEQUENCE v_b_prestataire_contacts_id_seq TO veritas_user';
  END IF;
END $$;
