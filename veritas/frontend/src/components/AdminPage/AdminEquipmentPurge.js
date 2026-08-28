import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";
import { toast } from "react-toastify";
import { deleteEquipment, getEquipmentPurgeList } from "../../api/equipment";
import { getEquipmentListKey } from "../../utils/equipmentIdentity";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { Page, Card, Btn, ConfirmModal, Pagination } from "./AdminUi";
import ui from "./AdminUi.module.css";
import { useTablePagination } from "./useTablePagination";
import { getAdminEquipmentPurgeCopy, interpolate } from "./adminEquipmentPurgeI18n";
import s from "./AdminEquipmentPurge.module.css";

const DROPDOWN_MAX_HEIGHT = 280;

function equipmentSearchBlob(item) {
  return [
    item?.name,
    item?.clientName,
    item?.type,
    item?.familyLabel,
    item?.familyKey,
    item?.ip,
    item?.serial,
    item?.mac,
    item?.location,
    item?.model
  ].filter(Boolean).join(" ").toLowerCase();
}

function getPurgeTypeKey(item) {
  if (item?.isCustom || String(item?.type || "").startsWith("Custom:")) {
    return item.familyKey ? `Custom:${item.familyKey}` : String(item?.type || "");
  }
  return String(item?.type || "");
}

function getPurgeTypeLabel(item) {
  return item?.familyLabel || item?.type || "";
}

function SearchableFilterSelect({
  value,
  onChange,
  options,
  allLabel,
  searchPlaceholder,
  emptyLabel,
  ariaLabel,
  disabled = false
}) {
  const rootRef = useRef(null);
  const buttonRef = useRef(null);
  const menuRef = useRef(null);
  const searchRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [menuStyle, setMenuStyle] = useState(null);

  const selectedLabel = useMemo(() => {
    if (!value) return allLabel;
    return options.find(opt => String(opt.id) === String(value))?.name || allLabel;
  }, [value, options, allLabel]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(opt => String(opt.name || "").toLowerCase().includes(q));
  }, [options, query]);

  const updatePosition = useCallback(() => {
    const anchor = buttonRef.current;
    if (!anchor) return;
    const rect = anchor.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom - 8;
    const spaceAbove = rect.top - 8;
    const openUp = spaceBelow < 180 && spaceAbove > spaceBelow;
    const maxHeight = Math.max(140, Math.min(DROPDOWN_MAX_HEIGHT, openUp ? spaceAbove : spaceBelow));
    setMenuStyle({
      position: "fixed",
      left: rect.left,
      width: Math.max(rect.width, 240),
      zIndex: 1200,
      maxHeight,
      ...(openUp ? {
        top: rect.top - 4,
        transform: "translateY(-100%)"
      } : {
        top: rect.bottom + 4
      })
    });
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    updatePosition();
    const t = window.setTimeout(() => searchRef.current?.focus(), 0);
    const onPointer = event => {
      const target = event.target;
      if (rootRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
      setQuery("");
    };
    const onReposition = () => updatePosition();
    document.addEventListener("pointerdown", onPointer);
    window.addEventListener("resize", onReposition);
    window.addEventListener("scroll", onReposition, true);
    return () => {
      window.clearTimeout(t);
      document.removeEventListener("pointerdown", onPointer);
      window.removeEventListener("resize", onReposition);
      window.removeEventListener("scroll", onReposition, true);
    };
  }, [open, updatePosition]);

  const pick = nextValue => {
    onChange(nextValue);
    setOpen(false);
    setQuery("");
  };

  const menu = open ? createPortal(<div ref={menuRef} className={s.filterMenu} style={menuStyle || {
    position: "fixed",
    visibility: "hidden"
  }} role="listbox" aria-label={ariaLabel}>
      <div className={s.filterMenuSearch}>
        <Icon icon="mdi:magnify" className={s.filterMenuSearchIcon} aria-hidden />
        <input
          ref={searchRef}
          type="search"
          className={s.filterMenuSearchInput}
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder={searchPlaceholder}
          aria-label={searchPlaceholder}
          onKeyDown={e => {
            if (e.key === "Escape") {
              setOpen(false);
              setQuery("");
            }
          }}
        />
      </div>
      <div className={s.filterMenuList}>
        <button
          type="button"
          role="option"
          aria-selected={!value}
          className={`${s.filterMenuOption} ${!value ? s.filterMenuOptionActive : ""}`}
          onClick={() => pick("")}
        >
          {allLabel}
        </button>
        {filtered.length === 0 ? <div className={s.filterMenuEmpty}>{emptyLabel}</div> : filtered.map(opt => <button
          key={opt.id}
          type="button"
          role="option"
          aria-selected={String(value) === String(opt.id)}
          className={`${s.filterMenuOption} ${String(value) === String(opt.id) ? s.filterMenuOptionActive : ""}`}
          onClick={() => pick(String(opt.id))}
        >
          {opt.name}
        </button>)}
      </div>
    </div>, document.body) : null;

  return <div className={s.filterSelectWrap} ref={rootRef}>
      <button
        ref={buttonRef}
        type="button"
        className={`${s.filterSelectBtn} ${open ? s.filterSelectBtnOpen : ""}`}
        onClick={() => {
          if (disabled) return;
          setOpen(prev => !prev);
          if (open) setQuery("");
        }}
        disabled={disabled}
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <span className={s.filterSelectBtnLabel}>{selectedLabel}</span>
        <Icon icon={open ? "mdi:chevron-up" : "mdi:chevron-down"} aria-hidden />
      </button>
      {menu}
    </div>;
}

