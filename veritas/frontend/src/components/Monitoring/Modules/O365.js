import React, { useState, useEffect, useCallback, useRef } from "react";
import { FaSync, FaSort, FaSortUp, FaSortDown } from "react-icons/fa";
import { Icon as IconifyIcon } from "@iconify/react";
import { useTheme } from "../../../hooks/useTheme";
import styles from "./O365.module.css";
import commonStyles from "./ModuleCommon.module.css";
import { toast } from "react-toastify";
import API_BASE_URL from "../../../config";
import { scoreToLetter, scoreToLabel, letterToColor, letterToBackground } from "../../../utils/gradeUtils";
import { getIconPath } from "../../../utils/assetHelper";
import { getClientMfaDetails } from "../../../api/clientOffice365";
import DashboardTab from "./O365Tabs/DashboardTab";
import LicensesTab from "./O365Tabs/LicencesTab";
import UsersTab from "./O365Tabs/UtilisateursTab";
import ExchangeTab from "./O365Tabs/ExchangeTab";
import TeamsTab from "./O365Tabs/TeamsTab";
import OneDriveTab from "./O365Tabs/OneDriveTab";
import SharePointTab from "./O365Tabs/SharePointTab";
import SecuriteTab from "../../ServicePage/TenantDetailTabs/SecuriteTab";
import { getSortedUsers, getLicenseDisplayName } from "./O365Tabs/utils";
const toastOptions = {
  position: "bottom-right",
  autoClose: 3000
};
const DASHBOARD_METRIC_KEYS = ['totalUsers', 'activeUsers30', 'activeUsers90', 'adoptionRate', 'totalLicenses', 'usedLicenses'];
const easeOutCubic = t => 1 - Math.pow(1 - t, 3);
const O365 = ({
  config,
  data,
  setData
}) => {
  const {
    theme
  } = useTheme();
  const staticData = config?.client?.equipements?.Office365 || {};
  const o365 = data || {};
  const clientId = config?.client?.id;
  const isBrowser = typeof window !== 'undefined';
  useEffect(() => {
    return () => {};
  }, []);
  const [viewMode, setViewMode] = useState('dashboard');
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [apiData, setApiData] = useState(o365?.apiData ?? null);
  const [connectionStatus, setConnectionStatus] = useState(o365?.connectionStatus ?? null);
  const [usersPagination, setUsersPagination] = useState(1);
  const [sharepointPagination, setSharepointPagination] = useState(1);
  const [exchangeData, setExchangeData] = useState(o365?.exchangeData ?? null);
  const [teamsData, setTeamsData] = useState(o365?.teamsData ?? null);
  const [onedriveData, setOnedriveData] = useState(o365?.onedriveData ?? null);
  const [sharepointData, setSharepointData] = useState(o365?.sharepointData ?? null);
  const [securityData, setSecurityData] = useState(o365?.securityData ?? null);
  const [mfaDetails, setMfaDetails] = useState([]);
  const [manualSecurityScore, setManualSecurityScore] = useState(o365?.manualSecurityScore ?? null);
  const [hoveredSecurityTooltip, setHoveredSecurityTooltip] = useState(null);
  const [loadingTabs, setLoadingTabs] = useState({
    dashboard: false,
    licences: false,
    utilisateurs: false,
    exchange: false,
    teams: false,
    onedrive: false,
    sharepoint: false,
    securite: false
  });
  const [selectedPeriod, setSelectedPeriod] = useState('D30');
  const getReportPeriod = useCallback(() => {
    if (config?.client?.checkmkPeriod) {
      const startDate = new Date(config.client.checkmkPeriod.start_time);
      const endDate = new Date(config.client.checkmkPeriod.end_time);
      const diffTime = Math.abs(endDate - startDate);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays <= 7) return 'D7';
      if (diffDays <= 30) return 'D30';
      if (diffDays <= 90) return 'D90';
      return 'D90';
    }
    return 'D30';
  }, [config]);
  const [sortColumn, setSortColumn] = useState(null);
  const [sortDirection, setSortDirection] = useState('asc');
  const dataRef = useRef(o365);
  const prevApiDataRef = useRef(o365?.apiData ?? null);
  const prevConnectionStatusRef = useRef(o365?.connectionStatus ?? null);
  const prevExchangeDataRef = useRef(o365?.exchangeData ?? null);
  const prevTeamsDataRef = useRef(o365?.teamsData ?? null);
  const prevOnedriveDataRef = useRef(o365?.onedriveData ?? null);
  const prevSharepointDataRef = useRef(o365?.sharepointData ?? null);
  const prevSecurityDataRef = useRef(o365?.securityData ?? null);
  const prevManualSecurityScoreRef = useRef(o365?.manualSecurityScore ?? null);
  const isFirstMountRef = useRef(true);
  const hasInitialSaveRef = useRef(false);
  useEffect(() => {
    dataRef.current = o365;
  }, [o365]);
  const update = useCallback(patch => {
    if (!patch || typeof patch !== 'object') {
      return;
    }
    const previous = dataRef.current ?? {};
    const updated = {
      ...previous,
      ...patch
    };
    dataRef.current = updated;
    setData(updated);
  }, [setData]);
  const handleCommentChange = useCallback((tab, value) => {
    const comments = o365.comments || {};
    update({
      comments: {
        ...comments,
        [tab]: value
      }
    });
  }, [o365, update]);
  const handleSort = useCallback(columnKey => {
    if (sortColumn === columnKey) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(columnKey);
      setSortDirection('asc');
    }
    setUsersPagination(1);
  }, [sortColumn, sortDirection]);
  const getSortedUsersWrapper = useCallback(users => {
    return getSortedUsers(users, sortColumn, sortDirection);
  }, [sortColumn, sortDirection]);
  const getSortIcon = columnKey => {
    if (sortColumn !== columnKey) {
      return <FaSort style={{
        fontSize: '0.75rem',
        opacity: 0.4,
        marginLeft: '0.25rem'
      }} />;
    }
    return sortDirection === 'asc' ? <FaSortUp style={{
      fontSize: '0.75rem',
      marginLeft: '0.25rem',
      color: '#3b82f6'
    }} /> : <FaSortDown style={{
      fontSize: '0.75rem',
      marginLeft: '0.25rem',
      color: '#3b82f6'
    }} />;
  };
  const getCommentForTab = useCallback(tab => {
    return o365.comments && o365.comments[tab] || "";
  }, [o365]);
  const renderLoadingOverlay = useCallback((tabKey, label) => {
    return null;
  }, []);
  const renderSyncOverlay = useCallback(() => {
    if (!isSyncing) return null;
    return <div style={{
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem',
      color: theme === 'dark' ? '#9ca3af' : '#6b7280',
      fontSize: '0.75rem',
      zIndex: 9999,
      backgroundColor: theme === 'dark' ? 'rgba(30, 30, 63, 0.95)' : 'rgba(255, 255, 255, 0.9)',
      padding: '0.5rem 1rem',
      borderRadius: '8px',
      boxShadow: theme === 'dark' ? '0 2px 8px rgba(0, 0, 0, 0.4)' : '0 2px 8px rgba(0, 0, 0, 0.15)',
      border: theme === 'dark' ? '1px solid #4a4a6a' : 'none'
    }}>
                <FaSync style={{
        animation: 'spin 1s linear infinite',
        fontSize: '0.75rem'
      }} />
                Synchronization...
            </div>;
  }, [isSyncing, theme]);
  const renderCommentSection = useCallback((tab, tabLabel) => <div className={commonStyles.commentSection}>
            <textarea id={`comment-o365-${tab}`} value={getCommentForTab(tab)} onChange={e => handleCommentChange(tab, e.target.value)} placeholder={`Comment of ${tabLabel.toLowerCase()}...`} className={commonStyles.commentInput} rows="3" />
        </div>, [getCommentForTab, handleCommentChange]);
  const renderSyncPlaceholder = useCallback(() => <div className={styles.noDataMessage}>
            <p></p>
        </div>, []);
  const loadStoredData = useCallback(async () => {
    if (!clientId) return;
    try {
      let expectedTenantId = null;
      try {
        const credResponse = await fetch(`${API_BASE_URL}/client-office365/${clientId}`, {
          credentials: 'include'
        });
        if (credResponse.ok) {
          const credResult = await credResponse.json();
          expectedTenantId = credResult?.credentials?.tenantId || null;
        }
      } catch (credErr) {}
      const response = await fetch(`${API_BASE_URL}/clients/${clientId}/o365`, {
        credentials: 'include'
      });
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data?.length > 0) {
          let tenantRecord = null;
          if (expectedTenantId) {
            tenantRecord = result.data.find(t => t.data?.tenantId === expectedTenantId || t.item_key === expectedTenantId);
          }
          if (!tenantRecord && result.data.length > 0) {
            tenantRecord = result.data[0];
          }
          if (tenantRecord && expectedTenantId && tenantRecord.data?.tenantId && tenantRecord.data.tenantId !== expectedTenantId) {
            return;
          }
          if (tenantRecord && tenantRecord.data) {
            const snapshotData = tenantRecord.data;
            if (snapshotData.users || snapshotData.licences) {
              setApiData({
                success: true,
                users: snapshotData.users || [],
                licences: snapshotData.licences || [],
                adoptionScore: snapshotData.adoptionScore || null
              });
            }
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
            setConnectionStatus(snapshotData.connectionStatus || null);
          }
        }
      }
    } catch (error) {}
  }, [clientId]);
  useEffect(() => {
    if (!clientId) return;
    let cancelled = false;
    getClientMfaDetails(clientId).then(result => {
      if (!cancelled && result?.userMfaDetails) {
        setMfaDetails(result.userMfaDetails);
      }
    }).catch(() => {
      if (!cancelled) setMfaDetails([]);
    });
    return () => {
      cancelled = true;
    };
  }, [clientId]);
  const loadDataFromAPI = useCallback(async () => {
    if (!clientId) {
      toast.warning("ID client manquant", toastOptions);
      return;
    }
    setIsSyncing(true);
    setLoadingTabs({
      dashboard: true,
      licences: true,
      utilisateurs: true,
      exchange: true,
      teams: true,
      onedrive: true,
      sharepoint: true,
      securite: true
    });
    try {
      const reportPeriod = getReportPeriod();
      let startDate = null;
      let endDate = null;
      if (config?.client?.checkmkPeriod) {
        startDate = config.client.checkmkPeriod.start_time;
        endDate = config.client.checkmkPeriod.end_time;
      } else {
        const endDateObj = new Date();
        const startDateObj = new Date();
        startDateObj.setDate(startDateObj.getDate() - 30);
        startDate = startDateObj.toISOString();
        endDate = endDateObj.toISOString();
      }
      const headers = {
        'Content-Type': 'application/json'
      };
      const syncResponse = await fetch(`${API_BASE_URL}/office365/sync-all?clientId=${clientId}&period=${reportPeriod}&startDate=${startDate}&endDate=${endDate}`, {
        method: 'GET',
        headers,
        credentials: 'include'
      });
      const syncResult = await syncResponse.json().catch(() => ({}));
      if (!syncResponse.ok || !syncResult.success) {
        throw new Error(syncResult.error || `HTTP error ${syncResponse.status}`);
      }
      let expectedTenantId = null;
      try {
        const credResponse = await fetch(`${API_BASE_URL}/client-office365/${clientId}`, {
          credentials: 'include'
        });
        if (credResponse.ok) {
          const credResult = await credResponse.json();
          expectedTenantId = credResult?.credentials?.tenantId || null;
        }
      } catch (credErr) {}
      if (expectedTenantId && syncResult.data?.tenantId && syncResult.data.tenantId !== expectedTenantId) {
        throw new Error(`Synced data does not match client ${clientId}. Expected TenantId: ${expectedTenantId}, received: ${syncResult.data.tenantId}`);
      }
      await loadStoredData();
      setLoadingTabs({
        dashboard: false,
        licences: false,
        utilisateurs: false,
        exchange: false,
        teams: false,
        onedrive: false,
        sharepoint: false,
        securite: false
      });
      setIsSyncing(false);
      toast.success("Synchronization completed", toastOptions);
    } catch (error) {
      toast.error(error?.message || "Error during synchronization", toastOptions);
      setApiData(null);
      setConnectionStatus(null);
      setExchangeData(null);
      setTeamsData(null);
      setOnedriveData(null);
      setSharepointData(null);
      setSecurityData(null);
      update({
        apiData: null,
        connectionStatus: null,
        exchangeData: null,
        teamsData: null,
        onedriveData: null,
        sharepointData: null,
        securityData: null
      });
      setLoadingTabs({
        dashboard: false,
        licences: false,
        utilisateurs: false,
        exchange: false,
        teams: false,
        onedrive: false,
        sharepoint: false,
        securite: false
      });
      setIsSyncing(false);
    }
  }, [clientId, update, getReportPeriod, config, loadStoredData]);
  useEffect(() => {
    if (clientId) {
      loadStoredData();
    }
  }, [clientId, loadStoredData]);
  useEffect(() => {
    if (!isBrowser) return;
    window.__office365SyncTrigger = loadDataFromAPI;
    window.dispatchEvent(new CustomEvent('office365-sync-available', {
      detail: {
        available: true
      }
    }));
    return () => {
      if (window.__office365SyncTrigger === loadDataFromAPI) {
        delete window.__office365SyncTrigger;
        window.dispatchEvent(new CustomEvent('office365-sync-available', {
          detail: {
            available: false
          }
        }));
        window.dispatchEvent(new CustomEvent('office365-sync-state', {
          detail: {
            isSyncing: false
          }
        }));
      }
    };
  }, [loadDataFromAPI, isBrowser]);
  useEffect(() => {
    if (!isBrowser) return;
    window.__office365SyncIsSyncing = isSyncing;
    window.dispatchEvent(new CustomEvent('office365-sync-state', {
      detail: {
        isSyncing
      }
    }));
  }, [isSyncing, isBrowser]);
  useEffect(() => {
    if (isSyncing) return;
    setLoadingTabs(prev => {
      if (!prev || !Object.values(prev).some(Boolean)) {
        return prev;
      }
      const reset = {};
      Object.keys(prev).forEach(key => {
        reset[key] = false;
      });
      return reset;
    });
  }, [isSyncing]);
  useEffect(() => {
    const hasData = o365 && Object.keys(o365).length > 0;
    if (!hasData) {
      if (isFirstMountRef.current) {
        isFirstMountRef.current = false;
      }
      return;
    }
    const assignIfNeeded = (incoming, setter) => {
      if (incoming === undefined) return;
      setter(prev => {
        if (prev === incoming) return prev;
        return incoming;
      });
    };
    assignIfNeeded(o365.apiData, setApiData, 'apiData');
    assignIfNeeded(o365.connectionStatus, setConnectionStatus, 'connectionStatus');
    assignIfNeeded(o365.exchangeData, setExchangeData, 'exchangeData');
    assignIfNeeded(o365.teamsData, setTeamsData, 'teamsData');
    assignIfNeeded(o365.onedriveData, setOnedriveData, 'onedriveData');
    assignIfNeeded(o365.sharepointData, setSharepointData, 'sharepointData');
    assignIfNeeded(o365.securityData, setSecurityData, 'securityData');
    assignIfNeeded(o365.manualSecurityScore, setManualSecurityScore, 'manualSecurityScore');
    if (isFirstMountRef.current) {
      isFirstMountRef.current = false;
    }
    dataRef.current = o365;
  }, [o365, setApiData, setConnectionStatus, setExchangeData, setTeamsData, setOnedriveData, setSharepointData, setSecurityData, setManualSecurityScore]);
  useEffect(() => {
    if (!update) return;
    const hasChanged = apiData !== prevApiDataRef.current || connectionStatus !== prevConnectionStatusRef.current || exchangeData !== prevExchangeDataRef.current || teamsData !== prevTeamsDataRef.current || onedriveData !== prevOnedriveDataRef.current || sharepointData !== prevSharepointDataRef.current || securityData !== prevSecurityDataRef.current || manualSecurityScore !== prevManualSecurityScoreRef.current;
    const hasDataToSave = apiData !== null && apiData !== undefined || connectionStatus !== null && connectionStatus !== undefined || exchangeData !== null && exchangeData !== undefined || teamsData !== null && teamsData !== undefined || onedriveData !== null && onedriveData !== undefined || sharepointData !== null && sharepointData !== undefined || securityData !== null && securityData !== undefined || manualSecurityScore !== null && manualSecurityScore !== undefined;
    if (!hasChanged && hasInitialSaveRef.current) return;
    if (!hasChanged && hasDataToSave && !hasInitialSaveRef.current) {
      hasInitialSaveRef.current = true;
    }
    const patches = {};
    if (apiData !== null && apiData !== undefined) {
      patches.apiData = apiData;
    }
    if (connectionStatus !== null && connectionStatus !== undefined) {
      patches.connectionStatus = connectionStatus;
    }
    if (exchangeData !== null && exchangeData !== undefined) {
      patches.exchangeData = exchangeData;
    }
    if (teamsData !== null && teamsData !== undefined) {
      patches.teamsData = teamsData;
    }
    if (onedriveData !== null && onedriveData !== undefined) {
      patches.onedriveData = onedriveData;
    }
    if (sharepointData !== null && sharepointData !== undefined) {
      patches.sharepointData = sharepointData;
    }
    if (securityData !== null && securityData !== undefined) {
      patches.securityData = securityData;
    }
    if (manualSecurityScore !== null && manualSecurityScore !== undefined) {
      patches.manualSecurityScore = manualSecurityScore;
    }
    if (Object.keys(patches).length > 0) {
      update(patches);
      prevApiDataRef.current = apiData;
      prevConnectionStatusRef.current = connectionStatus;
      prevExchangeDataRef.current = exchangeData;
      prevTeamsDataRef.current = teamsData;
      prevOnedriveDataRef.current = onedriveData;
      prevSharepointDataRef.current = sharepointData;
      prevSecurityDataRef.current = securityData;
      prevManualSecurityScoreRef.current = manualSecurityScore;
      hasInitialSaveRef.current = true;
    }
  }, [apiData, connectionStatus, exchangeData, teamsData, onedriveData, sharepointData, securityData, manualSecurityScore, update]);
  useEffect(() => {
    if (viewMode === 'utilisateurs') {
      setUsersPagination(1);
    }
    if (viewMode === 'sharepoint') {
      setSharepointPagination(1);
    }
  }, [viewMode]);
  const calculateSecurityScore = () => {
    if (!securityData) {
      return null;
    }
    let fallbackScore = 100;
    const fallbackFactors = [];
    const totalUsers = apiData?.users?.length || 0;
    const usersWithMFA = securityData?.mfa?.usersWithMFA || 0;
    const mfaRate = totalUsers > 0 ? usersWithMFA / totalUsers * 100 : securityData ? 0 : null;
    if (mfaRate !== null) {
      const mfaScore = mfaRate / 100 * 50;
      fallbackScore -= 50 - mfaScore;
      fallbackFactors.push({
        name: 'MFA Users',
        value: mfaRate,
        weight: 50,
        earnedPoints: Math.round(mfaScore)
      });
    }
    const totalAdmins = securityData?.adminStats?.total || 0;
    const adminsWithMFA = securityData?.adminStats?.withMFA || 0;
    const adminMfaRate = totalAdmins > 0 ? adminsWithMFA / totalAdmins * 100 : securityData ? 100 : null;
    if (adminMfaRate !== null) {
      const adminMfaScore = adminMfaRate / 100 * 50;
      fallbackScore -= 50 - adminMfaScore;
      fallbackFactors.push({
        name: 'MFA Administrateurs',
        value: adminMfaRate,
        weight: 50,
        earnedPoints: Math.round(adminMfaScore)
      });
    }
    fallbackScore = Math.max(0, Math.min(100, fallbackScore));
    const fallbackResult = {
      score: Math.round(fallbackScore),
      factors: fallbackFactors,
      mfaRate: mfaRate || 0,
      adminMfaRate: adminMfaRate || 0,
      source: 'calculated'
    };
    const secureScorePercentage = typeof securityData?.secureScore?.percentage === 'number' ? Math.max(0, Math.min(100, securityData.secureScore.percentage)) : null;
    if (secureScorePercentage !== null) {
      return {
        score: Math.round(secureScorePercentage),
        preciseScore: secureScorePercentage,
        factors: [{
          name: "Secure identity score (Entra ID)",
          value: `${Number(securityData.secureScore.currentScore ?? 0).toFixed(2)}/${securityData.secureScore.maxScore || 0}`,
          weight: 100,
          earnedPoints: Math.round(secureScorePercentage)
        }],
        mfaRate: mfaRate || 0,
        adminMfaRate: adminMfaRate || 0,
        source: 'entraIdSecureScore'
      };
    }
    return fallbackResult;
  };
  const calculateDashboardMetrics = () => {
    const users = apiData?.users || [];
    const licences = apiData?.licences || [];
    const now = new Date();
    const period30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const period90Days = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    const activeUsers30 = users.filter(u => {
      const lastLogin = u.lastLoginDate ? new Date(u.lastLoginDate) : null;
      return lastLogin && lastLogin >= period30Days;
    }).length;
    const activeUsers90 = users.filter(u => {
      const lastLogin = u.lastLoginDate ? new Date(u.lastLoginDate) : null;
      return lastLogin && lastLogin >= period90Days;
    }).length;
    const adoptionRate = users.length > 0 ? Math.round(activeUsers30 / users.length * 100) : 0;
    const validLicenses = licences.filter(lic => {
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
  };
  const calculateLicenseMetrics = () => {
    const licences = apiData?.licences || [];
    const users = apiData?.users || [];
    const licenseTypes = {};
    licences.forEach(lic => {
      const type = getLicenseDisplayName(lic.nom || lic.displayName);
      if (!licenseTypes[type]) {
        licenseTypes[type] = {
          total: 0,
          used: 0,
          available: 0,
          skuId: lic.skuId
        };
      }
      licenseTypes[type].total += lic.total || 0;
      licenseTypes[type].used += lic.utilisees || 0;
      licenseTypes[type].available += lic.disponibles || 0;
    });
    const period90Days = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const inactiveUsers = users.filter(u => {
      const lastLogin = u.lastLoginDate ? new Date(u.lastLoginDate) : null;
      return !lastLogin || lastLogin < period90Days;
    });
    const expiringLicenses = licences.filter(lic => {
      if (!lic.expirationDate) return false;
      const expDate = new Date(lic.expirationDate);
      const daysUntilExpiry = (expDate - new Date()) / (1000 * 60 * 60 * 24);
      return daysUntilExpiry > 0 && daysUntilExpiry <= 90;
    });
    return {
      licenseTypes,
      inactiveUsers: inactiveUsers.length,
      expiringLicenses
    };
  };
  const dashboardMetrics = calculateDashboardMetrics();
  const licenseMetrics = calculateLicenseMetrics();
  const securityScore = calculateSecurityScore();
  const [animatedDashboardMetrics, setAnimatedDashboardMetrics] = useState(dashboardMetrics);
  const dashboardMetricsAnimationRef = useRef(null);
  const animatedDashboardMetricsRef = useRef(dashboardMetrics);
  const [editingSecurityScore, setEditingSecurityScore] = useState(false);
  const [editingSecurityScoreValue, setEditingSecurityScoreValue] = useState(null);
  const [recommendationSort, setRecommendationSort] = useState({
    column: 'points',
    direction: 'desc'
  });
  const securityScoreBaseValue = manualSecurityScore !== null ? manualSecurityScore : securityScore?.score ?? null;
  const [animatedSecurityScore, setAnimatedSecurityScore] = useState(securityScoreBaseValue);
  const securityScoreAnimationRef = useRef(null);
  const animatedSecurityScoreRef = useRef(securityScoreBaseValue);
  const isManualChangeRef = useRef(false);
  useEffect(() => {
    animatedDashboardMetricsRef.current = animatedDashboardMetrics;
  }, [animatedDashboardMetrics]);
  useEffect(() => {
    if (!dashboardMetrics) return;
    if (dashboardMetricsAnimationRef.current) {
      cancelAnimationFrame(dashboardMetricsAnimationRef.current);
    }
    const targetValues = dashboardMetrics;
    const startValues = animatedDashboardMetricsRef.current || dashboardMetrics;
    const startTime = performance.now();
    const duration = 1200;
    const tick = now => {
      const progress = Math.min((now - startTime) / duration, 1);
      const eased = easeOutCubic(progress);
      const next = {};
      DASHBOARD_METRIC_KEYS.forEach(key => {
        const start = typeof startValues?.[key] === 'number' ? startValues[key] : 0;
        const end = typeof targetValues?.[key] === 'number' ? targetValues[key] : 0;
        next[key] = Math.round(start + (end - start) * eased);
      });
      setAnimatedDashboardMetrics(next);
      if (progress < 1) {
        dashboardMetricsAnimationRef.current = requestAnimationFrame(tick);
      }
    };
    dashboardMetricsAnimationRef.current = requestAnimationFrame(tick);
    return () => {
      if (dashboardMetricsAnimationRef.current) {
        cancelAnimationFrame(dashboardMetricsAnimationRef.current);
      }
    };
  }, [dashboardMetrics]);
  useEffect(() => {
    animatedSecurityScoreRef.current = animatedSecurityScore;
  }, [animatedSecurityScore]);
  useEffect(() => {
    if (isManualChangeRef.current) {
      isManualChangeRef.current = false;
      return;
    }
    if (securityScoreAnimationRef.current) {
      cancelAnimationFrame(securityScoreAnimationRef.current);
    }
    if (securityScoreBaseValue === null || securityScoreBaseValue === undefined) {
      setAnimatedSecurityScore(null);
      animatedSecurityScoreRef.current = null;
      return;
    }
    const startValue = typeof animatedSecurityScoreRef.current === 'number' ? animatedSecurityScoreRef.current : securityScoreBaseValue;
    const targetValue = securityScoreBaseValue;
    const startTime = performance.now();
    const duration = 1200;
    const tick = now => {
      const progress = Math.min((now - startTime) / duration, 1);
      const eased = easeOutCubic(progress);
      const value = startValue + (targetValue - startValue) * eased;
      setAnimatedSecurityScore(Math.round(value));
      if (progress < 1) {
        securityScoreAnimationRef.current = requestAnimationFrame(tick);
      }
    };
    securityScoreAnimationRef.current = requestAnimationFrame(tick);
    return () => {
      if (securityScoreAnimationRef.current) {
        cancelAnimationFrame(securityScoreAnimationRef.current);
      }
    };
  }, [securityScoreBaseValue]);
  const identitySecureScoreData = securityData?.secureScore || null;
  const defenderScoreData = securityData?.defenderSecureScore || null;
  const identityScoreCurrent = identitySecureScoreData?.currentScore ?? null;
  const identityScoreMax = identitySecureScoreData?.maxScore ?? null;
  const identityScorePercentageCalculated = identitySecureScoreData?.percentage ?? (identityScoreCurrent !== null && identityScoreMax ? Math.round(identityScoreCurrent / identityScoreMax * 1000) / 10 : null);
  const identityScorePercentage = manualSecurityScore !== null ? manualSecurityScore : identityScorePercentageCalculated;
  const identityScoreLetter = identityScorePercentage !== null ? scoreToLetter(identityScorePercentage) : null;
  const identityScoreLetterColor = letterToColor(identityScoreLetter);
  const identityScoreLetterBackground = letterToBackground(identityScoreLetter);
  const identityScoreLabel = identityScorePercentage !== null ? scoreToLabel(identityScorePercentage) : 'Pending';
  const currentTabIsLoading = !!loadingTabs[viewMode];
  return <div className={`${styles.container} ${theme === "dark" ? styles.dark : ""}`}>
                <div className={styles.o365Card}>
                    {}
                    <div className={styles.cardHeader} style={{
        position: 'relative',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'nowrap',
        paddingBottom: '1rem'
      }}>
                        <div className={styles.headerLeft} style={{
          zIndex: 1
        }}>
                            <div className={styles.o365Info}>
                                <h3 className={styles.o365Name}>
                                <img src={getIconPath('office365.png')} alt="Office 365" style={{
                width: '24px',
                height: '24px',
                display: 'inline-block',
                verticalAlign: 'middle',
                marginRight: '0.5rem'
              }} />
                                    Microsoft 365
                                </h3>
                            {connectionStatus && <p style={{
              margin: 0,
              fontSize: '0.875rem',
              color: 'var(--text-secondary)',
              marginTop: '0.25rem'
            }}>
                                    {connectionStatus.organization || "Connected"}
                                </p>}
                            </div>
                        </div>

                        {}
                        <div style={{
          position: 'absolute',
          left: '50%',
          top: '-15px',
          transform: 'translateX(-50%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none',
          zIndex: 2
        }}>
                            <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.25rem',
            background: theme === 'dark' ? '#2d2d4f' : '#f3f4f6',
            padding: '0.25rem',
            borderRadius: '8px',
            border: theme === 'dark' ? '1px solid #4a4a6a' : '1px solid #e5e7eb',
            pointerEvents: 'auto',
            flexWrap: 'nowrap'
          }}>
                    {[{
              key: 'dashboard',
              icon: 'mdi:view-dashboard',
              label: 'Dashboard'
            }, {
              key: 'licences',
              icon: 'mdi:license',
              label: 'Licenses'
            }, {
              key: 'utilisateurs',
              icon: 'mdi:account-multiple',
              label: 'Users'
            }, {
              key: 'exchange',
              icon: 'simple-icons:microsoftexchange',
              label: 'Exchange'
            }, {
              key: 'teams',
              icon: 'simple-icons:microsoftteams',
              label: 'Teams'
            }, {
              key: 'onedrive',
              icon: 'entypo-social:onedrive',
              label: 'OneDrive'
            }, {
              key: 'sharepoint',
              icon: 'mdi:microsoft-sharepoint',
              label: 'SharePoint'
            }, {
              key: 'securite',
              icon: 'mdi:shield-check',
              label: 'Security'
            }].map(tab => {
              const isLoading = !!loadingTabs[tab.key];
              const isDisabled = isLoading;
              const isActive = viewMode === tab.key;
              return <button key={tab.key} onClick={() => {
                if (!isDisabled) {
                  setViewMode(tab.key);
                }
              }} style={{
                padding: '0.5rem',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.25rem',
                minWidth: '70px',
                width: '70px',
                color: isActive ? theme === 'dark' ? '#f9fafb' : '#111827' : theme === 'dark' ? '#9ca3af' : '#6b7280',
                background: isActive ? theme === 'dark' ? '#1e1e3f' : '#ffffff' : 'transparent',
                border: 'none',
                borderRadius: '6px',
                cursor: isDisabled ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease',
                opacity: isLoading ? 0.5 : 1,
                boxShadow: isActive ? '0 2px 4px rgba(0,0,0,0.1)' : 'none',
                pointerEvents: isDisabled ? 'none' : 'auto'
              }} title={isLoading ? 'Loading...' : tab.label}>
                                <IconifyIcon icon={tab.icon} width={20} height={20} style={{
                  pointerEvents: 'none'
                }} />
                                <span style={{
                  fontSize: '0.65rem',
                  fontWeight: '500',
                  whiteSpace: 'nowrap',
                  pointerEvents: 'none'
                }}>
                                    {tab.label}
                                </span>
                        </button>;
            })}
                            </div>
                        </div>

                        {}
                        <div className={styles.headerRight} style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          zIndex: 1
        }}>
                            <button type="button" className={`${commonStyles.syncButton} ${!apiData && !isSyncing ? commonStyles.syncButtonWarning : ''}`} onClick={loadDataFromAPI} disabled={isSyncing} title={!apiData ? "Sync Office 365 data (sync required)" : "Sync Office 365 data65"}>
                                <IconifyIcon icon="material-symbols:sync" width={14} height={14} style={{
              animation: isSyncing ? 'spin 1s linear infinite' : 'none'
            }} />
                            </button>
                            
                        </div>
                    </div>
                
                {}
                <div style={{
        position: 'relative',
        minHeight: '400px',
        marginTop: '3rem',
        opacity: currentTabIsLoading ? 0.4 : isSyncing ? 0.5 : 1,
        filter: currentTabIsLoading ? 'grayscale(0.25)' : 'none',
        pointerEvents: currentTabIsLoading ? 'none' : 'auto',
        transition: 'opacity 0.2s ease, filter 0.2s ease'
      }}>
                    {renderSyncOverlay()}
                    <div>
                        {viewMode === 'dashboard' && <DashboardTab detailData={{
            clientName: config?.client?.name || config?.client?.nom || ''
          }} dashboardMetrics={dashboardMetrics} animatedDashboardMetrics={animatedDashboardMetrics} adoptionScore={apiData?.adoptionScore || null} tenantId={config?.client?.equipements?.Office365?.tenantId || null} theme={theme} securityScore={securityScore} securityScoreBaseValue={securityScoreBaseValue} editingSecurityScore={editingSecurityScore} editingSecurityScoreValue={editingSecurityScoreValue} setEditingSecurityScore={setEditingSecurityScore} setEditingSecurityScoreValue={setEditingSecurityScoreValue} setManualSecurityScore={setManualSecurityScore} update={update} animatedSecurityScore={animatedSecurityScore} setAnimatedSecurityScore={setAnimatedSecurityScore} animatedSecurityScoreRef={animatedSecurityScoreRef} isManualChangeRef={isManualChangeRef} hoveredSecurityTooltip={hoveredSecurityTooltip} setHoveredSecurityTooltip={setHoveredSecurityTooltip} renderCommentSection={renderCommentSection} />}

                        {viewMode === 'licences' && <LicensesTab licences={apiData?.licences || []} dashboardMetrics={dashboardMetrics} theme={theme} renderCommentSection={renderCommentSection} />}
                        
                        {}
                        {viewMode === 'utilisateurs' && <UsersTab users={apiData?.users || []} dashboardMetrics={dashboardMetrics} theme={theme} sortColumn={sortColumn} sortDirection={sortDirection} handleSort={handleSort} getSortIcon={getSortIcon} renderCommentSection={renderCommentSection} renderSyncPlaceholder={renderSyncPlaceholder} />}
                        
                        {}
                        {viewMode === 'exchange' && <ExchangeTab exchangeData={exchangeData} theme={theme} renderCommentSection={renderCommentSection} renderSyncPlaceholder={renderSyncPlaceholder} />}
                        
                        {}
                        {viewMode === 'teams' && <TeamsTab teamsData={teamsData} theme={theme} renderCommentSection={renderCommentSection} renderSyncPlaceholder={renderSyncPlaceholder} />}
                        
                        {}
                        {viewMode === 'onedrive' && <OneDriveTab onedriveData={onedriveData} theme={theme} renderCommentSection={renderCommentSection} renderSyncPlaceholder={renderSyncPlaceholder} />}
                        
                        {}
                        {viewMode === 'sharepoint' && <SharePointTab sharepointData={sharepointData} theme={theme} renderCommentSection={renderCommentSection} renderSyncPlaceholder={renderSyncPlaceholder} />}
                        
                        {}
                        {viewMode === 'securite' && <>
                                <SecuriteTab securityData={securityData} users={apiData?.users || []} mfaDetails={mfaDetails} theme={theme} />
                                {renderCommentSection && renderCommentSection('securite', 'Security')}
                            </>}
                        
                                                </div>
                                                        </div>
            </div>

            {}
            {hoveredSecurityTooltip && <div style={{
      position: 'fixed',
      left: `${hoveredSecurityTooltip.mouseX + 10}px`,
      top: `${hoveredSecurityTooltip.mouseY + 10}px`,
      background: '#ffffff',
      border: '1px solid rgba(0,0,0,0.08)',
      borderRadius: '6px',
      padding: '1rem',
      boxShadow: '0 8px 24px rgba(0, 0, 0, 0.25)',
      zIndex: 999999,
      maxWidth: '700px',
      pointerEvents: 'none',
      color: '#111827'
    }}>
                    <div>
                        <div style={{
          fontSize: '0.95rem',
          fontWeight: '700',
          marginBottom: '0.75rem',
          color: '#111827'
        }}>
                            Calcul de la note
                        </div>
                        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '0.75rem 1rem'
        }}>
                            {(hoveredSecurityTooltip.scoreBreakdown || []).map((item, idx) => <div key={`score-breakdown-${idx}`} style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: '0.75rem'
          }}>
                                    <div style={{
              flex: 1
            }}>
                                        <div style={{
                fontWeight: '600',
                fontSize: '0.85rem',
                marginBottom: '0.25rem'
              }}>
                                            {item.label}
                                        </div>
                                        {item.value && <div style={{
                fontSize: '0.8rem',
                color: '#6b7280',
                lineHeight: 1.4,
                marginBottom: '0.25rem'
              }}>
                                                Valeur: {item.value}
                                            </div>}
                                        {item.description && <div style={{
                fontSize: '0.8rem',
                color: '#6b7280',
                lineHeight: 1.4
              }}>
                                                {item.description}
                                            </div>}
                                    </div>
                                    <div style={{
              fontWeight: '600',
              fontSize: '0.85rem',
              color: '#111827',
              whiteSpace: 'nowrap'
            }}>
                                        {item.weight}
                                    </div>
                                </div>)}
                        </div>
                    </div>
                </div>}
        </div>;
};
export default O365;
