import { useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import { interpolate } from "../../i18n/translate";
import { AntivirusOverviewPanel } from "../EnterprisesPage/AntivirusOverviewModal";
import { ANTIVIRUS_OVERVIEW_SECTIONS } from "../EnterprisesPage/antivirusOverviewSections";
import { AntispamOverviewPanel } from "../EnterprisesPage/AntispamOverviewModal";
import { ANTISPAM_OVERVIEW_SECTIONS } from "../EnterprisesPage/antispamOverviewSections";
import portalStyles from "./ClientDashboard.module.css";
import listStyles from "./ClientDevicesListTab.module.css";
import serviceStyles from "./ClientServicesDetailView.module.css";
import PortalTabBar from "./PortalTabBar";
import styles from "./ClientCybersecurityPage.module.css";

function StatusBadge({ active, copy }) {
  return (
    <span className={`${listStyles.statusBadge} ${active ? listStyles.statusActive : listStyles.statusInactive}`}>
      {active ? copy.statusActive : copy.statusInactive}
    </span>
  );
}

function ManualSolutionCard({ title, facts, hint }) {
  return (
    <section className={portalStyles.panel}>
      <div className={portalStyles.panelHeader}>
        <span className={portalStyles.panelTitle}>{title}</span>
      </div>
      <dl className={`${portalStyles.infoCardFacts} ${serviceStyles.tenantFacts}`}>
        {facts.map(fact => (
          <div key={fact.key}>
            <dt>{fact.label}</dt>
            <dd>{fact.value}</dd>
          </div>
        ))}
      </dl>
      {hint ? <p className={styles.manualHint}>{hint}</p> : null}
    </section>
  );
}

function buildAntivirusItem(service) {
  const details = service?.details || {};
  return {
    id: service.id,
    name: service.name,
    productName: details.product || service.product || service.name,
    solution: details.product || service.product,
    providerId: details.providerId || details.provider || "manual",
    companyId: details.companyId || null,
    companyName: details.companyName || details.product || service.name,
    mappingMode: details.mappingMode || (details.companyId ? "reseller" : "manual"),
    licencesTotales: details.licensesTotal ?? service.licensesTotal,
    licencesUtilisees: details.licensesUsed ?? service.licensesUsed,
    expiration: details.expiration || service.expiration,
    endpoints: details.endpoints || [],
    syncData: details.syncData || null,
    isManual: details.isManual
  };
}

function buildAntispamItem(service) {
  const details = service?.details || {};
  return {
    id: service.id,
    name: service.name,
    productName: details.product || service.product || service.name,
    solution: details.product || service.product,
    providerId: details.providerId || "manual",
    customerId: details.customerId || null,
    customerName: details.customerName || details.product || service.name,
    mappingMode: details.mappingMode || (details.customerId ? "reseller" : "manual"),
    utilisateursProteges: details.utilisateursProteges ?? details.licensesUsed ?? service.licensesUsed,
    domainesSurveilles: details.domainesSurveilles ?? details.licensesTotal ?? service.licensesTotal,
    expiration: details.expiration || service.expiration,
    syncData: details.syncData || null,
    isManual: details.isManual
  };
}

function PortalAntivirusView({ items, copy, formatDate }) {
  const [section, setSection] = useState("overview");
  const service = items[0];
  const item = useMemo(() => buildAntivirusItem(service), [service]);
  const details = service?.details || {};
  const hasApi = Boolean(item.companyId);
  const hasDashboard = Boolean(item.syncData?.dashboard);
  const sectionTabs = useMemo(
    () => ANTIVIRUS_OVERVIEW_SECTIONS.map(entry => ({
      key: entry.id,
      label: copy.antivirusSections?.[entry.id] || entry.label,
      icon: entry.icon
    })),
    [copy.antivirusSections]
  );

  if (!service) return null;

  const facts = [
    { key: "product", label: copy.product, value: details.companyName || details.product || service.name || "—" },
    { key: "licenses", label: copy.licenses, value: details.licensesUsed != null && details.licensesTotal != null
      ? interpolate(copy.licensesSummary, { used: String(details.licensesUsed), total: String(details.licensesTotal) })
      : "—" },
    { key: "endpoints", label: copy.endpoints, value: details.endpointCount ?? "—" },
    { key: "expiration", label: copy.expiration, value: details.expiration ? formatDate(details.expiration) : "—" },
    { key: "status", label: copy.status, value: <StatusBadge active={service.active} copy={copy} /> }
  ];

  if (!hasApi) {
    return (
      <ManualSolutionCard
        title={copy.antivirusTitle}
        facts={facts}
        hint={copy.manualHint}
      />
    );
  }

  return (
    <div className={styles.solutionRoot}>
      <section className={portalStyles.panel}>
        <div className={portalStyles.panelHeader}>
          <span className={portalStyles.panelTitle}>{copy.antivirusTitle}</span>
        </div>
        <dl className={`${portalStyles.infoCardFacts} ${serviceStyles.tenantFacts}`}>
          {facts.map(fact => (
            <div key={fact.key}>
              <dt>{fact.label}</dt>
              <dd>{fact.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      {hasDashboard ? (
        <>
          <PortalTabBar
            items={sectionTabs}
            activeKey={section}
            onChange={setSection}
            ariaLabel={copy.antivirusSectionsAria}
            className={styles.sectionTabBar}
          />
          <div className={`${styles.sectionPane} ${portalStyles.portalEmbed}`}>
            <AntivirusOverviewPanel
              active
              asPage
              embed
              cachedOnly
              antivirusItem={item}
              client={{ name: details.companyName || service.name }}
              activeSection={section}
              onSectionChange={setSection}
            />
          </div>
        </>
      ) : (
        <p className={styles.syncHint}>
          <Icon icon="mdi:information-outline" aria-hidden />
          {copy.syncHintAntivirus}
        </p>
      )}
    </div>
  );
}

function PortalAntispamView({ items, copy, formatDate }) {
  const [section, setSection] = useState("overview");
  const service = items[0];
  const item = useMemo(() => buildAntispamItem(service), [service]);
  const details = service?.details || {};
  const hasApi = Boolean(item.customerId);
  const hasDashboard = Boolean(item.syncData?.dashboard);
  const sectionTabs = useMemo(
    () => ANTISPAM_OVERVIEW_SECTIONS.map(entry => ({
      key: entry.id,
      label: copy.antispamSections?.[entry.id] || entry.label,
      icon: entry.icon
    })),
    [copy.antispamSections]
  );

  if (!service) return null;

  const facts = [
    { key: "product", label: copy.product, value: details.customerName || details.product || service.name || "—" },
    { key: "users", label: copy.protectedUsers, value: details.utilisateursProteges ?? details.licensesUsed ?? "—" },
    { key: "domains", label: copy.watchedDomains, value: details.domainesSurveilles ?? details.licensesTotal ?? "—" },
    { key: "expiration", label: copy.expiration, value: details.expiration ? formatDate(details.expiration) : "—" },
    { key: "status", label: copy.status, value: <StatusBadge active={service.active} copy={copy} /> }
  ];

  if (!hasApi) {
    return (
      <ManualSolutionCard
        title={copy.antispamTitle}
        facts={facts}
        hint={copy.manualHint}
      />
    );
  }

  return (
    <div className={styles.solutionRoot}>
      <section className={portalStyles.panel}>
        <div className={portalStyles.panelHeader}>
          <span className={portalStyles.panelTitle}>{copy.antispamTitle}</span>
        </div>
        <dl className={`${portalStyles.infoCardFacts} ${serviceStyles.tenantFacts}`}>
          {facts.map(fact => (
            <div key={fact.key}>
              <dt>{fact.label}</dt>
              <dd>{fact.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      {hasDashboard ? (
        <>
          <PortalTabBar
            items={sectionTabs}
            activeKey={section}
            onChange={setSection}
            ariaLabel={copy.antispamSectionsAria}
            className={styles.sectionTabBar}
          />
          <div className={`${styles.sectionPane} ${portalStyles.portalEmbed}`}>
            <AntispamOverviewPanel
              active
              asPage
              embed
              cachedOnly
              antispamItem={item}
              client={{ name: details.customerName || service.name }}
              activeSection={section}
              onSectionChange={setSection}
            />
          </div>
        </>
      ) : (
        <p className={styles.syncHint}>
          <Icon icon="mdi:information-outline" aria-hidden />
          {copy.syncHintAntispam}
        </p>
      )}
    </div>
  );
}

export default function ClientCybersecurityDetailView({ antivirusItems = [], antispamItems = [], copy, formatDate }) {
  const productTabs = useMemo(() => {
    const tabs = [];
    if (antivirusItems.length) {
      tabs.push({
        key: "antivirus",
        label: copy.tabAntivirus,
        icon: "mdi:shield-check",
        count: antivirusItems.length
      });
    }
    if (antispamItems.length) {
      tabs.push({
        key: "antispam",
        label: copy.tabAntispam,
        icon: "mdi:email-lock",
        count: antispamItems.length
      });
    }
    return tabs;
  }, [antivirusItems, antispamItems, copy.tabAntivirus, copy.tabAntispam]);

  const [activeProduct, setActiveProduct] = useState(null);
  const resolvedProduct = activeProduct && productTabs.some(tab => tab.key === activeProduct)
    ? activeProduct
    : productTabs[0]?.key || null;

  if (!productTabs.length) {
    return (
      <div className={portalStyles.emptyState}>
        <Icon icon="mdi:shield-off-outline" className={portalStyles.emptyStateIcon} aria-hidden />
        <p className={portalStyles.emptyStateTitle}>{copy.emptyTitle}</p>
        <p className={portalStyles.empty}>{copy.emptyDesc}</p>
      </div>
    );
  }

  return (
    <div className={styles.root}>
      {productTabs.length > 1 ? (
        <PortalTabBar
          items={productTabs}
          activeKey={resolvedProduct}
          onChange={setActiveProduct}
          ariaLabel={copy.filterByProduct}
        />
      ) : null}

      {resolvedProduct === "antivirus" ? (
        <PortalAntivirusView items={antivirusItems} copy={copy} formatDate={formatDate} />
      ) : null}
      {resolvedProduct === "antispam" ? (
        <PortalAntispamView items={antispamItems} copy={copy} formatDate={formatDate} />
      ) : null}
    </div>
  );
}
