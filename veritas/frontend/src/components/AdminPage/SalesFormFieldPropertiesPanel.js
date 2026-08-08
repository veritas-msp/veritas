import { useState } from "react";
import { Icon } from "@iconify/react";
import layout from "../EnterprisesPage/EnterpriseFormModal.module.css";
import builderStyles from "./SalesFormBuilder.module.css";
import FormConditionsEditor from "./FormConditionsEditor";
const FIELD_TYPE_OPTIONS = [{
  value: "text",
  label: "Short text"
}, {
  value: "textarea",
  label: "Long text"
}, {
  value: "select",
  label: "Dropdown"
}, {
  value: "checkbox",
  label: "Yes / No"
}, {
  value: "user",
  label: "User"
}, {
  value: "number",
  label: "Number"
}, {
  value: "date",
  label: "Date"
}];
export default function SalesFormFieldPropertiesPanel({
  fieldDraft,
  formFields = [],
  saving = false,
  onChange,
  onSave,
  onDelete,
  onClose
}) {
  const [activeTab, setActiveTab] = useState("properties");
  if (!fieldDraft) {
    return <aside className={builderStyles.propsPanel}>
        <div className={builderStyles.propsHead}>
          <h4 className={builderStyles.propsTitle}>Properties</h4>
        </div>
        <div className={builderStyles.propsBody}>
          <p style={{
          margin: 0,
          color: "var(--msp-muted)",
          fontSize: "0.85rem"
        }}>
            Select a field in the form to show its settings and visibility rules.
          </p>
        </div>
      </aside>;
  }
  const patch = next => onChange?.({
    ...fieldDraft,
    ...next
  });
  return <aside className={builderStyles.propsPanel}>
      <div className={builderStyles.propsHead}>
        <h4 className={builderStyles.propsTitle}>{fieldDraft.label || "Field"}</h4>
        {onClose && <button type="button" className={builderStyles.builderNavBtn} onClick={onClose} style={{
        marginTop: "0.35rem"
      }}>
            <Icon icon="mdi:close" />
          </button>}
      </div>

      <div className={builderStyles.propsTabs}>
        <button type="button" className={`${builderStyles.propsTab} ${activeTab === "properties" ? builderStyles.propsTabActive : ""}`} onClick={() => setActiveTab("properties")}>
          Properties
        </button>
        <button type="button" className={`${builderStyles.propsTab} ${activeTab === "rules" ? builderStyles.propsTabActive : ""}`} onClick={() => setActiveTab("rules")}>
          Rules
        </button>
      </div>

      <div className={builderStyles.propsBody}>
        {activeTab === "properties" ? <>
            <div className={layout.field}>
              <label className={layout.label}>Label</label>
              <input className={layout.input} value={fieldDraft.label || ""} onChange={e => patch({
            label: e.target.value
          })} />
            </div>
            <div className={layout.field}>
              <label className={layout.label}>Technical key</label>
              <input className={layout.input} value={fieldDraft.fieldKey || ""} onChange={e => patch({
            fieldKey: e.target.value
          })} />
            </div>
            <div className={layout.field}>
              <label className={layout.label}>Type</label>
              <select className={layout.input} value={fieldDraft.fieldType || "text"} onChange={e => patch({
            fieldType: e.target.value
          })}>
                {FIELD_TYPE_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>)}
              </select>
            </div>
            <div className={layout.field}>
              <label className={layout.label}>Placeholder</label>
              <input className={layout.input} value={fieldDraft.placeholder || ""} onChange={e => patch({
            placeholder: e.target.value
          })} />
            </div>
            {fieldDraft.fieldType === "select" && <div className={layout.field}>
                <label className={layout.label}>Options (one per line)</label>
                <textarea className={layout.input} rows={4} value={fieldDraft.optionsText || ""} onChange={e => patch({
            optionsText: e.target.value
          })} />
              </div>}
            <label className={layout.label}>
              <input type="checkbox" checked={fieldDraft.required === true} onChange={e => patch({
            required: e.target.checked
          })} />{" "}
              Required
            </label>
            <label className={layout.label}>
              <input type="checkbox" checked={fieldDraft.enabled !== false} onChange={e => patch({
            enabled: e.target.checked
          })} />{" "}
              Active
            </label>
          </> : <FormConditionsEditor title="If… then show this field" hint="Define when this field should appear based on other field values." matchMode={fieldDraft.visibilityMatchMode || "all"} conditions={fieldDraft.visibilityConditions || []} formFields={formFields} excludeFieldKey={fieldDraft.fieldKey} onChange={({
        matchMode,
        conditions
      }) => patch({
        visibilityMatchMode: matchMode,
        visibilityConditions: conditions
      })} />}
      </div>

      <div className={builderStyles.propsFooter}>
        <button type="button" className={layout.primaryBtn} onClick={onSave} disabled={saving}>
          {saving ? "Saving…" : "Save"}
        </button>
        {onDelete && <button type="button" className={layout.ghostBtn} onClick={onDelete}>
            Delete
          </button>}
      </div>
    </aside>;
}
