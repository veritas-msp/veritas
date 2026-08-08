import { Icon } from "@iconify/react";
import { useEffect, useMemo, useState } from "react";
import ProFeatureBadge from "../Misc/ProFeature/ProFeatureBadge";
import { Badge, Btn, FieldRow, NumberStepper, Switch } from "./AdminUi";
import { formatRmmDate, getLocalizedCollectors, getLocalizedCollectorGroups, getLocalizedDurationUnits, getLocalizedMetricsFields, interpolate } from "./adminRmmI18n";
import { RMM_HEARTBEAT_MAX_MINUTES, RMM_HEARTBEAT_MIN_MINUTES, RMM_OFFLINE_MAX_MINUTES, RMM_OFFLINE_MIN_MINUTES, durationPartsToMinutes, formatDurationMinutes, getDurationUnitFactor, minutesToDisplayValue, pickBestDurationUnit } from "./rmmDurationUtils";
import { estimateRmmMetricsStorage, formatStorageBytes, formatStorageNumber } from "./rmmMetricsStorageUtils";
import styles from "./AdminRmm.module.css";
function RmmDurationStepper({
  minutes,
  onChange,
  minMinutes,
  maxMinutes,
  disabled = false,
  ariaLabel,
  durationUnits,
  unitAriaLabel,
  unitAriaSuffix
}) {
  const [unit, setUnit] = useState(() => pickBestDurationUnit(minutes));
  useEffect(() => {
    const factor = getDurationUnitFactor(unit);
    const alignedMinutes = minutesToDisplayValue(minutes, unit) * factor;
    if (Math.abs(alignedMinutes - Number(minutes)) > 0.5) {
      setUnit(pickBestDurationUnit(minutes));
    }
  }, [minutes, unit]);
  const factor = getDurationUnitFactor(unit);
  const displayValue = minutesToDisplayValue(minutes, unit);
  const displayMin = Math.max(1, Math.ceil(minMinutes / factor));
  const displayMax = Math.max(displayMin, Math.floor(maxMinutes / factor));
  const handleValueChange = value => {
    onChange(durationPartsToMinutes(value, unit, minMinutes, maxMinutes));
  };
  const handleUnitChange = nextUnit => {
    setUnit(nextUnit);
    const nextDisplay = minutesToDisplayValue(minutes, nextUnit);
    onChange(durationPartsToMinutes(nextDisplay, nextUnit, minMinutes, maxMinutes));
  };
  return <div className={styles.durationStepper} role="group" aria-label={ariaLabel}>
      <NumberStepper value={displayValue} onChange={handleValueChange} min={displayMin} max={displayMax} disabled={disabled} ariaLabel={ariaLabel} />
      <select className={styles.durationUnitSelect} value={unit} onChange={event => handleUnitChange(event.target.value)} disabled={disabled} aria-label={ariaLabel ? `${ariaLabel}${unitAriaSuffix || ""}` : unitAriaLabel}>
        {durationUnits.map(entry => <option key={entry.key} value={entry.key}>
            {entry.optionLabel || entry.label}
          </option>)}
      </select>
    </div>;
}
export function RmmTimingFields({
  copy,
  heartbeatMinutes,
  offlineThresholdMinutes,
  autoUpdateEnabled = true,
  onHeartbeatChange,
  onOfflineChange,
  onAutoUpdateChange,
  disabled = false
}) {
  const durationUnits = useMemo(() => getLocalizedDurationUnits(copy), [copy]);
  return <div className={styles.timingPanel}>
      <FieldRow icon="mdi:heart-pulse" label={copy.settings.heartbeatLabel} hint={copy.settings.heartbeatHint}>
        <RmmDurationStepper minutes={heartbeatMinutes} onChange={onHeartbeatChange} minMinutes={RMM_HEARTBEAT_MIN_MINUTES} maxMinutes={RMM_HEARTBEAT_MAX_MINUTES} disabled={disabled} ariaLabel={copy.settings.heartbeatLabel} durationUnits={durationUnits} unitAriaLabel={copy.common.durationUnitAria} unitAriaSuffix={copy.common.durationUnitSuffix} />
      </FieldRow>
      <FieldRow icon="mdi:lan-disconnect" label={copy.settings.offlineLabel} hint={copy.settings.offlineHint}>
        <RmmDurationStepper minutes={offlineThresholdMinutes} onChange={onOfflineChange} minMinutes={RMM_OFFLINE_MIN_MINUTES} maxMinutes={RMM_OFFLINE_MAX_MINUTES} disabled={disabled} ariaLabel={copy.settings.offlineLabel} durationUnits={durationUnits} unitAriaLabel={copy.common.durationUnitAria} unitAriaSuffix={copy.common.durationUnitSuffix} />
      </FieldRow>
      {typeof onAutoUpdateChange === "function" ? <FieldRow icon="mdi:cellphone-arrow-down" label={copy.settings.autoUpdateLabel} hint={copy.settings.autoUpdateHint}>
          <Switch checked={!!autoUpdateEnabled} onChange={checked => onAutoUpdateChange(checked)} disabled={disabled} />
        </FieldRow> : null}
    </div>;
}
export function RmmClientTimingFields({
  copy,
  form,
  onCustomize,
  onHeartbeatChange,
  onOfflineChange,
  onAutoUpdateChange,
  disabled
}) {
  const durationUnits = useMemo(() => getLocalizedDurationUnits(copy), [copy]);
  const unitsCopy = copy.durationUnits;
  const badges = copy.collectors.badges;
  const autoUpdateInherited = form.global?.autoUpdateEnabled !== false;
  return <div className={styles.timingPanel}>
      <FieldRow icon="mdi:heart-pulse" label={copy.settings.heartbeatLabel} hint={form.customized.heartbeatIntervalMinutes ? copy.settings.customValueHint : interpolate(copy.settings.inheritGlobal, {
      value: formatDurationMinutes(form.global?.heartbeatIntervalMinutes, unitsCopy)
    })}>
        <div className={styles.clientTimingControl}>
          <button type="button" className={`${styles.inheritChip} ${form.customized.heartbeatIntervalMinutes ? styles.inheritChipActive : ""}`} disabled={disabled} onClick={() => onCustomize("heartbeatIntervalMinutes", !form.customized.heartbeatIntervalMinutes)}>
            <Icon icon={form.customized.heartbeatIntervalMinutes ? "mdi:tune-variant" : "mdi:source-branch"} aria-hidden />
            {form.customized.heartbeatIntervalMinutes ? badges.override : badges.global}
          </button>
          <RmmDurationStepper minutes={form.values.heartbeatIntervalMinutes} onChange={onHeartbeatChange} minMinutes={RMM_HEARTBEAT_MIN_MINUTES} maxMinutes={RMM_HEARTBEAT_MAX_MINUTES} disabled={disabled || !form.customized.heartbeatIntervalMinutes} ariaLabel={copy.settings.heartbeatLabel} durationUnits={durationUnits} unitAriaLabel={copy.common.durationUnitAria} unitAriaSuffix={copy.common.durationUnitSuffix} />
        </div>
      </FieldRow>
      <FieldRow icon="mdi:lan-disconnect" label={copy.settings.offlineLabel} hint={form.customized.offlineThresholdMinutes ? copy.settings.customValueHint : interpolate(copy.settings.inheritGlobal, {
      value: formatDurationMinutes(form.global?.offlineThresholdMinutes, unitsCopy)
    })}>
        <div className={styles.clientTimingControl}>
          <button type="button" className={`${styles.inheritChip} ${form.customized.offlineThresholdMinutes ? styles.inheritChipActive : ""}`} disabled={disabled} onClick={() => onCustomize("offlineThresholdMinutes", !form.customized.offlineThresholdMinutes)}>
            <Icon icon={form.customized.offlineThresholdMinutes ? "mdi:tune-variant" : "mdi:source-branch"} aria-hidden />
            {form.customized.offlineThresholdMinutes ? badges.override : badges.global}
          </button>
          <RmmDurationStepper minutes={form.values.offlineThresholdMinutes} onChange={onOfflineChange} minMinutes={RMM_OFFLINE_MIN_MINUTES} maxMinutes={RMM_OFFLINE_MAX_MINUTES} disabled={disabled || !form.customized.offlineThresholdMinutes} ariaLabel={copy.settings.offlineLabel} durationUnits={durationUnits} unitAriaLabel={copy.common.durationUnitAria} unitAriaSuffix={copy.common.durationUnitSuffix} />
        </div>
      </FieldRow>
      {typeof onAutoUpdateChange === "function" ? <FieldRow icon="mdi:cellphone-arrow-down" label={copy.settings.autoUpdateLabel} hint={form.customized.autoUpdateEnabled ? copy.settings.customValueHint : interpolate(copy.settings.inheritGlobalEnabled, {
      label: autoUpdateInherited ? copy.common.enabled : copy.common.disabled
    })}>
        <div className={styles.clientTimingControl}>
          <button type="button" className={`${styles.inheritChip} ${form.customized.autoUpdateEnabled ? styles.inheritChipActive : ""}`} disabled={disabled} onClick={() => onCustomize("autoUpdateEnabled", !form.customized.autoUpdateEnabled)}>
            <Icon icon={form.customized.autoUpdateEnabled ? "mdi:tune-variant" : "mdi:source-branch"} aria-hidden />
            {form.customized.autoUpdateEnabled ? badges.override : badges.global}
          </button>
          <Switch checked={form.values.autoUpdateEnabled !== false} onChange={checked => onAutoUpdateChange(checked)} disabled={disabled || !form.customized.autoUpdateEnabled} />
        </div>
      </FieldRow> : null}
    </div>;
}
export function RmmCollectorsSection({
  copy,
  isCommunity = false,
  onProClick,
  hint,
  ...listProps
}) {
  const locked = Boolean(isCommunity);
  const collectors = useMemo(() => getLocalizedCollectors(copy), [copy]);
  const groups = useMemo(() => getLocalizedCollectorGroups(copy), [copy]);
  const sectionHint = hint ?? copy.collectors.hint;
  return <section className={styles.settingsSection}>
      <div className={styles.settingsSectionIntro}>
        <h3 className={styles.settingsSectionTitle}>
          {copy.collectors.title}
          {locked ? <ProFeatureBadge variant="inline" className={styles.proBadgeInline} /> : null}
        </h3>
        <p className={styles.settingsSectionHint}>{sectionHint}</p>
      </div>

      {locked ? <div className={styles.proFeatureBanner}>
          <p>{copy.collectors.proBanner}</p>
          <Btn variant="secondary" size="sm" onClick={onProClick}>
            {copy.common.learnMore}
          </Btn>
        </div> : null}

      <div className={locked ? styles.collectorsProLocked : undefined}>
        <RmmCollectorsList copy={copy} collectors={collectors} groups={groups} disabled={locked || listProps.disabled} {...listProps} />
      </div>
    </section>;
}
export function RmmCollectorsList({
  copy,
  collectors,
  groups,
  getChecked,
  onToggle,
  disabled = false,
  renderControls
}) {
  const badges = copy.collectors.badges;
  return <div className={styles.collectorSections}>
      {Object.entries(groups).map(([groupKey, groupLabel]) => {
      const groupCollectors = collectors.filter(item => item.group === groupKey);
      if (groupCollectors.length === 0) return null;
      return <section key={groupKey} className={styles.collectorSection}>
            <header className={styles.collectorSectionHead}>{groupLabel}</header>
            <ul className={styles.collectorList}>
              {groupCollectors.map(collector => <li key={collector.key} className={styles.collectorRow}>
                  <div className={styles.collectorRowMain}>
                    <div className={styles.collectorRowTitle}>
                      <span>{collector.label}</span>
                      {collector.syncOnly ? <Badge variant="muted">{badges.syncOnly}</Badge> : null}
                      {collector.heavy ? <Badge variant="warn">{badges.heavy}</Badge> : null}
                    </div>
                    <p className={styles.collectorRowDesc}>{collector.description}</p>
                  </div>
                  <div className={styles.collectorRowControl}>
                    {renderControls ? renderControls(collector) : <Switch checked={!!getChecked(collector.key)} onChange={checked => onToggle(collector.key, checked)} disabled={disabled} aria-label={`${collector.label} · ${getChecked(collector.key) ? badges.enabled : badges.disabled}`} />}
                  </div>
                </li>)}
            </ul>
          </section>;
    })}
    </div>;
}
export function RmmCollectorClientControls({
  copy,
  collector,
  form,
  onCustomize,
  onValueChange,
  disabled
}) {
  const customized = !!form.customized.collectors?.[collector.key];
  const checked = !!form.values.collectors?.[collector.key];
  const globalEnabled = !!form.global?.collectors?.[collector.key];
  const globalLabel = globalEnabled ? copy.common.enabled : copy.common.disabled;
  const badges = copy.collectors.badges;
  return <div className={styles.collectorClientControls}>
      <button type="button" className={`${styles.inheritChip} ${customized ? styles.inheritChipActive : ""}`} disabled={disabled} onClick={() => onCustomize(collector.key, !customized)} title={customized ? copy.settings.customValueTitle : interpolate(copy.settings.inheritGlobalEnabled, {
      label: globalLabel
    })}>
        <Icon icon={customized ? "mdi:tune-variant" : "mdi:source-branch"} aria-hidden />
        {customized ? badges.override : badges.global}
      </button>
      <Switch checked={checked} onChange={value => onValueChange(collector.key, value)} disabled={disabled || !customized} aria-label={`${collector.label} · ${checked ? badges.enabled : badges.disabled}`} />
    </div>;
}
export function RmmMetricsEstimatePanel({
  copy,
  locale = "fr",
  metrics,
  collectors,
  agentCount,
  avgDisksPerAgent,
  storageStats,
  hideProjectionControl = false
}) {
  const [projectionAgents, setProjectionAgents] = useState(agentCount || 0);
  const est = copy.metricsStorage.estimate;
  useEffect(() => {
    setProjectionAgents(agentCount || 0);
  }, [agentCount]);
  const effectiveAgents = hideProjectionControl ? agentCount || 0 : projectionAgents;
  const estimate = estimateRmmMetricsStorage({
    agentCount: effectiveAgents,
    retentionDays: metrics?.retentionDays,
    collectors,
    avgDisksPerAgent
  });
  const actualBytes = storageStats?.totalBytes ?? 0;
  const actualRows = storageStats?.rowCount ?? 0;
  const fillPct = estimate.estimatedBytes > 0 ? Math.min(100, Math.round(actualBytes / estimate.estimatedBytes * 100)) : 0;
  return <div className={styles.metricsStoragePanels}>
      <article className={styles.metricsStorageCard}>
        <header className={styles.metricsStorageCardHead}>
          <Icon icon="mdi:database-outline" aria-hidden />
          <h4>{est.actualTitle}</h4>
        </header>
        {storageStats ? <>
            <p className={styles.metricsStorageHero}>{formatStorageBytes(actualBytes)}</p>
            <ul className={styles.metricsStorageList}>
              <li>
                <span>{est.rows}</span>
                <strong>{formatStorageNumber(actualRows, locale)}</strong>
              </li>
              <li>
                <span>{est.agentsWithHistory}</span>
                <strong>{formatStorageNumber(storageStats.agentCountWithData, locale)}</strong>
              </li>
              <li>
                <span>{est.table}</span>
                <strong>{formatStorageBytes(storageStats.tableBytes)}</strong>
              </li>
              <li>
                <span>{est.indexes}</span>
                <strong>{formatStorageBytes(storageStats.indexesBytes)}</strong>
              </li>
              {storageStats.oldestDay ? <li>
                  <span>{est.coveredPeriod}</span>
                  <strong>
                    {formatRmmDate(storageStats.oldestDay, locale)}
                    {" → "}
                    {storageStats.newestDay ? formatRmmDate(storageStats.newestDay, locale) : "-"}
                  </strong>
                </li> : null}
            </ul>
          </> : <p className={styles.metricsStorageMuted}>{est.loadingVolume}</p>}
      </article>

      <article className={styles.metricsStorageCard}>
        <header className={styles.metricsStorageCardHead}>
          <Icon icon="mdi:chart-bell-curve" aria-hidden />
          <h4>{est.steadyTitle}</h4>
        </header>
        <p className={styles.metricsStorageHero}>{formatStorageBytes(estimate.estimatedBytes)}</p>
        {!hideProjectionControl ? <div className={styles.metricsProjectionRow}>
            <span className={styles.metricsProjectionLabel}>{est.projectionWorkstations}</span>
            <NumberStepper value={projectionAgents} onChange={setProjectionAgents} min={0} max={50000} suffix={copy.common.workstationsSuffix} />
          </div> : null}
        <ul className={styles.metricsStorageList}>
          <li>
            <span>{est.projectionAgents}</span>
            <strong>{formatStorageNumber(estimate.agentCount, locale)}</strong>
          </li>
          <li>
            <span>{est.rowsPerAgentDay}</span>
            <strong>{formatStorageNumber(estimate.rowsPerAgentDay, locale)}</strong>
          </li>
          <li>
            <span>{est.retention}</span>
            <strong>
              {formatStorageNumber(estimate.retentionDays, locale)} {copy.common.daysSuffix}
            </strong>
          </li>
          <li>
            <span>{est.totalRowsEst}</span>
            <strong>{formatStorageNumber(estimate.steadyStateRows, locale)}</strong>
          </li>
        </ul>
        {storageStats && estimate.estimatedBytes > 0 ? <div className={styles.metricsStorageBarWrap}>
            <div className={styles.metricsStorageBarLabel}>
              <span>{est.actualVsEst}</span>
              <strong>{fillPct}%</strong>
            </div>
            <div className={styles.metricsStorageBar} aria-hidden>
              <div className={styles.metricsStorageBarFill} style={{
            width: `${fillPct}%`
          }} />
            </div>
          </div> : null}
        <p className={styles.metricsStorageNote}>{est.note}</p>
      </article>
    </div>;
}
export function RmmMetricsStorageSection({
  copy,
  locale = "fr",
  metrics,
  collectors,
  onMetricChange,
  disabled = false,
  storageStats = null,
  agentCount = 0,
  avgDisksPerAgent = 3,
  renderMetricControl,
  showStorageEstimate = false
}) {
  const metricsFields = useMemo(() => getLocalizedMetricsFields(copy), [copy]);
  return <section className={styles.settingsSection}>
      <div className={styles.settingsSectionIntro}>
        <h3 className={styles.settingsSectionTitle}>{copy.metricsStorage.title}</h3>
        <p className={styles.settingsSectionHint}>{copy.metricsStorage.hint}</p>
      </div>

      <div className={styles.timingPanel}>
        {metricsFields.map(field => <FieldRow key={field.key} icon={field.icon} label={field.label} hint={field.hint}>
            {renderMetricControl ? renderMetricControl(field) : <NumberStepper value={metrics?.[field.key]} onChange={value => onMetricChange(field.key, value)} min={field.min} max={field.max} suffix={field.suffix} disabled={disabled} />}
          </FieldRow>)}
      </div>

      {showStorageEstimate ? <RmmMetricsEstimatePanel copy={copy} locale={locale} metrics={metrics} collectors={collectors} agentCount={agentCount} avgDisksPerAgent={avgDisksPerAgent} storageStats={storageStats} /> : null}
    </section>;
}
export function RmmMetricsClientControl({
  copy,
  field,
  form,
  onCustomize,
  onValueChange,
  disabled
}) {
  const customized = !!form.customized.metrics?.[field.key];
  const globalValue = form.global?.metrics?.[field.key];
  const badges = copy.collectors.badges;
  return <div className={styles.clientTimingControl}>
      <button type="button" className={`${styles.inheritChip} ${customized ? styles.inheritChipActive : ""}`} disabled={disabled} onClick={() => onCustomize(field.key, !customized)} title={customized ? copy.settings.customValueTitle : interpolate(copy.settings.inheritGlobalMetric, {
      value: globalValue ?? "-",
      suffix: field.suffix
    })}>
        <Icon icon={customized ? "mdi:tune-variant" : "mdi:source-branch"} aria-hidden />
        {customized ? badges.override : badges.global}
      </button>
      <NumberStepper value={form.values.metrics?.[field.key]} onChange={value => onValueChange(field.key, value)} min={field.min} max={field.max} suffix={field.suffix} disabled={disabled || !customized} />
    </div>;
}
