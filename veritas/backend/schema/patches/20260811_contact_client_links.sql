-- Multi-company contact memberships (contact ↔ clients N–N)
BEGIN;

CREATE TABLE IF NOT EXISTS v_b_contact_client_links (
  contact_id INTEGER NOT NULL REFERENCES v_b_contacts(id) ON DELETE CASCADE,
  client_id INTEGER NOT NULL REFERENCES v_b_clients(id) ON DELETE CASCADE,
  poste TEXT NULL,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (contact_id, client_id)
);

CREATE INDEX IF NOT EXISTS idx_v_b_contact_client_links_client_id
  ON v_b_contact_client_links (client_id);

CREATE INDEX IF NOT EXISTS idx_v_b_contact_client_links_contact_id
  ON v_b_contact_client_links (contact_id);

CREATE UNIQUE INDEX IF NOT EXISTS uq_contact_primary_per_client
  ON v_b_contact_client_links (client_id)
  WHERE is_primary;

-- Backfill from legacy v_b_contacts.client_id (non-primary first)
INSERT INTO v_b_contact_client_links (contact_id, client_id, poste, is_primary, created_at)
SELECT
  c.id,
  c.client_id,
  c.poste,
  FALSE,
  COALESCE(c.created_at::timestamptz, NOW())
FROM v_b_contacts c
WHERE c.client_id IS NOT NULL
ON CONFLICT (contact_id, client_id) DO NOTHING;

-- One primary per client when a "principal" candidate exists
WITH pick AS (
  SELECT DISTINCT ON (l.client_id)
    l.contact_id,
    l.client_id
  FROM v_b_contact_client_links l
  JOIN v_b_contacts c ON c.id = l.contact_id
  WHERE lower(coalesce(l.poste, c.poste, '')) LIKE '%principal%'
  ORDER BY l.client_id, l.contact_id ASC
)
UPDATE v_b_contact_client_links l
SET is_primary = TRUE
FROM pick p
WHERE l.contact_id = p.contact_id
  AND l.client_id = p.client_id
  AND l.is_primary IS DISTINCT FROM TRUE;

COMMIT;

-- Optional app role (may not exist on all environments)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'veritas_user') THEN
    EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE v_b_contact_client_links TO veritas_user';
  END IF;
END $$;
