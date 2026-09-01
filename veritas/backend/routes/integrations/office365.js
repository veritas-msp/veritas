import express from "express";
import { pool } from "../../database/db.js";
import verifyJWT from "../../middleware/auth.js";
import fetch from "node-fetch";
import { getSettingsMap } from "../../utils/settingsHelper.js";
import { createMicrosoftAuthError, isMicrosoftAuthError } from "../../utils/microsoftAuthErrors.js";
import { ensureAzureMfaSchema } from "../../services/ensureAzureMfaSchema.js";
const router = express.Router();
let tokenCache = {};
const mfaRefreshInFlight = new Map();
export async function getOffice365Settings() {
  try {
    const map = await getSettingsMap();
    const settings = {};
    Object.entries(map).forEach(([k, v]) => {
      if (k.startsWith('office365_')) {
        const cleanKey = k.replace('office365_', '');
        settings[cleanKey] = v;
      }
    });
    return settings;
  } catch (error) {
    return null;
  }
}
export async function getClientOffice365Credentials(clientId, selector = null) {
  if (!clientId) return null;
  try {
    const credentialId = selector?.credentialId || selector?.azureCredentialId || null;
    const tenantId = selector?.tenantId || null;
    const params = [clientId];
    let where = "WHERE client_id = $1";
    if (credentialId) {
      params.push(credentialId);
      where += ` AND id = $${params.length}`;
    } else if (tenantId) {
      params.push(String(tenantId));
      where += ` AND tenant_id = $${params.length}`;
    }
    const result = await pool.query(`SELECT id, tenant_id, client_id_azure, client_secret_encrypted, iv, auth_tag
       FROM v_b_clients_azure 
       ${where}
       ORDER BY id ASC
       LIMIT 1`, params);
    if (result.rows.length === 0) {
      return null;
    }
    const cred = result.rows[0];
    const {
      decrypt
    } = await import("../../utils/encryption.js");
    const clientSecret = decrypt(cred.client_secret_encrypted, cred.iv, cred.auth_tag);
    return {
      id: cred.id,
      tenantId: cred.tenant_id,
      clientId: cred.client_id_azure,
      clientSecret: clientSecret
    };
  } catch (error) {
    return null;
  }
}
function office365CredentialSelector(req) {
  return {
    credentialId: req.query?.azureCredentialId || req.query?.credentialId || null,
    tenantId: req.query?.tenantId || null
  };
}
export async function getMicrosoftGraphToken(tenantId, clientId, clientSecret) {
  try {
    const cachedToken = tokenCache[tenantId];
    if (cachedToken && cachedToken.token && cachedToken.expiresAt && Date.now() < cachedToken.expiresAt - 300000) {
      return cachedToken.token;
    }
    const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
    const params = new URLSearchParams({
      client_id: clientId,
      scope: "https://graph.microsoft.com/.default",
      client_secret: clientSecret,
      grant_type: "client_credentials"
    });
    const response = await fetch(tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: params.toString()
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw createMicrosoftAuthError(response.status, errorText);
    }
    const data = await response.json();
    const expiresIn = data.expires_in || 3600;
    tokenCache[tenantId] = {
      token: data.access_token,
      expiresAt: Date.now() + expiresIn * 1000
    };
    return data.access_token;
  } catch (error) {
    if (tokenCache[tenantId]) {
      delete tokenCache[tenantId];
    }
    throw error;
  }
}
function formatBytes(bytes) {
  if (!bytes || bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i];
}
function parseCSV(csvText) {
  if (!csvText || typeof csvText !== 'string') return [];
  const lines = csvText.split('\n').filter(line => line.trim());
  if (lines.length < 2) return [];
  const parseCSVLine = line => {
    const result = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };
  const headers = parseCSVLine(lines[0]).map(h => h.replace(/^"|"$/g, ''));
  const data = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]).map(v => v.replace(/^"|"$/g, ''));
    if (values.length === headers.length) {
      const obj = {};
      headers.forEach((header, index) => {
        obj[header] = values[index];
      });
      data.push(obj);
    }
  }
  return data;
}
function isLikelyServiceAccount(displayName, userPrincipalName, mail) {
  const dn = (displayName || '').toString();
  const upn = (userPrincipalName || '').toString();
  const m = (mail || '').toString();
  const combined = `${dn} ${upn} ${m}`.toLowerCase();
  const patterns = [/aad_/i, /msol_/i, /sync_/i, /svc_/i, /service_/i, /\$@/, /_srv/i, /_service/i, /_sync/i, /compte de service|service account|compte service/i, /bot\./i, /bot@/i, /connector/i, /automation/i, /azure ad sync|ad sync|dirsync|aadconnect|dir sync/i, /directory synchronization|synchronization service|on-premises/i, /healthmailbox|systemmailbox|federatedemail/i];
  return patterns.some(p => p.test(combined));
}
function getReportRowValue(row, possibleKeys) {
  if (!row || typeof row !== 'object') return null;
  for (const key of possibleKeys) {
    if (row[key] != null && row[key] !== '') return row[key];
  }
  const keysLower = Object.keys(row).reduce((acc, k) => {
    acc[k.toLowerCase().trim()] = k;
    return acc;
  }, {});
  for (const key of possibleKeys) {
    const k = key.toLowerCase().trim();
    if (keysLower[k] != null && row[keysLower[k]] != null && row[keysLower[k]] !== '') return row[keysLower[k]];
  }
  return null;
}
const secureScorePhraseDictionary = [{
  pattern: /Multi-factor authentication/gi,
  replacement: "authentification multifacteur"
}, {
  pattern: /multi factor authentication/gi,
  replacement: "authentification multifacteur"
}, {
  pattern: /Multi-Factor Authentication/gi,
  replacement: "authentification multifacteur"
}, {
  pattern: /Enable/gi,
  replacement: "Activer"
}, {
  pattern: /Require/gi,
  replacement: "Exiger"
}, {
  pattern: /Turn on/gi,
  replacement: "Activer"
}, {
  pattern: /Turn off/gi,
  replacement: "Disable"
}, {
  pattern: /Configure/gi,
  replacement: "Configurer"
}, {
  pattern: /Review/gi,
  replacement: "Verify"
}, {
  pattern: /Ensure/gi,
  replacement: "S'assurer"
}, {
  pattern: /Disallow/gi,
  replacement: "Interdire"
}, {
  pattern: /Prevent/gi,
  replacement: "Prevent"
}, {
  pattern: /Block/gi,
  replacement: "Bloquer"
}, {
  pattern: /Require/gi,
  replacement: "Exiger"
}, {
  pattern: /Allow/gi,
  replacement: "Autoriser"
}, {
  pattern: /Users/gi,
  replacement: "utilisateurs"
}, {
  pattern: /Admins/gi,
  replacement: "administrateurs"
}, {
  pattern: /Accounts/gi,
  replacement: "comptes"
}, {
  pattern: /Password/gi,
  replacement: "password"
}, {
  pattern: /Passwords/gi,
  replacement: "mots de passe"
}, {
  pattern: /Sign-in/gi,
  replacement: "connexion"
}, {
  pattern: /Sign in/gi,
  replacement: "connexion"
}, {
  pattern: /Devices/gi,
  replacement: "appareils"
}, {
  pattern: /Device/gi,
  replacement: "appareil"
}, {
  pattern: /Policy/gi,
  replacement: "policy"
}, {
  pattern: /Policies/gi,
  replacement: "policies"
}, {
  pattern: /Legacy/gi,
  replacement: "inherited"
}, {
  pattern: /connections/gi,
  replacement: "connexions"
}, {
  pattern: /applications/gi,
  replacement: "applications"
}];
const secureScoreCategoryDictionary = {
  Identity: "Identity",
  Data: "Data",
  Device: "Appareils",
  Applications: "Applications",
  Apps: "Applications",
  Infrastructure: "Infrastructure",
  Security: "Security",
  General: "General"
};
function translateSecureScoreText(text) {
  if (!text || typeof text !== "string") return text;
  let translated = text;
  secureScorePhraseDictionary.forEach(({
    pattern,
    replacement
  }) => {
    translated = translated.replace(pattern, replacement);
  });
  translated = translated.replace(/\s+/g, " ").trim();
  if (translated.length > 0) {
    translated = translated.charAt(0).toUpperCase() + translated.slice(1);
  }
  return translated;
}
function translateRecommendationState(state) {
  const normalized = (state || "").toLowerCase();
  switch (normalized) {
    case "completed":
    case "resolved":
      return "Completed";
    case "inprogress":
    case "in-progress":
      return "En cours";
    case "active":
      return "Actif";
    case "acknowledged":
      return "Reconnu";
    case "todo":
    case "notstarted":
      return "To process";
    default:
      return "Inconnu";
  }
}
function translateCategoryLabel(category) {
  if (!category) return "General";
  const key = category.trim();
  return secureScoreCategoryDictionary[key] || secureScoreCategoryDictionary[key.charAt(0).toUpperCase() + key.slice(1)] || category;
}
function computeRecommendationPriority(profile) {
  const priorityDirect = (profile.priority || "").toLowerCase();
  if (priorityDirect === "high" || priorityDirect === "high" || priorityDirect === "high") {
    return {
      label: "High",
      level: 3
    };
  } else if (priorityDirect === "medium" || priorityDirect === "moyenne" || priorityDirect === "moyen") {
    return {
      label: "Moyenne",
      level: 2
    };
  } else if (priorityDirect === "low" || priorityDirect === "faible") {
    return {
      label: "Faible",
      level: 1
    };
  }
  const rank = typeof profile.rank === "number" ? profile.rank : null;
  const maxScore = typeof profile.maxScore === "number" ? profile.maxScore : 0;
  const tier = (profile.tier || "").toLowerCase();
  let level = 0;
  if (rank !== null) {
    if (rank <= 20) level = 3;else if (rank <= 60) level = 2;else level = 1;
  } else if (tier === "core") {
    level = 3;
  } else if (tier === "advanced") {
    level = 2;
  } else if (maxScore >= 15) {
    level = 3;
  } else if (maxScore >= 8) {
    level = 2;
  } else if (maxScore > 0) {
    level = 1;
  }
  let label = "Uncategorized";
  if (level === 3) label = "High";else if (level === 2) label = "Moyenne";else if (level === 1) label = "Faible";
  return {
    label,
    level
  };
}
function mapSecureScoreProfilesToRecommendations(secureScoreProfiles) {
  if (!secureScoreProfiles?.value || !Array.isArray(secureScoreProfiles.value)) {
    return [];
  }
  const isDirectoryRecommendations = secureScoreProfiles.value.length > 0 && (secureScoreProfiles.value[0].displayName !== undefined || secureScoreProfiles.value[0].status !== undefined);
  const filteredRecommendations = secureScoreProfiles.value.slice();
  return filteredRecommendations.map(rec => {
    const priorityInfo = computeRecommendationPriority(rec);
    if (isDirectoryRecommendations) {
      return {
        id: rec.id,
        title: rec.displayName || rec.title || "Recommandation",
        titleFr: translateSecureScoreText(rec.displayName || rec.title || "Recommandation"),
        rank: typeof rec.rank === "number" ? rec.rank : null,
        priorityLabel: priorityInfo.label,
        priorityLevel: priorityInfo.level,
        category: rec.category || rec.featureAreas?.[0] || "General",
        categoryFr: translateCategoryLabel(rec.category || rec.featureAreas?.[0] || "General"),
        actionType: rec.actionType || null,
        service: rec.service || null,
        licenseRequirement: rec.licenseRequirement || "Unspecified",
        maxScore: rec.maxScore || 0,
        currentScore: rec.currentScore || 0,
        state: rec.status || rec.state || "unknown",
        stateLabel: translateRecommendationState(rec.status || rec.state),
        implementationStatus: rec.implementationStatus || null,
        remediation: rec.insights || rec.remediation || null,
        remediationFr: translateSecureScoreText(rec.insights || rec.remediation || ""),
        remediationImpact: rec.remediationImpact || null,
        userImpact: rec.userImpact || null,
        userImpactFr: translateSecureScoreText(rec.userImpact || ""),
        threats: rec.threats || [],
        tier: rec.tier || null,
        lastModifiedDateTime: rec.lastModifiedDateTime || rec.createdDateTime || null,
        vendorInformation: rec.vendorInformation || null,
        priority: rec.priority || null,
        recommendationType: rec.recommendationType || null
      };
    }
    return {
      id: rec.id,
      title: rec.title || rec.name || "Recommandation",
      titleFr: translateSecureScoreText(rec.title || rec.name || "Recommandation"),
      rank: typeof rec.rank === "number" ? rec.rank : null,
      priorityLabel: priorityInfo.label,
      priorityLevel: priorityInfo.level,
      category: rec.controlCategory || rec.category || "General",
      categoryFr: translateCategoryLabel(rec.controlCategory || rec.category || "General"),
      actionType: rec.actionType || null,
      service: rec.service || null,
      licenseRequirement: rec.licenseRequirement || "Unspecified",
      maxScore: rec.maxScore || 0,
      currentScore: rec.currentScore || 0,
      state: rec.state || "unknown",
      stateLabel: translateRecommendationState(rec.state),
      implementationStatus: rec.implementationStatus || null,
      remediation: rec.remediation || null,
      remediationFr: translateSecureScoreText(rec.remediation || ""),
      remediationImpact: rec.remediationImpact || null,
      userImpact: rec.userImpact || null,
      userImpactFr: translateSecureScoreText(rec.userImpact || ""),
      threats: rec.threats || [],
      tier: rec.tier || null,
      lastModifiedDateTime: rec.lastModifiedDateTime || rec.createdDateTime || null,
      vendorInformation: rec.vendorInformation || null
    };
  }).sort((a, b) => {
    const scoreDiff = (b.maxScore || 0) - (a.maxScore || 0);
    if (scoreDiff !== 0) return scoreDiff;
    const priorityDiff = (b.priorityLevel || 0) - (a.priorityLevel || 0);
    if (priorityDiff !== 0) return priorityDiff;
    const rankA = a.rank ?? Number.MAX_SAFE_INTEGER;
    const rankB = b.rank ?? Number.MAX_SAFE_INTEGER;
    return rankA - rankB;
  });
}
function getLatestSecureScoreWithControls(secureScoresPayload) {
  if (!secureScoresPayload?.value || !Array.isArray(secureScoresPayload.value)) {
    return null;
  }
  const scored = secureScoresPayload.value.filter(score => Array.isArray(score?.controlScores) && score.controlScores.length > 0).sort((a, b) => {
    const dateA = new Date(a?.createdDateTime || 0);
    const dateB = new Date(b?.createdDateTime || 0);
    return dateB - dateA;
  });
  return scored[0] || null;
}
function extractActionableControlIds(latestSecureScore) {
  if (!latestSecureScore?.controlScores || !Array.isArray(latestSecureScore.controlScores)) {
    return new Set();
  }
  const actionableControlIds = new Set();
  latestSecureScore.controlScores.forEach(control => {
    const controlId = control?.controlName || control?.controlId || control?.id || null;
    if (!controlId) return;
    const currentScore = Number(control?.score ?? control?.currentScore ?? control?.controlScore ?? 0);
    const maxScore = Number(control?.maxScore ?? control?.controlMaxScore ?? control?.max ?? 0);
    if (Number.isFinite(maxScore) && maxScore > 0 && currentScore < maxScore) {
      actionableControlIds.add(String(controlId));
      return;
    }
    const status = String(control?.state || control?.status || control?.implementationStatus || "").toLowerCase();
    if (status.includes("todo") || status.includes("inprogress") || status.includes("active")) {
      actionableControlIds.add(String(controlId));
    }
  });
  return actionableControlIds;
}
async function callMicrosoftGraph(endpoint, accessToken, options = {}) {
  const {
    getAllPages = false,
    isReport = false,
    maxRetries = 3,
    useBeta = false
  } = options;
  const apiVersion = useBeta ? 'beta' : 'v1.0';
  const graphUrl = `https://graph.microsoft.com/${apiVersion}${endpoint}`;
  let allData = [];
  let nextLink = graphUrl;
  const makeRequestWithRetry = async (url, retryCount = 0) => {
    try {
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": isReport ? "text/csv" : "application/json",
          "Accept": isReport ? "text/csv" : "application/json"
        }
      });
      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `Microsoft Graph API error: ${response.status}`;
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.error?.message || errorMessage;
        } catch {
          errorMessage += ` - ${errorText}`;
        }
        const isRetryableError = errorMessage.includes('Please retry later') || errorMessage.includes('retry') || response.status === 429 || response.status === 503 || response.status === 502;
        if (isRetryableError && retryCount < maxRetries) {
          const delay = Math.min(Math.pow(2, retryCount) * 1000, 30000);
          await new Promise(resolve => setTimeout(resolve, delay));
          return makeRequestWithRetry(url, retryCount + 1);
        }
        throw new Error(errorMessage);
      }
      return response;
    } catch (error) {
      if (retryCount < maxRetries && (error.message.includes('Please retry later') || error.message.includes('retry') || error.message.includes('429'))) {
        const delay = Math.min(Math.pow(2, retryCount) * 1000, 30000);
        await new Promise(resolve => setTimeout(resolve, delay));
        return makeRequestWithRetry(url, retryCount + 1);
      }
      throw error;
    }
  };
  try {
    do {
      const response = await makeRequestWithRetry(nextLink);
      if (isReport) {
        const csvText = await response.text();
        const parsedData = parseCSV(csvText);
        if (getAllPages) {
          allData = allData.concat(parsedData);
        } else {
          return {
            value: parsedData
          };
        }
        break;
      } else {
        const data = await response.json();
        if (getAllPages && data && typeof data === "object") {
          const pageValues = Array.isArray(data.value) ? data.value : [];
          allData = allData.concat(pageValues);
          nextLink = data["@odata.nextLink"] || null;
        } else {
          return data;
        }
      }
    } while (nextLink && getAllPages && !isReport);
    return {
      value: allData
    };
  } catch (error) {
    throw error;
  }
}

const GRAPH_MFA_METHOD_MAP = {
  microsoftauthenticatorpush: "microsoftauthenticatorauthenticationmethod",
  microsoftauthenticatorotp: "microsoftauthenticatorauthenticationmethod",
  microsoftauthenticator: "microsoftauthenticatorauthenticationmethod",
  softwareonetimepasscode: "softwareoathauthenticationmethod",
  softwareoath: "softwareoathauthenticationmethod",
  mobilephone: "phoneauthenticationmethod",
  sms: "phoneauthenticationmethod",
  voicemobile: "phoneauthenticationmethod",
  voiceoffice: "phoneauthenticationmethod",
  voicealternatemobile: "phoneauthenticationmethod",
  officephone: "phoneauthenticationmethod",
  alternatemobilephone: "phoneauthenticationmethod",
  phoneauthentication: "phoneauthenticationmethod",
  email: "emailauthenticationmethod",
  fido2: "fido2authenticationmethod",
  windowshelloforbusiness: "windowshelloforbusinessauthenticationmethod",
  temporaryaccesspass: "temporaryaccesspassauthenticationmethod",
  microsoftauthenticatorpasswordless: "microsoftauthenticatorauthenticationmethod",
  passkeydevicebound: "fido2authenticationmethod",
  passkeydeviceboundauthenticator: "fido2authenticationmethod",
  passkeysynced: "fido2authenticationmethod",
  macossecureenclavekey: "fido2authenticationmethod"
};
const REAL_MFA_METHOD_TYPES = new Set([
  "emailauthenticationmethod",
  "softwareoathauthenticationmethod",
  "phoneauthenticationmethod",
  "microsoftauthenticatorauthenticationmethod",
  "fido2authenticationmethod",
  "temporaryaccesspassauthenticationmethod"
]);
const ADMIN_ROLE_NAME_HINTS = [
  "Global Administrator",
  "Privileged Role Administrator",
  "Exchange Administrator",
  "SharePoint Administrator",
  "User Administrator",
  "Security Administrator",
  "Billing Administrator",
  "Application Administrator",
  "Cloud Application Administrator",
  "Helpdesk Administrator",
  "Teams Administrator",
  "Power Platform Administrator",
  "Azure AD Joined Device Local Administrator",
  "Intune Administrator",
  "Windows 365 Administrator",
  "Compliance Administrator",
  "Conditional Access Administrator",
  "Authentication Administrator",
  "License Administrator",
  "Groups Administrator",
  "Password Administrator",
  "Directory Readers",
  "Guest Inviter",
  "Message Center Reader",
  "Reports Reader"
];

function isAdminRoleName(displayName) {
  const name = String(displayName || "").trim();
  if (!name) return false;
  if (ADMIN_ROLE_NAME_HINTS.some(hint => name.includes(hint))) return true;
  return /administrator|\badmin\b/i.test(name);
}

function mapGraphMethodToUiType(raw) {
  const key = String(raw || "").replace(/^#microsoft\.graph\./i, "").toLowerCase().trim();
  if (!key || key === "passwordauthenticationmethod" || key === "password") return null;
  if (GRAPH_MFA_METHOD_MAP[key]) return GRAPH_MFA_METHOD_MAP[key];
  if (key.endsWith("authenticationmethod")) return key;
  return null;
}

function collectUiMfaMethods(rawList) {
  const source = Array.isArray(rawList)
    ? rawList
    : typeof rawList === "string"
      ? rawList.split(",").map(item => item.trim()).filter(Boolean)
      : [];
  const methods = [];
  source.forEach(item => {
    const mapped = mapGraphMethodToUiType(item);
    if (mapped && !methods.includes(mapped)) methods.push(mapped);
  });
  return methods;
}

function userHasRealMfa(methods) {
  return (methods || []).some(method => REAL_MFA_METHOD_TYPES.has(method));
}

async function mapInBatches(items, batchSize, mapper) {
  const results = [];
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    results.push(...await Promise.all(batch.map(mapper)));
  }
  return results;
}

function upsertAdministrator(list, member, roleName) {
  if (!member || !roleName) return;
  const isUser = member["@odata.type"] === "#microsoft.graph.user"
    || Boolean(member.userPrincipalName || member.mail);
  if (!isUser) return;
  const email = (member.mail || member.userPrincipalName || "").toLowerCase().trim();
  const existing = list.find(entry => entry.id === member.id || entry.email && email && entry.email.toLowerCase().trim() === email);
  if (!existing) {
    list.push({
      id: member.id,
      name: member.displayName || member.userPrincipalName,
      email: member.mail || member.userPrincipalName,
      role: roleName,
      hasMFA: false
    });
    return;
  }
  const roles = String(existing.role || "").split(",").map(part => part.trim()).filter(Boolean);
  if (!roles.includes(roleName)) {
    existing.role = [...roles, roleName].join(", ");
  }
}

async function fetchUserRegistrationDetails(accessToken) {
  const queries = [
    { endpoint: "/reports/authenticationMethods/userRegistrationDetails?$select=id,userPrincipalName,userDisplayName,isAdmin,isMfaRegistered,isMfaCapable,methodsRegistered,userType&$top=999", options: { getAllPages: true } },
    { endpoint: "/reports/authenticationMethods/userRegistrationDetails?$top=999", options: { getAllPages: true } },
    { endpoint: "/reports/authenticationMethods/userRegistrationDetails?$select=id,userPrincipalName,userDisplayName,isAdmin,isMfaRegistered,isMfaCapable,methodsRegistered,userType&$top=999", options: { getAllPages: true, useBeta: true } },
    { endpoint: "/reports/authenticationMethods/userRegistrationDetails?$top=999", options: { getAllPages: true, useBeta: true } }
  ];
  for (const query of queries) {
    const result = await callMicrosoftGraph(query.endpoint, accessToken, query.options).catch(err => {
      console.warn("[azure-mfa] userRegistrationDetails failed:", err?.message || err);
      return null;
    });
    if (result?.value?.length) return result;
  }
  return null;
}

