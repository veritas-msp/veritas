import { useLayoutEffect, useRef, useState } from "react";
import styles from "./ActivityStatusSegmented.module.css";

/**
 * Segmented control (Tous / Ouverts / Clos, Actifs / Corbeille, …)
 * with a sliding macOS-style indicator.
 */
export default function ActivityStatusSegmented({ value, onChange, options = [], ariaLabel }) {
  const trackRef = useRef(null);
  const [indicator, setIndicator] = useState({ left: 0, width: 0, ready: false });

  useLayoutEffect(() => {
    const root = trackRef.current;
    if (!root) return undefined;
    const update = () => {
      const active = root.querySelector('[aria-pressed="true"]');
      if (!active) {
        setIndicator(prev => (prev.ready ? { ...prev, ready: false } : prev));
        return;
      }
      const next = {
        left: active.offsetLeft,
        width: active.offsetWidth,
        ready: true
      };
      setIndicator(prev =>
        prev.left === next.left && prev.width === next.width && prev.ready ? prev : next
      );
    };
    update();
    const raf = requestAnimationFrame(() => {
      update();
      requestAnimationFrame(update);
    });
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(update) : null;
    ro?.observe(root);
    window.addEventListener("resize", update);
    return () => {
      cancelAnimationFrame(raf);
      ro?.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [value, options]);

  return (
    <div ref={trackRef} className={styles.macosSegmented} role="group" aria-label={ariaLabel}>
      {indicator.ready ? (
        <span
          className={styles.macosSegmentIndicator}
          style={{
            transform: `translateX(${indicator.left}px)`,
            width: indicator.width
          }}
          aria-hidden
        />
      ) : null}
      {options.map(option => (
        <button
          key={option.id}
          type="button"
          className={`${styles.macosSegment} ${value === option.id ? styles.macosSegmentActive : ""}`}
          aria-pressed={value === option.id}
          onClick={() => onChange?.(option.id)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
