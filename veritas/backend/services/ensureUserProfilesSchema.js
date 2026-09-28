import { pool } from "../database/db.js";
import { canRunAutoSchemaMigrations } from "../utils/setupState.js";

let ensured = false;

async function tableExists(client, table) {
  const { rows } = await client.query(`SELECT to_regclass($1) AS reg`, [`public.${table}`]);
  return Boolean(rows[0]?.reg);
}

/**
 * Ensure v_b_user_profiles exists and is backfilled from v_b_users.profile.
 */
export async function ensureUserProfilesSchema() {
  if (ensured) return true;
  if (!(await canRunAutoSchemaMigrations())) return false;

  const client = await pool.connect();
  try {
    if (!(await tableExists(client, "v_b_users")) || !(await tableExists(client, "v_b_users_profiles"))) {
      return false;
    }

    await client.query(`
      CREATE TABLE IF NOT EXISTS v_b_user_profiles (
        user_id UUID NOT NULL REFERENCES v_b_users(id) ON DELETE CASCADE,
        profile_name VARCHAR(255) NOT NULL
          REFERENCES v_b_users_profiles(name) ON UPDATE CASCADE ON DELETE RESTRICT,
        assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (user_id, profile_name)
      )
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_v_b_user_profiles_profile_name
        ON v_b_user_profiles(profile_name)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_v_b_user_profiles_user_id
        ON v_b_user_profiles(user_id)
    `);

    await client.query(`
      INSERT INTO v_b_user_profiles (user_id, profile_name)
      SELECT u.id, u.profile
      FROM v_b_users u
      WHERE u.profile IS NOT NULL
        AND TRIM(u.profile) <> ''
        AND COALESCE(u.role, '') <> 'client'
      ON CONFLICT DO NOTHING
    `);

    try {
      await client.query(`GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE v_b_user_profiles TO veritas_user`);
    } catch {
      /* ignore grant failures on restricted roles */
    }

    ensured = true;
    return true;
  } catch (err) {
    console.warn("[ensureUserProfilesSchema]", err?.message || err);
    return false;
  } finally {
    client.release();
  }
}