async function fetchDirectoryAdministrators(accessToken, users = []) {
  const administrators = [];
  const usersById = new Map((users || []).map(user => [user.id, user]));
  const directoryRoles = await callMicrosoftGraph("/directoryRoles?$select=id,displayName", accessToken).catch(() => null);
  for (const role of directoryRoles?.value || []) {
    if (!isAdminRoleName(role.displayName)) continue;
    const members = await callMicrosoftGraph(`/directoryRoles/${role.id}/members?$select=id,displayName,mail,userPrincipalName`, accessToken, {
      getAllPages: true
    }).catch(() => null);
    (members?.value || []).forEach(member => upsertAdministrator(administrators, member, role.displayName));
  }
  const definitions = await callMicrosoftGraph("/roleManagement/directory/roleDefinitions?$select=id,displayName", accessToken, {
    getAllPages: true
  }).catch(() => null);
  const definitionById = new Map((definitions?.value || []).map(def => [def.id, def.displayName]));
  const assignments = await callMicrosoftGraph("/roleManagement/directory/roleAssignments?$select=principalId,roleDefinitionId", accessToken, {
    getAllPages: true
  }).catch(() => null);
  for (const assignment of assignments?.value || []) {
    const roleName = definitionById.get(assignment.roleDefinitionId);
    if (!isAdminRoleName(roleName) || !assignment.principalId) continue;
    const user = usersById.get(assignment.principalId);
    if (user) upsertAdministrator(administrators, user, roleName);
  }
  return administrators;
}

async function fetchUserAuthenticationMethods(accessToken, userId) {
  const methods = await callMicrosoftGraph(`/users/${userId}/authentication/methods`, accessToken).catch(() => null);
  const types = [];
  let lastMfaEnrollmentDate = null;
  if (methods?.value && Array.isArray(methods.value)) {
    methods.value.forEach(method => {
      const mapped = mapGraphMethodToUiType(method["@odata.type"]);
      if (mapped && !types.includes(mapped)) types.push(mapped);
    });
    const dated = methods.value
      .map(method => ({
        type: mapGraphMethodToUiType(method["@odata.type"]),
        createdDateTime: method.createdDateTime
      }))
      .filter(entry => entry.type && REAL_MFA_METHOD_TYPES.has(entry.type) && entry.createdDateTime)
      .sort((a, b) => new Date(b.createdDateTime) - new Date(a.createdDateTime));
    if (dated[0]) lastMfaEnrollmentDate = dated[0].createdDateTime;
  }
  return { methods: types, lastMfaEnrollmentDate };
}

function asGraphBool(value) {
  return value === true || value === "True" || value === "true" || value === "TRUE";
}

function collectAdminRolesForUser(userDetail, administrators) {
  const roles = [];
  const userUpn = String(userDetail?.userPrincipalName || userDetail?.email || "").toLowerCase().trim();
  for (const admin of administrators || []) {
    const adminEmail = String(admin.email || "").toLowerCase().trim();
    const matchById = admin.id && userDetail?.id && String(admin.id) === String(userDetail.id);
    const matchByUpn = Boolean(userUpn && adminEmail && userUpn === adminEmail);
    if (!matchById && !matchByUpn) continue;
    String(admin.role || "").split(",").map(part => part.trim()).filter(Boolean).forEach(role => {
      if (!roles.includes(role)) roles.push(role);
    });
  }
  return roles;
}

function enrichUserMfaWithAdminRoles(userDetail, administrators) {
  const adminRoles = collectAdminRolesForUser(userDetail, administrators);
  if (userDetail?.isAdminFromReport && adminRoles.length === 0) {
    adminRoles.push("Administrator");
  }
  const isAdmin = adminRoles.length > 0 || Boolean(userDetail?.isAdminFromReport);
  const adminRoleText = adminRoles.join(", ") || null;
  return {
    ...userDetail,
    isAdmin,
    is_admin: isAdmin,
    adminRole: adminRoleText,
    admin_role: adminRoleText,
    hasMfa: Boolean(userDetail?.hasMFA),
    has_mfa: Boolean(userDetail?.hasMFA),
    mfa_methods: userDetail?.mfaMethods || []
  };
}

async function buildUserMfaDetails(accessToken, users, registrationPayload = null) {
  const list = Array.isArray(users) ? users : [];
  const registration = registrationPayload || await fetchUserRegistrationDetails(accessToken);
  const byId = new Map();
  const byUpn = new Map();
  for (const row of registration?.value || []) {
    if (row?.id) byId.set(String(row.id), row);
    const upn = String(row?.userPrincipalName || "").toLowerCase().trim();
    if (upn) byUpn.set(upn, row);
  }
  if (!registration?.value?.length) {
    console.warn("[azure-mfa] userRegistrationDetails unavailable, falling back to per-user authentication methods");
  }
  const details = list.map(user => {
    const row = byId.get(String(user.id)) || byUpn.get(String(user.userPrincipalName || user.mail || "").toLowerCase().trim());
    if (!row) {
      return {
        id: user.id,
        displayName: user.displayName || user.userPrincipalName,
        userPrincipalName: user.userPrincipalName,
        accountEnabled: user.accountEnabled !== false,
        hasMFA: false,
        mfaMethods: [],
        lastMfaEnrollmentDate: null,
        isAdminFromReport: false,
        _needsMethods: true
      };
    }
    const methods = collectUiMfaMethods(row.methodsRegistered);
    return {
      id: user.id,
      displayName: user.displayName || row.userDisplayName || user.userPrincipalName,
      userPrincipalName: user.userPrincipalName || row.userPrincipalName,
      accountEnabled: user.accountEnabled !== false,
      hasMFA: asGraphBool(row.isMfaRegistered) || asGraphBool(row.isMfaCapable) || userHasRealMfa(methods),
      mfaMethods: methods,
      lastMfaEnrollmentDate: null,
      isAdminFromReport: asGraphBool(row.isAdmin),
      _needsMethods: false
    };
  });
  const missing = details.filter(detail => detail._needsMethods);
  if (missing.length) {
    const fetched = await mapInBatches(missing, 8, async user => {
      const extra = await fetchUserAuthenticationMethods(accessToken, user.id);
      return {
        id: user.id,
        ...extra
      };
    });
    const extraById = new Map(fetched.map(item => [String(item.id), item]));
    details.forEach(detail => {
      if (!detail._needsMethods) return;
      const extra = extraById.get(String(detail.id));
      if (extra) {
        detail.mfaMethods = extra.methods || [];
        detail.hasMFA = userHasRealMfa(detail.mfaMethods);
        detail.lastMfaEnrollmentDate = extra.lastMfaEnrollmentDate;
      }
    });
  }
  return details.map(detail => {
    const {
      _needsMethods,
      ...rest
    } = detail;
    return rest;
  });
}

function buildMfaStatsFromUsers(userMfaDetails, fallbackUserCount = 0) {
  const stats = {
    totalUsers: userMfaDetails.length || fallbackUserCount || 0,
    usersWithMFA: 0,
    usersWithoutMFA: 0,
    mfaRate: 0,
    mfaMethods: {
      authenticator: 0,
      phone: 0,
      sms: 0,
      email: 0,
      fido2: 0
    }
  };
  userMfaDetails.forEach(user => {
    if (user.hasMFA) stats.usersWithMFA += 1;
    else stats.usersWithoutMFA += 1;
    const methods = user.mfaMethods || [];
    if (methods.includes("microsoftauthenticatorauthenticationmethod")) stats.mfaMethods.authenticator += 1;
    if (methods.includes("phoneauthenticationmethod")) {
      stats.mfaMethods.phone += 1;
      stats.mfaMethods.sms += 1;
    }
    if (methods.includes("emailauthenticationmethod")) stats.mfaMethods.email += 1;
    if (methods.includes("fido2authenticationmethod")) stats.mfaMethods.fido2 += 1;
  });
  if (!userMfaDetails.length) stats.usersWithoutMFA = stats.totalUsers;
  stats.mfaRate = stats.totalUsers > 0 ? Math.round(stats.usersWithMFA / stats.totalUsers * 100) : 0;
  return stats;
}

async function persistUserMfaDetails(clientId, userMfaDetails, administrators) {
  await ensureAzureMfaSchema();
  let saved = 0;
  for (const userDetail of userMfaDetails) {
    const enriched = enrichUserMfaWithAdminRoles(userDetail, administrators);
    await pool.query(`
      INSERT INTO v_b_clients_c_azure_mfa (
        client_id, user_id, display_name, user_principal_name, account_enabled,
        has_mfa, mfa_methods, latest_mfa_registration_date, is_admin, admin_role, last_sync
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP)
      ON CONFLICT (client_id, user_id) DO UPDATE SET
        display_name = EXCLUDED.display_name,
        user_principal_name = EXCLUDED.user_principal_name,
        account_enabled = EXCLUDED.account_enabled,
        has_mfa = EXCLUDED.has_mfa,
        mfa_methods = EXCLUDED.mfa_methods,
        latest_mfa_registration_date = EXCLUDED.latest_mfa_registration_date,
        is_admin = EXCLUDED.is_admin,
        admin_role = EXCLUDED.admin_role,
        last_sync = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
    `, [clientId, enriched.id, enriched.displayName, enriched.userPrincipalName, enriched.accountEnabled !== false, Boolean(enriched.hasMFA), JSON.stringify(enriched.mfaMethods || []), enriched.lastMfaEnrollmentDate || null, Boolean(enriched.isAdmin), enriched.adminRole]);
    saved += 1;
  }
  return saved;
}

function mapAzureMfaRows(rows) {
  return (rows || []).map(row => {
    const methods = (() => {
      const raw = row.mfa_methods;
      if (Array.isArray(raw)) return raw;
      if (raw && typeof raw === "object") return Object.values(raw);
      if (typeof raw === "string") {
        try {
          const parsed = JSON.parse(raw);
          return Array.isArray(parsed) ? parsed : [];
        } catch {
          return [];
        }
      }
      return [];
    })();
    const hasMfa = row.has_mfa === true || row.has_mfa === "t" || row.has_mfa === "true" || userHasRealMfa(methods);
    const isAdmin = row.is_admin === true || row.is_admin === "t" || row.is_admin === "true";
    return {
      id: row.id,
      displayName: row.display_name,
      userPrincipalName: row.user_principal_name,
      email: row.user_principal_name,
      accountEnabled: row.account_enabled,
      has_mfa: hasMfa,
      hasMfa,
      hasMFA: hasMfa,
      mfa_methods: methods,
      mfaMethods: methods,
      latestMfaRegistrationDate: row.latest_mfa_registration_date,
      is_admin: isAdmin,
      isAdmin,
      admin_role: row.admin_role || null,
      adminRole: row.admin_role || null
    };
  });
}

async function queryAzureMfaRows(clientId) {
  const result = await pool.query(`
    SELECT
      user_id as id,
      display_name,
      user_principal_name,
      account_enabled,
      has_mfa,
      mfa_methods,
      latest_mfa_registration_date,
      is_admin,
      admin_role,
      last_sync
    FROM v_b_clients_c_azure_mfa
    WHERE client_id = $1
    ORDER BY display_name ASC
  `, [clientId]);
  return result.rows;
}

function mfaRowsLookIncomplete(rows) {
  if (!rows?.length) return true;
  const newest = rows.reduce((max, row) => {
    const stamp = row.last_sync ? new Date(row.last_sync).getTime() : 0;
    return Number.isFinite(stamp) && stamp > max ? stamp : max;
  }, 0);
  const recent = newest > 0 && Date.now() - newest < 6 * 60 * 60 * 1000;
  const allEmpty = rows.every(row => {
    const methods = mapAzureMfaRows([row])[0]?.mfaMethods || [];
    const hasMfa = row.has_mfa === true || row.has_mfa === "t" || row.has_mfa === "true";
    const isAdmin = row.is_admin === true || row.is_admin === "t" || row.is_admin === "true";
    return !hasMfa && !isAdmin && methods.length === 0;
  });
  return allEmpty && !recent;
}

