import { Icon } from "@iconify/react";
import { useMemo, useState } from "react";
import { FaTimes } from "react-icons/fa";
import { interpolate } from "../../i18n/translate";
import { getFleetFamilyIcon } from "../../utils/equipmentFamilyStats";
import MspEmptyState from "../Misc/MspEmptyState/MspEmptyState";
import styles from "./SupervisionMaintenanceSidebar.module.css";

function isMaintenanceExclusion(row) {
  if (!row || row.active === false) return false;
  const kind = String(row.kind || "maintenance").toLowerCase();
  // Device + service : une maintenance service doit aussi apparaître à droite.
  return kind === "maintenance";
}

function formatUntil(value, localeTag, indefiniteLabel) {
  if (!value) return indefiniteLabel || "Indéterminée";
  const ms = new Date(value).getTime();
  if (!Number.isFinite(ms)) return indefiniteLabel || "Indéterminée";
  try {
    return new Date(ms).toLocaleString(localeTag || undefined, {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  } catch {
    return new Date(ms).toLocaleString();
  }
}

function maintenanceSortKey(row) {
  if (row.excludedUntil) {
    const until = new Date(row.excludedUntil).getTime();
    if (Number.isFinite(until)) return until;
  }
  if (row.createdAt) {
    const created = new Date(row.createdAt).getTime();
    if (Number.isFinite(created)) return created;
  }
  return Number.POSITIVE_INFINITY;
}

function matchesSearch(row, query) {
  const q = String(query || "").trim().toLowerCase();
  if (!q) return true;
  return [
    row.name,
    row.clientName,
    row.reason,
    row.serviceLabel,
    row.equipmentFamily,
    row.scope
  ]
    .filter(value => value != null && String(value).trim() !== "")
    .join(" ")
    .toLowerCase()
    .includes(q);
}

export default function SupervisionMaintenanceSidebar({
  exclusions = [],
  localeTag,
  copy = {},
  onOpenDevice,
  onEndExclusion
}) {
  const [search, setSearch] = useState("");

  const items = useMemo(() => {
    const rows = (Array.isArray(exclusions) ? exclusions : []).filter(isMaintenanceExclusion);
    const out = [];
    for (const row of rows) {
      const equipmentId = String(row.equipmentId || row.equipment_id || "").trim();
      if (!equipmentId) continue;
      const scope = String(row.scope || "device").toLowerCase();
      const serviceLabel =
        scope === "service"
          ? String(row.serviceName || row.service_name || row.serviceKey || row.service_key || "").trim()
          : "";
      const equipmentFamily = row.equipmentFamily || row.equipment_family || null;
      out.push({
        id: row.id || `${equipmentId}:${scope}:${serviceLabel || "device"}`,
        equipmentId,
        clientId: row.clientId ?? row.client_id ?? null,
        clientName: String(row.clientName || row.client_name || "").trim(),
        equipmentFamily,
        familyIcon: getFleetFamilyIcon(equipmentFamily),
        name: row.equipmentName || row.equipment_name || equipmentId,
        scope,
        serviceLabel,
        reason: String(row.reason || "").trim(),
        excludedUntil: row.excludedUntil || row.excluded_until || null,
        createdAt: row.createdAt || row.created_at || null,
        raw: row
      });
    }
    out.sort((a, b) => {
      const aUntil = maintenanceSortKey(a);
      const bUntil = maintenanceSortKey(b);
      if (aUntil !== bUntil) return aUntil - bUntil;
      const byClient = String(a.clientName || "").localeCompare(String(b.clientName || ""), localeTag || undefined, {
        sensitivity: "base"
      });
      if (byClient !== 0) return byClient;
      const byName = String(a.name).localeCompare(String(b.name), localeTag || undefined, { sensitivity: "base" });
      if (byName !== 0) return byName;
      return String(a.serviceLabel || "").localeCompare(String(b.serviceLabel || ""), localeTag || undefined, {
        sensitivity: "base"
      });
    });
    return out;
  }, [exclusions, localeTag]);

  const filteredItems = useMemo(
    () => items.filter(row => matchesSearch(row, search)),
    [items, search]
  );

  const title = copy.title || "Périphériques en maintenance";
  const indefinite = copy.indefinite || "Indéterminée";
  const searchPlaceholder = copy.searchPlaceholder || "Rechercher…";
  const hasSearch = Boolean(String(search || "").trim());

  return (
    <aside className={styles.root} aria-label={title} data-guide="supervision-maintenance-sidebar">
      <header className={styles.header}>
        <h3 className={styles.title}>
          <Icon icon="mdi:wrench-clock" className={styles.titleIcon} aria-hidden />
          <span>{title}</span>
        </h3>
        <span className={styles.count}>{items.length}</span>
      </header>

      {items.length > 0 ? (
        <div className={styles.searchBar}>
          <Icon icon="mdi:magnify" className={styles.searchIcon} aria-hidden />
          <input
            type="search"
            className={styles.searchInput}
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={searchPlaceholder}
            aria-label={searchPlaceholder}
            autoComplete="off"
          />
          {hasSearch ? (
            <button
              type="button"
              className={styles.searchClear}
              onClick={() => setSearch("")}
              aria-label={copy.clearSearch || "Effacer"}
            >
              <FaTimes />
            </button>
          ) : null}
        </div>
      ) : null}

      {items.length === 0 ? (
        <div className={styles.emptyWrap}>
          <MspEmptyState
            className={styles.emptyState}
            icon="mdi:wrench-clock"
            title={copy.emptyTitle || "Aucune maintenance"}
            text={copy.emptyText || "Aucun périphérique en maintenance pour le moment."}
          />
        </div>
      ) : filteredItems.length === 0 ? (
        <div className={styles.emptyWrap}>
          <MspEmptyState
            className={styles.emptyState}
            icon="mdi:magnify"
            title={copy.searchEmptyTitle || "Aucun résultat"}
            text={copy.searchEmptyText || "Aucun périphérique ne correspond à cette recherche."}
          />
        </div>
      ) : (
        <ul className={styles.list}>
          {filteredItems.map(row => {
            const untilLabel = formatUntil(row.excludedUntil, localeTag, indefinite);
            const untilText = row.excludedUntil
              ? interpolate(copy.until || "Jusqu’au {date}", { date: untilLabel })
              : untilLabel;
            const canOpen = typeof onOpenDevice === "function";
            const open = () => {
              if (!canOpen) return;
              onOpenDevice({
                id: row.equipmentId,
                dbId: row.equipmentId,
                clientId: row.clientId,
                clientName: row.clientName || null,
                name: row.name,
                type: row.equipmentFamily || null
              });
            };
            const scopeText =
              row.scope === "service"
                ? interpolate(copy.serviceScope || "Service · {service}", {
                    service: row.serviceLabel || "—"
                  })
                : copy.deviceScope || "Tous les services";
            const nameRow = (
              <span className={styles.itemNameRow}>
                <span className={styles.familyIcon} aria-hidden>
                  <Icon icon={row.familyIcon || "mdi:devices"} />
                </span>
                <span className={styles.itemName}>{row.name}</span>
              </span>
            );
            const meta = (
              <>
                {row.clientName ? <span className={styles.itemCompany}>{row.clientName}</span> : null}
                <span className={styles.itemScope}>{scopeText}</span>
                <span className={styles.itemUntil}>{untilText}</span>
                {row.reason ? <span className={styles.itemReason}>{row.reason}</span> : null}
              </>
            );
            return (
              <li key={row.id} className={styles.item}>
                {canOpen ? (
                  <button type="button" className={styles.itemMain} onClick={open} title={copy.openDevice || "Ouvrir"}>
                    {nameRow}
                    {meta}
                  </button>
                ) : (
                  <div className={styles.itemMainStatic}>
                    {nameRow}
                    {meta}
                  </div>
                )}
                {typeof onEndExclusion === "function" ? (
                  <button
                    type="button"
                    className={styles.endBtn}
                    onClick={() => onEndExclusion(row.raw)}
                    title={copy.end || "Terminer"}
                  >
                    {copy.end || "Terminer"}
                  </button>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </aside>
  );
}
