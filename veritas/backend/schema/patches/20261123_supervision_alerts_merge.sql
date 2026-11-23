-- Merge parent/child for supervision alerts (many children → one parent)
ALTER TABLE v_b_supervision_alerts
  ADD COLUMN IF NOT EXISTS parent_alert_id UUID NULL REFERENCES v_b_supervision_alerts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS merged_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS merged_by UUID NULL;

CREATE INDEX IF NOT EXISTS idx_supervision_alerts_parent_alert_id
  ON v_b_supervision_alerts (parent_alert_id)
  WHERE parent_alert_id IS NOT NULL;

COMMENT ON COLUMN v_b_supervision_alerts.parent_alert_id IS 'Alerte parente après fusion (plusieurs enfants → un parent)';
COMMENT ON COLUMN v_b_supervision_alerts.merged_at IS 'Date de fusion sur l''alerte parente';
COMMENT ON COLUMN v_b_supervision_alerts.merged_by IS 'Utilisateur ayant fusionné l''alerte';
