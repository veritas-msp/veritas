-- Planning + multi-assignation pour les phases de campagne
ALTER TABLE v_b_clients_c_campaign_steps
  ADD COLUMN IF NOT EXISTS start_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS end_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS assigned_user_ids JSONB NOT NULL DEFAULT '[]'::jsonb;

UPDATE v_b_clients_c_campaign_steps
SET end_at = due_date::timestamptz
WHERE end_at IS NULL
  AND due_date IS NOT NULL;

UPDATE v_b_clients_c_campaign_steps
SET assigned_user_ids = jsonb_build_array(assigned_user_id::text)
WHERE assigned_user_id IS NOT NULL
  AND (
    assigned_user_ids IS NULL
    OR assigned_user_ids = '[]'::jsonb
    OR jsonb_typeof(assigned_user_ids) <> 'array'
  );
