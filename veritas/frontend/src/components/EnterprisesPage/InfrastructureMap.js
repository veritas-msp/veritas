import React, { useEffect, useMemo, useState, useRef } from "react";
import { Icon } from "@iconify/react";
import { getClientHardwareEquipment, getEquipmentMonitoringSummaries } from "../../api/equipment";
import { useCheckMKIntegrationEnabled } from "../../hooks/useCheckMKIntegrationEnabled";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { getInfraMapCopy } from "./infraMapI18n";
import { filterBySite, matchesSiteFilter } from "../../utils/siteFilterUtils";
import InfraBrick from "./InfraBrick";
import { buildInfraBrickGroups, INFRA_BRICK_GROUPS } from "./infraHoneycombLayout";
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

function InfraMapSkeleton({
  copy
}) {
  return <div className={styles.skeleton} aria-busy="true" aria-label={copy.loadingAria}>
      <div className={styles.mapShell}>
        <div className={styles.mapModulesGrid}>
          {INFRA_BRICK_GROUPS.map(group => <section key={group.id} className={styles.mapModuleGroup}>
              <header className={styles.mapModuleZoneLabel}>
                <Icon icon={group.icon || "mdi:puzzle-outline"} className={styles.mapModuleZoneIcon} aria-hidden />
                <span>{copy.getBrickGroupLabel(group.id)}</span>
              </header>
              <div className={styles.brickRow}>
                {group.types.map(type => <div key={type} className={styles.skeletonBrickRow} />)}
              </div>
            </section>)}
        </div>
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
  const {
    enabled: checkmkIntegrationEnabled
  } = useCheckMKIntegrationEnabled();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const clientSnapshotRef = useRef(clientSnapshot);
  clientSnapshotRef.current = clientSnapshot;
  const hasLoadedOnceRef = useRef(false);
  const onLoadingChangeRef = useRef(onLoadingChange);
  onLoadingChangeRef.current = onLoadingChange;
  const equipementsCount = useMemo(() => {
    const equipements = clientSnapshot?.equipements;
    if (!equipements || typeof equipements !== "object") return 0;
    return Object.values(equipements).reduce((total, list) => total + (Array.isArray(list) ? list.length : 0), 0);
  }, [clientSnapshot]);
  useEffect(() => {
    hasLoadedOnceRef.current = false;
    setLoading(true);
    onLoadingChangeRef.current?.(true);
  }, [clientId]);
  useEffect(() => {
    if (!clientId) return undefined;
    const controller = new AbortController();
    let cancelled = false;
    const softRefresh = hasLoadedOnceRef.current;
    (async () => {
      if (!softRefresh) {
        setLoading(true);
        onLoadingChangeRef.current?.(true);
      }
      setError(null);
      try {
        // Keep a light sync with equipment revision so parent loaders stay coordinated.
        await Promise.all([getClientHardwareEquipment(clientId, {
          client: clientSnapshotRef.current,
          signal: controller.signal
        }), checkmkIntegrationEnabled ? getEquipmentMonitoringSummaries({
          clientId
        }, {
          signal: controller.signal
        }).catch(() => ({
          summaries: {}
        })) : Promise.resolve({
          summaries: {}
        })]);
        if (cancelled || controller.signal.aborted) return;
      } catch (err) {
        if (err?.name === "AbortError" || cancelled) return;
        setError(err.message || copy.loadError);
      } finally {
        if (!cancelled) {
          hasLoadedOnceRef.current = true;
          setLoading(false);
          onLoadingChangeRef.current?.(false);
        }
      }
    })();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [clientId, equipementsCount, checkmkIntegrationEnabled, equipmentRevision, copy.loadError]);
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
  if (loading && !hasLoadedOnceRef.current) {
    if (hideSkeleton) return null;
    return <InfraMapSkeleton copy={copy} />;
  }
  if (error) {
    return <div className={styles.errorState}>
        <Icon icon="mdi:map-marker-alert-outline" aria-hidden />
        <span>{error}</span>
      </div>;
  }
  return <div className={styles.map}>
      <InfraMapCanvas {...mapCanvasProps} />
    </div>;
}
