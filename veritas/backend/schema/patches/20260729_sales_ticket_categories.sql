BEGIN;

CREATE TABLE IF NOT EXISTS v_b_sales_ticket_category_sections (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL DEFAULT '',
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS v_b_sales_ticket_categories (
  id TEXT PRIMARY KEY,
  section TEXT NOT NULL DEFAULT 'Non classée',
  name TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL DEFAULT '',
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
);

COMMIT;

DO $$
DECLARE
  app_user VARCHAR(255);
BEGIN
  BEGIN
    EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE v_b_sales_ticket_category_sections TO veritas_user';
    EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE v_b_sales_ticket_categories TO veritas_user';
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
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE v_b_sales_ticket_category_sections TO %I', app_user);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE v_b_sales_ticket_categories TO %I', app_user);
  EXCEPTION
    WHEN undefined_object THEN
      RAISE NOTICE 'Role % not found, skipping app user grants', app_user;
    WHEN OTHERS THEN
      RAISE NOTICE 'Could not grant permissions to %: %', app_user, SQLERRM;
  END;
END $$;
