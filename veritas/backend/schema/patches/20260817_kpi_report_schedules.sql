CREATE TABLE IF NOT EXISTS v_b_kpi_report_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID,
  name VARCHAR(160) NOT NULL,
  recipients TEXT NOT NULL,
  categories TEXT[] NOT NULL DEFAULT ARRAY['support', 'devices', 'enterprise']::text[],
  period_preset VARCHAR(20) NOT NULL DEFAULT '30d',
  frequency VARCHAR(20) NOT NULL DEFAULT 'weekly',
  weekday INTEGER,
  monthday INTEGER,
  send_hour INTEGER NOT NULL DEFAULT 8,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  last_sent_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_kpi_report_schedules_next_run
  ON v_b_kpi_report_schedules (enabled, next_run_at);
