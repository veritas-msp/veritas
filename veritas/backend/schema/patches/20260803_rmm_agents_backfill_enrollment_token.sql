-- Link active agents without enrollment_token_id to the sole active token of their client.
-- Required for per-token RMM settings (heartbeat, collectors, etc.) to apply.

WITH single_token_clients AS (
  SELECT client_id,
         (array_agg(id ORDER BY created_at DESC NULLS LAST))[1] AS token_id
    FROM v_b_rmm_enrollment_tokens
   WHERE revoked_at IS NULL
   GROUP BY client_id
  HAVING COUNT(*) = 1
)
UPDATE v_b_rmm_agents a
   SET enrollment_token_id = s.token_id,
       updated_at = NOW()
  FROM single_token_clients s
 WHERE a.client_id = s.client_id
   AND a.enrollment_token_id IS NULL
   AND a.status = 'active';
