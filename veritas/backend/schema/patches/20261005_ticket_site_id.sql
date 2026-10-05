-- Ticketing : lieu (site) de l'entreprise associé au ticket
-- Référence l'id d'un site JSON clients.sites (pas de FK stricte).

DO $$
BEGIN
  ALTER TABLE v_b_tickets
    ADD COLUMN IF NOT EXISTS site_id TEXT NULL;
EXCEPTION
  WHEN insufficient_privilege THEN
    RAISE NOTICE 'Colonne site_id ignorée (droits insuffisants sur v_b_tickets)';
END $$;

CREATE INDEX IF NOT EXISTS idx_v_b_tickets_site_id
  ON v_b_tickets (site_id)
  WHERE site_id IS NOT NULL;
