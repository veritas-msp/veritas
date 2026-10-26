import React, { useState, useEffect, useLayoutEffect, useRef, useMemo, useCallback } from "react";
import { useParams } from "react-router-dom";
import { Icon } from "@iconify/react";
import { toast } from "react-toastify";
import { fetchClientsList, addContactTag, removeContactTag, deleteContact, addContactMembership, removeContactMembership, fetchContactLogs, purgeContactLogs } from "../../api/clients";
import ActivityJournalPanel from "../shared/ActivityJournalPanel/ActivityJournalPanel";
import { fetchTickets } from "../../api/tickets";
import styles from "../EnterprisesPage/EnterpriseDetailPage.module.css";
import contactStyles from "./ContactDetailPage.module.css";
import equipStyles from "../EquipementPage/EquipmentPage.module.css";
import StatusDot from "../shared/StatusDot/StatusDot";
import { useEntitySubscription } from "../../hooks/useEntitySubscription";
import { getContactSexeIcon, normalizeContactSexe } from "../../utils/contactSexe";
import { FaTimes, FaPlus } from "react-icons/fa";
import API_BASE_URL from "../../config";
import ContactPortalSection from "./ContactPortalSection";
import VaultSecretsPanel from "../EnterprisesPage/VaultSecretsPanel";
import ContactFormModal from "./ContactFormModal";
import ContactCompanyModal from "./ContactCompanyModal";
import ContactDeleteModal from "./ContactDeleteModal";
import ClientTagModal from "../EnterprisesPage/ClientTagModal";
import { EnterpriseOverviewTabButton, EnterpriseQuickActionButton } from "../EnterprisesPage/EnterpriseFinderTabIcon";
import { UiKitEmptyState, UiKitScrollFadeShell, uiKitLayoutsStyles as finderKit, useFinderNavIndicator } from "../UiKit";
import { formatTableDate } from "../../utils/tableDateFormat";
import { getTicketSlaDisplay } from "../../utils/ticketSlaUtils";
import { formatRelativeFrench } from "../EquipementPage/checkmkMonitoringUtils";
import { useVeritasEdition } from "../../hooks/useVeritasEdition";
import { usePermissions } from "../../contexts/PermissionsContext";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { getContactDetailCopy, getContactStatusLocalized, getPrestationCategoryLabel as getPrestationCategoryLabelI18n, interpolate } from "./contactDetailI18n";
import { getTicketStatusLabel } from "../EnterprisesPage/enterpriseDetailI18n";
import { getContactSexeLabelLocalized } from "./contactFormModalI18n";
import ProFeatureLock from "../Misc/ProFeature/ProFeatureLock";
import ProFeatureBadge from "../Misc/ProFeature/ProFeatureBadge";
import { isSalesTicket } from "../../utils/salesTicketUtils";
import ProFeaturePromoModal from "../Misc/ProFeature/ProFeaturePromoModal";
import { setProFeaturePromoHandler } from "../Misc/ProFeature/proFeatureUtils";
import { normalizeContactCommunications, sortCommunicationsByType } from "../../utils/contactCommunications";
import PageGuideTour from "../PageGuide/PageGuideTour";
import { getContactDetailGuideSteps } from "../PageGuide/contactDetailGuideSteps";
import { useRegisterPageGuide } from "../../hooks/useRegisterPageGuide";
import { createTrackedAbortController } from "../../utils/pageLoadAbort";
import {
  DETAIL_CACHE_NS,
  getDetailCache,
  invalidateDetailCache,
  setDetailCache
} from "../../utils/detailPageCache";
import { getListCache, LIST_CACHE_NS } from "../../utils/listPageCache";
import {
  normalizeContactActivitySection,
  normalizeContactOverviewTab,
  readContactDetailUi,
  writeContactDetailUi
} from "../../utils/contactDetailUiState";
import CrmDetailPageSkeleton from "../EnterprisesPage/CrmDetailPageSkeleton";
import { getSiteDisplayName, normalizeClientSites } from "../../utils/clientSites";

function resolveInitialContactCache(contactId, contactData) {
  if (!contactId) return null;
  const cached = getDetailCache(DETAIL_CACHE_NS.contact, contactId);
  if (cached?.contact && String(cached.contact.id) === String(contactId)) return cached;
  // Navigation from list often passes the full contact row as contactData.
  if (contactData?.id && String(contactData.id) === String(contactId) && (contactData.nom != null || contactData.prenom != null)) {
    return {
      contact: contactData,
      client: contactData.client_name || contactData.client_id
        ? {
            id: contactData.client_id || null,
            name: contactData.client_name || `Client #${contactData.client_id}`
          }
        : null,
      formData: {
        nom: contactData.nom || "",
        prenom: contactData.prenom || "",
        sexe: contactData.sexe || "",
        email: contactData.email || "",
        telephone: contactData.telephone || "",
        poste: contactData.poste || "",
        statut: contactData.statut || "actif",
        client_id: contactData.client_id || null
      },
      tags: Array.isArray(contactData.tags) ? contactData.tags : []
    };
  }
  const list = getListCache(LIST_CACHE_NS.contacts);
  if (Array.isArray(list)) {
    const row = list.find(item => String(item?.id) === String(contactId));
    if (row) {
      return {
        contact: row,
        client: row.client_name || row.client_id
          ? {
              id: row.client_id || null,
              name: row.client_name || `Client #${row.client_id}`
            }
          : null,
        formData: {
          nom: row.nom || "",
          prenom: row.prenom || "",
          sexe: row.sexe || "",
          email: row.email || "",
          telephone: row.telephone || "",
          poste: row.poste || "",
          statut: row.statut || "actif",
          client_id: row.client_id || null
        },
        tags: Array.isArray(row.tags) ? row.tags : []
      };
    }
  }
  return null;
}

