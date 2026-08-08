import { useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import { toast } from "react-toastify";
import { fetchAdminTicketViews, deleteTicketView } from "../../api/tickets";
import { describeViewCriteria, describeViewAssignments } from "../../utils/ticketViewConstants";
import TicketViewModal from "../TicketPage/TicketViewModal";
import { Btn, Card, ConfirmModal, Pagination } from "./AdminUi";
import ui from "./AdminUi.module.css";
import s from "./AdminUsers.module.css";
import { useTablePagination } from "./useTablePagination";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { getAdminDeleteConfirmsCopy } from "./adminModalsI18n";
import { useCommonCopy } from "../../hooks/useCommonCopy";
import { useAdminSupportSettingsCopy } from "../../hooks/useAdminCopy";
import { formatSupportSettingsCount, getSupportSettingsViewMeta, getTicketViewVisibilityLabel } from "./adminSupportSettingsI18n";
import { interpolate } from "../../i18n/translate";

export default function AdminTicketViews({
  profiles = [],
  users = [],
  teams = [],
  pageScope = "ticket"
}) {
  const locale = useAppLocale();
  const ss = useAdminSupportSettingsCopy();
  const tv = pageScope === "ticket_sales" ? ss.salesTicketViews || ss.ticketViews : ss.ticketViews;
  const supportViewMeta = useMemo(() => getSupportSettingsViewMeta(locale), [locale]);
  const viewMetaKey = pageScope === "ticket_sales" ? "sales-ticket-views" : "ticket-views";
  const deleteCopy = useMemo(() => getAdminDeleteConfirmsCopy(locale), [locale]);
  const common = useCommonCopy();
  const [views, setViews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingView, setEditingView] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const loadViews = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await fetchAdminTicketViews(pageScope);
      setViews(Array.isArray(rows) ? rows : []);
    } catch (error) {
      toast.error(error.message || tv.toast.loadError);
      setViews([]);
    } finally {
      setLoading(false);
    }
  }, [tv.toast.loadError, pageScope]);

  useEffect(() => {
    loadViews();
  }, [loadViews]);

  const filteredViews = useMemo(() => {
    const q = search.trim().toLowerCase();
    return views.filter(view => {
      if (filter === "public" && view.visibility !== "public") return false;
      if (filter === "assigned" && view.visibility !== "assigned") return false;
      if (!q) return true;
      return String(view.name || "").toLowerCase().includes(q) || String(view.description || "").toLowerCase().includes(q) || describeViewAssignments(view).toLowerCase().includes(q);
    });
  }, [views, filter, search]);

  const viewsPagination = useTablePagination(filteredViews, {
    resetDeps: [search, filter]
  });

  const openCreate = () => {
    setEditingView(null);
    setModalOpen(true);
  };
  const openEdit = view => {
    setEditingView(view);
    setModalOpen(true);
  };
  const handleSaved = async () => {
    await loadViews();
    toast.success(editingView?.id ? tv.toast.updated : tv.toast.created);
  };
  const handleDelete = async () => {
    if (!confirmDelete?.id) return;
    try {
      await deleteTicketView(confirmDelete.id);
      toast.success(tv.toast.deleted);
      setConfirmDelete(null);
      await loadViews();
    } catch (error) {
      toast.error(error.message || tv.toast.deleteError);
    }
  };

  const cardTitle = supportViewMeta[viewMetaKey]?.title || supportViewMeta["ticket-views"].title;
  const cardDescription = supportViewMeta[viewMetaKey]?.description || tv.cardDescription;

  return <>
      <Card title={cardTitle} description={cardDescription} fill action={<Btn icon="mdi:plus" onClick={openCreate}>
            {tv.newViewBtn}
          </Btn>}>
        <div className={ui.toolRow}>
          <div className={ui.toolLeft}>
            <input type="search" className={ui.fieldSearch} placeholder={tv.searchPlaceholder} value={search} onChange={e => setSearch(e.target.value)} />
            <select className={s.profileViewSelect} value={filter} onChange={e => setFilter(e.target.value)}>
              <option value="all">{tv.filters.all}</option>
              <option value="public">{tv.filters.public}</option>
              <option value="assigned">{tv.filters.assigned}</option>
            </select>
            <span className={ui.count}>
              {formatSupportSettingsCount(locale, "view", filteredViews.length)}
            </span>
          </div>
        </div>

        <div className={s.tableSection}>
          <div className={s.tableWrap}>
            <table className={s.table}>
              <thead>
                <tr>
                  <th>{ss.common.columns.view}</th>
                  <th>{ss.common.columns.visibility}</th>
                  <th>{ss.common.columns.filters}</th>
                  <th>{ss.common.columns.assignment}</th>
                  <th style={{
                  width: 88
                }} aria-label={ss.common.actions.actionsAria} />
                </tr>
              </thead>
              <tbody>
                {loading ? <tr>
                    <td colSpan={5} className={s.empty}>{ss.common.loading}</td>
                  </tr> : filteredViews.length === 0 ? <tr>
                    <td colSpan={5} className={s.empty}>
                      {views.length === 0 ? tv.emptyNone : tv.emptySearch}
                    </td>
                  </tr> : viewsPagination.paginatedItems.map(view => {
                const filtersText = describeViewCriteria(view.rules);
                const assignmentText = view.visibility === "assigned" ? describeViewAssignments(view) : ss.common.emptyDash;
                return <tr key={view.id}>
                        <td>
                          <div className={s.viewTableName}>
                            <Icon icon={view.icon || "mdi:view-list"} className={s.viewTableNameIcon} aria-hidden />
                            <div className={s.viewTableNameText}>
                              <div className={s.viewTableNameTitle}>
                                {view.name}
                                {view.isBuiltin && <span className={s.viewTableBuiltin}>{tv.builtin}</span>}
                              </div>
                              {view.description && <div className={s.viewTableNameDesc}>{view.description}</div>}
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className={s.viewVisibilityTag}>
                            {getTicketViewVisibilityLabel(locale, view.visibility)}
                          </span>
                        </td>
                        <td className={s.viewTableMuted} title={filtersText}>
                          {filtersText}
                        </td>
                        <td className={s.viewTableMuted} title={assignmentText}>
                          {assignmentText}
                        </td>
                        <td>
                          <div className={s.actions}>
                            <button type="button" className={s.actionBtn} title={ss.common.actions.edit} onClick={() => openEdit(view)}>
                              <Icon icon="mdi:pencil-outline" aria-hidden />
                            </button>
                            {!view.isBuiltin && <button type="button" className={`${s.actionBtn} ${s.actionBtnDanger}`} title={ss.common.actions.delete} onClick={() => setConfirmDelete(view)}>
                                <Icon icon="mdi:delete-outline" aria-hidden />
                              </button>}
                          </div>
                        </td>
                      </tr>;
              })}
              </tbody>
            </table>
          </div>
          {!loading && filteredViews.length > 0 && <Pagination page={viewsPagination.page} totalPages={viewsPagination.totalPages} onPageChange={viewsPagination.setPage} pageSize={viewsPagination.pageSize} onPageSizeChange={viewsPagination.setPageSize} rangeLabel={viewsPagination.rangeLabel} />}
        </div>
      </Card>

      <TicketViewModal open={modalOpen} onClose={() => {
      setModalOpen(false);
      setEditingView(null);
    }} onSaved={handleSaved} initialView={editingView} isAdmin pageScope={pageScope} allProfiles={profiles} allUsers={users} allTeams={teams} />

      <ConfirmModal open={!!confirmDelete} onClose={() => setConfirmDelete(null)} onConfirm={handleDelete} title={deleteCopy.ticketViewTitle} icon="mdi:delete-alert-outline" message={interpolate(deleteCopy.ticketViewMessage, {
      name: confirmDelete?.name || deleteCopy.untitled
    })} confirmLabel={common.delete} confirmVariant="dangerSolid" />
    </>;
}
