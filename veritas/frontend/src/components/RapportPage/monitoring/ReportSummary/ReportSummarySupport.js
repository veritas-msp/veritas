import React, { useEffect, useMemo, useState } from "react";
import { Icon as IconifyIcon } from "@iconify/react";
import { fetchTickets } from "../../../../api/tickets";
import { fetchClientSupportCredits } from "../../../../api/clients";
import { isDateWithinPeriod } from "../supervisionReportBuilder";
import { isSalesTicket } from "../../../../utils/salesTicketUtils";
import { computeSupportCreditTotals } from "../../../TicketPage/ticketClientSummaryUtils";
import { formatClientSlaRows, getTicketSlaDisplay, parseClientSla, SLA_PRIORITY_LABELS } from "../../../../utils/ticketSlaUtils";
import infraStyles from "./ReportSummaryInfrastructure.module.css";
import { ReportCategoryKpisBlock, ReportTableBlock } from "./ReportSummaryBlocks";
import styles from "./ReportSummarySupport.module.css";

const STATUS_LABELS = {
  new: "Nouveau",
  open: "Nouveau",
  pending: "En attente",
  in_progress: "En cours",
  resolved: "Résolu",
  closed: "Clôturé"
};

function formatDateFr(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString("fr-FR");
}

function ticketCreatedAt(ticket) {
  return ticket?.created_at || ticket?.createdAt || ticket?.date_creation || null;
}

function ticketResolvedAt(ticket) {
  return ticket?.resolved_at || ticket?.resolvedAt || ticket?.closed_at || ticket?.closedAt || null;
}

function normalizeStatus(status) {
  const value = String(status || "").toLowerCase();
  if (value === "open") return "new";
  return value;
}

function isClosedStatus(status) {
  const key = normalizeStatus(status);
  return key === "resolved" || key === "closed";
}

function parseTicketList(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.tickets)) return payload.tickets;
  return [];
}

async function fetchClientTickets(clientId, signal) {
  const all = [];
  const pageSize = 200;
  for (let offset = 0; offset < 600; offset += pageSize) {
    const payload = await fetchTickets(
      { clientId, includeClosed: true, limit: pageSize, offset },
      { signal }
    );
    const rows = parseTicketList(payload);
    all.push(...rows);
    if (rows.length < pageSize) break;
  }
  return all;
}

