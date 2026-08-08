import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { getActivitySectorLabel, getActivitySectorOptions, getActivitySectorUiCopy, normalizeActivitySectorDisplay } from "../../constants/activitySectors";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import styles from "./ActivitySectorSelect.module.css";
const DROPDOWN_MAX_HEIGHT = 220;
function computeDropdownStyle(inputEl) {
  if (!inputEl) return null;
  const rect = inputEl.getBoundingClientRect();
  const spaceBelow = window.innerHeight - rect.bottom - 8;
  const spaceAbove = rect.top - 8;
  const openUpward = spaceBelow < 160 && spaceAbove > spaceBelow;
  const maxHeight = Math.min(DROPDOWN_MAX_HEIGHT, Math.max(120, openUpward ? spaceAbove : spaceBelow));
  return {
    position: "fixed",
    left: rect.left,
    width: rect.width,
    top: openUpward ? undefined : rect.bottom + 4,
    bottom: openUpward ? window.innerHeight - rect.top + 4 : undefined,
    maxHeight,
    zIndex: "var(--floating-menu-z-index, 13000)"
  };
}
export default function ActivitySectorSelect({
  id,
  value,
  onChange,
  className,
  placeholder,
  required = false,
  disabled = false
}) {
  const locale = useAppLocale();
  const ui = useMemo(() => getActivitySectorUiCopy(locale), [locale]);
  const wrapRef = useRef(null);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(() => normalizeActivitySectorDisplay(value, locale) || "");
  const [highlight, setHighlight] = useState(0);
  const [dropdownStyle, setDropdownStyle] = useState(null);
  const updateDropdownPosition = useCallback(() => {
    setDropdownStyle(computeDropdownStyle(inputRef.current));
  }, []);
  useEffect(() => {
    setQuery(normalizeActivitySectorDisplay(value, locale) || "");
  }, [value, locale]);
  useEffect(() => {
    if (!open) return undefined;
    updateDropdownPosition();
    const onDocMouseDown = event => {
      if (!wrapRef.current?.contains(event.target) && !dropdownRef.current?.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocMouseDown);
    window.addEventListener("resize", updateDropdownPosition);
    window.addEventListener("scroll", updateDropdownPosition, true);
    return () => {
      document.removeEventListener("mousedown", onDocMouseDown);
      window.removeEventListener("resize", updateDropdownPosition);
      window.removeEventListener("scroll", updateDropdownPosition, true);
    };
  }, [open, updateDropdownPosition]);
  const options = useMemo(() => {
    const base = getActivitySectorOptions(locale, value);
    const q = query.trim().toLowerCase();
    if (!q) return base;
    return base.filter(sector => sector.toLowerCase().includes(q));
  }, [query, value, locale]);
  useEffect(() => {
    setHighlight(0);
  }, [options.length, query]);
  const emitChange = nextValue => {
    onChange?.({
      target: {
        value: nextValue
      }
    });
  };
  const pickOption = sector => {
    setQuery(sector);
    emitChange(sector);
    setOpen(false);
  };
  const handleKeyDown = event => {
    if (!open && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
      setOpen(true);
      return;
    }
    if (event.key === "Escape") {
      setOpen(false);
      return;
    }
    if (!open || options.length === 0) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setHighlight(index => (index + 1) % options.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlight(index => (index - 1 + options.length) % options.length);
    } else if (event.key === "Enter") {
      event.preventDefault();
      pickOption(options[highlight]);
    }
  };
  const handleBlur = () => {
    const trimmed = query.trim();
    if (!trimmed) {
      emitChange("");
      return;
    }
    const normalized = getActivitySectorLabel(trimmed, locale);
    if (normalized !== query) {
      setQuery(normalized);
    }
    if (normalized !== (value || "")) {
      emitChange(normalized);
    }
  };
  const dropdown = open && dropdownStyle ? createPortal(<div id={`${id}-sector-listbox`} ref={dropdownRef} className={styles.dropdown} style={dropdownStyle} role="listbox">
            {options.length === 0 ? <div className={styles.empty}>{ui.empty}</div> : options.map((sector, index) => <button key={sector} type="button" role="option" aria-selected={index === highlight} className={`${styles.option} ${index === highlight ? styles.optionSelected : ""}`} onMouseDown={event => event.preventDefault()} onMouseEnter={() => setHighlight(index)} onClick={() => pickOption(sector)}>
                  {sector}
                </button>)}
          </div>, document.body) : null;
  return <div className={styles.wrap} ref={wrapRef}>
      <input ref={inputRef} id={id} type="text" className={className} value={query} placeholder={placeholder ?? ui.placeholder} required={required} disabled={disabled} autoComplete="off" role="combobox" aria-expanded={open} aria-autocomplete="list" aria-controls={open ? `${id}-sector-listbox` : undefined} onFocus={() => setOpen(true)} onBlur={handleBlur} onChange={event => {
      const next = event.target.value;
      setQuery(next);
      emitChange(next);
      setOpen(true);
    }} onKeyDown={handleKeyDown} />
      {dropdown}
    </div>;
}
