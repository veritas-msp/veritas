import { useRef } from "react";
import EquipmentHoverIcon, { SECTION_ANIMATED } from "./EquipmentHoverIcon";

/** Icône de section : le parent bouton doit appeler bindHover props. */
export function useSectionIconHover(sectionId) {
  const animRef = useRef(null);
  const Animated = SECTION_ANIMATED[sectionId] || null;
  return {
    animRef,
    Animated,
    onMouseEnter: () => animRef.current?.startAnimation?.(),
    onMouseLeave: () => animRef.current?.stopAnimation?.(),
  };
}

export default function EquipmentSectionNavIcon({
  sectionId,
  iconify,
  className,
  size = 18,
  animRef,
}) {
  const localRef = useRef(null);
  const ref = animRef || localRef;
  const Animated = SECTION_ANIMATED[sectionId] || null;

  return (
    <span
      className={className}
      aria-hidden
      style={{ display: "inline-flex", alignItems: "center", justifyContent: "center" }}
    >
      <EquipmentHoverIcon
        Animated={Animated}
        iconify={iconify}
        size={size}
        animRef={ref}
      />
    </span>
  );
}
