import React from 'react';
import styles from '../O365.module.css';
import ExchangeTabBase from '../../../ServicePage/TenantDetailTabs/ExchangeTab';
export default function ExchangeTab({
  exchangeData,
  theme,
  renderCommentSection,
  renderSyncPlaceholder
}) {
  return <div className={styles.exchangeSection} style={{
    position: 'relative'
  }}>
            <ExchangeTabBase exchangeData={exchangeData} theme={theme} />
            {}
            {renderCommentSection && renderCommentSection('exchange', 'Exchange')}
        </div>;
}
