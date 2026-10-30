import { Fragment, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState, forwardRef } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";
import { FaTimes } from "react-icons/fa";
import { toast } from "react-toastify";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCenter,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors
} from "@dnd-kit/core";
import {
  createClientFileFolder,
  deleteClientFile,
  deleteClientFileFolder,
  fetchClientFileFolders,
  fetchClientFiles,
  getDownloadUrl,
  getPreviewUrl,
  updateClientFile,
  updateClientFileFolder,
  uploadClientFile
} from "../../api/clientFiles";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { useVeritasEdition } from "../../hooks/useVeritasEdition";
import { useCommonCopy } from "../../hooks/useCommonCopy";
import { interpolate } from "../../i18n/translate";
import ConfirmModal from "../Misc/ConfirmModal/ConfirmModal";
import TicketColumnsModal from "../TicketPage/TicketColumnsModal";
import SortIcon from "../Misc/SortableHeader/SortIcon";
import { cycleSortState } from "../Misc/SortableHeader/cycleSortState";
import { getEnterpriseVaultCopy } from "./enterpriseVaultI18n";
import VaultDocumentPreviewModal from "../shared/VaultDocumentPreviewModal/VaultDocumentPreviewModal";
import { repairFilenameEncoding } from "../../utils/repairFilenameEncoding";
import { isVeritasInternalVaultFile } from "../../utils/uploadReportToClientVault";
import { fetchTicketTableColumns } from "../../api/tickets";
import {
  fetchMonitoringDocumentByVaultFileId,
  fetchMonitoringDocuments
} from "../../api/monitoringDocuments";
import {
  DEFAULT_ENTERPRISE_VAULT_TABLE_COLUMNS,
  normalizeTicketTableColumns
} from "../../utils/ticketTableColumns";
import { usePermissions } from "../../contexts/PermissionsContext";
import { UiKitButton, uiKitLayoutsStyles as kit, useFinderNavIndicator } from "../UiKit";
import formStyles from "./EnterpriseFormModal.module.css";
import equipStyles from "../EquipementPage/EquipmentPage.module.css";
import styles from "./EnterpriseVaultPanel.module.css";

const IMAGE_MIMES = new Set(["image/jpeg", "image/png", "image/gif", "image/webp"]);
const DEFAULT_CATEGORY = "Autre";
const VAULT_PAGE_SCOPE = "enterprise_vault";
const EMPTY_BUILDER_LINKS = { folders: {}, files: {} };
const FILE_LINKED_REPORT_TYPES = new Set(["intervention", "audit", "audit-securite"]);

function parseMonitoringConfig(doc) {
  let config = doc?.config;
  if (typeof config === "string") {
    try {
      config = JSON.parse(config);
    } catch {
      return {};
    }
  }
  return config && typeof config === "object" ? config : {};
}

