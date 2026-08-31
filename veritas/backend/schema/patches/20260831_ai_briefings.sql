-- Historique des briefings IA (dashboard KPI, supervision, entreprise)

CREATE TABLE IF NOT EXISTS v_b_ai_briefings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_key VARCHAR(64) NOT NULL,
  scope_key VARCHAR(128) NOT NULL DEFAULT '',
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  generated_by UUID NULL REFERENCES v_b_users(id) ON DELETE SET NULL,
  locale VARCHAR(8) NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_v_b_ai_briefings_scope
  ON v_b_ai_briefings (feature_key, scope_key, generated_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE v_b_ai_briefings TO veritas_user;
