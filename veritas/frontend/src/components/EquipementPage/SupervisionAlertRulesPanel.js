import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import { toast } from "react-toastify";
import { updateSupervisionAlertRules } from "../../api/supervisionAlertRules";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { invalidateSupervisionAlertRulesCache } from "../../hooks/useSupervisionAlertRules";
import {
  buildDefaultMonitoringAlertRules,
  countEnabledRulesForFamily,
  getCriteriaForFamily,
  isRuleEnabled,
  normalizeRulesTree,
  SUPERVISION_FAMILIES
} from "./supervisionAlertRulesConfig";
import { getSupervisionAlertRulesCopy } from "./supervisionAlertRulesPanelI18n";
import styles from "./SupervisionAlertRulesPanel.module.css";

function Toggle({ checked, onChange, disabled, label }) {
  return (
    <label className={styles.toggle}>
      <input
        type="checkbox"
        className={styles.toggleInput}
        checked={checked}
        onChange={e => onChange(e.target.checked)}
        disabled={disabled}
        aria-label={label}
      />
      <span className={styles.toggleTrack} aria-hidden />
      <span className={styles.toggleLabel}>{label}</span>
    </label>
  );
}

function familyIcon(family) {
  return family?.icon || "mdi:devices";
}

export default function MonitoringAlertRulesPanel({
  catalog,
  rules: rulesProp,
  isAdmin = false,
  onSaved
}) {
  const locale = useAppLocale();
  const copy = useMemo(() => getSupervisionAlertRulesCopy(locale), [locale]);
  const criteriaCatalog = catalog?.criteria || [];
  const families = useMemo(() => {
    const source = catalog?.families?.length ? catalog.families : SUPERVISION_FAMILIES;
    return source.map(family => {
      const local = SUPERVISION_FAMILIES.find(f => f.key === family.key);
      return {
        ...family,
        icon: family.icon || local?.icon || "mdi:devices",
        label: copy.getFamilyLabel(family.key, family.label)
      };
    });
  }, [catalog?.families, copy]);

  const criteriaByKey = useMemo(() => {
    const map = new Map();
    const list = criteriaCatalog.length ? criteriaCatalog : null;
    if (list) {
      list.forEach(c => map.set(c.key, c));
    }
    return map;
  }, [criteriaCatalog]);

  const baseline = useMemo(
    () => normalizeRulesTree(rulesProp, criteriaCatalog.length ? criteriaCatalog : undefined, families),
    [rulesProp, criteriaCatalog, families]
  );

  const [draft, setDraft] = useState(baseline);
  const [selectedFamily, setSelectedFamily] = useState(() => families[0]?.key || "ordinateurs");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDraft(baseline);
  }, [baseline]);

  useEffect(() => {
    if (!families.some(f => f.key === selectedFamily) && families[0]) {
      setSelectedFamily(families[0].key);
    }
  }, [families, selectedFamily]);

  const isDirty = useMemo(() => JSON.stringify(draft) !== JSON.stringify(baseline), [draft, baseline]);

  const activeFamily = families.find(f => f.key === selectedFamily) || families[0];
  const familyCriteria = useMemo(() => {
    if (!activeFamily) return [];
    if (criteriaCatalog.length) {
      return criteriaCatalog.filter(c => Array.isArray(c.families) && c.families.includes(activeFamily.key));
    }
    return getCriteriaForFamily(activeFamily.key);
  }, [activeFamily, criteriaCatalog]);

  const handleToggle = useCallback((familyKey, criterionKey, enabled) => {
    setDraft(prev => {
      const current = prev?.[familyKey]?.[criterionKey];
      const nextValue =
        current && typeof current === "object"
          ? { ...current, enabled: Boolean(enabled) }
          : { enabled: Boolean(enabled), parameters: {}, severity: "normal" };
      return {
        ...prev,
        [familyKey]: {
          ...(prev[familyKey] || {}),
          [criterionKey]: nextValue
        }
      };
    });
  }, []);

  const handleParameterChange = useCallback((familyKey, criterionKey, paramKey, value) => {
    setDraft(prev => {
      const current = prev?.[familyKey]?.[criterionKey];
      const base =
        current && typeof current === "object"
          ? { ...current, parameters: { ...(current.parameters || {}) } }
          : { enabled: true, parameters: {}, severity: "normal" };
      const n = Number(value);
      base.parameters[paramKey] = Number.isFinite(n) ? n : value;
      return {
        ...prev,
        [familyKey]: {
          ...(prev[familyKey] || {}),
          [criterionKey]: base
        }
      };
    });
  }, []);

  const handleResetFamily = useCallback(
    familyKey => {
      const defaults = buildDefaultMonitoringAlertRules();
      setDraft(prev => ({
        ...prev,
        [familyKey]: { ...(defaults[familyKey] || {}) }
      }));
    },
    []
  );

  const handleResetAll = useCallback(() => {
    setDraft(buildDefaultMonitoringAlertRules());
  }, []);

  const handleSave = async () => {
    if (!isAdmin) return;
    setSaving(true);
    try {
      const payload = normalizeRulesTree(draft, criteriaCatalog.length ? criteriaCatalog : undefined, families);
      const data = await updateSupervisionAlertRules(payload);
      const saved = normalizeRulesTree(data.rules, criteriaCatalog.length ? criteriaCatalog : undefined, families);
      invalidateSupervisionAlertRulesCache();
      onSaved?.(saved);
      setDraft(saved);
      toast.success(copy.toasts.saved);
    } catch (err) {
      toast.error(err.message || copy.toasts.saveFailed);
    } finally {
      setSaving(false);
    }
  };

  if (!activeFamily) return null;

  const familyRules = draft[activeFamily.key] || {};
  const enabledOnFamily = countEnabledRulesForFamily(activeFamily.key, draft);

  return (
    <div className={styles.panel}>
      <header className={styles.header}>
        <div>
          <h2 className={styles.title}>
            <Icon icon="mdi:bell-cog-outline" className={styles.titleIcon} aria-hidden />
            {copy.title}
          </h2>
          <p className={styles.subtitle}>{copy.subtitle}</p>
        </div>
        {isAdmin ? (
          <div className={styles.headerActions}>
            <button type="button" className={styles.btnGhost} onClick={handleResetAll} disabled={saving}>
              {copy.resetAll}
            </button>
            <button type="button" className={styles.btnPrimary} onClick={handleSave} disabled={saving || !isDirty}>
              {saving ? copy.saving : copy.save}
            </button>
          </div>
        ) : (
          <p className={styles.readOnlyNote}>{copy.readOnly}</p>
        )}
      </header>

      <div className={styles.layout}>
        <nav className={styles.familyNav} aria-label={copy.familyNavAria}>
          {families.map(family => {
            const enabled = countEnabledRulesForFamily(family.key, draft);
            const total = (criteriaCatalog.length
              ? criteriaCatalog.filter(c => Array.isArray(c.families) && c.families.includes(family.key))
              : getCriteriaForFamily(family.key)
            ).length;
            if (!total) return null;
            const isActive = family.key === activeFamily.key;
            return (
              <button
                key={family.key}
                type="button"
                className={`${styles.familyNavItem} ${isActive ? styles.familyNavItemActive : ""}`}
                onClick={() => setSelectedFamily(family.key)}
                aria-current={isActive ? "page" : undefined}
              >
                <Icon icon={familyIcon(family)} className={styles.familyNavIcon} aria-hidden />
                <span className={styles.familyNavText}>
                  <span className={styles.familyNavLabel}>{family.label}</span>
                  <span className={styles.familyNavMeta}>{copy.formatActiveCount(enabled, total)}</span>
                </span>
              </button>
            );
          })}
        </nav>

        <section className={styles.detail} aria-labelledby="alert-rules-family-title">
          <div className={styles.detailHeader}>
            <div className={styles.detailTitleRow}>
              <Icon icon={familyIcon(activeFamily)} className={styles.detailIcon} aria-hidden />
              <div>
                <h3 id="alert-rules-family-title" className={styles.detailTitle}>
                  {activeFamily.label}
                </h3>
                <p className={styles.detailSubtitle}>
                  {copy.formatFamilyHint(enabledOnFamily, familyCriteria.length)}
                </p>
              </div>
            </div>
            {isAdmin ? (
              <button
                type="button"
                className={styles.resetFamilyBtn}
                onClick={() => handleResetFamily(activeFamily.key)}
                disabled={saving}
              >
                {copy.formatResetFamily(activeFamily.label)}
              </button>
            ) : null}
          </div>

          <div className={styles.criteriaList}>
            {familyCriteria.map(criterion => {
              const meta = criteriaByKey.get(criterion.key) || criterion;
              const rule = familyRules[criterion.key] || { enabled: false, parameters: {} };
              const enabled = isRuleEnabled(rule);
              const parameters = rule.parameters || {};
              const paramFields = Array.isArray(meta.parameters) ? meta.parameters : [];
              return (
                <article
                  key={criterion.key}
                  className={`${styles.criterionCard} ${enabled ? styles.criterionCardOn : styles.criterionCardOff}`}
                >
                  <div className={styles.criterionTop}>
                    <div className={styles.criterionText}>
                      <span className={styles.criterionLabel}>
                        {copy.getCriterionLabel(criterion.key, meta.label)}
                      </span>
                      <span className={styles.criterionDesc}>
                        {copy.getCriterionDescription(criterion.key, meta.description)}
                      </span>
                    </div>
                    <Toggle
                      checked={enabled}
                      onChange={value => handleToggle(activeFamily.key, criterion.key, value)}
                      disabled={!isAdmin || saving}
                      label={enabled ? copy.toggleOn : copy.toggleOff}
                    />
                  </div>
                  {enabled && paramFields.length > 0 ? (
                    <div className={styles.paramGrid}>
                      {paramFields.map(field => (
                        <label key={field.key} className={styles.paramField}>
                          <span className={styles.paramLabel}>
                            {copy.getParameterLabel(criterion.key, field.key, field.label)}
                            {field.unit ? ` (${field.unit})` : ""}
                          </span>
                          <input
                            type="number"
                            className={styles.paramInput}
                            min={field.min}
                            max={field.max}
                            value={parameters[field.key] ?? field.default ?? ""}
                            disabled={!isAdmin || saving}
                            onChange={e =>
                              handleParameterChange(activeFamily.key, criterion.key, field.key, e.target.value)
                            }
                          />
                        </label>
                      ))}
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        </section>
      </div>

      {isAdmin && isDirty ? (
        <footer className={styles.stickyBar}>
          <span className={styles.stickyHint}>{copy.unsavedChanges}</span>
          <button type="button" className={styles.btnPrimary} onClick={handleSave} disabled={saving}>
            {saving ? copy.saving : copy.save}
          </button>
        </footer>
      ) : null}
    </div>
  );
}
