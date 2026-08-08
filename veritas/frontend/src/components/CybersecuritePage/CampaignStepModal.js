import { useState, useEffect, useMemo } from "react";
import React from "react";
import { Icon } from "@iconify/react";
import { FaTimes, FaSave } from "react-icons/fa";
import styles from "./CampaignStepModal.module.css";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { getCampaignDetailCopy } from "./campaignDetailI18n";
export default function CampaignStepModal({
  mode,
  initialData,
  users = [],
  onSave,
  onClose,
  copy
}) {
  const locale = useAppLocale();
  const localCopy = useMemo(() => getCampaignDetailCopy(locale), [locale]);
  const detailCopy = copy || localCopy;
  const stepModal = detailCopy.stepModal;
  const [formData, setFormData] = useState({
    name: '',
    assigned_user_id: '',
    due_date: '',
    duration_hours: '',
    completed: false
  });
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || '',
        assigned_user_id: initialData.assigned_user_id || '',
        due_date: initialData.due_date ? typeof initialData.due_date === 'string' ? initialData.due_date.split('T')[0] : initialData.due_date : '',
        duration_hours: initialData.duration_hours ?? '',
        completed: initialData.completed || false
      });
    } else {
      setFormData({
        name: '',
        assigned_user_id: '',
        due_date: '',
        duration_hours: '',
        completed: false
      });
    }
  }, [initialData, mode]);
  const handleSubmit = async e => {
    e.preventDefault();
    if (!formData.name.trim()) return;
    setSaving(true);
    try {
      await onSave({
        name: formData.name.trim(),
        assigned_user_id: formData.assigned_user_id || null,
        due_date: formData.due_date || null,
        duration_hours: formData.duration_hours ? parseInt(formData.duration_hours, 10) : null,
        completed: formData.completed
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };
  const isAdd = mode === 'add';
  return <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <div className={styles.modalTitle}>
            <Icon icon={isAdd ? "mdi:plus-circle" : "mdi:pencil"} className={styles.modalIcon} />
            <h3>{isAdd ? stepModal.addTitle : stepModal.editTitle}</h3>
          </div>
          <button type="button" className={styles.closeButton} onClick={onClose} title={stepModal.close}>
            <FaTimes />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className={styles.modalBody}>
            <div className={styles.formField}>
              <label className={styles.fieldLabel}>{stepModal.name} <span className={styles.required}>{stepModal.required}</span></label>
              <input type="text" value={formData.name} onChange={e => setFormData({
              ...formData,
              name: e.target.value
            })} placeholder={stepModal.namePlaceholder} className={styles.fieldInput} required autoFocus />
            </div>
            <div className={styles.formField}>
              <label className={styles.fieldLabel}>{stepModal.assignee}</label>
              <select value={formData.assigned_user_id} onChange={e => setFormData({
              ...formData,
              assigned_user_id: e.target.value
            })} className={styles.fieldInput}>
                <option value="">{stepModal.noUser}</option>
                {users.map(user => <option key={user.id} value={user.id}>
                    {user.username || user.email}
                  </option>)}
              </select>
            </div>
            <div className={styles.formField}>
              <label className={styles.fieldLabel}>{stepModal.dueDate}</label>
              <input type="date" value={formData.due_date} onChange={e => setFormData({
              ...formData,
              due_date: e.target.value
            })} className={styles.fieldInput} />
            </div>
            <div className={styles.formField}>
              <label className={styles.fieldLabel}>{stepModal.duration}</label>
              <input type="number" value={formData.duration_hours} onChange={e => setFormData({
              ...formData,
              duration_hours: e.target.value
            })} placeholder="0" className={styles.fieldInput} min="0" />
            </div>
          </div>

          <div className={styles.modalFooter}>
            <button type="button" className={styles.cancelButton} onClick={onClose} disabled={saving}>
              <FaTimes />
              {stepModal.cancel}
            </button>
            <button type="submit" className={styles.saveButton} disabled={saving || !formData.name.trim()}>
              {saving ? <>
                  <Icon icon="mdi:loading" className={styles.spinner} />
                  {stepModal.saving}
                </> : <>
                  <FaSave />
                  {isAdd ? stepModal.add : stepModal.save}
                </>}
            </button>
          </div>
        </form>
      </div>
    </div>;
}
