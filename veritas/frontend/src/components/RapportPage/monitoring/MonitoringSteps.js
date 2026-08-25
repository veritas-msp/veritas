import React, { useMemo, useState, lazy, Suspense } from "react";
import styles from "./RapportMonitoringBuilder.module.css";
import CheckMKMonitoringModal from "./CheckMKMonitoringModal";
import { getModuleIcon as getMonitoringIcon } from "../../Monitoring/MonitoringSummary/monitoringUtils";
import InternetStep from "./steps/InternetStep";
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
import PeriodeStep from "./steps/PeriodeStep";
import CartographieStep from "./steps/CartographieStep";
import RecapStep from "./steps/RecapStep";
import EquipmentEditModal from "./EquipmentEditModal";
import { findEquipmentLocation } from "./equipmentPatchUtils";
import { getCheckMKCachedData } from "./checkmkReportCacheUtils";
const AntivirusStepLazy = lazy(() => import("./steps/AntivirusStep"));

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
  period: "Périmètre",
  cartography: "Cartographie",
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
  Office365: "Office 365",
  NDD: "Noms de domaine",
  recap: "Récapitulatif",
  summary: "Synthèse"
};

const INFRA_KEYS = ["Internet", "Firewall", "Servers", "Storage", "Switch", "BorneWifi", "TOIP"];
const CONTINUITY_KEYS = ["Backup"];
const CYBER_KEYS = ["Antivirus", "Antispam"];
const SERVICE_KEYS = ["Office365", "NDD"];

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

function clientHasAnyEquipment(client) {
  const eq = client?.equipements;
  if (!eq || typeof eq !== "object") return false;
  return Object.values(eq).some(value => {
    if (Array.isArray(value)) return value.length > 0;
    if (value && typeof value === "object") {
      if (Array.isArray(value.instances)) return value.instances.length > 0;
      if (Array.isArray(value.solutions)) return value.solutions.length > 0;
      return Object.keys(value).length > 0;
    }
    return false;
  });
}

export function isMonitoringStepEnabled(client, stepKey) {
  if (!client) return false;
  if (stepKey === "period" || stepKey === "recap" || stepKey === "summary") return true;
  if (stepKey === "cartography") return clientHasAnyEquipment(client) || MONITORING_MODULE_STEP_ORDER.some(k => isMonitoringStepEnabled(client, k));
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
    case "NDD":
      return getEquipementList(eq, "NDD").length > 0;
    default:
      return false;
  }
}

export function getEnabledMonitoringSteps(client) {
  const moduleSteps = MONITORING_MODULE_STEP_ORDER.filter(stepKey => isMonitoringStepEnabled(client, stepKey));
  if (moduleSteps.length === 0 && !clientHasAnyEquipment(client)) return [];
  const steps = ["period"];
  if (isMonitoringStepEnabled(client, "cartography")) steps.push("cartography");
  steps.push(...moduleSteps);
  steps.push("recap", "summary");
  return steps;
}

