import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { fetchContactsList, fetchClientsList } from "../../api/clients";
import { fetchTicketTableColumns } from "../../api/tickets";
import { toast } from "react-toastify";
import layout from "../EnterprisesPage/EnterprisesPage.module.css";
import styles from "./ContactPage.module.css";
import { FaTimes, FaChevronLeft, FaChevronRight, FaPlus } from "react-icons/fa";
import { Icon } from "@iconify/react";
import SmartTooltip from "../SmartTooltip";
import ContactModal from "./ContactModal";
import TicketColumnsModal from "../TicketPage/TicketColumnsModal";
import { useDefaultPageSize } from "../../hooks/useDefaultPageSize";
import { useCommonCopy } from "../../hooks/useCommonCopy";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { formatPageInfo } from "../../i18n/commonI18n";
import { getContactPageCopy, normalizeContactStatusKey } from "./contactPageI18n";
import { getContactSexeLabelLocalized } from "./contactFormModalI18n";
import { interpolate } from "../../i18n/translate";
import { getPortalStatusFromContact } from "../../api/contactPortal";
import { normalizeContactSexe } from "../../utils/contactSexe";
import {
  CONTACTS_COLUMN_LABEL_KEYS,
  DEFAULT_CONTACTS_TABLE_COLUMNS,
  TICKET_TABLE_COLUMN_SORT_KEYS
} from "../../utils/ticketTableColumns";
import MspPageHero from "../Misc/MspPageHero/MspPageHero";
import mspStyles from "../CybersecuritePage/CybersecuritePage.module.css";
import { usePermissions } from "../../contexts/PermissionsContext";

