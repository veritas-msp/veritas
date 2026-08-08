import React, { useState, useMemo } from 'react';
import { FaSort, FaSortUp, FaSortDown } from 'react-icons/fa';
import { Icon } from '@iconify/react';
import styles from '../O365.module.css';
import { getPriorityLabel, getPriorityColorValue, computePriorityLevel } from './utils';
export default function SecuriteTab({
  securityData,
  users,
  theme,
  identityScoreCurrent,
  identityScoreMax,
  identityScorePercentage,
  manualSecurityScore,
  editingSecurityScore,
  editingSecurityScoreValue,
  setEditingSecurityScore,
  setEditingSecurityScoreValue,
  setManualSecurityScore,
  update,
  renderCommentSection,
  renderSyncPlaceholder
}) {
  const [recommendationSort, setRecommendationSort] = useState({
    column: 'points',
    direction: 'desc'
  });
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
      marginLeft: '0.35rem'
    };
    if (recommendationSort.column !== column) {
      return <FaSort style={iconStyle} />;
    }
    return recommendationSort.direction === 'desc' ? <FaSortDown style={iconStyle} /> : <FaSortUp style={iconStyle} />;
  };
  return <div className={styles.securitySection} style={{
    position: 'relative'
  }}>
            <h4 className={styles.sectionTitle} style={{
      marginBottom: '0.5rem'
    }}>Security</h4>
            <div style={{
      width: '100%',
      height: '1px',
      background: theme === 'dark' ? '#4a4a6a' : '#e5e7eb',
      marginBottom: '1rem'
    }} />
            
            {securityData ? <>
                    {}
                    {identityScoreCurrent !== null && <div style={{
        marginBottom: '1.5rem',
        padding: '1rem',
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
                                Overall security grade (editable)
                            </div>
                            <div style={{
          display: 'flex',
          alignItems: 'flex-end',
          gap: '0.5rem',
          marginBottom: '0.5rem'
        }}>
                                {editingSecurityScore ? <input type="number" min="0" max={identityScoreMax || 100} value={editingSecurityScoreValue !== null ? editingSecurityScoreValue : identityScoreCurrent ?? ''} onChange={e => setEditingSecurityScoreValue(e.target.value)} onBlur={() => {
            if (editingSecurityScoreValue !== null) {
              const score = Math.max(0, Math.min(identityScoreMax || 100, parseInt(editingSecurityScoreValue, 10) || 0));
              const percentage = identityScoreMax ? Math.round(score / identityScoreMax * 1000) / 10 : null;
              setManualSecurityScore(percentage);
              update({
                manualSecurityScore: percentage
              });
            }
            setEditingSecurityScore(false);
            setEditingSecurityScoreValue(null);
          }} onKeyDown={e => {
            if (e.key === 'Enter') {
              if (editingSecurityScoreValue !== null) {
                const score = Math.max(0, Math.min(identityScoreMax || 100, parseInt(editingSecurityScoreValue, 10) || 0));
                const percentage = identityScoreMax ? Math.round(score / identityScoreMax * 1000) / 10 : null;
                setManualSecurityScore(percentage);
                update({
                  manualSecurityScore: percentage
                });
              }
              setEditingSecurityScore(false);
              setEditingSecurityScoreValue(null);
            } else if (e.key === 'Escape') {
              setEditingSecurityScore(false);
              setEditingSecurityScoreValue(null);
            }
          }} autoFocus style={{
            fontSize: '2.5rem',
            fontWeight: '700',
            color: theme === 'dark' ? '#f9fafb' : '#111827',
            lineHeight: '1',
            width: '100px',
            border: `2px solid ${theme === 'dark' ? '#4a4a6a' : '#e5e7eb'}`,
            borderRadius: '4px',
            padding: '0.25rem',
            background: theme === 'dark' ? '#2d2d4f' : '#ffffff',
            textAlign: 'center'
          }} onFocus={e => e.target.select()} /> : <div role="button" tabIndex={identityScoreCurrent !== null ? 0 : -1} onKeyDown={e => {
            if (identityScoreCurrent !== null && (e.key === 'Enter' || e.key === ' ')) {
              e.preventDefault();
              setEditingSecurityScore(true);
              setEditingSecurityScoreValue(identityScoreCurrent);
            }
          }} onClick={() => {
            if (identityScoreCurrent !== null) {
              setEditingSecurityScore(true);
              setEditingSecurityScoreValue(identityScoreCurrent);
            }
          }} title={identityScoreCurrent !== null ? "Click to edit the score" : ""} style={{
            cursor: identityScoreCurrent !== null ? 'pointer' : 'default',
            outline: 'none',
            display: 'flex',
            alignItems: 'flex-end',
            gap: '0.5rem'
          }}>
                                        <div style={{
              fontSize: '2.5rem',
              fontWeight: '700',
              color: theme === 'dark' ? '#f9fafb' : '#111827',
              lineHeight: '1'
            }}>
                                            {identityScoreCurrent !== null ? Math.round(identityScoreCurrent) : '-'}
                                        </div>
                                        <div style={{
              fontSize: '1rem',
              color: theme === 'dark' ? '#d1d5db' : '#6b7280',
              fontWeight: '500',
              marginBottom: '0.25rem'
            }}>
                                            / {identityScoreMax || 100}
                                        </div>
                                    </div>}
                            </div>
                            {identityScorePercentage !== null && <>
                                    <div style={{
            fontSize: '0.9rem',
            fontWeight: '600',
            color: theme === 'dark' ? '#d1d5db' : '#111827',
            marginTop: '0.5rem'
          }}>
                                        {Math.round(identityScorePercentage)}% des points obtenus
                                    </div>
                                    <div style={{
            marginTop: '0.75rem',
            width: '100%',
            height: '6px',
            background: theme === 'dark' ? '#1f2937' : '#e5e7eb',
            borderRadius: '999px'
          }}>
                                        <div style={{
              width: `${Math.min(100, Math.max(0, identityScorePercentage))}%`,
              height: '100%',
              borderRadius: '999px',
              background: 'linear-gradient(90deg, #10b981, #2563eb)'
            }} />
                                    </div>
                                </>}
                        </div>}

                    {}
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
                                Total
                            </div>
                            <div style={{
            fontSize: '2rem',
            fontWeight: '700',
            color: theme === 'dark' ? '#f9fafb' : '#111827',
            marginBottom: '0.5rem'
          }}>
                                {users?.length || 0}
                            </div>
                            <div style={{
            fontSize: '0.75rem',
            color: theme === 'dark' ? '#9ca3af' : '#6b7280',
            marginBottom: '0.5rem'
          }}>
                                MFA: <strong style={{
              color: theme === 'dark' ? '#f9fafb' : '#111827'
            }}>{securityData.mfa?.usersWithMFA || 0}</strong> | Taux: <strong style={{
              color: theme === 'dark' ? '#f9fafb' : '#111827'
            }}>{(() => {
                const totalUsers = users?.length || 0;
                const usersWithMFA = securityData.mfa?.usersWithMFA || 0;
                return totalUsers > 0 ? Math.round(usersWithMFA / totalUsers * 100) : 0;
              })()}%</strong>
                            </div>
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
                                        {securityData.mfa?.usersWithMFA?.toLocaleString() || 0}
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
                                        {securityData.mfa?.usersWithoutMFA?.toLocaleString() || 0}
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
                  const totalUsers = users?.length || 0;
                  const usersWithMFA = securityData.mfa?.usersWithMFA || 0;
                  return totalUsers > 0 ? Math.round(usersWithMFA / totalUsers * 100) : 0;
                })()}%
                                    </div>
                                </div>
                            </div>
                        </div>
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
            case 'softwareoathauthenticationmethod':
              return {
                name: 'Software OAuth',
                icon: 'mdi:shield-key'
              };
            case 'emailauthenticationmethod':
              return {
                name: 'Email',
                icon: 'mdi:email-outline'
              };
            default:
              return {
                name: methodType,
                icon: 'mdi:help-circle'
              };
          }
        };
        if (mfaMethodStats && Object.keys(mfaMethodStats).some(key => mfaMethodStats[key] > 0)) {
          return <div style={{
            marginBottom: '1.5rem'
          }}>
                                    <h5 style={{
              margin: 0,
              fontSize: '0.9rem',
              fontWeight: '600',
              marginBottom: '0.75rem'
            }}>
                                        MFA authentication methods
                                    </h5>
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
                  background: theme === 'dark' ? '#2d2d4f' : '#f9fafb',
                  border: `1px solid ${theme === 'dark' ? '#4a4a6a' : '#e5e7eb'}`,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                                                        <div style={{
                    fontSize: '0.85rem',
                    fontWeight: '600',
                    color: theme === 'dark' ? '#f9fafb' : '#111827',
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
                    color: theme === 'dark' ? '#f9fafb' : '#111827'
                  }}>
                                                            {count}
                                                        </div>
                                                        <div style={{
                    fontSize: '0.75rem',
                    color: theme === 'dark' ? '#9ca3af' : '#6b7280'
                  }}>
                                                            {percentage}% des utilisateurs
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
        padding: '1rem',
        borderRadius: '12px',
        background: theme === 'dark' ? '#2d2d4f' : '#f9fafb',
        border: `2px solid ${theme === 'dark' ? '#4a4a6a' : '#e5e7eb'}`,
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
              color: theme === 'dark' ? '#f9fafb' : '#111827',
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
                color: theme === 'dark' ? '#d1d5db' : '#6b7280'
              }}>
                                            / {securityData.defenderSecureScore.maxScore || 0}
                                        </div>
                                    </div>
                                    {securityData.defenderSecureScore.percentage !== null && <div style={{
              fontSize: '0.85rem',
              color: theme === 'dark' ? '#d1d5db' : '#374151',
              marginTop: '0.25rem',
              fontWeight: '600'
            }}>
                                            {securityData.defenderSecureScore.percentage}% des points obtenus
                                        </div>}
                                    <div style={{
              marginTop: '0.75rem',
              width: '100%',
              height: '6px',
              background: theme === 'dark' ? '#1f2937' : '#e5e7eb',
              borderRadius: '999px'
            }}>
                                        <div style={{
                width: `${Math.min(100, Math.max(0, securityData.defenderSecureScore.percentage || 0))}%`,
                height: '100%',
                borderRadius: '999px',
                background: 'linear-gradient(90deg, #10b981, #059669)'
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
              color: theme === 'dark' ? '#d1d5db' : '#374151'
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
                color: theme === 'dark' ? '#9ca3af' : '#6b7280',
                marginTop: '0.25rem'
              }}>
                                                    Moyenne
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
            color: theme === 'dark' ? '#d1d5db' : '#374151'
          }}>
                                        Score history (last 30 days)
                                    </div>
                                    <div style={{
            height: '100px',
            display: 'flex',
            alignItems: 'flex-end',
            gap: '2px',
            padding: '0.5rem',
            background: theme === 'dark' ? '#1e1e3f' : '#ffffff',
            borderRadius: '8px',
            border: `1px solid ${theme === 'dark' ? '#4a4a6a' : '#e5e7eb'}`
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
              }} title={`${new Date(entry.date).toLocaleDateString('en-US')}: ${entry.percentage}% (${entry.score}/${entry.maxScore})`} />;
            })}
                                    </div>
                                </div>}
                        </div>}

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
                            <div className={styles.licensesTableContainer}>
                                <table className={styles.licensesTable}>
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
                </> : renderSyncPlaceholder ? renderSyncPlaceholder() : <div className={styles.noDataMessage}>
                        <p>No security data available. Please sync the data.</p>
                    </div>}
            
            {}
            {renderCommentSection && renderCommentSection('securite', 'Security')}
        </div>;
}
