import React, { useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import { FaSync, FaTimes } from "react-icons/fa";
import { getEquipmentListKey } from "../../utils/equipmentIdentity";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { EQUIPMENT_MONITOR_META, buildMonitorStatusCounts, buildMonitoringTodoActions, computeEquipmentHealthScore } from "./equipmentMspUtils";
import { buildEquipmentMonitoringSummary, equipmentHasMonitoringIssues, formatEquipmentLastCollection } from "./equipmentSupervisionUtils";
import { getRmmAgentVersion } from "./rmmMonitoringUtils";
import { useSupervisionAlertRules } from "../../hooks/useSupervisionAlertRules";
import { isMonitorStatusAlertEnabled } from "./supervisionAlertRulesConfig";
import fleetStyles from "../CybersecuritePage/AntivirusMspDashboard.module.css";
import MspEmptyState from "../Misc/MspEmptyState/MspEmptyState";
import { getEquipmentMspPanelCopy } from "./equipmentMspPanelI18n";
import styles from "./EquipmentMspPanel.module.css";
const FLEET_TYPE_ALL = "__all__";
function toneToDotColor(tone) {
  if (tone === "bad") return "#dc2626";
  if (tone === "warn") return "#d97706";
  if (tone === "good") return "#2b5fab";
  return "#94a3b8";
}
function resolveRowDotTone(summary, primaryIssue) {
  const tones = [summary?.tone, primaryIssue?.tone].filter(Boolean);
  if (tones.includes("bad")) return "bad";
  if (tones.includes("warn")) return "warn";
  if (tones.includes("good")) return "good";
  return "neutral";
}
function FleetStatusChip({
  label,
  tone = "neutral",
  title
}) {
  if (!label || label === "-") {
    return <span className={fleetStyles.cellMuted}>-</span>;
  }
  const chipTone = tone === "critical" ? "bad" : tone;
  return <span className={`${fleetStyles.chip} ${fleetStyles[`chip_${chipTone}`] || fleetStyles.chip_neutral}`} title={title}>
      {label}
    </span>;
}
function HealthGauge({
  score
}) {
  const value = score ?? 0;
  const tone = score == null ? "neutral" : value >= 80 ? "good" : value >= 50 ? "warn" : "bad";
  return <div className={`${styles.healthGauge} ${styles[`healthGauge_${tone}`]}`}>
      <svg className={styles.healthRing} viewBox="0 0 120 120" aria-hidden>
        <circle className={styles.healthRingTrack} cx="60" cy="60" r="52" />
        <circle className={styles.healthRingFill} cx="60" cy="60" r="52" style={{
        strokeDasharray: `${value / 100 * 327} 327`
      }} />
      </svg>
      <div className={styles.healthGaugeCore}>
        <span className={styles.healthScore}>{score ?? "-"}</span>
        <span className={styles.healthLabel}>Fleet health</span>
      </div>
    </div>;
}
function KpiTile({
  icon,
  label,
  value,
  sub,
  tone = "default"
}) {
  return <div className={`${styles.kpiTile} ${styles[`kpiTile_${tone}`]}`}>
      <div className={styles.kpiIcon}>
        <Icon icon={icon} width={20} />
      </div>
      <div className={styles.kpiBody}>
        <span className={styles.kpiValue}>{value}</span>
        <span className={styles.kpiLabel}>{label}</span>
        {sub ? <span className={styles.kpiSub}>{sub}</span> : null}
      </div>
    </div>;
}
function StatusBadge({
  status,
  compact = false
}) {
  const meta = EQUIPMENT_MONITOR_META[status] || EQUIPMENT_MONITOR_META.neutral;
  return <span className={`${styles.statusBadge} ${compact ? styles.statusBadgeCompact : ""}`} style={{
    color: meta.color,
    background: meta.soft
  }}>
      <Icon icon={meta.icon} width={compact ? 11 : 13} />
      {meta.label}
    </span>;
}
function DeviceFleetTableRow({
  equipment,
  displayType,
  showClientName = true,
  typeIconMap,
  resolveMonitorStatus,
  getMkSummary,
  isMkMapped,
  checkmkEnabled,
  alertRules,
  onOpen,
  onMiddleClick,
  renderActions,
  copy
}) {
  const monitorStatus = resolveMonitorStatus(equipment);
  const mkSummary = getMkSummary?.(equipment);
  const mapped = isMkMapped?.(equipment);
  const summary = buildEquipmentMonitoringSummary(equipment, {
    monitorStatus,
    checkmkEnabled,
    isMkMapped: mapped,
    alertRules
  });
  const primaryIssue = !summary.isUpToDate ? summary.issues[0] : null;
  const lastCollection = formatEquipmentLastCollection(equipment, mkSummary);
  const dotTone = resolveRowDotTone(summary, primaryIssue);
  const typeLabel = copy.getTypeLabel(displayType);
  const nameSubtitle = equipment.model || typeLabel;
  const agentVersion = getRmmAgentVersion(equipment);
  const openEquipment = () => onOpen?.(equipment);
  return <tr className={fleetStyles.tableRow} onClick={openEquipment} onMouseDown={e => {
    if (e.button === 1) onMiddleClick?.(e, equipment);
  }} tabIndex={0} onKeyDown={e => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      openEquipment();
    }
  }}>
      <td>
        <span className={fleetStyles.statusDot} style={{
        background: toneToDotColor(dotTone)
      }} aria-hidden />
      </td>
      <td>
        <div className={fleetStyles.solutionCell}>
          <Icon icon={typeIconMap?.[displayType] || "mdi:devices"} className={fleetStyles.solutionLogoIcon} aria-hidden />
          <div className={fleetStyles.solutionText}>
            <span className={fleetStyles.cellName} title={equipment.name || undefined}>
              {equipment.name || copy.row.noName}
            </span>
            {nameSubtitle ? <span className={fleetStyles.cellSub} title={nameSubtitle}>
                {nameSubtitle}
              </span> : null}
          </div>
        </div>
      </td>
      {showClientName ? <td>
          <span className={fleetStyles.cellName} title={equipment.clientName || undefined}>
            {equipment.clientName || "-"}
          </span>
        </td> : null}
      <td className={fleetStyles.cellMuted} title={equipment.location || undefined}>
        {equipment.location || "-"}
      </td>
      <td className={agentVersion ? styles.agentVersionCell : fleetStyles.cellMuted} title={agentVersion || undefined}>
        {agentVersion || "-"}
      </td>
      <td>
        <div className={styles.supervisionChipRow}>
          <FleetStatusChip label={summary.label} tone={summary.tone} title={summary.detail} />
          {primaryIssue ? <FleetStatusChip label={primaryIssue.label} tone={primaryIssue.tone} title={primaryIssue.detail} /> : null}
        </div>
      </td>
      <td className={fleetStyles.cellMuted}>
        {lastCollection ? <span title={copy.formatLastCollectionTitle(lastCollection.source)}>
            {lastCollection.formatted}
          </span> : "-"}
      </td>
      <td className={styles.colActions} onClick={e => e.stopPropagation()}>
        <div className={styles.tableRowActions}>
          {renderActions ? renderActions(equipment, displayType) : null}
        </div>
      </td>
    </tr>;
}
function DeviceFleetTable({
  groups,
  showGroupLabels,
  showClientName = true,
  typeIconMap,
  resolveMonitorStatus,
  getMkSummary,
  isMkMapped,
  checkmkEnabled,
  alertRules,
  onOpen,
  onMiddleClick,
  renderActions,
  copy
}) {
  const [collapsed, setCollapsed] = useState({});
  const toggleGroup = type => {
    setCollapsed(prev => ({
      ...prev,
      [type]: !prev[type]
    }));
  };
  const colCount = showClientName ? 8 : 7;
  return <section className={`${fleetStyles.panel} ${styles.fleetTablePanel}`}>
      <div className={fleetStyles.tableWrap}>
        <table className={fleetStyles.table}>
          <thead>
            <tr>
              <th aria-label={copy.fleetTable.statusAria} />
              <th>{copy.fleetTable.name}</th>
              {showClientName ? <th>{copy.fleetTable.company}</th> : null}
              <th>{copy.fleetTable.locations}</th>
              <th>{copy.fleetTable.agent}</th>
              <th>{copy.fleetTable.supervision}</th>
              <th>{copy.fleetTable.lastSync}</th>
              <th className={styles.colActions} aria-label={copy.fleetTable.actionsAria} />
            </tr>
          </thead>
          <tbody>
            {groups.map(({
            type,
            typeLabel,
            list
          }) => {
            const isCollapsed = showGroupLabels && collapsed[type] === true;
            const groupLabel = typeLabel || copy.getTypeLabel(type);
            return <React.Fragment key={type}>
                  {showGroupLabels ? <tr className={fleetStyles.segmentRow}>
                      <td colSpan={colCount}>
                        <button type="button" className={fleetStyles.segmentBtn} onClick={() => toggleGroup(type)} aria-expanded={!isCollapsed}>
                          <Icon icon={typeIconMap[type] || "mdi:devices"} width={16} aria-hidden />
                          <span className={fleetStyles.segmentLabel}>{groupLabel}</span>
                          <span className={fleetStyles.segmentCount}>{list.length}</span>
                          <Icon icon={isCollapsed ? "mdi:chevron-right" : "mdi:chevron-down"} aria-hidden />
                        </button>
                      </td>
                    </tr> : null}
                  {!isCollapsed ? list.map(equipment => <DeviceFleetTableRow key={getEquipmentListKey(equipment)} equipment={equipment} displayType={type} showClientName={showClientName} typeIconMap={typeIconMap} resolveMonitorStatus={resolveMonitorStatus} getMkSummary={getMkSummary} isMkMapped={isMkMapped} checkmkEnabled={checkmkEnabled} alertRules={alertRules} onOpen={onOpen} onMiddleClick={onMiddleClick} renderActions={renderActions} copy={copy} />) : null}
                </React.Fragment>;
          })}
          </tbody>
        </table>
      </div>
    </section>;
}
function DeviceCard({
  equipment,
  displayType,
  showClient,
  monitorStatus,
  mkSummary,
  isMkMapped,
  checkmkEnabled,
  onOpen,
  onMiddleClick,
  renderActions,
  renderMonitoringBadge,
  copy
}) {
  const meta = EQUIPMENT_MONITOR_META[monitorStatus] || EQUIPMENT_MONITOR_META.neutral;
  const subtitle = [equipment.ip, equipment.location].filter(Boolean).join(" · ");
  return <article className={styles.deviceCard} onClick={() => onOpen?.(equipment)} onMouseDown={e => {
    if (e.button === 1) onMiddleClick?.(e, equipment);
  }} role="button" tabIndex={0} onKeyDown={e => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onOpen?.(equipment);
    }
  }}>
      <span className={styles.deviceStatusBar} style={{
      background: meta.color
    }} />
      <div className={styles.deviceCardHead}>
        <div className={styles.deviceTitleBlock}>
          <span className={styles.deviceName}>{equipment.name || "Unnamed"}</span>
          {showClient ? <span className={styles.deviceClient}>{equipment.clientName}</span> : null}
        </div>
        <StatusBadge status={monitorStatus} />
      </div>
      <div className={styles.deviceMeta}>
        <span className={styles.deviceType}>{copy.getTypeLabel(displayType)}</span>
        {equipment.model ? <span className={styles.deviceSub}>{equipment.model}</span> : null}
        {subtitle ? <span className={styles.deviceSub}>{subtitle}</span> : null}
      </div>
      <div className={styles.deviceCardFoot} onClick={e => e.stopPropagation()}>
        {checkmkEnabled && isMkMapped && renderMonitoringBadge ? <div className={styles.deviceMkBadge}>
            {renderMonitoringBadge(equipment, mkSummary)}
          </div> : null}
        {renderActions ? <div className={styles.deviceActions}>{renderActions(equipment, displayType)}</div> : null}
      </div>
    </article>;
}
function ActionQueue({
  actions,
  onOpen
}) {
  if (!actions.length) return null;
  return <section className={styles.actionQueue}>
      <header className={styles.actionQueueHeader}>
        <Icon icon="mdi:lightning-bolt" width={20} />
        <h3>Priority actions</h3>
        <span className={styles.actionQueueCount}>{actions.length}</span>
      </header>
      <div className={styles.actionList}>
        {actions.map(({
        equipment,
        status
      }) => {
        const meta = EQUIPMENT_MONITOR_META[status] || EQUIPMENT_MONITOR_META.neutral;
        return <button key={getEquipmentListKey(equipment)} type="button" className={styles.actionItem} onClick={() => onOpen?.(equipment)}>
              <span className={styles.actionDot} style={{
            background: meta.color
          }} />
              <div className={styles.actionBody}>
                <span className={styles.actionName}>{equipment.name}</span>
                <span className={styles.actionMeta}>
                  {equipment.clientName ? `${equipment.clientName} · ` : ""}
                  {equipment.type === "NAS" ? "Storage" : equipment.type}
                  {equipment.ip ? ` · ${equipment.ip}` : ""}
                </span>
              </div>
              <span className={styles.actionVerb} style={{
            color: meta.color
          }}>
                {status === "critical" || status === "offline" ? "Act" : status === "warning" ? "Review" : "Monitor"}
              </span>
            </button>;
      })}
      </div>
    </section>;
}
function MspSkeleton({
  embedded
}) {
  return <div className={styles.skeleton} data-embedded={embedded || undefined}>
      <div className={styles.skeletonHero} />
      <div className={styles.skeletonGrid}>
        <div />
        <div />
        <div />
        <div />
      </div>
    </div>;
}
export default function EquipmentMspPanel({
  embedded = false,
  sectionMode = false,
  loading = false,
  error = null,
  showClientName = true,
  typeOrder = [],
  typeIconMap = {},
  equipmentByType = {},
  typeCounts = {},
  activeType = null,
  statsItems = [],
  checkmkIntegrationEnabled = false,
  mkAlertStats = {},
  mkStatusFilter = null,
  onMkStatusFilter,
  onClearMkFilter,
  onBulkMkSync,
  mkBulkSyncing = false,
  mkBulkSyncProgress = {
    done: 0,
    total: 0
  },
  onTypeSelect,
  onEquipmentOpen,
  onEquipmentMiddleClick,
  resolveMonitorStatus,
  getMkSummary,
  isMkMapped,
  renderCardActions,
  renderMonitoringBadge,
  getEmptyMessage,
  getEquipmentTags,
  searchQuery = "",
  panelCopy: panelCopyProp = null,
  onSearchChange,
  headerActions = null,
  title = "Monitoring center",
  defaultStatusFilter = null,
  statusFilter: statusFilterProp,
  onStatusFilterChange
}) {
  const locale = useAppLocale();
  const internalCopy = useMemo(() => getEquipmentMspPanelCopy(locale), [locale]);
  const copy = panelCopyProp || internalCopy;
  const {
    rules: alertRules
  } = useSupervisionAlertRules();
  const hideChrome = embedded || sectionMode;
  const [internalFilter, setInternalFilter] = useState(defaultStatusFilter || "all");
  const [fleetTypeScope, setFleetTypeScope] = useState(FLEET_TYPE_ALL);
  const isControlled = statusFilterProp !== undefined;
  const localFilter = isControlled ? statusFilterProp : internalFilter;
  const setLocalFilter = next => {
    if (!isControlled) setInternalFilter(next);
    onStatusFilterChange?.(next);
  };
  useEffect(() => {
    if (!isControlled && defaultStatusFilter) {
      setInternalFilter(defaultStatusFilter);
    }
  }, [defaultStatusFilter, isControlled]);
  useEffect(() => {
    if (!sectionMode) return;
    if (fleetTypeScope === FLEET_TYPE_ALL) return;
    if (activeType && fleetTypeScope !== activeType) {
      setFleetTypeScope(activeType);
    }
  }, [sectionMode, activeType, fleetTypeScope]);
  const statusCounts = useMemo(() => buildMonitorStatusCounts(statsItems, resolveMonitorStatus, {
    alertRules
  }), [statsItems, resolveMonitorStatus, alertRules]);
  const healthScore = useMemo(() => computeEquipmentHealthScore(statusCounts), [statusCounts]);
  const priorityActions = useMemo(() => buildMonitoringTodoActions(statsItems, resolveMonitorStatus, {
    limit: 10,
    alertRules,
    checkmkEnabled: checkmkIntegrationEnabled,
    isMkMapped
  }), [statsItems, resolveMonitorStatus, alertRules, checkmkIntegrationEnabled, isMkMapped]);
  const totalDeviceCount = useMemo(() => typeOrder.reduce((sum, type) => sum + (typeCounts[type] || 0), 0), [typeOrder, typeCounts]);
  const typesToRender = useMemo(() => {
    if (sectionMode) {
      if (fleetTypeScope === FLEET_TYPE_ALL) {
        return typeOrder.filter(type => (equipmentByType[type] || []).length > 0);
      }
      return fleetTypeScope ? [fleetTypeScope] : activeType ? [activeType] : [];
    }
    if (activeType) return [activeType];
    return typeOrder.filter(type => (equipmentByType[type] || []).length > 0);
  }, [activeType, sectionMode, typeOrder, equipmentByType, fleetTypeScope]);
  const filterList = list => {
    if (localFilter === "issues") {
      return list.filter(eq => {
        const s = resolveMonitorStatus(eq);
        if (!["critical", "warning", "offline"].includes(s)) return false;
        return isMonitorStatusAlertEnabled(eq, s, alertRules);
      });
    }
    if (localFilter === "todo") {
      return list.filter(eq => {
        const monitorStatus = resolveMonitorStatus(eq);
        const summary = buildEquipmentMonitoringSummary(eq, {
          monitorStatus,
          checkmkEnabled: checkmkIntegrationEnabled,
          isMkMapped: isMkMapped?.(eq),
          alertRules
        });
        return equipmentHasMonitoringIssues(summary);
      });
    }
    if (localFilter === "unmapped") {
      return list.filter(eq => resolveMonitorStatus(eq) === "unmapped");
    }
    return list;
  };
  const supervisionStats = useMemo(() => {
    if (!sectionMode) return null;
    let todo = 0;
    let upToDate = 0;
    (statsItems || []).forEach(eq => {
      const summary = buildEquipmentMonitoringSummary(eq, {
        monitorStatus: resolveMonitorStatus(eq),
        checkmkEnabled: checkmkIntegrationEnabled,
        isMkMapped: isMkMapped?.(eq),
        alertRules
      });
      if (summary.isUpToDate) upToDate += 1;else todo += 1;
    });
    return {
      total: statsItems.length,
      todo,
      upToDate
    };
  }, [sectionMode, statsItems, resolveMonitorStatus, checkmkIntegrationEnabled, isMkMapped]);
  const statusFilterCounts = useMemo(() => ({
    all: statusCounts.total || 0,
    issues: statusCounts.issues || 0,
    todo: supervisionStats?.todo || 0,
    unmapped: statusCounts.unmapped || 0
  }), [statusCounts, supervisionStats]);
  const renderStatusFilters = (compact = false) => <div className={`${styles.filterGroup} ${compact ? styles.filterGroupCompact : ""}`} role="group" aria-label={copy.filters.aria}>
      {copy.statusFilters.map(f => {
      const count = statusFilterCounts[f.id] ?? 0;
      const disabled = f.id !== "all" && count === 0;
      return <button key={f.id} type="button" className={`${styles.filterChip} ${localFilter === f.id ? styles.filterChipActive : ""}`} disabled={disabled} aria-pressed={localFilter === f.id} onClick={() => setLocalFilter(f.id)}>
            {f.label}
            {compact && f.id !== "all" ? <span className={styles.filterChipCount}>{count}</span> : null}
          </button>;
    })}
    </div>;
  if (loading) return <MspSkeleton embedded={embedded} />;
  if (error) return <div className={styles.errorState}>{error}</div>;
  const portfolioHasDevices = typeOrder.some(type => (typeCounts[type] || 0) > 0);
  const hasAny = sectionMode ? portfolioHasDevices : typesToRender.some(t => (equipmentByType[t] || []).length > 0);
  const selectedFleetType = fleetTypeScope === FLEET_TYPE_ALL ? null : fleetTypeScope || activeType;
  const hasVisibleAfterFilter = sectionMode ? typesToRender.some(t => filterList(equipmentByType[t] || []).length > 0) : typesToRender.some(t => filterList(equipmentByType[t] || []).length > 0);
  const fleetGroups = sectionMode ? typesToRender.map(type => ({
    type,
    typeLabel: copy.getTypeLabel(type),
    list: filterList(equipmentByType[type] || [])
  })).filter(group => group.list.length > 0) : [];
  const handleFleetTypeSelect = type => {
    setFleetTypeScope(type);
    if (type !== FLEET_TYPE_ALL) {
      onTypeSelect?.(type);
    }
  };
  const renderFamilyTypeTabs = () => <div className={styles.familyTypeTabs} role="tablist" aria-label={copy.toolbar.typeTabsAria}>
      <button type="button" role="tab" aria-selected={fleetTypeScope === FLEET_TYPE_ALL} className={`${styles.familyTypeTab} ${fleetTypeScope === FLEET_TYPE_ALL ? styles.familyTypeTabActive : ""}`} onClick={() => handleFleetTypeSelect(FLEET_TYPE_ALL)} title={copy.formatTypeAllTitle?.(totalDeviceCount) || copy.toolbar.typeAll} aria-label={copy.formatTypeAllTitle?.(totalDeviceCount) || copy.toolbar.typeAll}>
        <Icon icon="mdi:view-grid-outline" width={16} aria-hidden />
        <span>{copy.toolbar.typeAll}</span>
        <span className={styles.familyTypeTabCount}>{totalDeviceCount}</span>
      </button>
      {typeOrder.map(type => {
      const count = typeCounts[type] || 0;
      const isActive = fleetTypeScope === type;
      return <button key={type} type="button" role="tab" aria-selected={isActive} className={`${styles.familyTypeTab} ${isActive ? styles.familyTypeTabActive : ""}`} onClick={() => handleFleetTypeSelect(type)} title={copy.formatTypeTitle(type, count)} aria-label={copy.formatTypeTitle(type, count)}>
            <Icon icon={typeIconMap[type] || "mdi:devices"} width={16} aria-hidden />
            <span>{copy.getTypeLabel(type)}</span>
            <span className={styles.familyTypeTabCount}>{count}</span>
          </button>;
    })}
    </div>;
  const renderSectionMainContent = () => {
    if (!hasAny) {
      return <MspEmptyState icon="mdi:devices" title={copy.empty.noDevicesTitle} text={copy.empty.noDevicesText} />;
    }
    if (selectedFleetType && localFilter === "all" && !(equipmentByType[selectedFleetType] || []).length) {
      return <MspEmptyState icon={typeIconMap[selectedFleetType] || "mdi:devices"} title={copy.formatTypeTitle(selectedFleetType, 0)} text={copy.empty.noEquipment} />;
    }
    if (!hasVisibleAfterFilter) {
      return <>
          <MspEmptyState icon="mdi:filter-off-outline" title={copy.empty.noFilterMatchTitle} text={copy.empty.noFilterMatchText} />
          <div className={styles.sectionFilterReset}>
            <button type="button" className={styles.filterResetBtn} onClick={() => setLocalFilter("all")}>
              {copy.empty.showAll}
            </button>
          </div>
        </>;
    }
    return <DeviceFleetTable groups={fleetGroups} showGroupLabels={fleetTypeScope === FLEET_TYPE_ALL && fleetGroups.length > 1} showClientName={showClientName} typeIconMap={typeIconMap} resolveMonitorStatus={resolveMonitorStatus} getMkSummary={getMkSummary} isMkMapped={isMkMapped} checkmkEnabled={checkmkIntegrationEnabled} alertRules={alertRules} onOpen={onEquipmentOpen} onMiddleClick={onEquipmentMiddleClick} renderActions={renderCardActions} copy={copy} />;
  };
  return <div className={styles.commandCenter} data-embedded={hideChrome || undefined} data-section-mode={sectionMode || undefined}>
      {!hideChrome ? <header className={styles.pageHeader}>
          <div className={styles.pageHeaderMain}>
            <Icon icon="mdi:devices" width={28} className={styles.pageHeaderIcon} />
            <div>
              <span className={styles.heroEyebrow}>MSP Veritas</span>
              <h1 className={styles.pageTitle}>{title}</h1>
            </div>
          </div>
          <div className={styles.pageHeaderActions}>
            {onSearchChange ? <label className={styles.searchBox}>
                <Icon icon="mdi:magnify" width={18} />
                <input type="search" placeholder="Search devices…" value={searchQuery} onChange={e => onSearchChange(e.target.value)} />
              </label> : null}
            {headerActions}
          </div>
        </header> : null}

      {!hideChrome ? <header className={styles.hero}>
        <div className={styles.heroLeft}>
          <HealthGauge score={healthScore} />
          <div className={styles.heroCopy}>
            <span className={styles.heroEyebrow}>Decision view</span>
            <h2 className={styles.heroTitle}>
              Multi-client monitoring
            </h2>
            <p className={styles.heroDesc}>
              Prioritize alerts, filter by type, and access details in one click.
            </p>
          </div>
        </div>
        <div className={styles.kpiRow}>
          <KpiTile icon="mdi:devices" label="Devices" value={statusCounts.total} />
          <KpiTile icon="mdi:alert-circle-outline" label="Alerts" value={statusCounts.issues || 0} tone={statusCounts.critical > 0 ? "bad" : statusCounts.warning > 0 ? "warn" : "default"} />
          <KpiTile icon="mdi:eye-off-outline" label="Unmapped" value={statusCounts.unmapped || 0} tone={(statusCounts.unmapped || 0) > 0 ? "warn" : "default"} />
          {checkmkIntegrationEnabled && mkAlertStats.mapped > 0 ? <KpiTile icon="mdi:radar" label="CheckMK" value={mkAlertStats.mapped} sub={`${mkAlertStats.issues || 0} alert${(mkAlertStats.issues || 0) > 1 ? "s" : ""}`} /> : (statusCounts.unmapped || 0) > 0 ? <KpiTile icon="mdi:eye-off-outline" label="To map" value={statusCounts.unmapped || 0} tone="warn" /> : null}
        </div>
      </header> : null}

      {checkmkIntegrationEnabled && mkAlertStats.mapped > 0 ? <div className={styles.mkBar}>
          <div className={styles.mkBarLabel}>
            <Icon icon="simple-icons:checkmk" width={18} />
            {copy.mkBar.label}
          </div>
          <div className={styles.mkPills}>
            {[{
          id: "issues",
          label: copy.mkBar.alerts,
          count: mkAlertStats.issues
        }, {
          id: "critical",
          label: copy.mkBar.critical,
          count: mkAlertStats.critical
        }, {
          id: "warning",
          label: copy.mkBar.warning,
          count: mkAlertStats.warning
        }].map(pill => <button key={pill.id} type="button" className={`${styles.mkPill} ${mkStatusFilter === pill.id ? styles.mkPillActive : ""}`} disabled={!pill.count} onClick={() => onMkStatusFilter?.(pill.id)}>
                {pill.label} {pill.count}
              </button>)}
            {mkStatusFilter ? <button type="button" className={styles.mkClear} onClick={onClearMkFilter}>
                <FaTimes /> {copy.mkBar.clear}
              </button> : null}
          </div>
          <button type="button" className={styles.mkSync} onClick={onBulkMkSync} disabled={mkBulkSyncing}>
            <FaSync className={mkBulkSyncing ? styles.spin : undefined} />
            {mkBulkSyncing ? `${mkBulkSyncProgress.done}/${mkBulkSyncProgress.total}` : copy.mkBar.sync}
          </button>
        </div> : null}

      {!sectionMode ? <ActionQueue actions={priorityActions} onOpen={onEquipmentOpen} /> : null}

      {sectionMode ? !hasAny ? <MspEmptyState icon="mdi:devices" title={copy.empty.noDevicesTitle} text={copy.empty.noDevicesText} /> : <div className={styles.sectionLayout}>
            {renderFamilyTypeTabs()}
            <div className={styles.sectionMain}>
              <div className={styles.sectionToolbar}>
                {copy.statusFilters.length > 1 ? renderStatusFilters(true) : null}
                {supervisionStats ? <div className={styles.toolbarMetaInline}>
                    <span>{copy.formatDeviceCount(supervisionStats.total)}</span>
                    {supervisionStats.todo > 0 ? <span className={styles.toolbarMetaWarn}>
                        {copy.formatTodoCount(supervisionStats.todo)}
                      </span> : <span>{copy.formatOkCount(supervisionStats.upToDate)}</span>}
                  </div> : null}
              </div>
              {renderSectionMainContent()}
            </div>
          </div> : <>
      <div className={styles.toolbar}>
        <div className={styles.toolbarRow}>
          <div className={styles.typeTabs} role="tablist" aria-label={copy.toolbar.typeTabsAria}>
            {typeOrder.map(type => {
              const count = typeCounts[type] || 0;
              const isActive = activeType === type;
              return <button key={type} type="button" role="tab" aria-selected={isActive} className={`${styles.typeTab} ${isActive ? styles.typeTabActive : ""}`.trim()} onClick={() => onTypeSelect?.(type)} title={copy.formatTypeTitle(type, count)}>
                  <Icon icon={typeIconMap[type] || "mdi:devices"} width={16} />
                  {copy.getTypeLabel(type)}
                  <span className={styles.typeTabCount}>{count}</span>
                </button>;
            })}
          </div>

          {copy.statusFilters.length > 1 ? renderStatusFilters(false) : null}
        </div>
      </div>

      {!hasAny ? <div className={styles.emptyState}>
            <Icon icon="mdi:server-network-off" width={40} />
            <p>{getEmptyMessage?.(activeType, embedded) || copy.empty.noDevicesTitle}</p>
          </div> : !hasVisibleAfterFilter ? <div className={styles.emptyState}>
            <Icon icon="mdi:filter-off-outline" width={40} />
            <p>{copy.empty.noFilterMatchText}</p>
            <button type="button" className={styles.filterResetBtn} onClick={() => setLocalFilter("all")}>
              {copy.empty.showAll}
            </button>
          </div> : typesToRender.map(type => {
        const list = filterList(equipmentByType[type] || []);
        if (!list.length && localFilter !== "all") return null;
        return <section key={type} className={styles.pillar}>
              {!activeType && !embedded ? <header className={styles.pillarHeader}>
                  <Icon icon={typeIconMap[type] || "mdi:devices"} width={22} />
                  <h3>{copy.getTypeLabel(type)}</h3>
                  <span className={styles.pillarCount}>{list.length}</span>
                </header> : null}
              {list.length === 0 ? <div className={styles.pillarEmpty}>
                  {getEmptyMessage?.(type, embedded) || "No equipment."}
                </div> : <div className={styles.deviceGrid}>
                  {list.map(equipment => <DeviceCard key={getEquipmentListKey(equipment)} equipment={equipment} displayType={type} showClient={showClientName && !embedded} monitorStatus={resolveMonitorStatus(equipment)} mkSummary={getMkSummary?.(equipment)} isMkMapped={isMkMapped?.(equipment)} checkmkEnabled={checkmkIntegrationEnabled} onOpen={onEquipmentOpen} onMiddleClick={onEquipmentMiddleClick} renderActions={renderCardActions} renderMonitoringBadge={renderMonitoringBadge} copy={copy} />)}
                </div>}
            </section>;
      })}
        </>}
    </div>;
}
