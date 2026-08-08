import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@iconify/react";
import { Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, LineChart } from "recharts";
import { fetchRmmMetricHistory } from "../../api/rmm";
import { getRmmInventoryFromEquipment } from "./rmmMonitoringUtils";
import { RMM_METRIC_PERIOD_OPTIONS } from "./rmmMetricDashboardUtils";
import RmmMetricDashboard from "./RmmMetricDashboard";
import styles from "./RmmMetricHistoryPanel.module.css";
const PERIOD_OPTIONS = RMM_METRIC_PERIOD_OPTIONS;
function formatChartDay(value) {
  if (!value) return "";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", {
    day: "2-digit",
    month: "short"
  });
}
function formatTooltipDay(value) {
  if (!value) return "";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", {
    dateStyle: "medium"
  });
}
function normalizeDriveLabel(drive) {
  const text = String(drive || "").trim().toUpperCase();
  if (!text) return null;
  const letter = text.match(/^([A-Z])/)?.[1];
  return letter ? `${letter}:` : text;
}
function listAgentDrives(agent) {
  const inventory = getRmmInventoryFromEquipment(agent?.equipment || {});
  const disks = inventory.hardware?.disks;
  if (!Array.isArray(disks)) return [];
  const seen = new Set();
  const drives = [];
  for (const disk of disks) {
    const label = normalizeDriveLabel(disk.drive || disk.device || disk.DeviceID);
    if (!label || seen.has(label)) continue;
    seen.add(label);
    drives.push(label);
  }
  drives.sort((a, b) => a.localeCompare(b, "fr"));
  return drives;
}
function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ""));
}
export default function RmmMetricHistoryPanel({
  agent,
  active = true,
  embedded = false
}) {
  const defaultDrive = normalizeDriveLabel(agent?.disk_drive) || "C:";
  const drives = listAgentDrives(agent);
  const driveOptions = drives.length ? drives : [defaultDrive];
  const driveTargetsKey = useMemo(() => {
    const list = listAgentDrives(agent);
    const options = list.length ? list : [normalizeDriveLabel(agent?.disk_drive) || "C:"];
    return options.slice(0, 3).join("|");
  }, [agent?.id, agent?.disk_drive]);
  const [metric, setMetric] = useState("disk_used_pct");
  const [drive, setDrive] = useState(defaultDrive);
  const [days, setDays] = useState(90);
  const [loading, setLoading] = useState(false);
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [error, setError] = useState(null);
  const [dashboardError, setDashboardError] = useState(null);
  const [history, setHistory] = useState(null);
  const [dashboardHistory, setDashboardHistory] = useState(null);
  const agentId = isUuid(agent?.id) ? agent.id : null;
  const dashboardRequestRef = useRef(0);
  const historyRequestRef = useRef(0);
  const hasDashboardDataRef = useRef(false);
  const hasHistoryDataRef = useRef(false);
  useEffect(() => {
    if (!active) return;
    setMetric("disk_used_pct");
    setDays(90);
    setError(null);
    setDashboardError(null);
    setHistory(null);
    setDashboardHistory(null);
    hasDashboardDataRef.current = false;
    hasHistoryDataRef.current = false;
  }, [active, agent?.id]);
  useEffect(() => {
    if (!active) return;
    setDrive(defaultDrive);
  }, [active, defaultDrive, agent?.id]);
  const loadDashboard = useCallback(async () => {
    if (!agentId) {
      setDashboardError("History unavailable for this agent (missing identifier).");
      setDashboardHistory(null);
      setDashboardLoading(false);
      return;
    }
    const requestId = dashboardRequestRef.current + 1;
    dashboardRequestRef.current = requestId;
    if (!hasDashboardDataRef.current) {
      setDashboardLoading(true);
    }
    setDashboardError(null);
    try {
      const diskTargets = driveTargetsKey.split("|").filter(Boolean).slice(0, 3);
      const [cpu, ram, temp, updates, ...diskResults] = await Promise.all([fetchRmmMetricHistory(agentId, {
        metric: "cpu_usage_pct",
        days
      }), fetchRmmMetricHistory(agentId, {
        metric: "ram_usage_pct",
        days
      }), fetchRmmMetricHistory(agentId, {
        metric: "cpu_temp_c",
        days
      }).catch(() => ({
        points: []
      })), fetchRmmMetricHistory(agentId, {
        metric: "updates_pending",
        days
      }).catch(() => ({
        points: []
      })), ...diskTargets.map(dim => fetchRmmMetricHistory(agentId, {
        metric: "disk_used_pct",
        dim,
        days
      }).catch(() => ({
        points: []
      })))]);
      if (dashboardRequestRef.current !== requestId) return;
      const disks = {};
      diskTargets.forEach((dim, index) => {
        disks[dim] = diskResults[index] || {
          points: []
        };
      });
      setDashboardHistory({
        cpu,
        ram,
        temp,
        updates,
        disks
      });
      hasDashboardDataRef.current = true;
    } catch (err) {
      if (dashboardRequestRef.current !== requestId) return;
      setDashboardHistory(null);
      hasDashboardDataRef.current = false;
      setDashboardError(err?.message || "Unable to load the dashboard.");
    } finally {
      if (dashboardRequestRef.current === requestId) {
        setDashboardLoading(false);
      }
    }
  }, [agentId, days, driveTargetsKey]);
  const loadHistory = useCallback(async () => {
    if (!agentId) {
      setError("History unavailable for this agent (missing identifier).");
      setHistory(null);
      setLoading(false);
      return;
    }
    const requestId = historyRequestRef.current + 1;
    historyRequestRef.current = requestId;
    if (!hasHistoryDataRef.current) {
      setLoading(true);
    }
    setError(null);
    try {
      const data = await fetchRmmMetricHistory(agentId, {
        metric,
        dim: metric === "disk_used_pct" ? drive : undefined,
        days
      });
      if (historyRequestRef.current !== requestId) return;
      setHistory(data);
      hasHistoryDataRef.current = true;
    } catch (err) {
      if (historyRequestRef.current !== requestId) return;
      setHistory(null);
      hasHistoryDataRef.current = false;
      setError(err?.message || "Unable to load history.");
    } finally {
      if (historyRequestRef.current === requestId) {
        setLoading(false);
      }
    }
  }, [agentId, metric, drive, days]);
  useEffect(() => {
    if (!active) return;
    loadDashboard();
  }, [active, loadDashboard]);
  useEffect(() => {
    if (!active) return;
    loadHistory();
  }, [active, loadHistory]);
  const chartData = useMemo(() => {
    const points = history?.points;
    if (!Array.isArray(points)) return [];
    return points.map(point => ({
      day: point.day,
      last: point.last,
      min: point.min,
      max: point.max
    }));
  }, [history]);
  const yDomain = useMemo(() => {
    if (metric === "updates_pending") return [0, "auto"];
    if (metric === "cpu_temp_c") return [0, 110];
    if (metric === "cpu_usage_pct" || metric === "ram_usage_pct" || metric === "disk_used_pct") {
      return [0, 100];
    }
    return [0, "auto"];
  }, [metric]);
  if (!agent) return null;
  return <div className={embedded ? styles.embedded : styles.standalone}>
      <div className={styles.toolbar}>
        <div className={styles.toolbarIntro}>
          <Icon icon="mdi:chart-timeline-variant" className={styles.toolbarIntroIcon} aria-hidden />
          <div>
            <span className={styles.toolbarIntroTitle}>RMM metrics</span>
            <span className={styles.toolbarIntroHint}>Period analysis and detailed history</span>
          </div>
        </div>

        <div className={styles.periodGroup} role="group" aria-label="Period">
          {PERIOD_OPTIONS.map(option => <button key={option.days} type="button" className={`${styles.periodBtn} ${days === option.days ? styles.periodBtnActive : ""}`} onClick={() => setDays(option.days)}>
              {option.label}
            </button>)}
        </div>
      </div>

      <div className={styles.dashboardBody}>
        <RmmMetricDashboard dashboardHistory={dashboardHistory} days={days} loading={dashboardLoading} error={dashboardError} />
      </div>

      <section className={styles.historySection} aria-labelledby="rmm-metric-history-chart">
        <header className={styles.historyHeader}>
          <div>
            <h3 className={styles.historyTitle} id="rmm-metric-history-chart">
              <Icon icon="mdi:chart-line" aria-hidden />
              Detailed history
            </h3>
            <p className={styles.historySubtitle}>
              Daily min / max / latest-value chart · ideal for inspecting a metric.
            </p>
          </div>
          <div className={styles.historyControls}>
            <div className={styles.controlGroup}>
              <span className={styles.controlLabel}>Metric</span>
              <select className={styles.select} value={metric} onChange={e => setMetric(e.target.value)}>
                <option value="disk_used_pct">Disk (% used)</option>
                <option value="cpu_usage_pct">CPU usage (%)</option>
                <option value="ram_usage_pct">RAM usage (%)</option>
                <option value="cpu_temp_c">Max temperature (°C)</option>
                <option value="updates_pending">Pending Windows updates</option>
              </select>
            </div>

            {metric === "disk_used_pct" ? <div className={styles.controlGroup}>
                <span className={styles.controlLabel}>Drive</span>
                <select className={styles.select} value={drive} onChange={e => setDrive(e.target.value)}>
                  {driveOptions.map(item => <option key={item} value={item}>
                      {item}
                    </option>)}
                </select>
              </div> : null}
          </div>
        </header>

        <div className={styles.body}>
          {loading && !history ? <div className={styles.stateBox}>Loading history…</div> : error ? <div className={`${styles.stateBox} ${styles.stateError}`}>{error}</div> : chartData.length === 0 ? <div className={styles.stateBox}>
              No data for this period. History is populated as RMM heartbeats arrive
              (sampled roughly hourly).
            </div> : <div className={styles.chartWrap}>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData} margin={{
              top: 8,
              right: 12,
              left: 0,
              bottom: 0
            }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(15, 23, 42, 0.08)" />
                  <XAxis dataKey="day" tickFormatter={formatChartDay} tick={{
                fontSize: 11,
                fill: "#64748b"
              }} minTickGap={24} />
                  <YAxis domain={yDomain} tick={{
                fontSize: 11,
                fill: "#64748b"
              }} width={36} unit={metric === "cpu_temp_c" ? "°C" : metric === "disk_used_pct" || metric === "cpu_usage_pct" || metric === "ram_usage_pct" ? "%" : ""} />
                  <Tooltip labelFormatter={formatTooltipDay} formatter={(value, name) => {
                if (name === "last") {
                  if (metric === "cpu_temp_c") return [`${value} °C`, "Temperature"];
                  if (metric === "disk_used_pct" || metric === "cpu_usage_pct" || metric === "ram_usage_pct") {
                    return [`${value} %`, metric === "disk_used_pct" ? "Utilisation" : metric === "cpu_usage_pct" ? "CPU" : "RAM"];
                  }
                  return [String(value), "Pending"];
                }
                if (name === "min" || name === "max") {
                  return [metric === "disk_used_pct" || metric === "cpu_usage_pct" || metric === "ram_usage_pct" ? `${value} %` : value, name === "min" ? "Min" : "Max"];
                }
                return [value, name];
              }} />
                  {metric === "disk_used_pct" || metric === "cpu_usage_pct" || metric === "ram_usage_pct" ? <>
                      <Line type="monotone" dataKey="min" name="min" stroke="#94a3b8" strokeWidth={1} strokeDasharray="4 4" dot={false} isAnimationActive={false} />
                      <Line type="monotone" dataKey="max" name="max" stroke="#94a3b8" strokeWidth={1} strokeDasharray="4 4" dot={false} isAnimationActive={false} />
                    </> : null}
                  <Line type="monotone" dataKey="last" name="last" stroke="#2b5fab" strokeWidth={2} dot={chartData.length <= 45} activeDot={{
                r: 4
              }} />
                </LineChart>
              </ResponsiveContainer>
              <p className={styles.hint}>
                Compact daily aggregation · min / max / latest value of the day.
              </p>
            </div>}
        </div>
      </section>
    </div>;
}
