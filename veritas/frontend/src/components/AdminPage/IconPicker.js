import { useMemo, useState } from "react";
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
  searchable = false
}) {
  const [query, setQuery] = useState("");
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
  const tiles = icons.map(icon => {
    const isSelected = icon === selected;
    return <button key={icon} type="button" role="option" aria-selected={isSelected} title={icon} className={`${styles.tile} ${isSimple ? styles.tileSimple : ""} ${isSelected ? styles.tileSelected : ""}`} onClick={() => onChange(icon)}>
        <Icon icon={icon} className={styles.tileIcon} />
      </button>;
  });
  if (isSimple) {
    return <div className={styles.wrapSimple} role="listbox" aria-label="Choose an icon">
        {tiles}
      </div>;
  }
  return <div className={`${styles.wrap} ${isEquipment ? styles.wrapEquipment : ""}`}>
      <div className={styles.preview} aria-hidden>
        <Icon icon={selected} className={styles.previewIcon} />
      </div>
      <div className={styles.pickerColumn}>
        {searchable ? <div className={styles.searchWrap}>
            <Icon icon="mdi:magnify" className={styles.searchIcon} aria-hidden />
            <input type="search" className={styles.searchInput} value={query} onChange={event => setQuery(event.target.value)} placeholder="Search for an icon…" aria-label="Search for an icon" />
            {query ? <button type="button" className={styles.searchClear} onClick={() => setQuery("")} aria-label="Clear search">
                <Icon icon="mdi:close" aria-hidden />
              </button> : null}
          </div> : null}
        <div className={gridClassName} role="listbox" aria-label="Choose an icon">
          {tiles.length > 0 ? tiles : <p className={styles.emptySearch}>No icons found.</p>}
        </div>
        {isEquipment ? <p className={styles.iconCount}>{icons.length} icon{icons.length > 1 ? "s" : ""}</p> : null}
      </div>
    </div>;
}
