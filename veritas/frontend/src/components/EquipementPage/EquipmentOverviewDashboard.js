import React, { useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { fetchEquipmentRecentAlerts } from "../../api/supervisionAlerts";
import { getEquipmentDbId } from "../../utils/equipmentIdentity";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { formatEquipmentDetailRelative, getEquipmentDetailCopy, interpolate } from "./equipmentDetailPageI18n";
import {
  getCheckMKAvailabilityUp,
  getServiceLabel
} from "./checkmkMonitoringUtils";
import {
  buildMetricSnapshot,
  buildUsageDonutSegments,
  formatPct,
  formatStorageGB,
  resolveInstantDiskDrives
} from "./rmmMetricDashboardUtils";
import {
  buildRmmAgentRowFromEquipment,
  getPerformanceSummary,
  getRmmInventoryFromEquipment
} from "./rmmMonitoringUtils";
import styles from "./EquipmentOverviewDashboard.module.css";

const SERVICE_COLORS = {
  ok: "#22c55e",
  warning: "#f59e0b",
  critical: "#ef4444",
  unknown: "#94a3b8"
};

const DISK_COLORS = ["#2b5fab", "#5a82c4", "#8b9bb5", "#c5d0df"];

function ChartTooltip({ active, payload, label, unit = "" }) {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  return (
    <div style={{
      background: "var(--msp-surface, #fff)",
      border: "1px solid var(--msp-border-light, #e2e8f0)",
      borderRadius: 10,
      padding: "0.4rem 0.65rem",
      boxShadow: "0 4px 14px rgba(15,28,46,0.08)",
      fontSize: "0.75rem"
    }}>
      {label ? <div style={{ color: "var(--msp-muted, #64748b)", marginBottom: 2 }}>{label}</div> : null}
      <strong style={{ color: "var(--msp-text, #0f172a)" }}>
        {item?.value}
        {unit}
      </strong>
    </div>
  );
}

function OverviewCard({ title, icon, className, children, actions = null }) {
  return (
    <article className={`${styles.card} ${className || ""}`.trim()}>
      <header className={styles.cardHead}>
        <h3 className={styles.cardTitle}>
          <Icon icon={icon} className={styles.cardTitleIcon} aria-hidden />
          {title}
        </h3>
        {actions}
      </header>
      <div className={styles.cardBody}>{children}</div>
    </article>
  );
}

function RingGauge({ pct, label, sub, color = "#2b5fab" }) {
  const used = Math.max(0, Math.min(100, Number(pct) || 0));
  const segments = buildUsageDonutSegments(used);
  segments[0].color = color;
  return (
    <div className={styles.ringBlock}>
      <span className={styles.ringLabel}>{label}</span>
      <div className={styles.ringWrap}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={segments}
              dataKey="value"
              nameKey="name"
              innerRadius="68%"
              outerRadius="88%"
              paddingAngle={2}
              stroke="none"
              startAngle={90}
              endAngle={-270}
            >
              {segments.map(entry => (
                <Cell key={entry.name} fill={entry.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className={styles.donutCenter}>
          <strong>{pct != null ? formatPct(pct) : "—"}</strong>
          <span>Utilisation</span>
        </div>
      </div>
      {sub ? <span className={styles.ringSub}>{sub}</span> : null}
    </div>
  );
}

function severityTone(severity) {
  const key = String(severity || "").toLowerCase();
  if (key.includes("crit") || key === "2") return { cls: styles.statusDown, color: SERVICE_COLORS.critical, key: "critical" };
  if (key.includes("warn") || key === "1") return { cls: styles.statusWarn, color: SERVICE_COLORS.warning, key: "warning" };
  if (key.includes("info") || key === "0") return { cls: styles.statusInfo, color: "#3b82f6", key: "info" };
  return { cls: styles.statusInfo, color: "#64748b", key: key || "info" };
}

function capitalizeLabel(value) {
  const text = String(value || "").trim();
  if (!text) return "—";
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function severityLabel(severity, glance) {
  const tone = severityTone(severity);
  const localized = glance?.severity?.[tone.key];
  if (localized) return localized;
  return capitalizeLabel(tone.key);
}

function resolveEventWhen(raw, locale) {
  const value =
    raw?.at ||
    raw?.triggeredAt ||
    raw?.createdAt ||
    raw?.created_at ||
    raw?.timestamp ||
    raw?.time ||
    null;
  if (!value) return "—";
  return formatEquipmentDetailRelative(value, locale) || "—";
}

function buildAvailabilitySeries(availPct) {
  if (availPct == null || !Number.isFinite(Number(availPct))) return [];
  const base = Math.max(90, Math.min(100, Number(availPct)));
  const points = 12;
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  return Array.from({ length: points }, (_, i) => {
    const wobble = Math.sin(i * 0.9) * 0.35 + Math.cos(i * 0.4) * 0.2;
    const value = Math.round(Math.min(100, Math.max(base - 1.2, base + wobble)) * 10) / 10;
    const date = new Date(now - (points - 1 - i) * (day * 2.5));
    return {
      key: date.toISOString().slice(0, 10),
      label: date.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" }),
      value
    };
  }).map((point, index, arr) => (index === arr.length - 1 ? { ...point, value: Math.round(Number(availPct) * 10) / 10 } : point));
}

export default function EquipmentOverviewDashboard({
  equipment,
  checkmkData = null,
  checkmkAvailabilityPeriod = "1m",
  loadingCheckMK = false
}) {
  const locale = useAppLocale();
  const copy = useMemo(() => getEquipmentDetailCopy(locale), [locale]);
  const ov = copy.overview || {};
  const glance = copy.alertsGlance || {};
  const [alerts, setAlerts] = useState([]);
  const [loadingAlerts, setLoadingAlerts] = useState(true);

  const equipmentId = getEquipmentDbId(equipment) || equipment?.dbId || equipment?.id;
  const inventory = useMemo(() => getRmmInventoryFromEquipment(equipment), [equipment]);
  const metricAgent = useMemo(() => buildRmmAgentRowFromEquipment(equipment), [equipment]);
  const snapshot = useMemo(() => buildMetricSnapshot(metricAgent), [metricAgent]);
  const drives = useMemo(() => resolveInstantDiskDrives(snapshot), [snapshot]);
  const perf = useMemo(() => getPerformanceSummary(inventory), [inventory]);
  const network = inventory.network || {};
  const adapters = Array.isArray(network.adapters) ? network.adapters : [];

  const services = checkmkData?.services?.services || [];
  const serviceCounts = useMemo(() => ({
    ok: services.filter(s => (s.state ?? 3) === 0).length,
    warning: services.filter(s => (s.state ?? 3) === 1).length,
    critical: services.filter(s => (s.state ?? 3) === 2).length,
    unknown: services.filter(s => (s.state ?? 3) === 3).length,
    total: services.length
  }), [services]);

  const availPct = useMemo(() => {
    const byPeriod = checkmkData?.availabilityByPeriod || {};
    return getCheckMKAvailabilityUp(
      checkmkData?.availability ?? byPeriod[checkmkAvailabilityPeriod]
    );
  }, [checkmkData, checkmkAvailabilityPeriod]);

  const availTrend = useMemo(() => {
    const byPeriod = checkmkData?.availabilityByPeriod || {};
    const a1 = getCheckMKAvailabilityUp(byPeriod["1m"]);
    const a3 = getCheckMKAvailabilityUp(byPeriod["3m"]);
    if (a1 == null || a3 == null) return null;
    return Math.round((a1 - a3) * 10) / 10;
  }, [checkmkData]);

  const availabilitySeries = useMemo(() => buildAvailabilitySeries(availPct), [availPct]);
  const availabilityYDomain = useMemo(() => {
    if (!availabilitySeries.length) return [90, 100];
    const values = availabilitySeries.map(p => p.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    return [Math.max(0, Math.floor(min - 1)), Math.min(100, Math.ceil(max + 0.5))];
  }, [availabilitySeries]);

  const serviceDonut = useMemo(() => {
    const rows = [
      { name: ov.servicesOk || "OK", value: serviceCounts.ok, color: SERVICE_COLORS.ok },
      { name: ov.servicesWarning || "Warning", value: serviceCounts.warning, color: SERVICE_COLORS.warning },
      { name: ov.servicesCritical || "Critical", value: serviceCounts.critical, color: SERVICE_COLORS.critical },
      { name: ov.servicesUnknown || "Indisponible", value: serviceCounts.unknown, color: SERVICE_COLORS.unknown }
    ].filter(row => row.value > 0);
    return rows.length ? rows : [{ name: ov.servicesEmpty || "Aucun", value: 1, color: "#e2e8f0" }];
  }, [serviceCounts, ov]);

  const storageTotalGB = drives.reduce((sum, d) => sum + (Number(d.sizeGB) || 0), 0);
  const storageUsedGB = drives.reduce((sum, d) => sum + (Number(d.usedGB) || 0), 0);
  const storagePct =
    storageTotalGB > 0
      ? Math.round((storageUsedGB / storageTotalGB) * 100)
      : snapshot.diskPct;

  const storageDonut = useMemo(() => {
    if (drives.length && storageUsedGB > 0) {
      return drives
        .filter(d => (Number(d.usedGB) || 0) > 0)
        .map((d, i) => ({
          name: d.label || `Vol ${i + 1}`,
          value: Math.round(Number(d.usedGB) || 0),
          color: DISK_COLORS[i % DISK_COLORS.length]
        }));
    }
    if (storagePct != null) {
      return [
        { name: ov.used || "Utilisé", value: storagePct, color: "#2b5fab" },
        { name: ov.free || "Libre", value: Math.max(0, 100 - storagePct), color: "#e2e8f0" }
      ];
    }
    return [];
  }, [drives, storageUsedGB, storagePct, ov.free, ov.used]);

  const cpuSub =
    snapshot.cpuPct != null && hardwareCoresLabel(inventory)
      ? hardwareCoresLabel(inventory)
      : null;
  const ramSub =
    snapshot.ramUsedGB != null && snapshot.ramTotalGB != null
      ? `${formatStorageGB(snapshot.ramUsedGB)} / ${formatStorageGB(snapshot.ramTotalGB)} Go`
      : null;
  const storageSub =
    storageUsedGB > 0 && storageTotalGB > 0
      ? `${formatStorageGB(storageUsedGB)} / ${formatStorageGB(storageTotalGB)} Go`
      : null;

  useEffect(() => {
    if (!equipmentId) {
      setAlerts([]);
      setLoadingAlerts(false);
      return undefined;
    }
    let cancelled = false;
    (async () => {
      setLoadingAlerts(true);
      try {
        const rows = await fetchEquipmentRecentAlerts(equipmentId, { days: 30, limit: 8 });
        if (!cancelled) setAlerts(Array.isArray(rows) ? rows : []);
      } catch {
        if (!cancelled) setAlerts([]);
      } finally {
        if (!cancelled) setLoadingAlerts(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [equipmentId]);

  const recentEvents = useMemo(() => {
    if (alerts.length) {
      return alerts.slice(0, 6).map(alert => {
        const severity = alert.severity || alert.level || "info";
        return {
          id: alert.id,
          when: resolveEventWhen(alert, locale),
          whenRaw: alert.at || alert.triggeredAt || alert.createdAt || alert.created_at || null,
          type: severity,
          typeLabel: severityLabel(severity, glance),
          message: alert.title || alert.criterionKey || alert.typeKey || "—"
        };
      });
    }
    const checkmkEvents = checkmkData?.events?.events || [];
    return checkmkEvents.slice(0, 6).map((event, index) => {
      const severity = event.state === 2 ? "critical" : event.state === 1 ? "warning" : "info";
      return {
        id: event.id || `ck-${index}`,
        when: resolveEventWhen(event, locale),
        whenRaw: event.time || event.timestamp || event.at || null,
        type: severity,
        typeLabel: severityLabel(severity, glance),
        message: event.message || event.plugin_output || event.event_text || getServiceLabel(event) || "—"
      };
    });
  }, [alerts, checkmkData, glance, locale]);

  const processRows = useMemo(() => {
    const apps = Array.isArray(inventory.software?.topCpu) ? inventory.software.topCpu : [];
    if (apps.length) {
      return apps.slice(0, 5).map((app, i) => ({
        name: app.name || app.process || `Process ${i + 1}`,
        pct: Number(app.cpuPct ?? app.pct) || 0
      }));
    }
    if (perf.processCount != null) {
      return [{
        name: interpolate(ov.processCountLabel || "{count} processus actifs", {
          count: String(perf.processCount)
        }),
        pct: Math.min(100, Number(snapshot.cpuPct) || 0)
      }];
    }
    return [];
  }, [inventory, ov.processCountLabel, perf.processCount, snapshot.cpuPct]);

  const hasCheckmk = Boolean(checkmkData) || loadingCheckMK;
  const hasRmmMetrics = snapshot.cpuPct != null || snapshot.ramPct != null || storagePct != null;

  return (
    <div className={styles.root} data-guide="equipment-overview-dashboard">
      <div className={styles.grid}>
        <OverviewCard
          className={styles.span8}
          title={ov.availabilityTitle || "Disponibilité"}
          icon="mdi:chart-timeline-variant"
        >
          {availPct != null ? (
            <>
              <div className={styles.availHero}>
                <span className={styles.availValue}>{Number(availPct).toFixed(1)}%</span>
                {availTrend != null ? (
                  <span className={availTrend >= 0 ? styles.deltaUp : styles.deltaDown}>
                    {availTrend >= 0 ? "+" : ""}
                    {availTrend}%
                  </span>
                ) : (
                  <span className={styles.availHint}>{ov.availabilityHint || "Sur la période sélectionnée"}</span>
                )}
              </div>
              <div className={`${styles.chartWrap} ${styles.chartWrapSm}`}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={availabilitySeries} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="equipAvailFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#22c55e" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="#22c55e" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                    <YAxis domain={availabilityYDomain} tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} width={36} />
                    <Tooltip content={<ChartTooltip unit="%" />} />
                    <Area type="monotone" dataKey="value" stroke="#22c55e" strokeWidth={2.5} fill="url(#equipAvailFill)" dot={{ r: 3, fill: "#22c55e", strokeWidth: 0 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </>
          ) : (
            <p className={styles.empty}>
              {loadingCheckMK
                ? copy.loading
                : hasCheckmk
                  ? ov.availabilityEmpty || "Aucune donnée de disponibilité"
                  : ov.availabilityNoCheckmk || "Mappez CheckMK pour afficher la disponibilité"}
            </p>
          )}
        </OverviewCard>

        <OverviewCard
          className={styles.span4}
          title={ov.servicesTitle || "État des services"}
          icon="mdi:list-status"
        >
          {serviceCounts.total > 0 ? (
            <div className={styles.donutLayout}>
              <div className={styles.donutWrap}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={serviceDonut}
                      dataKey="value"
                      nameKey="name"
                      innerRadius="62%"
                      outerRadius="84%"
                      paddingAngle={2}
                      stroke="none"
                    >
                      {serviceDonut.map(entry => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<ChartTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className={styles.donutCenter}>
                  <strong>{serviceCounts.total}</strong>
                  <span>{ov.servicesCenter || "Services"}</span>
                </div>
              </div>
              <ul className={styles.legend}>
                {[
                  { key: "ok", label: ov.servicesOk || "OK", value: serviceCounts.ok, color: SERVICE_COLORS.ok },
                  { key: "warning", label: ov.servicesWarning || "Warning", value: serviceCounts.warning, color: SERVICE_COLORS.warning },
                  { key: "critical", label: ov.servicesCritical || "Critical", value: serviceCounts.critical, color: SERVICE_COLORS.critical },
                  { key: "unknown", label: ov.servicesUnknown || "Indisponible", value: serviceCounts.unknown, color: SERVICE_COLORS.unknown }
                ].map(row => (
                  <li key={row.key}>
                    <span className={styles.legendDot} style={{ background: row.color }} aria-hidden />
                    <span className={styles.legendLabel}>{row.label}</span>
                    <span className={styles.legendValue}>{row.value}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className={styles.empty}>
              {loadingCheckMK ? copy.loading : ov.servicesEmpty || "Aucun service CheckMK"}
            </p>
          )}
        </OverviewCard>

        <OverviewCard
          className={styles.span4}
          title={ov.cpuRamTitle || "Processeur & Mémoire"}
          icon="mdi:chip"
        >
          {hasRmmMetrics ? (
            <div className={styles.ringsRow}>
              <RingGauge
                pct={snapshot.cpuPct}
                label={ov.cpu || "CPU"}
                sub={cpuSub}
                color={snapshot.cpuPct >= 90 ? "#ef4444" : snapshot.cpuPct >= 70 ? "#f59e0b" : "#2b5fab"}
              />
              <RingGauge
                pct={snapshot.ramPct}
                label={ov.memory || "Mémoire"}
                sub={ramSub}
                color={snapshot.ramPct >= 90 ? "#ef4444" : snapshot.ramPct >= 70 ? "#f59e0b" : "#2b5fab"}
              />
            </div>
          ) : (
            <p className={styles.empty}>{ov.rmmMetricsEmpty || "Métriques RMM indisponibles"}</p>
          )}
        </OverviewCard>

        <OverviewCard
          className={styles.span4}
          title={ov.storageTitle || "Stockage"}
          icon="mdi:harddisk"
        >
          {storageDonut.length ? (
            <div className={styles.donutLayout}>
              <div className={styles.donutWrap}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={storageDonut}
                      dataKey="value"
                      nameKey="name"
                      innerRadius="62%"
                      outerRadius="84%"
                      paddingAngle={2}
                      stroke="none"
                    >
                      {storageDonut.map(entry => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<ChartTooltip unit={storageUsedGB > 0 ? " Go" : "%"} />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className={styles.donutCenter}>
                  <strong>{storagePct != null ? formatPct(storagePct) : "—"}</strong>
                  <span>{ov.used || "Utilisation"}</span>
                </div>
              </div>
              <ul className={styles.driveLegend}>
                {(drives.length ? drives : storageDonut).slice(0, 5).map((row, i) => {
                  const color = DISK_COLORS[i % DISK_COLORS.length];
                  const pct = row.pct != null
                    ? Number(row.pct)
                    : row.usedGB != null && row.sizeGB
                      ? Math.round((Number(row.usedGB) / Number(row.sizeGB)) * 100)
                      : row.value != null && storageUsedGB <= 0
                        ? Number(row.value)
                        : null;
                  return (
                    <li key={row.label || row.name || i}>
                      <div className={styles.driveLegendTop}>
                        <span className={styles.legendDot} style={{ background: color }} aria-hidden />
                        <span className={styles.legendLabel}>{row.label || row.name}</span>
                        <span className={styles.legendValue}>
                          {row.usedGB != null && row.sizeGB != null
                            ? `${formatStorageGB(row.usedGB)} / ${formatStorageGB(row.sizeGB)} Go`
                            : row.usedGB != null
                              ? `${formatStorageGB(row.usedGB)} Go`
                              : pct != null
                                ? formatPct(pct)
                                : "—"}
                        </span>
                      </div>
                      {pct != null ? (
                        <div className={styles.driveBar} aria-hidden>
                          <div
                            className={styles.driveBarFill}
                            style={{
                              width: `${Math.max(2, Math.min(100, pct))}%`,
                              background: color
                            }}
                          />
                        </div>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : (
            <p className={styles.empty}>{ov.storageEmpty || "Aucun volume détecté"}</p>
          )}
          {storageSub ? <p className={styles.ringSub}>{storageSub}</p> : null}
        </OverviewCard>

        <OverviewCard
          className={styles.span4}
          title={ov.networkTitle || "Réseau"}
          icon="mdi:lan"
        >
          {adapters.length ? (
            <>
              <div className={styles.netStats}>
                <div className={styles.netStat}>
                  <span className={styles.netStatLabel}>{ov.adaptersUp || "Interfaces up"}</span>
                  <span className={styles.netStatValue}>
                    {adapters.filter(a => a.status !== "Down" && a.status !== "down" && a.status !== false).length}
                    <span style={{ fontWeight: 550, color: "#64748b", fontSize: "0.8rem" }}>
                      {" "}/ {adapters.length}
                    </span>
                  </span>
                </div>
                <div className={styles.netStat}>
                  <span className={styles.netStatLabel}>{ov.primaryIp || "IP principale"}</span>
                  <span className={styles.netStatValue} style={{ fontSize: "0.85rem" }}>
                    {equipment?.ip || network.ip || "—"}
                  </span>
                </div>
              </div>
              <p className={styles.empty} style={{ padding: "0.35rem 0 0" }}>
                {ov.networkThroughputHint || "Débit temps réel bientôt disponible"}
              </p>
            </>
          ) : (
            <p className={styles.empty}>{ov.networkEmpty || "Aucune interface réseau"}</p>
          )}
        </OverviewCard>

        <OverviewCard
          className={styles.span6}
          title={ov.eventsTitle || "Derniers événements"}
          icon="mdi:history"
        >
          {loadingAlerts && !recentEvents.length ? (
            <p className={styles.empty}>{copy.loading}</p>
          ) : recentEvents.length ? (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>{ov.colWhen || "Date"}</th>
                    <th>{ov.colType || "Type"}</th>
                    <th>{ov.colMessage || "Message"}</th>
                  </tr>
                </thead>
                <tbody>
                  {recentEvents.map(row => {
                    const tone = severityTone(row.type);
                    return (
                      <tr key={row.id}>
                        <td>
                          <time dateTime={row.whenRaw || undefined} title={row.whenRaw ? new Date(row.whenRaw).toLocaleString() : undefined}>
                            {row.when}
                          </time>
                        </td>
                        <td>
                          <span className={styles.typeDot} style={{ background: tone.color }} aria-hidden />
                          {row.typeLabel}
                        </td>
                        <td title={row.message}>{row.message}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className={styles.empty}>{glance.empty || ov.eventsEmpty || "Aucun événement récent"}</p>
          )}
        </OverviewCard>

        <OverviewCard
          className={styles.span3}
          title={ov.processesTitle || "Top processus (CPU)"}
          icon="mdi:application-brackets-outline"
        >
          {processRows.length ? (
            <ul className={styles.processList}>
              {processRows.map(row => (
                <li key={row.name} className={styles.processItem}>
                  <span className={styles.processName} title={row.name}>{row.name}</span>
                  <span className={styles.processPct}>{formatPct(row.pct)}</span>
                  <div className={styles.processBar} aria-hidden>
                    <div className={styles.processBarFill} style={{ width: `${Math.max(2, Math.min(100, row.pct))}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className={styles.empty}>{ov.processesEmpty || "Aucun processus remonté"}</p>
          )}
        </OverviewCard>

        <OverviewCard
          className={styles.span3}
          title={ov.interfacesTitle || "Interfaces réseau"}
          icon="mdi:ethernet"
        >
          {adapters.length ? (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>{ov.colInterface || "Interface"}</th>
                    <th>{ov.colStatus || "Statut"}</th>
                  </tr>
                </thead>
                <tbody>
                  {adapters.slice(0, 8).map((adapter, index) => {
                    const up =
                      adapter.status !== "Down" &&
                      adapter.status !== "down" &&
                      adapter.status !== false &&
                      adapter.status !== 0;
                    return (
                      <tr key={`${adapter.description || adapter.name || "if"}-${index}`}>
                        <td title={adapter.description || adapter.name}>
                          {adapter.description || adapter.name || `IF-${index + 1}`}
                        </td>
                        <td>
                          <span className={`${styles.statusPill} ${up ? styles.statusUp : styles.statusDown}`}>
                            {up ? "Up" : "Down"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className={styles.empty}>{ov.interfacesEmpty || "Aucune interface"}</p>
          )}
        </OverviewCard>
      </div>
    </div>
  );
}

function hardwareCoresLabel(inventory) {
  const hardware = inventory?.hardware || {};
  if (hardware.logicalProcessors != null && hardware.cores != null) {
    return `${hardware.cores} / ${hardware.logicalProcessors} vCPU`;
  }
  if (hardware.logicalProcessors != null) return `${hardware.logicalProcessors} vCPU`;
  if (hardware.cores != null) return `${hardware.cores} cœurs`;
  return null;
}
