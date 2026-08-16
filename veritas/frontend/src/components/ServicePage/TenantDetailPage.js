import React, { useState, useEffect, useMemo, useRef } from "react";
import { Icon } from "@iconify/react";
import { FaSync } from "react-icons/fa";
import { toast } from "react-toastify";
import API_BASE_URL from "../../config";
import styles from "./TenantDetailPage.module.css";
import enterpriseDetailStyles from "../EnterprisesPage/EnterpriseDetailPage.module.css";
import SmartTooltip from "../SmartTooltip";
import TenantReportOverview from "./TenantReportOverview";
import LicensesTab from "./TenantDetailTabs/LicencesTab";
import UsersTab from "./TenantDetailTabs/UtilisateursTab";
import ExchangeTab from "./TenantDetailTabs/ExchangeTab";
import TeamsTab from "./TenantDetailTabs/TeamsTab";
import OneDriveTab from "./TenantDetailTabs/OneDriveTab";
import SharePointTab from "./TenantDetailTabs/SharePointTab";
import SecuriteTab from "./TenantDetailTabs/SecuriteTab";
import { getClientMfaDetails, deleteClientOffice365Credentials } from "../../api/clientOffice365";
import { fetchClientModules, updateClient } from "../../api/clients";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { getEnterpriseConfigModalsCopy } from "../EnterprisesPage/enterpriseConfigModalsI18n";
import { interpolate } from "../../i18n/translate";
import { getLicenseDisplayName } from "./TenantDetailTabs/utils";
import { getTenantDetailCopy } from "./tenantDetailPageI18n";
import { buildTenantReport, getConnectionOrganization, isConnectionOk } from "./tenantReportUtils";

const TABS = [
  { key: "rapport", icon: "mdi:clipboard-text-outline" },
  { key: "utilisateurs", icon: "mdi:account-multiple" },
  { key: "licences", icon: "mdi:license" },
  { key: "exchange", icon: "simple-icons:microsoftexchange" },
  { key: "sharepoint", icon: "mdi:microsoft-sharepoint" },
  { key: "onedrive", icon: "entypo-social:onedrive" },
  { key: "teams", icon: "simple-icons:microsoftteams" },
  { key: "securite", icon: "mdi:shield-check" }
];

