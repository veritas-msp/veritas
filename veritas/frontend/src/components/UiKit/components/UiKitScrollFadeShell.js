import { useEffect, useLayoutEffect, useRef, useState } from "react";
import styles from "../uiKitTable.module.css";

export default function UiKitScrollFadeShell({
  className = "",
  children,
  deps = [],
  stickToBottom = false,
  fadeTop = false,
  style,
  shellRef
}) {
  const scrollRef = useRef(null);
  const [fadeVisible, setFadeVisible] = useState(false);
  const [fadeTopVisible, setFadeTopVisible] = useState(false);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return undefined;
    const updateFade = () => {
      const remaining = el.scrollHeight - el.scrollTop - el.clientHeight;
      setFadeVisible(remaining > 4);
      setFadeTopVisible(fadeTop && el.scrollTop > 4);
    };
    updateFade();
    const raf = requestAnimationFrame(() => {
      updateFade();
      requestAnimationFrame(updateFade);
    });
    el.addEventListener("scroll", updateFade, { passive: true });
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(updateFade) : null;
    ro?.observe(el);
    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener("scroll", updateFade);
      ro?.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deps explicites pour recalcul
  }, deps);

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

  return (
    <div ref={shellRef} className={`${styles.scrollShell} ${className}`.trim()} style={style}>
      <div ref={scrollRef} className={`${styles.scrollViewport} ${styles.uikitScroll}`}>
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
  );
}
