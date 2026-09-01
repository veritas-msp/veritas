import React, { useState, useEffect, useMemo, useRef } from "react";
import { Icon } from "@iconify/react";
import { toast } from "react-toastify";
import API_BASE_URL from "../../config";
import styles from "./TenantDetailPage.module.css";
import enterpriseDetailStyles from "../EnterprisesPage/EnterpriseDetailPage.module.css";
import pageLayout from "../EnterprisesPage/EnterprisesPage.module.css";
import SolutionDetailPageLayout from "../EnterprisesPage/SolutionDetailPageLayout";
import SmartTooltip from "../SmartTooltip";
import LicensesTab from "./TenantDetailTabs/LicencesTab";
import UsersTab from "./TenantDetailTabs/UtilisateursTab";
import ExchangeTab from "./TenantDetailTabs/ExchangeTab";
import TeamsTab from "./TenantDetailTabs/TeamsTab";
import OneDriveTab from "./TenantDetailTabs/OneDriveTab";
import SharePointTab from "./TenantDetailTabs/SharePointTab";
import SecuriteTab from "./TenantDetailTabs/SecuriteTab";
import { getClientMfaDetails, deleteClientOffice365Credentials, listClientOffice365Credentials, unwrapOffice365CredentialsList } from "../../api/clientOffice365";
import { fetchClientModules, updateClient } from "../../api/clients";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { getEnterpriseConfigModalsCopy } from "../EnterprisesPage/enterpriseConfigModalsI18n";
import { interpolate } from "../../i18n/translate";
import { getLicenseDisplayName } from "./TenantDetailTabs/utils";
import { getTenantDetailCopy } from "./tenantDetailPageI18n";
import { getConnectionOrganization, isConnectionOk } from "./tenantReportUtils";
import { createTrackedAbortController } from "../../utils/pageLoadAbort";
import { normalizeMfaList, pickMfaDetailsFromSnapshot } from "./mfaDetailsUtils";
import { filterExchangeDataByPeriod, filterTeamsDataByPeriod } from "./TenantDetailTabs/office365Period";

const TENANT_GROUPS = [
  { id: "identity" },
  { id: "workloads" }
];

const TENANT_SECTIONS = [
  { id: "licences", group: "identity", icon: "mdi:license" },
  { id: "utilisateurs", group: "identity", icon: "mdi:account-multiple" },
  { id: "securite", group: "identity", icon: "mdi:shield-check" },
  { id: "exchange", group: "workloads", icon: "simple-icons:microsoftexchange" },
  { id: "sharepoint", group: "workloads", icon: "mdi:microsoft-sharepoint" },
  { id: "onedrive", group: "workloads", icon: "entypo-social:onedrive" },
  { id: "teams", group: "workloads", icon: "simple-icons:microsoftteams" }
];

function resolveTenantSection(_embedded, section) {
  if (!section || section === "rapport") return "licences";
  return section;
}

function tenantTargetKey(data) {
  if (!data?.clientId) return null;
  return `${data.clientId}:${data.azureCredentialId || data.tenantId || ""}`;
}

function pickCredentialFromList(list, detailData) {
  if (!Array.isArray(list) || list.length === 0) return null;
  if (detailData?.azureCredentialId) {
    const byId = list.find(item => String(item.id) === String(detailData.azureCredentialId));
    if (byId) return byId;
  }
  if (detailData?.tenantId) {
    const byTenant = list.find(item => item.tenantId === detailData.tenantId);
    if (byTenant) return byTenant;
  }
  return list[0] || null;
}

