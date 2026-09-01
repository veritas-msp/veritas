import React, { useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react";
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
import { MonitoringStepShell, MonitoringStepSection } from "../MonitoringStepLayout";
import { isDateWithinPeriod } from "../supervisionReportBuilder";
import { isSalesTicket } from "../../../../utils/salesTicketUtils";
import { getLocalizedEquipmentTypeLabel } from "../../../TicketPage/ticketEquipmentUtils";
import { computeSupportCreditTotals } from "../../../TicketPage/ticketClientSummaryUtils";
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

const CHANNEL_LABELS = {
  web: "Web",
  phone: "Téléphone",
  email: "Email",
  chat: "Chat",
  api: "API",
  whatsapp: "WhatsApp"
};

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
  return Object.entries(map)
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key, "fr"));
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

function ChartEmpty({ label }) {
  return <p className={styles.supportEmpty}>{label}</p>;
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

function DonutChart({ items, emptyLabel, colors = CHART_PALETTE }) {
  if (!items.length) return <ChartEmpty label={emptyLabel} />;
  const data = toChartData(items);
  const total = data.reduce((sum, d) => sum + d.value, 0);
  return (
    <div className={styles.supportChartBlock}>
      <div className={styles.supportChartCanvas}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius="52%"
              outerRadius="78%"
              paddingAngle={data.length > 1 ? 2 : 0}
              stroke="var(--msp-surface, #fff)"
              strokeWidth={2}
            >
              {data.map((entry, index) => (
                <Cell key={entry.name} fill={colors[index % colors.length]} />
              ))}
            </Pie>
            <RechartsTooltip content={<ChartTooltip />} />
          </PieChart>
        </ResponsiveContainer>
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

function VerticalBarsChart({ items, emptyLabel, color = "#2b5fab" }) {
  if (!items.length) return <ChartEmpty label={emptyLabel} />;
  const data = toChartData(items).slice(0, 8);
  return (
    <div className={styles.supportChartSolo}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 28 }}>
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
          <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "var(--msp-muted, #5c6b82)" }} width={28} />
          <RechartsTooltip content={<ChartTooltip />} />
          <Bar dataKey="value" name="Tickets" fill={color} radius={[6, 6, 0, 0]} maxBarSize={36} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function HorizontalBarsChart({ items, emptyLabel, color = "#6366f1" }) {
  if (!items.length) return <ChartEmpty label={emptyLabel} />;
  const data = toChartData(items).slice(0, 8);
  const height = Math.max(160, data.length * 36 + 24);
  return (
    <div className={styles.supportChartSolo} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, left: 4, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--msp-border, #e2e8f0)" />
          <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: "var(--msp-muted, #5c6b82)" }} />
          <YAxis
            type="category"
            dataKey="name"
            width={88}
            tick={{ fontSize: 11, fill: "var(--msp-muted, #5c6b82)" }}
            tickFormatter={value => (String(value).length > 14 ? `${String(value).slice(0, 13)}…` : value)}
          />
          <RechartsTooltip content={<ChartTooltip />} />
          <Bar dataKey="value" name="Tickets" fill={color} radius={[0, 6, 6, 0]} maxBarSize={18} />
        </BarChart>
      </ResponsiveContainer>
    </div>
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
        return PRIORITY_LABELS[key] || key;
      }),
    [createdInPeriod]
  );

  const byChannel = useMemo(
    () =>
      countMap(createdInPeriod, t => {
        const key = String(t.channel || t.canal || "").toLowerCase();
        return CHANNEL_LABELS[key] || key || "Non renseigné";
      }),
    [createdInPeriod]
  );

  const byEquipmentType = useMemo(
    () =>
      countMap(
        createdInPeriod.filter(t => getTicketEquipmentInfo(t).concerned),
        t => {
          const eq = getTicketEquipmentInfo(t);
          if (eq.source === "external") return "Matériel externe";
          return getLocalizedEquipmentTypeLabel(eq.type, "fr") || eq.type || "Type inconnu";
        }
      ),
    [createdInPeriod]
  );

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
    contrat.type ? { label: "Type", value: contrat.type } : null,
    contrat.debut ? { label: "Début", value: formatDateFr(contrat.debut) } : null,
    { label: "Expiration", value: formatDateFr(contrat.expiration) },
    {
      label: "Crédits consommés",
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
    }
  ].filter(Boolean);

  return (
    <MonitoringStepShell className={styles.supportStepShell}>
      <MonitoringStepSection title="Contrat et crédits">
        <article className={styles.supportContractCard}>
          <div className={styles.supportContractHead}>
            <span className={styles.supportContractIcon}>
              <Icon icon="mdi:file-document-outline" width={18} height={18} />
            </span>
            <div>
              <div className={styles.supportContractTitle}>Contrat support</div>
              <div className={styles.supportContractSubtitle}>{periodLabel}</div>
            </div>
            <span className={`${styles.supportBadge} ${validity.className}`}>{validity.label}</span>
          </div>
          <dl className={styles.supportContractGrid}>
            {contractRows.map(row => (
              <div key={row.label} className={styles.supportContractItem}>
                <dt>{row.label}</dt>
                <dd>
                  <span>{row.value}</span>
                  {row.hint ? <span className={styles.supportContractHint}>{row.hint}</span> : null}
                </dd>
              </div>
            ))}
          </dl>
        </article>
      </MonitoringStepSection>

      {loading ? (
        <div className={styles.supportState}>Chargement des tickets support…</div>
      ) : null}
      {error ? <div className={styles.supportError}>{error}</div> : null}

      <div className={styles.supportBreakdownGrid}>
        <MonitoringStepSection title="Catégories" count={byCategory.length}>
          <VerticalBarsChart items={byCategory} emptyLabel="Aucune catégorie sur cette période." color="#2b5fab" />
        </MonitoringStepSection>
        <MonitoringStepSection title="Types de tickets" count={byType.length}>
          <DonutChart items={byType} emptyLabel="Aucun type renseigné." colors={["#0f766e", "#2b5fab", "#6366f1", "#b45309"]} />
        </MonitoringStepSection>
        <MonitoringStepSection title="Statuts" count={byStatus.length}>
          <HorizontalBarsChart items={byStatus} emptyLabel="Aucun statut." color="#b45309" />
        </MonitoringStepSection>
        <MonitoringStepSection title="Priorités" count={byPriority.length}>
          <DonutChart items={byPriority} emptyLabel="Aucune priorité." colors={["#64748b", "#b45309", "#b91c1c", "#0f766e"]} />
        </MonitoringStepSection>
        <MonitoringStepSection title="Canaux" count={byChannel.length}>
          <VerticalBarsChart items={byChannel} emptyLabel="Aucun canal renseigné." color="#6366f1" />
        </MonitoringStepSection>
        <MonitoringStepSection title="Matériel concerné" count={byEquipmentType.length}>
          <HorizontalBarsChart
            items={byEquipmentType}
            emptyLabel="Aucun ticket lié à du matériel sur cette période."
            color="#2b5fab"
          />
        </MonitoringStepSection>
      </div>

      <MonitoringStepSection title="Tickets de la période" count={createdInPeriod.length}>
        {createdInPeriod.length === 0 && !loading ? (
          <p className={styles.supportEmpty}>Aucun ticket support créé sur cette période.</p>
        ) : (
          <div className={styles.supportTableWrap}>
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
                {createdInPeriod.map(t => {
                  const eq = getTicketEquipmentInfo(t);
                  const typeKey = String(t.type || "").trim().toLowerCase();
                  const statusKey = normalizeStatus(t.status || t.etat);
                  const priorityKey = String(t.priority || t.priorite || "").toLowerCase();
                  const typeLabel = TYPE_LABELS[typeKey === "request" ? "demande" : typeKey] || t.type || "—";
                  const equipmentLabel = eq.concerned
                    ? [eq.source === "external" ? "Externe" : getLocalizedEquipmentTypeLabel(eq.type, "fr") || eq.type, eq.name]
                        .filter(Boolean)
                        .join(" · ")
                    : "—";
                  return (
                    <tr key={t.id || t.uuid || ticketCreatedAt(t)}>
                      <td>{t.ticket_number || t.ticketNumber || t.reference || t.ref || "—"}</td>
                      <td>{t.title || t.subject || t.sujet || "—"}</td>
                      <td>{categoryLabel(t.category)}</td>
                      <td>{typeLabel}</td>
                      <td>{STATUS_LABELS[statusKey] || t.status || "—"}</td>
                      <td>{PRIORITY_LABELS[priorityKey] || t.priority || "—"}</td>
                      <td>{equipmentLabel}</td>
                      <td>{formatDateTime(ticketCreatedAt(t))}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </MonitoringStepSection>
    </MonitoringStepShell>
  );
}
