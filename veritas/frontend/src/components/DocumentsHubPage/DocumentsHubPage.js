import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";
import { toast } from "react-toastify";
import SmartTooltip from "../SmartTooltip";
import { fetchClientFiles, deleteClientFile, getPreviewUrl, getDownloadUrl, bulkUpdateClientFiles, bulkDeleteClientFiles } from "../../api/clientFiles";
import cyberStyles from "../CybersecuritePage/CybersecuritePage.module.css";
import layout from "../EnterprisesPage/EnterprisesPage.module.css";
import CyberBulkBar from "../CybersecuritePage/CyberBulkBar";
import { useCyberBulkSelection } from "../CybersecuritePage/useCyberBulkSelection";
import VaultDocumentPreviewModal from "../shared/VaultDocumentPreviewModal/VaultDocumentPreviewModal";
import ConfirmModal from "../Misc/ConfirmModal/ConfirmModal";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { usePermissions } from "../../contexts/PermissionsContext";
import { CATEGORY_KEYS, getDocumentsHubCopy } from "./documentsHubI18n";
import { interpolate } from "../../i18n/translate";
import PageGuideTour from "../PageGuide/PageGuideTour";
import { getDocumentsHubGuide } from "../PageGuide/documentsHubGuideSteps";
import { useRegisterPageGuide } from "../../hooks/useRegisterPageGuide";
import DocumentsBulkEditModal from "./DocumentsBulkEditModal";
import PageSkeleton from "../Misc/Skeleton/PageSkeleton";
import SortableHeader from "../Misc/SortableHeader/SortableHeader";
import styles from "./DocumentsHubPage.module.css";
import { UiKitCrmListToolbar, UiKitEmptyState, UiKitScrollFadeShell } from "../UiKit";
import { createTrackedAbortController } from "../../utils/pageLoadAbort";
import { cycleSortState } from "../Misc/SortableHeader/cycleSortState";
const IMAGE_MIMES = new Set(["image/jpeg", "image/png", "image/gif", "image/webp"]);
function formatSize(bytes, locale) {
  const value = Number(bytes);
  if (!Number.isFinite(value) || value < 0) return "-";
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}
function formatDate(value, locale) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString(locale === "en" ? "en-GB" : locale === "de" ? "de-DE" : locale === "it" ? "it-IT" : locale === "es" ? "es-ES" : "fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}
function fileIcon(mimeType) {
  if (IMAGE_MIMES.has(mimeType)) return "mdi:file-image-outline";
  if (mimeType === "application/pdf") return "mdi:file-pdf-box";
  if (String(mimeType || "").includes("spreadsheet") || String(mimeType || "").includes("excel")) {
    return "mdi:file-excel-box";
  }
  if (String(mimeType || "").includes("word") || String(mimeType || "").includes("document")) {
    return "mdi:file-word-box";
  }
  return "mdi:file-document-outline";
}
function categoryTone(category) {
  const key = String(category || "").toLowerCase();
  if (key.includes("facture")) return styles.badgeInvoice;
  if (key.includes("image") || key.includes("baie")) return styles.badgeMedia;
  if (key.includes("plan") || key.includes("network")) return styles.badgeNetwork;
  if (key.includes("contrat")) return styles.badgeContract;
  if (key.includes("rapport")) return styles.badgeReport;
  return styles.badgeDefault;
}
const SORT_COLUMNS = {
  file_name: "file_name",
  client_name: "client_name",
  category: "category",
  visible_to_client: "visible_to_client",
  created_at: "created_at",
  size_bytes: "size_bytes"
};
export default function DocumentsHubPage() {
  const locale = useAppLocale();
  const copy = useMemo(() => getDocumentsHubCopy(locale), [locale]);
  const [pageGuideOpen, setPageGuideOpen] = useState(false);
  const openPageGuide = useCallback(() => setPageGuideOpen(true), []);
  useRegisterPageGuide(openPageGuide);
  const docsGuide = useMemo(() => getDocumentsHubGuide(locale), [locale]);
  const { can } = usePermissions();
  const canEdit = can("documents.edit") || can("clients_detail.vault");
  const canDelete = can("documents.delete") || can("clients_detail.vault");
  const canBulkSelect = canEdit || canDelete;
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [categoryMenuOpen, setCategoryMenuOpen] = useState(false);
  const [categoryMenuCoords, setCategoryMenuCoords] = useState(null);
  const categoryMenuRef = useRef(null);
  const categoryTriggerRef = useRef(null);
  const [previewFile, setPreviewFile] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [rowEditFile, setRowEditFile] = useState(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sortBy, setSortBy] = useState(SORT_COLUMNS.created_at);
  const [sortDirection, setSortDirection] = useState("desc");
  const loadAbortRef = useRef(null);
  const load = useCallback(async () => {
    loadAbortRef.current?.abort();
    const controller = createTrackedAbortController();
    loadAbortRef.current = controller;
    setLoading(true);
    try {
      const allFiles = await fetchClientFiles({
        signal: controller.signal
      });
      if (controller.signal.aborted) return;
      setFiles(Array.isArray(allFiles) ? allFiles : []);
    } catch (err) {
      if (err?.name === "AbortError") return;
      setFiles([]);
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, []);
  useEffect(() => {
    load();
    return () => loadAbortRef.current?.abort();
  }, [load]);
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return files.filter(f => {
      if (categoryFilter !== "all" && f.category !== categoryFilter) return false;
      if (!q) return true;
      return String(f.file_name || "").toLowerCase().includes(q) || String(f.client_name || "").toLowerCase().includes(q) || String(f.category || "").toLowerCase().includes(q) || String(f.description || "").toLowerCase().includes(q);
    });
  }, [files, search, categoryFilter]);
  const sorted = useMemo(() => {
    const rows = [...filtered];
    const dir = sortDirection === "asc" ? 1 : -1;
    const localeTag = locale === "en" ? "en-GB" : locale === "de" ? "de-DE" : locale === "it" ? "it-IT" : locale === "es" ? "es-ES" : "en-US";
    rows.sort((a, b) => {
      switch (sortBy) {
        case SORT_COLUMNS.file_name:
          return dir * String(a.file_name || "").localeCompare(String(b.file_name || ""), localeTag, {
            sensitivity: "base"
          });
        case SORT_COLUMNS.client_name:
          return dir * String(a.client_name || "").localeCompare(String(b.client_name || ""), localeTag, {
            sensitivity: "base"
          });
        case SORT_COLUMNS.category:
          {
            const labelFor = key => copy.categories?.[key] || key;
            return dir * labelFor(a.category).localeCompare(labelFor(b.category), localeTag, {
              sensitivity: "base"
            });
          }
        case SORT_COLUMNS.visible_to_client:
          return dir * ((a.visible_to_client ? 1 : 0) - (b.visible_to_client ? 1 : 0));
        case SORT_COLUMNS.size_bytes:
          return dir * ((Number(a.size_bytes) || 0) - (Number(b.size_bytes) || 0));
        case SORT_COLUMNS.created_at:
        default:
          {
            const at = new Date(a.created_at).getTime() || 0;
            const bt = new Date(b.created_at).getTime() || 0;
            return dir * (at - bt);
          }
      }
    });
    return rows;
  }, [filtered, sortBy, sortDirection, locale, copy.categories]);
  const {
    selectedIds,
    selectedItems,
    selectedCount,
    allSelected,
    clearSelection,
    toggleItem,
    toggleAll,
    selectAll
  } = useCyberBulkSelection(sorted);
  const editItems = rowEditFile ? [rowEditFile] : selectedItems;
  const handleSort = column => {
    const next = cycleSortState({
      column,
      sortBy,
      sortDirection,
      defaultSortBy: SORT_COLUMNS.created_at,
      defaultSortDirection: "desc",
      getFirstDirection: col =>
        col === SORT_COLUMNS.created_at || col === SORT_COLUMNS.size_bytes ? "desc" : "asc"
    });
    setSortBy(next.sortBy);
    setSortDirection(next.sortDirection);
  };
  const categoryLabel = key => copy.categories?.[key] || key;
  const categoryOptions = useMemo(
    () => [
      { value: "all", label: copy.filterCategory },
      ...CATEGORY_KEYS.map(cat => ({
        value: cat,
        label: categoryLabel(cat)
      }))
    ],
    [copy.filterCategory, copy.categories]
  );
  const categoryFilterLabel = useMemo(() => {
    const match = categoryOptions.find(opt => opt.value === categoryFilter);
    return match?.label || copy.filterCategory;
  }, [categoryOptions, categoryFilter, copy.filterCategory]);
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
  const handleDelete = file => {
    setDeleteTarget(file);
  };
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteClientFile(deleteTarget.id);
      setFiles(prev => prev.filter(f => f.id !== deleteTarget.id));
      toast.success(copy.deleted);
      setDeleteTarget(null);
    } catch (err) {
      toast.error(err.message || copy.deleteError);
    } finally {
      setDeleting(false);
    }
  };
  const closeEditModal = () => {
    setEditOpen(false);
    setRowEditFile(null);
  };
  const handleRowEdit = file => {
    setRowEditFile(file);
    setEditOpen(true);
  };
  const handleBulkEdit = async fields => {
    const result = await bulkUpdateClientFiles(editItems, fields);
    const failed = result.failed?.length || 0;
    if (result.updated > 0 && failed === 0) toast.success(copy.formatBulkEditSuccess(result.updated));
    else if (result.updated > 0) toast.warn(copy.formatBulkEditPartial(result.updated, failed));
    else toast.error(copy.bulk.toasts.editError);
    if (result.rows?.length) {
      const byId = new Map(result.rows.map(row => [row.id, row]));
      setFiles(prev => prev.map(file => byId.has(file.id) ? {
        ...file,
        ...byId.get(file.id)
      } : file));
    }
    clearSelection();
    setRowEditFile(null);
  };
  const handleBulkDelete = async () => {
    setBusy(true);
    try {
      const result = await bulkDeleteClientFiles(selectedItems);
      const failed = result.failed?.length || 0;
      if (result.deleted > 0 && failed === 0) toast.success(copy.formatBulkDeleteSuccess(result.deleted));
      else if (result.deleted > 0) toast.warn(copy.formatBulkDeletePartial(result.deleted, failed));
      else toast.error(copy.bulk.toasts.deleteError);
      if (result.deletedIds?.length) {
        const removed = new Set(result.deletedIds);
        setFiles(prev => prev.filter(file => !removed.has(file.id)));
      }
      clearSelection();
      setBulkDeleteOpen(false);
    } catch (error) {
      toast.error(error.message || copy.bulk.toasts.deleteError);
    } finally {
      setBusy(false);
    }
  };
  return <div className={`${cyberStyles.mspPage} ${layout.page} msp-page-insight`}>
      <div className={cyberStyles.mspLayout}>
        <div className={cyberStyles.mspMain}>
          <main className={`${cyberStyles.mspContent} ${cyberStyles.mspContentList} ${layout.contentNoHero}`}>
            <h1 className={layout.srOnly}>{copy.pageTitle}</h1>
            <div className={`${layout.shell} ${layout.shellWide} ${layout.shellFull}`} data-guide="docs-hero">
              <div className={layout.listBody}>
                <div className={layout.listArea}>
                  <div className={layout.panelCard}>
                    <div data-guide="docs-toolbar">
                    <UiKitCrmListToolbar
                      className={styles.toolbarInCard}
                      title={copy.pageTitle}
                      titleIcon="mdi:folder-open-outline"
                      searchValue={search}
                      onSearchChange={setSearch}
                      onSearchClear={() => setSearch("")}
                      searchPlaceholder={copy.searchPlaceholder}
                      searchAriaLabel={copy.searchPlaceholder}
                      clearSearchLabel={copy.clearSearch}
                      filters={
                        <div className={styles.macosPillSelectWrap}>
                          <button
                            type="button"
                            ref={categoryTriggerRef}
                            className={styles.macosPillSelectTrigger}
                            onClick={() => setCategoryMenuOpen(open => !open)}
                            aria-label={copy.filterCategory}
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
                                  aria-label={copy.filterCategory}
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
                      }
                      filtersAriaLabel={copy.filterCategory}
                    />
                    </div>

                    {loading ? (
                      <PageSkeleton variant="list" rows={8} label={copy.loading} />
                    ) : filtered.length === 0 ? (
                      <div className={layout.emptyStateInCard} data-guide="docs-table">
                        <UiKitEmptyState
                          bare
                          icon="mdi:folder-open-outline"
                          title={copy.emptyTitle}
                          text={files.length === 0 ? copy.emptyHint : copy.emptyFiltered}
                        />
                      </div>
                    ) : (
                      <>
                        <div data-guide="docs-table">
                        <UiKitScrollFadeShell
                          className={layout.dataTableWrap}
                          deps={[sorted.length, sortBy, sortDirection, search, categoryFilter]}
                        >
                            <table className={styles.table}>
                              <thead>
                                <tr>
                                  {canBulkSelect ? (
                                    <th className={styles.checkboxCell}>
                                      <input type="checkbox" className={styles.rowCheckbox} checked={allSelected} onChange={toggleAll} disabled={busy} aria-label={copy.bulk.selectAll} />
                                    </th>
                                  ) : null}
                                  <th aria-sort={sortBy === SORT_COLUMNS.file_name ? (sortDirection === "asc" ? "ascending" : "descending") : "none"}>
                                    <SortableHeader as="button" column={SORT_COLUMNS.file_name} label={copy.colFile} sortBy={sortBy} sortDirection={sortDirection} onSort={handleSort} buttonClassName={layout.thBtn} />
                                  </th>
                                  <th aria-sort={sortBy === SORT_COLUMNS.client_name ? (sortDirection === "asc" ? "ascending" : "descending") : "none"}>
                                    <SortableHeader as="button" column={SORT_COLUMNS.client_name} label={copy.colCompany} sortBy={sortBy} sortDirection={sortDirection} onSort={handleSort} buttonClassName={layout.thBtn} />
                                  </th>
                                  <th aria-sort={sortBy === SORT_COLUMNS.category ? (sortDirection === "asc" ? "ascending" : "descending") : "none"}>
                                    <SortableHeader as="button" column={SORT_COLUMNS.category} label={copy.colCategory} sortBy={sortBy} sortDirection={sortDirection} onSort={handleSort} buttonClassName={layout.thBtn} />
                                  </th>
                                  <th aria-sort={sortBy === SORT_COLUMNS.visible_to_client ? (sortDirection === "asc" ? "ascending" : "descending") : "none"}>
                                    <SortableHeader as="button" column={SORT_COLUMNS.visible_to_client} label={copy.colVisibility} sortBy={sortBy} sortDirection={sortDirection} onSort={handleSort} buttonClassName={layout.thBtn} />
                                  </th>
                                  <th aria-sort={sortBy === SORT_COLUMNS.created_at ? (sortDirection === "asc" ? "ascending" : "descending") : "none"}>
                                    <SortableHeader as="button" column={SORT_COLUMNS.created_at} label={copy.colDate} sortBy={sortBy} sortDirection={sortDirection} onSort={handleSort} buttonClassName={layout.thBtn} />
                                  </th>
                                  <th aria-sort={sortBy === SORT_COLUMNS.size_bytes ? (sortDirection === "asc" ? "ascending" : "descending") : "none"}>
                                    <SortableHeader as="button" column={SORT_COLUMNS.size_bytes} label={copy.colSize} sortBy={sortBy} sortDirection={sortDirection} onSort={handleSort} buttonClassName={layout.thBtn} />
                                  </th>
                                  <th className={styles.actionsCol}>{copy.colActions}</th>
                                </tr>
                              </thead>
                              <tbody>
                                {sorted.map(file => {
                                  const isSelected = selectedIds.has(file.id);
                                  return (
                                    <tr key={file.id} className={isSelected ? styles.selectedRow : undefined}>
                                      {canBulkSelect ? (
                                        <td className={styles.checkboxCell} onClick={e => e.stopPropagation()}>
                                          <input type="checkbox" className={styles.rowCheckbox} checked={isSelected} disabled={busy} onChange={e => toggleItem(file.id, e.target.checked)} onClick={e => e.stopPropagation()} aria-label={copy.formatBulkSelectRow(file.file_name)} />
                                        </td>
                                      ) : null}
                                      <td>
                                        <button type="button" className={styles.fileCell} onClick={() => setPreviewFile(file)}>
                                          <span className={styles.fileIconWrap}>
                                            {IMAGE_MIMES.has(file.mime_type) ? <img src={getPreviewUrl(file.id)} alt="" className={styles.fileThumb} /> : <Icon icon={fileIcon(file.mime_type)} className={styles.fileIcon} />}
                                          </span>
                                          <span className={styles.fileMeta}>
                                            <span className={styles.fileName}>{file.file_name}</span>
                                            {file.description ? <span className={styles.fileDesc}>{file.description}</span> : null}
                                          </span>
                                        </button>
                                      </td>
                                      <td className={styles.companyCell}>{file.client_name || "-"}</td>
                                      <td>{categoryLabel(file.category)}</td>
                                      <td>
                                        {file.visible_to_client ? (
                                          <span className={styles.visibilityIcon} title={copy.visiblePortal} aria-label={copy.visiblePortal}>
                                            <Icon icon="mdi:eye-outline" aria-hidden />
                                          </span>
                                        ) : (
                                          <span className={styles.visibilityIcon} title={copy.notSharedTitle} aria-label={copy.notSharedTitle}>
                                            <Icon icon="mdi:eye-off-outline" aria-hidden />
                                          </span>
                                        )}
                                      </td>
                                      <td className={styles.mutedCell}>{formatDate(file.created_at, locale)}</td>
                                      <td className={styles.mutedCell}>{formatSize(file.size_bytes, locale)}</td>
                                      <td>
                                        <div className={styles.rowActions}>
                                          <a href={getDownloadUrl(file.id)} download={file.file_name} className={styles.iconAction} title={copy.download}>
                                            <Icon icon="mdi:download-outline" />
                                          </a>
                                          {canEdit ? (
                                            <button type="button" className={styles.iconAction} title={copy.edit} onClick={() => handleRowEdit(file)}>
                                              <Icon icon="mdi:pencil-outline" />
                                            </button>
                                          ) : null}
                                          {canDelete ? (
                                            <button type="button" className={`${styles.iconAction} ${styles.iconActionDanger}`} title={copy.delete} onClick={() => handleDelete(file)}>
                                              <Icon icon="mdi:delete-outline" />
                                            </button>
                                          ) : null}
                                        </div>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                        </UiKitScrollFadeShell>
                        </div>
                        {canBulkSelect && selectedCount > 0 ? (
                          <div className={styles.bulkBarWrap}>
                            <CyberBulkBar
                              copy={copy}
                              selectedCount={selectedCount}
                              allSelected={allSelected}
                              filteredCount={sorted.length}
                              busy={busy}
                              onSelectAll={selectAll}
                              onEdit={
                                canEdit
                                  ? () => {
                                      setRowEditFile(null);
                                      setEditOpen(true);
                                    }
                                  : undefined
                              }
                              onDelete={canDelete ? () => setBulkDeleteOpen(true) : undefined}
                              onClear={clearSelection}
                            />
                          </div>
                        ) : null}
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>

      {previewFile ? <VaultDocumentPreviewModal file={previewFile} onClose={() => setPreviewFile(null)} previewUrl={getPreviewUrl(previewFile.id)} downloadUrl={getDownloadUrl(previewFile.id)} footerLeading={<span>{previewFile.client_name || "-"}</span>} categoryBadgeClassName={`${styles.badge} ${categoryTone(previewFile.category)}`} /> : null}

      <DocumentsBulkEditModal open={editOpen} items={editItems} copy={copy} onClose={closeEditModal} onSubmit={handleBulkEdit} />

      <ConfirmModal open={Boolean(deleteTarget)} title={copy.deleteDocumentTitle} message={deleteTarget ? interpolate(copy.deleteDocument, {
      name: deleteTarget.file_name
    }) : ""} icon="mdi:delete-alert-outline" variant="danger" confirmLabel={copy.delete} loading={deleting} onConfirm={handleConfirmDelete} onClose={() => {
      if (!deleting) setDeleteTarget(null);
    }} />

      <ConfirmModal open={bulkDeleteOpen} title={copy.bulk.deleteTitle} message={copy.formatBulkDeleteMessage(selectedCount)} icon="mdi:delete-alert-outline" variant="danger" confirmLabel={copy.bulk.deleteConfirm} loading={busy} onConfirm={handleBulkDelete} onClose={() => {
      if (!busy) setBulkDeleteOpen(false);
    }} />
      <PageGuideTour open={pageGuideOpen} steps={docsGuide.steps} title={docsGuide.tourTitle} locale={locale} onClose={() => setPageGuideOpen(false)} />
    </div>;
}
