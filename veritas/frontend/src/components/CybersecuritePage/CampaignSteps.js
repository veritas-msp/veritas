import { useState, useEffect, useMemo } from "react";
import React from "react";
import { Icon } from "@iconify/react";
import { FaPlus, FaTrash, FaEdit, FaCheck, FaEnvelope } from "react-icons/fa";
import { toast } from 'react-toastify';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragOverlay } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { getCampaignSteps, createCampaignStep, updateCampaignStep, deleteCampaignStep, updateClientCampaign, reorderCampaignSteps } from "../../api/campaigns";
import { fetchUsers } from "../../api/users";
import CampaignEmailModal from "./CampaignEmailModal";
import CampaignStepModal from "./CampaignStepModal";
import styles from "./CampaignSteps.module.css";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { getCyberModalsCopy } from "./cyberModalsI18n";
import { getCampaignDetailCopy } from "./campaignDetailI18n";
const COMMUNICATION_STEP_NAMES = new Set(["Communication orale puis écrite au client", "Oral then written communication to the client", "Mündliche und anschließend schriftliche Kommunikation mit dem Kunden", "Comunicazione orale e poi scritta al cliente", "Comunicación oral y luego escrita al cliente"]);
function getStepAssigneeLabels(step, users, unknownUser) {
  if (Array.isArray(step?.assignees) && step.assignees.length) {
    return step.assignees
      .map(a => a.label || a.username || a.email || unknownUser)
      .filter(Boolean);
  }
  const ids = Array.isArray(step?.assigned_user_ids)
    ? step.assigned_user_ids
    : step?.assigned_user_id
      ? [step.assigned_user_id]
      : [];
  return ids
    .map(id => {
      const user = users.find(u => String(u.id) === String(id));
      return user?.username || user?.email || unknownUser;
    })
    .filter(Boolean);
}

