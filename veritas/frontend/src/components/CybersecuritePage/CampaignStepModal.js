import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import React from "react";
import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";
import { FaTimes } from "react-icons/fa";
import layout from "../EnterprisesPage/EnterpriseFormModal.module.css";
import styles from "./CampaignStepModal.module.css";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { getCampaignDetailCopy } from "./campaignDetailI18n";
import { getModalDropdownZIndex } from "../../utils/dropdownPortal";

function useFixedAnchorRect(open, anchorRef) {
  const [coords, setCoords] = useState(null);
  const update = useCallback(() => {
    const el = anchorRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom - 8;
    const spaceAbove = rect.top - 8;
    const openUp = spaceBelow < 140 && spaceAbove > spaceBelow;
    const maxHeight = Math.min(260, Math.max(120, openUp ? spaceAbove : spaceBelow));
    setCoords({
      left: rect.left,
      width: rect.width,
      maxHeight,
      top: openUp ? undefined : rect.bottom - 1,
      bottom: openUp ? window.innerHeight - rect.top + 1 : undefined
    });
  }, [anchorRef]);
  useLayoutEffect(() => {
    if (!open) {
      setCoords(null);
      return undefined;
    }
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [open, update]);
  return coords;
}

function portalMenuStyle(coords) {
  if (!coords) return null;
  return {
    position: "fixed",
    top: coords.top,
    bottom: coords.bottom,
    left: coords.left,
    width: coords.width,
    maxHeight: coords.maxHeight,
    zIndex: getModalDropdownZIndex(),
    pointerEvents: "auto"
  };
}

function toDatetimeLocalValue(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const pad = n => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromDatetimeLocalValue(value) {
  const raw = String(value || "").trim();
  if (!raw) return null;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

function normalizeInitialAssigneeIds(initialData) {
  if (Array.isArray(initialData?.assigned_user_ids) && initialData.assigned_user_ids.length) {
    return initialData.assigned_user_ids.map(String).filter(Boolean);
  }
  if (Array.isArray(initialData?.assignees) && initialData.assignees.length) {
    return initialData.assignees.map(a => String(a?.id || "")).filter(Boolean);
  }
  if (initialData?.assigned_user_id) return [String(initialData.assigned_user_id)];
  return [];
}

const FORM_SECTIONS = [
  { id: "general", icon: "mdi:text-box-outline" },
  { id: "schedule", icon: "mdi:calendar-clock" },
  { id: "assignees", icon: "mdi:account-multiple-outline" }
];

export default function CampaignStepModal({
  mode,
  initialData,
  users = [],
  onSave,
  onClose,
  copy
}) {
  const locale = useAppLocale();
  const localCopy = useMemo(() => getCampaignDetailCopy(locale), [locale]);
  const detailCopy = copy || localCopy;
  const stepModal = detailCopy.stepModal || {};
  const isAdd = mode === "add" || mode === "create";

  const [activeSection, setActiveSection] = useState("general");
  const [name, setName] = useState("");
  const [startLocal, setStartLocal] = useState("");
  const [endLocal, setEndLocal] = useState("");
  const [assigneeIds, setAssigneeIds] = useState([]);
  const [assigneeSearch, setAssigneeSearch] = useState("");
  const [showAssigneeDropdown, setShowAssigneeDropdown] = useState(false);
  const [assigneeHighlight, setAssigneeHighlight] = useState(0);
  const [saving, setSaving] = useState(false);
  const assigneePickerRef = useRef(null);
  const assigneeListRef = useRef(null);
  const assigneeDropdownCoords = useFixedAnchorRect(showAssigneeDropdown, assigneePickerRef);

  useEffect(() => {
    setActiveSection("general");
    setName(initialData?.name || "");
    setStartLocal(
      toDatetimeLocalValue(initialData?.start_at) ||
        (initialData?.due_date && !initialData?.end_at ? `${String(initialData.due_date).slice(0, 10)}T09:00` : "")
    );
    setEndLocal(
      toDatetimeLocalValue(initialData?.end_at) ||
        (initialData?.due_date ? `${String(initialData.due_date).slice(0, 10)}T18:00` : "")
    );
    setAssigneeIds(normalizeInitialAssigneeIds(initialData));
    setAssigneeSearch("");
    setShowAssigneeDropdown(false);
    setAssigneeHighlight(0);
  }, [initialData, mode]);

  useEffect(() => {
    if (!showAssigneeDropdown) return undefined;
    const onDocClick = event => {
      if (
        !assigneePickerRef.current?.contains(event.target) &&
        !assigneeListRef.current?.contains(event.target)
      ) {
        setShowAssigneeDropdown(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [showAssigneeDropdown]);

  const userOptions = useMemo(
    () =>
      (Array.isArray(users) ? users : [])
        .filter(u => u?.id)
        .map(u => ({
          id: String(u.id),
          label: u.ticket_helpdesk_display_name || u.username || u.name || u.nom || u.email || ""
        }))
        .filter(u => u.id && u.label),
    [users]
  );

  const selectedAssignees = useMemo(
    () =>
      assigneeIds
        .map(id => userOptions.find(user => user.id === String(id)))
        .filter(Boolean),
    [assigneeIds, userOptions]
  );

  const availableAssigneeOptions = useMemo(
    () => userOptions.filter(user => !assigneeIds.includes(String(user.id))),
    [userOptions, assigneeIds]
  );

  const filteredAssigneeOptions = useMemo(() => {
    const q = assigneeSearch.trim().toLowerCase();
    if (!q) return [];
    return availableAssigneeOptions.filter(user => user.label.toLowerCase().includes(q)).slice(0, 12);
  }, [availableAssigneeOptions, assigneeSearch]);

  const sectionMeta = useMemo(
    () => ({
      general: Boolean(name.trim()),
      schedule: Boolean(startLocal || endLocal),
      assignees: assigneeIds.length > 0
    }),
    [name, startLocal, endLocal, assigneeIds]
  );

  const formSections = useMemo(
    () =>
      FORM_SECTIONS.map(section => ({
        ...section,
        label:
          section.id === "general"
            ? stepModal.sectionGeneral || "Général"
            : section.id === "schedule"
              ? stepModal.sectionSchedule || "Planning"
              : stepModal.sectionAssignees || "Assignations",
        description:
          section.id === "general"
            ? stepModal.sectionGeneralDesc || "Nom de la phase"
            : section.id === "schedule"
              ? stepModal.sectionScheduleDesc || "Début et fin"
              : stepModal.sectionAssigneesDesc || "Agents assignés"
      })),
    [stepModal]
  );

  const footerSummary = useMemo(() => {
    const titlePart = name.trim() || stepModal.footerUntitled || "—";
    const assigneePart =
      selectedAssignees.length > 0
        ? selectedAssignees.map(u => u.label).join(", ")
        : stepModal.assigneeNone || "Non assigné";
    const schedulePart =
      startLocal || endLocal
        ? stepModal.scheduled || "Planifié"
        : stepModal.unscheduled || "Sans date";
    return `${titlePart} · ${assigneePart} · ${schedulePart}`;
  }, [name, selectedAssignees, startLocal, endLocal, stepModal]);

  const addAssignee = id => {
    const value = String(id || "");
    if (!value || assigneeIds.includes(value)) return;
    setAssigneeIds(prev => [...prev, value]);
    setAssigneeSearch("");
    setShowAssigneeDropdown(false);
    setAssigneeHighlight(0);
  };

  const removeAssignee = id => {
    setAssigneeIds(prev => prev.filter(item => item !== String(id)));
  };

  const handleSubmit = async e => {
    e.preventDefault();
    if (!name.trim() || saving) return;
    const startAt = fromDatetimeLocalValue(startLocal);
    const endAt = fromDatetimeLocalValue(endLocal);
    if (startAt && endAt && new Date(endAt).getTime() < new Date(startAt).getTime()) {
      setActiveSection("schedule");
      return;
    }
    setSaving(true);
    try {
      await onSave({
        name: name.trim(),
        assigned_user_ids: assigneeIds,
        assigned_user_id: assigneeIds[0] || null,
        start_at: startAt,
        end_at: endAt,
        due_date: endAt ? endAt.slice(0, 10) : null,
        duration_hours:
          startAt && endAt
            ? Math.round(((new Date(endAt).getTime() - new Date(startAt).getTime()) / 36e5) * 100) / 100
            : null,
        completed: Boolean(initialData?.completed)
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const renderSectionContent = () => {
    switch (activeSection) {
      case "general":
        return (
          <>
            <div className={layout.sectionHead}>
              <h3 className={layout.sectionTitle}>{stepModal.sectionGeneralTitle || stepModal.name || "Général"}</h3>
              <p className={layout.sectionDesc}>{stepModal.sectionGeneralDesc || ""}</p>
            </div>
            <div className={layout.fieldStack}>
              <div className={`${layout.field} ${layout.fieldFull}`}>
                <label className={layout.label} htmlFor="campaign-step-name">
                  {stepModal.name} <span className={styles.required}>{stepModal.required || "*"}</span>
                </label>
                <input
                  id="campaign-step-name"
                  type="text"
                  className={layout.input}
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder={stepModal.namePlaceholder}
                  disabled={saving}
                  autoFocus
                  required
                />
              </div>
            </div>
          </>
        );
      case "schedule":
        return (
          <>
            <div className={layout.sectionHead}>
              <h3 className={layout.sectionTitle}>{stepModal.sectionScheduleTitle || stepModal.sectionSchedule || "Planning"}</h3>
              <p className={layout.sectionDesc}>{stepModal.sectionScheduleDesc || ""}</p>
            </div>
            <div className={layout.fieldGrid2}>
              <div className={layout.field}>
                <label className={layout.label} htmlFor="campaign-step-start">
                  {stepModal.startAt || "Date de début"}
                </label>
                <input
                  id="campaign-step-start"
                  type="datetime-local"
                  className={layout.input}
                  value={startLocal}
                  onChange={e => {
                    const next = e.target.value;
                    setStartLocal(next);
                    if (next && endLocal && endLocal < next) setEndLocal(next);
                  }}
                  disabled={saving}
                />
              </div>
              <div className={layout.field}>
                <label className={layout.label} htmlFor="campaign-step-end">
                  {stepModal.endAt || "Date de fin"}
                </label>
                <input
                  id="campaign-step-end"
                  type="datetime-local"
                  className={layout.input}
                  value={endLocal}
                  min={startLocal || undefined}
                  onChange={e => setEndLocal(e.target.value)}
                  disabled={saving}
                />
              </div>
            </div>
            {stepModal.scheduleHint ? <p className={styles.hint}>{stepModal.scheduleHint}</p> : null}
          </>
        );
      case "assignees":
        return (
          <>
            <div className={layout.sectionHead}>
              <h3 className={layout.sectionTitle}>{stepModal.sectionAssigneesTitle || stepModal.assignee || "Assignations"}</h3>
              <p className={layout.sectionDesc}>{stepModal.sectionAssigneesDesc || ""}</p>
            </div>
            <div className={layout.fieldStack}>
              <div className={`${layout.field} ${layout.fieldFull}`}>
                <label className={layout.label} htmlFor="campaign-step-assignee-search">
                  {stepModal.assignee || "Assigné à"}
                </label>
                <div className={styles.assigneePicker} ref={assigneePickerRef}>
                  <div className={`${styles.assigneeInputWrap} ${showAssigneeDropdown ? styles.assigneeInputWrapOpen : ""}`}>
                    <Icon icon="mdi:magnify" className={styles.assigneeInputIcon} aria-hidden />
                    <input
                      id="campaign-step-assignee-search"
                      type="text"
                      className={styles.assigneeInput}
                      value={assigneeSearch}
                      autoComplete="off"
                      placeholder={stepModal.searchAssignee || "Rechercher un agent…"}
                      disabled={saving}
                      aria-expanded={showAssigneeDropdown}
                      aria-haspopup="listbox"
                      onChange={e => {
                        setAssigneeSearch(e.target.value);
                        setShowAssigneeDropdown(true);
                        setAssigneeHighlight(0);
                      }}
                      onFocus={() => setShowAssigneeDropdown(true)}
                      onKeyDown={e => {
                        if (!showAssigneeDropdown || filteredAssigneeOptions.length === 0) {
                          if (e.key === "Escape") setShowAssigneeDropdown(false);
                          return;
                        }
                        if (e.key === "ArrowDown") {
                          e.preventDefault();
                          setAssigneeHighlight(h => Math.min(h + 1, filteredAssigneeOptions.length - 1));
                        } else if (e.key === "ArrowUp") {
                          e.preventDefault();
                          setAssigneeHighlight(h => Math.max(h - 1, 0));
                        } else if (e.key === "Enter") {
                          e.preventDefault();
                          const picked = filteredAssigneeOptions[assigneeHighlight];
                          if (picked) addAssignee(picked.id);
                        } else if (e.key === "Escape") {
                          setShowAssigneeDropdown(false);
                        }
                      }}
                    />
                  </div>
                  {showAssigneeDropdown && assigneeDropdownCoords && typeof document !== "undefined"
                    ? createPortal(
                        <div
                          ref={assigneeListRef}
                          className={styles.assigneeDropdownPortal}
                          role="listbox"
                          style={portalMenuStyle(assigneeDropdownCoords)}
                        >
                          {filteredAssigneeOptions.length === 0 ? (
                            <div className={styles.assigneeEmpty}>
                              {assigneeSearch.trim()
                                ? stepModal.noAssigneeFound || "Aucun agent trouvé"
                                : stepModal.searchAssigneeHint || "Tapez pour rechercher un agent…"}
                            </div>
                          ) : (
                            filteredAssigneeOptions.map((user, idx) => (
                              <button
                                key={user.id}
                                type="button"
                                role="option"
                                className={`${styles.assigneeOption} ${assigneeHighlight === idx ? styles.assigneeOptionActive : ""}`}
                                onMouseEnter={() => setAssigneeHighlight(idx)}
                                onClick={() => addAssignee(user.id)}
                              >
                                <span>{user.label}</span>
                              </button>
                            ))
                          )}
                        </div>,
                        document.body
                      )
                    : null}
                </div>
              </div>
              {selectedAssignees.length > 0 ? (
                <div className={styles.chipList}>
                  {selectedAssignees.map(user => (
                    <span key={user.id} className={styles.chip}>
                      {user.label}
                      <button
                        type="button"
                        className={styles.chipRemove}
                        onClick={() => removeAssignee(user.id)}
                        disabled={saving}
                        aria-label={stepModal.removeAssignee || "Retirer"}
                        title={stepModal.removeAssignee || "Retirer"}
                      >
                        <Icon icon="mdi:close" />
                      </button>
                    </span>
                  ))}
                </div>
              ) : (
                <p className={styles.hint}>{stepModal.assigneeNone || "Aucun assigné"}</p>
              )}
            </div>
          </>
        );
      default:
        return null;
    }
  };

  return createPortal(
    <div className={layout.overlay} onClick={onClose} role="presentation">
      <div
        className={`${layout.shell} ${layout.shellMedium}`}
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="campaign-step-form-title"
      >
        <div className={layout.accentBar} aria-hidden />
        <header className={layout.header}>
          <div className={layout.headerMain}>
            <div className={layout.headerIconWrap} aria-hidden>
              <Icon icon={isAdd ? "mdi:checkbox-marked-circle-plus-outline" : "mdi:checkbox-marked-outline"} />
            </div>
            <div className={layout.headerText}>
              <p className={layout.eyebrow}>{stepModal.eyebrow || stepModal.name || "Phase"}</p>
              <h2 className={layout.title} id="campaign-step-form-title">
                {isAdd ? stepModal.addTitle : stepModal.editTitle}
              </h2>
              <p className={layout.subtitle}>
                {isAdd ? stepModal.createSubtitle || "" : stepModal.editSubtitle || ""}
              </p>
            </div>
          </div>
          <button type="button" className={layout.closeBtn} onClick={onClose} disabled={saving} aria-label={stepModal.cancel}>
            <FaTimes />
          </button>
        </header>

        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={layout.body}>
            <nav className={layout.nav} aria-label={stepModal.sectionsAria || "Sections phase"}>
              {formSections.map(section => (
                <button
                  key={section.id}
                  type="button"
                  className={`${layout.navItem} ${activeSection === section.id ? layout.navItemActive : ""}`}
                  onClick={() => setActiveSection(section.id)}
                  aria-current={activeSection === section.id ? "step" : undefined}
                >
                  <Icon icon={section.icon} className={layout.navItemIcon} aria-hidden />
                  <span className={layout.navItemText}>
                    <span className={layout.navItemLabel}>{section.label}</span>
                    <span className={layout.navItemHint}>{section.description}</span>
                  </span>
                  {sectionMeta[section.id] ? <span className={layout.navBadge}>✓</span> : null}
                </button>
              ))}
            </nav>
            <div className={layout.content}>{renderSectionContent()}</div>
          </div>

          <footer className={layout.footer}>
            <span className={layout.footerHint}>{footerSummary}</span>
            <div className={layout.footerActions}>
              <button type="button" className={layout.ghostBtn} onClick={onClose} disabled={saving}>
                {stepModal.cancel}
              </button>
              <button type="submit" className={layout.primaryBtn} disabled={saving || !name.trim()}>
                {saving ? (
                  <>
                    <Icon icon="mdi:loading" className={layout.spinning} aria-hidden />
                    {stepModal.saving}
                  </>
                ) : isAdd ? (
                  <>
                    <Icon icon="mdi:check" aria-hidden />
                    {stepModal.add}
                  </>
                ) : (
                  <>
                    <Icon icon="mdi:content-save-outline" aria-hidden />
                    {stepModal.save}
                  </>
                )}
              </button>
            </div>
          </footer>
        </form>
      </div>
    </div>,
    document.getElementById("modal-root") || document.body
  );
}
