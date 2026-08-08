import { useState, useEffect, useMemo } from "react";
import React from "react";
import { Icon } from "@iconify/react";
import { FaPlus, FaTrash, FaEdit, FaCheck, FaUser, FaGripVertical, FaEnvelope } from "react-icons/fa";
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
function SortableStepItem({
  step,
  onEdit,
  onDelete,
  onToggleComplete,
  getUserName,
  formatDate,
  isOverdue,
  onSendEmail,
  stepsCopy
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
    transition,
    opacity: isDragging ? 0.5 : 1
  };
  return <div ref={setNodeRef} style={style} className={`${styles.stepItem} ${isDragging ? styles.dragging : ''} ${step.completed ? styles.stepCompleted : ''} ${isOverdue(step.due_date, step.completed) ? styles.stepOverdue : ''}`}>
      <div className={styles.stepDragHandle} {...attributes} {...listeners}>
        <FaGripVertical className={styles.dragIcon} />
      </div>
      <div className={styles.stepContent}>
        <div className={styles.stepHeader}>
          <button className={`${styles.checkbox} ${step.completed ? styles.checkboxChecked : ''}`} onClick={() => onToggleComplete(step)} title={step.completed ? stepsCopy.markUndone : stepsCopy.markDone}>
            {step.completed && <FaCheck />}
          </button>
          <span className={styles.stepName}>{step.name}</span>
        </div>
        <div className={styles.stepDetails}>
          {step.assigned_user_id ? <div className={styles.stepDetail}>
              <FaUser className={styles.detailIcon} />
              <span>{getUserName(step.assigned_user_id)}</span>
            </div> : <div className={styles.stepDetail}>
              <FaUser className={styles.detailIcon} />
              <span className={styles.noData}>{stepsCopy.unassigned}</span>
            </div>}
          {step.due_date ? <div className={`${styles.stepDetail} ${isOverdue(step.due_date, step.completed) ? styles.overdue : ''}`}>
              <Icon icon="mdi:calendar" className={styles.detailIcon} />
              <span>{formatDate(step.due_date)}</span>
            </div> : <div className={styles.stepDetail}>
              <Icon icon="mdi:calendar" className={styles.detailIcon} />
              <span className={styles.noData}>{stepsCopy.noDate}</span>
            </div>}
          {step.duration_hours ? <div className={styles.stepDetail}>
              <Icon icon="mdi:clock-outline" className={styles.detailIcon} />
              <span>{step.duration_hours}h</span>
            </div> : <div className={styles.stepDetail}>
              <Icon icon="mdi:clock-outline" className={styles.detailIcon} />
              <span className={styles.noData}>{stepsCopy.noDuration}</span>
            </div>}
        </div>
      </div>
      <div className={styles.stepActions}>
        {}
        {COMMUNICATION_STEP_NAMES.has(step.name) && <button className={styles.emailButton} onClick={() => onSendEmail(step)} title={stepsCopy.sendEmail}>
            <FaEnvelope />
          </button>}
        <button className={styles.editButton} onClick={() => onEdit(step)} title={stepsCopy.edit}>
          <FaEdit />
        </button>
        <button className={styles.deleteButton} onClick={() => onDelete(step.id)} title={stepsCopy.delete}>
          <FaTrash />
        </button>
      </div>
    </div>;
}
export default function CampaignSteps({
  campaign,
  clientId,
  onCampaignUpdate,
  onStepsCountUpdate,
  embedded = false,
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
  const [animatedProgress, setAnimatedProgress] = useState(0);
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [selectedStepForEmail, setSelectedStepForEmail] = useState(null);
  const [stepModalOpen, setStepModalOpen] = useState(false);
  const [stepModalMode, setStepModalMode] = useState('add');
  const [stepModalInitialData, setStepModalInitialData] = useState(null);
  const [stepModalStepId, setStepModalStepId] = useState(null);
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
  }, [campaign, clientId]);
  useEffect(() => {
    const currentProgress = calculateProgress(steps);
    setAnimatedProgress(currentProgress);
  }, [steps]);
  const loadSteps = async () => {
    try {
      setLoading(true);
      const stepsData = await getCampaignSteps(clientId, campaign.id);
      setSteps(stepsData);
      updateCampaignProgress(stepsData);
      if (onStepsCountUpdate) {
        onStepsCountUpdate(stepsData.length);
      }
    } catch (error) {
      console.error('Error while loading des étapes:', error);
      toast.error(stepsCopy.toastLoadError);
    } finally {
      setLoading(false);
    }
  };
  const calculateProgress = stepsList => {
    if (!stepsList || stepsList.length === 0) return 0;
    const completedSteps = stepsList.filter(step => step.completed).length;
    return Math.round(completedSteps / stepsList.length * 100);
  };
  const updateCampaignProgress = async stepsList => {
    const newProgress = calculateProgress(stepsList);
    if (campaign.global_progress !== newProgress) {
      try {
        await updateClientCampaign(clientId, campaign.id, {
          global_progress: newProgress
        });
        if (onCampaignUpdate) {
          onCampaignUpdate();
        }
      } catch (error) {
        console.error('Error lors de la mise à jour de la progression:', error);
      }
    }
  };
  const loadUsers = async () => {
    try {
      const usersData = await fetchUsers();
      setUsers(usersData);
    } catch (error) {
      console.error('Error while loading des utilisateurs:', error);
    }
  };
  const handleAdd = () => {
    setStepModalMode('add');
    setStepModalInitialData(null);
    setStepModalStepId(null);
    setStepModalOpen(true);
  };
  const handleEdit = step => {
    setStepModalMode('edit');
    setStepModalInitialData(step);
    setStepModalStepId(step.id);
    setStepModalOpen(true);
  };
  const handleModalSave = async data => {
    try {
      if (stepModalMode === 'add') {
        const tempId = `temp-${Date.now()}`;
        const newStep = {
          id: tempId,
          ...data,
          order_index: steps.length + 1
        };
        setSteps(prev => [...prev, newStep]);
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
      console.log('Frontend sending stepOrders:', stepOrders);
      console.log('Campaign ID:', campaign.id, 'Type:', typeof campaign.id);
      await reorderCampaignSteps(clientId, campaign.id, stepOrders);
      await loadSteps();
    } catch (error) {
      console.error('Error lors de la réorganisation:', error);
      toast.error(stepsCopy.toastReorderError);
      await loadSteps();
    }
  };
  const getUserName = userId => {
    if (!userId) return null;
    const user = users.find(u => u.id === userId);
    return user?.username || user?.email || stepsCopy.unknownUser;
  };
  const formatDate = dateString => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString(locale);
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
  if (loading) {
    return <div className={embedded ? styles.embeddedContent : styles.stepsBlock}>
        {!embedded && <h3 className={styles.groupTitle}>{stepsCopy.title}</h3>}
        <div className={styles.loadingState}>
          <Icon icon="mdi:loading" className={styles.loadingIcon} />
          <p>{stepsCopy.loading}</p>
        </div>
      </div>;
  }
  return <div className={embedded ? styles.embeddedContent : styles.stepsBlock}>
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

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <SortableContext items={steps.map(step => step.id)} strategy={verticalListSortingStrategy}>
          <div className={styles.stepsList}>
            {steps.length === 0 ? <div className={styles.emptyState}>
                <Icon icon="mdi:clipboard-outline" className={styles.emptyIcon} />
                <p>{stepsCopy.empty}</p>
              </div> : steps.map(step => <SortableStepItem key={step.id} step={step} onEdit={handleEdit} onDelete={handleDelete} onToggleComplete={handleToggleComplete} getUserName={getUserName} formatDate={formatDate} isOverdue={isOverdue} onSendEmail={handleSendEmail} stepsCopy={stepsCopy} />)}
          </div>
        </SortableContext>
        <DragOverlay>
          {activeId ? <div className={`${styles.stepItem} ${styles.dragging}`}>
              <div className={styles.stepDragHandle}>
                <FaGripVertical className={styles.dragIcon} />
              </div>
              <div className={styles.stepContent}>
                <div className={styles.stepHeader}>
                  <span className={styles.stepName}>
                    {steps.find(s => s.id === activeId)?.name || ''}
                  </span>
                </div>
              </div>
            </div> : null}
        </DragOverlay>
      </DndContext>

      {}
      {emailModalOpen && selectedStepForEmail && <CampaignEmailModal step={selectedStepForEmail} campaign={campaign} clientId={clientId} campaignId={campaign.id} copy={detailCopy} onClose={() => {
      setEmailModalOpen(false);
      setSelectedStepForEmail(null);
    }} onEmailSent={handleEmailSent} />}

      {}
      {stepModalOpen && <CampaignStepModal mode={stepModalMode} initialData={stepModalInitialData} users={users} copy={detailCopy} onSave={handleModalSave} onClose={() => setStepModalOpen(false)} />}
    </div>;
}
