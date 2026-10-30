import { Icon } from "@iconify/react";
import styles from "../uiKitHome.module.css";

function formatNumber(value) {
  if (value == null || value === "") return "-";
  if (typeof value === "string") return value;
  const n = Number(value);
  if (Number.isNaN(n)) return String(value);
  return String(Math.round(n));
}

function KpiWidgetButton({ card, onNavigate }) {
  return (
    <button
      type="button"
      className={styles.kpiWidget}
      onClick={() => onNavigate?.(card.viewId ? { viewId: card.viewId } : null)}
      aria-label={`${card.label}: ${formatNumber(card.value)}`}
    >
      {card.icon ? (
        <span className={styles.kpiWidgetIcon} aria-hidden>
          <Icon icon={card.icon} />
        </span>
      ) : null}
      <span className={styles.kpiWidgetValue}>{formatNumber(card.value)}</span>
      <span className={styles.kpiWidgetLabel}>{card.label}</span>
    </button>
  );
}

function KpiSegButton({ card, onNavigate }) {
  return (
    <button
      type="button"
      role="listitem"
      className={styles.kpiSegItem}
      onClick={() => onNavigate?.(card.viewId ? { viewId: card.viewId } : null)}
      aria-label={`${card.label}: ${formatNumber(card.value)}`}
    >
      <span className={styles.kpiSegValue}>{formatNumber(card.value)}</span>
      <span className={styles.kpiSegLabel}>{card.label}</span>
    </button>
  );
}

function KpiPillButton({ card, onNavigate }) {
  return (
    <button
      type="button"
      role="listitem"
      className={styles.kpiPill}
      onClick={() => onNavigate?.(card.viewId ? { viewId: card.viewId } : null)}
      aria-label={`${card.label}: ${formatNumber(card.value)}`}
    >
      <span className={styles.kpiPillValue}>{formatNumber(card.value)}</span>
      <span className={styles.kpiPillLabel}>{card.label}</span>
    </button>
  );
}

/**
 * @param {"widgets"|"segments"|"pills"} variant
 * - widgets: cartes KPI (icône + valeur + label)
 * - segments: piste compacte
 * - pills: pastilles séparées (Accueil tickets)
 */
export default function UiKitKpiStrip({
  supportCards = [],
  salesCards = [],
  cards = null,
  showSupport = false,
  showSales = false,
  supportAria,
  salesAria,
  supportGroupLabel,
  salesGroupLabel,
  ariaLabel,
  onSupportClick,
  onSalesClick,
  onNavigate,
  variant = "segments",
  className = ""
}) {
  if (variant === "pills") {
    const list = Array.isArray(cards) ? cards : [];
    if (!list.length) return null;
    return (
      <div
        className={`${styles.kpiPillRow}${className ? ` ${className}` : ""}`}
        style={{ "--kpi-count": list.length }}
        role="list"
        aria-label={ariaLabel || supportAria || salesAria}
        data-guide="home-tickets"
      >
        {list.map(card => (
          <KpiPillButton
            key={card.key}
            card={card}
            onNavigate={onNavigate || onSupportClick || onSalesClick}
          />
        ))}
      </div>
    );
  }

  if (variant === "widgets") {
    const list = Array.isArray(cards) ? cards : [];
    if (!list.length && (showSupport || showSales)) {
      return (
        <div className={`${styles.kpiSegRow}${className ? ` ${className}` : ""}`} data-guide="home-tickets">
          {showSupport && supportCards.length ? (
            <div style={{ flex: "1 1 0", minWidth: 0 }}>
              {supportGroupLabel ? <span className={styles.kpiSegGroupLabel}>{supportGroupLabel}</span> : null}
              <div
                className={styles.kpiWidgetRow}
                style={{ "--kpi-count": supportCards.length }}
                role="list"
                aria-label={supportAria || supportGroupLabel}
              >
                {supportCards.map(card => (
                  <KpiWidgetButton key={card.key} card={card} onNavigate={onSupportClick} />
                ))}
              </div>
            </div>
          ) : null}
          {showSales && salesCards.length ? (
            <div style={{ flex: "1 1 0", minWidth: 0 }}>
              {salesGroupLabel ? <span className={styles.kpiSegGroupLabel}>{salesGroupLabel}</span> : null}
              <div
                className={styles.kpiWidgetRow}
                style={{ "--kpi-count": salesCards.length }}
                role="list"
                aria-label={salesAria || salesGroupLabel}
              >
                {salesCards.map(card => (
                  <KpiWidgetButton key={card.key} card={card} onNavigate={onSalesClick} />
                ))}
              </div>
            </div>
          ) : null}
        </div>
      );
    }
    if (!list.length) return null;
    return (
      <div
        className={`${styles.kpiWidgetRow}${className ? ` ${className}` : ""}`}
        style={{ "--kpi-count": list.length }}
        role="list"
        aria-label={ariaLabel}
        data-guide="home-tickets"
      >
        {list.map(card => (
          <KpiWidgetButton key={card.key} card={card} onNavigate={onNavigate || onSupportClick || onSalesClick} />
        ))}
      </div>
    );
  }

  /* segments */
  if (Array.isArray(cards) && cards.length) {
    return (
      <div
        className={`${styles.kpiSegTrack}${className ? ` ${className}` : ""}`}
        role="list"
        aria-label={ariaLabel || supportAria || salesAria}
        data-guide="home-tickets"
      >
        {cards.map(card => (
          <KpiSegButton
            key={card.key}
            card={card}
            onNavigate={onNavigate || (showSupport ? onSupportClick : onSalesClick)}
          />
        ))}
      </div>
    );
  }

  if (!showSupport && !showSales) return null;

  return (
    <div className={`${styles.kpiSegRow}${className ? ` ${className}` : ""}`} data-guide="home-tickets">
      {showSupport && supportCards.length ? (
        <div style={{ flex: "1 1 0", minWidth: 0 }}>
          {supportGroupLabel ? <span className={styles.kpiSegGroupLabel}>{supportGroupLabel}</span> : null}
          <div className={styles.kpiSegTrack} role="list" aria-label={supportAria || supportGroupLabel}>
            {supportCards.map(card => (
              <KpiSegButton key={card.key} card={card} onNavigate={onSupportClick} />
            ))}
          </div>
        </div>
      ) : null}
      {showSales && salesCards.length ? (
        <div style={{ flex: "1 1 0", minWidth: 0 }}>
          {salesGroupLabel ? <span className={styles.kpiSegGroupLabel}>{salesGroupLabel}</span> : null}
          <div className={styles.kpiSegTrack} role="list" aria-label={salesAria || salesGroupLabel}>
            {salesCards.map(card => (
              <KpiSegButton key={card.key} card={card} onNavigate={onSalesClick} />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
