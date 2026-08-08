import React, { useState } from 'react';
import { Icon } from '@iconify/react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from 'recharts';
import styles from '../TenantDetailPage.module.css';
export default function ExchangeTab({
  exchangeData,
  theme
}) {
  const [emailActivityViewMode, setEmailActivityViewMode] = useState('day');
  if (!exchangeData) {
    return <div className={styles.exchangeSection} style={{
      position: 'relative'
    }}>
        <h4 className={styles.sectionTitle} style={{
        marginBottom: '0.5rem'
      }}>Exchange Online / Outlook</h4>
        <div className={styles.noDataMessage}>
          <p>No Exchange data available.</p>
          <p style={{
          fontSize: '0.875rem',
          color: theme === 'dark' ? '#9ca3af' : '#6b7280',
          marginTop: '0.5rem'
        }}>
            Exchange data is not present in the snapshot. Please run a <strong>full sync</strong> using the sync button to load and save this data.
          </p>
        </div>
      </div>;
  }
  if (exchangeData.success === false) {
    return <div className={styles.exchangeSection} style={{
      position: 'relative'
    }}>
        <h4 className={styles.sectionTitle} style={{
        marginBottom: '0.5rem'
      }}>Exchange Online / Outlook</h4>
        <div className={styles.noDataMessage}>
          <p style={{
          color: '#ef4444'
        }}>❌ Error loading Exchange data</p>
          <p style={{
          fontSize: '0.875rem',
          color: theme === 'dark' ? '#9ca3af' : '#6b7280',
          marginTop: '0.5rem'
        }}>
            {exchangeData.error || 'Unknown error'}
          </p>
        </div>
      </div>;
  }
  if (!exchangeData.emailActivity || exchangeData.emailActivity.sent === 0 && exchangeData.emailActivity.received === 0 && exchangeData.emailActivity.read === 0) {
    return <div className={styles.exchangeSection} style={{
      position: 'relative'
    }}>
        <h4 className={styles.sectionTitle} style={{
        marginBottom: '0.5rem'
      }}>Exchange Online / Outlook</h4>
        <div className={styles.noDataMessage}>
          <p>No Exchange data available. Please sync the data.</p>
        </div>
      </div>;
  }
  const bytesToGB = bytes => {
    if (!bytes || bytes === 0) return 0;
    return bytes / (1024 * 1024 * 1024);
  };
  const hasQuotaData = !!(exchangeData.mailboxes?.quotas && exchangeData.mailboxes.quotas.length > 0);
  const quotaRanges = {
    '> 50 GB': 0,
    '25 - 50 GB': 0,
    '10 - 25 GB': 0,
    '5 - 10 GB': 0,
    '< 5 GB': 0
  };
  if (hasQuotaData) {
    exchangeData.mailboxes.quotas.forEach(quota => {
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
  }
  const quotaPieData = hasQuotaData ? Object.entries(quotaRanges).filter(([_, value]) => value > 0).map(([name, value]) => ({
    name,
    value
  })) : [];
  const QUOTA_COLORS = {
    '> 50 GB': '#ef4444',
    '25 - 50 GB': '#f59e0b',
    '10 - 25 GB': '#3b82f6',
    '5 - 10 GB': '#10b981',
    '< 5 GB': '#6b7280'
  };
  const QuotaTooltip = ({
    active,
    payload
  }) => {
    if (active && payload && payload.length) {
      return <div style={{
        background: '#ffffff',
        padding: '0.75rem',
        borderRadius: '8px',
        border: '1px solid #e5e7eb',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
      }}>
          <p style={{
          margin: 0,
          fontWeight: '600',
          color: '#111827',
          marginBottom: '0.25rem'
        }}>
            {payload[0].name}
          </p>
          <p style={{
          margin: 0,
          color: '#374151',
          fontSize: '0.875rem'
        }}>
            {payload[0].value} user{payload[0].value > 1 ? 's' : ''}
          </p>
        </div>;
    }
    return null;
  };
  const weeklyStats = exchangeData.emailActivity?.weeklyStats || null;
  let weeklySummary = null;
  if (weeklyStats) {
    const weeklyData = [{
      jour: 'Monday',
      ...(weeklyStats.lundi || {})
    }, {
      jour: 'Tuesday',
      ...(weeklyStats.mardi || {})
    }, {
      jour: 'Wednesday',
      ...(weeklyStats.mercredi || {})
    }, {
      jour: 'Thursday',
      ...(weeklyStats.jeudi || {})
    }, {
      jour: 'Friday',
      ...(weeklyStats.vendredi || {})
    }, {
      jour: 'Saturday',
      ...(weeklyStats.samedi || {})
    }, {
      jour: 'Sunday',
      ...(weeklyStats.dimanche || {})
    }];
    const maxReceived = weeklyData.reduce((max, day) => (day.received || 0) > (max.received || 0) ? day : max, weeklyData[0]);
    const maxSent = weeklyData.reduce((max, day) => (day.sent || 0) > (max.sent || 0) ? day : max, weeklyData[0]);
    const maxRead = weeklyData.reduce((max, day) => (day.read || 0) > (max.read || 0) ? day : max, weeklyData[0]);
    weeklySummary = {
      maxReceived,
      maxSent,
      maxRead
    };
  }
  return <div className={styles.exchangeSection} style={{
    position: 'relative'
  }}>
      <h4 className={styles.sectionTitle} style={{
      marginBottom: '0.5rem'
    }}>Exchange Online / Outlook</h4>
      
      {}
      <div style={{
      display: 'flex',
      gap: '1.5rem',
      alignItems: 'stretch',
      marginBottom: '1.5rem'
    }}>
        {}
        <div className={styles.statsCards} style={{
        flex: '0 0 32%',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem'
      }}>
          <div className={styles.statCard}>
            <div className={styles.statCardIcon} style={{
            color: '#3b82f6'
          }}>
              <Icon icon="mdi:email-send" />
            </div>
            <div className={styles.statCardContent}>
              <div className={styles.statCardValue}>
                {exchangeData.emailActivity?.sent !== undefined ? exchangeData.emailActivity.sent.toLocaleString() : 'N/A'}
              </div>
              <div className={styles.statCardLabel}>Emails sent</div>
              {exchangeData.emailActivity?.averages?.sent !== undefined && <div className={styles.statPercent}>
                  Average: {exchangeData.emailActivity.averages.sent.toLocaleString()}/day
                </div>}
            </div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statCardIcon} style={{
            color: '#10b981'
          }}>
              <Icon icon="mdi:email-receive" />
            </div>
            <div className={styles.statCardContent}>
              <div className={styles.statCardValue}>
                {exchangeData.emailActivity?.received !== undefined ? exchangeData.emailActivity.received.toLocaleString() : 'N/A'}
              </div>
              <div className={styles.statCardLabel}>Emails received</div>
              {exchangeData.emailActivity?.averages?.received !== undefined && <div className={styles.statPercent}>
                  Average: {exchangeData.emailActivity.averages.received.toLocaleString()}/day
                </div>}
            </div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statCardIcon} style={{
            color: '#8b5cf6'
          }}>
              <Icon icon="mdi:email-open" />
            </div>
            <div className={styles.statCardContent}>
              <div className={styles.statCardValue}>
                {exchangeData.emailActivity?.read !== undefined ? exchangeData.emailActivity.read.toLocaleString() : 'N/A'}
              </div>
              <div className={styles.statCardLabel}>Emails read</div>
              {exchangeData.emailActivity?.averages?.read !== undefined && <div className={styles.statPercent}>
                  Average: {exchangeData.emailActivity.averages.read.toLocaleString()}/day
                </div>}
            </div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statCardIcon} style={{
            color: '#f59e0b'
          }}>
              <Icon icon="mdi:percent" />
            </div>
            <div className={styles.statCardContent}>
              <div className={styles.statCardValue}>
                {exchangeData.emailActivity?.readRate !== undefined ? `${exchangeData.emailActivity.readRate.toFixed(1)}%` : 'N/A'}
              </div>
              <div className={styles.statCardLabel}>Read rate</div>
              {exchangeData.emailActivity?.read !== undefined && exchangeData.emailActivity?.received !== undefined && <div className={styles.statPercent}>
                  {exchangeData.emailActivity.read.toLocaleString()} / {exchangeData.emailActivity.received.toLocaleString()}
                </div>}
            </div>
          </div>
        </div>

        {}
        <div style={{
        flex: '1 1 0'
      }}>
          {exchangeData.emailActivity?.dailyActivity && exchangeData.emailActivity.dailyActivity.length > 0 ? <>
              <div style={{
            padding: '1rem',
            borderRadius: '8px',
            background: '#ffffff',
            height: 350
          }}>
                <ResponsiveContainer width="100%" height={350}>
                  <LineChart data={(() => {
                if (emailActivityViewMode === 'week') {
                  const weekMap = new Map();
                  exchangeData.emailActivity.dailyActivity.forEach(day => {
                    const date = new Date(day.date);
                    if (isNaN(date.getTime())) return;
                    const dayOfWeek = date.getDay();
                    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
                    const monday = new Date(date);
                    monday.setDate(date.getDate() + diff);
                    monday.setHours(0, 0, 0, 0);
                    const weekKey = `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`;
                    const weekLabel = `${String(monday.getDate()).padStart(2, '0')}/${String(monday.getMonth() + 1).padStart(2, '0')}/${monday.getFullYear()}`;
                    if (!weekMap.has(weekKey)) {
                      weekMap.set(weekKey, {
                        date: weekLabel,
                        sent: 0,
                        received: 0,
                        read: 0
                      });
                    }
                    const weekStat = weekMap.get(weekKey);
                    weekStat.sent += day.sent || 0;
                    weekStat.received += day.received || 0;
                    weekStat.read += day.read || 0;
                  });
                  return Array.from(weekMap.values()).sort((a, b) => {
                    const dateA = new Date(a.date.replace('Week of ', '').replace('Semaine du ', ''));
                    const dateB = new Date(b.date.replace('Week of ', '').replace('Semaine du ', ''));
                    return dateA - dateB;
                  }).map(week => ({
                    date: week.date,
                    'Sent': week.sent,
                    'Received': week.received,
                    'Read': week.read
                  }));
                } else {
                  return exchangeData.emailActivity.dailyActivity.map(day => ({
                    date: new Date(day.date).toLocaleDateString('en-GB', {
                      day: '2-digit',
                      month: '2-digit'
                    }),
                    'Sent': day.sent,
                    'Received': day.received,
                    'Read': day.read
                  }));
                }
              })()} margin={{
                top: 10,
                right: 10,
                left: 10,
                bottom: 10
              }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" angle={-45} textAnchor="end" height={80} tick={{
                  fill: '#374151',
                  fontSize: 12
                }} />
                <YAxis tick={{
                  fill: '#374151',
                  fontSize: 12
                }} />
                <Tooltip contentStyle={{
                  background: '#ffffff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  color: '#111827'
                }} />
                <Legend wrapperStyle={{
                  paddingTop: '0px',
                  paddingBottom: '0px'
                }} iconType="line" />
                <Line type="monotone" dataKey="Sent" stroke="#3b82f6" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="Received" stroke="#10b981" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="Read" stroke="#8b5cf6" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            marginTop: '0.75rem',
            gap: '0.25rem',
            flexShrink: 0,
            background: '#f3f4f6',
            padding: '0.125rem',
            borderRadius: '6px',
            border: '1px solid #e5e7eb',
            width: 'fit-content',
            marginLeft: 'auto'
          }}>
            <button onClick={() => setEmailActivityViewMode('day')} style={{
              padding: '0.375rem 0.75rem',
              fontSize: '0.7rem',
              fontWeight: '500',
              color: emailActivityViewMode === 'day' ? '#111827' : '#6b7280',
              background: emailActivityViewMode === 'day' ? '#ffffff' : 'transparent',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: emailActivityViewMode === 'day' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none'
            }}>
              By day
            </button>
            <button onClick={() => setEmailActivityViewMode('week')} style={{
              padding: '0.375rem 0.75rem',
              fontSize: '0.7rem',
              fontWeight: '500',
              color: emailActivityViewMode === 'week' ? '#111827' : '#6b7280',
              background: emailActivityViewMode === 'week' ? '#ffffff' : 'transparent',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: emailActivityViewMode === 'week' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none'
            }}>
              By week
            </button>
          </div>
        </> : <div style={{
          textAlign: 'center',
          padding: '2rem',
          color: theme === 'dark' ? '#9ca3af' : '#6b7280',
          fontSize: '0.875rem',
          marginTop: '1.5rem'
        }}>
          N/A - Data not synced
        </div>}
      </div>
      </div>

      {}
      {weeklyStats ? <div style={{
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
        display: 'flex',
        gap: '1.5rem',
        alignItems: 'stretch'
      }}>
            {}
            <div style={{
          flex: '1 1 0',
          background: '#ffffff',
          borderRadius: '8px',
          padding: '1rem'
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
              top: 10,
              right: 10,
              left: 10,
              bottom: 10
            }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="jour" tick={{
                fill: '#6b7280',
                fontSize: 12
              }} stroke="#d1d5db" />
                  <YAxis tick={{
                fill: '#6b7280',
                fontSize: 12
              }} stroke="#d1d5db" />
                  <Tooltip contentStyle={{
                backgroundColor: '#ffffff',
                border: '1px solid #e5e7eb',
                borderRadius: '6px',
                color: '#111827'
              }} />
                  <Legend wrapperStyle={{
                paddingTop: '4px',
                paddingBottom: '0'
              }} iconType="line" />
                  <Bar dataKey="sent" fill="#3b82f6" name="Sent" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="received" fill="#10b981" name="Received" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="read" fill="#8b5cf6" name="Read" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {}
            {weeklySummary && <div className={styles.statsCards} style={{
          flex: '0 0 32%',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem'
        }}>
                <div className={styles.statCard}>
                  <div className={styles.statCardContent}>
                    <div className={styles.statCardLabel}>Most emails received</div>
                    <div className={styles.statCardValue} style={{
                color: '#10b981'
              }}>
                      {weeklySummary.maxReceived.jour}
                    </div>
                    <div className={styles.statPercent}>
                      {weeklySummary.maxReceived.received?.toLocaleString() || 0} email{weeklySummary.maxReceived.received !== 1 ? 's' : ''}
                    </div>
                  </div>
                </div>
                <div className={styles.statCard}>
                  <div className={styles.statCardContent}>
                    <div className={styles.statCardLabel}>Most emails sent</div>
                    <div className={styles.statCardValue} style={{
                color: '#3b82f6'
              }}>
                      {weeklySummary.maxSent.jour}
                    </div>
                    <div className={styles.statPercent}>
                      {weeklySummary.maxSent.sent?.toLocaleString() || 0} email{weeklySummary.maxSent.sent !== 1 ? 's' : ''}
                    </div>
                  </div>
                </div>
                <div className={styles.statCard}>
                  <div className={styles.statCardContent}>
                    <div className={styles.statCardLabel}>Most emails read</div>
                    <div className={styles.statCardValue} style={{
                color: '#8b5cf6'
              }}>
                      {weeklySummary.maxRead.jour}
                    </div>
                    <div className={styles.statPercent}>
                      {weeklySummary.maxRead.read?.toLocaleString() || 0} email{weeklySummary.maxRead.read !== 1 ? 's' : ''}
                    </div>
                  </div>
                </div>
              </div>}
          </div>
        </div> : null}

      <h4 className={styles.sectionTitle} style={{
      marginTop: '1.5rem',
      marginBottom: '0.5rem'
    }}>
        Mailboxes, quotas and Top 5 users
      </h4>
      <div style={{
      marginTop: '0.5rem',
      display: 'grid',
      gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr)',
      gap: '1.5rem',
      alignItems: 'stretch'
    }}>
        {}
        <div>
          <div className={styles.statsCards} style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem'
        }}>
            <div className={styles.statCard}>
              <div className={styles.statCardIcon}>
                <Icon icon="mdi:email-multiple" />
              </div>
              <div className={styles.statCardContent}>
                <div className={styles.statCardValue}>
                  {exchangeData.mailboxes?.total !== undefined ? exchangeData.mailboxes.total : 'N/A'}
                </div>
                <div className={styles.statCardLabel}>Total</div>
              </div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statCardIcon}>
                <Icon icon="mdi:database" />
              </div>
              <div className={styles.statCardContent}>
                <div className={styles.statCardValue}>
                  {exchangeData.mailboxes?.totalSize !== undefined ? exchangeData.mailboxes.totalSize : 'N/A'}
                </div>
                <div className={styles.statCardLabel}>Total space used</div>
              </div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statCardIcon} style={{
              color: '#8b5cf6'
            }}>
                <Icon icon="mdi:scale" />
              </div>
              <div className={styles.statCardContent}>
                <div className={styles.statCardValue}>
                  {exchangeData.mailboxes?.averageSize !== undefined ? exchangeData.mailboxes.averageSize : 'N/A'}
                </div>
                <div className={styles.statCardLabel}>Average size</div>
                {exchangeData.mailboxes?.averageSize !== undefined && <div className={styles.statPercent}>
                    Per mailbox
                  </div>}
              </div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statCardIcon} style={{
              color: '#3b82f6'
            }}>
                <Icon icon="mdi:email-outline" />
              </div>
              <div className={styles.statCardContent}>
                <div className={styles.statCardValue}>
                  {exchangeData.mailboxes?.totalItems !== undefined ? exchangeData.mailboxes.totalItems.toLocaleString() : 'N/A'}
                </div>
                <div className={styles.statCardLabel}>Total emails</div>
                {exchangeData.mailboxes?.averageItems !== undefined && <div className={styles.statPercent}>
                    Average: {exchangeData.mailboxes.averageItems.toLocaleString()}/mailbox
                  </div>}
              </div>
            </div>
          </div>
        </div>

        {}
        <div>
          {hasQuotaData && <>
              <div style={{
            background: '#ffffff',
            borderRadius: '8px',
            padding: '1.5rem',
            border: '1px solid #e5e7eb'
          }}>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie data={quotaPieData} cx="50%" cy="50%" labelLine={false} label={({
                  name,
                  value,
                  percent
                }) => `${name}: ${value} (${(percent * 100).toFixed(1)}%)`} outerRadius={100} fill="#8884d8" dataKey="value">
                      {quotaPieData.map((entry, index) => <Cell key={`cell-${index}`} fill={QUOTA_COLORS[entry.name] || '#8884d8'} />)}
                    </Pie>
                    <Tooltip content={<QuotaTooltip />} />
                    <Legend verticalAlign="bottom" height={36} formatter={value => <span style={{
                  color: '#374151',
                  fontSize: '0.875rem'
                }}>
                          {value}
                        </span>} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </>}
        </div>

        {}
        <div>
          {exchangeData.topUsers && exchangeData.topUsers.length > 0 && <>
              <div style={{
            background: '#ffffff',
            borderRadius: '8px',
            padding: '1rem',
            border: '1px solid #e5e7eb',
            height: '100%',
            boxSizing: 'border-box'
          }}>
                <table style={{
              width: '100%',
              borderCollapse: 'collapse'
            }}>
                  <thead>
                    <tr style={{
                  borderBottom: '1px solid #e5e7eb'
                }}>
                      <th style={{
                    textAlign: 'left',
                    padding: '0.5rem',
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    color: '#6b7280'
                  }}>User</th>
                      <th style={{
                    textAlign: 'right',
                    padding: '0.5rem',
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    color: '#6b7280'
                  }}>Sent</th>
                      <th style={{
                    textAlign: 'right',
                    padding: '0.5rem',
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    color: '#6b7280'
                  }}>Received</th>
                      <th style={{
                    textAlign: 'right',
                    padding: '0.5rem',
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    color: '#6b7280'
                  }}>Read</th>
                      <th style={{
                    textAlign: 'right',
                    padding: '0.5rem',
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    color: '#6b7280'
                  }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {exchangeData.topUsers.map((user, index) => <tr key={index} style={{
                  borderBottom: '1px solid #e5e7eb'
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
                      color: '#6b7280',
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
            </>}
        </div>
      </div>
    </div>;
}
