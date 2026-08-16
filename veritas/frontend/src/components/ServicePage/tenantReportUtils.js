import { isFreeLicense, computePriorityLevel } from "./TenantDetailTabs/utils";

export const REPORT_STATUS = {
  ok: "ok",
  warning: "warning",
  critical: "critical",
  unsynced: "unsynced"
};

const SERVICE_ACCOUNT_PATTERNS = [
  /aad_/,
  /msol_/,
  /sync_/,
  /svc_/,
  /service_/,
  /\$@/,
  /_srv/,
  /_service/,
  /_sync/,
  /compte de service|service account|compte service/,
  /bot\./,
  /bot@/,
  /connector/,
  /automation/,
  /azure ad sync|ad sync|dirsync|aadconnect|dir sync/,
  /directory synchronization|synchronization service|on-premises/,
  /healthmailbox|systemmailbox|federatedemail/
];

function isLikelyServiceAccount(user) {
  const combined = `${user?.name || user?.displayName || ""} ${user?.userPrincipalName || user?.email || ""} ${user?.email || ""}`.toLowerCase();
  return SERVICE_ACCOUNT_PATTERNS.some((pattern) => pattern.test(combined));
}

function getUserDomain(user) {
  const raw = (user?.userPrincipalName || user?.email || "").toString().trim();
  const at = raw.indexOf("@");
  if (at === -1) return "";
  return raw.slice(at + 1).toLowerCase();
}

function getMfaUserForUser(user, mfaDetails) {
  if (!Array.isArray(mfaDetails) || mfaDetails.length === 0 || !user) return null;
  const upn = (user.userPrincipalName || user.email || "").toLowerCase();
  const email = (user.email || "").toLowerCase();
  const id = (user.id || user.userId || "").toString();
  return mfaDetails.find((entry) => {
    const entryUpn = (entry.userPrincipalName || entry.upn || entry.email || "").toLowerCase();
    const entryId = (entry.id || entry.userId || "").toString();
    return (entryUpn && (entryUpn === upn || entryUpn === email)) || (Boolean(id) && entryId === id);
  }) || null;
}

function userHasMfa(mfaUser) {
  if (!mfaUser) return false;
  if (mfaUser.has_mfa === true) return true;
  const methods = mfaUser.mfa_methods || mfaUser.mfaMethods || [];
  if (!Array.isArray(methods) || methods.length === 0) return false;
  return methods.some((method) => {
    const key = String(method || "").toLowerCase();
    return key && key !== "passwordauthenticationmethod" && key !== "password";
  });
}

function hasSnapshot(data) {
  return Boolean(data) && data.success !== false;
}

function metric(key, value) {
  return { key, value };
}

function finding(key, params = {}) {
  return { key, params };
}

function paidLicenses(licences) {
  return (licences || []).filter((lic) => {
    const total = lic.total || 0;
    return total > 0 && total < 10000 && !isFreeLicense(lic);
  });
}

function buildIdentityCategory(users) {
  if (!Array.isArray(users) || users.length === 0) {
    return {
      id: "identity",
      tab: "utilisateurs",
      status: REPORT_STATUS.unsynced,
      metrics: [
        metric("total", "—"),
        metric("active30", "—"),
        metric("inactive90", "—"),
        metric("blocked", "—")
      ],
      findings: [finding("identity.unsynced")]
    };
  }

  const now = Date.now();
  const period30 = now - 30 * 24 * 60 * 60 * 1000;
  const period90 = now - 90 * 24 * 60 * 60 * 1000;
  const total = users.length;
  const active30 = users.filter((user) => {
    const lastLogin = user.lastLoginDate ? new Date(user.lastLoginDate).getTime() : 0;
    return lastLogin >= period30;
  }).length;
  const inactive90 = users.filter((user) => {
    const lastLogin = user.lastLoginDate ? new Date(user.lastLoginDate).getTime() : 0;
    return !lastLogin || lastLogin < period90;
  }).length;
  const blocked = users.filter((user) => user.accountEnabled === false).length;
  const domains = new Set(users.map(getUserDomain).filter(Boolean)).size;
  const inactiveRatio = inactive90 / total;
  const blockedRatio = blocked / total;

  let status = REPORT_STATUS.ok;
  const findings = [];
  if (total >= 5 && (inactiveRatio >= 0.4 || blockedRatio >= 0.2)) {
    status = REPORT_STATUS.critical;
  } else if (total >= 5 && (inactiveRatio >= 0.2 || blockedRatio >= 0.05)) {
    status = REPORT_STATUS.warning;
  }

  if (inactiveRatio >= 0.2 && total >= 5) {
    findings.push(finding("identity.inactiveHigh", { count: inactive90, pct: Math.round(inactiveRatio * 100) }));
  }
  if (blockedRatio >= 0.05 && total >= 5) {
    findings.push(finding("identity.blockedHigh", { count: blocked, pct: Math.round(blockedRatio * 100) }));
  }
  if (findings.length === 0) findings.push(finding("identity.ok"));

  return {
    id: "identity",
    tab: "utilisateurs",
    status,
    metrics: [
      metric("total", total),
      metric("active30", active30),
      metric("inactive90", inactive90),
      metric("blocked", blocked),
      metric("domains", domains)
    ],
    findings
  };
}

