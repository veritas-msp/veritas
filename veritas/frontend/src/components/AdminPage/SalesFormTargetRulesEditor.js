import { Icon } from "@iconify/react";
import { useRef, useState } from "react";
import layout from "../EnterprisesPage/EnterpriseFormModal.module.css";
import modalStyles from "./SalesFormModal.module.css";
import MultiSuggestPicker from "./MultiSuggestPicker";
import { getSalesFormTemplateVariables, insertTemplateToken } from "../../utils/salesFormTicketTemplates";
import { OPTION_BASED_FIELD_TYPES } from "../../utils/salesFormFieldTypes";
const PRIORITY_OPTIONS = [{
  value: "",
  label: "Agent's choice"
}, {
  value: "low",
  label: "Low"
}, {
  value: "normal",
  label: "Normal"
}, {
  value: "high",
  label: "High"
}, {
  value: "urgent",
  label: "Urgent"
}];
const STATUS_OPTIONS = [{
  value: "",
  label: "New (default)"
}, {
  value: "new",
  label: "New"
}, {
  value: "open",
  label: "Open"
}, {
  value: "in_progress",
  label: "In progress"
}, {
  value: "pending",
  label: "Pending"
}];
const OPERATOR_OPTIONS = [{
  value: "equals",
  label: "Equals"
}, {
  value: "not_equals",
  label: "Not equal to"
}, {
  value: "contains",
  label: "Contains"
}, {
  value: "checked",
  label: "Checked (yes)"
}, {
  value: "not_checked",
  label: "Not checked"
}];
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
      titleSuffix: "",
      titleTemplate: "",
      descriptionTemplate: "",
      categorySlug: ""
    }
  };
}
function FieldHint({
  children
}) {
  return <p className={modalStyles.hint}>{children}</p>;
}
function TemplateField({
  label,
  value,
  placeholder,
  multiline = false,
  rows = 4,
  variables = [],
  onChange
}) {
  const inputRef = useRef(null);
  const [showVars, setShowVars] = useState(false);
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
  return <div className={`${layout.field} ${layout.fieldFull}`}>
      <div className={modalStyles.templateFieldHead}>
        <label className={layout.label}>{label}</label>
        <button type="button" className={modalStyles.variablesBtn} onMouseDown={e => e.preventDefault()} onClick={() => setShowVars(open => !open)}>
          <Icon icon="mdi:code-tags" aria-hidden />
          Variables
        </button>
      </div>
      {showVars && <div className={modalStyles.variablePanel}>
          {fieldVars.length > 0 && <>
              <p className={modalStyles.variableGroupTitle}>Form fields</p>
              <div className={modalStyles.variableChips}>
                {fieldVars.map(item => <button key={item.key} type="button" className={modalStyles.variableChip} title={item.key} onMouseDown={e => e.preventDefault()} onClick={() => insert(item.key)}>
                    {item.label}
                  </button>)}
              </div>
            </>}
          <p className={modalStyles.variableGroupTitle}>Context</p>
          <div className={modalStyles.variableChips}>
            {contextVars.map(item => <button key={item.key} type="button" className={modalStyles.variableChip} title={item.key} onMouseDown={e => e.preventDefault()} onClick={() => insert(item.key)}>
                {item.label}
              </button>)}
          </div>
        </div>}
      {multiline ? <textarea ref={inputRef} className={layout.input} rows={rows} value={value || ""} placeholder={placeholder} onChange={e => onChange?.(e.target.value)} /> : <input ref={inputRef} className={layout.input} value={value || ""} placeholder={placeholder} onChange={e => onChange?.(e.target.value)} />}
      <FieldHint>Use {"{{field.key}}"} or context variables. Leave empty to keep the default from ticket creation.</FieldHint>
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
  onChange
}) {
  if (!field) {
    return <input className={layout.input} value={condition.value || ""} placeholder="Value" onChange={e => onChange({
      ...condition,
      value: e.target.value
    })} />;
  }
  if (field.fieldType === "checkbox") {
    return <span className={modalStyles.conditionHint}>No value required</span>;
  }
  if (field.fieldType === "rating") {
    return <select className={layout.input} value={condition.value || ""} onChange={e => onChange({
      ...condition,
      value: e.target.value
    })}>
        <option value="">- Choose -</option>
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
        <option value="">- Choose -</option>
        {field.options.map(option => {
        const value = typeof option === "object" ? option.value || option.label : option;
        const label = typeof option === "object" ? option.label || option.value : option;
        return <option key={String(value)} value={String(value)}>
              {label}
            </option>;
      })}
      </select>;
  }
  return <input className={layout.input} value={condition.value || ""} placeholder="Expected value" onChange={e => onChange({
    ...condition,
    value: e.target.value
  })} />;
}
function TargetRuleEditor({
  rule,
  index,
  formFields,
  userOptions,
  teamOptions,
  onChange,
  onRemove,
  canRemove
}) {
  const fieldOptions = formFields.filter(field => field?.fieldKey && field.fieldType !== "section").map(field => ({
    id: field.fieldKey,
    label: field.label || field.fieldKey
  }));
  const templateVariables = getSalesFormTemplateVariables(formFields);
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
    const firstField = formFields.find(field => field?.fieldKey);
    updateRule({
      always: false,
      conditions: [...(rule.conditions || []), {
        fieldKey: firstField?.fieldKey || "",
        operator: "equals",
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
  return <article className={modalStyles.targetRuleCard}>
      <header className={modalStyles.targetRuleHead}>
        <div className={modalStyles.targetRuleTitleRow}>
          <span className={modalStyles.targetRuleIndex}>#{index + 1}</span>
          <input className={layout.input} value={rule.label || ""} placeholder="Target name (e.g. Network ticket)" onChange={e => updateRule({
          label: e.target.value
        })} />
        </div>
        <div className={modalStyles.targetRuleActions}>
          <label className={modalStyles.inlineCheck}>
            <input type="checkbox" checked={rule.enabled !== false} onChange={e => updateRule({
            enabled: e.target.checked
          })} />
            Active
          </label>
          {canRemove && <button type="button" className={modalStyles.iconBtnDanger} onClick={onRemove} title="Delete target">
              <Icon icon="mdi:delete-outline" />
            </button>}
        </div>
      </header>

      <div className={modalStyles.targetRuleSection}>
        <div className={modalStyles.targetRuleSectionHead}>
          <strong>Conditions</strong>
          <FieldHint>
            {rule.always ? "No conditions · this ticket is always created." : "All conditions must be true to create this ticket."}
          </FieldHint>
        </div>

        {fieldOptions.length === 0 ? <p className={modalStyles.emptyRuleHint}>
            Add fields in the <strong>Fields</strong> tab to define conditions.
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
                    <option value="">- Field -</option>
                    {fieldOptions.map(option => <option key={option.id} value={option.id}>
                        {option.label}
                      </option>)}
                  </select>
                  <select className={layout.input} value={condition.operator || "equals"} onChange={e => updateCondition(conditionIndex, {
              ...condition,
              operator: e.target.value
            })}>
                    {operators.map(option => <option key={option.value} value={option.value}>
                        {option.label}
                      </option>)}
                  </select>
                  <ConditionValueInput condition={condition} field={field} onChange={next => updateCondition(conditionIndex, next)} />
                  <button type="button" className={modalStyles.iconBtnDanger} onClick={() => removeCondition(conditionIndex)} title="Remove condition">
                    <Icon icon="mdi:close" />
                  </button>
                </div>;
        })}
            <button type="button" className={modalStyles.linkBtn} onClick={addCondition}>
              <Icon icon="mdi:plus" /> Add a condition
            </button>
          </>}
      </div>

      <div className={modalStyles.targetRuleSection}>
        <strong>Created ticket content</strong>
        <div className={`${layout.fieldGrid2} ${modalStyles.targetPropsGrid}`}>
          <TemplateField label="Title" value={rule.targets?.titleTemplate || ""} placeholder="E.g. {{form.label}} — {{client.name}} / {{field.prestation}}" variables={templateVariables} onChange={titleTemplate => updateTargets({
          titleTemplate
        })} />
          <TemplateField label="Description" value={rule.targets?.descriptionTemplate || ""} placeholder={"E.g.\nCompany: {{client.name}}\nPrestation: {{field.prestation}}\nNotes: {{field.quoi}}"} multiline rows={5} variables={templateVariables} onChange={descriptionTemplate => updateTargets({
          descriptionTemplate
        })} />
        </div>
      </div>

      <div className={modalStyles.targetRuleSection}>
        <strong>Created ticket properties</strong>
        <div className={`${layout.fieldGrid2} ${modalStyles.targetPropsGrid}`}>
          <div className={layout.field}>
            <label className={layout.label}>Priority</label>
            <select className={layout.input} value={rule.targets?.priority || ""} onChange={e => updateTargets({
            priority: e.target.value
          })}>
              {PRIORITY_OPTIONS.map(opt => <option key={opt.value || "agent"} value={opt.value}>
                  {opt.label}
                </option>)}
            </select>
          </div>
          <div className={layout.field}>
            <label className={layout.label}>Initial status</label>
            <select className={layout.input} value={rule.targets?.status || ""} onChange={e => updateTargets({
            status: e.target.value
          })}>
              {STATUS_OPTIONS.map(opt => <option key={opt.value || "default"} value={opt.value}>
                  {opt.label}
                </option>)}
            </select>
          </div>
          <div className={layout.field}>
            <label className={layout.label}>Category (optional)</label>
            <input className={layout.input} value={rule.targets?.categorySlug || ""} placeholder="Ticket category slug" onChange={e => updateTargets({
            categorySlug: e.target.value
          })} />
          </div>
        </div>

        <div className={modalStyles.suggestGrid}>
          <MultiSuggestPicker inputId={`sales-form-rule-${rule.id}-assignees`} label="Assigned agents" placeholder="Search for an agent…" options={userOptions} selectedIds={rule.targets?.assigneeUserIds || []} emptyHint="None assigned" onChange={assigneeUserIds => updateTargets({
          assigneeUserIds
        })} />
          <MultiSuggestPicker inputId={`sales-form-rule-${rule.id}-teams`} label="Assigned teams" placeholder="Search for a team…" options={teamOptions} selectedIds={rule.targets?.teamIds || []} emptyHint="No team" onChange={teamIds => updateTargets({
          teamIds
        })} />
          <MultiSuggestPicker inputId={`sales-form-rule-${rule.id}-watchers`} label="Watchers" placeholder="Search for an agent…" options={userOptions} selectedIds={rule.targets?.watcherUserIds || []} emptyHint="No watchers" onChange={watcherUserIds => updateTargets({
          watcherUserIds
        })} />
        </div>
      </div>
    </article>;
}
export default function SalesFormTargetRulesEditor({
  rules = [],
  formFields = [],
  userOptions = [],
  teamOptions = [],
  onChange
}) {
  const updateRule = (index, nextRule) => {
    const nextRules = [...rules];
    nextRules[index] = nextRule;
    onChange(nextRules);
  };
  const removeRule = index => {
    onChange(rules.filter((_, idx) => idx !== index));
  };
  const addRule = () => {
    onChange([...rules, createEmptyTargetRule(rules.length)]);
  };
  return <div className={modalStyles.targetRulesWrap}>
      {rules.map((rule, index) => <TargetRuleEditor key={rule.id || `rule-${index}`} rule={rule} index={index} formFields={formFields} userOptions={userOptions} teamOptions={teamOptions} canRemove={rules.length > 1} onChange={nextRule => updateRule(index, nextRule)} onRemove={() => removeRule(index)} />)}
      <button type="button" className={modalStyles.addRuleBtn} onClick={addRule}>
        <Icon icon="mdi:plus-circle-outline" />
        Add ticket target
      </button>
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
        titleSuffix: String(rule.targets?.titleSuffix || "").trim() || null,
        titleTemplate: String(rule.targets?.titleTemplate || "").trim() || null,
        descriptionTemplate: String(rule.targets?.descriptionTemplate || "").trim() || null,
        categorySlug: String(rule.targets?.categorySlug || "").trim() || null
      }
    }))
  };
}
