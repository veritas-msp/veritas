import { useState } from "react";
export function useMonitoring() {
  const [monitoringConfig, _setMonitoringConfig] = useState(() => {
    try {
      const raw = localStorage.getItem("monitoring_config");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });
  const [monitoringDataState, _setMonitoringData] = useState(() => {
    try {
      const raw = localStorage.getItem("monitoring_data");
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });
  const setMonitoringConfig = valueOrUpdater => {
    _setMonitoringConfig(prev => {
      const next = typeof valueOrUpdater === "function" ? valueOrUpdater(prev) : valueOrUpdater ?? null;
      if (next === null || next === undefined) {
        localStorage.removeItem("monitoring_config");
      } else {
        try {
          localStorage.setItem("monitoring_config", JSON.stringify(next));
        } catch {}
      }
      return next ?? null;
    });
  };
  const setMonitoringData = valueOrUpdater => {
    _setMonitoringData(prev => {
      const next = typeof valueOrUpdater === "function" ? valueOrUpdater(prev) : valueOrUpdater || {};
      const prevKeys = Object.keys(prev || {});
      const nextKeys = Object.keys(next || {});
      const isReset = nextKeys.length === 0;
      if (!next || Object.keys(next).length === 0) {
        localStorage.removeItem("monitoring_data");
      } else {
        try {
          localStorage.setItem("monitoring_data", JSON.stringify(next));
        } catch {}
      }
      return next || {};
    });
  };
  const monitoringData = monitoringDataState;
  const resetMonitoring = () => {
    console.log("[MonitoringData] resetMonitoring triggered");
    setMonitoringConfig(null);
    setMonitoringData({});
  };
  return {
    monitoringConfig,
    setMonitoringConfig,
    monitoringData,
    setMonitoringData,
    resetMonitoring,
    isIntroForm: !monitoringConfig
  };
}
