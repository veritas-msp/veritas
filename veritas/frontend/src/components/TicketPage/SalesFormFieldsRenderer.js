import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";
import s from "./TicketCreatePage.module.css";
import { fieldIsVisible, filterVisibleFields } from "../../utils/salesFormConditions";
import { SHELL_FIELD_TYPES, formatFileFieldAccept, getFileFieldConfig, groupFieldsBySection, isLayoutField, validateSalesFormFile } from "../../utils/salesFormFieldTypes";
import { getModalDropdownZIndex } from "../../utils/dropdownPortal";

const SEARCHABLE_DROPDOWN_MAX_HEIGHT = 260;

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

function normalizeOptions(options = []) {
  return (Array.isArray(options) ? options : []).map(opt => {
    const value = typeof opt === "string" ? opt : opt?.value ?? opt?.label ?? "";
    const label = typeof opt === "string" ? opt : opt?.label ?? opt?.value ?? "";
    return {
      value: String(value),
      label: String(label || value)
    };
  }).filter(opt => opt.value);
}

function SearchableSelectField({
  value = "",
  options = [],
  onChange,
  placeholder = "Search…",
  emptyResultsHint = "No results",
  maxResults = 50
}) {
  const rootRef = useRef(null);
  const anchorRef = useRef(null);
  const menuRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [highlight, setHighlight] = useState(0);
  const [menuStyle, setMenuStyle] = useState(null);
  const selected = useMemo(() => (Array.isArray(options) ? options : []).find(opt => String(opt.id) === String(value)) || null, [options, value]);
  const filteredOptions = useMemo(() => {
    const query = search.trim().toLowerCase();
    const limit = Math.max(1, Number(maxResults) || 50);
    const list = Array.isArray(options) ? options : [];
    const matched = !query ? list : list.filter(opt => {
      const haystack = `${opt.label || ""} ${opt.hint || ""} ${opt.id}`.toLowerCase();
      return haystack.includes(query);
    });
    return matched.slice(0, limit);
  }, [options, search, maxResults]);
  const updateMenuPosition = useCallback(() => {
    const anchor = anchorRef.current;
    if (!anchor) return;
    const rect = anchor.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom - 8;
    const spaceAbove = rect.top - 8;
    const openUp = spaceBelow < 160 && spaceAbove > spaceBelow;
    const maxHeight = Math.max(120, Math.min(SEARCHABLE_DROPDOWN_MAX_HEIGHT, openUp ? spaceAbove : spaceBelow));
    setMenuStyle({
      position: "fixed",
      left: rect.left,
      width: rect.width,
      zIndex: getModalDropdownZIndex(),
      maxHeight,
      pointerEvents: "auto",
      ...(openUp ? {
        top: rect.top - 4,
        transform: "translateY(-100%)"
      } : {
        top: rect.bottom - 1
      })
    });
  }, []);
  useLayoutEffect(() => {
    if (!open) {
      setMenuStyle(null);
      return undefined;
    }
    updateMenuPosition();
    return undefined;
  }, [open, filteredOptions.length, updateMenuPosition]);
  useEffect(() => {
    if (!open) return undefined;
    const handleClickOutside = event => {
      const target = event.target;
      if (rootRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
      setSearch("");
    };
    const onReposition = () => updateMenuPosition();
    document.addEventListener("pointerdown", handleClickOutside);
    window.addEventListener("resize", onReposition);
    window.addEventListener("scroll", onReposition, true);
    return () => {
      document.removeEventListener("pointerdown", handleClickOutside);
      window.removeEventListener("resize", onReposition);
      window.removeEventListener("scroll", onReposition, true);
    };
  }, [open, updateMenuPosition]);
  useEffect(() => {
    setHighlight(0);
  }, [search, open]);
  const pickOption = useCallback(option => {
    if (!option) return;
    onChange?.(String(option.id));
    setSearch("");
    setOpen(false);
  }, [onChange]);
  const clearValue = useCallback(() => {
    onChange?.("");
    setSearch("");
    setOpen(true);
  }, [onChange]);
  const inputValue = open ? search : selected?.label || "";
  const dropdownNode = open ? <div ref={menuRef} className={s.contactDropdownPortal} style={menuStyle || {
    position: "fixed",
    top: 0,
    left: 0,
    width: 280,
    visibility: "hidden",
    pointerEvents: "none",
    zIndex: getModalDropdownZIndex()
  }} role="listbox">
      {filteredOptions.length === 0 ? <div className={s.contactEmpty}>{emptyResultsHint}</div> : filteredOptions.map((option, index) => <button key={String(option.id)} type="button" role="option" aria-selected={String(option.id) === String(value)} className={`${s.contactOption} ${highlight === index ? s.contactOptionActive : ""}`} onMouseEnter={() => setHighlight(index)} onClick={() => pickOption(option)}>
            <span className={s.contactOptionName}>{option.label}</span>
            {option.hint ? <span className={s.contactOptionMeta}>{option.hint}</span> : null}
          </button>)}
    </div> : null;
  return <div className={s.contactPicker} ref={rootRef} style={{
    width: "100%",
    maxWidth: "none"
  }}>
      <div ref={anchorRef} className={`${s.contactInputWrap} ${open ? s.contactInputWrapOpen : ""}`}>
        <Icon icon="mdi:magnify" className={s.contactInputIcon} aria-hidden />
        <input type="text" className={s.contactInput} value={inputValue} placeholder={placeholder} autoComplete="off" aria-expanded={open} aria-haspopup="listbox" aria-autocomplete="list" onChange={e => {
        setSearch(e.target.value);
        setOpen(true);
        if (value) onChange?.("");
      }} onFocus={() => {
        setOpen(true);
        setSearch("");
      }} onKeyDown={e => {
        if (e.key === "Escape") {
          setOpen(false);
          setSearch("");
          return;
        }
        if (!open || filteredOptions.length === 0) return;
        if (e.key === "ArrowDown") {
          e.preventDefault();
          setHighlight(current => Math.min(current + 1, filteredOptions.length - 1));
        } else if (e.key === "ArrowUp") {
          e.preventDefault();
          setHighlight(current => Math.max(current - 1, 0));
        } else if (e.key === "Enter") {
          e.preventDefault();
          pickOption(filteredOptions[highlight]);
        }
      }} />
        {value ? <button type="button" className={s.contactClearBtn || undefined} onClick={clearValue} aria-label="Clear" title="Clear" style={{
        marginRight: "0.35rem",
        border: "none",
        background: "transparent",
        cursor: "pointer",
        color: "inherit",
        display: "inline-flex",
        alignItems: "center"
      }}>
            <Icon icon="mdi:close" aria-hidden />
          </button> : null}
      </div>
      {dropdownNode ? createPortal(dropdownNode, document.body) : null}
    </div>;
}

function isEmptyFieldValue(field, raw) {
  if (field.fieldType === "checkbox") return raw !== true;
  if (field.fieldType === "multiselect" || field.fieldType === "file") return !Array.isArray(raw) || raw.length === 0;
  if (field.fieldType === "rating") return !Number(raw);
  return !String(raw ?? "").trim();
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
}

function isValidUrl(value) {
  try {
    const parsed = new URL(String(value || "").trim());
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
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
  if (field.fieldType === "multiselect") {
    const selected = Array.isArray(value) ? value : String(value || "").split(",").map(part => part.trim()).filter(Boolean);
    return selected.join(", ");
  }
  if (field.fieldType === "currency") {
    const amount = String(value ?? "").trim();
    return amount ? `${amount} €` : "";
  }
  if (field.fieldType === "rating") {
    const score = Number(value);
    return Number.isFinite(score) && score > 0 ? `${score}/5` : "";
  }
  if (field.fieldType === "file") {
    if (!Array.isArray(value) || value.length === 0) return "";
    return value.map(item => item?.fileName || item?.name || item?.file_name || "file").filter(Boolean).join(", ");
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
  const missingRequired = activeFields.filter(field => field.required && isEmptyFieldValue(field, values[field.fieldKey]));
  if (missingRequired.length > 0) return false;
  for (const field of activeFields) {
    const raw = values[field.fieldKey];
    if (isEmptyFieldValue(field, raw)) continue;
    if (field.fieldType === "email" && !isValidEmail(raw)) return false;
    if (field.fieldType === "url" && !isValidUrl(raw)) return false;
    if (field.fieldType === "rating") {
      const score = Number(raw);
      if (!Number.isFinite(score) || score < 1 || score > 5) return false;
    }
    if (field.fieldType === "file") {
      const cfg = getFileFieldConfig(field);
      if (!Array.isArray(raw) || raw.length > cfg.maxFiles) return false;
      for (const item of raw) {
        const fileLike = item?.file || item;
        if (item?.file) {
          const error = validateSalesFormFile(item.file, cfg, {
            currentCount: 0
          });
          if (error) return false;
        } else if (fileLike && typeof File !== "undefined" && fileLike instanceof File) {
          const error = validateSalesFormFile(fileLike, cfg, {
            currentCount: 0
          });
          if (error) return false;
        }
      }
    }
  }
  const hasAnyValue = activeFields.some(field => !isEmptyFieldValue(field, values[field.fieldKey]));
  if (activeFields.length > 0 && !hasAnyValue) return false;
  return true;
}

function OptionChoiceList({
  field,
  value,
  multiple = false,
  onChange
}) {
  const options = normalizeOptions(field.options);
  const selected = multiple ? Array.isArray(value) ? value.map(String) : [] : String(value || "");
  const toggle = optionValue => {
    if (!multiple) {
      onChange(optionValue === selected ? "" : optionValue);
      return;
    }
    const next = selected.includes(optionValue) ? selected.filter(item => item !== optionValue) : [...selected, optionValue];
    onChange(next);
  };
  return <div className={s.segmentedGroup} role={multiple ? "group" : "radiogroup"} aria-label={field.label} style={{
    flexWrap: "wrap"
  }}>
      {options.length === 0 ? <span className={s.detailsAvailabilityTitle} style={{
      margin: 0
    }}>No options configured</span> : options.map(opt => {
      const active = multiple ? selected.includes(opt.value) : selected === opt.value;
      return <button key={opt.value} type="button" role={multiple ? "checkbox" : "radio"} aria-checked={active} className={`${s.segmentedBtn} ${active ? s.segmentedBtnActive : ""}`} onClick={() => toggle(opt.value)}>
            <Icon icon={multiple ? active ? "mdi:checkbox-marked" : "mdi:checkbox-blank-outline" : active ? "mdi:radiobox-marked" : "mdi:radiobox-blank"} aria-hidden />
            {opt.label}
          </button>;
    })}
    </div>;
}

function RatingInput({
  field,
  value,
  onChange
}) {
  const score = Number(value) || 0;
  return <div className={s.segmentedGroup} role="radiogroup" aria-label={field.label}>
      {[1, 2, 3, 4, 5].map(star => {
      const active = score >= star;
      return <button key={star} type="button" role="radio" aria-checked={score === star} className={`${s.segmentedBtn} ${active ? s.segmentedBtnActive : ""}`} onClick={() => onChange(score === star ? "" : star)} title={`${star}/5`}>
            <Icon icon={active ? "mdi:star" : "mdi:star-outline"} aria-hidden />
            {star}
          </button>;
    })}
    </div>;
}

function formatBytes(size) {
  const bytes = Number(size) || 0;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function FileUploadInput({
  field,
  value,
  onChange
}) {
  const inputRef = useRef(null);
  const [error, setError] = useState("");
  const cfg = getFileFieldConfig(field);
  const files = Array.isArray(value) ? value : [];
  const accept = formatFileFieldAccept(cfg);
  const addFiles = selected => {
    const incoming = Array.from(selected || []);
    if (!incoming.length) return;
    const next = [...files];
    for (const file of incoming) {
      const validationError = validateSalesFormFile(file, cfg, {
        currentCount: next.length
      });
      if (validationError) {
        setError(validationError);
        continue;
      }
      next.push({
        localId: `file-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
        name: file.name,
        size: file.size,
        file
      });
    }
    if (next.length !== files.length) setError("");
    onChange(next);
    if (inputRef.current) inputRef.current.value = "";
  };
  const removeFile = localId => {
    onChange(files.filter(item => item.localId !== localId && item.id !== localId));
    setError("");
  };
  return <div className={s.salesFileUpload}>
      <div className={s.salesFileUploadActions}>
        <button type="button" className={s.segmentedBtn} onClick={() => inputRef.current?.click()} disabled={files.length >= cfg.maxFiles}>
          <Icon icon="mdi:paperclip" aria-hidden />
          Add files
        </button>
        <input ref={inputRef} type="file" accept={accept} multiple={cfg.maxFiles > 1} hidden onChange={e => addFiles(e.target.files)} />
        <span className={s.salesFileUploadHint}>
          Max {cfg.maxFiles} · {cfg.maxSizeMb} MB · {cfg.extensions.join(", ")}
        </span>
      </div>
      {error ? <p className={s.salesFileUploadError}>{error}</p> : null}
      {files.length > 0 ? <ul className={s.salesFileUploadList}>
          {files.map(item => <li key={item.localId || item.id || item.name}>
              <Icon icon="mdi:file-outline" aria-hidden />
              <span>{item.name || item.fileName}</span>
              <em>{formatBytes(item.size || item.fileSize)}</em>
              <button type="button" onClick={() => removeFile(item.localId || item.id)} aria-label="Remove file">
                <Icon icon="mdi:close" aria-hidden />
              </button>
            </li>)}
        </ul> : null}
    </div>;
}

function FieldBlock({
  field,
  children,
  fieldErrors = false,
  errorPulseTick = 0,
  multiline = false
}) {
  const usesShell = SHELL_FIELD_TYPES.has(field.fieldType) || multiline;
  return <div className={s.fieldBlock}>
      <label className={s.fieldLabel}>
        {field.label}
        {field.required ? <span className={s.requiredMark}>*</span> : null}
      </label>
      <div data-pulse={fieldErrors ? errorPulseTick : undefined} className={`${usesShell ? s.fieldShell : ""} ${multiline ? s.fieldShellMultiline : ""} ${fieldErrors ? s.fieldShellError : ""} ${fieldErrors ? s.fieldErrorPulse : ""}`}>
        {children}
      </div>
    </div>;
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
  const groups = useMemo(() => groupFieldsBySection(fields), [fields]);
  const visibleGroups = useMemo(() => groups.map(group => {
    if (group.section && !fieldIsVisible(group.section, values)) return null;
    const visibleFields = group.fields.filter(field => !isLayoutField(field) && fieldIsVisible(field, values));
    if (!group.section && visibleFields.length === 0) return null;
    if (group.section && visibleFields.length === 0) return null;
    return {
      section: group.section,
      fields: visibleFields
    };
  }).filter(Boolean), [groups, values]);
  if (fields.length === 0) {
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
    const emptyDefault = field.fieldType === "checkbox" ? false : field.fieldType === "multiselect" || field.fieldType === "file" ? [] : "";
    const value = values[field.fieldKey] ?? emptyDefault;
    if (field.fieldType === "textarea") {
      return <textarea className={`${s.fieldShellControl} ${s.textarea}`} rows={4} value={value} placeholder={field.placeholder || ""} onChange={e => patchValue(field.fieldKey, e.target.value)} />;
    }
    if (field.fieldType === "select") {
      const options = normalizeOptions(field.options).map(opt => ({
        id: opt.value,
        label: opt.label
      }));
      return <SearchableSelectField value={value} options={options} placeholder={field.placeholder || "Search…"} emptyResultsHint="No results" onChange={next => patchValue(field.fieldKey, next)} />;
    }
    if (field.fieldType === "radio") {
      return <OptionChoiceList field={field} value={value} onChange={next => patchValue(field.fieldKey, next)} />;
    }
    if (field.fieldType === "multiselect") {
      return <OptionChoiceList field={field} value={value} multiple onChange={next => patchValue(field.fieldKey, next)} />;
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
    if (field.fieldType === "rating") {
      return <RatingInput field={field} value={value} onChange={next => patchValue(field.fieldKey, next)} />;
    }
    if (field.fieldType === "file") {
      return <FileUploadInput field={field} value={value} onChange={next => patchValue(field.fieldKey, next)} />;
    }
    if (field.fieldType === "user") {
      const options = users.map(user => ({
        id: user.id,
        label: getUserDisplayName(user) || `#${user.id}`,
        hint: user.email || ""
      }));
      return <SearchableSelectField value={value} options={options} placeholder={field.placeholder || "Search a user…"} emptyResultsHint="No user found" onChange={next => patchValue(field.fieldKey, next)} />;
    }
    if (field.fieldType === "client") {
      const options = clients.map(client => ({
        id: client.id,
        label: getClientDisplayName(client) || `#${client.id}`,
        hint: client.code || client.ville || ""
      }));
      return <SearchableSelectField value={value} options={options} placeholder={field.placeholder || "Search a company…"} emptyResultsHint="No company found" onChange={next => patchValue(field.fieldKey, next)} />;
    }
    if (field.fieldType === "contact") {
      const options = contacts.map(contact => ({
        id: contact.id,
        label: getContactDisplayName(contact) || `#${contact.id}`,
        hint: contact.email || contact.client_name || contact.entreprise || ""
      }));
      return <SearchableSelectField value={value} options={options} placeholder={field.placeholder || "Search a contact…"} emptyResultsHint="No contact found" onChange={next => patchValue(field.fieldKey, next)} />;
    }
    if (field.fieldType === "currency") {
      return <div style={{
        display: "flex",
        alignItems: "center",
        gap: "0.5rem",
        width: "100%"
      }}>
          <input type="number" step="0.01" min="0" className={s.fieldShellControl} value={value} placeholder={field.placeholder || "0.00"} onChange={e => patchValue(field.fieldKey, e.target.value)} />
          <span aria-hidden style={{
          color: "var(--msp-muted)",
          fontWeight: 600
        }}>€</span>
        </div>;
    }
    const inputType = field.fieldType === "number" ? "number" : field.fieldType === "date" ? "date" : field.fieldType === "time" ? "time" : field.fieldType === "datetime" ? "datetime-local" : field.fieldType === "email" ? "email" : field.fieldType === "phone" ? "tel" : field.fieldType === "url" ? "url" : "text";
    return <input type={inputType} className={s.fieldShellControl} value={value} placeholder={field.placeholder || ""} onChange={e => patchValue(field.fieldKey, e.target.value)} />;
  };
  const renderFieldList = list => list.map(field => {
    const multiline = field.fieldType === "textarea";
    return <FieldBlock key={field.id || field.fieldKey} field={field} fieldErrors={fieldErrors} errorPulseTick={errorPulseTick} multiline={multiline}>
        {renderField(field)}
      </FieldBlock>;
  });
  if (visibleGroups.length === 0) {
    return <p className={s.detailsAvailabilityTitle} style={{
      margin: 0
    }}>
        No visible fields for the current answers.
      </p>;
  }
  return <div className={`${s.salesFormFields} ${className || ""}`.trim()}>
      {visibleGroups.map((group, index) => {
      const key = group.section?.id || group.section?.fieldKey || `group-${index}`;
      if (!group.section) {
        return <div key={key} className={s.salesFormSectionUngrouped}>
              {renderFieldList(group.fields)}
            </div>;
      }
      return <section key={key} className={s.salesFormSection}>
          <header className={s.salesFormSectionHead}>
            <h4 className={s.salesFormSectionTitle}>{group.section.label || "Section"}</h4>
            {group.section.placeholder ? <p className={s.salesFormSectionDesc}>{group.section.placeholder}</p> : null}
          </header>
          <div className={s.salesFormSectionBody}>{renderFieldList(group.fields)}</div>
        </section>;
    })}
    </div>;
}
export { filterVisibleFields, fieldIsVisible };
