import React, { useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import { fetchEquipmentRecentAlerts } from "../../api/supervisionAlerts";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { getEquipmentDbId } from "../../utils/equipmentIdentity";
import { formatEquipmentDetailRelative, getEquipmentDetailCopy } from "./equipmentDetailPageI18n";
import { getSupervisionAlertRulesCopy } from "./supervisionAlertRulesPanelI18n";
import styles from "./EquipmentAlertsGlance.module.css";

const SEVERITY_ICONS = {
  critical: "mdi:alert-octagon",
  warning: "mdi:alert",
  info: "mdi:information-outline"
};

function resolveAlertTitle(alert, glance, criteriaCopy) {
  const stored = String(alert?.title || "").trim();
  if (alert.typeKind === "criterion" && alert.criterionKey) {
    const criterionLabel = criteriaCopy.getCriterionLabel(alert.criterionKey, alert.criterionKey);
    // Prefer an already-explicit stored title (e.g. "Warning - Filesystem E:/")
    if (stored && stored !== alert.criterionKey) {
      const storedLower = stored.toLowerCase();
      const criterionLower = String(criterionLabel || "").toLowerCase();
      if (storedLower !== criterionLower && !/^(warning|critical|info|monitor_warning|monitor_critical)$/i.test(stored)) {
        return stored;
      }
      if (stored.includes(" - ") || stored.includes(" — ")) return stored;
    }
    return criterionLabel;
  }
  if (alert.eventType && glance.eventTypes?.[alert.eventType]) {
    const eventLabel = glance.eventTypes[alert.eventType];
    if (stored && (stored.includes(" - ") || stored.includes(" — ") || stored.length > eventLabel.length + 2)) {
      return stored;
    }
    if (alert.criterionKey) {
      const criterion = criteriaCopy.getCriterionLabel(alert.criterionKey, alert.criterionKey);
      return `${criterion} · ${eventLabel}`;
    }
    return stored || eventLabel;
  }
  return stored || alert.typeKey || "—";
}

function resolveTypeLabel(alert, glance, criteriaCopy) {
  if (alert.source === "checkmk" || alert.typeKey === "checkmk_event" || alert.typeKey === "checkmk_notification") {
    if (alert.kind === "notification" || alert.eventType === "checkmk_notification") {
      return glance.eventTypes?.checkmk_notification || "CheckMK · notification";
    }
    return glance.eventTypes?.checkmk_event || "CheckMK · événement";
  }
  if (alert.domain && glance.domains?.[alert.domain]) {
    return glance.domains[alert.domain];
  }
  if (alert.criterionKey) {
    return criteriaCopy.getCriterionLabel(alert.criterionKey, alert.criterionKey);
  }
  return alert.typeKey || alert.domain || "—";
}

export default function EquipmentAlertsGlance({
  equipment,
  days = 30,
  limit = 50
}) {
  const locale = useAppLocale();
  const copy = useMemo(() => getEquipmentDetailCopy(locale), [locale]);
  const glance = copy.alertsGlance;
  const criteriaCopy = useMemo(() => getSupervisionAlertRulesCopy(locale), [locale]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const equipmentId = getEquipmentDbId(equipment) || equipment?.dbId || equipment?.rawData?.id || equipment?.id;

  useEffect(() => {
    if (!equipmentId) {
      setAlerts([]);
      setLoading(false);
      return undefined;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const rows = await fetchEquipmentRecentAlerts(equipmentId, {
          days,
          limit
        });
        if (!cancelled) setAlerts(Array.isArray(rows) ? rows : []);
      } catch (err) {
        if (!cancelled) {
          setAlerts([]);
          setError(err?.message || glance.error);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [equipmentId, days, limit, glance.error]);

  const isEmpty = !loading && !error && alerts.length === 0;

  return <section className={`${styles.root} ${isEmpty ? styles.rootCompact : ""}`.trim()} aria-label={glance.title}>
      <header className={styles.header}>
        <div className={styles.headerText}>
          <h2 className={styles.title}>
            <Icon icon="mdi:history" className={styles.titleIcon} aria-hidden />
            {glance.title}
          </h2>
          {!isEmpty ? <p className={styles.subtitle}>{glance.subtitle}</p> : null}
        </div>
        {isEmpty ? <p className={styles.emptyInline}>{glance.empty}</p> : !loading && !error ? <span className={styles.count}>{alerts.length}</span> : null}
      </header>

      {loading ? <p className={styles.state}>{glance.loading}</p> : error ? <p className={`${styles.state} ${styles.stateError}`}>{glance.error}</p> : alerts.length === 0 ? null : <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.colWhen}>{glance.colWhen}</th>
                <th>{glance.colType}</th>
                <th>{glance.colSeverity}</th>
                <th>{glance.colStatus}</th>
              </tr>
            </thead>
            <tbody>
              {alerts.map(alert => {
            const severity = String(alert.severity || "info").toLowerCase();
            const statusKey = String(alert.status || "").toLowerCase();
            const title = resolveAlertTitle(alert, glance, criteriaCopy);
            const typeLabel = resolveTypeLabel(alert, glance, criteriaCopy);
            const statusLabel = glance.status?.[statusKey] || alert.status || "—";
            const severityLabel = glance.severity?.[severity] || severity;
            return <tr key={alert.id} className={styles[`sev_${severity}`] || ""}>
                    <td className={styles.whenCell}>
                      <time dateTime={alert.at || undefined} title={alert.at ? new Date(alert.at).toLocaleString() : undefined}>
                        {formatEquipmentDetailRelative(alert.at, locale)}
                      </time>
                    </td>
                    <td className={styles.alertCell}>
                      <span className={styles.itemTitle}>{title}</span>
                      <span className={styles.meta}>{typeLabel}</span>
                    </td>
                    <td>
                      <span className={`${styles.chip} ${styles[`chip_${severity}`] || ""}`}>
                        <Icon icon={SEVERITY_ICONS[severity] || SEVERITY_ICONS.info} aria-hidden />
                        {severityLabel}
                      </span>
                    </td>
                    <td>
                      <span className={`${styles.chip} ${styles[`status_${statusKey}`] || ""}`}>{statusLabel}</span>
                    </td>
                  </tr>;
          })}
            </tbody>
          </table>
        </div>}
    </section>;
}
