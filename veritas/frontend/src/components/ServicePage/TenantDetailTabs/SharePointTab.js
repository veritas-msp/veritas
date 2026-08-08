import React, { useState } from 'react';
import { FaSearch, FaTimes, FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import { Icon } from '@iconify/react';
import { toast } from 'react-toastify';
import styles from '../TenantDetailPage.module.css';
import SmartTooltip from '../../SmartTooltip';
export default function SharePointTab({
  sharepointData,
  theme
}) {
  const [siteSearchQuery, setSiteSearchQuery] = useState('');
  const [sitesCurrentPage, setSitesCurrentPage] = useState(1);
  if (!sharepointData) {
    return <div>
        <h2 className={styles.sectionTitle}>SharePoint</h2>
        <div className={styles.noDataMessage}>
          <p>No SharePoint data available.</p>
          <p style={{
          fontSize: '0.875rem',
          color: theme === 'dark' ? '#9ca3af' : '#6b7280',
          marginTop: '0.5rem'
        }}>
            SharePoint data is not present in the snapshot. Please run a <strong>full sync</strong> using the sync button to load and save this data.
          </p>
        </div>
      </div>;
  }
  if (sharepointData.success === false) {
    return <div>
        <h2 className={styles.sectionTitle}>SharePoint</h2>
        <div className={styles.noDataMessage}>
          <p style={{
          color: '#ef4444'
        }}>❌ Error loading SharePoint data</p>
          <p className={styles.textSecondary}>
            {sharepointData.error || 'Unknown error'}
          </p>
        </div>
      </div>;
  }
  const allSites = sharepointData.sites || [];
  const filteredSites = allSites.filter(site => {
    const text = `${site.name || site.displayName || ''} ${site.webUrl || ''}`.toLowerCase();
    return !siteSearchQuery.trim() || text.includes(siteSearchQuery.trim().toLowerCase());
  });
  const sitesPerPage = 20;
  const totalSitesPages = Math.max(1, Math.ceil(filteredSites.length / sitesPerPage));
  const safeSitesPage = Math.min(sitesCurrentPage, totalSitesPages);
  const sitesStartIndex = (safeSitesPage - 1) * sitesPerPage;
  const visibleSites = filteredSites.slice(sitesStartIndex, sitesStartIndex + sitesPerPage);
  const handlePreviousSitesPage = () => {
    setSitesCurrentPage(prev => Math.max(1, prev - 1));
  };
  const handleNextSitesPage = () => {
    setSitesCurrentPage(prev => Math.min(totalSitesPages, prev + 1));
  };
  const exportSitesToCSV = () => {
    if (filteredSites.length === 0) {
      toast.error('No sites to export for this filter');
      return;
    }
    const headers = ['Site name', 'URL', 'Created on', 'Last activity', 'Status'];
    const rows = filteredSites.map(site => [site.name || site.displayName || 'N/A', site.webUrl || 'N/A', site.createdDateTime ? new Date(site.createdDateTime).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    }) : "-", site.lastActivityDate ? new Date(site.lastActivityDate).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    }) : site.lastModifiedDateTime ? new Date(site.lastModifiedDateTime).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    }) : "-", site.isActive !== false ? 'Active' : 'Inactive']);
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
    link.download = `sites_sharepoint_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success(`CSV export successful: ${filteredSites.length} site(s) exported`);
  };
  return <div>
      <h2 className={styles.sectionTitle}>SharePoint</h2>
      
      <div className={styles.metricsRow}>
        <div className={styles.metricItem}>
          <div className={styles.metricLabel}>Sites totaux</div>
          <div className={styles.metricValue} style={{
          color: '#3b82f6'
        }}>
            {sharepointData.stats?.totalSites !== undefined ? sharepointData.stats.totalSites.toLocaleString() : sharepointData.sites?.length !== undefined ? sharepointData.sites.length.toLocaleString() : '0'}
          </div>
        </div>
        <div className={styles.metricItem}>
          <div className={styles.metricLabel}>Active sites</div>
          <div className={styles.metricValue} style={{
          color: '#10b981'
        }}>
            {sharepointData.stats?.activeSites !== undefined ? sharepointData.stats.activeSites.toLocaleString() : sharepointData.sites?.filter(s => s.isActive !== false).length || '0'}
          </div>
        </div>
        {sharepointData.activeUsers !== undefined && <div className={styles.metricItem}>
            <div className={styles.metricLabel}>Active users</div>
            <div className={styles.metricValue} style={{
          color: '#8b5cf6'
        }}>
              {sharepointData.activeUsers.toLocaleString()}
            </div>
          </div>}
        {sharepointData.pagesViewed !== undefined && <div className={styles.metricItem}>
            <div className={styles.metricLabel}>Pages vues</div>
            <div className={styles.metricValue} style={{
          color: '#f59e0b'
        }}>
              {sharepointData.pagesViewed.toLocaleString()}
            </div>
          </div>}
        {sharepointData.filesModified !== undefined && <div className={styles.metricItem}>
            <div className={styles.metricLabel}>Files modified</div>
            <div className={styles.metricValue} style={{
          color: '#ec4899'
        }}>
              {sharepointData.filesModified.toLocaleString()}
            </div>
          </div>}
        {sharepointData.filesTotal !== undefined && <div className={styles.metricItem}>
            <div className={styles.metricLabel}>Total files</div>
            <div className={styles.metricValue} style={{
          color: '#14b8a6'
        }}>
              {sharepointData.filesTotal.toLocaleString()}
            </div>
          </div>}
        {sharepointData.storageUsed !== undefined && <div className={styles.metricItem}>
            <div className={styles.metricLabel}>Storage used</div>
            <div className={styles.metricValue} style={{
          color: '#ef4444'
        }}>
              {typeof sharepointData.storageUsed === 'number' ? `${(sharepointData.storageUsed / 1024 / 1024 / 1024).toFixed(2)} GB` : sharepointData.storageUsed || 'N/A'}
            </div>
          </div>}
      </div>

      {}
      {allSites && allSites.length > 0 && <div className={styles.sectionSpacing}>
          <h3 className={styles.sectionTitle} style={{
        marginTop: '1rem'
      }}>
            SharePoint sites table ({filteredSites.length})
          </h3>

          <div className={styles.serviceAccountsRow}>
            <div className={styles.serviceAccountsLeft}>
              <div className={styles.serviceAccountsSearchContainer}>
                <div className={styles.serviceAccountsSearchBox}>
                  <FaSearch className={styles.serviceAccountsSearchIcon} />
                  <input type="text" className={styles.serviceAccountsSearchInput} placeholder="Search for a SharePoint site..." value={siteSearchQuery} onChange={e => {
                setSiteSearchQuery(e.target.value);
                setSitesCurrentPage(1);
              }} />
                  {siteSearchQuery && <button type="button" className={styles.serviceAccountsSearchClearButton} onClick={() => {
                setSiteSearchQuery('');
                setSitesCurrentPage(1);
              }} aria-label="Clear search">
                      <FaTimes />
                    </button>}
                </div>
              </div>
            </div>
            <SmartTooltip as="span" content="Export SharePoint site list as CSV">
              <button type="button" className={`${styles.headerActionButton} ${styles.headerActionButtonInactive}`} onClick={exportSitesToCSV} aria-label="Export as CSV">
                <Icon icon="mdi:file-export" className={styles.headerActionIcon} />
              </button>
            </SmartTooltip>
          </div>

          <div className={styles.licensesTableContainer}>
            <table className={styles.licensesTable}>
              <thead>
                <tr>
                  <th>Site name</th>
                  <th>URL</th>
                  <th>Created on</th>
                  <th>Last activity</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {visibleSites.map((site, idx) => <tr key={site.id || idx}>
                    <td style={{
                fontWeight: 600
              }}>{site.name || site.displayName || 'N/A'}</td>
                    <td>
                      {site.webUrl ? <a href={site.webUrl} target="_blank" rel="noopener noreferrer" style={{
                  color: '#2563eb',
                  textDecoration: 'none',
                  fontSize: '0.875rem'
                }} onMouseEnter={e => e.target.style.textDecoration = 'underline'} onMouseLeave={e => e.target.style.textDecoration = 'none'}>
                          {site.webUrl}
                        </a> : 'N/A'}
                    </td>
                    <td>
                      {site.createdDateTime ? new Date(site.createdDateTime).toLocaleDateString('en-GB', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric'
                }) : '-'}
                    </td>
                    <td>
                      {site.lastActivityDate ? new Date(site.lastActivityDate).toLocaleDateString('en-GB', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric'
                }) : site.lastModifiedDateTime ? new Date(site.lastModifiedDateTime).toLocaleDateString('en-GB', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric'
                }) : '-'}
                    </td>
                    <td>
                      <span className={`${styles.badge} ${site.isActive !== false ? styles.badgeSuccess : styles.badgeDanger}`}>
                        {site.isActive !== false ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                  </tr>)}
                {visibleSites.length === 0 && <tr>
                    <td colSpan={5} style={{
                textAlign: 'center',
                padding: '1rem',
                fontSize: '0.875rem',
                color: '#9ca3af'
              }}>
                      No sites match the filters.
                    </td>
                  </tr>}
              </tbody>
            </table>
          </div>

          {filteredSites.length > sitesPerPage && <div className={styles.pagination}>
              <button type="button" className={styles.paginationButton} onClick={handlePreviousSitesPage} disabled={safeSitesPage === 1} aria-label="Previous">
                <FaChevronLeft />
              </button>
              <span className={styles.paginationInfo}>
                Page {safeSitesPage} / {totalSitesPages}
              </span>
              <button type="button" className={styles.paginationButton} onClick={handleNextSitesPage} disabled={safeSitesPage === totalSitesPages} aria-label="Next">
                <FaChevronRight />
              </button>
            </div>}
        </div>}
    </div>;
}
