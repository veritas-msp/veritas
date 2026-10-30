import React, { useEffect, useLayoutEffect, useMemo, useRef, useState, lazy, Suspense } from "react";
import { Icon } from "@iconify/react";
import styles from "./RapportMonitoringBuilder.module.css";
import shellStyles from "../RapportBuilderPlaceholder.module.css";
import CheckMKMonitoringModal from "./CheckMKMonitoringModal";
import EquipmentTicketsModal from "./EquipmentTicketsModal";
import InternetStep from "./steps/InternetStep";
import { getEquipmentDbId } from "../../../utils/equipmentIdentity";
import FirewallStep from "./steps/FirewallStep";
import ServersStep from "./steps/ServeursStep";
import StorageStep from "./steps/StockageStep";
import SwitchStep from "./steps/SwitchStep";
import BorneWifiStep from "./steps/BorneWifiStep";
import TOIPStep from "./steps/TOIPStep";
import BackupStep from "./steps/SauvegardeStep";
import AntispamStep from "./steps/AntispamStep";
import Office365Step from "./steps/Office365Step";
import NDDStep from "./steps/NDDStep";
import SummaryStep from "./steps/SummaryStep";
import SupportStep from "./steps/SupportStep";
import EquipmentEditModal from "./EquipmentEditModal";
import { findEquipmentLocation } from "./equipmentPatchUtils";
import EquipmentHoverIcon, {
  CATEGORY_ANIMATED,
  CYBER_BRICK_ANIMATED,
  OVERVIEW_TAB_ANIMATED,
  QUICK_ACTION_ANIMATED,
} from "../../EquipementPage/EquipmentHoverIcon";
import { uiKitLayoutsStyles as finderKit, useFinderNavIndicator } from "../../UiKit";
const AntivirusStepLazy = lazy(() => import("./steps/AntivirusStep"));

/** Icônes Lucide animées alignées sur la fiche entreprise. */
const MODULE_ANIMATED = {
  Internet: CATEGORY_ANIMATED.Internet,
  Firewall: CATEGORY_ANIMATED.Firewalls,
  Servers: CATEGORY_ANIMATED.Servers,
  Storage: CATEGORY_ANIMATED.Storage,
  Switch: CATEGORY_ANIMATED.Switch,
  BorneWifi: CATEGORY_ANIMATED.BorneWifi,
  TOIP: CATEGORY_ANIMATED.TOIP,
  Backup: CATEGORY_ANIMATED.Backup,
  Antivirus: CYBER_BRICK_ANIMATED.Antivirus,
  Antispam: CYBER_BRICK_ANIMATED.Antispam,
  Office365: CYBER_BRICK_ANIMATED.TenantMicrosoft,
  GoogleWorkspace: CYBER_BRICK_ANIMATED.GoogleWorkspace,
  NDD: CYBER_BRICK_ANIMATED.NDD,
  CertificatsSSL: CYBER_BRICK_ANIMATED.CertificatsSSL,
  LicensesAbonnements: CYBER_BRICK_ANIMATED.LicensesAbonnements,
  support: QUICK_ACTION_ANIMATED.ticket,
  summary: OVERVIEW_TAB_ANIMATED.synthese,
};

function MonitoringStepNavItem({
  stepKey,
  index,
  isActive,
  isDone,
  label,
  onSelect,
}) {
  const animRef = useRef(null);
  return (
    <button
      type="button"
      className={`${shellStyles.stepNavItem} ${isActive ? shellStyles.stepNavItemActive : ""} ${isDone ? shellStyles.stepNavItemDone : ""}`.trim()}
      aria-current={isActive ? "page" : undefined}
      onClick={onSelect}
      onMouseEnter={() => animRef.current?.startAnimation?.()}
      onMouseLeave={() => animRef.current?.stopAnimation?.()}
    >
      <span className={shellStyles.stepNavIndex} aria-hidden>
        {isDone && !isActive ? <Icon icon="mdi:check" width={12} height={12} /> : index + 1}
      </span>
      <span className={shellStyles.stepNavIcon} aria-hidden>
        <EquipmentHoverIcon
          Animated={MODULE_ANIMATED[stepKey] || null}
          iconify={MODULE_ICONS[stepKey] || "mdi:checkbox-marked-outline"}
          size={16}
          animRef={animRef}
        />
      </span>
      <span className={shellStyles.stepNavLabel}>{label}</span>
    </button>
  );
}

