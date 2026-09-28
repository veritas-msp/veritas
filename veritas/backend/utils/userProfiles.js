import { pool } from "../database/db.js";
import { ensureUserProfilesSchema } from "../services/ensureUserProfilesSchema.js";

function normalizeProfileName(value) {
  return String(value || "").trim();
}

export function normalizeProfileList(input, fallbackActive = "") {
  const raw = Array.isArray(input) ? input : [];
  const names = [];
  const seen = new Set();
  for (const item of raw) {
    const name = normalizeProfileName(item);
    if (!name || seen.has(name)) continue;
    seen.add(name);
    names.push(name);
  }
  const active = normalizeProfileName(fallbackActive);
  if (active && !seen.has(active)) {
    names.unshift(active);
    seen.add(active);
  }
  return names;
}

export async function listUserProfileNames(userId, client = pool) {
  await ensureUserProfilesSchema();
  const { rows } = await client.query(
    `SELECT profile_name
     FROM v_b_user_profiles
     WHERE user_id = $1
     ORDER BY profile_name ASC`,
    [userId]
  );
  return rows.map(r => String(r.profile_name));
}

export async function listUserProfilesMap(userIds, client = pool) {
  const ids = (Array.isArray(userIds) ? userIds : []).filter(Boolean);
  if (!ids.length) return new Map();
  await ensureUserProfilesSchema();
  const { rows } = await client.query(
    `SELECT user_id, profile_name
     FROM v_b_user_profiles
     WHERE user_id = ANY($1::uuid[])
     ORDER BY profile_name ASC`,
    [ids]
  );
  const map = new Map();
  for (const row of rows) {
    const key = String(row.user_id);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(String(row.profile_name));
  }
  return map;
}

export async function assertProfilesExist(profileNames, client = pool) {
  const names = normalizeProfileList(profileNames);
  if (!names.length) {
    const err = new Error("At least one profile is required.");
    err.status = 400;
    throw err;
  }
  const { rows } = await client.query(
    `SELECT name FROM v_b_users_profiles WHERE name = ANY($1::varchar[])`,
    [names]
  );
  const found = new Set(rows.map(r => String(r.name)));
  const missing = names.filter(n => !found.has(n));
  if (missing.length) {
    const err = new Error(`Unknown profile(s): ${missing.join(", ")}`);
    err.status = 400;
    throw err;
  }
  return names;
}

/**
 * Replace assigned profiles for a user and ensure active profile stays consistent.
 * @returns {{ profiles: string[], activeProfile: string }}
 */
export async function replaceUserProfiles(userId, profileNames, preferredActive = null, client = pool) {
  await ensureUserProfilesSchema();
  const names = await assertProfilesExist(profileNames, client);
  const preferred = normalizeProfileName(preferredActive);
  const activeProfile = preferred && names.includes(preferred) ? preferred : names[0];

  await client.query(`DELETE FROM v_b_user_profiles WHERE user_id = $1`, [userId]);
  for (const name of names) {
    await client.query(
      `INSERT INTO v_b_user_profiles (user_id, profile_name) VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
      [userId, name]
    );
  }
  await client.query(`UPDATE v_b_users SET profile = $1 WHERE id = $2`, [activeProfile, userId]);
  return { profiles: names, activeProfile };
}

/**
 * Ensure active profile is in the assignment table (legacy single-profile updates).
 */
export async function ensureUserHasProfile(userId, profileName, client = pool) {
  const name = normalizeProfileName(profileName);
  if (!name) return;
  await ensureUserProfilesSchema();
  await assertProfilesExist([name], client);
  await client.query(
    `INSERT INTO v_b_user_profiles (user_id, profile_name) VALUES ($1, $2)
     ON CONFLICT DO NOTHING`,
    [userId, name]
  );
}

export async function userHasAssignedProfile(userId, profileName, client = pool) {
  const name = normalizeProfileName(profileName);
  if (!name) return false;
  await ensureUserProfilesSchema();
  const { rows } = await client.query(
    `SELECT 1 FROM v_b_user_profiles WHERE user_id = $1 AND profile_name = $2 LIMIT 1`,
    [userId, name]
  );
  if (rows.length) return true;
  // Fallback for installs not yet backfilled
  const active = await client.query(`SELECT profile FROM v_b_users WHERE id = $1`, [userId]);
  return normalizeProfileName(active.rows[0]?.profile) === name;
}

export function attachProfilesToUser(user, profilesMap) {
  if (!user) return user;
  const fromMap = profilesMap?.get?.(String(user.id));
  const profiles =
    Array.isArray(fromMap) && fromMap.length
      ? fromMap
      : user.profile
        ? [String(user.profile)]
        : [];
  return { ...user, profiles };
}
