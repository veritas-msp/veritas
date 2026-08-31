import React, { useEffect, useMemo, useState } from "react";
import { Icon as IconifyIcon } from "@iconify/react";
import { fetchTickets, fetchTicketCategories } from "../../../../api/tickets";
import { fetchClientSupportCredits } from "../../../../api/clients";
import { isDateWithinPeriod } from "../supervisionReportBuilder";
import { isSalesTicket } from "../../../../utils/salesTicketUtils";
import { computeSupportCreditTotals } from "../../../TicketPage/ticketClientSummaryUtils";
import { formatClientSlaRows, getTicketSlaDisplay, parseClientSla, SLA_PRIORITY_LABELS } from "../../../../utils/ticketSlaUtils";
import { getLocalizedEquipmentTypeLabel } from "../../../TicketPage/ticketEquipmentUtils";
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

const TYPE_LABELS = {
  incident: "Incident",
  demande: "Demande",
  request: "Demande",
  probleme: "Problème",
  changement: "Changement"
};

function percent(part, total) {
  if (!total) return 0;
  return Math.round((part / total) * 100);
}

function countMap(items, keyFn) {
  const map = {};
  items.forEach(item => {
    const key = keyFn(item);
    if (!key) return;
    map[key] = (map[key] || 0) + 1;
  });
  return Object.entries(map)
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key, "fr"));
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

