import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { mapClientHardwareEquipment } from "../../api/equipment";
import { fetchPortalDashboard } from "../../api/clientPortalTickets";
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
  return {
    dashboard: outletDashboard ?? localDashboard,
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