export default function TenantDetailPage({
  onNavigate,
  tenantData,
  embedded = false,
  reportPeriod = null,
  initialSection = null
}) {
  const locale = useAppLocale();
  const copy = useMemo(() => getTenantDetailCopy(locale), [locale]);
  const configCopy = useMemo(() => getEnterpriseConfigModalsCopy(locale), [locale]);
  const [detailData, setDetailData] = useState(() => tenantData ? { ...tenantData } : null);
  const [loading, setLoading] = useState(() => Boolean(tenantData?.clientId));
  const [syncing, setSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const [syncStatus, setSyncStatus] = useState("");
  const [statistics, setStatistics] = useState(null);
  const [lastSync, setLastSync] = useState(null);
  const [viewMode, setViewMode] = useState(() => resolveTenantSection(embedded, initialSection));
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
  const currentTenantKeyRef = useRef(tenantTargetKey(tenantData));
  const abortControllerRef = useRef(null);
  const heroActionsMenuRef = useRef(null);

  useEffect(() => {
    const incomingKey = tenantTargetKey(tenantData);
    if (incomingKey === currentTenantKeyRef.current) return;
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
    setViewMode(resolveTenantSection(embedded, initialSection));
    setLoading(Boolean(newDetailData?.clientId));
    currentTenantKeyRef.current = incomingKey;
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = createTrackedAbortController();
  }, [tenantData?.clientId, tenantData?.azureCredentialId, tenantData?.tenantId]);

  useEffect(() => {
    if (initialSection) setViewMode(resolveTenantSection(embedded, initialSection));
  }, [embedded, initialSection]);
  useEffect(() => {
    if (viewMode === "rapport") setViewMode("licences");
  }, [viewMode]);

  useEffect(() => {
    const targetKey = tenantTargetKey(detailData);
    if (targetKey && targetKey === tenantTargetKey(tenantData)) {
      loadStoredTenantData();
    }
  }, [detailData?.clientId, detailData?.azureCredentialId, detailData?.tenantId, tenantData?.clientId, tenantData?.azureCredentialId, tenantData?.tenantId]);

  useEffect(() => {
    if (embedded || !window.updateTabTitle || !detailData?.clientName) return;
    window.updateTabTitle("TenantDetail", {
      clientId: detailData.clientId,
      azureCredentialId: detailData.azureCredentialId,
      tenantId: detailData.tenantId
    }, interpolate(copy.tabTitle, { client: detailData.clientName }));
  }, [detailData, copy.tabTitle, embedded]);

  const loadMfaDetails = async (clientId, refresh = false) => {
    if (!clientId) {
      setMfaDetails([]);
      return;
    }
    try {
      const result = await getClientMfaDetails(clientId, {
        refresh,
        azureCredentialId: detailData?.azureCredentialId || null,
        tenantId: detailData?.tenantId || null
      });
      setMfaDetails(normalizeMfaList(result?.userMfaDetails));
    } catch {
      setMfaDetails([]);
    }
  };

  useEffect(() => {
    if (!detailData?.clientId) return undefined;
    let cancelled = false;
    getClientMfaDetails(detailData.clientId, {
      azureCredentialId: detailData.azureCredentialId || null,
      tenantId: detailData.tenantId || null
    }).then((result) => {
      if (cancelled) return;
      setMfaDetails(normalizeMfaList(result?.userMfaDetails));
    }).catch(() => {
      if (!cancelled) setMfaDetails([]);
    });
    return () => {
      cancelled = true;
    };
  }, [detailData?.clientId, detailData?.azureCredentialId, detailData?.tenantId]);

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

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
    if (!detailData?.clientId) {
      setLoading(false);
      return;
    }
    const abortController = createTrackedAbortController();
    abortControllerRef.current = abortController;
    const targetClientId = detailData.clientId;
    const requestKey = currentTenantKeyRef.current;
    try {
      const response = await fetch(`${API_BASE_URL}/clients/${targetClientId}/o365`, {
        credentials: "include",
        signal: abortController.signal
      });
      if (response.ok) {
        const result = await response.json();
        if (currentTenantKeyRef.current !== requestKey) {
          return;
        }
        if (result.success && result.data?.length > 0) {
          let targetTenantId = detailData.tenantId;
          try {
            const credResponse = await fetch(`${API_BASE_URL}/client-office365/${targetClientId}`, {
              credentials: "include",
              signal: abortController.signal
            });
            if (currentTenantKeyRef.current !== requestKey) {
              return;
            }
            if (credResponse.ok) {
              const credResult = await credResponse.json();
              const matched = pickCredentialFromList(unwrapOffice365CredentialsList(credResult), detailData);
              if (matched?.tenantId) {
                targetTenantId = matched.tenantId;
              }
              if (matched && currentTenantKeyRef.current === requestKey) {
                setDetailData((prev) => {
                  if (prev?.clientId !== targetClientId) {
                    return prev;
                  }
                  return {
                    ...(prev || {}),
                    azureCredentialId: matched.id || prev?.azureCredentialId || null,
                    tenantId: matched.tenantId || prev?.tenantId || null
                  };
                });
              }
            }
          } catch (credErr) {
            if (credErr.name === "AbortError") {
              return;
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
            if (currentTenantKeyRef.current !== requestKey) {
              return;
            }
            if (targetTenantId && tenantRecord.data?.tenantId && tenantRecord.data.tenantId !== targetTenantId) {
              return;
            }
            const snapshotLastUpdate = tenantRecord.data?.lastUpdate || null;
            if (currentTenantKeyRef.current !== requestKey) {
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
              if (!detailData.tenantId && tenantRecord.data.tenantId && currentTenantKeyRef.current === requestKey) {
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
              const snapshotMfa = pickMfaDetailsFromSnapshot(tenantRecord.data);
              if (snapshotMfa.length) {
                setMfaDetails(snapshotMfa);
              }
            }
          }
        }
      }
      if (currentTenantKeyRef.current === requestKey) {
        await loadMfaDetails(targetClientId);
      }
    } catch (error) {
      if (error.name === "AbortError") {
        return;
      }
    } finally {
      if (abortControllerRef.current === abortController) {
        abortControllerRef.current = null;
      }
      if (currentTenantKeyRef.current === requestKey) {
        setLoading(false);
      }
    }
  };

  const licences = statistics?.licences || statistics?.licenses || [];
  const users = statistics?.users || [];

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

  const periodExchangeData = useMemo(
    () => filterExchangeDataByPeriod(exchangeData, reportPeriod),
    [exchangeData, reportPeriod]
  );
  const periodTeamsData = useMemo(
    () => filterTeamsDataByPeriod(teamsData, reportPeriod),
    [teamsData, reportPeriod]
  );

  const navEntries = useMemo(() => {
    const entries = [];
    TENANT_GROUPS.forEach((group) => {
      const groupSections = TENANT_SECTIONS.filter((section) => section.group === group.id);
      if (groupSections.length === 0) return;
      entries.push({
        type: "group",
        key: `group-${group.id}`,
        label: copy.groups?.[group.id] || group.id
      });
      groupSections.forEach((section) => {
        entries.push({
          type: "section",
          key: section.id,
          section: {
            id: section.id,
            icon: section.icon,
            label: copy.tabs[section.id],
            description: copy.tabHints?.[section.id] || copy.tabs[section.id]
          }
        });
      });
    });
    return entries;
  }, [copy]);

  const handleSync = async () => {
    if (!detailData?.clientId) {
      toast.error(copy.sync.noClient);
      return;
    }
    const targetClientId = detailData.clientId;
    const requestKey = currentTenantKeyRef.current;
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const abortController = createTrackedAbortController();
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
    let aborted = false;
    try {
      if (currentTenantKeyRef.current !== requestKey) {
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
      const periodStart = reportPeriod?.start || reportPeriod?.startDate || null;
      const periodEnd = reportPeriod?.end || reportPeriod?.endDate || null;
      let startDate;
      let endDate;
      let periodKey = selectedPeriod;
      if (periodStart && periodEnd) {
        startDate = new Date(periodStart);
        endDate = new Date(periodEnd);
        if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
          throw new Error(copy.sync.error);
        }
        endDate.setHours(23, 59, 59, 999);
        const diffDays = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
        if (diffDays <= 10) periodKey = "D7";
        else if (diffDays <= 45) periodKey = "D30";
        else periodKey = "D90";
      } else {
        endDate = new Date();
        startDate = new Date();
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
      }
      const syncParams = new URLSearchParams({
        clientId: String(targetClientId),
        period: periodKey,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      });
      if (detailData.azureCredentialId) syncParams.set("azureCredentialId", String(detailData.azureCredentialId));
      if (detailData.tenantId) syncParams.set("tenantId", String(detailData.tenantId));
      const syncResponse = await fetch(`${API_BASE_URL}/office365/sync-all?${syncParams.toString()}`, {
        method: "GET",
        headers,
        credentials: "include",
        signal: abortController.signal
      });
      if (currentTenantKeyRef.current !== requestKey) {
        throw new Error(copy.sync.error);
      }
      const syncResult = await syncResponse.json().catch(() => ({}));
      if (!syncResponse.ok || !syncResult.success) {
        throw new Error(syncResult.error || `HTTP error ${syncResponse.status}`);
      }
      if (currentTenantKeyRef.current !== requestKey) {
        return;
      }
      let expectedTenantId = null;
      try {
        const credResponse = await fetch(`${API_BASE_URL}/client-office365/${targetClientId}`, {
          headers,
          credentials: "include",
          signal: abortController.signal
        });
        if (currentTenantKeyRef.current !== requestKey) {
          throw new Error(copy.sync.error);
        }
        if (credResponse.ok) {
          const credResult = await credResponse.json();
          const matched = pickCredentialFromList(unwrapOffice365CredentialsList(credResult), detailData);
          expectedTenantId = matched?.tenantId || detailData.tenantId || null;
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
      if (syncResult.lastUpdate && currentTenantKeyRef.current === requestKey) {
        setLastSync(syncResult.lastUpdate);
      }
      await loadStoredTenantData();
      await loadMfaDetails(targetClientId);
      if (currentTenantKeyRef.current === requestKey) {
        toast.success(copy.sync.success);
      }
    } catch (error) {
      if (error.name === "AbortError") {
        aborted = true;
        return;
      }
      console.error("Error during sync:", error);
      if (currentTenantKeyRef.current === requestKey) {
        toast.error(error.message || copy.sync.error);
      }
    } finally {
      clearInterval(progressInterval);
      if (abortControllerRef.current === abortController) {
        abortControllerRef.current = null;
      }
      if (!aborted && currentTenantKeyRef.current === requestKey) {
        setTimeout(() => {
          setSyncProgress(0);
          setSyncStatus("");
        }, 800);
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
      let credentialId = detailData.azureCredentialId || null;
      if (!credentialId) {
        const list = await listClientOffice365Credentials(detailData.clientId);
        credentialId = pickCredentialFromList(list, detailData)?.id || null;
      }
      await deleteClientOffice365Credentials(detailData.clientId, credentialId);
      const remaining = await listClientOffice365Credentials(detailData.clientId);
      if (!remaining.length) {
        const { modules_monitoring } = await fetchClientModules(detailData.clientId);
        await updateClient(detailData.clientId, {
          modules_monitoring: {
            ...modules_monitoring,
            Office365: false
          },
          office365_data: null
        });
      }
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
  const clientName = detailData?.clientName || detailData?.nom || detailData?.name || tenantData?.clientName || "";
  const pageTitle = organizationName
    ? interpolate(copy.hero.pageTitle, { name: organizationName })
    : copy.hero.pageTitleFallback;
  const footerHint = [
    connectionLabel,
    `${copy.hero.lastSync}: ${lastSyncLabel}`,
    tenantId ? `${copy.hero.tenantId}: ${tenantId}` : null
  ].filter(Boolean).join(" · ");
  const subtitle = clientName && detailData?.clientId
    ? <button type="button" className={styles.subtitleLink} onClick={openEnterprise}>{clientName}</button>
    : clientName || null;

  if (!detailData) {
    if (embedded) {
      return <div className={styles.emptyState}>
          <Icon icon="mdi:alert-circle" className={styles.emptyIcon} />
          <h2>{copy.empty.title}</h2>
          <p>{copy.empty.text}</p>
        </div>;
    }
    return <SolutionDetailPageLayout accent="microsoft" eyebrow={copy.hero.eyebrow} title={copy.empty.title} titleIcon="mdi:microsoft" subtitle={copy.empty.text} navEntries={[]} navAriaLabel={copy.tabs.aria}>
        <div className={styles.emptyState}>
          <Icon icon="mdi:alert-circle" className={styles.emptyIcon} />
          <h2>{copy.empty.title}</h2>
          <p>{copy.empty.text}</p>
          <button type="button" className={pageLayout.iconBtn} onClick={() => onNavigate("Service", { activeTab: "microsoft" })} aria-label={copy.empty.back} title={copy.empty.back}>
            <Icon icon="mdi:arrow-left" />
          </button>
        </div>
      </SolutionDetailPageLayout>;
  }

  const extraActions = embedded ? null : <div className={styles.headerMenuWrap} ref={heroActionsMenuRef}>
      <SmartTooltip content={copy.hero.actions}>
        <button type="button" className={pageLayout.iconBtn} onClick={() => setHeroMenuOpen((open) => !open)} aria-expanded={heroMenuOpen} aria-haspopup="menu" aria-label={copy.hero.actions}>
          <Icon icon="mdi:dots-horizontal" />
        </button>
      </SmartTooltip>
      {heroMenuOpen ? <div className={enterpriseDetailStyles.heroClientMenu} role="menu">
          <button type="button" className={`${enterpriseDetailStyles.heroMenuItem} ${enterpriseDetailStyles.heroMenuItemDanger}`} role="menuitem" onClick={handleDeleteTenant} disabled={deletingTenant || loading}>
            <Icon icon={deletingTenant ? "mdi:loading" : "mdi:delete-outline"} className={deletingTenant ? styles.spinning : undefined} />
            <span>{copy.hero.delete}</span>
          </button>
        </div> : null}
    </div>;

  return <SolutionDetailPageLayout embedded={embedded} accent="microsoft" eyebrow={copy.hero.eyebrow} title={pageTitle} titleIcon="mdi:microsoft" subtitle={embedded ? (clientName || null) : subtitle} loading={loading && !syncing} refreshing={syncing} loadingMessage={syncStatus || (syncing ? copy.hero.syncing : copy.loading)} onRefresh={embedded ? undefined : handleSync} refreshLabel={copy.hero.sync} extraActions={extraActions} footerHint={footerHint} navEntries={navEntries} activeSection={viewMode} onSectionChange={setViewMode} navAriaLabel={copy.tabs.aria}>
      <div className={`${styles.tenantVars} ${embedded ? styles.tenantVarsFill : ""}`} key={viewMode}>
        {viewMode === "licences" ? <LicensesTab licences={licences} dashboardMetrics={dashboardMetrics} theme="light" getLicenseDisplayName={getLicenseDisplayName} /> : null}
        {viewMode === "utilisateurs" ? <UsersTab users={users} dashboardMetrics={dashboardMetrics} detailData={detailData} mfaDetails={mfaDetails} theme="light" embedded={embedded} /> : null}
        {viewMode === "exchange" ? <ExchangeTab exchangeData={periodExchangeData} theme="light" /> : null}
        {viewMode === "teams" ? <TeamsTab teamsData={periodTeamsData} theme="light" embedded={embedded} /> : null}
        {viewMode === "onedrive" ? <OneDriveTab onedriveData={onedriveData} theme="light" embedded={embedded} /> : null}
        {viewMode === "sharepoint" ? <SharePointTab sharepointData={sharepointData} theme="light" embedded={embedded} /> : null}
        {viewMode === "securite" ? <SecuriteTab securityData={securityData} users={users} mfaDetails={mfaDetails} clientId={detailData?.clientId} theme="light" embedded={embedded} /> : null}
      </div>
    </SolutionDetailPageLayout>;
}
