BEGIN;

CREATE TABLE IF NOT EXISTS v_b_planning_event_types (
  id SERIAL PRIMARY KEY,
  type_key VARCHAR(64) NOT NULL UNIQUE,
  label VARCHAR(120) NOT NULL,
  icon VARCHAR(120) NOT NULL DEFAULT 'mdi:calendar-blank',
  kpi_tone VARCHAR(20) NOT NULL DEFAULT 'blue',
  enabled BOOLEAN NOT NULL DEFAULT true,
  form_selectable BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_planning_event_types_enabled_sort
  ON v_b_planning_event_types(enabled, sort_order);

INSERT INTO v_b_planning_event_types (type_key, label, icon, kpi_tone, enabled, form_selectable, sort_order)
SELECT v.type_key, v.label, v.icon, v.kpi_tone, true, v.form_selectable, v.sort_order
FROM (VALUES
  ('intervention', 'Intervention', 'mdi:wrench', 'blue', true, 10),
  ('presentation', 'Présentation', 'mdi:presentation', 'violet', true, 20),
  ('maintenance_preventive', 'Préventive', 'mdi:shield-check', 'amber', true, 30),
  ('maintenance', 'Maintenance', 'mdi:cog', 'orange', true, 40),
  ('mise_a_jour', 'Mise à jour', 'mdi:update', 'blue', true, 50),
  ('conge', 'Congé', 'mdi:beach', 'teal', true, 60),
  ('integration_monitoring', 'Monitoring', 'mdi:chart-line-variant', 'cyan', true, 70),
  ('campagne', 'Campagne', 'mdi:shield-lock', 'violet', false, 80),
  ('other', 'Autre', 'mdi:calendar-blank', 'orange', true, 90)
) AS v(type_key, label, icon, kpi_tone, form_selectable, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM v_b_planning_event_types LIMIT 1);

COMMIT;

DO $$
DECLARE
  app_user VARCHAR(255);
BEGIN
  BEGIN
    EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE v_b_planning_event_types TO veritas_user';
    EXECUTE 'GRANT USAGE, SELECT ON SEQUENCE v_b_planning_event_types_id_seq TO veritas_user';
  EXCEPTION
    WHEN undefined_object THEN
      RAISE NOTICE 'Role veritas_user not found, skipping default grants';
  END;

  SELECT value INTO app_user
  FROM v_b_settings
  WHERE key = 'db_user'
  LIMIT 1;

  IF app_user IS NULL OR app_user = '' THEN
    app_user := current_user;
  END IF;

  BEGIN
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE v_b_planning_event_types TO %I', app_user);
    EXECUTE format('GRANT USAGE, SELECT ON SEQUENCE v_b_planning_event_types_id_seq TO %I', app_user);
  EXCEPTION
    WHEN undefined_object THEN
      RAISE NOTICE 'Role % not found, skipping app user grants', app_user;
    WHEN OTHERS THEN
      RAISE NOTICE 'Could not grant permissions to %: %', app_user, SQLERRM;
  END;
END $$;
