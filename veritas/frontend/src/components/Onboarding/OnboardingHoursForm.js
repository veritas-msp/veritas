import { useMemo } from "react";
import { Icon } from "@iconify/react";
import { WEEKDAY_ORDER } from "../../utils/slaSettingsUtils";
import styles from "./OnboardingWizard.module.css";
export default function OnboardingHoursForm({
  labels,
  weekSchedule,
  onPatchDay,
  onApplyWeekdaysTemplate,
  disabled
}) {
  const weekdayLabels = labels.weekdays || {};
  const scheduleSummary = useMemo(() => {
    const openDays = weekSchedule.filter(row => row.enabled);
    if (!openDays.length) return labels.scheduleSummaryNone;
    const first = openDays[0];
    const sameHours = openDays.every(row => row.open === first.open && row.close === first.close);
    const days = openDays.map(row => weekdayLabels[row.day] || row.day).join(", ");
    if (sameHours) return `${days} · ${first.open}–${first.close}`;
    return days;
  }, [labels.scheduleSummaryNone, weekSchedule, weekdayLabels]);
  return <form className={styles.inlineForm} onSubmit={e => e.preventDefault()}>
      <div className={styles.scheduleHeader}>
        <p className={styles.inlineFormSectionTitle}>{labels.title}</p>
        <button type="button" className={styles.scheduleTemplateBtn} onClick={onApplyWeekdaysTemplate} disabled={disabled}>
          <Icon icon="mdi:calendar-week" aria-hidden />
          {labels.applyWeekdaysTemplate}
        </button>
      </div>

      <p className={styles.inlineFormHint}>{labels.hint}</p>

      <div className={styles.scheduleWrap}>
        <table className={styles.scheduleTable}>
          <thead>
            <tr>
              <th>{labels.scheduleDay}</th>
              <th>{labels.scheduleOpen}</th>
              <th>{labels.scheduleFrom}</th>
              <th>{labels.scheduleTo}</th>
            </tr>
          </thead>
          <tbody>
            {WEEKDAY_ORDER.map(day => {
            const row = weekSchedule.find(item => item.day === day) || {
              day,
              enabled: false,
              open: "09:00",
              close: "18:00"
            };
            return <tr key={day} className={row.enabled ? "" : styles.scheduleRowOff}>
                  <td className={styles.scheduleDayCell}>{weekdayLabels[day] || day}</td>
                  <td>
                    <label className={styles.scheduleToggle}>
                      <input type="checkbox" checked={Boolean(row.enabled)} onChange={e => onPatchDay(day, {
                    enabled: e.target.checked
                  })} disabled={disabled} />
                      <span>{row.enabled ? labels.scheduleOpenYes : labels.scheduleClosed}</span>
                    </label>
                  </td>
                  <td>
                    <input type="time" className={styles.scheduleTimeInput} value={row.open} disabled={!row.enabled || disabled} onChange={e => onPatchDay(day, {
                  open: e.target.value
                })} />
                  </td>
                  <td>
                    <input type="time" className={styles.scheduleTimeInput} value={row.close} disabled={!row.enabled || disabled} onChange={e => onPatchDay(day, {
                  close: e.target.value
                })} />
                  </td>
                </tr>;
          })}
          </tbody>
        </table>
      </div>

      <p className={styles.scheduleSummary}>
        <Icon icon="mdi:clock-outline" aria-hidden />
        {scheduleSummary}
      </p>
    </form>;
}