function buildLicensesCategory(licences) {
  const paid = paidLicenses(licences);
  if (paid.length === 0) {
    return {
      id: "licenses",
      tab: "licences",
      status: REPORT_STATUS.unsynced,
      metrics: [
        metric("usedTotal", "—"),
        metric("available", "—"),
        metric("usageRate", "—")
      ],
      findings: [finding("licenses.unsynced")]
    };
  }

  const total = paid.reduce((sum, lic) => sum + (lic.total || 0), 0);
  const used = paid.reduce((sum, lic) => sum + (lic.utilisees || lic.used || 0), 0);
  const available = Math.max(0, total - used);
  const usageRate = total > 0 ? Math.round(used / total * 100) : 0;
  const wastedSkus = paid.filter((lic) => {
    const skuTotal = lic.total || 0;
    const skuUsed = lic.utilisees || lic.used || 0;
    return skuTotal >= 5 && skuTotal > 0 && skuUsed / skuTotal < 0.5;
  }).length;

  let status = REPORT_STATUS.ok;
  const findings = [];
  if (usageRate >= 95 || wastedSkus > 0 && usageRate < 30 && total >= 5) {
    status = REPORT_STATUS.critical;
  } else if (usageRate >= 90 || wastedSkus > 0 || usageRate < 50 && total >= 5) {
    status = REPORT_STATUS.warning;
  }

  if (usageRate >= 90) findings.push(finding("licenses.saturated", { pct: usageRate }));
  if (wastedSkus > 0 || usageRate < 50 && total >= 5) {
    findings.push(finding("licenses.waste", { pct: usageRate, count: wastedSkus }));
  }
  if (findings.length === 0) findings.push(finding("licenses.ok", { pct: usageRate }));

  return {
    id: "licenses",
    tab: "licences",
    status,
    metrics: [
      metric("usedTotal", `${used} / ${total}`),
      metric("available", available),
      metric("usageRate", `${usageRate} %`)
    ],
    findings,
    used,
    total,
    usageRate
  };
}

function buildSecurityCategory({ securityData, users, mfaDetails }) {
  const humans = (users || []).filter((user) => !isLikelyServiceAccount(user));
  const humansWithMfaInfo = humans.filter((user) => getMfaUserForUser(user, mfaDetails));
  const humansWithMfa = humansWithMfaInfo.filter((user) => userHasMfa(getMfaUserForUser(user, mfaDetails)));
  const mfaCoverage = humansWithMfaInfo.length > 0
    ? Math.round(humansWithMfa.length / humansWithMfaInfo.length * 100)
    : null;
  const hasMfaSnapshot = Array.isArray(mfaDetails) && mfaDetails.length > 0;
  const hasSecuritySnapshot = hasSnapshot(securityData);
  const scoreCurrent = securityData?.secureScore?.currentScore ?? null;
  const scoreMax = securityData?.secureScore?.maxScore ?? 100;
  const scorePct = securityData?.secureScore?.percentage
    ?? (scoreCurrent != null && scoreMax ? Math.round(scoreCurrent / scoreMax * 100) : null);
  const recommendations = Array.isArray(securityData?.secureScoreRecommendations)
    ? securityData.secureScoreRecommendations
    : [];
  const highRecos = recommendations.filter((rec) => computePriorityLevel(rec) === 3).length;

  if (!hasSecuritySnapshot && !hasMfaSnapshot) {
    return {
      id: "security",
      tab: "securite",
      status: REPORT_STATUS.unsynced,
      metrics: [
        metric("secureScore", "—"),
        metric("mfa", "—"),
        metric("highRecos", "—")
      ],
      findings: [finding("security.unsynced")],
      scorePct: null,
      mfaCoverage: null
    };
  }

  let status = REPORT_STATUS.ok;
  const findings = [];
  if ((mfaCoverage != null && mfaCoverage < 50) || (scorePct != null && scorePct < 40) || highRecos >= 5) {
    status = REPORT_STATUS.critical;
  } else if ((mfaCoverage != null && mfaCoverage < 80) || (scorePct != null && scorePct < 60) || highRecos >= 1) {
    status = REPORT_STATUS.warning;
  } else if (!hasSecuritySnapshot || !hasMfaSnapshot) {
    status = REPORT_STATUS.warning;
  }

  if (mfaCoverage != null && mfaCoverage < 80) {
    findings.push(finding("security.mfaLow", { pct: mfaCoverage, withMfa: humansWithMfa.length, total: humansWithMfaInfo.length }));
  }
  if (scorePct != null && scorePct < 60) {
    findings.push(finding("security.scoreLow", { pct: Math.round(scorePct) }));
  }
  if (highRecos > 0) {
    findings.push(finding("security.highRecos", { count: highRecos }));
  }
  if (!hasSecuritySnapshot) findings.push(finding("security.scoreUnsynced"));
  if (!hasMfaSnapshot) findings.push(finding("security.mfaUnsynced"));
  if (findings.length === 0) findings.push(finding("security.ok"));

  return {
    id: "security",
    tab: "securite",
    status,
    metrics: [
      metric("secureScore", scorePct != null ? `${Math.round(scorePct)} %` : "—"),
      metric("mfa", mfaCoverage != null ? `${mfaCoverage} %` : "—"),
      metric("highRecos", hasSecuritySnapshot ? highRecos : "—")
    ],
    findings,
    scorePct,
    mfaCoverage
  };
}

