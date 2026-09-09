-- Garantit l'unicité ticket_id pour l'upsert ON CONFLICT des validations de résolution.
-- Certaines bases ont reçu la table sans la contrainte UNIQUE d'origine.

ALTER TABLE v_b_ticket_resolution_validations
  ADD COLUMN IF NOT EXISTS intervention_type TEXT NULL,
  ADD COLUMN IF NOT EXISTS action_type TEXT NULL;

-- Déduplique d'éventuels doublons (garde la ligne la plus récente)
WITH ranked AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY ticket_id
           ORDER BY COALESCE(updated_at, created_at, requested_at) DESC NULLS LAST, id DESC
         ) AS rn
  FROM v_b_ticket_resolution_validations
)
DELETE FROM v_b_ticket_resolution_validations v
USING ranked r
WHERE v.id = r.id
  AND r.rn > 1;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'v_b_ticket_resolution_validations'
      AND c.contype IN ('u', 'p')
      AND pg_get_constraintdef(c.oid) ILIKE '%(ticket_id)%'
  ) AND NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'v_b_ticket_resolution_validations'
      AND indexdef ILIKE '%UNIQUE%(%ticket_id%)%'
  ) THEN
    ALTER TABLE v_b_ticket_resolution_validations
      ADD CONSTRAINT v_b_ticket_resolution_validations_ticket_id_key UNIQUE (ticket_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_v_b_ticket_resolution_validations_pending
  ON v_b_ticket_resolution_validations (outcome, auto_close_at)
  WHERE outcome = 'pending';
