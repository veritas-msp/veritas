import { useMemo } from "react";
import { Icon } from "@iconify/react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import builderStyles from "./SalesFormBuilder.module.css";
import { describeVisibilityRules } from "../../utils/salesFormConditions";
import adminStyles from "./AdminTickets.module.css";
function FieldPreview({
  field
}) {
  const label = <>
      {field.label || "No label"}
      {field.required ? " *" : null}
    </>;
  if (field.fieldType === "textarea") {
    return <div className={builderStyles.canvasFieldPreview}>
        <label>{label}</label>
        <textarea rows={3} readOnly placeholder={field.placeholder || ""} value="" />
      </div>;
  }
  if (field.fieldType === "select") {
    return <div className={builderStyles.canvasFieldPreview}>
        <label>{label}</label>
        <select disabled>
          <option>Select…</option>
        </select>
      </div>;
  }
  if (field.fieldType === "checkbox") {
    return <div className={builderStyles.canvasFieldPreview}>
        <label>{label}</label>
        <div className={builderStyles.canvasFieldMeta}>Yes / No</div>
      </div>;
  }
  const inputType = field.fieldType === "number" ? "number" : field.fieldType === "date" ? "date" : "text";
  return <div className={builderStyles.canvasFieldPreview}>
      <label>{label}</label>
      <input type={inputType} readOnly placeholder={field.placeholder || ""} value="" />
    </div>;
}
function SortableCanvasField({
  field,
  selected,
  onSelect,
  onRemove
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({
    id: field.id,
    data: {
      source: "canvas",
      fieldId: field.id
    }
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition
  };
  return <div ref={setNodeRef} style={style} className={`${builderStyles.canvasField} ${selected ? builderStyles.canvasFieldSelected : ""} ${isDragging ? builderStyles.canvasFieldDragging : ""}`} onClick={() => onSelect(field)} onKeyDown={e => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onSelect(field);
    }
  }} role="button" tabIndex={0}>
      <div className={builderStyles.canvasFieldHandle} {...attributes} {...listeners} onClick={e => e.stopPropagation()}>
        <Icon icon="mdi:drag-vertical" aria-hidden />
      </div>
      <div>
        <FieldPreview field={field} />
        <div className={builderStyles.canvasFieldMeta}>
          {field.fieldKey} · {field.fieldType}
          {field.visibilityRules?.conditions?.length ? ` · ${describeVisibilityRules(field.visibilityRules)}` : ""}
        </div>
      </div>
      <div className={builderStyles.canvasFieldActions}>
        <button type="button" className={`${adminStyles.actionButton} ${adminStyles.danger}`} onClick={e => {
        e.stopPropagation();
        onRemove(field);
      }} title="Delete">
          <Icon icon="mdi:delete-outline" />
        </button>
      </div>
    </div>;
}
export default function SalesFormBuilderCanvas({
  formLabel,
  formDescription,
  fields = [],
  selectedFieldId = "",
  onSelectField,
  onRemoveField
}) {
  const {
    setNodeRef,
    isOver
  } = useDroppable({
    id: "form-canvas"
  });
  const sortedFields = useMemo(() => [...fields].sort((a, b) => Number(a.displayOrder || 0) - Number(b.displayOrder || 0)), [fields]);
  const fieldIds = sortedFields.map(field => field.id);
  return <section className={builderStyles.canvasWrap}>
      <div className={builderStyles.canvasHead}>
        <h3 className={builderStyles.canvasTitle}>{formLabel || "New form"}</h3>
        <p className={builderStyles.canvasDesc}>
          {formDescription || "Drag fields from the palette and click to configure them."}
        </p>
      </div>
      <div className={builderStyles.canvasBody}>
        <div ref={setNodeRef} className={`${builderStyles.canvasDropZone} ${isOver ? builderStyles.canvasDropZoneActive : ""}`}>
          {sortedFields.length === 0 ? <div className={builderStyles.canvasEmpty}>
              <Icon icon="mdi:cursor-move" style={{
            fontSize: "2rem"
          }} aria-hidden />
              <p>Drop a field here to get started</p>
            </div> : <SortableContext items={fieldIds} strategy={verticalListSortingStrategy}>
              <div className={builderStyles.canvasFieldList}>
                {sortedFields.map(field => <SortableCanvasField key={field.id} field={field} selected={String(selectedFieldId) === String(field.id)} onSelect={onSelectField} onRemove={onRemoveField} />)}
              </div>
            </SortableContext>}
        </div>
      </div>
    </section>;
}
