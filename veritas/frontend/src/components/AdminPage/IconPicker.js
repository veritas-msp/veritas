import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";
import styles from "./IconPicker.module.css";
import { EQUIPMENT_FAMILY_ICON_CHOICES } from "./equipmentFamilyIconChoices";
export { EQUIPMENT_FAMILY_ICON_CHOICES };
export const CONTRACT_MODULE_ICON_CHOICES = ["mdi:headset", "tabler:truck-filled", "fluent-mdl2:documentation", "eos-icons:monitoring", "carbon:data-center", "mdi:puzzle-outline", "mdi:lifebuoy", "mdi:handshake-outline", "mdi:shield-check", "mdi:shield-outline", "mdi:security", "mdi:antivirus", "mdi:firewall", "mdi:server", "mdi:server-network", "mdi:database", "mdi:harddisk", "mdi:backup-restore", "mdi:cloud-outline", "mdi:cloud-check", "mdi:web", "mdi:lan", "mdi:router-network", "mdi:wifi", "mdi:monitor-dashboard", "mdi:chart-line", "mdi:eye-outline", "mdi:bell-outline", "mdi:tools", "mdi:wrench", "mdi:cog", "mdi:desktop-classic", "mdi:laptop", "mdi:office-building-outline", "mdi:account-group", "mdi:email-outline", "mdi:phone", "mdi:file-document-edit-outline", "mdi:clock-outline", "mdi:calendar-check", "mdi:check-circle-outline", "mdi:alert-circle-outline", "mdi:currency-eur", "mdi:credit-card-outline", "mdi:lock-outline", "mdi:key", "mdi:bug-outline"];
export const SALES_FORM_ICON_CHOICES = ["mdi:briefcase-edit-outline", "mdi:tools", "mdi:hammer-wrench", "mdi:clipboard-search-outline", "mdi:truck-remove-outline", "mdi:truck-delivery-outline", "mdi:school-outline", "mdi:remote-desktop", "mdi:map-marker-radius", "mdi:cog-play-outline", "mdi:file-document-edit-outline", "mdi:cloud-sync-outline", "mdi:devices", "mdi:application-outline", "mdi:lan", "mdi:rocket-launch-outline", "mdi:file-document-outline", "mdi:wrench", "mdi:server", "mdi:desktop-classic", "mdi:account-wrench-outline", "mdi:package-variant-closed", "mdi:factory", "mdi:chart-timeline-variant"];
export default function IconPicker({
  value,
  onChange,
  choices = CONTRACT_MODULE_ICON_CHOICES,
  variant = "default",
  searchable = false,
  popover = false,
  searchPlaceholder = "Search for an icon…",
  searchAria = "Search for an icon",
  clearSearchLabel = "Clear search",
  changeLabel = "Change icon",
  pickerAria = "Choose an icon"
}) {
  const rootRef = useRef(null);
  const panelRef = useRef(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [panelPos, setPanelPos] = useState({
    top: 0,
    left: 0
  });
  const icons = useMemo(() => {
    const list = [...choices];
    if (value && !list.includes(value)) list.unshift(value);
    const normalizedQuery = query.trim().toLowerCase();
    if (!searchable || !normalizedQuery) return list;
    return list.filter(icon => icon.toLowerCase().includes(normalizedQuery));
  }, [choices, value, searchable, query]);
  const selected = value || "mdi:puzzle-outline";
  const isSimple = variant === "simple";
  const isEquipment = variant === "equipment";
  const gridClassName = [styles.grid, isEquipment ? styles.gridEquipment : ""].filter(Boolean).join(" ");

  useEffect(() => {
    if (!popover || !open) return undefined;
    const updatePosition = () => {
      const rect = rootRef.current?.getBoundingClientRect();
      if (!rect) return;
      const width = Math.min(448, window.innerWidth - 24);
      const left = Math.min(Math.max(12, rect.left), window.innerWidth - width - 12);
      setPanelPos({
        top: rect.bottom + 8,
        left
      });
    };
    updatePosition();
    const onPointerDown = event => {
      const target = event.target;
      if (rootRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKeyDown = event => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open, popover]);

  const tiles = icons.map(icon => {
    const isSelected = icon === selected;
    return <button key={icon} type="button" role="option" aria-selected={isSelected} title={icon} className={`${styles.tile} ${isSimple ? styles.tileSimple : ""} ${isSelected ? styles.tileSelected : ""}`} onClick={() => {
      onChange(icon);
      if (popover) {
        setOpen(false);
        setQuery("");
      }
    }}>
        <Icon icon={icon} className={styles.tileIcon} />
      </button>;
  });
  const pickerPanel = <>
      {searchable ? <div className={styles.searchWrap}>
          <Icon icon="mdi:magnify" className={styles.searchIcon} aria-hidden />
          <input type="search" className={styles.searchInput} value={query} onChange={event => setQuery(event.target.value)} placeholder={searchPlaceholder} aria-label={searchAria} autoFocus={popover} />
          {query ? <button type="button" className={styles.searchClear} onClick={() => setQuery("")} aria-label={clearSearchLabel}>
              <Icon icon="mdi:close" aria-hidden />
            </button> : null}
        </div> : null}
      <div className={gridClassName} role="listbox" aria-label={pickerAria}>
        {tiles.length > 0 ? tiles : <p className={styles.emptySearch}>{searchPlaceholder}</p>}
      </div>
      {isEquipment ? <p className={styles.iconCount}>{icons.length} icon{icons.length > 1 ? "s" : ""}</p> : null}
    </>;

  if (isSimple) {
    return <div className={styles.wrapSimple} role="listbox" aria-label={pickerAria}>
        {tiles}
      </div>;
  }

  if (popover) {
    return <div ref={rootRef} className={styles.popoverWrap}>
        <button type="button" className={`${styles.trigger} ${open ? styles.triggerOpen : ""}`} onClick={() => setOpen(current => !current)} aria-expanded={open} aria-haspopup="dialog" title={changeLabel} aria-label={changeLabel}>
          <Icon icon={selected} className={styles.triggerIcon} />
          <span className={styles.triggerHint}>
            <Icon icon="mdi:pencil-outline" aria-hidden />
          </span>
        </button>
        {open && typeof document !== "undefined" ? createPortal(<div ref={panelRef} className={`${styles.popover} ${styles.popoverFixed}`} style={{
      top: panelPos.top,
      left: panelPos.left
    }} role="dialog" aria-label={pickerAria}>
            {pickerPanel}
          </div>, document.body) : null}
      </div>;
  }

  return <div className={`${styles.wrap} ${isEquipment ? styles.wrapEquipment : ""}`}>
      <div className={styles.preview} aria-hidden>
        <Icon icon={selected} className={styles.previewIcon} />
      </div>
      <div className={styles.pickerColumn}>
        {pickerPanel}
      </div>
    </div>;
}
