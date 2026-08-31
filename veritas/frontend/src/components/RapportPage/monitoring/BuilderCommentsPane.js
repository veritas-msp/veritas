import React, { useEffect, useMemo, useRef } from "react";
import { Icon } from "@iconify/react";
import styles from "../RapportBuilderPlaceholder.module.css";

function formatCommentDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function targetLabel(target, fallback) {
  if (!target) return fallback;
  return target.equipment?.nom || target.equipment?.name || target.equipment?.logiciel || fallback;
}

function itemDisplayName(label = "") {
  return String(label).replace(/^[^·]+·\s*/, "") || label;
}

export default function BuilderCommentsPane({
  stepKey,
  stepLabel,
  target,
  comments = [],
  pendingText = "",
  onPendingChange,
  onPublish,
  onSelectStep,
  onClearTarget,
  editingComment,
  onStartEdit,
  onChangeEditingText,
  onSaveEdit,
  onCancelEdit,
  onDelete
}) {
  const textareaRef = useRef(null);
  const paneRef = useRef(null);
  const targetingItem = Boolean(target?.equipmentKey && target.equipmentKey !== stepKey);
  const itemComments = useMemo(() => {
    if (!targetingItem) {
      return comments.filter(comment => comment.moduleKey === stepKey || comment.equipmentKey === stepKey || comment.scope === "general" && !comment.moduleKey);
    }
    return comments.filter(comment => comment.equipmentKey === target.equipmentKey);
  }, [comments, targetingItem, target, stepKey]);
  const otherCommentedItems = useMemo(() => {
    const seen = new Map();
    comments.forEach(comment => {
      if (!comment.equipmentKey || comment.equipmentKey === stepKey) return;
      if (comment.moduleKey && comment.moduleKey !== stepKey) return;
      if (!seen.has(comment.equipmentKey)) {
        seen.set(comment.equipmentKey, {
          equipmentKey: comment.equipmentKey,
          moduleKey: comment.moduleKey || stepKey,
          label: comment.referenceLabel || comment.equipmentKey,
          count: 0
        });
      }
      seen.get(comment.equipmentKey).count += 1;
    });
    return Array.from(seen.values());
  }, [comments, stepKey]);
  const heading = targetingItem ? targetLabel(target, stepLabel) : stepLabel;
  const hint = targetingItem
    ? "Cette note sera liée à cet élément et apparaîtra dans le rapport final."
    : `Note pour l’étape ${stepLabel}. Elle apparaîtra dans le rapport final.`;

  useEffect(() => {
    paneRef.current?.classList.remove(styles.commentsPanePulse);
    void paneRef.current?.offsetWidth;
    paneRef.current?.classList.add(styles.commentsPanePulse);
  }, [target?.equipmentKey, stepKey]);

  useEffect(() => {
    if (!targetingItem || !textareaRef.current) return;
    textareaRef.current.focus({ preventScroll: true });
  }, [target?.equipmentKey, targetingItem]);

  const handleSubmit = event => {
    event?.preventDefault?.();
    onPublish?.();
  };

  const selectItem = (comment) => {
    if (!comment?.equipmentKey) return;
    if (comment.equipmentKey === stepKey) {
      onClearTarget?.();
      return;
    }
    onSelectStep?.({
      moduleKey: comment.moduleKey || stepKey,
      equipmentKey: comment.equipmentKey,
      equipment: {
        nom: itemDisplayName(comment.referenceLabel) || comment.equipmentKey,
        name: itemDisplayName(comment.referenceLabel) || comment.equipmentKey
      }
    });
  };

  return (
    <aside
      ref={paneRef}
      className={`${styles.commentsPane} ${targetingItem ? styles.commentsPaneTargeted : ""}`.trim()}
      aria-label="Notes du rapport"
    >
      <header className={styles.commentsPaneHeader}>
        <div className={styles.commentsPaneHeading}>
          <p className={styles.commentsPaneEyebrow}>{targetingItem ? "Note liée" : "Notes du rapport"}</p>
          <h3 className={styles.commentsPaneTitle}>{heading}</h3>
        </div>
        <span className={styles.commentsPaneBadge}>{itemComments.length}</span>
      </header>

      {targetingItem ? (
        <button type="button" className={styles.commentsPaneBack} onClick={onClearTarget}>
          <Icon icon="mdi:arrow-left" aria-hidden />
          Toute l’étape {stepLabel}
        </button>
      ) : (
        <p className={styles.commentsPaneLead}>
          Cliquez sur l’icône commentaire d’un périphérique ou d’une solution, ou ajoutez une note pour toute l’étape.
        </p>
      )}

      {otherCommentedItems.length > 0 ? (
        <div className={styles.commentsPaneChips} aria-label="Éléments déjà commentés">
          {otherCommentedItems.map(item => {
            const isActive = target?.equipmentKey === item.equipmentKey;
            return (
              <button
                key={item.equipmentKey}
                type="button"
                className={`${styles.commentsPaneChip} ${isActive ? styles.commentsPaneChipActive : ""}`.trim()}
                onClick={() => onSelectStep?.({
                  moduleKey: item.moduleKey,
                  equipmentKey: item.equipmentKey,
                  equipment: { nom: itemDisplayName(item.label), name: itemDisplayName(item.label) }
                })}
              >
                <Icon icon="mdi:comment-text-outline" aria-hidden />
                <span>{itemDisplayName(item.label)}</span>
                <em>{item.count}</em>
              </button>
            );
          })}
        </div>
      ) : null}

      <div className={styles.commentsPaneList}>
        {itemComments.length === 0 ? (
          <div className={styles.commentsPaneEmpty}>
            <Icon icon="mdi:comment-plus-outline" aria-hidden />
            <p>Aucune note pour le moment.</p>
          </div>
        ) : itemComments.map(comment => {
          const isEquipment = comment.scope === "equipment";
          const isEditing = editingComment
            && editingComment.id === comment.id
            && (isEquipment ? editingComment.equipmentKey === comment.equipmentKey : editingComment.scope === "general");
          const isActive = targetingItem && comment.equipmentKey === target?.equipmentKey;
          const canSelect = isEquipment && comment.equipmentKey && comment.equipmentKey !== stepKey && !isEditing;
          return (
            <article
              key={isEquipment ? `eq-${comment.equipmentKey}-${comment.id}` : `gen-${comment.id}`}
              className={`${styles.commentsPaneCard} ${isActive ? styles.commentsPaneCardActive : ""} ${canSelect ? styles.commentsPaneCardClickable : ""}`.trim()}
              onClick={canSelect ? () => selectItem(comment) : undefined}
            >
              <div className={styles.commentsPaneMeta}>
                <span>{comment.isTicketComment ? "Support · Ticket" : comment.author || "Vous"}</span>
                <time>{formatCommentDate(comment.createdAt)}</time>
              </div>
              {isEquipment && !targetingItem && comment.referenceLabel ? <p className={styles.commentsPaneRef}>{itemDisplayName(comment.referenceLabel)}</p> : null}
              {isEditing ? (
                <>
                  <textarea
                    rows={3}
                    className={styles.commentsPaneTextarea}
                    value={editingComment.text ?? ""}
                    onChange={event => onChangeEditingText?.(event.target.value)}
                    onClick={event => event.stopPropagation()}
                  />
                  <div className={styles.commentsPaneActions} onClick={event => event.stopPropagation()}>
                    <button type="button" className={styles.commentsPanePrimary} onClick={onSaveEdit} disabled={!(editingComment.text || "").trim()}>
                      Enregistrer
                    </button>
                    <button type="button" className={styles.commentsPaneGhost} onClick={onCancelEdit}>
                      Annuler
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p className={styles.commentsPaneText}>{comment.text}</p>
                  {!comment.isTicketComment ? (
                    <div className={styles.commentsPaneActions} onClick={event => event.stopPropagation()}>
                      <button type="button" className={styles.commentsPaneGhost} onClick={() => onStartEdit?.(comment)}>
                        Modifier
                      </button>
                      <button type="button" className={styles.commentsPaneGhost} onClick={() => onDelete?.(comment)}>
                        Supprimer
                      </button>
                    </div>
                  ) : null}
                </>
              )}
            </article>
          );
        })}
      </div>

      <form className={styles.commentsPaneComposer} onSubmit={handleSubmit}>
        <label className={styles.commentsPaneHint} htmlFor="builder-comment-input">{hint}</label>
        <textarea
          id="builder-comment-input"
          ref={textareaRef}
          rows={3}
          className={styles.commentsPaneTextarea}
          placeholder="Écrire une note pour le rapport…"
          value={pendingText}
          onChange={event => onPendingChange?.(event.target.value)}
          onKeyDown={event => {
            if ((event.metaKey || event.ctrlKey) && event.key === "Enter") handleSubmit(event);
          }}
        />
        <button type="submit" className={styles.commentsPanePrimary} disabled={!String(pendingText || "").trim()}>
          <Icon icon="mdi:plus" aria-hidden />
          Ajouter au rapport
        </button>
      </form>
    </aside>
  );
}
