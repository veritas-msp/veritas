import React, { useMemo, useState, useEffect } from 'react';
import { Icon } from '@iconify/react';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa6';
import API_BASE_URL from '../../../config';
import { sanitizeRemediationHtml } from '../../../utils/sanitizeHtml';
import styles from '../TenantDetailPage.module.css';
import enterpriseStyles from '../../EnterprisesPage/EnterprisesPage.module.css';
function isLikelyServiceAccountFromUser(user) {
  const name = (user.name || user.displayName || '').toString();
  const upn = (user.userPrincipalName || user.email || '').toString();
  const email = (user.email || '').toString();
  const combined = `${name} ${upn} ${email}`.toLowerCase();
  const patterns = [/aad_/, /msol_/, /sync_/, /svc_/, /service_/, /\$@/, /_srv/, /_service/, /_sync/, /compte de service|service account|compte service/, /bot\./, /bot@/, /connector/, /automation/, /azure ad sync|ad sync|dirsync|aadconnect|dir sync/, /directory synchronization|synchronization service|on-premises/, /healthmailbox|systemmailbox|federatedemail/];
  return patterns.some(p => p.test(combined));
}
function getMfaUserForUser(user, mfaDetails) {
  const upn = (user.userPrincipalName || user.email || '').toLowerCase().trim();
  const userId = user.id;
  return mfaDetails.find(m => {
    const mUpn = (m.userPrincipalName || m.user_principal_name || '').toLowerCase().trim();
    if (mUpn && upn && mUpn === upn) return true;
    if (userId && m.id && String(m.id) === String(userId)) return true;
    return false;
  }) || null;
}
const IGNORED_MFA_METHODS = new Set(['passwordauthenticationmethod', 'windowshelloforbusinessauthenticationmethod']);
function userHasMfa(mfaUser) {
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
const MFA_METHOD_LABELS = {
  microsoftauthenticatorauthenticationmethod: 'Authenticator',
  phoneauthenticationmethod: 'SMS/Appel',
  fido2authenticationmethod: 'FIDO2 key',
  softwareoathauthenticationmethod: 'Software OAuth',
  temporaryaccesspassauthenticationmethod: 'Temporary pass',
  emailauthenticationmethod: 'Email'
};
const MFA_METHOD_ICONS = {
  microsoftauthenticatorauthenticationmethod: 'mdi:cellphone',
  phoneauthenticationmethod: 'mdi:phone',
  fido2authenticationmethod: 'mdi:usb',
  softwareoathauthenticationmethod: 'mdi:shield-key',
  temporaryaccesspassauthenticationmethod: 'mdi:clock-outline',
  emailauthenticationmethod: 'mdi:email'
};
function getMfaMethodIconName(methodKey) {
  return MFA_METHOD_ICONS[methodKey] || 'mdi:help-circle';
}
function getPreferredMethodLabel(methodCounts) {
  if (!methodCounts || typeof methodCounts !== 'object') return null;
  let maxCount = 0;
  let preferredKey = null;
  Object.entries(methodCounts).forEach(([key, count]) => {
    if (count > maxCount) {
      maxCount = count;
      preferredKey = key;
    }
  });
  if (!preferredKey) return null;
  return MFA_METHOD_LABELS[preferredKey] || preferredKey.replace('authenticationmethod', '').replace(/([A-Z])/g, ' $1').trim();
}
function getTop3Methods(methodCounts) {
  if (!methodCounts || typeof methodCounts !== 'object') return [];
  return Object.entries(methodCounts).filter(([, count]) => count > 0).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([key, count]) => ({
    key,
    label: MFA_METHOD_LABELS[key] || key.replace('authenticationmethod', '').replace(/([A-Z])/g, ' $1').trim(),
    count
  }));
}
function priorityColor(label) {
  if (!label) return '#6b7280';
  if (label === 'High') return '#ef4444';
  if (label === 'Medium') return '#f59e0b';
  if (label === 'Low') return '#10b981';
  return '#6b7280';
}
function formatRemainingPoints(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '-';
  const rounded = Math.round(n * 100) / 100;
  return rounded.toLocaleString('en-GB', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  });
}
export default function SecuriteTab({
  securityData,
  users,
  mfaDetails = [],
  clientId,
  theme
}) {
  const [secureRecommendations, setSecureRecommendations] = useState(() => Array.isArray(securityData?.secureScoreRecommendations) ? securityData.secureScoreRecommendations : []);
  const [recsLoading, setRecsLoading] = useState(false);
  const [recsError, setRecsError] = useState(null);
  const [recSortColumn, setRecSortColumn] = useState('remaining');
  const [recSortOrder, setRecSortOrder] = useState('desc');
  const [recPage, setRecPage] = useState(1);
  const [recPageSize, setRecPageSize] = useState(10);
  useEffect(() => {
    setRecSortColumn('remaining');
    setRecSortOrder('desc');
    setRecPage(1);
  }, [clientId]);
  useEffect(() => {
    setRecPage(1);
  }, [recSortColumn, recSortOrder, recPageSize]);
  const handleRecSort = column => {
    setRecSortColumn(prev => {
      if (prev === column) {
        setRecSortOrder(o => o === 'asc' ? 'desc' : 'asc');
        return prev;
      }
      setRecSortOrder('desc');
      return column;
    });
  };
  const RecSortIcon = ({
    column
  }) => recSortColumn !== column ? null : <span>{recSortOrder === 'asc' ? ' ↑' : ' ↓'}</span>;
  useEffect(() => {
    if (!clientId) return undefined;
    let cancelled = false;
    setRecsLoading(true);
    setRecsError(null);
    fetch(`${API_BASE_URL}/office365/secure-score-recommendations?clientId=${encodeURIComponent(clientId)}`, {
      credentials: 'include'
    }).then(async res => {
      const json = await res.json().catch(() => ({}));
      if (cancelled) return;
      if (res.ok && json.success && Array.isArray(json.recommendations)) {
        setSecureRecommendations(json.recommendations);
        return;
      }
      if (Array.isArray(securityData?.secureScoreRecommendations) && securityData.secureScoreRecommendations.length > 0) {
        setSecureRecommendations(securityData.secureScoreRecommendations);
        return;
      }
      if (!res.ok) {
        setRecsError(json.error || 'Unable to load recommendations');
      }
    }).catch(err => {
      if (!cancelled) {
        setRecsError(err?.message || 'Network error');
        if (Array.isArray(securityData?.secureScoreRecommendations)) {
          setSecureRecommendations(securityData.secureScoreRecommendations);
        }
      }
    }).finally(() => {
      if (!cancelled) setRecsLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [clientId]);
  const sortedSecureRecommendations = useMemo(() => {
    if (!secureRecommendations.length) return [];
    const dir = recSortOrder === 'asc' ? 1 : -1;
    const rem = row => {
      const max = Number(row.maxScore) || 0;
      const cur = Number(row.currentScore) || 0;
      return Math.max(0, max - cur);
    };
    return [...secureRecommendations].sort((a, b) => {
      switch (recSortColumn) {
        case 'priority':
          {
            const pa = a.priorityLevel ?? 0;
            const pb = b.priorityLevel ?? 0;
            if (pa !== pb) return (pa - pb) * dir;
            const ra = a.rank ?? 9999;
            const rb = b.rank ?? 9999;
            return (ra - rb) * dir;
          }
        case 'recommendation':
          return (a.titleFr || a.title || '').toLowerCase().localeCompare((b.titleFr || b.title || '').toLowerCase(), 'en') * dir;
        case 'category':
          return (a.categoryFr || a.category || '').toLowerCase().localeCompare((b.categoryFr || b.category || '').toLowerCase(), 'fr') * dir;
        case 'state':
          return (a.stateLabel || '').toLowerCase().localeCompare((b.stateLabel || '').toLowerCase(), 'fr') * dir;
        case 'score':
          {
            const curA = Number(a.currentScore) || 0;
            const curB = Number(b.currentScore) || 0;
            if (curA !== curB) return (curA - curB) * dir;
            const maxA = Number(a.maxScore) || 0;
            const maxB = Number(b.maxScore) || 0;
            return (maxA - maxB) * dir;
          }
        case 'remaining':
        default:
          {
            const diffRem = (rem(a) - rem(b)) * dir;
            if (diffRem !== 0) return diffRem;
            const maxA = Number(a.maxScore) || 0;
            const maxB = Number(b.maxScore) || 0;
            return (maxA - maxB) * dir;
          }
      }
    });
  }, [secureRecommendations, recSortColumn, recSortOrder]);
  const recTotalPages = useMemo(() => {
    const n = sortedSecureRecommendations.length;
    if (n === 0) return 1;
    return Math.max(1, Math.ceil(n / recPageSize));
  }, [sortedSecureRecommendations.length, recPageSize]);
  useEffect(() => {
    if (recPage > recTotalPages) setRecPage(recTotalPages);
  }, [recPage, recTotalPages]);
  const paginatedSecureRecommendations = useMemo(() => {
    const start = (recPage - 1) * recPageSize;
    return sortedSecureRecommendations.slice(start, start + recPageSize);
  }, [sortedSecureRecommendations, recPage, recPageSize]);
  const identityScoreCurrent = securityData?.secureScore?.currentScore ?? null;
  const identityScoreMax = securityData?.secureScore?.maxScore ?? null;
  const identityScorePercentage = securityData?.secureScore?.percentage ?? (identityScoreCurrent !== null && identityScoreMax ? Math.round(identityScoreCurrent / identityScoreMax * 1000) / 10 : null);
  const kpiStats = useMemo(() => {
    const effectiveUsers = Array.isArray(users) ? users.filter(u => {
      const isService = u.isServiceAccount === true || u.isServiceAccount !== false && isLikelyServiceAccountFromUser(u);
      return !isService;
    }) : [];
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
      const hasMfa = userHasMfa(mfaUser);
      const methods = getMethodsFromMfaUser(mfaUser);
      if (hasMfa) {
        usersWithMFA += 1;
        methods.forEach(m => {
          totalMethodCounts[m] = (totalMethodCounts[m] || 0) + 1;
        });
      } else usersWithoutMFA += 1;
      if (mfaUser.is_admin === true) {
        adminsTotal += 1;
        if (hasMfa) {
          adminsWithMFA += 1;
          methods.forEach(m => {
            adminMethodCounts[m] = (adminMethodCounts[m] || 0) + 1;
          });
        } else adminsWithoutMFA += 1;
      } else {
        if (hasMfa) {
          nonAdminWithMFA += 1;
          methods.forEach(m => {
            nonAdminMethodCounts[m] = (nonAdminMethodCounts[m] || 0) + 1;
          });
        } else nonAdminWithoutMFA += 1;
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
  }, [users, mfaDetails]);
  if (!securityData) {
    return <div>
        <h2 className={styles.sectionTitle}>Security</h2>
        <div className={styles.noDataMessage}>
          <p>No security data available. Please sync the data.</p>
        </div>
      </div>;
  }
  if (securityData.success === false) {
    return <div>
        <h2 className={styles.sectionTitle}>Security</h2>
        <div className={styles.noDataMessage}>
          <p style={{
          color: '#ef4444'
        }}>❌ Error loading security data</p>
          <p className={styles.textSecondary}>
            {securityData.error || 'Unknown error'}
          </p>
        </div>
      </div>;
  }
  return <div>
      <h2 className={styles.sectionTitle}>Security</h2>
      
      <div style={{
      display: 'flex',
      gap: '1.5rem',
      marginBottom: '1.5rem',
      flexWrap: 'wrap'
    }}>
        {}
        {identityScoreCurrent !== null && <div style={{
        flex: '1',
        minWidth: '280px',
        padding: '1.25rem',
        borderRadius: '12px',
        background: '#f9fafb',
        border: '1px solid #e5e7eb'
      }}>
            <div style={{
          fontSize: '0.85rem',
          fontWeight: '600',
          color: '#111827',
          marginBottom: '1rem'
        }}>
              Overall security score
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
            color: '#111827',
            lineHeight: '1'
          }}>
                {identityScoreCurrent !== null ? Math.round(identityScoreCurrent) : '-'}
              </div>
              <div style={{
            fontSize: '1rem',
            color: '#6b7280',
            fontWeight: '500',
            marginBottom: '0.25rem'
          }}>
                / {identityScoreMax || 100}
              </div>
            </div>
            {identityScorePercentage !== null ? <>
                <div style={{
            fontSize: '0.9rem',
            fontWeight: '600',
            color: '#374151',
            marginTop: '0.5rem'
          }}>
                  {Math.round(identityScorePercentage)}% des points obtenus
                </div>
                <div style={{
            marginTop: '0.75rem',
            width: '100%',
            height: '6px',
            background: '#e5e7eb',
            borderRadius: '999px'
          }}>
                  <div style={{
              width: `${Math.min(100, Math.max(0, identityScorePercentage))}%`,
              height: '100%',
              borderRadius: '999px',
              background: '#10b981'
            }} />
                </div>
              </> : <div style={{
          fontSize: '0.8rem',
          color: '#6b7280',
          marginTop: '0.5rem'
        }}>
                Score en attente de synchronisation.
              </div>}
          </div>}

        {}
        <div style={{
        flex: '1',
        minWidth: '280px',
        padding: '1.25rem',
        borderRadius: '12px',
        background: '#f9fafb',
        border: '1px solid #e5e7eb'
      }}>
          <div style={{
          fontSize: '0.85rem',
          fontWeight: '600',
          color: '#111827',
          marginBottom: '1rem'
        }}>
            Total users
          </div>
          <div style={{
          fontSize: '1.5rem',
          fontWeight: '700',
          color: '#111827',
          marginBottom: '1rem'
        }}>
            {kpiStats.totalUsers.toLocaleString()}
          </div>
          <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '1.5rem'
        }}>
            <div>
              <div style={{
              fontSize: '0.75rem',
              color: '#6b7280',
              marginBottom: '0.5rem'
            }}>With MFA</div>
              <div style={{
              fontSize: '1.5rem',
              fontWeight: '700',
              color: '#10b981'
            }}>{kpiStats.usersWithMFA.toLocaleString()}</div>
            </div>
            <div>
              <div style={{
              fontSize: '0.75rem',
              color: '#6b7280',
              marginBottom: '0.5rem'
            }}>Without MFA</div>
              <div style={{
              fontSize: '1.5rem',
              fontWeight: '700',
              color: '#ef4444'
            }}>{kpiStats.usersWithoutMFA.toLocaleString()}</div>
            </div>
            <div>
              <div style={{
              fontSize: '0.75rem',
              color: '#6b7280',
              marginBottom: '0.5rem'
            }}>Adoption rate</div>
              <div style={{
              fontSize: '1.5rem',
              fontWeight: '700',
              color: '#111827'
            }}>
                {(() => {
                const avec = kpiStats.usersWithMFA;
                const sans = kpiStats.usersWithoutMFA;
                return avec + sans > 0 ? Math.round(avec / (avec + sans) * 100) : 0;
              })()}%
              </div>
            </div>
          </div>
          <div style={{
          fontSize: '0.75rem',
          color: '#6b7280',
          marginTop: '1rem',
          paddingTop: '0.75rem',
          borderTop: '1px solid #e5e7eb'
        }}>
            <div style={{
            marginBottom: '0.35rem'
          }}>Top 3 preferred methods</div>
            {kpiStats.top3Total.length > 0 ? <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0.5rem',
            alignItems: 'center'
          }}>
                {kpiStats.top3Total.map(({
              key,
              label,
              count
            }, i) => <span key={key} style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              fontSize: '0.75rem',
              color: '#111827'
            }}>
                    <Icon icon={getMfaMethodIconName(key)} style={{
                fontSize: '1rem',
                color: '#10b981'
              }} />
                    {label}
                    <span style={{
                color: '#6b7280',
                fontWeight: 600
              }}>({count})</span>
                  </span>)}
              </div> : <span style={{
            color: '#9ca3af'
          }}>-</span>}
          </div>
        </div>

        {}
        <div style={{
        flex: '1',
        minWidth: '280px',
        padding: '1.25rem',
        borderRadius: '12px',
        background: '#f9fafb',
        border: '1px solid #e5e7eb'
      }}>
          <div style={{
          fontSize: '0.85rem',
          fontWeight: '600',
          color: '#111827',
          marginBottom: '1rem'
        }}>
            Total admin users
          </div>
          <div style={{
          fontSize: '1.5rem',
          fontWeight: '700',
          color: '#111827',
          marginBottom: '1rem'
        }}>
            {kpiStats.adminsTotal.toLocaleString()}
          </div>
          <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '1.5rem'
        }}>
            <div>
              <div style={{
              fontSize: '0.75rem',
              color: '#6b7280',
              marginBottom: '0.5rem'
            }}>With MFA</div>
              <div style={{
              fontSize: '1.5rem',
              fontWeight: '700',
              color: '#10b981'
            }}>{kpiStats.adminsWithMFA.toLocaleString()}</div>
            </div>
            <div>
              <div style={{
              fontSize: '0.75rem',
              color: '#6b7280',
              marginBottom: '0.5rem'
            }}>Without MFA</div>
              <div style={{
              fontSize: '1.5rem',
              fontWeight: '700',
              color: '#ef4444'
            }}>{kpiStats.adminsWithoutMFA.toLocaleString()}</div>
            </div>
            <div>
              <div style={{
              fontSize: '0.75rem',
              color: '#6b7280',
              marginBottom: '0.5rem'
            }}>Adoption rate</div>
              <div style={{
              fontSize: '1.5rem',
              fontWeight: '700',
              color: '#111827'
            }}>
                {(() => {
                const avec = kpiStats.adminsWithMFA;
                const sans = kpiStats.adminsWithoutMFA;
                return avec + sans > 0 ? Math.round(avec / (avec + sans) * 100) : 0;
              })()}%
              </div>
            </div>
          </div>
          <div style={{
          fontSize: '0.75rem',
          color: '#6b7280',
          marginTop: '1rem',
          paddingTop: '0.75rem',
          borderTop: '1px solid #e5e7eb'
        }}>
            <div style={{
            marginBottom: '0.35rem'
          }}>Top 3 preferred methods</div>
            {kpiStats.top3Admin.length > 0 ? <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0.5rem',
            alignItems: 'center'
          }}>
                {kpiStats.top3Admin.map(({
              key,
              label,
              count
            }, i) => <span key={key} style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              fontSize: '0.75rem',
              color: '#111827'
            }}>
                    <Icon icon={getMfaMethodIconName(key)} style={{
                fontSize: '1rem',
                color: '#10b981'
              }} />
                    {label}
                    <span style={{
                color: '#6b7280',
                fontWeight: 600
              }}>({count})</span>
                  </span>)}
              </div> : <span style={{
            color: '#9ca3af'
          }}>-</span>}
          </div>
        </div>

        {}
        <div style={{
        flex: '1',
        minWidth: '280px',
        padding: '1.25rem',
        borderRadius: '12px',
        background: '#f9fafb',
        border: '1px solid #e5e7eb'
      }}>
          <div style={{
          fontSize: '0.85rem',
          fontWeight: '600',
          color: '#111827',
          marginBottom: '1rem'
        }}>
            Total non-admin users
          </div>
          <div style={{
          fontSize: '1.5rem',
          fontWeight: '700',
          color: '#111827',
          marginBottom: '1rem'
        }}>
            {(kpiStats.nonAdminWithMFA + kpiStats.nonAdminWithoutMFA).toLocaleString()}
          </div>
          <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '1.5rem'
        }}>
            <div>
              <div style={{
              fontSize: '0.75rem',
              color: '#6b7280',
              marginBottom: '0.5rem'
            }}>With MFA</div>
              <div style={{
              fontSize: '1.5rem',
              fontWeight: '700',
              color: '#10b981'
            }}>{kpiStats.nonAdminWithMFA.toLocaleString()}</div>
            </div>
            <div>
              <div style={{
              fontSize: '0.75rem',
              color: '#6b7280',
              marginBottom: '0.5rem'
            }}>Without MFA</div>
              <div style={{
              fontSize: '1.5rem',
              fontWeight: '700',
              color: '#ef4444'
            }}>{kpiStats.nonAdminWithoutMFA.toLocaleString()}</div>
            </div>
            <div>
              <div style={{
              fontSize: '0.75rem',
              color: '#6b7280',
              marginBottom: '0.5rem'
            }}>Adoption rate</div>
              <div style={{
              fontSize: '1.5rem',
              fontWeight: '700',
              color: '#111827'
            }}>
                {(() => {
                const avec = kpiStats.nonAdminWithMFA;
                const sans = kpiStats.nonAdminWithoutMFA;
                return avec + sans > 0 ? Math.round(avec / (avec + sans) * 100) : 0;
              })()}%
              </div>
            </div>
          </div>
          <div style={{
          fontSize: '0.75rem',
          color: '#6b7280',
          marginTop: '1rem',
          paddingTop: '0.75rem',
          borderTop: '1px solid #e5e7eb'
        }}>
            <div style={{
            marginBottom: '0.35rem'
          }}>Top 3 preferred methods</div>
            {kpiStats.top3NonAdmin.length > 0 ? <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0.5rem',
            alignItems: 'center'
          }}>
                {kpiStats.top3NonAdmin.map(({
              key,
              label,
              count
            }, i) => <span key={key} style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              fontSize: '0.75rem',
              color: '#111827'
            }}>
                    <Icon icon={getMfaMethodIconName(key)} style={{
                fontSize: '1rem',
                color: '#10b981'
              }} />
                    {label}
                    <span style={{
                color: '#6b7280',
                fontWeight: 600
              }}>({count})</span>
                  </span>)}
              </div> : <span style={{
            color: '#9ca3af'
          }}>-</span>}
          </div>
        </div>
      </div>

      {}
      <div style={{
      marginBottom: '1.5rem'
    }}>
        <h3 className={styles.subsectionTitle} style={{
        marginBottom: '0.75rem'
      }}>
          Recommendations to improve your score (Secure Score)
        </h3>
        {!clientId && <p style={{
        fontSize: '0.875rem',
        color: '#6b7280'
      }}>
            Client not identified · unable to load Graph recommendations.
          </p>}
        {clientId && recsLoading && <p style={{
        fontSize: '0.875rem',
        color: '#6b7280'
      }}>Loading Microsoft recommendations…</p>}
        {clientId && recsError && !recsLoading && <p style={{
        fontSize: '0.875rem',
        color: '#b45309'
      }}>{recsError}</p>}
        {clientId && !recsLoading && sortedSecureRecommendations.length > 0 && <div className={enterpriseStyles.equipmentTableSection}>
            <div className={enterpriseStyles.tableWrapper}>
              <div className={enterpriseStyles.tableScroll}>
                <table className={enterpriseStyles.equipmentTable} style={{
              minWidth: '720px'
            }}>
                  <thead>
                    <tr>
                      <th>
                        <button type="button" className={enterpriseStyles.equipmentTableSortButton} onClick={() => handleRecSort('priority')}>
                          Priority <RecSortIcon column="priority" />
                        </button>
                      </th>
                      <th>
                        <button type="button" className={enterpriseStyles.equipmentTableSortButton} onClick={() => handleRecSort('recommendation')}>
                          Recommendation <RecSortIcon column="recommendation" />
                        </button>
                      </th>
                      <th>
                        <button type="button" className={enterpriseStyles.equipmentTableSortButton} onClick={() => handleRecSort('category')}>
                          Category <RecSortIcon column="category" />
                        </button>
                      </th>
                      <th>
                        <button type="button" className={enterpriseStyles.equipmentTableSortButton} onClick={() => handleRecSort('state')}>
                          State <RecSortIcon column="state" />
                        </button>
                      </th>
                      <th>
                        <button type="button" className={enterpriseStyles.equipmentTableSortButton} onClick={() => handleRecSort('score')}>
                          Score actuel / max <RecSortIcon column="score" />
                        </button>
                      </th>
                      <th>
                        <button type="button" className={enterpriseStyles.equipmentTableSortButton} onClick={() => handleRecSort('remaining')}>
                          Points restants <RecSortIcon column="remaining" />
                        </button>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedSecureRecommendations.map((rec, idx) => {
                  const max = Number(rec.maxScore) || 0;
                  const cur = Number(rec.currentScore) ?? 0;
                  const remaining = Math.max(0, max - cur);
                  const title = rec.titleFr || rec.title || '-';
                  const remediation = rec.remediationFr || rec.remediation || '';
                  const rowKey = rec.id ?? `rec-${(recPage - 1) * recPageSize + idx}`;
                  return <tr key={rowKey}>
                          <td>
                            <span style={{
                        fontWeight: 600,
                        color: priorityColor(rec.priorityLabel),
                        fontSize: '0.8125rem'
                      }}>
                              {rec.priorityLabel || '-'}
                              {typeof rec.rank === 'number' ? <span className={enterpriseStyles.equipmentTableRank}>#{rec.rank}</span> : null}
                            </span>
                          </td>
                          <td className={enterpriseStyles.equipmentTableRecommendationCell}>
                            <div className={enterpriseStyles.equipmentTableCellTitle}>{title}</div>
                            {remediation ? <div className={enterpriseStyles.equipmentTableRemediation} dangerouslySetInnerHTML={{
                        __html: sanitizeRemediationHtml(remediation)
                      }} /> : null}
                          </td>
                          <td>{rec.categoryFr || rec.category || '-'}</td>
                          <td>{rec.stateLabel || '-'}</td>
                          <td style={{
                      whiteSpace: 'nowrap'
                    }}>
                            {Math.round(cur)} / {max}
                          </td>
                          <td style={{
                      fontWeight: 600
                    }}>{formatRemainingPoints(remaining)}</td>
                        </tr>;
                })}
                  </tbody>
                </table>
              </div>
            </div>
            <div className={enterpriseStyles.paginationBar}>
              <div className={enterpriseStyles.paginationLeft}>
                <span className={enterpriseStyles.paginationLabel}>Rows per page</span>
                <select className={enterpriseStyles.paginationSelect} value={recPageSize} onChange={e => setRecPageSize(Number(e.target.value))}>
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
              <div className={enterpriseStyles.paginationRight}>
                <button type="button" className={enterpriseStyles.paginationButton} onClick={() => setRecPage(p => Math.max(1, p - 1))} disabled={recPage <= 1} aria-label="Previous page">
                  <FaChevronLeft />
                </button>
                <span className={enterpriseStyles.paginationInfo}>
                  Page {recPage} / {recTotalPages}
                </span>
                <button type="button" className={enterpriseStyles.paginationButton} onClick={() => setRecPage(p => Math.min(recTotalPages, p + 1))} disabled={recPage >= recTotalPages} aria-label="Next page">
                  <FaChevronRight />
                </button>
              </div>
            </div>
          </div>}
        {clientId && !recsLoading && !recsError && sortedSecureRecommendations.length === 0 && <p style={{
        fontSize: '0.875rem',
        color: '#6b7280'
      }}>
            No recommendations returned by Microsoft for this tenant.
          </p>}
      </div>

      {}
      {(() => {
      const calculateMfaMethodStats = () => {
        if (!users || users.length === 0) return null;
        const methodCounts = {
          'phoneauthenticationmethod': 0,
          'microsoftauthenticatorauthenticationmethod': 0,
          'softwareoathauthenticationmethod': 0,
          'emailauthenticationmethod': 0
        };
        users.forEach(user => {
          if (user.mfaMethods && Array.isArray(user.mfaMethods)) {
            user.mfaMethods.forEach(method => {
              if (methodCounts.hasOwnProperty(method)) {
                methodCounts[method]++;
              }
            });
          }
        });
        return methodCounts;
      };
      const mfaMethodStats = calculateMfaMethodStats();
      const totalUsers = users?.length || 0;
      const getMethodDisplayInfo = methodType => {
        switch (methodType) {
          case 'microsoftauthenticatorauthenticationmethod':
            return {
              name: 'Authenticator',
              icon: 'mdi:cellphone'
            };
          case 'phoneauthenticationmethod':
            return {
              name: 'SMS/Appel',
              icon: 'mdi:phone'
            };
          case 'fido2authenticationmethod':
            return {
              name: 'FIDO2 key',
              icon: 'mdi:usb'
            };
          case 'softwareoathauthenticationmethod':
            return {
              name: 'Software OAuth',
              icon: 'mdi:shield-key'
            };
          case 'temporaryaccesspassauthenticationmethod':
            return {
              name: 'Passe Temp',
              icon: 'mdi:timer-sand'
            };
          case 'emailauthenticationmethod':
            return {
              name: 'Email',
              icon: 'mdi:email-outline'
            };
          default:
            return {
              name: methodType.replace('authenticationmethod', '').replace(/([A-Z])/g, ' $1').trim(),
              icon: 'mdi:help-circle'
            };
        }
      };
      if (mfaMethodStats && Object.keys(mfaMethodStats).some(key => mfaMethodStats[key] > 0)) {
        return <div style={{
          marginBottom: '1.5rem'
        }}>
              <h3 className={styles.subsectionTitle} style={{
            marginBottom: '0.75rem'
          }}>
                MFA authentication methods
              </h3>
              <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem'
          }}>
                {[['phoneauthenticationmethod', mfaMethodStats['phoneauthenticationmethod']], ['microsoftauthenticatorauthenticationmethod', mfaMethodStats['microsoftauthenticatorauthenticationmethod']], ['softwareoathauthenticationmethod', mfaMethodStats['softwareoathauthenticationmethod']], ['emailauthenticationmethod', mfaMethodStats['emailauthenticationmethod']]].filter(([methodType, count]) => count > 0).map(([methodType, count]) => {
              const percentage = totalUsers > 0 ? Math.round(count / totalUsers * 100) : 0;
              const methodInfo = getMethodDisplayInfo(methodType);
              return <div key={methodType} style={{
                padding: '1rem',
                borderRadius: '12px',
                background: '#f9fafb',
                border: '1px solid #e5e7eb',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                        <div style={{
                  fontSize: '0.85rem',
                  fontWeight: '600',
                  color: '#111827',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                          <Icon icon={methodInfo.icon} style={{
                    fontSize: '1rem',
                    color: '#10b981'
                  }} />
                          {methodInfo.name}
                        </div>
                        <div style={{
                  fontSize: '2rem',
                  fontWeight: '700',
                  color: '#111827',
                  display: 'flex',
                  alignItems: 'baseline',
                  gap: '0.35rem'
                }}>
                          <span>{count}</span>
                          <span style={{
                    fontSize: '1rem',
                    fontWeight: '600',
                    color: '#4b5563'
                  }}>
                            ({percentage}%)
                          </span>
                        </div>
                      </div>;
            })}
              </div>
            </div>;
      }
      return null;
    })()}

      {}
      {securityData?.defenderSecureScore && <div style={{
      marginBottom: '1.5rem',
      padding: '1.25rem',
      borderRadius: '12px',
      background: '#f9fafb',
      border: '1px solid #e5e7eb',
      display: 'flex',
      flexDirection: 'column',
      gap: '1rem'
    }}>
          <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
            <div style={{
          minWidth: '160px',
          flex: '1'
        }}>
              <div style={{
            fontSize: '0.85rem',
            fontWeight: '600',
            color: '#111827',
            marginBottom: '0.75rem'
          }}>
                Microsoft 365 Defender security score
              </div>
              <div style={{
            display: 'flex',
            alignItems: 'flex-end',
            gap: '0.5rem'
          }}>
                <div style={{
              fontSize: '3rem',
              fontWeight: '700',
              color: '#10b981',
              lineHeight: '1'
            }}>
                  {Math.round(securityData.defenderSecureScore.currentScore || 0)}
                </div>
                <div style={{
              fontSize: '0.9rem',
              color: '#6b7280'
            }}>
                  / {securityData.defenderSecureScore.maxScore || 0}
                </div>
              </div>
              {securityData.defenderSecureScore.percentage !== null && <div style={{
            fontSize: '0.85rem',
            color: '#374151',
            marginTop: '0.25rem',
            fontWeight: '600'
          }}>
                  {securityData.defenderSecureScore.percentage}% des points obtenus
                </div>}
              <div style={{
            marginTop: '0.75rem',
            width: '100%',
            height: '6px',
            background: '#e5e7eb',
            borderRadius: '999px'
          }}>
                <div style={{
              width: `${Math.min(100, Math.max(0, securityData.defenderSecureScore.percentage || 0))}%`,
              height: '100%',
              borderRadius: '999px',
              background: '#10b981'
            }} />
              </div>
            </div>
            
            {}
            {securityData.defenderSecureScore.averageComparativeScores && securityData.defenderSecureScore.averageComparativeScores.length > 0 && <div style={{
          flex: '1',
          minWidth: '200px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: '1rem'
        }}>
                {securityData.defenderSecureScore.averageComparativeScores.map((comparison, idx) => <div key={idx} style={{
            fontSize: '0.8rem',
            color: '#374151'
          }}>
                    <div style={{
              fontWeight: '600',
              marginBottom: '0.25rem'
            }}>
                      {comparison.basis === 'AllTenants' ? 'All organizations' : comparison.basis === 'TotalSeats' ? 'Similar organizations' : comparison.basis || 'Comparison'}
                    </div>
                    <div style={{
              fontSize: '1.25rem',
              fontWeight: '700',
              color: comparison.averageScore > (securityData.defenderSecureScore.currentScore || 0) ? '#ef4444' : '#10b981'
            }}>
                      {Math.round(comparison.averageScore || 0)}
                    </div>
                    <div style={{
              fontSize: '0.7rem',
              color: '#6b7280',
              marginTop: '0.25rem'
            }}>
                      Average
                    </div>
                  </div>)}
              </div>}
          </div>
          
          {}
          {securityData?.secureScoreHistory && securityData.secureScoreHistory.length > 0 && <div style={{
        marginTop: '1rem'
      }}>
              <div style={{
          fontSize: '0.8rem',
          fontWeight: '600',
          marginBottom: '0.5rem',
          color: '#374151'
        }}>
                Score history (last 30 days)
              </div>
              <div style={{
          height: '100px',
          display: 'flex',
          alignItems: 'flex-end',
          gap: '2px',
          padding: '0.5rem',
          background: '#ffffff',
          borderRadius: '8px',
          border: '1px solid #e5e7eb'
        }}>
                {securityData.secureScoreHistory.map((entry, idx) => {
            const maxPercentage = Math.max(...securityData.secureScoreHistory.map(e => e.percentage || 0));
            const height = maxPercentage > 0 ? (entry.percentage || 0) / maxPercentage * 100 : 0;
            return <div key={idx} style={{
              flex: 1,
              height: `${height}%`,
              minHeight: '4px',
              background: 'linear-gradient(180deg, #10b981, #059669)',
              borderRadius: '2px 2px 0 0',
              position: 'relative',
              cursor: 'pointer'
            }} title={`${new Date(entry.date).toLocaleDateString('en-GB')}: ${entry.percentage}% (${entry.score}/${entry.maxScore})`} />;
          })}
              </div>
            </div>}
        </div>}

    </div>;
}
