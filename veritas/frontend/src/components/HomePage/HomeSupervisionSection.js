import { useCallback, useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import { getLocaleTag } from "../../i18n/locales";
import { interpolate } from "../../i18n/translate";
import { isSalesTicket } from "../../utils/salesTicketUtils";
import {
  UiKitDataTable,
  UiKitEventsWeek,
  UiKitHomeBoard,
  UiKitKpiStrip,
  UiKitStackBlock,
  uiKitDataTableStyles as tableStyles,
  uiKitHomeStyles as homeStyles
} from "../UiKit";
/* Accueil = composition UI Kit uniquement */

const TICKET_TABLE_LIMIT = 12;

function getAssignedTicketKpis(stats) {
  const source = stats || {};
  const neu = Number(source.new) || 0;
  const pending = Number(source.pending) || 0;
  const inProgress = Number(source.inProgress) || 0;
  const toValidate = Number(source.toValidate) || 0;
  const total = Number(source.total);
  return {
    new: neu,
    pending,
    inProgress,
    toValidate,
    total: Number.isFinite(total) ? total : neu + pending + inProgress
  };
}

function buildTicketKpiCards(stats, labels) {
  const kpis = getAssignedTicketKpis(stats);
  return [
    {
      key: "total",
      value: kpis.total,
      label: labels.kpiTotal,
      icon: "mdi:ticket-account",
      viewId: "__builtin_mine__"
    },
    {
      key: "inProgress",
      value: kpis.inProgress,
      label: labels.kpiInProgress,
      icon: "mdi:progress-clock",
      viewId: "__builtin_in_progress__"
    },
    {
      key: "pending",
      value: kpis.pending,
      label: labels.kpiPending,
      icon: "mdi:timer-sand",
      viewId: "__builtin_pending__"
    },
    {
      key: "toValidate",
      value: kpis.toValidate,
      label: labels.kpiToValidate,
      icon: "mdi:clipboard-check-outline",
      viewId: "__builtin_to_validate__"
    }
  ];
}

function truncateText(value, max = 72) {
  const text = String(value || "").trim();
  if (!text) return "";
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1)}…`;
}

function formatTicketDate(value, localeTag) {
  if (!value) return "—";
  const ms = new Date(value).getTime();
  if (!Number.isFinite(ms)) return "—";
  try {
    return new Date(ms).toLocaleString(localeTag || undefined, {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    });
  } catch {
    return "—";
  }
}

function ticketStatusText(ticket, cols) {
  const key = String(ticket?.status || "").trim().toLowerCase().replace(/[\s-]+/g, "_");
  const labels = {
    open: cols.statusOpen,
    new: cols.statusNew,
    pending: cols.statusPending,
    in_progress: cols.statusInProgress,
    inprogress: cols.statusInProgress,
    to_validate: cols.statusToValidate,
    tovalidate: cols.statusToValidate,
    resolved: cols.statusResolved,
    closed: cols.statusClosed
  };
  return labels[key] || ticket?.statusLabel || "—";
}

function ticketPriorityMark(ticket, priorities) {
  const key = String(ticket?.priority || "normal").trim().toLowerCase();
  if (key === "urgent" || key === "critical") {
    return { icon: "mdi:chevron-double-up", label: priorities?.urgent || "Urgente", tone: "urgent" };
  }
  if (key === "high") {
    return { icon: "mdi:arrow-up", label: priorities?.high || "Haute", tone: "high" };
  }
  if (key === "low") {
    return { icon: "mdi:arrow-down", label: priorities?.low || "Basse", tone: "low" };
  }
  return { icon: "mdi:equal", label: priorities?.normal || "Normale", tone: "normal" };
}

function formatCategory(value) {
  const text = String(value || "").trim();
  if (!text) return "—";
  const words = text.replace(/[_-]+/g, " ").replace(/\s+/g, " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

function ticketSortValue(ticket, key) {
  switch (key) {
    case "number":
      return Number(ticket?.ticketNumber) || Number(ticket?.id) || 0;
    case "title":
      return String(ticket?.title || "").trim().toLowerCase();
    case "company":
      return String(ticket?.clientName || "").trim().toLowerCase();
    case "status":
      return String(ticket?.status || "").trim().toLowerCase();
    case "priority":
      return String(ticket?.priority || "").trim().toLowerCase();
    case "sla":
      return String(ticket?.slaLabel || "").trim().toLowerCase();
    case "category":
      return String(ticket?.category || "").trim().toLowerCase();
    case "created": {
      const ms = ticket?.createdAt ? new Date(ticket.createdAt).getTime() : 0;
      return Number.isFinite(ms) ? ms : 0;
    }
    case "modified": {
      const ms = ticket?.updatedAt ? new Date(ticket.updatedAt).getTime() : 0;
      return Number.isFinite(ms) ? ms : 0;
    }
    default:
      return "";
  }
}

function HomeTicketsTable({ tickets, localeTag, copy, onOpenTicket, family }) {
  const cols = copy?.ticketsTable || {};
  const pinMajor = useCallback(
    ticket => family === "support" && Boolean(ticket?.isMajorIncident),
    [family]
  );
  const columns = useMemo(() => {
    const number = { key: "number", label: cols.number || "N°", defaultDirection: "desc", className: `${tableStyles.tableColNum} ${homeStyles.colNum}` };
    const title = { key: "title", label: cols.title || cols.description || "Titre", defaultDirection: "asc", className: homeStyles.colTitle };
    const company = { key: "company", label: cols.company || "Entreprise", defaultDirection: "asc", className: homeStyles.colCompany };
    const status = { key: "status", label: cols.status || "Statut", defaultDirection: "asc", className: homeStyles.colStatus };
    const created = { key: "created", label: cols.created || "Créé", defaultDirection: "desc", className: `${homeStyles.colDate} ${homeStyles.colCreated}` };
    const modified = { key: "modified", label: cols.modified || "Modifié", defaultDirection: "desc", className: homeStyles.colDate };
    if (family === "sales") {
      return [
        number,
        title,
        company,
        status,
        { key: "category", label: cols.category || "Catégorie", defaultDirection: "asc", className: homeStyles.colCategory },
        created,
        modified
      ];
    }
    return [
      number,
      title,
      company,
      status,
      { key: "priority", label: cols.priority || "Priorité", defaultDirection: "asc", className: homeStyles.colPriority },
      { key: "sla", label: cols.sla || "SLA", defaultDirection: "asc", className: homeStyles.colSla },
      created,
      modified
    ];
  }, [cols, family]);

  return (
    <UiKitDataTable
      columns={columns}
      rows={tickets}
      getSortValue={ticketSortValue}
      pinFirst={pinMajor}
      initialSort={{ key: "modified", direction: "desc" }}
      sortByLabel={copy?.tableSort?.sortBy || "Trier par {column}"}
      emptyIcon="mdi:ticket-outline"
      emptyLabel={copy?.empty?.tickets || "Aucun ticket ne vous est assigné"}
      renderRow={ticket => {
        const title = truncateText(ticket.title || copy?.noTitle || "Sans titre", 72);
        const client = ticket.clientName || copy?.noClient || "—";
        const major = family === "support" && Boolean(ticket.isMajorIncident);
        const priority = ticketPriorityMark(ticket, copy?.priorities);
        const open = () => onOpenTicket?.(ticket, family);
        const numberCell = (
          <td key="num" className={`${tableStyles.tableColNum} ${homeStyles.colNum}`}>
            <span className={homeStyles.ticketIdCell}>
              {major ? (
                <Icon
                  icon="mdi:alert-octagon"
                  className={homeStyles.majorIncidentIcon}
                  aria-label={copy?.priorities?.majorIncident || "Incident majeur"}
                />
              ) : null}
              {ticket.ticketNumber ? `#${ticket.ticketNumber}` : `#${ticket.id}`}
            </span>
          </td>
        );
        const titleCell = <td key="title" className={homeStyles.colTitle}>{title}</td>;
        const companyCell = (
          <td key="company" className={homeStyles.colCompany}>{client}</td>
        );
        const statusCell = (
          <td key="status" className={homeStyles.colStatus}>{ticketStatusText(ticket, cols)}</td>
        );
        const createdCell = (
          <td key="created" className={`${homeStyles.colDate} ${homeStyles.colCreated}`}>
            {formatTicketDate(ticket.createdAt, localeTag)}
          </td>
        );
        const dateCell = (
          <td key="date" className={homeStyles.colDate}>
            {formatTicketDate(ticket.updatedAt, localeTag)}
          </td>
        );
        const cells = family === "sales"
          ? [
            numberCell,
            titleCell,
            companyCell,
            statusCell,
            <td key="category" className={homeStyles.colCategory}>{formatCategory(ticket.category)}</td>,
            createdCell,
            dateCell
          ]
          : [
            numberCell,
            titleCell,
            companyCell,
            statusCell,
            <td key="priority" className={homeStyles.colPriority}>
              <span
                className={`${homeStyles.priorityMark} ${homeStyles[`priority_${priority.tone}`] || ""}`}
                title={priority.label}
                aria-label={priority.label}
              >
                <Icon icon={priority.icon} aria-hidden />
              </span>
            </td>,
            <td key="sla" className={`${homeStyles.colSla} ${ticket.slaTone ? homeStyles[`sla_${ticket.slaTone}`] || "" : ""}`}>
              {ticket.slaLabel || "—"}
            </td>,
            createdCell,
            dateCell
          ];
        return {
          key: ticket.id,
          alert: major,
          onClick: open,
          onKeyDown: e => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              open();
            }
          },
          cells
        };
      }}
    />
  );
}

