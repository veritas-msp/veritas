import React, { useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import { fetchTickets, fetchTicketCategories } from "../../../../api/tickets";
import { MonitoringStepShell, MonitoringStepSection } from "../MonitoringStepLayout";
import { isDateWithinPeriod } from "../supervisionReportBuilder";
import { isSalesTicket } from "../../../../utils/salesTicketUtils";
import { getLocalizedEquipmentTypeLabel } from "../../../TicketPage/ticketEquipmentUtils";
import styles from "../RapportMonitoringBuilder.module.css";

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

function BreakdownBars({ items, total, emptyLabel, color = "#2b5fab" }) {
  if (!items.length) {
    return <p className={styles.supportEmpty}>{emptyLabel}</p>;
  }
  const max = Math.max(...items.map(item => item.count), 1);
  return (
    <ul className={styles.supportBarList}>
      {items.map(item => (
        <li key={item.key} className={styles.supportBarRow}>
          <span className={styles.supportBarLabel} title={item.key}>{item.key}</span>
          <span className={styles.supportBarTrack}>
            <span
              className={styles.supportBarFill}
              style={{ width: `${(item.count / max) * 100}%`, background: color }}
            />
          </span>
          <span className={styles.supportBarCount}>
            {item.count}
            {total > 0 ? <span className={styles.supportBarPct}> {percent(item.count, total)}%</span> : null}
          </span>
        </li>
      ))}
    </ul>
  );
}

export default function SupportStep({ client, reportPeriod = {} }) {
  const clientId = client?.id ?? client?.uuid;
  const start = reportPeriod.start || client?.reportStartDate;
  const end = reportPeriod.end || client?.reportEndDate;
  const [tickets, setTickets] = useState([]);
  const [categoryNames, setCategoryNames] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!clientId) {
      setTickets([]);
      return undefined;
    }
    const controller = new AbortController();
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [ticketRows, categories] = await Promise.all([
          fetchClientTickets(clientId, controller.signal),
          fetchTicketCategories({ signal: controller.signal }).catch(() => [])
        ]);
        if (cancelled || controller.signal.aborted) return;
        setTickets(Array.isArray(ticketRows) ? ticketRows.filter(t => !isSalesTicket(t)) : []);
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

  const stats = useMemo(() => {
    const total = createdInPeriod.length;
    const treated = createdInPeriod.filter(t => isClosedStatus(t.status || t.etat));
    const open = createdInPeriod.filter(t => !isClosedStatus(t.status || t.etat));
    const withEquipment = createdInPeriod.filter(t => getTicketEquipmentInfo(t).concerned);
    const withoutEquipment = total - withEquipment.length;
    const highPriority = createdInPeriod.filter(t => {
      const p = String(t.priority || t.priorite || "").toLowerCase();
      return p === "high" || p === "urgent";
    });
    const majors = createdInPeriod.filter(t => t.is_major_incident || t.isMajorIncident);
    const uniqueEquipment = new Set();
    withEquipment.forEach(t => {
      const eq = getTicketEquipmentInfo(t);
      uniqueEquipment.add(eq.equipmentId || `${eq.source}:${eq.name}:${eq.serial || ""}`);
    });
    return {
      total,
      treatedCount: treated.length,
      treatedRate: percent(treated.length, total),
      openCount: open.length,
      withEquipmentCount: withEquipment.length,
      withoutEquipmentCount: withoutEquipment,
      equipmentRate: percent(withEquipment.length, total),
      uniqueEquipmentCount: uniqueEquipment.size,
      highPriorityCount: highPriority.length,
      majorCount: majors.length
    };
  }, [createdInPeriod]);

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

  const kpiCards = [
    {
      key: "created",
      label: "Tickets créés",
      value: stats.total,
      hint: periodLabel,
      icon: "mdi:ticket-outline",
      color: "#0f766e"
    },
    {
      key: "treated",
      label: "Traités / total",
      value: `${stats.treatedCount} / ${stats.total}`,
      hint: stats.total ? `${stats.treatedRate} % clôturés` : "Aucun ticket",
      icon: "mdi:check-circle-outline",
      color: "#047857"
    },
    {
      key: "open",
      label: "Encore ouverts",
      value: stats.openCount,
      hint: "Créés sur la période, non clôturés",
      icon: "mdi:progress-clock",
      color: "#b45309"
    },
    {
      key: "resolved",
      label: "Clôturés sur la période",
      value: resolvedInPeriod.length,
      hint: "Y compris créés avant la période",
      icon: "mdi:archive-check-outline",
      color: "#1d4ed8"
    },
    {
      key: "hardware",
      label: "Liés à du matériel",
      value: stats.withEquipmentCount,
      hint: stats.total
        ? `${stats.equipmentRate} % · ${stats.uniqueEquipmentCount} équipement${stats.uniqueEquipmentCount > 1 ? "s" : ""}`
        : "Aucun ticket",
      icon: "mdi:server-network",
      color: "#2b5fab"
    },
    {
      key: "no-hardware",
      label: "Sans matériel",
      value: stats.withoutEquipmentCount,
      hint: "Aucun équipement rattaché",
      icon: "mdi:server-off",
      color: "#64748b"
    },
    {
      key: "priority",
      label: "Priorité haute",
      value: stats.highPriorityCount,
      hint: stats.majorCount > 0 ? `${stats.majorCount} incident${stats.majorCount > 1 ? "s" : ""} majeur${stats.majorCount > 1 ? "s" : ""}` : "Urgente ou haute",
      icon: "mdi:alert-circle-outline",
      color: "#b91c1c"
    }
  ];

  return (
    <MonitoringStepShell>
      <p className={styles.supportIntro}>
        Activité support sur la période {periodLabel} : volume, traitement, catégories ITIL et tickets liés à un matériel.
      </p>
      {loading ? (
        <div className={styles.supportState}>Chargement des tickets support…</div>
      ) : null}
      {error ? <div className={styles.supportError}>{error}</div> : null}

      <div className={styles.supportKpiGrid}>
        {kpiCards.map(card => (
          <article key={card.key} className={styles.supportKpiCard}>
            <span className={styles.supportKpiIcon} style={{ color: card.color }}>
              <Icon icon={card.icon} width={20} height={20} />
            </span>
            <div className={styles.supportKpiContent}>
              <div className={styles.supportKpiValue}>{card.value}</div>
              <div className={styles.supportKpiLabel}>{card.label}</div>
              {card.hint ? <div className={styles.supportKpiHint}>{card.hint}</div> : null}
            </div>
          </article>
        ))}
      </div>

      <div className={styles.supportBreakdownGrid}>
        <MonitoringStepSection title="Catégories" count={byCategory.length}>
          <BreakdownBars items={byCategory} total={stats.total} emptyLabel="Aucune catégorie sur cette période." />
        </MonitoringStepSection>
        <MonitoringStepSection title="Types de tickets" count={byType.length}>
          <BreakdownBars items={byType} total={stats.total} emptyLabel="Aucun type renseigné." color="#0f766e" />
        </MonitoringStepSection>
        <MonitoringStepSection title="Statuts" count={byStatus.length}>
          <BreakdownBars items={byStatus} total={stats.total} emptyLabel="Aucun statut." color="#b45309" />
        </MonitoringStepSection>
        <MonitoringStepSection title="Priorités" count={byPriority.length}>
          <BreakdownBars items={byPriority} total={stats.total} emptyLabel="Aucune priorité." color="#b91c1c" />
        </MonitoringStepSection>
        <MonitoringStepSection title="Canaux" count={byChannel.length}>
          <BreakdownBars items={byChannel} total={stats.total} emptyLabel="Aucun canal renseigné." color="#6366f1" />
        </MonitoringStepSection>
        <MonitoringStepSection title="Matériel concerné" count={byEquipmentType.length}>
          <BreakdownBars
            items={byEquipmentType}
            total={stats.withEquipmentCount}
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
