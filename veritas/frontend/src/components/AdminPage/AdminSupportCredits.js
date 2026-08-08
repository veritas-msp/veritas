import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import { toast } from "react-toastify";
import styles from "./AdminSupportCredits.module.css";
import adminUi from "./AdminUi.module.css";
import { Badge, Btn, Card, ConfirmModal, Pagination, Select, Table, Toolbar } from "./AdminUi";
import SupportCreditPackModal from "./SupportCreditPackModal";
import { deleteSupportCreditPack, fetchAllSupportCreditPacks, fetchClientsList } from "../../api/clients";
import { getClientNameWithoutCode } from "../../utils/clientDisplay";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { getAdminDeleteConfirmsCopy } from "./adminModalsI18n";
import { useAdminSupportCreditsCopy } from "../../hooks/useAdminCopy";
import { useCommonCopy } from "../../hooks/useCommonCopy";
import { formatPackMeta, getPackStatusLabel, getStatusFilterOptions, interpolate } from "./adminSupportCreditsI18n";
function formatDate(value, bcp47) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString(bcp47);
}
function formatDateTime(value, bcp47) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString(bcp47, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}
function getEnterpriseLabel(pack) {
  const number = pack?.client_number ? String(pack.client_number) : "";
  const name = getClientNameWithoutCode(pack?.client_name, number) || pack?.client_name || "-";
  return number ? `${number} · ${name}` : name;
}
function statusBadge(status, locale) {
  const label = getPackStatusLabel(locale, status);
  const variant = status === "active" ? "success" : status === "upcoming" ? "default" : status === "expired" || status === "depleted" ? "warn" : "muted";
  return <Badge variant={variant}>{label}</Badge>;
}
export default function AdminSupportCredits() {
  const locale = useAppLocale();
  const copy = useAdminSupportCreditsCopy();
  const statusFilterOptions = useMemo(() => getStatusFilterOptions(locale), [locale]);
  const deleteCopy = useMemo(() => getAdminDeleteConfirmsCopy(locale), [locale]);
  const common = useCommonCopy();
  const [packs, setPacks] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sortKey, setSortKey] = useState("client_name");
  const [sortDir, setSortDir] = useState("asc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("create");
  const [selectedPack, setSelectedPack] = useState(null);
  const [deletePack, setDeletePack] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const loadPacks = useCallback(async () => {
    setLoading(true);
    try {
      const [packRows, clientRows] = await Promise.all([fetchAllSupportCreditPacks(), fetchClientsList().catch(() => [])]);
      setPacks(Array.isArray(packRows) ? packRows : []);
      setClients(Array.isArray(clientRows) ? clientRows : []);
    } catch (error) {
      toast.error(error.message || copy.toast.loadError);
      setPacks([]);
    } finally {
      setLoading(false);
    }
  }, [copy.toast.loadError]);
  useEffect(() => {
    loadPacks();
  }, [loadPacks]);
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let rows = [...packs];
    if (statusFilter) {
      rows = rows.filter(pack => pack.status === statusFilter);
    }
    if (q) {
      rows = rows.filter(pack => {
        const haystack = [pack.client_name, pack.client_number, pack.label, pack.note, getPackStatusLabel(locale, pack.status)].filter(Boolean).join(" ").toLowerCase();
        return haystack.includes(q);
      });
    }
    rows.sort((a, b) => {
      let aVal = a[sortKey];
      let bVal = b[sortKey];
      if (sortKey === "remaining_amount" || sortKey === "initial_amount") {
        aVal = Number(aVal || 0);
        bVal = Number(bVal || 0);
        return sortDir === "asc" ? aVal - bVal : bVal - aVal;
      }
      if (sortKey === "valid_until" || sortKey === "valid_from" || sortKey === "created_at") {
        aVal = aVal ? new Date(aVal).getTime() : 0;
        bVal = bVal ? new Date(bVal).getTime() : 0;
        return sortDir === "asc" ? aVal - bVal : bVal - aVal;
      }
      aVal = String(aVal ?? "");
      bVal = String(bVal ?? "");
      const cmp = aVal.localeCompare(bVal, copy.bcp47, {
        numeric: true
      });
      return sortDir === "asc" ? cmp : -cmp;
    });
    return rows;
  }, [packs, search, statusFilter, sortKey, sortDir, locale, copy.bcp47]);
  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, sortKey, sortDir, pageSize]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize);
  const totals = useMemo(() => {
    const enterprises = new Set(packs.map(pack => pack.client_id));
    const available = packs.filter(pack => pack.status === "active").reduce((sum, pack) => sum + Number(pack.remaining_amount || 0), 0);
    return {
      enterprises: enterprises.size,
      packs: packs.length,
      available
    };
  }, [packs]);
  const toggleSort = key => {
    if (sortKey === key) {
      setSortDir(prev => prev === "asc" ? "desc" : "asc");
      return;
    }
    setSortKey(key);
    setSortDir("asc");
  };
  const sortIndicator = key => {
    if (sortKey !== key) return null;
    return sortDir === "asc" ? " ▲" : " ▼";
  };
  const sortCol = (key, label, width) => ({
    key,
    label,
    width,
    sortable: true,
    onSort: () => toggleSort(key),
    sortIndicator: sortIndicator(key)
  });
  const openCreateModal = () => {
    setModalMode("create");
    setSelectedPack(null);
    setModalOpen(true);
  };
  const openEditModal = pack => {
    setModalMode("edit");
    setSelectedPack(pack);
    setModalOpen(true);
  };
  const handleDelete = async () => {
    if (!deletePack) return;
    setDeleting(true);
    try {
      await deleteSupportCreditPack(deletePack.client_id, deletePack.id);
      toast.success(copy.toast.deleted);
      setDeletePack(null);
      await loadPacks();
    } catch (error) {
      toast.error(error.message || copy.toast.deleteError);
    } finally {
      setDeleting(false);
    }
  };
  const columns = [{
    ...sortCol("client_name", copy.columns.enterprise),
    render: row => <div style={{
      fontWeight: 600
    }}>{getEnterpriseLabel(row)}</div>
  }, {
    ...sortCol("label", copy.columns.pack),
    render: row => <div>
          <div style={{
        fontWeight: 500
      }}>{row.label || "-"}</div>
          {row.note ? <div className={adminUi.tableSubtext}>{row.note}</div> : null}
        </div>
  }, {
    ...sortCol("remaining_amount", copy.columns.remaining, "88px"),
    render: row => <span style={{
      fontVariantNumeric: "tabular-nums",
      fontWeight: 600
    }}>{row.remaining_amount}</span>
  }, {
    ...sortCol("initial_amount", copy.columns.initial, "88px"),
    render: row => <span style={{
      fontVariantNumeric: "tabular-nums",
      fontWeight: 600
    }}>{row.initial_amount}</span>
  }, {
    ...sortCol("valid_from", copy.columns.validFrom, "110px"),
    render: row => formatDate(row.valid_from, copy.bcp47)
  }, {
    ...sortCol("valid_until", copy.columns.validUntil, "110px"),
    render: row => formatDate(row.valid_until, copy.bcp47)
  }, {
    ...sortCol("status", copy.columns.status, "100px"),
    render: row => statusBadge(row.status, locale)
  }, {
    ...sortCol("created_at", copy.columns.createdAt, "140px"),
    render: row => formatDateTime(row.created_at, copy.bcp47)
  }, {
    key: "actions",
    label: "",
    width: "88px",
    render: row => <div className={adminUi.tableActions}>
          <button type="button" className={adminUi.tableActionBtn} title={copy.editTitle} onClick={() => openEditModal(row)}>
            <Icon icon="mdi:pencil-outline" />
          </button>
          <button type="button" className={`${adminUi.tableActionBtn} ${adminUi.tableActionBtnDanger}`} title={copy.deleteTitle} onClick={() => setDeletePack(row)}>
            <Icon icon="mdi:trash-can-outline" />
          </button>
        </div>
  }];
  const rangeStart = filtered.length === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = Math.min(page * pageSize, filtered.length);
  return <div className={styles.wrap}>
      <div className={styles.summaryRow}>
        <div className={styles.summaryCard}>
          <span className={styles.summaryValue}>{totals.enterprises}</span>
          <span className={styles.summaryLabel}>{copy.summary.enterprises}</span>
        </div>
        <div className={styles.summaryCard}>
          <span className={styles.summaryValue}>{totals.packs}</span>
          <span className={styles.summaryLabel}>{copy.summary.packs}</span>
        </div>
        <div className={styles.summaryCard}>
          <span className={styles.summaryValue}>{totals.available}</span>
          <span className={styles.summaryLabel}>{copy.summary.availableCredits}</span>
        </div>
      </div>

      <Card title={copy.page.title} description={copy.page.description} fill action={<Btn icon="mdi:plus" onClick={openCreateModal}>
            {copy.page.newPack}
          </Btn>}>
        <Toolbar search={search} searchPlaceholder={copy.searchPlaceholder} onSearchChange={setSearch} meta={formatPackMeta(locale, filtered.length, totals.available)} action={<Select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{
        minWidth: 160
      }}>
              {statusFilterOptions.map(option => <option key={option.value || "all"} value={option.value}>
                  {option.label}
                </option>)}
            </Select>} />

        {loading ? <p className={adminUi.adminMutedText}>{copy.emptyLoading}</p> : <>
            <Table columns={columns} rows={pageRows} emptyMessage={copy.empty} />
            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} pageSize={pageSize} onPageSizeChange={setPageSize} rangeLabel={interpolate(copy.range, {
          start: rangeStart,
          end: rangeEnd,
          total: filtered.length
        })} />
          </>}
      </Card>

      <SupportCreditPackModal open={modalOpen} mode={modalMode} pack={selectedPack} clients={clients} onClose={() => setModalOpen(false)} onSaved={loadPacks} />

      <ConfirmModal open={Boolean(deletePack)} onClose={() => setDeletePack(null)} onConfirm={handleDelete} title={deleteCopy.supportCreditTitle} message={deletePack ? interpolate(deleteCopy.supportCreditMessage, {
      label: deletePack.label || deleteCopy.notebookFallback,
      enterprise: getEnterpriseLabel(deletePack),
      amount: deletePack.remaining_amount
    }) : ""} confirmLabel={common.delete} confirmVariant="dangerSolid" confirmLoading={deleting} />
    </div>;
}
