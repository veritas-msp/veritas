const CONDITION_OPERATORS = new Set(["equals", "not_equals", "contains", "checked", "not_checked"]);
function normalizeFieldValue(value) {
  if (value === undefined || value === null) return "";
  if (typeof value === "boolean") return value ? "true" : "false";
  return String(value);
}
/** Expand scalar / array / JSON-array field values into comparable tokens. */
function normalizeFieldValueList(value) {
  if (value === undefined || value === null) return [];
  if (Array.isArray(value)) {
    return value.flatMap(item => normalizeFieldValueList(item));
  }
  if (typeof value === "boolean") return [value ? "true" : "false"];
  if (typeof value === "number" && Number.isFinite(value)) return [String(value)];
  const raw = String(value).trim();
  if (!raw) return [];
  if (raw.startsWith("[") && raw.endsWith("]")) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return normalizeFieldValueList(parsed);
    } catch {
      // fall through — treat as a plain string
    }
  }
  return [raw];
}
function normalizeJoin(value, fallback = "and") {
  if (value === "or" || value === "and") return value;
  return fallback === "or" ? "or" : "and";
}
export function deriveVisibilityMatchMode(conditions = []) {
  const joins = (Array.isArray(conditions) ? conditions : []).slice(1).map(condition => normalizeJoin(condition?.join, "and"));
  if (!joins.length) return "all";
  if (joins.every(join => join === "or")) return "any";
  if (joins.every(join => join === "and")) return "all";
  return "mixed";
}
export function normalizeCondition(raw = {}, {
  index = 0,
  defaultJoin = "and"
} = {}) {
  const operator = CONDITION_OPERATORS.has(String(raw.operator || "")) ? String(raw.operator) : "equals";
  const condition = {
    fieldKey: String(raw.fieldKey || "").trim(),
    operator,
    value: raw.value === undefined || raw.value === null ? "" : String(raw.value)
  };
  if (index > 0) {
    condition.join = normalizeJoin(raw.join, defaultJoin);
  }
  return condition;
}
export function normalizeVisibilityRules(raw = {}) {
  const source = raw && typeof raw === "object" ? raw : {};
  const rawConditions = Array.isArray(source.conditions) ? source.conditions : [];
  const hasExplicitJoins = rawConditions.some((condition, index) => index > 0 && (condition?.join === "and" || condition?.join === "or"));
  const defaultJoin = hasExplicitJoins ? "and" : source.matchMode === "any" ? "or" : "and";
  const conditions = rawConditions.map((condition, index) => normalizeCondition(condition, {
    index,
    defaultJoin
  })).filter(condition => condition.fieldKey);
  return {
    matchMode: deriveVisibilityMatchMode(conditions),
    conditions
  };
}
export function evaluateCondition(condition, fieldValues = {}) {
  const fieldKey = String(condition?.fieldKey || "").trim();
  if (!fieldKey) return true;
  const actualValues = normalizeFieldValueList(fieldValues[fieldKey]);
  const expected = normalizeFieldValue(condition?.value).trim();
  const expectedLower = expected.toLowerCase();
  const actualLowerValues = actualValues.map(value => value.toLowerCase());
  const operator = CONDITION_OPERATORS.has(String(condition?.operator || "")) ? String(condition.operator) : "equals";
  switch (operator) {
    case "equals":
      // Multiselect: "equals option A" means A is among the selected values.
      if (!expectedLower) return actualLowerValues.length === 0;
      return actualLowerValues.includes(expectedLower);
    case "not_equals":
      if (!expectedLower) return actualLowerValues.length > 0;
      return !actualLowerValues.includes(expectedLower);
    case "contains":
      if (!expectedLower) return actualLowerValues.length > 0;
      return actualLowerValues.some(value => value.includes(expectedLower));
    case "checked":
      return actualLowerValues.some(value => value === "true" || value === "1" || value === "oui" || value === "yes");
    case "not_checked":
      return !actualLowerValues.some(value => value === "true" || value === "1" || value === "oui" || value === "yes");
    default:
      return actualLowerValues.includes(expectedLower);
  }
}
/**
 * Evaluate conditions with per-row joins.
 * OR splits groups; AND binds inside a group:
 * A AND B OR C AND D  →  (A ∧ B) ∨ (C ∧ D)
 */
export function conditionsMatch(rules = {}, fieldValues = {}) {
  const normalized = normalizeVisibilityRules(rules);
  if (!normalized.conditions.length) return true;
  const groups = [];
  let currentGroup = [];
  normalized.conditions.forEach((condition, index) => {
    if (index > 0 && normalizeJoin(condition.join, "and") === "or") {
      if (currentGroup.length) groups.push(currentGroup);
      currentGroup = [condition];
      return;
    }
    currentGroup.push(condition);
  });
  if (currentGroup.length) groups.push(currentGroup);
  return groups.some(group => group.every(condition => evaluateCondition(condition, fieldValues)));
}
export function fieldIsVisible(visibilityRules = {}, fieldValues = {}) {
  return conditionsMatch(visibilityRules, fieldValues);
}
