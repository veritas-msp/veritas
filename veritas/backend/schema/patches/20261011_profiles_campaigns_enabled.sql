-- Accès à la page Campagnes par profil

ALTER TABLE v_b_users_profiles
  ADD COLUMN IF NOT EXISTS campaigns_enabled BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE v_b_users_profiles
SET campaigns_enabled = TRUE
WHERE cybersecurite_enabled = TRUE
   OR name IN ('Super Admin', 'Administrateur', 'Administrator');
