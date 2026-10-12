import { Icon } from "@iconify/react";
import { useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import {
  getEquipmentMonitoringEvolution,
  getEquipmentMonitoringSummaries,
  mapClientHardwareEquipment
} from "../../api/equipment";
import {
  fetchSupervisionExclusions
} from "../../api/supervisionAlerts";
import { fetchTicketCategories, fetchTickets } from "../../api/tickets";
import { getLocaleTag } from "../../i18n/locales";
import { interpolate } from "../../i18n/translate";
import { getEquipmentDbId } from "../../utils/equipmentIdentity";
import { createTrackedAbortController } from "../../utils/pageLoadAbort";
import { isSalesTicket } from "../../utils/salesTicketUtils";
import { getTicketSlaDisplay } from "../../utils/ticketSlaUtils";
import { isCheckMKMappableType } from "../EquipementPage/CheckMKMonitoringStatusBadge";
import SmartTooltip from "../SmartTooltip";
import styles from "./EnterpriseOverviewTab.module.css";

const SEV_COLORS = {
  critical: "#ef4444",
  warning: "#f59e0b",
  ok: "#3b82f6"
};

const TICKET_PRIORITY_COLORS = {
  major: "#7f1d1d",
  urgent: "#ef4444",
  high: "#f59e0b",
  normal: "#3b82f6",
  low: "#94a3b8"
};

/** Stale-while-revalidate cache so Dashboard cards don't blank on remount / tab return. */
const overviewDataCache = new Map();

const ITIL_PALETTE = [
  "#2b5fab",
  "#0d9488",
  "#7c3aed",
  "#ea580c",
  "#db2777",
  "#0891b2",
  "#65a30d",
  "#ca8a04"
];

const ITIL_TOP_N = 5;

const MK_CRITICAL_STATUSES = new Set(["critical", "down", "offline"]);
const DAY_MS = 24 * 60 * 60 * 1000;

const PERIOD_OPTIONS = [
  { key: "7d", days: 7 },
  { key: "1m", days: 30 },
  { key: "3m", days: 90 },
  { key: "1y", days: 365 }
];

function periodCutoffMs(days) {
  const n = Math.min(Math.max(Number(days) || 7, 1), 365);
  return startOfDay().getTime() - (n - 1) * DAY_MS;
}

function ticketInPeriod(ticket, days) {
  const created = parseDateMs(ticket?.created_at);
  if (created == null) return false;
  return created >= periodCutoffMs(days);
}

function isMkMappedEquipment(equipment) {
  const mapping = equipment?.checkmkMapping;
  return Boolean(
    mapping?.checkmk_host_name &&
      mapping?.is_active !== false &&
      isCheckMKMappableType(equipment?.type)
  );
}

/** Aligné sur le badge supervision périphériques (CheckMK). */
function resolveEquipmentSupervisionStatus(equipment, summary) {
  if (!isMkMappedEquipment(equipment)) return null;
  const raw = String(summary?.status || "no_data").toLowerCase();
  if (MK_CRITICAL_STATUSES.has(raw)) return "critical";
  if (raw === "warning") return "warning";
  // Mappé sans sync / no_data → OK (même logique que CheckMKMonitoringStatusBadge)
  return "ok";
}

function equipmentKey(eq) {
  return String(eq?.id ?? eq?.dbId ?? eq?.equipmentId ?? "").trim();
}

function isDeviceMaintenanceExclusion(row) {
  if (!row || row.active === false) return false;
  const scope = String(row.scope || "").toLowerCase();
  const kind = String(row.kind || "maintenance").toLowerCase();
  return scope === "device" && kind === "maintenance";
}

function formatExclusionUntil(value, localeTag, indefiniteLabel) {
  if (!value) return indefiniteLabel || "Indéterminée";
  const ms = new Date(value).getTime();
  if (!Number.isFinite(ms)) return indefiniteLabel || "Indéterminée";
  try {
    return new Date(ms).toLocaleString(localeTag || undefined, {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    });
  } catch {
    return new Date(ms).toLocaleString();
  }
}

function emptyEvolutionSeries(days = 7) {
  const buckets = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - i);
    buckets.push({
      key: `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`,
      date: d,
      critical: 0,
      warning: 0,
      total: 0
    });
  }
  return buckets;
}

function formatDeltaPct(value, localeTag) {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  const abs = Math.abs(n);
  try {
    return new Intl.NumberFormat(localeTag || undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(abs);
  } catch {
    return abs.toFixed(2);
  }
}

function formatSharePct(value, localeTag) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "0";
  try {
    return new Intl.NumberFormat(localeTag || undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 1
    }).format(n);
  } catch {
    return String(Math.round(n * 10) / 10);
  }
}

function formatSliceTooltip(name, value, total, copy, localeTag) {
  const count = Number(value) || 0;
  const pct = total > 0 ? (count / total) * 100 : 0;
  return interpolate(copy?.tooltip?.slice || "{name} : {count} ({pct}%)", {
    name: name || "—",
    count: String(count),
    pct: formatSharePct(pct, localeTag)
  });
}

function DonutTooltip({ active, payload, total = 0, copy = {}, localeTag }) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload || {};
  const name = row?.name;
  const value = Number(row?.value) || 0;
  if (!total || name === "—") {
    return (
      <div className={styles.chartTooltip}>
        <span className={styles.chartTooltipMuted}>
          {copy?.tooltip?.empty || "Aucune donnée"}
        </span>
      </div>
    );
  }
  const pct = formatSharePct((value / total) * 100, localeTag);
  return (
    <div className={styles.chartTooltip}>
      <div className={styles.chartTooltipHead}>
        <span className={styles.chartTooltipDot} style={{ background: row.color }} />
        <span>{name}</span>
      </div>
      <div className={styles.chartTooltipBody}>
        <strong>{value}</strong>
        <span>{interpolate(copy?.tooltip?.share || "{pct}% du total", { pct })}</span>
      </div>
    </div>
  );
}

