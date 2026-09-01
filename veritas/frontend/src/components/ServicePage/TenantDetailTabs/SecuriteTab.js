import React, { useMemo, useState, useEffect } from 'react';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa6';
import API_BASE_URL from '../../../config';
import { sanitizeRemediationHtml } from '../../../utils/sanitizeHtml';
import styles from '../TenantDetailPage.module.css';
import { getMfaUserForUser, getMfaMethods, userHasMfa, userIsAdmin } from '../mfaDetailsUtils';
function isLikelyServiceAccountFromUser(user) {
  const name = (user.name || user.displayName || '').toString();
  const upn = (user.userPrincipalName || user.email || '').toString();
  const email = (user.email || '').toString();
  const combined = `${name} ${upn} ${email}`.toLowerCase();
  const patterns = [/aad_/, /msol_/, /sync_/, /svc_/, /service_/, /\$@/, /_srv/, /_service/, /_sync/, /compte de service|service account|compte service/, /bot\./, /bot@/, /connector/, /automation/, /azure ad sync|ad sync|dirsync|aadconnect|dir sync/, /directory synchronization|synchronization service|on-premises/, /healthmailbox|systemmailbox|federatedemail/];
  return patterns.some(p => p.test(combined));
}
const MFA_METHOD_LABELS = {
  microsoftauthenticatorauthenticationmethod: 'Authenticator',
  phoneauthenticationmethod: 'SMS/Appel',
  fido2authenticationmethod: 'FIDO2 key',
  softwareoathauthenticationmethod: 'Software OAuth',
  temporaryaccesspassauthenticationmethod: 'Temporary pass',
  emailauthenticationmethod: 'Email'
};
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
export default function SecuriteTab({
  securityData,
  users,
  mfaDetails = [],
  clientId,
  theme,
  embedded = false
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
  }) => recSortColumn !== column ? null : <span>{recSortOrder === 'asc' ? ' â†‘' : ' â†“'}</span>;
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
      const methods = getMfaMethods(mfaUser);
      if (hasMfa) {
        usersWithMFA += 1;
        methods.forEach(m => {
          totalMethodCounts[m] = (totalMethodCounts[m] || 0) + 1;
        });
      } else usersWithoutMFA += 1;
      if (userIsAdmin(mfaUser)) {
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
        }}>âŒ Error loading security data</p>
          <p className={styles.textSecondary}>
            {securityData.error || 'Unknown error'}
          </p>
        </div>
      </div>;
  }
  const globalTotal = kpiStats.usersWithMFA + kpiStats.usersWithoutMFA;
  const adminTotal = kpiStats.adminsTotal;
  const nonAdminTotal = kpiStats.nonAdminWithMFA + kpiStats.nonAdminWithoutMFA;
  const rate = (withMfa, total) => total > 0 ? `${Math.round(withMfa / total * 100)}%` : "-";
  const recs = paginatedSecureRecommendations;

  return <div className={embedded ? styles.tabFill : undefined}>
      <h2 className={styles.sectionTitle}>Security</h2>
      <div className={styles.metricsRow4}>
        <div className={styles.metricItem}>
          <div className={styles.metricLabel}>Secure Score</div>
          <div className={styles.metricValue}>
            {identityScoreCurrent != null ? `${Math.round(identityScoreCurrent)} / ${identityScoreMax || 100}` : "-"}
          </div>
          {identityScorePercentage != null ? <div className={styles.mutedHint}>{Math.round(identityScorePercentage)}% obtained</div> : null}
        </div>
        <div className={styles.metricItem}>
          <div className={styles.metricLabel}>Global MFA</div>
          <div className={styles.metricValue}>{rate(kpiStats.usersWithMFA, globalTotal)}</div>
          <div className={styles.mutedHint}>{kpiStats.usersWithMFA} with Â· {kpiStats.usersWithoutMFA} without</div>
        </div>
        <div className={styles.metricItem}>
          <div className={styles.metricLabel}>Admin MFA</div>
          <div className={styles.metricValue}>{rate(kpiStats.adminsWithMFA, adminTotal)}</div>
          <div className={styles.mutedHint}>{kpiStats.adminsWithMFA} with Â· {kpiStats.adminsWithoutMFA} without</div>
        </div>
        <div className={styles.metricItem}>
          <div className={styles.metricLabel}>Non-admin MFA</div>
          <div className={styles.metricValue}>{rate(kpiStats.nonAdminWithMFA, nonAdminTotal)}</div>
          <div className={styles.mutedHint}>{kpiStats.nonAdminWithMFA} with Â· {kpiStats.nonAdminWithoutMFA} without</div>
        </div>
      </div>

      <h3 className={styles.kpiSectionBlockTitle}>Recommendations</h3>
      {!clientId ? <p className={styles.mutedHint}>Client not identified Â· unable to load Graph recommendations.</p> : null}
      {clientId && recsError && !recsLoading ? <p className={styles.mutedHint} style={{ color: '#b45309' }}>{recsError}</p> : null}
      <div className={`${styles.licensesTableContainer} ${embedded ? styles.tableFill : ""}`}>
        <table className={styles.licensesTable}>
          <thead>
            <tr>
              <th>
                <button type="button" className={styles.sortableTh} onClick={() => handleRecSort('priority')}>
                  Priority <RecSortIcon column="priority" />
                </button>
              </th>
              <th>
                <button type="button" className={styles.sortableTh} onClick={() => handleRecSort('recommendation')}>
                  Recommendation <RecSortIcon column="recommendation" />
                </button>
              </th>
              <th>
                <button type="button" className={styles.sortableTh} onClick={() => handleRecSort('category')}>
                  Category <RecSortIcon column="category" />
                </button>
              </th>
              <th>
                <button type="button" className={styles.sortableTh} onClick={() => handleRecSort('state')}>
                  Status <RecSortIcon column="state" />
                </button>
              </th>
              <th className={styles.textRight}>
                <button type="button" className={styles.sortableTh} onClick={() => handleRecSort('score')}>
                  Points <RecSortIcon column="score" />
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {recsLoading ? <tr>
                <td colSpan={5}>Loading Microsoft recommendationsâ€¦</td>
              </tr> : recs.length === 0 ? <tr>
                <td colSpan={5}>{recsError || "No recommendations returned for this tenant."}</td>
              </tr> : recs.map((rec, idx) => {
            const max = Number(rec.maxScore) || 0;
            const cur = Number(rec.currentScore) ?? 0;
            const title = rec.titleFr || rec.title || rec.displayName || "-";
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
                        {typeof rec.rank === 'number' ? ` #${rec.rank}` : null}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--msp-text)' }}>{title}</div>
                      {remediation ? <div className={styles.mutedHint} style={{ marginTop: '0.35rem' }} dangerouslySetInnerHTML={{
                __html: sanitizeRemediationHtml(remediation)
              }} /> : null}
                    </td>
                    <td>{rec.categoryFr || rec.category || "-"}</td>
                    <td>{rec.stateLabel || rec.state || "-"}</td>
                    <td className={styles.textRight}>{max != null ? max : "-"}</td>
                  </tr>;
          })}
          </tbody>
        </table>
      </div>

      {clientId && !recsLoading && sortedSecureRecommendations.length > recPageSize ? <div className={styles.pagination}>
          <button type="button" className={styles.paginationButton} onClick={() => setRecPage(p => Math.max(1, p - 1))} disabled={recPage <= 1} aria-label="Previous page">
            <FaChevronLeft />
          </button>
          <span className={styles.paginationInfo}>
            Page {recPage} / {recTotalPages}
          </span>
          <button type="button" className={styles.paginationButton} onClick={() => setRecPage(p => Math.min(recTotalPages, p + 1))} disabled={recPage >= recTotalPages} aria-label="Next page">
            <FaChevronRight />
          </button>
        </div> : null}
    </div>;
}
