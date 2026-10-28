import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";
import { FaTimes } from "react-icons/fa";
import CheckMKMonitoringPanel from "../../EquipementPage/CheckMKMonitoringPanel";
import formStyles from "../../EnterprisesPage/EnterpriseFormModal.module.css";
import checkmkStyles from "../../AdminPage/CheckmkIntegrationModal.module.css";
import {
  equipmentTypeToFamily,
  getCheckMKAvailability,
  getEquipmentCheckMKMonitoring,
  syncEquipmentCheckMKMonitoring
} from "../../../api/equipment";
import { useCheckMKIntegrationEnabled } from "../../../hooks/useCheckMKIntegrationEnabled";
import { getCheckmkMapping, getCheckmkSite } from "./checkmkReportCacheUtils";
import styles from "./CheckMKMonitoringModal.module.css";

const FALLBACK_SYNC_MIN_INTERVAL_MS = 30 * 60 * 1000;
const REPORT_MODULE_TO_FAMILY = {
  Internet: "internet",
  Firewall: "firewall",
  Servers: "servers",
  Storage: "stockage",
  Switch: "switch",
  BorneWifi: "wifi",
  TOIP: "toip"
};

const SECTIONS = [
  {
    id: "services",
    icon: "mdi:server-network",
    label: "Services",
    description: "Services monitorés CheckMK"
  },
  {
    id: "events",
    icon: "mdi:bell-ring-outline",
    label: "Événements",
    description: "Centre & historique CheckMK"
  }
];

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
  return (
    equipmentTypeToFamily(equipment?.type) ||
    equipmentTypeToFamily(moduleKey) ||
    REPORT_MODULE_TO_FAMILY[moduleKey] ||
    null
  );
}

