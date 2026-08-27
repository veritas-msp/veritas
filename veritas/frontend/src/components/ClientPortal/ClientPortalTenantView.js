import { useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import { interpolate } from "../../i18n/translate";
import { getLicenseDisplayName } from "../ServicePage/TenantDetailTabs/utils";
import { ExchangePortalPanel, TeamsPortalPanel, AppPanelHeader } from "./ClientPortalTenantApps";
import portalStyles from "./ClientDashboard.module.css";
import tableStyles from "../TicketPage/TicketPage.module.css";
import listStyles from "./ClientDevicesListTab.module.css";
import PortalTabBar from "./PortalTabBar";
import styles from "./ClientServicesDetailView.module.css";

const TENANT_TABS = [
  { id: "utilisateurs", icon: "mdi:account-multiple" },
  { id: "licences", icon: "mdi:license" },
  { id: "securite", icon: "mdi:shield-check" },
  { id: "applications", icon: "mdi:apps" }
];

function StatusBadge({ active, copy }) {
  return (
    <span className={`${listStyles.statusBadge} ${active ? listStyles.statusActive : listStyles.statusInactive}`}>
      {active ? copy.statusActive : copy.statusInactive}
    </span>
  );
}

function YesNo({ value, copy }) {
  if (value == null) return "—";
  return value ? copy.yes : copy.no;
}

function ServiceTable({ columns, rows, emptyLabel, tableClassName }) {
  if (!rows.length) {
    return <p className={listStyles.emptyCategory}>{emptyLabel}</p>;
  }
  return (
    <div className={styles.tenantTableWrap}>
      <table className={`${tableStyles.table} ${tableClassName || styles.serviceTable}`}>
        <thead>
          <tr>
            {columns.map(col => (
              <th key={col.key}>{col.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={row.id || `${row.email || row.name || "row"}-${index}`}>
              {columns.map(col => (
                <td key={col.key}>{col.render(row)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function InfoFactsCard({ title, facts }) {
  return (
    <section className={portalStyles.panel}>
      <div className={portalStyles.panelHeader}>
        <span className={portalStyles.panelTitle}>{title}</span>
      </div>
      <dl className={`${portalStyles.infoCardFacts} ${styles.tenantFacts}`}>
        {facts.map(fact => (
          <div key={fact.key}>
            <dt>{fact.label}</dt>
            <dd>{fact.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function SyncHint({ copy }) {
  return (
    <p className={styles.tenantHint}>
      <Icon icon="mdi:information-outline" aria-hidden />
      {copy.tenantSyncHint}
    </p>
  );
}

function matchesQuery(value, query) {
  if (!query) return true;
  return String(value || "").toLowerCase().includes(query);
}

function formatStorage(value) {
  if (value == null || value === "") return "—";
  if (typeof value === "string") return value;
  const bytes = Number(value);
  if (!Number.isFinite(bytes) || bytes <= 0) return "—";
  if (bytes >= 1024 ** 4) return `${(bytes / 1024 ** 4).toFixed(1)} To`;
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(1)} Go`;
  if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(0)} Mo`;
  return `${bytes} o`;
}

function formatLicenseLabel(value) {
  if (!value) return "—";
  return String(value)
    .split(",")
    .map(part => getLicenseDisplayName(part.trim()))
    .filter(Boolean)
    .join(", ") || "—";
}

export default function ClientPortalTenantView({ items, copy, formatDate }) {
  const [selectedId, setSelectedId] = useState(items[0]?.id || 0);
  const [viewMode, setViewMode] = useState("utilisateurs");
  const [userQuery, setUserQuery] = useState("");
  const [licenseQuery, setLicenseQuery] = useState("");

  const tenant = items.find(item => String(item.id) === String(selectedId)) || items[0];
  const details = tenant?.details || {};

  const users = useMemo(() => (Array.isArray(details.users) ? details.users : []), [details.users]);
  const licenses = useMemo(() => {
    const source = Array.isArray(details.licenses) && details.licenses.length
      ? details.licenses
      : Array.isArray(tenant?.licenses) ? tenant.licenses : [];
    return source.map((lic, index) => {
      const total = lic.total ?? 0;
      const used = lic.used ?? lic.utilisees ?? 0;
      const rawName = lic.name || lic.displayName || lic.nom || lic.sku || "";
      return {
        id: lic.id || lic.skuId || rawName || `lic-${index}`,
        name: getLicenseDisplayName(rawName),
        total,
        used,
        available: lic.available ?? Math.max(0, total - used),
        expiration: lic.expiration || null
      };
    }).sort((a, b) => (b.used ?? 0) - (a.used ?? 0) || (b.total ?? 0) - (a.total ?? 0));
  }, [details.licenses, tenant?.licenses]);

  const security = details.security || null;
  const exchange = details.exchange || null;
  const teams = details.teams || null;
  const sharepoint = details.sharepoint || null;
  const onedrive = details.onedrive || null;

  const filteredUsers = useMemo(() => {
    const query = userQuery.trim().toLowerCase();
    if (!query) return users;
    return users.filter(user => (
      matchesQuery(user.name, query)
      || matchesQuery(user.email, query)
      || matchesQuery(user.licenses, query)
    ));
  }, [users, userQuery]);

  const filteredLicenses = useMemo(() => {
    const query = licenseQuery.trim().toLowerCase();
    if (!query) return licenses;
    return licenses.filter(lic => matchesQuery(lic.name, query));
  }, [licenses, licenseQuery]);

  const sectionTabs = useMemo(
    () => TENANT_TABS.map(section => ({
      key: section.id,
      label: copy.tenantTabs?.[section.id],
      icon: section.icon,
      count: section.id === "utilisateurs"
        ? users.length
        : section.id === "licences"
          ? licenses.length
          : undefined
    })),
    [copy.tenantTabs, users.length, licenses.length]
  );

  if (!tenant) return null;

  const hasApps = Boolean(exchange || teams || sharepoint || onedrive);

  return (
    <div className={styles.tenantRoot}>
      {items.length > 1 ? (
        <label className={styles.tenantPicker}>
          <span>{copy.tenantPicker}</span>
          <select
            value={String(tenant.id)}
            onChange={event => {
              setSelectedId(event.target.value);
              setUserQuery("");
              setLicenseQuery("");
            }}
          >
            {items.map(item => (
              <option key={item.id} value={String(item.id)}>
                {item.details?.tenantName || item.product || item.name}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      <InfoFactsCard
        title={copy.infoTitle}
        facts={[
          { key: "name", label: copy.tenantName, value: details.tenantName || tenant.product || tenant.name || "—" },
          { key: "id", label: copy.tenantId, value: details.tenantId || "—" },
          { key: "status", label: copy.tableStatus, value: <StatusBadge active={tenant.active} copy={copy} /> },
          { key: "sync", label: copy.tenantLastSync, value: details.lastUpdate && formatDate ? formatDate(details.lastUpdate) : "—" }
        ]}
      />

      <PortalTabBar
        items={sectionTabs}
        activeKey={viewMode}
        onChange={setViewMode}
        ariaLabel={copy.tenantTabsAria}
        className={styles.tenantTabBar}
      />

      {viewMode === "utilisateurs" ? (
        <section className={portalStyles.panel}>
          <div className={portalStyles.panelHeader}>
            <span className={portalStyles.panelTitle}>{copy.tenantTabs?.utilisateurs}</span>
            <span className={portalStyles.panelCount}>{filteredUsers.length}</span>
          </div>
          <input
            type="search"
            className={styles.tenantSearch}
            value={userQuery}
            onChange={event => setUserQuery(event.target.value)}
            placeholder={copy.searchUsers}
            aria-label={copy.searchUsers}
          />
          <ServiceTable
            emptyLabel={copy.noItems}
            columns={[
              { key: "name", label: copy.userName, render: row => row.name || "—" },
              { key: "email", label: copy.userEmail, render: row => row.email || "—" },
              { key: "licenses", label: copy.userLicenses, render: row => formatLicenseLabel(row.licenses) },
              { key: "lastLogin", label: copy.userLastLogin, render: row => row.lastLoginDate && formatDate ? formatDate(row.lastLoginDate) : copy.neverConnected },
              { key: "mfa", label: copy.userMfa, render: row => <YesNo value={row.mfaEnabled} copy={copy} /> },
              { key: "admin", label: copy.userAdmin, render: row => <YesNo value={row.isAdmin} copy={copy} /> },
              { key: "status", label: copy.tableStatus, render: row => <StatusBadge active={row.accountEnabled !== false} copy={copy} /> }
            ]}
            rows={filteredUsers}
          />
        </section>
      ) : null}

      {viewMode === "licences" ? (
        <section className={portalStyles.panel}>
          <div className={portalStyles.panelHeader}>
            <span className={portalStyles.panelTitle}>{copy.licensesTitle}</span>
            <span className={portalStyles.panelCount}>{filteredLicenses.length}</span>
          </div>
          <input
            type="search"
            className={styles.tenantSearch}
            value={licenseQuery}
            onChange={event => setLicenseQuery(event.target.value)}
            placeholder={copy.searchLicenses}
            aria-label={copy.searchLicenses}
          />
          <ServiceTable
            emptyLabel={copy.noLicenseRows}
            columns={[
              { key: "name", label: copy.licenseName, render: row => row.name },
              { key: "used", label: copy.licenseUsed, render: row => row.used },
              { key: "total", label: copy.licenseTotal, render: row => row.total },
              { key: "available", label: copy.licenseAvailable, render: row => row.available },
              {
                key: "expiration",
                label: copy.licenseExpiration,
                render: row => row.expiration && formatDate ? formatDate(row.expiration) : "—"
              }
            ]}
            rows={filteredLicenses}
          />
        </section>
      ) : null}

      {viewMode === "securite" ? (
        <section className={portalStyles.panel}>
          <div className={portalStyles.panelHeader}>
            <span className={portalStyles.panelTitle}>{copy.securityTitle}</span>
          </div>
          {security ? (
            <>
              <dl className={`${portalStyles.infoCardFacts} ${styles.tenantFacts}`}>
                <div>
                  <dt>{copy.tenantSecureScore}</dt>
                  <dd>
                    {security.secureScore != null
                      ? interpolate(copy.secureScoreValue, {
                        score: String(Math.round(security.secureScore)),
                        max: String(Math.round(security.secureScoreMax || 100)),
                        pct: String(Math.round(security.secureScorePct ?? (security.secureScoreMax
                          ? (security.secureScore / security.secureScoreMax) * 100
                          : 0)))
                      })
                      : security.secureScorePct != null
                        ? `${Math.round(security.secureScorePct)} %`
                        : "—"}
                  </dd>
                </div>
                <div>
                  <dt>{copy.tenantMfa}</dt>
                  <dd>
                    {security.mfaCoverage != null
                      ? interpolate(copy.mfaSummary, {
                        pct: String(security.mfaCoverage),
                        enabled: String(security.mfaEnabled ?? 0),
                        total: String(security.mfaKnown ?? 0)
                      })
                      : "—"}
                  </dd>
                </div>
              </dl>
              <h3 className={styles.tenantSubTitle}>{copy.securityRecommendations}</h3>
              <ServiceTable
                emptyLabel={copy.securityNoRecos}
                tableClassName={styles.tenantAppTable}
                columns={[
                  { key: "title", label: copy.recoTitle, render: row => row.title },
                  { key: "score", label: copy.recoScore, render: row => row.score ?? "—" }
                ]}
                rows={security.recommendations || []}
              />
            </>
          ) : (
            <SyncHint copy={copy} />
          )}
        </section>
      ) : null}

      {viewMode === "applications" ? (
        hasApps ? (
          <div className={styles.tenantAppsGrid}>
            {exchange ? (
              <section className={`${portalStyles.panel} ${styles.tenantAppWide}`}>
                <AppPanelHeader icon="simple-icons:microsoftexchange" title={copy.exchangeTitle} />
                <ExchangePortalPanel
                  exchange={exchange}
                  copy={copy}
                  formatStorage={formatStorage}
                  ServiceTable={ServiceTable}
                />
              </section>
            ) : null}

            {teams ? (
              <section className={`${portalStyles.panel} ${styles.tenantAppWide}`}>
                <AppPanelHeader icon="simple-icons:microsoftteams" title={copy.teamsTitle} count={teams?.teamCount} />
                <TeamsPortalPanel
                  teams={teams}
                  copy={copy}
                  ServiceTable={ServiceTable}
                />
              </section>
            ) : null}

            <section className={portalStyles.panel}>
              <div className={portalStyles.panelHeader}>
                <span className={portalStyles.panelTitle}>
                  <Icon icon="mdi:microsoft-sharepoint" aria-hidden />
                  {copy.sharepointTitle}
                </span>
                {sharepoint?.siteCount != null ? <span className={portalStyles.panelCount}>{sharepoint.siteCount}</span> : null}
              </div>
              {sharepoint ? (
                <>
                  <dl className={`${portalStyles.infoCardFacts} ${styles.tenantFacts}`}>
                    <div>
                      <dt>{copy.mailStorage}</dt>
                      <dd>{formatStorage(sharepoint.storageUsed)}</dd>
                    </div>
                  </dl>
                  <ServiceTable
                    emptyLabel={copy.noItems}
                    tableClassName={styles.tenantAppTable}
                    columns={[
                      { key: "name", label: copy.siteName, render: row => row.name },
                      { key: "url", label: copy.siteUrl, render: row => row.url || "—" },
                      {
                        key: "activity",
                        label: copy.siteLastActivity,
                        render: row => row.lastActivity && formatDate ? formatDate(row.lastActivity) : "—"
                      },
                      { key: "status", label: copy.tableStatus, render: row => <StatusBadge active={row.active !== false} copy={copy} /> }
                    ]}
                    rows={sharepoint.sites || []}
                  />
                </>
              ) : (
                <p className={portalStyles.empty}>{copy.noItems}</p>
              )}
            </section>

            <section className={portalStyles.panel}>
              <div className={portalStyles.panelHeader}>
                <span className={portalStyles.panelTitle}>
                  <Icon icon="entypo-social:onedrive" aria-hidden />
                  {copy.onedriveTitle}
                </span>
              </div>
              {onedrive ? (
                <dl className={`${portalStyles.infoCardFacts} ${styles.tenantFacts}`}>
                  <div>
                    <dt>{copy.onedriveUsed}</dt>
                    <dd>{formatStorage(onedrive.totalUsed)}</dd>
                  </div>
                  <div>
                    <dt>{copy.onedriveFiles}</dt>
                    <dd>{onedrive.totalFiles ?? "—"}</dd>
                  </div>
                  <div>
                    <dt>{copy.onedriveAverage}</dt>
                    <dd>{formatStorage(onedrive.averagePerUser)}</dd>
                  </div>
                </dl>
              ) : (
                <p className={portalStyles.empty}>{copy.noItems}</p>
              )}
            </section>
          </div>
        ) : (
          <section className={portalStyles.panel}>
            <div className={portalStyles.panelHeader}>
              <span className={portalStyles.panelTitle}>{copy.tenantTabs?.applications}</span>
            </div>
            <SyncHint copy={copy} />
          </section>
        )
      ) : null}
    </div>
  );
}
