import { useRef } from "react";
import { Icon } from "@iconify/react";
import EquipmentHoverIcon, { CATEGORY_ANIMATED } from "./EquipmentHoverIcon";
import styles from "./EquipmentAddFlowModal.module.css";

export default function EquipmentCategoryTile({
  category,
  selected = false,
  disabled = false,
  index = 0,
  onSelect,
}) {
  const animRef = useRef(null);
  const Animated = CATEGORY_ANIMATED[category.id] || null;

  return (
    <button
      type="button"
      role="option"
      className={`${styles.categoryTile} ${selected ? styles.categoryTileActive : ""}`}
      style={{ animationDelay: `${Math.min(index, 12) * 28}ms` }}
      onClick={() => onSelect?.(category.id)}
      onMouseEnter={() => animRef.current?.startAnimation?.()}
      onMouseLeave={() => animRef.current?.stopAnimation?.()}
      disabled={disabled}
      aria-pressed={selected}
      aria-selected={selected}
    >
      {selected ? <Icon icon="mdi:check-circle" className={styles.categoryCheck} aria-hidden /> : null}
      <span className={styles.categoryIconWrap} aria-hidden>
        <EquipmentHoverIcon
          Animated={Animated}
          iconify={category.icon || "mdi:cube-outline"}
          size={26}
          className={styles.categoryIcon}
          animRef={animRef}
        />
      </span>
      <span className={styles.categoryLabel}>{category.label}</span>
    </button>
  );
}
