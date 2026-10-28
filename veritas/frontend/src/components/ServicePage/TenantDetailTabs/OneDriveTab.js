import React, { useMemo } from 'react';
import styles from '../TenantDetailPage.module.css';
import { MonitoringStepTableWrap, MonitoringPagedBlock } from '../../RapportPage/monitoring/MonitoringStepLayout';

export default function OneDriveTab({
  onedriveData,
  theme,
  embedded = false
}) {
  const kpiCards = useMemo(() => {
    const activity = onedriveData?.sharing?.byActivityType;
    return [{
      key: 'space',
      label: 'Espace utilisé',
      value: onedriveData?.storage?.totalUsed || '0 B'
    }, {
      key: 'files',
      label: 'Fichiers',
      value: onedriveData?.storage?.totalFiles !== undefined ? onedriveData.storage.totalFiles.toLocaleString() : '0'
    }, {
      key: 'avg',
      label: 'Moyenne / utilisateur',
      value: onedriveData?.storage?.averagePerUser || '0 B'
    }, {
      key: 'viewed',
      label: 'Vus / édités',
      value: activity?.viewedOrEdited !== undefined ? activity.viewedOrEdited.toLocaleString() : '0'
    }, {
      key: 'synced',
      label: 'Synchronisés',
      value: activity?.synced !== undefined ? activity.synced.toLocaleString() : '0'
    }, {
      key: 'internal',
      label: 'Partages internes',
      value: activity?.sharedInternally !== undefined ? activity.sharedInternally.toLocaleString() : '0'
    }, {
      key: 'external',
      label: 'Partages externes',
      value: activity?.sharedExternally !== undefined ? activity.sharedExternally.toLocaleString() : '0'
    }];
  }, [onedriveData]);

  if (embedded) {
    const topUsers = Array.isArray(onedriveData?.topUsers) ? onedriveData.topUsers : [];
    return <div className={styles.tabFill}>
        {onedriveData?.success === false ? <p className={styles.mutedHint} style={{ color: '#b91c1c', margin: '0 0 0.5rem' }}>
            {onedriveData.error || 'Erreur chargement OneDrive'}
          </p> : null}
        <div className={styles.embeddedKpiStrip}>
          <div className={styles.metricsRowFlat} style={{
          gridTemplateColumns: 'repeat(4, minmax(0, 1fr))'
        }}>
            {kpiCards.slice(0, 4).map(card => <div key={card.key} className={styles.metricItem}>
                <div className={styles.metricLabel}>{card.label}</div>
                <div className={styles.metricValue}>{card.value}</div>
              </div>)}
          </div>
          <div className={styles.metricsRowFlat} style={{
          gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
          marginTop: '0.55rem'
        }}>
            {kpiCards.slice(4).map(card => <div key={card.key} className={styles.metricItem}>
                <div className={styles.metricLabel}>{card.label}</div>
                <div className={styles.metricValue}>{card.value}</div>
              </div>)}
          </div>
        </div>
        <div className={styles.embeddedTableStack}>
            <div className={styles.embeddedPagedFill}>
              <MonitoringPagedBlock items={topUsers} resetDeps={[topUsers.length]} initialPageSize={25}>
                {pageItems => <MonitoringStepTableWrap scrollable fill hostClassName={styles.embeddedTableFill} deps={[pageItems.length]}>
                  <div className={`${styles.licensesTableContainer} ${styles.tablePlain}`}>
                    <table className={styles.licensesTable}>
                      <thead>
                        <tr>
                          <th>User</th>
                          <th className={styles.textRight}>Storage used</th>
                          <th className={styles.textRight}>Files</th>
                          <th className={styles.textRight}>Shared</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pageItems.length === 0 ? <tr>
                            <td colSpan={4}>Aucun utilisateur OneDrive disponible.</td>
                          </tr> : pageItems.map((user, idx) => <tr key={idx}>
                            <td>{user.name || user.userPrincipalName || 'N/A'}</td>
                            <td className={styles.textRight}>
                              {user.storageUsed ? `${(user.storageUsed / 1024 / 1024 / 1024).toFixed(2)} GB` : '0 GB'}
                            </td>
                            <td className={styles.textRight}>{user.fileCount?.toLocaleString() || '0'}</td>
                            <td className={styles.textRight}>{user.sharedCount?.toLocaleString() || '0'}</td>
                          </tr>)}
                      </tbody>
                    </table>
                  </div>
                </MonitoringStepTableWrap>}
              </MonitoringPagedBlock>
            </div>
          </div>
      </div>;
  }

  if (!onedriveData) {
    return <div>
        <h2 className={styles.sectionTitle}>OneDrive</h2>
        <div className={styles.noDataMessage}>
          <p>No OneDrive data available.</p>
          <p className={styles.mutedHint}>
            OneDrive data is not present in the snapshot. Please run a <strong>full sync</strong> using the sync button to load and save this data.
          </p>
        </div>
      </div>;
  }
  if (onedriveData.success === false) {
    return <div>
        <h2 className={styles.sectionTitle}>OneDrive</h2>
        <div className={styles.noDataMessage}>
          <p>Error loading OneDrive data</p>
          <p className={styles.textSecondary}>
            {onedriveData.error || 'Unknown error'}
          </p>
        </div>
      </div>;
  }

  return <div>
      <h2 className={styles.sectionTitle}>OneDrive</h2>
      
      <div className={styles.metricsRow}>
        <div className={styles.metricItem}>
          <div className={styles.metricLabel}>Total space used</div>
          <div className={styles.metricValue}>
            {onedriveData.storage?.totalUsed || '0 B'}
          </div>
        </div>
        <div className={styles.metricItem}>
          <div className={styles.metricLabel}>Number of files</div>
          <div className={styles.metricValue}>
            {onedriveData.storage?.totalFiles !== undefined ? onedriveData.storage.totalFiles.toLocaleString() : '0'}
          </div>
        </div>
        <div className={styles.metricItem}>
          <div className={styles.metricLabel}>Average per user</div>
          <div className={styles.metricValue}>
            {onedriveData.storage?.averagePerUser || '0 B'}
          </div>
        </div>
        {onedriveData.sharing?.byActivityType && <>
            <div className={styles.metricItem}>
              <div className={styles.metricLabel}>Files viewed/edited</div>
              <div className={styles.metricValue}>
                {onedriveData.sharing.byActivityType.viewedOrEdited !== undefined ? onedriveData.sharing.byActivityType.viewedOrEdited.toLocaleString() : '0'}
              </div>
            </div>
            <div className={styles.metricItem}>
              <div className={styles.metricLabel}>Synced files</div>
              <div className={styles.metricValue}>
                {onedriveData.sharing.byActivityType.synced !== undefined ? onedriveData.sharing.byActivityType.synced.toLocaleString() : '0'}
              </div>
            </div>
            <div className={styles.metricItem}>
              <div className={styles.metricLabel}>Internal shares</div>
              <div className={styles.metricValue}>
                {onedriveData.sharing.byActivityType.sharedInternally !== undefined ? onedriveData.sharing.byActivityType.sharedInternally.toLocaleString() : '0'}
              </div>
            </div>
            <div className={styles.metricItem}>
              <div className={styles.metricLabel}>External shares</div>
              <div className={styles.metricValue}>
                {onedriveData.sharing.byActivityType.sharedExternally !== undefined ? onedriveData.sharing.byActivityType.sharedExternally.toLocaleString() : '0'}
              </div>
            </div>
          </>}
      </div>

      {onedriveData.topUsers && onedriveData.topUsers.length > 0 && <div className={styles.sectionSpacing}>
          <h3 className={styles.subsectionTitle}>Top users</h3>
          <div className={styles.licensesTableContainer}>
            <table className={styles.licensesTable}>
              <thead>
                <tr>
                  <th>User</th>
                  <th className={styles.textRight}>Storage used</th>
                  <th className={styles.textRight}>Files</th>
                  <th className={styles.textRight}>Shared</th>
                </tr>
              </thead>
              <tbody>
                {onedriveData.topUsers.slice(0, 10).map((user, idx) => <tr key={idx}>
                    <td>{user.name || user.userPrincipalName || 'N/A'}</td>
                    <td className={styles.textRight}>
                      {user.storageUsed ? `${(user.storageUsed / 1024 / 1024 / 1024).toFixed(2)} GB` : '0 GB'}
                    </td>
                    <td className={styles.textRight}>{user.fileCount?.toLocaleString() || '0'}</td>
                    <td className={styles.textRight}>{user.sharedCount?.toLocaleString() || '0'}</td>
                  </tr>)}
              </tbody>
            </table>
          </div>
        </div>}

      {onedriveData.usersNearQuota && onedriveData.usersNearQuota.length > 0 && <div className={styles.sectionSpacing}>
          <h3 className={styles.subsectionTitle}>Users near quota (&gt;90%)</h3>
          <div className={styles.licensesTableContainer}>
            <table className={styles.licensesTable}>
              <thead>
                <tr>
                  <th>User</th>
                  <th>Email</th>
                  <th className={styles.textRight}>Usage</th>
                  <th className={styles.textRight}>Files</th>
                </tr>
              </thead>
              <tbody>
                {onedriveData.usersNearQuota.map((user, idx) => <tr key={idx}>
                    <td>{user.name || 'N/A'}</td>
                    <td>{user.email || 'N/A'}</td>
                    <td className={styles.textRight}>
                      {user.usagePercent}% ({user.used})
                    </td>
                    <td className={styles.textRight}>{user.files?.toLocaleString() || '0'}</td>
                  </tr>)}
              </tbody>
            </table>
          </div>
        </div>}
    </div>;
}
