import { Icon } from "@iconify/react";
import { useMemo } from "react";
import { interpolate } from "../../i18n/translate";
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

export default function SupervisionMaintenanceSidebar({
  exclusions = [],
  localeTag,
  copy = {},
  onOpenDevice,
  onEndExclusion
}) {
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
      out.push({
        id: row.id || `${equipmentId}:${scope}:${serviceLabel || "device"}`,
        equipmentId,
        clientId: row.clientId ?? row.client_id ?? null,
        equipmentFamily: row.equipmentFamily || row.equipment_family || null,
        name: row.equipmentName || row.equipment_name || equipmentId,
        scope,
        serviceLabel,
        reason: String(row.reason || "").trim(),
        excludedUntil: row.excludedUntil || row.excluded_until || null,
        raw: row
      });
    }
    out.sort((a, b) => {
      const aUntil = a.excludedUntil ? new Date(a.excludedUntil).getTime() : Number.POSITIVE_INFINITY;
      const bUntil = b.excludedUntil ? new Date(b.excludedUntil).getTime() : Number.POSITIVE_INFINITY;
      if (aUntil !== bUntil) return aUntil - bUntil;
      const byName = String(a.name).localeCompare(String(b.name), localeTag || undefined, { sensitivity: "base" });
      if (byName !== 0) return byName;
      return String(a.serviceLabel || "").localeCompare(String(b.serviceLabel || ""), localeTag || undefined, {
        sensitivity: "base"
      });
    });
    return out;
  }, [exclusions, localeTag]);

  const title = copy.title || "Périphériques en maintenance";
  const indefinite = copy.indefinite || "Indéterminée";

  return (
    <aside className={styles.root} aria-label={title} data-guide="supervision-maintenance-sidebar">
      <header className={styles.header}>
        <h3 className={styles.title}>
          <Icon icon="mdi:wrench-clock" className={styles.titleIcon} aria-hidden />
          <span>{title}</span>
        </h3>
        <span className={styles.count}>{items.length}</span>
      </header>

      {items.length === 0 ? (
        <div className={styles.emptyWrap}>
          <MspEmptyState
            className={styles.emptyState}
            icon="mdi:wrench-clock"
            title={copy.emptyTitle || "Aucune maintenance"}
            text={copy.emptyText || "Aucun périphérique en maintenance pour le moment."}
          />
        </div>
      ) : (
        <ul className={styles.list}>
          {items.map(row => {
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
            return (
              <li key={row.id} className={styles.item}>
                {canOpen ? (
                  <button type="button" className={styles.itemMain} onClick={open} title={copy.openDevice || "Ouvrir"}>
                    <span className={styles.itemName}>{row.name}</span>
                    <span className={styles.itemScope}>{scopeText}</span>
                    <span className={styles.itemUntil}>{untilText}</span>
                    {row.reason ? <span className={styles.itemReason}>{row.reason}</span> : null}
                  </button>
                ) : (
                  <div className={styles.itemMainStatic}>
                    <span className={styles.itemName}>{row.name}</span>
                    <span className={styles.itemScope}>{scopeText}</span>
                    <span className={styles.itemUntil}>{untilText}</span>
                    {row.reason ? <span className={styles.itemReason}>{row.reason}</span> : null}
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
