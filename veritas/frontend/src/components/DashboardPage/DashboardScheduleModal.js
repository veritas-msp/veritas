import { createPortal } from "react-dom";
import { useCallback, useEffect, useState } from "react";
import { Icon } from "@iconify/react";
import { FaTimes } from "react-icons/fa";
import { toast } from "react-toastify";
import { createKpiReportSchedule, deleteKpiReportSchedule, fetchKpiReportSchedules, updateKpiReportSchedule } from "../../api/dashboard";
import modalLayout from "../EnterprisesPage/EnterpriseFormModal.module.css";
import periodStyles from "./DashboardPeriodModal.module.css";
import styles from "./DashboardPage.module.css";

const CATEGORY_KEYS = ["support", "devices", "enterprise"];
const EMPTY_FORM = {
  name: "",
  recipients: "",
  categories: CATEGORY_KEYS,
  periodPreset: "30d",
  frequency: "weekly",
  weekday: 1,
  monthday: 1,
  sendHour: 8,
  enabled: true
};

export default function DashboardScheduleModal({
  open,
  copy,
  formatters,
  onClose
}) {
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const modal = copy?.scheduleModal || {};
  const load = useCallback(async () => {
    setLoading(true);
    try {
      setSchedules(await fetchKpiReportSchedules());
    } catch (err) {
      toast.error(err.message || modal.loadError);
      setSchedules([]);
    } finally {
      setLoading(false);
    }
  }, [modal.loadError]);
  useEffect(() => {
    if (!open) return;
    setForm(EMPTY_FORM);
    setEditingId(null);
    load();
  }, [open, load]);
  if (!open || !copy) return null;
  const toggleCategory = key => {
    setForm(prev => ({
      ...prev,
      categories: prev.categories.includes(key) ? prev.categories.filter(item => item !== key) : [...prev.categories, key]
    }));
  };
  const startEdit = item => {
    setEditingId(item.id);
    setForm({
      name: item.name || "",
      recipients: item.recipients || "",
      categories: item.categories?.length ? item.categories : CATEGORY_KEYS,
      periodPreset: item.periodPreset || "30d",
      frequency: item.frequency || "weekly",
      weekday: item.weekday || 1,
      monthday: item.monthday || 1,
      sendHour: item.sendHour ?? 8,
      enabled: item.enabled !== false
    });
  };
  const handleSave = async () => {
    if (!form.name.trim() || !form.recipients.trim() || !form.categories.length) {
      toast.error(modal.validation);
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        name: form.name.trim(),
        recipients: form.recipients.trim(),
        sendHour: Number(form.sendHour),
        weekday: Number(form.weekday),
        monthday: Number(form.monthday)
      };
      if (editingId) await updateKpiReportSchedule(editingId, payload);
      else await createKpiReportSchedule(payload);
      toast.success(editingId ? modal.updated : modal.created);
      setForm(EMPTY_FORM);
      setEditingId(null);
      await load();
    } catch (err) {
      toast.error(err.message || modal.saveError);
    } finally {
      setSaving(false);
    }
  };
  const handleDelete = async id => {
    try {
      await deleteKpiReportSchedule(id);
      toast.success(modal.deleted);
      if (editingId === id) {
        setEditingId(null);
        setForm(EMPTY_FORM);
      }
      await load();
    } catch (err) {
      toast.error(err.message || modal.deleteError);
    }
  };
  const weekdayOptions = [1, 2, 3, 4, 5, 6, 7].map(value => ({
    value,
    label: modal.weekdays?.[value] || String(value)
  }));
  return createPortal(<div className={modalLayout.overlay} onClick={saving ? undefined : onClose} role="presentation">
      <div className={`${modalLayout.shell} ${modalLayout.shellMedium} ${styles.scheduleShell}`} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className={modalLayout.accentBar} aria-hidden />
        <header className={modalLayout.header}>
          <div className={modalLayout.headerMain}>
            <div className={modalLayout.headerIconWrap} aria-hidden>
              <Icon icon="mdi:calendar-clock-outline" />
            </div>
            <div className={modalLayout.headerText}>
              <p className={modalLayout.eyebrow}>{modal.eyebrow}</p>
              <h2 className={modalLayout.title}>{modal.title}</h2>
              <p className={modalLayout.subtitle}>{modal.subtitle}</p>
            </div>
          </div>
          <button type="button" className={modalLayout.closeBtn} onClick={onClose} disabled={saving} aria-label={modal.closeAria}>
            <FaTimes />
          </button>
        </header>
        <div className={`${periodStyles.modalBody} ${styles.scheduleBody}`}>
          <section className={periodStyles.section}>
            <h3 className={periodStyles.sectionTitle}>{editingId ? modal.editTitle : modal.createTitle}</h3>
            <label className={periodStyles.field}>
              <span className={periodStyles.fieldLabel}>{modal.name}</span>
              <input className={periodStyles.fieldInput} value={form.name} onChange={e => setForm(prev => ({
              ...prev,
              name: e.target.value
            }))} />
            </label>
            <label className={periodStyles.field}>
              <span className={periodStyles.fieldLabel}>{modal.recipients}</span>
              <input className={periodStyles.fieldInput} value={form.recipients} onChange={e => setForm(prev => ({
              ...prev,
              recipients: e.target.value
            }))} placeholder={modal.recipientsPlaceholder} />
            </label>
            <div className={styles.scheduleGrid}>
              <label className={periodStyles.field}>
                <span className={periodStyles.fieldLabel}>{modal.period}</span>
                <select className={periodStyles.fieldInput} value={form.periodPreset} onChange={e => setForm(prev => ({
                ...prev,
                periodPreset: e.target.value
              }))}>
                  {["7d", "30d", "90d", "365d", "ytd"].map(key => <option key={key} value={key}>{copy.periods[key]}</option>)}
                </select>
              </label>
              <label className={periodStyles.field}>
                <span className={periodStyles.fieldLabel}>{modal.frequency}</span>
                <select className={periodStyles.fieldInput} value={form.frequency} onChange={e => setForm(prev => ({
                ...prev,
                frequency: e.target.value
              }))}>
                  <option value="daily">{modal.freqDaily}</option>
                  <option value="weekly">{modal.freqWeekly}</option>
                  <option value="monthly">{modal.freqMonthly}</option>
                </select>
              </label>
              <label className={periodStyles.field}>
                <span className={periodStyles.fieldLabel}>{modal.hour}</span>
                <input type="number" min="0" max="23" className={periodStyles.fieldInput} value={form.sendHour} onChange={e => setForm(prev => ({
                ...prev,
                sendHour: e.target.value
              }))} />
              </label>
              {form.frequency === "weekly" ? <label className={periodStyles.field}>
                  <span className={periodStyles.fieldLabel}>{modal.weekday}</span>
                  <select className={periodStyles.fieldInput} value={form.weekday} onChange={e => setForm(prev => ({
                  ...prev,
                  weekday: Number(e.target.value)
                }))}>
                    {weekdayOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                  </select>
                </label> : null}
              {form.frequency === "monthly" ? <label className={periodStyles.field}>
                  <span className={periodStyles.fieldLabel}>{modal.monthday}</span>
                  <input type="number" min="1" max="28" className={periodStyles.fieldInput} value={form.monthday} onChange={e => setForm(prev => ({
                  ...prev,
                  monthday: e.target.value
                }))} />
                </label> : null}
            </div>
            <div className={styles.categoryChecks}>
              {CATEGORY_KEYS.map(key => <label key={key} className={styles.categoryCheck}>
                  <input type="checkbox" checked={form.categories.includes(key)} onChange={() => toggleCategory(key)} />
                  {copy.tabs[key]}
                </label>)}
            </div>
            <label className={styles.categoryCheck}>
              <input type="checkbox" checked={form.enabled} onChange={e => setForm(prev => ({
              ...prev,
              enabled: e.target.checked
            }))} />
              {modal.enabled}
            </label>
            <div className={styles.scheduleFormActions}>
              {editingId ? <button type="button" className={periodStyles.cancelBtn} onClick={() => {
              setEditingId(null);
              setForm(EMPTY_FORM);
            }}>{modal.cancelEdit}</button> : null}
              <button type="button" className={periodStyles.applyBtn} onClick={handleSave} disabled={saving}>
                {saving ? modal.saving : editingId ? modal.save : modal.create}
              </button>
            </div>
          </section>
          <section className={periodStyles.section}>
            <h3 className={periodStyles.sectionTitle}>{modal.listTitle}</h3>
            {loading ? <p className={styles.emptyHint}>{modal.loading}</p> : schedules.length === 0 ? <p className={styles.emptyHint}>{modal.empty}</p> : <div className={styles.scheduleList}>
                {schedules.map(item => <article key={item.id} className={styles.scheduleCard}>
                    <div>
                      <strong>{item.name}</strong>
                      <p>{item.recipients}</p>
                      <p className={styles.scheduleMeta}>
                        {modal.frequencies?.[item.frequency] || item.frequency}
                        {" · "}
                        {copy.periods[item.periodPreset] || item.periodPreset}
                        {item.nextRunAt ? ` · ${modal.nextRun} ${formatters.formatDateTime(item.nextRunAt)}` : ""}
                      </p>
                      {item.lastError ? <p className={periodStyles.error}>{item.lastError}</p> : null}
                    </div>
                    <div className={styles.scheduleCardActions}>
                      <button type="button" className={styles.iconAction} onClick={() => startEdit(item)} title={modal.edit}>
                        <Icon icon="mdi:pencil-outline" />
                      </button>
                      <button type="button" className={`${styles.iconAction} ${styles.iconActionDanger}`} onClick={() => handleDelete(item.id)} title={modal.delete}>
                        <Icon icon="mdi:delete-outline" />
                      </button>
                    </div>
                  </article>)}
              </div>}
          </section>
        </div>
      </div>
    </div>, document.body);
}
