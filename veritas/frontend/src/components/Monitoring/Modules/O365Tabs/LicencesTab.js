import React from 'react';
import styles from '../O365.module.css';
import LicensesTabBase from '../../../ServicePage/TenantDetailTabs/LicencesTab';
export default function LicensesTab({
  licences,
  dashboardMetrics,
  theme,
  renderCommentSection
}) {
  return <div className={styles.licensesSection} style={{
    position: 'relative'
  }}>
            <LicensesTabBase licences={licences} dashboardMetrics={dashboardMetrics} theme={theme} />
            {}
            {renderCommentSection && renderCommentSection('licences', 'Licenses')}
        </div>;
}
