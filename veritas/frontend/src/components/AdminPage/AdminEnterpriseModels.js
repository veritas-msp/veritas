import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@iconify/react";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";
import { toast } from "react-toastify";
import { deleteClient } from "../../api/clients";
import { getClientNameWithoutCode, getClientNumber } from "../../utils/clientDisplay";
import { loadAdminClientsListCached, ADMIN_CLIENTS_LIST_CACHE_KEY } from "./adminClientsListHelpers";
import EnterpriseDeleteModal from "../EnterprisesPage/EnterpriseDeleteModal";
import EnterpriseBlockersModal from "./EnterpriseBlockersModal";
import { Btn, ConfirmModal } from "./AdminUi";
import ui from "./AdminUi.module.css";
import { getClientDeletionBlockers, isClientDeletable } from "./clientDeletionUi";
import { getLinkedElementsSummary } from "./clientLinkedElementsUi";
import s from "./AdminEnterpriseModels.module.css";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { getAdminDeleteConfirmsCopy } from "./adminModalsI18n";
import { useAdminClientsCopy } from "../../hooks/useAdminCopy";
import { useCommonCopy } from "../../hooks/useCommonCopy";
import { formatEnterpriseCount, formatSelectedCount, interpolate } from "./adminClientsI18n";
const PAGE_SIZES = [10, 25, 50, 100];
export default function AdminEnterpriseModels({
  refreshToken = 0,
  onLoadingChange
}) {
  const locale = useAppLocale();
  const copy = useAdminClientsCopy();
  const deleteCopy = useMemo(() => getAdminDeleteConfirmsCopy(locale), [locale]);
  const common = useCommonCopy();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState("name");
  const [sortDir, setSortDir] = useState("asc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [deleteTargets, setDeleteTargets] = useState([]);
  const [blockersClient, setBlockersClient] = useState(null);
  const [forceBulkTargets, setForceBulkTargets] = useState([]);
  const [forceDeleting, setForceDeleting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const loadAbortRef = useRef(null);
  const load = useCallback(async (force = false) => {
    loadAbortRef.current?.abort();
    const ac = new AbortController();
    loadAbortRef.current = ac;
    setLoading(true);
    try {
      const rows = await loadAdminClientsListCached({
        force,
        signal: ac.signal,
        cacheKey: ADMIN_CLIENTS_LIST_CACHE_KEY
      });
      if (!ac.signal.aborted) setClients(rows);
    } catch (err) {
      if (err?.name !== "AbortError") {
        toast.error(err.message || copy.toast.loadError);
      }
    } finally {
      if (!ac.signal.aborted) setLoading(false);
    }
  }, [copy.toast.loadError]);
  useEffect(() => {
    load(true);
    return () => loadAbortRef.current?.abort();
  }, [load]);
  useEffect(() => {
    if (refreshToken > 0) load(true);
  }, [refreshToken, load]);
  useEffect(() => {
    onLoadingChange?.(loading);
  }, [loading, onLoadingChange]);
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let rows = clients;
    if (q) {
      rows = rows.filter(client => {
        const number = getClientNumber(client);
        const name = getClientNameWithoutCode(client.name, number);
        return [client.name, name, number, client.client_number, client.email].filter(Boolean).some(value => String(value).toLowerCase().includes(q));
      });
    }
    return [...rows].sort((a, b) => {
      let aVal;
      let bVal;
      if (sortKey === "deletable") {
        aVal = isClientDeletable(a) ? 0 : 1;
        bVal = isClientDeletable(b) ? 0 : 1;
      } else if (sortKey === "blockers") {
        aVal = getClientDeletionBlockers(a).length;
        bVal = getClientDeletionBlockers(b).length;
      } else {
        aVal = a[sortKey] ?? "";
        bVal = b[sortKey] ?? "";
      }
      if (typeof aVal !== "string") aVal = String(aVal);
      if (typeof bVal !== "string") bVal = String(bVal);
      const cmp = aVal.localeCompare(bVal, copy.bcp47, {
        numeric: true
      });
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [clients, search, sortKey, sortDir, copy.bcp47]);
  useEffect(() => {
    setPage(1);
  }, [search, sortKey, sortDir, pageSize]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageStart = filtered.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const pageEnd = Math.min(currentPage * pageSize, filtered.length);
  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const allPageSelected = paginated.length > 0 && paginated.every(client => selectedIds.has(client.id));
  useEffect(() => {
    setSelectedIds(prev => {
      const valid = new Set(clients.map(client => client.id));
      const next = new Set();
      prev.forEach(id => {
        if (valid.has(id)) next.add(id);
      });
      return next.size === prev.size ? prev : next;
    });
  }, [clients]);
  const toggleSort = key => {
    if (sortKey === key) setSortDir(dir => dir === "asc" ? "desc" : "asc");else {
      setSortKey(key);
      setSortDir("asc");
    }
  };
  const sortIndicator = key => sortKey === key ? sortDir === "asc" ? " ▲" : " ▼" : "";
  const toggleSelect = clientId => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(clientId)) next.delete(clientId);else next.add(clientId);
      return next;
    });
  };
  const toggleSelectPage = () => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (allPageSelected) {
        paginated.forEach(client => next.delete(client.id));
      } else {
        paginated.forEach(client => next.add(client.id));
      }
      return next;
    });
  };
  const openDelete = targets => {
    const rows = targets.map(id => clients.find(client => client.id === id)).filter(Boolean);
    if (rows.length === 0) {
      toast.error(copy.toast.noneDeletable);
      return;
    }
    const blocked = rows.filter(client => !isClientDeletable(client));
    if (blocked.length === 1 && rows.length === 1) {
      setBlockersClient(blocked[0]);
      return;
    }
    if (blocked.length > 0 && rows.length > 1) {
      setForceBulkTargets(rows);
      return;
    }
    setDeleteTargets(rows);
  };
  const removeFromState = deletedIds => {
    const deletedSet = new Set(deletedIds);
    setClients(prev => prev.filter(client => !deletedSet.has(client.id)));
    try {
      const raw = sessionStorage.getItem(ADMIN_CLIENTS_LIST_CACHE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed?.data)) return;
      sessionStorage.setItem(ADMIN_CLIENTS_LIST_CACHE_KEY, JSON.stringify({
        savedAt: Date.now(),
        data: parsed.data.filter(client => !deletedSet.has(client.id))
      }));
    } catch {}
  };
  const confirmDelete = async (targets = deleteTargets, {
    force = false
  } = {}) => {
    if (!targets.length) return;
    setDeleting(true);
    setForceDeleting(Boolean(force));
    try {
      const results = await Promise.allSettled(targets.map(client => deleteClient(client.id, {
        force
      })));
      const succeeded = targets.filter((_, index) => results[index].status === "fulfilled");
      const failed = results.filter(result => result.status === "rejected");
      if (succeeded.length > 0) {
        const ids = succeeded.map(client => client.id);
        removeFromState(ids);
        setSelectedIds(prev => {
          const next = new Set(prev);
          ids.forEach(id => next.delete(id));
          return next;
        });
        window.dispatchEvent(new CustomEvent("refreshEnterprises"));
        toast.success(succeeded.length === 1 ? copy.toast.deletedOne : interpolate(copy.toast.deletedMany, {
          count: succeeded.length
        }));
      }
      if (failed.length > 0) {
        const first = failed[0]?.reason;
        if (!force && first?.blockers?.length) {
          const client = targets[results.findIndex(r => r.status === "rejected")];
          setBlockersClient({
            ...client,
            deletion_blockers: first.blockers
          });
        }
        toast.error(first?.message || copy.toast.deletePartialError);
        await load(true);
      }
      setDeleteTargets([]);
      setForceBulkTargets([]);
      setBlockersClient(null);
    } catch (err) {
      toast.error(err.message || copy.toast.deleteError);
    } finally {
      setDeleting(false);
      setForceDeleting(false);
    }
  };

  const handleForceDeleteFromBlockers = async client => {
    if (!client?.id) return;
    await confirmDelete([client], {
      force: true
    });
  };
  const selectedCount = selectedIds.size;
  const deleteModalOpen = deleteTargets.length > 0;
  const singleDeleteName = deleteTargets.length === 1 ? deleteTargets[0].name || interpolate(deleteCopy.enterpriseNumber, {
    id: deleteTargets[0].id
  }) : null;
  return <div className={s.wrap}>
      <div className={s.panel}>
        <div className={s.panelInner}>
          <div className={ui.toolRow}>
            <div className={ui.toolLeft}>
              <input type="search" className={ui.fieldSearch} placeholder={copy.searchPlaceholder} value={search} onChange={e => setSearch(e.target.value)} aria-label={copy.searchAria} />
              <span className={ui.count}>{formatEnterpriseCount(locale, filtered.length)}</span>
            </div>
          </div>

          {selectedCount > 0 && <div className={s.bulkBar}>
              <span className={s.bulkInfo}>{formatSelectedCount(locale, selectedCount)}</span>
              <div className={s.bulkActions}>
                <Btn variant="ghost" onClick={() => setSelectedIds(new Set())}>
                  {copy.deselectAll}
                </Btn>
                <Btn variant="danger" icon="mdi:trash-can-outline" onClick={() => openDelete([...selectedIds])}>
                  {copy.deleteSelection}
                </Btn>
              </div>
            </div>}

          <div className={s.tableSection}>
            <div className={s.tableWrap}>
              <table className={s.table}>
                <thead>
                  <tr>
                    <th className={s.checkboxCell}>
                      <input type="checkbox" className={s.checkbox} checked={allPageSelected} disabled={paginated.length === 0} onChange={toggleSelectPage} aria-label={copy.selectDeletableAria} />
                    </th>
                    <th onClick={() => toggleSort("name")} style={{
                    cursor: "pointer"
                  }}>
                      {copy.columns.enterprise}{sortIndicator("name")}
                    </th>
                    <th onClick={() => toggleSort("deletable")} style={{
                    cursor: "pointer"
                  }}>
                      {copy.columns.deletion}{sortIndicator("deletable")}
                    </th>
                    <th onClick={() => toggleSort("blockers")} style={{
                    cursor: "pointer"
                  }}>
                      {copy.columns.linked}{sortIndicator("blockers")}
                    </th>
                    <th style={{
                    width: 100
                  }} />
                  </tr>
                </thead>
                <tbody>
                  {loading ? <tr>
                      <td colSpan={5} className={s.empty}>
                        {copy.emptyLoading}
                      </td>
                    </tr> : paginated.length === 0 ? <tr>
                      <td colSpan={5} className={s.empty}>
                        {copy.empty}
                      </td>
                    </tr> : paginated.map(client => {
                  const deletable = isClientDeletable(client);
                  const linked = getLinkedElementsSummary(client);
                  const clientNumber = getClientNumber(client);
                  const displayName = getClientNameWithoutCode(client.name, clientNumber) || client.name || "-";
                  return <tr key={client.id}>
                          <td className={s.checkboxCell}>
                            <input type="checkbox" className={s.checkbox} checked={selectedIds.has(client.id)} onChange={() => toggleSelect(client.id)} aria-label={interpolate(copy.selectEnterprise, {
                        name: displayName
                      })} />
                          </td>
                          <td className={s.nameCell}>
                            <div className={s.nameMain}>{displayName}</div>
                            {clientNumber && <div className={s.nameSub}>
                                {interpolate(copy.clientNumber, {
                          number: clientNumber
                        })}
                              </div>}
                          </td>
                          <td>
                            {deletable ? <span className={s.statusOk}>
                                <Icon icon="mdi:check-circle-outline" />
                                {copy.status.allowed}
                              </span> : <span className={s.statusBlocked}>
                                <Icon icon="mdi:alert-circle-outline" />
                                {copy.status.blocked}
                              </span>}
                          </td>
                          <td>
                            {!linked.hasAny ? <span className={s.muted}>{copy.linked.none}</span> : <div className={s.linkedSummary}>
                                <span className={s.linkedTotal}>{linked.total}</span>
                                <span className={s.linkedLabel}>
                                  {linked.total > 1 ? copy.linked.elements : copy.linked.element}
                                </span>
                                <button type="button" className={s.linkedInfoBtn} title={copy.linked.detailTitle} aria-label={interpolate(copy.linked.detailAria, {
                          name: displayName
                        })} onClick={() => setBlockersClient(client)}>
                                  <Icon icon="mdi:information-outline" />
                                </button>
                              </div>}
                          </td>
                          <td>
                            <div className={s.actions}>
                              <button type="button" className={`${s.actionBtn} ${s.actionBtnDanger}`} title={deletable ? copy.deleteEnterpriseTitle : copy.forceDeleteEnterpriseTitle} onClick={() => openDelete([client.id])}>
                                  <Icon icon={deletable ? "mdi:trash-can-outline" : "mdi:delete-forever-outline"} />
                                </button>
                            </div>
                          </td>
                        </tr>;
                })}
                </tbody>
              </table>
            </div>
          </div>

          {filtered.length > 0 && <div className={s.pagination}>
              <div className={s.paginationLeft}>
                <span className={s.paginationLabel}>{copy.pagination.rowsPerPage}</span>
                <select className={s.paginationSelect} value={pageSize} onChange={e => setPageSize(Number(e.target.value))}>
                  {PAGE_SIZES.map(size => <option key={size} value={size}>
                      {size}
                    </option>)}
                </select>
                <span className={s.paginationRange}>
                  {interpolate(copy.pagination.range, {
                start: pageStart,
                end: pageEnd,
                total: filtered.length
              })}
                </span>
              </div>
              <div className={s.paginationRight}>
                <button type="button" className={s.paginationBtn} onClick={() => setPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} aria-label={copy.pagination.prevAria}>
                  <FaChevronLeft />
                </button>
                <span className={s.paginationInfo}>
                  {interpolate(copy.pagination.page, {
                current: currentPage,
                total: totalPages
              })}
                </span>
                <button type="button" className={s.paginationBtn} onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} aria-label={copy.pagination.nextAria}>
                  <FaChevronRight />
                </button>
              </div>
            </div>}

          <p className={s.hint}>{copy.hint}</p>
        </div>
      </div>

      <EnterpriseDeleteModal open={deleteModalOpen && deleteTargets.length === 1} clientName={singleDeleteName || copy.deleteFallbackName} saving={deleting} onClose={() => !deleting && setDeleteTargets([])} onConfirm={() => confirmDelete(deleteTargets)} />

      <ConfirmModal open={deleteModalOpen && deleteTargets.length > 1} onClose={() => !deleting && setDeleteTargets([])} onConfirm={() => confirmDelete(deleteTargets)} title={interpolate(deleteCopy.bulkEnterprisesTitle, {
      count: deleteTargets.length
    })} icon="mdi:delete-alert-outline" confirmLabel={common.deletePermanently} confirmLoading={deleting} width="520px" message={<div>
            <p style={{
        margin: 0,
        lineHeight: 1.5
      }}>{deleteCopy.bulkEnterprisesIntro}</p>
            <ul className={s.bulkDeleteModalList}>
              {deleteTargets.slice(0, 8).map(client => <li key={client.id}>
                  {client.name || interpolate(deleteCopy.enterpriseNumber, {
            id: client.id
          })}
                </li>)}
              {deleteTargets.length > 8 && <li>
                  {deleteTargets.length - 8 === 1 ? interpolate(deleteCopy.bulkEnterprisesOthersSingular, {
            count: deleteTargets.length - 8
          }) : interpolate(deleteCopy.bulkEnterprisesOthersPlural, {
            count: deleteTargets.length - 8
          })}
                </li>}
            </ul>
          </div>} />

      <ConfirmModal
        open={forceBulkTargets.length > 0}
        onClose={() => !deleting && setForceBulkTargets([])}
        onConfirm={() => confirmDelete(forceBulkTargets, { force: true })}
        title={interpolate(copy.forceBulkTitle, { count: forceBulkTargets.length })}
        icon="mdi:delete-forever-outline"
        confirmLabel={copy.blockersModal.forceDelete}
        confirmLoading={deleting}
        width="560px"
        message={<div>
            <p style={{ margin: "0 0 0.75rem", lineHeight: 1.5 }}>{copy.forceBulkIntro}</p>
            <ul className={s.bulkDeleteModalList}>
              {forceBulkTargets.slice(0, 8).map(client => <li key={client.id}>
                  {client.name || interpolate(deleteCopy.enterpriseNumber, { id: client.id })}
                  {!isClientDeletable(client) ? ` · ${copy.status.blocked}` : ""}
                </li>)}
              {forceBulkTargets.length > 8 && <li>
                  {interpolate(deleteCopy.bulkEnterprisesOthersPlural, {
                    count: forceBulkTargets.length - 8
                  })}
                </li>}
            </ul>
          </div>}
      />

      <EnterpriseBlockersModal
        open={!!blockersClient}
        client={blockersClient}
        onClose={() => !forceDeleting && setBlockersClient(null)}
        onForceDelete={handleForceDeleteFromBlockers}
        forceDeleting={forceDeleting}
      />
    </div>;
}
