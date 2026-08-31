import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";
import styles from "./CheckMKMonitoringModal.module.css";
import CheckMKMonitoringPanel from "../../EquipementPage/CheckMKMonitoringPanel";
import {
  equipmentTypeToFamily,
  getCheckMKAvailability,
  getEquipmentCheckMKMonitoring,
  syncEquipmentCheckMKMonitoring
} from "../../../api/equipment";
import { getCheckmkMapping, getCheckmkSite } from "./checkmkReportCacheUtils";

const CHECKMK_SYNC_MIN_INTERVAL_MS = 30 * 60 * 1000;
const REPORT_MODULE_TO_FAMILY = {
  Internet: "internet",
  Firewall: "firewall",
  Servers: "servers",
  Storage: "stockage",
  Switch: "switch",
  BorneWifi: "wifi",
  TOIP: "toip"
};

function getAvailabilityPeriodRange(periodKey) {
  const endTime = new Date();
  endTime.setHours(23, 59, 59, 999);
  const startTime = new Date(endTime);
  if (periodKey === "1m") startTime.setMonth(startTime.getMonth() - 1);
  else if (periodKey === "3m") startTime.setMonth(startTime.getMonth() - 3);
  else if (periodKey === "1y") startTime.setFullYear(startTime.getFullYear() - 1);
  startTime.setHours(0, 0, 0, 0);
  return { startTime, endTime };
}

function resolveFamily(equipment, moduleKey) {
  return equipmentTypeToFamily(equipment?.type)
    || equipmentTypeToFamily(moduleKey)
    || REPORT_MODULE_TO_FAMILY[moduleKey]
    || null;
}

function openCheckMKService(mapping, service) {
  const hostName = mapping?.checkmk_host_name;
  if (!hostName) return;
  const serviceDescription = service?.description || (service?.id && service.id.includes(":") ? service.id.split(":").slice(1).join(":") : null) || service?.title || service?.name || null;
  if (!serviceDescription) return;
  const params = new URLSearchParams({
    view_name: "service",
    host: hostName,
    service: serviceDescription
  });
  window.open(`https://monitoring.psi.fr/clients/check_mk/view.py?${params}`, "_blank", "noopener");
}

function openCheckMKEvent(mapping, event) {
  const hostName = event?.host ?? event?.log_host ?? mapping?.checkmk_host_name;
  if (!hostName) return;
  const serviceDescription = event?.service ?? event?.log_service_description ?? null;
  const params = new URLSearchParams(
    serviceDescription
      ? { view_name: "service", host: hostName, service: serviceDescription }
      : { view_name: "host", host: hostName }
  );
  window.open(`https://monitoring.psi.fr/clients/check_mk/view.py?${params}`, "_blank", "noopener");
}

