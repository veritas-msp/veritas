import React, { useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend as RechartsLegend, ResponsiveContainer } from "recharts";
import { toast } from "react-toastify";
import API_BASE_URL from "../../../../config";
import { getClientMfaDetails } from "../../../../api/clientOffice365";
import { buildMicrosoftTenantDetailNavigationPayload } from "../../../EnterprisesPage/microsoftTenantSolutionUtils";
import TenantDetailPage from "../../../ServicePage/TenantDetailPage";
import styles from "../RapportMonitoringBuilder.module.css";
import { MonitoringStepShell, MonitoringStepHeader } from "../MonitoringStepLayout";
const licenseNameMapping = {
  ENTERPRISEPACK: "Microsoft 365 E3",
  ENTERPRISEPREMIUM: "Microsoft 365 E5",
  STANDARDWOFFPACK_FACULTY: "Office 365 Education (Faculty)",
  STANDARDWOFFPACK_STUDENT: "Office 365 Education (Students)",
  O365_BUSINESS: "Microsoft 365 Business Basic",
  O365_BUSINESS_ESSENTIALS: "Microsoft 365 Business Essentials",
  O365_BUSINESS_PREMIUM: "Microsoft 365 Business Premium",
  EXCHANGESTANDARD: "Exchange Online Plan 1",
  EXCHANGEENTERPRISE: "Exchange Online Plan 2",
  SHAREPOINTSTANDARD: "SharePoint Online Plan 1",
  SHAREPOINTENTERPRISE: "SharePoint Online Plan 2",
  TEAMS1: "Microsoft Teams (Essentiel)",
  FLOW_FREE: "Power Automate (Gratuit)"
};
function getLicenseDisplayName(licenseId) {
  if (!licenseId) return "Unknown license";
  const normalizedId = licenseId.toUpperCase().trim();
  if (licenseNameMapping[normalizedId]) {
    return licenseNameMapping[normalizedId];
  }
  for (const [key, value] of Object.entries(licenseNameMapping)) {
    if (normalizedId.includes(key) || key.includes(normalizedId)) {
      return value;
    }
  }
  const formatted = licenseId.replace(/_/g, " ").replace(/-/g, " ").split(" ").map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(" ");
  return formatted;
}
const FREE_LICENSE_PATTERNS = ["FLOW_FREE", "STORE", "WINDOWS_STORE", "EXPLORATORY", "TRIAL", "POWER_BI_STANDALONE", "FREE", "GRATUIT"];
function isFreeLicense(lic) {
  const raw = (lic && (lic.nom || lic.displayName) || "").toUpperCase().trim();
  if (!raw) return false;
  return FREE_LICENSE_PATTERNS.some(pattern => raw.includes(pattern.toUpperCase()));
}
function getMfaMethodIcon(methodType) {
  switch (methodType) {
    case "microsoftauthenticatorauthenticationmethod":
      return <Icon icon="mdi:cellphone" />;
    case "phoneauthenticationmethod":
      return <Icon icon="mdi:phone" />;
    case "fido2authenticationmethod":
      return <Icon icon="mdi:usb" />;
    case "softwareoathauthenticationmethod":
      return <Icon icon="mdi:shield-key" />;
    case "temporaryaccesspassauthenticationmethod":
      return <Icon icon="mdi:clock-outline" />;
    case "emailauthenticationmethod":
      return <Icon icon="mdi:email" />;
    default:
      return null;
  }
}
const ADMIN_ROLE_ICONS = [{
  pattern: /global\s*administrator/i,
  icon: "mdi:earth",
  label: "Global Administrator"
}, {
  pattern: /teams\s*administrator/i,
  icon: "mdi:microsoft-teams",
  label: "Teams Administrator"
}, {
  pattern: /exchange\s*administrator/i,
  icon: "mdi:email-outline",
  label: "Exchange Administrator"
}, {
  pattern: /sharepoint\s*administrator/i,
  icon: "mdi:sharepoint",
  label: "SharePoint Administrator"
}, {
  pattern: /user\s*administrator/i,
  icon: "mdi:account-cog",
  label: "User Administrator"
}, {
  pattern: /security\s*administrator/i,
  icon: "mdi:shield-account",
  label: "Security Administrator"
}, {
  pattern: /privileged\s*role/i,
  icon: "mdi:shield-key",
  label: "Privileged Role Administrator"
}, {
  pattern: /billing\s*administrator/i,
  icon: "mdi:credit-card-outline",
  label: "Billing Administrator"
}, {
  pattern: /application\s*administrator/i,
  icon: "mdi:application-cog",
  label: "Application Administrator"
}, {
  pattern: /helpdesk\s*administrator/i,
  icon: "mdi:headset",
  label: "Helpdesk Administrator"
}, {
  pattern: /intune\s*administrator/i,
  icon: "mdi:cellphone-cog",
  label: "Intune Administrator"
}, {
  pattern: /compliance\s*administrator/i,
  icon: "mdi:gavel",
  label: "Compliance Administrator"
}, {
  pattern: /conditional\s*access/i,
  icon: "mdi:shield-lock",
  label: "Conditional Access Administrator"
}, {
  pattern: /authentication\s*administrator/i,
  icon: "mdi:fingerprint",
  label: "Authentication Administrator"
}, {
  pattern: /license\s*administrator/i,
  icon: "mdi:certificate-outline",
  label: "License Administrator"
}, {
  pattern: /groups\s*administrator/i,
  icon: "mdi:account-group",
  label: "Groups Administrator"
}, {
  pattern: /password\s*administrator/i,
  icon: "mdi:form-textbox-password",
  label: "Password Administrator"
}, {
  pattern: /power\s*platform/i,
  icon: "mdi:power",
  label: "Power Platform Administrator"
}, {
  pattern: /cloud\s*application/i,
  icon: "mdi:cloud-cog",
  label: "Cloud Application Administrator"
}, {
  pattern: /directory\s*readers/i,
  icon: "mdi:account-eye",
  label: "Directory Readers"
}, {
  pattern: /reports\s*reader/i,
  icon: "mdi:chart-box-outline",
  label: "Reports Reader"
}, {
  pattern: /administrator|admin/i,
  icon: "mdi:shield-account-outline",
  label: null
}];
function getAdminRoleIcons(adminRoleString) {
  if (adminRoleString == null || String(adminRoleString).trim() === "") return [];
  const roles = String(adminRoleString).split(",").map(r => r.trim()).filter(Boolean);
  const result = [];
  const seenLabels = new Set();
  for (const role of roles) {
    const entry = ADMIN_ROLE_ICONS.find(e => e.pattern.test(role));
    const label = entry?.label || role;
    const icon = entry?.icon || "mdi:shield-account-outline";
    if (!seenLabels.has(label)) {
      seenLabels.add(label);
      result.push({
        icon,
        label: label || role
      });
    }
  }
  return result;
}
function isLikelyServiceAccountFromUser(user) {
  const name = String(user.name || user.displayName || "");
  const upn = String(user.userPrincipalName || user.email || "");
  const email = String(user.email || "");
  const combined = `${name} ${upn} ${email}`.toLowerCase();
  const patterns = [/aad_/, /msol_/, /sync_/, /svc_/, /service_/, /\$@/, /_srv/, /_service/, /_sync/, /compte de service|service account|compte service/, /bot\./, /bot@/, /connector/, /automation/, /azure ad sync|ad sync|dirsync|aadconnect|dir sync/, /directory synchronization|synchronization service|on-premises/, /healthmailbox|systemmailbox|federatedemail/];
  return patterns.some(p => p.test(combined));
}
function getMfaUserForUser(user, mfaDetails) {
  const upn = (user.userPrincipalName || user.email || "").toLowerCase().trim();
  const userId = user.id;
  return Array.isArray(mfaDetails) && mfaDetails.find(m => {
    const mUpn = (m.userPrincipalName || m.user_principal_name || "").toLowerCase().trim();
    if (mUpn && upn && mUpn === upn) return true;
    if (userId && m.id && String(m.id) === String(userId)) return true;
    return false;
  }) || null;
}
const IGNORED_MFA_METHODS = new Set(["passwordauthenticationmethod", "windowshelloforbusinessauthenticationmethod"]);
function userHasMfaFromMfaUser(mfaUser) {
  if (!mfaUser) return false;
  if (mfaUser.has_mfa === true) return true;
  const methods = mfaUser.mfa_methods || mfaUser.mfaMethods || [];
  if (!Array.isArray(methods)) return false;
  return methods.some(m => !IGNORED_MFA_METHODS.has(m));
}
function getMethodsFromMfaUser(mfaUser) {
  const methods = mfaUser?.mfa_methods || mfaUser?.mfaMethods || [];
  if (!Array.isArray(methods)) return [];
  return methods.filter(m => !IGNORED_MFA_METHODS.has(m));
}
const USER_FILTER_ALL = "all";
const USER_FILTER_ACTIVE_30 = "active30";
const USER_FILTER_BLOCKED = "blocked";
const USER_FILTER_INACTIVE_90 = "inactive90";
const USER_FILTER_MFA_ACTIF = "mfaActive";
const USER_FILTER_MFA_INACTIF = "mfaInactive";
const USER_FILTER_ADMIN = "admin";
const USER_FILTER_NON_ADMIN = "nonAdmin";
const USER_FILTER_METHOD_PREFIX = "method_";
const USER_FILTER_DOMAIN_PREFIX = "domain_";
const NO_DOMAIN_KEY = "__no_domain__";
function getUserDomain(user) {
  const raw = (user.userPrincipalName || user.email || "").toString().trim();
  const at = raw.indexOf("@");
  if (at === -1) return NO_DOMAIN_KEY;
  const domain = raw.slice(at + 1).toLowerCase();
  return domain || NO_DOMAIN_KEY;
}
function userHasMfa(mfaUser) {
  return userHasMfaFromMfaUser(mfaUser);
}
function userHasMethod(mfaUser, methodKey) {
  if (!mfaUser) return false;
  const methods = mfaUser.mfa_methods || mfaUser.mfaMethods || [];
  return Array.isArray(methods) && methods.includes(methodKey);
}
function getFilteredUsers(users, filter, mfaDetails = []) {
  if (!users) return [];
  if (filter === USER_FILTER_ALL) return users;
  const period30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const period90 = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  switch (filter) {
    case USER_FILTER_ACTIVE_30:
      return users.filter(u => {
        const lastLogin = u.lastLoginDate ? new Date(u.lastLoginDate) : null;
        return lastLogin && lastLogin >= period30;
      });
    case USER_FILTER_BLOCKED:
      return users.filter(u => u.accountEnabled === false);
    case USER_FILTER_INACTIVE_90:
      return users.filter(u => {
        const lastLogin = u.lastLoginDate ? new Date(u.lastLoginDate) : null;
        return !lastLogin || lastLogin < period90;
      });
    case USER_FILTER_MFA_ACTIF:
      return users.filter(u => userHasMfa(getMfaUserForUser(u, mfaDetails)));
    case USER_FILTER_ADMIN:
      return users.filter(u => {
        const m = getMfaUserForUser(u, mfaDetails);
        return m && m.is_admin === true;
      });
    case USER_FILTER_NON_ADMIN:
      return users.filter(u => {
        const m = getMfaUserForUser(u, mfaDetails);
        return m && m.is_admin !== true;
      });
    case USER_FILTER_MFA_INACTIF:
      return users.filter(u => {
        const m = getMfaUserForUser(u, mfaDetails);
        return m && !userHasMfa(m);
      });
    default:
      if (filter.startsWith(USER_FILTER_DOMAIN_PREFIX)) {
        const domain = filter.slice(USER_FILTER_DOMAIN_PREFIX.length);
        return users.filter(u => getUserDomain(u) === domain);
      }
      if (filter.startsWith(USER_FILTER_METHOD_PREFIX)) {
        const methodKey = filter.slice(USER_FILTER_METHOD_PREFIX.length);
        return users.filter(u => userHasMethod(getMfaUserForUser(u, mfaDetails), methodKey));
      }
      return users;
  }
}
const DOMAIN_FILTER_ALL = "all";
function getTop3Methods(methodCounts) {
  if (!methodCounts || typeof methodCounts !== "object") return [];
  return Object.entries(methodCounts).filter(([, count]) => count > 0).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([key, count]) => ({
    key,
    count
  }));
}
function getMfaMethodLabelFromKey(methodKey) {
  switch (methodKey) {
    case "microsoftauthenticatorauthenticationmethod":
      return "Authenticator";
    case "phoneauthenticationmethod":
      return "SMS / Appel";
    case "fido2authenticationmethod":
      return "FIDO2 key";
    case "softwareoathauthenticationmethod":
      return "Software OAuth";
    case "temporaryaccesspassauthenticationmethod":
      return "Passe temporaire";
    case "emailauthenticationmethod":
      return "Email";
    default:
      return String(methodKey || "").replace("authenticationmethod", "").replace(/([A-Z])/g, " $1").trim();
  }
}
function parseActivityDate(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}
function resolveReportPeriodBounds(reportPeriod, client = null) {
  const startRaw = reportPeriod?.startTime || reportPeriod?.start || reportPeriod?.from || client?.reportStartDate;
  const endRaw = reportPeriod?.endTime || reportPeriod?.end || reportPeriod?.to || client?.reportEndDate;
  if (!startRaw || !endRaw) return null;
  const startDate = new Date(startRaw);
  const endDate = new Date(endRaw);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return null;
  startDate.setHours(0, 0, 0, 0);
  endDate.setHours(23, 59, 59, 999);
  return {
    startDate,
    endDate
  };
}
function getActivityDayDate(day) {
  if (!day || typeof day !== "object") return null;
  return parseActivityDate(day.date || day.reportDate || day.ReportDate || day["Report Date"] || day.ReportRefreshDate);
}
function filterDailyActivityByPeriod(daily, bounds) {
  if (!Array.isArray(daily)) return [];
  if (!bounds) return daily;
  return daily.filter(day => {
    const d = getActivityDayDate(day);
    if (!d) return false;
    const t = d.getTime();
    return t >= bounds.startDate.getTime() && t <= bounds.endDate.getTime();
  });
}
function filterExchangeDataByPeriod(exchange, reportPeriod, client = null) {
  if (!exchange) return exchange;
  const bounds = resolveReportPeriodBounds(reportPeriod, client);
  if (!bounds) return exchange;
  const daily = Array.isArray(exchange.emailActivity?.dailyActivity) ? exchange.emailActivity.dailyActivity : [];
  const filteredDaily = filterDailyActivityByPeriod(daily, bounds);
  const sent = filteredDaily.reduce((sum, d) => sum + (Number(d.sent) || 0), 0);
  const received = filteredDaily.reduce((sum, d) => sum + (Number(d.received) || 0), 0);
  const read = filteredDaily.reduce((sum, d) => sum + (Number(d.read) || 0), 0);
  const daysCount = filteredDaily.length;
  const averages = {
    sent: daysCount > 0 ? Math.round(sent / daysCount) : 0,
    received: daysCount > 0 ? Math.round(received / daysCount) : 0,
    read: daysCount > 0 ? Math.round(read / daysCount) : 0
  };
  const readRate = received > 0 ? read / received * 100 : 0;
  return {
    ...exchange,
    topUsers: [],
    emailActivity: {
      ...(exchange.emailActivity || {}),
      dailyActivity: filteredDaily,
      sent,
      received,
      read,
      averages,
      readRate
    }
  };
}
function filterTeamsDataByPeriod(teams, reportPeriod, client = null) {
  if (!teams) return teams;
  const bounds = resolveReportPeriodBounds(reportPeriod, client);
  if (!bounds) return teams;
  const originalDaily = Array.isArray(teams.licensedActivity?.dailyActivity) ? teams.licensedActivity.dailyActivity : Array.isArray(teams.activity?.dailyActivity) ? teams.activity.dailyActivity : Array.isArray(teams.dailyActivity) ? teams.dailyActivity : [];
  const filteredDaily = filterDailyActivityByPeriod(originalDaily, bounds);
  const channelMessages = filteredDaily.reduce((sum, d) => sum + (Number(d.channelMessages) || 0), 0);
  const chatMessages = filteredDaily.reduce((sum, d) => sum + (Number(d.chatMessages) || 0), 0);
  const oneOnOneCalls = filteredDaily.reduce((sum, d) => sum + (Number(d.oneOnOneCalls) || Number(d.calls) || 0), 0);
  const totalMeetings = filteredDaily.reduce((sum, d) => sum + (Number(d.totalMeetings) || Number(d.meetings) || 0), 0);
  const prevActivity = teams.activity && typeof teams.activity === "object" ? teams.activity : {};
  const prevMessages = prevActivity.messages && typeof prevActivity.messages === "object" ? prevActivity.messages : {};
  const prevMeetings = prevActivity.meetings && typeof prevActivity.meetings === "object" ? prevActivity.meetings : {};
  const prevCalls = prevActivity.calls && typeof prevActivity.calls === "object" ? prevActivity.calls : {};
  return {
    ...teams,
    licensedActivity: {
      ...(teams.licensedActivity || {}),
      dailyActivity: filteredDaily,
      totalChannelMessages: channelMessages,
      totalChatMessages: chatMessages,
      totalMeetings,
      totalCalls: oneOnOneCalls
    },
    activity: {
      ...prevActivity,
      messages: {
        ...prevMessages,
        total: channelMessages + chatMessages,
        teamChat: channelMessages,
        privateChat: chatMessages
      },
      meetings: {
        ...prevMeetings,
        total: totalMeetings
      },
      calls: {
        ...prevCalls,
        total: oneOnOneCalls
      }
    }
  };
}
function renderO365KpiRow(cards, styles) {
  return <div className={styles.o365KpiRow4}>
      {cards.map((card, idx) => <div key={card.label || idx} className={styles.exchangeKpiCard}>
          <div className={styles.exchangeKpiIcon}>
            <Icon icon={card.icon || "mdi:chart-box-outline"} width={18} height={18} />
          </div>
          <div className={styles.exchangeKpiContent}>
            <div className={styles.exchangeKpiValue}>
              {typeof card.value === "number" ? card.value.toLocaleString() : card.value ?? "-"}
            </div>
            <div className={styles.exchangeKpiLabel}>{card.label}</div>
            {card.sub ? <div className={styles.exchangeKpiSub}>{card.sub}</div> : null}
          </div>
        </div>)}
    </div>;
}
function getAuthHeaders() {
  return {};
}
function mapHighlightedKeyToTenantSection(key) {
  if (!key || typeof key !== "string") return "licences";
  if (key === "Office365:exchange") return "exchange";
  if (key === "Office365:teams") return "teams";
  if (key === "Office365:onedrive") return "onedrive";
  if (key === "Office365:sharepoint") return "sharepoint";
  if (key === "Office365:security") return "securite";
  if (key.startsWith("Office365:licence:")) return "licences";
  if (key.startsWith("Office365:user:")) return "utilisateurs";
  return "licences";
}
function Office365AttachedDetail({
  client,
  reportPeriod,
  highlightedEquipmentKey
}) {
  const tenantData = buildMicrosoftTenantDetailNavigationPayload(client);
  const initialSection = mapHighlightedKeyToTenantSection(highlightedEquipmentKey);
  const period = reportPeriod || {
    start: client?.reportStartDate,
    end: client?.reportEndDate
  };
  return <MonitoringStepShell>
      <div className={styles.solutionOverviewEmbed}>
        <TenantDetailPage tenantData={tenantData} embedded reportPeriod={period} initialSection={initialSection} />
      </div>
    </MonitoringStepShell>;
}
export default function Office365Step(props) {
  const clientId = props.client?.id ?? props.client?.uuid ?? null;
  if (clientId) return <Office365AttachedDetail {...props} />;
  return <Office365LegacyStep {...props} />;
}
function Office365LegacyStep({
  client,
  reportPeriod,
  onRefreshClient,
  onOpenComments,
  onTicketCreatedForEquipment,
  commentCounts = {},
  ticketCounts = {},
  highlightedEquipmentKey
}) {
  const [snapshot, setSnapshot] = useState(null);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [activeTab, setActiveTab] = useState("licences");
  const [domainFilter, setDomainFilter] = useState(DOMAIN_FILTER_ALL);
  const [activeFilters, setActiveFilters] = useState([]);
  const [hideServiceAccounts, setHideServiceAccounts] = useState(true);
  const [userSearchQuery, setUserSearchQuery] = useState("");
  useEffect(() => {
    if (!highlightedEquipmentKey || typeof highlightedEquipmentKey !== "string") return;
    const key = highlightedEquipmentKey;
    if (key === "Office365:exchange") setActiveTab("exchange");else if (key === "Office365:teams") setActiveTab("teams");else if (key === "Office365:onedrive") setActiveTab("onedrive");else if (key === "Office365:sharepoint") setActiveTab("sharepoint");else if (key === "Office365:security") setActiveTab("securite");else if (key.startsWith("Office365:licence:")) setActiveTab("licences");else if (key.startsWith("Office365:user:")) setActiveTab("utilisateurs");
  }, [highlightedEquipmentKey]);
  const [licencesSort, setLicensesSort] = useState({
    column: null,
    direction: "asc"
  });
  const [usersSort, setUsersSort] = useState({
    column: null,
    direction: "asc"
  });
  const clientId = client?.id ?? client?.uuid ?? null;
  const reloadSnapshotFromDb = async () => {
    if (!clientId) {
      setSnapshot(null);
      return;
    }
    const headers = getAuthHeaders();
    const resp = await fetch(`${API_BASE_URL}/clients/${clientId}/o365`, {
      headers,
      credentials: "include"
    });
    if (!resp.ok) {
      throw new Error("Unable to reload Office 365 snapshot");
    }
    const result = await resp.json().catch(() => null);
    const rows = Array.isArray(result?.data) ? result.data : [];
    setSnapshot(rows.length ? rows[0]?.data || null : null);
  };
  const reloadMfaDetails = async () => {
    if (!clientId) {
      setMfaDetails([]);
      return;
    }
    const res = await getClientMfaDetails(clientId);
    setMfaDetails(Array.isArray(res?.userMfaDetails) ? res.userMfaDetails : []);
  };
  const handleSyncOffice365 = async () => {
    if (!clientId) {
      toast.error("No client ID available for synchronization");
      return;
    }
    setSyncing(true);
    try {
      if (typeof window !== "undefined" && typeof window.__office365SyncTrigger === "function") {
        try {
          window.__office365SyncTrigger();
        } catch (e) {
          console.error("Office365 sync trigger error:", e);
        }
      }
      const headers = {
        "Content-Type": "application/json"
      };
      const now = new Date();
      const startSource = reportPeriod?.start || client?.reportStartDate || null;
      const endSource = reportPeriod?.end || client?.reportEndDate || null;
      const startDate = startSource ? new Date(startSource) : new Date(now);
      const endDate = endSource ? new Date(endSource) : new Date(now);
      if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
        throw new Error("Invalid report period for synchronization");
      }
      endDate.setHours(23, 59, 59, 999);
      const diffMs = endDate.getTime() - startDate.getTime();
      const diffDays = diffMs / (1000 * 60 * 60 * 24);
      let period = "D30";
      if (diffDays <= 10) period = "D7";else if (diffDays <= 45) period = "D30";else if (diffDays <= 120) period = "D90";
      const response = await fetch(`${API_BASE_URL}/office365/sync-all?clientId=${clientId}&period=${period}&startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`, {
        method: "GET",
        headers,
        credentials: "include"
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.success) {
        throw new Error(result.error || "Error during Office 365 synchronization");
      }
      setLoading(true);
      try {
        await reloadSnapshotFromDb();
        await reloadMfaDetails();
        if (typeof onRefreshClient === "function") {
          await onRefreshClient();
        }
      } finally {
        setLoading(false);
      }
      toast.success("Microsoft 365 data synchronized successfully");
    } catch (error) {
      console.error("Office365 step sync error:", error);
      toast.error(error.message || "Error during Office 365 synchronization");
    } finally {
      setSyncing(false);
    }
  };
  useEffect(() => {
    if (!clientId) return;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const headers = getAuthHeaders();
        const resp = await fetch(`${API_BASE_URL}/clients/${clientId}/o365`, {
          headers,
          credentials: "include"
        });
        if (!resp.ok) return;
        const result = await resp.json().catch(() => null);
        const rows = Array.isArray(result?.data) ? result.data : [];
        if (!rows.length || cancelled) return;
        setSnapshot(rows[0]?.data || null);
      } catch {
        if (!cancelled) setSnapshot(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [clientId]);
  const [mfaDetails, setMfaDetails] = useState([]);
  useEffect(() => {
    if (!clientId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await getClientMfaDetails(clientId);
        if (!cancelled && Array.isArray(res?.userMfaDetails)) {
          setMfaDetails(res.userMfaDetails);
        }
      } catch {
        if (!cancelled) setMfaDetails([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [clientId]);
  const {
    metrics,
    users,
    licences,
    exchangeData,
    teamsData,
    onedriveData,
    sharepointData,
    securityData
  } = useMemo(() => {
    if (!snapshot) {
      return {
        metrics: null,
        users: [],
        licences: [],
        exchangeData: null,
        teamsData: null,
        onedriveData: null,
        sharepointData: null,
        securityData: null
      };
    }
    const usersArr = Array.isArray(snapshot.users) ? snapshot.users : [];
    const licencesArr = Array.isArray(snapshot.licences) ? snapshot.licences : [];
    const totalUsers = usersArr.length;
    const totalLicenses = licencesArr.reduce((sum, lic) => sum + (lic.total || 0), 0);
    const usedLicenses = licencesArr.reduce((sum, lic) => sum + (lic.utilisees || 0), 0);
    const adoptionScore = snapshot.adoptionScore || null;
    const secureScore = snapshot.securityData?.secureScore || snapshot.security?.secureScore || null;
    const rawExchange = snapshot.exchangeData ?? snapshot.exchange ?? null;
    const exchange = filterExchangeDataByPeriod(rawExchange, reportPeriod, client);
    const rawTeams = snapshot.teamsData ?? snapshot.teams ?? null;
    const teams = filterTeamsDataByPeriod(rawTeams, reportPeriod, client);
    const onedrive = snapshot.onedriveData ?? snapshot.onedrive ?? null;
    const sharepoint = snapshot.sharepointData ?? snapshot.sharepoint ?? null;
    const security = snapshot.securityData ?? snapshot.security ?? null;
    return {
      metrics: {
        totalUsers,
        totalLicenses,
        usedLicenses,
        adoptionScore,
        secureScore
      },
      users: usersArr,
      licences: licencesArr,
      exchangeData: exchange,
      teamsData: teams,
      onedriveData: onedrive,
      sharepointData: sharepoint,
      securityData: security
    };
  }, [snapshot, reportPeriod, client]);
  const o365Subtitle = useMemo(() => {
    if (reportPeriod?.start && reportPeriod?.end) {
      try {
        const startFmt = new Date(reportPeriod.start).toLocaleDateString("en-US", {
          day: "2-digit",
          month: "short",
          year: "numeric"
        });
        const endFmt = new Date(reportPeriod.end).toLocaleDateString("en-US", {
          day: "2-digit",
          month: "short",
          year: "numeric"
        });
        return `Period: ${startFmt} – ${endFmt}`;
      } catch {
        return "Microsoft 365";
      }
    }
    if (metrics) {
      const u = metrics.totalUsers ?? 0;
      const lic = metrics.usedLicenses ?? metrics.totalLicenses ?? 0;
      const total = metrics.totalLicenses ?? 0;
      if (u > 0 || total > 0) {
        return total > 0 ? `${u.toLocaleString()} users • ${lic.toLocaleString()} / ${total.toLocaleString()} licenses` : `${u.toLocaleString()} users`;
      }
    }
    return "Microsoft 365";
  }, [reportPeriod?.start, reportPeriod?.end, metrics]);
  const enrichedUsers = useMemo(() => {
    if (!Array.isArray(users) || !Array.isArray(mfaDetails)) return users || [];
    return users.map(u => {
      const upn = (u.userPrincipalName || u.email || "").toLowerCase().trim();
      const mfa = mfaDetails.find(m => (m.userPrincipalName || m.user_principal_name || "").toLowerCase().trim() === upn) || null;
      if (!mfa) return u;
      const methodsRaw = mfa.mfa_methods || mfa.mfaMethods || [];
      const methods = Array.isArray(methodsRaw) ? methodsRaw : String(methodsRaw || "").split(",").map(s => s.trim()).filter(Boolean);
      const hasMfa = mfa.has_mfa === true || methods.length > 0 && methods.some(m => getMfaMethodIcon(m) !== null);
      return {
        ...u,
        admin_role: mfa.admin_role ?? mfa.adminRole ?? u.admin_role,
        is_admin: typeof mfa.is_admin === "boolean" ? mfa.is_admin : u.is_admin ?? false,
        mfa_active: hasMfa,
        mfa_methods: methods.length ? methods : u.mfa_methods
      };
    });
  }, [users, mfaDetails]);
  const displayUsers = useMemo(() => {
    if (!enrichedUsers || !Array.isArray(enrichedUsers)) return [];
    if (!hideServiceAccounts) return enrichedUsers;
    return enrichedUsers.filter(u => {
      const isService = u.isServiceAccount === true || u.isServiceAccount !== false && isLikelyServiceAccountFromUser(u);
      return !isService;
    });
  }, [enrichedUsers, hideServiceAccounts]);
  const serviceAccountsCount = useMemo(() => (enrichedUsers || []).filter(u => u.isServiceAccount === true || u.isServiceAccount !== false && isLikelyServiceAccountFromUser(u)).length, [enrichedUsers]);
  const setDomainAndResetFilters = domain => {
    setDomainFilter(domain);
  };
  const toggleFilter = filterKey => {
    setActiveFilters(prev => prev.includes(filterKey) ? prev.filter(k => k !== filterKey) : [...prev, filterKey]);
  };
  const clearActiveFilters = () => {
    setActiveFilters([]);
  };
  const securityKpiStats = useMemo(() => {
    const effectiveUsers = Array.isArray(displayUsers) ? displayUsers : [];
    if (!Array.isArray(mfaDetails) || mfaDetails.length === 0 || effectiveUsers.length === 0) {
      return {
        totalUsers: effectiveUsers.length,
        usersWithMFA: 0,
        usersWithoutMFA: 0,
        adminsTotal: 0,
        adminsWithMFA: 0,
        adminsWithoutMFA: 0,
        nonAdminWithMFA: 0,
        nonAdminWithoutMFA: 0,
        top3Total: [],
        top3Admin: [],
        top3NonAdmin: []
      };
    }
    let usersWithMFA = 0;
    let usersWithoutMFA = 0;
    let adminsTotal = 0;
    let adminsWithMFA = 0;
    let adminsWithoutMFA = 0;
    let nonAdminWithMFA = 0;
    let nonAdminWithoutMFA = 0;
    const totalMethodCounts = {};
    const adminMethodCounts = {};
    const nonAdminMethodCounts = {};
    effectiveUsers.forEach(user => {
      const mfaUser = getMfaUserForUser(user, mfaDetails);
      if (!mfaUser) return;
      const hasMfa = userHasMfaFromMfaUser(mfaUser);
      const methods = getMethodsFromMfaUser(mfaUser);
      if (hasMfa) {
        usersWithMFA += 1;
        methods.forEach(m => {
          totalMethodCounts[m] = (totalMethodCounts[m] || 0) + 1;
        });
      } else {
        usersWithoutMFA += 1;
      }
      if (mfaUser.is_admin === true) {
        adminsTotal += 1;
        if (hasMfa) {
          adminsWithMFA += 1;
          methods.forEach(m => {
            adminMethodCounts[m] = (adminMethodCounts[m] || 0) + 1;
          });
        } else {
          adminsWithoutMFA += 1;
        }
      } else {
        if (hasMfa) {
          nonAdminWithMFA += 1;
          methods.forEach(m => {
            nonAdminMethodCounts[m] = (nonAdminMethodCounts[m] || 0) + 1;
          });
        } else {
          nonAdminWithoutMFA += 1;
        }
      }
    });
    const top3Total = getTop3Methods(totalMethodCounts);
    const top3Admin = getTop3Methods(adminMethodCounts);
    const top3NonAdmin = getTop3Methods(nonAdminMethodCounts);
    return {
      totalUsers: effectiveUsers.length,
      usersWithMFA,
      usersWithoutMFA,
      adminsTotal,
      adminsWithMFA,
      adminsWithoutMFA,
      nonAdminWithMFA,
      nonAdminWithoutMFA,
      top3Total,
      top3Admin,
      top3NonAdmin
    };
  }, [displayUsers, mfaDetails]);
  const usersForKpi = useMemo(() => {
    if (!displayUsers || !displayUsers.length) return [];
    let base = displayUsers;
    if (userSearchQuery.trim()) {
      const q = userSearchQuery.toLowerCase();
      base = base.filter(u => {
        const name = (u.name || u.displayName || "").toLowerCase();
        const email = (u.email || u.userPrincipalName || "").toLowerCase();
        return name.includes(q) || email.includes(q);
      });
    }
    if (domainFilter === DOMAIN_FILTER_ALL) return base;
    return base.filter(u => getUserDomain(u) === domainFilter);
  }, [displayUsers, domainFilter, userSearchQuery]);
  const filteredUsers = useMemo(() => {
    if (!activeFilters || activeFilters.length === 0) return usersForKpi;
    return activeFilters.reduce((acc, filterKey) => getFilteredUsers(acc, filterKey, mfaDetails), usersForKpi);
  }, [usersForKpi, activeFilters, mfaDetails]);
  const blockedUsers = filteredUsers.filter(u => u.accountEnabled === false).length;
  const inactiveUsers90 = filteredUsers.filter(u => {
    const lastLogin = u.lastLoginDate ? new Date(u.lastLoginDate) : null;
    const period90Days = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    return !lastLogin || lastLogin < period90Days;
  }).length;
  const activeUsers30Count = filteredUsers.filter(u => {
    const lastLogin = u.lastLoginDate ? new Date(u.lastLoginDate) : null;
    const period30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    return lastLogin && lastLogin >= period30;
  }).length;
  const mfaActiveCount = filteredUsers.filter(u => userHasMfa(getMfaUserForUser(u, mfaDetails))).length;
  const mfaInactiveCount = filteredUsers.filter(u => {
    const m = getMfaUserForUser(u, mfaDetails);
    return m && !userHasMfa(m);
  }).length;
  const adminCount = filteredUsers.filter(u => {
    const m = getMfaUserForUser(u, mfaDetails);
    return m && m.is_admin === true;
  }).length;
  const nonAdminCount = filteredUsers.filter(u => {
    const m = getMfaUserForUser(u, mfaDetails);
    return m && m.is_admin !== true;
  }).length;
  const methodCounts = useMemo(() => {
    const counts = {};
    ["microsoftauthenticatorauthenticationmethod", "phoneauthenticationmethod", "emailauthenticationmethod", "fido2authenticationmethod", "softwareoathauthenticationmethod"].forEach(key => {
      counts[key] = filteredUsers.filter(u => userHasMethod(getMfaUserForUser(u, mfaDetails), key)).length;
    });
    return counts;
  }, [filteredUsers, mfaDetails]);
  const domainCounts = useMemo(() => {
    const map = new Map();
    (displayUsers || []).forEach(u => {
      const d = getUserDomain(u);
      map.set(d, (map.get(d) || 0) + 1);
    });
    return Array.from(map.entries()).map(([domain, count]) => ({
      domain,
      count
    })).sort((a, b) => b.count - a.count || (a.domain === NO_DOMAIN_KEY ? 1 : b.domain === NO_DOMAIN_KEY ? -1 : a.domain.localeCompare(b.domain)));
  }, [displayUsers]);
  const sortedLicenses = useMemo(() => {
    if (!licencesSort.column) return licences;
    const dir = licencesSort.direction === "asc" ? 1 : -1;
    return [...licences].sort((a, b) => {
      const totalA = a.total || 0;
      const totalB = b.total || 0;
      const usedA = a.utilisees || 0;
      const usedB = b.utilisees || 0;
      const availA = Math.max(0, totalA - usedA);
      const availB = Math.max(0, totalB - usedB);
      const rateA = totalA > 0 ? Math.round(usedA / totalA * 100) : 0;
      const rateB = totalB > 0 ? Math.round(usedB / totalB * 100) : 0;
      const nameA = getLicenseDisplayName(a.nom || a.displayName || "").toLowerCase();
      const nameB = getLicenseDisplayName(b.nom || b.displayName || "").toLowerCase();
      let cmp = 0;
      switch (licencesSort.column) {
        case "type":
          cmp = nameA < nameB ? -1 : nameA > nameB ? 1 : 0;
          break;
        case "used":
          cmp = usedA - usedB;
          break;
        case "total":
          cmp = totalA - totalB;
          break;
        case "available":
          cmp = availA - availB;
          break;
        case "rate":
          cmp = rateA - rateB;
          break;
        default:
          cmp = 0;
      }
      return cmp * dir;
    });
  }, [licences, licencesSort]);
  const sortedUsers = useMemo(() => {
    if (!usersSort.column) return displayUsers;
    const dir = usersSort.direction === "asc" ? 1 : -1;
    const toTime = d => d instanceof Date ? d.getTime() : 0;
    return [...displayUsers].sort((a, b) => {
      const createdA = a.createdDate ? new Date(a.createdDate) : null;
      const createdB = b.createdDate ? new Date(b.createdDate) : null;
      const lastLoginA = a.lastLoginDate ? new Date(a.lastLoginDate) : null;
      const lastLoginB = b.lastLoginDate ? new Date(b.lastLoginDate) : null;
      const period90 = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
      const period30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const isInactive = d => !d || d < period90;
      const isActive30 = d => d && d >= period30;
      const statusRank = (u, lastLogin) => {
        if (u.accountEnabled === false) return 0;
        if (isActive30(lastLogin)) return 3;
        if (isInactive(lastLogin)) return 1;
        return 2;
      };
      let va;
      let vb;
      switch (usersSort.column) {
        case "name":
          va = (a.name || a.displayName || "").toLowerCase();
          vb = (b.name || b.displayName || "").toLowerCase();
          break;
        case "email":
          va = (a.email || a.userPrincipalName || "").toLowerCase();
          vb = (b.email || b.userPrincipalName || "").toLowerCase();
          break;
        case "created":
          va = toTime(createdA);
          vb = toTime(createdB);
          break;
        case "status":
          va = statusRank(a, lastLoginA);
          vb = statusRank(b, lastLoginB);
          break;
        case "license":
          {
            const formatUserLicenses = u => {
              const raw = u.licenses || u.licences || "";
              if (!raw) return "";
              return raw.split(",").map(lic => lic.trim()).filter(Boolean).map(lic => getLicenseDisplayName(lic)).join(", ").toLowerCase();
            };
            va = formatUserLicenses(a);
            vb = formatUserLicenses(b);
            break;
          }
        case "adminRole":
          va = (a.adminRole || a.admin_role || "").toLowerCase();
          vb = (b.adminRole || b.admin_role || "").toLowerCase();
          break;
        case "admin":
          va = a.is_admin ? 1 : 0;
          vb = b.is_admin ? 1 : 0;
          break;
        case "mfa":
          va = a.mfa_active ? 1 : 0;
          vb = b.mfa_active ? 1 : 0;
          break;
        case "methods":
          va = Array.isArray(a.mfa_methods) ? a.mfa_methods.length : String(a.mfa_methods || "").split(",").filter(s => s.trim()).length;
          vb = Array.isArray(b.mfa_methods) ? b.mfa_methods.length : String(b.mfa_methods || "").split(",").filter(s => s.trim()).length;
          break;
        default:
          va = 0;
          vb = 0;
      }
      if (va < vb) return -1 * dir;
      if (va > vb) return 1 * dir;
      return 0;
    });
  }, [displayUsers, usersSort]);
  const getSortIcon = (isActive, direction) => {
    if (!isActive) {
      return <Icon icon="mdi:swap-vertical" width={14} height={14} style={{
        opacity: 0.3
      }} />;
    }
    return <Icon icon={direction === "asc" ? "mdi:chevron-up" : "mdi:chevron-down"} width={14} height={14} />;
  };
  const tabs = [{
    id: "licences",
    label: "Licenses",
    icon: "mdi:license"
  }, {
    id: "utilisateurs",
    label: "Users",
    icon: "mdi:account-multiple"
  }, {
    id: "exchange",
    label: "Exchange",
    icon: "simple-icons:microsoftexchange"
  }, {
    id: "teams",
    label: "Teams",
    icon: "simple-icons:microsoftteams"
  }, {
    id: "onedrive",
    label: "OneDrive",
    icon: "entypo-social:onedrive"
  }, {
    id: "sharepoint",
    label: "SharePoint",
    icon: "mdi:microsoft-sharepoint"
  }, {
    id: "securite",
    label: "Security",
    icon: "mdi:shield-check"
  }];
  return <MonitoringStepShell>
      <MonitoringStepHeader title="Office 365" countLabel={o365Subtitle} footer={<div className={styles.o365TabsContainer}>
            {tabs.map(tab => <button key={tab.id} type="button" className={`${styles.o365TabButton} ${activeTab === tab.id ? styles.o365TabButtonActive : ""}`} onClick={() => setActiveTab(tab.id)}>
                {tab.icon && <Icon icon={tab.icon} width={16} height={16} />}
                <span>{tab.label}</span>
              </button>)}
          </div>} />

      <div className={styles.o365DetailBlock}>
        {syncing && <div className={styles.o365SyncSkeleton}>
            <div className={styles.o365SyncSkeletonStats}>
              {[0, 1, 2, 3].map(idx => <div key={idx} className={styles.o365SyncSkeletonCard}>
                  <div className={styles.o365SyncSkeletonCardIcon} />
                  <div className={styles.o365SyncSkeletonCardContent}>
                    <div className={styles.o365SyncSkeletonValue} />
                    <div className={styles.o365SyncSkeletonLabel} />
                  </div>
                </div>)}
            </div>
            <div className={styles.o365SyncSkeletonTable}>
              <div className={styles.o365SyncSkeletonTableHeader}>
                {[0, 1, 2, 3, 4].map(idx => <div key={idx} className={styles.o365SyncSkeletonTableCell} />)}
              </div>
              {[0, 1, 2, 3, 4, 5].map(row => <div key={row} className={styles.o365SyncSkeletonTableRow}>
                  {[0, 1, 2, 3, 4].map(col => <div key={col} className={styles.o365SyncSkeletonTableCell} />)}
                </div>)}
            </div>
          </div>}
        {!syncing && loading && <div className={styles.antivirusModalEnrichedLoading}>
            <Icon icon="mdi:loading" width={20} height={20} className={styles.antivirusModalLoadingIcon} />
            Loading Office 365 data...
          </div>}
        {!syncing && !loading && !metrics && <div className={styles.antivirusModalNoData}>
            No Office 365 data available for this client.
          </div>}
        {!syncing && !loading && metrics && <>
            {activeTab === "licences" && <div>
                <h4 className={styles.antivirusDetailBlockTitle}>
                  Licenses
                </h4>
                <div className={styles.antivirusModalEndpointsScroll}>
                  <table className={styles.antivirusModalTable}>
                    <thead>
                      <tr>
                        <th className={styles.antivirusStickyTh} onClick={() => setLicensesSort(prev => ({
                    column: "type",
                    direction: prev.column === "type" && prev.direction === "asc" ? "desc" : "asc"
                  }))} style={{
                    cursor: "pointer",
                    whiteSpace: "nowrap"
                  }}>
                          <span style={{
                      display: "inline-flex",
                      gap: 4,
                      alignItems: "center"
                    }}>
                            License type
                            {getSortIcon(licencesSort.column === "type", licencesSort.direction)}
                          </span>
                        </th>
                        <th className={styles.antivirusStickyTh} onClick={() => setLicensesSort(prev => ({
                    column: "used",
                    direction: prev.column === "used" && prev.direction === "asc" ? "desc" : "asc"
                  }))} style={{
                    cursor: "pointer"
                  }}>
                          <span style={{
                      display: "inline-flex",
                      gap: 4,
                      alignItems: "center"
                    }}>
                            Used
                            {getSortIcon(licencesSort.column === "used", licencesSort.direction)}
                          </span>
                        </th>
                        <th className={styles.antivirusStickyTh} onClick={() => setLicensesSort(prev => ({
                    column: "total",
                    direction: prev.column === "total" && prev.direction === "asc" ? "desc" : "asc"
                  }))} style={{
                    cursor: "pointer"
                  }}>
                          <span style={{
                      display: "inline-flex",
                      gap: 4,
                      alignItems: "center"
                    }}>
                            Total
                            {getSortIcon(licencesSort.column === "total", licencesSort.direction)}
                          </span>
                        </th>
                        <th className={styles.antivirusStickyTh} onClick={() => setLicensesSort(prev => ({
                    column: "available",
                    direction: prev.column === "available" && prev.direction === "asc" ? "desc" : "asc"
                  }))} style={{
                    cursor: "pointer"
                  }}>
                          <span style={{
                      display: "inline-flex",
                      gap: 4,
                      alignItems: "center"
                    }}>
                            Available
                            {getSortIcon(licencesSort.column === "available", licencesSort.direction)}
                          </span>
                        </th>
                        <th className={styles.antivirusStickyTh} onClick={() => setLicensesSort(prev => ({
                    column: "rate",
                    direction: prev.column === "rate" && prev.direction === "asc" ? "desc" : "asc"
                  }))} style={{
                    cursor: "pointer",
                    whiteSpace: "nowrap"
                  }}>
                          <span style={{
                      display: "inline-flex",
                      gap: 4,
                      alignItems: "center"
                    }}>
                            Taux d&apos;utilisation
                            {getSortIcon(licencesSort.column === "rate", licencesSort.direction)}
                          </span>
                        </th>
                        <th className={styles.antivirusStickyTh}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {licences.length === 0 ? <tr>
                          <td colSpan={6}>No license found.</td>
                        </tr> : sortedLicenses.map((lic, idx) => {
                  const total = lic.total || 0;
                  const used = lic.utilisees || 0;
                  const available = Math.max(0, total - used);
                  const usageRate = total > 0 ? Math.round(used / total * 100) : 0;
                  const free = isFreeLicense(lic);
                  const displayName = getLicenseDisplayName(lic.nom || lic.displayName || lic.skuId || "-");
                  const moduleKey = "Office365";
                  const equipmentKey = lic.commentKey || lic.skuId || lic.nom || `Office365:licence:${displayName}`;
                  const commentCount = commentCounts && commentCounts[equipmentKey] ? commentCounts[equipmentKey] : 0;
                  const ticketCount = ticketCounts && ticketCounts[equipmentKey] ? ticketCounts[equipmentKey] : 0;
                  const isHighlighted = highlightedEquipmentKey != null && String(highlightedEquipmentKey) === String(equipmentKey);
                  const item = {
                    nom: displayName,
                    name: displayName
                  };
                  return <tr key={equipmentKey} className={`${styles.infraTableRow} ${isHighlighted ? styles.infraTableRowHighlight : ""}`}>
                              <td>
                                <span style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "0.4rem"
                      }}>
                                  {displayName}
                                  {free && <Icon icon="mdi:gift-outline" width={16} height={16} style={{
                          color: "#15D1A0"
                        }} />}
                                </span>
                              </td>
                              <td>{used}</td>
                              <td>{total}</td>
                              <td>{available}</td>
                              <td>{usageRate}%</td>
                              <td className={styles.infraTableCellActions}>
                                {typeof onOpenComments === "function" && <button type="button" className={styles.infraIconButton} title="Comments" onClick={() => onOpenComments(item, {
                        moduleKey,
                        equipmentKey
                      })}>
                                    <Icon icon="mdi:comment-text-outline" />
                                    {commentCount > 0 && <span className={styles.infraCommentBadge}>
                                        {commentCount}
                                      </span>}
                                  </button>}
                                {typeof onTicketCreatedForEquipment === "function" && (client?.id || client?.uuid) ? <span className={styles.infraIconButtonWrapper}>
                                    
                                    {ticketCount > 0 && <span className={styles.infraTicketBadge}>
                                        {ticketCount}
                                      </span>}
                                  </span> : null}
                              </td>
                            </tr>;
                })}
                    </tbody>
                  </table>
                </div>
              </div>}

            {activeTab === "utilisateurs" && <div className={styles.o365TabPane}>
                <h4 className={styles.antivirusDetailBlockTitle}>Users</h4>
                <div className={styles.o365TableFill}>
                  <table className={styles.antivirusModalTable}>
                    <thead>
                      <tr>
                        <th className={styles.antivirusStickyTh} style={{
                    whiteSpace: "nowrap",
                    maxWidth: 180,
                    cursor: "pointer"
                  }} onClick={() => setUsersSort(prev => ({
                    column: "name",
                    direction: prev.column === "name" && prev.direction === "asc" ? "desc" : "asc"
                  }))}>
                          <span style={{
                      display: "inline-flex",
                      gap: 4,
                      alignItems: "center"
                    }}>
                            Nom
                            {getSortIcon(usersSort.column === "name", usersSort.direction)}
                          </span>
                        </th>
                        <th className={styles.antivirusStickyTh} style={{
                    whiteSpace: "nowrap",
                    maxWidth: 220,
                    cursor: "pointer"
                  }} onClick={() => setUsersSort(prev => ({
                    column: "email",
                    direction: prev.column === "email" && prev.direction === "asc" ? "desc" : "asc"
                  }))}>
                          <span style={{
                      display: "inline-flex",
                      gap: 4,
                      alignItems: "center"
                    }}>
                            Email
                            {getSortIcon(usersSort.column === "email", usersSort.direction)}
                          </span>
                        </th>
                        <th className={styles.antivirusStickyTh} style={{
                    whiteSpace: "nowrap",
                    cursor: "pointer"
                  }} onClick={() => setUsersSort(prev => ({
                    column: "created",
                    direction: prev.column === "created" && prev.direction === "asc" ? "desc" : "asc"
                  }))}>
                          <span style={{
                      display: "inline-flex",
                      gap: 4,
                      alignItems: "center"
                    }}>
                            Created date
                            {getSortIcon(usersSort.column === "created", usersSort.direction)}
                          </span>
                        </th>
                        <th className={styles.antivirusStickyTh} style={{
                    whiteSpace: "nowrap",
                    cursor: "pointer"
                  }} onClick={() => setUsersSort(prev => ({
                    column: "status",
                    direction: prev.column === "status" && prev.direction === "asc" ? "desc" : "asc"
                  }))}>
                          <span style={{
                      display: "inline-flex",
                      gap: 4,
                      alignItems: "center"
                    }}>
                            Status
                            {getSortIcon(usersSort.column === "status", usersSort.direction)}
                          </span>
                        </th>
                        <th className={styles.antivirusStickyTh} style={{
                    maxWidth: 200,
                    cursor: "pointer"
                  }} onClick={() => setUsersSort(prev => ({
                    column: "license",
                    direction: prev.column === "license" && prev.direction === "asc" ? "desc" : "asc"
                  }))}>
                          <span style={{
                      display: "inline-flex",
                      gap: 4,
                      alignItems: "center"
                    }}>
                            License
                            {getSortIcon(usersSort.column === "license", usersSort.direction)}
                          </span>
                        </th>
                        <th className={styles.antivirusStickyTh} style={{
                    whiteSpace: "nowrap",
                    cursor: "pointer"
                  }} onClick={() => setUsersSort(prev => ({
                    column: "adminRole",
                    direction: prev.column === "adminRole" && prev.direction === "asc" ? "desc" : "asc"
                  }))}>
                          <span style={{
                      display: "inline-flex",
                      gap: 4,
                      alignItems: "center"
                    }}>
                            Admin role
                            {getSortIcon(usersSort.column === "adminRole", usersSort.direction)}
                          </span>
                        </th>
                        <th className={styles.antivirusStickyTh} style={{
                    whiteSpace: "nowrap",
                    cursor: "pointer"
                  }} onClick={() => setUsersSort(prev => ({
                    column: "admin",
                    direction: prev.column === "admin" && prev.direction === "asc" ? "desc" : "asc"
                  }))}>
                          <span style={{
                      display: "inline-flex",
                      gap: 4,
                      alignItems: "center"
                    }}>
                            Admin
                            {getSortIcon(usersSort.column === "admin", usersSort.direction)}
                          </span>
                        </th>
                        <th className={styles.antivirusStickyTh} style={{
                    whiteSpace: "nowrap",
                    cursor: "pointer"
                  }} onClick={() => setUsersSort(prev => ({
                    column: "mfa",
                    direction: prev.column === "mfa" && prev.direction === "asc" ? "desc" : "asc"
                  }))}>
                          <span style={{
                      display: "inline-flex",
                      gap: 4,
                      alignItems: "center"
                    }}>
                            MFA actif
                            {getSortIcon(usersSort.column === "mfa", usersSort.direction)}
                          </span>
                        </th>
                        <th className={styles.antivirusStickyTh} style={{
                    whiteSpace: "nowrap",
                    cursor: "pointer"
                  }} onClick={() => setUsersSort(prev => ({
                    column: "methods",
                    direction: prev.column === "methods" && prev.direction === "asc" ? "desc" : "asc"
                  }))}>
                          <span style={{
                      display: "inline-flex",
                      gap: 4,
                      alignItems: "center"
                    }}>
                            Methods
                            {getSortIcon(usersSort.column === "methods", usersSort.direction)}
                          </span>
                        </th>
                        <th className={styles.antivirusStickyTh}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedUsers.length === 0 ? <tr>
                          <td colSpan={10}>No user found.</td>
                        </tr> : sortedUsers.map((u, idx) => {
                  const createdDate = u.createdDate ? new Date(u.createdDate) : null;
                  const lastLogin = u.lastLoginDate ? new Date(u.lastLoginDate) : null;
                  const period90 = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
                  const period30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
                  const isInactive = !lastLogin || lastLogin < period90;
                  const isActive30 = lastLogin && lastLogin >= period30;
                  let statusLabel = "Inactive";
                  if (u.accountEnabled === false) {
                    statusLabel = "Blocked";
                  } else if (isActive30) {
                    statusLabel = "Active";
                  } else if (isInactive) {
                    statusLabel = "Inactive (>90j)";
                  }
                  const licenseNamesRaw = u.licenses || u.licences || "";
                  const licenseNames = licenseNamesRaw ? licenseNamesRaw.split(",").map(lic => lic.trim()).filter(Boolean).map(lic => getLicenseDisplayName(lic)).join(", ") : "";
                  const displayName = u.displayName || u.name || u.userPrincipalName || "-";
                  const moduleKey = "Office365";
                  const equipmentKey = u.commentKey || u.id || u.userPrincipalName || `Office365:user:${displayName}`;
                  const commentCount = commentCounts && commentCounts[equipmentKey] ? commentCounts[equipmentKey] : 0;
                  const ticketCount = ticketCounts && ticketCounts[equipmentKey] ? ticketCounts[equipmentKey] : 0;
                  const isHighlighted = highlightedEquipmentKey != null && String(highlightedEquipmentKey) === String(equipmentKey);
                  const item = {
                    id: u.id,
                    nom: displayName,
                    name: displayName
                  };
                  return <tr key={equipmentKey} className={`${styles.infraTableRow} ${isHighlighted ? styles.infraTableRowHighlight : ""}`}>
                              <td style={{
                      maxWidth: 200,
                      whiteSpace: "nowrap",
                      textOverflow: "ellipsis",
                      overflow: "hidden"
                    }}>
                                {u.displayName || u.name || "-"}
                              </td>
                              <td style={{
                      maxWidth: 240,
                      whiteSpace: "nowrap",
                      textOverflow: "ellipsis",
                      overflow: "hidden"
                    }}>
                                {u.userPrincipalName || u.mail || "-"}
                              </td>
                              <td style={{
                      whiteSpace: "nowrap"
                    }}>
                                {createdDate ? createdDate.toLocaleDateString("en-US") : "-"}
                              </td>
                              <td style={{
                      whiteSpace: "nowrap"
                    }}>{statusLabel}</td>
                              <td style={{
                      maxWidth: 200,
                      whiteSpace: "nowrap",
                      textOverflow: "ellipsis",
                      overflow: "hidden"
                    }}>
                                {licenseNames || "None"}
                              </td>
                              <td>
                                {(() => {
                        const rawRole = u.admin_role ?? u.adminRole ?? "";
                        const roleIcons = getAdminRoleIcons(rawRole);
                        if (roleIcons.length > 0) {
                          return <div className={styles.mfaMethodsList}>
                                        {roleIcons.map(({
                              icon,
                              label
                            }, i) => <span key={`${icon}-${i}`} className={styles.mfaMethodIcon} title={label}>
                                            <Icon icon={icon} />
                                          </span>)}
                                      </div>;
                        }
                        if (u.is_admin) {
                          return <span className={styles.mfaMethodIcon} title="Administrateur">
                                        <Icon icon="mdi:shield-account-outline" />
                                      </span>;
                        }
                        return <span style={{
                          color: "var(--text-muted, #9ca3af)"
                        }}>
                                      -
                                    </span>;
                      })()}
                              </td>
                              <td>
                                <span style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center"
                      }}>
                                  {u.is_admin ? <Icon icon="mdi:check-bold" width={16} height={16} style={{
                          color: "#10b981"
                        }} /> : <Icon icon="mdi:close-thick" width={16} height={16} style={{
                          color: "#9ca3af"
                        }} />}
                                </span>
                              </td>
                              <td>
                                <span style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center"
                      }}>
                                  {u.mfa_active ? <Icon icon="mdi:check-bold" width={16} height={16} style={{
                          color: "#10b981"
                        }} /> : <Icon icon="mdi:close-thick" width={16} height={16} style={{
                          color: "#ef4444"
                        }} />}
                                </span>
                              </td>
                              <td>
                                {Array.isArray(u.mfa_methods) || typeof u.mfa_methods === "string" ? <div style={{
                        display: "flex",
                        gap: "0.25rem",
                        flexWrap: "wrap"
                      }}>
                                    {(Array.isArray(u.mfa_methods) ? u.mfa_methods : String(u.mfa_methods || "").split(",").map(m => m.trim())).filter(Boolean).map((method, i) => {
                          const icon = getMfaMethodIcon(method);
                          if (!icon) return null;
                          return <span key={`${method}-${i}`} style={{
                            display: "inline-flex",
                            alignItems: "center"
                          }} title={method}>
                                            {icon}
                                          </span>;
                        })}
                                  </div> : "-"}
                              </td>
                              <td className={styles.infraTableCellActions}>
                                {typeof onOpenComments === "function" && <button type="button" className={styles.infraIconButton} title="Comments" onClick={() => onOpenComments(item, {
                        moduleKey,
                        equipmentKey
                      })}>
                                    <Icon icon="mdi:comment-text-outline" />
                                    {commentCount > 0 && <span className={styles.infraCommentBadge}>
                                        {commentCount}
                                      </span>}
                                  </button>}
                                {typeof onTicketCreatedForEquipment === "function" && (client?.id || client?.uuid) ? <span className={styles.infraIconButtonWrapper}>
                                    
                                    {ticketCount > 0 && <span className={styles.infraTicketBadge}>
                                        {ticketCount}
                                      </span>}
                                  </span> : null}
                              </td>
                            </tr>;
                })}
                    </tbody>
                  </table>
                </div>
              </div>}

            {activeTab === "exchange" && <div>
                <div className={styles.infraTableHeaderInline}>
                  <div className={styles.infraTableHeaderInlineInfo}>
                    <h4 className={styles.antivirusDetailBlockTitle}>
                      Exchange Online / Outlook
                    </h4>
                  </div>
                  <div className={styles.infraTableHeaderInlineActions}>
                    {typeof onOpenComments === "function" && <button type="button" className={styles.infraIconButton} title="Exchange comments" onClick={() => onOpenComments({
                name: "Exchange Online / Outlook"
              }, {
                moduleKey: "Office365",
                equipmentKey: "Office365:exchange"
              })}>
                        <Icon icon="mdi:comment-text-outline" />
                        {commentCounts?.["Office365:exchange"] > 0 && <span className={styles.infraCommentBadge}>
                            {commentCounts["Office365:exchange"]}
                          </span>}
                      </button>}
                    {typeof onTicketCreatedForEquipment === "function" && (client?.id || client?.uuid) && <span className={styles.infraIconButtonWrapper}>
                          
                          {ticketCounts?.["Office365:exchange"] > 0 && <span className={styles.infraTicketBadge}>
                              {ticketCounts["Office365:exchange"]}
                            </span>}
                        </span>}
                  </div>
                </div>
                {(!exchangeData || !exchangeData.emailActivity && !exchangeData.mailboxes && !exchangeData.topUsers) && <div className={styles.antivirusModalNoData}>
                    No Exchange data available. Please synchronize the data.
                  </div>}
                {exchangeData && (exchangeData.emailActivity || exchangeData.mailboxes) && <>
                    {exchangeData.emailActivity && <div style={{
              display: "flex",
              gap: "1rem",
              alignItems: "stretch",
              marginTop: "0.5rem",
              marginBottom: "1rem"
            }}>
                        {[{
                icon: "mdi:email-send",
                label: "Emails sent",
                total: exchangeData.emailActivity.sent,
                avg: exchangeData.emailActivity.averages?.sent
              }, {
                icon: "mdi:email-receive",
                label: "Emails received",
                total: exchangeData.emailActivity.received,
                avg: exchangeData.emailActivity.averages?.received
              }, {
                icon: "mdi:email-open",
                label: "Emails read",
                total: exchangeData.emailActivity.read,
                avg: exchangeData.emailActivity.averages?.read
              }, {
                icon: "mdi:percent",
                label: "Read rate",
                total: typeof exchangeData.emailActivity.readRate === "number" ? `${exchangeData.emailActivity.readRate.toFixed(1)}%` : "N/A",
                extra: exchangeData.emailActivity.read != null && exchangeData.emailActivity.received != null ? `${exchangeData.emailActivity.read.toLocaleString()} / ${exchangeData.emailActivity.received.toLocaleString()}` : null
              }].map((card, idx) => <div key={idx} style={{
                flex: "1 1 0",
                minWidth: 0,
                border: "1px solid #e5e7eb",
                borderRadius: 8,
                padding: "0.75rem 1rem",
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
                background: "#ffffff"
              }}>
                            <div style={{
                  width: 32,
                  height: 32,
                  borderRadius: 999,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "#f3f4f6",
                  color: "#4b5563",
                  flexShrink: 0
                }}>
                              <Icon icon={card.icon} width={18} height={18} />
                            </div>
                            <div style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.15rem",
                  minWidth: 0
                }}>
                              <div style={{
                    fontSize: "1.1rem",
                    fontWeight: 700,
                    color: "#111827"
                  }}>
                                {card.total != null ? typeof card.total === "number" ? card.total.toLocaleString() : card.total : "N/A"}
                              </div>
                              <div style={{
                    fontSize: "0.75rem",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    color: "#6b7280"
                  }}>
                                {card.label}
                              </div>
                              {card.avg != null && <div style={{
                    fontSize: "0.75rem",
                    color: "#6b7280"
                  }}>
                                  Average: {card.avg.toLocaleString()}/day
                                </div>}
                              {card.extra && <div style={{
                    fontSize: "0.75rem",
                    color: "#6b7280"
                  }}>
                                  {card.extra}
                                </div>}
                            </div>
                          </div>)}
                      </div>}

                    {exchangeData.emailActivity?.dailyActivity && exchangeData.emailActivity.dailyActivity.length > 0 && <div style={{
              marginTop: "1rem"
            }}>
                          <h5 className={styles.antivirusModalSubtitle}>
                            Email activity (sent / received / read)
                          </h5>
                          <div style={{
                background: "#ffffff",
                borderRadius: 10,
                border: "1px solid var(--border-primary, #e5e7eb)",
                padding: "0.75rem 1rem",
                height: 280
              }}>
                            <ResponsiveContainer width="100%" height="100%">
                              <LineChart data={exchangeData.emailActivity.dailyActivity.map(day => ({
                    date: new Date(day.date).toLocaleDateString("en-US", {
                      day: "2-digit",
                      month: "2-digit"
                    }),
                    envoyes: day.sent || 0,
                    recus: day.received || 0,
                    lus: day.read || 0
                  }))} margin={{
                    top: 10,
                    right: 10,
                    left: 0,
                    bottom: 0
                  }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                <XAxis dataKey="date" tick={{
                      fontSize: 11,
                      fill: "#6b7280"
                    }} />
                                <YAxis tick={{
                      fontSize: 11,
                      fill: "#6b7280"
                    }} />
                                <RechartsTooltip contentStyle={{
                      background: "#ffffff",
                      border: "1px solid #e5e7eb",
                      borderRadius: 6,
                      fontSize: 12
                    }} />
                                <RechartsLegend />
                                <Line type="monotone" dataKey="envoyes" name="Sent" stroke="#3b82f6" strokeWidth={2} dot={false} />
                                <Line type="monotone" dataKey="recus" name="Received" stroke="#10b981" strokeWidth={2} dot={false} />
                                <Line type="monotone" dataKey="lus" name="Read" stroke="#8b5cf6" strokeWidth={2} dot={false} />
                              </LineChart>
                            </ResponsiveContainer>
                          </div>
                        </div>}

                    {exchangeData.mailboxes && <div style={{
              marginTop: "1rem"
            }}>
                        <h5 className={styles.antivirusModalSubtitle}>
                          Mailboxes
                        </h5>
                        <div style={{
                display: "flex",
                gap: "1rem",
                alignItems: "stretch"
              }}>
                          {[{
                  icon: "mdi:email-multiple",
                  label: "Total mailboxes",
                  value: exchangeData.mailboxes.total != null ? exchangeData.mailboxes.total.toLocaleString() : "N/A",
                  subLabel: "Nombre"
                }, {
                  icon: "mdi:database",
                  label: "Total space used",
                  value: exchangeData.mailboxes.totalSize ?? "N/A",
                  subLabel: "Volume"
                }, {
                  icon: "mdi:scale",
                  label: "Taille moyenne",
                  value: exchangeData.mailboxes.averageSize ?? "N/A",
                  subLabel: "Per mailbox"
                }, {
                  icon: "mdi:email-outline",
                  label: "Total emails",
                  value: exchangeData.mailboxes.totalItems != null ? exchangeData.mailboxes.totalItems.toLocaleString() : "N/A",
                  subLabel: "Volume"
                }].map((card, idx) => <div key={idx} style={{
                  flex: "1 1 0",
                  minWidth: 0,
                  border: "1px solid #e5e7eb",
                  borderRadius: 8,
                  padding: "0.75rem 1rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                  background: "#ffffff"
                }}>
                              <div style={{
                    width: 32,
                    height: 32,
                    borderRadius: 999,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "#f3f4f6",
                    color: "#4b5563",
                    flexShrink: 0
                  }}>
                                <Icon icon={card.icon} width={18} height={18} />
                              </div>
                              <div style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.15rem",
                    minWidth: 0
                  }}>
                                <div style={{
                      fontSize: "1.1rem",
                      fontWeight: 700,
                      color: "#111827"
                    }}>
                                  {card.value}
                                </div>
                                <div style={{
                      fontSize: "0.75rem",
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      color: "#6b7280"
                    }}>
                                  {card.label}
                                </div>
                                {card.subLabel && <div style={{
                      fontSize: "0.75rem",
                      color: "#6b7280"
                    }}>
                                    {card.subLabel}
                                  </div>}
                              </div>
                            </div>)}
                        </div>
                      </div>}

                    {Array.isArray(exchangeData.topUsers) && exchangeData.topUsers.length > 0 && <div style={{
              marginTop: "1rem"
            }}>
                          <h5 className={styles.antivirusModalSubtitle}>
                            Top 5 users (email activity)
                          </h5>
                          <div className={styles.antivirusModalEndpointsScroll}>
                            <table className={styles.antivirusModalTable}>
                              <thead>
                                <tr>
                                  <th className={styles.antivirusStickyTh}>
                                    User
                                  </th>
                                  <th className={styles.antivirusStickyTh}>
                                    Sent
                                  </th>
                                  <th className={styles.antivirusStickyTh}>
                                    Received
                                  </th>
                                  <th className={styles.antivirusStickyTh}>
                                    Read
                                  </th>
                                  <th className={styles.antivirusStickyTh}>
                                    Total
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {exchangeData.topUsers.map((u, idx) => <tr key={idx}>
                                    <td>
                                      <div style={{
                          fontWeight: 500
                        }}>
                                        {u.name || "-"}
                                      </div>
                                      {u.email && <div style={{
                          fontSize: "0.8rem",
                          color: "#6b7280"
                        }}>
                                          {u.email}
                                        </div>}
                                    </td>
                                    <td>{u.sent?.toLocaleString() || 0}</td>
                                    <td>{u.received?.toLocaleString() || 0}</td>
                                    <td>{u.read?.toLocaleString() || 0}</td>
                                    <td>{u.total?.toLocaleString() || 0}</td>
                                  </tr>)}
                              </tbody>
                            </table>
                          </div>
                        </div>}
                  </>}
              </div>}

            {activeTab === "teams" && <div className={styles.o365TabPane}>
                <div className={styles.infraTableHeaderInline}>
                  <div className={styles.infraTableHeaderInlineInfo}>
                    <h4 className={styles.antivirusDetailBlockTitle}>Microsoft Teams</h4>
                  </div>
                  <div className={styles.infraTableHeaderInlineActions}>
                    {typeof onOpenComments === "function" && <button type="button" className={styles.infraIconButton} title="Teams comments" onClick={() => onOpenComments({
                name: "Microsoft Teams"
              }, {
                moduleKey: "Office365",
                equipmentKey: "Office365:teams"
              })}>
                        <Icon icon="mdi:comment-text-outline" />
                        {commentCounts?.["Office365:teams"] > 0 && <span className={styles.infraCommentBadge}>
                            {commentCounts["Office365:teams"]}
                          </span>}
                      </button>}
                    {typeof onTicketCreatedForEquipment === "function" && (client?.id || client?.uuid) && <span className={styles.infraIconButtonWrapper}>
                          
                          {ticketCounts?.["Office365:teams"] > 0 && <span className={styles.infraTicketBadge}>
                              {ticketCounts["Office365:teams"]}
                            </span>}
                        </span>}
                  </div>
                </div>
                {!teamsData && <div className={styles.antivirusModalNoData}>
                    No Teams data available. Please synchronize the data.
                  </div>}
                {teamsData && <>
                    {(() => {
              const rawUsage = teamsData.activity?.usage;
              const usageStats = rawUsage && typeof rawUsage === "object" && !Array.isArray(rawUsage) ? rawUsage : {};
              const licensedUsers = usageStats.licensedUsers || 0;
              const activeUsers = usageStats.activeUsers ?? teamsData.teams?.activeUsers ?? 0;
              const inactiveUsers = Math.max(0, licensedUsers - activeUsers);
              const adoptionRate = licensedUsers > 0 ? activeUsers / licensedUsers * 100 : null;
              const rawMessages = teamsData.activity?.messages;
              const messageStats = rawMessages && typeof rawMessages === "object" && !Array.isArray(rawMessages) ? rawMessages : {
                total: typeof rawMessages === "number" ? rawMessages : 0
              };
              const rawMeetings = teamsData.activity?.meetings;
              const meetingsStats = rawMeetings && typeof rawMeetings === "object" && !Array.isArray(rawMeetings) ? rawMeetings : {
                total: typeof rawMeetings === "number" ? rawMeetings : 0
              };
              const rawCalls = teamsData.activity?.calls || teamsData.calls;
              const callsStats = rawCalls && typeof rawCalls === "object" && !Array.isArray(rawCalls) ? rawCalls : {
                total: typeof rawCalls === "number" ? rawCalls : 0
              };
              const dailyActivity = teamsData.licensedActivity?.dailyActivity;
              return <>
                          <div className={styles.o365KpiSection}>
                            <h5 className={styles.o365KpiSectionTitle}>Users</h5>
                            {renderO365KpiRow([{
                    icon: "mdi:account-group",
                    label: "Number of users",
                    value: licensedUsers
                  }, {
                    icon: "mdi:account-check",
                    label: "Active",
                    value: activeUsers
                  }, {
                    icon: "mdi:account-off",
                    label: "Inactive",
                    value: inactiveUsers
                  }, {
                    icon: "mdi:percent",
                    label: "Taux d'adoption",
                    value: adoptionRate != null ? `${adoptionRate.toFixed(1)}%` : "N/A"
                  }], styles)}
                          </div>
                          <div className={styles.o365KpiSection}>
                            <h5 className={styles.o365KpiSectionTitle}>Messages</h5>
                            {renderO365KpiRow([{
                    icon: "mdi:message-text-outline",
                    label: "Total messages",
                    value: messageStats.total || 0
                  }, {
                    icon: "mdi:chat-processing-outline",
                    label: "Private chat",
                    value: messageStats.privateChat || 0
                  }, {
                    icon: "mdi:pound-box-outline",
                    label: "Channel messages",
                    value: messageStats.teamChat || 0
                  }, {
                    icon: "mdi:alert-decagram-outline",
                    label: "Urgent",
                    value: messageStats.urgent || 0
                  }], styles)}
                          </div>
                          <div className={styles.o365KpiSection}>
                            <h5 className={styles.o365KpiSectionTitle}>Meetings</h5>
                            {renderO365KpiRow([{
                    icon: "mdi:calendar-clock-outline",
                    label: "Total meetings",
                    value: meetingsStats.total || 0
                  }, {
                    icon: "mdi:calendar-plus",
                    label: "Organized",
                    value: meetingsStats.organized || 0
                  }, {
                    icon: "mdi:account-check-outline",
                    label: "Participations",
                    value: meetingsStats.attended || 0
                  }, {
                    icon: "mdi:calendar-blank-outline",
                    label: "Ad hoc",
                    value: meetingsStats.adHoc?.organized || 0
                  }], styles)}
                          </div>
                          <div className={styles.o365KpiSection}>
                            <h5 className={styles.o365KpiSectionTitle}>Calls</h5>
                            {renderO365KpiRow([{
                    icon: "mdi:phone-outline",
                    label: "Total calls",
                    value: callsStats.total || 0
                  }, {
                    icon: "mdi:timer-outline",
                    label: "Total duration",
                    value: callsStats.totalDuration || "0h 0m"
                  }, {
                    icon: "mdi:clock-time-four-outline",
                    label: "Average duration",
                    value: callsStats.averageDuration || "0h 0m"
                  }, {
                    icon: "mdi:video-outline",
                    label: "Video duration",
                    value: callsStats.videoDuration || "0h 0m"
                  }], styles)}
                          </div>

                          {Array.isArray(dailyActivity) && dailyActivity.length > 0 && <div style={{
                    flex: "1 1 0",
                    minWidth: 0
                  }}>
                                  <h5 className={styles.antivirusModalSubtitle}>
                                    Daily activity
                                  </h5>
                                  <div style={{
                      background: "#ffffff",
                      borderRadius: 10,
                      border: "1px solid var(--border-primary, #e5e7eb)",
                      padding: "0.75rem 1rem",
                      height: 320
                    }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                      <LineChart data={dailyActivity.map(day => ({
                          date: new Date(day.date).toLocaleDateString("en-US", {
                            day: "2-digit",
                            month: "2-digit"
                          }),
                          "Messages canal": day.channelMessages || 0,
                          "Messages chat": day.chatMessages || 0,
                          "Appels 1:1": day.oneOnOneCalls || 0,
                          "Total meetings": day.totalMeetings || 0
                        }))} margin={{
                          top: 10,
                          right: 10,
                          left: 0,
                          bottom: 0
                        }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                        <XAxis dataKey="date" tick={{
                            fontSize: 11
                          }} />
                                        <YAxis tick={{
                            fontSize: 11
                          }} />
                                        <RechartsTooltip contentStyle={{
                            fontSize: 12
                          }} formatter={value => typeof value === "number" ? value.toLocaleString() : value} />
                                        <RechartsLegend wrapperStyle={{
                            fontSize: 11
                          }} />
                                        <Line type="monotone" dataKey="Messages canal" stroke="#3b82f6" strokeWidth={2} dot={false} />
                                        <Line type="monotone" dataKey="Messages chat" stroke="#10b981" strokeWidth={2} dot={false} />
                                        <Line type="monotone" dataKey="Appels 1:1" stroke="#f59e0b" strokeWidth={2} dot={false} />
                                        <Line type="monotone" dataKey="Total meetings" stroke="#8b5cf6" strokeWidth={2} dot={false} />
                                      </LineChart>
                                    </ResponsiveContainer>
                                  </div>
                                </div>}
                        </>;
            })()}

                    {}
                    <div className={styles.o365TableFill}>
                      <table className={styles.antivirusModalTable}>
                        <thead>
                          <tr>
                            <th className={styles.antivirusStickyTh}>Name</th>
                            <th className={styles.antivirusStickyTh}>Visibility</th>
                            <th className={styles.antivirusStickyTh}>Membres</th>
                            <th className={styles.antivirusStickyTh}>Canaux</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(() => {
                    const rawTeams = teamsData.teams;
                    const teamsList = Array.isArray(rawTeams?.teamsList) ? rawTeams.teamsList : Array.isArray(rawTeams) ? rawTeams : [];
                    if (!teamsList.length) {
                      return <tr>
                                  <td colSpan={4}>No Teams teams available.</td>
                                </tr>;
                    }
                    return teamsList.map((t, idx) => <tr key={t.id || t.displayName || idx}>
                                <td>{t.displayName || t.name || "-"}</td>
                                <td>{t.visibility || t.accessType || "-"}</td>
                                <td>{t.memberCount ?? t.membersCount ?? (Array.isArray(t.members) ? t.members.length : "-")}</td>
                                <td>{t.channelCount ?? t.channelsCount ?? (Array.isArray(t.channels) ? t.channels.length : "-")}</td>
                              </tr>);
                  })()}
                        </tbody>
                      </table>
                    </div>
                  </>}
              </div>}

            {activeTab === "onedrive" && <div>
                <div className={styles.infraTableHeaderInline}>
                  <div className={styles.infraTableHeaderInlineInfo}>
                    <h4 className={styles.antivirusDetailBlockTitle}>OneDrive</h4>
                  </div>
                  <div className={styles.infraTableHeaderInlineActions}>
                    {typeof onOpenComments === "function" && <button type="button" className={styles.infraIconButton} title="OneDrive comments" onClick={() => onOpenComments({
                name: "OneDrive"
              }, {
                moduleKey: "Office365",
                equipmentKey: "Office365:onedrive"
              })}>
                        <Icon icon="mdi:comment-text-outline" />
                        {commentCounts?.["Office365:onedrive"] > 0 && <span className={styles.infraCommentBadge}>
                            {commentCounts["Office365:onedrive"]}
                          </span>}
                      </button>}
                    {typeof onTicketCreatedForEquipment === "function" && (client?.id || client?.uuid) && <span className={styles.infraIconButtonWrapper}>
                          
                          {ticketCounts?.["Office365:onedrive"] > 0 && <span className={styles.infraTicketBadge}>
                              {ticketCounts["Office365:onedrive"]}
                            </span>}
                        </span>}
                  </div>
                </div>
                {!onedriveData && <div className={styles.antivirusModalNoData}>
                    No OneDrive data available. Please synchronize the data.
                  </div>}
                {onedriveData && onedriveData.success === false && <div className={styles.antivirusModalNoData}>
                    <div style={{
              color: "#ef4444",
              fontWeight: 500
            }}>
                      ❌ Error loading OneDrive data
                    </div>
                    <div style={{
              marginTop: 4,
              color: "#6b7280"
            }}>
                      {onedriveData.error || "Unknown error"}
                    </div>
                  </div>}
                {onedriveData && onedriveData.success !== false && <>
                    {}
                    <div className={styles.o365KpiRow4}>
                      {[{
                icon: "mdi:database",
                label: "Total space used",
                value: onedriveData.storage?.totalUsed || "0 B"
              }, {
                icon: "mdi:file-multiple",
                label: "Number of files",
                value: onedriveData.storage?.totalFiles !== undefined ? onedriveData.storage.totalFiles.toLocaleString() : "0"
              }, {
                icon: "mdi:account",
                label: "Average per user",
                value: onedriveData.storage?.averagePerUser || "0 B"
              }].concat(onedriveData.sharing?.byActivityType ? [{
                icon: "mdi:eye",
                label: "Files viewed/modified",
                value: onedriveData.sharing.byActivityType.viewedOrEdited !== undefined ? onedriveData.sharing.byActivityType.viewedOrEdited.toLocaleString() : "0"
              }, {
                icon: "mdi:sync",
                label: "Files synchronized",
                value: onedriveData.sharing.byActivityType.synced !== undefined ? onedriveData.sharing.byActivityType.synced.toLocaleString() : "0"
              }, {
                icon: "mdi:account-group",
                label: "Internal shares",
                value: onedriveData.sharing.byActivityType.sharedInternally !== undefined ? onedriveData.sharing.byActivityType.sharedInternally.toLocaleString() : "0"
              }, {
                icon: "mdi:earth",
                label: "External shares",
                value: onedriveData.sharing.byActivityType.sharedExternally !== undefined ? onedriveData.sharing.byActivityType.sharedExternally.toLocaleString() : "0"
              }] : []).map((card, idx) => <div key={idx} style={{
                flex: "1 1 0",
                minWidth: 0,
                border: "1px solid #e5e7eb",
                borderRadius: 8,
                padding: "0.75rem 1rem",
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
                background: "#ffffff"
              }}>
                            <div style={{
                  width: 32,
                  height: 32,
                  borderRadius: 999,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "#f3f4f6",
                  color: "#4b5563",
                  flexShrink: 0
                }}>
                              <Icon icon={card.icon} width={18} height={18} />
                            </div>
                            <div style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.15rem",
                  minWidth: 0
                }}>
                              <div style={{
                    fontSize: "1.05rem",
                    fontWeight: 700,
                    color: "#111827"
                  }}>
                                {card.value}
                              </div>
                              <div style={{
                    fontSize: "0.75rem",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    color: "#6b7280"
                  }}>
                                {card.label}
                              </div>
                            </div>
                          </div>)}
                    </div>

                    {}
                    {onedriveData.topUsers && Array.isArray(onedriveData.topUsers) && onedriveData.topUsers.length > 0 && <div style={{
              marginBottom: "1rem"
            }}>
                          <h5 className={styles.antivirusModalSubtitle}>
                            Top users
                          </h5>
                          <div className={styles.antivirusModalEndpointsScroll}>
                            <table className={styles.antivirusModalTable}>
                              <thead>
                                <tr>
                                  <th className={styles.antivirusStickyTh}>
                                    User
                                  </th>
                                  <th className={styles.antivirusStickyTh}>
                                    Storage used
                                  </th>
                                  <th className={styles.antivirusStickyTh}>
                                    Files
                                  </th>
                                  <th className={styles.antivirusStickyTh}>
                                    Shared
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {onedriveData.topUsers.slice(0, 10).map((user, idx) => <tr key={idx}>
                                      <td>
                                        {user.name || user.userPrincipalName || "N/A"}
                                      </td>
                                      <td>
                                        {user.storageUsed ? `${(user.storageUsed / 1024 / 1024 / 1024).toFixed(2)} GB` : "0 GB"}
                                      </td>
                                      <td>
                                        {user.fileCount?.toLocaleString() || "0"}
                                      </td>
                                      <td>
                                        {user.sharedCount?.toLocaleString() || "0"}
                                      </td>
                                    </tr>)}
                              </tbody>
                            </table>
                          </div>
                        </div>}

                    {}
                    {onedriveData.usersNearQuota && Array.isArray(onedriveData.usersNearQuota) && onedriveData.usersNearQuota.length > 0 && <div style={{
              marginBottom: "1rem"
            }}>
                          <h5 className={styles.antivirusModalSubtitle}>
                            Users near quota (&gt;90%)
                          </h5>
                          <div className={styles.antivirusModalEndpointsScroll}>
                            <table className={styles.antivirusModalTable}>
                              <thead>
                                <tr>
                                  <th className={styles.antivirusStickyTh}>
                                    User
                                  </th>
                                  <th className={styles.antivirusStickyTh}>
                                    Email
                                  </th>
                                  <th className={styles.antivirusStickyTh}>
                                    Usage
                                  </th>
                                  <th className={styles.antivirusStickyTh}>
                                    Files
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {onedriveData.usersNearQuota.map((user, idx) => <tr key={idx}>
                                      <td>{user.name || "N/A"}</td>
                                      <td>{user.email || "N/A"}</td>
                                      <td>
                                        <span style={{
                          display: "inline-flex",
                          alignItems: "center",
                          padding: "0.15rem 0.4rem",
                          borderRadius: 999,
                          background: "rgba(239, 68, 68, 0.1)",
                          color: "#b91c1c",
                          fontSize: "0.75rem",
                          fontWeight: 600
                        }}>
                                          {user.usagePercent}% (
                                          {user.used})
                                        </span>
                                      </td>
                                      <td>
                                        {user.files?.toLocaleString() || "0"}
                                      </td>
                                    </tr>)}
                              </tbody>
                            </table>
                          </div>
                        </div>}
                  </>}
              </div>}

            {activeTab === "sharepoint" && <div className={styles.o365TabPane}>
                <div className={styles.infraTableHeaderInline}>
                  <div className={styles.infraTableHeaderInlineInfo}>
                    <h4 className={styles.antivirusDetailBlockTitle}>SharePoint</h4>
                  </div>
                  <div className={styles.infraTableHeaderInlineActions}>
                    {typeof onOpenComments === "function" && <button type="button" className={styles.infraIconButton} title="SharePoint comments" onClick={() => onOpenComments({
                name: "SharePoint"
              }, {
                moduleKey: "Office365",
                equipmentKey: "Office365:sharepoint"
              })}>
                        <Icon icon="mdi:comment-text-outline" />
                        {commentCounts?.["Office365:sharepoint"] > 0 && <span className={styles.infraCommentBadge}>
                            {commentCounts["Office365:sharepoint"]}
                          </span>}
                      </button>}
                    {typeof onTicketCreatedForEquipment === "function" && (client?.id || client?.uuid) && <span className={styles.infraIconButtonWrapper}>
                          
                          {ticketCounts?.["Office365:sharepoint"] > 0 && <span className={styles.infraTicketBadge}>
                              {ticketCounts["Office365:sharepoint"]}
                            </span>}
                        </span>}
                  </div>
                </div>

                {!sharepointData && <div className={styles.antivirusModalNoData}>
                    No SharePoint data available. Please synchronize the data.
                  </div>}

                {sharepointData && sharepointData.success === false && <div className={styles.antivirusModalNoData}>
                    <div style={{
              color: "#ef4444",
              fontWeight: 500
            }}>
                      ❌ Error loading SharePoint data
                    </div>
                    <div style={{
              marginTop: 4,
              color: "#6b7280"
            }}>
                      {sharepointData.error || "Unknown error"}
                    </div>
                  </div>}

                {sharepointData && sharepointData.success !== false && <>
                    {Array.isArray(sharepointData.sites) && sharepointData.sites.length > 0 && <div className={styles.o365TableFill}>
                          <table className={styles.antivirusModalTable}>
                            <thead>
                              <tr>
                                <th className={styles.antivirusStickyTh}>
                                  Site name
                                </th>
                                <th className={styles.antivirusStickyTh}>
                                  URL
                                </th>
                                <th className={styles.antivirusStickyTh}>
                                  Created date
                                </th>
                                <th className={styles.antivirusStickyTh}>
                                  Last activity
                                </th>
                                <th className={styles.antivirusStickyTh}>
                                  Status
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {sharepointData.sites.map((site, idx) => <tr key={site.id || idx}>
                                  <td>
                                    <span style={{
                        fontWeight: 600
                      }}>
                                      {site.name || site.displayName || "-"}
                                    </span>
                                  </td>
                                  <td>{site.webUrl || site.url || "-"}</td>
                                  <td>
                                    {site.createdDateTime ? new Date(site.createdDateTime).toLocaleDateString("en-US", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric"
                      }) : "-"}
                                  </td>
                                  <td>
                                    {site.lastActivityDate ? new Date(site.lastActivityDate).toLocaleDateString("en-US", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric"
                      }) : site.lastModifiedDateTime ? new Date(site.lastModifiedDateTime).toLocaleDateString("en-US", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric"
                      }) : "-"}
                                  </td>
                                  <td>
                                    {site.isActive !== false ? "Active" : "Inactive"}
                                  </td>
                                </tr>)}
                            </tbody>
                          </table>
                        </div>}

                    {(!sharepointData.sites || !Array.isArray(sharepointData.sites) || sharepointData.sites.length === 0) && <div className={styles.antivirusModalNoData}>
                        No SharePoint site available.
                      </div>}
                  </>}
              </div>}

            {activeTab === "securite" && <div className={styles.o365TabPane}>
                <div className={styles.infraTableHeaderInline}>
                  <div className={styles.infraTableHeaderInlineInfo}>
                    <h4 className={styles.antivirusDetailBlockTitle}>Security</h4>
                  </div>
                  <div className={styles.infraTableHeaderInlineActions}>
                    {typeof onOpenComments === "function" && <button type="button" className={styles.infraIconButton} title="Security comments" onClick={() => onOpenComments({
                name: "Microsoft 365 Security"
              }, {
                moduleKey: "Office365",
                equipmentKey: "Office365:security"
              })}>
                        <Icon icon="mdi:comment-text-outline" />
                        {commentCounts?.["Office365:security"] > 0 && <span className={styles.infraCommentBadge}>
                            {commentCounts["Office365:security"]}
                          </span>}
                      </button>}
                    {typeof onTicketCreatedForEquipment === "function" && (client?.id || client?.uuid) && <span className={styles.infraIconButtonWrapper}>
                          
                          {ticketCounts?.["Office365:security"] > 0 && <span className={styles.infraTicketBadge}>
                              {ticketCounts["Office365:security"]}
                            </span>}
                        </span>}
                  </div>
                </div>
                {!securityData && <div className={styles.antivirusModalNoData}>
                    No security data available. Please synchronize the data.
                  </div>}
                {securityData && securityData.success === false && <div className={styles.antivirusModalNoData}>
                    <div style={{
              color: "#ef4444",
              fontWeight: 500
            }}>
                      ❌ Error loading security data
                    </div>
                    <div style={{
              marginTop: 4,
              color: "#6b7280"
            }}>
                      {securityData.error || "Unknown error"}
                    </div>
                  </div>}
                {securityData && securityData.success !== false && <>
                    {(() => {
              const recs = Array.isArray(securityData.secureScoreRecommendations) ? securityData.secureScoreRecommendations : [];
              const globalTotal = securityKpiStats.usersWithMFA + securityKpiStats.usersWithoutMFA;
              const adminTotal = securityKpiStats.adminsTotal;
              const nonAdminTotal = securityKpiStats.nonAdminWithMFA + securityKpiStats.nonAdminWithoutMFA;
              const rate = (withMfa, total) => total > 0 ? `${Math.round(withMfa / total * 100)}%` : "-";
              return <>
                          {renderO365KpiRow([{
                    icon: "mdi:shield-check",
                    label: "Secure Score",
                    value: metrics.secureScore?.currentScore != null ? `${Math.round(metrics.secureScore.currentScore)} / ${metrics.secureScore.maxScore || 100}` : "-",
                    sub: typeof metrics.secureScore?.percentage === "number" ? `${Math.round(metrics.secureScore.percentage)}% obtained` : null
                  }, {
                    icon: "mdi:earth",
                    label: "Global MFA",
                    value: rate(securityKpiStats.usersWithMFA, globalTotal),
                    sub: `${securityKpiStats.usersWithMFA} with · ${securityKpiStats.usersWithoutMFA} without`
                  }, {
                    icon: "mdi:account-supervisor",
                    label: "Admin MFA",
                    value: rate(securityKpiStats.adminsWithMFA, adminTotal),
                    sub: `${securityKpiStats.adminsWithMFA} with · ${securityKpiStats.adminsWithoutMFA} without`
                  }, {
                    icon: "mdi:account-group-outline",
                    label: "Non-admin MFA",
                    value: rate(securityKpiStats.nonAdminWithMFA, nonAdminTotal),
                    sub: `${securityKpiStats.nonAdminWithMFA} with · ${securityKpiStats.nonAdminWithoutMFA} without`
                  }], styles)}
                          <h5 className={styles.o365KpiSectionTitle}>Recommendations</h5>
                          <div className={styles.o365TableFill}>
                            <table className={styles.antivirusModalTable}>
                              <thead>
                                <tr>
                                  <th className={styles.antivirusStickyTh}>Recommendation</th>
                                  <th className={styles.antivirusStickyTh}>Category</th>
                                  <th className={styles.antivirusStickyTh}>Priority</th>
                                  <th className={styles.antivirusStickyTh}>Points</th>
                                  <th className={styles.antivirusStickyTh}>Status</th>
                                </tr>
                              </thead>
                              <tbody>
                                {recs.length === 0 ? <tr>
                                    <td colSpan={5}>No recommendations returned for this tenant.</td>
                                  </tr> : recs.map((rec, idx) => <tr key={rec.id || idx}>
                                    <td>{rec.titleFr || rec.title || rec.displayName || "-"}</td>
                                    <td>{rec.categoryFr || rec.category || "-"}</td>
                                    <td>{rec.priorityLabel || rec.priority || "-"}</td>
                                    <td>{rec.maxScore != null ? rec.maxScore : "-"}</td>
                                    <td>{rec.stateLabel || rec.state || "-"}</td>
                                  </tr>)}
                              </tbody>
                            </table>
                          </div>
                        </>;
            })()}
                  </>}
              </div>}
          </>}
      </div>
    </MonitoringStepShell>;
}