export default function AdminEquipmentPurge() {
  const locale = useAppLocale();
  const copy = useMemo(() => getAdminEquipmentPurgeCopy(locale), [locale]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [clientFilter, setClientFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [deleteTargets, setDeleteTargets] = useState([]);
  const [deleting, setDeleting] = useState(false);
  const [deleteProgress, setDeleteProgress] = useState({ done: 0, total: 0 });
  const loadAbortRef = useRef(null);

  const load = useCallback(async () => {
    loadAbortRef.current?.abort();
    const ac = new AbortController();
    loadAbortRef.current = ac;
    setLoading(true);
    try {
      const rows = await getEquipmentPurgeList({ signal: ac.signal });
      if (!ac.signal.aborted) {
        setItems(Array.isArray(rows) ? rows : []);
      }
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

  const clientOptions = useMemo(() => {
    const map = new Map();
    items.forEach(item => {
      const id = item?.clientId;
      if (id == null) return;
      if (!map.has(String(id))) {
        map.set(String(id), item.clientName || String(id));
      }
    });
    return [...map.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name, locale, { sensitivity: "base" }));
  }, [items, locale]);

  const typeOptions = useMemo(() => {
    const map = new Map();
    items.forEach(item => {
      const id = getPurgeTypeKey(item);
      if (!id) return;
      if (!map.has(id)) map.set(id, getPurgeTypeLabel(item) || id);
    });
    return [...map.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name, locale, { sensitivity: "base" }));
  }, [items, locale]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter(item => {
      if (clientFilter && String(item.clientId) !== clientFilter) return false;
      if (typeFilter && getPurgeTypeKey(item) !== typeFilter) return false;
      if (q && !equipmentSearchBlob(item).includes(q)) return false;
      return true;
    });
  }, [items, search, clientFilter, typeFilter]);

  const {
    page,
    setPage,
    pageSize,
    setPageSize,
    totalPages,
    paginatedItems,
    rangeLabel
  } = useTablePagination(filtered, {
    initialPageSize: 100,
    resetDeps: [search, clientFilter, typeFilter],
    rangeFormatter: (start, end, total) => `${start}-${end} / ${total}`
  });

  useEffect(() => {
    const valid = new Set(items.map(getEquipmentListKey));
    setSelectedIds(prev => {
      const next = new Set();
      prev.forEach(id => {
        if (valid.has(id)) next.add(id);
      });
      return next.size === prev.size ? prev : next;
    });
  }, [items]);

  const allPageSelected = paginatedItems.length > 0 && paginatedItems.every(item => selectedIds.has(getEquipmentListKey(item)));
  const allFilteredSelected = filtered.length > 0 && filtered.every(item => selectedIds.has(getEquipmentListKey(item)));
  const showSelectAllFilteredHint = allPageSelected && !allFilteredSelected && filtered.length > paginatedItems.length;

  const toggleSelect = key => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);else next.add(key);
      return next;
    });
  };

  const toggleSelectPage = () => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (allPageSelected) {
        paginatedItems.forEach(item => next.delete(getEquipmentListKey(item)));
      } else {
        paginatedItems.forEach(item => next.add(getEquipmentListKey(item)));
      }
      return next;
    });
  };

  const selectAllFiltered = () => {
    setSelectedIds(new Set(filtered.map(getEquipmentListKey)));
  };

  const selectedItems = useMemo(() => {
    if (selectedIds.size === 0) return [];
    return items.filter(item => selectedIds.has(getEquipmentListKey(item)));
  }, [items, selectedIds]);

  const openDelete = targets => {
    if (!targets.length) return;
    setDeleteTargets(targets);
  };

  const confirmDelete = async () => {
    if (!deleteTargets.length || deleting) return;
    setDeleting(true);
    const total = deleteTargets.length;
    setDeleteProgress({ done: 0, total });
    let ok = 0;
    let failed = 0;
    const BATCH = 8;
    try {
      for (let i = 0; i < deleteTargets.length; i += BATCH) {
        const chunk = deleteTargets.slice(i, i + BATCH);
        const results = await Promise.allSettled(chunk.map(equipment => deleteEquipment(equipment)));
        results.forEach(result => {
          if (result.status === "fulfilled") ok += 1;else failed += 1;
        });
        setDeleteProgress({ done: Math.min(i + chunk.length, total), total });
      }
      if (failed === 0) {
        toast.success(ok === 1 ? copy.toastDeletedOne : interpolate(copy.toastDeletedMany, { count: ok }));
      } else if (ok > 0) {
        toast.warn(interpolate(copy.toastPartial, { ok, failed }));
      } else {
        toast.error(copy.toastDeleteError);
      }
      setSelectedIds(new Set());
      setDeleteTargets([]);
      await load();
    } catch (err) {
      toast.error(err.message || copy.toastDeleteError);
    } finally {
      setDeleting(false);
      setDeleteProgress({ done: 0, total: 0 });
    }
  };

  const selectedCount = selectedIds.size;
  const hasFilters = Boolean(search.trim() || clientFilter || typeFilter);

  return <Page>
      <Card title={copy.title} description={copy.subtitle}>
        <div className={s.wrap}>
          <div className={s.panelInner}>
            <div className={ui.toolRow}>
              <div className={`${ui.toolLeft} ${s.filters}`}>
                <input
                  type="search"
                  className={ui.fieldSearch}
                  placeholder={copy.searchPlaceholder}
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  aria-label={copy.searchAria}
                />
                <SearchableFilterSelect
                  value={clientFilter}
                  onChange={setClientFilter}
                  options={clientOptions}
                  allLabel={copy.filterClientAll}
                  searchPlaceholder={copy.filterClientSearch}
                  emptyLabel={copy.filterClientEmpty}
                  ariaLabel={copy.filterClientAria}
                  disabled={loading || deleting}
                />
                <SearchableFilterSelect
                  value={typeFilter}
                  onChange={setTypeFilter}
                  options={typeOptions}
                  allLabel={copy.filterTypeAll}
                  searchPlaceholder={copy.filterTypeSearch}
                  emptyLabel={copy.filterTypeEmpty}
                  ariaLabel={copy.filterTypeAria}
                  disabled={loading || deleting}
                />
                <span className={ui.count}>{interpolate(copy.count, { count: filtered.length })}</span>
              </div>
              <Btn variant="secondary" icon="mdi:refresh" onClick={load} disabled={loading || deleting}>
                {copy.refresh}
              </Btn>
            </div>

            {showSelectAllFilteredHint ? <div className={s.selectAllHint}>
                <span>{interpolate(copy.selectAllFilteredHint, { count: filtered.length })}</span>
                <Btn variant="secondary" onClick={selectAllFiltered} disabled={deleting}>
                  {interpolate(copy.selectAllFiltered, { count: filtered.length })}
                </Btn>
              </div> : null}

            {selectedCount > 0 ? <div className={s.bulkBar}>
                <span className={s.bulkInfo}>
                  {deleting && deleteProgress.total > 0
                    ? interpolate(copy.deletingProgress, { done: deleteProgress.done, total: deleteProgress.total })
                    : interpolate(copy.selected, { count: selectedCount })}
                </span>
                <div className={s.bulkActions}>
                  {!allFilteredSelected && filtered.length > selectedCount ? <Btn variant="ghost" onClick={selectAllFiltered} disabled={deleting}>
                      {interpolate(copy.selectAllFiltered, { count: filtered.length })}
                    </Btn> : null}
                  <Btn variant="ghost" onClick={() => setSelectedIds(new Set())} disabled={deleting}>
                    {copy.deselectAll}
                  </Btn>
                  <Btn variant="danger" icon="mdi:trash-can-outline" onClick={() => openDelete(selectedItems)} disabled={deleting}>
                    {copy.deleteSelection}
                  </Btn>
                </div>
              </div> : null}

            <div className={s.tableSection}>
              <div className={s.tableWrap}>
                <table className={s.table}>
                  <thead>
                    <tr>
                      <th className={s.checkboxCell}>
                        <input
                          type="checkbox"
                          className={s.checkbox}
                          checked={allPageSelected}
                          disabled={paginatedItems.length === 0 || deleting}
                          onChange={toggleSelectPage}
                          aria-label={copy.selectPageAria}
                        />
                      </th>
                      <th>{copy.columns.company}</th>
                      <th>{copy.columns.name}</th>
                      <th>{copy.columns.type}</th>
                      <th>{copy.columns.ip}</th>
                      <th>{copy.columns.serial}</th>
                      <th>{copy.columns.site}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? <tr>
                        <td colSpan={7} className={s.empty}>{copy.loading}</td>
                      </tr> : paginatedItems.length === 0 ? <tr>
                        <td colSpan={7} className={s.empty}>{hasFilters ? copy.emptyFiltered : copy.empty}</td>
                      </tr> : paginatedItems.map(item => {
                    const key = getEquipmentListKey(item);
                    const name = item.name || "—";
                    return <tr key={key}>
                            <td className={s.checkboxCell}>
                              <input
                                type="checkbox"
                                className={s.checkbox}
                                checked={selectedIds.has(key)}
                                disabled={deleting}
                                onChange={() => toggleSelect(key)}
                                aria-label={interpolate(copy.selectRowAria, { name })}
                              />
                            </td>
                            <td>
                              <div className={s.nameMain}>{item.clientName || "—"}</div>
                            </td>
                            <td className={s.nameCell}>
                              <div className={s.nameMain}>{name}</div>
                              {item.model ? <div className={s.nameSub}>{item.model}</div> : null}
                            </td>
                            <td>{getPurgeTypeLabel(item) || "—"}</td>
                            <td className={item.ip ? undefined : s.muted}>{item.ip || "—"}</td>
                            <td className={item.serial ? undefined : s.muted}>{item.serial || "—"}</td>
                            <td className={item.location ? undefined : s.muted}>{item.location || "—"}</td>
                          </tr>;
                  })}
                  </tbody>
                </table>
              </div>
            </div>

            {filtered.length > 0 ? <Pagination
              page={page}
              totalPages={totalPages}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
              rangeLabel={rangeLabel}
              pageSizeOptions={[25, 50, 100, 200]}
            /> : null}

            <p className={s.hint}>{copy.hint}</p>
          </div>
        </div>
      </Card>

      <ConfirmModal
        open={deleteTargets.length > 0}
        onClose={() => !deleting && setDeleteTargets([])}
        onConfirm={confirmDelete}
        title={interpolate(copy.confirmTitle, { count: deleteTargets.length })}
        icon="mdi:delete-alert-outline"
        confirmLabel={copy.confirmLabel}
        confirmLoading={deleting}
        width="560px"
        message={<div>
            <p style={{ margin: 0, lineHeight: 1.5 }}>{copy.confirmIntro}</p>
            <ul className={s.bulkDeleteModalList}>
              {deleteTargets.slice(0, 10).map(item => <li key={getEquipmentListKey(item)}>
                  <strong>{item.clientName || "—"}</strong>
                  {" · "}
                  {item.name || "—"}
                  {getPurgeTypeLabel(item) ? ` (${getPurgeTypeLabel(item)})` : ""}
                </li>)}
              {deleteTargets.length > 10 ? <li>
                  {interpolate(copy.confirmOthers, { count: deleteTargets.length - 10 })}
                </li> : null}
            </ul>
          </div>}
      />
    </Page>;
}
