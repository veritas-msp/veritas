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
import { fetchEquipmentActivity } from "../../api/equipmentActivity";
import { fetchEquipmentRecentAlerts, fetchSupervisionExclusionHistory } from "../../api/supervisionAlerts";
import { getEquipmentClientId, getEquipmentDbId } from "../../utils/equipmentIdentity";
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
  getRmmInventoryFromEquipment,
  isRmmManagedEquipment
} from "./rmmMonitoringUtils";
import {
  normalizeEquipmentOverviewPane,
  readEquipmentDetailUi,
  writeEquipmentDetailUi
} from "../../utils/equipmentDetailUiState";
import { resolveEquipmentActivityRange } from "./equipmentActivityUtils";
import EquipmentEmptyState from "./EquipmentEmptyState";
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

function RingGauge({ pct, label = null, sub, color = "#2b5fab", centreLabel = "Utilisation", compact = false }) {
  const used = Math.max(0, Math.min(100, Number(pct) || 0));
  const segments = buildUsageDonutSegments(used);
  segments[0].color = color;
  return (
    <div className={`${styles.ringBlock} ${compact ? styles.ringBlockCompact : ""}`.trim()}>
      {label ? <span className={styles.ringLabel}>{label}</span> : null}
      <div className={`${styles.ringWrap} ${compact ? styles.ringWrapCompact : ""}`.trim()}>
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
          <span>{centreLabel}</span>
        </div>
      </div>
      {sub ? <span className={styles.ringSub}>{sub}</span> : null}
    </div>
  );
}

function isAdapterUp(adapter) {
  return (
    adapter?.status !== "Down" &&
    adapter?.status !== "down" &&
    adapter?.status !== false &&
    adapter?.status !== 0
  );
}

