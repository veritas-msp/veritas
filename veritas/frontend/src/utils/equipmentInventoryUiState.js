const STORAGE_KEY = "veritas_equipment_inventory_ui_v1";
const STATUS_FILTERS = new Set(["all", "active", "inactive"]);
const FACET_SECTIONS = new Set(["clients", "types", "tags"]);
const PAGE_SIZES = new Set([10, 25, 50, 100]);

function toStringArray(value) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map(entry => String(entry ?? "").trim()).filter(Boolean))];
}

export function readEquipmentInventoryUi() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

export function writeEquipmentInventoryUi(patch = {}) {
  if (!patch || typeof patch !== "object") return;
  try {
    const previous = readEquipmentInventoryUi() || {};
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        ...previous,
        ...patch,
        updatedAt: Date.now()
      })
    );
  } catch {
    // ignore quota / private mode
  }
}

export function getEquipmentInventoryUiDefaults(saved = null) {
  const raw = saved && typeof saved === "object" ? saved : {};
  const pageSize = Number(raw.pageSize);
  const page = Number(raw.page);
  const tableScrollY = Number(raw.tableScrollY);
  const facetScrollY = Number(raw.facetScrollY);
  return {
    search: typeof raw.search === "string" ? raw.search : "",
    facetQuery: typeof raw.facetQuery === "string" ? raw.facetQuery : "",
    selectedClients: toStringArray(raw.selectedClients),
    selectedTypes: toStringArray(raw.selectedTypes),
    selectedTags: toStringArray(raw.selectedTags),
    statusFilter: STATUS_FILTERS.has(raw.statusFilter) ? raw.statusFilter : "all",
    openFilterSection: FACET_SECTIONS.has(raw.openFilterSection) ? raw.openFilterSection : "clients",
    sortKey: typeof raw.sortKey === "string" && raw.sortKey.trim() ? raw.sortKey : "company",
    sortDir: raw.sortDir === "desc" ? "desc" : "asc",
    page: Number.isFinite(page) && page >= 1 ? Math.floor(page) : 1,
    pageSize: PAGE_SIZES.has(pageSize) ? pageSize : 25,
    tableScrollY: Number.isFinite(tableScrollY) && tableScrollY > 0 ? tableScrollY : 0,
    facetScrollY: Number.isFinite(facetScrollY) && facetScrollY > 0 ? facetScrollY : 0
  };
}
