import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";
import { FaTimes } from "react-icons/fa";
import { toast } from "react-toastify";
import { DndContext, DragOverlay, KeyboardSensor, PointerSensor, closestCenter, pointerWithin, rectIntersection, useSensor, useSensors } from "@dnd-kit/core";
import { arrayMove, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { createSalesForm, createSalesFormField, deleteSalesFormField, updateSalesForm, updateSalesFormField } from "../../api/tickets";
import { fetchClientsList, fetchContactsList } from "../../api/clients";
import { fetchUsers } from "../../api/users";
import { fetchTeams } from "../../api/teams";
import API_BASE_URL from "../../config";
import layout from "../EnterprisesPage/EnterpriseFormModal.module.css";
import pageLayout from "../EnterprisesPage/EnterprisesPage.module.css";
import IconPicker, { SALES_FORM_ICON_CHOICES } from "./IconPicker";
import modalStyles from "./SalesFormModal.module.css";
import MultiSuggestPicker from "./MultiSuggestPicker";
import SalesFormTargetRulesEditor, { createEmptyTargetRule, normalizeTicketTargetsDraft, serializeTicketTargetsDraft } from "./SalesFormTargetRulesEditor";
import builderStyles from "./SalesFormBuilder.module.css";
import SalesFormFieldPalette, { PALETTE_FIELD_TYPES } from "./SalesFormFieldPalette";
import SalesFormBuilderCanvas from "./SalesFormBuilderCanvas";
import SalesFormFieldPropertiesPanel from "./SalesFormFieldPropertiesPanel";
import SalesFormFieldsRenderer from "../TicketPage/SalesFormFieldsRenderer";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { useCommonCopy } from "../../hooks/useCommonCopy";
import { interpolate } from "../../i18n/translate";
import { ConfirmModal } from "./AdminUi";
import { getAdminDeleteConfirmsCopy } from "./adminModalsI18n";
const VISIBILITY_OPTIONS = [{
  value: "public",
  label: "All agents",
  hint: "Visible to everyone"
}, {
  value: "assigned",
  label: "Restricted",
  hint: "Profiles, agents or teams"
}];
const BUILDER_MODES = [{
  id: "builder",
  label: "Builder",
  icon: "mdi:cursor-move"
}, {
  id: "preview",
  label: "Preview",
  icon: "mdi:eye-outline"
}, {
  id: "rules",
  label: "Ticket rules",
  icon: "mdi:gavel"
}, {
  id: "settings",
  label: "Settings",
  icon: "mdi:cog-outline"
}];
const EMPTY_TICKET_TARGETS = {
  version: 2,
  rules: []
};
const EMPTY_FORM = {
  kind: "prestation",
  key: "",
  label: "",
  icon: "mdi:file-document-outline",
  categorySlug: "",
  description: "",
  displayOrder: 0,
  enabled: true,
  visibility: "public",
  profileNames: [],
  userIds: [],
  teamIds: [],
  ticketTargets: {
    ...EMPTY_TICKET_TARGETS
  }
};
const EMPTY_FIELD = {
  fieldKey: "",
  label: "",
  fieldType: "text",
  required: false,
  placeholder: "",
  optionsText: "",
  displayOrder: 0,
  enabled: true,
  visibilityMatchMode: "all",
  visibilityConditions: []
};
function fieldToDraft(field) {
  if (!field) return {
    ...EMPTY_FIELD
  };
  return {
    fieldKey: field.fieldKey || "",
    label: field.label || "",
    fieldType: field.fieldType || "text",
    required: field.required === true,
    placeholder: field.placeholder || "",
    optionsText: Array.isArray(field.options) ? field.options.map(opt => typeof opt === "string" ? opt : opt.label || opt.value).join("\n") : "",
    displayOrder: field.displayOrder || 0,
    enabled: field.enabled !== false,
    visibilityMatchMode: field.visibilityRules?.matchMode === "any" ? "any" : "all",
    visibilityConditions: Array.isArray(field.visibilityRules?.conditions) ? field.visibilityRules.conditions.map(condition => ({
      ...condition
    })) : []
  };
}
function createLocalField(fieldType, displayOrder = 0) {
  const meta = PALETTE_FIELD_TYPES.find(item => item.type === fieldType);
  const suffix = Date.now().toString(36).slice(-4);
  return {
    id: `temp-${Date.now()}`,
    fieldKey: `${fieldType}_${suffix}`,
    label: meta?.label || "New field",
    fieldType,
    required: false,
    placeholder: "",
    options: [],
    displayOrder,
    enabled: true,
    visibilityRules: {
      matchMode: "all",
      conditions: []
    }
  };
}
function normalizeFieldOptions(field) {
  const fromText = String(field?.optionsText ?? "").split(/\r?\n/).map(line => line.trim()).filter(Boolean).map(line => ({
    label: line,
    value: line
  }));
  // Prefer the textarea content when present — an empty options[] from createLocalField
  // must not wipe options the user just typed in the draft.
  if (fromText.length > 0) return fromText;
  if (!Array.isArray(field?.options)) return [];
  return field.options.map(opt => {
    if (typeof opt === "string") {
      const value = opt.trim();
      return value ? {
        label: value,
        value
      } : null;
    }
    const label = String(opt?.label || opt?.value || "").trim();
    const value = String(opt?.value || opt?.label || "").trim();
    if (!label && !value) return null;
    return {
      label: label || value,
      value: value || label
    };
  }).filter(Boolean);
}
function buildFieldApiPayload(field) {
  return {
    fieldKey: String(field.fieldKey || "").trim(),
    label: String(field.label || "").trim(),
    fieldType: field.fieldType || "text",
    required: field.required === true,
    placeholder: String(field.placeholder || "").trim(),
    options: normalizeFieldOptions(field),
    displayOrder: Number(field.displayOrder || 0),
    enabled: field.enabled !== false,
    visibilityRules: {
      matchMode: field.visibilityRules?.matchMode === "any" || field.visibilityMatchMode === "any" ? "any" : "all",
      conditions: Array.isArray(field.visibilityRules?.conditions) ? field.visibilityRules.conditions.filter(condition => condition.fieldKey) : Array.isArray(field.visibilityConditions) ? field.visibilityConditions.filter(condition => condition.fieldKey) : []
    }
  };
}
function applyDraftToField(field, draft) {
  if (!field || !draft) return field;
  const payload = buildFieldApiPayload({
    ...field,
    ...draft,
    optionsText: draft.optionsText,
    visibilityRules: {
      matchMode: draft.visibilityMatchMode === "any" ? "any" : "all",
      conditions: draft.visibilityConditions || []
    }
  });
  return {
    ...field,
    ...payload,
    options: payload.options,
    visibilityRules: payload.visibilityRules
  };
}
function slugifyKey(value) {
  const safe = String(value || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return safe || `form-${Date.now().toString(36)}`;
}
function slugifyCategory(kind, formKey) {
  const safeKey = slugifyKey(formKey);
  return `${kind}-${safeKey}`;
}
function getUserLabel(user) {
  return user?.email || user?.username || user?.name || (user?.id ? `#${user.id}` : "");
}
function FieldHint({
  children
}) {
  return <p className={modalStyles.hint}>{children}</p>;
}
function ticketTargetsFromInitial(form) {
  return normalizeTicketTargetsDraft(form?.ticketTargets || {});
}
function formFromInitial(initialForm, kindDefault = "prestation") {
  if (!initialForm) {
    return {
      ...EMPTY_FORM,
      kind: kindDefault || "prestation",
      ticketTargets: {
        ...EMPTY_TICKET_TARGETS
      }
    };
  }
  return {
    kind: initialForm.kind,
    key: initialForm.key,
    label: initialForm.label,
    icon: initialForm.icon || "mdi:file-document-outline",
    categorySlug: initialForm.categorySlug,
    description: initialForm.description || "",
    displayOrder: initialForm.displayOrder || 0,
    enabled: initialForm.enabled !== false,
    visibility: initialForm.visibility === "assigned" ? "assigned" : "public",
    profileNames: Array.isArray(initialForm.profileNames) ? [...initialForm.profileNames] : [],
    userIds: Array.isArray(initialForm.userIds) ? initialForm.userIds.map(String) : [],
    teamIds: Array.isArray(initialForm.teamIds) ? initialForm.teamIds.map(String) : [],
    ticketTargets: ticketTargetsFromInitial(initialForm)
  };
}
export default function SalesFormModal({
  open,
  mode = "create",
  initialForm = null,
  kindDefault = "prestation",
  onClose,
  onSaved
}) {
  const locale = useAppLocale();
  const common = useCommonCopy();
  const deleteCopy = useMemo(() => getAdminDeleteConfirmsCopy(locale), [locale]);
  const isCreate = mode === "create";
  const [builderMode, setBuilderMode] = useState("builder");
  const [formId, setFormId] = useState("");
  const [formDraft, setFormDraft] = useState(EMPTY_FORM);
  const [fields, setFields] = useState([]);
  const [fieldDraft, setFieldDraft] = useState(null);
  const [selectedFieldId, setSelectedFieldId] = useState("");
  const [editingFieldId, setEditingFieldId] = useState("");
  const [savingForm, setSavingForm] = useState(false);
  const [savingField, setSavingField] = useState(false);
  const [deletingField, setDeletingField] = useState(false);
  const [fieldDeleteTarget, setFieldDeleteTarget] = useState(null);
  const [activeDragType, setActiveDragType] = useState("");
  const suppressPaletteClickRef = useRef(false);
  const [profiles, setProfiles] = useState([]);
  const [users, setUsers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [previewValues, setPreviewValues] = useState({});
  const [previewClients, setPreviewClients] = useState([]);
  const [previewContacts, setPreviewContacts] = useState([]);
  const previewLookupsLoadedRef = useRef(false);
  const sensors = useSensors(useSensor(PointerSensor, {
    activationConstraint: {
      distance: 6
    }
  }), useSensor(KeyboardSensor, {
    coordinateGetter: sortableKeyboardCoordinates
  }));
  const resetFieldSelection = useCallback(() => {
    setSelectedFieldId("");
    setEditingFieldId("");
    setFieldDraft(null);
  }, []);
  useEffect(() => {
    if (!open) return;
    setBuilderMode("builder");
    setFormId(initialForm?.id ? String(initialForm.id) : "");
    setFormDraft(formFromInitial(initialForm, kindDefault));
    setFields(Array.isArray(initialForm?.fields) ? initialForm.fields : []);
    setPreviewValues({});
    previewLookupsLoadedRef.current = false;
    setFieldDeleteTarget(null);
    resetFieldSelection();
  }, [open, initialForm, kindDefault, resetFieldSelection]);
  useEffect(() => {
    if (!open) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      try {
        const [profileRows, userRows, teamRows] = await Promise.all([fetch(`${API_BASE_URL}/profiles`, {
          credentials: "include"
        }).then(r => r.ok ? r.json() : []).catch(() => []), fetchUsers().catch(() => []), fetchTeams().catch(() => [])]);
        if (!cancelled) {
          setProfiles(Array.isArray(profileRows) ? profileRows : []);
          setUsers(Array.isArray(userRows) ? userRows : []);
          setTeams(Array.isArray(teamRows) ? teamRows : []);
        }
      } catch {
        if (!cancelled) {
          setProfiles([]);
          setUsers([]);
          setTeams([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);
  const userOptions = useMemo(() => users.filter(user => user?.id).map(user => ({
    id: String(user.id),
    label: getUserLabel(user),
    hint: user.profile || ""
  })), [users]);
  const profileOptions = useMemo(() => profiles.filter(profile => profile?.name).map(profile => ({
    id: profile.name,
    label: profile.name
  })), [profiles]);
  const teamOptions = useMemo(() => teams.filter(team => team?.id).map(team => ({
    id: String(team.id),
    label: team.name || `Team #${team.id}`
  })), [teams]);
  const previewFields = useMemo(() => {
    if (selectedFieldId && fieldDraft) {
      return fields.map(field => String(field.id) === String(selectedFieldId) ? applyDraftToField(field, fieldDraft) : field);
    }
    return fields;
  }, [fields, selectedFieldId, fieldDraft]);
  const sectionMeta = useMemo(() => ({
    builder: fields.length > 0,
    preview: fields.length > 0,
    settings: Boolean(String(formDraft.label || "").trim()) && (formDraft.visibility !== "assigned" || formDraft.profileNames.length > 0 || formDraft.userIds.length > 0 || formDraft.teamIds.length > 0),
    rules: (formDraft.ticketTargets?.rules || []).some(rule => rule.enabled !== false && (rule.always || (rule.conditions || []).length > 0 || rule.targets?.priority || rule.targets?.status || (rule.targets?.assigneeUserIds?.length || 0) > 0 || (rule.targets?.watcherUserIds?.length || 0) > 0 || (rule.targets?.teamIds?.length || 0) > 0))
  }), [formDraft, fields.length]);
  const switchBuilderMode = modeId => {
    if (modeId === "preview" && selectedFieldId && fieldDraft) {
      setFields(prev => prev.map(field => String(field.id) === String(selectedFieldId) ? applyDraftToField(field, fieldDraft) : field));
    }
    setBuilderMode(modeId);
    if (modeId === "preview" && !previewLookupsLoadedRef.current) {
      previewLookupsLoadedRef.current = true;
      (async () => {
        try {
          const [clientRows, contactRows] = await Promise.all([fetchClientsList().catch(() => []), fetchContactsList().catch(() => [])]);
          setPreviewClients(Array.isArray(clientRows) ? clientRows : []);
          setPreviewContacts(Array.isArray(contactRows) ? contactRows : []);
        } catch {
          setPreviewClients([]);
          setPreviewContacts([]);
        }
      })();
    }
  };
  const buildFormPayload = () => {
    const key = String(formDraft.key || "").trim() || slugifyKey(formDraft.label);
    return {
    kind: formDraft.kind,
    key,
    label: String(formDraft.label).trim(),
    icon: String(formDraft.icon || "mdi:file-document-outline").trim(),
    categorySlug: String(formDraft.categorySlug || slugifyCategory(formDraft.kind, key)).trim(),
    description: String(formDraft.description || "").trim(),
    displayOrder: Number(formDraft.displayOrder || 0),
    enabled: formDraft.enabled !== false,
    visibility: formDraft.visibility === "assigned" ? "assigned" : "public",
    profileNames: formDraft.visibility === "assigned" ? formDraft.profileNames : [],
    userIds: formDraft.visibility === "assigned" ? formDraft.userIds : [],
    teamIds: formDraft.visibility === "assigned" ? formDraft.teamIds : [],
    ticketTargets: serializeTicketTargetsDraft(formDraft.ticketTargets)
  };
  };
  const validateForm = ({ notify = true } = {}) => {
    if (!String(formDraft.label || "").trim()) {
      if (notify) toast.error("Label is required");
      setBuilderMode("settings");
      return false;
    }
    if (formDraft.visibility === "assigned" && formDraft.profileNames.length === 0 && formDraft.userIds.length === 0 && formDraft.teamIds.length === 0) {
      if (notify) toast.error("Select at least one profile, agent or team");
      setBuilderMode("settings");
      return false;
    }
    return true;
  };
  const handleSaveForm = async () => {
    if (!validateForm({
      notify: true
    })) return;
    // Flush the open field draft (incl. options) before persisting.
    const fieldsToPersist = selectedFieldId && fieldDraft ? fields.map(field => String(field.id) === String(selectedFieldId) ? applyDraftToField(field, fieldDraft) : field) : fields;
    if (fieldsToPersist !== fields) setFields(fieldsToPersist);
    const isCreating = !formId;
    setSavingForm(true);
    try {
      const payload = buildFormPayload();
      let saved;
      if (formId) {
        saved = await updateSalesForm(formId, payload);
        toast.success("Form updated");
      } else {
        saved = await createSalesForm(payload);
        toast.success("Form created");
        if (saved?.id) setFormId(String(saved.id));
      }
      const persistedId = saved?.id ? String(saved.id) : formId;
      if (persistedId) {
        const pendingTemps = fieldsToPersist.filter(field => String(field.id).startsWith("temp-"));
        if (pendingTemps.length > 0) {
          const createdFields = [];
          for (const field of pendingTemps) {
            const savedField = await createSalesFormField(persistedId, buildFieldApiPayload(field));
            createdFields.push({
              tempId: String(field.id),
              savedField
            });
          }
          setFields(prev => {
            const withoutTemps = prev.filter(field => !String(field.id).startsWith("temp-"));
            const next = [...withoutTemps, ...createdFields.map(item => item.savedField)].sort((a, b) => Number(a.displayOrder || 0) - Number(b.displayOrder || 0));
            return next;
          });
          const selectedTemp = createdFields.find(item => item.tempId === String(selectedFieldId));
          if (selectedTemp?.savedField) selectField(selectedTemp.savedField);
        } else if (Array.isArray(saved?.fields) && saved.fields.length > 0) {
          setFields(saved.fields);
        }
      }
      onSaved?.(saved);
      if (isCreating) onClose?.();
    } catch (error) {
      toast.error(error.message || "Error saving form");
    } finally {
      setSavingForm(false);
    }
  };
  const selectField = field => {
    if (!field) {
      resetFieldSelection();
      return;
    }
    setSelectedFieldId(String(field.id));
    setEditingFieldId(String(field.id).startsWith("temp-") ? "" : String(field.id));
    setFieldDraft(fieldToDraft(field));
  };
  const addFieldFromType = fieldType => {
    // Local-only: never persist/validate the parent form while composing fields.
    const nextOrder = fields.length ? Math.max(...fields.map(f => Number(f.displayOrder || 0))) + 10 : 10;
    const localField = createLocalField(fieldType, nextOrder);
    setFields(prev => [...prev, localField]);
    selectField(localField);
  };
  const handlePaletteQuickAdd = fieldType => {
    // Ignore the click that often fires right after a drag-and-drop.
    if (suppressPaletteClickRef.current) return;
    addFieldFromType(fieldType);
  };
  const handleDragStart = event => {
    const fieldType = event.active?.data?.current?.fieldType;
    if (fieldType) {
      suppressPaletteClickRef.current = true;
      setActiveDragType(fieldType);
    }
  };
  const updateFieldDraft = draft => {
    setFieldDraft(draft);
    if (!selectedFieldId || !draft) return;
    setFields(prev => prev.map(field => String(field.id) === String(selectedFieldId) ? applyDraftToField(field, draft) : field));
  };
  const handleDragCancel = () => {
    setActiveDragType("");
    window.setTimeout(() => {
      suppressPaletteClickRef.current = false;
    }, 0);
  };
  const handleDragEnd = async event => {
    setActiveDragType("");
    const {
      active,
      over
    } = event;
    try {
      if (!over) return;
      if (active.data.current?.source === "palette") {
        if (over.id === "form-canvas" || fields.some(field => field.id === over.id)) {
          addFieldFromType(active.data.current.fieldType);
        }
        return;
      }
      if (active.data.current?.source === "canvas" && active.id !== over.id) {
        const oldIndex = fields.findIndex(field => field.id === active.id);
        const newIndex = fields.findIndex(field => field.id === over.id);
        if (oldIndex < 0 || newIndex < 0) return;
        const reordered = arrayMove(fields, oldIndex, newIndex).map((field, index) => ({
          ...field,
          displayOrder: (index + 1) * 10
        }));
        setFields(reordered);
        if (formId) {
          await Promise.all(reordered.filter(field => !String(field.id).startsWith("temp-")).map(field => updateSalesFormField(formId, field.id, {
            displayOrder: field.displayOrder
          }))).catch(() => {});
        }
      }
    } finally {
      window.setTimeout(() => {
        suppressPaletteClickRef.current = false;
      }, 0);
    }
  };
  const handleSaveField = async () => {
    if (!fieldDraft) return;
    if (!String(fieldDraft.label || "").trim()) {
      toast.error("Field label is required");
      return;
    }
    const resolvedFieldKey = String(fieldDraft.fieldKey || "").trim() || `${fieldDraft.fieldType || "text"}_${Date.now().toString(36).slice(-4)}`;
    const draftWithKey = {
      ...fieldDraft,
      fieldKey: resolvedFieldKey
    };
    const payload = buildFieldApiPayload({
      ...draftWithKey,
      optionsText: draftWithKey.optionsText,
      visibilityMatchMode: draftWithKey.visibilityMatchMode,
      visibilityConditions: draftWithKey.visibilityConditions
    });

    // New form draft: keep fields local until "Create form".
    if (!formId) {
      const localField = {
        id: selectedFieldId || `temp-${Date.now()}`,
        ...payload,
        options: payload.options,
        visibilityRules: payload.visibilityRules
      };
      setFields(prev => {
        const exists = prev.some(field => String(field.id) === String(selectedFieldId));
        if (!exists) return [...prev, localField];
        return prev.map(field => String(field.id) === String(selectedFieldId) ? {
          ...field,
          ...localField,
          id: field.id
        } : field);
      });
      setFieldDraft(fieldToDraft(localField));
      toast.success(payload.options.length ? `Field saved · ${payload.options.length} option(s)` : "Field saved");
      return;
    }

    setSavingField(true);
    try {
      let savedField;
      if (editingFieldId) {
        savedField = await updateSalesFormField(formId, editingFieldId, payload);
        toast.success("Field updated");
      } else {
        savedField = await createSalesFormField(formId, payload);
        toast.success("Field added");
      }
      setFields(prev => {
        const withoutTemp = prev.filter(field => String(field.id) !== String(selectedFieldId));
        if (editingFieldId) {
          return withoutTemp.concat(savedField).sort((a, b) => Number(a.displayOrder || 0) - Number(b.displayOrder || 0));
        }
        return [...withoutTemp, savedField].sort((a, b) => Number(a.displayOrder || 0) - Number(b.displayOrder || 0));
      });
      selectField(savedField);
      onSaved?.();
    } catch (error) {
      toast.error(error.message || "Error saving field");
    } finally {
      setSavingField(false);
    }
  };
  const requestRemoveField = field => {
    if (!field) return;
    setFieldDeleteTarget(field);
  };
  const closeFieldDeleteConfirm = () => {
    if (deletingField) return;
    setFieldDeleteTarget(null);
  };
  const confirmRemoveField = async () => {
    const field = fieldDeleteTarget;
    if (!field) return;
    if (String(field.id).startsWith("temp-")) {
      setFields(prev => prev.filter(item => String(item.id) !== String(field.id)));
      if (String(selectedFieldId) === String(field.id)) resetFieldSelection();
      setFieldDeleteTarget(null);
      return;
    }
    if (!formId) {
      setFieldDeleteTarget(null);
      return;
    }
    setDeletingField(true);
    try {
      await deleteSalesFormField(formId, field.id);
      toast.success("Field deleted");
      if (String(selectedFieldId) === String(field.id)) resetFieldSelection();
      setFields(prev => prev.filter(item => String(item.id) !== String(field.id)));
      setFieldDeleteTarget(null);
      onSaved?.();
    } catch (error) {
      toast.error(error.message || "Error deleting field");
    } finally {
      setDeletingField(false);
    }
  };
  if (!open) return null;
  const modalTitle = formId ? `Edit ${formDraft.label || "form"}` : "New form";
  const modalSubtitle = formId ? "Configure the request type, its visibility and fields." : "Create a professional service or installation request type.";
  const renderGeneralSection = () => <>
      <div className={`${layout.sectionHead} ${modalStyles.compactSectionHead}`}>
        <h3 className={layout.sectionTitle}>General information</h3>
        <p className={layout.sectionDesc}>Type, label and icon shown to agents.</p>
      </div>
      <div className={modalStyles.formBlocks}>
        <div className={modalStyles.typeOrderRow}>
          <div className={layout.field}>
            <label className={layout.label}>Type</label>
            <select className={layout.input} value={formDraft.kind} onChange={e => setFormDraft(prev => ({
            ...prev,
            kind: e.target.value,
            categorySlug: slugifyCategory(e.target.value, prev.key)
          }))}>
              <option value="prestation">Professional service</option>
              <option value="installation">Installation</option>
            </select>
          </div>
          <div className={`${layout.field} ${modalStyles.orderField}`}>
            <label className={layout.label}>Order</label>
            <input type="number" className={layout.input} value={formDraft.displayOrder} onChange={e => setFormDraft(prev => ({
            ...prev,
            displayOrder: Number(e.target.value || 0)
          }))} />
          </div>
        </div>

        <div className={layout.field}>
          <label className={`${layout.label} ${layout.labelRequired}`}>Label</label>
          <input className={layout.input} value={formDraft.label} onChange={e => {
          const nextLabel = e.target.value;
          setFormDraft(prev => {
            const nextKey = isCreate || !prev.key ? slugifyKey(nextLabel) : prev.key;
            return {
              ...prev,
              label: nextLabel,
              key: nextKey,
              categorySlug: slugifyCategory(prev.kind, nextKey)
            };
          });
        }} autoFocus={isCreate} placeholder="E.g. On-site installation" />
          <FieldHint>Name shown when creating a request.</FieldHint>
        </div>

        <div className={modalStyles.iconSection}>
          <span className={layout.label}>Icon</span>
          <IconPicker variant="simple" value={formDraft.icon || "mdi:file-document-outline"} onChange={icon => setFormDraft(prev => ({
          ...prev,
          icon
        }))} choices={SALES_FORM_ICON_CHOICES} />
        </div>

        <div className={layout.field}>
          <label className={layout.label}>Description</label>
          <textarea className={layout.input} rows={2} value={formDraft.description} onChange={e => setFormDraft(prev => ({
          ...prev,
          description: e.target.value
        }))} />
        </div>

        <label className={`${layout.label} ${modalStyles.inlineActive}`}>
          <input type="checkbox" checked={formDraft.enabled !== false} onChange={e => setFormDraft(prev => ({
          ...prev,
          enabled: e.target.checked
        }))} />
          Active
        </label>
      </div>
    </>;
  const renderVisibilitySection = () => <>
      <div className={`${layout.sectionHead} ${modalStyles.compactSectionHead}`}>
        <h3 className={layout.sectionTitle}>Visibility</h3>
        <p className={layout.sectionDesc}>Who can use this form when creating a request.</p>
      </div>
      <div className={layout.field}>
        <div className={modalStyles.chipRow}>
          {VISIBILITY_OPTIONS.map(opt => <button key={opt.value} type="button" className={`${pageLayout.chip} ${formDraft.visibility === opt.value ? pageLayout.chipActive : ""}`} onClick={() => setFormDraft(prev => ({
          ...prev,
          visibility: opt.value,
          profileNames: opt.value === "assigned" ? prev.profileNames : [],
          userIds: opt.value === "assigned" ? prev.userIds : [],
          teamIds: opt.value === "assigned" ? prev.teamIds : []
        }))}>
              {opt.label}
            </button>)}
        </div>
        <FieldHint>{VISIBILITY_OPTIONS.find(opt => opt.value === formDraft.visibility)?.hint}</FieldHint>
      </div>
      {formDraft.visibility === "assigned" && <div className={layout.field}>
          <label className={layout.label}>Who can use this form?</label>
          <FieldHint>Type to filter, then select from the list.</FieldHint>
          <div className={modalStyles.suggestGrid}>
            <MultiSuggestPicker inputId="sales-form-visibility-users" label="Agents" placeholder="Search for an agent…" options={userOptions} selectedIds={formDraft.userIds} emptyHint="No agent" onChange={userIds => setFormDraft(prev => ({
          ...prev,
          userIds
        }))} />
            <MultiSuggestPicker inputId="sales-form-visibility-profiles" label="Profiles" placeholder="Search for a profile…" options={profileOptions} selectedIds={formDraft.profileNames} emptyHint="No profile" onChange={profileNames => setFormDraft(prev => ({
          ...prev,
          profileNames
        }))} />
            <MultiSuggestPicker inputId="sales-form-visibility-teams" label="Teams" placeholder="Search for a team…" options={teamOptions} selectedIds={formDraft.teamIds} emptyHint="No team" onChange={teamIds => setFormDraft(prev => ({
          ...prev,
          teamIds
        }))} />
          </div>
        </div>}
    </>;
  const renderTargetsSection = () => <>
      <div className={layout.sectionHead}>
        <h3 className={layout.sectionTitle}>Ticket targets</h3>
        <p className={layout.sectionDesc}>
          Define one or more targets. Each target corresponds to a ticket created when its conditions
          (field values) are met. With no conditions, the ticket is always created.
        </p>
      </div>
      <SalesFormTargetRulesEditor rules={formDraft.ticketTargets?.rules?.length ? formDraft.ticketTargets.rules : [createEmptyTargetRule(0)]} formFields={fields} userOptions={userOptions} teamOptions={teamOptions} onChange={rules => setFormDraft(prev => ({
      ...prev,
      ticketTargets: {
        version: 2,
        rules
      }
    }))} />
    </>;
  const renderSettingsSection = () => <div className={`${builderStyles.builderContent} ${builderStyles.settingsContent}`}>
      <div className={builderStyles.settingsPanelWide}>
        {renderGeneralSection()}
        <div className={modalStyles.sectionDivider} aria-hidden />
        {renderVisibilitySection()}
      </div>
    </div>;
  const renderRulesSection = () => <div className={`${builderStyles.builderContent} ${builderStyles.settingsContent}`}>
      <div className={builderStyles.settingsPanelWide}>{renderTargetsSection()}</div>
    </div>;
  const renderPreviewSection = () => <div className={builderStyles.previewWrap}>
      <div className={builderStyles.previewPanel}>
        <div className={builderStyles.previewHead}>
          <div className={builderStyles.previewHeadMain}>
            <span className={builderStyles.previewBadge}>Preview</span>
            <h3 className={builderStyles.previewTitle}>
              <Icon icon={formDraft.icon || "mdi:file-document-outline"} aria-hidden />
              {formDraft.label || "New form"}
            </h3>
            {formDraft.description ? <p className={builderStyles.previewDesc}>{formDraft.description}</p> : <p className={builderStyles.previewDesc}>
                Interactive preview — fill values to test visibility conditions.
              </p>}
          </div>
          <button type="button" className={layout.ghostBtn} onClick={() => setPreviewValues({})} disabled={Object.keys(previewValues).length === 0}>
            Reset
          </button>
        </div>
        <SalesFormFieldsRenderer fields={previewFields} values={previewValues} users={users} contacts={previewContacts} clients={previewClients} onChange={setPreviewValues} />
      </div>
    </div>;
  const collisionDetection = event => {
    const pointerCollisions = pointerWithin(event);
    if (pointerCollisions.length > 0) return pointerCollisions;
    const rectCollisions = rectIntersection(event);
    if (rectCollisions.length > 0) return rectCollisions;
    return closestCenter(event);
  };
  const renderBuilderSection = () => <DndContext sensors={sensors} collisionDetection={collisionDetection} onDragStart={handleDragStart} onDragEnd={handleDragEnd} onDragCancel={handleDragCancel}>
      <div className={builderStyles.builderMain}>
        <SalesFormFieldPalette onQuickAdd={handlePaletteQuickAdd} />
        <SalesFormBuilderCanvas formLabel={formDraft.label} formDescription={formDraft.description} fields={fields} selectedFieldId={selectedFieldId} onSelectField={selectField} onRemoveField={requestRemoveField} />
        <SalesFormFieldPropertiesPanel fieldDraft={fieldDraft} formFields={fields} saving={savingField} onChange={updateFieldDraft} onSave={handleSaveField} onDelete={fieldDraft ? () => requestRemoveField(fields.find(f => String(f.id) === String(selectedFieldId))) : null} onClose={resetFieldSelection} />
      </div>
      <DragOverlay>
        {activeDragType ? <div className={builderStyles.paletteItem}>
            <Icon icon={PALETTE_FIELD_TYPES.find(item => item.type === activeDragType)?.icon || "mdi:form-textbox"} className={builderStyles.paletteItemIcon} />
            {PALETTE_FIELD_TYPES.find(item => item.type === activeDragType)?.label || "Field"}
          </div> : null}
      </DragOverlay>
    </DndContext>;
  const renderMainContent = () => {
    if (builderMode === "preview") return renderPreviewSection();
    if (builderMode === "rules") return renderRulesSection();
    if (builderMode === "settings") return renderSettingsSection();
    return renderBuilderSection();
  };
  return <>
      {createPortal(<div className={layout.overlay} onClick={onClose} role="presentation">
      <div className={`${layout.shell} ${builderStyles.builderShellWide}`} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="sales-form-modal-title">
        <div className={layout.accentBar} aria-hidden />
        <header className={layout.header}>
          <div className={layout.headerMain}>
            <div className={layout.headerIconWrap} aria-hidden>
              <Icon icon={formDraft.icon || "mdi:file-document-outline"} />
            </div>
            <div className={layout.headerText}>
              <p className={layout.eyebrow}>Sales forms</p>
              <h2 className={layout.title} id="sales-form-modal-title">
                {modalTitle}
              </h2>
              <p className={layout.subtitle}>{modalSubtitle}</p>
            </div>
          </div>
          <button type="button" className={layout.closeBtn} onClick={onClose} disabled={savingForm || savingField} aria-label="Close">
            <FaTimes />
          </button>
        </header>

        <div className={`${layout.body} ${builderStyles.builderBody}`}>
          <nav className={builderStyles.builderNav} aria-label="Builder modes">
            {BUILDER_MODES.map(mode => <button key={mode.id} type="button" title={mode.label} className={`${builderStyles.builderNavBtn} ${builderMode === mode.id ? builderStyles.builderNavBtnActive : ""}`} onClick={() => switchBuilderMode(mode.id)} aria-current={builderMode === mode.id ? "page" : undefined}>
                <Icon icon={mode.icon} aria-hidden />
              </button>)}
          </nav>
          {renderMainContent()}
        </div>

        <footer className={layout.footer}>
          <span className={layout.footerHint}>
            {formDraft.kind === "installation" ? "Installation" : "Professional service"} · {fields.length} field(s) ·{" "}
            {formDraft.enabled !== false ? "Active" : "Inactive"}
          </span>
          <div className={layout.footerActions}>
            <button type="button" className={layout.ghostBtn} onClick={onClose} disabled={savingForm || savingField}>
              Close
            </button>
            <button type="button" className={layout.primaryBtn} onClick={handleSaveForm} disabled={savingForm || savingField || Boolean(activeDragType)}>
              {savingForm ? <>
                  <Icon icon="mdi:loading" className={layout.spinning} aria-hidden />
                  Saving…
                </> : formId ? <>
                  <Icon icon="mdi:content-save-outline" aria-hidden />
                  Save
                </> : <>
                  <Icon icon="mdi:check" aria-hidden />
                  Create form
                </>}
            </button>
          </div>
        </footer>
      </div>
    </div>, document.getElementById("modal-root") || document.body)}
      <ConfirmModal open={Boolean(fieldDeleteTarget)} title={deleteCopy.salesFormFieldTitle || deleteCopy.salesFormFieldDelete} icon="mdi:delete-alert-outline" message={interpolate(deleteCopy.salesFormFieldMessage || deleteCopy.salesFormFieldDelete, {
      name: fieldDeleteTarget?.label || deleteCopy.untitled || "field"
    })} confirmLabel={common.delete} confirmVariant="dangerSolid" confirmLoading={deletingField} onClose={closeFieldDeleteConfirm} onConfirm={confirmRemoveField} />
    </>;
}
