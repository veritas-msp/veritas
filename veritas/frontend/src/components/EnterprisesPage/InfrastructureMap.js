import React, { useEffect, useMemo } from "react";
import { Icon } from "@iconify/react";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { getInfraMapCopy } from "./infraMapI18n";
import { filterBySite, matchesSiteFilter } from "../../utils/siteFilterUtils";
import InfraBrick from "./InfraBrick";
import { buildInfraBrickGroups } from "./infraHoneycombLayout";
import styles from "./InfrastructureMap.module.css";

function InfraBrickColumn({
  bricks,
  placeholder = false,
  onBrickClick,
  ariaLabel,
  className,
  isCommunity = false,
  copy
}) {
  return <div className={className} aria-label={ariaLabel}>
      {bricks.map(brick => <InfraBrick key={brick.id} brick={brick} placeholder={placeholder} onClick={onBrickClick} isCommunity={isCommunity} copy={copy} />)}
    </div>;
}

function InfraMapCanvas({
  modulesEmpty = false,
  backupInstances = [],
  antivirusItems = [],
  antispamItems = [],
  domainItems = [],
  domainIntegrationReady = false,
  sslItems = [],
  licenceItems = [],
  tenantInfo = {},
  googleWorkspaceInfo = {},
  campaignItems = [],
  onBrickClick,
  isCommunity = false,
  copy
}) {
  const groups = buildInfraBrickGroups({
    empty: modulesEmpty,
    antivirusItems,
    antispamItems,
    domainItems,
    domainIntegrationReady,
    sslItems,
    licenceItems,
    backupInstances,
    tenantInfo,
    googleWorkspaceInfo,
    campaignItems,
    getBrickGroupLabel: (groupId, fallback) => copy.getBrickGroupLabel(groupId) || fallback,
    getBrickTypeLabel: (type, fallback) => copy.getBrickTypeLabel(type) || fallback
  });
  return <div className={`${styles.mapShell} ${modulesEmpty ? styles.mapShellEmpty : ""}`}>
      <div className={styles.mapModulesGrid} role="list" aria-label={copy.modulesAria || "Modules"}>
        {groups.map(group => <section key={group.id} className={styles.mapModuleGroup} role="listitem" aria-label={group.label}>
            <header className={styles.mapModuleZoneLabel}>
              <Icon icon={group.icon || "mdi:puzzle-outline"} className={styles.mapModuleZoneIcon} aria-hidden />
              <span>{group.label}</span>
            </header>
            <InfraBrickColumn className={styles.brickRow} ariaLabel={group.label} bricks={group.bricks} placeholder={modulesEmpty} onBrickClick={onBrickClick} isCommunity={isCommunity} copy={copy} />
          </section>)}
      </div>
    </div>;
}


export default function InfrastructureMap({
  clientId,
  clientSnapshot = null,
  backupInstances = [],
  antivirusItems = [],
  antispamItems = [],
  domainItems = [],
  domainIntegrationReady = false,
  sslItems = [],
  licenceItems = [],
  tenantInfo = {},
  googleWorkspaceInfo = {},
  campaignItems = [],
  customFamilyMap: _customFamilyMap = [],
  siteFilter = null,
  equipmentRevision = 0,
  onNodeClick: _onNodeClick,
  onBrickClick,
  isCommunity = false,
  /** When true, skip local skeleton (parent shows a unified map-tab skeleton). */
  hideSkeleton = false,
  onLoadingChange
}) {
  const locale = useAppLocale();
  const copy = useMemo(() => getInfraMapCopy(locale), [locale]);

  // Notify parent once: map data comes from props (no local equipment fetch).
  useEffect(() => {
    onLoadingChange?.(false);
  }, [clientId, equipmentRevision, onLoadingChange]);

  const filteredBackupInstances = useMemo(() => filterBySite(backupInstances, siteFilter), [backupInstances, siteFilter]);
  const filteredAntivirusItems = useMemo(() => filterBySite(antivirusItems, siteFilter), [antivirusItems, siteFilter]);
  const filteredAntispamItems = useMemo(() => filterBySite(antispamItems, siteFilter), [antispamItems, siteFilter]);
  const filteredDomainItems = useMemo(() => filterBySite(domainItems, siteFilter), [domainItems, siteFilter]);
  const filteredSslItems = useMemo(() => filterBySite(sslItems, siteFilter), [siteFilter, sslItems]);
  const filteredLicenseItems = useMemo(() => filterBySite(licenceItems, siteFilter), [licenceItems, siteFilter]);
  const filteredCampaignItems = useMemo(() => filterBySite(campaignItems, siteFilter), [campaignItems, siteFilter]);
  const filteredTenantInfo = useMemo(() => {
    if (!siteFilter) return tenantInfo;
    return matchesSiteFilter(tenantInfo, siteFilter) ? tenantInfo : {};
  }, [tenantInfo, siteFilter]);
  const mapCanvasProps = {
    backupInstances: filteredBackupInstances,
    antivirusItems: filteredAntivirusItems,
    antispamItems: filteredAntispamItems,
    domainItems: filteredDomainItems,
    domainIntegrationReady,
    sslItems: filteredSslItems,
    licenceItems: filteredLicenseItems,
    tenantInfo: filteredTenantInfo,
    googleWorkspaceInfo,
    campaignItems: filteredCampaignItems,
    onBrickClick,
    isCommunity,
    copy
  };
  return <div className={styles.map}>
      <InfraMapCanvas {...mapCanvasProps} />
    </div>;
}
