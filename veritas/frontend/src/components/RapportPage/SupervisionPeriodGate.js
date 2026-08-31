import { useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@iconify/react";
import { fetchClientModules } from "../../api/clients";
import { interpolate } from "../../i18n/translate";
import { getDefaultSupervisionPeriod, toIsoDateInput } from "./monitoring/supervisionReportBuilder";
import {
  REPORT_TOPIC_GROUPS,
  MODULE_ICONS,
  MODULE_LABELS,
  MONITORING_MODULE_STEP_ORDER,
  countMonitoringModuleItems,
  isMonitoringModuleAvailable
} from "./monitoring/MonitoringSteps";
import ConfirmModal from "../Misc/ConfirmModal/ConfirmModal";
import MspPageHero from "../Misc/MspPageHero/MspPageHero";
import styles from "./SupervisionPeriodGate.module.css";

function inclusiveDayCount(startDate, endDate) {
  if (!startDate || !endDate || startDate > endDate) return 0;
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  return Math.round((end.getTime() - start.getTime()) / 86400000) + 1;
}

function formatDisplayDate(value, locale) {
  if (!value) return "—";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(locale || undefined, {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
}

function presetRange(key, now = new Date()) {
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  if (key === "7d") {
    const start = new Date(today);
    start.setDate(start.getDate() - 6);
    return { startDate: toIsoDateInput(start), endDate: toIsoDateInput(today) };
  }
  if (key === "30d") return getDefaultSupervisionPeriod(now);
  if (key === "thisMonth") {
    const start = new Date(today.getFullYear(), today.getMonth(), 1);
    return { startDate: toIsoDateInput(start), endDate: toIsoDateInput(today) };
  }
  if (key === "lastMonth") {
    const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const end = new Date(today.getFullYear(), today.getMonth(), 0);
    return { startDate: toIsoDateInput(start), endDate: toIsoDateInput(end) };
  }
  return getDefaultSupervisionPeriod(now);
}

function detectPreset(startDate, endDate) {
  return ["7d", "30d", "thisMonth", "lastMonth"].find(key => {
    const range = presetRange(key);
    return range.startDate === startDate && range.endDate === endDate;
  }) || null;
}

export default function SupervisionPeriodGate({
  copy,
  reportType,
  client,
  onBack,
  onConfirm,
  confirming = false
}) {
  const defaults = useMemo(() => getDefaultSupervisionPeriod(), []);
  const [startDate, setStartDate] = useState(defaults.startDate);
  const [endDate, setEndDate] = useState(defaults.endDate);
  const [previewClient, setPreviewClient] = useState(client || null);
  const [loadingTopics, setLoadingTopics] = useState(true);
  const [selected, setSelected] = useState(() => new Set());
  const [disclaimerOpen, setDisclaimerOpen] = useState(false);
  const initializedSelection = useRef(false);
  const clientLabel = client?.name || client?.nom || (client?.id ? copy.create.getClientLabel(client.id) : "—");
  const periodCopy = copy.supervisionBuilder || {};
  const locale = copy.bcp47;
  const periodValid = Boolean(startDate && endDate && startDate <= endDate);
  const days = inclusiveDayCount(startDate, endDate);
  const activePreset = detectPreset(startDate, endDate);

  useEffect(() => {
    const clientId = client?.id ?? client?.uuid;
    if (!clientId) {
      setLoadingTopics(false);
      return undefined;
    }
    const ac = new AbortController();
    setLoadingTopics(true);
    fetchClientModules(clientId, { signal: ac.signal })
      .then(data => {
        if (ac.signal.aborted) return;
        const next = {
          ...client,
          equipements: data?.equipements || client?.equipements || {},
          modules_monitoring: data?.modules_monitoring || client?.modules_monitoring || {}
        };
        setPreviewClient(next);
        if (!initializedSelection.current) {
          initializedSelection.current = true;
          setSelected(new Set(MONITORING_MODULE_STEP_ORDER.filter(key => isMonitoringModuleAvailable(next, key))));
        }
      })
      .catch(err => {
        if (err?.name === "AbortError") return;
        setPreviewClient(client || null);
      })
      .finally(() => {
        if (!ac.signal.aborted) setLoadingTopics(false);
      });
    return () => ac.abort();
  }, [client]);

  const availableKeys = useMemo(
    () => MONITORING_MODULE_STEP_ORDER.filter(key => isMonitoringModuleAvailable(previewClient, key)),
    [previewClient]
  );
  const selectedAvailable = useMemo(
    () => [...selected].filter(key => availableKeys.includes(key)),
    [selected, availableKeys]
  );
  const canStart = periodValid && (availableKeys.length === 0 || selectedAvailable.length > 0);
  const groupLabels = {
    infrastructure: periodCopy.groupInfrastructure,
    cyber: periodCopy.groupCyber,
    cloud: periodCopy.groupCloud
  };

  const applyPreset = key => {
    const range = presetRange(key);
    setStartDate(range.startDate);
    setEndDate(range.endDate);
  };

  const toggleTopic = (key, available) => {
    if (!available) return;
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const selectAllAvailable = () => setSelected(new Set(availableKeys));
  const selectNone = () => setSelected(new Set());

  const handleConfirm = () => {
    if (!canStart || confirming) return;
    setDisclaimerOpen(true);
  };

  const handleDisclaimerClose = () => {
    if (confirming) return;
    setDisclaimerOpen(false);
  };

  const handleDisclaimerConfirm = () => {
    if (!canStart || confirming) return;
    onConfirm?.({
      startDate,
      endDate,
      selectedModules: selectedAvailable
    });
  };

  return (
    <div className={styles.page}>
      <MspPageHero
        eyebrow={copy.eyebrow}
        title={periodCopy.initTitle || reportType?.title}
        subtitle={`${clientLabel} — ${periodCopy.initHint || periodCopy.periodGateSubtitle || reportType?.description || ""}`}
        icon={reportType?.icon || "mdi:radar"}
        actions={
          <button type="button" className={styles.secondaryBtn} onClick={onBack} disabled={confirming}>
            <Icon icon="mdi:arrow-left" aria-hidden />
            {copy.wizard.backToSelection}
          </button>
        }
      />

      <div className={styles.body}>
        <section className={styles.periodCard}>
          <div className={styles.cardHead}>
            <div>
              <h2 className={styles.cardTitle}>{periodCopy.periodTitle}</h2>
              <p className={styles.cardHint}>{periodCopy.periodHint}</p>
            </div>
            {periodValid ? (
              <span className={styles.periodSummary}>
                {interpolate(periodCopy.periodSummary || "{start} → {end}", {
                  start: formatDisplayDate(startDate, locale),
                  end: formatDisplayDate(endDate, locale),
                  days: String(days)
                })}
              </span>
            ) : null}
          </div>
          <div className={styles.periodRow}>
            <div className={styles.presets}>
              {[
                ["7d", periodCopy.preset7d],
                ["30d", periodCopy.preset30d],
                ["thisMonth", periodCopy.presetThisMonth],
                ["lastMonth", periodCopy.presetLastMonth]
              ].map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  className={`${styles.preset} ${activePreset === key ? styles.presetActive : ""}`}
                  onClick={() => applyPreset(key)}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className={styles.dates}>
              <label className={styles.dateField}>
                {periodCopy.startLabel}
                <input
                  className={styles.dateInput}
                  type="date"
                  value={startDate}
                  max={endDate || undefined}
                  onChange={event => setStartDate(event.target.value)}
                />
              </label>
              <label className={styles.dateField}>
                {periodCopy.endLabel}
                <input
                  className={styles.dateInput}
                  type="date"
                  value={endDate}
                  min={startDate || undefined}
                  onChange={event => setEndDate(event.target.value)}
                />
              </label>
            </div>
          </div>
        </section>

        <section className={styles.topicsCard}>
          <div className={styles.topicsHead}>
            <div>
              <h2 className={styles.cardTitle}>{periodCopy.topicsTitle}</h2>
              <p className={styles.cardHint}>{periodCopy.topicsHint}</p>
            </div>
            <div className={styles.topicsToolbar}>
              <span className={styles.selectedCount}>
                {interpolate(periodCopy.selectedCount || "{count}", { count: String(selectedAvailable.length) })}
              </span>
              <button type="button" className={styles.textBtn} onClick={selectAllAvailable} disabled={loadingTopics || availableKeys.length === 0}>
                {periodCopy.selectAll}
              </button>
              <button type="button" className={styles.textBtn} onClick={selectNone} disabled={loadingTopics || selectedAvailable.length === 0}>
                {periodCopy.selectNone}
              </button>
            </div>
          </div>
          <div className={styles.topicsBody}>
            {loadingTopics ? (
              <div className={styles.state}>
                <Icon icon="mdi:loading" className={styles.spin} aria-hidden />
                {periodCopy.topicsLoading}
              </div>
            ) : availableKeys.length === 0 ? (
              <div className={styles.state}>{periodCopy.topicsEmpty}</div>
            ) : (
              REPORT_TOPIC_GROUPS.map(group => (
                <div key={group.key} className={styles.group}>
                  <div className={styles.groupHead}>
                    <h3 className={styles.groupTitle}>
                      <Icon icon={group.icon} aria-hidden />
                      {groupLabels[group.key] || group.key}
                    </h3>
                  </div>
                  <div className={styles.topicGrid}>
                    {group.topics.map(key => {
                      const available = availableKeys.includes(key);
                      const checked = selected.has(key) && available;
                      const count = countMonitoringModuleItems(previewClient, key);
                      return (
                        <button
                          key={key}
                          type="button"
                          className={`${styles.topic} ${checked ? styles.topicSelected : ""} ${available ? "" : styles.topicUnavailable}`}
                          disabled={!available}
                          aria-pressed={checked}
                          onClick={() => toggleTopic(key, available)}
                        >
                          <span className={styles.topicIcon} aria-hidden>
                            <Icon icon={MODULE_ICONS[key] || "mdi:checkbox-marked-outline"} />
                          </span>
                          <span className={styles.topicCopy}>
                            <span className={styles.topicName}>{MODULE_LABELS[key] || key}</span>
                            <span className={styles.topicMeta}>
                              {available
                                ? interpolate(periodCopy.topicItems || "{count}", { count: String(count) })
                                : periodCopy.topicUnavailable}
                            </span>
                          </span>
                          <Icon
                            className={`${styles.check} ${checked ? "" : styles.checkOff}`}
                            icon={checked ? "mdi:checkbox-marked-circle" : "mdi:checkbox-blank-circle-outline"}
                            aria-hidden
                          />
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      <footer className={styles.footer}>
        {!canStart && periodValid && availableKeys.length > 0 ? (
          <span className={styles.footerHint}>{periodCopy.needTopic}</span>
        ) : <span />}
        <div className={styles.actions}>
          <button type="button" className={styles.secondaryBtn} onClick={onBack} disabled={confirming}>
            <Icon icon="mdi:arrow-left" aria-hidden />
            {copy.wizard.back}
          </button>
          <button type="button" className={styles.primaryBtn} disabled={!canStart || confirming} onClick={handleConfirm}>
            {confirming ? (
              <>
                <Icon icon="mdi:loading" className={styles.spin} aria-hidden />
                {periodCopy.loading}
              </>
            ) : (
              <>
                {periodCopy.startBuilder || copy.wizard.startReport}
                <Icon icon="mdi:arrow-right" aria-hidden />
              </>
            )}
          </button>
        </div>
      </footer>
      <ConfirmModal
        open={disclaimerOpen}
        title={periodCopy.unsavedTitle}
        message={periodCopy.unsavedMessage}
        confirmLabel={periodCopy.unsavedConfirm}
        cancelLabel={periodCopy.unsavedCancel || copy.wizard.back}
        icon="mdi:content-save-alert-outline"
        loading={confirming}
        onClose={handleDisclaimerClose}
        onConfirm={handleDisclaimerConfirm}
      />
    </div>
  );
}
