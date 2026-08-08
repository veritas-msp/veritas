import { useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import { Modal, ModalFooter, Btn, Switch, BtnIcon } from "./AdminUi";
import { CATEGORY_KEYS, getDocumentsHubCopy } from "../DocumentsHubPage/documentsHubI18n";
import { formatFileSize } from "./adminInjectionDocuments";
import styles from "./AdminInjectionDocumentsModal.module.css";

export default function AdminInjectionDocumentsModal({
  open,
  onClose,
  copy,
  locale,
  drafts,
  onChangeDrafts,
  clients,
  running,
  paused = false,
  progress,
  onInject,
  onPause,
  onResume,
  onCancelInject,
  onAddFiles,
  onAddFolder
}) {
  const hubCopy = useMemo(() => getDocumentsHubCopy(locale), [locale]);
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [bulkClientId, setBulkClientId] = useState("");
  const [bulkCategory, setBulkCategory] = useState("Autre");
  const [bulkVisible, setBulkVisible] = useState(false);

  useEffect(() => {
    if (!open) {
      setSelectedIds(new Set());
      return;
    }
    setSelectedIds(prev => {
      const next = new Set();
      for (const id of prev) {
        if (drafts.some(d => d.id === id)) next.add(id);
      }
      return next;
    });
  }, [open, drafts]);

  const sortedClients = useMemo(
    () => [...(clients || [])].sort((a, b) => String(a.name || "").localeCompare(String(b.name || ""), undefined, { sensitivity: "base" })),
    [clients]
  );

  const allSelected = drafts.length > 0 && drafts.every(d => selectedIds.has(d.id));
  const someSelected = selectedIds.size > 0;
  const targetIds = someSelected ? selectedIds : null;
  const readyCount = drafts.filter(d => d.clientId).length;
  const canInject = drafts.length > 0 && readyCount === drafts.length && !running;

  const patchDraft = (id, patch) => {
    onChangeDrafts(prev => prev.map(d => (d.id === id ? { ...d, ...patch } : d)));
  };

  const removeDraft = id => {
    onChangeDrafts(prev => prev.filter(d => d.id !== id));
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const toggleAll = checked => {
    setSelectedIds(checked ? new Set(drafts.map(d => d.id)) : new Set());
  };

  const toggleOne = (id, checked) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const applyBulk = patch => {
    onChangeDrafts(prev =>
      prev.map(d => {
        if (targetIds && !targetIds.has(d.id)) return d;
        return { ...d, ...patch };
      })
    );
  };

  const categoryLabel = key => hubCopy.categories?.[key] || key;

  return (
    <Modal
      open={open}
      onClose={() => {
        if (!running) onClose();
      }}
      title={copy.docsModalTitle}
      subtitle={copy.docsModalSubtitleLabel(drafts.length, readyCount)}
      icon="mdi:file-document-multiple-outline"
      width="min(1120px, calc(100vw - 2rem))"
      footer={
        running ? <>
            {paused ? <Btn variant="secondary" icon="mdi:play" onClick={onResume}>
                {copy.resume}
              </Btn> : <Btn variant="secondary" icon="mdi:pause" onClick={onPause}>
                {copy.pause}
              </Btn>}
            <Btn variant="danger" icon="mdi:stop" onClick={onCancelInject}>
              {copy.cancel}
            </Btn>
          </> : <ModalFooter
          onCancel={onClose}
          onConfirm={onInject}
          cancelLabel={copy.docsCancel}
          confirmLabel={copy.docsInject}
          confirmDisabled={!canInject}
          confirmLoading={running}
        />
      }
    >
      <div className={styles.toolbar}>
        <div className={styles.bulkField}>
          <label htmlFor="inj-doc-bulk-client">{copy.docsColCompany}</label>
          <select id="inj-doc-bulk-client" value={bulkClientId} onChange={e => setBulkClientId(e.target.value)} disabled={running}>
            <option value="">{copy.docsSelectCompany}</option>
            {sortedClients.map(c => (
              <option key={c.id} value={String(c.id)}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className={styles.bulkField}>
          <label htmlFor="inj-doc-bulk-category">{copy.docsColCategory}</label>
          <select id="inj-doc-bulk-category" value={bulkCategory} onChange={e => setBulkCategory(e.target.value)} disabled={running}>
            {CATEGORY_KEYS.map(cat => (
              <option key={cat} value={cat}>
                {categoryLabel(cat)}
              </option>
            ))}
          </select>
        </div>
        <div className={styles.bulkActions}>
          <Switch checked={bulkVisible} onChange={setBulkVisible} label={copy.docsVisiblePortal} disabled={running} />
          <Btn
            variant="secondary"
            size="sm"
            icon="mdi:playlist-edit"
            disabled={running || !drafts.length}
            onClick={() =>
              applyBulk({
                ...(bulkClientId ? { clientId: bulkClientId } : {}),
                category: bulkCategory,
                visibleToClient: bulkVisible
              })
            }
          >
            {someSelected ? copy.docsApplySelected : copy.docsApplyAll}
          </Btn>
          <Btn variant="secondary" size="sm" icon="mdi:file-plus-outline" disabled={running} onClick={onAddFiles}>
            {copy.docsAddFiles}
          </Btn>
          <Btn variant="secondary" size="sm" icon="mdi:folder-plus-outline" disabled={running} onClick={onAddFolder}>
            {copy.docsAddFolder}
          </Btn>
          {someSelected ? (
            <Btn
              variant="danger"
              size="sm"
              icon="mdi:trash-can-outline"
              disabled={running}
              onClick={() => {
                onChangeDrafts(prev => prev.filter(d => !selectedIds.has(d.id)));
                setSelectedIds(new Set());
              }}
            >
              {copy.docsRemoveSelected}
            </Btn>
          ) : null}
        </div>
      </div>

      <p className={styles.hint}>{copy.docsModalHint}</p>

      {drafts.length === 0 ? (
        <p className={styles.empty}>{copy.docsEmpty}</p>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.checkCol}>
                  <input type="checkbox" checked={allSelected} onChange={e => toggleAll(e.target.checked)} disabled={running} aria-label={copy.docsSelectAll} />
                </th>
                <th>{copy.docsColFile}</th>
                <th>{copy.docsColCompany}</th>
                <th>{copy.docsColCategory}</th>
                <th>{copy.docsColDescription}</th>
                <th>{copy.docsColVisibility}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {drafts.map(draft => {
                const missingClient = !draft.clientId;
                return (
                  <tr key={draft.id} className={missingClient ? styles.rowInvalid : undefined}>
                    <td className={styles.checkCol}>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(draft.id)}
                        onChange={e => toggleOne(draft.id, e.target.checked)}
                        disabled={running}
                        aria-label={draft.fileName}
                      />
                    </td>
                    <td>
                      <div className={styles.fileCell}>
                        <span className={styles.fileName} title={draft.fileName}>
                          <Icon icon="mdi:file-outline" aria-hidden /> {draft.fileName}
                        </span>
                        <span className={styles.fileMeta} title={draft.relativePath}>
                          {formatFileSize(draft.file?.size, locale)}
                          {draft.relativePath && draft.relativePath !== draft.fileName ? ` · ${draft.relativePath}` : ""}
                        </span>
                      </div>
                    </td>
                    <td>
                      <select
                        className={`${styles.cellControl} ${missingClient ? styles.missing : ""}`}
                        value={draft.clientId}
                        disabled={running}
                        onChange={e => patchDraft(draft.id, { clientId: e.target.value })}
                      >
                        <option value="">{copy.docsSelectCompany}</option>
                        {sortedClients.map(c => (
                          <option key={c.id} value={String(c.id)}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <select
                        className={`${styles.cellControl} ${styles.cellControlNarrow}`}
                        value={draft.category}
                        disabled={running}
                        onChange={e => patchDraft(draft.id, { category: e.target.value })}
                      >
                        {CATEGORY_KEYS.map(cat => (
                          <option key={cat} value={cat}>
                            {categoryLabel(cat)}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <input
                        className={`${styles.cellControl} ${styles.descControl}`}
                        type="text"
                        value={draft.description}
                        disabled={running}
                        placeholder={copy.docsDescPlaceholder}
                        onChange={e => patchDraft(draft.id, { description: e.target.value })}
                      />
                    </td>
                    <td className={styles.visibilityCell}>
                      <Switch
                        checked={Boolean(draft.visibleToClient)}
                        disabled={running}
                        onChange={checked => patchDraft(draft.id, { visibleToClient: checked })}
                        label={draft.visibleToClient ? copy.docsVisiblePortal : copy.docsInternal}
                      />
                    </td>
                    <td className={styles.actionsCell}>
                      <BtnIcon icon="mdi:close" title={copy.docsRemove} disabled={running} onClick={() => removeDraft(draft.id)} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {progress ? (() => {
        const total = Math.max(1, progress.total || drafts.length || 1);
        const current = Math.min(Math.max(0, progress.current || 0), total);
        const percent = Math.min(100, Math.round(current / total * 100));
        return <div className={styles.progressBlock}>
            <div className={styles.progressMeta}>
              <p className={styles.progress}>
                {paused ? `${copy.paused} · ` : null}
                {copy.progressLabel(current, total)}
                {" · "}
                {copy.resultOkLabel(progress.ok || 0)}
                {" · "}
                {copy.resultFailedLabel(progress.failed || 0)}
              </p>
              <span className={styles.progressPercent}>{percent}%</span>
            </div>
            <div className={`${styles.progressTrack} ${paused ? styles.progressTrackPaused : ""}`} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent} aria-label={copy.progressLabel(current, total)}>
              <div className={`${styles.progressFill} ${paused ? styles.progressFillPaused : ""}`} style={{
                width: `${percent}%`
              }} />
            </div>
          </div>;
      })() : null}
    </Modal>
  );
}
