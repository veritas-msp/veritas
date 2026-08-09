import { useMemo } from "react";
import { Icon } from "@iconify/react";
import s from "./TicketCreatePage.module.css";
import { fieldIsVisible, filterVisibleFields } from "../../utils/salesFormConditions";

function getUserDisplayName(user) {
  return user?.ticket_helpdesk_display_name || user?.name || user?.nom || user?.username || user?.email || "";
}

function getClientDisplayName(client) {
  return client?.name || client?.nom || client?.client_name || client?.label || "";
}

function getContactDisplayName(contact) {
  const fullName = [contact?.prenom, contact?.nom].filter(Boolean).join(" ").trim();
  return fullName || contact?.name || contact?.email || contact?.label || "";
}

function formatFieldValue(field, value, {
  users = [],
  clients = [],
  contacts = []
} = {}) {
  if (field.fieldType === "checkbox") return value ? "Yes" : "No";
  if (field.fieldType === "user") {
    const user = users.find(row => String(row.id) === String(value));
    return getUserDisplayName(user) || value || "";
  }
  if (field.fieldType === "client") {
    const client = clients.find(row => String(row.id) === String(value));
    return getClientDisplayName(client) || value || "";
  }
  if (field.fieldType === "contact") {
    const contact = contacts.find(row => String(row.id) === String(value));
    return getContactDisplayName(contact) || value || "";
  }
  return value ?? "";
}

export function buildDynamicFieldLines(fields = [], values = {}, usersOrLookups = [], clients = [], contacts = []) {
  let users = [];
  let clientsList = clients;
  let contactsList = contacts;
  if (usersOrLookups && typeof usersOrLookups === "object" && !Array.isArray(usersOrLookups)) {
    users = Array.isArray(usersOrLookups.users) ? usersOrLookups.users : [];
    clientsList = Array.isArray(usersOrLookups.clients) ? usersOrLookups.clients : clients;
    contactsList = Array.isArray(usersOrLookups.contacts) ? usersOrLookups.contacts : contacts;
  } else {
    users = Array.isArray(usersOrLookups) ? usersOrLookups : [];
  }
  return filterVisibleFields(fields, values).map(field => {
    const raw = values[field.fieldKey];
    const display = formatFieldValue(field, raw, {
      users,
      clients: clientsList,
      contacts: contactsList
    });
    return `${field.label}: ${String(display || "").trim() || "-"}`;
  });
}

export function validateDynamicFields(fields = [], values = {}) {
  const activeFields = filterVisibleFields(fields, values);
  const missingRequired = activeFields.filter(field => field.required && !String(values[field.fieldKey] ?? "").trim());
  if (missingRequired.length > 0) return false;
  const hasAnyValue = activeFields.some(field => {
    const raw = values[field.fieldKey];
    if (field.fieldType === "checkbox") return raw === true;
    return String(raw ?? "").trim().length > 0;
  });
  if (activeFields.length > 0 && !hasAnyValue) return false;
  return true;
}

