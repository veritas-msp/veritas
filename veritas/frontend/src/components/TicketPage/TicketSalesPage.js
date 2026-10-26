import React, { startTransition, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@iconify/react";
import { FaChevronLeft, FaChevronRight, FaPlus } from "react-icons/fa";
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { toast } from "react-toastify";
import layout from "../EnterprisesPage/EnterprisesPage.module.css";
import styles from "./TicketPage.module.css";
import PageSkeleton from "../Misc/Skeleton/PageSkeleton";
import SortIcon from "../Misc/SortableHeader/SortIcon";
import { searchTickets, fetchAllMatchingTickets, restoreTicket, permanentlyDeleteTicket, bulkUpdateTickets, fetchSalesForms, fetchTicketViews, fetchTicketViewCounts, updateTicketView, fetchTicketTableColumns } from "../../api/tickets";
import { fetchUsers } from "../../api/users";
import { fetchClientsList, fetchContactsList } from "../../api/clients";
import { useAuthContext } from "../../contexts/AuthContext";
import { usePermissions } from "../../contexts/PermissionsContext";
import TicketBulkActionModal from "./TicketBulkActionModal";
import TicketConfirmModal from "./TicketConfirmModal";
import TicketViewModal from "./TicketViewModal";
import TicketColumnsModal from "./TicketColumnsModal";
import { getBuiltinTicketViews, DEFAULT_TICKET_VIEW_ID, canUserEditTicketView } from "../../utils/ticketViewConstants";
import { usePersistedTicketViewId } from "../../utils/ticketLastViewStorage";
import {
  DEFAULT_TICKET_SALES_TABLE_COLUMNS,
  TICKET_TABLE_COLUMN_SORT_KEYS,
  filterColumnsForEdition
} from "../../utils/ticketTableColumns";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { useCommonCopy } from "../../hooks/useCommonCopy";
import { formatSalesBulkLabel, getTicketSalesPageCopy, interpolate } from "./ticketSalesPageI18n";
import { getTicketPageCopy } from "./ticketPageI18n";
import ContextMenu from "../Misc/ContextMenu/ContextMenu";
import mspStyles from "../CybersecuritePage/CybersecuritePage.module.css";
import { UiKitCrmListToolbar, UiKitEmptyState, UiKitScrollFadeShell, UiKitTable, uiKitLayoutsStyles as kit, uiKitTableStyles as tableKit, useFinderNavIndicator } from "../UiKit";
import ActivityStatusSegmented from "../shared/ActivityStatusSegmented/ActivityStatusSegmented";
import { createTrackedAbortController } from "../../utils/pageLoadAbort";
import { buildAgentPath } from "../../navigation/agentRoutes";
import { cycleSortState } from "../Misc/SortableHeader/cycleSortState";

const VIEW_SECTION_KEYS = ["public", "assigned", "private"];
const VIEWS_PANE_COLLAPSED_KEY = "veritas_ticket_sales_views_collapsed";
const SALES_TICKET_FAMILY = "sales";
const SALES_PAGE_SCOPE = "ticket_sales";

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
function withCategoryFilter(viewRules, category) {
  const categoryValue = String(category || "").trim();
  if (!categoryValue) return viewRules || undefined;
  const criterion = {
    field: "category",
    operator: "equals",
    value: categoryValue
  };
  const filterRule = {
    type: "rule",
    field: "category",
    operator: "equals",
    value: categoryValue,
    connector: "and"
  };
  if (!viewRules || typeof viewRules !== "object") {
    return {
      matchMode: "all",
      viewMode: "active",
      criteria: [criterion],
      filterRoot: {
        type: "group",
        children: [{
          ...filterRule,
          connector: undefined
        }]
      }
    };
  }
  const next = {
    ...viewRules
  };
  if (Array.isArray(next.filterRoot?.children) && next.filterRoot.children.length > 0) {
    next.filterRoot = {
      ...next.filterRoot,
      children: [...next.filterRoot.children, filterRule]
    };
  } else {
    next.matchMode = "all";
    next.criteria = [...(Array.isArray(next.criteria) ? next.criteria : []), criterion];
  }
  return next;
}
function resolveTicketTags(ticket) {
  const raw = ticket?.tags;
  if (!Array.isArray(raw)) return [];
  return raw
    .map(tag => ({
      id: tag?.id || tag?.tag_id || tag?.label,
      label: String(tag?.label || tag?.name || "").trim(),
      color: tag?.color || "#2b5fab"
    }))
    .filter(tag => tag.label);
}

function formatTicketTagsLabel(ticket) {
  return resolveTicketTags(ticket)
    .map(tag => tag.label)
    .join(", ");
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
  return <div ref={canDrag ? setNodeRef : undefined} style={style} className={`${kit.finderSecItem} ${styles.viewItemRow} ${isActive ? `${kit.finderSecItemActive} ${styles.viewItemRowActive}` : ""} ${isDragging ? styles.viewItemDragging : ""} ${reorderMode ? styles.viewItemReorderMode : ""}`.trim()} onClick={reorderMode ? undefined : () => onSelect(view)} onKeyDown={reorderMode ? undefined : e => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onSelect(view);
    }
  }} role={reorderMode ? undefined : "button"} tabIndex={reorderMode ? undefined : 0} aria-pressed={reorderMode ? undefined : isActive} aria-current={!reorderMode && isActive ? "page" : undefined} aria-label={view.name}>
      {canDrag ? <button type="button" className={styles.viewItemDragHandle} aria-label={copy.formatDragViewAria(view.name)} onClick={event => event.stopPropagation()} {...attributes} {...listeners}>
          <Icon icon="mdi:drag-vertical" aria-hidden />
        </button> : null}
      <Icon icon={view.icon || "mdi:view-list"} className={kit.finderSecItemIcon} aria-hidden />
      <span className={kit.finderSecItemLabel}>{view.name}</span>
      <span className={kit.finderSecMeta}>
        <span className={kit.finderSecCount} aria-label={copy.formatViewTicketCountAria(count)}>
          {count}
        </span>
        {editable && !reorderMode ? <button type="button" className={styles.viewItemEditBtn} aria-label={copy.formatEditViewAria(view.name)} onClick={event => onEdit(view, event)}>
            <Icon icon="mdi:pencil-outline" aria-hidden />
          </button> : null}
      </span>
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
  return <DndContext id={`ticket-sales-views-${sectionKey}`} sensors={sensors} collisionDetection={closestCenter} onDragEnd={event => onDragEnd(sectionKey, event)}>
      <SortableContext items={views.map(view => String(view.id))} strategy={verticalListSortingStrategy}>
        {children}
      </SortableContext>
    </DndContext>;
}
function getCategoryLabel(category, categoryLabels = {}) {
  if (categoryLabels[category]) return categoryLabels[category];
  const prefix = String(category || "").startsWith("installation-") ? "installation-" : "prestation-";
  return String(category || "").replace(new RegExp(`^${prefix}`), "").replace(/-/g, " ").trim() || "-";
}
function normalizeStatus(status) {
  return status === "open" ? "new" : status;
}
function resolveProgressPercent(ticket) {
  const {
    done,
    total
  } = resolveTasksCounts(ticket);
  if (total > 0) {
    return Math.max(0, Math.min(100, Math.round(done / total * 100)));
  }
  const raw = ticket?.progress_percent ?? ticket?.progressPercent;
  if (raw === null || raw === undefined || raw === "") return null;
  const n = Number(raw);
  if (!Number.isFinite(n)) return null;
  return Math.max(0, Math.min(100, Math.round(n)));
}
function resolveTasksCounts(ticket) {
  const totalRaw = ticket?.tasks_total ?? ticket?.tasksTotal;
  const doneRaw = ticket?.tasks_done ?? ticket?.tasksDone;
  const total = Number(totalRaw);
  if (!Number.isFinite(total) || total <= 0) {
    return {
      done: 0,
      total: 0
    };
  }
  const done = Number(doneRaw);
  return {
    done: Number.isFinite(done) ? Math.max(0, Math.min(total, Math.round(done))) : 0,
    total: Math.round(total)
  };
}
function toCsvCell(value) {
  const str = String(value ?? "");
  if (str.includes('"') || str.includes(";") || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}
export default function TicketSalesPage({
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
  const locale = useAppLocale();
  const commonCopy = useCommonCopy();
  const pageCopy = useMemo(() => getTicketSalesPageCopy(locale), [locale]);
  const supportCopy = useMemo(() => getTicketPageCopy(locale), [locale]);
  const viewsCopy = supportCopy.views;
  const builtinTicketViews = useMemo(() => getBuiltinTicketViews(locale), [locale]);
  const isAdmin = userRole === "admin";
  const canCreateSales = can("sales.create");
  const canExportSales = can("sales.export");
  const canPublicViews = can("sales.public_views");
  const canManageViews = can("sales.manage_views");
  const canTrash = can("sales.trash");
  const canHardPurge = isAdmin || can("tickets.manage");
  const [tickets, setTickets] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [viewCounts, setViewCounts] = useState({});
  const [exporting, setExporting] = useState(false);
  const [users, setUsers] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [clients, setClients] = useState([]);
  const [salesForms, setSalesForms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [ticketType, setTicketType] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [sortBy, setSortBy] = useState("updated_at");
  const [sortDirection, setSortDirection] = useState("desc");
  const [viewMode, setViewMode] = useState("active");
  const [ticketViews, setTicketViews] = useState([]);
  const [viewsLoading, setViewsLoading] = useState(false);
  const [viewsLoaded, setViewsLoaded] = useState(false);
  const [activeViewId, setActiveViewId] = usePersistedTicketViewId(SALES_PAGE_SCOPE, user?.id, DEFAULT_TICKET_VIEW_ID);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [editingView, setEditingView] = useState(null);
  const [viewsReorderMode, setViewsReorderMode] = useState(false);
  const [customViewsOrder, setCustomViewsOrder] = useState(null);
  const [viewsOrderSaving, setViewsOrderSaving] = useState(false);
  const [viewsPaneCollapsed, setViewsPaneCollapsed] = useState(readViewsPaneCollapsed);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [contextMenu, setContextMenu] = useState(null);
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [confirmModal, setConfirmModal] = useState(null);
  const [columnsModalOpen, setColumnsModalOpen] = useState(false);
  const [publicTableColumns, setPublicTableColumns] = useState(() => [...DEFAULT_TICKET_SALES_TABLE_COLUMNS]);
  const [privateTableColumns, setPrivateTableColumns] = useState(null);
  const [visibleTableColumns, setVisibleTableColumns] = useState(() => [...DEFAULT_TICKET_SALES_TABLE_COLUMNS]);
  const ticketsSearchAbortRef = useRef(null);
  const hasLoadedTicketsOnceRef = useRef(false);
  const tableColumns = useMemo(
    () => filterColumnsForEdition(visibleTableColumns, { pageScope: SALES_PAGE_SCOPE }),
    [visibleTableColumns]
  );
  const tableColSpan = tableColumns.length + 1 + (viewMode === "trash" ? 1 : 0);
  const usersById = useMemo(() => {
    const map = new Map();
    for (const row of users) {
      if (row?.id != null) map.set(String(row.id), row);
    }
    return map;
  }, [users]);
  const contactsById = useMemo(() => {
    const map = new Map();
    for (const row of contacts) {
      if (row?.id != null) map.set(String(row.id), row);
    }
    return map;
  }, [contacts]);
  const clientsById = useMemo(() => {
    const map = new Map();
    for (const row of clients) {
      if (row?.id != null) map.set(String(row.id), row);
    }
    return map;
  }, [clients]);
  useEffect(() => {
    const controller = createTrackedAbortController();
    (async () => {
      try {
        const data = await fetchTicketTableColumns(SALES_PAGE_SCOPE, {
          signal: controller.signal
        });
        if (controller.signal.aborted) return;
        setPublicTableColumns(Array.isArray(data?.public) ? data.public : [...DEFAULT_TICKET_SALES_TABLE_COLUMNS]);
        setPrivateTableColumns(Array.isArray(data?.private) && data.private.length ? data.private : null);
        setVisibleTableColumns(
          Array.isArray(data?.effective) && data.effective.length
            ? data.effective
            : [...DEFAULT_TICKET_SALES_TABLE_COLUMNS]
        );
      } catch (error) {
        if (error?.name === "AbortError") return;
        toast.error(pageCopy.toasts?.loadColumns || supportCopy.toasts?.loadColumns || "Error loading columns");
      }
    })();
    return () => {
      controller.abort();
    };
  }, [pageCopy.toasts?.loadColumns, supportCopy.toasts?.loadColumns]);
  useEffect(() => {
    if (viewMode === "trash" && viewsReorderMode) {
      setViewsReorderMode(false);
      setCustomViewsOrder(null);
    }
  }, [viewMode, viewsReorderMode]);
  useEffect(() => {
    if (!canTrash && viewMode === "trash") {
      setViewMode("active");
    }
  }, [canTrash, viewMode]);
  const customTicketViews = useMemo(() => ticketViews.filter(view => !view.isBuiltin), [ticketViews]);
  const activeView = useMemo(() => {
    const builtin = builtinTicketViews.find(view => String(view.id) === String(activeViewId));
    if (builtin) return builtin;
    if (String(activeViewId) === "__all__") {
      return builtinTicketViews.find(view => view.id === DEFAULT_TICKET_VIEW_ID) || builtinTicketViews[builtinTicketViews.length - 1];
    }
    const found = ticketViews.find(view => String(view.id) === String(activeViewId));
    return found || builtinTicketViews.find(view => view.id === DEFAULT_TICKET_VIEW_ID) || builtinTicketViews[builtinTicketViews.length - 1];
  }, [ticketViews, activeViewId, builtinTicketViews]);
  useEffect(() => {
    if (!viewsLoaded) return;
    if (builtinTicketViews.some(view => String(view.id) === String(activeViewId))) return;
    if (String(activeViewId) === "__all__") {
      setActiveViewId(DEFAULT_TICKET_VIEW_ID);
      return;
    }
    if (!ticketViews.some(view => String(view.id) === String(activeViewId))) {
      setActiveViewId(DEFAULT_TICKET_VIEW_ID);
    }
  }, [ticketViews, activeViewId, builtinTicketViews, viewsLoaded]);
  useEffect(() => {
    const viewId = String(pageParams?.viewId || "").trim();
    const nextViewMode = String(pageParams?.viewMode || "").trim();
    if (!viewId && nextViewMode !== "trash" && nextViewMode !== "active") return;
    if (viewId) setActiveViewId(viewId);
    if (nextViewMode === "trash" && canTrash) setViewMode("trash");
    else if (nextViewMode === "active") setViewMode("active");
    onPageParamsConsumed?.();
  }, [pageParams, onPageParamsConsumed, canTrash]);
  const categoryLabels = useMemo(() => Object.fromEntries(salesForms.filter(form => form.enabled !== false).map(form => [form.categorySlug, form.label])), [salesForms]);
  const loadViewCounts = useCallback(async (signal) => {
    try {
      const result = await fetchTicketViewCounts({
        pageScope: SALES_PAGE_SCOPE,
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
  const loadViews = async (signal) => {
    setViewsLoading(true);
    try {
      const rows = await fetchTicketViews(SALES_PAGE_SCOPE, {
        signal
      });
      if (signal?.aborted) return;
      setTicketViews(Array.isArray(rows) ? rows : []);
      await loadViewCounts(signal);
    } catch (error) {
      if (error?.name === "AbortError") return;
      toast.error(error.message || supportCopy.toasts.loadViews);
      setTicketViews([]);
    } finally {
      if (!signal?.aborted) {
        setViewsLoading(false);
        setViewsLoaded(true);
      }
    }
  };
  useEffect(() => {
    const controller = createTrackedAbortController();
    loadViews(controller.signal);
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
  const loadReferenceData = useCallback(async (signal) => {
    try {
      const [userRows, contactRows, clientRows, formRows] = await Promise.all([fetchUsers({
        signal
      }).catch(error => error?.name === "AbortError" ? Promise.reject(error) : []), fetchContactsList(null, {
        signal
      }).catch(error => error?.name === "AbortError" ? Promise.reject(error) : []), fetchClientsList({
        signal
      }).catch(error => error?.name === "AbortError" ? Promise.reject(error) : []), fetchSalesForms({
        signal
      }).catch(error => error?.name === "AbortError" ? Promise.reject(error) : [])]);
      if (signal?.aborted) return;
      setUsers(Array.isArray(userRows) ? userRows : []);
      setContacts(Array.isArray(contactRows) ? contactRows : []);
      setClients(Array.isArray(clientRows) ? clientRows : []);
      setSalesForms(Array.isArray(formRows) ? formRows : []);
    } catch (error) {
      if (error?.name === "AbortError") return;
      toast.error(error.message || pageCopy.toasts.loadError);
    }
  }, [pageCopy.toasts.loadError]);
  const buildSearchPayload = useCallback((extra = {}) => {
    const includeViewRules = viewMode !== "trash" || activeView?.rules?.viewMode === "trash";
    const baseRules = includeViewRules && activeView?.rules ? activeView.rules : null;
    const viewRules = withCategoryFilter(baseRules, categoryFilter);
    return {
      ticketFamily: SALES_TICKET_FAMILY,
      ...(viewRules ? {
        viewRules
      } : {}),
      viewMode,
      ticketType,
      search: debouncedSearch,
      sortBy: sortBy === "kind" ? "type" : sortBy,
      sortDirection,
      ...extra
    };
  }, [activeView?.id, activeView?.rules, viewMode, ticketType, categoryFilter, debouncedSearch, sortBy, sortDirection]);
  const loadTicketsPage = useCallback(async () => {
    ticketsSearchAbortRef.current?.abort();
    const controller = createTrackedAbortController();
    ticketsSearchAbortRef.current = controller;
    const showFullLoader = !hasLoadedTicketsOnceRef.current;
    if (showFullLoader) setLoading(true);else setRefreshing(true);
    try {
      const result = await searchTickets(buildSearchPayload({
        limit: pageSize,
        offset: (currentPage - 1) * pageSize
      }), controller.signal);
      if (controller.signal.aborted) return;
      const nextTotal = Number(result?.total || 0);
      setTickets(Array.isArray(result?.items) ? result.items : []);
      setTotalCount(nextTotal);
      hasLoadedTicketsOnceRef.current = true;
      const subFilters = Boolean(
        String(debouncedSearch || "").trim() ||
          String(ticketType || "").trim() ||
          String(categoryFilter || "").trim()
      );
      if (!subFilters && viewMode !== "trash" && activeView?.id != null) {
        const viewKey = String(activeView.id);
        setViewCounts(prev => {
          if (prev[viewKey] === nextTotal) return prev;
          return { ...prev, [viewKey]: nextTotal };
        });
      }
    } catch (error) {
      if (error?.name === "AbortError" || controller.signal.aborted) return;
      toast.error(error.message || pageCopy.toasts.loadError);
      setTickets([]);
      setTotalCount(0);
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [buildSearchPayload, pageSize, currentPage, pageCopy.toasts.loadError, debouncedSearch, ticketType, categoryFilter, viewMode, activeView?.id]);
  useEffect(() => {
    const controller = createTrackedAbortController();
    loadReferenceData(controller.signal);
    return () => controller.abort();
  }, [loadReferenceData]);
  useEffect(() => {
    loadTicketsPage();
    return () => ticketsSearchAbortRef.current?.abort();
  }, [loadTicketsPage]);
  const prevActiveViewIdRef = useRef(null);
  useEffect(() => {
    const isViewSwitch = prevActiveViewIdRef.current != null && String(prevActiveViewIdRef.current) !== String(activeViewId);
    prevActiveViewIdRef.current = activeViewId;
    startTransition(() => {
      if (activeView.sortBy) setSortBy(activeView.sortBy);
      if (activeView.sortDirection) setSortDirection(activeView.sortDirection);
      if (isViewSwitch) {
        setTicketType("");
        setCategoryFilter("");
        const nextViewMode = activeView.rules?.viewMode === "trash" ? "trash" : "active";
        setViewMode(nextViewMode);
      }
    });
  }, [activeViewId]); // eslint-disable-line react-hooks/exhaustive-deps -- only when switching views
  const findContactById = useCallback(contactId => {
    if (contactId === null || contactId === undefined || contactId === "") return null;
    return contactsById.get(String(contactId)) || null;
  }, [contactsById]);
  const resolveUserLabel = useCallback((userId, fallback) => {
    const u = userId != null && userId !== "" ? usersById.get(String(userId)) : null;
    return u?.ticket_helpdesk_display_name || u?.name || u?.nom || u?.username || u?.email || fallback || "-";
  }, [usersById]);
  const resolveRequesterContactId = ticket => ticket?.requester_contact_id || ticket?.requesterContactId || "";
  const resolveRequesterFallback = ticket => ticket?.requester_name || ticket?.requester_full_name || ticket?.requester_contact_name || ticket?.requester_email || ticket?.requester_contact_email || "-";
  const resolveContactLabel = useCallback((contactId, fallback) => {
    const c = findContactById(contactId);
    if (!c) return fallback || "-";
    const fullName = `${c.prenom || ""} ${c.nom || ""}`.trim();
    return fullName || c.email || fallback || "-";
  }, [findContactById]);
  const resolveClientId = useCallback(ticket => {
    if (ticket?.client_id) return ticket.client_id;
    const requesterContact = findContactById(resolveRequesterContactId(ticket));
    const memberships = Array.isArray(requesterContact?.clients) ? requesterContact.clients : [];
    if (memberships.length === 1) return memberships[0].client_id || memberships[0].id || "";
    if (requesterContact?.client_id) return requesterContact.client_id;
    return "";
  }, [findContactById]);
  const resolveClientLabel = useCallback(ticket => {
    if (ticket?.client_name || ticket?.client_nom) {
      return ticket.client_name || ticket.client_nom;
    }
    const resolvedClientId = resolveClientId(ticket);
    if (resolvedClientId) {
      const client = clientsById.get(String(resolvedClientId));
      return client?.name || client?.nom || "-";
    }
    const requesterContact = findContactById(resolveRequesterContactId(ticket));
    return requesterContact?.client_name || requesterContact?.entreprise || "-";
  }, [clientsById, findContactById, resolveClientId]);
  const resolveAssigneesLabel = useCallback(ticket => {
    const teamLabels = (Array.isArray(ticket?.assignee_teams) ? ticket.assignee_teams : Array.isArray(ticket?.assigneeTeams) ? ticket.assigneeTeams : [])
      .map(team => team?.name || team?.team_name || "")
      .filter(Boolean);
    const assignees = Array.isArray(ticket?.assignees) ? ticket.assignees : [];
    const userLabels = assignees.map(a => {
      if (a === null || a === undefined) return "";
      if (typeof a === "string" || typeof a === "number") {
        return resolveUserLabel(a);
      }
      return resolveUserLabel(a.user_id || a.userId || a.id || a.value, a.name || a.nom || a.email || "");
    }).filter(label => label && label !== "-");
    const labels = [...teamLabels, ...userLabels];
    if (labels.length > 0) return labels.join(", ");
    return resolveUserLabel(ticket?.assigned_user_id, ticket?.assigned_email);
  }, [resolveUserLabel]);
  const getTicketKindLabel = ticket => pageCopy.getKindLabel(ticket);
  const formatTasksRecap = ticket => {
    const {
      done,
      total
    } = resolveTasksCounts(ticket);
    if (total <= 0) return pageCopy.table.noTasks;
    return pageCopy.formatTasksRecap(done, total);
  };
  const formatProgressLabel = ticket => {
    const pct = resolveProgressPercent(ticket);
    return pct == null ? "—" : `${pct}%`;
  };
  const handleSort = columnId => {
    const nextSortBy = TICKET_TABLE_COLUMN_SORT_KEYS[columnId] || (columnId === "kind" ? "type" : columnId);
    if (!nextSortBy) return;
    const next = cycleSortState({
      column: nextSortBy,
      sortBy,
      sortDirection,
      defaultSortBy: "updated_at",
      defaultSortDirection: "desc",
      firstDirection: "asc"
    });
    setSortBy(next.sortBy);
    setSortDirection(next.sortDirection);
  };
  const handleColumnsSaved = useCallback(result => {
    if (!result) return;
    setPublicTableColumns(Array.isArray(result.public) ? result.public : [...DEFAULT_TICKET_SALES_TABLE_COLUMNS]);
    setPrivateTableColumns(Array.isArray(result.private) && result.private.length ? result.private : null);
    setVisibleTableColumns(
      Array.isArray(result.effective) && result.effective.length
        ? result.effective
        : [...DEFAULT_TICKET_SALES_TABLE_COLUMNS]
    );
  }, []);
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
  const publicViews = useMemo(() => customTicketViews.filter(view => view.visibility === "public"), [customTicketViews]);
  const assignedViews = useMemo(() => customTicketViews.filter(view => view.visibility === "assigned" || view.visibility === "profile"), [customTicketViews]);
  const privateViews = useMemo(() => customTicketViews.filter(view => view.visibility === "private"), [customTicketViews]);
  const { trackRef: viewsNavTrackRef, indicator: viewsNavIndicator } = useFinderNavIndicator([
    activeViewId,
    viewsLoading,
    viewsReorderMode,
    viewsPaneCollapsed,
    viewMode,
    publicViews.length,
    assignedViews.length,
    privateViews.length,
    builtinTicketViews.length
  ]);
  const [viewsNavEnter, setViewsNavEnter] = useState(true);
  useEffect(() => {
    if (viewsLoading || viewsPaneCollapsed || viewMode === "trash") {
      setViewsNavEnter(false);
      return undefined;
    }
    setViewsNavEnter(false);
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => setViewsNavEnter(true));
    });
    return () => cancelAnimationFrame(id);
  }, [viewsLoading, viewsPaneCollapsed, viewMode]);
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
      toast.error(error.message || supportCopy.toasts.reorderViews);
    } finally {
      setViewsOrderSaving(false);
    }
  }, [customViewsOrder, persistCustomViewsOrder, supportCopy.toasts.reorderViews]);
  const getViewTicketCount = view => {
    const cached = Number(viewCounts[String(view.id)]);
    return Number.isFinite(cached) ? cached : 0;
  };
  const handleSelectView = view => {
    startTransition(() => {
      setActiveViewId(view.id);
    });
  };
  const handleViewSaved = async saved => {
    await loadViews();
    await refreshCountsAfterMutation();
    if (saved?.id) setActiveViewId(saved.id);
    toast.success(editingView?.id ? supportCopy.toasts.viewUpdated : supportCopy.toasts.viewCreated);
  };
  const setViewsPaneCollapsedState = useCallback(collapsed => {
    setViewsPaneCollapsed(collapsed);
    writeViewsPaneCollapsed(collapsed);
  }, []);
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
      return <SortableViewRow key={view.id} view={view} isActive={isActive} count={count} editable={editable} reorderMode onSelect={handleSelectView} onEdit={openEditViewModal} copy={supportCopy} />;
    }
    return <div key={view.id} className={`${kit.finderSecItem} ${styles.viewItemRow} ${isActive ? `${kit.finderSecItemActive} ${styles.viewItemRowActive}` : ""}`.trim()} onClick={() => handleSelectView(view)} onKeyDown={e => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        handleSelectView(view);
      }
    }} role="button" tabIndex={0} aria-pressed={isActive} aria-current={isActive ? "page" : undefined} aria-label={view.name}>
        <Icon icon={view.icon || "mdi:view-list"} className={kit.finderSecItemIcon} aria-hidden />
        <span className={kit.finderSecItemLabel}>{view.name}</span>
        <span className={kit.finderSecMeta}>
          <span className={kit.finderSecCount} aria-label={supportCopy.formatViewTicketCountAria(count)}>
            {count}
          </span>
          {editable ? <button type="button" className={styles.viewItemEditBtn} aria-label={supportCopy.formatEditViewAria(view.name)} onClick={event => openEditViewModal(view, event)}>
              <Icon icon="mdi:pencil-outline" aria-hidden />
            </button> : null}
        </span>
      </div>;
  };
  const renderCustomViewsSection = (sectionKey, label, views) => {
    if (views.length === 0) return null;
    const orderedViews = viewsReorderMode && customViewsOrder ? orderViewsByIds(views, customViewsOrder[sectionKey]) : views;
    return <div className={kit.finderSecGroup}>
        <p className={kit.finderSecGroupTitle}>{label}</p>
        <SortableViewsSection sectionKey={sectionKey} views={orderedViews} reorderMode={viewsReorderMode} sensors={viewReorderSensors} onDragEnd={handleViewsSectionDragEnd}>
          {orderedViews.map(view => renderViewItem(view, {
          reorderMode: viewsReorderMode
        }))}
        </SortableViewsSection>
      </div>;
  };
  const totalPages = useMemo(() => Math.max(1, Math.ceil(totalCount / pageSize)), [totalCount, pageSize]);
  const paginatedTickets = tickets;
  useEffect(() => {
    setSelectedIds(new Set());
  }, [viewMode, activeViewId, debouncedSearch, ticketType, categoryFilter]);
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
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, ticketType, categoryFilter, sortBy, sortDirection, viewMode, activeViewId, pageSize]);
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);
  const openCreatePage = (kind = "prestation") => {
    onNavigate?.("TicketSalesCreate", {
      kind
    });
  };
  const createKind = ticketType === "installation" ? "installation" : "prestation";
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
      toast.error(pageCopy.bulk.adminOnlyPurge);
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
          toast.success(pageCopy.bulk.toastPurgedOne);
          setConfirmModal(null);
          await loadTicketsPage();
          await refreshCountsAfterMutation();
        } catch (error) {
          toast.error(error.message || pageCopy.bulk.toastPurgeError);
        } finally {
          setBulkDeleting(false);
        }
      }
    });
  };
  const openTicket = (ticket, background = false) => {
    if (!onNavigate || !ticket?.id) return;
    onNavigate("TicketSalesDetail", {
      ticketId: ticket.id,
      ticketNumber: ticket.ticket_number,
      title: ticket.title,
      ticketFamily: "sales",
      fromPage: "TicketSales"
    }, background ? { background: true } : undefined);
  };
  const copyTicketText = useCallback(async (text, successToast) => {
    const raw = String(text || "").trim();
    if (!raw) {
      toast.info(pageCopy.contextMenu?.copyUnavailable || "Rien a copier");
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
      toast.success(successToast || pageCopy.contextMenu?.copied || "Copie");
    } catch {
      toast.error(pageCopy.contextMenu?.copyFailed || "Impossible de copier");
    }
  }, [pageCopy.contextMenu]);
  const getTicketLink = useCallback(ticket => {
    const path = buildAgentPath("TicketSalesDetail", {
      ticketId: ticket?.id,
      ticketNumber: ticket?.ticket_number,
      title: ticket?.title
    });
    if (!path) return "";
    try {
      return `${window.location.origin}${path}`;
    } catch {
      return path;
    }
  }, []);
  const openTicketContextMenu = useCallback((event, ticket) => {
    event.preventDefault();
    event.stopPropagation();
    if (!ticket?.id) return;
    setContextMenu({
      x: event.clientX,
      y: event.clientY,
      ticket
    });
  }, []);
  const closeTicketContextMenu = useCallback(() => setContextMenu(null), []);
  const ticketContextMenuItems = useMemo(() => {
    const ticket = contextMenu?.ticket;
    if (!ticket) return [];
    const numberLabel = ticket.ticket_number ? `#${ticket.ticket_number}` : `#${ticket.id}`;
    const cm = pageCopy.contextMenu || {};
    const items = [
      {
        key: "open",
        icon: "mdi:open-in-app",
        label: cm.open || "Ouvrir",
        onSelect: () => openTicket(ticket)
      },
      {
        key: "open-bg",
        icon: "mdi:tab-plus",
        label: cm.openBackground || "Ouvrir en arriere-plan",
        onSelect: () => openTicket(ticket, true)
      },
      { key: "sep-copy", separator: true },
      {
        key: "copy-number",
        icon: "mdi:pound",
        label: cm.copyNumber || "Copier le numero",
        onSelect: () => copyTicketText(numberLabel, cm.copiedNumber || "Numero copie")
      },
      {
        key: "copy-link",
        icon: "mdi:link-variant",
        label: cm.copyLink || "Copier le lien",
        onSelect: () => copyTicketText(getTicketLink(ticket), cm.copiedLink || "Lien copie")
      }
    ];
    const clientId = resolveClientId(ticket);
    const contactId = resolveRequesterContactId(ticket);
    if (clientId || contactId) {
      items.push({ key: "sep-nav", separator: true });
      if (clientId) {
        items.push({
          key: "open-client",
          icon: "mdi:domain",
          label: cm.openClient || "Ouvrir l'entreprise",
          onSelect: () => onNavigate?.("ContratDetail", {
            clientId,
            name: resolveClientLabel(ticket)
          })
        });
      }
      if (contactId) {
        items.push({
          key: "open-contact",
          icon: "mdi:account-outline",
          label: cm.openContact || "Ouvrir le demandeur",
          onSelect: () => onNavigate?.("ContactDetail", { contactId })
        });
      }
    }
    if (viewMode === "trash") {
      items.push({ key: "sep-trash", separator: true });
      items.push({
        key: "restore",
        icon: "mdi:restore",
        label: cm.restore || pageCopy.table?.restoreTitle || "Restaurer",
        onSelect: () => handleRestoreTicket(ticket.id)
      });
      if (canHardPurge) {
        items.push({
          key: "purge",
          icon: "mdi:delete-forever-outline",
          label: cm.purge || pageCopy.table?.purgeTitle || "Supprimer definitivement",
          danger: true,
          onSelect: () => handlePermanentDelete(ticket.id)
        });
      }
    }
    return items;
  }, [
    contextMenu?.ticket,
    pageCopy.contextMenu,
    pageCopy.table,
    viewMode,
    canHardPurge,
    copyTicketText,
    getTicketLink,
    onNavigate
  ]);
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
        toast.success(interpolate(result.successCount > 1 ? pageCopy.toasts.bulkRestoreOkPlural : pageCopy.toasts.bulkRestoreOk, {
          count: String(result.successCount)
        }));
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
    const label = formatSalesBulkLabel(locale, selectedCount);
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
            toast.success(interpolate(result.successCount > 1 ? pageCopy.toasts.bulkPurgeOkPlural : pageCopy.toasts.bulkPurgeOk, {
              count: String(result.successCount)
            }));
          }
          clearSelection();
          setConfirmModal(null);
          await loadTicketsPage();
          await refreshCountsAfterMutation();
        } catch (error) {
          toast.error(error.message || pageCopy.bulk.toastPurgeError);
        } finally {
          setBulkDeleting(false);
        }
      }
    });
  };
  const handleBulkDelete = () => {
    if (!canTrash || selectedCount === 0) return;
    const label = formatSalesBulkLabel(locale, selectedCount);
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
            toast.success(interpolate(result.successCount > 1 ? pageCopy.toasts.bulkDeleteOkPlural : pageCopy.toasts.bulkDeleteOk, {
              count: String(result.successCount)
            }));
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
      const count = result?.successCount || selectedCount;
      toast.success(interpolate(count > 1 ? pageCopy.toasts.bulkUpdateOkPlural : pageCopy.toasts.bulkUpdateOk, {
        count: String(count)
      }));
    }
    clearSelection();
    await loadTicketsPage();
    await refreshCountsAfterMutation();
  };
  const handleExportCsv = async () => {
    if (totalCount === 0) return;
    setExporting(true);
    try {
      const {
        items,
        truncated
      } = await fetchAllMatchingTickets(buildSearchPayload());
      const labelMap = {
        ticket_number: pageCopy.table.id,
        title: pageCopy.table.subject,
        type: pageCopy.table.type,
        category: pageCopy.table.category,
        client: pageCopy.table.client,
        requester: pageCopy.table.requester,
        assigned: pageCopy.table.assigned,
        tags: pageCopy.table.tags,
        status: pageCopy.table.status,
        tasks: pageCopy.table.tasks,
        progress: pageCopy.table.progress,
        created_at: pageCopy.table.created,
        updated_at: pageCopy.table.updated || pageCopy.table.created
      };
      const headers = tableColumns.map(columnId => labelMap[columnId] || columnId);
      const rows = items.map(t => {
        const ticketStatus = normalizeStatus(t.status);
        return tableColumns.map(columnId => {
          if (columnId === "ticket_number") return `#${t.ticket_number || "-"}`;
          if (columnId === "title") return t.title || "";
          if (columnId === "type") return getTicketKindLabel(t);
          if (columnId === "category") return getCategoryLabel(t.category, categoryLabels);
          if (columnId === "client") return resolveClientLabel(t);
          if (columnId === "requester") return resolveContactLabel(resolveRequesterContactId(t), resolveRequesterFallback(t));
          if (columnId === "assigned") return resolveAssigneesLabel(t);
          if (columnId === "tags") return formatTicketTagsLabel(t) || "-";
          if (columnId === "status") return pageCopy.getStatusBadge(ticketStatus) || t.status || "-";
          if (columnId === "tasks") return formatTasksRecap(t);
          if (columnId === "progress") return formatProgressLabel(t);
          if (columnId === "created_at") return pageCopy.formatDateTime(t.created_at);
          if (columnId === "updated_at") return pageCopy.formatDateTime(t.updated_at);
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
      link.download = `${pageCopy.csv.filenamePrefix}-${timestamp}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      if (truncated) {
        toast.warn(supportCopy.export.truncated);
      }
    } catch (error) {
      toast.error(error.message || supportCopy.toasts.exportError);
    } finally {
      setExporting(false);
    }
  };
  const moreActionsLabel = pageCopy.moreActions || supportCopy.moreActions || "Plus d'actions";
  const columnsSettingsLabel = pageCopy.columnsSettings || supportCopy.columnsSettings;
  const columnsSettingsAria = pageCopy.columnsSettingsAria || supportCopy.columnsSettingsAria;
  const crmMoreMenuItems = [{
    key: "columns",
    label: columnsSettingsLabel,
    icon: "mdi:table-cog",
    onClick: () => setColumnsModalOpen(true)
  }, ...(canExportSales ? [{
    key: "export",
    label: pageCopy.exportCsv,
    icon: "mdi:download-outline",
    disabled: exporting || totalCount === 0,
    onClick: handleExportCsv
  }] : [])];
  const viewModeOptions = useMemo(
    () => [
      { id: "active", label: pageCopy.viewModeActive || "Actifs" },
      { id: "trash", label: pageCopy.trashSwitchLabel || "Corbeille" }
    ],
    [pageCopy.viewModeActive, pageCopy.trashSwitchLabel]
  );
  const toolbarExtraActions = canTrash ? (
    <ActivityStatusSegmented
      value={viewMode}
      onChange={next => startTransition(() => setViewMode(next))}
      options={viewModeOptions}
      ariaLabel={pageCopy.viewModeAria || pageCopy.trashSwitchAria || "Mode d'affichage"}
    />
  ) : null;
  const viewsExpandLeading = viewMode !== "trash" && viewsPaneCollapsed ? (
    <button type="button" className={styles.viewsExpandBtn} onClick={() => setViewsPaneCollapsedState(false)} aria-label={viewsCopy.expandPane}>
      <FaChevronRight aria-hidden />
      <span>{viewsCopy.title}</span>
    </button>
  ) : null;
  return <div className={`${mspStyles.mspPage} ${layout.page} msp-page-grid`}>
      <div className={mspStyles.mspLayout}>
        <div className={mspStyles.mspMain}>
          <main className={`${mspStyles.mspContent} ${mspStyles.mspContentList} ${layout.contentNoHero}`}>
            <div className={`${layout.shell} ${layout.shellWide} ${layout.shellFull}`}>
        <div className={`${kit.finderLayout} ${styles.viewsFinder} ${viewMode === "trash" || viewsPaneCollapsed ? styles.viewsFinderSolo : ""}`.trim()}>
          {viewMode !== "trash" && !viewsPaneCollapsed && <aside className={kit.finderSidebar} aria-label={pageCopy.views.paneAria}>
              <div className={`${kit.finderSecTitleRow} ${styles.viewsFinderHeader}`.trim()}>
                <p className={kit.finderSecTitle}>{viewsCopy.title}</p>
                <div className={styles.viewsHeaderActions}>
                  <button type="button" className={kit.finderVaultAddBtn} onClick={() => setViewsPaneCollapsedState(true)} aria-label={viewsCopy.collapsePane} disabled={viewsReorderMode}>
                    <FaChevronLeft aria-hidden />
                  </button>
                  {hasReorderableViews ? <button type="button" className={`${kit.finderVaultAddBtn} ${viewsReorderMode ? styles.viewsEditBtnActive : ""}`.trim()} onClick={toggleViewsReorderMode} aria-label={viewsReorderMode ? viewsCopy.reorderFinish : viewsCopy.reorderStart} aria-pressed={viewsReorderMode} disabled={viewsOrderSaving}>
                      <Icon icon={viewsReorderMode ? "mdi:check" : "mdi:pencil-outline"} aria-hidden />
                    </button> : null}
                  {canManageViews ? <button type="button" className={kit.finderVaultAddBtn} onClick={openCreateViewModal} aria-label={viewsCopy.create} disabled={viewsReorderMode}>
                    <FaPlus />
                  </button> : null}
                </div>
              </div>
              {viewsReorderMode ? <p className={styles.viewsReorderHint}>
                  {viewsOrderSaving ? viewsCopy.saving : viewsCopy.reorderHint}
                </p> : null}
              <UiKitScrollFadeShell className={kit.finderSecondaryShell} deps={[activeViewId, viewsLoading, viewsReorderMode, publicViews.length, assignedViews.length, privateViews.length]}>
                <div className={kit.finderSecondary}>
                  <div className={`${kit.finderSecReveal} ${viewsNavEnter ? kit.finderSecRevealActive : ""}`.trim()}>
                    <nav
                      ref={viewsNavTrackRef}
                      className={`${kit.finderSecNav} ${kit.finderSecNavAnimated}`}
                      aria-label={pageCopy.views.paneAria}
                    >
                      {viewsNavIndicator.ready ? (
                        <div
                          className={kit.finderNavIndicator}
                          style={{
                            transform: `translate3d(0, ${viewsNavIndicator.top}px, 0)`,
                            height: viewsNavIndicator.height
                          }}
                          aria-hidden
                        />
                      ) : null}
                      {viewsLoading ? (
                        <div className={styles.viewsEmpty}>
                          <Icon icon="mdi:loading" className={layout.spinning} />
                          {viewsCopy.loading}
                        </div>
                      ) : (
                        <>
                          <div className={kit.finderSecGroup}>
                            <p className={kit.finderSecGroupTitle}>{viewsCopy.general}</p>
                            {builtinTicketViews.map(view => renderViewItem(view))}
                          </div>
                          {renderCustomViewsSection("public", viewsCopy.team, publicViews)}
                          {renderCustomViewsSection("assigned", viewsCopy.assigned, assignedViews)}
                          {renderCustomViewsSection("private", viewsCopy.private, privateViews)}
                          {customTicketViews.length === 0 && !viewsReorderMode ? (
                            <div className={styles.viewsEmpty}>
                              <p>{viewsCopy.emptyHint}</p>
                              {canManageViews ? (
                                <button type="button" className={styles.viewsCreateLink} onClick={openCreateViewModal}>
                                  {viewsCopy.create}
                                </button>
                              ) : null}
                            </div>
                          ) : null}
                        </>
                      )}
                    </nav>
                  </div>
                </div>
              </UiKitScrollFadeShell>
            </aside>}

          <div className={`${kit.finderContent} ${styles.viewsFinderContent}`.trim()}>
            <div className={styles.viewsFinderMain}>
            {loading ? (
              <PageSkeleton variant="list" rows={8} label={pageCopy.loading} />
            ) : <div className={layout.listBody}>
                <div className={layout.listArea}>
                <div className={`${layout.panelCard} ${styles.viewsFinderPanel} ${refreshing ? styles.tablePanelRefreshing : ""}`.trim()}>
                  <UiKitCrmListToolbar
                    searchVariant="embedded"
                    disableTooltips
                    searchValue={search}
                    onSearchChange={setSearch}
                    onSearchClear={() => setSearch("")}
                    searchPlaceholder={pageCopy.search.placeholder}
                    searchAriaLabel={pageCopy.search.aria}
                    clearSearchLabel={pageCopy.search.clear}
                    searchPending={isSearchPending || refreshing}
                    leading={viewsExpandLeading}
                    moreActionsLabel={moreActionsLabel}
                    moreMenuItems={crmMoreMenuItems}
                    extraActions={toolbarExtraActions}
                    createAction={canCreateSales ? {
                      label: pageCopy.newRequest,
                      ariaLabel: pageCopy.newRequestAria,
                      onClick: () => openCreatePage(createKind),
                      disabled: viewMode === "trash"
                    } : null}
                  />

                  <div className={styles.contentFadeUp}>
                  {totalCount === 0 && !refreshing ? <div className={layout.emptyStateInCard}>
                      <UiKitEmptyState bare icon="mdi:handshake-outline" title={viewMode === "trash" ? pageCopy.empty.trashTitle : pageCopy.empty.noRequestsTitle} text={viewMode === "trash" ? pageCopy.empty.trashHint : pageCopy.empty.activeHint} />
                      {viewMode !== "trash" && canCreateSales && <button type="button" className={layout.primaryBtn} onClick={() => openCreatePage(createKind)}>
                          <Icon icon="mdi:plus" />
                          {pageCopy.empty.newRequest}
                        </button>}
                    </div> : <>
                  <UiKitTable
                    fill
                    fadeTop
                    fadeTopInset="2.85rem"
                    className={tableKit.tableListFill}
                    deps={[paginatedTickets.length, pageSize, tableColumns.join("|"), viewMode, activeViewId]}
                  >
                    <table className={`${tableKit.table} ${tableKit.tableList} ${styles.table}`}>
                      <thead>
                        <tr>
                          <th className={styles.checkboxCell}>
                            <input type="checkbox" className={styles.rowCheckbox} checked={allOnPageSelected} onChange={toggleSelectAllOnPage} onClick={e => e.stopPropagation()} aria-label={pageCopy.table.selectAll} />
                          </th>
                          {tableColumns.map(columnId => {
                            const sortKey = TICKET_TABLE_COLUMN_SORT_KEYS[columnId];
                            const label = columnId === "ticket_number" ? pageCopy.table.id
                              : columnId === "title" ? pageCopy.table.subject
                              : columnId === "created_at" ? pageCopy.table.created
                              : columnId === "updated_at" ? (pageCopy.table.updated || pageCopy.table.created)
                              : pageCopy.table[columnId] || columnId;
                            const activeKey = sortKey || (columnId === "kind" ? "type" : columnId);
                            return (
                              <th
                                key={columnId}
                                onClick={sortKey ? () => handleSort(columnId) : undefined}
                                style={sortKey ? undefined : { cursor: "default" }}
                              >
                                {sortKey ? (
                                  <span className={styles.thSortInner}>
                                    {label}
                                    <SortIcon active={sortBy === activeKey} direction={sortDirection} />
                                  </span>
                                ) : label}
                              </th>
                            );
                          })}
                          {viewMode === "trash" && <th>{pageCopy.table.actions}</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedTickets.map(t => {
                            const ticketStatus = normalizeStatus(t.status);
                            const isSelected = selectedIds.has(t.id);
                            const progressPct = resolveProgressPercent(t);
                            return <tr key={t.id} className={isSelected ? styles.selectedRow : undefined} onClick={() => openTicket(t)} onContextMenu={e => openTicketContextMenu(e, t)} onAuxClick={e => {
                              if (e.button === 1) {
                                e.preventDefault();
                                openTicket(t, true);
                              }
                            }}>
                              <td className={styles.checkboxCell} onClick={e => e.stopPropagation()}>
                                <input type="checkbox" className={styles.rowCheckbox} checked={isSelected} onChange={e => toggleTicketSelection(t.id, e.target.checked)} aria-label={pageCopy.formatSelectOne(t.ticket_number || t.id)} />
                              </td>
                              {tableColumns.map(columnId => {
                                if (columnId === "ticket_number") {
                                  return <td key={columnId}>#{t.ticket_number || "-"}</td>;
                                }
                                if (columnId === "title") {
                                  return (
                                    <td key={columnId}>
                                      <span className={styles.subjectCellWrap}>
                                        <span className={styles.subjectCell}>
                                          <span className={styles.subjectCellText}>{t.title}</span>
                                        </span>
                                      </span>
                                    </td>
                                  );
                                }
                                if (columnId === "type") {
                                  return <td key={columnId}>{getTicketKindLabel(t)}</td>;
                                }
                                if (columnId === "category") {
                                  return <td key={columnId}>{getCategoryLabel(t.category, categoryLabels)}</td>;
                                }
                                if (columnId === "client") {
                                  const clientLabel = resolveClientLabel(t);
                                  return (
                                    <td key={columnId}>
                                      <span className={styles.clientCell}>
                                        <span className={styles.cellEllipsis}>
                                          {resolveClientId(t) ? <button type="button" className={styles.linkCellBtn} onClick={e => {
                                            e.stopPropagation();
                                            onNavigate?.("ContratDetail", {
                                              clientId: resolveClientId(t),
                                              name: clientLabel
                                            });
                                          }}>
                                              {clientLabel}
                                            </button> : clientLabel}
                                        </span>
                                      </span>
                                    </td>
                                  );
                                }
                                if (columnId === "requester") {
                                  const requesterLabel = resolveContactLabel(resolveRequesterContactId(t), resolveRequesterFallback(t));
                                  return (
                                    <td key={columnId}>
                                      <span className={styles.requesterCell}>
                                        <span className={styles.cellEllipsis}>
                                          {resolveRequesterContactId(t) ? <button type="button" className={styles.linkCellBtn} onClick={e => {
                                            e.stopPropagation();
                                            onNavigate?.("ContactDetail", {
                                              contactId: resolveRequesterContactId(t)
                                            });
                                          }}>
                                              {requesterLabel}
                                            </button> : requesterLabel}
                                        </span>
                                      </span>
                                    </td>
                                  );
                                }
                                if (columnId === "assigned") {
                                  return <td key={columnId}>{resolveAssigneesLabel(t)}</td>;
                                }
                                if (columnId === "tags") {
                                  const tags = resolveTicketTags(t);
                                  const visibleTags = tags.slice(0, 3);
                                  const hiddenTagCount = Math.max(0, tags.length - visibleTags.length);
                                  return (
                                    <td key={columnId} className={styles.colTags}>
                                      {tags.length > 0 ? (
                                        <div className={styles.tableTags} aria-label={pageCopy.table.tags}>
                                          {visibleTags.map(tag => (
                                            <span
                                              key={tag.id}
                                              className={styles.ticketTagChip}
                                              style={{
                                                backgroundColor: `${tag.color}18`,
                                                borderColor: `${tag.color}55`,
                                                color: tag.color
                                              }}
                                            >
                                              {tag.label}
                                            </span>
                                          ))}
                                          {hiddenTagCount > 0 ? <span className={styles.tagMore}>+{hiddenTagCount}</span> : null}
                                        </div>
                                      ) : (
                                        <span className={styles.colEmpty}>-</span>
                                      )}
                                    </td>
                                  );
                                }
                                if (columnId === "status") {
                                  return (
                                    <td key={columnId}>
                                      <span className={styles.statusBadge}>
                                        {pageCopy.getStatusBadge(ticketStatus) || t.status}
                                      </span>
                                    </td>
                                  );
                                }
                                if (columnId === "tasks") {
                                  return <td key={columnId}>{formatTasksRecap(t)}</td>;
                                }
                                if (columnId === "progress") {
                                  return (
                                    <td key={columnId}>
                                      <div className={styles.progressCell} aria-label={formatProgressLabel(t)}>
                                        <div className={styles.progressTrack} aria-hidden>
                                          <div className={styles.progressFill} style={{
                                            width: `${progressPct == null ? 0 : progressPct}%`
                                          }} />
                                        </div>
                                        <span className={styles.progressLabel}>{formatProgressLabel(t)}</span>
                                      </div>
                                    </td>
                                  );
                                }
                                if (columnId === "created_at") {
                                  return <td key={columnId}>{pageCopy.formatDateTime(t.created_at)}</td>;
                                }
                                if (columnId === "updated_at") {
                                  return <td key={columnId}>{pageCopy.formatDateTime(t.updated_at)}</td>;
                                }
                                return <td key={columnId}>-</td>;
                              })}
                              {viewMode === "trash" && <td>
                                  <div className={styles.actionRow}>
                                    <button type="button" className={styles.rowActionBtn} aria-label={pageCopy.table.restoreTitle} onClick={e => {
                                    e.stopPropagation();
                                    handleRestoreTicket(t.id);
                                  }}>
                                      <Icon icon="mdi:restore" width={16} height={16} aria-hidden />
                                    </button>
                                    {canHardPurge && <button type="button" className={`${styles.rowActionBtn} ${styles.rowActionDanger}`} aria-label={pageCopy.table.purgeTitle} onClick={e => {
                                    e.stopPropagation();
                                    handlePermanentDelete(t.id);
                                  }}>
                                        <Icon icon="mdi:delete-forever-outline" width={16} height={16} aria-hidden />
                                      </button>}
                                  </div>
                                </td>}
                            </tr>;
                          })}
                      </tbody>
                    </table>
                  </UiKitTable>

                {totalCount > 0 ? (
                  <div className={`${layout.pagination} ${layout.paginationEmbedded}`}>
                    <div className={layout.paginationLeft}>
                      <span className={layout.paginationLabel}>{pageCopy.pagination.perPage}</span>
                      <select className={layout.paginationSelect} value={pageSize} onChange={e => setPageSize(Number(e.target.value))}>
                        <option value={10}>10</option>
                        <option value={25}>25</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                      </select>
                      <span className={layout.paginationInfo}>
                        {interpolate(commonCopy.rangeInfo || "{start}–{end} / {total}", {
                          start: String((currentPage - 1) * pageSize + 1),
                          end: String(Math.min(currentPage * pageSize, totalCount)),
                          total: String(totalCount)
                        })}
                      </span>
                    </div>
                    <div className={layout.paginationRight}>
                      <button type="button" className={layout.pageBtn} onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} disabled={currentPage <= 1} aria-label={pageCopy.pagination.prev}>
                        <Icon icon="mdi:chevron-left" aria-hidden />
                      </button>
                      <span className={layout.paginationInfo}>
                        {pageCopy.formatPagination(currentPage, totalPages)}
                      </span>
                      <button type="button" className={layout.pageBtn} onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} disabled={currentPage >= totalPages} aria-label={pageCopy.pagination.next}>
                        <Icon icon="mdi:chevron-right" aria-hidden />
                      </button>
                    </div>
                  </div>
                ) : null}
                  </>}
                  </div>
                </div>
                </div>
                {selectedCount > 0 && <div className={styles.bulkBar}>
                    <div className={styles.bulkInfo}>
                      <strong>{selectedCount}</strong>
                      <span>{pageCopy.formatBulkSelected(selectedCount)}</span>
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
              </div>}
            </div>
          </div>
        </div>

        <TicketConfirmModal open={Boolean(confirmModal)} title={confirmModal?.title} message={confirmModal?.message} confirmLabel={confirmModal?.confirmLabel} icon={confirmModal?.icon} variant={confirmModal?.variant} loading={bulkDeleting} onClose={closeConfirmModal} onConfirm={confirmModal?.onConfirm} />

        <TicketBulkActionModal open={bulkModalOpen} onClose={() => setBulkModalOpen(false)} ticketIds={[...selectedIds]} users={users} contacts={contacts} onSuccess={handleBulkActionSuccess} />

        {contextMenu ? (
          <ContextMenu
            x={contextMenu.x}
            y={contextMenu.y}
            title={contextMenu.ticket?.ticket_number ? `#${contextMenu.ticket.ticket_number}` : (contextMenu.ticket?.title || pageCopy.contextMenu?.aria || "Demande")}
            items={ticketContextMenuItems}
            onClose={closeTicketContextMenu}
            ariaLabel={pageCopy.contextMenu?.aria || "Menu contextuel demande"}
          />
        ) : null}

        <TicketViewModal open={viewModalOpen} onClose={() => {
              setViewModalOpen(false);
              setEditingView(null);
            }} onSaved={handleViewSaved} initialView={editingView} isAdmin={canManageViews} pageScope={SALES_PAGE_SCOPE} />
        <TicketColumnsModal
          open={columnsModalOpen}
          onClose={() => setColumnsModalOpen(false)}
          onSaved={handleColumnsSaved}
          isAdmin={canPublicViews}
          pageScope={SALES_PAGE_SCOPE}
          initialPublic={publicTableColumns}
          initialPrivate={privateTableColumns}
          copy={{
            ...pageCopy,
            columnsModal: pageCopy.columnsModal || supportCopy.columnsModal
          }}
        />
            </div>
          </main>
        </div>
      </div>
    </div>;
}
