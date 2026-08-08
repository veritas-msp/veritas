import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import formStyles from "../EnterprisesPage/EnterpriseFormModal.module.css";
function normalizeSiteQuery(value) {
  return String(value || "").normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim();
}
export default function SiteSuggestInput({
  id,
  value = "",
  onChange,
  sites = [],
  placeholder = "Search or enter a location…",
  inputClassName,
  inputStyle,
  disabled = false,
  allowEmpty = true,
  emptyLabel = "No location"
}) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState(null);
  const wrapRef = useRef(null);
  const inputRef = useRef(null);
  const uniqueSites = useMemo(() => {
    const seen = new Set();
    (Array.isArray(sites) ? sites : []).forEach(site => {
      const trimmed = String(site || "").trim();
      if (trimmed && trimmed !== "Sans site") seen.add(trimmed);
    });
    const current = String(value || "").trim();
    if (current && current !== "Sans site") seen.add(current);
    return Array.from(seen).sort((a, b) => a.localeCompare(b, "en-GB"));
  }, [sites, value]);
  const filteredSites = useMemo(() => {
    const query = normalizeSiteQuery(value);
    if (!query) return uniqueSites.slice(0, 25);
    return uniqueSites.filter(site => normalizeSiteQuery(site).includes(query)).slice(0, 25);
  }, [uniqueSites, value]);
  const updateDropdownCoords = () => {
    const el = inputRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setCoords({
      top: rect.bottom + 4,
      left: rect.left,
      width: rect.width,
      maxHeight: Math.min(220, Math.max(120, window.innerHeight - rect.bottom - 12))
    });
  };
  useLayoutEffect(() => {
    if (!open) return undefined;
    updateDropdownCoords();
    const handleReposition = () => updateDropdownCoords();
    window.addEventListener("resize", handleReposition);
    window.addEventListener("scroll", handleReposition, true);
    return () => {
      window.removeEventListener("resize", handleReposition);
      window.removeEventListener("scroll", handleReposition, true);
    };
  }, [open, value]);
  useEffect(() => {
    if (!open) return undefined;
    const handleClickOutside = event => {
      if (wrapRef.current?.contains(event.target)) return;
      if (event.target.closest("[data-site-suggest-dropdown]")) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);
  const inputClass = inputClassName || formStyles.input;
  const dropdown = open && coords && createPortal(<div data-site-suggest-dropdown className={formStyles.dropdown} style={{
    position: "fixed",
    top: coords.top,
    left: coords.left,
    width: coords.width,
    maxHeight: coords.maxHeight,
    zIndex: "var(--modal-dropdown-z-index, 11250)"
  }} role="listbox" aria-label="Location suggestions">
        {allowEmpty ? <button type="button" className={`${formStyles.dropdownOption} ${!String(value || "").trim() ? formStyles.dropdownOptionSelected : ""}`} onMouseDown={event => event.preventDefault()} onClick={() => {
      onChange("");
      setOpen(false);
    }}>
            {emptyLabel}
          </button> : null}
        {filteredSites.length === 0 ? <div className={formStyles.dropdownEmpty}>
            {String(value || "").trim() ? "No matching location · free-form entry is retained" : "No location saved for this client"}
          </div> : filteredSites.map(site => <button key={site} type="button" className={`${formStyles.dropdownOption} ${String(value || "").trim() === site ? formStyles.dropdownOptionSelected : ""}`} onMouseDown={event => event.preventDefault()} onClick={() => {
      onChange(site);
      setOpen(false);
    }}>
              {site}
            </button>)}
      </div>, document.body);
  return <>
      <div className={formStyles.autocomplete} ref={wrapRef}>
        <input ref={inputRef} id={id} type="text" className={inputClass} style={inputStyle} value={value ?? ""} onChange={event => {
        onChange(event.target.value);
        setOpen(true);
      }} onFocus={() => setOpen(true)} placeholder={placeholder} disabled={disabled} autoComplete="off" role="combobox" aria-expanded={open} aria-autocomplete="list" />
      </div>
      {dropdown}
    </>;
}
