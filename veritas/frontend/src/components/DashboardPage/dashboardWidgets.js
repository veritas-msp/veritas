import { Icon } from "@iconify/react";
import { buildDistributionItems, DashboardDistributionBars, DashboardPieChart } from "./DashboardCharts";
import styles from "./DashboardPage.module.css";

export function formatNumber(value) {
  if (value == null || Number.isNaN(Number(value))) return "-";
  return String(Math.round(Number(value)));
}
export function formatHours(copy, value) {
  if (value == null || !Number.isFinite(Number(value))) return copy.units.none;
  return copy.units.hours.replace("{value}", String(value));
}
export function formatPercent(copy, value) {
  if (value == null || !Number.isFinite(Number(value))) return copy.units.none;
  return copy.units.percent.replace("{value}", String(value));
}
export function formatRating(copy, value) {
  if (value == null || !Number.isFinite(Number(value))) return copy.units.none;
  return copy.units.stars.replace("{value}", String(value));
}
export function Panel({
  title,
  icon,
  note,
  children,
  className = ""
}) {
  return <article className={`${styles.panel} ${className}`.trim()}>
      {title ? <header className={styles.panelHeader}>
          <div className={styles.panelHeaderMain}>
            <h3 className={styles.panelTitle}>
              {icon ? <Icon icon={icon} aria-hidden /> : null}
              {title}
            </h3>
            {note ? <p className={styles.panelNote}>{note}</p> : null}
          </div>
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
  emptyLabel
}) {
  if (!items?.length) {
    return <p className={styles.emptyHint}>{emptyLabel}</p>;
  }
  const max = Math.max(...items.map(item => item.count), 1);
  return <div className={styles.trendBars}>
      {items.map(item => <div key={String(item.period)} className={styles.trendBarCol}>
          <span className={styles.trendBarValue}>{item.count}</span>
          <div className={styles.trendBarTrack}>
            <span className={styles.trendBarFill} style={{
          height: `${Math.max(6, Math.round(item.count / max * 100))}%`
        }} />
          </div>
          <span className={styles.trendBarLabel}>{formatLabel(item.period)}</span>
        </div>)}
    </div>;
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
