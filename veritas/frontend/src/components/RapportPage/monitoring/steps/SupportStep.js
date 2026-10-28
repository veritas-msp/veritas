import React, { useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  CartesianGrid
} from "recharts";
import { fetchTickets, fetchTicketCategories } from "../../../../api/tickets";
import { fetchClientSupportCredits } from "../../../../api/clients";
import {
  MonitoringStepShell,
  MonitoringPagedBlock,
  MonitoringStepTableWrap,
  MonitoringStepSearchBar,
  MonitoringTextCell
} from "../MonitoringStepLayout";
import { isDateWithinPeriod } from "../supervisionReportBuilder";
import { isSalesTicket } from "../../../../utils/salesTicketUtils";
import { getLocalizedEquipmentTypeLabel } from "../../../TicketPage/ticketEquipmentUtils";
import { computeSupportCreditTotals } from "../../../TicketPage/ticketClientSummaryUtils";
import equipmentStyles from "../../../EquipementPage/EquipmentPage.module.css";
import styles from "../RapportMonitoringBuilder.module.css";

const CHART_PALETTE = ["#2b5fab", "#0f766e", "#b45309", "#b91c1c", "#6366f1", "#0891b2", "#7c3aed", "#64748b"];

const CHART_TOOLTIP_STYLE = {
  background: "var(--msp-surface, #fff)",
  border: "1px solid var(--msp-border, #c5d0df)",
  borderRadius: 8,
  fontSize: 12
};

const STATUS_LABELS = {
  new: "Nouveau",
  open: "Nouveau",
  pending: "En attente",
  in_progress: "En cours",
  resolved: "Résolu",
  closed: "Clôturé"
};

const PRIORITY_ORDER = ["urgent", "high", "normal", "low"];
const PRIORITY_LABELS = {
  urgent: "Urgente",
  high: "Haute",
  normal: "Normale",
  low: "Basse"
};

/** Types ITIL support (alignés TicketPage) */
const TYPE_ORDER = ["incident", "demande", "probleme", "changement"];
const TYPE_LABELS = {
  incident: "Incident",
  demande: "Demande",
  request: "Demande",
  probleme: "Problème",
  changement: "Changement"
};

const TYPE_COLORS = ["#b91c1c", "#2b5fab", "#b45309", "#0f766e"];
const PRIORITY_COLORS = ["#b91c1c", "#b45309", "#64748b", "#0f766e"];

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

function formatDateFr(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString("fr-FR");
}

function ticketCreatedAt(ticket) {
  return ticket?.created_at || ticket?.createdAt || ticket?.date_creation || null;
}

function normalizeStatus(status) {
  const value = String(status || "").toLowerCase();
  if (value === "open") return "new";
  return value;
}

function normalizeTypeKey(type) {
  const raw = String(type || "").trim().toLowerCase();
  if (raw === "request") return "demande";
  return raw;
}

function typeLabel(type) {
  const key = normalizeTypeKey(type);
  return TYPE_LABELS[key] || key || "Non renseigné";
}

function priorityLabel(priority) {
  const key = String(priority || "normal").toLowerCase();
  return PRIORITY_LABELS[key] || key || "Normale";
}

function parseTicketList(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.tickets)) return payload.tickets;
  return [];
}

async function fetchClientTickets(clientId, signal) {
  const all = [];
  const pageSize = 200;
  for (let offset = 0; offset < 800; offset += pageSize) {
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

function countMap(items, keyFn) {
  const map = {};
  items.forEach(item => {
    const key = keyFn(item);
    if (!key) return;
    map[key] = (map[key] || 0) + 1;
  });
  return map;
}

function mapToSortedList(map) {
  return Object.entries(map)
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key, "fr"));
}

function ensureSeries(map, order, labelFn) {
  return order.map(key => ({
    key: labelFn(key),
    count: Number(map[key] || 0)
  }));
}

function percent(part, total) {
  if (!total) return 0;
  return Math.round((part / total) * 100);
}

