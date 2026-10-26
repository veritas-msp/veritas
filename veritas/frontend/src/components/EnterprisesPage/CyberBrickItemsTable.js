import { useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@iconify/react";
import equipStyles from "../EquipementPage/EquipmentPage.module.css";
import SortIcon from "../Misc/SortableHeader/SortIcon";
import { cycleSortState } from "../Misc/SortableHeader/cycleSortState";
import { getLicenseDisplayName } from "../ServicePage/TenantDetailTabs/utils";

const TABLE_BRICK_TYPES = new Set(["Backup", "NDD", "CertificatsSSL", "LicensesAbonnements"]);
const GUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function firstNonGuid(...values) {
  for (const value of values) {
    if (value == null) continue;
    const text = String(value).trim();
    if (!text || GUID_RE.test(text)) continue;
    return text;
  }
  return "";
}

function resolveOffice365LicenseName(item) {
  const raw = firstNonGuid(
    item?.nom,
    item?.displayName,
    item?.productName,
    item?.productDisplayName,
    item?.skuPartNumber,
    item?.sku,
    item?.name,
    item?.sku?.skuPartNumber,
    item?.sku?.name
  );
  if (raw) return getLicenseDisplayName(raw) || raw;
  const fallback = item?.skuPartNumber || item?.nom || item?.displayName || item?.name || item?.skuId || "";
  return fallback ? getLicenseDisplayName(fallback) || fallback : "—";
}

export function isCyberBrickTableType(type) {
  return TABLE_BRICK_TYPES.has(type);
}

function formatDateValue(value) {
  if (value == null || value === "") return "—";
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);
    return d.toLocaleDateString("fr-FR");
  } catch {
    return String(value);
  }
}

function formatDateTimeValue(value) {
  if (value == null || value === "") return "—";
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);
    return d.toLocaleString("fr-FR");
  } catch {
    return String(value);
  }
}

function formatCheckIntervalHours(hours) {
  const value = Number(hours);
  if (!Number.isFinite(value) || value <= 0) return "—";
  if (value >= 24 && value % 24 === 0) {
    const days = value / 24;
    return `${days} j`;
  }
  return `${value} h`;
}

function formatDaysRemaining(item) {
  if (item?.daysRemaining != null && item.daysRemaining !== "") {
    const n = Number(item.daysRemaining);
    if (Number.isFinite(n)) return String(Math.trunc(n));
  }
  const raw = item?.expiration || item?.validTo || item?.expiryDate;
  if (!raw) return "—";
  try {
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) return "—";
    return String(Math.ceil((d.getTime() - Date.now()) / (24 * 60 * 60 * 1000)));
  } catch {
    return "—";
  }
}

function boolLabel(value) {
  if (value === true) return "Oui";
  if (value === false) return "Non";
  return "—";
}

