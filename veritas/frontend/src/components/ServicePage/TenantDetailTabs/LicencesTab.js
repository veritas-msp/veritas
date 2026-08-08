import React, { useState, useMemo } from 'react';
import { FaSort, FaSortUp, FaSortDown, FaGift } from 'react-icons/fa';
import SmartTooltip from '../../SmartTooltip';
import styles from '../TenantDetailPage.module.css';
import { getLicenseDisplayName, isFreeLicense } from './utils';
export default function LicensesTab({
  licences,
  dashboardMetrics,
  theme
}) {
  const [sortColumn, setSortColumn] = useState('total');
  const [sortDirection, setSortDirection] = useState('desc');
  const totalLicenses = dashboardMetrics?.totalLicenses ?? 0;
  const usedLicenses = dashboardMetrics?.usedLicenses ?? 0;
  const usageRate = totalLicenses > 0 ? Math.round(usedLicenses / totalLicenses * 100) : 0;
  const availableLicenses = totalLicenses - usedLicenses;
  const handleLicenseSort = column => {
    if (sortColumn === column) {
      setSortDirection(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection(column === 'type' ? 'asc' : 'desc');
    }
  };
  const getSortIcon = column => {
    if (sortColumn !== column) {
      return <FaSort style={{
        fontSize: '0.75rem',
        opacity: 0.4,
        marginLeft: '0.25rem'
      }} />;
    }
    return sortDirection === 'asc' ? <FaSortUp style={{
      fontSize: '0.75rem',
      marginLeft: '0.25rem',
      color: '#15D1A0'
    }} /> : <FaSortDown style={{
      fontSize: '0.75rem',
      marginLeft: '0.25rem',
      color: '#15D1A0'
    }} />;
  };
  const filteredAndSortedLicenses = useMemo(() => {
    const filtered = licences.filter(lic => {
      const total = lic.total || 0;
      return total < 10000 && total > 0;
    });
    const dir = sortDirection === 'asc' ? 1 : -1;
    return [...filtered].sort((a, b) => {
      const totalA = a.total || 0,
        totalB = b.total || 0;
      const usedA = a.utilisees || 0,
        usedB = b.utilisees || 0;
      const availA = Math.max(0, totalA - usedA),
        availB = Math.max(0, totalB - usedB);
      const rateA = totalA > 0 ? Math.round(usedA / totalA * 100) : 0;
      const rateB = totalB > 0 ? Math.round(usedB / totalB * 100) : 0;
      const nameA = (getLicenseDisplayName(a.nom || a.displayName) || '').toLowerCase();
      const nameB = (getLicenseDisplayName(b.nom || b.displayName) || '').toLowerCase();
      let cmp = 0;
      switch (sortColumn) {
        case 'type':
          cmp = nameA < nameB ? -1 : nameA > nameB ? 1 : 0;
          break;
        case 'total':
          cmp = totalA - totalB;
          break;
        case 'used':
          cmp = usedA - usedB;
          break;
        case 'available':
          cmp = availA - availB;
          break;
        case 'usageRate':
          cmp = rateA - rateB;
          break;
        default:
          cmp = totalB - totalA;
      }
      return cmp * dir;
    });
  }, [licences, sortColumn, sortDirection]);
  return <section className={styles.kpiSection}>
      <h2 className={styles.sectionTitle}>License information</h2>
      {licences.length > 0 ? <>
          {}
          {dashboardMetrics && <div className={styles.statsCards} style={{
        marginBottom: '1rem'
      }}>
              <div className={styles.statCard}>
                <div className={styles.statCardContent}>
                  <div className={styles.statCardLabel}>Total licenses</div>
                  <div className={styles.statCardValue}>{totalLicenses.toLocaleString()}</div>
                </div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statCardContent}>
                  <div className={styles.statCardLabel}>Licenses used</div>
                  <div className={styles.statCardValue} style={{
              color: '#f59e0b'
            }}>{usedLicenses.toLocaleString()}</div>
                </div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statCardContent}>
                  <div className={styles.statCardLabel}>Licenses available</div>
                  <div className={styles.statCardValue}>{availableLicenses.toLocaleString()}</div>
                </div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statCardContent}>
                  <div className={styles.statCardLabel}>Usage rate</div>
                  <div className={styles.statCardValue}>{usageRate}%</div>
                </div>
              </div>
            </div>}

          {}
          <div className={styles.licensesTableContainer}>
            <table className={styles.licensesTable}>
              <thead>
                <tr>
                  <th onClick={() => handleLicenseSort('type')} style={{
                cursor: 'pointer'
              }}>
                    License type {getSortIcon('type')}
                  </th>
                  <th onClick={() => handleLicenseSort('used')} style={{
                cursor: 'pointer'
              }}>
                    Used {getSortIcon('used')}
                  </th>
                  <th onClick={() => handleLicenseSort('total')} style={{
                cursor: 'pointer'
              }}>
                    Total {getSortIcon('total')}
                  </th>
                  <th onClick={() => handleLicenseSort('available')} style={{
                cursor: 'pointer'
              }}>
                    Available {getSortIcon('available')}
                  </th>
                  <th onClick={() => handleLicenseSort('usageRate')} style={{
                cursor: 'pointer'
              }}>
                    Usage rate {getSortIcon('usageRate')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredAndSortedLicenses.map((lic, idx) => {
              const total = lic.total || 0;
              const used = lic.utilisees || 0;
              const available = Math.max(0, total - used);
              const usageRate = total > 0 ? Math.round(used / total * 100) : 0;
              const freeLicense = isFreeLicense(lic);
              let statusColor = '#10b981';
              if (!freeLicense) {
                if (available >= 3) {
                  statusColor = '#f59e0b';
                } else if (usageRate >= 90) {
                  statusColor = '#10b981';
                } else if (usageRate < 50 && total > 0) {
                  statusColor = '#ef4444';
                }
              }
              return <tr key={idx}>
                        <td>
                          <div style={{
                    fontWeight: 500,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}>
                            {getLicenseDisplayName(lic.nom || lic.displayName)}
                            {freeLicense && <SmartTooltip as="span" content="Free license">
                                <span style={{
                        display: 'inline-flex'
                      }}>
                                  <FaGift style={{
                          fontSize: '0.875rem',
                          color: '#15D1A0',
                          flexShrink: 0
                        }} />
                                </span>
                              </SmartTooltip>}
                          </div>
                        </td>
                        <td>
                          <span style={{
                    color: statusColor,
                    fontWeight: 500
                  }}>
                            {used.toLocaleString()}
                          </span>
                        </td>
                        <td>
                          <span style={{
                    fontWeight: 500
                  }}>
                            {total.toLocaleString()}
                          </span>
                        </td>
                        <td>
                          <span style={{
                    fontWeight: 500
                  }}>
                            {available.toLocaleString()}
                          </span>
                        </td>
                        <td>
                          <div className={styles.progressBarContainer}>
                            <div className={styles.progressBarFill} style={{
                      width: `${Math.max(usageRate, 0)}%`,
                      background: statusColor
                    }} />
                            <span className={styles.progressTextInside}>{usageRate}%</span>
                          </div>
                        </td>
                      </tr>;
            })}
              </tbody>
            </table>
          </div>

          {}
          {(() => {
        const expiringLicenses = licences.filter(lic => {
          if (!lic.expirationDate) return false;
          const expDate = new Date(lic.expirationDate);
          if (Number.isNaN(expDate.getTime())) return false;
          const daysUntilExpiry = (expDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
          return daysUntilExpiry > 0 && daysUntilExpiry <= 90;
        });
        if (expiringLicenses.length === 0) return null;
        return <div style={{
          marginTop: '1rem',
          padding: '1rem',
          borderRadius: '8px',
          background: theme === 'dark' ? '#450a0a' : '#fef2f2',
          border: '1px solid #ef4444'
        }}>
                <h3 style={{
            margin: '0 0 0.5rem 0',
            fontSize: '0.9rem',
            fontWeight: 600,
            color: '#ef4444'
          }}>
                  Licenses expiring soon
                </h3>
                <ul style={{
            margin: 0,
            paddingLeft: '1.5rem',
            color: theme === 'dark' ? '#fca5a5' : '#dc2626',
            fontSize: '0.85rem'
          }}>
                  {expiringLicenses.map((lic, idx) => <li key={idx}>
                      {getLicenseDisplayName(lic.nom || lic.displayName)} - Expires on{' '}
                      {new Date(lic.expirationDate).toLocaleDateString('en-GB')}
                    </li>)}
                </ul>
              </div>;
      })()}
        </> : <div className={styles.noDataMessage}>
          <p>No licenses available. Please sync the data.</p>
        </div>}
    </section>;
}
