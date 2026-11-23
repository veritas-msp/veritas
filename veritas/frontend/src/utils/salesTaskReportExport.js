import { getTaskCreditBalance } from "../components/TicketPage/SalesCreditDebitFields";
import { getEquipmentPickerLabel } from "../components/TicketPage/ticketEquipmentUtils";

function isoOrEmpty(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toISOString();
}

function durationMs(startAt, endAt) {
  if (!startAt || !endAt) return null;
  const start = new Date(startAt).getTime();
  const end = new Date(endAt).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return null;
  return end - start;
}

function toCsvCell(value) {
  const text = value == null ? "" : String(value);
  if (/[;"\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

const CSV_COLUMNS = [
  "ticket_id",
  "ticket_number",
  "ticket_title",
  "client_id",
  "client_name",
  "task_index",
  "task_id",
  "label",
  "description",
  "done",
  "event_type",
  "assignee_ids",
  "assignee_labels",
  "start_at",
  "end_at",
  "equipment_id",
  "equipment_label",
  "planning_event_id",
  "documents",
  "credits_total",
  "credits_packs",
  "created_by_id",
  "created_by_label",
  "created_at",
  "updated_by_id",
  "updated_by_label",
  "updated_at"
];

export function salesTaskReportFileBase(ticketNumber) {
  const num = String(ticketNumber || "ticket").replace(/^#/, "").replace(/[^\w\-]+/g, "");
  const stamp = new Date().toISOString().slice(0, 10);
  return `taches-${num || "ticket"}-${stamp}`;
}

export function buildSalesTaskReportModel({
  ticket,
  clientId = null,
  clientName = "",
  ticketNumberLabel = "",
  tasks = [],
  users = [],
  userLabel,
  equipments = [],
  locale = "fr",
  eventTypes = []
}) {
  const typeLabels = new Map(
    (Array.isArray(eventTypes) ? eventTypes : [])
      .filter(type => type?.value)
      .map(type => [String(type.value), String(type.label || type.value)])
  );
  const userById = new Map((Array.isArray(users) ? users : []).map(user => [String(user.id), user]));
  const resolvePerson = (id, fallback) => {
    const fromUsers = id ? userById.get(String(id)) : null;
    const fromDirectory = fromUsers && typeof userLabel === "function" ? userLabel(fromUsers) : "";
    return String(fromDirectory || fallback || "").trim();
  };

  const rows = (Array.isArray(tasks) ? tasks : []).map((task, index) => {
    const assigneesRaw = Array.isArray(task?.assignees) && task.assignees.length > 0
      ? task.assignees
      : task?.assigneeId
        ? [{ id: task.assigneeId, label: task.assigneeLabel }]
        : [];
    const assignees = assigneesRaw
      .map(entry => {
        const id = String(entry?.id || "").trim();
        const label = resolvePerson(id, entry?.label);
        return { id, label: label || id };
      })
      .filter(entry => entry.id || entry.label);
    const equipment = (Array.isArray(equipments) ? equipments : []).find(
      item => String(item?.id || item?.equipment_id || "") === String(task?.equipmentId || "")
    );
    const equipmentLabel = equipment
      ? getEquipmentPickerLabel(equipment, { locale })
      : String(task?.equipmentLabel || "").trim();
    const credit = getTaskCreditBalance(ticket?.supportCredit?.sourceBalances, task?.id);
    const documents = (Array.isArray(task?.documents) ? task.documents : []).map(doc => ({
      id: doc?.id || null,
      fileName: String(doc?.fileName || doc?.file_name || "").trim(),
      filePath: String(doc?.filePath || doc?.file_path || "").trim(),
      mimeType: doc?.mimeType || doc?.mime_type || null,
      fileSize: doc?.fileSize ?? doc?.file_size ?? null,
      createdAt: isoOrEmpty(doc?.createdAt || doc?.created_at)
    }));
    const eventType = String(task?.eventType || "").trim();
    return {
      index: index + 1,
      id: String(task?.id || ""),
      label: String(task?.label || "").trim(),
      description: String(task?.description || "").trim(),
      done: Boolean(task?.done),
      eventType,
      eventTypeLabel: eventType ? typeLabels.get(eventType) || eventType : "",
      assignees,
      startAt: task?.startAt || null,
      endAt: task?.endAt || null,
      durationMs: durationMs(task?.startAt, task?.endAt),
      equipmentId: task?.equipmentId || null,
      equipmentLabel,
      planningEventId: task?.planningEventId || null,
      documents,
      creditsTotal: Number(credit?.total) || 0,
      creditsPacks: Array.isArray(credit?.packs) ? credit.packs : [],
      createdById: task?.createdById || null,
      createdByLabel: resolvePerson(task?.createdById, task?.createdByLabel),
      createdAt: task?.createdAt || null,
      updatedById: task?.updatedById || null,
      updatedByLabel: resolvePerson(task?.updatedById, task?.updatedByLabel),
      updatedAt: task?.updatedAt || null
    };
  });

  const number = ticket?.ticket_number || ticket?.id || "";
  const title = String(ticket?.title || "").trim();
  return {
    fileBase: salesTaskReportFileBase(number),
    ticketId: ticket?.id || null,
    ticketNumber: number,
    ticketNumberLabel,
    ticketTitle: title,
    clientId: clientId || ticket?.client_id || ticket?.clientId || null,
    clientName: String(clientName || "").trim(),
    periodLabel: [ticketNumberLabel, title].filter(Boolean).join(" — "),
    rows
  };
}

export function downloadSalesTasksCsv(model) {
  const shared = {
    ticket_id: model?.ticketId || "",
    ticket_number: model?.ticketNumber || "",
    ticket_title: model?.ticketTitle || "",
    client_id: model?.clientId || "",
    client_name: model?.clientName || ""
  };
  const lines = [CSV_COLUMNS.join(";")];
  (model?.rows || []).forEach(row => {
    const record = {
      ...shared,
      task_index: row.index,
      task_id: row.id,
      label: row.label,
      description: row.description,
      done: row.done ? "true" : "false",
      event_type: row.eventType,
      assignee_ids: row.assignees.map(entry => entry.id).filter(Boolean).join("|"),
      assignee_labels: row.assignees.map(entry => entry.label).filter(Boolean).join("|"),
      start_at: isoOrEmpty(row.startAt),
      end_at: isoOrEmpty(row.endAt),
      equipment_id: row.equipmentId || "",
      equipment_label: row.equipmentLabel || "",
      planning_event_id: row.planningEventId || "",
      documents: JSON.stringify(row.documents || []),
      credits_total: row.creditsTotal || 0,
      credits_packs: JSON.stringify(row.creditsPacks || []),
      created_by_id: row.createdById || "",
      created_by_label: row.createdByLabel || "",
      created_at: isoOrEmpty(row.createdAt),
      updated_by_id: row.updatedById || "",
      updated_by_label: row.updatedByLabel || "",
      updated_at: isoOrEmpty(row.updatedAt)
    };
    lines.push(CSV_COLUMNS.map(column => toCsvCell(record[column])).join(";"));
  });
  const blob = new Blob([`\uFEFF${lines.join("\n")}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${model?.fileBase || "taches"}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
