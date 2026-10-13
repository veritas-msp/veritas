import { useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import { FaPlus, FaTrash } from "react-icons/fa";
import { toast } from "react-toastify";
import { getCampaignSteps, updateClientCampaign } from "../../api/campaigns";
import { useAuthContext } from "../../contexts/AuthContext";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import enterpriseStyles from "../EnterprisesPage/EnterpriseDetailPage.module.css";
import { formatCampaignDetail } from "./campaignDetailI18n";
import CampaignSteps from "./CampaignSteps";
import styles from "./CampaignManagementPanel.module.css";

function normalizeManagement(raw) {
  const base = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
  return {
    notes: typeof base.notes === "string" ? base.notes : "",
    timeEntries: Array.isArray(base.timeEntries) ? base.timeEntries : [],
    checklist: Array.isArray(base.checklist) ? base.checklist : []
  };
}

function newId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `tmp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export default function CampaignManagementPanel({
  campaign,
  clientId,
  copy,
  onCampaignUpdate,
  onStepsCountUpdate
}) {
  const locale = useAppLocale();
  const { user: currentUser } = useAuthContext();
  const mgmt = copy?.management || {};
  const [management, setManagement] = useState(() => normalizeManagement(campaign?.management));
  const [steps, setSteps] = useState([]);
  const [stepsRefreshKey, setStepsRefreshKey] = useState(0);
  const [saving, setSaving] = useState(false);
  const [hoursInput, setHoursInput] = useState("");
  const [noteInput, setNoteInput] = useState("");
  const [dateInput, setDateInput] = useState(() => new Date().toISOString().slice(0, 10));

  useEffect(() => {
    setManagement(normalizeManagement(campaign?.management));
  }, [campaign?.id, campaign?.management]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!clientId || !campaign?.id) {
        if (!cancelled) setSteps([]);
        return;
      }
      try {
        const list = await getCampaignSteps(clientId, campaign.id);
        if (!cancelled) setSteps(Array.isArray(list) ? list : []);
      } catch {
        if (!cancelled) setSteps([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [clientId, campaign?.id, stepsRefreshKey]);

  const persistManagement = useCallback(async (nextManagement) => {
    if (!clientId || !campaign?.id) return;
    setSaving(true);
    try {
      await updateClientCampaign(clientId, campaign.id, { management: nextManagement });
      setManagement(nextManagement);
      onCampaignUpdate?.();
    } catch (error) {
      console.error("Error saving campaign management:", error);
      toast.error(error.message || mgmt.saveError);
      throw error;
    } finally {
      setSaving(false);
    }
  }, [clientId, campaign?.id, onCampaignUpdate, mgmt.saveError]);

  const plannedHours = useMemo(
    () => steps.reduce((sum, step) => sum + (Number(step.duration_hours) || 0), 0),
    [steps]
  );
  const spentHours = useMemo(
    () => management.timeEntries.reduce((sum, entry) => sum + (Number(entry.hours) || 0), 0),
    [management.timeEntries]
  );

  const handleStepsChanged = useCallback(() => {
    setStepsRefreshKey(key => key + 1);
    onCampaignUpdate?.();
  }, [onCampaignUpdate]);

  const handleAddTime = async () => {
    const hours = Number(hoursInput);
    if (!Number.isFinite(hours) || hours <= 0) {
      toast.error(mgmt.invalidHours);
      return;
    }
    const entry = {
      id: newId(),
      date: dateInput || new Date().toISOString().slice(0, 10),
      hours,
      note: noteInput.trim(),
      userId: currentUser?.id || null,
      userName: currentUser?.name || currentUser?.username || currentUser?.email || "",
      createdAt: new Date().toISOString()
    };
    const next = {
      ...management,
      timeEntries: [entry, ...management.timeEntries]
    };
    try {
      await persistManagement(next);
      setHoursInput("");
      setNoteInput("");
      toast.success(mgmt.timeAdded);
    } catch {
      // toast already shown
    }
  };

  const handleDeleteTime = async (entryId) => {
    const next = {
      ...management,
      timeEntries: management.timeEntries.filter(entry => entry.id !== entryId)
    };
    try {
      await persistManagement(next);
    } catch {
      // toast already shown
    }
  };

  return (
    <div className={styles.root}>
      <div className={styles.kpiRow}>
        <div className={styles.kpiCard}>
          <span className={styles.kpiLabel}>{mgmt.spentHours}</span>
          <strong className={styles.kpiValue}>{spentHours.toLocaleString(locale, { maximumFractionDigits: 1 })} h</strong>
        </div>
        <div className={styles.kpiCard}>
          <span className={styles.kpiLabel}>{mgmt.plannedHours}</span>
          <strong className={styles.kpiValue}>{plannedHours.toLocaleString(locale, { maximumFractionDigits: 1 })} h</strong>
        </div>
        <div className={styles.kpiCard}>
          <span className={styles.kpiLabel}>{mgmt.phasesLabel}</span>
          <strong className={styles.kpiValue}>
            {formatCampaignDetail(mgmt.phasesCount, {
              done: steps.filter(step => step.completed).length,
              total: steps.length
            })}
          </strong>
        </div>
      </div>

      <div className={styles.grid}>
        <section className={`${enterpriseStyles.panel} ${styles.panel} ${styles.phasesPanel}`.trim()}>
          <div className={`${enterpriseStyles.panelBody} ${styles.phasesBody}`.trim()}>
            <CampaignSteps
              campaign={campaign}
              clientId={clientId}
              onCampaignUpdate={handleStepsChanged}
              onStepsCountUpdate={onStepsCountUpdate}
              embedded={false}
              fill
              copy={copy}
            />
          </div>
        </section>

        <section className={`${enterpriseStyles.panel} ${styles.panel} ${styles.timePanel}`.trim()}>
          <div className={enterpriseStyles.panelHeader}>
            <h2 className={enterpriseStyles.panelTitle}>
              <Icon icon="mdi:timer-outline" className={enterpriseStyles.panelTitleIcon} aria-hidden />
              {mgmt.timeTitle}
            </h2>
          </div>
          <div className={`${enterpriseStyles.panelBody} ${styles.panelBody} ${styles.timeBody}`.trim()}>
            <p className={styles.hint}>{mgmt.timeHint}</p>
            <div className={styles.timeForm}>
              <label className={styles.field}>
                <span>{mgmt.date}</span>
                <input type="date" value={dateInput} onChange={e => setDateInput(e.target.value)} />
              </label>
              <label className={styles.field}>
                <span>{mgmt.hours}</span>
                <input
                  type="number"
                  min="0.25"
                  step="0.25"
                  value={hoursInput}
                  onChange={e => setHoursInput(e.target.value)}
                  placeholder="1.5"
                />
              </label>
              <label className={`${styles.field} ${styles.fieldGrow}`.trim()}>
                <span>{mgmt.timeNote}</span>
                <input
                  type="text"
                  value={noteInput}
                  onChange={e => setNoteInput(e.target.value)}
                  placeholder={mgmt.timeNotePlaceholder}
                />
              </label>
              <button type="button" className={styles.primaryBtn} onClick={handleAddTime} disabled={saving}>
                <FaPlus aria-hidden />
                {mgmt.addTime}
              </button>
            </div>
            <ul className={styles.timeList}>
              {management.timeEntries.length === 0 ? (
                <li className={styles.empty}>{mgmt.timeEmpty}</li>
              ) : (
                management.timeEntries.map(entry => (
                  <li key={entry.id} className={styles.timeItem}>
                    <div className={styles.timeMain}>
                      <strong>{Number(entry.hours).toLocaleString(locale, { maximumFractionDigits: 2 })} h</strong>
                      <span>{entry.date ? new Date(entry.date).toLocaleDateString(locale) : "—"}</span>
                      {entry.userName ? <span className={styles.muted}>{entry.userName}</span> : null}
                    </div>
                    {entry.note ? <p className={styles.timeNoteText}>{entry.note}</p> : null}
                    <button
                      type="button"
                      className={styles.iconBtn}
                      onClick={() => handleDeleteTime(entry.id)}
                      disabled={saving}
                      aria-label={mgmt.deleteTime}
                      title={mgmt.deleteTime}
                    >
                      <FaTrash />
                    </button>
                  </li>
                ))
              )}
            </ul>
          </div>
        </section>
      </div>
    </div>
  );
}
