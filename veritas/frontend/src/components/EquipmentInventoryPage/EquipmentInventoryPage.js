import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import PageGuideTour from "../PageGuide/PageGuideTour";
import { getEquipmentInventoryGuide } from "../PageGuide/equipmentInventoryGuideSteps";
import { useRegisterPageGuide } from "../../hooks/useRegisterPageGuide";
import { Icon } from "@iconify/react";
import { FaChevronLeft, FaChevronRight, FaTimes } from "react-icons/fa";
import { toast } from "react-toastify";
import { getEquipmentInventoryList, fetchEquipmentTagsBatch } from "../../api/equipment";
import { getLocalizedEquipmentTypeLabel } from "../../i18n/equipmentFamilyLabels";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { useCommonCopy } from "../../hooks/useCommonCopy";
import { interpolate } from "../../i18n/translate";
import { useTablePagination } from "../AdminPage/useTablePagination";
import PageSkeleton from "../Misc/Skeleton/PageSkeleton";
import { cycleSortState } from "../Misc/SortableHeader/cycleSortState";
import SmartTooltip from "../SmartTooltip";
import EquipmentBrandIcon from "../EquipementPage/constants/EquipmentBrandIcon";
import { toDateInputValue } from "../EquipementPage/constants/firewallLicenceUtils";
import cyberStyles from "../CybersecuritePage/CybersecuritePage.module.css";
import layout from "../EnterprisesPage/EnterprisesPage.module.css";
import { getTagChipStyle } from "../EnterprisesPage/clientTagColors";
import { getEquipmentInventoryPageCopy } from "./equipmentInventoryPageI18n";
import InventoryEquipmentActions from "./InventoryEquipmentActions";
import InventoryBulkEditModal from "./InventoryBulkEditModal";
import { usePermissions } from "../../contexts/PermissionsContext";
import styles from "./EquipmentInventoryPage.module.css";
import { createTrackedAbortController } from "../../utils/pageLoadAbort";
import useSystemFamilyExtensions from "../../hooks/useSystemFamilyExtensions";

function InventoryDeviceIcon({ item, className }) {
  if (item?.isCustom && item.familyIcon) {
    return <Icon icon={item.familyIcon} className={className} aria-hidden />;
  }
  return <EquipmentBrandIcon equipment={item} equipmentType={item?.type} className={className} />;
}

function compactSerial(value) {
  return String(value || "").toLowerCase().replace(/[\s\-_.]/g, "");
}

function searchBlob(item, locale) {
  const dataValues =
    item?.data && typeof item.data === "object" && !Array.isArray(item.data)
      ? Object.values(item.data)
      : [];
  const tagLabels = Array.isArray(item?.tags) ? item.tags.map(tag => tag.label) : [];
  return [
    item?.name,
    item?.clientName,
    item?.type,
    item?.familyKey,
    item?.familyLabel,
    typeLabel(item, locale),
    item?.ip,
    item?.serial,
    item?.mac,
    item?.location,
    item?.model,
    ...tagLabels,
    ...dataValues
  ]
    .filter(value => value != null && String(value).trim() !== "")
    .join(" ")
    .toLowerCase();
}

function matchesInventorySearch(item, query, locale) {
  const q = String(query || "").trim().toLowerCase();
  if (!q) return true;
  if (searchBlob(item, locale).includes(q)) return true;
  const serial = compactSerial(item?.serial);
  const qSerial = compactSerial(q);
  return Boolean(qSerial && serial.includes(qSerial));
}

function itemMatchesInventoryFilters(item, { search, selectedClients, selectedTypes, selectedTags, statusFilter, locale }, omit = null) {
  if (omit !== "search" && search && !matchesInventorySearch(item, search, locale)) return false;
  if (omit !== "clients" && selectedClients.size > 0 && !selectedClients.has(String(item.clientId))) return false;
  if (omit !== "types" && selectedTypes.size > 0 && !selectedTypes.has(item.type)) return false;
  if (omit !== "tags" && selectedTags.size > 0) {
    const labels = new Set((item.tags || []).map(tag => String(tag.label || "").toLowerCase()).filter(Boolean));
    const hasAny = [...selectedTags].some(tag => labels.has(String(tag).toLowerCase()));
    if (!hasAny) return false;
  }
  if (omit !== "status") {
    if (statusFilter === "active" && item.is_active === false) return false;
    if (statusFilter === "inactive" && item.is_active !== false) return false;
  }
  return true;
}

function typeLabel(item, locale) {
  if (item?.isCustom) return item.familyLabel || item.familyKey || item.type;
  return getLocalizedEquipmentTypeLabel(
    item?.familyLabel || item?.type,
    locale,
    item?.familyLabel || item?.type || "—"
  );
}

function alertStatusMeta(item, copy) {
  const status =
    item?.alertStatus || (item?.alertSuspended ? "suspended" : item?.alertsEnabled ? "active" : "disabled");
  if (status === "active") {
    return {
      status,
      label: copy.alertStatus?.active || "Active",
      tone: "ok"
    };
  }
  if (status === "suspended") {
    return {
      status,
      label: copy.alertStatus?.suspended || "Suspended",
      tone: "warn"
    };
  }
  return {
    status: "disabled",
    label: copy.alertStatus?.disabled || "Disabled",
    tone: "off"
  };
}

function supervisionStatusMeta(item, copy) {
  const status = String(item?.supervisionStatus || "inactive").toLowerCase();
  if (status === "critical") {
    return {
      status,
      label: copy.supervisionStatus?.critical || "Critical",
      tone: "warn"
    };
  }
  if (status === "warning") {
    return {
      status,
      label: copy.supervisionStatus?.warning || "Warning",
      tone: "warn"
    };
  }
  if (status === "no_data") {
    return {
      status,
      label: copy.supervisionStatus?.noData || "No supervision data",
      tone: "warn"
    };
  }
  if (status === "ok") {
    return {
      status,
      label: copy.supervisionStatus?.ok || "Active",
      tone: "ok"
    };
  }
  return {
    status: "inactive",
    label: copy.supervisionStatus?.inactive || "Inactive",
    tone: "off"
  };
}

