import EquipmentSectionNavIcon, { useSectionIconHover } from "../../EquipementPage/EquipmentSectionNavIcon";

/** Bouton de section pour nav Finder des modales (Planning, Campagnes…). */
export default function UiKitModalNavSectionButton({
  section,
  active,
  badge = null,
  onSelect,
  finderItemClass,
  finderItemActiveClass,
  finderItemIconClass,
  finderItemLabelClass,
  navBadgeClass,
  navBadgeSlotClass
}) {
  const { animRef, onMouseEnter, onMouseLeave } = useSectionIconHover(section.id);
  return (
    <button
      type="button"
      className={`${finderItemClass} ${active ? finderItemActiveClass : ""}`}
      onClick={onSelect}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      aria-current={active ? "page" : undefined}
    >
      <EquipmentSectionNavIcon
        sectionId={section.id}
        iconify={section.icon}
        className={finderItemIconClass}
        size={18}
        animRef={animRef}
      />
      <span className={finderItemLabelClass}>{section.label}</span>
      <span className={navBadgeSlotClass} aria-hidden={!badge || undefined}>
        {badge ? <span className={navBadgeClass}>{badge}</span> : null}
      </span>
    </button>
  );
}
