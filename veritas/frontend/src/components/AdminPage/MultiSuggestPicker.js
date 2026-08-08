import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";
import { getModalDropdownZIndex } from "../../utils/dropdownPortal";
import s from "../TicketPage/TicketCreatePage.module.css";
const DROPDOWN_MAX_HEIGHT = 260;
export default function MultiSuggestPicker({
  label,
  placeholder = "Search…",
  options = [],
  selectedIds = [],
  onChange,
  emptyHint = "No selection",
  inputId,
  singleSelect = false
}) {
  const rootRef = useRef(null);
  const anchorRef = useRef(null);
  const menuRef = useRef(null);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const [menuStyle, setMenuStyle] = useState(null);
  const updateMenuPosition = useCallback(() => {
    const anchor = anchorRef.current;
    if (!anchor) return;
    const rect = anchor.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom - 8;
    const spaceAbove = rect.top - 8;
    const openUp = spaceBelow < 160 && spaceAbove > spaceBelow;
    const maxHeight = Math.max(120, Math.min(DROPDOWN_MAX_HEIGHT, openUp ? spaceAbove : spaceBelow));
    setMenuStyle({
      position: "fixed",
      left: rect.left,
      width: rect.width,
      zIndex: getModalDropdownZIndex(),
      maxHeight,
      pointerEvents: "auto",
      ...(openUp ? {
        top: rect.top - 4,
        transform: "translateY(-100%)"
      } : {
        top: rect.bottom - 1
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
    const handleClickOutside = event => {
      const target = event.target;
      if (rootRef.current?.contains(target) || menuRef.current?.contains(target)) {
        return;
      }
      setOpen(false);
    };
    const onReposition = () => updateMenuPosition();
    document.addEventListener("pointerdown", handleClickOutside);
    window.addEventListener("resize", onReposition);
    window.addEventListener("scroll", onReposition, true);
    return () => {
      document.removeEventListener("pointerdown", handleClickOutside);
      window.removeEventListener("resize", onReposition);
      window.removeEventListener("scroll", onReposition, true);
    };
  }, [open, updateMenuPosition]);
  const selectedSet = useMemo(() => new Set(selectedIds.map(String)), [selectedIds]);
  const labelById = useMemo(() => {
    const map = new Map();
    options.forEach(option => map.set(String(option.id), option.label));
    selectedIds.forEach(id => {
      const key = String(id);
      if (!map.has(key)) map.set(key, key);
    });
    return map;
  }, [options, selectedIds]);
  const filteredOptions = useMemo(() => {
    const query = search.trim().toLowerCase();
    const available = options.filter(option => !selectedSet.has(String(option.id)));
    if (!query) return available.slice(0, 50);
    return available.filter(option => {
      const haystack = `${option.label} ${option.hint || ""} ${option.id}`.toLowerCase();
      return haystack.includes(query);
    }).slice(0, 50);
  }, [options, search, selectedSet]);
  useEffect(() => {
    setHighlight(0);
  }, [search, open]);
  const addOption = useCallback(id => {
    const key = String(id || "").trim();
    if (!key || selectedSet.has(key)) return;
    onChange?.(singleSelect ? [key] : [...selectedIds.map(String), key]);
    setSearch("");
    setOpen(false);
  }, [onChange, selectedIds, selectedSet, singleSelect]);
  const removeOption = useCallback(id => {
    onChange?.(selectedIds.filter(item => String(item) !== String(id)));
  }, [onChange, selectedIds]);
  const inputLabelId = inputId ? `${inputId}-label` : undefined;
  const dropdownNode = open ? <div ref={menuRef} className={s.contactDropdownPortal} style={menuStyle || {
    position: "fixed",
    top: 0,
    left: 0,
    width: 280,
    visibility: "hidden",
    pointerEvents: "none",
    zIndex: getModalDropdownZIndex()
  }} role="listbox" aria-labelledby={inputLabelId}>
      {filteredOptions.length === 0 ? <div className={s.contactEmpty}>No results</div> : filteredOptions.map((option, index) => <button key={String(option.id)} type="button" role="option" aria-selected={false} className={`${s.contactOption} ${highlight === index ? s.contactOptionActive : ""}`} onMouseEnter={() => setHighlight(index)} onClick={() => addOption(option.id)}>
            <span className={s.contactOptionName}>{option.label}</span>
            {option.hint ? <span className={s.contactOptionMeta}>{option.hint}</span> : null}
          </button>)}
    </div> : null;
  return <div className={s.equipmentField}>
      {label && <label className={s.equipmentFieldLabel} id={inputLabelId}>
          {label}
        </label>}
      <div className={s.contactPicker} ref={rootRef}>
        <div ref={anchorRef} className={`${s.contactInputWrap} ${open ? s.contactInputWrapOpen : ""}`}>
          <Icon icon="mdi:magnify" className={s.contactInputIcon} aria-hidden />
          <input id={inputId} type="text" className={s.contactInput} value={search} placeholder={placeholder} autoComplete="off" aria-labelledby={inputLabelId} aria-expanded={open} aria-haspopup="listbox" aria-autocomplete="list" onChange={e => {
          setSearch(e.target.value);
          setOpen(true);
        }} onFocus={() => setOpen(true)} onKeyDown={e => {
          if (!open || filteredOptions.length === 0) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setHighlight(current => Math.min(current + 1, filteredOptions.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setHighlight(current => Math.max(current - 1, 0));
          } else if (e.key === "Enter") {
            e.preventDefault();
            const picked = filteredOptions[highlight];
            if (picked) addOption(picked.id);
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }} />
        </div>
      </div>
      {dropdownNode ? createPortal(dropdownNode, document.body) : null}
      <div className={s.chipsWrap}>
        {selectedIds.length === 0 ? <span className={s.emptyChipHint}>{emptyHint}</span> : selectedIds.map(id => <span key={String(id)} className={s.chip}>
              {labelById.get(String(id)) || String(id)}
              <button type="button" onClick={() => removeOption(id)} aria-label={`Remove ${labelById.get(String(id)) || id}`}>
                ×
              </button>
            </span>)}
      </div>
    </div>;
}
