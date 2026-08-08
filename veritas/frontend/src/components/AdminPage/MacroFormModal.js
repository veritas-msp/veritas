import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";
import { FaTimes } from "react-icons/fa";
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import layout from "../EnterprisesPage/EnterpriseFormModal.module.css";
import styles from "./MacroFormModal.module.css";
import { useAdminSupportSettingsCopy } from "../../hooks/useAdminCopy";
import { getMacroFormSections } from "./adminSupportSettingsI18n";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { interpolate } from "../../i18n/translate";
export const MACRO_ACTION_ICONS = {
  set_field: "mdi:form-select",
  add_comment: "mdi:comment-text-outline",
  open_email: "mdi:email-outline",
  manage_tags: "mdi:tag-multiple-outline",
  planning_alert: "mdi:calendar-alert-outline",
  call: "mdi:phone-outline",
  teams_message: "mdi:microsoft-teams",
  add_tags: "mdi:tag-outline",
  add_attachment: "mdi:paperclip",
  link_ticket: "mdi:link-variant",
  link_equipment: "mdi:devices"
};
function SortableMacroActionRow({
  action,
  index,
  isSelected,
  icon,
  subtitle,
  onSelect,
  onDelete,
  reorderAria,
  stepLabel,
  deleteTitle
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({
    id: action.id
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition
  };
  return <li ref={setNodeRef} style={style} className={`${styles.actionsListRow} ${isDragging ? styles.actionsListRowDragging : ""}`}>
      <button type="button" className={styles.actionDragHandle} aria-label={reorderAria} {...attributes} {...listeners}>
        <Icon icon="mdi:drag-vertical" aria-hidden />
      </button>
      <button type="button" className={`${styles.actionListItem} ${isSelected ? styles.actionListItemActive : ""}`} onClick={onSelect}>
        <Icon icon={icon} className={styles.actionListIcon} aria-hidden />
        <span className={styles.actionListText}>
          <span className={styles.actionListTitle}>{stepLabel}</span>
          <span className={styles.actionListSubtitle}>{subtitle}</span>
        </span>
      </button>
      <div className={styles.actionListTools}>
        <button type="button" className={`${styles.listToolBtn} ${styles.listToolBtnDanger}`} title={deleteTitle} onClick={onDelete}>
          <Icon icon="mdi:delete-outline" aria-hidden />
        </button>
      </div>
    </li>;
}
export default function MacroFormModal({
  open,
  mode = "create",
  draft,
  setDraft,
  saving = false,
  onClose,
  onSave,
  actions = [],
  describeAction,
  describeActionBrief,
  renderActionEditor,
  onDeleteAction,
  onAddAction,
  actionsCount = 0
}) {
  const locale = useAppLocale();
  const ss = useAdminSupportSettingsCopy();
  const m = ss.modals.macro;
  const macroFormSections = useMemo(() => getMacroFormSections(locale), [locale]);
  const isCreate = mode === "create";
  const [activeSection, setActiveSection] = useState("general");
  const [selectedActionId, setSelectedActionId] = useState(null);
  useEffect(() => {
    if (!open) return;
    setActiveSection("general");
    setSelectedActionId(null);
  }, [open]);
  useEffect(() => {
    if (!actions.length) {
      setSelectedActionId(null);
      return;
    }
    if (!selectedActionId || !actions.some(action => action.id === selectedActionId)) {
      setSelectedActionId(actions[actions.length - 1].id);
    }
  }, [actions, selectedActionId]);
  const sectionMeta = useMemo(() => ({
    general: Boolean(String(draft?.name || "").trim()),
    actions: actionsCount > 0
  }), [draft?.name, actionsCount]);
  const selectedAction = actions.find(action => action.id === selectedActionId) || null;
  const selectedIndex = selectedAction ? actions.findIndex(action => action.id === selectedAction.id) : -1;
  const sensors = useSensors(useSensor(PointerSensor, {
    activationConstraint: {
      distance: 6
    }
  }), useSensor(KeyboardSensor, {
    coordinateGetter: sortableKeyboardCoordinates
  }));
  const handleDragEnd = event => {
    const {
      active,
      over
    } = event;
    if (!over || active.id === over.id) return;
    setDraft(prev => {
      const currentActions = [...(prev.actions || [])];
      const oldIndex = currentActions.findIndex(item => item.id === active.id);
      const newIndex = currentActions.findIndex(item => item.id === over.id);
      if (oldIndex < 0 || newIndex < 0) return prev;
      return {
        ...prev,
        actions: arrayMove(currentActions, oldIndex, newIndex)
      };
    });
  };
  if (!open || !draft) return null;
  const modalTitle = isCreate ? m.createTitle : interpolate(m.editTitle, {
    name: draft.name || m.editFallback
  });
  const modalSubtitle = isCreate ? m.createSubtitle : m.editSubtitle;
  const stepsHeaderLabel = actions.length === 1 ? interpolate(m.stepsHeader, {
    count: actions.length
  }) : interpolate(m.stepsHeaderPlural, {
    count: actions.length
  });
  const footerActionsLabel = actionsCount === 1 ? interpolate(m.footerActionsSingular, {
    count: actionsCount
  }) : interpolate(m.footerActionsPlural, {
    count: actionsCount
  });
  const renderSectionContent = () => {
    switch (activeSection) {
      case "general":
        return <>
            <div className={layout.sectionHead}>
              <h3 className={layout.sectionTitle}>{m.generalTitle}</h3>
              <p className={layout.sectionDesc}>{m.generalDesc}</p>
            </div>
            <div className={layout.fieldGrid2}>
              <div className={`${layout.field} ${layout.fieldFull}`}>
                <label className={`${layout.label} ${layout.labelRequired}`} htmlFor="macro-name">
                  {m.nameLabel}
                </label>
                <input id="macro-name" type="text" className={layout.input} value={draft.name || ""} onChange={e => setDraft(prev => ({
                ...prev,
                name: e.target.value
              }))} placeholder={m.namePlaceholder} autoFocus />
              </div>
            </div>
          </>;
      case "actions":
        return <>
            <div className={layout.sectionHead}>
              <h3 className={layout.sectionTitle}>{m.chainTitle}</h3>
              <p className={layout.sectionDesc}>{m.chainDesc}</p>
            </div>

            {actions.length === 0 ? <p className={styles.emptyActions}>{m.emptyActions}</p> : <div className={styles.actionsLayout}>
                <div className={styles.actionsListPanel}>
                  <div className={styles.actionsListHeader}>
                    <span>{stepsHeaderLabel}</span>
                  </div>
                  <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <SortableContext items={actions.map(action => action.id)} strategy={verticalListSortingStrategy}>
                      <ol className={styles.actionsList}>
                        {actions.map((action, index) => {
                      const icon = MACRO_ACTION_ICONS[action.type] || "mdi:lightning-bolt-outline";
                      const subtitle = describeActionBrief?.(action, index) || describeAction?.(action, index) || ss.common.emptyDash;
                      const stepNumber = index + 1;
                      return <SortableMacroActionRow key={action.id} action={action} index={index} isSelected={action.id === selectedActionId} icon={icon} subtitle={subtitle} onSelect={() => setSelectedActionId(action.id)} onDelete={() => onDeleteAction?.(action.id)} reorderAria={interpolate(m.reorderAria, {
                        step: stepNumber
                      })} stepLabel={interpolate(m.stepLabel, {
                        step: stepNumber
                      })} deleteTitle={m.deleteTitle} />;
                    })}
                      </ol>
                    </SortableContext>
                  </DndContext>
                </div>

                <div className={styles.actionDetail}>
                  {selectedAction && selectedIndex >= 0 ? <>
                      <div className={styles.actionDetailHead}>
                        <span className={styles.actionDetailStep}>
                          {interpolate(m.stepLabel, {
                      step: selectedIndex + 1
                    })}
                        </span>
                        <span className={styles.actionDetailSummary}>
                          {describeActionBrief?.(selectedAction, selectedIndex) || describeAction?.(selectedAction, selectedIndex)}
                        </span>
                      </div>
                      {renderActionEditor?.({
                  action: selectedAction,
                  index: selectedIndex,
                  total: actions.length,
                  onChange: patch => {
                    setDraft(prev => ({
                      ...prev,
                      actions: (prev.actions || []).map(item => item.id === selectedAction.id ? {
                        ...item,
                        ...patch
                      } : item)
                    }));
                  }
                })}
                    </> : <p className={styles.emptyActions}>{m.selectAction}</p>}
                </div>
              </div>}

            <button type="button" className={styles.addActionBtn} onClick={onAddAction} disabled={saving}>
              <Icon icon="mdi:plus" aria-hidden />
              {m.addActionBtn}
            </button>
          </>;
      default:
        return null;
    }
  };
  return createPortal(<div className={layout.overlay} onClick={onClose} role="presentation">
      <div className={`${layout.shell} ${styles.macroShell}`} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="macro-form-title">
        <div className={layout.accentBar} aria-hidden />
        <header className={layout.header}>
          <div className={layout.headerMain}>
            <div className={layout.headerIconWrap} aria-hidden>
              <Icon icon={isCreate ? "mdi:lightning-bolt-outline" : "mdi:lightning-bolt"} />
            </div>
            <div className={layout.headerText}>
              <p className={layout.eyebrow}>{m.eyebrow}</p>
              <h2 className={layout.title} id="macro-form-title">
                {modalTitle}
              </h2>
              <p className={layout.subtitle}>{modalSubtitle}</p>
            </div>
          </div>
          <button type="button" className={layout.closeBtn} onClick={onClose} disabled={saving} aria-label={m.closeAria}>
            <FaTimes />
          </button>
        </header>

        <div className={layout.body}>
          <nav className={layout.nav} aria-label={m.sectionsAria}>
            {macroFormSections.map(section => <button key={section.id} type="button" className={`${layout.navItem} ${activeSection === section.id ? layout.navItemActive : ""}`} onClick={() => setActiveSection(section.id)} aria-current={activeSection === section.id ? "step" : undefined}>
                <Icon icon={section.icon} className={layout.navItemIcon} aria-hidden />
                <span className={layout.navItemText}>
                  <span className={layout.navItemLabel}>{section.label}</span>
                  <span className={layout.navItemHint}>{section.description}</span>
                </span>
                {sectionMeta[section.id] && <span className={layout.navBadge}>✓</span>}
              </button>)}
          </nav>

          <div className={layout.content}>{renderSectionContent()}</div>
        </div>

        <footer className={layout.footer}>
          <span className={layout.footerHint}>
            {draft.name?.trim() ? draft.name : m.footerUntitled} · {footerActionsLabel}
          </span>
          <div className={layout.footerActions}>
            <button type="button" className={layout.ghostBtn} onClick={onClose} disabled={saving}>
              {m.cancel}
            </button>
            <button type="button" className={layout.primaryBtn} onClick={onSave} disabled={saving}>
              {saving ? <>
                  <Icon icon="mdi:loading" className={layout.spinning} aria-hidden />
                  {m.saving}
                </> : isCreate ? <>
                  <Icon icon="mdi:check" aria-hidden />
                  {m.createBtn}
                </> : <>
                  <Icon icon="mdi:content-save-outline" aria-hidden />
                  {m.saveBtn}
                </>}
            </button>
          </div>
        </footer>
      </div>
    </div>, document.getElementById("modal-root") || document.body);
}