router.get("/test", verifyJWT, async (req, res) => {
  try {
    const clientId = req.query.clientId ? parseInt(req.query.clientId) : null;
    let credentials = null;
    if (clientId) {
      credentials = await getClientOffice365Credentials(clientId, office365CredentialSelector(req));
      if (!credentials) {
        return res.status(400).json({
          success: false,
          error: `Azure configuration not found for client ${clientId}. Please configure Azure credentials specific to this client.`
        });
      }
    } else {
      const settings = await getOffice365Settings();
      if (settings && settings.tenant_id && settings.client_id && settings.client_secret) {
        credentials = {
          tenantId: settings.tenant_id,
          clientId: settings.client_id,
          clientSecret: settings.client_secret
        };
      }
    }
    if (!credentials) {
      return res.status(400).json({
        success: false,
        error: "Office 365 settings not configured. Please configure tenant_id, client_id and client_secret."
      });
    }
    const accessToken = await getMicrosoftGraphToken(credentials.tenantId, credentials.clientId, credentials.clientSecret);
    const orgInfo = await callMicrosoftGraph("/organization", accessToken);
    res.json({
      success: true,
      message: "Successfully connected to Microsoft Graph API",
      organization: orgInfo.value?.[0]?.displayName || "Organisation inconnue"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || "Error testing connection"
    });
  }
});
router.get("/licences", verifyJWT, async (req, res) => {
  try {
    const clientId = req.query.clientId ? parseInt(req.query.clientId) : null;
    let credentials = null;
    if (clientId) {
      credentials = await getClientOffice365Credentials(clientId, office365CredentialSelector(req));
      if (!credentials) {
        return res.status(400).json({
          success: false,
          error: `Azure configuration not found for client ${clientId}. Please configure Azure credentials specific to this client.`
        });
      }
    } else {
      if (!credentials) {
        const settings = await getOffice365Settings();
        if (settings && settings.tenant_id && settings.client_id && settings.client_secret) {
          credentials = {
            tenantId: settings.tenant_id,
            clientId: settings.client_id,
            clientSecret: settings.client_secret
          };
        }
      }
    }
    if (!credentials) {
      return res.status(400).json({
        success: false,
        error: "Office 365 settings not configured"
      });
    }
    const accessToken = await getMicrosoftGraphToken(credentials.tenantId, credentials.clientId, credentials.clientSecret);
    const subscribedSkus = await callMicrosoftGraph("/subscribedSkus", accessToken);
    const licences = subscribedSkus.value.map(sku => {
      const consumed = sku.consumedUnits || 0;
      const total = sku.prepaidUnits?.enabled || 0;
      const available = Math.max(0, total - consumed);
      return {
        nom: sku.skuPartNumber || sku.displayName || "Licence inconnue",
        total: total,
        utilisees: consumed,
        disponibles: available,
        skuId: sku.skuId,
        displayName: sku.displayName,
        servicePlans: sku.servicePlans || []
      };
    });
    res.json({
      success: true,
      licences: licences
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || "Error retrieving licenses"
    });
  }
});
router.get("/users", verifyJWT, async (req, res) => {
  try {
    const clientId = req.query.clientId ? parseInt(req.query.clientId) : null;
    let credentials = null;
    if (clientId) {
      credentials = await getClientOffice365Credentials(clientId, office365CredentialSelector(req));
    }
    if (!credentials) {
      const settings = await getOffice365Settings();
      if (settings && settings.tenant_id && settings.client_id && settings.client_secret) {
        credentials = {
          tenantId: settings.tenant_id,
          clientId: settings.client_id,
          clientSecret: settings.client_secret
        };
      }
    }
    if (!credentials) {
      return res.status(400).json({
        success: false,
        error: "Office 365 settings not configured"
      });
    }
    const accessToken = await getMicrosoftGraphToken(credentials.tenantId, credentials.clientId, credentials.clientSecret);
    const pageSize = parseInt(req.query.pageSize) || 100;
    const skip = (parseInt(req.query.page) - 1) * pageSize || 0;
    let endpoint = `/users?$top=${pageSize}&$skip=${skip}&$select=displayName,mail,userPrincipalName,jobTitle,department,assignedLicenses`;
    if (req.query.filter) {
      endpoint += `&$filter=${encodeURIComponent(req.query.filter)}`;
    }
    const usersData = await callMicrosoftGraph(endpoint, accessToken);
    const users = usersData.value.map(user => {
      const licenseNames = user.assignedLicenses?.map(license => {
        return license.skuId;
      }) || [];
      return {
        name: user.displayName || user.userPrincipalName || "Unnamed user",
        email: user.mail || user.userPrincipalName || "",
        department: user.department || "",
        title: user.jobTitle || "",
        licenses: licenseNames.join(", "),
        userPrincipalName: user.userPrincipalName
      };
    });
    res.json({
      success: true,
      users: users,
      total: usersData["@odata.count"] || users.length,
      page: parseInt(req.query.page) || 1,
      pageSize: pageSize
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || "Error retrieving users"
    });
  }
});
router.get("/data", verifyJWT, async (req, res) => {
  try {
    const clientId = req.query.clientId ? parseInt(req.query.clientId) : null;
    let credentials = null;
    if (clientId) {
      credentials = await getClientOffice365Credentials(clientId, office365CredentialSelector(req));
      if (!credentials) {
        return res.status(400).json({
          success: false,
          error: `Azure configuration not found for client ${clientId}. Please configure Azure credentials specific to this client.`
        });
      }
    } else {
      const settings = await getOffice365Settings();
      if (settings && settings.tenant_id && settings.client_id && settings.client_secret) {
        credentials = {
          tenantId: settings.tenant_id,
          clientId: settings.client_id,
          clientSecret: settings.client_secret
        };
      }
    }
    if (!credentials) {
      return res.status(400).json({
        success: false,
        error: "Office 365 settings not configured"
      });
    }
    const accessToken = await getMicrosoftGraphToken(credentials.tenantId, credentials.clientId, credentials.clientSecret);
    const [subscribedSkus, usersData, activeUsersReport, signInsData, adoptionScore] = await Promise.all([callMicrosoftGraph("/subscribedSkus", accessToken), callMicrosoftGraph("/users?$select=displayName,mail,userPrincipalName,jobTitle,department,assignedLicenses,signInActivity,accountEnabled,createdDateTime", accessToken, {
      getAllPages: true
    }).catch(err => {
      return callMicrosoftGraph("/users?$select=displayName,mail,userPrincipalName,jobTitle,department,assignedLicenses,accountEnabled,createdDateTime", accessToken, {
        getAllPages: true
      });
    }), callMicrosoftGraph("/reports/getOffice365ActiveUserDetail(period='D90')", accessToken, {
      isReport: true
    }).catch(() => null), callMicrosoftGraph("/auditLogs/signIns?$top=2000&$orderby=createdDateTime desc", accessToken).catch(() => null)]);
    const skuIdToName = {};
    subscribedSkus.value.forEach(sku => {
      skuIdToName[sku.skuId] = sku.skuPartNumber || sku.displayName || "Licence inconnue";
    });
    const licences = subscribedSkus.value.filter(sku => {
      const total = sku.prepaidUnits?.enabled || 0;
      return total < 10000 && total > 0;
    }).map(sku => {
      const consumed = sku.consumedUnits || 0;
      const total = sku.prepaidUnits?.enabled || 0;
      const available = Math.max(0, total - consumed);
      return {
        nom: sku.skuPartNumber || sku.displayName || "Licence inconnue",
        total: total,
        utilisees: consumed,
        disponibles: available,
        skuId: sku.skuId,
        displayName: sku.displayName,
        servicePlans: sku.servicePlans || []
      };
    });
    const emailToLastLogin = {};
    const reportUpnKeys = ['User Principal Name', 'UserPrincipalName', 'User'];
    const reportDateKeys = ['Last Activity Date (UTC)', 'Last Activity Date', 'LastActivityDate'];
    const reportOtherDateKeys = ['Report Refresh Date', 'Exchange Last Activity Date', 'SharePoint Last Activity Date', 'OneDrive Last Activity Date', 'Teams Last Activity Date', 'Yammer Last Activity Date', 'Skype For Business Last Activity Date'];
    if (activeUsersReport && activeUsersReport.value) {
      activeUsersReport.value.forEach(row => {
        const email = (getReportRowValue(row, reportUpnKeys) || '').toString().trim();
        if (!email) return;
        let lastActivity = getReportRowValue(row, reportDateKeys);
        if (lastActivity != null && typeof lastActivity === 'string') lastActivity = lastActivity.trim();
        for (const key of reportOtherDateKeys) {
          const val = row[key];
          if (val) {
            const d = new Date(val);
            if (!isNaN(d.getTime())) {
              const current = lastActivity ? new Date(lastActivity) : null;
              if (!current || d > current) lastActivity = val;
            }
          }
        }
        if (email && lastActivity) {
          emailToLastLogin[email.toLowerCase()] = lastActivity;
        }
      });
    }
    const signInToLastLogin = {};
    if (signInsData && signInsData.value && Array.isArray(signInsData.value)) {
      signInsData.value.forEach(signIn => {
        if (!signIn.status || signIn.status.errorCode !== 0) return;
        const upn = (signIn.userPrincipalName || signIn.userId || '').toString().trim();
        if (!upn || !signIn.createdDateTime) return;
        if (!signInToLastLogin[upn.toLowerCase()]) signInToLastLogin[upn.toLowerCase()] = signIn.createdDateTime;
      });
    }
    const usersListData = Array.isArray(usersData?.value) ? usersData.value : [];
    const users = usersListData.map(user => {
      const licenseNames = user.assignedLicenses?.map(license => skuIdToName[license.skuId] || license.skuId).filter(Boolean).join(", ") || "";
      let lastLoginDate = null;
      if (user.signInActivity && user.signInActivity.lastSignInDateTime) {
        lastLoginDate = user.signInActivity.lastSignInDateTime;
      }
      if (lastLoginDate == null || lastLoginDate === '') {
        const userEmail = (user.mail || user.userPrincipalName || '').toString().toLowerCase().trim();
        const upn = (user.userPrincipalName || '').toString().toLowerCase().trim();
        lastLoginDate = emailToLastLogin[userEmail] || emailToLastLogin[upn] || signInToLastLogin[userEmail] || signInToLastLogin[upn];
      }
      if (lastLoginDate != null && lastLoginDate !== '') {
        const d = new Date(lastLoginDate);
        lastLoginDate = !isNaN(d.getTime()) ? d.toISOString() : null;
      } else {
        lastLoginDate = null;
      }
      const isServiceAccount = isLikelyServiceAccount(user.displayName, user.userPrincipalName, user.mail);
      return {
        name: user.displayName || user.userPrincipalName || "Unnamed user",
        email: user.mail || user.userPrincipalName || "",
        department: user.department || "",
        title: user.jobTitle || "",
        licenses: licenseNames,
        userPrincipalName: user.userPrincipalName,
        id: user.id || null,
        lastLoginDate,
        accountEnabled: user.accountEnabled !== false,
        createdDate: user.createdDateTime || null,
        isServiceAccount: !!isServiceAccount
      };
    });
    let adoptionScoreData = null;
    if (adoptionScore && adoptionScore.value) {
      const scoreEntry = Array.isArray(adoptionScore.value) ? adoptionScore.value[0] : adoptionScore.value;
      if (scoreEntry) {
        adoptionScoreData = {
          totalScore: parseInt(scoreEntry['Total Score'] || scoreEntry['TotalScore'] || scoreEntry.totalScore || scoreEntry.score || 0),
          maxScore: parseInt(scoreEntry['Max Score'] || scoreEntry['MaxScore'] || scoreEntry.maxScore || 700),
          peopleExperiences: parseInt(scoreEntry['People Experiences'] || scoreEntry['PeopleExperiences'] || scoreEntry.peopleExperiences || 0),
          technologyExperiences: parseInt(scoreEntry['Technology Experiences'] || scoreEntry['TechnologyExperiences'] || scoreEntry.technologyExperiences || 0),
          reportDate: scoreEntry['Report Date'] || scoreEntry['ReportDate'] || scoreEntry.reportDate || null
        };
      }
    }
    const payload = {
      success: true,
      licences: licences,
      users: users,
      adoptionScore: adoptionScoreData,
      lastUpdate: new Date().toISOString()
    };
    if (clientId) {
      try {
        const snapshotData = {
          tenantId: credentials.tenantId || null,
          licences,
          users,
          adoptionScore: adoptionScoreData,
          lastUpdate: payload.lastUpdate
        };
        await pool.query(`DELETE FROM v_b_clients_m_o365 
           WHERE client_id = $1 
             AND ($2::text IS NULL OR item_key = $2)`, [clientId, credentials.tenantId || null]);
        await pool.query(`INSERT INTO v_b_clients_m_o365 (client_id, item_key, name, data, is_active)
           VALUES ($1, $2, $3, $4, $5)`, [clientId, credentials.tenantId || null, 'Microsoft 365', snapshotData, true]);
      } catch (dbError) {
        console.error('Error saving Office 365 data to v_b_clients_m_o365:', dbError);
      }
    }
    res.json(payload);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || "Error retrieving data"
    });
  }
});
router.get("/exchange", verifyJWT, async (req, res) => {
  try {
    const clientId = req.query.clientId ? parseInt(req.query.clientId) : null;
    let credentials = null;
    if (clientId) {
      credentials = await getClientOffice365Credentials(clientId, office365CredentialSelector(req));
      if (!credentials) {
        return res.status(400).json({
          success: false,
          error: `Azure configuration not found for client ${clientId}. Please configure Azure credentials specific to this client.`
        });
      }
    } else {
      if (!credentials) {
        const settings = await getOffice365Settings();
        if (settings && settings.tenant_id && settings.client_id && settings.client_secret) {
          credentials = {
            tenantId: settings.tenant_id,
            clientId: settings.client_id,
            clientSecret: settings.client_secret
          };
        }
      }
    }
    if (!credentials) {
      return res.status(400).json({
        success: false,
        error: "Office 365 settings not configured"
      });
    }
    const accessToken = await getMicrosoftGraphToken(credentials.tenantId, credentials.clientId, credentials.clientSecret);
    const period = 'D90';
    const startDate = req.query.startDate ? new Date(req.query.startDate) : null;
    const endDate = req.query.endDate ? new Date(req.query.endDate) : null;
    const [emailActivity, emailAppUsage, mailboxUsage, emailActivityUserDetail, activeUsersReport, usersWithMailboxSettings] = await Promise.all([callMicrosoftGraph(`/reports/getEmailActivityCounts(period='${period}')`, accessToken, {
      isReport: true
    }).catch(() => null), callMicrosoftGraph(`/reports/getEmailAppUsageUserDetail(period='${period}')`, accessToken, {
      isReport: true
    }).catch(() => null), callMicrosoftGraph(`/reports/getMailboxUsageDetail(period='${period}')`, accessToken, {
      isReport: true
    }).catch(() => null), callMicrosoftGraph(`/reports/getEmailActivityUserDetail(period='${period}')`, accessToken, {
      isReport: true
    }).catch(() => null), callMicrosoftGraph(`/reports/getOffice365ActiveUserDetail(period='${period}')`, accessToken, {
      isReport: true
    }).catch(() => null), callMicrosoftGraph("/users?$select=id,displayName,mail,userPrincipalName", accessToken, {
      getAllPages: true
    }).catch(() => null)]);
    let totalSent = 0;
    let totalReceived = 0;
    let totalRead = 0;
    let totalMailboxSize = 0;
    let totalMailboxes = 0;
    let dailyActivity = [];
    if (emailActivity && emailActivity.value) {
      emailActivity.value.forEach(day => {
        const sent = parseInt(day.Send || day.send || day['Send Count'] || 0);
        const received = parseInt(day.Receive || day.receive || day['Receive Count'] || 0);
        const read = parseInt(day.Read || day.read || day['Read Count'] || 0);
        const date = day.ReportDate || day['Report Date'] || day.reportDate || day.date || '';
        const dayDate = new Date(date);
        if (startDate && endDate) {
          const dayDateOnly = new Date(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate());
          const startDateOnly = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
          const endDateOnly = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
          if (dayDateOnly >= startDateOnly && dayDateOnly <= endDateOnly) {
            totalSent += sent;
            totalReceived += received;
            totalRead += read;
          }
        } else {
          totalSent += sent;
          totalReceived += received;
          totalRead += read;
        }
        dailyActivity.push({
          date: date,
          sent: sent,
          received: received,
          read: read
        });
      });
      dailyActivity.sort((a, b) => {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        return dateA - dateB;
      });
    }
    const userQuotaMap = new Map();
    if (usersWithMailboxSettings && usersWithMailboxSettings.value) {
      usersWithMailboxSettings.value.forEach(user => {
        if (user.mailboxSettings && user.userPrincipalName) {
          const emailKey = user.userPrincipalName.toLowerCase();
          const quota = user.mailboxSettings.prohibitSendReceiveQuota || user.mailboxSettings.storageQuota || user.mailboxSettings.issueWarningQuota || null;
          userQuotaMap.set(emailKey, {
            displayName: user.displayName || user.mail || user.userPrincipalName.split('@')[0],
            email: user.userPrincipalName,
            quota: quota ? parseInt(quota) : null
          });
        }
      });
    }
    let totalItemCount = 0;
    let averageMailboxSize = 0;
    let averageItemCount = 0;
    const mailboxQuotas = [];
    if (mailboxUsage && mailboxUsage.value) {
      mailboxUsage.value.forEach(mailbox => {
        const storageUsed = parseInt(mailbox['Storage Used (Byte)'] || mailbox['Storage Used'] || mailbox.storageUsedInBytes || mailbox['StorageUsed'] || mailbox['StorageUsedInBytes'] || 0);
        let storageQuota = parseInt(mailbox['Storage Quota (Byte)'] || mailbox['Storage Quota'] || mailbox.storageQuotaInBytes || mailbox['StorageQuota'] || mailbox['StorageQuotaInBytes'] || 0);
        const itemCount = parseInt(mailbox['Item Count'] || mailbox.itemCount || mailbox['ItemCount'] || 0);
        const userPrincipalName = mailbox['User Principal Name'] || mailbox['UserPrincipalName'] || mailbox.userPrincipalName || 'Inconnu';
        const emailKey = userPrincipalName.toLowerCase();
        const userInfo = userQuotaMap.get(emailKey);
        const displayName = userInfo?.displayName || mailbox['Display Name'] || mailbox['DisplayName'] || mailbox.displayName || userPrincipalName.split('@')[0];
        if (storageQuota === 0 && userInfo?.quota) {
          storageQuota = userInfo.quota;
        }
        totalMailboxes++;
        totalMailboxSize += storageUsed;
        totalItemCount += itemCount;
        mailboxQuotas.push({
          displayName: displayName,
          user: displayName,
          email: userInfo?.email || userPrincipalName,
          storageUsed: storageUsed,
          storageQuota: storageQuota,
          usagePercent: storageQuota > 0 ? Math.round(storageUsed / storageQuota * 100) : 0,
          quotaPercent: storageQuota > 0 ? Math.round(storageUsed / storageQuota * 100) : 0,
          itemCount: itemCount
        });
      });
      if (totalMailboxes > 0) {
        averageMailboxSize = Math.round(totalMailboxSize / totalMailboxes);
        averageItemCount = Math.round(totalItemCount / totalMailboxes);
      }
      mailboxQuotas.sort((a, b) => b.storageUsed - a.storageUsed);
    }
    const daysCount = dailyActivity.length || 1;
    const avgSent = Math.round(totalSent / daysCount);
    const avgReceived = Math.round(totalReceived / daysCount);
    const avgRead = Math.round(totalRead / daysCount);
    const readRate = totalReceived > 0 ? (totalRead / totalReceived * 100).toFixed(1) : 0;
    const weeklyStats = {
      monday: {
        sent: 0,
        received: 0,
        read: 0,
        count: 0
      },
      tuesday: {
        sent: 0,
        received: 0,
        read: 0,
        count: 0
      },
      wednesday: {
        sent: 0,
        received: 0,
        read: 0,
        count: 0
      },
      thursday: {
        sent: 0,
        received: 0,
        read: 0,
        count: 0
      },
      friday: {
        sent: 0,
        received: 0,
        read: 0,
        count: 0
      },
      saturday: {
        sent: 0,
        received: 0,
        read: 0,
        count: 0
      },
      sunday: {
        sent: 0,
        received: 0,
        read: 0,
        count: 0
      }
    };
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    if (dailyActivity && dailyActivity.length > 0) {
      dailyActivity.forEach(day => {
        const date = new Date(day.date);
        if (!isNaN(date.getTime())) {
          const dayOfWeek = dayNames[date.getDay()];
          if (weeklyStats[dayOfWeek]) {
            weeklyStats[dayOfWeek].sent += day.sent || 0;
            weeklyStats[dayOfWeek].received += day.received || 0;
            weeklyStats[dayOfWeek].read += day.read || 0;
            weeklyStats[dayOfWeek].count++;
          }
        }
      });
    }
    const weeklyStatsFormatted = {
      lundi: {
        sent: weeklyStats.monday.count > 0 ? Math.round(weeklyStats.monday.sent / weeklyStats.monday.count) : 0,
        received: weeklyStats.monday.count > 0 ? Math.round(weeklyStats.monday.received / weeklyStats.monday.count) : 0,
        read: weeklyStats.monday.count > 0 ? Math.round(weeklyStats.monday.read / weeklyStats.monday.count) : 0
      },
      mardi: {
        sent: weeklyStats.tuesday.count > 0 ? Math.round(weeklyStats.tuesday.sent / weeklyStats.tuesday.count) : 0,
        received: weeklyStats.tuesday.count > 0 ? Math.round(weeklyStats.tuesday.received / weeklyStats.tuesday.count) : 0,
        read: weeklyStats.tuesday.count > 0 ? Math.round(weeklyStats.tuesday.read / weeklyStats.tuesday.count) : 0
      },
      mercredi: {
        sent: weeklyStats.wednesday.count > 0 ? Math.round(weeklyStats.wednesday.sent / weeklyStats.wednesday.count) : 0,
        received: weeklyStats.wednesday.count > 0 ? Math.round(weeklyStats.wednesday.received / weeklyStats.wednesday.count) : 0,
        read: weeklyStats.wednesday.count > 0 ? Math.round(weeklyStats.wednesday.read / weeklyStats.wednesday.count) : 0
      },
      jeudi: {
        sent: weeklyStats.thursday.count > 0 ? Math.round(weeklyStats.thursday.sent / weeklyStats.thursday.count) : 0,
        received: weeklyStats.thursday.count > 0 ? Math.round(weeklyStats.thursday.received / weeklyStats.thursday.count) : 0,
        read: weeklyStats.thursday.count > 0 ? Math.round(weeklyStats.thursday.read / weeklyStats.thursday.count) : 0
      },
      vendredi: {
        sent: weeklyStats.friday.count > 0 ? Math.round(weeklyStats.friday.sent / weeklyStats.friday.count) : 0,
        received: weeklyStats.friday.count > 0 ? Math.round(weeklyStats.friday.received / weeklyStats.friday.count) : 0,
        read: weeklyStats.friday.count > 0 ? Math.round(weeklyStats.friday.read / weeklyStats.friday.count) : 0
      },
      samedi: {
        sent: weeklyStats.saturday.count > 0 ? Math.round(weeklyStats.saturday.sent / weeklyStats.saturday.count) : 0,
        received: weeklyStats.saturday.count > 0 ? Math.round(weeklyStats.saturday.received / weeklyStats.saturday.count) : 0,
        read: weeklyStats.saturday.count > 0 ? Math.round(weeklyStats.saturday.read / weeklyStats.saturday.count) : 0
      },
      dimanche: {
        sent: weeklyStats.sunday.count > 0 ? Math.round(weeklyStats.sunday.sent / weeklyStats.sunday.count) : 0,
        received: weeklyStats.sunday.count > 0 ? Math.round(weeklyStats.sunday.received / weeklyStats.sunday.count) : 0,
        read: weeklyStats.sunday.count > 0 ? Math.round(weeklyStats.sunday.read / weeklyStats.sunday.count) : 0
      }
    };
    let topUsers = [];
    let allUsersMap = new Map();
    if (usersWithMailboxSettings && usersWithMailboxSettings.value) {
      usersWithMailboxSettings.value.forEach(u => {
        const emailKey = (u.userPrincipalName || u.mail || '').toLowerCase();
        if (emailKey) {
          allUsersMap.set(emailKey, {
            displayName: u.displayName || u.mail || u.userPrincipalName,
            userPrincipalName: u.userPrincipalName || u.mail
          });
        }
      });
    }
    if (emailActivityUserDetail && emailActivityUserDetail.value) {
      const userMap = new Map();
      emailActivityUserDetail.value.forEach(user => {
        const identifier = user['User Principal Name'] || user['UserPrincipalName'] || user.userPrincipalName || '';
        const displayName = user['Display Name'] || user['DisplayName'] || user.displayName || '';
        const sent = parseInt(user['Send Count'] || user['Send'] || user.send || user.sendCount || 0);
        const received = parseInt(user['Receive Count'] || user['Receive'] || user.receive || user.receiveCount || 0);
        const read = parseInt(user['Read Count'] || user['Read'] || user.read || user.readCount || 0);
        const isHashedId = /^[0-9A-F]{32,}$/i.test(identifier);
        if (isHashedId) {
          let mappedUser = null;
          if (activeUsersReport && activeUsersReport.value) {
            const matched = activeUsersReport.value.find(activeUser => {
              const activeUserId = activeUser['User Id'] || activeUser['UserId'] || '';
              return activeUserId === identifier || activeUserId.toLowerCase() === identifier.toLowerCase();
            });
            if (matched) {
              const matchedEmail = matched['User Principal Name'] || matched['UserPrincipalName'] || '';
              if (matchedEmail && matchedEmail.includes('@')) {
                const userInfo = allUsersMap.get(matchedEmail.toLowerCase());
                if (userInfo) {
                  mappedUser = userInfo;
                }
              }
            }
          }
          if (!userMap.has(identifier)) {
            userMap.set(identifier, {
              displayName: mappedUser?.displayName || displayName || `User ${identifier.substring(0, 8)}...`,
              userPrincipalName: mappedUser?.userPrincipalName || identifier,
              email: mappedUser?.userPrincipalName || identifier,
              sent: 0,
              received: 0,
              read: 0,
              total: 0
            });
          }
          const userStat = userMap.get(identifier);
          userStat.sent += sent;
          userStat.received += received;
          userStat.read += read;
          userStat.total = userStat.sent + userStat.received;
        } else if (identifier.includes('@')) {
          const emailKey = identifier.toLowerCase();
          if (!userMap.has(emailKey)) {
            const userInfo = allUsersMap.get(emailKey) || {
              displayName: displayName || emailKey.split('@')[0],
              userPrincipalName: identifier
            };
            userMap.set(emailKey, {
              displayName: userInfo.displayName,
              userPrincipalName: userInfo.userPrincipalName,
              email: identifier,
              sent: 0,
              received: 0,
              read: 0,
              total: 0
            });
          }
          const userStat = userMap.get(emailKey);
          userStat.sent += sent;
          userStat.received += received;
          userStat.read += read;
          userStat.total = userStat.sent + userStat.received;
        }
      });
      topUsers = Array.from(userMap.values()).filter(user => user.total > 0).sort((a, b) => b.total - a.total).slice(0, 5).map(user => ({
        name: user.displayName || user.email.split('@')[0] || user.email,
        email: user.userPrincipalName || user.email,
        sent: user.sent,
        received: user.received,
        read: user.read,
        total: user.total
      }));
    }
    res.json({
      success: true,
      emailActivity: {
        sent: totalSent,
        received: totalReceived,
        read: totalRead,
        period: period,
        dailyActivity: dailyActivity,
        averages: {
          sent: avgSent,
          received: avgReceived,
          read: avgRead
        },
        readRate: parseFloat(readRate),
        weeklyStats: weeklyStatsFormatted
      },
      mailboxes: {
        total: totalMailboxes,
        totalSize: formatBytes(totalMailboxSize),
        averageSize: formatBytes(averageMailboxSize),
        totalItems: totalItemCount,
        averageItems: averageItemCount,
        quotas: mailboxQuotas
      },
      appUsage: emailAppUsage || null,
      topUsers: topUsers,
      lastUpdate: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || "Error retrieving Exchange data"
    });
  }
});
router.get("/teams", verifyJWT, async (req, res) => {
  try {
    const clientId = req.query.clientId ? parseInt(req.query.clientId) : null;
    let credentials = null;
    if (clientId) {
      credentials = await getClientOffice365Credentials(clientId, office365CredentialSelector(req));
      if (!credentials) {
        return res.status(400).json({
          success: false,
          error: `Azure configuration not found for client ${clientId}. Please configure Azure credentials specific to this client.`
        });
      }
    } else {
      const settings = await getOffice365Settings();
      if (settings && settings.tenant_id && settings.client_id && settings.client_secret) {
        credentials = {
          tenantId: settings.tenant_id,
          clientId: settings.client_id,
          clientSecret: settings.client_secret
        };
      }
    }
    if (!credentials) {
      return res.status(400).json({
        success: false,
        error: "Office 365 settings not configured"
      });
    }
    const accessToken = await getMicrosoftGraphToken(credentials.tenantId, credentials.clientId, credentials.clientSecret);
    const period = 'D90';
    const startDate = req.query.startDate ? new Date(req.query.startDate) : null;
    const endDate = req.query.endDate ? new Date(req.query.endDate) : null;
    const parseNumber = value => {
      if (value === null || value === undefined) return 0;
      if (typeof value === "number") {
        return isNaN(value) ? 0 : value;
      }
      if (typeof value === "string") {
        const cleaned = value.replace(/,/g, "").trim();
        if (cleaned === "") return 0;
        const parsed = parseFloat(cleaned);
        return isNaN(parsed) ? 0 : parsed;
      }
      return 0;
    };
    const normalizeBoolean = value => {
      if (typeof value === "boolean") return value;
      if (typeof value === "string") {
        const normalized = value.trim().toLowerCase();
        return normalized === "true" || normalized === "yes" || normalized === "1";
      }
      if (typeof value === "number") return value === 1;
      return false;
    };
    const getDateKey = value => {
      if (!value) return null;
      try {
        const date = new Date(value);
        if (isNaN(date.getTime())) return null;
        return date.toISOString().split("T")[0];
      } catch {
        return null;
      }
    };
    const [teams, teamsActivity, teamsDeviceUsage, callRecords] = await Promise.all([callMicrosoftGraph("/teams", accessToken, {
      getAllPages: true
    }).catch(err => {
      return null;
    }), callMicrosoftGraph(`/reports/getTeamsUserActivityUserDetail(period='${period}')`, accessToken, {
      isReport: true
    }).catch(err => {
      return null;
    }), callMicrosoftGraph(`/reports/getTeamsDeviceUsageUserDetail(period='${period}')`, accessToken, {
      isReport: true
    }).catch(err => {
      return null;
    }), callMicrosoftGraph("/communications/callRecords", accessToken, {
      getAllPages: true
    }).catch(err => {
      return null;
    })]);
    let totalTeams = 0;
    let activeUsers = new Set();
    let totalMessages = 0;
    let totalMeetings = 0;
    let totalCalls = 0;
    let totalCallDuration = 0;
    let teamChatMessages = 0;
    let privateChatMessages = 0;
    let urgentMessages = 0;
    let postMessages = 0;
    let replyMessages = 0;
    let meetingsOrganized = 0;
    let meetingsAttended = 0;
    let adHocMeetingsOrganized = 0;
    let adHocMeetingsAttended = 0;
    let scheduledOneTimeOrganized = 0;
    let scheduledOneTimeAttended = 0;
    let scheduledRecurringOrganized = 0;
    let scheduledRecurringAttended = 0;
    let callCountFromActivity = 0;
    let callDurationFromActivity = 0;
    let audioDurationSeconds = 0;
    let videoDurationSeconds = 0;
    let screenShareDurationSeconds = 0;
    let hasOtherActionCount = 0;
    let licensedUsers = 0;
    let deletedUsers = 0;
    let reportPeriod = null;
    let reportRefreshDate = null;
    const dailyActivityMap = new Map();
    if (teams && teams.value) {
      totalTeams = teams.value.length;
    }
    const teamMemberCounts = new Map();
    const teamChannelCounts = new Map();
    if (teams && teams.value && teams.value.length > 0) {
      const teamsForCounts = teams.value.slice(0, 50);
      try {
        await Promise.all(teamsForCounts.map(async team => {
          try {
            const [members, channels] = await Promise.all([callMicrosoftGraph(`/teams/${team.id}/members`, accessToken, {
              getAllPages: true
            }).catch(() => null), callMicrosoftGraph(`/teams/${team.id}/channels`, accessToken, {
              getAllPages: true
            }).catch(() => null)]);
            teamMemberCounts.set(team.id, Array.isArray(members?.value) ? members.value.length : 0);
            teamChannelCounts.set(team.id, Array.isArray(channels?.value) ? channels.value.length : 0);
          } catch {
            teamMemberCounts.set(team.id, 0);
            teamChannelCounts.set(team.id, 0);
          }
        }));
      } catch {}
    }
    if (teamsActivity && teamsActivity.value) {
      if (teamsActivity.value.length > 0) {
        reportRefreshDate = teamsActivity.value[0]['Report Refresh Date'] || teamsActivity.value[0]['ReportRefreshDate'] || null;
        reportPeriod = teamsActivity.value[0]['Report Period'] || teamsActivity.value[0]['ReportPeriod'] || null;
      }
      let entriesMatchingPeriod = 0;
      teamsActivity.value.forEach(user => {
        const userPrincipalName = user['User Principal Name'] || user['UserPrincipalName'] || user.userPrincipalName || user['User'] || user['User Name'] || '';
        const lastActivityDate = user['Last Activity Date'] || user['LastActivityDate'] || user.lastActivityDate || null;
        const dateKey = getDateKey(lastActivityDate);
        const isLicensed = normalizeBoolean(user['Is Licensed'] || user['IsLicensed'] || user.isLicensed);
        const isDeleted = normalizeBoolean(user['Is Deleted'] || user['IsDeleted'] || user.isDeleted);
        const hasOtherAction = normalizeBoolean(user['Has Other Action'] || user['HasOtherAction'] || user.hasOtherAction);
        if (isLicensed) licensedUsers++;
        if (isDeleted) deletedUsers++;
        if (hasOtherAction) hasOtherActionCount++;
        let matchesMonitoringPeriod = true;
        if (startDate && endDate) {
          if (!lastActivityDate || lastActivityDate === '') {
            matchesMonitoringPeriod = false;
          } else {
            try {
              const activityDate = new Date(lastActivityDate);
              matchesMonitoringPeriod = activityDate >= startDate && activityDate <= endDate;
            } catch {
              matchesMonitoringPeriod = false;
            }
          }
        }
        if (matchesMonitoringPeriod) {
          entriesMatchingPeriod++;
        }
        const teamChatMessageCount = parseNumber(user['Team Chat Message Count'] || user['TeamChatMessageCount'] || user['Team Chat Messages'] || user['TeamChatMessages'] || user.teamChatMessageCount || user.teamChatMessages || user['Team Chat'] || user['TeamChat']);
        const privateChatMessageCount = parseNumber(user['Private Chat Message Count'] || user['PrivateChatMessageCount'] || user['Private Chat Messages'] || user['PrivateChatMessages'] || user.privateChatMessageCount || user.privateChatMessages || user['Private Chat'] || user['PrivateChat']);
        const meetingCount = parseNumber(user['Meeting Count'] || user['MeetingCount'] || user['Meetings'] || user.meetingCount || user.meetings || user['Total Meetings'] || user['TotalMeetings'] || user['Meeting']);
        const meetingsOrganizedCount = parseNumber(user['Meetings Organized Count'] || user['MeetingsOrganizedCount'] || user['Meetings Organized'] || user.meetingsOrganized || user['Organized Meetings']);
        const meetingsAttendedCount = parseNumber(user['Meetings Attended Count'] || user['MeetingsAttendedCount'] || user['Meetings Attended'] || user.meetingsAttended || user['Attended Meetings']);
        const adHocMeetingsOrganizedCount = parseNumber(user['Ad Hoc Meetings Organized Count'] || user['AdHocMeetingsOrganizedCount'] || user['Ad Hoc Meetings Organized'] || user['AdHocMeetingsOrganized'] || user.adHocMeetingsOrganized);
        const adHocMeetingsAttendedCount = parseNumber(user['Ad Hoc Meetings Attended Count'] || user['AdHocMeetingsAttendedCount'] || user['Ad Hoc Meetings Attended'] || user['AdHocMeetingsAttended'] || user.adHocMeetingsAttended);
        const scheduledOneTimeOrganizedCount = parseNumber(user['Scheduled One-time Meetings Organized Count'] || user['Scheduled One-time Meetings Organized'] || user['ScheduledOnetimeMeetingsOrganizedCount'] || user['ScheduledOneTimeMeetingsOrganized'] || user.scheduledOneTimeMeetingsOrganized);
        const scheduledOneTimeAttendedCount = parseNumber(user['Scheduled One-time Meetings Attended Count'] || user['Scheduled One-time Meetings Attended'] || user['ScheduledOnetimeMeetingsAttendedCount'] || user['ScheduledOneTimeMeetingsAttended'] || user.scheduledOneTimeMeetingsAttended);
        const scheduledRecurringOrganizedCount = parseNumber(user['Scheduled Recurring Meetings Organized Count'] || user['Scheduled Recurring Meetings Organized'] || user['ScheduledRecurringMeetingsOrganizedCount'] || user['ScheduledRecurringMeetingsOrganized'] || user.scheduledRecurringMeetingsOrganized);
        const scheduledRecurringAttendedCount = parseNumber(user['Scheduled Recurring Meetings Attended Count'] || user['Scheduled Recurring Meetings Attended'] || user['ScheduledRecurringMeetingsAttendedCount'] || user['ScheduledRecurringMeetingsAttended'] || user.scheduledRecurringMeetingsAttended);
        const urgentMessagesCount = parseNumber(user['Urgent Messages'] || user['UrgentMessages'] || user.urgentMessages);
        const postMessagesCount = parseNumber(user['Post Messages'] || user['PostMessages'] || user.postMessages);
        const replyMessagesCount = parseNumber(user['Reply Messages'] || user['ReplyMessages'] || user.replyMessages);
        const callCount = parseNumber(user['Call Count'] || user['Calls'] || user['Total Calls'] || user['CallCount'] || user.callCount);
        const audioDuration = parseNumber(user['Audio Duration In Seconds'] || user['Audio Duration'] || user['AudioDurationInSeconds'] || user.audioDurationInSeconds);
        const videoDuration = parseNumber(user['Video Duration In Seconds'] || user['Video Duration'] || user['VideoDurationInSeconds'] || user.videoDurationInSeconds);
        const screenShareDuration = parseNumber(user['Screen Share Duration In Seconds'] || user['Screen Share Duration'] || user['ScreenShareDurationInSeconds'] || user.screenShareDurationInSeconds);
        if (dateKey) {
          if (!dailyActivityMap.has(dateKey)) {
            dailyActivityMap.set(dateKey, {
              date: dateKey,
              channelMessages: 0,
              chatMessages: 0,
              oneOnOneCalls: 0,
              totalMeetings: 0
            });
          }
          const dailyEntry = dailyActivityMap.get(dateKey);
          dailyEntry.channelMessages += teamChatMessageCount;
          dailyEntry.chatMessages += privateChatMessageCount;
          dailyEntry.oneOnOneCalls += callCount;
          dailyEntry.totalMeetings += meetingCount;
        }
        if (!matchesMonitoringPeriod) {
          return;
        }
        teamChatMessages += teamChatMessageCount;
        privateChatMessages += privateChatMessageCount;
        urgentMessages += urgentMessagesCount;
        postMessages += postMessagesCount;
        replyMessages += replyMessagesCount;
        totalMessages += teamChatMessageCount + privateChatMessageCount;
        totalMeetings += meetingCount;
        meetingsOrganized += meetingsOrganizedCount;
        meetingsAttended += meetingsAttendedCount;
        adHocMeetingsOrganized += adHocMeetingsOrganizedCount;
        adHocMeetingsAttended += adHocMeetingsAttendedCount;
        scheduledOneTimeOrganized += scheduledOneTimeOrganizedCount;
        scheduledOneTimeAttended += scheduledOneTimeAttendedCount;
        scheduledRecurringOrganized += scheduledRecurringOrganizedCount;
        scheduledRecurringAttended += scheduledRecurringAttendedCount;
        callCountFromActivity += callCount;
        audioDurationSeconds += audioDuration;
        videoDurationSeconds += videoDuration;
        screenShareDurationSeconds += screenShareDuration;
        callDurationFromActivity += audioDuration + videoDuration + screenShareDuration;
        if (teamChatMessageCount > 0 || privateChatMessageCount > 0 || meetingCount > 0 || callCount > 0) {
          if (userPrincipalName) {
            activeUsers.add(userPrincipalName);
          }
        }
      });
      if (startDate && endDate) {}
    }
    if (callRecords && callRecords.value && callRecords.value.length > 0) {
      let filteredCalls = callRecords.value;
      if (startDate && endDate) {
        filteredCalls = callRecords.value.filter(call => {
          const callStartDate = call.startDateTime || call.startDate;
          if (!callStartDate) return false;
          try {
            const callDate = new Date(callStartDate);
            return callDate >= startDate && callDate <= endDate;
          } catch {
            return false;
          }
        });
      }
      totalCalls = filteredCalls.length;
      filteredCalls.forEach(call => {
        let callDurationSeconds = 0;
        if (call.startDateTime && call.endDateTime) {
          try {
            const startDate = new Date(call.startDateTime);
            const endDate = new Date(call.endDateTime);
            if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime()) && endDate > startDate) {
              callDurationSeconds = Math.floor((endDate - startDate) / 1000);
            }
          } catch (e) {}
        }
        if (callDurationSeconds === 0) {
          const duration = call.duration || call.callDuration || call.durationInSeconds || call.callDurationInSeconds || 0;
          if (typeof duration === 'string' && duration.startsWith('PT')) {
            const hoursMatch = duration.match(/(\d+)H/);
            const minutesMatch = duration.match(/(\d+)M/);
            const secondsMatch = duration.match(/(\d+)S/);
            const hours = hoursMatch ? parseInt(hoursMatch[1]) : 0;
            const minutes = minutesMatch ? parseInt(minutesMatch[1]) : 0;
            const seconds = secondsMatch ? parseInt(secondsMatch[1]) : 0;
            callDurationSeconds = hours * 3600 + minutes * 60 + seconds;
          } else {
            callDurationSeconds = parseInt(duration || 0);
          }
        }
        totalCallDuration += callDurationSeconds;
      });
    } else {
      if (totalCalls === 0) {}
    }
    const effectiveCallCount = totalCalls > 0 ? totalCalls : callCountFromActivity;
    const effectiveCallDuration = totalCallDuration > 0 ? totalCallDuration : callDurationFromActivity;
    const formatDuration = seconds => {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor(seconds % 3600 / 60);
      return `${hours}h ${minutes}m`;
    };
    const callsStats = {
      total: effectiveCallCount,
      totalDuration: formatDuration(effectiveCallDuration),
      averageDuration: effectiveCallCount > 0 ? formatDuration(Math.floor(effectiveCallDuration / effectiveCallCount)) : "0h 0m",
      audioDuration: formatDuration(audioDurationSeconds),
      videoDuration: formatDuration(videoDurationSeconds),
      screenShareDuration: formatDuration(screenShareDurationSeconds),
      totalDurationSeconds: effectiveCallDuration,
      audioDurationSeconds,
      videoDurationSeconds,
      screenShareDurationSeconds
    };
    let dailyActivity = Array.from(dailyActivityMap.values()).sort((a, b) => new Date(a.date) - new Date(b.date));
    const messagesStats = {
      total: teamChatMessages + privateChatMessages,
      teamChat: teamChatMessages,
      privateChat: privateChatMessages,
      urgent: urgentMessages,
      posts: postMessages,
      replies: replyMessages
    };
    const meetingsStats = {
      total: totalMeetings,
      organized: meetingsOrganized,
      attended: meetingsAttended,
      adHoc: {
        organized: adHocMeetingsOrganized,
        attended: adHocMeetingsAttended
      },
      scheduledOneTime: {
        organized: scheduledOneTimeOrganized,
        attended: scheduledOneTimeAttended
      },
      scheduledRecurring: {
        organized: scheduledRecurringOrganized,
        attended: scheduledRecurringAttended
      }
    };
    const usageStats = {
      activeUsers: activeUsers.size,
      licensedUsers,
      deletedUsers,
      otherActions: hasOtherActionCount,
      reportPeriod,
      reportRefreshDate
    };
    const activityStats = {
      totalMessages: messagesStats.total,
      totalMeetings: meetingsStats.total,
      activeUsers: activeUsers.size,
      messages: messagesStats,
      meetings: meetingsStats,
      calls: callsStats,
      usage: usageStats
    };
    const licensedActivity = dailyActivity.length > 0 ? {
      totalChannelMessages: teamChatMessages,
      totalChatMessages: privateChatMessages,
      totalMeetings,
      totalCalls: callCountFromActivity,
      dailyActivity
    } : null;
    res.json({
      success: true,
      teams: {
        total: totalTeams,
        activeUsers: activeUsers.size,
        teamsList: teams?.value?.slice(0, 50).map(team => ({
          id: team.id,
          displayName: team.displayName,
          description: team.description,
          memberCount: teamMemberCounts.get(team.id) ?? 0,
          channelCount: teamChannelCounts.get(team.id) ?? 0
        })) || []
      },
      activity: activityStats,
      calls: callsStats,
      licensedActivity,
      lastUpdate: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || "Error retrieving Teams data"
    });
  }
});
router.get("/onedrive", verifyJWT, async (req, res) => {
  try {
    const clientId = req.query.clientId ? parseInt(req.query.clientId) : null;
    let credentials = null;
    if (clientId) {
      credentials = await getClientOffice365Credentials(clientId, office365CredentialSelector(req));
      if (!credentials) {
        return res.status(400).json({
          success: false,
          error: `Azure configuration not found for client ${clientId}. Please configure Azure credentials specific to this client.`
        });
      }
    } else {
      const settings = await getOffice365Settings();
      if (settings && settings.tenant_id && settings.client_id && settings.client_secret) {
        credentials = {
          tenantId: settings.tenant_id,
          clientId: settings.client_id,
          clientSecret: settings.client_secret
        };
      }
    }
    if (!credentials) {
      return res.status(400).json({
        success: false,
        error: "Office 365 settings not configured"
      });
    }
    const accessToken = await getMicrosoftGraphToken(credentials.tenantId, credentials.clientId, credentials.clientSecret);
    const period = 'D90';
    const startDate = req.query.startDate ? new Date(req.query.startDate) : null;
    const endDate = req.query.endDate ? new Date(req.query.endDate) : null;
    const [onedriveUsage, onedriveActivity, onedriveActivityFileCounts] = await Promise.all([callMicrosoftGraph(`/reports/getOneDriveUsageAccountDetail(period='${period}')`, accessToken, {
      isReport: true
    }).catch(() => null), callMicrosoftGraph(`/reports/getOneDriveActivityUserDetail(period='${period}')`, accessToken, {
      isReport: true
    }).catch(() => null), callMicrosoftGraph(`/reports/getOneDriveActivityFileCounts(period='${period}')`, accessToken, {
      isReport: true
    }).catch(() => null)]);
    let totalStorageUsed = 0;
    let totalFiles = 0;
    let totalSharedFiles = 0;
    let totalExternalShares = 0;
    let usersNearQuota = [];
    let totalStorage = 0;
    if (onedriveUsage && onedriveUsage.value) {
      onedriveUsage.value.forEach(account => {
        const storageUsed = parseInt(account['Storage Used (Byte)'] || account.storageUsedInBytes || account['Storage Used'] || 0);
        const fileCount = parseInt(account['File Count'] || account.fileCount || account['Files'] || 0);
        const ownerName = account['Owner Display Name'] || account.ownerDisplayName || account['Owner'] || '';
        const ownerEmail = account['Owner Principal Name'] || account.ownerPrincipalName || account['Owner Email'] || '';
        totalStorageUsed += storageUsed;
        totalFiles += fileCount;
        totalStorage += storageUsed;
        const quotaBytes = 1024 * 1024 * 1024 * 1024;
        const usagePercent = storageUsed / quotaBytes * 100;
        if (usagePercent >= 90) {
          usersNearQuota.push({
            name: ownerName,
            email: ownerEmail,
            usagePercent: Math.round(usagePercent),
            used: formatBytes(storageUsed),
            files: fileCount
          });
        }
      });
    }
    let filteredActivity = onedriveActivity?.value || [];
    if (onedriveActivity && onedriveActivity.value && startDate && endDate) {
      filteredActivity = onedriveActivity.value.filter(activity => {
        const activityDate = activity['Last Activity Date'] || activity['LastActivityDate'] || activity['Report Date'] || activity['ReportDate'] || activity.lastActivityDate || activity.reportDate;
        if (!activityDate || activityDate === '') return false;
        try {
          const date = new Date(activityDate);
          const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
          const startDateOnly = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
          const endDateOnly = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
          return dateOnly >= startDateOnly && dateOnly <= endDateOnly;
        } catch {
          return false;
        }
      });
    }
    if (filteredActivity.length > 0) {
      filteredActivity.forEach(activity => {
        const sharedExternally = activity['Shared Externally'] || activity.sharedExternally || 'False';
        const sharedCount = parseInt(activity['Shared Count'] || activity.sharedCount || activity['Shares'] || 0);
        if (sharedExternally === 'True' || sharedExternally === true) {
          totalExternalShares += sharedCount;
        }
        totalSharedFiles += sharedCount;
      });
    }
    const filesByActivityType = {
      viewedOrEdited: 0,
      synced: 0,
      sharedInternally: 0,
      sharedExternally: 0
    };
    let filteredFileCounts = onedriveActivityFileCounts?.value || [];
    if (onedriveActivityFileCounts && onedriveActivityFileCounts.value && startDate && endDate) {
      filteredFileCounts = onedriveActivityFileCounts.value.filter(entry => {
        const reportDate = entry['Report Date'] || entry['ReportDate'] || entry['Date'] || entry.reportDate || entry.date;
        if (!reportDate || reportDate === '') return false;
        try {
          const date = new Date(reportDate);
          const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
          const startDateOnly = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
          const endDateOnly = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
          return dateOnly >= startDateOnly && dateOnly <= endDateOnly;
        } catch {
          return false;
        }
      });
    }
    if (filteredFileCounts.length > 0) {
      filteredFileCounts.forEach(entry => {
        const viewedOrEdited = parseInt(entry['Viewed Or Edited File Count'] || entry['Viewed or Edited File Count'] || entry['ViewedOrEditedFileCount'] || entry['Viewed Or Edited'] || entry.viewedOrEdited || 0);
        const synced = parseInt(entry['Synced File Count'] || entry['SyncedFileCount'] || entry['Synced'] || entry.synced || 0);
        const sharedInternal = parseInt(entry['Shared Internally File Count'] || entry['SharedInternallyFileCount'] || entry['Shared Internally'] || entry.sharedInternally || 0);
        const sharedExternal = parseInt(entry['Shared Externally File Count'] || entry['SharedExternallyFileCount'] || entry['Shared Externally'] || entry.sharedExternally || 0);
        filesByActivityType.viewedOrEdited += viewedOrEdited;
        filesByActivityType.synced += synced;
        filesByActivityType.sharedInternally += sharedInternal;
        filesByActivityType.sharedExternally += sharedExternal;
      });
    }
    res.json({
      success: true,
      storage: {
        totalUsed: formatBytes(totalStorageUsed),
        totalFiles: totalFiles,
        averagePerUser: onedriveUsage?.value?.length > 0 ? formatBytes(Math.floor(totalStorageUsed / onedriveUsage.value.length)) : "0 B"
      },
      sharing: {
        totalShared: totalSharedFiles,
        externalShares: totalExternalShares,
        internalShares: totalSharedFiles - totalExternalShares,
        byActivityType: {
          viewedOrEdited: filesByActivityType.viewedOrEdited,
          synced: filesByActivityType.synced,
          sharedInternally: filesByActivityType.sharedInternally,
          sharedExternally: filesByActivityType.sharedExternally
        }
      },
      usersNearQuota: usersNearQuota,
      lastUpdate: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || "Error retrieving OneDrive data"
    });
  }
});
router.get("/sharepoint", verifyJWT, async (req, res) => {
  try {
    const clientId = req.query.clientId ? parseInt(req.query.clientId) : null;
    let credentials = null;
    if (clientId) {
      credentials = await getClientOffice365Credentials(clientId, office365CredentialSelector(req));
      if (!credentials) {
        return res.status(400).json({
          success: false,
          error: `Azure configuration not found for client ${clientId}. Please configure Azure credentials specific to this client.`
        });
      }
    } else {
      const settings = await getOffice365Settings();
      if (settings && settings.tenant_id && settings.client_id && settings.client_secret) {
        credentials = {
          tenantId: settings.tenant_id,
          clientId: settings.client_id,
          clientSecret: settings.client_secret
        };
      }
    }
    if (!credentials) {
      return res.status(400).json({
        success: false,
        error: "Office 365 settings not configured"
      });
    }
    const accessToken = await getMicrosoftGraphToken(credentials.tenantId, credentials.clientId, credentials.clientSecret);
    const period = 'D90';
    const startDate = req.query.startDate ? new Date(req.query.startDate) : null;
    const endDate = req.query.endDate ? new Date(req.query.endDate) : null;
    const hasDateFilter = Boolean(startDate && endDate);
    const parseNumber = value => {
      if (value === null || value === undefined) return 0;
      if (typeof value === "number") {
        return isNaN(value) ? 0 : value;
      }
      if (typeof value === "string") {
        const cleaned = value.replace(/,/g, "").trim();
        if (cleaned === "") return 0;
        const parsed = parseFloat(cleaned);
        return isNaN(parsed) ? 0 : parsed;
      }
      return 0;
    };
    const [sharepointUsageDetail, sharepointSiteCounts, sharepointSites] = await Promise.all([callMicrosoftGraph(`/reports/getSharePointSiteUsageDetail(period='${period}')`, accessToken, {
      isReport: true
    }).catch(() => null), callMicrosoftGraph(`/reports/getSharePointSiteUsageSiteCounts(period='${period}')`, accessToken, {
      isReport: true
    }).catch(() => null), callMicrosoftGraph("/sites?$select=id,displayName,webUrl,createdDateTime,lastModifiedDateTime", accessToken, {
      getAllPages: true
    }).catch(err => {
      return null;
    })]);
    const siteStats = new Map();
    if (sharepointUsageDetail && sharepointUsageDetail.value) {
      sharepointUsageDetail.value.forEach(usage => {
        const siteId = usage['Site Id'] || usage['SiteId'] || usage.siteId || null;
        if (!siteId) return;
        const reportDateRaw = usage['Report Date'] || usage['ReportDate'] || usage.reportDate || usage.date || null;
        const lastActivityRaw = usage['Last Activity Date'] || usage.lastActivityDate || usage['LastActivityDate'] || null;
        let reportDate = null;
        if (reportDateRaw) {
          const parsed = new Date(reportDateRaw);
          if (!isNaN(parsed)) {
            reportDate = parsed;
          }
        }
        if (reportDate && hasDateFilter) {
          const dateOnly = new Date(reportDate.getFullYear(), reportDate.getMonth(), reportDate.getDate());
          const startOnly = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
          const endOnly = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
          if (dateOnly < startOnly || dateOnly > endOnly) {
            return;
          }
        }
        let lastActivityDate = null;
        if (lastActivityRaw) {
          const parsedLast = new Date(lastActivityRaw);
          if (!isNaN(parsedLast)) {
            lastActivityDate = parsedLast;
          }
        }
        const existing = siteStats.get(siteId);
        const shouldUpdate = !existing || reportDate && (!existing.reportDate || reportDate > existing.reportDate);
        if (shouldUpdate) {
          siteStats.set(siteId, {
            reportDate,
            lastActivityDate
          });
        }
      });
    }
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const activityWindowStart = hasDateFilter ? new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate()) : thirtyDaysAgo;
    const activityWindowEnd = hasDateFilter ? new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate()) : now;
    let activeSitesFromDetail = 0;
    let latestReportDateFromDetail = null;
    siteStats.forEach(site => {
      if (site.reportDate && (!latestReportDateFromDetail || site.reportDate > latestReportDateFromDetail)) {
        latestReportDateFromDetail = site.reportDate;
      }
      if (site.lastActivityDate && site.lastActivityDate >= activityWindowStart && site.lastActivityDate <= activityWindowEnd) {
        activeSitesFromDetail++;
      }
    });
    let totalSites = 0;
    let activeSites = 0;
    let inactiveSites = 0;
    let statsLastUpdate = null;
    if (sharepointSiteCounts && sharepointSiteCounts.value) {
      let latestCountsEntry = null;
      sharepointSiteCounts.value.forEach(entry => {
        const reportDateRaw = entry['Report Date'] || entry['ReportDate'] || entry.reportDate || entry['Date'] || null;
        if (!reportDateRaw) {
          return;
        }
        const parsedReportDate = new Date(reportDateRaw);
        if (isNaN(parsedReportDate)) {
          return;
        }
        if (hasDateFilter) {
          const reportDateOnly = new Date(parsedReportDate.getFullYear(), parsedReportDate.getMonth(), parsedReportDate.getDate());
          const startOnly = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
          const endOnly = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
          if (reportDateOnly < startOnly || reportDateOnly > endOnly) {
            return;
          }
        }
        if (!latestCountsEntry || parsedReportDate > latestCountsEntry.reportDate) {
          latestCountsEntry = {
            data: entry,
            reportDate: parsedReportDate
          };
        }
      });
      if (latestCountsEntry) {
        totalSites = parseNumber(latestCountsEntry.data['Total Sites'] || latestCountsEntry.data['TotalSites'] || latestCountsEntry.data.totalSites);
        activeSites = parseNumber(latestCountsEntry.data['Active Sites'] || latestCountsEntry.data['ActiveSites'] || latestCountsEntry.data.activeSites);
        inactiveSites = parseNumber(latestCountsEntry.data['Inactive Sites'] || latestCountsEntry.data['InactiveSites'] || latestCountsEntry.data.inactiveSites);
        statsLastUpdate = latestCountsEntry.reportDate;
      }
    }
    if (totalSites === 0 && siteStats.size > 0) {
      totalSites = siteStats.size;
    }
    if (activeSites === 0 && activeSitesFromDetail > 0) {
      activeSites = activeSitesFromDetail;
    }
    if (inactiveSites === 0 && totalSites > 0) {
      inactiveSites = Math.max(0, totalSites - activeSites);
    }
    if (!statsLastUpdate) {
      statsLastUpdate = latestReportDateFromDetail || new Date();
    }
    const sitesList = [];
    if (sharepointSites && sharepointSites.value) {
      sharepointSites.value.forEach(site => {
        const webUrl = site.webUrl || '';
        const siteId = site.id || '';
        const isSystemSite = webUrl.includes('/portals/hub/') || webUrl.includes('/portals/community/') || webUrl.includes('/portals/personal/') || siteId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(siteId) && webUrl.includes('/sites/');
        if (!isSystemSite) {
          const siteActivity = siteStats.get(siteId);
          const isActive = siteActivity && siteActivity.lastActivityDate && siteActivity.lastActivityDate >= activityWindowStart && siteActivity.lastActivityDate <= activityWindowEnd;
          sitesList.push({
            id: siteId,
            name: site.displayName || 'Sans nom',
            webUrl: webUrl,
            createdDateTime: site.createdDateTime || null,
            lastModifiedDateTime: site.lastModifiedDateTime || null,
            lastActivityDate: siteActivity?.lastActivityDate || null,
            isActive: isActive || false
          });
        }
      });
    }
    res.json({
      success: true,
      stats: {
        totalSites,
        activeSites,
        inactiveSites,
        lastUpdate: statsLastUpdate ? statsLastUpdate.toISOString() : new Date().toISOString()
      },
      sites: sitesList
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || "Error retrieving SharePoint data"
    });
  }
});
router.get("/stats", verifyJWT, async (req, res) => {
  try {
    const clientId = req.query.clientId ? parseInt(req.query.clientId) : null;
    let credentials = null;
    if (clientId) {
      credentials = await getClientOffice365Credentials(clientId, office365CredentialSelector(req));
    }
    if (!credentials) {
      const settings = await getOffice365Settings();
      if (settings && settings.tenant_id && settings.client_id && settings.client_secret) {
        credentials = {
          tenantId: settings.tenant_id,
          clientId: settings.client_id,
          clientSecret: settings.client_secret
        };
      }
    }
    if (!credentials) {
      return res.status(400).json({
        success: false,
        error: "Office 365 settings not configured"
      });
    }
    const accessToken = await getMicrosoftGraphToken(credentials.tenantId, credentials.clientId, credentials.clientSecret);
    const subscribedSkus = await callMicrosoftGraph("/subscribedSkus", accessToken);
    const usersResponse = await fetch("https://graph.microsoft.com/v1.0/users/$count", {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "ConsistencyLevel": "eventual"
      }
    });
    const usersCount = parseInt(await usersResponse.text()) || 0;
    const totalLicences = subscribedSkus.value.reduce((sum, sku) => sum + (sku.prepaidUnits?.enabled || 0), 0);
    const totalUtilisees = subscribedSkus.value.reduce((sum, sku) => sum + (sku.consumedUnits || 0), 0);
    const totalDisponibles = totalLicences - totalUtilisees;
    const tauxUtilisation = totalLicences > 0 ? Math.round(totalUtilisees / totalLicences * 100) : 0;
    res.json({
      success: true,
      stats: {
        totalLicences: totalLicences,
        totalUtilisees: totalUtilisees,
        totalDisponibles: totalDisponibles,
        tauxUtilisation: tauxUtilisation,
        nombreUtilisateurs: usersCount,
        nombreTypesLicences: subscribedSkus.value.length
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || "Error retrieving statistics"
    });
  }
});
router.get("/secure-score-recommendations", verifyJWT, async (req, res) => {
  try {
    const clientId = req.query.clientId ? parseInt(req.query.clientId, 10) : null;
    if (!clientId) {
      return res.status(400).json({
        success: false,
        error: "clientId is required"
      });
    }
    const credentials = await getClientOffice365Credentials(clientId, office365CredentialSelector(req));
    if (!credentials) {
      return res.status(400).json({
        success: false,
        error: `Azure configuration not found for client ${clientId}.`
      });
    }
    const accessToken = await getMicrosoftGraphToken(credentials.tenantId, credentials.clientId, credentials.clientSecret);
    let directoryRecs = null;
    try {
      directoryRecs = await callMicrosoftGraph("/directory/recommendations", accessToken, {
        getAllPages: true,
        useBeta: true
      });
    } catch (e) {
      console.warn("secure-score-recommendations: directory/recommendations", e?.message);
    }
    const fromDirectory = mapSecureScoreProfilesToRecommendations(directoryRecs).filter(rec => {
      const max = Number(rec.maxScore) || 0;
      const cur = Number(rec.currentScore) || 0;
      return max <= 0 || cur < max;
    });
    if (fromDirectory.length > 0) {
      return res.json({
        success: true,
        recommendations: fromDirectory,
        total: fromDirectory.length
      });
    }
    const [profilesRecs, secureScores] = await Promise.all([callMicrosoftGraph("/security/secureScoreControlProfiles", accessToken, {
      getAllPages: true
    }).catch(() => null), callMicrosoftGraph("/security/secureScores?$orderby=createdDateTime desc&$top=1", accessToken).catch(() => null)]);
    const latestSecureScore = getLatestSecureScoreWithControls(secureScores);
    const actionableControlIds = extractActionableControlIds(latestSecureScore);
    const filteredProfiles = Array.isArray(profilesRecs?.value) ? profilesRecs.value.filter(profile => actionableControlIds.size > 0 ? actionableControlIds.has(String(profile?.id || "")) : false) : [];
    const recommendations = mapSecureScoreProfilesToRecommendations({
      value: filteredProfiles
    });
    res.json({
      success: true,
      recommendations,
      total: recommendations.length
    });
  } catch (error) {
    console.error("secure-score-recommendations", error);
    res.status(500).json({
      success: false,
      error: error.message || "Error retrieving recommendations"
    });
  }
});
router.get("/security", verifyJWT, async (req, res) => {
  try {
    const clientId = req.query.clientId ? parseInt(req.query.clientId) : null;
    let credentials = null;
    if (clientId) {
      credentials = await getClientOffice365Credentials(clientId, office365CredentialSelector(req));
      if (!credentials) {
        return res.status(400).json({
          success: false,
          error: `Azure configuration not found for client ${clientId}. Please configure Azure credentials specific to this client.`
        });
      }
    } else {
      const settings = await getOffice365Settings();
      if (settings && settings.tenant_id && settings.client_id && settings.client_secret) {
        credentials = {
          tenantId: settings.tenant_id,
          clientId: settings.client_id,
          clientSecret: settings.client_secret
        };
      }
    }
    if (!credentials) {
      return res.status(400).json({
        success: false,
        error: "Office 365 settings not configured"
      });
    }
    const accessToken = await getMicrosoftGraphToken(credentials.tenantId, credentials.clientId, credentials.clientSecret);
    const [mfaReport, usersData, signIns, riskDetections, servicePrincipalApps, secureScores, secureScoreProfiles, secureScoreHistory] = await Promise.all([fetchUserRegistrationDetails(accessToken).catch(() => null), callMicrosoftGraph("/users?$select=id,displayName,mail,userPrincipalName,accountEnabled", accessToken, {
      getAllPages: true
    }).catch(() => null), callMicrosoftGraph("/auditLogs/signIns?$top=500&$orderby=createdDateTime desc", accessToken).catch(() => null), callMicrosoftGraph("/identityProtection/riskDetections?$top=100&$orderby=detectedDateTime desc", accessToken).catch(() => null), callMicrosoftGraph("/servicePrincipals?$select=id,displayName,appId,servicePrincipalType", accessToken, {
      getAllPages: true
    }).catch(() => null), callMicrosoftGraph("/security/secureScores?$orderby=createdDateTime desc", accessToken, {
      getAllPages: true
    }).catch(() => null), (async () => {
      try {
        const directoryRecs = await callMicrosoftGraph("/directory/recommendations", accessToken, {
          getAllPages: true,
          useBeta: true
        });
        if (directoryRecs && directoryRecs.value && directoryRecs.value.length > 0) {
          return directoryRecs;
        }
      } catch (err) {}
      try {
        return await callMicrosoftGraph("/security/secureScoreControlProfiles", accessToken, {
          getAllPages: true
        });
      } catch (err) {
        return null;
      }
    })(), callMicrosoftGraph("/security/secureScores?$orderby=createdDateTime desc&$top=30", accessToken).catch(() => null)]);
    const userMfaDetailsRaw = await buildUserMfaDetails(accessToken, usersData?.value || [], mfaReport);
    const administrators = await fetchDirectoryAdministrators(accessToken, usersData?.value || []);
    administrators.forEach(admin => {
      const match = userMfaDetailsRaw.find(user => String(user.id) === String(admin.id) || String(user.userPrincipalName || '').toLowerCase() === String(admin.email || '').toLowerCase());
      if (match) admin.hasMFA = Boolean(match.hasMFA);
    });
    let mfaStats = buildMfaStatsFromUsers(userMfaDetailsRaw, usersData?.value?.length || 0);
    const adminStats = {
      total: administrators.length,
      withMFA: administrators.filter(a => a.hasMFA).length,
      withoutMFA: administrators.filter(a => !a.hasMFA).length,
      mfaRate: administrators.length > 0 ? Math.round(administrators.filter(a => a.hasMFA).length / administrators.length * 100) : 0
    };
    if (clientId) {
      try {
        const totalUsers = mfaStats.totalUsers;
        const totalAdmins = adminStats.total;
        const nonAdminUsers = Math.max(0, totalUsers - totalAdmins);
        const adminMfaCount = adminStats.withMFA;
        const userMfaCount = Math.max(0, mfaStats.usersWithMFA - adminMfaCount);
        await pool.query(`
          INSERT INTO v_b_clients_c_azure_stats (
            client_id,
            admin_count,
            user_count,
            admin_mfa_count,
            user_mfa_count,
            admin_mfa_percentage,
            user_mfa_percentage,
            last_sync
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
          ON CONFLICT (client_id) DO UPDATE SET
            admin_count = EXCLUDED.admin_count,
            user_count = EXCLUDED.user_count,
            admin_mfa_count = EXCLUDED.admin_mfa_count,
            user_mfa_count = EXCLUDED.user_mfa_count,
            admin_mfa_percentage = EXCLUDED.admin_mfa_percentage,
            user_mfa_percentage = EXCLUDED.user_mfa_percentage,
            last_sync = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        `, [clientId, totalAdmins, totalUsers, adminMfaCount, userMfaCount, adminStats.mfaRate, mfaStats.mfaRate]);
      } catch (dbError) {
        console.error('Error saving Azure statistics:', dbError);
      }
    }
    const suspiciousConnections = {
      newLocations: [],
      newDevices: [],
      failedAttempts: []
    };
    if (signIns && signIns.value) {
      const userLocations = new Map();
      const userDevices = new Map();
      signIns.value.forEach(signIn => {
        const userId = signIn.userId || signIn.userPrincipalName;
        const location = signIn.location?.city || signIn.location?.countryOrRegion || 'Inconnu';
        const deviceId = signIn.deviceDetail?.deviceId || signIn.deviceDetail?.displayName || 'Inconnu';
        const isSuccessful = signIn.status?.errorCode === 0;
        if (!userLocations.has(userId)) {
          userLocations.set(userId, new Set());
        }
        if (!userLocations.get(userId).has(location) && isSuccessful) {
          userLocations.get(userId).add(location);
          suspiciousConnections.newLocations.push({
            user: signIn.userDisplayName || userId,
            location: location,
            date: signIn.createdDateTime,
            ipAddress: signIn.ipAddress
          });
        }
        if (!userDevices.has(userId)) {
          userDevices.set(userId, new Set());
        }
        if (!userDevices.get(userId).has(deviceId) && isSuccessful) {
          userDevices.get(userId).add(deviceId);
          suspiciousConnections.newDevices.push({
            user: signIn.userDisplayName || userId,
            device: signIn.deviceDetail?.displayName || deviceId,
            date: signIn.createdDateTime,
            os: signIn.deviceDetail?.operatingSystem || 'Inconnu'
          });
        }
        if (!isSuccessful && signIn.status?.errorCode >= 50000) {
          suspiciousConnections.failedAttempts.push({
            user: signIn.userDisplayName || userId,
            errorCode: signIn.status.errorCode,
            errorMessage: signIn.status.failureReason || 'Authentication failed',
            date: signIn.createdDateTime,
            ipAddress: signIn.ipAddress,
            location: location
          });
        }
      });
      suspiciousConnections.newLocations = suspiciousConnections.newLocations.slice(0, 20);
      suspiciousConnections.newDevices = suspiciousConnections.newDevices.slice(0, 20);
      suspiciousConnections.failedAttempts = suspiciousConnections.failedAttempts.slice(0, 20);
    }
    const authenticationRisks = [];
    if (riskDetections && riskDetections.value) {
      riskDetections.value.forEach(risk => {
        authenticationRisks.push({
          id: risk.id,
          user: risk.userDisplayName || risk.userPrincipalName || 'Unknown user',
          riskType: risk.riskType || 'Unknown',
          riskLevel: risk.riskLevel || 'medium',
          detectedDateTime: risk.detectedDateTime,
          ipAddress: risk.ipAddress,
          location: risk.location?.city || risk.location?.countryOrRegion || 'Inconnu'
        });
      });
    }
    const compliance = {
      retentionPolicies: []
    };
    let secureScoreData = null;
    let defenderSecureScoreData = null;
    let secureScoreHistoryData = [];
    if (secureScores && secureScores.value && secureScores.value.length > 0) {
      const providers = [...new Set(secureScores.value.map(s => s.vendorInformation?.provider || 'null'))];
      const entraIDScores = secureScores.value.filter(score => {
        const provider = score.vendorInformation?.provider || '';
        if (provider === "Microsoft365Defender" || provider === "Microsoft Defender for Office 365") {
          return false;
        }
        return true;
      });
      const defenderScores = secureScores.value.filter(score => score.vendorInformation?.provider === "Microsoft365Defender" || score.vendorInformation?.provider === "Microsoft Defender for Office 365");
      let entraIDScoreId = null;
      if (entraIDScores.length > 0) {
        const latestEntraScore = entraIDScores.sort((a, b) => {
          const dateA = new Date(a.createdDateTime || a.averageComparativeScores?.[0]?.basisDateTime || 0);
          const dateB = new Date(b.createdDateTime || b.averageComparativeScores?.[0]?.basisDateTime || 0);
          return dateB - dateA;
        })[0];
        entraIDScoreId = latestEntraScore.id;
        secureScoreData = {
          currentScore: latestEntraScore.currentScore || 0,
          maxScore: latestEntraScore.maxScore || 0,
          percentage: latestEntraScore.maxScore ? Math.round(latestEntraScore.currentScore / latestEntraScore.maxScore * 1000) / 10 : null,
          activeUserCount: latestEntraScore.activeUserCount || 0,
          enabledServices: latestEntraScore.enabledServices || [],
          licensedUserCount: latestEntraScore.licensedUserCount || 0,
          averageComparativeScores: latestEntraScore.averageComparativeScores || [],
          createdDateTime: latestEntraScore.createdDateTime || latestEntraScore.averageComparativeScores?.[0]?.basisDateTime || null,
          provider: "Entra ID",
          id: latestEntraScore.id
        };
      } else {}
      if (defenderScores.length > 0) {
        const latestDefenderScore = defenderScores.sort((a, b) => {
          const dateA = new Date(a.createdDateTime || 0);
          const dateB = new Date(b.createdDateTime || 0);
          return dateB - dateA;
        })[0];
        defenderSecureScoreData = {
          currentScore: latestDefenderScore.currentScore || 0,
          maxScore: latestDefenderScore.maxScore || 0,
          percentage: latestDefenderScore.maxScore ? Math.round(latestDefenderScore.currentScore / latestDefenderScore.maxScore * 1000) / 10 : null,
          averageComparativeScores: latestDefenderScore.averageComparativeScores || [],
          createdDateTime: latestDefenderScore.createdDateTime || null,
          provider: "Microsoft 365 Defender",
          vendorInformation: latestDefenderScore.vendorInformation || null
        };
        if (secureScoreHistory && secureScoreHistory.value) {
          const defenderHistory = secureScoreHistory.value.filter(score => score.vendorInformation?.provider === "Microsoft365Defender" || score.vendorInformation?.provider === "Microsoft Defender for Office 365").sort((a, b) => {
            const dateA = new Date(a.createdDateTime || 0);
            const dateB = new Date(b.createdDateTime || 0);
            return dateA - dateB;
          }).map(score => ({
            date: score.createdDateTime,
            score: score.currentScore || 0,
            maxScore: score.maxScore || 0,
            percentage: score.maxScore ? Math.round(score.currentScore / score.maxScore * 1000) / 10 : null
          }));
          secureScoreHistoryData = defenderHistory;
        }
      }
    }
    const secureScoreRecommendations = mapSecureScoreProfilesToRecommendations(secureScoreProfiles);
    let userMfaDetails = userMfaDetailsRaw.map(detail => enrichUserMfaWithAdminRoles(detail, administrators));
    if (clientId) {
      try {
        try {
          let emailMfaCount = 0;
          let softwareMfaCount = 0;
          let phoneMfaCount = 0;
          let authenticatorMfaCount = 0;
          userMfaDetails.forEach(userDetail => {
            if (userDetail.mfaMethods && Array.isArray(userDetail.mfaMethods)) {
              if (userDetail.mfaMethods.includes('emailauthenticationmethod')) emailMfaCount++;
              if (userDetail.mfaMethods.includes('softwareoathauthenticationmethod')) softwareMfaCount++;
              if (userDetail.mfaMethods.includes('phoneauthenticationmethod')) phoneMfaCount++;
              if (userDetail.mfaMethods.includes('microsoftauthenticatorauthenticationmethod')) authenticatorMfaCount++;
            }
          });
          const totalUsers = mfaStats.totalUsers || 0;
          const emailMfaPercentage = totalUsers > 0 ? Math.round(emailMfaCount / totalUsers * 100) : 0;
          const softwareMfaPercentage = totalUsers > 0 ? Math.round(softwareMfaCount / totalUsers * 100) : 0;
          const phoneMfaPercentage = totalUsers > 0 ? Math.round(phoneMfaCount / totalUsers * 100) : 0;
          const authenticatorMfaPercentage = totalUsers > 0 ? Math.round(authenticatorMfaCount / totalUsers * 100) : 0;
          await pool.query(`
            UPDATE v_b_clients_c_azure_stats SET
              email_mfa_count = $1,
              software_mfa_count = $2,
              phone_mfa_count = $3,
              authenticator_mfa_count = $4,
              email_mfa_percentage = $5,
              software_mfa_percentage = $6,
              phone_mfa_percentage = $7,
              authenticator_mfa_percentage = $8,
              updated_at = CURRENT_TIMESTAMP
            WHERE client_id = $9
          `, [emailMfaCount, softwareMfaCount, phoneMfaCount, authenticatorMfaCount, emailMfaPercentage, softwareMfaPercentage, phoneMfaPercentage, authenticatorMfaPercentage, clientId]);
        } catch (mfaStatsError) {
          console.error('Error saving MFA statistics:', mfaStatsError);
        }
        try {
          await persistUserMfaDetails(clientId, userMfaDetailsRaw, administrators);
        } catch (userDetailsError) {
          console.error('Error saving user details:', userDetailsError);
        }
      } catch (dbError) {
        console.error('Error saving to database:', dbError);
      }
    }
    res.json({
      success: true,
      mfa: mfaStats,
      administrators: administrators,
      adminStats: adminStats,
      userMfaDetails: userMfaDetails,
      suspiciousConnections: suspiciousConnections,
      authenticationRisks: authenticationRisks,
      compliance: compliance,
      secureScore: secureScoreData,
      defenderSecureScore: defenderSecureScoreData,
      secureScoreHistory: secureScoreHistoryData,
      secureScoreRecommendations: secureScoreRecommendations
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || "Error retrieving security data"
    });
  }
});
router.get("/applications", verifyJWT, async (req, res) => {
  try {
    const clientId = req.query.clientId ? parseInt(req.query.clientId) : null;
    let credentials = null;
    if (clientId) {
      credentials = await getClientOffice365Credentials(clientId, office365CredentialSelector(req));
    }
    if (!credentials) {
      const settings = await getOffice365Settings();
      if (settings && settings.tenant_id && settings.client_id && settings.client_secret) {
        credentials = {
          tenantId: settings.tenant_id,
          clientId: settings.client_id,
          clientSecret: settings.client_secret
        };
      }
    }
    if (!credentials) {
      return res.status(400).json({
        success: false,
        error: "Office 365 settings not configured"
      });
    }
    const accessToken = await getMicrosoftGraphToken(credentials.tenantId, credentials.clientId, credentials.clientSecret);
    const period = 'D90';
    const startDate = req.query.startDate ? new Date(req.query.startDate) : null;
    const endDate = req.query.endDate ? new Date(req.query.endDate) : null;
    const [office365Apps, outlookApps, teamsApps, onedriveApps, sharepointApps, servicePrincipals, activeUserCounts, servicesUserCounts] = await Promise.all([callMicrosoftGraph(`/reports/getOffice365ActiveUserDetail(period='${period}')`, accessToken, {
      isReport: true
    }).catch(() => null), callMicrosoftGraph(`/reports/getEmailAppUsageUserDetail(period='${period}')`, accessToken, {
      isReport: true
    }).catch(() => null), callMicrosoftGraph(`/reports/getTeamsUserActivityUserDetail(period='${period}')`, accessToken, {
      isReport: true
    }).catch(() => null), callMicrosoftGraph(`/reports/getOneDriveUsageAccountDetail(period='${period}')`, accessToken, {
      isReport: true
    }).catch(() => null), callMicrosoftGraph(`/reports/getSharePointActivityUserDetail(period='${period}')`, accessToken, {
      isReport: true
    }).catch(() => null), callMicrosoftGraph("/servicePrincipals?$select=id,displayName,appId,servicePrincipalType,appDisplayName&$filter=servicePrincipalType eq 'Application'", accessToken, {
      getAllPages: true
    }).catch(() => null), callMicrosoftGraph(`/reports/getOffice365ActiveUserCounts(period='${period}')`, accessToken, {
      isReport: true
    }).catch(() => null), callMicrosoftGraph(`/reports/getOffice365ServicesUserCounts(period='${period}')`, accessToken, {
      isReport: true
    }).catch(() => null)]);
    const appUsage = {
      word: {
        users: 0,
        activations: 0
      },
      excel: {
        users: 0,
        activations: 0
      },
      powerpoint: {
        users: 0,
        activations: 0
      },
      outlook: {
        users: 0,
        activations: 0
      },
      teams: {
        users: 0,
        activations: 0
      },
      onedrive: {
        users: 0,
        activations: 0
      },
      sharepoint: {
        users: 0,
        activations: 0
      }
    };
    if (servicesUserCounts && servicesUserCounts.value) {
      let filteredServiceCounts = servicesUserCounts.value;
      if (startDate && endDate) {
        filteredServiceCounts = servicesUserCounts.value.filter(entry => {
          const reportDate = entry['Report Date'] || entry['ReportDate'] || entry.date || '';
          if (!reportDate) return false;
          try {
            const date = new Date(reportDate);
            const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
            const startDateOnly = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
            const endDateOnly = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
            return dateOnly >= startDateOnly && dateOnly <= endDateOnly;
          } catch {
            return false;
          }
        });
      }
      const serviceMaxUsers = {
        'Microsoft Word': 0,
        'Microsoft Excel': 0,
        'Microsoft PowerPoint': 0,
        'Microsoft Outlook': 0,
        'Microsoft Teams': 0,
        'OneDrive For Business': 0,
        'SharePoint': 0
      };
      filteredServiceCounts.forEach(entry => {
        const serviceName = entry['Service Name'] || entry['ServiceName'] || entry.serviceName || '';
        const activeUsers = parseInt(entry['Active Users Count'] || entry['ActiveUsersCount'] || entry.activeUsers || 0);
        if (serviceName && activeUsers > 0) {
          const normalizedService = serviceName.toLowerCase();
          if (normalizedService.includes('word')) {
            serviceMaxUsers['Microsoft Word'] = Math.max(serviceMaxUsers['Microsoft Word'], activeUsers);
          } else if (normalizedService.includes('excel')) {
            serviceMaxUsers['Microsoft Excel'] = Math.max(serviceMaxUsers['Microsoft Excel'], activeUsers);
          } else if (normalizedService.includes('powerpoint')) {
            serviceMaxUsers['Microsoft PowerPoint'] = Math.max(serviceMaxUsers['Microsoft PowerPoint'], activeUsers);
          } else if (normalizedService.includes('outlook')) {
            serviceMaxUsers['Microsoft Outlook'] = Math.max(serviceMaxUsers['Microsoft Outlook'], activeUsers);
          } else if (normalizedService.includes('teams')) {
            serviceMaxUsers['Microsoft Teams'] = Math.max(serviceMaxUsers['Microsoft Teams'], activeUsers);
          } else if (normalizedService.includes('onedrive')) {
            serviceMaxUsers['OneDrive For Business'] = Math.max(serviceMaxUsers['OneDrive For Business'], activeUsers);
          } else if (normalizedService.includes('sharepoint')) {
            serviceMaxUsers['SharePoint'] = Math.max(serviceMaxUsers['SharePoint'], activeUsers);
          }
        }
      });
      appUsage.word.users = serviceMaxUsers['Microsoft Word'];
      appUsage.excel.users = serviceMaxUsers['Microsoft Excel'];
      appUsage.powerpoint.users = serviceMaxUsers['Microsoft PowerPoint'];
      appUsage.outlook.users = serviceMaxUsers['Microsoft Outlook'];
      appUsage.teams.users = serviceMaxUsers['Microsoft Teams'];
      appUsage.onedrive.users = serviceMaxUsers['OneDrive For Business'];
      appUsage.sharepoint.users = serviceMaxUsers['SharePoint'];
    }
    if (office365Apps && office365Apps.value) {
      office365Apps.value.forEach(user => {
        const wordActivated = parseInt(user['Word Activated'] || user['WordActivated'] || user['Word Activated Count'] || user['WordActivatedCount'] || 0);
        const excelActivated = parseInt(user['Excel Activated'] || user['ExcelActivated'] || user['Excel Activated Count'] || user['ExcelActivatedCount'] || 0);
        const powerpointActivated = parseInt(user['PowerPoint Activated'] || user['PowerPointActivated'] || user['PowerPoint Activated Count'] || user['PowerPointActivatedCount'] || 0);
        appUsage.word.activations += wordActivated;
        appUsage.excel.activations += excelActivated;
        appUsage.powerpoint.activations += powerpointActivated;
      });
    }
    if (appUsage.outlook.users === 0 && outlookApps && outlookApps.value) {
      const outlookUsers = new Set();
      outlookApps.value.forEach(user => {
        const outlookUsed = user['Outlook'] || user['Outlook Used'] || user['OutlookUsed'] || 'No';
        if (outlookUsed === 'Yes' || outlookUsed === true || outlookUsed === '1') {
          outlookUsers.add(user['User Principal Name'] || user['UserPrincipalName'] || user['UserPrincipalName'] || '');
        }
      });
      appUsage.outlook.users = outlookUsers.size;
    }
    if (appUsage.teams.users === 0 && teamsApps && teamsApps.value) {
      const teamsUsers = new Set();
      teamsApps.value.forEach(user => {
        const teamChatCount = parseInt(user['Team Chat Message Count'] || user['TeamChatMessageCount'] || 0);
        const privateChatCount = parseInt(user['Private Chat Message Count'] || user['PrivateChatMessageCount'] || 0);
        const meetingCount = parseInt(user['Meeting Count'] || user['MeetingCount'] || 0);
        if (teamChatCount > 0 || privateChatCount > 0 || meetingCount > 0) {
          teamsUsers.add(user['User Principal Name'] || user['UserPrincipalName'] || '');
        }
      });
      appUsage.teams.users = teamsUsers.size;
    }
    if (appUsage.onedrive.users === 0 && onedriveApps && onedriveApps.value) {
      const onedriveUsers = new Set();
      onedriveApps.value.forEach(user => {
        const filesViewed = parseInt(user['Files Viewed'] || user['FilesViewed'] || user['Files Viewed Or Edited'] || user['FilesViewedOrEdited'] || 0);
        if (filesViewed > 0) {
          onedriveUsers.add(user['User Principal Name'] || user['UserPrincipalName'] || user['Owner Principal Name'] || user['OwnerPrincipalName'] || '');
        }
      });
      appUsage.onedrive.users = onedriveUsers.size;
    }
    if (appUsage.sharepoint.users === 0 && sharepointApps && sharepointApps.value) {
      const sharepointUsers = new Set();
      sharepointApps.value.forEach(user => {
        const filesViewed = parseInt(user['Files Viewed'] || user['FilesViewed'] || user['Files Viewed Or Edited'] || user['FilesViewedOrEdited'] || 0);
        if (filesViewed > 0) {
          sharepointUsers.add(user['User Principal Name'] || user['UserPrincipalName'] || '');
        }
      });
      appUsage.sharepoint.users = sharepointUsers.size;
    }
    const usersByAppDaily = [];
    if (servicesUserCounts && servicesUserCounts.value) {
      let filteredServiceCounts = servicesUserCounts.value;
      if (startDate && endDate) {
        filteredServiceCounts = servicesUserCounts.value.filter(entry => {
          const reportDate = entry['Report Date'] || entry['ReportDate'] || entry.date || '';
          if (!reportDate) return false;
          try {
            const date = new Date(reportDate);
            const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
            const startDateOnly = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
            const endDateOnly = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
            return dateOnly >= startDateOnly && dateOnly <= endDateOnly;
          } catch {
            return false;
          }
        });
      }
      const dailyData = {};
      filteredServiceCounts.forEach(entry => {
        const reportDate = entry['Report Date'] || entry['ReportDate'] || entry.date || '';
        if (!reportDate) return;
        if (!dailyData[reportDate]) {
          dailyData[reportDate] = {
            date: reportDate,
            Word: 0,
            Excel: 0,
            PowerPoint: 0,
            Outlook: 0,
            Teams: 0,
            OneDrive: 0,
            SharePoint: 0
          };
        }
        const serviceName = (entry['Service Name'] || entry['ServiceName'] || entry.serviceName || '').toLowerCase();
        const activeUsers = parseInt(entry['Active Users Count'] || entry['ActiveUsersCount'] || entry.activeUsers || 0);
        if (serviceName.includes('word')) {
          dailyData[reportDate].Word += activeUsers;
        } else if (serviceName.includes('excel')) {
          dailyData[reportDate].Excel += activeUsers;
        } else if (serviceName.includes('powerpoint')) {
          dailyData[reportDate].PowerPoint += activeUsers;
        } else if (serviceName.includes('outlook')) {
          dailyData[reportDate].Outlook += activeUsers;
        } else if (serviceName.includes('teams')) {
          dailyData[reportDate].Teams += activeUsers;
        } else if (serviceName.includes('onedrive')) {
          dailyData[reportDate].OneDrive += activeUsers;
        } else if (serviceName.includes('sharepoint')) {
          dailyData[reportDate].SharePoint += activeUsers;
        }
      });
      usersByAppDaily.push(...Object.values(dailyData));
      usersByAppDaily.sort((a, b) => {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        return dateA - dateB;
      });
    }
    const usersByPlatformDaily = [];
    if (servicesUserCounts && servicesUserCounts.value) {
      let filteredServiceCounts = servicesUserCounts.value;
      if (startDate && endDate) {
        filteredServiceCounts = servicesUserCounts.value.filter(entry => {
          const reportDate = entry['Report Date'] || entry['ReportDate'] || entry.date || '';
          if (!reportDate) return false;
          try {
            const date = new Date(reportDate);
            const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
            const startDateOnly = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
            const endDateOnly = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
            return dateOnly >= startDateOnly && dateOnly <= endDateOnly;
          } catch {
            return false;
          }
        });
      }
      const dailyPlatformData = {};
      filteredServiceCounts.forEach(entry => {
        const reportDate = entry['Report Date'] || entry['ReportDate'] || entry.date || '';
        if (!reportDate) return;
        if (!dailyPlatformData[reportDate]) {
          dailyPlatformData[reportDate] = {
            date: reportDate,
            Windows: 0,
            Mac: 0,
            Web: 0,
            Mobile: 0,
            Linux: 0
          };
        }
        const platform = (entry['Platform'] || entry.platform || '').toLowerCase();
        const activeUsers = parseInt(entry['Active Users Count'] || entry['ActiveUsersCount'] || entry.activeUsers || 0);
        if (platform.includes('windows')) {
          dailyPlatformData[reportDate].Windows += activeUsers;
        } else if (platform.includes('mac') || platform.includes('macos')) {
          dailyPlatformData[reportDate].Mac += activeUsers;
        } else if (platform.includes('web') || platform.includes('browser')) {
          dailyPlatformData[reportDate].Web += activeUsers;
        } else if (platform.includes('mobile') || platform.includes('ios') || platform.includes('android')) {
          dailyPlatformData[reportDate].Mobile += activeUsers;
        } else if (platform.includes('linux')) {
          dailyPlatformData[reportDate].Linux += activeUsers;
        }
      });
      usersByPlatformDaily.push(...Object.values(dailyPlatformData));
      usersByPlatformDaily.sort((a, b) => new Date(a.date) - new Date(b.date));
    }
    res.json({
      success: true,
      applications: appUsage,
      dailyUsersByApp: usersByAppDaily,
      dailyUsersByPlatform: usersByPlatformDaily,
      lastUpdate: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || "Error retrieving applications data"
    });
  }
});
router.get("/alerts", verifyJWT, async (req, res) => {
  try {
    const clientId = req.query.clientId ? parseInt(req.query.clientId) : null;
    let credentials = null;
    if (clientId) {
      credentials = await getClientOffice365Credentials(clientId, office365CredentialSelector(req));
    }
    if (!credentials) {
      const settings = await getOffice365Settings();
      if (settings && settings.tenant_id && settings.client_id && settings.client_secret) {
        credentials = {
          tenantId: settings.tenant_id,
          clientId: settings.client_id,
          clientSecret: settings.client_secret
        };
      }
    }
    if (!credentials) {
      return res.status(400).json({
        success: false,
        error: "Office 365 settings not configured"
      });
    }
    const accessToken = await getMicrosoftGraphToken(credentials.tenantId, credentials.clientId, credentials.clientSecret);
    const [securityAlerts, serviceHealth, auditLogs] = await Promise.all([callMicrosoftGraph("/security/alerts?$top=50&$orderby=createdDateTime desc", accessToken).catch(() => null), callMicrosoftGraph("/admin/serviceAnnouncement/healthOverviews", accessToken).catch(() => null), callMicrosoftGraph("/auditLogs/signIns?$top=100&$orderby=createdDateTime desc", accessToken).catch(() => null)]);
    const alerts = {
      security: [],
      serviceHealth: [],
      critical: []
    };
    if (securityAlerts && securityAlerts.value) {
      securityAlerts.value.forEach(alert => {
        alerts.security.push({
          id: alert.id,
          title: alert.title || 'Security alert',
          severity: alert.severity || 'medium',
          status: alert.status || 'new',
          created: alert.createdDateTime,
          description: alert.description || ''
        });
        if (alert.severity === 'high' || alert.severity === 'critical') {
          alerts.critical.push({
            id: alert.id,
            title: alert.title || 'Critical security alert',
            type: 'security',
            severity: alert.severity,
            created: alert.createdDateTime
          });
        }
      });
    }
    if (serviceHealth && serviceHealth.value) {
      serviceHealth.value.forEach(service => {
        if (service.status !== 'serviceOperational') {
          alerts.serviceHealth.push({
            id: service.id,
            service: service.service || 'Service inconnu',
            status: service.status,
            issues: service.issues || []
          });
          alerts.critical.push({
            id: service.id,
            title: `Issue with ${service.service || 'a service'}`,
            type: 'service',
            severity: service.status === 'serviceDegradation' ? 'medium' : 'high',
            created: new Date().toISOString()
          });
        }
      });
    }
    if (auditLogs && auditLogs.value) {
      const suspiciousActivities = auditLogs.value.filter(log => {
        return log.riskLevel === 'high' || log.riskLevel === 'medium' || log.status && log.status.errorCode && parseInt(log.status.errorCode) >= 50000;
      });
      suspiciousActivities.slice(0, 10).forEach(activity => {
        alerts.security.push({
          id: activity.id || `audit-${Date.now()}`,
          title: 'Suspicious activity detected',
          severity: activity.riskLevel === 'high' ? 'high' : 'medium',
          status: 'active',
          created: activity.createdDateTime,
          description: `Sign-in from ${activity.location?.city || 'unknown location'}`
        });
      });
    }
    const stats = {
      totalSecurity: alerts.security.length,
      totalServiceIssues: alerts.serviceHealth.length,
      totalCritical: alerts.critical.length,
      highSeverity: alerts.security.filter(a => a.severity === 'high' || a.severity === 'critical').length
    };
    res.json({
      success: true,
      alerts: alerts,
      stats: stats,
      lastUpdate: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || "Error retrieving alerts"
    });
  }
});
router.get("/stats/saved/:clientId", verifyJWT, async (req, res) => {
  try {
    const {
      clientId
    } = req.params;
    const result = await pool.query(`
      SELECT
        -- Total counts
        COUNT(*) as total_users,
        COUNT(CASE WHEN is_admin = true THEN 1 END) as admin_count,
        COUNT(CASE WHEN is_admin IS NULL OR is_admin = false THEN 1 END) as regular_user_count,

        -- MFA by user type (uses the corrected has_mfa column)
        COUNT(CASE WHEN has_mfa = true THEN 1 END) as users_with_mfa,
        COUNT(CASE WHEN has_mfa = true AND is_admin = true THEN 1 END) as admins_with_mfa,
        COUNT(CASE WHEN has_mfa = true AND (is_admin IS NULL OR is_admin = false) THEN 1 END) as regular_users_with_mfa,

        -- Detailed MFA methods (for users with has_mfa = true)
        COUNT(CASE WHEN has_mfa = true AND mfa_methods ? 'emailauthenticationmethod' THEN 1 END) as email_mfa_count,
        COUNT(CASE WHEN has_mfa = true AND mfa_methods ? 'softwareoathauthenticationmethod' THEN 1 END) as software_mfa_count,
        COUNT(CASE WHEN has_mfa = true AND mfa_methods ? 'phoneauthenticationmethod' THEN 1 END) as phone_mfa_count,
        COUNT(CASE WHEN has_mfa = true AND mfa_methods ? 'microsoftauthenticatorauthenticationmethod' THEN 1 END) as authenticator_mfa_count,

        -- Debug: count null values
        COUNT(CASE WHEN is_admin IS NULL THEN 1 END) as null_admin_count,
        COUNT(CASE WHEN has_mfa IS NULL THEN 1 END) as null_mfa_count,
        COUNT(CASE WHEN has_mfa = false THEN 1 END) as false_mfa_count,

        MAX(last_sync) as last_sync
      FROM v_b_clients_c_azure_mfa
      WHERE client_id = $1 AND account_enabled = true
    `, [clientId]);
    if (result.rows.length === 0 || result.rows[0].total_users === 0) {
      return res.json({
        success: true,
        stats: null,
        message: "No MFA data saved for this client"
      });
    }
    const data = result.rows[0];
    const totalUsers = parseInt(data.total_users);
    const adminCount = parseInt(data.admin_count);
    const regularUserCount = parseInt(data.regular_user_count);
    const usersWithMfa = parseInt(data.users_with_mfa);
    const adminsWithMfa = parseInt(data.admins_with_mfa);
    const regularUsersWithMfa = parseInt(data.regular_users_with_mfa);
    const userMfaPercentage = totalUsers > 0 ? Math.round(usersWithMfa / totalUsers * 100) : 0;
    const adminMfaPercentage = adminCount > 0 ? Math.round(adminsWithMfa / adminCount * 100) : 0;
    const regularUserMfaPercentage = regularUserCount > 0 ? Math.round(regularUsersWithMfa / regularUserCount * 100) : 0;
    const emailMfaPercentage = totalUsers > 0 ? Math.round(parseInt(data.email_mfa_count) / totalUsers * 100) : 0;
    const softwareMfaPercentage = totalUsers > 0 ? Math.round(parseInt(data.software_mfa_count) / totalUsers * 100) : 0;
    const phoneMfaPercentage = totalUsers > 0 ? Math.round(parseInt(data.phone_mfa_count) / totalUsers * 100) : 0;
    const authenticatorMfaPercentage = totalUsers > 0 ? Math.round(parseInt(data.authenticator_mfa_count) / totalUsers * 100) : 0;
    res.json({
      success: true,
      stats: {
        admin_count: adminCount,
        user_count: totalUsers,
        admin_mfa_count: adminsWithMfa,
        user_mfa_count: usersWithMfa,
        admin_mfa_percentage: adminMfaPercentage,
        user_mfa_percentage: userMfaPercentage,
        regular_user_count: regularUserCount,
        regular_user_mfa_count: regularUsersWithMfa,
        regular_user_mfa_percentage: regularUserMfaPercentage,
        email_mfa_count: parseInt(data.email_mfa_count),
        software_mfa_count: parseInt(data.software_mfa_count),
        phone_mfa_count: parseInt(data.phone_mfa_count),
        authenticator_mfa_count: parseInt(data.authenticator_mfa_count),
        email_mfa_percentage: emailMfaPercentage,
        software_mfa_percentage: softwareMfaPercentage,
        phone_mfa_percentage: phoneMfaPercentage,
        authenticator_mfa_percentage: authenticatorMfaPercentage,
        last_sync: data.last_sync
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || "Error retrieving statistics"
    });
  }
});
router.get("/mfa-details/:clientId", verifyJWT, async (req, res) => {
  try {
    const clientId = parseInt(req.params.clientId, 10);
    const refresh = req.query.refresh === "1" || req.query.refresh === "true";
    if (!clientId) {
      return res.status(400).json({
        success: false,
        error: "clientId is required"
      });
    }
    let rows = await queryAzureMfaRows(clientId);
    if (refresh || mfaRowsLookIncomplete(rows)) {
      const credentials = await getClientOffice365Credentials(clientId, office365CredentialSelector(req));
      if (credentials?.tenantId && credentials?.clientId && credentials?.clientSecret) {
        try {
          const accessToken = await getMicrosoftGraphToken(credentials.tenantId, credentials.clientId, credentials.clientSecret);
          await saveClientMfaDetailsWithAdminRoles(clientId, accessToken);
          rows = await queryAzureMfaRows(clientId);
        } catch (syncError) {
          console.error(`[azure-mfa] Live Graph refresh failed for client ${clientId}:`, syncError?.message || syncError);
        }
      }
    }
    if (!rows.length) {
      return res.json({
        success: true,
        userMfaDetails: [],
        message: "No MFA details saved for this client"
      });
    }
    res.json({
      success: true,
      userMfaDetails: mapAzureMfaRows(rows)
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || "Error retrieving MFA details"
    });
  }
});
async function fetchOffice365DataInternal(clientId, credentials) {
  try {
    const accessToken = await getMicrosoftGraphToken(credentials.tenantId, credentials.clientId, credentials.clientSecret);
    const [subscribedSkus, usersData, activeUsersReport, signInsData] = await Promise.all([callMicrosoftGraph("/subscribedSkus", accessToken), callMicrosoftGraph("/users?$select=id,displayName,mail,userPrincipalName,jobTitle,department,assignedLicenses,signInActivity,accountEnabled,createdDateTime", accessToken, {
      getAllPages: true
    }).catch(err => {
      return callMicrosoftGraph("/users?$select=id,displayName,mail,userPrincipalName,jobTitle,department,assignedLicenses,accountEnabled,createdDateTime", accessToken, {
        getAllPages: true
      });
    }), callMicrosoftGraph("/reports/getOffice365ActiveUserDetail(period='D90')", accessToken, {
      isReport: true
    }).catch(() => null), callMicrosoftGraph("/auditLogs/signIns?$top=2000&$orderby=createdDateTime desc", accessToken).catch(() => null)]);
    const skuIdToName = {};
    subscribedSkus.value.forEach(sku => {
      skuIdToName[sku.skuId] = sku.skuPartNumber || sku.displayName || "Licence inconnue";
    });
    const licences = subscribedSkus.value.filter(sku => {
      const total = sku.prepaidUnits?.enabled || 0;
      return total < 10000 && total > 0;
    }).map(sku => {
      const consumed = sku.consumedUnits || 0;
      const total = sku.prepaidUnits?.enabled || 0;
      const available = Math.max(0, total - consumed);
      return {
        nom: sku.skuPartNumber || sku.displayName || "Licence inconnue",
        total: total,
        utilisees: consumed,
        disponibles: available,
        skuId: sku.skuId,
        displayName: sku.displayName,
        servicePlans: sku.servicePlans || []
      };
    });
    const emailToLastLogin = {};
    const reportUpnKeys = ['User Principal Name', 'UserPrincipalName', 'User'];
    const reportDateKeys = ['Last Activity Date (UTC)', 'Last Activity Date', 'LastActivityDate'];
    const reportOtherDateKeys = ['Report Refresh Date', 'Exchange Last Activity Date', 'SharePoint Last Activity Date', 'OneDrive Last Activity Date', 'Teams Last Activity Date', 'Yammer Last Activity Date', 'Skype For Business Last Activity Date'];
    if (activeUsersReport && activeUsersReport.value) {
      activeUsersReport.value.forEach(row => {
        const email = (getReportRowValue(row, reportUpnKeys) || '').toString().trim();
        if (!email) return;
        let lastActivity = getReportRowValue(row, reportDateKeys);
        if (lastActivity != null && typeof lastActivity === 'string') lastActivity = lastActivity.trim();
        for (const key of reportOtherDateKeys) {
          const val = row[key];
          if (val) {
            const d = new Date(val);
            if (!isNaN(d.getTime())) {
              const current = lastActivity ? new Date(lastActivity) : null;
              if (!current || d > current) lastActivity = val;
            }
          }
        }
        if (email && lastActivity) {
          emailToLastLogin[email.toLowerCase()] = lastActivity;
        }
      });
    }
    const signInToLastLogin = {};
    if (signInsData && signInsData.value && Array.isArray(signInsData.value)) {
      signInsData.value.forEach(signIn => {
        const isSuccess = signIn.status && signIn.status.errorCode === 0;
        if (!isSuccess) return;
        const upn = (signIn.userPrincipalName || signIn.userId || '').toString().trim();
        const dt = signIn.createdDateTime;
        if (!upn || !dt) return;
        if (!signInToLastLogin[upn.toLowerCase()]) {
          signInToLastLogin[upn.toLowerCase()] = dt;
        }
      });
    }
    const usersList = Array.isArray(usersData?.value) ? usersData.value : [];
    const users = usersList.map(user => {
      const licenseNames = user.assignedLicenses?.map(license => skuIdToName[license.skuId] || license.skuId).filter(Boolean).join(", ") || "";
      let lastLoginDate = null;
      if (user.signInActivity && user.signInActivity.lastSignInDateTime) {
        lastLoginDate = user.signInActivity.lastSignInDateTime;
      }
      if (lastLoginDate == null || lastLoginDate === '') {
        const userEmail = (user.mail || user.userPrincipalName || '').toString().toLowerCase().trim();
        const upn = (user.userPrincipalName || '').toString().toLowerCase().trim();
        lastLoginDate = emailToLastLogin[userEmail] || emailToLastLogin[upn] || signInToLastLogin[userEmail] || signInToLastLogin[upn];
      }
      if (lastLoginDate != null && lastLoginDate !== '') {
        const d = new Date(lastLoginDate);
        lastLoginDate = !isNaN(d.getTime()) ? d.toISOString() : null;
      } else {
        lastLoginDate = null;
      }
      const name = user.displayName || user.userPrincipalName || "Unnamed user";
      const email = user.mail || user.userPrincipalName || "";
      const isServiceAccount = isLikelyServiceAccount(user.displayName, user.userPrincipalName, user.mail);
      return {
        id: user.id || null,
        name,
        email,
        department: user.department || "",
        title: user.jobTitle || "",
        licenses: licenseNames,
        userPrincipalName: user.userPrincipalName,
        lastLoginDate,
        accountEnabled: user.accountEnabled !== false,
        createdDate: user.createdDateTime || null,
        isServiceAccount: !!isServiceAccount
      };
    });
    let adoptionScoreData = null;
    return {
      success: true,
      licences: licences,
      users: users,
      adoptionScore: adoptionScoreData,
      lastUpdate: new Date().toISOString()
    };
  } catch (error) {
    return {
      success: false,
      error: error.message || "Error retrieving data"
    };
  }
}
async function fetchExchangeDataInternal(accessToken, startDate, endDate, period = 'D90') {
  try {
    const [emailActivity, emailAppUsage, mailboxUsage, emailActivityUserDetail, activeUsersReport, usersWithMailboxSettings] = await Promise.all([callMicrosoftGraph(`/reports/getEmailActivityCounts(period='${period}')`, accessToken, {
      isReport: true
    }).catch(() => null), callMicrosoftGraph(`/reports/getEmailAppUsageUserDetail(period='${period}')`, accessToken, {
      isReport: true
    }).catch(() => null), callMicrosoftGraph(`/reports/getMailboxUsageDetail(period='${period}')`, accessToken, {
      isReport: true
    }).catch(() => null), callMicrosoftGraph(`/reports/getEmailActivityUserDetail(period='${period}')`, accessToken, {
      isReport: true
    }).catch(() => null), callMicrosoftGraph(`/reports/getOffice365ActiveUserDetail(period='${period}')`, accessToken, {
      isReport: true
    }).catch(() => null), callMicrosoftGraph("/users?$select=id,displayName,mail,userPrincipalName", accessToken, {
      getAllPages: true
    }).catch(() => null)]);
    let totalSent = 0;
    let totalReceived = 0;
    let totalRead = 0;
    let totalMailboxSize = 0;
    let totalMailboxes = 0;
    let dailyActivity = [];
    let totalItemCount = 0;
    const mailboxQuotas = [];
    if (emailActivity && emailActivity.value) {
      emailActivity.value.forEach(day => {
        const sent = parseInt(day.Send || day.send || day['Send Count'] || 0);
        const received = parseInt(day.Receive || day.receive || day['Receive Count'] || 0);
        const read = parseInt(day.Read || day.read || day['Read Count'] || 0);
        const date = day.ReportDate || day['Report Date'] || day.reportDate || day.date || '';
        const dayDate = new Date(date);
        if (startDate && endDate) {
          const dayDateOnly = new Date(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate());
          const startDateOnly = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
          const endDateOnly = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
          if (dayDateOnly >= startDateOnly && dayDateOnly <= endDateOnly) {
            totalSent += sent;
            totalReceived += received;
            totalRead += read;
          }
        } else {
          totalSent += sent;
          totalReceived += received;
          totalRead += read;
        }
        dailyActivity.push({
          date,
          sent,
          received,
          read
        });
      });
      if (startDate && endDate) {
        const startDateOnly = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
        const endDateOnly = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
        dailyActivity = dailyActivity.filter(day => {
          const dayDate = new Date(day.date);
          if (Number.isNaN(dayDate.getTime())) return false;
          const dayDateOnly = new Date(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate());
          return dayDateOnly >= startDateOnly && dayDateOnly <= endDateOnly;
        });
      }
      dailyActivity.sort((a, b) => {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        return dateA - dateB;
      });
    }
    const userQuotaMap = new Map();
    if (usersWithMailboxSettings && usersWithMailboxSettings.value) {
      usersWithMailboxSettings.value.forEach(user => {
        if (user.mailboxSettings && user.userPrincipalName) {
          const emailKey = user.userPrincipalName.toLowerCase();
          const quota = user.mailboxSettings.prohibitSendReceiveQuota || user.mailboxSettings.storageQuota || user.mailboxSettings.issueWarningQuota || null;
          userQuotaMap.set(emailKey, {
            displayName: user.displayName || user.mail || user.userPrincipalName.split('@')[0],
            email: user.userPrincipalName,
            quota: quota ? parseInt(quota) : null
          });
        }
      });
    }
    if (mailboxUsage && mailboxUsage.value) {
      mailboxUsage.value.forEach(mailbox => {
        const storageUsed = parseInt(mailbox['Storage Used (Byte)'] || mailbox['Storage Used'] || mailbox.storageUsedInBytes || mailbox['StorageUsed'] || mailbox['StorageUsedInBytes'] || 0);
        let storageQuota = parseInt(mailbox['Storage Quota (Byte)'] || mailbox['Storage Quota'] || mailbox.storageQuotaInBytes || mailbox['StorageQuota'] || mailbox['StorageQuotaInBytes'] || 0);
        const itemCount = parseInt(mailbox['Item Count'] || mailbox.itemCount || mailbox['ItemCount'] || 0);
        const userPrincipalName = mailbox['User Principal Name'] || mailbox['UserPrincipalName'] || mailbox.userPrincipalName || 'Inconnu';
        const emailKey = userPrincipalName.toLowerCase();
        const userInfo = userQuotaMap.get(emailKey);
        const displayName = userInfo?.displayName || mailbox['Display Name'] || mailbox['DisplayName'] || mailbox.displayName || userPrincipalName.split('@')[0];
        if (storageQuota === 0 && userInfo?.quota) {
          storageQuota = userInfo.quota;
        }
        totalMailboxes++;
        totalMailboxSize += storageUsed;
        totalItemCount += itemCount;
        mailboxQuotas.push({
          displayName: displayName,
          user: displayName,
          email: userInfo?.email || userPrincipalName,
          storageUsed: storageUsed,
          storageQuota: storageQuota,
          usagePercent: storageQuota > 0 ? Math.round(storageUsed / storageQuota * 100) : 0,
          quotaPercent: storageQuota > 0 ? Math.round(storageUsed / storageQuota * 100) : 0,
          itemCount: itemCount
        });
      });
    }
    const daysCount = dailyActivity.length || 1;
    const avgSent = Math.round(totalSent / daysCount);
    const avgReceived = Math.round(totalReceived / daysCount);
    const avgRead = Math.round(totalRead / daysCount);
    const readRate = totalReceived > 0 ? (totalRead / totalReceived * 100).toFixed(1) : 0;
    const averageMailboxSize = totalMailboxes > 0 ? Math.round(totalMailboxSize / totalMailboxes) : 0;
    const averageItemCount = totalMailboxes > 0 ? Math.round(totalItemCount / totalMailboxes) : 0;
    const weeklyStats = {
      monday: {
        sent: 0,
        received: 0,
        read: 0,
        count: 0
      },
      tuesday: {
        sent: 0,
        received: 0,
        read: 0,
        count: 0
      },
      wednesday: {
        sent: 0,
        received: 0,
        read: 0,
        count: 0
      },
      thursday: {
        sent: 0,
        received: 0,
        read: 0,
        count: 0
      },
      friday: {
        sent: 0,
        received: 0,
        read: 0,
        count: 0
      },
      saturday: {
        sent: 0,
        received: 0,
        read: 0,
        count: 0
      },
      sunday: {
        sent: 0,
        received: 0,
        read: 0,
        count: 0
      }
    };
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    if (dailyActivity && dailyActivity.length > 0) {
      dailyActivity.forEach(day => {
        const date = new Date(day.date);
        if (!isNaN(date.getTime())) {
          const dayOfWeek = dayNames[date.getDay()];
          if (weeklyStats[dayOfWeek]) {
            weeklyStats[dayOfWeek].sent += day.sent || 0;
            weeklyStats[dayOfWeek].received += day.received || 0;
            weeklyStats[dayOfWeek].read += day.read || 0;
            weeklyStats[dayOfWeek].count++;
          }
        }
      });
    }
    const weeklyStatsFormatted = {
      lundi: {
        sent: weeklyStats.monday.count > 0 ? Math.round(weeklyStats.monday.sent / weeklyStats.monday.count) : 0,
        received: weeklyStats.monday.count > 0 ? Math.round(weeklyStats.monday.received / weeklyStats.monday.count) : 0,
        read: weeklyStats.monday.count > 0 ? Math.round(weeklyStats.monday.read / weeklyStats.monday.count) : 0
      },
      mardi: {
        sent: weeklyStats.tuesday.count > 0 ? Math.round(weeklyStats.tuesday.sent / weeklyStats.tuesday.count) : 0,
        received: weeklyStats.tuesday.count > 0 ? Math.round(weeklyStats.tuesday.received / weeklyStats.tuesday.count) : 0,
        read: weeklyStats.tuesday.count > 0 ? Math.round(weeklyStats.tuesday.read / weeklyStats.tuesday.count) : 0
      },
      mercredi: {
        sent: weeklyStats.wednesday.count > 0 ? Math.round(weeklyStats.wednesday.sent / weeklyStats.wednesday.count) : 0,
        received: weeklyStats.wednesday.count > 0 ? Math.round(weeklyStats.wednesday.received / weeklyStats.wednesday.count) : 0,
        read: weeklyStats.wednesday.count > 0 ? Math.round(weeklyStats.wednesday.read / weeklyStats.wednesday.count) : 0
      },
      jeudi: {
        sent: weeklyStats.thursday.count > 0 ? Math.round(weeklyStats.thursday.sent / weeklyStats.thursday.count) : 0,
        received: weeklyStats.thursday.count > 0 ? Math.round(weeklyStats.thursday.received / weeklyStats.thursday.count) : 0,
        read: weeklyStats.thursday.count > 0 ? Math.round(weeklyStats.thursday.read / weeklyStats.thursday.count) : 0
      },
      vendredi: {
        sent: weeklyStats.friday.count > 0 ? Math.round(weeklyStats.friday.sent / weeklyStats.friday.count) : 0,
        received: weeklyStats.friday.count > 0 ? Math.round(weeklyStats.friday.received / weeklyStats.friday.count) : 0,
        read: weeklyStats.friday.count > 0 ? Math.round(weeklyStats.friday.read / weeklyStats.friday.count) : 0
      },
      samedi: {
        sent: weeklyStats.saturday.count > 0 ? Math.round(weeklyStats.saturday.sent / weeklyStats.saturday.count) : 0,
        received: weeklyStats.saturday.count > 0 ? Math.round(weeklyStats.saturday.received / weeklyStats.saturday.count) : 0,
        read: weeklyStats.saturday.count > 0 ? Math.round(weeklyStats.saturday.read / weeklyStats.saturday.count) : 0
      },
      dimanche: {
        sent: weeklyStats.sunday.count > 0 ? Math.round(weeklyStats.sunday.sent / weeklyStats.sunday.count) : 0,
        received: weeklyStats.sunday.count > 0 ? Math.round(weeklyStats.sunday.received / weeklyStats.sunday.count) : 0,
        read: weeklyStats.sunday.count > 0 ? Math.round(weeklyStats.sunday.read / weeklyStats.sunday.count) : 0
      }
    };
    let topUsers = [];
    let allUsersMap = new Map();
    if (usersWithMailboxSettings && usersWithMailboxSettings.value) {
      usersWithMailboxSettings.value.forEach(u => {
        const emailKey = (u.userPrincipalName || u.mail || '').toLowerCase();
        if (emailKey) {
          allUsersMap.set(emailKey, {
            displayName: u.displayName || u.mail || u.userPrincipalName,
            userPrincipalName: u.userPrincipalName || u.mail
          });
        }
      });
    }
    if (emailActivityUserDetail && emailActivityUserDetail.value) {
      const userMap = new Map();
      emailActivityUserDetail.value.forEach(user => {
        const identifier = user['User Principal Name'] || user['UserPrincipalName'] || user.userPrincipalName || '';
        const displayName = user['Display Name'] || user['DisplayName'] || user.displayName || '';
        const sent = parseInt(user['Send Count'] || user['Send'] || user.send || user.sendCount || 0);
        const received = parseInt(user['Receive Count'] || user['Receive'] || user.receive || user.receiveCount || 0);
        const read = parseInt(user['Read Count'] || user['Read'] || user.read || user.readCount || 0);
        const isHashedId = /^[0-9A-F]{32,}$/i.test(identifier);
        if (isHashedId) {
          let mappedUser = null;
          if (activeUsersReport && activeUsersReport.value) {
            const matched = activeUsersReport.value.find(activeUser => {
              const activeUserId = activeUser['User Id'] || activeUser['UserId'] || '';
              return activeUserId === identifier || activeUserId.toLowerCase() === identifier.toLowerCase();
            });
            if (matched) {
              const matchedEmail = matched['User Principal Name'] || matched['UserPrincipalName'] || '';
              if (matchedEmail && matchedEmail.includes('@')) {
                const userInfo = allUsersMap.get(matchedEmail.toLowerCase());
                if (userInfo) {
                  mappedUser = userInfo;
                }
              }
            }
          }
          if (!userMap.has(identifier)) {
            userMap.set(identifier, {
              displayName: mappedUser?.displayName || displayName || `User ${identifier.substring(0, 8)}...`,
              userPrincipalName: mappedUser?.userPrincipalName || identifier,
              email: mappedUser?.userPrincipalName || identifier,
              sent: 0,
              received: 0,
              read: 0,
              total: 0
            });
          }
          const userStat = userMap.get(identifier);
          userStat.sent += sent;
          userStat.received += received;
          userStat.read += read;
          userStat.total = userStat.sent + userStat.received;
        } else if (identifier.includes('@')) {
          const emailKey = identifier.toLowerCase();
          if (!userMap.has(emailKey)) {
            const userInfo = allUsersMap.get(emailKey) || {
              displayName: displayName || emailKey.split('@')[0],
              userPrincipalName: identifier
            };
            userMap.set(emailKey, {
              displayName: userInfo.displayName,
              userPrincipalName: userInfo.userPrincipalName,
              email: identifier,
              sent: 0,
              received: 0,
              read: 0,
              total: 0
            });
          }
          const userStat = userMap.get(emailKey);
          userStat.sent += sent;
          userStat.received += received;
          userStat.read += read;
          userStat.total = userStat.sent + userStat.received;
        }
      });
      topUsers = Array.from(userMap.values()).filter(user => user.total > 0).sort((a, b) => b.total - a.total).slice(0, 5).map(user => ({
        name: user.displayName || user.email.split('@')[0] || user.email,
        email: user.userPrincipalName || user.email,
        sent: user.sent,
        received: user.received,
        read: user.read,
        total: user.total
      }));
    }
    mailboxQuotas.sort((a, b) => b.storageUsed - a.storageUsed);
    return {
      success: true,
      emailActivity: {
        sent: totalSent,
        received: totalReceived,
        read: totalRead,
        period: period,
        dailyActivity: dailyActivity,
        averages: {
          sent: avgSent,
          received: avgReceived,
          read: avgRead
        },
        readRate: parseFloat(readRate),
        weeklyStats: weeklyStatsFormatted
      },
      mailboxes: {
        total: totalMailboxes,
        totalSize: formatBytes(totalMailboxSize),
        averageSize: formatBytes(averageMailboxSize),
        totalItems: totalItemCount,
        averageItems: averageItemCount,
        quotas: mailboxQuotas
      },
      appUsage: emailAppUsage || null,
      topUsers: topUsers,
      lastUpdate: new Date().toISOString()
    };
  } catch (error) {
    return {
      success: false,
      error: error.message || "Error retrieving Exchange data"
    };
  }
}
async function fetchTeamsDataInternal(accessToken, startDate, endDate, period = 'D90') {
  try {
    const parseNumber = value => {
      if (value === null || value === undefined) return 0;
      if (typeof value === "number") {
        return isNaN(value) ? 0 : value;
      }
      if (typeof value === "string") {
        const cleaned = value.replace(/,/g, "").trim();
        if (cleaned === "") return 0;
        const parsed = parseFloat(cleaned);
        return isNaN(parsed) ? 0 : parsed;
      }
      return 0;
    };
    const normalizeBoolean = value => {
      if (typeof value === "boolean") return value;
      if (typeof value === "string") {
        const normalized = value.trim().toLowerCase();
        return normalized === "true" || normalized === "yes" || normalized === "1";
      }
      if (typeof value === "number") return value === 1;
      return false;
    };
    const getDateKey = value => {
      if (!value) return null;
      try {
        const date = new Date(value);
        if (isNaN(date.getTime())) return null;
        return date.toISOString().split("T")[0];
      } catch {
        return null;
      }
    };
    const [teams, teamsActivity, teamsDeviceUsage, callRecords, teamsActivityCounts] = await Promise.all([callMicrosoftGraph("/teams", accessToken, {
      getAllPages: true
    }).catch(() => null), callMicrosoftGraph(`/reports/getTeamsUserActivityUserDetail(period='${period}')`, accessToken, {
      isReport: true
    }).catch(() => null), callMicrosoftGraph(`/reports/getTeamsDeviceUsageUserDetail(period='${period}')`, accessToken, {
      isReport: true
    }).catch(() => null), callMicrosoftGraph("/communications/callRecords", accessToken, {
      getAllPages: true
    }).catch(() => null), callMicrosoftGraph(`/reports/getTeamsUserActivityCounts(period='${period}')`, accessToken, {
      isReport: true
    }).catch(() => null)]);
    let totalTeams = 0;
    let activeUsers = new Set();
    let totalMessages = 0;
    let totalMeetings = 0;
    let totalCalls = 0;
    let totalCallDuration = 0;
    let teamChatMessages = 0;
    let privateChatMessages = 0;
    let urgentMessages = 0;
    let postMessages = 0;
    let replyMessages = 0;
    let meetingsOrganized = 0;
    let meetingsAttended = 0;
    let adHocMeetingsOrganized = 0;
    let adHocMeetingsAttended = 0;
    let scheduledOneTimeOrganized = 0;
    let scheduledOneTimeAttended = 0;
    let scheduledRecurringOrganized = 0;
    let scheduledRecurringAttended = 0;
    let callCountFromActivity = 0;
    let callDurationFromActivity = 0;
    let audioDurationSeconds = 0;
    let videoDurationSeconds = 0;
    let screenShareDurationSeconds = 0;
    let hasOtherActionCount = 0;
    let licensedUsers = 0;
    let deletedUsers = 0;
    let reportPeriod = null;
    let reportRefreshDate = null;
    const dailyActivityMap = new Map();
    if (teams && teams.value) {
      totalTeams = teams.value.length;
    }
    const teamMemberCounts = new Map();
    const teamChannelCounts = new Map();
    if (teams && teams.value && teams.value.length > 0) {
      const teamsForCounts = teams.value.slice(0, 50);
      try {
        await Promise.all(teamsForCounts.map(async team => {
          try {
            const [members, channels] = await Promise.all([callMicrosoftGraph(`/teams/${team.id}/members`, accessToken, {
              getAllPages: true
            }).catch(() => null), callMicrosoftGraph(`/teams/${team.id}/channels`, accessToken, {
              getAllPages: true
            }).catch(() => null)]);
            teamMemberCounts.set(team.id, Array.isArray(members?.value) ? members.value.length : 0);
            teamChannelCounts.set(team.id, Array.isArray(channels?.value) ? channels.value.length : 0);
          } catch {
            teamMemberCounts.set(team.id, 0);
            teamChannelCounts.set(team.id, 0);
          }
        }));
      } catch {}
    }
    if (teamsActivity && teamsActivity.value) {
      if (teamsActivity.value.length > 0) {
        reportRefreshDate = teamsActivity.value[0]['Report Refresh Date'] || teamsActivity.value[0]['ReportRefreshDate'] || null;
        reportPeriod = teamsActivity.value[0]['Report Period'] || teamsActivity.value[0]['ReportPeriod'] || null;
      }
      teamsActivity.value.forEach(user => {
        const userPrincipalName = user['User Principal Name'] || user['UserPrincipalName'] || user.userPrincipalName || user['User'] || user['User Name'] || '';
        const lastActivityDate = user['Last Activity Date'] || user['LastActivityDate'] || user.lastActivityDate || null;
        const dateKey = getDateKey(lastActivityDate);
        const isLicensed = normalizeBoolean(user['Is Licensed'] || user['IsLicensed'] || user.isLicensed);
        const isDeleted = normalizeBoolean(user['Is Deleted'] || user['IsDeleted'] || user.isDeleted);
        const hasOtherAction = normalizeBoolean(user['Has Other Action'] || user['HasOtherAction'] || user.hasOtherAction);
        if (isLicensed) licensedUsers++;
        if (isDeleted) deletedUsers++;
        if (hasOtherAction) hasOtherActionCount++;
        let matchesMonitoringPeriod = true;
        if (startDate && endDate) {
          if (!lastActivityDate || lastActivityDate === '') {
            matchesMonitoringPeriod = false;
          } else {
            try {
              const activityDate = new Date(lastActivityDate);
              matchesMonitoringPeriod = activityDate >= startDate && activityDate <= endDate;
            } catch {
              matchesMonitoringPeriod = false;
            }
          }
        }
        const teamChatMessageCount = parseNumber(user['Team Chat Message Count'] || user['TeamChatMessageCount'] || user['Team Chat Messages'] || user['TeamChatMessages'] || user.teamChatMessageCount || user.teamChatMessages || user['Team Chat'] || user['TeamChat']);
        const privateChatMessageCount = parseNumber(user['Private Chat Message Count'] || user['PrivateChatMessageCount'] || user['Private Chat Messages'] || user['PrivateChatMessages'] || user.privateChatMessageCount || user.privateChatMessages || user['Private Chat'] || user['PrivateChat']);
        const meetingCount = parseNumber(user['Meeting Count'] || user['MeetingCount'] || user['Meetings'] || user.meetingCount || user.meetings || user['Total Meetings'] || user['TotalMeetings'] || user['Meeting']);
        const meetingsOrganizedCount = parseNumber(user['Meetings Organized Count'] || user['MeetingsOrganizedCount'] || user['Meetings Organized'] || user.meetingsOrganized || user['Organized Meetings']);
        const meetingsAttendedCount = parseNumber(user['Meetings Attended Count'] || user['MeetingsAttendedCount'] || user['Meetings Attended'] || user.meetingsAttended || user['Attended Meetings']);
        const adHocMeetingsOrganizedCount = parseNumber(user['Ad Hoc Meetings Organized Count'] || user['AdHocMeetingsOrganizedCount'] || user['Ad Hoc Meetings Organized'] || user['AdHocMeetingsOrganized'] || user.adHocMeetingsOrganized);
        const adHocMeetingsAttendedCount = parseNumber(user['Ad Hoc Meetings Attended Count'] || user['AdHocMeetingsAttendedCount'] || user['Ad Hoc Meetings Attended'] || user['AdHocMeetingsAttended'] || user.adHocMeetingsAttended);
        const scheduledOneTimeOrganizedCount = parseNumber(user['Scheduled One-time Meetings Organized Count'] || user['Scheduled One-time Meetings Organized'] || user['ScheduledOnetimeMeetingsOrganizedCount'] || user['ScheduledOneTimeMeetingsOrganized'] || user.scheduledOneTimeMeetingsOrganized);
        const scheduledOneTimeAttendedCount = parseNumber(user['Scheduled One-time Meetings Attended Count'] || user['Scheduled One-time Meetings Attended'] || user['ScheduledOnetimeMeetingsAttendedCount'] || user['ScheduledOneTimeMeetingsAttended'] || user.scheduledOneTimeMeetingsAttended);
        const scheduledRecurringOrganizedCount = parseNumber(user['Scheduled Recurring Meetings Organized Count'] || user['Scheduled Recurring Meetings Organized'] || user['ScheduledRecurringMeetingsOrganizedCount'] || user['ScheduledRecurringMeetingsOrganized'] || user.scheduledRecurringMeetingsOrganized);
        const scheduledRecurringAttendedCount = parseNumber(user['Scheduled Recurring Meetings Attended Count'] || user['Scheduled Recurring Meetings Attended'] || user['ScheduledRecurringMeetingsAttendedCount'] || user['ScheduledRecurringMeetingsAttended'] || user.scheduledRecurringMeetingsAttended);
        const urgentMessagesCount = parseNumber(user['Urgent Messages'] || user['UrgentMessages'] || user.urgentMessages);
        const postMessagesCount = parseNumber(user['Post Messages'] || user['PostMessages'] || user.postMessages);
        const replyMessagesCount = parseNumber(user['Reply Messages'] || user['ReplyMessages'] || user.replyMessages);
        const callCount = parseNumber(user['Call Count'] || user['Calls'] || user['Total Calls'] || user['CallCount'] || user.callCount);
        const audioDuration = parseNumber(user['Audio Duration In Seconds'] || user['Audio Duration'] || user['AudioDurationInSeconds'] || user.audioDurationInSeconds);
        const videoDuration = parseNumber(user['Video Duration In Seconds'] || user['Video Duration'] || user['VideoDurationInSeconds'] || user.videoDurationInSeconds);
        const screenShareDuration = parseNumber(user['Screen Share Duration In Seconds'] || user['Screen Share Duration'] || user['ScreenShareDurationInSeconds'] || user.screenShareDurationInSeconds);
        if (dateKey) {
          if (!dailyActivityMap.has(dateKey)) {
            dailyActivityMap.set(dateKey, {
              date: dateKey,
              channelMessages: 0,
              chatMessages: 0,
              oneOnOneCalls: 0,
              totalMeetings: 0
            });
          }
          const dailyEntry = dailyActivityMap.get(dateKey);
          dailyEntry.channelMessages += teamChatMessageCount;
          dailyEntry.chatMessages += privateChatMessageCount;
          dailyEntry.oneOnOneCalls += callCount;
          dailyEntry.totalMeetings += meetingCount;
        }
        if (!matchesMonitoringPeriod) {
          return;
        }
        teamChatMessages += teamChatMessageCount;
        privateChatMessages += privateChatMessageCount;
        urgentMessages += urgentMessagesCount;
        postMessages += postMessagesCount;
        replyMessages += replyMessagesCount;
        totalMessages += teamChatMessageCount + privateChatMessageCount;
        totalMeetings += meetingCount;
        meetingsOrganized += meetingsOrganizedCount;
        meetingsAttended += meetingsAttendedCount;
        adHocMeetingsOrganized += adHocMeetingsOrganizedCount;
        adHocMeetingsAttended += adHocMeetingsAttendedCount;
        scheduledOneTimeOrganized += scheduledOneTimeOrganizedCount;
        scheduledOneTimeAttended += scheduledOneTimeAttendedCount;
        scheduledRecurringOrganized += scheduledRecurringOrganizedCount;
        scheduledRecurringAttended += scheduledRecurringAttendedCount;
        callCountFromActivity += callCount;
        audioDurationSeconds += audioDuration;
        videoDurationSeconds += videoDuration;
        screenShareDurationSeconds += screenShareDuration;
        callDurationFromActivity += audioDuration + videoDuration + screenShareDuration;
        if (teamChatMessageCount > 0 || privateChatMessageCount > 0 || meetingCount > 0 || callCount > 0) {
          if (userPrincipalName) {
            activeUsers.add(userPrincipalName);
          }
        }
      });
    }
    if (callRecords && callRecords.value && callRecords.value.length > 0) {
      let filteredCalls = callRecords.value;
      if (startDate && endDate) {
        filteredCalls = callRecords.value.filter(call => {
          const callStartDate = call.startDateTime || call.startDate;
          if (!callStartDate) return false;
          try {
            const callDate = new Date(callStartDate);
            return callDate >= startDate && callDate <= endDate;
          } catch {
            return false;
          }
        });
      }
      totalCalls = filteredCalls.length;
      filteredCalls.forEach(call => {
        let callDurationSeconds = 0;
        if (call.startDateTime && call.endDateTime) {
          try {
            const startDate = new Date(call.startDateTime);
            const endDate = new Date(call.endDateTime);
            if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime()) && endDate > startDate) {
              callDurationSeconds = Math.floor((endDate - startDate) / 1000);
            }
          } catch (e) {}
        }
        if (callDurationSeconds === 0) {
          const duration = call.duration || call.callDuration || call.durationInSeconds || call.callDurationInSeconds || 0;
          if (typeof duration === 'string' && duration.startsWith('PT')) {
            const hoursMatch = duration.match(/(\d+)H/);
            const minutesMatch = duration.match(/(\d+)M/);
            const secondsMatch = duration.match(/(\d+)S/);
            const hours = hoursMatch ? parseInt(hoursMatch[1]) : 0;
            const minutes = minutesMatch ? parseInt(minutesMatch[1]) : 0;
            const seconds = secondsMatch ? parseInt(secondsMatch[1]) : 0;
            callDurationSeconds = hours * 3600 + minutes * 60 + seconds;
          } else {
            callDurationSeconds = parseInt(duration || 0);
          }
        }
        totalCallDuration += callDurationSeconds;
      });
    }
    const effectiveCallCount = totalCalls > 0 ? totalCalls : callCountFromActivity;
    const effectiveCallDuration = totalCallDuration > 0 ? totalCallDuration : callDurationFromActivity;
    const formatDuration = seconds => {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor(seconds % 3600 / 60);
      return `${hours}h ${minutes}m`;
    };
    const callsStats = {
      total: effectiveCallCount,
      totalDuration: formatDuration(effectiveCallDuration),
      averageDuration: effectiveCallCount > 0 ? formatDuration(Math.floor(effectiveCallDuration / effectiveCallCount)) : "0h 0m",
      audioDuration: formatDuration(audioDurationSeconds),
      videoDuration: formatDuration(videoDurationSeconds),
      screenShareDuration: formatDuration(screenShareDurationSeconds),
      totalDurationSeconds: effectiveCallDuration,
      audioDurationSeconds,
      videoDurationSeconds,
      screenShareDurationSeconds
    };
    let dailyActivity = Array.from(dailyActivityMap.values()).sort((a, b) => new Date(a.date) - new Date(b.date));
    if (teamsActivityCounts && Array.isArray(teamsActivityCounts.value) && teamsActivityCounts.value.length > 0) {
      dailyActivity = teamsActivityCounts.value.map(day => {
        const date = day.ReportDate || day['Report Date'] || day.reportDate || day.date || '';
        return {
          date,
          channelMessages: parseNumber(day['Team Chat Messages'] || day.TeamChatMessages || day.teamChatMessages || day['Team Chat Message Count']),
          chatMessages: parseNumber(day['Private Chat Messages'] || day.PrivateChatMessages || day.privateChatMessages || day['Private Chat Message Count']),
          oneOnOneCalls: parseNumber(day.Calls || day.calls || day['Call Count'] || day.CallCount),
          totalMeetings: parseNumber(day.Meetings || day.meetings || day['Meeting Count'] || day.MeetingCount)
        };
      }).filter(day => day.date).sort((a, b) => new Date(a.date) - new Date(b.date));
    }
    if (startDate && endDate && dailyActivity.length > 0) {
      const startDateOnly = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
      const endDateOnly = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
      dailyActivity = dailyActivity.filter(day => {
        const dayDate = new Date(day.date);
        if (Number.isNaN(dayDate.getTime())) return false;
        const dayDateOnly = new Date(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate());
        return dayDateOnly >= startDateOnly && dayDateOnly <= endDateOnly;
      });
      teamChatMessages = dailyActivity.reduce((sum, d) => sum + (Number(d.channelMessages) || 0), 0);
      privateChatMessages = dailyActivity.reduce((sum, d) => sum + (Number(d.chatMessages) || 0), 0);
      totalMeetings = dailyActivity.reduce((sum, d) => sum + (Number(d.totalMeetings) || 0), 0);
      callCountFromActivity = dailyActivity.reduce((sum, d) => sum + (Number(d.oneOnOneCalls) || 0), 0);
      urgentMessages = 0;
      meetingsOrganized = 0;
      meetingsAttended = 0;
      adHocMeetingsOrganized = 0;
      callsStats.total = callCountFromActivity;
    }
    const messagesStats = {
      total: teamChatMessages + privateChatMessages,
      teamChat: teamChatMessages,
      privateChat: privateChatMessages,
      urgent: urgentMessages,
      posts: postMessages,
      replies: replyMessages
    };
    const meetingsStats = {
      total: totalMeetings,
      organized: meetingsOrganized,
      attended: meetingsAttended,
      adHoc: {
        organized: adHocMeetingsOrganized,
        attended: adHocMeetingsAttended
      },
      scheduledOneTime: {
        organized: scheduledOneTimeOrganized,
        attended: scheduledOneTimeAttended
      },
      scheduledRecurring: {
        organized: scheduledRecurringOrganized,
        attended: scheduledRecurringAttended
      }
    };
    const usageStats = {
      activeUsers: activeUsers.size,
      licensedUsers,
      deletedUsers,
      otherActions: hasOtherActionCount,
      reportPeriod,
      reportRefreshDate
    };
    const activityStats = {
      totalMessages: messagesStats.total,
      totalMeetings: meetingsStats.total,
      activeUsers: activeUsers.size,
      messages: messagesStats,
      meetings: meetingsStats,
      calls: callsStats,
      usage: usageStats
    };
    const licensedActivity = dailyActivity.length > 0 ? {
      totalChannelMessages: teamChatMessages,
      totalChatMessages: privateChatMessages,
      totalMeetings,
      totalCalls: callCountFromActivity,
      dailyActivity
    } : null;
    return {
      success: true,
      teams: {
        total: totalTeams,
        activeUsers: activeUsers.size,
        teamsList: teams?.value?.slice(0, 50).map(team => ({
          id: team.id,
          displayName: team.displayName,
          description: team.description,
          memberCount: teamMemberCounts.get(team.id) ?? 0,
          channelCount: teamChannelCounts.get(team.id) ?? 0
        })) || []
      },
      activity: activityStats,
      calls: callsStats,
      licensedActivity,
      lastUpdate: new Date().toISOString()
    };
  } catch (error) {
    return {
      success: false,
      error: error.message || "Error retrieving Teams data"
    };
  }
}
async function fetchOneDriveDataInternal(accessToken, startDate, endDate, period = 'D90') {
  try {
    const [onedriveUsage, onedriveActivity, onedriveActivityFileCounts] = await Promise.all([callMicrosoftGraph(`/reports/getOneDriveUsageAccountDetail(period='${period}')`, accessToken, {
      isReport: true
    }).catch(() => null), callMicrosoftGraph(`/reports/getOneDriveActivityUserDetail(period='${period}')`, accessToken, {
      isReport: true
    }).catch(() => null), callMicrosoftGraph(`/reports/getOneDriveActivityFileCounts(period='${period}')`, accessToken, {
      isReport: true
    }).catch(() => null)]);
    let totalStorageUsed = 0;
    let totalFiles = 0;
    let totalSharedFiles = 0;
    let totalExternalShares = 0;
    let usersNearQuota = [];
    let totalStorage = 0;
    if (onedriveUsage && onedriveUsage.value) {
      onedriveUsage.value.forEach(account => {
        const storageUsed = parseInt(account['Storage Used (Byte)'] || account.storageUsedInBytes || account['Storage Used'] || 0);
        const fileCount = parseInt(account['File Count'] || account.fileCount || account['Files'] || 0);
        const ownerName = account['Owner Display Name'] || account.ownerDisplayName || account['Owner'] || '';
        const ownerEmail = account['Owner Principal Name'] || account.ownerPrincipalName || account['Owner Email'] || '';
        totalStorageUsed += storageUsed;
        totalFiles += fileCount;
        totalStorage += storageUsed;
        const quotaBytes = 1024 * 1024 * 1024 * 1024;
        const usagePercent = storageUsed / quotaBytes * 100;
        if (usagePercent >= 90) {
          usersNearQuota.push({
            name: ownerName,
            email: ownerEmail,
            usagePercent: Math.round(usagePercent),
            used: formatBytes(storageUsed),
            files: fileCount
          });
        }
      });
    }
    let filteredActivity = onedriveActivity?.value || [];
    if (onedriveActivity && onedriveActivity.value && startDate && endDate) {
      filteredActivity = onedriveActivity.value.filter(activity => {
        const activityDate = activity['Last Activity Date'] || activity['LastActivityDate'] || activity['Report Date'] || activity['ReportDate'] || activity.lastActivityDate || activity.reportDate;
        if (!activityDate || activityDate === '') return false;
        try {
          const date = new Date(activityDate);
          const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
          const startDateOnly = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
          const endDateOnly = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
          return dateOnly >= startDateOnly && dateOnly <= endDateOnly;
        } catch {
          return false;
        }
      });
    }
    if (filteredActivity.length > 0) {
      filteredActivity.forEach(activity => {
        const sharedExternally = activity['Shared Externally'] || activity.sharedExternally || 'False';
        const sharedCount = parseInt(activity['Shared Count'] || activity.sharedCount || activity['Shares'] || 0);
        if (sharedExternally === 'True' || sharedExternally === true) {
          totalExternalShares += sharedCount;
        }
        totalSharedFiles += sharedCount;
      });
    }
    const filesByActivityType = {
      viewedOrEdited: 0,
      synced: 0,
      sharedInternally: 0,
      sharedExternally: 0
    };
    let filteredFileCounts = onedriveActivityFileCounts?.value || [];
    if (onedriveActivityFileCounts && onedriveActivityFileCounts.value && startDate && endDate) {
      filteredFileCounts = onedriveActivityFileCounts.value.filter(entry => {
        const reportDate = entry['Report Date'] || entry['ReportDate'] || entry['Date'] || entry.reportDate || entry.date;
        if (!reportDate || reportDate === '') return false;
        try {
          const date = new Date(reportDate);
          const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
          const startDateOnly = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
          const endDateOnly = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
          return dateOnly >= startDateOnly && dateOnly <= endDateOnly;
        } catch {
          return false;
        }
      });
    }
    if (filteredFileCounts.length > 0) {
      filteredFileCounts.forEach(entry => {
        const viewedOrEdited = parseInt(entry['Viewed Or Edited File Count'] || entry['Viewed or Edited File Count'] || entry['ViewedOrEditedFileCount'] || entry['Viewed Or Edited'] || entry.viewedOrEdited || 0);
        const synced = parseInt(entry['Synced File Count'] || entry['SyncedFileCount'] || entry['Synced'] || entry.synced || 0);
        const sharedInternal = parseInt(entry['Shared Internally File Count'] || entry['SharedInternallyFileCount'] || entry['Shared Internally'] || entry.sharedInternally || 0);
        const sharedExternal = parseInt(entry['Shared Externally File Count'] || entry['SharedExternallyFileCount'] || entry['Shared Externally'] || entry.sharedExternally || 0);
        filesByActivityType.viewedOrEdited += viewedOrEdited;
        filesByActivityType.synced += synced;
        filesByActivityType.sharedInternally += sharedInternal;
        filesByActivityType.sharedExternally += sharedExternal;
      });
    }
    return {
      success: true,
      storage: {
        totalUsed: formatBytes(totalStorageUsed),
        totalFiles: totalFiles,
        averagePerUser: onedriveUsage?.value?.length > 0 ? formatBytes(Math.floor(totalStorageUsed / onedriveUsage.value.length)) : "0 B"
      },
      sharing: {
        totalShared: totalSharedFiles,
        externalShares: totalExternalShares,
        internalShares: totalSharedFiles - totalExternalShares,
        byActivityType: {
          viewedOrEdited: filesByActivityType.viewedOrEdited,
          synced: filesByActivityType.synced,
          sharedInternally: filesByActivityType.sharedInternally,
          sharedExternally: filesByActivityType.sharedExternally
        }
      },
      usersNearQuota: usersNearQuota,
      lastUpdate: new Date().toISOString()
    };
  } catch (error) {
    return {
      success: false,
      error: error.message || "Error retrieving OneDrive data"
    };
  }
}
async function saveClientMfaDetailsWithAdminRoles(clientId, accessToken) {
  const key = String(clientId);
  const existing = mfaRefreshInFlight.get(key);
  if (existing) return existing;
  const promise = (async () => {
    await ensureAzureMfaSchema();
    const usersData = await callMicrosoftGraph("/users?$select=id,displayName,mail,userPrincipalName,accountEnabled", accessToken, {
      getAllPages: true
    }).catch(() => null);
    if (!usersData?.value?.length) {
      console.warn(`[azure-mfa] No users returned from Graph for client ${clientId}`);
      return {
        saved: 0,
        userMfaDetails: []
      };
    }
    const [userMfaDetails, administrators] = await Promise.all([
      buildUserMfaDetails(accessToken, usersData.value),
      fetchDirectoryAdministrators(accessToken, usersData.value)
    ]);
    const enriched = userMfaDetails.map(detail => enrichUserMfaWithAdminRoles(detail, administrators));
    let saved = 0;
    try {
      saved = await persistUserMfaDetails(clientId, userMfaDetails, administrators);
    } catch (err) {
      console.error(`Failed to save MFA + admin roles (sync) for client ${clientId}:`, err);
    }
    return {
      saved,
      userMfaDetails: enriched,
      administrators
    };
  })().finally(() => {
    if (mfaRefreshInFlight.get(key) === promise) mfaRefreshInFlight.delete(key);
  });
  mfaRefreshInFlight.set(key, promise);
  return promise;
}
router.get("/sync-all", verifyJWT, async (req, res) => {
  try {
    const clientId = req.query.clientId ? parseInt(req.query.clientId) : null;
    const startDate = req.query.startDate || null;
    const endDate = req.query.endDate || null;
    const period = 'D90';
    if (!clientId) {
      return res.status(400).json({
        success: false,
        error: "clientId is required for full synchronization",
        errorCode: "MS_SYNC_CLIENT_REQUIRED"
      });
    }
    const credentials = await getClientOffice365Credentials(clientId, office365CredentialSelector(req));
    if (!credentials) {
      return res.status(400).json({
        success: false,
        error: "Azure configuration not found for this client",
        errorCode: "MS_AUTH_CONFIG_MISSING"
      });
    }
    if (!credentials.tenantId || !credentials.clientId || !credentials.clientSecret) {
      return res.status(400).json({
        success: false,
        error: "Azure configuration incomplete for this client",
        errorCode: "MS_AUTH_CONFIG_INCOMPLETE"
      });
    }
    const accessToken = await getMicrosoftGraphToken(credentials.tenantId, credentials.clientId, credentials.clientSecret);
    const dataResult = await fetchOffice365DataInternal(clientId, credentials);
    const startDateObj = startDate ? new Date(startDate) : null;
    const endDateObj = endDate ? new Date(endDate) : null;
    const exchangePromise = fetchExchangeDataInternal(accessToken, startDateObj, endDateObj, period);
    const teamsPromise = fetchTeamsDataInternal(accessToken, startDateObj, endDateObj, period);
    const onedrivePromise = fetchOneDriveDataInternal(accessToken, startDateObj, endDateObj, period);
    const sharepointPromise = (async () => {
      try {
        const [sharepointUsage, sharepointActivity, sites] = await Promise.all([callMicrosoftGraph(`/reports/getSharePointSiteUsageDetail(period='${period}')`, accessToken, {
          isReport: true
        }).catch(() => null), callMicrosoftGraph(`/reports/getSharePointActivityUserDetail(period='${period}')`, accessToken, {
          isReport: true
        }).catch(() => null), callMicrosoftGraph("/sites?$select=id,displayName,webUrl,createdDateTime,lastModifiedDateTime", accessToken, {
          getAllPages: true
        }).catch(() => null)]);
        const sitesList = sites?.value?.map(site => ({
          id: site.id,
          name: site.displayName,
          webUrl: site.webUrl,
          createdDateTime: site.createdDateTime,
          lastActivityDate: site.lastModifiedDateTime,
          isActive: true
        })) || [];
        return {
          success: true,
          sites: sitesList,
          stats: {
            totalSites: sitesList.length,
            activeSites: sitesList.length
          }
        };
      } catch (err) {
        return {
          success: false,
          error: err.message
        };
      }
    })();
    const securityPromise = (async () => {
      try {
        const [mfaReport, usersData, secureScores] = await Promise.all([fetchUserRegistrationDetails(accessToken).catch(() => null), callMicrosoftGraph("/users?$select=id,displayName,mail,userPrincipalName,accountEnabled", accessToken, {
          getAllPages: true
        }).catch(() => null), callMicrosoftGraph("/security/secureScores?$orderby=createdDateTime desc", accessToken, {
          getAllPages: true
        }).catch(() => null)]);
        const userMfaDetails = await buildUserMfaDetails(accessToken, usersData?.value || [], mfaReport);
        const administrators = await fetchDirectoryAdministrators(accessToken, usersData?.value || []);
        const mfaStats = buildMfaStatsFromUsers(userMfaDetails, usersData?.value?.length || 0);
        const identitySecureScore = secureScores?.value?.find(score => score.controlCategory === 'Identity' || !score.controlCategory) || secureScores?.value?.[0];
        const latestWithControls = getLatestSecureScoreWithControls(secureScores) || identitySecureScore;
        const controlScores = (latestWithControls?.controlScores || []).filter(control => {
          const current = Number(control?.score ?? control?.currentScore ?? 0);
          const max = Number(control?.maxScore ?? 0);
          return Number.isFinite(max) && max > 0 && current < max;
        }).slice(0, 25).map(control => ({
          id: control.controlName || control.controlId || control.id,
          controlName: control.controlName || null,
          title: String(control.description || control.title || control.controlName || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 220),
          currentScore: Number(control.score ?? control.currentScore ?? 0),
          maxScore: Number(control.maxScore ?? 0),
          score: Number(control.score ?? control.currentScore ?? 0)
        }));
        return {
          success: true,
          secureScore: identitySecureScore ? {
            currentScore: identitySecureScore.currentScore || 0,
            maxScore: identitySecureScore.maxScore || 0,
            percentage: identitySecureScore.maxScore > 0 ? identitySecureScore.currentScore / identitySecureScore.maxScore * 100 : 0
          } : null,
          controlScores,
          secureScoreRecommendations: controlScores,
          mfa: {
            usersWithMFA: mfaStats.usersWithMFA,
            usersWithoutMFA: mfaStats.usersWithoutMFA,
            totalUsers: mfaStats.totalUsers,
            mfaRate: mfaStats.mfaRate,
            mfaMethods: mfaStats.mfaMethods
          },
          adminStats: {
            total: administrators.length,
            withMFA: administrators.filter(admin => userMfaDetails.some(user => user.id === admin.id && user.hasMFA)).length,
            withoutMFA: administrators.filter(admin => !userMfaDetails.some(user => user.id === admin.id && user.hasMFA)).length
          },
          userMfaDetails: userMfaDetails.map(detail => enrichUserMfaWithAdminRoles(detail, administrators)),
          administrators
        };
      } catch (err) {
        return {
          success: false,
          error: err.message
        };
      }
    })();
    const [data, exchangeData, teamsData, onedriveData, sharepointData, securityData, mfaAdminSave] = await Promise.allSettled([Promise.resolve(dataResult), exchangePromise, teamsPromise, onedrivePromise, sharepointPromise, securityPromise, saveClientMfaDetailsWithAdminRoles(clientId, accessToken)]);
    const dataFinal = data.status === 'fulfilled' ? data.value : {
      success: false,
      error: data.reason?.message
    };
    const exchangeFinal = exchangeData.status === 'fulfilled' ? exchangeData.value : {
      success: false,
      error: exchangeData.reason?.message
    };
    const teamsFinal = teamsData.status === 'fulfilled' ? teamsData.value : {
      success: false,
      error: teamsData.reason?.message
    };
    const onedriveFinal = onedriveData.status === 'fulfilled' ? onedriveData.value : {
      success: false,
      error: onedriveData.reason?.message
    };
    const sharepointFinal = sharepointData.status === 'fulfilled' ? sharepointData.value : {
      success: false,
      error: sharepointData.reason?.message
    };
    const securityFinal = securityData.status === 'fulfilled' ? securityData.value : {
      success: false,
      error: securityData.reason?.message
    };
    const mfaAdminSaveFinal = mfaAdminSave.status === 'fulfilled' ? mfaAdminSave.value : {
      saved: 0,
      error: mfaAdminSave.reason?.message || 'MFA save failed'
    };
    if (mfaAdminSave.status === 'rejected') {
      console.error(`[sync-all] MFA save rejected for client ${clientId}:`, mfaAdminSave.reason?.message || mfaAdminSave.reason);
    } else if ((mfaAdminSaveFinal?.saved ?? 0) === 0) {
      console.warn(`[sync-all] MFA save completed with 0 rows for client ${clientId}`);
    }
    const snapshotData = {
      tenantId: credentials.tenantId || null,
      licences: dataFinal.licences || [],
      users: dataFinal.users || [],
      adoptionScore: dataFinal.adoptionScore || null,
      exchangeData: exchangeFinal.success !== false ? exchangeFinal : null,
      teamsData: teamsFinal.success ? teamsFinal : null,
      onedriveData: onedriveFinal.success ? onedriveFinal : null,
      sharepointData: sharepointFinal.success ? sharepointFinal : null,
      securityData: securityFinal.success ? securityFinal : null,
      userMfaDetails: mfaAdminSaveFinal?.userMfaDetails || securityFinal?.userMfaDetails || [],
      lastUpdate: new Date().toISOString()
    };
    try {
      await pool.query(`DELETE FROM v_b_clients_m_o365 
         WHERE client_id = $1 
           AND item_key = $2`, [clientId, credentials.tenantId || null]);
      await pool.query(`INSERT INTO v_b_clients_m_o365 (client_id, item_key, name, data, is_active)
         VALUES ($1, $2, $3, $4, $5)`, [clientId, credentials.tenantId || null, 'Microsoft 365', snapshotData, true]);
    } catch (dbError) {
      return res.status(500).json({
        success: false,
        error: `Error saving: ${dbError.message}`
      });
    }
    res.json({
      success: true,
      message: "Full synchronization completed",
      data: snapshotData,
      mfaSaved: mfaAdminSaveFinal?.saved ?? 0,
      lastUpdate: snapshotData.lastUpdate
    });
  } catch (error) {
    const authError = isMicrosoftAuthError(error);
    const status = authError && error.httpStatus && error.httpStatus < 500 ? 400 : 500;
    res.status(status).json({
      success: false,
      error: error.message || "Full synchronization failed",
      errorCode: error.code || "MS_SYNC_FAILED",
      details: authError ? {
        aadsts: error.aadsts || null,
        tenantHint: error.tenantHint || null,
        microsoftError: error.microsoftError || null
      } : undefined
    });
  }
});
export default router;