const CONTACTS_PAGE_SCOPE = "contacts";
const LEGACY_CONTACTS_CACHE_KEY = "contacts_list_cache_v3";
function getContactDisplayName(contact) {
  const parts = [contact.nom, contact.prenom].filter(Boolean);
  return parts.join(" ") || "-";
}
function formatClientDisplay(value) {
  if (value === null || value === undefined || value === "") return "";
  return String(value).replace(/\s*-\s*/g, " ");
}
export default function ContactPage({
  onNavigate,
  pageParams,
  onPageParamsConsumed
}) {
  const CONTACTS_CLIENTS_CACHE_KEY = "contacts_clients_cache_v1";
  const CONTACTS_CACHE_TTL_MS = 5 * 60 * 1000;
  const [contacts, setContacts] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("nom");
  const [sortOrder, setSortOrder] = useState("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useDefaultPageSize();
  const common = useCommonCopy();
  const locale = useAppLocale();
  const {
    can
  } = usePermissions();
  const canCreateContact = can("contacts.create");
  const canExportContacts = can("contacts.export");
  const canPublicViews = can("contacts.public_views");
  const pageCopy = useMemo(() => getContactPageCopy(locale), [locale]);
  const pageCopyRef = useRef(pageCopy);
  pageCopyRef.current = pageCopy;
  const [statusFilters, setStatusFilters] = useState(new Set());
  const [portalFilter, setPortalFilter] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [contactModalInitial, setContactModalInitial] = useState(null);
  const [columnsModalOpen, setColumnsModalOpen] = useState(false);
  const [publicTableColumns, setPublicTableColumns] = useState(() => [...DEFAULT_CONTACTS_TABLE_COLUMNS]);
  const [privateTableColumns, setPrivateTableColumns] = useState(null);
  const [visibleTableColumns, setVisibleTableColumns] = useState(() => [...DEFAULT_CONTACTS_TABLE_COLUMNS]);
  const tableColumns = visibleTableColumns;
  const loadControllerRef = useRef(null);
  const clientsControllerRef = useRef(null);
  const isMountedRef = useRef(true);
  const normalizePhone = value => {
    let normalized = (value || "").toString().trim();
    const excelTextMatch = normalized.match(/^=\s*"(.+)"$/);
    if (excelTextMatch) normalized = excelTextMatch[1];
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
      toast.info(interpolate(pageCopy.clipboard.unavailable, {
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
      toast.success(interpolate(pageCopy.clipboard.copied, {
        label
      }));
    } catch {
      toast.error(interpolate(pageCopy.clipboard.copyFailed, {
        label: label.toLowerCase()
      }));
    }
  };
  const buildContactSharePayload = (contact, clientDisplay) => {
    const fullName = getContactDisplayName(contact);
    const entreprise = (clientDisplay || "").toString().trim();
    const telephone = (contact?.telephone || "").toString().trim();
    const email = (contact?.email || "").toString().trim();
    const poste = (contact?.poste || "").toString().trim();
    const lines = pageCopy.share.lines;
    const payloadLines = [`${lines.contact}: ${fullName}`, entreprise ? `${lines.enterprise}: ${entreprise}` : null, poste ? `${lines.role}: ${poste}` : null, telephone ? `${lines.phone}: ${telephone}` : null, email ? `${lines.email}: ${email}` : null].filter(Boolean);
    return {
      title: interpolate(pageCopy.share.title, {
        name: fullName
      }),
      text: payloadLines.join("\n")
    };
  };
  const shareContact = async (contact, clientDisplay) => {
    const payload = buildContactSharePayload(contact, clientDisplay);
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
  const getClientNameForSort = value => {
    const raw = (value || "").toString().trim();
    if (!raw) return "";
    return raw.replace(/^\d+\s*[-\s]*\s*/, "").toLowerCase();
  };
  useEffect(() => {
    isMountedRef.current = true;
    try {
      sessionStorage.removeItem(LEGACY_CONTACTS_CACHE_KEY);
    } catch {}
    const controller = new AbortController();
    loadControllerRef.current?.abort();
    loadControllerRef.current = controller;
    loadData(controller.signal);
    const handleRefreshContacts = () => {
      const refreshController = new AbortController();
      loadControllerRef.current?.abort();
      loadControllerRef.current = refreshController;
      loadData(refreshController.signal);
    };
    window.addEventListener("refreshContacts", handleRefreshContacts);
    const pollInterval = setInterval(() => {
      if (document.visibilityState !== "visible") return;
      const pollController = new AbortController();
      loadControllerRef.current?.abort();
      loadControllerRef.current = pollController;
      loadData(pollController.signal, {
        silent: true
      });
    }, 30000);
    return () => {
      isMountedRef.current = false;
      controller.abort();
      clientsControllerRef.current?.abort();
      clearInterval(pollInterval);
      window.removeEventListener("refreshContacts", handleRefreshContacts);
    };
  }, []);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await fetchTicketTableColumns(CONTACTS_PAGE_SCOPE);
        if (cancelled) return;
        setPublicTableColumns(Array.isArray(data?.public) ? data.public : [...DEFAULT_CONTACTS_TABLE_COLUMNS]);
        setPrivateTableColumns(Array.isArray(data?.private) && data.private.length ? data.private : null);
        setVisibleTableColumns(Array.isArray(data?.effective) && data.effective.length ? data.effective : [...DEFAULT_CONTACTS_TABLE_COLUMNS]);
      } catch {
        if (!cancelled) toast.error(pageCopyRef.current.toasts?.loadColumns || "Error loading columns");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);
  const handleColumnsSaved = useCallback(result => {
    if (Array.isArray(result?.public)) setPublicTableColumns(result.public);
    setPrivateTableColumns(Array.isArray(result?.private) && result.private.length ? result.private : null);
    setVisibleTableColumns(Array.isArray(result?.effective) && result.effective.length ? result.effective : [...DEFAULT_CONTACTS_TABLE_COLUMNS]);
  }, []);
  const ensureClientsLoaded = async () => {
    if (clients.length > 0) return true;
    try {
      const rawClients = sessionStorage.getItem(CONTACTS_CLIENTS_CACHE_KEY);
      if (rawClients) {
        const parsedClients = JSON.parse(rawClients);
        const clientsFresh = parsedClients?.savedAt && Array.isArray(parsedClients?.data) && Date.now() - parsedClients.savedAt < CONTACTS_CACHE_TTL_MS;
        if (clientsFresh) {
          setClients(parsedClients.data);
          return true;
        }
      }
    } catch {}
    clientsControllerRef.current?.abort();
    const controller = new AbortController();
    clientsControllerRef.current = controller;
    try {
      const clientsData = await fetchClientsList({
        signal: controller.signal
      });
      if (controller.signal.aborted || !isMountedRef.current) return false;
      const normalized = Array.isArray(clientsData) ? clientsData : [];
      setClients(normalized);
      try {
        sessionStorage.setItem(CONTACTS_CLIENTS_CACHE_KEY, JSON.stringify({
          savedAt: Date.now(),
          data: normalized
        }));
      } catch {}
      return true;
    } catch (err) {
      if (err?.name !== "AbortError") {
        console.error("Error chargement entreprises:", err);
        toast.error("Unable to load the company list.");
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
      const contactsData = await fetchContactsList(null, {
        signal
      });
      if (signal?.aborted || !isMountedRef.current) return;
      setContacts(Array.isArray(contactsData) ? contactsData : []);
    } catch (err) {
      if (err?.name === "AbortError") return;
      if (!silent) {
        setError(err.message || "Error loading data");
      }
      console.error("Error chargement:", err);
    } finally {
      if (!silent && isMountedRef.current) setLoading(false);
    }
  };
  const handleOpenAddContact = async () => {
    const ok = await ensureClientsLoaded();
    if (!ok) return;
    setContactModalInitial(null);
    setShowContactModal(true);
  };
  useEffect(() => {
    if (!pageParams?.openCreateModal) return;
    let cancelled = false;
    (async () => {
      const ok = await ensureClientsLoaded();
      if (cancelled || !ok) return;
      setContactModalInitial(null);
      setShowContactModal(true);
      onPageParamsConsumed?.();
    })();
    return () => {
      cancelled = true;
    };
  }, [pageParams, onPageParamsConsumed]);
  const handleContactModalClose = () => {
    setShowContactModal(false);
    setContactModalInitial(null);
  };
  const handleContactSaved = savedContact => {
    if (!savedContact?.id) return;
    setContacts(prev => {
      const index = prev.findIndex(c => String(c.id) === String(savedContact.id));
      if (index === -1) {
        const clientName = savedContact.client_name || clients.find(c => String(c.id) === String(savedContact.client_id))?.name || "";
        return [...prev, {
          ...savedContact,
          client_name: clientName
        }];
      }
      return prev.map(c => String(c.id) === String(savedContact.id) ? {
        ...c,
        ...savedContact
      } : c);
    });
  };
  const matchesSearch = (contact, query) => [contact.nom, contact.prenom, contact.email, contact.telephone, contact.poste, contact.client_name].filter(Boolean).some(field => String(field).toLowerCase().includes(query));
  const filteredForStats = useMemo(() => {
    let filtered = [...contacts];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(c => matchesSearch(c, q));
    }
    return filtered;
  }, [contacts, searchQuery]);
  const statusCounts = useMemo(() => {
    const counts = {
      active: 0,
      inactive: 0,
      unknown: 0
    };
    filteredForStats.forEach(c => {
      const key = normalizeContactStatusKey(c.statut);
      if (counts[key] !== undefined) counts[key] += 1;else counts.unknown += 1;
    });
    return counts;
  }, [filteredForStats]);
  const portalCount = useMemo(
    () => filteredForStats.reduce((n, c) => n + (c?.portal_user_id ? 1 : 0), 0),
    [filteredForStats]
  );
  const filteredAndSortedContacts = useMemo(() => {
    let filtered = [...contacts];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(c => matchesSearch(c, q));
    }
    if (statusFilters.size > 0) {
      filtered = filtered.filter(c => statusFilters.has(normalizeContactStatusKey(c.statut)));
    }
    if (portalFilter) {
      filtered = filtered.filter(c => Boolean(c?.portal_user_id));
    }
    filtered.sort((a, b) => {
      const dir = sortOrder === "asc" ? 1 : -1;
      let aVal;
      let bVal;
      if (sortBy === "client") {
        aVal = getClientNameForSort(a.client_name);
        bVal = getClientNameForSort(b.client_name);
      } else if (sortBy === "sexe") {
        aVal = normalizeContactSexe(a.sexe) || "";
        bVal = normalizeContactSexe(b.sexe) || "";
      } else if (sortBy === "statut") {
        aVal = normalizeContactStatusKey(a.statut);
        bVal = normalizeContactStatusKey(b.statut);
      } else {
        aVal = String(a[sortBy] || "").toLowerCase();
        bVal = String(b[sortBy] || "").toLowerCase();
      }
      if (aVal < bVal) return -1 * dir;
      if (aVal > bVal) return 1 * dir;
      return 0;
    });
    return filtered;
  }, [contacts, searchQuery, statusFilters, portalFilter, sortBy, sortOrder]);
  const totalPages = Math.max(1, Math.ceil(filteredAndSortedContacts.length / pageSize));
  const paginatedContacts = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredAndSortedContacts.slice(start, start + pageSize);
  }, [filteredAndSortedContacts, currentPage, pageSize]);
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilters, portalFilter, sortBy, sortOrder, pageSize]);
  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);
  const portfolioTotal = contacts.length;
  const toggleStatusFilter = statusKey => {
    setStatusFilters(prev => {
      const next = new Set(prev);
      if (next.has(statusKey)) next.delete(statusKey);else next.add(statusKey);
      return next;
    });
  };
  const toggleSort = column => {
    if (sortBy === column) {
      setSortOrder(prev => prev === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortOrder("asc");
    }
  };
  const sortIndicator = column => sortBy === column ? sortOrder === "asc" ? " ▲" : " ▼" : "";
  const ThSort = ({
    label,
    col
  }) => <button type="button" className={layout.thBtn} onClick={e => {
    e.stopPropagation();
    toggleSort(col);
  }} aria-pressed={sortBy === col}>
      {label}
      {sortIndicator(col)}
    </button>;
  const openContact = (contact, background = false) => {
    if (!onNavigate) return;
    onNavigate("ContactDetail", contact, background ? {
      background: true
    } : undefined);
  };
  const handleExportCsv = () => {
    const headers = tableColumns.map(columnId => {
      const labelKey = CONTACTS_COLUMN_LABEL_KEYS[columnId];
      if (columnId === "contact") return pageCopy.table.contact || pageCopy.table.name || columnId;
      if (columnId === "gender") return pageCopy.table.gender || pageCopy.civility || columnId;
      return pageCopy.table[labelKey] || pageCopy.table[columnId] || columnId;
    });
    const rows = [headers];
    filteredAndSortedContacts.forEach(contact => {
      const rawClientLabel = pageCopy.getClientLabel(contact.client_id, contact.client_name);
      const contactSexe = normalizeContactSexe(contact.sexe);
      const status = pageCopy.getContactStatus(contact.statut);
      const portalStatus = getPortalStatusFromContact(contact);
      const portalLabel =
        portalStatus === "active"
          ? pageCopy.portal.active
          : portalStatus === "inactive"
            ? pageCopy.portal.inactive
            : pageCopy.portal.none;
      const row = tableColumns.map(columnId => {
        if (columnId === "contact") {
          return [contact.nom, contact.prenom].filter(Boolean).join(" ").trim();
        }
        if (columnId === "gender") {
          return contactSexe ? getContactSexeLabelLocalized(contactSexe, locale) : "";
        }
        if (columnId === "status") return status.label || "";
        if (columnId === "enterprise") return formatClientDisplay(rawClientLabel) || "";
        if (columnId === "role") return contact.poste || "";
        if (columnId === "email") return contact.email || "";
        if (columnId === "phone") return contact.telephone || "";
        if (columnId === "portal") return portalLabel || "";
        return "";
      });
      rows.push(row);
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
  const renderPortalStatus = contact => {
    const ps = getPortalStatusFromContact(contact);
    if (ps === "active") {
      return <SmartTooltip content={pageCopy.portal.active}>
          <span className={`${styles.portalStatusIcon} ${styles.portalStatusActive}`} aria-label={pageCopy.portal.active}>
            <Icon icon="mdi:account-check" aria-hidden />
          </span>
        </SmartTooltip>;
    }
    if (ps === "inactive") {
      return <SmartTooltip content={pageCopy.portal.inactive}>
          <span className={`${styles.portalStatusIcon} ${styles.portalStatusInactive}`} aria-label={pageCopy.portal.inactive}>
            <Icon icon="mdi:account-cancel-outline" aria-hidden />
          </span>
        </SmartTooltip>;
    }
    return <SmartTooltip content={pageCopy.portal.none}>
        <span className={`${styles.portalStatusIcon} ${styles.portalStatusNone}`} aria-label={pageCopy.portal.none}>
          <Icon icon="mdi:account-off-outline" aria-hidden />
        </span>
      </SmartTooltip>;
  };
  const renderContactStatus = contact => {
    const status = pageCopy.getContactStatus(contact.statut);
    if (status.key === "active") {
      return <SmartTooltip content={status.label}>
          <span className={`${styles.portalStatusIcon} ${styles.portalStatusActive}`} aria-label={status.label}>
            <Icon icon="mdi:account-check" aria-hidden />
          </span>
        </SmartTooltip>;
    }
    if (status.key === "inactive") {
      return <SmartTooltip content={status.label}>
          <span className={`${styles.portalStatusIcon} ${styles.portalStatusNone}`} aria-label={status.label}>
            <Icon icon="mdi:account-off-outline" aria-hidden />
          </span>
        </SmartTooltip>;
    }
    return <SmartTooltip content={status.label}>
        <span className={`${styles.portalStatusIcon} ${styles.portalStatusNone}`} aria-label={status.label}>
          <Icon icon="mdi:account-question-outline" aria-hidden />
        </span>
      </SmartTooltip>;
  };
  return <div className={`${mspStyles.mspPage} ${layout.page} msp-page-grid`}>
      <div className={mspStyles.mspLayout}>
        <div className={mspStyles.mspMain}>
          <MspPageHero eyebrow={pageCopy.eyebrow} title={pageCopy.pageTitle} subtitle={loading ? pageCopy.loadingPortfolio : pageCopy.formatSubtitle(filteredAndSortedContacts.length, portfolioTotal)} icon="mdi:account-group-outline" actions={<>
                <SmartTooltip content={pageCopy.columnsSettings}>
                  <button type="button" className={layout.iconBtn} onClick={() => setColumnsModalOpen(true)} aria-label={pageCopy.columnsSettingsAria}>
                    <Icon icon="mdi:table-cog" />
                  </button>
                </SmartTooltip>
                {canExportContacts ? <SmartTooltip content={pageCopy.exportCsv}>
                  <button type="button" className={layout.iconBtn} onClick={handleExportCsv} aria-label={pageCopy.exportCsvAria}>
                    <Icon icon="mdi:download-outline" />
                  </button>
                </SmartTooltip> : null}
                {canCreateContact ? <SmartTooltip content={pageCopy.newContact}>
                  <button type="button" className={`${layout.primaryBtn} ${layout.primaryBtnIconOnly}`} onClick={handleOpenAddContact} aria-label={pageCopy.newContact}>
                    <FaPlus />
                  </button>
                </SmartTooltip> : null}
              </>} />

          <main className={`${mspStyles.mspContent} ${mspStyles.mspContentList}`}>
            <div className={`${layout.shell} ${layout.shellWide} ${layout.shellFull}`}>
        <div className={layout.toolbar}>
          {!loading && !error ? <div className={layout.statusChips} role="group">
              {pageCopy.statusFilters.map(item => {
                const count = statusCounts[item.key] || 0;
                const active = statusFilters.has(item.key);
                return <button key={item.key} type="button" className={`${layout.statusChip} ${active ? layout.statusChipActive : ""} ${count === 0 ? layout.statusChipDisabled : ""}`} onClick={() => toggleStatusFilter(item.key)} disabled={count === 0}>
                    <span className={`${layout.statusChipIcon} ${layout[`kpiIcon_${item.kpiTone}`]}`}>
                      <Icon icon={item.icon} />
                    </span>
                    <span className={layout.statusChipLabel}>{item.label}</span>
                    <span className={layout.statusChipCount}>{count}</span>
                  </button>;
              })}
              <button
                type="button"
                className={`${layout.statusChip} ${portalFilter ? layout.statusChipActive : ""} ${portalCount === 0 ? layout.statusChipDisabled : ""}`}
                onClick={() => setPortalFilter(prev => !prev)}
                disabled={portalCount === 0}
                title={pageCopy.portal.label}
              >
                <span className={`${layout.statusChipIcon} ${layout.kpiIcon_violet}`}>
                  <Icon icon="mdi:shield-account-outline" />
                </span>
                <span className={layout.statusChipLabel}>{pageCopy.portalFilter}</span>
                <span className={layout.statusChipCount}>{portalCount}</span>
              </button>
            </div> : null}
          <div className={layout.searchWrap}>
            <Icon icon="mdi:magnify" className={layout.searchIcon} aria-hidden />
            <input type="text" inputMode="search" enterKeyHint="search" placeholder={pageCopy.searchPlaceholder} value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className={layout.searchInput} aria-label={pageCopy.searchAria} />
            {searchQuery && <SmartTooltip content={pageCopy.clearSearch}>
                <button type="button" onClick={() => setSearchQuery("")} className={layout.clearButton} aria-label={pageCopy.clearSearch}>
                  <FaTimes />
                </button>
              </SmartTooltip>}
          </div>
          <span className={layout.toolbarMeta}>{filteredAndSortedContacts.length}</span>
        </div>

        {loading ? <div className={layout.stateBox}>
            <Icon icon="mdi:loading" className={layout.spinning} />
            <span>{pageCopy.loading}</span>
          </div> : error ? <div className={`${layout.stateBox} ${layout.stateBoxError}`}>
            <Icon icon="mdi:alert-circle-outline" />
            <span>{error}</span>
          </div> : paginatedContacts.length === 0 ? <div className={layout.emptyState}>
            <Icon icon="mdi:account-outline" className={layout.emptyStateIcon} />
            <p className={layout.emptyStateTitle}>{pageCopy.emptyTitle}</p>
            <p className={layout.emptyStateHint}>{pageCopy.emptyHint}</p>
            {canCreateContact ? <button type="button" className={layout.primaryBtn} onClick={handleOpenAddContact}>
              <Icon icon="mdi:plus" />
              {pageCopy.newContact}
            </button> : null}
          </div> : <div className={layout.listBody}>
            <div className={layout.listArea}>
              <div className={layout.dataTableWrap}>
                <table className={layout.dataTable}>
                  <thead>
                    <tr>
                      {tableColumns.map(columnId => {
                        const sortKey = TICKET_TABLE_COLUMN_SORT_KEYS[columnId];
                        const labelKey = CONTACTS_COLUMN_LABEL_KEYS[columnId];
                        const label = columnId === "gender"
                          ? pageCopy.table.gender || pageCopy.civility
                          : pageCopy.table[labelKey] || pageCopy.table[columnId] || columnId;
                        if (!sortKey) {
                          return <th key={columnId}>{label}</th>;
                        }
                        return <th key={columnId} aria-sort={sortBy === sortKey ? sortOrder === "asc" ? "ascending" : "descending" : "none"}>
                            <ThSort label={label} col={sortKey} />
                          </th>;
                      })}
                      <th>{pageCopy.table.actions}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedContacts.map(contact => {
                      const rawClientLabel = pageCopy.getClientLabel(contact.client_id, contact.client_name);
                      const clientDisplay = formatClientDisplay(rawClientLabel) || "-";
                      const contactSexe = normalizeContactSexe(contact.sexe);
                      const tags = contact.tags || [];
                      const visibleTags = tags.slice(0, 2);
                      const hiddenTagCount = Math.max(0, tags.length - visibleTags.length);
                      return <tr key={contact.id} className={layout.dataTableRow} onClick={() => openContact(contact)} onAuxClick={e => {
                        if (e.button === 1) {
                          e.preventDefault();
                          openContact(contact, true);
                        }
                      }} onKeyDown={e => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          openContact(contact);
                        }
                      }} role="button" tabIndex={0}>
                          {tableColumns.map(columnId => {
                            if (columnId === "contact") {
                              return <td key={columnId} className={layout.colCompany}>
                                  <div className={layout.tableIdentity}>
                                    <div className={layout.tableIdentityText}>
                                      <SmartTooltip content={getContactDisplayName(contact)} as="span" className={layout.clientNameText}>
                                        {getContactDisplayName(contact)}
                                      </SmartTooltip>
                                      {tags.length > 0 ? <div className={layout.tableTags} aria-label={pageCopy.tagsAria}>
                                          {visibleTags.map(tag => <span key={tag.id} className={layout.clientTagChip} style={{
                                            backgroundColor: `${tag.color || "#2b5fab"}18`,
                                            borderColor: `${tag.color || "#2b5fab"}55`,
                                            color: tag.color || "#2b5fab"
                                          }}>
                                              {tag.label}
                                            </span>)}
                                          {hiddenTagCount > 0 ? <span className={layout.tagMore}>+{hiddenTagCount}</span> : null}
                                        </div> : null}
                                    </div>
                                  </div>
                                </td>;
                            }
                            if (columnId === "gender") {
                              return <td key={columnId} className={`${styles.colGender} ${layout.colMuted}`.trim()}>
                                  {contactSexe ? getContactSexeLabelLocalized(contactSexe, locale) : <span className={layout.colEmpty}>-</span>}
                                </td>;
                            }
                            if (columnId === "status") {
                              return <td key={columnId} className={styles.portalCell}>
                                  {renderContactStatus(contact)}
                                </td>;
                            }
                            if (columnId === "enterprise") {
                              return <td key={columnId} className={layout.colMuted}>{clientDisplay}</td>;
                            }
                            if (columnId === "role") {
                              return <td key={columnId} className={layout.colMuted}>
                                  {contact.poste ? <SmartTooltip content={contact.poste} as="span" className={styles.cellEllipsis}>
                                      {contact.poste}
                                    </SmartTooltip> : <span className={layout.colEmpty}>-</span>}
                                </td>;
                            }
                            if (columnId === "email") {
                              return <td key={columnId} onClick={e => e.stopPropagation()}>
                                  {contact.email ? <div className={styles.cellWithActionAlign}>
                                      <SmartTooltip content={contact.email} as="span" className={styles.detailLinkWrap}>
                                        <a href={toMailtoHref(contact.email)} className={styles.detailLink}>
                                          {contact.email}
                                        </a>
                                      </SmartTooltip>
                                      <SmartTooltip content={pageCopy.actions.copyEmail}>
                                        <button type="button" className={styles.inlineCopyBtn} aria-label={pageCopy.actions.copyEmail} onClick={() => copyToClipboard(contact.email, pageCopy.clipboardLabels.email)}>
                                          <Icon icon="mdi:content-copy" />
                                        </button>
                                      </SmartTooltip>
                                    </div> : <span className={layout.colEmpty}>-</span>}
                                </td>;
                            }
                            if (columnId === "phone") {
                              return <td key={columnId} onClick={e => e.stopPropagation()}>
                                  {contact.telephone ? <div className={styles.cellWithAction}>
                                      <SmartTooltip content={contact.telephone} as="span" className={styles.detailLinkWrap}>
                                        <a href={toTelHref(contact.telephone)} className={styles.detailLink}>
                                          {contact.telephone}
                                        </a>
                                      </SmartTooltip>
                                      <SmartTooltip content={pageCopy.actions.copyPhone}>
                                        <button type="button" className={styles.inlineCopyBtn} aria-label={pageCopy.actions.copyPhone} onClick={() => copyToClipboard(contact.telephone, pageCopy.clipboardLabels.phone)}>
                                          <Icon icon="mdi:content-copy" />
                                        </button>
                                      </SmartTooltip>
                                    </div> : <span className={layout.colEmpty}>-</span>}
                                </td>;
                            }
                            if (columnId === "portal") {
                              return <td key={columnId} className={styles.portalCell} onClick={e => e.stopPropagation()}>
                                  {renderPortalStatus(contact)}
                                </td>;
                            }
                            return <td key={columnId}>-</td>;
                          })}
                          <td className={styles.actionsCell} onClick={e => e.stopPropagation()}>
                            <div className={styles.cardActions}>
                              <SmartTooltip content={pageCopy.actions.copyCard}>
                                <button type="button" className={styles.iconActionBtn} aria-label={pageCopy.actions.copyCardAria} onClick={() => {
                                  const payload = buildContactSharePayload(contact, clientDisplay);
                                  copyToClipboard(payload.text, pageCopy.actions.shareCard);
                                }}>
                                  <Icon icon="mdi:content-copy" />
                                </button>
                              </SmartTooltip>
                              <SmartTooltip content={pageCopy.actions.share}>
                                <button type="button" className={styles.iconActionBtn} aria-label={pageCopy.actions.shareAria} onClick={() => shareContact(contact, clientDisplay)}>
                                  <Icon icon="mdi:share-variant" />
                                </button>
                              </SmartTooltip>
                            </div>
                          </td>
                        </tr>;
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {filteredAndSortedContacts.length > 0 && <div className={layout.pagination}>
                <div className={layout.paginationLeft}>
                  <span className={layout.paginationLabel}>{common.perPage}</span>
                  <select className={layout.paginationSelect} value={pageSize} onChange={e => setPageSize(Number(e.target.value))}>
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>
                <div className={layout.paginationRight}>
                  <SmartTooltip content={common.prevPage}>
                    <button type="button" className={layout.pageBtn} onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage <= 1} aria-label={common.prevPage}>
                      <FaChevronLeft />
                    </button>
                  </SmartTooltip>
                  <span className={layout.paginationInfo}>
                    {formatPageInfo(locale, currentPage, totalPages)}
                  </span>
                  <SmartTooltip content={common.nextPage}>
                    <button type="button" className={layout.pageBtn} onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages} aria-label={common.nextPage}>
                      <FaChevronRight />
                    </button>
                  </SmartTooltip>
                </div>
              </div>}
          </div>}
            </div>
          </main>
        </div>
      </div>

      {showContactModal && <ContactModal initialContact={contactModalInitial} onClose={handleContactModalClose} onSuccess={handleContactSaved} clients={clients} />}
      <TicketColumnsModal
        open={columnsModalOpen}
        onClose={() => setColumnsModalOpen(false)}
        onSaved={handleColumnsSaved}
        isAdmin={canPublicViews}
        pageScope={CONTACTS_PAGE_SCOPE}
        initialPublic={publicTableColumns}
        initialPrivate={privateTableColumns}
        columnLabelKeys={CONTACTS_COLUMN_LABEL_KEYS}
        copy={pageCopy}
      />
    </div>;
}