function bytesToGb(bytes) {
  if (!bytes || bytes === 0) return 0;
  return bytes / (1024 * 1024 * 1024);
}

function countSaturatedQuotas(quotas) {
  if (!Array.isArray(quotas) || quotas.length === 0) return 0;
  return quotas.filter((quota) => {
    const used = quota.storageUsed || quota.used || 0;
    const limit = quota.storageLimit || quota.prohibitSendQuota || quota.quota || 0;
    if (limit > 0) return used / limit >= 0.9;
    return bytesToGb(used) > 50;
  }).length;
}

function buildMailCategory(exchangeData) {
  const activity = exchangeData?.emailActivity;
  const hasActivity = Boolean(activity) && (activity.sent || activity.received || activity.read);
  const mailboxCount = exchangeData?.mailboxes?.total;
  const hasMailboxes = mailboxCount != null;
  if (!hasSnapshot(exchangeData) || !hasActivity && !hasMailboxes) {
    return {
      id: "mail",
      tab: "exchange",
      status: REPORT_STATUS.unsynced,
      metrics: [
        metric("mailboxes", "—"),
        metric("volume", "—"),
        metric("quotasFull", "—")
      ],
      findings: [finding("mail.unsynced")]
    };
  }

  const quotas = exchangeData?.mailboxes?.quotas || [];
  const quotasFull = countSaturatedQuotas(quotas);
  const volume = (activity?.sent || 0) + (activity?.received || 0);
  const totalSize = exchangeData?.mailboxes?.totalSize;

  let status = REPORT_STATUS.ok;
  const findings = [];
  if (quotasFull > 0) {
    status = REPORT_STATUS.critical;
    findings.push(finding("mail.quotasFull", { count: quotasFull }));
  }
  if (findings.length === 0) findings.push(finding("mail.ok"));

  return {
    id: "mail",
    tab: "exchange",
    status,
    metrics: [
      metric("mailboxes", mailboxCount != null ? mailboxCount : "—"),
      metric("volume", volume.toLocaleString()),
      metric("storage", totalSize || "—"),
      metric("quotasFull", quotas.length > 0 ? quotasFull : "—")
    ],
    findings
  };
}

function parseStorageToBytes(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return 0;
  const match = value.trim().match(/^([\d.,]+)\s*(B|KB|MB|GB|TB)?$/i);
  if (!match) return 0;
  const amount = Number(match[1].replace(",", "."));
  if (!Number.isFinite(amount)) return 0;
  const unit = (match[2] || "B").toUpperCase();
  const factor = { B: 1, KB: 1024, MB: 1024 ** 2, GB: 1024 ** 3, TB: 1024 ** 4 }[unit] || 1;
  return amount * factor;
}

