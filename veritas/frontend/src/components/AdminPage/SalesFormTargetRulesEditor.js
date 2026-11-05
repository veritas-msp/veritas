import { Icon } from "@iconify/react";
import { useEffect, useMemo, useRef, useState } from "react";
import layout from "../EnterprisesPage/EnterpriseFormModal.module.css";
import modalStyles from "./SalesFormModal.module.css";
import MultiSuggestPicker from "./MultiSuggestPicker";
import { getSalesFormTemplateVariables, insertTemplateToken, prettifySalesFormTemplate } from "../../utils/salesFormTicketTemplates";
import { OPTION_BASED_FIELD_TYPES, buildConditionFieldOptions } from "../../utils/salesFormFieldTypes";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";

const TARGET_TABS = [
  { id: "conditions", icon: "mdi:filter-outline" },
  { id: "content", icon: "mdi:text-box-outline" },
  { id: "properties", icon: "mdi:tune-variant" }
];

const PRIORITY_OPTIONS = [
  { value: "", labelFr: "Choix de l’agent", labelEn: "Agent's choice" },
  { value: "low", labelFr: "Basse", labelEn: "Low" },
  { value: "normal", labelFr: "Normale", labelEn: "Normal" },
  { value: "high", labelFr: "Haute", labelEn: "High" },
  { value: "urgent", labelFr: "Urgente", labelEn: "Urgent" }
];

const STATUS_OPTIONS = [
  { value: "", labelFr: "Nouveau (défaut)", labelEn: "New (default)" },
  { value: "new", labelFr: "Nouveau", labelEn: "New" },
  { value: "open", labelFr: "Ouvert", labelEn: "Open" },
  { value: "in_progress", labelFr: "En cours", labelEn: "In progress" },
  { value: "pending", labelFr: "En attente", labelEn: "Pending" }
];

const OPERATOR_OPTIONS = [
  { value: "equals", labelFr: "Est égal à", labelEn: "Equals" },
  { value: "not_equals", labelFr: "Est différent de", labelEn: "Not equal to" },
  { value: "contains", labelFr: "Contient", labelEn: "Contains" },
  { value: "checked", labelFr: "Coché (oui)", labelEn: "Checked (yes)" },
  { value: "not_checked", labelFr: "Non coché", labelEn: "Not checked" }
];

