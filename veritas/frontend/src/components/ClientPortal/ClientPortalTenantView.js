import { useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { interpolate } from "../../i18n/translate";
import { getTenantDetailCopy } from "../ServicePage/tenantDetailPageI18n";
import { buildTenantReport } from "../ServicePage/tenantReportUtils";
import TenantReportOverview from "../ServicePage/TenantReportOverview";
import LicensesTab from "../ServicePage/TenantDetailTabs/LicencesTab";
import UsersTab from "../ServicePage/TenantDetailTabs/UtilisateursTab";
import ExchangeTab from "../ServicePage/TenantDetailTabs/ExchangeTab";
import TeamsTab from "../ServicePage/TenantDetailTabs/TeamsTab";
import OneDriveTab from "../ServicePage/TenantDetailTabs/OneDriveTab";
import SharePointTab from "../ServicePage/TenantDetailTabs/SharePointTab";
import SecuriteTab from "../ServicePage/TenantDetailTabs/SecuriteTab";
import { getLicenseDisplayName } from "../ServicePage/TenantDetailTabs/utils";
import tenantStyles from "../ServicePage/TenantDetailPage.module.css";
import portalStyles from "./ClientDashboard.module.css";
import listStyles from "./ClientDevicesListTab.module.css";
import styles from "./ClientServicesDetailView.module.css";
import PortalTabBar from "./PortalTabBar";

const TENANT_SECTIONS = [
  { id: "rapport", icon: "mdi:view-dashboard-outline" },
  { id: "utilisateurs", icon: "mdi:account-multiple" },
  { id: "licences", icon: "mdi:license" },
  { id: "securite", icon: "mdi:shield-check" },
  { id: "exchange", icon: "simple-icons:microsoftexchange" },
  { id: "sharepoint", icon: "mdi:microsoft-sharepoint" },
  { id: "onedrive", icon: "entypo-social:onedrive" },
  { id: "teams", icon: "simple-icons:microsoftteams" }
];

function StatusBadge({ active, copy }) {
  return (
    <span className={`${listStyles.statusBadge} ${active ? listStyles.statusActive : listStyles.statusInactive}`}>
      {active ? copy.statusActive : copy.statusInactive}
    </span>
  );
}

export default function ClientPortalTenantView({ items, copy }) {
  const locale = useAppLocale();
  const tenantCopy = useMemo(() => getTenantDetailCopy(locale), [locale]);
  const [viewMode, setViewMode] = useState("rapport");
  const tenant = items[0];
  const details = tenant?.details || {};

  const licences = useMemo(() => {
    if (Array.isArray(details.licences) && details.licences.length) return details.licences;
    if (Array.isArray(tenant?.licenses) && tenant.licenses.length) {
      return tenant.licenses.map(lic => ({
        ...lic,
        nom: lic.name || lic.nom,
        displayName: lic.name || lic.displayName,
        utilisees: lic.used ?? lic.utilisees,
        total: lic.total
      }));
    }
    return [];
  }, [details.licences, tenant?.licenses]);

  const users = useMemo(() => (Array.isArray(details.users) ? details.users : []), [details.users]);
  const exchangeData = details.exchange || null;
  const teamsData = details.teams || null;
  const sharepointData = details.sharepoint || null;
  const onedriveData = details.onedrive || null;
  const securityData = details.security || null;

  const dashboardMetrics = useMemo(() => {
    if (!users.length) {
      const used = tenant?.licensesUsed;
      const total = tenant?.licensesTotal;
      return {
        totalUsers: details.userCount ?? 0,
        activeUsers30: 0,
        activeUsers90: 0,
        adoptionRate: 0,
        totalLicenses: total ?? 0,
        usedLicenses: used ?? 0
      };
    }
    const now = Date.now();
    const period30 = now - 30 * 86400000;
    const period90 = now - 90 * 86400000;
    const activeUsers30 = users.filter(user => {
      const lastLogin = user.lastLoginDate ? new Date(user.lastLoginDate).getTime() : null;
      return lastLogin && lastLogin >= period30;
    }).length;
    const activeUsers90 = users.filter(user => {
      const lastLogin = user.lastLoginDate ? new Date(user.lastLoginDate).getTime() : null;
      return lastLogin && lastLogin >= period90;
    }).length;
    const validLicenses = licences.filter(lic => {
      const total = lic.total || 0;
      return total < 10000 && total > 0;
    });
    const totalLicenses = validLicenses.reduce((sum, lic) => sum + (lic.total || 0), 0);
    const usedLicenses = validLicenses.reduce((sum, lic) => sum + (lic.utilisees || lic.used || 0), 0);
    return {
      totalUsers: users.length,
      activeUsers30,
      activeUsers90,
      adoptionRate: users.length > 0 ? Math.round((activeUsers30 / users.length) * 100) : 0,
      totalLicenses,
      usedLicenses
    };
  }, [users, licences, details.userCount, tenant?.licensesUsed, tenant?.licensesTotal]);

  const report = useMemo(() => buildTenantReport({
    users,
    licences,
    securityData,
    mfaDetails: [],
    exchangeData,
    sharepointData,
    onedriveData,
    teamsData,
    adoptionScore: details.adoptionScore || null
  }), [users, licences, securityData, exchangeData, sharepointData, onedriveData, teamsData, details.adoptionScore]);

  const sectionTabs = useMemo(
    () => TENANT_SECTIONS.map(section => ({
      key: section.id,
      label: copy.tenantTabs?.[section.id] || tenantCopy.tabs[section.id],
      icon: section.icon
    })),
    [copy.tenantTabs, tenantCopy.tabs]
  );

  if (!tenant) return null;

  const used = tenant.licensesUsed ?? dashboardMetrics.usedLicenses;
  const total = tenant.licensesTotal ?? dashboardMetrics.totalLicenses;

  return (
    <div className={styles.tenantRoot}>
      <section className={portalStyles.panel}>
        <div className={portalStyles.panelHeader}>
          <span className={portalStyles.panelTitle}>{copy.tenantTitle}</span>
        </div>
        <dl className={`${portalStyles.infoCardFacts} ${styles.tenantFacts}`}>
          <div>
            <dt>{copy.tenantName}</dt>
            <dd>{details.tenantName || tenant.product || tenant.name || "—"}</dd>
          </div>
          <div>
            <dt>{copy.tenantId}</dt>
            <dd>{details.tenantId || "—"}</dd>
          </div>
          <div>
            <dt>{copy.tenantUsers}</dt>
            <dd>{details.userCount ?? users.length ?? "—"}</dd>
          </div>
          <div>
            <dt>{copy.tenantLicenses}</dt>
            <dd>
              {used != null && total != null
                ? interpolate(copy.licensesSummary, { used: String(used), total: String(total) })
                : "—"}
            </dd>
          </div>
          <div>
            <dt>{copy.tableStatus}</dt>
            <dd><StatusBadge active={tenant.active} copy={copy} /></dd>
          </div>
        </dl>
      </section>

      <PortalTabBar
        items={sectionTabs}
        activeKey={viewMode}
        onChange={setViewMode}
        ariaLabel={copy.tenantTabsAria || tenantCopy.tabs.aria}
        className={styles.tenantTabBar}
      />

      <div className={`${tenantStyles.tenantVars} ${styles.tenantDetailPane} ${portalStyles.portalEmbed}`} key={viewMode}>
        {viewMode === "rapport" ? (
          <TenantReportOverview report={report} copy={tenantCopy} onOpenTab={setViewMode} />
        ) : null}
        {viewMode === "licences" ? (
          <LicensesTab
            licences={licences}
            dashboardMetrics={dashboardMetrics}
            theme="light"
            getLicenseDisplayName={getLicenseDisplayName}
          />
        ) : null}
        {viewMode === "utilisateurs" ? (
          <UsersTab
            users={users}
            dashboardMetrics={dashboardMetrics}
            detailData={{ clientName: details.tenantName }}
            mfaDetails={[]}
            theme="light"
          />
        ) : null}
        {viewMode === "exchange" ? <ExchangeTab exchangeData={exchangeData} theme="light" /> : null}
        {viewMode === "teams" ? <TeamsTab teamsData={teamsData} theme="light" /> : null}
        {viewMode === "onedrive" ? <OneDriveTab onedriveData={onedriveData} theme="light" /> : null}
        {viewMode === "sharepoint" ? <SharePointTab sharepointData={sharepointData} theme="light" /> : null}
        {viewMode === "securite" ? (
          <SecuriteTab
            securityData={securityData}
            users={users}
            mfaDetails={[]}
            clientId={null}
            theme="light"
          />
        ) : null}
      </div>

      {!details.exchange && !details.teams && !users.length && !licences.length ? (
        <p className={styles.tenantHint}>
          <Icon icon="mdi:information-outline" aria-hidden />
          {copy.tenantSyncHint}
        </p>
      ) : null}
    </div>
  );
}
