import React, { useState, useEffect, useLayoutEffect, useRef, useMemo, useCallback } from "react";
import { Icon } from "@iconify/react";
import { toast } from 'react-toastify';
import { FaTimes, FaPlus, FaCamera } from "react-icons/fa";
import styles from "./EquipmentDetailPage.module.css";
import enterpriseDetailStyles from "../EnterprisesPage/EnterpriseDetailPage.module.css";
import SmartTooltip from "../SmartTooltip";
import { useEntitySubscription } from "../../hooks/useEntitySubscription";
import EquipmentFormModal from "./EquipmentFormModal";
import CustomEquipmentModal from "../EnterprisesPage/CustomEquipmentModal";
import { fetchClientGeneral, fetchClientCustomEquipment } from "../../api/clients";
import { normalizeClientSites, findClientSiteByLocation, getSiteDisplayName } from "../../utils/clientSites";
import { updateEquipment, getCheckMKAvailability, getClientHardwareEquipment, getEquipmentLogs, purgeEquipmentLogs, equipmentTypeToFamily, getEquipmentCheckMKMonitoring, syncEquipmentCheckMKMonitoring, fetchEquipmentTags, addEquipmentTag, removeEquipmentTag } from "../../api/equipment";
import { requestRmmAgentSync, cancelRmmAgentSync, requestRmmAgentUpdate, cancelRmmAgentUpdate, requestRmmAgentHeartbeat, fetchRmmAgents } from "../../api/rmm";
import ClientTagModal from "../EnterprisesPage/ClientTagModal";
import EquipmentMappingModal from "./EquipmentMappingModal";
import CheckMKMonitoringPanel from "./CheckMKMonitoringPanel";
import RmmMonitoringPanel, { RmmSyncPendingNotice, RmmCollectionStatusLine } from "./RmmMonitoringPanel";
import RmmAgentUpdateStatus from "./RmmAgentUpdateStatus";
import RmmMetricHistoryPanel from "./RmmMetricHistoryPanel";
import EquipmentAlertSuspensionModal from "./EquipmentAlertSuspensionModal";
import SupervisionMaintenanceModal from "./SupervisionMaintenanceModal";
import EquipmentMaintenanceHistoryPanel from "./EquipmentMaintenanceHistoryPanel";
import { useEquipmentAlertSettings } from "./useEquipmentAlertSettings";
import { resolveEquipmentFamilyForAlerts, updateEquipmentAlertSuspension } from "../../api/equipmentMonitoringAlerts";
import {
  createSupervisionExclusion,
  deleteSupervisionExclusion,
  fetchSupervisionExclusions
} from "../../api/supervisionAlerts";
import { getSupervisionCenterCopy } from "./supervisionCenterPageI18n";
import { useTheme } from "../../hooks/useTheme";
import PlanningEventModalBridge from "../PlanningPage/PlanningEventModalBridge";
import EquipmentDetailSpecsPanel from "./EquipmentDetailSpecsPanel";
import EquipmentAlertsGlance from "./EquipmentAlertsGlance";
import EquipmentOverviewDashboard from "./EquipmentOverviewDashboard";
import EquipmentDetailAside from "./EquipmentDetailAside";
import { resolveEquipmentRemoteAccessAction } from "./equipmentDetailRemoteAccess";
import EquipmentDocumentsPanel from "./EquipmentDocumentsPanel";
import EquipmentEmptyState from "./EquipmentEmptyState";
import EquipmentEventsPanel from "./EquipmentEventsPanel";
import EquipmentStatsPanel from "./EquipmentStatsPanel";
import { fetchEquipmentActivity } from "../../api/equipmentActivity";
import { resolveEquipmentActivityRange, toDateInputValue } from "./equipmentActivityUtils";
import { buildDetailFormData } from "./equipmentDetailConfig";
import { resolveClientWifiSsidCatalog } from "./wifiApSsidUtils";
import useSystemFamilyExtensions from "../../hooks/useSystemFamilyExtensions";
import { patchEquipmentWithSharedFields } from "./sharedEquipmentFields";
import {
  formatAlertSettingsDateTime,
  getEquipmentDetailTypeLabel,
  getEquipmentDetailCopy,
  formatEquipmentDetailRelative,
  getEquipmentCreatedAt
} from "./equipmentDetailPageI18n";
import { canonicalizeComputerType, patchEquipmentLocation, readEquipmentIsActive } from "./equipmentFormConfig";
import { ConfirmModal } from "../AdminPage/AdminUi";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { getLocaleTag } from "../../i18n/locales";
import { getEquipmentModalsCopy, interpolate } from "./equipmentModalsI18n";
import {
  normalizeCheckMKEquipmentType,
  resolveEquipmentCheckmkMapping
} from "./CheckMKMonitoringStatusBadge";
import API_BASE_URL from "../../config";
import { isSynologyBrand, buildQuickConnectUrl } from "./synologyEquipmentUtils";
import { getLogActionDetails } from "./equipmentLogUtils";
import EquipmentLogDetailModal from "./EquipmentLogDetailModal";
import { useCheckMKIntegrationEnabled } from "../../hooks/useCheckMKIntegrationEnabled";
import { useVeritasEdition } from "../../hooks/useVeritasEdition";
import ProFeatureBadge from "../Misc/ProFeature/ProFeatureBadge";
import ProFeaturePromoModal from "../Misc/ProFeature/ProFeaturePromoModal";
import { notifyProFeature, setProFeaturePromoHandler } from "../Misc/ProFeature/proFeatureUtils";
import { findEquipmentInList, getEquipmentClientId, getEquipmentDbId as resolveEquipmentDbId, getEquipmentListKey, equipmentNeedsHydration } from "../../utils/equipmentIdentity";
import { getClientNumber, getClientNameWithoutCode } from "../../utils/clientDisplay";
import { getFleetFamilyIcon } from "../../utils/equipmentFamilyStats";
import StatusDot from "../shared/StatusDot/StatusDot";
import {
  getRmmAgentId,
  getRmmAgentVersion,
  buildRmmAgentRowFromEquipment,
  getRmmSyncRequestedAt,
  isRmmManagedEquipment,
  patchEquipmentRmmSyncRequest,
  resolveRmmSyncRequestState,
  rmmSyncTimestampsMatch,
  formatRmmExpectedCollectionLabel,
  resolveRmmHeartbeatIntervalMinutes,
  agentSupportsImmediateFullSync,
  getRmmInventoryFromEquipment,
  getRmmOsEditionInfo,
  getRmmChassisInfo,
  resolveRmmAgentOnline
} from "./rmmMonitoringUtils";
import { computeRmmDeviceHealth } from "./rmmDeviceHealthUtils";
import { ScoreAside } from "./RmmDeviceScore";
import { fetchEquipmentFamilies, mapCustomEquipmentItem, parseCustomFamilyType } from "../../api/equipmentFamilies";
import { createTrackedAbortController } from "../../utils/pageLoadAbort";
import {
  DETAIL_CACHE_NS,
  getDetailCache,
  setDetailCache
} from "../../utils/detailPageCache";
import {
  normalizeEquipmentActivityPane,
  normalizeEquipmentDetailTab,
  normalizeEquipmentSupervisionPane,
  readEquipmentDetailUi,
  writeEquipmentDetailUi
} from "../../utils/equipmentDetailUiState";
const CheckMKMappingModal = EquipmentMappingModal;

