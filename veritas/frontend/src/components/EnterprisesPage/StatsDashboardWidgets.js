import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { interpolate } from "../../i18n/translate";
import { getEquipmentFamilyStatsCopy } from "../../utils/equipmentFamilyStatsI18n";
import styles from "./ComputerFleetStats.module.css";

export const STATS_CHART_COLORS = ["#2b5fab", "#1d6f42", "#b45309", "#7c3aed", "#0e7490", "#be185d", "#64748b", "#c2410c"];
const MAX_PIE_SLICES = 6;
const SVG_SIZE = 100;
const SVG_CX = 50;
const SVG_CY = 50;
const SVG_OUTER = 42;
const SVG_INNER = 26;

export function buildDistributionItems(entries = []) {
  const total = entries.reduce((sum, entry) => sum + (Number(entry.count) || 0), 0);
  if (total <= 0) return {
    items: [],
    total: 0
  };
  return {
    total,
    items: entries.map(entry => {
      const name = String(entry.name || entry.label || entry.key || "Autre").trim() || "Autre";
      const count = Number(entry.count) || 0;
      return {
        name,
        count,
        pct: Math.round(count / total * 100)
      };
    })
  };
}

function useStatsCopy() {
  const locale = useAppLocale();
  return useMemo(() => getEquipmentFamilyStatsCopy(locale), [locale]);
}

function normalizeItems(items) {
  return (Array.isArray(items) ? items : [])
    .map(item => ({
      name: String(item?.name || item?.label || "").trim() || "—",
      count: Number(item?.count) || 0,
      pct: Number(item?.pct)
    }))
    .filter(item => item.count > 0);
}

function withPercents(items, total) {
  const safeTotal = total > 0 ? total : items.reduce((sum, item) => sum + item.count, 0);
  return items.map(item => ({
    ...item,
    pct: Number.isFinite(item.pct) ? item.pct : safeTotal > 0 ? Math.round(item.count / safeTotal * 100) : 0
  }));
}

function collapsePieItems(items, othersLabel) {
  const list = withPercents(normalizeItems(items));
  if (list.length <= MAX_PIE_SLICES) return list;
  const head = list.slice(0, MAX_PIE_SLICES - 1);
  const rest = list.slice(MAX_PIE_SLICES - 1);
  const count = rest.reduce((sum, item) => sum + item.count, 0);
  const total = list.reduce((sum, item) => sum + item.count, 0);
  return [...head, {
    name: othersLabel,
    count,
    pct: total > 0 ? Math.round(count / total * 100) : 0
  }];
}

function polar(cx, cy, radius, angleDeg) {
  const rad = angleDeg * Math.PI / 180;
  return {
    x: cx + radius * Math.cos(rad),
    y: cy + radius * Math.sin(rad)
  };
}

function donutSlicePath(startFrac, endFrac) {
  const span = Math.max(0, Math.min(1, endFrac - startFrac));
  if (span <= 0) return "";
  if (span >= 0.999) {
    return [
      `M ${SVG_CX + SVG_OUTER} ${SVG_CY}`,
      `A ${SVG_OUTER} ${SVG_OUTER} 0 1 1 ${SVG_CX - SVG_OUTER} ${SVG_CY}`,
      `A ${SVG_OUTER} ${SVG_OUTER} 0 1 1 ${SVG_CX + SVG_OUTER} ${SVG_CY}`,
      `M ${SVG_CX + SVG_INNER} ${SVG_CY}`,
      `A ${SVG_INNER} ${SVG_INNER} 0 1 0 ${SVG_CX - SVG_INNER} ${SVG_CY}`,
      `A ${SVG_INNER} ${SVG_INNER} 0 1 0 ${SVG_CX + SVG_INNER} ${SVG_CY}`
    ].join(" ");
  }
  const startAngle = startFrac * 360 - 90;
  const endAngle = endFrac * 360 - 90;
  const large = span > 0.5 ? 1 : 0;
  const p1 = polar(SVG_CX, SVG_CY, SVG_OUTER, startAngle);
  const p2 = polar(SVG_CX, SVG_CY, SVG_OUTER, endAngle);
  const p3 = polar(SVG_CX, SVG_CY, SVG_INNER, endAngle);
  const p4 = polar(SVG_CX, SVG_CY, SVG_INNER, startAngle);
  return `M ${p1.x} ${p1.y} A ${SVG_OUTER} ${SVG_OUTER} 0 ${large} 1 ${p2.x} ${p2.y} L ${p3.x} ${p3.y} A ${SVG_INNER} ${SVG_INNER} 0 ${large} 0 ${p4.x} ${p4.y} Z`;
}

function colorForIndex(index) {
  return STATS_CHART_COLORS[index % STATS_CHART_COLORS.length];
}

