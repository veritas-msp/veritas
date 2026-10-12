-- Soft-end exclusions to keep maintenance history on equipment detail pages

ALTER TABLE v_b_equipment_monitoring_exclusions
  ADD COLUMN IF NOT EXISTS ended_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ended_by UUID;

DROP INDEX IF EXISTS uq_monitoring_exclusions_service;
DROP INDEX IF EXISTS uq_monitoring_exclusions_device;

CREATE UNIQUE INDEX IF NOT EXISTS uq_monitoring_exclusions_service_active
  ON v_b_equipment_monitoring_exclusions (client_id, equipment_id, equipment_family, service_key)
  WHERE scope = 'service' AND service_key IS NOT NULL AND ended_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_monitoring_exclusions_device_active
  ON v_b_equipment_monitoring_exclusions (client_id, equipment_id, equipment_family)
  WHERE scope = 'device' AND ended_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_monitoring_exclusions_equipment_history
  ON v_b_equipment_monitoring_exclusions (equipment_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_monitoring_exclusions_active_ended
  ON v_b_equipment_monitoring_exclusions (client_id, equipment_id, ended_at, excluded_until);
