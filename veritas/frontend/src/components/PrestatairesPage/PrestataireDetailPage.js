import React, { useState, useEffect, useLayoutEffect, useRef, useMemo, useCallback } from "react";
import { useParams } from "react-router-dom";
import { Icon } from "@iconify/react";
import { FaPlus, FaTimes, FaChevronLeft, FaChevronRight } from "react-icons/fa";
import { toast } from "react-toastify";
import { fetchPrestataire, fetchPrestataireMentionedTickets, deletePrestataire, getPrestataireLogs, purgePrestataireLogs } from "../../api/prestataires";
import ActivityJournalPanel from "../shared/ActivityJournalPanel/ActivityJournalPanel";
import { fetchClientsList } from "../../api/clients";
import styles from "../EnterprisesPage/EnterpriseDetailPage.module.css";
import equipStyles from "../EquipementPage/EquipmentPage.module.css";
import localStyles from "./PrestataireDetailPage.module.css";
import StatusDot from "../shared/StatusDot/StatusDot";
import { getClientNumber, getClientNameWithoutCode } from "../../utils/clientDisplay";
import PrestataireFormModal from "./PrestataireFormModal";
import { EnterpriseOverviewTabButton, EnterpriseQuickActionButton } from "../EnterprisesPage/EnterpriseFinderTabIcon";
import { UiKitEmptyState, UiKitScrollFadeShell, uiKitLayoutsStyles as finderKit, useFinderNavIndicator } from "../UiKit";
import ActivityStatusSegmented from "../shared/ActivityStatusSegmented/ActivityStatusSegmented";
import { usePermissions } from "../../contexts/PermissionsContext";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import {
  getPrestataireDetailCopy,
  getPrestataireStatusLocalized,
  interpolate
} from "./prestataireDetailI18n";
import { getTicketStatusLabel } from "../EnterprisesPage/enterpriseDetailI18n";
import { formatRelativeFrench } from "../EquipementPage/checkmkMonitoringUtils";
import { isSalesTicket } from "../../utils/salesTicketUtils";
import { createTrackedAbortController } from "../../utils/pageLoadAbort";
import {
  DETAIL_CACHE_NS,
  getDetailCache,
  invalidateDetailCache,
  setDetailCache
} from "../../utils/detailPageCache";
import { getListCache, LIST_CACHE_NS } from "../../utils/listPageCache";
import CrmDetailPageSkeleton from "../EnterprisesPage/CrmDetailPageSkeleton";

function resolveInitialPrestataireCache(prestataireId, prestataireData) {
  if (!prestataireId) return null;
  const cached = getDetailCache(DETAIL_CACHE_NS.prestataire, prestataireId);
  if (cached?.prestataire && String(cached.prestataire.id) === String(prestataireId)) return cached;
  if (prestataireData?.prestataire && String(prestataireData.prestataire.id) === String(prestataireId)) {
    return {
      prestataire: prestataireData.prestataire,
      ...(Array.isArray(prestataireData.mentionedTickets)
        ? { mentionedTickets: prestataireData.mentionedTickets }
        : {})
    };
  }
  const list = getListCache(LIST_CACHE_NS.prestataires);
  if (Array.isArray(list)) {
    const row = list.find(item => String(item?.id) === String(prestataireId));
    if (row) return { prestataire: row };
  }
  return null;
}

