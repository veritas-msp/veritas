import React, { useState, useEffect, useLayoutEffect, useMemo, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { useParams, useNavigate } from "react-router-dom";
import { Icon, loadIcons } from "@iconify/react";
import { toast } from 'react-toastify';
import { updateClient, saveClientModules, getClientLogs, purgeClientLogs, getClientCheckMKStats, fetchClientAntivirus, fetchClientAntispam, fetchClientDomains, fetchClientSslCertificates, checkClientSslCertificates, deleteClientSslCertificate, fetchClientLicences, deleteClientLicence, fetchClientModules, fetchContacts, fetchClientTags, addClientTag, removeClientTag, fetchClientNotes, createClientNote, updateClientNote, deleteClientNote, addContact, updateContact, addContactMembership, setContactPrimaryForClient, deleteClient, fetchClientSupportCredits, fetchClientDeletionCheck, resolveClientCustomFamilyMap } from "../../api/clients";
import ActivityJournalPanel from "../shared/ActivityJournalPanel/ActivityJournalPanel";
import { listClientMailinblackTenants } from "../../api/clientMailinblack";
import { listClientOffice365Credentials } from "../../api/clientOffice365";
import { getGlobalOvhStatus } from "../../api/clientOvh";
import { parseCustomFamilyType } from "../../api/equipmentFamilies";
import { getClientEquipmentTotal, mapClientHardwareEquipment } from "../../api/equipment";
import { filterCustomFamilyMap } from "../../utils/siteFilterUtils";
import { readEnterprisePeripheralsUi, writeEnterprisePeripheralsUi, normalizeEnterpriseOverviewTab } from "../../utils/enterprisePeripheralsUiState";
import { repairRmmTextEncoding } from "../../utils/rmmTextEncoding";
import { fetchUsers, fetchActiveUsers } from "../../api/users";
import { getClientCampaigns, createClientCampaign } from "../../api/campaigns";
import { fetchTickets } from "../../api/tickets";
import { fetchEvents } from "../../api/events";
import { filterRecentEvents, filterUpcomingEvents, isRecentEvent, isUpcomingEvent } from "../../utils/eventFilters";
import { parseEventDescription } from "../PlanningPage/planningEventFormShared";
import { usePlanningEventTypes } from "../PlanningPage/usePlanningEventTypes";
import { getPlanningEventTypesList } from "../PlanningPage/planningEventTypes";
import { getClientNumber, getClientNameWithoutCode } from "../../utils/clientDisplay";
import { getClientOnboardingInfo } from "../../utils/clientOnboarding";
import API_BASE_URL from "../../config";
import StatusDot from "../shared/StatusDot/StatusDot";
import ActivityStatusSegmented from "../shared/ActivityStatusSegmented/ActivityStatusSegmented";
import PlanningEventModalBridge from "../PlanningPage/PlanningEventModalBridge";
import { useEntitySubscription } from "../../hooks/useEntitySubscription";
import SitesModal from "./SitesModal";
import DomainsModal from "./DomainsModal";
import DomainsConfigModal from "./DomainsConfigModal";
import UnifiSiteLinkModal from "./UnifiSiteLinkModal";
import UnifiImportModal from "./UnifiImportModal";
import { getClientUnifiGlobalStatus, getClientUnifiLink } from "../../api/unifi";
import DomainSolutionPickerModal from "./DomainSolutionPickerModal";
import DomainOverviewModal from "./DomainOverviewModal";
import SslCertificatesModal from "./SslCertificatesModal";
import { getSslModalCopy } from "./sslCertificatesModalI18n";
import LicencesAbonnementsModal from "./LicencesAbonnementsModal";
import CustomEquipmentModal from "./CustomEquipmentModal";
import EnterpriseEditModal from "./EnterpriseEditModal";
import EnterpriseDeleteModal from "./EnterpriseDeleteModal";
import EnterpriseBlockersModal from "../AdminPage/EnterpriseBlockersModal";
import { isClientDeletable } from "../AdminPage/clientDeletionUi";
import { getLinkedElementsSummary, getModalBlockerRows } from "../AdminPage/clientLinkedElementsUi";
import ClientNoteModal from "./ClientNoteModal";
import ClientTagModal from "./ClientTagModal";
import ContactFormModal from "../ContactsPage/ContactFormModal";
import PrestataireAttachModal from "../PrestatairesPage/PrestataireAttachModal";
import { addPrestataireMembership, fetchPrestataires, fetchPrestatairesList } from "../../api/prestataires";
import { exportReversibilityFolder } from "./exportReversibilityDossier";
import EnterpriseVaultPanel from "./EnterpriseVaultPanel";
import { getEnterpriseVaultCopy } from "./enterpriseVaultI18n";
import { splitClientAddress, buildClientAddress, emptyPrimaryContact, mapContactToPrimary, pickPrimaryContact, normalizePrimaryContact, buildAdditiveMembershipsForEnterprise, isPrimaryContactPoste, isContactPrimaryForClient, sortContactsPrimaryFirst, normalizeCompanyStatusKey, toCompanyStatusValue } from "./enterpriseFormUtils";
import { buildSiteAddress, buildClientAddressFromSites, detectClientSiteRenames, formatSitesForLog, getSiteDisplayName, getSiteId, getSiteLocationValue, normalizeClientSites, serializeSitesForCompare, siteMatchesQuery } from "../../utils/clientSites";
import { normalizeServeurLieList, pickBackupJobType } from "./backupJobUtils";
import SiteMapPreview from "./SiteMapPreview";
import { normalizeLegalIdentifier } from "../../utils/siret";
import { normalizeContactCommunications, getCommunicationTypeDef, buildContactApiPayload } from "../../utils/contactCommunications";
import EquipmentPage from "../EquipementPage/EquipmentPage";
import InfrastructureMap from "./InfrastructureMap";
import { INFRA_BRICK_GROUPS, buildInfraBrickGroups } from "./infraHoneycombLayout";
import { getInfraTypeIcon, INFRA_TYPE_ICONS } from "./infraMapUtils";
import { EnterpriseOverviewTabButton, EnterpriseQuickActionButton } from "./EnterpriseFinderTabIcon";

const ENTERPRISE_FINDER_ICONS = [
  ...Object.values(INFRA_TYPE_ICONS),
  "mdi:lan",
  "mdi:shield-lock-outline",
  "mdi:backup-restore",
  "mdi:ticket-confirmation-outline",
  "mdi:safe-square-outline",
  "mdi:history",
  "mdi:ticket-outline",
  "mdi:briefcase-outline",
  "mdi:bullhorn-outline",
  "mdi:calendar-month-outline",
  "mdi:plus",
  "mdi:devices",
  "mdi:file-document-outline",
  "mdi:map-marker-outline",
  "mdi:account-multiple-outline",
  "mdi:handshake-outline",
  "mdi:note-text-outline",
  "mdi:credit-card-outline",
  "mdi:timer-sand"
];
import { getInfraMapCopy } from "./infraMapI18n";
import EnterpriseRmmEnrollmentHero from "../Rmm/EnterpriseRmmEnrollmentHero";
import CrmDetailPageSkeleton from "./CrmDetailPageSkeleton";
import { UiKitEmptyState, UiKitScrollFadeShell, UiKitTable, uiKitLayoutsStyles as finderKit, useFinderNavIndicator } from "../UiKit";
import styles from "./EnterpriseDetailPage.module.css";
import equipStyles from "../EquipementPage/EquipmentPage.module.css";
import { useContractModuleOptions } from "../../hooks/useContractModuleOptions";
import { formatClientSlaRows, parseClientSla, getTicketSlaDisplay, getTicketSlaSortValue, SLA_PRIORITY_LABELS } from "../../utils/ticketSlaUtils";
import SortIcon from "../Misc/SortableHeader/SortIcon";
import { cycleSortState } from "../Misc/SortableHeader/cycleSortState";
import { normalizeClientOptions } from "../../constants/contractModules";
import { formatTableDate, formatTableDateTime } from "../../utils/tableDateFormat";
import { formatRelativeFrench } from "../EquipementPage/checkmkMonitoringUtils";
import { useAuthContext } from "../../contexts/AuthContext";
import { usePermissions } from "../../contexts/PermissionsContext";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { useCommonCopy } from "../../hooks/useCommonCopy";
import { useVeritasEdition } from "../../hooks/useVeritasEdition";
import { getEnterpriseDetailCopy, getContractStatusDetail, getContractTypeLabel, getPrestationCategoryLabel, getTicketStatusLabel, getEventTypeLabels, getCampaignTypeLabel, getCampaignStatusLabel, interpolate } from "./enterpriseDetailI18n";
import IconPicker from "../AdminPage/IconPicker";
import {
  DEFAULT_ENTERPRISE_ICON,
  ENTERPRISE_ICON_CHOICES,
  ENTERPRISE_ICON_COLOR_PRESETS,
  resolveEnterpriseIcon,
  resolveEnterpriseIconColor
} from "./enterpriseIconChoices";
import ProFeatureBadge from "../Misc/ProFeature/ProFeatureBadge";
import ProFeatureLock from "../Misc/ProFeature/ProFeatureLock";
import ProFeaturePromoModal from "../Misc/ProFeature/ProFeaturePromoModal";
import { notifyProFeature, setProFeaturePromoHandler } from "../Misc/ProFeature/proFeatureUtils";
import { isSalesTicket } from "../../utils/salesTicketUtils";
import SupportCreditPackModal from "../AdminPage/SupportCreditPackModal";
import AntivirusConfigModal from "./AntivirusConfigModal";
import BackupConfigModal from "./BackupConfigModal";
import BackupOverviewPanel from "./BackupOverviewPanel";
import { filterBySite } from "../../utils/siteFilterUtils";
import mapStyles from "./InfrastructureMap.module.css";
import AntivirusSolutionPickerModal from "./AntivirusSolutionPickerModal";
import AntispamConfigModal from "./AntispamConfigModal";
import AntispamSolutionPickerModal from "./AntispamSolutionPickerModal";
import MicrosoftTenantConfigModal from "./MicrosoftTenantConfigModal";
import MicrosoftTenantSolutionPickerModal from "./MicrosoftTenantSolutionPickerModal";
import CampaignFormModal from "../CybersecuritePage/CampaignFormModal";
import CampaignPickerModal from "./CampaignPickerModal";
import { getCybersecuritePageCopy } from "../CybersecuritePage/cybersecuritePageI18n";
import ContextMenu from "../Misc/ContextMenu/ContextMenu";
import ConfirmModal from "../Misc/ConfirmModal/ConfirmModal";
import { getEnterpriseConfigModalsCopy } from "./enterpriseConfigModalsI18n";
import { listConfiguredAntivirusSolutions, listOverviewAntivirusSolutions, mergeAntivirusSources, normalizeAntivirusItem, removeAntivirusSolution, reorderAntivirusSolutions, buildAntivirusDetailNavigationPayload } from "./antivirusSolutionUtils";
import { listConfiguredAntispamSolutions, listOverviewAntispamSolutions, mergeAntispamSources, normalizeAntispamItem, removeAntispamSolution, reorderAntispamSolutions, buildAntispamDetailNavigationPayload } from "./antispamSolutionUtils";
import { buildMicrosoftTenantDetailNavigationPayload, listConfiguredMicrosoftTenants, removeMicrosoftTenant } from "./microsoftTenantSolutionUtils";
import { extractDomainsFromModules, listConfiguredDomains, refreshMonitoredDomainsFromOvh, removeMonitoredDomain, reorderMonitoredDomains } from "./domainSolutionUtils";
import { buildBackupInstanceDetailPayload } from "../EquipementPage/backupMspUtils";
import { buildBitdefenderQueryParams } from "../../api/clientBitdefender";
import PageGuideTour from "../PageGuide/PageGuideTour";
import { getEnterpriseDetailGuideSteps } from "../PageGuide/enterpriseDetailGuideSteps";
import { useRegisterPageGuide } from "../../hooks/useRegisterPageGuide";
import { FaArrowLeft, FaCamera, FaPencilAlt, FaTimes, FaPlus, FaEthernet, FaChevronLeft, FaChevronRight } from "react-icons/fa";
import { IoServerSharp } from "react-icons/io5";
import { createTrackedAbortController } from "../../utils/pageLoadAbort";
import {
  DETAIL_CACHE_NS,
  getDetailCache,
  invalidateDetailCache,
  setDetailCache
} from "../../utils/detailPageCache";
import { getListCache, LIST_CACHE_NS } from "../../utils/listPageCache";
import { invalidateEquipmentInventoryCache } from "../../utils/equipmentInventoryDataCache";

function resolveInitialEnterpriseCache(clientId, clientData) {
  if (!clientId) return null;
  const cached = getDetailCache(DETAIL_CACHE_NS.enterprise, clientId);
  if (cached?.client && String(cached.client.id) === String(clientId)) return cached;
  if (clientData?.client && String(clientData.client.id) === String(clientId)) {
    return { client: clientData.client };
  }
  const list = getListCache(LIST_CACHE_NS.enterprises);
  if (Array.isArray(list)) {
    const row = list.find(item => String(item?.id) === String(clientId));
    if (row) return { client: row };
  }
  return null;
}
const SERVICE_BRICK_MENU_TYPES = new Set([
  "Antivirus",
  "Antispam",
  "TenantMicrosoft",
  "GoogleWorkspace",
  "Backup",
  "NDD",
  "CertificatsSSL",
  "LicensesAbonnements",
  "Campagne"
]);

const DEMO_PRESTATION_TICKETS = [{
  id: "demo-prestation-1",
  ticket_number: "1284",
  category: "prestation-intervention-site",
  status: "new",
  created_at: new Date(Date.now() - 86400000 * 3).toISOString()
}, {
  id: "demo-prestation-2",
  ticket_number: "1271",
  category: "prestation-formation",
  status: "in_progress",
  created_at: new Date(Date.now() - 86400000 * 8).toISOString()
}];
const DEMO_CAMPAIGNS = [{
  id: "demo-campaign-1",
  name: "Sensibilisation phishing Q2",
  type: "phishing_simulation",
  status: "active",
  global_progress: 42,
  start_date: new Date(Date.now() - 86400000 * 14).toISOString()
}, {
  id: "demo-campaign-2",
  name: "GDPR compliance audit",
  type: "rgpd_audit",
  status: "en_preparation",
  global_progress: 12,
  start_date: new Date(Date.now() + 86400000 * 7).toISOString()
}];
const isOngoingCampaign = campaign => {
  const status = String(campaign?.status || "").toLowerCase();
  return status === "active" || status === "en_cours" || status === "en_preparation" || status === "suspendue";
};
const isPrestationTicket = ticket => isSalesTicket(ticket);
const ACTIVITY_SORT_DEFAULTS = {
  support: { key: "updated", direction: "desc" },
  prestations: { key: "created", direction: "desc" },
  campaigns: { key: "start", direction: "desc" },
  events: { key: "start", direction: "desc" }
};

const getEventStartValue = event => event?.event_start ?? event?.start ?? event?.["start"] ?? null;
const getEventEndValue = event => event?.event_end ?? event?.end ?? event?.["end"] ?? event?.end_at ?? null;

function resolveEventAssigneeLabel(event, users = []) {
  const parsed = parseEventDescription(event?.description);
  const ids = new Set();
  if (event?.assigned_user_id) ids.add(String(event.assigned_user_id));
  if (Array.isArray(parsed.meta?.assignedUserIds)) {
    for (const id of parsed.meta.assignedUserIds) {
      if (id) ids.add(String(id));
    }
  }
  const names = [...ids].map(id => {
    const user = users.find(row => String(row.id) === id);
    return user?.ticket_helpdesk_display_name || user?.username || user?.name || user?.nom || user?.email || null;
  }).filter(Boolean);
  return names.length ? names.join(", ") : "—";
}

const compareActivitySortValues = (a, b, direction = "asc") => {
  const mul = direction === "desc" ? -1 : 1;
  if (a == null && b == null) return 0;
  if (a == null || a === "") return 1;
  if (b == null || b === "") return -1;
  if (typeof a === "number" && typeof b === "number") {
    if (Number.isNaN(a) && Number.isNaN(b)) return 0;
    if (Number.isNaN(a)) return 1;
    if (Number.isNaN(b)) return -1;
    return (a - b) * mul;
  }
  return String(a).localeCompare(String(b), undefined, {
    numeric: true,
    sensitivity: "base"
  }) * mul;
};

const toActivitySortTime = value => {
  if (!value) return null;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : null;
};

const normalizeTicketStatus = status => status === "open" ? "new" : status;
const isOpenTicket = ticket => {
  const status = normalizeTicketStatus(ticket?.status);
  return !["resolved", "closed"].includes(status);
};
function getContactInitials(contact) {
  const prenom = (contact?.prenom || "").trim();
  const nom = (contact?.nom || "").trim();
  if (prenom && nom) return `${prenom[0]}${nom[0]}`.toUpperCase();
  return (nom || prenom || "-").slice(0, 2).toUpperCase();
}

/** Segmented Tous / Ouverts / Clos — pastille glissante comme les onglets UI Kit */
function SidebarSectionHeader({
  title,
  icon = null,
  count = null,
  badge = null,
  expanded = false,
  onToggle,
  locked = false,
  controlsId,
  actions = null,
  panelStyles
}) {
  const handleToggle = () => {
    onToggle?.();
  };
  return <div className={`${panelStyles.sidebarCollapseHeader} ${locked ? panelStyles.sidebarCollapseHeaderLocked : ""}`.trim()}>
      <button type="button" className={panelStyles.sidebarCollapseMain} onClick={handleToggle} aria-expanded={locked ? false : expanded} aria-controls={controlsId || undefined}>
        <span className={panelStyles.sidebarInfoTitle}>
          {icon ? <Icon icon={icon} className={panelStyles.sidebarSectionTitleIcon} aria-hidden /> : null}
          <span className={panelStyles.sidebarSectionTitleText}>{title}</span>
          <span className={panelStyles.sidebarSectionCountSlot} aria-hidden={count == null ? true : undefined}>
          {count != null ? <span className={panelStyles.sidebarSectionCount}>{count}</span> : null}
          </span>
          {badge ? <span className={panelStyles.sidebarSectionBadgeSlot}>{badge}</span> : null}
        </span>
      </button>
      {actions ? <div className={panelStyles.sidebarHeaderActions}>{actions}</div> : null}
      <button type="button" className={panelStyles.sidebarCollapseChevronBtn} onClick={handleToggle} tabIndex={-1} aria-hidden="true">
        <Icon icon={!locked && expanded ? "mdi:chevron-up" : "mdi:chevron-down"} className={panelStyles.sidebarCollapseChevron} />
      </button>
    </div>;
}
const SITES_PAGE_SIZE = 5;
function extractAntivirusFromModules(modulesData) {
  const equipements = modulesData?.equipements;
  const antivirus = equipements?.Antivirus;
  if (antivirus?.solutions?.length) {
    return antivirus.solutions.map(s => ({
      ...s,
      nom: s.solution || s.nom || s.logiciel || s.name || "N/A",
      name: s.solution || s.nom || s.logiciel || s.name || "N/A",
      solution: s.solution || s.nom || s.logiciel || s.name || "N/A"
    }));
  }
  if (Array.isArray(antivirus) && antivirus.length > 0) return antivirus;
  const monitoring = modulesData?.modules_monitoring || {};
  return Object.entries(monitoring).filter(([key, value]) => key.toLowerCase().includes("antivirus") && value).map(([key]) => ({
    name: key,
    nom: key,
    solution: key,
    actif: true,
    type: "antivirus",
    utilisateurs: "N/A",
    expiration: null
  }));
}
function extractAntispamFromModules(modulesData) {
  const equipements = modulesData?.equipements;
  const antispam = equipements?.Antispam;
  if (antispam?.solutions?.length) {
    return antispam.solutions.map(s => ({
      ...s,
      customerId: s.customerId || s.authClientId || s.syncData?.customer?.id || null,
      providerId: s.providerId || (s.customerId || s.mailinblackTenantId ? "mailinblack" : null),
      mappingMode: s.mappingMode || (s.mailinblackTenantId ? "dedicated" : "reseller"),
      nom: s.logiciel || s.nom || s.name || s.solution || "N/A",
      name: s.logiciel || s.nom || s.name || s.solution || "N/A",
      solution: s.logiciel || s.nom || s.name || s.solution || "N/A"
    }));
  }
  if (Array.isArray(antispam) && antispam.length > 0) return antispam;
  const monitoring = modulesData?.modules_monitoring || {};
  return Object.entries(monitoring).filter(([key, value]) => key.toLowerCase().includes("antispam") && value).map(([key]) => ({
    name: key,
    nom: key,
    solution: key,
    actif: true,
    type: "antispam",
    utilisateurs: "N/A",
    expiration: null
  }));
}
function extractLicensesFromModules(modulesData) {
  const licences = modulesData?.equipements?.LicensesAbonnements;
  if (!Array.isArray(licences) || licences.length === 0) return [];
  return licences.map(item => ({
    ...item,
    nom: item.nom || item.name || item.item_key || "-",
    expiration: item.expiration || item.data?.expiration || null,
    fournisseur: item.fournisseur || item.data?.fournisseur || null,
    notes: item.notes || item.data?.notes || null
  }));
}
function buildJobCheckmkMapping(job, mappingRow = null) {
  const host = mappingRow?.checkmk_host_name || job?.checkmk_host_name || job?.checkmkMapping?.checkmk_host_name || null;
  const site = mappingRow?.checkmk_site || job?.checkmk_site || job?.checkmkMapping?.checkmk_site || null;
  const service = mappingRow?.checkmk_service_name || job?.checkmk_service_name || job?.checkmkMapping?.checkmk_service_name || null;
  if (!host && !service) return null;
  return {
    checkmk_host_name: host && String(host).trim() ? String(host).trim() : null,
    checkmk_site: site && String(site).trim() ? String(site).trim() : null,
    checkmk_service_name: service && String(service).trim() ? String(service).trim() : null,
    is_active: mappingRow?.is_active !== false
  };
}
function isBackupJobCheckmkMapped(job, mappingRow = null) {
  const mapping = buildJobCheckmkMapping(job, mappingRow);
  return Boolean(mapping?.checkmk_host_name);
}
function parseBackupDataFromModules(modulesData, mappingsMap = {}) {
  const sauvegarde = modulesData?.equipements?.Sauvegarde;
  if (!sauvegarde) return {
    instances: [],
    jobs: []
  };
  const instances = sauvegarde.instances || [];
  const allInstances = [];
  const allJobs = [];
  instances.forEach(instance => {
    const jobs = instance.jobs || [];
    const jobsCount = jobs.length;
    const mappedJobsCount = jobs.filter(job => {
      const jobId = job.id || `job-${instance.id}-${job.nom}`;
      return isBackupJobCheckmkMapped(job, mappingsMap[jobId]);
    }).length;
    allInstances.push({
      id: instance.id || instance.instanceId,
      logiciel: instance.logiciel || "",
      server: instance.server || "",
      version: instance.version || "",
      expiration: instance.expiration || "",
      jobsCount,
      mappedJobsCount
    });
    jobs.forEach(job => {
      const jobId = job.id || `job-${instance.id}-${job.nom}`;
      allJobs.push({
        id: jobId,
        instanceId: instance.id || instance.instanceId,
        instanceLogiciel: instance.logiciel || "",
        nom: job.nom || "",
        typeBackup: pickBackupJobType(job),
        regularite: job.regularite || "",
        horaire: job.horaire || "",
        retention: job.retention || "",
        serveurLie: normalizeServeurLieList(job.serveurLie),
        destination: job.destination || job.stockageLie || instance.server || "",
        isMapped: isBackupJobCheckmkMapped(job, mappingsMap[jobId]),
        checkmkMapping: buildJobCheckmkMapping(job, mappingsMap[jobId]),
        last_backup_date: job.last_backup_date ?? null,
        last_backup_start: job.last_backup_start ?? null,
        last_backup_duration: job.last_backup_duration ?? null
      });
    });
  });
  return {
    instances: allInstances,
    jobs: allJobs
  };
}
export default function ClientDetailPage({
  onNavigate,
  clientData
}) {
  const {
    clientId: urlClientId
  } = useParams();
  const navigate = useNavigate();
  const locale = useAppLocale();
  const common = useCommonCopy();
  const copy = useMemo(() => getEnterpriseDetailCopy(locale), [locale]);
  const vaultCopy = useMemo(() => getEnterpriseVaultCopy(locale), [locale]);
  const campaignsCopy = useMemo(() => getCybersecuritePageCopy(locale).campaigns, [locale]);
  const catalogTypes = usePlanningEventTypes();
  const eventTypeLabels = useMemo(() => {
    const base = getEventTypeLabels(locale) || {};
    const fromCatalog = {};
    const list = Array.isArray(catalogTypes) && catalogTypes.length > 0 ? catalogTypes : getPlanningEventTypesList();
    list.forEach(type => {
      if (type?.value) fromCatalog[type.value] = type.label || type.value;
    });
    return {
      ...base,
      ...fromCatalog
    };
  }, [locale, catalogTypes]);
  const {
    modules: contractModules,
    enabledModules
  } = useContractModuleOptions();
  const {
    user: currentUser,
    userRole
  } = useAuthContext();
  const {
    can
  } = usePermissions();
  const {
    isCommunity
  } = useVeritasEdition();
  const canEditClient = can("clients_detail.edit");
  const canDeleteClient = can("clients_detail.delete");
  const canReversibility = can("clients_detail.reversibility");
  const canManageTags = can("clients_detail.tags");
  const canAddCredits = can("clients_detail.credits");
  const canAddContact = can("clients_detail.add_contact") && can("contacts.create");
  const canAddPrestataire = can("clients_detail.add_prestataire") && can("prestataires_detail.edit");
  const canManageSites = can("clients_detail.sites");
  const canScheduleEvent = can("clients_detail.schedule_event") && can("planning.create");
  const canManageNotes = can("clients_detail.notes");
  const canManageSolutions = can("clients_detail.solutions");
  const canManageDevices = can("clients_detail.devices");
  const canManageCampaigns = can("clients_detail.campaigns");
  const canManageVault = can("clients_detail.vault");
  const canCreateTicket = can("tickets.create");
  const resolvedClientId = urlClientId || clientData?.client?.id || clientData?.clientId || null;
  const initialCachedEnterprise = useMemo(
    () => resolveInitialEnterpriseCache(resolvedClientId, clientData),
    // Snapshot once per mount for this client id
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [resolvedClientId]
  );
  const initialPeripheralsUi = useMemo(
    () => readEnterprisePeripheralsUi(resolvedClientId),
    // Restore once per mount for this client id
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [resolvedClientId]
  );
  const [client, setClient] = useState(() => initialCachedEnterprise?.client || null);
  const [loading, setLoading] = useState(() => !initialCachedEnterprise?.client);
  const [error, setError] = useState(null);
  const [enterpriseEditModalOpen, setEnterpriseEditModalOpen] = useState(false);
  const [generatingReversibility, setGeneratingReversibility] = useState(false);
  const [deletingClient, setDeletingClient] = useState(false);
  const [deleteClientModalOpen, setDeleteClientModalOpen] = useState(false);
  const [deletionBlockersModalOpen, setDeletionBlockersModalOpen] = useState(false);
  const [deletionCheckClient, setDeletionCheckClient] = useState(null);
  const [loadingDeletionCheck, setLoadingDeletionCheck] = useState(false);
  const {
    subscribed: enterpriseSubscribed,
    loading: enterpriseSubscribeLoading,
    saving: enterpriseSubscribeSaving,
    toggleSubscribe: toggleEnterpriseSubscribe
  } = useEntitySubscription("enterprise", client?.id, {
    labels: {
      subscribed: copy.subscribe?.subscribedToast || "Abonnement activé",
      unsubscribed: copy.subscribe?.unsubscribedToast || "Abonnement retiré"
    }
  });
  const [saving, setSaving] = useState(false);
  const [users, setUsers] = useState(() =>
    Array.isArray(initialCachedEnterprise?.users) ? initialCachedEnterprise.users : []
  );
  const [loadingUsers, setLoadingUsers] = useState(() => !Array.isArray(initialCachedEnterprise?.users));
  const [photos, setPhotos] = useState([]);
  const [notes, setNotes] = useState(() =>
    Array.isArray(initialCachedEnterprise?.notes) ? initialCachedEnterprise.notes : []
  );
  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [noteModalMode, setNoteModalMode] = useState("create");
  const [noteModalNoteId, setNoteModalNoteId] = useState(null);
  const [noteModalInitialContent, setNoteModalInitialContent] = useState("");
  const [loadingPhotos, setLoadingPhotos] = useState(false);
  const [loadingNotes, setLoadingNotes] = useState(() => !Array.isArray(initialCachedEnterprise?.notes));
  const [savingNote, setSavingNote] = useState(false);
  const [clientTags, setClientTags] = useState(() =>
    Array.isArray(initialCachedEnterprise?.tags) ? initialCachedEnterprise.tags : []
  );
  const [loadingTags, setLoadingTags] = useState(() => !Array.isArray(initialCachedEnterprise?.tags));
  const [tagModalOpen, setTagModalOpen] = useState(false);
  const [addingTag, setAddingTag] = useState(false);
  const [photoModalOpen, setPhotoModalOpen] = useState(false);
  const [eventModalOpen, setEventModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [sitesModalOpen, setSitesModalOpen] = useState(false);
  const [equipmentSearchQuery, setEquipmentSearchQuery] = useState(() => initialPeripheralsUi?.searchQuery || "");
  const [hardwareEquipmentTotalCount, setHardwareEquipmentTotalCount] = useState(0);
  const [equipmentExportMenuOpen, setEquipmentExportMenuOpen] = useState(false);
  const [activeEquipmentTableType, setActiveEquipmentTableType] = useState(() => initialPeripheralsUi?.activeType || null);
  const equipmentPageRef = useRef(null);
  const equipmentSectionRef = useRef(null);
  const [equipTypeNavPortalEl, setEquipTypeNavPortalEl] = useState(null);
  const [vaultTreeNavPortalEl, setVaultTreeNavPortalEl] = useState(null);
  const [activitySection, setActivitySection] = useState("support");
  const [selectedCyberBrickType, setSelectedCyberBrickType] = useState(null);
  const [activityTableSort, setActivityTableSort] = useState(ACTIVITY_SORT_DEFAULTS);
  const [heroIconEditorOpen, setHeroIconEditorOpen] = useState(false);
  const [heroIconSaving, setHeroIconSaving] = useState(false);
  const [heroIconPanelPos, setHeroIconPanelPos] = useState({ top: 0, left: 0 });
  const heroIconBtnRef = useRef(null);
  const heroIconPanelRef = useRef(null);
  const [supportSearchQuery, setSupportSearchQuery] = useState("");
  const [prestationSearchQuery, setPrestationSearchQuery] = useState("");
  const [campaignSearchQuery, setCampaignSearchQuery] = useState("");
  const [eventsSearchQuery, setEventsSearchQuery] = useState("");
  const [supportStatusFilter, setSupportStatusFilter] = useState("all");
  const [prestationStatusFilter, setPrestationStatusFilter] = useState("all");
  const [campaignStatusFilter, setCampaignStatusFilter] = useState("all");
  const [eventsStatusFilter, setEventsStatusFilter] = useState("all");
  const [activityPageSize, setActivityPageSize] = useState(50);
  const [activityTablePage, setActivityTablePage] = useState({
    support: 1,
    prestations: 1,
    campaigns: 1,
    events: 1
  });
  const pageRootRef = useRef(null);
  const peripheralsUiClientRef = useRef(resolvedClientId);
  const skipPeripheralsUiPersistRef = useRef(false);
  const equipmentExportMenuRef = useRef(null);
  const vaultPanelRef = useRef(null);
  const [contacts, setContacts] = useState(() =>
    Array.isArray(initialCachedEnterprise?.contacts) ? initialCachedEnterprise.contacts : []
  );
  const [loadingContacts, setLoadingContacts] = useState(() => !Array.isArray(initialCachedEnterprise?.contacts));
  const [prestataires, setPrestataires] = useState(() =>
    Array.isArray(initialCachedEnterprise?.prestataires) ? initialCachedEnterprise.prestataires : []
  );
  const [loadingPrestataires, setLoadingPrestataires] = useState(
    () => !Array.isArray(initialCachedEnterprise?.prestataires)
  );
  const [slaExpanded, setSlaExpanded] = useState(false);
  const [creditsExpanded, setCreditsExpanded] = useState(false);
  const [slaNow, setSlaNow] = useState(() => Date.now());
  const [sitesSearch, setSitesSearch] = useState("");
  const [contactsSearch, setContactsSearch] = useState("");
  const [prestatairesSearch, setPrestatairesSearch] = useState("");
  const [sitesPage, setSitesPage] = useState(1);
  const [contractSectionExpanded, setContractSectionExpanded] = useState(false);
  const [contactsSectionExpanded, setContactsSectionExpanded] = useState(false);
  const [prestatairesSectionExpanded, setPrestatairesSectionExpanded] = useState(false);
  const [sitesSectionExpanded, setSitesSectionExpanded] = useState(false);
  const [notesSectionExpanded, setNotesSectionExpanded] = useState(false);
  const [proPromoFeature, setProPromoFeature] = useState(null);
  const [supportCreditModalOpen, setSupportCreditModalOpen] = useState(false);
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState(null);
  const [showPrestataireModal, setShowPrestataireModal] = useState(false);
  const [availablePrestataires, setAvailablePrestataires] = useState([]);
  const [loadingAvailablePrestataires, setLoadingAvailablePrestataires] = useState(false);
  const [attachingPrestataire, setAttachingPrestataire] = useState(false);
  const [pageGuideOpen, setPageGuideOpen] = useState(false);
  const openPageGuide = useCallback(() => setPageGuideOpen(true), []);
  useRegisterPageGuide(openPageGuide);
  const [logs, setLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [logsPage, setLogsPage] = useState(1);
  const [logsTotal, setLogsTotal] = useState(0);
  const logsLimit = 10;
  const [equipmentTotals, setEquipmentTotals] = useState({
    byType: {},
    total: 0
  });
  const [loadingTotalEquipment, setLoadingTotalEquipment] = useState(true);
  const [checkmkStats, setCheckmkStats] = useState({
    stats: [],
    total: 0
  });
  const [loadingCheckMK, setLoadingCheckMK] = useState(false);
  const [campaigns, setCampaigns] = useState([]);
  const [showCampaignModal, setShowCampaignModal] = useState(false);
  const [campaignPickerOpen, setCampaignPickerOpen] = useState(false);
  const [savingCampaign, setSavingCampaign] = useState(false);
  const [campaignFormData, setCampaignFormData] = useState({
    client_id: "",
    name: "",
    type: "microsoft_security",
    provider: "microsoft",
    tenant_id: "",
    azure_credential_id: "",
    status: "en_preparation",
    start_date: "",
    end_date: "",
    global_progress: 0,
    description: ""
  });
  const [supportTickets, setSupportTickets] = useState(() =>
    Array.isArray(initialCachedEnterprise?.supportTickets) ? initialCachedEnterprise.supportTickets : []
  );
  const [supportCreditBalance, setSupportCreditBalance] = useState(() =>
    initialCachedEnterprise?.supportCreditBalance != null
      ? Number(initialCachedEnterprise.supportCreditBalance)
      : null
  );
  const [supportCreditPacks, setSupportCreditPacks] = useState(() =>
    Array.isArray(initialCachedEnterprise?.supportCreditPacks) ? initialCachedEnterprise.supportCreditPacks : []
  );
  const [prestationTickets, setPrestationTickets] = useState(() =>
    Array.isArray(initialCachedEnterprise?.prestationTickets) ? initialCachedEnterprise.prestationTickets : []
  );
  const [upcomingEvents, setUpcomingEvents] = useState(() =>
    Array.isArray(initialCachedEnterprise?.upcomingEvents) ? initialCachedEnterprise.upcomingEvents : []
  );
  const [recentEvents, setRecentEvents] = useState(() =>
    Array.isArray(initialCachedEnterprise?.recentEvents) ? initialCachedEnterprise.recentEvents : []
  );
  const [loadingClientActivity, setLoadingClientActivity] = useState(() => {
    const snap = initialCachedEnterprise;
    return !(
      Array.isArray(snap?.upcomingEvents) ||
      Array.isArray(snap?.recentEvents) ||
      Array.isArray(snap?.supportTickets) ||
      Array.isArray(snap?.prestationTickets) ||
      snap?.supportCreditBalance != null
    );
  });
  const [overviewTab, setOverviewTab] = useState(() => normalizeEnterpriseOverviewTab(initialPeripheralsUi?.overviewTab));
  // Keep-alive des onglets lourds : montés une fois (hidden) pour éviter flash / re-fetch.
  const [mapTabMounted, setMapTabMounted] = useState(false);
  const [cyberTabMounted, setCyberTabMounted] = useState(
    () => normalizeEnterpriseOverviewTab(initialPeripheralsUi?.overviewTab) === "cyber"
  );
  const [backupTabMounted, setBackupTabMounted] = useState(
    () => normalizeEnterpriseOverviewTab(initialPeripheralsUi?.overviewTab) === "backup"
  );
  const [activityTabMounted, setActivityTabMounted] = useState(
    () => normalizeEnterpriseOverviewTab(initialPeripheralsUi?.overviewTab) === "activity"
  );
  const [eventsTabMounted, setEventsTabMounted] = useState(
    () => normalizeEnterpriseOverviewTab(initialPeripheralsUi?.overviewTab) === "events"
  );
  const [logsTabMounted, setLogsTabMounted] = useState(
    () => normalizeEnterpriseOverviewTab(initialPeripheralsUi?.overviewTab) === "logs"
  );
  const [vaultTabMounted, setVaultTabMounted] = useState(
    () => normalizeEnterpriseOverviewTab(initialPeripheralsUi?.overviewTab) === "vault"
  );
  const [antivirusData, setAntivirusData] = useState([]);
  const [antispamData, setAntispamData] = useState([]);
  const [mailinblackTenants, setMailinblackTenants] = useState([]);
  const [domainsData, setDomainsData] = useState([]);
  const [globalOvhConfigured, setGlobalOvhConfigured] = useState(false);
  const [sslData, setSslData] = useState([]);
  const [licencesData, setLicensesData] = useState([]);
  const [customFamilyMap, setCustomFamilyMap] = useState([]);
  const [customEquipmentModal, setCustomEquipmentModal] = useState(null);
  const [equipmentRevision, setEquipmentRevision] = useState(0);
  const [activeSiteFilter, setActiveSiteFilter] = useState(() => initialPeripheralsUi?.siteFilter || null);
  const [domainsModalOpen, setDomainsModalOpen] = useState(false);
  const [domainsConfigModalOpen, setDomainsConfigModalOpen] = useState(false);
  const [unifiGlobalConfigured, setUnifiGlobalConfigured] = useState(false);
  const [unifiLinkModalOpen, setUnifiLinkModalOpen] = useState(false);
  const [unifiImportModalOpen, setUnifiImportModalOpen] = useState(false);
  const [unifiLink, setUnifiLink] = useState(null);
  const [domainsConfigInitialSection, setDomainsConfigInitialSection] = useState("inventory");
  const [domainsConfigInitialProviderId, setDomainsConfigInitialProviderId] = useState(null);
  const [domainsConfigOpenAddChoice, setDomainsConfigOpenAddChoice] = useState(false);
  const [domainsConfigInitialEditDomain, setDomainsConfigInitialEditDomain] = useState(null);
  const [domainPickerOpen, setDomainPickerOpen] = useState(false);
  const [domainPickerDomains, setDomainPickerDomains] = useState([]);
  const [domainOverviewOpen, setDomainOverviewOpen] = useState(false);
  const [domainOverviewItem, setDomainOverviewItem] = useState(null);
  const [sslModalOpen, setSslModalOpen] = useState(false);
  const [sslModalItem, setSslModalItem] = useState(null);
  const [licencesModalOpen, setLicensesModalOpen] = useState(false);
  const [licencesModalItem, setLicensesModalItem] = useState(null);
  const [backupConfigModalOpen, setBackupConfigModalOpen] = useState(false);
  const [backupConfigInitialSection, setBackupConfigInitialSection] = useState("overview");
  const [backupConfigInitialInstance, setBackupConfigInitialInstance] = useState(null);
  const [backupConfigInitialJob, setBackupConfigInitialJob] = useState(null);
  const [antivirusConfigModalOpen, setAntivirusConfigModalOpen] = useState(false);
  const [antivirusConfigInitialSection, setAntivirusConfigInitialSection] = useState("overview");
  const [antivirusConfigEditingSolution, setAntivirusConfigEditingSolution] = useState(null);
  const [antivirusPickerOpen, setAntivirusPickerOpen] = useState(false);
  const [antivirusPickerSolutions, setAntivirusPickerSolutions] = useState([]);
  const [antispamConfigModalOpen, setAntispamConfigModalOpen] = useState(false);
  const [antispamConfigInitialSection, setAntispamConfigInitialSection] = useState("overview");
  const [antispamConfigEditingSolution, setAntispamConfigEditingSolution] = useState(null);
  const [antispamPickerOpen, setAntispamPickerOpen] = useState(false);
  const [antispamPickerSolutions, setAntispamPickerSolutions] = useState([]);
  const [microsoftTenantConfigModalOpen, setMicrosoftTenantConfigModalOpen] = useState(false);
  const [microsoftTenantConfigInitialSection, setMicrosoftTenantConfigInitialSection] = useState("overview");
  const [microsoftTenantConfigEditingTenant, setMicrosoftTenantConfigEditingTenant] = useState(null);
  const [microsoftTenantPickerOpen, setMicrosoftTenantPickerOpen] = useState(false);
  const [microsoftTenantPickerTenants, setMicrosoftTenantPickerTenants] = useState([]);
  const [serviceBrickMenu, setServiceBrickMenu] = useState(null);
  const [solutionDeleteTarget, setSolutionDeleteTarget] = useState(null);
  const [deletingSolution, setDeletingSolution] = useState(false);
  const configModalsCopy = useMemo(() => getEnterpriseConfigModalsCopy(locale), [locale]);
  const openAntivirusConfigModal = useCallback((section = "overview", editingSolution = null) => {
    setAntivirusConfigInitialSection(section);
    setAntivirusConfigEditingSolution(editingSolution);
    setAntivirusConfigModalOpen(true);
  }, []);
  const navigateToAntivirusDetail = useCallback((item, options = {}) => {
    if (!onNavigate || !client?.id) return;
    const payload = buildAntivirusDetailNavigationPayload(client, item);
    if (!payload?.companyId) return;
    onNavigate("AntivirusDetail", payload, options);
  }, [onNavigate, client]);
  const openAntispamConfigModal = useCallback((section = "overview", editingSolution = null) => {
    setAntispamConfigInitialSection(section);
    setAntispamConfigEditingSolution(editingSolution);
    setAntispamConfigModalOpen(true);
  }, []);
  const navigateToAntispamDetail = useCallback((item, options = {}) => {
    if (!onNavigate || !client?.id) return;
    const payload = buildAntispamDetailNavigationPayload(client, item);
    if (!payload) return;
    onNavigate("AntispamDetail", payload, options);
  }, [onNavigate, client]);
  const openMicrosoftTenantConfigModal = useCallback((section = "overview", editingTenant = null) => {
    setMicrosoftTenantConfigInitialSection(section);
    setMicrosoftTenantConfigEditingTenant(editingTenant);
    setMicrosoftTenantConfigModalOpen(true);
  }, []);
  const navigateToMicrosoftTenantDetail = useCallback((credentials = null, options = {}) => {
    if (!onNavigate || !client?.id) return;
    const payload = buildMicrosoftTenantDetailNavigationPayload(client, credentials);
    if (!payload) return;
    onNavigate("TenantDetail", payload, options);
  }, [onNavigate, client]);
  const openBackupConfigModal = useCallback((section = "overview", options = {}) => {
    setBackupConfigInitialSection(section || "overview");
    setBackupConfigInitialInstance(options?.instance || null);
    setBackupConfigInitialJob(options?.job || null);
    setBackupConfigModalOpen(true);
  }, []);
  const openDomainsConfigModal = useCallback((section = "inventory", providerId = null, { openAddChoice = false, editDomain = null } = {}) => {
    setDomainsConfigInitialSection(section);
    setDomainsConfigInitialProviderId(providerId);
    setDomainsConfigOpenAddChoice(openAddChoice);
    setDomainsConfigInitialEditDomain(editDomain || null);
    setDomainsConfigModalOpen(true);
  }, []);
  const [backupInstances, setBackupInstances] = useState([]);
  const [backupJobs, setBackupJobs] = useState([]);
  const [loadingBackups, setLoadingBackups] = useState(false);
  const [userDetailsModalOpen, setUserDetailsModalOpen] = useState(false);
  const [selectedSecurityItem, setSelectedSecurityItem] = useState(null);
  const [antivirusDetailsModalOpen, setAntivirusDetailsModalOpen] = useState(false);
  const [selectedAntivirusItem, setSelectedAntivirusItem] = useState(null);
  const [antivirusDetailData, setAntivirusDetailData] = useState(null);
  const [loadingAntivirusDetails, setLoadingAntivirusDetails] = useState(false);
  const [serviceDetailsModalOpen, setServiceDetailsModalOpen] = useState(false);
  const [logDetailsModalOpen, setLogDetailsModalOpen] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [loadingDocuments, setLoadingDocuments] = useState(false);
  const headerRef = useRef(null);
  const loadControllerRef = useRef(null);
  const contactsControllerRef = useRef(null);
  const prestatairesControllerRef = useRef(null);
  const logsControllerRef = useRef(null);
  const isMountedRef = useRef(true);
  const loadRequestIdRef = useRef(0);
  const supportCreditsLoadGenRef = useRef(0);
  const pendingEnterpriseExtrasRef = useRef(null);
  const modulesRequestRef = useRef({
    clientId: null,
    promise: null,
    data: null
  });
  const [monitoringModulesState, setMonitoringModulesState] = useState(null);
  const [initialMonitoringModules, setInitialMonitoringModules] = useState(null);
  const [loadingMonitoringModules, setLoadingMonitoringModules] = useState(false);
  const [formData, setFormData] = useState({
    clientNumber: "",
    name: "",
    icon: "",
    iconColor: "",
    email: "",
    phone: "",
    address: "",
    addressStreet: "",
    addressPostalCode: "",
    addressCity: "",
    siret: "",
    secteur: "",
    commercialId: "",
    sites: [],
    primaryContact: emptyPrimaryContact(),
    contrat: {
      debut: "",
      expiration: ""
    },
    modules: {},
    statut: "actif"
  });
  const [initialFormData, setInitialFormData] = useState(null);
  const [hasChanges, setHasChanges] = useState(false);
  const configuredAntivirusSolutions = useMemo(
    () => listConfiguredAntivirusSolutions(
      client,
      antivirusData,
      client?.equipements ? { equipements: client.equipements } : null
    ),
    [client, antivirusData]
  );
  const configuredAntispamSolutions = useMemo(
    () => listConfiguredAntispamSolutions(
      client,
      [],
      client?.equipements ? { equipements: client.equipements } : null,
      mailinblackTenants
    ),
    [client, mailinblackTenants]
  );
  const configuredMicrosoftTenants = useMemo(() => listConfiguredMicrosoftTenants(client), [client]);
  useEffect(() => {
    if (!client?.id) {
      setMailinblackTenants([]);
      return;
    }
    listClientMailinblackTenants(client.id).then(result => setMailinblackTenants(result?.tenants || [])).catch(() => setMailinblackTenants([]));
  }, [client?.id]);
  const configuredDomains = useMemo(
    () => listConfiguredDomains(
      client,
      domainsData,
      client?.equipements ? { equipements: client.equipements } : null
    ),
    [client, domainsData]
  );
  const infraMapCopy = useMemo(() => getInfraMapCopy(locale), [locale]);
  const cyberBrickGroups = useMemo(() => {
    try {
      return buildInfraBrickGroups({
        antivirusItems: configuredAntivirusSolutions,
        antispamItems: configuredAntispamSolutions,
        domainItems: configuredDomains,
        domainIntegrationReady: globalOvhConfigured,
        sslItems: sslData,
        licenceItems: licencesData,
        backupInstances,
        tenantInfo: {
          configured: configuredMicrosoftTenants.length > 0 || Boolean(client?.has_azure_credentials || client?.hasAzureCredentials || client?.azureHasCredentials),
          items: configuredMicrosoftTenants,
          status: client?.Office365?.status || client?.microsoft?.status || "actif"
        },
        googleWorkspaceInfo: {
          configured: Boolean(client?.googleWorkspace?.configured || client?.hasGoogleWorkspaceCredentials),
          domain: client?.googleWorkspace?.domain || null,
          status: client?.googleWorkspace?.status || "actif"
        },
        campaignItems: campaigns,
        getBrickGroupLabel: (groupId, fallback) => infraMapCopy.getBrickGroupLabel(groupId) || fallback,
        getBrickTypeLabel: (type, fallback) => infraMapCopy.getBrickTypeLabel(type) || fallback
      });
    } catch (error) {
      console.error("cyberBrickGroups build failed:", error);
      return INFRA_BRICK_GROUPS.map(group => ({
        id: group.id,
        label: infraMapCopy.getBrickGroupLabel(group.id) || group.label,
        icon: group.icon,
        bricks: group.types.map(type => ({
          id: type,
          type,
          label: infraMapCopy.getBrickTypeLabel(type) || type,
          count: 0,
          items: []
        }))
      }));
    }
  }, [
    backupInstances,
    campaigns,
    client,
    configuredAntivirusSolutions,
    configuredAntispamSolutions,
    configuredDomains,
    configuredMicrosoftTenants,
    globalOvhConfigured,
    infraMapCopy,
    licencesData,
    sslData
  ]);
  const cyberBrickByType = useMemo(() => {
    const map = {};
    cyberBrickGroups.forEach(group => {
      (group.bricks || []).forEach(brick => {
        if (brick?.type) map[brick.type] = brick;
      });
    });
    return map;
  }, [cyberBrickGroups]);
  const effectiveCyberBrickType = useMemo(() => {
    const allTypes = INFRA_BRICK_GROUPS.flatMap(group => group.types);
    if (!allTypes.length) return null;
    if (selectedCyberBrickType && allTypes.includes(selectedCyberBrickType)) return selectedCyberBrickType;
    return allTypes[0];
  }, [selectedCyberBrickType]);
  useEffect(() => {
    if (overviewTab !== "cyber") return;
    if (!effectiveCyberBrickType) return;
    if (selectedCyberBrickType === effectiveCyberBrickType) return;
    setSelectedCyberBrickType(effectiveCyberBrickType);
  }, [overviewTab, effectiveCyberBrickType, selectedCyberBrickType]);
  const { trackRef: finderPrimaryTrackRef, indicator: finderPrimaryIndicator } = useFinderNavIndicator([
    overviewTab
  ]);
  const { trackRef: finderCyberTrackRef, indicator: finderCyberIndicator } = useFinderNavIndicator([
    overviewTab,
    selectedCyberBrickType,
    effectiveCyberBrickType
  ]);
  const { trackRef: finderActivityTrackRef, indicator: finderActivityIndicator } = useFinderNavIndicator([
    overviewTab,
    activitySection
  ]);
  useEffect(() => {
    if (!client?.id) {
      setGlobalOvhConfigured(false);
      return;
    }
    getGlobalOvhStatus().then(status => setGlobalOvhConfigured(Boolean(status?.configured))).catch(() => setGlobalOvhConfigured(false));
  }, [client?.id]);
  useEffect(() => {
    if (!client?.id) {
      setUnifiLink(null);
      setUnifiGlobalConfigured(false);
      return;
    }
    getClientUnifiGlobalStatus()
      .then(status => setUnifiGlobalConfigured(Boolean(status?.configured || status?.enabled || status?.keys?.siteManager)))
      .catch(() => setUnifiGlobalConfigured(false));
    getClientUnifiLink(client.id)
      .then(res => setUnifiLink(res?.link || null))
      .catch(() => setUnifiLink(null));
  }, [client?.id]);
  const getContractModules = useCallback((source = {}) => {
    let modulesSource = source.options || source.modules || {};
    if (typeof modulesSource === "string") {
      try {
        modulesSource = JSON.parse(modulesSource);
      } catch {
        modulesSource = {};
      }
    }
    return normalizeClientOptions(modulesSource, contractModules);
  }, [contractModules]);
  const normalizeMonitoringModules = (source = {}) => {
    let raw = source?.modules_monitoring || source?.modules || source || {};
    if (typeof raw === "string") {
      try {
        raw = JSON.parse(raw);
      } catch (e) {
        raw = {};
      }
    }
    if (!raw || typeof raw !== "object") {
      raw = {};
    }
    return {
      Servers: Boolean(raw.Servers ?? raw.Server ?? raw.Servers),
      Storage: Boolean(raw.Storage ?? raw.Storage),
      Firewall: Boolean(raw.Firewall ?? raw.Firewalls),
      Backup: Boolean(raw.Backup),
      Antivirus: Boolean(raw.Antivirus),
      Antispam: Boolean(raw.Antispam),
      Office365: Boolean(raw.Office365),
      NDD: Boolean(raw.NDD),
      CertificatsSSL: Boolean(raw.CertificatsSSL),
      Internet: Boolean(raw.Internet),
      Switch: Boolean(raw.Switch ?? raw.Switches),
      BorneWifi: Boolean(raw.BorneWifi ?? raw.Wifi ?? raw.WiFi),
      Alimentation: Boolean(raw.Alimentation),
      Routeur: Boolean(raw.Routeur),
      TOIP: Boolean(raw.TOIP),
      Videosurveillance: Boolean(raw.Videosurveillance),
      ...raw
    };
  };
  const getContratData = (source = {}) => {
    let contratSource = source.contrat || {};
    if (typeof contratSource === 'string') {
      try {
        contratSource = JSON.parse(contratSource);
      } catch (e) {
        contratSource = {};
      }
    }
    if (!contratSource || typeof contratSource !== 'object') {
      contratSource = {};
    }
    return {
      ...contratSource,
      debut: contratSource.debut || "",
      expiration: contratSource.expiration || "",
      suspendu: Boolean(contratSource.suspendu)
    };
  };
  const normalizeSitesList = sites => serializeSitesForCompare(sites);
  const buildFormDataFromClient = (sourceClient, sourceContacts = []) => {
    if (!sourceClient) {
      return {
        clientNumber: "",
        name: "",
        email: "",
        phone: "",
        address: "",
        addressStreet: "",
        addressPostalCode: "",
        addressCity: "",
        siret: "",
        secteur: "",
        commercialId: "",
        sites: [],
        primaryContact: emptyPrimaryContact(),
        contrat: {
          debut: "",
          expiration: ""
        },
        modules: {},
        icon: "",
        iconColor: "",
        statut: "actif"
      };
    }
    const addressParts = splitClientAddress(sourceClient.address || "");
    const primary = pickPrimaryContact(sourceContacts, sourceClient?.id);
    return {
      clientNumber: getClientNumber(sourceClient) || "",
      name: sourceClient.name || "",
      icon: sourceClient.icon || "",
      iconColor: sourceClient.icon_color || sourceClient.iconColor || "",
      email: sourceClient.email || "",
      phone: sourceClient.phone || "",
      address: sourceClient.address || "",
      ...addressParts,
      siret: sourceClient.siret || sourceClient.siren || "",
      secteur: sourceClient.secteur || sourceClient.sector || "",
      commercialId: sourceClient.commercial_id || sourceClient.commercialId || "",
      sites: normalizeClientSites(sourceClient.sites),
      primaryContact: primary ? mapContactToPrimary(primary) : emptyPrimaryContact(),
      contrat: getContratData(sourceClient),
      modules: getContractModules(sourceClient),
      statut: toCompanyStatusValue(sourceClient.statut)
    };
  };
  const cloneFormSnapshot = data => ({
    ...data,
    addressStreet: data.addressStreet || "",
    addressPostalCode: data.addressPostalCode || "",
    addressCity: data.addressCity || "",
    sites: [...(data.sites || [])],
    contrat: {
      ...(data.contrat || {})
    },
    modules: {
      ...(data.modules || {})
    },
    primaryContact: {
      ...(data.primaryContact || emptyPrimaryContact())
    }
  });
  const detectInfoChanges = (currentData, initialData) => {
    if (!initialData) return false;
    const infoFields = ["clientNumber", "name", "icon", "iconColor", "commercialId", "secteur", "statut"];
    for (const field of infoFields) {
      if (String(currentData[field] || "").trim() !== String(initialData[field] || "").trim()) {
        return true;
      }
    }
    if (normalizeLegalIdentifier(currentData.siret) !== normalizeLegalIdentifier(initialData.siret)) {
      return true;
    }
    if (normalizeSitesList(currentData.sites) !== normalizeSitesList(initialData.sites)) {
      return true;
    }
    const oldContrat = getContratData(initialData);
    const newContrat = getContratData({
      contrat: currentData.contrat
    });
    if (oldContrat.debut !== newContrat.debut) return true;
    if (oldContrat.expiration !== newContrat.expiration) return true;
    const oldSla = parseClientSla(oldContrat);
    const newSla = parseClientSla(newContrat);
    if (JSON.stringify(oldSla) !== JSON.stringify(newSla)) return true;
    const oldModules = getContractModules(initialData);
    const newModules = getContractModules({
      modules: currentData.modules
    });
    for (const key of Object.keys({
      ...oldModules,
      ...newModules
    })) {
      if (oldModules[key] !== newModules[key]) return true;
    }
    if (JSON.stringify(normalizePrimaryContact(currentData.primaryContact)) !== JSON.stringify(normalizePrimaryContact(initialData.primaryContact))) {
      return true;
    }
    return false;
  };
  const updateContratField = (field, value) => {
    updateFormData({
      ...formData,
      contrat: {
        ...formData.contrat,
        [field]: value
      }
    });
  };
  const updateFormData = newData => {
    setFormData(newData);
    if (initialFormData) {
      const changes = detectInfoChanges(newData, initialFormData);
      setHasChanges(changes);
    }
  };
  const notifyEnterprisesListRefresh = () => {
    window.dispatchEvent(new Event("refreshEnterprises"));
  };
  useEffect(() => {
    isMountedRef.current = true;
    const controller = createTrackedAbortController();
    loadControllerRef.current?.abort();
    loadControllerRef.current = controller;
    loadClientData(controller.signal);
    return () => {
      isMountedRef.current = false;
      controller.abort();
      contactsControllerRef.current?.abort();
      prestatairesControllerRef.current?.abort();
      logsControllerRef.current?.abort();
    };
  }, [urlClientId, clientData?.clientId, clientData?.client?.id]);
  useEffect(() => {
    const id = client?.id ?? null;
    const prev = peripheralsUiClientRef.current;
    peripheralsUiClientRef.current = id;
    if (!id) return;
    if (prev != null && String(prev) !== String(id)) {
      // Switched to another enterprise in the same mount: reset section chrome.
      setSlaExpanded(false);
      setContractSectionExpanded(false);
      setContactsSectionExpanded(false);
      setPrestatairesSectionExpanded(false);
      setSitesSectionExpanded(false);
      setNotesSectionExpanded(false);
      setSitesSearch("");
      setContactsSearch("");
      setPrestatairesSearch("");
      setSitesPage(1);
      const saved = readEnterprisePeripheralsUi(id);
      // Avoid persisting the previous enterprise's tab onto this one before state catches up.
      skipPeripheralsUiPersistRef.current = true;
      const nextOverviewTab = normalizeEnterpriseOverviewTab(saved?.overviewTab);
      setOverviewTab(nextOverviewTab);
      setMapTabMounted(false);
      setCyberTabMounted(nextOverviewTab === "cyber");
      setActivityTabMounted(nextOverviewTab === "activity");
      setEventsTabMounted(nextOverviewTab === "events");
      setVaultTabMounted(nextOverviewTab === "vault");
      setLogsTabMounted(nextOverviewTab === "logs");
      setActiveSiteFilter(saved?.siteFilter || null);
      setEquipmentSearchQuery(saved?.searchQuery || "");
      setActiveEquipmentTableType(saved?.activeType || null);
    }
  }, [client?.id]);
  useEffect(() => {
    if (!client?.id) return;
    if (skipPeripheralsUiPersistRef.current) {
      skipPeripheralsUiPersistRef.current = false;
      return;
    }
    writeEnterprisePeripheralsUi(client.id, {
      overviewTab,
      searchQuery: equipmentSearchQuery || "",
      siteFilter: activeSiteFilter || null,
      activeType: activeEquipmentTableType || null
    });
  }, [client?.id, overviewTab, equipmentSearchQuery, activeSiteFilter, activeEquipmentTableType]);
  useEffect(() => {
    if (!client?.id) return;
    // Eager keep-alive dès que la fiche est prête : plus de flash au 1er switch d'onglet.
    setMapTabMounted(true);
    setCyberTabMounted(true);
    setActivityTabMounted(true);
    setEventsTabMounted(true);
    setVaultTabMounted(true);
    setLogsTabMounted(true);
  }, [client?.id]);
  useEffect(() => {
    // Prefetch Iconify glyphs so secondary nav icons appear with labels (no async gap).
    try {
      loadIcons(ENTERPRISE_FINDER_ICONS);
    } catch {
      /* ignore */
    }
  }, []);
  useEffect(() => {
    if (overviewTab === "map") setMapTabMounted(true);
    if (overviewTab === "cyber") setCyberTabMounted(true);
    if (overviewTab === "backup") setBackupTabMounted(true);
    if (overviewTab === "activity") setActivityTabMounted(true);
    if (overviewTab === "events") setEventsTabMounted(true);
    if (overviewTab === "vault") setVaultTabMounted(true);
    if (overviewTab === "logs") setLogsTabMounted(true);
  }, [overviewTab]);
  const [finderSecEnter, setFinderSecEnter] = useState(true);
  const [mainContentEnter, setMainContentEnter] = useState(true);
  useLayoutEffect(() => {
    setFinderSecEnter(false);
    setMainContentEnter(false);
  }, [overviewTab]);
  useEffect(() => {
    let cancelled = false;
    let innerId = 0;
    const outerId = requestAnimationFrame(() => {
      // Double rAF : commit opacity:0 avant de lancer le fade (évite le flash / saut).
      innerId = requestAnimationFrame(() => {
        if (cancelled) return;
        setFinderSecEnter(true);
        setMainContentEnter(true);
      });
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(outerId);
      cancelAnimationFrame(innerId);
    };
  }, [overviewTab]);
  const overviewTabPanelClass = tab => {
    if (overviewTab !== tab) return styles.overviewTabPanel;
    return `${styles.overviewTabPanel} ${mainContentEnter ? styles.overviewTabPanelFadeIn : styles.overviewTabPanelFadePending}`.trim();
  };
  useEffect(() => {
    const el = pageRootRef.current;
    if (!el || !client?.id) return undefined;
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        writeEnterprisePeripheralsUi(client.id, {
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
      writeEnterprisePeripheralsUi(client.id, {
        scrollY: el.scrollTop
      });
    };
  }, [client?.id]);
  useEffect(() => {
    if (loading || !client?.id) return;
    const savedY = readEnterprisePeripheralsUi(client.id)?.scrollY;
    if (typeof savedY !== "number" || savedY <= 0) return;
    const el = pageRootRef.current;
    if (!el) return;
    const restore = () => {
      el.scrollTop = savedY;
    };
    const raf = requestAnimationFrame(() => {
      restore();
      // Second pass after panels/tables paint.
      requestAnimationFrame(restore);
    });
    const timeout = window.setTimeout(restore, 120);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(timeout);
    };
  }, [loading, client?.id]);
  useEffect(() => {
    const timer = window.setInterval(() => setSlaNow(Date.now()), 60000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    setProFeaturePromoHandler(featureKey => setProPromoFeature(featureKey));
    return () => setProFeaturePromoHandler(null);
  }, []);
  useEffect(() => {
    if (!activeSiteFilter) return;
    const sites = normalizeClientSites(formData.sites);
    // Avoid clearing a restored filter while sites are still loading.
    if (!sites.length) return;
    const stillExists = sites.some(site => getSiteLocationValue(site) === activeSiteFilter);
    if (!stillExists) setActiveSiteFilter(null);
  }, [formData.sites, activeSiteFilter]);
  const filteredCustomFamilyMap = useMemo(() => filterCustomFamilyMap(customFamilyMap, activeSiteFilter), [customFamilyMap, activeSiteFilter]);
  const refreshClientEquipment = useCallback(async () => {
    if (!client?.id) return null;
    invalidateEquipmentInventoryCache();
    const [modulesData, customFamilies] = await Promise.all([fetchClientModules(client.id), resolveClientCustomFamilyMap(client.id)]);
    const families = Array.isArray(customFamilies) ? customFamilies : [];
    setClient(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        equipements: modulesData?.equipements ?? prev.equipements
      };
    });
    setCustomFamilyMap(families);
    setEquipmentRevision(revision => revision + 1);
    loadTotalEquipment(client.id, null, modulesData);
    return {
      modulesData,
      customFamilies: families
    };
  }, [client?.id]);
  useEffect(() => {
    if (!client?.id) return undefined;
    const handleFamiliesUpdated = () => {
      void refreshClientEquipment();
    };
    window.addEventListener("equipmentFamiliesUpdated", handleFamiliesUpdated);
    return () => window.removeEventListener("equipmentFamiliesUpdated", handleFamiliesUpdated);
  }, [client?.id, refreshClientEquipment]);
  useEffect(() => {
    if (client?.id) {
      const cached = getDetailCache(DETAIL_CACHE_NS.enterprise, client.id);
      loadContacts(client.id, undefined, {
        keepVisible: Array.isArray(cached?.contacts)
      });
      loadPrestataires(client.id, undefined, {
        keepVisible: Array.isArray(cached?.prestataires)
      });
      return;
    }
    contactsControllerRef.current?.abort();
    setLoadingContacts(false);
    prestatairesControllerRef.current?.abort();
    setLoadingPrestataires(false);
  }, [client?.id]);
  useEffect(() => {
    setEquipmentSearchQuery("");
    setHardwareEquipmentTotalCount(0);
    setEquipmentExportMenuOpen(false);
    setDeleteClientModalOpen(false);
  }, [client?.id]);
  useEffect(() => {
    if (!equipmentExportMenuOpen) return;
    const handleClickOutside = e => {
      if (equipmentExportMenuRef.current && !equipmentExportMenuRef.current.contains(e.target)) {
        setEquipmentExportMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [equipmentExportMenuOpen]);
  useEffect(() => {
    if (enterpriseEditModalOpen) return;
    setFormData(prev => ({
      ...prev,
      modules: normalizeClientOptions(prev.modules, contractModules)
    }));
  }, [contractModules, enterpriseEditModalOpen]);
  const getClientModulesOnce = async (clientId, signal) => {
    const cache = modulesRequestRef.current;
    if (cache.clientId === clientId && cache.data) {
      return cache.data;
    }
    if (cache.clientId === clientId && cache.promise) {
      return cache.promise;
    }
    const promise = fetchClientModules(clientId, {
      signal
    }).then(data => {
      modulesRequestRef.current = {
        clientId,
        promise: null,
        data
      };
      return data;
    }).catch(error => {
      modulesRequestRef.current = {
        clientId,
        promise: null,
        data: null
      };
      throw error;
    });
    modulesRequestRef.current = {
      clientId,
      promise,
      data: null
    };
    return promise;
  };
  const applyClientSnapshot = useCallback(clientInfo => {
    if (!clientInfo) return;
    setClient(clientInfo);
    const clientModules = getContractModules(clientInfo);
    setFormData({
      ...buildFormDataFromClient(clientInfo, []),
      modules: clientModules
    });
    if (window.updateTabTitle && clientInfo.name) {
      window.updateTabTitle("ContratDetail", {
        clientId: clientInfo.id,
        name: clientInfo.name,
        client_number: clientInfo.client_number ?? clientInfo.clientNumber
      });
    }
  }, [getContractModules]);
  const writeEnterpriseCache = useCallback((clientId, snapshot = {}) => {
    if (!clientId || !snapshot?.client) return;
    const prev = getDetailCache(DETAIL_CACHE_NS.enterprise, clientId, {
      ttlMs: 0
    }) || {};
    const pickArray = (next, fallback) => Array.isArray(next) ? next : Array.isArray(fallback) ? fallback : undefined;
    setDetailCache(DETAIL_CACHE_NS.enterprise, clientId, {
      client: snapshot.client,
      modulesData: snapshot.modulesData !== undefined ? snapshot.modulesData : prev.modulesData ?? null,
      tags: pickArray(snapshot.tags, prev.tags),
      notes: pickArray(snapshot.notes, prev.notes),
      contacts: pickArray(snapshot.contacts, prev.contacts),
      prestataires: pickArray(snapshot.prestataires, prev.prestataires),
      upcomingEvents: pickArray(snapshot.upcomingEvents, prev.upcomingEvents),
      recentEvents: pickArray(snapshot.recentEvents, prev.recentEvents),
      supportTickets: pickArray(snapshot.supportTickets, prev.supportTickets),
      prestationTickets: pickArray(snapshot.prestationTickets, prev.prestationTickets),
      supportCreditBalance: snapshot.supportCreditBalance !== undefined ? snapshot.supportCreditBalance : prev.supportCreditBalance,
      supportCreditPacks: pickArray(snapshot.supportCreditPacks, prev.supportCreditPacks),
      users: pickArray(snapshot.users, prev.users)
    });
  }, []);
  const hydrateEnterpriseExtras = useCallback(snapshot => {
    if (!snapshot) return;
    if (Array.isArray(snapshot.tags)) {
      setClientTags(snapshot.tags);
      setLoadingTags(false);
    }
    if (Array.isArray(snapshot.notes)) {
      setNotes(snapshot.notes);
      setLoadingNotes(false);
    }
    if (Array.isArray(snapshot.contacts)) {
      setContacts(snapshot.contacts);
      setLoadingContacts(false);
    }
    if (Array.isArray(snapshot.prestataires)) {
      setPrestataires(snapshot.prestataires);
      setLoadingPrestataires(false);
    }
    const hasActivityCache = Array.isArray(snapshot.upcomingEvents) || Array.isArray(snapshot.recentEvents) || Array.isArray(snapshot.supportTickets) || Array.isArray(snapshot.prestationTickets);
    if (hasActivityCache) {
      if (Array.isArray(snapshot.upcomingEvents)) setUpcomingEvents(snapshot.upcomingEvents);
      if (Array.isArray(snapshot.recentEvents)) setRecentEvents(snapshot.recentEvents);
      if (Array.isArray(snapshot.supportTickets)) setSupportTickets(snapshot.supportTickets);
      if (Array.isArray(snapshot.prestationTickets)) setPrestationTickets(snapshot.prestationTickets);
      setLoadingClientActivity(false);
    }
    if (snapshot.supportCreditBalance != null || Array.isArray(snapshot.supportCreditPacks)) {
      if (snapshot.supportCreditBalance != null) {
        setSupportCreditBalance(Number(snapshot.supportCreditBalance));
      }
      if (Array.isArray(snapshot.supportCreditPacks)) {
        setSupportCreditPacks(snapshot.supportCreditPacks);
        if (snapshot.supportCreditPacks.length > 0) setCreditsExpanded(true);
      }
    }
    if (Array.isArray(snapshot.users)) {
      setUsers(snapshot.users);
      setLoadingUsers(false);
    }
  }, []);
  const patchEnterpriseExtras = useCallback((clientId, patch) => {
    if (!clientId || !patch || typeof patch !== "object") return;
    const current = getDetailCache(DETAIL_CACHE_NS.enterprise, clientId, {
      ttlMs: 0
    });
    if (current?.client) {
      setDetailCache(DETAIL_CACHE_NS.enterprise, clientId, {
        ...current,
        ...patch
      });
      return;
    }
    // Seed later once client snapshot is written (race on first paint).
    pendingEnterpriseExtrasRef.current = {
      clientId: String(clientId),
      patch: {
        ...(pendingEnterpriseExtrasRef.current?.clientId === String(clientId)
          ? pendingEnterpriseExtrasRef.current.patch
          : {}),
        ...patch
      }
    };
  }, []);
  const flushPendingEnterpriseExtras = useCallback(clientId => {
    const pending = pendingEnterpriseExtrasRef.current;
    if (!pending || String(pending.clientId) !== String(clientId)) return;
    pendingEnterpriseExtrasRef.current = null;
    patchEnterpriseExtras(clientId, pending.patch);
  }, [patchEnterpriseExtras]);
  const hydrateServicesFromModules = useCallback(modulesData => {
    if (!modulesData) return;
    setAntivirusData(extractAntivirusFromModules(modulesData));
    setAntispamData(extractAntispamFromModules(modulesData));
    setDomainsData(extractDomainsFromModules(modulesData));
    setLicensesData(extractLicensesFromModules(modulesData));
    const {
      instances,
      jobs
    } = parseBackupDataFromModules(modulesData);
    setBackupInstances(instances);
    setBackupJobs(jobs);
    setLoadingBackups(false);
  }, []);
  const openAntispamConfigEntry = useCallback(async () => {
    if (!client?.id) return;
    try {
      const [modulesData, tenantsResult] = await Promise.all([fetchClientModules(client.id), listClientMailinblackTenants(client.id).catch(() => ({
        tenants: []
      }))]);
      const tenants = tenantsResult?.tenants || [];
      setMailinblackTenants(tenants);
      const configured = listConfiguredAntispamSolutions(client, [], modulesData, tenants);
      if (configured.length > 0) {
        hydrateServicesFromModules(modulesData);
        setClient(prev => prev ? {
          ...prev,
          equipements: modulesData?.equipements ?? prev.equipements,
          modules_monitoring: modulesData?.modules_monitoring ?? prev.modules_monitoring
        } : prev);
        setAntispamPickerSolutions(configured);
        setAntispamPickerOpen(true);
        return;
      }
      openAntispamConfigModal("solution");
    } catch (error) {
      console.error(error);
      openAntispamConfigModal("solution");
    }
  }, [client, hydrateServicesFromModules, openAntispamConfigModal]);
  const refreshAntispamState = useCallback(async () => {
    if (!client?.id) return {
      modulesData: null,
      tenants: []
    };
    const [modulesData, tenantsResult] = await Promise.all([fetchClientModules(client.id), listClientMailinblackTenants(client.id).catch(() => ({
      tenants: []
    }))]);
    const tenants = tenantsResult?.tenants || [];
    setMailinblackTenants(tenants);
    hydrateServicesFromModules(modulesData);
    setClient(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        equipements: modulesData?.equipements ?? prev.equipements,
        modules_monitoring: modulesData?.modules_monitoring ?? prev.modules_monitoring
      };
    });
    setEquipmentRevision(revision => revision + 1);
    return {
      modulesData,
      tenants
    };
  }, [client?.id, hydrateServicesFromModules]);
  const refreshDomainsState = useCallback(async () => {
    if (!client?.id) return {
      modulesData: null,
      ovhConfigured: false
    };
    const [modulesData, ovhStatus] = await Promise.all([fetchClientModules(client.id), getGlobalOvhStatus().catch(() => ({
      configured: false
    }))]);
    const ovhConfigured = Boolean(ovhStatus?.configured);
    setGlobalOvhConfigured(ovhConfigured);
    const monitored = extractDomainsFromModules(modulesData);
    setDomainsData(monitored);
    hydrateServicesFromModules(modulesData);
    setClient(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        equipements: modulesData?.equipements ?? prev.equipements,
        modules_monitoring: modulesData?.modules_monitoring ?? prev.modules_monitoring
      };
    });
    setEquipmentRevision(revision => revision + 1);
    return {
      modulesData,
      ovhConfigured,
      domains: monitored
    };
  }, [client?.id, hydrateServicesFromModules]);
  const refreshAntivirusState = useCallback(async () => {
    if (!client?.id) return null;
    const modulesData = await fetchClientModules(client.id);
    hydrateServicesFromModules(modulesData);
    setClient(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        equipements: modulesData?.equipements ?? prev.equipements,
        modules_monitoring: modulesData?.modules_monitoring ?? prev.modules_monitoring
      };
    });
    setEquipmentRevision(revision => revision + 1);
    return modulesData;
  }, [client?.id, hydrateServicesFromModules]);
  const handleRemoveAntivirusSolution = useCallback(async solution => {
    if (!client?.id) return;
    await removeAntivirusSolution(client.id, solution);
    await refreshAntivirusState();
  }, [client?.id, refreshAntivirusState]);
  const refreshMicrosoftTenantState = useCallback(async () => {
    if (!client?.id) return [];
    try {
      const list = await listClientOffice365Credentials(client.id);
      const tenants = listConfiguredMicrosoftTenants(null, list);
      const hasCredentials = tenants.length > 0;
      setClient(prev => prev ? {
        ...prev,
        has_azure_credentials: hasCredentials,
        hasAzureCredentials: hasCredentials,
        azureHasCredentials: hasCredentials,
        azureCredentialsList: list
      } : prev);
      setEquipmentRevision(revision => revision + 1);
      return tenants;
    } catch (error) {
      console.error(error);
      return [];
    }
  }, [client?.id]);
  const refreshSslData = useCallback(() => {
    if (!client?.id) return Promise.resolve([]);
    return fetchClientSslCertificates(client.id, { autoCheck: true })
      .then(items => {
        const list = Array.isArray(items) ? items : [];
        setSslData(list);
        setEquipmentRevision(revision => revision + 1);
        return list;
      })
      .catch(error => {
        console.error(error);
        return [];
      });
  }, [client?.id]);
  const syncAllSslCertificates = useCallback(async () => {
    if (!client?.id) return;
    const sslCopy = getSslModalCopy(locale);
    try {
      const result = await checkClientSslCertificates(client.id);
      let list = Array.isArray(result)
        ? result
        : Array.isArray(result?.items)
          ? result.items
          : null;
      if (!list) {
        const items = await fetchClientSslCertificates(client.id);
        list = Array.isArray(items) ? items : [];
      }
      setSslData(list);
      setEquipmentRevision(revision => revision + 1);
      const checkedCount =
        Number.isFinite(Number(result?.checked)) ? Number(result.checked) : list.length;
      toast.success(
        interpolate(sslCopy.toasts?.checkAllSuccess || "{count} certificat(s) vérifié(s)", {
          count: String(checkedCount)
        })
      );
    } catch (error) {
      toast.error(error?.message || sslCopy.toasts?.checkAllError || "Erreur lors de la vérification SSL");
      throw error;
    }
  }, [client?.id, locale]);
  const syncAllDomains = useCallback(async () => {
    if (!client?.id) return;
    const infraCopy = getInfraMapCopy(locale);
    const preview = infraCopy?.preview || {};
    try {
      await refreshMonitoredDomainsFromOvh(client.id);
      await refreshDomainsState();
      toast.success(preview.syncDomainsSuccess || "Noms de domaine synchronisés");
    } catch (error) {
      toast.error(error?.message || preview.syncDomainsError || "Échec de la synchronisation des domaines");
      throw error;
    }
  }, [client?.id, locale, refreshDomainsState]);
  const openSslModal = useCallback((item = null) => {
    if (!client?.id) return;
    setSslModalItem(item || null);
    setSslModalOpen(true);
    refreshSslData();
  }, [client?.id, refreshSslData]);
  const refreshLicencesData = useCallback(() => {
    if (!client?.id) return Promise.resolve([]);
    return fetchClientLicences(client.id)
      .then(items => {
        const list = Array.isArray(items) ? items : [];
        setLicensesData(list);
        setEquipmentRevision(revision => revision + 1);
        return list;
      })
      .catch(error => {
        console.error(error);
        return [];
      });
  }, [client?.id]);
  const openLicencesModal = useCallback((item = null) => {
    if (!client?.id) return;
    setLicensesModalItem(item || null);
    setLicensesModalOpen(true);
    refreshLicencesData();
  }, [client?.id, refreshLicencesData]);
  const enrichAzureCredentials = async (clientInfo, signal, isCurrentRequest) => {
    if (!clientInfo?.id) return clientInfo;
    try {
      const credRes = await fetch(`${API_BASE_URL}/client-office365/${clientInfo.id}`, {
        credentials: "include",
        signal
      });
      if (!credRes.ok) return clientInfo;
      const credPayload = await credRes.json();
      const list = Array.isArray(credPayload?.credentialsList)
        ? credPayload.credentialsList
        : credPayload?.credentials
          ? [credPayload.credentials]
          : [];
      const hasAzureCredentials = list.length > 0;
      return {
        ...clientInfo,
        has_azure_credentials: hasAzureCredentials,
        hasAzureCredentials: hasAzureCredentials,
        azureHasCredentials: hasAzureCredentials,
        azureCredentialsList: list
      };
    } catch (e) {
      if (e?.name === "AbortError") throw e;
      return clientInfo;
    }
  };
  const loadClientData = async signal => {
    const requestId = ++loadRequestIdRef.current;
    const isCurrentRequest = () => loadRequestIdRef.current === requestId && loadControllerRef.current?.signal === signal;
    const prefetchClientId = urlClientId || clientData?.client?.id || clientData?.clientId || null;
    const cachedSnapshot = prefetchClientId
      ? getDetailCache(DETAIL_CACHE_NS.enterprise, prefetchClientId)
      : null;
    const cacheHit = Boolean(
      cachedSnapshot?.client && prefetchClientId && String(cachedSnapshot.client.id) === String(prefetchClientId)
    );
    const optimisticClient =
      clientData?.client && prefetchClientId && String(clientData.client.id) === String(prefetchClientId)
        ? clientData.client
        : cacheHit
          ? cachedSnapshot.client
          : null;
    setError(null);
    setLoading(!optimisticClient);
    modulesRequestRef.current = {
      clientId: null,
      promise: null,
      data: null
    };
    setMonitoringModulesState(null);
    setInitialMonitoringModules(null);
    setCampaigns([]);
    setLoadingBackups(false);
    setEquipmentTotals({
      byType: {},
      total: 0
    });
    setHardwareEquipmentTotalCount(0);
    setLoadingTotalEquipment(true);
    setCheckmkStats({
      stats: [],
      total: 0
    });
    setLoadingCheckMK(false);
    setAntivirusData([]);
    setAntispamData([]);
    setDomainsData([]);
    setSslData([]);
    setLicensesData([]);
    setCustomFamilyMap([]);
    setBackupInstances([]);
    setBackupJobs([]);
    setDocuments([]);
    setLogs([]);
    setLogsTotal(0);
    setLogsPage(1);
    setPhotos([]);
    setTagModalOpen(false);
    setNoteModalOpen(false);
    setNoteModalNoteId(null);
    setNoteModalInitialContent("");
    setLoadingLogs(false);
    // Stale-while-revalidate: keep hero/sidebar extras from cache instead of blanking them.
    if (!Array.isArray(cachedSnapshot?.contacts)) setContacts([]);
    if (!Array.isArray(cachedSnapshot?.prestataires)) setPrestataires([]);
    if (!Array.isArray(cachedSnapshot?.notes)) setNotes([]);
    if (!Array.isArray(cachedSnapshot?.tags)) setClientTags([]);
    if (!Array.isArray(cachedSnapshot?.supportTickets)) setSupportTickets([]);
    if (!Array.isArray(cachedSnapshot?.prestationTickets)) setPrestationTickets([]);
    if (!Array.isArray(cachedSnapshot?.upcomingEvents)) setUpcomingEvents([]);
    if (!Array.isArray(cachedSnapshot?.recentEvents)) setRecentEvents([]);
    if (cachedSnapshot?.supportCreditBalance == null && !Array.isArray(cachedSnapshot?.supportCreditPacks)) {
      setSupportCreditBalance(null);
      setSupportCreditPacks([]);
    }
    if (!Array.isArray(cachedSnapshot?.users)) {
      setUsers([]);
      setLoadingUsers(true);
    }
    setLoadingContacts(false);
    setLoadingPrestataires(false);
    if (optimisticClient && isMountedRef.current) {
      applyClientSnapshot(optimisticClient);
      hydrateServicesFromModules(
        cachedSnapshot?.modulesData ||
          (optimisticClient.equipements
            ? {
                equipements: optimisticClient.equipements
              }
            : null)
      );
      if (cacheHit) hydrateEnterpriseExtras(cachedSnapshot);
      setLoading(false);
    } else {
      setClient(null);
    }
    try {
      const fetchClientById = async id => {
        const res = await fetch(`${API_BASE_URL}/clients/general/${id}`, {
          credentials: "include",
          signal
        });
        if (!res.ok) {
          throw new Error(copy.notFound);
        }
        return res.json();
      };
      let clientFetchPromise = null;
      if (urlClientId) {
        clientFetchPromise = fetchClientById(urlClientId);
      } else if (clientData?.client) {
        clientFetchPromise = fetchClientById(clientData.client.id);
      } else if (clientData?.clientId) {
        clientFetchPromise = fetchClientById(clientData.clientId);
      }
      const modulesPromise = prefetchClientId ? getClientModulesOnce(prefetchClientId, signal).catch(() => null) : Promise.resolve(null);
      const [clientInfo, modulesData] = await Promise.all([clientFetchPromise, modulesPromise]);
      if (!clientInfo) {
        if (isCurrentRequest() && isMountedRef.current) {
          if (!optimisticClient) setError(copy.loadError);
          setLoading(false);
        }
        return;
      }
      if (signal?.aborted || !isCurrentRequest()) return;
      const mergedClient = {
        ...clientInfo,
        equipements: modulesData?.equipements ?? clientInfo.equipements ?? {},
        modules_monitoring: modulesData?.modules_monitoring ?? clientInfo.modules_monitoring ?? {}
      };
      applyClientSnapshot(mergedClient);
      hydrateServicesFromModules(modulesData);
      if (!modulesData?.equipements && clientInfo.equipements) {
        hydrateServicesFromModules({
          equipements: clientInfo.equipements
        });
      }
      writeEnterpriseCache(mergedClient.id, {
        client: mergedClient,
        modulesData: modulesData || null
      });
      flushPendingEnterpriseExtras(mergedClient.id);
      setLoading(false);
      enrichAzureCredentials(clientInfo, signal, isCurrentRequest).then(enriched => {
        if (!signal?.aborted && isCurrentRequest() && isMountedRef.current && enriched !== clientInfo) {
          setClient(enriched);
          writeEnterpriseCache(enriched.id, {
            client: enriched,
            modulesData: modulesData || null
          });
          flushPendingEnterpriseExtras(enriched.id);
        }
      }).catch(e => {
        if (e?.name !== "AbortError") console.error("Error credentials Azure:", e);
      });
      void fetchUsers({
        signal
      }).then(usersData => {
        if (!signal?.aborted && isCurrentRequest() && isMountedRef.current) {
          const nextUsers = Array.isArray(usersData) ? usersData : [];
          setUsers(nextUsers);
          patchEnterpriseExtras(mergedClient.id, {
            users: nextUsers
          });
        }
      }).catch(async err => {
        if (err?.name === "AbortError") return;
        try {
          const activeUsers = await fetchActiveUsers({
            signal
          });
          if (!signal?.aborted && isCurrentRequest() && isMountedRef.current) {
            const nextUsers = Array.isArray(activeUsers) ? activeUsers : [];
            setUsers(nextUsers);
            patchEnterpriseExtras(mergedClient.id, {
              users: nextUsers
            });
          }
        } catch (fallbackErr) {
          if (fallbackErr?.name !== "AbortError") console.error("Error chargement utilisateurs:", fallbackErr);
        }
      }).finally(() => {
        if (isCurrentRequest() && isMountedRef.current) setLoadingUsers(false);
      });
      void loadClientModules(clientInfo.id, modulesData, clientInfo);
      const keepTags = Array.isArray(cachedSnapshot?.tags);
      const keepActivity = Array.isArray(cachedSnapshot?.upcomingEvents) || Array.isArray(cachedSnapshot?.recentEvents) || Array.isArray(cachedSnapshot?.supportTickets) || cachedSnapshot?.supportCreditBalance != null;
      const parallelLoads = [loadCustomFamilyMap(clientInfo.id, signal), loadClientTagsAndNotes(clientInfo.id, signal, {
        keepVisible: keepTags
      }), loadClientActivity(clientInfo.id, signal, {
        keepVisible: keepActivity
      }), loadTotalEquipment(clientInfo.id, clientInfo, modulesData, signal), loadBackupData(clientInfo.id, signal, {
        silent: true
      })];
      if (!isCommunity) {
        parallelLoads.unshift(loadCampaigns(clientInfo.id, signal), loadCybersecurityData(clientInfo.id, signal));
      } else {
        parallelLoads.unshift(loadSslLicensesData(clientInfo.id, signal));
      }
      void Promise.all(parallelLoads);
    } catch (err) {
      if (err?.name === "AbortError") return;
      if (isCurrentRequest() && isMountedRef.current) {
        setError(err.message || copy.loadError);
        setLoading(false);
      }
      console.error("Error loading data client:", err);
    }
  };
  const loadClientModules = async (clientId = null, modulesData = null, clientSnapshot = null) => {
    const targetClientId = clientId || client?.id;
    if (!targetClientId) {
      return;
    }
    setLoadingMonitoringModules(true);
    try {
      const normalizedMonitoring = normalizeMonitoringModules(clientSnapshot || modulesData?.modules_monitoring || client);
      setMonitoringModulesState(normalizedMonitoring);
      setInitialMonitoringModules(normalizedMonitoring);
    } finally {
      setLoadingMonitoringModules(false);
    }
  };
  const loadContacts = async (clientId = null, signal, {
    keepVisible = false
  } = {}) => {
    const targetClientId = clientId || client?.id;
    if (!targetClientId) return;
    let requestSignal = signal;
    if (!requestSignal) {
      contactsControllerRef.current?.abort();
      const controller = createTrackedAbortController();
      contactsControllerRef.current = controller;
      requestSignal = controller.signal;
    }
    if (!keepVisible) setLoadingContacts(true);
    try {
      const contactsData = await fetchContacts(targetClientId, {
        signal: requestSignal
      });
      if (requestSignal?.aborted || !isMountedRef.current) return;
      const nextContacts = Array.isArray(contactsData) ? contactsData : [];
      setContacts(nextContacts);
      patchEnterpriseExtras(targetClientId, {
        contacts: nextContacts
      });
      if (isMountedRef.current && String(targetClientId) === String(client?.id)) {
        const primary = pickPrimaryContact(contactsData, targetClientId);
        setFormData(prev => ({
          ...prev,
          primaryContact: primary ? mapContactToPrimary(primary) : prev.primaryContact || emptyPrimaryContact()
        }));
      }
    } catch (err) {
      if (err?.name !== "AbortError") {
        console.error("Error chargement contacts:", err);
      }
    } finally {
      if (isMountedRef.current) setLoadingContacts(false);
    }
  };
  const loadPrestataires = async (clientId = null, signal, {
    keepVisible = false
  } = {}) => {
    const targetClientId = clientId || client?.id;
    if (!targetClientId) return;
    let requestSignal = signal;
    if (!requestSignal) {
      prestatairesControllerRef.current?.abort();
      const controller = createTrackedAbortController();
      prestatairesControllerRef.current = controller;
      requestSignal = controller.signal;
    }
    if (!keepVisible) setLoadingPrestataires(true);
    try {
      const data = await fetchPrestataires(targetClientId, {
        signal: requestSignal
      });
      if (requestSignal?.aborted || !isMountedRef.current) return;
      const nextPrestataires = Array.isArray(data) ? data : [];
      setPrestataires(nextPrestataires);
      patchEnterpriseExtras(targetClientId, {
        prestataires: nextPrestataires
      });
    } catch (err) {
      if (err?.name !== "AbortError") {
        console.error("Error chargement prestataires:", err);
      }
    } finally {
      if (isMountedRef.current) setLoadingPrestataires(false);
    }
  };

  const openPrestataireAttachModal = async () => {
    if (!client?.id) return;
    setShowPrestataireModal(true);
    setLoadingAvailablePrestataires(true);
    try {
      const all = await fetchPrestatairesList();
      const linkedIds = new Set((Array.isArray(prestataires) ? prestataires : []).map(row => String(row.id)));
      const available = (Array.isArray(all) ? all : []).filter(row => !linkedIds.has(String(row.id)));
      if (!isMountedRef.current) return;
      setAvailablePrestataires(available);
    } catch (err) {
      console.error("Error chargement prestataires disponibles:", err);
      if (isMountedRef.current) setAvailablePrestataires([]);
      toast.error(err.message || copy.loadProvidersError || "Impossible de charger les prestataires");
    } finally {
      if (isMountedRef.current) setLoadingAvailablePrestataires(false);
    }
  };

  const handleAttachPrestataire = async row => {
    if (!client?.id || !row?.id || attachingPrestataire) return;
    setAttachingPrestataire(true);
    try {
      await addPrestataireMembership(row.id, { client_id: client.id });
      toast.success(copy.providerLinked || "Prestataire rattaché");
      setShowPrestataireModal(false);
      await loadPrestataires(client.id);
    } catch (err) {
      toast.error(err.message || copy.providerLinkError || "Impossible de rattacher le prestataire");
    } finally {
      setAttachingPrestataire(false);
    }
  };
  const loadLogs = async (page = 1, clientId = null, signal) => {
    const targetClientId = clientId || client?.id;
    if (!targetClientId) {
      return;
    }
    let requestSignal = signal;
    if (!requestSignal) {
      logsControllerRef.current?.abort();
      const controller = createTrackedAbortController();
      logsControllerRef.current = controller;
      requestSignal = controller.signal;
    }
    setLoadingLogs(true);
    try {
      const data = await getClientLogs(targetClientId, page, logsLimit, {
        signal: requestSignal
      });
      if (requestSignal?.aborted || !isMountedRef.current) return;
      setLogs(data.logs || []);
      setLogsTotal(data.total || 0);
      setLogsPage(page);
    } catch (error) {
      if (error?.name === "AbortError") return;
      console.error("Error while loading des logs:", error);
      setLogs([]);
      setLogsTotal(0);
    } finally {
      if (isMountedRef.current) setLoadingLogs(false);
    }
  };
  const loadCheckMKStats = async (clientId = null, signal) => {
    const targetClientId = clientId || client?.id;
    if (!targetClientId) {
      return;
    }
    setLoadingCheckMK(true);
    try {
      const stats = await getClientCheckMKStats(targetClientId, {
        signal
      });
      if (signal?.aborted) return;
      setCheckmkStats(stats || {
        stats: [],
        total: 0
      });
    } catch (error) {
      if (error?.name === "AbortError") return;
      console.error("Error while loading des statistiques CheckMK:", error);
      setCheckmkStats({
        stats: [],
        total: 0
      });
    } finally {
      setLoadingCheckMK(false);
    }
  };
  const loadCampaigns = async (clientId = null, signal) => {
    const targetClientId = clientId || client?.id;
    if (!targetClientId) {
      return;
    }
    try {
      const campaignsData = await getClientCampaigns(targetClientId, {}, {
        signal
      });
      if (signal?.aborted) return;
      setCampaigns(campaignsData || []);
    } catch (error) {
      if (error?.name === "AbortError") return;
      console.error("Error while loading des campagnes:", error);
      setCampaigns([]);
    }
  };
  const loadClientTagsAndNotes = async (clientId = null, signal, {
    keepVisible = false
  } = {}) => {
    const targetClientId = clientId || client?.id;
    if (!targetClientId) return;
    if (!keepVisible) {
      setLoadingTags(true);
      setLoadingNotes(true);
    }
    try {
      const [tags, notesData] = await Promise.all([fetchClientTags(targetClientId, {
        signal
      }), fetchClientNotes(targetClientId, {
        signal
      })]);
      if (signal?.aborted || !isMountedRef.current) return;
      const nextTags = Array.isArray(tags) ? tags : [];
      const nextNotes = Array.isArray(notesData) ? notesData : [];
      setClientTags(nextTags);
      setNotes(nextNotes);
      patchEnterpriseExtras(targetClientId, {
        tags: nextTags,
        notes: nextNotes
      });
    } catch (error) {
      if (error?.name === "AbortError") return;
      console.error("Error lors du loading des tags/notes:", error);
      if (isMountedRef.current && !keepVisible) {
        setClientTags([]);
        setNotes([]);
      }
    } finally {
      if (isMountedRef.current) {
        setLoadingTags(false);
        setLoadingNotes(false);
      }
    }
  };
  const loadClientActivity = async (clientId = null, signal, {
    keepVisible = false
  } = {}) => {
    const targetClientId = clientId || client?.id;
    if (!targetClientId) return;
    if (!keepVisible) setLoadingClientActivity(true);
    try {
      const ticketRows = await fetchTickets({
        clientId: targetClientId,
        limit: 100
      }).catch(() => []);
      let upcomingRows = [];
      let recentRows = [];
      // Credits are loaded independently so edition/community flags and event aborts
      // cannot wipe a successful pack list after F5.
      const creditsGenAtStart = supportCreditsLoadGenRef.current;
      const creditsPromise = fetchClientSupportCredits(targetClientId, {
        signal
      }).then(summary => ({
        ok: true,
        summary
      })).catch(error => {
        if (error?.name === "AbortError") return {
          ok: false,
          aborted: true
        };
        console.error("Error loading support credits:", error);
        return {
          ok: false,
          aborted: false
        };
      });
      if (!isCommunity) {
        [upcomingRows, recentRows] = await Promise.all([fetchEvents({
          clientId: targetClientId,
          upcoming: true,
          limit: 50,
          signal
        }).catch(() => []), fetchEvents({
          clientId: targetClientId,
          recent: true,
          limit: 50,
          signal
        }).catch(() => [])]);
      }
      const creditsResult = await creditsPromise;
      if (signal?.aborted || !isMountedRef.current) return;
      let nextBalance;
      let nextPacks;
      if (creditsResult?.ok && creditsGenAtStart === supportCreditsLoadGenRef.current) {
        const creditSummary = creditsResult.summary;
        nextPacks = Array.isArray(creditSummary?.packs) ? creditSummary.packs : [];
        nextBalance = Number(creditSummary?.balance ?? 0);
        setSupportCreditBalance(nextBalance);
        setSupportCreditPacks(nextPacks);
        if (nextPacks.length > 0) setCreditsExpanded(true);
      }
      const tickets = Array.isArray(ticketRows) ? ticketRows : [];
      const upcomingList = filterUpcomingEvents(Array.isArray(upcomingRows) ? upcomingRows : []);
      const recentList = filterRecentEvents(Array.isArray(recentRows) ? recentRows : []);
      const prestations = tickets.filter(isPrestationTicket);
      const support = tickets.filter(ticket => !isPrestationTicket(ticket));
      setPrestationTickets(prestations);
      setSupportTickets(support);
      setUpcomingEvents(upcomingList);
      setRecentEvents(recentList);
      patchEnterpriseExtras(targetClientId, {
        upcomingEvents: upcomingList,
        recentEvents: recentList,
        supportTickets: support,
        prestationTickets: prestations,
        ...(nextBalance !== undefined ? {
          supportCreditBalance: nextBalance,
          supportCreditPacks: nextPacks
        } : {})
      });
    } catch (error) {
      if (error?.name === "AbortError") return;
      console.error("Error loading client activity:", error);
      if (isMountedRef.current && !keepVisible) {
        setSupportTickets([]);
        setPrestationTickets([]);
        setUpcomingEvents([]);
        setRecentEvents([]);
      }
    } finally {
      if (isMountedRef.current) setLoadingClientActivity(false);
    }
  };
  const handleOpenTicket = (ticket, background = false) => {
    if (!ticket?.id || !onNavigate) return;
    const isSales = isSalesTicket(ticket);
    onNavigate(isSales ? "TicketSalesDetail" : "TicketDetail", {
      ticketId: ticket.id,
      ticketNumber: ticket.ticket_number,
      title: ticket.title,
      ...(isSales ? {
        ticketFamily: "sales",
        fromPage: "TicketSales"
      } : {
        ticketFamily: "support",
        fromPage: "Ticket"
      })
    }, background ? {
      background: true
    } : undefined);
  };
  const handleOpenCampaign = campaign => {
    if (!campaign?.id || !onNavigate || isCommunity) return;
    onNavigate("CampaignDetail", {
      ...campaign,
      client_id: campaign.client_id || client?.id
    });
  };
  const buildDefaultCampaignForm = useCallback(() => {
    const today = new Date();
    const end = new Date(today);
    end.setMonth(end.getMonth() + 1);
    const toInputDate = d => d.toISOString().slice(0, 10);
    return {
      client_id: client?.id || "",
      name: "",
      type: "microsoft_security",
      provider: "microsoft",
      tenant_id: "",
      azure_credential_id: "",
      status: "en_preparation",
      start_date: toInputDate(today),
      end_date: toInputDate(end),
      global_progress: 0,
      description: ""
    };
  }, [client?.id]);
  const handleOpenCreateCampaign = () => {
    if (isCommunity || !client?.id || !canManageCampaigns) return;
    setCampaignFormData(buildDefaultCampaignForm());
    setShowCampaignModal(true);
  };
  const closeServiceBrickMenu = useCallback(() => setServiceBrickMenu(null), []);
  const openServiceBrickMenu = useCallback((brick, event) => {
    if (!brick?.type || !SERVICE_BRICK_MENU_TYPES.has(brick.type)) return;
    event?.preventDefault?.();
    event?.stopPropagation?.();
    const rect = event?.currentTarget?.getBoundingClientRect?.();
    const x = event?.clientX ?? (rect ? rect.left + rect.width / 2 : 0);
    const y = event?.clientY ?? (rect ? rect.bottom + 4 : 0);
    setServiceBrickMenu({
      type: brick.type,
      label: brick.label || brick.type,
      items: Array.isArray(brick.items) ? brick.items : [],
      x,
      y
    });
  }, []);
  const handleServiceBrickOpenPage = useCallback((brickType, selectedItem = null) => {
    if (!client?.id || !onNavigate) return;
    switch (brickType) {
      case "Antivirus": {
        if (selectedItem?.companyId) {
          navigateToAntivirusDetail(selectedItem);
          return;
        }
        const navigable = configuredAntivirusSolutions.filter(item => item?.companyId);
        if (navigable.length === 1) {
          navigateToAntivirusDetail(navigable[0]);
          return;
        }
        if (navigable.length > 1 || configuredAntivirusSolutions.length > 1) {
          setAntivirusPickerSolutions(configuredAntivirusSolutions);
          setAntivirusPickerOpen(true);
          return;
        }
        onNavigate("Cybersecurite", {
          tab: "antivirus",
          clientId: client.id
        });
        return;
      }
      case "Antispam": {
        if (selectedItem?.customerId || selectedItem?.mailinblackTenantId) {
          navigateToAntispamDetail(selectedItem);
          return;
        }
        const navigable = configuredAntispamSolutions.filter(item => item?.customerId || item?.mailinblackTenantId);
        if (navigable.length === 1) {
          navigateToAntispamDetail(navigable[0]);
          return;
        }
        if (navigable.length > 1 || configuredAntispamSolutions.length > 1) {
          setAntispamPickerSolutions(configuredAntispamSolutions);
          setAntispamPickerOpen(true);
          return;
        }
        onNavigate("Cybersecurite", {
          tab: "antispam",
          clientId: client.id
        });
        return;
      }
      case "TenantMicrosoft": {
        if (selectedItem && (selectedItem.tenantId || selectedItem.id || selectedItem.configured)) {
          navigateToMicrosoftTenantDetail(selectedItem);
          return;
        }
        if (configuredMicrosoftTenants.length === 1) {
          navigateToMicrosoftTenantDetail(configuredMicrosoftTenants[0]);
          return;
        }
        if (configuredMicrosoftTenants.length > 1) {
          setMicrosoftTenantPickerTenants(configuredMicrosoftTenants);
          setMicrosoftTenantPickerOpen(true);
          return;
        }
        onNavigate("Service", {
          activeTab: "microsoft",
          clientId: client.id
        });
        return;
      }
      case "GoogleWorkspace":
        onNavigate("Service", {
          activeTab: "microsoft",
          clientId: client.id
        });
        return;
      case "Backup": {
        if (backupInstances.length === 1) {
          const instance = backupInstances[0];
          const payload = buildBackupInstanceDetailPayload({
            ...instance,
            id: instance.id || instance.instanceId,
            instanceId: instance.id || instance.instanceId,
            clientId: client.id,
            clientName: client.name,
            instanceName: instance.nom || instance.name || instance.logiciel || "",
            logiciel: instance.logiciel || ""
          });
          if (payload?.instanceId || payload?.clientId) {
            onNavigate("InstanceDetail", payload);
            return;
          }
        }
        onNavigate("Cybersecurite", {
          tab: "backup",
          clientId: client.id
        });
        return;
      }
      case "NDD": {
        if (configuredDomains.length === 1) {
          setDomainOverviewItem(configuredDomains[0]);
          setDomainOverviewOpen(true);
          return;
        }
        if (configuredDomains.length > 1) {
          setDomainPickerDomains(configuredDomains);
          setDomainPickerOpen(true);
          return;
        }
        onNavigate("Service", {
          activeTab: "domain",
          clientId: client.id
        });
        return;
      }
      case "CertificatsSSL":
        onNavigate("Service", {
          activeTab: "ssl",
          clientId: client.id
        });
        return;
      case "LicensesAbonnements":
        refreshLicencesData();
        return;
      case "Campagne": {
        if (isCommunity) {
          notifyProFeature(copy.proFeatures.campaigns, "cyberCampaigns");
          return;
        }
        if (campaigns.length === 1) {
          handleOpenCampaign(campaigns[0]);
          return;
        }
        if (campaigns.length > 1) {
          setCampaignPickerOpen(true);
          return;
        }
        onNavigate("Campaigns", {
          clientId: client.id
        });
        return;
      }
      default:
        return;
    }
  }, [
    backupInstances,
    campaigns,
    client,
    configuredAntivirusSolutions,
    configuredAntispamSolutions,
    configuredDomains,
    configuredMicrosoftTenants,
    copy.proFeatures.campaigns,
    isCommunity,
    navigateToAntivirusDetail,
    refreshLicencesData,
    navigateToAntispamDetail,
    navigateToMicrosoftTenantDetail,
    onNavigate
  ]);
  const handleServiceBrickEdit = useCallback((brickType, selectedItem = undefined) => {
    if (!client?.id) return;
    switch (brickType) {
      case "Antivirus":
        if (selectedItem) {
          openAntivirusConfigModal("solution", selectedItem);
          return;
        }
        openAntivirusConfigModal("solution", null);
        return;
      case "Antispam":
        if (selectedItem) {
          openAntispamConfigModal("solution", selectedItem);
          return;
        }
        openAntispamConfigModal("solution", null);
        return;
      case "TenantMicrosoft":
        if (selectedItem) {
          openMicrosoftTenantConfigModal("configuration", selectedItem);
          return;
        }
        if (selectedItem === null || !configuredMicrosoftTenants.length) {
          openMicrosoftTenantConfigModal("configuration", null);
          return;
        }
        openMicrosoftTenantConfigModal("overview", null);
        return;
      case "GoogleWorkspace":
        notifyProFeature(copy.toast?.googleWorkspaceSoon || "Google Workspace", "googleWorkspace");
        return;
      case "Backup":
        if (selectedItem?.backupAction === "add-job") {
          openBackupConfigModal("add-job");
          return;
        }
        if (selectedItem?.backupAction === "add-instance" || selectedItem === null) {
          openBackupConfigModal("add-instance");
          return;
        }
        if (selectedItem?.backupAction === "edit-instance" && selectedItem.item) {
          openBackupConfigModal("edit-instance", { instance: selectedItem.item });
          return;
        }
        if (selectedItem?.backupAction === "edit-job" && selectedItem.item) {
          openBackupConfigModal("edit-job", {
            job: selectedItem.item,
            instance: selectedItem.item.instanceId ? { id: selectedItem.item.instanceId } : null
          });
          return;
        }
        openBackupConfigModal("overview");
        return;
      case "NDD":
        if (selectedItem) {
          openDomainsConfigModal("inventory", null, { editDomain: selectedItem });
          return;
        }
        openDomainsConfigModal("inventory", null, { openAddChoice: true });
        return;
      case "CertificatsSSL":
        openSslModal(selectedItem || null);
        return;
      case "LicensesAbonnements":
        openLicencesModal(selectedItem || null);
        return;
      case "Campagne":
        if (isCommunity) {
          notifyProFeature(copy.proFeatures.campaigns, "cyberCampaigns");
          return;
        }
        if (canManageCampaigns) handleOpenCreateCampaign();
        return;
      default:
        return;
    }
  }, [
    canManageCampaigns,
    client?.id,
    configuredAntivirusSolutions.length,
    configuredAntispamSolutions.length,
    configuredDomains.length,
    configuredMicrosoftTenants.length,
    copy.proFeatures,
    globalOvhConfigured,
    openSslModal,
    openLicencesModal,
    isCommunity,
    openAntivirusConfigModal,
    openAntispamConfigModal,
    openBackupConfigModal,
    openDomainsConfigModal,
    openMicrosoftTenantConfigModal
  ]);
  const requestServiceBrickDelete = useCallback((brickType, item) => {
    if (!item || !brickType) return;
    const labelCandidates = [
      item.name,
      item.nom,
      item.label,
      item.solution,
      item.editeur,
      item.logiciel,
      item.tenantName,
      item.displayName,
      item.domain,
      item.hostname,
      item.host
    ];
    const label = labelCandidates.find(value => typeof value === "string" && value.trim())?.trim()
      || brickType;
    setSolutionDeleteTarget({ type: brickType, item, label });
  }, []);
  const executeServiceBrickDelete = useCallback(async (type, item, { silent = false } = {}) => {
    if (!client?.id || !type || !item) return;
    if (type === "Antivirus") {
      await removeAntivirusSolution(client.id, item);
      await refreshAntivirusState();
      if (!silent) toast.success(copy.toast.antivirusAssociationRemoved);
      return;
    }
    if (type === "Antispam") {
      await removeAntispamSolution(client.id, item);
      await refreshAntispamState();
      if (!silent) toast.success(copy.toast.antispamAssociationRemoved);
      return;
    }
    if (type === "TenantMicrosoft") {
      await removeMicrosoftTenant(client.id, item);
      await refreshMicrosoftTenantState();
      if (!silent) toast.success(copy.toast.microsoftTenantRemoved);
      return;
    }
    if (type === "CertificatsSSL") {
      if (!item.id) throw new Error("Certificat invalide");
      await deleteClientSslCertificate(client.id, item.id);
      await refreshSslData();
      if (!silent) toast.success(copy.toast?.sslRemoved || "Certificat SSL retiré");
      return;
    }
    if (type === "LicensesAbonnements") {
      if (!item.id) throw new Error("Licence invalide");
      await deleteClientLicence(client.id, item.id);
      await refreshLicencesData();
      if (!silent) toast.success(copy.toast?.licenceRemoved || "Licence supprimée");
      return;
    }
    if (type === "NDD") {
      await removeMonitoredDomain(client.id, item);
      await refreshDomainsState();
      if (!silent) toast.success(copy.toast.domainRemoved || copy.toast.domainRemovedMonitoring || "Domaine retiré");
    }
  }, [
    client?.id,
    copy.toast,
    refreshAntivirusState,
    refreshAntispamState,
    refreshMicrosoftTenantState,
    refreshSslData,
    refreshLicencesData,
    refreshDomainsState
  ]);
  const confirmServiceBrickDelete = useCallback(async () => {
    if (!client?.id || !solutionDeleteTarget?.item) return;
    const { type, item } = solutionDeleteTarget;
    setDeletingSolution(true);
    try {
      await executeServiceBrickDelete(type, item);
      setSolutionDeleteTarget(null);
    } catch (error) {
      console.error(error);
      toast.error(error?.message || interpolate(copy.toast.saveError, { message: "suppression" }));
    } finally {
      setDeletingSolution(false);
    }
  }, [client?.id, copy.toast, executeServiceBrickDelete, solutionDeleteTarget]);
  const serviceBrickMenuItems = useMemo(() => {
    if (!serviceBrickMenu?.type) return [];
    const menuCopy = copy.serviceBrickMenu || {};
    const isSolutionBrick = ["Antivirus", "Antispam", "TenantMicrosoft"].includes(serviceBrickMenu.type);
    if (isSolutionBrick) {
      const items = Array.isArray(serviceBrickMenu.items) ? serviceBrickMenu.items : [];
      const menuItems = [{
        key: "edit",
        label: menuCopy.edit || "Éditer",
        icon: "mdi:pencil-outline",
        onSelect: () => handleServiceBrickEdit(serviceBrickMenu.type, items.length === 1 ? items[0] : undefined)
      }];
      if (items.length === 1) {
        menuItems.push({
          key: "delete",
          label: menuCopy.delete || "Supprimer",
          icon: "mdi:trash-can-outline",
          danger: true,
          onSelect: () => requestServiceBrickDelete(serviceBrickMenu.type, items[0])
        });
      }
      return menuItems;
    }
    return [{
      key: "edit",
      label: menuCopy.edit || "Éditer",
      icon: "mdi:pencil-outline",
      onSelect: () => handleServiceBrickEdit(serviceBrickMenu.type)
    }];
  }, [
    copy.serviceBrickMenu,
    handleServiceBrickEdit,
    requestServiceBrickDelete,
    serviceBrickMenu
  ]);
  const handleSubmitCampaign = async e => {
    e?.preventDefault?.();
    if (!client?.id) return;
    if (!campaignFormData.client_id || !String(campaignFormData.name || "").trim() || !campaignFormData.type) {
      toast.error(campaignsCopy.toasts.requiredFields);
      return;
    }
    if (campaignFormData.type === "microsoft_security" && (!campaignFormData.tenant_id || !campaignFormData.azure_credential_id)) {
      toast.error(campaignsCopy.toasts.needMicrosoftTenant);
      return;
    }
    try {
      setSavingCampaign(true);
      const newCampaign = await createClientCampaign(client.id, {
        ...campaignFormData,
        client_id: client.id,
        type: "microsoft_security",
        locale
      });
      toast.success(campaignsCopy.toasts.created);
      setShowCampaignModal(false);
      setCampaignFormData(buildDefaultCampaignForm());
      await loadCampaigns(client.id);
      if (onNavigate && newCampaign) {
        onNavigate("CampaignDetail", {
          ...newCampaign,
          client_id: client.id,
          client_name: client.name || formData?.name || `Client ${client.id}`
        });
      }
    } catch (error) {
      console.error("Error creating campaign:", error);
      toast.error(error?.message || campaignsCopy.toasts.saveError);
    } finally {
      setSavingCampaign(false);
    }
  };
  const campaignSourceList = useMemo(
    () => (isCommunity ? DEMO_CAMPAIGNS : campaigns),
    [campaigns, isCommunity]
  );
  const ongoingCampaigns = useMemo(
    () => campaignSourceList.filter(isOngoingCampaign),
    [campaignSourceList]
  );
  const filteredCampaigns = useMemo(() => {
    const query = campaignSearchQuery.trim().toLowerCase();
    return campaignSourceList.filter(campaign => {
      const ongoing = isOngoingCampaign(campaign);
      if (campaignStatusFilter === "open" && !ongoing) return false;
      if (campaignStatusFilter === "closed" && ongoing) return false;
      if (!query) return true;
      const statusLabel = getCampaignStatusLabel(campaign.status, locale);
      const typeLabel = getCampaignTypeLabel(campaign.type, locale);
      const haystack = [
        campaign.name,
        campaign.type,
        typeLabel,
        campaign.status,
        statusLabel
      ].filter(Boolean).join(" ").toLowerCase();
      return haystack.includes(query);
    });
  }, [campaignSearchQuery, campaignSourceList, campaignStatusFilter, locale]);
  const prestationTicketsSource = useMemo(
    () => (isCommunity ? DEMO_PRESTATION_TICKETS : prestationTickets),
    [isCommunity, prestationTickets]
  );
  const handleActivityTableSort = useCallback((section, column) => {
    setActivityTableSort(prev => {
      const defaults = ACTIVITY_SORT_DEFAULTS[section] || { key: null, direction: "asc" };
      const current = prev[section] || defaults;
      const firstDirection = ["updated", "created", "start", "end", "progress", "sla"].includes(column) ? "desc" : "asc";
      const next = cycleSortState({
        column,
        sortBy: current.key,
        sortDirection: current.direction || "asc",
        defaultSortBy: defaults.key,
        defaultSortDirection: defaults.direction,
        firstDirection
      });
      return {
        ...prev,
        [section]: {
          key: next.sortBy,
          direction: next.sortDirection
        }
      };
    });
  }, []);
  const getActivitySortMeta = useCallback(section => {
    const defaults = ACTIVITY_SORT_DEFAULTS[section] || { key: null, direction: "asc" };
    const current = activityTableSort[section] || defaults;
    return {
      key: current.key || defaults.key,
      direction: current.direction || defaults.direction
    };
  }, [activityTableSort]);
  const matchesActivityStatusFilter = useCallback((ticket, statusFilter) => {
    if (statusFilter === "open") return isOpenTicket(ticket);
    if (statusFilter === "closed") return !isOpenTicket(ticket);
    return true;
  }, []);
  const filteredSupportTickets = useMemo(() => {
    const query = supportSearchQuery.trim().toLowerCase();
    const slaOptions = {
      clients: client ? [client] : [],
      now: slaNow
    };
    return supportTickets.filter(ticket => {
      if (!matchesActivityStatusFilter(ticket, supportStatusFilter)) return false;
      if (!query) return true;
      const status = getTicketStatusLabel(normalizeTicketStatus(ticket.status), locale);
      const slaLabel = isCommunity ? "" : getTicketSlaDisplay(ticket, slaOptions).label || "";
      const haystack = [
        ticket.ticket_number,
        ticket.title,
        status,
        slaLabel
      ].filter(Boolean).join(" ").toLowerCase();
      return haystack.includes(query);
    });
  }, [client, isCommunity, locale, matchesActivityStatusFilter, slaNow, supportSearchQuery, supportStatusFilter, supportTickets]);
  const filteredPrestationTickets = useMemo(() => {
    const query = prestationSearchQuery.trim().toLowerCase();
    return prestationTicketsSource.filter(ticket => {
      if (!matchesActivityStatusFilter(ticket, prestationStatusFilter)) return false;
      if (!query) return true;
      const status = getTicketStatusLabel(normalizeTicketStatus(ticket.status), locale);
      const typeLabel = getPrestationCategoryLabel(ticket.category, locale);
      const haystack = [
        ticket.ticket_number,
        typeLabel,
        status
      ].filter(Boolean).join(" ").toLowerCase();
      return haystack.includes(query);
    });
  }, [locale, matchesActivityStatusFilter, prestationSearchQuery, prestationStatusFilter, prestationTicketsSource]);
  const sortedSupportTickets = useMemo(() => {
    const { key, direction } = getActivitySortMeta("support");
    const list = [...filteredSupportTickets];
    const slaOptions = {
      clients: client ? [client] : [],
      now: slaNow
    };
    list.sort((left, right) => {
      let a;
      let b;
      switch (key) {
        case "number":
          a = Number(left.ticket_number);
          b = Number(right.ticket_number);
          if (Number.isFinite(a) && Number.isFinite(b)) return compareActivitySortValues(a, b, direction);
          return compareActivitySortValues(String(left.ticket_number || ""), String(right.ticket_number || ""), direction);
        case "title":
          a = left.title || "";
          b = right.title || "";
          break;
        case "status":
          a = getTicketStatusLabel(normalizeTicketStatus(left.status), locale);
          b = getTicketStatusLabel(normalizeTicketStatus(right.status), locale);
          break;
        case "sla":
          a = getTicketSlaSortValue(left, slaOptions);
          b = getTicketSlaSortValue(right, slaOptions);
          break;
        case "created":
          a = toActivitySortTime(left.created_at);
          b = toActivitySortTime(right.created_at);
          break;
        case "updated":
        default:
          a = toActivitySortTime(left.updated_at || left.created_at);
          b = toActivitySortTime(right.updated_at || right.created_at);
          break;
      }
      return compareActivitySortValues(a, b, direction);
    });
    return list;
  }, [client, filteredSupportTickets, getActivitySortMeta, locale, slaNow]);
  const sortedPrestationTickets = useMemo(() => {
    const { key, direction } = getActivitySortMeta("prestations");
    const list = [...filteredPrestationTickets];
    list.sort((left, right) => {
      let a;
      let b;
      switch (key) {
        case "number":
          a = Number(left.ticket_number);
          b = Number(right.ticket_number);
          if (Number.isFinite(a) && Number.isFinite(b)) return compareActivitySortValues(a, b, direction);
          return compareActivitySortValues(String(left.ticket_number || ""), String(right.ticket_number || ""), direction);
        case "type":
          a = getPrestationCategoryLabel(left.category, locale);
          b = getPrestationCategoryLabel(right.category, locale);
          break;
        case "status":
          a = getTicketStatusLabel(normalizeTicketStatus(left.status), locale);
          b = getTicketStatusLabel(normalizeTicketStatus(right.status), locale);
          break;
        case "created":
          a = toActivitySortTime(left.created_at);
          b = toActivitySortTime(right.created_at);
          break;
        case "updated":
        default:
          a = toActivitySortTime(left.updated_at || left.created_at);
          b = toActivitySortTime(right.updated_at || right.created_at);
          break;
      }
      return compareActivitySortValues(a, b, direction);
    });
    return list;
  }, [filteredPrestationTickets, getActivitySortMeta, locale]);
  const sortedOngoingCampaigns = useMemo(() => {
    const { key, direction } = getActivitySortMeta("campaigns");
    const list = [...filteredCampaigns];
    list.sort((left, right) => {
      let a;
      let b;
      switch (key) {
        case "name":
          a = left.name || "";
          b = right.name || "";
          break;
        case "type":
          a = getCampaignTypeLabel(left.type, locale);
          b = getCampaignTypeLabel(right.type, locale);
          break;
        case "status":
          a = getCampaignStatusLabel(left.status, locale);
          b = getCampaignStatusLabel(right.status, locale);
          break;
        case "progress":
          a = typeof left.global_progress === "number" ? left.global_progress : null;
          b = typeof right.global_progress === "number" ? right.global_progress : null;
          break;
        case "start":
        default:
          a = toActivitySortTime(left.start_date);
          b = toActivitySortTime(right.start_date);
          break;
      }
      return compareActivitySortValues(a, b, direction);
    });
    return list;
  }, [filteredCampaigns, getActivitySortMeta, locale]);
  const renderActivitySortableTh = useCallback((section, columnKey, label) => {
    const { key, direction } = getActivitySortMeta(section);
    const isSorted = key === columnKey;
    return (
      <th
        key={columnKey}
        className={styles.sortableTh}
        onClick={() => handleActivityTableSort(section, columnKey)}
        aria-sort={isSorted ? (direction === "asc" ? "ascending" : "descending") : "none"}
      >
        <span className={styles.activityThContent}>
          {label}
          {isSorted ? (
            <SortIcon active direction={direction || "asc"} className={styles.activitySortIndicator} />
          ) : null}
        </span>
      </th>
    );
  }, [getActivitySortMeta, handleActivityTableSort]);
  const getActivityTablePage = useCallback(section => {
    const page = Number(activityTablePage[section]) || 1;
    return page < 1 ? 1 : page;
  }, [activityTablePage]);

  const setActivitySectionPage = useCallback((section, nextPage) => {
    setActivityTablePage(prev => ({
      ...prev,
      [section]: Math.max(1, Number(nextPage) || 1)
    }));
  }, []);

  const paginateActivityList = useCallback((section, list) => {
    const total = Array.isArray(list) ? list.length : 0;
    const safePageSize = Math.max(1, Number(activityPageSize) || 50);
    const totalPages = Math.max(1, Math.ceil(Math.max(total, 1) / safePageSize));
    const page = Math.min(getActivityTablePage(section), totalPages);
    const start = (page - 1) * safePageSize;
    return {
      page,
      totalPages,
      total,
      safePageSize,
      pagedList: total === 0 ? [] : list.slice(start, start + safePageSize)
    };
  }, [activityPageSize, getActivityTablePage]);

  const pagedSupportTickets = useMemo(
    () => paginateActivityList("support", sortedSupportTickets),
    [paginateActivityList, sortedSupportTickets]
  );
  const pagedPrestationTickets = useMemo(
    () => paginateActivityList("prestations", sortedPrestationTickets),
    [paginateActivityList, sortedPrestationTickets]
  );
  const pagedOngoingCampaigns = useMemo(
    () => paginateActivityList("campaigns", sortedOngoingCampaigns),
    [paginateActivityList, sortedOngoingCampaigns]
  );

  useEffect(() => {
    setActivityTablePage(prev => ({ ...prev, support: 1 }));
  }, [supportSearchQuery, supportStatusFilter]);

  useEffect(() => {
    setActivityTablePage(prev => ({ ...prev, prestations: 1 }));
  }, [prestationSearchQuery, prestationStatusFilter]);

  useEffect(() => {
    setActivityTablePage(prev => ({ ...prev, campaigns: 1 }));
  }, [campaignSearchQuery, campaignStatusFilter]);

  useEffect(() => {
    setActivityTablePage(prev => ({ ...prev, events: 1 }));
  }, [eventsSearchQuery, eventsStatusFilter]);

  const renderActivityPagination = useCallback(sectionMeta => {
    const { section, total, page, totalPages, safePageSize } = sectionMeta;
    const rangeStart = total === 0 ? 0 : (page - 1) * safePageSize + 1;
    const rangeEnd = total === 0 ? 0 : Math.min(page * safePageSize, total);
    return (
      <div className={`${equipStyles.pagination} ${equipStyles.paginationEmbedded} ${styles.activityPagination}`}>
        <div className={equipStyles.paginationLeft}>
          <span className={equipStyles.paginationLabel}>{copy.activityPerPage || "Par page"}</span>
          <select
            className={equipStyles.paginationSelect}
            value={safePageSize}
            onChange={e => {
              setActivityPageSize(Number(e.target.value));
              setActivitySectionPage(section, 1);
            }}
            aria-label={copy.activityPerPage || "Par page"}
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
          <span className={equipStyles.paginationInfo}>
            {interpolate(copy.activityRangeInfo || "{start}–{end} sur {total}", {
              start: String(rangeStart),
              end: String(rangeEnd),
              total: String(total)
            })}
          </span>
        </div>
        <div className={equipStyles.paginationRight}>
          
            <button
              type="button"
              className={equipStyles.pageBtn}
              onClick={() => setActivitySectionPage(section, page - 1)}
              disabled={page <= 1 || total === 0}
              aria-label={copy.activityPrevPage || "Page précédente"}
            >
              <FaChevronLeft />
            </button>
          
          <span className={equipStyles.paginationInfo}>
            {interpolate(copy.activityPageInfo || "Page {current} / {total}", {
              current: String(total === 0 ? 0 : page),
              total: String(total === 0 ? 0 : totalPages)
            })}
          </span>
          
            <button
              type="button"
              className={equipStyles.pageBtn}
              onClick={() => setActivitySectionPage(section, page + 1)}
              disabled={page >= totalPages || total === 0}
              aria-label={copy.activityNextPage || "Page suivante"}
            >
              <FaChevronRight />
            </button>
          
        </div>
      </div>
    );
  }, [
    copy.activityNextPage,
    copy.activityPageInfo,
    copy.activityPerPage,
    copy.activityPrevPage,
    copy.activityRangeInfo,
    setActivitySectionPage
  ]);

  const renderActivityEmpty = useCallback((icon, text) => (
    <div className={styles.activityEmptyState}>
      <UiKitEmptyState bare icon={icon} text={text} />
    </div>
  ), []);

  const renderActivityToolbar = useCallback((searchValue, onSearchChange, statusFilter, onStatusFilterChange, extraActions = null, statusOptionsOverride = null) => {
    const placeholder = copy.activitySearchPlaceholder || "Rechercher";
    const statusOptions = statusOptionsOverride || [
      { id: "all", label: copy.activityFilterAll || "Tous" },
      { id: "open", label: copy.activityFilterOpen || "Ouverts" },
      { id: "closed", label: copy.activityFilterClosed || "Clos" }
    ];
    return (
      <div className={`${equipStyles.hardwarePageEmbedded} ${equipStyles.embeddedFilterBar} ${equipStyles.embeddedFilterBarToolbar} ${styles.activityToolbar}`}>
        <div className={equipStyles.embeddedSearchWrap}>
          <div className={equipStyles.embeddedSearchBox}>
            <Icon icon="mdi:magnify" className={equipStyles.embeddedSearchIcon} aria-hidden />
            <input
              type="text"
              className={equipStyles.embeddedSearchInput}
              value={searchValue}
              onChange={event => onSearchChange(event.target.value)}
              placeholder={placeholder}
              aria-label={placeholder}
            />
            {searchValue ? (
              <button
                type="button"
                className={equipStyles.embeddedSearchClear}
                onClick={() => onSearchChange("")}
                aria-label={copy.activityClearSearchAria || "Effacer la recherche"}
              >
                <FaTimes aria-hidden />
              </button>
            ) : null}
          </div>
          <div className={`${equipStyles.embeddedSearchActions} ${styles.activityToolbarActions}`}>
            <ActivityStatusSegmented
              value={statusFilter}
              onChange={onStatusFilterChange}
              options={statusOptions}
              ariaLabel={copy.activityFilterStatusAria || "Filtrer par statut"}
            />
            {extraActions}
          </div>
        </div>
      </div>
    );
  }, [
    copy.activityClearSearchAria,
    copy.activityFilterAll,
    copy.activityFilterClosed,
    copy.activityFilterOpen,
    copy.activityFilterStatusAria,
    copy.activitySearchPlaceholder
  ]);
  const allClientEvents = useMemo(() => {
    const byId = new Map();
    const planningOnly = [
      ...filterUpcomingEvents(upcomingEvents),
      ...filterRecentEvents(recentEvents)
    ].filter(event => event && !event._isCampaign && event.type !== "campagne");
    for (const event of planningOnly) {
      const key = event?.id != null ? String(event.id) : `${getEventStartValue(event)}-${event?.title || ""}`;
      if (!byId.has(key)) byId.set(key, event);
    }
    return [...byId.values()];
  }, [recentEvents, upcomingEvents]);
  const getEventStatusMeta = useCallback(event => {
    if (isUpcomingEvent(event)) {
      return {
        id: "upcoming",
        label: copy.eventStatusUpcoming || copy.eventBookmarks?.sectionUpcoming || "À venir"
      };
    }
    if (isRecentEvent(event)) {
      return {
        id: "recent",
        label: copy.eventStatusRecent || copy.eventBookmarks?.sectionRecent || "Récent"
      };
    }
    return {
      id: "other",
      label: copy.table?.status || "—"
    };
  }, [copy.eventBookmarks?.sectionRecent, copy.eventBookmarks?.sectionUpcoming, copy.eventStatusRecent, copy.eventStatusUpcoming, copy.table?.status]);
  const filteredClientEvents = useMemo(() => {
    const query = eventsSearchQuery.trim().toLowerCase();
    return allClientEvents.filter(event => {
      const statusMeta = getEventStatusMeta(event);
      if (eventsStatusFilter === "upcoming" && statusMeta.id !== "upcoming") return false;
      if (eventsStatusFilter === "recent" && statusMeta.id !== "recent") return false;
      if (!query) return true;
      const typeLabel = eventTypeLabels[event?.type] || event?.type || "";
      const agentLabel = resolveEventAssigneeLabel(event, users);
      const haystack = [
        event?.title,
        typeLabel,
        statusMeta.label,
        agentLabel,
        getEventStartValue(event),
        getEventEndValue(event)
      ].filter(Boolean).join(" ").toLowerCase();
      return haystack.includes(query);
    });
  }, [allClientEvents, eventTypeLabels, eventsSearchQuery, eventsStatusFilter, getEventStatusMeta, users]);
  const sortedClientEvents = useMemo(() => {
    const { key, direction } = getActivitySortMeta("events");
    const list = [...filteredClientEvents];
    list.sort((left, right) => {
      let a;
      let b;
      switch (key) {
        case "title":
          a = left.title || "";
          b = right.title || "";
          break;
        case "type":
          a = eventTypeLabels[left?.type] || left?.type || "";
          b = eventTypeLabels[right?.type] || right?.type || "";
          break;
        case "status":
          a = getEventStatusMeta(left).label;
          b = getEventStatusMeta(right).label;
          break;
        case "agent":
          a = resolveEventAssigneeLabel(left, users);
          b = resolveEventAssigneeLabel(right, users);
          break;
        case "end":
          a = toActivitySortTime(getEventEndValue(left));
          b = toActivitySortTime(getEventEndValue(right));
          break;
        case "start":
        default:
          a = toActivitySortTime(getEventStartValue(left));
          b = toActivitySortTime(getEventStartValue(right));
          break;
      }
      return compareActivitySortValues(a, b, direction);
    });
    return list;
  }, [eventTypeLabels, filteredClientEvents, getActivitySortMeta, getEventStatusMeta, users]);
  const pagedClientEvents = useMemo(
    () => paginateActivityList("events", sortedClientEvents),
    [paginateActivityList, sortedClientEvents]
  );
  const handleOpenClientEvent = useCallback(event => {
    if (!event) return;
    if (event._isCampaign && event._campaignData) {
      handleOpenCampaign(event._campaignData);
      return;
    }
    if (canScheduleEvent) {
      setEditingEvent(event);
      setEventModalOpen(true);
      return;
    }
    const start = getEventStartValue(event);
    onNavigate?.("Planning", {
      focusEventId: event.id,
      focusDate: start,
      clientId: event.client_id ?? client?.id ?? null
    });
  }, [canScheduleEvent, client?.id, handleOpenCampaign, onNavigate]);
  const handleReloadClientActivity = () => {
    if (client?.id) loadClientActivity(client.id);
  };
  const reloadSupportCredits = useCallback(async () => {
    if (!client?.id) return;
    const gen = ++supportCreditsLoadGenRef.current;
    try {
      const creditSummary = await fetchClientSupportCredits(client.id);
      if (gen !== supportCreditsLoadGenRef.current || !isMountedRef.current) return;
      const packs = Array.isArray(creditSummary?.packs) ? creditSummary.packs : [];
      const balance = Number(creditSummary?.balance ?? 0);
      setSupportCreditBalance(balance);
      setSupportCreditPacks(packs);
      if (packs.length > 0) setCreditsExpanded(true);
      patchEnterpriseExtras(client.id, {
        supportCreditBalance: balance,
        supportCreditPacks: packs
      });
    } catch (error) {
      console.error("Error reloading support credits:", error);
    }
  }, [client?.id]);
  const supportCreditPackSeed = useMemo(() => (client?.id ? { client_id: client.id } : null), [client?.id]);
  const supportCreditModalClients = useMemo(() => (client ? [client] : []), [client]);
  // If edition resolves to Pro after the first page load, credits must be (re)fetched.
  useEffect(() => {
    if (!client?.id || isCommunity) return;
    void reloadSupportCredits();
  }, [client?.id, isCommunity, reloadSupportCredits]);
  const siteFilterBadge = activeSiteFilter ? <span className={styles.panelFilterBadge}>
      {interpolate(copy.filterBadge, {
      value: activeSiteFilter
    })}
      <button type="button" className={styles.panelFilterBadgeClear} onClick={() => setActiveSiteFilter(null)} aria-label={interpolate(copy.clearSiteFilterAria, {
      value: activeSiteFilter
    })} title={copy.clearSiteFilter}>
        <Icon icon="mdi:close" aria-hidden />
      </button>
    </span> : null;
  const handleInfraNodeClick = useCallback(node => {
    const familyKey = node?.familyKey || parseCustomFamilyType(node?.type);
    setOverviewTab("map");
    const scrollToEquipment = () => {
      equipmentSectionRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    };
    if (node?.equipment?.name && !node?.isCategory) {
      setEquipmentSearchQuery(node.equipment.name);
    }
    if (familyKey) {
      equipmentPageRef.current?.focusType?.(`Custom:${familyKey}`);
      requestAnimationFrame(scrollToEquipment);
      return;
    }
    if (node?.type) {
      equipmentPageRef.current?.focusType?.(node.type);
    }
    requestAnimationFrame(scrollToEquipment);
  }, []);
  const loadTotalEquipment = async (clientId = null, preloadedClientData = null, modulesData = null, signal) => {
    const targetClientId = clientId || client?.id;
    if (!targetClientId) {
      return;
    }
    setLoadingTotalEquipment(true);
    try {
      const totalsData = await getClientEquipmentTotal(targetClientId, {
        clientData: preloadedClientData,
        modulesData,
        signal
      });
      if (signal?.aborted) return;
      const nextTotals = totalsData || {
        byType: {},
        total: 0
      };
      setEquipmentTotals(nextTotals);
      // Keep hero KPI in sync without waiting for the cartography tab / EquipmentPage mount.
      setHardwareEquipmentTotalCount(Number(nextTotals.total) || 0);
    } catch (error) {
      if (error?.name === "AbortError") return;
      console.error("Error lors du loading des totaux d'equipments:", error);
      setEquipmentTotals({
        byType: {},
        total: 0
      });
      setHardwareEquipmentTotalCount(0);
    } finally {
      setLoadingTotalEquipment(false);
    }
  };
  const formatNoteDate = dateString => {
    if (!dateString) return "";
    try {
      return new Date(dateString).toLocaleString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
    } catch {
      return dateString;
    }
  };
  const normalizePhoneForHref = value => {
    const raw = (value || "").toString().trim();
    if (!raw) return "";
    return raw.replace(/[^\d+]/g, "");
  };
  const toTelHref = value => {
    const normalized = normalizePhoneForHref(value);
    return normalized ? `tel:${normalized}` : "";
  };
  const toMailtoHref = value => {
    const email = (value || "").toString().trim();
    return email ? `mailto:${encodeURIComponent(email)}` : "";
  };
  const quickActionsCopy = copy.quickActions || {};
  const handleQuickCreateTicket = () => {
    if (!canCreateTicket || !client?.id || !onNavigate) return;
    onNavigate("TicketCreate", {
      clientId: client.id,
      ...(formData.primaryContact?.id ? { contactId: formData.primaryContact.id } : {})
    });
  };
  const handleQuickScheduleIntervention = () => {
    if (!canScheduleEvent) return;
    if (isCommunity) {
      notifyProFeature(copy.proFeatures.planning, "planning");
      return;
    }
    setEditingEvent(null);
    setEventModalOpen(true);
  };
  const formatContactCommunicationLines = contact => normalizeContactCommunications(contact).map(entry => {
    const typeDef = getCommunicationTypeDef(entry.type);
    const favorite = entry.isPrimary ? " ★" : "";
    return `${typeDef.label}${favorite}: ${entry.value}`;
  });
  const copyContactCard = async contact => {
    const fullName = `${contact?.nom || ""} ${contact?.prenom || ""}`.trim() || copy.defaultContactName;
    const commLines = formatContactCommunicationLines(contact);
    const lines = [`${copy.table.name}: ${fullName}`, `${copy.share.role}: ${contact?.poste || copy.defaultContactName}`, ...(commLines.length > 0 ? commLines : [`${copy.share.email}: -`, `${copy.share.phone}: -`])];
    const payload = lines.join("\n");
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(payload);
        toast.success(copy.toast.contactCardCopied);
        return;
      }
      throw new Error("Clipboard API indisponible");
    } catch (error) {
      try {
        const textarea = document.createElement("textarea");
        textarea.value = payload;
        textarea.setAttribute("readonly", "");
        textarea.style.position = "absolute";
        textarea.style.left = "-9999px";
        document.body.appendChild(textarea);
        textarea.select();
        const ok = document.execCommand("copy");
        document.body.removeChild(textarea);
        if (!ok) throw new Error("Copy fallback failed");
        toast.success(copy.toast.contactCardCopied);
      } catch (fallbackError) {
        toast.error(copy.toast.contactCardCopyError);
      }
    }
  };
  const shareContactCard = async contact => {
    const fullName = `${contact?.nom || ""} ${contact?.prenom || ""}`.trim() || copy.defaultContactName;
    const commLines = formatContactCommunicationLines(contact);
    const lines = [`${copy.table.name}: ${fullName}`, `${copy.share.role}: ${contact?.poste || copy.defaultContactName}`, ...(commLines.length > 0 ? commLines : [`${copy.share.email}: -`, `${copy.share.phone}: -`])];
    const payload = lines.join("\n");
    try {
      if (navigator?.share) {
        await navigator.share({
          title: interpolate(copy.share.title, {
            name: fullName
          }),
          text: payload
        });
        return;
      }
      toast.info(copy.share.unavailable);
    } catch (e) {
      toast.info(copy.share.cancelled);
    }
  };
  const handleBack = () => {
    if (onNavigate) {
      onNavigate("Contrat");
    } else {
      navigate("/?tab=Contrat");
    }
  };
  const detectChanges = (oldData, newData) => {
    const changes = [];
    const oldContrat = getContratData(oldData);
    const newContrat = newData.contrat ? getContratData({
      contrat: newData.contrat
    }) : null;
    const normalizeId = value => value === null || value === undefined ? '' : String(value);
    const simpleFields = [{
      key: 'name',
      label: 'nom'
    }, {
      key: 'email',
      label: 'email'
    }, {
      key: 'phone',
      label: 'phone'
    }, {
      key: 'address',
      label: 'adresse'
    }, {
      key: 'siret',
      label: 'legal identifier'
    }, {
      key: 'secteur',
      label: "business sector"
    }, {
      key: 'commercialId',
      label: 'commercial'
    }];
    if (newData.sites !== undefined) {
      const oldSerialized = serializeSitesForCompare(oldData.sites);
      const newSerialized = serializeSitesForCompare(newData.sites);
      if (oldSerialized !== newSerialized) {
        changes.push({
          field: 'sites',
          label: 'lieux',
          oldValue: formatSitesForLog(oldData.sites) || '',
          newValue: formatSitesForLog(newData.sites) || ''
        });
      }
    }
    simpleFields.forEach(({
      key,
      label
    }) => {
      const oldValue = key === 'commercialId' ? normalizeId(oldData.commercialId || oldData.commercial_id) : oldData[key] || '';
      const newValue = key === 'commercialId' ? normalizeId(newData[key]) : newData[key] || '';
      if (oldValue !== newValue) {
        changes.push({
          field: key,
          label: label,
          oldValue: oldValue,
          newValue: newValue
        });
      }
    });
    if (newContrat) {
      if (oldContrat.debut !== newContrat.debut) {
        changes.push({
          field: 'contrat.debut',
          label: 'contract start date',
          oldValue: oldContrat.debut || '',
          newValue: newContrat.debut || ''
        });
      }
      if (oldContrat.expiration !== newContrat.expiration) {
        changes.push({
          field: 'contrat.expiration',
          label: 'contract expiry date',
          oldValue: oldContrat.expiration || '',
          newValue: newContrat.expiration || ''
        });
      }
      if (oldContrat.suspendu !== newContrat.suspendu) {
        changes.push({
          field: 'contrat.suspendu',
          label: 'contract suspension',
          oldValue: oldContrat.suspendu ? 'suspended' : 'active',
          newValue: newContrat.suspendu ? 'suspended' : 'active'
        });
      }
      const oldType = String(oldContrat.type ?? "");
      const newType = String(newContrat.type ?? "");
      if (oldType !== newType) {
        changes.push({
          field: 'contrat.type',
          label: "company type",
          oldValue: getContractTypeLabel(oldType, locale),
          newValue: getContractTypeLabel(newType, locale)
        });
      }
      const oldSla = parseClientSla(oldContrat);
      const newSla = parseClientSla(newContrat);
      if (JSON.stringify(oldSla) !== JSON.stringify(newSla)) {
        changes.push({
          field: 'contrat.sla',
          label: 'SLA support',
          oldValue: oldSla.enabled ? 'enabled' : 'disabled',
          newValue: newSla.enabled ? 'enabled' : 'disabled'
        });
      }
    }
    if (newData.modules) {
      const oldModules = getContractModules(oldData);
      const newModules = getContractModules({
        modules: newData.modules
      });
      Object.keys({
        ...oldModules,
        ...newModules
      }).forEach(moduleKey => {
        if (oldModules[moduleKey] !== newModules[moduleKey]) {
          const moduleLabel = moduleKey === 'Hebergement' ? 'hosting' : moduleKey.toLowerCase();
          changes.push({
            field: `modules.${moduleKey}`,
            label: `${moduleLabel} module`,
            oldValue: oldModules[moduleKey] ? 'enabled' : 'disabled',
            newValue: newModules[moduleKey] ? 'enabled' : 'disabled'
          });
        }
      });
    }
    return changes;
  };
  const handleSave = async () => {
    if (!client?.id) return;
    setSaving(true);
    try {
      if (!initialFormData || !detectInfoChanges(formData, initialFormData)) {
        setEnterpriseEditModalOpen(false);
        setHasChanges(false);
        toast.info(copy.toast.noChanges);
        setSaving(false);
        return;
      }
      if (formData.contrat?.debut && formData.contrat?.expiration) {
        const startDate = new Date(formData.contrat.debut);
        const endDate = new Date(formData.contrat.expiration);
        if (endDate < startDate) {
          toast.error(copy.toast.expirationBeforeStart);
          setSaving(false);
          return;
        }
      }
      if (!formData.name?.trim()) {
        toast.error(copy.toast.nameRequired);
        setSaving(false);
        return;
      }
      // En édition, le contact principal n'est pas bloquant : on met à jour
      // l'entreprise même sans contact lié (création / rattachement optionnel).
      const existingContrat = getContratData(client);
      const contratPayload = {
        ...existingContrat,
        ...formData.contrat,
        type: formData.contrat?.type || existingContrat.type || "PROFESSIONNEL"
      };
      const fieldsToUpdate = {
        clientNumber: formData.clientNumber?.trim() || null,
        name: formData.name?.trim() || "",
        icon: formData.icon?.trim() || null,
        iconColor: formData.iconColor?.trim() || null,
        sites: formData.sites || [],
        commercialId: formData.commercialId || null,
        contrat: contratPayload,
        options: formData.modules,
        siret: normalizeLegalIdentifier(formData.siret) || null,
        address: buildClientAddressFromSites(formData.sites) || buildClientAddress(formData),
        secteur: formData.secteur?.trim() || "",
        statut: toCompanyStatusValue(formData.statut)
      };
      const siteRenames = detectClientSiteRenames(initialFormData?.sites ?? client?.sites, fieldsToUpdate.sites);
      if (siteRenames.length) {
        fieldsToUpdate.siteRenames = siteRenames;
      }
      const contactEmail = formData.primaryContact?.email?.trim();
      if (contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) {
        toast.error(copy.toast.primaryContactEmailInvalid);
        setSaving(false);
        return;
      }
      await updateClient(client.id, fieldsToUpdate);
      await saveClientModules(client.id, {
        modules: formData.modules
      });
      const primaryContact = formData.primaryContact || emptyPrimaryContact();
      if (primaryContact.nom?.trim()) {
        const posteValue = primaryContact.poste?.trim().toUpperCase() || "CONTACT PRINCIPAL";
        const makePrimary = isPrimaryContactPoste(posteValue);
        const contactPayload = buildContactApiPayload({
          nom: primaryContact.nom.trim(),
          prenom: primaryContact.prenom?.trim() || null,
          sexe: primaryContact.sexe?.trim() || null,
          email: primaryContact.email?.trim() || null,
          telephone: primaryContact.telephone?.trim() || null,
          communications: primaryContact.communications,
          poste: posteValue,
          statut: "actif",
          client_id: client.id
        });
        if (primaryContact.id) {
          const existingClients = Array.isArray(primaryContact.clients) ? primaryContact.clients : [];
          if (existingClients.length > 0) {
            const memberships = buildAdditiveMembershipsForEnterprise({
              clients: existingClients
            }, client.id, {
              poste: posteValue,
              isPrimary: makePrimary
            });
            await updateContact(primaryContact.id, {
              ...contactPayload,
              memberships
            });
          } else {
            // Dual-write: client_id alone adds a membership without wiping others.
            await updateContact(primaryContact.id, contactPayload);
            await addContactMembership(primaryContact.id, {
              client_id: client.id,
              poste: posteValue,
              is_primary: makePrimary
            });
          }
          if (makePrimary) {
            await setContactPrimaryForClient(primaryContact.id, client.id);
          }
        } else {
          await addContact({
            ...contactPayload,
            memberships: [{
              client_id: client.id,
              poste: posteValue,
              is_primary: makePrimary
            }]
          });
        }
        await loadContacts(client.id);
      }
      if (activeSiteFilter && siteRenames.length) {
        const renamed = siteRenames.find(item => item.from === activeSiteFilter);
        if (renamed?.to) setActiveSiteFilter(renamed.to);
      }
      setClient(prev => {
        const nextClient = {
          ...prev,
          client_number: fieldsToUpdate.clientNumber,
          clientNumber: fieldsToUpdate.clientNumber,
          name: fieldsToUpdate.name,
          icon: fieldsToUpdate.icon,
          icon_color: fieldsToUpdate.iconColor,
          iconColor: fieldsToUpdate.iconColor,
          sites: fieldsToUpdate.sites,
          commercialId: fieldsToUpdate.commercialId,
          commercial_id: fieldsToUpdate.commercialId,
          commercial: users.find(u => String(u.id) === String(fieldsToUpdate.commercialId))?.username
            || users.find(u => String(u.id) === String(fieldsToUpdate.commercialId))?.email
            || prev?.commercial
            || null,
          contrat: contratPayload,
          options: formData.modules,
          modules: formData.modules,
          siret: fieldsToUpdate.siret,
          address: fieldsToUpdate.address,
          secteur: fieldsToUpdate.secteur
        };
        writeEnterpriseCache(client.id, {
          client: nextClient
        });
        return nextClient;
      });
      if (siteRenames.length || serializeSitesForCompare(initialFormData?.sites) !== serializeSitesForCompare(fieldsToUpdate.sites)) {
        try {
          await refreshClientEquipment();
        } catch (refreshError) {
          console.warn("Equipment refresh after enterprise site save failed:", refreshError);
        }
      }
      notifyEnterprisesListRefresh();
      setEnterpriseEditModalOpen(false);
      setHasChanges(false);
      toast.success(copy.toast.saveSuccess);
    } catch (error) {
      console.error("Error lors de la sauvegarde:", error);
      toast.error(interpolate(copy.toast.saveError, {
        message: error.message
      }));
    } finally {
      setSaving(false);
    }
  };
  const handleCancel = () => {
    setFormData(buildFormDataFromClient(client, contacts));
    setEnterpriseEditModalOpen(false);
    setHasChanges(false);
  };
  const persistHeroIconAppearance = useCallback(async patch => {
    if (!client?.id || !canEditClient || heroIconSaving) return;
    const nextIcon = patch.icon !== undefined ? patch.icon : formData.icon;
    const nextColor = patch.iconColor !== undefined ? patch.iconColor : formData.iconColor;
    const normalizedIcon = String(nextIcon || "").trim();
    const normalizedColor = String(nextColor || "").trim();
    const prevIcon = String(formData.icon || "").trim();
    const prevColor = String(formData.iconColor || "").trim();
    if (normalizedIcon === prevIcon && normalizedColor === prevColor) return;
    setFormData(prev => ({
      ...prev,
      icon: normalizedIcon,
      iconColor: normalizedColor
    }));
    setInitialFormData(prev => (prev ? cloneFormSnapshot({
      ...prev,
      icon: normalizedIcon,
      iconColor: normalizedColor
    }) : prev));
    setHeroIconSaving(true);
    try {
      await updateClient(client.id, {
        icon: normalizedIcon || null,
        iconColor: normalizedColor || null,
        icon_color: normalizedColor || null
      });
      setClient(prev => {
        if (!prev) return prev;
        const nextClient = {
          ...prev,
          icon: normalizedIcon || null,
          icon_color: normalizedColor || null,
          iconColor: normalizedColor || null
        };
        writeEnterpriseCache(client.id, { client: nextClient });
        return nextClient;
      });
      notifyEnterprisesListRefresh();
    } catch (error) {
      console.error("Error saving enterprise icon:", error);
      setFormData(prev => ({
        ...prev,
        icon: prevIcon,
        iconColor: prevColor
      }));
      setInitialFormData(prev => (prev ? cloneFormSnapshot({
        ...prev,
        icon: prevIcon,
        iconColor: prevColor
      }) : prev));
      toast.error(interpolate(copy.toast.saveError, {
        message: error?.message || ""
      }));
    } finally {
      setHeroIconSaving(false);
    }
  }, [
    canEditClient,
    client?.id,
    copy.toast.saveError,
    formData.icon,
    formData.iconColor,
    heroIconSaving
  ]);
  useEffect(() => {
    if (!heroIconEditorOpen) return undefined;
    const updatePosition = () => {
      const rect = heroIconBtnRef.current?.getBoundingClientRect();
      if (!rect) return;
      const width = Math.min(360, window.innerWidth - 24);
      const left = Math.min(Math.max(12, rect.left), window.innerWidth - width - 12);
      const preferredTop = rect.bottom + 8;
      const panelHeight = 420;
      const top = preferredTop + panelHeight > window.innerHeight - 12
        ? Math.max(12, rect.top - panelHeight - 8)
        : preferredTop;
      setHeroIconPanelPos({ top, left, width });
    };
    updatePosition();
    const onPointerDown = event => {
      const target = event.target;
      if (heroIconBtnRef.current?.contains(target) || heroIconPanelRef.current?.contains(target)) return;
      setHeroIconEditorOpen(false);
    };
    const onKeyDown = event => {
      if (event.key === "Escape") setHeroIconEditorOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [heroIconEditorOpen]);
  const handleEditContact = contact => {
    setEditingContact(contact);
    setContactModalOpen(true);
  };
  const handleAddContact = () => {
    setEditingContact(null);
    setContactModalOpen(true);
  };
  const handleContactModalClose = () => {
    setContactModalOpen(false);
    setEditingContact(null);
  };
  const handleDeleteContact = async contactId => {
    if (!window.confirm(copy.confirmDeleteContact)) return;
    try {
      console.log('Delete contact:', contactId);
      await loadContacts(client.id);
      toast.success(copy.toast.contactDeleted);
    } catch (error) {
      console.error('Error suppression contact:', error);
      toast.error(copy.toast.contactDeleteError);
    }
  };
  const handleCancelInfo = () => {
    setFormData(buildFormDataFromClient(client, contacts));
    setEnterpriseEditModalOpen(false);
    setHasChanges(false);
    setDeletionCheckClient(null);
  };
  const openEnterpriseEditModal = () => {
    const snapshot = cloneFormSnapshot(buildFormDataFromClient(client, contacts));
    setFormData(snapshot);
    setInitialFormData(cloneFormSnapshot(snapshot));
    setHasChanges(false);
    setEnterpriseEditModalOpen(true);
    void loadDeletionCheck(client?.id);
  };
  const buildDeletionClientSnapshot = useCallback((baseClient, deletionCheck) => {
    if (!baseClient || !deletionCheck) return null;
    return {
      ...baseClient,
      deletable: deletionCheck.deletable,
      deletion_blockers: deletionCheck.blockers || [],
      deletion: {
        deletable: deletionCheck.deletable,
        blockers: deletionCheck.blockers || [],
        totalBlockers: deletionCheck.totalBlockers ?? 0
      }
    };
  }, []);
  const loadDeletionCheck = useCallback(async clientId => {
    if (!clientId) {
      setDeletionCheckClient(null);
      return;
    }
    setLoadingDeletionCheck(true);
    try {
      const status = await fetchClientDeletionCheck(clientId);
      setDeletionCheckClient(buildDeletionClientSnapshot(client, status));
    } catch (error) {
      console.error("Check company deletion:", error);
      setDeletionCheckClient(null);
    } finally {
      setLoadingDeletionCheck(false);
    }
  }, [buildDeletionClientSnapshot, client]);
  const deletionClientSnapshot = deletionCheckClient || client;
  const enterpriseDeletionBlocked = Boolean(deletionCheckClient) && !loadingDeletionCheck && !isClientDeletable(deletionCheckClient);
  const deleteBlockedTooltip = useMemo(() => {
    if (!enterpriseDeletionBlocked) return "";
    const snapshot = deletionCheckClient || client;
    const {
      total
    } = getLinkedElementsSummary(snapshot);
    const rows = getModalBlockerRows(snapshot);
    if (rows.length === 0) {
      return copy.deleteBlocked.generic;
    }
    const details = rows.map(row => `${row.label} (${row.value})`).join(", ");
    return interpolate(copy.deleteBlocked.withDetails, {
      total,
      details
    });
  }, [enterpriseDeletionBlocked, deletionCheckClient, client, copy]);
  const requestDeleteEnterpriseFromEdit = () => {
    if (loadingDeletionCheck || deletingClient || !deletionCheckClient) return;
    if (!isClientDeletable(deletionCheckClient)) {
      setDeletionBlockersModalOpen(true);
      return;
    }
    setDeleteClientModalOpen(true);
  };
  const handleExportReversibility = async () => {
    if (!client?.id || generatingReversibility) return;
    if (isCommunity) {
      notifyProFeature(copy.proFeatures.reversibility);
      return;
    }
    setGeneratingReversibility(true);
    try {
      const modulesData = await getClientModulesOnce(client.id).catch(() => null);
      await exportReversibilityFolder({
        client,
        formData,
        contacts,
        supportTickets,
        prestationTickets,
        upcomingEvents,
        campaigns,
        notes,
        clientTags,
        commercialLabel: client?.commercial || users.find(u => String(u.id) === String(formData.commercialId))?.username || users.find(u => String(u.id) === String(formData.commercialId))?.email || "",
        contractModules: getContractModules({
          modules: formData.modules
        }),
        modulesData
      });
      toast.success(copy.toast.reversibilityDownloaded);
    } catch (exportError) {
      console.error("Reversibility export:", exportError);
      toast.error(exportError?.message || copy.toast.reversibilityError);
    } finally {
      setGeneratingReversibility(false);
    }
  };
  const closeDeleteClientModal = () => {
    if (deletingClient) return;
    setDeleteClientModalOpen(false);
  };
  const confirmDeleteClient = async () => {
    if (!client?.id || deletingClient) return;
    if (!deletionCheckClient || !isClientDeletable(deletionCheckClient)) {
      setDeleteClientModalOpen(false);
      setDeletionBlockersModalOpen(true);
      return;
    }
    setDeletingClient(true);
    try {
      const deletedId = client.id;
      await deleteClient(deletedId);
      invalidateDetailCache(DETAIL_CACHE_NS.enterprise, deletedId);
      toast.success(copy.toast.enterpriseDeleted);
      setDeleteClientModalOpen(false);
      setEnterpriseEditModalOpen(false);
      setDeletionCheckClient(null);
      handleBack();
    } catch (error) {
      console.error("Error suppression client:", error);
      if (error.code === "CLIENT_HAS_DEPENDENCIES" || error.blockers?.length) {
        setDeletionCheckClient({
          ...(deletionCheckClient || client),
          deletable: false,
          deletion_blockers: error.blockers || [],
          deletion: {
            deletable: false,
            blockers: error.blockers || [],
            totalBlockers: error.totalBlockers ?? error.blockers?.length ?? 0
          }
        });
        setDeleteClientModalOpen(false);
        setDeletionBlockersModalOpen(true);
      }
      toast.error(error.message || copy.toast.enterpriseDeleteError);
    } finally {
      setDeletingClient(false);
    }
  };
  const closeEnterpriseEditModal = () => {
    handleCancelInfo();
  };
  const loadCustomFamilyMap = async (clientId = null, signal) => {
    const targetClientId = clientId || client?.id;
    if (!targetClientId) return;
    try {
      const families = await resolveClientCustomFamilyMap(targetClientId, {
        signal
      });
      if (signal?.aborted) return;
      setCustomFamilyMap(Array.isArray(families) ? families : []);
    } catch (error) {
      if (error?.name === "AbortError") return;
      console.error("Error loading custom equipment families:", error);
      if (!signal?.aborted) setCustomFamilyMap([]);
    }
  };
  const loadSslLicensesData = async (clientId = null, signal) => {
    const targetClientId = clientId || client?.id;
    if (!targetClientId) return;
    try {
      const [sslCerts, licences, modulesData] = await Promise.all([
        fetchClientSslCertificates(targetClientId, { signal }).catch(e => e?.name === "AbortError" ? Promise.reject(e) : []),
        fetchClientLicences(targetClientId, { signal }).catch(e => e?.name === "AbortError" ? Promise.reject(e) : []),
        getClientModulesOnce(targetClientId, signal).catch(e => e?.name === "AbortError" ? Promise.reject(e) : null)
      ]);
      if (signal?.aborted) return;
      if (modulesData) {
        setClient(prev => {
          if (!prev || String(prev.id) !== String(targetClientId)) return prev;
          return {
            ...prev,
            equipements: modulesData.equipements ?? prev.equipements,
            modules_monitoring: modulesData.modules_monitoring ?? prev.modules_monitoring
          };
        });
      }
      const sslFromApi = Array.isArray(sslCerts) ? sslCerts : [];
      const sslFromModules = Array.isArray(modulesData?.equipements?.CertificatsSSL)
        ? modulesData.equipements.CertificatsSSL
        : [];
      setSslData(sslFromApi.length ? sslFromApi : sslFromModules);
      const licencesFromApi = Array.isArray(licences) ? licences : [];
      const licencesFromModules = modulesData ? extractLicensesFromModules(modulesData) : [];
      setLicensesData(licencesFromApi.length ? licencesFromApi : licencesFromModules);
    } catch (error) {
      if (error?.name === "AbortError") return;
      console.error("Error while loading SSL / licences:", error);
    }
  };
  const loadCybersecurityData = async (clientId = null, signal) => {
    const targetClientId = clientId || client?.id;
    if (!targetClientId) return;
    try {
      const [antivirus, antispam, domains, sslCerts, licences, modulesData] = await Promise.all([
        fetchClientAntivirus(targetClientId, { signal }).catch(e => e?.name === "AbortError" ? Promise.reject(e) : []),
        fetchClientAntispam(targetClientId, { signal }).catch(e => e?.name === "AbortError" ? Promise.reject(e) : []),
        fetchClientDomains(targetClientId, { signal }).catch(e => e?.name === "AbortError" ? Promise.reject(e) : []),
        fetchClientSslCertificates(targetClientId, { signal }).catch(e => e?.name === "AbortError" ? Promise.reject(e) : []),
        fetchClientLicences(targetClientId, { signal }).catch(e => e?.name === "AbortError" ? Promise.reject(e) : []),
        getClientModulesOnce(targetClientId, signal).catch(e => e?.name === "AbortError" ? Promise.reject(e) : null)
      ]);
      if (signal?.aborted) return;

      if (modulesData) {
        setClient(prev => {
          if (!prev || String(prev.id) !== String(targetClientId)) return prev;
          return {
            ...prev,
            equipements: modulesData.equipements ?? prev.equipements,
            modules_monitoring: modulesData.modules_monitoring ?? prev.modules_monitoring
          };
        });
      }

      const mergedAntivirus = modulesData
        ? mergeAntivirusSources(Array.isArray(antivirus) ? antivirus : [], modulesData)
        : (Array.isArray(antivirus) ? antivirus : []);
      const mergedAntispam = modulesData
        ? mergeAntispamSources(Array.isArray(antispam) ? antispam : [], modulesData)
        : (Array.isArray(antispam) ? antispam : []);
      setAntivirusData(mergedAntivirus.length ? mergedAntivirus : (modulesData ? extractAntivirusFromModules(modulesData) : []));
      setAntispamData(mergedAntispam.length ? mergedAntispam : (modulesData ? extractAntispamFromModules(modulesData) : []));

      const domainsFromApi = Array.isArray(domains) ? domains : [];
      const domainsFromModules = modulesData ? extractDomainsFromModules(modulesData) : [];
      setDomainsData(domainsFromApi.length ? domainsFromApi : domainsFromModules);

      const sslFromApi = Array.isArray(sslCerts) ? sslCerts : [];
      const sslFromModules = Array.isArray(modulesData?.equipements?.CertificatsSSL)
        ? modulesData.equipements.CertificatsSSL
        : [];
      setSslData(sslFromApi.length ? sslFromApi : sslFromModules);

      const licencesFromApi = Array.isArray(licences) ? licences : [];
      const licencesFromModules = modulesData ? extractLicensesFromModules(modulesData) : [];
      setLicensesData(licencesFromApi.length ? licencesFromApi : licencesFromModules);
    } catch (error) {
      if (error?.name === "AbortError") return;
      console.error('Error loading cybersecurity data:', error);
    }
  };
  const loadBackupData = async (clientId = null, signal, options = {}) => {
    const {
      silent = false
    } = options;
    const targetClientId = clientId || client?.id;
    if (!targetClientId) return;
    if (!silent) setLoadingBackups(true);
    try {
      const [modulesData, mappingsData] = await Promise.all([getClientModulesOnce(targetClientId, signal).catch(e => e?.name === "AbortError" ? Promise.reject(e) : null), fetch(`${API_BASE_URL}/checkmk/mapping/${targetClientId}`, {
        credentials: 'include',
        signal
      }).then(res => res.ok ? res.json() : []).catch(e => e?.name === "AbortError" ? Promise.reject(e) : [])]);
      if (signal?.aborted) return;
      const mappingsMap = {};
      if (mappingsData && Array.isArray(mappingsData)) {
        mappingsData.forEach(m => {
            if (m.equipment_id && m.is_active !== false && (m.equipment_type === "Backup" || m.equipment_type === "Sauvegarde")) {
            mappingsMap[m.equipment_id] = m;
          }
        });
      }
      const {
        instances,
        jobs
      } = parseBackupDataFromModules(modulesData, mappingsMap);
      setBackupInstances(instances);
      setBackupJobs(jobs);
    } catch (error) {
      if (error?.name === "AbortError") return;
      console.error('Error lors du loading des data de backup:', error);
    } finally {
      if (!silent) setLoadingBackups(false);
    }
  };
  const loadAntivirusDetails = async (antivirusItem, isSyncRefresh = false) => {
    if (!client?.id || !antivirusItem?.companyId) return;
    setLoadingAntivirusDetails(true);
    try {
      const qs = buildBitdefenderQueryParams({
        clientId: client.id,
        bitdefenderTenantId: antivirusItem.bitdefenderTenantId,
        mappingMode: antivirusItem.mappingMode || "reseller"
      });
      const statsResponse = await fetch(`${API_BASE_URL}/bitdefender/statistics/${antivirusItem.companyId}${qs}`, {
        credentials: "include"
      }).catch(() => ({
        ok: false
      }));
      const statsData = statsResponse.ok ? await statsResponse.json() : null;
      const endpointsResponse = await fetch(`${API_BASE_URL}/bitdefender/endpoints/${antivirusItem.companyId}/enriched${qs}`, {
        credentials: "include"
      }).catch(() => ({
        ok: false
      }));
      const endpointsData = endpointsResponse.ok ? await endpointsResponse.json() : null;
      const policiesResponse = await fetch(`${API_BASE_URL}/bitdefender/policies/${antivirusItem.companyId}${qs}`, {
        credentials: "include"
      }).catch(() => ({
        ok: false
      }));
      const policiesData = policiesResponse.ok ? await policiesResponse.json() : null;
      setAntivirusDetailData({
        item: antivirusItem,
        statistics: statsData?.statistics || statsData?.data || null,
        endpoints: endpointsData?.endpoints || endpointsData?.data?.endpoints || [],
        policies: policiesData?.policies || policiesData?.data || null,
        timestamp: new Date().toISOString()
      });
      if (!isSyncRefresh) {
        setAntivirusDetailsModalOpen(true);
      }
      if (isSyncRefresh) {
        toast.success(copy.toast.antivirusSynced);
      }
    } catch (error) {
      console.error('Error loading antivirus details:', error);
      toast.error(copy.toast.antivirusLoadError);
    } finally {
      setLoadingAntivirusDetails(false);
    }
  };
  const handleModuleToggle = moduleKey => {
    if (!enterpriseEditModalOpen) return;
    setFormData(prev => {
      const newData = {
        ...prev,
        modules: {
          ...prev.modules,
          [moduleKey]: !prev.modules[moduleKey]
        }
      };
      if (initialFormData) {
        setHasChanges(detectInfoChanges(newData, initialFormData));
      }
      return newData;
    });
  };
  const handleMonitoringModuleToggle = moduleKey => {
    if (!enterpriseEditModalOpen) return;
    const key = String(moduleKey || "").toLowerCase();
    if (key === "toip") {
      return;
    }
    setMonitoringModulesState(prev => {
      const current = prev || {};
      const next = {
        ...current,
        [moduleKey]: !current[moduleKey]
      };
      if (initialMonitoringModules) {
        const allKeys = Object.keys({
          ...initialMonitoringModules,
          ...next
        });
        const hasDiff = allKeys.some(key => Boolean(initialMonitoringModules[key]) !== Boolean(next[key]));
        if (hasDiff) {
          setHasChanges(true);
        }
      } else {
        setHasChanges(true);
      }
      return next;
    });
  };
  const getModuleIcon = (moduleName, isActive = true, iconClass = styles.moduleIcon) => {
    const key = String(moduleName || "").toLowerCase();
    let baseColor = "#3b82f6";
    if (["antivirus", "antispam", "firewallregles", "sauvegarde"].includes(key)) {
      baseColor = "#ef4444";
    } else if (["office365", "ndd"].includes(key)) {
      baseColor = "#8b5cf6";
    } else if (["wifi", "bornewifi", "internet", "serveurs", "stockage", "firewalls", "firewall", "switch", "toip", "videosurveillance"].includes(key)) {
      baseColor = "#3b82f6";
    }
    const iconColor = isActive ? baseColor : "#6b7280";
    switch (key) {
      case "internet":
        return <span className={iconClass}>
            <Icon icon="mdi:web" color={iconColor} />
          </span>;
      case "firewalls":
      case "firewall":
        return <span className={iconClass}>
            <Icon icon="mdi:wall-fire" color={iconColor} />
          </span>;
      case "wifi":
      case "bornewifi":
        return <span className={iconClass}>
            <Icon icon="mdi:wifi-marker" color={iconColor} />
          </span>;
      case "serveurs":
        return <span className={iconClass}>
            <Icon icon="mingcute:server-fill" color={iconColor} />
          </span>;
      case "stockage":
        return <span className={iconClass}>
            <IoServerSharp color={iconColor} />
          </span>;
      case "switch":
        return <span className={iconClass}>
            <FaEthernet color={iconColor} />
          </span>;
      case "toip":
        return <span className={iconClass}>
            <Icon icon="mdi:phone" color={iconColor} />
          </span>;
      case "videosurveillance":
        return <span className={iconClass}>
            <Icon icon="mdi:cctv" color={iconColor} />
          </span>;
      case "antivirus":
        return <span className={iconClass}>
            <Icon icon="mdi:bug" color={iconColor} />
          </span>;
      case "antispam":
        return <span className={iconClass}>
            <Icon icon="material-symbols:mail-shield-outline" color={iconColor} />
          </span>;
      case "firewallregles":
        return <span className={iconClass}>
            <Icon icon="iconoir:pc-firewall" color={iconColor} />
          </span>;
      case "sauvegarde":
        return <span className={iconClass}>
            <Icon icon="material-symbols:backup" color={iconColor} />
          </span>;
      case "office365":
        return <span className={iconClass}>
            <Icon icon="hugeicons:office-365" color={iconColor} />
          </span>;
      case "ndd":
        return <span className={iconClass}>
            <Icon icon="stash:domain" color={iconColor} />
          </span>;
      default:
        return <span className={iconClass}>
            <Icon icon="mdi:cog" color={iconColor} />
          </span>;
    }
  };
  const getModuleCategory = moduleName => {
    if (!moduleName) return 'infrastructure';
    const key = String(moduleName).toLowerCase();
    const infrastructureModules = ['internet', 'serveurs', 'stockage', 'firewalls', 'firewall', 'switch', 'wifi', 'cameras', 'videosurveillance'];
    const cybersecuriteModules = ['sauvegarde', 'antivirus', 'antispam', 'firewallregles'];
    const servicesModules = ['ndd', 'office365'];
    if (infrastructureModules.includes(key)) {
      return 'infrastructure';
    } else if (cybersecuriteModules.includes(key)) {
      return 'cybersecurite';
    } else if (servicesModules.includes(key)) {
      return 'services';
    }
    return 'infrastructure';
  };
  const getMonitoringOrderKey = moduleName => {
    if (!moduleName) return 999;
    const key = String(moduleName).toLowerCase();
    if (key.includes('internet')) return 1;
    if (key === 'firewall' || key === 'firewalls') return 2;
    if (key.includes('serveur')) return 3;
    if (key.includes('stockage')) return 4;
    if (key.includes('switch')) return 5;
    if (key.includes('wifi') || key.includes('borne')) return 6;
    if (key === 'toip') return 7;
    if (key.includes('routeur') || key.includes('sd-wan')) return 7.5;
    if (key.includes('alimentation') || key.includes('onduleur') || key.includes('ups')) return 7.8;
    if (key.includes('camera') || key.includes('videosurveillance')) return 8;
    if (key.includes('antivirus')) return 9;
    if (key.includes('antispam')) return 10;
    if (key.includes('sauvegarde')) return 11;
    if (key === 'ndd') return 12;
    if (key.includes('office365') || key.includes('office 365')) return 13;
    return 999;
  };
  const handleAddClientTag = async ({
    label,
    color
  }) => {
    const trimmed = String(label || "").trim();
    if (!trimmed || !client?.id || addingTag) return;
    setAddingTag(true);
    try {
      const tag = await addClientTag(client.id, {
        label: trimmed,
        color
      });
      setClientTags(prev => {
        const next = prev.some(t => t.id === tag.id) ? prev : [...prev, tag].sort((a, b) => a.label.localeCompare(b.label));
        patchEnterpriseExtras(client.id, {
          tags: next
        });
        return next;
      });
      setTagModalOpen(false);
      toast.success(copy.toast.tagAdded);
    } catch (error) {
      console.error("Error adding tag:", error);
      toast.error(error.message || copy.toast.tagAddError);
    } finally {
      setAddingTag(false);
    }
  };
  const handleRemoveClientTag = async tagId => {
    if (!client?.id) return;
    try {
      await removeClientTag(client.id, tagId);
      setClientTags(prev => {
        const next = prev.filter(t => t.id !== tagId);
        patchEnterpriseExtras(client.id, {
          tags: next
        });
        return next;
      });
      toast.success(copy.toast.tagRemoved);
    } catch (error) {
      console.error("Error removing tag:", error);
      toast.error(error.message || copy.toast.tagRemoveError);
    }
  };
  const openCreateNoteModal = () => {
    setNoteModalMode("create");
    setNoteModalNoteId(null);
    setNoteModalInitialContent("");
    setNoteModalOpen(true);
  };
  const openEditNoteModal = note => {
    setNoteModalMode("edit");
    setNoteModalNoteId(note.id);
    setNoteModalInitialContent(note.content || "");
    setNoteModalOpen(true);
  };
  const closeNoteModal = () => {
    if (savingNote) return;
    setNoteModalOpen(false);
    setNoteModalNoteId(null);
    setNoteModalInitialContent("");
  };
  const handleNoteModalSubmit = async content => {
    if (!client?.id || savingNote) return;
    setSavingNote(true);
    try {
      if (noteModalMode === "create") {
        const note = await createClientNote(client.id, content);
        setNotes(prev => [note, ...prev]);
        toast.success(copy.toast.noteAdded);
      } else {
        const updated = await updateClientNote(client.id, noteModalNoteId, content);
        setNotes(prev => prev.map(n => n.id === noteModalNoteId ? updated : n));
        toast.success(copy.toast.noteUpdated);
      }
      setNoteModalOpen(false);
      setNoteModalNoteId(null);
      setNoteModalInitialContent("");
    } catch (error) {
      console.error("Error note:", error);
      toast.error(error.message || copy.toast.noteSaveError);
    } finally {
      setSavingNote(false);
    }
  };
  const handleDeleteNote = async noteId => {
    if (!client?.id) return;
    try {
      await deleteClientNote(client.id, noteId);
      setNotes(prev => prev.filter(n => n.id !== noteId));
      if (noteModalNoteId === noteId) closeNoteModal();
      toast.success(copy.toast.noteDeleted);
    } catch (error) {
      console.error("Error suppression note:", error);
      toast.error(error.message || copy.toast.noteDeleteError);
    }
  };
  const canEditNote = note => {
    if (!note?.user_id || !currentUser?.id) return false;
    if (userRole === "admin") return true;
    return note.user_id === currentUser.id;
  };
  const visibleSupportPacks = useMemo(
    () =>
      supportCreditPacks.filter(pack => {
        const status = String(pack?.status || "active");
        // Keep depleted/expired visible after reload so created packs never "vanish".
        return ["active", "upcoming", "depleted", "expired"].includes(status);
      }),
    [supportCreditPacks]
  );
  const clientOnboarding = useMemo(
    () => getClientOnboardingInfo(client, formData?.contrat?.debut),
    [client, formData?.contrat?.debut]
  );
  const activeContacts = useMemo(() => {
    const list = contacts.filter(c => String(c.statut || "").toLowerCase().includes("actif") && !String(c.statut || "").toLowerCase().includes("inactive"));
    return sortContactsPrimaryFirst(list, client?.id);
  }, [contacts, client?.id]);
  const filteredContacts = useMemo(() => {
    const query = contactsSearch.trim().toLowerCase();
    if (!query) return activeContacts;
    return activeContacts.filter(contact => {
      const values = [contact.nom, contact.prenom, contact.poste, contact.email, contact.telephone, ...(Array.isArray(contact.communications) ? contact.communications.map(entry => entry?.value) : [])].filter(Boolean).map(value => String(value).toLowerCase());
      return values.some(value => value.includes(query));
    });
  }, [activeContacts, contactsSearch]);
  const activeContactCount = activeContacts.length;
  const visibleContacts = filteredContacts;
  const filteredPrestataires = useMemo(() => {
    const query = prestatairesSearch.trim().toLowerCase();
    if (!query) return prestataires;
    return prestataires.filter(prestataire => {
      const primary = Array.isArray(prestataire.contacts) ? prestataire.contacts[0] : null;
      const values = [prestataire.nom, prestataire.type, prestataire.email, prestataire.telephone, primary?.email, primary?.telephone, primary?.nom, primary?.prenom, prestataire.contact_nom, prestataire.contact_prenom].filter(Boolean).map(value => String(value).toLowerCase());
      return values.some(value => value.includes(query));
    });
  }, [prestataires, prestatairesSearch]);
  const visiblePrestataires = filteredPrestataires;
  const clientSites = useMemo(() => normalizeClientSites(formData.sites), [formData.sites]);
  const filteredSites = useMemo(() => {
    const query = sitesSearch.trim();
    if (!query) return clientSites;
    return clientSites.filter(site => siteMatchesQuery(site, query));
  }, [clientSites, sitesSearch]);
  const sitesTotalPages = Math.max(1, Math.ceil(filteredSites.length / SITES_PAGE_SIZE));
  const safeSitesPage = Math.min(sitesPage, sitesTotalPages);
  const pagedSites = useMemo(() => {
    const start = (safeSitesPage - 1) * SITES_PAGE_SIZE;
    return filteredSites.slice(start, start + SITES_PAGE_SIZE);
  }, [filteredSites, safeSitesPage]);
  const sitesRangeStart = filteredSites.length === 0 ? 0 : (safeSitesPage - 1) * SITES_PAGE_SIZE + 1;
  const sitesRangeEnd = Math.min(safeSitesPage * SITES_PAGE_SIZE, filteredSites.length);
  useEffect(() => {
    setSitesPage(page => Math.min(page, sitesTotalPages));
  }, [sitesTotalPages]);
  const enterpriseGuideSteps = useMemo(() => getEnterpriseDetailGuideSteps({
      expandContacts: () => setContactsSectionExpanded(true),
      expandNotes: () => setNotesSectionExpanded(true),
      showInfraMap: () => setOverviewTab("map"),
      showActivity: () => setOverviewTab("activity"),
    showVault: () => setOverviewTab("vault")
  }, locale), [locale]);
  const handlePhotoUpload = () => {
    setPhotoModalOpen(true);
  };
  const handleSitesSave = async (newSites, options = {}) => {
    const sites = normalizeClientSites(newSites);
    const silent = options.silent === true;
    if (enterpriseEditModalOpen) {
      updateFormData({
        ...formData,
        sites
      });
      return;
    }
    if (!client?.id) return;
    const previousSites = normalizeClientSites(formData.sites ?? client.sites);
    const siteRenames = detectClientSiteRenames(previousSites, sites);
    try {
      await updateClient(client.id, {
        sites,
        ...(siteRenames.length ? { siteRenames } : {})
      });
      if (activeSiteFilter) {
        const renamed = siteRenames.find(item => item.from === activeSiteFilter);
        if (renamed?.to) {
          setActiveSiteFilter(renamed.to);
        }
      }
      setFormData(prev => ({
        ...prev,
        sites
      }));
      setClient(prev => ({
        ...prev,
        sites
      }));
      // Reload peripherals (standard + custom) so Site column reflects DB cascade.
      try {
        await refreshClientEquipment();
      } catch (refreshError) {
        console.warn("Equipment refresh after site rename failed:", refreshError);
      }
      notifyEnterprisesListRefresh();
      if (!silent) toast.success(copy.toast.sitesUpdated);
    } catch (error) {
      console.error("Error lors de la update des site:", error);
      toast.error(interpolate(copy.toast.sitesUpdateError, {
        message: error.message
      }));
      throw error;
    }
  };
  const filteredBackupInstancesForTab = useMemo(
    () => filterBySite(backupInstances, activeSiteFilter),
    [backupInstances, activeSiteFilter]
  );
  const filteredBackupJobsForTab = useMemo(() => {
    if (!activeSiteFilter) return Array.isArray(backupJobs) ? backupJobs : [];
    const instanceIds = new Set(
      filteredBackupInstancesForTab.map(instance => String(instance?.id)).filter(Boolean)
    );
    return (Array.isArray(backupJobs) ? backupJobs : []).filter(job => {
      const instanceId = job?.instanceId != null ? String(job.instanceId) : "";
      return instanceId && instanceIds.has(instanceId);
    });
  }, [backupJobs, filteredBackupInstancesForTab, activeSiteFilter]);
  const handleOpenLogDetails = log => {
    setSelectedLog(log);
    setLogDetailsModalOpen(true);
  };
  const renderLogDetails = log => {
    let details = log?.details || {};
    if (typeof details === 'string') {
      try {
        details = JSON.parse(details);
      } catch (e) {
        details = {};
      }
    }
    const modifiedFields = Array.isArray(details.modifiedFields) ? details.modifiedFields : [];
    const changes = Array.isArray(details.changes) ? details.changes : [];
    if (modifiedFields.length === 0 && changes.length === 0) {
      return <div className={styles.logDetailsBox}>{copy.modals.logNoDetails}</div>;
    }
    return <div className={styles.logDetailsGrid}>
        {modifiedFields.length > 0 && <div className={styles.logDetailRow}>
            <label className={styles.detailLabel}>{copy.modals.logModifiedFields}</label>
            <div className={styles.logDetailsBox}>
              {modifiedFields.map((field, idx) => <div key={`${field}-${idx}`}>• {field}</div>)}
            </div>
          </div>}
        {changes.length > 0 && <div className={styles.logDetailRow}>
            <label className={styles.detailLabel}>{copy.modals.logNewValues}</label>
            <div className={styles.logDetailsBox}>
              {changes.map((change, idx) => <div key={`${change.field}-${idx}`}>
                  <strong>{change.field}</strong>: {typeof change.newValue === 'object' ? JSON.stringify(change.newValue) : String(change.newValue)}
                </div>)}
            </div>
          </div>}
      </div>;
  };
  if (!client) {
    if (loading) {
      const titleHint =
        clientData?.client?.name ||
        clientData?.name ||
        (clientData?.client_number != null
          ? String(clientData.client_number)
          : "") ||
        "";
      return (
        <CrmDetailPageSkeleton
          loadingAria="Chargement…"
          titleHint={titleHint}
          showTitleIcon
          tabCount={7}
          secondaryCount={6}
          body="map"
          showAside
          asideSections={7}
        />
      );
    }
    return <div className={`${styles.contratDetailPage} msp-page-grid`}>
        <div className={styles.error}>
          <Icon icon="mdi:alert-circle-outline" />
          <span>{error || copy.notFound}</span>
          <button type="button" onClick={handleBack} className={styles.backButton}>
            <FaArrowLeft /> {copy.backToEnterprises}
          </button>
        </div>
      </div>;
  }
  const companyStatusKey = normalizeCompanyStatusKey(formData.statut);
  const isCompanyInactive = companyStatusKey === "inactive";
  const companyStatusLabel = isCompanyInactive ? copy.companyStatusInactive : copy.companyStatusActive;
  const clientCode = getClientNumber(client);
  const clientNameWithoutCode = getClientNameWithoutCode(client) || "-";
  const companyIcon = resolveEnterpriseIcon(formData.icon || client?.icon);
  const companyIconColor = resolveEnterpriseIconColor(formData.iconColor || client?.icon_color || client?.iconColor);
  const commercialUser = users.find(u => String(u.id) === String(formData.commercialId));
  const commercialLabel = client?.commercial || commercialUser?.username || commercialUser?.email || null;
  const activeContractModules = enabledModules.filter(mod => !!formData.modules?.[mod.moduleKey]);
  const contractStartLabel = formData.contrat?.debut ? formatTableDate(formData.contrat.debut) : "";
  const contractEndLabel = formData.contrat?.expiration ? formatTableDate(formData.contrat.expiration) : "";
  const contractTypeLabel = formData.contrat?.type ? getContractTypeLabel(formData.contrat.type, locale) : "";
  const contractStatus = getContractStatusDetail(
    formData.contrat?.expiration,
    Boolean(formData.contrat?.suspendu),
    locale
  );
  const onboardingHint = clientOnboarding
    ? clientOnboarding.ageDays < 1
      ? interpolate(copy.onboardingBannerHintToday, {
          remaining: clientOnboarding.remainingDays
        })
      : interpolate(copy.onboardingBannerHint, {
          days: clientOnboarding.ageDays,
          remaining: clientOnboarding.remainingDays
        })
    : null;
  const showOnboardingHero = Boolean(clientOnboarding) && !isCompanyInactive;
  const finderSecondaryVisible =
    overviewTab === "map" ||
    overviewTab === "cyber" ||
    overviewTab === "activity" ||
    overviewTab === "vault";
  const backupPreviewCopy = infraMapCopy.preview || {};

  return <div ref={pageRootRef} className={`${styles.contratDetailPage} ${styles.enterpriseDetailPage} ${isCompanyInactive ? styles.heroInactive : ""} ${showOnboardingHero ? styles.heroInOnboarding : ""} msp-page-grid`.trim()}>
      <header className={styles.pageHero} ref={headerRef} data-guide="enterprise-hero">
        <div className={styles.heroTop}>
          <div className={styles.heroIdentityBlock}>
            <div className={`${styles.heroCover} ${isCompanyInactive ? styles.heroCoverInactive : showOnboardingHero ? styles.heroCoverOnboarding : ""}`.trim()} aria-hidden />
            <div className={styles.heroIdentityRow}>
              <div className={styles.heroMain}>
                {canEditClient ? (
                  <button
                    ref={heroIconBtnRef}
                    type="button"
                    className={`${styles.heroBrandIcon} ${styles.heroBrandIconButton} ${isCompanyInactive ? styles.heroBrandIconInactive : showOnboardingHero ? styles.heroBrandIconOnboarding : ""} ${heroIconEditorOpen ? styles.heroBrandIconButtonOpen : ""}`.trim()}
                    style={isCompanyInactive || showOnboardingHero ? undefined : { background: companyIconColor || undefined }}
                    onClick={() => setHeroIconEditorOpen(open => !open)}
                    aria-expanded={heroIconEditorOpen}
                    aria-haspopup="dialog"
                    aria-label={copy.heroIconEditAria || "Changer l'icône et la couleur"}
                    title={copy.heroIconEditAria || "Changer l'icône et la couleur"}
                    disabled={heroIconSaving}
                  >
                    <Icon icon={isCompanyInactive ? "mdi:account-off-outline" : showOnboardingHero ? "mdi:account-clock-outline" : companyIcon} width={16} height={16} />
                    <span className={styles.heroBrandIconEditHint} aria-hidden>
                      <Icon icon="mdi:pencil-outline" width={10} height={10} />
                    </span>
                  </button>
                ) : (
                <span
                  className={`${styles.heroBrandIcon} ${isCompanyInactive ? styles.heroBrandIconInactive : showOnboardingHero ? styles.heroBrandIconOnboarding : ""}`.trim()}
                  style={isCompanyInactive || showOnboardingHero ? undefined : { background: companyIconColor || undefined }}
                  aria-hidden
                >
                    <Icon icon={isCompanyInactive ? "mdi:account-off-outline" : showOnboardingHero ? "mdi:account-clock-outline" : companyIcon} width={16} height={16} />
                </span>
                )}
                <div className={styles.heroText}>
                  <h1 className={styles.heroTitle}>
                    <StatusDot
                      active={!isCompanyInactive}
                      label={companyStatusLabel}
                      className={styles.heroTitleStatus}
                    />
                    {clientCode ? <span className={styles.heroTitleCode}>{clientCode}</span> : null}
                    <span className={styles.heroTitleName}>{clientNameWithoutCode}</span>
                    {showOnboardingHero ? (
                      <span
                        className={styles.heroOnboardingBadge}
                        aria-label={copy.onboardingBadge || "Onboarding"}
                      >
                        <Icon icon="mdi:account-clock-outline" width={12} height={12} aria-hidden />
                        {copy.onboardingBadge || "Onboarding"}
                      </span>
                    ) : null}
                    {loadingTags ? (
                      <span className={styles.heroTagsLoading}>{copy.loadingTags}</span>
                    ) : clientTags.length > 0 || canManageTags ? (
                      <span className={styles.heroTitleTags} aria-label={copy.heroMetaAria}>
                        {clientTags.map(tag => (
                          <span
                            key={tag.id}
                            className={styles.heroTagChip}
                            style={{
                              backgroundColor: `${tag.color || "#2b5fab"}18`,
                              borderColor: `${tag.color || "#2b5fab"}55`,
                              color: tag.color || "#2b5fab"
                            }}
                          >
                            {tag.label}
                            {canManageTags ? (
                              <button
                                type="button"
                                className={styles.heroTagRemove}
                                onClick={() => handleRemoveClientTag(tag.id)}
                                aria-label={interpolate(copy.removeTagAria, { label: tag.label })}
                              >
                                <FaTimes />
                              </button>
                            ) : null}
                          </span>
                        ))}
                        {canManageTags ? (
                          <span className={styles.heroTagAddWrap}>
                            <button
                              type="button"
                              className={styles.heroTagAddTrigger}
                              onClick={() => setTagModalOpen(true)}
                              aria-label={copy.addTag}
                            >
                              <FaPlus />
                            </button>
                          </span>
                        ) : null}
                      </span>
                    ) : null}
                  </h1>
                  {showOnboardingHero && onboardingHint ? (
                    <p className={styles.heroOnboardingHint}>
                      {onboardingHint}
                    </p>
                  ) : null}
                </div>
              </div>
              <div className={styles.heroMeta} aria-label={copy.heroMetaAria}>
                {commercialLabel ? (
                  <span className={`${styles.heroMetaItem} ${styles.heroMetaBlock}`}>
                    <Icon icon="mdi:account-tie-outline" aria-hidden />
                    {commercialLabel}
                  </span>
                ) : null}
                <EnterpriseRmmEnrollmentHero
                  clientId={client?.id}
                  isAdmin={userRole === "admin"}
                  labeled
                  title={copy.enrollmentTokenTitle || "Token d'enrôlement"}
                  itemClassName={`${styles.heroMetaItemRmm} ${styles.heroMetaBlock}`}
                  tokenWrapClassName={styles.heroRmmToken}
                />
              </div>
            </div>
            {isCompanyInactive ? (
              <div className={styles.inactiveBanner} role="status">
                <Icon icon="mdi:account-off-outline" aria-hidden />
                <div className={styles.inactiveBannerText}>
                  <strong>{copy.inactiveBannerTitle || copy.companyStatusInactive || "Client inactif"}</strong>
                  <span>{copy.inactiveBannerText || "Ce client est hors périmètre opérationnel."}</span>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </header>

      {heroIconEditorOpen && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={heroIconPanelRef}
              className={styles.heroIconPopover}
              style={{
                top: heroIconPanelPos.top,
                left: heroIconPanelPos.left,
                width: heroIconPanelPos.width || undefined
              }}
              role="dialog"
              aria-label={copy.heroIconEditAria || "Changer l'icône et la couleur"}
            >
              <div className={styles.heroIconPopoverSection}>
                <span className={styles.heroIconPopoverLabel}>{copy.heroIconColorLabel || "Couleur"}</span>
                <div className={styles.heroIconColorPicker} role="group" aria-label={copy.heroIconColorAria || "Couleur de l'icône"}>
                  {ENTERPRISE_ICON_COLOR_PRESETS.map(color => {
                    const selected = resolveEnterpriseIconColor(formData.iconColor).toLowerCase() === color.toLowerCase();
                    return (
                      <button
                        key={color}
                        type="button"
                        className={`${styles.heroIconColorSwatch} ${selected ? styles.heroIconColorSwatchActive : ""}`}
                        style={{ "--swatch-color": color }}
                        onClick={() => persistHeroIconAppearance({ iconColor: color })}
                        aria-label={`${copy.heroIconColorLabel || "Couleur"} ${color}`}
                        aria-pressed={selected}
                        disabled={heroIconSaving}
                      />
                    );
                  })}
                  <label className={styles.heroIconColorCustom}>
                    <input
                      type="color"
                      className={styles.heroIconColorInput}
                      value={resolveEnterpriseIconColor(formData.iconColor)}
                      onChange={event => persistHeroIconAppearance({ iconColor: event.target.value })}
                      aria-label={copy.heroIconColorCustom || "Couleur personnalisée"}
                      disabled={heroIconSaving}
                    />
                  </label>
                </div>
              </div>
              <div className={styles.heroIconPopoverSection}>
                <span className={styles.heroIconPopoverLabel}>{copy.heroIconLabel || "Icône"}</span>
                <div className={styles.heroIconPickerHost}>
                  <IconPicker
                    value={formData.icon || DEFAULT_ENTERPRISE_ICON}
                    onChange={icon => persistHeroIconAppearance({ icon })}
                    choices={ENTERPRISE_ICON_CHOICES}
                    searchable
                    searchPlaceholder={copy.heroIconSearchPlaceholder || "Rechercher une icône…"}
                    searchAria={copy.heroIconSearchAria || "Rechercher une icône"}
                    clearSearchLabel={copy.heroIconClearSearch || "Effacer la recherche"}
                    changeLabel={copy.heroIconEditAria || "Changer l'icône"}
                    pickerAria={copy.heroIconPickerAria || "Choisir une icône d'entreprise"}
                    color={resolveEnterpriseIconColor(formData.iconColor)}
                  />
                </div>
              </div>
            </div>,
            document.body
          )
        : null}

      <div className={`${styles.pageBody} ${overviewTab === "vault" || overviewTab === "map" || overviewTab === "cyber" || overviewTab === "backup" || overviewTab === "activity" || overviewTab === "events" || overviewTab === "logs" ? styles.pageBodyFill : ""}`.trim()}>
          <div className={styles.pageGrid}>
          <main className={`${styles.mainColumn} ${styles.mainColumnFinder} ${overviewTab === "vault" ? styles.mainColumnVault : ""} ${overviewTab === "map" ? styles.mainColumnMap : ""} ${overviewTab === "cyber" || overviewTab === "backup" ? styles.mainColumnCyber : ""} ${overviewTab === "activity" || overviewTab === "events" ? styles.mainColumnActivity : ""} ${overviewTab === "logs" ? styles.mainColumnLogs : ""}`.trim()}>
            <div className={`${finderKit.finderLayout} ${styles.enterpriseFinderLayout}`}>
              <aside className={`${finderKit.finderSidebar} ${styles.enterpriseFinderSidebar}`} aria-label={copy.overviewTabsAria || copy.infraMapTitle}>
                <nav
                  ref={finderPrimaryTrackRef}
                  className={`${finderKit.finderPrimary} ${finderKit.finderPrimaryAnimated}`}
                  role="tablist"
                  aria-label={copy.overviewTabsAria || copy.infraMapTitle}
                >
                  {finderPrimaryIndicator.ready ? (
                    <div
                      className={finderKit.finderNavIndicator}
                      style={{
                        transform: `translate3d(0, ${finderPrimaryIndicator.top}px, 0)`,
                        height: finderPrimaryIndicator.height
                      }}
                      aria-hidden
                    />
                  ) : null}
                  <EnterpriseOverviewTabButton
                    tabId="map"
                    iconify="mdi:lan"
                    label={copy.overviewTabMap}
                    active={overviewTab === "map"}
                    onClick={() => setOverviewTab("map")}
                    className={`${finderKit.finderItem} ${overviewTab === "map" ? finderKit.finderItemActive : ""}`}
                    iconClassName={finderKit.finderItemIcon}
                    labelClassName={finderKit.finderItemLabel}
                    data-guide="enterprise-infra-map-tab"
                  />
                  <EnterpriseOverviewTabButton
                    tabId="cyber"
                    iconify="mdi:shield-lock-outline"
                    label={copy.overviewTabCyber || "Cyber & Cloud"}
                    active={overviewTab === "cyber"}
                    onClick={() => setOverviewTab("cyber")}
                    className={`${finderKit.finderItem} ${overviewTab === "cyber" ? finderKit.finderItemActive : ""}`}
                    iconClassName={finderKit.finderItemIcon}
                    labelClassName={finderKit.finderItemLabel}
                    data-guide="enterprise-cyber-tab"
                  />
                  <EnterpriseOverviewTabButton
                    tabId="backup"
                    iconify="mdi:backup-restore"
                    label={copy.overviewTabBackup || "Sauvegarde"}
                    active={overviewTab === "backup"}
                    onClick={() => setOverviewTab("backup")}
                    className={`${finderKit.finderItem} ${overviewTab === "backup" ? finderKit.finderItemActive : ""}`}
                    iconClassName={finderKit.finderItemIcon}
                    labelClassName={finderKit.finderItemLabel}
                    data-guide="enterprise-backup-tab"
                  />
                  <EnterpriseOverviewTabButton
                    tabId="activity"
                    iconify="mdi:ticket-confirmation-outline"
                    label={copy.overviewTabActivity}
                    active={overviewTab === "activity"}
                    onClick={() => setOverviewTab("activity")}
                    className={`${finderKit.finderItem} ${overviewTab === "activity" ? finderKit.finderItemActive : ""}`}
                    iconClassName={finderKit.finderItemIcon}
                    labelClassName={finderKit.finderItemLabel}
                    data-guide="enterprise-activity"
                  />
                  <EnterpriseOverviewTabButton
                    tabId="events"
                    iconify="mdi:calendar-month-outline"
                    label={copy.overviewTabEvents || copy.eventsTitle || "Événements"}
                    active={overviewTab === "events"}
                    onClick={() => setOverviewTab("events")}
                    className={`${finderKit.finderItem} ${overviewTab === "events" ? finderKit.finderItemActive : ""}`}
                    iconClassName={finderKit.finderItemIcon}
                    labelClassName={finderKit.finderItemLabel}
                    data-guide="enterprise-events"
                    badge={isCommunity ? <ProFeatureBadge variant="inline" className={styles.proBadgeInline} /> : null}
                  />
                  <EnterpriseOverviewTabButton
                    tabId="vault"
                    iconify="mdi:safe-square-outline"
                    label={copy.overviewTabVault}
                    active={overviewTab === "vault"}
                    onClick={() => setOverviewTab("vault")}
                    className={`${finderKit.finderItem} ${overviewTab === "vault" ? finderKit.finderItemActive : ""}`}
                    iconClassName={finderKit.finderItemIcon}
                    labelClassName={finderKit.finderItemLabel}
                    data-guide="enterprise-vault"
                    badge={isCommunity ? <ProFeatureBadge variant="inline" className={styles.proBadgeInline} /> : null}
                  />
                  <EnterpriseOverviewTabButton
                    tabId="logs"
                    iconify="mdi:history"
                    label={copy.overviewTabLogs || "Logs"}
                    active={overviewTab === "logs"}
                    onClick={() => setOverviewTab("logs")}
                    className={`${finderKit.finderItem} ${overviewTab === "logs" ? finderKit.finderItemActive : ""}`}
                    iconClassName={finderKit.finderItemIcon}
                    labelClassName={finderKit.finderItemLabel}
                    data-guide="enterprise-logs"
                  />
                </nav>

                <UiKitScrollFadeShell
                  className={`${finderKit.finderSecondaryShell} ${styles.finderSecondaryShell}${finderSecondaryVisible ? "" : ` ${finderKit.finderSecondaryShellHidden}`}`.trim()}
                  style={finderSecondaryVisible ? undefined : { display: "none" }}
                  deps={[overviewTab, activitySection, selectedCyberBrickType, equipTypeNavPortalEl, vaultTreeNavPortalEl]}
                >
                  <div
                    className={`${finderKit.finderSecondary} ${styles.finderSecondary}`}
                    aria-hidden={!finderSecondaryVisible}
                  >
                    <div
                      className={`${finderKit.finderSecReveal} ${finderSecondaryVisible && finderSecEnter ? finderKit.finderSecRevealActive : ""}`.trim()}
                    >
                    {/* Keep-alive: avoid remount/Iconify refetch when swapping tabs */}
                    <div className={finderKit.finderSecPanel} hidden={overviewTab !== "map"} aria-hidden={overviewTab !== "map"}>
                        <p className={finderKit.finderSecTitle}>{copy.navSectionEquipment || "Familles"}</p>
                        <div
                          ref={setEquipTypeNavPortalEl}
                          className={`${finderKit.finderTypeNavHost} ${styles.finderTypeNavHost}`}
                          data-guide="enterprise-equipment-type-nav"
                        />
                    </div>

                    <div className={finderKit.finderSecPanel} hidden={overviewTab !== "cyber"} aria-hidden={overviewTab !== "cyber"}>
                        <nav
                          ref={finderCyberTrackRef}
                          className={`${finderKit.finderSecNav} ${finderKit.finderSecNavAnimated}`}
                          aria-label={copy.navSectionCyber || "Services"}
                          data-guide="enterprise-cyber-services-nav"
                        >
                          {finderCyberIndicator.ready ? (
                            <div
                              className={finderKit.finderNavIndicator}
                              style={{
                                transform: `translate3d(0, ${finderCyberIndicator.top}px, 0)`,
                                height: finderCyberIndicator.height
                              }}
                              aria-hidden
                            />
                          ) : null}
                          {INFRA_BRICK_GROUPS.map(group => (
                            <div key={group.id} className={finderKit.finderSecGroup} data-infra-group={group.id}>
                              <p className={finderKit.finderSecGroupTitle}>
                                {infraMapCopy.getBrickGroupLabel(group.id) || group.label}
                              </p>
                              {group.types.map(type => {
                                const brick = cyberBrickByType[type];
                                const count = Number(brick?.count) || 0;
                                const label = brick?.label || infraMapCopy.getBrickTypeLabel(type) || type;
                                const isActive = (selectedCyberBrickType || effectiveCyberBrickType) === type;
                                const isComingSoon = Boolean(brick?.comingSoon);
                                return (
                                  <button
                                    key={type}
                                    type="button"
                                    className={`${finderKit.finderSecItem} ${isActive ? finderKit.finderSecItemActive : ""}`.trim()}
                                    aria-current={isActive ? "page" : undefined}
                                    tabIndex={overviewTab === "cyber" ? undefined : -1}
                                    onClick={() => setSelectedCyberBrickType(type)}
                                    onContextMenu={event => {
                                      if (!brick) return;
                                      if (!canManageSolutions && type !== "Campagne") return;
                                      if (!SERVICE_BRICK_MENU_TYPES.has(type)) return;
                                      if (type !== "Campagne" && !client?.id) return;
                                      openServiceBrickMenu(brick, event);
                                    }}
                                  >
                                    <Icon icon={getInfraTypeIcon(type, brick?.icon)} className={finderKit.finderSecItemIcon} aria-hidden />
                                    <span className={finderKit.finderSecItemLabel}>{label}</span>
                                    {isComingSoon ? (
                                      <span className={finderKit.finderSecSoon}>{infraMapCopy.brick?.comingSoon || "Bientôt"}</span>
                                    ) : (
                                      <span className={finderKit.finderSecCount}>{count}</span>
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          ))}
                        </nav>
                    </div>

                    <div className={finderKit.finderSecPanel} hidden={overviewTab !== "activity"} aria-hidden={overviewTab !== "activity"}>
                        <p className={finderKit.finderSecTitle}>{copy.navSectionActivity || "Sections"}</p>
                        <nav
                          ref={finderActivityTrackRef}
                          className={`${finderKit.finderSecNav} ${finderKit.finderSecNavAnimated}`}
                          aria-label={copy.navSectionActivity || "Sections"}
                        >
                          {finderActivityIndicator.ready ? (
                            <div
                              className={finderKit.finderNavIndicator}
                              style={{
                                transform: `translate3d(0, ${finderActivityIndicator.top}px, 0)`,
                                height: finderActivityIndicator.height
                              }}
                              aria-hidden
                            />
                          ) : null}
                          <button
                            type="button"
                            className={`${finderKit.finderSecItem} ${activitySection === "support" ? finderKit.finderSecItemActive : ""}`}
                            aria-current={activitySection === "support" ? "page" : undefined}
                            tabIndex={overviewTab === "activity" ? undefined : -1}
                            onClick={() => setActivitySection("support")}
                          >
                            <Icon icon="mdi:ticket-outline" className={finderKit.finderSecItemIcon} aria-hidden />
                            <span className={finderKit.finderSecItemLabel}>{copy.supportTicketsTitle}</span>
                          </button>
                          <button
                            type="button"
                            className={`${finderKit.finderSecItem} ${activitySection === "prestations" ? finderKit.finderSecItemActive : ""}`}
                            aria-current={activitySection === "prestations" ? "page" : undefined}
                            tabIndex={overviewTab === "activity" ? undefined : -1}
                            onClick={() => setActivitySection("prestations")}
                          >
                            <Icon icon="mdi:briefcase-outline" className={finderKit.finderSecItemIcon} aria-hidden />
                            <span className={finderKit.finderSecItemLabel}>{copy.prestationsTitle}</span>
                          </button>
                          <button
                            type="button"
                            className={`${finderKit.finderSecItem} ${activitySection === "campaigns" ? finderKit.finderSecItemActive : ""}`}
                            aria-current={activitySection === "campaigns" ? "page" : undefined}
                            tabIndex={overviewTab === "activity" ? undefined : -1}
                            onClick={() => setActivitySection("campaigns")}
                          >
                            <Icon icon="mdi:bullhorn-outline" className={finderKit.finderSecItemIcon} aria-hidden />
                            <span className={finderKit.finderSecItemLabel}>{copy.campaignsTitle}</span>
                          </button>
                        </nav>
                    </div>

                    <div className={finderKit.finderSecPanel} hidden={overviewTab !== "vault"} aria-hidden={overviewTab !== "vault"}>
                        <div className={finderKit.finderSecTitleRow}>
                          <p className={finderKit.finderSecTitle}>{vaultCopy.panel.treeTitle}</p>
                          <button
                            type="button"
                            className={finderKit.finderVaultAddBtn}
                            tabIndex={overviewTab === "vault" ? undefined : -1}
                            onClick={() => vaultPanelRef.current?.openCreateFolder?.()}
                            title={vaultCopy.panel.newFolder}
                            aria-label={vaultCopy.panel.newFolder}
                          >
                            <Icon icon="mdi:plus" aria-hidden />
                          </button>
                        </div>
                        <div
                          ref={setVaultTreeNavPortalEl}
                          className={`${finderKit.finderTypeNavHost} ${styles.finderTypeNavHost} ${styles.finderVaultTreeHost}`}
                          data-guide="enterprise-vault-tree-nav"
                        />
                    </div>
                    </div>
                  </div>
                </UiKitScrollFadeShell>
              </aside>

              <div className={`${finderKit.finderContent} ${styles.enterpriseFinderContent}`}>
            <div className={styles.mainCommunityPanels}>
            {mapTabMounted ? (
            <div
              className={overviewTabPanelClass("map")}
              hidden={overviewTab !== "map"}
              style={overviewTab === "map" ? undefined : { display: "none" }}
            >
            <div className={styles.mapTabStack}>
            <div className={`${styles.panel} ${styles.mapUnifiedCard}`}>
            <section className={styles.mapEquipmentSection} ref={equipmentSectionRef} data-guide="enterprise-equipment">
              <div className={`${styles.panelBody} ${styles.mapEquipmentBody}`}>
                <div className={styles.equipmentSection}>
                  <EquipmentPage
                    ref={equipmentPageRef}
                    embedded
                    embeddedTypeNav="portal"
                    typeNavPortalTarget={equipTypeNavPortalEl}
                    fixedClientId={client.id}
                    embeddedClient={client ? {
                      ...client,
                      sites: formData.sites ?? client.sites ?? [],
                      ssid: Array.isArray(client.ssids) && client.ssids.length ? client.ssids : client.ssid,
                      ssids: Array.isArray(client.ssids) && client.ssids.length ? client.ssids : client.ssid
                    } : null}
                    equipmentRevision={equipmentRevision}
                    hideEmbeddedSkeleton
                    initialEmbeddedType={initialPeripheralsUi?.activeType || null}
                    initialTablePageByType={initialPeripheralsUi?.tablePageByType || null}
                    initialTableSort={initialPeripheralsUi?.tableSort || null}
                    initialEmbeddedPageSize={initialPeripheralsUi?.pageSize || null}
                    onNavigate={onNavigate}
                    searchQuery={equipmentSearchQuery}
                    onSearchQueryChange={setEquipmentSearchQuery}
                    onTotalCountChange={setHardwareEquipmentTotalCount}
                    onEquipmentChanged={refreshClientEquipment}
                    onClientSsidsUpdated={ssids => {
                      setClient(prev => prev ? {
                        ...prev,
                        ssid: ssids,
                        ssids
                      } : prev);
                    }}
                    customFamilyMap={filteredCustomFamilyMap}
                    backupInstances={backupInstances}
                    siteFilter={activeSiteFilter}
                    onCustomFamilyManage={(family, item) => {
                        setCustomEquipmentModal({
                          family,
                        item: item || null
                      });
                    }}
                    onEmbeddedActiveTypeChange={setActiveEquipmentTableType}
                    embeddedToolbarEnd={
                      <>
                        <div className={styles.equipmentToolbarActions}>
                  <div className={styles.exportMenuWrap} ref={equipmentExportMenuRef}>
                    
                      <button
                        type="button"
                                className={`${finderKit.btnSquare} ${finderKit.btnSquareSecondary} ${styles.exportHeaderButton}`}
                        onClick={() => setEquipmentExportMenuOpen(open => !open)}
                        aria-expanded={equipmentExportMenuOpen}
                        aria-haspopup="menu"
                        aria-label={copy.peripheralsMoreActions || "Plus d'actions"}
                      >
                                <Icon icon="mdi:dots-horizontal" width={16} height={16} aria-hidden />
                      </button>
                    
                    {equipmentExportMenuOpen ? (
                      <div className={styles.exportMenu} role="menu">
                        <button
                          type="button"
                          className={styles.exportMenuItem}
                          role="menuitem"
                          onClick={() => {
                            setEquipmentExportMenuOpen(false);
                            equipmentPageRef.current?.handleExportCurrentTable();
                          }}
                        >
                          <Icon icon="mdi:file-export-outline" className={styles.exportMenuItemIcon} aria-hidden />
                          <span>{copy.exportCurrentTable}</span>
                        </button>
                        <button
                          type="button"
                          className={styles.exportMenuItem}
                          role="menuitem"
                          onClick={() => {
                            setEquipmentExportMenuOpen(false);
                            equipmentPageRef.current?.handleExportAllTables();
                          }}
                        >
                          <Icon icon="mdi:table-arrow-right" className={styles.exportMenuItemIcon} aria-hidden />
                          <span>{copy.exportAllTables}</span>
                        </button>
                        {canManageDevices && unifiGlobalConfigured ? (
                          <>
                            <button
                              type="button"
                              className={styles.exportMenuItem}
                              role="menuitem"
                              onClick={() => {
                                setEquipmentExportMenuOpen(false);
                                setUnifiLinkModalOpen(true);
                              }}
                            >
                              <Icon icon="simple-icons:ubiquiti" className={styles.exportMenuItemIcon} aria-hidden />
                              <span>{copy.unifiLinkSite || "Lien UniFi"}</span>
                            </button>
                            {unifiLink?.linked && unifiLink?.mappingMode !== "dedicated" && unifiLink?.hostId && unifiLink?.siteId ? (
                              <button
                                type="button"
                                className={styles.exportMenuItem}
                                role="menuitem"
                                onClick={() => {
                                  setEquipmentExportMenuOpen(false);
                                  setUnifiImportModalOpen(true);
                                }}
                              >
                                <Icon icon="mdi:cloud-download-outline" className={styles.exportMenuItemIcon} aria-hidden />
                                <span>{copy.unifiImport || "Importer depuis UniFi"}</span>
                              </button>
                            ) : null}
                          </>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                  {canManageDevices ? (
                    
                      <button
                        type="button"
                                className={`${finderKit.btnSquare} ${finderKit.btnSquarePrimary} ${styles.addEquipmentButton}`}
                        onClick={() => equipmentPageRef.current?.openAddEquipmentModal()}
                        aria-label={copy.addEquipment}
                      >
                        <FaPlus />
                      </button>
                    
                  ) : null}
                </div>
                      </>
                    }
                  />
                </div>
              </div>
            </section>
            </div>
            </div>
            </div>
            ) : null}

            {backupTabMounted ? (
            <div
              className={overviewTabPanelClass("backup")}
              hidden={overviewTab !== "backup"}
              style={overviewTab === "backup" ? undefined : { display: "none" }}
              data-guide="enterprise-backup-panel"
            >
              <div className={`${styles.panel} ${styles.cyberServicesCard}`}>
                {siteFilterBadge ? <div className={styles.mapModulesToolbar}>{siteFilterBadge}</div> : null}
                <section className={mapStyles.cyberDetail} aria-label={copy.overviewTabBackup || "Sauvegarde"}>
                  <div className={`${mapStyles.detailPanel} ${mapStyles.detailPanelTable} ${mapStyles.detailPanelMetricsBare}`.trim()}>
                    <BackupOverviewPanel
                      instances={filteredBackupInstancesForTab}
                      jobs={filteredBackupJobsForTab}
                      searchPlaceholder={backupPreviewCopy.searchPlaceholder || "Rechercher…"}
                      onAddInstance={canManageSolutions ? () => openBackupConfigModal("add-instance") : null}
                      onAddJob={canManageSolutions ? () => openBackupConfigModal("add-job") : null}
                      onEditInstance={canManageSolutions ? instance => openBackupConfigModal("edit-instance", { instance }) : null}
                      onEditJob={canManageSolutions ? job => openBackupConfigModal("edit-job", {
                        job,
                        instance: job?.instanceId ? { id: job.instanceId } : null
                      }) : null}
                      canAddJob={filteredBackupInstancesForTab.length > 0}
                      addInstanceLabel={backupPreviewCopy.addInstance || "Ajouter une instance"}
                      addJobLabel={backupPreviewCopy.addJob || "Ajouter un job"}
                      addJobDisabledHint={backupPreviewCopy.addJobDisabledHint || "Ajoutez d’abord une instance"}
                      editLabel={backupPreviewCopy.editCurrent || backupPreviewCopy.configure || "Éditer"}
                    />
                  </div>
                </section>
              </div>
            </div>
            ) : null}

            {cyberTabMounted ? (
            <div
              className={overviewTabPanelClass("cyber")}
              hidden={overviewTab !== "cyber"}
              style={overviewTab === "cyber" ? undefined : { display: "none" }}
            >
              <div className={`${styles.panel} ${styles.cyberServicesCard}`} data-guide="enterprise-infra-map">
                {siteFilterBadge ? <div className={styles.mapModulesToolbar}>{siteFilterBadge}</div> : null}
                <InfrastructureMap
                  clientId={client.id}
                  client={client}
                  active={overviewTab === "cyber"}
                  equipmentRevision={equipmentRevision}
                  isCommunity={isCommunity}
                  selectedType={selectedCyberBrickType || effectiveCyberBrickType}
                  backupInstances={backupInstances}
                  backupJobs={backupJobs}
                  antivirusItems={configuredAntivirusSolutions}
                  antispamItems={configuredAntispamSolutions}
                  domainItems={configuredDomains}
                  domainIntegrationReady={globalOvhConfigured}
                  sslItems={sslData}
                  licenceItems={licencesData}
                  siteFilter={activeSiteFilter}
                  campaignItems={campaigns}
                  tenantInfo={{
                    configured: configuredMicrosoftTenants.length > 0 || Boolean(client?.has_azure_credentials || client?.hasAzureCredentials || client?.azureHasCredentials),
                    items: configuredMicrosoftTenants,
                    tenantId: configuredMicrosoftTenants[0]?.tenantId || client?.Office365?.tenantId || client?.microsoft?.tenantId || null,
                    email: client?.Office365?.email || client?.microsoft?.email || null,
                    displayName: configuredMicrosoftTenants[0]?.tenantName || client?.Office365?.tenantName || client?.microsoft?.tenantName || null,
                    status: client?.Office365?.status || client?.microsoft?.status || "actif",
                    lastSync: client?.Office365?.lastSync || client?.microsoft?.lastSync || null,
                    clientId: client.id,
                    clientName: client.name
                  }}
                  googleWorkspaceInfo={{
                    configured: Boolean(client?.googleWorkspace?.configured || client?.hasGoogleWorkspaceCredentials),
                    domain: client?.googleWorkspace?.domain || null,
                    status: client?.googleWorkspace?.status || "actif",
                    clientId: client.id,
                    clientName: client.name
                  }}
                  onNavigate={onNavigate}
                  onSynced={() => loadCybersecurityData(client.id)}
                  onSyncSsl={syncAllSslCertificates}
                  onSyncDomains={syncAllDomains}
                  onBrickOpen={(brick, selectedItem = null) => {
                    if (!brick?.type) return;
                    if (!canManageSolutions && brick.type !== "Campagne") return;
                    if (brick.type === "Campagne" && !canManageCampaigns && !canManageSolutions) return;
                    handleServiceBrickOpenPage(brick.type, selectedItem);
                  }}
                  onBrickConfigure={(brick, selectedItem = undefined) => {
                    if (!brick?.type) return;
                    if (!canManageSolutions && brick.type !== "Campagne") return;
                    if (brick.type === "Campagne" && !canManageCampaigns) return;
                    handleServiceBrickEdit(brick.type, selectedItem);
                  }}
                  onBrickDelete={async (brick, selectedItem = null, options = {}) => {
                    if (!brick?.type || !selectedItem) return;
                    if (!canManageSolutions) return;
                    if (options.skipConfirm) {
                      await executeServiceBrickDelete(brick.type, selectedItem, { silent: true });
                      return;
                    }
                    requestServiceBrickDelete(brick.type, selectedItem);
                  }}
                />
            </div>
            </div>
            ) : null}

            {activityTabMounted ? (
            <div
              className={overviewTabPanelClass("activity")}
              hidden={overviewTab !== "activity"}
              style={overviewTab === "activity" ? undefined : { display: "none" }}
            >
            <div className={styles.activityLayout} data-guide="enterprise-activity-panel">
                    <div className={styles.activityUnifiedCard} data-guide="enterprise-activity-sections" data-activity-section={activitySection}>
                      {activitySection === "support" ? (
                      <section className={`${styles.activityUnifiedSection} ${styles.activityUnifiedSectionSolo}`} data-activity-section="support">
                        <div className={styles.activityUnifiedBody}>
                          {renderActivityToolbar(supportSearchQuery, setSupportSearchQuery, supportStatusFilter, setSupportStatusFilter)}
                          <div className={styles.activityTableStack}>
                            {pagedSupportTickets.total === 0 ? renderActivityEmpty(
                              "mdi:ticket-outline",
                              supportSearchQuery.trim() && supportTickets.length > 0
                                ? (copy.emptyActivitySearch || copy.emptySupportTickets)
                                : copy.emptySupportTickets
                            ) : (
                            <UiKitTable
                              fill
                              className={styles.activityUiKitTable}
                              deps={[
                                pagedSupportTickets.total,
                                pagedSupportTickets.page,
                                activityTableSort.support?.key,
                                activityTableSort.support?.direction,
                                supportSearchQuery,
                                supportStatusFilter
                              ]}
                            >
                            <table className={styles.dataTable}>
                              <thead>
                                <tr>
                                        {renderActivitySortableTh("support", "number", copy.table.number)}
                                        {renderActivitySortableTh("support", "title", copy.table.title)}
                                        {renderActivitySortableTh("support", "status", copy.table.status)}
                                        {!isCommunity && renderActivitySortableTh("support", "sla", copy.table.sla)}
                                        {renderActivitySortableTh("support", "created", copy.table.created)}
                                        {renderActivitySortableTh("support", "updated", copy.table.updated)}
                                </tr>
                              </thead>
                              <tbody>
                                      {pagedSupportTickets.pagedList.map(ticket => {
                          const status = normalizeTicketStatus(ticket.status);
                          const sla = getTicketSlaDisplay(ticket, {
                            clients: client ? [client] : [],
                            now: slaNow
                          });
                          return <tr key={ticket.id} className={styles.dataTableRowClickable} onClick={() => handleOpenTicket(ticket)} onAuxClick={e => {
                            if (e.button === 1) {
                              e.preventDefault();
                              handleOpenTicket(ticket, true);
                            }
                          }}>
                                      <td>#{ticket.ticket_number || "-"}</td>
                                      <td className={styles.activityTitleCell}>
                                        {ticket.title || "-"}
                                      </td>
                                      <td>
                                        <span className={styles.ticketStatusBadge}>
                                          {getTicketStatusLabel(status, locale)}
                                        </span>
                                      </td>
                                      {!isCommunity && <td>{sla.label}</td>}
                                      <td>{formatRelativeFrench(ticket.created_at)}</td>
                                      <td>{formatRelativeFrench(ticket.updated_at || ticket.created_at)}</td>
                                    </tr>;
                        })}
                              </tbody>
                            </table>
                            </UiKitTable>
                            )}
                            {renderActivityPagination({
                              section: "support",
                              total: pagedSupportTickets.total,
                              page: pagedSupportTickets.page,
                              totalPages: pagedSupportTickets.totalPages,
                              safePageSize: pagedSupportTickets.safePageSize
                            })}
                          </div>
                        </div>
                      </section>
                      ) : null}

                      {activitySection === "prestations" ? (
                      <ProFeatureLock locked={isCommunity} featureLabel={copy.proFeatures.prestations} featureKey="prestations" className={styles.activityUnifiedProLock} badgePosition="none">
                        <section className={`${styles.activityUnifiedSection} ${styles.activityUnifiedSectionSolo}`} data-activity-section="prestations">
                          <div className={styles.activityUnifiedBody}>
                            {renderActivityToolbar(prestationSearchQuery, setPrestationSearchQuery, prestationStatusFilter, setPrestationStatusFilter)}
                            <div className={styles.activityTableStack}>
                              {pagedPrestationTickets.total === 0 ? renderActivityEmpty(
                                "mdi:handshake-outline",
                                prestationSearchQuery.trim() && prestationTicketsSource.length > 0
                                  ? (copy.emptyActivitySearch || copy.emptyPrestationTickets)
                                  : copy.emptyPrestationTickets
                              ) : (
                              <UiKitTable
                                fill
                                className={styles.activityUiKitTable}
                                deps={[
                                  pagedPrestationTickets.total,
                                  pagedPrestationTickets.page,
                                  activityTableSort.prestations?.key,
                                  activityTableSort.prestations?.direction,
                                  prestationSearchQuery,
                                  prestationStatusFilter
                                ]}
                              >
                              <table className={styles.dataTable}>
                                <thead>
                                  <tr>
                                          {renderActivitySortableTh("prestations", "number", copy.table.number)}
                                          {renderActivitySortableTh("prestations", "type", copy.table.type)}
                                          {renderActivitySortableTh("prestations", "status", copy.table.status)}
                                          {renderActivitySortableTh("prestations", "created", copy.table.created)}
                                          {renderActivitySortableTh("prestations", "updated", copy.table.updated)}
                                  </tr>
                                </thead>
                                <tbody>
                                        {pagedPrestationTickets.pagedList.map(ticket => {
                            const status = normalizeTicketStatus(ticket.status);
                            return <tr key={ticket.id} className={isCommunity ? undefined : styles.dataTableRowClickable} onClick={isCommunity ? undefined : () => handleOpenTicket(ticket)} onAuxClick={isCommunity ? undefined : e => {
                              if (e.button === 1) {
                                e.preventDefault();
                                handleOpenTicket(ticket, true);
                              }
                            }}>
                                        <td>#{ticket.ticket_number || "-"}</td>
                                        <td className={styles.activityTitleCell}>
                                          {getPrestationCategoryLabel(ticket.category, locale)}
                                        </td>
                                        <td>
                                          <span className={styles.ticketStatusBadge}>
                                            {getTicketStatusLabel(status, locale)}
                                          </span>
                                        </td>
                                        <td>{formatTableDateTime(ticket.created_at)}</td>
                                        <td>{formatRelativeFrench(ticket.updated_at || ticket.created_at)}</td>
                                      </tr>;
                          })}
                                </tbody>
                              </table>
                              </UiKitTable>
                              )}
                              {renderActivityPagination({
                                section: "prestations",
                                total: pagedPrestationTickets.total,
                                page: pagedPrestationTickets.page,
                                totalPages: pagedPrestationTickets.totalPages,
                                safePageSize: pagedPrestationTickets.safePageSize
                              })}
                            </div>
                          </div>
                        </section>
                      </ProFeatureLock>
                      ) : null}

                      {activitySection === "campaigns" ? (
                      <ProFeatureLock locked={isCommunity} featureLabel={copy.proFeatures.campaigns} featureKey="cyberCampaigns" className={styles.activityUnifiedProLock} badgePosition="none">
                        <section className={`${styles.activityUnifiedSection} ${styles.activityUnifiedSectionSolo}`} data-activity-section="campaigns">
                          <div className={styles.activityUnifiedBody}>
                            {renderActivityToolbar(
                              campaignSearchQuery,
                              setCampaignSearchQuery,
                              campaignStatusFilter,
                              setCampaignStatusFilter,
                              !isCommunity && canManageCampaigns && client?.id ? (
                                <button
                                  type="button"
                                  className={`${finderKit.btnSquare} ${finderKit.btnSquarePrimary} ${styles.addEquipmentButton}`}
                                  onClick={handleOpenCreateCampaign}
                                  aria-label={copy.addCampaign}
                                >
                                  <FaPlus />
                                </button>
                              ) : null
                            )}
                            <div className={styles.activityTableStack}>
                              {pagedOngoingCampaigns.total === 0 ? renderActivityEmpty(
                                "mdi:bullhorn-outline",
                                campaignSearchQuery.trim() && campaignSourceList.length > 0
                                  ? (copy.emptyActivitySearch || copy.emptyCampaigns)
                                  : copy.emptyCampaigns
                              ) : (
                              <UiKitTable
                                fill
                                className={styles.activityUiKitTable}
                                deps={[
                                  pagedOngoingCampaigns.total,
                                  pagedOngoingCampaigns.page,
                                  activityTableSort.campaigns?.key,
                                  activityTableSort.campaigns?.direction,
                                  campaignSearchQuery,
                                  campaignStatusFilter
                                ]}
                              >
                            <table className={styles.dataTable}>
                              <thead>
                                <tr>
                                          {renderActivitySortableTh("campaigns", "name", copy.table.name)}
                                          {renderActivitySortableTh("campaigns", "type", copy.table.type)}
                                          {renderActivitySortableTh("campaigns", "status", copy.table.status)}
                                          {renderActivitySortableTh("campaigns", "progress", copy.table.progress)}
                                          {renderActivitySortableTh("campaigns", "start", copy.table.start)}
                                </tr>
                              </thead>
                              <tbody>
                                        {pagedOngoingCampaigns.pagedList.map(campaign => <tr key={campaign.id} className={isCommunity ? undefined : styles.dataTableRowClickable} onClick={isCommunity ? undefined : () => handleOpenCampaign(campaign)}>
                                    <td className={styles.activityTitleCell}>{campaign.name || "-"}</td>
                                    <td>{getCampaignTypeLabel(campaign.type, locale)}</td>
                                    <td>
                                      <span className={styles.ticketStatusBadge}>
                                        {getCampaignStatusLabel(campaign.status, locale)}
                                      </span>
                                    </td>
                                    <td className={styles.activityProgressCell}>
                                      {typeof campaign.global_progress === "number" ? `${Math.round(campaign.global_progress)} %` : "-"}
                                    </td>
                                    <td>{formatTableDate(campaign.start_date)}</td>
                                  </tr>)}
                              </tbody>
                            </table>
                              </UiKitTable>
                              )}
                              {renderActivityPagination({
                                section: "campaigns",
                                total: pagedOngoingCampaigns.total,
                                page: pagedOngoingCampaigns.page,
                                totalPages: pagedOngoingCampaigns.totalPages,
                                safePageSize: pagedOngoingCampaigns.safePageSize
                              })}
                          </div>
                        </div>
                      </section>
                    </ProFeatureLock>
                      ) : null}

                    </div>
            </div>
            </div>
            ) : null}

            {eventsTabMounted ? (
            <div
              className={overviewTabPanelClass("events")}
              hidden={overviewTab !== "events"}
              style={overviewTab === "events" ? undefined : { display: "none" }}
              data-guide="enterprise-events-panel"
            >
              <div className={styles.activityLayout}>
                <div className={styles.activityUnifiedCard}>
                  <ProFeatureLock locked={isCommunity} featureLabel={copy.proFeatures.planning} featureKey="planning" className={styles.activityUnifiedProLock} badgePosition="none">
                    <section className={`${styles.activityUnifiedSection} ${styles.activityUnifiedSectionSolo} ${styles.activityEventsSection}`}>
                      <div className={styles.activityUnifiedBody}>
                        {renderActivityToolbar(
                          eventsSearchQuery,
                          setEventsSearchQuery,
                          eventsStatusFilter,
                          setEventsStatusFilter,
                          canScheduleEvent ? (
                            <button
                              type="button"
                              className={`${finderKit.btnSquare} ${finderKit.btnSquarePrimary} ${styles.addEquipmentButton}`}
                              onClick={handleQuickScheduleIntervention}
                              aria-label={copy.eventBookmarks?.createEventAria || "Créer un événement"}
                              title={copy.eventBookmarks?.createEvent || "Créer un événement"}
                            >
                              <FaPlus />
                            </button>
                          ) : null,
                          [
                            { id: "all", label: copy.activityFilterAll || "Tous" },
                            { id: "upcoming", label: copy.eventStatusUpcoming || copy.eventBookmarks?.sectionUpcoming || "À venir" },
                            { id: "recent", label: copy.eventStatusRecent || copy.eventBookmarks?.sectionRecent || "Récents" }
                          ]
                        )}
                        <div className={styles.activityTableStack}>
                          {pagedClientEvents.total === 0 ? renderActivityEmpty(
                            "mdi:calendar-month-outline",
                            eventsSearchQuery.trim() && allClientEvents.length > 0
                              ? (copy.emptyActivitySearch || copy.emptyEvents)
                              : (copy.emptyEvents || copy.eventBookmarks?.empty || "Aucun événement")
                          ) : (
                            <UiKitTable
                              fill
                              className={styles.activityUiKitTable}
                              deps={[
                                pagedClientEvents.total,
                                pagedClientEvents.page,
                                activityTableSort.events?.key,
                                activityTableSort.events?.direction,
                                eventsSearchQuery,
                                eventsStatusFilter
                              ]}
                            >
                              <table className={styles.dataTable}>
                                <thead>
                                  <tr>
                                    {renderActivitySortableTh("events", "title", copy.table.title)}
                                    {renderActivitySortableTh("events", "type", copy.table.type)}
                                    {renderActivitySortableTh("events", "status", copy.table.status)}
                                    {renderActivitySortableTh("events", "start", copy.table.start)}
                                    {renderActivitySortableTh("events", "end", copy.table.end || "Fin")}
                                    {renderActivitySortableTh("events", "agent", copy.table.agent || "Agent")}
                                  </tr>
                                </thead>
                                <tbody>
                                  {pagedClientEvents.pagedList.map(event => {
                                    const statusMeta = getEventStatusMeta(event);
                                    const typeLabel = eventTypeLabels[event?.type] || event?.type || "—";
                                    const startValue = getEventStartValue(event);
                                    const endValue = getEventEndValue(event);
                                    const rowKey = event?.id != null ? String(event.id) : `${startValue}-${event?.title || ""}`;
                                    return (
                                      <tr
                                        key={rowKey}
                                        className={styles.dataTableRowClickable}
                                        onClick={() => handleOpenClientEvent(event)}
                                      >
                                        <td className={styles.activityTitleCell}>
                                          {event?.title || copy.eventBookmarks?.untitledEvent || "Sans titre"}
                                        </td>
                                        <td>{typeLabel}</td>
                                        <td>
                                          <span className={styles.ticketStatusBadge}>{statusMeta.label}</span>
                                        </td>
                                        <td>{startValue ? formatTableDateTime(startValue) : "—"}</td>
                                        <td>{endValue ? formatTableDateTime(endValue) : "—"}</td>
                                        <td>{resolveEventAssigneeLabel(event, users)}</td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </UiKitTable>
                          )}
                          {renderActivityPagination({
                            section: "events",
                            total: pagedClientEvents.total,
                            page: pagedClientEvents.page,
                            totalPages: pagedClientEvents.totalPages,
                            safePageSize: pagedClientEvents.safePageSize
                          })}
                        </div>
                      </div>
                    </section>
                  </ProFeatureLock>
                </div>
              </div>
            </div>
            ) : null}

            {vaultTabMounted ? (
            <div
              className={overviewTabPanelClass("vault")}
              hidden={overviewTab !== "vault"}
              style={overviewTab === "vault" ? undefined : { display: "none" }}
            >
            <div className={styles.vaultTabStack} data-guide="enterprise-vault-panel">
              <div className={styles.vaultTabLock}>
                <ProFeatureLock locked={isCommunity} featureLabel={copy.proFeatures.vault} featureKey="vault">
                  {client?.id ? (
                    <EnterpriseVaultPanel
                      ref={vaultPanelRef}
                      copy={vaultCopy}
                      clientId={client.id}
                      clientName={client.name}
                      treeNavPortalTarget={vaultTreeNavPortalEl}
                    />
                  ) : null}
                </ProFeatureLock>
              </div>
            </div>
            </div>
            ) : null}

            {logsTabMounted ? (
            <div
              className={overviewTabPanelClass("logs")}
              hidden={overviewTab !== "logs"}
              style={overviewTab === "logs" ? undefined : { display: "none" }}
              data-guide="enterprise-logs-panel"
            >
              {client?.id ? (
                <ActivityJournalPanel
                  entityId={client.id}
                  embedded
                  active={overviewTab === "logs"}
                  fetchLogs={(page, options) => getClientLogs(client.id, page, options?.limit || 25, {
                    signal: options?.signal,
                    sortBy: options?.sortBy,
                    sortDir: options?.sortDir
                  })}
                  purgeLogs={() => purgeClientLogs(client.id)}
                />
              ) : null}
            </div>
            ) : null}
            </div>
              </div>
            </div>

          </main>

          <aside className={`${styles.asideStack} ${styles.asidePanel}`} aria-label={copy.sidebarInfo || "Informations"}>
            <div className={styles.rightSidebarContent}>
            <section
              className={`${styles.sidebarSection} ${styles.sidebarActionToolbarSection}`}
              data-guide="enterprise-quick-actions"
              aria-label={quickActionsCopy.title || "Actions rapides"}
            >
              <div className={styles.sidebarActionToolbar}>
                {canEditClient ? (
                  <EnterpriseQuickActionButton
                    actionId="edit"
                    iconify="mdi:square-edit-outline"
                    className={styles.sidebarActionIconBtn}
                    onClick={openEnterpriseEditModal}
                    aria-label={quickActionsCopy.editEnterprise || copy.editEnterprise}
                  />
                ) : null}
                {canCreateTicket ? (
                  <EnterpriseQuickActionButton
                    actionId="ticket"
                    iconify="mdi:ticket-outline"
                    className={styles.sidebarActionIconBtn}
                    onClick={handleQuickCreateTicket}
                    aria-label={quickActionsCopy.createTicket}
                  />
                ) : null}
                {canScheduleEvent ? (
                  <EnterpriseQuickActionButton
                    actionId="schedule"
                    iconify="mdi:calendar-check-outline"
                    className={styles.sidebarActionIconBtn}
                    onClick={handleQuickScheduleIntervention}
                    aria-label={quickActionsCopy.scheduleIntervention}
                  />
                ) : null}
                <EnterpriseQuickActionButton
                  actionId="subscribe"
                  iconify={enterpriseSubscribed ? "mdi:bell-ring-outline" : "mdi:bell-outline"}
                  className={`${styles.sidebarActionIconBtn} ${enterpriseSubscribed ? styles.sidebarActionIconBtnActive : ""}`}
                  onClick={toggleEnterpriseSubscribe}
                  disabled={!client?.id || enterpriseSubscribeLoading || enterpriseSubscribeSaving}
                  aria-pressed={enterpriseSubscribed}
                  aria-label={
                    enterpriseSubscribed
                      ? copy.subscribe?.unsubscribe || "Se désabonner"
                      : copy.subscribe?.subscribe || "S’abonner aux notifications"
                  }
                />
                {canReversibility ? (
                  <EnterpriseQuickActionButton
                    actionId="export"
                    iconify="mdi:export-variant"
                    className={styles.sidebarActionIconBtn}
                    onClick={() => {
                      if (isCommunity) {
                        notifyProFeature(copy.proFeatures.reversibility);
                        return;
                      }
                      handleExportReversibility();
                    }}
                    disabled={!isCommunity && generatingReversibility}
                    loading={!isCommunity && generatingReversibility}
                    loadingClassName={styles.spinning}
                    aria-label={copy.reversibilityDossier || copy.reversibilityFolder}
                  />
                ) : null}
              </div>
            </section>

            <section className={`${styles.sidebarSection} ${styles.sidebarContractSection}`}>
              <SidebarSectionHeader
                title={copy.contractTitle || copy.heroFacts?.contract || "Contrat"}
                icon="mdi:file-document-outline"
                expanded={contractSectionExpanded}
                onToggle={() => setContractSectionExpanded(prev => !prev)}
                controlsId="enterprise-sidebar-contract"
                panelStyles={styles}
              />
              {contractSectionExpanded ? (
                <div className={styles.sidebarBody} id="enterprise-sidebar-contract">
                  {!contractTypeLabel && !contractStartLabel && !contractEndLabel && !formData.contrat?.suspendu && activeContractModules.length === 0 ? (
                    <div className={styles.emptyState}>
                      <Icon icon="mdi:file-document-outline" className={styles.emptyIcon} aria-hidden />
                      <h5>{copy.noContractInfo || "Aucune information de contrat"}</h5>
                    </div>
                  ) : (
                    <>
                      <div className={styles.sidebarInfoFields}>
                        <div className={styles.sidebarInfoFieldsRow}>
                          <div className={styles.sidebarInfoField}>
                            <span className={styles.sidebarInfoFieldLabel}>{copy.contractStatusLabel || copy.table?.status || "Statut"}</span>
                            <span
                              className={styles.sidebarInfoFieldValue}
                          style={contractStatus?.color ? { color: contractStatus.color } : undefined}
                        >
                          {contractStatus?.label || "—"}
                            </span>
                      </div>
                          <div className={styles.sidebarInfoField}>
                            <span className={styles.sidebarInfoFieldLabel}>{copy.contractTypeLabel || copy.table?.type || "Type"}</span>
                            <span className={styles.sidebarInfoFieldValue}>{contractTypeLabel || "—"}</span>
                      </div>
                        </div>
                        <div className={styles.sidebarInfoField}>
                          <span className={styles.sidebarInfoFieldLabel}>{copy.contractPeriodLabel || "Période"}</span>
                          <span className={styles.sidebarInfoFieldValue}>
                            <span className={styles.sidebarContractPeriod}>
                              <span>{contractStartLabel || "—"}</span>
                              <span className={styles.sidebarContractPeriodSep} aria-hidden>→</span>
                              <span>{contractEndLabel || "—"}</span>
                            </span>
                          </span>
                        </div>
                      </div>
                      <div className={styles.sidebarContractOptionsBlock}>
                        <span className={styles.sidebarInfoFieldLabel}>
                          {copy.contractOptionsShort || copy.contractOptionsLabel}
                        </span>
                        {activeContractModules.length === 0 ? (
                          <span className={styles.sidebarContractOptionsEmpty}>{copy.noContractOptions}</span>
                        ) : (
                          <ul className={styles.sidebarContractIconRow}>
                            {activeContractModules.map(mod => (
                              <li key={mod.moduleKey}>
                                
                                  <span className={styles.sidebarContractIconChip} aria-label={mod.label}>
                                    <Icon icon={mod.icon || "mdi:puzzle-outline"} aria-hidden />
                                  </span>
                                
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </>
                  )}
                </div>
              ) : null}
            </section>

            <section className={styles.sidebarSection}>
              <SidebarSectionHeader
                title={copy.sitesTitle}
                icon="mdi:map-marker-outline"
                count={(formData.sites || []).length > 0 ? clientSites.length : null}
                expanded={sitesSectionExpanded}
                onToggle={() => setSitesSectionExpanded(prev => !prev)}
                controlsId="enterprise-sidebar-sites"
                panelStyles={styles}
              />
              {sitesSectionExpanded && <div className={styles.sidebarBody} id="enterprise-sidebar-sites">
                {(formData.sites || []).length === 0 ? <div className={styles.emptyState}>
                    <Icon icon="mdi:map-marker-outline" className={styles.emptyIcon} aria-hidden />
                    <h5>{copy.noSites}</h5>
                  </div> : <>
                  <div className={styles.sidebarSearchToolbar}>
                    <div className={equipStyles.embeddedSearchBox}>
                      <Icon icon="mdi:magnify" className={equipStyles.embeddedSearchIcon} aria-hidden />
                      <input
                        type="text"
                        inputMode="search"
                        autoComplete="off"
                        className={equipStyles.embeddedSearchInput}
                        value={sitesSearch}
                        onChange={event => {
                    setSitesSearch(event.target.value);
                    setSitesPage(1);
                        }}
                        placeholder={copy.activitySearchPlaceholder || "Rechercher"}
                        aria-label={copy.searchSitesAria}
                      />
                      {sitesSearch ? (
                        <button
                          type="button"
                          className={equipStyles.embeddedSearchClear}
                          onClick={() => {
                    setSitesSearch("");
                    setSitesPage(1);
                          }}
                          aria-label={common.close}
                        >
                          <FaTimes aria-hidden />
                        </button>
                      ) : null}
                    </div>
                  </div>
                  {filteredSites.length === 0 ? <div className={styles.emptyState}>
                      <Icon icon="mdi:magnify" className={styles.emptyIcon} aria-hidden />
                      <h5>{copy.noSiteResults}</h5>
                    </div> : <>
                      <div className={styles.sitesDisplayCards}>
                        {pagedSites.map(site => {
                    const address = buildSiteAddress(site);
                    const siteValue = getSiteLocationValue(site);
                    const isActive = activeSiteFilter === siteValue;
                    return <button type="button" key={getSiteId(site)} className={`${styles.sitePreviewCard} ${styles.siteFilterButton} ${isActive ? styles.siteFilterButtonActive : ""} ${site.isPrimary ? styles.sitePreviewCardPrimary : ""}`.trim()} aria-pressed={isActive} onClick={() => setActiveSiteFilter(isActive ? null : siteValue)} title={interpolate(copy.filterSiteTitle, {
                      name: getSiteDisplayName(site)
                    })}>
                              <div className={styles.sitePreviewMain}>
                                <strong className={styles.sitePreviewName}>
                                  {getSiteDisplayName(site)}
                                </strong>
                                {address ? <span className={styles.sitePreviewAddress}>{address}</span> : null}
                              </div>
                              <div className={styles.sitePreviewMap} onClick={event => event.stopPropagation()}>
                                <SiteMapPreview latitude={site.latitude} longitude={site.longitude} label={getSiteDisplayName(site)} address={address} compact />
                              </div>
                            </button>;
                  })}
                      </div>
                      {sitesTotalPages > 1 ? <div className={styles.sitesPager}>
                          <button type="button" className={styles.sitesPagerBtn} onClick={() => setSitesPage(safeSitesPage - 1)} disabled={safeSitesPage <= 1} aria-label={common.prevPage} title={common.prevPage}>
                            <Icon icon="mdi:chevron-left" aria-hidden />
                          </button>
                          <span className={styles.sitesPagerInfo}>{interpolate(copy.sitesRange, {
                      start: String(sitesRangeStart),
                      end: String(sitesRangeEnd),
                      total: String(filteredSites.length)
                    })}</span>
                          <button type="button" className={styles.sitesPagerBtn} onClick={() => setSitesPage(safeSitesPage + 1)} disabled={safeSitesPage >= sitesTotalPages} aria-label={common.nextPage} title={common.nextPage}>
                            <Icon icon="mdi:chevron-right" aria-hidden />
                          </button>
                        </div> : null}
                    </>}
                  </>}
              </div>}
            </section>

            <section className={styles.sidebarSection} data-guide="enterprise-sidebar-contacts">
              <SidebarSectionHeader
                title={copy.contactsTitle}
                icon="mdi:account-multiple-outline"
                count={!loadingContacts && contacts.length > 0 ? activeContactCount : null}
                expanded={contactsSectionExpanded}
                onToggle={() => setContactsSectionExpanded(prev => !prev)}
                controlsId="enterprise-sidebar-contacts"
                panelStyles={styles}
                actions={canAddContact ? 
                    <button type="button" className={styles.editInfoButton} onClick={e => {
                  e.stopPropagation();
                  handleAddContact();
                }} aria-label={copy.addContact}>
                      <FaPlus />
                    </button>
                   : null}
              />
              {contactsSectionExpanded && <div className={styles.sidebarBody} id="enterprise-sidebar-contacts">
              {loadingContacts ? <div className={styles.loadingState}>{copy.loadingContacts}</div> : !contacts || contacts.length === 0 ? <div className={styles.emptyState}>
                  <Icon icon="mdi:account-multiple-outline" className={styles.emptyIcon} aria-hidden />
                  <h5>{copy.noContacts}</h5>
                </div> : <>
                <div className={styles.sidebarSearchToolbar}>
                  <div className={equipStyles.embeddedSearchBox}>
                    <Icon icon="mdi:magnify" className={equipStyles.embeddedSearchIcon} aria-hidden />
                    <input
                      type="text"
                      inputMode="search"
                      autoComplete="off"
                      className={equipStyles.embeddedSearchInput}
                      value={contactsSearch}
                      onChange={event => setContactsSearch(event.target.value)}
                      placeholder={copy.activitySearchPlaceholder || "Rechercher"}
                      aria-label={copy.searchContactsAria}
                    />
                    {contactsSearch ? (
                      <button
                        type="button"
                        className={equipStyles.embeddedSearchClear}
                        onClick={() => setContactsSearch("")}
                        aria-label={common.close}
                      >
                        <FaTimes aria-hidden />
                      </button>
                    ) : null}
                  </div>
                </div>
                {filteredContacts.length === 0 ? <div className={styles.emptyState}>
                    <Icon icon="mdi:magnify" className={styles.emptyIcon} aria-hidden />
                    <h5>{copy.noContactResults}</h5>
                  </div> : <>
                <ul className={styles.sidebarContactsList}>
                  {visibleContacts.map(contact => {
                    const isPrimaryContact = isContactPrimaryForClient(contact, client?.id);
                    return (
                      <li
                        key={contact.id}
                        className={`${styles.sidebarContactItem} ${isPrimaryContact ? styles.sidebarContactItemPrimary : ""}`.trim()}
                        onClick={() => {
                          if (onNavigate) {
                            onNavigate("ContactDetail", {
                              contactId: contact.id,
                              id: contact.id,
                              nom: contact.nom,
                              prenom: contact.prenom,
                              name: [contact.prenom, contact.nom].filter(Boolean).join(" ") || undefined
                            });
                          }
                        }}
                      >
                      <div className={styles.sidebarContactBody}>
                        <div className={styles.sidebarContactTop}>
                          <div className={styles.sidebarContactIdentity}>
                            <span className={styles.sidebarContactNameRow}>
                              <span className={styles.sidebarContactName}>
                                {contact.nom} {contact.prenom}
                              </span>
                            </span>
                            {contact.poste && <span className={styles.sidebarContactRole}>
                                {contact.poste}
                              </span>}
                            {(() => {
                              const membership = Array.isArray(contact.clients)
                                ? contact.clients.find(row => String(row.client_id || row.id) === String(client?.id))
                                : null;
                              const linkedSiteIds = new Set([
                                ...(Array.isArray(membership?.site_ids) ? membership.site_ids : []),
                                ...(Array.isArray(membership?.sites) ? membership.sites.map(site => site.site_id || site.id) : []),
                                ...(Array.isArray(contact.sites)
                                  ? contact.sites
                                    .filter(site => String(site.client_id || client?.id) === String(client?.id))
                                    .map(site => site.site_id || site.id)
                                  : [])
                              ].map(id => String(id || "").trim()).filter(Boolean));
                              if (linkedSiteIds.size === 0) return null;
                              const siteById = new Map(clientSites.map(site => [String(site.id), site]));
                              const primarySiteIds = new Set([
                                ...(Array.isArray(membership?.sites) ? membership.sites : []),
                                ...(Array.isArray(contact.sites) ? contact.sites : [])
                              ].filter(site => site?.is_primary).map(site => String(site.site_id || site.id || "").trim()).filter(Boolean));
                              return <div className={styles.sidebarContactSites}>
                                  {[...linkedSiteIds].map(siteId => {
                                const site = siteById.get(siteId);
                                const label = site ? getSiteDisplayName(site) : siteId;
                                return <span key={siteId} className={`${styles.sidebarContactSiteChip} ${primarySiteIds.has(siteId) ? styles.sidebarContactSiteChipPrimary : ""}`.trim()}>
                                      <Icon icon="mdi:map-marker-outline" aria-hidden />
                                      <span>{label}</span>
                                    </span>;
                              })}
                                </div>;
                            })()}
                          </div>
                          <div className={styles.sidebarContactActions}>
                            <button type="button" className={styles.sidebarCopyButton} aria-label={copy.copyContactCard} onClick={e => {
                              e.stopPropagation();
                              copyContactCard(contact);
                            }}>
                              <Icon icon="mdi:content-copy" />
                            </button>
                            <button type="button" className={styles.sidebarShareButton} aria-label={copy.shareContactCard} onClick={e => {
                              e.stopPropagation();
                              shareContactCard(contact);
                            }}>
                              <Icon icon="mdi:share-variant" />
                            </button>
                          </div>
                        </div>
                        {(() => {
                          const communications = normalizeContactCommunications(contact);
                          if (communications.length === 0) return null;
                          return <div className={styles.sidebarContactMeta}>
                              {communications.map(entry => {
                              const typeDef = getCommunicationTypeDef(entry.type);
                              const href = entry.type === "email" ? toMailtoHref(entry.value) : entry.type === "telephone" ? toTelHref(entry.value) : null;
                              const RowTag = href ? "a" : "span";
                              return <RowTag key={entry.id} href={href || undefined} className={styles.sidebarContactMetaRow} title={entry.isPrimary ? interpolate(copy.coordFavoriteTitle, {
                                label: typeDef.label
                              }) : typeDef.label} onClick={href ? e => e.stopPropagation() : undefined}>
                                    <Icon icon={typeDef.icon} className={styles.sidebarContactMetaIcon} aria-hidden />
                                    <span className={styles.sidebarContactMetaValue}>{entry.value}</span>
                                    <span className={styles.sidebarContactMetaStarSlot}>
                                    {entry.isPrimary ? <Icon icon="mdi:star" className={styles.sidebarContactFavoriteStar} aria-label={copy.coordFavorite} /> : null}
                                    </span>
                                  </RowTag>;
                            })}
                            </div>;
                        })()}
                      </div>
                      </li>
                    );
                  })}
                </ul>
                </>}
                </>}
              </div>}
            </section>

            <section className={styles.sidebarSection} data-guide="enterprise-sidebar-prestataires">
              <SidebarSectionHeader
                title={copy.providersTitle}
                icon="mdi:handshake-outline"
                count={!loadingPrestataires && prestataires.length > 0 ? prestataires.length : null}
                expanded={prestatairesSectionExpanded}
                onToggle={() => setPrestatairesSectionExpanded(prev => !prev)}
                controlsId="enterprise-sidebar-prestataires"
                panelStyles={styles}
                actions={canAddPrestataire ? 
                    <button type="button" className={styles.editInfoButton} onClick={e => {
                  e.stopPropagation();
                  openPrestataireAttachModal();
                }} aria-label={copy.addProvider}>
                      <FaPlus />
                    </button>
                   : null}
              />
              {prestatairesSectionExpanded && <div className={styles.sidebarBody} id="enterprise-sidebar-prestataires">
              {loadingPrestataires ? <div className={styles.loadingState}>{copy.loadingProviders}</div> : !prestataires || prestataires.length === 0 ? <div className={styles.emptyState}>
                  <Icon icon="mdi:handshake-outline" className={styles.emptyIcon} aria-hidden />
                  <h5>{copy.noProviders}</h5>
                </div> : <>
                <div className={styles.sidebarSearchToolbar}>
                  <div className={equipStyles.embeddedSearchBox}>
                    <Icon icon="mdi:magnify" className={equipStyles.embeddedSearchIcon} aria-hidden />
                    <input
                      type="text"
                      inputMode="search"
                      autoComplete="off"
                      className={equipStyles.embeddedSearchInput}
                      value={prestatairesSearch}
                      onChange={event => setPrestatairesSearch(event.target.value)}
                      placeholder={copy.activitySearchPlaceholder || "Rechercher"}
                      aria-label={copy.searchProvidersAria}
                    />
                    {prestatairesSearch ? (
                      <button
                        type="button"
                        className={equipStyles.embeddedSearchClear}
                        onClick={() => setPrestatairesSearch("")}
                        aria-label={common.close}
                      >
                        <FaTimes aria-hidden />
                      </button>
                    ) : null}
                  </div>
                </div>
                {filteredPrestataires.length === 0 ? <div className={styles.emptyState}>
                    <Icon icon="mdi:magnify" className={styles.emptyIcon} aria-hidden />
                    <h5>{copy.noProviderResults}</h5>
                  </div> : <>
                <ul className={styles.sidebarContactsList}>
                  {visiblePrestataires.map(prestataire => (
                      <li
                        key={prestataire.id}
                        className={styles.sidebarContactItem}
                        onClick={() => {
                          if (onNavigate) {
                            onNavigate("PrestataireDetail", {
                              prestataireId: prestataire.id,
                              nom: prestataire.nom
                            });
                          }
                        }}
                      >
                      <div className={styles.sidebarContactBody}>
                        <div className={styles.sidebarContactTop}>
                          <div className={styles.sidebarContactIdentity}>
                            <span className={styles.sidebarContactName}>{prestataire.nom || "-"}</span>
                            {prestataire.type ? <span className={styles.sidebarContactRole}>{prestataire.type}</span> : null}
                          </div>
                        </div>
                        {(prestataire.email || prestataire.telephone || (Array.isArray(prestataire.contacts) && prestataire.contacts[0])) ? <div className={styles.sidebarContactMeta}>
                            {(() => {
                        const primary = Array.isArray(prestataire.contacts) && prestataire.contacts[0]
                          ? prestataire.contacts[0]
                          : null;
                        const email = primary?.email || prestataire.email;
                        const telephone = primary?.telephone || prestataire.telephone;
                        const person = primary
                          ? [primary.prenom, primary.nom].filter(Boolean).join(" ")
                          : [prestataire.contact_prenom, prestataire.contact_nom].filter(Boolean).join(" ");
                        return <>
                              {person ? <span className={styles.sidebarContactMetaRow}>
                                  <Icon icon="mdi:account-outline" className={styles.sidebarContactMetaIcon} aria-hidden />
                                  <span>{person}</span>
                                </span> : null}
                              {email ? <a href={`mailto:${encodeURIComponent(email)}`} className={styles.sidebarContactMetaRow} onClick={e => e.stopPropagation()}>
                                <Icon icon="mdi:email-outline" className={styles.sidebarContactMetaIcon} aria-hidden />
                                <span>{email}</span>
                              </a> : null}
                              {telephone ? <a href={`tel:${String(telephone).replace(/[^\d+]/g, "")}`} className={styles.sidebarContactMetaRow} onClick={e => e.stopPropagation()}>
                                <Icon icon="mdi:phone-outline" className={styles.sidebarContactMetaIcon} aria-hidden />
                                <span>{telephone}</span>
                              </a> : null}
                            </>;
                      })()}
                          </div> : null}
                      </div>
                      </li>
                    ))}
                </ul>
                </>}
                </>}
                </div>}
            </section>

            {(isCommunity || supportCreditBalance !== null) && <section className={`${styles.sidebarSection} ${styles.sidebarCreditsSection}`}>
                <SidebarSectionHeader
                  title={copy.creditsTitle}
                  icon="mdi:ticket-confirmation-outline"
                  count={!isCommunity && supportCreditBalance != null ? Number(supportCreditBalance) || 0 : null}
                  badge={isCommunity ? <ProFeatureBadge variant="inline" className={styles.proBadgeInline} /> : null}
                  expanded={creditsExpanded}
                  locked={isCommunity}
                  onToggle={() => {
                    if (isCommunity) {
                      notifyProFeature(copy.proFeatures.creditPacks, "credits");
                      return;
                    }
                    setCreditsExpanded(prev => !prev);
                  }}
                  controlsId="enterprise-sidebar-credits"
                  panelStyles={styles}
                  actions={!isCommunity && canAddCredits ? 
                          <button type="button" className={styles.editInfoButton} onClick={e => {
                    e.stopPropagation();
                    setSupportCreditModalOpen(true);
                  }} aria-label={copy.addCreditPack}>
                            <FaPlus />
                          </button>
                         : null}
                />
                {!isCommunity && creditsExpanded && <div className={styles.sidebarBody} id="enterprise-sidebar-credits">
                    <ProFeatureLock locked={isCommunity} featureLabel={copy.proFeatures.creditPacks} featureKey="credits" badgePosition="none" softLocked={isCommunity}>
                      {visibleSupportPacks.length > 0 && !isCommunity ? <ul className={styles.activityCreditList}>
                          {visibleSupportPacks.map(pack => {
                      const remaining = Number(pack.remaining_amount) || 0;
                      const initial = Number(pack.initial_amount) || 0;
                      const until = pack.valid_until ? new Date(pack.valid_until).toLocaleDateString("en-GB") : null;
                      const status = String(pack.status || "active");
                      return <li key={pack.id} className={`${styles.activityCreditCard} ${status === "depleted" || status === "expired" ? styles.activityCreditCardMuted : ""}`.trim()}>
                                <div className={styles.activityCreditBody}>
                                  <div className={styles.activityCreditTop}>
                                    <span className={styles.activityCreditLabel}>
                                      {pack.label || copy.creditPackDefault}
                                    </span>
                                    <span className={`${styles.activityCreditValue} ${remaining <= 0 ? styles.activityCreditValueEmpty : ""}`}>
                                      {remaining}/{initial}
                                    </span>
                                  </div>
                                  <div className={styles.activityCreditMeta}>
                                    <Icon icon="mdi:calendar-end" className={styles.activityCreditMetaIcon} aria-hidden />
                                    <span>
                                      {until ? interpolate(copy.creditValidUntil, {
                                date: until
                              }) : copy.creditNoExpiry}
                                    </span>
                                  </div>
                                </div>
                              </li>;
                    })}
                        </ul> : <div className={styles.emptyState}>
                          <Icon icon="mdi:ticket-confirmation-outline" className={styles.emptyIcon} aria-hidden />
                          <h5>{copy.noCreditPack}</h5>
                        </div>}
                    </ProFeatureLock>
                  </div>}
              </section>}

            <section className={`${styles.sidebarSection} ${styles.sidebarSlaSection}`}>
              <SidebarSectionHeader
                title={copy.slaTitle}
                icon="mdi:timer-sand"
                badge={isCommunity ? <ProFeatureBadge variant="inline" className={styles.proBadgeInline} /> : null}
                expanded={slaExpanded}
                locked={isCommunity}
                onToggle={() => {
                  if (isCommunity) {
                    notifyProFeature(copy.proFeatures.sla, "sla");
                    return;
                  }
                  setSlaExpanded(prev => !prev);
                }}
                controlsId="enterprise-sidebar-sla"
                panelStyles={styles}
              />
              {!isCommunity && slaExpanded && <div className={styles.sidebarBody} id="enterprise-sidebar-sla">
                  <ProFeatureLock locked={isCommunity} featureLabel={copy.proFeatures.sla} featureKey="sla" badgePosition="none" softLocked={isCommunity}>
                    {parseClientSla(client?.contrat).enabled ? <table className={styles.sidebarSlaTable}>
                        <thead>
                          <tr>
                            <th scope="col" />
                            <th scope="col">{copy.slaFirstCol}</th>
                            <th scope="col">{copy.slaResolutionCol}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {formatClientSlaRows(client?.contrat).map(row => <tr key={row.key}>
                              <th scope="row">{SLA_PRIORITY_LABELS[row.key] || row.label}</th>
                              <td>{row.firstResponseHours}h</td>
                              <td>{row.resolutionHours}h</td>
                            </tr>)}
                        </tbody>
                      </table> : <div className={styles.emptyState}>
                          <Icon icon="mdi:timer-sand" className={styles.emptyIcon} aria-hidden />
                          <h5>{copy.noActiveSla}</h5>
                        </div>}
                  </ProFeatureLock>
                </div>}
            </section>

            <section className={`${styles.sidebarSection} ${styles.sidebarNotesSection}`} data-guide="enterprise-sidebar-notes">
              <SidebarSectionHeader
                title={copy.notesTitle}
                icon="mdi:note-text-outline"
                count={!loadingNotes && notes.length > 0 ? notes.length : null}
                expanded={notesSectionExpanded}
                onToggle={() => setNotesSectionExpanded(prev => !prev)}
                controlsId="enterprise-sidebar-notes"
                panelStyles={styles}
                actions={canManageNotes ? 
                    <button type="button" className={styles.editInfoButton} onClick={e => {
                  e.stopPropagation();
                  openCreateNoteModal();
                }} aria-label={copy.addNote}>
                      <FaPlus />
                    </button>
                   : null}
              />
              {notesSectionExpanded && <div className={styles.sidebarBody} id="enterprise-sidebar-notes">
              {loadingNotes ? <div className={styles.loadingState}>{copy.loadingNotes}</div> : notes.length === 0 ? <div className={styles.emptyState}>
                  <Icon icon="mdi:note-text-outline" className={styles.emptyIcon} aria-hidden />
                  <h5>{copy.noNotes}</h5>
                </div> : <ul className={styles.clientNotesList}>
                  {notes.map(note => <li key={note.id} className={styles.clientNoteItem}>
                      <div className={styles.clientNoteHeader}>
                        <div className={styles.clientNoteMeta}>
                          <span className={styles.clientNoteAuthor}>
                            {note.username || note.email || copy.noteUserFallback}
                          </span>
                          <span className={styles.clientNoteDate}>
                            {formatNoteDate(note.created_at)}
                            {note.updated_at && note.updated_at !== note.created_at ? interpolate(copy.noteEdited, {
                            date: formatNoteDate(note.updated_at)
                          }) : ""}
                          </span>
                        </div>
                        {canEditNote(note) ? <div className={styles.clientNoteActions}>
                            
                              <button type="button" className={`${styles.editInfoButton} ${styles.clientNoteActionBtn}`} onClick={() => openEditNoteModal(note)} aria-label={copy.editNoteAria}>
                                <FaPencilAlt />
                              </button>
                            
                            
                              <button type="button" className={`${styles.cancelInfoButton} ${styles.clientNoteActionBtn}`} onClick={() => handleDeleteNote(note.id)} aria-label={copy.deleteNoteAria}>
                                <Icon icon="mdi:trash-can-outline" />
                              </button>
                            
                          </div> : null}
                      </div>
                      <p className={styles.clientNoteContent}>{note.content}</p>
                    </li>)}
                </ul>}
              </div>}
            </section>
          </div>
          </aside>
        </div>
      </div>

      <EnterpriseEditModal open={enterpriseEditModalOpen} mode="edit" formData={formData} users={users} loadingUsers={loadingUsers} saving={saving} hasChanges={hasChanges} onClose={closeEnterpriseEditModal} onSave={handleSave} updateFormData={updateFormData} updateContratField={updateContratField} handleModuleToggle={handleModuleToggle} onOpenSitesModal={() => setSitesModalOpen(true)} onUserCreated={newUser => setUsers(prev => [...prev.filter(user => user.id !== newUser.id), newUser])} enabledModules={enabledModules} isCommunity={isCommunity} onDeleteEnterprise={canDeleteClient ? requestDeleteEnterpriseFromEdit : null} deleteBlockedTooltip={deleteBlockedTooltip} deleteDisabled={saving || deletingClient || loadingDeletionCheck || !deletionCheckClient} deleteLoading={deletingClient} deletionBlocked={enterpriseDeletionBlocked} loadingDeletionCheck={loadingDeletionCheck} />

      <EnterpriseBlockersModal open={deletionBlockersModalOpen} client={deletionClientSnapshot} onClose={() => setDeletionBlockersModalOpen(false)} />

      <EnterpriseDeleteModal open={deleteClientModalOpen} clientName={formData?.name || client?.name || copy.defaultEnterpriseName} saving={deletingClient} onClose={closeDeleteClientModal} onConfirm={confirmDeleteClient} />

      <ProFeaturePromoModal open={Boolean(proPromoFeature)} featureKey={proPromoFeature} onClose={() => setProPromoFeature(null)} />

      <SupportCreditPackModal open={supportCreditModalOpen} mode="create" pack={supportCreditPackSeed} clients={supportCreditModalClients} lockClient onClose={() => setSupportCreditModalOpen(false)} onSaved={reloadSupportCredits} />

      {}
      {photoModalOpen && <div className={styles.modalOverlay} onClick={() => setPhotoModalOpen(false)}>
          <div className={`${styles.modalContent} ${styles.logDetailsModal}`} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>
                <FaCamera className={styles.modalIcon} />
                {copy.modals.photoTitle}
              </h2>
              <button type="button" className={styles.modalCloseButton} onClick={() => setPhotoModalOpen(false)} aria-label={copy.close}>
                <FaTimes />
              </button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.comingSoonMessage}>
                <Icon icon="mdi:clock-outline" width={48} height={48} className={styles.comingSoonIcon} />
                <h3>{copy.modals.comingSoonTitle}</h3>
                <p>{copy.modals.comingSoonIntro}</p>
                <ul className={styles.comingSoonList}>
                  {copy.modals.comingSoonBullets.map(item => <li key={item}>{item}</li>)}
                </ul>
                <p className={styles.comingSoonNote}>{copy.modals.comingSoonNote}</p>
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button className={styles.modalOkButton} onClick={() => setPhotoModalOpen(false)}>
                {copy.understood}
              </button>
            </div>
          </div>
        </div>}

      <ContactFormModal open={contactModalOpen} initialContact={editingContact} clients={client ? [{
      id: client.id,
      name: client.name,
      sites: formData.sites ?? client.sites ?? []
    }] : []} fixedClientId={client?.id ?? null} stacked onClose={handleContactModalClose} onSuccess={() => {
      if (client?.id) loadContacts(client.id);
    }} />

      <PrestataireAttachModal
        open={showPrestataireModal}
        companyName={formData?.name || client?.name || ""}
        providers={availablePrestataires}
        loading={loadingAvailablePrestataires}
        saving={attachingPrestataire}
        onClose={() => {
          if (attachingPrestataire) return;
          setShowPrestataireModal(false);
        }}
        onSelect={handleAttachPrestataire}
      />

      <ClientNoteModal open={noteModalOpen} mode={noteModalMode} initialContent={noteModalInitialContent} clientName={formData?.name || client?.name || ""} copy={copy} saving={savingNote} onClose={closeNoteModal} onSubmit={handleNoteModalSubmit} />

      <ClientTagModal open={tagModalOpen} entityName={formData?.name || client?.name || ""} assignedTags={clientTags} saving={addingTag} onClose={() => {
      if (addingTag) return;
      setTagModalOpen(false);
    }} onSubmit={handleAddClientTag} />

      {}
      <PlanningEventModalBridge open={eventModalOpen} editingEvent={editingEvent} initialClientId={client?.id || null} initialClientName={formData?.name || client?.name || ""} onClose={() => {
      setEventModalOpen(false);
      setEditingEvent(null);
    }} onSaved={handleReloadClientActivity} />

      {}
      {sitesModalOpen && <SitesModal sites={formData.sites || []} onSave={handleSitesSave} onClose={() => setSitesModalOpen(false)} />}

      {}
      <DomainsModal isOpen={domainsModalOpen} onClose={() => setDomainsModalOpen(false)} domains={domainsData} onConfigure={() => {
      setDomainsModalOpen(false);
      openDomainsConfigModal("inventory");
    }} />

      {domainsConfigModalOpen && client?.id && <DomainsConfigModal client={client} initialSection={domainsConfigInitialSection} initialProviderId={domainsConfigInitialProviderId} initialOpenAddChoice={domainsConfigOpenAddChoice} initialEditDomain={domainsConfigInitialEditDomain} isCommunity={isCommunity} onClose={() => {
      setDomainsConfigModalOpen(false);
      setDomainsConfigInitialProviderId(null);
      setDomainsConfigOpenAddChoice(false);
      setDomainsConfigInitialEditDomain(null);
    }} onSaved={refreshDomainsState} />}
      {unifiLinkModalOpen && client?.id ? (
        <UnifiSiteLinkModal
          open={unifiLinkModalOpen}
          clientId={client.id}
          onClose={() => setUnifiLinkModalOpen(false)}
          onSaved={link => setUnifiLink(link)}
        />
      ) : null}
      {unifiImportModalOpen && client?.id ? (
        <UnifiImportModal
          open={unifiImportModalOpen}
          clientId={client.id}
          existingEquipment={mapClientHardwareEquipment(client || {})}
          onClose={() => setUnifiImportModalOpen(false)}
          onImported={async () => {
            await refreshClientEquipment();
          }}
        />
      ) : null}

      {domainPickerOpen && client?.id && <DomainSolutionPickerModal open={domainPickerOpen} client={client} domains={domainPickerDomains} onClose={() => {
      setDomainPickerOpen(false);
      setDomainPickerDomains([]);
    }} onSelectDomain={domain => {
      setDomainPickerOpen(false);
      setDomainPickerDomains([]);
      setDomainOverviewItem(domain);
      setDomainOverviewOpen(true);
    }} onAddDomain={() => {
      setDomainPickerOpen(false);
      setDomainPickerDomains([]);
      openDomainsConfigModal("inventory", null, { openAddChoice: true });
    }} onEditDomain={() => {
      setDomainPickerOpen(false);
      setDomainPickerDomains([]);
      openDomainsConfigModal("inventory");
    }} onDeleteDomain={async domain => {
      if (!client?.id) return;
      await removeMonitoredDomain(client.id, domain);
      await refreshDomainsState();
      toast.success(copy.toast.domainRemovedMonitoring);
      const modulesData = await fetchClientModules(client.id);
      const remaining = listConfiguredDomains(client, [], modulesData);
      if (remaining.length === 0) {
        setDomainPickerOpen(false);
        setDomainPickerDomains([]);
        return;
      }
      setDomainPickerDomains(remaining);
    }} onReorderDomains={async orderedDomains => {
      if (!client?.id) return;
      const reordered = await reorderMonitoredDomains(client.id, orderedDomains);
      await refreshDomainsState();
      setDomainPickerDomains(reordered);
    }} onDomainsSynced={async updatedDomains => {
      await refreshDomainsState();
      if (Array.isArray(updatedDomains)) {
        setDomainPickerDomains(updatedDomains);
        return;
      }
      if (!client?.id) return;
      const modulesData = await fetchClientModules(client.id);
      setDomainPickerDomains(listConfiguredDomains(client, [], modulesData));
    }} />}

      {domainOverviewOpen && client?.id && domainOverviewItem && <DomainOverviewModal open={domainOverviewOpen} client={client} domainItem={domainOverviewItem} onClose={() => {
      setDomainOverviewOpen(false);
      setDomainOverviewItem(null);
    }} onSynced={refreshDomainsState} onEdit={() => {
      setDomainOverviewOpen(false);
      setDomainOverviewItem(null);
      openDomainsConfigModal("inventory");
    }} onDelete={async domain => {
      if (!client?.id) return;
      await removeMonitoredDomain(client.id, domain);
      await refreshDomainsState();
      toast.success(copy.toast.domainRemoved);
      setDomainOverviewOpen(false);
      setDomainOverviewItem(null);
    }} />}

      <SslCertificatesModal
        isOpen={sslModalOpen}
        onClose={() => {
          setSslModalOpen(false);
          setSslModalItem(null);
        }}
        initialItem={sslModalItem}
        clientId={client?.id}
        onRefresh={refreshSslData}
      />

      <LicencesAbonnementsModal
        isOpen={licencesModalOpen}
        onClose={() => {
          setLicensesModalOpen(false);
          setLicensesModalItem(null);
        }}
        initialItem={licencesModalItem}
        clientId={client?.id}
        onRefresh={refreshLicencesData}
      />

      {antivirusConfigModalOpen && client?.id && <AntivirusConfigModal client={client} initialSection={antivirusConfigInitialSection} initialEditingSolution={antivirusConfigEditingSolution} isCommunity={isCommunity} onClose={() => {
      setAntivirusConfigModalOpen(false);
      setAntivirusConfigEditingSolution(null);
    }} onViewSolution={solution => {
      setAntivirusConfigModalOpen(false);
      const overviewCandidates = listOverviewAntivirusSolutions([solution]);
      if (overviewCandidates.length === 1) {
        navigateToAntivirusDetail(overviewCandidates[0]);
        return;
      }
      openAntivirusConfigModal("solution");
    }} onSaved={refreshAntivirusState} />}

      {antivirusPickerOpen && client?.id && <AntivirusSolutionPickerModal open={antivirusPickerOpen} client={client} solutions={antivirusPickerSolutions} onClose={() => {
      setAntivirusPickerOpen(false);
      setAntivirusPickerSolutions([]);
    }} onSelectSolution={solution => {
      setAntivirusPickerOpen(false);
      setAntivirusPickerSolutions([]);
      if (solution.companyId) {
        navigateToAntivirusDetail(solution);
        return;
      }
      openAntivirusConfigModal("solution");
    }} onAddSolution={() => {
      setAntivirusPickerOpen(false);
      setAntivirusPickerSolutions([]);
      openAntivirusConfigModal("solution");
    }} onEditSolution={solution => {
      setAntivirusPickerOpen(false);
      setAntivirusPickerSolutions([]);
      openAntivirusConfigModal("solution", solution);
    }} onDeleteSolution={async solution => {
      if (!client?.id) return;
      await removeAntivirusSolution(client.id, solution);
      await refreshAntivirusState();
      toast.success(copy.toast.antivirusAssociationRemoved);
      const modulesData = await fetchClientModules(client.id);
      const remaining = listConfiguredAntivirusSolutions(client, [], modulesData);
      if (remaining.length === 0) {
        setAntivirusPickerOpen(false);
        setAntivirusPickerSolutions([]);
        return;
      }
      setAntivirusPickerSolutions(remaining);
    }} onReorderSolutions={async orderedSolutions => {
      if (!client?.id) return;
      const reordered = await reorderAntivirusSolutions(client.id, orderedSolutions);
      await refreshAntivirusState();
      setAntivirusPickerSolutions(reordered);
    }} />}

      {microsoftTenantConfigModalOpen && client?.id && <MicrosoftTenantConfigModal client={client} initialSection={microsoftTenantConfigInitialSection} initialEditingTenant={microsoftTenantConfigEditingTenant} onClose={() => {
      setMicrosoftTenantConfigModalOpen(false);
      setMicrosoftTenantConfigEditingTenant(null);
    }} onViewTenant={credentials => {
      setMicrosoftTenantConfigModalOpen(false);
      setMicrosoftTenantConfigEditingTenant(null);
      navigateToMicrosoftTenantDetail(credentials);
    }} onSaved={refreshMicrosoftTenantState} />}

      {microsoftTenantPickerOpen && client?.id && <MicrosoftTenantSolutionPickerModal open={microsoftTenantPickerOpen} client={client} tenants={microsoftTenantPickerTenants} onClose={() => {
      setMicrosoftTenantPickerOpen(false);
      setMicrosoftTenantPickerTenants([]);
    }} onSelectTenant={tenant => {
      setMicrosoftTenantPickerOpen(false);
      setMicrosoftTenantPickerTenants([]);
      navigateToMicrosoftTenantDetail(tenant);
    }} onAddTenant={() => {
      setMicrosoftTenantPickerOpen(false);
      setMicrosoftTenantPickerTenants([]);
      openMicrosoftTenantConfigModal("configuration", null);
    }} onEditTenant={tenant => {
      setMicrosoftTenantPickerOpen(false);
      setMicrosoftTenantPickerTenants([]);
      openMicrosoftTenantConfigModal("overview", tenant);
    }} onDeleteTenant={async tenant => {
      if (!client?.id) return;
      await removeMicrosoftTenant(client.id, tenant);
      const remaining = await refreshMicrosoftTenantState();
      toast.success(copy.toast.microsoftTenantRemoved);
      if (remaining.length === 0) {
        setMicrosoftTenantPickerOpen(false);
        setMicrosoftTenantPickerTenants([]);
        return;
      }
      setMicrosoftTenantPickerTenants(remaining);
    }} />}

      {antispamConfigModalOpen && client?.id && <AntispamConfigModal client={client} initialSection={antispamConfigInitialSection} initialEditingSolution={antispamConfigEditingSolution} isCommunity={isCommunity} onClose={() => {
      setAntispamConfigModalOpen(false);
      setAntispamConfigEditingSolution(null);
    }} onViewSolution={solution => {
      setAntispamConfigModalOpen(false);
      const overviewCandidates = listOverviewAntispamSolutions([solution]);
      if (overviewCandidates.length === 1) {
        navigateToAntispamDetail(overviewCandidates[0]);
        return;
      }
      openAntispamConfigModal("solution");
    }} onSaved={refreshAntispamState} />}

      {antispamPickerOpen && client?.id && <AntispamSolutionPickerModal open={antispamPickerOpen} client={client} solutions={antispamPickerSolutions} onClose={() => {
      setAntispamPickerOpen(false);
      setAntispamPickerSolutions([]);
    }} onSelectSolution={solution => {
      setAntispamPickerOpen(false);
      setAntispamPickerSolutions([]);
      if (solution?.customerId || solution?.mailinblackTenantId) {
        navigateToAntispamDetail(solution);
        return;
      }
      openAntispamConfigModal("solution");
    }} onAddSolution={() => {
      setAntispamPickerOpen(false);
      setAntispamPickerSolutions([]);
      openAntispamConfigModal("solution");
    }} onEditSolution={solution => {
      setAntispamPickerOpen(false);
      setAntispamPickerSolutions([]);
      openAntispamConfigModal("solution", solution);
    }} onDeleteSolution={async solution => {
      if (!client?.id) return;
      await removeAntispamSolution(client.id, solution);
      const {
        modulesData,
        tenants
      } = await refreshAntispamState();
      toast.success(copy.toast.antispamAssociationRemoved);
      const remaining = listConfiguredAntispamSolutions(client, [], modulesData, tenants);
      if (remaining.length === 0) {
        setAntispamPickerOpen(false);
        setAntispamPickerSolutions([]);
        return;
      }
      setAntispamPickerSolutions(remaining);
    }} onReorderSolutions={async orderedSolutions => {
      if (!client?.id) return;
      await reorderAntispamSolutions(client.id, orderedSolutions);
      const {
        modulesData,
        tenants
      } = await refreshAntispamState();
      setAntispamPickerSolutions(listConfiguredAntispamSolutions(client, [], modulesData, tenants));
    }} />}

      {backupConfigModalOpen && client?.id && <BackupConfigModal client={client} initialSection={backupConfigInitialSection} initialInstance={backupConfigInitialInstance} initialJob={backupConfigInitialJob} onClose={() => {
      setBackupConfigModalOpen(false);
      setBackupConfigInitialSection("overview");
      setBackupConfigInitialInstance(null);
      setBackupConfigInitialJob(null);
    }} onSaved={async () => {
      await loadBackupData(client.id);
      const modulesData = await fetchClientModules(client.id);
      hydrateServicesFromModules(modulesData);
      setClient(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          equipements: modulesData?.equipements ?? prev.equipements,
          modules_monitoring: modulesData?.modules_monitoring ?? prev.modules_monitoring
        };
      });
      setEquipmentRevision(revision => revision + 1);
    }} />}

      <CustomEquipmentModal isOpen={Boolean(customEquipmentModal?.family)} onClose={() => setCustomEquipmentModal(null)} family={customEquipmentModal?.family} item={customEquipmentModal?.item} client={client ? {
      ...client,
      sites: formData.sites ?? client.sites ?? [],
      equipements: client.equipements || {}
    } : null} clientId={client?.id} defaultSite={activeSiteFilter || null} onRefresh={async () => {
      const familyKey = customEquipmentModal?.family?.familyKey;
      const result = await refreshClientEquipment();
      if (familyKey) {
        equipmentPageRef.current?.focusType?.(`Custom:${familyKey}`);
      }
      return result;
    }} />

      {}
      {serviceDetailsModalOpen && <div className={styles.modalOverlay} onClick={() => setServiceDetailsModalOpen(false)}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>
                <Icon icon="mdi:web" className={styles.modalIcon} />
                {interpolate(copy.modals.domainsTitle, {
              count: domainsData.length
            })}
              </h2>
              <button type="button" className={styles.modalCloseButton} onClick={() => setServiceDetailsModalOpen(false)} aria-label={copy.close}>
                <FaTimes />
              </button>
            </div>
            <div className={styles.modalBody}>
              {domainsData && domainsData.length > 0 ? <div className={styles.domainsTableSection}>
                  <div className={styles.dataTableWrapper}>
                    <table className={styles.dataTable}>
                      <thead>
                        <tr>
                          <th>{copy.modals.domainName}</th>
                          <th>{copy.modals.registrar}</th>
                          <th>{copy.modals.expiration}</th>
                          <th>{copy.table.status}</th>
                          <th>{copy.modals.autoRenewal}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {domainsData.map((domain, index) => {
                    const isExpired = domain.expirityDate || domain.expiration ? new Date(domain.expirityDate || domain.expiration) < new Date() : false;
                    return <tr key={index}>
                              <td>
                                <span className={styles.domainName}>
                                  {domain.nom || domain.name || domain.domain || 'N/A'}
                                </span>
                              </td>
                              <td>{domain.registrar || domain.registrant || 'N/A'}</td>
                              <td>
                                {domain.expirityDate || domain.expiration ? new Date(domain.expirityDate || domain.expiration).toLocaleDateString('en-GB') : 'N/A'}
                              </td>
                              <td>
                                <span className={`${styles.statusBadge} ${isExpired ? styles.statusExpired : styles.statusActive}`}>
                                  {isExpired ? copy.modals.statusExpired : copy.modals.statusActive}
                                </span>
                              </td>
                              <td>
                                <span className={`${styles.statusBadge} ${domain.auto_renewal ? styles.statusActive : styles.statusExpired}`}>
                                  {domain.auto_renewal ? copy.modals.enabled : copy.modals.disabled}
                                </span>
                              </td>
                            </tr>;
                  })}
                      </tbody>
                    </table>
                  </div>
                </div> : <div className={styles.noDomainsMessage}>
                  <Icon icon="mdi:web-off" className={styles.noDomainsIcon} />
                  <p>{copy.modals.noDomains}</p>
                </div>}
            </div>
            <div className={styles.modalFooter}>
              <button className={styles.modalOkButton} onClick={() => setServiceDetailsModalOpen(false)}>
                {copy.close}
              </button>
            </div>
          </div>
        </div>}

      {}
      {userDetailsModalOpen && selectedSecurityItem && <div className={styles.modalOverlay} onClick={() => setUserDetailsModalOpen(false)}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>
                <Icon icon={selectedSecurityItem.type === 'Antivirus' ? 'mdi:shield-check' : 'mdi:email-off'} className={styles.modalIcon} />
                {interpolate(copy.modals.securityUsersTitle, {
              name: selectedSecurityItem.nom || selectedSecurityItem.name || selectedSecurityItem.solution || "N/A"
            })}
              </h2>
              <button type="button" className={styles.modalCloseButton} onClick={() => setUserDetailsModalOpen(false)} aria-label={copy.close}>
                <FaTimes />
              </button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.securityDetailsGrid}>
                <div className={styles.securityDetail}>
                  <label className={styles.detailLabel}>{copy.modals.solution}</label>
                  <span className={styles.detailValue}>{selectedSecurityItem.nom || selectedSecurityItem.name || selectedSecurityItem.solution || 'N/A'}</span>
                </div>
                <div className={styles.securityDetail}>
                  <label className={styles.detailLabel}>{copy.modals.type}</label>
                  <span className={styles.detailValue}>
                    <span className={styles.solutionTypeBadge}>{selectedSecurityItem.type}</span>
                  </span>
                </div>
                <div className={styles.securityDetail}>
                  <label className={styles.detailLabel}>{copy.table.status}</label>
                  <span className={styles.detailValue}>
                    <span className={`${styles.statusBadge} ${(selectedSecurityItem.expirityDate || selectedSecurityItem.expiration) && new Date(selectedSecurityItem.expirityDate || selectedSecurityItem.expiration) < new Date() ? styles.statusExpired : styles.statusActive}`}>
                      {(selectedSecurityItem.expirityDate || selectedSecurityItem.expiration) && new Date(selectedSecurityItem.expirityDate || selectedSecurityItem.expiration) < new Date() ? copy.modals.statusExpired : copy.modals.statusActive}
                    </span>
                  </span>
                </div>
                <div className={styles.securityDetail}>
                  <label className={styles.detailLabel}>{copy.modals.expiration}</label>
                  <span className={styles.detailValue}>
                    {selectedSecurityItem.expirityDate || selectedSecurityItem.expiration ? new Date(selectedSecurityItem.expirityDate || selectedSecurityItem.expiration).toLocaleDateString('en-GB') : 'N/A'}
                  </span>
                </div>
              </div>

              <div className={styles.usersTableSection}>
                <h3 className={styles.sectionTitle}>
                  <Icon icon="mdi:account-group" />
                  {interpolate(copy.modals.usersTitle, {
                count: selectedSecurityItem.utilisateurs || selectedSecurityItem.nombre_utilisateurs || 0
              })}
                </h3>

                {selectedSecurityItem.utilisateurs_details && selectedSecurityItem.utilisateurs_details.length > 0 ? <div className={styles.dataTableWrapper}>
                    <table className={styles.dataTable}>
                      <thead>
                        <tr>
                          <th>{copy.modals.lastName}</th>
                          <th>{copy.modals.email}</th>
                          <th>{copy.modals.lastActivity}</th>
                          <th>{copy.table.status}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedSecurityItem.utilisateurs_details.map((user, userIndex) => <tr key={userIndex}>
                            <td>{user.nom || user.name || user.username || 'N/A'}</td>
                            <td>{user.email || user.mail || 'N/A'}</td>
                            <td>
                              {user.derniere_activite || user.last_activity ? new Date(user.derniere_activite || user.last_activity).toLocaleDateString('en-GB') : 'N/A'}
                            </td>
                            <td>
                              <span className={`${styles.statusBadge} ${user.actif !== false ? styles.statusActive : styles.statusExpired}`}>
                                {user.actif !== false ? copy.modals.statusActive : copy.modals.statusInactive}
                              </span>
                            </td>
                          </tr>)}
                      </tbody>
                    </table>
                  </div> : <div className={styles.noUsersMessage}>
                    <Icon icon="mdi:account-off" className={styles.noUsersIcon} />
                    <p>{copy.modals.noUserDetails}</p>
                    <p className={styles.noUsersSubtext}>
                      {interpolate(copy.modals.totalUsers, {
                  count: selectedSecurityItem.utilisateurs || selectedSecurityItem.nombre_utilisateurs || 0
                })}
                    </p>
                  </div>}
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button className={styles.modalOkButton} onClick={() => setUserDetailsModalOpen(false)}>
                {copy.close}
              </button>
            </div>
          </div>
        </div>}

      {}
      {logDetailsModalOpen && selectedLog && <div className={styles.modalOverlay} onClick={() => setLogDetailsModalOpen(false)}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>
                <Icon icon="mdi:history" className={styles.modalIcon} />
                {copy.modals.logTitle}
              </h2>
              <button type="button" className={styles.modalCloseButton} onClick={() => setLogDetailsModalOpen(false)} aria-label={copy.close}>
                <FaTimes />
              </button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.securityDetailsGrid}>
                <div className={styles.securityDetail}>
                  <label className={styles.detailLabel}>{copy.modals.logUser}</label>
                  <span className={styles.detailValue}>{selectedLog.user_name || selectedLog.user || copy.modals.logUnknownUser}</span>
                </div>
                <div className={styles.securityDetail}>
                  <label className={styles.detailLabel}>{copy.modals.logAction}</label>
                  <span className={styles.detailValue}>{selectedLog.action || copy.modals.logDefaultAction}</span>
                </div>
                <div className={styles.securityDetail}>
                  <label className={styles.detailLabel}>{copy.modals.logDateTime}</label>
                  <span className={styles.detailValue}>
                    {selectedLog.created_at ? new Date(selectedLog.created_at).toLocaleString('en-GB', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit'
                }) : '-'}
                  </span>
                </div>
              </div>
              {renderLogDetails(selectedLog)}
            </div>
            <div className={styles.modalFooter}>
              <button className={styles.modalOkButton} onClick={() => setLogDetailsModalOpen(false)}>
                {copy.close}
              </button>
            </div>
          </div>
        </div>}

      {}
      {antivirusDetailsModalOpen && antivirusDetailData && <div className={styles.modalOverlay} onClick={() => setAntivirusDetailsModalOpen(false)}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()} style={{
        maxWidth: '900px',
        maxHeight: '90vh',
        overflowY: 'auto'
      }}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>
                <Icon icon="mdi:shield-check" className={styles.modalIcon} />
                {interpolate(copy.modals.antivirusTitle, {
              name: antivirusDetailData.item.nom || antivirusDetailData.item.name || antivirusDetailData.item.solution || "N/A"
            })}
              </h2>
              <button type="button" className={styles.modalCloseButton} onClick={() => setAntivirusDetailsModalOpen(false)} aria-label={copy.close}>
                <FaTimes />
              </button>
            </div>
            <div className={styles.modalBody}>
              {loadingAntivirusDetails ? <div style={{
            padding: '2rem',
            textAlign: 'center',
            color: '#6b7280'
          }}>
                  <Icon icon="mdi:loading" style={{
              fontSize: '2rem',
              animation: 'spin 1s linear infinite'
            }} />
                  <p>{copy.modals.loadingAntivirus}</p>
                </div> : <>
                  {}
                  <div className={styles.securityDetailsGrid}>
                    <div className={styles.securityDetail}>
                      <label className={styles.detailLabel}>{copy.modals.solution}</label>
                      <span className={styles.detailValue}>{antivirusDetailData.item.nom || antivirusDetailData.item.name || antivirusDetailData.item.solution || 'N/A'}</span>
                    </div>
                    <div className={styles.securityDetail}>
                      <label className={styles.detailLabel}>{copy.modals.licensesUsed}</label>
                      <span className={styles.detailValue}>{antivirusDetailData.statistics?.endpoints?.managed || 'N/A'}</span>
                    </div>
                    <div className={styles.securityDetail}>
                      <label className={styles.detailLabel}>{copy.modals.totalEndpoints}</label>
                      <span className={styles.detailValue}>{antivirusDetailData.statistics?.endpoints?.total || antivirusDetailData.endpoints.length || 'N/A'}</span>
                    </div>
                    <div className={styles.securityDetail}>
                      <label className={styles.detailLabel}>{copy.modals.endpointsOnline}</label>
                      <span className={styles.detailValue}>{antivirusDetailData.statistics?.endpoints?.online || 'N/A'}</span>
                    </div>
                  </div>

                  {}
                  {antivirusDetailData.endpoints && antivirusDetailData.endpoints.length > 0 && <div className={styles.usersTableSection} style={{
              marginTop: '2rem'
            }}>
                      <h3 className={styles.sectionTitle}>
                        <Icon icon="mdi:desktop-mac-dashboard" />
                        {interpolate(copy.modals.endpointsTitle, {
                  count: antivirusDetailData.endpoints.length
                })}
                      </h3>
                      <div className={styles.dataTableWrapper}>
                        <table className={styles.dataTable}>
                          <thead>
                            <tr>
                              <th>{copy.modals.endpointName}</th>
                              <th>{copy.modals.os}</th>
                              <th>{copy.table.status}</th>
                              <th>{copy.modals.infected}</th>
                              <th>{copy.modals.lastUpdate}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {antivirusDetailData.endpoints.slice(0, 20).map((endpoint, idx) => <tr key={idx}>
                                <td>{endpoint.computerName || endpoint.name || 'N/A'}</td>
                                <td>{repairRmmTextEncoding(endpoint.osName || endpoint.os || "") || "N/A"}</td>
                                <td>
                                  <span className={`${styles.statusBadge} ${endpoint.endpointState === 1 ? styles.statusActive : styles.statusExpired}`}>
                                    {endpoint.endpointState === 1 ? copy.modals.online : copy.modals.offline}
                                  </span>
                                </td>
                                <td>
                                  <span className={`${styles.statusBadge} ${endpoint.isInfected ? styles.statusExpired : styles.statusActive}`}>
                                    {endpoint.isInfected ? copy.modals.yes : copy.modals.no}
                                  </span>
                                </td>
                                <td>
                                  {endpoint.lastUpdate ? new Date(endpoint.lastUpdate).toLocaleDateString('en-GB') : 'N/A'}
                                </td>
                              </tr>)}
                          </tbody>
                        </table>
                      </div>
                      {antivirusDetailData.endpoints.length > 20 && <p style={{
                marginTop: '1rem',
                fontSize: '0.85rem',
                color: '#6b7280'
              }}>
                          {interpolate(copy.modals.endpointsPreview, {
                  count: antivirusDetailData.endpoints.length
                })}
                        </p>}
                    </div>}

                  {}
                  {(!antivirusDetailData.endpoints || antivirusDetailData.endpoints.length === 0) && <div className={styles.noUsersMessage} style={{
              marginTop: '2rem'
            }}>
                      <Icon icon="mdi:desktop-off" className={styles.noUsersIcon} />
                      <p>{copy.modals.noEndpoints}</p>
                    </div>}
                </>}
            </div>
            <div className={styles.modalFooter}>
              <button className={styles.modalOkButton} onClick={() => setAntivirusDetailsModalOpen(false)}>
                {copy.close}
              </button>
            </div>
          </div>
        </div>}

      <PageGuideTour open={pageGuideOpen} steps={enterpriseGuideSteps} title={copy.guideTitle} onClose={() => setPageGuideOpen(false)} />

      <CampaignPickerModal open={campaignPickerOpen && Boolean(client?.id)} client={client} campaigns={campaigns} locale={locale} copy={copy} onClose={() => setCampaignPickerOpen(false)} onSelectCampaign={campaign => {
      setCampaignPickerOpen(false);
      handleOpenCampaign(campaign);
    }} onAddCampaign={canManageCampaigns ? () => {
      setCampaignPickerOpen(false);
      handleOpenCreateCampaign();
    } : undefined} />

      <ConfirmModal
        open={Boolean(solutionDeleteTarget)}
        title={
          solutionDeleteTarget?.type === "TenantMicrosoft"
            ? configModalsCopy.confirm.deleteMicrosoftTenant.title
            : configModalsCopy.confirm.deleteConfiguration.title
        }
        message={
          solutionDeleteTarget
            ? interpolate(
              solutionDeleteTarget.type === "TenantMicrosoft"
                ? configModalsCopy.confirm.deleteMicrosoftTenant.message
                : configModalsCopy.confirm.deleteConfiguration.message,
              { label: solutionDeleteTarget.label }
            )
            : ""
        }
        confirmLabel={common.delete}
        variant="danger"
        icon="mdi:delete-outline"
        loading={deletingSolution}
        onClose={() => {
          if (!deletingSolution) setSolutionDeleteTarget(null);
        }}
        onConfirm={confirmServiceBrickDelete}
      />

      {serviceBrickMenu ? <ContextMenu
        x={serviceBrickMenu.x}
        y={serviceBrickMenu.y}
        title={serviceBrickMenu.label}
        items={serviceBrickMenuItems}
        onClose={closeServiceBrickMenu}
        ariaLabel={copy.serviceBrickMenu?.aria || "Actions du service"}
      /> : null}

      <CampaignFormModal open={showCampaignModal} onClose={() => {
      if (savingCampaign) return;
      setShowCampaignModal(false);
    }} clients={client ? [client] : []} formData={campaignFormData} onFormDataChange={setCampaignFormData} onSubmit={handleSubmitCampaign} saving={savingCampaign} copy={campaignsCopy} getCampaignTypeLabel={type => campaignsCopy.types?.[type] || getCampaignTypeLabel(type, locale)} lockClient />
    </div>;
}
