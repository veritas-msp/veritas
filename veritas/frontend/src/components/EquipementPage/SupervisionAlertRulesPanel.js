import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import { toast } from "react-toastify";
import { updateSupervisionAlertRules } from "../../api/supervisionAlertRules";
import { fetchSupportForms } from "../../api/tickets";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { invalidateSupervisionAlertRulesCache } from "../../hooks/useSupervisionAlertRules";
import { listMappableSupportFormFields } from "../../utils/supportFormTicketContent";
import { interpolate } from "../../i18n/translate";
import {
  buildDefaultMonitoringAlertRules,
  countEnabledRulesForFamily,
  filterCriteriaForScope,
  getCriteriaForFamily,
  isRuleEnabled,
  normalizeRulesTree,
  SUPERVISION_FAMILIES
} from "./supervisionAlertRulesConfig";
import { getSupervisionAlertRulesCopy } from "./supervisionAlertRulesPanelI18n";
import layout from "../EnterprisesPage/EnterprisesPage.module.css";
import styles from "./SupervisionAlertRulesPanel.module.css";
import { UiKitCrmListToolbar } from "../UiKit";

const FAMILY_NAV_SECTIONS = [
  { id: "endpoints", titleKey: "navSectionEndpoints", keys: ["ordinateurs"] },
  {
    id: "infra",
    titleKey: "navSectionInfra",
    keys: ["servers", "stockage", "firewall", "switch", "wifi", "routeur", "internet", "toip", "alimentation"]
  },
  { id: "contracts", titleKey: "navSectionContracts", keys: ["contrats"] }
];

