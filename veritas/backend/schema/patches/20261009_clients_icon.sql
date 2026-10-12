-- Icône visuelle de l'entreprise (Identifiant Iconify + couleur)
ALTER TABLE v_b_clients
  ADD COLUMN IF NOT EXISTS icon VARCHAR(120) DEFAULT NULL;

ALTER TABLE v_b_clients
  ADD COLUMN IF NOT EXISTS icon_color VARCHAR(20) DEFAULT NULL;