function StatusDot({ tone, label }) {
  return (
    <SmartTooltip content={label}>
      <span
        className={`${styles.statusDot} ${
          tone === "ok" ? styles.statusDotOk : tone === "warn" ? styles.statusDotWarn : styles.statusDotOff
        }`}
        aria-label={label}
        role="img"
      />
    </SmartTooltip>
  );
}

function toEquipmentDetailPayload(item) {
  const uiType =
    item?.type === "Serveurs"
      ? "Servers"
      : item?.type === "Stockage"
        ? "Storage"
        : item?.type === "Videosurveillance"
          ? "Security camera"
          : item?.type;
  const dbId = item?.dbId || null;
  return {
    ...item,
    id: dbId || item.id,
    dbId,
    type: uiType,
    clientId: item.clientId,
    clientName: item.clientName,
    name: item.name
  };
}

function compareValues(a, b, locale) {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b), locale, { sensitivity: "base", numeric: true });
}

const NAME_FIELD_KEYS = new Set(["name", "nom"]);
const STANDARD_INVENTORY_COLUMNS = [
  "company",
  "name",
  "type",
  "ip",
  "serial",
  "site",
  "tags",
  "status",
  "alerts",
  "supervision",
  "alertsMonth"
];

function getCustomFieldRaw(item, fieldKey) {
  if (!fieldKey) return "";
  return item?.fields?.[fieldKey]
    ?? item?.data?.[fieldKey]
    ?? item?.rawData?.[fieldKey]
    ?? item?.rawData?.data?.[fieldKey]
    ?? "";
}

function formatInventoryFieldValue(field, value, locale) {
  const lang = String(locale || "fr").toLowerCase().startsWith("fr") ? "fr" : "en";
  if (field?.fieldType === "boolean") {
    if (value === true || value === "true" || value === 1 || value === "1") return lang === "fr" ? "Oui" : "Yes";
    if (value === false || value === "false" || value === 0 || value === "0") return lang === "fr" ? "Non" : "No";
    return "—";
  }
  if (value == null || String(value).trim() === "") return "—";
  if (field?.fieldType === "date") {
    const iso = toDateInputValue(value);
    if (iso) {
      const [year, month, day] = iso.split("-");
      return `${day}/${month}/${year}`;
    }
    return String(value);
  }
  if (field?.fieldType === "number" && (value === false || value === true)) return value ? "1" : "0";
  return String(value);
}

function customColumnKey(fieldKey) {
  return `cf:${fieldKey}`;
}

function isCustomColumnKey(key) {
  return String(key || "").startsWith("cf:");
}

function fieldKeyFromColumn(key) {
  return String(key || "").slice(3);
}

