ALTER TABLE v_b_equipment_family_definitions
  ADD COLUMN IF NOT EXISTS tile_shape VARCHAR(20) NOT NULL DEFAULT 'hexagon';

ALTER TABLE v_b_equipment_family_layout
  ADD COLUMN IF NOT EXISTS tile_shape VARCHAR(20) NOT NULL DEFAULT 'hexagon';
