CREATE TABLE IF NOT EXISTS v_b_equipment_family_extension_fields (
  id SERIAL PRIMARY KEY,
  family_key VARCHAR(80) NOT NULL,
  field_key VARCHAR(80) NOT NULL,
  label VARCHAR(120) NOT NULL,
  field_type VARCHAR(20) NOT NULL DEFAULT 'text',
  required BOOLEAN NOT NULL DEFAULT FALSE,
  display_order INTEGER NOT NULL DEFAULT 100,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (family_key, field_key)
);

CREATE INDEX IF NOT EXISTS idx_equipment_family_extension_fields_family
  ON v_b_equipment_family_extension_fields (family_key, display_order, id);
