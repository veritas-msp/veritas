const MODULE_FLAG_LABELS = {
  o365: ["Office365", "Microsoft 365"],
  save: ["Sauvegarde"],
  antivirus: ["Antivirus"],
  antispam: ["Antispam"],
  ndd: ["NDD"]
};
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
function mapLicenseRows(licences = []) {
  if (!Array.isArray(licences)) return [];
  return licences.map(lic => ({
    name: pickString(lic.friendlyName, lic.productName, lic.skuPartNumber, lic.skuId, lic.nom, lic.displayName, lic.name, lic.partNumber) || "Licence",
    total: pickNumber(lic.total, lic.totalLicenses, lic.prepaidUnits?.enabled),
    used: pickNumber(lic.consumed, lic.used, lic.usedLicenses, lic.consumedUnits, lic.utilisees),
    expiration: pickDate(lic.expirationDate, lic.expiration)
  })).filter(lic => lic.name);
}
function formatUserLicenseLabel(licenses) {
  if (typeof licenses === "string" && licenses.trim()) return licenses.trim();
  if (!Array.isArray(licenses) || !licenses.length) return "";
  return licenses.map(lic => {
    if (typeof lic === "string") return lic.trim();
    return pickString(lic?.friendlyName, lic?.productName, lic?.skuPartNumber, lic?.displayName, lic?.name, lic?.nom);
  }).filter(Boolean).join(", ");
}
function userHasMfaEnabled(user) {
  if (user?.has_mfa === true || user?.hasMfa === true || user?.mfaEnabled === true) return true;
  if (user?.has_mfa === false || user?.hasMfa === false || user?.mfaEnabled === false) return false;
  const methods = user?.mfa_methods || user?.mfaMethods || [];
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
    const entryUpn = String(entry.userPrincipalName || entry.upn || entry.email || "").toLowerCase();
    const entryId = String(entry.id || entry.userId || "");
    return (entryUpn && upn && entryUpn === upn) || (id && entryId && entryId === id);
  }) || null;
}
function mapUsersForPortal(users = [], mfaDetails = []) {
  if (!Array.isArray(users)) return [];
  return users.map(user => {
    const mfa = findMfaEntry(user, mfaDetails);
    const mfaFields = mfa ? {
      has_mfa: mfa.has_mfa ?? mfa.hasMfa ?? user.has_mfa,
      mfa_methods: mfa.mfa_methods || mfa.mfaMethods || user.mfa_methods || user.mfaMethods
    } : user;
    return {
      id: user.id || null,
      name: pickString(user.displayName, user.name) || "—",
      email: pickString(user.userPrincipalName, user.email, user.mail),
      accountEnabled: user.accountEnabled !== false,
      lastLoginDate: pickDate(user.lastLoginDate, user.lastSignInDateTime),
      licenses: formatUserLicenseLabel(user.licenses) || formatUserLicenseLabel(user.assignedLicenses),
      isAdmin: Boolean(user.isAdmin || user.isGlobalAdmin || user.isCompanyAdmin || mfa?.is_admin || mfa?.isAdmin),
      mfaEnabled: userHasMfaEnabled(mfaFields)
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
  }));
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
  if (!mailboxCount && !sent && !received && !read && !quotas.length) return null;
  const quotasFull = quotas.filter(quota => {
    const used = Number(quota.storageUsed || quota.used || 0);
    const limit = Number(quota.storageLimit || quota.prohibitSendQuota || quota.quota || 0);
    if (limit > 0) return used / limit >= 0.9;
    return used / (1024 * 1024 * 1024) > 50;
  }).length;
  return {
    mailboxCount,
    sent,
    received,
    read,
    storage: mailboxes.totalSize || null,
    quotasFull: quotas.length ? quotasFull : null
  };
}
function summarizeTeams(raw) {
  if (!raw || raw.success === false) return null;
  const list = asList(raw?.teams?.teamsList).length
    ? asList(raw.teams.teamsList)
    : asList(raw?.teamsList).length
      ? asList(raw.teamsList)
      : asList(raw?.teams);
  if (!list.length && raw.teamsCount == null && raw.total == null) return null;
  return {
    teamCount: pickNumber(raw.teams?.total, raw.teamsCount, raw.total, list.length) || list.length,
    teams: list.slice(0, 100).map((team, index) => ({
      id: team.id || `team-${index}`,
      name: pickString(team.displayName, team.name) || "—",
      members: pickNumber(team.memberCount) || 0,
      channels: pickNumber(team.channelCount) || 0,
      visibility: String(team.visibility || "").toLowerCase() === "private" ? "private" : "public"
    }))
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
function summarizeSecurity(raw, users = []) {
  const score = raw?.secureScore || {};
  const current = pickNumber(score.currentScore, raw?.secureScoreCurrent);
  const max = pickNumber(score.maxScore, raw?.secureScoreMax) || 100;
  const pct = pickNumber(score.percentage) ?? (current != null && max ? Math.round(current / max * 100) : null);
  const recos = Array.isArray(raw?.secureScoreRecommendations) ? raw.secureScoreRecommendations : [];
  const recommendations = recos.slice(0, 12).map((rec, index) => ({
    id: rec.id || rec.controlName || `reco-${index}`,
    title: pickString(rec.title, rec.controlName, rec.controlDisplayName) || "—",
    score: pickNumber(rec.maxScore, rec.scoreInPercentage, rec.score)
  })).filter(rec => rec.title !== "—");
  const knownMfa = users.filter(user => user.mfaEnabled != null);
  const mfaEnabled = knownMfa.filter(user => user.mfaEnabled === true).length;
  const mfaCoverage = knownMfa.length ? Math.round(mfaEnabled / knownMfa.length * 100) : null;
  if (pct == null && !recommendations.length && mfaCoverage == null) return null;
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
  const security = summarizeSecurity(pickWorkload(data, "securityData", "security"), users);
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
function mapSaveJobDetails(job, instanceName, index, parentId) {
  return {
    id: job.id || `${parentId || "job"}-${index}`,
    name: pickString(job.nom, job.name, job.type, "Job"),
    jobType: pickString(job.type, job.jobType),
    lastBackup: pickDate(job.last_backup_date, job.lastBackupDate, job.lastBackup),
    lastBackupDuration: pickString(job.last_backup_duration, job.lastBackupDuration)
  };
}
function mapSaveInstance(row, inst, index) {
  const jobs = Array.isArray(inst.jobs) ? inst.jobs : [];
  const parentId = inst.id || inst.instanceId || `${row.id}-i${index}`;
  const name = pickString(inst.nom, inst.name, row.name, "Instance");
  return {
    id: parentId,
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
      lastBackup: pickDate(...jobs.map(job => job.last_backup_date || job.lastBackupDate || job.lastBackup)),
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
    mapped.details.lastBackup = pickDate(...mapped.details.jobs.map(job => job.lastBackup));
  }
  return [mapped];
}
function mapSaveDetails(row, data) {
  const isJob = row.item_key && String(row.item_key).startsWith("job-") || data.type === "job";
  if (isJob) {
    return {
      kind: "saveJob",
      product: pickString(data.type, data.nom, "Backup job"),
      jobType: pickString(data.type, data.jobType),
      lastBackup: pickDate(data.last_backup_date, data.lastBackupDate, data.lastBackup),
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
    lastBackup: pickDate(...(Array.isArray(data.jobs) ? data.jobs.map(job => job.last_backup_date || job.lastBackupDate) : []))
  };
}
function mapNddDetails(row, data) {
  return {
    kind: "ndd",
    product: pickString(data.registrar, "Nom de domaine"),
    domain: pickString(data.nom, data.domaine, data.domain, data.name, row.name),
    registrar: pickString(data.registrar, data.provider, data.providerName),
    autoRenew: data.autoRenew === true || data.auto_renewal === true ? true : data.autoRenew === false || data.auto_renewal === false ? false : null,
    expiration: pickDate(data.expiration, data.expirationDate, data.expirityDate),
    renewalMode: pickString(data.renewalMode),
    role: pickString(data.role, data.type)
  };
}
export function mapCloudServiceForPortal(type, row, rawData = {}) {
  const data = rawData && typeof rawData === "object" ? rawData : {};
  const base = {
    id: row.id,
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
