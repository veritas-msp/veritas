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
  if (alert.typeKind === "criterion" && alert.criterionKey) {
    return criteriaCopy.getCriterionLabel(alert.criterionKey, alert.title);
  }
  if (alert.eventType && glance.eventTypes?.[alert.eventType]) {
    const eventLabel = glance.eventTypes[alert.eventType];
    if (alert.criterionKey) {
      const criterion = criteriaCopy.getCriterionLabel(alert.criterionKey, alert.criterionKey);
      return `${criterion} · ${eventLabel}`;
    }
    return eventLabel;
  }
  return alert.title || alert.typeKey || "—";
}

function resolveTypeLabel(alert, glance, criteriaCopy) {
  if (alert.source === "checkmk" || alert.typeKey === "checkmk_event" || alert.typeKey === "checkmk_notification") {
    if (alert.kind === "notification" || alert.eventType === "checkmk_notification") {
      return glance.eventTypes?.checkmk_notification || "CheckMK · notification";
    }
    return glance.eventTypes?.checkmk_event || "CheckMK · événement";
  }
  if (alert.criterionKey) {
    return criteriaCopy.getCriterionLabel(alert.criterionKey, alert.criterionKey);
  }
  if (alert.domain && glance.domains?.[alert.domain]) {
    return glance.domains[alert.domain];
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

  return <section className={styles.root} aria-label={glance.title}>
      <header className={styles.header}>
        <div className={styles.headerText}>
          <h2 className={styles.title}>
            <Icon icon="mdi:history" className={styles.titleIcon} aria-hidden />
            {glance.title}
          </h2>
          <p className={styles.subtitle}>{glance.subtitle}</p>
        </div>
        {!loading && !error ? <span className={styles.count}>{alerts.length}</span> : null}
      </header>

      {loading ? <p className={styles.state}>{glance.loading}</p> : error ? <p className={`${styles.state} ${styles.stateError}`}>{glance.error}</p> : alerts.length === 0 ? <p className={styles.state}>{glance.empty}</p> : <div className={styles.tableWrap}>
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