function SortableStepItem({
  step,
  onEdit,
  onDelete,
  onToggleComplete,
  users,
  formatDateTime,
  formatRange,
  isOverdue,
  onSendEmail,
  stepsCopy,
  isFirstStep = false
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({
    id: step.id
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition
  };
  const assigneeLabels = getStepAssigneeLabels(step, users, stepsCopy.unknownUser);
  const endRef = step.end_at || step.due_date;
  const overdue = isOverdue(endRef, step.completed);
  const scheduleLabel = formatRange(step.start_at, endRef);
  return (
    <li
      ref={setNodeRef}
      style={style}
      className={[
        styles.taskRow,
        styles.taskRowSortable,
        step.completed ? styles.taskRowDone : "",
        isDragging ? styles.taskRowDragging : "",
        overdue ? styles.taskRowOverdue : ""
      ].filter(Boolean).join(" ")}
    >
      <button type="button" className={styles.taskDragHandle} {...attributes} {...listeners} aria-label={stepsCopy.edit}>
        <Icon icon="mdi:drag-vertical" aria-hidden />
      </button>
      <article className={styles.taskCard}>
        <button
          type="button"
          className={`${styles.taskDoneBtn} ${step.completed ? styles.taskDoneBtnActive : ""}`.trim()}
          onClick={() => onToggleComplete(step)}
          title={step.completed ? stepsCopy.markUndone : stepsCopy.markDone}
          aria-label={step.completed ? stepsCopy.markUndone : stepsCopy.markDone}
        >
          <FaCheck />
        </button>
        <div className={styles.taskMain}>
          <span className={styles.taskTitle}>{step.name}</span>
          <div className={styles.taskMetaRow}>
            {assigneeLabels.length > 0 ? (
              assigneeLabels.map(label => (
                <span key={label} className={styles.taskMetaPill}>
                  <Icon icon="mdi:account-outline" aria-hidden />
                  {label}
                </span>
              ))
            ) : (
              <span className={`${styles.taskMetaPill} ${styles.taskMetaPillMuted}`.trim()}>
                <Icon icon="mdi:account-outline" aria-hidden />
                {stepsCopy.unassigned}
              </span>
            )}
            {scheduleLabel ? (
              <span className={`${styles.taskMetaPill} ${overdue ? styles.taskMetaPillWarn : ""}`.trim()}>
                <Icon icon="mdi:calendar-clock" aria-hidden />
                {scheduleLabel}
              </span>
            ) : null}
          </div>
        </div>
        <div className={styles.taskSideActions}>
          {!isFirstStep && COMMUNICATION_STEP_NAMES.has(step.name) ? (
            <button type="button" className={styles.taskIconBtn} onClick={() => onSendEmail(step)} title={stepsCopy.sendEmail} aria-label={stepsCopy.sendEmail}>
              <FaEnvelope />
            </button>
          ) : null}
          <button type="button" className={styles.taskIconBtn} onClick={() => onEdit(step)} title={stepsCopy.edit} aria-label={stepsCopy.edit}>
            <FaEdit />
          </button>
          <button type="button" className={styles.taskIconBtn} onClick={() => onDelete(step.id)} title={stepsCopy.delete} aria-label={stepsCopy.delete}>
            <FaTrash />
          </button>
        </div>
      </article>
    </li>
  );
}
export default function CampaignSteps({
  campaign,
  clientId,
  onCampaignUpdate,
  onStepsCountUpdate,
  embedded = false,
  fill = false,
  copy
}) {
  const locale = useAppLocale();
  const localCopy = useMemo(() => getCampaignDetailCopy(locale), [locale]);
  const detailCopy = copy || localCopy;
  const stepsCopy = detailCopy.steps;
  const cyberCopy = useMemo(() => getCyberModalsCopy(locale), [locale]);
  const [steps, setSteps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [selectedStepForEmail, setSelectedStepForEmail] = useState(null);
  const [stepModalOpen, setStepModalOpen] = useState(false);
  const [stepModalMode, setStepModalMode] = useState("create");
  const [stepModalStepId, setStepModalStepId] = useState(null);
  const [stepModalInitialData, setStepModalInitialData] = useState({});
  const sensors = useSensors(useSensor(PointerSensor, {
    activationConstraint: {
      distance: 8
    }
  }), useSensor(KeyboardSensor, {
    coordinateGetter: sortableKeyboardCoordinates
  }));
  useEffect(() => {
    if (campaign && clientId) {
      loadSteps();
      loadUsers();
    }
  }, [campaign?.id, clientId]);
  const loadUsers = async () => {
    try {
      const data = await fetchUsers();
      setUsers(Array.isArray(data) ? data : []);
    } catch {
      setUsers([]);
    }
  };
  const loadSteps = async () => {
    try {
      setLoading(true);
      const data = await getCampaignSteps(clientId, campaign.id);
      const list = Array.isArray(data) ? data : [];
      setSteps(list);
      if (onStepsCountUpdate) onStepsCountUpdate(list.length);
    } catch (error) {
      console.error(error);
      toast.error(stepsCopy.toastLoadError);
    } finally {
      setLoading(false);
    }
  };
  const calculateProgress = list => {
    if (!list.length) return 0;
    const done = list.filter(s => s.completed).length;
    return Math.round(done / list.length * 100);
  };
  const updateCampaignProgress = async list => {
    const progress = calculateProgress(list);
    try {
      await updateClientCampaign(clientId, campaign.id, {
        global_progress: progress
      });
      if (onCampaignUpdate) onCampaignUpdate();
    } catch {
      // ignore progress sync errors
    }
  };
  const handleAdd = () => {
    setStepModalMode("create");
    setStepModalStepId(null);
    setStepModalInitialData({
      name: "",
      assigned_user_id: "",
      assigned_user_ids: [],
      assignees: [],
      start_at: "",
      end_at: "",
      due_date: ""
    });
    setStepModalOpen(true);
  };
  const handleEdit = step => {
    setStepModalMode("edit");
    setStepModalStepId(step.id);
    setStepModalInitialData({
      name: step.name || "",
      assigned_user_id: step.assigned_user_id || "",
      assigned_user_ids: Array.isArray(step.assigned_user_ids) ? step.assigned_user_ids : [],
      assignees: Array.isArray(step.assignees) ? step.assignees : [],
      start_at: step.start_at || "",
      end_at: step.end_at || "",
      due_date: step.due_date ? String(step.due_date).slice(0, 10) : "",
      completed: Boolean(step.completed)
    });
    setStepModalOpen(true);
  };
  const handleModalSave = async data => {
    try {
      if (stepModalMode === "create") {
        const tempId = `tmp_${Date.now()}`;
        const optimistic = {
          id: tempId,
          ...data,
          completed: false,
          order_index: steps.length + 1
        };
        setSteps(prev => [...prev, optimistic]);
        setStepModalOpen(false);
        try {
          const createdStep = await createCampaignStep(clientId, campaign.id, data);
          setSteps(prev => prev.map(s => s.id === tempId ? createdStep : s));
          if (onStepsCountUpdate) onStepsCountUpdate(steps.length + 1);
          toast.success(stepsCopy.toastCreated);
        } catch (apiError) {
          setSteps(prev => prev.filter(s => s.id !== tempId));
          toast.error(apiError.message || stepsCopy.toastSaveError);
        }
      } else if (stepModalStepId) {
        const updatedSteps = steps.map(s => s.id === stepModalStepId ? {
          ...s,
          ...data
        } : s);
        setSteps(updatedSteps);
        setStepModalOpen(false);
        try {
          await updateCampaignStep(clientId, campaign.id, stepModalStepId, data);
          toast.success(stepsCopy.toastUpdated);
        } catch (apiError) {
          await loadSteps();
          toast.error(apiError.message || stepsCopy.toastSaveError);
        }
      }
    } catch (error) {
      console.error('Error saving:', error);
      toast.error(error.message || stepsCopy.toastSaveError);
    }
  };
  const handleDelete = async stepId => {
    if (!window.confirm(cyberCopy.deleteCampaignStep)) {
      return;
    }
    const stepToDelete = steps.find(s => s.id === stepId);
    if (!stepToDelete) return;
    setSteps(prev => prev.filter(s => s.id !== stepId));
    try {
      await deleteCampaignStep(clientId, campaign.id, stepId);
      if (onStepsCountUpdate) {
        onStepsCountUpdate(steps.length - 1);
      }
      toast.success(stepsCopy.toastDeleted);
    } catch (error) {
      console.error('Error during deletion:', error);
      setSteps(prev => [...prev, stepToDelete].sort((a, b) => (a.order_index || 0) - (b.order_index || 0)));
      toast.error(error.message || stepsCopy.toastDeleteError);
    }
  };
  const handleToggleComplete = async step => {
    const newCompleted = !step.completed;
    const updatedSteps = steps.map(s => s.id === step.id ? {
      ...s,
      completed: newCompleted
    } : s);
    setSteps(updatedSteps);
    const newProgress = calculateProgress(updatedSteps);
    if (campaign.global_progress !== newProgress) {
      updateCampaignProgress(updatedSteps);
    }
    try {
      await updateCampaignStep(clientId, campaign.id, step.id, {
        completed: newCompleted
      });
    } catch (error) {
      console.error('Error lors de la mise à jour:', error);
      toast.error(stepsCopy.toastToggleError);
      setSteps(steps);
      const originalProgress = calculateProgress(steps);
      if (campaign.global_progress !== originalProgress) {
        updateCampaignProgress(steps);
      }
    }
  };
  const handleDragStart = event => {
    setActiveId(event.active.id);
  };
  const handleDragEnd = async event => {
    const {
      active,
      over
    } = event;
    setActiveId(null);
    if (!over || active.id === over.id) {
      return;
    }
    const oldIndex = steps.findIndex(step => step.id === active.id);
    const newIndex = steps.findIndex(step => step.id === over.id);
    if (oldIndex === -1 || newIndex === -1) {
      return;
    }
    const newSteps = arrayMove(steps, oldIndex, newIndex);
    setSteps(newSteps);
    try {
      const stepOrders = newSteps.map((step, index) => ({
        id: step.id,
        order_index: index + 1
      }));
      await reorderCampaignSteps(clientId, campaign.id, stepOrders);
      await loadSteps();
    } catch (error) {
      console.error('Error lors de la réorganisation:', error);
      toast.error(stepsCopy.toastReorderError);
      await loadSteps();
    }
  };
  const formatDateTime = value => {
    if (!value) return "";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleString(locale, {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };
  const formatRange = (startAt, endAt) => {
    if (startAt && endAt) {
      return `${formatDateTime(startAt)} → ${formatDateTime(endAt)}`;
    }
    return formatDateTime(startAt || endAt);
  };
  const isOverdue = (dueDate, completed) => {
    if (!dueDate || completed) return false;
    return new Date(dueDate) < new Date();
  };
  const handleSendEmail = step => {
    setSelectedStepForEmail(step);
    setEmailModalOpen(true);
  };
  const handleEmailSent = async () => {
    if (!selectedStepForEmail) return;
    await loadSteps();
    setEmailModalOpen(false);
    setSelectedStepForEmail(null);
  };
  const rootClass = `${embedded ? styles.embeddedContent : styles.stepsBlock} ${fill ? styles.stepsFill : ""}`.trim();

  if (loading) {
    return <div className={rootClass}>
        {!embedded && <h3 className={styles.groupTitle}>{stepsCopy.title}</h3>}
        <div className={styles.loadingState}>
          <Icon icon="mdi:loading" className={styles.loadingIcon} />
          <p>{stepsCopy.loading}</p>
        </div>
      </div>;
  }
  return <div className={rootClass}>
      {!embedded && <div className={styles.stepsBlockHeader}>
          <h3 className={styles.groupTitle}>{stepsCopy.title}</h3>
          <button className={styles.addButton} onClick={handleAdd} title={stepsCopy.add}>
            <FaPlus />
          </button>
        </div>}

      {embedded && <div className={styles.embeddedHeader}>
          <div className={styles.cardTitle}>
            <span className={styles.cardTitleText}>{stepsCopy.title}</span>
          </div>
          <button className={styles.addButton} onClick={handleAdd} title={stepsCopy.add}>
            <FaPlus />
          </button>
        </div>}

      <div className={`${styles.stepsBody} ${fill ? styles.stepsBodyFill : ""}`.trim()}>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <SortableContext items={steps.map(step => step.id)} strategy={verticalListSortingStrategy}>
            <ul className={`${styles.taskList} ${fill ? styles.stepsListFill : ""}`.trim()}>
              {steps.length === 0 ? <li className={styles.emptyState}>
                  <Icon icon="mdi:clipboard-outline" className={styles.emptyIcon} />
                  <p>{stepsCopy.empty}</p>
                </li> : steps.map((step, index) => <SortableStepItem key={step.id} step={step} onEdit={handleEdit} onDelete={handleDelete} onToggleComplete={handleToggleComplete} users={users} formatDateTime={formatDateTime} formatRange={formatRange} isOverdue={isOverdue} onSendEmail={handleSendEmail} stepsCopy={stepsCopy} isFirstStep={index === 0} />)}
            </ul>
          </SortableContext>
          <DragOverlay>
            {activeId ? <div className={`${styles.taskRow} ${styles.taskRowDragging}`}>
                <article className={styles.taskCard}>
                  <div className={styles.taskMain}>
                    <span className={styles.taskTitle}>
                      {steps.find(s => s.id === activeId)?.name || ''}
                    </span>
                  </div>
                </article>
              </div> : null}
          </DragOverlay>
        </DndContext>
      </div>

      {emailModalOpen && selectedStepForEmail && <CampaignEmailModal step={selectedStepForEmail} campaign={campaign} clientId={clientId} campaignId={campaign.id} copy={detailCopy} onClose={() => {
      setEmailModalOpen(false);
      setSelectedStepForEmail(null);
    }} onEmailSent={handleEmailSent} />}

      {stepModalOpen && <CampaignStepModal mode={stepModalMode} initialData={stepModalInitialData} users={users} copy={detailCopy} onSave={handleModalSave} onClose={() => setStepModalOpen(false)} />}
    </div>;
}
