import { Icon } from "@iconify/react";
import { getTicketDescriptionPreview } from "../../utils/incomingEmailContent";
import styles from "./TicketPage.module.css";

export function buildTicketSubjectTooltip(ticket, labels, copy) {
  const preview = getTicketDescriptionPreview(ticket.description);
  const title = String(ticket.title || "").trim();
  const sameText = (a, b) => Boolean(a && b && a.localeCompare(b, undefined, {
    sensitivity: "accent"
  }) === 0);
  const showEmailSubject = Boolean(preview.subject && !sameText(preview.subject, title));
  const showBody = Boolean(preview.body && !sameText(preview.body, title) && !sameText(preview.body, preview.subject));
  const meta = [labels.typeLabel, labels.kindLabel, labels.statusLabel, labels.priorityLabel, labels.isMajor ? copy.tooltip?.majorIncident : null, labels.category, labels.clientLabel, labels.requesterLabel, labels.commentsCount != null ? copy.formatCommentCount(labels.commentsCount) : null].filter(Boolean);
  return <div className={styles.subjectTooltip}>
      {title ? <div className={styles.subjectTooltipTitle}>{title}</div> : null}
      {preview.kind === "email" ? <div className={styles.subjectTooltipEmail}>
          <span className={styles.subjectTooltipEmailBadge}>
            <Icon icon="mdi:email-outline" aria-hidden />
            {copy.tooltip?.incomingEmail || "Incoming email"}
          </span>
          {preview.senderName ? <span className={styles.subjectTooltipEmailFrom}>{preview.senderName}</span> : null}
          {preview.senderEmail ? <span className={styles.subjectTooltipEmailAddr}>{preview.senderEmail}</span> : null}
          {showEmailSubject ? <p className={styles.subjectTooltipEmailSubject}>{preview.subject}</p> : null}
          {showBody ? <p className={styles.subjectTooltipDesc}>{preview.body}</p> : null}
        </div> : preview.body ? <p className={styles.subjectTooltipDesc}>{preview.body}</p> : null}
      {meta.length > 0 ? <p className={styles.subjectTooltipMeta}>{meta.join(" · ")}</p> : null}
    </div>;
}
