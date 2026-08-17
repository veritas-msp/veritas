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
import { searchTickets, fetchAllMatchingTickets, restoreTicket, permanentlyDeleteTicket, bulkUpdateTickets, fetchSalesForms, fetchTicketViews, fetchTicketViewCounts, updateTicketView, fetchTicketTableColumns } from "../../api/tickets";
import { fetchUsers } from "../../api/users";
import { fetchClientsList, fetchContactsList } from "../../api/clients";
import { useAuthContext } from "../../contexts/AuthContext";
import { usePermissions } from "../../contexts/PermissionsContext";
import TicketBulkActionModal from "./TicketBulkActionModal";
import TicketConfirmModal from "./TicketConfirmModal";
import TicketViewModal from "./TicketViewModal";
import TicketColumnsModal from "./TicketColumnsModal";
import { buildTicketSubjectTooltip } from "./ticketSubjectTooltip";
import { getBuiltinTicketViews, DEFAULT_TICKET_VIEW_ID, canUserEditTicketView } from "../../utils/ticketViewConstants";
import {
  DEFAULT_TICKET_SALES_TABLE_COLUMNS,
  TICKET_TABLE_COLUMN_SORT_KEYS,
  filterColumnsForEdition
} from "../../utils/ticketTableColumns";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { formatSalesBulkLabel, getTicketSalesPageCopy, interpolate } from "./ticketSalesPageI18n";
import { getTicketPageCopy } from "./ticketPageI18n";
import MspPageHero from "../Misc/MspPageHero/MspPageHero";
import mspStyles from "../CybersecuritePage/CybersecuritePage.module.css";

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
  const [activeViewId, setActiveViewId] = useState(DEFAULT_TICKET_VIEW_ID);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [editingView, setEditingView] = useState(null);
  const [viewsReorderMode, setViewsReorderMode] = useState(false);
  const [customViewsOrder, setCustomViewsOrder] = useState(null);
  const [viewsOrderSaving, setViewsOrderSaving] = useState(false);
  const [viewsPaneCollapsed, setViewsPaneCollapsed] = useState(readViewsPaneCollapsed);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [selectedIds, setSelectedIds] = useState(() => new Set());
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
  useEffect(() => {
    const controller = new AbortController();
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
    if (builtinTicketViews.some(view => String(view.id) === String(activeViewId))) return;
    if (String(activeViewId) === "__all__") {
      setActiveViewId(DEFAULT_TICKET_VIEW_ID);
      return;
    }
    if (!ticketViews.some(view => String(view.id) === String(activeViewId))) {
      setActiveViewId(DEFAULT_TICKET_VIEW_ID);
    }
  }, [ticketViews, activeViewId, builtinTicketViews]);
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
      if (!signal?.aborted) setViewsLoading(false);
    }
  };
  useEffect(() => {
    const controller = new AbortController();
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
  }, [activeView, viewMode, ticketType, categoryFilter, debouncedSearch, sortBy, sortDirection]);
  const loadTicketsPage = useCallback(async () => {
    ticketsSearchAbortRef.current?.abort();
    const controller = new AbortController();
    ticketsSearchAbortRef.current = controller;
    const showFullLoader = !hasLoadedTicketsOnceRef.current;
    if (showFullLoader) setLoading(true);else setRefreshing(true);
    try {
      const result = await searchTickets(buildSearchPayload({
        limit: pageSize,
        offset: (currentPage - 1) * pageSize
      }), controller.signal);
      if (controller.signal.aborted) return;
      setTickets(Array.isArray(result?.items) ? result.items : []);
      setTotalCount(Number(result?.total || 0));
      hasLoadedTicketsOnceRef.current = true;
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
  }, [buildSearchPayload, pageSize, currentPage, pageCopy.toasts.loadError]);
  const hasActiveSubFilters = Boolean(String(debouncedSearch || "").trim() || String(ticketType || "").trim() || String(categoryFilter || "").trim());
  useEffect(() => {
    const controller = new AbortController();
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
    loadTicketsPage();
    return () => ticketsSearchAbortRef.current?.abort();
  }, [loadTicketsPage]);
  const prevActiveViewIdRef = useRef(null);
  useEffect(() => {
    const isViewSwitch = prevActiveViewIdRef.current != null && String(prevActiveViewIdRef.current) !== String(activeViewId);
    prevActiveViewIdRef.current = activeViewId;
    if (activeView.sortBy) setSortBy(activeView.sortBy);
    if (activeView.sortDirection) setSortDirection(activeView.sortDirection);
    if (isViewSwitch) {
      setTicketType("");
      setCategoryFilter("");
      const nextViewMode = activeView.rules?.viewMode === "trash" ? "trash" : "active";
      setViewMode(nextViewMode);
    }
  }, [activeViewId]); // eslint-disable-line react-hooks/exhaustive-deps -- only when switching views
  const findContactById = contactId => {
    if (contactId === null || contactId === undefined || contactId === "") return null;
    return contacts.find(row => String(row.id) === String(contactId)) || null;
  };
  const resolveUserLabel = (userId, fallback) => {
    const u = users.find(row => String(row.id) === String(userId));
    return u?.ticket_helpdesk_display_name || u?.name || u?.nom || u?.username || u?.email || fallback || "-";
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
    if (ticket?.client_id) return ticket.client_id;
    const requesterContact = findContactById(resolveRequesterContactId(ticket));
    const memberships = Array.isArray(requesterContact?.clients) ? requesterContact.clients : [];
    if (memberships.length === 1) return memberships[0].client_id || memberships[0].id || "";
    if (requesterContact?.client_id) return requesterContact.client_id;
    return "";
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
    if (sortBy === nextSortBy) {
      setSortDirection(prev => prev === "asc" ? "desc" : "asc");
      return;
    }
    setSortBy(nextSortBy);
    setSortDirection("asc");
  };
  const getSortIndicator = columnId => {
    const key = TICKET_TABLE_COLUMN_SORT_KEYS[columnId] || (columnId === "kind" ? "type" : columnId);
    if (!key || sortBy !== key) return "";
    return sortDirection === "asc" ? " ▲" : " ▼";
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
    return <div key={view.id} className={`${styles.viewItem} ${isActive ? styles.viewItemActive : ""}`} onClick={() => handleSelectView(view)} onKeyDown={e => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        handleSelectView(view);
      }
    }} role="button" tabIndex={0} title={view.description || view.name} aria-pressed={isActive}>
        <span className={styles.viewItemMain}>
          <span className={styles.viewItemCount} aria-label={supportCopy.formatViewTicketCountAria(count)}>
            {count}
          </span>
          <Icon icon={view.icon || "mdi:view-list"} className={styles.viewItemIcon} aria-hidden />
          <span className={styles.viewItemLabel}>{view.name}</span>
        </span>
        {editable ? <button type="button" className={styles.viewItemEditBtn} title={viewsCopy.editView} aria-label={supportCopy.formatEditViewAria(view.name)} onClick={event => openEditViewModal(view, event)}>
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
  const categoryFilterOptions = useMemo(() => {
    const forms = salesForms.filter(form => {
      if (form.enabled === false) return false;
      if (ticketType === "installation") return form.kind === "installation";
      if (ticketType === "prestation") return form.kind === "prestation";
      return true;
    });
    return [{
      value: "",
      label: pageCopy.allCategories
    }, ...forms.map(form => ({
      value: form.categorySlug,
      label: form.label
    }))];
  }, [salesForms, ticketType, pageCopy.allCategories]);
  return <div className={`${mspStyles.mspPage} ${layout.page} msp-page-grid`}>
      <div className={mspStyles.mspLayout}>
        <div className={mspStyles.mspMain}>
          <MspPageHero eyebrow={pageCopy.eyebrow} title={pageCopy.pageTitle} subtitle={pageCopy.formatSubtitle(loading, viewMode, activeView.name, totalCount)} icon="mdi:briefcase-edit-outline" actions={<>
                {canTrash ? <label className={`${styles.trashSwitch} ${viewMode === "trash" ? styles.trashSwitchOn : ""}`} title={pageCopy.trashSwitchTitle}>
                  <Icon icon="mdi:trash-can-outline" className={styles.trashSwitchIcon} aria-hidden />
                  <span className={styles.trashSwitchLabel}>{pageCopy.trashSwitchLabel}</span>
                  <input type="checkbox" className={styles.trashSwitchInput} checked={viewMode === "trash"} onChange={e => {
              const showTrash = e.target.checked;
              setViewMode(showTrash ? "trash" : "active");
            }} aria-label={pageCopy.trashSwitchAria} />
                  <span className={styles.trashSwitchSlider} aria-hidden />
                </label> : null}
                <SmartTooltip content={pageCopy.columnsSettings || supportCopy.columnsSettings}>
                  <button type="button" className={layout.iconBtn} onClick={() => setColumnsModalOpen(true)} aria-label={pageCopy.columnsSettingsAria || supportCopy.columnsSettingsAria}>
                    <Icon icon="mdi:table-cog" />
                  </button>
                </SmartTooltip>
                {canExportSales ? <SmartTooltip content={pageCopy.exportCsv}>
                  <button type="button" className={layout.iconBtn} onClick={handleExportCsv} disabled={exporting || totalCount === 0} aria-label={pageCopy.exportCsvAria}>
                    <Icon icon="mdi:download-outline" />
                  </button>
                </SmartTooltip> : null}
                {canCreateSales ? <button type="button" className={`${layout.primaryBtn} ${layout.primaryBtnIconOnly}`} onClick={() => openCreatePage(createKind)} disabled={viewMode === "trash"} aria-label={pageCopy.newRequestAria}>
                  <FaPlus />
                </button> : null}
              </>} />

          <main className={`${mspStyles.mspContent} ${mspStyles.mspContentList}`}>
            <div className={`${layout.shell} ${layout.shellWide} ${layout.shellFull}`}>
        <div className={`${styles.viewsLayout} ${viewMode === "trash" ? styles.viewsLayoutTrash : ""} ${viewsPaneCollapsed ? styles.viewsLayoutCollapsed : ""}`.trim()}>
          {viewMode !== "trash" && !viewsPaneCollapsed && <aside className={styles.viewsPane} aria-label={pageCopy.views.paneAria}>
              <div className={styles.viewsPaneHeader}>
                <span className={styles.viewsTitle}>{viewsCopy.title}</span>
                <div className={styles.viewsHeaderActions}>
                  <SmartTooltip content={viewsCopy.collapsePane}>
                    <button type="button" className={styles.viewsCollapseBtn} onClick={() => setViewsPaneCollapsedState(true)} title={viewsCopy.collapsePane} aria-label={viewsCopy.collapsePane} disabled={viewsReorderMode}>
                      <FaChevronLeft aria-hidden />
                    </button>
                  </SmartTooltip>
                  {hasReorderableViews ? <button type="button" className={`${styles.viewsEditBtn} ${viewsReorderMode ? styles.viewsEditBtnActive : ""}`} onClick={toggleViewsReorderMode} title={viewsReorderMode ? viewsCopy.reorderFinish : viewsCopy.reorderStart} aria-label={viewsReorderMode ? viewsCopy.reorderFinish : viewsCopy.reorderStart} aria-pressed={viewsReorderMode} disabled={viewsOrderSaving}>
                      <Icon icon={viewsReorderMode ? "mdi:check" : "mdi:pencil-outline"} aria-hidden />
                    </button> : null}
                  {canManageViews ? <button type="button" className={styles.viewsAddBtn} onClick={openCreateViewModal} title={viewsCopy.create} aria-label={viewsCopy.create} disabled={viewsReorderMode}>
                    <FaPlus />
                  </button> : null}
                </div>
              </div>
              {viewsReorderMode ? <p className={styles.viewsReorderHint}>
                  {viewsOrderSaving ? viewsCopy.saving : viewsCopy.reorderHint}
                </p> : null}
              <div className={styles.viewsList}>
                {viewsLoading ? <div className={styles.viewsEmpty}>
                    <Icon icon="mdi:loading" className={layout.spinning} />
                    {viewsCopy.loading}
                  </div> : <>
                    <div className={styles.viewsGroupLabel}>{viewsCopy.general}</div>
                    {builtinTicketViews.map(view => renderViewItem(view))}
                    {renderCustomViewsSection("public", viewsCopy.team, publicViews)}
                    {renderCustomViewsSection("assigned", viewsCopy.assigned, assignedViews)}
                    {renderCustomViewsSection("private", viewsCopy.private, privateViews)}
                    {customTicketViews.length === 0 && !viewsReorderMode ? <div className={styles.viewsEmpty}>
                        <p>{viewsCopy.emptyHint}</p>
                        {canManageViews ? <button type="button" className={styles.viewsCreateLink} onClick={openCreateViewModal}>
                          {viewsCopy.create}
                        </button> : null}
                      </div> : null}
                  </>}
              </div>
            </aside>}

          <div className={styles.mainColumn}>
            <div className={`${layout.toolbar} ${styles.toolbarGrow}`}>
              {viewMode !== "trash" && viewsPaneCollapsed ? <SmartTooltip content={viewsCopy.expandPane}>
                  <button type="button" className={styles.viewsExpandBtn} onClick={() => setViewsPaneCollapsedState(false)} aria-label={viewsCopy.expandPane}>
                    <FaChevronRight aria-hidden />
                    <span>{viewsCopy.title}</span>
                  </button>
                </SmartTooltip> : null}
              <div className={`${layout.searchWrap} ${styles.searchWrapFull}`}>
                <Icon icon={isSearchPending || refreshing ? "mdi:loading" : "mdi:magnify"} className={`${layout.searchIcon} ${isSearchPending || refreshing ? layout.spinning : ""}`.trim()} aria-hidden />
                <input type="text" inputMode="search" className={layout.searchInput} value={search} onChange={e => setSearch(e.target.value)} placeholder={pageCopy.search.placeholder} aria-label={pageCopy.search.aria} />
                {search && !isSearchPending && !refreshing ? <button type="button" className={layout.clearButton} onClick={() => setSearch("")} aria-label={pageCopy.search.clear}>
                    <FaTimes />
                  </button> : null}
              </div>
              <span className={layout.toolbarMeta}>{totalCount}</span>
              <select className={layout.sortSelect} value={ticketType} onChange={e => setTicketType(e.target.value)} aria-label={pageCopy.search.filterType}>
                {pageCopy.typeFilterOptions.map(opt => <option key={opt.value || "all-types"} value={opt.value}>{opt.label}</option>)}
              </select>
              <select className={layout.sortSelect} value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} aria-label={pageCopy.search.filterCategory}>
                {categoryFilterOptions.map(opt => <option key={opt.value || "all"} value={opt.value}>{opt.label}</option>)}
              </select>
            </div>

            {loading ? <div className={layout.stateBox}>
                <Icon icon="mdi:loading" className={layout.spinning} />
                <span>{pageCopy.loading}</span>
              </div> : totalCount === 0 && !refreshing ? <div className={layout.emptyState}>
                <Icon icon="mdi:briefcase-edit-outline" className={layout.emptyStateIcon} />
                <p className={layout.emptyStateTitle}>
                  {viewMode === "trash" ? pageCopy.empty.trashTitle : pageCopy.empty.noRequestsTitle}
                </p>
                <p className={layout.emptyStateHint}>
                  {viewMode === "trash" ? pageCopy.empty.trashHint : pageCopy.empty.activeHint}
                </p>
                {viewMode !== "trash" && canCreateSales && <button type="button" className={layout.primaryBtn} onClick={() => openCreatePage(createKind)}>
                    <Icon icon="mdi:plus" />
                    {pageCopy.empty.newRequest}
                  </button>}
              </div> : <>
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

                <div className={`${styles.tablePanel} ${refreshing ? styles.tablePanelRefreshing : ""}`.trim()}>
                  <div className={styles.tableScroll}>
                    <table className={styles.table}>
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
                            return (
                              <th
                                key={columnId}
                                onClick={sortKey ? () => handleSort(columnId) : undefined}
                                style={sortKey ? undefined : { cursor: "default" }}
                              >
                                {label}{sortKey ? getSortIndicator(columnId) : ""}
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
                            return <tr key={t.id} className={isSelected ? styles.selectedRow : undefined} onClick={() => onNavigate?.("TicketSalesDetail", {
                              ticketId: t.id,
                              ticketNumber: t.ticket_number,
                              title: t.title,
                              ticketFamily: "sales",
                              fromPage: "TicketSales"
                            })}>
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
                                      <SmartTooltip as="span" className={styles.subjectCellWrap} content={buildTicketSubjectTooltip(t, {
                                        kindLabel: getTicketKindLabel(t),
                                        statusLabel: pageCopy.getStatusBadge(ticketStatus) || t.status,
                                        category: getCategoryLabel(t.category, categoryLabels),
                                        clientLabel: resolveClientLabel(t),
                                        requesterLabel: resolveContactLabel(resolveRequesterContactId(t), resolveRequesterFallback(t)),
                                        commentsCount: Number(t.comments_count ?? 0) || null
                                      }, pageCopy)}>
                                        <span className={styles.subjectCell}>
                                          <span className={styles.subjectCellText}>{t.title}</span>
                                        </span>
                                      </SmartTooltip>
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
                                  return (
                                    <td key={columnId}>
                                      {resolveClientId(t) ? <button type="button" className={styles.linkCellBtn} onClick={e => {
                                        e.stopPropagation();
                                        onNavigate?.("ContratDetail", {
                                          clientId: resolveClientId(t),
                                          name: resolveClientLabel(t)
                                        });
                                      }}>
                                          {resolveClientLabel(t)}
                                        </button> : <span>{resolveClientLabel(t)}</span>}
                                    </td>
                                  );
                                }
                                if (columnId === "requester") {
                                  return (
                                    <td key={columnId}>
                                      {resolveRequesterContactId(t) ? <button type="button" className={styles.linkCellBtn} onClick={e => {
                                        e.stopPropagation();
                                        onNavigate?.("ContactDetail", {
                                          contactId: resolveRequesterContactId(t)
                                        });
                                      }}>
                                          {resolveContactLabel(resolveRequesterContactId(t), resolveRequesterFallback(t))}
                                        </button> : <span>{resolveContactLabel(resolveRequesterContactId(t), resolveRequesterFallback(t))}</span>}
                                    </td>
                                  );
                                }
                                if (columnId === "assigned") {
                                  return <td key={columnId}>{resolveAssigneesLabel(t)}</td>;
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
                                      <div className={styles.progressCell} title={formatProgressLabel(t)}>
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
                                    <button type="button" className={styles.rowActionBtn} title={pageCopy.table.restoreTitle} onClick={e => {
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
                                        {pageCopy.table.purge}
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
                    <span className={layout.paginationLabel}>{pageCopy.pagination.perPage}</span>
                    <select className={layout.paginationSelect} value={pageSize} onChange={e => setPageSize(Number(e.target.value))}>
                      <option value={10}>10</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                  </div>
                  <div className={layout.paginationRight}>
                    <button type="button" className={layout.pageBtn} onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} disabled={currentPage <= 1} aria-label={pageCopy.pagination.prev}>
                      <FaChevronLeft />
                    </button>
                    <span className={layout.paginationInfo}>
                      {pageCopy.formatPagination(currentPage, totalPages)}
                    </span>
                    <button type="button" className={layout.pageBtn} onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} disabled={currentPage >= totalPages} aria-label={pageCopy.pagination.next}>
                      <FaChevronRight />
                    </button>
                  </div>
                </div>
              </>}
          </div>
        </div>

        <TicketConfirmModal open={Boolean(confirmModal)} title={confirmModal?.title} message={confirmModal?.message} confirmLabel={confirmModal?.confirmLabel} icon={confirmModal?.icon} variant={confirmModal?.variant} loading={bulkDeleting} onClose={closeConfirmModal} onConfirm={confirmModal?.onConfirm} />

        <TicketBulkActionModal open={bulkModalOpen} onClose={() => setBulkModalOpen(false)} ticketIds={[...selectedIds]} users={users} contacts={contacts} onSuccess={handleBulkActionSuccess} />

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
