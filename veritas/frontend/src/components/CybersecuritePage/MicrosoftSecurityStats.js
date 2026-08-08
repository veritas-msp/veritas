import { useState, useEffect, useCallback, useMemo } from "react";
import React from "react";
import { Icon } from "@iconify/react";
import { toast } from 'react-toastify';
import { launchCampaign, finishCampaign, getCampaignStats } from "../../api/campaigns";
import { getClientMfaDetails } from "../../api/clientOffice365";
import MfaDetailsTable from "./MfaDetailsTable";
import SmartTooltip from "../SmartTooltip";
import API_BASE_URL from "../../config.js";
import styles from "./MicrosoftSecurityStats.module.css";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { getCampaignDetailCopy, formatCampaignDetail } from "./campaignDetailI18n";
export default function MicrosoftSecurityStats({
  campaign,
  clientId,
  stats: propsStats,
  onCampaignUpdate,
  onStatsUpdate,
  refreshTrigger,
  isSyncing = false,
  copy
}) {
  const locale = useAppLocale();
  const localCopy = useMemo(() => getCampaignDetailCopy(locale), [locale]);
  const detailCopy = copy || localCopy;
  const mfaCopy = detailCopy.mfa;
  const [stats, setStats] = useState(propsStats || null);
  const [loading, setLoading] = useState(!propsStats);
  const [actionLoading, setActionLoading] = useState(false);
  const [syncLoading, setSyncLoading] = useState(false);
  const [lastSyncDate, setLastSyncDate] = useState(null);
  const [mfaUserData, setMfaUserData] = useState([]);
  const [mfaRefreshCallback, setMfaRefreshCallback] = useState(null);
  const [snapshotUsers, setSnapshotUsers] = useState([]);
  const [userFilter, setUserFilter] = useState('all');
  const [methodFilter, setMethodFilter] = useState(null);
  const [hideServiceAccounts, setHideServiceAccounts] = useState(true);
  const handleFilterChange = filterType => {
    setUserFilter(filterType);
    setMethodFilter(null);
  };
  const isLikelyServiceAccountFromMfaUser = user => {
    const name = (user.displayName || '').toString();
    const upn = (user.userPrincipalName || '').toString();
    const combined = `${name} ${upn}`.toLowerCase();
    const patterns = [/aad_/, /msol_/, /sync_/, /svc_/, /service_/, /\$@/, /_srv/, /_service/, /_sync/, /compte de service|service account|compte service/, /bot\./, /bot@/, /connector/, /automation/, /azure ad sync|ad sync|dirsync|aadconnect|dir sync/, /directory synchronization|synchronization service|on-premises/, /healthmailbox|systemmailbox|federatedemail/];
    return patterns.some(p => p.test(combined));
  };
  const effectiveMfaUsers = useMemo(() => {
    if (!Array.isArray(mfaUserData)) return [];
    const allowedUpns = new Set((Array.isArray(snapshotUsers) ? snapshotUsers : []).map(u => (u.userPrincipalName || u.email || '').toString().trim().toLowerCase()).filter(Boolean));
    let scopedUsers = mfaUserData;
    if (allowedUpns.size > 0) {
      scopedUsers = mfaUserData.filter(u => {
        const upn = (u.userPrincipalName || '').toString().trim().toLowerCase();
        return upn && allowedUpns.has(upn);
      });
    }
    if (!hideServiceAccounts) return scopedUsers;
    return scopedUsers.filter(u => !isLikelyServiceAccountFromMfaUser(u));
  }, [mfaUserData, snapshotUsers, hideServiceAccounts]);
  const serviceAccountsCount = useMemo(() => {
    if (!Array.isArray(mfaUserData)) return 0;
    return mfaUserData.filter(u => isLikelyServiceAccountFromMfaUser(u)).length;
  }, [mfaUserData]);
  const EMPTY_AGG_STATS = {
    user_count: 0,
    admin_count: 0,
    user_mfa_count: 0,
    admin_mfa_count: 0,
    user_mfa_percentage: 0,
    admin_mfa_percentage: 0,
    regular_user_count: 0,
    regular_user_mfa_count: 0,
    regular_user_mfa_percentage: 0,
    email_mfa_count: 0,
    software_mfa_count: 0,
    phone_mfa_count: 0,
    authenticator_mfa_count: 0
  };
  const computeAggregatedStatsFromMfaUsers = users => {
    if (!Array.isArray(users) || users.length === 0) {
      return EMPTY_AGG_STATS;
    }
    const IGNORED_METHODS = new Set(['passwordauthenticationmethod', 'windowshelloforbusinessauthenticationmethod']);
    const hasRealMfa = user => {
      const methods = user.mfaMethods || user.mfa_methods || [];
      if (!Array.isArray(methods)) return false;
      return methods.some(m => !IGNORED_METHODS.has(m));
    };
    let userCount = 0;
    let adminCount = 0;
    let userMfaCount = 0;
    let adminMfaCount = 0;
    const methodCounts = {
      emailauthenticationmethod: 0,
      softwareoathauthenticationmethod: 0,
      phoneauthenticationmethod: 0,
      microsoftauthenticatorauthenticationmethod: 0
    };
    users.forEach(user => {
      userCount += 1;
      const isAdmin = user.is_admin === true;
      if (isAdmin) adminCount += 1;
      const hasMfa = hasRealMfa(user) || user.has_mfa === true;
      if (hasMfa) {
        userMfaCount += 1;
        if (isAdmin) {
          adminMfaCount += 1;
        }
      }
      const methods = user.mfaMethods || user.mfa_methods || [];
      if (Array.isArray(methods)) {
        methods.forEach(m => {
          if (IGNORED_METHODS.has(m)) return;
          if (methodCounts.hasOwnProperty(m)) {
            methodCounts[m] += 1;
          }
        });
      }
    });
    const regularUserCount = userCount - adminCount;
    const regularUserMfaCount = userMfaCount - adminMfaCount;
    return {
      user_count: userCount,
      admin_count: adminCount,
      user_mfa_count: userMfaCount,
      admin_mfa_count: adminMfaCount,
      user_mfa_percentage: userCount > 0 ? Math.round(userMfaCount / userCount * 100) : 0,
      admin_mfa_percentage: adminCount > 0 ? Math.round(adminMfaCount / adminCount * 100) : 0,
      regular_user_count: regularUserCount,
      regular_user_mfa_count: regularUserMfaCount,
      regular_user_mfa_percentage: regularUserCount > 0 ? Math.round(regularUserMfaCount / regularUserCount * 100) : 0,
      email_mfa_count: methodCounts.emailauthenticationmethod,
      software_mfa_count: methodCounts.softwareoathauthenticationmethod,
      phone_mfa_count: methodCounts.phoneauthenticationmethod,
      authenticator_mfa_count: methodCounts.microsoftauthenticatorauthenticationmethod
    };
  };
  const currentStats = computeAggregatedStatsFromMfaUsers(effectiveMfaUsers);
  const mfaStats = {
    totalUsers: currentStats.user_count || 0,
    usersWithMfa: currentStats.user_mfa_count || 0,
    totalMfaPercentage: currentStats.user_mfa_percentage || 0,
    adminCount: currentStats.admin_count || 0,
    adminsWithMfa: currentStats.admin_mfa_count || 0,
    adminMfaPercentage: currentStats.admin_mfa_percentage || 0,
    regularUserCount: currentStats.regular_user_count || 0,
    regularUsersWithMfa: currentStats.regular_user_mfa_count || 0,
    userMfaPercentage: currentStats.user_mfa_percentage || 0
  };
  const segmentFilteredUsers = useMemo(() => {
    if (!Array.isArray(effectiveMfaUsers)) return [];
    if (userFilter === 'all') return effectiveMfaUsers;
    if (userFilter === 'admins') return effectiveMfaUsers.filter(u => u.is_admin === true);
    if (userFilter === 'users') return effectiveMfaUsers.filter(u => u.is_admin !== true);
    return effectiveMfaUsers;
  }, [effectiveMfaUsers, userFilter]);
  const segmentStats = computeAggregatedStatsFromMfaUsers(segmentFilteredUsers);
  const mfaMethodStats = {
    emailauthenticationmethod: segmentStats.email_mfa_count || 0,
    softwareoathauthenticationmethod: segmentStats.software_mfa_count || 0,
    phoneauthenticationmethod: segmentStats.phone_mfa_count || 0,
    microsoftauthenticatorauthenticationmethod: segmentStats.authenticator_mfa_count || 0
  };
  const getMethodDisplayInfo = methodType => {
    switch (methodType) {
      case 'microsoftauthenticatorauthenticationmethod':
        return {
          name: mfaCopy.methodAuthenticator,
          icon: 'mdi:cellphone'
        };
      case 'phoneauthenticationmethod':
        return {
          name: mfaCopy.methodCalls,
          icon: 'mdi:phone'
        };
      case 'fido2authenticationmethod':
        return {
          name: 'FIDO2',
          icon: 'mdi:usb'
        };
      case 'softwareoathauthenticationmethod':
        return {
          name: mfaCopy.methodSoftware,
          icon: 'mdi:shield-key'
        };
      case 'temporaryaccesspassauthenticationmethod':
        return {
          name: 'TAP',
          icon: 'mdi:timer-sand'
        };
      case 'emailauthenticationmethod':
        return {
          name: mfaCopy.methodEmail,
          icon: 'mdi:email-outline'
        };
      default:
        return {
          name: methodType.replace('authenticationmethod', '').replace(/([A-Z])/g, ' $1').trim(),
          icon: 'mdi:help-circle'
        };
    }
  };
  const handleSyncComplete = useCallback(refreshFn => {
    setMfaRefreshCallback(() => refreshFn);
  }, []);
  const handleMfaUpdate = useCallback(() => {
    loadMfaUserData();
  }, []);
  useEffect(() => {
    if (propsStats) {
      setStats(propsStats);
      setLoading(false);
    } else if (campaign && clientId) {
      loadStats();
    }
    if (clientId) {
      loadMfaUserData();
      loadSnapshotUsers();
    }
    if (campaign) {
      const storedSyncDate = localStorage.getItem(`campaign_${campaign.id}_last_sync`);
      if (storedSyncDate) {
        setLastSyncDate(new Date(storedSyncDate));
      }
    }
  }, [propsStats, campaign, clientId]);
  useEffect(() => {
    if (refreshTrigger != null && refreshTrigger > 0 && clientId) {
      loadMfaUserData();
      loadSnapshotUsers();
    }
  }, [refreshTrigger]);
  const loadSnapshotUsers = async () => {
    if (!clientId) {
      setSnapshotUsers([]);
      return;
    }
    try {
      const [o365Resp, credResp] = await Promise.all([fetch(`${API_BASE_URL}/clients/${clientId}/o365`, {
        credentials: 'include'
      }), fetch(`${API_BASE_URL}/client-office365/${clientId}`, {
        credentials: 'include'
      }).catch(() => null)]);
      if (!o365Resp.ok) {
        setSnapshotUsers([]);
        return;
      }
      const o365Result = await o365Resp.json();
      if (!o365Result?.success || !Array.isArray(o365Result.data) || o365Result.data.length === 0) {
        setSnapshotUsers([]);
        return;
      }
      let targetTenantId = null;
      if (credResp && credResp.ok) {
        const credResult = await credResp.json();
        targetTenantId = credResult?.credentials?.tenantId || null;
      }
      let tenantRecord = null;
      if (targetTenantId) {
        tenantRecord = o365Result.data.find(t => t?.data?.tenantId === targetTenantId || t?.item_key === targetTenantId);
      }
      if (!tenantRecord) {
        tenantRecord = o365Result.data[0];
      }
      const users = tenantRecord?.data?.users;
      setSnapshotUsers(Array.isArray(users) ? users : []);
    } catch (error) {
      console.error('Error while loading des utilisateurs snapshot O365:', error);
      setSnapshotUsers([]);
    }
  };
  const loadMfaUserData = async () => {
    try {
      const result = await getClientMfaDetails(clientId);
      if (result.success && result.userMfaDetails) {
        setMfaUserData(result.userMfaDetails);
      }
    } catch (error) {
      console.error('Error while loading des data MFA utilisateurs:', error);
    } finally {}
  };
  const loadStats = async () => {
    try {
      setLoading(true);
      const statsData = await getCampaignStats(clientId, campaign.id);
      setStats(statsData);
      if (onStatsUpdate) {
        onStatsUpdate(statsData);
      }
    } catch (error) {
      console.error('Error while loading des statistiques:', error);
      toast.error(mfaCopy.toastStatsError);
    } finally {
      setLoading(false);
    }
  };
  const handleLaunch = async () => {
    try {
      setActionLoading(true);
      await launchCampaign(clientId, campaign.id);
      toast.success(detailCopy.toasts.launched);
      await loadStats();
      if (onCampaignUpdate) {
        onCampaignUpdate();
      }
    } catch (error) {
      console.error('Error lors du lancement:', error);
      toast.error(error.message || detailCopy.toasts.launchError);
    } finally {
      setActionLoading(false);
    }
  };
  const handleFinish = async () => {
    try {
      setActionLoading(true);
      const result = await finishCampaign(clientId, campaign.id);
      toast.success(detailCopy.toasts.finished);
      await loadStats();
      if (onCampaignUpdate) {
        onCampaignUpdate();
      }
    } catch (error) {
      console.error('Error lors de la fin:', error);
      toast.error(error.message || detailCopy.toasts.finishError);
    } finally {
      setActionLoading(false);
    }
  };
  const handleSync = async () => {
    try {
      setSyncLoading(true);
      if (!clientId) {
        toast.error(mfaCopy.toastSyncError);
        return;
      }
      if (typeof window !== 'undefined' && typeof window.__office365SyncTrigger === 'function') {
        try {
          window.__office365SyncTrigger();
        } catch (e) {
          console.error('Error syncing via the O365 module:', e);
        }
      }
      const headers = {
        'Content-Type': 'application/json'
      };
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
      const period = 'D30';
      const response = await fetch(`${API_BASE_URL}/office365/sync-all?clientId=${clientId}&period=${period}&startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`, {
        method: 'GET',
        headers,
        credentials: 'include'
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.success) {
        throw new Error(result.error || `HTTP error ${response.status}`);
      }
      const now = new Date();
      setLastSyncDate(now);
      localStorage.setItem(`campaign_${campaign.id}_last_sync`, now.toISOString());
      await loadStats();
      await loadMfaUserData();
      if (mfaRefreshCallback) {
        mfaRefreshCallback();
      }
      toast.success(mfaCopy.toastSyncOk);
      if (onCampaignUpdate) {
        onCampaignUpdate();
      }
    } catch (error) {
      console.error('Error during sync:', error);
      toast.error(error.message || mfaCopy.toastSyncError);
    } finally {
      setSyncLoading(false);
    }
  };
  if (loading) {
    return <div className={styles.loadingState}>
        <Icon icon="mdi:loading" className={styles.loadingIcon} />
        <p>{mfaCopy.loading}</p>
      </div>;
  }
  if (!stats) {
    return null;
  }
  const canLaunch = campaign.status === 'en_preparation' && !stats.hasSnapshots;
  const canFinish = campaign.status === 'active' && stats.start && !stats.end;
  const isFinished = campaign.status === 'inactive' && stats.start && stats.end;
  if (isSyncing) {
    return <div className={styles.syncSkeleton}>
        <div className={`${styles.skeletonStatsCards} ${styles.skeletonStatsCardsSegment}`}>
          {[1, 2, 3].map(i => <div key={i} className={styles.skeletonStatCard}>
              <div className={`${styles.skeletonShimmer} ${styles.skeletonStatCardIcon}`} />
              <div className={styles.skeletonStatCardContent}>
                <div className={`${styles.skeletonShimmer} ${styles.skeletonStatCardValue}`} />
                <div className={`${styles.skeletonShimmer} ${styles.skeletonStatCardLabel}`} />
              </div>
            </div>)}
        </div>
        <div className={styles.skeletonStatsCards}>
          {[1, 2, 3, 4].map(i => <div key={i} className={styles.skeletonStatCard}>
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
      </div>;
  }
  return <>
      {}
      {!stats || !stats.start && !stats.current ? <div className={styles.noSyncMessage}>
          <Icon icon="mdi:sync" className={styles.noSyncIcon} />
          <h4>{mfaCopy.syncEmptyTitle}</h4>
          <p>{mfaCopy.syncEmptyText}</p>
        </div> : <div className={styles.currentStatsSection}>
          {}
          <div className={`${styles.statsCards} ${styles.statsCardsSegment}`} style={{
        marginBottom: '1rem'
      }}>
            <SmartTooltip as="span" content={mfaCopy.filterAll}>
              <button type="button" className={`${styles.statCard} ${styles.statCardClickable} ${userFilter === 'all' ? styles.statCardActive : ''}`} onClick={() => handleFilterChange('all')}>
                <div className={styles.statCardIcon}>
                  <Icon icon="mdi:account-multiple" />
                </div>
                <div className={styles.statCardContent}>
                  <div className={styles.statCardLabel}>{mfaCopy.totalUsers}</div>
                  <div className={styles.statCardValue}>{currentStats.user_count || 0}</div>
                  <div className={styles.statCardSub}>
                    {formatCampaignDetail(mfaCopy.mfaLine, {
                  count: currentStats.user_mfa_count || 0,
                  rate: currentStats.user_mfa_percentage || 0
                })}
                  </div>
                </div>
              </button>
            </SmartTooltip>
            <SmartTooltip as="span" content={mfaCopy.filterAdmins}>
              <button type="button" className={`${styles.statCard} ${styles.statCardClickable} ${userFilter === 'admins' ? styles.statCardActive : ''}`} onClick={() => handleFilterChange('admins')}>
                <div className={styles.statCardIcon} style={{
              color: '#3b82f6'
            }}>
                  <Icon icon="mdi:shield-account" />
                </div>
                <div className={styles.statCardContent}>
                  <div className={styles.statCardLabel}>{mfaCopy.admin}</div>
                  <div className={styles.statCardValue} style={{
                color: '#3b82f6'
              }}>{currentStats.admin_count || 0}</div>
                  <div className={styles.statCardSub}>
                    {formatCampaignDetail(mfaCopy.mfaLine, {
                  count: currentStats.admin_mfa_count || 0,
                  rate: currentStats.admin_mfa_percentage || 0
                })}
                  </div>
                </div>
              </button>
            </SmartTooltip>
            <SmartTooltip as="span" content={mfaCopy.filterUsers}>
              <button type="button" className={`${styles.statCard} ${styles.statCardClickable} ${userFilter === 'users' ? styles.statCardActive : ''}`} onClick={() => handleFilterChange('users')}>
                <div className={styles.statCardIcon}>
                  <Icon icon="mdi:account-outline" />
                </div>
                <div className={styles.statCardContent}>
                  <div className={styles.statCardLabel}>{mfaCopy.nonAdmin}</div>
                  <div className={styles.statCardValue}>{currentStats.regular_user_count || 0}</div>
                  <div className={styles.statCardSub}>
                    {formatCampaignDetail(mfaCopy.mfaLine, {
                  count: currentStats.regular_user_mfa_count || 0,
                  rate: currentStats.regular_user_mfa_percentage || 0
                })}
                  </div>
                </div>
              </button>
            </SmartTooltip>
          </div>

          {}
          {mfaMethodStats && Object.keys(mfaMethodStats).length > 0 && <div className={`${styles.statsCards} ${styles.statsCardsMfaMethods}`}>
              {[['phoneauthenticationmethod', mfaMethodStats['phoneauthenticationmethod']], ['emailauthenticationmethod', mfaMethodStats['emailauthenticationmethod']], ['microsoftauthenticatorauthenticationmethod', mfaMethodStats['microsoftauthenticatorauthenticationmethod']], ['softwareoathauthenticationmethod', mfaMethodStats['softwareoathauthenticationmethod']]].filter(([methodType, count]) => count !== undefined).map(([methodType, count]) => {
          const segmentTotal = segmentStats?.user_count || 0;
          const percentage = segmentTotal > 0 ? Math.round(count / segmentTotal * 100) : 0;
          return [methodType, count, percentage];
        }).map(([methodType, count, percentage]) => {
          const methodInfo = getMethodDisplayInfo(methodType);
          const isActive = methodFilter === methodType;
          let label = '';
          switch (methodType) {
            case 'phoneauthenticationmethod':
              label = mfaCopy.methodCalls;
              break;
            case 'emailauthenticationmethod':
              label = mfaCopy.methodEmail;
              break;
            case 'microsoftauthenticatorauthenticationmethod':
              label = mfaCopy.methodAuthenticator;
              break;
            case 'softwareoathauthenticationmethod':
              label = mfaCopy.methodSoftware;
              break;
            default:
              label = methodInfo.name;
          }
          return <SmartTooltip key={methodType} as="span" content={label}>
                      <button type="button" className={`${styles.statCard} ${styles.statCardClickable} ${isActive ? styles.statCardActive : ''}`} onClick={() => setMethodFilter(prev => prev === methodType ? null : methodType)}>
                        <div className={styles.statCardIcon}>
                          <Icon icon={methodInfo.icon} />
                        </div>
                        <div className={styles.statCardContent}>
                          <div className={styles.statCardLabel}>{label}</div>
                          <div className={styles.statCardValue}>{count}</div>
                          <div className={styles.statCardSub}>{percentage}{mfaCopy.ofUsers}</div>
                        </div>
                      </button>
                    </SmartTooltip>;
        })}
            </div>}
        </div>}

      {}
      <MfaDetailsTable clientId={clientId} allowedUsers={snapshotUsers} showCard={false} userFilter={userFilter} methodFilter={methodFilter} onSyncComplete={handleSyncComplete} onUpdate={handleMfaUpdate} hideServiceAccounts={hideServiceAccounts} onHideServiceAccountsChange={setHideServiceAccounts} copy={detailCopy} />
    </>;
}
