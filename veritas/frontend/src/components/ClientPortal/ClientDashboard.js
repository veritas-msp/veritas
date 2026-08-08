import { useMemo } from "react";
import { useOutletContext } from "react-router-dom";
import { Icon } from "@iconify/react";
import { Link } from "react-router-dom";
import { mapClientHardwareEquipment } from "../../api/equipment";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import styles from "./ClientDashboard.module.css";
import portalStyles from "./ClientPortalTickets.module.css";
import ClientDashboardOverview from "./ClientDashboardOverview";
import { getClientPortalCopy } from "./clientPortalI18n";
import { getPortalTicketActionRequiredBadge } from "./clientPortalTicketUi";
export default function ClientDashboard() {
  const {
    dashboard: data
  } = useOutletContext() || {};
  const locale = useAppLocale();
  const copy = useMemo(() => getClientPortalCopy(locale), [locale]);
  const t = copy.dashboard;
  const mappedComputers = useMemo(() => {
    if (!data?.computers?.length || !data?.client) return [];
    return mapClientHardwareEquipment({
      id: data.client.id,
      name: data.client.name,
      equipements: {
        Ordinateurs: data.computers
      }
    }).filter(eq => eq.type === "Ordinateurs");
  }, [data?.computers, data?.client]);
  if (!data) return null;
  const {
    client,
    commercial,
    stats,
    tickets,
    actionRequiredTickets,
    pendingValidationTickets
  } = data;
  const actionRequiredRows = actionRequiredTickets?.length ? actionRequiredTickets : pendingValidationTickets || [];
  const actionRequiredCount = stats.actionRequiredCount ?? stats.pendingValidationCount ?? actionRequiredRows.length ?? 0;
  const healthPct = stats.totalEquipment ? Math.round(stats.activeEquipment / stats.totalEquipment * 100) : 100;
  const kpiItems = [{
    key: "devices",
    to: "/client/devices",
    icon: "mdi:devices",
    value: stats.totalEquipment,
    label: t.kpiDevices,
    tone: "blue"
  }, {
    key: "active",
    to: "/client/devices",
    icon: "mdi:check-circle-outline",
    value: stats.activeEquipment,
    label: t.kpiActive,
    tone: "green"
  }, {
    key: "tickets",
    to: "/client/tickets",
    icon: "mdi:ticket-outline",
    value: stats.openTickets,
    label: t.kpiTickets,
    tone: stats.openTickets > 0 ? "orange" : "green"
  }, {
    key: "vault",
    to: "/client/documents",
    icon: "mdi:safe-square-outline",
    value: stats.vaultFileCount ?? 0,
    label: t.kpiVault,
    tone: "violet"
  }];
  return <div className={styles.mainContent}>
      <header className={styles.topBar}>
        <h1 className={styles.pageTitle}>{t.pageTitle}</h1>
        <div className={styles.topBarRight}>
          <span className={styles.healthBadge}>
            <span className={styles.healthDot} style={{
            background: healthPct >= 80 ? "#10b981" : healthPct >= 50 ? "#f59e0b" : "#ef4444"
          }} />
            {t.healthBadge.replace("{pct}", String(healthPct))}
          </span>
        </div>
      </header>

      <div className={styles.dashboardTopRow}>
        {kpiItems.map(item => <Link key={item.key} to={item.to} className={styles.kpiCard}>
            <span className={`${styles.kpiCardIcon} ${styles[`kpiCardIcon_${item.tone}`] || ""}`}>
              <Icon icon={item.icon} aria-hidden />
            </span>
            <span className={styles.kpiCardValue}>{item.value}</span>
            <span className={styles.kpiCardLabel}>{item.label}</span>
          </Link>)}

        {commercial ? <section className={styles.infoCard}>
            <div className={styles.infoCardHeader}>
              <Icon icon="mdi:account-tie-outline" aria-hidden />
              <span>{t.referentPanelTitle}</span>
            </div>
            <dl className={styles.infoCardFacts}>
              <div>
                <dt>{copy.layout.referentName}</dt>
                <dd>{commercial.name || "-"}</dd>
              </div>
              <div>
                <dt>{copy.layout.referentEmail}</dt>
                <dd>
                  {commercial.email ? <a href={`mailto:${commercial.email}`} className={portalStyles.tableLink}>
                      {commercial.email}
                    </a> : "-"}
                </dd>
              </div>
            </dl>
          </section> : null}

        {client ? <section className={styles.infoCard}>
            <div className={styles.infoCardHeader}>
              <Icon icon="mdi:office-building-outline" aria-hidden />
              <span>{t.companyPanelTitle}</span>
            </div>
            <dl className={styles.infoCardFacts}>
              <div>
                <dt>{t.companyName}</dt>
                <dd>{client.name || "-"}</dd>
              </div>
              {client.city ? <div>
                  <dt>{t.companyLocation}</dt>
                  <dd>
                    {client.city}
                    {client.country ? `, ${client.country}` : ""}
                  </dd>
                </div> : null}
            </dl>
          </section> : null}
      </div>

      {actionRequiredCount > 0 ? <section className={styles.actionRequiredPanel}>
          <div className={styles.actionRequiredHeader}>
            <Icon icon="mdi:clipboard-check-outline" aria-hidden />
            <div>
              <h2 className={styles.actionRequiredTitle}>
                {copy.formatActionRequiredTitle(actionRequiredCount)}
              </h2>
              <p className={styles.actionRequiredDesc}>{t.actionRequiredDesc}</p>
            </div>
          </div>
          <ul className={styles.actionRequiredList}>
            {actionRequiredRows.map(ticket => <li key={ticket.id}>
                <Link to={`/client/tickets/${ticket.id}`} className={styles.actionRequiredLink}>
                  <span className={styles.actionRequiredTicketTitle}>{ticket.title}</span>
                  {ticket.resolutionValidation?.autoCloseAt ? <span className={styles.actionRequiredMeta}>
                      {copy.formatAutoCloseAt(copy.formatPortalDateTime(ticket.resolutionValidation.autoCloseAt))}
                    </span> : copy.isTicketPendingClientResponse(ticket) ? <span className={styles.actionRequiredMeta}>{t.pendingYourResponse}</span> : null}
                </Link>
              </li>)}
          </ul>
          <Link to="/client/tickets" className={styles.actionRequiredCta}>
            {t.seeInSupport}
            <Icon icon="mdi:arrow-right" aria-hidden />
          </Link>
        </section> : null}

      <section className={styles.panel}>
        <div className={styles.panelHeader}>
          <span className={styles.panelTitle}>{t.recentTicketsTitle}</span>
          <Link to="/client/tickets" className={portalStyles.panelLink}>
            {t.seeAll}
          </Link>
        </div>
        {tickets.length === 0 ? <p className={styles.empty}>{t.noTickets}</p> : <table className={styles.table}>
            <thead>
              <tr>
                <th>{t.tableSubject}</th>
                <th>{t.tableStatus}</th>
                <th>{t.tablePriority}</th>
              </tr>
            </thead>
            <tbody>
              {tickets.slice(0, 5).map(ticket => <tr key={ticket.id}>
                  <td>
                    <Link to={`/client/tickets/${ticket.id}`} className={portalStyles.tableLink}>
                      {ticket.title}
                    </Link>
                  </td>
                  <td>
                    {(() => {
                const actionBadge = getPortalTicketActionRequiredBadge(ticket, copy);
                if (actionBadge) {
                  return <span className={portalStyles.validationPendingBadge}>{actionBadge.label}</span>;
                }
                return <span className={styles.badge}>{copy.getTicketStatus(ticket.status)}</span>;
              })()}
                  </td>
                  <td>{copy.getTicketPriority(ticket.priority)}</td>
                </tr>)}
            </tbody>
          </table>}
      </section>

      <ClientDashboardOverview data={data} copy={copy} mappedComputers={mappedComputers} />
    </div>;
}
