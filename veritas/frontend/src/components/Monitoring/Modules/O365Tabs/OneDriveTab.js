import React from 'react';
import styles from '../O365.module.css';
import OneDriveTabBase from '../../../ServicePage/TenantDetailTabs/OneDriveTab';
export default function OneDriveTab({
  onedriveData,
  theme,
  renderCommentSection,
  renderSyncPlaceholder
}) {
  return <div className={styles.onedriveSection} style={{
    position: 'relative'
  }}>
            <OneDriveTabBase onedriveData={onedriveData} theme={theme} />
            {}
            {renderCommentSection && renderCommentSection('onedrive', 'OneDrive')}
        </div>;
}