const normalizePhone = value => {
  let normalized = (value || "").toString().trim();
  if (normalized.startsWith("'")) normalized = normalized.slice(1);
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

function formatPersonName(contact, fallback = "") {
  const parts = [contact?.prenom, contact?.nom].filter(Boolean);
  return parts.join(" ") || fallback;
}

const normalizeTicketStatus = status => (status === "open" ? "new" : status);
const isOpenTicket = ticket => {
  const status = normalizeTicketStatus(ticket?.status);
  return !["resolved", "closed"].includes(status);
};

function SidebarSectionHeader({
  title,
  count = null,
  expanded = false,
  onToggle,
  controlsId,
  actions = null,
  panelStyles
}) {
  return (
    <div className={panelStyles.sidebarCollapseHeader}>
      <button
        type="button"
        className={panelStyles.sidebarCollapseMain}
        onClick={() => onToggle?.()}
        aria-expanded={expanded}
        aria-controls={controlsId || undefined}
      >
        <span className={panelStyles.sidebarInfoTitle}>
          {title}
          {count != null ? <span className={panelStyles.sidebarSectionCount}>{count}</span> : null}
        </span>
      </button>
      {actions ? <div className={panelStyles.sidebarHeaderActions}>{actions}</div> : null}
      <button
        type="button"
        className={panelStyles.sidebarCollapseChevronBtn}
        onClick={() => onToggle?.()}
        tabIndex={-1}
        aria-hidden="true"
      >
        <Icon
          icon={expanded ? "mdi:chevron-up" : "mdi:chevron-down"}
          className={panelStyles.sidebarCollapseChevron}
        />
      </button>
    </div>
  );
}

export default function PrestataireDetailPage({ onNavigate, prestataireData }) {
  const { prestataireId: urlPrestataireId } = useParams();
  const locale = useAppLocale();
  const copy = useMemo(() => getPrestataireDetailCopy(locale), [locale]);
  const { can } = usePermissions();
  const canEdit = can("prestataires_detail.edit");
  const canDelete = can("prestataires_detail.delete");

  const resolvedPrestataireId =
    prestataireData?.prestataireId || prestataireData?.id || urlPrestataireId || null;
  const initialCachedPrestataire = useMemo(
    () => resolveInitialPrestataireCache(resolvedPrestataireId, prestataireData),
    // Snapshot once per mount for this prestataire id
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [resolvedPrestataireId]
  );
  const [prestataire, setPrestataire] = useState(() => initialCachedPrestataire?.prestataire || null);
  const [loading, setLoading] = useState(() => !initialCachedPrestataire?.prestataire);
  const [error, setError] = useState(null);
  const [allClients, setAllClients] = useState([]);
  const [mentionedTickets, setMentionedTickets] = useState(() =>
    Array.isArray(initialCachedPrestataire?.mentionedTickets) ? initialCachedPrestataire.mentionedTickets : []
  );
  const [loadingActivity, setLoadingActivity] = useState(
    () => !Array.isArray(initialCachedPrestataire?.mentionedTickets)
  );
  const [modalOpen, setModalOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [overviewTab, setOverviewTab] = useState("activity");
  const [activitySection, setActivitySection] = useState("tickets");
  const [ticketsSearchQuery, setTicketsSearchQuery] = useState("");
  const [ticketsStatusFilter, setTicketsStatusFilter] = useState("all");
  const [activityPageSize, setActivityPageSize] = useState(50);
  const [ticketsTablePage, setTicketsTablePage] = useState(1);
  const [activityTabMounted, setActivityTabMounted] = useState(true);
  const [logsTabMounted, setLogsTabMounted] = useState(false);
  const [companiesSectionExpanded, setCompaniesSectionExpanded] = useState(true);
  const [contactsSectionExpanded, setContactsSectionExpanded] = useState(true);
  const loadControllerRef = useRef(null);
  const activityControllerRef = useRef(null);
  const clientsListControllerRef = useRef(null);
  const pageRootRef = useRef(null);
  const isMountedRef = useRef(true);
  const loadRequestIdRef = useRef(0);

  const companies = useMemo(() => {
    const linked = Array.isArray(prestataire?.clients) ? prestataire.clients : [];
    return linked
      .map(row => ({
        id: row.id ?? row.client_id,
        name: row.name || row.client_name || `Client #${row.id ?? row.client_id}`,
        role: row.role || null
      }))
      .filter(row => row.id != null);
  }, [prestataire]);

  const contacts = useMemo(() => {
    if (Array.isArray(prestataire?.contacts) && prestataire.contacts.length > 0) {
      return prestataire.contacts;
    }
    if (prestataire?.contact_nom || prestataire?.contact_prenom || prestataire?.email || prestataire?.telephone) {
      return [
        {
          nom: prestataire.contact_nom || "",
          prenom: prestataire.contact_prenom || "",
          email: prestataire.email || "",
          telephone: prestataire.telephone || ""
        }
      ];
    }
    return [];
  }, [prestataire]);

  const openTicketsCount = useMemo(
    () => mentionedTickets.filter(isOpenTicket).length,
    [mentionedTickets]
  );
  const matchesTicketsStatusFilter = useCallback((ticket, statusFilter) => {
    if (statusFilter === "open") return isOpenTicket(ticket);
    if (statusFilter === "closed") return !isOpenTicket(ticket);
    return true;
  }, []);
  const filteredMentionedTickets = useMemo(() => {
    const query = ticketsSearchQuery.trim().toLowerCase();
    return mentionedTickets.filter(ticket => {
      if (!matchesTicketsStatusFilter(ticket, ticketsStatusFilter)) return false;
      if (!query) return true;
      const status = getTicketStatusLabel(normalizeTicketStatus(ticket.status), locale);
      const haystack = [
        ticket.ticket_number,
        ticket.title,
        ticket.side_conversation_subject,
        status
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [locale, matchesTicketsStatusFilter, mentionedTickets, ticketsSearchQuery, ticketsStatusFilter]);
  const pagedMentionedTickets = useMemo(() => {
    const total = filteredMentionedTickets.length;
    const safePageSize = Math.max(1, Number(activityPageSize) || 50);
    const totalPages = Math.max(1, Math.ceil(Math.max(total, 1) / safePageSize));
    const page = Math.min(Math.max(1, Number(ticketsTablePage) || 1), totalPages);
    const start = (page - 1) * safePageSize;
    return {
      page,
      totalPages,
      total,
      safePageSize,
      pagedList: total === 0 ? [] : filteredMentionedTickets.slice(start, start + safePageSize)
    };
  }, [activityPageSize, filteredMentionedTickets, ticketsTablePage]);
  useEffect(() => {
    setTicketsTablePage(1);
  }, [ticketsSearchQuery, ticketsStatusFilter]);
  const ticketsStatusOptions = useMemo(
    () => [
      { id: "all", label: copy.activityFilterAll || "Tous" },
      { id: "open", label: copy.activityFilterOpen || "Ouverts" },
      { id: "closed", label: copy.activityFilterClosed || "Clos" }
    ],
    [copy.activityFilterAll, copy.activityFilterClosed, copy.activityFilterOpen]
  );
  const renderTicketsPagination = useCallback(() => {
    const { total, page, totalPages, safePageSize } = pagedMentionedTickets;
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
              setTicketsTablePage(1);
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
            onClick={() => setTicketsTablePage(page - 1)}
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
            onClick={() => setTicketsTablePage(page + 1)}
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
    pagedMentionedTickets
  ]);

  const resolveId = () =>
    prestataireData?.prestataireId || prestataireData?.id || urlPrestataireId;

  const loadActivity = useCallback(
    async (prestataireId, signal, { keepVisible = false } = {}) => {
      if (!prestataireId) return;
      if (!keepVisible) setLoadingActivity(true);
      try {
        const data = await fetchPrestataireMentionedTickets(prestataireId, {
          limit: 100,
          signal
        });
        if (signal?.aborted || !isMountedRef.current) return;
        const tickets = Array.isArray(data?.tickets) ? data.tickets : [];
        setMentionedTickets(tickets);
        const cached = getDetailCache(DETAIL_CACHE_NS.prestataire, prestataireId);
        if (cached?.prestataire) {
          setDetailCache(DETAIL_CACHE_NS.prestataire, prestataireId, {
            ...cached,
            mentionedTickets: tickets
          });
        }
      } catch (err) {
        if (err?.name === "AbortError") return;
        console.error("Error loading prestataire mentioned tickets:", err);
        if (!keepVisible && isMountedRef.current) setMentionedTickets([]);
      } finally {
        if (isMountedRef.current) setLoadingActivity(false);
      }
    },
    []
  );

  useEffect(() => {
    isMountedRef.current = true;
    const id = resolveId();
    if (id) {
      const controller = createTrackedAbortController();
      loadControllerRef.current?.abort();
      loadControllerRef.current = controller;
      loadData(controller.signal);
    }
    return () => {
      isMountedRef.current = false;
      loadControllerRef.current?.abort();
      activityControllerRef.current?.abort();
      clientsListControllerRef.current?.abort();
    };
  }, [urlPrestataireId, prestataireData?.prestataireId, prestataireData?.id]);

  const ensureClientsLoaded = async () => {
    if (allClients.length > 0) return;
    clientsListControllerRef.current?.abort();
    const controller = createTrackedAbortController();
    clientsListControllerRef.current = controller;
    try {
      const data = await fetchClientsList({ signal: controller.signal });
      if (controller.signal.aborted || !isMountedRef.current) return;
      setAllClients(Array.isArray(data) ? data : []);
    } catch (err) {
      if (err?.name !== "AbortError") console.error("Error loading clients:", err);
    }
  };

  const loadData = async signal => {
    const requestId = ++loadRequestIdRef.current;
    const isCurrentRequest = () =>
      loadRequestIdRef.current === requestId && loadControllerRef.current?.signal === signal;
    setError(null);
    const id = resolveId();
    if (!id) {
      setLoading(false);
      return;
    }

    const cached = getDetailCache(DETAIL_CACHE_NS.prestataire, id);
    if (cached?.prestataire && String(cached.prestataire.id) === String(id)) {
      setPrestataire(cached.prestataire);
      if (Array.isArray(cached.mentionedTickets)) setMentionedTickets(cached.mentionedTickets);
      setLoading(false);
      if (window.updateTabTitle && (cached.prestataire.nom || cached.prestataire.name)) {
        window.updateTabTitle("PrestataireDetail", {
          prestataireId: id,
          id,
          nom: cached.prestataire.nom || cached.prestataire.name
        });
      }
    } else {
      setPrestataire(null);
      setMentionedTickets([]);
      setLoading(true);
    }

    try {
      const fetched = await fetchPrestataire(id, { signal });
      if (signal?.aborted || !isMountedRef.current || !isCurrentRequest()) return;
      setPrestataire(fetched);
      setDetailCache(DETAIL_CACHE_NS.prestataire, id, {
        prestataire: fetched,
        mentionedTickets: Array.isArray(cached?.mentionedTickets) ? cached.mentionedTickets : []
      });
      if (window.updateTabTitle && (fetched.nom || fetched.name)) {
        window.updateTabTitle("PrestataireDetail", {
          prestataireId: id,
          id,
          nom: fetched.nom || fetched.name
        });
      }
      activityControllerRef.current?.abort();
      const activityController = createTrackedAbortController();
      activityControllerRef.current = activityController;
      loadActivity(fetched.id, activityController.signal, {
        keepVisible: Array.isArray(cached?.mentionedTickets)
      });
      ensureClientsLoaded();
    } catch (err) {
      if (err?.name === "AbortError") return;
      if (!getDetailCache(DETAIL_CACHE_NS.prestataire, id)?.prestataire) {
        setError(err.message || copy.loadError);
      }
      console.error("Error chargement prestataire:", err);
    } finally {
      if (isCurrentRequest() && isMountedRef.current) setLoading(false);
    }
  };

  const openEnterprise = client => {
    if (!onNavigate || !client?.id) return;
    onNavigate("ContratDetail", { clientId: client.id, id: client.id, name: client.name });
  };

  const handleOpenTicket = (ticket, background = false) => {
    if (!ticket?.id || !onNavigate) return;
    const isSales = isSalesTicket(ticket);
    onNavigate(
      isSales ? "TicketSalesDetail" : "TicketDetail",
      {
        ticketId: ticket.id,
        ticketNumber: ticket.ticket_number,
        title: ticket.title,
        ...(isSales
          ? { ticketFamily: "sales", fromPage: "TicketSales" }
          : { ticketFamily: "support", fromPage: "Ticket" })
      },
      background ? { background: true } : undefined
    );
  };

  const handleOpenEdit = async () => {
    await ensureClientsLoaded();
    setModalOpen(true);
  };

  const handleDelete = async () => {
    if (!prestataire?.id) return;
    if (!window.confirm(copy.confirmDelete)) return;
    try {
      setDeleting(true);
      const deletedId = prestataire.id;
      await deletePrestataire(deletedId);
      invalidateDetailCache(DETAIL_CACHE_NS.prestataire, deletedId);
      toast.success(copy.toast.deleted);
      window.dispatchEvent(new Event("refreshPrestataires"));
      if (onNavigate) onNavigate("Prestataire");
    } catch (err) {
      toast.error(err.message || copy.toast.deleteError);
    } finally {
      setDeleting(false);
    }
  };

  const resolveCompanyLabel = company => {
    const listed = allClients.find(c => String(c.id) === String(company.id));
    const code = getClientNumber(listed || company);
    const label = getClientNameWithoutCode(listed || company) || company.name || "";
    return { code, label };
  };

  useEffect(() => {
    if (overviewTab === "activity") setActivityTabMounted(true);
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

  if (loading && !prestataire) {
    return (
      <CrmDetailPageSkeleton
        className={`${styles.prestataireDetailPage} ${localStyles.prestataireDetailPage}`}
        loadingAria={copy.loading || "Chargement…"}
        titleHint={prestataireData?.nom || ""}
        showTitleIcon
        tabCount={2}
        secondaryCount={2}
        body="activity"
        showAside
        asideSections={2}
        asideActionCount={4}
      />
    );
  }

  if (error || !prestataire) {
    return (
      <div className={`${styles.contratDetailPage} ${styles.enterpriseDetailPage} msp-page-grid`}>
        <div className={styles.error}>
          <Icon icon="mdi:alert-circle-outline" />
          <span>{error || copy.notFound}</span>
        </div>
      </div>
    );
  }

  const status = getPrestataireStatusLocalized(prestataire.statut, locale);
  const displayName = prestataire.nom || copy.defaultName;
  const primaryContact = contacts[0];
  const primaryEmail = primaryContact?.email || "";
  const emailHref = primaryEmail ? toMailtoHref(primaryEmail) : "";
  const websiteHref = prestataire.site_web
    ? prestataire.site_web.startsWith("http")
      ? prestataire.site_web
      : `https://${prestataire.site_web}`
    : "";
  const finderSecondaryVisible = overviewTab === "activity";
  const renderActivityEmpty = (icon, text) => (
    <div className={styles.activityEmptyState}>
      <UiKitEmptyState bare icon={icon} text={text} />
    </div>
  );

  return (
    <div
      ref={pageRootRef}
      className={`${styles.contratDetailPage} ${styles.enterpriseDetailPage} ${styles.prestataireDetailPage} ${localStyles.prestataireDetailPage} msp-page-grid`}
    >
      <header className={styles.pageHero} data-guide="prestataire-hero">
        <div className={styles.heroTop}>
          <div className={styles.heroIdentityBlock}>
            <div className={styles.heroCover} aria-hidden />
            <div className={styles.heroIdentityRow}>
              <div className={styles.heroMain}>
                <span className={styles.heroBrandIcon} aria-hidden>
                  <Icon icon="mdi:handshake-outline" width={16} height={16} />
                </span>
                <div className={styles.heroText}>
                  <h1 className={styles.heroTitle}>
                    <StatusDot
                      active={status.status === "active"}
                      label={status.label}
                      className={styles.heroTitleStatus}
                    />
                    <span className={styles.heroTitleName}>{displayName}</span>
                  </h1>
                </div>
              </div>
              <div className={styles.heroMeta} aria-label={copy.heroMetaAria}>
                {prestataire.type ? (
                  <span className={`${styles.heroMetaItem} ${styles.heroMetaBlock}`}>
                    <Icon icon="mdi:tag-outline" aria-hidden />
                    {prestataire.type}
                  </span>
                ) : null}
                {websiteHref ? (
                  <a
                    href={websiteHref}
                    className={`${styles.heroMetaItem} ${styles.heroMetaBlock} ${styles.heroMetaLink}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <Icon icon="mdi:web" aria-hidden />
                    {prestataire.site_web}
                  </a>
                ) : null}
                {prestataire.adresse ? (
                  <span className={`${styles.heroMetaItem} ${styles.heroMetaBlock}`}>
                    <Icon icon="mdi:map-marker-outline" aria-hidden />
                    {prestataire.adresse}
                  </span>
                ) : null}
                {prestataire.notes ? (
                  <span className={`${styles.heroMetaItem} ${styles.heroMetaBlock} ${localStyles.heroMetaNotes}`}>
                    <Icon icon="mdi:note-text-outline" aria-hidden />
                    <span>{prestataire.notes}</span>
                  </span>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className={`${styles.pageBody} ${styles.pageBodyFill}`.trim()}>
        <div className={styles.pageGrid}>
          <main
            className={`${styles.mainColumn} ${styles.mainColumnFinder} ${overviewTab === "activity" ? styles.mainColumnActivity : ""} ${overviewTab === "logs" ? styles.mainColumnLogs : ""}`.trim()}
          >
            <div className={`${finderKit.finderLayout} ${styles.enterpriseFinderLayout}`}>
              <aside className={`${finderKit.finderSidebar} ${styles.enterpriseFinderSidebar}`} aria-label={copy.overviewTabsAria}>
                <nav
                  ref={finderPrimaryTrackRef}
                  className={`${finderKit.finderPrimary} ${finderKit.finderPrimaryAnimated}`}
                  role="tablist"
                  aria-label={copy.overviewTabsAria}
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
                    data-guide="prestataire-activity"
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
                    data-guide="prestataire-logs"
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
                            className={`${finderKit.finderSecItem} ${activitySection === "tickets" ? finderKit.finderSecItemActive : ""}`}
                            aria-current={activitySection === "tickets" ? "page" : undefined}
                            tabIndex={overviewTab === "activity" ? undefined : -1}
                            onClick={() => setActivitySection("tickets")}
                          >
                            <Icon icon="mdi:ticket-outline" className={finderKit.finderSecItemIcon} aria-hidden />
                            <span className={finderKit.finderSecItemLabel}>{copy.mentionedTicketsTitle}</span>
                            <span className={finderKit.finderSecCount}>{openTicketsCount}</span>
                          </button>
                          <button
                            type="button"
                            className={`${finderKit.finderSecItem} ${activitySection === "companies" ? finderKit.finderSecItemActive : ""}`}
                            aria-current={activitySection === "companies" ? "page" : undefined}
                            tabIndex={overviewTab === "activity" ? undefined : -1}
                            onClick={() => setActivitySection("companies")}
                          >
                            <Icon icon="mdi:domain" className={finderKit.finderSecItemIcon} aria-hidden />
                            <span className={finderKit.finderSecItemLabel}>{copy.companies}</span>
                            <span className={finderKit.finderSecCount}>{companies.length}</span>
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
                      <div className={styles.activityLayout} data-guide="prestataire-activity-panel">
                        <div className={styles.activityUnifiedCard} data-activity-section={activitySection}>
                          {activitySection === "tickets" ? (
                            <section className={`${styles.activityUnifiedSection} ${styles.activityUnifiedSectionSolo}`} data-activity-section="tickets">
                              <div className={styles.activityUnifiedBody}>
                                <div
                                  className={`${equipStyles.hardwarePageEmbedded} ${equipStyles.embeddedFilterBar} ${equipStyles.embeddedFilterBarToolbar} ${styles.activityToolbar}`}
                                >
                                  <div className={equipStyles.embeddedSearchWrap}>
                                    <div className={equipStyles.embeddedSearchBox}>
                                      <Icon icon="mdi:magnify" className={equipStyles.embeddedSearchIcon} aria-hidden />
                                      <input
                                        type="text"
                                        className={equipStyles.embeddedSearchInput}
                                        value={ticketsSearchQuery}
                                        onChange={event => setTicketsSearchQuery(event.target.value)}
                                        placeholder={copy.activitySearchPlaceholder || "Rechercher"}
                                        aria-label={copy.activitySearchPlaceholder || "Rechercher"}
                                      />
                                      {ticketsSearchQuery ? (
                                        <button
                                          type="button"
                                          className={equipStyles.embeddedSearchClear}
                                          onClick={() => setTicketsSearchQuery("")}
                                          aria-label={copy.activityClearSearchAria || "Effacer la recherche"}
                                        >
                                          <FaTimes aria-hidden />
                                        </button>
                                      ) : null}
                                    </div>
                                    <div className={`${equipStyles.embeddedSearchActions} ${styles.activityToolbarActions}`}>
                                      <ActivityStatusSegmented
                                        value={ticketsStatusFilter}
                                        onChange={setTicketsStatusFilter}
                                        options={ticketsStatusOptions}
                                        ariaLabel={copy.activityFilterStatusAria || "Filtrer par statut"}
                                      />
                                    </div>
                                  </div>
                                </div>
                                <div className={styles.activityTableStack}>
                                  {loadingActivity && mentionedTickets.length === 0 ? (
                                    renderActivityEmpty("mdi:ticket-outline", copy.loading)
                                  ) : pagedMentionedTickets.total === 0 ? (
                                    renderActivityEmpty(
                                      "mdi:ticket-outline",
                                      mentionedTickets.length > 0 && (ticketsSearchQuery.trim() || ticketsStatusFilter !== "all")
                                        ? (copy.emptyActivitySearch || copy.emptyMentionedTickets)
                                        : copy.emptyMentionedTickets
                                    )
                                  ) : (
                                    <div className={styles.dataTableWrapper}>
                                      <table className={styles.dataTable}>
                                        <thead>
                                          <tr>
                                            <th>{copy.table.number}</th>
                                            <th>{copy.table.title}</th>
                                            <th>{copy.table.status}</th>
                                            <th>{copy.table.sideConv}</th>
                                            <th>{copy.table.updated}</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {pagedMentionedTickets.pagedList.map(ticket => {
                                            const ticketStatus = normalizeTicketStatus(ticket.status);
                                            const sideCount = Number(ticket.side_conversation_count) || 0;
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
                                                <td className={styles.activityTitleCell}>
                                                  {ticket.title || ticket.side_conversation_subject || "-"}
                                                </td>
                                                <td>
                                                  <span className={styles.ticketStatusBadge}>
                                                    {getTicketStatusLabel(ticketStatus, locale)}
                                                  </span>
                                                </td>
                                                <td>
                                                  {interpolate(copy.sideConversationsCount, { count: sideCount })}
                                                </td>
                                                <td>
                                                  {formatRelativeFrench(
                                                    ticket.last_side_conversation_at ||
                                                      ticket.updated_at ||
                                                      ticket.created_at
                                                  )}
                                                </td>
                                              </tr>
                                            );
                                          })}
                                        </tbody>
                                      </table>
                                    </div>
                                  )}
                                  {renderTicketsPagination()}
                                </div>
                              </div>
                            </section>
                          ) : null}

                          {activitySection === "companies" ? (
                            <section className={`${styles.activityUnifiedSection} ${styles.activityUnifiedSectionSolo}`} data-activity-section="companies">
                              <div className={styles.activityUnifiedBody}>
                                <div className={styles.activityTableStack}>
                                  {companies.length === 0 ? (
                                    renderActivityEmpty("mdi:domain", copy.noCompanies)
                                  ) : (
                                    <ul className={styles.sidebarContactsList}>
                                      {companies.map(company => {
                                        const { code, label } = resolveCompanyLabel(company);
                                        return (
                                          <li
                                            key={company.id}
                                            className={styles.sidebarContactItem}
                                            onClick={() => openEnterprise(company)}
                                          >
                                            <div className={styles.sidebarContactAvatar} aria-hidden>
                                              {(label || "E").slice(0, 2).toUpperCase()}
                                            </div>
                                            <div className={styles.sidebarContactBody}>
                                              <span className={styles.sidebarContactName}>
                                                {code ? (
                                                  <>
                                                    <span className={styles.headerClientCode}>{code}</span>
                                                    {label}
                                                  </>
                                                ) : (
                                                  label
                                                )}
                                              </span>
                                              {company.role ? (
                                                <span className={styles.sidebarContactMeta}>{company.role}</span>
                                              ) : null}
                                            </div>
                                          </li>
                                        );
                                      })}
                                    </ul>
                                  )}
                                </div>
                              </div>
                            </section>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {logsTabMounted ? (
                    <div
                      className={styles.overviewTabPanel}
                      hidden={overviewTab !== "logs"}
                      style={overviewTab === "logs" ? undefined : { display: "none" }}
                      data-guide="prestataire-logs-panel"
                    >
                      {prestataire?.id ? (
                        <ActivityJournalPanel
                          entityId={prestataire.id}
                          embedded
                          active={overviewTab === "logs"}
                          fetchLogs={(page, options) =>
                            getPrestataireLogs(prestataire.id, page, options?.limit || 25, {
                              signal: options?.signal,
                              sortBy: options?.sortBy,
                              sortDir: options?.sortDir
                            })
                          }
                          purgeLogs={() => purgePrestataireLogs(prestataire.id)}
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
                data-guide="prestataire-quick-actions"
                aria-label={copy.quickActions?.title || "Actions rapides"}
              >
                <div className={styles.sidebarActionToolbar}>
                  {canEdit ? (
                    <EnterpriseQuickActionButton
                      actionId="edit"
                      iconify="mdi:square-edit-outline"
                      className={styles.sidebarActionIconBtn}
                      onClick={handleOpenEdit}
                      aria-label={copy.quickActions?.editPrestataire || copy.editPrestataire}
                    />
                  ) : null}
                  {emailHref ? (
                    <EnterpriseQuickActionButton
                      actionId="email"
                      iconify="mdi:email-outline"
                      className={styles.sidebarActionIconBtn}
                      onClick={() => {
                        window.location.href = emailHref;
                      }}
                      aria-label={copy.quickActions?.sendEmail || "Envoyer un email"}
                    />
                  ) : null}
                  {websiteHref ? (
                    <EnterpriseQuickActionButton
                      actionId="website"
                      iconify="mdi:web"
                      className={styles.sidebarActionIconBtn}
                      onClick={() => window.open(websiteHref, "_blank", "noopener,noreferrer")}
                      aria-label={copy.quickActions?.openWebsite || "Ouvrir le site web"}
                    />
                  ) : null}
                  {canDelete ? (
                    <EnterpriseQuickActionButton
                      actionId="delete"
                      iconify="mdi:trash-can-outline"
                      className={styles.sidebarActionIconBtn}
                      onClick={handleDelete}
                      disabled={deleting}
                      aria-label={deleting ? copy.deleting : copy.quickActions?.deletePrestataire || copy.deletePrestataire}
                    />
                  ) : null}
                </div>
              </section>

              <section className={`${styles.sidebarSection} ${localStyles.sidebarCommSection}`}>
                <SidebarSectionHeader
                  title={copy.contactsTitle}
                  count={contacts.length > 0 ? contacts.length : null}
                  expanded={contactsSectionExpanded}
                  onToggle={() => setContactsSectionExpanded(prev => !prev)}
                  controlsId="prestataire-sidebar-contacts"
                  panelStyles={styles}
                  actions={
                    canEdit ? (
                      <button
                        type="button"
                        className={styles.editInfoButton}
                        onClick={e => {
                          e.stopPropagation();
                          handleOpenEdit();
                        }}
                        aria-label={copy.editPrestataire}
                      >
                        <FaPlus />
                      </button>
                    ) : null
                  }
                />
                {contactsSectionExpanded ? (
                  <div
                    className={`${styles.sidebarBody} ${localStyles.sidebarCommBodyWrap}`}
                    id="prestataire-sidebar-contacts"
                  >
                    {contacts.length === 0 ? (
                      <span className={styles.sidebarSummaryValueEmpty}>{copy.noContacts}</span>
                    ) : (
                      <ul className={localStyles.sidebarCommList}>
                        {contacts.map((contact, index) => {
                          const name = formatPersonName(contact, copy.contactFallback);
                          const mail = contact.email ? toMailtoHref(contact.email) : "";
                          const tel = contact.telephone ? toTelHref(contact.telephone) : "";
                          return (
                            <li key={contact.id || `${name}-${index}`} className={localStyles.sidebarContactCard}>
                              <span className={localStyles.sidebarContactCardName}>{name}</span>
                              {contact.email ? (
                                <a href={mail} className={localStyles.sidebarCommLink}>
                                  <Icon icon="mdi:email-outline" aria-hidden />
                                  <span>{contact.email}</span>
                                </a>
                              ) : null}
                              {contact.telephone ? (
                                <a href={tel} className={localStyles.sidebarCommLink}>
                                  <Icon icon="mdi:phone-outline" aria-hidden />
                                  <span>{contact.telephone}</span>
                                </a>
                              ) : null}
                              {!contact.email && !contact.telephone ? (
                                <span className={styles.sidebarSummaryValueEmpty}>{copy.contactNoCoords}</span>
                              ) : null}
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                ) : null}
              </section>

              <section className={`${styles.sidebarSection} ${localStyles.sidebarCommSection}`}>
                <SidebarSectionHeader
                  title={copy.companies}
                  count={companies.length > 0 ? companies.length : null}
                  expanded={companiesSectionExpanded}
                  onToggle={() => setCompaniesSectionExpanded(prev => !prev)}
                  controlsId="prestataire-sidebar-companies"
                  panelStyles={styles}
                />
                {companiesSectionExpanded ? (
                  <div
                    className={`${styles.sidebarBody} ${localStyles.sidebarCommBodyWrap}`}
                    id="prestataire-sidebar-companies"
                  >
                    {companies.length === 0 ? (
                      <span className={styles.sidebarSummaryValueEmpty}>{copy.noCompanies}</span>
                    ) : (
                      <ul className={styles.sidebarContactsList}>
                        {companies.map(company => {
                          const { code, label } = resolveCompanyLabel(company);
                          return (
                            <li
                              key={`aside-${company.id}`}
                              className={styles.sidebarContactItem}
                              onClick={() => openEnterprise(company)}
                            >
                              <div className={styles.sidebarContactAvatar} aria-hidden>
                                {(label || "E").slice(0, 2).toUpperCase()}
                              </div>
                              <div className={styles.sidebarContactBody}>
                                <span className={styles.sidebarContactName}>
                                  {code ? (
                                    <>
                                      <span className={styles.headerClientCode}>{code}</span>
                                      {label}
                                    </>
                                  ) : (
                                    label
                                  )}
                                </span>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                ) : null}
              </section>
            </div>
          </aside>
        </div>
      </div>

      <PrestataireFormModal
        open={modalOpen}
        initialPrestataire={prestataire}
        clients={allClients}
        onClose={() => setModalOpen(false)}
        onSuccess={updated => {
          if (updated) {
            setPrestataire(updated);
            if (updated.id) {
              setDetailCache(DETAIL_CACHE_NS.prestataire, updated.id, {
                prestataire: updated,
                mentionedTickets
              });
            }
            toast.success(copy.toast.updated);
          }
          const controller = createTrackedAbortController();
          loadControllerRef.current?.abort();
          loadControllerRef.current = controller;
          loadData(controller.signal);
        }}
      />
    </div>
  );
}
