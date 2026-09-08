import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { FaPlus } from "react-icons/fa";
import { fetchTicketTags } from "../../api/tickets";
import { getModalDropdownZIndex } from "../../utils/dropdownPortal";
import heroStyles from "../EnterprisesPage/EnterpriseDetailPage.module.css";
import createStyles from "./TicketCreatePage.module.css";

function normalizeLabel(value) {
  return String(value || "").trim().toLowerCase();
}

export default function TicketTagSuggestField({
  assignedTags = [],
  placeholder = "Tag…",
  addAria = "Add a tag",
  confirmAria = "Confirm tag",
  createLabel = label => `Create “${label}”`,
  emptyHint = "No matching tag",
  disabled = false,
  onSubmit,
  onCancel
}) {
  const formRef = useRef(null);
  const inputRef = useRef(null);
  const menuRef = useRef(null);
  const [draft, setDraft] = useState("");
  const [catalog, setCatalog] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(true);
  const [highlight, setHighlight] = useState(0);
  const [menuStyle, setMenuStyle] = useState(null);
  const assignedSet = useMemo(() => new Set((Array.isArray(assignedTags) ? assignedTags : []).map(tag => normalizeLabel(tag?.label))), [assignedTags]);
  const suggestions = useMemo(() => {
    const query = normalizeLabel(draft);
    return (Array.isArray(catalog) ? catalog : []).filter(tag => {
      const label = normalizeLabel(tag?.label);
      if (!label || assignedSet.has(label)) return false;
      if (!query) return true;
      return label.includes(query);
    }).slice(0, 12);
  }, [catalog, assignedSet, draft]);
  const exactMatch = useMemo(() => {
    const query = normalizeLabel(draft);
    if (!query) return null;
    return suggestions.find(tag => normalizeLabel(tag.label) === query) || null;
  }, [suggestions, draft]);
  const canCreate = Boolean(draft.trim()) && !exactMatch && !assignedSet.has(normalizeLabel(draft));
  const optionCount = suggestions.length + (canCreate ? 1 : 0);
  const updateMenuPosition = useCallback(() => {
    const anchor = formRef.current;
    if (!anchor) return;
    const rect = anchor.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom - 8;
    const spaceAbove = rect.top - 8;
    const openUp = spaceBelow < 140 && spaceAbove > spaceBelow;
    const maxHeight = Math.max(120, Math.min(240, openUp ? spaceAbove : spaceBelow));
    setMenuStyle({
      position: "fixed",
      left: rect.left,
      width: Math.max(rect.width, 180),
      zIndex: getModalDropdownZIndex(),
      maxHeight,
      pointerEvents: "auto",
      ...(openUp ? {
        top: rect.top - 4,
        transform: "translateY(-100%)"
      } : {
        top: rect.bottom + 2
      })
    });
  }, []);
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchTicketTags({
      limit: 120
    }).then(rows => {
      if (!cancelled) setCatalog(Array.isArray(rows) ? rows : []);
    }).catch(() => {
      if (!cancelled) setCatalog([]);
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  useLayoutEffect(() => {
    if (!open) {
      setMenuStyle(null);
      return undefined;
    }
    updateMenuPosition();
    return undefined;
  }, [open, suggestions.length, canCreate, draft, updateMenuPosition]);
  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = event => {
      const target = event.target;
      if (formRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      onCancel?.();
    };
    const onReposition = () => updateMenuPosition();
    document.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("resize", onReposition);
    window.addEventListener("scroll", onReposition, true);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("resize", onReposition);
      window.removeEventListener("scroll", onReposition, true);
    };
  }, [open, onCancel, updateMenuPosition]);
  useEffect(() => {
    setHighlight(0);
  }, [draft, open]);
  useEffect(() => {
    inputRef.current?.focus();
  }, []);
  const pickSuggestion = useCallback(tag => {
    if (!tag?.label || disabled) return;
    onSubmit?.(String(tag.label).trim(), tag.color || null);
  }, [disabled, onSubmit]);
  const createFromDraft = useCallback(() => {
    const label = draft.trim();
    if (!label || disabled || assignedSet.has(normalizeLabel(label))) return;
    onSubmit?.(label, null);
  }, [assignedSet, disabled, draft, onSubmit]);
  const handleSubmit = event => {
    event.preventDefault();
    if (highlight < suggestions.length) {
      pickSuggestion(suggestions[highlight]);
      return;
    }
    if (canCreate) {
      createFromDraft();
      return;
    }
    if (exactMatch) pickSuggestion(exactMatch);
  };
  const dropdownNode = open ? <div ref={menuRef} className={createStyles.contactDropdownPortal} style={menuStyle || {
    position: "fixed",
    top: 0,
    left: 0,
    width: 200,
    visibility: "hidden",
    pointerEvents: "none",
    zIndex: getModalDropdownZIndex()
  }} role="listbox">
      {loading && suggestions.length === 0 && !canCreate ? <div className={createStyles.contactEmpty}>{emptyHint}</div> : null}
      {!loading && suggestions.length === 0 && !canCreate ? <div className={createStyles.contactEmpty}>{emptyHint}</div> : null}
      {suggestions.map((tag, index) => {
      const active = highlight === index;
      const color = tag.color || "#2b5fab";
      return <button key={tag.id || tag.label} type="button" role="option" aria-selected={active} className={`${createStyles.contactOption} ${active ? createStyles.contactOptionActive : ""}`} onMouseEnter={() => setHighlight(index)} onClick={() => pickSuggestion(tag)}>
            <span className={createStyles.contactOptionName} style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "0.4rem"
        }}>
              <span aria-hidden style={{
            width: 8,
            height: 8,
            borderRadius: 999,
            background: color,
            flexShrink: 0
          }} />
              {tag.label}
            </span>
          </button>;
    })}
      {canCreate ? <button type="button" role="option" aria-selected={highlight === suggestions.length} className={`${createStyles.contactOption} ${highlight === suggestions.length ? createStyles.contactOptionActive : ""}`} onMouseEnter={() => setHighlight(suggestions.length)} onClick={createFromDraft}>
          <span className={createStyles.contactOptionName}>{createLabel(draft.trim())}</span>
        </button> : null}
    </div> : null;
  return <>
      <form ref={formRef} className={heroStyles.heroTagFormCompact} onSubmit={handleSubmit}>
        <input ref={inputRef} type="text" className={heroStyles.heroTagInputCompact} placeholder={placeholder} value={draft} disabled={disabled} maxLength={64} aria-label={addAria} aria-expanded={open} aria-autocomplete="list" aria-haspopup="listbox" onChange={e => {
        setDraft(e.target.value);
        setOpen(true);
      }} onFocus={() => setOpen(true)} onKeyDown={e => {
        if (e.key === "Escape") {
          e.preventDefault();
          onCancel?.();
          return;
        }
        if (!open || optionCount === 0) return;
        if (e.key === "ArrowDown") {
          e.preventDefault();
          setHighlight(current => Math.min(current + 1, optionCount - 1));
        } else if (e.key === "ArrowUp") {
          e.preventDefault();
          setHighlight(current => Math.max(current - 1, 0));
        }
      }} />
        <button type="submit" className={heroStyles.heroTagConfirmBtn} disabled={disabled || !draft.trim()} aria-label={confirmAria}>
          <FaPlus />
        </button>
      </form>
      {dropdownNode ? createPortal(dropdownNode, document.body) : null}
    </>;
}
