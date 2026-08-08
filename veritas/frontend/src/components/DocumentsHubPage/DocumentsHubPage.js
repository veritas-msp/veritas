import { useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import { toast } from "react-toastify";
import { fetchClientFiles, uploadClientFile, deleteClientFile, getPreviewUrl, getDownloadUrl } from "../../api/clientFiles";
import { fetchClientsList } from "../../api/clients";
import cyberStyles from "../CybersecuritePage/CybersecuritePage.module.css";
import VaultDocumentPreviewModal from "../shared/VaultDocumentPreviewModal/VaultDocumentPreviewModal";
import ConfirmModal from "../Misc/ConfirmModal/ConfirmModal";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { CATEGORY_KEYS, getDocumentsHubCopy } from "./documentsHubI18n";
import { interpolate } from "../../i18n/translate";
import styles from "./DocumentsHubPage.module.css";
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
  return d.toLocaleDateString(locale === "en" ? "en-GB" : locale === "de" ? "de-DE" : locale === "it" ? "it-IT" : locale === "es" ? "es-ES" : "en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric"
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
function SortableHeader({
  column,
  label,
  sortBy,
  sortDirection,
  onSort,
  className = ""
}) {
  const active = sortBy === column;
  return <th className={`${styles.sortableTh} ${className}`.trim()} aria-sort={active ? sortDirection === "asc" ? "ascending" : "descending" : "none"}>
      <button type="button" className={styles.sortButton} onClick={() => onSort(column)}>
        <span>{label}</span>
        <Icon icon={active ? sortDirection === "asc" ? "mdi:arrow-up" : "mdi:arrow-down" : "mdi:unfold-more-horizontal"} className={`${styles.sortIcon} ${active ? styles.sortIconActive : ""}`.trim()} aria-hidden />
      </button>
    </th>;
}
export default function DocumentsHubPage() {
  const locale = useAppLocale();
  const copy = useMemo(() => getDocumentsHubCopy(locale), [locale]);
  const [files, setFiles] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [companyFilter, setCompanyFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [previewFile, setPreviewFile] = useState(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [sortBy, setSortBy] = useState(SORT_COLUMNS.created_at);
  const [sortDirection, setSortDirection] = useState("desc");
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [allFiles, clientList] = await Promise.all([fetchClientFiles(), fetchClientsList().catch(() => [])]);
      setFiles(Array.isArray(allFiles) ? allFiles : []);
      setClients(Array.isArray(clientList) ? clientList : []);
    } catch {
      setFiles([]);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);
  const companies = useMemo(() => [...new Set(files.map(f => f.client_name || "-"))].sort((a, b) => a.localeCompare(b)), [files]);
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return files.filter(f => {
      if (companyFilter !== "all" && (f.client_name || "-") !== companyFilter) return false;
      if (categoryFilter !== "all" && f.category !== categoryFilter) return false;
      if (!q) return true;
      return String(f.file_name || "").toLowerCase().includes(q) || String(f.client_name || "").toLowerCase().includes(q) || String(f.category || "").toLowerCase().includes(q) || String(f.description || "").toLowerCase().includes(q);
    });
  }, [files, search, companyFilter, categoryFilter]);
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
  const handleSort = column => {
    if (sortBy === column) {
      setSortDirection(prev => prev === "asc" ? "desc" : "asc");
      return;
    }
    setSortBy(column);
    setSortDirection(column === SORT_COLUMNS.created_at || column === SORT_COLUMNS.size_bytes ? "desc" : "asc");
  };
  const stats = useMemo(() => {
    const totalBytes = files.reduce((sum, f) => sum + (Number(f.size_bytes) || 0), 0);
    const companyCount = new Set(files.map(f => f.client_name).filter(Boolean)).size;
    return {
      total: files.length,
      companies: companyCount,
      bytes: totalBytes
    };
  }, [files]);
  const categoryLabel = key => copy.categories?.[key] || key;
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
  return <div className={`${cyberStyles.mspPage} msp-page-insight`}>
      <div className={cyberStyles.mspLayout}>
        <div className={cyberStyles.mspMain}>
          <header className={cyberStyles.mspHero}>
            <div className={cyberStyles.mspHeroMain}>
              <div className={cyberStyles.mspBrandMark}>
                <Icon icon="mdi:folder-multiple-outline" className={cyberStyles.mspBrandMarkIcon} />
              </div>
              <div className={cyberStyles.mspHeroCopy}>
                <span className={cyberStyles.mspEyebrow}>{copy.eyebrow}</span>
                <h1 className={cyberStyles.mspTitle}>{copy.pageTitle}</h1>
                <p className={cyberStyles.mspSubtitle}>{copy.subtitle}</p>
              </div>
            </div>
            <div className={cyberStyles.mspHeroActions}>
              <button type="button" className={styles.primaryBtn} onClick={() => setShowUploadModal(true)}>
                <Icon icon="mdi:upload-outline" aria-hidden />
                {copy.upload}
              </button>
            </div>
          </header>

          <div className={`${cyberStyles.mspContent} ${styles.content}`}>
            <div className={styles.kpiRow}>
              <KpiCard icon="mdi:file-multiple-outline" label={copy.kpiTotal} value={String(stats.total)} />
              <KpiCard icon="mdi:office-building-outline" label={copy.kpiCompanies} value={String(stats.companies)} />
              <KpiCard icon="mdi:database-outline" label={copy.kpiSize} value={formatSize(stats.bytes, locale)} />
            </div>

            <div className={styles.panel}>
              <div className={styles.toolbar}>
                <div className={styles.searchWrap}>
                  <Icon icon="mdi:magnify" className={styles.searchIcon} aria-hidden />
                  <input className={styles.searchInput} value={search} onChange={e => setSearch(e.target.value)} placeholder={copy.searchPlaceholder} aria-label={copy.searchPlaceholder} />
                  {search ? <button type="button" className={styles.clearBtn} onClick={() => setSearch("")} aria-label={copy.cancel}>
                      <Icon icon="mdi:close" />
                    </button> : null}
                </div>
                <select className={styles.select} value={companyFilter} onChange={e => setCompanyFilter(e.target.value)} aria-label={copy.filterCompany}>
                  <option value="all">{copy.filterCompany}</option>
                  {companies.map(c => <option key={c} value={c}>
                      {c}
                    </option>)}
                </select>
                <select className={styles.select} value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} aria-label={copy.filterCategory}>
                  <option value="all">{copy.filterCategory}</option>
                  {CATEGORY_KEYS.map(cat => <option key={cat} value={cat}>
                      {categoryLabel(cat)}
                    </option>)}
                </select>
              </div>

              {loading ? <div className={styles.loadingState}>
                  <span className={styles.spinner} aria-hidden />
                  <p>{copy.loading}</p>
                </div> : filtered.length === 0 ? <div className={styles.empty}>
                  <div className={styles.emptyIconWrap}>
                    <Icon icon="mdi:folder-open-outline" className={styles.emptyIcon} />
                  </div>
                  <h2 className={styles.emptyTitle}>{copy.emptyTitle}</h2>
                  <p className={styles.emptyHint}>{files.length === 0 ? copy.emptyHint : copy.emptyFiltered}</p>
                  {files.length === 0 ? <button type="button" className={styles.primaryBtn} onClick={() => setShowUploadModal(true)}>
                      <Icon icon="mdi:upload-outline" aria-hidden />
                      {copy.uploadFirst}
                    </button> : null}
                </div> : <div className={styles.tableWrap}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <SortableHeader column={SORT_COLUMNS.file_name} label={copy.colFile} sortBy={sortBy} sortDirection={sortDirection} onSort={handleSort} />
                        <SortableHeader column={SORT_COLUMNS.client_name} label={copy.colCompany} sortBy={sortBy} sortDirection={sortDirection} onSort={handleSort} />
                        <SortableHeader column={SORT_COLUMNS.category} label={copy.colCategory} sortBy={sortBy} sortDirection={sortDirection} onSort={handleSort} />
                        <SortableHeader column={SORT_COLUMNS.visible_to_client} label={copy.colVisibility} sortBy={sortBy} sortDirection={sortDirection} onSort={handleSort} />
                        <SortableHeader column={SORT_COLUMNS.created_at} label={copy.colDate} sortBy={sortBy} sortDirection={sortDirection} onSort={handleSort} />
                        <SortableHeader column={SORT_COLUMNS.size_bytes} label={copy.colSize} sortBy={sortBy} sortDirection={sortDirection} onSort={handleSort} />
                        <th className={styles.actionsCol}>{copy.colActions}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sorted.map(file => <tr key={file.id}>
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
                          <td>
                            <span className={`${styles.badge} ${categoryTone(file.category)}`}>
                              {categoryLabel(file.category)}
                            </span>
                          </td>
                          <td>
                            {file.visible_to_client ? <span className={styles.visibilityShared} title={copy.visiblePortal}>
                                <Icon icon="mdi:account-eye-outline" aria-hidden />
                                {copy.visiblePortal}
                              </span> : <span className={styles.visibilityInternal} title={copy.notSharedTitle}>
                                <Icon icon="mdi:account-eye-off-outline" aria-hidden />
                                {copy.notShared}
                              </span>}
                          </td>
                          <td className={styles.mutedCell}>{formatDate(file.created_at, locale)}</td>
                          <td className={styles.mutedCell}>{formatSize(file.size_bytes, locale)}</td>
                          <td>
                            <div className={styles.rowActions}>
                              <button type="button" className={styles.iconAction} title={copy.preview} onClick={() => setPreviewFile(file)}>
                                <Icon icon="mdi:eye-outline" />
                              </button>
                              <a href={getDownloadUrl(file.id)} download={file.file_name} className={styles.iconAction} title={copy.download}>
                                <Icon icon="mdi:download-outline" />
                              </a>
                              <button type="button" className={`${styles.iconAction} ${styles.iconActionDanger}`} title={copy.delete} onClick={() => handleDelete(file)}>
                                <Icon icon="mdi:delete-outline" />
                              </button>
                            </div>
                          </td>
                        </tr>)}
                    </tbody>
                  </table>
                </div>}
            </div>
          </div>
        </div>
      </div>

      {showUploadModal ? <UploadModal copy={copy} clients={clients} onClose={() => setShowUploadModal(false)} onUploaded={newFile => {
      setFiles(prev => [newFile, ...prev]);
      setShowUploadModal(false);
      toast.success(copy.uploaded);
    }} /> : null}

      {previewFile ? <VaultDocumentPreviewModal file={previewFile} onClose={() => setPreviewFile(null)} previewUrl={getPreviewUrl(previewFile.id)} downloadUrl={getDownloadUrl(previewFile.id)} footerLeading={<span>{previewFile.client_name || "-"}</span>} categoryBadgeClassName={`${styles.badge} ${categoryTone(previewFile.category)}`} /> : null}

      <ConfirmModal open={Boolean(deleteTarget)} title={copy.deleteDocumentTitle} message={deleteTarget ? interpolate(copy.deleteDocument, {
      name: deleteTarget.file_name
    }) : ""} icon="mdi:delete-alert-outline" variant="danger" confirmLabel={copy.delete} loading={deleting} onConfirm={handleConfirmDelete} onClose={() => {
      if (!deleting) setDeleteTarget(null);
    }} />
    </div>;
}
function KpiCard({
  icon,
  label,
  value
}) {
  return <div className={styles.kpiCard}>
      <span className={styles.kpiIconWrap}>
        <Icon icon={icon} className={styles.kpiIcon} />
      </span>
      <div className={styles.kpiBody}>
        <span className={styles.kpiValue}>{value}</span>
        <span className={styles.kpiLabel}>{label}</span>
      </div>
    </div>;
}
function UploadModal({
  copy,
  clients,
  onClose,
  onUploaded
}) {
  const [clientId, setClientId] = useState("");
  const [category, setCategory] = useState("Autre");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const selectedClient = clients.find(c => String(c.id) === String(clientId));
  const sortedClients = useMemo(() => [...clients].sort((a, b) => String(a.name).localeCompare(String(b.name))), [clients]);
  const handleDrop = e => {
    e.preventDefault();
    const dropped = e.dataTransfer?.files?.[0];
    if (dropped) setFile(dropped);
  };
  const handleSubmit = async e => {
    e.preventDefault();
    if (!clientId) return toast.error(copy.errCompany);
    if (!file) return toast.error(copy.errFile);
    try {
      setUploading(true);
      const result = await uploadClientFile({
        clientId,
        clientName: selectedClient?.name || "",
        category,
        description,
        file
      });
      onUploaded(result);
    } catch (err) {
      toast.error(err.message || copy.errUpload);
    } finally {
      setUploading(false);
    }
  };
  return <div className={styles.modalOverlay} onClick={onClose} role="presentation">
      <div className={styles.modal} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="documents-upload-title">
        <div className={styles.modalHeader}>
          <h2 id="documents-upload-title" className={styles.modalTitle}>
            {copy.modalTitle}
          </h2>
          <button type="button" className={styles.modalClose} onClick={onClose} aria-label={copy.cancel}>
            <Icon icon="mdi:close" />
          </button>
        </div>
        <form className={styles.modalBody} onSubmit={handleSubmit}>
          <label className={styles.formLabel}>{copy.labelCompany} *</label>
          <select className={styles.formInput} value={clientId} onChange={e => setClientId(e.target.value)} required>
            <option value="">{copy.selectCompany}</option>
            {sortedClients.map(c => <option key={c.id} value={c.id}>
                {c.name}
              </option>)}
          </select>

          <label className={styles.formLabel}>{copy.labelCategory}</label>
          <select className={styles.formInput} value={category} onChange={e => setCategory(e.target.value)}>
            {CATEGORY_KEYS.map(cat => <option key={cat} value={cat}>
                {copy.categories?.[cat] || cat}
              </option>)}
          </select>

          <label className={styles.formLabel}>{copy.labelDescription}</label>
          <input className={styles.formInput} type="text" placeholder={copy.descriptionPlaceholder} value={description} onChange={e => setDescription(e.target.value)} />

          <label className={styles.formLabel}>{copy.labelFile} *</label>
          <div className={`${styles.dropZone} ${file ? styles.dropZoneActive : ""}`} onDragOver={e => e.preventDefault()} onDrop={handleDrop} onClick={() => document.getElementById("documents-hub-file-input")?.click()} onKeyDown={e => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            document.getElementById("documents-hub-file-input")?.click();
          }
        }} role="button" tabIndex={0}>
            <input id="documents-hub-file-input" type="file" hidden onChange={e => setFile(e.target.files?.[0] || null)} accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv" />
            {file ? <span className={styles.dropZoneFile}>
                <Icon icon="mdi:file-check-outline" />
                {file.name} ({formatSize(file.size)})
              </span> : <span className={styles.dropZoneHint}>
                <Icon icon="mdi:cloud-upload-outline" />
                {copy.dropHint}
                <small>{copy.dropFormats}</small>
              </span>}
          </div>

          <div className={styles.modalActions}>
            <button type="button" className={styles.secondaryBtn} onClick={onClose}>
              {copy.cancel}
            </button>
            <button type="submit" className={styles.primaryBtn} disabled={uploading}>
              {uploading ? copy.submitting : copy.submit}
            </button>
          </div>
        </form>
      </div>
    </div>;
}
