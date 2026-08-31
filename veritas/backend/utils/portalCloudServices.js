import { pool } from "../database/db.js";
import fetch from "node-fetch";

const MODULE_FLAG_LABELS = {
  o365: ["Office365", "Microsoft 365"],
  save: ["Sauvegarde"],
  antivirus: ["Antivirus"],
  antispam: ["Antispam"],
  ndd: ["NDD"]
};

const LICENSE_NAME_MAPPING = {
  SPB: "Microsoft 365 Business Premium",
  SPE_E3: "Microsoft 365 E3",
  SPE_E5: "Microsoft 365 E5",
  SPE_F1: "Microsoft 365 F1",
  SPE_E3_RPA1: "Microsoft 365 E3",
  Microsoft_365_Business_Premium: "Microsoft 365 Business Premium",
  Microsoft_365_Business_Standard: "Microsoft 365 Business Standard",
  Microsoft_365_Business_Basic: "Microsoft 365 Business Basic",
  Microsoft_365_E3: "Microsoft 365 E3",
  Microsoft_365_E5: "Microsoft 365 E5",
  Microsoft_365_F3: "Microsoft 365 F3",
  Microsoft_365_F1: "Microsoft 365 F1",
  ENTERPRISEPACK: "Office 365 E3",
  ENTERPRISEPREMIUM: "Office 365 E5",
  ENTERPRISEWITHSCAL: "Office 365 E3 with telephony",
  ENTERPRISEPACKPLUS_FACULTY: "Office 365 A3 (Faculty)",
  M365EDU_A3_FACULTY: "Microsoft 365 A3 (Enseignants)",
  M365EDU_A3_STUDENT: "Microsoft 365 A3 (Students)",
  M365EDU_A5_FACULTY: "Microsoft 365 A5 (Enseignants)",
  M365EDU_A5_STUDENT: "Microsoft 365 A5 (Students)",
  O365_BUSINESS: "Microsoft 365 Business Basic",
  O365_BUSINESS_ESSENTIALS: "Microsoft 365 Business Basic",
  O365_BUSINESS_PREMIUM: "Microsoft 365 Business Premium",
  SMB_BUSINESS: "Microsoft 365 Business Standard",
  SMB_BUSINESS_ESSENTIALS: "Microsoft 365 Business Basic",
  SMB_BUSINESS_PREMIUM: "Microsoft 365 Business Premium",
  EXCHANGESTANDARD: "Exchange Online Plan 1",
  EXCHANGEENTERPRISE: "Exchange Online Plan 2",
  EXCHANGEARCHIVE_ADDON: "Exchange Online Archiving",
  EXCHANGEDESKLESS: "Exchange Online Kiosk",
  SHAREPOINTSTANDARD: "SharePoint Online Plan 1",
  SHAREPOINTENTERPRISE: "SharePoint Online Plan 2",
  SHAREPOINTWAC: "Office for the web",
  TEAMS_EXPLORATORY: "Microsoft Teams Exploratory",
  TEAMS1: "Microsoft Teams (Essentiel)",
  TEAMS_COMMERCIAL: "Microsoft Teams Commercial",
  TEAMS_EDU: "Microsoft Teams for Education",
  AAD_PREMIUM: "Microsoft Entra ID P1",
  AAD_PREMIUM_P2: "Microsoft Entra ID P2",
  AAD_BASIC: "Azure AD Basic",
  EMS: "Enterprise Mobility + Security E3",
  EMSPREMIUM: "Enterprise Mobility + Security E5",
  OFFICESUBSCRIPTION: "Microsoft 365 Apps for enterprise",
  OFFICE_PRO_PLUS_SUBSCRIPTION_SMBIZ: "Office 365 ProPlus",
  OFFICE365_MIDSIZE_BUSINESS: "Office 365 Midsize Business",
  INTUNE_A: "Microsoft Intune",
  INTUNE_A_VL: "Microsoft Intune (Volume)",
  VISIOCLIENT: "Visio Plan 2",
  VISIOONLINE_PLAN1: "Visio Plan 1",
  VISIOONLINE_PLAN2: "Visio Plan 2",
  PROJECTPROFESSIONAL: "Project Plan 3",
  PROJECTONLINE_PLAN_1: "Project Plan 1",
  PROJECTONLINE_PLAN_2: "Project Plan 3",
  PROJECTPREMIUM: "Project Plan 5",
  POWER_BI_STANDARD: "Power BI Free",
  POWER_BI_PRO: "Power BI Pro",
  POWER_BI_PREMIUM: "Power BI Premium",
  FLOW_FREE: "Power Automate (Gratuit)",
  POWERAPPS_VIRAL: "Power Apps (Gratuit)",
  POWERAPPS_PER_USER: "Power Apps per user",
  STREAM: "Microsoft Stream",
  YAMMER_ENTERPRISE: "Yammer Enterprise",
  ENTERPRISEPACK_GOV: "Office 365 E3 (Gouvernement)",
  ENTERPRISEPREMIUM_GOV: "Office 365 E5 (Gouvernement)",
  STANDARDWOFFPACK_STUDENT: "Office 365 Education (Students)",
  STANDARDWOFFPACK_FACULTY: "Office 365 Education (Faculty)",
  DESKLESSPACK: "Office 365 F3",
  WIN_DEF_ATP: "Microsoft Defender for Endpoint",
  ATP_ENTERPRISE: "Microsoft Defender for Office 365",
  IDENTITY_THREAT_PROTECTION: "Microsoft 365 E5 Security",
  MCOSTANDARD: "Skype for Business Online Plan 2",
  MCOMEETADV: "Audio Conferencing",
  PHONESYSTEM_VIRTUALUSER: "Phone System - Virtual User",
  MCOPSTN1: "Domestic Calling Plan",
  MCOPSTN2: "International Calling Plan"
};