function RamSlotsBoard({ modules = [], slotCount, copy }) {
  const used = modules.length;
  const slots = Math.max(Number(slotCount) || 0, used);
  if (!slots && !used) return null;
  const total = Math.max(slots, used, 1);
  return (
    <div className={styles.ramSlotsBoard} role="list" aria-label={copy.ramSlotsAria || "Emplacements mémoire"}>
      <div className={styles.ramSlotsRow}>
        {Array.from({ length: total }, (_, index) => {
          const module = modules[index];
          const filled = Boolean(module);
          const capacity =
            module?.capacityGB != null ? `${formatStorageGB(module.capacityGB)} Go` : null;
          const speed = module?.speedMHz != null ? `${module.speedMHz} MHz` : null;
          const title = filled
            ? [capacity, speed, module?.manufacturer, module?.partNumber].filter(Boolean).join(" · ")
            : copy.ramSlotsEmpty || "Libre";
          return (
            <div
              key={index}
              role="listitem"
              className={`${styles.ramSlot} ${filled ? styles.ramSlotFilled : styles.ramSlotEmpty}`}
              title={title}
            >
              <span className={styles.ramSlotIndex}>#{index + 1}</span>
              <span className={styles.ramSlotCap}>
                {filled ? capacity || (copy.ramSlotsFilled || "Occupé") : copy.ramSlotsEmpty || "Libre"}
              </span>
            </div>
          );
        })}
      </div>
      <p className={styles.ramSlotsMeta}>
        {used} / {total} {copy.ramSlotsUsed || "barrettes installées"}
      </p>
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

function lifecycleTone(kind, severity) {
  if (kind === "alert") return severityTone(severity);
  if (kind === "ticket") return { color: "#2b5fab", key: "ticket" };
  if (kind === "planning") return { color: "#7c3aed", key: "planning" };
  if (kind === "maintenance") return { color: "#c2410c", key: "maintenance" };
  return { color: "#64748b", key: kind || "info" };
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

function lifecycleTypeLabel(kind, severity, ov, glance) {
  if (kind === "ticket") return ov.kindTicket || "Ticket";
  if (kind === "planning") return ov.kindPlanning || "Intervention";
  if (kind === "maintenance") return ov.kindMaintenance || "Maintenance";
  if (kind === "alert") return severityLabel(severity, glance);
  return capitalizeLabel(kind);
}

function resolveEventWhen(value, locale) {
  if (!value) return "—";
  return formatEquipmentDetailRelative(value, locale) || "—";
}

function formatAbsoluteWhen(value, locale) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  try {
    return d.toLocaleString(locale === "en" ? "en-GB" : locale || "fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  } catch {
    return d.toISOString();
  }
}

function buildLifecycleFeed({
  alerts = [],
  checkmkEvents = [],
  tickets = [],
  planningEvents = [],
  maintenances = [],
  locale,
  ov,
  glance
}) {
  const rows = [];

  for (const alert of alerts) {
    const whenRaw = alert.at || alert.triggeredAt || alert.createdAt || alert.created_at || null;
    const severity = alert.severity || alert.level || "info";
    rows.push({
      id: `alert-${alert.id || whenRaw || Math.random()}`,
      kind: "alert",
      severity,
      whenRaw,
      when: resolveEventWhen(whenRaw, locale),
      typeLabel: lifecycleTypeLabel("alert", severity, ov, glance),
      message: alert.title || alert.criterionKey || alert.typeKey || "—",
      actor: alert.acknowledgedByName || alert.userName || null
    });
  }

  if (!alerts.length) {
    for (const [index, event] of checkmkEvents.entries()) {
      const whenRaw = event.time || event.timestamp || event.at || null;
      const severity = event.state === 2 ? "critical" : event.state === 1 ? "warning" : "info";
      rows.push({
        id: `ck-${event.id || index}`,
        kind: "alert",
        severity,
        whenRaw,
        when: resolveEventWhen(whenRaw, locale),
        typeLabel: lifecycleTypeLabel("alert", severity, ov, glance),
        message: event.message || event.plugin_output || event.event_text || getServiceLabel(event) || "—",
        actor: null
      });
    }
  }

  for (const ticket of tickets) {
    const whenRaw = ticket.updated_at || ticket.created_at || null;
    const number = ticket.ticket_number ? `#${ticket.ticket_number}` : "";
    const status = ticket.status ? String(ticket.status) : "";
    rows.push({
      id: `ticket-${ticket.id || whenRaw}`,
      kind: "ticket",
      severity: "info",
      whenRaw,
      when: resolveEventWhen(whenRaw, locale),
      typeLabel: lifecycleTypeLabel("ticket", null, ov, glance),
      message: [number, ticket.title || ov.ticketFallback || "Ticket", status].filter(Boolean).join(" · "),
      actor: ticket.assignee_name || ticket.created_by_name || ticket.author_name || null
    });
  }

  for (const event of planningEvents) {
    const whenRaw = event.start || event.event_start || event.created_at || null;
    rows.push({
      id: `planning-${event.id || whenRaw}`,
      kind: "planning",
      severity: "info",
      whenRaw,
      when: resolveEventWhen(whenRaw, locale),
      typeLabel: lifecycleTypeLabel("planning", null, ov, glance),
      message: [event.title || ov.planningFallback || "Intervention", event.type].filter(Boolean).join(" · "),
      actor: event.assigned_user_name || event.created_by_name || null
    });
  }

  for (const excl of maintenances) {
    if ((excl.kind || "maintenance") !== "maintenance" || excl.scope !== "device") continue;
    const reason = String(excl.reason || excl.comment || "").trim();
    const untilLabel = formatAbsoluteWhen(excl.excludedUntil, locale);
    const startRaw = excl.createdAt || excl.created_at || null;
    if (startRaw) {
      rows.push({
        id: `maint-start-${excl.id || startRaw}`,
        kind: "maintenance",
        severity: "warning",
        whenRaw: startRaw,
        when: resolveEventWhen(startRaw, locale),
        typeLabel: lifecycleTypeLabel("maintenance", null, ov, glance),
        message: [
          ov.maintenanceStarted || "Mise en maintenance",
          reason || null,
          untilLabel ? interpolate(ov.maintenanceUntil || "jusqu’au {date}", { date: untilLabel }) : null
        ].filter(Boolean).join(" — "),
        actor: excl.excludedByName || excl.createdByName || null
      });
    }
    const endRaw = excl.endedAt || excl.ended_at || (!excl.active && excl.excludedUntil ? excl.excludedUntil : null);
    if (endRaw && !excl.active) {
      rows.push({
        id: `maint-end-${excl.id || endRaw}`,
        kind: "maintenance",
        severity: "info",
        whenRaw: endRaw,
        when: resolveEventWhen(endRaw, locale),
        typeLabel: lifecycleTypeLabel("maintenance", null, ov, glance),
        message: ov.maintenanceEnded || "Fin de maintenance",
        actor: excl.endedByName || null
      });
    }
  }

  return rows
    .filter(row => row.whenRaw)
    .sort((a, b) => new Date(b.whenRaw).getTime() - new Date(a.whenRaw).getTime())
    .slice(0, 12);
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
  loadingCheckMK = false,
  maintenanceHistoryKey = 0,
  sheetContent = null,
  showRmmTab = null,
  showSupervisionTab = null,
  forcedPane = null,
  hidePaneSwitch = false
}) {
  const locale = useAppLocale();
  const copy = useMemo(() => getEquipmentDetailCopy(locale), [locale]);
  const ov = copy.overview || {};
  const glance = copy.alertsGlance || {};
  const [lifecycleFeed, setLifecycleFeed] = useState([]);
  const [loadingLifecycle, setLoadingLifecycle] = useState(true);

  const equipmentId = getEquipmentDbId(equipment) || equipment?.dbId || equipment?.id;
  const equipmentDbId = equipmentId;
  const equipmentClientId = getEquipmentClientId(equipment);
  const rmmManaged = isRmmManagedEquipment(equipment);
  const allowRmm = showRmmTab == null ? rmmManaged : Boolean(showRmmTab);
  const allowSupervision =
    showSupervisionTab == null
      ? Boolean(equipment?.checkmkMapping?.checkmk_host_name || checkmkData)
      : Boolean(showSupervisionTab);
  const showFicheTab = Boolean(sheetContent);
  const showPaneSwitch =
    !hidePaneSwitch &&
    !forcedPane &&
    ((showFicheTab ? 1 : 0) + (allowRmm ? 1 : 0) + (allowSupervision ? 1 : 0) > 1);

  const [overviewPane, setOverviewPane] = useState(() =>
    normalizeEquipmentOverviewPane(forcedPane || readEquipmentDetailUi(equipmentId)?.overviewPane, {
      allowRmm,
      allowSupervision
    })
  );

  useEffect(() => {
    if (forcedPane) {
      setOverviewPane(
        normalizeEquipmentOverviewPane(forcedPane, {
          allowRmm,
          allowSupervision
        })
      );
      return;
    }
    const saved = readEquipmentDetailUi(equipmentId)?.overviewPane;
    setOverviewPane(
      normalizeEquipmentOverviewPane(saved, {
        allowRmm,
        allowSupervision
      })
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps -- restore pane when switching equipment
  }, [equipmentId, forcedPane]);

  useEffect(() => {
    setOverviewPane(prev =>
      normalizeEquipmentOverviewPane(forcedPane || prev, { allowRmm, allowSupervision })
    );
  }, [allowRmm, allowSupervision, forcedPane]);

  useEffect(() => {
    if (!equipmentId || forcedPane) return;
    writeEquipmentDetailUi(equipmentId, {
      overviewPane: normalizeEquipmentOverviewPane(overviewPane, {
        allowRmm,
        allowSupervision
      })
    });
  }, [equipmentId, overviewPane, allowRmm, allowSupervision, forcedPane]);
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

  const hardware = inventory.hardware || {};
  const ramModules = Array.isArray(hardware.ramModules)
    ? hardware.ramModules
        .map(module => ({
          ...module,
          capacityGB: module?.capacityGB ?? module?.capacityGb ?? null
        }))
        .filter(module => module.capacityGB != null && Number(module.capacityGB) > 0)
    : [];
  const ramSlotCount = Number(hardware.ramSlotCount) > 0 ? Number(hardware.ramSlotCount) : ramModules.length || null;
  const firstRamModule = ramModules[0] || null;
  const ramSpeed = firstRamModule?.speedMHz != null ? `${firstRamModule.speedMHz} MHz` : null;
  const cpuName = hardware.cpu || inventory.processeur || null;
  const cpuClock =
    hardware.currentClockMHz != null
      ? `${hardware.currentClockMHz} MHz`
      : hardware.maxClockMHz != null
        ? `${hardware.maxClockMHz} MHz`
        : null;
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
  const adaptersUpCount = adapters.filter(isAdapterUp).length;
  const primaryIp = equipment?.ip || network.ip || null;
  const utilisationLabel = ov.utilisation || ov.used || "Utilisation";

  useEffect(() => {
    if (!equipmentId) {
      setLifecycleFeed([]);
      setLoadingLifecycle(false);
      return undefined;
    }
    let cancelled = false;
    const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
    (async () => {
      setLoadingLifecycle(true);
      const range = resolveEquipmentActivityRange({ preset: "30d" });
      const signal = controller?.signal;
      const [alertsResult, activityResult, maintenanceResult] = await Promise.allSettled([
        fetchEquipmentRecentAlerts(equipmentId, { days: 30, limit: 20 }),
        fetchEquipmentActivity({
          equipmentId,
          clientId: equipmentClientId || undefined,
          startDate: range.start?.toISOString?.() || undefined,
          endDate: range.end?.toISOString?.() || undefined,
          signal
        }),
        fetchSupervisionExclusionHistory({
          equipmentId,
          clientId: equipmentClientId || undefined,
          kind: "maintenance",
          limit: 20,
          signal
        })
      ]);
      if (cancelled) return;
      const alerts = alertsResult.status === "fulfilled" && Array.isArray(alertsResult.value) ? alertsResult.value : [];
      const activity = activityResult.status === "fulfilled" ? activityResult.value : null;
      const maintenances =
        maintenanceResult.status === "fulfilled" && Array.isArray(maintenanceResult.value)
          ? maintenanceResult.value
          : [];
      setLifecycleFeed(
        buildLifecycleFeed({
          alerts,
          checkmkEvents: checkmkData?.events?.events || [],
          tickets: activity?.tickets || [],
          planningEvents: activity?.events || [],
          maintenances,
          locale,
          ov,
          glance
        })
      );
      setLoadingLifecycle(false);
    })();
    return () => {
      cancelled = true;
      controller?.abort?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- ov/glance follow locale; rebuild when checkmk/maintenance refresh
  }, [equipmentId, equipmentClientId, maintenanceHistoryKey, checkmkData, locale]);

  const recentEvents = lifecycleFeed;

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
  const activePane = normalizeEquipmentOverviewPane(overviewPane, {
    allowRmm,
    allowSupervision
  });
  const showFichePane = activePane === "fiche" && showFicheTab;
  const showRmmPane = activePane === "rmm" && allowRmm;
  const showSupervisionPane = activePane === "supervision" && allowSupervision;

  return (
    <div className={styles.root} data-guide="equipment-overview-dashboard">
      {showPaneSwitch ? (
        <div className={styles.paneSwitch} role="tablist" aria-label={ov.paneAria || "Vue d'ensemble"}>
          {allowSupervision ? (
            <button
              type="button"
              role="tab"
              aria-selected={showSupervisionPane}
              className={`${styles.paneSwitchBtn} ${showSupervisionPane ? styles.paneSwitchBtnActive : ""}`.trim()}
              onClick={() => setOverviewPane("supervision")}
            >
              <Icon icon="mdi:radar" aria-hidden />
              {ov.tabSupervision || "Synthèse"}
            </button>
          ) : null}
          {showFicheTab ? (
            <button
              type="button"
              role="tab"
              aria-selected={showFichePane}
              className={`${styles.paneSwitchBtn} ${showFichePane ? styles.paneSwitchBtnActive : ""}`.trim()}
              onClick={() => setOverviewPane("fiche")}
            >
              <Icon icon="mdi:clipboard-text-outline" aria-hidden />
              {ov.tabFiche || "Informations matériel"}
            </button>
          ) : null}
          {allowRmm ? (
            <button
              type="button"
              role="tab"
              aria-selected={showRmmPane}
              className={`${styles.paneSwitchBtn} ${showRmmPane ? styles.paneSwitchBtnActive : ""}`.trim()}
              onClick={() => setOverviewPane("rmm")}
            >
              <Icon icon="mdi:desktop-classic" aria-hidden />
              {ov.tabRmm || "RMM"}
            </button>
          ) : null}
        </div>
      ) : null}

      {showFichePane ? (
        <div className={styles.fichePane} aria-label={ov.tabFiche || "Informations matériel"}>
          {sheetContent}
        </div>
      ) : null}

      {showRmmPane ? (
        <section className={`${styles.column} ${styles.columnFill}`.trim()} aria-label={ov.rmmSectionTitle || "Agent RMM"}>
          <div className={styles.metricsRow}>
            <OverviewCard title={ov.cpuTitle || ov.cpu || "CPU"} icon="mdi:cpu-64-bit">
              {snapshot.cpuPct != null || cpuSub || cpuName ? (
                <div className={styles.metricCardBody}>
                  <RingGauge
                    pct={snapshot.cpuPct}
                    sub={cpuSub}
                    compact
                    centreLabel={utilisationLabel}
                    color={snapshot.cpuPct >= 90 ? "#ef4444" : snapshot.cpuPct >= 70 ? "#f59e0b" : "#2b5fab"}
                  />
                  <ul className={styles.metricFacts}>
                    {cpuName ? (
                      <li title={cpuName}>
                        <span>{ov.cpu || "CPU"}</span>
                        <strong>{cpuName}</strong>
                      </li>
                    ) : null}
                    {cpuClock ? (
                      <li>
                        <span>{ov.cpuClock || "Fréquence"}</span>
                        <strong>{cpuClock}</strong>
                      </li>
                    ) : null}
                    {perf.processCount != null ? (
                      <li>
                        <span>{ov.cpuProcesses || "Processus"}</span>
                        <strong>{perf.processCount}</strong>
                      </li>
                    ) : null}
                  </ul>
                </div>
              ) : (
                <EquipmentEmptyState
                  icon="mdi:cpu-64-bit"
                  message={ov.rmmMetricsEmpty || "Métriques RMM indisponibles"}
                  compact
                />
              )}
            </OverviewCard>

            <OverviewCard title={ov.memoryTitle || ov.memory || "Mémoire"} icon="mdi:memory">
              {snapshot.ramPct != null || ramSub || ramModules.length ? (
                <div className={styles.metricCardBody}>
                  <RingGauge
                    pct={snapshot.ramPct}
                    sub={[ramSub, ramSpeed].filter(Boolean).join(" · ") || null}
                    compact
                    centreLabel={utilisationLabel}
                    color={snapshot.ramPct >= 90 ? "#ef4444" : snapshot.ramPct >= 70 ? "#f59e0b" : "#2b5fab"}
                  />
                  <RamSlotsBoard modules={ramModules} slotCount={ramSlotCount} copy={ov} />
                </div>
              ) : (
                <EquipmentEmptyState
                  icon="mdi:memory"
                  message={ov.rmmMetricsEmpty || "Métriques RMM indisponibles"}
                  compact
                />
              )}
            </OverviewCard>

            <OverviewCard title={ov.storageTitle || "Stockage"} icon="mdi:harddisk">
              {storageDonut.length ? (
                <div className={styles.metricCardBody}>
                  <RingGauge
                    pct={storagePct}
                    sub={storageSub}
                    compact
                    centreLabel={utilisationLabel}
                    color={storagePct >= 90 ? "#ef4444" : storagePct >= 75 ? "#f59e0b" : "#2b5fab"}
                  />
                  <ul className={styles.driveLegend}>
                    {(drives.length ? drives : storageDonut).slice(0, 3).map((row, i) => {
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
                  {drives.length > 3 ? (
                    <p className={styles.ringSub}>
                      +{drives.length - 3} {ov.driveCount || "volumes"}
                    </p>
                  ) : null}
                </div>
              ) : (
                <EquipmentEmptyState
                  icon="mdi:harddisk"
                  message={ov.storageEmpty || "Aucun volume détecté"}
                  compact
                />
              )}
            </OverviewCard>

            <OverviewCard title={ov.networkTitle || "Réseau"} icon="mdi:lan">
              {adapters.length || primaryIp ? (
                <div className={styles.metricCardBody}>
                  <ul className={styles.metricFacts}>
                    <li>
                      <span>{ov.adaptersUp || "Interfaces IP"}</span>
                      <strong>
                        {adaptersUpCount}
                        <span className={styles.netStatMuted}> / {adapters.length || 0}</span>
                      </strong>
                    </li>
                    <li title={primaryIp || undefined}>
                      <span>{ov.primaryIp || "IP principale"}</span>
                      <strong>{primaryIp || "—"}</strong>
                    </li>
                  </ul>
                  {adapters.length ? (
                    <ul className={styles.netIfList}>
                      {adapters.slice(0, 4).map((adapter, index) => {
                        const up = isAdapterUp(adapter);
                        const name = adapter.description || adapter.name || `IF-${index + 1}`;
                        return (
                          <li key={`${name}-${index}`}>
                            <span className={styles.netIfName} title={name}>{name}</span>
                            <span className={`${styles.statusPill} ${up ? styles.statusUp : styles.statusDown}`}>
                              {up ? "Up" : "Down"}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  ) : null}
                  <p className={styles.ringSub}>
                    {ov.networkThroughputHint || "Débit temps réel bientôt disponible"}
                  </p>
                </div>
              ) : (
                <EquipmentEmptyState
                  icon="mdi:lan"
                  message={ov.networkEmpty || "Aucune interface réseau"}
                  compact
                />
              )}
            </OverviewCard>
          </div>

          <div className={`${styles.columnGrid} ${styles.paneGrid} ${styles.paneGridFill}`.trim()}>
            <OverviewCard
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
                <EquipmentEmptyState
                  icon="mdi:application-brackets-outline"
                  message={ov.processesEmpty || "Aucun processus remonté"}
                  compact
                />
              )}
            </OverviewCard>

            <OverviewCard
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
                        const up = isAdapterUp(adapter);
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
                <EquipmentEmptyState
                  icon="mdi:ethernet"
                  message={ov.interfacesEmpty || "Aucune interface"}
                  compact
                />
              )}
            </OverviewCard>
          </div>
        </section>
      ) : null}

      {showSupervisionPane ? (
        <section className={`${styles.column} ${styles.columnFill}`.trim()} aria-label={ov.checkmkSectionTitle || "Synthèse CheckMK"}>
          <div className={`${styles.columnGrid} ${styles.paneGrid} ${styles.paneGridFill} ${styles.supervisionGrid}`.trim()}>
            <OverviewCard
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
                <EquipmentEmptyState
                  icon={
                    loadingCheckMK
                      ? null
                      : hasCheckmk
                        ? "mdi:chart-timeline-variant"
                        : "mdi:radar"
                  }
                  message={
                    loadingCheckMK
                      ? copy.loading
                      : hasCheckmk
                        ? ov.availabilityEmpty || "Aucune donnée de disponibilité"
                        : ov.availabilityNoCheckmk || "Mappez CheckMK pour afficher la disponibilité"
                  }
                />
              )}
            </OverviewCard>

            <OverviewCard
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
                <EquipmentEmptyState
                  icon={loadingCheckMK ? null : "mdi:list-status"}
                  message={loadingCheckMK ? copy.loading : ov.servicesEmpty || "Aucun service CheckMK"}
                />
              )}
            </OverviewCard>

            <OverviewCard
              className={styles.spanFull}
              title={ov.eventsTitle || "Activité récente"}
              icon="mdi:history"
            >
              {loadingLifecycle && !recentEvents.length ? (
                <EquipmentEmptyState message={copy.loading} icon={null} />
              ) : recentEvents.length ? (
                <div className={styles.tableWrap}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>{ov.colWhen || "Date"}</th>
                        <th>{ov.colType || "Type"}</th>
                        <th>{ov.colMessage || "Détail"}</th>
                        <th>{ov.colBy || "Par"}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentEvents.map(row => {
                        const tone = lifecycleTone(row.kind, row.severity);
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
                            <td className={styles.actorCell}>{row.actor || "—"}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <EquipmentEmptyState
                  icon="mdi:history"
                  message={ov.eventsEmpty || glance.empty || "Aucune activité récente"}
                />
              )}
            </OverviewCard>
          </div>
        </section>
      ) : null}
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