export default function EquipmentDetailPage({
  equipment,
  onBack,
  onUpdate,
  onNavigate,
  onNavigateToEquipment
}) {
  const locale = useAppLocale();
  const { fields: systemExtensionFields } = useSystemFamilyExtensions(equipment?.type);
  const modalsCopy = useMemo(() => getEquipmentModalsCopy(locale), [locale]);
  const copy = useMemo(() => getEquipmentDetailCopy(locale), [locale]);
  const {
    theme
  } = useTheme();
  const {
    isCommunity
  } = useVeritasEdition();
  const {
    enabled: checkmkIntegrationEnabled,
    syncIntervalMs: checkmkSyncIntervalMs,
    syncSuspended: checkmkSyncSuspended
  } = useCheckMKIntegrationEnabled();
  const resolvedEquipmentId = resolveEquipmentDbId(equipment);
  const initialEquipmentUi = useMemo(
    () => readEquipmentDetailUi(resolvedEquipmentId),
    [resolvedEquipmentId]
  );
  const initialEquipmentCache = useMemo(() => {
    if (!resolvedEquipmentId) return null;
    return getDetailCache(DETAIL_CACHE_NS.equipment, resolvedEquipmentId);
  }, [resolvedEquipmentId]);
  const [isEditingInfo, setIsEditingInfo] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [photos, setPhotos] = useState([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [loadingPhotos, setLoadingPhotos] = useState(true);
  const [checkmkMappingModal, setCheckmkMappingModal] = useState(false);
  const [checkmkDebugModal, setCheckmkDebugModal] = useState(false);
  const [checkmkData, setCheckmkData] = useState(() => initialEquipmentCache?.checkmkData ?? null);
  const [checkmkHostDetails, setCheckmkHostDetails] = useState(null);
  const [loadingCheckMK, setLoadingCheckMK] = useState(false);
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  const [checkmkMapping, setCheckmkMapping] = useState(
    () => initialEquipmentCache?.checkmkMapping || equipment?.checkmkMapping || null
  );
  const [checkmkLastSyncedAt, setCheckmkLastSyncedAt] = useState(null);
  const [checkmkPeriod, setCheckmkPeriod] = useState(null);
  const [checkmkAvailabilityPeriod, setCheckmkAvailabilityPeriod] = useState('1m');
  const [eventModalOpen, setEventModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [photoModalOpen, setPhotoModalOpen] = useState(false);
  const [selectedLogDetail, setSelectedLogDetail] = useState(null);
  const [equipmentTags, setEquipmentTags] = useState(() =>
    Array.isArray(initialEquipmentCache?.tags) ? initialEquipmentCache.tags : []
  );
  const [loadingEquipmentTags, setLoadingEquipmentTags] = useState(
    () => !Array.isArray(initialEquipmentCache?.tags)
  );
  const [equipmentTagModalOpen, setEquipmentTagModalOpen] = useState(false);
  const [addingEquipmentTag, setAddingEquipmentTag] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editModalOpening, setEditModalOpening] = useState(false);
  const [customEditFamily, setCustomEditFamily] = useState(null);
  const [alertModalOpen, setAlertModalOpen] = useState(false);
  const [maintenanceModalOpen, setMaintenanceModalOpen] = useState(false);
  const [maintenanceBusy, setMaintenanceBusy] = useState(false);
  const [endMaintenanceOpen, setEndMaintenanceOpen] = useState(false);
  const [activeMaintenance, setActiveMaintenance] = useState(null);
  const [maintenanceHistoryKey, setMaintenanceHistoryKey] = useState(0);
  const [proPromoFeature, setProPromoFeature] = useState(null);
  const [modalClient, setModalClient] = useState(null);
  const [clientSites, setClientSites] = useState([]);
  const [clientSsids, setClientSsids] = useState([]);
  const [peerFirewalls, setPeerFirewalls] = useState([]);
  const [peerServers, setPeerServers] = useState([]);
  const [peerStorage, setPeerStorage] = useState([]);
  const [peerBorneWifi, setPeerBorneWifi] = useState([]);
  const [rmmSyncRequesting, setRmmSyncRequesting] = useState(false);
  const [rmmUpdateRequesting, setRmmUpdateRequesting] = useState(false);
  const [rmmUpdateRequestedAt, setRmmUpdateRequestedAt] = useState(null);
  const [rmmUpdateTargetVersion, setRmmUpdateTargetVersion] = useState(null);
  const [lunsModalOpen, setLunsModalOpen] = useState(false);
  const [licencesModalOpen, setLicensesModalOpen] = useState(false);
  const [availableSites, setAvailableSites] = useState([]);
  const [logs, setLogs] = useState(() =>
    Array.isArray(initialEquipmentCache?.logs) ? initialEquipmentCache.logs : []
  );
  const [loadingLogs, setLoadingLogs] = useState(() => !Array.isArray(initialEquipmentCache?.logs));
  const [logsPage, setLogsPage] = useState(() => Number(initialEquipmentCache?.logsPage) || 1);
  const [activity, setActivity] = useState(() => initialEquipmentCache?.activity ?? null);
  const [loadingActivity, setLoadingActivity] = useState(() => !initialEquipmentCache?.activity);
  const [activityDatePreset, setActivityDatePreset] = useState(
    () => initialEquipmentUi?.activityDatePreset || "30d"
  );
  const [activityCustomStart, setActivityCustomStart] = useState("");
  const [activityCustomEnd, setActivityCustomEnd] = useState(toDateInputValue(new Date()));
  const activityControllerRef = useRef(null);
  const lastActivityFetchKeyRef = useRef(null);
  const [globalSSIDs, setGlobalSSIDs] = useState([]);
  const [loadingSSIDs, setLoadingSSIDs] = useState(false);
  const [logsTotal, setLogsTotal] = useState(() => Number(initialEquipmentCache?.logsTotal) || 0);
  const [logsSearchDraft, setLogsSearchDraft] = useState("");
  const [logsSearch, setLogsSearch] = useState("");
  const [logsCategory, setLogsCategory] = useState(() => initialEquipmentUi?.logsCategory || "all");
  const [purgeLogsConfirmOpen, setPurgeLogsConfirmOpen] = useState(false);
  const [purgingLogs, setPurgingLogs] = useState(false);
  const logsLimit = 25;
  const LOG_FILTER_OPTIONS = useMemo(() => [{
    value: "all",
    label: copy.logs.filters.all
  }, {
    value: "user",
    label: copy.logs.filters.user
  }, {
    value: "modifications",
    label: copy.logs.filters.modifications
  }, {
    value: "rmm",
    label: copy.logs.filters.rmm
  }, {
    value: "remote",
    label: copy.logs.filters.remote
  }], [copy]);
  const [rightPanelTab, setRightPanelTab] = useState(() =>
    normalizeEquipmentDetailTab(
      equipment?.detailTab === "metrics"
        ? "activity"
        : initialEquipmentUi?.rightPanelTab
    )
  );
  const [activityPane, setActivityPane] = useState(() =>
    normalizeEquipmentActivityPane(
      equipment?.detailTab === "metrics"
        ? "metrics"
        : initialEquipmentUi?.activityPane,
      { allowMetrics: true }
    )
  );
  const [supervisionPane, setSupervisionPane] = useState(() =>
    normalizeEquipmentSupervisionPane(
      initialEquipmentUi?.rightPanelTab === "history" || initialEquipmentUi?.rightPanelTab === "maintenance"
        ? "history"
        : initialEquipmentUi?.supervisionPane
    )
  );
  const logsControllerRef = useRef(null);
  const checkmkControllerRef = useRef(null);
  const availabilityControllerRef = useRef(null);
  const syncRequestOverrideRef = useRef(undefined);
  const syncConfirmedOnAgentRef = useRef(false);
  const lastRmmRefreshSnapshotRef = useRef(null);
  const pageRootRef = useRef(null);
  const mainContentRef = useRef(null);
  const heroTabsRef = useRef(null);
  const activitySwitchRef = useRef(null);
  const supervisionSwitchRef = useRef(null);
  const [heroTabIndicator, setHeroTabIndicator] = useState({ left: 0, width: 0, ready: false });
  const [activitySwitchIndicator, setActivitySwitchIndicator] = useState({ left: 0, width: 0, ready: false });
  const [supervisionSwitchIndicator, setSupervisionSwitchIndicator] = useState({ left: 0, width: 0, ready: false });
  const equipmentUiIdRef = useRef(resolvedEquipmentId);
  const skipEquipmentUiPersistRef = useRef(false);
  const getEquipmentDbIdLocal = () => resolveEquipmentDbId(equipment);
  const getEditModuleKey = eq => {
    const family = eq?.type || eq?.familyKey || "";
    if (parseCustomFamilyType(family)) return null;
    if (family === "NAS" || family === "Storage" || family === "Stockage") return "Storage";
    if (family === "Servers" || family === "Serveurs" || family === "Server" || family === "Serveur") return "Servers";
    if (family === "Firewalls" || family === "Firewall") return "Firewalls";
    if (family === "Ordinateurs" || family === "Workstations") return "Ordinateurs";
    return family || null;
  };
  const equipmentDisplayType = equipment?.type === "NAS" ? "Storage" : equipment?.type;
  const equipmentModuleKey = equipment ? getEditModuleKey(equipment) : null;
  const toDetailFormData = useCallback((source, extra = {}) => buildDetailFormData(source, {
    clientSites,
    clientSsids,
    extensionFields: systemExtensionFields,
    ...extra
  }), [clientSites, clientSsids, systemExtensionFields]);
  const alertSettings = useEquipmentAlertSettings(equipment);
  const supervisionCopy = useMemo(() => getSupervisionCenterCopy(locale), [locale]);
  const rmmManaged = isRmmManagedEquipment(equipment);
  const rmmAgentId = getRmmAgentId(equipment);
  const [syncRequestOverride, setSyncRequestOverride] = useState(undefined);
  const [rmmHeartbeatIntervalMinutes, setRmmHeartbeatIntervalMinutes] = useState(null);
  const [rmmOfflineThresholdMinutes, setRmmOfflineThresholdMinutes] = useState(null);
  const [rmmLiveOnline, setRmmLiveOnline] = useState(null);
  const [rmmLastSeenAt, setRmmLastSeenAt] = useState(null);
  const {
    pending: rmmSyncPending,
    requestedAt: rmmSyncRequestedAt
  } = useMemo(() => resolveRmmSyncRequestState(equipment, syncRequestOverride), [equipment, syncRequestOverride]);
  const rmmHeartbeatMinutes = useMemo(() => resolveRmmHeartbeatIntervalMinutes(equipment, rmmHeartbeatIntervalMinutes), [equipment, rmmHeartbeatIntervalMinutes]);
  const equipmentWithRmmLive = useMemo(() => {
    if (!equipment) return equipment;
    if (rmmLiveOnline == null && !rmmLastSeenAt && rmmHeartbeatIntervalMinutes == null && rmmOfflineThresholdMinutes == null) {
      return equipment;
    }
    return {
      ...equipment,
      rmmLiveOnline: rmmLiveOnline == null ? equipment.rmmLiveOnline : rmmLiveOnline,
      rmmLastSeenAt: rmmLastSeenAt || equipment.rmmLastSeenAt || null,
      heartbeatIntervalMinutes: rmmHeartbeatIntervalMinutes ?? equipment.heartbeatIntervalMinutes,
      offlineThresholdMinutes: rmmOfflineThresholdMinutes ?? equipment.offlineThresholdMinutes,
      agentOnline: rmmLiveOnline == null ? equipment.agentOnline : rmmLiveOnline
    };
  }, [equipment, rmmLiveOnline, rmmLastSeenAt, rmmHeartbeatIntervalMinutes, rmmOfflineThresholdMinutes]);
  useEffect(() => {
    syncRequestOverrideRef.current = syncRequestOverride;
  }, [syncRequestOverride]);
  const showRmmHeroStatus = equipment?.type === "Ordinateurs" && rmmManaged;
  const rmmAgentVersion = useMemo(() => showRmmHeroStatus ? getRmmAgentVersion(equipmentWithRmmLive) : null, [equipmentWithRmmLive, showRmmHeroStatus]);
  const rmmDeviceHealth = useMemo(() => showRmmHeroStatus ? computeRmmDeviceHealth(equipmentWithRmmLive) : null, [equipmentWithRmmLive, showRmmHeroStatus]);
  const showRmmMetricsTab = equipment?.type === "Ordinateurs" && rmmManaged;
  const showRmmPeripheralsTab = showRmmMetricsTab;
  const showRmmOperationsTab = showRmmMetricsTab;
  const resolvedCheckmkMapping = useMemo(
    () => resolveEquipmentCheckmkMapping(equipment, checkmkMapping),
    [equipment, checkmkMapping]
  );
  const equipmentMkType = normalizeCheckMKEquipmentType(equipment?.type);
  const hasCheckmkHost = Boolean(resolvedCheckmkMapping?.checkmk_host_name);
  // Synthèse RMM : uniquement si l’agent RMM est présent.
  const showSyntheseTab = Boolean(rmmManaged);
  // Onglet Supervision uniquement s'il y a un mapping CheckMK (sinon tout est vide).
  const showSupervisionTab = Boolean(
    checkmkIntegrationEnabled &&
      equipmentMkType !== "Internet" &&
      hasCheckmkHost
  );
  const showRmmTabGroup = showSyntheseTab || showRmmOperationsTab || showRmmPeripheralsTab;
  const showSupervisionTabGroup = showSupervisionTab;
  const rmmMetricsAgent = useMemo(() => showRmmMetricsTab ? buildRmmAgentRowFromEquipment(equipment) : null, [equipment, showRmmMetricsTab]);
  useEffect(() => {
    if (!equipment?.id) return;
    if (equipment.detailTab === "metrics" && showRmmMetricsTab) {
      setRightPanelTab("activity");
      setActivityPane("metrics");
    }
  }, [equipment?.id, equipment?.detailTab, showRmmMetricsTab]);
  const handleRmmFullSync = async () => {
    if (!rmmAgentId) {
      toast.error(copy.toasts.rmmAgentNotFound);
      return;
    }
    setRmmSyncRequesting(true);
    try {
      const result = await requestRmmAgentSync(rmmAgentId);
      const syncAt = result?.sync_requested_at || new Date().toISOString();
      syncConfirmedOnAgentRef.current = false;
      setSyncRequestOverride(syncAt);
      onUpdate?.(patchEquipmentRmmSyncRequest(equipment, syncAt));
      toast.success(agentSupportsImmediateFullSync(equipment) ? copy.toasts.fullSyncRequestedFast : (() => {
        const expectedLabel = formatRmmExpectedCollectionLabel(equipment, rmmHeartbeatMinutes, {
          withAbsolute: false
        });
        return expectedLabel ? interpolate(copy.toasts.fullSyncRequestedWithCollection, {
          label: expectedLabel
        }) : copy.toasts.fullSyncRequested;
      })());
      window.setTimeout(() => {
        refreshRmmEquipment();
      }, 5000);
    } catch (error) {
      console.error("Error sync complet RMM:", error);
      toast.error(error?.message || copy.toasts.fullSyncRequestError);
    } finally {
      setRmmSyncRequesting(false);
    }
  };
  const handleRmmCancelSync = async () => {
    if (!rmmAgentId) {
      toast.error(copy.toasts.rmmAgentNotFound);
      return;
    }
    setRmmSyncRequesting(true);
    try {
      await cancelRmmAgentSync(rmmAgentId);
      syncConfirmedOnAgentRef.current = false;
      setSyncRequestOverride(null);
      onUpdate?.(patchEquipmentRmmSyncRequest(equipment, null));
      toast.success(copy.toasts.fullSyncCancelled);
      await refreshRmmEquipment();
    } catch (error) {
      console.error("Error annulation sync RMM:", error);
      toast.error(error?.message || copy.toasts.fullSyncCancelError);
    } finally {
      setRmmSyncRequesting(false);
    }
  };
  const handleRmmAgentUpdate = async () => {
    if (!rmmAgentId) {
      toast.error(copy.toasts.rmmAgentNotFound);
      return;
    }
    setRmmUpdateRequesting(true);
    try {
      const result = await requestRmmAgentUpdate(rmmAgentId);
      const latest = result?.latest_agent_version || "—";
      setRmmUpdateRequestedAt(result?.update_requested_at || new Date().toISOString());
      setRmmUpdateTargetVersion(result?.latest_agent_version || null);
      toast.success(interpolate(agentSupportsImmediateFullSync(equipment) ? copy.toasts.agentUpdateRequestedFast : copy.toasts.agentUpdateRequested, {
        version: latest
      }));
      if (rightPanelTab === "logs") {
        window.setTimeout(() => {
          loadLogs(1);
        }, 400);
      }
      window.setTimeout(() => {
        refreshRmmEquipment();
      }, 5000);
    } catch (error) {
      console.error("Error mise à jour agent RMM:", error);
      if (error?.code === "ALREADY_UP_TO_DATE") {
        const version = error?.latest_agent_version || getRmmAgentVersion(equipment) || "—";
        toast.info(interpolate(copy.toasts.agentUpdateAlreadyLatest, {
          version
        }));
      } else {
        toast.error(error?.message || copy.toasts.agentUpdateRequestError);
      }
    } finally {
      setRmmUpdateRequesting(false);
    }
  };
  const handleRmmCancelAgentUpdate = async () => {
    if (!rmmAgentId) {
      toast.error(copy.toasts.rmmAgentNotFound);
      return;
    }
    setRmmUpdateRequesting(true);
    try {
      await cancelRmmAgentUpdate(rmmAgentId);
      setRmmUpdateRequestedAt(null);
      setRmmUpdateTargetVersion(null);
      toast.success(copy.toasts.agentUpdateCancelled);
      if (rightPanelTab === "logs") {
        window.setTimeout(() => {
          loadLogs(1);
        }, 400);
      }
    } catch (error) {
      console.error("Error annulation MAJ agent RMM:", error);
      toast.error(error?.message || copy.toasts.agentUpdateCancelError);
    } finally {
      setRmmUpdateRequesting(false);
    }
  };
  const refreshRmmEquipment = useCallback(async () => {
    if (!equipment?.clientId || !onUpdate) return;
    try {
      const list = await getClientHardwareEquipment(equipment.clientId);
      const refreshed = findEquipmentInList(list, equipment);
      if (refreshed) {
        const refreshedSyncAt = getRmmSyncRequestedAt(refreshed);
        const preserveCancelled = syncRequestOverrideRef.current === null;
        const currentOverride = syncRequestOverrideRef.current;
        let nextEquipment = refreshed;
        if (preserveCancelled) {
          nextEquipment = patchEquipmentRmmSyncRequest(refreshed, null);
          setSyncRequestOverride(null);
        } else if (refreshedSyncAt) {
          syncConfirmedOnAgentRef.current = true;
          setSyncRequestOverride(refreshedSyncAt);
          nextEquipment = patchEquipmentRmmSyncRequest(refreshed, refreshedSyncAt);
        } else if (typeof currentOverride === "string") {
          nextEquipment = patchEquipmentRmmSyncRequest(refreshed, currentOverride);
        } else if (currentOverride === undefined) {
          setSyncRequestOverride(undefined);
        }
        setFormData(toDetailFormData(nextEquipment));
        const rmmSnapshot = JSON.stringify({
          dbId: resolveEquipmentDbId(nextEquipment),
          syncAt: getRmmSyncRequestedAt(nextEquipment),
          heartbeat: nextEquipment?.rmmLastHeartbeat || nextEquipment?.rawData?.rmm_last_heartbeat || null,
          agentStatus: nextEquipment?.agentStatus || nextEquipment?.rawData?.agent_status || null
        });
        if (lastRmmRefreshSnapshotRef.current === rmmSnapshot) return;
        lastRmmRefreshSnapshotRef.current = rmmSnapshot;
        onUpdate(nextEquipment);
      }
    } catch {}
  }, [equipment, onUpdate, clientSites, clientSsids]);
  useEffect(() => {
    setProFeaturePromoHandler(featureKey => setProPromoFeature(featureKey));
    return () => setProFeaturePromoHandler(null);
  }, []);
  const openCreateEventModal = () => {
    if (isCommunity) {
      notifyProFeature("Company schedule");
      return;
    }
    setEditingEvent(null);
    setEventModalOpen(true);
  };
  const applyCheckMKPayload = payload => {
    if (!payload) return;
    const availabilityByPeriod = payload.availabilityByPeriod || payload.checkmkData?.availabilityByPeriod || {};
    const availability = availabilityByPeriod[checkmkAvailabilityPeriod] ?? payload.checkmkData?.availability ?? null;
    if (payload.checkmkData) {
      const nextCheckmkData = {
        ...payload.checkmkData,
        availability,
        availabilityByPeriod
      };
      setCheckmkData(nextCheckmkData);
      const cacheId = resolveEquipmentDbId(equipment);
      if (cacheId) {
        const current = getDetailCache(DETAIL_CACHE_NS.equipment, cacheId, {
          ttlMs: 0
        }) || {};
        setDetailCache(DETAIL_CACHE_NS.equipment, cacheId, {
          ...current,
          checkmkData: nextCheckmkData
        });
      }
    }
    if (payload.hostDetails) {
      setCheckmkHostDetails(payload.hostDetails);
    }
    if (payload.lastSyncedAt) {
      setCheckmkLastSyncedAt(payload.lastSyncedAt);
    }
  };
  const abortAllPendingFetches = () => {
    logsControllerRef.current?.abort();
    checkmkControllerRef.current?.abort();
    availabilityControllerRef.current?.abort();
  };
  const [initialFormData, setInitialFormData] = useState(null);
  const [hasInfoChanges, setHasInfoChanges] = useState(false);
  const [formData, setFormData] = useState(() => buildDetailFormData(equipment, { extensionFields: systemExtensionFields }));
  const remoteAccessAction = useMemo(() => resolveEquipmentRemoteAccessAction(equipment, formData, locale), [equipment, formData, locale]);
  const equipmentDbId = useMemo(() => resolveEquipmentDbId(equipment), [equipment]);
  const patchEquipmentCache = useCallback((equipmentId, patch) => {
    if (!equipmentId || !patch || typeof patch !== "object") return;
    const current = getDetailCache(DETAIL_CACHE_NS.equipment, equipmentId, {
      ttlMs: 0
    });
    if (current) {
      setDetailCache(DETAIL_CACHE_NS.equipment, equipmentId, {
        ...current,
        ...patch
      });
      return;
    }
    setDetailCache(DETAIL_CACHE_NS.equipment, equipmentId, patch);
  }, []);
  const {
    subscribed: equipmentSubscribed,
    loading: equipmentSubscribeLoading,
    saving: equipmentSubscribeSaving,
    toggleSubscribe: toggleEquipmentSubscribe
  } = useEntitySubscription("equipment", equipmentDbId, {
    labels: {
      subscribed: copy.subscribe?.subscribedToast || "Abonnement activé",
      unsubscribed: copy.subscribe?.unsubscribedToast || "Abonnement retiré"
    }
  });
  const equipmentClientId = useMemo(() => getEquipmentClientId(equipment), [equipment]);
  const equipmentIdentityKey = useMemo(() => getEquipmentListKey(equipment), [equipment]);
  const needsHydration = useMemo(() => equipmentNeedsHydration(equipment), [equipment]);
  const lastHydratedKeyRef = useRef(null);
  const canManageEquipmentTags = Boolean(equipmentDbId && equipmentClientId);
  const maintenanceFamily = useMemo(
    () => resolveEquipmentFamilyForAlerts(equipment?.type) || equipment?.family || null,
    [equipment?.type, equipment?.family]
  );
  const hasSupervisedMonitoring = Boolean(
    rmmManaged || String(resolvedCheckmkMapping?.checkmk_host_name || "").trim()
  );
  const canLoadMaintenance = Boolean(equipmentDbId && equipmentClientId && maintenanceFamily);
  /** Maintenance réservée aux équipements RMM ou mappés supervision (CheckMK…). */
  const canStartMaintenance = Boolean(canLoadMaintenance && hasSupervisedMonitoring);
  const inMaintenance = Boolean(activeMaintenance);
  const showMaintenanceControl = canStartMaintenance || inMaintenance;

  const loadActiveMaintenance = useCallback(async () => {
    if (!canLoadMaintenance) {
      setActiveMaintenance(null);
      return null;
    }
    try {
      const rows = await fetchSupervisionExclusions({
        clientId: equipmentClientId,
        equipmentId: equipmentDbId
      });
      const deviceMaint = (Array.isArray(rows) ? rows : []).find(
        row =>
          String(row.equipmentId) === String(equipmentDbId) &&
          row.scope === "device" &&
          (row.kind || "maintenance") === "maintenance"
      );
      setActiveMaintenance(deviceMaint || null);
      return deviceMaint || null;
    } catch {
      setActiveMaintenance(null);
      return null;
    }
  }, [canLoadMaintenance, equipmentClientId, equipmentDbId]);

  useEffect(() => {
    loadActiveMaintenance();
  }, [loadActiveMaintenance]);

  const maintenanceItem = useMemo(() => {
    if (!canStartMaintenance) return null;
    return {
      id: `device-maint-${equipmentDbId}`,
      clientId: equipmentClientId,
      equipmentId: equipmentDbId,
      family: maintenanceFamily,
      equipmentName: equipment?.name || equipment?.rawData?.nom || "",
      subtitle: equipment?.name || equipment?.rawData?.nom || "",
      equipment: {
        id: equipmentDbId,
        name: equipment?.name || equipment?.rawData?.nom || "",
        family: maintenanceFamily
      }
    };
  }, [
    canStartMaintenance,
    equipment?.name,
    equipment?.rawData?.nom,
    equipmentClientId,
    equipmentDbId,
    maintenanceFamily
  ]);

  const handleConfirmMaintenance = useCallback(
    async payload => {
      const exclusion = payload?.exclusion;
      if (!exclusion || !canStartMaintenance) return;
      setMaintenanceBusy(true);
      try {
        const reason = exclusion.reason || "Maintenance";
        if (exclusion.excludedUntil) {
          await updateEquipmentAlertSuspension(equipmentClientId, equipmentDbId, {
            family: maintenanceFamily,
            type: equipment?.type,
            equipmentName: exclusion.equipmentName || equipment?.name,
            suspensionType: "temporary",
            alertsEnabled: true,
            suspendedUntil: exclusion.excludedUntil,
            reason
          });
        } else {
          await updateEquipmentAlertSuspension(equipmentClientId, equipmentDbId, {
            family: maintenanceFamily,
            type: equipment?.type,
            equipmentName: exclusion.equipmentName || equipment?.name,
            suspensionType: "permanent",
            alertsEnabled: true,
            reason
          });
        }
        await createSupervisionExclusion({
          clientId: equipmentClientId,
          equipmentId: equipmentDbId,
          family: maintenanceFamily,
          equipmentName: exclusion.equipmentName || equipment?.name,
          scope: "device",
          kind: "maintenance",
          reason,
          excludedUntil: exclusion.excludedUntil
        });
        toast.success(copy.hero.maintenanceOk || "Maintenance enregistrée");
        setMaintenanceModalOpen(false);
        await loadActiveMaintenance();
        setMaintenanceHistoryKey(k => k + 1);
        await alertSettings.reload?.();
      } catch (err) {
        toast.error(err?.message || copy.hero.maintenanceError || "Erreur");
      } finally {
        setMaintenanceBusy(false);
      }
    },
    [
      alertSettings,
      canStartMaintenance,
      copy.hero.maintenanceError,
      copy.hero.maintenanceOk,
      equipment?.name,
      equipment?.type,
      equipmentClientId,
      equipmentDbId,
      loadActiveMaintenance,
      maintenanceFamily
    ]
  );

  const handleEndMaintenance = useCallback(async () => {
    if (!activeMaintenance?.id || !canLoadMaintenance) return;
    setMaintenanceBusy(true);
    try {
      await deleteSupervisionExclusion(activeMaintenance.id);
      await updateEquipmentAlertSuspension(equipmentClientId, equipmentDbId, {
        family: maintenanceFamily,
        type: equipment?.type,
        equipmentName: equipment?.name,
        suspensionType: "none",
        alertsEnabled: true
      });
      toast.success(copy.hero.maintenanceEnded || "Maintenance terminée");
      setEndMaintenanceOpen(false);
      setActiveMaintenance(null);
      setMaintenanceHistoryKey(k => k + 1);
      await alertSettings.reload?.();
    } catch (err) {
      toast.error(err?.message || copy.hero.maintenanceError || "Erreur");
    } finally {
      setMaintenanceBusy(false);
    }
  }, [
    activeMaintenance?.id,
    alertSettings,
    canLoadMaintenance,
    copy.hero.maintenanceEnded,
    copy.hero.maintenanceError,
    equipment?.name,
    equipment?.type,
    equipmentClientId,
    equipmentDbId,
    maintenanceFamily
  ]);
  useEffect(() => {
    if (!canManageEquipmentTags) {
      setEquipmentTags([]);
      setLoadingEquipmentTags(false);
      return undefined;
    }
    let cancelled = false;
    const cached = getDetailCache(DETAIL_CACHE_NS.equipment, equipmentDbId);
    const keepVisible = Array.isArray(cached?.tags);
    if (keepVisible) {
      setEquipmentTags(cached.tags);
      setLoadingEquipmentTags(false);
    } else {
      setLoadingEquipmentTags(true);
    }
    fetchEquipmentTags(equipmentDbId, equipmentClientId).then(tags => {
      if (cancelled) return;
      const nextTags = Array.isArray(tags) ? tags : [];
      setEquipmentTags(nextTags);
      patchEquipmentCache(equipmentDbId, {
        tags: nextTags
      });
    }).catch(error => {
      console.error("Error loading tags device:", error);
      if (!cancelled && !keepVisible) setEquipmentTags([]);
    }).finally(() => {
      if (!cancelled) setLoadingEquipmentTags(false);
    });
    return () => {
      cancelled = true;
    };
  }, [canManageEquipmentTags, equipmentDbId, equipmentClientId, patchEquipmentCache]);
  useEffect(() => {
    if (!equipmentDbId) return;
    const prev = equipmentUiIdRef.current;
    if (prev != null && String(prev) !== String(equipmentDbId)) {
      skipEquipmentUiPersistRef.current = true;
      const saved = readEquipmentDetailUi(equipmentDbId);
      const savedTab = saved?.rightPanelTab;
      setRightPanelTab(normalizeEquipmentDetailTab(savedTab));
      setActivityPane(normalizeEquipmentActivityPane(saved?.activityPane));
      setSupervisionPane(
        normalizeEquipmentSupervisionPane(
          savedTab === "history" || savedTab === "maintenance"
            ? "history"
            : saved?.supervisionPane
        )
      );
      setActivityDatePreset(saved?.activityDatePreset || "30d");
      setLogsCategory(saved?.logsCategory || "all");
      const cached = getDetailCache(DETAIL_CACHE_NS.equipment, equipmentDbId);
      if (Array.isArray(cached?.tags)) {
        setEquipmentTags(cached.tags);
        setLoadingEquipmentTags(false);
      }
      if (cached?.activity) {
        setActivity(cached.activity);
        setLoadingActivity(false);
      }
      if (Array.isArray(cached?.logs)) {
        setLogs(cached.logs);
        setLogsTotal(Number(cached.logsTotal) || 0);
        setLogsPage(Number(cached.logsPage) || 1);
        setLoadingLogs(false);
      }
      if (cached?.checkmkMapping) setCheckmkMapping(cached.checkmkMapping);
      if (cached?.checkmkData) setCheckmkData(cached.checkmkData);
    }
    equipmentUiIdRef.current = equipmentDbId;
  }, [equipmentDbId]);
  useEffect(() => {
    if (!equipmentDbId) return;
    if (skipEquipmentUiPersistRef.current) {
      skipEquipmentUiPersistRef.current = false;
      return;
    }
    writeEquipmentDetailUi(equipmentDbId, {
      rightPanelTab,
      activityPane,
      supervisionPane,
      activityDatePreset,
      logsCategory
    });
  }, [equipmentDbId, rightPanelTab, activityPane, supervisionPane, activityDatePreset, logsCategory]);
  useEffect(() => {
    const el = mainContentRef.current;
    if (!el || !equipmentDbId) return undefined;
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        writeEquipmentDetailUi(equipmentDbId, {
          scrollY: el.scrollTop
        });
      });
    };
    el.addEventListener("scroll", onScroll, {
      passive: true
    });
    return () => {
      cancelAnimationFrame(frame);
      el.removeEventListener("scroll", onScroll);
      writeEquipmentDetailUi(equipmentDbId, {
        scrollY: el.scrollTop
      });
    };
  }, [equipmentDbId]);
  useEffect(() => {
    if (!equipmentDbId) return;
    const savedY = readEquipmentDetailUi(equipmentDbId)?.scrollY;
    if (typeof savedY !== "number" || savedY <= 0) return;
    const el = mainContentRef.current;
    if (!el) return;
    const restore = () => {
      el.scrollTop = savedY;
    };
    const raf = requestAnimationFrame(() => {
      restore();
      requestAnimationFrame(restore);
    });
    const timeout = window.setTimeout(restore, 120);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(timeout);
    };
  }, [equipmentDbId, rightPanelTab]);
  useEffect(() => {
    if (!equipment) return;
    abortAllPendingFetches();
    const alreadyHydrated = lastHydratedKeyRef.current === equipmentIdentityKey;
    if (!(needsHydration && alreadyHydrated)) {
      setFormData(toDetailFormData(equipment));
    }
    // Prefer resolved mapping from prop / raw fields (inventory, modules, URL stubs).
    const mapping = resolveEquipmentCheckmkMapping(
      equipment,
      Object.prototype.hasOwnProperty.call(equipment, "checkmkMapping") ? equipment.checkmkMapping : checkmkMapping
    );
    setCheckmkMapping(mapping);
    if (equipmentDbId && mapping) {
      patchEquipmentCache(equipmentDbId, {
        checkmkMapping: mapping
      });
    }
    if (checkmkIntegrationEnabled && mapping?.checkmk_host_name) {
      loadCheckMKData();
    } else if (!needsHydration) {
      setCheckmkData(null);
    }
  }, [equipmentIdentityKey, needsHydration, checkmkIntegrationEnabled, clientSites, clientSsids, equipment?.checkmkMapping, equipment?.checkmk_host_name, equipmentDbId, patchEquipmentCache]);
  // Si le mapping n'est pas dans le payload (ex. stub URL / inventaire partiel), le récupérer via l'API client.
  useEffect(() => {
    if (!checkmkIntegrationEnabled || checkmkMapping?.checkmk_host_name) return undefined;
    if (equipmentMkType === "Internet") return undefined;
    const clientId = getEquipmentClientId(equipment);
    const dbId = String(resolveEquipmentDbId(equipment) || "").trim().toLowerCase();
    if (!clientId || !dbId) return undefined;
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/checkmk/mapping/${clientId}`, {
          credentials: "include",
          headers: { "Content-Type": "application/json" }
        });
        if (!response.ok || cancelled) return;
        const mappings = await response.json();
        if (cancelled) return;
        const row = (Array.isArray(mappings) ? mappings : []).find(item => {
          const id = String(item?.equipment_id || item?.id || "").trim().toLowerCase();
          return id === dbId && item?.is_active !== false && String(item?.checkmk_host_name || "").trim();
        });
        if (!row) return;
        const nextMapping = {
          checkmk_host_name: String(row.checkmk_host_name).trim(),
          checkmk_site: row.checkmk_site || null,
          checkmk_service_name: row.checkmk_service_name || null,
          is_active: row.is_active !== false
        };
        setCheckmkMapping(nextMapping);
        if (onUpdate && equipment) {
          onUpdate({
            ...equipment,
            checkmkMapping: nextMapping,
            checkmk_host_name: nextMapping.checkmk_host_name,
            checkmk_site: nextMapping.checkmk_site,
            checkmk_service_name: nextMapping.checkmk_service_name
          });
        }
      } catch (err) {
        if (err?.name !== "AbortError") {
          console.warn("Load CheckMK mapping for equipment detail:", err);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [checkmkIntegrationEnabled, checkmkMapping?.checkmk_host_name, equipmentMkType, equipmentIdentityKey, onUpdate]);
  useEffect(() => {
    if (!needsHydration) return undefined;
    const clientId = getEquipmentClientId(equipment);
    const dbId = resolveEquipmentDbId(equipment);
    if (!clientId || !dbId) return undefined;
    let cancelled = false;
    (async () => {
      try {
        const familyKey = parseCustomFamilyType(equipment.type) || equipment.familyKey || null;
        const isCustom = Boolean(equipment.isCustom || familyKey && String(equipment.type || "").startsWith("Custom:"));
        let refreshed = null;
        if (isCustom && familyKey) {
          let family = equipment.customFamily?.familyKey === familyKey ? equipment.customFamily : null;
          if (!family?.fields) {
            const families = await fetchEquipmentFamilies().catch(() => []);
            family = (Array.isArray(families) ? families : []).find(entry => entry.familyKey === familyKey) || family;
          }
          const rows = await fetchClientCustomEquipment(clientId, familyKey);
          const row = (Array.isArray(rows) ? rows : []).find(item => String(item?.id) === String(dbId));
          if (row) {
            refreshed = mapCustomEquipmentItem(row, family || {
              familyKey,
              label: equipment.familyLabel || equipment.customFamily?.label || familyKey,
              icon: equipment.familyIcon || equipment.customFamily?.icon || "mdi:devices",
              fields: equipment.customFields || []
            }, {
              clientId,
              clientName: equipment.clientName
            });
          }
        } else {
          const list = await getClientHardwareEquipment(clientId);
          refreshed = findEquipmentInList(list, equipment);
        }
        if (cancelled || !refreshed) return;
        lastHydratedKeyRef.current = equipmentIdentityKey;
        setFormData(toDetailFormData(refreshed));
        if (onUpdate) onUpdate(refreshed);
        else onNavigateToEquipment?.(refreshed);
      } catch (error) {
        console.warn("Hydrate equipment detail:", error);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [equipmentIdentityKey]);
  useEffect(() => {
    if (!equipment?.clientId) {
      setClientSites([]);
      setClientSsids([]);
      return undefined;
    }
    let mounted = true;
    fetchClientGeneral(equipment.clientId).then(client => {
      if (!mounted) return;
      setClientSites(normalizeClientSites(client?.sites));
      setClientSsids(resolveClientWifiSsidCatalog(client));
    }).catch(() => {
      if (mounted) {
        setClientSites([]);
        setClientSsids([]);
      }
    });
    return () => {
      mounted = false;
    };
  }, [equipment?.clientId]);
  useEffect(() => {
    const needsPeers = equipment?.type === "Firewalls" || equipment?.type === "Servers" || equipment?.type === "Serveurs" || equipment?.type === "NAS" || equipment?.type === "Storage" || equipment?.type === "Stockage" || equipment?.type === "BorneWifi";
    if (!needsPeers || !equipment?.clientId) {
      setPeerFirewalls([]);
      setPeerServers([]);
      setPeerStorage([]);
      setPeerBorneWifi([]);
      return undefined;
    }
    let mounted = true;
    getClientHardwareEquipment(equipment.clientId).then(list => {
      if (!mounted) return;
      const rows = Array.isArray(list) ? list : [];
      setPeerFirewalls(rows.filter(eq => eq.type === "Firewalls"));
      setPeerServers(rows.filter(eq => eq.type === "Servers" || eq.type === "Serveurs"));
      setPeerStorage(rows.filter(eq => eq.type === "NAS" || eq.type === "Storage" || eq.type === "Stockage"));
      setPeerBorneWifi(rows.filter(eq => eq.type === "BorneWifi"));
    }).catch(() => {
      if (mounted) {
        setPeerFirewalls([]);
        setPeerServers([]);
        setPeerStorage([]);
        setPeerBorneWifi([]);
      }
    });
    return () => {
      mounted = false;
    };
  }, [equipment?.clientId, equipment?.type, equipmentIdentityKey]);
  const openLinkedEquipment = useCallback(target => {
    if (!target) return;
    if (onNavigate) {
      onNavigate("EquipmentDetail", target);
      return;
    }
    onNavigateToEquipment?.(target);
  }, [onNavigate, onNavigateToEquipment]);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setLogsSearch(logsSearchDraft.trim());
    }, 350);
    return () => window.clearTimeout(timer);
  }, [logsSearchDraft]);
  useEffect(() => {
    if (rightPanelTab !== 'logs') {
      logsControllerRef.current?.abort();
      return;
    }
    if (!equipment?.id) return;
    loadLogs(1);
  }, [rightPanelTab, equipment?.id, logsSearch, logsCategory]);
  useEffect(() => {
    if (!rmmManaged || !equipment?.clientId) return undefined;
    refreshRmmEquipment();
    const intervalMs = rmmSyncPending ? 15000 : 45000;
    const interval = setInterval(() => {
      if (document.visibilityState !== "visible") return;
      refreshRmmEquipment();
    }, intervalMs);
    return () => clearInterval(interval);
  }, [rmmManaged, equipment?.clientId, equipment?.id, rmmSyncPending, refreshRmmEquipment]);
  useEffect(() => {
    if ((rightPanelTab === "synthese" || rightPanelTab === "fiche") && rmmManaged) {
      refreshRmmEquipment();
    }
  }, [rightPanelTab, rmmManaged, refreshRmmEquipment]);
  useEffect(() => {
    setSyncRequestOverride(undefined);
    setRmmHeartbeatIntervalMinutes(null);
    setRmmOfflineThresholdMinutes(null);
    setRmmLiveOnline(null);
    setRmmLastSeenAt(null);
    setRmmUpdateRequestedAt(null);
    setRmmUpdateTargetVersion(null);
    syncConfirmedOnAgentRef.current = Boolean(getRmmSyncRequestedAt(equipment));
    lastRmmRefreshSnapshotRef.current = null;
    lastActivityFetchKeyRef.current = null;
  }, [equipment?.id]);
  useEffect(() => {
    if (!rmmManaged || !rmmAgentId || !equipment?.clientId) return undefined;
    let cancelled = false;
    const pollAgentSyncState = async () => {
      try {
        const agents = await fetchRmmAgents(equipment.clientId);
        if (cancelled) return;
        const agent = (Array.isArray(agents) ? agents : []).find(row => row.id === rmmAgentId);
        if (!agent) return;
        if (agent.heartbeat_interval_minutes != null) {
          const minutes = Number(agent.heartbeat_interval_minutes);
          if (Number.isFinite(minutes) && minutes > 0) {
            setRmmHeartbeatIntervalMinutes(minutes);
          }
        }
        if (agent.offline_threshold_effective_minutes != null || agent.offline_threshold_minutes != null) {
          const minutes = Number(agent.offline_threshold_effective_minutes ?? agent.offline_threshold_minutes);
          if (Number.isFinite(minutes) && minutes > 0) {
            setRmmOfflineThresholdMinutes(minutes);
          }
        }
        if (agent.online === true || agent.online === false) {
          setRmmLiveOnline(agent.online);
        }
        if (agent.last_seen_at) {
          setRmmLastSeenAt(agent.last_seen_at);
        }
        setRmmUpdateRequestedAt(agent.update_requested_at || null);
        if (!agent.update_requested_at) {
          setRmmUpdateTargetVersion(null);
        } else if (agent.latest_agent_version) {
          setRmmUpdateTargetVersion(agent.latest_agent_version);
        }
        if (!onUpdate) return;
        const syncAt = agent.sync_requested_at || null;
        if (syncRequestOverrideRef.current === null) {
          if (!syncAt) {
            setSyncRequestOverride(undefined);
            syncConfirmedOnAgentRef.current = false;
            onUpdate(patchEquipmentRmmSyncRequest(equipment, null));
          }
          return;
        }
        const currentAt = syncRequestOverrideRef.current !== undefined ? syncRequestOverrideRef.current : getRmmSyncRequestedAt(equipment);
        if (rmmSyncTimestampsMatch(syncAt, currentAt)) {
          if (syncAt) syncConfirmedOnAgentRef.current = true;
          return;
        }
        if (!syncAt) {
          if (typeof currentAt === "string" && !syncConfirmedOnAgentRef.current) {
            return;
          }
          setSyncRequestOverride(undefined);
          syncConfirmedOnAgentRef.current = false;
          onUpdate(patchEquipmentRmmSyncRequest(equipment, null));
          refreshRmmEquipment();
          return;
        }
        syncConfirmedOnAgentRef.current = true;
        setSyncRequestOverride(syncAt);
        onUpdate(patchEquipmentRmmSyncRequest(equipment, syncAt));
      } catch {}
    };
    pollAgentSyncState();
    const interval = setInterval(pollAgentSyncState, rmmSyncPending || rmmUpdateRequestedAt ? 15000 : 60000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [rmmManaged, rmmAgentId, equipment?.clientId, equipment?.id, onUpdate, refreshRmmEquipment, rmmSyncPending, rmmUpdateRequestedAt]);
  useEffect(() => {
    if (!rmmManaged || !rmmAgentId || !rmmUpdateRequestedAt) return undefined;
    let cancelled = false;
    const nudgeHeartbeat = async () => {
      try {
        await requestRmmAgentHeartbeat(rmmAgentId);
        if (!cancelled) await refreshRmmEquipment();
      } catch {
        // best-effort wake; poll continues
      }
    };
    nudgeHeartbeat();
    const interval = setInterval(nudgeHeartbeat, 15000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [rmmManaged, rmmAgentId, rmmUpdateRequestedAt, refreshRmmEquipment]);
  useEffect(() => {
    setActivityPane(prev =>
      normalizeEquipmentActivityPane(prev, { allowMetrics: showRmmMetricsTab })
    );
  }, [showRmmMetricsTab]);
  useEffect(() => {
    if (rightPanelTab === "synthese" && !showSyntheseTab) {
      setRightPanelTab("fiche");
    }
  }, [rightPanelTab, showSyntheseTab]);
  useEffect(() => {
    if (rightPanelTab === "supervision" && !showSupervisionTab) {
      setRightPanelTab("fiche");
    }
  }, [rightPanelTab, showSupervisionTab]);
  useEffect(() => {
    if (rightPanelTab === "peripherals" && !showRmmPeripheralsTab) {
      setRightPanelTab(showSyntheseTab ? "synthese" : "fiche");
    }
  }, [rightPanelTab, showRmmPeripheralsTab, showSyntheseTab]);
  useEffect(() => {
    if (rightPanelTab === "operations" && !showRmmOperationsTab) {
      setRightPanelTab(showSyntheseTab ? "synthese" : "fiche");
    }
  }, [rightPanelTab, showRmmOperationsTab, showSyntheseTab]);
  useEffect(() => {
    if (
      rightPanelTab === "synthese" ||
      rightPanelTab === "fiche" ||
      rightPanelTab === "activity" ||
      rightPanelTab === "events" ||
      rightPanelTab === "stats" ||
      rightPanelTab === "supervision"
    ) {
      return;
    }
    checkmkControllerRef.current?.abort();
    availabilityControllerRef.current?.abort();
  }, [rightPanelTab]);

  const measureSlidingTabIndicator = useCallback((root, setIndicator) => {
    if (!root) return;
    const active = root.querySelector('[role="tab"][aria-selected="true"]');
    if (!active) {
      setIndicator(prev => (prev.ready ? { ...prev, ready: false } : prev));
      return;
    }
    const rootRect = root.getBoundingClientRect();
    const activeRect = active.getBoundingClientRect();
    const next = {
      left: activeRect.left - rootRect.left + root.scrollLeft,
      width: activeRect.width,
      ready: true
    };
    setIndicator(prev => (
      prev.ready
      && Math.abs(prev.left - next.left) < 0.5
      && Math.abs(prev.width - next.width) < 0.5
        ? prev
        : next
    ));
  }, []);

  useLayoutEffect(() => {
    const root = heroTabsRef.current;
    if (!root) return undefined;
    const update = () => measureSlidingTabIndicator(root, setHeroTabIndicator);
    update();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(update) : null;
    ro?.observe(root);
    root.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      ro?.disconnect();
      root.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [
    measureSlidingTabIndicator,
    rightPanelTab,
    showRmmTabGroup,
    showSupervisionTabGroup,
    showSyntheseTab,
    showRmmOperationsTab,
    showRmmPeripheralsTab
  ]);

  useLayoutEffect(() => {
    const root = activitySwitchRef.current;
    if (!root) {
      setActivitySwitchIndicator(prev => (prev.ready ? { left: 0, width: 0, ready: false } : prev));
      return undefined;
    }
    const update = () => measureSlidingTabIndicator(root, setActivitySwitchIndicator);
    update();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(update) : null;
    ro?.observe(root);
    window.addEventListener("resize", update);
    return () => {
      ro?.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [measureSlidingTabIndicator, activityPane, rightPanelTab, showRmmMetricsTab]);

  useLayoutEffect(() => {
    const root = supervisionSwitchRef.current;
    if (!root) {
      setSupervisionSwitchIndicator(prev => (prev.ready ? { left: 0, width: 0, ready: false } : prev));
      return undefined;
    }
    const update = () => measureSlidingTabIndicator(root, setSupervisionSwitchIndicator);
    update();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(update) : null;
    ro?.observe(root);
    window.addEventListener("resize", update);
    return () => {
      ro?.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [measureSlidingTabIndicator, supervisionPane, rightPanelTab, showSupervisionTab]);

  useEffect(() => {
    return () => {
      abortAllPendingFetches();
    };
  }, []);
  const openEditEquipmentModal = async event => {
    event?.stopPropagation?.();
    event?.preventDefault?.();
    const clientId = getEquipmentClientId(equipment);
    if (!clientId) {
      toast.error(copy.toasts.clientNotFound);
      return;
    }
    if (editModalOpening) return;
    setEditModalOpening(true);
    try {
      const client = await fetchClientGeneral(clientId);
      const ssids = resolveClientWifiSsidCatalog(client);
      const nextClient = {
        ...client,
        sites: Array.isArray(client.sites) ? [...client.sites] : client.sites,
        ssid: Array.isArray(ssids) ? [...ssids] : ssids,
        ssids: Array.isArray(ssids) ? [...ssids] : ssids
      };
      setModalClient(nextClient);
      const familyKey = parseCustomFamilyType(equipment?.type) || equipment?.familyKey || null;
      if (familyKey) {
        let family = equipment?.customFamily?.familyKey === familyKey ? equipment.customFamily : null;
        if (!family?.fields) {
          const families = await fetchEquipmentFamilies().catch(() => []);
          family = (Array.isArray(families) ? families : []).find(entry => entry.familyKey === familyKey) || family;
        }
        if (!family) {
          family = {
            familyKey,
            label: equipment?.customFamily?.label || equipment?.familyLabel || familyKey,
            icon: equipment?.customFamily?.icon || equipment?.familyIcon || "mdi:devices",
            fields: equipment?.customFields || equipment?.customFamily?.fields || []
          };
        }
        setCustomEditFamily(family);
        return;
      }
      setEditModalOpen(true);
      getClientHardwareEquipment(clientId).then(allEquipment => {
        const list = Array.isArray(allEquipment) ? allEquipment : [];
        const sameClient = eq => String(eq.clientId) === String(clientId);
        setPeerFirewalls(list.filter(eq => eq.type === "Firewalls" && sameClient(eq)));
        setPeerServers(list.filter(eq => (eq.type === "Servers" || eq.type === "Serveurs") && sameClient(eq)));
        setPeerStorage(list.filter(eq => (eq.type === "NAS" || eq.type === "Storage" || eq.type === "Stockage") && sameClient(eq)));
        setPeerBorneWifi(list.filter(eq => eq.type === "BorneWifi" && sameClient(eq)));
      }).catch(error => {
        console.warn("Load equipment peers:", error);
      });
    } catch (error) {
      console.error("Open edit modal:", error);
      toast.error(copy.toasts.editOpenError);
    } finally {
      setEditModalOpening(false);
    }
  };
  const handleEquipmentModalSaved = async submitData => {
    let nextEquipment = equipment;
    if (submitData && equipment) {
      if (submitData.location !== undefined) {
        nextEquipment = patchEquipmentLocation(nextEquipment, submitData.location);
      }
      nextEquipment = patchEquipmentWithSharedFields(nextEquipment, submitData);
      if (submitData.is_active !== undefined || submitData.isActive !== undefined) {
        const active = (submitData.is_active ?? submitData.isActive) !== false;
        const raw = {
          ...(nextEquipment.rawData || {})
        };
        const inner = raw.data && typeof raw.data === "object" && !Array.isArray(raw.data) ? {
          ...raw.data
        } : {};
        raw.is_active = active;
        raw.actif = active;
        inner.is_active = active;
        inner.actif = active;
        nextEquipment = {
          ...nextEquipment,
          is_active: active,
          actif: active,
          rawData: {
            ...raw,
            data: Object.keys(inner).length ? inner : raw.data
          }
        };
      }
      if (submitData.computerType !== undefined) {
        const computerType = canonicalizeComputerType(submitData.computerType);
        nextEquipment = {
          ...nextEquipment,
          computerType,
          rawData: {
            ...(nextEquipment.rawData || {}),
            type: computerType
          }
        };
      }
      setFormData(toDetailFormData(nextEquipment));
      onUpdate?.(nextEquipment);
    }
    try {
      const list = await getClientHardwareEquipment(getEquipmentClientId(equipment) || equipment.clientId);
      const refreshed = findEquipmentInList(list, nextEquipment || equipment);
      if (refreshed) {
        setFormData(toDetailFormData(refreshed));
        onUpdate?.(refreshed);
      }
    } catch (error) {
      console.warn("Refresh hardware record:", error);
    }
  };
  const handleEquipmentModalDeleted = () => {
    onUpdate?.(null);
    onBack?.();
  };
  const handleCustomEquipmentRefresh = async savedRow => {
    if (!savedRow) {
      handleEquipmentModalDeleted();
      return;
    }
    const family = customEditFamily || equipment?.customFamily || null;
    const nextEquipment = {
      ...equipment,
      ...mapCustomEquipmentItem(savedRow, family, {
        clientId: getEquipmentClientId(equipment) || savedRow.clientId,
        clientName: equipment?.clientName || modalClient?.name || ""
      }),
      id: equipment?.id,
      dbId: equipment?.dbId || savedRow.id
    };
    setFormData(toDetailFormData(nextEquipment, { customFamily: family }));
    onUpdate?.(nextEquipment);
  };
  const customEditItem = useMemo(() => {
    if (!customEditFamily || !equipment) return null;
    return {
      ...equipment,
      id: resolveEquipmentDbId(equipment) || equipment.id
    };
  }, [customEditFamily, equipment]);
  const loadSSIDs = async () => {
    setGlobalSSIDs([]);
    setLoadingSSIDs(false);
  };
  useEffect(() => {
    const localSites = [];
    if (equipment?.location && String(equipment.location).trim() && equipment.location !== "Sans site") {
      localSites.push(equipment.location);
    }
    setAvailableSites(localSites);
  }, [equipment?.location]);
  const detectInfoChanges = (currentData, initialData) => {
    if (!initialData) return false;
    const infoFields = ["name", "location", "typeServer", "computerType", "ip", "vlan", "systeme", "remoteAccessSolution", "remoteAccessId", "manufacturer", "model", "serial", "expirationGarantie", "processeur", "memoire", "stockage", "role", "raid", "capacite", "nbDisquesActuels", "nbDisquesMax", "disques", "luns", "fournisseur", "internetType", "debit", "categorie", "ipNonFixe", "firmware", "licences", "modeHA", "roleHA", "firewallHA", "firewallHAName", "serverHA", "serverHAName", "storageHA", "storageHAName", "hostServerName", "hypervisor", "adresseMac", "quickConnect"];
    for (const field of infoFields) {
      const cur = currentData[field];
      const init = initialData[field];
      const changed = Array.isArray(cur) && Array.isArray(init) ? JSON.stringify(cur) !== JSON.stringify(init) : cur !== init;
      if (changed) return true;
    }
    return false;
  };
  const updateFormDataWithChanges = newData => {
    setFormData(newData);
    if (initialFormData) {
      setHasInfoChanges(detectInfoChanges(newData, initialFormData));
    }
  };
  const handleSaveInfo = async () => {
    if (!equipment?.id) return;
    setSaving(true);
    try {
      await updateEquipment(equipment.id, formData, equipment);
      setIsEditingInfo(false);
      if (onUpdate) {
        onUpdate({
          ...equipment,
          ...formData
        });
      }
      toast.success(copy.toasts.saveSuccess);
    } catch (error) {
      console.error("Error lors de la sauvegarde:", error);
      toast.error(copy.toasts.saveError);
    } finally {
      setSaving(false);
    }
  };
  const handleCancelInfo = () => {
    if (initialFormData) {
      setFormData(initialFormData);
    }
    setIsEditingInfo(false);
    setHasInfoChanges(false);
  };
  const loadLogs = async (page = 1) => {
    if (!equipment?.id) return;
    logsControllerRef.current?.abort();
    const controller = createTrackedAbortController();
    logsControllerRef.current = controller;
    const cacheId = getEquipmentDbIdLocal() || equipmentDbId;
    const cached = cacheId ? getDetailCache(DETAIL_CACHE_NS.equipment, cacheId) : null;
    const keepVisible = Array.isArray(cached?.logs) && page === 1 && !logsSearch && logsCategory === "all";
    if (!keepVisible) setLoadingLogs(true);
    try {
      const data = await getEquipmentLogs(equipment.id, page, logsLimit, {
        clientId: equipment.clientId,
        type: equipment.type,
        name: equipment.name,
        dbId: cacheId || equipment.dbId || null,
        familyKey: equipment.familyKey || parseCustomFamilyType(equipment.type) || null,
        family: equipment.family || null,
        search: logsSearch,
        category: logsCategory,
        signal: controller.signal
      });
      if (controller.signal.aborted) return;
      const nextLogs = data.logs || [];
      const nextTotal = data.total || 0;
      setLogs(nextLogs);
      setLogsTotal(nextTotal);
      setLogsPage(page);
      if (cacheId && !logsSearch && logsCategory === "all") {
        patchEquipmentCache(cacheId, {
          logs: nextLogs,
          logsTotal: nextTotal,
          logsPage: page
        });
      }
    } catch (error) {
      if (error?.name === "AbortError") return;
      console.error("Error while loading des logs:", error);
      if (!keepVisible) {
        setLogs([]);
        setLogsTotal(0);
      }
    } finally {
      if (!controller.signal.aborted) setLoadingLogs(false);
    }
  };
  const handlePurgeLogs = async () => {
    if (!equipment?.id || purgingLogs) return;
    setPurgingLogs(true);
    try {
      const result = await purgeEquipmentLogs(equipment.id, {
        clientId: equipment.clientId,
        type: equipment.type,
        name: equipment.name,
        dbId: getEquipmentDbIdLocal() || equipment.dbId || null,
        familyKey: equipment.familyKey || parseCustomFamilyType(equipment.type) || null,
        family: equipment.family || null,
        search: logsSearch,
        category: logsCategory
      });
      const deleted = result?.logs_deleted ?? 0;
      toast.success(deleted > 0 ? interpolate(copy.logs.purgeSuccess, {
        count: deleted
      }) : copy.logs.purgeNone);
      setPurgeLogsConfirmOpen(false);
      setSelectedLogDetail(null);
      await loadLogs(1);
    } catch (error) {
      console.error("Error purge logs:", error);
      toast.error(error?.message || copy.toasts.purgeError);
    } finally {
      setPurgingLogs(false);
    }
  };
  const logsFiltersActive = Boolean(logsSearch) || logsCategory !== "all";
  const purgeLogsMessage = logsFiltersActive ? interpolate(modalsCopy.confirm?.purgeLogs?.messageFiltered, {
    count: logsTotal
  }) : interpolate(modalsCopy.confirm?.purgeLogs?.messageAll, {
    count: logsTotal
  });
  const loadEquipmentActivity = useCallback(async () => {
    if (!equipmentDbId || !equipmentClientId) {
      setActivity(null);
      setLoadingActivity(false);
      return;
    }
    activityControllerRef.current?.abort();
    const controller = createTrackedAbortController();
    activityControllerRef.current = controller;
    const {
      start,
      end
    } = resolveEquipmentActivityRange({
      preset: activityDatePreset,
      customStart: activityCustomStart,
      customEnd: activityCustomEnd
    });
    const cached = getDetailCache(DETAIL_CACHE_NS.equipment, equipmentDbId);
    const keepVisible = Boolean(cached?.activity) && activityDatePreset === "30d";
    if (!keepVisible) setLoadingActivity(true);
    try {
      const payload = await fetchEquipmentActivity({
        equipmentId: equipmentDbId,
        clientId: equipmentClientId,
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        signal: controller.signal
      });
      if (controller.signal.aborted) return;
      setActivity(payload);
      if (activityDatePreset === "30d") {
        patchEquipmentCache(equipmentDbId, {
          activity: payload
        });
      }
    } catch (error) {
      if (controller.signal.aborted) return;
      console.error("Error loading device activity:", error);
      if (!keepVisible) setActivity(null);
    } finally {
      if (!controller.signal.aborted) {
        setLoadingActivity(false);
        lastActivityFetchKeyRef.current = [equipmentDbId || "", equipmentClientId || "", activityDatePreset, activityCustomStart, activityCustomEnd].join("|");
      }
    }
  }, [equipmentDbId, equipmentClientId, activityDatePreset, activityCustomStart, activityCustomEnd, patchEquipmentCache]);
  const activityFetchKey = useMemo(() => [equipmentDbId || "", equipmentClientId || "", activityDatePreset, activityCustomStart, activityCustomEnd].join("|"), [equipmentDbId, equipmentClientId, activityDatePreset, activityCustomStart, activityCustomEnd]);
  useEffect(() => {
    const onActivityTab = rightPanelTab === "activity" || rightPanelTab === "events" || rightPanelTab === "stats";
    const needsVeritasData = onActivityTab && (!showRmmMetricsTab || activityPane === "veritas");
    if (!needsVeritasData) {
      activityControllerRef.current?.abort();
      return;
    }
    if (!equipmentDbId || !equipmentClientId) {
      lastActivityFetchKeyRef.current = null;
      setActivity(null);
      setLoadingActivity(false);
      return;
    }
    if (lastActivityFetchKeyRef.current === activityFetchKey) return;
    lastActivityFetchKeyRef.current = activityFetchKey;
    loadEquipmentActivity();
  }, [rightPanelTab, activityPane, showRmmMetricsTab, activityFetchKey, equipmentDbId, equipmentClientId, loadEquipmentActivity]);
  const handleOpenLinkedTicket = ticket => {
    if (!ticket?.id || !onNavigate) return;
    onNavigate("TicketDetail", {
      ticketId: ticket.id,
      ticketNumber: ticket.ticket_number,
      title: ticket.title
    });
  };
  const handleOpenPlanningEvent = event => {
    if (!event) return;
    if (isCommunity) {
      notifyProFeature("Company schedule");
      return;
    }
    setEditingEvent(event);
    setEventModalOpen(true);
  };
  const refreshActivityAfterEventChange = () => {
    const onActivityTab = rightPanelTab === "activity" || rightPanelTab === "events" || rightPanelTab === "stats";
    if (onActivityTab && (!showRmmMetricsTab || activityPane === "veritas")) {
      lastActivityFetchKeyRef.current = null;
      loadEquipmentActivity();
    }
  };
  const openActivityTab = pane => {
    if (pane === "metrics" && showRmmMetricsTab) setActivityPane("metrics");
    else setActivityPane("veritas");
    setRightPanelTab("activity");
  };
  const loadPhotos = async () => {
    if (!equipment?.id) return;
    setLoadingPhotos(false);
    setPhotos([]);
  };
  const handlePhotoUpload = async e => {
    e.preventDefault();
    e.target.value = "";
    setPhotoModalOpen(true);
  };
  const getAvailabilityPeriodRange = periodKey => {
    const endTime = new Date();
    endTime.setHours(23, 59, 59, 999);
    const startTime = new Date(endTime);
    if (periodKey === '1m') startTime.setMonth(startTime.getMonth() - 1);else if (periodKey === '3m') startTime.setMonth(startTime.getMonth() - 3);else if (periodKey === '1y') startTime.setFullYear(startTime.getFullYear() - 1);
    startTime.setHours(0, 0, 0, 0);
    return {
      startTime,
      endTime
    };
  };
  const loadCheckMKData = async ({
    force = false
  } = {}) => {
    if (!checkmkIntegrationEnabled) return;
    const mapping = resolveEquipmentCheckmkMapping(equipment, checkmkMapping);
    if (!mapping?.checkmk_host_name) return;
    const equipmentId = getEquipmentDbIdLocal();
    const clientId = equipment?.clientId;
    const family = equipmentTypeToFamily(equipment?.type);
    if (!equipmentId || !clientId || !family) {
      if (force) {
        toast.error(copy.toasts?.checkmkSyncMissingParams || "Impossible d'actualiser CheckMK (équipement / mapping incomplets).");
      }
      return;
    }
    checkmkControllerRef.current?.abort();
    const controller = createTrackedAbortController();
    checkmkControllerRef.current = controller;
    setLoadingCheckMK(true);
    try {
      const {
        startTime: availStart,
        endTime: availEnd
      } = getAvailabilityPeriodRange(checkmkAvailabilityPeriod);
      setCheckmkPeriod({
        startTime: availStart,
        endTime: availEnd
      });
      const fetchOptions = {
        signal: controller.signal
      };
      const syncPayload = {
        equipmentId,
        clientId,
        family,
        hostName: mapping.checkmk_host_name,
        site: mapping.checkmk_site || null,
        force,
        availabilityPeriod: checkmkAvailabilityPeriod
      };
      const stored = await getEquipmentCheckMKMonitoring(equipmentId, checkmkAvailabilityPeriod, fetchOptions).catch(e => e?.name === "AbortError" ? Promise.reject(e) : null);
      if (controller.signal.aborted) return;
      if (stored?.checkmkData) {
        applyCheckMKPayload(stored);
      }
      const syncMinIntervalMs = Number.isFinite(checkmkSyncIntervalMs) && checkmkSyncIntervalMs > 0
        ? checkmkSyncIntervalMs
        : 30 * 60 * 1000;
      const shouldSync = force || (
        !checkmkSyncSuspended
        && (!stored?.lastSyncedAt || Date.now() - new Date(stored.lastSyncedAt).getTime() >= syncMinIntervalMs)
      );
      if (!shouldSync) return;
      let synced;
      try {
        synced = await syncEquipmentCheckMKMonitoring(syncPayload, fetchOptions);
      } catch (syncErr) {
        if (syncErr?.name === "AbortError") throw syncErr;
        if (force) {
          toast.error(syncErr?.message || copy.toasts?.checkmkSyncError || "Échec de l'actualisation CheckMK.");
        }
        return;
      }
      if (controller.signal.aborted) return;
      if (synced?.checkmkData || synced?.lastSyncedAt) {
        applyCheckMKPayload(synced);
      }
      if (force) {
        if (synced?.skipped) {
          toast.info(synced.message || copy.toasts?.checkmkSyncSkipped || "Sync CheckMK ignorée.");
        } else {
          toast.success(copy.toasts?.checkmkSyncSuccess || "Données CheckMK actualisées.");
        }
      }
    } catch (error) {
      if (error?.name === "AbortError") return;
      console.error("Error lors du loading des data CheckMK:", error);
      if (force) {
        toast.error(error?.message || copy.toasts?.checkmkSyncError || "Échec de l'actualisation CheckMK.");
      }
    } finally {
      if (!controller.signal.aborted) setLoadingCheckMK(false);
    }
  };
  useEffect(() => {
    const needsCheckmk =
      rightPanelTab === "synthese" ||
      (rightPanelTab === "supervision" && supervisionPane === "main");
    if (!needsCheckmk || !showSupervisionTab) return;
    if (checkmkData || loadingCheckMK) return;
    loadCheckMKData();
  }, [rightPanelTab, supervisionPane, showSupervisionTab, checkmkData, loadingCheckMK]);
  const loadCheckMKAvailabilityOnly = async periodKey => {
    const mapping = checkmkMapping || equipment?.checkmkMapping;
    if (!mapping?.checkmk_host_name || !checkmkData) return;
    availabilityControllerRef.current?.abort();
    const controller = createTrackedAbortController();
    availabilityControllerRef.current = controller;
    setLoadingAvailability(true);
    try {
      const {
        startTime,
        endTime
      } = getAvailabilityPeriodRange(periodKey);
      setCheckmkPeriod({
        startTime,
        endTime
      });
      const equipmentId = getEquipmentDbIdLocal();
      let availability = null;
      if (equipmentId) {
        const stored = await getEquipmentCheckMKMonitoring(equipmentId, periodKey, {
          signal: controller.signal
        }).catch(() => null);
        if (controller.signal.aborted) return;
        availability = stored?.availabilityByPeriod?.[periodKey] ?? stored?.checkmkData?.availability ?? null;
      }
      if (!availability) {
        const availRes = await getCheckMKAvailability(mapping.checkmk_host_name, mapping.checkmk_site || null, startTime.toISOString(), endTime.toISOString(), {
          signal: controller.signal
        }).catch(() => null);
        availability = availRes?.availability ?? availRes ?? null;
      }
      if (controller.signal.aborted) return;
      const prevByPeriod = checkmkData?.availabilityByPeriod || {};
      const nextCheckmkData = checkmkData ? {
        ...checkmkData,
        availability,
        availabilityByPeriod: {
          ...prevByPeriod,
          [periodKey]: availability
        }
      } : checkmkData;
      setCheckmkData(nextCheckmkData);
    } catch (error) {
      if (error?.name === "AbortError") return;
      console.error("Error loading availability:", error);
    } finally {
      if (!controller.signal.aborted) setLoadingAvailability(false);
    }
  };
  const openCheckMKService = service => {
    const hostName = checkmkMapping?.checkmk_host_name;
    if (!hostName) return;
    const serviceDescription = service?.description || (service?.id && service.id.includes(':') ? service.id.split(':').slice(1).join(':') : null) || service?.title || service?.name || null;
    if (!serviceDescription) return;
    const baseUrl = 'https://monitoring.psi.fr/clients/check_mk/view.py';
    const params = new URLSearchParams({
      view_name: 'service',
      host: hostName,
      service: serviceDescription
    });
    window.open(`${baseUrl}?${params.toString()}`, '_blank', 'noopener');
  };
  const openCheckMKEvent = event => {
    const hostName = event?.host ?? event?.log_host ?? checkmkMapping?.checkmk_host_name;
    if (!hostName) return;
    const baseUrl = 'https://monitoring.psi.fr/clients/check_mk/view.py';
    const serviceDescription = event?.service ?? event?.log_service_description ?? null;
    if (serviceDescription) {
      const params = new URLSearchParams({
        view_name: 'service',
        host: hostName,
        service: serviceDescription
      });
      window.open(`${baseUrl}?${params.toString()}`, '_blank', 'noopener');
    } else {
      const params = new URLSearchParams({
        view_name: 'host',
        host: hostName
      });
      window.open(`${baseUrl}?${params.toString()}`, '_blank', 'noopener');
    }
  };
  const handleMappingSaved = mapping => {
    if (mapping?.checkmk_host_name) {
      const nextMapping = {
        is_active: true,
        ...mapping,
        checkmk_host_name: mapping.checkmk_host_name,
        checkmk_site: mapping.checkmk_site ?? null,
        checkmk_service_name: mapping.checkmk_service_name ?? null
      };
      setCheckmkMapping(nextMapping);
      if (onUpdate) {
        onUpdate({
          ...equipment,
          checkmkMapping: nextMapping
        });
      }
      setTimeout(() => {
        loadCheckMKData({
          force: true
        });
      }, 500);
    } else {
      setCheckmkMapping(null);
      setCheckmkData(null);
      setCheckmkHostDetails(null);
      if (onUpdate) {
        const {
          checkmkMapping: _removed,
          checkmk_host_name: _host,
          checkmk_site: _site,
          checkmk_service_name: _service,
          ...equipmentWithoutMapping
        } = equipment;
        const raw = {
          ...(equipment.rawData || {})
        };
        const inner = raw.data && typeof raw.data === "object" && !Array.isArray(raw.data) ? {
          ...raw.data
        } : null;
        delete raw.checkmkMapping;
        delete raw.checkmk_host_name;
        delete raw.checkmk_site;
        delete raw.checkmk_service_name;
        if (inner) {
          delete inner.checkmkMapping;
          delete inner.checkmk_host_name;
          delete inner.checkmk_site;
          delete inner.checkmk_service_name;
        }
        onUpdate({
          ...equipmentWithoutMapping,
          checkmkMapping: null,
          checkmk_host_name: null,
          checkmk_site: null,
          checkmk_service_name: null,
          rawData: inner ? {
            ...raw,
            data: inner
          } : raw
        });
      }
    }
  };
  const storageTypeValue = (formData.type || equipment?.rawData?.type || equipment?.type || '').toString().toLowerCase();
  const isNasOrSanStorage = equipment?.type === 'NAS' && (storageTypeValue.includes('nas') || storageTypeValue.includes('san'));
  const isSynologyNasStorage = isNasOrSanStorage && isSynologyBrand(formData.manufacturer);
  const typeDisplayLabel = useMemo(() => getEquipmentDetailTypeLabel(equipment, locale), [equipment, locale]);
  const raidOptions = ["RAID 0", "RAID 1", "RAID 5", "RAID 6", "RAID 10", "RAID 50", "RAID 60", "SHR (Synology)", "SHR-2 (Synology)", "RAID F1", "Qtier (QNAP)", "RAID-TP (QNAP)", "RAID-Z (ZFS)", "RAID-Z2 (ZFS)", "RAID-Z3 (ZFS)", "Autre"];
  const lunRoleOptions = [{
    value: "stockage",
    label: "Storage"
  }, {
    value: "exploitation",
    label: "Exploitation"
  }];
  const internetCategorieOptions = ["Primary", "Backup"];
  const internetTypeOptions = ["Fibre", "ADSL", "SDSL", "VDSL", "4G", "5G", "Satellite", "Câble", "Radio", "SD-WAN", "Autre"];
  const nasRoleOptions = ["Storage de sauvegarde", "Storage de fichiers communs", "Storage principal", "Storage d'archivage", "Storage de réplication", "Autre"];
  const osOptions = ["Windows Server 2012 R2 Standard", "Windows Server 2012 R2 Datacenter", "Windows Server 2016 Standard", "Windows Server 2016 Datacenter", "Windows Server 2019 Standard", "Windows Server 2019 Datacenter", "Windows Server 2022 Standard", "Windows Server 2022 Datacenter", "Windows Server 2025 Standard", "Windows Server 2025 Datacenter", "Windows 10 Pro", "Windows 10 Enterprise", "Windows 11 Pro", "Windows 11 Enterprise", "Ubuntu Server 18.04 LTS", "Ubuntu Server 20.04 LTS", "Ubuntu Server 22.04 LTS", "Ubuntu Server 24.04 LTS", "Ubuntu Desktop 20.04 LTS", "Ubuntu Desktop 22.04 LTS", "Ubuntu Desktop 24.04 LTS", "Debian 10 (Buster)", "Debian 11 (Bullseye)", "Debian 12 (Bookworm)", "Debian 13 (Trixie)", "CentOS 6", "CentOS 7", "CentOS 8", "CentOS Stream 8", "CentOS Stream 9", "CentOS Stream 10", "Red Hat Enterprise Linux 6", "Red Hat Enterprise Linux 7", "Red Hat Enterprise Linux 8", "Red Hat Enterprise Linux 9", "Red Hat Enterprise Linux 10", "SUSE Linux Enterprise Server 12", "SUSE Linux Enterprise Server 15", "SUSE Linux Enterprise Server 16", "openSUSE Leap 15", "openSUSE Leap 16", "openSUSE Tumbleweed", "VMware ESXi 6.5", "VMware ESXi 6.7", "VMware ESXi 7.0", "VMware ESXi 8.0", "VMware ESXi 8.1", "VMware ESXi 8.2", "VMware vCenter Server 6.7", "VMware vCenter Server 7.0", "VMware vCenter Server 8.0", "Proxmox VE 6.x", "Proxmox VE 7.x", "Proxmox VE 8.x", "AlmaLinux 8", "AlmaLinux 9", "Rocky Linux 8", "Rocky Linux 9", "Oracle Linux 7", "Oracle Linux 8", "Oracle Linux 9", "Fedora Server 37", "Fedora Server 38", "Fedora Server 39", "Fedora Server 40", "FreeBSD 12", "FreeBSD 13", "FreeBSD 14", "TrueNAS Core", "TrueNAS Scale", "Citrix XenServer 7.1", "Citrix XenServer 8.0", "Citrix XenServer 8.2", "Microsoft Hyper-V Server 2019", "Microsoft Hyper-V Server 2022", "Autre"];
  const handleLogClick = log => {
    setSelectedLogDetail(log);
  };
  const closeLogModal = () => {
    setSelectedLogDetail(null);
  };
  const handleAddEquipmentTag = async ({
    label,
    color
  }) => {
    const trimmed = String(label || "").trim();
    if (!trimmed || !canManageEquipmentTags || addingEquipmentTag) return;
    setAddingEquipmentTag(true);
    try {
      const tag = await addEquipmentTag(equipmentDbId, equipmentClientId, {
        label: trimmed,
        color
      });
      setEquipmentTags(prev => {
        const next = prev.some(t => t.id === tag.id)
          ? prev
          : [...prev, tag].sort((a, b) => a.label.localeCompare(b.label));
        patchEquipmentCache(equipmentDbId, {
          tags: next
        });
        return next;
      });
      setEquipmentTagModalOpen(false);
      toast.success(copy.toasts.tagAdded);
    } catch (error) {
      console.error("Error ajout tag device:", error);
      toast.error(error.message || copy.toasts.tagAddError);
    } finally {
      setAddingEquipmentTag(false);
    }
  };
  const handleRemoveEquipmentTag = async tagId => {
    if (!canManageEquipmentTags) return;
    try {
      await removeEquipmentTag(equipmentDbId, equipmentClientId, tagId);
      setEquipmentTags(prev => {
        const next = prev.filter(t => t.id !== tagId);
        patchEquipmentCache(equipmentDbId, {
          tags: next
        });
        return next;
      });
      toast.success(copy.toasts.tagRemoved);
    } catch (error) {
      console.error("Error suppression tag device:", error);
      toast.error(error.message || copy.toasts.tagRemoveError);
    }
  };
  const openEnterprise = useCallback((options = {}) => {
    const clientId = getEquipmentClientId(equipment) || equipment?.clientId;
    if (!onNavigate || !clientId) return;
    onNavigate("ContratDetail", {
      clientId,
      name: equipment?.clientName || modalClient?.name || ""
    }, options.background ? {
      background: true
    } : undefined);
  }, [equipment, modalClient?.name, onNavigate]);
  const handleQuickCreateTicket = useCallback(() => {
    const clientId = getEquipmentClientId(equipment) || equipment?.clientId;
    if (!onNavigate || !clientId) return;
    onNavigate("TicketCreate", {
      clientId,
      equipmentId: equipmentDbId || equipment?.id,
      equipmentName: equipment?.name || formData?.name || ""
    });
  }, [equipment, equipmentDbId, formData?.name, onNavigate]);
  const equipmentHeroTitle = equipment?.type === "Internet" ? formData.fournisseur && formData.internetType ? `${formData.fournisseur.toUpperCase()} ${formData.internetType.toUpperCase()}` : equipment.name : equipment?.name;
  const createdAtRaw = getEquipmentCreatedAt(equipment);
  const createdAtFormatted = (() => {
    if (!createdAtRaw) return null;
    const date = new Date(createdAtRaw);
    if (Number.isNaN(date.getTime())) return null;
    const localeCode = locale === "en" ? "en-GB" : locale === "de" ? "de-DE" : locale === "it" ? "it-IT" : locale === "es" ? "es-ES" : "fr-FR";
    return date.toLocaleDateString(localeCode, {
      day: "2-digit",
      month: "short",
      year: "numeric"
    });
  })();
  const createdAtLabel = createdAtFormatted ? interpolate(copy.hero.createdInVeritas, {
    date: createdAtFormatted
  }) : null;
  const equipmentIsActive = readEquipmentIsActive(equipment);
  const rmmOnline = rmmManaged ? resolveRmmAgentOnline(equipmentWithRmmLive || equipment, rmmHeartbeatMinutes) : null;
  const equipmentStatusOnline = rmmOnline === true;
  const equipmentStatusOffline = rmmOnline === false;
  const equipmentStatusLabel = equipmentStatusOnline
    ? copy.hero.online || "En ligne"
    : equipmentStatusOffline
      ? copy.hero.offline || "Hors ligne"
      : equipmentIsActive
        ? copy.hero.active
        : copy.hero.inactive;
  const equipmentStatusActive = equipmentStatusOnline || (!equipmentStatusOffline && equipmentIsActive);
  const maintenanceUntilRaw =
    activeMaintenance?.excludedUntil || activeMaintenance?.excluded_until || null;
  let maintenanceUntilLabel = "";
  if (maintenanceUntilRaw) {
    const ms = new Date(maintenanceUntilRaw).getTime();
    if (Number.isFinite(ms)) {
      try {
        maintenanceUntilLabel = new Date(ms).toLocaleString(locale || undefined, {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit"
        });
      } catch {
        maintenanceUntilLabel = new Date(ms).toLocaleString();
      }
    }
  }
  const maintenanceUntilSuffix = maintenanceUntilLabel
    ? interpolate(copy.hero.maintenanceUntil || " jusqu’au {date}", { date: maintenanceUntilLabel })
    : "";
  const maintenanceBadgeTitle = interpolate(copy.hero.maintenanceTooltipActive || "En maintenance{until}", {
    until: maintenanceUntilSuffix
  });
  const maintenanceReason = String(activeMaintenance?.reason || "").trim();
  const maintenanceReasonLabel = copy.hero.maintenanceReasonLabel || "Motif";
  const showQuickConnectHero = Boolean(isSynologyNasStorage && formData.quickConnect);
  const showCheckmkHeroMenu = Boolean(checkmkIntegrationEnabled && equipment?.type !== "Internet");
  const showRmmHeroMenu = Boolean(rmmManaged && rmmAgentId);
  const heroIcon = getFleetFamilyIcon(
    equipment?.type,
    equipment?.familyIcon || equipment?.customFamily?.icon
  );
  const rmmInventory = getRmmInventoryFromEquipment(equipmentWithRmmLive || equipment);
  const rmmOsInfo = getRmmOsEditionInfo(rmmInventory, equipment);
  const rmmChassis = getRmmChassisInfo(rmmInventory);
  const heroOsLabel = rmmOsInfo.osCaption || formData.systeme || equipment?.systeme || null;
  const heroManufacturer = rmmChassis.manufacturer || formData.manufacturer || equipment?.manufacturer || null;
  const heroModel = rmmChassis.model || formData.model || equipment?.model || null;
  const heroIp = equipment?.ip || formData.ip || rmmInventory?.network?.ip || rmmInventory?.ip || null;
  const heroSite = findClientSiteByLocation(clientSites, formData.location || equipment?.location);
  const heroSiteLabel = getSiteDisplayName(heroSite) || formData.location || equipment?.location || null;
  const heroSerial = rmmChassis.serial || formData.serial || equipment?.serial || null;
  const deviceNote = String(formData.commentaire || equipment?.commentaire || "").trim();
  const deviceNotePreview =
    deviceNote.length > 96 ? `${deviceNote.slice(0, 96).trimEnd()}…` : deviceNote;
  const heroFacts = [
    typeDisplayLabel
      ? { key: "family", icon: heroIcon || "mdi:devices", label: copy.hero.factType || copy.hero.factFamily || "Type", value: typeDisplayLabel }
      : null,
    heroOsLabel
      ? { key: "os", icon: "mdi:monitor-screenshot", label: copy.hero.factOs || "OS", value: heroOsLabel }
      : null,
    heroSiteLabel ? { key: "site", icon: "mdi:map-marker-outline", label: copy.hero.factSite || "Site", value: heroSiteLabel } : null,
    heroManufacturer ? { key: "mfr", icon: "mdi:domain", label: copy.hero.factManufacturer, value: heroManufacturer } : null,
    heroModel ? { key: "model", icon: "mdi:tag-outline", label: copy.hero.factModel, value: heroModel } : null,
    heroSerial ? { key: "serial", icon: "mdi:barcode", label: copy.hero.factSerial || "N° de série", value: heroSerial } : null,
    heroIp ? { key: "ip", icon: "mdi:ip-network-outline", label: copy.hero.factIp, value: heroIp } : null
  ].filter(Boolean);
  if (!equipment) {
    return <div className={styles.detailPage}>
        <div className={styles.error}>{copy.notFound}</div>
      </div>;
  }

  return <div ref={pageRootRef} className={`${enterpriseDetailStyles.contratDetailPage} ${enterpriseDetailStyles.enterpriseDetailPage} ${enterpriseDetailStyles.equipmentDetailPage} ${styles.equipmentDetailPage} ${inMaintenance ? styles.heroInMaintenance : ""} msp-page-grid`.trim()}>
      <header className={enterpriseDetailStyles.pageHero} data-guide="equipment-hero">
        <div className={enterpriseDetailStyles.heroTop}>
          <div className={enterpriseDetailStyles.heroIdentityBlock}>
              <div
                className={`${enterpriseDetailStyles.heroCover} ${inMaintenance ? styles.heroCoverMaintenance : ""}`.trim()}
                aria-hidden
              />
              <div className={`${enterpriseDetailStyles.heroIdentityRow} ${styles.heroIdentityRowEquip}`.trim()}>
                <div className={enterpriseDetailStyles.heroMain}>
                  <span className={`${enterpriseDetailStyles.heroBrandIcon} ${inMaintenance ? styles.heroBrandIconMaintenance : ""}`.trim()} aria-hidden>
                    <Icon icon={inMaintenance ? "mdi:traffic-cone" : heroIcon} width={30} height={30} />
                  </span>
                  <div className={enterpriseDetailStyles.heroText}>
                    <h1 className={enterpriseDetailStyles.heroTitle}>
                      <span className={enterpriseDetailStyles.heroTitleName}>{equipmentHeroTitle}</span>
                      <span className={`${enterpriseDetailStyles.heroStatusBadge} ${equipmentStatusActive ? "" : enterpriseDetailStyles.heroStatusBadgeInactive}`.trim()}>
                        <StatusDot active={equipmentStatusActive} label="" className={enterpriseDetailStyles.heroTitleStatus} />
                        {equipmentStatusLabel}
                      </span>
                      {inMaintenance ? (
                        <span
                          className={styles.heroMaintenanceBadge}
                          title={maintenanceBadgeTitle}
                          aria-label={copy.hero.maintenanceBadge || "En maintenance"}
                        >
                          <Icon icon="mdi:traffic-cone" width={12} height={12} aria-hidden />
                          {copy.hero.maintenanceBadge || "En maintenance"}
                        </span>
                      ) : null}
                    </h1>
                    {inMaintenance && maintenanceReason ? (
                      <p className={styles.heroMaintenanceReason} title={maintenanceReason}>
                        <span className={styles.heroMaintenanceReasonLabel}>{maintenanceReasonLabel}</span>
                        <span className={styles.heroMaintenanceReasonText}>{maintenanceReason}</span>
                      </p>
                    ) : null}
                    <div className={enterpriseDetailStyles.heroMeta} aria-label={copy.hero.metaAria}>
                      {(() => {
                  const enterpriseId = getEquipmentClientId(equipment) || equipment?.clientId;
                  const enterpriseName = equipment?.clientName || modalClient?.name || "";
                  if (!enterpriseName && !enterpriseId) return null;
                  const enterpriseClient = modalClient && String(modalClient.id) === String(enterpriseId) ? modalClient : {
                    id: enterpriseId,
                    name: enterpriseName,
                    client_number: equipment?.clientNumber ?? equipment?.client_number,
                    clientNumber: equipment?.clientNumber ?? equipment?.client_number
                  };
                  const code = getClientNumber(enterpriseClient);
                  const label = getClientNameWithoutCode(enterpriseClient) || enterpriseName || "";
                  if (!label && !code) return null;
                  const companyContent = <>
                        <Icon icon="mdi:domain" aria-hidden />
                        {code ? <>
                            <span className={enterpriseDetailStyles.headerClientCode}>{code}</span>
                            {label}
                          </> : label}
                      </>;
                  if (!enterpriseId || !onNavigate) {
                    return <span className={enterpriseDetailStyles.heroMetaItem}>
                          {companyContent}
                        </span>;
                  }
                  return <button type="button" className={`${enterpriseDetailStyles.heroMetaItem} ${enterpriseDetailStyles.heroMetaLink}`} onClick={() => openEnterprise()} onMouseDown={e => {
                    if (e.button === 1) {
                      e.preventDefault();
                      openEnterprise({
                        background: true
                      });
                    }
                  }} onAuxClick={e => {
                    if (e.button === 1) {
                      e.preventDefault();
                      openEnterprise({
                        background: true
                      });
                    }
                  }} title={copy.hero.viewEnterprise} aria-label={copy.hero.viewEnterprise}>
                        {companyContent}
                      </button>;
                })()}
                      {createdAtLabel ? <span className={enterpriseDetailStyles.heroMetaItem} title={copy.stats.createdInVeritas}>
                          <Icon icon="mdi:calendar-plus" aria-hidden />
                          {createdAtLabel}
                        </span> : null}
                      {loadingEquipmentTags ? <span className={enterpriseDetailStyles.heroTagsLoading}>{copy.loadingTags}</span> : <>
                          {equipmentTags.map(tag => <span key={tag.id} className={enterpriseDetailStyles.heroTagChip} style={{
                    backgroundColor: `${tag.color || "#2b5fab"}18`,
                    borderColor: `${tag.color || "#2b5fab"}55`,
                    color: tag.color || "#2b5fab"
                  }}>
                              {tag.label}
                              {canManageEquipmentTags ? <button type="button" className={enterpriseDetailStyles.heroTagRemove} onClick={() => handleRemoveEquipmentTag(tag.id)} aria-label={interpolate(copy.hero.removeTag, {
                      label: tag.label
                    })}>
                                <FaTimes />
                              </button> : null}
                            </span>)}
                          {canManageEquipmentTags ? <div className={enterpriseDetailStyles.heroTagAddWrap}>
                            <SmartTooltip content={copy.hero.addTag}>
                              <button type="button" className={enterpriseDetailStyles.heroTagAddTrigger} onClick={() => setEquipmentTagModalOpen(true)} aria-label={copy.hero.addTag}>
                                <FaPlus />
                              </button>
                            </SmartTooltip>
                          </div> : null}
                        </>}
                    </div>
                    {showRmmHeroStatus ? <RmmCollectionStatusLine equipment={equipmentWithRmmLive} heartbeatIntervalMinutes={rmmHeartbeatMinutes} locale={locale} copy={copy} compact className={enterpriseDetailStyles.heroMetaItemRmm} /> : null}
                  </div>
                </div>
                {deviceNote ? (
                  <div className={styles.heroRightCluster}>
                    <SmartTooltip
                      content={
                        <div className={styles.heroNoteTooltip}>
                          <strong className={styles.heroNoteTooltipTitle}>{copy.hero.factNote || "Note"}</strong>
                          <p className={styles.heroNoteTooltipBody}>{deviceNote}</p>
                        </div>
                      }
                      data-tooltip-position="bottom-end"
                    >
                      <div
                        className={styles.heroNoteChip}
                        tabIndex={0}
                        aria-label={`${copy.hero.factNote || "Note"}: ${deviceNote}`}
                      >
                        <Icon icon="mdi:note-text-outline" className={styles.heroNoteIcon} aria-hidden />
                        <div className={styles.heroNoteText}>
                          <span className={styles.heroNoteLabel}>{copy.hero.factNote || "Note"}</span>
                          <span className={styles.heroNotePreview}>{deviceNotePreview}</span>
                        </div>
                      </div>
                    </SmartTooltip>
                  </div>
                ) : null}
              </div>

            {heroFacts.length ? <div
              className={enterpriseDetailStyles.heroFactStrip}
              aria-label={copy.hero.factsAria}
            >
                {heroFacts.map(fact => <div key={fact.key} className={enterpriseDetailStyles.heroFactItem}>
                    <span className={enterpriseDetailStyles.heroFactIcon} aria-hidden>
                      <Icon icon={fact.icon} />
                    </span>
                    <div className={enterpriseDetailStyles.heroFactText}>
                      <span className={enterpriseDetailStyles.heroFactLabel}>{fact.label}</span>
                      <span className={enterpriseDetailStyles.heroFactValue} title={String(fact.value)}>{fact.value}</span>
                    </div>
                  </div>)}
              </div> : null}
          </div>
        </div>
      </header>

      <div className={`${enterpriseDetailStyles.pageBody} ${enterpriseDetailStyles.pageBodyFill} ${styles.shell}`.trim()}>
        <div className={`${enterpriseDetailStyles.pageGrid} ${styles.pageGridEquip}`.trim()}>
        <div className={`${enterpriseDetailStyles.mainColumn} ${enterpriseDetailStyles.mainColumnEquipmentFill} ${styles.mainColumnEquip}`.trim()}>
        <nav
          ref={heroTabsRef}
          className={`${enterpriseDetailStyles.heroTabBar} ${styles.heroTabBarGrouped} ${styles.heroTabBarAnimated}`.trim()}
          data-indicator-ready={heroTabIndicator.ready ? "true" : "false"}
          role="tablist"
          aria-label={copy.tabs.aria}
        >
          <span
            className={styles.heroTabIndicator}
            style={{
              transform: `translateX(${heroTabIndicator.left}px)`,
              width: heroTabIndicator.width,
              opacity: heroTabIndicator.ready ? 1 : 0
            }}
            aria-hidden
          />
          <div className={styles.heroTabGroup} role="presentation">
            <button type="button" role="tab" aria-selected={rightPanelTab === "fiche"} className={`${enterpriseDetailStyles.heroTab} ${rightPanelTab === "fiche" ? enterpriseDetailStyles.heroTabActive : ""}`} onClick={() => setRightPanelTab("fiche")}>
              <Icon icon="mdi:clipboard-text-outline" className={enterpriseDetailStyles.heroTabIcon} aria-hidden />
              <span className={enterpriseDetailStyles.heroTabLabel}>{copy.tabs.fiche || "Informations matériel"}</span>
            </button>
            <button type="button" role="tab" aria-selected={rightPanelTab === "activity" || rightPanelTab === "events" || rightPanelTab === "stats" || rightPanelTab === "metrics"} className={`${enterpriseDetailStyles.heroTab} ${rightPanelTab === "activity" || rightPanelTab === "events" || rightPanelTab === "stats" || rightPanelTab === "metrics" ? enterpriseDetailStyles.heroTabActive : ""}`} onClick={() => openActivityTab()}>
              <Icon icon="mdi:chart-timeline-variant" className={enterpriseDetailStyles.heroTabIcon} aria-hidden />
              <span className={enterpriseDetailStyles.heroTabLabel}>{copy.tabs.activity}</span>
            </button>
            <button type="button" role="tab" aria-selected={rightPanelTab === "documents"} className={`${enterpriseDetailStyles.heroTab} ${rightPanelTab === "documents" ? enterpriseDetailStyles.heroTabActive : ""}`} onClick={() => setRightPanelTab("documents")}>
              <Icon icon="mdi:file-document-outline" className={enterpriseDetailStyles.heroTabIcon} aria-hidden />
              <span className={enterpriseDetailStyles.heroTabLabel}>{copy.tabs.documents}</span>
            </button>
            <button type="button" role="tab" aria-selected={rightPanelTab === "logs"} className={`${enterpriseDetailStyles.heroTab} ${rightPanelTab === "logs" ? enterpriseDetailStyles.heroTabActive : ""}`} onClick={() => setRightPanelTab("logs")}>
              <Icon icon="mdi:history" className={enterpriseDetailStyles.heroTabIcon} aria-hidden />
              <span className={enterpriseDetailStyles.heroTabLabel}>{copy.tabs.logs}</span>
            </button>
          </div>

          {showRmmTabGroup ? (
            <>
              <span className={styles.heroTabSep} aria-hidden />
              <div className={styles.heroTabGroup} role="presentation" data-tab-group="rmm">
                {showSyntheseTab ? (
                  <button type="button" role="tab" aria-selected={rightPanelTab === "synthese"} className={`${enterpriseDetailStyles.heroTab} ${rightPanelTab === "synthese" ? enterpriseDetailStyles.heroTabActive : ""}`} onClick={() => setRightPanelTab("synthese")}>
                    <Icon icon="mdi:chart-box-outline" className={enterpriseDetailStyles.heroTabIcon} aria-hidden />
                    <span className={enterpriseDetailStyles.heroTabLabel}>{copy.tabs.synthese || "Synthèse RMM"}</span>
                  </button>
                ) : null}
                {showRmmOperationsTab ? (
                  <button type="button" role="tab" aria-selected={rightPanelTab === "operations"} className={`${enterpriseDetailStyles.heroTab} ${rightPanelTab === "operations" ? enterpriseDetailStyles.heroTabActive : ""}`} onClick={() => setRightPanelTab("operations")}>
                    <Icon icon="mdi:shield-lock-outline" className={enterpriseDetailStyles.heroTabIcon} aria-hidden />
                    <span className={enterpriseDetailStyles.heroTabLabel}>{copy.tabs.cybersecurity || copy.tabs.system}</span>
                  </button>
                ) : null}
                {showRmmPeripheralsTab ? (
                  <button type="button" role="tab" aria-selected={rightPanelTab === "peripherals"} className={`${enterpriseDetailStyles.heroTab} ${rightPanelTab === "peripherals" ? enterpriseDetailStyles.heroTabActive : ""}`} onClick={() => setRightPanelTab("peripherals")}>
                    <Icon icon="mdi:package-variant-closed" className={enterpriseDetailStyles.heroTabIcon} aria-hidden />
                    <span className={enterpriseDetailStyles.heroTabLabel}>{copy.tabs.inventory || copy.tabs.peripherals}</span>
                  </button>
                ) : null}
              </div>
            </>
          ) : null}

          {showSupervisionTabGroup ? (
            <>
              <span className={styles.heroTabSep} aria-hidden />
              <div className={styles.heroTabGroup} role="presentation" data-tab-group="supervision">
                <button type="button" role="tab" aria-selected={rightPanelTab === "supervision"} className={`${enterpriseDetailStyles.heroTab} ${rightPanelTab === "supervision" ? enterpriseDetailStyles.heroTabActive : ""}`} onClick={() => setRightPanelTab("supervision")}>
                  <Icon icon="mdi:radar" className={enterpriseDetailStyles.heroTabIcon} aria-hidden />
                  <span className={enterpriseDetailStyles.heroTabLabel}>{copy.tabs.supervision}</span>
                </button>
              </div>
            </>
          ) : null}
        </nav>
        {rmmManaged && rmmSyncPending ? <RmmSyncPendingNotice equipment={equipment} syncRequestedAt={rmmSyncRequestedAt} heartbeatIntervalMinutes={rmmHeartbeatMinutes} onCancel={handleRmmCancelSync} cancelling={rmmSyncRequesting} /> : null}

        <div ref={mainContentRef} className={styles.mainContent}>
          {rightPanelTab === "synthese" && showSyntheseTab ? (
              <div key="synthese" className={`${styles.dashboardSplit} ${styles.dashboardSplitSolo} ${styles.contentFadeUp}`.trim()}>
                <div className={styles.dashboardMain}>
                  <EquipmentOverviewDashboard
                    equipment={equipmentWithRmmLive || equipment}
                    checkmkData={checkmkData}
                    checkmkAvailabilityPeriod={checkmkAvailabilityPeriod}
                    loadingCheckMK={loadingCheckMK}
                    maintenanceHistoryKey={maintenanceHistoryKey}
                    showRmmTab={rmmManaged}
                    showSupervisionTab={hasCheckmkHost}
                    forcedPane={rmmManaged ? "rmm" : "supervision"}
                    hidePaneSwitch
                  />
                </div>
              </div>
            ) : null}

          {rightPanelTab === "fiche" ? (
              <div key="fiche" className={`${styles.ficheLayout} ${styles.contentFadeUp}`.trim()}>
                <div
                  className={`${styles.ficheMainRow} ${showRmmHeroStatus && rmmDeviceHealth ? styles.ficheMainRowWithScore : ""}`.trim()}
                >
                  <EquipmentDetailSpecsPanel
                    bare
                    column
                    hideResources
                    sectionFilter="lifecycle"
                    equipment={equipment}
                    formData={formData}
                    clientSites={clientSites}
                    clientSsids={clientSsids}
                    peerFirewalls={peerFirewalls}
                    peerServers={peerServers}
                    peerStorage={peerStorage}
                    onOpenEquipment={openLinkedEquipment}
                  />
                  {showRmmHeroStatus && rmmDeviceHealth ? (
                    <div className={styles.ficheScoreCol}>
                      <ScoreAside
                        health={rmmDeviceHealth}
                        copy={{
                          scoreTitle: copy.rmm.overview?.scoreTitle || copy.rmm.cyber?.scoreTitle,
                          breakdownTitle: copy.rmm.overview?.scoreBreakdownTitle,
                          breakdownHint: copy.rmm.overview?.scoreBreakdownHint,
                          breakdownEmpty: copy.rmm.overview?.scoreBreakdownEmpty,
                          statusOk: copy.rmm.overview?.scoreStatusOk,
                          statusBad: copy.rmm.overview?.scoreStatusBad,
                          statusUnknown: copy.rmm.overview?.scoreStatusUnknown,
                          statusOkHint: copy.rmm.overview?.scoreStatusOkHint,
                          statusUnknownHint: copy.rmm.overview?.scoreStatusUnknownHint,
                          checks: copy.rmm.overview?.scoreChecks,
                          formatPenalty: points => interpolate(copy.rmm.overview?.scorePenalty || "−{points}", {
                            points: String(points)
                          })
                        }}
                      />
                    </div>
                  ) : null}
                </div>
                <div className={styles.ficheSecondaryRow}>
                  <EquipmentDetailSpecsPanel
                    bare
                    hideResources={false}
                    sectionFilter="rest"
                    equipment={equipment}
                    formData={formData}
                    clientSites={clientSites}
                    clientSsids={clientSsids}
                    peerFirewalls={peerFirewalls}
                    peerServers={peerServers}
                    peerStorage={peerStorage}
                    onOpenEquipment={openLinkedEquipment}
                  />
                </div>
              </div>
            ) : null}

          {rightPanelTab === "supervision" && showSupervisionTab ? <div key="supervision" className={`${styles.supervisionStack} ${styles.contentFadeUp}`.trim()}>
              <div
                ref={supervisionSwitchRef}
                className={`${styles.activitySwitch} ${styles.activitySwitchAnimated}`.trim()}
                data-indicator-ready={supervisionSwitchIndicator.ready ? "true" : "false"}
                role="tablist"
                aria-label={copy.supervisionPane?.aria || copy.tabs.supervision}
              >
                <span
                  className={styles.activitySwitchIndicator}
                  style={{
                    transform: `translateX(${supervisionSwitchIndicator.left}px)`,
                    width: supervisionSwitchIndicator.width,
                    opacity: supervisionSwitchIndicator.ready ? 1 : 0
                  }}
                  aria-hidden
                />
                <button type="button" role="tab" aria-selected={supervisionPane === "main"} className={`${styles.activitySwitchBtn} ${supervisionPane === "main" ? styles.activitySwitchBtnActive : ""}`} onClick={() => setSupervisionPane("main")}>
                  <Icon icon="mdi:radar" aria-hidden />
                  {copy.supervisionPane?.main || "Main"}
                </button>
                <button type="button" role="tab" aria-selected={supervisionPane === "history"} className={`${styles.activitySwitchBtn} ${supervisionPane === "history" ? styles.activitySwitchBtnActive : ""}`} onClick={() => setSupervisionPane("history")}>
                  <Icon icon="mdi:clipboard-text-clock-outline" aria-hidden />
                  {copy.supervisionPane?.history || copy.tabs.history || "Historique"}
                </button>
              </div>

              {supervisionPane === "main" ? <section key="supervision-main" className={`${enterpriseDetailStyles.panel} ${styles.supervisionMainPanel} ${styles.contentFadeUp}`.trim()}>
                  <div className={`${enterpriseDetailStyles.panelBody} ${styles.supervisionPanelBody}`}>
                    <CheckMKMonitoringPanel equipment={equipment} checkmkMapping={checkmkMapping} checkmkData={checkmkData} checkmkHostDetails={checkmkHostDetails} loadingCheckMK={loadingCheckMK} loadingAvailability={loadingAvailability} checkmkAvailabilityPeriod={checkmkAvailabilityPeriod} lastSyncedAt={checkmkLastSyncedAt} layout="tab" onAvailabilityPeriodChange={period => {
                setCheckmkAvailabilityPeriod(period);
                loadCheckMKAvailabilityOnly(period);
              }} onOpenService={openCheckMKService} onOpenEvent={openCheckMKEvent} onOpenMapping={() => setCheckmkMappingModal(true)} />
                  </div>
                </section> : (
                <div key="supervision-history" className={`${styles.historyTabLayout} ${styles.contentFadeUp}`.trim()}>
                  <EquipmentAlertsGlance equipment={equipment} days={30} limit={50} />
                  {equipmentDbId ? (
                    <EquipmentMaintenanceHistoryPanel
                      copy={copy}
                      locale={locale}
                      equipmentId={equipmentDbId}
                      clientId={equipmentClientId}
                      refreshKey={maintenanceHistoryKey}
                    />
                  ) : (
                    <EquipmentEmptyState
                      icon="mdi:wrench-clock"
                      title={copy.maintenanceHistory?.emptyTitle || "Aucune période de maintenance"}
                      subtitle={copy.maintenanceHistory?.emptyHint || "Les mises en maintenance de ce périphérique apparaîtront ici."}
                    />
                  )}
                </div>
              )}
            </div> : null}

          {(rightPanelTab === 'activity' || rightPanelTab === 'events' || rightPanelTab === 'stats' || rightPanelTab === 'metrics') && <div key="activity" className={`${styles.activityStack} ${styles.contentFadeUp}`.trim()}>
              {showRmmMetricsTab ? <div
                ref={activitySwitchRef}
                className={`${styles.activitySwitch} ${styles.activitySwitchAnimated}`.trim()}
                data-indicator-ready={activitySwitchIndicator.ready ? "true" : "false"}
                role="tablist"
                aria-label={copy.activityPane?.aria || copy.tabs.activity}
              >
                  <span
                    className={styles.activitySwitchIndicator}
                    style={{
                      transform: `translateX(${activitySwitchIndicator.left}px)`,
                      width: activitySwitchIndicator.width,
                      opacity: activitySwitchIndicator.ready ? 1 : 0
                    }}
                    aria-hidden
                  />
                  <button type="button" role="tab" aria-selected={activityPane === "metrics"} className={`${styles.activitySwitchBtn} ${activityPane === "metrics" ? styles.activitySwitchBtnActive : ""}`} onClick={() => setActivityPane("metrics")}>
                    <Icon icon="mdi:chart-areaspline" aria-hidden />
                    {copy.activityPane?.metrics || copy.tabs.metrics}
                  </button>
                  <button type="button" role="tab" aria-selected={activityPane === "veritas"} className={`${styles.activitySwitchBtn} ${activityPane === "veritas" ? styles.activitySwitchBtnActive : ""}`} onClick={() => setActivityPane("veritas")}>
                    <Icon icon="mdi:ticket-confirmation-outline" aria-hidden />
                    {copy.activityPane?.veritas || "Interventions"}
                  </button>
                </div> : null}

              {showRmmMetricsTab && activityPane === "metrics" ? rmmMetricsAgent ? (
                <div key="activity-metrics" className={styles.contentFadeUp}>
                  <RmmMetricHistoryPanel agent={rmmMetricsAgent} active={rightPanelTab === "activity" || rightPanelTab === "metrics"} embedded />
                </div>
              ) : (
                <EquipmentEmptyState
                  key="activity-metrics-empty"
                  icon="mdi:chart-timeline-variant"
                  message={copy.metrics.unavailableTitle || copy.metrics.unavailableHint}
                  className={`${styles.supervisionEmptyFill} ${styles.contentFadeUp}`.trim()}
                />
              ) : (
                  <div key="activity-veritas" className={`${styles.activityVeritasLayout} ${styles.contentFadeUp}`.trim()}>
                    <EquipmentStatsPanel copy={copy} locale={locale} equipment={equipment} loading={loadingActivity} activity={activity} datePreset={activityDatePreset} onDatePresetChange={setActivityDatePreset} customStart={activityCustomStart} customEnd={activityCustomEnd} onCustomStartChange={setActivityCustomStart} onCustomEndChange={setActivityCustomEnd} alertSettings={alertSettings} rmmManaged={rmmManaged} onOpenEnterprise={openEnterprise} />
                    <EquipmentEventsPanel copy={copy} locale={locale} loading={loadingActivity} activity={activity} datePreset={activityDatePreset} onDatePresetChange={setActivityDatePreset} customStart={activityCustomStart} customEnd={activityCustomEnd} onCustomStartChange={setActivityCustomStart} onCustomEndChange={setActivityCustomEnd} onOpenPlanningEvent={handleOpenPlanningEvent} onOpenTicket={handleOpenLinkedTicket} hideDateFilter />
                  </div>
                )}
            </div>}

          {rightPanelTab === 'documents' && <section key="documents" className={`${enterpriseDetailStyles.panel} ${styles.contentFadeUp}`.trim()}>
              <header className={enterpriseDetailStyles.panelHeader}>
                <div>
                  <h2 className={enterpriseDetailStyles.panelTitle}>
                    <Icon icon="mdi:file-document-multiple-outline" className={enterpriseDetailStyles.panelTitleIcon} aria-hidden />
                    {copy.tabs.documents}
                  </h2>
                </div>
              </header>
              <div className={enterpriseDetailStyles.panelBody}>
                <EquipmentDocumentsPanel equipment={equipment} embedded />
              </div>
            </section>}

          {rightPanelTab === "peripherals" && showRmmPeripheralsTab ? (
            <div key="peripherals" className={styles.contentFadeUp}>
              <RmmMonitoringPanel equipment={equipment} heartbeatIntervalMinutes={rmmHeartbeatMinutes} variant="peripherals" agentStatusInHero={showRmmHeroStatus} />
            </div>
          ) : null}

          {rightPanelTab === "operations" && showRmmOperationsTab ? <div key="operations" className={`${styles.dashboardSplit} ${styles.contentFadeUp}`.trim()}>
              <div className={styles.dashboardMain}>
                <RmmMonitoringPanel equipment={equipmentWithRmmLive} syncPending={rmmSyncPending} syncRequestedAt={rmmSyncRequestedAt} heartbeatIntervalMinutes={rmmHeartbeatMinutes} variant="operations" agentStatusInHero={showRmmHeroStatus} />
              </div>
              <div className={styles.dashboardAside}>
                {showRmmHeroStatus && rmmDeviceHealth ? <ScoreAside health={rmmDeviceHealth} copy={{
              scoreTitle: copy.rmm.overview?.scoreTitle || copy.rmm.cyber?.scoreTitle,
              breakdownTitle: copy.rmm.overview?.scoreBreakdownTitle,
              breakdownHint: copy.rmm.overview?.scoreBreakdownHint,
              breakdownEmpty: copy.rmm.overview?.scoreBreakdownEmpty,
              statusOk: copy.rmm.overview?.scoreStatusOk,
              statusBad: copy.rmm.overview?.scoreStatusBad,
              statusUnknown: copy.rmm.overview?.scoreStatusUnknown,
              statusOkHint: copy.rmm.overview?.scoreStatusOkHint,
              statusUnknownHint: copy.rmm.overview?.scoreStatusUnknownHint,
              checks: copy.rmm.overview?.scoreChecks,
              formatPenalty: points => interpolate(copy.rmm.overview?.scorePenalty || "−{points}", {
                points: String(points)
              })
            }} /> : null}
              </div>
            </div> : null}

          {rightPanelTab === "logs" ? <section key="logs" className={`${enterpriseDetailStyles.panel} ${styles.logsPanel} ${styles.contentFadeUp}`.trim()}>
              <header className={enterpriseDetailStyles.panelHeader}>
                <div className={enterpriseDetailStyles.panelHeaderMain}>
                  <h2 className={enterpriseDetailStyles.panelTitle}>
                    <Icon icon="mdi:history" className={enterpriseDetailStyles.panelTitleIcon} aria-hidden />
                    {copy.logs.title}
                  </h2>
                </div>
              </header>
              <div className={`${enterpriseDetailStyles.panelBody} ${styles.logsPanelBody}`.trim()}>
                <div className={styles.logsToolbar}>
                  <div className={styles.logsSearchWrap}>
                    <Icon icon="mdi:magnify" className={styles.logsSearchIcon} aria-hidden />
                    <input type="search" className={styles.logsSearchInput} value={logsSearchDraft} onChange={event => setLogsSearchDraft(event.target.value)} placeholder={copy.logs.searchPlaceholder} aria-label={copy.logs.searchAria} />
                    {logsSearchDraft ? <button type="button" className={styles.logsSearchClear} onClick={() => setLogsSearchDraft("")} aria-label={copy.logs.clearSearch}>
                        <Icon icon="mdi:close" aria-hidden />
                      </button> : null}
                  </div>
                  <select className={styles.logsFilterSelect} value={logsCategory} onChange={event => setLogsCategory(event.target.value)} aria-label={copy.logs.filterAria}>
                    {LOG_FILTER_OPTIONS.map(option => <option key={option.value} value={option.value}>
                        {option.label}
                      </option>)}
                  </select>
                  <button type="button" className={styles.logsPurgeBtn} onClick={() => setPurgeLogsConfirmOpen(true)} disabled={loadingLogs || purgingLogs || logsTotal === 0} title={copy.logs.purgeTitle}>
                    <Icon icon="mdi:delete-sweep" aria-hidden />
                    {copy.logs.purge}
                  </button>
                </div>

                <div className={styles.logsTableFill}>
                  {loadingLogs ? <div className={styles.loadingState}>{copy.loading}</div> : logs.length === 0 ? (
                    <EquipmentEmptyState
                      icon="mdi:history"
                      message={logsFiltersActive ? copy.logs.emptyFiltered : copy.logs.empty}
                    />
                  ) : <div className={`${enterpriseDetailStyles.dataTableWrapper} ${styles.logsTableWrapper}`.trim()}>
                      <table className={`${enterpriseDetailStyles.dataTable} ${styles.logsTable}`.trim()}>
                        <thead>
                          <tr>
                            <th>{copy.logs.colAction}</th>
                            <th>{copy.logs.colUser}</th>
                            <th>{copy.logs.colDate}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {logs.map((log, index) => {
                            const logMeta = getLogActionDetails(log);
                            const logUser = log.user_name || log.user || copy.logs.systemUser;
                            const when = log.created_at || log.timestamp;
                            return <tr key={log.id || index} className={enterpriseDetailStyles.dataTableRowClickable} onClick={() => handleLogClick(log)} title={copy.logs.detailTitle}>
                              <td>
                                <span className={styles.logActionInline} style={{ color: logMeta.color }}>
                                  <Icon icon={logMeta.icon} aria-hidden />
                                  {log.action || logMeta.label}
                                </span>
                              </td>
                              <td>{logUser}</td>
                              <td className={styles.eventMetaCell}>
                                {when ? new Date(when).toLocaleString(getLocaleTag(locale), {
                                  day: "2-digit",
                                  month: "2-digit",
                                  year: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit"
                                }) : "—"}
                              </td>
                            </tr>;
                          })}
                        </tbody>
                      </table>
                    </div>}
                </div>

                {logsTotal > logsLimit ? <div className={styles.logsPagination}>
                    <button type="button" className={styles.paginationButton} onClick={() => loadLogs(logsPage - 1)} disabled={logsPage <= 1 || loadingLogs} aria-label="Page précédente">
                      <Icon icon="mdi:chevron-left" aria-hidden />
                    </button>
                    <span className={styles.paginationInfo}>
                      {interpolate(copy.logs.pagination, {
                        page: logsPage,
                        pages: Math.ceil(logsTotal / logsLimit),
                        total: logsTotal
                      })}
                    </span>
                    <button type="button" className={styles.paginationButton} onClick={() => loadLogs(logsPage + 1)} disabled={logsPage >= Math.ceil(logsTotal / logsLimit) || loadingLogs} aria-label="Page suivante">
                      <Icon icon="mdi:chevron-right" aria-hidden />
                    </button>
                  </div> : null}
              </div>
            </section> : null}
        </div>
        </div>

        <EquipmentDetailAside
          equipment={equipmentWithRmmLive || equipment}
          formData={formData}
          clientSites={clientSites}
          modalClient={modalClient}
          copy={copy}
          checkmkMapping={checkmkMapping}
          remoteAccessAction={remoteAccessAction}
          showQuickConnect={showQuickConnectHero}
          onEdit={openEditEquipmentModal}
          onCreateEvent={openCreateEventModal}
          onCreateTicket={handleQuickCreateTicket}
          onOpenEnterprise={() => openEnterprise()}
          onRemoteAccess={remoteAccessAction?.launch}
          onQuickConnect={() => {
            const url = buildQuickConnectUrl(formData.quickConnect);
            if (url) window.open(url, "_blank", "noopener,noreferrer");
          }}
          onOpenSupervision={showSupervisionTab ? () => {
            setSupervisionPane("main");
            setRightPanelTab("supervision");
          } : null}
          onRefreshCheckmk={checkmkMapping?.checkmk_host_name ? () => loadCheckMKData({ force: true }) : null}
          onOpenCheckmkMapping={showCheckmkHeroMenu ? () => setCheckmkMappingModal(true) : null}
          onRmmSync={showRmmHeroMenu ? (rmmSyncPending ? handleRmmCancelSync : handleRmmFullSync) : null}
          onRmmAgentUpdate={showRmmHeroMenu ? handleRmmAgentUpdate : null}
          onRmmCancelAgentUpdate={showRmmHeroMenu ? handleRmmCancelAgentUpdate : null}
          rmmSyncPending={rmmSyncPending}
          rmmUpdateRequested={Boolean(rmmUpdateRequestedAt)}
          rmmSyncRequesting={rmmSyncRequesting}
          rmmUpdateRequesting={rmmUpdateRequesting}
          loadingCheckMK={loadingCheckMK}
          onSubscribe={toggleEquipmentSubscribe}
          subscribed={equipmentSubscribed}
          subscribeLoading={equipmentSubscribeLoading}
          subscribeSaving={equipmentSubscribeSaving}
          showMaintenance={showMaintenanceControl}
          inMaintenance={inMaintenance}
          maintenanceBusy={maintenanceBusy}
          maintenanceReason={maintenanceReason}
          maintenanceUntilLabel={maintenanceUntilLabel}
          onMaintenance={() => (inMaintenance ? setEndMaintenanceOpen(true) : setMaintenanceModalOpen(true))}
          showAlerts={Boolean(alertSettings.available)}
          onAlerts={() => setAlertModalOpen(true)}
        />
        </div>
      </div>

      {}
      {photoModalOpen && <div className={styles.modalOverlay} onClick={() => setPhotoModalOpen(false)}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>
                <FaCamera className={styles.modalIcon} />
                Ajout de photo
              </h2>
              <button className={styles.modalCloseButton} onClick={() => setPhotoModalOpen(false)} title="Close">
                <FaTimes />
              </button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.comingSoonMessage}>
                <Icon icon="mdi:clock-outline" width={48} height={48} className={styles.comingSoonIcon} />
                <h3>Feature coming soon</h3>
                <p>
                  Soon, you will be able to add photos to your equipment to:
                </p>
                <ul className={styles.comingSoonList}>
                  <li>Document the physical condition of equipment</li>
                  <li>Save photos before and after interventions</li>
                  <li>Create a visual history of your equipment</li>
                  <li>Et bien plus encore...</li>
                </ul>
                <p className={styles.comingSoonNote}>
                  This feature will keep a visual record of all your equipment and its changes.
                </p>
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button className={styles.modalOkButton} onClick={() => setPhotoModalOpen(false)}>
                Compris
              </button>
            </div>
          </div>
        </div>}

      {}
      {checkmkIntegrationEnabled && checkmkMappingModal && equipment && <CheckMKMappingModal isOpen={checkmkMappingModal} onClose={() => setCheckmkMappingModal(false)} equipment={{
      id: equipment.rawData?.id || equipment.id,
      name: equipment.name || equipment.nom,
      nom: equipment.nom || equipment.name,
      clientName: equipment.clientName,
      clientId: equipment.clientId,
      type: equipment.type,
      checkmkMapping: checkmkMapping || equipment.checkmkMapping
    }} onMappingSaved={handleMappingSaved} />}

      {}
      {checkmkDebugModal && checkmkData && <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999
    }}>
          <div style={{
        backgroundColor: 'var(--bg-secondary, #1a1a2e)',
        borderRadius: '0.5rem',
        padding: '2rem',
        maxWidth: '90vw',
        maxHeight: '90vh',
        overflow: 'auto',
        border: '1px solid var(--border-primary, #2a2a4a)',
        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)'
      }}>
            <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1.5rem'
        }}>
              <h2 style={{
            color: 'var(--text-primary, #f9fafb)',
            margin: 0
          }}>Raw CheckMK data</h2>
              <button onClick={() => setCheckmkDebugModal(false)} style={{
            backgroundColor: 'var(--bg-tertiary, #1e1e3f)',
            border: '1px solid var(--border-primary, #2a2a4a)',
            color: 'var(--text-primary, #f9fafb)',
            borderRadius: '0.375rem',
            padding: '0.5rem 1rem',
            cursor: 'pointer',
            fontSize: '1rem'
          }}>
                Close
              </button>
            </div>
            <pre style={{
          backgroundColor: 'var(--bg-tertiary, #1e1e3f)',
          padding: '1rem',
          borderRadius: '0.375rem',
          overflow: 'auto',
          maxHeight: '70vh',
          color: 'var(--text-primary, #f9fafb)',
          fontSize: '0.875rem',
          fontFamily: 'monospace'
        }}>
              {(() => {
            const maxServices = 200;
            const maxEvents = 200;
            const allServices = checkmkData.services?.services || [];
            const allEvents = checkmkData.events?.events || [];
            const payload = {
              hostDetails: {
                ...checkmkHostDetails,
                raw: checkmkHostDetails?.raw,
                statusRaw: checkmkHostDetails?.statusRaw
              },
              services: {
                count: allServices.length,
                truncated: allServices.length > maxServices,
                services: allServices.slice(0, maxServices)
              },
              availability: checkmkData.availability,
              events: {
                totalCount: checkmkData.events?.events_count,
                count: allEvents.length,
                truncated: allEvents.length > maxEvents,
                allEvents: allEvents.slice(0, maxEvents),
                debug: checkmkData.events?.debug
              },
              period: checkmkData.events?.period,
              hostEventsDetailed: checkmkData.hostEventsDetailed
            };
            return JSON.stringify(payload, null, 2);
          })()}
            </pre>
          </div>
        </div>}

      {}
      {lunsModalOpen && equipment?.type === 'NAS' && <div className={styles.modalOverlay} onClick={() => setLunsModalOpen(false)}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()} style={{
        maxWidth: '560px'
      }}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>
                <Icon icon="mdi:harddisk-multiple" className={styles.modalIcon} />
                Manage LUNs
              </h2>
              <button className={styles.modalCloseButton} onClick={() => setLunsModalOpen(false)} title="Close">
                <FaTimes />
              </button>
            </div>
            <div className={styles.modalBody} style={{
          maxHeight: '60vh',
          overflowY: 'auto'
        }}>
              {formData.luns && Array.isArray(formData.luns) && formData.luns.length > 0 ? <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem'
          }}>
                  {formData.luns.map((lun, lunIndex) => <div key={lunIndex} style={{
              display: 'grid',
              gridTemplateColumns: '1fr 80px minmax(100px, 1fr) auto',
              gap: '0.5rem',
              alignItems: 'end',
              padding: '0.5rem',
              background: 'var(--bg-tertiary, #f3f4f6)',
              borderRadius: 6
            }}>
                      <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 2
              }}>
                        <span style={{
                  fontSize: '0.7rem',
                  color: 'var(--text-secondary, #6b7280)'
                }}>Name</span>
                        <input type="text" className={styles.fieldInput} value={lun.nom || lun.iqn || ''} onChange={e => {
                  const luns = [...(formData.luns || [])];
                  luns[lunIndex] = {
                    ...luns[lunIndex],
                    nom: e.target.value,
                    iqn: e.target.value
                  };
                  updateFormDataWithChanges({
                    ...formData,
                    luns
                  });
                }} placeholder="Name or IQN" />
                      </div>
                      <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 2
              }}>
                        <span style={{
                  fontSize: '0.7rem',
                  color: 'var(--text-secondary, #6b7280)'
                }}>Capacity (GB)</span>
                        <input type="text" inputMode="numeric" className={styles.fieldInput} value={lun.capacite ?? ''} onChange={e => {
                  const luns = [...(formData.luns || [])];
                  luns[lunIndex] = {
                    ...luns[lunIndex],
                    capacite: e.target.value
                  };
                  updateFormDataWithChanges({
                    ...formData,
                    luns
                  });
                }} />
                      </div>
                      <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 2
              }}>
                        <span style={{
                  fontSize: '0.7rem',
                  color: 'var(--text-secondary, #6b7280)'
                }}>Role</span>
                        <select className={styles.fieldInput} value={lun.role || 'stockage'} onChange={e => {
                  const luns = [...(formData.luns || [])];
                  luns[lunIndex] = {
                    ...luns[lunIndex],
                    role: e.target.value
                  };
                  updateFormDataWithChanges({
                    ...formData,
                    luns
                  });
                }}>
                          {lunRoleOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                        </select>
                      </div>
                      <button type="button" onClick={() => {
                const luns = (formData.luns || []).filter((_, i) => i !== lunIndex);
                updateFormDataWithChanges({
                  ...formData,
                  luns
                });
              }} title="Delete this LUN" style={{
                minWidth: 32,
                height: 32,
                padding: 0,
                border: 'none',
                background: 'transparent',
                color: '#ef4444',
                cursor: 'pointer',
                borderRadius: 6,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                        <Icon icon="mdi:delete" width={18} height={18} />
                      </button>
                    </div>)}
                  <button type="button" onClick={() => {
              const luns = [...(formData.luns || []), {
                nom: '',
                iqn: '',
                capacite: '',
                role: 'stockage'
              }];
              updateFormDataWithChanges({
                ...formData,
                luns
              });
            }} style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.35rem',
              padding: '0.5rem',
              background: 'transparent',
              border: '1px dashed #d1d5db',
              borderRadius: 6,
              cursor: 'pointer',
              color: '#6b7280',
              fontSize: '0.85rem'
            }}>
                    <Icon icon="mdi:plus" width={18} height={18} /> Add a LUN
                  </button>
                </div> : <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem'
          }}>
                  <span className={styles.sidebarSummaryValueSecondary} style={{
              fontSize: '0.9rem'
            }}>No LUN configured.</span>
                  <button type="button" onClick={() => {
              const luns = [{
                nom: '',
                iqn: '',
                capacite: '',
                role: 'stockage'
              }];
              updateFormDataWithChanges({
                ...formData,
                luns
              });
            }} style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.35rem',
              padding: '0.5rem',
              background: 'transparent',
              border: '1px dashed #d1d5db',
              borderRadius: 6,
              cursor: 'pointer',
              color: '#6b7280',
              fontSize: '0.85rem'
            }}>
                    <Icon icon="mdi:plus" width={18} height={18} /> Add a LUN
                  </button>
                </div>}
            </div>
            <div className={styles.modalFooter}>
              <button className={styles.modalOkButton} onClick={() => setLunsModalOpen(false)}>
                Close
              </button>
            </div>
          </div>
        </div>}

      {}
      {licencesModalOpen && equipment?.type === 'Firewalls' && <div className={styles.modalOverlay} onClick={() => setLicensesModalOpen(false)}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()} style={{
        maxWidth: '560px'
      }}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>
                <Icon icon="mdi:license" className={styles.modalIcon} />
                Manage licenses
              </h2>
              <button className={styles.modalCloseButton} onClick={() => setLicensesModalOpen(false)} title="Close">
                <FaTimes />
              </button>
            </div>
            <div className={styles.modalBody} style={{
          maxHeight: '60vh',
          overflowY: 'auto'
        }}>
              {formData.licences && Array.isArray(formData.licences) && formData.licences.length > 0 ? <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem'
          }}>
                  {formData.licences.map((lic, licIndex) => <div key={licIndex} style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr minmax(100px, 1fr) auto',
              gap: '0.5rem',
              alignItems: 'end',
              padding: '0.5rem',
              background: 'var(--bg-tertiary, #f3f4f6)',
              borderRadius: 6
            }}>
                      <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 2
              }}>
                        <span style={{
                  fontSize: '0.7rem',
                  color: 'var(--text-secondary, #6b7280)'
                }}>Name</span>
                        <input type="text" className={styles.fieldInput} value={lic.nom || ''} onChange={e => {
                  const licences = [...(formData.licences || [])];
                  licences[licIndex] = {
                    ...licences[licIndex],
                    nom: e.target.value
                  };
                  updateFormDataWithChanges({
                    ...formData,
                    licences
                  });
                }} placeholder="License name" />
                      </div>
                      <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 2
              }}>
                        <span style={{
                  fontSize: '0.7rem',
                  color: 'var(--text-secondary, #6b7280)'
                }}>Type</span>
                        <input type="text" className={styles.fieldInput} value={lic.type || ''} onChange={e => {
                  const licences = [...(formData.licences || [])];
                  licences[licIndex] = {
                    ...licences[licIndex],
                    type: e.target.value
                  };
                  updateFormDataWithChanges({
                    ...formData,
                    licences
                  });
                }} placeholder="Type" />
                      </div>
                      <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 2
              }}>
                        <span style={{
                  fontSize: '0.7rem',
                  color: 'var(--text-secondary, #6b7280)'
                }}>Expiration</span>
                        <input type="date" className={styles.fieldInput} value={lic.expiration || ''} onChange={e => {
                  const licences = [...(formData.licences || [])];
                  licences[licIndex] = {
                    ...licences[licIndex],
                    expiration: e.target.value
                  };
                  updateFormDataWithChanges({
                    ...formData,
                    licences
                  });
                }} />
                      </div>
                      <button type="button" onClick={() => {
                const licences = (formData.licences || []).filter((_, i) => i !== licIndex);
                updateFormDataWithChanges({
                  ...formData,
                  licences
                });
              }} title="Delete this license" style={{
                minWidth: 32,
                height: 32,
                padding: 0,
                border: 'none',
                background: 'transparent',
                color: '#ef4444',
                cursor: 'pointer',
                borderRadius: 6,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                        <Icon icon="mdi:delete" width={18} height={18} />
                      </button>
                    </div>)}
                  <button type="button" onClick={() => {
              const licences = [...(formData.licences || []), {
                nom: '',
                type: '',
                expiration: ''
              }];
              updateFormDataWithChanges({
                ...formData,
                licences
              });
            }} style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.35rem',
              padding: '0.5rem',
              background: 'transparent',
              border: '1px dashed #d1d5db',
              borderRadius: 6,
              cursor: 'pointer',
              color: '#6b7280',
              fontSize: '0.85rem'
            }}>
                    <Icon icon="mdi:plus" width={18} height={18} /> Add a license
                  </button>
                </div> : <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem'
          }}>
                  <span className={styles.sidebarSummaryValueSecondary} style={{
              fontSize: '0.9rem'
            }}>No license configured.</span>
                  <button type="button" onClick={() => {
              const licences = [{
                nom: '',
                type: '',
                expiration: ''
              }];
              updateFormDataWithChanges({
                ...formData,
                licences
              });
            }} style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.35rem',
              padding: '0.5rem',
              background: 'transparent',
              border: '1px dashed #d1d5db',
              borderRadius: 6,
              cursor: 'pointer',
              color: '#6b7280',
              fontSize: '0.85rem'
            }}>
                    <Icon icon="mdi:plus" width={18} height={18} /> Add a license
                  </button>
                </div>}
            </div>
            <div className={styles.modalFooter}>
              <button className={styles.modalOkButton} onClick={() => setLicensesModalOpen(false)}>
                Close
              </button>
            </div>
          </div>
        </div>}

      {}
      <PlanningEventModalBridge open={eventModalOpen} editingEvent={editingEvent} initialClientId={equipment?.clientId || null} initialClientName={equipment?.clientName || ""} initialEquipmentId={getEquipmentDbIdLocal() || equipment?.id || (equipment?.type && equipment?.name ? `${equipment.type}-${equipment.name}` : null)} onClose={() => {
      setEventModalOpen(false);
      setEditingEvent(null);
    }} onSaved={refreshActivityAfterEventChange} />

      <EquipmentLogDetailModal log={selectedLogDetail} onClose={closeLogModal} />

      <ConfirmModal open={purgeLogsConfirmOpen} onClose={() => {
      if (purgingLogs) return;
      setPurgeLogsConfirmOpen(false);
    }} onConfirm={handlePurgeLogs} title={modalsCopy.confirm?.purgeLogs?.title} message={purgeLogsMessage} icon="mdi:delete-sweep" confirmLabel={modalsCopy.confirm?.purgeLogs?.confirm} confirmVariant="dangerSolid" confirmLoading={purgingLogs} />

      {editModalOpen && modalClient ? <EquipmentFormModal open={editModalOpen} onClose={() => setEditModalOpen(false)} client={modalClient} equipment={equipment} moduleKey={equipmentModuleKey || equipment?.type || "Servers"} mode="edit" peerFirewalls={peerFirewalls} peerServers={peerServers} peerStorage={peerStorage} peerBorneWifi={peerBorneWifi} onSaved={handleEquipmentModalSaved} onDeleted={handleEquipmentModalDeleted} /> : null}

      <CustomEquipmentModal
        isOpen={Boolean(customEditFamily)}
        onClose={() => setCustomEditFamily(null)}
        family={customEditFamily}
        item={customEditItem}
        client={modalClient}
        clientId={getEquipmentClientId(equipment)}
        onRefresh={handleCustomEquipmentRefresh}
      />

      <EquipmentAlertSuspensionModal open={alertModalOpen} onClose={() => setAlertModalOpen(false)} equipment={equipment} onNavigate={onNavigate} alert={alertSettings} />

      <SupervisionMaintenanceModal
        open={maintenanceModalOpen}
        item={maintenanceItem}
        copy={supervisionCopy.ops || {}}
        busy={maintenanceBusy}
        deviceOnly
        onConfirm={handleConfirmMaintenance}
        onClose={() => {
          if (!maintenanceBusy) setMaintenanceModalOpen(false);
        }}
      />

      <ConfirmModal
        open={endMaintenanceOpen}
        onClose={() => {
          if (!maintenanceBusy) setEndMaintenanceOpen(false);
        }}
        onConfirm={handleEndMaintenance}
        title={copy.hero.maintenanceEndConfirmTitle || "Terminer la maintenance ?"}
        message={copy.hero.maintenanceEndConfirmMessage || ""}
        icon="mdi:traffic-cone"
        confirmLabel={copy.hero.maintenanceEndConfirm || "Terminer"}
        confirmVariant="dangerSolid"
        confirmLoading={maintenanceBusy}
      />

      <ClientTagModal open={equipmentTagModalOpen} entityKind="equipment" entityName={equipmentHeroTitle || equipment?.name || ""} assignedTags={equipmentTags} saving={addingEquipmentTag} onClose={() => {
      if (addingEquipmentTag) return;
      setEquipmentTagModalOpen(false);
    }} onSubmit={handleAddEquipmentTag} />

      <ProFeaturePromoModal open={Boolean(proPromoFeature)} featureKey={proPromoFeature} onClose={() => setProPromoFeature(null)} />
    </div>;
}
