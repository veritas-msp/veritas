import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";
import { FaTimes } from "react-icons/fa";
import TicketConfirmModal from "./TicketConfirmModal";
import layout from "../EnterprisesPage/EnterpriseFormModal.module.css";
import eventStyles from "../PlanningPage/PlanningEventFormModal.module.css";
import styles from "./TicketSalesDetailPage.module.css";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { usePlanningEventTypes } from "../PlanningPage/usePlanningEventTypes";
import { getPlanningEventFormCopy } from "../PlanningPage/planningEventFormI18n";
import { PLANNING_EVENT_TYPES } from "../PlanningPage/planningEventTypes";
import { getEquipmentPickerLabel } from "./ticketEquipmentUtils";

function toDatetimeLocalValue(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const pad = n => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromDatetimeLocalValue(value) {
  const raw = String(value || "").trim();
  if (!raw) return null;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

function formatTaskSchedule(task, formatDateTime, rangeJoiner) {
  if (!task?.startAt && !task?.endAt) return null;
  if (task.startAt && task.endAt) {
    return `${formatDateTime(task.startAt)} ${rangeJoiner} ${formatDateTime(task.endAt)}`;
  }
  return formatDateTime(task.startAt || task.endAt);
}

function resolveDefaultEventType(types, preferred) {
  const list = Array.isArray(types) ? types : [];
  if (preferred && list.some(type => type.value === preferred)) return preferred;
  if (list.some(type => type.value === "intervention")) return "intervention";
  return list[0]?.value || "";
}

const TASK_FORM_SECTIONS = [
  { id: "general", icon: "mdi:text-box-outline" },
  { id: "schedule", icon: "mdi:calendar-clock" },
  { id: "assignee", icon: "mdi:account-outline" },
  { id: "equipment", icon: "mdi:desktop-classic" }
];

export default function SalesTasksPanel({
  tasks = [],
  users = [],
  equipments = [],
  defaultEquipmentId = null,
  copy,
  formatDateTime,
  saving = false,
  variant = "card",
  canManageTasks = true,
  onAddTask,
  onUpdateTask,
  onToggleTask,
  onRemoveTask
}) {
  const locale = useAppLocale();
  const catalogTypes = usePlanningEventTypes();
  const planningFormCopy = useMemo(() => getPlanningEventFormCopy(locale, catalogTypes), [locale, catalogTypes]);
  const selectableTypes = useMemo(() => {
    const list = Array.isArray(planningFormCopy.planningTypes) && planningFormCopy.planningTypes.length > 0
      ? planningFormCopy.planningTypes
      : PLANNING_EVENT_TYPES;
    return list.filter(type => type.formSelectable !== false && type.value !== "campagne");
  }, [planningFormCopy.planningTypes]);
  const typeLabels = useMemo(() => {
    const map = {};
    selectableTypes.forEach(type => {
      map[type.value] = type.label;
    });
    return map;
  }, [selectableTypes]);

  const [open, setOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [taskToDelete, setTaskToDelete] = useState(null);
  const [activeSection, setActiveSection] = useState("general");
  const [label, setLabel] = useState("");
  const [eventType, setEventType] = useState("");
  const [assigneeIds, setAssigneeIds] = useState([]);
  const [equipmentId, setEquipmentId] = useState("");
  const [startLocal, setStartLocal] = useState("");
  const [endLocal, setEndLocal] = useState("");
  const [rangeMode, setRangeMode] = useState(false);

  const userOptions = useMemo(
    () =>
      (Array.isArray(users) ? users : [])
        .filter(u => u?.id)
        .map(u => ({
          id: String(u.id),
          label: u.ticket_helpdesk_display_name || u.username || u.name || u.nom || u.email || ""
        }))
        .filter(u => u.id && u.label),
    [users]
  );

  const equipmentOptions = useMemo(
    () =>
      (Array.isArray(equipments) ? equipments : [])
        .filter(eq => eq?.id)
        .map(eq => ({
          id: String(eq.id),
          label: getEquipmentPickerLabel(eq, { locale }) || String(eq.name || eq.id)
        })),
    [equipments, locale]
  );

  const isEditing = Boolean(editingTask?.id);
  const modalCopy = copy.modal || {};

  const resetForm = () => {
    setEditingTask(null);
    setActiveSection("general");
    setLabel("");
    setEventType(resolveDefaultEventType(selectableTypes));
    setAssigneeIds([]);
    setEquipmentId(defaultEquipmentId ? String(defaultEquipmentId) : "");
    setStartLocal("");
    setEndLocal("");
    setRangeMode(false);
  };

  const closeModal = () => {
    if (saving) return;
    setOpen(false);
    resetForm();
  };

  const openCreateModal = () => {
    resetForm();
    setEventType(resolveDefaultEventType(selectableTypes));
    setEquipmentId(defaultEquipmentId ? String(defaultEquipmentId) : "");
    setOpen(true);
  };

  const openEditModal = task => {
    if (!task?.id || saving) return;
    setEditingTask(task);
    setActiveSection("general");
    setLabel(String(task.label || ""));
    setEventType(resolveDefaultEventType(selectableTypes, task.eventType || task.type));
    const fromAssignees = Array.isArray(task.assignees)
      ? task.assignees.map(entry => String(entry?.id || "")).filter(Boolean)
      : [];
    const legacyId = task.assigneeId ? String(task.assigneeId) : "";
    setAssigneeIds(fromAssignees.length > 0 ? fromAssignees : legacyId ? [legacyId] : []);
    setEquipmentId(
      task.equipmentId
        ? String(task.equipmentId)
        : defaultEquipmentId
          ? String(defaultEquipmentId)
          : ""
    );
    setStartLocal(toDatetimeLocalValue(task.startAt));
    setEndLocal(toDatetimeLocalValue(task.endAt));
    setRangeMode(Boolean(task.startAt && task.endAt));
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = event => {
      if (event.key === "Escape" && !saving) {
        setOpen(false);
        resetForm();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, saving]);

  useEffect(() => {
    if (!open || eventType) return;
    setEventType(resolveDefaultEventType(selectableTypes));
  }, [open, eventType, selectableTypes]);

  const sectionMeta = useMemo(
    () => ({
      general: Boolean(label.trim() && eventType),
      schedule: true,
      assignee: true,
      equipment: true
    }),
    [label, eventType]
  );

  const formSections = useMemo(
    () =>
      TASK_FORM_SECTIONS.map(section => ({
        ...section,
        label: modalCopy.sections?.[section.id]?.label || section.id,
        description: modalCopy.sections?.[section.id]?.description || ""
      })),
    [modalCopy]
  );

  const selectedAssignees = useMemo(
    () =>
      assigneeIds
        .map(id => userOptions.find(user => user.id === String(id)))
        .filter(Boolean),
    [assigneeIds, userOptions]
  );

  const availableAssigneeOptions = useMemo(
    () => userOptions.filter(user => !assigneeIds.includes(String(user.id))),
    [userOptions, assigneeIds]
  );

  const footerSummary = useMemo(() => {
    const titlePart = label.trim() || modalCopy.footerUntitled || "—";
    const typePart = typeLabels[eventType] || eventType || copy.eventTypeRequiredShort || "—";
    const assigneePart =
      selectedAssignees.length > 0
        ? selectedAssignees.map(user => user.label).join(", ")
        : copy.assigneeNone;
    const equipment = equipmentOptions.find(eq => eq.id === String(equipmentId));
    const equipmentPart = equipment?.label || copy.equipmentNone || "—";
    const schedulePart = startLocal ? copy.scheduled || "Planifié" : copy.unscheduled || "Sans date";
    return `${titlePart} · ${typePart} · ${assigneePart} · ${equipmentPart} · ${schedulePart}`;
  }, [label, eventType, typeLabels, selectedAssignees, equipmentId, equipmentOptions, startLocal, copy.assigneeNone, copy.equipmentNone, copy.eventTypeRequiredShort, copy.scheduled, copy.unscheduled, modalCopy.footerUntitled]);

  const canSubmit = Boolean(label.trim() && eventType && !saving);

  const addAssignee = userId => {
    const id = String(userId || "").trim();
    if (!id || assigneeIds.includes(id)) return;
    setAssigneeIds(prev => [...prev, id]);
  };

  const removeAssignee = userId => {
    const id = String(userId || "").trim();
    setAssigneeIds(prev => prev.filter(entry => entry !== id));
  };

  const handleSubmit = async event => {
    event.preventDefault();
    const trimmed = label.trim();
    const selectedType = String(eventType || "").trim();
    if (!trimmed || saving) return;
    if (!selectedType) {
      setActiveSection("general");
      return;
    }
    const assignees = selectedAssignees.map(user => ({
      id: user.id,
      label: user.label
    }));
    const primary = assignees[0] || null;
    const equipment = equipmentOptions.find(eq => eq.id === String(equipmentId));
    const startAt = startLocal ? fromDatetimeLocalValue(startLocal) : null;
    if (startLocal && !startAt) {
      setActiveSection("schedule");
      return;
    }
    const endAt = startAt && rangeMode ? fromDatetimeLocalValue(endLocal) : null;
    const scheduleEnd = endAt && startAt && new Date(endAt) < new Date(startAt) ? startAt : endAt;

    const payload = {
      label: trimmed,
      eventType: selectedType,
      assignees,
      assigneeId: primary?.id || null,
      assigneeLabel: primary?.label || null,
      equipmentId: equipment?.id || null,
      equipmentLabel: equipment?.label || null,
      startAt,
      endAt: scheduleEnd
    };

    if (isEditing) {
      const ok = await onUpdateTask?.({
        ...editingTask,
        ...payload,
        updatedAt: new Date().toISOString()
      });
      if (ok === false) return;
    } else {
      const ok = await onAddTask?.({
        id: `task-${Date.now()}`,
        ...payload,
        done: false,
        createdAt: new Date().toISOString()
      });
      if (ok === false) return;
    }
    resetForm();
    setOpen(false);
  };

  const handleConfirmDelete = async () => {
    if (!taskToDelete?.id || saving) return;
    await onRemoveTask?.(taskToDelete.id);
    setTaskToDelete(null);
  };

  const deleteMessage = taskToDelete?.label
    ? String(copy.removeConfirmMessage || "").replace("{label}", taskToDelete.label)
    : copy.removeConfirmMessageFallback || copy.removeConfirmMessage;

  const renderSectionContent = () => {
    switch (activeSection) {
      case "general":
        return (
          <>
            <div className={layout.sectionHead}>
              <h3 className={layout.sectionTitle}>{modalCopy.generalTitle || copy.label}</h3>
              <p className={layout.sectionDesc}>{modalCopy.generalDesc || ""}</p>
            </div>
            <div className={layout.fieldStack}>
              <div className={layout.field}>
                <span className={`${layout.label} ${layout.labelRequired}`}>{copy.eventType || planningFormCopy.fields?.eventType}</span>
                <div className={eventStyles.typeGrid} role="group" aria-label={copy.eventType || planningFormCopy.fields?.eventType}>
                  {selectableTypes.map(type => (
                    <button
                      key={type.value}
                      type="button"
                      className={`${eventStyles.typeBtn} ${eventType === type.value ? eventStyles.typeBtnActive : ""}`}
                      onClick={() => setEventType(type.value)}
                      aria-pressed={eventType === type.value}
                      disabled={saving}
                    >
                      <Icon icon={type.icon} className={eventStyles.typeBtnIcon} aria-hidden />
                      <span className={eventStyles.typeBtnLabel}>{type.label}</span>
                    </button>
                  ))}
                </div>
                {!eventType ? <p className={styles.taskPlanningHint}>{copy.eventTypeRequired}</p> : null}
              </div>
              <div className={layout.field}>
                <label className={`${layout.label} ${layout.labelRequired}`} htmlFor="sales-task-title">
                  {copy.label}
                </label>
                <input
                  id="sales-task-title"
                  type="text"
                  className={layout.input}
                  value={label}
                  onChange={e => setLabel(e.target.value)}
                  placeholder={copy.placeholder}
                  disabled={saving}
                  autoFocus
                />
              </div>
            </div>
          </>
        );
      case "schedule":
        return (
          <>
            <div className={layout.sectionHead}>
              <h3 className={layout.sectionTitle}>{modalCopy.scheduleTitle || copy.start}</h3>
              <p className={layout.sectionDesc}>{modalCopy.scheduleDesc || copy.planningLinkedHint || ""}</p>
            </div>
            <div className={layout.fieldGrid2}>
              <div className={layout.field}>
                <label className={layout.label} htmlFor="sales-task-start">
                  {copy.start}
                </label>
                <input
                  id="sales-task-start"
                  type="datetime-local"
                  className={layout.input}
                  value={startLocal}
                  onChange={e => {
                    const next = e.target.value;
                    setStartLocal(next);
                    if (!next) {
                      setEndLocal("");
                      setRangeMode(false);
                    }
                  }}
                  disabled={saving}
                />
              </div>
              <div className={layout.field}>
                <label className={layout.label} htmlFor="sales-task-end">
                  <span className={styles.taskRangeToggle}>
                    <input
                      type="checkbox"
                      checked={rangeMode}
                      onChange={e => setRangeMode(e.target.checked)}
                      disabled={saving || !startLocal}
                    />
                    {copy.range}
                  </span>
                </label>
                <input
                  id="sales-task-end"
                  type="datetime-local"
                  className={layout.input}
                  value={endLocal}
                  onChange={e => setEndLocal(e.target.value)}
                  disabled={saving || !rangeMode || !startLocal}
                  min={startLocal || undefined}
                />
              </div>
            </div>
            {copy.planningOptionalHint ? <p className={styles.taskPlanningHint}>{copy.planningOptionalHint}</p> : null}
          </>
        );
      case "assignee":
        return (
          <>
            <div className={layout.sectionHead}>
              <h3 className={layout.sectionTitle}>{modalCopy.assigneeTitle || copy.assignee}</h3>
              <p className={layout.sectionDesc}>{modalCopy.assigneeDesc || ""}</p>
            </div>
            <div className={layout.fieldStack}>
              <div className={`${layout.field} ${layout.fieldFull}`}>
                <label className={layout.label} htmlFor="sales-task-assignee-add">
                  {copy.assignee}
                </label>
                <select
                  id="sales-task-assignee-add"
                  className={layout.input}
                  value=""
                  onChange={e => {
                    addAssignee(e.target.value);
                    e.target.value = "";
                  }}
                  disabled={saving || availableAssigneeOptions.length === 0}
                >
                  <option value="">{copy.addAssignee || "Ajouter un assigné…"}</option>
                  {availableAssigneeOptions.map(user => (
                    <option key={user.id} value={user.id}>
                      {user.label}
                    </option>
                  ))}
                </select>
              </div>
              {selectedAssignees.length > 0 ? (
                <div className={styles.chipList}>
                  {selectedAssignees.map(user => (
                    <span key={user.id} className={styles.chip}>
                      {user.label}
                      <button
                        type="button"
                        className={styles.chipRemove}
                        onClick={() => removeAssignee(user.id)}
                        disabled={saving}
                        aria-label={copy.removeAssignee || copy.remove}
                        title={copy.removeAssignee || copy.remove}
                      >
                        <Icon icon="mdi:close" />
                      </button>
                    </span>
                  ))}
                </div>
              ) : (
                <p className={styles.taskPlanningHint}>{copy.assigneeNone}</p>
              )}
            </div>
          </>
        );
      case "equipment":
        return (
          <>
            <div className={layout.sectionHead}>
              <h3 className={layout.sectionTitle}>{modalCopy.equipmentTitle || copy.equipment}</h3>
              <p className={layout.sectionDesc}>{modalCopy.equipmentDesc || copy.equipmentHint || ""}</p>
            </div>
            <div className={layout.fieldGrid2}>
              <div className={`${layout.field} ${layout.fieldFull}`}>
                <label className={layout.label} htmlFor="sales-task-equipment">
                  {copy.equipment}
                </label>
                <select
                  id="sales-task-equipment"
                  className={layout.input}
                  value={equipmentId}
                  onChange={e => setEquipmentId(e.target.value)}
                  disabled={saving || equipmentOptions.length === 0}
                >
                  <option value="">{copy.equipmentNone}</option>
                  {equipmentOptions.map(eq => (
                    <option key={eq.id} value={eq.id}>
                      {eq.label}
                    </option>
                  ))}
                </select>
                {equipmentOptions.length === 0 ? (
                  <p className={styles.taskPlanningHint}>{copy.equipmentEmpty || copy.equipmentHint}</p>
                ) : null}
              </div>
            </div>
          </>
        );
      default:
        return null;
    }
  };

  const modal = open
    ? createPortal(
        <div className={layout.overlay} onClick={closeModal} role="presentation">
          <div
            className={`${layout.shell} ${layout.shellMedium}`}
            onClick={e => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="sales-task-form-title"
          >
            <div className={layout.accentBar} aria-hidden />
            <header className={layout.header}>
              <div className={layout.headerMain}>
                <div className={layout.headerIconWrap} aria-hidden>
                  <Icon icon={isEditing ? "mdi:checkbox-marked-outline" : "mdi:checkbox-marked-circle-plus-outline"} />
                </div>
                <div className={layout.headerText}>
                  <p className={layout.eyebrow}>{modalCopy.eyebrow || copy.title}</p>
                  <h2 className={layout.title} id="sales-task-form-title">
                    {isEditing ? copy.edit : copy.add}
                  </h2>
                  <p className={layout.subtitle}>{isEditing ? modalCopy.editSubtitle : modalCopy.createSubtitle}</p>
                </div>
              </div>
              <button type="button" className={layout.closeBtn} onClick={closeModal} disabled={saving} aria-label={copy.cancel}>
                <FaTimes />
              </button>
            </header>

            <form
              className={styles.taskModalForm}
              onSubmit={handleSubmit}
            >
              <div className={layout.body}>
                <nav className={layout.nav} aria-label={modalCopy.sectionsAria || copy.title}>
                  {formSections.map(section => (
                    <button
                      key={section.id}
                      type="button"
                      className={`${layout.navItem} ${activeSection === section.id ? layout.navItemActive : ""}`}
                      onClick={() => setActiveSection(section.id)}
                      aria-current={activeSection === section.id ? "step" : undefined}
                    >
                      <Icon icon={section.icon} className={layout.navItemIcon} aria-hidden />
                      <span className={layout.navItemText}>
                        <span className={layout.navItemLabel}>{section.label}</span>
                        <span className={layout.navItemHint}>{section.description}</span>
                      </span>
                      {sectionMeta[section.id] ? <span className={layout.navBadge}>✓</span> : null}
                    </button>
                  ))}
                </nav>
                <div className={layout.content}>{renderSectionContent()}</div>
              </div>

              <footer className={layout.footer}>
                <span className={layout.footerHint}>{footerSummary}</span>
                <div className={layout.footerActions}>
                  <button type="button" className={layout.ghostBtn} onClick={closeModal} disabled={saving}>
                    {copy.cancel}
                  </button>
                  <button type="submit" className={layout.primaryBtn} disabled={!canSubmit}>
                    {saving ? (
                      <>
                        <Icon icon="mdi:loading" className={layout.spinning} aria-hidden />
                        {copy.saving}
                      </>
                    ) : isEditing ? (
                      <>
                        <Icon icon="mdi:content-save-outline" aria-hidden />
                        {copy.save}
                      </>
                    ) : (
                      <>
                        <Icon icon="mdi:check" aria-hidden />
                        {copy.add}
                      </>
                    )}
                  </button>
                </div>
              </footer>
            </form>
          </div>
        </div>,
        document.getElementById("modal-root") || document.body
      )
    : null;

  return (
    <div className={variant === "pane" ? styles.tasksInPane : styles.tasksInChat}>
      <div className={styles.tasksInChatHead}>
        <div className={styles.tasksInChatTitle}>
          <Icon icon="mdi:checkbox-marked-outline" aria-hidden />
          <span>{copy.title}</span>
          <span className={styles.sectionMeta}>
            {tasks.filter(t => t.done).length}/{tasks.length}
            {saving ? ` · ${copy.saving}` : ""}
          </span>
        </div>
        {canManageTasks ? (
          <button type="button" className={styles.tasksAddTrigger} onClick={openCreateModal} disabled={saving}>
            <Icon icon="mdi:plus" aria-hidden />
            {copy.add}
          </button>
        ) : null}
      </div>

      <ul className={styles.taskChatList}>
        {tasks.length === 0 ? <li className={styles.taskChatEmpty}>{copy.empty}</li> : null}
        {tasks.map(task => {
          const schedule = formatTaskSchedule(task, formatDateTime, copy.rangeJoiner);
          const typeLabel = typeLabels[task.eventType] || typeLabels[task.type] || null;
          return (
            <li key={task.id} className={`${styles.taskChatItem} ${task.done ? styles.taskChatItemDone : ""}`}>
              <button type="button" className={styles.taskCheck} onClick={() => canManageTasks && onToggleTask?.(task.id)} aria-pressed={task.done} title={task.done ? copy.markTodo : copy.markDone} disabled={!canManageTasks || saving}>
                <Icon icon={task.done ? "mdi:checkbox-marked" : "mdi:checkbox-blank-outline"} />
              </button>
              <div className={styles.taskChatBody}>
                {canManageTasks ? (
                  <button type="button" className={styles.taskChatLabelBtn} onClick={() => openEditModal(task)} disabled={saving} title={copy.edit}>
                    <span className={styles.taskChatLabel}>{task.label}</span>
                  </button>
                ) : (
                  <span className={styles.taskChatLabel}>{task.label}</span>
                )}
                <div className={styles.taskChatMeta}>
                  {typeLabel ? (
                    <span>
                      <Icon icon="mdi:shape-outline" aria-hidden />
                      {typeLabel}
                    </span>
                  ) : null}
                  <span>
                    <Icon icon="mdi:account-outline" aria-hidden />
                    {(() => {
                      const list = Array.isArray(task.assignees) && task.assignees.length > 0
                        ? task.assignees
                        : task.assigneeId
                          ? [{ id: task.assigneeId, label: task.assigneeLabel }]
                          : [];
                      if (list.length === 0) return copy.assigneeNone;
                      return list
                        .map(entry =>
                          (entry.id && userOptions.find(u => u.id === String(entry.id))?.label) ||
                          entry.label ||
                          entry.id
                        )
                        .filter(Boolean)
                        .join(", ");
                    })()}
                  </span>
                  {(task.equipmentId || task.equipmentLabel) ? (
                    <span>
                      <Icon icon="mdi:desktop-classic" aria-hidden />
                      {(task.equipmentId && equipmentOptions.find(eq => eq.id === String(task.equipmentId))?.label) || task.equipmentLabel || copy.equipment}
                    </span>
                  ) : null}
                  {schedule ? (
                    <span>
                      <Icon icon="mdi:calendar-clock" aria-hidden />
                      {schedule}
                    </span>
                  ) : null}
                </div>
              </div>
              {canManageTasks ? (
                <div className={styles.taskItemActions}>
                  <button type="button" className={styles.taskEdit} onClick={() => openEditModal(task)} aria-label={copy.edit} title={copy.edit} disabled={saving}>
                    <Icon icon="mdi:pencil-outline" />
                  </button>
                  <button type="button" className={styles.taskRemove} onClick={() => setTaskToDelete(task)} aria-label={copy.remove} disabled={saving}>
                    <Icon icon="mdi:delete-outline" />
                  </button>
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>

      {modal}

      <TicketConfirmModal
        open={Boolean(taskToDelete)}
        title={copy.removeConfirmTitle}
        message={deleteMessage}
        confirmLabel={copy.removeConfirm}
        cancelLabel={copy.cancel}
        variant="danger"
        icon="mdi:delete-outline"
        loading={saving}
        onClose={() => {
          if (!saving) setTaskToDelete(null);
        }}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}

export { toDatetimeLocalValue, fromDatetimeLocalValue };