function openCheckMKService(mapping, service) {
  const hostName = mapping?.checkmk_host_name;
  if (!hostName) return;
  const serviceDescription =
    service?.description ||
    (service?.id && service.id.includes(":") ? service.id.split(":").slice(1).join(":") : null) ||
    service?.title ||
    service?.name ||
    null;
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
  const { syncIntervalMs: checkmkSyncIntervalMs, syncSuspended: checkmkSyncSuspended } =
    useCheckMKIntegrationEnabled();

  const [activeSection, setActiveSection] = useState("services");
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

  const mapping = checkmkMapping || getCheckmkMapping(equipment);
  const hostLabel = useMemo(
    () =>
      checkmkHostDetails?.hostName ||
      checkmkHostDetails?.title ||
      mapping?.checkmk_host_name ||
      "Non mappé",
    [checkmkHostDetails, mapping]
  );

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

  const loadCheckMKData = useCallback(
    async ({ force = false } = {}) => {
      const currentMapping = getCheckmkMapping(equipment);
      const hostName = currentMapping?.checkmk_host_name;
      const family = resolveFamily(equipment, moduleKey);
      if (!equipmentId) return;
      controllerRef.current?.abort();
      const controller = new AbortController();
      controllerRef.current = controller;
      setLoadingCheckMK(true);
      setError(null);
      try {
        const fetchOptions = { signal: controller.signal };
        const stored = await getEquipmentCheckMKMonitoring(
          equipmentId,
          availabilityPeriodRef.current,
          fetchOptions
        ).catch(err => {
          if (err?.name === "AbortError") throw err;
          return null;
        });
        if (controller.signal.aborted) return;
        if (stored?.checkmkData) applyPayload(stored);
        const resolvedHost = hostName || stored?.checkmkHostName || stored?.checkmk_host_name;
        const syncMinIntervalMs =
          Number.isFinite(checkmkSyncIntervalMs) && checkmkSyncIntervalMs > 0
            ? checkmkSyncIntervalMs
            : FALLBACK_SYNC_MIN_INTERVAL_MS;
        const shouldSync =
          Boolean(resolvedHost && resolvedClientId && family) &&
          (force ||
            (!checkmkSyncSuspended &&
              (!stored?.lastSyncedAt ||
                Date.now() - new Date(stored.lastSyncedAt).getTime() >= syncMinIntervalMs)));
        if (shouldSync) {
          let synced;
          try {
            synced = await syncEquipmentCheckMKMonitoring(
              {
                equipmentId,
                clientId: resolvedClientId,
                family,
                hostName: resolvedHost,
                site:
                  currentMapping?.checkmk_site ||
                  getCheckmkSite(equipment) ||
                  stored?.checkmkSite ||
                  null,
                force,
                availabilityPeriod: availabilityPeriodRef.current
              },
              fetchOptions
            );
          } catch (err) {
            if (err?.name === "AbortError") throw err;
            if (force) setError(err?.message || "Impossible d'actualiser CheckMK.");
            return;
          }
          if (controller.signal.aborted) return;
          if (synced?.checkmkData || synced?.lastSyncedAt) applyPayload(synced);
        }
      } catch (err) {
        if (err?.name === "AbortError") return;
        setError(err?.message || "Impossible de charger la supervision.");
      } finally {
        if (!controller.signal.aborted) setLoadingCheckMK(false);
      }
    },
    [
      applyPayload,
      checkmkSyncIntervalMs,
      checkmkSyncSuspended,
      equipment,
      equipmentId,
      moduleKey,
      resolvedClientId
    ]
  );

  useEffect(() => {
    if (!isOpen || !equipment) return undefined;
    setActiveSection("services");
    setCheckmkMapping(getCheckmkMapping(equipment));
    setCheckmkData(null);
    setCheckmkHostDetails(null);
    setError(null);
    setCheckmkAvailabilityPeriod("1m");
    void loadCheckMKData({ force: false });
    return () => {
      controllerRef.current?.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, equipmentId]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const onKeyDown = event => {
      if (event.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  const handleAvailabilityPeriodChange = async periodKey => {
    setCheckmkAvailabilityPeriod(periodKey);
    const currentMapping = checkmkMapping || getCheckmkMapping(equipment);
    if (!currentMapping?.checkmk_host_name || !checkmkData) {
      await loadCheckMKData({ force: false });
      return;
    }
    setLoadingAvailability(true);
    try {
      const { startTime, endTime } = getAvailabilityPeriodRange(periodKey);
      const stored = await getEquipmentCheckMKMonitoring(equipmentId, periodKey).catch(() => null);
      let availability =
        stored?.availabilityByPeriod?.[periodKey] ?? stored?.checkmkData?.availability ?? null;
      if (availability == null) {
        const availRes = await getCheckMKAvailability(
          currentMapping.checkmk_host_name,
          currentMapping.checkmk_site || null,
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
        // optional report cache refresh
      }
    }
    await loadCheckMKData({ force: true });
  };

  if (!isOpen) return null;

  const busy = refreshing || loadingCheckMK;

  const content = (
    <div
      className={formStyles.overlay}
      onClick={() => (busy ? undefined : onClose?.())}
      role="presentation"
    >
      <div
        className={`${formStyles.shell} ${formStyles.shellBackup} ${styles.shell}`}
        onClick={event => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="checkmk-modal-title"
      >
        <div className={checkmkStyles.accentBarCheckmk} aria-hidden />

        <header className={formStyles.header}>
          <div className={formStyles.headerMain}>
            <div
              className={`${formStyles.headerIconWrap} ${checkmkStyles.headerIconCheckmk}`}
              aria-hidden
            >
              <Icon icon="simple-icons:checkmk" />
            </div>
            <div className={formStyles.headerText}>
              <p className={formStyles.eyebrow}>Supervision CheckMK</p>
              <h2 id="checkmk-modal-title" className={formStyles.title}>
                {equipmentName}
              </h2>
              <p className={formStyles.subtitle}>
                {hostLabel}
                {mapping?.checkmk_site ? ` · site ${mapping.checkmk_site}` : ""}
              </p>
            </div>
          </div>
          <div className={formStyles.headerTrailing}>
            <button
              type="button"
              className={styles.headerIconBtn}
              onClick={handleRefresh}
              disabled={busy}
              title="Actualiser CheckMK"
              aria-label="Actualiser CheckMK"
            >
              <Icon
                icon="mdi:refresh"
                width={18}
                height={18}
                className={busy ? styles.refreshSpinning : undefined}
              />
            </button>
            <button
              type="button"
              className={styles.headerIconBtn}
              onClick={onClose}
              aria-label="Fermer"
            >
              <FaTimes />
            </button>
          </div>
        </header>

        <div className={formStyles.body}>
          <nav className={formStyles.nav} aria-label="Sections supervision">
            {SECTIONS.map(section => (
              <button
                key={section.id}
                type="button"
                className={`${formStyles.navItem} ${
                  activeSection === section.id ? formStyles.navItemActive : ""
                }`}
                onClick={() => setActiveSection(section.id)}
                aria-current={activeSection === section.id ? "step" : undefined}
              >
                <Icon icon={section.icon} className={formStyles.navItemIcon} aria-hidden />
                <span className={formStyles.navItemText}>
                  <span className={formStyles.navItemLabel}>{section.label}</span>
                  <span className={formStyles.navItemHint}>{section.description}</span>
                </span>
              </button>
            ))}
          </nav>

          <div className={`${formStyles.content} ${styles.content}`}>
            {error ? <div className={styles.errorBanner}>{error}</div> : null}
            <div className={styles.panelHost} key={activeSection}>
              <CheckMKMonitoringPanel
                equipment={equipment}
                checkmkMapping={mapping}
                checkmkData={checkmkData}
                checkmkHostDetails={checkmkHostDetails}
                loadingCheckMK={loadingCheckMK}
                loadingAvailability={loadingAvailability}
                checkmkAvailabilityPeriod={checkmkAvailabilityPeriod}
                layout="report"
                section={activeSection}
                onAvailabilityPeriodChange={handleAvailabilityPeriodChange}
                onOpenService={service => openCheckMKService(mapping, service)}
                onOpenEvent={event => openCheckMKEvent(mapping, event)}
              />
            </div>
          </div>
        </div>

        <footer className={formStyles.footer}>
          <span className={formStyles.footerHint}>
            Services monitorés et événements de supervision
          </span>
          <div className={formStyles.footerActions}>
            <button
              type="button"
              className={formStyles.ghostBtn}
              onClick={onClose}
            >
              Fermer
            </button>
            <button
              type="button"
              className={formStyles.primaryBtn}
              onClick={handleRefresh}
              disabled={busy}
            >
              <Icon
                icon={busy ? "mdi:loading" : "mdi:refresh"}
                className={busy ? formStyles.spinning : ""}
                aria-hidden
              />
              {busy ? "Actualisation…" : "Actualiser"}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );

  return createPortal(content, document.getElementById("modal-root") || document.body);
}