function getColumns(brickType) {
  switch (brickType) {
    case "Backup":
      return [
        { key: "logiciel", label: "Logiciel", get: item => item?.logiciel || item?.name || item?.solution || "—" },
        { key: "server", label: "Serveur", get: item => item?.server || item?.serveur || item?.host || "—" },
        { key: "version", label: "Version", get: item => item?.version || "—" },
        { key: "expiration", label: "Expiration", get: item => formatDateValue(item?.expiration) },
        {
          key: "jobs",
          label: "Jobs",
          get: item => {
            if (Number.isFinite(Number(item?.jobsCount))) return String(item.jobsCount);
            if (Array.isArray(item?.jobs)) return String(item.jobs.length);
            return "—";
          },
          sortValue: item => Number(item?.jobsCount) || (Array.isArray(item?.jobs) ? item.jobs.length : 0)
        },
        {
          key: "mapped",
          label: "Mappés",
          get: item => (item?.mappedJobsCount != null ? String(item.mappedJobsCount) : "—"),
          sortValue: item => Number(item?.mappedJobsCount) || 0
        }
      ];
    case "BackupJobs":
      return [
        { key: "nom", label: "Job", get: item => item?.nom || "—" },
        { key: "instance", label: "Instance", get: item => item?.instanceLogiciel || "—" },
        { key: "type", label: "Type", get: item => item?.typeBackup || item?.type || "—" },
        {
          key: "serveur",
          label: "Serveur",
          get: item => {
            if (Array.isArray(item?.serveurLie) && item.serveurLie.length) {
              return item.serveurLie.join(", ");
            }
            return item?.serveurLie || "—";
          }
        },
        {
          key: "destination",
          label: "Destination",
          get: item => item?.destination || item?.stockageLie || "—"
        },
        { key: "regularite", label: "Régularité", get: item => item?.regularite || "—" },
        { key: "horaire", label: "Horaire", get: item => item?.horaire || "—" },
        { key: "retention", label: "Rétention", get: item => item?.retention || "—" },
        {
          key: "mapped",
          label: "Mappé",
          get: item => (item?.isMapped ? "Oui" : "Non"),
          sortValue: item => (item?.isMapped ? 1 : 0),
          render: item => {
            const mapped = Boolean(item?.isMapped);
            const label = mapped ? "Mappé" : "Non mappé";
            return (
              <Icon
                icon="mdi:circle"
                width={12}
                height={12}
                style={{ color: mapped ? "#6fbf94" : "#94a3b8" }}
                aria-label={label}
                title={label}
              />
            );
          }
        },
        {
          key: "lastBackup",
          label: "Dernière sauvegarde",
          get: item => formatDateTimeValue(item?.last_backup_date || item?.last_backup_start),
          sortValue: item => {
            const raw = item?.last_backup_date || item?.last_backup_start;
            if (!raw) return 0;
            const t = new Date(raw).getTime();
            return Number.isFinite(t) ? t : 0;
          }
        }
      ];
    case "NDD":
      return [
        {
          key: "domain",
          label: "Domaine",
          get: item => item?.nom || item?.domaine || item?.name || item?.domain || "—"
        },
        {
          key: "registrar",
          label: "Registrar",
          get: item => item?.registrar || item?.providerId || (item?.isManual ? "Manuel" : "—")
        },
        { key: "expiration", label: "Expiration", get: item => formatDateValue(item?.expiration) },
        {
          key: "renewal",
          label: "Renouvellement",
          get: item => {
            if (item?.autoRenew === true) return "Auto";
            if (item?.autoRenew === false) return "Manuel";
            return item?.renewalMode || item?.renewalPeriod || "—";
          }
        },
        {
          key: "dns",
          label: "Zone DNS",
          get: item => (item?.hasDnsZone != null ? boolLabel(item.hasDnsZone) : item?.dnsZone || "—")
        }
      ];
    case "CertificatsSSL":
      return [
        {
          key: "hostname",
          label: "Nom d'hôte",
          get: item => item?.hostname || item?.host || item?.commonName || item?.subjectCN || "—"
        },
        { key: "port", label: "Port", get: item => (item?.port != null ? String(item.port) : "—") },
        {
          key: "checkInterval",
          label: "Période de vérification",
          get: item => formatCheckIntervalHours(item?.checkIntervalHours ?? item?.check_interval_hours),
          sortValue: item => Number(item?.checkIntervalHours ?? item?.check_interval_hours) || 0
        },
        {
          key: "lastChecked",
          label: "Dernière vérification",
          get: item =>
            formatDateTimeValue(
              item?.lastChecked || item?.last_checked || item?.lastCheck || item?.updated_at
            ),
          sortValue: item => {
            const raw =
              item?.lastChecked || item?.last_checked || item?.lastCheck || item?.updated_at;
            if (!raw) return 0;
            const t = new Date(raw).getTime();
            return Number.isFinite(t) ? t : 0;
          }
        },
        {
          key: "expiration",
          label: "Expiration",
          get: item => formatDateValue(item?.expiration || item?.validTo)
        },
        { key: "days", label: "Jours", get: item => formatDaysRemaining(item) },
        {
          key: "issuer",
          label: "Émetteur",
          get: item => item?.issuerCN || item?.issuer || "—"
        },
        {
          key: "status",
          label: "Statut",
          get: item => {
            if (item?.error) return "Erreur";
            if (item?.authorized === false) return "Non autorisé";
            const days = Number(formatDaysRemaining(item));
            if (Number.isFinite(days)) {
              if (days < 0) return "Expiré";
              if (days <= 30) return "Bientôt";
              return "OK";
            }
            return "—";
          }
        }
      ];
    case "LicensesAbonnements":
      return [
        { key: "name", label: "Nom", get: item => item?.nom || item?.name || item?.label || "—" },
        {
          key: "vendor",
          label: "Fournisseur",
          get: item => item?.fournisseur || item?.vendor || item?.editeur || "—"
        },
        { key: "expiration", label: "Expiration", get: item => formatDateValue(item?.expiration) },
        { key: "days", label: "Jours", get: item => formatDaysRemaining(item) },
        { key: "notes", label: "Notes", get: item => item?.notes || "—" }
      ];
    case "Office365Licenses":
      return [
        {
          key: "name",
          label: "Licence",
          get: item => resolveOffice365LicenseName(item)
        },
        {
          key: "sku",
          label: "SKU",
          get: item => firstNonGuid(item?.skuPartNumber, item?.sku, item?.sku?.skuPartNumber) || item?.skuId || "—"
        },
        {
          key: "total",
          label: "Total",
          get: item => (item?.total != null ? String(item.total) : "—")
        },
        {
          key: "used",
          label: "Utilisées",
          get: item => {
            const used = item?.utilisees ?? item?.used;
            return used != null ? String(used) : "—";
          }
        },
        {
          key: "available",
          label: "Disponibles",
          get: item => {
            const total = Number(item?.total);
            const used = Number(item?.utilisees ?? item?.used);
            if (Number.isFinite(total) && Number.isFinite(used)) return String(Math.max(0, total - used));
            return "—";
          }
        },
        {
          key: "usage",
          label: "Usage",
          get: item => {
            const total = Number(item?.total);
            const used = Number(item?.utilisees ?? item?.used);
            if (Number.isFinite(total) && total > 0 && Number.isFinite(used)) {
              return `${Math.round((used / total) * 100)} %`;
            }
            return "—";
          }
        }
      ];
    default:
      return [
        { key: "name", label: "Nom", get: item => item?.name || item?.nom || "—" }
      ];
  }
}