export default function CheckMKMonitoringModal({
  isOpen,
  onClose,
  equipment,
  moduleKey = null,
  clientId = null,
  onRefresh = null,
  refreshing = false
}) {
  const equipmentName = equipment?.nom || equipment?.name || equipment?.logiciel || "Équipement";
  const equipmentId = equipment?.id ?? equipment?.uuid ?? null;
  const resolvedClientId = clientId ?? equipment?.clientId ?? equipment?.client_id ?? null;
  const [checkmkMapping, setCheckmkMapping] = useState(() => getCheckmkMapping(equipment));
  const [checkmkData, setCheckmkData] = useState(null);
  const [checkmkHostDetails, setCheckmkHostDetails] = useState(null);
  const [loadingCheckMK, setLoadingCheckMK] = useState(false);
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  const [checkmkAvailabilityPeriod, setCheckmkAvailabilityPeriod] = useState("1m");
  const [error, setError] = useState(null);
  const controllerRef = useRef(null);
  const availabilityPeriodRef = useRef(checkmkAvailabilityPeriod);
  availabilityPeriodRef.current = checkmkAvailabilityPeriod;

  const applyPayload = useCallback((payload, periodKey = availabilityPeriodRef.current) => {
    if (!payload) return;
    const availabilityByPeriod = payload.availabilityByPeriod || payload.checkmkData?.availabilityByPeriod || {};
    const availability = availabilityByPeriod[periodKey] ?? payload.checkmkData?.availability ?? null;
    if (payload.checkmkData) {
      setCheckmkData({
        ...payload.checkmkData,
        availability,
        availabilityByPeriod
      });
    }
    if (payload.hostDetails) setCheckmkHostDetails(payload.hostDetails);
    const storedHost = payload.checkmkHostName || payload.checkmk_host_name || payload.hostDetails?.hostName;
    if (storedHost) {
      setCheckmkMapping(prev => ({
        is_active: true,
        ...prev,
        checkmk_host_name: storedHost,
        checkmk_site: payload.checkmkSite ?? payload.checkmk_site ?? prev?.checkmk_site ?? null
      }));
    }
  }, []);

  const loadCheckMKData = useCallback(async ({ force = false } = {}) => {
    const mapping = getCheckmkMapping(equipment);
    const hostName = mapping?.checkmk_host_name;
    const family = resolveFamily(equipment, moduleKey);
    if (!equipmentId) return;
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setLoadingCheckMK(true);
    setError(null);
    try {
      const fetchOptions = { signal: controller.signal };
      const stored = await getEquipmentCheckMKMonitoring(equipmentId, availabilityPeriodRef.current, fetchOptions).catch(err => {
        if (err?.name === "AbortError") throw err;
        return null;
      });
      if (controller.signal.aborted) return;
      if (stored?.checkmkData) applyPayload(stored);
      const resolvedHost = hostName || stored?.checkmkHostName || stored?.checkmk_host_name;
      const shouldSync = Boolean(resolvedHost && resolvedClientId && family) && (
        force || !stored?.lastSyncedAt || Date.now() - new Date(stored.lastSyncedAt).getTime() >= CHECKMK_SYNC_MIN_INTERVAL_MS
      );
      if (shouldSync) {
        const synced = await syncEquipmentCheckMKMonitoring({
          equipmentId,
          clientId: resolvedClientId,
          family,
          hostName: resolvedHost,
          site: mapping?.checkmk_site || getCheckmkSite(equipment) || stored?.checkmkSite || null,
          force,
          availabilityPeriod: availabilityPeriodRef.current
        }, fetchOptions).catch(err => {
          if (err?.name === "AbortError") throw err;
          return null;
        });
        if (controller.signal.aborted) return;
        if (synced?.checkmkData) applyPayload(synced);
      }
    } catch (err) {
      if (err?.name === "AbortError") return;
      setError(err?.message || "Impossible de charger la supervision.");
    } finally {
      if (!controller.signal.aborted) setLoadingCheckMK(false);
    }
  }, [applyPayload, equipment, equipmentId, moduleKey, resolvedClientId]);

  useEffect(() => {
    if (!isOpen || !equipment) return undefined;
    setCheckmkMapping(getCheckmkMapping(equipment));
    setCheckmkData(null);
    setCheckmkHostDetails(null);
    setError(null);
    setCheckmkAvailabilityPeriod("1m");
    void loadCheckMKData({ force: false });
    return () => {
      controllerRef.current?.abort();
    };
    // Reload when a different equipment is opened.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, equipmentId]);

  const handleAvailabilityPeriodChange = async periodKey => {
    setCheckmkAvailabilityPeriod(periodKey);
    const mapping = checkmkMapping || getCheckmkMapping(equipment);
    if (!mapping?.checkmk_host_name || !checkmkData) {
      await loadCheckMKData({ force: false });
      return;
    }
    setLoadingAvailability(true);
    try {
      const { startTime, endTime } = getAvailabilityPeriodRange(periodKey);
      const stored = await getEquipmentCheckMKMonitoring(equipmentId, periodKey).catch(() => null);
      let availability = stored?.availabilityByPeriod?.[periodKey] ?? stored?.checkmkData?.availability ?? null;
      if (availability == null) {
        const availRes = await getCheckMKAvailability(
          mapping.checkmk_host_name,
          mapping.checkmk_site || null,
          startTime.toISOString(),
          endTime.toISOString()
        ).catch(() => null);
        availability = availRes?.availability ?? availRes ?? null;
      }
      const prevByPeriod = checkmkData?.availabilityByPeriod || {};
      setCheckmkData({
        ...checkmkData,
        availability,
        availabilityByPeriod: {
          ...prevByPeriod,
          [periodKey]: availability
        }
      });
    } finally {
      setLoadingAvailability(false);
    }
  };

  const handleRefresh = async () => {
    if (typeof onRefresh === "function") {
      try {
        await onRefresh();
      } catch {
        // Report-period cache refresh is optional; the panel loads live supervision below.
      }
    }
    await loadCheckMKData({ force: true });
  };

  const mapping = checkmkMapping || getCheckmkMapping(equipment);

  if (!isOpen) return null;

  const content = (
    <div className={styles.overlay} onClick={() => onClose?.()}>
      <div className={`${styles.modal} ${styles.modalWide}`} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="checkmk-modal-title">
        <div className={styles.header}>
          <div className={styles.headerTitleBlock}>
            <h2 id="checkmk-modal-title" className={styles.title}>
              <Icon icon="simple-icons:checkmk" className={styles.titleIcon} />
              {equipmentName}
            </h2>
            <div className={styles.period}>{mapping?.checkmk_host_name || "CheckMK"}</div>
          </div>
          <div className={styles.headerActions}>
            <button
              type="button"
              className={styles.refreshBtn}
              onClick={handleRefresh}
              disabled={refreshing || loadingCheckMK}
              title="Actualiser CheckMK"
              aria-label="Actualiser CheckMK"
            >
              <Icon icon="mdi:refresh" width={18} height={18} className={refreshing || loadingCheckMK ? styles.refreshSpinning : undefined} />
            </button>
            <button type="button" className={styles.closeBtn} onClick={onClose} title="Fermer" aria-label="Fermer">
              ×
            </button>
          </div>
        </div>
        <div className={`${styles.body} ${styles.bodyPanel}`}>
          {error ? <div className={styles.infoNotice}>{error}</div> : null}
          <CheckMKMonitoringPanel
            equipment={equipment}
            checkmkMapping={mapping}
            checkmkData={checkmkData}
            checkmkHostDetails={checkmkHostDetails}
            loadingCheckMK={loadingCheckMK}
            loadingAvailability={loadingAvailability}
            checkmkAvailabilityPeriod={checkmkAvailabilityPeriod}
            layout="tab"
            onAvailabilityPeriodChange={handleAvailabilityPeriodChange}
            onOpenService={service => openCheckMKService(mapping, service)}
            onOpenEvent={event => openCheckMKEvent(mapping, event)}
          />
        </div>
      </div>
    </div>
  );
  return createPortal(content, document.body);
}