export default function SalesFormFieldsRenderer({
  fields = [],
  values = {},
  users = [],
  contacts = [],
  clients = [],
  onChange,
  fieldErrors = false,
  errorPulseTick = 0,
  className = ""
}) {
  const sortedFields = useMemo(() => [...fields].filter(field => field.enabled !== false).sort((a, b) => Number(a.displayOrder || 0) - Number(b.displayOrder || 0)), [fields]);
  const visibleFields = useMemo(() => sortedFields.filter(field => fieldIsVisible(field, values)), [sortedFields, values]);
  if (sortedFields.length === 0) {
    return <p className={s.detailsAvailabilityTitle} style={{
      margin: 0
    }}>
        No fields configured for this request type.
      </p>;
  }
  const patchValue = (fieldKey, value) => {
    onChange?.({
      ...values,
      [fieldKey]: value
    });
  };
  const renderField = field => {
    const value = values[field.fieldKey] ?? (field.fieldType === "checkbox" ? false : "");
    if (field.fieldType === "textarea") {
      return <textarea className={`${s.fieldShellControl} ${s.textarea}`} rows={4} value={value} placeholder={field.placeholder || ""} onChange={e => patchValue(field.fieldKey, e.target.value)} />;
    }
    if (field.fieldType === "select") {
      const options = Array.isArray(field.options) ? field.options : [];
      return <select className={s.select} value={value} onChange={e => patchValue(field.fieldKey, e.target.value)}>
          <option value="">Select…</option>
          {options.map(opt => {
          const optionValue = typeof opt === "string" ? opt : opt?.value ?? opt?.label ?? "";
          const optionLabel = typeof opt === "string" ? opt : opt?.label ?? opt?.value ?? "";
          return <option key={optionValue} value={optionValue}>
                {optionLabel}
              </option>;
        })}
        </select>;
    }
    if (field.fieldType === "checkbox") {
      return <div className={s.segmentedGroup} role="radiogroup" aria-label={field.label}>
          <button type="button" role="radio" aria-checked={!value} className={`${s.segmentedBtn} ${!value ? s.segmentedBtnActive : ""}`} onClick={() => patchValue(field.fieldKey, false)}>
            <Icon icon="mdi:close-circle-outline" aria-hidden />
            No
          </button>
          <button type="button" role="radio" aria-checked={Boolean(value)} className={`${s.segmentedBtn} ${value ? s.segmentedBtnActive : ""}`} onClick={() => patchValue(field.fieldKey, true)}>
            <Icon icon="mdi:check-circle-outline" aria-hidden />
            Yes
          </button>
        </div>;
    }
    if (field.fieldType === "user") {
      return <select className={s.select} value={value} onChange={e => patchValue(field.fieldKey, e.target.value)}>
          <option value="">Select a user…</option>
          {users.map(user => <option key={user.id} value={user.id}>
              {getUserDisplayName(user) || `#${user.id}`}
            </option>)}
        </select>;
    }
    if (field.fieldType === "client") {
      return <select className={s.select} value={value} onChange={e => patchValue(field.fieldKey, e.target.value)}>
          <option value="">Select a company…</option>
          {clients.map(client => <option key={client.id} value={client.id}>
              {getClientDisplayName(client) || `#${client.id}`}
            </option>)}
        </select>;
    }
    if (field.fieldType === "contact") {
      return <select className={s.select} value={value} onChange={e => patchValue(field.fieldKey, e.target.value)}>
          <option value="">Select a contact…</option>
          {contacts.map(contact => <option key={contact.id} value={contact.id}>
              {getContactDisplayName(contact) || `#${contact.id}`}
            </option>)}
        </select>;
    }
    const inputType = field.fieldType === "number" ? "number" : field.fieldType === "date" ? "date" : "text";
    return <input type={inputType} className={s.fieldShellControl} value={value} placeholder={field.placeholder || ""} onChange={e => patchValue(field.fieldKey, e.target.value)} />;
  };
  const textareaFields = visibleFields.filter(field => field.fieldType === "textarea");
  const otherFields = visibleFields.filter(field => field.fieldType !== "textarea");
  return <div className={className}>
      {textareaFields.length > 0 && <div className={s.condensedRow} style={{
      gridTemplateColumns: "repeat(2, minmax(0, 1fr))"
    }}>
          {textareaFields.map(field => <div key={field.id || field.fieldKey} className={s.fieldBlock}>
              <label className={s.fieldLabel}>
                {field.label}
                {field.required ? <span className={s.requiredMark}>*</span> : null}
              </label>
              <div className={`${s.fieldShell} ${s.fieldShellMultiline} ${fieldErrors ? s.fieldShellError : ""}`}>{renderField(field)}</div>
            </div>)}
        </div>}

      {otherFields.map(field => {
      const usesShell = field.fieldType === "text" || field.fieldType === "number" || field.fieldType === "date";
      return <div key={field.id || field.fieldKey} className={s.fieldBlock}>
          <label className={s.fieldLabel}>
            {field.label}
            {field.required ? <span className={s.requiredMark}>*</span> : null}
          </label>
          <div data-pulse={fieldErrors ? errorPulseTick : undefined} className={`${usesShell ? s.fieldShell : ""} ${fieldErrors ? s.fieldShellError : ""} ${fieldErrors ? s.fieldErrorPulse : ""}`}>
            {renderField(field)}
          </div>
        </div>;
    })}
    </div>;
}
export { filterVisibleFields, fieldIsVisible };
