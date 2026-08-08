import { useMemo } from "react";
import { Icon } from "@iconify/react";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import tdStyles from "../TicketPage/TicketDetailPage.module.css";
import portalStyles from "./ClientPortalTickets.module.css";
import { getClientPortalCopy } from "./clientPortalI18n";
function InfoLine({
  label,
  value,
  children
}) {
  if (value == null && !children) return null;
  return <div className={tdStyles.contextLine}>
      <strong>{label}</strong> {children ?? value}
    </div>;
}
function resolveValidationOutcomeLabel(outcome, t) {
  if (outcome === "accepted") return t.validationAccepted;
  if (outcome === "rejected") return t.validationRejected;
  if (outcome === "auto_closed") return t.validationAutoClosed;
  return "-";
}
export default function PortalTicketInfoPanel({
  ticket,
  resolutionPending = false
}) {
  const locale = useAppLocale();
  const copy = useMemo(() => getClientPortalCopy(locale), [locale]);
  const t = copy.ticket.infoPanel;
  if (!ticket) return null;
  const statusLabel = copy.getTicketStatus(ticket.status);
  const priorityLabel = copy.getTicketPriority(ticket.priority);
  const messageCount = Array.isArray(ticket.comments) ? ticket.comments.length : 0;
  const validation = ticket.resolutionValidation;
  return <aside className={portalStyles.portalTicketAside} aria-label={t.aria}>
      <div className={portalStyles.portalTicketAsideInner}>
        <section className={portalStyles.portalTicketAsideSection}>
          <h2 className={tdStyles.rightPaneSectionLabel}>{t.summary}</h2>
          <InfoLine label={t.status} value={statusLabel} />
          <InfoLine label={t.priority} value={priorityLabel} />
          {resolutionPending ? <InfoLine label={t.validation} value={t.validationRequired} /> : null}
          <InfoLine label={t.type} value={copy.getTicketTypeLabel(ticket.type)} />
          <InfoLine label={t.channel} value={copy.getChannelLabel(ticket.channel)} />
          <InfoLine label={t.reference} value={`#${ticket.ticket_number || ticket.id}`} />
        </section>

        <section className={portalStyles.portalTicketAsideSection}>
          <h2 className={tdStyles.rightPaneSectionLabel}>{t.dates}</h2>
          <InfoLine label={t.created} value={copy.formatPortalDateTime(ticket.created_at)} />
          <InfoLine label={t.updated} value={copy.formatPortalDateTime(ticket.updated_at)} />
          {ticket.resolved_at ? <InfoLine label={t.resolved} value={copy.formatPortalDateTime(ticket.resolved_at)} /> : null}
          {ticket.closed_at ? <InfoLine label={t.closed} value={copy.formatPortalDateTime(ticket.closed_at)} /> : null}
        </section>

        {resolutionPending && validation ? <section className={portalStyles.portalTicketAsideSection}>
            <h2 className={tdStyles.rightPaneSectionLabel}>{t.validationSection}</h2>
            {validation.autoCloseAt ? <InfoLine label={t.autoClose} value={copy.formatPortalDateTime(validation.autoCloseAt)} /> : null}
            {validation.resolutionReason ? <p className={portalStyles.portalTicketAsideNote}>{validation.resolutionReason}</p> : null}
          </section> : null}

        {!resolutionPending && validation && !validation.isPending ? <section className={portalStyles.portalTicketAsideSection}>
            <h2 className={tdStyles.rightPaneSectionLabel}>{t.validationSection}</h2>
            <InfoLine label={t.status} value={resolveValidationOutcomeLabel(validation.outcome, t)} />
            {validation.respondedAt ? <InfoLine label={t.respondedAt} value={copy.formatPortalDateTime(validation.respondedAt)} /> : null}
          </section> : null}

        <section className={portalStyles.portalTicketAsideSection}>
          <h2 className={tdStyles.rightPaneSectionLabel}>{t.activity}</h2>
          <InfoLine label={t.messages} value={copy.formatMessageCount(messageCount)} />
          {ticket.satisfaction?.id || ticket.satisfaction?.rating ? <div className={portalStyles.portalTicketAsideSatisfaction}>
              <Icon icon="mdi:star-check-outline" aria-hidden />
              <span>{t.feedbackRecorded}</span>
            </div> : null}
        </section>
      </div>
    </aside>;
}
