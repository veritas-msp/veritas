import { useState, useEffect, useLayoutEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";
import { UiKitButton, UiKitModalNavSectionButton, uiKitLayoutsStyles as kit, useFinderNavIndicator } from "../UiKit";
import layout from "../EnterprisesPage/EnterpriseFormModal.module.css";
import eventStyles from "./PlanningEventFormModal.module.css";
import NumberStepperInput from "../Misc/NumberStepperInput/NumberStepperInput";
import { getLinkedItemIcon } from "./planningEventFormConfig";

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
  getBusinessEndDate,
  getCalendarEndDate
}) {
  const [activeSection, setActiveSection] = useState("general");
  const { trackRef: navTrackRef, indicator: navIndicator } = useFinderNavIndicator([activeSection, open]);
  const isEditing = Boolean(editingEvent);
  const clientDropdownStyle = useFixedDropdownPosition(clientDropdownOpen, clientAutocompleteRef);
  const assigneeDropdownStyle = useFixedDropdownPosition(assigneeDropdownOpen, assigneeSelectRef);
  useEffect(() => {
    if (!open) return;
    setActiveSection("general");
  }, [open]);
  const visiblePlanningTypes = useMemo(() => {
    const list = planningTypes || [];
    const current = eventForm?.type;
    return list.filter(t => t.formSelectable !== false && t.value !== "campagne" || current && t.value === current);
  }, [planningTypes, eventForm?.type]);
  const sectionBadges = useMemo(() => ({
    objects: selectedLinkedItems?.length || 0
  }), [selectedLinkedItems]);
  const sectionMeta = useMemo(() => ({
    general: Boolean(eventForm?.title?.trim() || eventForm?.clientId),
    schedule: Boolean(eventForm?.startDate && eventForm?.endDate && selectedAssignedUsers?.length > 0),
    objects: (selectedLinkedItems?.length || 0) > 0
  }), [eventForm, selectedAssignedUsers, selectedLinkedItems]);
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
    return (
      <div className={`${layout.sectionHead} ${layout.sectionPinned}`}>
        <h3 className={layout.sectionTitle}>{section.label}</h3>
        <p className={layout.sectionDesc}>{section.description}</p>
      </div>
    );
  };
  const wrapSection = (sectionId, body) => (
    <div className={layout.sectionFill}>
      {renderSectionHead(sectionId)}
      <div className={layout.sectionScroll}>{body}</div>
    </div>
  );
  const renderSectionContent = () => {
    switch (activeSection) {
      case "general":
        return wrapSection(
          "general",
          <div className={layout.fieldStack}>
            <div className={`${layout.field} ${layout.fieldFull}`}>
              <span className={layout.label}>{copy.fields.eventType}</span>
              <div className={eventStyles.typeGrid}>
                {visiblePlanningTypes.map(type => (
                  <button
                    key={type.value}
                    type="button"
                    className={`${eventStyles.typeBtn} ${eventForm.type === type.value ? eventStyles.typeBtnActive : ""}`}
                    onClick={() => onInputChange("type", type.value)}
                    aria-pressed={eventForm.type === type.value}
                  >
                    <Icon icon={type.icon} className={eventStyles.typeBtnIcon} aria-hidden />
                    <span className={eventStyles.typeBtnLabel}>{type.label}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className={`${layout.field} ${layout.fieldFull}`}>
              <label className={`${layout.label} ${layout.labelRequired}`} htmlFor="planning-event-title">
                {copy.fields.title}
              </label>
              <input
                id="planning-event-title"
                type="text"
                className={layout.input}
                value={eventForm.title || ""}
                onChange={e => onInputChange("title", e.target.value)}
                placeholder={copy.fields.titlePlaceholder}
                required
                autoFocus={!isEditing}
              />
            </div>
            <div className={`${layout.field} ${layout.fieldFull}`}>
              <label className={layout.label} htmlFor="planning-event-client">
                {copy.fields.client}
              </label>
              <div className={eventStyles.autocompleteWrapper} ref={clientAutocompleteRef}>
                <input
                  id="planning-event-client"
                  type="text"
                  className={layout.input}
                  placeholder={copy.fields.clientSearch}
                  value={clientSearch}
                  onFocus={() => setClientDropdownOpen(true)}
                  onChange={e => {
                    setClientSearch(e.target.value);
                    setClientDropdownOpen(true);
                    if (!e.target.value.trim()) onClientChange("");
                  }}
                  autoComplete="off"
                />
                <ClientAutocompleteDropdown
                  isOpen={clientDropdownOpen}
                  style={clientDropdownStyle}
                  filteredClientOptions={filteredClientOptions}
                  selectedClient={selectedClient}
                  onClientChange={onClientChange}
                  setClientSearch={setClientSearch}
                  setClientDropdownOpen={setClientDropdownOpen}
                  copy={copy}
                />
              </div>
            </div>
          </div>
        );
      case "schedule":
        return wrapSection(
          "schedule",
          <div className={layout.fieldStack}>
            <div className={`${layout.field} ${layout.fieldFull}`}>
              <span className={`${layout.label} ${layout.labelRequired}`}>
                {copy.fields.agents}
              </span>
              <div className={eventStyles.assigneePicker} ref={assigneeSelectRef}>
                <button type="button" className={eventStyles.assigneePickerButton} onClick={() => setAssigneeDropdownOpen(prev => !prev)}>
                  {selectedAssignedUsers.length > 0 ? (
                    <span className={eventStyles.assigneeInlineTags}>
                      {selectedAssignedUsers.map(uid => {
                        const u = users.find(item => String(item.id) === String(uid));
                        if (!u) return null;
                        const displayName = u.name || u.nom || u.username || u.email;
                        return (
                          <span key={uid} className={eventStyles.assigneeTag}>
                            {displayName}
                          </span>
                        );
                      })}
                    </span>
                  ) : (
                    <span className={eventStyles.assigneePlaceholder}>
                      {copy.fields.agentsPlaceholder}
                    </span>
                  )}
                </button>
                <AssigneeAutocompleteDropdown
                  isOpen={assigneeDropdownOpen}
                  style={assigneeDropdownStyle}
                  assigneeSearch={assigneeSearch}
                  setAssigneeSearch={setAssigneeSearch}
                  filteredAssigneeOptions={filteredAssigneeOptions}
                  selectedAssignedUsers={selectedAssignedUsers}
                  setSelectedAssignedUsers={setSelectedAssignedUsers}
                  currentUser={currentUser}
                  copy={copy}
                />
              </div>
              {selectedAssignedUsers.length === 0 ? (
                <p className={eventStyles.helperText}>{copy.fields.agentsRequired}</p>
              ) : null}
            </div>

            <div className={layout.fieldGrid2}>
              <div className={layout.field}>
                <label className={`${layout.label} ${layout.labelRequired}`} htmlFor="planning-event-start-date">
                  {copy.fields.startDate}
                </label>
                <input
                  id="planning-event-start-date"
                  type="date"
                  className={layout.input}
                  value={eventForm.startDate || ""}
                  onChange={e => onInputChange("startDate", e.target.value)}
                  required
                />
              </div>
              {!eventForm.allDay ? (
                <div className={layout.field}>
                  <label className={`${layout.label} ${layout.labelRequired}`} htmlFor="planning-event-start-time">
                    {copy.fields.startTime}
                  </label>
                  <input
                    id="planning-event-start-time"
                    type="time"
                    className={layout.input}
                    value={eventForm.startTime || ""}
                    onChange={e => onInputChange("startTime", e.target.value)}
                    required
                  />
                </div>
              ) : null}
            </div>

            <div className={layout.fieldGrid2}>
              <div className={layout.field}>
                <label className={`${layout.label} ${layout.labelRequired}`} htmlFor="planning-event-end-date">
                  {copy.fields.endDate}
                </label>
                <input
                  id="planning-event-end-date"
                  type="date"
                  className={layout.input}
                  value={
                    eventForm.allDay
                      ? (eventForm.businessDaysOnly
                          ? getBusinessEndDate(eventForm.startDate, Math.max(1, Number(eventForm.durationDays) || 1))
                          : getCalendarEndDate(eventForm.startDate, Math.max(1, Number(eventForm.durationDays) || 1))
                        ).format("YYYY-MM-DD")
                      : eventForm.endDate || ""
                  }
                  onChange={e => {
                    if (eventForm.allDay) return;
                    onInputChange("endDate", e.target.value);
                  }}
                  disabled={eventForm.allDay}
                  required
                />
              </div>
              {eventForm.allDay ? (
                <div className={layout.field}>
                  <label className={`${layout.label} ${layout.labelRequired}`} htmlFor="planning-event-duration">
                    {copy.fields.durationDays}
                  </label>
                  <NumberStepperInput
                    id="planning-event-duration"
                    value={eventForm.durationDays || 1}
                    inputClassName={layout.input}
                    min={1}
                    increaseAriaLabel={copy.fields.durationIncrease}
                    decreaseAriaLabel={copy.fields.durationDecrease}
                    onChange={next =>
                      onInputChange("durationDays", typeof next === "number" ? next : Math.max(1, Number(next) || 1))
                    }
                    required
                  />
                </div>
              ) : (
                <div className={layout.field}>
                  <label className={`${layout.label} ${layout.labelRequired}`} htmlFor="planning-event-end-time">
                    {copy.fields.endTime}
                  </label>
                  <input
                    id="planning-event-end-time"
                    type="time"
                    className={layout.input}
                    value={eventForm.endTime || ""}
                    onChange={e => onInputChange("endTime", e.target.value)}
                    required
                  />
                </div>
              )}
            </div>

            <div className={eventStyles.switchRow}>
              <span className={eventStyles.switchLabel}>{copy.fields.allDayLabel}</span>
              <label className={eventStyles.switchControl}>
                <input type="checkbox" checked={!!eventForm.allDay} onChange={e => handleAllDayChange(e.target.checked)} />
                <span className={eventStyles.switchSlider} />
              </label>
            </div>
            {eventForm.allDay ? (
              <div className={eventStyles.switchRow}>
                <span className={eventStyles.switchLabel}>{copy.fields.businessDaysOnly}</span>
                <label className={eventStyles.switchControl}>
                  <input
                    type="checkbox"
                    checked={!!eventForm.businessDaysOnly}
                    onChange={e => onInputChange("businessDaysOnly", e.target.checked)}
                  />
                  <span className={eventStyles.switchSlider} />
                </label>
              </div>
            ) : null}
          </div>
        );
      case "objects":
        return wrapSection(
          "objects",
          !selectedClient ? (
            <p className={eventStyles.helperText}>{copy.fields.selectClientFirst}</p>
          ) : loadingLinkedItems ? (
            <div className={eventStyles.linkedLoader}>
              <span className={eventStyles.loaderSpinner} aria-hidden />
              <span>{copy.fields.loadingLinkedItems}</span>
            </div>
          ) : linkableItems.length === 0 ? (
            <p className={eventStyles.helperText}>{copy.fields.noLinkedItems}</p>
          ) : (
            <>
              <div className={eventStyles.objectsToolbar}>
                <input
                  type="text"
                  className={layout.input}
                  value={linkedSearch}
                  onChange={e => setLinkedSearch(e.target.value)}
                  placeholder={copy.fields.linkedSearchExtended}
                />
                <div className={eventStyles.objectTypeButtons}>
                  {linkedTypeButtons.map(typeBtn => (
                    <button
                      key={typeBtn.key}
                      type="button"
                      className={`${eventStyles.objectTypeButton} ${
                        linkedTypeFilter === typeBtn.key ? eventStyles.objectTypeButtonActive : ""
                      }`}
                      onClick={() => setLinkedTypeFilter(typeBtn.key)}
                      title={typeBtn.label}
                    >
                      <Icon icon={typeBtn.icon} aria-hidden />
                      <span>{typeBtn.label}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className={eventStyles.objectList}>
                {Object.entries(linkableItemsByGroup).flatMap(([groupName, items]) =>
                  items.map(item => {
                    const itemId = String(item.id);
                    const checked = selectedLinkedItems.includes(itemId);
                    return (
                      <label key={`${groupName}-${itemId}`} className={eventStyles.objectRow}>
                        <input type="checkbox" checked={checked} onChange={() => toggleLinkedItem(itemId)} />
                        <span className={eventStyles.objectRowIcon}>
                          <Icon icon={getLinkedItemIcon(item)} aria-hidden />
                        </span>
                        <span className={eventStyles.objectRowLabel}>{item.label}</span>
                        <span className={eventStyles.objectRowType}>{item.type}</span>
                        <span className={eventStyles.objectRowGroup}>{groupName}</span>
                      </label>
                    );
                  })
                )}
              </div>
              {Object.keys(linkableItemsByGroup).length === 0 ? (
                <p className={eventStyles.helperText}>{copy.fields.noLinkedFilterMatch}</p>
              ) : null}
            </>
          )
        );
      default:
        return null;
    }
  };
  return createPortal(
    <div className={layout.overlay} onClick={saving || deleting ? undefined : onClose} role="presentation">
      <div
        className={layout.shell}
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="planning-event-form-modal-title"
      >
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
          <UiKitButton
            type="button"
            square
            variant="secondary"
            className={layout.closeBtn}
            onClick={onClose}
            disabled={saving || deleting}
            aria-label={copy.close}
            icon="mdi:close"
          />
        </header>

        <form
          className={eventStyles.form}
          onSubmit={e => {
            e.preventDefault();
            onSubmit?.(e);
          }}
        >
          <div className={layout.body}>
            <aside className={`${kit.finderSidebar} ${layout.modalNav}`} aria-label={copy.sectionsAria}>
              <nav
                ref={navTrackRef}
                className={`${kit.finderPrimary} ${kit.finderPrimaryAnimated} ${layout.modalNavTrack}`}
              >
                {navIndicator.ready ? (
                  <div
                    className={kit.finderNavIndicator}
                    style={{
                      transform: `translate3d(0, ${navIndicator.top}px, 0)`,
                      height: navIndicator.height
                    }}
                    aria-hidden
                  />
                ) : null}
                {formSections.map(section => (
                  <UiKitModalNavSectionButton
                    key={section.id}
                    section={section}
                    active={activeSection === section.id}
                    badge={
                      section.id === "objects" && sectionBadges.objects > 0
                        ? String(sectionBadges.objects)
                        : section.id !== "objects" && sectionMeta[section.id]
                          ? "✓"
                          : null
                    }
                    onSelect={() => setActiveSection(section.id)}
                    finderItemClass={kit.finderItem}
                    finderItemActiveClass={kit.finderItemActive}
                    finderItemIconClass={kit.finderItemIcon}
                    finderItemLabelClass={kit.finderItemLabel}
                    navBadgeClass={layout.navBadge}
                    navBadgeSlotClass={layout.navBadgeSlot}
                  />
                ))}
              </nav>
            </aside>

            <div className={layout.content} key={activeSection}>
              <div className={kit.contentFadeUp}>{renderSectionContent()}</div>
            </div>
          </div>

          <footer className={`${layout.footer} ${eventStyles.footer}`}>
            {isEditing ? (
              <UiKitButton
                type="button"
                variant="ghost"
                className={`${layout.footerDeleteBtn} ${eventStyles.deleteBtn}`}
                onClick={() => onDelete?.()}
                disabled={saving || deleting}
                icon="mdi:delete-outline"
              >
                {deleting ? copy.deleting : copy.delete}
              </UiKitButton>
            ) : null}
            <span className={layout.footerHint}>{copy.requiredHint}</span>
            <div className={layout.footerActions}>
              <UiKitButton type="button" variant="secondary" onClick={onClose} disabled={saving || deleting}>
                {copy.cancel}
              </UiKitButton>
              <UiKitButton
                type="submit"
                variant="primary"
                disabled={saving || deleting}
                icon={saving ? undefined : isEditing ? "mdi:content-save-outline" : "mdi:check"}
              >
                {saving ? (
                  <>
                    <Icon icon="mdi:loading" className={layout.spinning} aria-hidden />
                    {copy.saving}
                  </>
                ) : isEditing ? (
                  copy.save
                ) : (
                  copy.create
                )}
              </UiKitButton>
            </div>
          </footer>
        </form>
      </div>
    </div>,
    document.getElementById("modal-root") || document.body
  );
}
