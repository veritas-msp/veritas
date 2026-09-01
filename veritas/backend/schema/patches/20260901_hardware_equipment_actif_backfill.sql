-- Sync hardware equipment is_active from imported JSON flags (actif / is_active / active).
DO $$
DECLARE
  t text;
  inactive_sql text := $f$
    is_active IS NOT FALSE
    AND (
      (jsonb_typeof(data->'actif') = 'boolean' AND data->>'actif' = 'false')
      OR lower(trim(COALESCE(data->>'actif', ''))) IN ('false', '0', 'no', 'non', 'off', 'inactif', 'inactive', 'disabled')
      OR (jsonb_typeof(data->'is_active') = 'boolean' AND data->>'is_active' = 'false')
      OR lower(trim(COALESCE(data->>'is_active', ''))) IN ('false', '0', 'no', 'non', 'off', 'inactif', 'inactive', 'disabled')
      OR (jsonb_typeof(data->'active') = 'boolean' AND data->>'active' = 'false')
      OR lower(trim(COALESCE(data->>'active', ''))) IN ('false', '0', 'no', 'non', 'off', 'inactif', 'inactive', 'disabled')
      OR (jsonb_typeof(data->'isActive') = 'boolean' AND data->>'isActive' = 'false')
      OR lower(trim(COALESCE(data->>'isActive', ''))) IN ('false', '0', 'no', 'non', 'off', 'inactif', 'inactive', 'disabled')
    )
  $f$;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'v_b_clients_m_internet',
    'v_b_clients_m_servers',
    'v_b_clients_m_stockage',
    'v_b_clients_m_firewall',
    'v_b_clients_m_switch',
    'v_b_clients_m_wifi',
    'v_b_clients_m_alimentation',
    'v_b_clients_m_routeur',
    'v_b_clients_m_toip',
    'v_b_clients_m_ordinateurs'
  ]
  LOOP
    IF to_regclass('public.' || t) IS NULL THEN
      CONTINUE;
    END IF;
    EXECUTE format(
      'UPDATE %I SET is_active = FALSE, updated_at = NOW() WHERE %s',
      t,
      inactive_sql
    );
  END LOOP;
END $$;
