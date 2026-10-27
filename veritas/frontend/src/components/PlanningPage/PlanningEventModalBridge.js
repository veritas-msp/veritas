import { useMemo } from "react";
import { useAuthContext } from "../../contexts/AuthContext";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import PlanningEventFormModal from "./PlanningEventFormModal";
import { getPlanningEventFormCopy } from "./planningEventFormI18n";
import { usePlanningEventFormModal } from "./usePlanningEventFormModal";
import { usePlanningEventTypes } from "./usePlanningEventTypes";
export default function PlanningEventModalBridge({
  open,
  editingEvent = null,
  initialClientId = null,
  initialClientName = "",
  initialEquipmentId = null,
  initialEquipmentName = "",
  initialEquipmentType = "",
  onClose,
  onSaved
}) {
  const {
    user
  } = useAuthContext();
  const locale = useAppLocale();
  const catalogTypes = usePlanningEventTypes();
  const copy = useMemo(() => getPlanningEventFormCopy(locale, catalogTypes), [locale, catalogTypes]);
  const modalState = usePlanningEventFormModal({
    open,
    editingEvent,
    initialClientId,
    initialClientName,
    initialEquipmentId,
    initialEquipmentName,
    initialEquipmentType,
    onClose,
    onSaved,
    copy,
    currentUser: user
  });
  return <PlanningEventFormModal open={open} editingEvent={editingEvent} copy={copy} saving={modalState.saving} deleting={modalState.deleting} onClose={modalState.handleClose} onSubmit={modalState.handleSubmit} onDelete={modalState.handleDelete} eventForm={modalState.eventForm} onInputChange={modalState.handleInputChange} planningTypes={modalState.planningTypes} clientSearch={modalState.clientSearch} setClientSearch={modalState.setClientSearch} clientDropdownOpen={modalState.clientDropdownOpen} setClientDropdownOpen={modalState.setClientDropdownOpen} clientAutocompleteRef={modalState.clientAutocompleteRef} filteredClientOptions={modalState.filteredClientOptions} selectedClient={modalState.selectedClient} onClientChange={modalState.onClientChange} users={modalState.users} currentUser={modalState.currentUser} selectedAssignedUsers={modalState.selectedAssignedUsers} setSelectedAssignedUsers={modalState.setSelectedAssignedUsers} assigneeSearch={modalState.assigneeSearch} setAssigneeSearch={modalState.setAssigneeSearch} assigneeDropdownOpen={modalState.assigneeDropdownOpen} setAssigneeDropdownOpen={modalState.setAssigneeDropdownOpen} assigneeSelectRef={modalState.assigneeSelectRef} filteredAssigneeOptions={modalState.filteredAssigneeOptions} selectedLinkedItems={modalState.selectedLinkedItems} toggleLinkedItem={modalState.toggleLinkedItem} linkableItems={modalState.linkableItems} linkableItemsByGroup={modalState.linkableItemsByGroup} linkedSearch={modalState.linkedSearch} setLinkedSearch={modalState.setLinkedSearch} linkedTypeFilter={modalState.linkedTypeFilter} setLinkedTypeFilter={modalState.setLinkedTypeFilter} linkedTypeButtons={modalState.linkedTypeButtons} loadingLinkedItems={modalState.loadingLinkedItems} getBusinessEndDate={modalState.getBusinessEndDate} getCalendarEndDate={modalState.getCalendarEndDate} />;
}
