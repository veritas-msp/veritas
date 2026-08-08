import React, { useMemo, useState } from "react";
import { useTheme } from "../../../hooks/useTheme";
import styles from "./O365Summary.module.css";
import o365Styles from "../Modules/O365.module.css";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from "recharts";
const licenseNameMapping = {
  'ENTERPRISEPACK': 'Microsoft 365 E3',
  'ENTERPRISEPREMIUM': 'Microsoft 365 E5',
  'ENTERPRISEWITHSCAL': 'Microsoft 365 E3 with telephony',
  'M365EDU_A3_FACULTY': 'Microsoft 365 A3 (Enseignants)',
  'M365EDU_A3_STUDENT': 'Microsoft 365 A3 (Students)',
  'M365EDU_A5_FACULTY': 'Microsoft 365 A5 (Enseignants)',
  'M365EDU_A5_STUDENT': 'Microsoft 365 A5 (Students)',
  'O365_BUSINESS': 'Microsoft 365 Business Basic',
  'O365_BUSINESS_ESSENTIALS': 'Microsoft 365 Business Essentials',
  'O365_BUSINESS_PREMIUM': 'Microsoft 365 Business Premium',
  'SMB_BUSINESS': 'Microsoft 365 Business Standard',
  'SMB_BUSINESS_ESSENTIALS': 'Microsoft 365 Business Essentials',
  'SMB_BUSINESS_PREMIUM': 'Microsoft 365 Business Premium',
  'EXCHANGESTANDARD': 'Exchange Online Plan 1',
  'EXCHANGEENTERPRISE': 'Exchange Online Plan 2',
  'EXCHANGEARCHIVE_ADDON': 'Exchange Online Archiving',
  'EXCHANGEDESKLESS': 'Exchange Online Kiosk',
  'SHAREPOINTSTANDARD': 'SharePoint Online Plan 1',
  'SHAREPOINTENTERPRISE': 'SharePoint Online Plan 2',
  'SHAREPOINTWAC': 'Office for the web',
  'TEAMS_EXPLORATORY': 'Microsoft Teams Exploratory',
  'TEAMS1': 'Microsoft Teams (Essentiel)',
  'TEAMS_COMMERCIAL': 'Microsoft Teams Commercial',
  'TEAMS_EDU': 'Microsoft Teams for Education',
  'AAD_PREMIUM': 'Azure AD Premium P1',
  'AAD_PREMIUM_P2': 'Azure AD Premium P2',
  'AAD_BASIC': 'Azure AD Basic',
  'OFFICESUBSCRIPTION': 'Microsoft 365 Apps for enterprise',
  'OFFICE_PRO_PLUS_SUBSCRIPTION_SMBIZ': 'Office 365 ProPlus',
  'OFFICE365_MIDSIZE_BUSINESS': 'Office 365 Midsize Business',
  'RMS_S_ENTERPRISE': 'Azure Rights Management',
  'RMS_S_PREMIUM': 'Azure Information Protection Premium P1',
  'RMS_S_PREMIUM2': 'Azure Information Protection Premium P2',
  'INTUNE_A': 'Microsoft Intune',
  'INTUNE_A_VL': 'Microsoft Intune (Volume)',
  'VISIOCLIENT': 'Visio Plan 1',
  'VISIOONLINE_PLAN1': 'Visio Plan 1',
  'VISIOONLINE_PLAN2': 'Visio Plan 2',
  'PROJECTPROFESSIONAL': 'Project Plan 3',
  'PROJECTONLINE_PLAN_1': 'Project Plan 1',
  'PROJECTONLINE_PLAN_2': 'Project Plan 2',
  'PROJECTPREMIUM': 'Project Plan 5',
  'POWER_BI_STANDARD': 'Power BI (Gratuit)',
  'POWER_BI_PRO': 'Power BI Pro',
  'POWER_BI_PREMIUM': 'Power BI Premium',
  'FLOW_FREE': 'Power Automate (Gratuit)',
  'POWERAPPS_VIRAL': 'Power Apps (Gratuit)',
  'POWERAPPS_PER_USER': 'Power Apps per user',
  'STREAM': 'Microsoft Stream',
  'YAMMER_ENTERPRISE': 'Yammer Enterprise',
  'YAMMER_MIDSIZE': 'Yammer',
  'ENTERPRISEPACK_GOV': 'Microsoft 365 E3 (Gouvernement)',
  'ENTERPRISEPREMIUM_GOV': 'Microsoft 365 E5 (Gouvernement)',
  'STANDARDWOFFPACK_STUDENT': 'Office 365 Education (Students)',
  'STANDARDWOFFPACK_FACULTY': 'Office 365 Education (Faculty)',
  'STANDARDWOFFPACK_IW_FACULTY': 'Office 365 Education Plus (Faculty)',
  'STANDARDWOFFPACK_IW_STUDENT': 'Office 365 Education Plus (Students)',
  'DESKLESSPACK': 'Office 365 Kiosk',
  'DESKLESSWOFFPACK': 'Office 365 Kiosk',
  'WACSHAREPOINTSTD': 'Office for the web with SharePoint',
  'WACSHAREPOINTENT': 'Office for the web with SharePoint (Enterprise)'
};
const priorityLevelLabelMap = {
  3: "High",
  2: "Moyenne",
  1: "Faible",
  0: "Unclassified"
};
const priorityColorMap = {
  "High": "#ef4444",
  "Moyenne": "#f59e0b",
  "Faible": "#6b7280",
  "Unclassified": "#9ca3af"
};
const computePriorityLevel = rec => {
  const rank = typeof rec?.rank === 'number' ? rec.rank : null;
  const maxScore = typeof rec?.maxScore === 'number' ? rec.maxScore : 0;
  if (rec?.priorityLevel !== undefined && rec.priorityLevel !== null) {
    return rec.priorityLevel;
  }
  if (rank !== null) {
    if (rank <= 20) return 3;
    if (rank <= 60) return 2;
    if (rank > 0) return 1;
  }
  if (maxScore >= 15) return 3;
  if (maxScore >= 8) return 2;
  if (maxScore > 0) return 1;
  return 0;
};
const getPriorityLabelFromLevel = level => {
  return priorityLevelLabelMap[level] || "Unclassified";
};
const getPriorityColorValue = label => {
  return priorityColorMap[label] || priorityColorMap["Unclassified"];
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
const formatBytes = bytes => {
  if (!bytes || bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i];
};
const formatDate = dateString => {
  if (!dateString) return "N/A";
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  } catch {
    return dateString;
  }
};
const O365Summary = ({
  data,
  config
}) => {
  const {
    theme
  } = useTheme();
  const o365 = data || {};
  const emailActivityViewMode = 'day';
  const [recommendationSort, setRecommendationSort] = useState({
    column: 'points',
    direction: 'desc'
  });
  const apiData = o365?.apiData || null;
  const exchangeData = o365?.exchangeData || null;
  const teamsData = o365?.teamsData || null;
  const onedriveData = o365?.onedriveData || null;
  const sharepointData = o365?.sharepointData || null;
  const securityData = o365?.securityData || null;
  const connectionStatus = o365?.connectionStatus || null;
  const manualSecurityScore = o365?.manualSecurityScore ?? null;
  const dashboardMetrics = useMemo(() => {
    if (!apiData) return null;
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
  }, [apiData]);
  const securityScore = useMemo(() => {
    if (!securityData) return null;
    const identitySecureScoreData = securityData?.secureScore || null;
    const identityScoreCurrent = identitySecureScoreData?.currentScore ?? null;
    const identityScoreMax = identitySecureScoreData?.maxScore ?? null;
    const identityScorePercentageCalculated = identitySecureScoreData?.percentage ?? (identityScoreCurrent !== null && identityScoreMax ? Math.round(identityScoreCurrent / identityScoreMax * 1000) / 10 : null);
    const identityScorePercentage = manualSecurityScore !== null ? manualSecurityScore : identityScorePercentageCalculated;
    const totalUsers = apiData?.users?.length || 0;
    const usersWithMFA = securityData?.mfa?.usersWithMFA || 0;
    const mfaRate = totalUsers > 0 ? usersWithMFA / totalUsers * 100 : 0;
    const totalAdmins = securityData?.adminStats?.total || 0;
    const adminsWithMFA = securityData?.adminStats?.withMFA || 0;
    const adminMfaRate = totalAdmins > 0 ? adminsWithMFA / totalAdmins * 100 : 100;
    return {
      score: identityScorePercentage,
      currentScore: identityScoreCurrent,
      maxScore: identityScoreMax,
      mfaRate,
      adminMfaRate
    };
  }, [securityData, apiData, manualSecurityScore]);
  const licenseMetrics = useMemo(() => {
    if (!apiData) return null;
    const licences = apiData?.licences || [];
    const validLicenses = licences.filter(lic => {
      const total = lic.total || 0;
      return total < 10000 && total > 0;
    });
    const totalLicenses = validLicenses.reduce((sum, lic) => sum + (lic.total || 0), 0);
    const usedLicenses = validLicenses.reduce((sum, lic) => sum + (lic.utilisees || 0), 0);
    return {
      totalLicenses,
      usedLicenses,
      licences: validLicenses
    };
  }, [apiData]);
  const usersMetrics = useMemo(() => {
    if (!apiData?.users) return null;
    const users = apiData.users;
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
    const blockedUsers = users.filter(u => u.accountEnabled === false).length;
    const inactiveUsers90 = users.filter(u => {
      const lastLogin = u.lastLoginDate ? new Date(u.lastLoginDate) : null;
      return !lastLogin || lastLogin < period90Days;
    }).length;
    const adoptionRate = users.length > 0 ? Math.round(activeUsers30 / users.length * 100) : 0;
    return {
      activeUsers30,
      activeUsers90,
      blockedUsers,
      inactiveUsers90,
      adoptionRate,
      users
    };
  }, [apiData]);
  const sortedRecommendations = useMemo(() => {
    if (!securityData?.secureScoreRecommendations) return [];
    const recommendationsCopy = [...securityData.secureScoreRecommendations];
    return recommendationsCopy.sort((a, b) => {
      const pointsA = a?.maxScore ?? 0;
      const pointsB = b?.maxScore ?? 0;
      const priorityA = computePriorityLevel(a);
      const priorityB = computePriorityLevel(b);
      const direction = recommendationSort.direction === 'desc';
      if (recommendationSort.column === 'priority') {
        if (priorityA !== priorityB) {
          return direction ? priorityB - priorityA : priorityA - priorityB;
        }
        if (pointsA !== pointsB) {
          return direction ? pointsB - pointsA : pointsA - pointsB;
        }
      } else {
        if (pointsA !== pointsB) {
          return direction ? pointsB - pointsA : pointsA - pointsB;
        }
        if (priorityA !== priorityB) {
          return direction ? priorityB - priorityA : priorityA - priorityB;
        }
      }
      const rankA = a?.rank ?? Number.MAX_SAFE_INTEGER;
      const rankB = b?.rank ?? Number.MAX_SAFE_INTEGER;
      return rankA - rankB;
    });
  }, [securityData?.secureScoreRecommendations, recommendationSort]);
  const handleRecommendationSort = column => {
    setRecommendationSort(prev => {
      if (prev.column === column) {
        return {
          column,
          direction: prev.direction === 'desc' ? 'asc' : 'desc'
        };
      }
      return {
        column,
        direction: 'desc'
      };
    });
  };
  const renderSortIcon = column => {
    const iconStyle = {
      marginLeft: '0.35rem',
      fontSize: '0.75rem'
    };
    if (recommendationSort.column !== column) {
      return <span style={iconStyle}>⇅</span>;
    }
    return recommendationSort.direction === 'desc' ? <span style={iconStyle}>↓</span> : <span style={iconStyle}>↑</span>;
  };
  const getPriorityLabel = rec => {
    if (rec?.priorityLabel) return rec.priorityLabel;
    return getPriorityLabelFromLevel(computePriorityLevel(rec));
  };
  const sharepointSites = sharepointData?.sites || [];
  const sharepointTotalSites = sharepointSites.length || sharepointData?.stats?.totalSites || 0;
  const sharepointActiveSites = sharepointSites.length > 0 ? sharepointSites.filter(site => site.isActive).length : sharepointData?.stats?.activeSites || 0;
  const sharepointInactiveSites = Math.max(0, sharepointTotalSites - sharepointActiveSites);
  const hasData = apiData || exchangeData || teamsData || onedriveData || sharepointData || securityData;
  if (!hasData) {
    return <div className={`${styles.container} ${theme === "dark" ? styles.dark : ""}`}>
        <div className={styles.emptyState}>
          <p>No synchronized data</p>
        </div>
      </div>;
  }
  return <div className={`${styles.container} ${theme === "dark" ? styles.dark : ""}`}>
      <div className={styles.moduleCard}>
                {}
                {licenseMetrics && licenseMetrics.licences && licenseMetrics.licences.length > 0 && <div>
                        <h4 className={styles.sectionTitle}>License information</h4>
                        
                        {}
                        <div style={{
          marginBottom: '1.5rem',
          padding: '1rem',
          borderRadius: '8px',
          background: theme === 'dark' ? '#1e1e3f' : '#f9fafb',
          border: `1px solid ${theme === 'dark' ? '#4a4a6a' : '#e5e7eb'}`
        }}>
                            <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem'
          }}>
                                <div>
                                    <div style={{
                fontSize: '0.75rem',
                color: theme === 'dark' ? '#9ca3af' : '#6b7280',
                marginBottom: '0.25rem'
              }}>
                                        Total licences
                            </div>
                                    <div style={{
                fontSize: '1.125rem',
                fontWeight: '600',
                color: theme === 'dark' ? '#f9fafb' : '#111827'
              }}>
                                        {licenseMetrics.totalLicenses.toLocaleString()}
                            </div>
                        </div>
                                <div>
                                    <div style={{
                fontSize: '0.75rem',
                color: theme === 'dark' ? '#9ca3af' : '#6b7280',
                marginBottom: '0.25rem'
              }}>
                                        Used licenses
                                    </div>
                                    <div style={{
                fontSize: '1.125rem',
                fontWeight: '600',
                color: '#f59e0b'
              }}>
                                        {licenseMetrics.usedLicenses.toLocaleString()}
                                    </div>
                                </div>
                                <div>
                                    <div style={{
                fontSize: '0.75rem',
                color: theme === 'dark' ? '#9ca3af' : '#6b7280',
                marginBottom: '0.25rem'
              }}>
                                        Taux d'utilisation global
                                    </div>
                                    <div style={{
                fontSize: '1.125rem',
                fontWeight: '600',
                color: theme === 'dark' ? '#f9fafb' : '#111827'
              }}>
                                        {licenseMetrics.totalLicenses > 0 ? Math.round(licenseMetrics.usedLicenses / licenseMetrics.totalLicenses * 100) : 0}%
                                    </div>
                                </div>
                                <div>
                                    <div style={{
                fontSize: '0.75rem',
                color: theme === 'dark' ? '#9ca3af' : '#6b7280',
                marginBottom: '0.25rem'
              }}>
                                        Available licenses
                                    </div>
                                    <div style={{
                fontSize: '1.125rem',
                fontWeight: '600',
                color: theme === 'dark' ? '#f9fafb' : '#111827'
              }}>
                                        {(licenseMetrics.totalLicenses - licenseMetrics.usedLicenses).toLocaleString()}
                                    </div>
                </div>
              </div>
            </div>

                        {}
                        <div className={o365Styles.licensesTableContainer}>
                            <table className={o365Styles.licensesTable}>
                                <thead>
                                    <tr>
                                        <th>License type</th>
                                        <th>Total</th>
                                        <th>Used</th>
                                        <th>Availables</th>
                                        <th>Usage rate</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {licenseMetrics.licences.sort((a, b) => (b.total || 0) - (a.total || 0)).map((lic, idx) => {
                const total = lic.total || 0;
                const used = lic.utilisees || 0;
                const available = lic.disponibles || 0;
                const usageRate = total > 0 ? Math.round(used / total * 100) : 0;
                const expirationDate = lic.expirationDate ? new Date(lic.expirationDate) : null;
                const now = new Date();
                const daysUntilExpiry = expirationDate ? (expirationDate - now) / (1000 * 60 * 60 * 24) : null;
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
                } else if (usageRate >= 75) {
                  status = 'normal';
                  statusText = 'Normal';
                  statusColor = '#10b981';
                } else if (usageRate >= 50) {
                  status = 'normal';
                  statusText = 'Normal';
                  statusColor = '#10b981';
                } else {
                  status = 'critical';
                  statusText = 'Gaspillage';
                  statusColor = '#ef4444';
                }
                if (expirationDate && daysUntilExpiry !== null) {
                  if (daysUntilExpiry > 0 && daysUntilExpiry <= 90) {
                    status = 'expiring';
                    statusText = 'Expires soon';
                    statusColor = '#ef4444';
                  } else if (daysUntilExpiry <= 0) {
                    status = 'expired';
                    statusText = 'Expired';
                    statusColor = '#dc2626';
                  }
                }
                const rowColor = statusColor;
                return <tr key={idx}>
                                                    <td>
                                                        <div style={{
                      fontWeight: '500'
                    }}>
                                                            {getLicenseDisplayName(lic.nom || lic.displayName)}
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <span style={{
                      fontWeight: '500'
                    }}>
                                                            {total.toLocaleString()}
                    </span>
                                                    </td>
                                                    <td>
                                                        <span style={{
                      color: rowColor,
                      fontWeight: '500'
                    }}>
                                                            {used.toLocaleString()}
                    </span>
                                                    </td>
                                                    <td>
                                                        <span style={{
                      fontWeight: '500'
                    }}>
                                                            {available.toLocaleString()}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      minWidth: '120px'
                    }}>
                                                            <div style={{
                        flex: 1,
                        height: '8px',
                        background: theme === 'dark' ? '#4a4a6a' : '#e5e7eb',
                        borderRadius: '4px',
                        overflow: 'hidden'
                      }}>
                                                                <div style={{
                          width: `${usageRate}%`,
                          height: '100%',
                          background: rowColor,
                          transition: 'width 0.3s ease'
                        }} />
                  </div>
                                                            <span style={{
                        minWidth: '45px',
                        textAlign: 'right',
                        fontSize: '0.8125rem',
                        fontWeight: '600',
                        color: rowColor
                      }}>
                                                                {usageRate}%
                                                            </span>
              </div>
                                                    </td>
                                                    <td>
                                                        <span style={{
                      padding: '0.25rem 0.5rem',
                      borderRadius: '4px',
                      fontSize: '0.75rem',
                      backgroundColor: status === 'optimal' ? '#d1fae5' : status === 'normal' ? '#d1fae5' : status === 'warning' ? '#fef3c7' : status === 'critical' ? '#fee2e2' : status === 'expired' || status === 'expiring' ? '#fee2e2' : '#d1fae5',
                      color: status === 'optimal' ? '#059669' : status === 'normal' ? '#059669' : status === 'warning' ? '#d97706' : status === 'critical' ? '#dc2626' : status === 'expired' || status === 'expiring' ? '#dc2626' : '#059669',
                      fontWeight: '500',
                      display: 'inline-block'
                    }}>
                                                            {statusText}
                                                        </span>
                                                    </td>
                                                </tr>;
              })}
                                </tbody>
                            </table>
            </div>
        </div>}

                {}
                {usersMetrics && usersMetrics.users && usersMetrics.users.length > 0 && <div>
                        <h4 className={styles.sectionTitle}>Users</h4>
                        
                        {}
                        <div style={{
          marginBottom: '1.5rem',
          padding: '1rem',
          borderRadius: '8px',
          background: theme === 'dark' ? '#1e1e3f' : '#f9fafb',
          border: `1px solid ${theme === 'dark' ? '#4a4a6a' : '#e5e7eb'}`
        }}>
                            <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem'
          }}>
                                <div>
                                    <div style={{
                fontSize: '0.75rem',
                color: theme === 'dark' ? '#9ca3af' : '#6b7280',
                marginBottom: '0.25rem'
              }}>
                                        Total users
                  </div>
                                    <div style={{
                fontSize: '1.125rem',
                fontWeight: '600',
                color: theme === 'dark' ? '#f9fafb' : '#111827'
              }}>
                                        {usersMetrics.users.length.toLocaleString()}
                                    </div>
                                </div>
                                <div>
                                    <div style={{
                fontSize: '0.75rem',
                color: theme === 'dark' ? '#9ca3af' : '#6b7280',
                marginBottom: '0.25rem'
              }}>
                                        Users actifs (30j)
                                    </div>
                                    <div style={{
                fontSize: '1.125rem',
                fontWeight: '600',
                color: '#10b981'
              }}>
                                        {usersMetrics.activeUsers30.toLocaleString()}
                                    </div>
                                </div>
                                <div>
                                    <div style={{
                fontSize: '0.75rem',
                color: theme === 'dark' ? '#9ca3af' : '#6b7280',
                marginBottom: '0.25rem'
              }}>
                                        Users actifs (90j)
                                    </div>
                                    <div style={{
                fontSize: '1.125rem',
                fontWeight: '600',
                color: '#10b981'
              }}>
                                        {usersMetrics.activeUsers90.toLocaleString()}
                                    </div>
                                </div>
                                <div>
                                    <div style={{
                fontSize: '0.75rem',
                color: theme === 'dark' ? '#9ca3af' : '#6b7280',
                marginBottom: '0.25rem'
              }}>
                                        Taux d'adoption
                                    </div>
                                    <div style={{
                fontSize: '1.125rem',
                fontWeight: '600',
                color: theme === 'dark' ? '#f9fafb' : '#111827'
              }}>
                                        {usersMetrics.adoptionRate}%
                                    </div>
                                </div>
                                {usersMetrics.blockedUsers > 0 && <div>
                                        <div style={{
                fontSize: '0.75rem',
                color: theme === 'dark' ? '#9ca3af' : '#6b7280',
                marginBottom: '0.25rem'
              }}>
                                            Blocked users
                                        </div>
                                        <div style={{
                fontSize: '1.125rem',
                fontWeight: '600',
                color: '#ef4444'
              }}>
                                            {usersMetrics.blockedUsers}
                </div>
              </div>}
                                {usersMetrics.inactiveUsers90 > 0 && <div>
                                        <div style={{
                fontSize: '0.75rem',
                color: theme === 'dark' ? '#9ca3af' : '#6b7280',
                marginBottom: '0.25rem'
              }}>
                                            Users inactifs (&gt;90j)
                                        </div>
                                        <div style={{
                fontSize: '1.125rem',
                fontWeight: '600',
                color: '#f59e0b'
              }}>
                                            {usersMetrics.inactiveUsers90}
                                        </div>
                                    </div>}
          </div>
        </div>

                        {}
                    </div>}
                
                {}
                {exchangeData && exchangeData.success !== false && <div>
                        <h4 className={styles.sectionTitle}>Exchange Online / Outlook</h4>
                        
                        {!exchangeData.emailActivity || exchangeData.emailActivity.sent === 0 && exchangeData.emailActivity.received === 0 && exchangeData.emailActivity.read === 0 ? <div style={{
          textAlign: 'center',
          padding: '2rem',
          color: theme === 'dark' ? '#9ca3af' : '#6b7280',
          fontSize: '0.875rem'
        }}>
                                N/A - Data not synced
                            </div> : <>
                                {}
                                <div className={o365Styles.metricsRow}>
                                    <div className={o365Styles.metricItem}>
                                        <div className={o365Styles.metricLabel}>Emails sent</div>
                                        <div className={o365Styles.metricValue} style={{
                color: '#3b82f6'
              }}>
                                            {exchangeData.emailActivity?.sent !== undefined ? exchangeData.emailActivity.sent.toLocaleString() : 'N/A'}
                                        </div>
                                        {exchangeData.emailActivity?.averages?.sent !== undefined && <div style={{
                fontSize: '0.75rem',
                color: theme === 'dark' ? '#9ca3af' : '#6b7280',
                marginTop: '0.25rem'
              }}>
                                                Average: {exchangeData.emailActivity.averages.sent.toLocaleString()}/day
          </div>}
                                    </div>
                                    <div className={o365Styles.metricItem}>
                                        <div className={o365Styles.metricLabel}>Emails received</div>
                                        <div className={o365Styles.metricValue} style={{
                color: '#10b981'
              }}>
                                            {exchangeData.emailActivity?.received !== undefined ? exchangeData.emailActivity.received.toLocaleString() : 'N/A'}
                                        </div>
                                        {exchangeData.emailActivity?.averages?.received !== undefined && <div style={{
                fontSize: '0.75rem',
                color: theme === 'dark' ? '#9ca3af' : '#6b7280',
                marginTop: '0.25rem'
              }}>
                                                Average: {exchangeData.emailActivity.averages.received.toLocaleString()}/day
                                            </div>}
                                    </div>
                                    <div className={o365Styles.metricItem}>
                                        <div className={o365Styles.metricLabel}>Emails lus</div>
                                        <div className={o365Styles.metricValue} style={{
                color: '#8b5cf6'
              }}>
                                            {exchangeData.emailActivity?.read !== undefined ? exchangeData.emailActivity.read.toLocaleString() : 'N/A'}
                                        </div>
                                        {exchangeData.emailActivity?.averages?.read !== undefined && <div style={{
                fontSize: '0.75rem',
                color: theme === 'dark' ? '#9ca3af' : '#6b7280',
                marginTop: '0.25rem'
              }}>
                                                Average: {exchangeData.emailActivity.averages.read.toLocaleString()}/day
                                            </div>}
                                    </div>
                                    <div className={o365Styles.metricItem}>
                                        <div className={o365Styles.metricLabel}>Read rate</div>
                                        <div className={o365Styles.metricValue} style={{
                color: '#f59e0b'
              }}>
                                            {exchangeData.emailActivity?.readRate !== undefined ? `${exchangeData.emailActivity.readRate.toFixed(1)}%` : 'N/A'}
                                        </div>
                                        {exchangeData.emailActivity?.read !== undefined && exchangeData.emailActivity?.received !== undefined && <div style={{
                fontSize: '0.75rem',
                color: theme === 'dark' ? '#9ca3af' : '#6b7280',
                marginTop: '0.25rem'
              }}>
                                                {exchangeData.emailActivity.read.toLocaleString()} / {exchangeData.emailActivity.received.toLocaleString()}
              </div>}
          </div>
        </div>

                                {}
                                {exchangeData.emailActivity?.dailyActivity && exchangeData.emailActivity.dailyActivity.length > 0 && <>
                                        <div style={{
              marginBottom: '1rem'
            }}>
                                            <h5 style={{
                margin: 0,
                fontSize: '0.9rem',
                fontWeight: '600'
              }}>
                                                Daily email activity
                                            </h5>
                                        </div>
                                        <div style={{
              marginBottom: '1.5rem',
              padding: '1rem',
              borderRadius: '8px',
              background: theme === 'dark' ? '#1e1e3f' : '#ffffff',
              border: `1px solid ${theme === 'dark' ? '#4a4a6a' : '#e5e7eb'}`
            }}>
                                            <ResponsiveContainer width="100%" height={400}>
                                                <LineChart data={exchangeData.emailActivity.dailyActivity.map(day => ({
                  date: new Date(day.date).toLocaleDateString('en-US', {
                    day: '2-digit',
                    month: '2-digit'
                  }),
                  'Sent': day.sent,
                  'Received': day.received,
                  'Lus': day.read
                }))} margin={{
                  top: 20,
                  right: 30,
                  left: 20,
                  bottom: 60
                }}>
                                                    <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#2d2d4f' : '#e5e7eb'} />
                                                    <XAxis dataKey="date" angle={-45} textAnchor="end" height={80} tick={{
                    fill: theme === 'dark' ? '#9ca3af' : '#6b7280',
                    fontSize: 12
                  }} />
                                                    <YAxis tick={{
                    fill: theme === 'dark' ? '#9ca3af' : '#6b7280',
                    fontSize: 12
                  }} />
                                                    <Tooltip contentStyle={{
                    background: theme === 'dark' ? '#1e1e3f' : '#ffffff',
                    border: `1px solid ${theme === 'dark' ? '#4a4a6a' : '#e5e7eb'}`,
                    borderRadius: '8px',
                    color: theme === 'dark' ? '#f9fafb' : '#111827'
                  }} />
                                                    <Legend wrapperStyle={{
                    paddingTop: '20px'
                  }} iconType="line" />
                                                    <Line type="monotone" dataKey="Sent" stroke="#3b82f6" strokeWidth={2} dot={false} />
                                                    <Line type="monotone" dataKey="Received" stroke="#10b981" strokeWidth={2} dot={false} />
                                                    <Line type="monotone" dataKey="Lus" stroke="#8b5cf6" strokeWidth={2} dot={false} />
                                                </LineChart>
                                            </ResponsiveContainer>
                  </div>
                                    </>}

                                {}
                                <div style={{
            marginTop: '1.5rem'
          }}>
                                    <h5 style={{
              marginBottom: '0.75rem',
              fontSize: '0.9rem',
              fontWeight: '600'
            }}>
                                        Mailboxes
                                    </h5>
                                    <div className={o365Styles.metricsRow}>
                                        <div className={o365Styles.metricItem}>
                                            <div className={o365Styles.metricLabel}>Total</div>
                                            <div className={o365Styles.metricValue}>{exchangeData.Mailboxes?.total !== undefined ? exchangeData.Mailboxes.total : 'N/A'}</div>
                </div>
                                        <div className={o365Styles.metricItem}>
                                            <div className={o365Styles.metricLabel}>Total space used</div>
                                            <div className={o365Styles.metricValue}>{exchangeData.Mailboxes?.totalSize !== undefined ? exchangeData.Mailboxes.totalSize : 'N/A'}</div>
                                        </div>
                                        <div className={o365Styles.metricItem}>
                                            <div className={o365Styles.metricLabel}>Taille moyenne</div>
                                            <div className={o365Styles.metricValue} style={{
                  color: '#8b5cf6'
                }}>
                                                {exchangeData.Mailboxes?.averageSize !== undefined ? exchangeData.Mailboxes.averageSize : 'N/A'}
                                            </div>
                                            {exchangeData.Mailboxes?.averageSize !== undefined && <div style={{
                  fontSize: '0.75rem',
                  color: theme === 'dark' ? '#9ca3af' : '#6b7280',
                  marginTop: '0.25rem'
                }}>
                                                    Per mailbox
                                                </div>}
                                        </div>
                                        <div className={o365Styles.metricItem}>
                                            <div className={o365Styles.metricLabel}>Total emails</div>
                                            <div className={o365Styles.metricValue} style={{
                  color: '#3b82f6'
                }}>
                                                {exchangeData.Mailboxes?.totalItems !== undefined ? exchangeData.Mailboxes.totalItems.toLocaleString() : 'N/A'}
                                            </div>
                                            {exchangeData.Mailboxes?.averageItems !== undefined && <div style={{
                  fontSize: '0.75rem',
                  color: theme === 'dark' ? '#9ca3af' : '#6b7280',
                  marginTop: '0.25rem'
                }}>
                                                    Moyenne: {exchangeData.Mailboxes.averageItems.toLocaleString()}/mailbox
                                                </div>}
                </div>
              </div>
              
                                    {}
                                    {exchangeData.Mailboxes?.quotas && exchangeData.Mailboxes.quotas.length > 0 && (() => {
              const bytesToGB = bytes => {
                if (!bytes || bytes === 0) return 0;
                return bytes / (1024 * 1024 * 1024);
              };
              const quotaRanges = {
                '> 50 GB': 0,
                '25 - 50 GB': 0,
                '10 - 25 GB': 0,
                '5 - 10 GB': 0,
                '< 5 GB': 0
              };
              exchangeData.Mailboxes.quotas.forEach(quota => {
                const sizeGB = bytesToGB(quota.storageUsed || 0);
                if (sizeGB > 50) {
                  quotaRanges['> 50 GB']++;
                } else if (sizeGB >= 25) {
                  quotaRanges['25 - 50 GB']++;
                } else if (sizeGB >= 10) {
                  quotaRanges['10 - 25 GB']++;
                } else if (sizeGB >= 5) {
                  quotaRanges['5 - 10 GB']++;
                } else {
                  quotaRanges['< 5 GB']++;
                }
              });
              const pieData = Object.entries(quotaRanges).filter(([_, value]) => value > 0).map(([name, value]) => ({
                name,
                value
              }));
              const COLORS = {
                '> 50 GB': '#ef4444',
                '25 - 50 GB': '#f59e0b',
                '10 - 25 GB': '#3b82f6',
                '5 - 10 GB': '#10b981',
                '< 5 GB': '#6b7280'
              };
              const CustomTooltip = ({
                active,
                payload
              }) => {
                if (active && payload && payload.length) {
                  return <div style={{
                    background: theme === 'dark' ? '#1e1e3f' : '#ffffff',
                    padding: '0.75rem',
                    borderRadius: '8px',
                    border: `1px solid ${theme === 'dark' ? '#4a4a6a' : '#e5e7eb'}`,
                    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
                  }}>
                                                        <p style={{
                      margin: 0,
                      fontWeight: '600',
                      color: theme === 'dark' ? '#f9fafb' : '#111827',
                      marginBottom: '0.25rem'
                    }}>
                                                            {payload[0].name}
                                                        </p>
                                                        <p style={{
                      margin: 0,
                      color: theme === 'dark' ? '#d1d5db' : '#374151',
                      fontSize: '0.875rem'
                    }}>
                                                            {payload[0].value} user{payload[0].value > 1 ? 's' : ''}
                                                        </p>
      </div>;
                }
                return null;
              };
              return <div style={{
                marginTop: '1.5rem'
              }}>
                                                <h5 style={{
                  marginBottom: '0.75rem',
                  fontSize: '0.9rem',
                  fontWeight: '600'
                }}>
                                                    Quota breakdown by user ({exchangeData.Mailboxes.quotas.length})
                                                </h5>
                                                <div style={{
                  background: theme === 'dark' ? '#1e1e3f' : '#ffffff',
                  borderRadius: '8px',
                  padding: '1.5rem',
                  border: `1px solid ${theme === 'dark' ? '#4a4a6a' : '#e5e7eb'}`
                }}>
                                                    <ResponsiveContainer width="100%" height={300}>
                                                        <PieChart>
                                                            <Pie data={pieData} cx="50%" cy="50%" labelLine={false} label={({
                        name,
                        value,
                        percent
                      }) => `${name}: ${value} (${(percent * 100).toFixed(1)}%)`} outerRadius={100} fill="#8884d8" dataKey="value">
                                                                {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[entry.name] || '#8884d8'} />)}
                                                            </Pie>
                                                            <Tooltip content={<CustomTooltip />} />
                                                            <Legend verticalAlign="bottom" height={36} formatter={(value, entry) => <span style={{
                        color: theme === 'dark' ? '#d1d5db' : '#374151',
                        fontSize: '0.875rem'
                      }}>
                                                                        {value}
                  </span>} />
                                                        </PieChart>
                                                    </ResponsiveContainer>
          </div>
        </div>;
            })()}
                                </div>

                                {}
                                {exchangeData.topUsers && exchangeData.topUsers.length > 0 && <div style={{
            marginTop: '1.5rem'
          }}>
                                        <h5 style={{
              marginBottom: '0.75rem',
              fontSize: '0.9rem',
              fontWeight: '600'
            }}>
                                            Top 5 utilisateurs
                                        </h5>
                                        <div style={{
              background: theme === 'dark' ? '#1e1e3f' : '#ffffff',
              borderRadius: '8px',
              padding: '1rem',
              border: `1px solid ${theme === 'dark' ? '#2d2d4f' : '#e5e7eb'}`
            }}>
                                            <table style={{
                width: '100%',
                borderCollapse: 'collapse'
              }}>
                                                <thead>
                                                    <tr style={{
                    borderBottom: `1px solid ${theme === 'dark' ? '#2d2d4f' : '#e5e7eb'}`
                  }}>
                                                        <th style={{
                      textAlign: 'left',
                      padding: '0.5rem',
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      color: theme === 'dark' ? '#9ca3af' : '#6b7280'
                    }}>User</th>
                                                        <th style={{
                      textAlign: 'right',
                      padding: '0.5rem',
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      color: theme === 'dark' ? '#9ca3af' : '#6b7280'
                    }}>Sent</th>
                                                        <th style={{
                      textAlign: 'right',
                      padding: '0.5rem',
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      color: theme === 'dark' ? '#9ca3af' : '#6b7280'
                    }}>Received</th>
                                                        <th style={{
                      textAlign: 'right',
                      padding: '0.5rem',
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      color: theme === 'dark' ? '#9ca3af' : '#6b7280'
                    }}>Lus</th>
                                                        <th style={{
                      textAlign: 'right',
                      padding: '0.5rem',
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      color: theme === 'dark' ? '#9ca3af' : '#6b7280'
                    }}>Total</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {exchangeData.topUsers.map((user, index) => <tr key={index} style={{
                    borderBottom: `1px solid ${theme === 'dark' ? '#2d2d4f' : '#e5e7eb'}`
                  }}>
                                                            <td style={{
                      padding: '0.75rem 0.5rem',
                      fontSize: '0.875rem'
                    }}>
                                                                <div style={{
                        fontWeight: '500'
                      }}>{user.name}</div>
                                                                {user.email && user.email.includes('@') && <div style={{
                        fontSize: '0.75rem',
                        color: theme === 'dark' ? '#9ca3af' : '#6b7280',
                        marginTop: '0.25rem'
                      }}>
                                                                        {user.email}
                </div>}
                                                            </td>
                                                            <td style={{
                      textAlign: 'right',
                      padding: '0.75rem 0.5rem',
                      fontSize: '0.875rem',
                      color: '#3b82f6'
                    }}>
                                                                {user.sent?.toLocaleString() || 0}
                                                            </td>
                                                            <td style={{
                      textAlign: 'right',
                      padding: '0.75rem 0.5rem',
                      fontSize: '0.875rem',
                      color: '#10b981'
                    }}>
                                                                {user.received?.toLocaleString() || 0}
                                                            </td>
                                                            <td style={{
                      textAlign: 'right',
                      padding: '0.75rem 0.5rem',
                      fontSize: '0.875rem',
                      color: '#8b5cf6'
                    }}>
                                                                {user.read?.toLocaleString() || 0}
                                                            </td>
                                                            <td style={{
                      textAlign: 'right',
                      padding: '0.75rem 0.5rem',
                      fontSize: '0.875rem',
                      fontWeight: '600'
                    }}>
                                                                {user.total?.toLocaleString() || 0}
                                                            </td>
                                                        </tr>)}
                                                </tbody>
                                            </table>
              </div>
            </div>}

                                {}
                                {exchangeData.emailActivity?.weeklyStats && <div style={{
            marginTop: '1.5rem'
          }}>
                                        <h5 style={{
              marginBottom: '0.75rem',
              fontSize: '0.9rem',
              fontWeight: '600'
            }}>
                                            Activity by day of week
                                        </h5>
                                        <div style={{
              background: theme === 'dark' ? '#1e1e3f' : '#ffffff',
              borderRadius: '8px',
              padding: '1rem',
              border: `1px solid ${theme === 'dark' ? '#2d2d4f' : '#e5e7eb'}`
            }}>
                                            <ResponsiveContainer width="100%" height={300}>
                                                <BarChart data={[{
                  jour: 'Monday',
                  ...exchangeData.emailActivity.weeklyStats.lundi
                }, {
                  jour: 'Tuesday',
                  ...exchangeData.emailActivity.weeklyStats.mardi
                }, {
                  jour: 'Wednesday',
                  ...exchangeData.emailActivity.weeklyStats.mercredi
                }, {
                  jour: 'Thursday',
                  ...exchangeData.emailActivity.weeklyStats.jeudi
                }, {
                  jour: 'Friday',
                  ...exchangeData.emailActivity.weeklyStats.vendredi
                }, {
                  jour: 'Saturday',
                  ...exchangeData.emailActivity.weeklyStats.samedi
                }, {
                  jour: 'Sunday',
                  ...exchangeData.emailActivity.weeklyStats.dimanche
                }]} margin={{
                  top: 20,
                  right: 30,
                  left: 20,
                  bottom: 20
                }}>
                                                    <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#2d2d4f' : '#e5e7eb'} />
                                                    <XAxis dataKey="jour" tick={{
                    fill: theme === 'dark' ? '#9ca3af' : '#6b7280',
                    fontSize: 12
                  }} stroke={theme === 'dark' ? '#4a4a6a' : '#d1d5db'} />
                                                    <YAxis tick={{
                    fill: theme === 'dark' ? '#9ca3af' : '#6b7280',
                    fontSize: 12
                  }} stroke={theme === 'dark' ? '#4a4a6a' : '#d1d5db'} />
                                                    <Tooltip contentStyle={{
                    backgroundColor: theme === 'dark' ? '#1e1e3f' : '#ffffff',
                    border: `1px solid ${theme === 'dark' ? '#2d2d4f' : '#e5e7eb'}`,
                    borderRadius: '6px',
                    color: theme === 'dark' ? '#ffffff' : '#111827'
                  }} />
                                                    <Legend wrapperStyle={{
                    paddingTop: '1rem'
                  }} iconType="line" />
                                                    <Bar dataKey="sent" fill="#3b82f6" name="Sent" radius={[4, 4, 0, 0]} />
                                                    <Bar dataKey="received" fill="#10b981" name="Received" radius={[4, 4, 0, 0]} />
                                                    <Bar dataKey="read" fill="#8b5cf6" name="Lus" radius={[4, 4, 0, 0]} />
                                                </BarChart>
                                            </ResponsiveContainer>
                </div>
              </div>}
                            </>}
            </div>}

                {}
                {teamsData && teamsData.success && <div>
                        <h4 className={styles.sectionTitle}>Microsoft Teams</h4>
                        
                        {(() => {
          const rawUsage = teamsData.activity?.usage;
          const usageStats = rawUsage && typeof rawUsage === 'object' && !Array.isArray(rawUsage) ? rawUsage : {};
          return <>
                                    <div className={o365Styles.metricsRow}>
                                        <div className={o365Styles.metricItem}>
                                            <div className={o365Styles.metricLabel}>Teams</div>
                                            <div className={o365Styles.metricValue}>{teamsData.teams?.total || 0}</div>
                </div>
                                        <div className={o365Styles.metricItem}>
                                            <div className={o365Styles.metricLabel}>Users actifs</div>
                                            <div className={o365Styles.metricValue} style={{
                  color: '#10b981'
                }}>
                                                {usageStats.activeUsers || teamsData.teams?.activeUsers || 0}
              </div>
            </div>
                                        <div className={o365Styles.metricItem}>
                                            <div className={o365Styles.metricLabel}>Licensed users</div>
                                            <div className={o365Styles.metricValue}>{usageStats.licensedUsers || 0}</div>
                </div>
                                        <div className={o365Styles.metricItem}>
                                            <div className={o365Styles.metricLabel}>Deleted users</div>
                                            <div className={o365Styles.metricValue}>{usageStats.deletedUsers || 0}</div>
              </div>
            </div>
                                </>;
        })()}

                        {(() => {
          const rawMessages = teamsData.activity?.messages;
          const messageStats = rawMessages && typeof rawMessages === 'object' && !Array.isArray(rawMessages) ? rawMessages : {
            total: typeof rawMessages === 'number' ? rawMessages : 0
          };
          return <div style={{
            marginTop: '1.5rem'
          }}>
                                    <h5 style={{
              marginBottom: '0.75rem',
              fontSize: '0.9rem',
              fontWeight: '600'
            }}>
                                        Messages
                                    </h5>
                                    <div className={o365Styles.metricsRow}>
                                        <div className={o365Styles.metricItem}>
                                            <div className={o365Styles.metricLabel}>Total</div>
                                            <div className={o365Styles.metricValue} style={{
                  color: '#3b82f6'
                }}>
                                                {(messageStats.total || 0).toLocaleString()}
                </div>
              </div>
                                        <div className={o365Styles.metricItem}>
                                            <div className={o365Styles.metricLabel}>Messages canal</div>
                                            <div className={o365Styles.metricValue}>{(messageStats.teamChat || 0).toLocaleString()}</div>
            </div>
                                        <div className={o365Styles.metricItem}>
                                            <div className={o365Styles.metricLabel}>Private chat messages</div>
                                            <div className={o365Styles.metricValue}>{(messageStats.privateChat || 0).toLocaleString()}</div>
                  </div>
                </div>
              </div>;
        })()}

                        {(() => {
          const rawMeetings = teamsData.activity?.meetings;
          const meetingsStats = rawMeetings && typeof rawMeetings === 'object' && !Array.isArray(rawMeetings) ? rawMeetings : {
            total: typeof rawMeetings === 'number' ? rawMeetings : 0
          };
          return <div style={{
            marginTop: '1.5rem'
          }}>
                                    <h5 style={{
              marginBottom: '0.75rem',
              fontSize: '0.9rem',
              fontWeight: '600'
            }}>
                                        Meetings
                                    </h5>
                                    <div className={o365Styles.metricsRow}>
                                        <div className={o365Styles.metricItem}>
                                            <div className={o365Styles.metricLabel}>Total</div>
                                            <div className={o365Styles.metricValue} style={{
                  color: '#8b5cf6'
                }}>
                                                {(meetingsStats.total || 0).toLocaleString()}
                  </div>
                </div>
                                        <div className={o365Styles.metricItem}>
                                            <div className={o365Styles.metricLabel}>Organized</div>
                                            <div className={o365Styles.metricValue}>{(meetingsStats.organized || 0).toLocaleString()}</div>
              </div>
                                        <div className={o365Styles.metricItem}>
                                            <div className={o365Styles.metricLabel}>Participations</div>
                                            <div className={o365Styles.metricValue}>{(meetingsStats.attended || 0).toLocaleString()}</div>
                                        </div>
                                        <div className={o365Styles.metricItem}>
                                            <div className={o365Styles.metricLabel}>Scheduled (org.)</div>
                                            <div className={o365Styles.metricValue}>{(meetingsStats.scheduledOneTime?.organized || 0).toLocaleString()}</div>
                                        </div>
                                        <div className={o365Styles.metricItem}>
                                            <div className={o365Styles.metricLabel}>Scheduled (attendee)</div>
                                            <div className={o365Styles.metricValue}>{(meetingsStats.scheduledOneTime?.attended || 0).toLocaleString()}</div>
                                        </div>
                                    </div>
                                </div>;
        })()}

                        {(() => {
          const rawCalls = teamsData.activity?.calls || teamsData.calls;
          const callsStats = rawCalls && typeof rawCalls === 'object' && !Array.isArray(rawCalls) ? rawCalls : {
            total: typeof rawCalls === 'number' ? rawCalls : 0
          };
          return <div style={{
            marginTop: '1.5rem'
          }}>
                                    <h5 style={{
              marginBottom: '0.75rem',
              fontSize: '0.9rem',
              fontWeight: '600'
            }}>
                                        Calls & media
                                    </h5>
                                    <div className={o365Styles.metricsRow}>
                                        <div className={o365Styles.metricItem}>
                                            <div className={o365Styles.metricLabel}>Total appels</div>
                                            <div className={o365Styles.metricValue}>{(callsStats.total || 0).toLocaleString()}</div>
                  </div>
                                        <div className={o365Styles.metricItem}>
                                            <div className={o365Styles.metricLabel}>Total duration</div>
                                            <div className={o365Styles.metricValue}>{callsStats.totalDuration || '0h 0m'}</div>
                </div>
                                        <div className={o365Styles.metricItem}>
                                            <div className={o365Styles.metricLabel}>Average duration</div>
                                            <div className={o365Styles.metricValue}>{callsStats.averageDuration || '0h 0m'}</div>
              </div>
                                        <div className={o365Styles.metricItem}>
                                            <div className={o365Styles.metricLabel}>Audio</div>
                                            <div className={o365Styles.metricValue}>{callsStats.audioDuration || '0h 0m'}</div>
          </div>
                                        <div className={o365Styles.metricItem}>
                                            <div className={o365Styles.metricLabel}>Video</div>
                                            <div className={o365Styles.metricValue}>{callsStats.videoDuration || '0h 0m'}</div>
        </div>
                                        <div className={o365Styles.metricItem}>
                                            <div className={o365Styles.metricLabel}>Screen shares</div>
                                            <div className={o365Styles.metricValue}>{callsStats.screenShareDuration || '0h 0m'}</div>
                                        </div>
                        </div>
                      </div>;
        })()}
                        
                        {}
                        {teamsData.licensedActivity && teamsData.licensedActivity.dailyActivity && teamsData.licensedActivity.dailyActivity.length > 0 && <div style={{
          marginTop: '1.5rem'
        }}>
                                <h5 style={{
            marginBottom: '0.75rem',
            fontSize: '0.9rem',
            fontWeight: '600'
          }}>
                                    Daily activity
                                </h5>
                                <div style={{
            background: theme === 'dark' ? '#1e1e3f' : '#ffffff',
            borderRadius: '8px',
            padding: '1rem',
            border: `1px solid ${theme === 'dark' ? '#2d2d4f' : '#e5e7eb'}`
          }}>
                                    <ResponsiveContainer width="100%" height={400}>
                                        <LineChart data={teamsData.licensedActivity.dailyActivity.map(day => ({
                date: new Date(day.date).toLocaleDateString('en-US', {
                  day: '2-digit',
                  month: '2-digit'
                }),
                'Messages canal': day.channelMessages || 0,
                'Messages chat': day.chatMessages || 0,
                'Appels 1:1': day.oneOnOneCalls || 0,
                'Total meetings': day.totalMeetings || 0
              }))} margin={{
                top: 20,
                right: 30,
                left: 20,
                bottom: 60
              }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#2d2d4f' : '#e5e7eb'} />
                                            <XAxis dataKey="date" angle={-45} textAnchor="end" height={80} tick={{
                  fill: theme === 'dark' ? '#9ca3af' : '#6b7280',
                  fontSize: 12
                }} stroke={theme === 'dark' ? '#4a4a6a' : '#d1d5db'} />
                                            <YAxis tick={{
                  fill: theme === 'dark' ? '#9ca3af' : '#6b7280',
                  fontSize: 12
                }} stroke={theme === 'dark' ? '#4a4a6a' : '#d1d5db'} />
                                            <Tooltip contentStyle={{
                  backgroundColor: theme === 'dark' ? '#1e1e3f' : '#ffffff',
                  border: `1px solid ${theme === 'dark' ? '#2d2d4f' : '#e5e7eb'}`,
                  borderRadius: '8px',
                  color: theme === 'dark' ? '#ffffff' : '#111827'
                }} />
                                            <Legend wrapperStyle={{
                  paddingTop: '20px'
                }} iconType="line" />
                                            <Line type="monotone" dataKey="Messages canal" stroke="#3b82f6" strokeWidth={2} dot={false} />
                                            <Line type="monotone" dataKey="Messages chat" stroke="#10b981" strokeWidth={2} dot={false} />
                                            <Line type="monotone" dataKey="Appels 1:1" stroke="#f59e0b" strokeWidth={2} dot={false} />
                                            <Line type="monotone" dataKey="Total meetings" stroke="#8b5cf6" strokeWidth={2} dot={false} />
                                        </LineChart>
                                    </ResponsiveContainer>
                </div>
                </div>}
              
                        {teamsData.teams?.teamsList && teamsData.teams.teamsList.length > 0 && <div style={{
          marginTop: '1.5rem'
        }}>
                                <h5 style={{
            marginBottom: '0.75rem',
            fontSize: '0.9rem',
            fontWeight: '600'
          }}>
                                    Teams ({teamsData.teams.teamsList.length})
                                </h5>
                                <div className={o365Styles.licensesTableContainer} style={{
            maxHeight: '360px',
            overflowY: 'auto',
            paddingRight: '0.5rem'
          }}>
                                    <table className={o365Styles.licensesTable}>
                                        <thead>
                                            <tr>
                                                <th>Team name</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {teamsData.teams.teamsList.map((team, idx) => <tr key={idx}>
                                                    <td style={{
                    fontWeight: '500'
                  }}>{team.displayName || 'Unnamed'}</td>
                                                </tr>)}
                                        </tbody>
                                    </table>
            </div>
          </div>}
        </div>}


                {}
                {sharepointData && sharepointData.success && <div>
                        <h4 className={styles.sectionTitle}>SharePoint Online</h4>
                        
                        <div className={o365Styles.metricsRow}>
                            <div className={o365Styles.metricItem}>
                                <div className={o365Styles.metricLabel}>Total sites</div>
                                <div className={o365Styles.metricValue}>{sharepointTotalSites}</div>
                  </div>
                            <div className={o365Styles.metricItem}>
                                <div className={o365Styles.metricLabel}>Active sites (30d)</div>
                                <div className={o365Styles.metricValue} style={{
              color: '#10b981'
            }}>
                                    {sharepointActiveSites}
                </div>
                            </div>
                            <div className={o365Styles.metricItem}>
                                <div className={o365Styles.metricLabel}>Inactive sites</div>
                                <div className={o365Styles.metricValue} style={{
              color: '#ef4444'
            }}>
                                    {sharepointInactiveSites}
                                </div>
                </div>
              </div>
              
                        {}
                </div>}
              
                {}
                {securityData && <div>
                        <h4 className={styles.sectionTitle}>Security</h4>
                        
                        <div style={{
          display: 'flex',
          gap: '1.5rem',
          marginBottom: '1.5rem',
          flexWrap: 'wrap'
        }}>
                            {}
                            <div style={{
            flex: '1',
            minWidth: '280px',
            padding: '1.25rem',
            borderRadius: '12px',
            background: theme === 'dark' ? '#2d2d4f' : '#f9fafb',
            border: `1px solid ${theme === 'dark' ? '#4a4a6a' : '#e5e7eb'}`
          }}>
                                <div style={{
              fontSize: '0.85rem',
              fontWeight: '600',
              color: theme === 'dark' ? '#f9fafb' : '#111827',
              marginBottom: '1rem'
            }}>
                                    Overall security grade
              </div>
                                <div style={{
              display: 'flex',
              alignItems: 'flex-end',
              gap: '0.5rem',
              marginBottom: '0.5rem'
            }}>
                                    <div style={{
                fontSize: '2.5rem',
                fontWeight: '700',
                color: theme === 'dark' ? '#f9fafb' : '#111827',
                lineHeight: '1'
              }}>
                                        {securityScore?.currentScore !== null ? Math.round(securityScore.currentScore) : '-'}
            </div>
                                    <div style={{
                fontSize: '1rem',
                color: theme === 'dark' ? '#d1d5db' : '#6b7280',
                fontWeight: '500',
                marginBottom: '0.25rem'
              }}>
                                        / {securityScore?.maxScore || 100}
                  </div>
                      </div>
                                {securityScore?.score !== null ? <>
                                        <div style={{
                fontSize: '0.9rem',
                fontWeight: '600',
                color: theme === 'dark' ? '#d1d5db' : '#111827',
                marginTop: '0.5rem'
              }}>
                                            {Math.round(securityScore.score)}% des points obtenus
                    </div>
                                        <div style={{
                marginTop: '0.75rem',
                width: '100%',
                height: '6px',
                background: theme === 'dark' ? '#1f2937' : '#e5e7eb',
                borderRadius: '999px'
              }}>
                                            <div style={{
                  width: `${Math.min(100, Math.max(0, securityScore.score))}%`,
                  height: '100%',
                  borderRadius: '999px',
                  background: 'linear-gradient(90deg, #10b981, #2563eb)'
                }} />
                                        </div>
                                    </> : <div style={{
              fontSize: '0.8rem',
              color: theme === 'dark' ? '#d1d5db' : '#374151',
              marginTop: '0.5rem'
            }}>
                                        Score pending de synchronisation.
          </div>}
                  </div>

                            {}
                            {securityData.adminStats && <div style={{
            flex: '1',
            minWidth: '280px',
            padding: '1.25rem',
            borderRadius: '12px',
            background: theme === 'dark' ? '#2d2d4f' : '#f9fafb',
            border: `1px solid ${theme === 'dark' ? '#4a4a6a' : '#e5e7eb'}`
          }}>
                                    <div style={{
              fontSize: '0.85rem',
              fontWeight: '600',
              color: theme === 'dark' ? '#f9fafb' : '#111827',
              marginBottom: '1rem'
            }}>
                                        Administrateurs
                  </div>
                                    <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '1.5rem'
            }}>
                                        <div>
                                            <div style={{
                  fontSize: '0.75rem',
                  color: theme === 'dark' ? '#9ca3af' : '#6b7280',
                  marginBottom: '0.5rem'
                }}>
                                                Avec MFA
                </div>
                                            <div style={{
                  fontSize: '1.5rem',
                  fontWeight: '700',
                  color: '#10b981'
                }}>
                                                {securityData.adminStats?.withMFA || 0}
                </div>
              </div>
                                        <div>
                                            <div style={{
                  fontSize: '0.75rem',
                  color: theme === 'dark' ? '#9ca3af' : '#6b7280',
                  marginBottom: '0.5rem'
                }}>
                                                No MFA
              </div>
                                            <div style={{
                  fontSize: '1.5rem',
                  fontWeight: '700',
                  color: '#ef4444'
                }}>
                                                {securityData.adminStats?.withoutMFA || 0}
                      </div>
                    </div>
                                        <div>
                                            <div style={{
                  fontSize: '0.75rem',
                  color: theme === 'dark' ? '#9ca3af' : '#6b7280',
                  marginBottom: '0.5rem'
                }}>
                                                Taux d'adoption
                  </div>
                                            <div style={{
                  fontSize: '1.5rem',
                  fontWeight: '700',
                  color: theme === 'dark' ? '#f9fafb' : '#111827'
                }}>
                                                {(() => {
                    const totalAdmins = securityData.adminStats?.total || 0;
                    const adminsWithMFA = securityData.adminStats?.withMFA || 0;
                    return totalAdmins > 0 ? Math.round(adminsWithMFA / totalAdmins * 100) : 0;
                  })()}%
                      </div>
                    </div>
                  </div>
          </div>}

                            {}
                            <div style={{
            flex: '1',
            minWidth: '280px',
            padding: '1.25rem',
            borderRadius: '12px',
            background: theme === 'dark' ? '#2d2d4f' : '#f9fafb',
            border: `1px solid ${theme === 'dark' ? '#4a4a6a' : '#e5e7eb'}`
          }}>
                                <div style={{
              fontSize: '0.85rem',
              fontWeight: '600',
              color: theme === 'dark' ? '#f9fafb' : '#111827',
              marginBottom: '1rem'
            }}>
                                    Users
                      </div>
                                <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '1.5rem'
            }}>
                                    <div>
                                        <div style={{
                  fontSize: '0.75rem',
                  color: theme === 'dark' ? '#9ca3af' : '#6b7280',
                  marginBottom: '0.5rem'
                }}>
                                            Avec MFA
                    </div>
                                        <div style={{
                  fontSize: '1.5rem',
                  fontWeight: '700',
                  color: '#10b981'
                }}>
                                            {securityData.mfa?.usersWithoutMFA?.toLocaleString() || 0}
                  </div>
                      </div>
                                    <div>
                                        <div style={{
                  fontSize: '0.75rem',
                  color: theme === 'dark' ? '#9ca3af' : '#6b7280',
                  marginBottom: '0.5rem'
                }}>
                                            No MFA
                    </div>
                                        <div style={{
                  fontSize: '1.5rem',
                  fontWeight: '700',
                  color: '#ef4444'
                }}>
                                            {securityData.mfa?.usersWithMFA?.toLocaleString() || 0}
                  </div>
                </div>
                                    <div>
                                        <div style={{
                  fontSize: '0.75rem',
                  color: theme === 'dark' ? '#9ca3af' : '#6b7280',
                  marginBottom: '0.5rem'
                }}>
                                            Taux d'adoption
              </div>
                                        <div style={{
                  fontSize: '1.5rem',
                  fontWeight: '700',
                  color: theme === 'dark' ? '#f9fafb' : '#111827'
                }}>
                                            {(() => {
                    const totalUsers = apiData?.users?.length || 0;
                    const usersWithMFA = securityData.mfa?.usersWithoutMFA || 0;
                    return totalUsers > 0 ? Math.round(usersWithMFA / totalUsers * 100) : 0;
                  })()}%
            </div>
          </div>
                  </div>
                </div>
              </div>
              
                        {}
                        {sortedRecommendations.length > 0 && <div style={{
          marginBottom: '1.5rem'
        }}>
                                <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '0.75rem'
          }}>
                                    <h5 style={{
              margin: 0,
              fontSize: '0.9rem',
              fontWeight: '600'
            }}>
                                        Recommended actions
                                        {securityData.defenderSecureScore ? ' (Microsoft 365 Defender)' : ' (Entra ID)'}
                                    </h5>
                                    <span style={{
              fontSize: '0.75rem',
              color: theme === 'dark' ? '#9ca3af' : '#6b7280'
            }}>
                                        {securityData.secureScoreRecommendations.length} recommandations
                  </span>
                </div>
                                <div className={o365Styles.licensesTableContainer}>
                                    <table className={o365Styles.licensesTable}>
                                        <thead>
                                            <tr>
                                                <th>
                                                    <button type="button" onClick={() => handleRecommendationSort('priority')} style={{
                      background: 'none',
                      border: 'none',
                      color: theme === 'dark' ? '#f9fafb' : '#111827',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center'
                    }}>
                                                        Priority {renderSortIcon('priority')}
                                                    </button>
                                                </th>
                                                <th>Recommandation</th>
                                                <th>Category</th>
                                                <th>
                                                    <button type="button" onClick={() => handleRecommendationSort('points')} style={{
                      background: 'none',
                      border: 'none',
                      color: theme === 'dark' ? '#f9fafb' : '#111827',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center'
                    }}>
                                                        Points {renderSortIcon('points')}
                                                    </button>
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {sortedRecommendations.map((rec, idx) => {
                  const priorityLabel = getPriorityLabel(rec);
                  const priorityColor = getPriorityColorValue(priorityLabel);
                  const recommendationTitle = rec.title || 'Recommendation';
                  const categoryLabel = rec.categoryFr || rec.category || 'General';
                  return <tr key={rec.id || idx}>
                                                        <td>
                                                            <span style={{
                        fontWeight: '600',
                        color: priorityColor,
                        fontSize: '0.8rem'
                      }}>
                                                                {priorityLabel}
                                                            </span>
                                                            {typeof rec.rank === 'number' && <div style={{
                        fontSize: '0.7rem',
                        color: theme === 'dark' ? '#9ca3af' : '#6b7280',
                        marginTop: '0.25rem'
                      }}>
                                                                    #{rec.rank}
                                                                </div>}
                                                        </td>
                                                        <td>
                                                            <div style={{
                        fontWeight: '600'
                      }}>{recommendationTitle}</div>
                                                        </td>
                                                        <td style={{
                      fontSize: '0.875rem',
                      color: theme === 'dark' ? '#d1d5db' : '#374151'
                    }}>
                                                            {categoryLabel}
                                                        </td>
                                                        <td>
                                                            <div style={{
                        fontWeight: '600'
                      }}>
                                                                {rec.currentScore !== undefined ? `${Number(rec.currentScore).toFixed(2)}` : '0.00'}/{rec.maxScore || 0}
              </div>
                                                        </td>
                                                    </tr>;
                })}
                                        </tbody>
                                    </table>
            </div>
          </div>}
                    </div>}
      </div>
    </div>;
};
export default O365Summary;
