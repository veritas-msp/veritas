import { pool } from "../database/db.js";

const WITHOUT_MFA_SAMPLE_LIMIT = 40;

const METHOD_KEYS = [
  "microsoftauthenticatorauthenticationmethod",
  "phoneauthenticationmethod",
  "emailauthenticationmethod",
  "fido2authenticationmethod",
  "softwareoathauthenticationmethod",
  "windowshelloforbusinessauthenticationmethod",
  "temporaryaccesspassauthenticationmethod",
  "passwordlessmicrosoftauthenticatorauthenticationmethod"
];

const PHISHING_RESISTANT_METHODS = new Set([
  "fido2authenticationmethod",
  "windowshelloforbusinessauthenticationmethod",
  "passwordlessmicrosoftauthenticatorauthenticationmethod"
]);

function parseMethods(raw) {
  if (Array.isArray(raw)) return raw.map(v => String(v || "").toLowerCase());
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.map(v => String(v || "").toLowerCase());
    } catch {
      return raw ? [raw.toLowerCase()] : [];
    }
  }
  return [];
}

function pct(part, total) {
  if (!total) return 0;
  return Math.round((part / total) * 10000) / 100;
}

function emptyMethods() {
  return {
    authenticator: 0,
    phone: 0,
    email: 0,
    fido2: 0,
    softwareOath: 0,
    windowsHello: 0,
    temporaryAccessPass: 0,
    other: 0
  };
}

function userMethodFlags(methods) {
  const flags = {
    authenticator: false,
    phone: false,
    email: false,
    fido2: false,
    softwareOath: false,
    windowsHello: false,
    temporaryAccessPass: false,
    other: false
  };
  for (const method of methods) {
    if (method.includes("microsoftauthenticator")) flags.authenticator = true;
    else if (method.includes("phone")) flags.phone = true;
    else if (method.includes("email")) flags.email = true;
    else if (method.includes("fido2")) flags.fido2 = true;
    else if (method.includes("softwareoath")) flags.softwareOath = true;
    else if (method.includes("windowshello")) flags.windowsHello = true;
    else if (method.includes("temporaryaccesspass")) flags.temporaryAccessPass = true;
    else if (method) flags.other = true;
  }
  return flags;
}

function mapUserSample(row) {
  return {
    userId: row.user_id,
    displayName: row.display_name || null,
    userPrincipalName: row.user_principal_name || null,
    isAdmin: Boolean(row.is_admin),
    adminRole: row.admin_role || null,
    accountEnabled: row.account_enabled !== false
  };
}

/**
 * Collecte un snapshot MFA professionnel depuis v_b_clients_c_azure_mfa.
 */