function SidebarSectionHeader({
  title,
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
          {title}
          {count != null ? <span className={panelStyles.sidebarSectionCount}>{count}</span> : null}
          {badge}
        </span>
      </button>
      {actions ? <div className={panelStyles.sidebarHeaderActions}>{actions}</div> : null}
      <button type="button" className={panelStyles.sidebarCollapseChevronBtn} onClick={handleToggle} tabIndex={-1} aria-hidden="true">
        <Icon icon={!locked && expanded ? "mdi:chevron-up" : "mdi:chevron-down"} className={panelStyles.sidebarCollapseChevron} />
      </button>
    </div>;
}
const normalizePhone = value => {
  let normalized = (value || "").toString().trim();
  if (normalized.startsWith("'")) {
    normalized = normalized.slice(1);
  }
  return normalized.replace(/[^\d+]/g, "");
};
const toTelHref = value => {
  const normalized = normalizePhone(value);
  return normalized ? `tel:${normalized}` : "";
};
const toMailtoHref = value => {
  const email = (value || "").toString().trim();
  return email ? `mailto:${encodeURIComponent(email)}` : "";
};
function formatContactName(contact, fallback = "Contact") {
  const prenom = (contact?.prenom || "").trim();
  const nom = (contact?.nom || "").trim();
  if (prenom && nom) return `${prenom} ${nom}`;
  return nom || prenom || fallback;
}
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
const isPrestationTicket = ticket => isSalesTicket(ticket);
const normalizeTicketStatus = status => status === "open" ? "new" : status;
const isOpenTicket = ticket => {
  const status = normalizeTicketStatus(ticket?.status);
  return !["resolved", "closed"].includes(status);
};
const getPrestationCategoryLabel = (category, locale) => getPrestationCategoryLabelI18n(category, locale);

/** Segmented Tous / Ouverts / Clos — pastille glissante comme fiche entreprise */
function ActivityStatusSegmented({ value, onChange, options, ariaLabel }) {
  const trackRef = useRef(null);
  const [indicator, setIndicator] = useState({ left: 0, width: 0, ready: false });

  useLayoutEffect(() => {
    const root = trackRef.current;
    if (!root) return undefined;
    const update = () => {
      const active = root.querySelector('[aria-pressed="true"]');
      if (!active) {
        setIndicator(prev => (prev.ready ? { ...prev, ready: false } : prev));
        return;
      }
      const next = {
        left: active.offsetLeft,
        width: active.offsetWidth,
        ready: true
      };
      setIndicator(prev =>
        prev.left === next.left && prev.width === next.width && prev.ready ? prev : next
      );
    };
    update();
    const raf = requestAnimationFrame(() => {
      update();
      requestAnimationFrame(update);
    });
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(update) : null;
    ro?.observe(root);
    window.addEventListener("resize", update);
    return () => {
      cancelAnimationFrame(raf);
      ro?.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [value]);

  return (
    <div ref={trackRef} className={styles.macosSegmented} role="group" aria-label={ariaLabel}>
      {indicator.ready ? (
        <span
          className={styles.macosSegmentIndicator}
          style={{
            transform: `translateX(${indicator.left}px)`,
            width: indicator.width
          }}
          aria-hidden
        />
      ) : null}
      {options.map(option => (
        <button
          key={option.id}
          type="button"
          className={`${styles.macosSegment} ${value === option.id ? styles.macosSegmentActive : ""}`}
          aria-pressed={value === option.id}
          onClick={() => onChange(option.id)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export default function ContactDetailPage({
  onNavigate,
  contactData
}) {
  const {
    contactId: urlContactId
  } = useParams();
  const locale = useAppLocale();
  const copy = useMemo(() => getContactDetailCopy(locale), [locale]);
  const {
    isCommunity
  } = useVeritasEdition();
  const {
    can
  } = usePermissions();
  const canEditContact = can("contacts_detail.edit");
  const canDeleteContact = can("contacts_detail.delete");
  const canManagePortal = can("contacts_detail.portal");
  const canAccessSharing = can("contacts_detail.access_sharing");
  const canCreateTicket = can("tickets.create");
  const resolveContactId = () => contactData?.contactId || contactData?.id || urlContactId || null;
  const resolvedContactId = contactData?.contactId || contactData?.id || urlContactId || null;
  const initialContactUi = useMemo(
    () => readContactDetailUi(resolvedContactId),
    [resolvedContactId]
  );
  const initialCachedContact = useMemo(
    () => resolveInitialContactCache(resolvedContactId, contactData),
    // Snapshot once per mount for this contact id
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [resolvedContactId]
  );
  const [contact, setContact] = useState(() => initialCachedContact?.contact || null);
  const [loading, setLoading] = useState(() => !initialCachedContact?.contact);
  const [error, setError] = useState(null);
  const [client, setClient] = useState(() => initialCachedContact?.client ?? null);
  const [allClients, setAllClients] = useState([]);
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [contactModalOptions, setContactModalOptions] = useState({
    initialSection: null,
    seedCommunicationType: null
  });
  const [emailSectionExpanded, setEmailSectionExpanded] = useState(false);
  const [phoneSectionExpanded, setPhoneSectionExpanded] = useState(false);
  const [companiesSectionExpanded, setCompaniesSectionExpanded] = useState(false);
  const [deleteContactModalOpen, setDeleteContactModalOpen] = useState(false);
  const [deletingContact, setDeletingContact] = useState(false);
  const [proPromoFeature, setProPromoFeature] = useState(null);
  const [pageGuideOpen, setPageGuideOpen] = useState(false);
  const openPageGuide = useCallback(() => setPageGuideOpen(true), []);
  useRegisterPageGuide(openPageGuide);
  const loadControllerRef = useRef(null);
  const clientsListControllerRef = useRef(null);
  const pageRootRef = useRef(null);
  const contactUiIdRef = useRef(resolvedContactId);
  const skipContactUiPersistRef = useRef(false);
  const pendingContactExtrasRef = useRef(null);
  const {
    subscribed: contactSubscribed,
    loading: contactSubscribeLoading,
    saving: contactSubscribeSaving,
    toggleSubscribe: toggleContactSubscribe
  } = useEntitySubscription("contact", contact?.id || resolveContactId(), {
    labels: {
      subscribed: copy.subscribe?.subscribedToast || "Abonnement activé",
      unsubscribed: copy.subscribe?.unsubscribedToast || "Abonnement retiré"
    }
  });
  const isMountedRef = useRef(true);
  const loadRequestIdRef = useRef(0);
  const [formData, setFormData] = useState(() => initialCachedContact?.formData || {
    nom: "",
    prenom: "",
    sexe: "",
    email: "",
    telephone: "",
    poste: "",
    statut: "actif",
    client_id: null
  });
  const [contactTags, setContactTags] = useState(() =>
    Array.isArray(initialCachedContact?.tags) ? initialCachedContact.tags : []
  );
  const [loadingTags, setLoadingTags] = useState(() => !Array.isArray(initialCachedContact?.tags));
  const [tagModalOpen, setTagModalOpen] = useState(false);
  const [shareAccessCreateOpen, setShareAccessCreateOpen] = useState(false);
  const [shareSearchQuery, setShareSearchQuery] = useState("");
  const [shareListFilter, setShareListFilter] = useState("ongoing");
  const [overviewTab, setOverviewTab] = useState(() =>
    normalizeContactOverviewTab(initialContactUi?.overviewTab)
  );
  const [activitySection, setActivitySection] = useState(() =>
    normalizeContactActivitySection(initialContactUi?.activitySection)
  );
  const [activityTabMounted, setActivityTabMounted] = useState(true);
  const [portalTabMounted, setPortalTabMounted] = useState(
    () => normalizeContactOverviewTab(initialContactUi?.overviewTab) === "portal"
  );
  const [shareTabMounted, setShareTabMounted] = useState(
    () => normalizeContactOverviewTab(initialContactUi?.overviewTab) === "share"
  );
  const [logsTabMounted, setLogsTabMounted] = useState(
    () => normalizeContactOverviewTab(initialContactUi?.overviewTab) === "logs"
  );
  const [vaultClientId, setVaultClientId] = useState(() => initialContactUi?.vaultClientId || null);
  const [companyModalOpen, setCompanyModalOpen] = useState(false);
  const [membershipBusy, setMembershipBusy] = useState(false);
  const [clientsLoading, setClientsLoading] = useState(false);
  const [addingTag, setAddingTag] = useState(false);
  const [supportTickets, setSupportTickets] = useState(() =>
    Array.isArray(initialCachedContact?.supportTickets) ? initialCachedContact.supportTickets : []
  );
  const [prestationTickets, setPrestationTickets] = useState(() =>
    Array.isArray(initialCachedContact?.prestationTickets) ? initialCachedContact.prestationTickets : []
  );
  const [supportSearchQuery, setSupportSearchQuery] = useState("");
  const [prestationSearchQuery, setPrestationSearchQuery] = useState("");
  const [supportStatusFilter, setSupportStatusFilter] = useState("all");
  const [prestationStatusFilter, setPrestationStatusFilter] = useState("all");
  const activityControllerRef = useRef(null);
  const displayCommunications = useMemo(() => sortCommunicationsByType(normalizeContactCommunications(contact || {})), [contact]);
  const emailCommunications = useMemo(() => displayCommunications.filter(entry => entry.type === "email"), [displayCommunications]);
  const phoneCommunications = useMemo(() => displayCommunications.filter(entry => entry.type === "telephone"), [displayCommunications]);
  const contactCompanies = useMemo(() => {
    const linked = Array.isArray(contact?.clients) ? contact.clients : [];
    if (linked.length > 0) {
      return linked.map(row => ({
        id: row.id ?? row.client_id,
        name: row.name || row.client_name || `Client #${row.id ?? row.client_id}`,
        poste: row.poste || "",
        is_primary: Boolean(row.is_primary),
        sites: Array.isArray(row.sites) ? row.sites : [],
        site_ids: Array.isArray(row.site_ids)
          ? row.site_ids
          : Array.isArray(row.sites)
            ? row.sites.map(site => site.site_id || site.id)
            : []
      })).filter(row => row.id != null);
    }
    if (contact?.client_id || client?.id) {
      return [{
        id: contact?.client_id || client?.id,
        name: contact?.client_name || client?.name || `Client #${contact?.client_id || client?.id}`,
        poste: contact?.poste || "",
        is_primary: true
      }];
    }
    return [];
  }, [contact, client]);
  const openSupportCount = useMemo(() => supportTickets.filter(isOpenTicket).length, [supportTickets]);
  const openPrestationCount = useMemo(() => {
    const source = isCommunity ? DEMO_PRESTATION_TICKETS : prestationTickets;
    return source.filter(isOpenTicket).length;
  }, [isCommunity, prestationTickets]);
  const [slaNow, setSlaNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setSlaNow(Date.now()), 60000);
    return () => window.clearInterval(timer);
  }, []);
  const prestationTicketsSource = useMemo(
    () => (isCommunity ? DEMO_PRESTATION_TICKETS : prestationTickets),
    [isCommunity, prestationTickets]
  );
  const matchesActivityStatusFilter = useCallback((ticket, statusFilter) => {
    if (statusFilter === "open") return isOpenTicket(ticket);
    if (statusFilter === "closed") return !isOpenTicket(ticket);
    return true;
  }, []);
  const filteredSupportTickets = useMemo(() => {
    const query = supportSearchQuery.trim().toLowerCase();
    const slaOptions = {
      clients: allClients.length ? allClients : client ? [client] : [],
      now: slaNow
    };
    return supportTickets.filter(ticket => {
      if (!matchesActivityStatusFilter(ticket, supportStatusFilter)) return false;
      if (!query) return true;
      const status = getTicketStatusLabel(normalizeTicketStatus(ticket.status), locale);
      const slaLabel = isCommunity ? "" : getTicketSlaDisplay(ticket, slaOptions).label || "";
      const haystack = [ticket.ticket_number, ticket.title, status, slaLabel]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [
    allClients,
    client,
    isCommunity,
    locale,
    matchesActivityStatusFilter,
    slaNow,
    supportSearchQuery,
    supportStatusFilter,
    supportTickets
  ]);
  const filteredPrestationTickets = useMemo(() => {
    const query = prestationSearchQuery.trim().toLowerCase();
    return prestationTicketsSource.filter(ticket => {
      if (!matchesActivityStatusFilter(ticket, prestationStatusFilter)) return false;
      if (!query) return true;
      const status = getTicketStatusLabel(normalizeTicketStatus(ticket.status), locale);
      const typeLabel = getPrestationCategoryLabel(ticket.category, locale);
      const haystack = [ticket.ticket_number, typeLabel, status].filter(Boolean).join(" ").toLowerCase();
      return haystack.includes(query);
    });
  }, [
    locale,
    matchesActivityStatusFilter,
    prestationSearchQuery,
    prestationStatusFilter,
    prestationTicketsSource
  ]);
  const renderActivityToolbar = useCallback(
    (searchValue, onSearchChange, statusFilter, onStatusFilterChange) => {
      const placeholder = copy.activitySearchPlaceholder || "Rechercher";
      const statusOptions = [
        { id: "all", label: copy.activityFilterAll || "Tous" },
        { id: "open", label: copy.activityFilterOpen || "Ouverts" },
        { id: "closed", label: copy.activityFilterClosed || "Clos" }
      ];
      return (
        <div
          className={`${equipStyles.hardwarePageEmbedded} ${equipStyles.embeddedFilterBar} ${equipStyles.embeddedFilterBarToolbar} ${styles.activityToolbar}`}
        >
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
            </div>
          </div>
        </div>
      );
    },
    [
      copy.activityClearSearchAria,
      copy.activityFilterAll,
      copy.activityFilterClosed,
      copy.activityFilterOpen,
      copy.activityFilterStatusAria,
      copy.activitySearchPlaceholder
    ]
  );
  const contactGuideSteps = useMemo(() => {
    const steps = getContactDetailGuideSteps({
      showActivity: () => setOverviewTab("activity"),
      showPortal: () => setOverviewTab("portal"),
      showShare: () => setOverviewTab("share")
    }, locale);
    if (contact?.id && (contact?.client_id || contactCompanies.length > 0)) return steps;
    return steps.filter(step => step.target !== '[data-guide="contact-shared-access"]');
  }, [locale, contact?.id, contact?.client_id, contactCompanies.length]);
  useEffect(() => {
    const preferred = contact?.client_id || contactCompanies[0]?.id || null;
    setVaultClientId(prev => {
      if (prev && contactCompanies.some(c => String(c.id) === String(prev))) return prev;
      return preferred;
    });
  }, [contact?.client_id, contactCompanies]);
  const availableCompaniesToAdd = useMemo(() => {
    const linkedIds = new Set(contactCompanies.map(c => String(c.id)));
    return allClients.filter(c => !linkedIds.has(String(c.id)));
  }, [allClients, contactCompanies]);
  const buildContactSharePayload = () => {
    const fullName = formatContactName(contact, copy.defaultName);
    const entreprise = contactCompanies.map(c => c.name).filter(Boolean).join(", ") || (client?.name || contact?.client_name || "").toString().trim();
    const telephone = (contact?.telephone || "").toString().trim();
    const email = (contact?.email || "").toString().trim();
    const poste = (contact?.poste || "").toString().trim();
    const lines = copy.share.lines;
    const payloadLines = [`${lines.contact}: ${fullName}`, entreprise ? `${lines.enterprise}: ${entreprise}` : null, poste ? `${lines.role}: ${poste}` : null, telephone ? `${lines.phone}: ${telephone}` : null, email ? `${lines.email}: ${email}` : null].filter(Boolean);
    return {
      title: interpolate(copy.share.title, {
        name: fullName
      }),
      text: payloadLines.join("\n")
    };
  };
  const handleShareContact = async () => {
    const payload = buildContactSharePayload();
    try {
      if (navigator?.share) {
        await navigator.share({
          title: payload.title,
          text: payload.text
        });
        return;
      }
      toast.info(copy.share.unavailable);
    } catch {
      toast.info(copy.share.cancelled);
    }
  };
  const handleCopyContact = async () => {
    const payload = buildContactSharePayload();
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(payload.text);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = payload.text;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      toast.success(copy.toast.cardCopied);
    } catch {
      toast.error(copy.toast.cardCopyError);
    }
  };
  const copyCoordValue = async (value, label) => {
    const raw = (value || "").toString().trim();
    if (!raw) {
      toast.info(interpolate(copy.clipboard.unavailable, {
        label
      }));
      return;
    }
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(raw);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = raw;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      toast.success(interpolate(copy.clipboard.copied, {
        label
      }));
    } catch {
      toast.error(interpolate(copy.clipboard.copyFailed, {
        label: label.toLowerCase()
      }));
    }
  };
  useEffect(() => {
    isMountedRef.current = true;
    const contactIdToUse = contactData?.contactId || contactData?.id || urlContactId;
    if (contactIdToUse) {
      const controller = createTrackedAbortController();
      loadControllerRef.current?.abort();
      loadControllerRef.current = controller;
      loadContactData(controller.signal);
    }
    return () => {
      isMountedRef.current = false;
      loadControllerRef.current?.abort();
      clientsListControllerRef.current?.abort();
      activityControllerRef.current?.abort();
    };
  }, [urlContactId, contactData?.contactId, contactData?.id]);
  useEffect(() => {
    setProFeaturePromoHandler(featureKey => setProPromoFeature(featureKey));
    return () => setProFeaturePromoHandler(null);
  }, []);
  useEffect(() => {
    if (!contact?.id) return;
    const prev = contactUiIdRef.current;
    const id = contact.id;
    if (prev != null && String(prev) !== String(id)) {
      skipContactUiPersistRef.current = true;
      const saved = readContactDetailUi(id);
      const nextTab = normalizeContactOverviewTab(saved?.overviewTab);
      setOverviewTab(nextTab);
      setActivitySection(normalizeContactActivitySection(saved?.activitySection));
      setPortalTabMounted(nextTab === "portal");
      setShareTabMounted(nextTab === "share");
      setLogsTabMounted(nextTab === "logs");
      setActivityTabMounted(true);
      setVaultClientId(saved?.vaultClientId || null);
    }
    contactUiIdRef.current = id;
  }, [contact?.id]);
  useEffect(() => {
    if (!contact?.id) return;
    if (skipContactUiPersistRef.current) {
      skipContactUiPersistRef.current = false;
      return;
    }
    writeContactDetailUi(contact.id, {
      overviewTab,
      activitySection,
      vaultClientId: vaultClientId || null
    });
  }, [contact?.id, overviewTab, activitySection, vaultClientId]);
  useEffect(() => {
    if (!contact?.id) return;
    setActivityTabMounted(true);
    setPortalTabMounted(true);
    setShareTabMounted(true);
    setLogsTabMounted(true);
  }, [contact?.id]);
  useEffect(() => {
    if (overviewTab === "activity") setActivityTabMounted(true);
    if (overviewTab === "portal") setPortalTabMounted(true);
    if (overviewTab === "share") setShareTabMounted(true);
    if (overviewTab === "logs") setLogsTabMounted(true);
  }, [overviewTab]);
  const { trackRef: finderPrimaryTrackRef, indicator: finderPrimaryIndicator } = useFinderNavIndicator([
    overviewTab
  ]);
  const { trackRef: finderActivityTrackRef, indicator: finderActivityIndicator } = useFinderNavIndicator([
    overviewTab,
    activitySection
  ]);
  const [finderSecEnter, setFinderSecEnter] = useState(true);
  useLayoutEffect(() => {
    setFinderSecEnter(false);
  }, [overviewTab]);
  useEffect(() => {
    const id = requestAnimationFrame(() => setFinderSecEnter(true));
    return () => cancelAnimationFrame(id);
  }, [overviewTab]);
  useEffect(() => {
    const el = pageRootRef.current;
    if (!el || !contact?.id) return undefined;
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        writeContactDetailUi(contact.id, {
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
      writeContactDetailUi(contact.id, {
        scrollY: el.scrollTop
      });
    };
  }, [contact?.id]);
  useEffect(() => {
    if (loading || !contact?.id) return;
    const savedY = readContactDetailUi(contact.id)?.scrollY;
    if (typeof savedY !== "number" || savedY <= 0) return;
    const el = pageRootRef.current;
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
  }, [loading, contact?.id]);
  useEffect(() => {
    if (!contact?.client_id || allClients.length === 0) return;
    const fullClient = allClients.find(item => item.id === contact.client_id);
    if (fullClient) setClient(fullClient);
  }, [contact?.client_id, allClients]);
  useEffect(() => {
    if (!contact?.client_id) return;
    ensureClientsLoaded();
  }, [contact?.client_id]);
  const handleAddContactTag = async ({
    label,
    color
  }) => {
    const trimmed = String(label || "").trim();
    if (!trimmed || !contact?.id || addingTag) return;
    setAddingTag(true);
    try {
      const tag = await addContactTag(contact.id, {
        label: trimmed,
        color
      });
      setContactTags(prev => {
        const next = prev.some(t => t.id === tag.id)
          ? prev
          : [...prev, tag].sort((a, b) => a.label.localeCompare(b.label));
        patchContactExtras(contact.id, {
          tags: next
        });
        return next;
      });
      setTagModalOpen(false);
      window.dispatchEvent(new Event("refreshContacts"));
      toast.success(copy.toast.tagAdded);
    } catch (error) {
      console.error("Error adding tag:", error);
      toast.error(error.message || copy.toast.tagAddError);
    } finally {
      setAddingTag(false);
    }
  };
  const handleRemoveContactTag = async tagId => {
    if (!contact?.id) return;
    try {
      await removeContactTag(contact.id, tagId);
      setContactTags(prev => {
        const next = prev.filter(t => t.id !== tagId);
        patchContactExtras(contact.id, {
          tags: next
        });
        return next;
      });
      window.dispatchEvent(new Event("refreshContacts"));
      toast.success(copy.toast.tagRemoved);
    } catch (error) {
      console.error("Error removing tag:", error);
      toast.error(error.message || copy.toast.tagRemoveError);
    }
  };
  const ensureClientsLoaded = async () => {
    if (allClients.length > 0) return true;
    clientsListControllerRef.current?.abort();
    const controller = createTrackedAbortController();
    clientsListControllerRef.current = controller;
    setClientsLoading(true);
    try {
      const clientsData = await fetchClientsList({
        signal: controller.signal
      });
      if (controller.signal.aborted || !isMountedRef.current) return false;
      setAllClients(Array.isArray(clientsData) ? clientsData : []);
      return true;
    } catch (err) {
      if (err?.name === "AbortError") return false;
      console.error("Error fetching clients:", err);
      toast.error(copy.toast.clientsLoadError);
      return false;
    } finally {
      if (isMountedRef.current && clientsListControllerRef.current === controller) {
        setClientsLoading(false);
      }
    }
  };
  const openCompanyModal = () => {
    setCompanyModalOpen(true);
    ensureClientsLoaded();
  };
  const closeCompanyModal = () => {
    if (membershipBusy) return;
    setCompanyModalOpen(false);
  };
  const applyContactSnapshot = useCallback((fetchedContact, extras = {}) => {
    if (!fetchedContact) return;
    const newFormData = extras.formData || {
      nom: fetchedContact.nom || "",
      prenom: fetchedContact.prenom || "",
      sexe: normalizeContactSexe(fetchedContact.sexe) || "",
      email: fetchedContact.email || "",
      telephone: fetchedContact.telephone || "",
      poste: fetchedContact.poste || "",
      statut: fetchedContact.statut || "actif",
      client_id: fetchedContact.client_id || null
    };
    const associatedClient =
      extras.client !== undefined
        ? extras.client
        : fetchedContact.client_name || fetchedContact.client_id
          ? {
              id: fetchedContact.client_id || null,
              name: fetchedContact.client_name || `Client #${fetchedContact.client_id}`
            }
          : null;
    const tags = Array.isArray(extras.tags)
      ? extras.tags
      : Array.isArray(fetchedContact.tags)
        ? fetchedContact.tags
        : [];
    setContact(fetchedContact);
    setContactTags(tags);
    setFormData(newFormData);
    setClient(associatedClient);
    if (Array.isArray(extras.supportTickets)) setSupportTickets(extras.supportTickets);
    if (Array.isArray(extras.prestationTickets)) setPrestationTickets(extras.prestationTickets);
    if (window.updateTabTitle && fetchedContact.nom) {
      window.updateTabTitle("ContactDetail", {
        contactId: fetchedContact.id,
        nom: fetchedContact.nom,
        prenom: fetchedContact.prenom
      });
    }
  }, []);

  const writeContactCache = useCallback((contactId, snapshot = {}) => {
    if (!contactId || !snapshot?.contact) return;
    const prev = getDetailCache(DETAIL_CACHE_NS.contact, contactId, {
      ttlMs: 0
    }) || {};
    const pickArray = (next, fallback) =>
      Array.isArray(next) ? next : Array.isArray(fallback) ? fallback : undefined;
    setDetailCache(DETAIL_CACHE_NS.contact, contactId, {
      contact: snapshot.contact,
      client: snapshot.client !== undefined ? snapshot.client : prev.client ?? null,
      formData: snapshot.formData !== undefined ? snapshot.formData : prev.formData || null,
      tags: pickArray(snapshot.tags, prev.tags) || [],
      supportTickets: pickArray(snapshot.supportTickets, prev.supportTickets) || [],
      prestationTickets: pickArray(snapshot.prestationTickets, prev.prestationTickets) || []
    });
  }, []);
  const patchContactExtras = useCallback((contactId, patch) => {
    if (!contactId || !patch || typeof patch !== "object") return;
    const current = getDetailCache(DETAIL_CACHE_NS.contact, contactId, {
      ttlMs: 0
    });
    if (current?.contact) {
      setDetailCache(DETAIL_CACHE_NS.contact, contactId, {
        ...current,
        ...patch
      });
      return;
    }
    pendingContactExtrasRef.current = {
      contactId: String(contactId),
      patch: {
        ...(pendingContactExtrasRef.current?.contactId === String(contactId)
          ? pendingContactExtrasRef.current.patch
          : {}),
        ...patch
      }
    };
  }, []);
  const flushPendingContactExtras = useCallback(contactId => {
    const pending = pendingContactExtrasRef.current;
    if (!pending || String(pending.contactId) !== String(contactId)) return;
    pendingContactExtrasRef.current = null;
    patchContactExtras(contactId, pending.patch);
  }, [patchContactExtras]);

  const loadContactData = async signal => {
    const requestId = ++loadRequestIdRef.current;
    const isCurrentRequest = () => loadRequestIdRef.current === requestId && loadControllerRef.current?.signal === signal;
    const contactIdToUse = resolveContactId();
    setError(null);
    if (!contactIdToUse) {
      setLoading(false);
      return;
    }

    const cached = getDetailCache(DETAIL_CACHE_NS.contact, contactIdToUse);
    const cacheHit = Boolean(cached?.contact && String(cached.contact.id) === String(contactIdToUse));
    if (cacheHit) {
      applyContactSnapshot(cached.contact, cached);
      setLoading(false);
      setLoadingTags(false);
    } else {
      setContact(null);
      setSupportTickets([]);
      setPrestationTickets([]);
      setContactTags([]);
      setLoading(true);
      setLoadingTags(true);
    }

    try {
      const response = await fetch(`${API_BASE_URL}/contacts/${contactIdToUse}`, {
        credentials: "include",
        signal,
        cache: "no-store"
      });
      if (!response.ok) {
        throw new Error(response.statusText || "Error loading contact");
      }
      const fetchedContact = await response.json();
      if (signal?.aborted || !isMountedRef.current || !isCurrentRequest()) return;
      const newFormData = {
        nom: fetchedContact.nom || "",
        prenom: fetchedContact.prenom || "",
        sexe: normalizeContactSexe(fetchedContact.sexe) || "",
        email: fetchedContact.email || "",
        telephone: fetchedContact.telephone || "",
        poste: fetchedContact.poste || "",
        statut: fetchedContact.statut || "actif",
        client_id: fetchedContact.client_id || null
      };
      const associatedClient = fetchedContact.client_name || fetchedContact.client_id ? {
        id: fetchedContact.client_id || null,
        name: fetchedContact.client_name || `Client #${fetchedContact.client_id}`
      } : null;
      const tags = Array.isArray(fetchedContact.tags) ? fetchedContact.tags : [];
      applyContactSnapshot(fetchedContact, {
        formData: newFormData,
        client: associatedClient,
        tags,
        supportTickets: Array.isArray(cached?.supportTickets) ? cached.supportTickets : undefined,
        prestationTickets: Array.isArray(cached?.prestationTickets) ? cached.prestationTickets : undefined
      });
      writeContactCache(contactIdToUse, {
        contact: fetchedContact,
        client: associatedClient,
        formData: newFormData,
        tags,
        supportTickets: Array.isArray(cached?.supportTickets) ? cached.supportTickets : [],
        prestationTickets: Array.isArray(cached?.prestationTickets) ? cached.prestationTickets : []
      });
      flushPendingContactExtras(contactIdToUse);
      activityControllerRef.current?.abort();
      const activityController = createTrackedAbortController();
      activityControllerRef.current = activityController;
      loadContactActivity(fetchedContact.id, fetchedContact.client_id, activityController.signal, {
        keepVisible: Array.isArray(cached?.supportTickets)
      });
    } catch (err) {
      if (err?.name === "AbortError") return;
      if (!getDetailCache(DETAIL_CACHE_NS.contact, contactIdToUse)?.contact) {
        setError(err.message || copy.loadError);
      }
      console.error("Error chargement contact:", err);
    } finally {
      if (isCurrentRequest() && isMountedRef.current) {
        setLoading(false);
        setLoadingTags(false);
      }
    }
  };
  const loadContactActivity = async (contactId, clientId, signal, {
    keepVisible = false
  } = {}) => {
    try {
      const contactTicketRows = await fetchTickets({
        requesterContactId: contactId,
        limit: 100
      }, {
        signal
      }).catch(() => []);
      if (signal?.aborted || !isMountedRef.current) return;
      const tickets = Array.isArray(contactTicketRows) ? contactTicketRows : [];
      const supportOnly = tickets.filter(t => !isPrestationTicket(t));
      const prestationsOnly = isCommunity ? [] : tickets.filter(isPrestationTicket);
      setPrestationTickets(prestationsOnly);
      setSupportTickets(supportOnly);
      patchContactExtras(contactId, {
        supportTickets: supportOnly,
        prestationTickets: prestationsOnly
      });
    } catch (err) {
      if (err?.name === "AbortError") return;
      console.error("Error loading contact activity:", err);
      if (isMountedRef.current && !keepVisible) {
        setSupportTickets([]);
        setPrestationTickets([]);
      }
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
  const handleOpenEditModal = async (options = {}) => {
    const ok = await ensureClientsLoaded();
    if (!ok) return;
    setContactModalOptions({
      initialSection: options.initialSection || null,
      seedCommunicationType: options.seedCommunicationType || null
    });
    setContactModalOpen(true);
  };
  const handleQuickCreateTicket = () => {
    if (!canCreateTicket || !onNavigate || !contact?.id) return;
    const clientId =
      vaultClientId ||
      contact.client_id ||
      contactCompanies[0]?.id ||
      client?.id ||
      null;
    if (!clientId) {
      toast.warn(
        copy.toast?.createTicketNeedEnterprise ||
          copy.quickActions?.createTicketNeedEnterprise ||
          "Rattachez le contact à une entreprise pour créer un ticket."
      );
      return;
    }
    onNavigate("TicketCreate", {
      clientId,
      contactId: contact.id
    });
  };
  const handleOpenAddCommunication = type => {
    handleOpenEditModal({
      initialSection: "coordinates",
      seedCommunicationType: type
    });
  };
  const handleContactModalClose = () => {
    setContactModalOpen(false);
    setContactModalOptions({
      initialSection: null,
      seedCommunicationType: null
    });
  };
  const handleContactModalSuccess = updated => {
    if (updated?.id) {
      setContact(prev => {
        const next = {
          ...(prev || {}),
          ...updated,
          tags: Array.isArray(updated.tags) ? updated.tags : prev?.tags || [],
          portal_email: prev?.portal_user_id ? updated.email || prev.portal_email : prev?.portal_email
        };
        const form = {
          nom: updated.nom || "",
          prenom: updated.prenom || "",
          sexe: normalizeContactSexe(updated.sexe) || "",
          email: updated.email || "",
          telephone: updated.telephone || "",
          poste: updated.poste || "",
          statut: updated.statut || "actif",
          client_id: updated.client_id ?? null
        };
        setFormData(form);
        let nextClient = null;
        if (updated.client_name || updated.client_id || Array.isArray(updated.clients) && updated.clients.length > 0) {
          const primary = Array.isArray(updated.clients) ? updated.clients.find(c => c.is_primary) || updated.clients[0] : null;
          nextClient = {
            id: updated.client_id ?? primary?.id ?? primary?.client_id ?? null,
            name: updated.client_name || primary?.name || (updated.client_id ? `Client #${updated.client_id}` : "")
          };
          setClient(nextClient);
        }
        const previousCache = getDetailCache(DETAIL_CACHE_NS.contact, updated.id) || {};
        writeContactCache(updated.id, {
          contact: next,
          client: nextClient ?? previousCache.client ?? null,
          formData: form,
          tags: next.tags,
          supportTickets: previousCache.supportTickets || [],
          prestationTickets: previousCache.prestationTickets || []
        });
        return next;
      });
    }
    window.dispatchEvent(new Event("refreshContacts"));
  };
  const openEnterprise = (targetClient = null) => {
    const target = targetClient || client;
    if (!onNavigate || !target?.id) return;
    onNavigate("ContratDetail", {
      clientId: target.id,
      name: target.name
    });
  };
  const applyMembershipResult = updatedContact => {
    if (!updatedContact?.id) return;
    let nextClient = null;
    if (updatedContact.client_id || Array.isArray(updatedContact.clients)) {
      const primary = Array.isArray(updatedContact.clients) ? updatedContact.clients.find(c => c.is_primary) || updatedContact.clients[0] : null;
      nextClient = {
        id: updatedContact.client_id ?? primary?.id ?? primary?.client_id ?? null,
        name: updatedContact.client_name || primary?.name || (updatedContact.client_id ? `Client #${updatedContact.client_id}` : "")
      };
      setClient(nextClient);
      setFormData(prev => ({
        ...prev,
        client_id: updatedContact.client_id ?? prev.client_id
      }));
    }
    setContact(prev => {
      const next = {
        ...(prev || {}),
        ...updatedContact,
        tags: Array.isArray(updatedContact.tags) ? updatedContact.tags : prev?.tags || []
      };
      const previousCache = getDetailCache(DETAIL_CACHE_NS.contact, updatedContact.id) || {};
      writeContactCache(updatedContact.id, {
        contact: next,
        client: nextClient ?? previousCache.client ?? null,
        formData: previousCache.formData || null,
        tags: next.tags,
        supportTickets: previousCache.supportTickets || [],
        prestationTickets: previousCache.prestationTickets || []
      });
      return next;
    });
    window.dispatchEvent(new Event("refreshContacts"));
  };
  const handleAddCompanyMembership = async clientRow => {
    if (!contact?.id || !clientRow?.id || membershipBusy) return;
    setMembershipBusy(true);
    try {
      const updated = await addContactMembership(contact.id, {
        client_id: clientRow.id
      });
      applyMembershipResult(updated);
      setCompanyModalOpen(false);
      toast.success(copy.toast.membershipAdded);
    } catch (error) {
      toast.error(error.message || copy.toast.membershipError);
    } finally {
      setMembershipBusy(false);
    }
  };
  const handleRemoveCompanyMembership = async clientId => {
    if (!contact?.id || !clientId || membershipBusy) return;
    setMembershipBusy(true);
    try {
      const updated = await removeContactMembership(contact.id, clientId);
      applyMembershipResult(updated);
      toast.success(copy.toast.membershipRemoved);
    } catch (error) {
      toast.error(error.message || copy.toast.membershipError);
    } finally {
      setMembershipBusy(false);
    }
  };
  const openDeleteContactModal = () => {
    setDeleteContactModalOpen(true);
  };
  const closeDeleteContactModal = () => {
    if (deletingContact) return;
    setDeleteContactModalOpen(false);
  };
  const confirmDeleteContact = async () => {
    if (!contact?.id || deletingContact) return;
    setDeletingContact(true);
    try {
      const deletedId = contact.id;
      await deleteContact(deletedId);
      invalidateDetailCache(DETAIL_CACHE_NS.contact, deletedId);
      toast.success(copy.toast.deleted);
      setDeleteContactModalOpen(false);
      window.dispatchEvent(new Event("refreshContacts"));
      if (onNavigate) {
        onNavigate("Contact");
      }
    } catch (error) {
      console.error("Error suppression contact:", error);
      toast.error(error.message || copy.toast.deleteError);
    } finally {
      setDeletingContact(false);
    }
  };
  if (loading && !contact) {
    const titleHint = formatContactName(
      {
        prenom: contactData?.prenom,
        nom: contactData?.nom
      },
      ""
    );
    return (
      <CrmDetailPageSkeleton
        className={contactStyles.contactDetailPage}
        loadingAria={copy.loading || "Chargement…"}
        titleHint={titleHint}
        showTitleIcon
        tabCount={4}
        secondaryCount={2}
        body="activity"
        showAside
        asideSections={3}
        asideActionCount={5}
      />
    );
  }
  if (error || !contact) {
    return <div className={`${styles.contratDetailPage} ${styles.enterpriseDetailPage} ${contactStyles.contactDetailPage} msp-page-grid`}>
        <div className={styles.error}>
          <Icon icon="mdi:alert-circle-outline" />
          <span>{error || copy.notFound}</span>
        </div>
      </div>;
  }
  const contactStatus = getContactStatusLocalized(formData.statut, locale);
  const displayName = formatContactName({
    prenom: formData.prenom,
    nom: formData.nom
  }, copy.defaultName);
  const finderSecondaryVisible = overviewTab === "activity";
  const renderActivityEmpty = (icon, text) => (
    <div className={styles.activityEmptyState}>
      <UiKitEmptyState bare icon={icon} text={text} />
    </div>
  );

  return <div ref={pageRootRef} className={`${styles.contratDetailPage} ${styles.enterpriseDetailPage} ${contactStyles.contactDetailPage} msp-page-grid`}>
      <header className={styles.pageHero} data-guide="contact-hero">
        <div className={styles.heroTop}>
          <div className={styles.heroIdentityBlock}>
            <div className={styles.heroCover} aria-hidden />
            <div className={styles.heroIdentityRow}>
              <div className={styles.heroMain}>
                <span className={styles.heroBrandIcon} aria-hidden>
                  <Icon icon={formData.sexe ? getContactSexeIcon(formData.sexe) : "mdi:account"} width={16} height={16} />
                </span>
                <div className={styles.heroText}>
                  <h1 className={styles.heroTitle}>
                    <StatusDot
                      active={contactStatus.status === "active"}
                      label={contactStatus.label}
                      className={styles.heroTitleStatus}
                    />
                    <span className={styles.heroTitleName}>{displayName}</span>
                    {loadingTags ? (
                      <span className={styles.heroTagsLoading}>{copy.loadingTags}</span>
                    ) : contactTags.length > 0 || canEditContact ? (
                      <span className={styles.heroTitleTags} aria-label={copy.heroMetaAria}>
                        {contactTags.map(tag => (
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
                            {canEditContact ? (
                              <button
                                type="button"
                                className={styles.heroTagRemove}
                                onClick={() => handleRemoveContactTag(tag.id)}
                                aria-label={interpolate(copy.removeTagAria, { label: tag.label })}
                              >
                                <FaTimes />
                              </button>
                            ) : null}
                          </span>
                        ))}
                        {canEditContact ? (
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
                </div>
              </div>
              <div className={styles.heroMeta} aria-label={copy.heroMetaAria}>
                {formData.sexe ? (
                  <span className={`${styles.heroMetaItem} ${styles.heroMetaBlock}`}>
                    <Icon icon={getContactSexeIcon(formData.sexe)} aria-hidden />
                    {getContactSexeLabelLocalized(formData.sexe, locale)}
                  </span>
                ) : null}
                {formData.poste ? (
                  <span className={`${styles.heroMetaItem} ${styles.heroMetaBlock}`}>
                    <Icon icon="mdi:briefcase-outline" aria-hidden />
                    {formData.poste}
                  </span>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className={`${styles.pageBody} ${styles.pageBodyFill}`.trim()}>
        <div className={styles.pageGrid}>
          <main className={`${styles.mainColumn} ${styles.mainColumnFinder} ${overviewTab === "activity" || overviewTab === "portal" || overviewTab === "share" ? styles.mainColumnActivity : ""} ${overviewTab === "logs" ? styles.mainColumnLogs : ""}`.trim()}>
            <div className={`${finderKit.finderLayout} ${styles.enterpriseFinderLayout}`}>
              <aside className={`${finderKit.finderSidebar} ${styles.enterpriseFinderSidebar}`} aria-label={copy.overviewTabsAria || copy.activityTitle}>
                <nav
                  ref={finderPrimaryTrackRef}
                  className={`${finderKit.finderPrimary} ${finderKit.finderPrimaryAnimated}`}
                  role="tablist"
                  aria-label={copy.overviewTabsAria || copy.activityTitle}
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
                    tabId="activity"
                    iconify="mdi:ticket-confirmation-outline"
                    label={copy.overviewTabActivity}
                    active={overviewTab === "activity"}
                    onClick={() => setOverviewTab("activity")}
                    className={`${finderKit.finderItem} ${overviewTab === "activity" ? finderKit.finderItemActive : ""}`}
                    iconClassName={finderKit.finderItemIcon}
                    labelClassName={finderKit.finderItemLabel}
                    data-guide="contact-activity"
                  />
                  <EnterpriseOverviewTabButton
                    tabId="portal"
                    iconify="mdi:web"
                    label={copy.overviewTabPortal}
                    active={overviewTab === "portal"}
                    onClick={() => setOverviewTab("portal")}
                    className={`${finderKit.finderItem} ${overviewTab === "portal" ? finderKit.finderItemActive : ""}`}
                    iconClassName={finderKit.finderItemIcon}
                    labelClassName={finderKit.finderItemLabel}
                    data-guide="contact-portal"
                  />
                  <EnterpriseOverviewTabButton
                    tabId="vault"
                    iconify="mdi:share-variant-outline"
                    label={copy.overviewTabShare}
                    active={overviewTab === "share"}
                    onClick={() => setOverviewTab("share")}
                    className={`${finderKit.finderItem} ${overviewTab === "share" ? finderKit.finderItemActive : ""}`}
                    iconClassName={finderKit.finderItemIcon}
                    labelClassName={finderKit.finderItemLabel}
                    data-guide="contact-shared-access"
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
                    data-guide="contact-logs"
                  />
                </nav>

                <UiKitScrollFadeShell
                  className={`${finderKit.finderSecondaryShell} ${styles.finderSecondaryShell}${finderSecondaryVisible ? "" : ` ${finderKit.finderSecondaryShellHidden}`}`.trim()}
                  style={finderSecondaryVisible ? undefined : { display: "none" }}
                  deps={[overviewTab, activitySection]}
                >
                  <div
                    className={`${finderKit.finderSecondary} ${styles.finderSecondary}`}
                    aria-hidden={!finderSecondaryVisible}
                  >
                    <div
                      className={`${finderKit.finderSecReveal} ${finderSecondaryVisible && finderSecEnter ? finderKit.finderSecRevealActive : ""}`.trim()}
                    >
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
                            <span className={finderKit.finderSecCount}>{openSupportCount}</span>
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
                            {isCommunity ? <ProFeatureBadge variant="inline" className={styles.proBadgeInline} /> : (
                              <span className={finderKit.finderSecCount}>{openPrestationCount}</span>
                            )}
                          </button>
                        </nav>
                      </div>
                    </div>
                  </div>
                </UiKitScrollFadeShell>
              </aside>

              <div className={`${finderKit.finderContent} ${styles.enterpriseFinderContent}`}>
            <div className={styles.mainCommunityPanels}>
            {activityTabMounted ? (
            <div
              className={styles.overviewTabPanel}
              hidden={overviewTab !== "activity"}
              style={overviewTab === "activity" ? undefined : { display: "none" }}
            >
            <div className={styles.activityLayout} data-guide="contact-activity-panel">
              <div className={styles.activityUnifiedCard} data-guide="contact-activity-sections" data-activity-section={activitySection}>
                {activitySection === "support" ? (
                  <section className={`${styles.activityUnifiedSection} ${styles.activityUnifiedSectionSolo}`} data-activity-section="support">
                    <div className={styles.activityUnifiedBody}>
                      {renderActivityToolbar(
                        supportSearchQuery,
                        setSupportSearchQuery,
                        supportStatusFilter,
                        setSupportStatusFilter
                      )}
                      <div className={styles.activityTableStack}>
                        {filteredSupportTickets.length === 0 ? renderActivityEmpty(
                          "mdi:ticket-outline",
                          supportTickets.length > 0 && (supportSearchQuery.trim() || supportStatusFilter !== "all")
                            ? (copy.emptyActivitySearch || copy.emptySupportTickets)
                            : copy.emptySupportTickets
                        ) : (
                          <div className={styles.dataTableWrapper}>
                            <table className={styles.dataTable}>
                              <thead>
                                <tr>
                                  <th>{copy.table.number}</th>
                                  <th>{copy.table.title}</th>
                                  <th>{copy.table.status}</th>
                                  {!isCommunity && <th>{copy.table.sla}</th>}
                                  <th>{copy.table.updated}</th>
                                </tr>
                              </thead>
                              <tbody>
                                {filteredSupportTickets.map(ticket => {
                                  const status = normalizeTicketStatus(ticket.status);
                                  const sla = getTicketSlaDisplay(ticket, {
                                    clients: allClients.length ? allClients : client ? [client] : [],
                                    now: slaNow
                                  });
                                  return (
                                    <tr
                                      key={ticket.id}
                                      className={styles.dataTableRowClickable}
                                      onClick={() => handleOpenTicket(ticket)}
                                      onAuxClick={e => {
                                        if (e.button === 1) {
                                          e.preventDefault();
                                          handleOpenTicket(ticket, true);
                                        }
                                      }}
                                    >
                                      <td>#{ticket.ticket_number || "-"}</td>
                                      <td className={styles.activityTitleCell}>{ticket.title || "-"}</td>
                                      <td>
                                        <span className={styles.ticketStatusBadge}>
                                          {getTicketStatusLabel(status, locale)}
                                        </span>
                                      </td>
                                      {!isCommunity && <td>{sla.label}</td>}
                                      <td>{formatRelativeFrench(ticket.updated_at || ticket.created_at)}</td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    </div>
                  </section>
                ) : null}

                {activitySection === "prestations" ? (
                  <ProFeatureLock locked={isCommunity} featureLabel={copy.proFeatures.prestations} featureKey="prestations" className={styles.activityUnifiedProLock} badgePosition="none">
                    <section className={`${styles.activityUnifiedSection} ${styles.activityUnifiedSectionSolo}`} data-activity-section="prestations">
                      <div className={styles.activityUnifiedBody}>
                        {renderActivityToolbar(
                          prestationSearchQuery,
                          setPrestationSearchQuery,
                          prestationStatusFilter,
                          setPrestationStatusFilter
                        )}
                        <div className={styles.activityTableStack}>
                          {filteredPrestationTickets.length === 0 ? renderActivityEmpty(
                            "mdi:briefcase-outline",
                            prestationTicketsSource.length > 0 && (prestationSearchQuery.trim() || prestationStatusFilter !== "all")
                              ? (copy.emptyActivitySearch || copy.emptyPrestationTickets)
                              : copy.emptyPrestationTickets
                          ) : (
                            <div className={styles.dataTableWrapper}>
                              <table className={styles.dataTable}>
                                <thead>
                                  <tr>
                                    <th>{copy.table.number}</th>
                                    <th>{copy.table.type}</th>
                                    <th>{copy.table.status}</th>
                                    <th>{copy.table.created}</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {filteredPrestationTickets.map(ticket => {
                                    const status = normalizeTicketStatus(ticket.status);
                                    return (
                                      <tr
                                        key={ticket.id}
                                        className={isCommunity ? undefined : styles.dataTableRowClickable}
                                        onClick={isCommunity ? undefined : () => handleOpenTicket(ticket)}
                                        onAuxClick={isCommunity ? undefined : e => {
                                          if (e.button === 1) {
                                            e.preventDefault();
                                            handleOpenTicket(ticket, true);
                                          }
                                        }}
                                      >
                                        <td>#{ticket.ticket_number || "-"}</td>
                                        <td className={styles.activityTitleCell}>
                                          {getPrestationCategoryLabel(ticket.category, locale)}
                                        </td>
                                        <td>
                                          <span className={styles.ticketStatusBadge}>
                                            {getTicketStatusLabel(status, locale)}
                                          </span>
                                        </td>
                                        <td>{formatTableDate(ticket.created_at)}</td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      </div>
                    </section>
                  </ProFeatureLock>
                ) : null}
              </div>
            </div>
            </div>
            ) : null}

            {portalTabMounted ? (
            <div
              className={styles.overviewTabPanel}
              hidden={overviewTab !== "portal"}
              style={overviewTab === "portal" ? undefined : { display: "none" }}
            >
            <div className={styles.activityLayout} data-guide="contact-portal-panel">
              <div className={styles.activityUnifiedCard}>
                <section className={`${styles.activityUnifiedSection} ${styles.activityUnifiedSectionSolo}`}>
                  <div className={`${styles.activityUnifiedBody} ${contactStyles.portalTabContent}`}>
                    <ContactPortalSection contact={contact} canManage={canManagePortal} onUpdated={() => {
                      const controller = createTrackedAbortController();
                      loadControllerRef.current?.abort();
                      loadControllerRef.current = controller;
                      loadContactData(controller.signal);
                    }} />
                  </div>
                </section>
              </div>
            </div>
            </div>
            ) : null}

            {shareTabMounted ? (
            <div
              className={styles.overviewTabPanel}
              hidden={overviewTab !== "share"}
              style={overviewTab === "share" ? undefined : { display: "none" }}
            >
            <div className={styles.activityLayout} data-guide="contact-share-panel">
              <div className={styles.activityUnifiedCard}>
                <section className={`${styles.activityUnifiedSection} ${styles.activityUnifiedSectionSolo}`}>
                  <div className={styles.activityUnifiedBody}>
                    {contact?.id && canAccessSharing && (vaultClientId || contact?.client_id || contactCompanies.length > 0) ? (
                      <div
                        className={`${equipStyles.hardwarePageEmbedded} ${equipStyles.embeddedFilterBar} ${equipStyles.embeddedFilterBarToolbar} ${styles.activityToolbar}`}
                      >
                        <div className={equipStyles.embeddedSearchWrap}>
                          <div className={equipStyles.embeddedSearchBox}>
                            <Icon icon="mdi:magnify" className={equipStyles.embeddedSearchIcon} aria-hidden />
                            <input
                              type="text"
                              className={equipStyles.embeddedSearchInput}
                              value={shareSearchQuery}
                              onChange={event => setShareSearchQuery(event.target.value)}
                              placeholder={copy.activitySearchPlaceholder || "Rechercher"}
                              aria-label={copy.shareSearchAria || copy.activitySearchPlaceholder || "Rechercher"}
                            />
                            {shareSearchQuery ? (
                              <button
                                type="button"
                                className={equipStyles.embeddedSearchClear}
                                onClick={() => setShareSearchQuery("")}
                                aria-label={copy.activityClearSearchAria || "Effacer la recherche"}
                              >
                                <FaTimes aria-hidden />
                              </button>
                            ) : null}
                          </div>
                          <div className={`${equipStyles.embeddedSearchActions} ${styles.activityToolbarActions}`}>
                            <ActivityStatusSegmented
                              value={shareListFilter}
                              onChange={setShareListFilter}
                              options={[
                                { id: "ongoing", label: copy.shareFilterOngoing || "En cours" },
                                { id: "archived", label: copy.shareFilterArchived || "Archivé" }
                              ]}
                              ariaLabel={copy.shareFilterStatusAria || "Filtrer les partages"}
                            />
                            {contactCompanies.length > 1 ? (
                              <label className={contactStyles.vaultClientFieldCompact}>
                                <span className={contactStyles.srOnly}>{copy.vaultClientLabel || copy.selectCompany}</span>
                                <select
                                  className={contactStyles.vaultClientSelect}
                                  value={vaultClientId || ""}
                                  onChange={e => setVaultClientId(e.target.value || null)}
                                  aria-label={copy.vaultClientLabel || copy.selectCompany}
                                >
                                  {contactCompanies.map(company => (
                                    <option key={company.id} value={company.id}>
                                      {company.name}
                                    </option>
                                  ))}
                                </select>
                              </label>
                            ) : null}
                            <button
                              type="button"
                              className={`${finderKit.btnSquare} ${finderKit.btnSquarePrimary} ${styles.addEquipmentButton}`}
                              onClick={() => setShareAccessCreateOpen(true)}
                              aria-label={copy.shareAccess}
                              disabled={isCommunity || shareListFilter === "archived"}
                            >
                              <FaPlus />
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : null}
                    <div className={styles.activityTableStack}>
                      {contact?.id && (vaultClientId || contact?.client_id || contactCompanies.length > 0) ? (
                        <ProFeatureLock
                          locked={isCommunity}
                          featureLabel={copy.sharedAccessTitle}
                          featureKey="sharedAccess"
                          className={styles.activityUnifiedProLock}
                          badgePosition="none"
                        >
                          <VaultSecretsPanel
                            contactId={contact.id}
                            clientId={vaultClientId || contact.client_id || contactCompanies[0]?.id}
                            contactName={formatContactName(contact, copy.defaultName)}
                            createModalOpen={shareAccessCreateOpen}
                            onCreateModalChange={setShareAccessCreateOpen}
                            searchQuery={shareSearchQuery}
                            listFilter={shareListFilter}
                          />
                        </ProFeatureLock>
                      ) : (
                        <p className={contactStyles.coordEmpty}>{copy.shareNeedsCompany || copy.coordEmpty}</p>
                      )}
                    </div>
                  </div>
                </section>
              </div>
            </div>
            </div>
            ) : null}

            {logsTabMounted ? (
            <div
              className={styles.overviewTabPanel}
              hidden={overviewTab !== "logs"}
              style={overviewTab === "logs" ? undefined : { display: "none" }}
              data-guide="contact-logs-panel"
            >
              {contact?.id ? (
                <ActivityJournalPanel
                  entityId={contact.id}
                  embedded
                  active={overviewTab === "logs"}
                  fetchLogs={(page, options) =>
                    fetchContactLogs(contact.id, {
                      page,
                      limit: options?.limit || 25,
                      signal: options?.signal,
                      sortBy: options?.sortBy,
                      sortDir: options?.sortDir
                    })
                  }
                  purgeLogs={() => purgeContactLogs(contact.id)}
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
                data-guide="contact-quick-actions"
                aria-label={copy.quickActions?.title || "Actions rapides"}
              >
                <div className={styles.sidebarActionToolbar}>
                  {canEditContact ? (
                    <EnterpriseQuickActionButton
                      actionId="edit"
                      iconify="mdi:square-edit-outline"
                      className={styles.sidebarActionIconBtn}
                      onClick={handleOpenEditModal}
                      aria-label={copy.quickActions?.editContact || copy.editContact}
                    />
                  ) : null}
                  {canCreateTicket ? (
                    <EnterpriseQuickActionButton
                      actionId="ticket"
                      iconify="mdi:ticket-outline"
                      className={styles.sidebarActionIconBtn}
                      onClick={handleQuickCreateTicket}
                      aria-label={copy.quickActions?.createTicket || "Créer un ticket"}
                    />
                  ) : null}
                  <EnterpriseQuickActionButton
                    actionId="copy"
                    iconify="mdi:content-copy"
                    className={styles.sidebarActionIconBtn}
                    onClick={handleCopyContact}
                    aria-label={copy.quickActions?.copyCard || copy.copyCard}
                  />
                  <EnterpriseQuickActionButton
                    actionId="share"
                    iconify="mdi:share-variant"
                    className={styles.sidebarActionIconBtn}
                    onClick={handleShareContact}
                    aria-label={copy.quickActions?.shareCard || copy.shareCard}
                  />
                  <EnterpriseQuickActionButton
                    actionId="subscribe"
                    iconify={contactSubscribed ? "mdi:bell-ring-outline" : "mdi:bell-outline"}
                    className={`${styles.sidebarActionIconBtn} ${contactSubscribed ? styles.sidebarActionIconBtnActive : ""}`}
                    onClick={toggleContactSubscribe}
                    disabled={!contact?.id || contactSubscribeLoading || contactSubscribeSaving}
                    aria-pressed={contactSubscribed}
                    aria-label={
                      contactSubscribed
                        ? copy.subscribe?.unsubscribe || "Se désabonner"
                        : copy.subscribe?.subscribe || "S’abonner aux notifications"
                    }
                  />
                  {canDeleteContact ? (
                    <EnterpriseQuickActionButton
                      actionId="delete"
                      iconify="mdi:trash-can-outline"
                      className={styles.sidebarActionIconBtn}
                      onClick={openDeleteContactModal}
                      disabled={deletingContact}
                      aria-label={deletingContact ? copy.deleting : copy.quickActions?.deleteContact || copy.deleteContact}
                    />
                  ) : null}
                </div>
              </section>

              <section className={`${styles.sidebarSection} ${contactStyles.sidebarCommSection}`} data-guide="contact-sidebar-companies">
                <SidebarSectionHeader
                  title={copy.companies || copy.share.lines.enterprise}
                  count={contactCompanies.length > 0 ? contactCompanies.length : null}
                  expanded={companiesSectionExpanded}
                  onToggle={() => setCompaniesSectionExpanded(prev => !prev)}
                  controlsId="contact-sidebar-companies"
                  panelStyles={styles}
                  actions={canEditContact ? 
                      <button type="button" className={styles.editInfoButton} onClick={e => {
                  e.stopPropagation();
                  openCompanyModal();
                }} disabled={membershipBusy} aria-label={copy.addCompany}>
                        <FaPlus />
                      </button>
                     : null}
                />
                {companiesSectionExpanded ? <div className={`${styles.sidebarBody} ${contactStyles.sidebarCommBodyWrap}`} id="contact-sidebar-companies">
                  {contactCompanies.length === 0 ? <span className={styles.sidebarSummaryValueEmpty}>-</span> : <ul className={styles.sidebarContactsList}>
                      {contactCompanies.map(company => (
                        <li
                          key={company.id}
                          className={styles.sidebarContactItem}
                          onClick={() => openEnterprise({
                            id: company.id,
                            name: company.name
                          })}
                        >
                          <div className={styles.sidebarContactAvatar} aria-hidden>
                            <Icon icon="mdi:domain" />
                          </div>
                          <div className={styles.sidebarContactBody}>
                            <div className={styles.sidebarContactTop}>
                              <div className={styles.sidebarContactIdentity}>
                                <span className={styles.sidebarContactName}>{company.name}</span>
                                {company.is_primary ? <span className={styles.sitePreviewPrimary}>{copy.primaryBadge}</span> : null}
                              </div>
                              {canEditContact ? <div className={styles.sidebarContactActions}>
                                  <button type="button" className={styles.sidebarCopyButton} disabled={membershipBusy} aria-label={interpolate(copy.removeCompanyAria || "{name}", {
                            name: company.name
                          })} onClick={e => {
                            e.stopPropagation();
                            handleRemoveCompanyMembership(company.id);
                          }}>
                                    <FaTimes />
                                  </button>
                                </div> : null}
                            </div>
                            {(() => {
                              const listed = allClients.find(c => String(c.id) === String(company.id));
                              const availableSites = normalizeClientSites(listed?.sites);
                              const siteById = new Map(availableSites.map(site => [String(site.id), site]));
                              const linkedIds = [...new Set((company.site_ids || []).map(id => String(id || "").trim()).filter(Boolean))];
                              if (linkedIds.length === 0) return null;
                              const primaryIds = new Set((company.sites || []).filter(site => site?.is_primary).map(site => String(site.site_id || site.id || "").trim()).filter(Boolean));
                              return <div className={styles.sidebarContactSites}>
                                  {linkedIds.map(siteId => {
                                const site = siteById.get(siteId);
                                const label = site ? getSiteDisplayName(site) : siteId;
                                return <span key={siteId} className={styles.sidebarContactSiteChip}>
                                      <Icon icon="mdi:map-marker-outline" aria-hidden />
                                      <span>{label}</span>
                                      {primaryIds.has(siteId) ? <span className={styles.sitePreviewPrimary}>{copy.sitePrimaryBadge}</span> : null}
                                    </span>;
                              })}
                                </div>;
                            })()}
                          </div>
                        </li>
                      ))}
                    </ul>}
                </div> : null}
              </section>

              <section className={`${styles.sidebarSection} ${contactStyles.sidebarCommSection}`} data-guide="contact-sidebar-emails">
                <SidebarSectionHeader
                  title={copy.sectionEmails}
                  count={emailCommunications.length > 0 ? emailCommunications.length : null}
                  expanded={emailSectionExpanded}
                  onToggle={() => setEmailSectionExpanded(prev => !prev)}
                  controlsId="contact-sidebar-emails"
                  panelStyles={styles}
                  actions={canEditContact ? 
                      <button type="button" className={styles.editInfoButton} onClick={e => {
                  e.stopPropagation();
                  handleOpenAddCommunication("email");
                }} aria-label={copy.addEmail}>
                        <FaPlus />
                      </button>
                     : null}
                />
                {emailSectionExpanded ? <div className={`${styles.sidebarBody} ${contactStyles.sidebarCommBodyWrap}`} id="contact-sidebar-emails">
                    {emailCommunications.length === 0 ? <span className={styles.sidebarSummaryValueEmpty}>{copy.noEmails}</span> : <ul className={contactStyles.sidebarCommList}>
                        {emailCommunications.map(entry => {
                    const href = toMailtoHref(entry.value);
                    return <li key={entry.id} className={contactStyles.sidebarCommItem}>
                            <span className={contactStyles.sidebarCommBody}>
                              {href ? <a href={href} className={contactStyles.coordValueLink} onClick={e => e.stopPropagation()}>
                                  {entry.value}
                                </a> : <span className={contactStyles.coordValue}>{entry.value}</span>}
                              {entry.isPrimary ? <Icon icon="mdi:star" className={contactStyles.coordFavoriteStar} aria-label={copy.coordFavorite} /> : null}
                            </span>
                            
                              <button type="button" className={styles.sidebarCopyButton} onClick={e => {
                          e.stopPropagation();
                          copyCoordValue(entry.value, copy.sectionEmails);
                        }} aria-label={interpolate(copy.copyCoord, {
                          label: copy.sectionEmails.toLowerCase()
                        })}>
                                <Icon icon="mdi:content-copy" aria-hidden />
                              </button>
                            
                          </li>;
                  })}
                      </ul>}
                  </div> : null}
              </section>

              <section className={`${styles.sidebarSection} ${contactStyles.sidebarCommSection}`} data-guide="contact-sidebar-phones">
                <SidebarSectionHeader
                  title={copy.sectionPhones}
                  count={phoneCommunications.length > 0 ? phoneCommunications.length : null}
                  expanded={phoneSectionExpanded}
                  onToggle={() => setPhoneSectionExpanded(prev => !prev)}
                  controlsId="contact-sidebar-phones"
                  panelStyles={styles}
                  actions={canEditContact ? 
                      <button type="button" className={styles.editInfoButton} onClick={e => {
                  e.stopPropagation();
                  handleOpenAddCommunication("telephone");
                }} aria-label={copy.addPhone}>
                        <FaPlus />
                      </button>
                     : null}
                />
                {phoneSectionExpanded ? <div className={`${styles.sidebarBody} ${contactStyles.sidebarCommBodyWrap}`} id="contact-sidebar-phones">
                    {phoneCommunications.length === 0 ? <span className={styles.sidebarSummaryValueEmpty}>{copy.noPhones}</span> : <ul className={contactStyles.sidebarCommList}>
                        {phoneCommunications.map(entry => {
                    const href = toTelHref(entry.value);
                    return <li key={entry.id} className={contactStyles.sidebarCommItem}>
                            <span className={contactStyles.sidebarCommBody}>
                              {href ? <a href={href} className={contactStyles.coordValueLink} onClick={e => e.stopPropagation()}>
                                  {entry.value}
                                </a> : <span className={contactStyles.coordValue}>{entry.value}</span>}
                              {entry.isPrimary ? <Icon icon="mdi:star" className={contactStyles.coordFavoriteStar} aria-label={copy.coordFavorite} /> : null}
                            </span>
                            
                              <button type="button" className={styles.sidebarCopyButton} onClick={e => {
                          e.stopPropagation();
                          copyCoordValue(entry.value, copy.sectionPhones);
                        }} aria-label={interpolate(copy.copyCoord, {
                          label: copy.sectionPhones.toLowerCase()
                        })}>
                                <Icon icon="mdi:content-copy" aria-hidden />
                              </button>
                            
                          </li>;
                  })}
                      </ul>}
                  </div> : null}
              </section>
            </div>
          </aside>
        </div>
      </div>

      <ContactFormModal open={contactModalOpen} initialContact={contact} clients={allClients} initialSection={contactModalOptions.initialSection} seedCommunicationType={contactModalOptions.seedCommunicationType} onClose={handleContactModalClose} onSuccess={handleContactModalSuccess} />

      <ContactCompanyModal open={companyModalOpen} contactName={displayName} companies={availableCompaniesToAdd} loading={clientsLoading} saving={membershipBusy} onClose={closeCompanyModal} onSelect={handleAddCompanyMembership} />

      <ContactDeleteModal open={deleteContactModalOpen} contactName={displayName} saving={deletingContact} onClose={closeDeleteContactModal} onConfirm={confirmDeleteContact} />

      <ClientTagModal open={tagModalOpen} entityName={displayName} assignedTags={contactTags} saving={addingTag} onClose={() => {
      if (addingTag) return;
      setTagModalOpen(false);
    }} onSubmit={handleAddContactTag} />

      <ProFeaturePromoModal open={Boolean(proPromoFeature)} featureKey={proPromoFeature} onClose={() => setProPromoFeature(null)} />

      <PageGuideTour open={pageGuideOpen} steps={contactGuideSteps} title={copy.guideTitle} onClose={() => setPageGuideOpen(false)} />
    </div>;
}
