/** Shared variable tokens for sales-form ticket title/description templates. */

import { buildConditionFieldOptions } from "./salesFormFieldTypes.js";

export function getSalesFormTemplateVariables(formFields = []) {
  // Same order/labels as condition pickers: "Section · Field" + fieldKey on duplicates.
  const fieldVars = buildConditionFieldOptions(formFields, {
    excludeFiles: false
  }).map(option => ({
    key: `{{field.${option.id}}}`,
    label: option.label,
    group: "fields",
    sectionLabel: option.sectionLabel || ""
  }));

  const contextVars = [
    { key: "{{form.label}}", label: "Form label", group: "context" },
    { key: "{{form.kind}}", label: "Form type", group: "context" },
    { key: "{{rule.label}}", label: "Target name", group: "context" },
    { key: "{{client.name}}", label: "Company", group: "context" },
    { key: "{{client.number}}", label: "Company number", group: "context" },
    { key: "{{requester.name}}", label: "Requester", group: "context" },
    { key: "{{requester.email}}", label: "Requester email", group: "context" }
  ];

  return [...fieldVars, ...contextVars];
}

/** Insert a token at the current selection; returns { value, caret }. */
export function insertTemplateToken(text, token, start, end) {
  const source = String(text || "");
  const from = Math.max(0, Number.isFinite(start) ? start : source.length);
  const to = Math.max(from, Number.isFinite(end) ? end : from);
  const safeToken = String(token || "");
  const value = `${source.slice(0, from)}${safeToken}${source.slice(to)}`;
  return {
    value,
    caret: from + safeToken.length
  };
}
