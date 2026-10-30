import { useEffect, useState } from "react";
import API_BASE_URL from "../config";
import { getEnvEdition, isCommunityEdition } from "../config/edition";

/** Shared in-flight / resolved edition so every consumer does not hit /edition. */
let editionCache = null;
let editionPromise = null;
const editionListeners = new Set();

function notifyEditionListeners(next) {
  editionListeners.forEach(listener => {
    try {
      listener(next);
    } catch {
      /* ignore subscriber errors */
    }
  });
}

function loadEditionOnce() {
  if (editionCache?.loaded) {
    return Promise.resolve(editionCache);
  }
  if (editionPromise) return editionPromise;

  editionPromise = (async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/edition`, {
        credentials: "include"
      });
      if (!res.ok) throw new Error("edition unavailable");
      const data = await res.json();
      const resolved = String(data?.edition || getEnvEdition()).toLowerCase() === "pro" ? "pro" : "community";
      editionCache = {
        edition: resolved,
        limits: data?.limits || null,
        loaded: true
      };
      if (process.env.NODE_ENV !== "production") {
        const envEd = getEnvEdition();
        if (envEd !== resolved) {
          console.warn(`[Veritas] Frontend edition (.env=${envEd}) ≠ backend (/api/edition=${resolved}). ` + "The backend is authoritative · align REACT_APP_VERITAS_EDITION.");
        }
      }
    } catch {
      editionCache = {
        edition: getEnvEdition(),
        limits: null,
        loaded: true
      };
    }
    notifyEditionListeners(editionCache);
    return editionCache;
  })();

  return editionPromise;
}

export function useVeritasEdition() {
  const [edition, setEdition] = useState(() => editionCache?.edition || getEnvEdition());
  const [limits, setLimits] = useState(() => editionCache?.limits ?? null);
  const [loaded, setLoaded] = useState(() => Boolean(editionCache?.loaded));

  useEffect(() => {
    let cancelled = false;
    const apply = next => {
      if (cancelled || !next) return;
      setEdition(next.edition);
      setLimits(next.limits);
      setLoaded(Boolean(next.loaded));
    };
    editionListeners.add(apply);
    if (editionCache?.loaded) {
      apply(editionCache);
    } else {
      loadEditionOnce().then(apply);
    }
    return () => {
      cancelled = true;
      editionListeners.delete(apply);
    };
  }, []);

  return {
    edition,
    limits,
    loaded,
    isCommunity: isCommunityEdition(edition),
    isPro: edition === "pro"
  };
}
