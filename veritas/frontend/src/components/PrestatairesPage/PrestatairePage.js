import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { fetchPrestatairesList } from "../../api/prestataires";
import { fetchClientsList } from "../../api/clients";
import { fetchTicketTableColumns } from "../../api/tickets";
import { toast } from "react-toastify";
import layout from "../EnterprisesPage/EnterprisesPage.module.css";
import styles from "./PrestatairePage.module.css";
import CrmListTableSkeleton from "../Misc/Skeleton/CrmListTableSkeleton";
import SortableHeader from "../Misc/SortableHeader/SortableHeader";
import { Icon } from "@iconify/react";
import StatusDot from "../shared/StatusDot/StatusDot";
import PrestataireModal from "./PrestataireModal";
import PrestataireBulkDeleteModal from "./PrestataireBulkDeleteModal";
import TicketColumnsModal from "../TicketPage/TicketColumnsModal";
import { useDefaultPageSize } from "../../hooks/useDefaultPageSize";
import { useCrmListPagination } from "../../hooks/useCrmListPagination";
import { useCommonCopy } from "../../hooks/useCommonCopy";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { formatPageInfo } from "../../i18n/commonI18n";
import { getPrestatairePageCopy, normalizePrestataireStatusKey } from "./prestatairePageI18n";
import { interpolate } from "../../i18n/translate";
import { UiKitEmptyState, UiKitScrollFadeShell, uiKitLayoutsStyles as kit } from "../UiKit";
import mspStyles from "../CybersecuritePage/CybersecuritePage.module.css";
import { useBreakpoint } from "../../hooks/useBreakpoint";
import { usePermissions } from "../../contexts/PermissionsContext";
import { createTrackedAbortController } from "../../utils/pageLoadAbort";
import { useEntityFavorites } from "../../hooks/useEntityFavorites";
import { matchesSearchQuery } from "../../utils/tableSearch";
import { cycleSortState } from "../Misc/SortableHeader/cycleSortState";
import { getListCache, setListCache, LIST_CACHE_NS } from "../../utils/listPageCache";
import { DETAIL_CACHE_NS, getDetailCache, setDetailCache } from "../../utils/detailPageCache";
import {
  DEFAULT_PRESTATAIRES_TABLE_COLUMNS,
  PRESTATAIRES_COLUMN_LABEL_KEYS,
  normalizeTicketTableColumns,
  pinColumnLeft
} from "../../utils/ticketTableColumns";

const PRESTATAIRES_PAGE_SCOPE = "prestataires";

const PRESTATAIRES_COLUMN_SORT_KEYS = Object.freeze({
  name: "nom",
  type: "type",
  status: "statut",
  contact: "contact",
  email: "email",
  phone: "telephone",
  enterprises: "entreprises"
});

function prestatairesColumnClass(columnId) {
  const map = {
    name: styles.colName,
    type: styles.colType,
    status: styles.colStatus,
    contact: styles.colContact,
    email: styles.colEmail,
    phone: styles.colPhone,
    enterprises: styles.colEnterprises
  };
  return map[columnId] || "";
}

function PrestatairesColGroup({ columns, showCheckbox }) {
  return (
    <colgroup>
      {showCheckbox ? <col className={`${layout.checkboxCell} ${styles.colCheckbox}`.trim()} /> : null}
      {columns.map(columnId => (
        <col key={columnId} className={prestatairesColumnClass(columnId) || undefined} />
      ))}
      <col className={styles.colActions} />
      <col className={styles.colFavorite} />
      <col className={layout.chevronCell} />
    </colgroup>
  );
}

function sanitizePrestatairesTableColumns(columns) {
  return pinColumnLeft(
    normalizeTicketTableColumns(columns, {
      fallback: DEFAULT_PRESTATAIRES_TABLE_COLUMNS,
      pageScope: PRESTATAIRES_PAGE_SCOPE
    }),
    "status"
  );
}

function getContactLabel(prestataire) {
  const first = Array.isArray(prestataire?.contacts) ? prestataire.contacts[0] : null;
  if (first) {
    const parts = [first.prenom, first.nom].filter(Boolean);
    return parts.join(" ") || first.email || first.telephone || "";
  }
  const parts = [prestataire?.contact_prenom, prestataire?.contact_nom].filter(Boolean);
  return parts.join(" ") || "";
}

function getPrimaryCoords(prestataire) {
  const first = Array.isArray(prestataire?.contacts) ? prestataire.contacts[0] : null;
  return {
    email: first?.email || prestataire?.email || "",
    telephone: first?.telephone || prestataire?.telephone || ""
  };
}

function getCompaniesLabel(prestataire, getClientLabel) {
  const linked = Array.isArray(prestataire?.clients) ? prestataire.clients : [];
  const names = linked
    .map(row => row?.name || row?.client_name || (row?.id != null || row?.client_id != null ? getClientLabel?.(row.id ?? row.client_id) : ""))
    .filter(Boolean);
  if (names.length > 0) return names.join(", ");
  return getClientLabel?.(prestataire?.client_id, prestataire?.client_name) || prestataire?.client_name || "";
}

