import { useCallback, useEffect, useState } from "react";
import { fetchPlanningEventTypes } from "../../api/planningEventTypes";
import { mapPlanningEventTypeToUi } from "../AdminPage/planningEventTypeConstants";
import { setPlanningEventTypesCache } from "./planningEventTypes";

let planningTypesPromise = null;
let planningTypesResolved = null;

function loadPlanningEventTypesOnce() {
  if (planningTypesResolved) {
    return Promise.resolve(planningTypesResolved);
  }
  if (planningTypesPromise) return planningTypesPromise;

  planningTypesPromise = fetchPlanningEventTypes({})
    .then(rows => {
      const mapped = (rows || []).map(mapPlanningEventTypeToUi);
      planningTypesResolved = mapped;
      setPlanningEventTypesCache(mapped);
      return mapped;
    })
    .catch(err => {
      planningTypesPromise = null;
      throw err;
    })
    .finally(() => {
      if (planningTypesResolved) planningTypesPromise = null;
    });

  return planningTypesPromise;
}

export function usePlanningEventTypes() {
  const [catalogTypes, setCatalogTypes] = useState(() => planningTypesResolved);

  const applyTypes = useCallback(rows => {
    const mapped = (rows || []).map(mapPlanningEventTypeToUi);
    planningTypesResolved = mapped;
    setCatalogTypes(mapped);
    setPlanningEventTypesCache(mapped);
  }, []);

  const reload = useCallback(async signal => {
    try {
      planningTypesResolved = null;
      planningTypesPromise = null;
      const rows = await fetchPlanningEventTypes({
        signal
      });
      applyTypes(rows);
    } catch (err) {
      if (err?.name === "AbortError") return;
      // Keep hardcoded fallback when API is unavailable.
    }
  }, [applyTypes]);

  useEffect(() => {
    let cancelled = false;

    if (planningTypesResolved) {
      setCatalogTypes(planningTypesResolved);
    } else {
      loadPlanningEventTypesOnce()
        .then(mapped => {
          if (!cancelled) setCatalogTypes(mapped);
        })
        .catch(() => {
          /* keep fallback */
        });
    }

    const onUpdated = () => reload();
    window.addEventListener("planningEventTypesUpdated", onUpdated);
    return () => {
      cancelled = true;
      window.removeEventListener("planningEventTypesUpdated", onUpdated);
    };
  }, [reload]);

  return catalogTypes;
}
