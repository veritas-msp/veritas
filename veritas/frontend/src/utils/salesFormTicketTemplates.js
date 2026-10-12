/** Shared variable tokens for sales-form ticket title/description templates. */

import { buildConditionFieldOptions } from "./salesFormFieldTypes.js";

function sanitizeFieldTokenName(label, fieldKey) {
  const safeLabel = String(label || "")
    .replace(/\}\}/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return safeLabel || String(fieldKey || "").trim() || "field";
}

function getFieldTemplateTokenName(field, labelCounts = {}) {
  const fieldKey = String(field?.fieldKey || "").trim();
  const baseLabel = String(field?.label || "").trim() || fieldKey;
  const tokenBase = sanitizeFieldTokenName(baseLabel, fieldKey);
  if (labelCounts[baseLabel] > 1) {
    return `${tokenBase} · ${fieldKey}`;
  }
  return tokenBase;
}

export function getSalesFormTemplateVariables(formFields = []) {
  // Same order/labels as condition pickers: "Section · Field" + fieldKey on duplicates.
  const options = buildConditionFieldOptions(formFields, {
    excludeFiles: false
  });
  const labelCounts = {};
  options.forEach(option => {
    const baseLabel = String(option.field?.label || option.field?.fieldKey || option.id || "").trim();
    if (!baseLabel) return;
    labelCounts[baseLabel] = (labelCounts[baseLabel] || 0) + 1;
  });

  const fieldVars = options.map(option => {
    const fieldKey = String(option.id || option.field?.fieldKey || "").trim();
    const tokenName = getFieldTemplateTokenName(option.field || { fieldKey, label: fieldKey }, labelCounts);
    return {
      key: `{{field.${tokenName}}}`,
      fieldKey,
      label: option.label,
      group: "fields",
      sectionLabel: option.sectionLabel || ""
    };
  });

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

/** Rewrite legacy {{field.fieldKey}} tokens to {{field.Label}} for editor display. */
export function prettifySalesFormTemplate(template, variables = []) {
  let out = String(template || "");
  if (!out) return out;
  const fieldVars = (Array.isArray(variables) ? variables : [])
    .filter(item => item?.group === "fields" && item.fieldKey && item.key)
    .slice()
    .sort((a, b) => String(b.fieldKey).length - String(a.fieldKey).length);
  for (const item of fieldVars) {
    const legacy = `{{field.${item.fieldKey}}}`;
    if (legacy !== item.key && out.includes(legacy)) {
      out = out.split(legacy).join(item.key);
    }
  }
  return out;
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