export async function collectClientMfaSnapshot(clientId) {
  const aggResult = await pool.query(
    `SELECT
      COUNT(*)::int AS total_users,
      COUNT(*) FILTER (WHERE is_admin = true)::int AS admin_count,
      COUNT(*) FILTER (WHERE is_admin = false)::int AS non_admin_count,
      COUNT(*) FILTER (WHERE has_mfa = true)::int AS users_with_mfa,
      COUNT(*) FILTER (WHERE has_mfa = true AND is_admin = true)::int AS admins_with_mfa,
      COUNT(*) FILTER (WHERE has_mfa = true AND is_admin = false)::int AS non_admins_with_mfa,
      COUNT(*) FILTER (
        WHERE has_mfa = true
          AND latest_mfa_registration_date IS NOT NULL
          AND latest_mfa_registration_date >= NOW() - INTERVAL '30 days'
      )::int AS recently_registered_mfa,
      MAX(last_sync) AS last_sync
     FROM v_b_clients_c_azure_mfa
     WHERE client_id = $1 AND account_enabled = true`,
    [clientId]
  );

  const row = aggResult.rows[0];
  const totalUsers = Number(row?.total_users) || 0;
  if (!totalUsers) return null;

  const adminCount = Number(row.admin_count) || 0;
  const nonAdminCount = Number(row.non_admin_count) || 0;
  const usersWithMfa = Number(row.users_with_mfa) || 0;
  const adminsWithMfa = Number(row.admins_with_mfa) || 0;
  const nonAdminsWithMfa = Number(row.non_admins_with_mfa) || 0;
  const recentlyRegisteredMfa = Number(row.recently_registered_mfa) || 0;
  const mfaDisabledCount = Math.max(0, totalUsers - usersWithMfa);

  const usersResult = await pool.query(
    `SELECT user_id, display_name, user_principal_name, account_enabled, has_mfa, mfa_methods,
            is_admin, admin_role, latest_mfa_registration_date
       FROM v_b_clients_c_azure_mfa
      WHERE client_id = $1 AND account_enabled = true
      ORDER BY is_admin DESC, display_name ASC NULLS LAST, user_principal_name ASC`,
    [clientId]
  );

  const methods = emptyMethods();
  let phishingResistantCount = 0;
  const withoutMfaAdmins = [];
  const withoutMfaUsers = [];

  for (const user of usersResult.rows) {
    const userMethods = parseMethods(user.mfa_methods);
    if (user.has_mfa) {
      const flags = userMethodFlags(userMethods);
      for (const key of Object.keys(methods)) {
        if (flags[key]) methods[key] += 1;
      }
      if (userMethods.some(m => PHISHING_RESISTANT_METHODS.has(m) || m.includes("fido2") || m.includes("windowshello"))) {
        phishingResistantCount += 1;
      }
    } else {
      const sample = mapUserSample(user);
      if (user.is_admin) {
        if (withoutMfaAdmins.length < WITHOUT_MFA_SAMPLE_LIMIT) withoutMfaAdmins.push(sample);
      } else if (withoutMfaUsers.length < WITHOUT_MFA_SAMPLE_LIMIT) {
        withoutMfaUsers.push(sample);
      }
    }
  }

  const adminMfaPercentage = pct(adminsWithMfa, adminCount);
  const nonAdminMfaPercentage = pct(nonAdminsWithMfa, nonAdminCount);
  const userMfaPercentage = pct(usersWithMfa, totalUsers);

  return {
    version: 2,
    source: "db",
    capturedAt: new Date().toISOString(),
    lastSync: row.last_sync || null,
    adminCount,
    nonAdminCount,
    userCount: totalUsers,
    adminMfaCount: adminsWithMfa,
    nonAdminMfaCount: nonAdminsWithMfa,
    mfaPercentage: userMfaPercentage,
    adminMfaPercentage,
    nonAdminMfaPercentage,
    userMfaPercentage,
    mfaEnabledCount: usersWithMfa,
    mfaDisabledCount,
    recentlyRegisteredMfa,
    phishingResistantCount,
    phishingResistantPercentage: pct(phishingResistantCount, totalUsers),
    methods,
    withoutMfa: {
      total: mfaDisabledCount,
      adminTotal: Math.max(0, adminCount - adminsWithMfa),
      userTotal: Math.max(0, nonAdminCount - nonAdminsWithMfa),
      admins: withoutMfaAdmins,
      users: withoutMfaUsers,
      truncated:
        Math.max(0, adminCount - adminsWithMfa) > withoutMfaAdmins.length ||
        Math.max(0, nonAdminCount - nonAdminsWithMfa) > withoutMfaUsers.length
    },
    methodKeys: METHOD_KEYS
  };
}

export function buildCampaignSnapshotInsertPayload(stats) {
  return {
    adminCount: stats.adminCount,
    userCount: stats.userCount,
    mfaPercentage: stats.mfaPercentage,
    adminMfaPercentage: stats.adminMfaPercentage,
    userMfaPercentage: stats.userMfaPercentage,
    mfaEnabledCount: stats.mfaEnabledCount,
    mfaDisabledCount: stats.mfaDisabledCount,
    snapshotData: stats
  };
}