function createRuleId() {
  return `rule-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

export function createEmptyTargetRule(index = 0) {
  return {
    id: createRuleId(),
    label: index === 0 ? "Primary ticket" : `Ticket ${index + 1}`,
    enabled: true,
    always: index === 0,
    matchMode: "all",
    conditions: [],
    targets: {
      priority: "",
      status: "",
      assigneeUserIds: [],
      watcherUserIds: [],
      teamIds: [],
      assigneeFieldKeys: [],
      watcherFieldKeys: [],
      titleSuffix: "",
      titleTemplate: "",
      descriptionTemplate: "",
      categorySlug: ""
    }
  };
}

function FieldHint({ children }) {
  return <p className={modalStyles.hint}>{children}</p>;
}

function optLabel(opt, locale) {
  return locale === "en" ? opt.labelEn : opt.labelFr;
}

function TemplateField({
  label,
  value,
  placeholder,
  multiline = false,
  rows = 4,
  variables = [],
  locale = "fr",
  onChange
}) {
  const inputRef = useRef(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const [showVars, setShowVars] = useState(false);
  const variablesKey = useMemo(
    () => (Array.isArray(variables) ? variables : []).filter(item => item?.group === "fields").map(item => `${item.fieldKey}:${item.key}`).join("|"),
    [variables]
  );
  useEffect(() => {
    const pretty = prettifySalesFormTemplate(value, variables);
    if (pretty !== String(value || "")) onChangeRef.current?.(pretty);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional
  }, [value, variablesKey]);
  const insert = token => {
    const el = inputRef.current;
    const start = el?.selectionStart ?? String(value || "").length;
    const end = el?.selectionEnd ?? start;
    const next = insertTemplateToken(value, token, start, end);
    onChange?.(next.value);
    requestAnimationFrame(() => {
      if (!inputRef.current) return;
      inputRef.current.focus();
      inputRef.current.setSelectionRange(next.caret, next.caret);
    });
  };
  const fieldVars = variables.filter(item => item.group === "fields");
  const contextVars = variables.filter(item => item.group === "context");
  const fieldVarsBySection = (() => {
    const groups = new Map();
    fieldVars.forEach(item => {
      const section = String(item.sectionLabel || "").trim() || (locale === "fr" ? "Champs du formulaire" : "Form fields");
      if (!groups.has(section)) groups.set(section, []);
      groups.get(section).push(item);
    });
    return Array.from(groups.entries());
  })();
  return <div className={`${layout.field} ${layout.fieldFull}`}>
      <div className={modalStyles.templateFieldHead}>
        <label className={layout.label}>{label}</label>
        <button type="button" className={modalStyles.variablesBtn} onMouseDown={e => e.preventDefault()} onClick={() => setShowVars(open => !open)}>
          <Icon icon="mdi:code-tags" aria-hidden />
          {locale === "fr" ? "Variables" : "Variables"}
        </button>
      </div>
      {showVars && <div className={modalStyles.variablePanel}>
          {fieldVarsBySection.map(([section, items]) => <div key={section}>
              <p className={modalStyles.variableGroupTitle}>{section}</p>
              <div className={modalStyles.variableChips}>
                {items.map(item => {
                const sectionPrefix = item.sectionLabel ? `${item.sectionLabel} · ` : "";
                const chipLabel = sectionPrefix && String(item.label || "").startsWith(sectionPrefix) ? String(item.label).slice(sectionPrefix.length) : item.label;
                return <button key={item.key} type="button" className={modalStyles.variableChip} title={item.key} onMouseDown={e => e.preventDefault()} onClick={() => insert(item.key)}>
                    {chipLabel}
                  </button>;
              })}
              </div>
            </div>)}
          <p className={modalStyles.variableGroupTitle}>{locale === "fr" ? "Contexte" : "Context"}</p>
          <div className={modalStyles.variableChips}>
            {contextVars.map(item => <button key={item.key} type="button" className={modalStyles.variableChip} title={item.key} onMouseDown={e => e.preventDefault()} onClick={() => insert(item.key)}>
                {item.label}
              </button>)}
          </div>
        </div>}
      {multiline ? <textarea ref={inputRef} className={layout.input} rows={rows} value={value || ""} placeholder={placeholder} onChange={e => onChange?.(e.target.value)} /> : <input ref={inputRef} className={layout.input} value={value || ""} placeholder={placeholder} onChange={e => onChange?.(e.target.value)} />}
      <FieldHint>
        {locale === "fr"
          ? <>Utilisez {"{{field.Nom du champ}}"} ou des variables de contexte. Laissez vide pour garder la valeur par défaut.</>
          : <>Use {"{{field.Field name}}"} or context variables. Leave empty to keep the default from ticket creation.</>}
      </FieldHint>
    </div>;
}

function getOperatorsForField(field) {
  if (!field) return OPERATOR_OPTIONS;
  if (field.fieldType === "checkbox") {
    return OPERATOR_OPTIONS.filter(opt => opt.value === "checked" || opt.value === "not_checked");
  }
  if (OPTION_BASED_FIELD_TYPES.has(field.fieldType) || field.fieldType === "rating") {
    return OPERATOR_OPTIONS.filter(opt => opt.value === "equals" || opt.value === "not_equals");
  }
  return OPERATOR_OPTIONS.filter(opt => opt.value !== "checked" && opt.value !== "not_checked");
}

function ConditionValueInput({
  condition,
  field,
  locale,
  onChange
}) {
  if (!field) {
    return <input className={layout.input} value={condition.value || ""} placeholder={locale === "fr" ? "Valeur" : "Value"} onChange={e => onChange({
      ...condition,
      value: e.target.value
    })} />;
  }
  if (field.fieldType === "checkbox") {
    return <span className={modalStyles.conditionHint}>{locale === "fr" ? "Aucune valeur requise" : "No value required"}</span>;
  }
  if (field.fieldType === "rating") {
    return <select className={layout.input} value={condition.value || ""} onChange={e => onChange({
      ...condition,
      value: e.target.value
    })}>
        <option value="">{locale === "fr" ? "- Choisir -" : "- Choose -"}</option>
        {[1, 2, 3, 4, 5].map(star => <option key={star} value={String(star)}>
            {star}/5
          </option>)}
      </select>;
  }
  if (OPTION_BASED_FIELD_TYPES.has(field.fieldType) && Array.isArray(field.options) && field.options.length > 0) {
    return <select className={layout.input} value={condition.value || ""} onChange={e => onChange({
      ...condition,
      value: e.target.value
    })}>
        <option value="">{locale === "fr" ? "- Choisir -" : "- Choose -"}</option>
        {field.options.map(option => {
        const value = typeof option === "object" ? option.value || option.label : option;
        const label = typeof option === "object" ? option.label || option.value : option;
        return <option key={String(value)} value={String(value)}>
              {label}
            </option>;
      })}
      </select>;
  }
  return <input className={layout.input} value={condition.value || ""} placeholder={locale === "fr" ? "Valeur attendue" : "Expected value"} onChange={e => onChange({
    ...condition,
    value: e.target.value
  })} />;
}

function TargetRuleDetail({
  rule,
  index,
  formFields,
  formKind = "prestation",
  categoryOptions = [],
  userOptions,
  teamOptions,
  locale,
  activeTab,
  onChange,
  onRemove,
  canRemove
}) {
  const fieldOptions = buildConditionFieldOptions(formFields, {
    excludeFiles: true
  });
  const templateVariables = useMemo(() => getSalesFormTemplateVariables(formFields), [formFields]);
  const assigneeSourceFields = buildConditionFieldOptions(formFields, {
    excludeFiles: true
  }).filter(option => option.field?.fieldType === "user" || option.field?.fieldType === "contact");
  const assigneeFieldOptions = assigneeSourceFields.map(option => ({
    id: option.id,
    label: option.label,
    hint: option.field?.fieldType === "contact"
      ? (locale === "fr" ? "Contact entreprise" : "Company contact")
      : (locale === "fr" ? "Utilisateur" : "User")
  }));
  const categoryGroups = (() => {
    const groups = new Map();
    (Array.isArray(categoryOptions) ? categoryOptions : []).forEach(item => {
      const section = String(item?.section || "").trim() || (locale === "fr" ? "Sans catégorie" : "Uncategorized");
      if (!groups.has(section)) groups.set(section, []);
      groups.get(section).push(item);
    });
    return Array.from(groups.entries());
  })();
  const currentCategory = String(rule.targets?.categorySlug || "").trim();
  const knownCategoryNames = new Set((Array.isArray(categoryOptions) ? categoryOptions : []).map(item => String(item?.name || "").trim()).filter(Boolean));
  const orphanCategory = currentCategory && !knownCategoryNames.has(currentCategory) ? currentCategory : "";
  const updateRule = patch => onChange({
    ...rule,
    ...patch
  });
  const updateTargets = patch => updateRule({
    targets: {
      ...rule.targets,
      ...patch
    }
  });
  const addCondition = () => {
    const firstField = fieldOptions[0]?.field;
    updateRule({
      always: false,
      conditions: [...(rule.conditions || []), {
        fieldKey: firstField?.fieldKey || "",
        operator: firstField?.fieldType === "checkbox" ? "checked" : "equals",
        value: ""
      }]
    });
  };
  const updateCondition = (conditionIndex, nextCondition) => {
    const conditions = [...(rule.conditions || [])];
    conditions[conditionIndex] = nextCondition;
    updateRule({
      always: conditions.length === 0,
      conditions
    });
  };
  const removeCondition = conditionIndex => {
    const conditions = (rule.conditions || []).filter((_, idx) => idx !== conditionIndex);
    updateRule({
      always: conditions.length === 0,
      conditions
    });
  };

  return <div className={modalStyles.targetDetail}>
      <header className={modalStyles.targetDetailHead}>
        <div className={modalStyles.targetDetailTitleRow}>
          <span className={modalStyles.targetRuleIndex}>#{index + 1}</span>
          <input
            className={layout.input}
            value={rule.label || ""}
            placeholder={locale === "fr" ? "Nom de la cible (ex. Ticket réseau)" : "Target name (e.g. Network ticket)"}
            onChange={e => updateRule({ label: e.target.value })}
          />
        </div>
        <div className={modalStyles.targetRuleActions}>
          <label className={modalStyles.inlineCheck}>
            <input type="checkbox" checked={rule.enabled !== false} onChange={e => updateRule({
            enabled: e.target.checked
          })} />
            {locale === "fr" ? "Active" : "Active"}
          </label>
          {canRemove && <button type="button" className={modalStyles.iconBtnDanger} onClick={onRemove} title={locale === "fr" ? "Supprimer la cible" : "Delete target"}>
              <Icon icon="mdi:delete-outline" />
            </button>}
        </div>
      </header>

      {activeTab === "conditions" ? <div className={modalStyles.targetRuleSection}>
          <div className={modalStyles.targetRuleSectionHead}>
            <strong>{locale === "fr" ? "Conditions" : "Conditions"}</strong>
            <FieldHint>
              {rule.always
                ? (locale === "fr" ? "Aucune condition · ce ticket est toujours créé." : "No conditions · this ticket is always created.")
                : (locale === "fr" ? "Toutes les conditions doivent être vraies pour créer ce ticket." : "All conditions must be true to create this ticket.")}
            </FieldHint>
          </div>

          {fieldOptions.length === 0 ? <p className={modalStyles.emptyRuleHint}>
              {locale === "fr"
                ? <>Ajoutez des champs dans l’onglet <strong>Champs</strong> pour définir des conditions.</>
                : <>Add fields in the <strong>Fields</strong> tab to define conditions.</>}
            </p> : <>
              {(rule.conditions || []).map((condition, conditionIndex) => {
            const field = formFields.find(item => item.fieldKey === condition.fieldKey);
            const operators = getOperatorsForField(field);
            return <div key={`${rule.id}-cond-${conditionIndex}`} className={modalStyles.conditionRow}>
                    <select className={layout.input} value={condition.fieldKey || ""} onChange={e => updateCondition(conditionIndex, {
                ...condition,
                fieldKey: e.target.value,
                operator: "equals",
                value: ""
              })}>
                      <option value="">{locale === "fr" ? "- Champ -" : "- Field -"}</option>
                      {fieldOptions.map(option => <option key={option.id} value={option.id}>
                          {option.label}
                        </option>)}
                    </select>
                    <select className={layout.input} value={condition.operator || "equals"} onChange={e => updateCondition(conditionIndex, {
                ...condition,
                operator: e.target.value
              })}>
                      {operators.map(option => <option key={option.value} value={option.value}>
                          {optLabel(option, locale)}
                        </option>)}
                    </select>
                    <ConditionValueInput condition={condition} field={field} locale={locale} onChange={next => updateCondition(conditionIndex, next)} />
                    <button type="button" className={modalStyles.iconBtnDanger} onClick={() => removeCondition(conditionIndex)} title={locale === "fr" ? "Retirer la condition" : "Remove condition"}>
                      <Icon icon="mdi:close" />
                    </button>
                  </div>;
          })}
              <button type="button" className={modalStyles.linkBtn} onClick={addCondition}>
                <Icon icon="mdi:plus" /> {locale === "fr" ? "Ajouter une condition" : "Add a condition"}
              </button>
            </>}
        </div> : null}

      {activeTab === "content" ? <div className={modalStyles.targetRuleSection}>
          <div className={modalStyles.targetRuleSectionHead}>
            <strong>{locale === "fr" ? "Contenu du ticket créé" : "Created ticket content"}</strong>
            <FieldHint>
              {locale === "fr"
                ? "Modèles de titre et description, avec variables du formulaire."
                : "Title and description templates, with form variables."}
            </FieldHint>
          </div>
          <div className={modalStyles.targetContentStack}>
            <TemplateField
              label={locale === "fr" ? "Titre" : "Title"}
              value={rule.targets?.titleTemplate || ""}
              placeholder={locale === "fr" ? "Ex. {{form.label}} — {{client.name}} / {{field.prestation}}" : "E.g. {{form.label}} — {{client.name}} / {{field.prestation}}"}
              variables={templateVariables}
              locale={locale}
              onChange={titleTemplate => updateTargets({ titleTemplate })}
            />
            <TemplateField
              label={locale === "fr" ? "Description" : "Description"}
              value={rule.targets?.descriptionTemplate || ""}
              placeholder={locale === "fr"
                ? "Ex.\nEntreprise : {{client.name}}\nPrestation : {{field.prestation}}\nNotes : {{field.quoi}}"
                : "E.g.\nCompany: {{client.name}}\nPrestation: {{field.prestation}}\nNotes: {{field.quoi}}"}
              multiline
              rows={6}
              variables={templateVariables}
              locale={locale}
              onChange={descriptionTemplate => updateTargets({ descriptionTemplate })}
            />
          </div>
        </div> : null}

      {activeTab === "properties" ? <div className={modalStyles.targetRuleSection}>
          <div className={modalStyles.targetRuleSectionHead}>
            <strong>{locale === "fr" ? "Propriétés du ticket" : "Created ticket properties"}</strong>
            <FieldHint>
              {locale === "fr"
                ? "Priorité, statut, catégorie et assignations."
                : "Priority, status, category and assignments."}
            </FieldHint>
          </div>
          <div className={modalStyles.targetContentStack}>
            <div className={layout.field}>
              <label className={layout.label}>{locale === "fr" ? "Priorité" : "Priority"}</label>
              <select className={layout.input} value={rule.targets?.priority || ""} onChange={e => updateTargets({
              priority: e.target.value
            })}>
                {PRIORITY_OPTIONS.map(opt => <option key={opt.value || "agent"} value={opt.value}>
                    {optLabel(opt, locale)}
                  </option>)}
              </select>
            </div>
            <div className={layout.field}>
              <label className={layout.label}>{locale === "fr" ? "Statut initial" : "Initial status"}</label>
              <select className={layout.input} value={rule.targets?.status || ""} onChange={e => updateTargets({
              status: e.target.value
            })}>
                {STATUS_OPTIONS.map(opt => <option key={opt.value || "default"} value={opt.value}>
                    {optLabel(opt, locale)}
                  </option>)}
              </select>
            </div>
            <div className={layout.field}>
              <label className={layout.label}>{locale === "fr" ? "Catégorie (optionnel)" : "Category (optional)"}</label>
              <select className={layout.input} value={rule.targets?.categorySlug || ""} onChange={e => updateTargets({
              categorySlug: e.target.value
            })}>
                <option value="">{locale === "fr" ? "Choix de l’agent / défaut du formulaire" : "Agent's choice / form default"}</option>
                {orphanCategory ? <option value={orphanCategory}>{orphanCategory} ({locale === "fr" ? "personnalisée" : "custom"})</option> : null}
                {categoryGroups.map(([section, items]) => <optgroup key={section} label={section}>
                    {items.map(item => <option key={item.id || item.name} value={item.name}>
                        {item.name}
                      </option>)}
                  </optgroup>)}
              </select>
              <FieldHint>
                {categoryOptions.length
                  ? (locale === "fr"
                    ? `Catégories pour les tickets ${formKind === "installation" ? "installation" : formKind === "prestation" ? "prestation" : "support"}.`
                    : `Categories for ${formKind === "installation" ? "installation" : formKind === "prestation" ? "professional service" : "support"} tickets.`)
                  : (locale === "fr"
                    ? "Aucune catégorie pour l’instant — créez-en dans Admin → Support → Catégories."
                    : "No categories yet — create some in Admin → Support → Categories.")}
              </FieldHint>
            </div>
          </div>

          <div className={modalStyles.suggestStack}>
            <MultiSuggestPicker
              inputId={`sales-form-rule-${rule.id}-assignees`}
              label={locale === "fr" ? "Agents assignés" : "Assigned agents"}
              placeholder={locale === "fr" ? "Rechercher un agent…" : "Search for an agent…"}
              options={userOptions}
              selectedIds={rule.targets?.assigneeUserIds || []}
              emptyHint={locale === "fr" ? "Aucun assigné" : "None assigned"}
              onChange={assigneeUserIds => updateTargets({ assigneeUserIds })}
            />
            <MultiSuggestPicker
              inputId={`sales-form-rule-${rule.id}-teams`}
              label={locale === "fr" ? "Équipes assignées" : "Assigned teams"}
              placeholder={locale === "fr" ? "Rechercher une équipe…" : "Search for a team…"}
              options={teamOptions}
              selectedIds={rule.targets?.teamIds || []}
              emptyHint={locale === "fr" ? "Aucune équipe" : "No team"}
              onChange={teamIds => updateTargets({ teamIds })}
            />
            <MultiSuggestPicker
              inputId={`sales-form-rule-${rule.id}-watchers`}
              label={locale === "fr" ? "Observateurs" : "Watchers"}
              placeholder={locale === "fr" ? "Rechercher un agent…" : "Search for an agent…"}
              options={userOptions}
              selectedIds={rule.targets?.watcherUserIds || []}
              emptyHint={locale === "fr" ? "Aucun observateur" : "No watchers"}
              onChange={watcherUserIds => updateTargets({ watcherUserIds })}
            />
            <MultiSuggestPicker
              inputId={`sales-form-rule-${rule.id}-assignee-fields`}
              label={locale === "fr" ? "Assignés depuis le formulaire" : "Assignees from form answers"}
              placeholder={assigneeFieldOptions.length
                ? (locale === "fr" ? "Choisir un champ utilisateur ou contact…" : "Pick a user or contact field…")
                : (locale === "fr" ? "Ajoutez d’abord un champ Utilisateur ou Contact" : "Add a User or Contact field first")}
              options={assigneeFieldOptions}
              selectedIds={rule.targets?.assigneeFieldKeys || []}
              emptyHint={locale === "fr" ? "Aucun champ sélectionné" : "No form field selected"}
              onChange={assigneeFieldKeys => updateTargets({ assigneeFieldKeys })}
            />
            <MultiSuggestPicker
              inputId={`sales-form-rule-${rule.id}-watcher-fields`}
              label={locale === "fr" ? "Observateurs depuis le formulaire" : "Watchers from form answers"}
              placeholder={assigneeFieldOptions.length
                ? (locale === "fr" ? "Choisir un champ utilisateur ou contact…" : "Pick a user or contact field…")
                : (locale === "fr" ? "Ajoutez d’abord un champ Utilisateur ou Contact" : "Add a User or Contact field first")}
              options={assigneeFieldOptions}
              selectedIds={rule.targets?.watcherFieldKeys || []}
              emptyHint={locale === "fr" ? "Aucun champ sélectionné" : "No form field selected"}
              onChange={watcherFieldKeys => updateTargets({ watcherFieldKeys })}
            />
          </div>
          <FieldHint>
            {locale === "fr"
              ? "Les champs Utilisateur assignent l’agent choisi. Les champs Contact n’assignent un agent Veritas que si un compte agent correspond à l’e-mail du contact."
              : "User fields assign the selected agent. Contact fields assign a Veritas agent only when an agent account matches that contact’s email."}
          </FieldHint>
        </div> : null}
    </div>;
}

function describeRuleSummary(rule, locale) {
  if (rule.enabled === false) return locale === "fr" ? "Inactive" : "Inactive";
  if (rule.always || !(rule.conditions || []).length) return locale === "fr" ? "Toujours" : "Always";
  const count = (rule.conditions || []).length;
  return locale === "fr" ? `${count} condition${count > 1 ? "s" : ""}` : `${count} condition${count > 1 ? "s" : ""}`;
}

export default function SalesFormTargetRulesEditor({
  rules = [],
  formFields = [],
  formKind = "prestation",
  categoryOptions = [],
  userOptions = [],
  teamOptions = [],
  onChange
}) {
  const locale = useAppLocale();
  const [selectedId, setSelectedId] = useState(() => rules[0]?.id || "");
  const [activeTab, setActiveTab] = useState("conditions");

  useEffect(() => {
    if (!rules.length) {
      setSelectedId("");
      return;
    }
    if (!rules.some(rule => String(rule.id) === String(selectedId))) {
      setSelectedId(rules[0].id);
    }
  }, [rules, selectedId]);

  const selectedIndex = Math.max(0, rules.findIndex(rule => String(rule.id) === String(selectedId)));
  const selectedRule = rules[selectedIndex] || rules[0] || null;

  const updateRule = (index, nextRule) => {
    const nextRules = [...rules];
    nextRules[index] = nextRule;
    onChange(nextRules);
  };
  const removeRule = index => {
    const next = rules.filter((_, idx) => idx !== index);
    onChange(next);
    if (next.length) {
      const fallback = next[Math.max(0, index - 1)];
      setSelectedId(fallback.id);
    } else {
      setSelectedId("");
    }
  };
  const addRule = () => {
    const nextRule = createEmptyTargetRule(rules.length);
    if (locale === "fr" && rules.length > 0) {
      nextRule.label = `Ticket ${rules.length + 1}`;
    } else if (locale === "fr") {
      nextRule.label = "Ticket principal";
    }
    onChange([...rules, nextRule]);
    setSelectedId(nextRule.id);
    setActiveTab("conditions");
  };

  const tabLabels = {
    conditions: locale === "fr" ? "Conditions" : "Conditions",
    content: locale === "fr" ? "Contenu" : "Content",
    properties: locale === "fr" ? "Propriétés" : "Properties"
  };

  return <div className={modalStyles.targetWorkspace}>
      <aside className={modalStyles.targetSidebar}>
        <header className={modalStyles.targetSidebarHead}>
          <h3 className={modalStyles.targetSidebarTitle}>{locale === "fr" ? "Cibles" : "Targets"}</h3>
          <p className={modalStyles.targetSidebarDesc}>
            {locale === "fr"
              ? "Tickets créés à la soumission du formulaire."
              : "Tickets created when the form is submitted."}
          </p>
        </header>
        <div className={modalStyles.targetList} role="list">
          {rules.map((rule, index) => {
            const selected = String(rule.id) === String(selectedRule?.id);
            return <button
              key={rule.id || `rule-${index}`}
              type="button"
              role="listitem"
              className={`${modalStyles.targetListItem} ${selected ? modalStyles.targetListItemActive : ""} ${rule.enabled === false ? modalStyles.targetListItemDisabled : ""}`.trim()}
              onClick={() => setSelectedId(rule.id)}
            >
              <span className={modalStyles.targetListIndex}>#{index + 1}</span>
              <span className={modalStyles.targetListBody}>
                <span className={modalStyles.targetListLabel}>{rule.label || (locale === "fr" ? `Cible ${index + 1}` : `Target ${index + 1}`)}</span>
                <span className={modalStyles.targetListMeta}>{describeRuleSummary(rule, locale)}</span>
              </span>
            </button>;
          })}
        </div>
        <button type="button" className={modalStyles.addRuleBtn} onClick={addRule}>
          <Icon icon="mdi:plus-circle-outline" />
          {locale === "fr" ? "Nouvelle cible" : "Add ticket target"}
        </button>
      </aside>

      <div className={modalStyles.targetMain}>
        {selectedRule ? <>
            <div className={modalStyles.targetTabs} role="tablist">
              {TARGET_TABS.map(tab => <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={activeTab === tab.id}
                className={`${modalStyles.targetTab} ${activeTab === tab.id ? modalStyles.targetTabActive : ""}`.trim()}
                onClick={() => setActiveTab(tab.id)}
              >
                <Icon icon={tab.icon} aria-hidden />
                {tabLabels[tab.id]}
              </button>)}
            </div>
            <TargetRuleDetail
              rule={selectedRule}
              index={selectedIndex}
              formFields={formFields}
              formKind={formKind}
              categoryOptions={categoryOptions}
              userOptions={userOptions}
              teamOptions={teamOptions}
              locale={locale}
              activeTab={activeTab}
              canRemove={rules.length > 1}
              onChange={nextRule => updateRule(selectedIndex, nextRule)}
              onRemove={() => removeRule(selectedIndex)}
            />
          </> : <div className={modalStyles.targetEmpty}>
            <p>{locale === "fr" ? "Aucune cible. Créez-en une à gauche." : "No targets yet. Create one on the left."}</p>
          </div>}
      </div>
    </div>;
}

export function normalizeTicketTargetsDraft(raw) {
  if (!raw || typeof raw !== "object") {
    return {
      version: 2,
      rules: [createEmptyTargetRule(0)]
    };
  }
  if (Array.isArray(raw.rules)) {
    return {
      version: 2,
      rules: raw.rules.length ? raw.rules.map((rule, index) => ({
        id: rule.id || createRuleId(),
        label: rule.label || `Ticket ${index + 1}`,
        enabled: rule.enabled !== false,
        always: rule.always === true || !(rule.conditions || []).length,
        matchMode: rule.matchMode === "any" ? "any" : "all",
        conditions: Array.isArray(rule.conditions) ? rule.conditions.map(condition => ({
          fieldKey: condition.fieldKey || "",
          operator: condition.operator || "equals",
          value: condition.value ?? ""
        })) : [],
        targets: {
          priority: rule.targets?.priority || "",
          status: rule.targets?.status || "",
          assigneeUserIds: Array.isArray(rule.targets?.assigneeUserIds) ? rule.targets.assigneeUserIds.map(String) : [],
          watcherUserIds: Array.isArray(rule.targets?.watcherUserIds) ? rule.targets.watcherUserIds.map(String) : [],
          teamIds: Array.isArray(rule.targets?.teamIds) ? rule.targets.teamIds.map(String) : [],
          assigneeFieldKeys: Array.isArray(rule.targets?.assigneeFieldKeys) ? rule.targets.assigneeFieldKeys.map(String) : [],
          watcherFieldKeys: Array.isArray(rule.targets?.watcherFieldKeys) ? rule.targets.watcherFieldKeys.map(String) : [],
          titleSuffix: rule.targets?.titleSuffix || "",
          titleTemplate: rule.targets?.titleTemplate || "",
          descriptionTemplate: rule.targets?.descriptionTemplate || "",
          categorySlug: rule.targets?.categorySlug || ""
        }
      })) : [createEmptyTargetRule(0)]
    };
  }
  return {
    version: 2,
    rules: [{
      ...createEmptyTargetRule(0),
      always: true,
      targets: {
        priority: raw.priority || "",
        status: raw.status || "",
        assigneeUserIds: Array.isArray(raw.assigneeUserIds) ? raw.assigneeUserIds.map(String) : [],
        watcherUserIds: Array.isArray(raw.watcherUserIds) ? raw.watcherUserIds.map(String) : [],
        teamIds: Array.isArray(raw.teamIds) ? raw.teamIds.map(String) : [],
        assigneeFieldKeys: Array.isArray(raw.assigneeFieldKeys) ? raw.assigneeFieldKeys.map(String) : [],
        watcherFieldKeys: Array.isArray(raw.watcherFieldKeys) ? raw.watcherFieldKeys.map(String) : [],
        titleSuffix: "",
        titleTemplate: "",
        descriptionTemplate: "",
        categorySlug: ""
      }
    }]
  };
}

export function serializeTicketTargetsDraft(draft) {
  const normalized = normalizeTicketTargetsDraft(draft);
  return {
    version: 2,
    rules: normalized.rules.map(rule => ({
      id: rule.id,
      label: String(rule.label || "").trim() || "Ticket",
      enabled: rule.enabled !== false,
      always: rule.always === true || !(rule.conditions || []).length,
      matchMode: rule.matchMode === "any" ? "any" : "all",
      conditions: (rule.conditions || []).filter(condition => condition.fieldKey).map(condition => ({
        fieldKey: condition.fieldKey,
        operator: condition.operator || "equals",
        value: condition.value ?? ""
      })),
      targets: {
        priority: rule.targets?.priority || null,
        status: rule.targets?.status || null,
        assigneeUserIds: rule.targets?.assigneeUserIds || [],
        watcherUserIds: rule.targets?.watcherUserIds || [],
        teamIds: rule.targets?.teamIds || [],
        assigneeFieldKeys: rule.targets?.assigneeFieldKeys || [],
        watcherFieldKeys: rule.targets?.watcherFieldKeys || [],
        titleSuffix: String(rule.targets?.titleSuffix || "").trim() || null,
        titleTemplate: String(rule.targets?.titleTemplate || "").trim() || null,
        descriptionTemplate: String(rule.targets?.descriptionTemplate || "").trim() || null,
        categorySlug: String(rule.targets?.categorySlug || "").trim() || null
      }
    }))
  };
}
