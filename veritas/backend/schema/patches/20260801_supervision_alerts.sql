-- Supervision ops alert workflow (ack / link / close + history)
CREATE TABLE IF NOT EXISTS v_b_supervision_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  queue_item_id VARCHAR(255) NOT NULL,
  domain VARCHAR(32) NOT NULL,
  severity VARCHAR(16),
  client_id BIGINT,
  equipment_id VARCHAR(128),
  ref_key VARCHAR(255),
  title VARCHAR(255),
  subtitle TEXT,
  label VARCHAR(255),
  status VARCHAR(24) NOT NULL DEFAULT 'open',
  acked_at TIMESTAMPTZ,
  acked_by UUID,
  closed_at TIMESTAMPTZ,
  closed_by UUID,
  closed_reason VARCHAR(32),
  linked_ticket_id VARCHAR(64),
  linked_ticket_kind VARCHAR(32),
  linked_event_id VARCHAR(64),
  note TEXT,
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_supervision_alerts_queue_item UNIQUE (queue_item_id)
);

CREATE INDEX IF NOT EXISTS idx_supervision_alerts_status
  ON v_b_supervision_alerts (status, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_supervision_alerts_client
  ON v_b_supervision_alerts (client_id, status);

CREATE INDEX IF NOT EXISTS idx_supervision_alerts_domain
  ON v_b_supervision_alerts (domain, status);

CREATE TABLE IF NOT EXISTS v_b_supervision_alert_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_id UUID NOT NULL REFERENCES v_b_supervision_alerts(id) ON DELETE CASCADE,
  action VARCHAR(48) NOT NULL,
  actor_user_id UUID,
  old_status VARCHAR(24),
  new_status VARCHAR(24),
  note TEXT,
  meta JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_supervision_alert_events_alert
  ON v_b_supervision_alert_events (alert_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_supervision_alert_events_created
  ON v_b_supervision_alert_events (created_at DESC);
