import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";
import ProFeatureBadge from "../Misc/ProFeature/ProFeatureBadge";
import { MACRO_ACTION_ICONS } from "./MacroFormModal";
import styles from "./MacroFormModal.module.css";
import { getModalDropdownZIndex } from "../../utils/dropdownPortal";
const MENU_MAX_HEIGHT = 320;
function isMacroActionOptionDisabled(opt, {
  isCommunity,
  isTeamsIntegrationActive,
  macroWebhookOptionsCount
}) {
  if (isCommunity && opt.proOnly) return true;
  if (opt.value === "teams_message" && !isCommunity && !isTeamsIntegrationActive && macroWebhookOptionsCount === 0) {
    return true;
  }
  return false;
}
export default function MacroActionTypePicker({
  value,
  options = [],
  onChange,
  isCommunity = false,
  macroWebhookOptionsCount = 0,
  isTeamsIntegrationActive = false,
  triggerClassName = ""
}) {
  const [open, setOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState(null);
  const rootRef = useRef(null);
  const triggerRef = useRef(null);
  const menuRef = useRef(null);
  const updateMenuPosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const maxMenuHeight = Math.min(MENU_MAX_HEIGHT, window.innerHeight * 0.42);
    const spaceBelow = window.innerHeight - rect.bottom - 8;
    const spaceAbove = rect.top - 8;
    const openUp = spaceBelow < Math.min(maxMenuHeight, 180) && spaceAbove > spaceBelow;
    const menuHeight = openUp ? Math.min(maxMenuHeight, spaceAbove) : Math.min(maxMenuHeight, spaceBelow);
    setMenuStyle({
      position: "fixed",
      left: rect.left,
      width: rect.width,
      zIndex: getModalDropdownZIndex(),
      maxHeight: Math.max(120, menuHeight),
      pointerEvents: "auto",
      ...(openUp ? {
        top: rect.top - 6,
        transform: "translateY(-100%)"
      } : {
        top: rect.bottom + 6
      })
    });
  }, []);
  useLayoutEffect(() => {
    if (!open) {
      setMenuStyle(null);
      return undefined;
    }
    updateMenuPosition();
    return undefined;
  }, [open, updateMenuPosition]);
  useEffect(() => {
    if (!open) return undefined;
    const onDocPointerDown = event => {
      const target = event.target;
      if (rootRef.current?.contains(target) || menuRef.current?.contains(target)) {
        return;
      }
      setOpen(false);
    };
    const onEscape = event => {
      if (event.key === "Escape") setOpen(false);
    };
    const onReposition = () => updateMenuPosition();
    document.addEventListener("pointerdown", onDocPointerDown);
    document.addEventListener("keydown", onEscape);
    window.addEventListener("resize", onReposition);
    window.addEventListener("scroll", onReposition, true);
    return () => {
      document.removeEventListener("pointerdown", onDocPointerDown);
      document.removeEventListener("keydown", onEscape);
      window.removeEventListener("resize", onReposition);
      window.removeEventListener("scroll", onReposition, true);
    };
  }, [open, updateMenuPosition]);
  const selected = options.find(opt => opt.value === value) || options[0];
  const selectedIcon = MACRO_ACTION_ICONS[value] || "mdi:lightning-bolt-outline";
  const menuNode = open ? <ul ref={menuRef} className={styles.actionTypeMenu} style={menuStyle || {
    position: "fixed",
    top: 0,
    left: 0,
    width: 280,
    visibility: "hidden",
    pointerEvents: "none",
    zIndex: getModalDropdownZIndex()
  }} role="listbox" aria-label="Action type">
      {options.map(opt => {
      const disabled = isMacroActionOptionDisabled(opt, {
        isCommunity,
        isTeamsIntegrationActive,
        macroWebhookOptionsCount
      });
      const isSelected = opt.value === value;
      const showWebhookHint = opt.value === "teams_message" && disabled && !isCommunity && macroWebhookOptionsCount === 0;
      const icon = MACRO_ACTION_ICONS[opt.value] || "mdi:lightning-bolt-outline";
      return <li key={opt.value} role="presentation">
            <button type="button" role="option" aria-selected={isSelected} aria-disabled={disabled} disabled={disabled} className={`${styles.actionTypeOption} ${isSelected ? styles.actionTypeOptionActive : ""} ${disabled ? styles.actionTypeOptionDisabled : ""}`} onClick={() => {
          if (disabled) return;
          onChange(opt.value);
          setOpen(false);
        }}>
              <Icon icon={icon} className={styles.actionTypeOptionIcon} aria-hidden />
              <span className={styles.actionTypeOptionText}>
                <span className={styles.actionTypeOptionLabel}>{opt.label}</span>
                {showWebhookHint ? <span className={styles.actionTypeOptionHint}>Webhook required</span> : null}
              </span>
              {opt.proOnly ? <ProFeatureBadge variant="inline" className={styles.actionTypeProBadge} /> : null}
            </button>
          </li>;
    })}
    </ul> : null;
  return <div className={styles.actionTypePicker} ref={rootRef}>
      <button ref={triggerRef} type="button" className={`${styles.actionTypeTrigger} ${triggerClassName}`.trim()} onClick={() => setOpen(prev => !prev)} aria-haspopup="listbox" aria-expanded={open}>
        <span className={styles.actionTypeTriggerMain}>
          <Icon icon={selectedIcon} className={styles.actionTypeTriggerIcon} aria-hidden />
          <span className={styles.actionTypeTriggerLabel}>{selected?.label || "Action"}</span>
          {selected?.proOnly ? <ProFeatureBadge variant="inline" className={styles.actionTypeProBadge} /> : null}
        </span>
        <Icon icon={open ? "mdi:chevron-up" : "mdi:chevron-down"} className={styles.actionTypeChevron} aria-hidden />
      </button>

      {menuNode ? createPortal(menuNode, document.body) : null}
    </div>;
}
