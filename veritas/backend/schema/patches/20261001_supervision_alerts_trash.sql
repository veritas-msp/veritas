-- Soft-delete (corbeille) for supervision alert history
ALTER TABLE v_b_supervision_alerts
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS deleted_by UUID NULL;

CREATE INDEX IF NOT EXISTS idx_supervision_alerts_deleted_at
  ON v_b_supervision_alerts (deleted_at)
  WHERE deleted_at IS NOT NULL;

COMMENT ON COLUMN v_b_supervision_alerts.deleted_at IS 'Date de mise en corbeille (soft delete)';
COMMENT ON COLUMN v_b_supervision_alerts.deleted_by IS 'Utilisateur ayant mis l''alerte à la corbeille';