function csvCell(value) {
  const text = value == null ? "" : String(value);
  if (/[;"\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function downloadCsvFile(csvContent, filename) {
  const blob = new Blob([`\uFEFF${csvContent}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function getInventoryColumnValue(item, columnId, { locale, copy, customFields }) {
  if (isCustomColumnKey(columnId)) {
    const fieldKey = fieldKeyFromColumn(columnId);
    const field = (customFields || []).find(entry => (entry.fieldKey || entry.key) === fieldKey) || { fieldKey };
    const display = formatInventoryFieldValue(field, getCustomFieldRaw(item, fieldKey), locale);
    return display === "—" ? "" : display;
  }
  switch (columnId) {
    case "company":
      return item.clientName || "";
    case "name":
      return item.name || "";
    case "type":
      return typeLabel(item, locale);
    case "ip":
      return item.ip || "";
    case "serial":
      return item.serial || "";
    case "site":
      return item.location || "";
    case "tags":
      return Array.isArray(item.tags) ? item.tags.map(tag => tag.label).filter(Boolean).join(", ") : "";
    case "status":
      return item.is_active === false ? copy.status.inactive : copy.status.active;
    case "alerts":
      return alertStatusMeta(item, copy).label;
    case "supervision":
      return supervisionStatusMeta(item, copy).label;
    case "alertsMonth":
      return String(Number(item.alertsLastMonth) || 0);
    default:
      return "";
  }
}

function getSortValue(item, key, locale) {
  if (isCustomColumnKey(key)) return getCustomFieldRaw(item, fieldKeyFromColumn(key));
  switch (key) {
    case "company":
      return item.clientName || "";
    case "name":
      return item.name || "";
    case "type":
      return typeLabel(item, locale);
    case "ip":
      return item.ip || "";
    case "serial":
      return item.serial || "";
    case "site":
      return item.location || "";
    case "tags":
      return Array.isArray(item.tags) ? item.tags.map(tag => tag.label).filter(Boolean).join(", ") : "";
    case "status":
      return item.is_active === false ? 1 : 0;
    case "alerts":
      return item?.alertStatus || (item?.alertSuspended ? "suspended" : item?.alertsEnabled ? "active" : "disabled");
    case "supervision":
      return item?.supervisionStatus || "inactive";
    case "alertsMonth":
      return Number(item.alertsLastMonth) || 0;
    default:
      return "";
  }
}

export default function EquipmentInventoryPage({ onNavigate }) {
  const locale = useAppLocale();
  const common = useCommonCopy();
  const { fieldsFor } = useSystemFamilyExtensions();
  const copy = useMemo(() => getEquipmentInventoryPageCopy(locale), [locale]);
  const [pageGuideOpen, setPageGuideOpen] = useState(false);
  const openPageGuide = useCallback(() => setPageGuideOpen(true), []);
  useRegisterPageGuide(openPageGuide);
  const inventoryGuide = useMemo(() => getEquipmentInventoryGuide(locale), [locale]);
  const { can } = usePermissions();
  const canBulkEdit = can("clients_detail.devices") || can("infrastructure.edit") || can("supervision.manage");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedClients, setSelectedClients] = useState(() => new Set());
  const [selectedTypes, setSelectedTypes] = useState(() => new Set());
  const [selectedTags, setSelectedTags] = useState(() => new Set());
  const [statusFilter, setStatusFilter] = useState("all");
  const [openFilterSection, setOpenFilterSection] = useState("clients");
  const [facetQuery, setFacetQuery] = useState("");
  const [sort, setSort] = useState({ key: "company", dir: "asc" });
  const [openMenuKey, setOpenMenuKey] = useState(null);
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const loadAbortRef = useRef(null);

  const load = useCallback(async () => {
    loadAbortRef.current?.abort();
    const ac = createTrackedAbortController();
    loadAbortRef.current = ac;
    setLoading(true);
    try {
      const rows = await getEquipmentInventoryList({
        signal: ac.signal
      });
      if (ac.signal.aborted) return;
      const clientIds = [...new Set((rows || []).map(row => String(row.clientId || "").trim()).filter(Boolean))];
      let tagRows = [];
      if (clientIds.length) {
        try {
          tagRows = await fetchEquipmentTagsBatch(clientIds, { signal: ac.signal });
        } catch {
          tagRows = [];
        }
      }
      if (ac.signal.aborted) return;
      const tagsByEquipment = new Map();
      (Array.isArray(tagRows) ? tagRows : []).forEach(row => {
        const key = `${row.client_id}:${row.equipment_id}`;
        const list = tagsByEquipment.get(key) || [];
        list.push({
          id: row.id,
          label: row.label,
          color: row.color
        });
        tagsByEquipment.set(key, list);
      });
      setItems(
        (rows || []).map(row => ({
          ...row,
          tags: tagsByEquipment.get(`${row.clientId}:${row.dbId}`) || []
        }))
      );
    } catch (err) {
      if (err?.name !== "AbortError") {
        toast.error(err.message || copy.toastLoadError);
      }
    } finally {
      if (!ac.signal.aborted) setLoading(false);
    }
  }, [copy.toastLoadError]);

  useEffect(() => {
    load();
    return () => loadAbortRef.current?.abort();
  }, [load]);

  const filterState = useMemo(
    () => ({
      search,
      selectedClients,
      selectedTypes,
      selectedTags,
      statusFilter,
      locale
    }),
    [search, selectedClients, selectedTypes, selectedTags, statusFilter, locale]
  );

  const statusCounts = useMemo(() => {
    let all = 0;
    let active = 0;
    let inactive = 0;
    items.forEach(item => {
      if (!itemMatchesInventoryFilters(item, filterState, "status")) return;
      all += 1;
      if (item.is_active === false) inactive += 1;
      else active += 1;
    });
    return { all, active, inactive };
  }, [items, filterState]);

  const clientOptions = useMemo(() => {
    const map = new Map();
    items.forEach(item => {
      if (item?.clientId == null) return;
      if (!itemMatchesInventoryFilters(item, filterState, "clients")) return;
      const id = String(item.clientId);
      const existing = map.get(id);
      if (existing) {
        existing.count += 1;
        return;
      }
      map.set(id, {
        id,
        name: item.clientName || id,
        count: 1
      });
    });
    selectedClients.forEach(id => {
      if (map.has(id)) return;
      const sample = items.find(item => String(item.clientId) === id);
      map.set(id, {
        id,
        name: sample?.clientName || id,
        count: 0
      });
    });
    return [...map.values()].sort((a, b) =>
      a.name.localeCompare(b.name, locale, {
        sensitivity: "base"
      })
    );
  }, [items, filterState, selectedClients, locale]);

  const filteredClientsForPane = useMemo(() => {
    if (openFilterSection !== "clients") return clientOptions;
    const q = facetQuery.trim().toLowerCase();
    if (!q) return clientOptions;
    return clientOptions.filter(opt => opt.name.toLowerCase().includes(q));
  }, [clientOptions, facetQuery, openFilterSection]);

  const typeOptions = useMemo(() => {
    const map = new Map();
    items.forEach(item => {
      const key = item?.type;
      if (!key) return;
      if (!itemMatchesInventoryFilters(item, filterState, "types")) return;
      const existing = map.get(key);
      if (existing) {
        existing.count += 1;
        return;
      }
      map.set(key, {
        id: key,
        name: typeLabel(item, locale),
        count: 1,
        familyIcon: item.isCustom ? item.familyIcon : null
      });
    });
    selectedTypes.forEach(key => {
      if (map.has(key)) return;
      const sample = items.find(item => item.type === key);
      map.set(key, {
        id: key,
        name: sample ? typeLabel(sample, locale) : key,
        count: 0,
        familyIcon: sample?.isCustom ? sample.familyIcon : null
      });
    });
    return [...map.values()].sort((a, b) =>
      a.name.localeCompare(b.name, locale, {
        sensitivity: "base"
      })
    );
  }, [items, filterState, selectedTypes, locale]);

  const filteredTypesForPane = useMemo(() => {
    if (openFilterSection !== "types") return typeOptions;
    const q = facetQuery.trim().toLowerCase();
    if (!q) return typeOptions;
    return typeOptions.filter(opt => {
      const name = String(opt.name || "").toLowerCase();
      const id = String(opt.id || "").toLowerCase();
      return name.includes(q) || id.includes(q);
    });
  }, [typeOptions, facetQuery, openFilterSection]);

  const tagOptions = useMemo(() => {
    const map = new Map();
    items.forEach(item => {
      if (!itemMatchesInventoryFilters(item, filterState, "tags")) return;
      (item.tags || []).forEach(tag => {
        const key = String(tag.label || "").trim();
        if (!key) return;
        const id = key.toLowerCase();
        const existing = map.get(id);
        if (existing) {
          existing.count += 1;
          return;
        }
        map.set(id, {
          id,
          label: key,
          color: tag.color || "#2b5fab",
          count: 1
        });
      });
    });
    selectedTags.forEach(id => {
      if (map.has(id)) return;
      const sample = items
        .flatMap(item => item.tags || [])
        .find(tag => String(tag.label || "").toLowerCase() === id);
      map.set(id, {
        id,
        label: sample?.label || id,
        color: sample?.color || "#2b5fab",
        count: 0
      });
    });
    return [...map.values()].sort((a, b) =>
      a.label.localeCompare(b.label, locale, {
        sensitivity: "base"
      })
    );
  }, [items, filterState, selectedTags, locale]);

  const filteredTagsForPane = useMemo(() => {
    if (openFilterSection !== "tags") return tagOptions;
    const q = facetQuery.trim().toLowerCase();
    if (!q) return tagOptions;
    return tagOptions.filter(opt => opt.label.toLowerCase().includes(q));
  }, [tagOptions, facetQuery, openFilterSection]);

  const filtered = useMemo(() => {
    let list = items.filter(item => itemMatchesInventoryFilters(item, filterState));
    const dir = sort.dir === "asc" ? 1 : -1;
    list = [...list].sort((a, b) => {
      const cmp = compareValues(getSortValue(a, sort.key, locale), getSortValue(b, sort.key, locale), locale);
      return cmp * dir;
    });
    return list;
  }, [items, filterState, sort, locale]);

  const customFamilyView = useMemo(() => {
    let type = null;
    if (selectedTypes.size === 1) {
      type = [...selectedTypes][0];
    } else if (selectedTypes.size === 0) {
      const unique = [...new Set(filtered.map(item => item.type))];
      if (unique.length === 1) type = unique[0];
    }
    if (!type) return null;
    const sample =
      items.find(item => item.type === type && (Array.isArray(item.customFields) && item.customFields.length || Array.isArray(item.systemExtensionFields) && item.systemExtensionFields.length)) ||
      items.find(item => item.type === type) ||
      filtered.find(item => item.type === type);
    const fromHook = fieldsFor(type);
    const sourceFields = String(type).startsWith("Custom:")
      ? (Array.isArray(sample?.customFields) ? sample.customFields : [])
      : (fromHook.length ? fromHook : Array.isArray(sample?.systemExtensionFields) ? sample.systemExtensionFields : []);
    const fields = sourceFields
      .filter(field => {
        const key = String(field?.fieldKey || field?.key || "").trim();
        return key && !NAME_FIELD_KEYS.has(key.toLowerCase());
      })
      .sort((a, b) => (Number(a.displayOrder) || 0) - (Number(b.displayOrder) || 0));
    if (!fields.length) return null;
    return {
      type,
      fields
    };
  }, [selectedTypes, filtered, items, fieldsFor]);

  const tableColumns = useMemo(() => {
    const extraKeys = customFamilyView
      ? customFamilyView.fields.map(field => customColumnKey(field.fieldKey || field.key))
      : [];
    if (customFamilyView && String(customFamilyView.type).startsWith("Custom:")) {
      return [
        "company",
        "name",
        "tags",
        ...extraKeys,
        "status",
        "alerts",
        "supervision",
        "alertsMonth"
      ];
    }
    if (extraKeys.length) {
      return [
        "company",
        "name",
        "type",
        "ip",
        "serial",
        "site",
        "tags",
        ...extraKeys,
        "status",
        "alerts",
        "supervision",
        "alertsMonth"
      ];
    }
    const source = filtered.length ? filtered : items;
    const allCustom =
      source.length > 0 &&
      source.every(item => item.isCustom || String(item.type || "").startsWith("Custom:"));
    if (allCustom) {
      return ["company", "name", "type", "site", "tags", "status", "alerts", "supervision", "alertsMonth"];
    }
    return STANDARD_INVENTORY_COLUMNS;
  }, [customFamilyView, filtered, items]);

  useEffect(() => {
    if (tableColumns.includes(sort.key)) return;
    setSort({
      key: "company",
      dir: "asc"
    });
  }, [tableColumns, sort.key]);

  const {
    page,
    setPage,
    pageSize,
    setPageSize,
    totalPages,
    paginatedItems
  } = useTablePagination(filtered, {
    initialPageSize: 25,
    resetDeps: [search, selectedClients, selectedTypes, selectedTags, statusFilter, sort.key, sort.dir]
  });

  useEffect(() => {
    setOpenMenuKey(null);
  }, [search, selectedClients, selectedTypes, selectedTags, statusFilter, page, sort]);

  useEffect(() => {
    setSelectedIds(prev => {
      if (!prev.size) return prev;
      const valid = new Set(items.map(item => item.id));
      const next = [...prev].filter(id => valid.has(id));
      return next.length === prev.size ? prev : new Set(next);
    });
  }, [items]);

  const pageIds = useMemo(() => paginatedItems.map(item => item.id), [paginatedItems]);
  const selectedCount = selectedIds.size;
  const allOnPageSelected = pageIds.length > 0 && pageIds.every(id => selectedIds.has(id));
  const allFilteredSelected = filtered.length > 0 && filtered.every(item => selectedIds.has(item.id));
  const selectedItems = useMemo(() => items.filter(item => selectedIds.has(item.id)), [items, selectedIds]);
  const clearSelection = () => setSelectedIds(new Set());
  const toggleItemSelection = (itemId, checked) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (checked) next.add(itemId);
      else next.delete(itemId);
      return next;
    });
  };
  const toggleSelectAllOnPage = () => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (allOnPageSelected) pageIds.forEach(id => next.delete(id));
      else pageIds.forEach(id => next.add(id));
      return next;
    });
  };
  const selectAllFiltered = () => {
    setSelectedIds(new Set(filtered.map(item => item.id)));
  };
  const handleBulkSuccess = result => {
    const updated = Number(result?.updated) || 0;
    const failed = Array.isArray(result?.failed) ? result.failed.length : 0;
    if (updated > 0 && failed === 0) toast.success(copy.formatBulkSuccess(updated));
    else if (updated > 0 && failed > 0) toast.warn(copy.formatBulkPartial(updated, failed));
    else toast.error(copy.toasts?.bulkError || copy.toastLoadError);
    clearSelection();
    load();
  };

  const toggleClient = clientId => {
    const id = String(clientId);
    setSelectedClients(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleType = typeId => {
    setSelectedTypes(prev => {
      const next = new Set(prev);
      if (next.has(typeId)) next.delete(typeId);
      else next.add(typeId);
      return next;
    });
  };

  const toggleTag = tagId => {
    setSelectedTags(prev => {
      const next = new Set(prev);
      if (next.has(tagId)) next.delete(tagId);
      else next.add(tagId);
      return next;
    });
  };

  const clearFilters = () => {
    setSearch("");
    setFacetQuery("");
    setSelectedClients(new Set());
    setSelectedTypes(new Set());
    setSelectedTags(new Set());
    setStatusFilter("all");
  };

  const openFacetSection = sectionKey => {
    if (sectionKey === openFilterSection) return;
    setFacetQuery("");
    setOpenFilterSection(sectionKey);
  };

  const clearFacetSection = sectionKey => {
    if (sectionKey === "clients") setSelectedClients(new Set());
    else if (sectionKey === "types") setSelectedTypes(new Set());
    else if (sectionKey === "tags") setSelectedTags(new Set());
    setFacetQuery("");
  };

  const toggleSort = key => {
    setSort(prev => {
      const next = cycleSortState({
        column: key,
        sortBy: prev.key,
        sortDirection: prev.dir,
        defaultSortBy: "company",
        defaultSortDirection: "asc"
      });
      return { key: next.sortBy, dir: next.sortDirection };
    });
  };

  const openItem = item => {
    if (!onNavigate || !item) return;
    onNavigate("EquipmentDetail", toEquipmentDetailPayload(item));
  };

  const openItemInBackground = (e, item) => {
    if (!onNavigate || !item) return;
    e.preventDefault();
    e.stopPropagation();
    onNavigate("EquipmentDetail", toEquipmentDetailPayload(item), {
      background: true
    });
  };

  const hasFilters = Boolean(
    search.trim() || selectedClients.size > 0 || selectedTypes.size > 0 || selectedTags.size > 0 || statusFilter !== "all"
  );
  const activeSideFilterCount =
    (statusFilter !== "all" ? 1 : 0) + selectedClients.size + selectedTypes.size + selectedTags.size;

  const getColumnLabel = key => {
    if (isCustomColumnKey(key)) {
      const fieldKey = fieldKeyFromColumn(key);
      const field = customFamilyView?.fields?.find(entry => (entry.fieldKey || entry.key) === fieldKey);
      return field?.label || fieldKey;
    }
    return copy.columns[key] || key;
  };

  const handleExportCsv = () => {
    if (!filtered.length) {
      toast.error(copy.toasts?.exportEmpty || copy.toastLoadError);
      return;
    }
    try {
      const customFields = customFamilyView?.fields || [];
      const headers = tableColumns.map(getColumnLabel);
      const rows = filtered.map(item =>
        tableColumns.map(columnId =>
          csvCell(
            getInventoryColumnValue(item, columnId, {
              locale,
              copy,
              customFields
            })
          )
        )
      );
      const csvContent = [headers.map(csvCell).join(";"), ...rows.map(row => row.join(";"))].join("\n");
      const timestamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
      const prefix = copy.exportFilenamePrefix || "inventaire-peripheriques";
      downloadCsvFile(csvContent, `${prefix}-${timestamp}.csv`);
      toast.success(copy.formatExportSuccess(filtered.length));
    } catch (error) {
      toast.error(error.message || copy.toasts?.exportError || copy.toastLoadError);
    }
  };

  const renderColumnCell = (item, columnId, extras) => {
    if (isCustomColumnKey(columnId)) {
      const fieldKey = fieldKeyFromColumn(columnId);
      const field =
        customFamilyView?.fields?.find(entry => (entry.fieldKey || entry.key) === fieldKey) || { fieldKey };
      const display = formatInventoryFieldValue(field, getCustomFieldRaw(item, fieldKey), locale);
      return (
        <td key={columnId} className={styles.customFieldCell} title={display === "—" ? undefined : display}>
          {display}
        </td>
      );
    }
    switch (columnId) {
      case "company": {
        const company = item.clientName || "—";
        return (
          <td key={columnId} className={styles.companyCell} title={company === "—" ? undefined : company}>
            {company}
          </td>
        );
      }
      case "name": {
        const name = item.name || "—";
        const maintenanceTitle = item.inMaintenance
          ? [
              copy.maintenance?.badge || "En maintenance",
              item.maintenanceUntil
                ? interpolate(copy.maintenance?.until || "Jusqu’au {date}", {
                    date: new Date(item.maintenanceUntil).toLocaleString(
                      locale === "en" ? "en-GB" : locale === "de" ? "de-DE" : locale === "it" ? "it-IT" : locale === "es" ? "es-ES" : "fr-FR",
                      { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }
                    )
                  })
                : copy.maintenance?.indefinite || "Durée indéterminée",
              item.maintenanceReason || null
            ]
              .filter(Boolean)
              .join(" · ")
          : null;
        return (
          <td key={columnId} className={layout.colCompany}>
            <span className={styles.nameCell}>
              {item.inMaintenance ? (
                <SmartTooltip content={maintenanceTitle}>
                  <span className={styles.maintenanceIcon} aria-label={copy.maintenance?.badge || "En maintenance"}>
                    <Icon icon="mdi:traffic-cone" aria-hidden />
                  </span>
                </SmartTooltip>
              ) : null}
              <span className={styles.nameText} title={name === "—" ? undefined : name}>
                {name}
              </span>
            </span>
          </td>
        );
      }
      case "type":
        return <td key={columnId}>{typeLabel(item, locale)}</td>;
      case "ip":
        return <td key={columnId}>{item.ip || "—"}</td>;
      case "serial":
        return <td key={columnId}>{item.serial || "—"}</td>;
      case "site":
        return <td key={columnId}>{item.location || "—"}</td>;
      case "tags":
        return (
          <td key={columnId} className={styles.tagsCell} onClick={e => e.stopPropagation()}>
            {Array.isArray(item.tags) && item.tags.length ? (
              <div className={styles.tagsList}>
                {item.tags.slice(0, 3).map(tag => (
                  <span key={tag.id || tag.label} className={styles.tagChip} style={getTagChipStyle(tag.color)}>
                    {tag.label}
                  </span>
                ))}
                {item.tags.length > 3 ? <span className={styles.tagMore}>+{item.tags.length - 3}</span> : null}
              </div>
            ) : (
              "—"
            )}
          </td>
        );
      case "status":
        return <td key={columnId}>{item.is_active === false ? copy.status.inactive : copy.status.active}</td>;
      case "alerts":
        return (
          <td key={columnId} className={styles.dotCol}>
            <StatusDot tone={extras.alertMeta.tone} label={extras.alertMeta.label} />
          </td>
        );
      case "supervision":
        return (
          <td key={columnId} className={styles.dotCol}>
            <StatusDot tone={extras.supervisionMeta.tone} label={extras.supervisionMeta.label} />
          </td>
        );
      case "alertsMonth":
        return (
          <td key={columnId} className={styles.countCol} title={extras.monthTitle}>
            <span className={`${styles.countPill} ${extras.monthCount > 0 ? styles.countPillHot : ""}`}>
              {extras.monthCount}
            </span>
          </td>
        );
      default:
        return <td key={columnId}>—</td>;
    }
  };

  const renderSortHeader = (key, label) => {
    const active = sort.key === key;
    return (
      <th
        key={key}
        className={`${styles.sortableTh} ${active ? styles.sortableThActive : ""}`}
        onClick={() => toggleSort(key)}
        aria-sort={active ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}
      >
        <span className={styles.sortableThInner}>
          {label}
          <Icon
            icon={active ? (sort.dir === "asc" ? "mdi:arrow-up" : "mdi:arrow-down") : "mdi:unfold-more-horizontal"}
            className={styles.sortIcon}
            aria-hidden
          />
        </span>
      </th>
    );
  };

  const facetSections = [
    {
      key: "clients",
      title: copy.filters?.companies || "Companies",
      selectedCount: selectedClients.size,
      searchPlaceholder: copy.filters?.searchCompany || copy.filterClientAll,
      emptyLabel: copy.filters?.noCompanyFound || "—",
      options: filteredClientsForPane,
      renderOption: opt => ({
        id: opt.id,
        label: opt.name,
        count: opt.count,
        active: selectedClients.has(opt.id),
        onToggle: () => toggleClient(opt.id),
        leading: null
      })
    },
    {
      key: "types",
      title: copy.filters?.types || "Types",
      selectedCount: selectedTypes.size,
      searchPlaceholder: copy.filters?.searchType || copy.filterTypeAll,
      emptyLabel: copy.filters?.noTypeFound || "—",
      options: filteredTypesForPane,
      renderOption: opt => ({
        id: opt.id,
        label: opt.name,
        count: opt.count,
        active: selectedTypes.has(opt.id),
        onToggle: () => toggleType(opt.id),
        leading: (
          <span className={styles.facetOptionIcon} aria-hidden>
            <InventoryDeviceIcon
              item={opt.familyIcon ? { isCustom: true, familyIcon: opt.familyIcon } : { type: opt.id }}
              className={styles.chipIcon}
            />
          </span>
        )
      })
    },
    {
      key: "tags",
      title: copy.filters?.tags || "Tags",
      selectedCount: selectedTags.size,
      searchPlaceholder: copy.filters?.searchTag || "Tag…",
      emptyLabel: copy.filters?.noTagFound || "—",
      options: filteredTagsForPane,
      renderOption: opt => ({
        id: opt.id,
        label: opt.label,
        count: opt.count,
        active: selectedTags.has(opt.id),
        onToggle: () => toggleTag(opt.id),
        leading: <span className={styles.facetTagDot} style={getTagChipStyle(opt.color)} aria-hidden />
      })
    }
  ];

  const openFacet = facetSections.find(section => section.key === openFilterSection) || facetSections[0];

  return (
    <div className={`${cyberStyles.mspPage} ${layout.page} msp-page-grid`}>
      <div className={cyberStyles.mspLayout}>
        <div className={cyberStyles.mspMain}>
          <main className={`${cyberStyles.mspContent} ${cyberStyles.mspContentList} ${layout.contentNoHero}`}>
            <h1 className={layout.srOnly}>{copy.pageTitle}</h1>
            <div className={`${layout.shell} ${layout.shellWide} ${layout.shellFull} ${styles.inventoryShell}`}>
              <div className={styles.viewsLayout}>
                <aside className={styles.filtersPane} aria-label={copy.filters?.aria || "Filters"} data-guide="inventory-filters">
                  <div className={styles.filtersTop}>
                    <div className={styles.filtersTopRow}>
                      <div className={styles.filtersTitleBlock}>
                        <span className={styles.filtersTitle}>{copy.filters?.title || copy.filters?.aria || "Filters"}</span>
                        {activeSideFilterCount > 0 ? (
                          <span className={styles.filtersCountBadge}>{activeSideFilterCount}</span>
                        ) : null}
                      </div>
                      {hasFilters ? (
                        <button type="button" className={styles.filtersResetBtn} onClick={clearFilters}>
                          {copy.filters?.clearAll || "Reset"}
                        </button>
                      ) : null}
                    </div>

                    <div className={styles.statusSegment} role="group" aria-label={copy.filters?.status || "Status"}>
                      {copy.statusFilterItems.map(item => {
                        const active = statusFilter === item.key;
                        const count = statusCounts[item.key] || 0;
                        return (
                          <button
                            key={item.key}
                            type="button"
                            className={`${styles.statusSegmentBtn} ${active ? styles.statusSegmentBtnActive : ""}`}
                            onClick={() => setStatusFilter(item.key)}
                            aria-pressed={active}
                          >
                            <span className={styles.statusSegmentLabel}>{item.label}</span>
                            <span className={styles.statusSegmentCount}>{count}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className={styles.facetNav} role="tablist" aria-label={copy.filters?.facetsAria || copy.filters?.aria}>
                    {facetSections.map(section => {
                      const isOpen = openFilterSection === section.key;
                      return (
                        <button
                          key={section.key}
                          type="button"
                          role="tab"
                          aria-selected={isOpen}
                          className={`${styles.facetNavBtn} ${isOpen ? styles.facetNavBtnActive : ""}`}
                          onClick={() => openFacetSection(section.key)}
                        >
                          <span className={styles.facetNavLabel}>{section.title}</span>
                          {section.selectedCount > 0 ? (
                            <span className={styles.facetNavBadge}>{section.selectedCount}</span>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>

                  <div className={styles.facetBody} role="tabpanel">
                    <div className={styles.facetBodyHeader}>
                      <span className={styles.facetBodyTitle}>{openFacet.title}</span>
                      {openFacet.selectedCount > 0 ? (
                        <button
                          type="button"
                          className={styles.filtersResetBtn}
                          onClick={() => clearFacetSection(openFacet.key)}
                        >
                          {copy.filters?.clear || "Clear"}
                        </button>
                      ) : null}
                    </div>

                    <div className={styles.facetSearchWrap}>
                      <Icon icon="mdi:magnify" className={styles.facetSearchIcon} aria-hidden />
                      <input
                        type="text"
                        className={styles.facetSearchInput}
                        value={facetQuery}
                        onChange={e => setFacetQuery(e.target.value)}
                        placeholder={openFacet.searchPlaceholder}
                        autoComplete="off"
                        aria-label={openFacet.searchPlaceholder}
                      />
                      {facetQuery ? (
                        <button
                          type="button"
                          className={styles.facetSearchClear}
                          onClick={() => setFacetQuery("")}
                          aria-label={copy.clearSearch}
                        >
                          <FaTimes />
                        </button>
                      ) : null}
                    </div>

                    <div className={styles.facetList}>
                      {openFacet.options.length === 0 ? (
                        <p className={styles.facetEmpty}>{openFacet.emptyLabel}</p>
                      ) : (
                        openFacet.options.map(opt => {
                          const row = openFacet.renderOption(opt);
                          return (
                            <button
                              key={row.id}
                              type="button"
                              className={`${styles.facetOption} ${row.active ? styles.facetOptionActive : ""} ${
                                row.count === 0 && !row.active ? styles.facetOptionDisabled : ""
                              }`}
                              onClick={row.onToggle}
                              disabled={row.count === 0 && !row.active}
                              aria-pressed={row.active}
                            >
                              <span className={`${styles.facetCheck} ${row.active ? styles.facetCheckOn : ""}`} aria-hidden>
                                {row.active ? <Icon icon="mdi:check" width={12} height={12} /> : null}
                              </span>
                              {row.leading}
                              <span className={styles.facetOptionLabel}>{row.label}</span>
                              <span className={styles.facetOptionCount}>{row.count}</span>
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>
                </aside>

                <div className={styles.mainColumn}>
                  {loading ? (
                    <PageSkeleton variant="list" rows={8} label={copy.loading} />
                  ) : (
                    <div className={layout.listBody}>
                      <div className={layout.listArea}>
                        <div className={layout.panelCard}>
                          <div className={layout.tableSearchBar} data-guide="inventory-search">
                            <div className={`${layout.searchWrap} ${layout.searchWrapInCard}`}>
                              <Icon icon="mdi:magnify" className={layout.searchIcon} aria-hidden />
                              <input
                                type="text"
                                inputMode="search"
                                enterKeyHint="search"
                                className={layout.searchInput}
                                placeholder={copy.searchPlaceholder}
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                aria-label={copy.searchAria}
                              />
                              {search ? (
                                <button
                                  type="button"
                                  className={layout.clearButton}
                                  onClick={() => setSearch("")}
                                  aria-label={copy.clearSearch}
                                >
                                  <FaTimes />
                                </button>
                              ) : null}
                            </div>
                            <div className={layout.toolbarActions} data-guide="inventory-hero">
                              <SmartTooltip content={copy.exportCsv}>
                                <button
                                  type="button"
                                  className={layout.iconBtn}
                                  onClick={handleExportCsv}
                                  disabled={filtered.length === 0}
                                  aria-label={copy.exportCsvAria}
                                >
                                  <Icon icon="mdi:download-outline" />
                                </button>
                              </SmartTooltip>
                              <SmartTooltip content={copy.refresh}>
                                <button
                                  type="button"
                                  className={layout.iconBtn}
                                  onClick={load}
                                  aria-label={copy.refresh}
                                >
                                  <Icon icon="mdi:refresh" />
                                </button>
                              </SmartTooltip>
                            </div>
                          </div>

                          {filtered.length === 0 ? (
                            <div className={layout.emptyStateInCard} data-guide="inventory-table">
                              <Icon icon="mdi:devices" className={layout.emptyStateIcon} />
                              <p className={layout.emptyStateTitle}>{copy.emptyTitle}</p>
                              <p className={layout.emptyStateHint}>{hasFilters ? copy.emptyFiltered : copy.emptyHint}</p>
                            </div>
                          ) : (
                            <>
                              <div className={layout.dataTableWrap} data-guide="inventory-table">
                                <div className={`${layout.dataTableScroll} ${styles.tableScroll}`}>
                                  <table className={styles.table}>
                                    <thead>
                                      <tr>
                                        {canBulkEdit ? (
                                          <th className={styles.checkboxCell}>
                                            <input
                                              type="checkbox"
                                              className={styles.rowCheckbox}
                                              checked={allOnPageSelected}
                                              onChange={toggleSelectAllOnPage}
                                              onClick={e => e.stopPropagation()}
                                              aria-label={copy.bulk.selectAll}
                                            />
                                          </th>
                                        ) : null}
                                        <th className={styles.brandCol} aria-hidden />
                                        {tableColumns.map(columnId => renderSortHeader(columnId, getColumnLabel(columnId)))}
                                        <th className={styles.actionsCol}>{copy.columns.actions}</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {paginatedItems.map(item => {
                                        const isSelected = selectedIds.has(item.id);
                                        const alertMeta = alertStatusMeta(item, copy);
                                        const supervisionMeta = supervisionStatusMeta(item, copy);
                                        const monthCount = Number(item.alertsLastMonth) || 0;
                                        const monthTitle = copy.formatAlertsMonthBreakdown
                                          ? copy.formatAlertsMonthBreakdown(
                                              item.alertsNativeLastMonth,
                                              item.alertsSupervisionLastMonth
                                            )
                                          : copy.alertsMonthHint;
                                        return (
                                          <tr
                                            key={item.id}
                                            className={isSelected ? styles.selectedRow : undefined}
                                            onClick={() => openItem(item)}
                                            onMouseDown={e => {
                                              if (e.button === 1) openItemInBackground(e, item);
                                            }}
                                            onAuxClick={e => {
                                              if (e.button === 1) openItemInBackground(e, item);
                                            }}
                                            onKeyDown={e => {
                                              if (e.key === "Enter" || e.key === " ") {
                                                e.preventDefault();
                                                openItem(item);
                                              }
                                            }}
                                            role="button"
                                            tabIndex={0}
                                          >
                                            {canBulkEdit ? (
                                              <td className={styles.checkboxCell} onClick={e => e.stopPropagation()}>
                                                <input
                                                  type="checkbox"
                                                  className={styles.rowCheckbox}
                                                  checked={isSelected}
                                                  onChange={e => toggleItemSelection(item.id, e.target.checked)}
                                                  aria-label={copy.formatBulkSelectRow(item.name)}
                                                />
                                              </td>
                                            ) : null}
                                            <td className={styles.brandCol}>
                                              <InventoryDeviceIcon item={item} className={styles.brandIcon} />
                                            </td>
                                            {tableColumns.map(columnId =>
                                              renderColumnCell(item, columnId, {
                                                alertMeta,
                                                supervisionMeta,
                                                monthTitle,
                                                monthCount
                                              })
                                            )}
                                            <td className={styles.actionsCol} onClick={e => e.stopPropagation()}>
                                              <InventoryEquipmentActions
                                                equipment={item}
                                                locale={locale}
                                                menuKey={item.id}
                                                openMenuKey={openMenuKey}
                                                onOpenChange={setOpenMenuKey}
                                                onOpen={openItem}
                                              />
                                            </td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                </div>
                              </div>

                              <div className={`${layout.pagination} ${layout.paginationEmbedded}`}>
                                <div className={layout.paginationLeft}>
                                  <span className={layout.paginationLabel}>{copy.perPage}</span>
                                  <select
                                    className={layout.paginationSelect}
                                    value={pageSize}
                                    onChange={e => setPageSize(Number(e.target.value))}
                                  >
                                    <option value={10}>10</option>
                                    <option value={25}>25</option>
                                    <option value={50}>50</option>
                                    <option value={100}>100</option>
                                  </select>
                                  <span className={layout.paginationInfo}>
                                    {interpolate(common.rangeInfo || "{start}–{end} / {total}", {
                                      start: String((page - 1) * pageSize + 1),
                                      end: String(Math.min(page * pageSize, filtered.length)),
                                      total: String(filtered.length)
                                    })}
                                  </span>
                                </div>
                                <div className={layout.paginationRight}>
                                  <SmartTooltip content={copy.prevPage}>
                                    <button
                                      type="button"
                                      className={layout.pageBtn}
                                      onClick={() => setPage(Math.max(1, page - 1))}
                                      disabled={page <= 1}
                                      aria-label={copy.prevPage}
                                    >
                                      <FaChevronLeft />
                                    </button>
                                  </SmartTooltip>
                                  <span className={layout.paginationInfo}>{copy.formatPageInfo(page, totalPages)}</span>
                                  <SmartTooltip content={copy.nextPage}>
                                    <button
                                      type="button"
                                      className={layout.pageBtn}
                                      onClick={() => setPage(Math.min(totalPages, page + 1))}
                                      disabled={page >= totalPages}
                                      aria-label={copy.nextPage}
                                    >
                                      <FaChevronRight />
                                    </button>
                                  </SmartTooltip>
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                      {selectedCount > 0 && canBulkEdit ? (
                        <div className={layout.bulkBar}>
                          <div className={layout.bulkInfo}>
                            <strong>{selectedCount}</strong>
                            <span>{selectedCount > 1 ? copy.bulk.selectedPlural : copy.bulk.selected}</span>
                          </div>
                          <div className={layout.bulkActions}>
                            {!allFilteredSelected ? (
                              <button type="button" className={layout.bulkBtnGhost} onClick={selectAllFiltered}>
                                {copy.formatSelectAllFiltered(filtered.length)}
                              </button>
                            ) : null}
                            <button type="button" className={layout.bulkBtn} onClick={() => setBulkModalOpen(true)}>
                              <Icon icon="mdi:pencil-outline" />
                              {copy.bulk.edit}
                            </button>
                            <button type="button" className={layout.bulkBtnGhost} onClick={clearSelection}>
                              {copy.bulk.clearSelection}
                            </button>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
      <InventoryBulkEditModal
        open={bulkModalOpen}
        onClose={() => setBulkModalOpen(false)}
        items={selectedItems}
        onSuccess={handleBulkSuccess}
      />
      <PageGuideTour open={pageGuideOpen} steps={inventoryGuide.steps} title={inventoryGuide.tourTitle} locale={locale} onClose={() => setPageGuideOpen(false)} />
    </div>
  );
}
