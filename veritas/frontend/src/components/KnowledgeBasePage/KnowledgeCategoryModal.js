import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";
import { toast } from "react-toastify";
import { interpolate } from "../../i18n/translate";
import {
  createKnowledgeCategory,
  deleteKnowledgeCategory,
  fetchKnowledgeCategories,
  updateKnowledgeCategory
} from "../../api/knowledgeBase";
import ConfirmModal from "../Misc/ConfirmModal/ConfirmModal";
import styles from "./knowledgeBase.module.css";

export default function KnowledgeCategoryModal({
  open,
  copy,
  selectedName = "",
  canManage = false,
  assign = false,
  onClose,
  onSelect
}) {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [renamingId, setRenamingId] = useState(null);
  const [renameValue, setRenameValue] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      setCategories(await fetchKnowledgeCategories());
    } catch (err) {
      setCategories([]);
      toast.error(err.message || copy.categoryError);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setRenamingId(null);
    setRenameValue("");
    load();
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return categories.filter(row => !q || String(row.name || "").toLowerCase().includes(q));
  }, [categories, query]);

  const exactMatch = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return null;
    return categories.find(row => String(row.name || "").toLowerCase() === q) || null;
  }, [categories, query]);

  if (!open) return null;

  const pick = name => {
    onSelect?.(name || "");
    onClose?.();
  };

  const create = async () => {
    const name = query.trim();
    if (!name || busy) return;
    if (exactMatch) {
      if (assign) pick(exactMatch.name);
      return;
    }
    setBusy(true);
    try {
      const created = await createKnowledgeCategory(name);
      const existed = categories.some(row => row.id === created.id);
      await load();
      if (existed) toast.info(copy.categoryDuplicate);
      else toast.success(copy.categoryCreated);
      if (assign) pick(created.name);
      else setQuery("");
    } catch (err) {
      toast.error(err.message || copy.categoryError);
    } finally {
      setBusy(false);
    }
  };

  const saveRename = async row => {
    const name = renameValue.trim();
    if (!name || busy) return;
    setBusy(true);
    try {
      const updated = await updateKnowledgeCategory(row.id, name);
      toast.success(copy.categoryRenamed);
      setRenamingId(null);
      await load();
      if (assign && selectedName && selectedName.toLowerCase() === String(row.name || "").toLowerCase()) {
        onSelect?.(updated.name);
      }
    } catch (err) {
      toast.error(err.message || copy.categoryError);
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!confirmDelete || busy) return;
    setBusy(true);
    try {
      await deleteKnowledgeCategory(confirmDelete.id);
      toast.success(copy.categoryDeleted);
      const wasSelected = selectedName && selectedName.toLowerCase() === String(confirmDelete.name || "").toLowerCase();
      setConfirmDelete(null);
      await load();
      if (assign && wasSelected) onSelect?.("");
    } catch (err) {
      toast.error(err.message || copy.categoryError);
    } finally {
      setBusy(false);
    }
  };

  return createPortal(
    <>
      <div className={styles.modalOverlay} onClick={() => { if (!busy) onClose?.(); }}>
        <div className={styles.modalShell} onClick={event => event.stopPropagation()}>
          <div className={styles.modalHead}>
            <h2>{assign ? copy.categoryAssign : copy.categoryManage}</h2>
            <button type="button" className={styles.folderTool} onClick={onClose}><Icon icon="mdi:close" /></button>
          </div>
          <div className={styles.modalBody}>
            <input
              className={styles.search}
              value={query}
              onChange={event => setQuery(event.target.value)}
              placeholder={copy.categorySearch}
              autoFocus
              onKeyDown={event => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  create();
                }
              }}
            />
            {loading ? (
              <p className={styles.hint}>{copy.loading}</p>
            ) : filtered.length === 0 ? (
              <p className={styles.hint}>{query.trim() ? copy.categoryEmptyHint : copy.categoryEmpty}</p>
            ) : (
              <div className={styles.categoryList}>
                {filtered.map(row => {
                  const active = selectedName && selectedName.toLowerCase() === String(row.name || "").toLowerCase();
                  const renaming = renamingId === row.id;
                  return (
                    <div key={row.id} className={`${styles.categoryRow} ${active ? styles.categoryRowActive : ""}`}>
                      {renaming ? (
                        <input
                          className={styles.search}
                          value={renameValue}
                          onChange={event => setRenameValue(event.target.value)}
                          autoFocus
                          onKeyDown={event => {
                            if (event.key === "Enter") {
                              event.preventDefault();
                              saveRename(row);
                            } else if (event.key === "Escape") {
                              setRenamingId(null);
                            }
                          }}
                        />
                      ) : (
                        <button
                          type="button"
                          className={styles.categoryPick}
                          onClick={() => {
                            if (assign) pick(row.name);
                          }}
                        >
                          <Icon icon={active ? "mdi:check-circle" : "mdi:tag-outline"} />
                          <span className={styles.categoryPickName}>{row.name}</span>
                          <span className={styles.categoryCount}>{interpolate(copy.categoryArticleCount, { count: String(row.articleCount || 0) })}</span>
                        </button>
                      )}
                      {canManage ? (
                        <div className={styles.categoryRowTools}>
                          {renaming ? (
                            <>
                              <button type="button" className={styles.folderTool} title={copy.save} onClick={() => saveRename(row)} disabled={busy}>
                                <Icon icon="mdi:check" />
                              </button>
                              <button type="button" className={styles.folderTool} title={copy.modalCancel} onClick={() => setRenamingId(null)}>
                                <Icon icon="mdi:close" />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                type="button"
                                className={styles.folderTool}
                                title={copy.categoryRename}
                                onClick={() => {
                                  setRenamingId(row.id);
                                  setRenameValue(row.name);
                                }}
                              >
                                <Icon icon="mdi:pencil-outline" />
                              </button>
                              <button type="button" className={styles.folderTool} title={copy.delete} onClick={() => setConfirmDelete(row)}>
                                <Icon icon="mdi:trash-can-outline" />
                              </button>
                            </>
                          )}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          <div className={styles.modalFooter}>
            {assign && selectedName ? (
              <button type="button" className={styles.secondaryBtn} onClick={() => pick("")} disabled={busy}>
                {copy.categoryClear}
              </button>
            ) : null}
            <button type="button" className={styles.secondaryBtn} onClick={onClose}>{copy.modalCancel}</button>
            {canManage && query.trim() && !exactMatch ? (
              <button type="button" className={styles.secondaryBtn} onClick={create} disabled={busy}>
                {busy ? copy.saving : interpolate(copy.categoryCreate, { name: query.trim() })}
              </button>
            ) : canManage && exactMatch && assign ? (
              <button type="button" className={styles.secondaryBtn} onClick={() => pick(exactMatch.name)} disabled={busy}>
                {interpolate(copy.categoryUse, { name: exactMatch.name })}
              </button>
            ) : null}
          </div>
        </div>
      </div>
      <ConfirmModal
        open={Boolean(confirmDelete)}
        title={copy.categoryDeleteTitle}
        message={interpolate(copy.categoryDeleteMessage, { name: confirmDelete?.name || "" })}
        confirmLabel={copy.delete}
        cancelLabel={copy.modalCancel}
        variant="danger"
        loading={busy}
        onClose={() => { if (!busy) setConfirmDelete(null); }}
        onConfirm={remove}
      />
    </>,
    document.body
  );
}
