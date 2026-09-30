import { useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import layout from "../EnterprisesPage/EnterpriseFormModal.module.css";
import builderStyles from "./SalesFormBuilder.module.css";
import FormConditionsEditor from "./FormConditionsEditor";
import MultiSuggestPicker from "./MultiSuggestPicker";
import { FILE_FIELD_ALLOWED_EXTENSIONS, FILE_FIELD_SERVER_MAX_FILES, FILE_FIELD_SERVER_MAX_SIZE_MB, OPTION_BASED_FIELD_TYPES, findFormClientFieldKey, getFieldTypeOptions, getFileFieldConfig, isContactField, isFileField, isLayoutField } from "../../utils/salesFormFieldTypes";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";

function getContactPropsCopy(locale = "fr") {
  if (locale === "en") {
    return {
      sourceLabel: "People source",
      sourceContacts: "Company contacts",
      sourceAgents: "Agents",
      scopeByClient: "Only contacts of the selected company",
      scopeHint: "Requires a Company field on this form. Changing the company clears this answer.",
      scopeMissing: "Add a Company field to enable company filtering.",
      profilesLabel: "Filter by agent profiles",
      profilesPlaceholder: "Search a profile…",
      profilesEmpty: "All profiles",
      profilesHint: "Leave empty to include every profile.",
      agentsLabel: "Restrict to specific agents",
      agentsPlaceholder: "Search an agent…",
      agentsEmpty: "All agents",
      agentsHint: "Optional. Combined with profile filters when both are set."
    };
  }
  return {
    sourceLabel: "Source des personnes",
    sourceContacts: "Contacts entreprise",
    sourceAgents: "Agents",
    scopeByClient: "Uniquement les contacts de l’entreprise sélectionnée",
    scopeHint: "Nécessite un champ Entreprise sur ce formulaire. Changer l’entreprise vide cette réponse.",
    scopeMissing: "Ajoutez un champ Entreprise pour activer ce filtre.",
    profilesLabel: "Filtrer par profils d’agents",
    profilesPlaceholder: "Rechercher un profil…",
    profilesEmpty: "Tous les profils",
    profilesHint: "Laissez vide pour inclure tous les profils.",
    agentsLabel: "Limiter à des agents précis",
    agentsPlaceholder: "Rechercher un agent…",
    agentsEmpty: "Tous les agents",
    agentsHint: "Optionnel. Combiné avec les filtres de profils si les deux sont renseignés."
  };
}

export default function SalesFormFieldPropertiesPanel({
  fieldDraft,
  formFields = [],
  userOptions = [],
  profileOptions = [],
  saving = false,
  onChange,
  onSave,
  onDelete,
  onClose
}) {
  const locale = useAppLocale();
  const fieldTypeOptions = useMemo(() => getFieldTypeOptions(locale), [locale]);
  const contactCopy = useMemo(() => getContactPropsCopy(locale), [locale]);
  const [activeTab, setActiveTab] = useState("properties");
  const hasClientField = Boolean(findFormClientFieldKey(formFields));
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
  const isSection = isLayoutField(fieldDraft);
  const isFile = isFileField(fieldDraft);
  const isContact = isContactField(fieldDraft);
  const needsOptions = !isSection && !isFile && !isContact && OPTION_BASED_FIELD_TYPES.has(fieldDraft.fieldType);
  const fileConfig = isFile ? getFileFieldConfig({
    options: [{
      __fileConfig: true,
      maxSizeMb: fieldDraft.fileMaxSizeMb,
      maxFiles: fieldDraft.fileMaxFiles,
      extensions: fieldDraft.fileExtensionsText
    }]
  }) : null;
  const contactSource = fieldDraft.contactSource === "agents" ? "agents" : "contacts";
  const conditionFields = formFields;
  return <aside className={builderStyles.propsPanel}>
      <div className={builderStyles.propsHead}>
        <h4 className={builderStyles.propsTitle}>{fieldDraft.label || (isSection ? "Section" : "Field")}</h4>
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
              <label className={layout.label}>{isSection ? "Section title" : "Label"}</label>
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
              <select className={layout.input} value={fieldDraft.fieldType || "text"} onChange={e => {
            const nextType = e.target.value;
            const nextPatch = {
              fieldType: nextType,
              required: nextType === "section" ? false : fieldDraft.required
            };
            if (nextType === "file") {
              const cfg = getFileFieldConfig(fieldDraft);
              nextPatch.fileMaxSizeMb = cfg.maxSizeMb;
              nextPatch.fileMaxFiles = cfg.maxFiles;
              nextPatch.fileExtensionsText = cfg.extensions.join(", ");
              nextPatch.optionsText = "";
            }
            if (nextType === "contact") {
              nextPatch.contactSource = fieldDraft.contactSource === "agents" ? "agents" : "contacts";
              nextPatch.contactScopeByClient = fieldDraft.contactScopeByClient === true;
              nextPatch.contactProfileNames = Array.isArray(fieldDraft.contactProfileNames) ? fieldDraft.contactProfileNames : [];
              nextPatch.contactUserIds = Array.isArray(fieldDraft.contactUserIds) ? fieldDraft.contactUserIds : [];
              nextPatch.optionsText = "";
            }
            patch(nextPatch);
          }}>
                {fieldTypeOptions.map(opt => <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>)}
              </select>
            </div>
            {!isFile && <div className={layout.field}>
                <label className={layout.label}>{isSection ? "Description (optional)" : "Placeholder"}</label>
                <input className={layout.input} value={fieldDraft.placeholder || ""} onChange={e => patch({
            placeholder: e.target.value
          })} placeholder={isSection ? "Shown under the section title" : ""} />
              </div>}
            {needsOptions && <div className={layout.field}>
                <label className={layout.label}>Options (one per line)</label>
                <textarea className={layout.input} rows={4} value={fieldDraft.optionsText || ""} onChange={e => patch({
            optionsText: e.target.value
          })} />
              </div>}
            {isFile && <>
                <div className={layout.field}>
                  <label className={layout.label}>Max file size (MB)</label>
                  <input className={layout.input} type="number" min={1} max={FILE_FIELD_SERVER_MAX_SIZE_MB} value={fieldDraft.fileMaxSizeMb ?? fileConfig.maxSizeMb} onChange={e => patch({
              fileMaxSizeMb: Number(e.target.value || 1)
            })} />
                  <p className={builderStyles.canvasDesc} style={{
              marginTop: "0.35rem"
            }}>Server limit: {FILE_FIELD_SERVER_MAX_SIZE_MB} MB</p>
                </div>
                <div className={layout.field}>
                  <label className={layout.label}>Max files</label>
                  <input className={layout.input} type="number" min={1} max={FILE_FIELD_SERVER_MAX_FILES} value={fieldDraft.fileMaxFiles ?? fileConfig.maxFiles} onChange={e => patch({
              fileMaxFiles: Number(e.target.value || 1)
            })} />
                  <p className={builderStyles.canvasDesc} style={{
              marginTop: "0.35rem"
            }}>Server limit: {FILE_FIELD_SERVER_MAX_FILES} files</p>
                </div>
                <div className={layout.field}>
                  <label className={layout.label}>Allowed extensions</label>
                  <textarea className={layout.input} rows={3} value={fieldDraft.fileExtensionsText ?? fileConfig.extensions.join(", ")} onChange={e => patch({
              fileExtensionsText: e.target.value
            })} placeholder=".pdf, .png, .docx" />
                  <p className={builderStyles.canvasDesc} style={{
              marginTop: "0.35rem"
            }}>Allowed on server: {FILE_FIELD_ALLOWED_EXTENSIONS.join(", ")}</p>
                </div>
              </>}
            {isContact ? <>
                <div className={layout.field}>
                  <label className={layout.label}>{contactCopy.sourceLabel}</label>
                  <select className={layout.input} value={contactSource} onChange={e => patch({
                contactSource: e.target.value === "agents" ? "agents" : "contacts",
                contactScopeByClient: e.target.value === "agents" ? false : fieldDraft.contactScopeByClient === true
              })}>
                    <option value="contacts">{contactCopy.sourceContacts}</option>
                    <option value="agents">{contactCopy.sourceAgents}</option>
                  </select>
                </div>
                {contactSource === "contacts" ? <>
                    <label className={layout.label} style={{
                opacity: hasClientField ? 1 : 0.55
              }}>
                      <input type="checkbox" checked={fieldDraft.contactScopeByClient === true} disabled={!hasClientField} onChange={e => patch({
                  contactScopeByClient: e.target.checked
                })} />{" "}
                      {contactCopy.scopeByClient}
                    </label>
                    <p className={builderStyles.canvasDesc} style={{
                marginTop: "-0.35rem"
              }}>
                      {hasClientField ? contactCopy.scopeHint : contactCopy.scopeMissing}
                    </p>
                  </> : <>
                    <MultiSuggestPicker inputId={`contact-field-profiles-${fieldDraft.fieldKey || "draft"}`} label={contactCopy.profilesLabel} placeholder={contactCopy.profilesPlaceholder} options={profileOptions} selectedIds={Array.isArray(fieldDraft.contactProfileNames) ? fieldDraft.contactProfileNames : []} emptyHint={contactCopy.profilesEmpty} onChange={contactProfileNames => patch({
                contactProfileNames
              })} />
                    <p className={builderStyles.canvasDesc} style={{
                marginTop: "-0.35rem"
              }}>{contactCopy.profilesHint}</p>
                    <MultiSuggestPicker inputId={`contact-field-agents-${fieldDraft.fieldKey || "draft"}`} label={contactCopy.agentsLabel} placeholder={contactCopy.agentsPlaceholder} options={userOptions} selectedIds={Array.isArray(fieldDraft.contactUserIds) ? fieldDraft.contactUserIds : []} emptyHint={contactCopy.agentsEmpty} onChange={contactUserIds => patch({
                contactUserIds
              })} />
                    <p className={builderStyles.canvasDesc} style={{
                marginTop: "-0.35rem"
              }}>{contactCopy.agentsHint}</p>
                  </>}
              </> : null}
            {!isSection && <label className={layout.label}>
                <input type="checkbox" checked={fieldDraft.required === true} onChange={e => patch({
            required: e.target.checked
          })} />{" "}
                Required
              </label>}
            <label className={layout.label}>
              <input type="checkbox" checked={fieldDraft.enabled !== false} onChange={e => patch({
            enabled: e.target.checked
          })} />{" "}
              Active
            </label>
          </> : <FormConditionsEditor title={isSection ? "If… then show this section" : "If… then show this field"} hint={isSection ? "When the section is hidden, all fields under it are hidden too. Use AND/OR between conditions — OR starts a new group." : "Use AND/OR between conditions. Example: A AND B OR C AND D means (A and B) or (C and D)."} matchMode={fieldDraft.visibilityMatchMode || "all"} conditions={fieldDraft.visibilityConditions || []} formFields={conditionFields} excludeFieldKey={fieldDraft.fieldKey} onChange={({
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
