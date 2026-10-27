import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";
import { FaChevronLeft, FaChevronRight, FaTimes } from "react-icons/fa";
import { toast } from "react-toastify";
import {
  deleteEquipmentDocument,
  fetchEquipmentDocuments,
  getEquipmentDocumentDownloadUrl,
  getEquipmentDocumentPreviewUrl,
  uploadEquipmentDocument
} from "../../api/equipmentDocuments";
import { formatPageInfo } from "../../i18n/commonI18n";
import { getEquipmentDbId } from "../../utils/equipmentIdentity";
import { ConfirmModal } from "../AdminPage/AdminUi";
import VaultDocumentPreviewModal from "../shared/VaultDocumentPreviewModal/VaultDocumentPreviewModal";
import formStyles from "../EnterprisesPage/EnterpriseFormModal.module.css";
import { UiKitButton, uiKitLayoutsStyles as kit } from "../UiKit";
import { CloudUploadIcon, FileTextIcon } from "../Misc/Sidebar/lucideAnimated";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { useCommonCopy } from "../../hooks/useCommonCopy";
import { useDefaultPageSize } from "../../hooks/useDefaultPageSize";
import { getLocaleTag } from "../../i18n/locales";
import { getEquipmentDetailCopy, interpolate } from "./equipmentDetailPageI18n";
import { getEquipmentModalsCopy } from "./equipmentModalsI18n";
import EquipmentHoverIcon from "./EquipmentHoverIcon";
import equipStyles from "./EquipmentPage.module.css";
import styles from "./EquipmentDocumentsPanel.module.css";
import EquipmentEmptyState from "./EquipmentEmptyState";

const CATEGORY_VALUES = ["Facture / garantie", "Photo", "Configuration", "Manuel", "Procédure", "Autre"];
const DEFAULT_CATEGORY = "Autre";
const IMAGE_MIMES = new Set(["image/jpeg", "image/png", "image/gif", "image/webp"]);

function formatSize(bytes) {
  if (!bytes) return "-";
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

function formatDate(value, locale) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString(getLocaleTag(locale));
}

function getCategoryLabel(category, copy) {
  return copy.documents.categoryLabels?.[category] || category || copy.documents.categoryLabels?.Autre || "Autre";
}

