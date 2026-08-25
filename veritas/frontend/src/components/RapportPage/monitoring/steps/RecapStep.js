import React, { useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import { fetchTickets } from "../../../../api/tickets";
import { fetchSupervisionAlertsHistory } from "../../../../api/supervisionAlerts";
import { MonitoringStepShell, MonitoringStepSection } from "../MonitoringStepLayout";
import { isDateWithinPeriod } from "../supervisionReportBuilder";
import styles from "../RapportMonitoringBuilder.module.css";

function formatDateTime(value, locale = "fr-FR") {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function ticketCreatedAt(ticket) {
  return ticket?.created_at || ticket?.createdAt || ticket?.date_creation || null;
}

function alertAt(alert) {
  return alert?.createdAt || alert?.created_at || alert?.closedAt || alert?.updatedAt || null;
}

export default function RecapStep({
  client,
  reportPeriod = {},
  allCommentsChronological = []
}) {
  const clientId = client?.id ?? client?.uuid;
  const start = reportPeriod.start || client?.reportStartDate;
  const end = reportPeriod.end || client?.reportEndDate;
  const [tickets, setTickets] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!clientId || !start || !end) {
      setTickets([]);
      setAlerts([]);
      return undefined;
    }
    const controller = new AbortController();
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [ticketRows, alertRows] = await Promise.all([
          fetchTickets({ clientId, limit: 200 }, { signal: controller.signal }).catch(() => []),
          fetchSupervisionAlertsHistory({
            clientId,
            limit: 200,
            signal: controller.signal
          }).catch(() => [])
        ]);
        if (cancelled || controller.signal.aborted) return;
        const ticketList = Array.isArray(ticketRows) ? ticketRows : ticketRows?.tickets || [];
        const alertList = Array.isArray(alertRows) ? alertRows : [];
        setTickets(
          ticketList.filter(t => isDateWithinPeriod(ticketCreatedAt(t), start, end))
        );
        setAlerts(alertList.filter(a => isDateWithinPeriod(alertAt(a), start, end)));
      } catch (err) {
        if (cancelled || err?.name === "AbortError") return;
        setError(err?.message || "Impossible de charger le récapitulatif.");
        setTickets([]);
        setAlerts([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [clientId, start, end]);

  const ticketStats = useMemo(() => {
    const byStatus = {};
    tickets.forEach(t => {
      const status = String(t.status || t.etat || t.state || "autre").toLowerCase();
      byStatus[status] = (byStatus[status] || 0) + 1;
    });
    return { total: tickets.length, byStatus };
  }, [tickets]);

  const comments = Array.isArray(allCommentsChronological) ? allCommentsChronological : [];

  return (
    <MonitoringStepShell>
      <MonitoringStepSection title="Récapitulatif">
        <p style={{ margin: "0 0 0.75rem", color: "#6b7280", fontSize: "0.9rem" }}>
          Tickets support, alertes de supervision et commentaires du rapport sur la période.
        </p>
        {loading && (
          <div style={{ padding: "1rem 0", color: "var(--text-muted, #6b7280)" }}>
            Chargement du récapitulatif…
          </div>
        )}
        {error && <div className={styles.builderSubtitle} style={{ color: "#b91c1c" }}>{error}</div>}

        <div
          style={{
            display: "grid",
            gap: "1.25rem",
            marginTop: "0.75rem"
          }}
        >
          <section data-export-section="recap-tickets">
            <h3 style={{ margin: "0 0 0.5rem", fontSize: "0.95rem", display: "flex", alignItems: "center", gap: 8 }}>
              <Icon icon="mdi:ticket-outline" width={18} height={18} />
              Tickets support ({ticketStats.total})
            </h3>
            {ticketStats.total === 0 && !loading ? (
              <p style={{ margin: 0, color: "#6b7280", fontSize: "0.9rem" }}>Aucun ticket sur cette période.</p>
            ) : (
              <>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginBottom: "0.75rem" }}>
                  {Object.entries(ticketStats.byStatus).map(([status, count]) => (
                    <span
                      key={status}
                      style={{
                        fontSize: "0.8rem",
                        padding: "0.2rem 0.55rem",
                        borderRadius: 999,
                        background: "#f3f4f6",
                        color: "#374151"
                      }}
                    >
                      {status}: {count}
                    </span>
                  ))}
                </div>
                <div className={styles.builderSubtitle} style={{ maxHeight: 220, overflow: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
                    <thead>
                      <tr style={{ textAlign: "left", borderBottom: "1px solid #e5e7eb" }}>
                        <th style={{ padding: "0.35rem 0.25rem" }}>Réf.</th>
                        <th style={{ padding: "0.35rem 0.25rem" }}>Sujet</th>
                        <th style={{ padding: "0.35rem 0.25rem" }}>Statut</th>
                        <th style={{ padding: "0.35rem 0.25rem" }}>Créé</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tickets.slice(0, 50).map(t => (
                        <tr key={t.id || t.uuid || ticketCreatedAt(t)} style={{ borderBottom: "1px solid #f3f4f6" }}>
                          <td style={{ padding: "0.35rem 0.25rem" }}>{t.reference || t.ref || t.id || "—"}</td>
                          <td style={{ padding: "0.35rem 0.25rem" }}>{t.subject || t.sujet || t.title || "—"}</td>
                          <td style={{ padding: "0.35rem 0.25rem" }}>{t.status || t.etat || "—"}</td>
                          <td style={{ padding: "0.35rem 0.25rem" }}>{formatDateTime(ticketCreatedAt(t))}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </section>

          <section data-export-section="recap-monitoring">
            <h3 style={{ margin: "0 0 0.5rem", fontSize: "0.95rem", display: "flex", alignItems: "center", gap: 8 }}>
              <Icon icon="mdi:bell-alert-outline" width={18} height={18} />
              Alertes supervision ({alerts.length})
            </h3>
            {alerts.length === 0 && !loading ? (
              <p style={{ margin: 0, color: "#6b7280", fontSize: "0.9rem" }}>Aucune alerte sur cette période.</p>
            ) : (
              <div style={{ maxHeight: 220, overflow: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
                  <thead>
                    <tr style={{ textAlign: "left", borderBottom: "1px solid #e5e7eb" }}>
                      <th style={{ padding: "0.35rem 0.25rem" }}>Titre</th>
                      <th style={{ padding: "0.35rem 0.25rem" }}>Sévérité</th>
                      <th style={{ padding: "0.35rem 0.25rem" }}>Statut</th>
                      <th style={{ padding: "0.35rem 0.25rem" }}>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {alerts.slice(0, 50).map(a => (
                      <tr key={a.id || a.queueItemId || alertAt(a)} style={{ borderBottom: "1px solid #f3f4f6" }}>
                        <td style={{ padding: "0.35rem 0.25rem" }}>{a.title || a.label || a.ruleName || "—"}</td>
                        <td style={{ padding: "0.35rem 0.25rem" }}>{a.severity || a.tone || "—"}</td>
                        <td style={{ padding: "0.35rem 0.25rem" }}>{a.status || "—"}</td>
                        <td style={{ padding: "0.35rem 0.25rem" }}>{formatDateTime(alertAt(a))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section data-export-section="recap-comments">
            <h3 style={{ margin: "0 0 0.5rem", fontSize: "0.95rem", display: "flex", alignItems: "center", gap: 8 }}>
              <Icon icon="mdi:comment-text-multiple-outline" width={18} height={18} />
              Commentaires du rapport ({comments.length})
            </h3>
            {comments.length === 0 ? (
              <p style={{ margin: 0, color: "#6b7280", fontSize: "0.9rem" }}>Aucun commentaire pour l’instant.</p>
            ) : (
              <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: "0.5rem" }}>
                {comments.map(c => {
                  const isEquipment = c.scope === "equipment";
                  const label = isEquipment
                    ? [c.moduleKey, c.referenceLabel].filter(Boolean).join(" · ") || "Périphérique"
                    : "Commentaire général";
                  return (
                    <li
                      key={isEquipment ? `eq-${c.equipmentKey}-${c.id}` : `gen-${c.id}`}
                      style={{
                        padding: "0.55rem 0.7rem",
                        border: "1px solid #e5e7eb",
                        borderRadius: 8,
                        background: "#fafafa"
                      }}
                    >
                      <div style={{ fontSize: "0.75rem", color: "#6b7280", marginBottom: 4 }}>
                        {formatDateTime(c.createdAt)} — {label}
                      </div>
                      <div style={{ fontSize: "0.9rem", whiteSpace: "pre-wrap" }}>{c.text || c.content || ""}</div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>
      </MonitoringStepSection>
    </MonitoringStepShell>
  );
}
