-- Add select field options and extend field_type for equipment family custom fields.

ALTER TABLE v_b_equipment_family_fields
  ADD COLUMN IF NOT EXISTS options JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE v_b_equipment_family_extension_fields
  ADD COLUMN IF NOT EXISTS options JSONB NOT NULL DEFAULT '[]'::jsonb;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'v_b_equipment_family_fields_field_type_check'
      AND conrelid = 'public.v_b_equipment_family_fields'::regclass
  ) THEN
    ALTER TABLE v_b_equipment_family_fields
      DROP CONSTRAINT v_b_equipment_family_fields_field_type_check;
  END IF;

  ALTER TABLE v_b_equipment_family_fields
    ADD CONSTRAINT v_b_equipment_family_fields_field_type_check
      CHECK (field_type IN ('text', 'textarea', 'date', 'number', 'boolean', 'select'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
