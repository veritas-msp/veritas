-- Visibilité formulaires support : agents et/ou portail client
-- (tout le monde, entreprises ciblées, contacts ciblés)

BEGIN;

ALTER TABLE v_b_support_form_definitions
  ADD COLUMN IF NOT EXISTS visible_to_agents BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE v_b_support_form_definitions
  ADD COLUMN IF NOT EXISTS visible_to_portal BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE v_b_support_form_definitions
  ADD COLUMN IF NOT EXISTS portal_visible_to_all BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS v_b_support_form_portal_clients (
  form_id TEXT NOT NULL REFERENCES v_b_support_form_definitions(id) ON DELETE CASCADE,
  client_id INTEGER NOT NULL REFERENCES v_b_clients(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (form_id, client_id)
);

CREATE INDEX IF NOT EXISTS idx_support_form_portal_clients_client
  ON v_b_support_form_portal_clients (client_id);

CREATE TABLE IF NOT EXISTS v_b_support_form_portal_contacts (
  form_id TEXT NOT NULL REFERENCES v_b_support_form_definitions(id) ON DELETE CASCADE,
  contact_id INTEGER NOT NULL REFERENCES v_b_contacts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (form_id, contact_id)
);

CREATE INDEX IF NOT EXISTS idx_support_form_portal_contacts_contact
  ON v_b_support_form_portal_contacts (contact_id);

-- Conservatory backfill: forms already live stay available to agents + whole portal
-- until an admin narrows the audience.
UPDATE v_b_support_form_definitions
   SET visible_to_agents = COALESCE(visible_to_agents, TRUE),
       visible_to_portal = TRUE,
       portal_visible_to_all = TRUE
 WHERE enabled = TRUE
   AND COALESCE(visible_to_portal, FALSE) = FALSE
   AND NOT EXISTS (
     SELECT 1 FROM v_b_support_form_portal_clients pc WHERE pc.form_id = v_b_support_form_definitions.id
   )
   AND NOT EXISTS (
     SELECT 1 FROM v_b_support_form_portal_contacts pct WHERE pct.form_id = v_b_support_form_definitions.id
   );

DO $$
DECLARE
  app_user VARCHAR(255);
BEGIN
  SELECT value INTO app_user FROM v_b_settings WHERE key = 'db_user' LIMIT 1;
  IF app_user IS NULL OR app_user = '' THEN
    app_user := current_user;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = app_user) THEN
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE v_b_support_form_portal_clients TO %I', app_user);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE v_b_support_form_portal_contacts TO %I', app_user);
  END IF;
END $$;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE v_b_support_form_portal_clients TO veritas_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE v_b_support_form_portal_contacts TO veritas_user;

COMMIT;
