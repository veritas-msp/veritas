import { useMemo } from "react";
import { useOutletContext, Link } from "react-router-dom";
import { Icon } from "@iconify/react";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import styles from "./ClientDashboard.module.css";
import layout from "../EnterprisesPage/EnterprisesPage.module.css";
import pageStyles from "./ClientPortalPages.module.css";
import portalStyles from "./ClientPortalTickets.module.css";
import MspPageHero from "../Misc/MspPageHero/MspPageHero";
import { getClientPortalCopy } from "./clientPortalI18n";
import { getPortalTicketActionRequiredBadge } from "./clientPortalTicketUi";

export default function ClientDashboard() {
  const { scopedDashboard, dashboard: rawDashboard } = useOutletContext() || {};
  const data = scopedDashboard || rawDashboard;
  const locale = useAppLocale();
  const copy = useMemo(() => getClientPortalCopy(locale), [locale]);
  const t = copy.dashboard;

  if (!data) return null;

  const {
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
    value: stats.totalEquipment ?? 0,
    label: t.kpiDevices,
    tone: "blue"
  }, {
    key: "active",
    to: "/client/devices",
    icon: "mdi:check-circle-outline",
    value: stats.activeEquipment ?? 0,
    label: t.kpiActive,
    tone: "green"
  }, {
    key: "tickets",
    to: "/client/tickets",
    icon: "mdi:ticket-outline",
    value: stats.openTickets ?? 0,
    label: t.kpiTickets,
    tone: stats.openTickets > 0 ? "orange" : "green"
  }, {
    key: "vault",
    to: "/client/documents",
    icon: "mdi:file-document-outline",
    value: stats.vaultFileCount ?? 0,
    label: t.kpiVault,
    tone: "violet"
  }];

  return (
    <div className={`${styles.mainScrollFill} ${layout.page}`}>
      <div className={`${styles.mainContent} ${styles.portalShell}`}>
        <MspPageHero
          className={pageStyles.portalPageHero}
          eyebrow={t.eyebrow}
          title={t.pageTitle}
          icon="mdi:view-dashboard-outline"
          actions={
            <span className={styles.healthBadge}>
              <span
                className={styles.healthDot}
                style={{
                  background: healthPct >= 80 ? "#16a34a" : healthPct >= 50 ? "#f59e0b" : "#dc2626"
                }}
              />
              {t.healthBadge.replace("{pct}", String(healthPct))}
            </span>
          }
        />

        <div className={pageStyles.kpiRowFamily}>
          {kpiItems.map(item => (
            <Link
              key={item.key}
              to={item.to}
              className={layout.kpiCard}
            >
              <div className={`${layout.kpiIconWrap} ${layout[`kpiIcon_${item.tone}`] || layout.kpiIcon_blue}`}>
                <Icon icon={item.icon} aria-hidden />
              </div>
              <div className={layout.kpiBody}>
                <span className={layout.kpiValue}>{item.value}</span>
                <span className={layout.kpiLabel}>{item.label}</span>
              </div>
            </Link>
          ))}
        </div>

        {actionRequiredCount > 0 ? (
          <section className={styles.actionRequiredPanel}>
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
              {actionRequiredRows.map(ticket => (
                <li key={ticket.id}>
                  <Link to={`/client/tickets/${ticket.id}`} className={styles.actionRequiredLink}>
                    <span className={styles.actionRequiredTicketTitle}>{ticket.title}</span>
                    {ticket.resolutionValidation?.autoCloseAt ? (
                      <span className={styles.actionRequiredMeta}>
                        {copy.formatAutoCloseAt(copy.formatPortalDateTime(ticket.resolutionValidation.autoCloseAt))}
                      </span>
                    ) : copy.isTicketPendingClientResponse(ticket) ? (
                      <span className={styles.actionRequiredMeta}>{t.pendingYourResponse}</span>
                    ) : null}
                  </Link>
                </li>
              ))}
            </ul>
            <Link to="/client/tickets" className={styles.actionRequiredCta}>
              {t.seeInSupport}
              <Icon icon="mdi:arrow-right" aria-hidden />
            </Link>
          </section>
        ) : null}

        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <span className={styles.panelTitle}>{t.recentTicketsTitle}</span>
            <Link to="/client/tickets" className={portalStyles.panelLink}>
              {t.seeAll}
            </Link>
          </div>
          {!(tickets || []).length ? (
            <p className={styles.empty}>{t.noTickets}</p>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>{t.tableSubject}</th>
                  <th>{t.tableStatus}</th>
                  <th>{t.tablePriority}</th>
                </tr>
              </thead>
              <tbody>
                {tickets.slice(0, 5).map(ticket => (
                  <tr key={ticket.id}>
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
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </div>
  );
}
