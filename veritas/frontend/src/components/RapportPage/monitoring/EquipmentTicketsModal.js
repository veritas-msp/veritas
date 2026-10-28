import React, { useMemo } from "react";
import { createPortal } from "react-dom";
import { FaTimes } from "react-icons/fa";
import { Icon } from "@iconify/react";
import formStyles from "../../EnterprisesPage/EnterpriseFormModal.module.css";
import { getLocalizedEquipmentTypeLabel } from "../../TicketPage/ticketEquipmentUtils";
import { formatTableDateTime } from "../../../utils/tableDateFormat";
import styles from "./RapportMonitoringBuilder.module.css";
import modalStyles from "./EquipmentTicketsModal.module.css";

const STATUS_LABELS = {
  new: "Nouveau",
  open: "Nouveau",
  pending: "En attente",
  in_progress: "En cours",
  resolved: "Résolu",
  closed: "Clôturé"
};

const PRIORITY_LABELS = {
  urgent: "Urgente",
  high: "Haute",
  normal: "Normale",
  low: "Basse"
};

const TYPE_LABELS = {
  incident: "Incident",
  demande: "Demande",
  request: "Demande",
  probleme: "Problème",
  changement: "Changement"
};

function ticketCreatedAt(ticket) {
  return ticket?.created_at || ticket?.createdAt || ticket?.date_creation || null;
}

function normalizeStatus(status) {
  const value = String(status || "").toLowerCase();
  if (value === "open") return "new";
  return value;
}

function getTicketEquipmentInfo(ticket) {
  const info = ticket?.equipment_info || ticket?.equipmentInfo || null;
  if (!info || typeof info !== "object") return { concerned: false };
  if (info.concerned === false || info.concerned === "false" || info.concerned === 0) {
    return { concerned: false };
  }
  const equipmentId = String(info.equipmentId || info.equipment_id || "").trim();
  const source = String(info.source || "").trim() === "external" ? "external" : "veritas";
  const name = String(info.name || "").trim();
  const type = String(info.type || "").trim();
  const brand = String(info.brand || "").trim();
  const model = String(info.model || "").trim();
  const serial = String(info.serial || "").trim();
  const concerned =
    info.concerned === true ||
    info.concerned === "true" ||
    Boolean(equipmentId) ||
    Boolean(brand || model || serial);
  if (!concerned) return { concerned: false };
  const displayName =
    source === "external"
      ? [brand, model].filter(Boolean).join(" ") || serial || name || "Matériel externe"
      : name || (equipmentId ? `Matériel #${equipmentId}` : "Matériel");
  return { concerned: true, source, equipmentId, name: displayName, type, brand, model, serial };
}

function categoryLabel(raw) {
  const text = String(raw || "").replace(/^prestation-/, "").replace(/-/g, " ").trim();
  return text || "—";
}

export default function EquipmentTicketsModal({
  isOpen,
  onClose,
  equipment = null,
  tickets = [],
  moduleKey = null
}) {
  const equipmentName =
    equipment?.nom || equipment?.name || equipment?.logiciel || equipment?.solution || "Équipement";
  const rows = useMemo(() => (Array.isArray(tickets) ? tickets : []), [tickets]);

  if (!isOpen) return null;

  const content = (
    <div className={formStyles.overlay} onClick={onClose} role="presentation">
      <div
        className={`${formStyles.shell} ${formStyles.shellBackup} ${modalStyles.shell}`}
        onClick={event => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="equipment-tickets-modal-title"
      >
        <div className={formStyles.accentBar} aria-hidden />

        <header className={formStyles.header}>
          <div className={formStyles.headerMain}>
            <div className={formStyles.headerIconWrap} aria-hidden>
              <Icon icon="mdi:ticket-outline" />
            </div>
            <div className={formStyles.headerText}>
              <p className={formStyles.eyebrow}>Tickets liés</p>
              <h2 id="equipment-tickets-modal-title" className={formStyles.title}>
                {equipmentName}
              </h2>
              <p className={formStyles.subtitle}>
                {rows.length} ticket{rows.length > 1 ? "s" : ""} concernant ce matériel
                {moduleKey ? ` · ${moduleKey}` : ""}
              </p>
            </div>
          </div>
          <button type="button" className={formStyles.closeBtn} onClick={onClose} aria-label="Fermer">
            <FaTimes />
          </button>
        </header>

        <div className={formStyles.bodySingle}>
          <div className={`${formStyles.content} ${modalStyles.content}`}>
            {rows.length === 0 ? (
              <div className={modalStyles.empty}>
                <Icon icon="mdi:ticket-outline" aria-hidden />
                <p>Aucun ticket lié à ce matériel sur la période du rapport.</p>
              </div>
            ) : (
              <div className={`${styles.supportTableWrap} ${modalStyles.tableWrap}`}>
                <table className={styles.supportTable}>
                  <thead>
                    <tr>
                      <th>Réf.</th>
                      <th>Sujet</th>
                      <th>Catégorie</th>
                      <th>Type</th>
                      <th>Statut</th>
                      <th>Priorité</th>
                      <th>Matériel</th>
                      <th>Créé</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map(ticket => {
                      const eq = getTicketEquipmentInfo(ticket);
                      const typeKey = String(ticket.type || "").trim().toLowerCase();
                      const statusKey = normalizeStatus(ticket.status || ticket.etat);
                      const priorityKey = String(ticket.priority || ticket.priorite || "").toLowerCase();
                      const typeLabel =
                        TYPE_LABELS[typeKey === "request" ? "demande" : typeKey] || ticket.type || "—";
                      const equipmentLabel = eq.concerned
                        ? [
                            eq.source === "external"
                              ? "Externe"
                              : getLocalizedEquipmentTypeLabel(eq.type, "fr") || eq.type,
                            eq.name
                          ]
                            .filter(Boolean)
                            .join(" · ")
                        : equipmentName;
                      return (
                        <tr key={ticket.id || ticket.uuid || ticket.ticket_number || ticketCreatedAt(ticket)}>
                          <td>{ticket.ticket_number || ticket.ticketNumber || ticket.reference || ticket.ref || "—"}</td>
                          <td>{ticket.title || ticket.subject || ticket.sujet || "—"}</td>
                          <td>{categoryLabel(ticket.category)}</td>
                          <td>{typeLabel}</td>
                          <td>{STATUS_LABELS[statusKey] || ticket.status || "—"}</td>
                          <td>{PRIORITY_LABELS[priorityKey] || ticket.priority || "—"}</td>
                          <td>{equipmentLabel}</td>
                          <td>{formatTableDateTime(ticketCreatedAt(ticket)) || "—"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <footer className={formStyles.footer}>
          <span className={formStyles.footerHint}>
            Tickets de la période où ce matériel est concerné
          </span>
          <div className={formStyles.footerActions}>
            <button type="button" className={formStyles.ghostBtn} onClick={onClose}>
              Fermer
            </button>
          </div>
        </footer>
      </div>
    </div>
  );

  return createPortal(content, document.getElementById("modal-root") || document.body);
}
