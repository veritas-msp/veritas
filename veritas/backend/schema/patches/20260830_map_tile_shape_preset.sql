ALTER TABLE v_b_equipment_family_definitions
  DROP COLUMN IF EXISTS tile_shape;

ALTER TABLE v_b_equipment_family_layout
  DROP COLUMN IF EXISTS tile_shape;

CREATE TABLE IF NOT EXISTS v_b_equipment_map_style (
  id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  tile_shape VARCHAR(20) NOT NULL DEFAULT 'hexagon',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO v_b_equipment_map_style (id, tile_shape)
VALUES (1, 'hexagon')
ON CONFLICT (id) DO NOTHING;
