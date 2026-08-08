export const FILTER_CONNECTORS = [{
  value: "and",
  label: "ET"
}, {
  value: "or",
  label: "OU"
}];
export function createFilterId(prefix = "node") {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}
export function buildDefaultRule({
  connector = "and",
  includeConnector = false
} = {}) {
  const rule = {
    type: "rule",
    id: createFilterId("rule"),
    field: "title",
    operator: "contains",
    value: ""
  };
  if (includeConnector) rule.connector = connector === "or" ? "or" : "and";
  return rule;
}
export function buildDefaultGroup({
  connector = "and",
  includeConnector = false
} = {}) {
  const group = {
    type: "group",
    id: createFilterId("group"),
    children: [buildDefaultRule()]
  };
  if (includeConnector) group.connector = connector === "or" ? "or" : "and";
  return group;
}
export function buildEmptyFilterRoot() {
  return {
    type: "group",
    id: createFilterId("root"),
    children: []
  };
}
function normalizeConnector(value) {
  return value === "or" ? "or" : "and";
}
function normalizeRuleNode(raw, index) {
  if (!raw || raw.type === "group") return null;
  const rule = {
    type: "rule",
    id: String(raw.id || createFilterId("rule")),
    field: String(raw.field || "title").trim(),
    operator: String(raw.operator || "contains").trim(),
    value: raw.value ?? ""
  };
  if (index > 0) rule.connector = normalizeConnector(raw.connector);
  return rule;
}
function normalizeGroupNode(raw, {
  isRoot = false
} = {}) {
  if (!raw || typeof raw !== "object") return buildEmptyFilterRoot();
  const children = Array.isArray(raw.children) ? raw.children : [];
  const normalizedChildren = children.map((child, index) => {
    if (child?.type === "group") {
      const group = normalizeGroupNode(child);
      if (index > 0) group.connector = normalizeConnector(child.connector);
      return group;
    }
    return normalizeRuleNode(child, index);
  }).filter(Boolean);
  const group = {
    type: "group",
    id: String(raw.id || createFilterId(isRoot ? "root" : "group")),
    children: normalizedChildren
  };
  if (!isRoot && raw.connector) group.connector = normalizeConnector(raw.connector);
  return group;
}
export function legacyRulesToFilterRoot(rules = {}) {
  const criteria = Array.isArray(rules?.criteria) ? rules.criteria : [];
  const connector = rules?.matchMode === "any" ? "or" : "and";
  return {
    type: "group",
    id: createFilterId("root"),
    children: criteria.map((criterion, index) => {
      const rule = normalizeRuleNode({
        ...criterion,
        id: criterion.id || createFilterId("rule")
      }, index);
      if (index > 0) rule.connector = connector;
      return rule;
    })
  };
}
export function normalizeFilterRoot(rawRoot, legacyRules = {}) {
  if (rawRoot?.type === "group") {
    return normalizeGroupNode(rawRoot, {
      isRoot: true
    });
  }
  return legacyRulesToFilterRoot(legacyRules);
}
export function countRulesInTree(filterRoot) {
  let count = 0;
  walkFilterTree(filterRoot, node => {
    if (node.type === "rule") count += 1;
  });
  return count;
}
export function walkFilterTree(filterRoot, visitor, parent = null) {
  if (!filterRoot) return;
  if (filterRoot.type === "group") {
    (filterRoot.children || []).forEach(child => {
      visitor(child, filterRoot);
      if (child.type === "group") walkFilterTree(child, visitor, filterRoot);
    });
    return;
  }
  visitor(filterRoot, parent);
}
export function findNodeWithParent(filterRoot, nodeId) {
  if (!filterRoot || !nodeId) return null;
  if (filterRoot.id === nodeId) {
    return {
      node: filterRoot,
      parent: null,
      index: -1
    };
  }
  function search(group, parentGroup) {
    const children = group.children || [];
    for (let index = 0; index < children.length; index += 1) {
      const child = children[index];
      if (child.id === nodeId) {
        return {
          node: child,
          parent: group,
          index
        };
      }
      if (child.type === "group") {
        const nested = search(child, group);
        if (nested) return nested;
      }
    }
    return null;
  }
  if (filterRoot.type === "group") return search(filterRoot, null);
  return null;
}
export function findParentIdOfNode(filterRoot, nodeId) {
  const located = findNodeWithParent(filterRoot, nodeId);
  if (!located) return null;
  if (located.parent) return located.parent.id;
  return filterRoot?.id || null;
}
export function findFirstRuleId(filterRoot) {
  let firstId = null;
  walkFilterTree(filterRoot, node => {
    if (!firstId && node.type === "rule") firstId = node.id;
  });
  return firstId;
}
function cloneTree(node) {
  return JSON.parse(JSON.stringify(node));
}
export function updateNodeInTree(filterRoot, nodeId, patch) {
  const next = cloneTree(filterRoot);
  const located = findNodeWithParent(next, nodeId);
  if (!located) return next;
  Object.assign(located.node, patch);
  return next;
}
export function setNodeConnector(filterRoot, nodeId, connector) {
  return updateNodeInTree(filterRoot, nodeId, {
    connector: normalizeConnector(connector)
  });
}
export function removeNodeFromTree(filterRoot, nodeId) {
  if (!filterRoot || filterRoot.id === nodeId) return filterRoot;
  const next = cloneTree(filterRoot);
  const located = findNodeWithParent(next, nodeId);
  if (!located?.parent) return next;
  located.parent.children.splice(located.index, 1);
  if (located.node.type === "group") {
    located.parent.children = normalizeGroupFirstConnectors(located.parent.children);
  } else {
    located.parent.children = normalizeGroupFirstConnectors(located.parent.children);
  }
  return next;
}
function normalizeGroupFirstConnectors(children = []) {
  return children.map((child, index) => {
    const copy = {
      ...child
    };
    if (index === 0) {
      delete copy.connector;
    } else if (!copy.connector) {
      copy.connector = "and";
    }
    if (copy.type === "group" && Array.isArray(copy.children)) {
      copy.children = normalizeGroupFirstConnectors(copy.children);
    }
    return copy;
  });
}
export function addRuleToGroup(filterRoot, groupId, rule = buildDefaultRule({
  includeConnector: true
})) {
  const next = cloneTree(filterRoot);
  const located = findNodeWithParent(next, groupId);
  if (!located || located.node.type !== "group") return next;
  const children = located.node.children || [];
  const nextRule = {
    ...rule
  };
  if (children.length > 0) {
    nextRule.connector = normalizeConnector(nextRule.connector || "and");
  } else {
    delete nextRule.connector;
  }
  children.push(nextRule);
  located.node.children = children;
  return next;
}
export function addGroupToGroup(filterRoot, groupId, group = buildDefaultGroup({
  includeConnector: true
})) {
  const next = cloneTree(filterRoot);
  const located = findNodeWithParent(next, groupId);
  if (!located || located.node.type !== "group") return next;
  const children = located.node.children || [];
  const nextGroup = {
    ...group
  };
  if (children.length > 0) {
    nextGroup.connector = normalizeConnector(nextGroup.connector || "and");
  } else {
    delete nextGroup.connector;
  }
  if (!Array.isArray(nextGroup.children) || nextGroup.children.length === 0) {
    nextGroup.children = [buildDefaultRule()];
  }
  children.push(nextGroup);
  located.node.children = children;
  return next;
}
export function moveNodeInGroup(filterRoot, parentId, activeId, overId) {
  const next = cloneTree(filterRoot);
  const parentLocated = findNodeWithParent(next, parentId);
  if (!parentLocated || parentLocated.node.type !== "group") return next;
  const children = parentLocated.node.children || [];
  const oldIndex = children.findIndex(item => item.id === activeId);
  const newIndex = children.findIndex(item => item.id === overId);
  if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) return next;
  const [moved] = children.splice(oldIndex, 1);
  children.splice(newIndex, 0, moved);
  parentLocated.node.children = normalizeGroupFirstConnectors(children);
  return next;
}
export function evaluateFilterChain(children, ticket, context, evaluateCriterion) {
  const nodes = (children || []).filter(Boolean);
  if (nodes.length === 0) return true;
  const evalNode = node => {
    if (node.type === "group") {
      return evaluateFilterChain(node.children, ticket, context, evaluateCriterion);
    }
    return evaluateCriterion(node, ticket, context);
  };
  let acc = evalNode(nodes[0]);
  for (let i = 1; i < nodes.length; i += 1) {
    const node = nodes[i];
    const next = evalNode(node);
    const connector = normalizeConnector(node.connector);
    acc = connector === "or" ? acc || next : acc && next;
  }
  return acc;
}
export function ticketMatchesFilterRoot(filterRoot, ticket, context, evaluateCriterion) {
  const root = normalizeFilterRoot(filterRoot);
  if (!root.children?.length) return true;
  return evaluateFilterChain(root.children, ticket, context, evaluateCriterion);
}
export function validateFilterNode(node) {
  if (!node) return null;
  if (node.type === "group") {
    const children = Array.isArray(node.children) ? node.children : [];
    for (const child of children) {
      const err = validateFilterNode(child);
      if (err) return err;
    }
    return null;
  }
  const field = String(node.field || "").trim();
  const operator = String(node.operator || "").trim();
  if (!field) return "Field required for a rule";
  if (!operator) return "Operator required for a rule";
  if (!["is_empty", "is_not_empty", "in", "not_in"].includes(operator)) {
    if (!String(node.value ?? "").trim()) return "Value required for this criterion";
  }
  if (["in", "not_in"].includes(operator)) {
    const list = String(node.value || "").split(",").map(v => v.trim()).filter(Boolean);
    if (list.length === 0) return "Liste de valeurs requise";
  }
  return null;
}
export function validateFilterRoot(filterRoot) {
  const root = normalizeFilterRoot(filterRoot);
  return validateFilterNode(root);
}
export function collectRuleNodes(filterRoot) {
  const rules = [];
  walkFilterTree(filterRoot, node => {
    if (node.type === "rule") rules.push(node);
  });
  return rules;
}
export function syncLegacyRulesFromFilterRoot(filterRoot) {
  const root = normalizeFilterRoot(filterRoot);
  const rules = collectRuleNodes(root);
  const connectors = [];
  walkFilterTree(root, (node, parent) => {
    if (node.type === "rule" && node.connector && parent?.type === "group") {
      connectors.push(node.connector);
    }
  });
  const hasOr = connectors.some(c => c === "or");
  const hasAnd = connectors.some(c => c === "and");
  let matchMode = "all";
  if (hasOr && !hasAnd) matchMode = "any";
  return {
    matchMode,
    criteria: rules.map(({
      field,
      operator,
      value
    }) => ({
      field,
      operator,
      value
    }))
  };
}