export function KpiCard({
  icon,
  label,
  value,
  sub,
  tone = "neutral"
}) {
  return <div className={`${styles.kpiCard} ${styles[`kpi_${tone}`] || ""}`}>
      <div className={styles.kpiIconWrap}>
        <Icon icon={icon} className={styles.kpiIcon} />
      </div>
      <div className={styles.kpiBody}>
        <span className={styles.kpiLabel}>{label}</span>
        <span className={styles.kpiValue}>{value}</span>
        {sub ? <span className={styles.kpiSub}>{sub}</span> : null}
      </div>
    </div>;
}

function StatsDistributionModal({
  open,
  title,
  items,
  total,
  onClose
}) {
  const copy = useStatsCopy();
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState("count");
  const [sortDir, setSortDir] = useState("desc");
  const rows = useMemo(() => withPercents(normalizeItems(items), total), [items, total]);
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const list = needle ? rows.filter(row => row.name.toLowerCase().includes(needle)) : rows.slice();
    const dir = sortDir === "asc" ? 1 : -1;
    list.sort((a, b) => {
      if (sortKey === "name") return a.name.localeCompare(b.name, undefined, { sensitivity: "base" }) * dir;
      if (sortKey === "pct") return (a.pct - b.pct) * dir;
      return (a.count - b.count) * dir;
    });
    return list;
  }, [query, rows, sortDir, sortKey]);
  const max = Math.max(...rows.map(row => row.count), 1);
  const safeTotal = total > 0 ? total : rows.reduce((sum, row) => sum + row.count, 0);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = event => {
      if (event.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setSortKey("count");
      setSortDir("desc");
    }
  }, [open]);

  if (!open) return null;

  const toggleSort = key => {
    if (sortKey === key) {
      setSortDir(current => current === "asc" ? "desc" : "asc");
      return;
    }
    setSortKey(key);
    setSortDir(key === "name" ? "asc" : "desc");
  };

  const sortMark = key => sortKey === key ? sortDir === "asc" ? " ↑" : " ↓" : "";

  return createPortal(<div className={`${styles.root} ${styles.distOverlay}`} onClick={onClose} role="presentation">
      <div className={styles.distModal} onClick={event => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="stats-dist-title">
        <header className={styles.distHeader}>
          <div>
            <p className={styles.distEyebrow}>{copy.distributionModalHint}</p>
            <h2 id="stats-dist-title" className={styles.distTitle}>{title || copy.viewDistribution}</h2>
            <p className={styles.distSubtitle}>{interpolate(copy.valuesCount, { count: String(rows.length) })} · {safeTotal}</p>
          </div>
          <button type="button" className={styles.distClose} onClick={onClose} aria-label={copy.close}>
            <Icon icon="mdi:close" aria-hidden />
          </button>
        </header>
        <div className={styles.distToolbar}>
          <label className={styles.distSearch}>
            <Icon icon="mdi:magnify" aria-hidden />
            <input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder={copy.searchDistribution} />
          </label>
        </div>
        <div className={styles.distTableWrap}>
          <table className={styles.distTable}>
            <thead>
              <tr>
                <th>
                  <button type="button" onClick={() => toggleSort("name")}>{copy.colLabel}{sortMark("name")}</button>
                </th>
                <th className={styles.distNum}>
                  <button type="button" onClick={() => toggleSort("count")}>{copy.colCount}{sortMark("count")}</button>
                </th>
                <th className={styles.distNum}>
                  <button type="button" onClick={() => toggleSort("pct")}>{copy.colShare}{sortMark("pct")}</button>
                </th>
                <th className={styles.distBarCol} aria-hidden />
              </tr>
            </thead>
            <tbody>
              {filtered.length ? filtered.map((row, index) => <tr key={`${row.name}-${index}`}>
                  <td>
                    <span className={styles.distRowLabel}>
                      <span className={styles.legendSwatch} style={{ background: colorForIndex(rows.findIndex(item => item.name === row.name)) }} />
                      <span>{row.name}</span>
                    </span>
                  </td>
                  <td className={styles.distNum}>{row.count}</td>
                  <td className={styles.distNum}>{row.pct}%</td>
                  <td>
                    <div className={styles.distributionTrack}>
                      <span className={styles.distributionFill} style={{
                    width: `${Math.round(row.count / max * 100)}%`,
                    background: colorForIndex(rows.findIndex(item => item.name === row.name))
                  }} />
                    </div>
                  </td>
                </tr>) : <tr>
                  <td colSpan={4} className={styles.distEmpty}>{copy.noMatch}</td>
                </tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>, document.body);
}

export function StatsPieChart({
  items,
  total,
  emptyLabel,
  centerLabel,
  othersLabel,
  title
}) {
  const copy = useStatsCopy();
  const [hovered, setHovered] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const fullItems = useMemo(() => withPercents(normalizeItems(items), total), [items, total]);
  const visibleItems = useMemo(() => collapsePieItems(fullItems, othersLabel || copy.others), [copy.others, fullItems, othersLabel]);
  const slices = useMemo(() => {
    let cursor = 0;
    const sliceTotal = total > 0 ? total : visibleItems.reduce((sum, item) => sum + item.count, 0);
    return visibleItems.map((item, index) => {
      const start = cursor;
      cursor += sliceTotal > 0 ? item.count / sliceTotal : 0;
      return {
        ...item,
        color: colorForIndex(index),
        start,
        end: cursor
      };
    });
  }, [total, visibleItems]);

  if (!visibleItems.length || total <= 0) {
    return <div className={styles.pieBlock}>
        <p className={styles.emptyHint}>{emptyLabel || copy.emptyChart}</p>
      </div>;
  }

  const active = slices.find(slice => slice.name === hovered) || null;
  const openDetail = () => setModalOpen(true);

  return <>
      <div className={styles.pieBlock}>
        <button type="button" className={styles.pieHit} onClick={openDetail} onMouseLeave={() => setHovered(null)} aria-label={interpolate(copy.viewAllValues, { count: String(fullItems.length) })}>
          <svg className={styles.pieSvg} viewBox={`0 0 ${SVG_SIZE} ${SVG_SIZE}`} role="img">
            {slices.map(slice => <path key={slice.name} d={donutSlicePath(slice.start, slice.end)} fill={slice.color} fillRule="evenodd" className={`${styles.pieSlice} ${hovered && hovered !== slice.name ? styles.pieSliceDim : ""} ${hovered === slice.name ? styles.pieSliceHot : ""}`} onMouseEnter={() => setHovered(slice.name)} />)}
          </svg>
          <span className={styles.pieCenter}>
            <span className={styles.pieCenterValue}>{active ? active.count : centerLabel ?? total}</span>
            <span className={styles.pieCenterLabel}>{active ? `${active.pct}%` : "total"}</span>
          </span>
        </button>
        <p className={styles.pieHoverName} title={active?.name || undefined}>{active ? active.name : "\u00a0"}</p>
        <ul className={styles.legend}>
          {slices.map(slice => <li key={slice.name}>
              <button type="button" className={`${styles.legendItem} ${hovered === slice.name ? styles.legendItemHot : ""}`} onMouseEnter={() => setHovered(slice.name)} onMouseLeave={() => setHovered(null)} onClick={openDetail} title={`${slice.name} · ${slice.count} · ${slice.pct}%`}>
                <span className={styles.legendSwatch} style={{ background: slice.color }} />
                <span className={styles.legendText}>
                  <span className={styles.legendName}>{slice.name}</span>
                  <span className={styles.legendMeta}>{slice.count} · {slice.pct}%</span>
                </span>
              </button>
            </li>)}
        </ul>
        <button type="button" className={styles.chartExpandLink} onClick={openDetail}>
          {interpolate(copy.viewAllValues, { count: String(fullItems.length) })}
          <Icon icon="mdi:arrow-expand" aria-hidden />
        </button>
      </div>
      <StatsDistributionModal open={modalOpen} title={title} items={fullItems} total={total} onClose={() => setModalOpen(false)} />
    </>;
}

export function StatsDistributionBars({
  items,
  emptyLabel,
  title
}) {
  const copy = useStatsCopy();
  const [hovered, setHovered] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const rows = useMemo(() => withPercents(normalizeItems(items)), [items]);
  if (!rows.length) {
    return <p className={styles.emptyHint}>{emptyLabel || copy.emptyChart}</p>;
  }
  const max = Math.max(...rows.map(item => item.count), 1);
  const openDetail = () => setModalOpen(true);
  return <>
      <div className={styles.distributionList}>
        {rows.map((item, index) => <button key={item.name} type="button" className={`${styles.distributionRow} ${hovered === item.name ? styles.distributionRowHot : ""}`} onMouseEnter={() => setHovered(item.name)} onMouseLeave={() => setHovered(null)} onClick={openDetail} title={`${item.name} · ${item.count} · ${item.pct}%`}>
            <div className={styles.distributionMeta}>
              <span className={styles.distributionName}>{item.name}</span>
              <span className={styles.distributionCount}>{item.count} ({item.pct}%)</span>
            </div>
            <div className={styles.distributionTrack}>
              <span className={styles.distributionFill} style={{
            width: `${Math.round(item.count / max * 100)}%`,
            background: colorForIndex(index)
          }} />
            </div>
          </button>)}
        <button type="button" className={styles.chartExpandLink} onClick={openDetail}>
          {interpolate(copy.viewAllValues, { count: String(rows.length) })}
          <Icon icon="mdi:arrow-expand" aria-hidden />
        </button>
      </div>
      <StatsDistributionModal open={modalOpen} title={title} items={rows} total={rows.reduce((sum, row) => sum + row.count, 0)} onClose={() => setModalOpen(false)} />
    </>;
}

export function StatsDashboardBody({
  children
}) {
  return <div className={styles.body}>{children}</div>;
}

export function StatsPanel({
  title,
  icon,
  children,
  className = ""
}) {
  return <article className={`${styles.panel} ${className}`.trim()}>
      {title ? <h3 className={styles.panelTitle}>
          {icon ? <Icon icon={icon} aria-hidden /> : null}
          {title}
        </h3> : null}
      {children}
    </article>;
}

export { styles as statsDashboardStyles };
