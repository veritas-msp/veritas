-- Historique des tentatives de connexion au portail client (suivi type Microsoft)
BEGIN;

CREATE TABLE IF NOT EXISTS v_b_portal_login_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES v_b_users(id) ON DELETE SET NULL,
  contact_id BIGINT REFERENCES v_b_contacts(id) ON DELETE CASCADE,
  client_id BIGINT,
  email TEXT,
  status TEXT NOT NULL,
  failure_reason TEXT,
  ip TEXT,
  user_agent TEXT,
  device_label TEXT,
  country_code TEXT,
  city TEXT,
  locality TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_v_b_portal_login_events_contact_created
  ON v_b_portal_login_events (contact_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_v_b_portal_login_events_user_created
  ON v_b_portal_login_events (user_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE v_b_portal_login_events TO veritas_user;

COMMIT;