function normalizeNavSearch(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function Toggle({ checked, onChange, disabled, label, onClick }) {
  return (
    <label className={styles.toggle} onClick={onClick}>
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

function familyCriteriaCount(familyKey, criteriaCatalog, centreOnly) {
  if (criteriaCatalog.length) {
    return criteriaCatalog.filter(c => Array.isArray(c.families) && c.families.includes(familyKey)).length;
  }
  return getCriteriaForFamily(familyKey, { centreOnly }).length;
}

export default function MonitoringAlertRulesPanel({
  catalog,
  rules: rulesProp,
  isAdmin = false,
  onSaved,
  /** "centre" = critères monitoring du centre only ; "all" = catalogue complet (Admin). */
  scope = "all",
  toolbarActions = null
}) {
  const locale = useAppLocale();
  const copy = useMemo(() => getSupervisionAlertRulesCopy(locale), [locale]);
  const centreOnly = scope === "centre";
  const criteriaCatalog = useMemo(
    () => filterCriteriaForScope(catalog?.criteria || [], scope),
    [catalog?.criteria, scope]
  );
  const families = useMemo(() => {
    const source = catalog?.families?.length ? catalog.families : SUPERVISION_FAMILIES;
    const mapped = source.map(family => {
      const local = SUPERVISION_FAMILIES.find(f => f.key === family.key);
      return {
        ...family,
        icon: family.icon || local?.icon || "mdi:devices",
        label: copy.getFamilyLabel(family.key, family.label)
      };
    });
    if (!centreOnly) return mapped;
    return mapped.filter(family => getCriteriaForFamily(family.key, { centreOnly: true }).length > 0);
  }, [catalog?.families, copy, centreOnly]);

  const criteriaByKey = useMemo(() => {
    const map = new Map();
    const full = Array.isArray(catalog?.criteria) ? catalog.criteria : [];
    const list = full.length ? full : null;
    if (list) {
      list.forEach(c => map.set(c.key, c));
    }
    return map;
  }, [catalog?.criteria]);

  const baseline = useMemo(
    () =>
      normalizeRulesTree(
        rulesProp,
        Array.isArray(catalog?.criteria) && catalog.criteria.length ? catalog.criteria : undefined,
        catalog?.families?.length ? catalog.families : SUPERVISION_FAMILIES
      ),
    [rulesProp, catalog?.criteria, catalog?.families]
  );

  const [draft, setDraft] = useState(baseline);
  const [selectedFamily, setSelectedFamily] = useState(() => families[0]?.key || "ordinateurs");
  const [saving, setSaving] = useState(false);
  const [supportForms, setSupportForms] = useState([]);
  const [navSearch, setNavSearch] = useState("");

  useEffect(() => {
    setDraft(baseline);
  }, [baseline]);

  useEffect(() => {
    let cancelled = false;
    fetchSupportForms({ includeDisabled: false })
      .then(rows => {
        if (!cancelled) setSupportForms(Array.isArray(rows) ? rows.filter(form => form?.enabled !== false) : []);
      })
      .catch(() => {
        if (!cancelled) setSupportForms([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const supportFormsById = useMemo(() => {
    const map = new Map();
    supportForms.forEach(form => map.set(String(form.id), form));
    return map;
  }, [supportForms]);

  useEffect(() => {
    if (!families.some(f => f.key === selectedFamily) && families[0]) {
      setSelectedFamily(families[0].key);
    }
  }, [families, selectedFamily]);

  const isDirty = useMemo(() => JSON.stringify(draft) !== JSON.stringify(baseline), [draft, baseline]);

  const familiesWithCounts = useMemo(
    () =>
      families
        .map(family => {
          const total = familyCriteriaCount(family.key, criteriaCatalog, centreOnly);
          if (!total) return null;
          const enabled = countEnabledRulesForFamily(family.key, draft, { centreOnly });
          return { ...family, total, enabled };
        })
        .filter(Boolean),
    [families, criteriaCatalog, centreOnly, draft]
  );

  const navSearchTokens = useMemo(() => {
    const query = normalizeNavSearch(navSearch);
    return query ? query.split(/\s+/).filter(Boolean) : [];
  }, [navSearch]);

  const filteredNavSections = useMemo(() => {
    const byKey = new Map(familiesWithCounts.map(family => [family.key, family]));
    return FAMILY_NAV_SECTIONS.map(section => {
      const items = section.keys
        .map(key => byKey.get(key))
        .filter(Boolean)
        .filter(family => {
          if (!navSearchTokens.length) return true;
          const haystack = normalizeNavSearch([family.label, family.key, copy[section.titleKey]].join(" "));
          return navSearchTokens.every(token => haystack.includes(token));
        });
      if (!items.length) return null;
      return {
        id: section.id,
        title: copy[section.titleKey] || section.id,
        items
      };
    }).filter(Boolean);
  }, [familiesWithCounts, navSearchTokens, copy]);

  const activeFamily = familiesWithCounts.find(f => f.key === selectedFamily) || familiesWithCounts[0];
  const familyCriteria = useMemo(() => {
    if (!activeFamily) return [];
    if (criteriaCatalog.length) {
      return criteriaCatalog.filter(c => Array.isArray(c.families) && c.families.includes(activeFamily.key));
    }
    return getCriteriaForFamily(activeFamily.key, { centreOnly });
  }, [activeFamily, criteriaCatalog, centreOnly]);

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
          : { enabled: true, parameters: {}, severity: "normal", supportFormId: null, subjectFieldKey: null, descriptionFieldKey: null };
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

  const handleTicketMappingChange = useCallback((familyKey, criterionKey, patch) => {
    setDraft(prev => {
      const current = prev?.[familyKey]?.[criterionKey];
      const base =
        current && typeof current === "object"
          ? { ...current }
          : { enabled: true, parameters: {}, severity: "normal", supportFormId: null, subjectFieldKey: null, descriptionFieldKey: null };
      const next = { ...base, ...patch };
      if (Object.prototype.hasOwnProperty.call(patch, "supportFormId")) {
        const formId = patch.supportFormId ? String(patch.supportFormId) : null;
        next.supportFormId = formId;
        if (!formId) {
          next.subjectFieldKey = null;
          next.descriptionFieldKey = null;
        }
      }
      return {
        ...prev,
        [familyKey]: {
          ...(prev[familyKey] || {}),
          [criterionKey]: next
        }
      };
    });
  }, []);

  const handleResetFamily = useCallback(familyKey => {
    const defaults = buildDefaultMonitoringAlertRules();
    setDraft(prev => ({
      ...prev,
      [familyKey]: { ...(defaults[familyKey] || {}) }
    }));
  }, []);

  const handleSave = async () => {
    if (!isAdmin) return;
    setSaving(true);
    try {
      // Toujours normaliser sur le catalogue complet pour ne pas effacer les critères hors centre.
      const fullCriteria =
        Array.isArray(catalog?.criteria) && catalog.criteria.length ? catalog.criteria : undefined;
      const fullFamilies = catalog?.families?.length ? catalog.families : SUPERVISION_FAMILIES;
      const payload = normalizeRulesTree(draft, fullCriteria, fullFamilies);
      const data = await updateSupervisionAlertRules(payload);
      const saved = normalizeRulesTree(data.rules, fullCriteria, fullFamilies);
      invalidateSupervisionAlertRulesCache();
      onSaved?.(saved);
      setDraft(saved);
      toast.success(copy.toasts.saved);
    } catch (err) {
      toast.error(err?.message || copy.toasts.saveFailed);
    } finally {
      setSaving(false);
    }
  };

  if (!activeFamily) return null;

  const familyRules = draft[activeFamily.key] || {};
  const enabledOnFamily = countEnabledRulesForFamily(activeFamily.key, draft, { centreOnly });

  return (
    <div className={`${layout.panelCard} ${styles.root}`} data-page-fill>
      <div className={styles.toolbar} data-guide="supervision-filters">
        <UiKitCrmListToolbar
          searchValue={navSearch}
          onSearchChange={setNavSearch}
          onSearchClear={() => setNavSearch("")}
          searchPlaceholder={copy.searchPlaceholder || "Search…"}
          searchAriaLabel={copy.searchPlaceholder || "Search…"}
          clearSearchLabel={copy.clearSearch || "Clear"}
          extraActions={
            <>
              {!isAdmin ? <span className={styles.readOnlyChip}>{copy.readOnly}</span> : null}
              {toolbarActions}
            </>
          }
        />
      </div>

      <div className={styles.body}>
        <aside className={styles.sidebar} aria-label={copy.familyNavAria}>
          {filteredNavSections.length === 0 && navSearchTokens.length > 0 ? (
            <p className={styles.navSearchEmpty}>
              {interpolate(copy.noResults || "No results for “{query}”", { query: navSearch.trim() })}
            </p>
          ) : null}

          {filteredNavSections.map(section => (
            <div key={section.id} className={styles.navSection}>
              <div className={styles.navSectionTitle}>{section.title}</div>
              <ul className={styles.navList}>
                {section.items.map(family => {
                  const isActive = family.key === activeFamily.key;
                  return (
                    <li key={family.key}>
                      <button
                        type="button"
                        className={`${styles.navItem} ${isActive ? styles.navItemActive : ""}`}
                        onClick={() => setSelectedFamily(family.key)}
                        aria-current={isActive ? "page" : undefined}
                      >
                        <Icon icon={familyIcon(family)} className={styles.navIcon} aria-hidden />
                        <span className={styles.navItemLabel}>{family.label}</span>
                        <span className={styles.navItemCount}>{family.enabled}/{family.total}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </aside>

        <section className={styles.main} aria-labelledby="alert-rules-family-title">
          <header className={styles.mainHeader}>
            <div className={styles.mainHeaderText}>
              <h2 id="alert-rules-family-title" className={styles.mainTitle}>
                <Icon icon={familyIcon(activeFamily)} className={styles.mainTitleIcon} aria-hidden />
                {activeFamily.label}
              </h2>
              <p className={styles.mainHint}>{copy.formatFamilyHint(enabledOnFamily, familyCriteria.length)}</p>
            </div>
            {isAdmin ? (
              <button
                type="button"
                className={styles.resetBtn}
                onClick={() => handleResetFamily(activeFamily.key)}
                disabled={saving}
              >
                {copy.formatResetFamily(activeFamily.label)}
              </button>
            ) : null}
          </header>

          <div className={styles.criteriaList}>
            {familyCriteria.map(criterion => {
              const meta = criteriaByKey.get(criterion.key) || criterion;
              const rule = familyRules[criterion.key] || { enabled: false, parameters: {} };
              const enabled = isRuleEnabled(rule);
              const parameters = rule.parameters || {};
              const paramFields = Array.isArray(meta.parameters) ? meta.parameters : [];
              const canToggle = Boolean(isAdmin) && !saving;
              const toggleCriterion = () => {
                if (!canToggle) return;
                handleToggle(activeFamily.key, criterion.key, !enabled);
              };
              return (
                <article
                  key={criterion.key}
                  className={`${styles.ruleRow} ${enabled ? styles.ruleRowOn : styles.ruleRowOff} ${canToggle ? styles.ruleRowClickable : ""}`}
                  role={canToggle ? "button" : undefined}
                  tabIndex={canToggle ? 0 : undefined}
                  aria-pressed={canToggle ? enabled : undefined}
                  onClick={canToggle ? toggleCriterion : undefined}
                  onKeyDown={
                    canToggle
                      ? event => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            toggleCriterion();
                          }
                        }
                      : undefined
                  }
                >
                  <div className={styles.ruleTop}>
                    <div className={styles.ruleText}>
                      <span className={styles.ruleLabel}>
                        {copy.getCriterionLabel(criterion.key, meta.label)}
                      </span>
                      <span className={styles.ruleDesc}>
                        {copy.getCriterionDescription(criterion.key, meta.description)}
                      </span>
                    </div>
                    <Toggle
                      checked={enabled}
                      onChange={value => handleToggle(activeFamily.key, criterion.key, value)}
                      disabled={!canToggle}
                      label={enabled ? copy.toggleOn : copy.toggleOff}
                      onClick={event => event.stopPropagation()}
                    />
                  </div>
                  {enabled && paramFields.length > 0 ? (
                    <div
                      className={styles.paramGrid}
                      onClick={event => event.stopPropagation()}
                      onKeyDown={event => event.stopPropagation()}
                    >
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
                  {enabled ? (
                    <div
                      className={styles.ticketMapping}
                      onClick={event => event.stopPropagation()}
                      onKeyDown={event => event.stopPropagation()}
                    >
                      <label className={styles.paramField}>
                        <span className={styles.paramLabel}>{copy.supportFormLabel}</span>
                        <select
                          className={styles.paramInput}
                          value={rule.supportFormId || ""}
                          disabled={!isAdmin || saving}
                          onChange={e =>
                            handleTicketMappingChange(activeFamily.key, criterion.key, {
                              supportFormId: e.target.value || null,
                              subjectFieldKey: null,
                              descriptionFieldKey: null
                            })
                          }
                        >
                          <option value="">{copy.supportFormNone}</option>
                          {supportForms.map(form => (
                            <option key={form.id} value={form.id}>
                              {form.label || form.key}
                            </option>
                          ))}
                        </select>
                      </label>
                      {rule.supportFormId
                        ? (() => {
                            const form = supportFormsById.get(String(rule.supportFormId));
                            const mappable = listMappableSupportFormFields(form?.fields || []);
                            return (
                              <>
                                <label className={styles.paramField}>
                                  <span className={styles.paramLabel}>{copy.subjectFieldLabel}</span>
                                  <select
                                    className={styles.paramInput}
                                    value={rule.subjectFieldKey || ""}
                                    disabled={!isAdmin || saving || mappable.length === 0}
                                    onChange={e =>
                                      handleTicketMappingChange(activeFamily.key, criterion.key, {
                                        subjectFieldKey: e.target.value || null
                                      })
                                    }
                                  >
                                    <option value="">{copy.fieldAuto}</option>
                                    {mappable.map(field => (
                                      <option key={field.fieldKey} value={field.fieldKey}>
                                        {field.label || field.fieldKey}
                                      </option>
                                    ))}
                                  </select>
                                </label>
                                <label className={styles.paramField}>
                                  <span className={styles.paramLabel}>{copy.descriptionFieldLabel}</span>
                                  <select
                                    className={styles.paramInput}
                                    value={rule.descriptionFieldKey || ""}
                                    disabled={!isAdmin || saving || mappable.length === 0}
                                    onChange={e =>
                                      handleTicketMappingChange(activeFamily.key, criterion.key, {
                                        descriptionFieldKey: e.target.value || null
                                      })
                                    }
                                  >
                                    <option value="">{copy.fieldAuto}</option>
                                    {mappable.map(field => (
                                      <option key={field.fieldKey} value={field.fieldKey}>
                                        {field.label || field.fieldKey}
                                      </option>
                                    ))}
                                  </select>
                                </label>
                              </>
                            );
                          })()
                        : null}
                      <p className={styles.mappingHint}>{copy.ticketMappingHint}</p>
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>

          {isAdmin && isDirty ? (
            <footer className={styles.stickyBar}>
              <span className={styles.stickyHint}>{copy.unsavedChanges}</span>
              <button type="button" className={styles.btnPrimary} onClick={handleSave} disabled={saving}>
                {saving ? copy.saving : copy.save}
              </button>
            </footer>
          ) : null}
        </section>
      </div>
    </div>
  );
}
