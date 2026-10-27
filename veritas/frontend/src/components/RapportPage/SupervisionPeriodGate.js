import { useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@iconify/react";
import { fetchClientModules } from "../../api/clients";
import { RadioIcon } from "../Misc/Sidebar/lucideAnimated";
import { getDefaultSupervisionPeriod, toIsoDateInput } from "./monitoring/supervisionReportBuilder";
import {
  REPORT_TOPIC_GROUPS,
  REPORT_TOPIC_KEYS,
  REPORT_TOPIC_COMING_SOON,
  MODULE_LABELS,
  MODULE_ICONS,
  isMonitoringModuleAvailable
} from "./monitoring/MonitoringSteps";
import ConfirmModal from "../Misc/ConfirmModal/ConfirmModal";
import styles from "./SupervisionPeriodGate.module.css";

function TopicIconButton({
  topicKey,
  available,
  checked,
  comingSoon = false,
  label,
  soonLabel,
  onToggle,
  index = 0
}) {
  const disabled = !available || comingSoon;

  return (
    <button
      type="button"
      role="switch"
      className={`${styles.topic} ${checked ? styles.topicSelected : ""} ${disabled ? styles.topicUnavailable : ""} ${comingSoon ? styles.topicSoon : ""}`}
      style={{ "--topic-i": index }}
      disabled={disabled}
      aria-checked={checked}
      aria-label={comingSoon ? `${label} (${soonLabel})` : label}
      title={comingSoon ? `${label} — ${soonLabel}` : label}
      onClick={() => onToggle(topicKey, available && !comingSoon)}
    >
      {comingSoon ? <span className={styles.topicSoonBadge}>{soonLabel}</span> : null}
      <span className={styles.topicIcon} aria-hidden>
        <Icon icon={MODULE_ICONS[topicKey] || "mdi:devices"} width={22} height={22} />
      </span>
      <span className={styles.topicLabel}>{label}</span>
    </button>
  );
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
  const typeIconRef = useRef(null);
  const clientLabel = client?.name || client?.nom || (client?.id ? copy.create.getClientLabel(client.id) : "—");
  const periodCopy = copy.supervisionBuilder || {};
  const periodValid = Boolean(startDate && endDate && startDate <= endDate);
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
          setSelected(new Set(
            REPORT_TOPIC_KEYS.filter(
              key => !REPORT_TOPIC_COMING_SOON.has(key) && isMonitoringModuleAvailable(next, key)
            )
          ));
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
    () => REPORT_TOPIC_KEYS.filter(
      key => !REPORT_TOPIC_COMING_SOON.has(key) && isMonitoringModuleAvailable(previewClient, key)
    ),
    [previewClient]
  );
  const soonLabel = copy?.create?.badgeSoon || periodCopy.badgeSoon || "Bientôt";
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
      <div className={`${styles.shell} ${styles.stageFade}`}>
        <header className={`${styles.hero} ${styles.fadeIn}`} style={{ "--fade-i": 0 }}>
          <h1 className={styles.heroTitle}>
            <span className={styles.heroTitleText}>{periodCopy.initTitle || reportType?.title}</span>
            {/* Noto Emoji Animation, CC BY 4.0 — https://googlefonts.github.io/noto-emoji-animation/ */}
            <img
              className={styles.heroEmoji}
              src="/assets/emoji/alarm-clock.webp"
              alt=""
              draggable={false}
            />
          </h1>
          <div className={styles.heroChips}>
            <span
              className={styles.chip}
              onMouseEnter={() => typeIconRef.current?.startAnimation?.()}
              onMouseLeave={() => typeIconRef.current?.stopAnimation?.()}
            >
              <RadioIcon ref={typeIconRef} className={styles.chipIcon} size={16} aria-hidden />
              <span>{reportType?.title || periodCopy.periodTitle}</span>
            </span>
            {clientLabel ? <span className={styles.chip}>{clientLabel}</span> : null}
          </div>
        </header>

        <div className={styles.body}>
          <section className={`${styles.periodCard} ${styles.fadeIn}`} style={{ "--fade-i": 1 }}>
            <div className={styles.cardHead}>
              <div>
                <h2 className={styles.cardTitle}>{periodCopy.periodTitle}</h2>
                <p className={styles.cardHint}>{periodCopy.periodHint}</p>
              </div>
            </div>
            <div className={styles.periodRow}>
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
              <div className={styles.presets}>
                {[
                  ["7d", periodCopy.preset7d],
                  ["30d", periodCopy.preset30d],
                  ["thisMonth", periodCopy.presetThisMonth],
                  ["lastMonth", periodCopy.presetLastMonth]
                ].map(([key, label], presetIndex) => (
                  <button
                    key={key}
                    type="button"
                    className={`${styles.preset} ${styles.fadeIn} ${activePreset === key ? styles.presetActive : ""}`}
                    style={{ "--fade-i": 2 + presetIndex * 0.15 }}
                    onClick={() => applyPreset(key)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </section>

          <hr className={`${styles.sectionDivider} ${styles.fadeIn}`} style={{ "--fade-i": 2.8 }} />

          <section className={`${styles.topicsCard} ${styles.fadeIn}`} style={{ "--fade-i": 3.1 }}>
            <div className={styles.topicsHead}>
              <h2 className={styles.cardTitle}>{periodCopy.topicsTitle}</h2>
              <p className={styles.cardHint}>{periodCopy.topicsHint}</p>
            </div>
            <div className={styles.topicsBody}>
              {loadingTopics ? (
                <div className={styles.state}>
                  <Icon icon="mdi:loading" className={styles.spin} aria-hidden />
                  {periodCopy.topicsLoading}
                </div>
              ) : (
                REPORT_TOPIC_GROUPS.map((group, groupIndex) => (
                  <div
                    key={group.key}
                    className={`${styles.group} ${styles.fadeIn}`}
                    style={{ "--fade-i": 3.4 + groupIndex * 0.35 }}
                  >
                    <h3 className={styles.groupTitle}>
                      <Icon icon={group.icon} aria-hidden />
                      {groupLabels[group.key] || group.key}
                    </h3>
                    <div className={styles.topicGrid}>
                      {group.topics.map((key, topicIndex) => {
                        const comingSoon = REPORT_TOPIC_COMING_SOON.has(key);
                        const available = availableKeys.includes(key);
                        const checked = selected.has(key) && available && !comingSoon;
                        return (
                          <TopicIconButton
                            key={key}
                            topicKey={key}
                            available={available}
                            checked={checked}
                            comingSoon={comingSoon}
                            label={MODULE_LABELS[key] || key}
                            soonLabel={soonLabel}
                            onToggle={toggleTopic}
                            index={groupIndex * 8 + topicIndex}
                          />
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>

        <footer className={`${styles.footer} ${styles.fadeIn}`} style={{ "--fade-i": 4.6 }}>
          {!canStart && periodValid && availableKeys.length > 0 ? (
            <span className={styles.footerHint}>{periodCopy.needTopic}</span>
          ) : (
            <span className={styles.footerHintSpacer} aria-hidden />
          )}
          <div className={styles.actions}>
            <button type="button" className={styles.backBtn} onClick={onBack} disabled={confirming}>
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
      </div>

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
