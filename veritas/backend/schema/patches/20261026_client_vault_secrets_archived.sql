-- Soft-archive shared vault secrets (agent list: en cours / archivé).
ALTER TABLE v_b_client_vault_secrets
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS archived_by UUID;

CREATE INDEX IF NOT EXISTS idx_v_b_client_vault_secrets_contact_archived
  ON v_b_client_vault_secrets (contact_id, archived_at, created_at DESC);

COMMENT ON COLUMN v_b_client_vault_secrets.archived_at IS
  'When set, the share is hidden from the agent « en cours » list (and from the client portal).';
