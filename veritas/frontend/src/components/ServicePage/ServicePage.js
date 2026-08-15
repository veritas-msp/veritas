import { useState, useEffect, useMemo, useRef } from "react";
import React from "react";
import { Icon } from "@iconify/react";
import { toast } from 'react-toastify';
import { fetchClientsList } from "../../api/clients";
import API_BASE_URL from "../../config";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import cyberStyles from "../CybersecuritePage/CybersecuritePage.module.css";
import layout from "../EnterprisesPage/EnterprisesPage.module.css";
import SupportOrbitalBackground from "../Misc/ReportBugForm/SupportOrbitalBackground";
import MspPageHero from "../Misc/MspPageHero/MspPageHero";
import SmartTooltip from "../SmartTooltip";
import DomainMspDashboard from "./DomainMspDashboard";
import SslMspDashboard from "./SslMspDashboard";
import MicrosoftTenantMspDashboard from "./MicrosoftTenantMspDashboard";
import { fetchOffice365Data } from "../../api/office365";
import { getServicePageCopy } from "./servicePageI18n";
import { listConfiguredDomainIntegrations } from "./servicePageDomainSync";
import { buildMicrosoftTenantFleetStats } from "./microsoftTenantMspUtils";
import { buildDomainFleetFromList, buildDomainFleetStats } from "./domainMspUtils";
import { buildSslFleetFromList, buildSslFleetStats } from "./sslMspUtils";
const MODULE_TABS = ["microsoft", "domain", "ssl"];
const SERVICE_CLIENTS_CACHE_KEY = "service_clients_list_cache_v2";
const SERVICE_CLIENTS_CACHE_TTL_MS = 5 * 60 * 1000;
const SERVICE_DOMAINS_CACHE_KEY = "service_domains_all_cache_v1";
const SERVICE_DOMAINS_CACHE_TTL_MS = 2 * 60 * 1000;
const SERVICE_SSL_CACHE_KEY = "service_ssl_all_cache_v1";
const SERVICE_SSL_CACHE_TTL_MS = 2 * 60 * 1000;
function normalizeClientListRow(client) {
  let modulesSnapshot = client.modules;
  if (typeof modulesSnapshot === "string") {
    try {
      modulesSnapshot = JSON.parse(modulesSnapshot);
    } catch {
      modulesSnapshot = {};
    }
  }
  if (!modulesSnapshot || typeof modulesSnapshot !== "object") {
    modulesSnapshot = {};
  }
  return {
    ...client,
    modules_monitoring: modulesSnapshot
  };
}
function extractSecuritySnapshotMetrics(snapshotData) {
  const empty = {
    secureScoreCurrent: null,
    secureScoreMax: null,
    mfaAdminPct: null,
    mfaNonAdminPct: null
  };
  if (!snapshotData || typeof snapshotData !== "object") return empty;
  const raw = snapshotData.securityData;
  if (!raw || raw.success === false) return empty;
  const ss = raw.secureScore || snapshotData.secureScore;
  let secureScoreCurrent = null;
  let secureScoreMax = null;
  if (ss && ss.currentScore != null && ss.maxScore != null) {
    secureScoreCurrent = Number(ss.currentScore);
    secureScoreMax = Number(ss.maxScore);
  }
  const mfa = raw.mfa || {};
  const adminStats = raw.adminStats || {};
  let mfaAdminPct = null;
  if (typeof adminStats.mfaRate === "number") {
    mfaAdminPct = adminStats.mfaRate;
  } else if (adminStats.total > 0 && adminStats.withMFA != null) {
    mfaAdminPct = Math.round(adminStats.withMFA / adminStats.total * 100);
  }
  const totalUsers = typeof mfa.totalUsers === "number" ? mfa.totalUsers : Array.isArray(snapshotData.users) ? snapshotData.users.length : 0;
  const totalAdmins = adminStats.total ?? 0;
  const usersWithMFA = mfa.usersWithMFA ?? 0;
  const adminsWithMFA = adminStats.withMFA ?? 0;
  const nonAdminUsers = Math.max(0, totalUsers - totalAdmins);
  const nonAdminWithMfa = Math.max(0, usersWithMFA - adminsWithMFA);
  let mfaNonAdminPct = null;
  if (nonAdminUsers > 0) {
    mfaNonAdminPct = Math.round(nonAdminWithMfa / nonAdminUsers * 100);
  } else if (typeof mfa.mfaRate === "number" && totalAdmins === 0) {
    mfaNonAdminPct = mfa.mfaRate;
  }
  return {
    secureScoreCurrent,
    secureScoreMax,
    mfaAdminPct,
    mfaNonAdminPct
  };
}
export default function ServicePage({
  onNavigate,
  serviceParams
}) {
  const locale = useAppLocale();
  const pageCopy = useMemo(() => getServicePageCopy(locale), [locale]);
  const [activeTab, setActiveTab] = useState(MODULE_TABS.includes(serviceParams?.activeTab) ? serviceParams.activeTab : "microsoft");
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const [syncStatus, setSyncStatus] = useState('');
  const [allDomains, setAllDomains] = useState([]);
  const [loadingDomains, setLoadingDomains] = useState(false);
  const [syncingDomains, setSyncingDomains] = useState(false);
  const [allSslCerts, setAllSslCerts] = useState([]);
  const [loadingSsl, setLoadingSsl] = useState(false);
  const [checkingSsl, setCheckingSsl] = useState(false);
  const [o365DataByClient, setO365DataByClient] = useState({});
  const clientsControllerRef = useRef(null);
  const domainsAbortRef = useRef(null);
  const sslAbortRef = useRef(null);
  const o365AbortRef = useRef(null);
  useEffect(() => {
    loadClients();
  }, []);
  useEffect(() => {
    if (!serviceParams?.activeTab) return;
    setActiveTab(MODULE_TABS.includes(serviceParams.activeTab) ? serviceParams.activeTab : "microsoft");
  }, [serviceParams?.activeTab]);
  useEffect(() => {
    if (activeTab === "domain") {
      loadAllDomains();
    }
    if (activeTab === "ssl") {
      loadAllSslCerts();
    }
    if (activeTab === "microsoft") {
      loadO365DataForClients();
    }
  }, [activeTab, clients]);
  useEffect(() => {
    return () => {
      clientsControllerRef.current?.abort();
      domainsAbortRef.current?.abort();
      sslAbortRef.current?.abort();
      o365AbortRef.current?.abort();
    };
  }, []);
  const loadO365DataForClients = async clientsList => {
    const sourceClients = Array.isArray(clientsList) ? clientsList : clients;
    o365AbortRef.current?.abort();
    const controller = new AbortController();
    o365AbortRef.current = controller;
    const {
      signal
    } = controller;
    const clientsWithO365 = sourceClients.filter(client => client.modules_monitoring?.Office365);
    if (clientsWithO365.length === 0) {
      if (!signal.aborted) setO365DataByClient({});
      return;
    }
    try {
      const o365DataMap = {};
      const promises = clientsWithO365.map(async client => {
        let tenantId = null;
        let lastSync = null;
        let userCount = null;
        let totalLicenses = null;
        let secureScoreCurrent = null;
        let secureScoreMax = null;
        let mfaAdminPct = null;
        let mfaNonAdminPct = null;
        try {
          const [snapshotResponse, credentialsResponse] = await Promise.all([fetch(`${API_BASE_URL}/clients/${client.id}/o365`, {
            credentials: 'include',
            signal
          }), fetch(`${API_BASE_URL}/client-office365/${client.id}`, {
            credentials: 'include',
            signal
          }).catch(() => null)]);
          let users = [];
          if (snapshotResponse.ok) {
            const result = await snapshotResponse.json();
            if (result.success && result.data?.length > 0) {
              const latestSnapshot = result.data[0];
              if (latestSnapshot.data) {
                tenantId = latestSnapshot.data.tenantId || latestSnapshot.item_key || null;
                lastSync = latestSnapshot.data.lastUpdate || latestSnapshot.updated_at || null;
                if (latestSnapshot.data.users && Array.isArray(latestSnapshot.data.users)) {
                  users = latestSnapshot.data.users;
                  userCount = users.filter(u => {
                    const name = (u.name || u.displayName || '').toString();
                    const upn = (u.userPrincipalName || u.email || '').toString();
                    const email = (u.email || '').toString();
                    const combined = `${name} ${upn} ${email}`.toLowerCase();
                    const patterns = [/aad_/, /msol_/, /sync_/, /svc_/, /service_/, /\$@/, /_srv/, /_service/, /_sync/, /compte de service|service account|compte service/, /bot\./, /bot@/, /connector/, /automation/, /azure ad sync|ad sync|dirsync|aadconnect|dir sync/, /directory synchronization|synchronization service|on-premises/, /healthmailbox|systemmailbox|federatedemail/];
                    return !patterns.some(p => p.test(combined));
                  }).length;
                }
                const licences = latestSnapshot.data.licences || [];
                if (Array.isArray(licences) && licences.length > 0) {
                  const validLicenses = licences.filter(lic => {
                    const t = lic.total ?? lic.totalLicenses ?? 0;
                    return t > 0 && t < 10000;
                  });
                  totalLicenses = validLicenses.reduce((sum, lic) => sum + (lic.total ?? lic.totalLicenses ?? 0), 0);
                  if (totalLicenses === 0) totalLicenses = licences.reduce((sum, lic) => sum + (lic.total ?? lic.totalLicenses ?? 0), 0);
                }
                const sec = extractSecuritySnapshotMetrics(latestSnapshot.data);
                secureScoreCurrent = sec.secureScoreCurrent;
                secureScoreMax = sec.secureScoreMax;
                mfaAdminPct = sec.mfaAdminPct;
                mfaNonAdminPct = sec.mfaNonAdminPct;
              }
            }
          }
          if (credentialsResponse && credentialsResponse.ok) {
            try {
              const credResult = await credentialsResponse.json();
              if (!tenantId && credResult?.credentials?.tenantId) {
                tenantId = credResult.credentials.tenantId;
              }
            } catch (credErr) {}
          }
          try {
            const statsRes = await fetch(`${API_BASE_URL}/office365/stats/saved/${client.id}`, {
              credentials: "include",
              signal
            });
            if (statsRes.ok) {
              const json = await statsRes.json();
              if (json?.success && json.stats) {
                const s = json.stats;
                if (typeof s.admin_mfa_percentage === "number") {
                  mfaAdminPct = s.admin_mfa_percentage;
                }
                if (typeof s.regular_user_mfa_percentage === "number") {
                  mfaNonAdminPct = s.regular_user_mfa_percentage;
                }
              }
            }
          } catch {}
          o365DataMap[client.id] = {
            tenantId: tenantId || '-',
            lastSync,
            userCount: userCount != null ? userCount : '-',
            totalLicenses: totalLicenses != null ? totalLicenses : '-',
            secureScoreCurrent,
            secureScoreMax,
            mfaAdminPct,
            mfaNonAdminPct
          };
        } catch (error) {
          if (error?.name === 'AbortError') throw error;
          console.error(`Error loading O365 data for client ${client.id}:`, error);
          o365DataMap[client.id] = {
            tenantId: '-',
            lastSync: null,
            userCount: '-',
            totalLicenses: '-',
            secureScoreCurrent: null,
            secureScoreMax: null,
            mfaAdminPct: null,
            mfaNonAdminPct: null
          };
        }
      });
      await Promise.all(promises);
      if (signal.aborted) return;
      setO365DataByClient(o365DataMap);
    } catch (error) {
      if (error?.name === 'AbortError') return;
      console.error('Error loading O365 data:', error);
    }
  };
  const loadClients = async ({
    force = false
  } = {}) => {
    if (!force) {
      try {
        const raw = sessionStorage.getItem(SERVICE_CLIENTS_CACHE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          const isFresh = parsed?.savedAt && Array.isArray(parsed?.data) && Date.now() - parsed.savedAt < SERVICE_CLIENTS_CACHE_TTL_MS;
          if (isFresh) {
            setClients(parsed.data);
            return parsed.data;
          }
        }
      } catch {}
    }
    try {
      clientsControllerRef.current?.abort();
      const controller = new AbortController();
      clientsControllerRef.current = controller;
      setLoading(true);
      const clientsData = await fetchClientsList({
        signal: controller.signal
      });
      if (controller.signal.aborted) return undefined;
      const normalized = (Array.isArray(clientsData) ? clientsData : []).map(normalizeClientListRow);
      setClients(normalized);
      try {
        sessionStorage.setItem(SERVICE_CLIENTS_CACHE_KEY, JSON.stringify({
          savedAt: Date.now(),
          data: normalized
        }));
      } catch {}
      return normalized;
    } catch (error) {
      if (error?.name === 'AbortError') return undefined;
      console.error('Error loading clients:', error);
      setClients([]);
      return [];
    } finally {
      setLoading(false);
    }
  };
  const loadAllDomains = async ({
    force = false
  } = {}) => {
    if (!force) {
      try {
        const raw = sessionStorage.getItem(SERVICE_DOMAINS_CACHE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          const isFresh = parsed?.savedAt && Array.isArray(parsed?.data) && Date.now() - parsed.savedAt < SERVICE_DOMAINS_CACHE_TTL_MS;
          if (isFresh) {
            setAllDomains(parsed.data);
            return;
          }
        }
      } catch {}
    }
    domainsAbortRef.current?.abort();
    const controller = new AbortController();
    domainsAbortRef.current = controller;
    try {
      setLoadingDomains(true);
      const response = await fetch(`${API_BASE_URL}/clients/domains/all`, {
        credentials: 'include',
        signal: controller.signal
      });
      if (!response.ok) {
        throw new Error('Error loading domains');
      }
      const domainsData = await response.json();
      if (controller.signal.aborted) return;
      const list = domainsData || [];
      setAllDomains(list);
      try {
        sessionStorage.setItem(SERVICE_DOMAINS_CACHE_KEY, JSON.stringify({
          savedAt: Date.now(),
          data: list
        }));
      } catch {}
    } catch (error) {
      if (error?.name === 'AbortError') return;
      console.error('Error while loading de tous les domaines:', error);
      setAllDomains([]);
    } finally {
      setLoadingDomains(false);
    }
  };
  const loadAllSslCerts = async ({
    force = false
  } = {}) => {
    if (!force) {
      try {
        const raw = sessionStorage.getItem(SERVICE_SSL_CACHE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          const isFresh = parsed?.savedAt && Array.isArray(parsed?.data) && Date.now() - parsed.savedAt < SERVICE_SSL_CACHE_TTL_MS;
          if (isFresh) {
            setAllSslCerts(parsed.data);
            return;
          }
        }
      } catch {}
    }
    sslAbortRef.current?.abort();
    const controller = new AbortController();
    sslAbortRef.current = controller;
    try {
      setLoadingSsl(true);
      const response = await fetch(`${API_BASE_URL}/clients/ssl-certificates/all`, {
        credentials: "include",
        signal: controller.signal
      });
      if (!response.ok) {
        throw new Error("Error loading SSL certificates");
      }
      const sslData = await response.json();
      if (controller.signal.aborted) return;
      const list = sslData || [];
      setAllSslCerts(list);
      try {
        sessionStorage.setItem(SERVICE_SSL_CACHE_KEY, JSON.stringify({
          savedAt: Date.now(),
          data: list
        }));
      } catch {}
    } catch (error) {
      if (error?.name === "AbortError") return;
      console.error("Error loading SSL certificates:", error);
      setAllSslCerts([]);
    } finally {
      setLoadingSsl(false);
    }
  };
  const microsoftData = useMemo(() => {
    const data = [];
    clients.forEach(client => {
      if (client.modules_monitoring?.Office365) {
        const o365Data = o365DataByClient[client.id] || {};
        data.push({
          clientId: client.id,
          clientName: client.name,
          status: client.Office365?.status || 'actif',
          tenantId: o365Data.tenantId || client.Office365?.tenantId || '-',
          userCount: o365Data.userCount ?? client.Office365?.userCount ?? '-',
          totalLicenses: o365Data.totalLicenses ?? client.Office365?.totalLicenses ?? '-',
          lastSync: o365Data.lastSync || client.Office365?.lastSync || null,
          secureScoreCurrent: o365Data.secureScoreCurrent ?? null,
          secureScoreMax: o365Data.secureScoreMax ?? null,
          mfaAdminPct: o365Data.mfaAdminPct ?? null,
          mfaNonAdminPct: o365Data.mfaNonAdminPct ?? null
        });
      }
    });
    return data;
  }, [clients, o365DataByClient]);
  const handleSyncMicrosoft = async () => {
    if (syncing) return;
    const targets = microsoftData.filter(row => row.clientId);
    if (targets.length === 0) {
      toast.info(pageCopy.toasts.syncNoneMicrosoft);
      return;
    }
    setSyncing(true);
    setSyncProgress(0);
    setSyncStatus(pageCopy.toasts.syncPreparing);
    let successCount = 0;
    let errorCount = 0;
    try {
      let processed = 0;
      for (const row of targets) {
        try {
          setSyncStatus(pageCopy.formatSyncProgress(processed + 1, targets.length, row.clientName));
          await fetchOffice365Data(row.clientId);
          successCount += 1;
        } catch (error) {
          console.error(`Error syncing Microsoft for ${row.clientName}:`, error);
          errorCount += 1;
        } finally {
          processed += 1;
          setSyncProgress(Math.round(processed / targets.length * 100));
        }
      }
      await loadO365DataForClients(clients);
      if (successCount > 0) {
        toast.success(pageCopy.formatSyncSuccess(successCount, errorCount));
      } else {
        toast.error(pageCopy.formatSyncFailed(errorCount));
      }
    } catch (error) {
      console.error("Sync error:", error);
      toast.error(pageCopy.toasts.syncMicrosoftError);
    } finally {
      setSyncing(false);
      setSyncProgress(100);
      setSyncStatus(pageCopy.toasts.syncDone);
      setTimeout(() => {
        setSyncProgress(0);
        setSyncStatus("");
      }, 1200);
    }
  };
  const handleSyncDomains = async () => {
    if (syncingDomains) return;
    setSyncingDomains(true);
    setSyncProgress(0);
    setSyncStatus(pageCopy.toasts.syncPreparing);
    let successCount = 0;
    let errorCount = 0;
    try {
      const integrations = await listConfiguredDomainIntegrations();
      if (integrations.length === 0) {
        toast.info(pageCopy.toasts.syncNoneDomains);
        return;
      }
      let processed = 0;
      for (const integration of integrations) {
        try {
          setSyncStatus(pageCopy.formatSyncProgress(processed + 1, integrations.length, integration.label));
          await integration.sync();
          successCount += 1;
        } catch (error) {
          console.error(`Error syncing domain integration ${integration.id}:`, error);
          errorCount += 1;
        } finally {
          processed += 1;
          setSyncProgress(Math.round(processed / integrations.length * 100));
        }
      }
      await loadAllDomains({
        force: true
      });
      if (successCount > 0) {
        toast.success(pageCopy.formatSyncSuccess(successCount, errorCount));
      } else {
        toast.error(pageCopy.formatSyncFailed(errorCount));
      }
    } catch (error) {
      console.error("Domain sync error:", error);
      toast.error(error.message || pageCopy.toasts.syncDomainsError);
    } finally {
      setSyncingDomains(false);
      setSyncProgress(100);
      setSyncStatus(pageCopy.toasts.syncDone);
      setTimeout(() => {
        setSyncProgress(0);
        setSyncStatus("");
      }, 1200);
    }
  };
  const handleCheckAllSsl = async () => {
    if (checkingSsl) return;
    setCheckingSsl(true);
    setSyncProgress(0);
    setSyncStatus(pageCopy.toasts.syncPreparing);
    try {
      toast.info(pageCopy.toasts.sslCheckStarted);
      const response = await fetch(`${API_BASE_URL}/clients/ssl-certificates/check-all`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json"
        }
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Error during SSL check");
      }
      const result = await response.json();
      setSyncProgress(100);
      setSyncStatus(pageCopy.toasts.syncDone);
      await loadAllSslCerts({
        force: true
      });
      toast.success(result.checked != null ? `${pageCopy.toasts.sslCheckSuccess} (${result.checked})` : pageCopy.toasts.sslCheckSuccess);
    } catch (error) {
      console.error("SSL check error:", error);
      toast.error(error.message || pageCopy.toasts.sslCheckError);
    } finally {
      setTimeout(() => {
        setCheckingSsl(false);
        setSyncProgress(0);
        setSyncStatus("");
      }, 1500);
    }
  };
  const microsoftStats = useMemo(() => buildMicrosoftTenantFleetStats(microsoftData), [microsoftData]);
  const domainStats = useMemo(() => buildDomainFleetStats(buildDomainFleetFromList(allDomains)), [allDomains]);
  const sslStats = useMemo(() => buildSslFleetStats(buildSslFleetFromList(allSslCerts)), [allSslCerts]);
  const handleOpenServiceClient = (clientId, clientName) => {
    if (!onNavigate || !clientId) return;
    onNavigate("ContratDetail", {
      clientId,
      name: clientName
    });
  };
  const handleOpenTenant = (item, options) => {
    if (!onNavigate) return;
    onNavigate("TenantDetail", {
      ...item,
      clientId: item.clientId,
      clientName: item.clientName
    }, options);
  };
  const selectTab = tabKey => {
    if (!MODULE_TABS.includes(tabKey)) return;
    setActiveTab(tabKey);
  };
  const syncingAny = syncing || syncingDomains || checkingSsl;
  const handleHeaderSync = () => {
    if (activeTab === "microsoft") handleSyncMicrosoft();
    else if (activeTab === "domain") handleSyncDomains();
    else if (activeTab === "ssl") handleCheckAllSsl();
  };
  const syncTooltip = syncingAny && syncStatus ? syncStatus : activeTab === "domain" ? pageCopy.domain.syncDomains : activeTab === "ssl" ? pageCopy.ssl.checkAll : pageCopy.microsoft.syncTenants;
  const heroSubtitle = syncingAny && syncStatus ? syncStatus : activeTab === "microsoft" ? pageCopy.microsoft.formatHeroDesc(microsoftStats.issues) : activeTab === "domain" ? pageCopy.domain.formatHeroDesc(domainStats.issues) : activeTab === "ssl" ? pageCopy.ssl.formatHeroDesc(sslStats.issues) : pageCopy.subtitle;
  const moduleTabs = (pageCopy.tabs || []).filter(tab => MODULE_TABS.includes(tab.key));
  return <div className={`${cyberStyles.mspPage} ${cyberStyles.mspPageOrbital}`}>
      <SupportOrbitalBackground variant="page" />
      <div className={cyberStyles.mspLayout}>
      <div className={cyberStyles.mspMain}>
        <MspPageHero eyebrow={pageCopy.eyebrow} title={pageCopy.pageTitle} subtitle={heroSubtitle} icon="mdi:cloud-outline" actions={<>
              <nav className={cyberStyles.mspTabBar} role="tablist" aria-label={pageCopy.tabSectionsAria}>
                {moduleTabs.map(tab => <button key={tab.key} type="button" role="tab" aria-selected={activeTab === tab.key} className={`${cyberStyles.mspTab} ${activeTab === tab.key ? cyberStyles.mspTabActive : ""}`} onClick={() => selectTab(tab.key)} title={tab.label}>
                    <Icon icon={tab.icon} className={cyberStyles.mspTabIcon} aria-hidden />
                    <span className={cyberStyles.mspTabLabelRow}>
                      <span>{tab.label}</span>
                    </span>
                  </button>)}
              </nav>
              <SmartTooltip content={syncTooltip}>
                <button type="button" className={layout.iconBtn} onClick={handleHeaderSync} disabled={syncingAny} aria-label={syncTooltip}>
                  <Icon icon="mdi:cloud-sync-outline" className={syncingAny ? cyberStyles.spinning : undefined} aria-hidden />
                </button>
              </SmartTooltip>
            </>} />

        <main className={cyberStyles.mspContent}>
          <div className={`${layout.shell} ${layout.shellWide} ${layout.shellFull}`}>
          <div className={cyberStyles.tabContent}>
          {activeTab === "microsoft" && <MicrosoftTenantMspDashboard tenants={microsoftData} loading={loading} copy={pageCopy.microsoft} onOpenTenant={handleOpenTenant} />}

          {activeTab === "domain" && <DomainMspDashboard domains={allDomains} loading={loadingDomains} copy={pageCopy.domain} />}

          {activeTab === "ssl" && <SslMspDashboard certificates={allSslCerts} loading={loadingSsl} copy={pageCopy.ssl} onOpenClient={row => {
                const clientId = row.clientId || clients.find(client => client.name === row.clientName)?.id;
                if (clientId) handleOpenServiceClient(clientId, row.clientName);
              }} />}

          </div>
          </div>
        </main>
      </div>
      </div>
    </div>;
}
