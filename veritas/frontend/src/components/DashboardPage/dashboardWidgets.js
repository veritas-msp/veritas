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
      {title ? <h3 className={styles.panelTitle}>
          {icon ? <Icon icon={icon} aria-hidden /> : null}
          {title}
        </h3> : null}
      {note ? <p className={styles.panelNote}>{note}</p> : null}
      {children}
    </article>;
}
export function KpiRow({
  items
}) {
  if (!items?.length) return null;
  return <div className={styles.kpiRow}>
      {items.map(item => <div key={item.key} className={styles.kpiCard}>
          {item.icon ? <span className={styles.kpiIconWrap}>
              <Icon icon={item.icon} className={styles.kpiIcon} aria-hidden />
            </span> : null}
          <div className={styles.kpiBody}>
            <span className={styles.kpiValue}>{item.value}</span>
            <span className={styles.kpiLabel}>{item.label}</span>
          </div>
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
export function CategoryIntro({
  title,
  text
}) {
  return <div className={styles.categoryIntro}>
      <h2 className={styles.categoryIntroTitle}>{title}</h2>
      <p className={styles.categoryIntroText}>{text}</p>
    </div>;
}
export function SectionTitle({
  icon,
  title
}) {
  return <h3 className={styles.sectionTitle}>
      {icon ? <Icon icon={icon} aria-hidden /> : null}
      {title}
    </h3>;
}
export { buildDistributionItems };
