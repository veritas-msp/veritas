import { Icon } from "@iconify/react";
import layout from "../EnterprisesPage/EnterpriseFormModal.module.css";
import modalStyles from "./SalesFormModal.module.css";
import { OPTION_BASED_FIELD_TYPES, buildConditionFieldOptions } from "../../utils/salesFormFieldTypes";
import { deriveVisibilityMatchMode } from "../../utils/salesFormConditions";
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
function getOperatorsForField(field) {
  if (!field) return OPERATOR_OPTIONS;
  if (field.fieldType === "checkbox") {
    return OPERATOR_OPTIONS.filter(opt => opt.value === "checked" || opt.value === "not_checked");
  }
  if (OPTION_BASED_FIELD_TYPES.has(field.fieldType) || field.fieldType === "rating") {
    return OPERATOR_OPTIONS.filter(opt => opt.value === "equals" || opt.value === "not_equals" || opt.value === "contains");
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
function ConditionJoinToggle({
  value,
  onChange
}) {
  const join = value === "or" ? "or" : "and";
  return <div className={modalStyles.conditionJoin} role="group" aria-label="Logic between conditions">
      <button type="button" className={`${modalStyles.conditionJoinBtn} ${join === "and" ? modalStyles.conditionJoinBtnActive : ""}`} aria-pressed={join === "and"} onClick={() => onChange("and")}>
        AND
      </button>
      <button type="button" className={`${modalStyles.conditionJoinBtn} ${join === "or" ? modalStyles.conditionJoinBtnActive : ""}`} aria-pressed={join === "or"} onClick={() => onChange("or")}>
        OR
      </button>
    </div>;
}
function withoutJoin(condition = {}) {
  const next = {
    fieldKey: condition.fieldKey || "",
    operator: condition.operator || "equals",
    value: condition.value || ""
  };
  return next;
}
function withJoin(condition = {}, join = "and") {
  return {
    ...withoutJoin(condition),
    join: join === "or" ? "or" : "and"
  };
}
function reindexConditionJoins(list = []) {
  return list.map((condition, index) => index === 0 ? withoutJoin(condition) : withJoin(condition, condition.join || "and"));
}
function ConditionFieldSelect({
  value,
  fieldOptions,
  onChange
}) {
  return <select className={layout.input} value={value || ""} onChange={e => {
    const nextField = fieldOptions.find(option => option.id === e.target.value)?.field;
    onChange(e.target.value, nextField);
  }}>
      <option value="">- Field -</option>
      {fieldOptions.map(option => <option key={option.id} value={option.id}>
          {option.label}
        </option>)}
    </select>;
}
export default function FormConditionsEditor({
  title = "Conditions",
  hint = "With no conditions, always applicable. Use AND / OR between rows — OR starts a new group.",
  matchMode = "all",
  conditions = [],
  formFields = [],
  excludeFieldKey = "",
  onChange
}) {
  const fieldOptions = buildConditionFieldOptions(formFields, {
    excludeFieldKey
  });
  const emit = nextConditions => {
    const normalized = reindexConditionJoins(nextConditions);
    onChange?.({
      matchMode: deriveVisibilityMatchMode(normalized) || matchMode,
      conditions: normalized
    });
  };
  const addCondition = () => {
    const firstField = fieldOptions[0]?.field;
    const next = {
      fieldKey: firstField?.fieldKey || "",
      operator: firstField?.fieldType === "checkbox" ? "checked" : "equals",
      value: ""
    };
    if (conditions.length) next.join = "and";
    emit([...conditions, next]);
  };
  return <div className={modalStyles.targetRuleSection}>
      <div className={modalStyles.targetRuleSectionHead}>
        <strong>{title}</strong>
        <p className={modalStyles.hint}>{hint}</p>
      </div>

      {fieldOptions.length === 0 ? <p className={modalStyles.emptyRuleHint}>No other fields available to build conditions.</p> : <>
          {conditions.map((condition, conditionIndex) => {
        const field = fieldOptions.find(option => option.id === condition.fieldKey)?.field;
        const operators = getOperatorsForField(field);
        return <div key={`condition-${conditionIndex}`} className={modalStyles.conditionBlock}>
                {conditionIndex > 0 ? <ConditionJoinToggle value={condition.join || "and"} onChange={join => {
            const nextConditions = [...conditions];
            nextConditions[conditionIndex] = withJoin(condition, join);
            emit(nextConditions);
          }} /> : null}
                <div className={modalStyles.conditionRow}>
                  <ConditionFieldSelect value={condition.fieldKey} fieldOptions={fieldOptions} onChange={(fieldKey, nextField) => {
              const nextConditions = [...conditions];
              const base = {
                fieldKey,
                operator: nextField?.fieldType === "checkbox" ? "checked" : "equals",
                value: ""
              };
              nextConditions[conditionIndex] = conditionIndex > 0 ? withJoin(base, condition.join || "and") : base;
              emit(nextConditions);
            }} />
                  <select className={layout.input} value={condition.operator || "equals"} onChange={e => {
              const nextConditions = [...conditions];
              nextConditions[conditionIndex] = {
                ...condition,
                operator: e.target.value
              };
              emit(nextConditions);
            }}>
                    {operators.map(option => <option key={option.value} value={option.value}>
                        {option.label}
                      </option>)}
                  </select>
                  <ConditionValueInput condition={condition} field={field} onChange={next => {
              const nextConditions = [...conditions];
              nextConditions[conditionIndex] = conditionIndex > 0 ? withJoin(next, condition.join || "and") : withoutJoin(next);
              emit(nextConditions);
            }} />
                  <button type="button" className={modalStyles.iconBtnDanger} onClick={() => emit(conditions.filter((_, idx) => idx !== conditionIndex))} title="Remove condition">
                    <Icon icon="mdi:close" />
                  </button>
                </div>
              </div>;
      })}

          <button type="button" className={modalStyles.linkBtn} onClick={addCondition}>
            <Icon icon="mdi:plus" /> Add a condition
          </button>
        </>}
    </div>;
}