export const MONITORING_MODULE_STEP_ORDER = [
  "Internet",
  "Firewall",
  "Servers",
  "Storage",
  "Switch",
  "BorneWifi",
  "TOIP",
  "Backup",
  "Antivirus",
  "Antispam",
  "Office365",
  "NDD"
];

/** @deprecated Prefer MONITORING_MODULE_STEP_ORDER; kept for callers that import the old name. */
export const MONITORING_STEP_ORDER = MONITORING_MODULE_STEP_ORDER;

export const MODULE_LABELS = {
  Internet: "Internet",
  Firewall: "Firewall",
  Servers: "Serveurs",
  Storage: "Stockage",
  Switch: "Switch",
  BorneWifi: "Bornes Wi‑Fi",
  TOIP: "TOIP / VOIP",
  Backup: "Sauvegarde",
  Antivirus: "Antivirus",
  Antispam: "Antispam",
  Office365: "Microsoft Entra ID",
  GoogleWorkspace: "Google Workspace",
  NDD: "Noms de domaine",
  CertificatsSSL: "Certificats SSL",
  LicensesAbonnements: "Licences & abonnements",
  support: "Support technique",
  summary: "Synthèse"
};

/** Aligné sur les icônes InfrastructureMap / détail entreprise. */
export const MODULE_ICONS = {
  Internet: "mdi:web",
  Firewall: "mdi:shield-outline",
  Servers: "mdi:server",
  Storage: "mdi:harddisk",
  Switch: "mdi:lan",
  BorneWifi: "mdi:wifi",
  TOIP: "mdi:phone-voip",
  Backup: "mdi:backup-restore",
  Antivirus: "mdi:shield-bug-outline",
  Antispam: "mdi:email-lock-outline",
  Office365: "mdi:microsoft-azure",
  GoogleWorkspace: "mdi:google",
  NDD: "mdi:web-box",
  CertificatsSSL: "mdi:certificate-outline",
  LicensesAbonnements: "mdi:license",
  support: "mdi:headset",
  summary: "mdi:file-chart-outline"
};

export const REPORT_TOPIC_COMING_SOON = new Set(["GoogleWorkspace"]);

const INFRASTRUCTURE_TOPIC_KEYS = ["Internet", "Firewall", "Servers", "Storage", "Switch", "BorneWifi", "TOIP"];

export const REPORT_TOPIC_GROUPS = [{
  key: "infrastructure",
  icon: "mdi:lan",
  topics: INFRASTRUCTURE_TOPIC_KEYS
}, {
  key: "cyber",
  icon: "mdi:shield-lock-outline",
  topics: ["Antivirus", "Antispam", "Backup"]
}, {
  key: "cloud",
  icon: "mdi:cloud-outline",
  topics: ["Office365", "GoogleWorkspace", "NDD", "CertificatsSSL", "LicensesAbonnements"]
}];

export const REPORT_TOPIC_KEYS = REPORT_TOPIC_GROUPS.flatMap(group => group.topics);

export function getClientMonitoringModules(client) {
  if (!client) return {};
  return client.modules_monitoring || {};
}

function getEquipementList(equipements, key) {
  const list = equipements?.[key];
  return Array.isArray(list) ? list : [];
}

function getSolutionsList(raw) {
  if (Array.isArray(raw)) return raw;
  if (raw && Array.isArray(raw.solutions)) return raw.solutions;
  return [];
}

function getBackupInstances(raw) {
  if (!raw) return [];
  if (Array.isArray(raw.instances)) return raw.instances;
  return [];
}

function hasOffice365Equipment(client) {
  const raw = client?.equipements?.Office365;
  if (raw && typeof raw === "object") {
    if (Array.isArray(raw)) return raw.length > 0;
    const data = raw.data || raw;
    if (data && typeof data === "object") {
      const keys = Object.keys(data);
      if (keys.length > 0 && !(keys.length === 1 && data.enabled === true)) {
        return true;
      }
    }
  }
  return Boolean(client?.has_azure_credentials || client?.hasAzureCredentials || client?.azureHasCredentials);
}