export default function PrestatairePage({
  onNavigate,
  pageParams,
  onPageParamsConsumed
}) {
  const PRESTATAIRES_CLIENTS_CACHE_KEY = "prestataires_clients_cache_v1";
  const PRESTATAIRES_CACHE_TTL_MS = 5 * 60 * 1000;
  const [prestataires, setPrestataires] = useState(() => {
    const cached = getListCache(LIST_CACHE_NS.prestataires);
    return Array.isArray(cached) ? cached : [];
  });
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(() => !Array.isArray(getListCache(LIST_CACHE_NS.prestataires)));
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("nom");
  const [sortOrder, setSortOrder] = useState("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useDefaultPageSize();
  const common = useCommonCopy();
  const locale = useAppLocale();
  const { can } = usePermissions();
  const canCreate = can("prestataires.create");
  const canExportPrestataires = can("prestataires.export");
  const canPublicViews = can("prestataires.public_views");
  const canBulkDelete = can("prestataires_detail.delete");
  const { isCompact } = useBreakpoint();
  const showBulkSelection = canBulkDelete && !isCompact;
  const pageCopy = useMemo(() => getPrestatairePageCopy(locale), [locale]);
  const pageCopyRef = useRef(pageCopy);
  pageCopyRef.current = pageCopy;
  const { isFavorite, toggleFavorite } = useEntityFavorites("prestataires_favorites");
  const [statusFilters, setStatusFilters] = useState(new Set());
  const [showModal, setShowModal] = useState(false);
  const [modalInitial, setModalInitial] = useState(null);
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [bulkDeleteModalOpen, setBulkDeleteModalOpen] = useState(false);
  const [columnsModalOpen, setColumnsModalOpen] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [publicTableColumns, setPublicTableColumns] = useState(() => sanitizePrestatairesTableColumns(DEFAULT_PRESTATAIRES_TABLE_COLUMNS));
  const [privateTableColumns, setPrivateTableColumns] = useState(null);
  const [visibleTableColumns, setVisibleTableColumns] = useState(() => sanitizePrestatairesTableColumns(DEFAULT_PRESTATAIRES_TABLE_COLUMNS));
  const tableColumns = visibleTableColumns;
  const loadControllerRef = useRef(null);
  const clientsControllerRef = useRef(null);
  const moreMenuRef = useRef(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    if (!isCompact) return;
    setSelectedIds(new Set());
  }, [isCompact]);

  useEffect(() => {
    if (!moreMenuOpen) return undefined;
    const onPointerDown = event => {
      if (!moreMenuRef.current?.contains(event.target)) setMoreMenuOpen(false);
    };
    const onKeyDown = event => {
      if (event.key === "Escape") setMoreMenuOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [moreMenuOpen]);

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
  const copyToClipboard = async (text, label) => {
    const raw = (text || "").toString().trim();
    if (!raw) {
      toast.info(interpolate(pageCopy.clipboard.unavailable, { label }));
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
      toast.success(interpolate(pageCopy.clipboard.copied, { label }));
    } catch {
      toast.error(interpolate(pageCopy.clipboard.copyFailed, { label: label.toLowerCase() }));
    }
  };

  const buildPrestataireSharePayload = row => {
    const name = (row?.nom || pageCopy.unnamed).toString().trim();
    const type = (row?.type || "").toString().trim();
    const contactLabel = getContactLabel(row);
    const { email, telephone } = getPrimaryCoords(row);
    const companies = getCompaniesLabel(row, pageCopy.getClientLabel);
    const status = pageCopy.getPrestataireStatus(row?.statut).label;
    const lines = pageCopy.share.lines;
    const payloadLines = [
      `${lines.provider}: ${name}`,
      type ? `${lines.type}: ${type}` : null,
      status ? `${lines.status}: ${status}` : null,
      contactLabel ? `${lines.contact}: ${contactLabel}` : null,
      telephone ? `${lines.phone}: ${telephone}` : null,
      email ? `${lines.email}: ${email}` : null,
      companies ? `${lines.enterprises}: ${companies}` : null
    ].filter(Boolean);
    return {
      title: interpolate(pageCopy.share.title, { name }),
      text: payloadLines.join("\n")
    };
  };

  const sharePrestataire = async row => {
    const payload = buildPrestataireSharePayload(row);
    try {
      if (navigator?.share) {
        await navigator.share({
          title: payload.title,
          text: payload.text
        });
        return;
      }
      toast.info(pageCopy.share.unavailable);
    } catch (e) {
      if (e?.name !== "AbortError") toast.info(pageCopy.share.cancelled);
    }
  };

  useEffect(() => {
    isMountedRef.current = true;
    const hadCache = Array.isArray(getListCache(LIST_CACHE_NS.prestataires));
    const controller = createTrackedAbortController();
    loadControllerRef.current?.abort();
    loadControllerRef.current = controller;
    loadData(controller.signal, { silent: hadCache });
    const handleRefresh = () => {
      const refreshController = createTrackedAbortController();
      loadControllerRef.current?.abort();
      loadControllerRef.current = refreshController;
      loadData(refreshController.signal, { silent: true });
    };
    window.addEventListener("refreshPrestataires", handleRefresh);
    return () => {
      isMountedRef.current = false;
      loadControllerRef.current?.abort();
      clientsControllerRef.current?.abort();
      window.removeEventListener("refreshPrestataires", handleRefresh);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await fetchTicketTableColumns(PRESTATAIRES_PAGE_SCOPE);
        if (cancelled) return;
        setPublicTableColumns(sanitizePrestatairesTableColumns(Array.isArray(data?.public) ? data.public : DEFAULT_PRESTATAIRES_TABLE_COLUMNS));
        setPrivateTableColumns(Array.isArray(data?.private) && data.private.length ? sanitizePrestatairesTableColumns(data.private) : null);
        setVisibleTableColumns(sanitizePrestatairesTableColumns(Array.isArray(data?.effective) && data.effective.length ? data.effective : DEFAULT_PRESTATAIRES_TABLE_COLUMNS));
      } catch {
        if (!cancelled) toast.error(pageCopyRef.current.toasts?.loadColumns || "Error loading columns");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleColumnsSaved = useCallback(result => {
    if (Array.isArray(result?.public)) setPublicTableColumns(sanitizePrestatairesTableColumns(result.public));
    setPrivateTableColumns(Array.isArray(result?.private) && result.private.length ? sanitizePrestatairesTableColumns(result.private) : null);
    setVisibleTableColumns(sanitizePrestatairesTableColumns(Array.isArray(result?.effective) && result.effective.length ? result.effective : DEFAULT_PRESTATAIRES_TABLE_COLUMNS));
  }, []);

  const ensureClientsLoaded = async () => {
    if (clients.length > 0) return true;
    try {
      const rawClients = sessionStorage.getItem(PRESTATAIRES_CLIENTS_CACHE_KEY);
      if (rawClients) {
        const parsedClients = JSON.parse(rawClients);
        const clientsFresh = parsedClients?.savedAt && Array.isArray(parsedClients?.data)
          && Date.now() - parsedClients.savedAt < PRESTATAIRES_CACHE_TTL_MS;
        if (clientsFresh) {
          setClients(parsedClients.data);
          return true;
        }
      }
    } catch {}
    clientsControllerRef.current?.abort();
    const controller = createTrackedAbortController();
    clientsControllerRef.current = controller;
    try {
      const clientsData = await fetchClientsList({ signal: controller.signal });
      if (controller.signal.aborted || !isMountedRef.current) return false;
      const normalized = Array.isArray(clientsData) ? clientsData : [];
      setClients(normalized);
      try {
        sessionStorage.setItem(PRESTATAIRES_CLIENTS_CACHE_KEY, JSON.stringify({
          savedAt: Date.now(),
          data: normalized
        }));
      } catch {}
      return true;
    } catch (err) {
      if (err?.name !== "AbortError") {
        console.error("Error chargement entreprises:", err);
        toast.error("Impossible de charger la liste des entreprises.");
      }
      return false;
    }
  };

  const loadData = async (signal, options = {}) => {
    const silent = options.silent === true;
    if (!silent) {
      setLoading(true);
      setError(null);
    }
    try {
      const data = await fetchPrestatairesList(null, { signal });
      if (signal?.aborted) return;
      const normalized = Array.isArray(data) ? data : [];
      setListCache(LIST_CACHE_NS.prestataires, normalized);
      if (!isMountedRef.current) return;
      setPrestataires(normalized);
    } catch (err) {
      if (err?.name === "AbortError") return;
      if (!silent) setError(err.message || "Error loading data");
      console.error("Error chargement prestataires:", err);
    } finally {
      if (!silent && isMountedRef.current) setLoading(false);
    }
  };

  const handleOpenAdd = async () => {
    const ok = await ensureClientsLoaded();
    if (!ok) return;
    setModalInitial(null);
    setShowModal(true);
  };

  useEffect(() => {
    if (!pageParams?.openCreateModal) return;
    let cancelled = false;
    (async () => {
      const ok = await ensureClientsLoaded();
      if (cancelled || !ok) return;
      setModalInitial(null);
      setShowModal(true);
      onPageParamsConsumed?.();
    })();
    return () => {
      cancelled = true;
    };
  }, [pageParams, onPageParamsConsumed]);

  const handleModalClose = () => {
    setShowModal(false);
    setModalInitial(null);
  };

  const handleSaved = saved => {
    if (!saved?.id) return;
    setPrestataires(prev => {
      const index = prev.findIndex(p => String(p.id) === String(saved.id));
      const next = index === -1
        ? [...prev, saved]
        : prev.map(p => (String(p.id) === String(saved.id) ? { ...p, ...saved } : p));
      setListCache(LIST_CACHE_NS.prestataires, next);
      return next;
    });
  };

  const matchesSearch = (row, query) => {
    const companyNames = (Array.isArray(row?.clients) ? row.clients : [])
      .map(c => c?.name || c?.client_name)
      .filter(Boolean);
    const contactFields = (Array.isArray(row?.contacts) ? row.contacts : []).flatMap(c => [
      c?.nom,
      c?.prenom,
      c?.email,
      c?.telephone
    ]);
    const { email, telephone } = getPrimaryCoords(row);
    return matchesSearchQuery(query, [
      row.nom,
      row.type,
      pageCopy.getPrestataireStatus(row?.statut).label,
      row.contact_nom,
      row.contact_prenom,
      getContactLabel(row),
      row.email,
      row.telephone,
      email,
      telephone,
      getCompaniesLabel(row, pageCopy.getClientLabel),
      ...contactFields,
      ...companyNames
    ]);
  };

  const filteredForStats = useMemo(() => {
    let filtered = [...prestataires];
    if (searchQuery.trim()) {
      filtered = filtered.filter(p => matchesSearch(p, searchQuery));
    }
    return filtered;
  }, [prestataires, searchQuery, pageCopy]);

  const statusCounts = useMemo(() => {
    const counts = { active: 0, inactive: 0 };
    filteredForStats.forEach(p => {
      const key = normalizePrestataireStatusKey(p.statut);
      if (counts[key] !== undefined) counts[key] += 1;
    });
    return counts;
  }, [filteredForStats]);

  const filteredAndSorted = useMemo(() => {
    let filtered = [...prestataires];
    if (searchQuery.trim()) {
      filtered = filtered.filter(p => matchesSearch(p, searchQuery));
    }
    if (statusFilters.size > 0) {
      filtered = filtered.filter(p => statusFilters.has(normalizePrestataireStatusKey(p.statut)));
    }
    filtered.sort((a, b) => {
      const aFav = isFavorite(a.id);
      const bFav = isFavorite(b.id);
      if (aFav !== bFav) return aFav ? -1 : 1;
      const dir = sortOrder === "asc" ? 1 : -1;
      let aVal;
      let bVal;
      if (sortBy === "entreprises") {
        aVal = getCompaniesLabel(a, pageCopy.getClientLabel).toLowerCase();
        bVal = getCompaniesLabel(b, pageCopy.getClientLabel).toLowerCase();
      } else if (sortBy === "contact") {
        aVal = getContactLabel(a).toLowerCase();
        bVal = getContactLabel(b).toLowerCase();
      } else if (sortBy === "statut") {
        aVal = normalizePrestataireStatusKey(a.statut);
        bVal = normalizePrestataireStatusKey(b.statut);
      } else if (sortBy === "email" || sortBy === "telephone") {
        const aCoords = getPrimaryCoords(a);
        const bCoords = getPrimaryCoords(b);
        aVal = String(aCoords[sortBy] || "").toLowerCase();
        bVal = String(bCoords[sortBy] || "").toLowerCase();
      } else {
        aVal = String(a[sortBy] || "").toLowerCase();
        bVal = String(b[sortBy] || "").toLowerCase();
      }
      if (aVal < bVal) return -1 * dir;
      if (aVal > bVal) return 1 * dir;
      return 0;
    });
    return filtered;
  }, [prestataires, searchQuery, statusFilters, sortBy, sortOrder, pageCopy, isFavorite]);

  const {
    paginatedItems: paginated,
    totalPages,
    effectivePage,
    isFilteredEmpty,
    rangeStart,
    rangeEnd
  } = useCrmListPagination(
    filteredAndSorted,
    pageSize,
    currentPage,
    setCurrentPage,
    [searchQuery, statusFilters, sortBy, sortOrder, pageSize]
  );
  const tableScrollRef = useRef(null);
  const showSourceEmpty = !loading && prestataires.length === 0;
  const showFilteredEmpty = !loading && prestataires.length > 0 && isFilteredEmpty;
  const tableColSpan = useMemo(() => {
    let span = tableColumns.length + 3;
    if (showBulkSelection) span += 1;
    return span;
  }, [tableColumns.length, showBulkSelection]);

  useEffect(() => {
    setSelectedIds(prev => {
      if (!prev.size) return prev;
      const valid = new Set(filteredAndSorted.map(row => String(row.id)));
      const next = [...prev].filter(id => valid.has(String(id)));
      return next.length === prev.size ? prev : new Set(next);
    });
  }, [filteredAndSorted]);

  const pageIds = useMemo(() => paginated.map(row => String(row.id)), [paginated]);
  const selectedCount = selectedIds.size;
  const allOnPageSelected = pageIds.length > 0 && pageIds.every(id => selectedIds.has(id));
  const clearSelection = () => setSelectedIds(new Set());
  const toggleRowSelection = (rowId, checked) => {
    const id = String(rowId);
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };
  const toggleSelectAllOnPage = () => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (allOnPageSelected) {
        pageIds.forEach(id => next.delete(id));
      } else {
        pageIds.forEach(id => next.add(id));
      }
      return next;
    });
  };
  const refreshPrestatairesSilent = () => {
    const refreshController = createTrackedAbortController();
    loadControllerRef.current?.abort();
    loadControllerRef.current = refreshController;
    loadData(refreshController.signal, { silent: true });
  };
  const handleBulkDeleteSuccess = result => {
    const deleted = Number(result?.deleted) || 0;
    const failed = Array.isArray(result?.failed) ? result.failed.length : 0;
    if (deleted > 0 && failed === 0) {
      toast.success(pageCopy.formatBulkDeleteSuccess(deleted));
    } else if (deleted > 0 && failed > 0) {
      toast.warn(pageCopy.formatBulkPartial(deleted, failed));
    } else {
      toast.error(pageCopy.toasts.bulkError);
    }
    clearSelection();
    refreshPrestatairesSilent();
  };

  const toggleStatusFilter = statusKey => {
    setStatusFilters(prev => {
      const next = new Set(prev);
      if (next.has(statusKey)) next.delete(statusKey);
      else next.add(statusKey);
      return next;
    });
  };
  const toggleSort = column => {
    const next = cycleSortState({
      column,
      sortBy,
      sortDirection: sortOrder,
      defaultSortBy: "nom",
      defaultSortDirection: "asc"
    });
    setSortBy(next.sortBy);
    setSortOrder(next.sortDirection);
  };
  const ThSort = ({ label, col }) => (
    <SortableHeader
      as="button"
      column={col}
      label={label}
      sortBy={sortBy}
      sortDirection={sortOrder}
      onSort={toggleSort}
      buttonClassName={layout.thBtn}
    />
  );

  const openPrestataire = (row, background = false) => {
    if (!onNavigate) return;
    if (row?.id) {
      const existing = getDetailCache(DETAIL_CACHE_NS.prestataire, row.id, { ttlMs: 0 });
      if (!existing?.prestataire) {
        setDetailCache(DETAIL_CACHE_NS.prestataire, row.id, {
          prestataire: row
        });
      }
    }
    onNavigate("PrestataireDetail", { prestataireId: row.id, nom: row.nom }, background ? { background: true } : undefined);
  };

  const renderStatus = row => {
    const status = pageCopy.getPrestataireStatus(row.statut);
    const isActive = status.key === "active";
    return <StatusDot active={isActive} label={status.label} className={styles.statusDotOnly} />;
  };

  const handleExportCsv = () => {
    const headers = tableColumns.map(columnId => {
      const labelKey = PRESTATAIRES_COLUMN_LABEL_KEYS[columnId];
      return pageCopy.table[labelKey] || pageCopy.table[columnId] || columnId;
    });
    const rows = [headers];
    filteredAndSorted.forEach(row => {
      const contactLabel = getContactLabel(row);
      const companies = getCompaniesLabel(row, pageCopy.getClientLabel);
      const { email, telephone } = getPrimaryCoords(row);
      const status = pageCopy.getPrestataireStatus(row.statut);
      const values = tableColumns.map(columnId => {
        if (columnId === "name") return row.nom || "";
        if (columnId === "type") return row.type || "";
        if (columnId === "status") return status.label || "";
        if (columnId === "contact") return contactLabel || "";
        if (columnId === "email") return email || "";
        if (columnId === "phone") return telephone || "";
        if (columnId === "enterprises") return companies || "";
        return "";
      });
      rows.push(values);
    });
    const csvContent = rows.map(row => row.map(value => {
      const stringValue = value == null ? "" : String(value);
      if (/[",;\n]/.test(stringValue)) return `"${stringValue.replace(/"/g, '""')}"`;
      return stringValue;
    }).join(";")).join("\n");
    const blob = new Blob([`\uFEFF${csvContent}`], {
      type: "text/csv;charset=utf-8;"
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", pageCopy.export.filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const tableToolbar = (
    <div className={layout.tableSearchBar}>
      <header className={layout.cardHead}>
        <span className={layout.cardHeadIcon} aria-hidden>
          <Icon icon="mdi:handshake-outline" />
        </span>
        <h1 className={layout.cardTitle}>{pageCopy.pageTitle}</h1>
      </header>
      <div className={kit.searchBox}>
        <Icon icon="mdi:magnify" className={kit.searchIcon} aria-hidden />
        <input
          type="text"
          inputMode="search"
          enterKeyHint="search"
          autoComplete="off"
          placeholder={pageCopy.searchPlaceholder}
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className={kit.searchInput}
          aria-label={pageCopy.searchAria}
        />
        {searchQuery ? (
          <button
            type="button"
            className={kit.searchClear}
            onClick={() => setSearchQuery("")}
            aria-label={pageCopy.clearSearch}
          >
            <Icon icon="mdi:close" aria-hidden />
          </button>
        ) : null}
      </div>
      <div className={layout.toolbarActions}>
        <div className={layout.statusChips} role="group" aria-label={pageCopy.filterByStatus || pageCopy.pageTitle}>
          {pageCopy.statusFilters.map(item => {
            const count = statusCounts[item.key] || 0;
            const active = statusFilters.has(item.key);
            return (
              <button
                key={item.key}
                type="button"
                className={`${layout.statusChip} ${active ? layout.statusChipActive : ""} ${count === 0 ? layout.statusChipDisabled : ""}`}
                onMouseDown={e => e.preventDefault()}
                onClick={() => toggleStatusFilter(item.key)}
                disabled={loading || error || count === 0}
              >
                <span className={layout.statusChipIcon}>
                  <Icon icon={item.icon} aria-hidden />
                </span>
                <span className={layout.statusChipLabel}>{item.label}</span>
                <span className={layout.statusChipCount}>{count}</span>
              </button>
            );
          })}
        </div>
        <div className={layout.toolbarGroupedActions}>
          <div className={layout.exportMenuWrap} ref={moreMenuRef}>
            
              <button
                type="button"
                className={`${kit.btnSquare} ${kit.btnSquareSecondary}`}
                onClick={() => setMoreMenuOpen(open => !open)}
                aria-expanded={moreMenuOpen}
                aria-haspopup="menu"
                aria-label={pageCopy.moreActions || "Plus d'actions"}
              >
                <Icon icon="mdi:dots-horizontal" width={16} height={16} aria-hidden />
              </button>
            
            {moreMenuOpen ? (
              <div className={layout.exportMenu} role="menu">
                <button
                  type="button"
                  role="menuitem"
                  className={layout.exportMenuItem}
                  onClick={() => {
                    setMoreMenuOpen(false);
                    setColumnsModalOpen(true);
                  }}
                >
                  <Icon icon="mdi:table-cog" className={layout.exportMenuItemIcon} aria-hidden />
                  {pageCopy.columnsSettings}
                </button>
                {canExportPrestataires ? (
                  <button
                    type="button"
                    role="menuitem"
                    className={layout.exportMenuItem}
                    onClick={() => {
                      setMoreMenuOpen(false);
                      handleExportCsv();
                    }}
                  >
                    <Icon icon="mdi:download-outline" className={layout.exportMenuItemIcon} aria-hidden />
                    {pageCopy.exportCsv}
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
          {canCreate ? (
            
              <button
                type="button"
                className={`${kit.btnSquare} ${kit.btnSquarePrimary}`}
                onClick={handleOpenAdd}
                aria-label={pageCopy.newPrestataire}
              >
                <Icon icon="mdi:plus" aria-hidden />
              </button>
            
          ) : null}
        </div>
      </div>
    </div>
  );

  const showSkeleton = Boolean(loading);
  return (
    <div className={`${mspStyles.mspPage} ${layout.page} msp-page-grid`}>
      <div className={mspStyles.mspLayout}>
        <div className={mspStyles.mspMain}>
          <main className={`${mspStyles.mspContent} ${mspStyles.mspContentList} ${layout.contentNoHero}`}>
            <div className={`${layout.shell} ${layout.shellWide} ${layout.shellFull}`}>
              {error && !showSkeleton ? (
                <div className={`${layout.stateBox} ${layout.stateBoxError}`}>
                  <Icon icon="mdi:alert-circle-outline" />
                  <span>{error}</span>
                </div>
              ) : (
                <div className={layout.listBody}>
                  <div className={layout.listArea}>
                    <div className={layout.panelCard}>
                      {tableToolbar}

                      {showSourceEmpty ? (
                        <div className={layout.emptyStateInCard}>
                          <UiKitEmptyState bare icon="mdi:handshake-outline" title={pageCopy.emptyTitle} text={pageCopy.emptyHint} />
                          {canCreate ? (
                            <button type="button" className={layout.primaryBtn} onClick={handleOpenAdd}>
                              <Icon icon="mdi:plus" />
                              {pageCopy.newPrestataire}
                            </button>
                          ) : null}
                        </div>
                      ) : (
                        <>
                    <div className={layout.listTableStack}>
                    <UiKitScrollFadeShell
                      className={layout.dataTableWrap}
                      fadeTop
                      deps={[pageSize, tableColumns.join("|"), showSkeleton, showBulkSelection]}
                      scrollViewportRef={tableScrollRef}
                      header={
                        <table className={layout.dataTable}>
                          <PrestatairesColGroup columns={tableColumns} showCheckbox={showBulkSelection} />
                          <thead>
                            <tr>
                              {showBulkSelection ? (
                                <th className={`${layout.checkboxCell} ${styles.colCheckbox}`.trim()}>
                                  <input
                                    type="checkbox"
                                    className={layout.rowCheckbox}
                                    checked={allOnPageSelected}
                                    onChange={toggleSelectAllOnPage}
                                    onClick={e => e.stopPropagation()}
                                    aria-label={pageCopy.bulk.selectAll}
                                    disabled={showSkeleton}
                                  />
                                </th>
                              ) : null}
                              {tableColumns.map(columnId => {
                                const sortKey = PRESTATAIRES_COLUMN_SORT_KEYS[columnId];
                                const labelKey = PRESTATAIRES_COLUMN_LABEL_KEYS[columnId];
                                const columnClass = prestatairesColumnClass(columnId);
                                const label = pageCopy.table[labelKey] || pageCopy.table[columnId] || columnId;
                                if (!sortKey) {
                                  return <th key={columnId} className={columnClass}>{label}</th>;
                                }
                                return (
                                  <th key={columnId} className={columnClass} aria-sort={sortBy === sortKey ? (sortOrder === "asc" ? "ascending" : "descending") : "none"}>
                                    <ThSort label={label} col={sortKey} />
                                  </th>
                                );
                              })}
                              <th className={styles.colActions}>{pageCopy.table.actions}</th>
                              <th className={`${layout.favoriteCell} ${styles.colFavorite}`.trim()}>{pageCopy.favorites.columnLabel}</th>
                              <th className={layout.chevronCell} aria-hidden />
                            </tr>
                          </thead>
                        </table>
                      }
                    >
                      <table className={`${layout.dataTable} ${layout.dataTableBody}`} aria-busy={showSkeleton || undefined} aria-label={showSkeleton ? pageCopy.loading : undefined}>
                        <PrestatairesColGroup columns={tableColumns} showCheckbox={showBulkSelection} />
                        <tbody>
                          {showSkeleton ? (
                            <CrmListTableSkeleton
                              layout={layout}
                              pageStyles={styles}
                              columns={tableColumns}
                              rows={pageSize || 50}
                              showCheckbox={showBulkSelection}
                              checkboxClassName={styles.colCheckbox}
                              preset="prestataires"
                              showActions
                              actionsClassName={styles.colActions}
                              showFavorite
                              favoriteClassName={styles.colFavorite}
                              showChevron
                            />
                          ) : null}
                          {!showSkeleton && showFilteredEmpty ? (
                            <tr className={layout.dataTableEmptyRow}>
                              <td colSpan={tableColSpan} className={layout.dataTableEmptyCell}>
                                {pageCopy.emptyHint}
                              </td>
                            </tr>
                          ) : null}
                          {!showSkeleton && !showFilteredEmpty && paginated.map(row => {
                            const contactLabel = getContactLabel(row);
                            const companies = getCompaniesLabel(row, pageCopy.getClientLabel) || "-";
                            const { email, telephone } = getPrimaryCoords(row);
                            const telHref = telephone ? toTelHref(telephone) : "";
                            const mailHref = email ? toMailtoHref(email) : "";
                            const favorited = isFavorite(row.id);
                            const rowIdStr = String(row.id);
                            const isSelected = selectedIds.has(rowIdStr);
                            const rowName = row.nom || pageCopy.unnamed;
                            return (
                              <tr
                                key={row.id}
                                className={`${layout.dataTableRow} ${isSelected ? layout.selectedRow : ""}`}
                                onClick={() => openPrestataire(row)}
                                onAuxClick={e => {
                                  if (e.button === 1) {
                                    e.preventDefault();
                                    openPrestataire(row, true);
                                  }
                                }}
                                onKeyDown={e => {
                                  if (e.key === "Enter" || e.key === " ") {
                                    e.preventDefault();
                                    openPrestataire(row);
                                  }
                                }}
                                role="button"
                                tabIndex={0}
                              >
                                {showBulkSelection ? (
                                  <td className={`${layout.checkboxCell} ${styles.colCheckbox}`.trim()} onClick={e => e.stopPropagation()}>
                                    <input
                                      type="checkbox"
                                      className={layout.rowCheckbox}
                                      checked={isSelected}
                                      onChange={e => toggleRowSelection(row.id, e.target.checked)}
                                      aria-label={pageCopy.formatBulkSelectRow(rowName)}
                                    />
                                  </td>
                                ) : null}
                                {tableColumns.map(columnId => {
                                  if (columnId === "name") {
                                    return (
                                      <td key={columnId} className={`${layout.colCompany} ${styles.colName}`.trim()}>
                                        <span className={styles.cellEllipsis}>{rowName}</span>
                                      </td>
                                    );
                                  }
                                  if (columnId === "type") {
                                    return (
                                      <td key={columnId} className={`${layout.colMuted} ${styles.colType}`.trim()}>
                                        {row.type ? (
                                          <span className={styles.cellEllipsis}>{row.type}</span>
                                        ) : (
                                          <span className={layout.colEmpty}>-</span>
                                        )}
                                      </td>
                                    );
                                  }
                                  if (columnId === "status") {
                                    return <td key={columnId} className={styles.colStatus}>{renderStatus(row)}</td>;
                                  }
                                  if (columnId === "contact") {
                                    return (
                                      <td key={columnId} className={`${layout.colMuted} ${styles.colContact}`.trim()}>
                                        {contactLabel || <span className={layout.colEmpty}>-</span>}
                                      </td>
                                    );
                                  }
                                  if (columnId === "email") {
                                    return (
                                      <td key={columnId} className={styles.colEmail} onClick={e => e.stopPropagation()}>
                                        {email ? (
                                          <div className={styles.cellWithActionAlign}>
                                            
                                              <a href={mailHref} className={styles.detailLink}>{email}</a>
                                            
                                            
                                              <button
                                                type="button"
                                                className={styles.inlineCopyBtn}
                                                aria-label={pageCopy.actions.copyEmail}
                                                onClick={() => copyToClipboard(email, pageCopy.clipboardLabels.email)}
                                              >
                                                <Icon icon="mdi:content-copy" />
                                              </button>
                                            
                                          </div>
                                        ) : (
                                          <span className={layout.colEmpty}>-</span>
                                        )}
                                      </td>
                                    );
                                  }
                                  if (columnId === "phone") {
                                    return (
                                      <td key={columnId} className={styles.colPhone} onClick={e => e.stopPropagation()}>
                                        {telephone ? (
                                          <div className={styles.cellWithAction}>
                                            
                                              <a href={telHref} className={styles.detailLink}>{telephone}</a>
                                            
                                            
                                              <button
                                                type="button"
                                                className={styles.inlineCopyBtn}
                                                aria-label={pageCopy.actions.copyPhone}
                                                onClick={() => copyToClipboard(telephone, pageCopy.clipboardLabels.phone)}
                                              >
                                                <Icon icon="mdi:content-copy" />
                                              </button>
                                            
                                          </div>
                                        ) : (
                                          <span className={layout.colEmpty}>-</span>
                                        )}
                                      </td>
                                    );
                                  }
                                  if (columnId === "enterprises") {
                                    return (
                                      <td key={columnId} className={`${layout.colMuted} ${styles.colEnterprises}`.trim()}>
                                        {companies}
                                      </td>
                                    );
                                  }
                                  return <td key={columnId}><span className={layout.colEmpty}>-</span></td>;
                                })}
                                <td className={`${styles.actionsCell} ${styles.colActions}`.trim()} onClick={e => e.stopPropagation()}>
                                  <div className={styles.cardActions}>
                                    {telHref ? (
                                      <a
                                        href={telHref}
                                        className={styles.iconActionBtn}
                                        aria-label={interpolate(pageCopy.actions.callPhoneAria, { phone: telephone })}
                                      >
                                        <Icon icon="mdi:phone-outline" aria-hidden />
                                      </a>
                                    ) : null}
                                    {mailHref ? (
                                      <a
                                        href={mailHref}
                                        className={styles.iconActionBtn}
                                        aria-label={interpolate(pageCopy.actions.sendEmailAria, { email })}
                                      >
                                        <Icon icon="mdi:email-outline" aria-hidden />
                                      </a>
                                    ) : null}
                                    
                                      <button
                                        type="button"
                                        className={styles.iconActionBtn}
                                        aria-label={pageCopy.actions.copyCardAria}
                                        onClick={() => {
                                          const payload = buildPrestataireSharePayload(row);
                                          copyToClipboard(payload.text, pageCopy.actions.shareCard);
                                        }}
                                      >
                                        <Icon icon="mdi:content-copy" />
                                      </button>
                                    
                                    
                                      <button
                                        type="button"
                                        className={styles.iconActionBtn}
                                        aria-label={pageCopy.actions.shareAria}
                                        onClick={() => sharePrestataire(row)}
                                      >
                                        <Icon icon="mdi:share-variant" />
                                      </button>
                                    
                                  </div>
                                </td>
                                <td className={`${layout.favoriteCell} ${styles.colFavorite}`.trim()} onClick={e => e.stopPropagation()}>
                                  
                                    <button
                                      type="button"
                                      className={`${layout.favoriteBtn} ${favorited ? layout.favoriteBtnActive : ""}`}
                                      aria-label={favorited ? pageCopy.favorites.remove : pageCopy.favorites.add}
                                      aria-pressed={favorited}
                                      onClick={() => toggleFavorite(row.id)}
                                    >
                                      <Icon icon={favorited ? "mdi:star" : "mdi:star-outline"} aria-hidden />
                                    </button>
                                  
                                </td>
                                <td className={layout.chevronCell} aria-hidden>
                                  <Icon icon="mdi:chevron-right" className={layout.rowChevron} />
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </UiKitScrollFadeShell>

                    <div className={`${layout.pagination} ${layout.paginationEmbedded}`}>
                      <div className={layout.paginationLeft}>
                        <span className={layout.paginationLabel}>{common.perPage}</span>
                        <select className={layout.paginationSelect} value={pageSize} onChange={e => setPageSize(Number(e.target.value))} disabled={showSkeleton}>
                          <option value={10}>10</option>
                          <option value={25}>25</option>
                          <option value={50}>50</option>
                          <option value={100}>100</option>
                        </select>
                        <span className={layout.paginationInfo}>
                          {showSkeleton
                            ? "—"
                            : interpolate(common.rangeInfo || "{start}–{end} / {total}", {
                                start: String(rangeStart),
                                end: String(rangeEnd),
                                total: String(filteredAndSorted.length)
                              })}
                        </span>
                      </div>
                      <div className={layout.paginationRight}>
                        
                          <button
                            type="button"
                            className={layout.pageBtn}
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={showSkeleton || effectivePage <= 1}
                            aria-label={common.prevPage}
                          >
                            <Icon icon="mdi:chevron-left" aria-hidden />
                          </button>
                        
                        <span className={layout.paginationInfo}>
                          {showSkeleton ? "—" : formatPageInfo(locale, effectivePage, totalPages)}
                        </span>
                        
                          <button
                            type="button"
                            className={layout.pageBtn}
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={showSkeleton || effectivePage >= totalPages}
                            aria-label={common.nextPage}
                          >
                            <Icon icon="mdi:chevron-right" aria-hidden />
                          </button>
                        
                      </div>
                    </div>
                    </div>
                        </>
                      )}
                    </div>
                  </div>
                  {selectedCount > 0 && showBulkSelection && !showSkeleton ? (
                    <div className={layout.bulkBar}>
                      <div className={layout.bulkInfo}>
                        <strong>{selectedCount}</strong>
                        <span>{selectedCount > 1 ? pageCopy.bulk.selectedPlural : pageCopy.bulk.selected}</span>
                      </div>
                      <div className={layout.bulkActions}>
                        {canBulkDelete ? (
                          <button type="button" className={layout.bulkBtn} onClick={() => setBulkDeleteModalOpen(true)}>
                            <Icon icon="mdi:delete-outline" />
                            {pageCopy.bulk.delete}
                          </button>
                        ) : null}
                        <button type="button" className={layout.bulkBtnGhost} onClick={clearSelection}>
                          {pageCopy.bulk.clearSelection}
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          </main>
        </div>
      </div>

      {showModal && (
        <PrestataireModal
          open={showModal}
          initialPrestataire={modalInitial}
          onClose={handleModalClose}
          onSuccess={handleSaved}
          clients={clients}
        />
      )}
      <PrestataireBulkDeleteModal
        open={bulkDeleteModalOpen}
        onClose={() => setBulkDeleteModalOpen(false)}
        prestataireIds={[...selectedIds]}
        onSuccess={handleBulkDeleteSuccess}
      />
      <TicketColumnsModal
        open={columnsModalOpen}
        onClose={() => setColumnsModalOpen(false)}
        onSaved={handleColumnsSaved}
        isAdmin={canPublicViews}
        pageScope={PRESTATAIRES_PAGE_SCOPE}
        initialPublic={publicTableColumns}
        initialPrivate={privateTableColumns}
        columnLabelKeys={PRESTATAIRES_COLUMN_LABEL_KEYS}
        copy={pageCopy}
      />
    </div>
  );
}