function matchesDocumentSearch(doc, query, copy, locale) {
  if (!query) return true;
  const haystack = [
    doc.file_name,
    getCategoryLabel(doc.category, copy),
    doc.description,
    formatSize(doc.size_bytes),
    formatDate(doc.created_at, locale)
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(query);
}

function fileIconForDoc(doc) {
  if (IMAGE_MIMES.has(doc.mime_type)) return "mdi:file-image-outline";
  if (doc.mime_type === "application/pdf") return "mdi:file-pdf-box";
  return "mdi:file-document-outline";
}

function EquipmentUploadModal({ equipment, copy, initialFile = null, onClose, onUploaded }) {
  const common = useCommonCopy();
  const docCopy = copy.documents;
  const modal = docCopy.uploadModal;
  const [category, setCategory] = useState(DEFAULT_CATEGORY);
  const [file, setFile] = useState(() => initialFile || null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);
  const dropAnimRef = useRef(null);

  useEffect(() => {
    if (initialFile) setFile(initialFile);
  }, [initialFile]);

  const openPicker = () => fileInputRef.current?.click();

  const handleDrop = e => {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer?.files?.[0];
    if (dropped) setFile(dropped);
  };

  const handleSubmit = async e => {
    e.preventDefault();
    const equipmentId = getEquipmentDbId(equipment);
    const clientId = equipment?.clientId;
    if (!equipmentId || !clientId) return toast.error(docCopy.toasts.uploadError);
    if (!file) return toast.error(modal.fileRequired);
    try {
      setUploading(true);
      const result = await uploadEquipmentDocument({
        clientId,
        equipmentId,
        equipmentType: equipment?.type,
        equipmentName: equipment?.name,
        category,
        file
      });
      onUploaded(result);
    } catch (err) {
      toast.error(err.message || docCopy.toasts.uploadError);
    } finally {
      setUploading(false);
    }
  };

  return createPortal(
    <div className={formStyles.overlay} onClick={uploading ? undefined : onClose} role="presentation">
      <div
        className={`${formStyles.shell} ${styles.uploadShell}`}
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="equipment-doc-upload-title"
      >
        <div className={formStyles.accentBar} aria-hidden />
        <header className={formStyles.header}>
          <div className={formStyles.headerMain}>
            <div className={formStyles.headerIconWrap} aria-hidden>
              <EquipmentHoverIcon Animated={FileTextIcon} iconify="mdi:file-document-plus-outline" size={22} />
            </div>
            <div className={formStyles.headerText}>
              <p className={formStyles.eyebrow}>{modal.eyebrow}</p>
              <h2 className={formStyles.title} id="equipment-doc-upload-title">
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
            aria-label={modal.closeAria || common.close}
            icon="mdi:close"
          />
        </header>

        <form className={styles.modalForm} onSubmit={handleSubmit}>
          <div className={formStyles.bodySingle}>
            <div className={`${formStyles.content} ${styles.uploadContent}`}>
              <div className={`${kit.contentFadeUp} ${styles.uploadFade}`} key="equipment-doc-upload-body">
                <p className={styles.uploadHint}>{modal.hint}</p>

                <div className={formStyles.field}>
                  <label className={formStyles.label} htmlFor="equipment-doc-modal-category">
                    {modal.categoryLabel}
                  </label>
                  <select
                    id="equipment-doc-modal-category"
                    className={formStyles.input}
                    value={category}
                    onChange={e => setCategory(e.target.value)}
                    disabled={uploading}
                  >
                    {CATEGORY_VALUES.map(item => (
                      <option key={item} value={item}>
                        {getCategoryLabel(item, copy)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={formStyles.field}>
                  <span className={`${formStyles.label} ${formStyles.labelRequired}`}>{modal.fileLabel}</span>
                  <div
                    className={[
                      styles.dropZone,
                      file ? styles.dropZoneActive : "",
                      dragOver ? styles.dropZoneDrag : ""
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    onDragEnter={e => {
                      e.preventDefault();
                      setDragOver(true);
                      dropAnimRef.current?.startAnimation?.();
                    }}
                    onDragOver={e => {
                      e.preventDefault();
                      setDragOver(true);
                    }}
                    onDragLeave={e => {
                      e.preventDefault();
                      setDragOver(false);
                      dropAnimRef.current?.stopAnimation?.();
                    }}
                    onDrop={handleDrop}
                    onClick={openPicker}
                    onMouseEnter={() => dropAnimRef.current?.startAnimation?.()}
                    onMouseLeave={() => dropAnimRef.current?.stopAnimation?.()}
                    role="button"
                    tabIndex={0}
                    onKeyDown={e => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        openPicker();
                      }
                    }}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      className={styles.hiddenInput}
                      onChange={e => setFile(e.target.files?.[0] || null)}
                      accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv"
                      disabled={uploading}
                    />
                    {file ? (
                      <span className={styles.dropZoneFile}>
                        <EquipmentHoverIcon Animated={FileTextIcon} iconify="mdi:file-document-outline" size={22} />
                        <span className={styles.dropZoneFileMeta}>
                          <strong>{file.name}</strong>
                          <small>{formatSize(file.size)}</small>
                        </span>
                      </span>
                    ) : (
                      <span className={styles.dropZoneHint}>
                        <EquipmentHoverIcon
                          Animated={CloudUploadIcon}
                          iconify="mdi:cloud-upload-outline"
                          size={32}
                          animRef={dropAnimRef}
                        />
                        <span className={styles.dropZoneTitle}>{modal.dropHint}</span>
                        <small>{modal.dropFormats}</small>
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <footer className={formStyles.footer}>
            <span className={formStyles.footerHint}>{modal.footerRequired}</span>
            <div className={formStyles.footerActions}>
              <UiKitButton type="button" variant="secondary" onClick={onClose} disabled={uploading}>
                {modal.cancel || common.cancel}
              </UiKitButton>
              <UiKitButton type="submit" variant="primary" disabled={uploading || !file}>
                {uploading ? (
                  <>
                    <Icon icon="mdi:loading" className={formStyles.spinning} aria-hidden />
                    {modal.uploading}
                  </>
                ) : (
                  <>
                    <Icon icon="mdi:upload-outline" aria-hidden />
                    {modal.upload}
                  </>
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

export default function EquipmentDocumentsPanel({ equipment, embedded = false, title = null }) {
  const locale = useAppLocale();
  const common = useCommonCopy();
  const copy = useMemo(() => getEquipmentDetailCopy(locale), [locale]);
  const docCopy = copy.documents;
  const modalsCopy = useMemo(() => getEquipmentModalsCopy(locale), [locale]);
  const equipmentId = getEquipmentDbId(equipment);
  const clientId = equipment?.clientId;
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [pageSize, setPageSize] = useDefaultPageSize();
  const [currentPage, setCurrentPage] = useState(1);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [pendingUploadFile, setPendingUploadFile] = useState(null);
  const [fileDropActive, setFileDropActive] = useState(false);
  const fileDropDepthRef = useRef(0);
  const [previewDoc, setPreviewDoc] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const hasExternalFiles = useCallback(dataTransfer => {
    if (!dataTransfer) return false;
    return Array.from(dataTransfer.types || []).includes("Files");
  }, []);

  const openUpload = useCallback((file = null) => {
    setPendingUploadFile(file || null);
    setShowUploadModal(true);
    setFileDropActive(false);
    fileDropDepthRef.current = 0;
  }, []);

  const handlePanelDragEnter = useCallback(
    e => {
      if (!hasExternalFiles(e.dataTransfer)) return;
      e.preventDefault();
      e.stopPropagation();
      fileDropDepthRef.current += 1;
      setFileDropActive(true);
    },
    [hasExternalFiles]
  );
  const handlePanelDragLeave = useCallback(
    e => {
      if (!hasExternalFiles(e.dataTransfer)) return;
      e.preventDefault();
      e.stopPropagation();
      fileDropDepthRef.current = Math.max(0, fileDropDepthRef.current - 1);
      if (fileDropDepthRef.current === 0) setFileDropActive(false);
    },
    [hasExternalFiles]
  );
  const handlePanelDragOver = useCallback(
    e => {
      if (!hasExternalFiles(e.dataTransfer)) return;
      e.preventDefault();
      e.stopPropagation();
      e.dataTransfer.dropEffect = "copy";
    },
    [hasExternalFiles]
  );
  const handlePanelFileDrop = useCallback(
    e => {
      if (!hasExternalFiles(e.dataTransfer)) return;
      e.preventDefault();
      e.stopPropagation();
      const dropped = e.dataTransfer?.files?.[0] || null;
      fileDropDepthRef.current = 0;
      setFileDropActive(false);
      if (dropped) openUpload(dropped);
    },
    [hasExternalFiles, openUpload]
  );

  const filteredDocuments = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return documents;
    return documents.filter(doc => matchesDocumentSearch(doc, query, copy, locale));
  }, [documents, searchQuery, copy, locale]);

  const totalPages = Math.max(1, Math.ceil(filteredDocuments.length / Math.max(1, pageSize)) || 1);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, pageSize, documents.length]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const pageRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredDocuments.slice(start, start + pageSize);
  }, [filteredDocuments, currentPage, pageSize]);

  const rangeStart = filteredDocuments.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const rangeEnd = filteredDocuments.length === 0 ? 0 : Math.min(currentPage * pageSize, filteredDocuments.length);

  const previewCopy = useMemo(
    () => ({
      previewModal: {
        download: docCopy.download,
        closeAria: docCopy.closePreview,
        unsupported: docCopy.previewUnsupported,
        noDescription: docCopy.noDescription
      },
      getCategoryLabel: categoryValue => getCategoryLabel(categoryValue, copy),
      formatDate: value => formatDate(value, locale),
      formatSize
    }),
    [copy, docCopy, locale]
  );

  const loadDocuments = useCallback(async () => {
    if (!equipmentId) {
      setDocuments([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const rows = await fetchEquipmentDocuments({
        equipmentId,
        clientId
      });
      setDocuments(Array.isArray(rows) ? rows : []);
    } catch (err) {
      console.error(err);
      setDocuments([]);
      toast.error(docCopy.toasts.loadError);
    } finally {
      setLoading(false);
    }
  }, [equipmentId, clientId, docCopy.toasts.loadError]);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteEquipmentDocument(deleteTarget.id);
      setDocuments(prev => prev.filter(item => item.id !== deleteTarget.id));
      if (previewDoc?.id === deleteTarget.id) setPreviewDoc(null);
      toast.success(docCopy.toasts.deleted);
      setDeleteTarget(null);
    } catch (err) {
      toast.error(err.message || docCopy.toasts.deleteError);
    } finally {
      setDeleting(false);
    }
  };

  if (!equipmentId) {
    return (
      <div className={embedded ? styles.embeddedRoot : styles.panel}>
        <p className={styles.hint}>{docCopy.saveFirst}</p>
      </div>
    );
  }

  const isEmpty = !loading && documents.length === 0;
  const noMatch = !loading && documents.length > 0 && filteredDocuments.length === 0;

  return (
    <div
      className={`${embedded ? styles.embeddedRoot : styles.panel} ${fileDropActive ? styles.panelFileDrop : ""}`.trim()}
      onDragEnter={handlePanelDragEnter}
      onDragLeave={handlePanelDragLeave}
      onDragOver={handlePanelDragOver}
      onDrop={handlePanelFileDrop}
      aria-label={title || copy.tabs?.documents || docCopy.addDocument}
    >
      {fileDropActive ? (
        <div className={styles.fileDropOverlay} aria-hidden>
          <Icon icon="mdi:cloud-upload-outline" aria-hidden />
          <span>{docCopy.fileDropOverlay || docCopy.uploadModal?.dropHint}</span>
        </div>
      ) : null}

      <div
        className={`${equipStyles.hardwarePageEmbedded} ${equipStyles.embeddedFilterBar} ${equipStyles.embeddedFilterBarToolbar} ${styles.docsToolbar}`.trim()}
      >
        <div className={equipStyles.embeddedSearchWrap}>
          <div className={equipStyles.embeddedSearchBox}>
            <Icon icon="mdi:magnify" className={equipStyles.embeddedSearchIcon} aria-hidden />
            <input
              type="text"
              className={equipStyles.embeddedSearchInput}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder={docCopy.searchPlaceholder}
              aria-label={docCopy.searchAria}
            />
            {searchQuery ? (
              <button
                type="button"
                className={equipStyles.embeddedSearchClear}
                onClick={() => setSearchQuery("")}
                title={docCopy.clearSearch}
                aria-label={docCopy.clearSearch}
              >
                <FaTimes aria-hidden />
              </button>
            ) : null}
          </div>
          <div className={equipStyles.embeddedSearchActions}>
            <button
              type="button"
              className={styles.addCircleBtn}
              onClick={() => openUpload()}
              title={docCopy.addDocument}
              aria-label={docCopy.addDocument}
            >
              <Icon icon="mdi:plus" aria-hidden />
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <p className={styles.hint}>{docCopy.loading}</p>
      ) : isEmpty ? (
        <div className={styles.emptyShell}>
          <EquipmentEmptyState
            icon="mdi:file-document-outline"
            title={docCopy.empty}
            subtitle={docCopy.fileDropHint}
          />
        </div>
      ) : noMatch ? (
        <div className={styles.emptyShell}>
          <EquipmentEmptyState
            icon="mdi:file-search-outline"
            message={interpolate(docCopy.noMatch, { query: searchQuery.trim() })}
          />
        </div>
      ) : (
        <>
          <div className={styles.tableScrollShell}>
            <div className={styles.tableWrap}>
              <table className={styles.docsTable}>
                <thead>
                  <tr>
                    <th>{docCopy.colName || "Nom"}</th>
                    <th>{docCopy.colCategory || "Catégorie"}</th>
                    <th className={styles.colSize}>{docCopy.colSize || "Taille"}</th>
                    <th>{docCopy.colDate || "Date"}</th>
                    <th className={styles.colActions}>{docCopy.colActions || "Actions"}</th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map(doc => {
                    const categoryLabel = getCategoryLabel(doc.category, copy);
                    return (
                      <tr key={doc.id} className={styles.rowClickable} onClick={() => setPreviewDoc(doc)}>
                        <td>
                          <button
                            type="button"
                            className={styles.rowNameBtn}
                            onClick={e => {
                              e.stopPropagation();
                              setPreviewDoc(doc);
                            }}
                            title={doc.file_name}
                          >
                            <Icon icon={fileIconForDoc(doc)} className={styles.rowFileIcon} aria-hidden />
                            <span className={styles.rowName}>{doc.file_name}</span>
                          </button>
                        </td>
                        <td>
                          <span className={styles.categoryBadge}>{categoryLabel}</span>
                        </td>
                        <td className={styles.colSize}>{formatSize(doc.size_bytes)}</td>
                        <td>{formatDate(doc.created_at, locale)}</td>
                        <td className={styles.colActions} onClick={e => e.stopPropagation()}>
                          <div className={styles.rowActions}>
                            <button
                              type="button"
                              className={styles.actionBtn}
                              onClick={() => setPreviewDoc(doc)}
                              title={docCopy.preview}
                              aria-label={docCopy.preview}
                            >
                              <Icon icon="mdi:eye-outline" aria-hidden />
                            </button>
                            <a
                              href={getEquipmentDocumentDownloadUrl(doc.id)}
                              download={doc.file_name}
                              className={styles.actionBtn}
                              title={docCopy.download}
                              aria-label={docCopy.download}
                            >
                              <Icon icon="mdi:download-outline" aria-hidden />
                            </a>
                            <button
                              type="button"
                              className={`${styles.actionBtn} ${styles.actionDelete}`}
                              onClick={() => setDeleteTarget(doc)}
                              title={docCopy.delete}
                              aria-label={docCopy.delete}
                            >
                              <Icon icon="mdi:trash-can-outline" aria-hidden />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className={`${equipStyles.pagination} ${equipStyles.paginationEmbedded} ${styles.docsPagination}`}>
            <div className={equipStyles.paginationLeft}>
              <span className={equipStyles.paginationLabel}>{common.perPage}</span>
              <select
                className={equipStyles.paginationSelect}
                value={pageSize}
                onChange={e => setPageSize(Number(e.target.value))}
                aria-label={common.perPage}
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <span className={equipStyles.paginationInfo}>
                {interpolate(common.rangeInfo || "{start}–{end} sur {total}", {
                  start: String(rangeStart),
                  end: String(rangeEnd),
                  total: String(filteredDocuments.length)
                })}
              </span>
            </div>
            <div className={equipStyles.paginationRight}>
              <button
                type="button"
                className={equipStyles.pageBtn}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                aria-label={common.prevPage}
              >
                <FaChevronLeft />
              </button>
              <span className={equipStyles.paginationInfo}>{formatPageInfo(locale, currentPage, totalPages)}</span>
              <button
                type="button"
                className={equipStyles.pageBtn}
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                aria-label={common.nextPage}
              >
                <FaChevronRight />
              </button>
            </div>
          </div>
        </>
      )}

      {showUploadModal ? (
        <EquipmentUploadModal
          equipment={equipment}
          copy={copy}
          initialFile={pendingUploadFile}
          onClose={() => {
            setShowUploadModal(false);
            setPendingUploadFile(null);
          }}
          onUploaded={created => {
            setDocuments(prev => [created, ...prev]);
            setShowUploadModal(false);
            setPendingUploadFile(null);
            toast.success(docCopy.toasts.added);
          }}
        />
      ) : null}

      {previewDoc ? (
        <VaultDocumentPreviewModal
          file={previewDoc}
          copy={previewCopy}
          onClose={() => setPreviewDoc(null)}
          previewUrl={getEquipmentDocumentPreviewUrl(previewDoc.id)}
          downloadUrl={getEquipmentDocumentDownloadUrl(previewDoc.id)}
          showEmptyDescription={false}
          categoryBadgeClassName={styles.categoryBadge}
        />
      ) : null}

      <ConfirmModal
        open={Boolean(deleteTarget)}
        title={modalsCopy.confirm?.deleteDocument?.title}
        message={
          deleteTarget
            ? interpolate(modalsCopy.confirm?.deleteDocument?.message, {
                name: deleteTarget.file_name
              })
            : ""
        }
        icon="mdi:delete-alert-outline"
        confirmLabel={modalsCopy.form?.delete}
        confirmVariant="dangerSolid"
        confirmLoading={deleting}
        onConfirm={handleConfirmDelete}
        onClose={() => {
          if (!deleting) setDeleteTarget(null);
        }}
      />
    </div>
  );
}
