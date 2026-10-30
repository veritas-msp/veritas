import { useCallback, useLayoutEffect, useState } from "react";

/**
 * Indicateur glissant pour nav Finder (primaire / secondaire).
 * Cherche `[aria-current="page"]` ou `[aria-current="true"]` dans le conteneur.
 * Utilise un callback ref pour se recalculer dès que le track est monté.
 * Observe aussi l’item actif et ses enfants (icônes Iconify qui chargent après coup).
 */
export default function useFinderNavIndicator(deps = []) {
  const [trackEl, setTrackEl] = useState(null);
  const trackRef = useCallback(node => {
    setTrackEl(node);
  }, []);
  const [indicator, setIndicator] = useState({ top: 0, left: 0, width: 0, height: 0, ready: false });
  const depsKey = deps
    .map(d => {
      if (d instanceof Set) return [...d].join(",");
      if (Array.isArray(d)) return d.join(",");
      if (d && typeof d === "object") {
        try {
          return JSON.stringify(d);
        } catch {
          return String(d);
        }
      }
      return String(d);
    })
    .join("|");

  useLayoutEffect(() => {
    const root = trackEl;
    if (!root) {
      setIndicator(prev => (prev.ready ? { top: 0, left: 0, width: 0, height: 0, ready: false } : prev));
      return undefined;
    }

    let activeEl = null;
    let activeRo = null;

    const measure = el => {
      if (!el) return null;
      let top;
      let left;
      let width;
      let height;
      if (el.offsetParent === root) {
        top = Math.round(el.offsetTop);
        left = Math.round(el.offsetLeft);
        width = Math.round(el.offsetWidth);
        height = Math.round(el.offsetHeight);
      } else {
        const rootRect = root.getBoundingClientRect();
        const r = el.getBoundingClientRect();
        top = Math.round(r.top - rootRect.top + root.scrollTop);
        left = Math.round(r.left - rootRect.left + root.scrollLeft);
        width = Math.round(r.width);
        height = Math.round(r.height);
      }
      if (height < 1 && width < 1) return null;
      return { top, left, width, height, ready: true };
    };

    const update = () => {
      const active =
        root.querySelector('[aria-current="page"]') ||
        root.querySelector('[aria-current="true"]');

      if (active !== activeEl) {
        activeRo?.disconnect();
        activeRo = null;
        activeEl = active;
        if (active && typeof ResizeObserver !== "undefined") {
          activeRo = new ResizeObserver(update);
          activeRo.observe(active);
          // Icônes / span internes qui apparaissent après le mount
          Array.from(active.children).forEach(child => activeRo.observe(child));
        }
      }

      if (!active) {
        setIndicator(prev => (prev.ready ? { ...prev, ready: false, height: 0, width: 0 } : prev));
        return;
      }

      const next = measure(active);
      if (!next) {
        setIndicator(prev => (prev.ready ? { ...prev, ready: false, height: 0, width: 0 } : prev));
        return;
      }

      setIndicator(prev =>
        prev.top === next.top &&
        prev.left === next.left &&
        prev.width === next.width &&
        prev.height === next.height &&
        prev.ready
          ? prev
          : next
      );
    };

    update();
    const raf = requestAnimationFrame(() => {
      update();
      requestAnimationFrame(update);
    });
    // 3e passe après paint (icônes async)
    const timeoutId = window.setTimeout(update, 80);
    const timeoutId2 = window.setTimeout(update, 250);

    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(update) : null;
    ro?.observe(root);
    Array.from(root.children).forEach(child => {
      if (child.getAttribute?.("aria-hidden") === "true") return;
      ro?.observe(child);
    });

    const mo =
      typeof MutationObserver !== "undefined"
        ? new MutationObserver(records => {
            /* Ignorer les mutations de style de l'indicateur (évite boucle Resize/Mutation). */
            const meaningful = records.some(rec => {
              if (rec.type === "attributes" && rec.attributeName === "style") return false;
              const t = rec.target;
              if (t?.nodeType === 1 && t.getAttribute?.("aria-hidden") === "true") return false;
              const cls = typeof t?.className === "string" ? t.className : "";
              if (cls.includes("finderNavIndicator") || cls.includes("NavIndicator")) return false;
              return true;
            });
            if (meaningful) update();
          })
        : null;
    mo?.observe(root, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ["aria-current", "class", "aria-pressed"]
    });

    const fontsReady = document.fonts?.ready?.then?.(() => update());

    window.addEventListener("resize", update);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(timeoutId);
      window.clearTimeout(timeoutId2);
      ro?.disconnect();
      activeRo?.disconnect();
      mo?.disconnect();
      window.removeEventListener("resize", update);
      // fontsReady is a promise; no cancel needed
      void fontsReady;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- depsKey agrège les deps
  }, [depsKey, trackEl]);

  return { trackRef, indicator };
}