function EvolutionTooltip({ active, payload, label, copy = {} }) {
  if (!active || !payload?.length) return null;
  const total = payload.reduce((acc, entry) => acc + (Number(entry?.value) || 0), 0);
  return (
    <div className={styles.chartTooltip}>
      {label ? <div className={styles.chartTooltipTitle}>{label}</div> : null}
      <ul className={styles.chartTooltipList}>
        {payload.map(entry => (
          <li key={entry.dataKey || entry.name}>
            <span
              className={styles.chartTooltipDot}
              style={{ background: entry.color || entry.stroke || entry.fill }}
            />
            <span>{entry.name}</span>
            <strong>{Number(entry.value) || 0}</strong>
          </li>
        ))}
      </ul>
      <div className={styles.chartTooltipFoot}>
        {interpolate(copy?.tooltip?.total || "Total : {total}", { total: String(total) })}
      </div>
    </div>
  );
}

function LegendList({ rows = [], total = 0, copy = {}, localeTag, compact = false }) {
  return (
    <ul className={`${styles.legend} ${compact ? styles.legendCompact : ""}`.trim()}>
      {rows.map(row => {
        const tip = formatSliceTooltip(row.name, row.value, total, copy, localeTag);
        return (
          <SmartTooltip key={row.key} as="li" className={styles.legendItem} content={tip}>
            <span className={styles.legendDot} style={{ background: row.color }} />
            <span className={styles.legendLabel}>{row.name}</span>
            <strong className={styles.legendValue}>{row.value}</strong>
          </SmartTooltip>
        );
      })}
    </ul>
  );
}

function TopRankList({ rows = [], total = 0, copy = {}, localeTag, emptyLabel }) {
  const list = Array.isArray(rows) ? rows.filter(row => (Number(row?.value) || 0) > 0) : [];
  if (!list.length || !total) {
    return (
      <div className={styles.emptyState}>
        <Icon icon="mdi:shape-outline" aria-hidden />
        <p>{emptyLabel || copy?.tooltip?.empty || "Aucune donnée"}</p>
      </div>
    );
  }
  return (
    <div className={styles.topList}>
      <div className={styles.topListHead}>
        <span>{copy?.ticketItil?.totalLabel || "sur la période"}</span>
        <strong>{total}</strong>
      </div>
      <ol className={styles.topListItems}>
        {list.map((row, idx) => {
          const value = Number(row.value) || 0;
          const pct = total > 0 ? (value / total) * 100 : 0;
          const pctLabel = formatSharePct(pct, localeTag);
          const tip = formatSliceTooltip(row.name, value, total, copy, localeTag);
          return (
            <SmartTooltip key={row.key} as="li" className={styles.topListItem} content={tip}>
              <span className={styles.topListRank}>{idx + 1}</span>
              <div className={styles.topListMain}>
                <div className={styles.topListRow}>
                  <span className={styles.topListName}>{row.name}</span>
                  <span className={styles.topListMeta}>
                    <strong>{value}</strong>
                    <span>{pctLabel}%</span>
                  </span>
                </div>
                <div className={styles.topListBarTrack} aria-hidden>
                  <div
                    className={styles.topListBarFill}
                    style={{
                      width: `${Math.max(0, Math.min(100, pct))}%`,
                      background: row.color || ITIL_PALETTE[idx % ITIL_PALETTE.length]
                    }}
                  />
                </div>
              </div>
            </SmartTooltip>
          );
        })}
      </ol>
    </div>
  );
}

function parseDateMs(value) {
  if (value == null || value === "") return null;
  const ms = new Date(value).getTime();
  return Number.isFinite(ms) ? ms : null;
}

function startOfDay(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDayMs(date) {
  const d = startOfDay(date);
  return d.getTime() + DAY_MS - 1;
}

function percentDelta(current, previous) {
  const cur = Number(current);
  const prev = Number(previous);
  if (!Number.isFinite(cur) || !Number.isFinite(prev)) return 0;
  if (prev === 0) {
    if (cur === 0) return 0;
    return cur > 0 ? 100 : -100;
  }
  return Math.round(((cur - prev) / Math.abs(prev)) * 10000) / 100;
}

function isOpenTicket(ticket) {
  const status = String(ticket?.status || "").toLowerCase();
  const normalized = status === "open" ? "new" : status;
  return normalized !== "resolved" && normalized !== "closed";
}

function ticketClosedAtMs(ticket) {
  return (
    parseDateMs(ticket?.resolved_at) ||
    parseDateMs(ticket?.closed_at) ||
    parseDateMs(ticket?.updated_at)
  );
}

function wasTicketOpenAt(ticket, atMs) {
  const created = parseDateMs(ticket?.created_at);
  if (created == null || created > atMs) return false;
  if (isOpenTicket(ticket)) return true;
  const closed = ticketClosedAtMs(ticket);
  return closed != null && closed > atMs;
}

function buildDailySeries(days, valueAtEndOfDay) {
  const today = startOfDay();
  const series = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    series.push({
      key: `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`,
      date: d,
      value: Number(valueAtEndOfDay(endOfDayMs(d))) || 0
    });
  }
  return series;
}