/** Normalise un nom de rapport coffre (PDF/HTML) pour le rapprochement builder. */
function normalizeVaultReportBaseName(name) {
  return String(name || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/\.(html?|pdf)$/i, "")
    .replace(/\s*[·•|_]\s*/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isFileLinkedReportDoc(doc, config) {
  const reportType = String(config?.reportType || "").toLowerCase();
  if (FILE_LINKED_REPORT_TYPES.has(reportType)) return true;
  const name = normalizeVaultReportBaseName(doc?.name);
  return name.includes("intervention") || name.includes("audit");
}

function buildVaultBuilderLinks(documents, vaultFiles = []) {
  const folders = {};
  const files = {};
  const allDocs = Array.isArray(documents) ? documents : [];
  const visibleFiles = Array.isArray(vaultFiles) ? vaultFiles : [];
  const visibleFileIds = new Set(visibleFiles.map(file => String(file?.id)));

  // Skip docs without vault linkage candidates — avoids O(n) JSON.parse on the full corpus.
  const docs = [];
  for (let i = 0; i < allDocs.length; i += 1) {
    const doc = allDocs[i];
    if (!doc?.id || doc?.is_trashed) continue;
    const config = parseMonitoringConfig(doc);
    if (config.vaultFolderId != null || config.vaultFileId != null || isFileLinkedReportDoc(doc, config)) {
      docs.push({
        doc,
        config
      });
    }
  }

  docs.forEach(({ doc, config }) => {
    const folderId = config.vaultFolderId != null ? String(config.vaultFolderId) : "";
    const fileId = config.vaultFileId != null ? String(config.vaultFileId) : "";
    if (folderId && !folders[folderId]) folders[folderId] = doc;
    if (fileId && !files[fileId]) files[fileId] = doc;
  });

  // Fallback nom : PDF historiques / HTML renommés dont vaultFileId ne pointe plus sur le fichier visible.
  const filesByBaseName = new Map();
  visibleFiles.forEach(file => {
    const key = normalizeVaultReportBaseName(file?.file_name || file?.fileName || file?.name);
    if (!key || filesByBaseName.has(key)) return;
    filesByBaseName.set(key, file);
  });

  docs.forEach(({ doc, config }) => {
    if (!isFileLinkedReportDoc(doc, config)) return;

    const linkedId = config.vaultFileId != null ? String(config.vaultFileId) : "";
    if (linkedId && visibleFileIds.has(linkedId)) return;

    const docKey = normalizeVaultReportBaseName(doc.name);
    if (!docKey) return;

    let match = filesByBaseName.get(docKey) || null;
    if (!match && docKey.length >= 12) {
      for (const [key, file] of filesByBaseName.entries()) {
        if (key.length < 12) continue;
        if (key.startsWith(docKey) || docKey.startsWith(key)) {
          match = file;
          break;
        }
      }
    }
    if (match?.id != null && !files[String(match.id)]) {
      files[String(match.id)] = doc;
    }
  });

  return { folders, files };
}
const VAULT_COLUMN_HEADERS = {
  name: "name",
  description: "description",
  visibility: "visibility",
  size: "size",
  date: "date"
};
const VAULT_SORT_DEFAULT = { key: null, direction: "asc" };

function sanitizeVaultTableColumns(columns) {
  const list = normalizeTicketTableColumns(columns, {
    fallback: DEFAULT_ENTERPRISE_VAULT_TABLE_COLUMNS,
    pageScope: VAULT_PAGE_SCOPE
  });
  if (!list.includes("name")) list.unshift("name");
  return list;
}

function vaultColumnClass(columnId) {
  const map = {
    description: styles.colDescription,
    visibility: styles.colVisibility,
    size: styles.colSize
  };
  return map[columnId] || undefined;
}
function displayFileName(file) {
  return repairFilenameEncoding(file?.file_name);
}
function compareVaultSortValues(a, b, direction) {
  const mul = direction === "desc" ? -1 : 1;
  if (a == null && b == null) return 0;
  if (a == null || a === "") return 1;
  if (b == null || b === "") return -1;
  if (typeof a === "number" && typeof b === "number") return (a - b) * mul;
  if (typeof a === "boolean" && typeof b === "boolean") return ((a ? 1 : 0) - (b ? 1 : 0)) * mul;
  return String(a).localeCompare(String(b), undefined, { sensitivity: "base", numeric: true }) * mul;
}
function getVaultFolderSortValue(folder, columnId) {
  if (columnId === "name") return folder?.name || "";
  if (columnId === "description") return "";
  if (columnId === "visibility") return Boolean(folder?.visibleToClient);
  if (columnId === "size") return -1;
  if (columnId === "date") {
    const raw = folder?.updatedAt || folder?.createdAt;
    const time = raw ? new Date(raw).getTime() : NaN;
    return Number.isFinite(time) ? time : null;
  }
  return null;
}
function getVaultFileSortValue(file, columnId) {
  if (columnId === "name") return displayFileName(file) || "";
  if (columnId === "description") return String(file?.description || "").trim();
  if (columnId === "visibility") return Boolean(file?.visible_to_client);
  if (columnId === "size") return Number(file?.size_bytes) || 0;
  if (columnId === "date") {
    const time = file?.created_at ? new Date(file.created_at).getTime() : NaN;
    return Number.isFinite(time) ? time : null;
  }
  return null;
}
function combineRefs(...refs) {
  return node => {
    for (const ref of refs) {
      if (typeof ref === "function") ref(node);
      else if (ref) ref.current = node;
    }
  };
}
function buildFolderChildrenMap(folders) {
  const map = new Map();
  for (const folder of folders) {
    const parentKey = folder.parentId || "root";
    if (!map.has(parentKey)) map.set(parentKey, []);
    map.get(parentKey).push(folder);
  }
  for (const list of map.values()) {
    list.sort((a, b) => String(a.name).localeCompare(String(b.name), undefined, { sensitivity: "base" }));
  }
  return map;
}
function collectDescendantIds(folderId, childrenMap) {
  const ids = new Set([String(folderId)]);
  const walk = id => {
    const kids = childrenMap.get(id) || [];
    for (const kid of kids) {
      ids.add(String(kid.id));
      walk(String(kid.id));
    }
  };
  walk(String(folderId));
  return ids;
}

/** Keep last vault listing per client to avoid empty flash on remount. */
const vaultListingCache = new Map();

function vaultCacheKey(clientId, folderId) {
  return `${clientId || ""}::${folderId || "root"}`;
}

export default forwardRef(function EnterpriseVaultPanel({
  clientId,
  clientName,
  copy: copyProp,
  /** DOM node: rendu de l’arborescence dans la colonne Finder. */
  treeNavPortalTarget = null,
  onNavigate = null,
  /** When false (keep-alive hidden), skip network + heavy linkage work. */
  active = true
}, ref) {
  const locale = useAppLocale();
  const {
    isCommunity,
    loaded: editionLoaded
  } = useVeritasEdition();
  const { can } = usePermissions();
  const canPublicViews = can("clients.public_views");
  const internalCopy = useMemo(() => getEnterpriseVaultCopy(locale), [locale]);
  const copy = copyProp ?? internalCopy;
  const copyRef = useRef(copy);
  copyRef.current = copy;
  const common = useCommonCopy();
  const initialVaultCache = clientId
    ? vaultListingCache.get(vaultCacheKey(clientId, "root"))
    : null;
  const [files, setFiles] = useState(() => initialVaultCache?.files || []);
  const [folders, setFolders] = useState(() => initialVaultCache?.folders || []);
  const [allFolders, setAllFolders] = useState(() => initialVaultCache?.allFolders || []);
  const [folderPath, setFolderPath] = useState([]);
  const [loading, setLoading] = useState(() => !initialVaultCache);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [categoryMenuOpen, setCategoryMenuOpen] = useState(false);
  const [categoryMenuCoords, setCategoryMenuCoords] = useState(null);
  const categoryMenuRef = useRef(null);
  const categoryTriggerRef = useRef(null);
  const [columnsModalOpen, setColumnsModalOpen] = useState(false);
  const [publicTableColumns, setPublicTableColumns] = useState(() => sanitizeVaultTableColumns(DEFAULT_ENTERPRISE_VAULT_TABLE_COLUMNS));
  const [privateTableColumns, setPrivateTableColumns] = useState(null);
  const [visibleTableColumns, setVisibleTableColumns] = useState(() => sanitizeVaultTableColumns(DEFAULT_ENTERPRISE_VAULT_TABLE_COLUMNS));
  const tableColumns = visibleTableColumns;
  const [sortBy, setSortBy] = useState(null);
  const [sortDirection, setSortDirection] = useState("asc");
  const [previewFile, setPreviewFile] = useState(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [pendingUploadFile, setPendingUploadFile] = useState(null);
  const [fileDropActive, setFileDropActive] = useState(false);
  const fileDropDepthRef = useRef(0);
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [editingFile, setEditingFile] = useState(null);
  const [renameTarget, setRenameTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [contextMenu, setContextMenu] = useState(null);
  const [activeDrag, setActiveDrag] = useState(null);
  const [movingItem, setMovingItem] = useState(false);
  const [builderDocs, setBuilderDocs] = useState([]);
  const currentFolderId = folderPath.length ? folderPath[folderPath.length - 1].id : null;
  const builderLinks = useMemo(
    () => (onNavigate ? buildVaultBuilderLinks(builderDocs, files) : EMPTY_BUILDER_LINKS),
    [builderDocs, files, onNavigate]
  );
  const childrenMap = useMemo(() => buildFolderChildrenMap(allFolders), [allFolders]);
  const sensors = useSensors(useSensor(PointerSensor, {
    activationConstraint: {
      distance: 6
    }
  }));

  const hasVaultContentRef = useRef(Boolean(initialVaultCache));
  const columnsLoadedRef = useRef(false);
  const builderDocsLoadedForClientRef = useRef(null);
  const load = useCallback(async () => {
    if (!active) return;
    if (!editionLoaded) {
      setLoading(true);
      return;
    }
    if (isCommunity || !clientId) {
      setFiles([]);
      setFolders([]);
      setAllFolders([]);
      hasVaultContentRef.current = false;
      setLoading(false);
      return;
    }
    const folderKey = currentFolderId || "root";
    const cached = vaultListingCache.get(vaultCacheKey(clientId, folderKey));
    if (cached) {
      setFiles(cached.files || []);
      setFolders(cached.folders || []);
      setAllFolders(cached.allFolders || []);
      hasVaultContentRef.current = true;
      setLoading(false);
    }
    const keepVisible = hasVaultContentRef.current || Boolean(cached);
    if (!keepVisible) setLoading(true);
    try {
      const [rows, folderRows, treeRows] = await Promise.all([
        fetchClientFiles({
          clientId,
          folderId: folderKey
        }),
        fetchClientFileFolders({
          clientId,
          parentId: currentFolderId || null
        }).catch(() => []),
        fetchClientFileFolders({
          clientId,
          tree: true
        }).catch(() => [])
      ]);
      const nextFiles = (Array.isArray(rows) ? rows : []).filter(file => !isVeritasInternalVaultFile(file));
      const nextFolders = Array.isArray(folderRows) ? folderRows : [];
      const nextAllFolders = Array.isArray(treeRows) ? treeRows : [];
      setFiles(nextFiles);
      setFolders(nextFolders);
      setAllFolders(nextAllFolders);
      hasVaultContentRef.current = true;
      vaultListingCache.set(vaultCacheKey(clientId, folderKey), {
        files: nextFiles,
        folders: nextFolders,
        allFolders: nextAllFolders
      });
    } catch (err) {
      if (!keepVisible) {
        setFiles([]);
        setFolders([]);
        setAllFolders([]);
        hasVaultContentRef.current = false;
      }
      if (err?.code !== "PRO_FEATURE_REQUIRED") {
        toast.error(copyRef.current.toast.loadError);
      }
    } finally {
      setLoading(false);
    }
  }, [active, clientId, currentFolderId, editionLoaded, isCommunity]);
  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => {
    let cancelled = false;
    if (!active || !editionLoaded || isCommunity || !clientId || !onNavigate) {
      return undefined;
    }
    if (builderDocsLoadedForClientRef.current === String(clientId)) {
      return undefined;
    }
    (async () => {
      try {
        const docs = await fetchMonitoringDocuments();
        if (cancelled) return;
        const clientKey = String(clientId);
        const scoped = (Array.isArray(docs) ? docs : []).filter(doc => {
          if (!doc?.id || doc?.is_trashed) return false;
          const config = parseMonitoringConfig(doc);
          const docClient =
            doc.client_id ??
            doc.clientId ??
            config.clientId ??
            config.client?.id ??
            null;
          if (docClient != null && String(docClient) === clientKey) return true;
          // Keep vault-linked docs even without client id (legacy / other author).
          return config.vaultFolderId != null || config.vaultFileId != null || isFileLinkedReportDoc(doc, config);
        });
        builderDocsLoadedForClientRef.current = clientKey;
        setBuilderDocs(scoped);
      } catch (err) {
        console.error("Vault builder links load failed:", err);
        if (!cancelled) {
          builderDocsLoadedForClientRef.current = String(clientId);
          setBuilderDocs([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [active, clientId, editionLoaded, isCommunity, onNavigate]);

  // Résout les PDF/HTML d’intervention dont le document monitoring n’est pas dans la liste
  // (autre auteur) ou dont le vaultFileId pointe encore sur ce fichier.
  useEffect(() => {
    if (!active || !onNavigate || !files.length) return undefined;
    let cancelled = false;
    const unresolved = files.filter(file => {
      if (builderLinks.files[String(file.id)]) return false;
      const name = normalizeVaultReportBaseName(displayFileName(file));
      if (name.includes("intervention") || name.includes("audit")) return true;
      const category = String(file?.category || "").toLowerCase();
      const mime = String(file?.mime_type || "").toLowerCase();
      const isReportFile =
        category === "rapport" && (mime.includes("pdf") || mime.includes("html") || /\.(pdf|html?)$/i.test(name));
      return isReportFile;
    }).slice(0, 12);
    if (!unresolved.length) return undefined;

    (async () => {
      const extras = [];
      // Cap concurrency to avoid saturating the browser connection pool.
      const CONCURRENCY = 3;
      for (let i = 0; i < unresolved.length; i += CONCURRENCY) {
        if (cancelled) return;
        const batch = unresolved.slice(i, i + CONCURRENCY);
        const batchDocs = await Promise.all(
          batch.map(async file => {
            try {
              return await fetchMonitoringDocumentByVaultFileId(file.id);
            } catch {
              return null;
            }
          })
        );
        batchDocs.forEach(doc => {
          if (doc?.id) extras.push(doc);
        });
      }
      if (cancelled || !extras.length) return;
      setBuilderDocs(prev => {
        const byId = new Map((Array.isArray(prev) ? prev : []).map(doc => [String(doc.id), doc]));
        let changed = false;
        extras.forEach(doc => {
          if (!byId.has(String(doc.id))) {
            byId.set(String(doc.id), doc);
            changed = true;
          }
        });
        return changed ? Array.from(byId.values()) : prev;
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [active, builderLinks.files, files, onNavigate]);
  useEffect(() => {
    const cached = clientId ? vaultListingCache.get(vaultCacheKey(clientId, "root")) : null;
    hasVaultContentRef.current = Boolean(cached);
    builderDocsLoadedForClientRef.current = null;
    if (cached) {
      setFiles(cached.files || []);
      setFolders(cached.folders || []);
      setAllFolders(cached.allFolders || []);
      setLoading(false);
    } else {
      hasVaultContentRef.current = false;
    }
    setFolderPath([]);
    setSearch("");
    setCategoryFilter("all");
  }, [clientId]);
  useEffect(() => {
    if (!active || columnsLoadedRef.current) return undefined;
    let cancelled = false;
    (async () => {
      try {
        const data = await fetchTicketTableColumns(VAULT_PAGE_SCOPE);
        if (cancelled) return;
        columnsLoadedRef.current = true;
        setPublicTableColumns(sanitizeVaultTableColumns(Array.isArray(data?.public) ? data.public : DEFAULT_ENTERPRISE_VAULT_TABLE_COLUMNS));
        setPrivateTableColumns(Array.isArray(data?.private) && data.private.length ? sanitizeVaultTableColumns(data.private) : null);
        setVisibleTableColumns(sanitizeVaultTableColumns(Array.isArray(data?.effective) && data.effective.length ? data.effective : DEFAULT_ENTERPRISE_VAULT_TABLE_COLUMNS));
      } catch {
        if (!cancelled) toast.error(copyRef.current.toasts?.loadColumns || "Error loading columns");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [active]);
  const handleColumnsSaved = useCallback(result => {
    if (Array.isArray(result?.public)) setPublicTableColumns(sanitizeVaultTableColumns(result.public));
    setPrivateTableColumns(Array.isArray(result?.private) && result.private.length ? sanitizeVaultTableColumns(result.private) : null);
    setVisibleTableColumns(sanitizeVaultTableColumns(Array.isArray(result?.effective) && result.effective.length ? result.effective : DEFAULT_ENTERPRISE_VAULT_TABLE_COLUMNS));
  }, []);
  const handleSort = useCallback(column => {
    const next = cycleSortState({
      column,
      sortBy,
      sortDirection,
      defaultSortBy: VAULT_SORT_DEFAULT.key,
      defaultSortDirection: VAULT_SORT_DEFAULT.direction,
      firstDirection: column === "date" || column === "size" ? "desc" : "asc"
    });
    setSortBy(next.sortBy);
    setSortDirection(next.sortDirection);
  }, [sortBy, sortDirection]);
  useImperativeHandle(ref, () => ({
    openUploadModal: (file = null) => {
      setPendingUploadFile(file || null);
      setShowUploadModal(true);
    },
    openCreateFolder: () => setShowFolderModal(true)
  }), []);
  const hasExternalFiles = useCallback(dataTransfer => {
    if (!dataTransfer) return false;
    return Array.from(dataTransfer.types || []).includes("Files");
  }, []);
  const openUploadWithFile = useCallback(file => {
    if (!file) return;
    setPendingUploadFile(file);
    setShowUploadModal(true);
    setFileDropActive(false);
    fileDropDepthRef.current = 0;
  }, []);
  const openContextMenu = useCallback((event, payload) => {
    event.preventDefault();
    event.stopPropagation();
    setContextMenu({
      x: event.clientX,
      y: event.clientY,
      ...payload
    });
  }, []);
  const closeContextMenu = useCallback(() => setContextMenu(null), []);
  const downloadFile = useCallback(file => {
    if (!file?.id) return;
    const anchor = document.createElement("a");
    anchor.href = getDownloadUrl(file.id);
    anchor.download = displayFileName(file);
    anchor.rel = "noopener";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  }, []);
  const handlePanelDragEnter = useCallback(e => {
    if (!hasExternalFiles(e.dataTransfer)) return;
    e.preventDefault();
    e.stopPropagation();
    fileDropDepthRef.current += 1;
    setFileDropActive(true);
  }, [hasExternalFiles]);
  const handlePanelDragLeave = useCallback(e => {
    if (!hasExternalFiles(e.dataTransfer)) return;
    e.preventDefault();
    e.stopPropagation();
    fileDropDepthRef.current = Math.max(0, fileDropDepthRef.current - 1);
    if (fileDropDepthRef.current === 0) setFileDropActive(false);
  }, [hasExternalFiles]);
  const handlePanelDragOver = useCallback(e => {
    if (!hasExternalFiles(e.dataTransfer)) return;
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "copy";
  }, [hasExternalFiles]);
  const handlePanelFileDrop = useCallback(e => {
    if (!hasExternalFiles(e.dataTransfer)) return;
    e.preventDefault();
    e.stopPropagation();
    const dropped = e.dataTransfer?.files?.[0] || null;
    fileDropDepthRef.current = 0;
    setFileDropActive(false);
    if (dropped) openUploadWithFile(dropped);
  }, [hasExternalFiles, openUploadWithFile]);
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = files.filter(file => {
      if (isVeritasInternalVaultFile(file)) return false;
      if (categoryFilter !== "all" && file.category !== categoryFilter) return false;
      if (!q) return true;
      return displayFileName(file).toLowerCase().includes(q) || String(file.category || "").toLowerCase().includes(q) || String(file.description || "").toLowerCase().includes(q);
    });
    if (!sortBy) return list;
    return [...list].sort((left, right) =>
      compareVaultSortValues(getVaultFileSortValue(left, sortBy), getVaultFileSortValue(right, sortBy), sortDirection || "asc")
    );
  }, [files, search, categoryFilter, sortBy, sortDirection]);
  const openLinkedReportInBuilder = useCallback(doc => {
    if (!doc?.id || !onNavigate) return;
    onNavigate("Report", { editDocumentId: doc.id, document: doc });
  }, [onNavigate]);
  const openFolderInBuilder = useCallback(folder => {
    const doc = builderLinks.folders[String(folder?.id)];
    if (!doc) {
      toast.info(copy.card?.openInBuilderUnavailable || "Ce dossier n’est pas lié à un rapport rééditable.");
      return;
    }
    openLinkedReportInBuilder(doc);
  }, [builderLinks.folders, copy.card?.openInBuilderUnavailable, openLinkedReportInBuilder]);
  const openFileInBuilder = useCallback(file => {
    const doc = builderLinks.files[String(file?.id)];
    if (!doc) {
      toast.info(copy.card?.openInBuilderUnavailable || "Ce dossier n’est pas lié à un rapport rééditable.");
      return;
    }
    openLinkedReportInBuilder(doc);
  }, [builderLinks.files, copy.card?.openInBuilderUnavailable, openLinkedReportInBuilder]);
  const filteredFolders = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = !q
      ? folders
      : folders.filter(folder => String(folder.name || "").toLowerCase().includes(q));
    if (!sortBy) return list;
    return [...list].sort((left, right) =>
      compareVaultSortValues(getVaultFolderSortValue(left, sortBy), getVaultFolderSortValue(right, sortBy), sortDirection || "asc")
    );
  }, [folders, search, sortBy, sortDirection]);
  const categoryOptions = useMemo(
    () => [
      { value: "all", label: copy.panel.allTypes },
      ...(copy.categoryKeys || []).map(cat => ({
        value: cat,
        label: copy.getCategoryLabel(cat)
      }))
    ],
    [copy]
  );
  const categoryFilterLabel = useMemo(() => {
    const match = categoryOptions.find(opt => opt.value === categoryFilter);
    return match?.label || copy.panel.allTypes;
  }, [categoryOptions, categoryFilter, copy.panel.allTypes]);
  useEffect(() => {
    if (!categoryMenuOpen) {
      setCategoryMenuCoords(null);
      return undefined;
    }
    const updateCoords = () => {
      const trigger = categoryTriggerRef.current;
      if (!trigger) return;
      const rect = trigger.getBoundingClientRect();
      setCategoryMenuCoords({
        top: rect.bottom + 6,
        left: rect.left,
        minWidth: Math.max(rect.width, 180)
      });
    };
    updateCoords();
    const onPointerDown = event => {
      const inTrigger = categoryTriggerRef.current?.contains(event.target);
      const inMenu = categoryMenuRef.current?.contains(event.target);
      if (!inTrigger && !inMenu) setCategoryMenuOpen(false);
    };
    const onKeyDown = event => {
      if (event.key === "Escape") setCategoryMenuOpen(false);
    };
    window.addEventListener("resize", updateCoords);
    window.addEventListener("scroll", updateCoords, true);
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("resize", updateCoords);
      window.removeEventListener("scroll", updateCoords, true);
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [categoryMenuOpen]);
  const navigateToFolder = useCallback((folderId) => {
    if (!folderId) {
      setFolderPath([]);
      setSearch("");
      return;
    }
    const byId = new Map(allFolders.map(f => [String(f.id), f]));
    const crumbs = [];
    let cursor = byId.get(String(folderId));
    const guard = new Set();
    while (cursor && !guard.has(String(cursor.id))) {
      guard.add(String(cursor.id));
      crumbs.unshift({ id: cursor.id, name: cursor.name });
      cursor = cursor.parentId ? byId.get(String(cursor.parentId)) : null;
    }
    setFolderPath(crumbs);
    setSearch("");
  }, [allFolders]);
  const openFolder = folder => navigateToFolder(folder.id);
  const goToBreadcrumb = index => {
    if (index < 0) {
      setFolderPath([]);
      return;
    }
    setFolderPath(prev => prev.slice(0, index + 1));
  };
  const requestDeleteFile = file => {
    if (!file) return;
    setDeleteTarget({ kind: "file", item: file });
  };
  const requestDeleteFolder = folder => {
    if (!folder) return;
    setDeleteTarget({ kind: "folder", item: folder });
  };
  const closeDeleteConfirm = () => {
    if (deleting) return;
    setDeleteTarget(null);
  };
  const confirmDelete = async () => {
    if (!deleteTarget?.item) return;
    setDeleting(true);
    try {
      if (deleteTarget.kind === "file") {
        const file = deleteTarget.item;
        await deleteClientFile(file.id);
        setFiles(prev => prev.filter(row => row.id !== file.id));
        if (previewFile?.id === file.id) setPreviewFile(null);
        if (editingFile?.id === file.id) setEditingFile(null);
        toast.success(copy.toast.removed);
      } else {
        const folder = deleteTarget.item;
        await deleteClientFileFolder(folder.id);
        toast.success(copy.panel.folderDeleted || "OK");
        if (folderPath.some(c => String(c.id) === String(folder.id))) {
          setFolderPath(prev => {
            const idx = prev.findIndex(c => String(c.id) === String(folder.id));
            return idx <= 0 ? [] : prev.slice(0, idx);
          });
        }
      }
      setDeleteTarget(null);
      await load();
    } catch (err) {
      toast.error(
        deleteTarget.kind === "folder"
          ? err.message || copy.panel.folderDeleteError || copy.toast.deleteError
          : err.message || copy.toast.deleteError
      );
    } finally {
      setDeleting(false);
    }
  };
  const handleDescriptionUpdated = updatedFile => {
    setFiles(prev => prev.map(row => row.id === updatedFile.id ? {
      ...row,
      ...updatedFile
    } : row));
    setPreviewFile(prev => prev?.id === updatedFile.id ? {
      ...prev,
      ...updatedFile
    } : prev);
    setEditingFile(null);
    toast.success(copy.toast.descriptionUpdated);
  };
  const toggleFileVisibility = async file => {
    try {
      const updated = await updateClientFile(file.id, {
        visibleToClient: !file.visible_to_client
      });
      setFiles(prev => prev.map(row => row.id === updated.id ? { ...row, ...updated } : row));
      setPreviewFile(prev => prev?.id === updated.id ? { ...prev, ...updated } : prev);
      toast.success(updated.visible_to_client ? copy.toast.sharedOnPortal : copy.toast.descriptionUpdated);
    } catch (err) {
      toast.error(err.message || copy.toast.shareError);
    }
  };
  const toggleFolderVisibility = async folder => {
    try {
      const updated = await updateClientFileFolder(folder.id, {
        visibleToClient: !folder.visibleToClient
      });
      setFolders(prev => prev.map(row => row.id === updated.id ? { ...row, ...updated } : row));
      setAllFolders(prev => prev.map(row => row.id === updated.id ? { ...row, ...updated } : row));
      toast.success(copy.toast.descriptionUpdated);
    } catch (err) {
      toast.error(err.message || copy.toast.updateError);
    }
  };
  const moveItemToFolder = useCallback(async (source, destinationFolderId) => {
    if (!source) return;
    const destId = destinationFolderId || null;
    if (source.kind === "folder") {
      if (String(source.id) === String(destId || "")) return;
      if (destId && collectDescendantIds(source.id, childrenMap).has(String(destId))) {
        toast.error(copy.panel.moveIntoSelfError || copy.panel.moveError || "Impossible");
        return;
      }
      if (String(source.parentId || "") === String(destId || "")) return;
      await updateClientFileFolder(source.id, { parentId: destId });
    } else if (source.kind === "file") {
      if (String(source.folderId || "") === String(destId || "")) return;
      await updateClientFile(source.id, { folderId: destId });
    } else {
      return;
    }
    toast.success(copy.panel.moved || "OK");
    await load();
  }, [childrenMap, copy.panel.moveError, copy.panel.moveIntoSelfError, copy.panel.moved, load]);
  const handleDragStart = useCallback(event => {
    setContextMenu(null);
    setActiveDrag(event.active?.data?.current || null);
  }, []);
  const handleDragCancel = useCallback(() => {
    setActiveDrag(null);
  }, []);
  const handleDragEnd = useCallback(async event => {
    const source = event.active?.data?.current || null;
    const destination = event.over?.data?.current || null;
    setActiveDrag(null);
    if (!source || !destination || movingItem) return;
    const destId = destination.kind === "root" ? null : destination.id;
    try {
      setMovingItem(true);
      await moveItemToFolder(source, destId);
    } catch (err) {
      toast.error(err.message || copy.panel.moveError || copy.toast.updateError);
    } finally {
      setMovingItem(false);
    }
  }, [copy.panel.moveError, copy.toast.updateError, moveItemToFolder, movingItem]);
  const isEmpty = !loading && filteredFolders.length === 0 && filtered.length === 0;
  const pathBreadcrumb = (
    <div className={`${styles.macosPathPill} ${styles.vaultPathBesideSearch}`.trim()} aria-label={copy.panel.rootBreadcrumb || "Vault"}>
      <button
        type="button"
        className={`${styles.macosPathBtn} ${folderPath.length === 0 ? styles.macosPathBtnCurrent : ""}`.trim()}
        onClick={() => goToBreadcrumb(-1)}
        title={copy.panel.treeRoot || "Racine"}
      >
        <Icon icon="mdi:safe-square-outline" aria-hidden />
        <span>{copy.panel.treeRoot}</span>
      </button>
      {folderPath.map((crumb, index) => (
        <Fragment key={crumb.id}>
          <span className={styles.macosPathSep} aria-hidden>
            <Icon icon="mdi:chevron-right" />
          </span>
          <button
            type="button"
            className={`${styles.macosPathBtn} ${index === folderPath.length - 1 ? styles.macosPathBtnCurrent : ""}`}
            onClick={() => goToBreadcrumb(index)}
          >
            <Icon icon="mdi:folder-outline" aria-hidden />
            <span>{crumb.name}</span>
          </button>
        </Fragment>
      ))}
    </div>
  );
  const treePane = (
    <aside
      className={`${styles.treePane} ${treeNavPortalTarget ? styles.treePanePortaled : ""}`.trim()}
      aria-label={copy.panel.treeTitle}
      onContextMenu={e => {
        if (e.target === e.currentTarget || e.target?.closest?.(`.${styles.treePaneHeader}`)) {
          openContextMenu(e, { kind: "blank", folderId: null });
        }
      }}
    >
      {!treeNavPortalTarget ? (
        <div className={styles.treePaneHeader}>
          <span className={styles.treePaneHeaderTitle}>
            <span>{copy.panel.treeTitle}</span>
          </span>
          <button
            type="button"
            className={styles.treeAddFolderBtn}
            onClick={() => setShowFolderModal(true)}
            title={copy.panel.newFolder}
            aria-label={copy.panel.newFolder}
          >
            <Icon icon="mdi:plus" aria-hidden />
          </button>
        </div>
      ) : null}
      <VaultDropTarget
        id="drop-root"
        data={{ kind: "root", id: null }}
        className={`${styles.treeItem} ${!currentFolderId ? styles.treeItemActive : ""}`}
        activeClassName={styles.treeItemDropTarget}
      >
        <button
          type="button"
          className={styles.treeItemBtn}
          onClick={() => navigateToFolder(null)}
          onContextMenu={e => openContextMenu(e, { kind: "blank", folderId: null })}
        >
          <Icon icon="mdi:safe-square-outline" aria-hidden />
          <span className={styles.treeItemLabel}>{copy.panel.treeRoot}</span>
        </button>
      </VaultDropTarget>
      <VaultFolderTree
        parentId={null}
        depth={0}
        childrenMap={childrenMap}
        currentFolderId={currentFolderId}
        onSelect={navigateToFolder}
        onContextMenu={openContextMenu}
        dragLabel={copy.panel.dragHandleAria}
        copy={copy}
      />
    </aside>
  );
  return <div
      className={`${styles.panelRoot} ${fileDropActive ? styles.panelRootFileDrop : ""}`.trim()}
      onDragEnter={handlePanelDragEnter}
      onDragLeave={handlePanelDragLeave}
      onDragOver={handlePanelDragOver}
      onDrop={handlePanelFileDrop}
    >
      {fileDropActive ? <div className={styles.fileDropOverlay} aria-hidden>
          <Icon icon="mdi:cloud-upload-outline" aria-hidden />
          <span>{copy.panel.fileDropOverlay || copy.uploadModal?.dropHint}</span>
        </div> : null}

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd} onDragCancel={handleDragCancel}>
      <div className={`${styles.vaultLayout} ${treeNavPortalTarget ? styles.vaultLayoutPortalTree : ""}`.trim()}>
        {treeNavPortalTarget && typeof document !== "undefined"
          ? createPortal(treePane, treeNavPortalTarget)
          : treePane}

        <div
          className={styles.contentPane}
          onContextMenu={e => {
            if (e.target === e.currentTarget) openContextMenu(e, { kind: "blank", folderId: currentFolderId });
          }}
        >
          <div className={`${equipStyles.hardwarePageEmbedded} ${equipStyles.embeddedFilterBar} ${equipStyles.embeddedFilterBarToolbar} ${styles.vaultToolbar}`}>
            <div className={equipStyles.embeddedSearchWrap}>
              <div className={equipStyles.embeddedSearchBox}>
                <Icon icon="mdi:magnify" className={equipStyles.embeddedSearchIcon} aria-hidden />
                <input
                  type="text"
                  className={equipStyles.embeddedSearchInput}
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder={copy.panel.searchPlaceholder}
                  aria-label={copy.panel.searchPlaceholder}
                />
                {search ? (
                  <button
                    type="button"
                    className={equipStyles.embeddedSearchClear}
                    onClick={() => setSearch("")}
                    aria-label={copy.panel.clearSearchAria}
                  >
                    <FaTimes aria-hidden />
                  </button>
                ) : null}
              </div>
              {pathBreadcrumb}
              <div className={`${equipStyles.embeddedSearchActions} ${styles.vaultToolbarActions}`}>
                <div className={styles.macosPillSelectWrap}>
                  <button
                    type="button"
                    ref={categoryTriggerRef}
                    className={styles.macosPillSelectTrigger}
                    onClick={() => setCategoryMenuOpen(open => !open)}
                    aria-label={copy.panel.allTypes}
                    aria-haspopup="listbox"
                    aria-expanded={categoryMenuOpen}
                  >
                    <Icon icon="mdi:filter-variant" className={styles.macosPillSelectIcon} aria-hidden />
                    <span className={styles.macosPillSelectValue}>{categoryFilterLabel}</span>
                    <Icon
                      icon="mdi:chevron-down"
                      className={`${styles.macosPillSelectChevron} ${categoryMenuOpen ? styles.macosPillSelectChevronOpen : ""}`.trim()}
                      aria-hidden
                    />
                  </button>
                  {categoryMenuOpen && categoryMenuCoords && typeof document !== "undefined"
                    ? createPortal(
                        <ul
                          ref={categoryMenuRef}
                          className={styles.macosPillSelectMenu}
                          role="listbox"
                          aria-label={copy.panel.allTypes}
                          style={{
                            top: categoryMenuCoords.top,
                            left: categoryMenuCoords.left,
                            minWidth: categoryMenuCoords.minWidth
                          }}
                        >
                          {categoryOptions.map(option => (
                            <li key={option.value} role="none">
                              <button
                                type="button"
                                role="option"
                                aria-selected={categoryFilter === option.value}
                                className={`${styles.macosPillSelectOption} ${categoryFilter === option.value ? styles.macosPillSelectOptionActive : ""}`.trim()}
                                onClick={() => {
                                  setCategoryFilter(option.value);
                                  setCategoryMenuOpen(false);
                                }}
                              >
                                {option.label}
                              </button>
                            </li>
                          ))}
                        </ul>,
                        document.body
                      )
                    : null}
                </div>
                <button
                  type="button"
                  className={styles.columnsPillBtn}
                  onClick={() => setColumnsModalOpen(true)}
                  aria-label={copy.columnsSettings || "Colonnes"}
                  title={copy.columnsSettings || "Colonnes"}
                >
                  <Icon icon="mdi:table-cog" aria-hidden />
                </button>
              </div>
            </div>
          </div>

          {isEmpty ? <VaultDropTarget
              id="drop-current-empty"
              data={{ kind: currentFolderId ? "folder" : "root", id: currentFolderId || null }}
              className={styles.empty}
              activeClassName={styles.emptyDropTarget}
              onContextMenu={e => openContextMenu(e, { kind: "blank", folderId: currentFolderId })}
            >
              <Icon icon={currentFolderId ? "mdi:folder-open-outline" : "mdi:safe-square-outline"} className={styles.emptyIcon} aria-hidden />
              <p>{currentFolderId ? (copy.panel.emptyFolder || copy.panel.empty) : copy.panel.empty}</p>
              <p className={styles.emptyDropHint}>{copy.panel.fileDropHint || copy.panel.dragHint}</p>
            </VaultDropTarget> : <div className={styles.tableScrollShell}>
              <div
                className={styles.tableWrap}
                onContextMenu={e => {
                  if (e.target === e.currentTarget || e.target?.tagName === "TABLE" || e.target?.tagName === "TBODY") {
                    openContextMenu(e, { kind: "blank", folderId: currentFolderId });
                  }
                }}
              >
                <table className={styles.vaultTable}>
                  <thead>
                    <tr>
                      <th className={styles.colDrag} aria-hidden />
                      {tableColumns.map(columnId => {
                        const labelKey = VAULT_COLUMN_HEADERS[columnId] || columnId;
                        const label = copy.table?.[labelKey] || columnId;
                        const isSorted = sortBy === columnId;
                        const columnClass = [vaultColumnClass(columnId), styles.sortableTh].filter(Boolean).join(" ");
                        return (
                          <th
                            key={columnId}
                            className={columnClass}
                            onClick={() => handleSort(columnId)}
                            aria-sort={isSorted ? (sortDirection === "asc" ? "ascending" : "descending") : "none"}
                          >
                            <span className={styles.thContent}>
                              {label}
                              {isSorted ? (
                                <SortIcon active direction={sortDirection || "asc"} className={styles.sortIndicator} />
                              ) : null}
                            </span>
                          </th>
                        );
                      })}
                      <th className={styles.colActions}>{copy.panel.colActions}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredFolders.map(folder => (
                      <VaultFolderRow
                        key={`folder-${folder.id}`}
                        folder={folder}
                        copy={copy}
                        visibleColumns={tableColumns}
                        dragLabel={copy.panel.dragHandleAria}
                        onOpen={openFolder}
                        onToggleVisibility={toggleFolderVisibility}
                        onRename={setRenameTarget}
                        onDelete={requestDeleteFolder}
                        onContextMenu={openContextMenu}
                        onOpenInBuilder={builderLinks.folders[String(folder.id)] ? openFolderInBuilder : null}
                      />
                    ))}
                    {filtered.map(file => (
                      <VaultFileRow
                        key={`file-${file.id}`}
                        file={file}
                        copy={copy}
                        visibleColumns={tableColumns}
                        dragLabel={copy.panel.dragHandleAria}
                        onPreview={setPreviewFile}
                        onToggleVisibility={toggleFileVisibility}
                        onEdit={setEditingFile}
                        onDelete={requestDeleteFile}
                        onContextMenu={openContextMenu}
                        onOpenInBuilder={builderLinks.files[String(file.id)] ? openFileInBuilder : null}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>}
        </div>
      </div>
      <DragOverlay dropAnimation={null}>
        {activeDrag ? <div className={styles.dragOverlayChip}>
            <Icon icon={activeDrag.kind === "folder" ? "mdi:folder" : "mdi:file-document-outline"} aria-hidden />
            <span>{activeDrag.label || (activeDrag.kind === "folder" ? copy.panel.folderType : copy.panel.colName)}</span>
          </div> : null}
      </DragOverlay>
      </DndContext>

      {contextMenu ? <VaultContextMenu
        menu={contextMenu}
        copy={copy}
        onClose={closeContextMenu}
        onRenameFolder={folder => {
          closeContextMenu();
          setRenameTarget(folder);
        }}
        onToggleFolderVisibility={folder => {
          closeContextMenu();
          toggleFolderVisibility(folder);
        }}
        onOpenInBuilder={item => {
          closeContextMenu();
          if (contextMenu?.kind === "file") openFileInBuilder(item);
          else openFolderInBuilder(item);
        }}
        canOpenInBuilder={
          contextMenu?.kind === "folder"
            ? Boolean(builderLinks.folders[String(contextMenu.item?.id)])
            : contextMenu?.kind === "file"
              ? Boolean(builderLinks.files[String(contextMenu.item?.id)])
              : false
        }
        onDeleteFolder={folder => {
          closeContextMenu();
          requestDeleteFolder(folder);
        }}
        onPreviewFile={file => {
          closeContextMenu();
          setPreviewFile(file);
        }}
        onDownloadFile={file => {
          closeContextMenu();
          downloadFile(file);
        }}
        onEditFile={file => {
          closeContextMenu();
          setEditingFile(file);
        }}
        onToggleFileVisibility={file => {
          closeContextMenu();
          toggleFileVisibility(file);
        }}
        onDeleteFile={file => {
          closeContextMenu();
          requestDeleteFile(file);
        }}
        onNewFolder={() => {
          closeContextMenu();
          setShowFolderModal(true);
        }}
        onUpload={() => {
          closeContextMenu();
          setPendingUploadFile(null);
          setShowUploadModal(true);
        }}
      /> : null}

      {showUploadModal ? <VaultUploadModal
        clientId={clientId}
        clientName={clientName}
        folderId={currentFolderId}
        copy={copy}
        initialFile={pendingUploadFile}
        onClose={() => {
          setShowUploadModal(false);
          setPendingUploadFile(null);
        }}
        onUploaded={async newFile => {
      setShowUploadModal(false);
      setPendingUploadFile(null);
      toast.success(newFile?.visible_to_client ? copy.toast.uploadedVisible : copy.toast.uploadedInternal);
      await load();
    }} /> : null}

      {showFolderModal ? <VaultCreateFolderModal
        copy={copy}
        onClose={() => setShowFolderModal(false)}
        onCreate={async (name, visibleToClient) => {
          await createClientFileFolder({
            clientId,
            name,
            parentId: currentFolderId,
            visibleToClient
          });
          setShowFolderModal(false);
          toast.success(copy.panel.folderCreated || "OK");
          await load();
        }}
      /> : null}

      {renameTarget ? <VaultRenameFolderModal
        copy={copy}
        folder={renameTarget}
        onClose={() => setRenameTarget(null)}
        onSave={async (name, visibleToClient) => {
          await updateClientFileFolder(renameTarget.id, { name, visibleToClient });
          setRenameTarget(null);
          toast.success(copy.panel.folderRenamed || "OK");
          await load();
        }}
      /> : null}

      {previewFile ? <VaultDocumentPreviewModal file={previewFile} copy={copy} onClose={() => setPreviewFile(null)} previewUrl={getPreviewUrl(previewFile.id)} downloadUrl={getDownloadUrl(previewFile.id)} onEditDescription={() => {
      setEditingFile(previewFile);
      setPreviewFile(null);
    }} showEmptyDescription categoryBadgeClassName={styles.categoryBadge} /> : null}

      {editingFile ? <VaultEditDescriptionModal file={editingFile} copy={copy} onClose={() => setEditingFile(null)} onSaved={handleDescriptionUpdated} /> : null}

      <ConfirmModal
        open={Boolean(deleteTarget)}
        title={
          deleteTarget?.kind === "folder"
            ? copy.panel.deleteFolderTitle || copy.panel.deleteFolder
            : copy.panel.deleteFileTitle || copy.card.removeTitle
        }
        message={
          deleteTarget?.kind === "folder"
            ? interpolate(copy.panel.confirmDeleteFolder || "Delete « {name} »?", { name: deleteTarget.item.name })
            : copy.formatDeleteConfirm(displayFileName(deleteTarget?.item))
        }
        confirmLabel={deleteTarget?.kind === "folder" ? common.delete : common.remove}
        cancelLabel={common.cancel}
        variant="danger"
        icon="mdi:delete-outline"
        loading={deleting}
        onClose={closeDeleteConfirm}
        onConfirm={confirmDelete}
      />

      <TicketColumnsModal
        open={columnsModalOpen}
        onClose={() => setColumnsModalOpen(false)}
        onSaved={handleColumnsSaved}
        isAdmin={canPublicViews}
        pageScope={VAULT_PAGE_SCOPE}
        initialPublic={publicTableColumns}
        initialPrivate={privateTableColumns}
        initialEffective={visibleTableColumns}
        columnLabelKeys={VAULT_COLUMN_HEADERS}
        copy={copy}
      />
    </div>;
});

function VaultDropTarget({
  id,
  data,
  className = "",
  activeClassName = "",
  onContextMenu,
  children
}) {
  const { setNodeRef, isOver } = useDroppable({ id, data });
  return <div ref={setNodeRef} className={`${className} ${isOver ? activeClassName : ""}`.trim()} onContextMenu={onContextMenu}>
      {children}
    </div>;
}

function VaultFolderTree({ parentId, depth, childrenMap, currentFolderId, onSelect, onContextMenu, dragLabel, copy }) {
  const kids = childrenMap.get(parentId || "root") || [];
  if (!kids.length) return null;
  return kids.map(folder => (
    <VaultTreeFolderItem
      key={folder.id}
      folder={folder}
      depth={depth}
      childrenMap={childrenMap}
      currentFolderId={currentFolderId}
      onSelect={onSelect}
      onContextMenu={onContextMenu}
      dragLabel={dragLabel}
      copy={copy}
    />
  ));
}

function VaultTreeFolderItem({ folder, depth, childrenMap, currentFolderId, onSelect, onContextMenu, dragLabel, copy }) {
  const drag = useDraggable({
    id: `drag-tree-folder-${folder.id}`,
    data: {
      kind: "folder",
      id: folder.id,
      parentId: folder.parentId || null,
      label: folder.name
    }
  });
  const drop = useDroppable({
    id: `drop-tree-folder-${folder.id}`,
    data: {
      kind: "folder",
      id: folder.id
    }
  });
  const fileCount = Number(folder.fileCount) || 0;
  return <div className={styles.treeBranch}>
      <div
        ref={combineRefs(drag.setNodeRef, drop.setNodeRef)}
        className={`${styles.treeItem} ${String(currentFolderId) === String(folder.id) ? styles.treeItemActive : ""} ${drop.isOver ? styles.treeItemDropTarget : ""} ${drag.isDragging ? styles.treeItemDragging : ""}`.trim()}
        style={{ paddingLeft: `${0.35 + depth * 0.85}rem` }}
        onContextMenu={e => onContextMenu?.(e, { kind: "folder", item: folder })}
      >
        <button type="button" className={styles.dragHandle} {...drag.attributes} {...drag.listeners} aria-label={dragLabel || "Drag"} title={dragLabel || "Drag"}>
          <Icon icon="mdi:drag-vertical" aria-hidden />
        </button>
        <button type="button" className={styles.treeItemBtn} onClick={() => onSelect(folder.id)}>
          <Icon icon={folder.visibleToClient ? "mdi:folder" : "mdi:folder-lock-outline"} aria-hidden />
          <span className={styles.treeItemLabel}>{folder.name}</span>
          <span
            className={styles.folderDocCount}
            title={interpolate(copy?.panel?.filesCount || "{count}", { count: String(fileCount) })}
          >
            {fileCount}
          </span>
          {!folder.visibleToClient ? <Icon icon="mdi:eye-off-outline" className={styles.treeHiddenIcon} aria-hidden /> : <span className={styles.treeHiddenIconSpacer} aria-hidden />}
        </button>
      </div>
      <VaultFolderTree
        parentId={String(folder.id)}
        depth={depth + 1}
        childrenMap={childrenMap}
        currentFolderId={currentFolderId}
        onSelect={onSelect}
        onContextMenu={onContextMenu}
        dragLabel={dragLabel}
        copy={copy}
      />
    </div>;
}

function VaultFolderRow({
  folder,
  copy,
  visibleColumns = DEFAULT_ENTERPRISE_VAULT_TABLE_COLUMNS,
  dragLabel,
  onOpen,
  onToggleVisibility,
  onRename,
  onDelete,
  onContextMenu,
  onOpenInBuilder = null
}) {
  const drag = useDraggable({
    id: `drag-folder-${folder.id}`,
    data: {
      kind: "folder",
      id: folder.id,
      parentId: folder.parentId || null,
      label: folder.name
    }
  });
  const drop = useDroppable({
    id: `drop-folder-${folder.id}`,
    data: {
      kind: "folder",
      id: folder.id
    }
  });
  const fileCount = Number(folder.fileCount) || 0;
  const visibilityLabel = folder.visibleToClient ? copy.panel.visibilityOn : copy.panel.visibilityOff;
  return <tr
      ref={combineRefs(drag.setNodeRef, drop.setNodeRef)}
      className={`${styles.folderRow} ${drop.isOver ? styles.rowDropTarget : ""} ${drag.isDragging ? styles.rowDragging : ""}`.trim()}
      onContextMenu={e => onContextMenu?.(e, { kind: "folder", item: folder })}
    >
      <td className={styles.colDrag}>
        <button type="button" className={styles.dragHandle} {...drag.attributes} {...drag.listeners} aria-label={dragLabel || "Drag"} title={dragLabel || "Drag"}>
          <Icon icon="mdi:drag-vertical" aria-hidden />
        </button>
      </td>
      {visibleColumns.map(columnId => {
        if (columnId === "name") {
          return (
            <td key={columnId}>
              <button type="button" className={styles.rowNameBtn} onClick={() => onOpen(folder)}>
                <Icon icon="mdi:folder" className={styles.rowFolderIcon} aria-hidden />
                <span className={styles.rowName}>{folder.name}</span>
                <span
                  className={styles.folderDocCount}
                  title={interpolate(copy.panel.filesCount, { count: String(fileCount) })}
                >
                  {fileCount}
                </span>
              </button>
            </td>
          );
        }
        if (columnId === "description") {
          return <td key={columnId} className={`${styles.mutedCell} ${styles.colDescription}`}>—</td>;
        }
        if (columnId === "visibility") {
          return (
            <td key={columnId} className={styles.colVisibility}>
              <button
                type="button"
                className={`${styles.visibilityIconBtn} ${folder.visibleToClient ? styles.visibilityIconOn : styles.visibilityIconOff}`}
                onClick={() => onToggleVisibility(folder)}
                title={`${copy.panel.toggleFolderVisibility} — ${visibilityLabel}`}
                aria-label={`${copy.panel.toggleFolderVisibility}: ${visibilityLabel}`}
                aria-pressed={folder.visibleToClient}
              >
                <Icon icon={folder.visibleToClient ? "mdi:eye-outline" : "mdi:eye-off-outline"} aria-hidden />
              </button>
            </td>
          );
        }
        if (columnId === "size") {
          return <td key={columnId} className={`${styles.mutedCell} ${styles.colSize}`}>—</td>;
        }
        if (columnId === "date") {
          return <td key={columnId} className={styles.mutedCell}>{copy.formatDate(folder.updatedAt || folder.createdAt)}</td>;
        }
        return null;
      })}
      <td className={styles.colActions}>
        <div className={styles.rowActions}>
          {onOpenInBuilder ? (
            <button
              type="button"
              className={styles.actionBtn}
              onClick={() => onOpenInBuilder(folder)}
              title={copy.card?.openInBuilderTitle || "Ouvrir dans le builder"}
              aria-label={copy.card?.openInBuilderTitle || "Ouvrir dans le builder"}
            >
              <Icon icon="mdi:file-document-edit-outline" aria-hidden />
            </button>
          ) : (
            <span className={styles.actionSlot} aria-hidden />
          )}
          <span className={styles.actionSlot} aria-hidden />
          <button type="button" className={styles.actionBtn} onClick={() => onRename(folder)} title={copy.panel.renameFolder}><Icon icon="mdi:pencil-outline" aria-hidden /></button>
          <button type="button" className={`${styles.actionBtn} ${styles.actionDelete}`} onClick={() => onDelete(folder)} title={copy.panel.deleteFolder}><Icon icon="mdi:trash-can-outline" aria-hidden /></button>
        </div>
      </td>
    </tr>;
}

function VaultFileRow({
  file,
  copy,
  visibleColumns = DEFAULT_ENTERPRISE_VAULT_TABLE_COLUMNS,
  dragLabel,
  onPreview,
  onToggleVisibility,
  onEdit,
  onDelete,
  onContextMenu,
  onOpenInBuilder = null
}) {
  const fileName = displayFileName(file);
  const isPdf = file.mime_type === "application/pdf";
  const isImage = IMAGE_MIMES.has(file.mime_type);
  const visibilityLabel = file.visible_to_client ? copy.panel.visibilityOn : copy.panel.visibilityOff;
  const description = String(file.description || "").trim();
  const drag = useDraggable({
    id: `drag-file-${file.id}`,
    data: {
      kind: "file",
      id: file.id,
      folderId: file.folder_id || null,
      label: fileName
    }
  });
  return <tr
      ref={drag.setNodeRef}
      className={drag.isDragging ? styles.rowDragging : undefined}
      onContextMenu={e => onContextMenu?.(e, { kind: "file", item: file })}
    >
      <td className={styles.colDrag}>
        <button type="button" className={styles.dragHandle} {...drag.attributes} {...drag.listeners} aria-label={dragLabel || "Drag"} title={dragLabel || "Drag"}>
          <Icon icon="mdi:drag-vertical" aria-hidden />
        </button>
      </td>
      {visibleColumns.map(columnId => {
        if (columnId === "name") {
          return (
            <td key={columnId}>
              <button type="button" className={styles.rowNameBtn} onClick={() => onPreview(file)} title={copy.card.previewTitle}>
                <Icon icon={isImage ? "mdi:file-image-outline" : isPdf ? "mdi:file-pdf-box" : "mdi:file-document-outline"} className={styles.rowFileIcon} aria-hidden />
                <span className={styles.rowName}>{fileName}</span>
              </button>
            </td>
          );
        }
        if (columnId === "description") {
          return (
            <td key={columnId} className={`${styles.mutedCell} ${styles.colDescription}`}>
              <span
                className={`${styles.descriptionCell} ${description ? "" : styles.descriptionEmpty}`.trim()}
                title={description || undefined}
              >
                {description || "—"}
              </span>
            </td>
          );
        }
        if (columnId === "visibility") {
          return (
            <td key={columnId} className={styles.colVisibility}>
              <button
                type="button"
                className={`${styles.visibilityIconBtn} ${file.visible_to_client ? styles.visibilityIconOn : styles.visibilityIconOff}`}
                onClick={() => onToggleVisibility(file)}
                title={`${copy.panel.toggleFileVisibility} — ${visibilityLabel}`}
                aria-label={`${copy.panel.toggleFileVisibility}: ${visibilityLabel}`}
                aria-pressed={Boolean(file.visible_to_client)}
              >
                <Icon icon={file.visible_to_client ? "mdi:eye-outline" : "mdi:eye-off-outline"} aria-hidden />
              </button>
            </td>
          );
        }
        if (columnId === "size") {
          return <td key={columnId} className={`${styles.mutedCell} ${styles.colSize}`}>{copy.formatSize(file.size_bytes)}</td>;
        }
        if (columnId === "date") {
          return <td key={columnId} className={styles.mutedCell}>{copy.formatDate(file.created_at)}</td>;
        }
        return null;
      })}
      <td className={styles.colActions}>
        <div className={styles.rowActions}>
          {onOpenInBuilder ? (
            <button
              type="button"
              className={styles.actionBtn}
              onClick={() => onOpenInBuilder(file)}
              title={copy.card?.openInBuilderTitle || "Ouvrir dans le builder"}
              aria-label={copy.card?.openInBuilderTitle || "Ouvrir dans le builder"}
            >
              <Icon icon="mdi:file-document-edit-outline" aria-hidden />
            </button>
          ) : (
            <span className={styles.actionSlot} aria-hidden />
          )}
          <a href={getDownloadUrl(file.id)} download={fileName} className={styles.actionBtn} title={copy.card.downloadTitle}><Icon icon="mdi:download-outline" aria-hidden /></a>
          <button type="button" className={styles.actionBtn} onClick={() => onEdit(file)} title={copy.card.editDescriptionTitle}><Icon icon="mdi:pencil-outline" aria-hidden /></button>
          <button type="button" className={`${styles.actionBtn} ${styles.actionDelete}`} onClick={() => onDelete(file)} title={copy.card.removeTitle}><Icon icon="mdi:trash-can-outline" aria-hidden /></button>
        </div>
      </td>
    </tr>;
}

function VaultContextMenu({
  menu,
  copy,
  onClose,
  onRenameFolder,
  onToggleFolderVisibility,
  onOpenInBuilder,
  canOpenInBuilder = false,
  onDeleteFolder,
  onPreviewFile,
  onDownloadFile,
  onEditFile,
  onToggleFileVisibility,
  onDeleteFile,
  onNewFolder,
  onUpload
}) {
  const menuRef = useRef(null);
  const [coords, setCoords] = useState({ left: menu.x, top: menu.y });
  const items = useMemo(() => {
    if (menu.kind === "folder" && menu.item) {
      const folder = menu.item;
      const rows = [];
      if (canOpenInBuilder && onOpenInBuilder) {
        rows.push({
          key: "open-builder",
          icon: "mdi:file-document-edit-outline",
          label: copy.card?.openInBuilderTitle || "Ouvrir dans le builder",
          onSelect: () => onOpenInBuilder(folder)
        });
      }
      rows.push(
        { key: "rename", icon: "mdi:pencil-outline", label: copy.panel.renameFolder, onSelect: () => onRenameFolder(folder) },
        {
          key: "visibility",
          icon: folder.visibleToClient ? "mdi:eye-off-outline" : "mdi:eye-outline",
          label: folder.visibleToClient ? copy.panel.folderHiddenPortal : copy.panel.folderVisiblePortal,
          onSelect: () => onToggleFolderVisibility(folder)
        },
        { key: "sep-1", separator: true },
        { key: "delete", icon: "mdi:trash-can-outline", label: copy.panel.deleteFolder, danger: true, onSelect: () => onDeleteFolder(folder) }
      );
      return rows;
    }
    if (menu.kind === "file" && menu.item) {
      const file = menu.item;
      const rows = [];
      if (canOpenInBuilder && onOpenInBuilder) {
        rows.push({
          key: "open-builder",
          icon: "mdi:file-document-edit-outline",
          label: copy.card?.openInBuilderTitle || "Ouvrir dans le builder",
          onSelect: () => onOpenInBuilder(file)
        });
      }
      rows.push(
        { key: "preview", icon: "mdi:eye-outline", label: copy.card.previewTitle, onSelect: () => onPreviewFile(file) },
        { key: "download", icon: "mdi:download-outline", label: copy.card.downloadTitle, onSelect: () => onDownloadFile(file) },
        { key: "edit", icon: "mdi:pencil-outline", label: copy.card.editDescriptionTitle, onSelect: () => onEditFile(file) },
        {
          key: "visibility",
          icon: file.visible_to_client ? "mdi:eye-off-outline" : "mdi:eye-outline",
          label: file.visible_to_client ? copy.panel.visibilityOff : copy.panel.visibilityOn,
          onSelect: () => onToggleFileVisibility(file)
        },
        { key: "sep-1", separator: true },
        { key: "delete", icon: "mdi:trash-can-outline", label: copy.card.removeTitle, danger: true, onSelect: () => onDeleteFile(file) }
      );
      return rows;
    }
    return [
      { key: "upload", icon: "mdi:upload-outline", label: copy.panel.uploadDocument || copy.uploadModal?.upload || "Upload", onSelect: onUpload },
      { key: "new-folder", icon: "mdi:folder-plus-outline", label: copy.panel.newFolder, onSelect: onNewFolder }
    ];
  }, [menu, copy, onRenameFolder, onToggleFolderVisibility, onOpenInBuilder, canOpenInBuilder, onDeleteFolder, onPreviewFile, onDownloadFile, onEditFile, onToggleFileVisibility, onDeleteFile, onNewFolder, onUpload]);

  useEffect(() => {
    const el = menuRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const pad = 8;
    let left = menu.x;
    let top = menu.y;
    if (left + rect.width > window.innerWidth - pad) left = Math.max(pad, window.innerWidth - rect.width - pad);
    if (top + rect.height > window.innerHeight - pad) top = Math.max(pad, window.innerHeight - rect.height - pad);
    setCoords({ left, top });
  }, [menu.x, menu.y, items.length]);

  useEffect(() => {
    const onKeyDown = event => {
      if (event.key === "Escape") onClose();
    };
    const onPointerDown = event => {
      if (!menuRef.current?.contains(event.target)) onClose();
    };
    const onScroll = () => onClose();
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("mousedown", onPointerDown, true);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onClose);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("mousedown", onPointerDown, true);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onClose);
    };
  }, [onClose]);

  const title = menu.kind === "folder"
    ? menu.item?.name
    : menu.kind === "file"
      ? displayFileName(menu.item)
      : (copy.panel.contextBlankTitle || copy.panel.sectionTitle);

  return createPortal(
    <div
      ref={menuRef}
      className={styles.contextMenu}
      style={{ left: coords.left, top: coords.top }}
      role="menu"
      aria-label={copy.panel.contextMenuAria || "Menu contextuel"}
    >
      {title ? <div className={styles.contextMenuTitle}>{title}</div> : null}
      {items.map(item => item.separator ? (
        <div key={item.key} className={styles.contextMenuSep} role="separator" />
      ) : (
        <button
          key={item.key}
          type="button"
          role="menuitem"
          className={`${styles.contextMenuItem} ${item.danger ? styles.contextMenuItemDanger : ""}`.trim()}
          onClick={item.onSelect}
        >
          <Icon icon={item.icon} aria-hidden />
          <span>{item.label}</span>
        </button>
      ))}
    </div>,
    document.body
  );
}

function VaultRenameFolderModal({ copy, folder, onClose, onSave }) {
  const [name, setName] = useState(folder?.name || "");
  const [visibleToClient, setVisibleToClient] = useState(Boolean(folder?.visibleToClient));
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    setName(folder?.name || "");
    setVisibleToClient(Boolean(folder?.visibleToClient));
  }, [folder]);
  const submit = async e => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return toast.error(copy.panel.folderNameRequired || "Name required");
    try {
      setSaving(true);
      await onSave(trimmed, visibleToClient);
    } catch (err) {
      toast.error(err.message || copy.panel.folderRenameError || copy.toast.updateError);
    } finally {
      setSaving(false);
    }
  };
  return createPortal(<div className={formStyles.overlay} onClick={onClose} role="presentation">
      <div className={`${formStyles.shell} ${formStyles.shellMedium}`} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className={formStyles.accentBar} aria-hidden />
        <header className={formStyles.header}>
          <div className={formStyles.headerMain}>
            <div className={formStyles.headerIconWrap} aria-hidden>
              <Icon icon="mdi:folder-edit-outline" />
            </div>
            <div className={formStyles.headerText}>
              <p className={formStyles.eyebrow}>{copy.panel.sectionTitle}</p>
              <h2 className={formStyles.title}>{copy.panel.renameFolderTitle}</h2>
            </div>
          </div>
          <button type="button" className={formStyles.closeBtn} onClick={onClose} disabled={saving} aria-label={copy.uploadModal?.closeAria || "Close"}>
            <FaTimes />
          </button>
        </header>
        <form className={styles.modalForm} onSubmit={submit}>
          <div className={styles.modalFormBody}>
            <div className={formStyles.field}>
              <label className={formStyles.label} htmlFor="vault-rename-folder">{copy.panel.newFolderPlaceholder}</label>
              <input id="vault-rename-folder" className={formStyles.input} value={name} onChange={e => setName(e.target.value)} autoFocus disabled={saving} />
            </div>
            <div className={styles.visibilitySwitchRow}>
              <div className={styles.visibilitySwitchCopy}>
                <span className={formStyles.label}>{copy.panel.folderVisiblePortal}</span>
                <p className={styles.visibilitySwitchHint}>{copy.uploadModal?.visiblePortalHint}</p>
              </div>
              <button type="button" role="switch" aria-checked={visibleToClient} className={`${styles.visibilitySwitch} ${visibleToClient ? styles.visibilitySwitchOn : ""}`} onClick={() => setVisibleToClient(v => !v)} disabled={saving}>
                <span className={styles.visibilitySwitchTrack}>
                  <span className={styles.visibilitySwitchThumb} />
                </span>
                <span className={styles.visibilitySwitchState}>
                  {visibleToClient ? copy.panel.visibilityOn : copy.panel.visibilityOff}
                </span>
              </button>
            </div>
          </div>
          <footer className={formStyles.footer}>
            <span className={formStyles.footerHint} />
            <div className={formStyles.footerActions}>
              <button type="button" className={formStyles.ghostBtn} onClick={onClose} disabled={saving}>{copy.uploadModal?.cancel || "Cancel"}</button>
              <button type="submit" className={formStyles.primaryBtn} disabled={saving || !name.trim()}>
                {saving ? (copy.editModal?.saving || "…") : (copy.editModal?.save || "Save")}
              </button>
            </div>
          </footer>
        </form>
      </div>
    </div>, document.body);
}

function VaultCreateFolderModal({ copy, onClose, onCreate }) {
  const [name, setName] = useState("");
  const [visibleToClient, setVisibleToClient] = useState(false);
  const [saving, setSaving] = useState(false);
  const submit = async e => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return toast.error(copy.panel.folderNameRequired || "Name required");
    try {
      setSaving(true);
      await onCreate(trimmed, visibleToClient);
    } catch (err) {
      toast.error(err.message || copy.panel.folderCreateError || copy.toast.uploadError);
    } finally {
      setSaving(false);
    }
  };
  return createPortal(<div className={formStyles.overlay} onClick={onClose} role="presentation">
      <div className={`${formStyles.shell} ${formStyles.shellMedium}`} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="vault-folder-modal-title">
        <div className={formStyles.accentBar} aria-hidden />
        <header className={formStyles.header}>
          <div className={formStyles.headerMain}>
            <div className={formStyles.headerIconWrap} aria-hidden>
              <Icon icon="mdi:folder-plus-outline" />
            </div>
            <div className={formStyles.headerText}>
              <p className={formStyles.eyebrow}>{copy.uploadModal?.eyebrow || copy.panel.sectionTitle}</p>
              <h2 className={formStyles.title} id="vault-folder-modal-title">{copy.panel.newFolder}</h2>
            </div>
          </div>
          <button type="button" className={formStyles.closeBtn} onClick={onClose} disabled={saving} aria-label={copy.uploadModal?.closeAria || "Close"}>
            <FaTimes />
          </button>
        </header>
        <form className={styles.modalForm} onSubmit={submit}>
          <div className={styles.modalFormBody}>
            <div className={formStyles.field}>
              <label className={formStyles.label} htmlFor="vault-folder-name">{copy.panel.newFolderPlaceholder}</label>
              <input id="vault-folder-name" className={formStyles.input} value={name} onChange={e => setName(e.target.value)} placeholder={copy.panel.newFolderPlaceholder} autoFocus disabled={saving} />
            </div>
            <div className={styles.visibilitySwitchRow}>
              <div className={styles.visibilitySwitchCopy}>
                <span className={formStyles.label}>{copy.panel.folderVisiblePortal}</span>
                <p className={styles.visibilitySwitchHint}>{copy.uploadModal?.visiblePortalHint}</p>
              </div>
              <button type="button" role="switch" aria-checked={visibleToClient} className={`${styles.visibilitySwitch} ${visibleToClient ? styles.visibilitySwitchOn : ""}`} onClick={() => setVisibleToClient(v => !v)} disabled={saving}>
                <span className={styles.visibilitySwitchTrack}>
                  <span className={styles.visibilitySwitchThumb} />
                </span>
                <span className={styles.visibilitySwitchState}>
                  {visibleToClient ? copy.panel.visibilityOn : copy.panel.visibilityOff}
                </span>
              </button>
            </div>
          </div>
          <footer className={formStyles.footer}>
            <span className={formStyles.footerHint} />
            <div className={formStyles.footerActions}>
              <button type="button" className={formStyles.ghostBtn} onClick={onClose} disabled={saving}>{copy.uploadModal?.cancel || "Cancel"}</button>
              <button type="submit" className={formStyles.primaryBtn} disabled={saving || !name.trim()}>
                {saving ? (copy.uploadModal?.uploading || "…") : (copy.panel.createFolder || "Create")}
              </button>
            </div>
          </footer>
        </form>
      </div>
    </div>, document.body);
}

function VaultUploadModal({
  clientId,
  clientName,
  folderId = null,
  copy,
  initialFile = null,
  onClose,
  onUploaded
}) {
  const [category, setCategory] = useState(DEFAULT_CATEGORY);
  const [description, setDescription] = useState("");
  const [file, setFile] = useState(initialFile || null);
  const [displayName, setDisplayName] = useState(initialFile?.name || "");
  const [nameTouched, setNameTouched] = useState(false);
  const [visibleToClient, setVisibleToClient] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [activeSection, setActiveSection] = useState(initialFile ? "info" : "file");
  const dropRef = useRef(null);
  const { trackRef: navTrackRef, indicator: navIndicator } = useFinderNavIndicator([activeSection, file?.name, displayName]);
  const modal = copy.uploadModal;
  const sections = useMemo(() => [{
    id: "file",
    label: modal.sections?.file?.navLabel || modal.fileLabel,
    icon: "mdi:file-upload-outline"
  }, {
    id: "info",
    label: modal.sections?.info?.navLabel || modal.nameLabel,
    icon: "mdi:text-box-outline"
  }, {
    id: "portal",
    label: modal.sections?.portal?.navLabel || modal.visiblePortalLabel,
    icon: "mdi:account-eye-outline"
  }], [modal]);
  const nameReady = Boolean(String(displayName || "").trim());
  const sectionMeta = {
    file: Boolean(file),
    info: nameReady,
    portal: visibleToClient
  };
  useEffect(() => {
    if (initialFile) {
      setFile(initialFile);
      if (!nameTouched) setDisplayName(initialFile.name || "");
    }
  }, [initialFile, nameTouched]);
  const applySelectedFile = nextFile => {
    setFile(nextFile || null);
    if (!nextFile) {
      if (!nameTouched) setDisplayName("");
      return;
    }
    if (!nameTouched) setDisplayName(nextFile.name || "");
    if (!nameTouched || !String(displayName || "").trim()) setActiveSection("info");
  };
  const handleDrop = e => {
    e.preventDefault();
    const dropped = e.dataTransfer?.files?.[0];
    if (dropped) applySelectedFile(dropped);
  };
  const handleSubmit = async e => {
    e.preventDefault();
    if (!clientId) return toast.error(copy.toast.clientNotFound);
    if (!file) {
      setActiveSection("file");
      return toast.error(copy.toast.fileRequired);
    }
    const trimmedName = String(displayName || "").trim();
    if (!trimmedName) {
      setActiveSection("info");
      return toast.error(copy.toast.nameRequired || copy.toast.fileRequired);
    }
    try {
      setUploading(true);
      const result = await uploadClientFile({
        clientId,
        clientName,
        category,
        description,
        fileName: trimmedName,
        file,
        visibleToClient,
        folderId: folderId || null
      });
      onUploaded(result);
    } catch (err) {
      toast.error(err.message || copy.toast.uploadError);
    } finally {
      setUploading(false);
    }
  };
  const canSubmit = Boolean(file) && nameReady && !uploading;
  return createPortal(<div className={formStyles.overlay} onClick={uploading ? undefined : onClose} role="presentation">
      <div className={formStyles.shell} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="vault-upload-modal-title">
        <div className={formStyles.accentBar} aria-hidden />
        <header className={formStyles.header}>
          <div className={formStyles.headerMain}>
            <div className={formStyles.headerIconWrap} aria-hidden>
              <Icon icon="mdi:safe-square-outline" />
            </div>
            <div className={formStyles.headerText}>
              <p className={formStyles.eyebrow}>{modal.eyebrow}</p>
              <h2 className={formStyles.title} id="vault-upload-modal-title">
                {modal.title}
              </h2>
              <p className={formStyles.subtitle}>{modal.subtitle}</p>
            </div>
          </div>
          <UiKitButton
            type="button"
            square
            variant="secondary"
            className={formStyles.closeBtn}
            onClick={onClose}
            disabled={uploading}
            aria-label={modal.closeAria}
            icon="mdi:close"
          />
        </header>

        <form className={styles.modalForm} onSubmit={handleSubmit}>
          <div className={formStyles.body}>
            <aside className={`${kit.finderSidebar} ${formStyles.modalNav}`} aria-label={modal.sectionsNavAria || modal.title}>
              <nav
                ref={navTrackRef}
                className={`${kit.finderPrimary} ${kit.finderPrimaryAnimated} ${formStyles.modalNavTrack}`}
              >
                {navIndicator.ready ? (
                  <div
                    className={kit.finderNavIndicator}
                    style={{
                      transform: `translate3d(0, ${navIndicator.top}px, 0)`,
                      height: navIndicator.height
                    }}
                    aria-hidden
                  />
                ) : null}
                {sections.map(section => {
                  const active = activeSection === section.id;
                  return (
                    <button
                      key={section.id}
                      type="button"
                      className={`${kit.finderItem} ${active ? kit.finderItemActive : ""}`}
                      onClick={() => setActiveSection(section.id)}
                      aria-current={active ? "page" : undefined}
                    >
                      <Icon icon={section.icon} className={kit.finderItemIcon} aria-hidden />
                      <span className={kit.finderItemLabel}>{section.label}</span>
                      {sectionMeta[section.id] ? <span className={formStyles.navBadge}>✓</span> : null}
                    </button>
                  );
                })}
              </nav>
            </aside>

            <div className={formStyles.content} key={activeSection}>
              <div className={kit.contentFadeUp}>
                {activeSection === "file" ? (
                  <div className={formStyles.sectionFill}>
                    <div className={`${formStyles.sectionHead} ${formStyles.sectionPinned}`}>
                      <h3 className={formStyles.sectionTitle}>
                        {modal.sections?.file?.title || modal.fileLabel}
                      </h3>
                      <p className={formStyles.sectionDesc}>
                        {modal.sections?.file?.desc || modal.hint}
                      </p>
                    </div>
                    <div className={formStyles.sectionScroll}>
                      <div className={formStyles.fieldStack}>
                        {modal.hint ? <p className={styles.uploadHint}>{modal.hint}</p> : null}
                        <div className={`${formStyles.field} ${formStyles.fieldFull}`}>
                          <span className={`${formStyles.label} ${formStyles.labelRequired}`}>{modal.fileLabel}</span>
                          <div
                            ref={dropRef}
                            className={`${styles.dropZone} ${styles.dropZoneTall} ${file ? styles.dropZoneActive : ""}`}
                            onDragOver={e => e.preventDefault()}
                            onDrop={handleDrop}
                            onClick={() => document.getElementById("vault-file-input")?.click()}
                          >
                            <input
                              id="vault-file-input"
                              type="file"
                              style={{ display: "none" }}
                              onChange={e => applySelectedFile(e.target.files?.[0] || null)}
                              accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,.html,.htm,.zip"
                              disabled={uploading}
                            />
                            {file ? (
                              <span className={styles.dropZoneFile}>
                                <Icon icon="mdi:file-document-outline" aria-hidden />
                                {file.name} ({copy.formatSize(file.size)})
                              </span>
                            ) : (
                              <span className={styles.dropZoneHint}>
                                <Icon icon="mdi:cloud-upload-outline" aria-hidden />
                                {modal.dropHint}
                                <small>{modal.dropFormats}</small>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}

                {activeSection === "info" ? (
                  <div className={formStyles.sectionFill}>
                    <div className={`${formStyles.sectionHead} ${formStyles.sectionPinned}`}>
                      <h3 className={formStyles.sectionTitle}>
                        {modal.sections?.info?.title || modal.nameLabel}
                      </h3>
                      <p className={formStyles.sectionDesc}>
                        {modal.sections?.info?.desc || ""}
                      </p>
                    </div>
                    <div className={formStyles.sectionScroll}>
                      <div className={formStyles.fieldStack}>
                        <div className={`${formStyles.field} ${formStyles.fieldFull}`}>
                          <label className={formStyles.label} htmlFor="vault-category">
                            {modal.categoryLabel}
                          </label>
                          <select
                            id="vault-category"
                            className={formStyles.input}
                            value={category}
                            onChange={e => setCategory(e.target.value)}
                            disabled={uploading}
                          >
                            {copy.categoryKeys.map(cat => (
                              <option key={cat} value={cat}>
                                {copy.getCategoryLabel(cat)}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className={`${formStyles.field} ${formStyles.fieldFull}`}>
                          <label className={`${formStyles.label} ${formStyles.labelRequired}`} htmlFor="vault-display-name">
                            {modal.nameLabel || "Nom"}
                          </label>
                          <input
                            id="vault-display-name"
                            className={formStyles.input}
                            type="text"
                            maxLength={255}
                            placeholder={modal.namePlaceholder || file?.name || ""}
                            value={displayName}
                            onChange={e => {
                              setNameTouched(true);
                              setDisplayName(e.target.value);
                            }}
                            disabled={uploading}
                          />
                        </div>
                        <div className={`${formStyles.field} ${formStyles.fieldFull}`}>
                          <label className={formStyles.label} htmlFor="vault-description">
                            {modal.descriptionLabel}
                          </label>
                          <textarea
                            id="vault-description"
                            className={formStyles.input}
                            rows={4}
                            maxLength={2000}
                            placeholder={modal.descriptionPlaceholder}
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            disabled={uploading}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}

                {activeSection === "portal" ? (
                  <div className={formStyles.sectionFill}>
                    <div className={`${formStyles.sectionHead} ${formStyles.sectionPinned}`}>
                      <h3 className={formStyles.sectionTitle}>
                        {modal.sections?.portal?.title || modal.visiblePortalLabel}
                      </h3>
                      <p className={formStyles.sectionDesc}>
                        {modal.sections?.portal?.desc || modal.visiblePortalHint}
                      </p>
                    </div>
                    <div className={formStyles.sectionScroll}>
                      <div className={formStyles.fieldStack}>
                        <div className={styles.visibilitySwitchRow}>
                          <div className={styles.visibilitySwitchCopy}>
                            <span className={formStyles.label}>{modal.visiblePortalLabel}</span>
                            <p className={styles.visibilitySwitchHint}>{modal.visiblePortalHint}</p>
                          </div>
                          <button
                            type="button"
                            role="switch"
                            aria-checked={visibleToClient}
                            className={`${styles.visibilitySwitch} ${visibleToClient ? styles.visibilitySwitchOn : ""}`}
                            onClick={() => setVisibleToClient(value => !value)}
                            disabled={uploading}
                          >
                            <span className={styles.visibilitySwitchTrack}>
                              <span className={styles.visibilitySwitchThumb} />
                            </span>
                            <span className={styles.visibilitySwitchState}>
                              {visibleToClient ? modal.visibleOn : modal.visibleOff}
                            </span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          <footer className={formStyles.footer}>
            <span className={formStyles.footerHint}>{modal.footerRequired}</span>
            <div className={formStyles.footerActions}>
              <UiKitButton type="button" variant="secondary" onClick={onClose} disabled={uploading}>
                {modal.cancel}
              </UiKitButton>
              <UiKitButton
                type="submit"
                variant="primary"
                disabled={!canSubmit}
                icon={uploading ? undefined : "mdi:upload-outline"}
              >
                {uploading ? (
                  <>
                    <Icon icon="mdi:loading" className={formStyles.spinning} aria-hidden />
                    {modal.uploading}
                  </>
                ) : (
                  modal.upload
                )}
              </UiKitButton>
            </div>
          </footer>
        </form>
      </div>
    </div>, document.getElementById("modal-root") || document.body);
}
function VaultEditDescriptionModal({
  file,
  copy,
  onClose,
  onSaved
}) {
  const [fileName, setFileName] = useState(displayFileName(file) || "");
  const [description, setDescription] = useState(file?.description || "");
  const [visibleToClient, setVisibleToClient] = useState(Boolean(file?.visible_to_client));
  const [saving, setSaving] = useState(false);
  const modal = copy.editModal;
  const originalName = displayFileName(file);
  const nameReady = Boolean(String(fileName || "").trim());

  useEffect(() => {
    setFileName(displayFileName(file) || "");
    setDescription(file?.description || "");
    setVisibleToClient(Boolean(file?.visible_to_client));
  }, [file]);

  const handleSubmit = async e => {
    e.preventDefault();
    if (!file?.id) return;
    const trimmedName = String(fileName || "").trim();
    if (!trimmedName) return toast.error(copy.toast.nameRequired || copy.toast.updateError);
    try {
      setSaving(true);
      const updated = await updateClientFile(file.id, {
        fileName: trimmedName,
        description: description.trim(),
        visibleToClient
      });
      onSaved(updated);
    } catch (err) {
      toast.error(err.message || copy.toast.updateError);
    } finally {
      setSaving(false);
    }
  };

  return createPortal(
    <div className={formStyles.overlay} onClick={saving ? undefined : onClose} role="presentation">
      <div
        className={`${formStyles.shell} ${formStyles.shellCompact}`}
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="vault-edit-description-title"
      >
        <div className={formStyles.accentBar} aria-hidden />
        <header className={formStyles.header}>
          <div className={formStyles.headerMain}>
            <div className={formStyles.headerIconWrap} aria-hidden>
              <Icon icon="mdi:text-box-edit-outline" />
            </div>
            <div className={formStyles.headerText}>
              <p className={formStyles.eyebrow}>{modal.eyebrow}</p>
              <h2 className={formStyles.title} id="vault-edit-description-title">
                {modal.title}
              </h2>
              <p className={formStyles.subtitle} title={originalName || undefined}>
                {modal.subtitle}
              </p>
            </div>
          </div>
          <UiKitButton
            type="button"
            square
            variant="secondary"
            className={formStyles.closeBtn}
            onClick={onClose}
            disabled={saving}
            aria-label={modal.closeAria}
            icon="mdi:close"
          />
        </header>

        <form className={`${styles.modalForm} ${styles.modalFormCompact}`} onSubmit={handleSubmit}>
          <div className={`${styles.modalFormBody} ${styles.modalFormBodyCompact}`}>
            <div className={formStyles.field}>
              <label className={`${formStyles.label} ${formStyles.labelRequired}`} htmlFor="vault-edit-name">
                {modal.nameLabel || "Nom"}
              </label>
              <input
                id="vault-edit-name"
                className={formStyles.input}
                type="text"
                maxLength={255}
                value={fileName}
                onChange={e => setFileName(e.target.value)}
                disabled={saving}
                autoFocus
              />
            </div>

            <div className={formStyles.field}>
              <label className={formStyles.label} htmlFor="vault-edit-description">
                {modal.descriptionLabel}
              </label>
              <textarea
                id="vault-edit-description"
                className={formStyles.input}
                rows={3}
                maxLength={2000}
                placeholder={modal.descriptionPlaceholder}
                value={description}
                onChange={e => setDescription(e.target.value)}
                disabled={saving}
              />
            </div>

            <div className={styles.visibilitySwitchRow}>
              <div className={styles.visibilitySwitchCopy}>
                <span className={formStyles.label}>{modal.visiblePortalLabel}</span>
                <p className={styles.visibilitySwitchHint}>{modal.visiblePortalHint}</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={visibleToClient}
                className={`${styles.visibilitySwitch} ${visibleToClient ? styles.visibilitySwitchOn : ""}`}
                onClick={() => setVisibleToClient(value => !value)}
                disabled={saving}
              >
                <span className={styles.visibilitySwitchTrack}>
                  <span className={styles.visibilitySwitchThumb} />
                </span>
                <span className={styles.visibilitySwitchState}>
                  {visibleToClient ? modal.visibleOn : modal.visibleOff}
                </span>
              </button>
            </div>
          </div>

          <footer className={formStyles.footer}>
            <span className={formStyles.footerHint} aria-hidden />
            <div className={formStyles.footerActions}>
              <UiKitButton type="button" variant="secondary" onClick={onClose} disabled={saving}>
                {modal.cancel}
              </UiKitButton>
              <UiKitButton
                type="submit"
                variant="primary"
                disabled={saving || !nameReady}
                icon={saving ? undefined : "mdi:content-save-outline"}
              >
                {saving ? (
                  <>
                    <Icon icon="mdi:loading" className={formStyles.spinning} aria-hidden />
                    {modal.saving}
                  </>
                ) : (
                  modal.save
                )}
              </UiKitButton>
            </div>
          </footer>
        </form>
      </div>
    </div>,
    document.getElementById("modal-root") || document.body
  );
}
