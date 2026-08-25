import React from 'react';
import { Icon } from '@iconify/react';
import SmartTooltip from '../SmartTooltip';
import { formatRelativeFrench } from './checkmkMonitoringUtils';
import styles from './CheckMKMonitoringStatusBadge.module.css';
const STATUS_CONFIG = {
  critical: {
    className: styles.badgeCritical,
    icon: 'mdi:alert-circle',
    shortLabel: 'Critical'
  },
  warning: {
    className: styles.badgeWarning,
    icon: 'mdi:alert',
    shortLabel: 'Warning'
  },
  ok: {
    className: styles.badgeOk,
    icon: 'mdi:check-circle',
    shortLabel: 'OK'
  },
  no_data: {
    className: styles.badgeNoData,
    icon: 'mdi:database-off',
    shortLabel: '-'
  }
};
function buildTooltip(summary) {
  if (!summary || summary.status === 'no_data') {
    return 'Mapped to CheckMK';
  }
  const lines = [];
  if (summary.critServices > 0) {
    lines.push(`${summary.critServices} critical service${summary.critServices > 1 ? 's' : ''}`);
  }
  if (summary.warnServices > 0) {
    lines.push(`${summary.warnServices} service${summary.warnServices > 1 ? 's' : ''} in warning`);
  }
  if (summary.recentCritAlerts > 0) {
    lines.push(`${summary.recentCritAlerts} critical alert${summary.recentCritAlerts > 1 ? 's' : ''} (7d)`);
  }
  if (summary.recentWarnAlerts > 0) {
    lines.push(`${summary.recentWarnAlerts} warning alert${summary.recentWarnAlerts > 1 ? 's' : ''} (7d)`);
  }
  if (lines.length === 0) {
    lines.push('No critical services or recent alerts');
  }
  if (summary.lastSyncedAt) {
    lines.push(`Sync: ${formatRelativeFrench(summary.lastSyncedAt)}`);
  }
  return lines.join(' · ');
}
function buildBadgeText(summary) {
  if (!summary || summary.status === 'no_data') return 'OK';
  if (summary.status === 'critical') {
    const parts = [];
    if (summary.critServices > 0) parts.push(`${summary.critServices} crit`);
    if (summary.recentCritAlerts > 0) parts.push(`${summary.recentCritAlerts} alert`);
    return parts.join(' · ') || 'Crit';
  }
  if (summary.status === 'warning') {
    const parts = [];
    if (summary.warnServices > 0) parts.push(`${summary.warnServices} warn`);
    if (summary.recentWarnAlerts > 0) parts.push(`${summary.recentWarnAlerts} notification`);
    return parts.join(' · ') || 'Warn';
  }
  return 'OK';
}
export default function CheckMKMonitoringStatusBadge({
  summary,
  isMapped = false,
  compact = false,
  dotOnly = false
}) {
  if (!isMapped) return null;
  const rawStatus = summary?.status || 'no_data';
  // Mapping alone is enough for a healthy (green) indicator — sync data is optional.
  const status = !summary || rawStatus === 'no_data' ? 'ok' : rawStatus;
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.no_data;
  const tooltip = buildTooltip(summary || { status: 'ok' });
  const text = dotOnly ? '' : buildBadgeText(summary || { status: 'ok' });
  return <SmartTooltip content={tooltip}>
      <span className={`${styles.badge} ${cfg.className} ${dotOnly ? styles.dotOnly : ''} ${compact ? styles.dotOnly : ''}`} aria-label={tooltip}>
        <Icon icon={cfg.icon} className={styles.badgeIcon} />
        {!compact && !dotOnly && status !== 'ok' && <span className={styles.badgeText}>{text}</span>}
        {!compact && !dotOnly && status === 'ok' && <span className={styles.badgeText}>OK</span>}
      </span>
    </SmartTooltip>;
}
export function getEquipmentDbId(equipment) {
  return equipment?.rawData?.id || equipment?.id || null;
}
export function isCheckMKMappableType(type) {
  return ['Servers', 'NAS', 'Storage', 'Firewalls', 'Switch', 'BorneWifi', 'Alimentation', 'Routeur', 'TOIP'].includes(type);
}
