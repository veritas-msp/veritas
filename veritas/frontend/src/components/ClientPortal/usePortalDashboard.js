import { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { mapClientHardwareEquipment } from "../../api/equipment";
import { fetchPortalDashboard } from "../../api/clientPortalTickets";
import { filterBySite } from "../../utils/siteFilterUtils";
import { filterPortalDashboardBySite } from "./portalSiteFilter";
export function usePortalDashboard() {
  const outletContext = useOutletContext() || {};
  const outletDashboard = outletContext.dashboard ?? null;
  const [localDashboard, setLocalDashboard] = useState(null);
  const [loading, setLoading] = useState(!outletDashboard);
  const [error, setError] = useState(null);
  useEffect(() => {
    if (outletDashboard) {
      setLocalDashboard(null);
      setLoading(false);
      setError(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetchPortalDashboard().then(data => {
      if (!cancelled) {
        setLocalDashboard(data);
        setError(null);
      }
    }).catch(err => {
      if (!cancelled) {
        setLocalDashboard(null);
        setError(err);
      }
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [outletDashboard]);
  const dashboard = outletDashboard ?? localDashboard;
  const siteFilter = outletContext.siteFilter || null;
  const scopedDashboard = useMemo(
    () => outletContext.scopedDashboard || filterPortalDashboardBySite(dashboard, siteFilter),
    [outletContext.scopedDashboard, dashboard, siteFilter]
  );
  return {
    dashboard,
    scopedDashboard,
    siteFilter,
    sites: outletContext.sites || [],
    setSiteFilter: outletContext.setSiteFilter,
    activeClientId: outletContext.activeClientId ?? dashboard?.client?.id ?? null,
    loading: outletDashboard ? false : loading,
    error
  };
}
export function mapPortalComputers(dashboard) {
  if (!dashboard?.computers?.length || !dashboard?.client?.id) return [];
  return mapClientHardwareEquipment({
    id: dashboard.client.id,
    name: dashboard.client.name,
    equipements: {
      Ordinateurs: dashboard.computers
    }
  }).filter(eq => eq.type === "Ordinateurs");
}
export function mapPortalComputersForSite(dashboard, siteFilter) {
  return filterBySite(mapPortalComputers(dashboard), siteFilter);
}
