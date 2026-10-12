-- Snapshots hebdomadaires du parc supervision (comparaison semaine à semaine)

CREATE TABLE IF NOT EXISTS v_b_supervision_park_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_start DATE NOT NULL,
  client_id BIGINT NULL,
  scope VARCHAR(32) NOT NULL DEFAULT 'supervision',
  total INT NOT NULL DEFAULT 0,
  online INT NOT NULL DEFAULT 0,
  in_alert INT NOT NULL DEFAULT 0,
  down INT NOT NULL DEFAULT 0,
  maintenance INT NOT NULL DEFAULT 0,
  availability_pct NUMERIC(6, 1) NOT NULL DEFAULT 100.0,
  source VARCHAR(40) NOT NULL DEFAULT 'live',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_supervision_park_snapshots_global
  ON v_b_supervision_park_snapshots (week_start, scope)
  WHERE client_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_supervision_park_snapshots_client
  ON v_b_supervision_park_snapshots (week_start, client_id, scope)
  WHERE client_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_supervision_park_snapshots_week
  ON v_b_supervision_park_snapshots (week_start DESC);

CREATE INDEX IF NOT EXISTS idx_supervision_park_snapshots_client_week
  ON v_b_supervision_park_snapshots (client_id, week_start DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE v_b_supervision_park_snapshots TO veritas_user;
