import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";
import { FaTimes } from "react-icons/fa";
import { buildDefaultExclusionCriterion, CRITERION_FIELD_OPTIONS, CRITERION_OPERATOR_OPTIONS } from "../AdminPage/ingestionRuleConstants";
import layout from "../EnterprisesPage/EnterpriseFormModal.module.css";
import styles from "./TicketExclusionModal.module.css";
export function buildExclusionDraftFromTicket(ticket, requesterEmail = "") {
  const ticketNumber = ticket?.ticket_number || ticket?.id || "-";
  const title = String(ticket?.title || "").trim();
  return {
    id: `exclude-${Date.now()}`,
    name: title ? `Exclusion · ${title}`.slice(0, 80) : `Exclusion ticket #${ticketNumber}`,
    criteria: [{
      ...buildDefaultExclusionCriterion(),
      field: "subject",
      operator: "contains",
      value: title
    }],
    action: "ignore_mail",
    actionTemplate: "",
    archiveOnMatch: true,
    enabled: true,
    _requesterEmail: String(requesterEmail || "").trim()
  };
}
export default function TicketExclusionModal({
  open,
  ticket,
  requesterEmail = "",
  saving = false,
  onClose,
  onConfirm
}) {
  const [draft, setDraft] = useState(() => buildExclusionDraftFromTicket(ticket, requesterEmail));
  const [activePreset, setActivePreset] = useState("title");
  useEffect(() => {
    if (!open) return;
    setDraft(buildExclusionDraftFromTicket(ticket, requesterEmail));
    setActivePreset("title");
  }, [open, ticket, requesterEmail]);
  const criterion = draft?.criteria?.[0] || buildDefaultExclusionCriterion();
  const presetKey = useMemo(() => {
    if (criterion.field === "fromAddress") return "email";
    if (criterion.field === "body") return "body";
    return "title";
  }, [criterion.field]);
  useEffect(() => {
    setActivePreset(presetKey);
  }, [presetKey]);
  if (!open || !ticket) return null;
  const ticketNumber = ticket.ticket_number || ticket.id || "-";
  const ticketTitle = ticket.title || "Sans titre";
  const applyPreset = preset => {
    setActivePreset(preset);
    if (preset === "title") {
      setDraft(prev => ({
        ...prev,
        criteria: [{
          ...(prev.criteria?.[0] || buildDefaultExclusionCriterion()),
          field: "subject",
          operator: "contains",
          value: String(ticket.title || "").trim()
        }]
      }));
      return;
    }
    if (preset === "email") {
      const email = String(requesterEmail || draft._requesterEmail || "").trim();
      setDraft(prev => ({
        ...prev,
        criteria: [{
          ...(prev.criteria?.[0] || buildDefaultExclusionCriterion()),
          field: "fromAddress",
          operator: "contains",
          value: email
        }]
      }));
      return;
    }
    setDraft(prev => ({
      ...prev,
      criteria: [{
        ...(prev.criteria?.[0] || buildDefaultExclusionCriterion()),
        field: "body",
        operator: "contains",
        value: String(ticket.title || "").trim()
      }]
    }));
  };
  const updateCriterion = patch => {
    setDraft(prev => ({
      ...prev,
      criteria: [{
        ...(prev.criteria?.[0] || buildDefaultExclusionCriterion()),
        ...patch
      }]
    }));
  };
  const handleConfirm = () => {
    const value = String(criterion.value || "").trim();
    if (!value) return;
    const {
      _requesterEmail,
      ...rule
    } = draft;
    onConfirm?.({
      ...rule,
      name: String(draft.name || "").trim() || `Exclusion ticket #${ticketNumber}`,
      criteria: [{
        ...criterion,
        value
      }]
    });
  };
  return createPortal(<div className={layout.overlay} onClick={onClose} role="presentation">
      <div className={layout.shell} style={{
      maxWidth: "min(560px, 100%)"
    }} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="ticket-exclusion-modal-title">
        <div className={layout.accentBar} aria-hidden />
        <header className={layout.header}>
          <div className={layout.headerMain}>
            <div className={layout.headerIconWrap} aria-hidden>
              <Icon icon="mdi:email-off-outline" />
            </div>
            <div className={layout.headerText}>
              <p className={layout.eyebrow}>Collecte email</p>
              <h2 className={layout.title} id="ticket-exclusion-modal-title">
                Add aux exclusions
              </h2>
              <p className={layout.subtitle}>
                Creates a rule to ignore future emails similar to this ticket.
              </p>
            </div>
          </div>
          <button type="button" className={layout.closeBtn} onClick={onClose} disabled={saving} aria-label="Close">
            <FaTimes />
          </button>
        </header>

        <div className={layout.content}>
          <div className={styles.ticketContextCard}>
            <div className={styles.ticketContextIcon} aria-hidden>
              <Icon icon="mdi:ticket-confirmation-outline" />
            </div>
            <div className={styles.ticketContextText}>
              <div className={styles.ticketContextLabel}>Ticket source</div>
              <div className={styles.ticketContextTitle}>
                #{ticketNumber} · {ticketTitle}
              </div>
              {requesterEmail ? <div className={styles.ticketContextMeta}>{requesterEmail}</div> : null}
            </div>
          </div>

          <div className={styles.presetRow} aria-label="Criteria presets">
            <button type="button" className={`${styles.presetBtn} ${activePreset === "title" ? styles.presetBtnActive : ""}`} onClick={() => applyPreset("title")}>
              <Icon icon="mdi:format-title" aria-hidden />
              Titre du ticket
            </button>
            <button type="button" className={`${styles.presetBtn} ${activePreset === "email" ? styles.presetBtnActive : ""}`} onClick={() => applyPreset("email")} disabled={!requesterEmail && !draft._requesterEmail}>
              <Icon icon="mdi:email-outline" aria-hidden />
              Email demandeur
            </button>
            <button type="button" className={`${styles.presetBtn} ${activePreset === "body" ? styles.presetBtnActive : ""}`} onClick={() => applyPreset("body")}>
              <Icon icon="mdi:text-box-outline" aria-hidden />
              Contenu
            </button>
          </div>

          <div className={layout.field}>
            <label className={layout.label} htmlFor="ticket-exclusion-name">
              Rule name
            </label>
            <input id="ticket-exclusion-name" type="text" className={layout.input} value={draft.name || ""} onChange={e => setDraft(prev => ({
            ...prev,
            name: e.target.value
          }))} placeholder="Ex. Ignorer les alertes monitoring" />
          </div>

          <div className={layout.fieldGrid2}>
            <div className={layout.field}>
              <label className={layout.label} htmlFor="ticket-exclusion-field">
                Champ
              </label>
              <select id="ticket-exclusion-field" className={layout.input} value={criterion.field} onChange={e => updateCriterion({
              field: e.target.value
            })}>
                {CRITERION_FIELD_OPTIONS.map(option => <option key={option.value} value={option.value}>
                    {option.label}
                  </option>)}
              </select>
            </div>
            <div className={layout.field}>
              <label className={layout.label} htmlFor="ticket-exclusion-operator">
                Operator
              </label>
              <select id="ticket-exclusion-operator" className={layout.input} value={criterion.operator} onChange={e => updateCriterion({
              operator: e.target.value
            })}>
                {CRITERION_OPERATOR_OPTIONS.map(option => <option key={option.value} value={option.value}>
                    {option.label}
                  </option>)}
              </select>
            </div>
          </div>

          <div className={layout.field}>
            <label className={`${layout.label} ${layout.labelRequired}`} htmlFor="ticket-exclusion-value">
              Valeur
            </label>
            <input id="ticket-exclusion-value" type="text" className={layout.input} value={criterion.value || ""} onChange={e => updateCriterion({
            value: e.target.value
          })} placeholder="Text to detect in incoming emails" />
          </div>

          <div className={styles.infoCallout}>
            <Icon icon="mdi:information-outline" className={styles.infoCalloutIcon} aria-hidden />
            <span>
              Matching emails will be ignored by collection (no new ticket created).
              The rule is added in Administration → Tickets → Collection rules.
            </span>
          </div>
        </div>

        <footer className={layout.footer}>
          <span className={layout.footerHint}>Action : ignorer le message</span>
          <div className={layout.footerActions}>
            <button type="button" className={layout.ghostBtn} onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button type="button" className={layout.primaryBtn} onClick={handleConfirm} disabled={saving || !String(criterion.value || "").trim()}>
              {saving ? <>
                  <Icon icon="mdi:loading" className={layout.spinning} aria-hidden />
                  Saving…
                </> : <>
                  <Icon icon="mdi:check" aria-hidden />
                  Add l&apos;exclusion
                </>}
            </button>
          </div>
        </footer>
      </div>
    </div>, document.getElementById("modal-root") || document.body);
}