function TicketBlock({
  title,
  icon,
  cards,
  ariaLabel,
  tickets,
  localeTag,
  copy,
  family,
  navigateDoc,
  onOpenTicket,
  sectionKey,
  actions = null,
  motionClass = ""
}) {
  return (
    <UiKitStackBlock
      data-home-section={sectionKey}
      title={title}
      icon={icon}
      actions={actions}
      className={motionClass}
      kpi={
        <UiKitKpiStrip
          variant="pills"
          cards={cards}
          ariaLabel={ariaLabel}
          onNavigate={params => navigateDoc?.(params)}
        />
      }
    >
      <HomeTicketsTable
        tickets={tickets}
        localeTag={localeTag}
        copy={copy}
        family={family}
        onOpenTicket={onOpenTicket}
      />
    </UiKitStackBlock>
  );
}

export default function HomeSupervisionSection({
  copy,
  locale = "fr",
  onNavigate,
  assignedTicketStats = null,
  recentTickets = [],
  upcomingEvents = [],
  showSupportTickets = true,
  showSalesTickets = true,
  showEvents = true,
  userName = ""
}) {
  const localeTag = getLocaleTag(locale);
  const labels = copy?.panels?.supervision || {};
  const ticketLabels = copy?.panels?.tickets || {};
  const eventsLabels = copy?.panels?.events || {};

  const supportTicketKpiCards = useMemo(
    () => buildTicketKpiCards(assignedTicketStats?.support, ticketLabels),
    [assignedTicketStats?.support, ticketLabels]
  );
  const salesTicketKpiCards = useMemo(
    () => buildTicketKpiCards(assignedTicketStats?.sales, ticketLabels),
    [assignedTicketStats?.sales, ticketLabels]
  );

  const supportTickets = useMemo(() => {
    const list = (Array.isArray(recentTickets) ? recentTickets : []).filter(ticket => !isSalesTicket(ticket));
    list.sort((a, b) => Number(Boolean(b.isMajorIncident)) - Number(Boolean(a.isMajorIncident)));
    return list.slice(0, TICKET_TABLE_LIMIT);
  }, [recentTickets]);
  const salesTickets = useMemo(
    () =>
      (Array.isArray(recentTickets) ? recentTickets : [])
        .filter(ticket => isSalesTicket(ticket))
        .slice(0, TICKET_TABLE_LIMIT),
    [recentTickets]
  );

  const openTicket = (ticket, family = "support") => {
    if (ticket?.id && onNavigate) {
      onNavigate(family === "sales" ? "TicketSalesDetail" : "TicketDetail", {
        ticketId: ticket.id,
        ticketNumber: ticket.ticketNumber,
        title: ticket.title,
        ticketFamily: family === "sales" ? "sales" : "support",
        fromPage: family === "sales" ? "TicketSales" : "Ticket"
      });
      return;
    }
    onNavigate?.(family === "sales" ? "TicketSales" : "Ticket");
  };

  const greeting = userName
    ? typeof copy?.heroGreeting === "function"
      ? copy.heroGreeting(userName)
      : interpolate(String(copy?.heroGreeting || "Bonjour, {name}"), { name: userName })
    : copy?.heroTitle || "Tableau de bord";

  const showTicketPanels = showSupportTickets || showSalesTickets;
  const canToggleFamilies = showSupportTickets && showSalesTickets;
  const [ticketFamily, setTicketFamily] = useState(showSupportTickets ? "support" : "sales");
  const [ticketMotion, setTicketMotion] = useState(null);
  const activeFamily = canToggleFamilies
    ? ticketFamily
    : showSupportTickets
      ? "support"
      : "sales";
  const activeCards = activeFamily === "sales" ? salesTicketKpiCards : supportTicketKpiCards;
  const activeTickets = activeFamily === "sales" ? salesTickets : supportTickets;
  const activeTitle = activeFamily === "sales"
    ? ticketLabels.salesTitle || "Mes tickets services"
    : ticketLabels.supportTitle || "Mes tickets support";
  const activeIcon = activeFamily === "sales" ? "mdi:hexagon-multiple-outline" : "mdi:ticket-outline";
  const activeAria = activeFamily === "sales" ? ticketLabels.salesKpiAriaLabel : ticketLabels.supportKpiAriaLabel;
  const activePage = activeFamily === "sales" ? "TicketSales" : "Ticket";

  return (
    <UiKitHomeBoard
      title={greeting}
      titleMark={userName ? true : null}
      subtitle={
        labels.heroSubtitle ||
        copy?.heroSubtitle ||
        "Tout ce qu'il vous faut, au même endroit."
      }
      events={
        showEvents ? (
          <UiKitEventsWeek
            events={upcomingEvents}
            locale={locale}
            copy={copy}
            title={eventsLabels.title || "Mes événements"}
            icon="mdi:calendar-month-outline"
            showHint
            selectable
            onOpen={() => onNavigate?.("Planning")}
          />
        ) : null
      }
      tickets={
        showTicketPanels ? (
          <TicketBlock
            key={activeFamily}
            sectionKey={activeFamily}
            title={activeTitle}
            icon={activeIcon}
            cards={activeCards}
            ariaLabel={activeAria}
            tickets={activeTickets}
            localeTag={localeTag}
            copy={copy}
            family={activeFamily}
            motionClass={
              ticketMotion
                ? `${homeStyles.ticketSwap}${ticketMotion === "prev" ? ` ${homeStyles.ticketSwapPrev}` : ""}`
                : ""
            }
            navigateDoc={params => onNavigate?.(activePage, params)}
            onOpenTicket={openTicket}
            actions={
              canToggleFamilies ? (
                <button
                  type="button"
                  className={homeStyles.familyToggle}
                  data-family={activeFamily}
                  aria-pressed={activeFamily === "sales"}
                  aria-label={activeFamily === "sales" ? "Services. Afficher le support" : "Support. Afficher les services"}
                  onClick={() => {
                    const next = activeFamily === "support" ? "sales" : "support";
                    setTicketMotion(next === "sales" ? "next" : "prev");
                    setTicketFamily(next);
                  }}
                >
                  <span className={homeStyles.familyToggleThumb} aria-hidden />
                  <span className={`${homeStyles.familyToggleOption}${activeFamily === "support" ? ` ${homeStyles.familyToggleOptionOn}` : ""}`}>
                    Support
                  </span>
                  <span className={`${homeStyles.familyToggleOption}${activeFamily === "sales" ? ` ${homeStyles.familyToggleOptionOn}` : ""}`}>
                    Services
                  </span>
                </button>
              ) : null
            }
          />
        ) : null
      }
    />
  );
}
