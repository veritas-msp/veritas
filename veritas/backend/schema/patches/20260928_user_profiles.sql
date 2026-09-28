-- Affectation multi-profils par agent (MSP).
-- v_b_users.profile reste le profil ACTIF ; cette table liste les profils assignés.

CREATE TABLE IF NOT EXISTS v_b_user_profiles (
  user_id UUID NOT NULL REFERENCES v_b_users(id) ON DELETE CASCADE,
  profile_name VARCHAR(255) NOT NULL
    REFERENCES v_b_users_profiles(name) ON UPDATE CASCADE ON DELETE RESTRICT,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, profile_name)
);

CREATE INDEX IF NOT EXISTS idx_v_b_user_profiles_profile_name
  ON v_b_user_profiles(profile_name);

CREATE INDEX IF NOT EXISTS idx_v_b_user_profiles_user_id
  ON v_b_user_profiles(user_id);

-- Backfill : chaque agent conserve son profil actuel comme profil assigné.
INSERT INTO v_b_user_profiles (user_id, profile_name)
SELECT u.id, u.profile
FROM v_b_users u
WHERE u.profile IS NOT NULL
  AND TRIM(u.profile) <> ''
  AND COALESCE(u.role, '') <> 'client'
ON CONFLICT DO NOTHING;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE v_b_user_profiles TO veritas_user;