export function isMonitoringModuleAvailable(client, stepKey) {
  if (!client) return false;
  const eq = client.equipements || {};
  switch (stepKey) {
    case "Internet":
      return getEquipementList(eq, "Internet").length > 0;
    case "Firewall":
      return getEquipementList(eq, "Firewalls").length > 0;
    case "Servers":
      return getEquipementList(eq, "Serveurs").length > 0 || getEquipementList(eq, "Servers").length > 0;
    case "Storage":
      return getEquipementList(eq, "NAS").length + getEquipementList(eq, "SAN").length > 0;
    case "Switch":
      return getEquipementList(eq, "Switch").length > 0;
    case "BorneWifi":
      return getEquipementList(eq, "BorneWifi").length > 0;
    case "TOIP":
      return getSolutionsList(eq.TOIP).length > 0;
    case "Backup":
      return getBackupInstances(eq.Sauvegarde).length > 0 || getBackupInstances(eq.Backup).length > 0;
    case "Antivirus":
      return getSolutionsList(eq.Antivirus).length > 0;
    case "Antispam":
      return getSolutionsList(eq.Antispam).length > 0;
    case "Office365":
      return hasOffice365Equipment(client);
    case "GoogleWorkspace":
      return false;
    case "NDD":
      return getEquipementList(eq, "NDD").length > 0;
    case "CertificatsSSL":
      return getEquipementList(eq, "CertificatsSSL").length > 0;
    case "LicensesAbonnements":
      return getEquipementList(eq, "LicensesAbonnements").length > 0;
    default:
      return false;
  }
}

export function countMonitoringModuleItems(client, stepKey) {
  if (!client) return 0;
  const eq = client.equipements || {};
  switch (stepKey) {
    case "Internet":
      return getEquipementList(eq, "Internet").length;
    case "Firewall":
      return getEquipementList(eq, "Firewalls").length;
    case "Servers":
      return getEquipementList(eq, "Serveurs").length + getEquipementList(eq, "Servers").length;
    case "Storage":
      return getEquipementList(eq, "NAS").length + getEquipementList(eq, "SAN").length;
    case "Switch":
      return getEquipementList(eq, "Switch").length;
    case "BorneWifi":
      return getEquipementList(eq, "BorneWifi").length;
    case "TOIP":
      return getSolutionsList(eq.TOIP).length;
    case "Backup":
      return getBackupInstances(eq.Sauvegarde).length + getBackupInstances(eq.Backup).length;
    case "Antivirus":
      return getSolutionsList(eq.Antivirus).length;
    case "Antispam":
      return getSolutionsList(eq.Antispam).length;
    case "Office365":
      return hasOffice365Equipment(client) ? 1 : 0;
    case "GoogleWorkspace":
      return 0;
    case "NDD":
      return getEquipementList(eq, "NDD").length;
    case "CertificatsSSL":
      return getEquipementList(eq, "CertificatsSSL").length;
    case "LicensesAbonnements":
      return getEquipementList(eq, "LicensesAbonnements").length;
    default:
      return 0;
  }
}

export function isMonitoringStepEnabled(client, stepKey) {
  if (!client) return false;
  if (stepKey === "support" || stepKey === "summary") return true;
  const selected = Array.isArray(client.reportSelectedModules) ? client.reportSelectedModules : null;
  if (selected && !selected.includes(stepKey)) return false;
  return isMonitoringModuleAvailable(client, stepKey);
}

export function getEnabledMonitoringSteps(client) {
  const selected = Array.isArray(client?.reportSelectedModules) ? client.reportSelectedModules : null;
  const moduleSteps = MONITORING_MODULE_STEP_ORDER.filter(stepKey => {
    if (selected && !selected.includes(stepKey)) return false;
    return isMonitoringModuleAvailable(client, stepKey);
  });
  if (moduleSteps.length === 0) return [];
  return [...moduleSteps, "support", "summary"];
}

