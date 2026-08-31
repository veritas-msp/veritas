import { Icon } from "@iconify/react";
import { buildDistributionItems, CHART_COLORS, DashboardDistributionBars, DashboardPieChart } from "./DashboardCharts";
import SmartTooltip from "../SmartTooltip";
import styles from "./DashboardPage.module.css";

export function formatNumber(value) {
  if (value == null || Number.isNaN(Number(value))) return "-";
  return String(Math.round(Number(value)));
}
export function formatHours(copy, value) {
  if (value == null || !Number.isFinite(Number(value))) return copy.units.none;
  return copy.units.hours.replace("{value}", String(value));
}
export function formatDuration(copy, hours) {
  if (hours == null || !Number.isFinite(Number(hours))) return copy.units.none;
  const value = Number(hours);
  if (value < 1) {
    const minutes = Math.max(1, Math.round(value * 60));
    return copy.units.minutes.replace("{value}", String(minutes));
  }
  if (value < 24) {
    const h = Math.floor(value);
    const minutes = Math.round((value - h) * 60);
    if (!minutes) return copy.units.hours.replace("{value}", String(h));
    return copy.units.hoursMinutes.replace("{hours}", String(h)).replace("{minutes}", String(minutes).padStart(2, "0"));
  }
  return copy.units.hours.replace("{value}", String(Math.round(value * 10) / 10));
}
export function formatPercent(copy, value) {
  if (value == null || !Number.isFinite(Number(value))) return copy.units.none;
  return copy.units.percent.replace("{value}", String(value));
}
export function formatRating(copy, value) {
  if (value == null || !Number.isFinite(Number(value))) return copy.units.none;
  return copy.units.stars.replace("{value}", String(value));
}
export function formatDelta(value, locale, absolute = false) {
  if (value == null || !Number.isFinite(Number(value))) return null;
  const n = Number(value);
  const abs = Math.abs(n).toLocaleString(locale, {
    maximumFractionDigits: absolute ? 0 : 1
  });
  const suffix = absolute ? "" : " %";
  if (n > 0) return `+${abs}${suffix}`;
  if (n < 0) return `−${abs}${suffix}`;
  return `${abs}${suffix}`;
}
export function deltaTone(value, invert = false) {
  if (value == null || Number(value) === 0) return "";
  const up = Number(value) > 0;
  const good = invert ? !up : up;
  return good ? styles.deltaGood : styles.deltaBad;
}
export function HeroKpi({
  icon,
  value,
  label,
  hint,
  help,
  helpAria,
  delta,
  invert,
  locale,
  deltaAbsolute
}) {
  const deltaLabel = formatDelta(delta, locale, deltaAbsolute);
  return <article className={styles.heroKpi}>
      <div className={styles.heroKpiTop}>
        <span className={styles.heroKpiIcon} aria-hidden>
          <Icon icon={icon} />
        </span>
        {help && hint ? <SmartTooltip content={hint} position="top">
            <button type="button" className={styles.heroKpiHelp} aria-label={helpAria || hint}>
              ?
            </button>
          </SmartTooltip> : null}
      </div>
      <div className={styles.heroKpiValueRow}>
        <span className={styles.heroKpiValue}>{value}</span>
        {deltaLabel ? <span className={`${styles.heroKpiDelta} ${deltaTone(delta, invert)}`.trim()}>{deltaLabel}</span> : null}
      </div>
      <strong className={styles.heroKpiLabel}>{label}</strong>
    </article>;
}
export function Panel({
  title,
  icon,
  note,
  headerExtra,
  children,
  className = ""
}) {
  return <article className={`${styles.panel} ${className}`.trim()}>
      {title || headerExtra ? <header className={styles.panelHeader}>
          <div className={styles.panelHeaderMain}>
            {title ? <h3 className={styles.panelTitle}>
              {icon ? <Icon icon={icon} aria-hidden /> : null}
              {title}
            </h3> : null}
            {note ? <p className={styles.panelNote}>{note}</p> : null}
          </div>
          {headerExtra ? <div className={styles.panelHeaderExtra}>{headerExtra}</div> : null}
        </header> : null}
      <div className={styles.panelBody}>{children}</div>
    </article>;
}
export function KpiRow({
  items
}) {
  if (!items?.length) return null;
  const count = items.length;
  const cols = count <= 2 ? 2 : count === 3 ? 3 : count === 4 ? 4 : count === 5 ? 5 : count === 6 ? 6 : 4;
  const toneClass = {
    blue: styles.kpiTone_blue,
    amber: styles.kpiTone_amber,
    red: styles.kpiTone_red,
    teal: styles.kpiTone_teal,
    purple: styles.kpiTone_purple,
    orange: styles.kpiTone_orange,
    green: styles.kpiTone_green,
    rose: styles.kpiTone_rose
  };
  return <div className={styles.kpiRow} style={{
    "--kpi-cols": String(cols)
  }}>
      {items.map(item => <div key={item.key} className={`${styles.kpiCard} ${toneClass[item.tone] || ""}`.trim()}>
          {item.icon ? <span className={styles.kpiIconWrap} aria-hidden>
              <Icon icon={item.icon} className={styles.kpiIcon} />
            </span> : null}
          <span className={styles.kpiValue}>{item.value}</span>
          <span className={styles.kpiLabel}>{item.label}</span>
        </div>)}
    </div>;
}
export function MiniStat({
  label,
  value
}) {
  return <div className={styles.miniStat}>
      <span className={styles.miniStatValue}>{value}</span>
      <span className={styles.miniStatLabel}>{label}</span>
    </div>;
}
export function TrendBars({
  items,
  formatLabel,
  formatValue,
  emptyLabel
}) {
  if (!items?.length) {
    return <p className={styles.emptyHint}>{emptyLabel}</p>;
  }
  const max = Math.max(...items.map(item => item.count), 1);
  const labelFor = typeof formatLabel === "function" ? formatLabel : defaultTrendLabel;
  const valueFor = typeof formatValue === "function" ? formatValue : value => value;
  return <div className={styles.trendBars}>
      {items.map(item => <div key={String(item.period)} className={styles.trendBarCol}>
          <span className={styles.trendBarValue}>{valueFor(item.count)}</span>
          <div className={styles.trendBarTrack}>
            <span className={styles.trendBarFill} style={{
          height: `${Math.max(6, Math.round(item.count / max * 100))}%`
        }} />
          </div>
          <span className={styles.trendBarLabel}>{labelFor(item.period)}</span>
        </div>)}
    </div>;
}
export function ColumnChart({
  items,
  emptyLabel,
  onSelect,
  formatValue,
  scaleMax
}) {
  if (!items?.length) {
    return <p className={styles.emptyHint}>{emptyLabel}</p>;
  }
  const values = items.map(item => Number(item.value) || 0);
  const max = Math.max(scaleMax || 0, ...values, 1);
  const valueFor = typeof formatValue === "function" ? formatValue : value => value;
  const interactive = typeof onSelect === "function";
  return <div className={`${styles.columnChart} ${items.length >= 10 ? styles.columnChartCompact : ""}`} role={interactive ? "listbox" : "img"}>
      {items.map((item, index) => {
      const value = Number(item.value) || 0;
      const heightPct = value <= 0 ? 0 : Math.max(8, Math.round(value / max * 100));
      const color = item.color || CHART_COLORS[index % CHART_COLORS.length];
      const className = [styles.columnChartCol, interactive ? styles.columnChartColButton : "", item.active ? styles.columnChartColActive : ""].filter(Boolean).join(" ");
      const content = <>
            <span className={styles.columnChartValue} style={{
          color
        }}>{valueFor(value)}</span>
            {item.note ? <span className={styles.columnChartNote}>{item.note}</span> : null}
            <div className={styles.columnChartTrack}>
              <span className={styles.columnChartFill} style={{
            height: `${heightPct}%`,
            background: `linear-gradient(180deg, color-mix(in srgb, ${color} 68%, white), ${color})`
          }} />
            </div>
            <span className={styles.columnChartLabel}>{item.label}</span>
          </>;
      if (interactive) {
        return <button key={item.key} type="button" className={className} aria-pressed={Boolean(item.active)} aria-label={item.label} onClick={() => onSelect(item.key)}>
              {content}
            </button>;
      }
      return <div key={item.key} className={className}>
            {content}
          </div>;
    })}
    </div>;
}
function defaultTrendLabel(period) {
  if (period == null || period === "") return "";
  const value = String(period);
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) {
      return date.toLocaleDateString(undefined, {
        day: "2-digit",
        month: "short"
      });
    }
  }
  return value;
}
export function DistributionPanel({
  title,
  icon,
  items,
  emptyLabel
}) {
  return <Panel title={title} icon={icon}>
      <DashboardDistributionBars items={items} emptyLabel={emptyLabel} />
    </Panel>;
}
export function PiePanel({
  title,
  icon,
  items,
  emptyLabel
}) {
  const total = items.reduce((sum, item) => sum + item.count, 0);
  return <Panel title={title} icon={icon}>
      <DashboardPieChart items={items} total={total} emptyLabel={emptyLabel} />
    </Panel>;
}
export function SectionTitle({
  icon,
  title
}) {
  return <div className={styles.sectionHead}>
      {icon ? <Icon icon={icon} aria-hidden /> : null}
      <h3 className={styles.sectionTitle}>{title}</h3>
    </div>;
}
export { buildDistributionItems };
