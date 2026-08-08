-- Overrides RMM par token d'enrôlement (+ lien agent → token)

ALTER TABLE v_b_rmm_agents
  ADD COLUMN IF NOT EXISTS enrollment_token_id UUID
    REFERENCES v_b_rmm_enrollment_tokens(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_v_b_rmm_agents_enrollment_token_id
  ON v_b_rmm_agents (enrollment_token_id)
  WHERE enrollment_token_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS v_b_rmm_token_settings (
  enrollment_token_id UUID PRIMARY KEY
    REFERENCES v_b_rmm_enrollment_tokens(id) ON DELETE CASCADE,
  overrides JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID
);

CREATE INDEX IF NOT EXISTS idx_v_b_rmm_token_settings_updated
  ON v_b_rmm_token_settings (updated_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE v_b_rmm_token_settings TO veritas_user;

-- Migration one-shot : copier les overrides entreprise vers chaque token actif du client
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name = 'v_b_rmm_client_settings'
  ) THEN
    INSERT INTO v_b_rmm_token_settings (enrollment_token_id, overrides, updated_by, updated_at)
    SELECT t.id, cs.overrides, cs.updated_by, NOW()
      FROM v_b_rmm_client_settings cs
      JOIN v_b_rmm_enrollment_tokens t ON t.client_id = cs.client_id
     WHERE t.revoked_at IS NULL
       AND cs.overrides IS NOT NULL
       AND cs.overrides <> '{}'::jsonb
    ON CONFLICT (enrollment_token_id) DO NOTHING;
  END IF;
END $$;
