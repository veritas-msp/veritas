import React from "react";
import { Icon } from "@iconify/react";
import styles from "./MspOverviewHexPanel.module.css";
export const MSP_HEX_TONES = {
  good: {
    accent: "#10b981",
    soft: "rgba(16, 185, 129, 0.14)"
  },
  warn: {
    accent: "#d97706",
    soft: "rgba(245, 158, 11, 0.14)"
  },
  bad: {
    accent: "#dc2626",
    soft: "rgba(239, 68, 68, 0.12)"
  },
  neutral: {
    accent: "#2b5fab",
    soft: "rgba(43, 95, 171, 0.1)"
  },
  violet: {
    accent: "#8b5cf6",
    soft: "rgba(139, 92, 246, 0.12)"
  },
  cyan: {
    accent: "#0891b2",
    soft: "rgba(8, 145, 178, 0.12)"
  },
  muted: {
    accent: "#94a3b8",
    soft: "rgba(148, 163, 184, 0.16)"
  }
};
export function formatHexKpiValue(value) {
  if (value === "-") return "-";
  if (value == null || Number.isNaN(Number(value))) return "0";
  return String(Math.round(Number(value)));
}
export function getHealthHexTone(score) {
  if (score == null) return "neutral";
  if (score >= 80) return "good";
  if (score >= 50) return "warn";
  return "bad";
}
function resolveEffectiveHexTone(tone, value, zeroMuted = true) {
  if (!zeroMuted) return tone;
  if (formatHexKpiValue(value) === "0") return "muted";
  return tone;
}
function resolveToneColors(tone, accent, soft) {
  if (accent && soft) return {
    accent,
    soft
  };
  return MSP_HEX_TONES[tone] || MSP_HEX_TONES.neutral;
}
export function MspOverviewHexCell({
  icon,
  label,
  value,
  tone = "neutral",
  accent,
  soft,
  onClick,
  disabled = false,
  title,
  zeroMuted = true
}) {
  const effectiveTone = resolveEffectiveHexTone(tone, value, zeroMuted);
  const colors = resolveToneColors(effectiveTone, accent, soft);
  const displayValue = formatHexKpiValue(value);
  const interactive = Boolean(onClick) && !disabled;
  const Tag = interactive ? "button" : "div";
  return <Tag type={interactive ? "button" : undefined} className={`${styles.hexNode} ${interactive ? styles.hexNodeInteractive : ""}`} style={{
    "--hex-accent": colors.accent,
    "--hex-soft": colors.soft
  }} onClick={interactive ? onClick : undefined} disabled={interactive ? disabled : undefined} aria-label={title || (label ? `${label}: ${displayValue}` : displayValue)}>
      <span className={styles.hexShape} aria-hidden>
        <span className={styles.hexInner}>
          {icon ? <Icon icon={icon} className={styles.hexIcon} aria-hidden /> : null}
          <span className={styles.hexValue}>{displayValue}</span>
          {label ? <span className={styles.hexLabel}>{label}</span> : null}
        </span>
      </span>
    </Tag>;
}
export default function MspOverviewHexPanel({
  title,
  titleIcon = "mdi:hexagon-multiple-outline",
  hint,
  items = [],
  loading = false,
  className = ""
}) {
  if (loading) {
    return <section className={`${styles.panel} ${className}`} aria-busy="true" aria-label={title}>
        <div className={styles.skeletonRow}>
          {Array.from({
          length: 6
        }).map((_, index) => <div key={index} className={styles.skeletonHex} />)}
        </div>
      </section>;
  }
  if (!items.length) return null;
  return <section className={`${styles.panel} ${className}`} aria-label={title}>
      {title ? <header className={styles.header}>
          <h2 className={styles.title}>
            {titleIcon ? <Icon icon={titleIcon} className={styles.titleIcon} aria-hidden /> : null}
            {title}
          </h2>
          {hint ? <p className={styles.hint}>{hint}</p> : null}
        </header> : null}
      <div className={styles.body}>
        <div className={styles.hexRow} role="list">
          {items.map(item => <div key={item.id} className={styles.hexWrap} role="listitem">
              <MspOverviewHexCell {...item} />
            </div>)}
        </div>
      </div>
    </section>;
}
