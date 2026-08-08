import { createContext, useContext, useState, useMemo } from "react";
import { useMonitoring } from "../hooks/useMonitoring";
export const MonitoringContext = createContext(null);
export const useMonitoringContext = () => useContext(MonitoringContext);
export function MonitoringProvider({
  children,
  refreshDraftStatus
}) {
  const monitoring = useMonitoring();
  const resetComplet = async () => {
    const userId = localStorage.getItem("id");
    try {
      const response = await fetch(`${process.env.REACT_APP_API_BASE_URL}/api/drafts`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          user_id: userId,
          type: "monitoring"
        })
      });
      if (!response.ok) throw new Error("Deletion failed");
      monitoring.setMonitoringConfig(null);
      monitoring.setMonitoringData({});
      if (refreshDraftStatus) await refreshDraftStatus();
      window.dispatchEvent(new CustomEvent('draftDeleted', {
        detail: {
          type: "monitoring"
        }
      }));
    } catch (err) {
      console.error("Error reset monitoring:", err);
    }
  };
  const value = {
    ...monitoring,
    refreshDraftStatus,
    resetComplet
  };
  return <MonitoringContext.Provider value={value}>
      {children}
    </MonitoringContext.Provider>;
}
export function EphemeralMonitoringProvider({
  children,
  initialConfig = null,
  initialData = null,
  refreshDraftStatus = null
}) {
  const [monitoringConfig, setMonitoringConfig] = useState(initialConfig);
  const [monitoringData, setMonitoringData] = useState(initialData || {});
  const resetComplet = async () => {
    setMonitoringConfig(null);
    setMonitoringData({});
  };
  const value = useMemo(() => ({
    monitoringConfig,
    setMonitoringConfig,
    monitoringData,
    setMonitoringData,
    refreshDraftStatus,
    resetComplet,
    resetMonitoring: resetComplet,
    isIntroForm: !monitoringConfig
  }), [monitoringConfig, monitoringData, refreshDraftStatus]);
  return <MonitoringContext.Provider value={value}>
      {children}
    </MonitoringContext.Provider>;
}
