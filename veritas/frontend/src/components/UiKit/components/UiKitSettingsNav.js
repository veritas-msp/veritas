import { useLayoutEffect, useRef, useState } from "react";
import { Icon } from "@iconify/react";
import kit from "../uiKitLayouts.module.css";

/**
 * Nav latérale réglages (Mon compte) — items riches + indicateur glissant animé.
 *
 * items: [{ id, icon, label, desc? }]
 */
export default function UiKitSettingsNav({
  items = [],
  activeId,
  onChange,
  ariaLabel = "Navigation"
}) {
  const trackRef = useRef(null);
  const [indicator, setIndicator] = useState({
    top: 0,
    height: 0,
    ready: false
  });

  useLayoutEffect(() => {
    const root = trackRef.current;
    if (!root) return undefined;
    const update = () => {
      const active = root.querySelector('[aria-current="page"]');
      if (!active) {
        setIndicator(prev => (prev.ready ? { ...prev, ready: false, height: 0 } : prev));
        return;
      }
      const rootRect = root.getBoundingClientRect();
      const r = active.getBoundingClientRect();
      const next = {
        top: Math.round(r.top - rootRect.top),
        height: Math.round(r.height),
        ready: true
      };
      setIndicator(prev =>
        prev.top === next.top && prev.height === next.height && prev.ready ? prev : next
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
  }, [activeId, items.length]);

  return (
    <nav className={`${kit.finderSidebar} ${kit.settingsSidebar}`} aria-label={ariaLabel}>
      <div className={`${kit.finderPrimary} ${kit.finderPrimaryAnimated}`} ref={trackRef}>
        {indicator.ready ? (
          <div
            className={kit.finderNavIndicator}
            style={{
              transform: `translate3d(0, ${indicator.top}px, 0)`,
              height: indicator.height
            }}
            aria-hidden
          />
        ) : null}
        {items.map(item => {
          const active = activeId === item.id;
          return (
            <button
              key={item.id}
              type="button"
              className={`${kit.finderItem} ${kit.finderItemRich} ${
                active ? kit.finderItemActive : ""
              }`}
              onClick={() => onChange?.(item.id)}
              aria-current={active ? "page" : undefined}
            >
              <Icon icon={item.icon} className={kit.finderItemIcon} aria-hidden />
              <span className={kit.finderItemStack}>
                <span className={kit.finderItemLabel}>{item.label}</span>
                {item.desc ? <span className={kit.finderItemDesc}>{item.desc}</span> : null}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
