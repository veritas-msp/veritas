import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useParams } from "react-router-dom";
import { Icon } from "@iconify/react";
import { toast } from "react-toastify";
import { fetchClientsList, addContactTag, removeContactTag, deleteContact, addContactMembership, removeContactMembership } from "../../api/clients";
import { fetchTickets } from "../../api/tickets";
import styles from "../EnterprisesPage/EnterpriseDetailPage.module.css";
import pageLayout from "../EnterprisesPage/EnterprisesPage.module.css";
import contactStyles from "./ContactDetailPage.module.css";
import SmartTooltip from "../SmartTooltip";
import StatusDot from "../shared/StatusDot/StatusDot";
import SubscribeBellButton from "../shared/SubscribeBellButton/SubscribeBellButton";
import ClientTicketBookmarks from "./ClientTicketBookmarks";
import { getContactSexeIcon, normalizeContactSexe } from "../../utils/contactSexe";
import { FaTimes, FaPlus } from "react-icons/fa";
import API_BASE_URL from "../../config";
import ContactPortalSection from "./ContactPortalSection";
import VaultSecretsPanel from "../EnterprisesPage/VaultSecretsPanel";
import ContactFormModal from "./ContactFormModal";
import ContactCompanyModal from "./ContactCompanyModal";
import ContactDeleteModal from "./ContactDeleteModal";
import ClientTagModal from "../EnterprisesPage/ClientTagModal";
import { formatTableDate } from "../../utils/tableDateFormat";
import { getTicketSlaDisplay } from "../../utils/ticketSlaUtils";
import { formatRelativeFrench } from "../EquipementPage/checkmkMonitoringUtils";
import { useVeritasEdition } from "../../hooks/useVeritasEdition";
import { usePermissions } from "../../contexts/PermissionsContext";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { getContactDetailCopy, getContactStatusLocalized, getPrestationCategoryLabel as getPrestationCategoryLabelI18n, getTicketStatusLabels, interpolate } from "./contactDetailI18n";
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
import { createTrackedAbortController } from "../../utils/pageLoadAbort";
import { getSiteDisplayName, normalizeClientSites } from "../../utils/clientSites";
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
const sortTicketsByRecent = (a, b) => {
  const aTime = new Date(a?.updated_at || a?.created_at || 0).getTime();
  const bTime = new Date(b?.updated_at || b?.created_at || 0).getTime();
  return bTime - aTime;
};
export default function ContactDetailPage({
  onNavigate,
  contactData
}) {
  const {
    contactId: urlContactId
  } = useParams();
  const locale = useAppLocale();
  const copy = useMemo(() => getContactDetailCopy(locale), [locale]);
  const ticketStatusLabels = useMemo(() => getTicketStatusLabels(locale), [locale]);
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
  const [contact, setContact] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [client, setClient] = useState(null);
  const [allClients, setAllClients] = useState([]);
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [contactModalOptions, setContactModalOptions] = useState({
    initialSection: null,
    seedCommunicationType: null
  });
  const [emailSectionExpanded, setEmailSectionExpanded] = useState(false);
  const [phoneSectionExpanded, setPhoneSectionExpanded] = useState(false);
  const [companiesSectionExpanded, setCompaniesSectionExpanded] = useState(false);
  const [contactActionsMenuOpen, setContactActionsMenuOpen] = useState(false);
  const [deleteContactModalOpen, setDeleteContactModalOpen] = useState(false);
  const [deletingContact, setDeletingContact] = useState(false);
  const [proPromoFeature, setProPromoFeature] = useState(null);
  const [pageGuideOpen, setPageGuideOpen] = useState(false);
  const openPageGuide = useCallback(() => setPageGuideOpen(true), []);
  useRegisterPageGuide(openPageGuide);
  const loadControllerRef = useRef(null);
  const clientsListControllerRef = useRef(null);
  const contactActionsMenuRef = useRef(null);
  const isMountedRef = useRef(true);
  const loadRequestIdRef = useRef(0);
  const [formData, setFormData] = useState({
    nom: "",
    prenom: "",
    sexe: "",
    email: "",
    telephone: "",
    poste: "",
    statut: "actif",
    client_id: null
  });
  const [contactTags, setContactTags] = useState([]);
  const [loadingTags, setLoadingTags] = useState(false);
  const [tagModalOpen, setTagModalOpen] = useState(false);
  const [shareAccessCreateOpen, setShareAccessCreateOpen] = useState(false);
  const [overviewTab, setOverviewTab] = useState("activity");
  const [vaultClientId, setVaultClientId] = useState(null);
  const [companyModalOpen, setCompanyModalOpen] = useState(false);
  const [membershipBusy, setMembershipBusy] = useState(false);
  const [clientsLoading, setClientsLoading] = useState(false);
  const [addingTag, setAddingTag] = useState(false);
  const [supportTickets, setSupportTickets] = useState([]);
  const [prestationTickets, setPrestationTickets] = useState([]);
  const [loadingActivity, setLoadingActivity] = useState(false);
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
  const openContactTickets = useMemo(() => supportTickets.filter(isOpenTicket).sort(sortTicketsByRecent), [supportTickets]);
  const closedContactTickets = useMemo(
    () => supportTickets.filter(ticket => !isOpenTicket(ticket)).sort(sortTicketsByRecent).slice(0, 12),
    [supportTickets]
  );
  const [slaNow, setSlaNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setSlaNow(Date.now()), 60000);
    return () => window.clearInterval(timer);
  }, []);
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
    const handleVisibilityChange = () => {
      const contactIdToUse = contactData?.contactId || contactData?.id || urlContactId;
      if (document.visibilityState === "visible" && contactIdToUse) {
        const controller = createTrackedAbortController();
        loadControllerRef.current?.abort();
        loadControllerRef.current = controller;
        loadContactData(controller.signal);
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [urlContactId, contactData?.contactId, contactData?.id]);
  useEffect(() => {
    if (!contact?.client_id || allClients.length === 0) return;
    const fullClient = allClients.find(item => item.id === contact.client_id);
    if (fullClient) setClient(fullClient);
  }, [contact?.client_id, allClients]);
  useEffect(() => {
    if (!contact?.client_id) return;
    ensureClientsLoaded();
  }, [contact?.client_id]);
  useEffect(() => {
    if (!contactActionsMenuOpen) return undefined;
    const handleClickOutside = event => {
      if (contactActionsMenuRef.current && !contactActionsMenuRef.current.contains(event.target)) {
        setContactActionsMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [contactActionsMenuOpen]);
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
        if (prev.some(t => t.id === tag.id)) return prev;
        return [...prev, tag].sort((a, b) => a.label.localeCompare(b.label));
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
      setContactTags(prev => prev.filter(t => t.id !== tagId));
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
  const loadContactData = async signal => {
    const requestId = ++loadRequestIdRef.current;
    const isCurrentRequest = () => loadRequestIdRef.current === requestId && loadControllerRef.current?.signal === signal;
    setLoading(true);
    setError(null);
    setLoadingTags(true);
    try {
      const contactIdToUse = contactData?.contactId || contactData?.id || urlContactId;
      if (!contactIdToUse) {
        setLoading(false);
        return;
      }
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
      setContact(fetchedContact);
      setContactTags(Array.isArray(fetchedContact.tags) ? fetchedContact.tags : []);
      if (window.updateTabTitle && fetchedContact.nom) {
        window.updateTabTitle("ContactDetail", {
          contactId: contactIdToUse,
          nom: fetchedContact.nom,
          prenom: fetchedContact.prenom
        });
      }
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
      setFormData(newFormData);
      const associatedClient = fetchedContact.client_name || fetchedContact.client_id ? {
        id: fetchedContact.client_id || null,
        name: fetchedContact.client_name || `Client #${fetchedContact.client_id}`
      } : null;
      setClient(associatedClient);
      activityControllerRef.current?.abort();
      const activityController = createTrackedAbortController();
      activityControllerRef.current = activityController;
      loadContactActivity(fetchedContact.id, fetchedContact.client_id, activityController.signal);
    } catch (err) {
      if (err?.name === "AbortError") return;
      setError(err.message || copy.loadError);
      console.error("Error chargement contact:", err);
    } finally {
      if (isCurrentRequest() && isMountedRef.current) {
        setLoading(false);
        setLoadingTags(false);
      }
    }
  };
  const loadContactActivity = async (contactId, clientId, signal) => {
    setLoadingActivity(true);
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
      setPrestationTickets(isCommunity ? [] : tickets.filter(isPrestationTicket));
      setSupportTickets(supportOnly);
    } catch (err) {
      if (err?.name === "AbortError") return;
      console.error("Error loading contact activity:", err);
      if (isMountedRef.current) {
        setSupportTickets([]);
        setPrestationTickets([]);
      }
    } finally {
      if (isMountedRef.current) setLoadingActivity(false);
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
    setContactActionsMenuOpen(false);
    const ok = await ensureClientsLoaded();
    if (!ok) return;
    setContactModalOptions({
      initialSection: options.initialSection || null,
      seedCommunicationType: options.seedCommunicationType || null
    });
    setContactModalOpen(true);
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
      setContact(prev => ({
        ...(prev || {}),
        ...updated,
        tags: Array.isArray(updated.tags) ? updated.tags : prev?.tags || [],
        portal_email: prev?.portal_user_id ? updated.email || prev.portal_email : prev?.portal_email
      }));
      setFormData({
        nom: updated.nom || "",
        prenom: updated.prenom || "",
        sexe: normalizeContactSexe(updated.sexe) || "",
        email: updated.email || "",
        telephone: updated.telephone || "",
        poste: updated.poste || "",
        statut: updated.statut || "actif",
        client_id: updated.client_id ?? null
      });
      if (updated.client_name || updated.client_id || Array.isArray(updated.clients) && updated.clients.length > 0) {
        const primary = Array.isArray(updated.clients) ? updated.clients.find(c => c.is_primary) || updated.clients[0] : null;
        setClient({
          id: updated.client_id ?? primary?.id ?? primary?.client_id ?? null,
          name: updated.client_name || primary?.name || (updated.client_id ? `Client #${updated.client_id}` : "")
        });
      }
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
    setContact(prev => ({
      ...(prev || {}),
      ...updatedContact,
      tags: Array.isArray(updatedContact.tags) ? updatedContact.tags : prev?.tags || []
    }));
    if (updatedContact.client_id || Array.isArray(updatedContact.clients)) {
      const primary = Array.isArray(updatedContact.clients) ? updatedContact.clients.find(c => c.is_primary) || updatedContact.clients[0] : null;
      setClient({
        id: updatedContact.client_id ?? primary?.id ?? primary?.client_id ?? null,
        name: updatedContact.client_name || primary?.name || (updatedContact.client_id ? `Client #${updatedContact.client_id}` : "")
      });
      setFormData(prev => ({
        ...prev,
        client_id: updatedContact.client_id ?? prev.client_id
      }));
    }
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
    setContactActionsMenuOpen(false);
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
      await deleteContact(contact.id);
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
  if (loading) {
    return <div className={`${styles.contratDetailPage} ${styles.enterpriseDetailPage} ${contactStyles.contactDetailPage} msp-page-grid`}>
        <div className={styles.loading}>
          <Icon icon="mdi:loading" className={styles.spinning} />
          <span>{copy.loading}</span>
        </div>
      </div>;
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
  return <div className={`${styles.contratDetailPage} ${styles.enterpriseDetailPage} ${contactStyles.contactDetailPage} msp-page-grid`}>
      <header className={styles.pageHero} data-guide="contact-hero">
        <div className={styles.heroRow}>
          <div className={styles.heroMain}>
            <div className={styles.heroText}>
              <h1 className={styles.heroTitle}>
                <StatusDot active={contactStatus.status === "active"} label={contactStatus.label} className={styles.heroTitleStatus} />
                <span className={styles.heroTitleName}>{displayName}</span>
              </h1>
              <div className={styles.heroMeta} aria-label={copy.heroMetaAria}>
                {formData.sexe && <span className={styles.heroMetaItem}>
                    <Icon icon={getContactSexeIcon(formData.sexe)} aria-hidden />
                    {getContactSexeLabelLocalized(formData.sexe, locale)}
                  </span>}
                {formData.poste && <span className={styles.heroMetaItem}>
                    <Icon icon="mdi:briefcase-outline" aria-hidden />
                    {formData.poste}
                  </span>}
                {loadingTags ? <span className={styles.heroTagsLoading}>{copy.loadingTags}</span> : <>
                    {contactTags.map(tag => <span key={tag.id} className={styles.heroTagChip} style={{
                  backgroundColor: `${tag.color || "#2b5fab"}18`,
                  borderColor: `${tag.color || "#2b5fab"}55`,
                  color: tag.color || "#2b5fab"
                }}>
                        {tag.label}
                        <button type="button" className={styles.heroTagRemove} onClick={() => handleRemoveContactTag(tag.id)} aria-label={interpolate(copy.removeTagAria, {
                    label: tag.label
                  })}>
                          <FaTimes />
                        </button>
                      </span>)}
                    <div className={styles.heroTagAddWrap}>
                      {canEditContact ? <SmartTooltip content={copy.addTag}>
                        <button type="button" className={styles.heroTagAddTrigger} onClick={() => setTagModalOpen(true)} aria-label={copy.addTag}>
                          <FaPlus />
                        </button>
                      </SmartTooltip> : null}
                    </div>
                  </>}
              </div>
            </div>
          </div>

          <div className={styles.heroActions} ref={contactActionsMenuRef} data-guide="contact-hero-actions">
            <SubscribeBellButton
              entityType="contact"
              entityId={contact?.id || formData?.id}
              subscribeLabel={copy.subscribe?.subscribe || "S’abonner aux notifications"}
              unsubscribeLabel={copy.subscribe?.unsubscribe || "Se désabonner"}
              subscribedToast={copy.subscribe?.subscribedToast || "Abonnement activé"}
              unsubscribedToast={copy.subscribe?.unsubscribedToast || "Abonnement retiré"}
            />
            <SmartTooltip content={copy.actionsMenu}>
              <button type="button" className={styles.heroMenuBtn} onClick={() => setContactActionsMenuOpen(open => !open)} aria-expanded={contactActionsMenuOpen} aria-haspopup="menu" aria-label={copy.actionsMenu}>
                <Icon icon="mdi:dots-horizontal" aria-hidden />
              </button>
            </SmartTooltip>
            {contactActionsMenuOpen && <div className={styles.heroClientMenu} role="menu">
                {canEditContact ? <button type="button" className={styles.heroMenuItem} role="menuitem" onClick={handleOpenEditModal}>
                  <Icon icon="mdi:pencil-outline" aria-hidden />
                  <span>{copy.editContact}</span>
                </button> : null}
                <button type="button" className={styles.heroMenuItem} role="menuitem" onClick={() => {
              setContactActionsMenuOpen(false);
              handleCopyContact();
            }}>
                  <Icon icon="mdi:content-copy" aria-hidden />
                  <span>{copy.copyCard}</span>
                </button>
                <button type="button" className={styles.heroMenuItem} role="menuitem" onClick={() => {
              setContactActionsMenuOpen(false);
              handleShareContact();
            }}>
                  <Icon icon="mdi:share-variant" aria-hidden />
                  <span>{copy.shareCard}</span>
                </button>
                {contactCompanies.length > 0 && <>
                    <div className={styles.heroMenuDivider} role="separator" />
                    {contactCompanies.map(company => <button key={company.id} type="button" className={styles.heroMenuItem} role="menuitem" onClick={() => {
                setContactActionsMenuOpen(false);
                openEnterprise({
                  id: company.id,
                  name: company.name
                });
              }}>
                        <Icon icon="mdi:domain" aria-hidden />
                        <span>{company.name || copy.viewEnterprise}</span>
                      </button>)}
                  </>}
                {canDeleteContact ? <>
                <div className={styles.heroMenuDivider} role="separator" />
                <button type="button" className={`${styles.heroMenuItem} ${styles.heroMenuItemDanger}`} role="menuitem" onClick={openDeleteContactModal} disabled={deletingContact}>
                  <Icon icon="mdi:trash-can-outline" aria-hidden />
                  <span>{deletingContact ? copy.deleting : copy.deleteContact}</span>
                </button>
                </> : null}
              </div>}
          </div>
        </div>
        <div className={`${styles.pageHeroBookmarks}`} data-guide="contact-ticket-bookmarks">
        <ClientTicketBookmarks openTickets={openContactTickets} closedTickets={closedContactTickets} loading={loadingActivity} statusLabels={ticketStatusLabels} onTicketClick={handleOpenTicket} clients={allClients} inPageHero />
        </div>
      </header>

      <div className={styles.pageBody}>
        <div className={styles.pageGrid}>
          <main className={styles.mainColumn}>
            <div className={styles.overviewTabsWrap}>
              <nav className={styles.overviewTabBar} role="tablist" aria-label={copy.overviewTabsAria || copy.activityTitle}>
                <button type="button" role="tab" aria-selected={overviewTab === "activity"} className={`${styles.overviewTab} ${overviewTab === "activity" ? styles.overviewTabActive : ""}`} onClick={() => setOverviewTab("activity")} data-guide="contact-activity">
                  {copy.overviewTabActivity}
                </button>
                <button type="button" role="tab" aria-selected={overviewTab === "portal"} className={`${styles.overviewTab} ${overviewTab === "portal" ? styles.overviewTabActive : ""}`} onClick={() => setOverviewTab("portal")} data-guide="contact-portal">
                  {copy.overviewTabPortal}
                </button>
                <button type="button" role="tab" aria-selected={overviewTab === "share"} className={`${styles.overviewTab} ${overviewTab === "share" ? styles.overviewTabActive : ""}`} onClick={() => setOverviewTab("share")} data-guide="contact-shared-access">
                  <span className={styles.overviewTabLabelRow}>
                    <span>{copy.overviewTabShare}</span>
                    {isCommunity ? <ProFeatureBadge variant="inline" className={styles.proBadgeInline} /> : null}
                  </span>
                </button>
              </nav>
            </div>

            {overviewTab === "activity" ? <div className={styles.activityLayout} data-guide="contact-activity-panel">
                    <div className={styles.activityKpiRow}>
                      <div className={styles.activityKpiCard}>
                        <span className={styles.activityKpiValue}>{supportTickets.length}</span>
                        <span className={styles.activityKpiLabel}>{copy.kpiSupportTotal}</span>
                      </div>
                      <div className={styles.activityKpiCard}>
                        <span className={styles.activityKpiValue}>{openSupportCount}</span>
                        <span className={styles.activityKpiLabel}>{copy.kpiSupportOpen}</span>
                      </div>
                      <ProFeatureLock locked={isCommunity} featureLabel={copy.proFeatures.prestations} featureKey="prestations" className={styles.activityKpiProLock}>
                        <div className={styles.activityKpiCard}>
                          <span className={styles.activityKpiValue}>{(isCommunity ? DEMO_PRESTATION_TICKETS : prestationTickets).length}</span>
                          <span className={styles.activityKpiLabel}>{copy.kpiPrestationTotal}</span>
                        </div>
                      </ProFeatureLock>
                      <ProFeatureLock locked={isCommunity} featureLabel={copy.proFeatures.prestations} featureKey="prestations" className={styles.activityKpiProLock}>
                        <div className={styles.activityKpiCard}>
                          <span className={styles.activityKpiValue}>{openPrestationCount}</span>
                          <span className={styles.activityKpiLabel}>{copy.kpiPrestationOpen}</span>
                        </div>
                      </ProFeatureLock>
                    </div>
                    <div className={styles.activityGridSplit}>
                      <section className={styles.panel}>
                        <div className={styles.panelHeader}>
                          <div className={styles.panelHeaderMain}>
                            <h2 className={styles.panelTitle}>
                              <Icon icon="mdi:ticket-outline" className={styles.panelTitleIcon} aria-hidden />
                              {copy.supportTicketsTitle}
                            </h2>
                          </div>
                          <span className={styles.activityBlockCount}>
                            {interpolate(copy.openCount, {
                        count: openSupportCount
                      })}
                          </span>
                        </div>
                        <div className={styles.panelBody}>
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
                                {supportTickets.length === 0 ? <tr className={styles.dataTableEmptyRow}>
                                    <td colSpan={isCommunity ? 4 : 5} className={styles.dataTableEmptyCell}>
                                      {copy.emptySupportTickets}
                                    </td>
                                  </tr> : supportTickets.slice(0, 8).map(ticket => {
                          const status = normalizeTicketStatus(ticket.status);
                          const sla = getTicketSlaDisplay(ticket, {
                            clients: allClients.length ? allClients : client ? [client] : [],
                            now: slaNow
                          });
                          return <tr key={ticket.id} className={styles.dataTableRowClickable} onClick={() => handleOpenTicket(ticket)} onAuxClick={e => {
                            if (e.button === 1) {
                              e.preventDefault();
                              handleOpenTicket(ticket, true);
                            }
                          }}>
                                      <td>#{ticket.ticket_number || "-"}</td>
                                      <td className={styles.activityTitleCell} title={ticket.title || undefined}>
                                        {ticket.title || "-"}
                                      </td>
                                      <td>
                                        <span className={styles.ticketStatusBadge}>
                                          {getTicketStatusLabel(status, locale)}
                                        </span>
                                      </td>
                                      {!isCommunity && <td>{sla.label}</td>}
                                      <td>{formatRelativeFrench(ticket.updated_at || ticket.created_at)}</td>
                                    </tr>;
                        })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </section>

                      <ProFeatureLock locked={isCommunity} featureLabel={copy.proFeatures.prestations} featureKey="prestations" className={styles.activityBlockProLock} badgePosition="none">
                        <section className={styles.panel}>
                          <div className={styles.panelHeader}>
                            <div className={styles.panelHeaderMain}>
                              <h2 className={styles.panelTitle}>
                                <Icon icon="mdi:briefcase-outline" className={styles.panelTitleIcon} aria-hidden />
                                {copy.prestationsTitle}
                                {isCommunity ? <ProFeatureBadge variant="inline" className={styles.proBadgeInline} /> : null}
                              </h2>
                            </div>
                            <span className={styles.activityBlockCount}>
                              {interpolate(copy.prestationsCount, {
                          count: (isCommunity ? DEMO_PRESTATION_TICKETS : prestationTickets).length
                        })}
                            </span>
                          </div>
                          <div className={styles.panelBody}>
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
                                  {(isCommunity ? DEMO_PRESTATION_TICKETS : prestationTickets).length === 0 ? <tr className={styles.dataTableEmptyRow}>
                                      <td colSpan={4} className={styles.dataTableEmptyCell}>
                                        {copy.emptyPrestationTickets}
                                      </td>
                                    </tr> : (isCommunity ? DEMO_PRESTATION_TICKETS : prestationTickets).slice(0, 8).map(ticket => {
                            const status = normalizeTicketStatus(ticket.status);
                            return <tr key={ticket.id} className={isCommunity ? undefined : styles.dataTableRowClickable} onClick={isCommunity ? undefined : () => handleOpenTicket(ticket)} onAuxClick={isCommunity ? undefined : e => {
                              if (e.button === 1) {
                                e.preventDefault();
                                handleOpenTicket(ticket, true);
                              }
                            }}>
                                        <td>#{ticket.ticket_number || "-"}</td>
                                        <td className={styles.activityTitleCell} title={getPrestationCategoryLabel(ticket.category, locale)}>
                                          {getPrestationCategoryLabel(ticket.category, locale)}
                                        </td>
                                        <td>
                                          <span className={styles.ticketStatusBadge}>
                                            {getTicketStatusLabel(status, locale)}
                                          </span>
                                        </td>
                                        <td>{formatTableDate(ticket.created_at)}</td>
                                      </tr>;
                          })}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </section>
                      </ProFeatureLock>
                    </div>
            </div> : null}

            {overviewTab === "portal" ? <section className={styles.panel} data-guide="contact-portal-panel">
              <div className={styles.panelBody}>
                <div className={`${styles.overviewTabPanel} ${contactStyles.portalTabContent}`}>
                  <ContactPortalSection contact={contact} canManage={canManagePortal} onUpdated={() => {
                const controller = createTrackedAbortController();
                loadControllerRef.current?.abort();
                loadControllerRef.current = controller;
                loadContactData(controller.signal);
              }} />
                </div>
              </div>
            </section> : null}

            {overviewTab === "share" ? <section className={styles.panel} data-guide="contact-share-panel">
              <div className={styles.panelHeader}>
                <div className={styles.panelHeaderMain}>
                  <h2 className={styles.panelTitle}>{copy.sharedAccessTitle}</h2>
                </div>
                {contact?.id && canAccessSharing && (vaultClientId || contact?.client_id || contactCompanies.length > 0) ? <div className={styles.panelToolbar}>
                  <SmartTooltip content={copy.shareAccess}>
                    <button type="button" className={`${pageLayout.primaryBtn} ${pageLayout.primaryBtnIconOnly}`} onClick={() => setShareAccessCreateOpen(true)} aria-label={copy.shareAccess} disabled={isCommunity}>
                      <FaPlus />
                    </button>
                  </SmartTooltip>
                </div> : null}
              </div>
              <div className={styles.panelBody}>
                <div className={styles.overviewTabPanel}>
                  {contact?.id && (vaultClientId || contact?.client_id || contactCompanies.length > 0) ? <ProFeatureLock locked={isCommunity} featureLabel={copy.sharedAccessTitle} featureKey="sharedAccess">
{contactCompanies.length > 1 ? <label className={contactStyles.vaultClientField}>
                        <span className={contactStyles.vaultClientLabel}>{copy.vaultClientLabel || copy.selectCompany}</span>
                        <select className={contactStyles.vaultClientSelect} value={vaultClientId || ""} onChange={e => setVaultClientId(e.target.value || null)}>
                          {contactCompanies.map(company => <option key={company.id} value={company.id}>
                              {company.name}
                            </option>)}
                        </select>
                      </label> : null}
                    <VaultSecretsPanel contactId={contact.id} clientId={vaultClientId || contact.client_id || contactCompanies[0]?.id} contactName={formatContactName(contact, copy.defaultName)} createModalOpen={shareAccessCreateOpen} onCreateModalChange={setShareAccessCreateOpen} />
                  </ProFeatureLock> : <p className={contactStyles.coordEmpty}>{copy.shareNeedsCompany || copy.coordEmpty}</p>}
                </div>
              </div>
            </section> : null}
          </main>

          <aside className={styles.asidePanel}>
            <div className={styles.rightSidebarContent}>
              <section className={styles.sidebarSection} data-guide="contact-sidebar-info">
                <div className={styles.sidebarInfoHeader}>
                  <span className={styles.sidebarInfoTitle}>{copy.sidebarInfo}</span>
                </div>
                <div className={styles.sidebarSummaryList}>
                  <div className={styles.sidebarFieldsRow}>
                    <div className={styles.sidebarSummaryItem}>
                      <span className={styles.sidebarSummaryLabel}>{copy.fields.lastName}</span>
                      <span className={styles.sidebarSummaryValue}>{formData.nom || "-"}</span>
                    </div>
                    <div className={styles.sidebarSummaryItem}>
                      <span className={styles.sidebarSummaryLabel}>{copy.fields.firstName}</span>
                      <span className={styles.sidebarSummaryValue}>{formData.prenom || "-"}</span>
                    </div>
                  </div>
                  <div className={styles.sidebarSummaryItem}>
                    <span className={styles.sidebarSummaryLabel}>{copy.fields.civility}</span>
                    <span className={styles.sidebarSummaryValue}>
                      {formData.sexe ? getContactSexeLabelLocalized(formData.sexe, locale) : "-"}
                    </span>
                  </div>
                  <div className={styles.sidebarSummaryItem}>
                    <span className={styles.sidebarSummaryLabel}>{copy.fields.role}</span>
                    {formData.poste ? <span className={styles.sidebarSummaryValue}>{formData.poste}</span> : <span className={styles.sidebarSummaryValueEmpty}>-</span>}
                  </div>
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
                  actions={canEditContact ? <SmartTooltip content={copy.addCompany}>
                      <button type="button" className={styles.editInfoButton} onClick={e => {
                  e.stopPropagation();
                  openCompanyModal();
                }} disabled={membershipBusy} aria-label={copy.addCompany}>
                        <FaPlus />
                      </button>
                    </SmartTooltip> : null}
                />
                {companiesSectionExpanded ? <div className={`${styles.sidebarBody} ${contactStyles.sidebarCommBodyWrap}`} id="contact-sidebar-companies">
                  {contactCompanies.length === 0 ? <span className={styles.sidebarSummaryValueEmpty}>-</span> : <ul className={styles.sidebarContactsList}>
                      {contactCompanies.map(company => <SmartTooltip as="li" key={company.id} className={styles.sidebarContactItem} onClick={() => openEnterprise({
                  id: company.id,
                  name: company.name
                })} content={copy.viewEnterprise}>
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
                                  <button type="button" className={styles.sidebarCopyButton} disabled={membershipBusy} title={interpolate(copy.removeCompanyAria || "{name}", {
                            name: company.name
                          })} aria-label={interpolate(copy.removeCompanyAria || "{name}", {
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
                                return <span key={siteId} className={styles.sidebarContactSiteChip} title={label}>
                                      <Icon icon="mdi:map-marker-outline" aria-hidden />
                                      <span>{label}</span>
                                      {primaryIds.has(siteId) ? <span className={styles.sitePreviewPrimary}>{copy.sitePrimaryBadge}</span> : null}
                                    </span>;
                              })}
                                </div>;
                            })()}
                          </div>
                        </SmartTooltip>)}
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
                  actions={canEditContact ? <SmartTooltip content={copy.addEmail}>
                      <button type="button" className={styles.editInfoButton} onClick={e => {
                  e.stopPropagation();
                  handleOpenAddCommunication("email");
                }} aria-label={copy.addEmail}>
                        <FaPlus />
                      </button>
                    </SmartTooltip> : null}
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
                              {entry.isPrimary ? <Icon icon="mdi:star" className={contactStyles.coordFavoriteStar} title={copy.coordFavorite} aria-label={copy.coordFavorite} /> : null}
                            </span>
                            <SmartTooltip content={interpolate(copy.copyCoord, {
                        label: copy.sectionEmails.toLowerCase()
                      })}>
                              <button type="button" className={styles.sidebarCopyButton} onClick={e => {
                          e.stopPropagation();
                          copyCoordValue(entry.value, copy.sectionEmails);
                        }} aria-label={interpolate(copy.copyCoord, {
                          label: copy.sectionEmails.toLowerCase()
                        })}>
                                <Icon icon="mdi:content-copy" aria-hidden />
                              </button>
                            </SmartTooltip>
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
                  actions={canEditContact ? <SmartTooltip content={copy.addPhone}>
                      <button type="button" className={styles.editInfoButton} onClick={e => {
                  e.stopPropagation();
                  handleOpenAddCommunication("telephone");
                }} aria-label={copy.addPhone}>
                        <FaPlus />
                      </button>
                    </SmartTooltip> : null}
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
                              {entry.isPrimary ? <Icon icon="mdi:star" className={contactStyles.coordFavoriteStar} title={copy.coordFavorite} aria-label={copy.coordFavorite} /> : null}
                            </span>
                            <SmartTooltip content={interpolate(copy.copyCoord, {
                        label: copy.sectionPhones.toLowerCase()
                      })}>
                              <button type="button" className={styles.sidebarCopyButton} onClick={e => {
                          e.stopPropagation();
                          copyCoordValue(entry.value, copy.sectionPhones);
                        }} aria-label={interpolate(copy.copyCoord, {
                          label: copy.sectionPhones.toLowerCase()
                        })}>
                                <Icon icon="mdi:content-copy" aria-hidden />
                              </button>
                            </SmartTooltip>
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
