-- Autorise le type de champ « section » (titre de regroupement) pour les familles matériel.
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
      CHECK (field_type IN ('text', 'textarea', 'date', 'number', 'boolean', 'select', 'section'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  IF to_regclass('public.v_b_equipment_family_extension_fields') IS NULL THEN
    RETURN;
  END IF;
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'v_b_equipment_family_extension_fields_field_type_check'
      AND conrelid = 'public.v_b_equipment_family_extension_fields'::regclass
  ) THEN
    ALTER TABLE v_b_equipment_family_extension_fields
      DROP CONSTRAINT v_b_equipment_family_extension_fields_field_type_check;
  END IF;
  ALTER TABLE v_b_equipment_family_extension_fields
    ADD CONSTRAINT v_b_equipment_family_extension_fields_field_type_check
      CHECK (field_type IN ('text', 'textarea', 'date', 'number', 'boolean', 'select', 'section'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
