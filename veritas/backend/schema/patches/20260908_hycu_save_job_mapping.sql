-- HYCU Backup job mapping on save module rows (parallel to CheckMK columns).
BEGIN;

ALTER TABLE v_b_clients_m_save
  ADD COLUMN IF NOT EXISTS hycu_job_uuid TEXT NULL;

ALTER TABLE v_b_clients_m_save
  ADD COLUMN IF NOT EXISTS hycu_job_name TEXT NULL;

CREATE INDEX IF NOT EXISTS idx_v_b_clients_m_save_hycu_job_uuid
  ON v_b_clients_m_save (hycu_job_uuid)
  WHERE hycu_job_uuid IS NOT NULL AND btrim(hycu_job_uuid) <> '';

COMMIT;
