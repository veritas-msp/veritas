-- Demandes de validation entre agents (support + services)
BEGIN;

CREATE TABLE IF NOT EXISTS v_b_ticket_validation_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES v_b_tickets(id) ON DELETE CASCADE,
  requested_by_user_id UUID NULL REFERENCES v_b_users(id) ON DELETE SET NULL,
  validator_user_id UUID NOT NULL REFERENCES v_b_users(id) ON DELETE CASCADE,
  message TEXT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'pending',
  response_message TEXT NULL,
  responded_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT v_b_ticket_validation_requests_status_chk
    CHECK (status IN ('pending', 'approved', 'rejected'))
);

CREATE INDEX IF NOT EXISTS idx_v_b_ticket_validation_requests_ticket
  ON v_b_ticket_validation_requests (ticket_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_v_b_ticket_validation_requests_validator_pending
  ON v_b_ticket_validation_requests (validator_user_id, created_at DESC)
  WHERE status = 'pending';

COMMIT;
