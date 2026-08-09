import { useDraggable } from "@dnd-kit/core";
import { Icon } from "@iconify/react";
import builderStyles from "./SalesFormBuilder.module.css";
import { PALETTE_FIELD_TYPES, PALETTE_GROUPS } from "../../utils/salesFormFieldTypes";

export { PALETTE_FIELD_TYPES, FIELD_TYPE_OPTIONS, OPTION_BASED_FIELD_TYPES, SHELL_FIELD_TYPES } from "../../utils/salesFormFieldTypes";

function PaletteItem({
  type,
  label,
  icon,
  onQuickAdd
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    isDragging
  } = useDraggable({
    id: `palette-${type}`,
    data: {
      source: "palette",
      fieldType: type
    }
  });
  return <button ref={setNodeRef} type="button" className={builderStyles.paletteItem} style={{
    opacity: isDragging ? 0.4 : 1
  }} onClick={() => onQuickAdd?.(type)} {...listeners} {...attributes}>
      <Icon icon={icon} className={builderStyles.paletteItemIcon} aria-hidden />
      {label}
    </button>;
}

export default function SalesFormFieldPalette({
  onQuickAdd
}) {
  return <aside className={builderStyles.palette}>
      <div className={builderStyles.paletteHead}>
        <p className={builderStyles.paletteTitle}>Fields</p>
        <p className={builderStyles.canvasDesc} style={{
        marginTop: "0.35rem"
      }}>
          Drag or click to add
        </p>
      </div>
      <div className={builderStyles.paletteList}>
        {PALETTE_GROUPS.map(group => {
        const items = PALETTE_FIELD_TYPES.filter(item => item.group === group.id);
        if (items.length === 0) return null;
        return <div key={group.id} className={builderStyles.paletteGroup}>
              <p className={builderStyles.paletteGroupTitle}>{group.title}</p>
              <div className={builderStyles.paletteGroupList}>
                {items.map(item => <PaletteItem key={item.type} {...item} onQuickAdd={onQuickAdd} />)}
              </div>
            </div>;
      })}
      </div>
    </aside>;
}

export function paletteTypeFromDragId(id) {
  if (!String(id || "").startsWith("palette-")) return null;
  return String(id).replace("palette-", "");
}
