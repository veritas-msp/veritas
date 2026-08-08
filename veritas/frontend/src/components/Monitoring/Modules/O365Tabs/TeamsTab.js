import React from 'react';
import styles from '../O365.module.css';
import TeamsTabBase from '../../../ServicePage/TenantDetailTabs/TeamsTab';
export default function TeamsTab({
  teamsData,
  theme,
  renderCommentSection,
  renderSyncPlaceholder
}) {
  return <div className={styles.teamsSection} style={{
    position: 'relative'
  }}>
            <TeamsTabBase teamsData={teamsData} theme={theme} />
            {}
            {renderCommentSection && renderCommentSection('teams', 'Teams')}
        </div>;
}
