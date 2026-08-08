import React, { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";
import { FaTimes } from "react-icons/fa";
import { toast } from "react-toastify";
import { deleteEquipmentDocument, fetchEquipmentDocuments, getEquipmentDocumentDownloadUrl, getEquipmentDocumentPreviewUrl, uploadEquipmentDocument } from "../../api/equipmentDocuments";
import { getEquipmentDbId } from "../../utils/equipmentIdentity";
import { ConfirmModal } from "../AdminPage/AdminUi";
import VaultDocumentPreviewModal from "../shared/VaultDocumentPreviewModal/VaultDocumentPreviewModal";
import formStyles from "../EnterprisesPage/EnterpriseFormModal.module.css";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { getLocaleTag } from "../../i18n/locales";
import { getEquipmentDetailCopy, interpolate } from "./equipmentDetailPageI18n";
import { getEquipmentModalsCopy } from "./equipmentModalsI18n";
import styles from "./EquipmentDocumentsPanel.module.css";

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
  const haystack = [doc.file_name, getCategoryLabel(doc.category, copy), doc.description, formatSize(doc.size_bytes), formatDate(doc.created_at, locale)].filter(Boolean).join(" ").toLowerCase();
  return haystack.includes(query);
}

function DocumentCard({
  doc,
  copy,
  locale,
  onPreview,
  onDelete
}) {
  const isImage = IMAGE_MIMES.has(doc.mime_type);
  const isPdf = doc.mime_type === "application/pdf";
  const categoryLabel = getCategoryLabel(doc.category, copy);
  return <article className={styles.card}>
      <button type="button" className={styles.cardThumb} onClick={onPreview} title={copy.documents.preview}>
        {isImage ? <img src={getEquipmentDocumentPreviewUrl(doc.id)} alt={doc.file_name} className={styles.thumbImg} /> : <Icon icon={isPdf ? "mdi:file-pdf-box" : "mdi:file-document-outline"} className={`${styles.thumbIcon} ${isPdf ? styles.thumbPdf : styles.thumbDoc}`} aria-hidden />}
      </button>
      <div className={styles.cardBody}>
        <p className={styles.cardName} title={doc.file_name}>
          {doc.file_name}
        </p>
        <span className={styles.categoryBadge}>{categoryLabel}</span>
        {doc.description ? <p className={styles.cardDesc}>{doc.description}</p> : null}
        <p className={styles.cardDate}>
          {formatDate(doc.created_at, locale)} · {formatSize(doc.size_bytes)}
        </p>
      </div>
      <div className={styles.cardActions}>
        <button type="button" className={styles.actionBtn} onClick={onPreview} title={copy.documents.preview} aria-label={copy.documents.preview}>
          <Icon icon="mdi:eye-outline" aria-hidden />
        </button>
        <a href={getEquipmentDocumentDownloadUrl(doc.id)} download={doc.file_name} className={styles.actionBtn} title={copy.documents.download}>
          <Icon icon="mdi:download-outline" aria-hidden />
        </a>
        <button type="button" className={`${styles.actionBtn} ${styles.actionDelete}`} onClick={onDelete} title={copy.documents.delete} aria-label={copy.documents.delete}>
          <Icon icon="mdi:trash-can-outline" aria-hidden />
        </button>
      </div>
    </article>;
}

function EquipmentUploadModal({
  equipment,
  copy,
  onClose,
  onUploaded
}) {
  const docCopy = copy.documents;
  const modal = docCopy.uploadModal;
  const [category, setCategory] = useState(DEFAULT_CATEGORY);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileInputId = "equipment-doc-file-input";
  const handleDrop = e => {
    e.preventDefault();
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
  return createPortal(<div className={formStyles.overlay} onClick={onClose} role="presentation">
      <div className={`${formStyles.shell} ${formStyles.shellMedium}`} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="equipment-doc-upload-title">
        <div className={formStyles.accentBar} aria-hidden />
        <header className={formStyles.header}>
          <div className={formStyles.headerMain}>
            <div className={formStyles.headerIconWrap} aria-hidden>
              <Icon icon="mdi:file-document-plus-outline" />
            </div>
            <div className={formStyles.headerText}>
              <p className={formStyles.eyebrow}>{modal.eyebrow}</p>
              <h2 className={formStyles.title} id="equipment-doc-upload-title">
                {modal.title}
              </h2>
              <p className={formStyles.subtitle}>{modal.subtitle}</p>
            </div>
          </div>
          <button type="button" className={formStyles.closeBtn} onClick={onClose} disabled={uploading} aria-label={modal.closeAria}>
            <FaTimes />
          </button>
        </header>

        <form className={styles.modalForm} onSubmit={handleSubmit}>
          <div className={styles.modalFormBody}>
            <p className={styles.uploadHint}>{modal.hint}</p>

            <div className={formStyles.field}>
              <label className={formStyles.label} htmlFor="equipment-doc-modal-category">
                {modal.categoryLabel}
              </label>
              <select id="equipment-doc-modal-category" className={formStyles.input} value={category} onChange={e => setCategory(e.target.value)} disabled={uploading}>
                {CATEGORY_VALUES.map(item => <option key={item} value={item}>
                    {getCategoryLabel(item, copy)}
                  </option>)}
              </select>
            </div>

            <div className={formStyles.field}>
              <span className={`${formStyles.label} ${formStyles.labelRequired}`}>{modal.fileLabel}</span>
              <div className={`${styles.dropZone} ${file ? styles.dropZoneActive : ""}`} onDragOver={e => e.preventDefault()} onDrop={handleDrop} onClick={() => document.getElementById(fileInputId)?.click()} role="button" tabIndex={0} onKeyDown={e => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                document.getElementById(fileInputId)?.click();
              }
            }}>
                <input id={fileInputId} type="file" className={styles.hiddenInput} onChange={e => setFile(e.target.files?.[0] || null)} accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv" disabled={uploading} />
                {file ? <span className={styles.dropZoneFile}>
                    <Icon icon="mdi:file-document-outline" aria-hidden />
                    {file.name} ({formatSize(file.size)})
                  </span> : <span className={styles.dropZoneHint}>
                    <Icon icon="mdi:cloud-upload-outline" aria-hidden />
                    {modal.dropHint}
                    <small>{modal.dropFormats}</small>
                  </span>}
              </div>
            </div>
          </div>

          <footer className={formStyles.footer}>
            <span className={formStyles.footerHint}>{modal.footerRequired}</span>
            <div className={formStyles.footerActions}>
              <button type="button" className={formStyles.ghostBtn} onClick={onClose} disabled={uploading}>
                {modal.cancel}
              </button>
              <button type="submit" className={formStyles.primaryBtn} disabled={uploading || !file}>
                {uploading ? <>
                    <Icon icon="mdi:loading" className={formStyles.spinning} aria-hidden />
                    {modal.uploading}
                  </> : <>
                    <Icon icon="mdi:upload-outline" aria-hidden />
                    {modal.upload}
                  </>}
              </button>
            </div>
          </footer>
        </form>
      </div>
    </div>, document.getElementById("modal-root") || document.body);
}