const PORTAL_RECOS_CACHE = new Map();
const PORTAL_RECOS_TTL_MS = 5 * 60 * 1000;
function pickString(...values) {
  for (const value of values) {
    if (value == null) continue;
    const text = String(value).trim();
    if (text && text !== "N/A") return text;
  }
  return null;
}
function pickNumber(...values) {
  for (const value of values) {
    if (value == null || value === "") continue;
    const num = Number(value);
    if (Number.isFinite(num)) return num;
  }
  return null;
}
function pickDate(...values) {
  for (const value of values) {
    if (!value) continue;
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) return date.toISOString();
  }
  return null;
}
function earliestDate(...values) {
  const timestamps = values.map(value => {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date.getTime();
  }).filter(value => value != null);
  if (!timestamps.length) return null;
  return new Date(Math.min(...timestamps)).toISOString();
}
function isActivationFlag(row, data, type) {
  if (!data || typeof data !== "object" || Array.isArray(data)) return false;
  const keys = Object.keys(data);
  if (keys.length === 1 && data.enabled === true) return true;
  const labels = MODULE_FLAG_LABELS[type] || [];
  const key = row.item_key || row.name || "";
  if (labels.includes(key) && keys.length <= 1) return true;
  return false;
}
function asBool(value) {
  if (value === true || value === 1 || value === "1" || value === "true" || value === "t") return true;
  if (value === false || value === 0 || value === "0" || value === "false" || value === "f") return false;
  return null;
}
function isSkuCode(value) {
  const text = String(value || "").trim();
  if (!text) return true;
  if (/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(text)) return true;
  if (/\s/.test(text)) return false;
  return /^[A-Z0-9]+(_[A-Z0-9]+)*$/i.test(text);
}
function friendlyLicenseName(sku) {
  const raw = String(sku || "").trim();
  if (!raw) return null;
  const normalized = raw.toUpperCase();
  if (LICENSE_NAME_MAPPING[normalized] || LICENSE_NAME_MAPPING[raw]) {
    return LICENSE_NAME_MAPPING[normalized] || LICENSE_NAME_MAPPING[raw];
  }
  const compact = normalized.replace(/[^A-Z0-9_]/g, "_");
  if (LICENSE_NAME_MAPPING[compact]) return LICENSE_NAME_MAPPING[compact];
  for (const [key, label] of Object.entries(LICENSE_NAME_MAPPING)) {
    const keyNorm = key.toUpperCase();
    if (normalized === keyNorm || normalized.startsWith(`${keyNorm}_`) || keyNorm.startsWith(`${normalized}_`)) {
      return label;
    }
  }
  return null;
}
function resolveLicenseName(lic, fallback = "Licence") {
  if (typeof lic === "string") {
    const mapped = friendlyLicenseName(lic);
    if (mapped) return mapped;
    return isSkuCode(lic) ? (friendlyLicenseName(lic) || lic.replace(/_/g, " ")) : lic;
  }
  const display = pickString(lic?.displayName, lic?.friendlyName, lic?.productName, lic?.skuDisplayName);
  const sku = pickString(lic?.skuPartNumber, lic?.nom, lic?.partNumber, lic?.name, lic?.skuId);
  if (display && !isSkuCode(display)) return display;
  return friendlyLicenseName(sku) || friendlyLicenseName(display) || display || sku || fallback;
}
function mapLicenseRows(licences = []) {
  if (!Array.isArray(licences)) return [];
  return licences.map(lic => ({
    name: resolveLicenseName(lic),
    sku: pickString(lic.skuPartNumber, lic.nom, lic.partNumber),
    total: pickNumber(lic.total, lic.totalLicenses, lic.prepaidUnits?.enabled),
    used: pickNumber(lic.consumed, lic.used, lic.usedLicenses, lic.consumedUnits, lic.utilisees),
    expiration: pickDate(lic.expirationDate, lic.expiration)
  })).filter(lic => lic.name);
}
function formatUserLicenseLabel(licenses) {
  if (typeof licenses === "string" && licenses.trim()) {
    return licenses.split(/[,;]/).map(part => resolveLicenseName(part.trim())).filter(Boolean).join(", ");
  }
  if (!Array.isArray(licenses) || !licenses.length) return "";
  return licenses.map(lic => {
    if (typeof lic === "string") return resolveLicenseName(lic.trim());
    return resolveLicenseName(lic);
  }).filter(Boolean).join(", ");
}
function userHasMfaEnabled(user) {
  if (!user) return null;
  const flagged = asBool(user.has_mfa ?? user.hasMfa ?? user.hasMFA ?? user.mfaEnabled);
  if (flagged != null) return flagged;
  const methods = user.mfa_methods || user.mfaMethods || [];
  if (!Array.isArray(methods) || !methods.length) return null;
  const ignored = new Set(["passwordauthenticationmethod", "password", "windowshelloforbusinessauthenticationmethod"]);
  return methods.some(method => !ignored.has(String(method || "").toLowerCase()));
}
function pickMfaDetails(data = {}) {
  if (Array.isArray(data.mfaDetails) && data.mfaDetails.length) return data.mfaDetails;
  if (Array.isArray(data.userMfaDetails) && data.userMfaDetails.length) return data.userMfaDetails;
  const security = pickWorkload(data, "securityData", "security") || {};
  if (Array.isArray(security.mfaDetails) && security.mfaDetails.length) return security.mfaDetails;
  if (Array.isArray(security.userMfaDetails) && security.userMfaDetails.length) return security.userMfaDetails;
  return [];
}
function findMfaEntry(user, mfaDetails = []) {
  if (!Array.isArray(mfaDetails) || !mfaDetails.length || !user) return null;
  const upn = String(user.userPrincipalName || user.email || user.mail || "").toLowerCase();
  const id = String(user.id || user.userId || "");
  return mfaDetails.find(entry => {
    const entryUpn = String(entry.userPrincipalName || entry.user_principal_name || entry.upn || entry.email || "").toLowerCase();
    const entryId = String(entry.id || entry.userId || entry.user_id || "");
    return (entryUpn && upn && entryUpn === upn) || (id && entryId && entryId === id);
  }) || null;
}
function mapUsersForPortal(users = [], mfaDetails = []) {
  if (!Array.isArray(users)) return [];
  return users.map(user => {
    const mfa = findMfaEntry(user, mfaDetails);
    const mfaFields = mfa ? {
      has_mfa: mfa.has_mfa ?? mfa.hasMfa ?? mfa.hasMFA ?? user.has_mfa,
      hasMFA: mfa.hasMFA ?? mfa.has_mfa ?? mfa.hasMfa,
      mfa_methods: mfa.mfa_methods || mfa.mfaMethods || user.mfa_methods || user.mfaMethods
    } : user;
    return {
      id: user.id || null,
      name: pickString(user.displayName, user.name) || "—",
      email: pickString(user.userPrincipalName, user.email, user.mail),
      accountEnabled: user.accountEnabled !== false,
      lastLoginDate: pickDate(user.lastLoginDate, user.lastSignInDateTime),
      licenses: formatUserLicenseLabel(user.licenses) || formatUserLicenseLabel(user.assignedLicenses),
      isAdmin: mfa
        ? asBool(mfa.is_admin ?? mfa.isAdmin) === true
        : asBool(user.isAdmin || user.isGlobalAdmin || user.isCompanyAdmin) === true ? true : null,
      adminRole: pickString(mfa?.admin_role, mfa?.adminRole, user.adminRole),
      mfaEnabled: mfa ? userHasMfaEnabled(mfaFields) : userHasMfaEnabled(user)
    };
  });
}
function pickWorkload(data, camelKey, shortKey) {
  if (!data || typeof data !== "object") return null;
  const value = data[camelKey] !== undefined ? data[camelKey] : data[shortKey];
  if (value == null) return null;
  return value;
}
function asList(value) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.value)) return value.value;
  return [];
}
function mapO365Licenses(rawLicences = []) {
  return mapLicenseRows(rawLicences).filter(lic => {
    const total = lic.total ?? 0;
    return total > 0 && total < 10000;
  }).map(lic => ({
    ...lic,
    available: Math.max(0, (lic.total ?? 0) - (lic.used ?? 0))
  })).sort((a, b) => (b.used ?? 0) - (a.used ?? 0) || (b.total ?? 0) - (a.total ?? 0));
}
function summarizeExchange(raw) {
  if (!raw || raw.success === false) return null;
  const activity = raw.emailActivity || {};
  const mailboxes = raw.mailboxes || raw.Mailboxes || {};
  const quotas = Array.isArray(mailboxes.quotas) ? mailboxes.quotas : [];
  const sent = pickNumber(activity.sent) || 0;
  const received = pickNumber(activity.received) || 0;
  const read = pickNumber(activity.read) || 0;
  const mailboxCount = pickNumber(mailboxes.total, mailboxes.count, quotas.length);
  const dailyActivity = Array.isArray(activity.dailyActivity)
    ? activity.dailyActivity.slice(-90).map(day => ({
      date: day.date,
      sent: pickNumber(day.sent) || 0,
      received: pickNumber(day.received) || 0,
      read: pickNumber(day.read) || 0
    }))
    : [];
  if (!mailboxCount && !sent && !received && !read && !quotas.length && !dailyActivity.length) return null;
  const quotasFull = quotas.filter(quota => {
    const used = Number(quota.storageUsed || quota.used || 0);
    const limit = Number(quota.storageLimit || quota.storageQuota || quota.prohibitSendQuota || quota.quota || 0);
    const percent = pickNumber(quota.usagePercent, quota.quotaPercent);
    if (percent != null) return percent >= 90;
    if (limit > 0) return used / limit >= 0.9;
    return used / (1024 * 1024 * 1024) > 50;
  }).length;
  const quotaBuckets = { over50: 0, from25: 0, from10: 0, from5: 0, under5: 0 };
  quotas.forEach(quota => {
    const gb = Number(quota.storageUsed || quota.used || 0) / (1024 ** 3);
    if (gb > 50) quotaBuckets.over50 += 1;
    else if (gb >= 25) quotaBuckets.from25 += 1;
    else if (gb >= 10) quotaBuckets.from10 += 1;
    else if (gb >= 5) quotaBuckets.from5 += 1;
    else quotaBuckets.under5 += 1;
  });
  return {
    mailboxCount,
    sent,
    received,
    read,
    readRate: pickNumber(activity.readRate),
    averages: activity.averages || null,
    storage: mailboxes.totalSize || null,
    averageSize: mailboxes.averageSize || null,
    quotasFull: quotas.length ? quotasFull : null,
    dailyActivity,
    quotaBuckets: quotas.length ? quotaBuckets : null,
    quotas: quotas.slice(0, 40).map((quota, index) => ({
      id: quota.email || quota.user || `quota-${index}`,
      name: pickString(quota.displayName, quota.user, quota.email) || "—",
      email: pickString(quota.email),
      used: quota.storageUsed ?? quota.used ?? null,
      quota: quota.storageQuota ?? quota.quota ?? null,
      percent: pickNumber(quota.usagePercent, quota.quotaPercent)
    })).sort((a, b) => (b.percent ?? 0) - (a.percent ?? 0)),
    topUsers: (Array.isArray(raw.topUsers) ? raw.topUsers : []).slice(0, 8).map((user, index) => ({
      id: user.email || user.name || `top-${index}`,
      name: pickString(user.name, user.displayName, user.email) || "—",
      email: pickString(user.email),
      sent: pickNumber(user.sent) || 0,
      received: pickNumber(user.received) || 0,
      read: pickNumber(user.read) || 0,
      total: pickNumber(user.total, (user.sent || 0) + (user.received || 0)) || 0
    }))
  };
}
function pickTeamsActivityBlock(raw, key) {
  const value = raw?.activity?.[key] || raw?.[key];
  if (value && typeof value === "object" && !Array.isArray(value)) return value;
  if (typeof value === "number") return { total: value };
  return {};
}
function summarizeTeams(raw) {
  if (!raw || raw.success === false) return null;
  const list = asList(raw?.teams?.teamsList).length
    ? asList(raw.teams.teamsList)
    : asList(raw?.teamsList).length
      ? asList(raw.teamsList)
      : asList(raw?.teams);
  const messages = pickTeamsActivityBlock(raw, "messages");
  const meetings = pickTeamsActivityBlock(raw, "meetings");
  const calls = pickTeamsActivityBlock(raw, "calls");
  const usage = raw?.activity?.usage && typeof raw.activity.usage === "object" ? raw.activity.usage : {};
  const dailyActivity = Array.isArray(raw?.licensedActivity?.dailyActivity)
    ? raw.licensedActivity.dailyActivity.slice(-90).map(day => ({
      date: day.date,
      channelMessages: pickNumber(day.channelMessages) || 0,
      chatMessages: pickNumber(day.chatMessages) || 0,
      oneOnOneCalls: pickNumber(day.oneOnOneCalls) || 0,
      totalMeetings: pickNumber(day.totalMeetings) || 0
    }))
    : [];
  const teamCount = pickNumber(raw.teams?.total, raw.teamsCount, raw.total, list.length);
  const hasActivity = Boolean(
    pickNumber(messages.total)
    || pickNumber(meetings.total)
    || pickNumber(calls.total)
    || dailyActivity.length
    || pickNumber(usage.licensedUsers)
    || pickNumber(usage.activeUsers, raw.teams?.activeUsers)
  );
  if (!list.length && teamCount == null && !hasActivity) return null;
  return {
    teamCount: teamCount ?? list.length,
    teams: list.slice(0, 100).map((team, index) => ({
      id: team.id || `team-${index}`,
      name: pickString(team.displayName, team.name) || "—",
      members: pickNumber(team.memberCount) || 0,
      channels: pickNumber(team.channelCount) || 0,
      visibility: String(team.visibility || "").toLowerCase() === "private" ? "private" : "public"
    })),
    licensedUsers: pickNumber(usage.licensedUsers),
    activeUsers: pickNumber(usage.activeUsers, raw.teams?.activeUsers),
    messages: {
      total: pickNumber(messages.total) || 0,
      privateChat: pickNumber(messages.privateChat) || 0,
      teamChat: pickNumber(messages.teamChat) || 0
    },
    meetings: {
      total: pickNumber(meetings.total) || 0,
      organized: pickNumber(meetings.organized) || 0,
      attended: pickNumber(meetings.attended) || 0
    },
    calls: {
      total: pickNumber(calls.total) || 0,
      totalDuration: pickString(calls.totalDuration),
      averageDuration: pickString(calls.averageDuration),
      audioDuration: pickString(calls.audioDuration),
      videoDuration: pickString(calls.videoDuration),
      screenShareDuration: pickString(calls.screenShareDuration)
    },
    dailyActivity
  };
}
function summarizeSharePoint(raw) {
  if (!raw || raw.success === false) return null;
  const sites = asList(raw.sites);
  if (!sites.length && raw.storageUsed == null) return null;
  return {
    siteCount: sites.length,
    storageUsed: raw.storageUsed ?? null,
    sites: sites.slice(0, 100).map((site, index) => ({
      id: site.id || `site-${index}`,
      name: pickString(site.name, site.displayName) || "—",
      url: pickString(site.webUrl, site.url),
      lastActivity: pickDate(site.lastActivityDate, site.lastModifiedDateTime),
      active: site.isActive !== false
    }))
  };
}
function summarizeOneDrive(raw) {
  if (!raw || raw.success === false) return null;
  const storage = raw.storage || {};
  if (storage.totalUsed == null && storage.totalFiles == null && storage.averagePerUser == null) return null;
  return {
    totalUsed: storage.totalUsed ?? null,
    totalFiles: pickNumber(storage.totalFiles),
    averagePerUser: storage.averagePerUser ?? null
  };
}
function stripHtml(value) {
  return String(value || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}
function mapRecommendationRow(rec, index) {
  const title = pickString(
    rec.titleFr,
    rec.title,
    rec.controlDisplayName,
    stripHtml(rec.description),
    rec.controlName,
    rec.name
  );
  const current = pickNumber(rec.currentScore, rec.score, rec.controlScore);
  const max = pickNumber(rec.maxScore, rec.controlMaxScore);
  const score = max != null && current != null
    ? `${Math.round(current)} / ${Math.round(max)}`
    : pickNumber(rec.scoreInPercentage, rec.score, max);
  return {
    id: rec.id || rec.controlName || rec.controlId || `reco-${index}`,
    title: title || "—",
    score,
    currentScore: current,
    maxScore: max
  };
}
function pickRecommendationLists(raw = {}, extra = []) {
  const lists = [
    extra,
    raw.secureScoreRecommendations,
    raw.recommendations,
    raw.controlScores,
    raw.secureScore?.controlScores
  ];
  for (const list of lists) {
    if (Array.isArray(list) && list.length) return list;
  }
  return [];
}
function summarizeSecurity(raw, users = [], extraRecos = []) {
  const score = raw?.secureScore || {};
  const current = pickNumber(score.currentScore, raw?.secureScoreCurrent);
  const max = pickNumber(score.maxScore, raw?.secureScoreMax) || 100;
  const pct = pickNumber(score.percentage) ?? (current != null && max ? Math.round((current / max) * 100) : null);
  const recos = pickRecommendationLists(raw || {}, extraRecos).filter(rec => {
    const cur = pickNumber(rec.currentScore, rec.score, rec.controlScore);
    const recMax = pickNumber(rec.maxScore, rec.controlMaxScore);
    if (recMax != null && recMax > 0 && cur != null) return cur < recMax;
    return true;
  });
  const recommendations = recos.slice(0, 20).map(mapRecommendationRow).filter(rec => rec.title !== "—");
  const knownMfa = users.filter(user => user.mfaEnabled != null);
  const mfaEnabled = knownMfa.filter(user => user.mfaEnabled === true).length;
  const mfaCoverage = knownMfa.length ? Math.round(mfaEnabled / knownMfa.length * 100) : null;
  if (pct == null && current == null && !recommendations.length && mfaCoverage == null) return null;
  return {
    secureScore: current,
    secureScoreMax: max,
    secureScorePct: pct,
    recommendations,
    mfaEnabled,
    mfaKnown: knownMfa.length,
    mfaCoverage
  };
}
export function snapshotHasRecommendations(data = {}) {
  const security = pickWorkload(data, "securityData", "security") || {};
  return pickRecommendationLists(security, data.secureScoreRecommendations || []).length > 0;
}
export async function fetchPortalMfaDetails(clientId) {
  if (!clientId) return [];
  try {
    const result = await pool.query(`
      SELECT
        user_id as id,
        display_name,
        user_principal_name,
        account_enabled,
        has_mfa,
        mfa_methods,
        is_admin,
        admin_role
      FROM v_b_clients_c_azure_mfa
      WHERE client_id = $1
      ORDER BY display_name ASC
    `, [clientId]);
    return result.rows.map(row => {
      const methods = Array.isArray(row.mfa_methods)
        ? row.mfa_methods
        : typeof row.mfa_methods === "string"
          ? (() => { try { const parsed = JSON.parse(row.mfa_methods); return Array.isArray(parsed) ? parsed : []; } catch { return []; } })()
          : [];
      const hasMfa = row.has_mfa === true;
      const isAdmin = row.is_admin === true;
      return {
      id: row.id,
      displayName: row.display_name,
      userPrincipalName: row.user_principal_name,
      email: row.user_principal_name,
      accountEnabled: row.account_enabled,
      has_mfa: hasMfa,
      hasMfa: hasMfa,
      hasMFA: hasMfa,
      mfa_methods: methods,
      mfaMethods: methods,
      is_admin: isAdmin,
      isAdmin: isAdmin,
      admin_role: row.admin_role || null,
      adminRole: row.admin_role || null
    };
    });
  } catch (err) {
    if (err.code === "42P01") return [];
    console.error("fetchPortalMfaDetails", err.message);
    return [];
  }
}
function mapControlScoresToRecommendations(controls = []) {
  if (!Array.isArray(controls)) return [];
  return controls.filter(control => {
    const current = pickNumber(control.score, control.currentScore, control.controlScore) || 0;
    const max = pickNumber(control.maxScore, control.controlMaxScore) || 0;
    return max > 0 && current < max;
  }).slice(0, 20).map((control, index) => ({
    id: control.controlName || control.controlId || control.id || `reco-${index}`,
    title: pickString(stripHtml(control.description), control.title, control.controlDisplayName, control.controlName),
    controlName: control.controlName,
    currentScore: pickNumber(control.score, control.currentScore),
    maxScore: pickNumber(control.maxScore),
    score: pickNumber(control.score, control.currentScore)
  }));
}
export async function fetchPortalSecureScoreRecommendations(clientId) {
  if (!clientId) return [];
  const cached = PORTAL_RECOS_CACHE.get(clientId);
  if (cached && Date.now() - cached.at < PORTAL_RECOS_TTL_MS) return cached.recos;
  try {
    const { getClientOffice365Credentials, getMicrosoftGraphToken } = await import("../routes/integrations/office365.js");
    const credentials = await getClientOffice365Credentials(clientId);
    if (!credentials?.tenantId || !credentials?.clientId || !credentials?.clientSecret) return [];
    const token = await getMicrosoftGraphToken(credentials.tenantId, credentials.clientId, credentials.clientSecret);
    const urls = [
      "https://graph.microsoft.com/v1.0/security/secureScores?$top=5&$orderby=createdDateTime desc",
      "https://graph.microsoft.com/v1.0/security/secureScores?$top=5"
    ];
    let payload = null;
    for (const url of urls) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 8000);
      try {
        const response = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal
        });
        if (response.ok) {
          payload = await response.json();
          break;
        }
      } catch {
        // try next URL
      } finally {
        clearTimeout(timer);
      }
    }
    if (!payload) return [];
    const latest = (payload.value || []).find(score => Array.isArray(score.controlScores) && score.controlScores.length)
      || payload.value?.[0]
      || null;
    const recos = mapControlScoresToRecommendations(latest?.controlScores);
    PORTAL_RECOS_CACHE.set(clientId, { at: Date.now(), recos });
    return recos;
  } catch (err) {
    console.warn("fetchPortalSecureScoreRecommendations", err.message);
    return [];
  }
}
function mapO365Details(row, data) {
  const rawLicences = Array.isArray(data.licences)
    ? data.licences
    : Array.isArray(data.licenses)
      ? data.licenses
      : [];
  const licenses = mapO365Licenses(rawLicences);
  const totalLicenses = licenses.reduce((sum, lic) => sum + (lic.total ?? 0), 0);
  const usedLicenses = licenses.reduce((sum, lic) => sum + (lic.used ?? 0), 0);
  const users = mapUsersForPortal(data.users, pickMfaDetails(data));
  const securityRaw = pickWorkload(data, "securityData", "security") || {};
  const security = summarizeSecurity(securityRaw, users, data.portalSecureScoreRecommendations || []);
  return {
    kind: "o365",
    product: pickString(data.tenantName, data.organization, row.name, "Microsoft 365"),
    tenantName: pickString(data.tenantName, data.organization, row.name),
    tenantId: data.tenantId || data.tenant_id || null,
    userCount: users.length || pickNumber(data.userCount, data.nombreUtilisateurs),
    licensesTotal: licenses.length ? totalLicenses : null,
    licensesUsed: licenses.length ? usedLicenses : null,
    licenses,
    users,
    exchange: summarizeExchange(pickWorkload(data, "exchangeData", "exchange")),
    teams: summarizeTeams(pickWorkload(data, "teamsData", "teams")),
    sharepoint: summarizeSharePoint(pickWorkload(data, "sharepointData", "sharepoint")),
    onedrive: summarizeOneDrive(pickWorkload(data, "onedriveData", "onedrive")),
    security,
    lastUpdate: pickDate(data.lastUpdate, data.last_update, row.updated_at, row.updatedAt),
    expiration: earliestDate(...licenses.map(lic => lic.expiration).filter(Boolean), data.expiration)
  };
}
function sanitizePortalSyncData(syncData) {
  if (!syncData || typeof syncData !== "object" || Array.isArray(syncData)) return null;
  const {
    dashboard = null,
    statistics = null,
    enrichedSummary = null,
    enrichedEndpoints = null,
    license = null,
    endpoints = null,
    company = null,
    customer = null,
    lastSync = null
  } = syncData;
  return {
    dashboard,
    statistics,
    enrichedSummary,
    enrichedEndpoints: Array.isArray(enrichedEndpoints) ? enrichedEndpoints : null,
    license,
    endpoints,
    company,
    customer,
    lastSync: pickDate(lastSync)
  };
}
function mapPortalEndpoints(endpoints = []) {
  if (!Array.isArray(endpoints)) return [];
  return endpoints.map(ep => ({
    id: ep.id || null,
    name: pickString(ep.name, "Sans nom"),
    ip: pickString(ep.ip) || "",
    type: pickString(ep.type, ep.machineType, "autre"),
    operatingSystem: pickString(ep.operatingSystem, ep.os) || "",
    fqdn: pickString(ep.fqdn) || "",
    isManaged: Boolean(ep.isManaged)
  }));
}
function mapAntivirusDetails(row, data) {
  const syncData = sanitizePortalSyncData(data.syncData);
  const endpoints = mapPortalEndpoints(
    Array.isArray(data.endpoints)
      ? data.endpoints
      : Array.isArray(syncData?.endpoints?.list)
        ? syncData.endpoints.list
        : Array.isArray(syncData?.endpoints)
          ? syncData.endpoints
          : []
  );
  const companyId = pickString(data.companyId, data.company_id, syncData?.company?.id);
  const mappingMode = pickString(data.mappingMode, data.mapping_mode) || (companyId ? "reseller" : "manual");
  return {
    kind: "antivirus",
    product: pickString(data.solution, data.logiciel, data.companyName, row.name),
    provider: pickString(data.providerId) || null,
    providerId: pickString(data.providerId) || null,
    companyId: companyId || null,
    companyName: pickString(data.companyName, syncData?.company?.name, data.solution, row.name),
    mappingMode,
    isManual: mappingMode === "manual" || !companyId,
    licensesTotal: pickNumber(data.licencesTotales, data.totalLicenses, data.license?.totalLicenses, syncData?.license?.totalLicenses, syncData?.dashboard?.sections?.license?.data?.total),
    licensesUsed: pickNumber(data.licencesUtilisees, data.usedLicenses, data.license?.usedLicenses, syncData?.license?.usedLicenses, syncData?.dashboard?.sections?.license?.data?.used),
    expiration: pickDate(data.expiration, data.expirationDate, data.license?.expirationDate, syncData?.license?.expirationDate, syncData?.dashboard?.sections?.license?.data?.expirationDate),
    endpointCount: endpoints.length || pickNumber(syncData?.dashboard?.sections?.endpoints?.total) || null,
    endpoints,
    syncData,
    lastSync: pickDate(syncData?.lastSync, data.lastSync)
  };
}
function mapAntispamDetails(row, data) {
  const syncData = sanitizePortalSyncData(data.syncData);
  const customerId = pickString(data.customerId, data.customer_id, data.authClientId, syncData?.customer?.id);
  const mappingMode = pickString(data.mappingMode, data.mapping_mode) || (customerId ? "reseller" : "manual");
  const domainsTotal = pickNumber(data.domainesSurveilles, data.licences, data.nombre_licences, data.licensesTotal, syncData?.dashboard?.sections?.domains?.total);
  const usersTotal = pickNumber(data.utilisateursProteges, data.utilisateurs, data.nombre_utilisateurs, syncData?.dashboard?.sections?.users?.total);
  return {
    kind: "antispam",
    product: pickString(data.logiciel, data.solution, data.customerName, row.name),
    providerId: pickString(data.providerId) || null,
    customerId: customerId || null,
    customerName: pickString(data.customerName, syncData?.customer?.name, data.solution, row.name),
    mappingMode,
    isManual: mappingMode === "manual" || !customerId,
    licensesTotal: domainsTotal,
    licensesUsed: usersTotal,
    domainesSurveilles: domainsTotal,
    utilisateursProteges: usersTotal,
    expiration: pickDate(data.expiration, data.expirityDate, data.expirationDate),
    syncData,
    lastSync: pickDate(syncData?.lastSync, data.lastSync)
  };
}
function pickJobLastBackup(...sources) {
  const values = [];
  sources.forEach(source => {
    if (source == null || source === "") return;
    if (typeof source === "object" && !(source instanceof Date)) {
      values.push(
        source.last_backup_start,
        source.lastBackupStart,
        source.last_backup_date,
        source.lastBackupDate,
        source.lastBackup
      );
      return;
    }
    values.push(source);
  });
  return pickDate(...values);
}
function pickJobLastBackupDuration(...sources) {
  for (const source of sources) {
    if (source == null || source === "") continue;
    if (typeof source === "object" && !(source instanceof Date)) {
      const label = pickString(source.last_backup_duration, source.lastBackupDuration);
      if (label) return label;
      continue;
    }
    const label = pickString(source);
    if (label) return label;
  }
  return null;
}
function toBackupTimestamp(value) {
  if (value == null || value === "") return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString();
  }
  const date = new Date(value);
  if (!Number.isNaN(date.getTime())) return date.toISOString();
  return String(value);
}
export function attachSaveBackupFields(data, row = {}) {
  const next = data && typeof data === "object" && !Array.isArray(data) ? { ...data } : {};
  const lastBackupDate = toBackupTimestamp(row.last_backup_date ?? next.last_backup_date);
  const lastBackupStart = toBackupTimestamp(row.last_backup_start ?? next.last_backup_start);
  const lastBackupDuration = row.last_backup_duration != null && row.last_backup_duration !== ""
    ? String(row.last_backup_duration)
    : next.last_backup_duration != null && next.last_backup_duration !== ""
      ? String(next.last_backup_duration)
      : null;
  if (lastBackupDate) next.last_backup_date = lastBackupDate;
  if (lastBackupStart) next.last_backup_start = lastBackupStart;
  if (lastBackupDuration) next.last_backup_duration = lastBackupDuration;
  return next;
}
function mapSaveJobDetails(job, instanceName, index, parentId) {
  return {
    id: job.id || `${parentId || "job"}-${index}`,
    name: pickString(job.nom, job.name, job.type, "Job"),
    jobType: pickString(job.typeBackup, job.jobType, job.type !== "job" ? job.type : null),
    lastBackup: pickJobLastBackup(job),
    lastBackupDuration: pickJobLastBackupDuration(job)
  };
}
function mapSaveInstance(row, inst, index) {
  const jobs = Array.isArray(inst.jobs) ? inst.jobs : [];
  const parentId = inst.id || inst.instanceId || `${row.id}-i${index}`;
  const name = pickString(inst.nom, inst.name, row.name, "Instance");
  return {
    id: parentId,
    itemKey: inst.item_key || inst.itemKey || row.item_key || null,
    name,
    type: "save",
    active: inst.is_active !== false,
    monitored: false,
    product: pickString(inst.logiciel, inst.software, name),
    expiration: pickDate(inst.expiration, inst.expirationGarantie, inst.garantie),
    licensesTotal: null,
    licensesUsed: null,
    licenses: [],
    details: {
      kind: "save",
      product: pickString(inst.logiciel, inst.software, name),
      capacity: pickString(inst.capacite, inst.capacity),
      site: pickString(inst.site, inst.emplacement),
      jobCount: jobs.length,
      lastBackup: pickJobLastBackup(...jobs),
      jobs: jobs.map((job, jobIndex) => mapSaveJobDetails(job, name, jobIndex, parentId))
    }
  };
}
function expandSaveRows(row, data) {
  if (isActivationFlag(row, data, "save")) return [];
  if (Array.isArray(data.instances) && data.instances.length) {
    return data.instances.map((inst, index) => mapSaveInstance(row, inst, index));
  }
  const mapped = mapCloudServiceForPortal("save", row, data);
  if (!mapped) return [];
  if (mapped.details?.kind === "save" && Array.isArray(data.jobs) && data.jobs.length) {
    mapped.details.jobs = data.jobs.map((job, jobIndex) => mapSaveJobDetails(job, mapped.name, jobIndex, mapped.id));
    mapped.details.jobCount = data.jobs.length;
    mapped.details.lastBackup = pickJobLastBackup(...mapped.details.jobs);
  }
  return [mapped];
}
function mapSaveDetails(row, data) {
  const isJob = row.item_key && String(row.item_key).startsWith("job-") || data.type === "job";
  if (isJob) {
    return {
      kind: "saveJob",
      product: pickString(data.type, data.nom, "Backup job"),
      jobType: pickString(data.typeBackup, data.jobType, data.type !== "job" ? data.type : null),
      lastBackup: pickJobLastBackup(data),
      lastBackupDuration: pickJobLastBackupDuration(data),
      instanceName: pickString(data.instanceName, data.instance, data.instanceNom),
      expiration: pickDate(data.expiration, data.expirationGarantie)
    };
  }
  return {
    kind: "save",
    product: pickString(data.logiciel, data.nom, row.name),
    capacity: pickString(data.capacite, data.capacity),
    site: pickString(data.site, data.emplacement),
    expiration: pickDate(data.expiration, data.expirationGarantie, data.garantie),
    jobCount: Array.isArray(data.jobs) ? data.jobs.length : null,
    lastBackup: pickJobLastBackup(data, ...(Array.isArray(data.jobs) ? data.jobs : []))
  };
}
function formatPortalLabelList(value) {
  if (value == null || value === "") return null;
  if (Array.isArray(value)) {
    const labels = value.map(entry => {
      if (entry == null || entry === "") return "";
      if (typeof entry === "object") return pickString(entry.name, entry.label, entry.title, entry.role);
      return String(entry).trim();
    }).filter(Boolean);
    return labels.length ? labels.join(", ") : null;
  }
  if (typeof value === "object") {
    return pickString(value.name, value.label, value.title, value.role);
  }
  const text = String(value).trim();
  return text && text !== "N/A" ? text : null;
}
function pickNddRole(data = {}) {
  const generic = new Set(["ndd", "domain", "domaine", "domains", "dns"]);
  const raw = data.role ?? data.roles ?? data.fonction ?? data.usage ?? data.category ?? data.categorie ?? data.domainRole ?? data.type;
  const label = formatPortalLabelList(raw);
  if (!label) return null;
  if (generic.has(label.toLowerCase())) return null;
  return label;
}
function pickNddAutoRenew(data = {}) {
  const nestedRenew = data.syncData?.serviceInfos?.renew || data.syncData?.renew || {};
  const flagged = asBool(
    data.autoRenew
    ?? data.auto_renewal
    ?? data.auto_renew
    ?? data.autorenew
    ?? nestedRenew.automatic
  );
  if (flagged != null) return flagged;
  const mode = String(data.renewalMode || data.renewal || nestedRenew.mode || "").toLowerCase();
  if (mode === "automatic" || mode === "auto") return true;
  if (mode === "manual" || mode === "manuel") return false;
  if (nestedRenew.manualPayment === true) return false;
  return null;
}
function mapNddDetails(row, data) {
  const autoRenew = pickNddAutoRenew(data);
  const renewalMode = pickString(data.renewalMode);
  return {
    kind: "ndd",
    product: pickString(data.registrar, "Nom de domaine"),
    domain: pickString(data.nom, data.domaine, data.domain, data.name, row.name),
    registrar: pickString(data.registrar, data.provider, data.providerName, data.registrarName),
    autoRenew,
    expiration: pickDate(data.expiration, data.expirationDate, data.expirityDate),
    renewalMode: renewalMode && renewalMode.toLowerCase() !== "unknown" ? renewalMode : (autoRenew === true ? "automatic" : autoRenew === false ? "manual" : null),
    role: pickNddRole(data),
    hasDnsZone: data.hasDnsZone === true || Boolean(data.dnsZone) ? true : data.hasDnsZone === false ? false : null
  };
}
export function mapCloudServiceForPortal(type, row, rawData = {}) {
  const data = rawData && typeof rawData === "object" ? rawData : {};
  const base = {
    id: row.id,
    itemKey: row.item_key || null,
    name: pickString(row.name, data.nom, data.name, data.domaine, data.domain, row.item_key) || "Sans nom",
    type,
    active: row.is_active !== false,
    monitored: Boolean(row.checkmk_host_name),
    product: null,
    expiration: null,
    licensesTotal: null,
    licensesUsed: null,
    licenses: [],
    details: {}
  };
  if (isActivationFlag(row, data, type)) {
    return null;
  }
  let details;
  switch (type) {
    case "o365":
      details = mapO365Details(row, data);
      break;
    case "antivirus":
      details = mapAntivirusDetails(row, data);
      break;
    case "antispam":
      details = mapAntispamDetails(row, data);
      break;
    case "save":
      details = mapSaveDetails(row, data);
      break;
    case "ndd":
      details = mapNddDetails(row, data);
      break;
    default:
      details = {
        kind: type,
        product: pickString(data.logiciel, data.solution, row.name),
        expiration: pickDate(data.expiration, data.expirationDate, data.expirationGarantie)
      };
  }
  return {
    ...base,
    product: details.product || base.name,
    expiration: details.expiration || null,
    licensesTotal: details.licensesTotal ?? null,
    licensesUsed: details.licensesUsed ?? null,
    licenses: details.licenses || [],
    details
  };
}
export function linkSaveJobsToInstances(items) {
  const list = Array.isArray(items) ? items : [];
  const instances = list.filter(item => item?.details?.kind !== "saveJob");
  const byId = new Map();
  instances.forEach(item => {
    byId.set(String(item.id), item);
    if (item.itemKey) byId.set(String(item.itemKey), item);
  });
  list.forEach(job => {
    if (job?.details?.kind !== "saveJob") return;
    const key = String(job.itemKey || "");
    const instanceId = key.startsWith("job-") ? key.slice(4) : "";
    const instance = instanceId ? byId.get(instanceId) : null;
    if (!instance) return;
    job.details.instanceName = instance.name || job.details.instanceName;
    if (!Array.isArray(instance.details?.jobs) || !instance.details.jobs.length) {
      instance.details.jobCount = (instance.details.jobCount || 0) + 1;
    }
    instance.details.lastBackup = pickJobLastBackup(instance.details, job.details);
  });
  return list;
}
export function expandCloudServiceRows(type, row, data) {
  if (type === "save") {
    return expandSaveRows(row, data);
  }
  const mapped = mapCloudServiceForPortal(type, row, data);
  if (mapped) return [mapped];
  if (type === "antivirus" && Array.isArray(data.solutions) && data.solutions.length) {
    return data.solutions.map((solution, index) => mapCloudServiceForPortal(type, {
      ...row,
      id: `${row.id}-s${index}`,
      name: solution.solution || row.name
    }, solution)).filter(Boolean);
  }
  if (type === "antispam" && Array.isArray(data.solutions) && data.solutions.length) {
    return data.solutions.map((solution, index) => mapCloudServiceForPortal(type, {
      ...row,
      id: `${row.id}-s${index}`,
      name: solution.logiciel || row.name
    }, solution)).filter(Boolean);
  }
  return [];
}
