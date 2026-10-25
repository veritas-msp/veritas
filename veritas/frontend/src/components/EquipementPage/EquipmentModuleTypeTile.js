import { useRef } from "react";
import { Icon } from "@iconify/react";
import EquipmentHoverIcon from "./EquipmentHoverIcon";
import formStyles from "../EnterprisesPage/EnterpriseFormModal.module.css";

/**
 * Tuile de type / déploiement (Physique, Virtuel, NAS…) avec icône animée au hover.
 */
export default function EquipmentModuleTypeTile({
  value,
  label,
  iconify,
  Animated = null,
  description,
  selected = false,
  onSelect,
  showCheck = true,
  className = "",
}) {
  const animRef = useRef(null);

  return (
    <button
      type="button"
      className={`${formStyles.moduleTile} ${selected ? formStyles.moduleTileActive : ""} ${className}`.trim()}
      onClick={() => onSelect?.(value)}
      onMouseEnter={() => animRef.current?.startAnimation?.()}
      onMouseLeave={() => animRef.current?.stopAnimation?.()}
      aria-pressed={selected}
      title={description}
    >
      {showCheck && selected ? (
        <Icon icon="mdi:check-circle" className={formStyles.moduleCheck} aria-hidden />
      ) : null}
      <span className={formStyles.moduleTileIcon} aria-hidden style={{ display: "inline-flex" }}>
        <EquipmentHoverIcon
          Animated={Animated}
          iconify={iconify}
          size={22}
          animRef={animRef}
        />
      </span>
      <span className={formStyles.moduleTileLabel}>{label}</span>
    </button>
  );
}