function contractTone(contrat = {}) {
  if (contrat.suspendu) {
    return { label: "Suspendu", className: styles.badgeWarn };
  }
  const end = contrat.expiration ? new Date(contrat.expiration) : null;
  if (!end || Number.isNaN(end.getTime())) {
    return { label: "Non renseigné", className: styles.badgeMuted };
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  if (end < today) return { label: "Expiré", className: styles.badgeDanger };
  const days = Math.ceil((end - today) / (1000 * 60 * 60 * 24));
  if (days <= 30) return { label: `Expire dans ${days} j`, className: styles.badgeWarn };
  return { label: "Actif", className: styles.badgeOk };
}

export default function ReportSummarySupport({ client }) {
  const clientId = client?.id ?? client?.uuid;
  const start = client?.reportStartDate;
  const end = client?.reportEndDate;
  const [tickets, setTickets] = useState([]);
  const [credits, setCredits] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!clientId) {
      setTickets([]);
      setCredits(null);
      return undefined;
    }
    const controller = new AbortController();
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [ticketRows, creditSummary] = await Promise.all([
          fetchClientTickets(clientId, controller.signal).catch(() => []),
          fetchClientSupportCredits(clientId, { signal: controller.signal }).catch(() => null)
        ]);
        if (cancelled || controller.signal.aborted) return;
        setTickets(Array.isArray(ticketRows) ? ticketRows.filter(t => !isSalesTicket(t)) : []);
        setCredits(creditSummary);
      } catch (err) {
        if (cancelled || err?.name === "AbortError") return;
        setError(err?.message || "Impossible de charger les statistiques support.");
        setTickets([]);
        setCredits(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [clientId]);

  const createdInPeriod = useMemo(
    () => tickets.filter(t => isDateWithinPeriod(ticketCreatedAt(t), start, end)),
    [tickets, start, end]
  );

  const resolvedInPeriod = useMemo(
    () =>
      tickets.filter(t => {
        if (!isClosedStatus(t.status || t.etat)) return false;
        const at = ticketResolvedAt(t) || t.updated_at || t.updatedAt;
        return isDateWithinPeriod(at, start, end);
      }),
    [tickets, start, end]
  );

  const openNow = useMemo(
    () => tickets.filter(t => !isClosedStatus(t.status || t.etat)),
    [tickets]
  );

  const byStatus = useMemo(() => {
    const map = {};
    createdInPeriod.forEach(t => {
      const key = normalizeStatus(t.status || t.etat || "autre");
      map[key] = (map[key] || 0) + 1;
    });
    return map;
  }, [createdInPeriod]);

  const byPriority = useMemo(() => {
    const map = {};
    createdInPeriod.forEach(t => {
      const key = String(t.priority || t.priorite || "normal").toLowerCase();
      map[key] = (map[key] || 0) + 1;
    });
    return map;
  }, [createdInPeriod]);

  const sla = parseClientSla(client?.contrat);
  const slaRows = sla.enabled ? formatClientSlaRows(client?.contrat) : [];
  const slaStats = useMemo(() => {
    if (!sla.enabled) return null;
    let met = 0;
    let breached = 0;
    createdInPeriod.forEach(ticket => {
      const view = getTicketSlaDisplay(ticket, { clientContrat: client?.contrat });
      if (view.status === "met") met += 1;
      else if (view.status === "breached") breached += 1;
    });
    return { met, breached, tracked: met + breached };
  }, [createdInPeriod, client?.contrat, sla.enabled]);

  const packs = Array.isArray(credits?.packs) ? credits.packs : [];
  const creditTotals = computeSupportCreditTotals(credits?.balance, packs);
  const visiblePacks = packs.filter(pack => ["active", "upcoming", "depleted"].includes(String(pack.status || "")));
  const showCredits = Boolean(credits) && (creditTotals.remaining > 0 || visiblePacks.length > 0);

  const contrat = client?.contrat && typeof client.contrat === "object" ? client.contrat : {};
  const validity = contractTone(contrat);
  const periodLabel = start && end ? `${formatDateFr(start)} → ${formatDateFr(end)}` : "Période non définie";

  const kpiItems = [
    { label: "Créés", value: createdInPeriod.length, icon: "mdi:ticket-outline", iconColor: "#0f766e" },
    { label: "Résolus", value: resolvedInPeriod.length, icon: "mdi:check-circle-outline", iconColor: "#047857" },
    { label: "Ouverts", value: openNow.length, icon: "mdi:progress-clock", iconColor: "#b45309" },
    slaStats
      ? {
          label: "SLA respectés",
          value: slaStats.tracked > 0 ? `${slaStats.met}/${slaStats.tracked}` : "—",
          hint: slaStats.breached > 0 ? `${slaStats.breached} dépassé${slaStats.breached > 1 ? "s" : ""}` : "Aucun dépassement",
          icon: "mdi:timer-check-outline",
          iconColor: slaStats.breached > 0 ? "#b91c1c" : "#047857"
        }
      : {
          label: "Priorité haute",
          value: (byPriority.urgent || 0) + (byPriority.high || 0),
          icon: "mdi:alert-circle-outline",
          iconColor: "#b91c1c"
        }
  ];

  const ticketRows = createdInPeriod.slice(0, 40).map(t => {
    const slaView = sla.enabled ? getTicketSlaDisplay(t, { clientContrat: client?.contrat }) : null;
    return {
      _rowKey: t.id || t.uuid || ticketCreatedAt(t),
      ref: t.ticket_number || t.ticketNumber || t.reference || t.ref || "—",
      subject: t.title || t.subject || t.sujet || "—",
      status: STATUS_LABELS[normalizeStatus(t.status || t.etat)] || t.status || "—",
      priority: SLA_PRIORITY_LABELS[String(t.priority || "").toLowerCase()] || t.priority || "—",
      created: formatDateFr(ticketCreatedAt(t)),
      sla: slaView && slaView.label && slaView.label !== "-" ? slaView.label : "—"
    };
  });

  const ticketColumns = [
    { id: "ref", label: "Réf." },
    { id: "subject", label: "Sujet" },
    { id: "priority", label: "Priorité" },
    { id: "status", label: "Statut" },
    { id: "created", label: "Créé" },
    ...(sla.enabled ? [{ id: "sla", label: "SLA" }] : [])
  ];

  return (
    <div className={infraStyles.root}>
      <section className={infraStyles.section}>
        <div className={infraStyles.sectionHeader}>
          <div className={infraStyles.sectionTitleWrapper}>
            <span className={infraStyles.sectionIcon}>
              <IconifyIcon icon="mdi:headset" width={34} height={34} color="#0f766e" />
            </span>
            <div>
              <h4 className={infraStyles.sectionTitle}>Activité support</h4>
              <div className={infraStyles.sectionSubtitle}>Tickets de la période {periodLabel}</div>
            </div>
          </div>
        </div>
        <div className={infraStyles.sectionTitleSeparator} />
        {loading ? <div className={styles.state}>Chargement des tickets…</div> : null}
        {error ? <div className={infraStyles.sectionHelperMuted}>{error}</div> : null}
        <ReportCategoryKpisBlock items={kpiItems} />
        {Object.keys(byStatus).length > 0 ? (
          <div className={infraStyles.sectionHelperMuted}>
            {Object.entries(byStatus)
              .map(([status, count]) => `${STATUS_LABELS[status] || status} : ${count}`)
              .join(" · ")}
          </div>
        ) : null}
        <ReportTableBlock
          title="Tickets créés sur la période"
          count={createdInPeriod.length}
          columns={ticketColumns}
          rows={ticketRows}
          emptyMessage={loading ? "" : "Aucun ticket support sur cette période."}
        />
      </section>

      <section className={infraStyles.section}>
        <div className={infraStyles.sectionHeader}>
          <div className={infraStyles.sectionTitleWrapper}>
            <span className={infraStyles.sectionIcon}>
              <IconifyIcon icon="mdi:file-document-outline" width={34} height={34} color="#0f766e" />
            </span>
            <div>
              <h4 className={infraStyles.sectionTitle}>Contrat</h4>
              <div className={infraStyles.sectionSubtitle}>Dates, SLA et crédits tickets</div>
            </div>
          </div>
        </div>
        <div className={infraStyles.sectionTitleSeparator} />
        <div className={styles.factsGrid}>
          <div className={styles.factCard}>
            <span className={styles.factLabel}>Début</span>
            <span className={styles.factValue}>{formatDateFr(contrat.debut)}</span>
          </div>
          <div className={styles.factCard}>
            <span className={styles.factLabel}>Expiration</span>
            <span className={styles.factValue}>{formatDateFr(contrat.expiration)}</span>
            <span className={`${styles.badge} ${validity.className}`}>{validity.label}</span>
          </div>
          {contrat.type ? (
            <div className={styles.factCard}>
              <span className={styles.factLabel}>Type</span>
              <span className={styles.factValue}>{contrat.type}</span>
            </div>
          ) : null}
          {showCredits ? (
            <div className={styles.factCard}>
              <span className={styles.factLabel}>Crédit tickets</span>
              <span className={styles.factValue}>
                {creditTotals.remaining}
                {creditTotals.total > 0 ? ` / ${creditTotals.total}` : ""}
              </span>
              <span className={styles.factHint}>restant{creditTotals.remaining > 1 ? "s" : ""}</span>
            </div>
          ) : null}
        </div>
      </section>

      {sla.enabled ? (
        <section className={infraStyles.section}>
          <div className={infraStyles.sectionHeader}>
            <div className={infraStyles.sectionTitleWrapper}>
              <span className={infraStyles.sectionIcon}>
                <IconifyIcon icon="mdi:timer-outline" width={34} height={34} color="#0f766e" />
              </span>
              <div>
                <h4 className={infraStyles.sectionTitle}>SLA</h4>
                <div className={infraStyles.sectionSubtitle}>Délais de première prise en charge et de résolution</div>
              </div>
            </div>
          </div>
          <div className={infraStyles.sectionTitleSeparator} />
          <table className={styles.slaTable}>
            <thead>
              <tr>
                <th>Priorité</th>
                <th>1re prise en charge</th>
                <th>Résolution</th>
              </tr>
            </thead>
            <tbody>
              {slaRows.map(row => (
                <tr key={row.key}>
                  <td>{row.label}</td>
                  <td>{row.firstResponseHours} h</td>
                  <td>{row.resolutionHours} h</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}

      {showCredits ? (
        <section className={infraStyles.section}>
          <div className={infraStyles.sectionHeader}>
            <div className={infraStyles.sectionTitleWrapper}>
              <span className={infraStyles.sectionIcon}>
                <IconifyIcon icon="mdi:ticket-confirmation-outline" width={34} height={34} color="#0f766e" />
              </span>
              <div>
                <h4 className={infraStyles.sectionTitle}>Crédit tickets</h4>
                <div className={infraStyles.sectionSubtitle}>
                  {creditTotals.remaining} ticket{creditTotals.remaining > 1 ? "s" : ""} restant
                  {creditTotals.remaining > 1 ? "s" : ""}
                  {creditTotals.total > 0 ? ` sur ${creditTotals.total}` : ""}
                </div>
              </div>
            </div>
          </div>
          <div className={infraStyles.sectionTitleSeparator} />
          {visiblePacks.length > 0 ? (
            <ul className={styles.creditList}>
              {visiblePacks.map(pack => {
                const remaining = Number(pack.remaining_amount) || 0;
                const initial = Number(pack.initial_amount) || 0;
                const until = pack.valid_until ? formatDateFr(pack.valid_until) : null;
                return (
                  <li key={pack.id} className={styles.creditItem}>
                    <div>
                      <div className={styles.creditLabel}>{pack.label || "Carnet tickets"}</div>
                      <div className={styles.creditMeta}>
                        {until ? `Valable jusqu’au ${until}` : "Sans date d’expiration"}
                      </div>
                    </div>
                    <span className={`${styles.creditValue} ${remaining <= 0 ? styles.creditValueEmpty : ""}`}>
                      {remaining}/{initial}
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className={styles.state}>
              {creditTotals.remaining} crédit{creditTotals.remaining > 1 ? "s" : ""} restant
              {creditTotals.remaining > 1 ? "s" : ""}
            </div>
          )}
        </section>
      ) : null}
    </div>
  );
}
