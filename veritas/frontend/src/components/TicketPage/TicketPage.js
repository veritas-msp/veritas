import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@iconify/react";
import { FaTimes, FaChevronLeft, FaChevronRight, FaPlus } from "react-icons/fa";
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { toast } from "react-toastify";
import layout from "../EnterprisesPage/EnterprisesPage.module.css";
import styles from "./TicketPage.module.css";
import SmartTooltip from "../SmartTooltip";
import { searchTickets, fetchAllMatchingTickets, restoreTicket, permanentlyDeleteTicket, fetchTicketViews, fetchTicketViewCounts, fetchTicketSatisfactionCounts, bulkUpdateTickets, updateTicketView, fetchTicketTableColumns } from "../../api/tickets";
import { fetchUsers } from "../../api/users";
import { fetchClientsList, fetchContactsList } from "../../api/clients";
import { useAuthContext } from "../../contexts/AuthContext";
import { usePermissions } from "../../contexts/PermissionsContext";
import { useVeritasEdition } from "../../hooks/useVeritasEdition";
import { useDefaultPageSize } from "../../hooks/useDefaultPageSize";
import { useAppFormatters, useAppLocale } from "../../hooks/useAppGeneralSettings";
import { useCommonCopy } from "../../hooks/useCommonCopy";
import { formatPageInfo } from "../../i18n/commonI18n";
import { interpolate } from "../../i18n/translate";
import { getBuiltinTicketViews, DEFAULT_TICKET_VIEW_ID, canUserEditTicketView } from "../../utils/ticketViewConstants";
import { usePersistedTicketViewId } from "../../utils/ticketLastViewStorage";
import TicketViewModal from "./TicketViewModal";
import TicketColumnsModal from "./TicketColumnsModal";
import { buildTicketSubjectTooltip } from "./ticketSubjectTooltip";
import {
  DEFAULT_TICKET_TABLE_COLUMNS,
  TICKET_TABLE_COLUMN_SORT_KEYS,
  filterColumnsForEdition
} from "../../utils/ticketTableColumns";
import TicketBulkActionModal from "./TicketBulkActionModal";
import TicketConfirmModal from "./TicketConfirmModal";
import playModeStyles from "./ticketPlayMode.module.css";
import { isTicketPlayModeEnabled, navigateToRandomTicket, setTicketPlayModeEnabled } from "./ticketPlayModeUtils";
import { getTicketSlaDisplay } from "../../utils/ticketSlaUtils";
import ClientOnboardingBadge from "../Misc/ClientOnboardingBadge/ClientOnboardingBadge";
import { TICKET_SATISFACTION_VIEWS, TICKET_SATISFACTION_VIEW_IDS, isTicketSatisfactionViewId, resolveTicketSatisfactionScope, localizeTicketSatisfactionViews } from "../../utils/ticketSatisfactionViewConstants";
import TicketSatisfactionsPanel from "./TicketSatisfactionsPanel";
import { getTicketPageCopy } from "./ticketPageI18n";
import MspPageHero from "../Misc/MspPageHero/MspPageHero";
import mspStyles from "../CybersecuritePage/CybersecuritePage.module.css";
import { createTrackedAbortController } from "../../utils/pageLoadAbort";
const VIEW_SECTION_KEYS = ["public", "assigned", "private"];
const PAGE_SCOPE = "ticket";
const VIEWS_PANE_COLLAPSED_KEY = "veritas_ticket_views_collapsed";
function readViewsPaneCollapsed() {
  try {
    return localStorage.getItem(VIEWS_PANE_COLLAPSED_KEY) === "1";
  } catch {
    return false;
  }
}
function writeViewsPaneCollapsed(collapsed) {
  try {
    if (collapsed) localStorage.setItem(VIEWS_PANE_COLLAPSED_KEY, "1");else localStorage.removeItem(VIEWS_PANE_COLLAPSED_KEY);
  } catch {}
}
function orderViewsByIds(views, ids) {
  if (!Array.isArray(ids) || ids.length === 0) return views;
  const map = new Map(views.map(view => [String(view.id), view]));
  const ordered = ids.map(id => map.get(String(id))).filter(Boolean);
  const remaining = views.filter(view => !ids.includes(String(view.id)));
  return [...ordered, ...remaining];
}
function buildCustomViewsOrder(sections = {}) {
  const ordered = [];
  VIEW_SECTION_KEYS.forEach(key => {
    (sections[key] || []).forEach(id => ordered.push(String(id)));
  });
  return ordered;
}
function SortableViewRow({
  view,
  isActive,
  count,
  editable,
  reorderMode,
  onSelect,
  onEdit,
  copy
}) {
  const canDrag = reorderMode && editable;
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({
    id: String(view.id),
    disabled: !canDrag
  });
  const style = canDrag ? {
    transform: CSS.Transform.toString(transform),
    transition
  } : undefined;
  return <div ref={canDrag ? setNodeRef : undefined} style={style} className={`${styles.viewItem} ${isActive ? styles.viewItemActive : ""} ${isDragging ? styles.viewItemDragging : ""} ${reorderMode ? styles.viewItemReorderMode : ""}`} onClick={reorderMode ? undefined : () => onSelect(view)} onKeyDown={reorderMode ? undefined : e => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onSelect(view);
    }
  }} role={reorderMode ? undefined : "button"} tabIndex={reorderMode ? undefined : 0} title={view.description || view.name} aria-pressed={reorderMode ? undefined : isActive}>
      {canDrag ? <button type="button" className={styles.viewItemDragHandle} aria-label={copy.formatDragViewAria(view.name)} onClick={event => event.stopPropagation()} {...attributes} {...listeners}>
          <Icon icon="mdi:drag-vertical" aria-hidden />
        </button> : null}
      <span className={styles.viewItemMain}>
        <span className={styles.viewItemCount} aria-label={copy.formatViewTicketCountAria(count)}>
          {count}
        </span>
        <Icon icon={view.icon || "mdi:view-list"} className={styles.viewItemIcon} aria-hidden />
        <span className={styles.viewItemLabel}>{view.name}</span>
      </span>
      {editable && !reorderMode ? <button type="button" className={styles.viewItemEditBtn} title={copy.views.editView} aria-label={copy.formatEditViewAria(view.name)} onClick={event => onEdit(view, event)}>
          <Icon icon="mdi:pencil-outline" aria-hidden />
        </button> : null}
    </div>;
}
function SortableViewsSection({
  sectionKey,
  views,
  reorderMode,
  sensors,
  onDragEnd,
  children
}) {
  if (!reorderMode || views.length === 0) {
    return children;
  }
  return <DndContext id={`ticket-views-${sectionKey}`} sensors={sensors} collisionDetection={closestCenter} onDragEnd={event => onDragEnd(sectionKey, event)}>
      <SortableContext items={views.map(view => String(view.id))} strategy={verticalListSortingStrategy}>
        {children}
      </SortableContext>
    </DndContext>;
}
function normalizeStatus(status) {
  return status === "open" ? "new" : status;
}
function isMajorIncidentTicket(ticket) {
  return Boolean(ticket?.is_major_incident);
}
function toCsvCell(value) {
  const str = String(value ?? "");
  if (str.includes('"') || str.includes(";") || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}
export default function TicketPage({
  onNavigate,
  pageParams = null,
  onPageParamsConsumed
}) {
  const {
    user,
    userRole
  } = useAuthContext();
  const {
    can
  } = usePermissions();
  const {
    isCommunity
  } = useVeritasEdition();
  const {
    formatDate: formatAppDate,
    formatDateTime: formatAppDateTime
  } = useAppFormatters();
  const commonCopy = useCommonCopy();
  const locale = useAppLocale();
  const pageCopy = useMemo(() => getTicketPageCopy(locale), [locale]);
  const builtinTicketViews = useMemo(() => getBuiltinTicketViews(locale), [locale]);
  const formatDate = useCallback(value => {
    const formatted = formatAppDate(value);
    return formatted === "-" ? "-" : formatted;
  }, [formatAppDate]);
  const formatDateTime = useCallback(value => {
    const formatted = formatAppDateTime(value);
    return formatted === "-" ? "-" : formatted;
  }, [formatAppDateTime]);
  const isAdmin = userRole === "admin";
  const canCreateTicket = can("tickets.create");
  const canExportTickets = can("tickets.export");
  const canPublicViews = can("tickets.public_views");
  const canManageViews = can("tickets.manage_views");
  const canCustomerFeedback = can("tickets.customer_feedback");
  const canAllCustomerFeedback = can("tickets.all_customer_feedback");
  const canRandomMode = can("tickets.random_mode");
  const canTrash = can("tickets.trash");
  const canHardPurge = isAdmin || can("tickets.manage");
  const [tickets, setTickets] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [viewCounts, setViewCounts] = useState({});
  const [exporting, setExporting] = useState(false);
  const [users, setUsers] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [ticketType, setTicketType] = useState("");
  const [sortBy, setSortBy] = useState("updated_at");
  const [sortDirection, setSortDirection] = useState("desc");
  const [viewMode, setViewMode] = useState("active");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useDefaultPageSize();
  const [ticketViews, setTicketViews] = useState([]);
  const [viewsLoading, setViewsLoading] = useState(false);
  const [viewsLoaded, setViewsLoaded] = useState(false);
  const [activeViewId, setActiveViewId] = usePersistedTicketViewId(PAGE_SCOPE, user?.id, DEFAULT_TICKET_VIEW_ID);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [editingView, setEditingView] = useState(null);
  const [viewsReorderMode, setViewsReorderMode] = useState(false);
  const [customViewsOrder, setCustomViewsOrder] = useState(null);
  const [viewsOrderSaving, setViewsOrderSaving] = useState(false);
  const [viewsPaneCollapsed, setViewsPaneCollapsed] = useState(readViewsPaneCollapsed);
  const [playMode, setPlayMode] = useState(() => isTicketPlayModeEnabled());
  const [loadingRandom, setLoadingRandom] = useState(false);
  const [slaNow, setSlaNow] = useState(() => Date.now());
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [confirmModal, setConfirmModal] = useState(null);
  const [satisfactionCounts, setSatisfactionCounts] = useState({
    mine: 0,
    all: 0
  });
  const [columnsModalOpen, setColumnsModalOpen] = useState(false);
  const [publicTableColumns, setPublicTableColumns] = useState(() => [...DEFAULT_TICKET_TABLE_COLUMNS]);
  const [privateTableColumns, setPrivateTableColumns] = useState(null);
  const [visibleTableColumns, setVisibleTableColumns] = useState(() => [...DEFAULT_TICKET_TABLE_COLUMNS]);
  const ticketsSearchAbortRef = useRef(null);
  const hasLoadedTicketsOnceRef = useRef(false);
  const isSatisfactionView = isTicketSatisfactionViewId(activeViewId);
  const satisfactionScope = resolveTicketSatisfactionScope(activeViewId);
  const visibleSatisfactionViews = useMemo(
    () => localizeTicketSatisfactionViews(pageCopy.views?.satisfactionViews, { isAdmin: canAllCustomerFeedback })
      .filter(view => view.scope !== "mine" || canCustomerFeedback),
    [pageCopy.views?.satisfactionViews, canAllCustomerFeedback, canCustomerFeedback]
  );
  const tableColumns = useMemo(
    () => filterColumnsForEdition(visibleTableColumns, { isCommunity }),
    [visibleTableColumns, isCommunity]
  );
  const tableColSpan = tableColumns.length + 1 + (viewMode === "trash" ? 1 : 0);
  useEffect(() => {
    const timer = window.setInterval(() => setSlaNow(Date.now()), 60000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    const controller = createTrackedAbortController();
    (async () => {
      try {
        const data = await fetchTicketTableColumns("ticket", {
          signal: controller.signal
        });
        if (controller.signal.aborted) return;
        setPublicTableColumns(Array.isArray(data?.public) ? data.public : [...DEFAULT_TICKET_TABLE_COLUMNS]);
        setPrivateTableColumns(Array.isArray(data?.private) && data.private.length ? data.private : null);
        setVisibleTableColumns(
          Array.isArray(data?.effective) && data.effective.length
            ? data.effective
            : [...DEFAULT_TICKET_TABLE_COLUMNS]
        );
      } catch (error) {
        if (error?.name === "AbortError") return;
        toast.error(pageCopy.toasts?.loadColumns || "Error loading columns");
      }
    })();
    return () => {
      controller.abort();
    };
  }, [pageCopy.toasts?.loadColumns]);
  useEffect(() => {
    if (viewMode === "trash" && viewsReorderMode) {
      setViewsReorderMode(false);
      setCustomViewsOrder(null);
    }
  }, [viewMode, viewsReorderMode]);
  const customTicketViews = useMemo(() => ticketViews.filter(view => !view.isBuiltin), [ticketViews]);
  const activeView = useMemo(() => {
    const satisfactionView = visibleSatisfactionViews.find(view => String(view.id) === String(activeViewId));
    if (satisfactionView) return satisfactionView;
    if (isTicketSatisfactionViewId(activeViewId)) {
      return TICKET_SATISFACTION_VIEWS.find(view => String(view.id) === String(activeViewId));
    }
    const builtin = builtinTicketViews.find(view => String(view.id) === String(activeViewId));
    if (builtin) return builtin;
    if (String(activeViewId) === "__all__") {
      return builtinTicketViews.find(view => view.id === DEFAULT_TICKET_VIEW_ID) || builtinTicketViews[builtinTicketViews.length - 1];
    }
    const found = ticketViews.find(view => String(view.id) === String(activeViewId));
    return found || builtinTicketViews.find(view => view.id === DEFAULT_TICKET_VIEW_ID) || builtinTicketViews[builtinTicketViews.length - 1];
  }, [ticketViews, activeViewId, builtinTicketViews, visibleSatisfactionViews]);
  useEffect(() => {
    if (!viewsLoaded) return;
    if (builtinTicketViews.some(view => String(view.id) === String(activeViewId))) return;
    if (isTicketSatisfactionViewId(activeViewId)) return;
    if (String(activeViewId) === "__all__") {
      setActiveViewId(DEFAULT_TICKET_VIEW_ID);
      return;
    }
    if (!ticketViews.some(view => String(view.id) === String(activeViewId))) {
      setActiveViewId(DEFAULT_TICKET_VIEW_ID);
    }
  }, [ticketViews, activeViewId, builtinTicketViews, viewsLoaded]);
  useEffect(() => {
    if (!canAllCustomerFeedback && activeViewId === TICKET_SATISFACTION_VIEW_IDS.ALL) {
      setActiveViewId(canCustomerFeedback ? TICKET_SATISFACTION_VIEW_IDS.MINE : DEFAULT_TICKET_VIEW_ID);
    } else if (!canCustomerFeedback && activeViewId === TICKET_SATISFACTION_VIEW_IDS.MINE) {
      setActiveViewId(DEFAULT_TICKET_VIEW_ID);
    }
  }, [canAllCustomerFeedback, canCustomerFeedback, activeViewId]);
  useEffect(() => {
    if (!canTrash && viewMode === "trash") {
      setViewMode("active");
    }
  }, [canTrash, viewMode]);
  useEffect(() => {
    const viewId = String(pageParams?.viewId || "").trim();
    const nextViewMode = String(pageParams?.viewMode || "").trim();
    if (!viewId && nextViewMode !== "trash" && nextViewMode !== "active") return;
    if (viewId) setActiveViewId(viewId);
    if (nextViewMode === "trash" && canTrash) setViewMode("trash");
    else if (nextViewMode === "active") setViewMode("active");
    onPageParamsConsumed?.();
  }, [pageParams, onPageParamsConsumed, canTrash]);
  const loadViews = async (signal) => {
    setViewsLoading(true);
    try {
      const rows = await fetchTicketViews("ticket", {
        signal
      });
      if (signal?.aborted) return;
      setTicketViews(Array.isArray(rows) ? rows : []);
      await loadViewCounts(signal);
    } catch (error) {
      if (error?.name === "AbortError") return;
      toast.error(error.message || pageCopy.toasts.loadViews);
      setTicketViews([]);
    } finally {
      if (!signal?.aborted) {
        setViewsLoading(false);
        setViewsLoaded(true);
      }
    }
  };
  const loadSatisfactionCounts = useCallback(async (signal) => {
    try {
      const counts = await fetchTicketSatisfactionCounts({
        signal
      });
      if (signal?.aborted) return;
      setSatisfactionCounts({
        mine: Number(counts?.mine) || 0,
        all: Number(counts?.all) || 0
      });
    } catch (error) {
      if (error?.name === "AbortError") return;
      setSatisfactionCounts({
        mine: 0,
        all: 0
      });
    }
  }, []);
  useEffect(() => {
    const controller = createTrackedAbortController();
    loadViews(controller.signal);
    loadSatisfactionCounts(controller.signal);
    return () => controller.abort();
  }, []);
  useEffect(() => {
    const trimmed = search.trim();
    if (!trimmed) {
      setDebouncedSearch("");
      return undefined;
    }
    const timer = window.setTimeout(() => {
      setDebouncedSearch(trimmed);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [search]);
  const isSearchPending = search.trim() !== debouncedSearch;
  const loadViewCounts = useCallback(async (signal) => {
    try {
      const result = await fetchTicketViewCounts({
        scope: "views",
        signal
      });
      if (signal?.aborted) return;
      setViewCounts(result?.views && typeof result.views === "object" ? result.views : {});
    } catch (error) {
      if (error?.name === "AbortError") return;
      console.error(error);
      setViewCounts({});
    }
  }, []);
  const refreshCountsAfterMutation = useCallback(async () => {
    await loadViewCounts();
  }, [loadViewCounts]);
  const loadReferenceData = useCallback(async (signal) => {
    try {
      const [userRows, contactRows, clientRows] = await Promise.all([fetchUsers({
        signal
      }).catch(error => error?.name === "AbortError" ? Promise.reject(error) : []), fetchContactsList(null, {
        signal
      }).catch(error => error?.name === "AbortError" ? Promise.reject(error) : []), fetchClientsList({
        signal
      }).catch(error => error?.name === "AbortError" ? Promise.reject(error) : [])]);
      if (signal?.aborted) return;
      setUsers(Array.isArray(userRows) ? userRows : []);
      setContacts(Array.isArray(contactRows) ? contactRows : []);
      setClients(Array.isArray(clientRows) ? clientRows : []);
    } catch (error) {
      if (error?.name === "AbortError") return;
      toast.error(error.message || pageCopy.toasts.loadData);
    }
  }, []);
  const loadTicketsPage = useCallback(async () => {
    ticketsSearchAbortRef.current?.abort();
    const controller = createTrackedAbortController();
    ticketsSearchAbortRef.current = controller;
    const showFullLoader = !hasLoadedTicketsOnceRef.current;
    if (showFullLoader) setLoading(true);else setRefreshing(true);
    try {
      const includeViewRules = viewMode !== "trash" || activeView?.rules?.viewMode === "trash";
      const result = await searchTickets({
        ...(includeViewRules && activeView?.rules ? {
          viewRules: activeView.rules
        } : {}),
        viewMode,
        ticketType,
        search: debouncedSearch,
        sortBy,
        sortDirection,
        limit: pageSize,
        offset: (currentPage - 1) * pageSize
      }, controller.signal);
      if (controller.signal.aborted) return;
      setTickets(Array.isArray(result?.items) ? result.items : []);
      setTotalCount(Number(result?.total || 0));
      hasLoadedTicketsOnceRef.current = true;
    } catch (error) {
      if (error?.name === "AbortError" || controller.signal.aborted) return;
      toast.error(error.message || pageCopy.toasts.loadTickets);
      setTickets([]);
      setTotalCount(0);
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [activeView, viewMode, ticketType, debouncedSearch, sortBy, sortDirection, pageSize, currentPage]);
  const hasActiveSubFilters = Boolean(String(debouncedSearch || "").trim() || String(ticketType || "").trim());
  useEffect(() => {
    const controller = createTrackedAbortController();
    loadReferenceData(controller.signal);
    return () => controller.abort();
  }, [loadReferenceData]);
  useEffect(() => {
    if (viewMode === "trash" || hasActiveSubFilters || loading) return;
    const key = String(activeViewId || "");
    if (!key) return;
    setViewCounts(prev => {
      const nextCount = Number(totalCount);
      if (!Number.isFinite(nextCount) || prev[key] === nextCount) return prev;
      return {
        ...prev,
        [key]: nextCount
      };
    });
  }, [totalCount, activeViewId, viewMode, hasActiveSubFilters, loading]);
  useEffect(() => {
    if (isSatisfactionView) return undefined;
    loadTicketsPage();
    return () => ticketsSearchAbortRef.current?.abort();
  }, [loadTicketsPage, isSatisfactionView]);
  const prevActiveViewIdRef = useRef(null);
  useEffect(() => {
    const isViewSwitch = prevActiveViewIdRef.current != null && String(prevActiveViewIdRef.current) !== String(activeViewId);
    prevActiveViewIdRef.current = activeViewId;
    if (activeView.sortBy) setSortBy(activeView.sortBy);
    if (activeView.sortDirection) setSortDirection(activeView.sortDirection);
    if (isViewSwitch) {
      setTicketType("");
      const nextViewMode = activeView.rules?.viewMode === "trash" ? "trash" : "active";
      setViewMode(nextViewMode);
    }
  }, [activeViewId]); // eslint-disable-line react-hooks/exhaustive-deps -- only when switching views
  const handleRestoreTicket = async ticketId => {
    try {
      await restoreTicket(ticketId);
      toast.success(pageCopy.toasts.restored);
      await loadTicketsPage();
      await refreshCountsAfterMutation();
    } catch (error) {
      toast.error(error.message || pageCopy.toasts.restoreError);
    }
  };
  const closeConfirmModal = () => {
    if (bulkDeleting) return;
    setConfirmModal(null);
  };
  const handlePermanentDelete = ticketId => {
    if (!canHardPurge) {
      toast.error(pageCopy.toasts.adminOnlyPurge);
      return;
    }
    setConfirmModal({
      title: pageCopy.bulk.purgeOneTitle,
      message: pageCopy.bulk.purgeMessage,
      confirmLabel: pageCopy.bulk.confirmPurge,
      icon: "mdi:delete-forever-outline",
      variant: "danger",
      onConfirm: async () => {
        setBulkDeleting(true);
        try {
          await permanentlyDeleteTicket(ticketId);
          toast.success(pageCopy.toasts.purged);
          setConfirmModal(null);
          await loadTicketsPage();
          await refreshCountsAfterMutation();
        } catch (error) {
          toast.error(error.message || pageCopy.toasts.purgeError);
        } finally {
          setBulkDeleting(false);
        }
      }
    });
  };
  const handleBulkRestore = async () => {
    if (selectedCount === 0) return;
    setBulkDeleting(true);
    try {
      const result = await bulkUpdateTickets({
        ticketIds: [...selectedIds],
        action: "restore"
      });
      if (result.failureCount > 0) {
        toast.warn(interpolate(pageCopy.toasts.bulkRestorePartial, {
          success: String(result.successCount),
          failure: String(result.failureCount)
        }));
      } else {
        toast.success(pageCopy.formatBulkRestored(result.successCount));
      }
      clearSelection();
      await loadTicketsPage();
      await refreshCountsAfterMutation();
    } catch (error) {
      toast.error(error.message || pageCopy.toasts.bulkRestoreError);
    } finally {
      setBulkDeleting(false);
    }
  };
  const handleBulkPurge = () => {
    if (!canHardPurge || selectedCount === 0) return;
    const label = pageCopy.formatBulkTicketLabel(selectedCount);
    setConfirmModal({
      title: interpolate(pageCopy.bulk.purgeTitle, {
        label
      }),
      message: pageCopy.bulk.purgeMessage,
      confirmLabel: pageCopy.bulk.confirmPurge,
      icon: "mdi:delete-forever-outline",
      variant: "danger",
      onConfirm: async () => {
        setBulkDeleting(true);
        try {
          const result = await bulkUpdateTickets({
            ticketIds: [...selectedIds],
            action: "purge"
          });
          if (result.failureCount > 0) {
            toast.warn(interpolate(pageCopy.toasts.bulkPurgePartial, {
              success: String(result.successCount),
              failure: String(result.failureCount)
            }));
          } else {
            toast.success(pageCopy.formatBulkPurged(result.successCount));
          }
          clearSelection();
          setConfirmModal(null);
          await loadTicketsPage();
          await refreshCountsAfterMutation();
        } catch (error) {
          toast.error(error.message || pageCopy.toasts.purgeError);
        } finally {
          setBulkDeleting(false);
        }
      }
    });
  };
  const handleExportCsv = async () => {
    if (totalCount === 0) return;
    setExporting(true);
    try {
      const {
        items,
        truncated
      } = await fetchAllMatchingTickets({
        ...(viewMode !== "trash" || activeView?.rules?.viewMode === "trash" ? activeView?.rules ? {
          viewRules: activeView.rules
        } : {} : {}),
        viewMode,
        ticketType,
        search: debouncedSearch,
        sortBy,
        sortDirection
      });
      const labelMap = {
        ticket_number: pageCopy.table.id,
        title: pageCopy.table.subject,
        channel: pageCopy.table.channel,
        type: pageCopy.table.type,
        requester: pageCopy.table.requester,
        client: pageCopy.table.client,
        assigned: pageCopy.table.assigned,
        followers: pageCopy.table.followers,
        status: pageCopy.table.status,
        priority: pageCopy.table.priority,
        sla: pageCopy.table.sla,
        created_at: pageCopy.table.created,
        updated_at: pageCopy.table.updated
      };
      const headers = tableColumns.map(columnId => labelMap[columnId] || columnId);
      const rows = items.map(t => {
        const ticketStatus = normalizeStatus(t.status);
        return tableColumns.map(columnId => {
          if (columnId === "ticket_number") return `#${t.ticket_number || "-"}`;
          if (columnId === "title") return t.title || "";
          if (columnId === "channel") return t.channel || "-";
          if (columnId === "type") return pageCopy.getTypeLabel(t.type);
          if (columnId === "requester") return resolveContactLabel(resolveRequesterContactId(t), resolveRequesterFallback(t));
          if (columnId === "client") return resolveClientLabel(t);
          if (columnId === "assigned") return resolveAssigneesLabel(t);
          if (columnId === "followers") return resolveFollowersLabel(t);
          if (columnId === "status") return pageCopy.getStatusBadge(ticketStatus) || t.status || "-";
          if (columnId === "priority") return pageCopy.getPriorityLabel(t.priority);
          if (columnId === "sla") {
            const sla = getTicketSlaDisplay(t, { clients, now: Date.now() });
            return sla?.label || "";
          }
          if (columnId === "created_at") return formatDateTime(t.created_at);
          if (columnId === "updated_at") return formatDateTime(t.updated_at);
          return "";
        });
      });
      const csvContent = [headers.map(toCsvCell).join(";"), ...rows.map(row => row.map(toCsvCell).join(";"))].join("\n");
      const blob = new Blob([`\uFEFF${csvContent}`], {
        type: "text/csv;charset=utf-8;"
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const timestamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
      link.href = url;
      link.download = `${pageCopy.export.filenamePrefix}-${timestamp}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      if (truncated) {
        toast.warn(pageCopy.export.truncated);
      }
    } catch (error) {
      toast.error(error.message || pageCopy.toasts.exportError);
    } finally {
      setExporting(false);
    }
  };
  const resolveUserLabel = (userId, fallback) => {
    const u = users.find(row => String(row.id) === String(userId));
    return u?.ticket_helpdesk_display_name || u?.name || u?.nom || u?.username || u?.email || fallback || "-";
  };
  const findContactById = contactId => {
    if (contactId === null || contactId === undefined || contactId === "") return null;
    return contacts.find(row => String(row.id) === String(contactId)) || null;
  };
  const resolveRequesterContactId = ticket => ticket?.requester_contact_id || ticket?.requesterContactId || "";
  const resolveRequesterFallback = ticket => ticket?.requester_name || ticket?.requester_full_name || ticket?.requester_contact_name || ticket?.requester_email || ticket?.requester_contact_email || "-";
  const resolveContactLabel = (contactId, fallback) => {
    const c = findContactById(contactId);
    if (!c) return fallback || "-";
    const fullName = `${c.prenom || ""} ${c.nom || ""}`.trim();
    return fullName || c.email || fallback || "-";
  };
  const resolveClientId = ticket => {
    const requesterContact = findContactById(resolveRequesterContactId(ticket));
    if (requesterContact?.client_id) return requesterContact.client_id;
    return ticket?.client_id || "";
  };
  const resolveClientLabel = ticket => {
    if (ticket?.client_name || ticket?.client_nom) {
      return ticket.client_name || ticket.client_nom;
    }
    const resolvedClientId = resolveClientId(ticket);
    if (resolvedClientId) {
      const client = clients.find(c => String(c.id) === String(resolvedClientId));
      return client?.name || client?.nom || "-";
    }
    const requesterContact = findContactById(resolveRequesterContactId(ticket));
    return requesterContact?.client_name || requesterContact?.entreprise || "-";
  };
  const resolveAssigneesLabel = ticket => {
    const assignees = Array.isArray(ticket?.assignees) ? ticket.assignees : [];
    if (assignees.length > 0) {
      const labels = assignees.map(a => {
        if (a === null || a === undefined) return "";
        if (typeof a === "string" || typeof a === "number") {
          return resolveUserLabel(a);
        }
        return resolveUserLabel(a.user_id || a.userId || a.id || a.value, a.name || a.nom || a.email || "");
      }).filter(label => label && label !== "-");
      return labels.length > 0 ? labels.join(", ") : "-";
    }
    return resolveUserLabel(ticket?.assigned_user_id, ticket?.assigned_email);
  };
  const resolveFollowersLabel = ticket => {
    const followers = Array.isArray(ticket?.watchers) ? ticket.watchers : [];
    if (followers.length === 0) {
      const followersCount = Number(ticket?.followers_count || 0);
      return followersCount > 0 ? pageCopy.formatFollowersCount(followersCount) : "-";
    }
    const labels = followers.map(w => {
      if (w === null || w === undefined) return "";
      if (typeof w === "string" || typeof w === "number") {
        return resolveUserLabel(w);
      }
      return resolveUserLabel(w.user_id || w.userId || w.id || w.value, w.name || w.nom || w.email || "");
    }).filter(label => label && label !== "-");
    if (labels.length > 0) return labels.join(", ");
    const followersCount = Number(ticket?.followers_count || followers.length || 0);
    return followersCount > 0 ? pageCopy.formatFollowersCount(followersCount) : "-";
  };
  const resolvePriorityLabel = priority => pageCopy.getPriorityLabel(priority);
  const resolveTypeLabel = type => pageCopy.getTypeLabel(type);
  const resolveTypeTooltip = type => pageCopy.getTypeTooltip(type);
  const resolveChannelMeta = channel => pageCopy.getChannelMeta(channel);
  const getPriorityVisual = (priority, ticket) => pageCopy.getPriorityVisual(priority, isMajorIncidentTicket(ticket));
  const handleSort = column => {
    if (sortBy === column) {
      setSortDirection(prev => prev === "asc" ? "desc" : "asc");
      return;
    }
    setSortBy(column);
    setSortDirection("asc");
  };
  const getSortIndicator = column => {
    if (sortBy !== column) return "";
    return sortDirection === "asc" ? " ▲" : " ▼";
  };
  const handleColumnsSaved = useCallback(result => {
    if (!result) return;
    setPublicTableColumns(Array.isArray(result.public) ? result.public : [...DEFAULT_TICKET_TABLE_COLUMNS]);
    setPrivateTableColumns(Array.isArray(result.private) && result.private.length ? result.private : null);
    setVisibleTableColumns(
      Array.isArray(result.effective) && result.effective.length
        ? result.effective
        : [...DEFAULT_TICKET_TABLE_COLUMNS]
    );
  }, []);
  const openTicket = (ticket, background = false) => {
    if (!onNavigate) return;
    onNavigate("TicketDetail", {
      ticketId: ticket.id,
      ticketNumber: ticket.ticket_number,
      title: ticket.title
    }, background ? {
      background: true
    } : undefined);
  };
  const openCreateViewModal = () => {
    if (!canManageViews) return;
    setEditingView(null);
    setViewModalOpen(true);
  };
  const openEditViewModal = (view, event) => {
    event?.stopPropagation?.();
    event?.preventDefault?.();
    if (!canUserEditTicketView(view, {
      userId: user?.id,
      isAdmin: canManageViews
    })) return;
    setEditingView(view);
    setViewModalOpen(true);
  };
  const viewReorderSensors = useSensors(useSensor(PointerSensor, {
    activationConstraint: {
      distance: 6
    }
  }), useSensor(KeyboardSensor, {
    coordinateGetter: sortableKeyboardCoordinates
  }));
  const hasReorderableViews = useMemo(() => customTicketViews.some(view => canUserEditTicketView(view, {
    userId: user?.id,
    isAdmin: canManageViews
  })), [customTicketViews, user?.id, canManageViews]);
  const persistCustomViewsOrder = useCallback(async nextOrder => {
    const orderedIds = buildCustomViewsOrder(nextOrder);
    const viewById = new Map(ticketViews.map(view => [String(view.id), view]));
    const updates = orderedIds.map((id, index) => {
      const view = viewById.get(String(id));
      if (!view) return null;
      const nextDisplayOrder = index * 10;
      if (Number(view.displayOrder ?? 0) === nextDisplayOrder) return null;
      return {
        id: view.id,
        displayOrder: nextDisplayOrder
      };
    }).filter(Boolean);
    if (updates.length === 0) return;
    await Promise.all(updates.map(entry => updateTicketView(entry.id, {
      displayOrder: entry.displayOrder
    })));
    setTicketViews(prev => prev.map(view => {
      const update = updates.find(entry => String(entry.id) === String(view.id));
      return update ? {
        ...view,
        displayOrder: update.displayOrder
      } : view;
    }));
  }, [ticketViews]);
  const toggleViewsReorderMode = () => {
    setViewsReorderMode(prev => {
      if (prev) {
        setCustomViewsOrder(null);
        return false;
      }
      setCustomViewsOrder({
        public: publicViews.map(view => String(view.id)),
        assigned: assignedViews.map(view => String(view.id)),
        private: privateViews.map(view => String(view.id))
      });
      return true;
    });
  };
  const handleViewsSectionDragEnd = useCallback(async (sectionKey, event) => {
    const {
      active,
      over
    } = event;
    if (!over || active.id === over.id || !customViewsOrder) return;
    const currentIds = [...(customViewsOrder[sectionKey] || [])];
    const oldIndex = currentIds.indexOf(String(active.id));
    const newIndex = currentIds.indexOf(String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;
    const previousOrder = customViewsOrder;
    const nextOrder = {
      ...customViewsOrder,
      [sectionKey]: arrayMove(currentIds, oldIndex, newIndex)
    };
    setCustomViewsOrder(nextOrder);
    setViewsOrderSaving(true);
    try {
      await persistCustomViewsOrder(nextOrder);
    } catch (error) {
      setCustomViewsOrder(previousOrder);
      toast.error(error.message || pageCopy.toasts.reorderViews);
    } finally {
      setViewsOrderSaving(false);
    }
  }, [customViewsOrder, persistCustomViewsOrder]);
  const renderViewItem = (view, {
    reorderMode = false
  } = {}) => {
    const isActive = String(activeViewId) === String(view.id);
    const count = getViewTicketCount(view);
    const editable = canUserEditTicketView(view, {
      userId: user?.id,
      isAdmin: canManageViews
    });
    if (reorderMode && !view.isBuiltin) {
      return <SortableViewRow key={view.id} view={view} isActive={isActive} count={count} editable={editable} reorderMode onSelect={handleSelectView} onEdit={openEditViewModal} copy={pageCopy} />;
    }
    return <div key={view.id} className={`${styles.viewItem} ${isActive ? styles.viewItemActive : ""}`} onClick={() => handleSelectView(view)} onKeyDown={e => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        handleSelectView(view);
      }
    }} role="button" tabIndex={0} title={view.description || view.name} aria-pressed={isActive}>
        <span className={styles.viewItemMain}>
          <span className={styles.viewItemCount} aria-label={pageCopy.formatViewTicketCountAria(count)}>
            {count}
          </span>
          <Icon icon={view.icon || "mdi:view-list"} className={styles.viewItemIcon} aria-hidden />
          <span className={styles.viewItemLabel}>{view.name}</span>
        </span>
        {editable ? <button type="button" className={styles.viewItemEditBtn} title={pageCopy.views.editView} aria-label={pageCopy.formatEditViewAria(view.name)} onClick={event => openEditViewModal(view, event)}>
            <Icon icon="mdi:pencil-outline" aria-hidden />
          </button> : null}
      </div>;
  };
  const renderCustomViewsSection = (sectionKey, label, views) => {
    if (views.length === 0) return null;
    const orderedViews = viewsReorderMode && customViewsOrder ? orderViewsByIds(views, customViewsOrder[sectionKey]) : views;
    return <>
        <div className={styles.viewsGroupLabel}>{label}</div>
        <SortableViewsSection sectionKey={sectionKey} views={orderedViews} reorderMode={viewsReorderMode} sensors={viewReorderSensors} onDragEnd={handleViewsSectionDragEnd}>
          {orderedViews.map(view => renderViewItem(view, {
          reorderMode: viewsReorderMode
        }))}
        </SortableViewsSection>
      </>;
  };
  const setViewsPaneCollapsedState = useCallback(collapsed => {
    setViewsPaneCollapsed(collapsed);
    writeViewsPaneCollapsed(collapsed);
  }, []);
  const getViewTicketCount = view => {
    if (view?.isSatisfactionView) {
      const key = view.scope === "all" ? "all" : "mine";
      return Number(satisfactionCounts[key]) || 0;
    }
    const key = String(view.id);
    const cached = Number(viewCounts[key]);
    const isActiveView = String(activeViewId) === key;
    if (isActiveView && !hasActiveSubFilters && viewMode !== "trash" && !loading) {
      return Number(totalCount);
    }
    return Number.isFinite(cached) ? cached : 0;
  };
  const handleSelectView = view => {
    setActiveViewId(view.id);
    if (view?.isSatisfactionView) {
      setViewMode("active");
      setTicketType("");
    }
  };
  const handleViewSaved = async saved => {
    await loadViews();
    await refreshCountsAfterMutation();
    if (saved?.id) setActiveViewId(saved.id);
    toast.success(editingView?.id ? pageCopy.toasts.viewUpdated : pageCopy.toasts.viewCreated);
  };
  const publicViews = useMemo(() => customTicketViews.filter(view => view.visibility === "public"), [customTicketViews]);
  const assignedViews = useMemo(() => customTicketViews.filter(view => view.visibility === "assigned" || view.visibility === "profile"), [customTicketViews]);
  const privateViews = useMemo(() => customTicketViews.filter(view => view.visibility === "private"), [customTicketViews]);
  const totalPages = useMemo(() => Math.max(1, Math.ceil(totalCount / pageSize)), [totalCount, pageSize]);
  const paginatedTickets = tickets;
  useEffect(() => {
    setSelectedIds(new Set());
  }, [viewMode, activeViewId, debouncedSearch, ticketType]);
  const selectedCount = selectedIds.size;
  const allOnPageSelected = paginatedTickets.length > 0 && paginatedTickets.every(ticket => selectedIds.has(ticket.id));
  const toggleTicketSelection = (ticketId, checked) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (checked) next.add(ticketId);else next.delete(ticketId);
      return next;
    });
  };
  const toggleSelectAllOnPage = () => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (allOnPageSelected) {
        paginatedTickets.forEach(ticket => next.delete(ticket.id));
      } else {
        paginatedTickets.forEach(ticket => next.add(ticket.id));
      }
      return next;
    });
  };
  const clearSelection = () => setSelectedIds(new Set());
  const handleBulkDelete = () => {
    if (!canTrash || selectedCount === 0) return;
    const label = pageCopy.formatBulkTicketLabel(selectedCount);
    setConfirmModal({
      title: interpolate(pageCopy.bulk.deleteTitle, {
        label
      }),
      message: pageCopy.bulk.deleteMessage,
      confirmLabel: pageCopy.bulk.confirmDelete,
      icon: "mdi:delete-outline",
      variant: "danger",
      onConfirm: async () => {
        setBulkDeleting(true);
        try {
          const result = await bulkUpdateTickets({
            ticketIds: [...selectedIds],
            action: "delete"
          });
          if (result.failureCount > 0) {
            toast.warn(interpolate(pageCopy.toasts.bulkDeletePartial, {
              success: String(result.successCount),
              failure: String(result.failureCount)
            }));
          } else {
            toast.success(pageCopy.formatBulkDeleted(result.successCount));
          }
          clearSelection();
          setConfirmModal(null);
          await loadTicketsPage();
          await refreshCountsAfterMutation();
        } catch (error) {
          toast.error(error.message || pageCopy.toasts.bulkDeleteError);
        } finally {
          setBulkDeleting(false);
        }
      }
    });
  };
  const handleBulkActionSuccess = async result => {
    if (result?.failureCount > 0) {
      toast.warn(interpolate(pageCopy.toasts.bulkUpdatePartial, {
        success: String(result.successCount),
        failure: String(result.failureCount)
      }));
    } else {
      toast.success(pageCopy.formatBulkUpdated(result?.successCount || selectedCount));
    }
    clearSelection();
    await loadTicketsPage();
    await refreshCountsAfterMutation();
  };
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, ticketType, sortBy, sortDirection, viewMode, pageSize, activeViewId]);
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);
  const handleRandomTicketClick = async event => {
    if (event.shiftKey) {
      setTicketPlayModeEnabled(false);
      setPlayMode(false);
      toast.info(pageCopy.playModeDisabled);
      return;
    }
    setLoadingRandom(true);
    try {
      setPlayMode(true);
      await navigateToRandomTicket(onNavigate, {
        enablePlayMode: true
      });
    } catch {
      setPlayMode(isTicketPlayModeEnabled());
    } finally {
      setLoadingRandom(false);
    }
  };
  const pageSubtitle = pageCopy.formatSubtitle(
    loading,
    viewMode,
    activeView?.name || "",
    isSatisfactionView ? getViewTicketCount(activeView) : totalCount,
    { satisfaction: isSatisfactionView }
  );
  return <div className={`${mspStyles.mspPage} ${layout.page} msp-page-grid`}>
      <div className={mspStyles.mspLayout}>
        <div className={mspStyles.mspMain}>
          <MspPageHero eyebrow={pageCopy.eyebrow} title={pageCopy.pageTitle} subtitle={pageSubtitle} icon="mdi:message-processing-outline" actions={<>
                {canTrash ? <label className={`${styles.trashSwitch} ${viewMode === "trash" ? styles.trashSwitchOn : ""}`} title={pageCopy.trashSwitchTitle}>
                  <Icon icon="mdi:trash-can-outline" className={styles.trashSwitchIcon} aria-hidden />
                  <span className={styles.trashSwitchLabel}>{pageCopy.trashSwitchLabel}</span>
                  <input type="checkbox" className={styles.trashSwitchInput} checked={viewMode === "trash"} onChange={e => {
              const showTrash = e.target.checked;
              setViewMode(showTrash ? "trash" : "active");
            }} aria-label={pageCopy.trashSwitchAria} />
                  <span className={styles.trashSwitchSlider} aria-hidden />
                </label> : null}
                {playMode && canRandomMode && <span className={playModeStyles.playModeBanner}>
                    <Icon icon="mdi:dice-5" aria-hidden />
                    {pageCopy.playModeBanner}
                  </span>}
                {canRandomMode ? <SmartTooltip content={pageCopy.playModeTooltip}>
                  <button type="button" className={`${playModeStyles.diceBtn} ${playMode ? playModeStyles.diceBtnActive : ""}`} onClick={handleRandomTicketClick} disabled={loadingRandom || viewMode === "trash"} aria-label={pageCopy.playModeAria} aria-pressed={playMode}>
                    <Icon icon={loadingRandom ? "mdi:loading" : "mdi:dice-5"} className={loadingRandom ? playModeStyles.spinning : undefined} />
                  </button>
                </SmartTooltip> : null}
                <SmartTooltip content={pageCopy.columnsSettings}>
                  <button type="button" className={layout.iconBtn} onClick={() => setColumnsModalOpen(true)} aria-label={pageCopy.columnsSettingsAria}>
                    <Icon icon="mdi:table-cog" />
                  </button>
                </SmartTooltip>
                {canExportTickets ? <SmartTooltip content={pageCopy.exportCsv}>
                  <button type="button" className={layout.iconBtn} onClick={handleExportCsv} disabled={exporting || totalCount === 0} aria-label={pageCopy.exportCsvAria}>
                    <Icon icon="mdi:download-outline" />
                  </button>
                </SmartTooltip> : null}
                {canCreateTicket ? <button type="button" className={`${layout.primaryBtn} ${layout.primaryBtnIconOnly}`} onClick={() => onNavigate?.("TicketCreate")} disabled={viewMode === "trash"} aria-label={pageCopy.newTicketAria}>
                  <FaPlus />
                </button> : null}
              </>} />

          <main className={`${mspStyles.mspContent} ${mspStyles.mspContentList}`}>
            <div className={`${layout.shell} ${layout.shellWide} ${layout.shellFull}`}>
        <div className={`${styles.viewsLayout} ${viewMode === "trash" ? styles.viewsLayoutTrash : ""} ${viewsPaneCollapsed ? styles.viewsLayoutCollapsed : ""}`.trim()}>
          {viewMode !== "trash" && !viewsPaneCollapsed && <aside className={styles.viewsPane} aria-label={pageCopy.views.paneAria}>
            <div className={styles.viewsPaneHeader}>
              <span className={styles.viewsTitle}>{pageCopy.views.title}</span>
              <div className={styles.viewsHeaderActions}>
                <SmartTooltip content={pageCopy.views.collapsePane}>
                  <button type="button" className={styles.viewsCollapseBtn} onClick={() => setViewsPaneCollapsedState(true)} title={pageCopy.views.collapsePane} aria-label={pageCopy.views.collapsePane} disabled={viewsReorderMode}>
                    <FaChevronLeft aria-hidden />
                  </button>
                </SmartTooltip>
                {hasReorderableViews ? <button type="button" className={`${styles.viewsEditBtn} ${viewsReorderMode ? styles.viewsEditBtnActive : ""}`} onClick={toggleViewsReorderMode} title={viewsReorderMode ? pageCopy.views.reorderFinish : pageCopy.views.reorderStart} aria-label={viewsReorderMode ? pageCopy.views.reorderFinish : pageCopy.views.reorderStart} aria-pressed={viewsReorderMode} disabled={viewsOrderSaving}>
                    <Icon icon={viewsReorderMode ? "mdi:check" : "mdi:pencil-outline"} aria-hidden />
                  </button> : null}
                {canManageViews ? <button type="button" className={styles.viewsAddBtn} onClick={openCreateViewModal} title={pageCopy.views.create} aria-label={pageCopy.views.create} disabled={viewsReorderMode}>
                  <FaPlus />
                </button> : null}
              </div>
            </div>
            {viewsReorderMode ? <p className={styles.viewsReorderHint}>
                {viewsOrderSaving ? pageCopy.views.saving : pageCopy.views.reorderHint}
              </p> : null}
            <div className={styles.viewsList}>
              {viewsLoading ? <div className={styles.viewsEmpty}>
                  <Icon icon="mdi:loading" className={layout.spinning} />
                  {pageCopy.views.loading}
                </div> : <>
                  <div className={styles.viewsGroupLabel}>{pageCopy.views.general}</div>
                  {builtinTicketViews.map(view => renderViewItem(view))}
                  {renderCustomViewsSection("public", pageCopy.views.team, publicViews)}
                  {renderCustomViewsSection("assigned", pageCopy.views.assigned, assignedViews)}
                  {renderCustomViewsSection("private", pageCopy.views.private, privateViews)}
                  {visibleSatisfactionViews.length > 0 ? <>
                      <div className={styles.viewsGroupLabel}>{pageCopy.views.satisfaction}</div>
                      {visibleSatisfactionViews.map(view => renderViewItem(view))}
                    </> : null}
                  {customTicketViews.length === 0 && !viewsReorderMode && !visibleSatisfactionViews.length ? <div className={styles.viewsEmpty}>
                      <p>{pageCopy.views.emptyHint}</p>
                      {canManageViews ? <button type="button" className={styles.viewsCreateLink} onClick={openCreateViewModal}>
                        {pageCopy.views.create}
                      </button> : null}
                    </div> : null}
                </>}
            </div>
          </aside>}

          <div className={styles.mainColumn}>
            {isSatisfactionView ? <TicketSatisfactionsPanel scope={satisfactionScope} onNavigate={onNavigate} leadingToolbarContent={viewMode !== "trash" && viewsPaneCollapsed ? <SmartTooltip content={pageCopy.views.expandPane}>
                      <button type="button" className={styles.viewsExpandBtn} onClick={() => setViewsPaneCollapsedState(false)} aria-label={pageCopy.views.expandPane}>
                        <FaChevronRight aria-hidden />
                        <span>{pageCopy.views.title}</span>
                      </button>
                    </SmartTooltip> : null} /> : <>
            <div className={`${layout.toolbar} ${styles.toolbarGrow}`}>
              {viewMode !== "trash" && viewsPaneCollapsed ? <SmartTooltip content={pageCopy.views.expandPane}>
                  <button type="button" className={styles.viewsExpandBtn} onClick={() => setViewsPaneCollapsedState(false)} aria-label={pageCopy.views.expandPane}>
                    <FaChevronRight aria-hidden />
                    <span>{pageCopy.views.title}</span>
                  </button>
                </SmartTooltip> : null}
              <div className={`${layout.searchWrap} ${styles.searchWrapFull}`}>
                <Icon icon={isSearchPending || refreshing ? "mdi:loading" : "mdi:magnify"} className={`${layout.searchIcon} ${isSearchPending || refreshing ? layout.spinning : ""}`.trim()} aria-hidden />
                <input type="text" inputMode="search" className={layout.searchInput} value={search} onChange={e => setSearch(e.target.value)} placeholder={pageCopy.search.placeholder} aria-label={pageCopy.search.aria} />
                {search && !isSearchPending && !refreshing ? <button type="button" className={layout.clearButton} onClick={() => setSearch("")} aria-label={pageCopy.search.clear}>
                    <FaTimes />
                  </button> : null}
              </div>
            </div>

            {loading ? <div className={layout.stateBox}>
            <Icon icon="mdi:loading" className={layout.spinning} />
            <span>{pageCopy.loadingTickets}</span>
          </div> : totalCount === 0 && !refreshing ? <div className={layout.emptyState}>
            <Icon icon="mingcute:ticket-fill" className={layout.emptyStateIcon} />
            <p className={layout.emptyStateTitle}>
              {viewMode === "trash" ? pageCopy.empty.trashTitle : pageCopy.empty.noTicketsTitle}
            </p>
            <p className={layout.emptyStateHint}>
              {viewMode === "trash" ? pageCopy.empty.trashHint : pageCopy.empty.activeHint}
            </p>
            {viewMode !== "trash" && canCreateTicket && <button type="button" className={layout.primaryBtn} onClick={() => onNavigate?.("TicketCreate")}>
                <Icon icon="mdi:plus" />
                {pageCopy.newTicket}
              </button>}
          </div> : <>
            {selectedCount > 0 && <div className={styles.bulkBar}>
                <div className={styles.bulkInfo}>
                  <strong>{selectedCount}</strong>
                  <span>{selectedCount > 1 ? pageCopy.bulk.selectedPlural : pageCopy.bulk.selected}</span>
                </div>
                <div className={styles.bulkActions}>
                  {viewMode === "trash" && <>
                      <button type="button" className={styles.bulkBtn} onClick={handleBulkRestore} disabled={bulkDeleting}>
                        <Icon icon="mdi:restore" />
                        {pageCopy.bulk.restore}
                      </button>
                      {canHardPurge && <button type="button" className={`${styles.bulkBtn} ${styles.bulkBtnDanger}`} onClick={handleBulkPurge} disabled={bulkDeleting}>
                          <Icon icon="mdi:delete-forever-outline" />
                          {bulkDeleting ? pageCopy.bulk.purgeLoading : pageCopy.bulk.purge}
                        </button>}
                    </>}
                  {viewMode !== "trash" && <button type="button" className={styles.bulkBtn} onClick={() => setBulkModalOpen(true)}>
                      <Icon icon="mdi:pencil-outline" />
                      {pageCopy.bulk.edit}
                    </button>}
                  {viewMode !== "trash" && canTrash && <button type="button" className={`${styles.bulkBtn} ${styles.bulkBtnDanger}`} onClick={handleBulkDelete} disabled={bulkDeleting}>
                      <Icon icon="mdi:delete-outline" />
                      {bulkDeleting ? pageCopy.bulk.deleteLoading : pageCopy.bulk.delete}
                    </button>}
                  <button type="button" className={styles.bulkBtnGhost} onClick={clearSelection}>
                    {pageCopy.bulk.clearSelection}
                  </button>
                </div>
              </div>}
            <div className={`${styles.tablePanel} ${refreshing ? styles.tablePanelRefreshing : ""}`.trim()}>
              <div className={styles.tableScroll}>
                <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.checkboxCell}>
                  <input type="checkbox" className={styles.rowCheckbox} checked={allOnPageSelected} onChange={toggleSelectAllOnPage} onClick={e => e.stopPropagation()} aria-label={pageCopy.table.selectAll} />
                </th>
{tableColumns.map(columnId => {
                  const sortKey = TICKET_TABLE_COLUMN_SORT_KEYS[columnId] || columnId;
                  const labelMap = {
                    ticket_number: pageCopy.table.id,
                    title: pageCopy.table.subject,
                    channel: pageCopy.table.channel,
                    type: pageCopy.table.type,
                    requester: pageCopy.table.requester,
                    client: pageCopy.table.client,
                    assigned: pageCopy.table.assigned,
                    followers: pageCopy.table.followers,
                    status: pageCopy.table.status,
                    priority: pageCopy.table.priority,
                    sla: pageCopy.table.sla,
                    created_at: pageCopy.table.created,
                    updated_at: pageCopy.table.updated
                  };
                  return (
                    <th key={columnId} onClick={() => handleSort(sortKey)}>
                      {labelMap[columnId] || columnId}
                      {getSortIndicator(sortKey)}
                    </th>
                  );
                })}
                {viewMode === "trash" && <th>{pageCopy.table.actions}</th>}
              </tr>
            </thead>
            <tbody>
              {tickets.length === 0 && refreshing ? <tr><td colSpan={tableColSpan} className={styles.empty}>{pageCopy.table.loading}</td></tr> : tickets.length === 0 ? <tr><td colSpan={tableColSpan} className={styles.empty}>{pageCopy.table.noRows}</td></tr> : paginatedTickets.map(t => {
                              const ticketStatus = normalizeStatus(t.status);
                              const majorIncident = isMajorIncidentTicket(t);
                              const isSelected = selectedIds.has(t.id);
                              return <tr key={t.id} className={`${majorIncident ? styles.majorIncidentRow : ""} ${isSelected ? styles.selectedRow : ""}`.trim() || undefined} onClick={() => openTicket(t)} onAuxClick={e => {
                                if (e.button === 1) {
                                  e.preventDefault();
                                  openTicket(t, true);
                                }
                              }}>
                      <td className={styles.checkboxCell} onClick={e => e.stopPropagation()}>
                        <input type="checkbox" className={styles.rowCheckbox} checked={isSelected} onChange={e => toggleTicketSelection(t.id, e.target.checked)} aria-label={pageCopy.formatSelectTicketAria(t.ticket_number || t.id)} />
                      </td>
{tableColumns.map(columnId => {
                        if (columnId === "ticket_number") {
                          return (
                            <td key={columnId}>
                              <span className={styles.ticketIdCell}>
                                {majorIncident ? <Icon icon="mdi:alert-octagon" className={styles.majorIncidentIcon} aria-hidden /> : null}
                                #{t.ticket_number || "-"}
                              </span>
                            </td>
                          );
                        }
                        if (columnId === "title") {
                          return (
                            <td key={columnId}>
                              <SmartTooltip as="span" className={styles.subjectCellWrap} content={buildTicketSubjectTooltip(t, {
                                typeLabel: resolveTypeLabel(t.type),
                                statusLabel: pageCopy.getStatusBadge(ticketStatus) || t.status,
                                priorityLabel: resolvePriorityLabel(t.priority),
                                isMajor: majorIncident,
                                category: t.category || null,
                                clientLabel: resolveClientLabel(t),
                                requesterLabel: resolveContactLabel(resolveRequesterContactId(t), resolveRequesterFallback(t)),
                                commentsCount: Number(t.comments_count ?? 0) || null
                              }, pageCopy)}>
                                <span className={styles.subjectCell}>
                                  {majorIncident ? <span className={styles.majorIncidentBadge}>
                                    <Icon icon="mdi:alert-octagon" aria-hidden />
                                    {pageCopy.table.majorBadge}
                                  </span> : null}
                                  <span className={styles.subjectCellText}>{t.title}</span>
                                </span>
                              </SmartTooltip>
                            </td>
                          );
                        }
                        if (columnId === "channel") {
                          return (
                            <td key={columnId}>
                              <span className={styles.channelCell} title={resolveChannelMeta(t.channel).label}>
                                <Icon icon={resolveChannelMeta(t.channel).icon} className={styles.channelIcon} />
                              </span>
                            </td>
                          );
                        }
                        if (columnId === "type") {
                          return (
                            <td key={columnId}>
                              <SmartTooltip content={resolveTypeTooltip(t.type)}>
                                <span>{resolveTypeLabel(t.type)}</span>
                              </SmartTooltip>
                            </td>
                          );
                        }
                        if (columnId === "requester") {
                          return (
                            <td key={columnId}>
                              {resolveRequesterContactId(t) ? <button type="button" className={styles.linkCellBtn} onClick={e => {
                                e.stopPropagation();
                                onNavigate?.("ContactDetail", { contactId: resolveRequesterContactId(t) });
                              }}>
                                {resolveContactLabel(resolveRequesterContactId(t), resolveRequesterFallback(t))}
                              </button> : <span>{resolveContactLabel(resolveRequesterContactId(t), resolveRequesterFallback(t))}</span>}
                            </td>
                          );
                        }
                        if (columnId === "client") {
                          const clientRecord = clients.find(c => String(c.id) === String(resolveClientId(t))) || null;
                          const clientLabel = resolveClientLabel(t);
                          return (
                            <td key={columnId}>
                              <span className={styles.clientCell}>
                                {resolveClientId(t) ? <button type="button" className={styles.linkCellBtn} onClick={e => {
                                e.stopPropagation();
                                onNavigate?.("ContratDetail", { clientId: resolveClientId(t), name: clientLabel });
                              }}>
                                {clientLabel}
                              </button> : <span>{clientLabel}</span>}
                                <ClientOnboardingBadge client={clientRecord} label={pageCopy.onboardingBadge} />
                              </span>
                            </td>
                          );
                        }
                        if (columnId === "assigned") {
                          return <td key={columnId}>{resolveAssigneesLabel(t)}</td>;
                        }
                        if (columnId === "followers") {
                          return <td key={columnId}>{resolveFollowersLabel(t)}</td>;
                        }
                        if (columnId === "status") {
                          return <td key={columnId}><span className={styles.statusBadge}>{pageCopy.getStatusBadge(ticketStatus) || t.status}</span></td>;
                        }
                        if (columnId === "priority") {
                          return (
                            <td key={columnId}>
                              <span className={styles.priorityIndicator} title={getPriorityVisual(t.priority, t).label}>
                                <Icon icon={getPriorityVisual(t.priority, t).icon} />
                              </span>
                            </td>
                          );
                        }
                        if (columnId === "sla") {
                          const sla = getTicketSlaDisplay(t, { clients, now: slaNow });
                          return (
                            <td key={columnId}>
                              <span className={`${styles.slaBadge} ${styles[`slaBadge_${sla.tone}`] || styles.slaBadge_neutral}`} title={sla.phase === "first_response" ? pageCopy.table.slaFirstResponse : sla.phase === "resolution" ? pageCopy.table.slaResolution : pageCopy.table.sla}>
                                <Icon icon="mdi:timer-outline" />
                                {sla.label}
                              </span>
                            </td>
                          );
                        }
                        if (columnId === "created_at") {
                          return <td key={columnId}>{formatDateTime(t.created_at)}</td>;
                        }
                        if (columnId === "updated_at") {
                          return <td key={columnId}>{formatDateTime(t.updated_at)}</td>;
                        }
                        return <td key={columnId}>-</td>;
                      })}
                                            {viewMode === "trash" && <td>
                          <div className={styles.actionRow}>
                            <button type="button" className={styles.rowActionBtn} title={pageCopy.bulk.restore} onClick={e => {
                                      e.stopPropagation();
                                      handleRestoreTicket(t.id);
                                    }}>
                              <Icon icon="mdi:restore" />
                              {pageCopy.table.restore}
                            </button>
                            {canHardPurge && <button type="button" className={`${styles.rowActionBtn} ${styles.rowActionDanger}`} title={pageCopy.table.purgeTitle} onClick={e => {
                                      e.stopPropagation();
                                      handlePermanentDelete(t.id);
                                    }}>
                                <Icon icon="mdi:delete-forever-outline" />
                                {pageCopy.table.delete}
                              </button>}
                          </div>
                        </td>}
                    </tr>;
                            })}
            </tbody>
                </table>
              </div>
            </div>

            <div className={layout.pagination}>
              <div className={layout.paginationLeft}>
                <span className={layout.paginationLabel}>{commonCopy.perPage}</span>
                <select className={layout.paginationSelect} value={pageSize} onChange={e => setPageSize(Number(e.target.value))}>
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
              <div className={layout.paginationRight}>
                <button type="button" className={layout.pageBtn} onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} disabled={currentPage <= 1} aria-label={commonCopy.prevPage}>
                  <FaChevronLeft />
                </button>
                <span className={layout.paginationInfo}>
                  {formatPageInfo(locale, currentPage, totalPages)} · {totalCount}
                </span>
                <button type="button" className={layout.pageBtn} onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} disabled={currentPage >= totalPages} aria-label={commonCopy.nextPage}>
                  <FaChevronRight />
                </button>
              </div>
            </div>
          </>}
              </>}
          </div>
        </div>

        <TicketConfirmModal open={Boolean(confirmModal)} title={confirmModal?.title} message={confirmModal?.message} confirmLabel={confirmModal?.confirmLabel} icon={confirmModal?.icon} variant={confirmModal?.variant} loading={bulkDeleting} onClose={closeConfirmModal} onConfirm={confirmModal?.onConfirm} />

        <TicketBulkActionModal open={bulkModalOpen} onClose={() => setBulkModalOpen(false)} ticketIds={[...selectedIds]} users={users} contacts={contacts} onSuccess={handleBulkActionSuccess} />

        <TicketViewModal open={viewModalOpen} onClose={() => {
              setViewModalOpen(false);
              setEditingView(null);
            }} onSaved={handleViewSaved} initialView={editingView} isAdmin={canManageViews} pageScope="ticket" />
        <TicketColumnsModal
          open={columnsModalOpen}
          onClose={() => setColumnsModalOpen(false)}
          onSaved={handleColumnsSaved}
          isAdmin={canPublicViews}
          isCommunity={isCommunity}
          initialPublic={publicTableColumns}
          initialPrivate={privateTableColumns}
          copy={pageCopy}
        />
            </div>
          </main>
        </div>
      </div>
    </div>;
}
