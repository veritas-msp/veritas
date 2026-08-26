-- Portal ticket visibility: user (own tickets) vs supervisor (all company tickets)
ALTER TABLE v_b_users
  ADD COLUMN IF NOT EXISTS portal_role TEXT NOT NULL DEFAULT 'user';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'v_b_users_portal_role_check'
  ) THEN
    ALTER TABLE v_b_users
      ADD CONSTRAINT v_b_users_portal_role_check
      CHECK (portal_role IN ('user', 'supervisor'));
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'veritas_user') THEN
    EXECUTE 'GRANT SELECT, UPDATE ON TABLE v_b_users TO veritas_user';
  END IF;
END $$;