function seriesSparkPoints(series) {
  return (Array.isArray(series) ? series : []).map(row => Number(row?.value) || 0);
}

function computeMomFromSeries(series) {
  if (!Array.isArray(series) || series.length < 2) {
    return { current: 0, previous: 0, delta: 0 };
  }
  // Série 30 j : comparer le 1er point (~mois précédent) au dernier (aujourd’hui).
  const current = Number(series[series.length - 1]?.value) || 0;
  const monthAgo = Number(series[0]?.value) || 0;
  return {
    current,
    previous: monthAgo,
    delta: percentDelta(current, monthAgo)
  };
}

function isSlaOkTone(display) {
  const tone = String(display?.tone || "").toLowerCase();
  const status = String(display?.status || "").toLowerCase();
  const label = String(display?.label || "").trim();
  if (!label || label === "-" || status === "none") return null;
  if (["danger", "error", "critical", "breached"].includes(tone)) return false;
  if (status === "breached" || status === "overdue") return false;
  return true;
}

function normalizeTicketCategoryKey(ticket) {
  return String(ticket?.category || "").trim();
}

function resolveItilCategoryLabel(key, categoryMap, uncategorizedLabel) {
  if (!key) return uncategorizedLabel;
  const row = categoryMap.get(key);
  if (row?.name) return String(row.name);
  return key;
}

function DonutCenter({ strong, soft, children }) {
  return (
    <div className={styles.donutCenter}>
      <strong>{strong}</strong>
      <span>{soft}</span>
      {children}
    </div>
  );
}

function PeriodSeg({ value, onChange, labels = {}, ariaLabel }) {
  return (
    <div className={styles.periodSeg} role="group" aria-label={ariaLabel}>
      {PERIOD_OPTIONS.map(opt => {
        const active = Number(value) === opt.days;
        return (
          <button
            key={opt.key}
            type="button"
            className={`${styles.periodBtn} ${active ? styles.periodBtnActive : ""}`}
            onClick={() => onChange(opt.days)}
            aria-pressed={active}
          >
            {labels[opt.key] || opt.key}
          </button>
        );
      })}
    </div>
  );
}

function ChartPanel({ icon, title, children, footer, actions }) {
  return (
    <article className={styles.card}>
      <header className={styles.cardHead}>
        <h3 className={styles.cardTitle}>
          <Icon icon={icon} className={styles.cardTitleIcon} aria-hidden />
          <span>{title}</span>
        </h3>
        {actions ? <div className={styles.cardActions}>{actions}</div> : null}
      </header>
      <div className={styles.cardBody}>{children}</div>
      {footer ? <div className={styles.cardFooter}>{footer}</div> : null}
    </article>
  );
}

function TrendDelta({
  delta,
  localeTag,
  copy,
  invertTone = false,
  hint
}) {
  const n = Number(delta) || 0;
  const up = n > 0;
  const down = n < 0;
  const flat = !up && !down;
  const goodUp = invertTone ? down : up;
  const badUp = invertTone ? up : down;
  const toneClass = flat
    ? styles.deltaFlat
    : goodUp
      ? styles.deltaUp
      : badUp
        ? styles.deltaDown
        : styles.deltaFlat;
  const icon = up
    ? "mdi:trending-up"
    : down
      ? "mdi:trending-down"
      : "mdi:trending-neutral";
  const formatted = formatDeltaPct(n, localeTag);
  const label = flat
    ? copy?.deltaFlat || "0.00%"
    : interpolate(copy?.delta || "{sign}{value}%", {
        sign: up ? "+" : "−",
        value: formatted ?? "0.00"
      });
  return (
    <SmartTooltip content={hint || copy?.trendHintMom || ""}>
      <div className={`${styles.deltaBadge} ${toneClass}`}>
        <Icon icon={icon} width={14} height={14} aria-hidden />
        <span>{label}</span>
      </div>
    </SmartTooltip>
  );
}

function Sparkline({ values = [], tone = "neutral", invertTone = false, tip }) {
  const nums = values.map(v => Number(v)).filter(n => Number.isFinite(n));
  if (nums.length < 2) {
    return <div className={styles.sparkEmpty} aria-hidden />;
  }
  const min = Math.min(...nums);
  const max = Math.max(...nums);
  const span = max - min || 1;
  const w = 120;
  const h = 36;
  const pad = 2;
  const points = nums.map((v, i) => {
    const x = pad + (i / (nums.length - 1)) * (w - pad * 2);
    const y = h - pad - ((v - min) / span) * (h - pad * 2);
    return `${x},${y}`;
  });
  const first = nums[0];
  const last = nums[nums.length - 1];
  const rising = last > first;
  const falling = last < first;
  let stroke = "var(--msp-muted, #64748b)";
  if (rising) stroke = invertTone ? "#dc2626" : "#16a34a";
  if (falling) stroke = invertTone ? "#16a34a" : "#dc2626";
  if (tone === "good") stroke = "#16a34a";
  if (tone === "bad") stroke = "#dc2626";
  const spark = (
    <svg
      className={styles.sparkline}
      viewBox={`0 0 ${w} ${h}`}
      width="100%"
      height={36}
      preserveAspectRatio="none"
      aria-hidden
    >
      <polyline
        fill="none"
        stroke={stroke}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points.join(" ")}
      />
    </svg>
  );
  if (!tip) return spark;
  return <SmartTooltip content={tip}>{spark}</SmartTooltip>;
}

