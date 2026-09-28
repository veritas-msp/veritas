-- Journal des synchronisations CheckMK (poller / flotte)

CREATE TABLE IF NOT EXISTS v_b_checkmk_sync_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ,
  status VARCHAR(24) NOT NULL DEFAULT 'running',
  trigger_source VARCHAR(40) NOT NULL DEFAULT 'poller',
  targets_total INT NOT NULL DEFAULT 0,
  synced INT NOT NULL DEFAULT 0,
  skipped INT NOT NULL DEFAULT 0,
  failed INT NOT NULL DEFAULT 0,
  alerts_created INT NOT NULL DEFAULT 0,
  alerts_resolved INT NOT NULL DEFAULT 0,
  message TEXT,
  details JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_checkmk_sync_runs_started
  ON v_b_checkmk_sync_runs (started_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE v_b_checkmk_sync_runs TO veritas_user;
