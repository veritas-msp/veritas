import { createPortal } from "react-dom";
import { useEffect, useState } from "react";
import { Icon } from "@iconify/react";
import { FaTimes } from "react-icons/fa";
import modalLayout from "../EnterprisesPage/EnterpriseFormModal.module.css";
import { DASHBOARD_PERIOD_PRESETS, buildDefaultCustomRange, toDatetimeLocalInput, normalizeAppliedFilter } from "./dashboardPeriodUtils";
import styles from "./DashboardPeriodModal.module.css";
export default function DashboardPeriodModal({
  open,
  copy,
  initialFilter,
  onClose,
  onApply
}) {
  const [draftPreset, setDraftPreset] = useState("365d");
  const [selectionMode, setSelectionMode] = useState("preset");
  const [draftStart, setDraftStart] = useState("");
  const [draftEnd, setDraftEnd] = useState("");
  const [errorKey, setErrorKey] = useState(null);
  useEffect(() => {
    if (!open) return;
    const defaults = buildDefaultCustomRange();
    if (initialFilter?.mode === "custom" && initialFilter.startAt && initialFilter.endAt) {
      setDraftPreset(initialFilter.preset || "365d");
      setSelectionMode("custom");
      setDraftStart(toDatetimeLocalInput(initialFilter.startAt));
      setDraftEnd(toDatetimeLocalInput(initialFilter.endAt));
    } else {
      setDraftPreset(initialFilter?.preset || "365d");
      setSelectionMode("preset");
      setDraftStart(toDatetimeLocalInput(defaults.startAt));
      setDraftEnd(toDatetimeLocalInput(defaults.endAt));
    }
    setErrorKey(null);
  }, [open, initialFilter]);
  useEffect(() => {
    if (!open) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = event => {
      if (event.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);
  if (!open || !copy) return null;
  const handleApply = () => {
    const result = normalizeAppliedFilter({
      preset: draftPreset,
      lastSelection: selectionMode,
      draftStart,
      draftEnd
    });
    if (result.error) {
      setErrorKey(result.error);
      return;
    }
    onApply?.(result.filter);
    onClose?.();
  };
  const handlePresetClick = preset => {
    setDraftPreset(preset);
    setSelectionMode("preset");
    setErrorKey(null);
  };
  const handleSelectPresetMode = () => {
    setSelectionMode("preset");
    setErrorKey(null);
  };
  const handleSelectCustomMode = () => {
    setSelectionMode("custom");
    if (!draftStart || !draftEnd) {
      const defaults = buildDefaultCustomRange();
      setDraftStart(toDatetimeLocalInput(defaults.startAt));
      setDraftEnd(toDatetimeLocalInput(defaults.endAt));
    }
    setErrorKey(null);
  };
  const handleCustomChange = (field, value) => {
    if (field === "start") setDraftStart(value);else setDraftEnd(value);
    setSelectionMode("custom");
    setErrorKey(null);
  };
  const errorMessage = errorKey === "missingCustomDates" ? copy.periodModal.errors.missingCustomDates : errorKey === "invalidRange" ? copy.periodModal.errors.invalidRange : null;
  return createPortal(<div className={modalLayout.overlay} onClick={onClose} role="presentation">
      <div className={`${modalLayout.shell} ${modalLayout.shellMedium} ${styles.shell}`} onClick={event => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="dashboard-period-modal-title">
        <div className={modalLayout.accentBar} aria-hidden />
        <header className={modalLayout.header}>
          <div className={modalLayout.headerMain}>
            <div className={modalLayout.headerIconWrap} aria-hidden>
              <Icon icon="mdi:calendar-range" />
            </div>
            <div className={modalLayout.headerText}>
              <p className={modalLayout.eyebrow}>{copy.periodModal.eyebrow}</p>
              <h2 className={modalLayout.title} id="dashboard-period-modal-title">
                {copy.periodModal.title}
              </h2>
              <p className={modalLayout.subtitle}>{copy.periodModal.subtitle}</p>
            </div>
          </div>
          <button type="button" className={modalLayout.closeBtn} onClick={onClose} aria-label={copy.periodModal.closeAria}>
            <FaTimes />
          </button>
        </header>

        <div className={styles.modalBody}>
          <div className={styles.modeSwitch} role="tablist" aria-label={copy.periodModal.modeSwitchAria}>
            <button type="button" role="tab" aria-selected={selectionMode === "preset"} className={`${styles.modeBtn} ${selectionMode === "preset" ? styles.modeBtnActive : ""}`} onClick={handleSelectPresetMode}>
              {copy.periodModal.modePreset}
            </button>
            <button type="button" role="tab" aria-selected={selectionMode === "custom"} className={`${styles.modeBtn} ${selectionMode === "custom" ? styles.modeBtnActive : ""}`} onClick={handleSelectCustomMode}>
              {copy.periodModal.modeCustom}
            </button>
          </div>

          {selectionMode === "preset" ? <section className={styles.section}>
              <h3 className={styles.sectionTitle}>{copy.periodModal.presetsTitle}</h3>
              <div className={styles.presetGrid}>
                {DASHBOARD_PERIOD_PRESETS.map(preset => <button key={preset} type="button" className={`${styles.presetBtn} ${draftPreset === preset ? styles.presetBtnActive : ""}`} onClick={() => handlePresetClick(preset)}>
                    {copy.periods[preset]}
                  </button>)}
              </div>
            </section> : <section className={styles.section}>
              <h3 className={styles.sectionTitle}>{copy.periodModal.customTitle}</h3>
              <p className={styles.sectionHint}>{copy.periodModal.customHint}</p>
              <div className={styles.customGrid}>
                <label className={styles.field}>
                  <span className={styles.fieldLabel}>{copy.periodModal.startLabel}</span>
                  <input type="datetime-local" className={styles.fieldInput} value={draftStart} onChange={event => handleCustomChange("start", event.target.value)} />
                </label>
                <label className={styles.field}>
                  <span className={styles.fieldLabel}>{copy.periodModal.endLabel}</span>
                  <input type="datetime-local" className={styles.fieldInput} value={draftEnd} onChange={event => handleCustomChange("end", event.target.value)} />
                </label>
              </div>
            </section>}

          {errorMessage ? <p className={styles.error}>{errorMessage}</p> : null}
        </div>

        <footer className={styles.footer}>
          <button type="button" className={styles.cancelBtn} onClick={onClose}>
            {copy.periodModal.cancel}
          </button>
          <button type="button" className={styles.applyBtn} onClick={handleApply}>
            {copy.periodModal.apply}
          </button>
        </footer>
      </div>
    </div>, document.body);
}