function parseClientContrat(raw) {
  if (!raw) return {};
  if (typeof raw === "object") return raw;
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      return {};
    }
  }
  return {};
}

function contractTone(contrat = {}) {
  if (contrat.suspendu) {
    return { label: "Suspendu", className: styles.supportBadgeWarn };
  }
  const end = contrat.expiration ? new Date(contrat.expiration) : null;
  if (!end || Number.isNaN(end.getTime())) {
    return { label: "Non renseigné", className: styles.supportBadgeMuted };
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  if (end < today) return { label: "Expiré", className: styles.supportBadgeDanger };
  const days = Math.ceil((end - today) / (1000 * 60 * 60 * 24));
  if (days <= 30) return { label: `Expire dans ${days} j`, className: styles.supportBadgeWarn };
  return { label: "Actif", className: styles.supportBadgeOk };
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

function toChartData(items) {
  return items.map(item => ({ name: item.key, value: item.count }));
}

function ChartTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const row = payload[0];
  const name = row?.name ?? row?.payload?.name ?? "";
  const value = row?.value ?? 0;
  return (
    <div style={CHART_TOOLTIP_STYLE}>
      <div style={{ padding: "0.35rem 0.55rem" }}>
        <strong>{name}</strong>
        <div>{value}</div>
      </div>
    </div>
  );
}

function DonutChart({ items, colors = CHART_PALETTE }) {
  const data = toChartData(items);
  const total = data.reduce((sum, d) => sum + d.value, 0);
  const displayData = total > 0 ? data : [{ name: "Aucun", value: 1 }];
  const displayColors = total > 0 ? colors : ["#e2e8f0"];

  return (
    <div className={styles.supportChartBlock}>
      <div className={styles.supportChartCanvas}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={displayData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius="52%"
              outerRadius="78%"
              paddingAngle={displayData.length > 1 && total > 0 ? 2 : 0}
              stroke="var(--msp-surface, #fff)"
              strokeWidth={2}
            >
              {displayData.map((entry, index) => (
                <Cell key={entry.name} fill={displayColors[index % displayColors.length]} />
              ))}
            </Pie>
            {total > 0 ? <RechartsTooltip content={<ChartTooltip />} /> : null}
          </PieChart>
        </ResponsiveContainer>
        <div className={styles.supportChartCenter}>
          <span className={styles.supportChartCenterValue}>{total}</span>
          <span className={styles.supportChartCenterLabel}>tickets</span>
        </div>
      </div>
      <ul className={styles.supportChartLegend}>
        {data.map((entry, index) => (
          <li key={entry.name}>
            <span className={styles.supportChartSwatch} style={{ background: colors[index % colors.length] }} />
            <span className={styles.supportChartLegendLabel} title={entry.name}>{entry.name}</span>
            <span className={styles.supportChartLegendValue}>
              {entry.value}
              {total > 0 ? <span className={styles.supportBarPct}> {percent(entry.value, total)}%</span> : null}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function VerticalBarsChart({ items, color = "#2b5fab" }) {
  const data = toChartData(items).slice(0, 8);
  const chartData = data.length ? data : [{ name: "—", value: 0 }];
  return (
    <div className={styles.supportChartSolo}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 8, right: 8, left: -8, bottom: 28 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--msp-border, #e2e8f0)" />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 11, fill: "var(--msp-muted, #5c6b82)" }}
            interval={0}
            angle={-28}
            textAnchor="end"
            height={48}
            tickFormatter={value => (String(value).length > 12 ? `${String(value).slice(0, 11)}…` : value)}
          />
          <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "var(--msp-muted, #5c6b82)" }} width={28} domain={[0, "auto"]} />
          <RechartsTooltip content={<ChartTooltip />} />
          <Bar dataKey="value" name="Tickets" fill={color} radius={[6, 6, 0, 0]} maxBarSize={36} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function HorizontalBarsChart({ items, color = "#6366f1" }) {
  const data = toChartData(items).slice(0, 8);
  const chartData = data.length ? data : [{ name: "Aucun", value: 0 }];
  return (
    <div className={styles.supportChartSolo}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} layout="vertical" margin={{ top: 4, right: 16, left: 4, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--msp-border, #e2e8f0)" />
          <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: "var(--msp-muted, #5c6b82)" }} domain={[0, "auto"]} />
          <YAxis
            type="category"
            dataKey="name"
            width={88}
            tick={{ fontSize: 11, fill: "var(--msp-muted, #5c6b82)" }}
            tickFormatter={value => (String(value).length > 14 ? `${String(value).slice(0, 13)}…` : value)}
          />
          <RechartsTooltip content={<ChartTooltip />} />
          <Bar dataKey="value" name="Tickets" fill={color} radius={[0, 6, 6, 0]} maxBarSize={22} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function SupportBlock({ title, count = null, children, className = "" }) {
  return (
    <section className={`${styles.supportBlock} ${className}`.trim()}>
      <header className={styles.supportBlockHead}>
        <h4 className={styles.supportBlockTitle}>
          {title}
          {count != null ? <span className={styles.supportBlockCount}>{count}</span> : null}
        </h4>
      </header>
      <div className={styles.supportBlockBody}>{children}</div>
    </section>
  );
}

export default function SupportStep({ client, reportPeriod = {} }) {
  const clientId = client?.id ?? client?.uuid;
  const start = reportPeriod.start || client?.reportStartDate;
  const end = reportPeriod.end || client?.reportEndDate;
  const [tickets, setTickets] = useState([]);
  const [categoryNames, setCategoryNames] = useState({});
  const [credits, setCredits] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [ticketSearch, setTicketSearch] = useState("");

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
        const [ticketRows, categories, creditSummary] = await Promise.all([
          fetchClientTickets(clientId, controller.signal),
          fetchTicketCategories({ signal: controller.signal }).catch(() => []),
          fetchClientSupportCredits(clientId, { signal: controller.signal }).catch(() => null)
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
        setError(err?.message || "Impossible de charger les tickets support.");
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

  const categoryLabel = category => {
    const raw = String(category || "").trim();
    if (!raw) return "Non catégorisé";
    return categoryNames[raw] || raw;
  };

  const byCategory = useMemo(() => {
    const map = countMap(createdInPeriod, t => categoryLabel(t.category));
    const list = mapToSortedList(map);
    return list.length ? list : [{ key: "Non catégorisé", count: 0 }];
  }, [createdInPeriod, categoryNames]);

  const byType = useMemo(() => {
    const map = {};
    createdInPeriod.forEach(t => {
      const key = normalizeTypeKey(t.type);
      if (!TYPE_ORDER.includes(key)) {
        map._other = (map._other || 0) + 1;
        return;
      }
      map[key] = (map[key] || 0) + 1;
    });
    const series = ensureSeries(map, TYPE_ORDER, k => TYPE_LABELS[k]);
    if (map._other) series.push({ key: "Autre", count: map._other });
    return series;
  }, [createdInPeriod]);

  const byPriority = useMemo(() => {
    const map = {};
    createdInPeriod.forEach(t => {
      let key = String(t.priority || t.priorite || "normal").toLowerCase();
      if (!PRIORITY_ORDER.includes(key)) key = "normal";
      map[key] = (map[key] || 0) + 1;
    });
    return ensureSeries(map, PRIORITY_ORDER, k => PRIORITY_LABELS[k]);
  }, [createdInPeriod]);

  const byEquipmentType = useMemo(() => {
    const withEq = createdInPeriod.filter(t => getTicketEquipmentInfo(t).concerned);
    const map = countMap(withEq, t => {
      const eq = getTicketEquipmentInfo(t);
      if (eq.source === "external") return "Matériel externe";
      return getLocalizedEquipmentTypeLabel(eq.type, "fr") || eq.type || "Type inconnu";
    });
    const list = mapToSortedList(map);
    return list.length ? list : [{ key: "Aucun matériel", count: 0 }];
  }, [createdInPeriod]);

  const filteredTickets = useMemo(() => {
    const q = ticketSearch.trim().toLowerCase();
    if (!q) return createdInPeriod;
    return createdInPeriod.filter(t => {
      const eq = getTicketEquipmentInfo(t);
      const statusKey = normalizeStatus(t.status || t.etat);
      const haystack = [
        t.ticket_number,
        t.ticketNumber,
        t.reference,
        t.ref,
        t.title,
        t.subject,
        t.sujet,
        categoryLabel(t.category),
        typeLabel(t.type),
        STATUS_LABELS[statusKey] || t.status,
        priorityLabel(t.priority || t.priorite),
        eq.concerned ? eq.name : "",
        eq.concerned ? eq.type : ""
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [createdInPeriod, ticketSearch, categoryNames]);

  const periodLabel =
    start && end ? `${formatDateFr(start)} → ${formatDateFr(end)}` : "Période non définie";

  const contrat = parseClientContrat(client?.contrat);
  const validity = contractTone(contrat);
  const packs = Array.isArray(credits?.packs) ? credits.packs : [];
  const creditTotals = computeSupportCreditTotals(credits?.balance, packs);
  const consumedOnPeriod = creditsConsumedInPeriod(credits?.ledger, start, end);
  const consumedAllTime = Math.max(0, (Number(creditTotals.total) || 0) - (Number(creditTotals.remaining) || 0));
  const hasCreditData = Boolean(credits) && (creditTotals.total > 0 || creditTotals.remaining > 0 || consumedOnPeriod > 0 || packs.length > 0);

  const contractRows = [
    { label: "Type", value: contrat.type || "—" },
    { label: "Début", value: formatDateFr(contrat.debut) },
    { label: "Expiration", value: formatDateFr(contrat.expiration) },
    { label: "Statut", value: validity.label, badge: validity.className },
    {
      label: "Crédits période",
      value: hasCreditData ? String(consumedOnPeriod) : "—",
      hint: periodLabel
    },
    {
      label: "Crédits restants",
      value: hasCreditData ? String(creditTotals.remaining) : "—",
      hint: hasCreditData && creditTotals.total > 0 ? `sur ${creditTotals.total}` : null
    },
    {
      label: "Total crédits",
      value: hasCreditData ? String(creditTotals.total) : "—",
      hint: hasCreditData && consumedAllTime > 0 ? `${consumedAllTime} consommés au global` : null
    },
    {
      label: "Tickets période",
      value: String(createdInPeriod.length)
    }
  ];

  return (
    <MonitoringStepShell className={styles.supportStepShell}>
      <SupportBlock title="Contrat et crédits">
        <dl className={styles.supportContractGrid}>
          {contractRows.map(row => (
            <div key={row.label} className={styles.supportContractItem}>
              <dt>{row.label}</dt>
              <dd>
                {row.badge ? (
                  <span className={`${styles.supportBadge} ${row.badge}`}>{row.value}</span>
                ) : (
                  <span>{row.value}</span>
                )}
                {row.hint ? <span className={styles.supportContractHint}>{row.hint}</span> : null}
              </dd>
            </div>
          ))}
        </dl>
      </SupportBlock>

      {loading ? <div className={styles.supportState}>Chargement des tickets support…</div> : null}
      {error ? <div className={styles.supportError}>{error}</div> : null}

      <div className={styles.supportStatsGrid}>
        <SupportBlock title="Type de ticket" count={createdInPeriod.length}>
          <DonutChart items={byType} colors={TYPE_COLORS} />
        </SupportBlock>
        <SupportBlock title="Priorité" count={createdInPeriod.length}>
          <DonutChart items={byPriority} colors={PRIORITY_COLORS} />
        </SupportBlock>
        <SupportBlock title="Catégories" count={createdInPeriod.length}>
          <VerticalBarsChart items={byCategory} color="#2b5fab" />
        </SupportBlock>
        <SupportBlock title="Matériel concerné" count={byEquipmentType.reduce((s, i) => s + i.count, 0)}>
          <HorizontalBarsChart items={byEquipmentType} color="#2b5fab" />
        </SupportBlock>
      </div>

      <SupportBlock
        title="Tickets de la période"
        count={filteredTickets.length}
        className={`${styles.supportTicketsSection} ${styles.stepSectionFill}`}
      >
        <div className={styles.supportTableStack}>
          <MonitoringStepSearchBar
            value={ticketSearch}
            onChange={setTicketSearch}
            onClear={() => setTicketSearch("")}
          />
          <div className={styles.supportPagedFill}>
            <MonitoringPagedBlock
              items={filteredTickets}
              resetDeps={[filteredTickets.length, ticketSearch]}
              initialPageSize={25}
            >
              {pageItems => {
                const ticketColumns = ["Réf.", "Sujet", "Catégorie", "Type", "Statut", "Priorité", "Matériel", "Créé"];
                const emptyLabel = ticketSearch.trim()
                  ? "Aucun ticket ne correspond à la recherche."
                  : "Aucun ticket support créé sur cette période.";
                return (
                  <MonitoringStepTableWrap
                    scrollable
                    fill
                    deps={[pageItems.length, ticketSearch, filteredTickets.length]}
                  >
                    {pageItems.length === 0 ? (
                      <div className={styles.supportTicketsEmptyHost}>
                        <table className={equipmentStyles.equipmentTableEmbedded}>
                          <thead>
                            <tr>
                              {ticketColumns.map(label => (
                                <th key={label}>
                                  <span className={equipmentStyles.thContent}>{label}</span>
                                </th>
                              ))}
                            </tr>
                          </thead>
                        </table>
                        <div className={styles.supportTicketsEmpty} role="status">
                          {emptyLabel}
                        </div>
                      </div>
                    ) : (
                      <table className={equipmentStyles.equipmentTableEmbedded}>
                        <thead>
                          <tr>
                            {ticketColumns.map(label => (
                              <th key={label}>
                                <span className={equipmentStyles.thContent}>{label}</span>
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {pageItems.map(t => {
                            const eq = getTicketEquipmentInfo(t);
                            const statusKey = normalizeStatus(t.status || t.etat);
                            const equipmentLabel = eq.concerned
                              ? [
                                  eq.source === "external"
                                    ? "Externe"
                                    : getLocalizedEquipmentTypeLabel(eq.type, "fr") || eq.type,
                                  eq.name
                                ]
                                  .filter(Boolean)
                                  .join(" · ")
                              : "—";
                            return (
                              <tr
                                key={t.id || t.uuid || ticketCreatedAt(t)}
                                className={`${equipmentStyles.equipmentRow} ${equipmentStyles.equipmentRowEmbedded}`}
                              >
                                <MonitoringTextCell>
                                  {t.ticket_number || t.ticketNumber || t.reference || t.ref || "—"}
                                </MonitoringTextCell>
                                <MonitoringTextCell>{t.title || t.subject || t.sujet || "—"}</MonitoringTextCell>
                                <MonitoringTextCell>{categoryLabel(t.category)}</MonitoringTextCell>
                                <MonitoringTextCell>{typeLabel(t.type)}</MonitoringTextCell>
                                <MonitoringTextCell>{STATUS_LABELS[statusKey] || t.status || "—"}</MonitoringTextCell>
                                <MonitoringTextCell>{priorityLabel(t.priority || t.priorite)}</MonitoringTextCell>
                                <MonitoringTextCell>{equipmentLabel}</MonitoringTextCell>
                                <MonitoringTextCell>{formatDateTime(ticketCreatedAt(t))}</MonitoringTextCell>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                  </MonitoringStepTableWrap>
                );
              }}
            </MonitoringPagedBlock>
          </div>
        </div>
      </SupportBlock>
    </MonitoringStepShell>
  );
}
