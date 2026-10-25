import { useRef } from "react";
import { Icon } from "@iconify/react";
import EquipmentHoverIcon, {
  OVERVIEW_TAB_ANIMATED,
  CATEGORY_ANIMATED,
  QUICK_ACTION_ANIMATED,
} from "../EquipementPage/EquipmentHoverIcon";

/** Onglet principal (Infrastructure, Cyber…) avec icône animée au hover. */
export function EnterpriseOverviewTabButton({
  tabId,
  iconify,
  label,
  active,
  onClick,
  className,
  iconClassName,
  labelClassName,
  badge = null,
  "data-guide": dataGuide,
  ...rest
}) {
  const animRef = useRef(null);
  const Animated = OVERVIEW_TAB_ANIMATED[tabId] || null;

  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      aria-current={active ? "page" : undefined}
      className={className}
      onClick={onClick}
      onMouseEnter={() => animRef.current?.startAnimation?.()}
      onMouseLeave={() => animRef.current?.stopAnimation?.()}
      data-guide={dataGuide}
      {...rest}
    >
      <span className={iconClassName} aria-hidden style={{ display: "inline-flex" }}>
        <EquipmentHoverIcon
          Animated={Animated}
          iconify={iconify}
          size={18}
          animRef={animRef}
        />
      </span>
      <span className={labelClassName}>{label}</span>
      {badge}
    </button>
  );
}

/** Icône famille (Internet, Pare-feu…) pour la nav secondaire. */
export function EnterpriseFamilyTypeIcon({
  typeId,
  iconify,
  className,
  size = 16,
  animRef: externalRef,
}) {
  const localRef = useRef(null);
  const animRef = externalRef || localRef;
  const baseType = String(typeId || "").startsWith("Custom:") ? null : typeId;
  const Animated = (baseType && CATEGORY_ANIMATED[baseType]) || null;

  return (
    <span className={className} aria-hidden style={{ display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
      <EquipmentHoverIcon
        Animated={Animated}
        iconify={iconify}
        size={size}
        animRef={animRef}
      />
    </span>
  );
}

export function useFamilyIconHover(typeId) {
  const animRef = useRef(null);
  return {
    animRef,
    onMouseEnter: () => animRef.current?.startAnimation?.(),
    onMouseLeave: () => animRef.current?.stopAnimation?.(),
  };
}

/** Bouton d’action rapide (éditer, ticket, planning…) avec icône animée. */
export function EnterpriseQuickActionButton({
  actionId,
  iconify,
  className,
  onClick,
  disabled = false,
  "aria-label": ariaLabel,
  "aria-pressed": ariaPressed,
  loading = false,
  loadingClassName,
  size = 18,
  ...rest
}) {
  const animRef = useRef(null);
  const Animated = QUICK_ACTION_ANIMATED[actionId] || null;

  return (
    <button
      type="button"
      className={className}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      aria-pressed={ariaPressed}
      onMouseEnter={() => !disabled && !loading && animRef.current?.startAnimation?.()}
      onMouseLeave={() => animRef.current?.stopAnimation?.()}
      {...rest}
    >
      {loading ? (
        <Icon icon="mdi:loading" className={loadingClassName} aria-hidden />
      ) : (
        <EquipmentHoverIcon
          Animated={Animated}
          iconify={iconify}
          size={size}
          animRef={animRef}
        />
      )}
    </button>
  );
}
