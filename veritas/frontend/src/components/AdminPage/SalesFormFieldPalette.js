import { useRef } from "react";
import { useDraggable } from "@dnd-kit/core";
import { Icon } from "@iconify/react";
import builderStyles from "./SalesFormBuilder.module.css";
import { getFieldTypeLabel, PALETTE_FIELD_TYPES, PALETTE_GROUPS } from "../../utils/salesFormFieldTypes";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import {
  BriefcaseBusinessIcon,
  CalendarDaysIcon,
  CloudUploadIcon,
  FileTextIcon,
  HomeIcon,
  MonitorIcon,
  PlusIcon,
  RadioIcon,
  SquarePenIcon,
  UserIcon,
  UsersIcon
} from "../Misc/Sidebar/lucideAnimated";

export { PALETTE_FIELD_TYPES, FIELD_TYPE_OPTIONS, OPTION_BASED_FIELD_TYPES, SHELL_FIELD_TYPES, LAYOUT_FIELD_TYPES, isLayoutField, isFileField, groupFieldsBySection, cloneSalesFormField, getDuplicableFieldBlock, getFileFieldConfig } from "../../utils/salesFormFieldTypes";

const PALETTE_ANIMATED_ICONS = {
  section: FileTextIcon,
  text: SquarePenIcon,
  textarea: FileTextIcon,
  date: CalendarDaysIcon,
  datetime: CalendarDaysIcon,
  radio: RadioIcon,
  file: CloudUploadIcon,
  user: UserIcon,
  client: BriefcaseBusinessIcon,
  contact: UsersIcon,
  equipment: MonitorIcon,
  site: HomeIcon
};

function PaletteItem({
  type,
  label,
  icon,
  index = 0,
  onQuickAdd
}) {
  const iconRef = useRef(null);
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
  const AnimatedIcon = PALETTE_ANIMATED_ICONS[type] || null;

  return (
    <button
      ref={setNodeRef}
      type="button"
      className={`${builderStyles.paletteItem} ${isDragging ? builderStyles.paletteItemDragging : ""}`.trim()}
      style={{ "--item-i": index }}
      onClick={() => onQuickAdd?.(type)}
      onMouseEnter={() => iconRef.current?.startAnimation?.()}
      onMouseLeave={() => iconRef.current?.stopAnimation?.()}
      {...listeners}
      {...attributes}
    >
      <span className={builderStyles.paletteItemIconWrap} aria-hidden>
        {AnimatedIcon ? (
          <AnimatedIcon ref={iconRef} className={builderStyles.paletteItemIconAnimated} size={18} />
        ) : (
          <Icon icon={icon} className={builderStyles.paletteItemIcon} />
        )}
      </span>
      <span className={builderStyles.paletteItemLabel}>{label}</span>
    </button>
  );
}

export default function SalesFormFieldPalette({
  onQuickAdd
}) {
  const locale = useAppLocale();
  let itemIndex = 0;

  return (
    <aside className={builderStyles.palette}>
      <div className={builderStyles.paletteHead}>
        <p className={builderStyles.paletteTitle}>
          <PlusIcon className={builderStyles.paletteHeadIcon} size={16} />
          {locale === "fr" ? "Champs" : "Fields"}
        </p>
        <p className={builderStyles.canvasDesc} style={{ marginTop: "0.35rem" }}>
          {locale === "fr" ? "Glissez ou cliquez pour ajouter" : "Drag or click to add"}
        </p>
      </div>
      <div className={builderStyles.paletteList}>
        {PALETTE_GROUPS.map(group => {
          const items = PALETTE_FIELD_TYPES.filter(item => item.group === group.id);
          if (items.length === 0) return null;
          return (
            <div key={group.id} className={builderStyles.paletteGroup}>
              <p className={builderStyles.paletteGroupTitle}>{group.title}</p>
              <div className={builderStyles.paletteGroupList}>
                {items.map(item => {
                  const index = itemIndex++;
                  return (
                    <PaletteItem
                      key={item.type}
                      type={item.type}
                      icon={item.icon}
                      label={getFieldTypeLabel(item.type, locale)}
                      index={index}
                      onQuickAdd={onQuickAdd}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
}

export function paletteTypeFromDragId(id) {
  if (!String(id || "").startsWith("palette-")) return null;
  return String(id).replace("palette-", "");
}
