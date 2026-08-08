import React, { useMemo, useState } from "react";
import { useTheme } from '../../../hooks/useTheme';
import styles from "./AntispamSummary.module.css";
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from "recharts";
import { scoreToLetter, scoreToColor, scoreToLabel } from "../../../utils/gradeUtils";
import MetricLetter from "../common/MetricLetter";
import { getIconPath } from "../../../utils/assetHelper";
const AntispamSummary = ({
  data,
  config
}) => {
  const {
    theme
  } = useTheme();
  const staticData = config?.client?.equipements?.Antispam || {};
  const statsData = data?.statsData || null;
  const usersData = data?.usersData || null;
  const [statsViewMode, setStatsViewMode] = useState("week");
  const [statsPagination, setStatsPagination] = useState(1);
  const formatDate = dateString => {
    if (!dateString) return "";
    try {
      const date = new Date(dateString);
      if (!isNaN(date.getTime())) {
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
      }
      return dateString;
    } catch (e) {
      return dateString;
    }
  };
  const getReportPeriod = () => {
    if (config?.client?.checkmkPeriod) {
      return {
        start_time: config.client.checkmkPeriod.start_time,
        end_time: config.client.checkmkPeriod.end_time
      };
    }
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 1);
    return {
      start_time: startDate.toISOString(),
      end_time: endDate.toISOString()
    };
  };
  const filterStatsByReportPeriod = stats => {
    if (!stats || stats.length === 0) return [];
    const reportPeriod = getReportPeriod();
    if (!reportPeriod.start_time || !reportPeriod.end_time) return stats;
    const startDate = new Date(reportPeriod.start_time);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(reportPeriod.end_time);
    endDate.setHours(23, 59, 59, 999);
    return stats.filter(stat => {
      const dateParts = stat.period.split('/');
      if (dateParts.length !== 3) return false;
      const day = parseInt(dateParts[0], 10);
      const month = parseInt(dateParts[1], 10) - 1;
      const year = parseInt(dateParts[2], 10);
      const statDate = new Date(year, month, day);
      statDate.setHours(0, 0, 0, 0);
      return statDate >= startDate && statDate <= endDate;
    });
  };
  const calculateGlobalScore = () => {
    const defaultFactors = [{
      label: 'Valid emails',
      description: 'Percentage of valid emails among all processed emails',
      weight: '40 pts'
    }, {
      label: 'Blocked threats',
      description: 'Percentage of threats (spam, infected, banned) blocked by antispam',
      weight: '30 pts'
    }, {
      label: 'Critical threats',
      description: 'Percentage of critical threats (infected + spearphishing) detected',
      weight: '20 pts'
    }, {
      label: 'Spearphishing',
      description: 'Percentage of spearphishing emails detected',
      weight: '10 pts'
    }];
    const filteredStats = filterStatsByReportPeriod(statsData);
    if (!filteredStats || filteredStats.length === 0) {
      return {
        score: null,
        color: '#6b7280',
        label: 'N/A',
        factors: defaultFactors,
        validRate: null,
        threatRate: null,
        criticalThreatRate: null,
        spearphishingRate: null
      };
    }
    const totals = filteredStats.reduce((acc, stat) => ({
      valid: acc.valid + (stat.valid || 0),
      infected: acc.infected + (stat.infected || 0),
      spam: acc.spam + (stat.spam || 0),
      banned: acc.banned + (stat.banned || 0),
      spearphishing: acc.spearphishing + (stat.spearphishing || 0),
      pending: acc.pending + (stat.pending || 0),
      total: acc.total + (stat.total || 0)
    }), {
      valid: 0,
      infected: 0,
      spam: 0,
      banned: 0,
      spearphishing: 0,
      pending: 0,
      total: 0
    });
    if (totals.total === 0) {
      return {
        score: null,
        color: '#6b7280',
        label: 'N/A',
        factors: defaultFactors,
        validRate: null,
        threatRate: null,
        criticalThreatRate: null,
        spearphishingRate: null
      };
    }
    const validRate = totals.valid / totals.total * 100;
    const threatRate = (totals.infected + totals.spam + totals.banned + totals.spearphishing) / totals.total * 100;
    const spearphishingRate = totals.spearphishing / totals.total * 100;
    const criticalThreatRate = (totals.infected + totals.spearphishing) / totals.total * 100;
    const validScore = Math.min(100, validRate * 1.0) * 0.4;
    const threatScore = Math.max(0, 100 - threatRate * 2) * 0.3;
    const criticalThreatScore = Math.max(0, 100 - criticalThreatRate * 5) * 0.2;
    const spearphishingScore = Math.max(0, 100 - spearphishingRate * 10) * 0.1;
    let finalScore = validScore + threatScore + criticalThreatScore + spearphishingScore;
    finalScore = Math.round(Math.max(0, Math.min(100, finalScore)));
    const color = scoreToColor(finalScore);
    const label = scoreToLabel(finalScore);
    const factors = [{
      label: 'Valid emails',
      description: 'Percentage of valid emails among all processed emails',
      weight: '40 pts',
      score: Math.round(validScore),
      value: validRate
    }, {
      label: 'Blocked threats',
      description: 'Percentage of threats (spam, infected, banned) blocked by antispam',
      weight: '30 pts',
      score: Math.round(threatScore),
      value: threatRate
    }, {
      label: 'Critical threats',
      description: 'Percentage of critical threats (infected + spearphishing) detected',
      weight: '20 pts',
      score: Math.round(criticalThreatScore),
      value: criticalThreatRate
    }, {
      label: 'Spearphishing',
      description: 'Percentage of spearphishing emails detected',
      weight: '10 pts',
      score: Math.round(spearphishingScore),
      value: spearphishingRate
    }];
    return {
      score: finalScore,
      color,
      label,
      factors,
      validRate,
      threatRate,
      criticalThreatRate,
      spearphishingRate
    };
  };
  const groupStatsByWeek = () => {
    const filteredStats = filterStatsByReportPeriod(statsData);
    if (!filteredStats || filteredStats.length === 0) return [];
    const weekMap = new Map();
    filteredStats.forEach(stat => {
      const dateParts = stat.period.split('/');
      if (dateParts.length === 3) {
        const day = parseInt(dateParts[0], 10);
        const month = parseInt(dateParts[1], 10) - 1;
        const year = parseInt(dateParts[2], 10);
        const date = new Date(year, month, day);
        const dayOfWeek = date.getDay();
        const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        const monday = new Date(date);
        monday.setDate(date.getDate() + diff);
        monday.setHours(0, 0, 0, 0);
        const weekKey = `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`;
        const weekLabel = `Week of ${String(monday.getDate()).padStart(2, '0')}/${String(monday.getMonth() + 1).padStart(2, '0')}/${monday.getFullYear()}`;
        if (!weekMap.has(weekKey)) {
          weekMap.set(weekKey, {
            period: weekLabel,
            weekStart: monday,
            valid: 0,
            infected: 0,
            spam: 0,
            banned: 0,
            spearphishing: 0,
            pending: 0,
            total: 0
          });
        }
        const weekStat = weekMap.get(weekKey);
        weekStat.valid += stat.valid || 0;
        weekStat.infected += stat.infected || 0;
        weekStat.spam += stat.spam || 0;
        weekStat.banned += stat.banned || 0;
        weekStat.spearphishing += stat.spearphishing || 0;
        weekStat.pending += stat.pending || 0;
        weekStat.total += stat.total || 0;
      }
    });
    return Array.from(weekMap.values()).sort((a, b) => {
      return b.weekStart - a.weekStart;
    });
  };
  const cleanText = text => {
    if (!text) return '';
    text = text.replace(/^\uFEFF/, '');
    let hasNullChars = false;
    let nullCharCount = 0;
    for (let i = 0; i < Math.min(200, text.length); i += 2) {
      if (i + 1 < text.length && text.charCodeAt(i + 1) === 0) {
        nullCharCount++;
      }
    }
    hasNullChars = nullCharCount > Math.min(200, text.length) * 0.3;
    if (hasNullChars) {
      let cleaned = '';
      for (let i = 0; i < text.length; i += 2) {
        if (i < text.length) {
          const char = text[i];
          const code = text.charCodeAt(i);
          if (code >= 32 || code === 9 || code === 10 || code === 13) {
            cleaned += char;
          }
        }
      }
      text = cleaned;
    } else {
      let controlCharCount = 0;
      for (let i = 0; i < Math.min(200, text.length); i++) {
        const code = text.charCodeAt(i);
        if (code < 32 && code !== 9 && code !== 10 && code !== 13) {
          controlCharCount++;
        }
      }
      const hasControlChars = controlCharCount > text.length * 0.2;
      if (hasControlChars) {
        let cleaned = '';
        for (let i = 0; i < text.length; i++) {
          const code = text.charCodeAt(i);
          if (code >= 32 || code === 9 || code === 10 || code === 13) {
            cleaned += text[i];
          }
        }
        text = cleaned;
      }
    }
    text = text.replace(/[\u200B-\u200D\uFEFF]/g, '');
    text = text.replace(/\0/g, '');
    return text;
  };
  const cleanString = str => {
    if (!str) return '';
    let cleaned = '';
    for (let i = 0; i < str.length; i++) {
      const char = str[i];
      const code = str.charCodeAt(i);
      if (code !== 0) {
        cleaned += char;
      }
    }
    cleaned = cleaned.trim();
    return cleaned;
  };
  const parseRateValue = value => {
    if (value === null || value === undefined || value === 'N/A') return null;
    const numeric = typeof value === 'string' ? parseFloat(value) : value;
    return Number.isNaN(numeric) ? null : numeric;
  };
  const renderMetricRow = (label, value, higherIsBetter = true) => <div style={{
    fontSize: '0.75rem',
    color: theme === 'dark' ? '#d1d5db' : '#374151',
    whiteSpace: 'nowrap',
    display: 'flex',
    alignItems: 'center',
    gap: '0.35rem'
  }}>
      <MetricLetter value={value} higherIsBetter={higherIsBetter} theme={theme} showValue={false} />
      <strong>{label}</strong>
    </div>;
  const globalScore = calculateGlobalScore();
  const finalScore = globalScore.score;
  const scoreColor = finalScore !== null ? globalScore.color : '#6b7280';
  const scoreLetter = finalScore !== null ? scoreToLetter(finalScore) : null;
  const totals = useMemo(() => {
    const filteredStats = filterStatsByReportPeriod(statsData);
    if (!filteredStats || filteredStats.length === 0) {
      return {
        valid: 0,
        infected: 0,
        spam: 0,
        banned: 0,
        spearphishing: 0,
        pending: 0,
        total: 0
      };
    }
    return filteredStats.reduce((acc, stat) => ({
      valid: acc.valid + (stat.valid || 0),
      infected: acc.infected + (stat.infected || 0),
      spam: acc.spam + (stat.spam || 0),
      banned: acc.banned + (stat.banned || 0),
      spearphishing: acc.spearphishing + (stat.spearphishing || 0),
      pending: acc.pending + (stat.pending || 0),
      total: acc.total + (stat.total || 0)
    }), {
      valid: 0,
      infected: 0,
      spam: 0,
      banned: 0,
      spearphishing: 0,
      pending: 0,
      total: 0
    });
  }, [statsData, config]);
  const threatRate = totals.total > 0 ? Math.round((totals.infected + totals.spam + totals.banned + totals.spearphishing) / totals.total * 100 * 10) / 10 : 0;
  const validRate = totals.total > 0 ? Math.round(totals.valid / totals.total * 100 * 10) / 10 : 0;
  const displayData = useMemo(() => {
    const filteredStats = filterStatsByReportPeriod(statsData);
    if (!filteredStats || filteredStats.length === 0) return [];
    if (statsViewMode === 'week') {
      const weekData = groupStatsByWeek();
      return weekData.reverse();
    }
    return [...filteredStats].sort((a, b) => {
      const dateA = new Date(a.period);
      const dateB = new Date(b.period);
      return dateA - dateB;
    });
  }, [statsData, statsViewMode, config]);
  const chartData = useMemo(() => {
    if (displayData.length === 0) return [];
    return displayData.map(stat => ({
      period: statsViewMode === 'week' ? stat.period.replace('Week of ', '') : stat.period,
      Valid: stat.valid || 0,
      Infected: stat.infected || 0,
      Spam: stat.spam || 0,
      Bannis: stat.banned || 0,
      Spearphishing: stat.spearphishing || 0,
      'Pending': stat.pending || 0,
      Total: stat.total || 0
    }));
  }, [displayData, statsViewMode]);
  return <div className={`${styles.container} ${theme === "dark" ? styles.dark : ""}`}>
      <div className={styles.antispamGrid}>
        <div className={styles.antispamCard}>
          {}
          <div className={styles.cardHeader}>
            <div className={styles.headerLeft}>
              <div className={styles.antispamInfo}>
                <h3 className={styles.antispamName}>
                  <img src={getIconPath('mailinblack.png')} alt="Mail in Black" style={{
                  width: '24px',
                  height: '24px',
                  display: 'inline-block',
                  verticalAlign: 'middle',
                  marginRight: '0.75rem',
                  borderRadius: '4px'
                }} />
                  <span>{staticData.logiciel || "Mail In Black"}</span>
                </h3>
              </div>
            </div>
          </div>

          {}
          {statsData && statsData.length > 0 && <div className={styles.metricsRow}>
              <div className={styles.metricItem}>
                <div className={styles.metricLabel}>Total emails</div>
                <div className={styles.metricValue}>
                  {totals.total.toLocaleString()}
                </div>
              </div>
              <div className={styles.metricItem}>
                <div className={styles.metricLabel}>Valid emails</div>
                <div className={styles.metricValue} style={{
              color: '#10b981'
            }}>
                  {totals.valid.toLocaleString()} ({validRate}%)
                </div>
              </div>
              <div className={styles.metricItem}>
                <div className={styles.metricLabel}>Blocked threats</div>
                <div className={styles.metricValue} style={{
              color: '#ef4444'
            }}>
                  {(totals.infected + totals.spam + totals.banned + totals.spearphishing).toLocaleString()} ({threatRate}%)
                </div>
              </div>
              <div className={styles.metricItem}>
                <div className={styles.metricLabel}>Spam</div>
                <div className={styles.metricValue} style={{
              color: '#f59e0b'
            }}>
                  {totals.spam.toLocaleString()}
                </div>
              </div>
              <div className={styles.metricItem}>
                <div className={styles.metricLabel}>Infected</div>
                <div className={styles.metricValue} style={{
              color: '#ef4444'
            }}>
                  {totals.infected.toLocaleString()}
                </div>
              </div>
              <div className={styles.metricItem}>
                <div className={styles.metricLabel}>Spearphishing</div>
                <div className={styles.metricValue} style={{
              color: '#dc2626'
            }}>
                  {totals.spearphishing.toLocaleString()}
                </div>
              </div>
            </div>}

          {}
          {usersData && usersData.length > 0 && (() => {
          const totalUsers = usersData.length;
          const protectedUsers = usersData.filter(user => {
            const cleanStatus = cleanString(user.protectionStatus || '');
            return cleanStatus === 'Protected';
          }).length;
          const protectionRate = totalUsers > 0 ? Math.round(protectedUsers / totalUsers * 100 * 10) / 10 : 0;
          const nonProtectedRate = totalUsers > 0 ? Math.round((totalUsers - protectedUsers) / totalUsers * 100 * 10) / 10 : 0;
          const totalAliases = usersData.reduce((sum, user) => {
            return sum + (user.aliases && Array.isArray(user.aliases) ? user.aliases.length : 0);
          }, 0);
          return <div className={styles.metricsRow} style={{
            marginTop: '1.5rem'
          }}>
                <div className={styles.metricItem}>
                  <div className={styles.metricLabel}>Total users</div>
                  <div className={styles.metricValue}>
                    {totalUsers.toLocaleString()}
                  </div>
                </div>
                <div className={styles.metricItem}>
                  <div className={styles.metricLabel}>Protected</div>
                  <div className={styles.metricValue} style={{
                color: '#10b981'
              }}>
                    {protectedUsers.toLocaleString()} ({protectionRate}%)
                  </div>
                </div>
                <div className={styles.metricItem}>
                  <div className={styles.metricLabel}>Unprotected</div>
                  <div className={styles.metricValue} style={{
                color: '#ef4444'
              }}>
                    {(totalUsers - protectedUsers).toLocaleString()} ({nonProtectedRate}%)
                  </div>
                </div>
                <div className={styles.metricItem}>
                  <div className={styles.metricLabel}>Total alias</div>
                  <div className={styles.metricValue} style={{
                color: '#3b82f6'
              }}>
                    {totalAliases.toLocaleString()}
                  </div>
                </div>
              </div>;
        })()}

          {}
          {(() => {
          const solutions = staticData?.solutions || [];
          const firstSolution = solutions.length > 0 ? solutions[0] : staticData;
          const licencesTotales = firstSolution?.licencesTotales || staticData?.licencesTotales || "";
          const licencesUtilisees = usersData && usersData.length > 0 ? usersData.length : firstSolution?.utilisateursProteges || staticData?.utilisateursProteges || 0;
          const expiration = firstSolution?.expiration || staticData?.expiration || "";
          if (!licencesTotales && !licencesUtilisees && !expiration) {
            return null;
          }
          return <div className={styles.licenseSection} style={{
            marginTop: '1.5rem'
          }}>
                <h4 className={styles.sectionTitle}>License information</h4>
                <div className={styles.licenseGrid}>
                  {licencesTotales && <div className={styles.licenseItem}>
                      <label>Total licenses</label>
                      <div className={styles.licenseValue}>{licencesTotales}</div>
                    </div>}
                  <div className={styles.licenseItem}>
                    <label>Used licenses</label>
                    <div className={styles.licenseValue}>{licencesUtilisees}</div>
                  </div>
                  {licencesTotales && <div className={styles.licenseItem}>
                      <label>Available licenses</label>
                      <div className={styles.licenseValue}>
                        {licencesTotales ? parseInt(licencesTotales) - licencesUtilisees : "N/A"}
                      </div>
                    </div>}
                  {expiration && <div className={styles.licenseItem}>
                      <label>Expiration</label>
                      <div className={styles.licenseValue}>{formatDate(expiration)}</div>
                    </div>}
                </div>
              </div>;
        })()}

          {}
          {statsData && statsData.length > 0 && <div style={{
          marginTop: '1.5rem'
        }}>
              {}
              <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1rem',
            gap: '1rem',
            flexWrap: 'wrap'
          }}>
                <h4 className={styles.sectionTitle} style={{
              margin: 0
            }}>
                  Detailed statistics
                </h4>
                <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem',
              flexShrink: 0,
              background: theme === 'dark' ? '#2d2d4f' : '#f3f4f6',
              padding: '0.125rem',
              borderRadius: '6px',
              border: theme === 'dark' ? '1px solid #4a4a6a' : '1px solid #e5e7eb'
            }}>
                  <button onClick={() => {
                setStatsViewMode('day');
                setStatsPagination(1);
              }} style={{
                padding: '0.375rem 0.75rem',
                fontSize: '0.7rem',
                fontWeight: '500',
                color: statsViewMode === 'day' ? theme === 'dark' ? '#f9fafb' : '#111827' : theme === 'dark' ? '#9ca3af' : '#6b7280',
                background: statsViewMode === 'day' ? theme === 'dark' ? '#1e1e3f' : '#ffffff' : 'transparent',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: statsViewMode === 'day' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none'
              }}>
                    Per day
                  </button>
                  <button onClick={() => {
                setStatsViewMode('week');
                setStatsPagination(1);
              }} style={{
                padding: '0.375rem 0.75rem',
                fontSize: '0.7rem',
                fontWeight: '500',
                color: statsViewMode === 'week' ? theme === 'dark' ? '#f9fafb' : '#111827' : theme === 'dark' ? '#9ca3af' : '#6b7280',
                background: statsViewMode === 'week' ? theme === 'dark' ? '#1e1e3f' : '#ffffff' : 'transparent',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: statsViewMode === 'week' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none'
              }}>
                    Par semaine
                  </button>
                </div>
              </div>

              {}
              {chartData.length > 0 && <div className={styles.chartsContainer} style={{
            marginBottom: '1.5rem'
          }}>
                  <div className={styles.chartCard}>
                    <h5 className={styles.chartTitle}>Detailed statistics by period</h5>
                    <ResponsiveContainer width="100%" height={400}>
                      <BarChart data={chartData} margin={{
                  top: 20,
                  right: 30,
                  left: 20,
                  bottom: 60
                }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#4a4a6a' : '#e5e7eb'} />
                        <XAxis dataKey="period" angle={-45} textAnchor="end" height={80} stroke={theme === 'dark' ? '#d1d5db' : '#374151'} fontSize={11} />
                        <YAxis stroke={theme === 'dark' ? '#d1d5db' : '#374151'} fontSize={11} label={{
                    value: "Nombre d'emails",
                    angle: -90,
                    position: 'insideLeft',
                    style: {
                      textAnchor: 'middle',
                      fill: theme === 'dark' ? '#d1d5db' : '#374151'
                    }
                  }} />
                        <Tooltip contentStyle={{
                    backgroundColor: theme === 'dark' ? '#1e1e3f' : '#ffffff',
                    border: theme === 'dark' ? '1px solid #4a4a6a' : '1px solid #e5e7eb',
                    borderRadius: '6px',
                    color: theme === 'dark' ? '#d1d5db' : '#374151'
                  }} />
                        <Legend wrapperStyle={{
                    paddingTop: '20px',
                    color: theme === 'dark' ? '#d1d5db' : '#374151'
                  }} iconType="square" />
                        <Bar dataKey="Valid" fill="#10b981" />
                        <Bar dataKey="Infected" fill="#ef4444" />
                        <Bar dataKey="Spam" fill="#f59e0b" />
                        <Bar dataKey="Bannis" fill="#ef4444" />
                        <Bar dataKey="Spearphishing" fill="#dc2626" />
                        <Bar dataKey="Pending" fill="#6b7280" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>}

              {}
              {(() => {
            const STATS_PER_PAGE = 10;
            const currentPage = statsPagination;
            const totalPages = Math.ceil(displayData.length / STATS_PER_PAGE);
            const startIndex = (currentPage - 1) * STATS_PER_PAGE;
            const endIndex = startIndex + STATS_PER_PAGE;
            const paginatedDisplayData = displayData.slice(startIndex, endIndex);
            return <>
                    <div className={styles.endpointsTableContainer}>
                      <table className={styles.endpointsTable}>
                        <thead>
                          <tr>
                            <th>{statsViewMode === 'week' ? 'Week' : 'Period'}</th>
                            <th>Valid</th>
                            <th>Infected</th>
                            <th>Spam</th>
                            <th>Bannis</th>
                            <th>Spearphishing</th>
                            <th>Pending</th>
                            <th>Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {paginatedDisplayData.length > 0 ? paginatedDisplayData.map((stat, index) => <tr key={index}>
                                <td>{stat.period}</td>
                                <td style={{
                        textAlign: 'right',
                        color: '#10b981'
                      }}>{stat.valid.toLocaleString()}</td>
                                <td style={{
                        textAlign: 'right',
                        color: '#ef4444'
                      }}>{stat.infected.toLocaleString()}</td>
                                <td style={{
                        textAlign: 'right',
                        color: '#f59e0b'
                      }}>{stat.spam.toLocaleString()}</td>
                                <td style={{
                        textAlign: 'right',
                        color: '#ef4444'
                      }}>{stat.banned.toLocaleString()}</td>
                                <td style={{
                        textAlign: 'right',
                        color: '#dc2626'
                      }}>{stat.spearphishing.toLocaleString()}</td>
                                <td style={{
                        textAlign: 'right',
                        color: '#6b7280'
                      }}>{stat.pending.toLocaleString()}</td>
                                <td style={{
                        textAlign: 'right',
                        fontWeight: '600'
                      }}>{stat.total.toLocaleString()}</td>
                              </tr>) : <tr>
                              <td colSpan="8" style={{
                        padding: '2rem',
                        textAlign: 'center',
                        color: theme === 'dark' ? '#9ca3af' : '#6b7280'
                      }}>
                                No data to display
                              </td>
                            </tr>}
                        </tbody>
                      </table>
                    </div>

                    {}
                    {totalPages > 1 && <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '0.5rem',
                marginTop: '1rem'
              }}>
                        <button onClick={() => setStatsPagination(Math.max(1, currentPage - 1))} disabled={currentPage === 1} style={{
                  padding: '0.5rem 0.75rem',
                  border: theme === 'dark' ? '1px solid #4a4a6a' : '1px solid #e5e7eb',
                  borderRadius: '6px',
                  background: theme === 'dark' ? '#1e1e3f' : '#ffffff',
                  color: theme === 'dark' ? '#f9fafb' : '#111827',
                  cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                  opacity: currentPage === 1 ? 0.5 : 1,
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  transition: 'all 0.2s ease'
                }} onMouseEnter={e => {
                  if (currentPage !== 1) {
                    e.currentTarget.style.borderColor = theme === 'dark' ? '#6a6a8a' : '#d1d5db';
                  }
                }} onMouseLeave={e => {
                  e.currentTarget.style.borderColor = theme === 'dark' ? '#4a4a6a' : '#e5e7eb';
                }}>
                          ← Previous
                        </button>
                        <span style={{
                  fontSize: '0.875rem',
                  color: theme === 'dark' ? '#9ca3af' : '#6b7280',
                  fontWeight: '500'
                }}>
                          Page {currentPage} of {totalPages}
                        </span>
                        <button onClick={() => setStatsPagination(Math.min(totalPages, currentPage + 1))} disabled={currentPage === totalPages} style={{
                  padding: '0.5rem 0.75rem',
                  border: theme === 'dark' ? '1px solid #4a4a6a' : '1px solid #e5e7eb',
                  borderRadius: '6px',
                  background: theme === 'dark' ? '#1e1e3f' : '#ffffff',
                  color: theme === 'dark' ? '#f9fafb' : '#111827',
                  cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                  opacity: currentPage === totalPages ? 0.5 : 1,
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  transition: 'all 0.2s ease'
                }} onMouseEnter={e => {
                  if (currentPage !== totalPages) {
                    e.currentTarget.style.borderColor = theme === 'dark' ? '#6a6a8a' : '#d1d5db';
                  }
                }} onMouseLeave={e => {
                  e.currentTarget.style.borderColor = theme === 'dark' ? '#4a4a6a' : '#e5e7eb';
                }}>
                          Next →
                        </button>
                      </div>}
                  </>;
          })()}
            </div>}

          {}
          {(!statsData || statsData.length === 0) && (!usersData || usersData.length === 0) && <div style={{
          padding: '2rem',
          textAlign: 'center',
          color: theme === 'dark' ? '#9ca3af' : '#6b7280',
          fontSize: '0.875rem'
        }}>
              <p>No data imported. Import CSV files from the Antispam module to see statistics and users.</p>
            </div>}
        </div>
      </div>
    </div>;
};
export default AntispamSummary;
