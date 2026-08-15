-- Accès à la page Inventaire périphériques par profil

ALTER TABLE v_b_users_profiles
  ADD COLUMN IF NOT EXISTS equipment_inventory_enabled BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE v_b_users_profiles
SET equipment_inventory_enabled = TRUE
WHERE infrastructure_enabled = TRUE
   OR name IN ('Super Admin', 'Administrateur', 'Administrator');
