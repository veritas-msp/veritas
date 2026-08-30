import React, { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { Icon } from "@iconify/react";
import SmartTooltip from "../SmartTooltip";
import { getClientHardwareEquipment, getEquipmentMonitoringSummaries } from "../../api/equipment";
import { buildInfraMapModel, aggregateCategoryNode, getInfraTypeIcon, toInfraDisplayStatus } from "./infraMapUtils";
import { useCheckMKIntegrationEnabled } from "../../hooks/useCheckMKIntegrationEnabled";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { getInfraMapCopy } from "./infraMapI18n";
import { filterBySite, filterCustomFamilyMap, matchesSiteFilter } from "../../utils/siteFilterUtils";
import InfraBrick from "./InfraBrick";
import { buildHoneycombEditorTiles, buildInfraBrickGroups, buildCustomFamilyBricks, buildHoneycombThemeClusters, EMPTY_HONEYCOMB_LAYOUT, HONEYCOMB_THEME_GROUPS, INFRA_BRICK_GROUPS, honeycombDisplayOffsetRem, isHoneycombFeatured } from "./infraHoneycombLayout";
import useSystemFamilyExtensions from "../../hooks/useSystemFamilyExtensions";
import { isSquareTileShape, tileShapeClassName } from "./tileShapes";
import shapeStyles from "./honeycombTileShapes.module.css";
import styles from "./InfrastructureMap.module.css";
function tileShapeClass(shape) {
  return shapeStyles[tileShapeClassName(shape)] || shapeStyles.shapeHexagon;
}
function InfraHexNode({
  node,
  onClick,
  copy,
  tileShape: tileShapeProp
}) {
  const hasData = Number(node.count) > 0;
  const meta = copy.getStatusMeta(hasData ? node.status : "unmonitored");
  const icon = getInfraTypeIcon(node.type, node.icon);
  const isCustomFamily = String(node.type || "").startsWith("Custom:");
  const displayStatus = hasData ? toInfraDisplayStatus(node.status) : "disabled";
  const isAttention = hasData && displayStatus === "attention";
  const isClear = hasData && !isAttention;
  const statusTooltip = isClear ? null : copy.getStatusLabel(node.status);
  const tooltipLines = [node.displayName || node.name, statusTooltip, node.subtitle, hasData ? copy.formatEquipmentCount(node.count) : null].filter(Boolean);
  return <SmartTooltip content={tooltipLines.join(" · ")} as="span">
      <button type="button" className={[styles.hexNode, isCustomFamily ? styles.hexNodeCustom : "", isAttention ? styles.hexNodeAttention : "", isClear ? styles.hexNodeClear : ""].filter(Boolean).join(" ")} style={{
      "--hex-accent": meta.color,
      "--hex-soft": meta.soft
    }} onClick={() => onClick?.(node)} aria-label={`${node.displayName || node.name}${statusTooltip ? `, ${statusTooltip}` : ""}${node.count > 0 ? `, ${copy.formatEquipmentCount(node.count)}` : ""}`}>
        <span className={`${styles.hexShape} ${tileShapeClass(tileShapeProp || node.tileShape)}`} aria-hidden>
          <span className={styles.hexInner}>
            <Icon icon={icon} className={styles.hexIcon} />
            <span className={styles.hexName}>{node.displayName || node.name}</span>
            {node.count > 0 && <span className={styles.infraItemCount} aria-hidden>
                {node.count}
              </span>}
          </span>
        </span>
      </button>
    </SmartTooltip>;
}
function remToPx(rem) {
  const root = typeof document === "undefined" ? 16 : parseFloat(getComputedStyle(document.documentElement).fontSize);
  return rem * (Number.isFinite(root) && root > 0 ? root : 16);
}
function HoneycombCluster({
  items,
  clusterMetrics,
  tileShape = "hexagon"
}) {
  const viewportRef = useRef(null);
  const [viewportWidth, setViewportWidth] = useState(0);
  const metrics = clusterMetrics || {
    widthRem: 38,
    heightRem: 24,
    layoutScale: 1,
    displayScale: 1,
    rawWidthRem: 38,
    rawHeightRem: 24,
    originX: 0,
    originY: 0
  };
  useEffect(() => {
    const node = viewportRef.current;
    if (!node || typeof ResizeObserver === "undefined") return undefined;
    const observer = new ResizeObserver(entries => {
      const width = entries[0]?.contentRect?.width;
      if (width) setViewportWidth(width);
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  const rawWidthPx = remToPx(metrics.rawWidthRem);
  const rawHeightPx = remToPx(metrics.rawHeightRem);
  const fitScale = viewportWidth && rawWidthPx ? Math.min(1.15, viewportWidth / rawWidthPx) : Math.min(1, metrics.displayScale || 1);
  const fittedWidth = rawWidthPx * fitScale;
  const fittedHeight = rawHeightPx ? rawHeightPx * fitScale + 12 : remToPx(metrics.heightRem);
  return <div ref={viewportRef} className={styles.hexClusterViewport} style={{
    height: `${fittedHeight}px`
  }}>
      <div className={styles.hexClusterFit} style={{
      width: `${fittedWidth}px`,
      height: `${fittedHeight - 12}px`
    }}>
      <div className={styles.hexCluster} style={{
      "--hex-layout-scale": metrics.layoutScale,
      ...(isSquareTileShape(tileShape) ? {
        "--tile-h": "var(--hex-w)"
      } : {}),
      width: `${metrics.rawWidthRem}rem`,
      height: `${metrics.rawHeightRem}rem`,
      transform: `scale(${fitScale})`
    }}>
      {items.map(item => {
        const slot = item.slot || EMPTY_HONEYCOMB_LAYOUT.find(entry => entry.type === item.type) || {};
        const featured = Boolean(slot.featured ?? isHoneycombFeatured(item.type));
        const {
          x,
          y
        } = honeycombDisplayOffsetRem(slot.q ?? 0, slot.r ?? 0, metrics);
        return <div key={item.key} className={`${styles.hexSlot} ${featured ? styles.hexSlotFeatured : ""}`} style={{
          "--hex-x": `${x}rem`,
          "--hex-y": `${y}rem`
        }}>
            {item.node}
          </div>;
      })}
      </div>
      </div>
    </div>;
}
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
  items,
  honeycombEmpty = false,
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
  customFamilyBricks = [],
  tileShape = "hexagon",
  onBrickClick,
  isCommunity = false,
  copy
}) {
  const brickGroups = buildInfraBrickGroups({
    empty: honeycombEmpty,
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
  const groups = customFamilyBricks.length > 0 ? [...brickGroups, {
    id: "custom",
    label: copy.customEquipmentGroup,
    bricks: customFamilyBricks
  }] : brickGroups;
  const hexClusters = buildHoneycombThemeClusters(items);
  return <div className={`${styles.mapCard} ${honeycombEmpty ? styles.mapCardEmpty : ""}`}>
      <div className={styles.mapCanvas}>
        <div className={styles.mapLayout}>
          <div className={styles.mapHoneycomb}>
            {hexClusters.map(cluster => <HoneycombCluster key={cluster.id} items={cluster.items} clusterMetrics={cluster.clusterMetrics} tileShape={tileShape} />)}
          </div>
          <div className={styles.mapModulesBar}>
            <div className={styles.mapModulesRow}>
              {groups.map(group => <div key={group.id} className={styles.mapModuleGroup}>
                  <span className={styles.mapModuleZoneLabel}>{group.label}</span>
                  <InfraBrickColumn className={styles.brickRow} ariaLabel={group.label} bricks={group.bricks} placeholder={honeycombEmpty} onBrickClick={onBrickClick} isCommunity={isCommunity} copy={copy} />
                </div>)}
            </div>
          </div>
        </div>
      </div>
    </div>;
}
function InfraPlaceholderHex({
  type,
  featured = false,
  icon,
  label,
  tileShape,
  copy
}) {
  const meta = copy.getStatusMeta("disabled");
  const resolvedIcon = getInfraTypeIcon(type, icon);
  const resolvedLabel = copy.getHoneycombTypeLabel(type, label);
  return <div className={`${styles.hexNode} ${styles.hexNodePlaceholder} ${styles.hexNodeDisabled} ${featured ? styles.hexNodeFeatured : ""}`} style={{
    "--hex-accent": meta.color,
    "--hex-soft": meta.soft
  }} aria-hidden>
      <span className={`${styles.hexShape} ${tileShapeClass(tileShape)}`}>
        <span className={styles.hexInner}>
          <Icon icon={resolvedIcon} className={styles.hexIcon} />
          <span className={styles.hexName}>{resolvedLabel}</span>
        </span>
      </span>
    </div>;
}
function InfraEmptyMap({
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
  customFamilyMap = [],
  displayTiles = [],
  tileShape = "hexagon",
  onNodeClick,
  onBrickClick,
  isCommunity = false,
  copy
}) {
  const items = (displayTiles.length ? displayTiles : buildHoneycombEditorTiles({
    customFamilies: customFamilyMap
  })).map(tile => {
    const slot = {
      type: tile.key,
      q: tile.q,
      r: tile.r
    };
    if (tile.isSystem) {
      return {
        key: tile.key,
        type: tile.familyKey,
        slot,
        node: <InfraPlaceholderHex type={tile.familyKey} tileShape={tileShape} copy={copy} />
      };
    }
    const family = customFamilyMap.find(entry => entry.familyKey === tile.familyKey) || {
      familyKey: tile.familyKey,
      label: tile.label,
      icon: tile.icon
    };
    return {
      key: tile.key,
      type: tile.key,
      slot,
      node: <InfraHexNode node={{
        type: tile.key,
        name: family.label || tile.label,
        displayName: family.label || tile.label,
        status: "unmonitored",
        count: 0,
        icon: family.icon || tile.icon,
        familyKey: family.familyKey,
        customFamily: family,
        tileShape
      }} tileShape={tileShape} onClick={onNodeClick} copy={copy} />
    };
  });
  const customFamilyBricks = buildCustomFamilyBricks(customFamilyMap);
  return <div className={styles.map}>
      <div className={styles.emptyMapBanner} role="status">
        <Icon icon="mdi:hexagon-multiple-outline" className={styles.emptyMapBannerIcon} aria-hidden />
        <div className={styles.emptyMapBannerText}>
          <p className={styles.emptyMapBannerTitle}>{copy.emptyTitle}</p>
          <p className={styles.emptyMapBannerHint}>{copy.emptyHint}</p>
        </div>
      </div>

      <InfraMapCanvas honeycombEmpty backupInstances={backupInstances} items={items} antivirusItems={antivirusItems} antispamItems={antispamItems} domainItems={domainItems} domainIntegrationReady={domainIntegrationReady} sslItems={sslItems} licenceItems={licenceItems} tenantInfo={tenantInfo} googleWorkspaceInfo={googleWorkspaceInfo} campaignItems={campaignItems} customFamilyBricks={customFamilyBricks} tileShape={tileShape} onBrickClick={onBrickClick} isCommunity={isCommunity} copy={copy} />
    </div>;
}
function InfraMapSkeleton({
  copy
}) {
  return <div className={styles.skeleton} aria-busy="true" aria-label={copy.loadingAria}>
      <div className={styles.skeletonMapCard}>
        <div className={styles.mapCanvas}>
        <div className={styles.mapLayout}>
          <div className={styles.mapHoneycomb}>
            {buildHoneycombThemeClusters(HONEYCOMB_THEME_GROUPS.flatMap(group => group.slots.map(slot => ({
              key: slot.type,
              type: slot.type,
              slot
            })))).map(cluster => <HoneycombCluster key={cluster.id} clusterMetrics={cluster.clusterMetrics} items={cluster.items.map(item => ({
              ...item,
              node: <div className={styles.skeletonHex} />
            }))} />)}
          </div>
          <div className={styles.mapModulesBar}>
            <div className={styles.mapModulesRow}>
              {INFRA_BRICK_GROUPS.map(group => <div key={group.id} className={styles.mapModuleGroup}>
                  <span className={styles.mapModuleZoneLabel}>
                    {copy.getBrickGroupLabel(group.id)}
                  </span>
                  <div className={styles.brickRow}>
                    {group.types.map(type => <div key={type} className={styles.skeletonBrick} />)}
                  </div>
                </div>)}
            </div>
          </div>
        </div>
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
  customFamilyMap = [],
  siteFilter = null,
  equipmentRevision = 0,
  onNodeClick,
  onBrickClick,
  isCommunity = false
}) {
  const locale = useAppLocale();
  const copy = useMemo(() => getInfraMapCopy(locale), [locale]);
  const { layouts, tileShape } = useSystemFamilyExtensions();
  const {
    enabled: checkmkIntegrationEnabled
  } = useCheckMKIntegrationEnabled();
  const [equipment, setEquipment] = useState([]);
  const [summaries, setSummaries] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const clientSnapshotRef = useRef(clientSnapshot);
  clientSnapshotRef.current = clientSnapshot;
  const equipementsCount = useMemo(() => {
    const equipements = clientSnapshot?.equipements;
    if (!equipements || typeof equipements !== "object") return 0;
    return Object.values(equipements).reduce((total, list) => total + (Array.isArray(list) ? list.length : 0), 0);
  }, [clientSnapshot]);
  useEffect(() => {
    if (!clientId) return undefined;
    const controller = new AbortController();
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [clientEquipment, summaryData] = await Promise.all([getClientHardwareEquipment(clientId, {
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
        setEquipment(clientEquipment || []);
        setSummaries(summaryData?.summaries || {});
      } catch (err) {
        if (err?.name === "AbortError" || cancelled) return;
        setError(err.message || copy.loadError);
        setEquipment([]);
        setSummaries({});
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [clientId, equipementsCount, checkmkIntegrationEnabled, equipmentRevision, copy.loadError]);
  const localizeCategoryNode = useCallback((type, nodes) => {
    const raw = aggregateCategoryNode(type, nodes);
    return {
      ...raw,
      displayName: copy.getHoneycombTypeLabel(type)
    };
  }, [copy]);
  const filteredEquipment = useMemo(() => filterBySite(equipment, siteFilter), [equipment, siteFilter]);
  const filteredBackupInstances = useMemo(() => filterBySite(backupInstances, siteFilter), [backupInstances, siteFilter]);
  const filteredAntivirusItems = useMemo(() => filterBySite(antivirusItems, siteFilter), [antivirusItems, siteFilter]);
  const filteredAntispamItems = useMemo(() => filterBySite(antispamItems, siteFilter), [antispamItems, siteFilter]);
  const filteredDomainItems = useMemo(() => filterBySite(domainItems, siteFilter), [domainItems, siteFilter]);
  const filteredSslItems = useMemo(() => filterBySite(sslItems, siteFilter), [siteFilter, sslItems]);
  const filteredLicenseItems = useMemo(() => filterBySite(licenceItems, siteFilter), [licenceItems, siteFilter]);
  const filteredCampaignItems = useMemo(() => filterBySite(campaignItems, siteFilter), [campaignItems, siteFilter]);
  const filteredCustomFamilyMap = useMemo(() => filterCustomFamilyMap(customFamilyMap, siteFilter), [customFamilyMap, siteFilter]);
  const filteredTenantInfo = useMemo(() => {
    if (!siteFilter) return tenantInfo;
    return matchesSiteFilter(tenantInfo, siteFilter) ? tenantInfo : {};
  }, [tenantInfo, siteFilter]);
  const model = useMemo(() => buildInfraMapModel({
    equipment: filteredEquipment,
    summaries,
    checkmkEnabled: checkmkIntegrationEnabled
  }), [filteredEquipment, summaries, checkmkIntegrationEnabled]);
  const honeycombNodes = useMemo(() => model.nodes, [model.nodes]);
  const displayTiles = useMemo(() => buildHoneycombEditorTiles({
    layouts,
    customFamilies: customFamilyMap
  }), [layouts, customFamilyMap]);
  const honeycombItems = useMemo(() => {
    const nodesByType = honeycombNodes.reduce((acc, node) => {
      if (!acc[node.type]) acc[node.type] = [];
      acc[node.type].push(node);
      return acc;
    }, {});
    return displayTiles.map(tile => {
      const slot = {
        type: tile.key,
        q: tile.q,
        r: tile.r
      };
      if (tile.isSystem) {
        const categoryNode = {
          ...localizeCategoryNode(tile.familyKey, nodesByType[tile.familyKey] || []),
          tileShape
        };
        const hasData = categoryNode.count > 0;
        return {
          key: tile.key,
          type: tile.familyKey,
          slot,
          node: hasData ? <InfraHexNode node={categoryNode} tileShape={tileShape} onClick={onNodeClick} copy={copy} /> : <InfraPlaceholderHex type={tile.familyKey} featured={slot.featured} tileShape={tileShape} copy={copy} />
        };
      }
      const family = filteredCustomFamilyMap.find(entry => entry.familyKey === tile.familyKey) || customFamilyMap.find(entry => entry.familyKey === tile.familyKey) || {
        familyKey: tile.familyKey,
        label: tile.label,
        icon: tile.icon,
        items: [],
        count: 0
      };
      const type = tile.key;
      const nodes = (family.items || []).map(item => ({
        type,
        id: item.id,
        name: item.name,
        displayName: item.name,
        status: "unmonitored",
        familyKey: family.familyKey,
        customFamily: family,
        icon: family.icon || tile.icon
      }));
      const categoryNode = {
        ...localizeCategoryNode(type, nodes),
        displayName: family.label || tile.label,
        icon: family.icon || tile.icon,
        familyKey: family.familyKey,
        customFamily: family,
        tileShape
      };
      return {
        key: type,
        type,
        slot,
        node: <InfraHexNode node={categoryNode} tileShape={tileShape} onClick={onNodeClick} copy={copy} />
      };
    });
  }, [honeycombNodes, displayTiles, customFamilyMap, filteredCustomFamilyMap, onNodeClick, copy, localizeCategoryNode, tileShape]);
  const customFamilyBricks = useMemo(() => buildCustomFamilyBricks(filteredCustomFamilyMap), [filteredCustomFamilyMap]);
  const hasCustomFamilies = (customFamilyMap || []).length > 0;
  const hasMapContent = model.nodes.length > 0 || hasCustomFamilies || filteredBackupInstances.length > 0;
  const mapCanvasProps = {
    honeycombEmpty: model.nodes.length === 0 && !hasCustomFamilies,
    backupInstances: filteredBackupInstances,
    items: honeycombItems,
    antivirusItems: filteredAntivirusItems,
    antispamItems: filteredAntispamItems,
    domainItems: filteredDomainItems,
    domainIntegrationReady,
    sslItems: filteredSslItems,
    licenceItems: filteredLicenseItems,
    tenantInfo: filteredTenantInfo,
    googleWorkspaceInfo,
    campaignItems: filteredCampaignItems,
    customFamilyBricks,
    tileShape,
    onBrickClick,
    isCommunity,
    copy
  };
  if (loading) {
    return <InfraMapSkeleton copy={copy} />;
  }
  if (error) {
    return <div className={styles.errorState}>
        <Icon icon="mdi:map-marker-alert-outline" aria-hidden />
        <span>{error}</span>
      </div>;
  }
  if (!hasMapContent) {
    return <InfraEmptyMap backupInstances={filteredBackupInstances} antivirusItems={antivirusItems} antispamItems={antispamItems} domainItems={domainItems} domainIntegrationReady={domainIntegrationReady} sslItems={sslItems} licenceItems={licenceItems} tenantInfo={tenantInfo} googleWorkspaceInfo={googleWorkspaceInfo} campaignItems={campaignItems} customFamilyMap={filteredCustomFamilyMap} displayTiles={displayTiles} tileShape={tileShape} onNodeClick={onNodeClick} onBrickClick={onBrickClick} isCommunity={isCommunity} copy={copy} />;
  }
  return <div className={styles.map}>
      <InfraMapCanvas {...mapCanvasProps} />
    </div>;
}
