import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import moment from "moment";
import { toast } from "react-toastify";
import { createEvent, updateEvent, deleteEvent } from "../../api/events";
import { fetchUsers } from "../../api/users";
import { formatPlanningDateTime, planningMoment } from "../../utils/planningDateTime";
import { syncSalesPmTaskFromPlanningEvent } from "../../utils/salesTaskPlanningEvent";
import API_BASE_URL from "../../config";
import { parseEventDescription, serializeEventDescription, getBusinessEndDate, getCalendarEndDate, getBusinessDaysCountInclusive, getCalendarDaysCountInclusive, getSlotDefaultTimes, loadPlanningClientsListCached, loadClientModulesCached, buildClientEquipmentLists, buildLinkableItems, buildLinkableItemsByGroup, findLinkableItemForEquipment, getLinkedTypeOptions } from "./planningEventFormShared";
function createDefaultEventForm(userId) {
  return {
    title: "",
    type: "intervention",
    startDate: moment().format("YYYY-MM-DD"),
    startTime: "09:00",
    endDate: moment().format("YYYY-MM-DD"),
    endTime: "12:00",
    allDay: false,
    businessDaysOnly: true,
    durationDays: 1,
    description: "",
    clientId: null,
    equipmentId: null,
    assignedUserId: userId || null
  };
}
function populateFormFromEvent(event, userId) {
  const rawEvent = event._rawData || event;
  const startMoment = planningMoment(rawEvent.start || event.start);
  const endMoment = planningMoment(rawEvent.end || event.end);
  const parsedDescription = parseEventDescription(rawEvent.description || event.description || "");
  const parsedMeta = parsedDescription.meta || {};
  const linkedItemsMeta = Array.isArray(parsedMeta.linkedItems) ? parsedMeta.linkedItems : [];
  const scheduleMeta = parsedMeta.schedule && typeof parsedMeta.schedule === "object" ? parsedMeta.schedule : null;
  const assignedUserIdsMeta = Array.isArray(parsedMeta.assignedUserIds) ? parsedMeta.assignedUserIds.map(id => String(id)).filter(Boolean) : [];
  const inferredAllDay = startMoment.format("HH:mm") === "00:00" && endMoment.format("HH:mm") === "23:59";
  const allDayValue = typeof scheduleMeta?.allDay === "boolean" ? scheduleMeta.allDay : inferredAllDay;
  const businessDaysOnlyValue = typeof scheduleMeta?.businessDaysOnly === "boolean" ? scheduleMeta.businessDaysOnly : true;
  const durationValue = Number(scheduleMeta?.durationDays) > 0 ? Math.floor(Number(scheduleMeta.durationDays)) : businessDaysOnlyValue ? getBusinessDaysCountInclusive(startMoment, endMoment) : getCalendarDaysCountInclusive(startMoment, endMoment);
  const clientId = rawEvent.client_id || event.clientId || null;
  const linkedFallback = rawEvent.equipment_id ? [String(rawEvent.equipment_id)] : [];
  return {
    eventForm: {
      title: rawEvent.title || event.title || "",
      type: rawEvent.type || event.resource || "intervention",
      startDate: startMoment.format("YYYY-MM-DD"),
      startTime: startMoment.format("HH:mm"),
      endDate: endMoment.format("YYYY-MM-DD"),
      endTime: endMoment.format("HH:mm"),
      allDay: allDayValue,
      businessDaysOnly: businessDaysOnlyValue,
      durationDays: durationValue,
      description: parsedDescription.text || "",
      clientId,
      equipmentId: rawEvent.equipment_id || event.equipmentId || null,
      assignedUserId: rawEvent.assigned_user_id || event.assignedUserId || userId || null
    },
    selectedAssignedUsers: assignedUserIdsMeta.length > 0 ? assignedUserIdsMeta : rawEvent.assigned_user_id || event.assignedUserId ? [String(rawEvent.assigned_user_id || event.assignedUserId)] : userId ? [String(userId)] : [],
    selectedLinkedItems: linkedItemsMeta.length > 0 ? linkedItemsMeta.map(item => String(item.id)).filter(Boolean) : linkedFallback,
    selectedClient: clientId ? String(clientId) : ""
  };
}
export function usePlanningEventFormModal({
  open,
  editingEvent,
  initialClientId = null,
  initialClientName = "",
  initialEquipmentId = null,
  initialEquipmentName = "",
  initialEquipmentType = "",
  onClose,
  onSaved,
  copy,
  currentUser
}) {
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [users, setUsers] = useState([]);
  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState("");
  const [peripherals, setPeripherals] = useState([]);
  const [cybersecurities, setCybersecurities] = useState([]);
  const [services, setServices] = useState([]);
  const [clientSearch, setClientSearch] = useState("");
  const [clientDropdownOpen, setClientDropdownOpen] = useState(false);
  const clientAutocompleteRef = useRef(null);
  const [selectedLinkedItems, setSelectedLinkedItems] = useState([]);
  const [linkedSearch, setLinkedSearch] = useState("");
  const [linkedTypeFilter, setLinkedTypeFilter] = useState("all");
  const [loadingLinkedItems, setLoadingLinkedItems] = useState(false);
  const [selectedAssignedUsers, setSelectedAssignedUsers] = useState(currentUser?.id ? [String(currentUser.id)] : []);
  const [assigneeSearch, setAssigneeSearch] = useState("");
  const [assigneeDropdownOpen, setAssigneeDropdownOpen] = useState(false);
  const assigneeSelectRef = useRef(null);
  const [equipmentMappings, setEquipmentMappings] = useState({});
  const [eventForm, setEventForm] = useState(() => createDefaultEventForm(currentUser?.id));
  const equipmentFetchedRef = useRef(new Set());
  const populateKeyRef = useRef(null);
  const initialLinkAppliedRef = useRef(false);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const usersList = await fetchUsers();
        if (!cancelled) setUsers(usersList);
      } catch (error) {
        console.error("Error while loading des utilisateurs:", error);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);
  useEffect(() => {
    if (!open) return undefined;
    let cancelled = false;
    const ac = new AbortController();
    (async () => {
      try {
        const clientsList = await loadPlanningClientsListCached({
          signal: ac.signal
        });
        if (cancelled) return;
        setClients(clientsList);
        if (initialClientId) {
          const idStr = String(initialClientId);
          const existing = clientsList.find(c => String(c.id) === idStr);
          if (!existing?.equipements || Object.keys(existing.equipements || {}).length === 0) {
            try {
              const mod = await loadClientModulesCached(initialClientId, {
                signal: ac.signal
              });
              if (cancelled || !mod) return;
              setClients(prev => prev.map(c => String(c.id) === idStr ? {
                ...c,
                equipements: mod.equipements || {},
                modules_monitoring: mod.modules_monitoring || c.modules_monitoring
              } : c));
            } catch (e) {
              if (e?.name !== "AbortError") console.error(e);
            }
          }
        }
      } catch (e) {
        if (e?.name !== "AbortError") console.error(e);
      }
    })();
    return () => {
      cancelled = true;
      ac.abort();
    };
  }, [open, initialClientId]);
  useEffect(() => {
    if (!open) {
      populateKeyRef.current = null;
      initialLinkAppliedRef.current = false;
      return;
    }
    const equipmentKey = initialEquipmentId ? String(initialEquipmentId) : "";
    const key = editingEvent?.id ? `edit:${editingEvent.id}` : `create:${initialClientId || ""}:${equipmentKey}`;
    if (populateKeyRef.current === key) return;
    populateKeyRef.current = key;
    initialLinkAppliedRef.current = false;
    if (editingEvent) {
      const populated = populateFormFromEvent(editingEvent, currentUser?.id);
      setEventForm(populated.eventForm);
      setSelectedAssignedUsers(populated.selectedAssignedUsers);
      setSelectedLinkedItems(populated.selectedLinkedItems);
      setSelectedClient(populated.selectedClient);
      const clientId = populated.eventForm.clientId;
      if (clientId) {
        const client = clients.find(c => String(c.id) === String(clientId));
        setClientSearch(client?.name || client?.nom || initialClientName || "");
      } else {
        setClientSearch("");
      }
    } else {
      const defaultForm = createDefaultEventForm(currentUser?.id);
      if (initialClientId) {
        const idStr = String(initialClientId);
        defaultForm.clientId = parseInt(idStr, 10) || idStr;
      }
      if (initialEquipmentId) {
        defaultForm.equipmentId = String(initialEquipmentId);
      }
      setEventForm(defaultForm);
      setSelectedAssignedUsers(currentUser?.id ? [String(currentUser.id)] : []);
      // Préselectionne tout de suite ; l’effet de matching affinera l’id linkable dès que la liste est dispo.
      setSelectedLinkedItems(initialEquipmentId ? [String(initialEquipmentId)] : []);
      setLinkedSearch("");
      setLinkedTypeFilter("all");
      setAssigneeSearch("");
      setAssigneeDropdownOpen(false);
      if (initialClientId) {
        const idStr = String(initialClientId);
        setSelectedClient(idStr);
        const client = clients.find(c => String(c.id) === idStr);
        setClientSearch(client?.name || client?.nom || initialClientName || "");
      } else {
        setSelectedClient("");
        setClientSearch("");
      }
    }
  }, [open, editingEvent, initialClientId, initialClientName, initialEquipmentId, currentUser?.id, clients]);
  useEffect(() => {
    if (!open) return;
    const clientId = editingEvent ? editingEvent.client_id || editingEvent.clientId : initialClientId;
    if (!clientId) return;
    const client = clients.find(c => String(c.id) === String(clientId));
    if (client) {
      setClientSearch(client.name || client.nom || initialClientName || "");
      if (!editingEvent) {
        setSelectedClient(String(clientId));
      }
    }
  }, [open, editingEvent, initialClientId, initialClientName, clients]);
  useEffect(() => {
    if (!open || !selectedClient) return;
    const idStr = String(selectedClient);
    const client = clients.find(c => String(c.id) === idStr);
    if (!client) return;
    const eq = client.equipements;
    if (eq && typeof eq === "object" && Object.keys(eq).length > 0) return;
    if (equipmentFetchedRef.current.has(idStr)) return;
    let cancelled = false;
    const ac = new AbortController();
    (async () => {
      try {
        const mod = await loadClientModulesCached(client.id, {
          signal: ac.signal
        });
        if (cancelled) return;
        equipmentFetchedRef.current.add(idStr);
        if (!mod) return;
        setClients(prev => prev.map(c => String(c.id) === String(client.id) ? {
          ...c,
          equipements: mod.equipements || {},
          modules_monitoring: mod.modules_monitoring || c.modules_monitoring
        } : c));
      } catch (e) {
        if (e?.name !== "AbortError") console.error(e);
      }
    })();
    return () => {
      cancelled = true;
      ac.abort();
    };
  }, [selectedClient, clients, open]);
  useEffect(() => {
    if (!selectedClient) {
      setEquipmentMappings({});
      return;
    }
    const client = clients.find(c => String(c.id) === String(selectedClient));
    if (!client) return;
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/checkmk/mapping/${client.id}`, {
          credentials: "include"
        });
        if (cancelled) return;
        if (response.ok) {
          const mappings = await response.json();
          const mappingsMap = {};
          mappings.forEach(m => {
            mappingsMap[`${m.equipment_type}-${m.equipment_name}`] = m;
          });
          setEquipmentMappings(mappingsMap);
        } else {
          setEquipmentMappings({});
        }
      } catch (error) {
        if (!cancelled) {
          console.error("Error while loading des mappings:", error);
          setEquipmentMappings({});
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedClient, clients]);
  useEffect(() => {
    if (!selectedClient) {
      setPeripherals([]);
      setCybersecurities([]);
      setServices([]);
      return;
    }
    const client = clients.find(c => String(c.id) === String(selectedClient));
    if (!client) {
      setPeripherals([]);
      setCybersecurities([]);
      setServices([]);
      return;
    }
    const lists = buildClientEquipmentLists(client, equipmentMappings);
    setPeripherals(lists.peripherals);
    setCybersecurities(lists.cybersecurities);
    setServices(lists.services);
  }, [selectedClient, clients, equipmentMappings]);
  useEffect(() => {
    if (!open) {
      setLoadingLinkedItems(false);
      return;
    }
    if (!selectedClient) {
      setLoadingLinkedItems(false);
      return;
    }
    const client = clients.find(c => String(c.id) === String(selectedClient));
    if (!client) {
      setLoadingLinkedItems(true);
      return;
    }
    const eq = client.equipements;
    const hasEquipments = eq && typeof eq === "object" && Object.keys(eq).length > 0;
    setLoadingLinkedItems(!hasEquipments);
  }, [selectedClient, clients, open]);
  useEffect(() => {
    const handleClickOutside = e => {
      const inClientPortal = e.target.closest("[data-planning-client-dropdown]");
      if (clientAutocompleteRef.current && !clientAutocompleteRef.current.contains(e.target) && !inClientPortal) {
        setClientDropdownOpen(false);
      }
      const inAssigneePortal = e.target.closest("[data-planning-assignee-dropdown]");
      if (assigneeSelectRef.current && !assigneeSelectRef.current.contains(e.target) && !inAssigneePortal) {
        setAssigneeDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  const handleInputChange = useCallback((field, value) => {
    setEventForm(prev => ({
      ...prev,
      [field]: value
    }));
  }, []);
  const handleClientChange = useCallback(clientId => {
    setSelectedClient(clientId);
    setEventForm(prev => ({
      ...prev,
      clientId: clientId ? parseInt(clientId, 10) : null,
      equipmentId: null
    }));
    setSelectedLinkedItems([]);
  }, []);
  const filteredClientOptions = useMemo(() => {
    const query = clientSearch.trim().toLowerCase();
    if (!query) return clients;
    return clients.filter(c => (c.name || c.nom || "").toLowerCase().includes(query));
  }, [clients, clientSearch]);
  const filteredAssigneeOptions = useMemo(() => {
    const query = assigneeSearch.trim().toLowerCase();
    if (!query) return users;
    return users.filter(u => {
      const label = (u.name || u.nom || u.username || u.email || "").toLowerCase();
      return label.includes(query);
    });
  }, [users, assigneeSearch]);
  const linkableItems = useMemo(() => buildLinkableItems(peripherals, cybersecurities, services), [peripherals, cybersecurities, services]);
  const linkedTypeOptions = useMemo(() => getLinkedTypeOptions(linkableItems, copy?.locale || "fr"), [linkableItems, copy?.locale]);
  const linkedTypeButtons = useMemo(() => copy?.linkedTypeButtons ? copy.linkedTypeButtons(linkedTypeOptions) : [], [copy, linkedTypeOptions]);
  const linkableItemsByGroup = useMemo(() => buildLinkableItemsByGroup(linkableItems, linkedSearch, linkedTypeFilter, copy?.locale || "fr"), [linkableItems, linkedSearch, linkedTypeFilter, copy?.locale]);
  useEffect(() => {
    if (!open || editingEvent || !initialEquipmentId) return;
    if (loadingLinkedItems) return;
    if (linkableItems.length === 0) return;
    const eqId = String(initialEquipmentId);
    const typeRaw = initialEquipmentType || "";
    const nameRaw = initialEquipmentName || "";
    const idCandidates = [eqId];
    if (typeRaw && nameRaw) {
      idCandidates.push(`${typeRaw}-${nameRaw}`);
      // Alias FR/EN fréquents (Serveurs/Servers, NAS/Stockage…)
      const typeAliases = [
        typeRaw,
        typeRaw === "Servers" ? "Serveurs" : null,
        typeRaw === "Serveurs" ? "Servers" : null,
        typeRaw === "NAS" ? "Stockage" : null,
        typeRaw === "Stockage" ? "NAS" : null,
        typeRaw === "Storage" ? "NAS" : null
      ].filter(Boolean);
      typeAliases.forEach(t => idCandidates.push(`${t}-${nameRaw}`));
    }
    const matchedItem = findLinkableItemForEquipment(linkableItems, {
      id: [...new Set(idCandidates)],
      name: nameRaw || null,
      type: typeRaw || null
    });
    if (!matchedItem) {
      // Liste chargée mais pas encore résolu : on garde le badge via l’id source,
      // sans figer le matching (réessai si la liste / le nom évolue).
      setSelectedLinkedItems(prev => {
        const hasResolved = prev.some(id =>
          linkableItems.some(
            item =>
              String(item.id) === String(id) ||
              (Array.isArray(item.aliasIds) && item.aliasIds.some(a => String(a) === String(id)))
          )
        );
        if (hasResolved) return prev;
        return prev.includes(eqId) ? prev : [eqId];
      });
      return;
    }
    const matchedId = String(matchedItem.id);
    setSelectedLinkedItems(prev => (prev.length === 1 && prev[0] === matchedId ? prev : [matchedId]));
    setEventForm(prev =>
      String(prev.equipmentId || "") === matchedId
        ? prev
        : {
            ...prev,
            equipmentId: matchedId
          }
    );
    initialLinkAppliedRef.current = true;
  }, [
    open,
    editingEvent,
    initialEquipmentId,
    initialEquipmentName,
    initialEquipmentType,
    linkableItems,
    loadingLinkedItems
  ]);
  const toggleLinkedItem = useCallback(
    itemId => {
      const target = String(itemId);
      const item = linkableItems.find(entry => String(entry.id) === target);
      const related = new Set([
        target,
        ...(Array.isArray(item?.aliasIds) ? item.aliasIds.map(String) : [])
      ]);
      setSelectedLinkedItems(prev => {
        const exists = prev.some(id => related.has(String(id)));
        if (exists) return prev.filter(id => !related.has(String(id)));
        return [...prev, target];
      });
    },
    [linkableItems]
  );
  const resetForm = useCallback(() => {
    setEventForm(createDefaultEventForm(currentUser?.id));
    setSelectedClient("");
    setSelectedAssignedUsers(currentUser?.id ? [String(currentUser.id)] : []);
    setSelectedLinkedItems([]);
    setClientSearch("");
      setClientDropdownOpen(false);
      setLinkedSearch("");
      setLinkedTypeFilter("all");
      setAssigneeSearch("");
      setAssigneeDropdownOpen(false);
      populateKeyRef.current = null;
  }, [currentUser?.id]);
  const handleClose = useCallback(() => {
    resetForm();
    onClose?.();
  }, [onClose, resetForm]);
  const handleSubmit = useCallback(async e => {
    e.preventDefault();
    if (!copy) return;
    if (!eventForm.title.trim()) {
      toast.error(copy.toasts.titleRequired);
      return;
    }
    if (!Array.isArray(selectedAssignedUsers) || selectedAssignedUsers.length === 0) {
      toast.error(copy.toasts.assigneeRequired);
      return;
    }
    if (!eventForm.startDate || !eventForm.endDate) {
      toast.error(copy.toasts.datesRequired);
      return;
    }
    const isAllDay = !!eventForm.allDay;
    const safeDurationDays = Math.max(1, Number(eventForm.durationDays) || 1);
    const startMomentValue = isAllDay ? moment(eventForm.startDate).startOf("day") : moment(`${eventForm.startDate} ${eventForm.startTime}`, "YYYY-MM-DD HH:mm");
    const endMomentValue = isAllDay ? (eventForm.businessDaysOnly ? getBusinessEndDate(eventForm.startDate, safeDurationDays) : getCalendarEndDate(eventForm.startDate, safeDurationDays)).endOf("day") : moment(`${eventForm.endDate} ${eventForm.endTime}`, "YYYY-MM-DD HH:mm");
    if (!startMomentValue.isValid() || !endMomentValue.isValid()) {
      toast.error(copy.toasts.invalidDates);
      return;
    }
    if (!endMomentValue.isAfter(startMomentValue)) {
      toast.error(copy.toasts.endBeforeStart);
      return;
    }
    setSaving(true);
    try {
      const linkedItemsPayload = selectedLinkedItems.map(id => linkableItems.find(item => String(item.id) === String(id))).filter(Boolean);
      const primaryEquipmentId = selectedLinkedItems.length > 0 ? String(selectedLinkedItems[0]) : eventForm.equipmentId && String(eventForm.equipmentId).trim() !== "" ? String(eventForm.equipmentId).trim() : null;
      const existingMeta = parseEventDescription(editingEvent?._rawData?.description || editingEvent?.description || "").meta || {};
      const descriptionValue = serializeEventDescription(eventForm.description, {
        ...existingMeta,
        linkedItems: linkedItemsPayload,
        assignedUserIds: selectedAssignedUsers,
        schedule: {
          allDay: isAllDay,
          businessDaysOnly: !!eventForm.businessDaysOnly,
          durationDays: safeDurationDays
        },
        todosEnabled: false,
        todosAssignEnabled: false,
        todos: []
      });
      const eventData = {
        title: eventForm.title.trim(),
        type: eventForm.type,
        start: formatPlanningDateTime(startMomentValue),
        end: formatPlanningDateTime(endMomentValue),
        description: descriptionValue,
        clientId: eventForm.clientId || null,
        equipmentId: primaryEquipmentId,
        assignedUserId: selectedAssignedUsers.length > 0 ? selectedAssignedUsers[0] : eventForm.assignedUserId || null
      };
      if (editingEvent) {
        await updateEvent(editingEvent.id, eventData);
        if (existingMeta.salesPmTask && existingMeta.ticketId && existingMeta.pmTaskId) {
          const equipmentLabel =
            linkedItemsPayload.find(item => String(item.id) === String(primaryEquipmentId))?.name ||
            linkedItemsPayload.find(item => String(item.id) === String(primaryEquipmentId))?.label ||
            null;
          await syncSalesPmTaskFromPlanningEvent({
            ticketId: existingMeta.ticketId,
            pmTaskId: existingMeta.pmTaskId,
            equipmentId: primaryEquipmentId,
            equipmentLabel,
            title: eventData.title,
            assignedUserId: eventData.assignedUserId,
            assignedUserIds: selectedAssignedUsers,
            start: eventData.start,
            end: eventData.end
          }).catch(() => null);
        }
        toast.success(copy.toasts.updated);
      } else {
        await createEvent(eventData);
        toast.success(copy.toasts.created);
      }
      resetForm();
      onSaved?.();
      onClose?.();
    } catch (error) {
      console.error("Error enregistrement événement:", error);
      toast.error(error.message || (editingEvent ? copy.toasts.updateError : copy.toasts.createError));
    } finally {
      setSaving(false);
    }
  }, [copy, eventForm, selectedAssignedUsers, selectedLinkedItems, linkableItems, editingEvent, onSaved, onClose, resetForm]);
  const handleDelete = useCallback(async () => {
    if (!editingEvent || !copy) return;
    if (!window.confirm(copy.deleteEvent.confirm)) return;
    setDeleting(true);
    try {
      await deleteEvent(editingEvent.id);
      toast.success(copy.deleteEvent.success);
      resetForm();
      onSaved?.();
      onClose?.();
    } catch (error) {
      console.error("Error suppression événement:", error);
      toast.error(error.message || copy.deleteEvent.error);
    } finally {
      setDeleting(false);
    }
  }, [editingEvent, copy, onSaved, onClose, resetForm]);
  return {
    saving,
    deleting,
    eventForm,
    handleInputChange,
    planningTypes: copy?.planningTypes || [],
    clientSearch,
    setClientSearch,
    clientDropdownOpen,
    setClientDropdownOpen,
    clientAutocompleteRef,
    filteredClientOptions,
    selectedClient,
    onClientChange: handleClientChange,
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
    getCalendarEndDate,
    handleSubmit,
    handleDelete,
    handleClose,
    getSlotDefaultTimes
  };
}