function MetricCard({
  icon,
  title,
  strong,
  soft,
  delta,
  invertTone,
  sparkValues,
  rows,
  copy,
  localeTag,
  hint,
  actions,
  mainTip,
  sparkTip
}) {
  return (
    <ChartPanel icon={icon} title={title} actions={actions}>
      <div className={styles.metricLayout}>
        <div className={styles.metricMain}>
          <SmartTooltip content={mainTip || hint || ""}>
            <div className={styles.metricHero}>
              <div className={styles.metricValue}>{strong}</div>
              <div className={styles.metricSoft}>{soft}</div>
            </div>
          </SmartTooltip>
          <TrendDelta
            delta={delta}
            localeTag={localeTag}
            copy={copy}
            invertTone={invertTone}
            hint={hint}
          />
        </div>
        <div className={styles.metricSpark}>
          <Sparkline values={sparkValues} invertTone={invertTone} tip={sparkTip} />
        </div>
      </div>
      {Array.isArray(rows) && rows.length ? (
        <div className={styles.metricKpis}>
          {rows.map(row => {
            const toneClass =
              row.tone === "ok"
                ? styles.metricKpiOk
                : row.tone === "danger"
                  ? styles.metricKpiDanger
                  : "";
            return (
              <SmartTooltip key={row.key} content={row.tip || ""}>
                <div className={`${styles.metricKpi} ${toneClass}`.trim()}>
                  <strong className={styles.metricKpiValue}>{row.value}</strong>
                  <span className={styles.metricKpiLabel}>{row.label}</span>
                </div>
              </SmartTooltip>
            );
          })}
        </div>
      ) : null}
    </ChartPanel>
  );
}

