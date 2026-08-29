-- Statut actif / inactif des entreprises (défaut: actif)
ALTER TABLE v_b_clients
  ADD COLUMN IF NOT EXISTS statut VARCHAR(50) DEFAULT 'actif';

UPDATE v_b_clients
SET statut = 'actif'
WHERE statut IS NULL;

CREATE INDEX IF NOT EXISTS idx_v_b_clients_statut
  ON v_b_clients (statut);
