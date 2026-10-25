import { useEffect, useLayoutEffect, useRef, useState } from "react";
import styles from "../uiKitTable.module.css";

/**
 * Shell scroll + fondu.
 * `header` : en-tête HORS du viewport (pas de sticky) — élimine le saut des thead
 * au hover scrollbar Windows / changement de filtre.
 */
export default function UiKitScrollFadeShell({
  className = "",
  children,
  header = null,
  deps = [],
  stickToBottom = false,
  fadeTop = true,
  stableScrollbar = false,
  style,
  shellRef,
  scrollViewportRef
}) {
  const scrollRef = useRef(null);
  const headerRef = useRef(null);
  const setScrollEl = el => {
    scrollRef.current = el;
    if (!scrollViewportRef) return;
    if (typeof scrollViewportRef === "function") scrollViewportRef(el);
    else scrollViewportRef.current = el;
  };
  const [fadeVisible, setFadeVisible] = useState(false);
  const [fadeTopVisible, setFadeTopVisible] = useState(false);
  const hasFrozenHeader = Boolean(header);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return undefined;

    const syncHeader = () => {
      const head = headerRef.current;
      if (!head) return;
      head.scrollLeft = el.scrollLeft;
      // Aligne la largeur utile avec la barre Y du body (évite décalage colonnes)
      const sb = Math.max(0, el.offsetWidth - el.clientWidth);
      // Toujours écrire la valeur (y compris 0) pour ne pas laisser un padding fantôme
      head.style.paddingInlineEnd = `${sb}px`;
    };

    const updateFade = () => {
      const remaining = el.scrollHeight - el.scrollTop - el.clientHeight;
      setFadeVisible(remaining > 4);
      setFadeTopVisible(Boolean(fadeTop) && el.scrollTop > 4);
    };

    const onScroll = () => {
      updateFade();
      syncHeader();
    };

    updateFade();
    syncHeader();
    const raf = requestAnimationFrame(() => {
      updateFade();
      syncHeader();
      requestAnimationFrame(() => {
        updateFade();
        syncHeader();
      });
    });
    el.addEventListener("scroll", onScroll, { passive: true });
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(() => {
      updateFade();
      syncHeader();
    }) : null;
    ro?.observe(el);
    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener("scroll", onScroll);
      ro?.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fadeTop, ...deps]);

  const depsKey = deps.join("|");
  useLayoutEffect(() => {
    if (!stickToBottom) return undefined;
    const el = scrollRef.current;
    if (!el) return undefined;
    const snap = () => {
      el.scrollTop = el.scrollHeight;
    };
    snap();
    const raf = requestAnimationFrame(() => {
      snap();
      requestAnimationFrame(snap);
    });
    return () => cancelAnimationFrame(raf);
  }, [stickToBottom, depsKey]);

  const viewportClass = [
    styles.scrollViewport,
    styles.uikitScroll,
    stableScrollbar ? styles.scrollViewportStable : "",
    hasFrozenHeader ? styles.scrollViewportWithFrozenHeader : ""
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div ref={shellRef} className={`${styles.scrollShell} ${className}`.trim()} style={style}>
      {hasFrozenHeader ? (
        <div ref={headerRef} className={styles.scrollFrozenHeader}>
          {header}
        </div>
      ) : null}
      <div className={styles.scrollBody}>
        <div ref={setScrollEl} className={viewportClass}>
          {children}
        </div>
        {fadeTop ? (
          <div
            className={`${styles.scrollFadeTop} ${fadeTopVisible ? styles.scrollFadeVisible : ""}`}
            aria-hidden
          />
        ) : null}
        <div
          className={`${styles.scrollFade} ${fadeVisible ? styles.scrollFadeVisible : ""}`}
          aria-hidden
        />
      </div>
    </div>
  );
}
