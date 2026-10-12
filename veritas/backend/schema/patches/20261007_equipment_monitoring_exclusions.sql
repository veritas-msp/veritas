-- Exclusions / maintenances supervision (service ou périphérique)

CREATE TABLE IF NOT EXISTS v_b_equipment_monitoring_exclusions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id BIGINT NOT NULL,
  equipment_id UUID NOT NULL,
  equipment_family VARCHAR(80) NOT NULL,
  equipment_name VARCHAR(255),
  scope VARCHAR(16) NOT NULL DEFAULT 'service',
  kind VARCHAR(24) NOT NULL DEFAULT 'maintenance',
  service_key VARCHAR(255),
  service_name VARCHAR(255),
  reason TEXT,
  excluded_until TIMESTAMPTZ,
  excluded_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_monitoring_exclusions_scope CHECK (scope IN ('service', 'device')),
  CONSTRAINT chk_monitoring_exclusions_kind CHECK (kind IN ('ignore', 'maintenance'))
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_monitoring_exclusions_service
  ON v_b_equipment_monitoring_exclusions (client_id, equipment_id, equipment_family, service_key)
  WHERE scope = 'service' AND service_key IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_monitoring_exclusions_device
  ON v_b_equipment_monitoring_exclusions (client_id, equipment_id, equipment_family)
  WHERE scope = 'device';

CREATE INDEX IF NOT EXISTS idx_monitoring_exclusions_active
  ON v_b_equipment_monitoring_exclusions (client_id, equipment_id, excluded_until);

CREATE INDEX IF NOT EXISTS idx_monitoring_exclusions_until
  ON v_b_equipment_monitoring_exclusions (excluded_until);

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE v_b_equipment_monitoring_exclusions TO veritas_user;
