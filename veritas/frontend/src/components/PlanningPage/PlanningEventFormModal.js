import { useState, useEffect, useLayoutEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";
import { FaTimes, FaTrash, FaPlus, FaGripVertical, FaPen } from "react-icons/fa";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import layout from "../EnterprisesPage/EnterpriseFormModal.module.css";
import eventStyles from "./PlanningEventFormModal.module.css";
import NumberStepperInput from "../Misc/NumberStepperInput/NumberStepperInput";
import { EVENT_DESCRIPTION_EDITOR_MODULES, EVENT_DESCRIPTION_EDITOR_FORMATS, TODO_PRESET_COLORS, getLinkedItemIcon } from "./planningEventFormConfig";
import { interpolate } from "../../i18n/translate";
function TodoColorPicker({
  value,
  onChange,
  ariaLabel,
  compact = false,
  formatColorLabel
}) {
  return <div className={`${eventStyles.todoColorPicker} ${compact ? eventStyles.todoColorPickerCompact : ""}`} role="group" aria-label={ariaLabel}>
      {TODO_PRESET_COLORS.map(color => <button key={color} type="button" className={`${eventStyles.todoColorSwatch} ${value === color ? eventStyles.todoColorSwatchActive : ""}`} style={{
      "--swatch-color": color
    }} onClick={() => onChange(color)} aria-label={formatColorLabel ? formatColorLabel(color) : `Color ${color}`} aria-pressed={value === color} />)}
      <label className={eventStyles.todoColorCustom} title={formatColorLabel ? formatColorLabel(value) : undefined}>
        <input type="color" className={eventStyles.todoColorInput} value={value} onChange={e => onChange(e.target.value)} aria-label={ariaLabel} />
      </label>
    </div>;
}
function useFixedDropdownPosition(isOpen, anchorRef, offset = 6) {
  const [style, setStyle] = useState(null);
  useLayoutEffect(() => {
    if (!isOpen || !anchorRef?.current) {
      setStyle(null);
      return undefined;
    }
    const updatePosition = () => {
      const anchor = anchorRef.current;
      if (!anchor) return;
      const target = anchor.querySelector("input, button") || anchor;
      const rect = target.getBoundingClientRect();
      const maxHeight = Math.min(240, window.innerHeight - rect.bottom - offset - 12);
      setStyle({
        position: "fixed",
        top: rect.bottom + offset,
        left: rect.left,
        width: rect.width,
        maxHeight: Math.max(140, maxHeight)
      });
    };
    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [isOpen, anchorRef, offset]);
  return style;
}
function ClientAutocompleteDropdown({
  isOpen,
  style,
  filteredClientOptions,
  selectedClient,
  onClientChange,
  setClientSearch,
  setClientDropdownOpen,
  copy
}) {
  if (!isOpen) return null;
  const portalStyle = style || {
    position: "fixed",
    top: 0,
    left: 0,
    width: 280,
    maxHeight: 240,
    visibility: "hidden"
  };
  return createPortal(<div className={eventStyles.autocompleteDropdownPortal} style={portalStyle} data-planning-client-dropdown>
      <button type="button" className={eventStyles.autocompleteOption} onClick={() => {
      onClientChange("");
      setClientSearch("");
      setClientDropdownOpen(false);
    }}>
        {copy.fields.noClient}
      </button>
      {filteredClientOptions.length === 0 ? <p className={eventStyles.autocompleteEmpty}>{copy.fields.clientNotFound}</p> : filteredClientOptions.slice(0, 30).map(client => <button key={client.id} type="button" className={`${eventStyles.autocompleteOption} ${String(selectedClient) === String(client.id) ? eventStyles.autocompleteOptionActive : ""}`} onClick={() => {
      onClientChange(String(client.id));
      setClientSearch(client.name || client.nom || "");
      setClientDropdownOpen(false);
    }}>
            {client.name || client.nom}
          </button>)}
    </div>, document.body);
}
function AssigneeAutocompleteDropdown({
  isOpen,
  style,
  assigneeSearch,
  setAssigneeSearch,
  filteredAssigneeOptions,
  selectedAssignedUsers,
  setSelectedAssignedUsers,
  currentUser,
  copy
}) {
  if (!isOpen) return null;
  const portalStyle = style || {
    position: "fixed",
    top: 0,
    left: 0,
    width: 320,
    maxHeight: 280,
    visibility: "hidden"
  };
  return createPortal(<div className={eventStyles.assigneeDropdownPortal} style={portalStyle} data-planning-assignee-dropdown>
      <input type="text" className={eventStyles.assigneeDropdownSearch} value={assigneeSearch} onChange={e => setAssigneeSearch(e.target.value)} placeholder={copy.fields.assigneeSearch} autoComplete="off" />
      <div className={eventStyles.assigneeDropdownList}>
        {filteredAssigneeOptions.map(u => {
        const uid = String(u.id);
        const checked = selectedAssignedUsers.includes(uid);
        const displayName = u.name || u.nom || u.username || u.email;
        return <label key={u.id} className={eventStyles.assigneeOptionCompact}>
              <input type="checkbox" checked={checked} onChange={e => {
            const isChecked = e.target.checked;
            setSelectedAssignedUsers(prev => {
              const has = prev.includes(uid);
              if (isChecked && !has) return [...prev, uid];
              if (!isChecked && has) return prev.filter(id => id !== uid);
              return prev;
            });
          }} />
              <span>
                {displayName} {u.id === currentUser?.id ? copy.meSuffix : ""}
              </span>
            </label>;
      })}
      </div>
    </div>, document.body);
}
export default function PlanningEventFormModal({
  open,
  editingEvent,
  copy,
  saving = false,
  deleting = false,
  onClose,
  onSubmit,
  onDelete,
  eventForm,
  onInputChange,
  planningTypes,
  clientSearch,
  setClientSearch,
  clientDropdownOpen,
  setClientDropdownOpen,
  clientAutocompleteRef,
  filteredClientOptions,
  selectedClient,
  onClientChange,
  users,
  currentUser,
  selectedAssignedUsers,
  setSelectedAssignedUsers,
  assigneeSearch,
  setAssigneeSearch,
  assigneeDropdownOpen,
  setAssigneeDropdownOpen,
  assigneeSelectRef,
  filteredAssigneeOptions,
  selectedLinkedItems,
  toggleLinkedItem,
  linkableItems,
  linkableItemsByGroup,
  linkedSearch,
  setLinkedSearch,
  linkedTypeFilter,
  setLinkedTypeFilter,
  linkedTypeButtons,
  loadingLinkedItems,
  todoItems,
  setTodoItems,
  todoDraft,
  setTodoDraft,
  todoDraftColor,
  setTodoDraftColor,
  addTodoItem,
  moveTodoItemById,
  draggingTodoId,
  setDraggingTodoId,
  dragOverTodoId,
  setDragOverTodoId,
  getBusinessEndDate,
  getCalendarEndDate
}) {
  const [activeSection, setActiveSection] = useState("general");
  const [editingTodoId, setEditingTodoId] = useState(null);
  const [editingTodoText, setEditingTodoText] = useState("");
  const isEditing = Boolean(editingEvent);
  const updateTodoItem = (id, patch) => {
    setTodoItems(prev => prev.map(row => row.id === id ? {
      ...row,
      ...patch
    } : row));
  };
  const removeTodoItem = id => {
    setTodoItems(prev => prev.filter(row => row.id !== id));
    if (editingTodoId === id) {
      setEditingTodoId(null);
      setEditingTodoText("");
    }
  };
  const startEditTodo = todo => {
    setEditingTodoId(todo.id);
    setEditingTodoText(todo.text || "");
  };
  const commitEditTodo = () => {
    if (!editingTodoId) return;
    const text = editingTodoText.trim();
    if (!text) {
      removeTodoItem(editingTodoId);
    } else {
      updateTodoItem(editingTodoId, {
        text
      });
    }
    setEditingTodoId(null);
    setEditingTodoText("");
  };
  const cancelEditTodo = () => {
    setEditingTodoId(null);
    setEditingTodoText("");
  };
  const clientDropdownStyle = useFixedDropdownPosition(clientDropdownOpen, clientAutocompleteRef);
  const assigneeDropdownStyle = useFixedDropdownPosition(assigneeDropdownOpen, assigneeSelectRef);
  useEffect(() => {
    if (!open) {
      setEditingTodoId(null);
      setEditingTodoText("");
      return;
    }
    setActiveSection("general");
  }, [open]);
  const visiblePlanningTypes = useMemo(() => {
    const list = planningTypes || [];
    const current = eventForm?.type;
    return list.filter(t => t.formSelectable !== false && t.value !== "campagne" || current && t.value === current);
  }, [planningTypes, eventForm?.type]);
  const sectionBadges = useMemo(() => ({
    objects: selectedLinkedItems?.length || 0,
    todos: todoItems?.length || 0
  }), [selectedLinkedItems, todoItems]);
  const sectionMeta = useMemo(() => ({
    general: Boolean(eventForm?.title?.trim() || eventForm?.clientId),
    schedule: Boolean(eventForm?.startDate && eventForm?.endDate && selectedAssignedUsers?.length > 0),
    description: Boolean(eventForm?.description && eventForm.description.replace(/<[^>]*>/g, "").trim()),
    objects: (selectedLinkedItems?.length || 0) > 0,
    todos: (todoItems?.length || 0) > 0
  }), [eventForm, selectedAssignedUsers, selectedLinkedItems, todoItems]);
  if (!open || !eventForm || !copy) return null;
  const modalTitle = isEditing ? copy.editTitle : copy.createTitle;
  const modalSubtitle = isEditing ? copy.editSubtitle : copy.createSubtitle;
  const formSections = copy.sections || [];
  const handleAllDayChange = checked => {
    onInputChange("allDay", checked);
    if (checked) {
      onInputChange("durationDays", Math.max(1, Number(eventForm.durationDays) || 1));
    }
  };
  const renderSectionHead = sectionId => {
    const section = formSections.find(s => s.id === sectionId);
    if (!section) return null;
    return <div className={layout.sectionHead}>
        <h3 className={layout.sectionTitle}>{section.label}</h3>
        <p className={layout.sectionDesc}>{section.description}</p>
      </div>;
  };
  const renderSectionContent = () => {
    switch (activeSection) {
      case "general":
        return <>
            {renderSectionHead("general")}
            <div className={layout.fieldStack}>
            <div className={layout.field}>
              <span className={layout.label}>{copy.fields.eventType}</span>
              <div className={eventStyles.typeGrid}>
                {visiblePlanningTypes.map(type => <button key={type.value} type="button" className={`${eventStyles.typeBtn} ${eventForm.type === type.value ? eventStyles.typeBtnActive : ""}`} onClick={() => onInputChange("type", type.value)} aria-pressed={eventForm.type === type.value}>
                    <Icon icon={type.icon} className={eventStyles.typeBtnIcon} aria-hidden />
                    <span className={eventStyles.typeBtnLabel}>{type.label}</span>
                  </button>)}
              </div>
            </div>
            <div className={layout.field}>
              <label className={`${layout.label} ${layout.labelRequired}`} htmlFor="planning-event-title">
                {copy.fields.title}
              </label>
              <input id="planning-event-title" type="text" className={layout.input} value={eventForm.title || ""} onChange={e => onInputChange("title", e.target.value)} placeholder={copy.fields.titlePlaceholder} required autoFocus={!isEditing} />
            </div>
            <div className={layout.field}>
              <label className={layout.label} htmlFor="planning-event-client">
                {copy.fields.client}
              </label>
              <div className={eventStyles.autocompleteWrapper} ref={clientAutocompleteRef}>
                <input id="planning-event-client" type="text" className={layout.input} placeholder={copy.fields.clientSearch} value={clientSearch} onFocus={() => setClientDropdownOpen(true)} onChange={e => {
                  setClientSearch(e.target.value);
                  setClientDropdownOpen(true);
                  if (!e.target.value.trim()) onClientChange("");
                }} autoComplete="off" />
                <ClientAutocompleteDropdown isOpen={clientDropdownOpen} style={clientDropdownStyle} filteredClientOptions={filteredClientOptions} selectedClient={selectedClient} onClientChange={onClientChange} setClientSearch={setClientSearch} setClientDropdownOpen={setClientDropdownOpen} copy={copy} />
              </div>
            </div>
            </div>
          </>;
      case "schedule":
        return <>
            {renderSectionHead("schedule")}
            <div className={layout.fieldStack}>
            <div className={layout.field}>
              <span className={`${layout.label} ${layout.labelRequired}`}>
                {copy.fields.agents}
              </span>
              <div className={eventStyles.assigneePicker} ref={assigneeSelectRef}>
                <button type="button" className={eventStyles.assigneePickerButton} onClick={() => setAssigneeDropdownOpen(prev => !prev)}>
                  {selectedAssignedUsers.length > 0 ? <span className={eventStyles.assigneeInlineTags}>
                      {selectedAssignedUsers.map(uid => {
                      const u = users.find(item => String(item.id) === String(uid));
                      if (!u) return null;
                      const displayName = u.name || u.nom || u.username || u.email;
                      return <span key={uid} className={eventStyles.assigneeTag}>
                            {displayName}
                          </span>;
                    })}
                    </span> : <span className={eventStyles.assigneePlaceholder}>
                      {copy.fields.agentsPlaceholder}
                    </span>}
                </button>
                <AssigneeAutocompleteDropdown isOpen={assigneeDropdownOpen} style={assigneeDropdownStyle} assigneeSearch={assigneeSearch} setAssigneeSearch={setAssigneeSearch} filteredAssigneeOptions={filteredAssigneeOptions} selectedAssignedUsers={selectedAssignedUsers} setSelectedAssignedUsers={setSelectedAssignedUsers} currentUser={currentUser} copy={copy} />
              </div>
              {selectedAssignedUsers.length === 0 && <p className={eventStyles.helperText}>
                  {copy.fields.agentsRequired}
                </p>}
            </div>

            <div className={layout.fieldGrid2}>
              <div className={layout.field}>
                <label className={`${layout.label} ${layout.labelRequired}`} htmlFor="planning-event-start-date">
                  {copy.fields.startDate}
                </label>
                <input id="planning-event-start-date" type="date" className={layout.input} value={eventForm.startDate || ""} onChange={e => onInputChange("startDate", e.target.value)} required />
              </div>
              {!eventForm.allDay && <div className={layout.field}>
                  <label className={`${layout.label} ${layout.labelRequired}`} htmlFor="planning-event-start-time">
                    {copy.fields.startTime}
                  </label>
                  <input id="planning-event-start-time" type="time" className={layout.input} value={eventForm.startTime || ""} onChange={e => onInputChange("startTime", e.target.value)} required />
                </div>}
            </div>

            <div className={layout.fieldGrid2}>
              <div className={layout.field}>
                <label className={`${layout.label} ${layout.labelRequired}`} htmlFor="planning-event-end-date">
                  {copy.fields.endDate}
                </label>
                <input id="planning-event-end-date" type="date" className={layout.input} value={eventForm.allDay ? (eventForm.businessDaysOnly ? getBusinessEndDate(eventForm.startDate, Math.max(1, Number(eventForm.durationDays) || 1)) : getCalendarEndDate(eventForm.startDate, Math.max(1, Number(eventForm.durationDays) || 1))).format("YYYY-MM-DD") : eventForm.endDate || ""} onChange={e => {
                  if (eventForm.allDay) return;
                  onInputChange("endDate", e.target.value);
                }} disabled={eventForm.allDay} required />
              </div>
              {eventForm.allDay ? <div className={layout.field}>
                  <label className={`${layout.label} ${layout.labelRequired}`} htmlFor="planning-event-duration">
                    {copy.fields.durationDays}
                  </label>
                  <NumberStepperInput id="planning-event-duration" value={eventForm.durationDays || 1} inputClassName={layout.input} min={1} increaseAriaLabel={copy.fields.durationIncrease} decreaseAriaLabel={copy.fields.durationDecrease} onChange={next => onInputChange("durationDays", typeof next === "number" ? next : Math.max(1, Number(next) || 1))} required />
                </div> : <div className={layout.field}>
                  <label className={`${layout.label} ${layout.labelRequired}`} htmlFor="planning-event-end-time">
                    {copy.fields.endTime}
                  </label>
                  <input id="planning-event-end-time" type="time" className={layout.input} value={eventForm.endTime || ""} onChange={e => onInputChange("endTime", e.target.value)} required />
                </div>}
            </div>

            <div className={eventStyles.switchRow}>
              <span className={eventStyles.switchLabel}>{copy.fields.allDayLabel}</span>
              <label className={eventStyles.switchControl}>
                <input type="checkbox" checked={!!eventForm.allDay} onChange={e => handleAllDayChange(e.target.checked)} />
                <span className={eventStyles.switchSlider} />
              </label>
            </div>
            {eventForm.allDay && <div className={eventStyles.switchRow}>
                <span className={eventStyles.switchLabel}>
                  {copy.fields.businessDaysOnly}
                </span>
                <label className={eventStyles.switchControl}>
                  <input type="checkbox" checked={!!eventForm.businessDaysOnly} onChange={e => onInputChange("businessDaysOnly", e.target.checked)} />
                  <span className={eventStyles.switchSlider} />
                </label>
              </div>}
            </div>
          </>;
      case "description":
        return <>
            {renderSectionHead("description")}
            <div className={eventStyles.richEditorWrapper}>
              <ReactQuill theme="snow" value={eventForm.description || ""} onChange={value => onInputChange("description", value)} modules={EVENT_DESCRIPTION_EDITOR_MODULES} formats={EVENT_DESCRIPTION_EDITOR_FORMATS} placeholder={copy.fields.descriptionRichPlaceholder} />
            </div>
          </>;
      case "objects":
        return <>
            {renderSectionHead("objects")}
            {!selectedClient ? <p className={eventStyles.helperText}>
                {copy.fields.selectClientFirst}
              </p> : loadingLinkedItems ? <div className={eventStyles.linkedLoader}>
                <span className={eventStyles.loaderSpinner} aria-hidden />
                <span>{copy.fields.loadingLinkedItems}</span>
              </div> : linkableItems.length === 0 ? <p className={eventStyles.helperText}>
                {copy.fields.noLinkedItems}
              </p> : <>
                <div className={eventStyles.objectsToolbar}>
                  <input type="text" className={layout.input} value={linkedSearch} onChange={e => setLinkedSearch(e.target.value)} placeholder={copy.fields.linkedSearchExtended} />
                  <div className={eventStyles.objectTypeButtons}>
                    {linkedTypeButtons.map(typeBtn => <button key={typeBtn.key} type="button" className={`${eventStyles.objectTypeButton} ${linkedTypeFilter === typeBtn.key ? eventStyles.objectTypeButtonActive : ""}`} onClick={() => setLinkedTypeFilter(typeBtn.key)} title={typeBtn.label}>
                        <Icon icon={typeBtn.icon} aria-hidden />
                        <span>{typeBtn.label}</span>
                      </button>)}
                  </div>
                </div>
                <div className={eventStyles.objectList}>
                  {Object.entries(linkableItemsByGroup).flatMap(([groupName, items]) => items.map(item => {
                const itemId = String(item.id);
                const checked = selectedLinkedItems.includes(itemId);
                return <label key={`${groupName}-${itemId}`} className={eventStyles.objectRow}>
                            <input type="checkbox" checked={checked} onChange={() => toggleLinkedItem(itemId)} />
                            <span className={eventStyles.objectRowIcon}>
                              <Icon icon={getLinkedItemIcon(item)} aria-hidden />
                            </span>
                            <span className={eventStyles.objectRowLabel}>
                              {item.label}
                            </span>
                            <span className={eventStyles.objectRowType}>
                              {item.type}
                            </span>
                            <span className={eventStyles.objectRowGroup}>
                              {groupName}
                            </span>
                          </label>;
              }))}
                </div>
                {Object.keys(linkableItemsByGroup).length === 0 && <p className={eventStyles.helperText}>
                    {copy.fields.noLinkedFilterMatch}
                  </p>}
              </>}
          </>;
      case "todos":
        return <>
            {renderSectionHead("todos")}
            <div className={eventStyles.todoComposer}>
              <input type="text" className={eventStyles.todoComposerInput} value={todoDraft} onChange={e => setTodoDraft(e.target.value)} onKeyDown={e => {
              if (e.key === "Enter") {
                e.preventDefault();
                addTodoItem();
              }
            }} placeholder={copy.fields.todoPlaceholder} />
              <TodoColorPicker value={todoDraftColor} onChange={setTodoDraftColor} ariaLabel={copy.fields.todoColorNew} formatColorLabel={copy.formatColorLabel} />
              <button type="button" className={eventStyles.todoAddButton} onClick={addTodoItem}>
                <FaPlus aria-hidden />
                {copy.fields.todoAdd}
              </button>
            </div>

            {todoItems.length === 0 ? <p className={eventStyles.todoEmpty}>
                {copy.fields.todoEmptyHelp}
              </p> : <div className={eventStyles.itemsList}>
                {todoItems.map(todo => {
              const isEditingTodo = editingTodoId === todo.id;
              return <div key={todo.id} className={`${eventStyles.itemRow} ${dragOverTodoId === todo.id ? eventStyles.itemRowDragOver : ""}`} style={{
                "--todo-color": todo.color || "var(--msp-accent, #2b5fab)"
              }} onDragOver={e => {
                e.preventDefault();
                if (draggingTodoId && draggingTodoId !== todo.id) {
                  setDragOverTodoId(todo.id);
                }
              }} onDrop={e => {
                e.preventDefault();
                if (draggingTodoId && draggingTodoId !== todo.id) {
                  moveTodoItemById(draggingTodoId, todo.id);
                }
                setDraggingTodoId(null);
                setDragOverTodoId(null);
              }}>
                      <button type="button" className={eventStyles.todoDragHandle} draggable onDragStart={e => {
                  setDraggingTodoId(todo.id);
                  e.dataTransfer.effectAllowed = "move";
                  e.dataTransfer.setData("text/plain", String(todo.id));
                }} onDragEnd={() => {
                  setDraggingTodoId(null);
                  setDragOverTodoId(null);
                }} aria-label={interpolate(copy.fields.moveTask, {
                  text: todo.text
                })} title={copy.fields.dragReorder}>
                        <FaGripVertical />
                      </button>

                      <input type="checkbox" className={eventStyles.todoCheckbox} checked={!!todo.done} style={{
                  accentColor: todo.color || "var(--msp-accent, #2b5fab)"
                }} onChange={e => updateTodoItem(todo.id, {
                  done: e.target.checked
                })} aria-label={interpolate(copy.fields.markTask, {
                  text: todo.text
                })} />

                      {isEditingTodo ? <input type="text" className={eventStyles.todoEditInput} value={editingTodoText} autoFocus onChange={e => setEditingTodoText(e.target.value)} onBlur={commitEditTodo} onKeyDown={e => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    commitEditTodo();
                  }
                  if (e.key === "Escape") {
                    e.preventDefault();
                    cancelEditTodo();
                  }
                }} aria-label={copy.fields.editTaskLabel} /> : <button type="button" className={`${eventStyles.todoTextButton} ${todo.done ? eventStyles.itemDone : ""}`} onClick={() => startEditTodo(todo)} title={copy.fields.clickToEdit}>
                          {todo.text}
                        </button>}

                      <TodoColorPicker value={todo.color || "#15d1a0"} onChange={color => updateTodoItem(todo.id, {
                  color
                })} ariaLabel={interpolate(copy.fields.todoColorTask, {
                  text: todo.text
                })} formatColorLabel={copy.formatColorLabel} compact />

                      <div className={eventStyles.todoRowActions}>
                        {!isEditingTodo ? <button type="button" className={eventStyles.todoEditBtn} onClick={() => startEditTodo(todo)} aria-label={interpolate(copy.fields.editTaskNamed, {
                    text: todo.text
                  })} title={copy.fields.editTask}>
                            <FaPen />
                          </button> : null}
                        <button type="button" className={eventStyles.itemDeleteBtn} onClick={() => removeTodoItem(todo.id)} aria-label={interpolate(copy.fields.deleteTaskNamed, {
                    text: todo.text
                  })} title={copy.fields.removeTask}>
                          <FaTrash />
                        </button>
                      </div>
                    </div>;
            })}
              </div>}
          </>;
      default:
        return null;
    }
  };
  return createPortal(<div className={layout.overlay} onClick={onClose} role="presentation">
      <div className={layout.shell} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="planning-event-form-modal-title">
        <div className={layout.accentBar} aria-hidden />
        <header className={layout.header}>
          <div className={layout.headerMain}>
            <div className={layout.headerIconWrap} aria-hidden>
              <Icon icon={isEditing ? "mdi:calendar-edit" : "mdi:calendar-plus-outline"} />
            </div>
            <div className={layout.headerText}>
              <p className={layout.eyebrow}>{copy.eyebrow}</p>
              <h2 className={layout.title} id="planning-event-form-modal-title">
                {modalTitle}
              </h2>
              <p className={layout.subtitle}>{modalSubtitle}</p>
            </div>
          </div>
          <button type="button" className={layout.closeBtn} onClick={onClose} disabled={saving || deleting} aria-label={copy.close}>
            <FaTimes />
          </button>
        </header>

        <form className={eventStyles.form} onSubmit={e => {
        e.preventDefault();
        onSubmit?.(e);
      }}>
          <div className={layout.body}>
            <nav className={layout.nav} aria-label={copy.sectionsAria}>
              {formSections.map(section => <button key={section.id} type="button" className={`${layout.navItem} ${activeSection === section.id ? layout.navItemActive : ""}`} onClick={() => setActiveSection(section.id)} aria-current={activeSection === section.id ? "step" : undefined}>
                  <Icon icon={section.icon} className={layout.navItemIcon} aria-hidden />
                  <span className={layout.navItemText}>
                    <span className={layout.navItemLabel}>{section.label}</span>
                    <span className={layout.navItemHint}>
                      {section.description}
                    </span>
                  </span>
                  {["objects", "todos"].includes(section.id) && sectionBadges[section.id] > 0 ? <span className={layout.navBadge}>
                      {sectionBadges[section.id]}
                    </span> : null}
                  {!["objects", "todos"].includes(section.id) && sectionMeta[section.id] ? <span className={layout.navBadge}>✓</span> : null}
                </button>)}
            </nav>

            <div className={layout.content}>{renderSectionContent()}</div>
          </div>

          <footer className={`${layout.footer} ${eventStyles.footer}`}>
            {isEditing ? <button type="button" className={`${layout.ghostBtn} ${eventStyles.deleteBtn}`} onClick={() => onDelete?.()} disabled={saving || deleting}>
                <FaTrash />
                {deleting ? copy.deleting : copy.delete}
              </button> : <span className={eventStyles.footerSpacer} aria-hidden />}
            <span className={layout.footerHint}>
              {copy.requiredHint}
            </span>
            <div className={layout.footerActions}>
              <button type="button" className={layout.ghostBtn} onClick={onClose} disabled={saving || deleting}>
                {copy.cancel}
              </button>
              <button type="submit" className={layout.primaryBtn} disabled={saving || deleting}>
                {saving ? <>
                    <Icon icon="mdi:loading" className={layout.spinning} aria-hidden />
                    {copy.saving}
                  </> : isEditing ? <>
                    <Icon icon="mdi:content-save-outline" aria-hidden />
                    {copy.save}
                  </> : <>
                    <Icon icon="mdi:check" aria-hidden />
                    {copy.create}
                  </>}
              </button>
            </div>
          </footer>
        </form>
      </div>
    </div>, document.getElementById("modal-root") || document.body);
}