export default function MonitoringSteps({
  client,
  activeStepIndex,
  onStepChange,
  onOpenComments,
  onTicketCreatedForEquipment,
  onRefreshClient,
  onEquipmentSaved,
  equipmentCommentCounts,
  equipmentTicketCounts,
  equipmentTicketsByKey = {},
  equipmentAlertCounts = {},
  equipmentComments = {},
  highlightedEquipmentKey,
  monitoringSyncStatus,
  equipmentCheckMKData = {},
  isSyncingMonitoring,
  onSyncCheckMK,
  syncingEquipmentKey,
  isSyncingOffice365Report,
  allCommentsChronological = [],
  summaryContentRef = null,
  stockageReportState = null,
  onSetStorageReportState,
  commentsPane = null,
  customSynthesis = null,
  onCustomSynthesisChange = null
}) {
  const [internalIndex, setInternalIndex] = useState(0);
  const [isSyncingAntivirus, setIsSyncingAntivirus] = useState(false);
  const [checkMKModal, setCheckMKModal] = useState({
    isOpen: false,
    equipment: null,
    moduleKey: null,
    equipmentKey: null,
    preLoadedData: null
  });
  const [ticketsModal, setTicketsModal] = useState({
    isOpen: false,
    equipment: null,
    moduleKey: null,
    equipmentKey: null,
    tickets: []
  });
  const [editEquipmentModal, setEditEquipmentModal] = useState({
    open: false,
    equipment: null,
    moduleKey: null,
    equipmentIndex: -1,
    equipmentListKey: null
  });
  const reportPeriod = useMemo(() => {
    const start = client?.reportStartDate;
    const end = client?.reportEndDate;
    if (!start || !end) return {};
    return { start, end, startTime: start, endTime: end };
  }, [client?.reportStartDate, client?.reportEndDate]);

  const handleOpenCheckMKDetail = async (item, { moduleKey, equipmentKey }) => {
    const resolvedKey = item?.id != null ? String(item.id) : equipmentKey != null ? String(equipmentKey) : null;
    setCheckMKModal({
      isOpen: true,
      equipment: item,
      moduleKey,
      equipmentKey: resolvedKey,
      preLoadedData: null
    });
  };

  const handleCloseCheckMKModal = () => {
    setCheckMKModal({ isOpen: false, equipment: null, moduleKey: null, equipmentKey: null, preLoadedData: null });
  };

  const resolveTicketsForEquipment = (item, equipmentKey) => {
    const map = equipmentTicketsByKey && typeof equipmentTicketsByKey === "object" ? equipmentTicketsByKey : {};
    const candidates = [
      equipmentKey,
      item?.commentKey,
      getEquipmentDbId(item),
      item?.id,
      item?.uuid,
      item?.glpi_id
    ]
      .filter(value => value != null && String(value).trim() !== "")
      .map(value => String(value));
    for (const key of candidates) {
      const list = map[key];
      if (Array.isArray(list) && list.length > 0) return list;
    }
    return [];
  };

  const handleOpenEquipmentTickets = (item, { moduleKey, equipmentKey } = {}) => {
    setTicketsModal({
      isOpen: true,
      equipment: item,
      moduleKey: moduleKey || null,
      equipmentKey: equipmentKey != null ? String(equipmentKey) : null,
      tickets: resolveTicketsForEquipment(item, equipmentKey)
    });
  };

  const handleCloseEquipmentTicketsModal = () => {
    setTicketsModal({ isOpen: false, equipment: null, moduleKey: null, equipmentKey: null, tickets: [] });
  };

  const handleRefreshCheckMKModal = async () => {
    if (!checkMKModal.equipment || typeof onSyncCheckMK !== "function") return;
    await onSyncCheckMK(checkMKModal.equipment, {
      moduleKey: checkMKModal.moduleKey,
      equipmentKey: checkMKModal.equipmentKey
    });
  };

  const handleEditEquipment = (item, { moduleKey }) => {
    const { equipmentListKey, equipmentIndex } = findEquipmentLocation(client, moduleKey, item);
    setEditEquipmentModal({ open: true, equipment: item, moduleKey, equipmentIndex, equipmentListKey });
  };

  const handleCloseEditEquipmentModal = () => {
    setEditEquipmentModal({ open: false, equipment: null, moduleKey: null, equipmentIndex: -1, equipmentListKey: null });
  };

  const handleEquipmentSaved = async (formData, createdRow, sourceEquipment, savedModuleKey) => {
    const moduleKey = savedModuleKey ?? editEquipmentModal.moduleKey;
    const equipment = sourceEquipment ?? editEquipmentModal.equipment;
    const equipmentIndex = editEquipmentModal.equipmentIndex;
    const equipmentListKey = editEquipmentModal.equipmentListKey;
    if (typeof onEquipmentSaved === "function") {
      await onEquipmentSaved(formData, createdRow, equipment, moduleKey, equipmentIndex, equipmentListKey);
      return;
    }
    if (typeof onRefreshClient === "function") await onRefreshClient();
  };

  const infraStepProps = useMemo(() => ({
    reportPeriod,
    onOpenCheckMKDetail: handleOpenCheckMKDetail,
    onOpenEquipmentTickets: handleOpenEquipmentTickets,
    onOpenComments,
    onTicketCreatedForEquipment,
    onRefreshClient,
    onEditEquipment: handleEditEquipment,
    onAntivirusSyncStateChange: setIsSyncingAntivirus,
    commentCounts: equipmentCommentCounts,
    ticketCounts: equipmentTicketCounts,
    alertCounts: equipmentAlertCounts,
    highlightedEquipmentKey,
    monitoringSyncStatus,
    equipmentCheckMKData,
    isSyncingMonitoring,
    onSyncCheckMK,
    syncingEquipmentKey
  }), [reportPeriod, onOpenComments, onTicketCreatedForEquipment, onRefreshClient, equipmentCommentCounts, equipmentTicketCounts, equipmentTicketsByKey, equipmentAlertCounts, highlightedEquipmentKey, monitoringSyncStatus, equipmentCheckMKData, isSyncingMonitoring, onSyncCheckMK, syncingEquipmentKey]);

  const setCurrentIndex = updater => {
    setInternalIndex(prev => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      if (typeof onStepChange === "function") onStepChange(next);
      return next;
    });
  };

  const steps = useMemo(() => getEnabledMonitoringSteps(client), [client]);
  const hasSteps = steps.length > 0;
  const currentIndex = typeof activeStepIndex === "number" ? activeStepIndex : internalIndex;
  const safeIndex = steps.length === 0 ? 0 : Math.min(Math.max(0, currentIndex), steps.length - 1);
  const fadeStepKey = steps[safeIndex] || "none";
  const [stepContentEnter, setStepContentEnter] = useState(true);
  const { trackRef: stepNavTrackRef, indicator: stepNavIndicator } = useFinderNavIndicator([
    safeIndex,
    steps.length,
  ]);

  useLayoutEffect(() => {
    setStepContentEnter(false);
  }, [fadeStepKey]);

  useEffect(() => {
    let cancelled = false;
    let innerId = 0;
    const outerId = requestAnimationFrame(() => {
      // Double rAF : commit opacity:0 avant le fade (comme EnterpriseDetailPage).
      innerId = requestAnimationFrame(() => {
        if (cancelled) return;
        setStepContentEnter(true);
      });
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(outerId);
      cancelAnimationFrame(innerId);
    };
  }, [fadeStepKey]);

  if (!client) {
    return <div className={styles.rapportListSection}><div className={styles.rapportListEmpty}>Sélectionnez un client pour construire le rapport de supervision.</div></div>;
  }
  if (!hasSteps) {
    return <div className={styles.builderSection}><div className={styles.builderSubtitle}>Aucun équipement ou service configuré pour ce client.</div></div>;
  }

  const currentStepKey = steps[safeIndex];
  const getStepLabel = stepKey => MODULE_LABELS[stepKey] || stepKey;

  const renderCurrentStep = () => {
    switch (currentStepKey) {
      case "Internet":
        return <InternetStep client={client} {...infraStepProps} />;
      case "Firewall":
        return <FirewallStep client={client} {...infraStepProps} />;
      case "Servers":
        return <ServersStep client={client} {...infraStepProps} />;
      case "Storage":
        return <StorageStep client={client} {...infraStepProps} persistedState={stockageReportState} onPersistState={onSetStorageReportState} />;
      case "Switch":
        return <SwitchStep client={client} {...infraStepProps} />;
      case "BorneWifi":
        return <BorneWifiStep client={client} {...infraStepProps} />;
      case "TOIP":
        return <TOIPStep client={client} {...infraStepProps} />;
      case "Backup":
        return <BackupStep client={client} reportPeriod={reportPeriod} onRefreshClient={onRefreshClient} onOpenComments={onOpenComments} onTicketCreatedForEquipment={onTicketCreatedForEquipment} commentCounts={equipmentCommentCounts} ticketCounts={equipmentTicketCounts} alertCounts={equipmentAlertCounts} highlightedEquipmentKey={highlightedEquipmentKey} />;
      case "Antivirus":
        return <Suspense fallback={<div style={{ padding: "1rem" }}>Chargement Antivirus…</div>}><AntivirusStepLazy client={client} {...infraStepProps} /></Suspense>;
      case "Antispam":
        return <AntispamStep client={client} onRefreshClient={onRefreshClient} onOpenComments={onOpenComments} onTicketCreatedForEquipment={onTicketCreatedForEquipment} commentCounts={equipmentCommentCounts} ticketCounts={equipmentTicketCounts} alertCounts={equipmentAlertCounts} highlightedEquipmentKey={highlightedEquipmentKey} reportPeriod={reportPeriod} />;
      case "Office365":
        return <Office365Step client={client} reportPeriod={reportPeriod} onRefreshClient={onRefreshClient} onOpenComments={onOpenComments} onTicketCreatedForEquipment={onTicketCreatedForEquipment} commentCounts={equipmentCommentCounts} ticketCounts={equipmentTicketCounts} alertCounts={equipmentAlertCounts} highlightedEquipmentKey={highlightedEquipmentKey} />;
      case "NDD":
        return <NDDStep client={client} onRefreshClient={onRefreshClient} onOpenComments={onOpenComments} onTicketCreatedForEquipment={onTicketCreatedForEquipment} onOpenEquipmentTickets={handleOpenEquipmentTickets} commentCounts={equipmentCommentCounts} ticketCounts={equipmentTicketCounts} alertCounts={equipmentAlertCounts} highlightedEquipmentKey={highlightedEquipmentKey} />;
      case "support":
        return <SupportStep client={client} reportPeriod={reportPeriod} />;
      case "summary":
        return (
          <SummaryStep
            client={client}
            equipmentCheckMKData={equipmentCheckMKData}
            monitoringSyncStatus={monitoringSyncStatus}
            allComments={allCommentsChronological}
            equipmentComments={equipmentComments}
            equipmentCommentCounts={equipmentCommentCounts}
            equipmentTicketCounts={equipmentTicketCounts}
            equipmentAlertCounts={equipmentAlertCounts}
            summaryContentRef={summaryContentRef}
            customSynthesis={customSynthesis}
            onCustomSynthesisChange={onCustomSynthesisChange}
          />
        );
      default:
        return null;
    }
  };

  return (
    <>
      <div className={`${shellStyles.layout} ${commentsPane ? shellStyles.layoutWithComments : ""}`.trim()}>
        <aside className={shellStyles.stepNav} aria-label="Étapes du rapport">
          <div className={shellStyles.stepNavTitle}>Parcours</div>
          <nav
            ref={stepNavTrackRef}
            className={`${shellStyles.stepNavTrack} ${shellStyles.stepNavAnimated} ${finderKit.finderSecNavAnimated}`}
            aria-label="Parcours"
          >
            {stepNavIndicator.ready ? (
              <div
                className={finderKit.finderNavIndicator}
                style={{
                  transform: `translate3d(0, ${stepNavIndicator.top}px, 0)`,
                  height: stepNavIndicator.height,
                }}
                aria-hidden
              />
            ) : null}
            {steps.map((stepKey, index) => (
              <MonitoringStepNavItem
                key={stepKey}
                stepKey={stepKey}
                index={index}
                isActive={index === safeIndex}
                isDone={index < safeIndex}
                label={getStepLabel(stepKey)}
                onSelect={() => setCurrentIndex(index)}
              />
            ))}
          </nav>
        </aside>

        <section className={shellStyles.stepPanel}>
          <div className={shellStyles.stepPanelBody}>
            {(isSyncingMonitoring || isSyncingAntivirus || isSyncingOffice365Report) && (
              <div className={styles.syncSkeleton}>
                <div className={styles.syncSkeletonBar} />
                <div className={styles.syncSkeletonBarShort} />
              </div>
            )}
            <div
              key={fadeStepKey}
              className={`${shellStyles.stepPanelContent} ${
                stepContentEnter ? shellStyles.stepPanelContentFadeIn : shellStyles.stepPanelContentFadePending
              }`.trim()}
            >
              {renderCurrentStep()}
            </div>
          </div>
        </section>
        {commentsPane}
      </div>

      <CheckMKMonitoringModal isOpen={checkMKModal.isOpen} onClose={handleCloseCheckMKModal} equipment={checkMKModal.equipment} moduleKey={checkMKModal.moduleKey} clientId={client?.id ?? client?.uuid} onRefresh={handleRefreshCheckMKModal} refreshing={syncingEquipmentKey === checkMKModal.equipmentKey} />
      <EquipmentTicketsModal
        isOpen={ticketsModal.isOpen}
        onClose={handleCloseEquipmentTicketsModal}
        equipment={ticketsModal.equipment}
        moduleKey={ticketsModal.moduleKey}
        tickets={ticketsModal.tickets}
      />
      <EquipmentEditModal open={editEquipmentModal.open} onClose={handleCloseEditEquipmentModal} client={client} equipment={editEquipmentModal.equipment} moduleKey={editEquipmentModal.moduleKey} onSaved={handleEquipmentSaved} onDeleted={onRefreshClient} backgroundSave />
    </>
  );
}
