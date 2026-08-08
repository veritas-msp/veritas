import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import { toast } from "react-toastify";
import { updateSupervisionAlertRules } from "../../api/supervisionAlertRules";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { invalidateSupervisionAlertRulesCache } from "../../hooks/useSupervisionAlertRules";
import { buildDefaultMonitoringAlertRules, getCriteriaForFamily, SUPERVISION_FAMILIES } from "./supervisionAlertRulesConfig";
import { getSupervisionAlertRulesCopy } from "./supervisionAlertRulesPanelI18n";
import styles from "./SupervisionAlertRulesPanel.module.css";
function Toggle({
  checked,
  onChange,
  disabled,
  label
}) {
  return <label className={styles.toggle}>
      <input type="checkbox" className={styles.toggleInput} checked={checked} onChange={e => onChange(e.target.checked)} disabled={disabled} />
      <span className={styles.toggleTrack} aria-hidden />
      <span className={styles.toggleLabel}>{label}</span>
    </label>;
}
export default function MonitoringAlertRulesPanel({
  catalog,
  rules: rulesProp,
  isAdmin = false,
  onSaved
}) {
  const locale = useAppLocale();
  const copy = useMemo(() => getSupervisionAlertRulesCopy(locale), [locale]);
  const [draft, setDraft] = useState(rulesProp || buildDefaultMonitoringAlertRules());
  const [saving, setSaving] = useState(false);
  const [expandedFamily, setExpandedFamily] = useState("ordinateurs");
  useEffect(() => {
    if (rulesProp) setDraft(rulesProp);
  }, [rulesProp]);
  const families = useMemo(() => {
    const source = catalog?.families || SUPERVISION_FAMILIES;
    return source.map(family => ({
      ...family,
      label: copy.getFamilyLabel(family.key, family.label)
    }));
  }, [catalog?.families, copy]);
  const criteriaCatalog = catalog?.criteria || [];
  const criteriaByKey = useMemo(() => {
    const map = new Map();
    criteriaCatalog.forEach(c => map.set(c.key, c));
    return map;
  }, [criteriaCatalog]);
  const isDirty = useMemo(() => {
    return JSON.stringify(draft) !== JSON.stringify(rulesProp || buildDefaultMonitoringAlertRules());
  }, [draft, rulesProp]);
  const handleToggle = useCallback((familyKey, criterionKey, enabled) => {
    setDraft(prev => ({
      ...prev,
      [familyKey]: {
        ...(prev[familyKey] || {}),
        [criterionKey]: enabled
      }
    }));
  }, []);
  const handleResetFamily = useCallback(familyKey => {
    const defaults = buildDefaultMonitoringAlertRules();
    setDraft(prev => ({
      ...prev,
      [familyKey]: {
        ...defaults[familyKey]
      }
    }));
  }, []);
  const handleResetAll = useCallback(() => {
    setDraft(buildDefaultMonitoringAlertRules());
  }, []);
  const handleSave = async () => {
    if (!isAdmin) return;
    setSaving(true);
    try {
      const data = await updateSupervisionAlertRules(draft);
      invalidateSupervisionAlertRulesCache();
      onSaved?.(data.rules);
      toast.success(copy.toasts.saved);
    } catch (err) {
      toast.error(err.message || copy.toasts.saveFailed);
    } finally {
      setSaving(false);
    }
  };
  return <div className={styles.panel}>
      <header className={styles.header}>
        <div>
          <h2 className={styles.title}>
            <Icon icon="mdi:bell-cog-outline" className={styles.titleIcon} aria-hidden />
            {copy.title}
          </h2>
          <p className={styles.subtitle}>{copy.subtitle}</p>
        </div>
        {isAdmin ? <div className={styles.headerActions}>
            <button type="button" className={styles.btnGhost} onClick={handleResetAll} disabled={saving}>
              {copy.resetAll}
            </button>
            <button type="button" className={styles.btnPrimary} onClick={handleSave} disabled={saving || !isDirty}>
              {saving ? copy.saving : copy.save}
            </button>
          </div> : <p className={styles.readOnlyNote}>{copy.readOnly}</p>}
      </header>

      <div className={styles.familyList}>
        {families.map(family => {
        const criteria = getCriteriaForFamily(family.key);
        if (!criteria.length) return null;
        const familyRules = draft[family.key] || {};
        const enabledCount = criteria.filter(c => familyRules[c.key]).length;
        const isOpen = expandedFamily === family.key;
        return <section key={family.key} className={styles.familyCard}>
              <button type="button" className={styles.familyHead} onClick={() => setExpandedFamily(isOpen ? null : family.key)} aria-expanded={isOpen}>
                <span className={styles.familyTitle}>{family.label}</span>
                <span className={styles.familyMeta}>
                  {copy.formatActiveCount(enabledCount, criteria.length)}
                </span>
                <Icon icon={isOpen ? "mdi:chevron-up" : "mdi:chevron-down"} className={styles.familyChevron} />
              </button>

              {isOpen ? <div className={styles.criteriaList}>
                  {isAdmin ? <button type="button" className={styles.resetFamilyBtn} onClick={() => handleResetFamily(family.key)}>
                      {copy.formatResetFamily(family.label)}
                    </button> : null}
                  {criteria.map(criterion => {
              const meta = criteriaByKey.get(criterion.key) || criterion;
              const enabled = Boolean(familyRules[criterion.key]);
              const criterionLabel = copy.getCriterionLabel(criterion.key, meta.label);
              const criterionDescription = copy.getCriterionDescription(criterion.key, meta.description);
              return <div key={criterion.key} className={styles.criterionRow}>
                        <div className={styles.criterionText}>
                          <span className={styles.criterionLabel}>{criterionLabel}</span>
                          {criterionDescription ? <span className={styles.criterionDesc}>{criterionDescription}</span> : null}
                        </div>
                        <Toggle checked={enabled} onChange={value => handleToggle(family.key, criterion.key, value)} disabled={!isAdmin || saving} label={enabled ? copy.toggleOn : copy.toggleOff} />
                      </div>;
            })}
                </div> : null}
            </section>;
      })}
      </div>
    </div>;
}