export default function TenantDetailPage({
  onNavigate,
  tenantData
}) {
  const locale = useAppLocale();
  const copy = useMemo(() => getTenantDetailCopy(locale), [locale]);
  const configCopy = useMemo(() => getEnterpriseConfigModalsCopy(locale), [locale]);
  const [detailData, setDetailData] = useState(() => tenantData ? { ...tenantData } : null);
  const [loading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const [syncStatus, setSyncStatus] = useState("");
  const [statistics, setStatistics] = useState(null);
  const [lastSync, setLastSync] = useState(null);
  const [viewMode, setViewMode] = useState("rapport");
  const [exchangeData, setExchangeData] = useState(null);
  const [teamsData, setTeamsData] = useState(null);
  const [onedriveData, setOnedriveData] = useState(null);
  const [sharepointData, setSharepointData] = useState(null);
  const [securityData, setSecurityData] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState(null);
  const [mfaDetails, setMfaDetails] = useState([]);
  const [selectedPeriod] = useState("D30");
  const [deletingTenant, setDeletingTenant] = useState(false);
  const [heroMenuOpen, setHeroMenuOpen] = useState(false);
  const currentClientIdRef = useRef(null);
  const abortControllerRef = useRef(null);
  const heroActionsMenuRef = useRef(null);

  useEffect(() => {
    if (tenantData?.clientId !== detailData?.clientId) {
      const newDetailData = tenantData ? { ...tenantData } : null;
      setDetailData(newDetailData);
      setStatistics(null);
      setExchangeData(null);
      setTeamsData(null);
      setOnedriveData(null);
      setSharepointData(null);
      setSecurityData(null);
      setConnectionStatus(null);
      setMfaDetails([]);
      setLastSync(null);
      setViewMode("rapport");
      currentClientIdRef.current = newDetailData?.clientId || null;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();
    }
  }, [tenantData?.clientId, detailData?.clientId]);

  useEffect(() => {
    currentClientIdRef.current = detailData?.clientId || null;
  }, [detailData?.clientId]);

  useEffect(() => {
    const targetClientId = detailData?.clientId;
    if (targetClientId && targetClientId === tenantData?.clientId) {
      if (currentClientIdRef.current === targetClientId || currentClientIdRef.current === null) {
        loadStoredTenantData();
      }
    }
  }, [detailData?.clientId, tenantData?.clientId]);

  useEffect(() => {
    if (window.updateTabTitle && detailData?.clientName) {
      window.updateTabTitle("TenantDetail", {
        clientId: detailData.clientId,
        tenantId: detailData.tenantId
      }, interpolate(copy.tabTitle, { client: detailData.clientName }));
    }
  }, [detailData, copy.tabTitle]);

  useEffect(() => {
    if (!detailData?.clientId) return undefined;
    let cancelled = false;
    getClientMfaDetails(detailData.clientId).then((result) => {
      if (!cancelled && result?.userMfaDetails) {
        setMfaDetails(result.userMfaDetails);
      }
    }).catch(() => {
      if (!cancelled) setMfaDetails([]);
    });
    return () => {
      cancelled = true;
    };
  }, [detailData?.clientId]);

  useEffect(() => {
    if (!heroMenuOpen) return undefined;
    const onPointerDown = (event) => {
      if (heroActionsMenuRef.current && !heroActionsMenuRef.current.contains(event.target)) {
        setHeroMenuOpen(false);
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [heroMenuOpen]);

  const loadStoredTenantData = async () => {
    if (!detailData?.clientId) return;
    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    const targetClientId = detailData.clientId;
    try {
      const response = await fetch(`${API_BASE_URL}/clients/${targetClientId}/o365`, {
        credentials: "include",
        signal: abortController.signal
      });
      if (response.ok) {
        const result = await response.json();
        if (currentClientIdRef.current !== targetClientId) {
          return;
        }
        if (result.success && result.data?.length > 0) {
          let targetTenantId = detailData.tenantId;
          if (!targetTenantId) {
            try {
              const credResponse = await fetch(`${API_BASE_URL}/client-office365/${targetClientId}`, {
                credentials: "include",
                signal: abortController.signal
              });
              if (currentClientIdRef.current !== targetClientId) {
                return;
              }
              if (credResponse.ok) {
                const credResult = await credResponse.json();
                targetTenantId = credResult?.credentials?.tenantId || null;
                if (targetTenantId && currentClientIdRef.current === targetClientId) {
                  setDetailData((prev) => {
                    if (prev?.clientId !== targetClientId) {
                      return prev;
                    }
                    return {
                      ...(prev || {}),
                      tenantId: targetTenantId
                    };
                  });
                }
              }
            } catch (credErr) {
              if (credErr.name === "AbortError") {
                return;
              }
            }
          }
          let tenantRecord = null;
          if (targetTenantId) {
            tenantRecord = result.data.find((item) => item.data?.tenantId === targetTenantId || item.item_key === targetTenantId);
          }
          if (!tenantRecord && result.data.length > 0) {
            tenantRecord = result.data[0];
          }
          if (tenantRecord) {
            if (currentClientIdRef.current !== targetClientId) {
              return;
            }
            if (targetTenantId && tenantRecord.data?.tenantId && tenantRecord.data.tenantId !== targetTenantId) {
              return;
            }
            const snapshotLastUpdate = tenantRecord.data?.lastUpdate || null;
            if (currentClientIdRef.current !== targetClientId) {
              return;
            }
            setLastSync(snapshotLastUpdate || tenantRecord.updated_at);
            if (tenantRecord.data) {
              const snapshotData = tenantRecord.data;
              if (snapshotData.exchangeData !== null && snapshotData.exchangeData !== undefined) {
                setExchangeData(snapshotData.exchangeData);
              } else if (snapshotData.exchange) {
                setExchangeData(snapshotData.exchange);
              } else {
                setExchangeData(null);
              }
              if (snapshotData.teamsData !== null && snapshotData.teamsData !== undefined) {
                setTeamsData(snapshotData.teamsData);
              } else if (snapshotData.teams) {
                setTeamsData(snapshotData.teams);
              } else {
                setTeamsData(null);
              }
              if (snapshotData.onedriveData !== null && snapshotData.onedriveData !== undefined) {
                setOnedriveData(snapshotData.onedriveData);
              } else if (snapshotData.onedrive) {
                setOnedriveData(snapshotData.onedrive);
              } else {
                setOnedriveData(null);
              }
              if (snapshotData.sharepointData !== null && snapshotData.sharepointData !== undefined) {
                setSharepointData(snapshotData.sharepointData);
              } else if (snapshotData.sharepoint) {
                setSharepointData(snapshotData.sharepoint);
              } else {
                setSharepointData(null);
              }
              if (snapshotData.securityData !== null && snapshotData.securityData !== undefined) {
                setSecurityData(snapshotData.securityData);
              } else if (snapshotData.security) {
                setSecurityData(snapshotData.security);
              } else {
                setSecurityData(null);
              }
              setConnectionStatus(tenantRecord.data.connectionStatus || null);
              if (!detailData.tenantId && tenantRecord.data.tenantId && currentClientIdRef.current === targetClientId) {
                setDetailData((prev) => {
                  if (prev?.clientId !== targetClientId) {
                    return prev;
                  }
                  return {
                    ...(prev || {}),
                    tenantId: tenantRecord.data.tenantId
                  };
                });
              }
              setStatistics(tenantRecord.data);
            }
          }
        }
      }
    } catch (error) {
      if (error.name === "AbortError") {
        return;
      }
    } finally {
      if (abortControllerRef.current === abortController) {
        abortControllerRef.current = null;
      }
    }
  };

  const licences = statistics?.licences || statistics?.licenses || [];
  const users = statistics?.users || [];
  const adoptionScore = statistics?.adoptionScore || null;

  const dashboardMetrics = useMemo(() => {
    if (!users || users.length === 0) return null;
    const now = new Date();
    const period30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const period90Days = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    const activeUsers30 = users.filter((user) => {
      const lastLogin = user.lastLoginDate ? new Date(user.lastLoginDate) : null;
      return lastLogin && lastLogin >= period30Days;
    }).length;
    const activeUsers90 = users.filter((user) => {
      const lastLogin = user.lastLoginDate ? new Date(user.lastLoginDate) : null;
      return lastLogin && lastLogin >= period90Days;
    }).length;
    const adoptionRate = users.length > 0 ? Math.round(activeUsers30 / users.length * 100) : 0;
    const validLicenses = licences.filter((lic) => {
      const total = lic.total || 0;
      return total < 10000 && total > 0;
    });
    const totalLicenses = validLicenses.reduce((sum, lic) => sum + (lic.total || 0), 0);
    const usedLicenses = validLicenses.reduce((sum, lic) => sum + (lic.utilisees || 0), 0);
    return {
      totalUsers: users.length,
      activeUsers30,
      activeUsers90,
      adoptionRate,
      totalLicenses,
      usedLicenses
    };
  }, [users, licences]);

  const report = useMemo(() => buildTenantReport({
    users,
    licences,
    securityData,
    mfaDetails,
    exchangeData,
    sharepointData,
    onedriveData,
    teamsData,
    adoptionScore
  }), [users, licences, securityData, mfaDetails, exchangeData, sharepointData, onedriveData, teamsData, adoptionScore]);

  const handleSync = async () => {
    if (!detailData?.clientId) {
      toast.error(copy.sync.noClient);
      return;
    }
    const targetClientId = detailData.clientId;
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    setSyncing(true);
    setSyncProgress(0);
    setSyncStatus(copy.sync.preparing);
    const progressInterval = setInterval(() => {
      setSyncProgress((prev) => {
        if (prev >= 90) return prev;
        return prev + 10;
      });
    }, 500);
    try {
      if (currentClientIdRef.current !== targetClientId) {
        throw new Error(copy.sync.error);
      }
      if (typeof window !== "undefined" && typeof window.__office365SyncTrigger === "function") {
        try {
          window.__office365SyncTrigger();
        } catch (error) {
          console.error("Error syncing via the O365 module:", error);
        }
      }
      setSyncStatus(copy.sync.running);
      setSyncProgress(50);
      const headers = {
        "Content-Type": "application/json"
      };
      const endDate = new Date();
      let startDate = new Date();
      switch (selectedPeriod) {
        case "D7":
          startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case "D90":
          startDate = new Date(endDate.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
        case "D30":
        default:
          startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
      }
      const syncResponse = await fetch(`${API_BASE_URL}/office365/sync-all?clientId=${targetClientId}&period=${selectedPeriod}&startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`, {
        method: "GET",
        headers,
        credentials: "include",
        signal: abortController.signal
      });
      if (currentClientIdRef.current !== targetClientId) {
        throw new Error(copy.sync.error);
      }
      const syncResult = await syncResponse.json().catch(() => ({}));
      if (!syncResponse.ok || !syncResult.success) {
        throw new Error(syncResult.error || `HTTP error ${syncResponse.status}`);
      }
      if (currentClientIdRef.current !== targetClientId) {
        return;
      }
      let expectedTenantId = null;
      try {
        const credResponse = await fetch(`${API_BASE_URL}/client-office365/${targetClientId}`, {
          headers,
          credentials: "include",
          signal: abortController.signal
        });
        if (currentClientIdRef.current !== targetClientId) {
          throw new Error(copy.sync.error);
        }
        if (credResponse.ok) {
          const credResult = await credResponse.json();
          expectedTenantId = credResult?.credentials?.tenantId || null;
        }
      } catch (credErr) {
        if (credErr.name === "AbortError") {
          return;
        }
      }
      if (expectedTenantId && syncResult.data?.tenantId && syncResult.data.tenantId !== expectedTenantId) {
        throw new Error(`Synced data does not match client ${targetClientId}. Expected TenantId: ${expectedTenantId}, received: ${syncResult.data.tenantId}`);
      }
      setSyncStatus(copy.sync.done);
      setSyncProgress(100);
      if (syncResult.lastUpdate && currentClientIdRef.current === targetClientId) {
        setLastSync(syncResult.lastUpdate);
      }
      await loadStoredTenantData();
      if (currentClientIdRef.current === targetClientId) {
        toast.success(copy.sync.success);
      }
    } catch (error) {
      if (error.name === "AbortError") {
        return;
      }
      console.error("Error during sync:", error);
      if (currentClientIdRef.current === targetClientId) {
        toast.error(error.message || copy.sync.error);
      }
    } finally {
      clearInterval(progressInterval);
      if (abortControllerRef.current === abortController) {
        setTimeout(() => {
          setSyncProgress(0);
          setSyncStatus("");
        }, 800);
        abortControllerRef.current = null;
      }
      if (currentClientIdRef.current === targetClientId) {
        setSyncing(false);
      }
    }
  };

  const handleDeleteTenant = async () => {
    if (!detailData?.clientId || !onNavigate) return;
    const clientName = detailData.clientName || detailData.name || configCopy.confirm.deleteMicrosoftTenantFromList.fallbackClient;
    const confirmMessage = interpolate(configCopy.confirm.deleteMicrosoftTenantFromList.message, {
      client: clientName
    });
    if (!window.confirm(confirmMessage)) {
      return;
    }
    setHeroMenuOpen(false);
    setDeletingTenant(true);
    try {
      await deleteClientOffice365Credentials(detailData.clientId);
      const { modules_monitoring } = await fetchClientModules(detailData.clientId);
      await updateClient(detailData.clientId, {
        modules_monitoring: {
          ...modules_monitoring,
          Office365: false
        },
        office365_data: null
      });
      toast.success(copy.delete.success);
      onNavigate("Service", {
        activeTab: "microsoft",
        refresh: Date.now()
      }, {
        closeCurrent: true
      });
    } catch (error) {
      console.error("Error deleting tenant:", error);
      toast.error(error.message || copy.delete.error);
    } finally {
      setDeletingTenant(false);
    }
  };

  const openEnterprise = () => {
    const clientId = detailData?.clientId || tenantData?.clientId;
    if (!clientId || !onNavigate) return;
    onNavigate("ContratDetail", {
      clientId,
      name: detailData?.clientName || tenantData?.clientName
    });
  };

  const dateLocale = locale === "en" ? "en-GB" : "fr-FR";
  const tenantId = detailData?.tenantId || statistics?.tenantId;
  const lastSyncLabel = lastSync
    ? `${new Date(lastSync).toLocaleDateString(dateLocale)} ${new Date(lastSync).toLocaleTimeString(dateLocale, { hour: "2-digit", minute: "2-digit" })}`
    : copy.hero.neverSynced;
  const connectionOk = isConnectionOk(connectionStatus);
  const organizationName = getConnectionOrganization(connectionStatus);
  const connectionLabel = connectionOk == null
    ? copy.hero.connectionUnknown
    : connectionOk
      ? (organizationName || copy.hero.connectionOk)
      : copy.hero.connectionError;

  if (!detailData) {
    return <div className={`${enterpriseDetailStyles.contratDetailPage} ${enterpriseDetailStyles.enterpriseDetailPage} ${styles.detailPage}`}>
        <div className={styles.emptyState}>
          <Icon icon="mdi:alert-circle" className={styles.emptyIcon} />
          <h2>{copy.empty.title}</h2>
          <p>{copy.empty.text}</p>
          <button type="button" className={enterpriseDetailStyles.backBtn} onClick={() => onNavigate("Service", { activeTab: "microsoft" })}>
            <Icon icon="mdi:arrow-left" />
            {copy.empty.back}
          </button>
        </div>
      </div>;
  }

  return <div className={`${enterpriseDetailStyles.contratDetailPage} ${enterpriseDetailStyles.enterpriseDetailPage} ${styles.detailPage}`}>
      <header className={enterpriseDetailStyles.pageHero}>
        <div className={`${enterpriseDetailStyles.heroRow} ${styles.heroRow}`}>
          <button type="button" className={enterpriseDetailStyles.backBtn} onClick={openEnterprise}>
            <Icon icon="mdi:arrow-left" />
            {copy.hero.backEnterprise}
          </button>
          <div className={enterpriseDetailStyles.heroMain}>
            <div className={`${enterpriseDetailStyles.heroAvatar} ${styles.heroMsAvatar}`} aria-hidden>
              <Icon icon="mdi:microsoft" />
            </div>
            <div className={enterpriseDetailStyles.heroText}>
              <p className={enterpriseDetailStyles.heroEyebrow}>{copy.hero.eyebrow}</p>
              <h1 className={enterpriseDetailStyles.heroTitle}>
                {detailData.clientName || detailData.nom || detailData.name || copy.hero.eyebrow}
              </h1>
              <div className={enterpriseDetailStyles.heroMeta} aria-label={copy.hero.metaAria}>
                {tenantId ? <span className={`${enterpriseDetailStyles.heroMetaItem} ${styles.heroTenantId}`} title={tenantId}>
                    {copy.hero.tenantId}: {tenantId}
                  </span> : null}
                <span className={enterpriseDetailStyles.heroMetaItem}>
                  {copy.hero.lastSync}: {lastSyncLabel}
                </span>
                <span className={`${enterpriseDetailStyles.heroMetaItem} ${connectionOk === false ? styles.heroStatusError : connectionOk ? styles.heroStatusOk : ""}`}>
                  {connectionLabel}
                </span>
              </div>
            </div>
          </div>
          <div className={enterpriseDetailStyles.heroActions} ref={heroActionsMenuRef}>
            {syncing ? <div className={styles.syncProgress}>
                <div className={styles.syncProgressBar}>
                  <div className={styles.syncProgressFill} style={{ width: `${syncProgress}%` }} />
                </div>
                <span className={styles.syncProgressText}>{syncStatus}</span>
              </div> : null}
            <SmartTooltip content={syncing ? copy.hero.syncing : copy.hero.sync}>
              <button type="button" className={enterpriseDetailStyles.heroMenuBtn} onClick={handleSync} disabled={syncing || loading} aria-label={copy.hero.sync}>
                <FaSync className={syncing ? styles.spinning : ""} />
              </button>
            </SmartTooltip>
            <SmartTooltip content={copy.hero.actions}>
              <button type="button" className={enterpriseDetailStyles.heroMenuBtn} onClick={() => setHeroMenuOpen((open) => !open)} aria-expanded={heroMenuOpen} aria-haspopup="menu" aria-label={copy.hero.actions}>
                <Icon icon="mdi:dots-horizontal" />
              </button>
            </SmartTooltip>
            {heroMenuOpen ? <div className={enterpriseDetailStyles.heroClientMenu} role="menu">
                <button type="button" className={`${enterpriseDetailStyles.heroMenuItem} ${enterpriseDetailStyles.heroMenuItemDanger}`} role="menuitem" onClick={handleDeleteTenant} disabled={deletingTenant || loading}>
                  <Icon icon={deletingTenant ? "mdi:loading" : "mdi:delete-outline"} className={deletingTenant ? styles.spinning : undefined} />
                  <span>{copy.hero.delete}</span>
                </button>
              </div> : null}
          </div>
        </div>
      </header>

      <div className={styles.shell}>
        <nav className={styles.tabBar} aria-label={copy.tabs.aria}>
          {TABS.map((tab) => <button key={tab.key} type="button" className={`${styles.tabBtn} ${viewMode === tab.key ? styles.tabBtnActive : ""}`} onClick={() => setViewMode(tab.key)}>
              <Icon icon={tab.icon} />
              {copy.tabs[tab.key]}
            </button>)}
        </nav>

        <div className={styles.mainContent} key={viewMode}>
          {syncing ? <div className={styles.syncSkeleton}>
              <div className={styles.skeletonStatsCards}>
                {[1, 2, 3].map((item) => <div key={item} className={styles.skeletonStatCard}>
                    <div className={`${styles.skeletonShimmer} ${styles.skeletonStatCardIcon}`} />
                    <div className={styles.skeletonStatCardContent}>
                      <div className={`${styles.skeletonShimmer} ${styles.skeletonStatCardValue}`} />
                      <div className={`${styles.skeletonShimmer} ${styles.skeletonStatCardLabel}`} />
                    </div>
                  </div>)}
              </div>
              <div className={`${styles.skeletonShimmer} ${styles.skeletonTableTitle}`} />
              <div className={styles.skeletonTable}>
                <div className={styles.skeletonTableHeader}>
                  {[1, 2, 3, 4, 5].map((item) => <div key={item} className={`${styles.skeletonShimmer} ${styles.skeletonTableHeaderCell}`} />)}
                </div>
                {[1, 2, 3, 4, 5, 6, 7, 8].map((row) => <div key={row} className={styles.skeletonTableRow}>
                    {[1, 2, 3, 4, 5].map((item) => <div key={item} className={`${styles.skeletonShimmer} ${styles.skeletonTableCell}`} />)}
                  </div>)}
              </div>
            </div> : null}

          {loading && !syncing ? <div className={styles.loadingState}>
              <Icon icon="mdi:loading" className={styles.loadingSpinner} />
              <p>{copy.loading}</p>
            </div> : null}

          {!syncing && !loading && viewMode === "rapport" ? <TenantReportOverview report={report} copy={copy} onOpenTab={setViewMode} /> : null}
          {!syncing && !loading && viewMode === "licences" ? <LicensesTab licences={licences} dashboardMetrics={dashboardMetrics} theme="light" getLicenseDisplayName={getLicenseDisplayName} /> : null}
          {!syncing && !loading && viewMode === "utilisateurs" ? <UsersTab users={users} dashboardMetrics={dashboardMetrics} detailData={detailData} mfaDetails={mfaDetails} theme="light" /> : null}
          {!syncing && !loading && viewMode === "exchange" ? <ExchangeTab exchangeData={exchangeData} theme="light" /> : null}
          {!syncing && !loading && viewMode === "teams" ? <TeamsTab teamsData={teamsData} theme="light" /> : null}
          {!syncing && !loading && viewMode === "onedrive" ? <OneDriveTab onedriveData={onedriveData} theme="light" /> : null}
          {!syncing && !loading && viewMode === "sharepoint" ? <SharePointTab sharepointData={sharepointData} theme="light" /> : null}
          {!syncing && !loading && viewMode === "securite" ? <SecuriteTab securityData={securityData} users={users} mfaDetails={mfaDetails} clientId={detailData?.clientId} theme="light" /> : null}
        </div>
      </div>
    </div>;
}
