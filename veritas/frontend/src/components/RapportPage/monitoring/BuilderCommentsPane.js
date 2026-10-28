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

function formatTicketDateTime(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function ticketCardDetails(comment) {
  const firstLine = String(comment?.text || "").split("\n")[0].trim();
  return {
    title: comment?.ticketTitle || firstLine || "Ticket",
    subject: comment?.ticketSubject || "",
    category: comment?.ticketCategory || comment?.author || "Support",
    when: formatTicketDateTime(comment?.createdAt)
  };
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
  const targetName = targetingItem ? targetLabel(target, stepLabel) : null;

  const itemComments = useMemo(() => {
    return comments.filter(
      comment =>
        comment.moduleKey === stepKey ||
        comment.equipmentKey === stepKey ||
        (comment.scope === "general" && !comment.moduleKey)
    );
  }, [comments, stepKey]);

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

  return (
    <aside
      ref={paneRef}
      className={`${styles.commentsPane} ${targetingItem ? styles.commentsPaneTargeted : ""}`.trim()}
      aria-label="Notes du rapport"
    >
      <header className={styles.commentsPaneHeader}>
        <div className={styles.commentsPaneHeading}>
          <p className={styles.commentsPaneEyebrow}>Notes du rapport</p>
          <h3 className={styles.commentsPaneTitle}>{stepLabel}</h3>
        </div>
        <span className={styles.commentsPaneBadge}>{itemComments.length}</span>
      </header>

      <div className={styles.commentsPaneList}>
        {itemComments.length === 0 ? (
          <div className={styles.commentsPaneEmpty}>
            <Icon icon="mdi:comment-plus-outline" aria-hidden />
            <p>Aucune note pour le moment.</p>
          </div>
        ) : (
          itemComments.map(comment => {
            const isEquipment = comment.scope === "equipment";
            const isEditing =
              editingComment &&
              editingComment.id === comment.id &&
              (isEquipment
                ? editingComment.equipmentKey === comment.equipmentKey
                : editingComment.scope === "general");
            const isTicket = Boolean(comment.isTicketComment);
            const ticket = isTicket ? ticketCardDetails(comment) : null;
            const linkedToStep =
              !comment.equipmentKey || comment.equipmentKey === stepKey || comment.scope === "general";
            const scopeLabel = linkedToStep
              ? `Étape · ${stepLabel}`
              : itemDisplayName(comment.referenceLabel) || "Matériel";
            return (
              <article
                key={isEquipment ? `eq-${comment.equipmentKey}-${comment.id}` : `gen-${comment.id}`}
                className={`${styles.commentsPaneCard} ${isTicket ? styles.commentsPaneCardTicket : ""}`.trim()}
              >
                {isTicket ? (
                  <>
                    <div className={styles.commentsPaneCardTop}>
                      <span className={`${styles.commentsPaneScope} ${styles.commentsPaneScopeTicket}`}>
                        <Icon icon="mdi:ticket-outline" aria-hidden />
                        Ticket
                      </span>
                      {ticket.when ? (
                        <time className={styles.commentsPaneWhen} dateTime={comment.createdAt}>
                          {ticket.when}
                        </time>
                      ) : null}
                    </div>
                    <p className={styles.commentsPaneTicketTitle}>{ticket.title}</p>
                    {ticket.subject ? (
                      <p className={styles.commentsPaneTicketSubject}>{ticket.subject}</p>
                    ) : null}
                    <div className={styles.commentsPaneMeta}>
                      <span>{ticket.category}</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className={styles.commentsPaneCardTop}>
                      <span
                        className={`${styles.commentsPaneScope} ${
                          linkedToStep ? styles.commentsPaneScopeStep : styles.commentsPaneScopeItem
                        }`}
                      >
                        <Icon
                          icon={linkedToStep ? "mdi:layers-outline" : "mdi:cube-outline"}
                          aria-hidden
                        />
                        {scopeLabel}
                      </span>
                      <time className={styles.commentsPaneWhen}>{formatCommentDate(comment.createdAt)}</time>
                    </div>
                    <p className={styles.commentsPaneAuthor}>{comment.author || "Vous"}</p>
                    {isEditing ? (
                      <>
                        <textarea
                          rows={3}
                          className={styles.commentsPaneTextarea}
                          value={editingComment.text ?? ""}
                          onChange={event => onChangeEditingText?.(event.target.value)}
                        />
                        <div className={styles.commentsPaneActions}>
                          <button
                            type="button"
                            className={styles.commentsPanePrimary}
                            onClick={onSaveEdit}
                            disabled={!(editingComment.text || "").trim()}
                          >
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
                        <div className={styles.commentsPaneActions}>
                          <button
                            type="button"
                            className={styles.commentsPaneActionBtn}
                            onClick={() => onStartEdit?.(comment)}
                          >
                            <Icon icon="mdi:pencil-outline" aria-hidden />
                            Modifier
                          </button>
                          <button
                            type="button"
                            className={`${styles.commentsPaneActionBtn} ${styles.commentsPaneActionDanger}`}
                            onClick={() => onDelete?.(comment)}
                          >
                            <Icon icon="mdi:trash-can-outline" aria-hidden />
                            Supprimer
                          </button>
                        </div>
                      </>
                    )}
                  </>
                )}
              </article>
            );
          })
        )}
      </div>

      <div className={styles.commentsPaneComposerWrap}>
        {targetingItem ? (
          <div className={styles.commentsPaneContext}>
            <Icon icon="mdi:link-variant" aria-hidden />
            <div className={styles.commentsPaneContextBody}>
              <span className={styles.commentsPaneContextLabel}>Note liée à</span>
              <strong className={styles.commentsPaneContextName}>{targetName}</strong>
            </div>
            <button
              type="button"
              className={styles.commentsPaneContextClear}
              onClick={onClearTarget}
              title="Retirer le lien"
              aria-label="Retirer le lien matériel"
            >
              <Icon icon="mdi:close" aria-hidden />
            </button>
          </div>
        ) : (
          <p className={styles.commentsPaneSectionHint}>
            Note pour la section <strong>{stepLabel}</strong>
          </p>
        )}

        <form className={styles.commentsPaneComposer} onSubmit={handleSubmit}>
          <textarea
            id="builder-comment-input"
            ref={textareaRef}
            rows={3}
            className={styles.commentsPaneTextarea}
            aria-label={
              targetingItem
                ? `Écrire une note liée à ${targetName}`
                : "Écrire une note pour le rapport"
            }
            placeholder={
              targetingItem
                ? `Note liée à ${targetName}…`
                : "Écrire une note pour le rapport…"
            }
            value={pendingText}
            onChange={event => onPendingChange?.(event.target.value)}
            onKeyDown={event => {
              if ((event.metaKey || event.ctrlKey) && event.key === "Enter") handleSubmit(event);
            }}
          />
          <button
            type="submit"
            className={styles.commentsPanePrimary}
            disabled={!String(pendingText || "").trim()}
          >
            <Icon icon="mdi:plus" aria-hidden />
            Ajouter au rapport
          </button>
        </form>
      </div>
    </aside>
  );
}
