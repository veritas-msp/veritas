import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { Icon } from "@iconify/react";
import { fetchSlaSettings, updateSlaSettings } from "../../api/slaSettings";
import { getTimezoneOptions } from "../../i18n/timezoneOptions";
import { useCommonCopy } from "../../hooks/useCommonCopy";
import { useAdminCommonCopy } from "../../hooks/useAdminCopy";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { DEFAULT_SLA_SETTINGS, SLA_TIME_MODES, createDefaultWeekSchedule } from "../../utils/slaSettingsUtils";
import {
  DEFAULT_WEEKLY_WORKED_HOURS,
  MAX_WEEKLY_WORKED_HOURS,
  MIN_WEEKLY_WORKED_HOURS,
  formatWeeklyHoursDistribution,
  normalizeWeeklyWorkedHours
} from "../../utils/slaWorkweekUtils";
import { setCachedSlaSettings } from "../../utils/slaSettingsCache";
import { interpolate } from "../../i18n/translate";
import {
  formatWeekScheduleSummaryLocalized,
  getSlaCopy,
  getSlaTimeModeHint,
  getSlaTimeModeLabel,
  getWeekdayLabel,
  getWeekdayShortLabel
} from "./adminSlaI18n";
import { Page, Card, Field, Select, Btn, FormGrid } from "./AdminUi";
import adminUi from "./AdminUi.module.css";
import styles from "./AdminSlaSettings.module.css";

function cloneSettings(data) {
  return {
    ...data,
    weeklyWorkedHours: normalizeWeeklyWorkedHours(
      data?.weeklyWorkedHours,
      DEFAULT_SLA_SETTINGS.weeklyWorkedHours ?? DEFAULT_WEEKLY_WORKED_HOURS
    ),
    weekSchedule: (data.weekSchedule || []).map(row => ({
      ...row
    }))
  };
}

