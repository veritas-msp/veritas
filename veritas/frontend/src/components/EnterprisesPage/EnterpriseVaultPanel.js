import { useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState, forwardRef } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";
import { FaSearch, FaTimes } from "react-icons/fa";
import { toast } from "react-toastify";
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
import { getEnterpriseVaultCopy } from "./enterpriseVaultI18n";
import VaultDocumentPreviewModal from "../shared/VaultDocumentPreviewModal/VaultDocumentPreviewModal";
import { repairFilenameEncoding } from "../../utils/repairFilenameEncoding";
import pageLayout from "./EnterprisesPage.module.css";
import formStyles from "./EnterpriseFormModal.module.css";
import styles from "./EnterpriseVaultPanel.module.css";
const IMAGE_MIMES = new Set(["image/jpeg", "image/png", "image/gif", "image/webp"]);
const DEFAULT_CATEGORY = "Autre";
function displayFileName(file) {
  return repairFilenameEncoding(file?.file_name);
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
export default forwardRef(function EnterpriseVaultPanel({
  clientId,
  clientName,
  copy: copyProp
}, ref) {
  const locale = useAppLocale();
  const {
    isCommunity,
    loaded: editionLoaded
  } = useVeritasEdition();
  const internalCopy = useMemo(() => getEnterpriseVaultCopy(locale), [locale]);
  const copy = copyProp ?? internalCopy;
  const [files, setFiles] = useState([]);
  const [folders, setFolders] = useState([]);
  const [allFolders, setAllFolders] = useState([]);
  const [folderPath, setFolderPath] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [previewFile, setPreviewFile] = useState(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [editingFile, setEditingFile] = useState(null);
  const [moveTarget, setMoveTarget] = useState(null);
  const [renameTarget, setRenameTarget] = useState(null);
  const currentFolderId = folderPath.length ? folderPath[folderPath.length - 1].id : null;
  const childrenMap = useMemo(() => buildFolderChildrenMap(allFolders), [allFolders]);

  const load = useCallback(async () => {
    if (!editionLoaded) {
      setLoading(true);
      return;
    }
    if (isCommunity || !clientId) {
      setFiles([]);
      setFolders([]);
      setAllFolders([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [rows, folderRows, treeRows] = await Promise.all([
        fetchClientFiles({
          clientId,
          folderId: currentFolderId || "root"
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
      setFiles(Array.isArray(rows) ? rows : []);
      setFolders(Array.isArray(folderRows) ? folderRows : []);
      setAllFolders(Array.isArray(treeRows) ? treeRows : []);
    } catch (err) {
      setFiles([]);
      setFolders([]);
      setAllFolders([]);
      if (err?.code !== "PRO_FEATURE_REQUIRED") {
        toast.error(copy.toast.loadError);
      }
    } finally {
      setLoading(false);
    }
  }, [clientId, copy.toast.loadError, currentFolderId, editionLoaded, isCommunity]);
  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => {
    setFolderPath([]);
    setSearch("");
    setCategoryFilter("all");
  }, [clientId]);
  useImperativeHandle(ref, () => ({
    openUploadModal: () => setShowUploadModal(true)
  }), []);
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return files.filter(file => {
      if (categoryFilter !== "all" && file.category !== categoryFilter) return false;
      if (!q) return true;
      return displayFileName(file).toLowerCase().includes(q) || String(file.category || "").toLowerCase().includes(q) || String(file.description || "").toLowerCase().includes(q);
    });
  }, [files, search, categoryFilter]);
  const filteredFolders = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return folders;
    return folders.filter(folder => String(folder.name || "").toLowerCase().includes(q));
  }, [folders, search]);
  const sharedCount = useMemo(() => files.filter(file => file.visible_to_client).length, [files]);
  const itemCount = filteredFolders.length + filtered.length;
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
  const handleDelete = async file => {
    if (!window.confirm(copy.formatDeleteConfirm(displayFileName(file)))) return;
    try {
      await deleteClientFile(file.id);
      setFiles(prev => prev.filter(row => row.id !== file.id));
      if (previewFile?.id === file.id) setPreviewFile(null);
      if (editingFile?.id === file.id) setEditingFile(null);
      toast.success(copy.toast.removed);
      await load();
    } catch (err) {
      toast.error(err.message || copy.toast.deleteError);
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
  const handleDeleteFolder = async folder => {
    const confirmMsg = (copy.panel.confirmDeleteFolder || "Delete « {name} »?").replace("{name}", folder.name);
    if (!window.confirm(confirmMsg)) return;
    try {
      await deleteClientFileFolder(folder.id);
      toast.success(copy.panel.folderDeleted || "OK");
      if (folderPath.some(c => String(c.id) === String(folder.id))) {
        setFolderPath(prev => {
          const idx = prev.findIndex(c => String(c.id) === String(folder.id));
          return idx <= 0 ? [] : prev.slice(0, idx);
        });
      }
      await load();
    } catch (err) {
      toast.error(err.message || copy.panel.folderDeleteError || copy.toast.deleteError);
    }
  };
  const handleMoveSubmit = async destinationFolderId => {
    if (!moveTarget) return;
    try {
      if (moveTarget.kind === "file") {
        await updateClientFile(moveTarget.item.id, { folderId: destinationFolderId });
      } else {
        await updateClientFileFolder(moveTarget.item.id, { parentId: destinationFolderId });
      }
      setMoveTarget(null);
      toast.success(copy.panel.moved || "OK");
      await load();
    } catch (err) {
      toast.error(err.message || copy.panel.moveError || copy.toast.updateError);
    }
  };
  const isEmpty = !loading && filteredFolders.length === 0 && filtered.length === 0;
  return <div className={styles.panelRoot}>
      <div className={styles.vaultHeader}>
        <div className={styles.vaultHeaderText}>
          <p className={styles.introText}>
            {copy.panel.intro}
            {copy.formatIntroSharedCount(sharedCount)}
          </p>
          <p className={styles.hintText}>{copy.panel.dragHint}</p>
        </div>
        <div className={styles.vaultHeaderStats}>
          <span className={styles.statChip}>
            <Icon icon="mdi:folder-outline" aria-hidden />
            {allFolders.length}
          </span>
          <span className={styles.statChip}>
            <Icon icon="mdi:file-document-outline" aria-hidden />
            {(copy.panel.itemsInView || "{count}").replace("{count}", String(itemCount))}
          </span>
        </div>
      </div>

      <div className={styles.vaultLayout}>
        <aside className={styles.treePane} aria-label={copy.panel.treeTitle}>
          <div className={styles.treePaneHeader}>
            <Icon icon="mdi:file-tree-outline" aria-hidden />
            <span>{copy.panel.treeTitle}</span>
          </div>
          <button
            type="button"
            className={`${styles.treeItem} ${!currentFolderId ? styles.treeItemActive : ""}`}
            onClick={() => navigateToFolder(null)}
          >
            <Icon icon="mdi:safe-square-outline" aria-hidden />
            <span className={styles.treeItemLabel}>{copy.panel.treeRoot}</span>
          </button>
          <VaultFolderTree
            parentId={null}
            depth={0}
            childrenMap={childrenMap}
            currentFolderId={currentFolderId}
            onSelect={navigateToFolder}
          />
        </aside>

        <div className={styles.contentPane}>
          <div className={styles.vaultNavRow}>
            <nav className={styles.breadcrumb} aria-label={copy.panel.rootBreadcrumb || "Vault"}>
              <button type="button" className={`${styles.breadcrumbItem} ${!folderPath.length ? styles.breadcrumbCurrent : ""}`} onClick={() => goToBreadcrumb(-1)}>
                <Icon icon="mdi:safe-square-outline" aria-hidden />
                {copy.panel.rootBreadcrumb || "Coffre-fort"}
              </button>
              {folderPath.map((crumb, index) => (
                <span key={crumb.id} className={styles.breadcrumbSeg}>
                  <Icon icon="mdi:chevron-right" className={styles.breadcrumbSep} aria-hidden />
                  <button
                    type="button"
                    className={`${styles.breadcrumbItem} ${index === folderPath.length - 1 ? styles.breadcrumbCurrent : ""}`}
                    onClick={() => goToBreadcrumb(index)}
                  >
                    {crumb.name}
                  </button>
                </span>
              ))}
            </nav>
            <div className={styles.vaultNavActions}>
              <button type="button" className={styles.navActionBtn} onClick={() => setShowFolderModal(true)} title={copy.panel.newFolder}>
                <Icon icon="mdi:folder-plus-outline" aria-hidden />
                <span>{copy.panel.newFolder}</span>
              </button>
            </div>
          </div>

          <div className={styles.filters}>
            <div className={`${pageLayout.searchWrap} ${styles.searchWrap}`}>
              <FaSearch className={pageLayout.searchIcon} aria-hidden />
              <input className={pageLayout.searchInput} value={search} onChange={e => setSearch(e.target.value)} placeholder={copy.panel.searchPlaceholder} />
              {search ? <button type="button" className={pageLayout.clearButton} onClick={() => setSearch("")} aria-label={copy.panel.clearSearchAria}>
                  <FaTimes />
                </button> : null}
            </div>
            <select className={`${pageLayout.sortSelect} ${styles.filterSelect}`} value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}>
              <option value="all">{copy.panel.allTypes}</option>
              {copy.categoryKeys.map(cat => <option key={cat} value={cat}>
                  {copy.getCategoryLabel(cat)}
                </option>)}
            </select>
          </div>

          {loading ? <div className={styles.loadingState}>
              <Icon icon="mdi:loading" className={styles.spinning} aria-hidden />
              {copy.panel.loading}
            </div> : isEmpty ? <div className={styles.empty}>
              <Icon icon={currentFolderId ? "mdi:folder-open-outline" : "mdi:safe-square-outline"} className={styles.emptyIcon} aria-hidden />
              <p>{currentFolderId ? (copy.panel.emptyFolder || copy.panel.empty) : copy.panel.empty}</p>
            </div> : <div className={styles.tableWrap}>
              <table className={styles.vaultTable}>
                <thead>
                  <tr>
                    <th>{copy.panel.colName}</th>
                    <th>{copy.panel.colType}</th>
                    <th>{copy.panel.colVisibility}</th>
                    <th>{copy.panel.colDate}</th>
                    <th className={styles.colActions}>{copy.panel.colActions}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredFolders.map(folder => (
                    <tr key={`folder-${folder.id}`} className={styles.folderRow}>
                      <td>
                        <button type="button" className={styles.rowNameBtn} onClick={() => openFolder(folder)}>
                          <Icon icon="mdi:folder" className={styles.rowFolderIcon} aria-hidden />
                          <span className={styles.rowName}>{folder.name}</span>
                        </button>
                      </td>
                      <td><span className={styles.typeBadge}>{copy.panel.folderType}</span></td>
                      <td>
                        <button
                          type="button"
                          className={`${styles.visibilityPill} ${folder.visibleToClient ? styles.visibilityPillOn : styles.visibilityPillOff}`}
                          onClick={() => toggleFolderVisibility(folder)}
                          title={copy.panel.toggleFolderVisibility}
                        >
                          <Icon icon={folder.visibleToClient ? "mdi:account-eye-outline" : "mdi:account-eye-off-outline"} aria-hidden />
                          {folder.visibleToClient ? copy.panel.visibilityOn : copy.panel.visibilityOff}
                        </button>
                      </td>
                      <td className={styles.mutedCell}>{copy.formatDate(folder.updatedAt || folder.createdAt)}</td>
                      <td className={styles.colActions}>
                        <div className={styles.rowActions}>
                          <button type="button" className={styles.actionBtn} onClick={() => openFolder(folder)} title={copy.panel.openFolder}><Icon icon="mdi:folder-open-outline" aria-hidden /></button>
                          <button type="button" className={styles.actionBtn} onClick={() => setMoveTarget({ kind: "folder", item: folder })} title={copy.panel.moveItem}><Icon icon="mdi:folder-move-outline" aria-hidden /></button>
                          <button type="button" className={styles.actionBtn} onClick={() => setRenameTarget(folder)} title={copy.panel.renameFolder}><Icon icon="mdi:pencil-outline" aria-hidden /></button>
                          <button type="button" className={`${styles.actionBtn} ${styles.actionDelete}`} onClick={() => handleDeleteFolder(folder)} title={copy.panel.deleteFolder}><Icon icon="mdi:trash-can-outline" aria-hidden /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filtered.map(file => {
                    const fileName = displayFileName(file);
                    const isPdf = file.mime_type === "application/pdf";
                    const isImage = IMAGE_MIMES.has(file.mime_type);
                    return (
                      <tr key={`file-${file.id}`}>
                        <td>
                          <button type="button" className={styles.rowNameBtn} onClick={() => setPreviewFile(file)} title={copy.card.previewTitle}>
                            <Icon icon={isImage ? "mdi:file-image-outline" : isPdf ? "mdi:file-pdf-box" : "mdi:file-document-outline"} className={styles.rowFileIcon} aria-hidden />
                            <span className={styles.rowName}>{fileName}</span>
                          </button>
                        </td>
                        <td><span className={styles.categoryBadge}>{copy.getCategoryLabel(file.category)}</span></td>
                        <td>
                          <button
                            type="button"
                            className={`${styles.visibilityPill} ${file.visible_to_client ? styles.visibilityPillOn : styles.visibilityPillOff}`}
                            onClick={() => toggleFileVisibility(file)}
                            title={copy.panel.toggleFileVisibility}
                          >
                            <Icon icon={file.visible_to_client ? "mdi:account-eye-outline" : "mdi:account-eye-off-outline"} aria-hidden />
                            {file.visible_to_client ? copy.panel.visibilityOn : copy.panel.visibilityOff}
                          </button>
                        </td>
                        <td className={styles.mutedCell}>{copy.formatDate(file.created_at)} · {copy.formatSize(file.size_bytes)}</td>
                        <td className={styles.colActions}>
                          <div className={styles.rowActions}>
                            <a href={getDownloadUrl(file.id)} download={fileName} className={styles.actionBtn} title={copy.card.downloadTitle}><Icon icon="mdi:download-outline" aria-hidden /></a>
                            <button type="button" className={styles.actionBtn} onClick={() => setMoveTarget({ kind: "file", item: file })} title={copy.card.moveTitle}><Icon icon="mdi:folder-move-outline" aria-hidden /></button>
                            <button type="button" className={styles.actionBtn} onClick={() => setEditingFile(file)} title={copy.card.editDescriptionTitle}><Icon icon="mdi:pencil-outline" aria-hidden /></button>
                            <button type="button" className={`${styles.actionBtn} ${styles.actionDelete}`} onClick={() => handleDelete(file)} title={copy.card.removeTitle}><Icon icon="mdi:trash-can-outline" aria-hidden /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>}
        </div>
      </div>

      {showUploadModal ? <VaultUploadModal clientId={clientId} clientName={clientName} folderId={currentFolderId} copy={copy} onClose={() => setShowUploadModal(false)} onUploaded={async newFile => {
      setShowUploadModal(false);
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
        onSave={async name => {
          await updateClientFileFolder(renameTarget.id, { name });
          setRenameTarget(null);
          toast.success(copy.panel.folderRenamed || "OK");
          await load();
        }}
      /> : null}

      {moveTarget ? <VaultMoveModal
        copy={copy}
        target={moveTarget}
        allFolders={allFolders}
        childrenMap={childrenMap}
        currentFolderId={currentFolderId}
        onClose={() => setMoveTarget(null)}
        onMove={handleMoveSubmit}
      /> : null}

      {previewFile ? <VaultDocumentPreviewModal file={previewFile} copy={copy} onClose={() => setPreviewFile(null)} previewUrl={getPreviewUrl(previewFile.id)} downloadUrl={getDownloadUrl(previewFile.id)} onEditDescription={() => {
      setEditingFile(previewFile);
      setPreviewFile(null);
    }} showEmptyDescription categoryBadgeClassName={styles.categoryBadge} /> : null}

      {editingFile ? <VaultEditDescriptionModal file={editingFile} copy={copy} onClose={() => setEditingFile(null)} onSaved={handleDescriptionUpdated} /> : null}
    </div>;
});

function VaultFolderTree({ parentId, depth, childrenMap, currentFolderId, onSelect }) {
  const kids = childrenMap.get(parentId || "root") || [];
  if (!kids.length) return null;
  return kids.map(folder => (
    <div key={folder.id} className={styles.treeBranch}>
      <button
        type="button"
        className={`${styles.treeItem} ${String(currentFolderId) === String(folder.id) ? styles.treeItemActive : ""}`}
        style={{ paddingLeft: `${0.65 + depth * 0.85}rem` }}
        onClick={() => onSelect(folder.id)}
      >
        <Icon icon={folder.visibleToClient ? "mdi:folder" : "mdi:folder-lock-outline"} aria-hidden />
        <span className={styles.treeItemLabel}>{folder.name}</span>
        {!folder.visibleToClient ? <Icon icon="mdi:eye-off-outline" className={styles.treeHiddenIcon} aria-hidden /> : null}
      </button>
      <VaultFolderTree
        parentId={String(folder.id)}
        depth={depth + 1}
        childrenMap={childrenMap}
        currentFolderId={currentFolderId}
        onSelect={onSelect}
      />
    </div>
  ));
}

function VaultMoveModal({ copy, target, allFolders, childrenMap, currentFolderId, onClose, onMove }) {
  const [saving, setSaving] = useState(false);
  const blockedIds = useMemo(() => {
    if (target?.kind !== "folder") return new Set();
    return collectDescendantIds(target.item.id, childrenMap);
  }, [target, childrenMap]);
  const options = useMemo(() => {
    const rows = [{ id: null, label: copy.panel.moveToRoot, depth: 0 }];
    const walk = (parentId, depth) => {
      const kids = childrenMap.get(parentId || "root") || [];
      for (const folder of kids) {
        if (blockedIds.has(String(folder.id))) continue;
        rows.push({ id: folder.id, label: folder.name, depth });
        walk(String(folder.id), depth + 1);
      }
    };
    walk(null, 1);
    return rows;
  }, [childrenMap, blockedIds, copy.panel.moveToRoot]);
  const submit = async folderId => {
    const currentParent = target.kind === "file"
      ? (target.item.folder_id || null)
      : (target.item.parentId || null);
    if (String(currentParent || "") === String(folderId || "")) {
      onClose();
      return;
    }
    try {
      setSaving(true);
      await onMove(folderId);
    } finally {
      setSaving(false);
    }
  };
  const titleName = target.kind === "file" ? displayFileName(target.item) : target.item.name;
  return createPortal(<div className={formStyles.overlay} onClick={onClose} role="presentation">
      <div className={`${formStyles.shell} ${formStyles.shellMedium}`} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className={formStyles.accentBar} aria-hidden />
        <header className={formStyles.header}>
          <div className={formStyles.headerMain}>
            <div className={formStyles.headerIconWrap} aria-hidden>
              <Icon icon="mdi:folder-move-outline" />
            </div>
            <div className={formStyles.headerText}>
              <p className={formStyles.eyebrow}>{copy.panel.sectionTitle}</p>
              <h2 className={formStyles.title}>{copy.panel.moveModalTitle}</h2>
              <p className={formStyles.subtitle}>{titleName}</p>
            </div>
          </div>
          <button type="button" className={formStyles.closeBtn} onClick={onClose} disabled={saving} aria-label={copy.uploadModal?.closeAria || "Close"}>
            <FaTimes />
          </button>
        </header>
        <div className={styles.modalFormBody}>
          <p className={styles.uploadHint}>{copy.panel.moveModalSubtitle}</p>
          <div className={styles.moveList}>
            {options.map(opt => (
              <button
                key={opt.id || "root"}
                type="button"
                className={`${styles.moveOption} ${String(opt.id || "") === String(currentFolderId || "") ? styles.moveOptionCurrent : ""}`}
                style={{ paddingLeft: `${0.85 + opt.depth * 0.85}rem` }}
                disabled={saving}
                onClick={() => submit(opt.id)}
              >
                <Icon icon={opt.id ? "mdi:folder-outline" : "mdi:safe-square-outline"} aria-hidden />
                <span>{opt.label}</span>
                <span className={styles.moveOptionAction}>{copy.panel.moveHere}</span>
              </button>
            ))}
          </div>
        </div>
        <footer className={formStyles.footer}>
          <span className={formStyles.footerHint} />
          <div className={formStyles.footerActions}>
            <button type="button" className={formStyles.ghostBtn} onClick={onClose} disabled={saving}>{copy.uploadModal?.cancel || "Cancel"}</button>
          </div>
        </footer>
      </div>
    </div>, document.body);
}

function VaultRenameFolderModal({ copy, folder, onClose, onSave }) {
  const [name, setName] = useState(folder?.name || "");
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    setName(folder?.name || "");
  }, [folder]);
  const submit = async e => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return toast.error(copy.panel.folderNameRequired || "Name required");
    try {
      setSaving(true);
      await onSave(trimmed);
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
  onClose,
  onUploaded
}) {
  const [category, setCategory] = useState(DEFAULT_CATEGORY);
  const [description, setDescription] = useState("");
  const [file, setFile] = useState(null);
  const [visibleToClient, setVisibleToClient] = useState(false);
  const [uploading, setUploading] = useState(false);
  const dropRef = useRef(null);
  const handleDrop = e => {
    e.preventDefault();
    const dropped = e.dataTransfer?.files?.[0];
    if (dropped) setFile(dropped);
  };
  const handleSubmit = async e => {
    e.preventDefault();
    if (!clientId) return toast.error(copy.toast.clientNotFound);
    if (!file) return toast.error(copy.toast.fileRequired);
    try {
      setUploading(true);
      const result = await uploadClientFile({
        clientId,
        clientName,
        category,
        description,
        file,
        visibleToClient,
        folderId
      });
      onUploaded(result);
    } catch (err) {
      toast.error(err.message || copy.toast.uploadError);
    } finally {
      setUploading(false);
    }
  };
  const modal = copy.uploadModal;
  return createPortal(<div className={formStyles.overlay} onClick={onClose} role="presentation">
      <div className={`${formStyles.shell} ${formStyles.shellMedium}`} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="vault-upload-modal-title">
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
          <button type="button" className={formStyles.closeBtn} onClick={onClose} disabled={uploading} aria-label={modal.closeAria}>
            <FaTimes />
          </button>
        </header>

        <form className={styles.modalForm} onSubmit={handleSubmit}>
          <div className={styles.modalFormBody}>
            <p className={styles.uploadHint}>{modal.hint}</p>

            <div className={formStyles.field}>
              <label className={formStyles.label} htmlFor="vault-category">
                {modal.categoryLabel}
              </label>
              <select id="vault-category" className={formStyles.input} value={category} onChange={e => setCategory(e.target.value)} disabled={uploading}>
                {copy.categoryKeys.map(cat => <option key={cat} value={cat}>
                    {copy.getCategoryLabel(cat)}
                  </option>)}
              </select>
            </div>

            <div className={formStyles.field}>
              <label className={formStyles.label} htmlFor="vault-description">
                {modal.descriptionLabel}
              </label>
              <input id="vault-description" className={formStyles.input} type="text" placeholder={modal.descriptionPlaceholder} value={description} onChange={e => setDescription(e.target.value)} disabled={uploading} />
            </div>

            <div className={formStyles.field}>
              <span className={`${formStyles.label} ${formStyles.labelRequired}`}>{modal.fileLabel}</span>
              <div ref={dropRef} className={`${styles.dropZone} ${file ? styles.dropZoneActive : ""}`} onDragOver={e => e.preventDefault()} onDrop={handleDrop} onClick={() => document.getElementById("vault-file-input")?.click()}>
                <input id="vault-file-input" type="file" style={{
                display: "none"
              }} onChange={e => setFile(e.target.files?.[0] || null)} accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,.html,.htm,.zip" disabled={uploading} />
                {file ? <span className={styles.dropZoneFile}>
                    <Icon icon="mdi:file-document-outline" aria-hidden />
                    {file.name} ({copy.formatSize(file.size)})
                  </span> : <span className={styles.dropZoneHint}>
                    <Icon icon="mdi:cloud-upload-outline" aria-hidden />
                    {modal.dropHint}
                    <small>{modal.dropFormats}</small>
                  </span>}
              </div>
            </div>

            <div className={styles.visibilitySwitchRow}>
              <div className={styles.visibilitySwitchCopy}>
                <span className={formStyles.label}>{modal.visiblePortalLabel}</span>
                <p className={styles.visibilitySwitchHint}>{modal.visiblePortalHint}</p>
              </div>
              <button type="button" role="switch" aria-checked={visibleToClient} className={`${styles.visibilitySwitch} ${visibleToClient ? styles.visibilitySwitchOn : ""}`} onClick={() => setVisibleToClient(value => !value)} disabled={uploading}>
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
function VaultEditDescriptionModal({
  file,
  copy,
  onClose,
  onSaved
}) {
  const [description, setDescription] = useState(file?.description || "");
  const [visibleToClient, setVisibleToClient] = useState(Boolean(file?.visible_to_client));
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    setDescription(file?.description || "");
    setVisibleToClient(Boolean(file?.visible_to_client));
  }, [file]);
  const handleSubmit = async e => {
    e.preventDefault();
    if (!file?.id) return;
    try {
      setSaving(true);
      const updated = await updateClientFile(file.id, {
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
  const modal = copy.editModal;
  return createPortal(<div className={formStyles.overlay} onClick={onClose} role="presentation">
      <div className={`${formStyles.shell} ${formStyles.shellMedium}`} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="vault-edit-description-title">
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
              <p className={formStyles.subtitle}>{displayFileName(file)}</p>
            </div>
          </div>
          <button type="button" className={formStyles.closeBtn} onClick={onClose} disabled={saving} aria-label={modal.closeAria}>
            <FaTimes />
          </button>
        </header>

        <form className={styles.modalForm} onSubmit={handleSubmit}>
          <div className={styles.modalFormBody}>
            <div className={formStyles.field}>
              <label className={formStyles.label} htmlFor="vault-edit-description">
                {modal.descriptionLabel}
              </label>
              <textarea id="vault-edit-description" className={formStyles.input} rows={4} maxLength={2000} placeholder={modal.descriptionPlaceholder} value={description} onChange={e => setDescription(e.target.value)} disabled={saving} />
            </div>

            <div className={styles.visibilitySwitchRow}>
              <div className={styles.visibilitySwitchCopy}>
                <span className={formStyles.label}>{modal.visiblePortalLabel}</span>
                <p className={styles.visibilitySwitchHint}>{modal.visiblePortalHint}</p>
              </div>
              <button type="button" role="switch" aria-checked={visibleToClient} className={`${styles.visibilitySwitch} ${visibleToClient ? styles.visibilitySwitchOn : ""}`} onClick={() => setVisibleToClient(value => !value)} disabled={saving}>
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
            <span className={formStyles.footerHint}>{modal.footerHint}</span>
            <div className={formStyles.footerActions}>
              <button type="button" className={formStyles.ghostBtn} onClick={onClose} disabled={saving}>
                {modal.cancel}
              </button>
              <button type="submit" className={formStyles.primaryBtn} disabled={saving}>
                {saving ? <>
                    <Icon icon="mdi:loading" className={formStyles.spinning} aria-hidden />
                    {modal.saving}
                  </> : <>
                    <Icon icon="mdi:content-save-outline" aria-hidden />
                    {modal.save}
                  </>}
              </button>
            </div>
          </footer>
        </form>
      </div>
    </div>, document.getElementById("modal-root") || document.body);
}
