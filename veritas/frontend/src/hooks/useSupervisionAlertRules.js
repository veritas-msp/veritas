import { useCallback, useEffect, useState } from "react";
import { fetchSupervisionAlertRules } from "../api/supervisionAlertRules";
import {
  buildDefaultMonitoringAlertRules,
  normalizeRulesTree
} from "../components/EquipementPage/supervisionAlertRulesConfig";

let sharedRules = null;
let sharedCatalog = null;
let sharedPromise = null;

function normalizePayload(data) {
  const catalog = data && typeof data === "object" ? data : {};
  const rules = normalizeRulesTree(catalog.rules, catalog.criteria, catalog.families);
  return {
    ...catalog,
    rules
  };
}

export function useSupervisionAlertRules() {
  const [rules, setRules] = useState(sharedRules || buildDefaultMonitoringAlertRules());
  const [catalog, setCatalog] = useState(sharedCatalog);
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
    sharedPromise = fetchSupervisionAlertRules().then(normalizePayload);
    try {
      const data = await sharedPromise;
      sharedRules = data.rules;
      sharedCatalog = data;
      setRules(data.rules);
      setCatalog(data);
      return data;
    } catch (err) {
      sharedPromise = null;
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
    const normalized = normalizeRulesTree(nextRules, sharedCatalog?.criteria, sharedCatalog?.families);
    sharedRules = normalized;
    setRules(normalized);
    setCatalog(prev => {
      const next = prev
        ? { ...prev, rules: normalized }
        : sharedCatalog
          ? { ...sharedCatalog, rules: normalized }
          : null;
      sharedCatalog = next;
      return next;
    });
  }, []);

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
  sharedCatalog = null;
  sharedPromise = null;
}
