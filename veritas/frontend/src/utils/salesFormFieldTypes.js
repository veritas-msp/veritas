/** Shared sales-form field type metadata (palette + renderer + API whitelist helpers). */

/** Field types that store options (one per line in the properties panel). */
export const OPTION_BASED_FIELD_TYPES = new Set(["select", "radio", "multiselect"]);

/** Layout markers (no user input value). */
export const LAYOUT_FIELD_TYPES = new Set(["section"]);

/** Input-like types that use the ticket field shell chrome. */
export const SHELL_FIELD_TYPES = new Set(["text", "number", "date", "email", "phone", "url", "time", "datetime", "currency"]);

export function isLayoutField(fieldOrType) {
  const type = typeof fieldOrType === "string" ? fieldOrType : fieldOrType?.fieldType;
  return LAYOUT_FIELD_TYPES.has(String(type || ""));
}

export function isInputField(fieldOrType) {
  return !isLayoutField(fieldOrType);
}

/**
 * Group fields by section markers. Fields after a `section` belong to it until the next section.
 * Order follows displayOrder.
 */
export function groupFieldsBySection(fields = []) {
  const sorted = [...(Array.isArray(fields) ? fields : [])].sort((a, b) => Number(a?.displayOrder || 0) - Number(b?.displayOrder || 0));
  const groups = [];
  let current = {
    section: null,
    fields: []
  };
  for (const field of sorted) {
    if (isLayoutField(field) && field.fieldType === "section") {
      if (current.section || current.fields.length) groups.push(current);
      current = {
        section: field,
        fields: []
      };
      continue;
    }
    if (isLayoutField(field)) continue;
    current.fields.push(field);
  }
  if (current.section || current.fields.length) groups.push(current);
  return groups;
}

export const PALETTE_FIELD_TYPES = [
  // Layout
  {
    type: "section",
    label: "Section",
    icon: "mdi:view-agenda-outline",
    group: "layout"
  },
  // Basic
  {
    type: "text",
    label: "Short text",
    icon: "mdi:form-textbox",
    group: "basic"
  },
  {
    type: "textarea",
    label: "Long text",
    icon: "mdi:text-long",
    group: "basic"
  },
  {
    type: "email",
    label: "Email",
    icon: "mdi:email-outline",
    group: "basic"
  },
  {
    type: "phone",
    label: "Phone",
    icon: "mdi:phone-outline",
    group: "basic"
  },
  {
    type: "url",
    label: "URL / Link",
    icon: "mdi:link-variant",
    group: "basic"
  },
  {
    type: "number",
    label: "Number",
    icon: "mdi:numeric",
    group: "basic"
  },
  {
    type: "currency",
    label: "Currency",
    icon: "mdi:currency-eur",
    group: "basic"
  },
  {
    type: "date",
    label: "Date",
    icon: "mdi:calendar-outline",
    group: "basic"
  },
  {
    type: "time",
    label: "Time",
    icon: "mdi:clock-outline",
    group: "basic"
  },
  {
    type: "datetime",
    label: "Date & time",
    icon: "mdi:calendar-clock",
    group: "basic"
  },
  {
    type: "select",
    label: "Dropdown",
    icon: "mdi:form-dropdown",
    group: "basic"
  },
  {
    type: "radio",
    label: "Single choice",
    icon: "mdi:radiobox-marked",
    group: "basic"
  },
  {
    type: "multiselect",
    label: "Multiple choice",
    icon: "mdi:checkbox-multiple-marked-outline",
    group: "basic"
  },
  {
    type: "checkbox",
    label: "Yes / No",
    icon: "mdi:toggle-switch-outline",
    group: "basic"
  },
  {
    type: "rating",
    label: "Rating",
    icon: "mdi:star-outline",
    group: "basic"
  },
  // Variables (dynamic lookups)
  {
    type: "user",
    label: "User",
    icon: "mdi:account-outline",
    group: "variables"
  },
  {
    type: "client",
    label: "Company",
    icon: "mdi:office-building-outline",
    group: "variables"
  },
  {
    type: "contact",
    label: "Contact",
    icon: "mdi:card-account-details-outline",
    group: "variables"
  }
];

export const FIELD_TYPE_OPTIONS = PALETTE_FIELD_TYPES.map(({
  type,
  label
}) => ({
  value: type,
  label
}));

export const PALETTE_GROUPS = [{
  id: "layout",
  title: "Layout"
}, {
  id: "basic",
  title: "Basic"
}, {
  id: "variables",
  title: "Variables"
}];

export const SALES_FORM_FIELD_TYPES = new Set(PALETTE_FIELD_TYPES.map(item => item.type));
