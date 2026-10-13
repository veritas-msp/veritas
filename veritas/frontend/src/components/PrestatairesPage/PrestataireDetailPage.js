import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useParams } from "react-router-dom";
import { Icon } from "@iconify/react";
import { FaPlus } from "react-icons/fa";
import { toast } from "react-toastify";
import { fetchPrestataire, fetchPrestataireMentionedTickets, deletePrestataire, getPrestataireLogs, purgePrestataireLogs } from "../../api/prestataires";
import ActivityJournalPanel from "../shared/ActivityJournalPanel/ActivityJournalPanel";
import { fetchClientsList } from "../../api/clients";
import styles from "../EnterprisesPage/EnterpriseDetailPage.module.css";
import localStyles from "./PrestataireDetailPage.module.css";
import SmartTooltip from "../SmartTooltip";
import StatusDot from "../shared/StatusDot/StatusDot";
import { getClientNumber, getClientNameWithoutCode } from "../../utils/clientDisplay";
import PrestataireFormModal from "./PrestataireFormModal";
import ClientTicketBookmarks from "../ContactsPage/ClientTicketBookmarks";
import { usePermissions } from "../../contexts/PermissionsContext";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import {
  getPrestataireDetailCopy,
  getPrestataireStatusLocalized,
  interpolate
} from "./prestataireDetailI18n";
import { getTicketStatusLabels } from "../ContactsPage/contactDetailI18n";
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
import CrmDetailPageSkeleton from "../EnterprisesPage/CrmDetailPageSkeleton";

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
const sortTicketsByRecent = (a, b) => {
  const aTime = new Date(a?.last_side_conversation_at || a?.updated_at || a?.created_at || 0).getTime();
  const bTime = new Date(b?.last_side_conversation_at || b?.updated_at || b?.created_at || 0).getTime();
  return bTime - aTime;
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
  const ticketStatusLabels = useMemo(() => getTicketStatusLabels(locale), [locale]);
  const { can } = usePermissions();
  const canEdit = can("prestataires_detail.edit");
  const canDelete = can("prestataires_detail.delete");

  const [prestataire, setPrestataire] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [allClients, setAllClients] = useState([]);
  const [mentionedTickets, setMentionedTickets] = useState([]);
  const [loadingActivity, setLoadingActivity] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [quickActionsExpanded, setQuickActionsExpanded] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [overviewTab, setOverviewTab] = useState("activity");
  const [companiesSectionExpanded, setCompaniesSectionExpanded] = useState(true);
  const [contactsSectionExpanded, setContactsSectionExpanded] = useState(true);
  const loadControllerRef = useRef(null);
  const activityControllerRef = useRef(null);
  const clientsListControllerRef = useRef(null);
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

  const openMentionedTickets = useMemo(
    () => mentionedTickets.filter(isOpenTicket).sort(sortTicketsByRecent),
    [mentionedTickets]
  );
  const closedMentionedTickets = useMemo(
    () => mentionedTickets.filter(ticket => !isOpenTicket(ticket)).sort(sortTicketsByRecent),
    [mentionedTickets]
  );
  const openTicketsCount = openMentionedTickets.length;

  const resolveId = () =>
    prestataireData?.prestataireId || prestataireData?.id || urlPrestataireId;

  const loadActivity = useCallback(
    async (prestataireId, signal) => {
      if (!prestataireId) return;
      setLoadingActivity(true);
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
        if (isMountedRef.current) setMentionedTickets([]);
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
      if (window.updateTabTitle && cached.prestataire.nom) {
        window.updateTabTitle("PrestataireDetail", {
          prestataireId: id,
          nom: cached.prestataire.nom
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
      if (window.updateTabTitle && fetched.nom) {
        window.updateTabTitle("PrestataireDetail", {
          prestataireId: id,
          nom: fetched.nom
        });
      }
      activityControllerRef.current?.abort();
      const activityController = createTrackedAbortController();
      activityControllerRef.current = activityController;
      loadActivity(fetched.id, activityController.signal);
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

  if (loading && !prestataire) {
    return (
      <CrmDetailPageSkeleton
        loadingAria={copy.loading || "Chargement…"}
        titleHint={prestataireData?.nom || ""}
        showMidSlot
        tabCount={1}
        body="activity"
        showAside
        asideSections={3}
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
  const primaryPhone = primaryContact?.telephone || "";
  const emailHref = primaryEmail ? toMailtoHref(primaryEmail) : "";
  const phoneHref = primaryPhone ? toTelHref(primaryPhone) : "";
  const websiteHref = prestataire.site_web
    ? prestataire.site_web.startsWith("http")
      ? prestataire.site_web
      : `https://${prestataire.site_web}`
    : "";

  return (
    <div
      className={`${styles.contratDetailPage} ${styles.enterpriseDetailPage} ${styles.prestataireDetailPage} ${localStyles.prestataireDetailPage} msp-page-grid`}
    >
      <header className={styles.pageHero}>
        <div className={styles.heroTop}>
          <div className={styles.heroIdentityBlock}>
            <div className={styles.heroCover} aria-hidden />
            <div className={styles.heroIdentityRow}>
              <div className={styles.heroMain}>
                <span className={styles.heroBrandIcon} aria-hidden>
                  <Icon icon="mdi:handshake-outline" width={30} height={30} />
                </span>
                <div className={styles.heroText}>
                  <h1 className={styles.heroTitle}>
                    <span className={styles.heroTitleName}>{displayName}</span>
                    <span className={`${styles.heroStatusBadge} ${status.status === "active" ? "" : styles.heroStatusBadgeInactive}`.trim()}>
                      <StatusDot
                        active={status.status === "active"}
                        label=""
                        className={styles.heroTitleStatus}
                      />
                      {status.label}
                    </span>
                  </h1>
                  <div className={styles.heroMeta} aria-label={copy.heroMetaAria}>
                    {prestataire.type ? (
                      <span className={styles.heroMetaItem}>
                        <Icon icon="mdi:tag-outline" aria-hidden />
                        {prestataire.type}
                      </span>
                    ) : null}
                    {websiteHref ? (
                      <a
                        href={websiteHref}
                        className={`${styles.heroMetaItem} ${styles.heroMetaLink}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <Icon icon="mdi:web" aria-hidden />
                        {prestataire.site_web}
                      </a>
                    ) : null}
                    {prestataire.adresse ? (
                      <span className={styles.heroMetaItem}>
                        <Icon icon="mdi:map-marker-outline" aria-hidden />
                        {prestataire.adresse}
                      </span>
                    ) : null}
                    {prestataire.notes ? (
                      <span className={`${styles.heroMetaItem} ${localStyles.heroMetaNotes}`} title={prestataire.notes}>
                        <Icon icon="mdi:note-text-outline" aria-hidden />
                        <span>{prestataire.notes}</span>
                      </span>
                    ) : null}
                    {primaryEmail ? (
                      <a href={emailHref} className={`${styles.heroMetaItem} ${styles.heroMetaLink}`}>
                        <Icon icon="mdi:email-outline" aria-hidden />
                        {primaryEmail}
                      </a>
                    ) : null}
                    {primaryPhone ? (
                      <a href={phoneHref} className={`${styles.heroMetaItem} ${styles.heroMetaLink}`}>
                        <Icon icon="mdi:phone-outline" aria-hidden />
                        {primaryPhone}
                      </a>
                    ) : null}
                    {companies.length > 0 ? (
                      <span className={styles.heroMetaItem}>
                        <Icon icon="mdi:domain" aria-hidden />
                        {interpolate(copy.companiesCount, { count: companies.length })}
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className={styles.heroPlanningFrise}>
                <ClientTicketBookmarks
                  openTickets={openMentionedTickets}
                  closedTickets={closedMentionedTickets}
                  loading={loadingActivity}
                  statusLabels={ticketStatusLabels}
                  onTicketClick={handleOpenTicket}
                  clients={allClients}
                  heroFrise
                  collapseStorageKey="veritas.heroBookmarks.prestataireTickets.collapsed"
                />
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className={`${styles.pageBody} ${styles.pageBodyFill}`.trim()}>
        <div className={styles.pageGrid}>
          <main
            className={`${styles.mainColumn} ${overviewTab === "activity" || overviewTab === "logs" ? styles.mainColumnActivity : ""}`.trim()}
          >
            <nav className={styles.heroTabBar} role="tablist" aria-label={copy.overviewTabsAria}>
              <button
                type="button"
                role="tab"
                aria-selected={overviewTab === "activity"}
                className={`${styles.heroTab} ${overviewTab === "activity" ? styles.heroTabActive : ""}`}
                onClick={() => setOverviewTab("activity")}
              >
                <Icon icon="mdi:clipboard-text-clock-outline" className={styles.heroTabIcon} aria-hidden />
                <span className={styles.heroTabLabel}>{copy.overviewTabActivity}</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={overviewTab === "logs"}
                className={`${styles.heroTab} ${overviewTab === "logs" ? styles.heroTabActive : ""}`}
                onClick={() => setOverviewTab("logs")}
              >
                <Icon icon="mdi:history" className={styles.heroTabIcon} aria-hidden />
                <span className={styles.heroTabLabel}>{copy.overviewTabLogs || "Logs"}</span>
              </button>
            </nav>
            {overviewTab === "activity" ? (
              <div className={styles.overviewTabPanel}>
              <div className={styles.activityLayout}>
                <div className={styles.activityKpiRow}>
                  <div className={styles.activityKpiCard}>
                    <span className={styles.activityKpiValue}>{mentionedTickets.length}</span>
                    <span className={styles.activityKpiLabel}>{copy.kpiTicketsTotal}</span>
                  </div>
                  <div className={styles.activityKpiCard}>
                    <span className={styles.activityKpiValue}>{openTicketsCount}</span>
                    <span className={styles.activityKpiLabel}>{copy.kpiTicketsOpen}</span>
                  </div>
                  <div className={styles.activityKpiCard}>
                    <span className={styles.activityKpiValue}>{companies.length}</span>
                    <span className={styles.activityKpiLabel}>{copy.kpiCompanies}</span>
                  </div>
                  <div className={styles.activityKpiCard}>
                    <span className={styles.activityKpiValue}>{contacts.length}</span>
                    <span className={styles.activityKpiLabel}>{copy.kpiContacts}</span>
                  </div>
                </div>

                <div className={styles.activityGridSplit}>
                  <section className={styles.panel}>
                    <div className={styles.panelHeader}>
                      <div className={styles.panelHeaderMain}>
                        <h2 className={styles.panelTitle}>
                          <Icon icon="mdi:ticket-outline" className={styles.panelTitleIcon} aria-hidden />
                          {copy.mentionedTicketsTitle}
                        </h2>
                      </div>
                      <span className={styles.activityBlockCount}>
                        {interpolate(copy.openCount, { count: openTicketsCount })}
                      </span>
                    </div>
                    <div className={styles.panelBody}>
                      <p className={localStyles.panelHint}>{copy.mentionedTicketsHint}</p>
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
                            {loadingActivity && mentionedTickets.length === 0 ? (
                              <tr className={styles.dataTableEmptyRow}>
                                <td colSpan={5} className={styles.dataTableEmptyCell}>
                                  {copy.loading}
                                </td>
                              </tr>
                            ) : mentionedTickets.length === 0 ? (
                              <tr className={styles.dataTableEmptyRow}>
                                <td colSpan={5} className={styles.dataTableEmptyCell}>
                                  {copy.emptyMentionedTickets}
                                </td>
                              </tr>
                            ) : (
                              mentionedTickets.slice(0, 12).map(ticket => {
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
                                    <td
                                      className={styles.activityTitleCell}
                                      title={ticket.title || ticket.side_conversation_subject || undefined}
                                    >
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
                              })
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </section>

                  <section className={styles.panel}>
                    <div className={styles.panelHeader}>
                      <div className={styles.panelHeaderMain}>
                        <h2 className={styles.panelTitle}>
                          <Icon icon="mdi:domain" className={styles.panelTitleIcon} aria-hidden />
                          {copy.companies}
                        </h2>
                      </div>
                      <span className={styles.activityBlockCount}>
                        {interpolate(copy.companiesCount, { count: companies.length })}
                      </span>
                    </div>
                    <div className={styles.panelBody}>
                      {companies.length === 0 ? (
                        <div className={styles.emptyState}>
                          <Icon icon="mdi:domain" className={styles.emptyIcon} />
                          <p>{copy.noCompanies}</p>
                        </div>
                      ) : (
                        <ul className={styles.sidebarContactsList}>
                          {companies.map(company => {
                            const { code, label } = resolveCompanyLabel(company);
                            return (
                              <SmartTooltip
                                as="li"
                                key={company.id}
                                className={styles.sidebarContactItem}
                                content={copy.viewEnterprise}
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
                              </SmartTooltip>
                            );
                          })}
                        </ul>
                      )}
                    </div>
                  </section>
                </div>
              </div>
              </div>
            ) : null}

            {overviewTab === "logs" && prestataire?.id ? (
              <div className={styles.overviewTabPanel} data-guide="prestataire-logs-panel">
                <ActivityJournalPanel
                  entityId={prestataire.id}
                  active={overviewTab === "logs"}
                  fetchLogs={(page, options) =>
                    getPrestataireLogs(prestataire.id, page, options?.limit || 25, options)
                  }
                  purgeLogs={() => purgePrestataireLogs(prestataire.id)}
                />
              </div>
            ) : null}
          </main>

          <div className={styles.asideStack}>
            <section className={styles.quickActionsCard} data-guide="prestataire-quick-actions" aria-label={copy.quickActions?.title || "Actions rapides"}>
              <h3 className={styles.quickActionsTitle}>{copy.quickActions?.title || "Actions rapides"}</h3>
              <ul className={styles.quickActionsList}>
                {canEdit ? (
                  <li>
                    <button type="button" className={styles.quickActionItem} onClick={handleOpenEdit}>
                      <span className={styles.quickActionIcon} aria-hidden>
                        <Icon icon="mdi:pencil-outline" />
                      </span>
                      <span className={styles.quickActionLabel}>{copy.quickActions?.editPrestataire || copy.editPrestataire}</span>
                      <Icon icon="mdi:chevron-right" className={styles.quickActionChevron} aria-hidden />
                    </button>
                  </li>
                ) : null}
                {emailHref ? (
                  <li>
                    <button type="button" className={styles.quickActionItem} onClick={() => { window.location.href = emailHref; }}>
                      <span className={styles.quickActionIcon} aria-hidden>
                        <Icon icon="mdi:email-outline" />
                      </span>
                      <span className={styles.quickActionLabel}>{copy.quickActions?.sendEmail || "Envoyer un email"}</span>
                      <Icon icon="mdi:chevron-right" className={styles.quickActionChevron} aria-hidden />
                    </button>
                  </li>
                ) : null}
                {websiteHref ? (
                  <li>
                    <button type="button" className={styles.quickActionItem} onClick={() => window.open(websiteHref, "_blank", "noopener,noreferrer")}>
                      <span className={styles.quickActionIcon} aria-hidden>
                        <Icon icon="mdi:web" />
                      </span>
                      <span className={styles.quickActionLabel}>{copy.quickActions?.openWebsite || "Ouvrir le site web"}</span>
                      <Icon icon="mdi:chevron-right" className={styles.quickActionChevron} aria-hidden />
                    </button>
                  </li>
                ) : null}
                {quickActionsExpanded ? (
                  <>
                    {companies.map(company => (
                      <li key={company.id}>
                        <button type="button" className={styles.quickActionItem} onClick={() => openEnterprise(company)}>
                          <span className={styles.quickActionIcon} aria-hidden>
                            <Icon icon="mdi:domain" />
                          </span>
                          <span className={styles.quickActionLabel}>{company.name || copy.viewEnterprise}</span>
                          <Icon icon="mdi:chevron-right" className={styles.quickActionChevron} aria-hidden />
                        </button>
                      </li>
                    ))}
                    {canDelete ? (
                      <li>
                        <button type="button" className={styles.quickActionItem} onClick={handleDelete} disabled={deleting}>
                          <span className={styles.quickActionIcon} aria-hidden>
                            <Icon icon="mdi:trash-can-outline" />
                          </span>
                          <span className={styles.quickActionLabel}>
                            {deleting ? copy.deleting : copy.quickActions?.deletePrestataire || copy.deletePrestataire}
                          </span>
                          <Icon icon="mdi:chevron-right" className={styles.quickActionChevron} aria-hidden />
                        </button>
                      </li>
                    ) : null}
                  </>
                ) : null}
              </ul>
              <button
                type="button"
                className={styles.quickActionsSeeAll}
                onClick={() => setQuickActionsExpanded(prev => !prev)}
              >
                {copy.quickActions?.seeAll || "Voir toutes les actions"}
                <Icon icon={quickActionsExpanded ? "mdi:chevron-up" : "mdi:arrow-right"} aria-hidden />
              </button>
            </section>
          <aside className={styles.asidePanel}>
            <div className={styles.rightSidebarContent}>
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
                      <SmartTooltip content={copy.editPrestataire}>
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
                      </SmartTooltip>
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
                            <SmartTooltip
                              as="li"
                              key={`aside-${company.id}`}
                              className={styles.sidebarContactItem}
                              content={copy.viewEnterprise}
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
                            </SmartTooltip>
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
