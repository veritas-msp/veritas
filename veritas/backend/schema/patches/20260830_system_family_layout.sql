CREATE TABLE IF NOT EXISTS v_b_equipment_family_layout (
  family_key VARCHAR(80) PRIMARY KEY,
  honeycomb_q INTEGER,
  honeycomb_r INTEGER,
  display_mode VARCHAR(20) NOT NULL DEFAULT 'hexagon',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
