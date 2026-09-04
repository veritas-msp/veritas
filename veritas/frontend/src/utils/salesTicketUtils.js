const SALES_TYPES = new Set(["prestation", "installation"]);

function normalizeType(type) {
  return String(type || "").trim().toLowerCase();
}

function normalizeCategory(category) {
  return String(category || "");
}

/** Legacy: type demande + category prefix (before distinct sales types). */
function isLegacySalesTicket(type, category) {
  const normalizedType = normalizeType(type);
  const normalizedCategory = normalizeCategory(category);
  return (normalizedType === "demande" || normalizedType === "request") && (normalizedCategory.startsWith("prestation-") || normalizedCategory.startsWith("installation-"));
}

export function isSalesTicketType(type) {
  return SALES_TYPES.has(normalizeType(type));
}

export function isSalesTicket(ticketOrType, category) {
  if (ticketOrType && typeof ticketOrType === "object") {
    const type = ticketOrType.type;
    const cat = ticketOrType.category;
    if (isSalesTicketType(type)) return true;
    return isLegacySalesTicket(type, cat);
  }
  if (isSalesTicketType(ticketOrType)) return true;
  return isLegacySalesTicket(ticketOrType, category);
}

export function isPrestationTicket(ticket) {
  const type = normalizeType(ticket?.type);
  if (type === "prestation") return true;
  return (type === "demande" || type === "request") && normalizeCategory(ticket?.category).startsWith("prestation-");
}

export function isInstallationTicket(ticket) {
  const type = normalizeType(ticket?.type);
  if (type === "installation") return true;
  return (type === "demande" || type === "request") && normalizeCategory(ticket?.category).startsWith("installation-");
}

/** Auto keys look like checkbox_sni5 / textarea_ulwn — strip type prefix for display fallback. */
export function humanizeSalesFieldKey(key) {
  const raw = String(key || "").trim();
  if (!raw) return "";
  return raw
    .replace(/^(text|textarea|select|checkbox|user|contact|client|number|date)_/i, "")
    .replace(/[_-]+/g, " ")
    .trim() || raw;
}

export function buildSalesFormFieldLabelMap(formOrFields) {
  const fields = Array.isArray(formOrFields) ? formOrFields : Array.isArray(formOrFields?.fields) ? formOrFields.fields : [];
  return Object.fromEntries(
    fields
      .filter(field => field?.fieldKey)
      .map(field => [String(field.fieldKey), String(field.label || "").trim() || humanizeSalesFieldKey(field.fieldKey)])
  );
}

export function buildSalesFormFieldEntries(formData, extraLabelMap = {}) {
  if (!formData || typeof formData !== "object") return [];
  const display = formData.displayValues && typeof formData.displayValues === "object" ? formData.displayValues : null;
  const values = formData.values && typeof formData.values === "object" ? formData.values : null;
  const source = display || values;
  if (!source) return [];
  const labelMap = {
    ...(formData.fieldLabels && typeof formData.fieldLabels === "object" ? formData.fieldLabels : {}),
    ...(extraLabelMap && typeof extraLabelMap === "object" ? extraLabelMap : {})
  };
  return Object.entries(source)
    .map(([key, value]) => {
      const rawValue = values?.[key];
      let rendered = null;
      let links = null;
      if (Array.isArray(rawValue) && rawValue.some(item => item && typeof item === "object" && (item.filePath || item.file_path || item.fileName || item.name))) {
        links = rawValue.map(item => ({
          id: item.id,
          label: item.fileName || item.name || item.file_name || "file",
          href: item.filePath || item.file_path || null
        })).filter(item => item.label);
        rendered = links.map(item => item.label).join(", ");
      } else if (Array.isArray(value)) {
        rendered = value.filter(Boolean).map(item => typeof item === "object" ? item.fileName || item.name || "" : item).filter(Boolean).join(", ");
      } else if (value != null && value !== "") {
        rendered = String(value);
      }
      const mapped = String(labelMap[key] || "").trim();
      const label = mapped || humanizeSalesFieldKey(key) || key;
      return { key, label, value: rendered, links };
    })
    .filter(row => row.value);
}