export default function EquipmentDocumentsPanel({
  equipment,
  embedded = false
}) {
  const locale = useAppLocale();
  const copy = useMemo(() => getEquipmentDetailCopy(locale), [locale]);
  const docCopy = copy.documents;
  const modalsCopy = useMemo(() => getEquipmentModalsCopy(locale), [locale]);
  const equipmentId = getEquipmentDbId(equipment);
  const clientId = equipment?.clientId;
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [previewDoc, setPreviewDoc] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const filteredDocuments = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return documents;
    return documents.filter(doc => matchesDocumentSearch(doc, query, copy, locale));
  }, [documents, searchQuery, copy, locale]);
  const previewCopy = useMemo(() => ({
    previewModal: {
      download: docCopy.download,
      closeAria: docCopy.closePreview,
      unsupported: docCopy.previewUnsupported,
      noDescription: docCopy.noDescription
    },
    getCategoryLabel: categoryValue => getCategoryLabel(categoryValue, copy),
    formatDate: value => formatDate(value, locale),
    formatSize
  }), [copy, docCopy, locale]);
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
    return <div className={embedded ? styles.embeddedRoot : styles.panel}>
        <p className={styles.hint}>
          {docCopy.saveFirst}
        </p>
      </div>;
  }
  return <div className={embedded ? styles.embeddedRoot : styles.panel}>
      <div className={styles.toolbar}>
        <div className={styles.searchBar}>
          <Icon icon="mdi:magnify" className={styles.searchIcon} aria-hidden />
          <input type="search" className={styles.searchInput} value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder={docCopy.searchPlaceholder} aria-label={docCopy.searchAria} />
          {searchQuery ? <button type="button" className={styles.searchClear} onClick={() => setSearchQuery("")} title={docCopy.clearSearch} aria-label={docCopy.clearSearch}>
              <Icon icon="mdi:close" aria-hidden />
            </button> : null}
          <span className={styles.searchCount}>
            {filteredDocuments.length} / {documents.length}
          </span>
        </div>
        <button type="button" className={styles.uploadBtn} onClick={() => setShowUploadModal(true)}>
          <Icon icon="mdi:plus" aria-hidden />
          {docCopy.addDocument}
        </button>
      </div>

      {loading ? <p className={styles.hint}>{docCopy.loading}</p> : documents.length === 0 ? <div className={styles.empty}>
          <Icon icon="mdi:file-document-outline" className={styles.emptyIcon} aria-hidden />
          <p>{docCopy.empty}</p>
        </div> : filteredDocuments.length === 0 ? <div className={styles.empty}>
          <Icon icon="mdi:file-search-outline" className={styles.emptyIcon} aria-hidden />
          <p>{interpolate(docCopy.noMatch, {
          query: searchQuery.trim()
        })}</p>
        </div> : <div className={styles.grid}>
          {filteredDocuments.map(doc => <DocumentCard key={doc.id} doc={doc} copy={copy} locale={locale} onPreview={() => setPreviewDoc(doc)} onDelete={() => setDeleteTarget(doc)} />)}
        </div>}

      {showUploadModal ? <EquipmentUploadModal equipment={equipment} copy={copy} onClose={() => setShowUploadModal(false)} onUploaded={created => {
      setDocuments(prev => [created, ...prev]);
      setShowUploadModal(false);
      toast.success(docCopy.toasts.added);
    }} /> : null}

      {previewDoc ? <VaultDocumentPreviewModal file={previewDoc} copy={previewCopy} onClose={() => setPreviewDoc(null)} previewUrl={getEquipmentDocumentPreviewUrl(previewDoc.id)} downloadUrl={getEquipmentDocumentDownloadUrl(previewDoc.id)} showEmptyDescription={false} categoryBadgeClassName={styles.categoryBadge} /> : null}

      <ConfirmModal open={Boolean(deleteTarget)} title={modalsCopy.confirm?.deleteDocument?.title} message={deleteTarget ? interpolate(modalsCopy.confirm?.deleteDocument?.message, {
      name: deleteTarget.file_name
    }) : ""} icon="mdi:delete-alert-outline" confirmLabel={modalsCopy.form?.delete} confirmVariant="dangerSolid" confirmLoading={deleting} onConfirm={handleConfirmDelete} onClose={() => {
      if (!deleting) setDeleteTarget(null);
    }} />
    </div>;
}
