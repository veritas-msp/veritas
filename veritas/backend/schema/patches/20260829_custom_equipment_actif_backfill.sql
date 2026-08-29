-- Sync custom-equipment is_active from imported JSON flags (actif / is_active / active).
UPDATE v_b_clients_m_custom_equipment
SET is_active = FALSE,
    updated_at = NOW()
WHERE is_active IS NOT FALSE
  AND (
    (jsonb_typeof(data->'actif') = 'boolean' AND data->>'actif' = 'false')
    OR lower(trim(COALESCE(data->>'actif', ''))) IN ('false', '0', 'no', 'non', 'off', 'inactif', 'inactive', 'disabled')
    OR (jsonb_typeof(data->'is_active') = 'boolean' AND data->>'is_active' = 'false')
    OR lower(trim(COALESCE(data->>'is_active', ''))) IN ('false', '0', 'no', 'non', 'off', 'inactif', 'inactive', 'disabled')
    OR (jsonb_typeof(data->'active') = 'boolean' AND data->>'active' = 'false')
    OR lower(trim(COALESCE(data->>'active', ''))) IN ('false', '0', 'no', 'non', 'off', 'inactif', 'inactive', 'disabled')
    OR (jsonb_typeof(data->'isActive') = 'boolean' AND data->>'isActive' = 'false')
    OR lower(trim(COALESCE(data->>'isActive', ''))) IN ('false', '0', 'no', 'non', 'off', 'inactif', 'inactive', 'disabled')
  );