function BreakdownList({ title, items, total }) {
  if (!items.length) return null;
  const max = Math.max(...items.map(item => item.count), 1);
  return (
    <div className={styles.breakdownCard}>
      <h5 className={styles.breakdownTitle}>{title}</h5>
      <ul className={styles.breakdownList}>
        {items.map(item => (
          <li key={item.key} className={styles.breakdownRow}>
            <span className={styles.breakdownLabel} title={item.key}>{item.key}</span>
            <span className={styles.breakdownTrack}>
              <span className={styles.breakdownFill} style={{ width: `${(item.count / max) * 100}%` }} />
            </span>
            <span className={styles.breakdownCount}>
              {item.count}
              {total > 0 ? <span className={styles.breakdownPct}> {percent(item.count, total)}%</span> : null}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function formatDateFr(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString("fr-FR");
}

function creditsConsumedInPeriod(ledger = [], start, end) {
  if (!Array.isArray(ledger) || !ledger.length) return 0;
  return ledger.reduce((sum, entry) => {
    const kind = String(entry?.kind || "").toLowerCase();
    if (kind !== "debit") return sum;
    if (!isDateWithinPeriod(entry?.created_at || entry?.createdAt, start, end)) return sum;
    const delta = Number(entry?.delta);
    if (!Number.isFinite(delta)) return sum;
    return sum + Math.abs(delta);
  }, 0);
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
  const [categoryNames, setCategoryNames] = useState({});
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
        const [ticketRows, creditSummary, categories] = await Promise.all([
          fetchClientTickets(clientId, controller.signal).catch(() => []),
          fetchClientSupportCredits(clientId, { signal: controller.signal }).catch(() => null),
          fetchTicketCategories({ signal: controller.signal }).catch(() => [])
        ]);
        if (cancelled || controller.signal.aborted) return;
        setTickets(Array.isArray(ticketRows) ? ticketRows.filter(t => !isSalesTicket(t)) : []);
        setCredits(creditSummary);
        const names = {};
        (Array.isArray(categories) ? categories : []).forEach(cat => {
          const id = String(cat?.id || "").trim();
          const name = String(cat?.name || "").trim();
          if (id && name) names[id] = name;
        });
        setCategoryNames(names);
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

  const categoryLabel = category => {
    const raw = String(category || "").trim();
    if (!raw) return "Non catégorisé";
    return categoryNames[raw] || raw;
  };

  const treatedCount = createdInPeriod.filter(t => isClosedStatus(t.status || t.etat)).length;
  const withEquipment = createdInPeriod.filter(t => getTicketEquipmentInfo(t).concerned);
  const uniqueEquipment = new Set();
  withEquipment.forEach(t => {
    const eq = getTicketEquipmentInfo(t);
    uniqueEquipment.add(eq.equipmentId || `${eq.source}:${eq.name}:${eq.serial || ""}`);
  });
  const highPriorityCount = createdInPeriod.filter(t => {
    const p = String(t.priority || t.priorite || "").toLowerCase();
    return p === "high" || p === "urgent";
  }).length;

  const byCategory = useMemo(
    () => countMap(createdInPeriod, t => categoryLabel(t.category)),
    [createdInPeriod, categoryNames]
  );
  const byType = useMemo(
    () =>
      countMap(createdInPeriod, t => {
        const raw = String(t.type || "").trim().toLowerCase();
        const key = raw === "request" ? "demande" : raw;
        return TYPE_LABELS[key] || key || "Non renseigné";
      }),
    [createdInPeriod]
  );
  const byStatus = useMemo(
    () =>
      countMap(createdInPeriod, t => {
        const key = normalizeStatus(t.status || t.etat || "autre");
        return STATUS_LABELS[key] || key;
      }),
    [createdInPeriod]
  );
  const byPriority = useMemo(
    () =>
      countMap(createdInPeriod, t => {
        const key = String(t.priority || t.priorite || "normal").toLowerCase();
        return SLA_PRIORITY_LABELS[key] || key;
      }),
    [createdInPeriod]
  );
  const byEquipmentType = useMemo(
    () =>
      countMap(withEquipment, t => {
        const eq = getTicketEquipmentInfo(t);
        if (eq.source === "external") return "Matériel externe";
        return getLocalizedEquipmentTypeLabel(eq.type, "fr") || eq.type || "Type inconnu";
      }),
    [createdInPeriod]
  );

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
  const consumedOnPeriod = creditsConsumedInPeriod(credits?.ledger, start, end);
  const consumedAllTime = Math.max(0, (Number(creditTotals.total) || 0) - (Number(creditTotals.remaining) || 0));
  const visiblePacks = packs.filter(pack => ["active", "upcoming", "depleted"].includes(String(pack.status || "")));
  const showCredits = Boolean(credits) && (creditTotals.remaining > 0 || visiblePacks.length > 0 || consumedOnPeriod > 0);

  const contrat = client?.contrat && typeof client.contrat === "object" ? client.contrat : {};
  const validity = contractTone(contrat);
  const periodLabel = start && end ? `${formatDateFr(start)} → ${formatDateFr(end)}` : "Période non définie";
  const total = createdInPeriod.length;

  const kpiItems = [
    { label: "Créés", value: total, icon: "mdi:ticket-outline", iconColor: "#0f766e" },
    {
      label: "Traités / total",
      value: `${treatedCount} / ${total}`,
      hint: total ? `${percent(treatedCount, total)} % clôturés` : "Aucun ticket",
      icon: "mdi:check-circle-outline",
      iconColor: "#047857"
    },
    { label: "Encore ouverts", value: createdInPeriod.length - treatedCount, icon: "mdi:progress-clock", iconColor: "#b45309" },
    { label: "Clôturés sur la période", value: resolvedInPeriod.length, hint: "Y compris créés avant", icon: "mdi:archive-check-outline", iconColor: "#1d4ed8" },
    {
      label: "Liés à du matériel",
      value: withEquipment.length,
      hint: total ? `${percent(withEquipment.length, total)} % · ${uniqueEquipment.size} équipement${uniqueEquipment.size > 1 ? "s" : ""}` : "Aucun ticket",
      icon: "mdi:server-network",
      iconColor: "#2b5fab"
    },
    { label: "Sans matériel", value: total - withEquipment.length, icon: "mdi:server-off", iconColor: "#64748b" },
    { label: "Priorité haute", value: highPriorityCount, icon: "mdi:alert-circle-outline", iconColor: "#b91c1c" },
    slaStats
      ? {
          label: "SLA respectés",
          value: slaStats.tracked > 0 ? `${slaStats.met}/${slaStats.tracked}` : "—",
          hint: slaStats.breached > 0 ? `${slaStats.breached} dépassé${slaStats.breached > 1 ? "s" : ""}` : "Aucun dépassement",
          icon: "mdi:timer-check-outline",
          iconColor: slaStats.breached > 0 ? "#b91c1c" : "#047857"
        }
      : {
          label: "Ouverts (tous)",
          value: openNow.length,
          hint: "Hors période, encore ouverts",
          icon: "mdi:folder-open-outline",
          iconColor: "#b45309"
        }
  ];

  const ticketRows = createdInPeriod.map(t => {
    const slaView = sla.enabled ? getTicketSlaDisplay(t, { clientContrat: client?.contrat }) : null;
    const eq = getTicketEquipmentInfo(t);
    const typeKey = String(t.type || "").trim().toLowerCase();
    const equipmentLabel = eq.concerned
      ? [eq.source === "external" ? "Externe" : getLocalizedEquipmentTypeLabel(eq.type, "fr") || eq.type, eq.name]
          .filter(Boolean)
          .join(" · ")
      : "—";
    return {
      _rowKey: t.id || t.uuid || ticketCreatedAt(t),
      ref: t.ticket_number || t.ticketNumber || t.reference || t.ref || "—",
      subject: t.title || t.subject || t.sujet || "—",
      category: categoryLabel(t.category),
      type: TYPE_LABELS[typeKey === "request" ? "demande" : typeKey] || t.type || "—",
      status: STATUS_LABELS[normalizeStatus(t.status || t.etat)] || t.status || "—",
      priority: SLA_PRIORITY_LABELS[String(t.priority || "").toLowerCase()] || t.priority || "—",
      equipment: equipmentLabel,
      created: formatDateFr(ticketCreatedAt(t)),
      sla: slaView && slaView.label && slaView.label !== "-" ? slaView.label : "—"
    };
  });

  const ticketColumns = [
    { id: "ref", label: "Réf." },
    { id: "subject", label: "Sujet" },
    { id: "category", label: "Catégorie" },
    { id: "type", label: "Type" },
    { id: "priority", label: "Priorité" },
    { id: "status", label: "Statut" },
    { id: "equipment", label: "Matériel" },
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
        <div className={styles.breakdownGrid}>
          <BreakdownList title="Catégories" items={byCategory} total={total} />
          <BreakdownList title="Types" items={byType} total={total} />
          <BreakdownList title="Statuts" items={byStatus} total={total} />
          <BreakdownList title="Priorités" items={byPriority} total={total} />
          <BreakdownList title="Matériel concerné" items={byEquipmentType} total={withEquipment.length} />
        </div>
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
          <div className={styles.factCard}>
            <span className={styles.factLabel}>Crédits consommés</span>
            <span className={styles.factValue}>{consumedOnPeriod}</span>
            <span className={styles.factHint}>{periodLabel}</span>
          </div>
          <div className={styles.factCard}>
            <span className={styles.factLabel}>Crédits restants</span>
            <span className={styles.factValue}>
              {showCredits || creditTotals.remaining > 0 || creditTotals.total > 0 ? creditTotals.remaining : "—"}
              {creditTotals.total > 0 ? ` / ${creditTotals.total}` : ""}
            </span>
            <span className={styles.factHint}>
              {consumedAllTime > 0 ? `${consumedAllTime} consommés au global` : "restant"}
            </span>
          </div>
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