function buildCollabCategory({ sharepointData, onedriveData, teamsData }) {
  const hasSp = hasSnapshot(sharepointData);
  const hasOd = hasSnapshot(onedriveData);
  const hasTeams = hasSnapshot(teamsData);
  const syncedCount = [hasSp, hasOd, hasTeams].filter(Boolean).length;

  if (syncedCount === 0) {
    return {
      id: "collab",
      tab: "sharepoint",
      status: REPORT_STATUS.unsynced,
      metrics: [
        metric("sites", "—"),
        metric("onedrive", "—"),
        metric("teams", "—")
      ],
      findings: [finding("collab.unsynced")]
    };
  }

  const sites = hasSp
    ? (sharepointData.stats?.totalSites ?? sharepointData.sites?.length ?? 0)
    : null;
  const odStorage = hasOd ? (onedriveData.storage?.totalUsed || "0 B") : null;
  const teamsCount = hasTeams ? (teamsData.teams?.teamsList?.length ?? 0) : null;
  const odBytes = parseStorageToBytes(odStorage);

  let status = REPORT_STATUS.ok;
  const findings = [];
  if (syncedCount < 3) {
    status = REPORT_STATUS.warning;
    findings.push(finding("collab.partial"));
  }
  const unused = (sites === 0 || sites == null && hasSp) && odBytes === 0 && (teamsCount === 0 || teamsCount == null && hasTeams);
  if (unused && syncedCount === 3) {
    status = REPORT_STATUS.warning;
    findings.push(finding("collab.unused"));
  }
  if (findings.length === 0) findings.push(finding("collab.ok"));

  return {
    id: "collab",
    tab: "sharepoint",
    status,
    metrics: [
      metric("sites", sites != null ? sites : "—"),
      metric("onedrive", odStorage || "—"),
      metric("teams", teamsCount != null ? teamsCount : "—")
    ],
    findings
  };
}

function adoptionPct(adoptionScore) {
  if (!adoptionScore) return null;
  if (typeof adoptionScore.percentage === "number") return Math.round(adoptionScore.percentage);
  const total = adoptionScore.totalScore;
  const max = adoptionScore.maxScore;
  if (typeof total === "number" && typeof max === "number" && max > 0) {
    return Math.round(total / max * 100);
  }
  if (typeof total === "number") return Math.round(total);
  return null;
}

function buildAdoptionCategory(adoptionScore) {
  const pct = adoptionPct(adoptionScore);
  if (pct == null) {
    return {
      id: "adoption",
      tab: "rapport",
      status: REPORT_STATUS.unsynced,
      metrics: [metric("score", "—")],
      findings: [finding("adoption.unsynced")]
    };
  }

  let status = REPORT_STATUS.ok;
  const findings = [];
  if (pct < 40) {
    status = REPORT_STATUS.critical;
    findings.push(finding("adoption.low", { pct }));
  } else if (pct < 60) {
    status = REPORT_STATUS.warning;
    findings.push(finding("adoption.medium", { pct }));
  } else {
    findings.push(finding("adoption.ok", { pct }));
  }

  return {
    id: "adoption",
    tab: null,
    status,
    metrics: [
      metric("score", `${pct} %`),
      metric("people", adoptionScore.peopleExperiences ?? "—"),
      metric("technology", adoptionScore.technologyExperiences ?? "—")
    ],
    findings
  };
}

export function buildTenantReport({
  users = [],
  licences = [],
  securityData = null,
  mfaDetails = [],
  exchangeData = null,
  sharepointData = null,
  onedriveData = null,
  teamsData = null,
  adoptionScore = null
} = {}) {
  const identity = buildIdentityCategory(users);
  const licenses = buildLicensesCategory(licences);
  const security = buildSecurityCategory({ securityData, users, mfaDetails });
  const mail = buildMailCategory(exchangeData);
  const collab = buildCollabCategory({ sharepointData, onedriveData, teamsData });
  const adoption = buildAdoptionCategory(adoptionScore);
  const categories = [identity, licenses, security, mail, collab, adoption];
  const statuses = categories.map((category) => category.status);
  const globalStatus = statuses.includes(REPORT_STATUS.critical)
    ? REPORT_STATUS.critical
    : (statuses.includes(REPORT_STATUS.warning) || statuses.includes(REPORT_STATUS.unsynced))
      ? REPORT_STATUS.warning
      : REPORT_STATUS.ok;

  return {
    globalStatus,
    kpis: {
      users: identity.status === REPORT_STATUS.unsynced ? null : identity.metrics.find((item) => item.key === "total")?.value ?? null,
      licensesUsed: licenses.used ?? null,
      licensesTotal: licenses.total ?? null,
      secureScore: security.scorePct,
      mfaCoverage: security.mfaCoverage
    },
    categories
  };
}

export function isConnectionOk(connectionStatus) {
  if (connectionStatus == null) return null;
  if (typeof connectionStatus === "string") {
    const value = connectionStatus.toLowerCase();
    if (["error", "failed", "disconnected"].includes(value)) return false;
    if (["success", "ok", "connected"].includes(value)) return true;
    return true;
  }
  if (connectionStatus.ok === false || connectionStatus.success === false || connectionStatus.connected === false) {
    return false;
  }
  return true;
}

export function getConnectionOrganization(connectionStatus) {
  if (!connectionStatus || typeof connectionStatus !== "object") return null;
  return connectionStatus.organization || connectionStatus.displayName || null;
}
