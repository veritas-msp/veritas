import React from 'react';
import styles from '../O365.module.css';
import SharePointTabBase from '../../../ServicePage/TenantDetailTabs/SharePointTab';
export default function SharePointTab({
  sharepointData,
  theme,
  renderCommentSection,
  renderSyncPlaceholder
}) {
  return <div className={styles.sharepointSection} style={{
    position: 'relative'
  }}>
            <SharePointTabBase sharepointData={sharepointData} theme={theme} />
            {}
            {renderCommentSection && renderCommentSection('sharepoint', 'SharePoint')}
        </div>;
}
