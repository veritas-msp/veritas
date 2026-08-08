import { useCallback, useEffect, useState } from "react";
import { fetchSupervisionAlertRules } from "../api/supervisionAlertRules";
import { buildDefaultMonitoringAlertRules } from "../components/EquipementPage/supervisionAlertRulesConfig";
let sharedRules = null;
let sharedPromise = null;
export function useSupervisionAlertRules() {
  const [rules, setRules] = useState(sharedRules || buildDefaultMonitoringAlertRules());
  const [catalog, setCatalog] = useState(null);
  const [loading, setLoading] = useState(!sharedRules);
  const [error, setError] = useState(null);
  const load = useCallback(async (fresh = false) => {
    if (!fresh && sharedPromise) {
      try {
        const data = await sharedPromise;
        setRules(data.rules);
        setCatalog(data);
        setLoading(false);
        return data;
      } catch (err) {
        setError(err);
        setLoading(false);
        return null;
      }
    }
    setLoading(true);
    setError(null);
    sharedPromise = fetchSupervisionAlertRules();
    try {
      const data = await sharedPromise;
      sharedRules = data.rules;
      setRules(data.rules);
      setCatalog(data);
      return data;
    } catch (err) {
      setError(err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);
  const applyRules = useCallback(nextRules => {
    sharedRules = nextRules;
    setRules(nextRules);
    if (catalog) {
      setCatalog({
        ...catalog,
        rules: nextRules
      });
    }
  }, [catalog]);
  return {
    rules,
    catalog,
    loading,
    error,
    reload: () => load(true),
    applyRules
  };
}
export function invalidateSupervisionAlertRulesCache() {
  sharedRules = null;
  sharedPromise = null;
}
