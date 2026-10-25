import { useCallback, useLayoutEffect, useState } from "react";

/**
 * Indicateur glissant pour nav Finder (primaire / secondaire).
 * Cherche `[aria-current="page"]` ou `[aria-current="true"]` dans le conteneur.
 * Utilise un callback ref pour se recalculer dès que le track est monté (ex. modale qui
 * passait de `return null` à ouverte sans changer activeSection).
 */
export default function useFinderNavIndicator(deps = []) {
  const [trackEl, setTrackEl] = useState(null);
  const trackRef = useCallback(node => {
    setTrackEl(node);
  }, []);
  const [indicator, setIndicator] = useState({ top: 0, height: 0, ready: false });
  const depsKey = deps.map(d => String(d)).join("|");

  useLayoutEffect(() => {
    const root = trackEl;
    if (!root) {
      setIndicator(prev => (prev.ready ? { top: 0, height: 0, ready: false } : prev));
      return undefined;
    }

    const update = () => {
      const active =
        root.querySelector('[aria-current="page"]') ||
        root.querySelector('[aria-current="true"]');
      if (!active) {
        setIndicator(prev => (prev.ready ? { ...prev, ready: false, height: 0 } : prev));
        return;
      }
      const rootRect = root.getBoundingClientRect();
      const r = active.getBoundingClientRect();
      // Modale / portal : parfois 1er paint à hauteur 0 — ne pas figer ready trop tôt
      if (r.height < 1) {
        setIndicator(prev => (prev.ready ? { ...prev, ready: false, height: 0 } : prev));
        return;
      }
      const next = {
        top: Math.round(r.top - rootRect.top + root.scrollTop),
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- depsKey agrège les deps
  }, [depsKey, trackEl]);

  return { trackRef, indicator };
}
