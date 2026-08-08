import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { interpolate } from "../../i18n/translate";
import styles from "./RoleTagsSelect.module.css";
const DROPDOWN_GAP = 6;
const DROPDOWN_MAX_HEIGHT = 280;
function getDropdownMountNode() {
  return document.getElementById("modal-root") || document.body;
}
function normalizeOption(option) {
  if (option && typeof option === "object" && option.value != null) {
    return {
      value: String(option.value),
      label: String(option.label ?? option.value)
    };
  }
  const value = String(option ?? "");
  return {
    value,
    label: value
  };
}
export default function RoleTagsSelect({
  options = [],
  groups,
  value = [],
  onChange,
  placeholder = "Select roles",
  disabled = false,
  widgetsCopy = {}
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [dropdownStyle, setDropdownStyle] = useState(null);
  const wrapperRef = useRef(null);
  const controlRef = useRef(null);
  const dropdownRef = useRef(null);
  const selectedValues = Array.isArray(value) ? value : value ? [value] : [];
  const roleGroups = useMemo(() => {
    if (Array.isArray(groups) && groups.length > 0) {
      return groups.map(group => ({
        label: group.label ?? null,
        options: (group.options || []).map(normalizeOption)
      }));
    }
    return [{
      label: null,
      options: (options || []).map(normalizeOption)
    }];
  }, [groups, options]);
  const labelByValue = useMemo(() => {
    const map = new Map();
    roleGroups.forEach(group => {
      group.options.forEach(option => {
        map.set(option.value, option.label);
      });
    });
    return map;
  }, [roleGroups]);
  const allOptionValues = useMemo(() => roleGroups.flatMap(group => group.options.map(option => option.value)), [roleGroups]);
  const legacySelected = useMemo(() => selectedValues.filter(role => !allOptionValues.includes(role)), [selectedValues, allOptionValues]);
  const visibleGroups = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return roleGroups.map(group => ({
      ...group,
      options: group.options.filter(option => !query || option.label.toLowerCase().includes(query) || option.value.toLowerCase().includes(query))
    })).filter(group => group.options.length > 0);
  }, [roleGroups, searchTerm]);
  const updateDropdownPosition = useCallback(() => {
    const control = controlRef.current;
    if (!control) return;
    const rect = control.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom - DROPDOWN_GAP;
    const spaceAbove = rect.top - DROPDOWN_GAP;
    const openUpward = spaceBelow < 160 && spaceAbove > spaceBelow;
    const availableSpace = openUpward ? spaceAbove : spaceBelow;
    const maxHeight = Math.min(DROPDOWN_MAX_HEIGHT, Math.max(140, availableSpace - 8));
    setDropdownStyle({
      position: "fixed",
      left: rect.left,
      width: rect.width,
      maxHeight,
      zIndex: "calc(var(--modal-overlay-z-index, 1100) + 80)",
      ...(openUpward ? {
        bottom: window.innerHeight - rect.top + DROPDOWN_GAP
      } : {
        top: rect.bottom + DROPDOWN_GAP
      })
    });
  }, []);
  useLayoutEffect(() => {
    if (!isOpen) {
      setDropdownStyle(null);
      return;
    }
    updateDropdownPosition();
  }, [isOpen, searchTerm, selectedValues.length, updateDropdownPosition]);
  useEffect(() => {
    if (!isOpen) return;
    const handleScrollOrResize = () => updateDropdownPosition();
    window.addEventListener("resize", handleScrollOrResize);
    window.addEventListener("scroll", handleScrollOrResize, true);
    return () => {
      window.removeEventListener("resize", handleScrollOrResize);
      window.removeEventListener("scroll", handleScrollOrResize, true);
    };
  }, [isOpen, updateDropdownPosition]);
  useEffect(() => {
    const handleClickOutside = event => {
      const target = event.target;
      if (wrapperRef.current?.contains(target) || dropdownRef.current?.contains(target)) {
        return;
      }
      setIsOpen(false);
      setSearchTerm("");
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  const toggleOption = optionValue => {
    if (disabled) return;
    const next = selectedValues.includes(optionValue) ? selectedValues.filter(item => item !== optionValue) : [...selectedValues, optionValue];
    onChange(next);
  };
  const removeTag = tag => {
    if (disabled) return;
    onChange(selectedValues.filter(item => item !== tag));
  };
  const renderOption = option => {
    const isSelected = selectedValues.includes(option.value);
    return <button key={option.value} type="button" className={`${styles.option} ${isSelected ? styles.optionSelected : ""}`} onClick={() => toggleOption(option.value)}>
        <input type="checkbox" readOnly checked={isSelected} tabIndex={-1} />
        <span>{option.label}</span>
      </button>;
  };
  const dropdown = isOpen && !disabled && dropdownStyle ? createPortal(<div ref={dropdownRef} className={`${styles.dropdown} ${styles.dropdownPortal}`} style={dropdownStyle}>
            {visibleGroups.length === 0 && legacySelected.length === 0 ? <div className={styles.emptyOption}>
                {widgetsCopy.noMatch || "No matching role"}
              </div> : <>
                {legacySelected.length > 0 && <div className={styles.group}>
                    <div className={styles.groupLabel}>
                      {widgetsCopy.savedRoles || "Saved roles"}
                    </div>
                    {legacySelected.map(option => renderOption({
          value: option,
          label: labelByValue.get(option) || option
        }))}
                  </div>}
                {visibleGroups.map(group => <div key={group.label || "default"} className={styles.group}>
                    {group.label ? <div className={styles.groupLabel}>{group.label}</div> : null}
                    {group.options.map(option => renderOption(option))}
                  </div>)}
              </>}
          </div>, getDropdownMountNode()) : null;
  return <div className={styles.wrapper} ref={wrapperRef}>
      <div ref={controlRef} className={styles.control} onClick={() => {
      if (disabled) return;
      setIsOpen(true);
    }}>
        {selectedValues.map(tag => <span key={tag} className={styles.tag}>
            {labelByValue.get(tag) || tag}
            {!disabled && <button type="button" className={styles.tagRemove} onClick={e => {
          e.stopPropagation();
          removeTag(tag);
        }} aria-label={interpolate(widgetsCopy.removeAria || "Remove {label}", {
          label: labelByValue.get(tag) || tag
        })}>
                ×
              </button>}
          </span>)}
        {!disabled && <input type="text" className={styles.searchInput} placeholder={selectedValues.length === 0 ? placeholder : widgetsCopy.filterPlaceholder || "Filter…"} value={searchTerm} onChange={e => {
        setSearchTerm(e.target.value);
        setIsOpen(true);
      }} onFocus={() => setIsOpen(true)} onClick={e => e.stopPropagation()} />}
      </div>
      {dropdown}
    </div>;
}