export function parseSnapshotData(snap) {
  if (!snap) return null;
  try {
    const data = typeof snap.snapshot_data === "string" ? JSON.parse(snap.snapshot_data) : snap.snapshot_data;
    return data && typeof data === "object" ? data : null;
  } catch {
    return null;
  }
}

export function formatStoredSnapshot(snap) {
  if (!snap) return null;
  const data = parseSnapshotData(snap) || {};
  const nonAdminCount =
    data.nonAdminCount != null
      ? data.nonAdminCount
      : Math.max(0, (snap.user_count || 0) - (snap.admin_count || 0));
  const nonAdminMfaPercentage =
    data.nonAdminMfaPercentage != null
      ? Number(data.nonAdminMfaPercentage)
      : null;
  return {
    adminCount: snap.admin_count,
    nonAdminCount,
    userCount: snap.user_count,
    adminMfaCount: data.adminMfaCount ?? null,
    nonAdminMfaCount: data.nonAdminMfaCount ?? null,
    adminMfaPercentage: parseFloat(snap.admin_mfa_percentage || snap.mfa_percentage || 0),
    nonAdminMfaPercentage: nonAdminMfaPercentage ?? 0,
    userMfaPercentage: parseFloat(snap.user_mfa_percentage || snap.mfa_percentage || 0),
    mfaPercentage: parseFloat(snap.mfa_percentage || 0),
    mfaEnabledCount: snap.mfa_enabled_count,
    mfaDisabledCount: snap.mfa_disabled_count,
    recentlyRegisteredMfa: data.recentlyRegisteredMfa ?? 0,
    phishingResistantCount: data.phishingResistantCount ?? 0,
    phishingResistantPercentage: data.phishingResistantPercentage ?? 0,
    methods: data.methods || emptyMethods(),
    withoutMfa: data.withoutMfa || null,
    lastSync: data.lastSync || null,
    capturedAt: data.capturedAt || snap.created_at,
    createdAt: snap.created_at,
    version: data.version || 1
  };
}

export function buildRichSnapshotComparison(startSnap, endSnap) {
  const start = formatStoredSnapshot(startSnap);
  const end = formatStoredSnapshot(endSnap);
  if (!start || !end) return null;

  const delta = (a, b) => Number(b ?? 0) - Number(a ?? 0);
  const pair = (a, b) => ({
    start: Number(a ?? 0),
    end: Number(b ?? 0),
    change: delta(a, b)
  });

  return {
    adminCount: pair(start.adminCount, end.adminCount),
    nonAdminCount: pair(start.nonAdminCount, end.nonAdminCount),
    userCount: pair(start.userCount, end.userCount),
    mfaEnabledCount: pair(start.mfaEnabledCount, end.mfaEnabledCount),
    mfaDisabledCount: pair(start.mfaDisabledCount, end.mfaDisabledCount),
    mfaPercentage: pair(start.mfaPercentage, end.mfaPercentage),
    adminMfaPercentage: pair(start.adminMfaPercentage, end.adminMfaPercentage),
    nonAdminMfaPercentage: pair(start.nonAdminMfaPercentage, end.nonAdminMfaPercentage),
    userMfaPercentage: pair(start.userMfaPercentage, end.userMfaPercentage),
    phishingResistantCount: pair(start.phishingResistantCount, end.phishingResistantCount),
    phishingResistantPercentage: pair(start.phishingResistantPercentage, end.phishingResistantPercentage),
    recentlyRegisteredMfa: pair(start.recentlyRegisteredMfa, end.recentlyRegisteredMfa),
    methods: {
      authenticator: pair(start.methods?.authenticator, end.methods?.authenticator),
      phone: pair(start.methods?.phone, end.methods?.phone),
      email: pair(start.methods?.email, end.methods?.email),
      fido2: pair(start.methods?.fido2, end.methods?.fido2),
      softwareOath: pair(start.methods?.softwareOath, end.methods?.softwareOath),
      windowsHello: pair(start.methods?.windowsHello, end.methods?.windowsHello)
    }
  };
}
