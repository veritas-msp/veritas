import React from 'react';
import { FaTimes } from 'react-icons/fa';
import { Icon } from '@iconify/react';
import { formatRenewalModeLabel } from './domainSolutionUtils';
import styles from './DomainsModal.module.css';
const DomainsModal = ({
  isOpen,
  onClose,
  domains,
  onConfigure
}) => {
  if (!isOpen) return null;
  const formatDate = dateString => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-GB');
    } catch {
      return 'N/A';
    }
  };
  const getStatus = expiration => {
    if (!expiration) return {
      text: 'Unknown',
      className: styles.statusUnknown
    };
    const expiryDate = new Date(expiration);
    const now = new Date();
    const isExpired = expiryDate < now;
    return {
      text: isExpired ? 'Expired' : 'Active',
      className: isExpired ? styles.statusExpired : styles.statusActive
    };
  };
  const getAutoRenew = domain => {
    const value = domain.autoRenew ?? domain.auto_renewal;
    if (value == null) return {
      text: 'N/A',
      className: styles.statusUnknown
    };
    return {
      text: value ? 'Auto' : 'Manual',
      className: value ? styles.statusActive : styles.statusExpired
    };
  };
  return <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3>Domain name details</h3>
          <button className={styles.closeButton} onClick={onClose}>
            <FaTimes />
          </button>
        </div>

        <div className={styles.modalBody}>
          {domains && domains.length > 0 ? <div className={styles.domainsTable}>
              <table>
                <thead>
                  <tr>
                    <th>Domain name</th>
                    <th>Registrar</th>
                    <th>Expiry</th>
                    <th>Renewal</th>
                    <th>Zone DNS</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {domains.map((domain, index) => {
                const status = getStatus(domain.expiration || domain.expirityDate);
                const renew = getAutoRenew(domain);
                return <tr key={domain.id || domain.nom || index}>
                        <td className={styles.domainName}>
                          {domain.nom || domain.name || domain.domain}
                        </td>
                        <td>{domain.registrar || 'N/A'}</td>
                        <td>{formatDate(domain.expiration || domain.expirityDate)}</td>
                        <td>
                          <span className={`${styles.statusBadge} ${renew.className}`}>
                            {domain.renewalMode ? formatRenewalModeLabel(domain.renewalMode) : renew.text}
                          </span>
                        </td>
                        <td>
                          {domain.hasDnsZone || domain.dnsZone ? <span className={`${styles.statusBadge} ${styles.statusActive}`}>
                              OVH
                            </span> : '-'}
                        </td>
                        <td>
                          <span className={`${styles.statusBadge} ${status.className}`}>
                            {status.text}
                          </span>
                        </td>
                      </tr>;
              })}
                </tbody>
              </table>
            </div> : <div className={styles.noData}>
              <Icon icon="mdi:web-off" className={styles.noDataIcon} />
              <p>No domain names registered</p>
            </div>}
        </div>

        {onConfigure ? <div className={styles.modalFooter}>
            <button type="button" className={styles.configureButton} onClick={onConfigure}>
              <Icon icon="mdi:cog-outline" aria-hidden />
              Configure
            </button>
          </div> : null}
      </div>
    </div>;
};
export default DomainsModal;