function rowMatches(item, columns, query) {
  const haystack = columns
    .map(col => String(col.get(item) ?? ""))
    .join(" ")
    .toLowerCase();
  return haystack.includes(query);
}

export function cyberBrickItemKey(item, index = 0) {
  if (item?.id != null && String(item.id).trim() !== "") return String(item.id);
  if (item?.hostname) return `host:${String(item.hostname).toLowerCase()}:${item.port || 443}`;
  const nom = item?.nom || item?.domain || item?.domaine || item?.name;
  if (nom) return `nom:${String(nom).trim().toLowerCase()}`;
  return `idx:${index}`;
}

function rowKey(item, index) {
  return cyberBrickItemKey(item, index);
}

function getSortScalar(col, item) {
  if (typeof col.sortValue === "function") {
    const value = col.sortValue(item);
    if (typeof value === "number" && Number.isFinite(value)) return value;
    return String(value ?? "").toLowerCase();
  }
  const raw = col.get(item);
  if (raw == null || raw === "—") return "";
  const asNumber = Number(raw);
  if (typeof raw === "number" || (typeof raw === "string" && raw.trim() !== "" && Number.isFinite(asNumber) && String(asNumber) === String(raw).trim())) {
    return asNumber;
  }
  return String(raw).toLowerCase();
}

function compareRows(a, b, col, direction) {
  const av = getSortScalar(col, a);
  const bv = getSortScalar(col, b);
  let result = 0;
  if (typeof av === "number" && typeof bv === "number") {
    result = av - bv;
  } else {
    result = String(av).localeCompare(String(bv), "fr", { numeric: true, sensitivity: "base" });
  }
  return direction === "desc" ? -result : result;
}

