import React, { useState, useEffect, useMemo, useRef } from "react";
import { Icon } from "@iconify/react";
import { FaArrowLeft, FaSync, FaSort, FaSortUp, FaSortDown } from "react-icons/fa";
import { toast } from 'react-toastify';
import API_BASE_URL from "../../config";
import styles from "./TenantDetailPage.module.css";
import SmartTooltip from "../SmartTooltip";
import DashboardTab from "./TenantDetailTabs/DashboardTab";
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
export default function TenantDetailPage({
  onNavigate,
  tenantData
}) {
  const locale = useAppLocale();
  const configCopy = useMemo(() => getEnterpriseConfigModalsCopy(locale), [locale]);
  const [detailData, setDetailData] = useState(() => {
    return tenantData ? {
      ...tenantData
    } : null;
  });
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const [syncStatus, setSyncStatus] = useState('');
  const [statistics, setStatistics] = useState(null);
  const [lastSync, setLastSync] = useState(null);
  const [viewMode, setViewMode] = useState('dashboard');
  const [exchangeData, setExchangeData] = useState(null);
  const [teamsData, setTeamsData] = useState(null);
  const [onedriveData, setOnedriveData] = useState(null);
  const [sharepointData, setSharepointData] = useState(null);
  const [securityData, setSecurityData] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState(null);
  const [mfaDetails, setMfaDetails] = useState([]);
  const currentClientIdRef = useRef(null);
  const abortControllerRef = useRef(null);
  const [sortColumn, setSortColumn] = useState(null);
  const [sortDirection, setSortDirection] = useState('asc');
  const [emailActivityViewMode, setEmailActivityViewMode] = useState('day');
  const [selectedPeriod, setSelectedPeriod] = useState('D30');
  const [deletingTenant, setDeletingTenant] = useState(false);
  useEffect(() => {
    if (tenantData?.clientId !== detailData?.clientId) {
      const newDetailData = tenantData ? {
        ...tenantData
      } : null;
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
      setViewMode('dashboard');
      setSortColumn(null);
      setSortDirection('asc');
      setEmailActivityViewMode('day');
      setSelectedPeriod('D30');
      currentClientIdRef.current = newDetailData?.clientId || null;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();
    }
  }, [tenantData?.clientId, detailData?.clientId]);
  const handleSort = columnKey => {
    if (sortColumn === columnKey) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(columnKey);
      setSortDirection('asc');
    }
  };
  const getSortedUsers = usersList => {
    if (!sortColumn) return usersList;
    const sorted = [...usersList].sort((a, b) => {
      let aValue, bValue;
      switch (sortColumn) {
        case 'nom':
          aValue = (a.name || a.displayName || '').toLowerCase();
          bValue = (b.name || b.displayName || '').toLowerCase();
          break;
        case 'email':
          aValue = (a.email || a.userPrincipalName || '').toLowerCase();
          bValue = (b.email || b.userPrincipalName || '').toLowerCase();
          break;
        case 'dateCreation':
          aValue = a.createdDate ? new Date(a.createdDate).getTime() : 0;
          bValue = b.createdDate ? new Date(b.createdDate).getTime() : 0;
          break;
        case 'derniereLogin':
          aValue = a.lastLoginDate ? new Date(a.lastLoginDate).getTime() : 0;
          bValue = b.lastLoginDate ? new Date(b.lastLoginDate).getTime() : 0;
          break;
        case 'statut':
          const getStatusValue = user => {
            if (user.accountEnabled === false) return 0;
            const lastLogin = user.lastLoginDate ? new Date(user.lastLoginDate) : null;
            const period90Days = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
            const isInactive = !lastLogin || lastLogin < period90Days;
            const period30Days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
            const isActive30 = lastLogin && lastLogin >= period30Days;
            if (isActive30) return 3;
            if (isInactive) return 1;
            return 2;
          };
          aValue = getStatusValue(a);
          bValue = getStatusValue(b);
          break;
        case 'licence':
          aValue = (a.licenses || 'None').toLowerCase();
          bValue = (b.licenses || 'None').toLowerCase();
          break;
        default:
          return 0;
      }
      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
    return sorted;
  };
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
  const exportUsersToCSV = () => {
    if (!users || users.length === 0) {
      toast.error('No users to export');
      return;
    }
    const usersToExport = getSortedUsers(users);
    const headers = ['Name', 'Email', 'Created on', 'Last sign-in', 'Status', 'Licenses'];
    const rows = usersToExport.map(user => {
      const lastLogin = user.lastLoginDate ? new Date(user.lastLoginDate) : null;
      const createdDate = user.createdDate ? new Date(user.createdDate) : null;
      const period90Days = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
      const isInactive = !lastLogin || lastLogin < period90Days;
      const period30Days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const isActive30 = lastLogin && lastLogin >= period30Days;
      const statusLabel = user.accountEnabled === false ? 'Blocked' : isActive30 ? 'Active' : isInactive ? 'Inactive (>90d)' : 'Inactive';
      return [user.name || user.displayName || '', user.email || user.userPrincipalName || '', createdDate ? createdDate.toLocaleDateString('en-GB') : '', lastLogin ? lastLogin.toLocaleDateString('en-GB') : 'Never', statusLabel, user.licenses || 'None'];
    });
    const csvContent = [headers.join(';'), ...rows.map(row => row.map(cell => {
      const cellStr = String(cell || '');
      if (cellStr.includes(';') || cellStr.includes('"') || cellStr.includes('\n')) {
        return `"${cellStr.replace(/"/g, '""')}"`;
      }
      return cellStr;
    }).join(';'))].join('\n');
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], {
      type: 'text/csv;charset=utf-8;'
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const dateStr = new Date().toISOString().split('T')[0];
    const clientName = detailData?.clientName || 'client';
    link.download = `utilisateurs_${clientName}_${dateStr}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success(`CSV export successful: ${usersToExport.length} user(s) exported`);
  };
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
      }, `${detailData.clientName} - Tenant Microsoft`);
    }
  }, [detailData]);
  useEffect(() => {
    if (!detailData?.clientId) return;
    let cancelled = false;
    getClientMfaDetails(detailData.clientId).then(result => {
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
  const loadStoredTenantData = async () => {
    if (!detailData?.clientId) return;
    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    const targetClientId = detailData.clientId;
    try {
      const response = await fetch(`${API_BASE_URL}/clients/${targetClientId}/o365`, {
        credentials: 'include',
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
                credentials: 'include',
                signal: abortController.signal
              });
              if (currentClientIdRef.current !== targetClientId) {
                return;
              }
              if (credResponse.ok) {
                const credResult = await credResponse.json();
                targetTenantId = credResult?.credentials?.tenantId || null;
                if (targetTenantId && currentClientIdRef.current === targetClientId) {
                  setDetailData(prev => {
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
              if (credErr.name === 'AbortError') {
                return;
              }
            }
          }
          let tenantRecord = null;
          if (targetTenantId) {
            tenantRecord = result.data.find(t => t.data?.tenantId === targetTenantId || t.item_key === targetTenantId);
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
                setDetailData(prev => {
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
      if (error.name === 'AbortError') {
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
  const licenseNameMapping = {
    'ENTERPRISEPACK': 'Microsoft 365 E3',
    'ENTERPRISEPREMIUM': 'Microsoft 365 E5',
    'STANDARDWOFFPACK_FACULTY': 'Office 365 Education (Faculty)',
    'STANDARDWOFFPACK_STUDENT': 'Office 365 Education (Students)',
    'O365_BUSINESS': 'Microsoft 365 Business Basic',
    'O365_BUSINESS_ESSENTIALS': 'Microsoft 365 Business Essentials',
    'O365_BUSINESS_PREMIUM': 'Microsoft 365 Business Premium',
    'EXCHANGESTANDARD': 'Exchange Online Plan 1',
    'EXCHANGEENTERPRISE': 'Exchange Online Plan 2',
    'SHAREPOINTSTANDARD': 'SharePoint Online Plan 1',
    'SHAREPOINTENTERPRISE': 'SharePoint Online Plan 2',
    'TEAMS1': 'Microsoft Teams (Essential)',
    'FLOW_FREE': 'Power Automate (Free)'
  };
  const getLicenseDisplayName = licenseId => {
    if (!licenseId) return 'Unknown license';
    const normalizedId = licenseId.toUpperCase().trim();
    if (licenseNameMapping[normalizedId]) {
      return licenseNameMapping[normalizedId];
    }
    for (const [key, value] of Object.entries(licenseNameMapping)) {
      if (normalizedId.includes(key) || key.includes(normalizedId)) {
        return value;
      }
    }
    const formatted = licenseId.replace(/_/g, ' ').replace(/-/g, ' ').split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
    return formatted;
  };
  const dashboardMetrics = useMemo(() => {
    if (!users || users.length === 0) return null;
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
  }, [users, licences]);
  const handleSync = async () => {
    if (!detailData?.clientId) {
      toast.error('No client ID available for sync');
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
    setSyncStatus('Preparing...');
    const progressInterval = setInterval(() => {
      setSyncProgress(prev => {
        if (prev >= 90) return prev;
        return prev + 10;
      });
    }, 500);
    try {
      if (currentClientIdRef.current !== targetClientId) {
        throw new Error('The client changed during sync');
      }
      if (typeof window !== 'undefined' && typeof window.__office365SyncTrigger === 'function') {
        try {
          window.__office365SyncTrigger();
        } catch (e) {
          console.error('Error syncing via the O365 module:', e);
        }
      }
      setSyncStatus('Syncing...');
      setSyncProgress(50);
      const headers = {
        'Content-Type': 'application/json'
      };
      const endDate = new Date();
      let startDate = new Date();
      switch (selectedPeriod) {
        case 'D7':
          startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'D30':
          startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case 'D90':
          startDate = new Date(endDate.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
      }
      const syncResponse = await fetch(`${API_BASE_URL}/office365/sync-all?clientId=${targetClientId}&period=${selectedPeriod}&startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`, {
        method: 'GET',
        headers,
        credentials: 'include',
        signal: abortController.signal
      });
      if (currentClientIdRef.current !== targetClientId) {
        throw new Error('The client changed during sync');
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
          credentials: 'include',
          signal: abortController.signal
        });
        if (currentClientIdRef.current !== targetClientId) {
          throw new Error('The client changed during credential verification');
        }
        if (credResponse.ok) {
          const credResult = await credResponse.json();
          expectedTenantId = credResult?.credentials?.tenantId || null;
        }
      } catch (credErr) {
        if (credErr.name === 'AbortError') {
          return;
        }
      }
      if (expectedTenantId && syncResult.data?.tenantId && syncResult.data.tenantId !== expectedTenantId) {
        throw new Error(`Synced data does not match client ${targetClientId}. Expected TenantId: ${expectedTenantId}, received: ${syncResult.data.tenantId}`);
      }
      setSyncStatus('Finalisation...');
      setSyncProgress(100);
      if (syncResult.lastUpdate && currentClientIdRef.current === targetClientId) {
        setLastSync(syncResult.lastUpdate);
      }
      await loadStoredTenantData();
      if (currentClientIdRef.current === targetClientId) {
        toast.success('Microsoft tenant data synced successfully');
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        return;
      }
      console.error('Error during sync:', error);
      if (currentClientIdRef.current === targetClientId) {
        toast.error(error.message || 'Error during sync');
      }
    } finally {
      clearInterval(progressInterval);
      if (abortControllerRef.current === abortController) {
        setTimeout(() => {
          setSyncProgress(0);
          setSyncStatus('');
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
    setDeletingTenant(true);
    try {
      await deleteClientOffice365Credentials(detailData.clientId);
      const {
        modules_monitoring
      } = await fetchClientModules(detailData.clientId);
      await updateClient(detailData.clientId, {
        modules_monitoring: {
          ...modules_monitoring,
          Office365: false
        },
        office365_data: null
      });
      toast.success('Tenant removed from client');
      onNavigate('Service', {
        activeTab: 'microsoft',
        refresh: Date.now()
      }, {
        closeCurrent: true
      });
    } catch (error) {
      console.error('Error deleting tenant:', error);
      toast.error(error.message || 'Error deleting the tenant');
    } finally {
      setDeletingTenant(false);
    }
  };
  if (!detailData) {
    return <div className={styles.detailPage}>
        <div className={styles.emptyState}>
          <Icon icon="mdi:alert-circle" className={styles.emptyIcon} />
          <h2>No tenant data</h2>
          <p>Please select a Microsoft tenant from the services page</p>
          <button className={styles.backButton} onClick={() => onNavigate('Service', {
          activeTab: 'microsoft'
        })}>
            <FaArrowLeft />
          </button>
          {tenantData?.clientId && <SmartTooltip as="span" content="Go to company details">
              <button className={`${styles.headerActionButton} ${styles.headerActionButtonInactive}`} onClick={() => onNavigate('ContratDetail', {
            clientId: tenantData?.clientId,
            name: tenantData?.clientName
          })}>
                <Icon icon="mdi:building" className={styles.headerActionIcon} />
              </button>
            </SmartTooltip>}
        </div>
      </div>;
  }
  const calculateStats = () => {
    const totalUsers = users.length;
    const activeUsers = users.filter(u => u.accountEnabled !== false).length;
    const inactiveUsers = users.filter(u => u.accountEnabled === false).length;
    const totalLicenses = licences.reduce((sum, lic) => sum + (lic.total || 0), 0);
    const usedLicenses = licences.reduce((sum, lic) => sum + (lic.utilisees || 0), 0);
    const domainSet = new Set();
    users.forEach(u => {
      const raw = (u.userPrincipalName || u.email || '').toString().trim();
      const at = raw.indexOf('@');
      if (at !== -1) {
        const domain = raw.slice(at + 1).toLowerCase();
        if (domain) {
          domainSet.add(domain);
        }
      }
    });
    const domainCount = domainSet.size;
    return {
      totalUsers,
      activeUsers,
      inactiveUsers,
      totalLicenses,
      usedLicenses,
      domainCount
    };
  };
  const stats = calculateStats();
  const formatLicenseRow = lic => {
    const total = lic.total || 0;
    const used = lic.utilisees || lic.used || 0;
    const available = Math.max(0, total - used);
    const usageRate = total > 0 ? Math.round(used / total * 100) : 0;
    let status = 'normal';
    let statusText = 'Normal';
    let statusColor = '#10b981';
    if (available >= 3) {
      status = 'warning';
      statusText = 'Warning';
      statusColor = '#f59e0b';
    } else if (usageRate >= 90) {
      status = 'optimal';
      statusText = 'Optimal';
      statusColor = '#10b981';
    } else if (usageRate < 50 && total > 0) {
      status = 'critical';
      statusText = 'Gaspillage';
      statusColor = '#ef4444';
    }
    return {
      total,
      used,
      available,
      usageRate,
      status,
      statusText,
      statusColor
    };
  };
  const TABS = [{
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
  }];
  return <div className={styles.detailPage}>
      {}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <button className={styles.backButton} onClick={() => onNavigate('Service', {
          activeTab: 'microsoft'
        })}>
            <FaArrowLeft />
          </button>
          {onNavigate && detailData.clientId && <SmartTooltip as="span" content="Go to company details">
              <button className={`${styles.headerActionButton} ${styles.headerActionButtonInactive}`} onClick={() => onNavigate('ContratDetail', {
            clientId: detailData.clientId,
            name: detailData.clientName
          })}>
                <Icon icon="mdi:building" className={styles.headerActionIcon} />
              </button>
            </SmartTooltip>}
          <div className={styles.headerTitle}>
            <Icon icon="mdi:microsoft-azure" className={styles.headerLogo} style={{
            fontSize: '1.75rem',
            color: '#0078d4'
          }} />
            <div className={styles.headerTitleBlock}>
              <h1>
                {detailData.clientName || detailData.nom || detailData.name || 'Tenant Microsoft'}
              </h1>
              {(detailData.tenantId || statistics?.tenantId) && <div className={styles.headerMeta}>
                  <span className={styles.headerMetaItem}>
                    Id tenant: {detailData.tenantId || statistics?.tenantId || '-'}
                  </span>
                </div>}
            </div>
          </div>
        </div>
        <div className={styles.headerTabsContainer}>
          {TABS.map(tab => <button key={tab.key} type="button" className={`${styles.headerTabButton} ${viewMode === tab.key ? styles.headerTabButtonActive : ''}`} onClick={() => setViewMode(tab.key)}>
              <Icon icon={tab.icon} style={{
            fontSize: '1rem'
          }} />
              {tab.label}
            </button>)}
        </div>
        <div className={styles.headerRight}>
          <div className={styles.headerActions}>
            <div className={styles.syncInfo}>
              {lastSync && <span className={styles.lastSyncText}>
                  Updated: {new Date(lastSync).toLocaleDateString('en-GB')} at {new Date(lastSync).toLocaleTimeString('en-GB', {
                hour: '2-digit',
                minute: '2-digit'
              })}
                </span>}
              {syncing && <div className={styles.syncProgress}>
                  <div className={styles.syncProgressBar}>
                    <div className={styles.syncProgressFill} style={{
                  width: `${syncProgress}%`
                }}></div>
                  </div>
                  <span className={styles.syncProgressText}>{syncStatus}</span>
                </div>}
            </div>
            <SmartTooltip as="span" content="Sync data">
              <button type="button" className={styles.syncButton} onClick={handleSync} disabled={syncing || loading}>
                <FaSync className={syncing ? styles.spinning : ''} />
              </button>
            </SmartTooltip>
            <SmartTooltip as="span" content="Remove tenant from client">
              <button type="button" className={styles.deleteTenantButton} onClick={handleDeleteTenant} disabled={deletingTenant || loading}>
                <Icon icon={deletingTenant ? 'mdi:loading' : 'mdi:delete-outline'} className={deletingTenant ? styles.spinning : ''} />
              </button>
            </SmartTooltip>
          </div>
        </div>
      </div>

      {}
      <div className={styles.content} key={viewMode}>
        {syncing && <div className={styles.syncSkeleton}>
            <div className={styles.skeletonStatsCards}>
              {[1, 2, 3].map(i => <div key={i} className={styles.skeletonStatCard}>
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
                {[1, 2, 3, 4, 5].map(j => <div key={j} className={`${styles.skeletonShimmer} ${styles.skeletonTableHeaderCell}`} />)}
              </div>
              {[1, 2, 3, 4, 5, 6, 7, 8].map(row => <div key={row} className={styles.skeletonTableRow}>
                  {[1, 2, 3, 4, 5].map(j => <div key={j} className={`${styles.skeletonShimmer} ${styles.skeletonTableCell}`} />)}
                </div>)}
            </div>
          </div>}

        {!syncing && viewMode === 'dashboard' && <section className={styles.kpiSection}>
            <h2 className={styles.sectionTitle}>Indicateurs</h2>
            <div className={styles.statsCards}>
              <div className={styles.statCard}>
                <div className={styles.statCardIcon} style={{
              color: '#15D1A0'
            }}>
                  <Icon icon="mdi:account-multiple" />
                </div>
                <div className={styles.statCardContent}>
                  <div className={styles.statCardValue}>{stats.totalUsers}</div>
                  <div className={styles.statCardLabel}>Users</div>
                </div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statCardIcon} style={{
              color: '#10b981'
            }}>
                  <Icon icon="mdi:check-circle" />
                </div>
                <div className={styles.statCardContent}>
                  <div className={styles.statCardValue} style={{
                color: '#10b981'
              }}>{stats.activeUsers}</div>
                  <div className={styles.statCardLabel}>Active</div>
                </div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statCardIcon} style={{
              color: '#ef4444'
            }}>
                  <Icon icon="mdi:account-off" />
                </div>
                <div className={styles.statCardContent}>
                  <div className={styles.statCardValue} style={{
                color: '#ef4444'
              }}>{stats.inactiveUsers}</div>
                  <div className={styles.statCardLabel}>Inactive</div>
                </div>
              </div>
            </div>
            <div className={styles.statsCards} style={{
          marginTop: '1rem'
        }}>
              <div className={styles.statCard}>
                <div className={styles.statCardIcon} style={{
              color: 'var(--text-muted)'
            }}>
                  <Icon icon="mdi:license" />
                </div>
                <div className={styles.statCardContent}>
                  <div className={styles.statCardValue}>{stats.totalLicenses}</div>
                  <div className={styles.statCardLabel}>Total licenses</div>
                </div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statCardIcon} style={{
              color: '#f59e0b'
            }}>
                  <Icon icon="mdi:license-check" />
                </div>
                <div className={styles.statCardContent}>
                  <div className={styles.statCardValue} style={{
                color: '#f59e0b'
              }}>{stats.usedLicenses}</div>
                  <div className={styles.statCardLabel}>Licenses used</div>
                </div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statCardIcon} style={{
              color: '#3b82f6'
            }}>
                  <Icon icon="mdi:domain" />
                </div>
                <div className={styles.statCardContent}>
                  <div className={styles.statCardValue} style={{
                color: '#3b82f6'
              }}>{stats.domainCount}</div>
                  <div className={styles.statCardLabel}>Domains (users)</div>
                </div>
              </div>
            </div>
          </section>}
        {loading ? <div className={styles.loadingState}>
            <Icon icon="mdi:loading" className={styles.loadingSpinner} />
            <p>Loading tenant details...</p>
          </div> : <>
            {}
            {viewMode === 'dashboard' && !syncing && <DashboardTab detailData={detailData} dashboardMetrics={dashboardMetrics} adoptionScore={adoptionScore} tenantId={statistics?.tenantId || detailData?.tenantId} securityData={securityData} users={users} styles={styles} theme="dark" />}

            {viewMode === 'licences' && !syncing && <LicensesTab licences={licences} dashboardMetrics={dashboardMetrics} styles={styles} theme="dark" getLicenseDisplayName={getLicenseDisplayName} />}

            {viewMode === 'utilisateurs' && !syncing && <UsersTab users={users} dashboardMetrics={dashboardMetrics} detailData={detailData} mfaDetails={mfaDetails} theme="dark" />}

            {viewMode === 'exchange' && !syncing && <ExchangeTab exchangeData={exchangeData} theme="dark" />}

            {viewMode === 'teams' && !syncing && <TeamsTab teamsData={teamsData} theme="dark" />}

            {viewMode === 'onedrive' && !syncing && <OneDriveTab onedriveData={onedriveData} theme="dark" />}

            {viewMode === 'sharepoint' && !syncing && <SharePointTab sharepointData={sharepointData} theme="dark" />}

            {viewMode === 'securite' && !syncing && <SecuriteTab securityData={securityData} users={users} mfaDetails={mfaDetails} clientId={detailData?.clientId} theme="dark" />}
          </>}
      </div>
    </div>;
}