function TimelineSection({ label, sectionClass, stepKeys, steps, currentIndex, setCurrentIndex, getStepLabel }) {
  const has = steps.some(k => stepKeys.includes(k));
  if (!has) return null;
  return (
    <div className={`${styles.timelineSection} ${sectionClass}`}>
      <div className={styles.timelineSectionHeader}>
        <span className={styles.timelineSectionLabel}>{label}</span>
      </div>
      <ol className={styles.timelineList}>
        {steps.map((stepKey, index) => {
          if (!stepKeys.includes(stepKey)) return null;
          const isActive = index === currentIndex;
          const isCompleted = index < currentIndex;
          const iconKey = stepKey === "cartography" ? "servers" : stepKey === "period" ? "summary" : stepKey === "recap" ? "summary" : stepKey.toLowerCase();
          const icon = getMonitoringIcon(iconKey);
          return (
            <li key={stepKey || index} className={styles.timelineItem}>
              <button type="button" className={styles.timelineButton} onClick={() => setCurrentIndex(index)}>
                <span className={`${styles.timelineBullet} ${isActive || isCompleted ? styles.timelineBulletActive : ""}`} />
                <div className={styles.timelineLabel}>
                  <div className={styles.timelineLabelInner}>
                    {icon && <span className={styles.timelineIcon}>{icon}</span>}
                    <span>{getStepLabel(stepKey)}</span>
                  </div>
                </div>
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export default function MonitoringSteps({
  client,
  onFinish,
  activeStepIndex,
  onStepChange,
  onOpenComments,
  onTicketCreatedForEquipment,
  onRefreshClient,
  onEquipmentSaved,
  onPeriodChange,
  onSyncAllMonitoring,
  equipmentCommentCounts,
  equipmentTicketCounts,
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
  recapSnapshot = null
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
    return {
      start,
      end,
      startTime: start,
      endTime: end
    };
  }, [client?.reportStartDate, client?.reportEndDate]);

  const handleOpenCheckMKDetail = (item, { moduleKey, equipmentKey }) => {
    const preLoadedData = getCheckMKCachedData(equipmentCheckMKData, item, equipmentKey);
    const resolvedKey = item?.id != null ? String(item.id) : equipmentKey != null ? String(equipmentKey) : null;
    setCheckMKModal({
      isOpen: true,
      equipment: item,
      moduleKey,
      equipmentKey: resolvedKey,
      preLoadedData
    });
  };

  const handleCloseCheckMKModal = () => {
    setCheckMKModal({
      isOpen: false,
      equipment: null,
      moduleKey: null,
      equipmentKey: null,
      preLoadedData: null
    });
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
    setEditEquipmentModal({
      open: true,
      equipment: item,
      moduleKey,
      equipmentIndex,
      equipmentListKey
    });
  };

  const handleCloseEditEquipmentModal = () => {
    setEditEquipmentModal({
      open: false,
      equipment: null,
      moduleKey: null,
      equipmentIndex: -1,
      equipmentListKey: null
    });
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
    if (typeof onRefreshClient === "function") {
      await onRefreshClient();
    }
  };

  const infraStepProps = useMemo(
    () => ({
      reportPeriod,
      onOpenCheckMKDetail: handleOpenCheckMKDetail,
      onOpenComments,
      onTicketCreatedForEquipment,
      onRefreshClient,
      onEditEquipment: handleEditEquipment,
      onAntivirusSyncStateChange: setIsSyncingAntivirus,
      commentCounts: equipmentCommentCounts,
      ticketCounts: equipmentTicketCounts,
      highlightedEquipmentKey,
      monitoringSyncStatus,
      equipmentCheckMKData,
      isSyncingMonitoring,
      onSyncCheckMK,
      syncingEquipmentKey
    }),
    [
      reportPeriod,
      onOpenComments,
      onTicketCreatedForEquipment,
      onRefreshClient,
      equipmentCommentCounts,
      equipmentTicketCounts,
      highlightedEquipmentKey,
      monitoringSyncStatus,
      equipmentCheckMKData,
      isSyncingMonitoring,
      onSyncCheckMK,
      syncingEquipmentKey
    ]
  );

  const setCurrentIndex = updater => {
    setInternalIndex(prev => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      if (typeof onStepChange === "function") {
        onStepChange(next);
      }
      return next;
    });
  };

  const steps = useMemo(() => getEnabledMonitoringSteps(client), [client]);
  const hasSteps = steps.length > 0;

  if (!client) {
    return (
      <div className={styles.rapportListSection}>
        <div className={styles.rapportListEmpty}>Sélectionnez un client pour construire le rapport de supervision.</div>
      </div>
    );
  }
  if (!hasSteps) {
    return (
      <div className={styles.builderSection}>
        <div className={styles.builderSubtitle}>Aucun équipement ou service configuré pour ce client.</div>
      </div>
    );
  }

  const currentIndex = typeof activeStepIndex === "number" ? activeStepIndex : internalIndex;
  const currentStepKey = steps[currentIndex];

  const getStepLabel = stepKey => MODULE_LABELS[stepKey] || stepKey;

  const renderCurrentStep = () => {
    switch (currentStepKey) {
      case "period":
        return (
          <PeriodeStep
            client={client}
            onPeriodChange={onPeriodChange}
            onSyncMonitoring={onSyncAllMonitoring}
            isSyncingMonitoring={isSyncingMonitoring}
            isSyncingOffice365Report={isSyncingOffice365Report}
          />
        );
      case "cartography":
        return <CartographieStep client={client} />;
      case "Internet":
        return <InternetStep client={client} {...infraStepProps} />;
      case "Firewall":
        return <FirewallStep client={client} {...infraStepProps} />;
      case "Servers":
        return <ServersStep client={client} {...infraStepProps} />;
      case "Storage":
        return (
          <StorageStep
            client={client}
            {...infraStepProps}
            persistedState={stockageReportState}
            onPersistState={onSetStorageReportState}
          />
        );
      case "Switch":
        return <SwitchStep client={client} {...infraStepProps} />;
      case "BorneWifi":
        return <BorneWifiStep client={client} {...infraStepProps} />;
      case "TOIP":
        return <TOIPStep client={client} {...infraStepProps} />;
      case "Backup":
        return (
          <BackupStep
            client={client}
            reportPeriod={reportPeriod}
            onRefreshClient={onRefreshClient}
            onOpenComments={onOpenComments}
            onTicketCreatedForEquipment={onTicketCreatedForEquipment}
            commentCounts={equipmentCommentCounts}
            ticketCounts={equipmentTicketCounts}
            highlightedEquipmentKey={highlightedEquipmentKey}
          />
        );
      case "Antivirus":
        return (
          <Suspense fallback={<div style={{ padding: "1rem" }}>Chargement Antivirus…</div>}>
            <AntivirusStepLazy client={client} {...infraStepProps} />
          </Suspense>
        );
      case "Antispam":
        return (
          <AntispamStep
            client={client}
            onRefreshClient={onRefreshClient}
            onOpenComments={onOpenComments}
            onTicketCreatedForEquipment={onTicketCreatedForEquipment}
            commentCounts={equipmentCommentCounts}
            ticketCounts={equipmentTicketCounts}
            highlightedEquipmentKey={highlightedEquipmentKey}
            reportPeriod={reportPeriod}
          />
        );
      case "Office365":
        return (
          <Office365Step
            client={client}
            reportPeriod={reportPeriod}
            onRefreshClient={onRefreshClient}
            onOpenComments={onOpenComments}
            onTicketCreatedForEquipment={onTicketCreatedForEquipment}
            commentCounts={equipmentCommentCounts}
            ticketCounts={equipmentTicketCounts}
            highlightedEquipmentKey={highlightedEquipmentKey}
          />
        );
      case "NDD":
        return (
          <NDDStep
            client={client}
            onRefreshClient={onRefreshClient}
            onOpenComments={onOpenComments}
            onTicketCreatedForEquipment={onTicketCreatedForEquipment}
            commentCounts={equipmentCommentCounts}
            ticketCounts={equipmentTicketCounts}
            highlightedEquipmentKey={highlightedEquipmentKey}
          />
        );
      case "recap":
        return (
          <RecapStep
            client={client}
            reportPeriod={reportPeriod}
            allCommentsChronological={allCommentsChronological}
            recapSnapshot={recapSnapshot}
          />
        );
      case "summary":
        return (
          <SummaryStep
            client={client}
            equipmentCheckMKData={equipmentCheckMKData}
            allComments={allCommentsChronological}
            equipmentComments={equipmentComments}
            equipmentCommentCounts={equipmentCommentCounts}
            equipmentTicketCounts={equipmentTicketCounts}
            stockageReportState={stockageReportState}
            summaryContentRef={summaryContentRef}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className={styles.builderMain}>
      <div className={styles.timelineCard}>
        <div className={styles.timelineTitle}>Étapes du rapport</div>
        <div className={styles.timelineSections}>
          <TimelineSection
            label="PÉRIMÈTRE"
            sectionClass={styles.timelineSectionReport}
            stepKeys={["period", "cartography"]}
            steps={steps}
            currentIndex={currentIndex}
            setCurrentIndex={setCurrentIndex}
            getStepLabel={getStepLabel}
          />
          <TimelineSection
            label="INFRASTRUCTURE"
            sectionClass={styles.timelineSectionInfra}
            stepKeys={INFRA_KEYS}
            steps={steps}
            currentIndex={currentIndex}
            setCurrentIndex={setCurrentIndex}
            getStepLabel={getStepLabel}
          />
          <TimelineSection
            label="CONTINUITÉ"
            sectionClass={styles.timelineSectionCyber}
            stepKeys={CONTINUITY_KEYS}
            steps={steps}
            currentIndex={currentIndex}
            setCurrentIndex={setCurrentIndex}
            getStepLabel={getStepLabel}
          />
          <TimelineSection
            label="CYBERSÉCURITÉ"
            sectionClass={styles.timelineSectionCyber}
            stepKeys={CYBER_KEYS}
            steps={steps}
            currentIndex={currentIndex}
            setCurrentIndex={setCurrentIndex}
            getStepLabel={getStepLabel}
          />
          <TimelineSection
            label="SERVICES"
            sectionClass={styles.timelineSectionServices}
            stepKeys={SERVICE_KEYS}
            steps={steps}
            currentIndex={currentIndex}
            setCurrentIndex={setCurrentIndex}
            getStepLabel={getStepLabel}
          />
          <TimelineSection
            label="RAPPORT"
            sectionClass={styles.timelineSectionReport}
            stepKeys={["recap", "summary"]}
            steps={steps}
            currentIndex={currentIndex}
            setCurrentIndex={setCurrentIndex}
            getStepLabel={getStepLabel}
          />
        </div>
      </div>

      <div className={styles.builderStepContent}>
        {(isSyncingMonitoring || isSyncingAntivirus || isSyncingOffice365Report) && (
          <div className={styles.syncSkeleton}>
            <div className={styles.syncSkeletonBar} />
            <div className={styles.syncSkeletonBarShort} />
          </div>
        )}
        {renderCurrentStep()}
      </div>

      <CheckMKMonitoringModal
        isOpen={checkMKModal.isOpen}
        onClose={handleCloseCheckMKModal}
        equipment={checkMKModal.equipment}
        reportPeriod={reportPeriod}
        preLoadedData={
          checkMKModal.equipment
            ? getCheckMKCachedData(equipmentCheckMKData, checkMKModal.equipment, checkMKModal.equipmentKey)
            : null
        }
        onRefresh={handleRefreshCheckMKModal}
        refreshing={syncingEquipmentKey === checkMKModal.equipmentKey}
      />
      <EquipmentEditModal
        open={editEquipmentModal.open}
        onClose={handleCloseEditEquipmentModal}
        client={client}
        equipment={editEquipmentModal.equipment}
        moduleKey={editEquipmentModal.moduleKey}
        onSaved={handleEquipmentSaved}
        onDeleted={onRefreshClient}
        backgroundSave
      />
    </div>
  );
}