export default function CyberBrickItemsTable({
  brickType,
  items = [],
  emptyLabel = "Aucune donnée",
  searchPlaceholder = "Rechercher…",
  hideSearchBar = false,
  search: controlledSearch,
  onSearchChange,
  sortable = true,
  onEditItem = null,
  editLabel = "Éditer",
  selectable = false,
  selectedIds = null,
  allSelected = false,
  onToggleItem = null,
  onToggleAll = null,
  selectAllLabel = "Tout sélectionner",
  selectRowLabel = "Sélectionner"
}) {
  const baseColumns = useMemo(() => getColumns(brickType), [brickType]);
  const columns = useMemo(() => {
    const next = [...baseColumns];
    if (selectable) {
      next.unshift({
        key: "select",
        label: "",
        sortable: false,
        get: () => "",
        render: item => {
          const id = cyberBrickItemKey(item);
          const checked = selectedIds instanceof Set ? selectedIds.has(id) : false;
          return (
            <input
              type="checkbox"
              className={equipStyles.embeddedRowCheckbox}
              checked={checked}
              onChange={event => {
                event.stopPropagation();
                onToggleItem?.(id, event.target.checked);
              }}
              onClick={event => event.stopPropagation()}
              aria-label={`${selectRowLabel} ${baseColumns[0]?.get?.(item) || id}`}
            />
          );
        }
      });
    }
    if (typeof onEditItem === "function") {
      next.push({
        key: "actions",
        label: "Actions",
        sortable: false,
        get: () => "",
        render: item => (
          <div className={equipStyles.embeddedRowActions} onClick={event => event.stopPropagation()}>
            <button
              type="button"
              className={equipStyles.embeddedQuickActionButton}
              onClick={() => onEditItem(item)}
              title={editLabel}
              aria-label={editLabel}
            >
              <Icon icon="mdi:pencil-outline" aria-hidden />
            </button>
          </div>
        )
      });
    }
    return next;
  }, [
    baseColumns,
    editLabel,
    onEditItem,
    onToggleItem,
    selectRowLabel,
    selectable,
    selectedIds
  ]);
  const defaultSortKey = columns[0]?.key || "name";
  const [internalSearch, setInternalSearch] = useState("");
  const isControlled = typeof onSearchChange === "function";
  const search = isControlled ? (controlledSearch ?? "") : internalSearch;
  const setSearch = isControlled ? onSearchChange : setInternalSearch;
  const [sortBy, setSortBy] = useState(defaultSortKey);
  const [sortDirection, setSortDirection] = useState("asc");
  const [fadeVisible, setFadeVisible] = useState(false);
  const [fadeTopVisible, setFadeTopVisible] = useState(false);
  const [fadeTopOffset, setFadeTopOffset] = useState(0);
  const scrollRef = useRef(null);
  const theadRef = useRef(null);
  const list = Array.isArray(items) ? items : [];

  useEffect(() => {
    if (!columns.some(col => col.key === sortBy)) {
      setSortBy(columns[0]?.key || "name");
      setSortDirection("asc");
    }
  }, [columns, sortBy]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return list;
    return list.filter(item => rowMatches(item, columns, query));
  }, [list, columns, search]);

  const sorted = useMemo(() => {
    if (!sortable) return filtered;
    const col = columns.find(c => c.key === sortBy) || columns[0];
    if (!col) return filtered;
    return [...filtered].sort((a, b) => compareRows(a, b, col, sortDirection));
  }, [filtered, columns, sortBy, sortDirection, sortable]);

  const handleSort = key => {
    if (!sortable) return;
    const next = cycleSortState({
      column: key,
      sortBy,
      sortDirection,
      defaultSortBy: defaultSortKey,
      defaultSortDirection: "asc",
      firstDirection: "asc"
    });
    setSortBy(next.sortBy);
    setSortDirection(next.sortDirection);
  };

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return undefined;
    const syncFadeTopOffset = () => {
      const head = theadRef.current;
      const next = head ? Math.ceil(head.getBoundingClientRect().height) : 0;
      setFadeTopOffset(prev => (prev === next ? prev : next));
    };
    const updateFade = () => {
      syncFadeTopOffset();
      const remaining = el.scrollHeight - el.scrollTop - el.clientHeight;
      setFadeVisible(remaining > 4);
      setFadeTopVisible(el.scrollTop > 4);
    };
    updateFade();
    const raf = requestAnimationFrame(() => {
      updateFade();
      requestAnimationFrame(updateFade);
    });
    el.addEventListener("scroll", updateFade, { passive: true });
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(updateFade) : null;
    ro?.observe(el);
    if (theadRef.current) ro?.observe(theadRef.current);
    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener("scroll", updateFade);
      ro?.disconnect();
    };
  }, [sorted.length, columns.length]);

  return (
    <div className={equipStyles.hardwarePageEmbedded}>
      {!hideSearchBar ? (
        <div className={equipStyles.embeddedFilterBar}>
          <div className={equipStyles.embeddedSearchWrap}>
            <div className={equipStyles.embeddedSearchBox}>
              <Icon icon="mdi:magnify" className={equipStyles.embeddedSearchIcon} aria-hidden />
              <input
                type="search"
                className={equipStyles.embeddedSearchInput}
                value={search}
                onChange={event => setSearch(event.target.value)}
                placeholder={searchPlaceholder}
                aria-label={searchPlaceholder}
              />
              {search ? (
                <button
                  type="button"
                  className={equipStyles.embeddedSearchClear}
                  onClick={() => setSearch("")}
                  aria-label="Effacer la recherche"
                >
                  <Icon icon="mdi:close" aria-hidden />
                </button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      <div className={equipStyles.equipmentTableSectionEmbedded}>
        <div className={equipStyles.tableScrollShell}>
          <div
            ref={scrollRef}
            className={`${equipStyles.tableWrapper} ${equipStyles.tableWrapperEmbedded} ${equipStyles.tableWrapperEmbeddedScroll}`}
          >
            <div className={equipStyles.tableCardSurface}>
              <table className={equipStyles.equipmentTableEmbedded}>
                <thead ref={theadRef}>
                  <tr>
                    {columns.map(col => {
                      const isActions = col.key === "actions";
                      const isSelect = col.key === "select";
                      const canSort = sortable && col.sortable !== false && !isActions && !isSelect;
                      const isSorted = canSort && sortBy === col.key;
                      return (
                        <th
                          key={col.key}
                          scope="col"
                          className={[
                            canSort ? equipStyles.sortableTh : undefined,
                            isActions ? equipStyles.embeddedColActions : undefined,
                            isSelect ? equipStyles.embeddedColCheckbox : undefined
                          ].filter(Boolean).join(" ") || undefined}
                          onClick={canSort ? () => handleSort(col.key) : undefined}
                          aria-sort={
                            canSort
                              ? isSorted
                                ? sortDirection === "asc"
                                  ? "ascending"
                                  : "descending"
                                : "none"
                              : undefined
                          }
                          title={canSort ? `Trier par ${col.label}` : undefined}
                        >
                          {isSelect ? (
                            <input
                              type="checkbox"
                              className={equipStyles.embeddedRowCheckbox}
                              checked={Boolean(allSelected && sorted.length > 0)}
                              onChange={() => onToggleAll?.()}
                              aria-label={selectAllLabel}
                            />
                          ) : (
                            <span className={equipStyles.thContent}>
                              {col.label}
                              {canSort && isSorted ? (
                                <SortIcon
                                  active
                                  direction={sortDirection}
                                  className={equipStyles.sortIndicator}
                                />
                              ) : null}
                            </span>
                          )}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {sorted.length ? (
                    sorted.map((item, index) => {
                      const id = rowKey(item, index);
                      const isSelected = selectedIds instanceof Set && selectedIds.has(cyberBrickItemKey(item, index));
                      return (
                        <tr
                          key={id}
                          className={[
                            equipStyles.equipmentRowEmbedded,
                            isSelected ? equipStyles.equipmentRowEmbeddedSelected : undefined
                          ].filter(Boolean).join(" ")}
                        >
                          {columns.map(col => {
                            const isActions = col.key === "actions";
                            const isSelect = col.key === "select";
                            const text = String(col.get(item) ?? "");
                            return (
                              <td
                                key={col.key}
                                className={[
                                  isActions ? equipStyles.embeddedColActions : undefined,
                                  isSelect ? equipStyles.embeddedColCheckbox : undefined
                                ].filter(Boolean).join(" ") || undefined}
                                title={isActions || isSelect ? undefined : text}
                              >
                                {typeof col.render === "function" ? col.render(item) : col.get(item)}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={columns.length}>
                        {list.length && search.trim()
                          ? "Aucun résultat pour cette recherche"
                          : emptyLabel}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          <div
            className={`${equipStyles.tableScrollFadeTop} ${fadeTopVisible ? equipStyles.tableScrollFadeVisible : ""}`}
            style={fadeTopOffset > 0 ? { top: fadeTopOffset } : undefined}
            aria-hidden
          />
          <div
            className={`${equipStyles.tableScrollFade} ${fadeVisible ? equipStyles.tableScrollFadeVisible : ""}`}
            aria-hidden
          />
        </div>
      </div>
    </div>
  );
}
