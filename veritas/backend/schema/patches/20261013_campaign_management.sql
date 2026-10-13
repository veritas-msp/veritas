-- Métadonnées de gestion campagne (temps passé, notes, checklist, docs)
ALTER TABLE v_b_clients_c_campaign
  ADD COLUMN IF NOT EXISTS management JSONB NOT NULL DEFAULT '{}'::jsonb;