export function resolveSalesKind(ticket) {
  if (isInstallationTicket(ticket)) return "installation";
  if (isPrestationTicket(ticket)) return "prestation";
  const kind = String(ticket?.sales_form_data?.kind || ticket?.salesFormData?.kind || "").toLowerCase();
  if (kind === "installation" || kind === "prestation") return kind;
  return null;
}

function taskDurationMs(task) {
  if (!task?.startAt || !task?.endAt) return 0;
  const start = new Date(task.startAt).getTime();
  const end = new Date(task.endAt).getTime();
  if (Number.isNaN(start) || Number.isNaN(end) || end <= start) return 0;
  return end - start;
}

function taskDeadlineMs(task) {
  const end = task?.endAt ? new Date(task.endAt).getTime() : NaN;
  if (!Number.isNaN(end)) return end;
  const start = task?.startAt ? new Date(task.startAt).getTime() : NaN;
  return Number.isNaN(start) ? null : start;
}

/** Aggregate PM task stats (hours from start→end ranges). */
export function computeSalesTaskStats(tasks = [], nowMs = Date.now()) {
  const list = Array.isArray(tasks) ? tasks : [];
  const byAssigneeMap = new Map();

  let plannedMs = 0;
  let doneMs = 0;
  let remainingMs = 0;
  let done = 0;
  let overdue = 0;
  let unassigned = 0;
  let unscheduled = 0;

  for (const task of list) {
    const duration = taskDurationMs(task);
    const isDone = Boolean(task?.done);
    const assigneesRaw = Array.isArray(task?.assignees) ? task.assignees : [];
    const assigneeEntries =
      assigneesRaw.length > 0
        ? assigneesRaw
            .map(entry => ({
              id: String(entry?.id || entry?.userId || entry?.user_id || "").trim(),
              label: String(entry?.label || entry?.name || "").trim() || null
            }))
            .filter(entry => entry.id)
        : task?.assigneeId
          ? [{ id: String(task.assigneeId), label: String(task?.assigneeLabel || "").trim() || null }]
          : [];

    if (isDone) done += 1;
    if (assigneeEntries.length === 0) unassigned += 1;
    if (!task?.startAt && !task?.endAt) unscheduled += 1;

    plannedMs += duration;
    if (isDone) doneMs += duration;
    else remainingMs += duration;

    const deadline = taskDeadlineMs(task);
    if (!isDone && deadline != null && deadline < nowMs) overdue += 1;

    const buckets = assigneeEntries.length > 0 ? assigneeEntries : [{ id: "__none__", label: null }];
    for (const entry of buckets) {
      const assigneeKey = entry.id;
      const bucket = byAssigneeMap.get(assigneeKey) || {
        key: assigneeKey,
        label: entry.label,
        total: 0,
        done: 0,
        plannedMs: 0,
        doneMs: 0
      };
      bucket.total += 1;
      if (isDone) bucket.done += 1;
      bucket.plannedMs += duration;
      if (isDone) bucket.doneMs += duration;
      if (!bucket.label && entry.label) bucket.label = entry.label;
      byAssigneeMap.set(assigneeKey, bucket);
    }
  }

  const total = list.length;
  const todo = Math.max(0, total - done);
  const progress = total === 0 ? 0 : Math.round((done / total) * 100);

  const byAssignee = Array.from(byAssigneeMap.values()).sort((a, b) => {
    if (a.key === "__none__") return 1;
    if (b.key === "__none__") return -1;
    return (b.plannedMs || 0) - (a.plannedMs || 0) || String(a.label || "").localeCompare(String(b.label || ""));
  });

  return {
    total,
    done,
    todo,
    overdue,
    unassigned,
    unscheduled,
    progress,
    plannedMs,
    doneMs,
    remainingMs,
    byAssignee
  };
}
