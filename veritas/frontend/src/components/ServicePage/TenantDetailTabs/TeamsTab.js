import React, { useState, useMemo } from 'react';
import { FaSearch, FaTimes, FaChevronLeft, FaChevronRight, FaSort, FaSortUp, FaSortDown } from 'react-icons/fa';
import { Icon } from '@iconify/react';
import { toast } from 'react-toastify';
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from 'recharts';
import styles from '../TenantDetailPage.module.css';
import SmartTooltip from '../../SmartTooltip';
const TEAMS_SORT_KEYS = {
  displayName: 'displayName',
  memberCount: 'memberCount',
  channelCount: 'channelCount',
  visibility: 'visibility'
};
export default function TeamsTab({
  teamsData,
  theme
}) {
  const [teamsSearchQuery, setTeamsSearchQuery] = useState('');
  const [teamsCurrentPage, setTeamsCurrentPage] = useState(1);
  const [teamsSortKey, setTeamsSortKey] = useState(TEAMS_SORT_KEYS.displayName);
  const [teamsSortDir, setTeamsSortDir] = useState('asc');
  const sortTeams = (list, sortKey, dir) => {
    if (!list || list.length === 0) return [];
    const asc = dir === 'asc';
    return [...list].sort((a, b) => {
      if (sortKey === TEAMS_SORT_KEYS.displayName) {
        const na = (a.displayName || a.name || '').toLowerCase();
        const nb = (b.displayName || b.name || '').toLowerCase();
        return asc ? na.localeCompare(nb) : nb.localeCompare(na);
      }
      if (sortKey === TEAMS_SORT_KEYS.memberCount) {
        const va = Number(a.memberCount) || 0;
        const vb = Number(b.memberCount) || 0;
        return asc ? va - vb : vb - va;
      }
      if (sortKey === TEAMS_SORT_KEYS.channelCount) {
        const va = Number(a.channelCount) || 0;
        const vb = Number(b.channelCount) || 0;
        return asc ? va - vb : vb - va;
      }
      if (sortKey === TEAMS_SORT_KEYS.visibility) {
        const va = a.visibility === 'Private' ? 'Private' : 'Public';
        const vb = b.visibility === 'Private' ? 'Private' : 'Public';
        return asc ? va.localeCompare(vb) : vb.localeCompare(va);
      }
      return 0;
    });
  };
  const exportTeamsToCSV = () => {
    if (!teamsData?.teams?.teamsList || teamsData.teams.teamsList.length === 0) {
      toast.error('No teams to export');
      return;
    }
    const filtered = teamsData.teams.teamsList.filter(team => {
      const name = (team.displayName || team.name || '').toLowerCase();
      return !teamsSearchQuery.trim() || name.includes(teamsSearchQuery.trim().toLowerCase());
    });
    const sorted = sortTeams(filtered, teamsSortKey, teamsSortDir);
    if (sorted.length === 0) {
      toast.error('No teams to export for this filter');
      return;
    }
    const headers = ['Team name', 'Members', 'Channels', 'Visibility'];
    const rows = sorted.map(team => [team.displayName || team.name || 'N/A', team.memberCount?.toLocaleString() || '0', team.channelCount?.toLocaleString() || '0', team.visibility === 'Private' ? 'Private' : 'Public']);
    const csvContent = [headers.join(';'), ...rows.map(row => row.map(cell => {
      const cellStr = String(cell ?? '');
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
    link.download = `equipes_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success(`CSV export successful: ${sorted.length} team(s) exported`);
  };
  const rawUsage = teamsData.activity?.usage;
  const usageStats = rawUsage && typeof rawUsage === 'object' && !Array.isArray(rawUsage) ? rawUsage : {};
  const licensedUsers = usageStats.licensedUsers || 0;
  const activeUsers = usageStats.activeUsers ?? teamsData.teams?.activeUsers ?? 0;
  const inactiveUsers = Math.max(0, licensedUsers - activeUsers);
  const rawMessages = teamsData.activity?.messages;
  const messageStats = rawMessages && typeof rawMessages === 'object' && !Array.isArray(rawMessages) ? rawMessages : {
    total: typeof rawMessages === 'number' ? rawMessages : 0
  };
  const rawMeetings = teamsData.activity?.meetings;
  const meetingsStats = rawMeetings && typeof rawMeetings === 'object' && !Array.isArray(rawMeetings) ? rawMeetings : {
    total: typeof rawMeetings === 'number' ? rawMeetings : 0
  };
  const rawCalls = teamsData.activity?.calls || teamsData.calls;
  const callsStats = rawCalls && typeof rawCalls === 'object' && !Array.isArray(rawCalls) ? rawCalls : {
    total: typeof rawCalls === 'number' ? rawCalls : 0
  };
  const allTeams = teamsData.teams?.teamsList || [];
  const sortedTeams = useMemo(() => {
    const filtered = allTeams.filter(team => {
      const name = (team.displayName || team.name || '').toLowerCase();
      return !teamsSearchQuery.trim() || name.includes(teamsSearchQuery.trim().toLowerCase());
    });
    return sortTeams(filtered, teamsSortKey, teamsSortDir);
  }, [allTeams, teamsSearchQuery, teamsSortKey, teamsSortDir]);
  const filteredTeams = sortedTeams;
  const teamsPerPage = 20;
  const totalTeamsPages = Math.max(1, Math.ceil(sortedTeams.length / teamsPerPage));
  const safeTeamsPage = Math.min(teamsCurrentPage, totalTeamsPages);
  const teamsStartIndex = (safeTeamsPage - 1) * teamsPerPage;
  const visibleTeams = sortedTeams.slice(teamsStartIndex, teamsStartIndex + teamsPerPage);
  const handleTeamsSort = key => {
    if (teamsSortKey === key) {
      setTeamsSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setTeamsSortKey(key);
      setTeamsSortDir('asc');
    }
    setTeamsCurrentPage(1);
  };
  const SortIcon = ({
    columnKey
  }) => {
    if (teamsSortKey !== columnKey) return <FaSort style={{
      opacity: 0.4,
      marginLeft: 4,
      verticalAlign: 'middle'
    }} />;
    return teamsSortDir === 'asc' ? <FaSortUp style={{
      marginLeft: 4,
      verticalAlign: 'middle'
    }} /> : <FaSortDown style={{
      marginLeft: 4,
      verticalAlign: 'middle'
    }} />;
  };
  const handlePreviousTeamsPage = () => {
    setTeamsCurrentPage(prev => Math.max(1, prev - 1));
  };
  const handleNextTeamsPage = () => {
    setTeamsCurrentPage(prev => Math.min(totalTeamsPages, prev + 1));
  };
  if (!teamsData) {
    return <div>
        <h2 className={styles.sectionTitle}>Microsoft Teams</h2>
        <div className={styles.noDataMessage}>
          <p>No Teams data available.</p>
          <p style={{
          fontSize: '0.875rem',
          color: theme === 'dark' ? '#9ca3af' : '#6b7280',
          marginTop: '0.5rem'
        }}>
            Teams data is not present in the snapshot. Please run a <strong>full sync</strong> using the sync button to load and save this data.
          </p>
        </div>
      </div>;
  }
  if (teamsData.success === false) {
    return <div>
        <h2 className={styles.sectionTitle}>Microsoft Teams</h2>
        <div className={styles.noDataMessage}>
          <p style={{
          color: '#ef4444'
        }}>❌ Error loading Teams data</p>
          <p className={styles.textSecondary}>
            {teamsData.error || 'Unknown error'}
          </p>
        </div>
      </div>;
  }
  return <div>
      <h2 className={styles.sectionTitle}>Microsoft Teams</h2>

      {}
      <div className={styles.metricsRow}>
        <div className={styles.metricItem}>
          <div className={styles.metricLabel}>Number of users</div>
          <div className={styles.metricValue}>{licensedUsers}</div>
        </div>
        <div className={styles.metricItem}>
          <div className={styles.metricLabel}>Active</div>
          <div className={styles.metricValue} style={{
          color: '#10b981'
        }}>{activeUsers}</div>
        </div>
        <div className={styles.metricItem}>
          <div className={styles.metricLabel}>Inactive</div>
          <div className={styles.metricValue}>{inactiveUsers}</div>
        </div>
        <div className={styles.metricItem}>
          <div className={styles.metricLabel}>Adoption rate</div>
          <div className={styles.metricValue} style={{
          color: '#3b82f6'
        }}>
            {licensedUsers > 0 ? `${(activeUsers / licensedUsers * 100).toFixed(1)}%` : 'N/A'}
          </div>
        </div>
      </div>

      {}
      <div style={{
      display: 'flex',
      gap: '1.5rem',
      alignItems: 'stretch',
      marginTop: '1.5rem'
    }}>
        {}
        <div style={{
        flex: '0 0 38%',
        minWidth: 0
      }}>
          <div>
            <h3 className={styles.subsectionTitle}>Calls / Meetings</h3>
            <div className={styles.metricsRow}>
              <div className={styles.metricItem}>
                <div className={styles.metricLabel}>Total messages</div>
                <div className={styles.metricValue} style={{
                color: '#3b82f6'
              }}>
                  {(messageStats.total || 0).toLocaleString()}
                </div>
              </div>
              <div className={styles.metricItem}>
                <div className={styles.metricLabel}>Total private chat messages</div>
                <div className={styles.metricValue}>{(messageStats.privateChat || 0).toLocaleString()}</div>
              </div>
              <div className={styles.metricItem}>
                <div className={styles.metricLabel}>Total channel messages</div>
                <div className={styles.metricValue}>{(messageStats.teamChat || 0).toLocaleString()}</div>
              </div>
            </div>
          </div>
          <div style={{
          marginTop: '1rem'
        }}>
            <div className={styles.metricsRow}>
              <div className={styles.metricItem}>
                <div className={styles.metricLabel}>Total meetings</div>
                <div className={styles.metricValue} style={{
                color: '#8b5cf6'
              }}>
                  {(meetingsStats.total || 0).toLocaleString()}
                </div>
              </div>
              <div className={styles.metricItem}>
                <div className={styles.metricLabel}>Total organized</div>
                <div className={styles.metricValue}>{(meetingsStats.organized || 0).toLocaleString()}</div>
              </div>
              <div className={styles.metricItem}>
                <div className={styles.metricLabel}>Total participations</div>
                <div className={styles.metricValue}>{(meetingsStats.attended || 0).toLocaleString()}</div>
              </div>
              <div className={styles.metricItem}>
                <div className={styles.metricLabel}>Total appels</div>
                <div className={styles.metricValue}>{(callsStats.total || 0).toLocaleString()}</div>
              </div>
              <div className={styles.metricItem}>
                <div className={styles.metricLabel}>Total duration</div>
                <div className={styles.metricValue}>{callsStats.totalDuration || '0h 0m'}</div>
              </div>
              <div className={styles.metricItem}>
                <div className={styles.metricLabel}>Average duration</div>
                <div className={styles.metricValue}>{callsStats.averageDuration || '0h 0m'}</div>
              </div>
              <div className={styles.metricItem}>
                <div className={styles.metricLabel}>Audio</div>
                <div className={styles.metricValue}>{callsStats.audioDuration || '0h 0m'}</div>
              </div>
              <div className={styles.metricItem}>
                <div className={styles.metricLabel}>Video</div>
                <div className={styles.metricValue}>{callsStats.videoDuration || '0h 0m'}</div>
              </div>
              <div className={styles.metricItem}>
                <div className={styles.metricLabel}>Screen sharing</div>
                <div className={styles.metricValue}>{callsStats.screenShareDuration || '0h 0m'}</div>
              </div>
            </div>
          </div>
        </div>

        {}
        {teamsData.licensedActivity && teamsData.licensedActivity.dailyActivity && teamsData.licensedActivity.dailyActivity.length > 0 ? <div style={{
        flex: '1 1 0',
        minWidth: 0
      }}>
            <h3 className={styles.subsectionTitle}>Daily activity</h3>
            <div style={{
          background: '#ffffff',
          borderRadius: '8px',
          padding: '1rem',
          height: '100%',
          minHeight: 380
        }}>
              <ResponsiveContainer width="100%" height={350}>
              <LineChart data={teamsData.licensedActivity.dailyActivity.map(day => ({
              date: new Date(day.date).toLocaleDateString('en-GB', {
                day: '2-digit',
                month: '2-digit'
              }),
              'Messages canal': day.channelMessages || 0,
              'Messages chat': day.chatMessages || 0,
              '1:1 calls': day.oneOnOneCalls || 0,
              'Total meetings': day.totalMeetings || 0
            }))} margin={{
              top: 10,
              right: 10,
              left: 10,
              bottom: 10
            }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" angle={-45} textAnchor="end" height={80} tick={{
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
                borderRadius: '8px',
                color: '#111827'
              }} />
                <Legend wrapperStyle={{
                paddingTop: '0px',
                paddingBottom: '0'
              }} iconType="line" />
                <Line type="monotone" dataKey="Messages canal" stroke="#3b82f6" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="Messages chat" stroke="#10b981" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="1:1 calls" stroke="#f59e0b" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="Total meetings" stroke="#8b5cf6" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div> : teamsData.licensedActivity ? <div style={{
        flex: '1 1 0',
        textAlign: 'center',
        padding: '2rem',
        color: '#6b7280',
        fontSize: '0.875rem'
      }}>
            N/A - Licensed activity data not available
          </div> : null}
      </div>

      {}
      {teamsData.teams?.teamsList && teamsData.teams.teamsList.length > 0 && <div className={styles.sectionSpacing}>
          <h3 className={styles.sectionTitle} style={{
        marginTop: '1rem'
      }}>
            Teams table
          </h3>
          <div className={styles.serviceAccountsRow}>
            <div className={styles.serviceAccountsLeft}>
              <div className={styles.serviceAccountsSearchContainer}>
                <div className={styles.serviceAccountsSearchBox}>
                  <FaSearch className={styles.serviceAccountsSearchIcon} />
                  <input type="text" className={styles.serviceAccountsSearchInput} placeholder="Search for a team..." value={teamsSearchQuery} onChange={e => {
                setTeamsSearchQuery(e.target.value);
                setTeamsCurrentPage(1);
              }} />
                  {teamsSearchQuery && <button type="button" className={styles.serviceAccountsSearchClearButton} onClick={() => {
                setTeamsSearchQuery('');
                setTeamsCurrentPage(1);
              }} aria-label="Clear search">
                      <FaTimes />
                    </button>}
                </div>
              </div>
            </div>
            <SmartTooltip as="span" content="Export team list as CSV">
              <button type="button" className={`${styles.headerActionButton} ${styles.headerActionButtonInactive}`} onClick={exportTeamsToCSV} aria-label="Export as CSV">
                <Icon icon="mdi:file-export" className={styles.headerActionIcon} />
              </button>
            </SmartTooltip>
          </div>
          <div className={styles.licensesTableContainer}>
            <table className={styles.licensesTable}>
              <thead>
                <tr>
                  <th>
                    <button type="button" className={styles.sortableTh} onClick={() => handleTeamsSort(TEAMS_SORT_KEYS.displayName)}>
                      Team name <SortIcon columnKey={TEAMS_SORT_KEYS.displayName} />
                    </button>
                  </th>
                  <th className={styles.textRight}>
                    <button type="button" className={styles.sortableTh} onClick={() => handleTeamsSort(TEAMS_SORT_KEYS.memberCount)}>
                      Members <SortIcon columnKey={TEAMS_SORT_KEYS.memberCount} />
                    </button>
                  </th>
                  <th className={styles.textRight}>
                    <button type="button" className={styles.sortableTh} onClick={() => handleTeamsSort(TEAMS_SORT_KEYS.channelCount)}>
                      Channels <SortIcon columnKey={TEAMS_SORT_KEYS.channelCount} />
                    </button>
                  </th>
                  <th>
                    <button type="button" className={styles.sortableTh} onClick={() => handleTeamsSort(TEAMS_SORT_KEYS.visibility)}>
                      Visibility <SortIcon columnKey={TEAMS_SORT_KEYS.visibility} />
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody>
                {visibleTeams.map((team, idx) => <tr key={idx}>
                    <td>{team.displayName || team.name || 'N/A'}</td>
                    <td className={styles.textRight}>{team.memberCount?.toLocaleString() || '0'}</td>
                    <td className={styles.textRight}>{team.channelCount?.toLocaleString() || '0'}</td>
                    <td>
                      <span className={`${styles.badge} ${team.visibility === 'Private' ? styles.badgeDanger : styles.badgeSuccess}`}>
                        {team.visibility === 'Private' ? 'Private' : 'Public'}
                      </span>
                    </td>
                  </tr>)}
                {visibleTeams.length === 0 && <tr>
                    <td colSpan={4} style={{
                textAlign: 'center',
                padding: '1rem',
                fontSize: '0.875rem',
                color: '#9ca3af'
              }}>
                      No teams match the filters.
                    </td>
                  </tr>}
              </tbody>
            </table>
          </div>

          {filteredTeams.length > teamsPerPage && <div className={styles.pagination}>
              <button type="button" className={styles.paginationButton} onClick={handlePreviousTeamsPage} disabled={safeTeamsPage === 1} aria-label="Previous">
                <FaChevronLeft />
              </button>
              <span className={styles.paginationInfo}>
                Page {safeTeamsPage} / {totalTeamsPages}
              </span>
              <button type="button" className={styles.paginationButton} onClick={handleNextTeamsPage} disabled={safeTeamsPage === totalTeamsPages} aria-label="Next">
                <FaChevronRight />
              </button>
            </div>}
        </div>}
    </div>;
}
