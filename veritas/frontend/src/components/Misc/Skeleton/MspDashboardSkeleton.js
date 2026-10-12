import React from "react";
import layout from "../../EnterprisesPage/EnterprisesPage.module.css";
import { SkeletonBone } from "./PageSkeleton";
import sk from "./MspDashboardSkeleton.module.css";

/**
 * Skeleton aligned with Cyber / Cloud IT MSP dashboards
 * (listBody → panelCard → search/chips → table → pagination).
 */
export default function MspDashboardSkeleton({
  label,
  rows = 8,
  chipCount = 4,
  columnCount = 7,
  showKpis = false,
  kpiCount = 4,
  className = ""
}) {
  const rowCount = Math.max(1, Number(rows) || 8);
  const chips = Math.max(0, Number(chipCount) || 0);
  const cols = Math.max(3, Number(columnCount) || 7);
  const kpis = Math.max(0, Number(kpiCount) || 0);

  return (
    <div
      className={`${layout.listBody} ${className}`.trim()}
      role="status"
      aria-busy="true"
      aria-label={label || undefined}
    >
      <div className={layout.listArea}>
        <div className={layout.panelCard}>
          {showKpis && kpis > 0 ? (
            <div className={sk.kpiStrip} aria-hidden>
              {Array.from({ length: kpis }, (_, index) => (
                <SkeletonBone key={`kpi-${index}`} className={sk.kpiCard} />
              ))}
            </div>
          ) : null}

          <div className={layout.tableSearchBar} aria-hidden>
            <SkeletonBone className={sk.search} />
            {chips > 0 ? (
              <div className={sk.chips}>
                {Array.from({ length: chips }, (_, index) => (
                  <SkeletonBone key={`chip-${index}`} className={sk.chip} />
                ))}
              </div>
            ) : null}
            <div className={sk.actions}>
              <SkeletonBone className={sk.iconBtn} />
            </div>
          </div>

          <div className={layout.dataTableWrap} aria-hidden>
            <div className={layout.dataTableScroll}>
              <div className={sk.table}>
                <div className={sk.thead} style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
                  {Array.from({ length: cols }, (_, index) => (
                    <SkeletonBone key={`th-${index}`} className={sk.th} />
                  ))}
                </div>
                <div className={sk.tbody}>
                  {Array.from({ length: rowCount }, (_, rowIndex) => (
                    <div
                      key={`row-${rowIndex}`}
                      className={sk.row}
                      style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
                    >
                      {Array.from({ length: cols }, (_, colIndex) => (
                        <SkeletonBone
                          key={`cell-${rowIndex}-${colIndex}`}
                          className={colIndex === 0 ? sk.cellPrimary : sk.cell}
                        />
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className={`${layout.pagination} ${layout.paginationEmbedded}`} aria-hidden>
            <div className={layout.paginationLeft}>
              <SkeletonBone className={sk.pagLabel} />
              <SkeletonBone className={sk.pagSelect} />
              <SkeletonBone className={sk.pagInfo} />
            </div>
            <div className={layout.paginationRight}>
              <SkeletonBone className={sk.pagBtn} />
              <SkeletonBone className={sk.pagPage} />
              <SkeletonBone className={sk.pagBtn} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
