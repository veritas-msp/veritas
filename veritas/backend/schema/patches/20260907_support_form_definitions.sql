BEGIN;

CREATE TABLE IF NOT EXISTS v_b_support_form_definitions (
  id TEXT PRIMARY KEY,
  kind VARCHAR(30) NOT NULL CHECK (kind IN ('incident', 'demande', 'probleme', 'changement')),
  form_key VARCHAR(80) NOT NULL,
  label VARCHAR(200) NOT NULL,
  icon VARCHAR(64) NOT NULL DEFAULT 'mdi:file-document-outline',
  category_slug VARCHAR(120) NOT NULL UNIQUE,
  description TEXT NOT NULL DEFAULT '',
  display_order INT NOT NULL DEFAULT 0,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  visibility VARCHAR(20) NOT NULL DEFAULT 'public'
    CHECK (visibility IN ('public', 'assigned')),
  ticket_targets JSONB NOT NULL DEFAULT '{}'::jsonb,
  public_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  public_slug VARCHAR(120) UNIQUE,
  created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE (kind, form_key)
);

CREATE TABLE IF NOT EXISTS v_b_support_form_fields (
  id TEXT PRIMARY KEY,
  form_id TEXT NOT NULL REFERENCES v_b_support_form_definitions(id) ON DELETE CASCADE,
  field_key VARCHAR(80) NOT NULL,
  label VARCHAR(200) NOT NULL,
  field_type VARCHAR(30) NOT NULL DEFAULT 'text',
  required BOOLEAN NOT NULL DEFAULT FALSE,
  placeholder TEXT NOT NULL DEFAULT '',
  options JSONB NOT NULL DEFAULT '[]'::jsonb,
  visibility_rules JSONB NOT NULL DEFAULT '{}'::jsonb,
  display_order INT NOT NULL DEFAULT 0,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE (form_id, field_key)
);

CREATE TABLE IF NOT EXISTS v_b_support_form_profiles (
  form_id TEXT NOT NULL REFERENCES v_b_support_form_definitions(id) ON DELETE CASCADE,
  profile_name VARCHAR(120) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (form_id, profile_name)
);

CREATE TABLE IF NOT EXISTS v_b_support_form_users (
  form_id TEXT NOT NULL REFERENCES v_b_support_form_definitions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES v_b_users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (form_id, user_id)
);

CREATE TABLE IF NOT EXISTS v_b_support_form_teams (
  form_id TEXT NOT NULL REFERENCES v_b_support_form_definitions(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES v_b_teams(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (form_id, team_id)
);

CREATE TABLE IF NOT EXISTS v_b_support_form_captcha_challenges (
  id TEXT PRIMARY KEY,
  form_id TEXT NOT NULL REFERENCES v_b_support_form_definitions(id) ON DELETE CASCADE,
  answer_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_support_form_captcha_expires
  ON v_b_support_form_captcha_challenges (expires_at);

DO $$
BEGIN
  ALTER TABLE v_b_tickets ADD COLUMN IF NOT EXISTS support_form_data JSONB;
EXCEPTION
  WHEN insufficient_privilege THEN
    RAISE NOTICE 'Colonne support_form_data ignorée (droits insuffisants sur v_b_tickets)';
END $$;

DO $$
DECLARE
  app_user VARCHAR(255);
BEGIN
  SELECT value INTO app_user FROM v_b_settings WHERE key = 'db_user' LIMIT 1;
  IF app_user IS NULL OR app_user = '' THEN
    app_user := current_user;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = app_user) THEN
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE v_b_support_form_definitions TO %I', app_user);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE v_b_support_form_fields TO %I', app_user);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE v_b_support_form_profiles TO %I', app_user);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE v_b_support_form_users TO %I', app_user);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE v_b_support_form_teams TO %I', app_user);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE v_b_support_form_captcha_challenges TO %I', app_user);
  END IF;
END $$;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE v_b_support_form_definitions TO veritas_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE v_b_support_form_fields TO veritas_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE v_b_support_form_profiles TO veritas_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE v_b_support_form_users TO veritas_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE v_b_support_form_teams TO veritas_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE v_b_support_form_captcha_challenges TO veritas_user;

COMMIT;
