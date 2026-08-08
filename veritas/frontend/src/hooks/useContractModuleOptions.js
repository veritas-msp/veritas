import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchContractModuleOptions } from "../api/contractModuleOptions";
import { FALLBACK_CONTRACT_MODULES } from "../constants/contractModules";
export function useContractModuleOptions({
  includeDisabled = false
} = {}) {
  const [modules, setModules] = useState(FALLBACK_CONTRACT_MODULES);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchContractModuleOptions({
        includeDisabled
      });
      setModules(data.modules?.length ? data.modules : FALLBACK_CONTRACT_MODULES);
    } catch {
      setModules(FALLBACK_CONTRACT_MODULES);
    } finally {
      setLoading(false);
    }
  }, [includeDisabled]);
  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => {
    const onUpdated = () => load();
    window.addEventListener("contractModuleOptionsUpdated", onUpdated);
    return () => window.removeEventListener("contractModuleOptionsUpdated", onUpdated);
  }, [load]);
  const enabledModules = useMemo(() => modules.filter(m => m.enabled !== false), [modules]);
  return {
    modules,
    enabledModules,
    loading,
    reload: load
  };
}
