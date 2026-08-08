import React, { useState, useEffect } from 'react';
import styles from '../O365.module.css';
import { getLicenseDisplayName, getSortedUsers, formatDate } from './utils';
export default function UsersTab({
  users,
  dashboardMetrics,
  theme,
  sortColumn,
  sortDirection,
  handleSort,
  getSortIcon,
  renderCommentSection,
  renderSyncPlaceholder
}) {
  const [usersPagination, setUsersPagination] = useState(1);
  useEffect(() => {
    setUsersPagination(1);
  }, [sortColumn, sortDirection]);
  if (!users || users.length === 0) {
    return <div className={styles.usersSection} style={{
      position: 'relative'
    }}>
                <h4 className={styles.sectionTitle} style={{
        marginBottom: '0.5rem'
      }}>Users</h4>
                <div style={{
        width: '100%',
        height: '1px',
        background: theme === 'dark' ? '#4a4a6a' : '#e5e7eb',
        marginBottom: '1rem'
      }} />
                {renderSyncPlaceholder ? renderSyncPlaceholder() : <div className={styles.noDataMessage}>
                        <p>No user available. Please sync the data.</p>
                    </div>}
                {renderCommentSection && renderCommentSection('utilisateurs', 'Users')}
            </div>;
  }
  const sortedUsers = getSortedUsers(users, sortColumn, sortDirection);
  const usersPerPage = 10;
  const totalPages = Math.ceil(sortedUsers.length / usersPerPage);
  const startIndex = (usersPagination - 1) * usersPerPage;
  const endIndex = startIndex + usersPerPage;
  const paginatedUsers = sortedUsers.slice(startIndex, endIndex);
  return <div className={styles.usersSection} style={{
    position: 'relative'
  }}>
            <h4 className={styles.sectionTitle} style={{
      marginBottom: '0.5rem'
    }}>Users</h4>
            <div style={{
      width: '100%',
      height: '1px',
      background: theme === 'dark' ? '#4a4a6a' : '#e5e7eb',
      marginBottom: '1rem'
    }} />
            
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
                            {users.length.toLocaleString()}
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
                            {dashboardMetrics?.activeUsers30?.toLocaleString() || 0}
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
                            {dashboardMetrics?.activeUsers90?.toLocaleString() || 0}
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
                            {dashboardMetrics?.adoptionRate || 0}%
                        </div>
                    </div>
                    {(() => {
          const blockedUsers = users.filter(u => u.accountEnabled === false).length;
          const inactiveUsers90 = users.filter(u => {
            const lastLogin = u.lastLoginDate ? new Date(u.lastLoginDate) : null;
            const period90Days = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
            return !lastLogin || lastLogin < period90Days;
          }).length;
          return <>
                                {blockedUsers > 0 && <div>
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
                                            {blockedUsers}
                                        </div>
                                    </div>}
                                {inactiveUsers90 > 0 && <div>
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
                                            {inactiveUsers90}
                                        </div>
                                    </div>}
                            </>;
        })()}
                </div>
            </div>
            
            <div className={styles.licensesTableContainer}>
                <table className={styles.licensesTable}>
                    <thead>
                        <tr>
                            <th style={{
              cursor: 'pointer',
              userSelect: 'none',
              width: '150px',
              maxWidth: '150px'
            }} onClick={() => handleSort('nom')}>
                                <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                                    <span>Name</span>
                                    {getSortIcon('nom')}
                                </div>
                            </th>
                            <th style={{
              cursor: 'pointer',
              userSelect: 'none'
            }} onClick={() => handleSort('email')}>
                                <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                                    <span>Email</span>
                                    {getSortIcon('email')}
                                </div>
                            </th>
                            <th style={{
              cursor: 'pointer',
              userSelect: 'none'
            }} onClick={() => handleSort('dateCreation')}>
                                <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                                    <span>Created on</span>
                                    {getSortIcon('dateCreation')}
                                </div>
                            </th>
                            <th style={{
              cursor: 'pointer',
              userSelect: 'none'
            }} onClick={() => handleSort('derniereLogin')}>
                                <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                                    <span>Last connection</span>
                                    {getSortIcon('derniereLogin')}
                                </div>
                            </th>
                            <th style={{
              cursor: 'pointer',
              userSelect: 'none'
            }} onClick={() => handleSort('statut')}>
                                <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                                    <span>Status</span>
                                    {getSortIcon('statut')}
                                </div>
                            </th>
                            <th style={{
              cursor: 'pointer',
              userSelect: 'none'
            }} onClick={() => handleSort('licence')}>
                                <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                                    <span>License</span>
                                    {getSortIcon('licence')}
                                </div>
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {paginatedUsers.map((user, idx) => {
            const lastLogin = user.lastLoginDate ? new Date(user.lastLoginDate) : null;
            const createdDate = user.createdDate ? new Date(user.createdDate) : null;
            const period90Days = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
            const isInactive = !lastLogin || lastLogin < period90Days;
            const period30Days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
            const isActive30 = lastLogin && lastLogin >= period30Days;
            return <tr key={startIndex + idx}>
                                    <td style={{
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                width: '150px',
                maxWidth: '150px'
              }}>
                                        {user.name || user.displayName || 'N/A'}
                                    </td>
                                    <td style={{
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}>
                                        {user.email || user.userPrincipalName || 'N/A'}
                                    </td>
                                    <td>{createdDate ? formatDate(createdDate) : 'N/A'}</td>
                                    <td>{lastLogin ? formatDate(lastLogin) : 'JaMays'}</td>
                                    <td>
                                        <span style={{
                  padding: '0.25rem 0.5rem',
                  borderRadius: '4px',
                  fontSize: '0.75rem',
                  backgroundColor: user.accountEnabled === false ? '#fee2e2' : isActive30 ? '#d1fae5' : isInactive ? '#fef3c7' : '#e0e7ff',
                  color: user.accountEnabled === false ? '#dc2626' : isActive30 ? '#059669' : isInactive ? '#d97706' : '#4338ca',
                  fontWeight: '500'
                }}>
                                            {user.accountEnabled === false ? 'Blocked' : isActive30 ? 'Active' : isInactive ? 'Inactive (>90j)' : 'Inactive'}
                                        </span>
                                    </td>
                                    <td style={{
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}>
                                        {user.licenses ? user.licenses.split(', ').map(lic => getLicenseDisplayName(lic.trim())).join(', ') : 'None'}
                                    </td>
                                </tr>;
          })}
                    </tbody>
                </table>
            </div>
            
            {}
            {totalPages > 1 && <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      gap: '1rem',
      marginTop: '1rem',
      padding: '1rem'
    }}>
                    <button onClick={() => setUsersPagination(prev => Math.max(1, prev - 1))} disabled={usersPagination === 1} style={{
        padding: '0.5rem 1rem',
        background: usersPagination === 1 ? theme === 'dark' ? '#2a2a4a' : '#f3f4f6' : theme === 'dark' ? '#3b82f6' : '#3b82f6',
        color: usersPagination === 1 ? theme === 'dark' ? '#6b7280' : '#9ca3af' : '#ffffff',
        border: 'none',
        borderRadius: '6px',
        cursor: usersPagination === 1 ? 'not-allowed' : 'pointer',
        fontSize: '0.875rem',
        fontWeight: '500',
        transition: 'all 0.2s ease'
      }}>
                        Previous
                    </button>
                    
                    <span style={{
        fontSize: '0.875rem',
        color: theme === 'dark' ? '#d1d5db' : '#374151',
        fontWeight: '500'
      }}>
                        Page {usersPagination} of {totalPages}
                    </span>
                    
                    <button onClick={() => setUsersPagination(prev => Math.min(totalPages, prev + 1))} disabled={usersPagination === totalPages} style={{
        padding: '0.5rem 1rem',
        background: usersPagination === totalPages ? theme === 'dark' ? '#2a2a4a' : '#f3f4f6' : theme === 'dark' ? '#3b82f6' : '#3b82f6',
        color: usersPagination === totalPages ? theme === 'dark' ? '#6b7280' : '#9ca3af' : '#ffffff',
        border: 'none',
        borderRadius: '6px',
        cursor: usersPagination === totalPages ? 'not-allowed' : 'pointer',
        fontSize: '0.875rem',
        fontWeight: '500',
        transition: 'all 0.2s ease'
      }}>
                        Next
                    </button>
                </div>}

            {}
            {renderCommentSection && renderCommentSection('utilisateurs', 'Users')}
        </div>;
}
