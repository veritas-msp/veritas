import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";
import { getModalDropdownZIndex } from "../../utils/dropdownPortal";
import formStyles from "../EnterprisesPage/EnterpriseFormModal.module.css";
import { getOsIconName } from "./osIconUtils";
import styles from "./OsSystemSelect.module.css";

const DROPDOWN_GAP = 2;
const DROPDOWN_MAX_HEIGHT = 280;

function getGroupIconName(groupLabel) {
  const raw = String(groupLabel || "").toLowerCase();
  if (!raw) return "mdi:desktop-classic";
  if (raw.includes("windows")) return "mdi:microsoft-windows";
  if (raw.includes("ubuntu")) return "logos:ubuntu";
  if (raw.includes("debian")) return "logos:debian";
  if (raw.includes("redhat") || raw.includes("red hat") || raw.includes("rhel")) return "logos:redhat-icon";
  if (raw.includes("centos")) return "logos:centos";
  if (raw.includes("suse")) return "logos:suse";
  if (raw.includes("hyper") || raw.includes("virtual") || raw.includes("proxmox") || raw.includes("vmware")) {
    return "mdi:server-network";
  }
  if (raw.includes("other") || raw.includes("autre")) return "mdi:dots-horizontal";
  return "mdi:desktop-classic";
}

function OsOptionRow({ label, selected, onSelect, iconName }) {
  return (
    <button
      type="button"
      className={`${styles.option} ${selected ? styles.optionSelected : ""}`}
      onMouseDown={event => event.preventDefault()}
      onClick={onSelect}
      role="option"
      aria-selected={selected}
    >
      {iconName ? (
        <Icon icon={iconName} className={styles.optionIcon} width={18} height={18} aria-hidden />
      ) : (
        <span className={styles.optionIconSpacer} aria-hidden />
      )}
      <span className={styles.optionLabel}>{label}</span>
    </button>
  );
}

export default function OsSystemSelect({
  id,
  value = "",
  onChange,
  groups = [],
  emptyLabel = "—",
  currentValueSuffix = "(current)",
  disabled = false
}) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState(null);
  const wrapRef = useRef(null);
  const triggerRef = useRef(null);
  const dropdownRef = useRef(null);

  const knownValues = useMemo(() => {
    const set = new Set();
    (groups || []).forEach(group => {
      (group.options || []).forEach(os => set.add(String(os)));
    });
    return set;
  }, [groups]);

  const selectedLabel = String(value || "").trim();
  const selectedIcon = selectedLabel ? getOsIconName(selectedLabel, { withFallback: true }) : null;
  const isLegacyValue = Boolean(selectedLabel && !knownValues.has(selectedLabel));

  const updateCoords = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom - DROPDOWN_GAP;
    const spaceAbove = rect.top - DROPDOWN_GAP;
    const openUp = spaceBelow < 180 && spaceAbove > spaceBelow;
    const available = openUp ? spaceAbove : spaceBelow;
    const maxHeight = Math.min(DROPDOWN_MAX_HEIGHT, Math.max(140, available - 8));
    setCoords({
      left: rect.left,
      width: rect.width,
      maxHeight,
      top: openUp ? undefined : rect.bottom + DROPDOWN_GAP,
      bottom: openUp ? window.innerHeight - rect.top + DROPDOWN_GAP : undefined
    });
  }, []);

  useLayoutEffect(() => {
    if (!open) {
      setCoords(null);
      return undefined;
    }
    updateCoords();
    const handleReposition = () => updateCoords();
    window.addEventListener("resize", handleReposition);
    window.addEventListener("scroll", handleReposition, true);
    return () => {
      window.removeEventListener("resize", handleReposition);
      window.removeEventListener("scroll", handleReposition, true);
    };
  }, [open, updateCoords]);

  useEffect(() => {
    if (!open) return undefined;
    const handleClickOutside = event => {
      const target = event.target;
      if (wrapRef.current?.contains(target) || dropdownRef.current?.contains(target)) return;
      setOpen(false);
    };
    const handleKey = event => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  const pick = next => {
    onChange?.(next);
    setOpen(false);
  };

  const dropdown =
    open && coords && !disabled
      ? createPortal(
          <div
            ref={dropdownRef}
            className={`${formStyles.dropdownPortal} ${styles.dropdown}`}
            style={{
              position: "fixed",
              top: coords.top,
              bottom: coords.bottom,
              left: coords.left,
              width: coords.width,
              maxHeight: coords.maxHeight,
              zIndex: getModalDropdownZIndex()
            }}
            role="listbox"
            aria-labelledby={id ? `${id}-label` : undefined}
          >
            <OsOptionRow
              label={emptyLabel}
              selected={!selectedLabel}
              onSelect={() => pick("")}
              iconName={null}
            />
            {isLegacyValue ? (
              <div className={styles.group}>
                <div className={styles.groupLabel}>
                  <Icon icon={selectedIcon || "mdi:desktop-classic"} className={styles.groupIcon} width={14} height={14} aria-hidden />
                  <span>Current</span>
                </div>
                <OsOptionRow
                  label={`${selectedLabel} ${currentValueSuffix}`.trim()}
                  selected
                  onSelect={() => pick(selectedLabel)}
                  iconName={selectedIcon}
                />
              </div>
            ) : null}
            {(groups || []).map(group => {
              const groupIcon = getGroupIconName(group.label);
              return (
                <div key={group.label || "default"} className={styles.group}>
                  {group.label ? (
                    <div className={styles.groupLabel}>
                      <Icon icon={groupIcon} className={styles.groupIcon} width={14} height={14} aria-hidden />
                      <span>{group.label}</span>
                    </div>
                  ) : null}
                  {(group.options || []).map(os => {
                    const osValue = String(os);
                    return (
                      <OsOptionRow
                        key={osValue}
                        label={osValue}
                        selected={selectedLabel === osValue}
                        onSelect={() => pick(osValue)}
                        iconName={getOsIconName(osValue, { withFallback: true })}
                      />
                    );
                  })}
                </div>
              );
            })}
          </div>,
          document.body
        )
      : null;

  return (
    <>
      <div className={styles.wrap} ref={wrapRef}>
        <button
          ref={triggerRef}
          id={id}
          type="button"
          className={`${formStyles.input} ${styles.trigger}`}
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={open}
          onClick={() => {
            if (disabled) return;
            setOpen(prev => !prev);
          }}
        >
          <span className={styles.triggerMain}>
            {selectedLabel ? (
              <>
                {selectedIcon ? (
                  <Icon icon={selectedIcon} className={styles.triggerIcon} width={18} height={18} aria-hidden />
                ) : null}
                <span className={styles.triggerLabel}>{selectedLabel}</span>
              </>
            ) : (
              <span className={styles.triggerPlaceholder}>{emptyLabel}</span>
            )}
          </span>
          <Icon icon="mdi:chevron-down" className={styles.chevron} width={18} height={18} aria-hidden />
        </button>
      </div>
      {dropdown}
    </>
  );
}
