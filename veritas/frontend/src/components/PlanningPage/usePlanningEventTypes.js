import { useCallback, useEffect, useState } from "react";
import { fetchPlanningEventTypes } from "../../api/planningEventTypes";
import { mapPlanningEventTypeToUi } from "../AdminPage/planningEventTypeConstants";
import { setPlanningEventTypesCache } from "./planningEventTypes";

export function usePlanningEventTypes() {
  const [catalogTypes, setCatalogTypes] = useState(null);

  const applyTypes = useCallback(rows => {
    const mapped = (rows || []).map(mapPlanningEventTypeToUi);
    setCatalogTypes(mapped);
    setPlanningEventTypesCache(mapped);
  }, []);

  const reload = useCallback(async signal => {
    try {
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
    const controller = new AbortController();
    reload(controller.signal);
    const onUpdated = () => reload();
    window.addEventListener("planningEventTypesUpdated", onUpdated);
    return () => {
      controller.abort();
      window.removeEventListener("planningEventTypesUpdated", onUpdated);
    };
  }, [reload]);

  return catalogTypes;
}
