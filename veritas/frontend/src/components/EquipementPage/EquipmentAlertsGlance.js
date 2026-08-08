import React, { useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import { fetchEquipmentRecentAlerts } from "../../api/supervisionAlerts";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
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
  limit = 10
}) {
  const locale = useAppLocale();
  const copy = useMemo(() => getEquipmentDetailCopy(locale), [locale]);
  const glance = copy.alertsGlance;
  const criteriaCopy = useMemo(() => getSupervisionAlertRulesCopy(locale), [locale]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const equipmentId = equipment?.rawData?.id || equipment?.id;
  const clientId = equipment?.clientId;

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
          clientId,
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
  }, [equipmentId, clientId, limit, glance.error]);

  return <aside className={styles.root} aria-label={glance.title}>
      <header className={styles.header}>
        <div className={styles.headerText}>
          <h2 className={styles.title}>
            <Icon icon="mdi:bell-ring-outline" className={styles.titleIcon} aria-hidden />
            {glance.title}
          </h2>
          <p className={styles.subtitle}>{glance.subtitle}</p>
        </div>
      </header>

      {loading ? <p className={styles.state}>{glance.loading}</p> : error ? <p className={`${styles.state} ${styles.stateError}`}>{glance.error}</p> : alerts.length === 0 ? <p className={styles.state}>{glance.empty}</p> : <ul className={styles.list}>
          {alerts.map(alert => {
          const severity = String(alert.severity || "info").toLowerCase();
          const statusKey = String(alert.status || "").toLowerCase();
          const title = resolveAlertTitle(alert, glance, criteriaCopy);
          const typeLabel = resolveTypeLabel(alert, glance, criteriaCopy);
          const statusLabel = glance.status?.[statusKey] || alert.status || "—";
          const severityLabel = glance.severity?.[severity] || severity;
          return <li key={alert.id} className={`${styles.item} ${styles[`sev_${severity}`] || ""}`}>
                <span className={styles.sevIcon} title={severityLabel}>
                  <Icon icon={SEVERITY_ICONS[severity] || SEVERITY_ICONS.info} aria-hidden />
                </span>
                <div className={styles.body}>
                  <span className={styles.itemTitle}>{title}</span>
                  <span className={styles.meta}>
                    <span className={styles.type}>{typeLabel}</span>
                    <span className={styles.dot} aria-hidden>·</span>
                    <span className={styles.status}>{statusLabel}</span>
                  </span>
                </div>
                <time className={styles.when} dateTime={alert.at || undefined} title={alert.at ? new Date(alert.at).toLocaleString() : undefined}>
                  {formatEquipmentDetailRelative(alert.at, locale)}
                </time>
              </li>;
        })}
        </ul>}
    </aside>;
}
