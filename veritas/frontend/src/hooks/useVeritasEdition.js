import { useEffect, useState } from "react";
import API_BASE_URL from "../config";
import { getEnvEdition, isCommunityEdition } from "../config/edition";
export function useVeritasEdition() {
  const [edition, setEdition] = useState(getEnvEdition());
  const [limits, setLimits] = useState(null);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    let cancelled = false;
    const fetchEdition = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/edition`, {
          credentials: "include"
        });
        if (!res.ok) throw new Error("edition unavailable");
        const data = await res.json();
        if (cancelled) return;
        const resolved = String(data?.edition || getEnvEdition()).toLowerCase() === "pro" ? "pro" : "community";
        setEdition(resolved);
        setLimits(data?.limits || null);
        if (process.env.NODE_ENV !== "production") {
          const envEd = getEnvEdition();
          if (envEd !== resolved) {
            console.warn(`[Veritas] Frontend edition (.env=${envEd}) ≠ backend (/api/edition=${resolved}). ` + "The backend is authoritative · align REACT_APP_VERITAS_EDITION.");
          }
        }
      } catch {
        if (!cancelled) {
          setEdition(getEnvEdition());
          setLimits(null);
        }
      } finally {
        if (!cancelled) setLoaded(true);
      }
    };
    fetchEdition();
    return () => {
      cancelled = true;
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
