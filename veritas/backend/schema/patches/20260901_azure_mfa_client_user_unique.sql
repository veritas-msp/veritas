-- Ensure ON CONFLICT (client_id, user_id) works for Azure MFA upserts.
-- Older installs may have the table without the unique constraint.

DELETE FROM v_b_clients_c_azure_mfa a
USING v_b_clients_c_azure_mfa b
WHERE a.client_id = b.client_id
  AND a.user_id = b.user_id
  AND a.ctid < b.ctid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'uq_azure_mfa_client_user'
      AND conrelid = 'public.v_b_clients_c_azure_mfa'::regclass
  ) AND NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'v_b_clients_c_azure_mfa'
      AND indexname = 'uq_azure_mfa_client_user'
  ) THEN
    ALTER TABLE v_b_clients_c_azure_mfa
      ADD CONSTRAINT uq_azure_mfa_client_user UNIQUE (client_id, user_id);
  END IF;
END $$;
