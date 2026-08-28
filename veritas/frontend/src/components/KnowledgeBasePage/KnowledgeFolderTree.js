import { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "@iconify/react";
import SmartTooltip from "../SmartTooltip";
import styles from "./knowledgeBase.module.css";

const EXPANDED_STORAGE_KEY = "veritas.kb.folderExpanded";

function collectExpandableIds(nodes, out = []) {
  for (const node of nodes || []) {
    if ((node.children || []).length) out.push(node.id);
    collectExpandableIds(node.children, out);
  }
  return out;
}

function findFolderPath(nodes, targetId, path = []) {
  if (!targetId || targetId === "all" || targetId === "root") return null;
  for (const node of nodes || []) {
    const next = [...path, node.id];
    if (node.id === targetId) return next;
    const nested = findFolderPath(node.children, targetId, next);
    if (nested) return nested;
  }
  return null;
}

function loadExpandedState() {
  try {
    const raw = window.localStorage.getItem(EXPANDED_STORAGE_KEY);
    if (raw == null) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(String).filter(Boolean) : [];
  } catch {
    return null;
  }
}

function persistExpandedIds(ids) {
  try {
    window.localStorage.setItem(EXPANDED_STORAGE_KEY, JSON.stringify([...ids]));
  } catch {
    /* ignore quota / private mode */
  }
}

function FolderNode({
  node,
  copy,
  currentFolder,
  depth,
  expandedIds,
  onToggle,
  onSelect,
  onCreate,
  onRename,
  onShare,
  onDelete,
  canManage
}) {
  const children = node.children || [];
  const hasChildren = children.length > 0;
  const expanded = expandedIds.has(node.id);

  return (
    <div>
      <div
        className={`${styles.folderRow} ${currentFolder === node.id ? styles.folderRowActive : ""}`}
        style={{ paddingLeft: `${0.35 + depth * 0.85}rem` }}
      >
        {hasChildren ? (
          <button
            type="button"
            className={styles.folderToggle}
            aria-expanded={expanded}
            aria-label={expanded ? copy.collapseFolder : copy.expandFolder}
            title={expanded ? copy.collapseFolder : copy.expandFolder}
            onClick={event => {
              event.stopPropagation();
              onToggle(node.id);
            }}
          >
            <Icon icon={expanded ? "mdi:chevron-down" : "mdi:chevron-right"} />
          </button>
        ) : (
          <span className={styles.folderToggleSpacer} aria-hidden />
        )}
        <SmartTooltip content={node.name} className={styles.folderNameTip}>
          <button type="button" className={styles.folderMain} onClick={() => onSelect(node.id)}>
            <Icon icon="mdi:folder-outline" />
            <span className={styles.folderName}>{node.name}</span>
            <span className={styles.folderCount}>{node.articleCount || 0}</span>
          </button>
        </SmartTooltip>
        {canManage ? (
          <div className={styles.folderTools}>
            <button type="button" className={styles.folderTool} title={copy.shareFolder} onClick={() => onShare(node)}><Icon icon="mdi:share-variant-outline" /></button>
            <button type="button" className={styles.folderTool} title={copy.renameFolder} onClick={() => onRename(node)}><Icon icon="mdi:pencil-outline" /></button>
            <button type="button" className={styles.folderTool} title={copy.newSubfolder} onClick={() => onCreate(node.id)}><Icon icon="mdi:folder-plus-outline" /></button>
            <button type="button" className={styles.folderTool} title={copy.deleteFolder} onClick={() => onDelete(node)}><Icon icon="mdi:trash-can-outline" /></button>
          </div>
        ) : null}
      </div>
      {hasChildren && expanded
        ? children.map(child => (
          <FolderNode
            key={child.id}
            node={child}
            copy={copy}
            currentFolder={currentFolder}
            depth={depth + 1}
            expandedIds={expandedIds}
            onToggle={onToggle}
            onSelect={onSelect}
            onCreate={onCreate}
            onRename={onRename}
            onShare={onShare}
            onDelete={onDelete}
            canManage={canManage}
          />
        ))
        : null}
    </div>
  );
}

export default function KnowledgeFolderTree({
  copy,
  tree,
  currentFolder,
  canManage,
  onSelect,
  onCreate,
  onRename,
  onShare,
  onDelete
}) {
  const [expandedIds, setExpandedIds] = useState(() => new Set());
  const hydrated = useRef(false);
  const knownExpandable = useRef(new Set());

  useEffect(() => {
    setExpandedIds(prev => {
      const expandable = collectExpandableIds(tree);
      const next = new Set(prev);
      if (!hydrated.current) {
        if (!tree.length) return prev;
        hydrated.current = true;
        const stored = loadExpandedState();
        if (stored) stored.forEach(id => next.add(id));
        else expandable.forEach(id => next.add(id));
      } else {
        expandable.forEach(id => {
          if (!knownExpandable.current.has(id)) next.add(id);
        });
      }
      knownExpandable.current = new Set(expandable);
      const path = findFolderPath(tree, currentFolder);
      if (path) path.slice(0, -1).forEach(id => next.add(id));
      return next;
    });
  }, [tree, currentFolder]);

  const onToggle = useCallback(id => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      persistExpandedIds(next);
      return next;
    });
  }, []);

  return (
    <aside className={styles.folderPanel}>
      <div className={styles.folderHead}>
        <div className={styles.sideTitle}>{copy.foldersTitle}</div>
        {canManage ? (
          <button type="button" className={styles.folderAdd} onClick={() => onCreate(null)}>
            <Icon icon="mdi:plus" /> {copy.newFolder}
          </button>
        ) : null}
      </div>
      <div className={styles.folderList}>
        <button
          type="button"
          className={`${styles.folderRow} ${styles.folderMainOnly} ${currentFolder === "all" ? styles.folderRowActive : ""}`}
          onClick={() => onSelect("all")}
        >
          <Icon icon="mdi:book-open-page-variant-outline" />
          <span className={styles.folderName}>{copy.allArticles}</span>
        </button>
        <button
          type="button"
          className={`${styles.folderRow} ${styles.folderMainOnly} ${currentFolder === "root" ? styles.folderRowActive : ""}`}
          onClick={() => onSelect("root")}
        >
          <Icon icon="mdi:folder-hidden" />
          <span className={styles.folderName}>{copy.noFolder}</span>
        </button>
        {tree.map(node => (
          <FolderNode
            key={node.id}
            node={node}
            copy={copy}
            currentFolder={currentFolder}
            depth={0}
            expandedIds={expandedIds}
            onToggle={onToggle}
            onSelect={onSelect}
            onCreate={onCreate}
            onRename={onRename}
            onShare={onShare}
            onDelete={onDelete}
            canManage={canManage}
          />
        ))}
      </div>
    </aside>
  );
}

export function flattenFolderOptions(tree, depth = 0) {
  const out = [];
  for (const node of tree || []) {
    out.push({ id: node.id, name: node.name, depth });
    out.push(...flattenFolderOptions(node.children || [], depth + 1));
  }
  return out;
}