export default function EnterpriseOverviewTab({
  client,
  clientId,
  locale = "fr",
  copy = {},
  equipmentRevision = 0,
  contrat = null,
  onNavigate,
  onStatsChange
}) {
  const localeTag = getLocaleTag(locale);
  const resolvedClientId = clientId ?? client?.id ?? null;
  const resolvedContrat = contrat || client?.contrat || null;
  const cachedOverview = resolvedClientId
    ? overviewDataCache.get(String(resolvedClientId))
    : null;
  const [loading, setLoading] = useState(() => !cachedOverview);
  const [error, setError] = useState(null);
  const [evolutionDays, setEvolutionDays] = useState(7);
  const [ticketPriorityDays, setTicketPriorityDays] = useState(30);
  const [ticketItilDays, setTicketItilDays] = useState(30);
  const [supportDays, setSupportDays] = useState(30);
  const [evolutionSeries, setEvolutionSeries] = useState(() => emptyEvolutionSeries(7));
  const [evolutionLoading, setEvolutionLoading] = useState(false);
  const [exclusions, setExclusions] = useState(() => cachedOverview?.exclusions || []);
  const [monitoringSummaries, setMonitoringSummaries] = useState(
    () => cachedOverview?.monitoringSummaries || {}
  );
  const [tickets, setTickets] = useState(() => cachedOverview?.tickets || []);
  const [itilCategories, setItilCategories] = useState(() => cachedOverview?.itilCategories || []);

  const equipment = useMemo(() => mapClientHardwareEquipment(client), [client, equipmentRevision]);
  const periodLabels = copy?.periods || {};
  const hasOverviewContent =
    Boolean(cachedOverview) ||
    tickets.length > 0 ||
    Object.keys(monitoringSummaries || {}).length > 0 ||
    exclusions.length > 0;

  useEffect(() => {
    if (!resolvedClientId) {
      setLoading(false);
      setEvolutionSeries(emptyEvolutionSeries(evolutionDays));
      setExclusions([]);
      setMonitoringSummaries({});
      setTickets([]);
      setItilCategories([]);
      return undefined;
    }
    const cacheKey = String(resolvedClientId);
    const cached = overviewDataCache.get(cacheKey);
    if (cached) {
      setExclusions(cached.exclusions || []);
      setMonitoringSummaries(cached.monitoringSummaries || {});
      setTickets(cached.tickets || []);
      setItilCategories(cached.itilCategories || []);
      setLoading(false);
    }
    const controller = createTrackedAbortController("enterprise-overview");
    let cancelled = false;
    // Stale-while-revalidate: blank only when nothing is available yet.
    if (!cached) setLoading(true);
    setError(null);

    (async () => {
      try {
        const [excl, summariesRes, ticketsRes, categoriesRes] =
          await Promise.all([
            fetchSupervisionExclusions({
              clientId: resolvedClientId,
              signal: controller.signal
            }).catch(() => []),
            getEquipmentMonitoringSummaries(
              { clientId: resolvedClientId },
              { signal: controller.signal }
            ).catch(() => ({ summaries: {} })),
            fetchTickets(
              { clientId: resolvedClientId, includeClosed: true, limit: 1000 },
              { signal: controller.signal }
            ).catch(() => []),
            fetchTicketCategories({ signal: controller.signal }).catch(() => [])
          ]);
        if (cancelled || controller.signal.aborted) return;
        const nextExclusions = (Array.isArray(excl) ? excl : []).filter(row => {
          if (row?.clientId != null) return String(row.clientId) === String(resolvedClientId);
          return true;
        });
        const nextSummaries = summariesRes?.summaries || {};
        const ticketList = Array.isArray(ticketsRes)
          ? ticketsRes
          : Array.isArray(ticketsRes?.tickets)
            ? ticketsRes.tickets
            : Array.isArray(ticketsRes?.data)
              ? ticketsRes.data
              : [];
        const nextTickets = ticketList.filter(
          t =>
            String(t?.client_id ?? t?.clientId ?? "") === String(resolvedClientId) &&
            !isSalesTicket(t)
        );
        const nextCategories = Array.isArray(categoriesRes) ? categoriesRes : [];
        setExclusions(nextExclusions);
        setMonitoringSummaries(nextSummaries);
        setTickets(nextTickets);
        setItilCategories(nextCategories);
        overviewDataCache.set(cacheKey, {
          exclusions: nextExclusions,
          monitoringSummaries: nextSummaries,
          tickets: nextTickets,
          itilCategories: nextCategories
        });
      } catch (err) {
        if (cancelled || err?.name === "AbortError") return;
        setError(err?.message || copy?.loadError || "Error");
        if (!overviewDataCache.has(cacheKey)) {
          setExclusions([]);
          setMonitoringSummaries({});
          setTickets([]);
          setItilCategories([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [resolvedClientId, equipmentRevision, copy?.noName, copy?.loadError]);

  useEffect(() => {
    if (!resolvedClientId) {
      setEvolutionSeries(emptyEvolutionSeries(evolutionDays));
      setEvolutionLoading(false);
      return undefined;
    }
    const controller = createTrackedAbortController("enterprise-overview-evolution");
    let cancelled = false;
    setEvolutionLoading(true);

    (async () => {
      try {
        const evolutionRes = await getEquipmentMonitoringEvolution(
          { clientId: resolvedClientId, days: evolutionDays },
          { signal: controller.signal }
        ).catch(() => ({ series: [] }));
        if (cancelled || controller.signal.aborted) return;
        const series = Array.isArray(evolutionRes?.series) ? evolutionRes.series : [];
        setEvolutionSeries(
          series.length
            ? series.map(day => ({
                key: day.key,
                date: day.date ? new Date(day.date) : new Date(),
                critical: Number(day.critical) || 0,
                warning: Number(day.warning) || 0,
                total: Number(day.total) || 0
              }))
            : emptyEvolutionSeries(evolutionDays)
        );
      } catch (err) {
        if (cancelled || err?.name === "AbortError") return;
        setEvolutionSeries(emptyEvolutionSeries(evolutionDays));
      } finally {
        if (!cancelled) setEvolutionLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [resolvedClientId, evolutionDays, equipmentRevision]);

  const deviceMaintenances = useMemo(() => {
    const list = Array.isArray(equipment) ? equipment : [];
    const byId = new Map();
    for (const eq of list) {
      const id = equipmentKey(eq);
      if (id) byId.set(id, eq);
    }
    const rows = (Array.isArray(exclusions) ? exclusions : []).filter(isDeviceMaintenanceExclusion);
    const seen = new Set();
    const out = [];
    for (const row of rows) {
      const id = String(row.equipmentId || row.equipment_id || "").trim();
      if (!id || seen.has(id)) continue;
      seen.add(id);
      const eq = byId.get(id);
      out.push({
        id: row.id || id,
        equipmentId: id,
        equipmentFamily: row.equipmentFamily || eq?.type || null,
        name:
          row.equipmentName ||
          eq?.name ||
          eq?.hostname ||
          eq?.label ||
          id,
        reason: row.reason || "",
        excludedUntil: row.excludedUntil || row.excluded_until || null,
        equipment: eq || null
      });
    }
    out.sort((a, b) => {
      const aUntil = a.excludedUntil ? new Date(a.excludedUntil).getTime() : Number.POSITIVE_INFINITY;
      const bUntil = b.excludedUntil ? new Date(b.excludedUntil).getTime() : Number.POSITIVE_INFINITY;
      if (aUntil !== bUntil) return aUntil - bUntil;
      return String(a.name).localeCompare(String(b.name), localeTag || undefined, { sensitivity: "base" });
    });
    return out;
  }, [equipment, exclusions, localeTag]);

  const evolution = evolutionSeries;

  const chartData = useMemo(() => {
    const labelOpts =
      evolutionDays >= 365
        ? { month: "short" }
        : evolutionDays >= 90
          ? { day: "2-digit", month: "short" }
          : { day: "2-digit", month: "2-digit" };
    return evolution.map(day => ({
      label: (day.date instanceof Date ? day.date : new Date(day.date)).toLocaleDateString(
        localeTag || undefined,
        labelOpts
      ),
      critical: day.critical,
      warning: day.warning
    }));
  }, [evolution, evolutionDays, localeTag]);

  const evolutionTickInterval = evolutionDays >= 365 ? 30 : evolutionDays >= 90 ? 13 : evolutionDays >= 30 ? 4 : 0;

  const supervisionCounts = useMemo(() => {
    let critical = 0;
    let warning = 0;
    let ok = 0;
    for (const eq of Array.isArray(equipment) ? equipment : []) {
      const dbId = getEquipmentDbId(eq);
      const summary = dbId ? monitoringSummaries[dbId] : null;
      const status = resolveEquipmentSupervisionStatus(eq, summary);
      if (status === "critical") critical += 1;
      else if (status === "warning") warning += 1;
      else if (status === "ok") ok += 1;
    }
    return { critical, warning, ok, total: critical + warning + ok };
  }, [equipment, monitoringSummaries]);

  const prioritySlices = useMemo(
    () => [
      {
        key: "critical",
        name: copy?.severity?.critical || "Critique",
        value: supervisionCounts.critical || 0,
        color: SEV_COLORS.critical
      },
      {
        key: "warning",
        name: copy?.severity?.warning || "Warning",
        value: supervisionCounts.warning || 0,
        color: SEV_COLORS.warning
      },
      {
        key: "ok",
        name: copy?.severity?.ok || "OK",
        value: supervisionCounts.ok || 0,
        color: SEV_COLORS.ok
      }
    ],
    [supervisionCounts, copy]
  );

  const priorityTotal = supervisionCounts.total || 0;

  useEffect(() => {
    if (typeof onStatsChange !== "function") return undefined;
    onStatsChange({
      critical: supervisionCounts.critical || 0,
      warning: supervisionCounts.warning || 0,
      ok: supervisionCounts.ok || 0,
      loading
    });
    return undefined;
  }, [onStatsChange, supervisionCounts.critical, supervisionCounts.warning, supervisionCounts.ok, loading]);
  const supportMetrics = useMemo(() => {
    const days = Math.min(Math.max(Number(supportDays) || 30, 1), 365);
    const openSeries = buildDailySeries(days, atMs =>
      tickets.reduce((acc, t) => acc + (wasTicketOpenAt(t, atMs) ? 1 : 0), 0)
    );
    const openMom = computeMomFromSeries(openSeries);
    const openNow = tickets.filter(isOpenTicket);
    let slaOkCount = 0;
    let slaBreachedCount = 0;
    for (const ticket of openNow) {
      const display = getTicketSlaDisplay(ticket, { clientContrat: resolvedContrat });
      const ok = isSlaOkTone(display);
      if (ok == null) continue;
      if (ok) slaOkCount += 1;
      else slaBreachedCount += 1;
    }

    return {
      openCount: openNow.length,
      openDelta: openMom.delta,
      openSpark: seriesSparkPoints(openSeries),
      slaOkCount,
      slaBreachedCount
    };
  }, [tickets, resolvedContrat, supportDays]);

  const periodTicketPriority = useMemo(
    () => tickets.filter(t => ticketInPeriod(t, ticketPriorityDays)),
    [tickets, ticketPriorityDays]
  );

  const periodTicketItil = useMemo(
    () => tickets.filter(t => ticketInPeriod(t, ticketItilDays)),
    [tickets, ticketItilDays]
  );

  const ticketPrioritySlices = useMemo(() => {
    const counts = { major: 0, urgent: 0, high: 0, normal: 0, low: 0 };
    for (const ticket of periodTicketPriority) {
      if (ticket?.is_major_incident) {
        counts.major += 1;
        continue;
      }
      const key = String(ticket?.priority || "normal").toLowerCase();
      if (key === "urgent") counts.urgent += 1;
      else if (key === "high") counts.high += 1;
      else if (key === "low") counts.low += 1;
      else counts.normal += 1;
    }
    return [
      {
        key: "major",
        name: copy?.ticketPriority?.major || "Incident majeur",
        value: counts.major,
        color: TICKET_PRIORITY_COLORS.major
      },
      {
        key: "urgent",
        name: copy?.ticketPriority?.urgent || "Urgente",
        value: counts.urgent,
        color: TICKET_PRIORITY_COLORS.urgent
      },
      {
        key: "high",
        name: copy?.ticketPriority?.high || "Haute",
        value: counts.high,
        color: TICKET_PRIORITY_COLORS.high
      },
      {
        key: "normal",
        name: copy?.ticketPriority?.normal || "Normale",
        value: counts.normal,
        color: TICKET_PRIORITY_COLORS.normal
      },
      {
        key: "low",
        name: copy?.ticketPriority?.low || "Basse",
        value: counts.low,
        color: TICKET_PRIORITY_COLORS.low
      }
    ];
  }, [periodTicketPriority, copy]);

  const ticketPriorityTotal = periodTicketPriority.length;

  const itilCategoryMap = useMemo(() => {
    const map = new Map();
    for (const row of Array.isArray(itilCategories) ? itilCategories : []) {
      const id = String(row?.id || "").trim();
      if (id) map.set(id, row);
      const name = String(row?.name || "").trim();
      if (name) map.set(name, row);
    }
    return map;
  }, [itilCategories]);

  const ticketItilSlices = useMemo(() => {
    const uncategorizedLabel = copy?.ticketItil?.uncategorized || "Non catégorisé";
    const otherLabel = copy?.ticketItil?.other || "Autres";
    const counts = new Map();
    for (const ticket of periodTicketItil) {
      const key = normalizeTicketCategoryKey(ticket) || "";
      counts.set(key, (counts.get(key) || 0) + 1);
    }
    const ranked = [...counts.entries()]
      .map(([key, value]) => ({
        key: key || "__none__",
        name: resolveItilCategoryLabel(key, itilCategoryMap, uncategorizedLabel),
        value
      }))
      .sort((a, b) => b.value - a.value || a.name.localeCompare(b.name));

    if (ranked.length <= ITIL_TOP_N) {
      return ranked.map((row, idx) => ({
        ...row,
        color: ITIL_PALETTE[idx % ITIL_PALETTE.length]
      }));
    }

    const top = ranked.slice(0, ITIL_TOP_N);
    const otherValue = ranked.slice(ITIL_TOP_N).reduce((acc, row) => acc + row.value, 0);
    return [
      ...top.map((row, idx) => ({
        ...row,
        color: ITIL_PALETTE[idx % ITIL_PALETTE.length]
      })),
      {
        key: "__other__",
        name: otherLabel,
        value: otherValue,
        color: "#94a3b8"
      }
    ];
  }, [periodTicketItil, itilCategoryMap, copy]);

  const ticketItilTotal = periodTicketItil.length;

  if (loading && !hasOverviewContent) {
    return (
      <div className={styles.root} data-guide="enterprise-overview" aria-busy="true">
        <span className={styles.srOnly}>{copy?.loading || "Chargement…"}</span>
      </div>
    );
  }

  if (error && !hasOverviewContent) {
    return (
      <div className={styles.root} data-guide="enterprise-overview">
        <div className={styles.emptyState}>
          <Icon icon="mdi:alert-circle-outline" aria-hidden />
          <p>{error}</p>
        </div>
      </div>
    );
  }

  const trendCopy = {
    delta: copy?.trend?.delta || copy?.park?.delta || "{sign}{value}%",
    deltaFlat: copy?.trend?.deltaFlat || copy?.park?.deltaFlat || "0.00%",
    trendHintMom: copy?.trend?.hintMom || "Tendance vs mois précédent"
  };

  return (
    <div className={styles.root} data-guide="enterprise-overview">
      <div className={styles.cardsGrid}>
        <MetricCard
          icon="mdi:lifebuoy"
          title={copy?.support?.title || "Support et SLA"}
          strong={String(supportMetrics.openCount)}
          soft={copy?.support?.openLabel || "Tickets ouverts"}
          delta={supportMetrics.openDelta}
          invertTone
          sparkValues={supportMetrics.openSpark}
          copy={trendCopy}
          localeTag={localeTag}
          hint={copy?.support?.trendHint || trendCopy.trendHintMom}
          mainTip={interpolate(copy?.tooltip?.openTickets || "{count} tickets actuellement ouverts", {
            count: String(supportMetrics.openCount)
          })}
          sparkTip={interpolate(
            copy?.tooltip?.spark || "Début de période : {start} → aujourd’hui : {end}",
            {
              start: String(supportMetrics.openSpark[0] ?? 0),
              end: String(supportMetrics.openSpark[supportMetrics.openSpark.length - 1] ?? 0)
            }
          )}
          actions={
            <PeriodSeg
              value={supportDays}
              onChange={setSupportDays}
              labels={periodLabels}
              ariaLabel={copy?.periodAria || "Période"}
            />
          }
          rows={[
            {
              key: "sla-ok",
              label: copy?.support?.slaOk || "SLA OK",
              value: String(supportMetrics.slaOkCount),
              tip: interpolate(
                copy?.tooltip?.slaOk || "{count} tickets ouverts dans les délais SLA",
                { count: String(supportMetrics.slaOkCount) }
              )
            },
            {
              key: "sla-breached",
              label: copy?.support?.slaBreached || "SLA dépassé",
              value: String(supportMetrics.slaBreachedCount),
              tip: interpolate(
                copy?.tooltip?.slaBreached || "{count} tickets ouverts hors délais SLA",
                { count: String(supportMetrics.slaBreachedCount) }
              )
            }
          ]}
        />

        <ChartPanel
          icon="mdi:format-list-numbered"
          title={copy?.ticketItil?.title || "Top catégories ITIL"}
          actions={
            <PeriodSeg
              value={ticketItilDays}
              onChange={setTicketItilDays}
              labels={periodLabels}
              ariaLabel={copy?.periodAria || "Période"}
            />
          }
        >
          <TopRankList
            rows={ticketItilSlices}
            total={ticketItilTotal}
            copy={copy}
            localeTag={localeTag}
            emptyLabel={copy?.ticketItil?.empty || "Aucune catégorie sur la période"}
          />
        </ChartPanel>

        <ChartPanel
          icon="mdi:priority-high"
          title={copy?.ticketPriority?.title || "Tickets par priorité"}
          actions={
            <PeriodSeg
              value={ticketPriorityDays}
              onChange={setTicketPriorityDays}
              labels={periodLabels}
              ariaLabel={copy?.periodAria || "Période"}
            />
          }
        >
          <div className={styles.donutLayout}>
            <div className={styles.donutWrap}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={
                      ticketPriorityTotal > 0
                        ? ticketPrioritySlices.filter(s => s.value > 0)
                        : [{ name: "—", value: 1, color: "#e2e8f0" }]
                    }
                    dataKey="value"
                    nameKey="name"
                    innerRadius="58%"
                    outerRadius="82%"
                    paddingAngle={ticketPriorityTotal > 0 ? 2 : 0}
                    stroke="transparent"
                    isAnimationActive={false}
                  >
                    {(ticketPriorityTotal > 0
                      ? ticketPrioritySlices.filter(s => s.value > 0)
                      : [{ color: "#e2e8f0" }]
                    ).map((entry, idx) => (
                      <Cell key={entry.key || idx} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    content={
                      <DonutTooltip
                        total={ticketPriorityTotal}
                        copy={copy}
                        localeTag={localeTag}
                      />
                    }
                  />
                </PieChart>
              </ResponsiveContainer>
              <DonutCenter
                strong={String(ticketPriorityTotal)}
                soft={copy?.ticketPriority?.totalLabel || "sur la période"}
              />
            </div>
            <LegendList
              compact
              rows={ticketPrioritySlices}
              total={ticketPriorityTotal}
              copy={copy}
              localeTag={localeTag}
            />
          </div>
        </ChartPanel>
      </div>

      <div className={styles.cardsGrid}>
        <ChartPanel icon="mdi:alert-decagram-outline" title={copy?.priority?.title || "Alertes par priorité"}>
          <div className={styles.donutLayout}>
            <div className={styles.donutWrap}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={
                      priorityTotal > 0
                        ? prioritySlices.filter(s => s.value > 0)
                        : [{ name: "—", value: 1, color: "#e2e8f0" }]
                    }
                    dataKey="value"
                    nameKey="name"
                    innerRadius="58%"
                    outerRadius="82%"
                    paddingAngle={priorityTotal > 0 ? 2 : 0}
                    stroke="transparent"
                    isAnimationActive={false}
                  >
                    {(priorityTotal > 0
                      ? prioritySlices.filter(s => s.value > 0)
                      : [{ color: "#e2e8f0" }]
                    ).map((entry, idx) => (
                      <Cell key={entry.key || idx} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    content={
                      <DonutTooltip total={priorityTotal} copy={copy} localeTag={localeTag} />
                    }
                  />
                </PieChart>
              </ResponsiveContainer>
              <DonutCenter
                strong={String(priorityTotal)}
                soft={copy?.priority?.totalLabel || "au total"}
              />
            </div>
            <LegendList
              rows={prioritySlices}
              total={priorityTotal}
              copy={copy}
              localeTag={localeTag}
            />
          </div>
        </ChartPanel>

        <ChartPanel
          icon="mdi:chart-timeline-variant"
          title={copy?.evolution?.title || "Évolution des alertes"}
          actions={
            <PeriodSeg
              value={evolutionDays}
              onChange={setEvolutionDays}
              labels={periodLabels}
              ariaLabel={copy?.periodAria || "Période"}
            />
          }
          footer={
            <div className={styles.inlineLegend}>
              <span>
                <i style={{ background: SEV_COLORS.critical }} />
                {copy?.severity?.critical || "Critique"}
              </span>
              <span>
                <i style={{ background: SEV_COLORS.warning }} />
                {copy?.severity?.warning || "Warning"}
              </span>
              <span>
                <i style={{ background: SEV_COLORS.ok }} />
                {copy?.severity?.info || copy?.severity?.ok || "Info"}
              </span>
            </div>
          }
        >
          <div className={`${styles.chartWrap} ${evolutionLoading ? styles.chartWrapBusy : ""}`}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="entCrit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={SEV_COLORS.critical} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={SEV_COLORS.critical} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="entWarn" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={SEV_COLORS.warning} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={SEV_COLORS.warning} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="label"
                  interval={evolutionTickInterval}
                  tick={{ fill: "var(--msp-muted, #64748b)", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fill: "var(--msp-muted, #64748b)", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  width={36}
                />
                <Tooltip content={<EvolutionTooltip copy={copy} />} />
                <Area
                  type="monotone"
                  dataKey="critical"
                  name={copy?.severity?.critical || "Critique"}
                  stroke={SEV_COLORS.critical}
                  fill="url(#entCrit)"
                  strokeWidth={2}
                  isAnimationActive={false}
                />
                <Area
                  type="monotone"
                  dataKey="warning"
                  name={copy?.severity?.warning || "Warning"}
                  stroke={SEV_COLORS.warning}
                  fill="url(#entWarn)"
                  strokeWidth={2}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </ChartPanel>

        <ChartPanel
          icon="mdi:wrench-clock"
          title={copy?.park?.devicesInMaintenance || "Équipements en maintenance"}
        >
          {deviceMaintenances.length > 0 ? (
            <div className={styles.maintenanceBlock}>
              <div className={styles.maintenanceHead}>
                <Icon icon="mdi:wrench-clock" className={styles.maintenanceHeadIcon} aria-hidden />
                <span>
                  {copy?.park?.devicesInMaintenance || "Équipements en maintenance"}
                  <strong className={styles.maintenanceCount}>{deviceMaintenances.length}</strong>
                </span>
              </div>
              <ul className={styles.maintenanceList}>
                {deviceMaintenances.map(row => {
                  const untilLabel = formatExclusionUntil(
                    row.excludedUntil,
                    localeTag,
                    copy?.park?.indefinite || "Indéterminée"
                  );
                  const untilText = row.excludedUntil
                    ? interpolate(copy?.park?.until || "Jusqu’au {date}", { date: untilLabel })
                    : untilLabel;
                  const canOpen = typeof onNavigate === "function";
                  const openDevice = () => {
                    if (!canOpen) return;
                    const payload =
                      row.equipment ||
                      {
                        id: row.equipmentId,
                        dbId: row.equipmentId,
                        clientId: resolvedClientId,
                        name: row.name,
                        type: row.equipmentFamily || null
                      };
                    onNavigate("EquipmentDetail", payload);
                  };
                  return (
                    <li key={row.id}>
                      {canOpen ? (
                        <button
                          type="button"
                          className={styles.maintenanceItem}
                          onClick={openDevice}
                          title={copy?.park?.openDevice || "Ouvrir le périphérique"}
                        >
                          <span className={styles.maintenanceName}>{row.name}</span>
                          <span className={styles.maintenanceMeta}>
                            <span>{untilText}</span>
                            {row.reason ? (
                              <span className={styles.maintenanceReason}>{row.reason}</span>
                            ) : null}
                          </span>
                        </button>
                      ) : (
                        <div className={styles.maintenanceItemStatic}>
                          <span className={styles.maintenanceName}>{row.name}</span>
                          <span className={styles.maintenanceMeta}>
                            <span>{untilText}</span>
                            {row.reason ? (
                              <span className={styles.maintenanceReason}>{row.reason}</span>
                            ) : null}
                          </span>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : (
            <div className={styles.emptyState}>
              <Icon icon="mdi:wrench-check-outline" aria-hidden />
              <p>{copy?.park?.noMaintenance || "Aucun équipement en maintenance"}</p>
            </div>
          )}
        </ChartPanel>
      </div>
    </div>
  );
}
