import React from 'react';
import styles from '../TenantDetailPage.module.css';
export default function DashboardTab({
  detailData,
  dashboardMetrics,
  adoptionScore,
  tenantId,
  securityData,
  users
}) {
  const securityScoreCurrent = securityData?.secureScore?.currentScore ?? null;
  const securityScoreMax = securityData?.secureScore?.maxScore ?? 100;
  const securityScorePct = securityData?.secureScore?.percentage ?? (securityScoreCurrent != null && securityScoreMax ? Math.round(securityScoreCurrent / securityScoreMax * 100) : null);
  return <>
      {}
      <section className={styles.kpiSection}>
        <h2 className={styles.sectionTitle}>Security</h2>
        <div className={styles.statsCards}>
          <div className={styles.statCard}>
            <div className={styles.statCardContent}>
              <div className={styles.statCardLabel}>Security score</div>
              <div className={styles.statCardValue}>
                {securityScoreCurrent != null ? <span>{Math.round(securityScoreCurrent)} / {securityScoreMax}{securityScorePct != null ? ` (${Math.round(securityScorePct)}%)` : ''}</span> : '-'}
              </div>
            </div>
          </div>
        </div>
      </section>

      {}
      {adoptionScore && <div className={styles.statisticsSection}>
          <h2 className={styles.sectionTitle}>Microsoft 365 adoption score</h2>
          <div className={styles.statsRow}>
            <div className={styles.statsColumn}>
              <div className={styles.statsGrid}>
                <div className={styles.statCard}>
                  <div className={styles.statLabel}>Total score</div>
                  <div className={styles.statValue}>
                    {adoptionScore.totalScore || 0}
                    {adoptionScore.maxScore ? ` / ${adoptionScore.maxScore}` : ''}
                  </div>
                </div>
                {typeof adoptionScore.peopleExperiences === 'number' && <div className={styles.statCard}>
                    <div className={styles.statLabel}>People experiences</div>
                    <div className={styles.statValue}>
                      {adoptionScore.peopleExperiences}
                    </div>
                  </div>}
                {typeof adoptionScore.technologyExperiences === 'number' && <div className={styles.statCard}>
                    <div className={styles.statLabel}>Technology experiences</div>
                    <div className={styles.statValue}>
                      {adoptionScore.technologyExperiences}
                    </div>
                  </div>}
              </div>
            </div>
          </div>
        </div>}
    </>;
}