export default function AdminSlaSettings() {
  const locale = useAppLocale();
  const copy = useMemo(() => getSlaCopy(locale), [locale]);
  const commonCopy = useCommonCopy();
  const adminCopy = useAdminCommonCopy();
  const [form, setForm] = useState(() => cloneSettings(DEFAULT_SLA_SETTINGS));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSlaSettings()
      .then(data => {
        const next = cloneSettings({
          ...DEFAULT_SLA_SETTINGS,
          ...data
        });
        setForm(next);
        setCachedSlaSettings(next);
      })
      .catch(() => toast.error(copy.loadError))
      .finally(() => setLoading(false));
  }, [copy.loadError]);

  const scheduleSummary = useMemo(() => formatWeekScheduleSummaryLocalized(form, locale), [form, locale]);
  const weeklyDistribution = useMemo(() => {
    return formatWeeklyHoursDistribution(
      form.weekSchedule,
      form.weeklyWorkedHours,
      day => getWeekdayShortLabel(locale, day)
    );
  }, [form.weekSchedule, form.weeklyWorkedHours, locale]);
  const timezoneGroups = useMemo(() => getTimezoneOptions(form.timezone).groups, [form.timezone]);

  const setTimeMode = timeMode => setForm(prev => ({
    ...prev,
    timeMode
  }));
  const setTimezone = timezone => setForm(prev => ({
    ...prev,
    timezone
  }));
  const setWeeklyWorkedHours = value => {
    setForm(prev => ({
      ...prev,
      weeklyWorkedHours: value
    }));
  };
  const patchDay = (day, patch) => {
    setForm(prev => ({
      ...prev,
      weekSchedule: (prev.weekSchedule || []).map(row =>
        row.day === day
          ? {
              ...row,
              ...patch
            }
          : row
      )
    }));
  };
  const applyWeekdaysTemplate = () => {
    setForm(prev => ({
      ...prev,
      weekSchedule: createDefaultWeekSchedule()
    }));
  };
  const save = async () => {
    setSaving(true);
    try {
      const payload = {
        ...form,
        weeklyWorkedHours: normalizeWeeklyWorkedHours(
          form.weeklyWorkedHours,
          DEFAULT_WEEKLY_WORKED_HOURS
        )
      };
      const { settings } = await updateSlaSettings(payload);
      const next = cloneSettings(settings || payload);
      setForm(next);
      setCachedSlaSettings(next);
      toast.success(copy.saveSuccess);
    } catch (err) {
      toast.error(err.message || copy.saveError);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Page>
        <p className={adminUi.adminMutedText}>{copy.loading}</p>
      </Page>
    );
  }

  return (
    <Page>
      <Card title={copy.modeTitle} description={copy.modeDescription}>
        <FormGrid cols={2}>
          <Field label={copy.timeModeLabel}>
            <Select value={form.timeMode} onChange={e => setTimeMode(e.target.value)}>
              {SLA_TIME_MODES.map(mode => (
                <option key={mode} value={mode}>
                  {getSlaTimeModeLabel(locale, mode)}
                </option>
              ))}
            </Select>
          </Field>

          <Field label={copy.timezoneLabel} hint={copy.timezoneHint}>
            <Select value={form.timezone} onChange={e => setTimezone(e.target.value)}>
              {timezoneGroups.map(group => (
                <optgroup key={group.offsetLabel} label={group.offsetLabel}>
                  {group.options.map(({ value, label }) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </optgroup>
              ))}
            </Select>
          </Field>
        </FormGrid>

        <p className={styles.modeHint}>
          <Icon icon="mdi:information-outline" aria-hidden />
          {getSlaTimeModeHint(locale, form.timeMode)}
        </p>
      </Card>

      <Card
        title={copy.scheduleTitle}
        description={copy.scheduleDescription}
        action={
          <Btn variant="secondary" size="sm" icon="mdi:calendar-week" onClick={applyWeekdaysTemplate}>
            {copy.weekdaysTemplate}
          </Btn>
        }
      >
        <div className={styles.scheduleWrap}>
          <table className={styles.scheduleTable}>
            <thead>
              <tr>
                <th>{copy.dayColumn}</th>
                <th>{copy.openColumn}</th>
                <th>{copy.startColumn}</th>
                <th>{copy.endColumn}</th>
              </tr>
            </thead>
            <tbody>
              {[1, 2, 3, 4, 5, 6, 0].map(day => {
                const row = (form.weekSchedule || []).find(item => item.day === day) || {
                  day,
                  enabled: false,
                  open: "09:00",
                  close: "18:00"
                };
                return (
                  <tr key={day} className={row.enabled ? "" : styles.scheduleRowOff}>
                    <td className={styles.dayCell}>{getWeekdayLabel(locale, day)}</td>
                    <td>
                      <label className={styles.toggleCell}>
                        <input
                          type="checkbox"
                          checked={Boolean(row.enabled)}
                          onChange={e =>
                            patchDay(day, {
                              enabled: e.target.checked
                            })
                          }
                        />
                        <span>{row.enabled ? adminCopy.yes : adminCopy.closed}</span>
                      </label>
                    </td>
                    <td>
                      <input
                        type="time"
                        className={styles.timeInput}
                        value={row.open}
                        disabled={!row.enabled}
                        onChange={e =>
                          patchDay(day, {
                            open: e.target.value
                          })
                        }
                      />
                    </td>
                    <td>
                      <input
                        type="time"
                        className={styles.timeInput}
                        value={row.close}
                        disabled={!row.enabled}
                        onChange={e =>
                          patchDay(day, {
                            close: e.target.value
                          })
                        }
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <p className={styles.scheduleSummary}>
          <Icon icon="mdi:clock-outline" aria-hidden />
          {scheduleSummary}
        </p>
      </Card>

      <Card title={copy.weeklyTitle} description={copy.weeklyDescription}>
        <FormGrid cols={2}>
          <Field label={copy.weeklyLabel} hint={copy.weeklyHint}>
            <input
              type="number"
              className={styles.timeInput}
              min={MIN_WEEKLY_WORKED_HOURS}
              max={MAX_WEEKLY_WORKED_HOURS}
              step={0.5}
              value={form.weeklyWorkedHours ?? DEFAULT_WEEKLY_WORKED_HOURS}
              onChange={e => setWeeklyWorkedHours(e.target.value)}
              onBlur={() =>
                setWeeklyWorkedHours(
                  normalizeWeeklyWorkedHours(form.weeklyWorkedHours, DEFAULT_WEEKLY_WORKED_HOURS)
                )
              }
            />
          </Field>
        </FormGrid>
        <p className={styles.scheduleSummary}>
          <Icon icon="mdi:calendar-clock" aria-hidden />
          {weeklyDistribution
            ? interpolate(copy.weeklyDistribution, { summary: weeklyDistribution })
            : copy.weeklyNoOpenDays}
        </p>
      </Card>

      <Card title={copy.applicationTitle} description={copy.applicationDescription}>
        <ul className={styles.bulletList}>
          <li>{copy.bullet1}</li>
          <li>{copy.bullet2}</li>
          <li>{copy.bullet3}</li>
        </ul>
      </Card>

      <div className={styles.saveRow}>
        <Btn icon="mdi:content-save-outline" onClick={save} disabled={saving}>
          {saving ? commonCopy.saving : copy.saveBtn}
        </Btn>
      </div>
    </Page>
  );
}
